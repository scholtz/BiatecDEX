import { type IState } from '@/stores/app'
import { createNetworkDepthQuoter, type DepthQuoter } from '../swap/depthQuotes'
import fetchDepthSide from './fetchDepthSide'

/**
 * Bid side of the market depth: how much asset must be sold to receive exactly `baseAmount`
 * of the currency (a sell, fixed output). Biatec Router first, Folks Router as fallback
 * (see `createDepthQuoter`); pass the refresh's shared quoter so both sides share its
 * router-outage memo.
 */
const fetchBids = (state: IState, quote: DepthQuoter = createNetworkDepthQuoter(state.env)) =>
  fetchDepthSide(state, 'sell', quote, (s) => s.bids)

export default fetchBids
