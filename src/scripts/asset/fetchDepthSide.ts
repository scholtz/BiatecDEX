import { type IState } from '@/stores/app'
import type { IQuoteWithAmount } from '@/interface/IQuoteWithAmount'
import delay from '../common/delay'
import { marketOrderAmount, orderSwapRequest, type OrderSide } from '../swap/swapQuote'
import type { DepthQuoter } from '../swap/depthQuotes'

/**
 * One side of the market depth, shared by `fetchBids` (sell, fixed output) and `fetchOffers`
 * (buy, fixed input). Each row's amount is a currency amount, so it scales with the
 * currency's decimals. The refresh belongs to the network and pair it started with: a switch
 * meanwhile ends it, so rows quoted for the old pair never land in the new pair's book.
 */
const fetchDepthSide = async (
  state: IState,
  side: OrderSide,
  quote: DepthQuoter,
  book: (state: IState) => Record<number, IQuoteWithAmount>
) => {
  try {
    const env = state.env
    const assetId = state.pair.asset.assetId
    const currencyId = state.pair.currency.assetId
    const stale = () =>
      state.env !== env ||
      state.pair.asset.assetId !== assetId ||
      state.pair.currency.assetId !== currencyId
    for (const baseAmount of state.pair.asset.quotes) {
      if (stale()) break
      const amount = marketOrderAmount(baseAmount, state.pair.currency.decimals)
      const row = await quote(orderSwapRequest(side, amount, assetId, currencyId))
      await delay(200)
      if (row && !stale()) book(state)[baseAmount] = { baseAmount, amount, quote: row }
    }
  } catch (exc) {
    console.error(exc)
    throw exc
  }
}

export default fetchDepthSide
