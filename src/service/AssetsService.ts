import type { IAsset } from '@/interface/IAsset'
const assets = {
  localEUR: {
    assetId: 10604,
    name: 'EUR',
    code: 'localEUR',
    symbol: '€',
    decimals: 6,
    isCurrency: true,
    isAsa: true,
    isArc200: false,
    quotes: [1, 10, 100, 1000],
    network: 'dockernet-v1',
    precision: 1
  },
  localUSD: {
    assetId: 10603,
    name: 'USD',
    code: 'localUSD',
    symbol: '$',
    decimals: 6,
    isCurrency: true,
    isAsa: true,
    isArc200: false,
    //quotes: [1, 10, 100, 1000],
    quotes: [1, 10, 100, 1000],
    network: 'dockernet-v1',
    precision: 1
  },
  localALGO: {
    assetId: 0,
    name: 'Algorand',
    symbol: 'Algo',
    code: 'localALGO',
    decimals: 6,
    isCurrency: true,
    isAsa: true,
    isArc200: false,
    quotes: [1, 10, 100, 1000],
    //    quotes: [10, 100, 1000, 10000],
    network: 'dockernet-v1',
    precision: 1
  },
  EUR: {
    assetId: 227855942,
    name: 'EUR',
    code: 'EUR',
    symbol: '€',
    decimals: 6,
    isCurrency: true,
    isAsa: true,
    isArc200: false,
    quotes: [1, 10, 100, 1000],
    network: 'mainnet-v1.0',
    precision: 1
  },
  USD: {
    assetId: 31566704,
    name: 'USD',
    code: 'USD',
    symbol: '$',
    decimals: 6,
    isCurrency: true,
    isAsa: true,
    isArc200: false,
    //quotes: [1, 10, 100, 1000],
    quotes: [1, 10, 100, 1000],
    network: 'mainnet-v1.0',
    precision: 1
  },
  BTC: {
    assetId: 1058926737,
    name: 'Bitcoin',
    code: 'BTC',
    symbol: 'BTC',
    decimals: 8,
    isCurrency: true,
    isAsa: true,
    isArc200: false,
    quotes: [1, 5, 10, 100],
    //    quotes: [0.01, 0.05, 0.1, 0.5],
    network: 'mainnet-v1.0',
    precision: 1
  },
  ETH: {
    assetId: 887406851,
    name: 'Ethereum',
    symbol: 'ETH',
    code: 'ETH',
    decimals: 8,
    isCurrency: false,
    isAsa: true,
    isArc200: false,
    quotes: [1, 5, 10, 100],
    //    quotes: [0.01, 0.1, 0.5, 1],
    network: 'mainnet-v1.0',
    precision: 1
  },
  ALGO: {
    assetId: 0,
    name: 'Algo',
    symbol: 'Algo',
    code: 'ALGO',
    decimals: 6,
    isCurrency: true,
    isAsa: true,
    isArc200: false,
    quotes: [1, 10, 100, 1000],
    //    quotes: [10, 100, 1000, 10000],
    network: 'mainnet-v1.0',
    precision: 1
  },
  testnetALGO: {
    assetId: 0,
    name: 'tAlgo',
    symbol: 'tAlgo',
    code: 'ALGO',
    decimals: 6,
    isCurrency: true,
    isAsa: true,
    isArc200: false,
    quotes: [1, 10, 100, 1000],
    network: 'testnet-v1.0',
    precision: 1
  },
  testnetUSDC: {
    // Algorand testnet USDC (Circle) - see playwright/helpers/app.ts TESTNET_USDC_ID.
    assetId: 10458941,
    name: 'USDC',
    symbol: 'USDC',
    code: 'USDC',
    decimals: 6,
    isCurrency: true,
    isAsa: true,
    isArc200: false,
    quotes: [1, 10, 100, 1000],
    network: 'testnet-v1.0',
    precision: 1
  },
  GLD: {
    assetId: 1241944285,
    name: 'Gold',
    code: 'GLD',
    symbol: 'g',
    decimals: 6,
    isCurrency: false,
    isAsa: true,
    isArc200: false,
    quotes: [1, 5, 10, 100],
    //    quotes: [0.5, 1, 2, 5],
    network: 'mainnet-v1.0',
    precision: 1
  },
  GD: {
    assetId: 1241945177,
    name: 'GoldDAO',
    code: 'GD',
    symbol: 'GD',
    decimals: 6,
    isCurrency: true,
    isAsa: true,
    isArc200: false,
    quotes: [1, 5, 10, 100],
    //    quotes: [1, 10, 20, 50],
    network: 'mainnet-v1.0',
    precision: 1
  },
  vote: {
    assetId: 452399768,
    name: 'VoteCoin',
    symbol: '$vote',
    code: 'vote',
    decimals: 6,
    isCurrency: false,
    isAsa: true,
    isArc200: false,
    quotes: [1, 5, 10, 100],
    //    quotes: [10, 200, 1000, 5000],
    network: 'mainnet-v1.0',
    precision: 1
  },
  voi: {
    assetId: 2320775407,
    name: 'Aramid VOI',
    symbol: 'voi',
    code: 'voi',
    decimals: 6,
    isCurrency: false,
    isAsa: true,
    isArc200: false,
    quotes: [1, 5, 10, 100],
    //    quotes: [100, 1000, 10000, 100000],
    network: 'mainnet-v1.0',
    precision: 1
  },
  voiNative: {
    assetId: 0,
    name: 'Voi',
    symbol: 'Voi',
    code: 'voi',
    decimals: 6,
    // Native token must always be selectable as a currency too (see AssetsService
    // docs at the top of this file / getAsset network-scoped resolution) - this was
    // previously false, which silently dropped VOI from every currency dropdown.
    isCurrency: true,
    isAsa: true,
    isArc200: false,
    quotes: [1, 5, 10, 100],
    //    quotes: [100, 1000, 10000, 100000],
    network: 'voimain-v1.0',
    precision: 1
  },
  aUSD: {
    assetId: 302190,
    name: 'aUSD',
    code: 'aUSD',
    symbol: '$',
    decimals: 6,
    isCurrency: true,
    isAsa: true,
    isArc200: false,
    //quotes: [1, 10, 100, 1000],
    quotes: [1, 10, 100, 1000],
    network: 'voimain-v1.0',
    precision: 1
  }
} as { [key: string]: IAsset }

