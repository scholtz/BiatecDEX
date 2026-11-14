// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import algosdk, { type Transaction } from 'algosdk'
import { Buffer } from 'buffer'
import type { SwapQuote } from '@folks-router/js-sdk'
import type { ISwapQuote } from '@/interface/ISwapQuote'
import { BiatecRouterError, type BiatecRouteTxs } from '@/service/routerApi'
import {
  checkLegTransactions,
  executeSwap,
  SwapError,
  type ExecuteSwapDeps,
  type MarketOrder,
  type SwapChain,
  type SwapNotice
} from '../executeSwap'
import type { SwapRequest } from '../swapQuote'

// No test signs or sends a real swap: transactions are built locally, "signing" returns the
// unsigned bytes, and the chain is an in-memory fake.

const account = algosdk.generateAccount()
const SENDER = account.addr.toString()
const FIRST_VALID = 1000n

const encodedTxns = (count: number, note: string, firstValid = FIRST_VALID): string[] =>
  Array.from({ length: count }, (_, i) =>
    Buffer.from(
      algosdk.encodeUnsignedTransaction(
        algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          sender: SENDER,
          receiver: SENDER,
          amount: 0,
          note: new TextEncoder().encode(`${note}-${i}`),
          suggestedParams: {
            fee: 1000,
            minFee: 1000,
            firstValid,
            lastValid: firstValid + 1000n,
            genesisID: 'testnet-v1.0',
            genesisHash: new Uint8Array(32)
          }
        })
      )
    ).toString('base64')
  )

const POOL = algosdk.generateAccount().addr.toString()
const params = (firstValid = FIRST_VALID) => ({
  fee: 1000,
  minFee: 1000,
  firstValid,
  lastValid: firstValid + 1000n,
  genesisID: 'testnet-v1.0',
  genesisHash: new Uint8Array(32)
})

/** A router-like leg: a deposit of `input` of `fromAsset` to the pool plus an app call. */
const legTxnObjects = (input: bigint, fromAsset: number, note: string): Transaction[] => [
  fromAsset === 0
    ? algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: SENDER,
        receiver: POOL,
        amount: input,
        note: new TextEncoder().encode(note),
        suggestedParams: params()
      })
    : algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: SENDER,
        receiver: POOL,
        assetIndex: fromAsset,
        amount: input,
        note: new TextEncoder().encode(note),
        suggestedParams: params()
      }),
  algosdk.makeApplicationNoOpTxnFromObject({
    sender: SENDER,
    appIndex: 123,
    note: new TextEncoder().encode(note),
    suggestedParams: params()
  })
]
const legTxns = (input: bigint, fromAsset: number, note: string): string[] =>
  legTxnObjects(input, fromAsset, note).map((txn) =>
    Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString('base64')
  )

/** Per submitted group, in order: how algod reacts and when (rounds after submit) it confirms. */
interface GroupPlan {
  send: 'accept' | 'reject' | 'unknown'
  /** Rounds after the submit round at which it confirms; null = never. */
  confirmAfter: number | null
}

class FakeChain implements SwapChain {
  round = FIRST_VALID
  sends: string[] = []
  private plans: GroupPlan[]
  private byTxId = new Map<string, { plan: GroupPlan; sentAt: bigint }>()
  pendingFailures = 0
  constructor(plans: GroupPlan[]) {
    this.plans = plans
  }
  async send(signed: Uint8Array[]) {
    const txId = algosdk.decodeUnsignedTransaction(signed[0]).txID()
    const plan = this.plans[this.sends.length] ?? { send: 'accept', confirmAfter: 0 }
    this.sends.push(txId)
    if (plan.send === 'reject') return { accepted: false as const, message: 'overspend' }
    this.byTxId.set(txId, { plan, sentAt: this.round })
    if (plan.send === 'unknown') throw new Error('socket hang up')
    return { accepted: true as const }
  }
  async pending(txId: string) {
    if (this.pendingFailures > 0) {
      this.pendingFailures--
      throw new Error('algod 503')
    }
    const entry = this.byTxId.get(txId)
    if (!entry) return null
    const { plan, sentAt } = entry
    const confirmed = plan.confirmAfter !== null && this.round >= sentAt + BigInt(plan.confirmAfter)
    return { confirmedRound: confirmed ? this.round : 0n, poolError: '' }
  }
  async lastRound() {
    return this.round
  }
  async waitForRoundAfter(round: bigint) {
    this.round = round + 1n
  }
}

