import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  isExpectedWalletResumeNoise,
  installWalletResumeNoiseFilter
} from '../walletResumeNoiseFilter'

describe('isExpectedWalletResumeNoise', () => {
  it('matches the exact console.error call WalletManagerPlugin makes for the Mnemonic guard', () => {
    expect(
      isExpectedWalletResumeNoise([
        'Error resuming sessions:',
        new Error('Production network detected. Aborting.')
      ])
    ).toBe(true)
  })

  it('ignores an unrelated error logged with the same prefix', () => {
    expect(
      isExpectedWalletResumeNoise(['Error resuming sessions:', new Error('Network timeout')])
    ).toBe(false)
  })

  it('ignores a differently-prefixed console.error call', () => {
    expect(
      isExpectedWalletResumeNoise([
        'Something else entirely:',
        new Error('Production network detected. Aborting.')
      ])
    ).toBe(false)
  })

  it('ignores calls with too few arguments or a non-Error second argument', () => {
    expect(isExpectedWalletResumeNoise(['Error resuming sessions:'])).toBe(false)
    expect(
      isExpectedWalletResumeNoise([
        'Error resuming sessions:',
        'Production network detected. Aborting.'
      ])
    ).toBe(false)
  })
})

describe('installWalletResumeNoiseFilter', () => {
  let originalConsoleError: typeof console.error

  beforeEach(() => {
    originalConsoleError = console.error
  })

  afterEach(() => {
    console.error = originalConsoleError
  })

  it('drops the expected Mnemonic-guard call but passes everything else through', () => {
    const spy = vi.fn()
    console.error = spy
    installWalletResumeNoiseFilter()

    console.error('Error resuming sessions:', new Error('Production network detected. Aborting.'))
    expect(spy).not.toHaveBeenCalled()

    console.error('Error resuming sessions:', new Error('Some other real failure'))
    expect(spy).toHaveBeenCalledOnce()

    console.error('totally unrelated log')
    expect(spy).toHaveBeenCalledTimes(2)
  })
})
