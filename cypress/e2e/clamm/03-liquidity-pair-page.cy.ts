// Liquidity page for an asset pair (no pool selected): the pools depth chart and the
// "my liquidity" panel render without a wallet.

import { visitWithLocale } from '../../support/auth'

describe('Liquidity page for an asset pair', () => {
  before(() => {
    cy.viewport(1920, 1080)
  })

  afterEach(() => {
    cy.dumpLogs()
  })

  it('renders the pools depth chart and the my-liquidity panel', () => {
    visitWithLocale('/en/liquidity/mainnet-v1.0/vote/ALGO')

    cy.url().should('include', '/en/liquidity/mainnet-v1.0/vote/ALGO')
    cy.get('[data-cy="pools-liquidity-chart"]', { timeout: 30000 }).should('be.visible')
    cy.get('[data-cy="my-liquidity"]', { timeout: 30000 }).should('be.visible')
  })
})
