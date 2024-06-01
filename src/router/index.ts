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
    }
  ]
})

export default router
