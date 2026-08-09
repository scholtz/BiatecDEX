import { describe, it, expect } from 'vitest'
import { setPairIfChanged, type StorePair } from '../setPairIfChanged'
import type { IAsset } from '@/interface/IAsset'

const makeAsset = (overrides: Partial<IAsset>): IAsset => ({
  assetId: 0,
  name: 'Testnet Algorand',
  symbol: 'tAlgo',
  code: 'tAlgo',
  decimals: 6,
  isCurrency: true,
  isAsa: true,
  isArc200: false,
  quotes: [1, 10, 100, 1000],
  network: 'testnet-v1.0',
  precision: 1,
  ...overrides
})

const tAlgo = makeAsset({})
const usdc = makeAsset({ assetId: 10458941, name: 'USDC', symbol: 'USDC', code: 'USDC' })

describe('setPairIfChanged', () => {
  it('does not touch the store when the pair is semantically identical', () => {
    const state = { pair: { invert: false, asset: usdc, currency: tAlgo } as StorePair }
    const before = state.pair
    // Fresh object with fresh (but equal) asset objects — the exact shape every
    // sync function produces on every run. Writing it unconditionally replaced
    // store.state.pair with a new object each pass, re-triggering every watcher
    // of the pair and feeding endless reactive cascades (browser RESULT_CODE_HUNG;
    // Vue's recursive-update detection is dev-only and cannot save production).
    const changed = setPairIfChanged(state, {
      invert: true, // invert intentionally differs — no consumer reads it
      asset: { ...usdc },
      currency: { ...tAlgo }
    })
    expect(changed).toBe(false)
    expect(state.pair).toBe(before)
  })

  it('replaces the pair when the asset side actually changed', () => {
    const state = { pair: { invert: false, asset: usdc, currency: tAlgo } as StorePair }
    const next = { invert: false, asset: tAlgo, currency: usdc }
    expect(setPairIfChanged(state, next)).toBe(true)
    expect(state.pair).toBe(next)
  })

  it('replaces the pair when the same code points to another network', () => {
    const state = { pair: { invert: false, asset: usdc, currency: tAlgo } as StorePair }
    const mainnetUsdc = makeAsset({
      assetId: 31566704,
      code: 'USDC',
      name: 'USDC',
      network: 'mainnet-v1.0'
    })
    expect(setPairIfChanged(state, { invert: false, asset: mainnetUsdc, currency: tAlgo })).toBe(
      true
    )
  })

  it('writes when there is no pair yet', () => {
    // StorePair itself is non-optional; this simulates the store's not-yet-initialized state.
    const state = { pair: undefined as unknown as StorePair }
    expect(setPairIfChanged(state, { invert: false, asset: usdc, currency: tAlgo })).toBe(true)
  })
})
