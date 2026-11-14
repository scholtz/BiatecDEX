import type algosdk from 'algosdk'
import errorMessage from '@/scripts/common/errorMessage'
import { httpStatusOf } from '@/scripts/common/httpStatus'
import { withTimeout } from '@/scripts/common/withTimeout'
import type { SwapChain } from './executeSwap'

/**
 * Only algod's own validation rejection (400) proves a submit was refused before the group
 * entered any pool. Proxy answers (401/403/404/429), timeouts, 5xx and a missing response
 * may have been produced after the node accepted the group: an unknown outcome, polled.
 */
const REJECTION_STATUSES = new Set([400])

/**
 * A 400 that says the transaction is already known means an earlier (retried) delivery of the
 * same submit got through - that is not a rejection.
 */
const ALREADY_SUBMITTED = /already in (the )?(ledger|pool)|transaction already/i

/** No algod call may hang the order: a stalled node counts as an error / unknown outcome. */
export const ALGOD_CALL_TIMEOUT_MS = 20_000

export const algodSwapChain = (algod: algosdk.Algodv2): SwapChain => ({
  async send(signed) {
    try {
      await withTimeout(algod.sendRawTransaction(signed).do(), ALGOD_CALL_TIMEOUT_MS)
      return { accepted: true }
    } catch (error) {
      const status = httpStatusOf(error)
      const message = errorMessage(error)
      if (
        status !== undefined &&
        REJECTION_STATUSES.has(status) &&
        !ALREADY_SUBMITTED.test(message)
      ) {
        return { accepted: false, message }
      }
      throw error
    }
  },
  async pending(txId) {
    try {
      const info = await withTimeout(
        algod.pendingTransactionInformation(txId).do(),
        ALGOD_CALL_TIMEOUT_MS
      )
      return { confirmedRound: BigInt(info.confirmedRound ?? 0), poolError: info.poolError ?? '' }
    } catch (error) {
      if (httpStatusOf(error) === 404) return null
      throw error
    }
  },
  async lastRound() {
    const status = await withTimeout(algod.status().do(), ALGOD_CALL_TIMEOUT_MS)
    return BigInt(status.lastRound)
  },
  async waitForRoundAfter(round) {
    // statusAfterBlock long-polls; allow a few block times on top of the call timeout.
    await withTimeout(algod.statusAfterBlock(round).do(), ALGOD_CALL_TIMEOUT_MS)
  }
})
