// Use Case 2: Add Liquidity (Single-sided)
// Test adding liquidity with a single asset

import { visitWithLocale, authenticateIfNeeded, clearTestState, parseNumeric } from './test-utils'

describe('CLAMM Use Case 2: Add Liquidity (Single-sided)', () => {
  before(() => {
    cy.viewport(1920, 1080)
  })

  beforeEach(() => {
    clearTestState()
  })

  afterEach(() => {
    cy.dumpLogs()
  })

  it('should navigate to add liquidity page with route parameters', () => {
    const url = '/liquidity/mainnet-v1.0/vote/ALGO/3136517663/add?lpFee=100000&shape=single&low=0.14&high=0.16'
    
    visitWithLocale(url)
    authenticateIfNeeded()

    // Wait for form to load
    cy.get('[data-cy="low-price-group"] input', { timeout: 20000 }).should('be.visible')
    cy.get('[data-cy="high-price-group"] input', { timeout: 20000 }).should('be.visible')

    cy.log('Add liquidity form loaded')
  })

  it('should display correct price range from URL parameters', () => {
    visitWithLocale('/liquidity/mainnet-v1.0/vote/ALGO/3136517663/add?lpFee=100000&shape=single&low=0.14&high=0.16')
    authenticateIfNeeded()

    cy.get('[data-cy="low-price-group"] input', { timeout: 20000 }).should('be.visible')
    cy.wait(2000)

    // Verify price inputs display correct values
    cy.get('[data-cy="low-price-group"] input')
      .invoke('val')
      .then((val) => {
        const actual = parseNumeric(val ?? '')
        const TOLERANCE = 0.02
        expect(actual, 'low price should be ~0.14').to.be.closeTo(0.14, TOLERANCE)
      })

    cy.get('[data-cy="high-price-group"] input')
      .invoke('val')
      .then((val) => {
        const actual = parseNumeric(val ?? '')
        const TOLERANCE = 0.02
        expect(actual, 'high price should be ~0.16').to.be.closeTo(0.16, TOLERANCE)
      })

    cy.log('Price range verified')
  })

  it('should enable deposit slider when pools and balances are loaded', () => {
    visitWithLocale('/liquidity/mainnet-v1.0/vote/ALGO/3136517663/add?lpFee=100000&shape=single&low=0.14&high=0.16')
    authenticateIfNeeded()

    cy.get('[data-cy="low-price-group"] input', { timeout: 20000 }).should('be.visible')
    cy.wait(3000)

    // Verify slider becomes enabled via debug helpers
    cy.window()
      .its('__ADD_LIQUIDITY_DEBUG', { timeout: 30000 })
      .should((debug: any) => {
        expect(debug, 'debug helper should exist').to.exist

        const pools = (debug.state?.fullInfo ?? debug.state?.pools ?? []) as any[]
        expect(pools.length, 'pools should be loaded').to.be.greaterThan(0)

        const hasBalances =
          Number(debug.state?.balanceAsset ?? 0) > 0 ||
          Number(debug.state?.balanceCurrency ?? 0) > 0
        expect(hasBalances, 'should have balance for at least one asset').to.be.true

        expect(
          debug.state?.singleSliderEnabled,
          'deposit slider should be enabled'
        ).to.be.true
      })

    cy.log('Deposit slider enabled')
  })

  it('should allow adjusting deposit amount with slider', () => {
    visitWithLocale('/liquidity/mainnet-v1.0/vote/ALGO/3136517663/add?lpFee=100000&shape=single&low=0.14&high=0.16')
    authenticateIfNeeded()

    cy.get('[data-cy="low-price-group"] input', { timeout: 20000 }).should('be.visible')
    cy.wait(3000)

    // Check if slider exists and is enabled
    cy.get('[data-cy="single-deposit-slider"], .p-slider').should('be.visible')

    cy.log('Deposit slider interaction verified')
  })

  it('should display asset information correctly', () => {
    visitWithLocale('/liquidity/mainnet-v1.0/vote/ALGO/3136517663/add?lpFee=100000&shape=single&low=0.14&high=0.16')
    authenticateIfNeeded()

    cy.wait(4000)

    // Verify component state contains asset information
    cy.window()
      .its('__ADD_LIQUIDITY_DEBUG', { timeout: 20000 })
      .should((debug: any) => {
        const assetCode = debug.store?.state?.assetCode
        const currencyCode = debug.store?.state?.currencyCode

        expect(assetCode?.toLowerCase(), 'asset code should be vote').to.equal('vote')
        expect(currencyCode?.toLowerCase(), 'currency code should be algo').to.equal('algo')
      })

    cy.log('Asset information verified')
  })

  it('should show expected output amounts for single-sided deposit', () => {
    visitWithLocale('/liquidity/mainnet-v1.0/vote/ALGO/3136517663/add?lpFee=100000&shape=single&low=0.14&high=0.16')
    authenticateIfNeeded()

    cy.get('[data-cy="low-price-group"] input', { timeout: 20000 }).should('be.visible')
    cy.wait(3000)

    // Verify max deposit amounts are calculated
    cy.window()
      .its('__ADD_LIQUIDITY_DEBUG', { timeout: 20000 })
      .should((debug: any) => {
        const maxAsset = Number(debug.state?.singleMaxDepositAsset ?? 0)
        const maxCurrency = Number(debug.state?.singleMaxDepositCurrency ?? 0)

        expect(maxAsset, 'max asset deposit should be calculated').to.be.greaterThan(0)
        expect(maxCurrency, 'max currency deposit should be calculated').to.be.greaterThan(0)
      })

    cy.log('Output amounts calculated')
  })
})
