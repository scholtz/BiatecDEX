// The same Docker image is deployed to stage (beta.dex.biatec.io) and then promoted to production
// (dex.biatec.io), so the chat backend cannot be a build-time constant: it is picked from the host.
export const CHAT_BACKEND_PRODUCTION = 'https://chat.biatec.io'
export const CHAT_BACKEND_STAGE = 'https://stage.chat.biatec.io'
// beta.dex.biatec.io serves the stage chat backend from its own origin: the ingress forwards /chat (full path)
// to the chat backend at stage.chat.biatec.io (k8s/beta/deployment-beta.yaml), so the session cookie is first-party and no
// request is cross-origin. The backend knows this host and prefix by configuration.
const BETA_HOST = 'beta.dex.biatec.io'
export const CHAT_BACKEND_BETA = `https://${BETA_HOST}/chat`

// The backend of each host that is not production. A Map, so a host called "constructor" finds nothing. Other stage hosts
// have no /chat mount and still call the stage backend cross-origin.
const BACKEND_BY_HOST = new Map<string, string>([
  [BETA_HOST, CHAT_BACKEND_BETA],
  ['stage.dex.biatec.io', CHAT_BACKEND_STAGE]
])

/**
 * `override` (VITE_BIATEC_CHAT_URL) wins; beta uses its own origin's /chat, other stage hosts the stage backend,
 * everything else production.
 */
export const resolveChatBackendUrl = (hostname: string | undefined, override?: string): string => {
  if (override) return override
  // A trailing dot ("beta.dex.biatec.io.") is the same host.
  const host = hostname?.toLowerCase().replace(/\.$/, '')
  return (host && BACKEND_BY_HOST.get(host)) || CHAT_BACKEND_PRODUCTION
}
