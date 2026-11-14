import { type IState } from '@/stores/app'
import delay from '../common/delay'
import { marketOrderAmount, orderSwapRequest } from '../swap/swapQuote'
import { createNetworkDepthQuoter, type DepthQuoter } from '../swap/depthQuotes'

/**
 * Offer side of the market depth: how much asset `baseAmount` of the currency buys (a buy,
 * fixed input). Biatec Router first, Folks Router as fallback (see `createDepthQuoter`).
 */
const fetchOffers = async (
  state: IState,
  quote: DepthQuoter = createNetworkDepthQuoter(state.env)
) => {
  try {
    for (const baseAmount of state.pair.asset.quotes) {
      // The row amount is a currency amount, so it scales with the currency's decimals.
      const amountOffer1 = marketOrderAmount(baseAmount, state.pair.currency.decimals)
      const quoteOffer1 = await quote(
        orderSwapRequest('buy', amountOffer1, state.pair.asset.assetId, state.pair.currency.assetId)
      )
      await delay(200)
      if (quoteOffer1) {
        state.offers[baseAmount] = { baseAmount, amount: amountOffer1, quote: quoteOffer1 }
      }
    }
  } catch (exc) {
    console.error(exc)
    throw exc
  }
}

export default fetchOffers
