import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRedirectCircuitBreaker } from '../redirectCircuitBreaker'

describe('createRedirectCircuitBreaker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows normal redirect volume', () => {
    const breaker = createRedirectCircuitBreaker({ windowMs: 5000, maxRedirects: 20 })
    for (let i = 0; i < 20; i++) {
      expect(breaker.allowRedirect('test')).toBe(true)
    }
  })

  it('trips when redirects exceed the limit inside the window', () => {
    const breaker = createRedirectCircuitBreaker({ windowMs: 5000, maxRedirects: 20 })
    for (let i = 0; i < 20; i++) breaker.allowRedirect('loop')
    // A redirect loop fires hundreds of times per second — everything past the
    // cap must be refused so the navigation settles instead of hanging the tab.
    expect(breaker.allowRedirect('loop')).toBe(false)
    expect(breaker.allowRedirect('loop')).toBe(false)
  })

  it('recovers after the window has passed', () => {
    const breaker = createRedirectCircuitBreaker({ windowMs: 5000, maxRedirects: 3 })
    for (let i = 0; i < 4; i++) breaker.allowRedirect('x')
    expect(breaker.allowRedirect('x')).toBe(false)
    vi.advanceTimersByTime(5001)
    expect(breaker.allowRedirect('x')).toBe(true)
  })

  it('never throws — a tripped breaker only refuses the redirect', () => {
    const breaker = createRedirectCircuitBreaker({ windowMs: 1000, maxRedirects: 1 })
    expect(() => {
      for (let i = 0; i < 1000; i++) breaker.allowRedirect('spam')
    }).not.toThrow()
  })
})
