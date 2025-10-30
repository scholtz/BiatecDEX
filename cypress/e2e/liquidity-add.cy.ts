describe('Liquidity min/max propagation', () => {
  before(() => {
    // Ensure full HD resolution for video capture
    cy.viewport(1920, 1080)
  })
  const e2eData = {
    assetRows: [
      {
        assetId: 452399768,
        assetName: 'VoteCoin',
        assetCode: 'vote',
        assetSymbol: '$vote',
        decimals: 6,
        poolCount: 2,
        assetTvl: 150_000,
        otherAssetTvl: 85_000,
        totalTvlUsd: 235_000,
        usdPrice: 0.5,
        currentPriceUsd: 0.5,
        vwap1dUsd: 0.5,
        vwap7dUsd: 0.5,
        volume1dUsd: 1_200,
        volume7dUsd: 6_500,
        priceLoading: false
      }
    ],
    pools: [
      {
        appId: 555001,
        assetA: 452399768,
        assetB: 227855942,
        assetAUnit: '$vote',
        assetBUnit: '€',
        assetADecimals: 6,
        assetBDecimals: 6,
        min: 1.2,
        max: 3.4,
        mid: 2.3,
        price: 2.3,
        fee: 3_000_000,
        assetABalance: 2_500_000_000,
        assetBBalance: 5_000_000_000
      },
      {
        appId: 555002,
        assetA: 452399768,
        assetB: 227855942,
        assetAUnit: '$vote',
        assetBUnit: '€',
        assetADecimals: 6,
        assetBDecimals: 6,
        min: 0.8,
        max: 1.6,
        mid: 1.2,
        price: 1.2,
        fee: 1_000_000,
        assetABalance: 1_800_000_000,
        assetBBalance: 3_200_000_000
      }
    ]
  } as const

  const parseNumeric = (value: string | number | string[]) => {
    let s = String(Array.isArray(value) ? value.join('') : value)
      .replace(/\u00a0/g, '')
      .trim()
    // Use indexOf for compatibility
    if (s.indexOf(',') >= 0 && s.indexOf('.') === -1) {
      s = s.replace(',', '.')
    }
    s = s.replace(/,(?=\d{3}(?:\D|$))/g, '')
    return Number(s)
  }

  const assertPriceInputs = (expectedMin: number, expectedMax: number) => {
    // Allow a small tolerance due to internal tick rounding / precision adjustments in AddLiquidity
    const TOLERANCE = 0.02
    // Wait for internal debug bounds to be present
    cy.window().should((win: any) => {
      expect(win.__E2E_DEBUG_BOUNDS, 'debug bounds present').to.exist
    })
    // First verify internal reactive state snapshot
    cy.window().then((win: any) => {
      const dbg = win.__E2E_DEBUG_BOUNDS
      if (dbg) {
        cy.log(`Debug phase=${dbg.phase} min=${dbg.min} max=${dbg.max} mid=${dbg.mid}`)
        expect(dbg.min, 'internal minPriceTrade').to.be.closeTo(expectedMin, TOLERANCE)
        expect(dbg.max, 'internal maxPriceTrade').to.be.closeTo(expectedMax, TOLERANCE)
        if (Array.isArray(win.__E2E_DEBUG_CHANGES)) {
          cy.log(`Change events: ${win.__E2E_DEBUG_CHANGES.length}`)
          win.__E2E_DEBUG_CHANGES.forEach((ev: any, idx: number) => {
            cy.log(`#${idx} phase=${ev.phase} min=${ev.min} max=${ev.max}`)
          })
        }
      } else {
        cy.log('No __E2E_DEBUG_BOUNDS present')
      }
    })
    cy.get('[data-cy="low-price-group"] input')
      .invoke('val')
      .then((val) => {
        const actual = parseNumeric(val ?? '')
        expect(actual).to.be.closeTo(expectedMin, TOLERANCE)
      })

    cy.get('[data-cy="high-price-group"] input')
      .invoke('val')
      .then((val) => {
        const actual = parseNumeric(val ?? '')
        expect(actual).to.be.closeTo(expectedMax, TOLERANCE)
      })
  }

  it('keeps pool price bounds in sync with the add liquidity form', () => {
    const firstPool = e2eData.pools[0]
    const secondPool = e2eData.pools[1]

    cy.visit(`/liquidity/mainnet-v1.0/${firstPool.appId}/add?fee=${firstPool.fee}`, {
      onBeforeLoad(win: any) {
        win.__BIATEC_E2E = JSON.parse(JSON.stringify(e2eData))
        // Force English locale
        win.localStorage.setItem('biatec.locale', 'en')
      }
    })
    cy.wait(1000)
    cy.window().its('__BIATEC_E2E').should('deep.equal', e2eData)
    cy.wait(1000)
    cy.get('[data-cy="low-price-group"] input', { timeout: 10000 }).should('be.visible')
    cy.wait(1000)
    assertPriceInputs(firstPool.min, firstPool.max)
    cy.wait(1000)

    cy.visit(`/liquidity/mainnet-v1.0/${secondPool.appId}/add?fee=${secondPool.fee}`, {
      onBeforeLoad(win: any) {
        win.__BIATEC_E2E = JSON.parse(JSON.stringify(e2eData))
        win.localStorage.setItem('biatec.locale', 'en')
      }
    })
    cy.wait(1000)
    // Wait for restoration timeout phase
    cy.wait(100)
    cy.wait(1000)
    cy.get('[data-cy="high-price-group"] input', { timeout: 10000 }).should('be.visible')
    cy.wait(1000)
    assertPriceInputs(secondPool.min, secondPool.max)
    cy.wait(1000)
  })
})
