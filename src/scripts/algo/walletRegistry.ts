import type { WalletAdapterConfig } from '@txnlab/use-wallet-vue'
import { biatec } from 'biatec-wallet-use-wallet-client'
import { pera } from '@txnlab/use-wallet-pera'
import { defly } from '@txnlab/use-wallet-defly'
import { exodus } from '@txnlab/use-wallet-exodus'
import { kibisis } from '@txnlab/use-wallet-kibisis'
import { lute } from '@txnlab/use-wallet-lute'
import { mnemonic } from '@txnlab/use-wallet-mnemonic'
import { networks } from './networks'

export const ALGORAND_MAINNET = 'mainnet-v1.0'
export const ALGORAND_TESTNET = 'testnet-v1.0'

/**
 * Networks where a throwaway mnemonic wallet is acceptable: it stores the phrase in plain
 * text, so it must never be offered next to real funds. Derived from the registered networks'
 * `isTestnet` flag so a new test network needs no change here.
 */
export const TEST_NETWORKS: readonly string[] = Object.entries(networks)
  .filter(([, config]) => config.isTestnet)
  .map(([id]) => id)

/**
 * The use-wallet 5 adapters declare the networks they work on with canonical ids
 * (`mainnet`, `testnet`) that never match the app's genesis-id networks. Without remapping,
 * Pera / Defly / Exodus would silently disappear and the mnemonic wallet (which excludes
 * `mainnet`) would be offered on `mainnet-v1.0`. The override replaces the whole capabilities
 * object on purpose: `supportedNetworks` and `excludedNetworks` must not both be set.
 */
const withNetworks = (
  config: WalletAdapterConfig,
  supportedNetworks: string[]
): WalletAdapterConfig => ({
  ...config,
  capabilities: { supportedNetworks }
})

/** Wallets offered by the DEX, with their capabilities expressed in the app's network ids. */
export function buildWalletConfigs(walletConnectProjectId: string): WalletAdapterConfig[] {
  return [
    biatec({ projectId: walletConnectProjectId }),
    withNetworks(pera(), [ALGORAND_MAINNET, ALGORAND_TESTNET]),
    withNetworks(defly(), [ALGORAND_MAINNET, ALGORAND_TESTNET]),
    withNetworks(exodus(), [ALGORAND_MAINNET]),
    kibisis(),
    lute(),
    withNetworks(mnemonic(), [...TEST_NETWORKS])
  ]
}
