import { TICK_TYPES, type TickType } from 'biatec-concentrated-liquidity-amm'

/**
 * The liquidity page's shared settings - tick width and LP fee - live in the route query
 * (`?tick=wide&lpFee=1000000`) so a copied URL restores them for every panel at once.
 * These pure helpers parse/validate the params and build the next query; the wiring
 * between route, store and panels is in `composables/useLiquiditySettingsRoute.ts`.
 */

/** Supported base LP fee tiers, scaled by 1e9 (1_000_000n = 0.1 %). */
export const LP_FEE_TIERS: readonly bigint[] = [
  100_000n,
  1_000_000n,
  2_000_000n,
  3_000_000n,
  10_000_000n,
  20_000_000n,
  100_000_000n
]

type QueryValue = string | null | undefined | ReadonlyArray<string | null>

const firstValue = (raw: QueryValue): string | null => {
  const value = Array.isArray(raw) ? raw[0] : raw
  return typeof value === 'string' ? value : null
}

export const parseTickParam = (raw: QueryValue): TickType | null => {
  const value = firstValue(raw)?.trim().toLowerCase()
  return TICK_TYPES.find((type) => type === value) ?? null
}

export const parseLpFeeParam = (raw: QueryValue): bigint | null => {
  const value = firstValue(raw)?.trim()
  if (!value || !/^\d+$/.test(value)) return null
  const parsed = BigInt(value)
  return LP_FEE_TIERS.includes(parsed) ? parsed : null
}
