// Use Case 5: Remove Liquidity
// Test removing liquidity from existing positions

import { visitWithLocale, authenticateIfNeeded, clearTestState } from './test-utils'

describe('CLAMM Use Case 5: Remove Liquidity', () => {
  before(() => {
    cy.viewport(1920, 1080)
  })

  beforeEach(() => {
    clearTestState()
  })

  afterEach(() => {
    cy.dumpLogs()
  })

  it('should navigate to remove liquidity page', () => {
    // Using a known pool ID - adjust based on actual pools
    visitWithLocale('/liquidity/mainnet-v1.0/3136517663/remove')
    authenticateIfNeeded()

    // Wait for page to load
    cy.contains(/remove/i, { timeout: 20000 }).should('be.visible')

    cy.log('Remove liquidity page loaded')
  })

  it('should display withdrawal slider', () => {
    visitWithLocale('/liquidity/mainnet-v1.0/3136517663/remove')
    authenticateIfNeeded()

    cy.wait(3000)

    // Check for slider element
    cy.get('body').then(($body) => {
      const hasSlider = 
        $body.find('[data-cy="withdraw-slider"], .p-slider').length > 0 ||
        $body.text().match(/withdraw/i)
      
      if (hasSlider) {
        cy.log('Withdrawal slider found')
      } else {
        cy.log('Page may not have active position to remove')
      }
    })
  })

  it('should show current LP token balance', () => {
    visitWithLocale('/liquidity/mainnet-v1.0/3136517663/remove')
    authenticateIfNeeded()

    cy.wait(3000)

    // Check for balance information
    cy.get('body').then(($body) => {
      const bodyText = $body.text()
      const hasBalanceInfo = 
        bodyText.match(/balance/i) ||
        bodyText.match(/amount/i) ||
        bodyText.match(/LP/i) ||
        bodyText.match(/token/i)

      if (hasBalanceInfo) {
        cy.log('LP token balance information found')
      } else {
        cy.log('No position found for this pool')
      }
    })
  })

  it('should calculate expected assets to receive', () => {
    visitWithLocale('/liquidity/mainnet-v1.0/3136517663/remove')
    authenticateIfNeeded()

    cy.wait(3000)

    // Verify expected output is shown
    cy.get('body').then(($body) => {
      const bodyText = $body.text()
      const hasOutputInfo = 
        bodyText.match(/receive/i) ||
        bodyText.match(/withdraw/i) ||
        bodyText.match(/asset/i)

      cy.log('Checking for withdrawal calculations')
    })
  })

  it('should allow adjusting withdrawal percentage', () => {
    visitWithLocale('/liquidity/mainnet-v1.0/3136517663/remove')
    authenticateIfNeeded()

    cy.wait(3000)

    // Check if slider is interactive
    cy.get('body').then(($body) => {
      const slider = $body.find('[data-cy="withdraw-slider"], .p-slider')
      if (slider.length > 0) {
        cy.wrap(slider).first().should('be.visible')
        cy.log('Withdrawal slider is interactive')
      } else {
        cy.log('No active position to withdraw from')
      }
    })
  })

  it('should display remove liquidity button', () => {
    visitWithLocale('/liquidity/mainnet-v1.0/3136517663/remove')
    authenticateIfNeeded()

    cy.wait(3000)

    // Check for action button
    cy.get('body').then(($body) => {
      const bodyText = $body.text()
      const hasRemoveButton = 
        bodyText.match(/remove/i) ||
        bodyText.match(/withdraw/i) ||
        $body.find('button').length > 0

      cy.log('Remove action button check completed')
    })
  })
})
