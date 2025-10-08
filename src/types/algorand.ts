export interface AlgorandTransaction {
  id: string
  'confirmed-round': number
  fee: number
  'first-valid': number
  'genesis-hash': string
  'genesis-id': string
  'intra-round-offset': number
  'last-valid': number
  'round-time': number
  sender: string
  'tx-type': string
  signature: any
  'payment-transaction'?: {
    amount: number
    receiver: string
  }
  'asset-transfer-transaction'?: {
    amount: number
    'asset-id': number
    receiver: string
  }
  'application-transaction'?: {
    'application-id': number
    'on-completion': string
    'application-args': string[]
  }
}
export interface AssetParams {
  name: string
  unitName: string
  total: number
  decimals: number
}
export interface AMMPool {
  poolAddress: string
  poolAppId: bigint
  assetIdA?: bigint
  assetIdB?: bigint
  assetIdLP?: bigint
  a?: bigint
  b?: bigint
  l?: bigint
  protocol: string // Replace with enum if DEXProtocol is defined
  timestamp?: string // ISO string, or Date if you prefer
  isReversed: boolean
}
export interface AMMTrade {
  assetIdIn: bigint
  assetIdOut: bigint
  assetAmountIn: number
  assetAmountOut: number
  txId: string
  blockId: bigint
  txGroup: string
  timestamp: string
  protocol: string
  trader: string
  poolAddress: string
  poolAppId: bigint
  topTxId: string
  tradeState: string
}

export interface AMMLiquidity {
  assetIdA: number
  assetIdB: number
  assetIdLP: number
  assetAmountA: number
  assetAmountB: number
  assetAmountLP: number
  txId: string
  blockId: number
  txGroup: string
  timestamp: string
  protocol: string
  liquidityProvider: string
  poolAddress: string
  poolAppId: number
  topTxId: string
  txState: string
  direction: string
  a: number
  b: number
  l: number
}

export interface SearchResult {
  type: 'block' | 'transaction'
  data: AlgorandTransaction
}
