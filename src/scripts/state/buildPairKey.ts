/**
 * Canonical identity for "the pair currently on screen", shared by every
 * writer of `store.state.liquidityTickPrecision` (AddLiquidity.vue,
 * PoolsLiquidityChart.vue) so they all agree on when a stored tick-width
 * precision belongs to the SAME pair vs. a different one — see
 * `resolvePrecisionChoice.ts` and `store.state.liquidityTickPrecisionPairKey`.
 *
 * Includes the network: the same numeric asset id is not globally unique
 * across networks (e.g. ALGO's own id, 0, is reused as the native asset id
 * on every network), so two different chains' pairs could otherwise collide.
 */
export const buildPairKey = (env: string, assetCode: string, currencyCode: string): string =>
  `${env}:${assetCode}:${currencyCode}`
