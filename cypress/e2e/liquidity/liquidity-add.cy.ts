import { selectors } from './liquidity-golddao-add.cy'

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

  it('when navigating by route, the correct assets and parameters are selected', () => {
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

    // Wait for liquidity form to load
    cy.get('[data-cy="low-price-group"] input', { timeout: 15000 }).should('be.visible')

    // Verify the route parameters were correctly applied
    cy.window()
      .its('__ADD_LIQUIDITY_DEBUG', { timeout: 20000 })
      .should('exist')
      .then((debug: any) => {
        // Log the full debug state for inspection
        cy.log('Debug state keys:', Object.keys(debug.state || {}))

        // Access store state from the component
        const assetCode = debug.store?.state?.assetCode
        const currencyCode = debug.store?.state?.currencyCode
        const shape = debug.state?.shape
        const lpFee = debug.state?.lpFee
        const minPriceTrade = debug.state?.minPriceTrade
        const maxPriceTrade = debug.state?.maxPriceTrade

        cy.log(`Asset: ${assetCode}, Currency: ${currencyCode}, Shape: ${shape}, LpFee: ${lpFee}`)

        // Verify asset code (vote)
        expect(assetCode?.toLowerCase(), 'asset code should be vote').to.equal('vote')

        // Verify currency code (ALGO)
        expect(currencyCode?.toLowerCase(), 'currency code should be ALGO').to.equal('algo')

        // Verify shape parameter
        expect(shape, 'shape should be single').to.equal('single')

        // Verify lpFee parameter
        expect(String(lpFee), 'lpFee should be 100000').to.equal('100000')

        // Verify price bounds from route query parameters
        const TOLERANCE = 0.05
        expect(minPriceTrade, 'min price should be close to 0.14').to.be.closeTo(0.14, TOLERANCE)
        expect(maxPriceTrade, 'max price should be close to 0.16').to.be.closeTo(0.16, TOLERANCE)

        cy.log('All route parameters correctly applied')
      })

    // Verify the price inputs display the correct values
    cy.get('[data-cy="low-price-group"] input')
      .invoke('val')
      .then((val) => {
        const actual = parseNumeric(val ?? '')
        const TOLERANCE = 0.01
        expect(actual, 'low price input should display ~0.14').to.be.closeTo(0.14, TOLERANCE)
      })

    cy.get('[data-cy="high-price-group"] input')
      .invoke('val')
      .then((val) => {
        const actual = parseNumeric(val ?? '')
        const TOLERANCE = 0.01
        expect(actual, 'high price input should display ~0.16').to.be.closeTo(0.16, TOLERANCE)
      })

    // Verify that the portion deposit slider behavior
    // Wait for pools to load and slider to be calculated
    cy.wait(2000)

    // Manually trigger recalculation to ensure it happens after pools are loaded
    cy.window().then((win: any) => {
      if (win.__ADD_LIQUIDITY_DEBUG?.recalculateSingleDepositBounds) {
        cy.log('Manually triggering recalculateSingleDepositBounds')
        win.__ADD_LIQUIDITY_DEBUG.recalculateSingleDepositBounds()
      }
    })

    cy.wait(500)

    cy.window()
      .its('__ADD_LIQUIDITY_DEBUG')
      .should('exist')
      .then((debug: any) => {
        const pools = debug.state?.pools || []
        const normalizedTickLow = debug.toScaledPrice?.(0.14)
        const normalizedTickHigh = debug.toScaledPrice?.(0.16)

        cy.log('Checking slider state:', {
          singleSliderEnabled: debug.state?.singleSliderEnabled,
          singleMaxDepositAsset: debug.state?.singleMaxDepositAsset,
          singleMaxDepositCurrency: debug.state?.singleMaxDepositCurrency,
          shape: debug.state?.shape,
          poolsCount: pools.length,
          minPriceTrade: debug.state?.minPriceTrade,
          maxPriceTrade: debug.state?.maxPriceTrade,
          normalizedTickLow: normalizedTickLow?.toString(),
          normalizedTickHigh: normalizedTickHigh?.toString(),
          lpFee: debug.state?.lpFee?.toString(),
          balanceAsset: debug.state?.balanceAsset,
          balanceCurrency: debug.state?.balanceCurrency
        })

        // Log pool information
        if (pools.length > 0) {
          cy.log(
            'First few pools:',
            pools.slice(0, 3).map((p: any) => ({
              appId: p.appId,
              assetA: p.assetA?.toString(),
              assetB: p.assetB?.toString(),
              min: p.min?.toString(),
              max: p.max?.toString(),
              fee: p.fee?.toString()
            }))
          )
        } else {
          cy.log('No pools loaded!')
        }

        // If user has no balances, the slider will be disabled (expected behavior)
        if (debug.state.balanceAsset === 0 && debug.state.balanceCurrency === 0) {
          cy.log('INFO: User has zero balances for both assets - slider disabled is expected')
          expect(debug.state?.singleSliderEnabled, 'Slider should be disabled with zero balances')
            .to.be.false
          return
        }

        // If a matching pool exists and user has balances, slider should be enabled
        // This is the key test: when navigating by route to an existing pool, the slider should work
        if (pools.length > 0 && (debug.state.balanceAsset > 0 || debug.state.balanceCurrency > 0)) {
          expect(
            debug.state?.singleSliderEnabled,
            'Portion to deposit slider should be enabled when pool exists, shape is single, and user has balances'
          ).to.be.true

          expect(
            debug.state?.singleMaxDepositAsset,
            'singleMaxDepositAsset should be greater than 0'
          ).to.be.greaterThan(0)

          expect(
            debug.state?.singleMaxDepositCurrency,
            'singleMaxDepositCurrency should be greater than 0'
          ).to.be.greaterThan(0)
        } else {
          cy.log('INFO: No matching pool found or user has no balances')
        }
      })

    cy.wait(1000)
  })
})
