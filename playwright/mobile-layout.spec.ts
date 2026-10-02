import { test, expect, type Page } from '@playwright/test'
import { MAINNET, prepare } from './helpers/app'
import { proxyTradeApi } from './helpers/tradeApiProxy'

/**
 * Mobile layout audit: every main route is opened at phone widths and checked for the classic mobile failures -
 * horizontal page scrolling, form inputs squeezed to nothing (the add-liquidity price / deposit fields once showed "0," only
 * because two half-width columns, stacked spinner buttons and a symbol addon left the digits no room), and controls that
 * overflow the viewport. Screenshots are attached to the report for a visual check.
 */
const PHONES = [
  { name: 'phone 360', width: 360, height: 740 },
  { name: 'phone 390', width: 390, height: 844 }
] as const

const ROUTES: { name: string; path: string }[] = [
  { name: 'trade', path: `/en/trade/${MAINNET}/vote/usd` },
  { name: 'liquidity', path: `/en/liquidity/${MAINNET}/vote/usd` },
  { name: 'explore assets', path: '/en/explore-assets' },
  { name: 'trader dashboard', path: '/en/trader' },
  { name: 'liquidity provider', path: '/en/liquidity-provider' },
  { name: 'settings', path: '/en/settings' },
  { name: 'about', path: '/en/about' },
  { name: 'help', path: '/en/help' }
]

/** The page is settled when the network is quiet (the proxied API answered) and the layout had a moment to follow. */
async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined)
  await page.waitForTimeout(1500)
}

interface Offender {
  selector: string
  width: number
  right: number
}

async function audit(page: Page, vw: number) {
  return page.evaluate((viewport) => {
    const describe = (el: Element) => {
      const id = el.id ? `#${el.id}` : ''
      const cls =
        typeof (el as HTMLElement).className === 'string'
          ? '.' + (el as HTMLElement).className.trim().split(/\s+/).slice(0, 3).join('.')
          : ''
      return `${el.tagName.toLowerCase()}${id}${cls}`
    }
    const doc = document.documentElement
    const interactive = 'button, a[href], input, select, textarea, [role=button], [role=menuitem]'
    // not user-visible: hidden, transparent, aria-hidden or a fixed overlay parked outside the viewport (toasts, closed menus)
    const invisible = (el: HTMLElement) => {
      for (let n: HTMLElement | null = el; n && n !== document.body; n = n.parentElement) {
        const cs = getComputedStyle(n)
        if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0)
          return true
        if (n.getAttribute('aria-hidden') === 'true') return true
        if (cs.position === 'fixed') return true
      }
      return false
    }
    // 1. elements sticking out of the viewport, unless inside a REAL horizontal scroller (auto / scroll). overflow hidden / clip
    //    is not exempt: that is exactly how a cut-off control hides - a clipped interactive element is reported below
    const offenders: { selector: string; width: number; right: number; why: string }[] = []
    for (const el of document.body.querySelectorAll<HTMLElement>('*')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0 || invisible(el)) continue
      let scroller: HTMLElement | null = el.parentElement
      let inScroller = false
      let clippedBy: DOMRect | null = null
      while (scroller && scroller !== document.body) {
        const ox = getComputedStyle(scroller).overflowX
        if (ox === 'auto' || ox === 'scroll') {
          inScroller = true
          break
        }
        if ((ox === 'hidden' || ox === 'clip') && !clippedBy)
          clippedBy = scroller.getBoundingClientRect()
        scroller = scroller.parentElement
      }
      if (inScroller) continue
      if (clippedBy && el.matches(interactive) && r.right > clippedBy.right + 1) {
        offenders.push({
          selector: describe(el),
          width: Math.round(r.width),
          right: Math.round(r.right),
          why: 'control cut off by its container'
        })
      } else if (!clippedBy && r.right > viewport + 1) {
        offenders.push({
          selector: describe(el),
          width: Math.round(r.width),
          right: Math.round(r.right),
          why: 'beyond the viewport'
        })
      }
    }
    // 2. form inputs the user cannot read: the text area of an editable field must have room for several characters.
    //    Search / filter boxes of select overlays, read-only helper inputs and anything in an overlay are not form fields.
    const squeezed: { selector: string; width: number }[] = []
    for (const input of document.querySelectorAll<HTMLInputElement>(
      'input.p-inputtext:not([readonly]):not([type=hidden]):not([type=checkbox]):not([type=radio]), input.p-inputnumber-input'
    )) {
      if (
        invisible(input) ||
        input.closest(
          '.p-overlay, .p-popover, .p-dialog, .p-select-overlay, .p-multiselect-overlay'
        )
      )
        continue
      if (input.closest('.p-select, .p-multiselect, .p-autocomplete-input-multiple')) continue
      const r = input.getBoundingClientRect()
      const style = getComputedStyle(input)
      if (r.width === 0 || r.height === 0) continue
      const text = r.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      if (text < 56)
        squeezed.push({
          selector: describe(input) + (input.id ? '' : ` [${input.placeholder || input.name}]`),
          width: Math.round(text)
        })
    }
    return {
      pageScrollWidth: doc.scrollWidth,
      viewport,
      offenders: offenders.slice(0, 12),
      squeezed
    }
  }, vw)
}

