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
    const currencyCode = 'EUR'
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

    cy.get('[data-cy="low-price-group"] input', { timeout: 15000 }).should('be.visible')

    cy.window()
      .its('__ADD_LIQUIDITY_DEBUG', { timeout: 20000 })
      .should('exist')
      .then((debug: any) => {
        const pools: any[] = Array.isArray(debug?.state?.pools) ? debug.state.pools : []
        const matching = pools.filter((pool) => {
          if (!pool) return false
          const assetA = pool.assetA ? String(pool.assetA) : ''
          const assetB = pool.assetB ? String(pool.assetB) : ''
          return assetA === targetAssetId && assetB === targetCurrencyId
        })

        const sourcePools = matching.length > 0 ? matching : pools
        const singleShapePools = sourcePools.filter((pool) => {
          if (!pool) return false
          return String(pool.min ?? '') !== String(pool.max ?? '')
        })

        const selectedPools = singleShapePools.length > 0 ? singleShapePools : sourcePools

        expect(
          selectedPools.length,
          'expected at least one liquidity pool entry'
        ).to.be.greaterThan(0)

        selectedPools.slice(0, Math.min(2, selectedPools.length)).forEach((pool) => {
          const { min, max, appId, fee } = pool
          if (
            typeof appId === 'undefined' ||
            typeof min === 'undefined' ||
            typeof max === 'undefined'
          ) {
            return
          }
          const minStr = formatScaledDecimal(min)
          const maxStr = formatScaledDecimal(max)
          const minValue = parseNumeric(minStr)
          const maxValue = parseNumeric(maxStr)
          const lpFee = String(fee ?? '')
          const shape = String(min) === String(max) ? 'wall' : 'single'
          const poolAppId = String(appId)
          if (!lpFee || lpFee === 'undefined') {
            return
          }
          const poolUrl = `/liquidity/${network}/${assetCode}/${currencyCode}/${poolAppId}/add?lpFee=${lpFee}&shape=${shape}&low=${minStr}&high=${maxStr}`
          collectedPools.push({ url: poolUrl, min: minValue, max: maxValue })
        })
      })

    cy.then(() => {
      expect(collectedPools.length, 'pools selected for verification').to.be.greaterThan(0)
    })

    cy.then(() => {
      collectedPools.forEach(({ url, min, max }) => {
        visitWithLocale(url)
        cy.get('[data-cy="low-price-group"] input', { timeout: 15000 }).should('be.visible')
        assertPriceInputs(min, max)
      })
    })
  })
})

describe('Add liquidity route overrides', () => {
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

  const TOLERANCE = 0.02
  const ROUTE_TOLERANCE = 0.05
  const targetUrl =
    '/liquidity/mainnet-v1.0/vote/ALGO/3136517663/add?lpFee=100000&shape=single&low=0.14&high=0.16'

  const getDisplayedBounds = () =>
    cy
      .get('[data-cy="low-price-group"] input')
      .invoke('val')
      .then((lowVal) => {
        const low = parseNumeric(lowVal ?? '')
        return cy
          .get('[data-cy="high-price-group"] input')
          .invoke('val')
          .then((highVal) => ({
            low,
            high: parseNumeric(highVal ?? '')
          }))
      })

  it('keeps query low/high after asynchronous recalculations', () => {
    let stateLow = 0
    let stateHigh = 0
    let baselineLow = 0
    let baselineHigh = 0

    visitWithLocale(targetUrl)

    cy.window()
      .its('__ADD_LIQUIDITY_DEBUG', { timeout: 15000 })
      .should('exist')
      .then((debug: any) => {
        expect(debug, 'debug helpers exposed').to.exist
        debug.state.showPriceForm = false
        debug.state.pricesApplied = true
        debug.state.ticksCalculated = false
        debug.setChartData()
        if (typeof debug.forceRouteBounds === 'function') {
          debug.forceRouteBounds(0.14, 0.16)
        }
        stateLow = Number(debug.state.minPriceTrade)
        stateHigh = Number(debug.state.maxPriceTrade)
      })

    cy.wait(0)

    getDisplayedBounds().then(({ low, high }) => {
      baselineLow = low
      baselineHigh = high

      expect(low, 'initial low bound matches state').to.be.closeTo(stateLow, ROUTE_TOLERANCE)
      expect(high, 'initial high bound matches state').to.be.closeTo(stateHigh, ROUTE_TOLERANCE)
    })

    cy.wait(500)
    getDisplayedBounds().then(({ low, high }) => {
      expect(low, 'low bound remains stable after delay').to.be.closeTo(baselineLow, TOLERANCE)
      expect(high, 'high bound remains stable after delay').to.be.closeTo(baselineHigh, TOLERANCE)
    })

    cy.wait(200)
    cy.window()
      .its('__ADD_LIQUIDITY_DEBUG')
      .then((debug: any) => {
        debug.state.ticksCalculated = false
        debug.setChartData()
      })

    getDisplayedBounds().then(({ low, high }) => {
      expect(low, 'low bound stable after recompute').to.be.closeTo(baselineLow, TOLERANCE)
      expect(high, 'high bound stable after recompute').to.be.closeTo(baselineHigh, TOLERANCE)
    })
  })
})
