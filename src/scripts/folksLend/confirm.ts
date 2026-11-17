/**
 * What happened to a submitted transaction group. A group stays valid until its `lastValid`
 * round, so "not confirmed after a few rounds" is not an answer: offering the form again while
 * the first group can still confirm lets the user convert twice. This waits for a definite
 * outcome - confirmed, rejected by the node, or expired (provably never executed) - and says
 * `unknown` only when the node cannot be asked. Pure module (no Vue, no store).
 */
import { httpStatusOf } from '@/scripts/common/httpStatus'
import { withTimeout } from '@/scripts/common/withTimeout'
import { isDefiniteSubmitRejection } from '@/scripts/algo/submitRejection'

export type GroupOutcome =
  | { status: 'confirmed' }
  | { status: 'rejected'; reason: string }
  /** `lastValid` passed (with a margin) without a confirmation: the group can never execute. */
  | { status: 'expired' }
  /** The node could not be asked: the group may still confirm. */
  | { status: 'unknown' }

/** The slice of algosdk's Algodv2 used here (keeps the module testable without a node). */
export interface ConfirmationClient {
  sendRawTransaction(signed: Uint8Array[]): { do(): Promise<{ txid: string }> }
  pendingTransactionInformation(txid: string): {
    do(): Promise<{ confirmedRound?: bigint | number; poolError?: string }>
  }
  status(): { do(): Promise<{ lastRound: bigint | number }> }
  statusAfterBlock(round: bigint): { do(): Promise<{ lastRound: bigint | number }> }
}

export interface WaitOptions {
  /** Pause after a failed request (injected in tests). */
  sleep?: (ms: number) => Promise<void>
  /** Longest a single request to the node may take (injected in tests). */
  callTimeoutMs?: number
}

/** Failed requests in a row after which the outcome is reported as unknown. */
const MAX_CONSECUTIVE_FAILURES = 5
const RETRY_DELAY_MS = 1_500
/**
 * No request may hang the wait: a stalled connection (laptop sleep, half-open socket) counts as
 * a failed request. Waiting for the next block normally answers within a few seconds.
 */
const CALL_TIMEOUT_MS = 20_000
/**
 * Hard cap of the loop: the longest validity window algod accepts (1000 rounds) plus the margin
 * and retries. Running into it ends as `unknown`, the safe answer.
 */
const MAX_ITERATIONS = 1_100
/**
 * Rounds past `lastValid` before "expired" is considered, and how many unconfirmed answers in
 * a row it takes (the numbers of the swap flow): behind a load balancer the round and the
 * transaction lookup can come from nodes that are a few rounds apart, and "this node does not
 * know the transaction" is weak evidence on its own.
 */
const EXPIRY_MARGIN_ROUNDS = 10n
const EXPIRY_CONFIRMATIONS = 2

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

export const waitForGroupOutcome = async (
  algod: ConfirmationClient,
  txid: string,
  lastValid: bigint,
  options: WaitOptions = {}
): Promise<GroupOutcome> => {
  const sleep = options.sleep ?? defaultSleep
  const timeout = options.callTimeoutMs ?? CALL_TIMEOUT_MS
  let round: bigint | undefined
  let failures = 0
  let unconfirmedPastExpiry = 0
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    try {
      let info: { confirmedRound?: bigint | number; poolError?: string } | undefined
      try {
        info = await withTimeout(algod.pendingTransactionInformation(txid).do(), timeout)
      } catch (error) {
        // 404: this node does not know the transaction (yet, or any more). Not an outcome.
        if (httpStatusOf(error) !== 404) throw error
      }
      if (info?.confirmedRound !== undefined && BigInt(info.confirmedRound) > 0n) {
        return { status: 'confirmed' }
      }
      if (info?.poolError) return { status: 'rejected', reason: info.poolError }
      // Asked again, twice, well after the node passed `lastValid`: it never will confirm.
      if (round !== undefined && round > lastValid + EXPIRY_MARGIN_ROUNDS) {
        if (++unconfirmedPastExpiry >= EXPIRY_CONFIRMATIONS) return { status: 'expired' }
      }
      const status = await withTimeout(
        round === undefined ? algod.status().do() : algod.statusAfterBlock(round).do(),
        timeout
      )
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

/**
 * Sends a signed group and waits for its outcome. A send that fails is NOT proof that nothing
 * was sent: the node may have accepted the group while the answer got lost (timeout, dropped
 * connection, a tab waking up, a delivery retried below the app). Only the definite rejection of
 * `isDefiniteSubmitRejection` (the rule shared with the swap flow) is rethrown. Anything else
 * is followed by the same wait as a successful send, so the form never offers a second
 * conversion while the first one can still confirm.
 */
export const submitGroup = async (
  algod: ConfirmationClient,
  signed: Uint8Array[],
  txid: string,
  lastValid: bigint,
  options: WaitOptions = {}
): Promise<GroupOutcome> => {
  try {
    await withTimeout(
      algod.sendRawTransaction(signed).do(),
      options.callTimeoutMs ?? CALL_TIMEOUT_MS
    )
  } catch (error) {
    if (isDefiniteSubmitRejection(error)) throw error
    console.error('Sending the group failed without an answer of the node; checking it', error)
  }
  return waitForGroupOutcome(algod, txid, lastValid, options)
}
