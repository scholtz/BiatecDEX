
import { useAppStore } from '@/stores/app'
import fetchFolksRouterQuotes from '../folks/fetchFolksRouterQuotes'
const store = useAppStore()

const fetchBids = async () => {
  try {
    for (const baseAmount of store.state.pair.asset.quotes) {
      const amountBid1 = BigInt(baseAmount * 10 ** store.state.pair.asset.decimals)
      const quoteBid1 = await fetchFolksRouterQuotes(
        amountBid1,
        store.state.pair.asset.assetId,
        store.state.pair.currency.assetId,
        SwapMode.FIXED_OUTPUT,
        store.state.env
      )
      if (quoteBid1) {
        state.bids[baseAmount] = { baseAmount, amount: amountBid1, quote: quoteBid1 }
      }
      await delay(200)
    }
  } catch (exc: any) {
    console.error(exc)
    toast.add({
      severity: 'error',
      detail: exc.message ?? exc,
      life: 5000
    })
  }
}
export default fetchBids