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
  signature: {
    sig?: string
    logicsig?: { logic: string; args?: string[] }
    multisig?: { subsignature?: { pk?: string; s?: string }[]; thr?: number; v?: number }
  }
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
/**
 * An account's asset holding as returned by algosdk. The typed algod v3 client returns
 * camelCase fields (`assetId`/`isFrozen`), but callers built against the older raw REST JSON
 * (kebab-case `asset-id`/`is-frozen`) are still common in this codebase — support both shapes.
 */
export interface RawAssetHolding {
  assetId?: number | bigint
  'asset-id'?: number | bigint
  amount?: number | bigint
  isFrozen?: boolean
  'is-frozen'?: boolean
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
