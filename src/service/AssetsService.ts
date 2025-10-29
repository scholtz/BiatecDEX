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
    return assets
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
