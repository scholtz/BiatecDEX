import { describe, expect, it } from 'vitest'
import { buildChatPageContext } from '../pageContext'

describe('buildChatPageContext', () => {
  it('describes a trade pair', () => {
    expect(
      buildChatPageContext('tradeWithAssets', {
        network: 'mainnet-v1.0',
        assetCode: 'GOLD',
        currencyCode: 'ALGO'
      })
    ).toBe('Biatec DEX · trade · mainnet-v1.0 · pair GOLD/ALGO')
  })

  it('includes the pool app id on add liquidity', () => {
    expect(
      buildChatPageContext('add-liquidity', {
        network: 'testnet-v1.0',
        assetCode: 'A',
        currencyCode: 'B',
        ammAppId: '123'
      })
    ).toBe('Biatec DEX · add liquidity · testnet-v1.0 · pair A/B · pool app 123')
  })

  it('handles pool routes without a pair', () => {
    expect(buildChatPageContext('pool-swap', { network: 'mainnet-v1.0', ammAppId: ['9'] })).toBe(
      'Biatec DEX · pool swap · mainnet-v1.0 · pool app 9'
    )
  })

  it('clears the context on other routes', () => {
    expect(buildChatPageContext('home', {})).toBeUndefined()
    expect(buildChatPageContext(undefined, {})).toBeUndefined()
    expect(buildChatPageContext(Symbol('x'), {})).toBeUndefined()
  })
})