const quote = (
  source: 'biatec' | 'folks',
  request: SwapRequest,
  inputAmount: bigint,
  outputAmount: bigint
): ISwapQuote => ({
  source,
  swapMode: request.swapMode,
  fromAssetId: request.fromAssetId,
  toAssetId: request.toAssetId,
  inputAmount,
  outputAmount
})

const raw = (quoteAmount: bigint): SwapQuote => ({
  quoteAmount,
  priceImpact: 0,
  microalgoTxnsFee: 0,
  txnPayload: ''
})

const baseOrder: MarketOrder = {
  side: 'buy',
  amount: 1000n,
  sender: SENDER,
  assetId: 1,
  currencyId: 0,
  assetDecimals: 6,
  currencyDecimals: 6,
  limitPrice: 1,
  slippageBps: 50,
  slippageProtection: true,
  lastRoundOffset: 100
}

interface Setup {
  /** Biatec quote output (fixed input) / input (fixed output), or an error. */
  biatec?: bigint | Error
  /** Folks quote output (fixed input) / input (fixed output), or an error. Same for the fallback unless `folksFallback` is set. */
  folks?: bigint | Error
  folksFallback?: bigint | Error
  /** Biatec legs (input, output) returned by routeTxs, or an error. */
  legs?: Array<[bigint, bigint]> | Error
  plans?: GroupPlan[]
  sign?: (txns: Transaction[]) => Promise<Uint8Array[]>
}

const setup = (s: Setup = {}) => {
  const chain = new FakeChain(s.plans ?? [])
  const notices: SwapNotice[] = []
  let folksCalls = 0
  const amountFor = (request: SwapRequest, value: bigint) =>
    request.swapMode === 'FIXED_INPUT'
      ? quote('folks', request, request.amount, value)
      : quote('folks', request, value, request.amount)
  const deps: ExecuteSwapDeps = {
    biatecQuote: vi.fn(async (request: SwapRequest) => {
      const b = s.biatec ?? 1000n
      if (b instanceof Error) throw b
      return request.swapMode === 'FIXED_INPUT'
        ? quote('biatec', request, request.amount, b)
        : quote('biatec', request, b, request.amount)
    }),
    biatecRouteTxs: vi.fn(async (params): Promise<BiatecRouteTxs> => {
      const legs = s.legs ?? [[params.amount, 1000n]]
      if (legs instanceof Error) throw legs
      const mapped = legs.map(([inputAmount, outputAmount], i) => ({
        inputAmount,
        outputAmount,
        txns: legTxns(inputAmount, params.fromAssetId, `biatec-leg-${i}`)
      }))
      return {
        quote: quote(
          'biatec',
          params,
          mapped.reduce((t, l) => t + l.inputAmount, 0n),
          mapped.reduce((t, l) => t + l.outputAmount, 0n)
        ),
        legs: mapped
      }
    }),
    folksQuote: vi.fn(async (request: SwapRequest) => {
      folksCalls++
      const f =
        folksCalls > 1 && s.folksFallback !== undefined ? s.folksFallback : (s.folks ?? 1000n)
      if (f instanceof Error) throw f
      return { quote: amountFor(request, f), raw: raw(f) }
    }),
    // Folks builds its transactions from the current round, like the real SDK.
    folksTxns: vi.fn(async () => encodedTxns(3, 'folks', chain.round)),
    sign: vi.fn(
      s.sign ??
        (async (txns: Transaction[]) => txns.map((t) => algosdk.encodeUnsignedTransaction(t)))
    ),
    chain,
    notify: (notice) => notices.push(notice)
  }
  return { deps, chain, notices }
}

