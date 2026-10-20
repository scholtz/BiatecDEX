// The same Docker image is deployed to stage (beta.dex.biatec.io) and then promoted to production
// (dex.biatec.io), so the chat backend cannot be a build-time constant: it is picked from the host.
export const CHAT_BACKEND_PRODUCTION = 'https://chat.biatec.io'
export const CHAT_BACKEND_STAGE = 'https://stage.chat.biatec.io'

const STAGE_HOSTS = new Set(['beta.dex.biatec.io', 'stage.dex.biatec.io'])

/** `override` (VITE_BIATEC_CHAT_URL) wins; stage hosts use the stage backend, everything else production. */
export const resolveChatBackendUrl = (hostname: string | undefined, override?: string): string => {
  if (override) return override
  return hostname && STAGE_HOSTS.has(hostname.toLowerCase())
    ? CHAT_BACKEND_STAGE
    : CHAT_BACKEND_PRODUCTION
}
