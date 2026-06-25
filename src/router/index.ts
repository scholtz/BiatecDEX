import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import AllAssetsView from '../views/AllAssetsView.vue'
import PublicHomeView from '../views/HomeView.vue'
import { AssetsService } from '@/service/AssetsService'
import { getCurrentLocale, getSupportedLocales, setLocale, type SupportedLocale } from '@/i18n'
import { ALL_HELP_SEGMENTS } from './helpLocales'

// ── Route definitions ────────────────────────────────────────────────────────
// All routes carry a leading /:lang parameter so every URL encodes the UI
// language.  Legacy paths (without the lang prefix) are handled by the
// beforeEach guard which prepends the current locale and redirects.

const routes: RouteRecordRaw[] = [
  // ── Core app routes ────────────────────────────────────────────────────
  {
    path: '/:lang',
    name: 'home',
    component: AllAssetsView
  },
  {
    path: '/:lang/trade',
    name: 'trade',
    component: PublicHomeView
  },
  {
    path: '/:lang/trade/:network/:assetCode/:currencyCode',
    name: 'tradeWithAssets',
    component: PublicHomeView
  },
  {
    path: '/:lang/settings',
    name: 'auth-settings',
    component: () => import('../views/Settings/SettingsView.vue')
  },
  {
    path: '/:lang/about',
    name: 'about',
    component: () => import('../views/Info/AboutBiatecDEX.vue')
  },
  {
    path: '/:lang/liquidity',
    name: 'liquidity',
    component: () => import('../views/ManageLiquidity.vue')
  },
  {
    path: '/:lang/liquidity/:network/:assetCode/:currencyCode',
    name: 'liquidity-with-assets',
    component: () => import('../views/ManageLiquidity.vue')
  },
  {
    path: '/:lang/liquidity/:network/:assetCode/:currencyCode/:ammAppId/add',
    name: 'add-liquidity',
    component: () => import('../views/ManageLiquidity.vue')
  },
  {
    path: '/:lang/liquidity/:network/:ammAppId/remove',
    name: 'remove-liquidity',
    component: () => import('../views/ManageLiquidity.vue')
  },
  {
    path: '/:lang/trader',
    name: 'trader-dashboard',
    component: () => import('@/views/TraderDashboard.vue')
  },
  {
    path: '/:lang/trader/asset-opt-in',
    name: 'asset-opt-in',
    component: () => import('@/views/AssetOptIn.vue')
  },
  {
    path: '/:lang/liquidity-provider',
    name: 'liquidity-provider-dashboard',
    component: () => import('@/views/LiquidityProviderDashboard.vue')
  },
  {
    path: '/:lang/explore-assets',
    name: 'explore-assets',
    component: () => import('@/views/AllAssetsView.vue')
  },
  {
    path: '/:lang/swap/:network/:ammAppId',
    name: 'pool-swap',
    component: () => import('../views/ManageLiquidity.vue')
  },

  // ── Help routes (English / canonical) ─────────────────────────────────
  // slugSegment accepts both the canonical English slug and any localized
  // slug — HelpDetailView resolves it to canonical using the URL lang.
  {
    path: '/:lang/help',
    name: 'help',
    component: () => import('@/views/Help/HelpView.vue')
  },
  {
    path: '/:lang/help/:slugSegment',
    name: 'help-detail',
    component: () => import('@/views/Help/HelpDetailView.vue')
  },

  // ── Help routes (localized path segments) ─────────────────────────────
  // For each unique translated "help" word (pomoc, segitseg, aiuto, …) we
  // register one index route and one detail route.  The component is the
  // same; slug resolution happens inside the component using the URL lang.
  ...ALL_HELP_SEGMENTS.filter((seg) => seg !== 'help').flatMap((seg) => [
    {
      path: `/:lang/${seg}`,
      name: `help-${seg}`,
      component: () => import('@/views/Help/HelpView.vue')
    } as RouteRecordRaw,
    {
      path: `/:lang/${seg}/:slugSegment`,
      name: `help-detail-${seg}`,
      component: () => import('@/views/Help/HelpDetailView.vue')
    } as RouteRecordRaw
  ]),

  // ── Root redirect ──────────────────────────────────────────────────────
  // The root path has no lang prefix; redirect to the detected locale home.
  {
    path: '/',
    redirect: () => `/${getCurrentLocale()}`
  }
]

const router = createRouter({
  history: createWebHistory(import.meta?.env?.BASE_URL),
  scrollBehavior(_to, _from, savedPosition) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(savedPosition ?? { left: 0, top: 0 }), 1)
    })
  },
  routes
})

// ── Guard: legacy-URL normalisation + lang sync ──────────────────────────────
// Fires before every navigation.  Two responsibilities:
//   1. If the URL has no /:lang prefix (legacy bookmark / hard-coded push),
//      prepend the current locale and redirect transparently.
//   2. If the URL lang differs from the active locale, switch the locale so
//      the page renders in the language specified in the URL.
router.beforeEach(async (to, _from) => {
  const supported = getSupportedLocales()
  const pathParts = to.path.split('/').filter(Boolean)
  const firstSegment = pathParts[0] ?? ''

  if (!(supported as string[]).includes(firstSegment)) {
    // No valid locale prefix → add current locale and retry.
    const locale = getCurrentLocale()
    const tail = to.path === '/' ? '' : to.path
    return `/${locale}${tail}`
  }

  // Valid locale prefix present — sync the app locale if it differs.
  const urlLang = firstSegment as SupportedLocale
  if (urlLang !== getCurrentLocale()) {
    await setLocale(urlLang)
  }
})

// ── Guard: asset-pair ordering (trade routes) ────────────────────────────────
router.beforeEach((to, _from, next) => {
  if (
    to.name === 'tradeWithAssets' &&
    typeof to.params.assetCode === 'string' &&
    typeof to.params.currencyCode === 'string'
  ) {
    const assetCode = (to.params.assetCode as string).toLowerCase()
    const currencyCode = (to.params.currencyCode as string).toLowerCase()

    const shouldReverse = AssetsService.selectPrimaryAsset(assetCode, currencyCode)
    if (shouldReverse.invert) {
      return next({
        name: 'tradeWithAssets',
        params: {
          lang: to.params.lang,
          network: to.params.network,
          assetCode: currencyCode,
          currencyCode: assetCode
        }
      })
    }
  }
  next()
})

// ── Guard: asset-pair ordering (liquidity routes) ───────────────────────────
router.beforeEach((to, _from, next) => {
  if (
    (to.name === 'liquidity-with-assets' || to.name === 'add-liquidity') &&
    typeof to.params.assetCode === 'string' &&
    typeof to.params.currencyCode === 'string'
  ) {
    const assetCode = (to.params.assetCode as string).toLowerCase()
    const currencyCode = (to.params.currencyCode as string).toLowerCase()

    const shouldReverse = AssetsService.selectPrimaryAsset(assetCode, currencyCode)
    if (shouldReverse.invert) {
      return next({
        name: to.name as string,
        params: {
          ...to.params,
          assetCode: currencyCode,
          currencyCode: assetCode
        }
      })
    }
  }
  next()
})

export default router