const run = (order: Partial<MarketOrder>, deps: ExecuteSwapDeps) =>
  executeSwap({ ...baseOrder, ...order }, deps, { sleep: async () => {} })

describe('executeSwap - venue', () => {
  it('Biatec ok, Folks ok, within tolerance: Biatec executes', async () => {
    const { deps, chain } = setup({ biatec: 996n, folks: 1000n })
    const result = await run({}, deps)
    expect(result.fills).toEqual([{ venue: 'biatec', amount: 1000n, txIds: [chain.sends[0]] }])
    expect(deps.folksTxns).not.toHaveBeenCalled()
    expect(deps.biatecRouteTxs).toHaveBeenCalledWith(
      // 996 * (10000 - 50) / 10000 = 991.02, floored
      expect.objectContaining({ receiveMinimum: 991n, sendMaximum: undefined, sender: SENDER })
    )
  })

  it('Biatec worse than Folks beyond tolerance: Folks executes', async () => {
    const { deps } = setup({ biatec: 994n, folks: 1000n })
    const result = await run({}, deps)
    expect(result.fills.map((f) => f.venue)).toEqual(['folks'])
    expect(deps.biatecRouteTxs).not.toHaveBeenCalled()
    expect(deps.folksTxns).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 1000n }),
      raw(1000n),
      50
    )
  })

  it('Folks quote unavailable: Biatec executes', async () => {
    const { deps } = setup({ folks: new Error('Folks down') })
    const result = await run({}, deps)
    expect(result.fills.map((f) => f.venue)).toEqual(['biatec'])
  })

  it('times out a hanging Folks check quote and executes at Biatec', async () => {
    const { deps } = setup()
    deps.folksQuote = vi.fn(() => new Promise<never>(() => {}))
    const result = await executeSwap(baseOrder, deps, {
      folksQuoteTimeoutMs: 10,
      sleep: async () => {}
    })
    expect(result.fills.map((f) => f.venue)).toEqual(['biatec'])
  })

  it.each([
    new BiatecRouterError('not-configured', 'no router'),
    new BiatecRouterError('network', 'CORS'),
    new BiatecRouterError('no-route', '404', 404)
  ])('Biatec unavailable (%s): Folks executes', async (error) => {
    const { deps } = setup({ biatec: error })
    const result = await run({}, deps)
    expect(result.fills.map((f) => f.venue)).toEqual(['folks'])
    expect(deps.biatecRouteTxs).not.toHaveBeenCalled()
  })

  it('both unavailable: error, nothing signed', async () => {
    const { deps } = setup({ biatec: new Error('x'), folks: new Error('y') })
    await expect(run({}, deps)).rejects.toMatchObject({ code: 'fetchMarket' })
    expect(deps.sign).not.toHaveBeenCalled()
  })

  it('limit check fails: error, nothing signed', async () => {
    const { deps } = setup()
    // Quote price 1.0, limit 0.9 * 1.005 < 1.0
    await expect(run({ limitPrice: 0.9 }, deps)).rejects.toMatchObject({ code: 'priceTooHigh' })
    expect(deps.sign).not.toHaveBeenCalled()
    expect(deps.biatecRouteTxs).not.toHaveBeenCalled()
  })

  it('sell before router fixed output is live: Folks executes the fixed-output order', async () => {
    const { deps } = setup({
      biatec: new BiatecRouterError('unsupported', 'no echo'),
      folks: 1000n
    })
    const result = await run({ side: 'sell' }, deps)
    expect(result.fills.map((f) => f.venue)).toEqual(['folks'])
    expect(deps.folksQuote).toHaveBeenCalledWith({
      fromAssetId: 1,
      toAssetId: 0,
      amount: 1000n,
      swapMode: 'FIXED_OUTPUT'
    })
  })

  it('fixed output at Biatec sends receiveMinimum and sendMaximum from the quote', async () => {
    const { deps } = setup({ biatec: 1000n, legs: [[1000n, 1000n]] })
    await run({ side: 'sell' }, deps)
    expect(deps.biatecRouteTxs).toHaveBeenCalledWith(
      expect.objectContaining({
        swapMode: 'FIXED_OUTPUT',
        receiveMinimum: 995n,
        sendMaximum: 1005n
      })
    )
  })

  it('without slippage protection the minimum to receive is 0', async () => {
    const { deps } = setup()
    await run({ slippageProtection: false, limitPrice: 0.0001 }, deps)
    expect(deps.biatecRouteTxs).toHaveBeenCalledWith(
      expect.objectContaining({ receiveMinimum: 0n })
    )
  })
})

