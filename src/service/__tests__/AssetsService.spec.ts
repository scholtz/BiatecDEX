import { describe, it, expect } from 'vitest'
import { AssetsService } from '../AssetsService'

describe('AssetsService.getAsset case-insensitive lookup', () => {
  it('should return VoteCoin asset with lowercase code', () => {
    const asset = AssetsService.getAsset('vote')
    expect(asset).toBeDefined()
    expect(asset?.name).toBe('VoteCoin')
  })

  it('should return VoteCoin asset with uppercase code', () => {
    const asset = AssetsService.getAsset('VOTE')
    expect(asset).toBeDefined()
    expect(asset?.name).toBe('VoteCoin')
  })

  it('returns undefined for unknown asset', () => {
    const asset = AssetsService.getAsset('UNKNOWN_ASSET_CODE_DOES_NOT_EXIST')
    expect(asset).toBeUndefined()
  })
})
