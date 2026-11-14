import { describe, expect, it } from 'vitest'
import type { ISwapQuote, SwapQuoteMode, SwapVenue } from '@/interface/ISwapQuote'
import { chooseVenue } from '../quoteCheck'

const q = (
  source: SwapVenue,
  swapMode: SwapQuoteMode,
  inputAmount: bigint,
  outputAmount: bigint
): ISwapQuote => ({ source, swapMode, fromAssetId: 0, toAssetId: 1, inputAmount, outputAmount })

describe('chooseVenue', () => {
  it('no Biatec quote: Folks when there is one, else none', () => {
    expect(
      chooseVenue({ biatec: null, folks: q('folks', 'FIXED_INPUT', 100n, 50n), toleranceBps: 50 })
    ).toBe('folks')
    expect(chooseVenue({ biatec: null, folks: null, toleranceBps: 50 })).toBe('none')
  })

  it('no Folks quote: Biatec', () => {
    expect(
      chooseVenue({ biatec: q('biatec', 'FIXED_INPUT', 100n, 50n), folks: null, toleranceBps: 50 })
    ).toBe('biatec')
  })

  it('zero amounts count as no quote', () => {
    expect(
      chooseVenue({
        biatec: q('biatec', 'FIXED_INPUT', 100n, 0n),
        folks: q('folks', 'FIXED_INPUT', 100n, 50n),
        toleranceBps: 50
      })
    ).toBe('folks')
    expect(
      chooseVenue({
        biatec: q('biatec', 'FIXED_OUTPUT', 0n, 50n),
        folks: null,
        toleranceBps: 50
      })
    ).toBe('none')
    expect(
      chooseVenue({
        biatec: q('biatec', 'FIXED_INPUT', 100n, 50n),
        folks: q('folks', 'FIXED_INPUT', 100n, 0n),
        toleranceBps: 50
      })
    ).toBe('biatec')
  })

  describe('fixed input compares outputs', () => {
    const folks = q('folks', 'FIXED_INPUT', 10_000n, 10_000n)
    it('better or equal Biatec output wins', () => {
      expect(
        chooseVenue({
          biatec: q('biatec', 'FIXED_INPUT', 10_000n, 10_001n),
          folks,
          toleranceBps: 0
        })
      ).toBe('biatec')
      expect(
        chooseVenue({
          biatec: q('biatec', 'FIXED_INPUT', 10_000n, 10_000n),
          folks,
          toleranceBps: 0
        })
      ).toBe('biatec')
    })
    it('accepts a shortfall exactly at the tolerance, rejects one unit beyond', () => {
      // 50 bp of 10000 = 50 units
      expect(
        chooseVenue({
          biatec: q('biatec', 'FIXED_INPUT', 10_000n, 9_950n),
          folks,
          toleranceBps: 50
        })
      ).toBe('biatec')
      expect(
        chooseVenue({
          biatec: q('biatec', 'FIXED_INPUT', 10_000n, 9_949n),
          folks,
          toleranceBps: 50
        })
      ).toBe('folks')
    })
  })

  describe('fixed output compares inputs', () => {
    const folks = q('folks', 'FIXED_OUTPUT', 10_000n, 10_000n)
    it('cheaper or equal Biatec input wins', () => {
      expect(
        chooseVenue({
          biatec: q('biatec', 'FIXED_OUTPUT', 9_000n, 10_000n),
          folks,
          toleranceBps: 0
        })
      ).toBe('biatec')
    })
    it('accepts an extra cost exactly at the tolerance, rejects one unit beyond', () => {
      expect(
        chooseVenue({
          biatec: q('biatec', 'FIXED_OUTPUT', 10_050n, 10_000n),
          folks,
          toleranceBps: 50
        })
      ).toBe('biatec')
      expect(
        chooseVenue({
          biatec: q('biatec', 'FIXED_OUTPUT', 10_051n, 10_000n),
          folks,
          toleranceBps: 50
        })
      ).toBe('folks')
    })
  })

  it('treats a negative or non-numeric tolerance as zero', () => {
    const folks = q('folks', 'FIXED_INPUT', 10_000n, 10_000n)
    const biatec = q('biatec', 'FIXED_INPUT', 10_000n, 9_999n)
    expect(chooseVenue({ biatec, folks, toleranceBps: -10 })).toBe('folks')
    expect(chooseVenue({ biatec, folks, toleranceBps: Number.NaN })).toBe('folks')
  })

  it('falls back to Folks when the swap modes differ', () => {
    expect(
      chooseVenue({
        biatec: q('biatec', 'FIXED_INPUT', 10n, 10n),
        folks: q('folks', 'FIXED_OUTPUT', 10n, 10n),
        toleranceBps: 50
      })
    ).toBe('folks')
  })
})