describe('executeSwap - fallback safety', () => {
  it('user cancels signing: error, no fallback', async () => {
    const { deps, chain } = setup({
      sign: async () => {
        throw new Error('User rejected the request')
      }
    })
    await expect(run({}, deps)).rejects.toThrow('User rejected the request')
    expect(deps.folksTxns).not.toHaveBeenCalled()
    expect(chain.sends).toHaveLength(0)
  })

  it('cancelling the second leg signature sends nothing and does not fall back', async () => {
    let calls = 0
    const { deps, chain } = setup({
      legs: [
        [600n, 600n],
        [400n, 400n]
      ],
      sign: async (txns) => {
        if (++calls === 2) throw new Error('cancelled')
        return txns.map((t) => algosdk.encodeUnsignedTransaction(t))
      }
    })
    await expect(run({}, deps)).rejects.toThrow('cancelled')
    expect(chain.sends).toHaveLength(0)
    expect(deps.folksTxns).not.toHaveBeenCalled()
  })

  it('routeTxs fails: Folks fallback for the whole order', async () => {
    const { deps, notices } = setup({ legs: new BiatecRouterError('http', '500', 500) })
    const result = await run({}, deps)
    expect(result.fills).toEqual([expect.objectContaining({ venue: 'folks', amount: 1000n })])
    expect(notices).toContainEqual({ kind: 'fallback', amount: 1000n, afterSigning: false })
    // The info notice comes before the (only) signature.
    expect(deps.sign).toHaveBeenCalledTimes(1)
  })

  it('a routeTxs answer that no longer passes the limit check falls back before signing', async () => {
    const { deps } = setup({ legs: [[1000n, 900n]] })
    const result = await run({}, deps)
    expect(result.fills.map((f) => f.venue)).toEqual(['folks'])
    expect(deps.sign).toHaveBeenCalledTimes(1)
  })

  it('algod rejects the group: Folks fallback', async () => {
    const { deps, chain, notices } = setup({
      plans: [
        { send: 'reject', confirmAfter: null },
        { send: 'accept', confirmAfter: 1 }
      ]
    })
    const result = await run({}, deps)
    expect(result.fills).toEqual([{ venue: 'folks', amount: 1000n, txIds: [chain.sends[1]] }])
    expect(notices.findIndex((n) => n.kind === 'fallback')).toBeGreaterThanOrEqual(0)
    expect(deps.sign).toHaveBeenCalledTimes(2)
  })

  it('confirmation times out, then confirms: success, no fallback', async () => {
    const { deps, notices } = setup({ plans: [{ send: 'accept', confirmAfter: 40 }] })
    const result = await run({}, deps)
    expect(result.fills.map((f) => f.venue)).toEqual(['biatec'])
    expect(notices).toContainEqual(expect.objectContaining({ kind: 'stillWaiting', rounds: 10 }))
    expect(deps.folksTxns).not.toHaveBeenCalled()
  })

  it('confirmation times out, lastValid passes: Folks fallback', async () => {
    const { deps, chain } = setup({
      plans: [
        { send: 'accept', confirmAfter: null },
        { send: 'accept', confirmAfter: 1 }
      ]
    })
    const result = await run({}, deps)
    expect(result.fills.map((f) => f.venue)).toEqual(['folks'])
    // lastValid = firstValid + offset 100; dead only after lastValid + 10, seen twice.
    expect(chain.round).toBeGreaterThan(FIRST_VALID + 100n + 10n)
  })

  it('a submit without an answer that later confirms does not fall back', async () => {
    const { deps } = setup({ plans: [{ send: 'unknown', confirmAfter: 3 }] })
    const result = await run({}, deps)
    expect(result.fills.map((f) => f.venue)).toEqual(['biatec'])
    expect(deps.folksTxns).not.toHaveBeenCalled()
  })

  it('an unknowable outcome stops the order without fallback', async () => {
    const { deps, chain } = setup({ plans: [{ send: 'accept', confirmAfter: null }] })
    chain.pendingFailures = 100
    await expect(run({}, deps)).rejects.toMatchObject({ code: 'statusUnknown' })
    expect(deps.folksTxns).not.toHaveBeenCalled()
  })

  it('two legs, second rejected: Folks fallback for the second leg amount only', async () => {
    const { deps, chain } = setup({
      legs: [
        [600n, 600n],
        [400n, 400n]
      ],
      plans: [
        { send: 'accept', confirmAfter: 1 },
        { send: 'reject', confirmAfter: null },
        { send: 'accept', confirmAfter: 1 }
      ]
    })
    const result = await run({}, deps)
    expect(result.fills).toEqual([
      { venue: 'biatec', amount: 600n, txIds: [chain.sends[0]] },
      { venue: 'folks', amount: 400n, txIds: [chain.sends[2]] }
    ])
    expect(deps.folksQuote).toHaveBeenLastCalledWith(expect.objectContaining({ amount: 400n }))
    expect(deps.folksTxns).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 400n }),
      expect.anything(),
      50
    )
    expect(result.executed).toBe(1000n)
    expect(result.notExecuted).toBe(0n)
  })

  it('each leg is signed and submitted as its own group', async () => {
    const { deps } = setup({
      legs: [
        [600n, 600n],
        [400n, 400n]
      ]
    })
    await run({}, deps)
    const groups = vi.mocked(deps.sign).mock.calls.map(([txns]) => txns)
    expect(groups).toHaveLength(2)
    const ids = groups.map((txns) => Buffer.from(txns[0].group!).toString('hex'))
    expect(ids[0]).not.toBe(ids[1])
    for (const txns of groups) {
      expect(new Set(txns.map((t) => Buffer.from(t.group!).toString('hex'))).size).toBe(1)
      // the round offset was applied
      expect(txns[0].lastValid).toBe(FIRST_VALID + 100n)
    }
  })

  it('fixed output, second leg rejected: Folks covers the missing output', async () => {
    const { deps } = setup({
      biatec: 1000n,
      folksFallback: 350n,
      legs: [
        [600n, 650n],
        [400n, 400n]
      ],
      plans: [
        { send: 'accept', confirmAfter: 0 },
        { send: 'reject', confirmAfter: null },
        { send: 'accept', confirmAfter: 0 }
      ]
    })
    // The confirmed leg quoted 650 of the 1000 wanted; Folks covers the missing 350.
    const result = await run({ side: 'sell', limitPrice: 0.9 }, deps)
    expect(deps.folksQuote).toHaveBeenLastCalledWith(
      expect.objectContaining({ amount: 350n, swapMode: 'FIXED_OUTPUT' })
    )
    expect(result.fills.map((f) => [f.venue, f.amount])).toEqual([
      ['biatec', 650n],
      ['folks', 350n]
    ])
  })

  it('fallback quote fails the limit check: error naming the executed amount', async () => {
    const { deps, chain } = setup({
      folksFallback: 300n, // 400 currency for 300 asset: price 1.33 > 1.005
      legs: [
        [600n, 600n],
        [400n, 400n]
      ],
      plans: [
        { send: 'accept', confirmAfter: 0 },
        { send: 'reject', confirmAfter: null }
      ]
    })
    const error = await run({}, deps).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(SwapError)
    expect(error).toMatchObject({ code: 'fallbackLimit', executed: 600n, notExecuted: 400n })
    expect((error as SwapError).fills).toEqual([
      { venue: 'biatec', amount: 600n, txIds: [chain.sends[0]] }
    ])
    expect(deps.folksTxns).not.toHaveBeenCalled()
    expect(chain.sends).toHaveLength(2)
  })

  it('falls back at most once: a failing fallback group ends the order', async () => {
    const { deps, chain } = setup({
      plans: [
        { send: 'reject', confirmAfter: null },
        { send: 'reject', confirmAfter: null }
      ]
    })
    await expect(run({}, deps)).rejects.toMatchObject({ code: 'txFailed' })
    expect(chain.sends).toHaveLength(2)
    expect(deps.biatecRouteTxs).toHaveBeenCalledTimes(1)
    expect(deps.folksTxns).toHaveBeenCalledTimes(1)
  })

  it('refuses a router transaction that rekeys the account and falls back before signing', async () => {
    const { deps } = setup()
    const rekeying = Buffer.from(
      algosdk.encodeUnsignedTransaction(
        algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          sender: SENDER,
          receiver: SENDER,
          amount: 0,
          rekeyTo: algosdk.generateAccount().addr,
          suggestedParams: {
            fee: 1000,
            minFee: 1000,
            firstValid: FIRST_VALID,
            lastValid: FIRST_VALID + 1000n,
            genesisID: 'testnet-v1.0',
            genesisHash: new Uint8Array(32)
          }
        })
      )
    ).toString('base64')
    deps.biatecRouteTxs = vi.fn(async (params) => ({
      quote: quote('biatec', params, 1000n, 1000n),
      legs: [{ inputAmount: 1000n, outputAmount: 1000n, txns: [rekeying] }]
    }))
    const result = await run({}, deps)
    expect(result.fills.map((f) => f.venue)).toEqual(['folks'])
    expect(deps.sign).toHaveBeenCalledTimes(1)
  })
})

