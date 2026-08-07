import { describe, it, expect } from 'vitest'
import { AssetsService } from '../AssetsService'

describe('AssetsService.getAsset case-insensitive lookup', () => {
  it('should return VoteCoin asset with lowercase code', () => {
    const asset = AssetsService.getAsset('vote')
    expect(asset).toBeDefined()
    expect(asset?.name).toBe('VoteCoin')
  })

  it('should return VoteCoin asset with uppercase code', () => {
    const asset = AssetsService.getAsset('VOTE')
    expect(asset).toBeDefined()
    expect(asset?.name).toBe('VoteCoin')
  })

  it('returns undefined for unknown asset', () => {
    const asset = AssetsService.getAsset('UNKNOWN_ASSET_CODE_DOES_NOT_EXIST')
    expect(asset).toBeUndefined()
  })
})

describe('AssetsService.selectPrimaryAsset', () => {
  it('keeps the fiat-like priorities (usd > eur > algo)', () => {
    expect(AssetsService.selectPrimaryAsset('usd', 'vote').invert).toBe(true)
    expect(AssetsService.selectPrimaryAsset('vote', 'usd').invert).toBe(false)
    expect(AssetsService.selectPrimaryAsset('eur', 'vote').invert).toBe(true)
    expect(AssetsService.selectPrimaryAsset('vote', 'eur').invert).toBe(false)
    expect(AssetsService.selectPrimaryAsset('algo', 'vote').invert).toBe(true)
    expect(AssetsService.selectPrimaryAsset('vote', 'algo').invert).toBe(false)
    // usd outranks algo as the quote currency
    expect(AssetsService.selectPrimaryAsset('algo', 'usd').invert).toBe(false)
    expect(AssetsService.selectPrimaryAsset('usd', 'algo').invert).toBe(true)
  })

  // Regression: tAlgo and testnet USDC are BOTH isCurrency, and the old
  // implementation answered invert:true for BOTH orderings. The router guard
  // redirects whenever invert is true, so navigating to
  // /liquidity/:network/USDC/tAlgo swapped the pair back and forth forever and
  // froze the browser (CODE_HANG on beta.dex.biatec.io).
  it('never inverts both orderings of the tAlgo/USDC pair', () => {
    const forward = AssetsService.selectPrimaryAsset('usdc', 'talgo')
    const backward = AssetsService.selectPrimaryAsset('talgo', 'usdc')
    expect(forward.invert && backward.invert).toBe(false)
  })

  it('never inverts both orderings for two unknown codes', () => {
    const forward = AssetsService.selectPrimaryAsset('unknown-a', 'unknown-b')
    const backward = AssetsService.selectPrimaryAsset('unknown-b', 'unknown-a')
    expect(forward.invert && backward.invert).toBe(false)
  })

  it('never inverts a pair of identical codes', () => {
    for (const code of ['usd', 'eur', 'gd', 'algo', 'usdc', 'talgo', 'vote', 'nope']) {
      expect(AssetsService.selectPrimaryAsset(code, code).invert).toBe(false)
    }
  })

  it('is antisymmetric for every pair in the catalog (no redirect loops possible)', () => {
    const codes = AssetsService.getAssets().map((a) => a.code.toLowerCase())
    const unique = Array.from(new Set(codes))
    for (const a of unique) {
      for (const b of unique) {
        if (a === b) continue
        const forward = AssetsService.selectPrimaryAsset(a, b)
        const backward = AssetsService.selectPrimaryAsset(b, a)
        expect(
          forward.invert && backward.invert,
          `both orderings of (${a}, ${b}) invert — router would redirect forever`
        ).toBe(false)
      }
    }
  })
})
