import { type IState } from '@/stores/app'
import delay from '../common/delay'
import { marketOrderAmount, orderSwapRequest } from '../swap/swapQuote'
import { createNetworkDepthQuoter, type DepthQuoter } from '../swap/depthQuotes'

/**
 * Bid side of the market depth: how much asset must be sold to receive exactly `baseAmount`
 * of the currency (a sell, fixed output). Biatec Router first, Folks Router as fallback
 * (see `createDepthQuoter`); pass the refresh's shared quoter so both sides share its
 * router-outage memo.
 */
const fetchBids = async (
  state: IState,
  quote: DepthQuoter = createNetworkDepthQuoter(state.env)
) => {
  try {
    // The refresh belongs to the network and pair it started with: a switch meanwhile ends it,
    // so rows quoted for the old pair never land in the new pair's book.
    const env = state.env
    const assetId = state.pair.asset.assetId
    const currencyId = state.pair.currency.assetId
    const stale = () =>
      state.env !== env ||
      state.pair.asset.assetId !== assetId ||
      state.pair.currency.assetId !== currencyId
    for (const baseAmount of state.pair.asset.quotes) {
      if (stale()) break
      // The row amount is a currency amount, so it scales with the currency's decimals.
      const amountBid1 = marketOrderAmount(baseAmount, state.pair.currency.decimals)
      const quoteBid1 = await quote(
        orderSwapRequest('sell', amountBid1, state.pair.asset.assetId, state.pair.currency.assetId)
      )
      if (quoteBid1 && !stale()) {
        state.bids[baseAmount] = { baseAmount, amount: amountBid1, quote: quoteBid1 }
      }
      await delay(200)
    }
  } catch (exc) {
    console.error(exc)
    throw exc
  }
}
export default fetchBids
