import { describe, expect, it } from 'vitest'
import algosdk from 'algosdk'
import { MainnetOpUp, MainnetPools } from '@folks-finance/algorand-sdk'
import {
  FOLKS_FUSDC_ASSET_ID,
  FOLKS_USDC_ASSET_ID,
  FOLKS_USDC_POOL_APP_ID,
  assertFolksLendTxnsSafe,
  buildFolksLendTxns,
  folksLendAssets,
  isFolksLendNetwork,
  requiredSpendableMicroAlgo,
  type FolksLendRequest
} from '@/scripts/folksLend/transactions'

const sender = algosdk.generateAccount().addr.toString()
const attacker = algosdk.generateAccount().addr.toString()
const poolAddress = algosdk.getApplicationAddress(FOLKS_USDC_POOL_APP_ID).toString()

const MAINNET_HASH = algosdk.base64ToBytes('wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=')
const TESTNET_HASH = algosdk.base64ToBytes('SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=')

const params = (overrides: Partial<algosdk.SuggestedParams> = {}): algosdk.SuggestedParams => ({
  fee: 1000n,
  flatFee: true,
  firstValid: 100n,
  lastValid: 1100n,
  genesisHash: MAINNET_HASH,
  genesisID: 'mainnet-v1.0',
  minFee: 1000n,
  ...overrides
})

const request = (overrides: Partial<FolksLendRequest> = {}): FolksLendRequest => ({
  direction: 'deposit',
  sender,
  amount: 5_000_000n,
  optIn: false,
  ...overrides
})

/** Rebuilds a group from (possibly tampered) transactions, as an attacker would. */
const regroup = (txns: algosdk.Transaction[]): algosdk.Transaction[] => {
  txns.forEach((tx) => {
    tx.group = undefined
  })
  return algosdk.assignGroupID(txns)
}

const transfer = (
  overrides: Partial<
    Parameters<typeof algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject>[0]
  >
): algosdk.Transaction =>
  algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    sender,
    receiver: poolAddress,
    assetIndex: FOLKS_USDC_ASSET_ID,
    amount: 5_000_000n,
    suggestedParams: params(),
    ...overrides
  })

describe('network and assets', () => {
  it('offers the conversion on Algorand mainnet only', () => {
    expect(isFolksLendNetwork('mainnet-v1.0')).toBe(true)
    for (const env of ['testnet-v1.0', 'voimain-v1.0', 'dockernet-v1', '', null, undefined]) {
      expect(isFolksLendNetwork(env)).toBe(false)
    }
  })

  it('uses the Folks USDC pool ids', () => {
    expect(FOLKS_USDC_ASSET_ID).toBe(31566704n)
    expect(FOLKS_FUSDC_ASSET_ID).toBe(971384592n)
    expect(FOLKS_USDC_POOL_APP_ID).toBe(BigInt(MainnetPools.USDC.appId))
    expect(folksLendAssets('deposit')).toMatchObject({ from: 31566704n, to: 971384592n })
    expect(folksLendAssets('withdraw')).toMatchObject({ from: 971384592n, to: 31566704n })
  })

  it('needs the fees, and the new holding when an opt-in is part of the group', () => {
    expect(requiredSpendableMicroAlgo('deposit', false)).toBe(6_000n)
    expect(requiredSpendableMicroAlgo('withdraw', false)).toBe(7_000n)
    expect(requiredSpendableMicroAlgo('deposit', true)).toBe(108_000n)
    expect(requiredSpendableMicroAlgo('withdraw', true)).toBe(109_000n)
  })
})

