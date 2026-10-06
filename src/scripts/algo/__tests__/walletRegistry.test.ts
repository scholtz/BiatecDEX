import { describe, it, expect } from 'vitest'
import { WalletManager } from '@txnlab/use-wallet'
import { buildWalletConfigs, translateCapabilities } from '../walletRegistry'
import {
  networks,
  ALGORAND_MAINNET,
  ALGORAND_TESTNET,
  VOI_MAINNET,
  ARAMID_MAINNET,
  DOCKERNET
} from '../networks'

const configs = buildWalletConfigs('test-project-id')

/** Wallet ids use-wallet's own WalletManager offers while `network` is the active network. */
const walletsOn = async (network: string): Promise<string[]> => {
  const manager = new WalletManager({ wallets: configs, networks, defaultNetwork: network })
  return manager.availableWallets.map((wallet) => wallet.id)
}
const available = async (id: string, network: string): Promise<boolean> =>
  (await walletsOn(network)).includes(id)

describe('buildWalletConfigs', () => {
  it('uses ids of networks that are registered with use-wallet', () => {
    for (const id of [ALGORAND_MAINNET, ALGORAND_TESTNET, VOI_MAINNET, ARAMID_MAINNET, DOCKERNET]) {
      expect(Object.keys(networks)).toContain(id)
    }
  })

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

  it('offers the Algorand wallets on Algorand mainnet and never the mnemonic wallet', async () => {
    const wallets = await walletsOn(ALGORAND_MAINNET)
    expect(wallets).toEqual(['biatec', 'pera', 'defly', 'exodus', 'kibisis', 'lute'])
    expect(wallets).not.toContain('mnemonic')
  })

  it('offers the mnemonic wallet only on test networks', async () => {
    for (const network of [ALGORAND_TESTNET, DOCKERNET]) {
      expect(await walletsOn(network)).toContain('mnemonic')
    }
    for (const network of [ALGORAND_MAINNET, VOI_MAINNET, ARAMID_MAINNET]) {
      expect(await walletsOn(network)).not.toContain('mnemonic')
    }
  })

  it('keeps Pera and Defly on Algorand mainnet/testnet and off other chains', async () => {
    for (const id of ['pera', 'defly']) {
      expect(await available(id, ALGORAND_MAINNET)).toBe(true)
      expect(await available(id, ALGORAND_TESTNET)).toBe(true)
      expect(await available(id, VOI_MAINNET)).toBe(false)
    }
    expect(await available('exodus', ALGORAND_TESTNET)).toBe(false)
  })

  it('keeps the multi-chain wallets available on Voi and Aramid', async () => {
    for (const id of ['biatec', 'kibisis', 'lute']) {
      expect(await available(id, VOI_MAINNET)).toBe(true)
      expect(await available(id, ARAMID_MAINNET)).toBe(true)
    }
  })

  it('translates canonical adapter capabilities into the app network ids', () => {
    expect(translateCapabilities(undefined)).toBeUndefined()
    expect(translateCapabilities({ supportedNetworks: ['mainnet', 'testnet'] })).toEqual({
      supportedNetworks: [ALGORAND_MAINNET, ALGORAND_TESTNET]
    })
    expect(translateCapabilities({ supportedNetworks: ['voimain-v1.0'] })).toEqual({
      supportedNetworks: ['voimain-v1.0']
    })
    // excluding `mainnet` excludes every production network, not just Algorand's
    const excluded = translateCapabilities({ excludedNetworks: ['mainnet'] })?.excludedNetworks
    expect(excluded).toEqual(
      expect.arrayContaining([ALGORAND_MAINNET, VOI_MAINNET, ARAMID_MAINNET])
    )
    expect(excluded).not.toContain(ALGORAND_TESTNET)
    // ...and `testnet` every test network
    const excludedTest = translateCapabilities({ excludedNetworks: ['testnet'] })?.excludedNetworks
    expect(excludedTest).toEqual(expect.arrayContaining([ALGORAND_TESTNET, DOCKERNET]))
    expect(excludedTest).not.toContain(ALGORAND_MAINNET)
    // supportedNetworks wins when an adapter declares both
    expect(
      translateCapabilities({ supportedNetworks: ['mainnet'], excludedNetworks: ['testnet'] })
    ).toEqual({ supportedNetworks: [ALGORAND_MAINNET] })
  })
})
