import { type IState } from '@/stores/app'

const calculateMidAndRange = (state: IState) => {
  if (Object.values(state.offers).length > 0 && Object.values(state.bids).length > 0) {
    const firstOffer = Number(Object.keys(state.offers)[0])
    const firstBid = Number(Object.keys(state.bids)[0])
    const offerQuoteAmount = Number(state.offers[firstOffer].quote.quoteAmount)
    const bidQuoteAmount = Number(state.bids[firstBid].quote.quoteAmount)
    // A degenerate router quote (e.g. an illiquid/thin route) can come back with
    // quoteAmount 0 — dividing by it produced midPrice/midRange = Infinity, which then
    // flowed into state.midPrice -> state.minPrice/maxPrice -> initPriceDecimals's
    // visibleFrom/visibleTo and threw deep in calculateDistribution's tick walk
    // ("[BigNumber Error] Argument out of range: Infinity"). Treat such a quote as
    // unusable, same as having no quotes at all, so callers fall back to the next price
    // source instead of locking in a non-finite mid price.
    if (!(offerQuoteAmount > 0) || !(bidQuoteAmount > 0)) return null

    const bestOffer =
      ((Number(state.offers[firstOffer].amount) / offerQuoteAmount) *
        10 ** state.pair.asset.decimals) /
      10 ** state.pair.currency.decimals
    const bestBid =
      ((Number(state.bids[firstBid].amount) / bidQuoteAmount) * 10 ** state.pair.asset.decimals) /
      10 ** state.pair.currency.decimals

    const midPrice = (bestBid + bestOffer) / 2
    const midRange = bestOffer - bestBid
    if (!Number.isFinite(midPrice) || !Number.isFinite(midRange)) return null

    return { midPrice, midRange }
  }
  return null
}
export default calculateMidAndRange
