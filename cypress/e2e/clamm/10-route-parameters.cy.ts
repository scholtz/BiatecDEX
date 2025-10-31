// Use Case 10: Route Parameter Handling
// Test URL parameter handling for various scenarios

import { visitWithLocale, authenticateIfNeeded, clearTestState, parseNumeric } from './test-utils'

describe('CLAMM Use Case 10: Route Parameter Handling', () => {
  before(() => {
    cy.viewport(1920, 1080)
  })

  beforeEach(() => {
    clearTestState()
  })

  afterEach(() => {
    cy.dumpLogs()
  })

  it('should handle asset pair parameters in URL', () => {
    visitWithLocale('/liquidity/mainnet-v1.0/vote/ALGO')
    authenticateIfNeeded()

    cy.wait(3000)

    // Verify asset pair is set correctly
    cy.get('body').then(($body) => {
      const bodyText = $body.text()
      const hasAssetPair = 
        bodyText.match(/vote/i) &&
        bodyText.match(/algo/i)

      expect(hasAssetPair, 'asset pair should be displayed').to.exist
    })

    cy.log('Asset pair parameters handled')
  })

  it('should handle pool ID parameter', () => {
    visitWithLocale('/liquidity/mainnet-v1.0/vote/ALGO/3136517663/add')
    authenticateIfNeeded()

    cy.wait(3000)

    // Verify pool ID is recognized
    cy.get('body').then(($body) => {
      const url = $body.context.URL
      expect(url, 'URL should contain pool ID').to.include('3136517663')
    })

    cy.log('Pool ID parameter handled')
  })

  it('should handle lpFee query parameter', () => {
    visitWithLocale('/liquidity/mainnet-v1.0/vote/ALGO/3136517663/add?lpFee=100000')
    authenticateIfNeeded()

    cy.wait(3000)

    // Verify lpFee is applied
    cy.window()
      .its('__ADD_LIQUIDITY_DEBUG', { timeout: 20000 })
      .should((debug: any) => {
        const lpFee = String(debug.state?.lpFee)
        expect(lpFee, 'lpFee should be 100000').to.equal('100000')
      })

    cy.log('lpFee parameter handled')
  })

  it('should handle shape query parameter', () => {
    visitWithLocale('/liquidity/mainnet-v1.0/vote/ALGO/3136517663/add?shape=single')
    authenticateIfNeeded()

    cy.wait(3000)

    // Verify shape is applied
    cy.window()
      .its('__ADD_LIQUIDITY_DEBUG', { timeout: 20000 })
      .should((debug: any) => {
        const shape = debug.state?.shape
        expect(shape, 'shape should be single').to.equal('single')
      })

    cy.log('Shape parameter handled')
  })

  it('should handle low and high price query parameters', () => {
    visitWithLocale('/liquidity/mainnet-v1.0/vote/ALGO/3136517663/add?low=0.14&high=0.16')
    authenticateIfNeeded()

    cy.wait(3000)

    // Verify price bounds are applied
    cy.window()
      .its('__ADD_LIQUIDITY_DEBUG', { timeout: 20000 })
      .should((debug: any) => {
        const minPrice = Number(debug.state?.minPriceTrade)
        const maxPrice = Number(debug.state?.maxPriceTrade)
        const TOLERANCE = 0.05

        expect(minPrice, 'min price should be ~0.14').to.be.closeTo(0.14, TOLERANCE)
        expect(maxPrice, 'max price should be ~0.16').to.be.closeTo(0.16, TOLERANCE)
      })

    cy.log('Price parameters handled')
  })

  it('should handle multiple query parameters together', () => {
    visitWithLocale('/liquidity/mainnet-v1.0/vote/ALGO/3136517663/add?lpFee=100000&shape=single&low=0.14&high=0.16')
    authenticateIfNeeded()

    cy.wait(3000)

    // Verify all parameters are applied
    cy.window()
      .its('__ADD_LIQUIDITY_DEBUG', { timeout: 20000 })
      .should((debug: any) => {
        const lpFee = String(debug.state?.lpFee)
        const shape = debug.state?.shape
        const minPrice = Number(debug.state?.minPriceTrade)
        const maxPrice = Number(debug.state?.maxPriceTrade)

        expect(lpFee, 'lpFee should be set').to.equal('100000')
        expect(shape, 'shape should be set').to.equal('single')
        expect(minPrice, 'min price should be set').to.be.greaterThan(0)
        expect(maxPrice, 'max price should be set').to.be.greaterThan(0)
      })

    cy.log('Multiple parameters handled correctly')
  })

  it('should handle network parameter in URL', () => {
    visitWithLocale('/liquidity/mainnet-v1.0/vote/ALGO')
    authenticateIfNeeded()

    cy.wait(3000)

    // Verify network is recognized
    cy.get('body').then(($body) => {
      const url = $body.context.URL
      expect(url, 'URL should contain network').to.include('mainnet-v1.0')
    })

    cy.log('Network parameter handled')
  })

  it('should handle swap route with pool ID', () => {
    visitWithLocale('/swap/mainnet-v1.0/3136517663')
    authenticateIfNeeded()

    cy.wait(3000)

    // Verify swap page loads with pool
    cy.get('body').then(($body) => {
      const bodyText = $body.text()
      const hasSwapContent = bodyText.match(/swap/i)
      expect(hasSwapContent, 'swap page should load').to.exist
    })

    cy.log('Swap route parameters handled')
  })

  it('should handle remove liquidity route with pool ID', () => {
    visitWithLocale('/liquidity/mainnet-v1.0/3136517663/remove')
    authenticateIfNeeded()

    cy.wait(3000)

    // Verify remove page loads
    cy.get('body').then(($body) => {
      const bodyText = $body.text()
      const hasRemoveContent = bodyText.match(/remove/i)
      expect(hasRemoveContent, 'remove liquidity page should load').to.exist
    })

    cy.log('Remove liquidity route parameters handled')
  })

  it('should handle wall shape with equal min/max prices', () => {
    visitWithLocale('/liquidity/mainnet-v1.0/vote/ALGO/3136517663/add?shape=wall&low=0.15&high=0.15')
    authenticateIfNeeded()

    cy.wait(3000)

    // Verify wall shape is recognized
    cy.window()
      .its('__ADD_LIQUIDITY_DEBUG', { timeout: 20000 })
      .should((debug: any) => {
        const shape = debug.state?.shape
        expect(shape, 'shape should be wall').to.equal('wall')

        const minPrice = Number(debug.state?.minPriceTrade)
        const maxPrice = Number(debug.state?.maxPriceTrade)
        
        // For wall, min and max should be very close
        const diff = Math.abs(minPrice - maxPrice)
        expect(diff, 'min and max should be close for wall').to.be.lessThan(0.01)
      })

    cy.log('Wall shape route parameters handled')
  })
})
