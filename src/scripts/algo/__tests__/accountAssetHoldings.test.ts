import { describe, expect, it } from 'vitest'
import { fetchAssetAmounts, type AccountAssetClient } from '../accountAssetHoldings'

const client = (
  answers: Record<string, { amount?: bigint | number } | Error>
): AccountAssetClient & { calls: bigint[] } => {
  const calls: bigint[] = []
  return {
    calls,
    accountAssetInformation: (_account, assetId) => ({
      do: async () => {
        calls.push(assetId)
        const answer = answers[assetId.toString()]
        if (answer instanceof Error) throw answer
        return { assetHolding: answer }
      }
    })
  }
}

const notFound = () =>
  Object.assign(new Error('Network request error. Received status 404 (Not Found)'), {
    response: { status: 404 }
  })

describe('fetchAssetAmounts', () => {
  it('maps held assets to their amount, omits assets that are not opted in', async () => {
    const algod = client({ '7': { amount: 5n }, '8': notFound(), '9': { amount: 0n } })
    const held = await fetchAssetAmounts(algod, 'ADDR', [7n, 8n, 9n])
    expect([...held.entries()]).toEqual([
      [7n, 5n],
      [9n, 0n]
    ])
  })

  it('accepts numeric amounts and treats a missing holding as not held', async () => {
    const algod = client({ '1': { amount: 12 } })
    expect((await fetchAssetAmounts(algod, 'A', [1n, 2n])).get(1n)).toBe(12n)
  })

  it('looks every asset up once and ignores asset 0', async () => {
    const algod = client({ '7': { amount: 1n } })
    await fetchAssetAmounts(algod, 'A', [7n, 7n, 0n])
    expect(algod.calls).toEqual([7n])
  })

  it('recognises a 404 that is only in the message', async () => {
    const algod = client({ '7': new Error('Received status 404: account asset info not found') })
    expect((await fetchAssetAmounts(algod, 'A', [7n])).size).toBe(0)
  })

  it('rejects on real failures so callers can tell "unknown" from "not opted in"', async () => {
    const algod = client({ '7': Object.assign(new Error('boom'), { response: { status: 500 } }) })
    await expect(fetchAssetAmounts(algod, 'A', [7n])).rejects.toThrow('boom')
  })
})
