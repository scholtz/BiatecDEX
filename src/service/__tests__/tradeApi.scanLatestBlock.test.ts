import { beforeEach, describe, expect, it, vi } from 'vitest'

const axiosMock = vi.hoisted(() => vi.fn())
vi.mock('@/api/axios-instance', () => ({ axiosInstance: vi.fn() }))
vi.mock('axios', () => ({ default: { get: axiosMock } }))

import { fetchScanLatestBlock } from '../tradeApi'

describe('fetchScanLatestBlock', () => {
  beforeEach(() => axiosMock.mockReset())

  it('maps the coingecko payload', async () => {
    axiosMock.mockResolvedValue({ data: { block: { blockNumber: 7, blockTimestamp: 1700000000 } } })
    expect(await fetchScanLatestBlock('mainnet-v1.0')).toEqual({
      round: 7,
      timestampSec: 1700000000
    })
    expect(axiosMock.mock.calls[0][0]).toContain('/api/coingecko/latest-block')
  })
  it('returns null for a network without trade API', async () => {
    expect(await fetchScanLatestBlock('dockernet-v1')).toBeNull()
    expect(axiosMock).not.toHaveBeenCalled()
  })
  it('returns null on failure or malformed payload', async () => {
    axiosMock.mockRejectedValueOnce(new Error('503'))
    expect(await fetchScanLatestBlock('mainnet-v1.0')).toBeNull()
    axiosMock.mockResolvedValueOnce({ data: {} })
    expect(await fetchScanLatestBlock('mainnet-v1.0')).toBeNull()
    axiosMock.mockResolvedValueOnce({ data: { block: { blockNumber: null, blockTimestamp: 1 } } })
    expect(await fetchScanLatestBlock('mainnet-v1.0')).toBeNull()
  })
})
