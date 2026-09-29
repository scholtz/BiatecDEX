import type { Page } from '@playwright/test'

/**
 * The trade reporter API rejects localhost origins (CORS), so requests from the local
 * dev/preview server are forwarded Node-side with the original headers (minus
 * origin/referer/host - stripping everything would drop the ARC-14 Authorization and
 * yield 401). Works for both the mainnet and the testnet reporter.
 */
export async function proxyTradeApi(page: Page): Promise<void> {
  await page.route(/\/\/api\.(algorand|testnet)\.scan\.biatec\.io\//, async (route) => {
    const req = route.request()
    const headers: Record<string, string> = {}
    for (const [k, v] of Object.entries(req.headers())) {
      if (!['origin', 'referer', 'host', 'content-length'].includes(k.toLowerCase())) headers[k] = v
    }
    try {
      const res = await fetch(req.url(), {
        method: req.method(),
        headers,
        body: req.method() === 'GET' ? undefined : (req.postData() ?? undefined)
      })
      const body = Buffer.from(await res.arrayBuffer())
      await route.fulfill({
        status: res.status,
        headers: {
          'content-type': res.headers.get('content-type') ?? 'application/json',
          'access-control-allow-origin': '*'
        },
        body
      })
    } catch (e) {
      await route.abort()
      console.warn('proxy failed', req.url(), e)
    }
  })
}
