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

  it('trusts the structured status over a 404 in the message text', async () => {
    const algod = client({
      '7': Object.assign(new Error('proxy error page 404'), { response: { status: 502 } })
    })
    await expect(fetchAssetAmounts(algod, 'A', [7n])).rejects.toThrow('proxy error')
  })

  it('keeps large integer amounts exact', async () => {
    const algod = client({ '7': { amount: 1e20 } })
    expect((await fetchAssetAmounts(algod, 'A', [7n])).get(7n)).toBe(BigInt(1e20))
  })

  it('never has more than 8 lookups in flight', async () => {
    let inFlight = 0
    let peak = 0
    const algod: AccountAssetClient = {
      accountAssetInformation: () => ({
        do: async () => {
          inFlight++
          peak = Math.max(peak, inFlight)
          await new Promise((r) => setTimeout(r, 1))
          inFlight--
          return { assetHolding: { amount: 1n } }
        }
      })
    }
    const ids = Array.from({ length: 30 }, (_, i) => BigInt(i + 1))
    expect((await fetchAssetAmounts(algod, 'A', ids)).size).toBe(30)
    expect(peak).toBeLessThanOrEqual(8)
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
