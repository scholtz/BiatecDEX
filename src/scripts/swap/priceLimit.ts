import type { ISwapQuote } from '@/interface/ISwapQuote'
import { quotePrice, type OrderSide } from './swapQuote'

export interface PriceLimitInput {
  quote: ISwapQuote
  side: OrderSide
  assetDecimals: number
  currencyDecimals: number
  /** The order's limit price (`store.state.price`), currency per asset. */
  limitPrice: number
  /** `store.state.slippage`, basis points. */
  slippageBps: number
  /** `store.state.slippageProtection`; when off the limit is not enforced. */
  slippageProtection: boolean
}

export type PriceLimitResult =
  | { ok: true; price: number | null }
  | {
      ok: false
      code: 'priceTooHigh' | 'priceTooLow'
      currentQuote: number
      limitPrice: number
      slippage: number
    }

/**
 * The market order's limit check, the same for every venue and for the fallback: a buy may
 * not pay more than `limitPrice * (1 + slippage)`, a sell may not receive less than
 * `limitPrice * (1 - slippage)`. Display-unit floats on purpose: the limit is the price the
 * user typed.
 */
export const checkPriceLimit = (input: PriceLimitInput): PriceLimitResult => {
  const price = quotePrice(input.quote, input.side, input.assetDecimals, input.currencyDecimals)
  if (!input.slippageProtection) return { ok: true, price }
  const slippage = input.slippageBps
  if (input.side === 'buy') {
    const limitPrice = input.limitPrice * (1 + slippage / 10000)
    // No asset received (price null) is never within the limit.
    if (price === null || price > limitPrice) {
      return {
        ok: false,
        code: 'priceTooHigh',
        currentQuote: price ?? Number.POSITIVE_INFINITY,
        limitPrice,
        slippage
      }
    }
    return { ok: true, price }
  }
  const limitPrice = input.limitPrice * (1 - slippage / 10000)
  if (price === null || price < limitPrice) {
    return { ok: false, code: 'priceTooLow', currentQuote: price ?? 0, limitPrice, slippage }
  }
  return { ok: true, price }
}
