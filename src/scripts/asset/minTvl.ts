/** Assets with total TVL at or below this USD amount are hidden from Explore Assets. */
export const MIN_ASSET_TVL_USD = 100

/** True when the asset's total TVL is strictly above the Explore Assets minimum. */
export const hasMinimumTvl = (totalTvlUsd: number): boolean =>
  Number.isFinite(totalTvlUsd) && totalTvlUsd > MIN_ASSET_TVL_USD
