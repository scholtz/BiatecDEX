// Shared utilities for CLAMM E2E tests

export interface SignInSelectors {
  emailInput: string
  passwordInput: string
  submitButton: string
  container: string
}

export const selectors: SignInSelectors = {
  emailInput: '#e',
  passwordInput: '#p',
  submitButton: 'button:contains("Continue")',
  container: '.algorand-authentication, [data-cy="auth-modal"], .p-dialog, [data-cy="auth-wrapper"]'
}

export const parseNumeric = (value: string | number | string[]) => {
  let s = String(Array.isArray(value) ? value.join('') : value)
    .replace(/\u00a0/g, '')
    .trim()
  if (s.indexOf(',') >= 0 && s.indexOf('.') === -1) {
    s = s.replace(',', '.')
  }
  s = s.replace(/,(?=\d{3}(?:\D|$))/g, '')
  return Number(s)
}

export const visitWithLocale = (url: string) =>
  cy.visit(url, {
    onBeforeLoad(win: any) {
      win.localStorage.setItem('biatec.locale', 'en')
    }
  })

export const authenticateIfNeeded = () => {
  cy.wait(2000)
  
  cy.get('body').then(($body) => {
    const bodyText = $body.text()
    const needsLogin = bodyText.match(/Sign in/i) && !bodyText.match(/Sign out/i)

    if (needsLogin) {
      cy.log('Authentication required, logging in...')
      const email = Cypress.env('LIQUIDITY_TEST_EMAIL') || 'test@biatec.io'
      const password: string = Cypress.env('LIQUIDITY_TEST_PASSWORD')

      if (!password) {
        throw new Error(
          'LIQUIDITY_TEST_PASSWORD environment variable must be set. ' +
            'Set it in .env file or via shell: export LIQUIDITY_TEST_PASSWORD="your-password"'
        )
      }

      cy.get(selectors.emailInput, { timeout: 20000 })
        .should('be.visible')
        .clear()
        .type(email, { log: false })
      cy.get(selectors.passwordInput, { timeout: 20000 })
        .should('be.visible')
        .clear()
        .type(password, { log: false })

      cy.wait(1000)
      cy.get(selectors.submitButton).click({ force: true })

      cy.log('Waiting for authentication to complete...')
      cy.wait(3000)
    } else {
      cy.log('Already authenticated, continuing...')
    }
  })
}

export const clearTestState = () => {
  cy.clearLocalStorage()
  cy.window().then((win: any) => {
    if (win.__ADD_LIQUIDITY_DEBUG) delete win.__ADD_LIQUIDITY_DEBUG
    if (win.__E2E_DEBUG_BOUNDS) delete win.__E2E_DEBUG_BOUNDS
    if (win.__E2E_DEBUG_CHANGES) delete win.__E2E_DEBUG_CHANGES
    if (win.__E2E_DEBUG_STATE) delete win.__E2E_DEBUG_STATE
    if (win.__BIATEC_E2E) delete win.__BIATEC_E2E
    if (win.__BIATEC_SKIP_PRICE_FETCH) delete win.__BIATEC_SKIP_PRICE_FETCH
    if (win.__CY_IGNORE_E2E_LOCK) delete win.__CY_IGNORE_E2E_LOCK
  })
}
