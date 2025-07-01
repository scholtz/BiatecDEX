import { type IState } from '@/stores/app'
import fetchFolksRouterQuotes from '../folks/fetchFolksRouterQuotes'
import { SwapMode } from '@folks-router/js-sdk'
import delay from '../common/delay'
import { tokenAmountToBigInt } from '../common/safeBigInt'

const fetchOffers = async (state: IState) => {
  try {
    for (const baseAmount of state.pair.asset.quotes) {
      const amountOffer1 = tokenAmountToBigInt(baseAmount, state.pair.asset.decimals)
      const quoteOffer1 = await fetchFolksRouterQuotes(
        amountOffer1,
        state.pair.currency.assetId,
        state.pair.asset.assetId,
        SwapMode.FIXED_INPUT,
        state.env
      )
      await delay(200)
      if (quoteOffer1) {
        state.offers[baseAmount] = { baseAmount, amount: amountOffer1, quote: quoteOffer1 }
      }
    }
  } catch (exc: any) {
    console.error(exc)
    throw exc
  }
}

export default fetchOffers
