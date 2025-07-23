<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import Menubar from 'primevue/menubar'
import Badge from 'primevue/badge'
import Logo from '@/assets/projects/dex.svg?raw'
import { AssetsService } from '@/service/AssetsService'
import type { MenuItem } from 'primevue/menuitem'
import { useRoute, useRouter } from 'vue-router'
import { useAVMAuthentication } from 'algorand-authentication-component-vue'
const router = useRouter()
const route = useRoute()
const store = useAppStore()
const { authStore, logout } = useAVMAuthentication()

onMounted(() => {
  setAssetFromRoute()
  setCurrencyFromRoute()
})

watch(
  () => authStore.isAuthenticated,
  () => {
    setAssetFromRoute()
    setCurrencyFromRoute()
    makeMenu()
  }
)
const setAssetFromRoute = () => {
  console.log('setAssetFromRoute', route.params.assetCode)
  if (route.params.assetCode) {
    const asset = AssetsService.getAsset(route.params.assetCode as string)
    if (asset) {
      store.state.assetCode = asset.code
      store.state.assetName = asset.name
      store.state.pair.asset = asset
    }
  }
  console.log('store.state.pair', store.state.pair)
}
watch(
  () => route?.params?.assetCode,
  () => {
    setAssetFromRoute()
  }
)
const setCurrencyFromRoute = () => {
  if (route.params.currencyCode) {
    const currency = AssetsService.getAsset(route.params.currencyCode as string)
    if (currency) {
      store.state.currencyCode = currency.code
      store.state.currencyName = currency.name
      store.state.pair.currency = currency
    }
  }
}
watch(
  () => route?.params?.currencyCode,
  () => {
    setCurrencyFromRoute()
  }
)

