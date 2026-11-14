import type { SwapQuote } from '@folks-router/js-sdk'
import type { ISwapQuote, SwapQuoteMode } from '@/interface/ISwapQuote'
import BigNumber from 'bignumber.js'

/** Market order direction on the trader page: buy the asset with the currency, or sell it. */
export type OrderSide = 'buy' | 'sell'

/** One swap as both routers understand it. `amount` is in base units of the fixed side. */
export interface SwapRequest {
  fromAssetId: number
  toAssetId: number
  amount: bigint
  swapMode: SwapQuoteMode
}

/** ALGO is asset id 0 for both routers (the app may carry it as a negative or missing id). */
export const normalizeAssetId = (assetId: number): number => (assetId > 0 ? assetId : 0)

/**
 * The swap behind a market order. The order quantity is an amount of the **currency** in
 * both directions: a buy spends exactly that much currency (fixed input), a sell receives
 * exactly that much currency (fixed output).
 */
export const orderSwapRequest = (
  side: OrderSide,
  amount: bigint,
  assetId: number,
  currencyId: number
): SwapRequest =>
  side === 'buy'
    ? {
        fromAssetId: normalizeAssetId(currencyId),
        toAssetId: normalizeAssetId(assetId),
        amount,
        swapMode: 'FIXED_INPUT'
      }
    : {
        fromAssetId: normalizeAssetId(assetId),
        toAssetId: normalizeAssetId(currencyId),
        amount,
        swapMode: 'FIXED_OUTPUT'
      }

/**
 * Base units of the market order quantity. The quantity is a currency amount (see
 * `orderSwapRequest`), so it scales with the **currency's** decimals - scaling it with the
 * asset's decimals traded the wrong amount on pairs whose two sides differ in decimals.
 */
export const marketOrderAmount = (quantity: number, currencyDecimals: number): bigint => {
  // Decimal-exact (BigNumber parses the number's shortest decimal form): a float product
  // floors 0.29 * 10 ** 6 = 289999.99999999994 to 289999.
  const scaled = new BigNumber(quantity)
    .shiftedBy(currencyDecimals)
    .integerValue(BigNumber.ROUND_FLOOR)
  return scaled.isFinite() && scaled.gt(0) ? BigInt(scaled.toFixed(0)) : 0n
}

/**
 * Folks `quoteAmount` is the output of a fixed-input quote and the input of a fixed-output
 * quote; the requested amount is the other side.
 */
export const folksQuoteToSwapQuote = (raw: SwapQuote, request: SwapRequest): ISwapQuote => {
  const quoted = BigInt(raw.quoteAmount)
  return {
    source: 'folks',
    swapMode: request.swapMode,
    fromAssetId: request.fromAssetId,
    toAssetId: request.toAssetId,
    inputAmount: request.swapMode === 'FIXED_INPUT' ? request.amount : quoted,
    outputAmount: request.swapMode === 'FIXED_INPUT' ? quoted : request.amount
  }
}

/** Input and output of one Biatec Router leg (an independent transaction group). */
export interface LegAmounts {
  inputAmount: bigint
  outputAmount: bigint
}

/** A Biatec quote is the sum over its legs. */
export const biatecLegsToSwapQuote = (legs: LegAmounts[], request: SwapRequest): ISwapQuote => ({
  source: 'biatec',
  swapMode: request.swapMode,
  fromAssetId: request.fromAssetId,
  toAssetId: request.toAssetId,
  inputAmount: legs.reduce((sum, leg) => sum + leg.inputAmount, 0n),
  outputAmount: legs.reduce((sum, leg) => sum + leg.outputAmount, 0n)
})

/**
 * Price of a quote in currency per asset (display units). A buy sends the currency and
 * receives the asset; a sell sends the asset and receives the currency. Returns null when
 * the asset side is zero (no price).
 *
 * The expression keeps the operation order of the former Folks-only formula
 * `((amount / quoteAmount) * 10 ** assetDecimals) / 10 ** currencyDecimals`, so a Folks quote
 * shows exactly the same number as before.
 */
export const quotePrice = (
  quote: ISwapQuote,
  side: OrderSide,
  assetDecimals: number,
  currencyDecimals: number
): number | null => {
  const currencyAmount = side === 'buy' ? quote.inputAmount : quote.outputAmount
  const assetAmount = side === 'buy' ? quote.outputAmount : quote.inputAmount
  if (assetAmount <= 0n) return null
  return (
    ((Number(currencyAmount) / Number(assetAmount)) * 10 ** assetDecimals) / 10 ** currencyDecimals
  )
}

/** `amount * (10000 - bps) / 10000`, floored, never negative. */
export const reduceByBps = (amount: bigint, bps: bigint): bigint => {
  const factor = 10000n - bps
  return factor <= 0n ? 0n : (amount * factor) / 10000n
}

/** `amount * (10000 + bps) / 10000`, floored. */
export const increaseByBps = (amount: bigint, bps: bigint): bigint =>
  (amount * (10000n + bps)) / 10000n

/** A slippage setting in basis points as a bigint in `[0, 10000]`. */
export const toBps = (value: number): bigint => {
  if (!Number.isFinite(value) || value <= 0) return 0n
  return BigInt(Math.min(10000, Math.floor(value)))
}
