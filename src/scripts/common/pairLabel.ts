/** A symbol pair as shown next to price fields: "ALGO/USDC". The one place for the format. */
export interface SymbolPair {
  asset: { symbol: string }
  currency: { symbol: string }
}

export const pairLabel = (pair: SymbolPair): string =>
  `${pair.asset.symbol}/${pair.currency.symbol}`
