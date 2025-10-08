import algosdk, { type SuggestedParams } from 'algosdk'
import { generateAlgorandAccount } from 'arc76'
import { makeArc14AuthHeader, makeArc14TxWithSuggestedParams } from 'arc14'
import { Buffer } from 'buffer'
import { uuidv7 } from 'uuidv7'

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
  const params: SuggestedParams = {
    fee: 1000n,
    genesisHash: new Uint8Array(
      Buffer.from('wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=', 'base64')
    ),
    genesisID: 'mainnet-v1.0',
    lastValid: 46916880n,
    minFee: 1000n,
    flatFee: false,
    firstValid: 46915880n
  }
  const tx = await makeArc14TxWithSuggestedParams(
    'BiatecScan#ARC14',
    account.addr.toString(),
    params
  )
  const signed = tx.signTxn(account.sk)
  const header = makeArc14AuthHeader(signed)
  return header
}