for (const phone of PHONES) {
  for (const route of ROUTES) {
    test(`${phone.name}: ${route.name} has no horizontal overflow and readable inputs`, async ({
      page
    }, info) => {
      test.setTimeout(120_000)
      await prepare(page, { bypassAuth: true })
      await proxyTradeApi(page)
      await page.setViewportSize({ width: phone.width, height: phone.height })
      await page.goto(route.path, { waitUntil: 'domcontentloaded' })
      await page.getByRole('button', { name: 'Navigation' }).waitFor({ timeout: 60_000 })
      await settle(page)

      const result = await audit(page, phone.width)
      await info.attach(`${phone.name} ${route.name}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png'
      })
      const detail = JSON.stringify(result, null, 1)
      expect(result.pageScrollWidth, `horizontal page scroll\n${detail}`).toBeLessThanOrEqual(
        phone.width + 1
      )
      expect(result.offenders as Offender[], `elements beyond the viewport\n${detail}`).toEqual([])
      expect(result.squeezed, `inputs too narrow to read\n${detail}`).toEqual([])
    })
  }
}

test('phone: the navigation toggle is a comfortable touch target', async ({ browser }) => {
  // a touch device (pointer: coarse) - the hamburger used to be 17x24 px
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true
  })
  const page = await context.newPage()
  await prepare(page, { bypassAuth: true })
  await proxyTradeApi(page)
  await page.goto(`/en/trade/${MAINNET}/vote/usd`, { waitUntil: 'domcontentloaded' })
  const toggle = page.getByRole('button', { name: 'Navigation' })
  await toggle.waitFor({ timeout: 60_000 })
  await settle(page) // data-driven buttons (table actions, Max, ...) exist only after the API answered
  const rem = await page.evaluate(() =>
    parseFloat(getComputedStyle(document.documentElement).fontSize)
  )
  const minTouch = 2.25 * rem // 36 px at the default root size - the value app.css sets
  const box = await toggle.boundingBox()
  expect(box!.width).toBeGreaterThanOrEqual(minTouch - 1)
  expect(box!.height).toBeGreaterThanOrEqual(minTouch - 1)
  const small: string[] = []
  for (const button of await page.locator('button.p-button:visible:not(.p-button-link)').all()) {
    const b = await button.boundingBox()
    if (b && b.height < minTouch - 1) {
      const label =
        (await button.innerText()).trim().slice(0, 20) ||
        (await button.getAttribute('aria-label')) ||
        (await button.getAttribute('class')) ||
        'icon'
      small.push(`${label} ${Math.round(b.height)}px`)
    }
  }
  expect(small, 'buttons are at least 36 px tall on touch phones').toEqual([])
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
    'touch sizing must not cause horizontal scrolling'
  ).toBeLessThanOrEqual(390)
  await toggle.tap()
  await expect(page.getByRole('menuitem').first()).toBeVisible()
  await context.close()
})

test('phone 390: add-liquidity price and deposit fields show their numbers', async ({
  page
}, info) => {
  test.setTimeout(150_000)
  await prepare(page, { bypassAuth: true })
  await proxyTradeApi(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`/en/liquidity/${MAINNET}/vote/usd`, { waitUntil: 'domcontentloaded' })
  const low = page.locator('#lowPrice')
  await low.waitFor({ timeout: 90_000 })
  await settle(page)

  for (const id of ['#lowPrice', '#highPrice', '#depositAssetAmount', '#depositCurrencyAmount']) {
    const box = await page.locator(id).boundingBox()
    expect(box, id).not.toBeNull()
    expect(box!.width, `${id} must have room for digits on a phone`).toBeGreaterThanOrEqual(90)
    expect(box!.x + box!.width, `${id} inside the viewport`).toBeLessThanOrEqual(390)
  }
  // a typed value must be fully visible (not clipped by the input's own width)
  await low.fill('0.00123456')
  const clipped = await low.evaluate((el: HTMLInputElement) => el.scrollWidth > el.clientWidth + 1)
  expect(clipped, 'a typical price must fit inside the low price input').toBe(false)
  await info.attach('add liquidity form', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png'
  })
})

test('phone 360: a very long pair symbol is truncated, the number keeps its room', async ({
  page
}) => {
  test.setTimeout(150_000)
  await prepare(page, { bypassAuth: true })
  await proxyTradeApi(page)
  await page.setViewportSize({ width: 360, height: 740 })
  await page.goto(`/en/liquidity/${MAINNET}/vote/usd`, { waitUntil: 'domcontentloaded' })
  await page.locator('#lowPrice').waitFor({ timeout: 90_000 })
  await settle(page)
  // simulate an asset with a long unit name in every symbol addon of the form
  await page.evaluate(() => {
    for (const el of document.querySelectorAll<HTMLElement>(
      '.p-inputgroupaddon:not(:has(.p-button)) > div'
    ))
      el.textContent = 'GOLDDAO$$/USDCaUSDCa'
  })
  for (const id of ['#lowPrice', '#highPrice', '#depositAssetAmount', '#depositCurrencyAmount']) {
    const box = await page.locator(id).boundingBox()
    expect(box!.width, `${id} keeps room for digits next to a long symbol`).toBeGreaterThanOrEqual(
      80
    )
    expect(box!.x + box!.width, `${id} inside the viewport`).toBeLessThanOrEqual(360)
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
})
