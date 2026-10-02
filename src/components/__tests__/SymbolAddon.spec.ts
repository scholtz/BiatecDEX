import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SymbolAddon from '../SymbolAddon.vue'
import { pairLabel } from '@/scripts/common/pairLabel'

// The real PrimeVue InputGroupAddon is auto-imported by unplugin-vue-components; a stub keeps the test about SymbolAddon itself.
const InputGroupAddon = { template: '<div class="p-inputgroupaddon"><slot /></div>' }
const mountAddon = (text: string) =>
  mount(SymbolAddon, { props: { text }, global: { stubs: { InputGroupAddon } } })

describe('SymbolAddon', () => {
  it('shows the symbol, truncates it and keeps the full text as the title', () => {
    const long = 'GOLDDAO$$/USDCaUSDCa'
    const label = mountAddon(long).get('div.truncate')
    expect(label.text()).toBe(long)
    expect(label.attributes('title')).toBe(long)
    expect(label.classes()).toContain('min-w-0') // a flex child may only shrink below its text width with min-width: 0
  })

  it('is capped by its own class, so no distant selector can drift out of step', () => {
    expect(mountAddon('ALGO').find('.symbol-addon').exists()).toBe(true)
  })

  it('is always rendered, also while the symbol is still unknown (no layout shift when it arrives)', () => {
    const addon = mountAddon('')
    expect(addon.find('.symbol-addon').exists()).toBe(true)
    expect(addon.get('div.truncate').text()).toBe('')
  })

  it('formats a pair as ASSET/CURRENCY', () => {
    expect(pairLabel({ asset: { symbol: 'VOTE' }, currency: { symbol: 'USD' } })).toBe('VOTE/USD')
  })
})
