import type { WalletAdapterConfig, WalletCapabilities } from '@txnlab/use-wallet-vue'
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
 * The use-wallet 5 adapters declare the networks they work on with canonical ids (`mainnet`,
 * `testnet`), but the app registers its networks under genesis ids (`mainnet-v1.0`, ...) that
 * `store.state.env` and the URLs use everywhere. Left alone, the adapters' capabilities never
 * match: Pera / Defly / Exodus silently disappear and the mnemonic wallet (which excludes
 * `mainnet`) is offered on `mainnet-v1.0`.
 */
const CANONICAL_TO_APP: Readonly<Record<string, string>> = {
  mainnet: ALGORAND_MAINNET,
  testnet: ALGORAND_TESTNET
}

/** Every registered network that is not a test network (Algorand, Voi and Aramid mainnets). */
const PRODUCTION_NETWORKS = Object.entries(networks)
  .filter(([, config]) => !config.isTestnet)
  .map(([id]) => id)

/**
 * Re-expresses an adapter's own capabilities in the app's network ids, so the adapters stay the
 * source of truth (a new release that supports more networks just works). `excludedNetworks:
 * ['mainnet']` — what the insecure mnemonic wallet declares — excludes every production network,
 * not only Algorand mainnet. Ids without a canonical mapping pass through unchanged.
 */
export function translateCapabilities(
  capabilities: WalletCapabilities | undefined
): WalletCapabilities | undefined {
  if (!capabilities) return undefined
  const { supportedNetworks, excludedNetworks } = capabilities
  const toApp = (id: string): string => CANONICAL_TO_APP[id] ?? id
  if (supportedNetworks) return { supportedNetworks: supportedNetworks.map(toApp) }
  if (excludedNetworks) {
    const excluded = excludedNetworks.flatMap((id) =>
      id === 'mainnet' ? PRODUCTION_NETWORKS : [toApp(id)]
    )
    return { excludedNetworks: [...new Set(excluded)] }
  }
  return capabilities
}

const forApp = (config: WalletAdapterConfig): WalletAdapterConfig => {
  const capabilities = translateCapabilities(config.capabilities)
  return capabilities ? { ...config, capabilities } : config
}

/** Wallets offered by the DEX, with their capabilities expressed in the app's network ids. */
export function buildWalletConfigs(walletConnectProjectId: string): WalletAdapterConfig[] {
  return [
    biatec({ projectId: walletConnectProjectId }),
    pera(),
    defly(),
    exodus(),
    kibisis(),
    lute(),
    mnemonic()
  ].map(forApp)
}
