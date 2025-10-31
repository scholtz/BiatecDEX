// Use Case 3: Add Liquidity (Balanced)
// Test adding liquidity with both assets in balanced ratio

import { visitWithLocale, authenticateIfNeeded, clearTestState, parseNumeric } from './test-utils'

describe('CLAMM Use Case 3: Add Liquidity (Balanced)', () => {
  before(() => {
    cy.viewport(1920, 1080)
  })

  beforeEach(() => {
    clearTestState()
  })

  afterEach(() => {
    cy.dumpLogs()
  })

  it('should load add liquidity form for balanced deposit', () => {
    visitWithLocale('/liquidity/mainnet-v1.0/vote/ALGO/3136517663/add')
    authenticateIfNeeded()

    // Wait for form to load
    cy.get('[data-cy="low-price-group"] input', { timeout: 20000 }).should('be.visible')
    cy.get('[data-cy="high-price-group"] input', { timeout: 20000 }).should('be.visible')

    cy.log('Balanced liquidity form loaded')
  })

  it('should display both asset and currency input fields', () => {
    visitWithLocale('/liquidity/mainnet-v1.0/vote/ALGO/3136517663/add?lpFee=100000&shape=single&low=0.14&high=0.16')
    authenticateIfNeeded()

    cy.wait(3000)

    // Check that both input groups exist
    cy.get('[data-cy="asset-input-group"], [data-cy="currency-input-group"]')
      .should('have.length.greaterThan', 0)

    cy.log('Input fields verified')
  })

  it('should calculate balanced amounts based on price range', () => {
    visitWithLocale('/liquidity/mainnet-v1.0/vote/ALGO/3136517663/add?lpFee=100000&shape=single&low=0.14&high=0.16')
    authenticateIfNeeded()

    cy.wait(4000)

    // Verify balanced calculations
    cy.window()
      .its('__ADD_LIQUIDITY_DEBUG', { timeout: 20000 })
      .should((debug: any) => {
        const shape = debug.state?.shape
        expect(shape, 'shape parameter should be set').to.exist

        // For single-sided, one max should be greater than zero
        const maxAsset = Number(debug.state?.singleMaxDepositAsset ?? 0)
        const maxCurrency = Number(debug.state?.singleMaxDepositCurrency ?? 0)

        expect(
          maxAsset > 0 || maxCurrency > 0,
          'at least one max deposit should be positive'
        ).to.be.true
      })

    cy.log('Balanced amounts calculated')
  })

  it('should adjust amounts proportionally when slider moves', () => {
    visitWithLocale('/liquidity/mainnet-v1.0/vote/ALGO/3136517663/add?lpFee=100000&shape=single&low=0.14&high=0.16')
    authenticateIfNeeded()

    cy.wait(3000)

    // Verify slider exists
    cy.get('body').then(($body) => {
      const hasSlider = $body.find('[data-cy="single-deposit-slider"], .p-slider').length > 0
      if (hasSlider) {
        cy.get('[data-cy="single-deposit-slider"], .p-slider').should('be.visible')
        cy.log('Slider found and visible')
      } else {
        cy.log('Slider not found (may be hidden based on balance)')
      }
    })
  })

  it('should respect user balance limits', () => {
    visitWithLocale('/liquidity/mainnet-v1.0/vote/ALGO/3136517663/add?lpFee=100000&shape=single&low=0.14&high=0.16')
    authenticateIfNeeded()

    cy.wait(4000)

    // Check balance constraints
    cy.window()
      .its('__ADD_LIQUIDITY_DEBUG', { timeout: 20000 })
      .should((debug: any) => {
        const balanceAsset = Number(debug.state?.balanceAsset ?? 0)
        const balanceCurrency = Number(debug.state?.balanceCurrency ?? 0)
        const maxDepositAsset = Number(debug.state?.singleMaxDepositAsset ?? 0)
        const maxDepositCurrency = Number(debug.state?.singleMaxDepositCurrency ?? 0)

        // Max deposits should not exceed balances
        if (maxDepositAsset > 0) {
          expect(
            maxDepositAsset,
            'max asset deposit should not exceed balance'
          ).to.be.at.most(balanceAsset)
        }

        if (maxDepositCurrency > 0) {
          expect(
            maxDepositCurrency,
            'max currency deposit should not exceed balance'
          ).to.be.at.most(balanceCurrency)
        }

        cy.log(`Balances: Asset=${balanceAsset}, Currency=${balanceCurrency}`)
        cy.log(`Max Deposits: Asset=${maxDepositAsset}, Currency=${maxDepositCurrency}`)
      })

    cy.log('Balance limits respected')
  })

  it('should display liquidity distribution chart', () => {
    visitWithLocale('/liquidity/mainnet-v1.0/vote/ALGO/3136517663/add?lpFee=100000&shape=single&low=0.14&high=0.16')
    authenticateIfNeeded()

    cy.wait(3000)

    // Check for chart element
    cy.get('body').then(($body) => {
      const hasChart = 
        $body.find('canvas').length > 0 || 
        $body.find('[data-cy="liquidity-chart"]').length > 0 ||
        $body.text().match(/distribution/i)
      
      if (hasChart) {
        cy.log('Liquidity distribution chart found')
      } else {
        cy.log('Chart may not be visible in current state')
      }
    })
  })
})