describe('checkLegTransactions', () => {
  const leg = { inputAmount: 500n, outputAmount: 10n }
  it('accepts a leg whose deposit matches its declared input', () => {
    expect(() => checkLegTransactions(legTxnObjects(500n, 0, 'a'), leg, 0, SENDER)).not.toThrow()
    expect(() => checkLegTransactions(legTxnObjects(500n, 7, 'a'), leg, 7, SENDER)).not.toThrow()
  })
  it('refuses a deposit different from the declared input', () => {
    expect(() => checkLegTransactions(legTxnObjects(501n, 0, 'a'), leg, 0, SENDER)).toThrow(
      'does not match'
    )
  })
  it('refuses spending another asset', () => {
    const txns = [...legTxnObjects(500n, 0, 'a'), ...legTxnObjects(1n, 9, 'b').slice(0, 1)]
    expect(() => checkLegTransactions(txns, leg, 0, SENDER)).toThrow('another asset')
  })
  it('refuses transactions from another account', () => {
    const other = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: POOL,
      receiver: SENDER,
      amount: 1,
      suggestedParams: params()
    })
    expect(() =>
      checkLegTransactions([...legTxnObjects(500n, 0, 'a'), other], leg, 0, SENDER)
    ).toThrow('another account')
  })
  it('refuses excessive fees', () => {
    const txns = legTxnObjects(500n, 0, 'a')
    txns[1].fee = 2_000_000n
    expect(() => checkLegTransactions(txns, leg, 0, SENDER)).toThrow('fees')
  })
})

