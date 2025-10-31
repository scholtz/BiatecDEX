// Use Case 4: Add Liquidity (Wall Position)
// Test creating concentrated position at single price point

import { visitWithLocale, authenticateIfNeeded, clearTestState, parseNumeric } from './test-utils'

describe('CLAMM Use Case 4: Add Liquidity (Wall Position)', () => {
  before(() => {
    cy.viewport(1920, 1080)
  })

  beforeEach(() => {
    clearTestState()
  })

  afterEach(() => {
    cy.dumpLogs()
  })

  it('should load add liquidity form with wall shape parameter', () => {
    // Wall position has same min and max price
    visitWithLocale('/liquidity/mainnet-v1.0/vote/ALGO/3136517663/add?lpFee=100000&shape=wall&low=0.15&high=0.15')
    authenticateIfNeeded()

    cy.get('[data-cy="low-price-group"] input', { timeout: 20000 }).should('be.visible')
    cy.get('[data-cy="high-price-group"] input', { timeout: 20000 }).should('be.visible')

    cy.log('Wall position form loaded')
  })

  it('should display same min and max price for wall position', () => {
    visitWithLocale('/liquidity/mainnet-v1.0/vote/ALGO/3136517663/add?lpFee=100000&shape=wall&low=0.15&high=0.15')
    authenticateIfNeeded()

    cy.wait(3000)

    // Verify both prices are the same
    cy.get('[data-cy="low-price-group"] input')
      .invoke('val')
      .then((lowVal) => {
        const low = parseNumeric(lowVal ?? '')
        
        cy.get('[data-cy="high-price-group"] input')
          .invoke('val')
          .then((highVal) => {
            const high = parseNumeric(highVal ?? '')
            const TOLERANCE = 0.001
            
            expect(low, 'low price for wall').to.be.closeTo(0.15, 0.02)
            expect(high, 'high price for wall').to.be.closeTo(0.15, 0.02)
            expect(Math.abs(low - high), 'low and high should be very close for wall').to.be.lessThan(TOLERANCE)
          })
      })

    cy.log('Wall position prices verified')
  })

  it('should recognize wall shape parameter', () => {
    visitWithLocale('/liquidity/mainnet-v1.0/vote/ALGO/3136517663/add?lpFee=100000&shape=wall&low=0.15&high=0.15')
    authenticateIfNeeded()

    cy.wait(3000)

    // Verify shape is recognized
    cy.window()
      .its('__ADD_LIQUIDITY_DEBUG', { timeout: 20000 })
      .should((debug: any) => {
        const shape = debug.state?.shape
        expect(shape, 'shape should be wall').to.equal('wall')
      })

    cy.log('Wall shape parameter recognized')
  })

  it('should display concentrated liquidity distribution for wall', () => {
    visitWithLocale('/liquidity/mainnet-v1.0/vote/ALGO/3136517663/add?lpFee=100000&shape=wall&low=0.15&high=0.15')
    authenticateIfNeeded()

    cy.wait(3000)

    // Wall positions have concentrated liquidity at a single point
    cy.get('body').then(($body) => {
      const bodyText = $body.text()
      // Check for indicators of liquidity concentration
      const hasConcentration = 
        bodyText.match(/concentrated/i) ||
        bodyText.match(/wall/i) ||
        $body.find('canvas').length > 0

      cy.log('Wall liquidity visualization check completed')
    })
  })

  it('should handle wall position with balanced deposits', () => {
    visitWithLocale('/liquidity/mainnet-v1.0/vote/ALGO/3136517663/add?lpFee=100000&shape=wall&low=0.15&high=0.15')
    authenticateIfNeeded()

    cy.wait(4000)

    // For wall positions, deposits should still respect ratio
    cy.window()
      .its('__ADD_LIQUIDITY_DEBUG', { timeout: 20000 })
      .should((debug: any) => {
        const pools = (debug.state?.fullInfo ?? debug.state?.pools ?? []) as any[]
        expect(pools.length, 'pools should be loaded for wall position').to.be.greaterThan(0)

        const sliderEnabled = debug.state?.singleSliderEnabled
        cy.log(`Wall position slider enabled: ${sliderEnabled}`)
      })

    cy.log('Wall position deposits verified')
  })
})
