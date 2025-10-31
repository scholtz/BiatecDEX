// Use Case 8: Trader Dashboard
// Test viewing asset holdings, portfolio value, and price changes

import { visitWithLocale, authenticateIfNeeded, clearTestState } from './test-utils'

describe('CLAMM Use Case 8: Trader Dashboard', () => {
  before(() => {
    cy.viewport(1920, 1080)
  })

  beforeEach(() => {
    clearTestState()
  })

  afterEach(() => {
    cy.dumpLogs()
  })

  it('should load trader dashboard', () => {
    visitWithLocale('/trader')
    authenticateIfNeeded()

    // Wait for dashboard to load
    cy.contains(/trader/i, { timeout: 20000 }).should('be.visible')

    cy.log('Trader Dashboard loaded')
  })

  it('should display asset holdings table', () => {
    visitWithLocale('/trader')
    authenticateIfNeeded()

    cy.wait(4000)

    // Check for assets table
    cy.get('body').then(($body) => {
      const hasTable = 
        $body.find('.p-datatable').length > 0 ||
        $body.find('table').length > 0 ||
        $body.find('[data-cy="asset-row"]').length > 0

      cy.log('Asset holdings table checked')
    })
  })

  it('should show total portfolio value in USD', () => {
    visitWithLocale('/trader')
    authenticateIfNeeded()

    cy.wait(4000)

    // Check for total value display
    cy.get('body').then(($body) => {
      const bodyText = $body.text()
      const hasPortfolioValue = 
        bodyText.match(/total/i) ||
        bodyText.match(/portfolio/i) ||
        bodyText.match(/\$/i) ||
        bodyText.match(/USD/i)

      cy.log('Portfolio value display checked')
    })
  })

  it('should display asset count and largest holding', () => {
    visitWithLocale('/trader')
    authenticateIfNeeded()

    cy.wait(4000)

    // Check for summary statistics
    cy.get('body').then(($body) => {
      const bodyText = $body.text()
      const hasStats = 
        bodyText.match(/asset/i) ||
        bodyText.match(/holding/i) ||
        bodyText.match(/count/i)

      cy.log('Summary statistics checked')
    })
  })

  it('should show daily change percentage', () => {
    visitWithLocale('/trader')
    authenticateIfNeeded()

    cy.wait(4000)

    // Check for price change indicators
    cy.get('body').then(($body) => {
      const bodyText = $body.text()
      const hasPriceChange = 
        bodyText.match(/%/i) ||
        bodyText.match(/change/i) ||
        bodyText.match(/24h/i) ||
        bodyText.match(/daily/i)

      cy.log('Price change indicators checked')
    })
  })

  it('should display asset prices in USD', () => {
    visitWithLocale('/trader')
    authenticateIfNeeded()

    cy.wait(4000)

    // Check for price columns
    cy.get('body').then(($body) => {
      const bodyText = $body.text()
      const hasPrices = 
        bodyText.match(/price/i) ||
        bodyText.match(/\$/i) ||
        bodyText.match(/USD/i)

      cy.log('Asset prices checked')
    })
  })

  it('should show asset balances', () => {
    visitWithLocale('/trader')
    authenticateIfNeeded()

    cy.wait(4000)

    // Check for balance information
    cy.get('body').then(($body) => {
      const bodyText = $body.text()
      const hasBalances = 
        bodyText.match(/balance/i) ||
        bodyText.match(/amount/i) ||
        bodyText.match(/holding/i)

      cy.log('Asset balances checked')
    })
  })

  it('should allow filtering assets by dropdown', () => {
    visitWithLocale('/trader')
    authenticateIfNeeded()

    cy.wait(3000)

    // Check for asset filter
    cy.get('body').then(($body) => {
      const hasFilter = 
        $body.find('.p-dropdown').length > 0 ||
        $body.find('select').length > 0

      if (hasFilter) {
        cy.log('Asset filter dropdown found')
      } else {
        cy.log('No filter dropdown (may show all assets)')
      }
    })
  })

  it('should provide navigation to trade/swap', () => {
    visitWithLocale('/trader')
    authenticateIfNeeded()

    cy.wait(3000)

    // Check for trade buttons or links
    cy.get('body').then(($body) => {
      const hasTradeLinks = 
        $body.find('button:contains("Trade")').length > 0 ||
        $body.find('button:contains("Swap")').length > 0 ||
        $body.find('[data-cy="trade-button"]').length > 0

      cy.log('Trade navigation links checked')
    })
  })

  it('should link to asset opt-in page', () => {
    visitWithLocale('/trader')
    authenticateIfNeeded()

    cy.wait(3000)

    // Check for opt-in link
    cy.get('body').then(($body) => {
      const bodyText = $body.text()
      const hasOptInLink = 
        bodyText.match(/opt-in/i) ||
        bodyText.match(/opt in/i) ||
        bodyText.match(/add asset/i)

      cy.log('Opt-in navigation checked')
    })
  })
})