describe('executeSwap - rejected submit that the node already knows', () => {
  it('waits for it instead of falling back', async () => {
    const { deps, chain } = setup({ plans: [{ send: 'accept', confirmAfter: 2 }] })
    const realSend = chain.send.bind(chain)
    chain.send = async (signed: Uint8Array[]) => {
      await realSend(signed) // the first delivery got through...
      return { accepted: false as const, message: 'transaction already in ledger' } // ...the retry is refused
    }
    const result = await run({}, deps)
    expect(result.fills.map((f) => f.venue)).toEqual(['biatec'])
    expect(deps.folksTxns).not.toHaveBeenCalled()
  })
})

describe('executeSwap - rejected submit whose lookup fails', () => {
  it('polls instead of falling back, and confirms', async () => {
    const { deps, chain } = setup({ plans: [{ send: 'accept', confirmAfter: 3 }] })
    const realSend = chain.send.bind(chain)
    chain.send = async (signed: Uint8Array[]) => {
      await realSend(signed)
      chain.pendingFailures = 1 // the confirming lookup right after the 429 fails
      return { accepted: false as const, message: '429 Too Many Requests' }
    }
    const result = await run({}, deps)
    expect(result.fills.map((f) => f.venue)).toEqual(['biatec'])
    expect(deps.folksTxns).not.toHaveBeenCalled()
  })

  it('reports an expired Folks order with a reason, not an English message', async () => {
    const { deps } = setup({
      biatec: new BiatecRouterError('not-configured', 'x'),
      plans: [{ send: 'accept', confirmAfter: null }]
    })
    await expect(run({}, deps)).rejects.toMatchObject({
      code: 'txFailed',
      params: { reason: 'expired' }
    })
  })
})

