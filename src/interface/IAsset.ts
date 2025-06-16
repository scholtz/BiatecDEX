export interface IAsset {
  assetId: number
  name: string
  symbol: string
  code: string
  decimals: number
  isCurrency: boolean
  isAsa: boolean
  isArc200: boolean
  quotes: number[]
  network: string
  precision: number
}
