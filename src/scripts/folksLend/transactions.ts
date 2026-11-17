/**
 * Folks Finance USDC lending pool on Algorand mainnet: USDC <-> fUSDC conversion (deposit /
 * withdrawal). Builds the atomic group, checks it before it reaches a signer and reads the
 * pool's rate. No Vue, no store (ported from Biatec Wallet's `scripts/folksLend`).
 */
import algosdk from 'algosdk'
import {
  MainnetOpUp,
  MainnetPoolManagerAppId,
  MainnetPools,
  prefixWithOpUp,
  prepareDepositIntoPool,
  prepareWithdrawFromPool,
  retrievePoolInfo
} from '@folks-finance/algorand-sdk'
import { ALGORAND_MAINNET } from '@/scripts/algo/networks'
import type { FolksLendDirection } from '@/scripts/folksLend/convert'

const FOLKS_USDC_POOL = MainnetPools.USDC

/** Underlying asset of the pool (USDC). */
export const FOLKS_USDC_ASSET_ID = BigInt(FOLKS_USDC_POOL.assetId)
/** Deposit token of the pool (fUSDC). */
export const FOLKS_FUSDC_ASSET_ID = BigInt(FOLKS_USDC_POOL.fAssetId)
/** The pool application. */
export const FOLKS_USDC_POOL_APP_ID = BigInt(FOLKS_USDC_POOL.appId)
/** Both assets have 6 decimals. */
export const FOLKS_USDC_DECIMALS = FOLKS_USDC_POOL.assetDecimals

/** Genesis hash of Algorand mainnet (base64), the only network the group may be built for. */
const MAINNET_GENESIS_HASH = 'wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8='

/** Folks lending is used on Algorand mainnet only. */
export const isFolksLendNetwork = (env: string | null | undefined): boolean =>
  env === ALGORAND_MAINNET

/** Asset spent / received for a direction. */
export const folksLendAssets = (
  direction: FolksLendDirection
): { from: bigint; to: bigint; fromSymbol: string; toSymbol: string } =>
  direction === 'deposit'
    ? {
        from: FOLKS_USDC_ASSET_ID,
        to: FOLKS_FUSDC_ASSET_ID,
        fromSymbol: 'USDC',
        toSymbol: 'fUSDC'
      }
    : {
        from: FOLKS_FUSDC_ASSET_ID,
        to: FOLKS_USDC_ASSET_ID,
        fromSymbol: 'fUSDC',
        toSymbol: 'USDC'
      }

export interface FolksPoolRate {
  /** Deposit interest index (14 decimals): USDC per fUSDC. */
  depositIndex: bigint
  /** Yearly deposit yield as a fraction (0.05 = 5 %). */
  apy: number
}

export const fetchFolksPoolRate = async (algod: algosdk.Algodv2): Promise<FolksPoolRate> => {
  const info = await retrievePoolInfo(algod, FOLKS_USDC_POOL)
  return {
    depositIndex: info.interest.depositInterestIndex,
    // The SDK returns the yield as a bigint with 16 decimals.
    apy: Number(info.interest.depositInterestYield) / 1e16
  }
}

/** Inner OpUp transactions added in front of the pool call (see buildFolksLendTxns). */
const OPUP_INNER_TXNS = 1
/** Minimum balance one more asset holding adds. */
const MIN_BALANCE_PER_ASSET = 100_000n
/** Fees of the group, fixed by the SDK: OpUp 0.002 + pool call 0.004 (deposit) / 0.005 (withdraw). */
const OPUP_FEE = 2_000n
const POOL_CALL_FEE: Record<FolksLendDirection, bigint> = { deposit: 4_000n, withdraw: 5_000n }
/** Fee reserved for the opt-in transaction (above the usual 0.001 minimum, for a busy network). */
const OPT_IN_FEE_RESERVE = 2_000n
/** Highest fee a single transaction of this flow may carry (the pool's withdraw call). */
const MAX_TXN_FEE = 5_000n

/**
 * ALGO (microalgo) the account must have above its current minimum balance for the group to
 * pass: the fees, plus the minimum balance of the new asset holding when an opt-in is part of it.
 */
export const requiredSpendableMicroAlgo = (
  direction: FolksLendDirection,
  needsOptIn: boolean
): bigint =>
  OPUP_FEE +
  POOL_CALL_FEE[direction] +
  (needsOptIn ? MIN_BALANCE_PER_ASSET + OPT_IN_FEE_RESERVE : 0n)

