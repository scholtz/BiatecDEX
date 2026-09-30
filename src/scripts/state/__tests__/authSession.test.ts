import { describe, expect, it } from 'vitest'
import algosdk from 'algosdk'
import {
  AUTH_SESSION_MAX_AGE_MS,
  parseAuthSession,
  serializeAuthSession,
  type AuthSessionSource
} from '../authSession'

const account = algosdk.generateAccount().addr.toString()
const signedIn: AuthSessionSource = {
  isAuthenticated: true,
  wallet: 'arc76',
  account,
  arc76email: 'user@example.com'
}
const NOW = 1_800_000_000_000

describe('serializeAuthSession', () => {
  it('stores nothing unless an ARC-76 session is fully signed in', () => {
    expect(serializeAuthSession({ ...signedIn, isAuthenticated: false }, NOW)).toBeNull()
    expect(serializeAuthSession({ ...signedIn, account: '' }, NOW)).toBeNull()
    expect(serializeAuthSession({ ...signedIn, wallet: 'pera' }, NOW)).toBeNull()
  })

  it('never includes secrets, even if the source object carries them', () => {
    const source = {
      ...signedIn,
      password: 'super secret password 123',
      password2: 'super secret password 123',
      m: 'word '.repeat(25),
      arc14Header: 'SigTx AAAA'
    } as AuthSessionSource
    const raw = serializeAuthSession(source, NOW)!
    expect(raw).not.toMatch(/secret|word word|SigTx|password|arc14Header/)
    expect(JSON.parse(raw)).toEqual({ account, arc76email: 'user@example.com', savedAt: NOW })
  })
})

describe('parseAuthSession', () => {
  const raw = serializeAuthSession(signedIn, NOW)!

  it('round-trips a fresh session', () => {
    expect(parseAuthSession(raw, NOW + 60_000)).toEqual({
      isAuthenticated: true,
      wallet: 'arc76',
      account,
      arc76email: 'user@example.com'
    })
  })

  it('rejects an expired session', () => {
    expect(parseAuthSession(raw, NOW + AUTH_SESSION_MAX_AGE_MS + 1)).toBeNull()
  })

  it('rejects a session saved in the future (clock tampering)', () => {
    expect(parseAuthSession(raw, NOW - 60_000)).toBeNull()
  })

  it('rejects malformed input without throwing', () => {
    for (const bad of [null, '', 'not json', '[]', '{}', 'null', '"x"']) {
      expect(parseAuthSession(bad, NOW)).toBeNull()
    }
    const base = JSON.parse(raw)
    expect(parseAuthSession(JSON.stringify({ ...base, account: 'NOTANADDRESS' }), NOW)).toBeNull()
    expect(parseAuthSession(JSON.stringify({ ...base, arc76email: 'nope' }), NOW)).toBeNull()
    expect(parseAuthSession(JSON.stringify({ ...base, savedAt: 'x' }), NOW)).toBeNull()
  })
})
