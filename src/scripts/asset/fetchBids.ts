import { type IState } from '@/stores/app'
import fetchFolksRouterQuotes from '../folks/fetchFolksRouterQuotes'
import { SwapMode } from '@folks-router/js-sdk'
import delay from '../common/delay'
import { tokenAmountToBigInt } from '../common/safeBigInt'

const fetchBids = async (state: IState) => {
  try {
    for (const baseAmount of state.pair.asset.quotes) {
      const amountBid1 = tokenAmountToBigInt(baseAmount, state.pair.asset.decimals)
      const quoteBid1 = await fetchFolksRouterQuotes(
        amountBid1,
        state.pair.asset.assetId,
        state.pair.currency.assetId,
        SwapMode.FIXED_OUTPUT,
        state.env
      )
      if (quoteBid1) {
        state.bids[baseAmount] = { baseAmount, amount: amountBid1, quote: quoteBid1 }
      }
      await delay(200)
    }
  } catch (exc: any) {
    console.error(exc)
    throw exc
  }
}
export default fetchBids
