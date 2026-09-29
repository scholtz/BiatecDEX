import { describe, expect, it } from 'vitest'
import type { Trade } from '../../../api/models'
import {
  mergeTrades,
  tradePageSize,
  tradeRowCapacity,
  tradesFromResponse,
  type TradesResponse
} from '../tradePage'

const trade = (txId: string, timestamp: string): Trade => ({
  txId,
  topTxId: `top-${txId}`,
  timestamp,
  assetIdIn: 1,
  assetIdOut: 2
})

describe('tradesFromResponse', () => {
  it('reads the paged shape', () => {
    const t = trade('a', '2026-01-01T00:00:00Z')
    const res = { items: [t], total: 40, offset: 0, size: 25, hasMore: true } as TradesResponse
    expect(tradesFromResponse(res)).toEqual({ items: [t], hasMore: true })
  })

  // Regression: the deployed backend answers a plain assetIdIn/assetIdOut/size query with a
  // BARE ARRAY (advanced filters are what switch it to the paged shape). The list only read
  // `.items`, so it rendered "No trades for this pair yet" although the API had trades.
  it('reads the bare-array shape', () => {
    const t = trade('a', '2026-01-01T00:00:00Z')
    expect(tradesFromResponse([t] as unknown as TradesResponse, 1)).toEqual({
      items: [t],
      hasMore: true
    })
    expect(tradesFromResponse([t] as unknown as TradesResponse, 5)).toEqual({
      items: [t],
      hasMore: false
    })
  })

  it('tolerates empty / missing / malformed responses', () => {
    expect(tradesFromResponse(undefined, 10)).toEqual({ items: [], hasMore: false })
    expect(tradesFromResponse(null, 10)).toEqual({ items: [], hasMore: false })
    expect(tradesFromResponse({} as TradesResponse, 10)).toEqual({ items: [], hasMore: false })
    expect(tradesFromResponse([null, undefined] as unknown as TradesResponse, 10).items).toEqual([])
  })

  it('infers hasMore from the page size when the paged shape omits it', () => {
    const items = [trade('a', '2026-01-01T00:00:00Z'), trade('b', '2026-01-01T00:00:01Z')]
    expect(tradesFromResponse({ items } as TradesResponse, 2).hasMore).toBe(true)
    expect(tradesFromResponse({ items } as TradesResponse, 3).hasMore).toBe(false)
  })
})

describe('mergeTrades', () => {
  it('dedupes by transaction and orders newest first', () => {
    const a = trade('a', '2026-01-01T00:00:01Z')
    const b = trade('b', '2026-01-01T00:00:03Z')
    const c = trade('c', '2026-01-01T00:00:02Z')
    expect(mergeTrades([a, c], [b, a]).map((t) => t.txId)).toEqual(['b', 'c', 'a'])
  })

  // Review finding: a multi-hop / aggregator swap yields several trades that share one
  // top-level transaction; keying on topTxId collapsed them into one row.
  it('keeps distinct trades that share a top-level transaction', () => {
    const a: Trade = { ...trade('a', '2026-01-01T00:00:01Z'), topTxId: 'SAME' }
    const b: Trade = { ...trade('b', '2026-01-01T00:00:02Z'), topTxId: 'SAME' }
    expect(mergeTrades([a], [b]).map((t) => t.txId)).toEqual(['b', 'a'])
    expect(mergeTrades([a], [a])).toHaveLength(1)
  })

  it('caps the merged list', () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      trade(`t${i}`, `2026-01-01T00:00:${String(i).padStart(2, '0')}Z`)
    )
    const merged = mergeTrades(many, [], 4)
    expect(merged).toHaveLength(4)
    expect(merged[0].txId).toBe('t9')
  })

  it('keeps trades without a timestamp at the end', () => {
    const a = trade('a', '2026-01-01T00:00:01Z')
    const noTs: Trade = { txId: 'x', assetIdIn: 1, assetIdOut: 2 }
    expect(mergeTrades([noTs], [a]).map((t) => t.txId)).toEqual(['a', 'x'])
  })
})

describe('tradeRowCapacity', () => {
  it('counts the rows that fit under the header', () => {
    // 600px body, 36px header, 28px rows => ceil(564/28) = 21 rows (last one partly visible)
    expect(tradeRowCapacity(600, 36, 28)).toBe(21)
  })

  it('never returns less than 1 and is safe for degenerate input', () => {
    expect(tradeRowCapacity(0, 36, 28)).toBe(1)
    expect(tradeRowCapacity(20, 36, 28)).toBe(1)
    expect(tradeRowCapacity(Number.NaN, 36, 28)).toBe(1)
    expect(tradeRowCapacity(600, 36, 0)).toBe(1)
    expect(tradeRowCapacity(600, 36, -5)).toBe(1)
    expect(tradeRowCapacity(Number.POSITIVE_INFINITY, 36, 28)).toBe(1)
  })
})

describe('tradePageSize', () => {
  it('fetches enough rows to fill the panel with headroom for scrolling', () => {
    expect(tradePageSize(21)).toBe(42)
  })

  it('stays within sane bounds (API max is 500)', () => {
    expect(tradePageSize(1)).toBe(30)
    expect(tradePageSize(400)).toBe(200)
    expect(tradePageSize(Number.NaN)).toBe(30)
  })
})
