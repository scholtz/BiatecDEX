import type { ISymbolPair } from '@/interface/ISymbolPair'

/** A symbol pair as shown next to price fields: "ALGO/USDC". The one place for the format. */
export const pairLabel = (pair: ISymbolPair): string =>
  `${pair.asset.symbol}/${pair.currency.symbol}`
