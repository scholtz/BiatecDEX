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

/** algosdk throws an error carrying `response.status`; older paths only embed it in the text. */
const isNotHeldError = (err: unknown): boolean => {
  if (typeof err !== 'object' || err === null) return false
  const status = (err as { response?: { status?: number }; status?: number }).response?.status
  if (status === 404 || (err as { status?: number }).status === 404) return true
  const message = err instanceof Error ? err.message : ''
  return /\b404\b|account asset info not found/i.test(message)
}

const toBigInt = (value: bigint | number | undefined): bigint => {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number' && Number.isSafeInteger(value)) return BigInt(value)
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
  const results = await Promise.all(
    unique.map(async (assetId) => {
      try {
        const info = await algod.accountAssetInformation(account, assetId).do()
        return info.assetHolding ? ([assetId, toBigInt(info.assetHolding.amount)] as const) : null
      } catch (err) {
        if (isNotHeldError(err)) return null
        throw err
      }
    })
  )
  const held = new Map<bigint, bigint>()
  for (const entry of results) if (entry) held.set(entry[0], entry[1])
  return held
}
