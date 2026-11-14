import { type IState } from '@/stores/app'
import { createNetworkDepthQuoter, type DepthQuoter } from '../swap/depthQuotes'
import fetchDepthSide from './fetchDepthSide'

/**
 * Offer side of the market depth: how much asset `baseAmount` of the currency buys (a buy,
 * fixed input). Biatec Router first, Folks Router as fallback (see `createDepthQuoter`).
 */
const fetchOffers = (state: IState, quote: DepthQuoter = createNetworkDepthQuoter(state.env)) =>
  fetchDepthSide(state, 'buy', quote, (s) => s.offers)

export default fetchOffers
