// @vitest-environment node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CHAT_BACKEND_BETA } from '../chatBackendUrl'

// k8s/beta/deployment-beta.yaml carries the contract between the DEX and the Biatec Chat backend (see the
// biatec-chat repo, docs/integration-biatec-dex.md section 7). The details below were each verified against a
// real ingress-nginx: they are easy to get subtly wrong and nothing else in this repo would notice.
const manifest = readFileSync(resolve(process.cwd(), 'k8s/beta/deployment-beta.yaml'), 'utf8')
const documents = manifest.split(/^---\s*$/m)
const doc = (kind: string, name: string): string => {
  const found = documents.find(
    (d) =>
      new RegExp(`^kind: ${kind}$`, 'm').test(d) && new RegExp(`^  name: ${name}$`, 'm').test(d)
  )
  expect(found, `${kind} ${name}`).toBeDefined()
  return found as string
}

describe('chat on the DEX origin (k8s/beta/deployment-beta.yaml)', () => {
  const service = doc('Service', 'biatec-chat-backend')
  const ingress = doc('Ingress', 'biatec-dex-beta-chat')

  it('reaches the chat backend of its own namespace through an ExternalName service', () => {
    expect(service).toMatch(/^  type: ExternalName$/m)
    expect(service).toMatch(
      /^  externalName: biatec-chat-backend\.biatec-chat-stage\.svc\.cluster\.local$/m
    )
    expect(service).toMatch(/^  namespace: biatec$/m)
    expect(ingress).toMatch(/^  namespace: biatec$/m)
  })

  it('forwards the full path: /chat and below only, anchored, with an identity rewrite', () => {
    // Anchored with $: without it /chatty would match as /chat. The rewrite re-sends the captured full path, prefix
    // included; the backend moves the prefix to its path base itself and reads no forwarded-prefix header.
    expect(ingress).toContain('path: /(chat(?:/.*)?)$')
    expect(ingress).toMatch(/rewrite-target: \/\$1$/m)
    expect(ingress).not.toMatch(/X-Forwarded-Prefix/i)
    expect(ingress).toMatch(/pathType: ImplementationSpecific/)
    expect(CHAT_BACKEND_BETA).toBe('https://beta.dex.biatec.io/chat')
  })

  it('keeps the DEX host and streams server-sent events unbuffered', () => {
    expect(ingress).toMatch(/- host: beta\.dex\.biatec\.io$/m)
    expect(ingress).toMatch(/proxy-buffering: "off"/)
    expect(ingress).toMatch(/proxy-read-timeout: "300"/)
    expect(ingress).not.toMatch(/upstream-vhost/)
  })

  it('asks for no second certificate: the host certificate belongs to the DEX ingress', () => {
    expect(ingress).not.toMatch(/cert-manager\.io/)
    expect(ingress).not.toMatch(/^  tls:/m)
  })

  it('leaves the DEX catch-all ingress as it was', () => {
    const dex = doc('Ingress', 'biatec-dex-beta')
    expect(dex).toContain('path: /(.*)')
    expect(dex).toMatch(/rewrite-target: \/\$1$/m)
    expect(dex).toMatch(/secretName: tls-beta\.dex\.biatec\.io/)
  })

  it('mentions the image name on one line only: the stage deploy rewrites every line that has it', () => {
    // .github/workflows/deploy-stage.yml: sed "s~${IMAGE}.*~${IMAGE}:${version}~g" on this file.
    const lines = manifest.split('\n').filter((l) => l.includes('scholtz2/biatec-dex'))
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatch(/^\s+image: scholtz2\/biatec-dex:/)
  })
})
