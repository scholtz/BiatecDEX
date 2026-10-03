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

const TRADES = '[data-cy="trades-row"]'
const TABLE_ROWS = '.p-datatable-tbody > tr:not(.p-datatable-empty-message)'

const ROUTES: { name: string; path: string; ready?: string }[] = [
  { name: 'trade', path: `/en/trade/${MAINNET}/vote/usd`, ready: 'text=@' },
  { name: 'liquidity', path: `/en/liquidity/${MAINNET}/vote/usd`, ready: TRADES },
  { name: 'explore assets', path: '/en/explore-assets', ready: TABLE_ROWS },
  { name: 'trader dashboard', path: '/en/trader', ready: 'button:has-text("Opt in")' },
  { name: 'liquidity provider', path: '/en/liquidity-provider', ready: TABLE_ROWS },
  { name: 'settings', path: '/en/settings', ready: 'input.p-inputnumber-input' },
  { name: 'about', path: '/en/about', ready: 'h1, h2' },
  { name: 'help', path: '/en/help', ready: 'h1, h2' }
]

/** Two animation frames after the fonts are ready: layout work triggered by the last data update has run. */
async function layoutSettled(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    )
  })
}

/** Settled = the page's own data is on screen (the ready selector, the app keeps live connections so networkidle is unusable) and the layout caught up. */
async function settle(page: Page, ready?: string): Promise<void> {
  // The app keeps live connections open, so 'networkidle' is unreliable: wait for what the page is about instead.
  if (ready) await page.locator(ready).first().waitFor({ timeout: 60_000 })
  await layoutSettled(page) // layout follows the data
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
        if (cs.position === 'fixed') {
          // a fixed overlay parked outside the screen (closed menu, off-canvas toast) is not visible; one ON screen - a sticky
          // header, bottom bar, floating button - is audited like everything else
          const f = n.getBoundingClientRect()
          if (f.right <= 0 || f.left >= viewport || f.bottom <= 0 || f.top >= window.innerHeight)
            return true
        }
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
      let clipper: HTMLElement | null = null
      while (scroller && scroller !== document.body) {
        const ox = getComputedStyle(scroller).overflowX
        if (ox === 'auto' || ox === 'scroll') {
          inScroller = true
          break
        }
        if ((ox === 'hidden' || ox === 'clip') && !clippedBy) {
          clippedBy = scroller.getBoundingClientRect()
          clipper = scroller
        }
        scroller = scroller.parentElement
      }
      if (inScroller) continue
      // content a container cuts off: controls, images / icons and leaf text. A deliberate ellipsis (text-overflow) is fine.
      const cutOffContent =
        el.matches(interactive + ', img, svg') ||
        (el.children.length === 0 && !!el.textContent?.trim())
      if (
        clippedBy &&
        cutOffContent &&
        r.right > clippedBy.right + 2 &&
        getComputedStyle(clipper!).textOverflow !== 'ellipsis' &&
        !el.closest('.truncate, .p-ellipsis')
      ) {
        offenders.push({
          selector: describe(el),
          width: Math.round(r.width),
          right: Math.round(r.right),
          why: 'content cut off by its container'
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

// Tablets and small laptops: the same audit for the routes that carry forms (the trade order form, the dashboards).
const WIDE = [
  { name: 'tablet 768', width: 768, height: 1024 },
  { name: 'laptop 1024', width: 1024, height: 768 }
] as const

for (const viewport of WIDE) {
  for (const route of ROUTES.filter((r) =>
    ['trade', 'trader dashboard', 'liquidity provider'].includes(r.name)
  )) {
    test(`${viewport.name}: ${route.name} has no overflow and readable inputs`, async ({
      page
    }) => {
      test.setTimeout(120_000)
      await prepare(page, { bypassAuth: true })
      await proxyTradeApi(page)
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(route.path, { waitUntil: 'domcontentloaded' })
      await page
        .getByRole('button', { name: 'Navigation' })
        .or(page.getByRole('link', { name: 'Explore' }))
        .first()
        .waitFor({ timeout: 60_000 })
      await settle(page, route.ready)
      const result = await audit(page, viewport.width)
      const detail = JSON.stringify(result, null, 1)
      expect(
        result.pageScrollWidth,
        `horizontal page scroll
${detail}`
      ).toBeLessThanOrEqual(viewport.width + 1)
      expect(
        result.offenders as Offender[],
        `elements beyond the viewport
${detail}`
      ).toEqual([])
      expect(
        result.squeezed,
        `inputs too narrow to read
${detail}`
      ).toEqual([])
    })
  }
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
      await settle(page, route.ready)

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

for (const [orientation, viewport] of [
  ['portrait', { width: 390, height: 844 }],
  ['landscape', { width: 844, height: 390 }]
] as const) {
  test(`phone ${orientation}: the navigation toggle is a comfortable touch target`, async ({
    browser
  }) => {
    // a touch device (pointer: coarse) - the hamburger used to be 17x24 px
    const context = await browser.newContext({
      viewport,
      hasTouch: true,
      isMobile: true
    })
    const page = await context.newPage()
    await prepare(page, { bypassAuth: true })
    await proxyTradeApi(page)
    await page.goto(`/en/trade/${MAINNET}/vote/usd`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Login' }).waitFor({ timeout: 60_000 })
    await settle(page, 'text=@') // data-driven buttons (the order book, Max, ...) exist only after the API answered
    const rem = await page.evaluate(() =>
      parseFloat(getComputedStyle(document.documentElement).fontSize)
    )
    const minTouch = 2.25 * rem // 36 px at the default root size - the value app.css sets
    // the hamburger exists below the md breakpoint only (a landscape phone shows the full menu bar instead)
    const toggle = page.getByRole('button', { name: 'Navigation' })
    const hasToggle = (await toggle.count()) > 0 && (await toggle.isVisible())
    if (hasToggle) {
      const box = await toggle.boundingBox()
      expect(box!.width).toBeGreaterThanOrEqual(minTouch - 1)
      expect(box!.height).toBeGreaterThanOrEqual(minTouch - 1)
    } else {
      expect(
        viewport.width,
        'no hamburger only where the full menu bar fits'
      ).toBeGreaterThanOrEqual(768)
    }
    const small: string[] = []
    for (const button of await page
      .locator(
        'button.p-button:visible:not(.p-button-link):not(.p-datatable *):not(.p-paginator *):not(.p-toast *)'
      )
      .all()) {
      const b = await button.boundingBox()
      const iconOnly = (await button.getAttribute('class'))?.includes('p-button-icon-only')
      if (b && (b.height < minTouch - 1 || (iconOnly && b.width < minTouch - 1))) {
        const label =
          (await button.innerText()).trim().slice(0, 20) ||
          (await button.getAttribute('aria-label')) ||
          (await button.getAttribute('class')) ||
          'icon'
        small.push(`${label} ${Math.round(b.width)}x${Math.round(b.height)}px`)
      }
    }
    expect(small, 'buttons are at least 36 px tall on touch phones').toEqual([])
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
      'touch sizing must not cause horizontal scrolling'
    ).toBeLessThanOrEqual(viewport.width)
    if (hasToggle) {
      await toggle.tap()
      await expect(page.getByRole('menuitem').first()).toBeVisible()
    }
    await context.close()
  })
}

/** The tick width and LP fee options: every button inside the viewport, tall enough to tap, its text not clipped by the button. */
async function expectOptionsVisible(page: Page, width: number): Promise<void> {
  for (const sel of [
    '[data-cy^="tick-type-"]:not([data-cy^="tick-type-count"])',
    '[data-cy^="lp-fee-"]'
  ]) {
    const buttons = page.locator(sel)
    expect(await buttons.count(), `${sel}: options rendered`).toBeGreaterThanOrEqual(3)
    const bad = await buttons.evaluateAll(
      (els, vw) =>
        els
          .map((el) => {
            const r = el.getBoundingClientRect()
            return {
              id: el.getAttribute('data-cy'),
              clipped: el.scrollWidth > el.clientWidth + 1,
              outside: r.left < 0 || r.right > vw,
              short: r.height < 36
            }
          })
          .filter((b) => b.clipped || b.outside || b.short),
      width
    )
    expect(bad, `${sel} at ${width}px: options must be fully visible`).toEqual([])
  }
}

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

for (const locale of ['sk', 'de', 'ru', 'hu']) {
  for (const width of [320, 360, 768]) {
    test(`${locale} ${width}: tick width and LP fee options stay visible`, async ({ page }) => {
      test.setTimeout(150_000)
      await prepare(page, { bypassAuth: true })
      await proxyTradeApi(page)
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`/${locale}/liquidity/${MAINNET}/vote/usd`, { waitUntil: 'domcontentloaded' })
      await page.locator('#lowPrice').waitFor({ timeout: 90_000 })
      await settle(page)
      await expectOptionsVisible(page, width)
    })
  }
}

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

// The Add Liquidity card is a side column on wide screens and the page stacks below xl, so its room depends on the layout, not
// only on the phone breakpoint: it used to be ~175 px wide (digits squeezed to 2 px) between 768 and ~1100 px.
for (const width of [320, 360, 640, 700, 768, 1024, 1280, 1400, 1920]) {
  test(`width ${width}: add-liquidity fields keep room for digits`, async ({ page }) => {
    test.setTimeout(150_000)
    await prepare(page, { bypassAuth: true })
    await proxyTradeApi(page)
    await page.setViewportSize({ width, height: 900 })
    await page.goto(`/en/liquidity/${MAINNET}/vote/usd`, { waitUntil: 'domcontentloaded' })
    await page.locator('#lowPrice').waitFor({ timeout: 90_000 })
    await settle(page, TRADES)
    for (const id of ['#lowPrice', '#highPrice', '#depositAssetAmount', '#depositCurrencyAmount']) {
      const room = await page.locator(id).evaluate((el: HTMLInputElement) => {
        const cs = getComputedStyle(el)
        return (
          el.getBoundingClientRect().width -
          parseFloat(cs.paddingLeft) -
          parseFloat(cs.paddingRight)
        )
      })
      expect(room, `${id} at ${width}px: room for the digits`).toBeGreaterThanOrEqual(90)
    }
    await expectOptionsVisible(page, width)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width
    )
  })
}

// The swap and remove-liquidity forms are reached through the pool rows of the liquidity page; their ids come from the live pool
// list, so the links are read from the page instead of being hard-coded.
for (const kind of ['swap', 'remove'] as const) {
  test(`phone 360: the ${kind} form has no overflow and readable inputs`, async ({
    page
  }, info) => {
    test.setTimeout(180_000)
    await prepare(page, { bypassAuth: true })
    await proxyTradeApi(page)
    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto(`/en/liquidity/${MAINNET}/vote/usd`, { waitUntil: 'domcontentloaded' })
    await settle(page, TRADES)
    // client-side navigation, like a user tapping the pool row: the form needs the pair the liquidity page already resolved
    const link = page.locator(`a[href*="/${kind}"]`).first()
    await link.scrollIntoViewIfNeeded({ timeout: 60_000 })
    await link.click()
    await page.waitForURL(new RegExp(`/${kind}`), { timeout: 30_000 })
    // The swap form's amount input only exists once the pool state was read from the chain (algod), which a headless run does
    // not always manage - the card itself is the readiness signal; the inputs are audited whenever they are there.
    await settle(
      page,
      kind === 'swap' ? 'text=Direct AMM pool swap' : '#removePercent, input.p-inputnumber-input'
    )
    const result = await audit(page, 360)
    await info.attach(`${kind} form`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png'
    })
    const detail = JSON.stringify(result, null, 1)
    expect(
      result.pageScrollWidth,
      `horizontal page scroll
${detail}`
    ).toBeLessThanOrEqual(361)
    expect(
      result.offenders as Offender[],
      `elements beyond the viewport
${detail}`
    ).toEqual([])
    expect(
      result.squeezed,
      `inputs too narrow to read
${detail}`
    ).toEqual([])
  })
}

test('phone 360: a very long pair symbol cannot squeeze the trade form either', async ({
  page
}) => {
  test.setTimeout(150_000)
  await prepare(page, { bypassAuth: true })
  await proxyTradeApi(page)
  await page.setViewportSize({ width: 360, height: 740 })
  await page.goto(`/en/trade/${MAINNET}/vote/usd`, { waitUntil: 'domcontentloaded' })
  await settle(page, 'text=@')
  const groups = page.locator('.p-inputgroup:has(.symbol-addon) input.p-inputnumber-input:visible') // the sell tab is rendered but hidden
  expect(
    await groups.count(),
    'the order form has number fields next to symbol addons'
  ).toBeGreaterThan(0)
  await page.evaluate(() => {
    for (const el of document.querySelectorAll<HTMLElement>('.symbol-addon > div'))
      el.textContent = 'GOLDDAO$$/USDCaUSDCa'
  })
  await layoutSettled(page)
  for (const input of await groups.all()) {
    const room = await input.evaluate((el: HTMLInputElement) => {
      const cs = getComputedStyle(el)
      return (
        el.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      )
    })
    expect(room, 'order form number field next to a long symbol').toBeGreaterThanOrEqual(80)
  }
})

test('1024x600 laptop: the page scrolls and the trades list is reachable', async ({ page }) => {
  // from md the form column and the pools share a row and the trades list sits below: a short screen must scroll, not clip
  test.setTimeout(150_000)
  await prepare(page, { bypassAuth: true })
  await proxyTradeApi(page)
  await page.setViewportSize({ width: 1024, height: 600 })
  await page.goto(`/en/liquidity/${MAINNET}/vote/usd`, { waitUntil: 'domcontentloaded' })
  await settle(page, TRADES)
  const row = page.locator(TRADES).first()
  await row.scrollIntoViewIfNeeded()
  const box = await row.boundingBox()
  expect(box, 'a trade row').not.toBeNull()
  expect(box!.y, 'the row was scrolled into view, not clipped away').toBeGreaterThan(0)
  expect(box!.y + box!.height).toBeLessThanOrEqual(600)
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight),
    'the page is taller than the screen, so it scrolls'
  ).toBeGreaterThan(600)
})