describe('executeSwap - round 3 rules', () => {
  it('a Biatec quote outside the limit executes at Folks when Folks is inside it', async () => {
    // Folks: 1000 -> 1000 (price 1.0); Biatec 1000 -> 996 (price 1.004, within 50 bp of Folks)
    const { deps } = setup({ biatec: 996n, folks: 1000n })
    const result = await run({ limitPrice: 0.999 }, deps) // cap 0.999 * 1.005 = 1.003995
    expect(result.fills.map((f) => f.venue)).toEqual(['folks'])
    expect(deps.biatecRouteTxs).not.toHaveBeenCalled()
  })

  it('refuses a leg with a key registration (or any non pay/axfer/NoOp transaction)', () => {
    const keyreg = algosdk.makeKeyRegistrationTxnWithSuggestedParamsFromObject({
      sender: SENDER,
      suggestedParams: params()
    })
    expect(() =>
      checkLegTransactions(
        [...legTxnObjects(500n, 0, 'a'), keyreg],
        { inputAmount: 500n, outputAmount: 1n },
        0,
        SENDER
      )
    ).toThrow('disallowed keyreg')
  })

  it('a rejected submit whose lookups keep failing polls without announcing "sent"', async () => {
    const { deps, chain, notices } = setup({ plans: [{ send: 'accept', confirmAfter: 2 }] })
    const realSend = chain.send.bind(chain)
    chain.send = async (signed: Uint8Array[]) => {
      await realSend(signed)
      chain.pendingFailures = 3
      return { accepted: false as const, message: '429' }
    }
    const result = await run({}, deps)
    expect(result.fills.map((f) => f.venue)).toEqual(['biatec'])
    expect(notices.some((n) => n.kind === 'txSent')).toBe(false)
  })
})

describe('executeSwap - round 4 rules', () => {
  it('Folks as the only venue is not cut off by the 5 s check timeout', async () => {
    const { deps } = setup({ biatec: new BiatecRouterError('unsupported', 'no echo') })
    const slowFolks = deps.folksQuote
    deps.folksQuote = vi.fn(async (request: SwapRequest) => {
      await new Promise((resolve) => setTimeout(resolve, 40))
      return slowFolks(request)
    })
    const result = await executeSwap({ ...baseOrder, side: 'sell' }, deps, {
      folksQuoteTimeoutMs: 10,
      fallbackQuoteTimeoutMs: 500,
      sleep: async () => {}
    })
    expect(result.fills.map((f) => f.venue)).toEqual(['folks'])
  })

  it('a wallet that signs only part of the group fails the order without sending', async () => {
    const { deps, chain } = setup({
      sign: async (txns) => txns.slice(1).map((t) => algosdk.encodeUnsignedTransaction(t))
    })
    await expect(run({}, deps)).rejects.toMatchObject({ code: 'signingIncomplete' })
    expect(chain.sends).toHaveLength(0)
    expect(deps.folksTxns).not.toHaveBeenCalled()
  })
})
