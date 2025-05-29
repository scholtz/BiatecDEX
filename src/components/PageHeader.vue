<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import Menubar from 'primevue/menubar'
import Badge from 'primevue/badge'
import Logo from '@/assets/projects/dex.svg?raw'
import { AssetsService } from '@/service/AssetsService'
import type { MenuItem } from 'primevue/menuitem'
import { useRouter } from 'vue-router'
const router = useRouter()
const store = useAppStore()
watch(
  store.state,
  () => {
    makeMenu()
  },
  { deep: true }
)
watch(
  () => store.state.authState.isAuthenticated,
  () => {
    makeMenu()
  }
)
const makeMenu = () => {
  const menuItems: MenuItem[] = []
  let auth: {}
  if (store.state.authState.isAuthenticated) {
    auth = {
      label: 'Logout',
      icon: 'pi pi-lock',
      command: async () => {
        store.state.authState.inAuthentication = false
        store.state.authState.isAuthenticated = false
        store.state.authState.arc76email = ''
        store.state.authState.arc14Header = ''
        store.state.authState.account = ''
        store.state.forceAuth = false
        console.log('logout sent')
        await store.state.authComponent?.logout()
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
          route: '/liquidity'
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
            router.push(`/${store.state.env}/${store.state.assetCode}/${store.state.currencyCode}`)
          }
        },
        {
          label: 'VOI',
          icon: 'pi pi-cog',
          command: async () => {
            store.setChain('voimain-v1.0')
            router.push(`/${store.state.env}/${store.state.assetCode}/${store.state.currencyCode}`)
          }
        },
        {
          label: 'Localnet',
          icon: 'pi pi-cog',
          command: async () => {
            store.setChain('dockernet-v1')
            router.push(`/${store.state.env}/${store.state.assetCode}/${store.state.currencyCode}`)
          }
        },
        {
          label: 'Configuration',
          icon: 'pi pi-cog',
          route: '/settings'
        },
        {
          label: 'Theme',
          icon: 'pi pi-palette',
          items: makeThemes()
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
        route: `/${store.state.env}/${store.state.currencyCode}/${currency.code}`
      })
    } else {
      ret.push({
        label: currency.name,
        route: `/${store.state.env}/${store.state.assetCode}/${currency.code}`
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
      route: `/${store.state.env}/${asset.code}/${store.state.currencyCode}`
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
    <Menubar :model="items" class="my-2">
      <template #start>
        <RouterLink to="/">
          <div class="svg-image" v-html="Logo"></div>
        </RouterLink>
      </template>
      <template #item="{ item, props, hasSubmenu, root }">
        <RouterLink
          v-if="item.route"
          :to="item.route"
          class="flex align-items-center p-menuitem-link"
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
            class="ml-auto border-1 surface-border border-round surface-100 text-xs p-1"
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
          class="flex align-items-center"
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
            class="ml-auto border-1 surface-border border-round surface-100 text-xs p-1"
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
        <a v-else v-ripple class="flex align-items-center" v-bind="props.action">
          <span :class="item.icon" />
          <span class="ml-2">{{ item.label }}</span>
          <Badge
            v-if="item.badge"
            :class="{ 'ml-auto': !root, 'ml-2': root }"
            :value="item.badge"
          />
          <span
            v-if="item.shortcut"
            class="ml-auto border-1 surface-border border-round surface-100 text-xs p-1"
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
