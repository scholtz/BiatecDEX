import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick, reactive } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

const fetchMock = vi.hoisted(() => vi.fn())
const storeState = vi.hoisted(() => ({ state: { env: 'mainnet-v1.0' } }))
const reactiveState = vi.hoisted(() => ({ current: null as null | { state: { env: string } } }))
vi.mock('@/service/tradeApi', () => ({
  fetchScanLatestBlock: fetchMock,
  isTradeApiConfigured: () => true
}))
vi.mock('@/stores/app', () => ({ useAppStore: () => reactiveState.current ?? storeState }))

import {
  useScanSyncStatus,
  SCAN_SYNC_POLL_MS,
  SCAN_SYNC_BASELINE_POLL_MS
} from '../useScanSyncStatus'

const NOW = 1_700_000_000
const harness = () => {
  let api!: ReturnType<typeof useScanSyncStatus>
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useScanSyncStatus()
        return () => null
      }
    })
  )
  return { wrapper, api: () => api }
}

describe('useScanSyncStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW * 1000)
    fetchMock.mockReset()
    reactiveState.current = reactive({ state: { env: 'mainnet-v1.0' } })
  })
  afterEach(() => vi.useRealTimers())

  it('goes stalled -> syncing -> ok and keeps the state over one failed poll', async () => {
    fetchMock.mockResolvedValueOnce({ round: 10, timestampSec: NOW - 300 })
    const { wrapper, api } = harness()
    await flushPromises()
    expect(api().state.value).toBe('unknown')
    fetchMock.mockResolvedValueOnce({ round: 10, timestampSec: NOW - 296 })
    await vi.advanceTimersByTimeAsync(SCAN_SYNC_BASELINE_POLL_MS)
    expect(api().state.value).toBe('stalled')

    fetchMock.mockResolvedValueOnce({ round: 20, timestampSec: NOW - 280 })
    await vi.advanceTimersByTimeAsync(SCAN_SYNC_POLL_MS)
    expect(api().state.value).toBe('syncing')

    fetchMock.mockResolvedValueOnce(null)
    await vi.advanceTimersByTimeAsync(SCAN_SYNC_POLL_MS)
    expect(api().state.value).toBe('syncing')

    fetchMock.mockResolvedValueOnce({ round: 99999, timestampSec: NOW + 45 })
    await vi.advanceTimersByTimeAsync(SCAN_SYNC_POLL_MS)
    expect(api().state.value).toBe('ok')
    expect(api().outOfSync.value).toBe(false)
    wrapper.unmount()
  })

  it('stops polling after unmount', async () => {
    fetchMock.mockResolvedValue({ round: 1, timestampSec: NOW })
    const { wrapper } = harness()
    await flushPromises()
    wrapper.unmount()
    const calls = fetchMock.mock.calls.length
    await vi.advanceTimersByTimeAsync(SCAN_SYNC_POLL_MS * 4)
    expect(fetchMock.mock.calls.length).toBe(calls)
  })

  it('re-checks an old first block quickly and then reports syncing', async () => {
    fetchMock.mockResolvedValueOnce({ round: 10, timestampSec: NOW - 300 })
    const { wrapper, api } = harness()
    await flushPromises()
    expect(api().state.value).toBe('unknown')
    fetchMock.mockResolvedValueOnce({ round: 11, timestampSec: NOW - 290 })
    await vi.advanceTimersByTimeAsync(SCAN_SYNC_BASELINE_POLL_MS)
    expect(api().state.value).toBe('syncing')
    wrapper.unmount()
  })

  it('resets to unknown and polls again on a network switch', async () => {
    fetchMock.mockResolvedValue({ round: 10, timestampSec: NOW - 300 })
    const { wrapper, api } = harness()
    await flushPromises()
    expect(api().state.value).toBe('unknown')
    const calls = fetchMock.mock.calls.length
    fetchMock.mockResolvedValue({ round: 5, timestampSec: NOW })
    reactiveState.current!.state.env = 'testnet-v1.0'
    await nextTick()
    await flushPromises()
    expect(fetchMock.mock.calls.length).toBe(calls + 1)
    expect(fetchMock).toHaveBeenLastCalledWith('testnet-v1.0')
    expect(api().state.value).toBe('ok')
    wrapper.unmount()
  })

  it('keeps a standing verdict over an older replica and a baseline reset', async () => {
    fetchMock.mockResolvedValueOnce({ round: 100, timestampSec: NOW - 300 })
    const { wrapper, api } = harness()
    await flushPromises()
    fetchMock.mockResolvedValueOnce({ round: 110, timestampSec: NOW - 290 })
    await vi.advanceTimersByTimeAsync(SCAN_SYNC_BASELINE_POLL_MS)
    expect(api().state.value).toBe('syncing')
    fetchMock.mockResolvedValueOnce({ round: 105, timestampSec: NOW - 295 })
    await vi.advanceTimersByTimeAsync(SCAN_SYNC_POLL_MS)
    expect(api().state.value).toBe('syncing')
    wrapper.unmount()
  })
})