/** Zero-amount self transfer opting the account in to an asset. */
const buildOptInTxn = (
  sender: string,
  assetId: bigint,
  suggestedParams: algosdk.SuggestedParams
): algosdk.Transaction =>
  algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    sender,
    receiver: sender,
    assetIndex: assetId,
    amount: 0n,
    suggestedParams
  })

/**
 * The same transaction as an object of the app's own algosdk. The Folks SDK is a CommonJS
 * package and can load a second copy of algosdk; its `Transaction` / `Address` objects then
 * fail the `instanceof` checks of the app's copy as soon as something wraps or re-encodes them
 * ("Invalid address: (object) ...", seen when simulating and in wallet adapters). The bytes are
 * identical; only the classes change.
 */
const adoptTransaction = (tx: algosdk.Transaction): algosdk.Transaction =>
  algosdk.decodeUnsignedTransaction(tx.toByte())

export interface FolksLendRequest {
  direction: FolksLendDirection
  sender: string
  /** Base units of the asset spent (USDC for a deposit, fUSDC for a withdrawal). */
  amount: bigint
  /** True when the account is not opted in to the asset it receives. */
  optIn: boolean
}

/**
 * Unsigned, grouped transactions of a deposit (USDC -> fUSDC) or a withdrawal (fUSDC -> USDC):
 * `[opt-in?, OpUp, asset transfer, pool call]`.
 *
 * - The pool's program needs more opcode budget than one app call provides, so the pool
 *   calls are prefixed with one OpUp call (verified by simulation on mainnet in the wallet).
 * - A withdrawal passes received_amount = 0 ("variable"): the pool pays out what the fUSDC is
 *   worth at the on-chain index, so a client clock ahead of chain time can never ask for more
 *   than the pool pays.
 */
export const buildFolksLendTxns = (
  request: FolksLendRequest,
  suggestedParams: algosdk.SuggestedParams
): algosdk.Transaction[] => {
  const { direction, sender, amount, optIn } = request
  if (amount <= 0n) throw new Error('The amount to convert must be positive.')
  const poolTxns =
    direction === 'deposit'
      ? prepareDepositIntoPool(
          FOLKS_USDC_POOL,
          MainnetPoolManagerAppId,
          sender,
          sender,
          amount,
          suggestedParams
        )
      : prepareWithdrawFromPool(
          FOLKS_USDC_POOL,
          MainnetPoolManagerAppId,
          sender,
          sender,
          amount,
          0n,
          suggestedParams
        )
  const budgeted = prefixWithOpUp(MainnetOpUp, sender, poolTxns, OPUP_INNER_TXNS, suggestedParams)
  const txns = optIn
    ? [buildOptInTxn(sender, folksLendAssets(direction).to, suggestedParams), ...budgeted]
    : budgeted
  // The SDK strips the group ids so the caller can compose the group.
  return algosdk.assignGroupID(txns.map(adoptTransaction))
}

const sameBytes = (a: Uint8Array | undefined, b: Uint8Array | undefined): boolean =>
  a !== undefined && b !== undefined && a.length === b.length && a.every((v, i) => v === b[i])

const sameBytesList = (a: readonly Uint8Array[], b: readonly Uint8Array[]): boolean =>
  a.length === b.length && a.every((bytes, i) => sameBytes(bytes, b[i]))

const sameIds = (a: readonly bigint[], b: readonly bigint[]): boolean =>
  a.length === b.length && a.every((id, i) => id === b[i])

/** The group is not the one that was requested: nothing was signed. */
export class FolksLendRefusedError extends Error {
  constructor(reason: string) {
    super(`Refusing to sign: ${reason}.`)
    this.name = 'FolksLendRefusedError'
  }
}

const refuse = (reason: string): never => {
  throw new FolksLendRefusedError(reason)
}

/**
 * The exact arguments of the pool call, written down here instead of taken from the SDK (the
 * check exists for the case the SDK builds something else). ABI selectors of
 * `deposit(txn,account,asset,asset,application)uint64` and
 * `withdraw(axfer,uint64,account,asset,asset,application)uint64`; the reference arguments are
 * indexes: account 0 = the sender (the receiver of the payout), assets 0 / 1 = USDC / fUSDC,
 * application 1 = the pool manager. A withdrawal's `received_amount` is 0 (variable payout).
 */
