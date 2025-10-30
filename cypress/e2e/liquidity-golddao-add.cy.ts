// E2E test: Navigate to main screen, locate GoldDAO, click Add Liquidity, perform sign-in.
// Password is sourced from Cypress env (cypress.config.cjs -> process.env.LIQUIDITY_TEST_PASSWORD)
// Ensure you export LIQUIDITY_TEST_PASSWORD in your shell before running.

interface SignInSelectors {
  emailInput: string
  passwordInput: string
  submitButton: string
  container: string
}

const selectors: SignInSelectors = {
  // Update these selectors if actual form uses different attributes
  emailInput: '#e',
  passwordInput: '#p',
  submitButton: 'button:contains("Continue")',
  container: '.algorand-authentication, [data-cy="auth-modal"], .p-dialog, [data-cy="auth-wrapper"]'
}

describe('GoldDAO Add Liquidity flow', () => {
  before(() => {
    cy.viewport(1920, 1080)
  })

  it('signs in after choosing Add Liquidity for GoldDAO', () => {
    const email = Cypress.env('LIQUIDITY_TEST_EMAIL') || 'test@biatec.io'
    const password: string = Cypress.env('LIQUIDITY_TEST_PASSWORD')

    // Fail fast if password not provided to avoid accidental blank submission
    expect(password, 'Env LIQUIDITY_TEST_PASSWORD must be set').to.have.length.greaterThan(0)

    cy.visit('/', {
      onBeforeLoad(win: any) {
        win.localStorage.setItem('biatec.locale', 'en')
      }
    })

    // Wait for GoldDAO text to appear (case-insensitive)
    cy.contains(/GoldDAO/i, { timeout: 30000 }).should('be.visible')

    cy.wait(1000)
    // Scope to the row containing GoldDAO and click its Add Liquidity icon (plus icon on right side).
    cy.contains(/GoldDAO/i)
      .closest('tr, .p-datatable-row, .asset-row')
      .within(() => {
        cy.get('[data-cy="add-liquidity"], .pi.pi-plus-circle, .pi.pi-plus')
          .first()
          .click({ force: true })
      })

    // Assert we navigated to a liquidity add route (pattern may differ). Optional.
    cy.location('pathname').should('match', /liquidity/i)

    // Wait for authentication container/modal
    cy.contains(/Sign in/i, { timeout: 30000 }).should('be.visible')

    // Fill credentials.
    cy.get(selectors.emailInput, { timeout: 20000 })
      .should('be.visible')
      .clear()
      .type(email, { log: false })
    cy.get(selectors.passwordInput, { timeout: 20000 })
      .should('be.visible')
      .clear()
      .type(password, { log: false })

    cy.wait(1000)
    // Submit via button
    cy.get(selectors.submitButton).click({ force: true })

    // Post-login expectation: user header account snippet or liquidity form
    cy.window().its('__authStore.isAuthenticated', { timeout: 20000 }).should('eq', true)
    // Or fallback to checking liquidity keyword
    cy.contains(/Liquidity/i, { timeout: 20000 })
    cy.wait(1000)
  })
})
