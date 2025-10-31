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

  const visitWithLocale = (url: string) =>
    cy.visit(url, {
      onBeforeLoad(win: any) {
        win.localStorage.setItem('biatec.locale', 'en')
      }
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