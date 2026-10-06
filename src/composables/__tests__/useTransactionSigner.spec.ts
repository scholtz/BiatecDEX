import { describe, it, expect, vi, beforeEach } from 'vitest'
import type algosdk from 'algosdk'

const sign = vi.fn()
const authStore = { wallet: 'arc76' }
vi.mock('algorand-authentication-component-vue', () => ({
  useAVMAuthentication: () => ({ authStore, sign })
}))

import { useTransactionSigner } from '../useTransactionSigner'

// Only identity matters: the composable never looks inside a transaction.
const txn = (name: string) => name as unknown as algosdk.Transaction
const group = [txn('a'), txn('b'), txn('c')]

describe('useTransactionSigner', () => {
  beforeEach(() => {
    sign.mockReset()
    sign.mockImplementation(async (txns: unknown[]) =>
      txns.map((t) => new Uint8Array([String(t).charCodeAt(0)]))
    )
  })

  it('hands an ARC-76 account only the transactions it was asked to sign', async () => {
    authStore.wallet = 'arc76'
    const signed = await useTransactionSigner()(group, [0, 2])
    expect(sign).toHaveBeenCalledWith([group[0], group[2]], [0, 2])
    expect(signed).toHaveLength(2) // one signature per requested index, as algosdk expects
  })

  it('passes the whole group to a use-wallet wallet, which handles the indexes itself', async () => {
    authStore.wallet = 'pera'
    await useTransactionSigner()(group, [1])
    expect(sign).toHaveBeenCalledWith(group, [1])
  })

  it('propagates a rejected signature (user cancelled)', async () => {
    authStore.wallet = 'arc76'
    sign.mockRejectedValueOnce(new Error('cancelled'))
    await expect(useTransactionSigner()(group, [0])).rejects.toThrow('cancelled')
  })
})
