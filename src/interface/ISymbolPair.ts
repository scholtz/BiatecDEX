/** Anything with an asset and a currency that has a symbol - the shape `pairLabel` formats ("ALGO/USDC"). */
export interface ISymbolPair {
  asset: { symbol: string }
  currency: { symbol: string }
}
