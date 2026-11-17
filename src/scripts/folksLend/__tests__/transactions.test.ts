import { describe, expect, it } from 'vitest'
import algosdk from 'algosdk'
import { MainnetOpUp, MainnetPools } from '@folks-finance/algorand-sdk'
import {
  FOLKS_FUSDC_ASSET_ID,
  FOLKS_USDC_ASSET_ID,
  FOLKS_USDC_POOL_APP_ID,
  assertFolksLendTxnsSafe,
  buildFolksLendTxns,
  FolksLendRefusedError,
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

  it('checks the pool call itself: method, arguments, receiver and references', () => {
    // The selectors written down in the check are those of the pool ABI.
    const selector = (signature: string) => algosdk.ABIMethod.fromSignature(signature).getSelector()
    const deposit = buildFolksLendTxns(request(), params())[2].applicationCall
    const withdraw = buildFolksLendTxns(request({ direction: 'withdraw' }), params())[2]
      .applicationCall
    expect(deposit?.appArgs[0]).toEqual(
      selector('deposit(txn,account,asset,asset,application)uint64')
    )
    expect(withdraw?.appArgs[0]).toEqual(
      selector('withdraw(axfer,uint64,account,asset,asset,application)uint64')
    )

    for (const direction of ['deposit', 'withdraw'] as const) {
      const req = request({ direction })
      const original = buildFolksLendTxns(req, params())[2].applicationCall
      if (!original) throw new Error('no pool call')
      const args = original.appArgs.map((arg) => new Uint8Array(arg))
      const tamper = (
        overrides: Partial<Parameters<typeof algosdk.makeApplicationNoOpTxnFromObject>[0]>
      ): algosdk.Transaction[] => {
        const txns = buildFolksLendTxns(req, params())
        txns[2] = algosdk.makeApplicationNoOpTxnFromObject({
          sender,
          appIndex: FOLKS_USDC_POOL_APP_ID,
          appArgs: args,
          foreignApps: [...original.foreignApps],
          foreignAssets: [...original.foreignAssets],
          suggestedParams: params({ fee: 4000n }),
          ...overrides
        })
        return regroup(txns)
      }
      // The untampered rebuild is accepted, so every refusal below is due to its one change.
      expect(() => assertFolksLendTxnsSafe(tamper({}), req)).not.toThrow()

      const receiverIndex = direction === 'deposit' ? 1 : 2
      const toAttacker = args.map((arg, i) => (i === receiverIndex ? new Uint8Array([1]) : arg))
      const otherMethod = args.map((arg, i) => (i === 0 ? new Uint8Array([1, 2, 3, 4]) : arg))
      for (const txns of [
        // The payout goes to another account.
        tamper({ appArgs: toAttacker, accounts: [attacker] }),
        tamper({ accounts: [attacker] }),
        tamper({ appArgs: otherMethod }),
        tamper({ appArgs: [...args, new Uint8Array([0])] }),
        tamper({ appArgs: args.slice(0, -1) }),
        tamper({ foreignApps: [999n] }),
        tamper({ foreignApps: [...original.foreignApps, 999n] }),
        tamper({ foreignAssets: [original.foreignAssets[0], 12345n] }),
        tamper({ boxes: [{ appIndex: 0, name: new Uint8Array([1]) }] })
      ]) {
        expect(() => assertFolksLendTxnsSafe(txns, req)).toThrow(/pool call/)
      }
    }

    // A withdrawal must ask for the variable payout (received_amount = 0).
    const req = request({ direction: 'withdraw' })
    const fixedPayout = buildFolksLendTxns(req, params())
    const call = fixedPayout[2].applicationCall
    if (!call) throw new Error('no pool call')
    fixedPayout[2] = algosdk.makeApplicationNoOpTxnFromObject({
      sender,
      appIndex: FOLKS_USDC_POOL_APP_ID,
      appArgs: call.appArgs.map((arg, i) => (i === 1 ? algosdk.encodeUint64(999_999_999) : arg)),
      foreignApps: [...call.foreignApps],
      foreignAssets: [...call.foreignAssets],
      suggestedParams: params({ fee: 5000n })
    })
    expect(() => assertFolksLendTxnsSafe(regroup(fixedPayout), req)).toThrow(/pool call/)
  })

  it('refuses an OpUp call with extra references or another budget', () => {
    const req = request()
    for (const overrides of [
      { appArgs: [algosdk.encodeUint64(200)] },
      { accounts: [attacker] },
      { foreignAssets: [12345n] }
    ]) {
      const txns = buildFolksLendTxns(req, params())
      txns[0] = algosdk.makeApplicationNoOpTxnFromObject({
        sender,
        appIndex: BigInt(MainnetOpUp.callerAppId),
        appArgs: [algosdk.encodeUint64(1)],
        foreignApps: [BigInt(MainnetOpUp.baseAppId)],
        suggestedParams: params({ fee: 2000n }),
        ...overrides
      })
      expect(() => assertFolksLendTxnsSafe(regroup(txns), req)).toThrow(/OpUp/)
    }
  })

  it('refuses an application call that carries programs or an access list', () => {
    const req = request()
    const original = buildFolksLendTxns(req, params())[2].applicationCall
    if (!original) throw new Error('no pool call')
    const base = {
      sender,
      appIndex: FOLKS_USDC_POOL_APP_ID,
      onComplete: algosdk.OnApplicationComplete.NoOpOC,
      appArgs: original.appArgs.map((arg) => new Uint8Array(arg)),
      suggestedParams: params({ fee: 4000n })
    }
    const withAccess = buildFolksLendTxns(req, params())
    withAccess[2] = algosdk.makeApplicationCallTxnFromObject({
      ...base,
      access: [{ address: attacker }]
    })
    expect(() => assertFolksLendTxnsSafe(regroup(withAccess), req)).toThrow(/application call/)

    const withProgram = buildFolksLendTxns(req, params())
    withProgram[2] = algosdk.makeApplicationCallTxnFromObject({
      ...base,
      foreignApps: [...original.foreignApps],
      foreignAssets: [...original.foreignAssets],
      approvalProgram: new Uint8Array([1]),
      clearProgram: new Uint8Array([1])
    })
    expect(() => assertFolksLendTxnsSafe(regroup(withProgram), req)).toThrow(/application call/)
  })

  it('throws a typed refusal', () => {
    expect(() => assertFolksLendTxnsSafe([], request())).toThrow(FolksLendRefusedError)
  })

  it('refuses an excessive fee', () => {
    const req = request()
    const txns = buildFolksLendTxns(req, params())
    txns[1] = transfer({ suggestedParams: params({ fee: 1_000_000n }) })
    expect(() => assertFolksLendTxnsSafe(regroup(txns), req)).toThrow(/fee/)
  })
})
