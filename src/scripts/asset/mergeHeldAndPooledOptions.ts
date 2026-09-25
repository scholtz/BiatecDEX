/**
 * Merge a wallet's held-asset selector options with every other asset that
 * has an existing pool but isn't held, so a user can start a new position in
 * an asset they don't hold yet (see CLAUDE.md "Pair-driven asset selection").
 * Held assets are listed first (alphabetically), pooled-but-unheld assets
 * after (also alphabetically) — two separately-sorted groups concatenated,
 * not one flat alphabetical sort, so the grouping survives sorting.
 */
export interface AssetSelectOption {
  assetId: number
  label: string
}

export function mergeHeldAndPooledOptions<T extends AssetSelectOption>(
  heldOptions: T[],
  pooledAssetIds: Iterable<number>,
  resolveOption: (assetId: number) => T | null
): T[] {
  const heldIds = new Set(heldOptions.map((o) => o.assetId))
  const sortedHeld = [...heldOptions].sort((a, b) => a.label.localeCompare(b.label))

  const seenUnheld = new Set<number>()
  const unheld: T[] = []
  for (const assetId of pooledAssetIds) {
    if (heldIds.has(assetId) || seenUnheld.has(assetId)) continue
    seenUnheld.add(assetId)
    const option = resolveOption(assetId)
    if (option) unheld.push(option)
  }
  unheld.sort((a, b) => a.label.localeCompare(b.label))

  return [...sortedHeld, ...unheld]
}
