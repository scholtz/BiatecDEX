import type { WalletAdapterConfig, WalletCapabilities } from '@txnlab/use-wallet-vue'
import { biatec } from 'biatec-wallet-use-wallet-client'
import { pera } from '@txnlab/use-wallet-pera'
import { defly } from '@txnlab/use-wallet-defly'
import { exodus } from '@txnlab/use-wallet-exodus'
import { kibisis } from '@txnlab/use-wallet-kibisis'
import { lute } from '@txnlab/use-wallet-lute'
import { mnemonic } from '@txnlab/use-wallet-mnemonic'
import { networks, ALGORAND_MAINNET, ALGORAND_TESTNET } from './networks'

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

const networkIds = (isTestnet: boolean): string[] =>
  Object.entries(networks)
    .filter(([, config]) => config.isTestnet === isTestnet)
    .map(([id]) => id)

/** Registered production networks (Algorand, Voi and Aramid mainnets). */
const PRODUCTION_NETWORKS = networkIds(false)
/** Registered test networks (Algorand testnet, dockernet, use-wallet's defaults). */
const TEST_NETWORKS = networkIds(true)

/**
 * Re-expresses an adapter's own capabilities in the app's network ids, so the adapters stay the
 * source of truth (a new release that supports more networks just works). `excludedNetworks:
 * ['mainnet']` — what the insecure mnemonic wallet declares — excludes every production network,
 * not only Algorand mainnet (and `'testnet'` every test network). When an adapter declares both
 * fields, `supportedNetworks` wins, exactly as use-wallet's own manager treats it. Ids without a
 * canonical mapping pass through unchanged. The asymmetry is deliberate: a wallet that *supports*
 * `mainnet` means Algorand mainnet (Pera, Defly, Exodus are Algorand-only), while a wallet that
 * *excludes* it is a safety statement that has to cover every production chain.
 */
export function translateCapabilities(
  capabilities: WalletCapabilities | undefined
): WalletCapabilities | undefined {
  if (!capabilities) return undefined
  const { supportedNetworks, excludedNetworks } = capabilities
  const toApp = (id: string): string => CANONICAL_TO_APP[id] ?? id
  if (supportedNetworks) return { supportedNetworks: supportedNetworks.map(toApp) }
  if (excludedNetworks) {
    const excluded = excludedNetworks.flatMap((id) => {
      if (id === 'mainnet') return PRODUCTION_NETWORKS
      if (id === 'testnet') return TEST_NETWORKS
      return [toApp(id)]
    })
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
