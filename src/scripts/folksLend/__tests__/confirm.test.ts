import { describe, expect, it } from 'vitest'
import { waitForGroupOutcome, type ConfirmationClient } from '@/scripts/folksLend/confirm'

type Pending = { confirmedRound?: bigint | number; poolError?: string }

/** A node whose answers are scripted per call; the last answer repeats. */
const node = (script: {
  pending: (Pending | Error)[]
  rounds: (bigint | Error)[]
}): ConfirmationClient & { calls: { pending: number; status: number } } => {
  const calls = { pending: 0, status: 0 }
  const at = <T>(list: T[], index: number): T => list[Math.min(index, list.length - 1)]
  const answer = async <T>(value: T | Error): Promise<T> => {
    if (value instanceof Error) throw value
    return value
  }
  const round = () => answer(at(script.rounds, calls.status++)).then((r) => ({ lastRound: r }))
  return {
    calls,
    pendingTransactionInformation: () => ({
      do: () => answer(at(script.pending, calls.pending++))
    }),
    status: () => ({ do: round }),
    statusAfterBlock: () => ({ do: round })
  }
}

const notFound = Object.assign(new Error('not found'), { response: { status: 404 } })
const options = { sleep: async () => {} }

describe('waitForGroupOutcome', () => {
  it('reports a confirmation', async () => {
    const algod = node({ pending: [{}, {}, { confirmedRound: 103n }], rounds: [101n, 102n] })
    expect(await waitForGroupOutcome(algod, 'TX', 200n, options)).toEqual({ status: 'confirmed' })
  })

  it('reports a rejection with the reason of the node', async () => {
    const algod = node({ pending: [{}, { poolError: 'logic eval error' }], rounds: [101n] })
    expect(await waitForGroupOutcome(algod, 'TX', 200n, options)).toEqual({
      status: 'rejected',
      reason: 'logic eval error'
    })
  })

  it('keeps waiting while the group can still confirm, then reports the expiry', async () => {
    const algod = node({ pending: [{}], rounds: [101n, 102n, 103n, 104n] })
    expect(await waitForGroupOutcome(algod, 'TX', 103n, options)).toEqual({ status: 'expired' })
    // Asked once more after the node passed lastValid (104 > 103).
    expect(algod.calls.pending).toBe(5)
  })

  it('still sees a confirmation that arrives in the last valid round', async () => {
    const algod = node({
      pending: [{}, {}, {}, { confirmedRound: 103n }],
      rounds: [101n, 102n, 104n]
    })
    expect(await waitForGroupOutcome(algod, 'TX', 103n, options)).toEqual({ status: 'confirmed' })
  })

  it('treats "unknown to this node" as no answer, not as a failure', async () => {
    const algod = node({
      pending: [notFound, notFound, { confirmedRound: 5n }],
      rounds: [1n, 2n]
    })
    expect(await waitForGroupOutcome(algod, 'TX', 50n, options)).toEqual({ status: 'confirmed' })
  })

  it('reports unknown when the node cannot be asked', async () => {
    const algod = node({ pending: [new Error('network down')], rounds: [1n] })
    expect(await waitForGroupOutcome(algod, 'TX', 50n, options)).toEqual({ status: 'unknown' })
    expect(algod.calls.pending).toBe(5)
  })

  it('recovers from a few failed requests', async () => {
    const algod = node({
      pending: [new Error('timeout'), new Error('timeout'), { confirmedRound: 9n }],
      rounds: [1n]
    })
    expect(await waitForGroupOutcome(algod, 'TX', 50n, options)).toEqual({ status: 'confirmed' })
  })

  it('stops when asked to', async () => {
    const algod = node({ pending: [{}], rounds: [1n, 2n, 3n] })
    let checks = 0
    const outcome = await waitForGroupOutcome(algod, 'TX', 1000n, {
      ...options,
      shouldStop: () => ++checks > 2
    })
    expect(outcome).toEqual({ status: 'unknown' })
  })

  it('terminates on a node that never advances and never answers (iteration cap)', async () => {
    const algod = node({ pending: [{}], rounds: [7n] })
    expect(await waitForGroupOutcome(algod, 'TX', 1_000_000n, options)).toEqual({
      status: 'unknown'
    })
    expect(algod.calls.pending).toBe(1100)
  })
})
