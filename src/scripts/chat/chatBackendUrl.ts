// The same Docker image is deployed to stage (beta.dex.biatec.io) and then promoted to production
// (dex.biatec.io), so the chat backend cannot be a build-time constant: it is picked from the host.
export const CHAT_BACKEND_PRODUCTION = 'https://chat.biatec.io'
export const CHAT_BACKEND_STAGE = 'https://stage.chat.biatec.io'
// beta.dex.biatec.io serves the stage chat backend from its own origin: the ingress forwards /chat (full path)
// to namespace biatec-chat-stage (k8s/beta/deployment-beta.yaml), so the session cookie is first-party and no
// request is cross-origin. The backend knows this host and prefix by configuration.
const BETA_HOST = 'beta.dex.biatec.io'
export const CHAT_BACKEND_BETA = `https://${BETA_HOST}/chat`

// Other stage hosts have no /chat mount and still call the stage backend cross-origin.
const STAGE_HOSTS = new Set(['stage.dex.biatec.io'])

/**
 * `override` (VITE_BIATEC_CHAT_URL) wins; beta uses its own origin's /chat, other stage hosts the stage backend,
 * everything else production.
 */
export const resolveChatBackendUrl = (hostname: string | undefined, override?: string): string => {
  if (override) return override
  const host = hostname?.toLowerCase()
  if (host === BETA_HOST) return CHAT_BACKEND_BETA
  return host && STAGE_HOSTS.has(host) ? CHAT_BACKEND_STAGE : CHAT_BACKEND_PRODUCTION
}
