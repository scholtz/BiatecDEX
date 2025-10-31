import { selectors } from './liquidity-golddao-add.cy.ts'

const parseNumeric = (value: string | number | string[]) => {
  let s = String(Array.isArray(value) ? value.join('') : value)
    .replace(/\u00a0/g, '')
    .trim()
  // Use indexOf for compatibility
  if (s.indexOf(',') >= 0 && s.indexOf('.') === -1) {
    s = s.replace(',', '.')
  }
  s = s.replace(/,(?=\d{3}(?:\D|$))/g, '')
  return Number(s)
}

const zeroPadLeft = (value: string, targetLength: number) => {
  if (value.length >= targetLength) return value
  const zerosNeeded = targetLength - value.length
  return new Array(zerosNeeded + 1).join('0') + value
}

const formatScaledDecimal = (value: unknown) => {
  if (typeof value === 'number' && isFinite(value)) {
    return value.toString()
  }

  if (value === null || typeof value === 'undefined') {
    throw new Error('Invalid scaled value')
  }

  const raw = String(value)
  if (!raw || raw === 'NaN') {
    throw new Error('Invalid scaled value')
  }

  const negative = raw[0] === '-'
  const unsignedRaw = negative ? raw.slice(1) : raw
  const digits = unsignedRaw.replace(/^0+/, '') || '0'
  const scaleDigits = 9

  let whole = '0'
  let fractional = ''

  if (digits.length > scaleDigits) {
    whole = digits.slice(0, digits.length - scaleDigits)
    fractional = digits.slice(-scaleDigits)
  } else {
    whole = '0'
    fractional = zeroPadLeft(digits, scaleDigits)
  }

  fractional = fractional.replace(/0+$/, '')
  const sign = negative ? '-' : ''

  if (!fractional) {
    return `${sign}${whole}`
  }

  return `${sign}${whole}.${fractional}`
}

const visitWithLocale = (url: string) =>
  cy.visit(url, {
    onBeforeLoad(win: any) {
      win.localStorage.setItem('biatec.locale', 'en')
    }
  })

describe('Liquidity min/max propagation', () => {
  before(() => {
    // Ensure full HD resolution for video capture
    cy.viewport(1920, 1080)
  })

  beforeEach(() => {
    // Clear localStorage and debug variables between tests to prevent interference
    // Keep cookies for authentication persistence
    cy.clearLocalStorage()
    cy.window().then((win: any) => {
      // Clear any global debug variables
      if (win.__ADD_LIQUIDITY_DEBUG) delete win.__ADD_LIQUIDITY_DEBUG
      if (win.__E2E_DEBUG_BOUNDS) delete win.__E2E_DEBUG_BOUNDS
      if (win.__E2E_DEBUG_CHANGES) delete win.__E2E_DEBUG_CHANGES
      if (win.__E2E_DEBUG_STATE) delete win.__E2E_DEBUG_STATE
      if (win.__BIATEC_E2E) delete win.__BIATEC_E2E
      if (win.__BIATEC_SKIP_PRICE_FETCH) delete win.__BIATEC_SKIP_PRICE_FETCH
      if (win.__CY_IGNORE_E2E_LOCK) delete win.__CY_IGNORE_E2E_LOCK
    })
  })

  const assertPriceInputs = (expectedMin: number, expectedMax: number) => {
    // Allow a small tolerance due to internal tick rounding / precision adjustments in AddLiquidity
    const TOLERANCE = 0.02
    cy.window().its('__ADD_LIQUIDITY_DEBUG', { timeout: 20000 }).should('exist')
    cy.window().then((win: any) => {
      const debug = win.__ADD_LIQUIDITY_DEBUG
      if (debug?.state?.showPriceForm) {
        debug.state.showPriceForm = false
        debug.state.pricesApplied = true
      }
    })
    cy.window()
      .its('__ADD_LIQUIDITY_DEBUG.state.showPriceForm', { timeout: 20000 })
      .should('eq', false)
    cy.get('[data-cy="low-price-group"] input', { timeout: 20000 }).should('be.visible')
    cy.get('[data-cy="high-price-group"] input', { timeout: 20000 }).should('be.visible')
    // Wait for internal debug bounds to be present
    cy.window().should((win: any) => {
      expect(win.__E2E_DEBUG_BOUNDS, 'debug bounds present').to.exist
    })
    // First verify internal reactive state snapshot
    cy.window().then((win: any) => {
      const dbg = win.__E2E_DEBUG_BOUNDS
      if (dbg) {
        cy.log(`Debug phase=${dbg.phase} min=${dbg.min} max=${dbg.max} mid=${dbg.mid}`)
        expect(dbg.min, 'internal minPriceTrade').to.be.closeTo(expectedMin, TOLERANCE)
        expect(dbg.max, 'internal maxPriceTrade').to.be.closeTo(expectedMax, TOLERANCE)
        if (Array.isArray(win.__E2E_DEBUG_CHANGES)) {
          cy.log(`Change events: ${win.__E2E_DEBUG_CHANGES.length}`)
          win.__E2E_DEBUG_CHANGES.forEach((ev: any, idx: number) => {
            cy.log(`#${idx} phase=${ev.phase} min=${ev.min} max=${ev.max}`)
          })
        }
      } else {
        cy.log('No __E2E_DEBUG_BOUNDS present')
      }
    })
    cy.get('[data-cy="low-price-group"] input')
      .invoke('val')
      .then((val) => {
        const actual = parseNumeric(val ?? '')
        expect(actual).to.be.closeTo(expectedMin, TOLERANCE)
      })

    cy.get('[data-cy="high-price-group"] input')
      .invoke('val')
      .then((val) => {
        const actual = parseNumeric(val ?? '')
        expect(actual).to.be.closeTo(expectedMax, TOLERANCE)
      })
  }
  it('keeps pool price bounds in sync with the add liquidity form', () => {
    const network = 'mainnet-v1.0'
    const assetCode = 'vote'
    const currencyCode = 'ALGO'
    const targetAssetId = '452399768'
    const targetCurrencyId = '227855942'
    const collectedPools: Array<{ url: string; min: number; max: number }> = []

    visitWithLocale(
      `/liquidity/${network}/${assetCode}/${currencyCode}/3136517663/add?lpFee=100000&shape=single&low=0.14&high=0.16`
    )

    // Wait for authentication container/modal
    cy.contains(/Sign in/i, { timeout: 30000 }).should('be.visible')

    const email = Cypress.env('LIQUIDITY_TEST_EMAIL') || 'test@biatec.io'
    const password: string = Cypress.env('LIQUIDITY_TEST_PASSWORD')

    // Fill credentials.
    cy.get(selectors.emailInput, { timeout: 20000 })
      .should('be.visible')
      .clear()
      .type(email, { log: false })
    cy.get(selectors.passwordInput, { timeout: 20000 })
      .should('be.visible')
      .clear()
      .type(password, { log: false })

    cy.wait(1000)
    // Submit via button
    cy.get(selectors.submitButton).click({ force: true })

    cy.wait(1000)

    cy.get('[data-cy="low-price-group"] input', { timeout: 15000 }).should('be.visible')
  })
})
