import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import AssetLogo from '../AssetLogo.vue'

const urlFor = vi.hoisted(() => vi.fn<(env: string, id: number | bigint) => string | undefined>())
vi.mock('@/service/tradeApi', () => ({ getAssetImageUrl: urlFor }))
vi.mock('@/stores/app', () => ({ useAppStore: () => ({ state: { env: 'testnet' } }) }))

describe('AssetLogo', () => {
  it('shows the logo in a fixed 40px slot', () => {
    urlFor.mockReturnValue('https://x/1.png')
    const w = mount(AssetLogo, { props: { assetId: 1, name: 'Algo' } })
    expect(w.get('img').attributes('src')).toBe('https://x/1.png')
    expect(w.classes()).toContain('w-10')
  })

  it('shows the initial in the same slot when there is no logo', async () => {
    urlFor.mockReturnValue(undefined)
    const w = mount(AssetLogo, { props: { assetId: 2, name: 't01' } })
    expect(w.find('img').exists()).toBe(false)
    expect(w.text()).toBe('T')
    await w.setProps({ name: undefined }) // API rows may lack a name
    expect(w.text()).toBe('')
    expect(w.classes()).toContain('w-10')
  })

  it('falls back after a load error and tries again for another asset', async () => {
    urlFor.mockImplementation((_e, id) => `https://x/${id}.png`)
    const w = mount(AssetLogo, { props: { assetId: 3, name: 'Gold' } })
    await w.get('img').trigger('error')
    expect(w.find('img').exists()).toBe(false)
    expect(w.text()).toBe('G')
    await w.setProps({ assetId: 4, name: 'Vote' })
    await nextTick()
    expect(w.get('img').attributes('src')).toBe('https://x/4.png')
  })
})

describe('AssetLogo failed urls', () => {
  it('are remembered across instances, so a re-created row does not re-request a missing logo', async () => {
    urlFor.mockReturnValue('https://x/404.png')
    const first = mount(AssetLogo, { props: { assetId: 9, name: 'Gone' } })
    await first.get('img').trigger('error')
    const second = mount(AssetLogo, { props: { assetId: 9, name: 'Gone' } })
    expect(second.find('img').exists()).toBe(false)
  })
})
