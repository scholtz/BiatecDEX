import { describe, expect, it } from 'vitest'
import calculateMidAndRange from '../calculateMidAndRange'
import type { IState } from '@/stores/app'
import type { IQuoteWithAmount } from '@/interface/IQuoteWithAmount'

// Minimal state shape: calculateMidAndRange only reads state.offers/state.bids and
// state.pair.asset/currency.decimals. The quotes are Folks quotes mapped to the
// router-neutral shape: an offer (buy, fixed input) spends `offerAmount` currency for
// `offerQuoteAmount` asset; a bid (sell, fixed output) spends `bidQuoteAmount` asset for
// `bidAmount` currency.
const buildState = (
  offerQuoteAmount: bigint,
  bidQuoteAmount: bigint,
  offerAmount = 1000n,
  bidAmount = 1000n
): IState =>
  ({
    pair: {
      invert: false,
      asset: { decimals: 6 },
      currency: { decimals: 6 }
    },
    offers: {
      1000: {
        baseAmount: 1000,
        amount: offerAmount,
        quote: {
          source: 'folks',
          swapMode: 'FIXED_INPUT',
          fromAssetId: 2,
          toAssetId: 1,
          inputAmount: offerAmount,
          outputAmount: offerQuoteAmount
        }
      } as IQuoteWithAmount
    },
    bids: {
      1000: {
        baseAmount: 1000,
        amount: bidAmount,
        quote: {
          source: 'folks',
          swapMode: 'FIXED_OUTPUT',
          fromAssetId: 1,
          toAssetId: 2,
          inputAmount: bidQuoteAmount,
          outputAmount: bidAmount
        }
      } as IQuoteWithAmount
    }
  }) as unknown as IState

describe('calculateMidAndRange', () => {
  it('computes a finite mid price from healthy bid/offer quotes', () => {
    const result = calculateMidAndRange(buildState(2000n, 1900n))
    expect(result).not.toBeNull()
    expect(Number.isFinite(result!.midPrice)).toBe(true)
    expect(Number.isFinite(result!.midRange)).toBe(true)
  })

  // Regression: a degenerate router quote with quoteAmount 0 (e.g. an illiquid/thin
  // pair route from the Folks Router) divided the price computation by zero, producing
  // midPrice = Infinity. That Infinity then flowed into state.midPrice ->
  // state.minPrice/maxPrice -> initPriceDecimals's visibleFrom/visibleTo, which throws
  // "[BigNumber Error] Argument out of range: Infinity" deep in calculateDistribution's
  // tick walk (see production error report).
  it('does not return an Infinity/NaN mid price when the offer quote amount is zero', () => {
    const result = calculateMidAndRange(buildState(0n, 1900n))
    if (result !== null) {
      expect(Number.isFinite(result.midPrice)).toBe(true)
      expect(Number.isFinite(result.midRange)).toBe(true)
    }
  })

  it('does not return an Infinity/NaN mid price when the bid quote amount is zero', () => {
    const result = calculateMidAndRange(buildState(2000n, 0n))
    if (result !== null) {
      expect(Number.isFinite(result.midPrice)).toBe(true)
      expect(Number.isFinite(result.midRange)).toBe(true)
    }
  })

  it('does not return an Infinity/NaN mid price when both quote amounts are zero', () => {
    const result = calculateMidAndRange(buildState(0n, 0n))
    if (result !== null) {
      expect(Number.isFinite(result.midPrice)).toBe(true)
      expect(Number.isFinite(result.midRange)).toBe(true)
    }
  })

  it('keeps the former Folks-only formula result', () => {
    // Old: ((amount / quoteAmount) * 10 ** 6) / 10 ** 6 per side.
    const result = calculateMidAndRange(buildState(2000n, 1900n))
    const bestOffer = ((1000 / 2000) * 10 ** 6) / 10 ** 6
    const bestBid = ((1000 / 1900) * 10 ** 6) / 10 ** 6
    expect(result).toEqual({ midPrice: (bestBid + bestOffer) / 2, midRange: bestOffer - bestBid })
  })

  it('returns null when there are no offers or bids', () => {
    const state = {
      pair: { asset: { decimals: 6 }, currency: { decimals: 6 } },
      offers: {},
      bids: {}
    }
    expect(calculateMidAndRange(state as unknown as IState)).toBeNull()
  })
})
