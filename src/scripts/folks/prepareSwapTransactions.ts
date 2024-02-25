import type { SwapMode, SwapParams, SwapQuote } from '@folks-router/js-sdk'
import getFolksClient from './getFolksClient'
/**
 * Returns quote txs
 *
 * @param amount
 * @param fromAssetId
 * @param toAssetId
 * @param swapMode
 * @param userAddress
 * @param slippageBps
 * @param swapQuote
 * @param env
 * @returns
 */
const prepareSwapTransactions = async (
  amount: bigint,
  fromAssetId: number,
  toAssetId: number,
  swapMode: 'FIXED_INPUT' | 'FIXED_OUTPUT',
  userAddress: string,
  slippageBps: number | bigint,
  swapQuote: SwapQuote,
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

  return await folksRouterClient.prepareSwapTransactions(
    swapParams,
    userAddress,
    slippageBps,
    swapQuote
  )
}

export default prepareSwapTransactions
