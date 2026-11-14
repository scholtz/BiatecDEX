import type { SwapQuote } from '@folks-router/js-sdk'
import type { ISwapQuote } from '@/interface/ISwapQuote'
import fetchFolksRouterQuotes from './fetchFolksRouterQuotes'
import { folksQuoteToSwapQuote, type SwapRequest } from '@/scripts/swap/swapQuote'

/** A Folks quote in the router-neutral shape, plus the raw quote its transactions need. */
export interface FolksSwapQuote {
  quote: ISwapQuote
  raw: SwapQuote
}

/** Folks Router quote for a swap; throws when Folks has no quote (or no client for `env`). */
const fetchFolksSwapQuote = async (env: string, request: SwapRequest): Promise<FolksSwapQuote> => {
  const raw = await fetchFolksRouterQuotes(
    request.amount,
    request.fromAssetId,
    request.toAssetId,
    request.swapMode,
    env
  )
  if (!raw) throw Error('Folks Router returned no quote')
  return { quote: folksQuoteToSwapQuote(raw, request), raw }
}

export default fetchFolksSwapQuote
