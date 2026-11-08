import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { useConfigurableColumns } from '../useConfigurableColumns'
import type { Breakpoint } from '../useBreakpoint'

const DEFS = [
  { id: 'a', labelKey: 'a', defaultBreakpoints: ['sm', 'md', 'lg', 'xl', '2xl'] as Breakpoint[] },
  { id: 'b', labelKey: 'b', defaultBreakpoints: ['xl', '2xl'] as Breakpoint[] }
]
const KEY = 'test.columns'

describe('useConfigurableColumns', () => {
  beforeEach(() => {
    const data = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
      clear: () => data.clear()
    })
  })

  it('follows the breakpoint defaults until the user picks columns', async () => {
    const bp = ref<Breakpoint>('sm')
    const cols = useConfigurableColumns(DEFS, KEY, bp)
    expect(cols.visibleColumnIds.value).toEqual(['a'])
    bp.value = 'xl'
    await nextTick()
    expect(cols.visibleColumnIds.value).toEqual(['a', 'b'])
  })

  it('persists an explicit choice and ignores later breakpoint changes', async () => {
    const bp = ref<Breakpoint>('sm')
    const cols = useConfigurableColumns(DEFS, KEY, bp)
    cols.setVisibleColumns(['b'])
    bp.value = 'xl'
    await nextTick()
    expect(cols.visibleColumnIds.value).toEqual(['b'])
    expect(cols.isColumnVisible('b')).toBe(true)
    expect(cols.isColumnVisible('a')).toBe(false)
    const reloaded = useConfigurableColumns(DEFS, KEY, ref<Breakpoint>('2xl'))
    expect(reloaded.visibleColumnIds.value).toEqual(['b'])
  })

  it('drops stored ids that no longer exist and survives corrupt storage', () => {
    localStorage.setItem(KEY, JSON.stringify({ columns: ['a', 'gone'] }))
    expect(useConfigurableColumns(DEFS, KEY, ref<Breakpoint>('sm')).visibleColumnIds.value).toEqual(
      ['a']
    )
    localStorage.setItem(KEY, '{not json')
    expect(useConfigurableColumns(DEFS, KEY, ref<Breakpoint>('sm')).visibleColumnIds.value).toEqual(
      ['a']
    )
  })

  it('never ends up with no visible column', () => {
    const cols = useConfigurableColumns(DEFS, KEY, ref<Breakpoint>('sm'))
    cols.setVisibleColumns([])
    expect(cols.visibleColumnIds.value).toEqual(['a'])
    localStorage.setItem(KEY, JSON.stringify({ columns: [] }))
    expect(useConfigurableColumns(DEFS, KEY, ref<Breakpoint>('xl')).visibleColumnIds.value).toEqual(
      ['a', 'b']
    )
  })

  it('keeps required columns visible', () => {
    const cols = useConfigurableColumns(DEFS, KEY, ref<Breakpoint>('sm'), { required: ['a'] })
    cols.setVisibleColumns(['b'])
    expect(cols.visibleColumnIds.value).toEqual(['a', 'b'])
    cols.setVisibleColumns([])
    expect(cols.visibleColumnIds.value).toEqual(['a'])
  })

  it('shows columns added after the choice was saved at their default breakpoints', () => {
    localStorage.setItem(KEY, JSON.stringify({ columns: ['a'], known: ['a'] }))
    expect(useConfigurableColumns(DEFS, KEY, ref<Breakpoint>('xl')).visibleColumnIds.value).toEqual(
      ['a', 'b']
    )
    // A column the user already knew and hid stays hidden.
    localStorage.setItem(KEY, JSON.stringify({ columns: ['a'], known: ['a', 'b'] }))
    expect(useConfigurableColumns(DEFS, KEY, ref<Breakpoint>('xl')).visibleColumnIds.value).toEqual(
      ['a']
    )
  })
})
