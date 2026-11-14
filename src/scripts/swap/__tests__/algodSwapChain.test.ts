import { describe, expect, it } from 'vitest'
import type algosdk from 'algosdk'
import { algodSwapChain } from '../algodSwapChain'

const httpError = (status: number, message: string) =>
  Object.assign(new Error(message), { response: { status } })

const algodThatFails = (error: Error) =>
  // `unknown`: a two-method fake stands in for the full Algodv2 client.
  ({
    sendRawTransaction: () => ({
      do: async () => {
        throw error
      }
    }),
    pendingTransactionInformation: () => ({
      do: async () => {
        throw error
      }
    })
  }) as unknown as algosdk.Algodv2

describe('algodSwapChain', () => {
  it('reports an algod 400 as a rejection', async () => {
    const chain = algodSwapChain(algodThatFails(httpError(400, 'overspend')))
    expect(await chain.send([])).toEqual({ accepted: false, message: 'overspend' })
  })

  it('does not treat "already in ledger" as a rejection', async () => {
    const chain = algodSwapChain(algodThatFails(httpError(400, 'transaction already in ledger')))
    await expect(chain.send([])).rejects.toThrow('already in ledger')
  })

  it('treats 5xx and missing responses as unknown outcomes', async () => {
    await expect(
      algodSwapChain(algodThatFails(httpError(502, 'bad gateway'))).send([])
    ).rejects.toThrow()
    await expect(
      algodSwapChain(algodThatFails(new Error('socket hang up'))).send([])
    ).rejects.toThrow()
  })

  it('maps an unknown transaction (404) to null', async () => {
    expect(
      await algodSwapChain(algodThatFails(httpError(404, 'not found'))).pending('X')
    ).toBeNull()
  })
})
