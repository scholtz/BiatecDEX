// Withdrawal form: which quick button (1/2/10/25/50/75 or Max = 100) matches the percent.
export const QUICK_PERCENTS = [1, 2, 10, 25, 50, 75] as const
export const MAX_WITHDRAW_PERCENT = 100

const EPSILON = 1e-6

/** True when `percent` equals `button` (float noise from slider/input tolerated). */
export const isQuickPercentActive = (percent: number, button: number): boolean =>
  Number.isFinite(percent) && Math.abs(percent - button) < EPSILON
