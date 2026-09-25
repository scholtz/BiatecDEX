import { describe, expect, it } from 'vitest'
import { buildPairKey } from '../buildPairKey'

describe('buildPairKey', () => {
  it('combines env, assetCode and currencyCode', () => {
    expect(buildPairKey('mainnet-v1.0', 'GLD', 'GD')).toBe('mainnet-v1.0:GLD:GD')
  })

  it('is order-sensitive (asset/currency swap yields a different key)', () => {
    expect(buildPairKey('mainnet-v1.0', 'GLD', 'GD')).not.toBe(
      buildPairKey('mainnet-v1.0', 'GD', 'GLD')
    )
  })

  it('includes the network, so the same asset codes on different networks do not collide', () => {
    // ALGO is asset id 0 (and often code "ALGO"/"tAlgo") on every network — the
    // network segment is what keeps these from aliasing onto each other.
    expect(buildPairKey('mainnet-v1.0', 'vote', 'ALGO')).not.toBe(
      buildPairKey('testnet-v1.0', 'vote', 'ALGO')
    )
  })
})
