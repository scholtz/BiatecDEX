// Shared helpers for specs that exercise the ARC-76 sign-in wall.
// The selectors and flow mirror cypress/e2e/liquidity/liquidity-golddao-add.cy.ts.

export const signInSelectors = {
  emailInput: '#e',
  passwordInput: '#p',
  submitButton: 'button:contains("Continue")'
}

/** Parses an InputNumber display value ("0.14", "1,234.5", "0,14") into a number. */
export const parseNumeric = (value: string | number | string[]): number => {
  let s = String(Array.isArray(value) ? value.join('') : value)
    .replace(/ /g, '')
    .trim()
  if (s.indexOf(',') >= 0 && s.indexOf('.') === -1) {
    s = s.replace(',', '.')
  }
  s = s.replace(/,(?=\d{3}(?:\D|$))/g, '')
  return Number(s)
}

export const visitWithLocale = (url: string) =>
  cy.visit(url, {
    onBeforeLoad(win) {
      win.localStorage.setItem('biatec.locale', 'en')
    }
  })

/**
 * Clicks the page's own "authenticate" button (identified by its data-cy hook), signs in with
 * the LIQUIDITY_TEST_* credentials and waits until the auth store reports a session.
 */
export const signInVia = (authenticateDataCy: string) => {
  const email: string = Cypress.env('LIQUIDITY_TEST_EMAIL') || 'test@biatec.io'
  const password: string = Cypress.env('LIQUIDITY_TEST_PASSWORD')
  expect(password, 'Env LIQUIDITY_TEST_PASSWORD must be set').to.have.length.greaterThan(0)

  cy.get(`[data-cy="${authenticateDataCy}"]`, { timeout: 30000 }).click({ force: true })
  cy.get(signInSelectors.emailInput, { timeout: 20000 })
    .should('be.visible')
    .clear()
    .type(email, { log: false })
  cy.get(signInSelectors.passwordInput, { timeout: 20000 })
    .should('be.visible')
    .clear()
    .type(password, { log: false })
  cy.get(signInSelectors.submitButton).should('be.visible').click({ force: true })
  cy.window().its('__authStore.isAuthenticated', { timeout: 30000 }).should('eq', true)
}
