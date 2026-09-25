import { describe, expect, it } from 'vitest'
import { mergeHeldAndPooledOptions, type AssetSelectOption } from '../mergeHeldAndPooledOptions'

const opt = (assetId: number, label: string): AssetSelectOption => ({ assetId, label })

describe('mergeHeldAndPooledOptions', () => {
  it('lists held assets first (alphabetically), then pooled-but-unheld (alphabetically)', () => {
    const held = [opt(1, 'Zebra'), opt(2, 'Apple')]
    const pooled = [3, 4]
    const resolve = (id: number) => (id === 3 ? opt(3, 'Mango') : opt(4, 'Banana'))
    const result = mergeHeldAndPooledOptions(held, pooled, resolve)
    expect(result.map((o) => o.label)).toEqual(['Apple', 'Zebra', 'Banana', 'Mango'])
  })

  it('does not duplicate an asset that is both held and pooled', () => {
    const held = [opt(1, 'Apple')]
    const pooled = [1, 2]
    const resolve = (id: number) => opt(id, id === 2 ? 'Banana' : 'Apple')
    const result = mergeHeldAndPooledOptions(held, pooled, resolve)
    expect(result.map((o) => o.assetId)).toEqual([1, 2])
  })

  it('skips pooled ids resolveOption cannot resolve (unregistered asset)', () => {
    const held: AssetSelectOption[] = []
    const pooled = [1, 2]
    const resolve = (id: number) => (id === 1 ? opt(1, 'Known') : null)
    const result = mergeHeldAndPooledOptions(held, pooled, resolve)
    expect(result).toHaveLength(1)
    expect(result[0].assetId).toBe(1)
  })

  it('dedups repeated pooled ids', () => {
    const held: AssetSelectOption[] = []
    const pooled = [1, 1, 1]
    const resolve = (id: number) => opt(id, 'Once')
    const result = mergeHeldAndPooledOptions(held, pooled, resolve)
    expect(result).toHaveLength(1)
  })

  it('returns an empty list when there is nothing held or pooled', () => {
    expect(mergeHeldAndPooledOptions([], [], () => null)).toEqual([])
  })

  it('returns only held assets when nothing else is pooled', () => {
    const held = [opt(1, 'Apple')]
    const result = mergeHeldAndPooledOptions(held, [], () => null)
    expect(result).toEqual(held)
  })
})
