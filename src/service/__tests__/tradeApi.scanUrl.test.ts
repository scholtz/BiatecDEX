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

  it('has no link for networks without a Biatec Scan deployment', () => {
    expect(getScanApplicationUrl('voimain-v1.0', 7)).toBeUndefined()
    expect(getScanApplicationUrl('dockernet-v1', '7')).toBeUndefined()
  })
})
