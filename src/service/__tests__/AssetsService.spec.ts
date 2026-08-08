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

  // Regression: the testnet entries are stored under registry keys that differ
  // from their codes ('testnetALGO' → code 'tAlgo', 'testnetUSDC' → code 'USDC').
  // getAsset only compared registry keys, so lookups by the code used in URLs
  // returned undefined — AddLiquidity then threw "Asset A not found" and
  // selectPrimaryAsset mis-ranked the pair.
  it('resolves tAlgo by asset code on testnet', () => {
    const asset = AssetsService.getAsset('tAlgo', 'testnet-v1.0')
    expect(asset).toBeDefined()
    expect(asset?.name).toBe('Testnet Algorand')
    expect(asset?.assetId).toBe(0)
    expect(asset?.network).toBe('testnet-v1.0')
  })

  it('resolves USDC by asset code on testnet (case-insensitive)', () => {
    const asset = AssetsService.getAsset('usdc', 'testnet-v1.0')
    expect(asset).toBeDefined()
    expect(asset?.assetId).toBe(10458941)
    expect(asset?.network).toBe('testnet-v1.0')
  })

  it('prefers the requested network when codes collide across chains', () => {
    // 'voi' exists as a mainnet ASA and as the voimain native token.
    const native = AssetsService.getAsset('voi', 'voimain-v1.0')
    expect(native?.network).toBe('voimain-v1.0')
    const bridged = AssetsService.getAsset('voi', 'mainnet-v1.0')
    expect(bridged?.network).toBe('mainnet-v1.0')
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

  // Regression: on testnet the tAlgo/USDC pair must resolve to the TESTNET
  // catalog entries and order the same way regardless of argument order —
  // previously the unresolved codes tied and each call site (router guard,
  // useRouteParams, AddLiquidity) computed a different asset/currency split,
  // so both selectors showed tAlgo and prices were queried with the mainnet
  // USDC id against the testnet pool provider ("asset pair is not registered").
  // USDC is a USD stablecoin, so like 'usd' it must be the QUOTE currency of
  // the pair — /liquidity/testnet-v1.0/tAlgo/USDC must keep tAlgo as the asset
  // and never redirect to USDC/tAlgo.
  it('resolves tAlgo/USDC on testnet with USDC as the quote currency, both argument orders', () => {
    for (const [a, b] of [
      ['USDC', 'tAlgo'],
      ['tAlgo', 'USDC']
    ]) {
      const pair = AssetsService.selectPrimaryAsset(a, b, 'testnet-v1.0')
      expect(pair.currency?.code, `${a}/${b} currency`).toBe('USDC')
      expect(pair.currency?.assetId).toBe(10458941)
      expect(pair.currency?.network).toBe('testnet-v1.0')
      expect(pair.asset?.code, `${a}/${b} asset`).toBe('tAlgo')
      expect(pair.asset?.network).toBe('testnet-v1.0')
    }
  })

  it('ranks USD stablecoins above native chain tokens as the quote currency', () => {
    // The URL /tAlgo/USDC must be canonical (no redirect), USDC/tAlgo redirects.
    expect(AssetsService.selectPrimaryAsset('tAlgo', 'USDC', 'testnet-v1.0').invert).toBe(false)
    expect(AssetsService.selectPrimaryAsset('USDC', 'tAlgo', 'testnet-v1.0').invert).toBe(true)
    // 'usd' itself still outranks usdc; algo/usd ordering is unchanged.
    expect(AssetsService.selectPrimaryAsset('usd', 'usdc').invert).toBe(true)
    expect(AssetsService.selectPrimaryAsset('algo', 'usd').invert).toBe(false)
  })

  it('returns the same asset/currency split regardless of argument order on ties', () => {
    const forward = AssetsService.selectPrimaryAsset('localusd', 'localeur', 'dockernet-v1')
    const backward = AssetsService.selectPrimaryAsset('localeur', 'localusd', 'dockernet-v1')
    expect(forward.currency?.code).toBe(backward.currency?.code)
    expect(forward.asset?.code).toBe(backward.asset?.code)
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