describe('buildFolksLendTxns', () => {
  it('builds [OpUp, USDC transfer, pool call] for a deposit', () => {
    const txns = buildFolksLendTxns(request(), params())
    expect(txns.map((tx) => tx.type)).toEqual(['appl', 'axfer', 'appl'])
    expect(txns[0].applicationCall?.appIndex).toBe(BigInt(MainnetOpUp.callerAppId))
    expect(txns[1].assetTransfer?.assetIndex).toBe(FOLKS_USDC_ASSET_ID)
    expect(txns[1].assetTransfer?.amount).toBe(5_000_000n)
    expect(txns[1].assetTransfer?.receiver.toString()).toBe(poolAddress)
    expect(txns[2].applicationCall?.appIndex).toBe(FOLKS_USDC_POOL_APP_ID)
    expect(txns.every((tx) => tx.group !== undefined)).toBe(true)
    expect(txns.reduce((sum, tx) => sum + tx.fee, 0n)).toBe(
      requiredSpendableMicroAlgo('deposit', false)
    )
  })

  it('builds [OpUp, fUSDC transfer, pool call] for a withdrawal', () => {
    const txns = buildFolksLendTxns(request({ direction: 'withdraw' }), params())
    expect(txns.map((tx) => tx.type)).toEqual(['appl', 'axfer', 'appl'])
    expect(txns[1].assetTransfer?.assetIndex).toBe(FOLKS_FUSDC_ASSET_ID)
    expect(txns.reduce((sum, tx) => sum + tx.fee, 0n)).toBe(
      requiredSpendableMicroAlgo('withdraw', false)
    )
  })

  it('puts the opt-in to the received asset first', () => {
    const deposit = buildFolksLendTxns(request({ optIn: true }), params())
    expect(deposit).toHaveLength(4)
    expect(deposit[0].assetTransfer?.assetIndex).toBe(FOLKS_FUSDC_ASSET_ID)
    expect(deposit[0].assetTransfer?.amount).toBe(0n)
    expect(deposit[0].assetTransfer?.receiver.toString()).toBe(sender)

    const withdraw = buildFolksLendTxns(request({ direction: 'withdraw', optIn: true }), params())
    expect(withdraw[0].assetTransfer?.assetIndex).toBe(FOLKS_USDC_ASSET_ID)
  })

  it('returns transactions of the algosdk copy the app uses (the SDK may load a second one)', () => {
    for (const direction of ['deposit', 'withdraw'] as const) {
      const txns = buildFolksLendTxns(request({ direction, optIn: true }), params())
      for (const tx of txns) {
        expect(tx).toBeInstanceOf(algosdk.Transaction)
        expect(tx.sender).toBeInstanceOf(algosdk.Address)
        // Wrapping a foreign transaction threw "Invalid address: (object) ...".
        expect(() => algosdk.encodeUnsignedSimulateTransaction(tx)).not.toThrow()
      }
    }
  })

  it('refuses a non-positive amount', () => {
    expect(() => buildFolksLendTxns(request({ amount: 0n }), params())).toThrow()
    expect(() => buildFolksLendTxns(request({ amount: -1n }), params())).toThrow()
  })
})

