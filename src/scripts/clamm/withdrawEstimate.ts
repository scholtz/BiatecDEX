/**
 * Preview of what removing liquidity pays out, mirroring the pool contract's
 * `removeLiquidity` / `payOutLiquidity`: the LP tokens (6 decimals) are scaled to the
 * contract's 9-decimal base, topped up with the sender's pro-rata share of the fee
 * liquidity (`liquidityUsersFromFees`, shared over `releasedLiquidity`), and that
 * liquidity share of each base-scale pool balance is paid out, floored to the asset's
 * own decimals. Pure module (no Vue, no network).
 */

/** Contract base scale is 9 decimals, the LP token has 6: 10^(9 - 6). */
export const LP_SCALE = 1000n
const BASE_DECIMALS = 9

export interface WithdrawPoolState {
  /** AmmStatus.assetABalance / assetBBalance: pool balances in the 9-decimal base scale. */
  assetABalance: bigint
  assetBBalance: bigint
  /** AmmStatus.currentLiquidity. */
  currentLiquidity: bigint
  /** AmmStatus.releasedLiquidity: the liquidity held by LP token holders (fee share base). */
  releasedLiquidity: bigint
  /** AmmStatus.liquidityUsersFromFees. */
  liquidityUsersFromFees: bigint
}

export interface WithdrawEstimate {
  /** Smallest units of asset A / B the withdrawal pays out. */
  amountA: bigint
  amountB: bigint
}

const baseToAsset = (baseAmount: bigint, decimals: number): bigint => {
  // Pools run in a 9-decimal base scale: other precisions cannot be previewed, never guessed.
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > BASE_DECIMALS) {
    throw new RangeError(`Unsupported asset decimals: ${decimals}`)
  }
  return baseAmount / 10n ** BigInt(BASE_DECIMALS - decimals)
}

export const estimateWithdrawal = (
  lpAmount: bigint,
  pool: WithdrawPoolState,
  decimalsA: number,
  decimalsB: number
): WithdrawEstimate => {
  if (lpAmount <= 0n || pool.currentLiquidity <= 0n) return { amountA: 0n, amountB: 0n }
  const lpBase = lpAmount * LP_SCALE
  const feeShare =
    pool.releasedLiquidity > 0n
      ? (pool.liquidityUsersFromFees * lpBase) / pool.releasedLiquidity
      : 0n
  const liquidity = lpBase + feeShare
  return {
    amountA: baseToAsset((pool.assetABalance * liquidity) / pool.currentLiquidity, decimalsA),
    amountB: baseToAsset((pool.assetBBalance * liquidity) / pool.currentLiquidity, decimalsB)
  }
}

/** Smallest units to a number of whole tokens (for display / USD valuation only). */
export const toWholeUnits = (amount: bigint, decimals: number): number =>
  Number(amount) / 10 ** Math.max(0, decimals)

/** USD value of an amount, or null when the asset has no usable USD price. */
export const usdValue = (
  amount: bigint,
  decimals: number,
  priceUsd: number | null | undefined
): number | null =>
  typeof priceUsd === 'number' && Number.isFinite(priceUsd) && priceUsd > 0
    ? toWholeUnits(amount, decimals) * priceUsd
    : null
