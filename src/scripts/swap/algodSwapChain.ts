import type algosdk from 'algosdk'
import errorMessage from '@/scripts/common/errorMessage'
import { httpStatusOf } from '@/scripts/common/httpStatus'
import { isDefiniteSubmitRejection } from '@/scripts/algo/submitRejection'
import { withTimeout } from '@/scripts/common/withTimeout'
import type { SwapChain } from './executeSwap'

/** No algod call may hang the order: a stalled node counts as an error / unknown outcome. */
export const ALGOD_CALL_TIMEOUT_MS = 20_000

export const algodSwapChain = (algod: algosdk.Algodv2): SwapChain => ({
  async send(signed) {
    try {
      await withTimeout(algod.sendRawTransaction(signed).do(), ALGOD_CALL_TIMEOUT_MS)
      return { accepted: true }
    } catch (error) {
      // The rule (400 only, "already known" excepted) lives in scripts/algo/submitRejection.ts.
      if (isDefiniteSubmitRejection(error)) {
        return { accepted: false, message: errorMessage(error) }
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
