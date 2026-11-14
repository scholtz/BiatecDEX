/** Which side of a swap is fixed: the amount sent (input) or the amount received (output). */
export type SwapQuoteMode = 'FIXED_INPUT' | 'FIXED_OUTPUT'

/** The router that produced a quote. */
export type SwapVenue = 'biatec' | 'folks'

/**
 * Router-neutral swap quote. Amounts are base units: `inputAmount` of `fromAssetId`,
 * `outputAmount` of `toAssetId`. For a fixed-input quote `inputAmount` is the requested
 * amount; for a fixed-output quote `outputAmount` is the amount the route pays (at least
 * the requested one).
 */
export interface ISwapQuote {
  source: SwapVenue
  swapMode: SwapQuoteMode
  fromAssetId: number
  toAssetId: number
  inputAmount: bigint
  outputAmount: bigint
}
