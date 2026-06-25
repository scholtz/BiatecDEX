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
    precision: 2
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
    precision: 2
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
    precision: 2
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
    precision: 2
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
    precision: 2
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
    precision: 2
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
    precision: 2
  },
  ALGO: {
    assetId: 0,
    name: 'Algorand',
    symbol: 'Algo',
    code: 'ALGO',
    decimals: 6,
    isCurrency: true,
    isAsa: true,
    isArc200: false,
    quotes: [1, 10, 100, 1000],
    //    quotes: [10, 100, 1000, 10000],
    network: 'mainnet-v1.0',
    precision: 2
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
    precision: 2
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
    precision: 2
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
    name: 'VOI',
    symbol: 'voi',
    code: 'voi',
    decimals: 6,
    isCurrency: false,
    isAsa: true,
    isArc200: false,
    quotes: [1, 5, 10, 100],
    //    quotes: [100, 1000, 10000, 100000],
    network: 'voimain-v1.0',
    precision: 2
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
    precision: 2
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
  getAsset(code: string): IAsset | undefined {
    if (!code) return undefined
    const assets = this.getAllAssets()
    // direct match first
    if (code in assets) return assets[code]
    // attempt case-insensitive lookup (some entries like 'vote' / 'voi' are lowercase)
    const lowered = code.toLowerCase()
    // Build a map of lowercase keys lazily
    for (const [k, v] of Object.entries(assets)) {
      if (k.toLowerCase() === lowered) return v
    }
    return undefined
  },
  getAssetById(assetId: bigint | number): IAsset | undefined {
    const assets = this.getAllAssets()
    const id = BigInt(assetId)
    return Object.values(assets).find((a) => BigInt(a.assetId) === id)
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
    const existing = this.getAssetById(input.assetId)
    if (existing) return existing

    const code = input.assetId === 0 ? 'ALGO' : `asa${input.assetId}`
    const asset: IAsset = {
      assetId: input.assetId,
      name:
        input.name || (input.assetId === 0 ? 'Algorand' : `Asset #${input.assetId}`),
      symbol:
        input.unitName || input.name || (input.assetId === 0 ? 'ALGO' : code),
      code,
      decimals: input.decimals ?? (input.assetId === 0 ? 6 : 0),
      isCurrency: input.isCurrency ?? true,
      isAsa: true,
      isArc200: false,
      quotes: [1, 10, 100, 1000],
      network: input.network,
      precision: 2
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
