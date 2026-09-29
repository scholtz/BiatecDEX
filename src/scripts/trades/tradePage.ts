import type { Trade, TradePagedResult } from '../../api/models'

/**
 * `GET /api/trade` answers with a bare array for plain assetIdIn/assetIdOut queries and
 * with a paged `{ items, hasMore, ... }` object once advanced filters (assetIdA/B, sort,
 * ...) are used - see AVMTradeReporter's TradeController. Both shapes are accepted.
 */
export type TradesResponse = TradePagedResult | Trade[] | null | undefined

export interface TradesPage {
  items: Trade[]
  hasMore: boolean
}

export const tradesFromResponse = (data: TradesResponse, requestedSize = 0): TradesPage => {
  const rawItems = Array.isArray(data) ? data : (data?.items ?? [])
  const items = rawItems.filter((item): item is Trade => !!item)
  const explicit = !Array.isArray(data) ? data?.hasMore : undefined
  // A full page implies there may be more; a short page is definitely the end.
  const hasMore =
    typeof explicit === 'boolean' ? explicit : requestedSize > 0 && items.length >= requestedSize
  return { items, hasMore }
}

const tradeKey = (trade: Trade): string =>
  trade.topTxId ||
  trade.txId ||
  `${trade.blockId ?? ''}-${trade.timestamp ?? ''}-${trade.assetAmountIn ?? ''}`

const tradeTime = (trade: Trade): number => {
  const time = trade.timestamp ? new Date(trade.timestamp).getTime() : Number.NaN
  return Number.isFinite(time) ? time : Number.NEGATIVE_INFINITY
}

/** Union of two trade lists, deduplicated, newest first, capped at `limit`. */
export const mergeTrades = (existing: Trade[], incoming: Trade[], limit = 500): Trade[] => {
  const byKey = new Map<string, Trade>()
  for (const trade of [...existing, ...incoming]) {
    if (!byKey.has(tradeKey(trade))) byKey.set(tradeKey(trade), trade)
  }
  return [...byKey.values()].sort((a, b) => tradeTime(b) - tradeTime(a)).slice(0, limit)
}

/** Rows visible in a table body of `bodyHeight` px (a partly visible last row counts). */
export const tradeRowCapacity = (bodyHeight: number, headerHeight: number, rowHeight: number) => {
  if (!Number.isFinite(bodyHeight) || !(rowHeight > 0)) return 1
  return Math.max(1, Math.ceil((bodyHeight - Math.max(0, headerHeight)) / rowHeight))
}

const MIN_PAGE_SIZE = 30
const MAX_PAGE_SIZE = 200

/** Page size that fills the panel with about one extra screen to scroll through. */
export const tradePageSize = (capacity: number): number => {
  if (!Number.isFinite(capacity)) return MIN_PAGE_SIZE
  return Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, Math.round(capacity * 2)))
}
