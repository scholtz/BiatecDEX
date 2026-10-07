import { describe, expect, it } from 'vitest'
import {
  formatSmartNumber,
  formatSmartNumberParts,
  formatSmartUsd
} from '@/scripts/common/formatSmartNumber'

const en = { locale: 'en-US' }

describe('formatSmartNumber', () => {
  it('keeps at least 4 significant digits', () => {
    expect(formatSmartNumber(0.12345678, en)).toBe('0.1234')
    expect(formatSmartNumber(0.1234, en)).toBe('0.1234')
    expect(formatSmartNumber(1.23456, en)).toBe('1.234')
    expect(formatSmartNumber(12.3456, en)).toBe('12.34')
    expect(formatSmartNumber(123.456, en)).toBe('123.4')
    expect(formatSmartNumber(1234.56, en)).toBe('1234')
  })

  it('trims trailing zeros down to two fraction digits', () => {
    expect(formatSmartNumber(0.12, en)).toBe('0.12')
    expect(formatSmartNumber(1.5, en)).toBe('1.50')
    expect(formatSmartNumber(5, en)).toBe('5.00')
    expect(formatSmartNumber(0, en)).toBe('0')
  })

  it('collapses many leading zeros into a subscript count', () => {
    expect(formatSmartNumber(0.0000001234, en)).toBe('0.0₆1234')
    expect(formatSmartNumber(0.00123456, en)).toBe('0.0₂1234')
    expect(formatSmartNumber(0.0000001, en)).toBe('0.0₆1')
    expect(formatSmartNumber(1e-12, en)).toBe('0.0₁₁1')
  })

  it('does not use the subscript form from 0.01 on', () => {
    expect(formatSmartNumber(0.0123456, en)).toBe('0.01234')
  })

  it('drops decimals of big numbers', () => {
    expect(formatSmartNumber(82396.73, en)).toBe('82396')
    expect(formatSmartNumber(99999.99, en)).toBe('99999')
  })

  it('abbreviates very large numbers', () => {
    expect(formatSmartNumber(12345678, en)).toBe('12345k')
    expect(formatSmartNumber(123456, en)).toBe('123k')
    expect(formatSmartNumber(1234567890, en)).toBe('1234M')
    expect(formatSmartNumber(1234567890123, en)).toBe('1234B')
  })

  it('handles signs, bigint and strings', () => {
    expect(formatSmartNumber(-0.0000001234, en)).toBe('-0.0₆1234')
    expect(formatSmartNumber(-82396.73, en)).toBe('-82396')
    expect(formatSmartNumber(12345678901234567890n, en)).toBe('12345678901B')
    expect(formatSmartNumber('0.5', en)).toBe('0.50')
  })

  it('uses the locale decimal separator', () => {
    expect(formatSmartNumber(0.1234, { locale: 'sk' })).toBe('0,1234')
    expect(formatSmartNumber(0.0000001234, { locale: 'de' })).toBe('0,0₆1234')
  })

  it('returns the fallback for non numbers', () => {
    expect(formatSmartNumber(null, en)).toBe('N/A')
    expect(formatSmartNumber(undefined, { ...en, fallback: '—' })).toBe('—')
    expect(formatSmartNumber(Number.NaN, en)).toBe('N/A')
    expect(formatSmartNumber(Number.POSITIVE_INFINITY, en)).toBe('N/A')
    expect(formatSmartNumber('abc', en)).toBe('N/A')
  })

  it('exposes the zero count for rendering a real <sub>', () => {
    const parts = formatSmartNumberParts(0.0000001234, en)
    expect(parts).toMatchObject({ integer: '0', zeros: 6, fraction: '1234', suffix: '' })
  })
})

describe('formatSmartUsd', () => {
  it('shows an ALGO price with enough information', () => {
    expect(formatSmartUsd(0.1234567, en)).toBe('$0.1234')
    expect(formatSmartUsd(0.12, en)).toBe('$0.12')
  })

  it('puts the minus before the dollar sign', () => {
    expect(formatSmartUsd(-12.3456, en)).toBe('-$12.34')
  })

  it('places the dollar sign like the locale does', () => {
    expect(formatSmartUsd(1234567890, { locale: 'sk' })).toMatch(/^1234M\s\$$/)
  })

  it('returns the fallback for missing values', () => {
    expect(formatSmartUsd(undefined, en)).toBe('N/A')
  })
})
