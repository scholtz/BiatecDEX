/**
 * A deposit can never exceed what the account currently holds. After a liquidity change (a
 * deposit, a withdrawal, a swap) the balance moves; a deposit amount typed earlier may then be
 * higher than what is left and must come down to the new maximum. Amounts within the balance
 * (allowing floating point dust) are returned unchanged so nothing is rewritten needlessly.
 */
const EPSILON = 1e-9

export const clampDepositToBalance = (deposit: number, balance: number): number => {
  const max = Number.isFinite(balance) && balance > 0 ? balance : 0
  if (Number.isNaN(deposit) || deposit <= 0) return 0
  return deposit > max + EPSILON ? max : deposit
}
