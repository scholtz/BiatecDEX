// Add Liquidity deep link: the route query (lpFee, shape, low, high) and path (pair, pool) are
// reflected in the form and in the component's debug state. Nothing is signed. Uses the real
// mainnet vote/ALGO pool, as cypress/e2e/liquidity/route-overrides.cy.ts does.

import { parseNumeric, signInVia, visitWithLocale } from '../../support/auth'

const POOL_URL = '/en/liquidity/mainnet-v1.0/vote/ALGO/3136517663/add'
// 100000 is the smallest entry of LP_FEE_TIERS (src/scripts/state/liquiditySettingsRoute.ts)
const LP_FEE = '100000'

describe('Add liquidity route parameters', () => {
  before(() => {
    cy.viewport(1920, 1080)
  })

  afterEach(() => {
    cy.dumpLogs()
  })

  it('shows the route low/high in the price inputs', () => {
    visitWithLocale(`${POOL_URL}?lpFee=${LP_FEE}&shape=single&low=0.14&high=0.16`)

    cy.get('[data-cy="low-price-group"] input', { timeout: 30000 }).should(($input) => {
      expect(parseNumeric($input.val() ?? '')).to.be.closeTo(0.14, 0.001)
    })
    cy.get('[data-cy="high-price-group"] input').should(($input) => {
      expect(parseNumeric($input.val() ?? '')).to.be.closeTo(0.16, 0.001)
    })
  })

  it('applies lpFee, shape and the pair from the link', () => {
    visitWithLocale(`${POOL_URL}?lpFee=${LP_FEE}&shape=single&low=0.14&high=0.16`)

    cy.get(`[data-cy="lp-fee-${LP_FEE}"]`, { timeout: 30000 }).should(
      'have.attr',
      'aria-pressed',
      'true'
    )
    cy.location('search').should('include', `lpFee=${LP_FEE}`)

    cy.window().should((win) => {
      const debug = win.__ADD_LIQUIDITY_DEBUG
      expect(debug, 'debug handle').to.exist
      expect(debug?.state.shape).to.equal('single')
      expect(String(debug?.state.lpFee)).to.equal(LP_FEE)
      expect(debug?.store?.state?.assetCode?.toLowerCase()).to.equal('vote')
      expect(debug?.store?.state?.currencyCode?.toLowerCase()).to.equal('algo')
      expect(debug?.state.fullInfo?.length ?? 0, 'pools loaded').to.be.greaterThan(0)
    })
  })

  it('keeps the wall shape from the link', () => {
    visitWithLocale(`${POOL_URL}?lpFee=${LP_FEE}&shape=wall&low=0.15&high=0.15`)

    cy.window({ timeout: 30000 }).should((win) => {
      expect(win.__ADD_LIQUIDITY_DEBUG?.state.shape).to.equal('wall')
    })
  })

  it('asks anonymous visitors to authenticate and offers submit after sign-in', () => {
    visitWithLocale(`${POOL_URL}?lpFee=${LP_FEE}&shape=single&low=0.14&high=0.16`)

    cy.get('[data-cy="add-liquidity-authenticate"]', { timeout: 30000 }).should('exist')
    cy.get('[data-cy="add-liquidity-submit"]').should('not.exist')
    signInVia('add-liquidity-authenticate')
    cy.get('[data-cy="add-liquidity-submit"]', { timeout: 30000 }).should('exist')
  })
})
