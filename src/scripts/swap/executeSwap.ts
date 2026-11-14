import algosdk, { type Transaction } from 'algosdk'
import { Buffer } from 'buffer'
import type { SwapQuote } from '@folks-router/js-sdk'
import type { ISwapQuote, SwapVenue } from '@/interface/ISwapQuote'
import type { BiatecRouteTxs, BiatecRouteTxsParams } from '@/service/routerApi'
import type { FolksSwapQuote } from '@/scripts/folks/fetchFolksSwapQuote'
import { applyLastRoundOffsetToTransactions } from '@/scripts/algo/applyLastRoundOffset'
import errorMessage from '@/scripts/common/errorMessage'
import { chooseVenue } from './quoteCheck'
import { checkPriceLimit } from './priceLimit'
import { withTimeout } from '@/scripts/common/withTimeout'
import delay from '@/scripts/common/delay'
import {
  increaseByBps,
  orderSwapRequest,
  reduceByBps,
  toBps,
  type LegAmounts,
  type OrderSide,
  type SwapRequest
} from './swapQuote'

// ---------------------------------------------------------------------------
// Market order execution: Biatec Router by default, Folks Router as the pre-trade check and
// as the fallback when the Biatec execution fails. Everything the function touches (quotes,
// signer, algod, notifications) is injected so every path is unit-testable.
//
// Fallback safety (the user must never pay twice):
//  - fall back only for amounts that provably never executed: `routeTxs` failed (nothing
//    signed), algod rejected the group on submit, or the group's lastValid round passed
//    without it confirming;
//  - never after a signing rejection/cancel;
//  - never while a submitted group can still confirm - a confirmation timeout keeps polling
//    until it confirms or lastValid passes, and an unknowable outcome stops the order;
//  - with several legs only the failed part goes to Folks; confirmed legs are done;
//  - at most one fallback per order, with a fresh Folks quote that must pass the limit check.
// ---------------------------------------------------------------------------

/** algod as the executor needs it. */
export interface SwapChain {
  /**
   * Submit one signed group. `accepted: false` means algod answered with a rejection: the
   * group never entered the pool. Throws when the outcome is unknown (no answer, 5xx).
   */
  send(signed: Uint8Array[]): Promise<{ accepted: true } | { accepted: false; message: string }>
  /** Pending/confirmed state of a transaction, or null when the node does not know it (404). */
  pending(txId: string): Promise<{ confirmedRound: bigint; poolError: string } | null>
  /** Last committed round. */
  lastRound(): Promise<bigint>
  /** Resolves once a block after `round` is committed. */
  waitForRoundAfter(round: bigint): Promise<void>
}

export type SwapNotice =
  /** A group was accepted by the node (not confirmed yet). */
  | { kind: 'txSent'; venue: SwapVenue }
  /** No confirmation within `rounds`; still waiting until it confirms or `lastValid` passes. */
  | { kind: 'stillWaiting'; rounds: number; lastValid: bigint }
  /**
   * Biatec could not execute `amount` (order units); Folks executes it. `afterSigning`: the
   * user already signed Biatec legs, so this asks for a second signature.
   */
  | { kind: 'fallback'; amount: bigint; afterSigning: boolean }

export interface ExecuteSwapDeps {
  biatecQuote(request: SwapRequest): Promise<ISwapQuote>
  biatecRouteTxs(params: BiatecRouteTxsParams): Promise<BiatecRouteTxs>
  folksQuote(request: SwapRequest): Promise<FolksSwapQuote>
  folksTxns(request: SwapRequest, raw: SwapQuote, slippageBps: number): Promise<string[]>
  /** Sign one group; returns one signed transaction per transaction. */
  sign(txns: Transaction[]): Promise<Uint8Array[]>
  chain: SwapChain
  notify(notice: SwapNotice): void
}

