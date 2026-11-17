import errorMessage from '@/scripts/common/errorMessage'
import { httpStatusOf } from '@/scripts/common/httpStatus'

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

/**
 * True only when a failed `sendRawTransaction` proves that the group never entered a pool, so
 * it can never execute. Everything else is an unknown outcome: the caller must keep checking
 * the group instead of offering the action again. The one rule for every submit in the app.
 */
// `unknown`: whatever a rejected request throws is not typed; it is narrowed right here.
export const isDefiniteSubmitRejection = (error: unknown): boolean => {
  const status = httpStatusOf(error)
  return (
    status !== undefined &&
    REJECTION_STATUSES.has(status) &&
    !ALREADY_SUBMITTED.test(errorMessage(error))
  )
}
