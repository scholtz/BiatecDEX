import { snapPriceToTick, type TickType } from 'biatec-concentrated-liquidity-amm'

/**
 * The tick width a wall pool (a single-price order) belongs to: the widest width whose
 * canonical grid has a boundary exactly at the wall's price - i.e. the width on which other
 * liquidity providers' bins line up with it. `types` must be ordered widest first
 * (`TICK_TYPES`). Returns null for unusable prices and for prices on no grid.
 *
 * Kept apart from tickTypeStats.ts, which is deliberately free of the package dependency.
 */
export const classifyWallPrice = (price: number, types: readonly TickType[]): TickType | null => {
  if (!Number.isFinite(price) || !(price > 0)) return null
  for (const type of types) {
    const snapped = snapPriceToTick(price, type)
    // Relative tolerance: on-grid input round-trips through the grid's decimal arithmetic.
    if (snapped > 0 && Math.abs(snapped - price) <= price * 1e-9) return type
  }
  return null
}
