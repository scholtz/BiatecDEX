import BigNumber from 'bignumber.js'

/**
 * Biatec Scan style number formatting (shared by prices, USD values and amounts):
 *
 * - at least 4 significant digits:      0.12345 -> 0.1234, 12.3456 -> 12.34, 1.23456 -> 1.234
 * - many leading zeros -> subscript:     0.0000001234 -> 0.0<sub>6</sub>1234
 * - 5 integer digits and more drop the decimals: 82396.73 -> 82396
 * - very large numbers are abbreviated:  12345678 -> 12345k, 1234567890 -> 1234M,
 *                                        1234567890123 -> 1234B
 *
 * Digits are truncated, never rounded up, so a shown figure is never above the real value.
 * Use `formatSmartNumber` for plain strings (uses unicode subscript digits) and the
 * `FormattedNumber.vue` component where a real `<sub>` can be rendered.
 */

export type SmartNumberInput = number | bigint | string | null | undefined

export interface SmartNumberOptions {
  /** BCP 47 locale used for the decimal separator. Defaults to the runtime locale. */
  locale?: string
  /** Minimum significant digits shown. Default 4. */
  significantDigits?: number
  /** Trailing zeros are trimmed down to this many fraction digits. Default 2. */
  minFractionDigits?: number
}

export type SmartNumberSuffix = '' | 'k' | 'M' | 'B'

export interface SmartNumberParts {
  /** '-' for negative values, otherwise empty. */
  sign: string
  /** Integer part (`'0'` for values below one). */
  integer: string
  /** Number of zeros after the decimal point to render as a subscript, if any. */
  zeros?: number
  /** Digits after the decimal point (after the zeros when `zeros` is set). */
  fraction: string
  suffix: SmartNumberSuffix
  decimalSeparator: string
}

const DEFAULT_SIGNIFICANT_DIGITS = 4
const DEFAULT_MIN_FRACTION_DIGITS = 2
/** From this magnitude on the decimals are dropped (5 integer digits). */
const NO_DECIMALS_FROM = new BigNumber(1e5)
/** Below this magnitude the leading zeros collapse into a subscript count. */
const SUBSCRIPT_BELOW = new BigNumber(0.01)
const SUBSCRIPT_DIGITS = '₀₁₂₃₄₅₆₇₈₉'

const ABBREVIATIONS: ReadonlyArray<{
  from: BigNumber
  divisor: BigNumber
  suffix: SmartNumberSuffix
}> = [
  { from: new BigNumber(1e11), divisor: new BigNumber(1e9), suffix: 'B' },
  { from: new BigNumber(1e8), divisor: new BigNumber(1e6), suffix: 'M' },
  { from: NO_DECIMALS_FROM, divisor: new BigNumber(1e3), suffix: 'k' }
]

const decimalSeparatorCache = new Map<string, string>()

const decimalSeparatorFor = (locale: string | undefined): string => {
  const key = locale ?? ''
  const cached = decimalSeparatorCache.get(key)
  if (cached !== undefined) return cached
  let separator = '.'
  try {
    separator =
      new Intl.NumberFormat(locale).formatToParts(1.1).find((p) => p.type === 'decimal')?.value ??
      '.'
  } catch {
    // An unknown locale tag makes Intl throw a RangeError; the English separator is the safe default.
  }
  decimalSeparatorCache.set(key, separator)
  return separator
}

/** Removes trailing zeros but keeps at least `keep` fraction digits. */
const trimFraction = (fraction: string, keep: number): string => {
  let end = fraction.length
  while (end > keep && fraction[end - 1] === '0') end--
  return fraction.slice(0, end)
}

export const toSubscript = (n: number): string =>
  String(Math.max(0, Math.trunc(n)))
    .split('')
    .map((digit) => SUBSCRIPT_DIGITS[Number(digit)])
    .join('')

