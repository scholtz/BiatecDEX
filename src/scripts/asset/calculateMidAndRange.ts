import { type IState } from '@/stores/app'
import { quotePrice } from '@/scripts/swap/swapQuote'

const calculateMidAndRange = (state: IState) => {
  if (Object.values(state.offers).length > 0 && Object.values(state.bids).length > 0) {
    const firstOffer = Number(Object.keys(state.offers)[0])
    const firstBid = Number(Object.keys(state.bids)[0])
    const offer = state.offers[firstOffer].quote
    const bid = state.bids[firstBid].quote
    // A degenerate router quote (e.g. an illiquid/thin route) can come back with a zero
    // amount — dividing by it produced midPrice/midRange = Infinity, which then
    // flowed into state.midPrice -> state.minPrice/maxPrice -> initPriceDecimals's
    // visibleFrom/visibleTo and threw deep in calculateDistribution's tick walk
    // ("[BigNumber Error] Argument out of range: Infinity"). Treat such a quote as
    // unusable, same as having no quotes at all, so callers fall back to the next price
    // source instead of locking in a non-finite mid price.
    if (offer.inputAmount <= 0n || offer.outputAmount <= 0n) return null
    if (bid.inputAmount <= 0n || bid.outputAmount <= 0n) return null

    // Offers are buys (currency in, asset out), bids are sells (asset in, currency out).
    const bestOffer = quotePrice(
      offer,
      'buy',
      state.pair.asset.decimals,
      state.pair.currency.decimals
    )
    const bestBid = quotePrice(bid, 'sell', state.pair.asset.decimals, state.pair.currency.decimals)
    if (bestOffer === null || bestBid === null) return null

    const midPrice = (bestBid + bestOffer) / 2
    const midRange = bestOffer - bestBid
    if (!Number.isFinite(midPrice) || !Number.isFinite(midRange)) return null

    return { midPrice, midRange }
  }
  return null
}
export default calculateMidAndRange
