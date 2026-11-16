import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import Select from 'primevue/select'
import { beforeAll, describe, expect, it } from 'vitest'
import { groupPairOptions } from '@/scripts/clamm/groupPairOptions'

// Guards the PrimeVue wiring AssetInfo.vue uses (optionGroupLabel/optionGroupChildren):
// headings render as group rows in order, and only pairs are selectable options.
describe('pair Select grouped options', () => {
  beforeAll(() => {
    // jsdom has no matchMedia, which PrimeVue's overlay positioning calls.
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      onchange: null
    })) as typeof window.matchMedia
  })

  it('renders one heading per group followed by its pairs', async () => {
    const pairs = [
      { label: 'G/A', assetCode: 'GOLD', currencyCode: 'ALGO' },
      { label: 'U/A', assetCode: 'USDC', currencyCode: 'ALGO' },
      { label: 'F/B', assetCode: 'FOO', currencyCode: 'BAR' }
    ]
    const labels = { asset: 'With GOLD', currency: 'With ALGO', other: 'Other' }
    const options = groupPairOptions(pairs, 'GOLD', 'ALGO').map((g) => ({
      label: labels[g.key],
      items: g.items
    }))
    const wrapper = mount(Select, {
      global: { plugins: [PrimeVue] },
      props: {
        modelValue: pairs[0],
        options,
        optionLabel: 'label',
        optionGroupLabel: 'label',
        optionGroupChildren: 'items'
      },
      attachTo: document.body
    })
    await wrapper.find('.p-select-dropdown').trigger('click')
    const rows = Array.from(
      document.body.querySelectorAll('.p-select-option-group, .p-select-option')
    )
    expect(rows.map((r) => r.textContent?.trim())).toEqual([
      'With GOLD',
      'G/A',
      'With ALGO',
      'U/A',
      'Other',
      'F/B'
    ])
    expect(document.body.querySelectorAll('.p-select-option-group')).toHaveLength(3)
    wrapper.unmount()
  })
})