const makeMenu = () => {
  const menuItems: MenuItem[] = []
  let auth: {}
  if (authStore.isAuthenticated) {
    auth = {
      label: 'Logout',
      icon: 'pi pi-lock',
      command: async () => {
        logout()
        store.state.forceAuth = false
      }
    }
  } else {
    auth = {
      label: 'Login',
      icon: 'pi pi-unlock',
      command: async () => {
        store.state.forceAuth = true
      }
    }
  }
  ;[
    {
      label: 'DEX',
      icon: 'pi pi-home',
      items: [
        {
          label: 'Trading screen',
          icon: 'pi pi-dollar',
          route: '/'
        },
        {
          label: 'Manage liquidity',
          icon: 'pi pi-flag',
          command: async () => {
            if (route.name === 'home' || route.name === 'homeWithAssets') {
              router.push({
                name: 'liquidity-with-assets',
                params: {
                  network: store.state.env,
                  assetCode: store.state.assetCode,
                  currencyCode: store.state.currencyCode
                }
              })
            } else {
              router.push(
                `/liquidity/${store.state.env}/${store.state.assetCode}/${store.state.currencyCode}`
              )
            }
          }
        },
        {
          label: 'About Biatec DEX',
          icon: 'pi pi-question',
          route: '/about'
        },
        auth
      ]
    },
    {
      label: 'Asset: ' + store.state.assetName,
      items: makeAssets()
    },
    {
      label: 'Currency: ' + store.state.currencyName,
      items: makeCurrencies()
    },
    {
      label: store.state.envName,
      icon: 'pi pi-cog',
      items: [
        {
          label: 'Algorand',
          icon: 'pi pi-cog',
          command: async () => {
            store.setChain('mainnet-v1.0')
            if (route.name && route.params) {
              router.replace({
                name: route.name as string,
                params: {
                  ...route.params,
                  network: store.state.env
                }
              })
            } else {
              router.push(
                `/${store.state.env}/${store.state.assetCode}/${store.state.currencyCode}`
              )
            }
          }
        },
        {
          label: 'Testnet',
          icon: 'pi pi-cog',
          command: async () => {
            store.setChain('testnet-v1.0')
            if (route.name && route.params) {
              router.replace({
                name: route.name as string,
                params: {
                  ...route.params,
                  network: store.state.env
                }
              })
            } else {
              router.push(
                `/${store.state.env}/${store.state.assetCode}/${store.state.currencyCode}`
              )
            }
          }
        },
        // {
        //   label: 'VOI',
        //   icon: 'pi pi-cog',
        //   command: async () => {
        //     store.setChain('voimain-v1.0')
        //     router.push(`/${store.state.env}/${store.state.assetCode}/${store.state.currencyCode}`)
        //   }
        // },
        {
          label: 'Localnet',
          icon: 'pi pi-cog',
          command: async () => {
            store.setChain('dockernet-v1')
            if (route.name && route.params) {
              router.replace({
                name: route.name as string,
                params: {
                  ...route.params,
                  network: store.state.env
                }
              })
            } else {
              router.push(
                `/${store.state.env}/${store.state.assetCode}/${store.state.currencyCode}`
              )
            }
          }
        },
        {
          label: 'Configuration',
          icon: 'pi pi-cog',
          route: '/settings'
        }
      ]
    }
  ].forEach((i) => menuItems.push(i))
  items.value = menuItems
  console.log('menuItems', menuItems)
}
const makeCurrencies = () => {
  const ret = []
  for (let currency of AssetsService.getCurrencies()) {
    if (currency.network != store.state.env) continue

    if (currency.code == store.state.assetCode) {
      ret.push({
        label: currency.name,
        command: async () => {
          // For routes with assetCode and currencyCode parameters
          if (
            route.name &&
            route.params &&
            (route.name === 'homeWithAssets' || route.name === 'liquidity-with-assets')
          ) {
            router.replace({
              name: route.name as string,
              params: {
                ...route.params,
                assetCode: store.state.currencyCode,
                currencyCode: currency.code
              }
            })
          } else if (route.name === 'home') {
            // Navigate to homeWithAssets when switching from home route
            router.push({
              name: 'homeWithAssets',
              params: {
                network: store.state.env,
                assetCode: store.state.currencyCode,
                currencyCode: currency.code
              }
            })
          } else if (route.name === 'liquidity') {
            // Navigate to liquidity-with-assets when switching from liquidity route
            router.push({
              name: 'liquidity-with-assets',
              params: {
                network: store.state.env,
                assetCode: store.state.currencyCode,
                currencyCode: currency.code
              }
            })
          } else {
            // Fallback for other routes
            router.push(`/${store.state.env}/${store.state.currencyCode}/${currency.code}`)
          }
        }
      })
    } else {
      ret.push({
        label: currency.name,
        command: async () => {
          // For routes with assetCode and currencyCode parameters
          if (
            route.name &&
            route.params &&
            (route.name === 'homeWithAssets' || route.name === 'liquidity-with-assets')
          ) {
            router.replace({
              name: route.name as string,
              params: {
                ...route.params,
                currencyCode: currency.code
              }
            })
          } else if (route.name === 'home') {
            // Navigate to homeWithAssets when switching from home route
            router.push({
              name: 'homeWithAssets',
              params: {
                network: store.state.env,
                assetCode: store.state.assetCode,
                currencyCode: currency.code
              }
            })
          } else if (route.name === 'liquidity') {
            // Navigate to liquidity-with-assets when switching from liquidity route
            router.push({
              name: 'liquidity-with-assets',
              params: {
                network: store.state.env,
                assetCode: store.state.assetCode,
                currencyCode: currency.code
              }
            })
          } else {
            // Fallback for other routes
            router.push(`/${store.state.env}/${store.state.assetCode}/${currency.code}`)
          }
        }
      })
    }
  }
  return ret
}
const makeAssets = () => {
  const ret = []
  for (let asset of AssetsService.getAssets()) {
    if (asset.code == store.state.currencyCode) continue
    if (asset.network != store.state.env) continue

    ret.push({
      label: asset.name,
      command: async () => {
        if (route.name && route.params && route.params.assetCode) {
          router.push({
            params: {
              ...route.params,
              assetCode: asset.code
            }
          })
        } else {
          router.push(`/${store.state.env}/${asset.code}/${store.state.currencyCode}`)
        }
      }
    })
  }
  return ret
}

