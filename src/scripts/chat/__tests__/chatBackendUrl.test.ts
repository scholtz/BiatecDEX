import { describe, expect, it } from 'vitest'
import { resolveChatBackendUrl } from '../chatBackendUrl'

describe('resolveChatBackendUrl', () => {
  it('uses the chat backend mounted on its own origin on beta', () => {
    expect(resolveChatBackendUrl('beta.dex.biatec.io')).toBe('https://beta.dex.biatec.io/chat')
    expect(resolveChatBackendUrl('BETA.dex.biatec.io')).toBe('https://beta.dex.biatec.io/chat')
    expect(resolveChatBackendUrl('beta.dex.biatec.io.')).toBe('https://beta.dex.biatec.io/chat')
  })

  it('keeps the page and the chat backend on one origin on beta (no cross-origin call)', () => {
    const backend = new URL(resolveChatBackendUrl('beta.dex.biatec.io'))
    expect(backend.origin).toBe('https://beta.dex.biatec.io')
    // The widget appends its routes to this URL, so the prefix has to be there and not end in a slash.
    expect(backend.pathname).toBe('/chat')
  })

  it('uses the stage backend on other stage hosts', () => {
    expect(resolveChatBackendUrl('stage.dex.biatec.io')).toBe('https://stage.chat.biatec.io')
    expect(resolveChatBackendUrl('STAGE.dex.biatec.io')).toBe('https://stage.chat.biatec.io')
  })

  it('uses production everywhere else', () => {
    expect(resolveChatBackendUrl('dex.biatec.io')).toBe('https://chat.biatec.io')
    expect(resolveChatBackendUrl('www.dex.biatec.io')).toBe('https://chat.biatec.io')
    expect(resolveChatBackendUrl('beta.dex.biatec.io.evil.example')).toBe('https://chat.biatec.io')
    expect(resolveChatBackendUrl('localhost')).toBe('https://chat.biatec.io')
    expect(resolveChatBackendUrl('constructor')).toBe('https://chat.biatec.io')
    expect(resolveChatBackendUrl('__proto__')).toBe('https://chat.biatec.io')
    expect(resolveChatBackendUrl(undefined)).toBe('https://chat.biatec.io')
  })

  it('lets VITE_BIATEC_CHAT_URL override the host', () => {
    expect(resolveChatBackendUrl('dex.biatec.io', 'http://localhost:5000')).toBe(
      'http://localhost:5000'
    )
    expect(resolveChatBackendUrl('beta.dex.biatec.io', 'http://localhost:5000')).toBe(
      'http://localhost:5000'
    )
  })
})
