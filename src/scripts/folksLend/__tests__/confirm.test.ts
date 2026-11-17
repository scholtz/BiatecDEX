import { describe, expect, it } from 'vitest'
import {
  submitGroup,
  waitForGroupOutcome,
  type ConfirmationClient
} from '@/scripts/folksLend/confirm'

type Pending = { confirmedRound?: bigint | number; poolError?: string }

/** A node whose answers are scripted per call; the last answer repeats. */
const node = (script: {
  pending: (Pending | Error)[]
  rounds: (bigint | Error)[]
  send?: Error
}): ConfirmationClient & { calls: { pending: number; status: number; send: number } } => {
  const calls = { pending: 0, status: 0, send: 0 }
  const at = <T>(list: T[], index: number): T => list[Math.min(index, list.length - 1)]
  const answer = async <T>(value: T | Error): Promise<T> => {
    if (value instanceof Error) throw value
    return value
  }
  const round = () => answer(at(script.rounds, calls.status++)).then((r) => ({ lastRound: r }))
  return {
    calls,
    sendRawTransaction: () => ({
      do: async () => {
        calls.send++
        if (script.send) throw script.send
        return { txid: 'TX' }
      }
    }),
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
    // lastValid 103: expired only after round 113 (margin 10) and two unconfirmed lookups.
    const rounds = Array.from({ length: 20 }, (_, i) => 101n + BigInt(i))
    const algod = node({ pending: [{}], rounds })
    expect(await waitForGroupOutcome(algod, 'TX', 103n, options)).toEqual({ status: 'expired' })
    // Lookups before rounds 101..114 are known (14), then two more past the margin.
    expect(algod.calls.pending).toBe(16)
  })

  it('does not call a group expired right after its last valid round', async () => {
    // The node reports 104..112 (past lastValid 103, inside the margin), then the confirmation.
    const pending: Pending[] = [...Array.from({ length: 8 }, () => ({})), { confirmedRound: 103n }]
    const rounds = Array.from({ length: 12 }, (_, i) => 104n + BigInt(i))
    const algod = node({ pending, rounds })
    expect(await waitForGroupOutcome(algod, 'TX', 103n, options)).toEqual({ status: 'confirmed' })
  })

  it('needs two unconfirmed lookups past the margin (one may come from a lagging node)', async () => {
    // Round 120 is far past lastValid 103; the second lookup finds the confirmation.
    const algod = node({ pending: [{}, notFound, { confirmedRound: 103n }], rounds: [120n] })
    expect(await waitForGroupOutcome(algod, 'TX', 103n, options)).toEqual({ status: 'confirmed' })
    expect(algod.calls.pending).toBe(3)
  })

  it('reports the expiry of a group no node knows', async () => {
    const algod = node({ pending: [notFound], rounds: [120n, 121n, 122n] })
    expect(await waitForGroupOutcome(algod, 'TX', 103n, options)).toEqual({ status: 'expired' })
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

  it('does not hang on a node that stops answering', async () => {
    const algod = node({ pending: [{}], rounds: [1n] })
    algod.statusAfterBlock = () => ({ do: () => new Promise(() => {}) })
    expect(await waitForGroupOutcome(algod, 'TX', 50n, { ...options, callTimeoutMs: 5 })).toEqual({
      status: 'unknown'
    })
  })

  it('terminates on a node that never advances and never answers (iteration cap)', async () => {
    const algod = node({ pending: [{}], rounds: [7n] })
    expect(await waitForGroupOutcome(algod, 'TX', 1_000_000n, options)).toEqual({
      status: 'unknown'
    })
    expect(algod.calls.pending).toBe(1100)
  })
})

describe('submitGroup', () => {
  const signed = [new Uint8Array([1])]
  const httpError = (status: number) =>
    Object.assign(new Error('http ' + status), { response: { status } })

  it('sends the group and waits for its outcome', async () => {
    const algod = node({ pending: [{}, { confirmedRound: 5n }], rounds: [4n] })
    expect(await submitGroup(algod, signed, 'TX', 50n, options)).toEqual({ status: 'confirmed' })
    expect(algod.calls.send).toBe(1)
  })

  it('rethrows the validation rejection of the node (400): nothing was sent', async () => {
    const algod = node({ pending: [{}], rounds: [4n], send: httpError(400) })
    await expect(submitGroup(algod, signed, 'TX', 50n, options)).rejects.toThrow('http 400')
    expect(algod.calls.pending).toBe(0)
  })

  it('still waits when the answer to the send got lost: the group may have arrived', async () => {
    const alreadyKnown = Object.assign(new Error('transaction already in ledger: TX'), {
      response: { status: 400 }
    })
    for (const send of [
      new Error('network timeout'),
      httpError(502),
      // Proxy answers and a retried delivery of the same send are not rejections.
      httpError(403),
      httpError(429),
      alreadyKnown
    ]) {
      const algod = node({ pending: [notFound, { confirmedRound: 5n }], rounds: [4n], send })
      expect(await submitGroup(algod, signed, 'TX', 50n, options)).toEqual({
        status: 'confirmed'
      })
    }
  })

  it('does not hang on a send that never answers', async () => {
    const algod = node({ pending: [{ confirmedRound: 5n }], rounds: [4n] })
    algod.sendRawTransaction = () => ({ do: () => new Promise(() => {}) })
    expect(await submitGroup(algod, signed, 'TX', 50n, { ...options, callTimeoutMs: 5 })).toEqual({
      status: 'confirmed'
    })
  })

  it('reports the expiry when a lost send really never arrived', async () => {
    const algod = node({
      pending: [notFound],
      rounds: [70n, 71n, 72n],
      send: new Error('network timeout')
    })
    expect(await submitGroup(algod, signed, 'TX', 50n, options)).toEqual({ status: 'expired' })
  })
})
