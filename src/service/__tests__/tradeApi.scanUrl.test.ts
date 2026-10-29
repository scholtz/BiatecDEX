import { describe, expect, it } from 'vitest'
import { getScanApplicationUrl } from '../tradeApi'

describe('getScanApplicationUrl', () => {
  it('links to the mainnet explorer', () => {
    expect(getScanApplicationUrl('mainnet-v1.0', 3721926813n)).toBe(
      'https://algorand.scan.biatec.io/application/3721926813'
    )
  })

  it('links to the testnet explorer', () => {
    expect(getScanApplicationUrl('testnet-v1.0', 12345)).toBe(
      'https://testnet.scan.biatec.io/application/12345'
    )
  })

  it('falls back to the mainnet explorer for other networks', () => {
    expect(getScanApplicationUrl('unknown', '7')).toBe(
      'https://algorand.scan.biatec.io/application/7'
    )
  })
})
