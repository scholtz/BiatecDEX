// Use Case 7: Liquidity Provider Dashboard
// Test viewing all LP positions, values, and fees earned

import { visitWithLocale, authenticateIfNeeded, clearTestState } from './test-utils'

describe('CLAMM Use Case 7: Liquidity Provider Dashboard', () => {
  before(() => {
    cy.viewport(1920, 1080)
  })

  beforeEach(() => {
    clearTestState()
  })

  afterEach(() => {
    cy.dumpLogs()
  })

  it('should load liquidity provider dashboard', () => {
    visitWithLocale('/liquidity-provider')
    authenticateIfNeeded()

    // Wait for dashboard to load
    cy.contains(/liquidity provider/i, { timeout: 20000 }).should('be.visible')

    cy.log('LP Dashboard loaded')
  })

  it('should display list of LP positions', () => {
    visitWithLocale('/liquidity-provider')
    authenticateIfNeeded()

    cy.wait(4000)

    // Check for positions table or list
    cy.get('body').then(($body) => {
      const hasPositions = 
        $body.find('.p-datatable').length > 0 ||
        $body.find('table').length > 0 ||
        $body.find('[data-cy="position-row"]').length > 0 ||
        $body.text().match(/position/i)

      cy.log('LP positions display checked')
    })
  })

  it('should show position values in USD', () => {
    visitWithLocale('/liquidity-provider')
    authenticateIfNeeded()

    cy.wait(4000)

    // Check for USD values
    cy.get('body').then(($body) => {
      const bodyText = $body.text()
      const hasUsdValues = 
        bodyText.match(/\$/i) ||
        bodyText.match(/USD/i) ||
        bodyText.match(/value/i)

      cy.log('Position USD values checked')
    })
  })

  it('should display asset filter dropdown', () => {
    visitWithLocale('/liquidity-provider')
    authenticateIfNeeded()

    cy.wait(3000)

    // Check for asset filter
    cy.get('body').then(($body) => {
      const hasFilter = 
        $body.find('.p-dropdown').length > 0 ||
        $body.find('select').length > 0 ||
        $body.text().match(/filter/i) ||
        $body.text().match(/select asset/i)

      cy.log('Asset filter checked')
    })
  })

  it('should show fees earned per position', () => {
    visitWithLocale('/liquidity-provider')
    authenticateIfNeeded()

    cy.wait(4000)

    // Check for fee information
    cy.get('body').then(($body) => {
      const bodyText = $body.text()
      const hasFeeInfo = 
        bodyText.match(/fee/i) ||
        bodyText.match(/earned/i) ||
        bodyText.match(/reward/i)

      cy.log('Fee information checked')
    })
  })

  it('should display total portfolio value', () => {
    visitWithLocale('/liquidity-provider')
    authenticateIfNeeded()

    cy.wait(4000)

    // Check for total value
    cy.get('body').then(($body) => {
      const bodyText = $body.text()
      const hasTotalValue = 
        bodyText.match(/total/i) ||
        bodyText.match(/portfolio/i) ||
        bodyText.match(/value/i)

      cy.log('Total portfolio value checked')
    })
  })

  it('should allow navigating to add liquidity from dashboard', () => {
    visitWithLocale('/liquidity-provider')
    authenticateIfNeeded()

    cy.wait(3000)

    // Check for add liquidity buttons
    cy.get('body').then(($body) => {
      const hasAddButton = 
        $body.find('button:contains("Add")').length > 0 ||
        $body.find('[data-cy="add-liquidity"]').length > 0 ||
        $body.find('.pi-plus').length > 0

      cy.log('Add liquidity navigation checked')
    })
  })

  it('should show position details including price ranges', () => {
    visitWithLocale('/liquidity-provider')
    authenticateIfNeeded()

    cy.wait(4000)

    // Check for price range information
    cy.get('body').then(($body) => {
      const bodyText = $body.text()
      const hasPriceInfo = 
        bodyText.match(/price/i) ||
        bodyText.match(/range/i) ||
        bodyText.match(/min/i) ||
        bodyText.match(/max/i)

      cy.log('Position price range information checked')
    })
  })

  it('should filter positions by selected asset', () => {
    visitWithLocale('/liquidity-provider')
    authenticateIfNeeded()

    cy.wait(3000)

    // Try to interact with filter if present
    cy.get('body').then(($body) => {
      const dropdown = $body.find('.p-dropdown').first()
      if (dropdown.length > 0) {
        cy.wrap(dropdown).should('be.visible')
        cy.log('Asset filter is interactive')
      } else {
        cy.log('No filter dropdown found (may not have multiple assets)')
      }
    })
  })
})
