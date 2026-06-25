import type { SwapQuote } from '@folks-router/js-sdk'

export interface IQuoteWithAmount {
  baseAmount: number
  amount: bigint
  quote: SwapQuote
}
