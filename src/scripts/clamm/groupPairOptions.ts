/** Minimal shape the grouping needs; the dropdown's richer option type extends it. */
export interface GroupablePair {
  assetCode: string
  currencyCode: string
}

export type PairGroupKey = 'asset' | 'currency' | 'other'

export interface PairGroup<T extends GroupablePair> {
  key: PairGroupKey
  items: T[]
}

/**
 * Splits pairs into up to three groups, in this order:
 *  1. pairs containing the selected asset (either side) — includes the selected pair itself
 *  2. pairs containing the selected currency (and not the asset)
 *  3. every other pair
 * The relative order inside a group is the input order (most liquid first). Empty groups are
 * omitted so the dropdown never shows a heading without entries. A missing/empty selection code
 * matches nothing, and when both codes are equal the currency group stays empty.
 */
export function groupPairOptions<T extends GroupablePair>(
  pairs: readonly T[],
  assetCode: string | undefined,
  currencyCode: string | undefined
): PairGroup<T>[] {
  const asset: T[] = []
  const currency: T[] = []
  const other: T[] = []
  for (const pair of pairs) {
    const has = (code: string | undefined) =>
      !!code && (pair.assetCode === code || pair.currencyCode === code)
    if (has(assetCode)) asset.push(pair)
    else if (has(currencyCode)) currency.push(pair)
    else other.push(pair)
  }
  const groups: PairGroup<T>[] = [
    { key: 'asset', items: asset },
    { key: 'currency', items: currency },
    { key: 'other', items: other }
  ]
  return groups.filter((g) => g.items.length > 0)
}
