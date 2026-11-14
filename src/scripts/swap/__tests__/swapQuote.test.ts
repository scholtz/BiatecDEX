import { describe, expect, it } from 'vitest'
import type { SwapQuote } from '@folks-router/js-sdk'
import {
  biatecLegsToSwapQuote,
  folksQuoteToSwapQuote,
  increaseByBps,
  marketOrderAmount,
  orderSwapRequest,
  quotePrice,
  reduceByBps,
  toBps
} from '../swapQuote'

const folksRaw = (quoteAmount: bigint): SwapQuote => ({
  quoteAmount,
  priceImpact: 0,
  microalgoTxnsFee: 0,
  txnPayload: ''
})

describe('market order amount (decimals fix)', () => {
  it('scales the quantity with the currency decimals, not the asset decimals', () => {
    // Pair: asset with 0 decimals, currency with 6 (e.g. an NFT-like asset priced in USDC).
    // The quantity is 2.5 of the currency in both directions.
    expect(marketOrderAmount(2.5, 6)).toBe(2_500_000n)
    // The former code scaled with the asset's 0 decimals and traded 2 base units.
    expect(marketOrderAmount(2.5, 0)).toBe(2n)
  })

  it('scales decimal-exactly (no float floor loss)', () => {
    // 0.29 * 10 ** 6 is 289999.99999999994 in floating point.
    expect(marketOrderAmount(0.29, 6)).toBe(290_000n)
    expect(marketOrderAmount(1.1, 18)).toBe(1_100_000_000_000_000_000n)
    expect(marketOrderAmount(0, 6)).toBe(0n)
    expect(marketOrderAmount(Number.NaN, 6)).toBe(0n)
  })

  it('maps a buy to a fixed-input currency -> asset swap and a sell to fixed-output asset -> currency', () => {
    expect(orderSwapRequest('buy', 10n, 31566704, 0)).toEqual({
      fromAssetId: 0,
      toAssetId: 31566704,
      amount: 10n,
      swapMode: 'FIXED_INPUT'
    })
    expect(orderSwapRequest('sell', 10n, 31566704, -1)).toEqual({
      fromAssetId: 31566704,
      toAssetId: 0,
      amount: 10n,
      swapMode: 'FIXED_OUTPUT'
    })
  })
})

describe('quote mappers', () => {
  it('maps a Folks fixed-input quote: quoteAmount is the output', () => {
    const request = orderSwapRequest('buy', 1000n, 1, 2)
    expect(folksQuoteToSwapQuote(folksRaw(2000n), request)).toEqual({
      source: 'folks',
      swapMode: 'FIXED_INPUT',
      fromAssetId: 2,
      toAssetId: 1,
      inputAmount: 1000n,
      outputAmount: 2000n
    })
  })

  it('maps a Folks fixed-output quote: quoteAmount is the input', () => {
    const request = orderSwapRequest('sell', 1000n, 1, 2)
    const quote = folksQuoteToSwapQuote(folksRaw(1900n), request)
    expect(quote.inputAmount).toBe(1900n)
    expect(quote.outputAmount).toBe(1000n)
  })

  it('sums Biatec legs', () => {
    const quote = biatecLegsToSwapQuote(
      [
        { inputAmount: 800n, outputAmount: 66n },
        { inputAmount: 200n, outputAmount: 17n }
      ],
      orderSwapRequest('buy', 1000n, 1, 0)
    )
    expect(quote).toMatchObject({ source: 'biatec', inputAmount: 1000n, outputAmount: 83n })
  })
})

describe('depth price of a Folks quote is unchanged', () => {
  // The former MarketDepth formula: ((amount / quoteAmount) * 10 ** a) / 10 ** c
  const oldFormula = (amount: bigint, quoteAmount: bigint, a: number, c: number) =>
    ((Number(amount) / Number(quoteAmount)) * 10 ** a) / 10 ** c

  const cases: Array<[bigint, bigint, number, number]> = [
    [1_000_000n, 12_345_678n, 6, 6],
    [10_000_000n, 3n, 0, 6],
    [123_456_789n, 987_654_321n, 8, 2],
    [1n, 1n, 6, 6]
  ]

  it.each(cases)('offer (buy) %s / %s', (amount, quoteAmount, a, c) => {
    const quote = folksQuoteToSwapQuote(
      folksRaw(quoteAmount),
      orderSwapRequest('buy', amount, 1, 2)
    )
    expect(quotePrice(quote, 'buy', a, c)).toBe(oldFormula(amount, quoteAmount, a, c))
  })

  it.each(cases)('bid (sell) %s / %s', (amount, quoteAmount, a, c) => {
    const quote = folksQuoteToSwapQuote(
      folksRaw(quoteAmount),
      orderSwapRequest('sell', amount, 1, 2)
    )
    expect(quotePrice(quote, 'sell', a, c)).toBe(oldFormula(amount, quoteAmount, a, c))
  })

  it('has no price when the asset side is zero', () => {
    const quote = folksQuoteToSwapQuote(folksRaw(0n), orderSwapRequest('buy', 1000n, 1, 2))
    expect(quotePrice(quote, 'buy', 6, 6)).toBeNull()
  })
})

describe('bps helpers', () => {
  it('reduces and increases with floor', () => {
    expect(reduceByBps(10_000n, 50n)).toBe(9_950n)
    expect(reduceByBps(999n, 50n)).toBe(994n)
    expect(reduceByBps(1000n, 10000n)).toBe(0n)
    expect(increaseByBps(10_000n, 50n)).toBe(10_050n)
  })

  it('clamps bps to [0, 10000]', () => {
    expect(toBps(-5)).toBe(0n)
    expect(toBps(Number.NaN)).toBe(0n)
    expect(toBps(50.9)).toBe(50n)
    expect(toBps(20000)).toBe(10000n)
  })
})
