import { describe, it, expect } from 'vitest'
import {
  buildWalletConfigs,
  ALGORAND_MAINNET,
  ALGORAND_TESTNET,
  VOI_MAINNET,
  ARAMID_MAINNET,
  DOCKERNET
} from '../walletRegistry'

const configs = buildWalletConfigs('test-project-id')
const available = (id: string, network: string): boolean => {
  const config = configs.find((c) => c.id === id)
  if (!config) throw new Error(`wallet ${id} is not registered`)
  const { supportedNetworks, excludedNetworks } = config.capabilities ?? {}
  if (supportedNetworks) return supportedNetworks.includes(network)
  if (excludedNetworks) return !excludedNetworks.includes(network)
  return true
}
const walletsOn = (network: string) =>
  configs.filter((c) => available(c.id, network)).map((c) => c.id)

describe('buildWalletConfigs', () => {
  it('registers every wallet the DEX offers, Biatec first', () => {
    expect(configs.map((c) => c.id)).toEqual([
      'biatec',
      'pera',
      'defly',
      'exodus',
      'kibisis',
      'lute',
      'mnemonic'
    ])
  })

  it('offers the Algorand wallets on Algorand mainnet and never the mnemonic wallet', () => {
    const wallets = walletsOn(ALGORAND_MAINNET)
    expect(wallets).toEqual(['biatec', 'pera', 'defly', 'exodus', 'kibisis', 'lute'])
    expect(wallets).not.toContain('mnemonic')
  })

  it('offers the mnemonic wallet only on test networks', () => {
    for (const network of [ALGORAND_TESTNET, DOCKERNET]) {
      expect(walletsOn(network)).toContain('mnemonic')
    }
    for (const network of [ALGORAND_MAINNET, VOI_MAINNET, ARAMID_MAINNET]) {
      expect(walletsOn(network)).not.toContain('mnemonic')
    }
  })

  it('keeps Pera and Defly on Algorand mainnet/testnet and off other chains', () => {
    for (const id of ['pera', 'defly']) {
      expect(available(id, ALGORAND_MAINNET)).toBe(true)
      expect(available(id, ALGORAND_TESTNET)).toBe(true)
      expect(available(id, VOI_MAINNET)).toBe(false)
    }
    expect(available('exodus', ALGORAND_TESTNET)).toBe(false)
  })

  it('keeps the multi-chain wallets available on Voi and Aramid', () => {
    for (const id of ['biatec', 'kibisis', 'lute']) {
      expect(available(id, VOI_MAINNET)).toBe(true)
      expect(available(id, ARAMID_MAINNET)).toBe(true)
    }
  })
})
