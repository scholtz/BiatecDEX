/**
 * Per-asset account holdings via algod's `accountAssetInformation` (one small request per
 * asset) instead of the whole `accountInformation`, which algod refuses for accounts with
 * very many assets. The one shared place that interprets the answer: a 404 means "not held"
 * (not opted in), anything else is a real failure. Pure module (no Vue, no store).
 */

/** The slice of algosdk's Algodv2 used here (keeps the module testable without a node). */
export interface AccountAssetClient {
  accountAssetInformation(
    account: string,
    assetId: bigint
  ): { do(): Promise<{ assetHolding?: { amount?: bigint | number } }> }
}

/** Public algod nodes rate-limit: at most this many lookups are in flight. */
const MAX_CONCURRENT_LOOKUPS = 8

interface HttpErrorLike {
  response?: { status?: number }
  status?: number
}

/** algosdk throws an error carrying `response.status`; only without one is the text consulted. */
// `unknown`: whatever a rejected request throws is not typed; it is narrowed right here.
const isNotHeldError = (err: unknown): boolean => {
  if (typeof err !== 'object' || err === null) return false
  const http = err as HttpErrorLike
  const status = http.response?.status ?? http.status
  if (typeof status === 'number') return status === 404
  const message = err instanceof Error ? err.message : ''
  return /\b404\b|account asset info not found/i.test(message)
}

const toBigInt = (value: bigint | number | undefined): bigint => {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number' && Number.isInteger(value)) return BigInt(value)
  return 0n
}

/**
 * Amount held per asset id: opted-in assets map to their amount (possibly 0n), assets the
 * account is not opted in to are absent. Rejects when algod fails for any other reason.
 */
export const fetchAssetAmounts = async (
  algod: AccountAssetClient,
  account: string,
  assetIds: readonly bigint[]
): Promise<Map<bigint, bigint>> => {
  const unique = [...new Set(assetIds.filter((id) => id > 0n))]
  const held = new Map<bigint, bigint>()
  // A rolling pool of workers: a slow lookup never holds back the others.
  let next = 0
  let failed = false
  const worker = async (): Promise<void> => {
    while (!failed && next < unique.length) {
      const assetId = unique[next++]
      try {
        const info = await algod.accountAssetInformation(account, assetId).do()
        if (info.assetHolding) held.set(assetId, toBigInt(info.assetHolding.amount))
      } catch (err) {
        if (!isNotHeldError(err)) {
          failed = true // the other workers stop issuing requests for a result nobody will read
          throw err
        }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT_LOOKUPS, unique.length) }, worker))
  return held
}
