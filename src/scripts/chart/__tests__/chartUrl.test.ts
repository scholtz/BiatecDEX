import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CHART_PROVIDER_STORAGE_KEY,
  buildChartUrl,
  chartProvidersForNetwork,
  readStoredChartProvider,
  resolveChartProvider,
  writeStoredChartProvider,
  type ChartUrlInput
} from '../chartUrl'

const MAINNET = 'mainnet-v1.0'
const TESTNET = 'testnet-v1.0'

const base: ChartUrlInput = {
  provider: 'biatec',
  env: MAINNET,
  assetId: 452399768,
  currencyId: 0,
  interval: 15,
  dark: true,
  locale: 'en'
}

const params = (url: string | null) => {
  expect(url).not.toBeNull()
  return new URL(url as string).searchParams
}

describe('chartProvidersForNetwork', () => {
  it('offers both providers on mainnet, Biatec only on testnet, none elsewhere', () => {
    expect(chartProvidersForNetwork(MAINNET)).toEqual(['biatec', 'vestige'])
    expect(chartProvidersForNetwork(TESTNET)).toEqual(['biatec'])
    expect(chartProvidersForNetwork('voimain-v1.0')).toEqual([])
    expect(chartProvidersForNetwork('dockernet-v1')).toEqual([])
  })
})

describe('resolveChartProvider', () => {
  it('keeps the preferred provider when the network has it', () => {
    expect(resolveChartProvider('biatec', MAINNET)).toBe('biatec')
    expect(resolveChartProvider('vestige', MAINNET)).toBe('vestige')
  })

  it('falls back to the other provider, else null', () => {
    expect(resolveChartProvider('vestige', TESTNET)).toBe('biatec')
    expect(resolveChartProvider('biatec', 'voimain-v1.0')).toBeNull()
    expect(resolveChartProvider('vestige', 'dockernet-v1')).toBeNull()
  })

  it('treats an unknown stored provider as the default (biatec)', () => {
    expect(resolveChartProvider('tradingview', MAINNET)).toBe('biatec')
    expect(resolveChartProvider(null, MAINNET)).toBe('biatec')
    expect(resolveChartProvider(undefined, TESTNET)).toBe('biatec')
  })
})

describe('buildChartUrl', () => {
  it('builds the Biatec Scan mainnet chart URL', () => {
    const url = buildChartUrl(base)
    expect(url).toBe(
      'https://algorand.scan.biatec.io/charts/?assetA=452399768&assetB=0&interval=15&theme=dark&locale=en'
    )
  })

  it('uses the testnet host on testnet', () => {
    const url = buildChartUrl({ ...base, env: TESTNET, assetId: 10458941 })
    expect(url?.startsWith('https://testnet.scan.biatec.io/charts/?')).toBe(true)
    expect(params(url).get('assetA')).toBe('10458941')
  })

  it('passes a non-ALGO quote asset as assetB', () => {
    const p = params(buildChartUrl({ ...base, assetId: 0, currencyId: 31566704 }))
    expect(p.get('assetA')).toBe('0')
    expect(p.get('assetB')).toBe('31566704')
  })

  it('normalises ALGO (negative or zero ids, bigint) to 0', () => {
    expect(params(buildChartUrl({ ...base, currencyId: -1 })).get('assetB')).toBe('0')
    expect(
      params(buildChartUrl({ ...base, assetId: 452399768n, currencyId: 0n })).get('assetA')
    ).toBe('452399768')
  })

  it('follows the theme', () => {
    expect(params(buildChartUrl({ ...base, dark: true })).get('theme')).toBe('dark')
    expect(params(buildChartUrl({ ...base, dark: false })).get('theme')).toBe('light')
  })

  it('passes the locale through', () => {
    expect(params(buildChartUrl({ ...base, locale: 'sk' })).get('locale')).toBe('sk')
    expect(params(buildChartUrl({ ...base, locale: 'zh' })).get('locale')).toBe('zh')
  })

  it('maps minute intervals to the Biatec Scan interval codes', () => {
    expect(params(buildChartUrl({ ...base, interval: 60 })).get('interval')).toBe('60')
    expect(params(buildChartUrl({ ...base, interval: 240 })).get('interval')).toBe('4H')
    expect(params(buildChartUrl({ ...base, interval: 1440 })).get('interval')).toBe('1D')
    expect(params(buildChartUrl({ ...base, interval: 5 })).get('interval')).toBe('5')
    expect(params(buildChartUrl({ ...base, interval: 0 })).get('interval')).toBe('15')
    expect(params(buildChartUrl({ ...base, interval: Number.NaN })).get('interval')).toBe('15')
    expect(params(buildChartUrl({ ...base, interval: undefined })).get('interval')).toBe('15')
  })

  it('keeps the Vestige URL unchanged', () => {
    expect(buildChartUrl({ ...base, provider: 'vestige', currencyId: 31566704 })).toBe(
      'https://vestige.fi/widget/452399768/chart?noCookie=true&tools=true&interval=15&denominatingAssetId=31566704'
    )
    expect(params(buildChartUrl({ ...base, provider: 'vestige' })).get('denominatingAssetId')).toBe(
      '0'
    )
  })

  it('keeps the path and query of an overridden host', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_BIATEC_CHARTS_MAINNET', 'https://proxy.example/charts?tenant=dex')
    const mod = await import('../chartUrl')
    const url = new URL(mod.buildChartUrl(base) as string)
    expect(url.origin + url.pathname).toBe('https://proxy.example/charts')
    expect(url.searchParams.get('tenant')).toBe('dex')
    expect(url.searchParams.get('assetA')).toBe('452399768')
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('returns null for a provider the network does not have', () => {
    expect(buildChartUrl({ ...base, provider: 'vestige', env: TESTNET })).toBeNull()
    expect(buildChartUrl({ ...base, env: 'voimain-v1.0' })).toBeNull()
  })

  it('returns null for equal or missing asset ids', () => {
    expect(buildChartUrl({ ...base, assetId: 5, currencyId: 5 })).toBeNull()
    expect(buildChartUrl({ ...base, assetId: 0, currencyId: -1 })).toBeNull()
    expect(buildChartUrl({ ...base, assetId: undefined })).toBeNull()
    expect(buildChartUrl({ ...base, currencyId: null })).toBeNull()
    expect(buildChartUrl({ ...base, assetId: Number.NaN })).toBeNull()
  })
})

describe('chart provider storage', () => {
  beforeEach(() => {
    const data = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
      clear: () => data.clear()
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('defaults to biatec, restores a stored value and ignores garbage', () => {
    expect(readStoredChartProvider()).toBe('biatec')
    writeStoredChartProvider('vestige')
    expect(localStorage.getItem(CHART_PROVIDER_STORAGE_KEY)).toBe('vestige')
    expect(readStoredChartProvider()).toBe('vestige')
    localStorage.setItem(CHART_PROVIDER_STORAGE_KEY, 'garbage')
    expect(readStoredChartProvider()).toBe('biatec')
  })

  it('falls back to biatec and does not throw when storage is blocked', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      }
    })
    expect(readStoredChartProvider()).toBe('biatec')
    expect(() => writeStoredChartProvider('vestige')).not.toThrow()
  })
})
