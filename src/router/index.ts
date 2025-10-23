import { createRouter, createWebHistory } from 'vue-router'
import PublicHomeView from '../views/HomeView.vue'

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
      component: PublicHomeView
    },
    {
      path: '/:network/:assetCode/:currencyCode',
      name: 'homeWithAssets',
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
      path: '/liquidity/:network/:ammAppId/add',
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
      path: '/swap/:network/:ammAppId',
      name: 'pool-swap',
      component: () => import('../views/ManageLiquidity.vue')
    }
  ]
})

export default router