// ---------------------------------------------------------------------------
// Runtime registry of user-selected assets that are not in the curated catalog.
// Persisted so synthetic codes survive reloads and bookmarked liquidity URLs.
// Lets users create a pool for ANY Algorand asset pair (selected via the
// trade API search) without each asset being hard-coded above.
// ---------------------------------------------------------------------------
const CUSTOM_ASSETS_KEY = 'biatec.customAssets'

const loadCustomAssets = (): { [key: string]: IAsset } => {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(CUSTOM_ASSETS_KEY)
    return raw ? (JSON.parse(raw) as { [key: string]: IAsset }) : {}
  } catch {
    return {}
  }
}

let customAssets: { [key: string]: IAsset } = loadCustomAssets()

const persistCustomAssets = () => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CUSTOM_ASSETS_KEY, JSON.stringify(customAssets))
  } catch {
    /* ignore quota / serialization errors */
  }
}

export interface CustomAssetInput {
  assetId: number
  network: string
  name?: string
  unitName?: string
  decimals?: number
  isCurrency?: boolean
}

export const AssetsService = {
  getCurrencies() {
    return Object.values(this.getAllAssets()).filter((a) => a.isCurrency == true)
  },
  getAssets() {
    return Object.values(this.getAllAssets())
  },
  getAsset(code: string, network?: string): IAsset | undefined {
    if (!code) return undefined
    // Synthetic per-id slugs: the registry stores them as `asa<id>` but URLs built by
    // the assets/LP dashboards use `asa-<id>` — accept both and resolve by asset id.
    const idMatch = /^asa-?(\d+)$/i.exec(code.trim())
    if (idMatch) return this.getAssetById(BigInt(idMatch[1]), network)
    const assets = this.getAllAssets()
    const lowered = code.toLowerCase()
    if (network) {
      // Codes can repeat across networks (e.g. 'voi' on mainnet + voimain) — prefer
      // the entry on the requested network before falling back to legacy resolution.
      for (const [k, v] of Object.entries(assets)) {
        if (k.toLowerCase() === lowered && v.network === network) return v
      }
    }
    // direct match first
    if (code in assets) return assets[code]
    // attempt case-insensitive lookup (some entries like 'vote' / 'voi' are lowercase)
    for (const [k, v] of Object.entries(assets)) {
      if (k.toLowerCase() === lowered) return v
    }
    return undefined
  },
  getAssetById(assetId: bigint | number, network?: string): IAsset | undefined {
    const assets = Object.values(this.getAllAssets())
    const id = BigInt(assetId)
    if (network) {
      // Asset ids are chain-scoped: the same numeric id can exist on several networks
      // as unrelated assets, so a network match must win over any first-found entry.
      const onNetwork = assets.find((a) => BigInt(a.assetId) === id && a.network === network)
      if (onNetwork) return onNetwork
    }
    return assets.find((a) => BigInt(a.assetId) === id)
  },
  getAllAssets() {
    // Curated catalog takes precedence over runtime-registered assets.
    return { ...customAssets, ...assets }
  },
  /**
   * Ensure an asset exists in the service and return it. If the asset id is
   * already in the catalog (or previously registered) the existing entry is
   * reused so curated codes / quotes are preserved; otherwise a synthetic
   * `asa<id>` asset is registered and persisted.
   */
  ensureCustomAsset(input: CustomAssetInput): IAsset {
    // Only reuse an entry on the SAME network — the same numeric id on another chain
    // is a different asset (reusing it corrupts name/decimals). ALGO (id 0) is the
    // one id that is identical on every chain, so any existing entry is fine there.
    const existing = this.getAssetById(input.assetId, input.network)
    if (existing && (existing.network === input.network || BigInt(input.assetId) === 0n)) {
      return existing
    }

    const code = input.assetId === 0 ? 'ALGO' : `asa${input.assetId}`
    const asset: IAsset = {
      assetId: input.assetId,
      name: input.name || (input.assetId === 0 ? 'Algorand' : `Asset #${input.assetId}`),
      symbol: input.unitName || input.name || (input.assetId === 0 ? 'ALGO' : code),
      code,
      decimals: input.decimals ?? (input.assetId === 0 ? 6 : 0),
      isCurrency: input.isCurrency ?? true,
      isAsa: true,
      isArc200: false,
      quotes: [1, 10, 100, 1000],
      network: input.network,
      precision: 1
    }
    customAssets = { ...customAssets, [code]: asset }
    persistCustomAssets()
    return asset
  },
  selectPrimaryAsset(code1: string, code2: string) {
    const asset1Code = code1.toLowerCase()
    const asset2Code = code2.toLowerCase()
    const asset1 = this.getAsset(asset1Code)
    const asset2 = this.getAsset(asset2Code)

    // USD has priority 1
    if (asset1Code == 'usd') {
      return {
        invert: true,
        currency: asset1,
        asset: asset2
      }
    }

    if (asset2Code == 'usd') {
      return {
        invert: false,
        currency: asset2,
        asset: asset1
      }
    }
    // EUR has priority 2
    if (asset1Code == 'eur') {
      return {
        invert: true,
        currency: asset1,
        asset: asset2
      }
    }

    if (asset2Code == 'eur') {
      return {
        invert: false,
        currency: asset2,
        asset: asset1
      }
    }

    // GD has priority 2.5
    if (asset1Code == 'gd') {
      return {
        invert: true,
        currency: asset1,
        asset: asset2
      }
    }

    if (asset2Code == 'gd') {
      return {
        invert: false,
        currency: asset2,
        asset: asset1
      }
    }

    // Algorand has priority 3
    if (asset1Code == 'algo') {
      return {
        invert: true,
        currency: asset1,
        asset: asset2
      }
    }

    if (asset2Code == 'algo') {
      return {
        invert: false,
        currency: asset2,
        asset: asset1
      }
    }
    // currency has priority
    if (asset1?.isCurrency ?? false) {
      return {
        invert: true,
        currency: asset1,
        asset: asset2
      }
    }

    if (asset2?.isCurrency ?? false) {
      return {
        invert: false,
        currency: asset2,
        asset: asset1
      }
    }
    return {
      invert: true,
      currency: asset1,
      asset: asset2
    }
  }
}
