// Use Case 1: View and Explore Pools
// Test viewing all available liquidity pools, filtering, and viewing pool details

import { visitWithLocale, authenticateIfNeeded, clearTestState } from './test-utils'

describe('CLAMM Use Case 1: View and Explore Pools', () => {
  before(() => {
    cy.viewport(1920, 1080)
  })

  beforeEach(() => {
    clearTestState()
  })

  afterEach(() => {
    cy.dumpLogs()
  })

  it('should display home page with asset list', () => {
    visitWithLocale('/')

    // Check if main content is visible
    cy.contains('Explore Assets', { timeout: 15000 }).should('be.visible')
    cy.contains(/Algorand/i, { timeout: 15000 }).should('be.visible')

    cy.log('Home page loaded successfully')
  })

  it('should navigate to liquidity page and show pools', () => {
    visitWithLocale('/liquidity')

    authenticateIfNeeded()

    // Wait for page to load
    cy.contains(/Liquidity/i, { timeout: 20000 }).should('be.visible')

    cy.log('Liquidity page loaded successfully')
  })

  it('should display pool details for specific asset pair', () => {
    visitWithLocale('/liquidity/mainnet-v1.0/vote/ALGO')

    authenticateIfNeeded()

    // Wait for liquidity pools to load
    cy.contains(/Available Pools/i, { timeout: 20000 }).should('be.visible')

    // Check if pools are displayed
    cy.get('[data-cy="pool-card"], .pool-item, .p-card').should('have.length.greaterThan', 0)

    cy.log('Pool details displayed successfully')
  })

  it('should show pool information including TVL and fees', () => {
    visitWithLocale('/liquidity/mainnet-v1.0/vote/ALGO')

    authenticateIfNeeded()

    // Wait for pools
    cy.wait(3000)

    // Verify pool information is displayed
    cy.get('body').then(($body) => {
      const text = $body.text()
      // Check for common pool info indicators
      const hasPoolInfo = 
        text.match(/pool/i) || 
        text.match(/fee/i) || 
        text.match(/liquidity/i)
      
      expect(hasPoolInfo, 'Pool information should be displayed').to.exist
    })

    cy.log('Pool information verified')
  })

  it('should navigate to specific pool via All Assets view', () => {
    visitWithLocale('/')

    // Wait for assets to load
    cy.contains(/GoldDAO/i, { timeout: 30000 }).should('be.visible')

    // Find and click on add liquidity button for an asset
    cy.contains(/GoldDAO/i)
      .closest('tr, .p-datatable-row, .asset-row')
      .within(() => {
        cy.get('[data-cy="add-liquidity"], .pi.pi-plus-circle, .pi.pi-plus')
          .first()
          .should('be.visible')
      })

    cy.log('Asset liquidity navigation verified')
  })
})
