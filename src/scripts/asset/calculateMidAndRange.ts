import { type IState } from '@/stores/app'

const calculateMidAndRange = (state: IState) => {
  if (Object.values(state.offers).length > 0 && Object.values(state.bids).length > 0) {
    const firstOffer = Number(Object.keys(state.offers)[0])
    const firstBid = Number(Object.keys(state.bids)[0])
    const bestOffer =
      ((Number(state.offers[firstOffer].amount) /
        Number(state.offers[firstOffer].quote.quoteAmount)) *
        10 ** state.pair.asset.decimals) /
      10 ** state.pair.currency.decimals
    const bestBid =
      ((Number(state.bids[firstBid].amount) / Number(state.bids[firstBid].quote.quoteAmount)) *
        10 ** state.pair.asset.decimals) /
      10 ** state.pair.currency.decimals

    return { midPrice: (bestBid + bestOffer) / 2, midRange: bestOffer - bestBid }
  }
  return null
}
export default calculateMidAndRange
