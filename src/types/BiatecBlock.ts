export interface BiatecBlock {
  round: number
  timestamp: string // ISO 8601
  genesisId: string // GenesisId
  transactions: number
  totalTransactions: number
}
