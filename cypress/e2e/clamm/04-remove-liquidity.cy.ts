// Remove Liquidity page for a pool. Nothing is signed; the withdraw amount depends on the
// test account's position, so only the form structure and the sign-in gate are asserted.

import { signInVia, visitWithLocale } from '../../support/auth'

describe('Remove liquidity', () => {
  before(() => {
    cy.viewport(1920, 1080)
  })

  afterEach(() => {
    cy.dumpLogs()
  })

  it('shows the percent input and swaps the authenticate button for submit after sign-in', () => {
    visitWithLocale('/en/liquidity/mainnet-v1.0/3136517663/remove')

    cy.get('[data-cy="remove-percent"]', { timeout: 30000 }).should('be.visible')
    cy.get('[data-cy="remove-submit"]').should('not.exist')

    signInVia('remove-liquidity-authenticate')

    cy.get('[data-cy="remove-liquidity-authenticate"]').should('not.exist')
    cy.get('[data-cy="remove-submit"]', { timeout: 30000 }).should('exist')
  })
})
