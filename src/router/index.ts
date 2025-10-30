import { createRouter, createWebHistory } from 'vue-router'
import AllAssetsView from '../views/AllAssetsView.vue'
import PublicHomeView from '../views/HomeView.vue'
import { AssetManager } from '@algorandfoundation/algokit-utils/types/asset-manager'
import { AssetsService } from '@/service/AssetsService'

const router = createRouter({
  history: createWebHistory(import.meta?.env?.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve({ left: 0, top: 0 })
      }, 1)
    })
  },

  routes: [
    {
      path: '/',
      name: 'home',
      component: AllAssetsView
    },
    {
      path: '/trade',
      name: 'trade',
      component: PublicHomeView
    },
    {
      path: '/trade/:network/:assetCode/:currencyCode',
      name: 'tradeWithAssets',
      component: PublicHomeView
    },
    {
      path: '/settings',
      name: 'auth-settings',
      component: () => import('../views/Settings/SettingsView.vue')
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/Info/AboutBiatecDEX.vue')
    },
    {
      path: '/liquidity',
      name: 'liquidity',
      component: () => import('../views/ManageLiquidity.vue')
    },
    {
      path: '/liquidity/:network/:assetCode/:currencyCode',
      name: 'liquidity-with-assets',
      component: () => import('../views/ManageLiquidity.vue')
    },
    {
      path: '/liquidity/:network/:assetCode/:currencyCode/:ammAppId/add',
      name: 'add-liquidity',
      component: () => import('../views/ManageLiquidity.vue')
    },
    {
      path: '/liquidity/:network/:ammAppId/remove',
      name: 'remove-liquidity',
      component: () => import('../views/ManageLiquidity.vue')
    },
    {
      path: '/trader',
      name: 'trader-dashboard',
      component: () => import('@/views/TraderDashboard.vue')
    },
    {
      path: '/trader/asset-opt-in',
      name: 'asset-opt-in',
      component: () => import('@/views/AssetOptIn.vue')
    },
    {
      path: '/liquidity-provider',
      name: 'liquidity-provider-dashboard',
      component: () => import('@/views/LiquidityProviderDashboard.vue')
    },
    {
      path: '/explore-assets',
      name: 'explore-assets',
      component: () => import('@/views/AllAssetsView.vue')
    },
    {
      path: '/swap/:network/:ammAppId',
      name: 'pool-swap',
      component: () => import('../views/ManageLiquidity.vue')
    }
  ]
})

// Route normalization: ensure preferred ordering (ALGO as currency) for vote/ALGO liquidity routes.
// If user navigates to /liquidity/:network/ALGO/vote -> redirect to /liquidity/:network/vote/ALGO
router.beforeEach((to, from, next) => {
  if (
    to.name === 'tradeWithAssets' &&
    typeof to.params.assetCode === 'string' &&
    typeof to.params.currencyCode === 'string'
  ) {
    const assetCode = (to.params.assetCode as string).toLowerCase() ?? ''
    const currencyCode = (to.params.currencyCode as string).toLowerCase()

    var shouldReverse = AssetsService.selectPrimaryAsset(assetCode, currencyCode)
    console.log('shouldReverse', shouldReverse)
    if (shouldReverse.invert) {
      return next({
        name: 'tradeWithAssets',
        params: {
          network: to.params.network,
          assetCode: currencyCode,
          currencyCode: assetCode
        }
      })
    }
  }
  next()
})

// Route normalization: ensure preferred ordering (ALGO as currency) for vote/ALGO liquidity routes.
// If user navigates to /liquidity/:network/ALGO/vote -> redirect to /liquidity/:network/vote/ALGO
router.beforeEach((to, from, next) => {
  if (
    (to.name === 'liquidity-with-assets' || to.name === 'add-liquidity') &&
    typeof to.params.assetCode === 'string' &&
    typeof to.params.currencyCode === 'string'
  ) {
    const assetCode = (to.params.assetCode as string).toLowerCase() ?? ''
    const currencyCode = (to.params.currencyCode as string).toLowerCase()

    var shouldReverse = AssetsService.selectPrimaryAsset(assetCode, currencyCode)
    console.log('shouldReverse', shouldReverse)
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