export interface MarketOrder {
  side: OrderSide
  /** Order quantity in base units of the currency (spent by a buy, received by a sell). */
  amount: bigint
  sender: string
  assetId: number
  currencyId: number
  assetDecimals: number
  currencyDecimals: number
  /** `store.state.price` */
  limitPrice: number
  /** `store.state.slippage`, basis points */
  slippageBps: number
  /** `store.state.slippageProtection` */
  slippageProtection: boolean
  /** `store.state.lastRoundOffset` */
  lastRoundOffset: number
}

export interface ExecuteSwapOptions {
  /** Timeout of the Folks check quote (default 5 s). */
  folksQuoteTimeoutMs?: number
  /** Timeout of the fallback Folks quote (default 15 s). */
  fallbackQuoteTimeoutMs?: number
  /** Rounds after which a still-unconfirmed group triggers the `stillWaiting` notice. */
  confirmationRounds?: number
  /**
   * Rounds past lastValid before an unconfirmed group counts as dead. Load-balanced algod
   * answers `status` and the pending lookup from different backends; the margin (and a second
   * confirming observation) keeps a lagging backend from declaring a confirmed group dead.
   */
  expiryMarginRounds?: bigint
  /** Hard cap of the confirmation polling loop (anti-freeze rule 4). */
  maxWaitIterations?: number
  /** Consecutive algod errors after which the outcome counts as unknown. */
  maxConsecutiveErrors?: number
  /** Pause after an algod error (injected so tests do not wait). */
  sleep?: (ms: number) => Promise<void>
}

export interface SwapFill {
  venue: SwapVenue
  /** Executed part in order units (currency base units). */
  amount: bigint
  txIds: string[]
}

export interface ExecuteSwapResult {
  fills: SwapFill[]
  executed: bigint
  notExecuted: bigint
}

export type SwapErrorCode =
  | 'fetchMarket'
  | 'fetchTransactions'
  | 'priceTooHigh'
  | 'priceTooLow'
  | 'txFailed'
  | 'signingIncomplete'
  | 'statusUnknown'
  | 'fallbackLimit'
  | 'fallbackFailed'

/** A failed order. `executed` / `notExecuted` are order units (currency base units). */
export class SwapError extends Error {
  constructor(
    public readonly code: SwapErrorCode,
    public readonly params: Record<string, string | number> = {},
    public readonly fills: SwapFill[] = [],
    public readonly executed: bigint = 0n,
    public readonly notExecuted: bigint = 0n
  ) {
    super(params.message ? `${code}: ${params.message}` : code)
    this.name = 'SwapError'
  }
}

/** Upper bound of the network fees one router leg may charge (microAlgos). */
export const MAX_LEG_FEE_MICROALGOS = 1_000_000n

/**
 * A router leg must do what its declared amounts say: only payments, asset transfers and
 * NoOp app calls, every transaction is sent by the user, nothing rekeys, closes or claws
 * back, the only asset leaving the account is `fromAssetId`
 * and exactly `leg.inputAmount` of it, and the fees stay below MAX_LEG_FEE_MICROALGOS. The
 * limit check and the fill accounting rely on the declared amounts, so they are verified here
 * against the transactions the user is about to sign.
 */
