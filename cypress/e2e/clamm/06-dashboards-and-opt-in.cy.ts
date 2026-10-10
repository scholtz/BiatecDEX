// Trader dashboard, Liquidity provider dashboard and Asset opt-in render for an anonymous
// visitor with a sign-in prompt, and the prompt disappears after signing in.

import { signInVia, visitWithLocale } from '../../support/auth'

const dashboards = [
  { path: '/en/trader', title: 'Trader dashboard', authenticate: 'trader-dashboard-authenticate' },
  {
    path: '/en/liquidity-provider',
    title: 'Liquidity Provider Dashboard',
    authenticate: 'liquidity-provider-authenticate'
  }
]

describe('Dashboards and asset opt-in sign-in prompts', () => {
  before(() => {
    cy.viewport(1920, 1080)
  })

  afterEach(() => {
    cy.dumpLogs()
  })

  dashboards.forEach(({ path, title, authenticate }) => {
    it(`${path} prompts for sign-in and clears the prompt afterwards`, () => {
      visitWithLocale(path)

      cy.contains('h1', title, { timeout: 30000 }).should('be.visible')
      cy.url().should('include', path)

      signInVia(authenticate)
      cy.get(`[data-cy="${authenticate}"]`).should('not.exist')
    })
  })

  it('/en/trader/asset-opt-in prompts for sign-in', () => {
    visitWithLocale('/en/trader/asset-opt-in')

    cy.contains('.p-card-title', 'Opt-in to a new asset', { timeout: 30000 }).should('be.visible')
    signInVia('asset-opt-in-authenticate')
    cy.get('[data-cy="asset-opt-in-authenticate"]').should('not.exist')
  })
})
