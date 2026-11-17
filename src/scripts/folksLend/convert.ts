/**
 * Pure fixed-point maths for converting between an underlying asset (USDC) and its Folks
 * Finance deposit token (fUSDC). Mirrors the official SDK's calcDepositReturn /
 * calcWithdrawReturn (both floor), so the amounts shown are never higher than what the pool
 * contract pays out. No Vue, no store, no network (ported from Biatec Wallet).
 */

/** The pool's deposit interest index has 14 decimals of precision. */
export const ONE_14_DP = 10n ** 14n

/** `deposit`: USDC -> fUSDC. `withdraw`: fUSDC -> USDC. */
export type FolksLendDirection = 'deposit' | 'withdraw'

const assertIndex = (depositIndex: bigint): void => {
  if (depositIndex <= 0n) throw new Error('Invalid deposit interest index')
}

/** fToken received for depositing `amount` of the underlying asset (base units). */
export const calcFAssetReceived = (amount: bigint, depositIndex: bigint): bigint => {
  assertIndex(depositIndex)
  return (amount * ONE_14_DP) / depositIndex
}

/** Underlying asset received for redeeming `fAmount` of the fToken (base units). */
export const calcUnderlyingReceived = (fAmount: bigint, depositIndex: bigint): bigint => {
  assertIndex(depositIndex)
  return (fAmount * depositIndex) / ONE_14_DP
}

/** Amount received for the chosen direction, in base units of the output asset. */
export const calcFolksLendReceived = (
  direction: FolksLendDirection,
  amount: bigint,
  depositIndex: bigint
): bigint =>
  direction === 'deposit'
    ? calcFAssetReceived(amount, depositIndex)
    : calcUnderlyingReceived(amount, depositIndex)

/** Underlying asset per 1 fToken, as a plain number for display (e.g. 1.0423). */
export const exchangeRate = (depositIndex: bigint): number =>
  Number(depositIndex) / Number(ONE_14_DP)

/**
 * A user-entered decimal amount in base units, without float surprises (0.1 + 0.2 style).
 * 0n for a missing, non-positive or non-finite input; digits beyond `decimals` are rounded by
 * `toFixed` (the amount field does not accept more digits than the asset has).
 */
export const toBaseUnits = (value: number | null | undefined, decimals: number): bigint => {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) return 0n
  const [whole, frac = ''] = value.toFixed(decimals).split('.')
  return BigInt(whole + frac.padEnd(decimals, '0').slice(0, decimals))
}

/** Base units as a decimal number, for a number field or an approximate display. */
export const fromBaseUnits = (value: bigint, decimals: number): number =>
  Number(value) / 10 ** decimals

/**
 * Base units as an exact decimal string ("1234.5", "0.000001"), trailing zeros removed. Token
 * amounts keep the asset's full precision (see CLAUDE.md "Number display").
 */
export const formatBaseUnits = (value: bigint, decimals: number): string => {
  const negative = value < 0n
  const digits = (negative ? -value : value).toString().padStart(decimals + 1, '0')
  const whole = digits.slice(0, digits.length - decimals)
  const frac = decimals > 0 ? digits.slice(digits.length - decimals).replace(/0+$/, '') : ''
  return `${negative ? '-' : ''}${whole}${frac ? `.${frac}` : ''}`
}
