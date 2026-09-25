import { describe, expect, it, vi } from 'vitest'
import BigNumber from 'bignumber.js'
import initPriceDecimals from '../initPriceDecimals'

// Production error report:
//   Error in initPriceDecimals: Error: [BigNumber Error] Argument out of range: Infinity
//     at ... o.toFixed ... at dt (initPriceDecimals) at wt (calculateDistribution) at Q
//     (setChartData) at ManageLiquidity ...
//
// Root cause: `if (!price) return {...}` is meant to short-circuit on a zero/falsy
// price, but `price` is a BigNumber *object* — JS truthiness of any non-null object is
// always true, so the guard never fires for `new BigNumber(0)`. Math.log10(0) is
// -Infinity, which (since it is NOT > 0) skips the branch that would otherwise clamp
// precisionDiff back to a small bounded value, leaving precisionDiff = Infinity and
// `.toFixed(Infinity)` throws deep inside bignumber.js — which is exactly the
// "at o.toFixed" / "at Z" shape of the reported stack.
describe('initPriceDecimals', () => {
  it('handles a zero price through the intended fast path, not the internal error handler', () => {
    // The `if (!price) return {...}` guard exists specifically to short-circuit before
    // any of the log10/toFixed math below runs. If it's broken (as it was — checking JS
    // truthiness of a BigNumber *object*, which is always true), a zero price instead
    // falls through into the error-prone path and only survives because the outer
    // try/catch happens to catch the resulting native BigNumber exception, logging noise
    // via console.error on every ordinary "price not loaded yet" render.
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = initPriceDecimals(new BigNumber(0), new BigNumber(1))
    expect(consoleErrorSpy).not.toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
    expect(result.tick.isFinite()).toBe(true)
    expect(result.fitPrice.isFinite()).toBe(true)
    expect(result.priceDecimals.isFinite()).toBe(true)
  })

  it('does not throw for a negative price and returns finite results', () => {
    expect(() => initPriceDecimals(new BigNumber(-5), new BigNumber(1))).not.toThrow()
    const result = initPriceDecimals(new BigNumber(-5), new BigNumber(1))
    expect(result.tick.isFinite()).toBe(true)
    expect(result.fitPrice.isFinite()).toBe(true)
  })

  it('does not throw for an Infinity price and returns finite results', () => {
    expect(() => initPriceDecimals(new BigNumber(Infinity), new BigNumber(1))).not.toThrow()
    const result = initPriceDecimals(new BigNumber(Infinity), new BigNumber(1))
    expect(result.tick.isFinite()).toBe(true)
    expect(result.fitPrice.isFinite()).toBe(true)
  })

  it('does not throw for a NaN price and returns finite results', () => {
    expect(() => initPriceDecimals(new BigNumber(NaN), new BigNumber(1))).not.toThrow()
    const result = initPriceDecimals(new BigNumber(NaN), new BigNumber(1))
    expect(result.tick.isFinite()).toBe(true)
    expect(result.fitPrice.isFinite()).toBe(true)
  })

  it('still computes a normal tick/fitPrice for an ordinary positive price', () => {
    const result = initPriceDecimals(new BigNumber(1.2345), new BigNumber(1))
    expect(result.tick.isFinite()).toBe(true)
    expect(result.tick.isGreaterThan(0)).toBe(true)
    expect(result.fitPrice.isFinite()).toBe(true)
    expect(result.fitPrice.isLessThanOrEqualTo(1.2345)).toBe(true)
  })
})
