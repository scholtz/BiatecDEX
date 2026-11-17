/**
 * What happened to a submitted transaction group. A group stays valid until its `lastValid`
 * round, so "not confirmed after a few rounds" is not an answer: offering the form again while
 * the first group can still confirm lets the user convert twice. This waits for a definite
 * outcome - confirmed, rejected by the node, or expired (provably never executed) - and says
 * `unknown` only when the node cannot be asked. Pure module (no Vue, no store).
 */
import { httpStatusOf } from '@/scripts/common/httpStatus'

export type GroupOutcome =
  | { status: 'confirmed' }
  | { status: 'rejected'; reason: string }
  /** `lastValid` passed without a confirmation: the group can never execute. */
  | { status: 'expired' }
  /** The node could not be asked (or the wait was stopped): the group may still confirm. */
  | { status: 'unknown' }

/** The slice of algosdk's Algodv2 used here (keeps the module testable without a node). */
export interface ConfirmationClient {
  pendingTransactionInformation(txid: string): {
    do(): Promise<{ confirmedRound?: bigint | number; poolError?: string }>
  }
  status(): { do(): Promise<{ lastRound: bigint | number }> }
  statusAfterBlock(round: bigint): { do(): Promise<{ lastRound: bigint | number }> }
}

export interface WaitOptions {
  /** Checked before every request; true ends the wait with `unknown`. */
  shouldStop?: () => boolean
  /** Pause after a failed request (injected in tests). */
  sleep?: (ms: number) => Promise<void>
}

/** Failed requests in a row after which the outcome is reported as unknown. */
const MAX_CONSECUTIVE_FAILURES = 5
const RETRY_DELAY_MS = 1_500
/** Hard cap of the loop: the longest validity window (1000 rounds) plus the retries. */
const MAX_ITERATIONS = 1_100

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

export const waitForGroupOutcome = async (
  algod: ConfirmationClient,
  txid: string,
  lastValid: bigint,
  options: WaitOptions = {}
): Promise<GroupOutcome> => {
  const shouldStop = options.shouldStop ?? (() => false)
  const sleep = options.sleep ?? defaultSleep
  let round: bigint | undefined
  let failures = 0
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    if (shouldStop()) return { status: 'unknown' }
    try {
      let info: { confirmedRound?: bigint | number; poolError?: string } | undefined
      try {
        info = await algod.pendingTransactionInformation(txid).do()
      } catch (error) {
        // 404: this node does not know the transaction (yet, or any more). Not an outcome.
        if (httpStatusOf(error) !== 404) throw error
      }
      if (info?.confirmedRound !== undefined && BigInt(info.confirmedRound) > 0n) {
        return { status: 'confirmed' }
      }
      if (info?.poolError) return { status: 'rejected', reason: info.poolError }
      // Asked again after the node passed `lastValid` and still not confirmed: it never will be.
      if (round !== undefined && round > lastValid) return { status: 'expired' }
      const status =
        round === undefined ? await algod.status().do() : await algod.statusAfterBlock(round).do()
      const next = BigInt(status.lastRound)
      // A node that does not advance must not turn the wait into a busy loop.
      if (round !== undefined && next <= round) await sleep(RETRY_DELAY_MS)
      round = round === undefined || next > round ? next : round
      failures = 0
    } catch (error) {
      console.error('Unable to check the transaction group', error)
      if (++failures >= MAX_CONSECUTIVE_FAILURES) return { status: 'unknown' }
      await sleep(RETRY_DELAY_MS)
    }
  }
  return { status: 'unknown' }
}