const items = ref<any>([])
const makeThemes = () => {
  const allowed = [
    { name: 'Lara Dark Teal', file: 'lara-dark-teal', icon: 'pi pi-moon' },
    { name: 'Lara Light Teal', file: 'lara-light-teal', icon: 'pi pi-sun' },

    { name: 'Aura Dark Teal', file: 'aura-dark-teal', icon: 'pi pi-moon' },
    { name: 'Aura Light Teal', file: 'aura-light-teal', icon: 'pi pi-sun' },

    { name: 'Saga Blue', file: 'saga-blue', icon: 'pi pi-sun' },
    { name: 'Rhea Light', file: 'rhea', icon: 'pi pi-sun' },
    { name: 'Arya Purple', file: 'arya-purple', icon: 'pi pi-moon' },
    { name: 'Nova Alt', file: 'nova-alt', icon: 'pi pi-sun' },

    { name: 'Soho Dark', file: 'soho-dark', icon: 'pi pi-moon' },
    { name: 'Soho Light', file: 'soho-light', icon: 'pi pi-sun' },

    {
      name: 'Bootstrap Dark Purple',
      file: 'bootstrap4-dark-purple',
      icon: 'pi pi-moon'
    },
    {
      name: 'Bootstrap Light Purple',
      file: 'bootstrap4-light-purple',
      icon: 'pi pi-sun'
    }
  ]

  const ret = []
  for (const item of allowed) {
    ret.push({
      label: item.name,
      icon: item.icon,
      command: async () => {
        store.state.theme = item.file
        localStorage.setItem('lastTheme', item.file)
      }
    })
  }
  return ret
}
makeMenu()
</script>

<template>
  <div class="card m-2 mb-0">
    <Menubar :model="items" class="mb-2 bg-white/50 text-black">
      <template #start>
        <RouterLink to="/">
          <div class="svg-image" v-html="Logo"></div>
        </RouterLink>
      </template>
      <template #item="{ item, props, hasSubmenu, root }">
        <RouterLink
          v-if="item.route"
          :to="item.route"
          class="flex items-center p-menuitem-link p-2"
        >
          <span :class="item.icon" />
          <span class="ml-2">{{ item.label }}</span>
          <Badge
            v-if="item.badge"
            :class="{ 'ml-auto': !root, 'ml-2': root }"
            :value="item.badge"
          />
          <span
            v-if="item.shortcut"
            class="ml-auto border border-gray-200 rounded bg-gray-100 text-xs p-2"
            >{{ item.shortcut }}</span
          >
          <i
            v-if="hasSubmenu"
            :class="[
              'pi pi-angle-down',
              { 'pi-angle-down ml-2': root, 'pi-angle-right ml-auto': !root }
            ]"
          ></i>
        </RouterLink>

        <a
          v-else-if="item.url"
          :href="item.url"
          v-ripple
          class="flex items-center"
          v-bind="props.action"
          target="_blank"
        >
          <span :class="item.icon" />
          <span class="ml-2">{{ item.label }}</span>
          <Badge
            v-if="item.badge"
            :class="{ 'ml-auto': !root, 'ml-2': root }"
            :value="item.badge"
          />
          <span
            v-if="item.shortcut"
            class="ml-auto border border-gray-200 rounded bg-gray-100 text-xs p-2"
            >{{ item.shortcut }}</span
          >
          <i
            v-if="hasSubmenu"
            :class="[
              'pi pi-angle-down',
              { 'pi-angle-down ml-2': root, 'pi-angle-right ml-auto': !root }
            ]"
          ></i>
        </a>
        <a v-else v-ripple class="flex items-center p-2" v-bind="props.action">
          <span :class="item.icon" />
          <span class="ml-2">{{ item.label }}</span>
          <Badge
            v-if="item.badge"
            :class="{ 'ml-auto': !root, 'ml-2': root }"
            :value="item.badge"
          />
          <span
            v-if="item.shortcut"
            class="ml-auto border border-gray-200 rounded bg-gray-100 text-xs p-2"
            >{{ item.shortcut }}</span
          >
          <i
            v-if="hasSubmenu"
            :class="[
              'pi pi-angle-down',
              { 'pi-angle-down ml-2': root, 'pi-angle-right ml-auto': !root }
            ]"
          ></i>
        </a>
      </template>
    </Menubar>
  </div>
</template>
<style>
.p-submenu-list {
  min-width: 300px;
}
</style>
