// Pool swap page for a pool. Nothing is signed.

import { signInVia, visitWithLocale } from '../../support/auth'

describe('Pool swap', () => {
  before(() => {
    cy.viewport(1920, 1080)
  })

  afterEach(() => {
    cy.dumpLogs()
  })

  it('shows the amount input and keeps execute disabled while the amount is 0', () => {
    visitWithLocale('/en/swap/mainnet-v1.0/3136517663')

    cy.get('[data-cy="swap-amount"]', { timeout: 30000 }).should('be.visible')
    cy.get('[data-cy="swap-execute"]').should('not.exist')

    signInVia('pool-swap-authenticate')

    // swapAmountFrom starts at 0 and the button is disabled while it is 0 (PoolSwap.vue)
    cy.get('[data-cy="swap-execute"]', { timeout: 30000 }).should('be.disabled')
  })
})
