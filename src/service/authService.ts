import algosdk from 'algosdk'
import { generateAlgorandAccount } from 'arc76'
import { makeArc14AuthHeader, makeArc14TxWithSuggestedParams } from 'arc14'
import { uuidv7 } from 'uuidv7'
import { useAppStore } from '@/stores/app'

let sessionCache: string | null = null

export function getSessionId(): string {
  if (sessionCache) return sessionCache
  try {
    const existing = localStorage.getItem('session')
    if (existing) {
      sessionCache = existing
      return existing
    }
  } catch {
    // ignore
  }
  const s = uuidv7()
  try {
    localStorage.setItem('session', s)
  } catch {
    // ignore
  }
  sessionCache = s
  return s
}

export async function getAuthToken(): Promise<string> {
  const session = getSessionId()
  const account: algosdk.Account = await generateAlgorandAccount(session)
  // Suggested params (genesis + validity round window) must come from the active
  // network's algod, not be hardcoded: a fixed round window goes stale within
  // ~45-50 minutes and a fixed genesis only ever authenticates against mainnet.
  const store = useAppStore()
  const algod = new algosdk.Algodv2(
    store.state.algodToken,
    store.state.algodHost,
    store.state.algodPort
  )
  const params = await algod.getTransactionParams().do()
  const tx = await makeArc14TxWithSuggestedParams(
    'BiatecScan#ARC14',
    account.addr.toString(),
    params
  )
  const signed = tx.signTxn(account.sk)
  const header = makeArc14AuthHeader(signed)
  return header
}
