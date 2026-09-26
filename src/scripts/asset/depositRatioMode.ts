import { amountsInPriceRange } from '@/scripts/clamm/poolTvlDistribution'

/**
 * Classifies how the two deposit fields' "lock ratio" checkbox should relate
 * depositAssetAmount/depositCurrencyAmount for the user's current price-range
 * selection, so a naive `currency = asset * midPrice` is never applied where it
 * would misallocate a thin, price-adjacent bin (see module doc below).
 *
 * - `price` — the range has full bins on BOTH sides of the mid price (at least one
 *   bin entirely below it and one entirely above it). Locking to the market price is
 *   the right heuristic here: both sides get genuinely independent bins to fill.
 * - `tick` — the range includes the bin straddling the mid price, and every OTHER
 *   selected bin (if any) is on the same one side — including the single-bin case,
 *   where the sole selected bin IS the straddling bin. Either way, that one specific
 *   bin is the *only* place where both assets are actually usable, and its own
 *   reserve ratio — not the market price — is what avoids creating an arbitrage
 *   opportunity (see `tickRatioFor`'s doc comment).
 * - `asset-only` / `currency-only` — every selected bin (whether one or many) sits
 *   fully on one side of the mid price with NO straddling bin at all, so the other
 *   asset cannot be deposited anywhere in the range; callers must force it to zero
 *   rather than lock a ratio.
 */
export type DepositRatioMode =
  | { kind: 'price' }
  | { kind: 'tick'; bin: { from: number; to: number } }
  | { kind: 'asset-only' }
  | { kind: 'currency-only' }

/**
 * @param binsMin/binsMax - the distribution grid's bin boundaries (same indexing as
 *   `state.distribution.min`/`.max`), as plain numbers.
 * @param lowIndex/highIndex - the selected bin range (`state.prices`), inclusive.
 * @param midPrice - the current mid price.
 */
export const classifyDepositRatioMode = (
  binsMin: readonly number[],
  binsMax: readonly number[],
  lowIndex: number,
  highIndex: number,
  midPrice: number
): DepositRatioMode => {
  if (
    !Number.isFinite(midPrice) ||
    midPrice <= 0 ||
    !Number.isInteger(lowIndex) ||
    !Number.isInteger(highIndex) ||
    lowIndex < 0 ||
    highIndex < lowIndex ||
    highIndex >= binsMin.length ||
    highIndex >= binsMax.length
  ) {
    return { kind: 'price' }
  }

  let straddleIndex = -1
  let hasBelow = false
  let hasAbove = false
  for (let i = lowIndex; i <= highIndex; i++) {
    const from = binsMin[i]
    const to = binsMax[i]
    if (!(to > from)) continue
    if (from <= midPrice && midPrice < to) {
      straddleIndex = i
    } else if (to <= midPrice) {
      hasBelow = true
    } else if (from >= midPrice) {
      hasAbove = true
    }
  }

  if (straddleIndex === -1) {
    if (hasAbove && !hasBelow) return { kind: 'asset-only' }
    if (hasBelow && !hasAbove) return { kind: 'currency-only' }
    // Both/neither shouldn't happen for a contiguous range without a straddling bin;
    // fall back to the safe default rather than guess.
    return { kind: 'price' }
  }
  if (hasBelow && hasAbove) return { kind: 'price' }
  return { kind: 'tick', bin: { from: binsMin[straddleIndex], to: binsMax[straddleIndex] } }
}

/**
 * The real (Uniswap-v3-style) asset:currency ratio required to add liquidity to a
 * single bin `[from, to)` at `midPrice`, for one unit of liquidity — i.e. the ratio a
 * deposit into *just this bin* must respect to match what the bin's own reserves
 * would look like, so it doesn't shift the pool's effective price (an arbitrage
 * opportunity: e.g. a bin `[0.1, 0.2]` at a mid price of `0.12` sits close to its low
 * edge, so — like any Uniswap-v3-style position as price approaches pMin — it holds
 * mostly the asset side and only a little of the currency side (at price === pMin it
 * would be 100% asset); `currency = asset * midPrice` ignores where in the bin the
 * price actually sits and overstates how much currency that bin can absorb).
 *
 * Prefer an existing pool's actual on-chain reserves at this exact bin when one is
 * available (callers should check that first); this is the theoretical fallback for
 * a bin with no pool yet, or when actual reserves are unusable.
 */
export const tickRatioFor = (
  bin: { from: number; to: number },
  midPrice: number
): { asset: number; currency: number } => amountsInPriceRange(1, midPrice, bin.from, bin.to)
