import { describe, expect, it, vi } from 'vitest'

vi.mock('@/scripts/common/delay', () => ({ default: vi.fn(async () => {}) }))

import type { ISwapQuote } from '@/interface/ISwapQuote'
import type { IState } from '@/stores/app'
import { BiatecRouterError } from '@/service/routerApi'
import fetchBids from '@/scripts/asset/fetchBids'
import fetchOffers from '@/scripts/asset/fetchOffers'
import { createDepthQuoter, resetDepthQuoterMemo } from '../depthQuotes'
import type { SwapRequest } from '../swapQuote'

const quoteFor =
  (source: 'biatec' | 'folks') =>
  async (request: SwapRequest): Promise<ISwapQuote> => ({
    source,
    swapMode: request.swapMode,
    fromAssetId: request.fromAssetId,
    toAssetId: request.toAssetId,
    inputAmount: request.amount,
    outputAmount: request.amount * 2n
  })

const fi = (amount: bigint): SwapRequest => ({
  fromAssetId: 0,
  toAssetId: 1,
  amount,
  swapMode: 'FIXED_INPUT'
})
const fo = (amount: bigint): SwapRequest => ({ ...fi(amount), swapMode: 'FIXED_OUTPUT' })

describe('createDepthQuoter', () => {
  it('uses Biatec Router first', async () => {
    const folks = vi.fn(quoteFor('folks'))
    const quote = createDepthQuoter({ biatecConfigured: true, biatec: quoteFor('biatec'), folks })
    expect((await quote(fi(1n)))?.source).toBe('biatec')
    expect(folks).not.toHaveBeenCalled()
  })

  it('uses Folks when the router is not configured for the network', async () => {
    const biatec = vi.fn(quoteFor('biatec'))
    const quote = createDepthQuoter({ biatecConfigured: false, biatec, folks: quoteFor('folks') })
    expect((await quote(fi(1n)))?.source).toBe('folks')
    expect(biatec).not.toHaveBeenCalled()
  })

  it('falls back per row on no route / HTTP errors and keeps trying Biatec', async () => {
    const biatec = vi
      .fn(quoteFor('biatec'))
      .mockRejectedValueOnce(new BiatecRouterError('no-route', '404', 404))
    const quote = createDepthQuoter({ biatecConfigured: true, biatec, folks: quoteFor('folks') })
    expect((await quote(fi(1n)))?.source).toBe('folks')
    expect((await quote(fi(2n)))?.source).toBe('biatec')
  })

  it('stops calling Biatec for the rest of the refresh after a network / CORS error', async () => {
    const biatec = vi.fn(async (): Promise<ISwapQuote> => {
      throw new BiatecRouterError('network', 'CORS')
    })
    const quote = createDepthQuoter({ biatecConfigured: true, biatec, folks: quoteFor('folks') })
    for (const amount of [1n, 2n, 3n]) expect((await quote(fi(amount)))?.source).toBe('folks')
    expect(await quote(fo(1n))).toMatchObject({ source: 'folks' })
    expect(biatec).toHaveBeenCalledTimes(1)
  })

  it('stops calling Biatec for the rest of the refresh after an HTTP error (401, 5xx)', async () => {
    const biatec = vi.fn(async (): Promise<ISwapQuote> => {
      throw new BiatecRouterError('http', '401', 401)
    })
    const quote = createDepthQuoter({ biatecConfigured: true, biatec, folks: quoteFor('folks') })
    expect((await quote(fi(1n)))?.source).toBe('folks')
    expect((await quote(fi(2n)))?.source).toBe('folks')
    expect(biatec).toHaveBeenCalledTimes(1)
  })

  it('a row without any quote is skipped, not fatal for the following rows', async () => {
    const folks = vi
      .fn(quoteFor('folks'))
      .mockRejectedValueOnce(new Error('Folks Router returned no quote'))
    const quote = createDepthQuoter({ biatecConfigured: false, biatec: quoteFor('biatec'), folks })
    expect(await quote(fi(1n))).toBeNull()
    expect((await quote(fi(2n)))?.source).toBe('folks')
  })

  it('keeps trying Biatec after a per-row 400', async () => {
    const biatec = vi
      .fn(quoteFor('biatec'))
      .mockRejectedValueOnce(new BiatecRouterError('http', '400', 400))
    const quote = createDepthQuoter({ biatecConfigured: true, biatec, folks: quoteFor('folks') })
    expect((await quote(fi(1n)))?.source).toBe('folks')
    expect((await quote(fi(2n)))?.source).toBe('biatec')
  })

  it('remembers "fixed output unsupported" per network across refreshes', async () => {
    resetDepthQuoterMemo()
    const biatec = vi.fn(async (): Promise<ISwapQuote> => {
      throw new BiatecRouterError('unsupported', 'no echo')
    })
    const sources = { biatecConfigured: true, biatec, folks: quoteFor('folks') }
    await createDepthQuoter(sources, 'mainnet-v1.0')(fo(1n))
    await createDepthQuoter(sources, 'mainnet-v1.0')(fo(1n))
    expect(biatec).toHaveBeenCalledTimes(1)
    await createDepthQuoter(sources, 'testnet-v1.0')(fo(1n))
    expect(biatec).toHaveBeenCalledTimes(2)
    resetDepthQuoterMemo()
  })

  it('stops fixed-output Biatec calls once fixed output is reported unsupported', async () => {
    const biatec = vi.fn(async (request: SwapRequest) => {
      if (request.swapMode === 'FIXED_OUTPUT') throw new BiatecRouterError('unsupported', 'no echo')
      return quoteFor('biatec')(request)
    })
    const quote = createDepthQuoter({ biatecConfigured: true, biatec, folks: quoteFor('folks') })
    expect((await quote(fo(1n)))?.source).toBe('folks')
    expect((await quote(fo(2n)))?.source).toBe('folks')
    expect((await quote(fi(1n)))?.source).toBe('biatec')
    expect(biatec).toHaveBeenCalledTimes(2)
  })
})

