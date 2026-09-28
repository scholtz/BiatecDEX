import { describe, it, expect, vi } from 'vitest'
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

describe('AssetsService.ensureCustomAssets (batched registration)', () => {
  // Asset ids picked well outside the curated catalog's range and namespaced
  // per test to avoid colliding with the module-level customAssets registry,
  // which persists for the lifetime of the test file (it's a plain module
  // singleton, not reset between tests).
  const network = 'unit-test-net'

  it('registers every new asset and returns one entry per input, in order', () => {
    const inputs = [
      { assetId: 900001, network, name: 'Batch A', unitName: 'BA', decimals: 2 },
      { assetId: 900002, network, name: 'Batch B', unitName: 'BB', decimals: 4 },
      { assetId: 900003, network, name: 'Batch C', unitName: 'BC', decimals: 6 }
    ]
    const results = AssetsService.ensureCustomAssets(inputs)
    expect(results).toHaveLength(3)
    expect(results.map((a) => a.assetId)).toEqual([900001, 900002, 900003])
    expect(results.map((a) => a.name)).toEqual(['Batch A', 'Batch B', 'Batch C'])
    expect(results.map((a) => a.symbol)).toEqual(['BA', 'BB', 'BC'])
    // Actually persisted into the registry, not just returned.
    expect(AssetsService.getAssetById(900002, network)?.symbol).toBe('BB')
  })

  it('reuses an already-registered entry instead of creating a duplicate', () => {
    const first = AssetsService.ensureCustomAsset({ assetId: 900010, network, name: 'Once' })
    const [second] = AssetsService.ensureCustomAssets([
      { assetId: 900010, network, name: 'Should be ignored' }
    ])
    expect(second).toBe(first)
    expect(second.name).toBe('Once')
  })

  it('registers the same asset id only once within a single batch', () => {
    const results = AssetsService.ensureCustomAssets([
      { assetId: 900020, network, name: 'Dup' },
      { assetId: 900020, network, name: 'Dup again' }
    ])
    expect(results[0]).toBe(results[1])
    expect(results[0].assetId).toBe(900020)
  })

  it('treats the same numeric id on a different network as a distinct asset', () => {
    const [onNetworkA] = AssetsService.ensureCustomAssets([
      { assetId: 900030, network: 'unit-test-net-a', name: 'On A' }
    ])
    const [onNetworkB] = AssetsService.ensureCustomAssets([
      { assetId: 900030, network: 'unit-test-net-b', name: 'On B' }
    ])
    expect(onNetworkA.network).toBe('unit-test-net-a')
    expect(onNetworkB.network).toBe('unit-test-net-b')
    expect(onNetworkA).not.toBe(onNetworkB)
  })

  it('resolves asset id 0 (ALGO) to the same entry regardless of which network first registered it', () => {
    const existingAlgo = AssetsService.getAssetById(0)
    expect(existingAlgo).toBeDefined()
    const [resolved] = AssetsService.ensureCustomAssets([
      { assetId: 0, network: 'some-other-network', name: 'Should not shadow ALGO' }
    ])
    expect(resolved).toBe(existingAlgo)
  })

  it('returns an empty array for an empty input without touching the registry', () => {
    expect(AssetsService.ensureCustomAssets([])).toEqual([])
  })

  // additions (the persisted registry) is keyed by code (asa<id>), not
  // network — mixing networks for the same id in one batch would silently
  // drop the first network's entry on persist. Both objects are still
  // correctly built and returned (verified here), but this is surfaced with
  // a console.error rather than passing silently, since no current caller
  // does this and it should stay that way.
  it('warns (but still returns both correct objects) if a batch mixes networks for one asset id', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const [onNetworkA, onNetworkB] = AssetsService.ensureCustomAssets([
      { assetId: 900050, network: 'unit-test-mixed-a', name: 'Mixed A' },
      { assetId: 900050, network: 'unit-test-mixed-b', name: 'Mixed B' }
    ])
    expect(onNetworkA.network).toBe('unit-test-mixed-a')
    expect(onNetworkB.network).toBe('unit-test-mixed-b')
    expect(errorSpy).toHaveBeenCalledOnce()
    errorSpy.mockRestore()
  })

  it('produces the same result as calling ensureCustomAsset in a loop', () => {
    const loopInputs = [
      { assetId: 900040, network, name: 'Loop A' },
      { assetId: 900041, network, name: 'Loop B' }
    ]
    const viaLoop = loopInputs.map((input) => AssetsService.ensureCustomAsset(input))

    const batchInputs = [
      { assetId: 900042, network, name: 'Loop A' },
      { assetId: 900043, network, name: 'Loop B' }
    ]
    const viaBatch = AssetsService.ensureCustomAssets(batchInputs)

    expect(viaBatch.map((a) => a.name)).toEqual(viaLoop.map((a) => a.name))
    expect(viaBatch.map((a) => a.decimals)).toEqual(viaLoop.map((a) => a.decimals))
  })
})
