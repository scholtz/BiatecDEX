import type { IAsset } from '@/interface/IAsset'
const assets = {
  localEUR: {
    assetId: 7689,
    name: 'EUR',
    code: 'localEUR',
    symbol: '€',
    decimals: 6,
    isCurrency: true,
    isAsa: true,
    isArc200: false,
    quotes: [1, 10, 100, 1000],
    network: 'dockernet-v1'
  },
  localUSD: {
    assetId: 7690,
    name: 'USD',
    code: 'localUSD',
    symbol: '$',
    decimals: 6,
    isCurrency: true,
    isAsa: true,
    isArc200: false,
    //quotes: [1, 10, 100, 1000],
    quotes: [1, 10, 100, 1000],
    network: 'dockernet-v1'
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
    network: 'mainnet-v1.0'
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
    network: 'mainnet-v1.0'
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
    network: 'mainnet-v1.0'
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
    network: 'mainnet-v1.0'
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
    network: 'mainnet-v1.0'
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
    network: 'mainnet-v1.0'
  },
  GD: {
    assetId: 1241945177,
    name: 'GoldDAO',
    code: 'GD',
    symbol: 'GD',
    decimals: 6,
    isCurrency: false,
    isAsa: true,
    isArc200: false,
    quotes: [1, 5, 10, 100],
    //    quotes: [1, 10, 20, 50],
    network: 'mainnet-v1.0'
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
    network: 'mainnet-v1.0'
  },
  gAlgo: {
    assetId: 793124631,
    name: 'gAlgo',
    symbol: 'gAlgo',
    code: 'gAlgo',
    decimals: 6,
    isCurrency: false,
    isAsa: true,
    isArc200: false,
    quotes: [1, 10, 100, 1000],
    //    quotes: [10, 100, 1000, 10000],
    network: 'mainnet-v1.0'
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
    network: 'mainnet-v1.0'
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
    network: 'voimain-v1.0'
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
    network: 'voimain-v1.0'
  }
} as { [key: string]: IAsset }

export const AssetsService = {
  getCurrencies() {
    return Object.values(this.getAllAssets()).filter((a) => a.isCurrency == true)
  },
  getAssets() {
    return Object.values(this.getAllAssets())
  },
  getAsset(code: string) {
    const assets = this.getAllAssets()
    if (!(code in assets)) return undefined
    return assets[code]
  },
  getAllAssets() {
    return assets
  },
  selectPrimaryAsset(code1: string, code2: string) {
    const assets = this.getAllAssets()
    const asset1 = assets[code1]
    const asset2 = assets[code2]
    // USD has priority 1
    if (asset1.code == 'USD') {
      return {
        invert: asset2.code == 'ALGO',
        currency: asset1,
        asset: asset2
      }
    }

    if (asset2.code == 'USD') {
      return {
        invert: asset1.code == 'ALGO',
        currency: asset2,
        asset: asset1
      }
    }
    // EUR has priority 2
    if (asset1.code == 'EUR') {
      return {
        invert: asset2.code == 'ALGO',
        currency: asset1,
        asset: asset2
      }
    }

    if (asset2.code == 'EUR') {
      return {
        invert: asset1.code == 'ALGO',
        currency: asset2,
        asset: asset1
      }
    }
    // Algorand has priority 3
    if (asset1.code == 'ALGO') {
      return {
        invert: asset2.isCurrency,
        currency: asset1,
        asset: asset2
      }
    }

    if (asset2.code == 'ALGO') {
      return {
        invert: asset1.isCurrency,
        currency: asset2,
        asset: asset1
      }
    }
    // currency has priority
    if (asset1.isCurrency) {
      return {
        invert: false,
        currency: asset1,
        asset: asset2
      }
    }

    if (asset2.isCurrency) {
      return {
        invert: false,
        currency: asset2,
        asset: asset1
      }
    }
    return {
      invert: false,
      currency: asset1,
      asset: asset2
    }
  }
}
