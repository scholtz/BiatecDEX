import type { SwapMode, SwapParams } from '@folks-router/js-sdk'
import getFolksClient from './getFolksClient'
/**
 * Fetch Folks Router Quotes
 *
 * @param amount
 * @param fromAssetId
 * @param toAssetId
 * @param swapMode
 * @param env
 * @returns
 */
const fetchFolksRouterQuotes = async (
  amount: bigint,
  fromAssetId: number,
  toAssetId: number,
  swapMode: 'FIXED_INPUT' | 'FIXED_OUTPUT',
  env: string
) => {
  const folksRouterClient = getFolksClient(env)
  if (!folksRouterClient) throw Error('Unable to create folks router client for specified network')
  const fromAsset = fromAssetId > 0 ? fromAssetId : 0
  const toAsset = toAssetId > 0 ? toAssetId : 0
  const swapParams: SwapParams = {
    fromAssetId: fromAsset,
    toAssetId: toAsset,
    amount: amount,
    swapMode: swapMode as SwapMode
  }

  return await folksRouterClient.fetchSwapQuote(
    swapParams,
    15, // max group size
    10, // feeBps
    'AWALLETCPHQPJGCZ6AHLIFPHWBHUEHQ7VBYJVVGQRRY4MEIGWUBKCQYP4Y'
  )
}

export default fetchFolksRouterQuotes