/** Splits a value into the pieces needed to render it; `null` when it is not a finite number. */
export const formatSmartNumberParts = (
  value: SmartNumberInput,
  options: SmartNumberOptions = {}
): SmartNumberParts | null => {
  if (value === null || value === undefined || value === '') return null
  let bn: BigNumber
  try {
    bn = new BigNumber(value.toString())
  } catch {
    // BigNumber throws on non numeric strings such as 'abc'; those are simply not numbers.
    return null
  }
  if (!bn.isFinite()) return null

  const significant = Math.max(
    1,
    Math.trunc(options.significantDigits ?? DEFAULT_SIGNIFICANT_DIGITS)
  )
  const minFraction = Math.max(
    0,
    Math.trunc(options.minFractionDigits ?? DEFAULT_MIN_FRACTION_DIGITS)
  )
  const decimalSeparator = decimalSeparatorFor(options.locale)
  const abs = bn.abs()
  const sign = bn.isNegative() && !abs.isZero() ? '-' : ''
  const base = { sign, decimalSeparator }

  if (abs.isZero()) return { ...base, integer: '0', fraction: '', suffix: '' }

  const abbreviation = ABBREVIATIONS.find((a) => abs.isGreaterThanOrEqualTo(a.from))
  if (abbreviation) {
    const scaled = abs.dividedBy(abbreviation.divisor).integerValue(BigNumber.ROUND_DOWN)
    return { ...base, integer: scaled.toFixed(0), fraction: '', suffix: abbreviation.suffix }
  }

  if (abs.isGreaterThanOrEqualTo(1)) {
    const integerDigits = abs.integerValue(BigNumber.ROUND_DOWN).toFixed(0).length
    const decimals = Math.max(0, significant - integerDigits)
    const [integer = '0', fraction = ''] = abs
      .decimalPlaces(decimals, BigNumber.ROUND_DOWN)
      .toFixed(decimals)
      .split('.')
    return {
      ...base,
      integer,
      fraction: trimFraction(fraction, Math.min(minFraction, decimals)),
      suffix: ''
    }
  }

  // 0 < abs < 1; `e` is the base-10 exponent, so 0.00123 has e = -3 and two leading zeros.
  const exponent = abs.e ?? 0
  const zeros = -exponent - 1

  if (abs.isGreaterThanOrEqualTo(SUBSCRIPT_BELOW)) {
    const decimals = zeros + significant
    const fraction =
      abs.decimalPlaces(decimals, BigNumber.ROUND_DOWN).toFixed(decimals).split('.')[1] ?? ''
    return { ...base, integer: '0', fraction: trimFraction(fraction, minFraction), suffix: '' }
  }

  const digits = abs
    .shiftedBy(-exponent)
    .decimalPlaces(significant - 1, BigNumber.ROUND_DOWN)
    .toFixed(significant - 1)
    .replace('.', '')
  return { ...base, integer: '0', zeros, fraction: trimFraction(digits, 1), suffix: '' }
}

/** Plain-text rendering of the parts; the zero count uses unicode subscript digits. */
export const smartNumberPartsToString = (parts: SmartNumberParts): string => {
  const { sign, integer, zeros, fraction, suffix, decimalSeparator } = parts
  if (zeros !== undefined) {
    return `${sign}${integer}${decimalSeparator}0${toSubscript(zeros)}${fraction}${suffix}`
  }
  const tail = fraction ? `${decimalSeparator}${fraction}` : ''
  return `${sign}${integer}${tail}${suffix}`
}

/** Formats a number as plain text, e.g. `0.0₆1234`, `82396`, `12345k`. Returns `fallback` for non-numbers. */
export const formatSmartNumber = (
  value: SmartNumberInput,
  options: SmartNumberOptions & { fallback?: string } = {}
): string => {
  const parts = formatSmartNumberParts(value, options)
  return parts ? smartNumberPartsToString(parts) : (options.fallback ?? 'N/A')
}

/** Locale aware USD affixes: `$` before the number for most locales, ` $` after it for e.g. Slovak. */
export const usdAffixes = (locale?: string): { prefix: string; suffix: string } => {
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).formatToParts(1)
    const currencyIndex = parts.findIndex((p) => p.type === 'currency')
    const integerIndex = parts.findIndex((p) => p.type === 'integer')
    return currencyIndex < integerIndex ? { prefix: '$', suffix: '' } : { prefix: '', suffix: ' $' }
  } catch {
    return { prefix: '$', suffix: '' }
  }
}

/** Same as `formatSmartNumber`, with the dollar sign placed the way the locale expects it. */
export const formatSmartUsd = (
  value: SmartNumberInput,
  options: SmartNumberOptions & { fallback?: string } = {}
): string => {
  const parts = formatSmartNumberParts(value, options)
  if (!parts) return options.fallback ?? 'N/A'
  const { prefix, suffix } = usdAffixes(options.locale)
  const { sign, ...rest } = parts
  // The minus sign goes in front of the currency symbol: -$12.34
  return `${sign}${prefix}${smartNumberPartsToString({ ...rest, sign: '' })}${suffix}`
}