const hex = (value: string): Uint8Array => algosdk.hexToBytes(value)
const POOL_CALL_ARGS: Record<FolksLendDirection, readonly Uint8Array[]> = {
  deposit: [hex('b9d542fb'), hex('00'), hex('00'), hex('01'), hex('01')],
  withdraw: [hex('eabe829d'), hex('0000000000000000'), hex('00'), hex('00'), hex('01'), hex('01')]
}

/**
 * Last line of defence before signing. The group must be exactly what the request describes
 * and nothing else: every transaction is sent by the account, built for Algorand mainnet,
 * part of one group, without rekey / close-to / clawback and with a bounded fee, and is one of
 *  - the single transfer of `amount` of the spent asset to the pool application,
 *  - the opt-in to the received asset (a zero transfer to self), only when requested,
 *  - the single NoOp call of the USDC pool application: the `deposit` / `withdraw` method of
 *    the direction with exactly the expected arguments, paying the sender (no other account
 *    referenced), referencing only the pool manager, USDC and fUSDC,
 *  - the single OpUp call (one argument, only its base application referenced).
 */
export const assertFolksLendTxnsSafe = (
  txns: readonly algosdk.Transaction[],
  request: FolksLendRequest
): void => {
  const { direction, sender, amount, optIn } = request
  const assets = folksLendAssets(direction)
  const poolAddress = algosdk.getApplicationAddress(FOLKS_USDC_POOL_APP_ID).toString()
  const mainnetHash = algosdk.base64ToBytes(MAINNET_GENESIS_HASH)
  const group = txns[0]?.group
  if (txns.length === 0 || group === undefined) refuse('the transactions are not grouped')

  let poolCalls = 0
  let opUpCalls = 0
  let poolTransfers = 0
  let optIns = 0
  for (const tx of txns) {
    if (tx.sender.toString() !== sender) refuse('unexpected sender')
    if (tx.genesisID !== ALGORAND_MAINNET || !sameBytes(tx.genesisHash, mainnetHash)) {
      refuse('the transaction is built for another network')
    }
    if (!sameBytes(tx.group, group)) refuse('the transactions are not one group')
    if (tx.rekeyTo !== undefined) refuse('unexpected rekey')
    if (tx.fee > MAX_TXN_FEE) refuse('unexpected fee')

    if (tx.type === algosdk.TransactionType.appl) {
      const call = tx.applicationCall
      if (!call || call.onComplete !== algosdk.OnApplicationComplete.NoOpOC) {
        return refuse('unexpected application call')
      }
      if (call.appIndex === FOLKS_USDC_POOL_APP_ID) {
        poolCalls++
        if (
          !sameBytesList(call.appArgs, POOL_CALL_ARGS[direction]) ||
          call.accounts.length !== 0 ||
          !sameIds(call.foreignApps, [BigInt(MainnetPoolManagerAppId)]) ||
          !sameIds(call.foreignAssets, [FOLKS_USDC_ASSET_ID, FOLKS_FUSDC_ASSET_ID]) ||
          call.boxes.length !== 0
        ) {
          refuse('unexpected pool call')
        }
      } else if (call.appIndex === BigInt(MainnetOpUp.callerAppId)) {
        opUpCalls++
        if (
          !sameBytesList(call.appArgs, [algosdk.encodeUint64(OPUP_INNER_TXNS)]) ||
          call.accounts.length !== 0 ||
          call.foreignAssets.length !== 0 ||
          call.boxes.length !== 0 ||
          !sameIds(call.foreignApps, [BigInt(MainnetOpUp.baseAppId)])
        ) {
          refuse('unexpected OpUp call')
        }
      } else {
        refuse('unexpected application call')
      }
    } else if (tx.type === algosdk.TransactionType.axfer) {
      const transfer = tx.assetTransfer
      if (!transfer) return refuse('unexpected asset transfer')
      if (transfer.closeRemainderTo !== undefined || transfer.assetSender !== undefined) {
        refuse('unexpected asset close or clawback')
      }
      const receiver = transfer.receiver.toString()
      if (
        receiver === poolAddress &&
        transfer.assetIndex === assets.from &&
        transfer.amount === amount
      ) {
        poolTransfers++
      } else if (
        receiver === sender &&
        transfer.assetIndex === assets.to &&
        transfer.amount === 0n
      ) {
        optIns++
      } else {
        refuse('unexpected asset transfer')
      }
    } else {
      refuse('unexpected transaction type')
    }
  }
  if (poolCalls !== 1 || opUpCalls !== 1 || poolTransfers !== 1 || optIns !== (optIn ? 1 : 0)) {
    refuse('unexpected number of transactions')
  }
}
