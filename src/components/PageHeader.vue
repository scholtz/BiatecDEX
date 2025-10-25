<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useAppStore } from '../stores/app'
import Menubar from 'primevue/menubar'
import Badge from 'primevue/badge'
import Logo from '../assets/projects/dex.svg?raw'
import { AssetsService } from '../service/AssetsService'
import type { MenuItem } from 'primevue/menuitem'
import { useRoute, useRouter } from 'vue-router'
import { useAVMAuthentication } from 'algorand-authentication-component-vue'
import { useI18n } from 'vue-i18n'
import { getSupportedLocales, setLocale, getCurrentLocale, type SupportedLocale } from '@/i18n'
const router = useRouter()
const route = useRoute()
const store = useAppStore()
const { authStore, logout } = useAVMAuthentication()
const { t, locale } = useI18n()
const supportedLocales = getSupportedLocales()
const selectedLocale = ref<SupportedLocale>(getCurrentLocale())

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
  makeMenu()
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
      if (currency.symbol) {
        store.state.currencySymbol = currency.symbol
      }
      store.state.pair.currency = currency
    }
  }
  makeMenu()
}
watch(
  () => route?.params?.currencyCode,
  () => {
    setCurrencyFromRoute()
  }
)

const items = ref<MenuItem[]>([])

const changeLocale = async (code: SupportedLocale) => {
  if (code === selectedLocale.value) {
    return
  }

  await setLocale(code)
  selectedLocale.value = code
  makeMenu()
}

const makeMenu = () => {
  const menuItems: MenuItem[] = []
  
  // Main DEX menu (left side)
  ;[
    {
      label: t('layout.header.menu.dex'),
      icon: 'pi pi-home',
      items: [
        {
          label: t('layout.header.menu.exploreAssets'),
          icon: 'pi pi-list',
          route: '/explore-assets'
        },
        {
          label: t('layout.header.menu.trading'),
          icon: 'pi pi-dollar',
          route: '/trade'
        },
        {
          label: t('layout.header.menu.manageLiquidity'),
          icon: 'pi pi-flag',
          command: async () => {
            if (route.name === 'home' || route.name === 'trade' || route.name === 'tradeWithAssets') {
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
          label: t('layout.header.menu.traderDashboard'),
          icon: 'pi pi-chart-line',
          route: '/trader'
        },
        {
          label: t('layout.header.menu.liquidityProviderDashboard'),
          icon: 'pi pi-chart-bar',
          route: '/liquidity-provider'
        },
        {
          label: t('layout.header.menu.about'),
          icon: 'pi pi-question',
          route: '/about'
        }
      ]
    },
    {
      label: t('layout.header.menu.environment', { environment: store.state.envName }),
      icon: 'pi pi-cog',
      items: [
        {
          label: t('layout.header.menu.algorand'),
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
          label: t('layout.header.menu.testnet'),
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
          label: t('layout.header.menu.localnet'),
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
          label: t('layout.header.menu.configuration'),
          icon: 'pi pi-cog',
          route: '/settings'
        }
      ]
    }
  ].forEach((i) => menuItems.push(i))

  menuItems.push({
    label: t('layout.header.menu.language'),
    icon: 'pi pi-globe',
    items: supportedLocales.map((code) => ({
      label: t(`common.languages.${code}` as const),
      icon: selectedLocale.value === code ? 'pi pi-check' : undefined,
      command: async () => {
        await changeLocale(code)
      }
    }))
  })
  items.value = menuItems
  console.log('menuItems', menuItems)
}
const makeCurrencies = (): MenuItem[] => {
  const ret: MenuItem[] = []
  const currencies = (AssetsService.getCurrencies() as unknown[]) ?? []

  for (const rawCurrency of currencies) {
    const currency = rawCurrency as Record<string, any>
    if (!currency) continue
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
const makeAssets = (): MenuItem[] => {
  const ret: MenuItem[] = []
  const assets = (AssetsService.getAssets() as unknown[]) ?? []

  for (const rawAsset of assets) {
    const asset = rawAsset as Record<string, any>
    if (!asset) continue
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

watch(
  () => [
    store.state.assetCode,
    store.state.assetName,
    store.state.currencyCode,
    store.state.currencyName,
    store.state.env,
    store.state.envName
  ],
  () => {
    makeMenu()
  },
  { immediate: true }
)

watch(locale, (newLocale) => {
  selectedLocale.value = (newLocale ?? getCurrentLocale()) as SupportedLocale
  makeMenu()
})
</script>

<template>
  <div class="card m-2 mb-0">
    <Menubar :model="items" class="mb-2 bg-white/50 text-black">
      <template #start>
        <RouterLink to="/">
          <div class="svg-image" v-html="Logo"></div>
        </RouterLink>
      </template>
      <template #end>
        <Button
          v-if="!authStore.isAuthenticated"
          :label="t('layout.header.actions.login')"
          icon="pi pi-user"
          size="small"
          @click="
            () => {
              router.push('/liquidity-provider')
              store.state.forceAuth = true
            }
          "
          class="ml-2"
        />
        <div v-else class="flex items-center gap-2">
          <span class="text-sm">{{ t('layout.header.menu.user', { address: authStore.account?.substring(0, 8) + '...' }) }}</span>
          <Button
            :label="t('layout.header.actions.logout')"
            icon="pi pi-sign-out"
            size="small"
            severity="secondary"
            @click="
              () => {
                logout()
                store.state.forceAuth = false
              }
            "
          />
        </div>
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
