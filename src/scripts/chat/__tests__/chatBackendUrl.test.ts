import { describe, expect, it } from 'vitest'
import { resolveChatBackendUrl } from '../chatBackendUrl'

describe('resolveChatBackendUrl', () => {
  it('uses the stage backend on the stage host', () => {
    expect(resolveChatBackendUrl('beta.dex.biatec.io')).toBe('https://stage.chat.biatec.io')
    expect(resolveChatBackendUrl('BETA.dex.biatec.io')).toBe('https://stage.chat.biatec.io')
  })

  it('uses production everywhere else', () => {
    expect(resolveChatBackendUrl('dex.biatec.io')).toBe('https://chat.biatec.io')
    expect(resolveChatBackendUrl('www.dex.biatec.io')).toBe('https://chat.biatec.io')
    expect(resolveChatBackendUrl('localhost')).toBe('https://chat.biatec.io')
    expect(resolveChatBackendUrl(undefined)).toBe('https://chat.biatec.io')
  })

  it('lets VITE_BIATEC_CHAT_URL override the host', () => {
    expect(resolveChatBackendUrl('dex.biatec.io', 'http://localhost:5000')).toBe(
      'http://localhost:5000'
    )
  })
})
