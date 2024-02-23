import type { IAsset } from '@/interface/IAsset'
const assets = {
  USD: {
    assetId: 31566704,
    name: 'USD',
    code: 'USD',
    symbol: '$',
    decimals: 6,
    isCurrency: true,
    isAsa: true,
    isArc200: false
  },
  EUR: {
    assetId: 227855942,
    name: 'EUR',
    code: 'EUR',
    symbol: '€',
    decimals: 6,
    isCurrency: true,
    isAsa: true,
    isArc200: false
  },
  BTC: {
    assetId: 227855942,
    name: 'Bitcoin',
    code: 'BTC',
    symbol: 'BTC',
    decimals: 8,
    isCurrency: true,
    isAsa: true,
    isArc200: false
  },
  ETH: {
    assetId: 887406851,
    name: 'Ethereum',
    symbol: 'ETH',
    code: 'ETH',
    decimals: 8,
    isCurrency: false,
    isAsa: true,
    isArc200: false
  },
  ALGO: {
    assetId: 227855942,
    name: 'Algorand',
    symbol: 'Algo',
    code: 'ALGO',
    decimals: 6,
    isCurrency: true,
    isAsa: true,
    isArc200: false
  },
  GLD: {
    assetId: 1241944285,
    name: 'Gold',
    code: 'GLD',
    symbol: 'g',
    decimals: 6,
    isCurrency: false,
    isAsa: true,
    isArc200: false
  },
  GD: {
    assetId: 1241945177,
    name: 'GoldDAO',
    code: 'GD',
    symbol: 'GD',
    decimals: 6,
    isCurrency: false,
    isAsa: true,
    isArc200: false
  },
  vote: {
    assetId: 452399768,
    name: 'VoteCoin',
    symbol: '$vote',
    code: 'vote',
    decimals: 6,
    isCurrency: false,
    isAsa: true,
    isArc200: false
  },
  gAlgo: {
    assetId: 793124631,
    name: 'gAlgo',
    symbol: 'gAlgo',
    code: 'gAlgo',
    decimals: 6,
    isCurrency: false,
    isAsa: true,
    isArc200: false
  },
  voi: {
    assetId: 1392374998,
    name: 'Voitest',
    symbol: 'voi',
    code: 'voi',
    decimals: 6,
    isCurrency: false,
    isAsa: true,
    isArc200: false
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
    // Algorand has priority 1
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
    // USD has priority 2
    if (asset1.code == 'USD') {
      return {
        invert: false,
        currency: asset1,
        asset: asset2
      }
    }

    if (asset2.code == 'USD') {
      return {
        invert: false,
        currency: asset2,
        asset: asset1
      }
    }
    // EUR has priority 3
    if (asset1.code == 'EUR') {
      return {
        invert: false,
        currency: asset1,
        asset: asset2
      }
    }

    if (asset2.code == 'EUR') {
      return {
        invert: false,
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
