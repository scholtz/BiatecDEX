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

// Neither SuggestedParams nor Transaction actually carries firstRound/lastRound (both only
// have firstValid/lastValid) — the extra pair is kept so this keeps working if a caller ever
// passes an object built from raw algod REST JSON using the older round-name fields.
interface RoundBoundsTarget {
  firstRound?: number | bigint
  lastRound?: number | bigint
  firstValid?: number | bigint
  lastValid?: number | bigint
}

const applyOffset = (
  target: RoundBoundsTarget,
  firstKey: keyof RoundBoundsTarget,
  lastKey: keyof RoundBoundsTarget,
  offset: number
) => {
  const first = toNumber(target[firstKey])
  if (first === undefined) {
    return
  }
  const next = first + offset
  target[lastKey] = typeof target[lastKey] === 'bigint' ? BigInt(next) : next
}

export const applyLastRoundOffsetToSuggestedParams = (
  params: SuggestedParams,
  offset: number
): SuggestedParams => {
  if (offset < 0) {
    return params
  }
  applyOffset(params, 'firstRound', 'lastRound', offset)
  applyOffset(params, 'firstValid', 'lastValid', offset)
  return params
}

export const applyLastRoundOffsetToTransaction = <T extends Transaction>(
  txn: T,
  offset: number
): T => {
  if (offset < 0) {
    return txn
  }
  applyOffset(txn, 'firstRound', 'lastRound', offset)
  applyOffset(txn, 'firstValid', 'lastValid', offset)
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