describe('depth rows', () => {
  // Asset with 0 decimals priced in a 6-decimal currency: the row amount is a currency
  // amount and must scale with the currency's decimals.
  const state = () =>
    // `unknown`: a minimal state slice stands in for the full IState.
    ({
      env: 'mainnet-v1.0',
      pair: {
        asset: { assetId: 5, decimals: 0, quotes: [1, 10] },
        currency: { assetId: 0, decimals: 6 }
      },
      bids: {},
      offers: {}
    }) as unknown as IState

  it('offers are fixed-input buys of currency -> asset, scaled with the currency decimals', async () => {
    const s = state()
    const quote = vi.fn(quoteFor('biatec'))
    await fetchOffers(s, quote)
    expect(quote).toHaveBeenCalledWith({
      fromAssetId: 0,
      toAssetId: 5,
      amount: 1_000_000n,
      swapMode: 'FIXED_INPUT'
    })
    expect(s.offers[10]).toMatchObject({ baseAmount: 10, amount: 10_000_000n })
    expect(s.offers[10].quote.source).toBe('biatec')
  })

  it('bids are fixed-output sells of asset -> currency, scaled with the currency decimals', async () => {
    const s = state()
    const quote = vi.fn(quoteFor('folks'))
    await fetchBids(s, quote)
    expect(quote).toHaveBeenCalledWith({
      fromAssetId: 5,
      toAssetId: 0,
      amount: 1_000_000n,
      swapMode: 'FIXED_OUTPUT'
    })
    expect(Object.keys(s.bids)).toEqual(['1', '10'])
  })

  it('skips rows without a quote', async () => {
    const s = state()
    await fetchOffers(s, async () => null)
    expect(s.offers).toEqual({})
  })
})
