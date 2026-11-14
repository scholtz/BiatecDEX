import type algosdk from 'algosdk'
import errorMessage from '@/scripts/common/errorMessage'
import { httpStatusOf } from '@/scripts/common/httpStatus'
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

export const algodSwapChain = (algod: algosdk.Algodv2): SwapChain => ({
  async send(signed) {
    try {
      await algod.sendRawTransaction(signed).do()
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
      const info = await algod.pendingTransactionInformation(txId).do()
      return { confirmedRound: BigInt(info.confirmedRound ?? 0), poolError: info.poolError ?? '' }
    } catch (error) {
      if (httpStatusOf(error) === 404) return null
      throw error
    }
  },
  async lastRound() {
    const status = await algod.status().do()
    return BigInt(status.lastRound)
  },
  async waitForRoundAfter(round) {
    await algod.statusAfterBlock(round).do()
  }
})