export const checkLegTransactions = (
  txns: Transaction[],
  leg: LegAmounts,
  fromAssetId: number,
  sender: string
): void => {
  const outflow = new Map<bigint, bigint>()
  let fees = 0n
  for (const txn of txns) {
    if (txn.sender.toString() !== sender) throw new Error('Router leg spends from another account')
    const allowed =
      txn.type === algosdk.TransactionType.pay ||
      (txn.type === algosdk.TransactionType.axfer &&
        txn.assetTransfer?.assetSender === undefined) ||
      (txn.type === algosdk.TransactionType.appl &&
        txn.applicationCall?.onComplete === algosdk.OnApplicationComplete.NoOpOC)
    if (!allowed) throw new Error(`Router leg contains a disallowed ${txn.type} transaction`)
    if (
      txn.rekeyTo !== undefined ||
      txn.payment?.closeRemainderTo !== undefined ||
      txn.assetTransfer?.closeRemainderTo !== undefined
    ) {
      throw new Error('Biatec Router returned a transaction that rekeys or closes the account')
    }
    fees += txn.fee
    if (txn.payment && txn.payment.receiver.toString() !== sender) {
      outflow.set(0n, (outflow.get(0n) ?? 0n) + txn.payment.amount)
    }
    if (txn.assetTransfer && txn.assetTransfer.receiver.toString() !== sender) {
      const id = txn.assetTransfer.assetIndex
      outflow.set(id, (outflow.get(id) ?? 0n) + txn.assetTransfer.amount)
    }
  }
  const from = BigInt(fromAssetId)
  for (const [assetId, amount] of outflow) {
    if (assetId !== from && amount > 0n) throw new Error('Router leg spends another asset')
  }
  if ((outflow.get(from) ?? 0n) !== leg.inputAmount) {
    throw new Error('Router leg deposit does not match its declared input')
  }
  if (fees > MAX_LEG_FEE_MICROALGOS) throw new Error('Router leg fees are too high')
}

const sum = (values: bigint[]): bigint => values.reduce((total, value) => total + value, 0n)

type GroupOutcome =
  | { status: 'confirmed'; txId: string }
  | { status: 'rejected'; message: string }
  | { status: 'expired' }
  | { status: 'unknown' }

/**
 * Executes one market order. Resolves only after at least one confirmed transaction; throws
 * `SwapError` (or the signer's own error when the user cancels before anything was sent).
 */
