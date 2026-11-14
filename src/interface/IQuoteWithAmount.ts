import type { ISwapQuote } from './ISwapQuote'

/**
 * One market depth row. `amount` is the row's currency amount in base units: the currency
 * paid for an offer (buy, fixed input) and the currency received for a bid (sell, fixed
 * output).
 */
export interface IQuoteWithAmount {
  baseAmount: number
  amount: bigint
  quote: ISwapQuote
}
