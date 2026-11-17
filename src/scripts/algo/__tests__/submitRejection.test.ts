import { describe, expect, it } from 'vitest'
import { isDefiniteSubmitRejection } from '@/scripts/algo/submitRejection'

const httpError = (status: number, message = 'http ' + status) =>
  Object.assign(new Error(message), { response: { status } })

describe('isDefiniteSubmitRejection', () => {
  it('is true only for the validation rejection of the node (400)', () => {
    expect(isDefiniteSubmitRejection(httpError(400, 'overspend'))).toBe(true)
  })

  it('is false when an earlier delivery of the same submit got through', () => {
    for (const message of [
      'transaction already in ledger: TX',
      'TransactionPool.Remember: transaction already in the pool',
      'transaction already in pool'
    ]) {
      expect(isDefiniteSubmitRejection(httpError(400, message))).toBe(false)
    }
  })

  it('is false for proxy answers, server errors and failures without an answer', () => {
    for (const status of [401, 403, 404, 429, 500, 502, 503]) {
      expect(isDefiniteSubmitRejection(httpError(status))).toBe(false)
    }
    for (const error of [new Error('network timeout'), 'offline', null, undefined]) {
      expect(isDefiniteSubmitRejection(error)).toBe(false)
    }
  })
})
