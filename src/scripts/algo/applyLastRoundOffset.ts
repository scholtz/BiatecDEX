import type { SuggestedParams, Transaction } from 'algosdk'

// Helper to normalize round values to numbers for calculations.
const toNumber = (value: number | bigint | undefined | null): number | undefined => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined
  }
  if (typeof value === 'bigint') {
    return Number(value)
  }
  return undefined
}

const applyOffset = (
  target: Record<string, unknown>,
  firstKey: string,
  lastKey: string,
  offset: number
) => {
  const first = toNumber(target[firstKey] as number | bigint | undefined)
  if (first === undefined) {
    return
  }
  const next = first + offset
  if (typeof (target as Record<string, unknown>)[lastKey] === 'bigint') {
    ;(target as Record<string, unknown>)[lastKey] = BigInt(next)
  } else {
    ;(target as Record<string, unknown>)[lastKey] = next
  }
}

export const applyLastRoundOffsetToSuggestedParams = (
  params: SuggestedParams,
  offset: number
): SuggestedParams => {
  if (offset < 0) {
    return params
  }
  applyOffset(params as unknown as Record<string, unknown>, 'firstRound', 'lastRound', offset)
  applyOffset(params as unknown as Record<string, unknown>, 'firstValid', 'lastValid', offset)
  return params
}

export const applyLastRoundOffsetToTransaction = <T extends Transaction>(
  txn: T,
  offset: number
): T => {
  if (offset < 0) {
    return txn
  }
  applyOffset(txn as unknown as Record<string, unknown>, 'firstRound', 'lastRound', offset)
  applyOffset(txn as unknown as Record<string, unknown>, 'firstValid', 'lastValid', offset)
  return txn
}

export const applyLastRoundOffsetToTransactions = <T extends Transaction>(
  txns: T[],
  offset: number
): T[] => {
  txns.forEach((txn) => {
    applyLastRoundOffsetToTransaction(txn, offset)
  })
  return txns
}
