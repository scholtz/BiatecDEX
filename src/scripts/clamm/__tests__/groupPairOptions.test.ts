import { describe, expect, it } from 'vitest'
import { groupPairOptions } from '../groupPairOptions'

const p = (assetCode: string, currencyCode: string) => ({ assetCode, currencyCode })

describe('groupPairOptions', () => {
  const pairs = [
    p('GOLD', 'ALGO'),
    p('USDC', 'ALGO'),
    p('GOLD', 'USDC'),
    p('XYZ', 'USDC'),
    p('FOO', 'BAR'),
    p('ALGO', 'GOLD')
  ]

  it('orders asset matches, currency matches, then the rest, keeping input order', () => {
    const groups = groupPairOptions(pairs, 'GOLD', 'ALGO')
    expect(groups.map((g) => g.key)).toEqual(['asset', 'currency', 'other'])
    expect(groups[0].items).toEqual([p('GOLD', 'ALGO'), p('GOLD', 'USDC'), p('ALGO', 'GOLD')])
    expect(groups[1].items).toEqual([p('USDC', 'ALGO')])
    expect(groups[2].items).toEqual([p('XYZ', 'USDC'), p('FOO', 'BAR')])
  })

  it('matches the asset on either side of a pair', () => {
    const groups = groupPairOptions([p('ALGO', 'GOLD')], 'GOLD', 'USDC')
    expect(groups).toEqual([{ key: 'asset', items: [p('ALGO', 'GOLD')] }])
  })

  it('omits empty groups', () => {
    const groups = groupPairOptions([p('FOO', 'BAR')], 'GOLD', 'ALGO')
    expect(groups.map((g) => g.key)).toEqual(['other'])
  })

  it('puts every pair in "other" without a selection', () => {
    const groups = groupPairOptions(pairs, undefined, '')
    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({ key: 'other' })
    expect(groups[0].items).toHaveLength(pairs.length)
  })

  it('returns no groups for no pairs and never duplicates a pair', () => {
    expect(groupPairOptions([], 'A', 'B')).toEqual([])
    const total = groupPairOptions(pairs, 'GOLD', 'GOLD').reduce((n, g) => n + g.items.length, 0)
    expect(total).toBe(pairs.length)
  })
})
