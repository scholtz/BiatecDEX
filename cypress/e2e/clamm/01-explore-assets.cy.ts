// Explore Assets (home page): the asset table renders and its add-liquidity action navigates
// to the liquidity page. Needs the real trade API (no mocking), like the other Cypress specs.

import { visitWithLocale } from '../../support/auth'

describe('Explore Assets', () => {
  before(() => {
    cy.viewport(1920, 1080)
  })

  afterEach(() => {
    cy.dumpLogs()
  })

  it('lists assets and routes the add-liquidity action to the liquidity page', () => {
    visitWithLocale('/en')

    cy.contains('h1', 'Explore Assets', { timeout: 30000 }).should('be.visible')
    cy.contains('tr', /GoldDAO/i, { timeout: 30000 })
      .find('[data-cy^="asset-add-"] button')
      .should('be.visible')
      .click({ force: true })

    cy.url().should('match', /\/en\/liquidity\/[^/]+\/[^/]+\/[^/]+/)
  })
})