export const executeSwap = async (
  order: MarketOrder,
  deps: ExecuteSwapDeps,
  options: ExecuteSwapOptions = {}
): Promise<ExecuteSwapResult> => {
  const folksQuoteTimeoutMs = options.folksQuoteTimeoutMs ?? 5_000
  const fallbackQuoteTimeoutMs = options.fallbackQuoteTimeoutMs ?? 15_000
  const confirmationRounds = options.confirmationRounds ?? 10
  const expiryMarginRounds = options.expiryMarginRounds ?? 10n
  const maxWaitIterations = options.maxWaitIterations ?? 2_000
  const maxConsecutiveErrors = options.maxConsecutiveErrors ?? 5
  const sleep = options.sleep ?? (async (ms: number) => void (await delay(ms)))

  const request = orderSwapRequest(order.side, order.amount, order.assetId, order.currencyId)
  // 10000 bps = 100 % tolerance: minimum to receive is 0 when protection is off (as before).
  const slippageBps = order.slippageProtection ? order.slippageBps : 10000
  const slippage = toBps(slippageBps)

  const limitOf = (quote: ISwapQuote) =>
    checkPriceLimit({
      quote,
      side: order.side,
      assetDecimals: order.assetDecimals,
      currencyDecimals: order.currencyDecimals,
      limitPrice: order.limitPrice,
      slippageBps: order.slippageBps,
      slippageProtection: order.slippageProtection
    })

  /**
   * Decode, extend validity, and give the group its own fresh group id. A Biatec leg is
   * verified against its declared amounts first (`checkLegTransactions`).
   */
  const prepareGroup = (encoded: string[], biatecLeg?: LegAmounts): Transaction[] => {
    const txns = encoded.map((txn) =>
      algosdk.decodeUnsignedTransaction(new Uint8Array(Buffer.from(txn, 'base64')))
    )
    if (biatecLeg) checkLegTransactions(txns, biatecLeg, request.fromAssetId, order.sender)
    applyLastRoundOffsetToTransactions(txns, order.lastRoundOffset)
    for (const txn of txns) txn.group = undefined
    return algosdk.assignGroupID(txns)
  }

  const signGroup = async (group: Transaction[]): Promise<Uint8Array[]> => {
    const signed = await deps.sign(group)
    if (signed.length !== group.length) throw new SwapError('signingIncomplete')
    return signed
  }

  /** Poll until the group confirms or is provably dead (lastValid passed). */
  const waitForGroup = async (txId: string, lastValid: bigint): Promise<GroupOutcome> => {
    let startRound: bigint | null = null
    let errors = 0
    let notified = false
    let expiredSeen = 0
    for (let i = 0; i < maxWaitIterations; i++) {
      try {
        // Round first, then the lookup: a lookup made after a round past lastValid that still
        // shows no confirmation is final.
        const round = await deps.chain.lastRound()
        if (startRound === null) startRound = round
        const info = await deps.chain.pending(txId)
        errors = 0
        if (info !== null && info.confirmedRound > 0n) return { status: 'confirmed', txId }
        if (round > lastValid + expiryMarginRounds) {
          // Dead only after two observations a round apart both show it unconfirmed.
          if (++expiredSeen >= 2) return { status: 'expired' }
        }
        if (!notified && round - startRound >= BigInt(confirmationRounds)) {
          notified = true
          deps.notify({ kind: 'stillWaiting', rounds: confirmationRounds, lastValid })
        }
        await deps.chain.waitForRoundAfter(round)
      } catch (error) {
        console.warn('Confirmation polling failed', error)
        errors++
        if (errors >= maxConsecutiveErrors) return { status: 'unknown' }
        await sleep(1_000)
      }
    }
    return { status: 'unknown' }
  }

  const submitGroup = async (
    group: Transaction[],
    signed: Uint8Array[],
    venue: SwapVenue
  ): Promise<GroupOutcome> => {
    const txId = group[0].txID()
    const lastValid = group.reduce(
      (min, txn) => (txn.lastValid < min ? txn.lastValid : min),
      group[0].lastValid
    )
    try {
      const sent = await deps.chain.send(signed)
      if (!sent.accepted) {
        // A rejection proves nothing when the node already knows the transaction (an earlier,
        // retried delivery of the same submit got through): then wait for it like any other.
        let known: { confirmedRound: bigint; poolError: string } | null | undefined
        for (let attempt = 0; attempt < 3 && known === undefined; attempt++) {
          try {
            known = await deps.chain.pending(txId)
          } catch {
            if (attempt < 2) await sleep(1_000)
          }
        }
        if (known === null || (known?.confirmedRound === 0n && known.poolError !== '')) {
          return { status: 'rejected', message: sent.message }
        }
        // Known to the node, or still undeterminable: poll (never assume a rejection), but do
        // not announce a group algod refused as "sent".
        if (known === undefined) return waitForGroup(txId, lastValid)
      }
      deps.notify({ kind: 'txSent', venue })
    } catch (error) {
      // No answer: the group may or may not be in the pool - only the chain can tell.
      console.warn('Submit outcome unknown, polling', error)
    }
    return waitForGroup(txId, lastValid)
  }

  const result = (fills: SwapFill[]): ExecuteSwapResult => {
    const executed = sum(fills.map((fill) => fill.amount))
    return {
      fills,
      executed,
      notExecuted: executed >= order.amount ? 0n : order.amount - executed
    }
  }

  /** Runs a Folks group to the end. Returns the confirmed tx id or throws via `fail`. */
  const runFolksGroup = async (
    folksRequest: SwapRequest,
    raw: SwapQuote,
    fail: (code: SwapErrorCode, params?: Record<string, string | number>) => SwapError,
    beforeSign?: () => void
  ): Promise<string> => {
    let txns: string[]
    try {
      txns = await deps.folksTxns(folksRequest, raw, slippageBps)
    } catch (error) {
      throw fail('fetchTransactions', { message: errorMessage(error) })
    }
    if (!txns || txns.length === 0) throw fail('fetchTransactions')
    const group = prepareGroup(txns)
    beforeSign?.()
    const signed = await signGroup(group)
    const outcome = await submitGroup(group, signed, 'folks')
    if (outcome.status === 'confirmed') return outcome.txId
    if (outcome.status === 'unknown') throw fail('statusUnknown')
    throw fail('txFailed', {
      ...(outcome.status === 'rejected' ? { message: outcome.message } : { reason: 'expired' })
    })
  }

  /** The single fallback: Folks executes `remaining` after a Biatec failure. */
  const fallbackToFolks = async (
    remaining: bigint,
    fills: SwapFill[],
    afterSigning: boolean
  ): Promise<ExecuteSwapResult> => {
    const executed = sum(fills.map((fill) => fill.amount))
    const partial = executed > 0n
    const fail = (code: SwapErrorCode, params: Record<string, string | number> = {}) => {
      // With part of the order executed, every failure names the executed amount.
      let named = code
      if (partial && code !== 'statusUnknown') {
        named =
          code === 'priceTooHigh' || code === 'priceTooLow' ? 'fallbackLimit' : 'fallbackFailed'
      }
      return new SwapError(named, params, fills, executed, remaining)
    }
    const folksRequest: SwapRequest = { ...request, amount: remaining }
    let folks: FolksSwapQuote
    try {
      folks = await withTimeout(deps.folksQuote(folksRequest), fallbackQuoteTimeoutMs)
    } catch (error) {
      throw fail('fetchMarket', { message: errorMessage(error) })
    }
    const limit = limitOf(folks.quote)
    if (!limit.ok) {
      throw fail(limit.code, {
        currentQuote: limit.currentQuote,
        limitPrice: limit.limitPrice,
        slippage: limit.slippage
      })
    }
    let txId: string
    try {
      txId = await runFolksGroup(folksRequest, folks.raw, fail, () =>
        deps.notify({ kind: 'fallback', amount: remaining, afterSigning })
      )
    } catch (error) {
      const unsigned = error instanceof SwapError && error.code === 'signingIncomplete'
      if ((error instanceof SwapError && !unsigned) || !partial) throw error
      // Signing the fallback was cancelled (or failed): the Biatec part stays executed.
      throw fail(
        'txFailed',
        unsigned ? { reason: 'signingIncomplete' } : { message: errorMessage(error) }
      )
    }
    return result([...fills, { venue: 'folks', amount: remaining, txIds: [txId] }])
  }

  // 1. Quotes in parallel; the Folks check is best effort and limited in time.
  //    Without a Biatec quote Folks is the only venue, not a check: it then gets the longer
  //    timeout instead of failing the order after 5 s.
  const folksPending = deps.folksQuote(request)
  folksPending.catch(() => {}) // settled below; never an unhandled rejection
  const [biatecSettled] = await Promise.allSettled([deps.biatecQuote(request)])
  const biatec = biatecSettled.status === 'fulfilled' ? biatecSettled.value : null
  const [folksSettled] = await Promise.allSettled([
    withTimeout(folksPending, biatec ? folksQuoteTimeoutMs : fallbackQuoteTimeoutMs)
  ])
  const folks = folksSettled.status === 'fulfilled' ? folksSettled.value : null
  if (biatecSettled.status === 'rejected') {
    console.info('Biatec Router quote unavailable', biatecSettled.reason)
  }

  // 2. Venue.
  const venue = chooseVenue({
    biatec,
    folks: folks?.quote ?? null,
    toleranceBps: order.slippageBps
  })
  if (venue === 'none') throw new SwapError('fetchMarket')

  // 3. Limit check on the chosen quote. A Biatec quote outside the limit while the Folks quote
  //    is inside it executes at Folks rather than refusing the order.
  const primary = venue === 'biatec' ? biatec : folks?.quote
  if (!primary) throw new SwapError('fetchMarket')
  let useFolks = venue === 'folks'
  let limit = limitOf(primary)
  if (!limit.ok && venue === 'biatec' && folks && limitOf(folks.quote).ok) {
    useFolks = true
    limit = limitOf(folks.quote)
  }
  if (!limit.ok) {
    throw new SwapError(limit.code, {
      currentQuote: limit.currentQuote,
      limitPrice: limit.limitPrice,
      slippage: limit.slippage
    })
  }

  // 4. Folks path: today's flow.
  if (useFolks && folks) {
    const fail = (code: SwapErrorCode, params: Record<string, string | number> = {}) =>
      new SwapError(code, params, [], 0n, order.amount)
    const txId = await runFolksGroup(request, folks.raw, fail)
    return result([{ venue: 'folks', amount: order.amount, txIds: [txId] }])
  }
  if (!biatec) throw new SwapError('fetchMarket')

  // 5. Biatec path. Build: any failure here happens before anything is signed.
  //    receiveMinimum is the quoted output minus the slippage tolerance in both modes (issue
  //    #100): the router swaps a fixed input, so a fixed-output order needs that room to
  //    execute; fixed output additionally caps the input with sendMaximum.
  let built: BiatecRouteTxs
  let groups: Transaction[][]
  try {
    built = await deps.biatecRouteTxs({
      ...request,
      sender: order.sender,
      receiveMinimum: reduceByBps(biatec.outputAmount, slippage),
      sendMaximum:
        request.swapMode === 'FIXED_OUTPUT'
          ? increaseByBps(biatec.inputAmount, slippage)
          : undefined
    })
    const builtLimit = limitOf(built.quote)
    if (!builtLimit.ok) throw new Error(`Biatec Router route moved: ${builtLimit.code}`)
    // Each leg keeps its own group: legs are never merged.
    groups = built.legs.map((leg) => prepareGroup(leg.txns, leg))
  } catch (error) {
    console.warn('Biatec Router could not build the swap, falling back to Folks Router', error)
    return fallbackToFolks(order.amount, [], false)
  }

  // Sign every leg before sending any: a cancel leaves nothing on chain and never falls back.
  const signedGroups: Uint8Array[][] = []
  for (const group of groups) signedGroups.push(await signGroup(group))

  const legs = built.legs
  const confirmed: typeof legs = []
  const txIds: string[] = []
  /** Executed part in order units: input spent (fixed input) or output quoted (fixed output). */
  const executedByBiatec = (): bigint => {
    if (request.swapMode === 'FIXED_INPUT') return sum(confirmed.map((leg) => leg.inputAmount))
    const out = sum(confirmed.map((leg) => leg.outputAmount))
    return out > order.amount ? order.amount : out
  }
  const biatecFills = (): SwapFill[] =>
    confirmed.length > 0 ? [{ venue: 'biatec', amount: executedByBiatec(), txIds: [...txIds] }] : []

  let failedIndex = -1
  for (let i = 0; i < groups.length; i++) {
    const outcome = await submitGroup(groups[i], signedGroups[i], 'biatec')
    if (outcome.status === 'confirmed') {
      confirmed.push(legs[i])
      txIds.push(outcome.txId)
      continue
    }
    if (outcome.status === 'unknown') {
      // Cannot prove the leg is dead: never fall back.
      const executed = executedByBiatec()
      throw new SwapError(
        'statusUnknown',
        {},
        biatecFills(),
        executed,
        order.amount > executed ? order.amount - executed : 0n
      )
    }
    console.warn('Biatec Router leg not executed', i, outcome)
    failedIndex = i
    break
  }
  if (failedIndex < 0) return result(biatecFills())

  // 6. Only the part that provably failed goes to Folks: the failed and unsent legs' input
  //    (fixed input), or the output still missing (fixed output).
  const remaining =
    request.swapMode === 'FIXED_INPUT'
      ? sum(legs.slice(failedIndex).map((leg) => leg.inputAmount))
      : order.amount - executedByBiatec()
  if (remaining <= 0n) return result(biatecFills())
  return fallbackToFolks(remaining, biatecFills(), true)
}
