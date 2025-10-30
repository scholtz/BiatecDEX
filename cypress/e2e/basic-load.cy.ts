// https://on.cypress.io/api

describe('Basic tests', () => {
  before(() => {
    // Ensure full HD resolution for video capture
    cy.viewport(1920, 1080)
  })
  it('visits the app root url', () => {
    cy.visit('/', {
      onBeforeLoad(win: any) {
        win.localStorage.setItem('biatec.locale', 'en')
      }
    })
    cy.contains('Explore Assets')
    // Wait for dynamic content containing 'Algorand' to appear (e.g., asset list or heading)
    cy.contains(/Algorand/i, { timeout: 15000 }).should('be.visible')
    cy.wait(1000)
  })
})