describe('assertFolksLendTxnsSafe', () => {
  it('accepts every group the builder produces', () => {
    for (const direction of ['deposit', 'withdraw'] as const) {
      for (const optIn of [false, true]) {
        const req = request({ direction, optIn })
        expect(() => assertFolksLendTxnsSafe(buildFolksLendTxns(req, params()), req)).not.toThrow()
      }
    }
  })

  it('refuses an empty or ungrouped list', () => {
    expect(() => assertFolksLendTxnsSafe([], request())).toThrow(/Refusing to sign/)
    const txns = buildFolksLendTxns(request(), params())
    txns.forEach((tx) => {
      tx.group = undefined
    })
    expect(() => assertFolksLendTxnsSafe(txns, request())).toThrow(/Refusing to sign/)
  })

  it('refuses a group that does not match the request', () => {
    const txns = buildFolksLendTxns(request(), params())
    expect(() => assertFolksLendTxnsSafe(txns, request({ amount: 4_999_999n }))).toThrow()
    expect(() => assertFolksLendTxnsSafe(txns, request({ direction: 'withdraw' }))).toThrow()
    expect(() => assertFolksLendTxnsSafe(txns, request({ optIn: true }))).toThrow()
    expect(() => assertFolksLendTxnsSafe(txns, request({ sender: attacker }))).toThrow()
    const withOptIn = buildFolksLendTxns(request({ optIn: true }), params())
    expect(() => assertFolksLendTxnsSafe(withOptIn, request())).toThrow()
  })

  it('refuses a group built for another network', () => {
    const req = request()
    const otherId = buildFolksLendTxns(req, params({ genesisID: 'testnet-v1.0' }))
    expect(() => assertFolksLendTxnsSafe(otherId, req)).toThrow(/another network/)
    const otherHash = buildFolksLendTxns(req, params({ genesisHash: TESTNET_HASH }))
    expect(() => assertFolksLendTxnsSafe(otherHash, req)).toThrow(/another network/)
  })

  it('refuses a transaction from another group', () => {
    const req = request()
    const txns = buildFolksLendTxns(req, params())
    const other = buildFolksLendTxns(req, params({ firstValid: 101n }))
    expect(() => assertFolksLendTxnsSafe([txns[0], txns[1], other[2]], req)).toThrow(/one group/)
  })

  it('refuses a rekey, a close-to and a clawback', () => {
    const req = request()
    const rekeyed = buildFolksLendTxns(req, params())
    rekeyed[1] = transfer({ rekeyTo: attacker })
    expect(() => assertFolksLendTxnsSafe(regroup(rekeyed), req)).toThrow(/rekey/)

    const closed = buildFolksLendTxns(req, params())
    closed[1] = transfer({ closeRemainderTo: attacker })
    expect(() => assertFolksLendTxnsSafe(regroup(closed), req)).toThrow(/close/)

    const clawback = buildFolksLendTxns(req, params())
    clawback[1] = transfer({ assetSender: attacker })
    expect(() => assertFolksLendTxnsSafe(regroup(clawback), req)).toThrow(/clawback/)
  })

  it('refuses a transfer to anyone but the pool, of another asset or amount', () => {
    const req = request()
    for (const tampered of [
      transfer({ receiver: attacker }),
      transfer({ assetIndex: 12345n }),
      transfer({ amount: 5_000_001n }),
      // An "opt-in" that moves funds to self or opts in to an unrelated asset.
      transfer({ receiver: sender, assetIndex: FOLKS_FUSDC_ASSET_ID, amount: 1n }),
      transfer({ receiver: sender, assetIndex: 12345n, amount: 0n })
    ]) {
      const txns = buildFolksLendTxns(req, params())
      txns[1] = tampered
      expect(() => assertFolksLendTxnsSafe(regroup(txns), req)).toThrow(/Refusing to sign/)
    }
  })

  it('refuses extra transactions and unexpected types', () => {
    const req = request()
    const payment = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender,
      receiver: attacker,
      amount: 1n,
      suggestedParams: params()
    })
    const withPayment = [...buildFolksLendTxns(req, params()), payment]
    expect(() => assertFolksLendTxnsSafe(regroup(withPayment), req)).toThrow(/transaction type/)

    const twoTransfers = [
      ...buildFolksLendTxns(req, params()),
      transfer({ note: new Uint8Array(1) })
    ]
    expect(() => assertFolksLendTxnsSafe(regroup(twoTransfers), req)).toThrow(/number/)

    const noOpUp = buildFolksLendTxns(req, params()).slice(1)
    expect(() => assertFolksLendTxnsSafe(regroup(noOpUp), req)).toThrow(/number/)
  })

  it('refuses a call of another application, a non-NoOp call and an odd OpUp', () => {
    const req = request()
    const call = (
      overrides: Partial<Parameters<typeof algosdk.makeApplicationCallTxnFromObject>[0]>
    ): algosdk.Transaction =>
      algosdk.makeApplicationCallTxnFromObject({
        sender,
        appIndex: FOLKS_USDC_POOL_APP_ID,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        suggestedParams: params(),
        ...overrides
      })

    const otherApp = buildFolksLendTxns(req, params())
    otherApp[2] = call({ appIndex: 999n })
    expect(() => assertFolksLendTxnsSafe(regroup(otherApp), req)).toThrow(/application call/)

    const optInCall = buildFolksLendTxns(req, params())
    optInCall[2] = call({ onComplete: algosdk.OnApplicationComplete.OptInOC })
    expect(() => assertFolksLendTxnsSafe(regroup(optInCall), req)).toThrow(/application call/)

    const oddOpUp = buildFolksLendTxns(req, params())
    oddOpUp[0] = call({
      appIndex: BigInt(MainnetOpUp.callerAppId),
      appArgs: [algosdk.encodeUint64(1)],
      foreignApps: [999n]
    })
    expect(() => assertFolksLendTxnsSafe(regroup(oddOpUp), req)).toThrow(/OpUp/)
  })

  it('refuses an excessive fee', () => {
    const req = request()
    const txns = buildFolksLendTxns(req, params())
    txns[1] = transfer({ suggestedParams: params({ fee: 1_000_000n }) })
    expect(() => assertFolksLendTxnsSafe(regroup(txns), req)).toThrow(/fee/)
  })
})
