<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import Menubar from 'primevue/menubar'
import Badge from 'primevue/badge'
import Logo from '@/assets/projects/dex.svg?raw'
const store = useAppStore()
watch(
  store.state,
  () => {
    makeMenu()
  },
  { deep: true }
)
const makeMenu = () => {
  items.value = [
    {
      label: 'Trading screen',
      icon: 'pi pi-home',
      route: '/'
    },
    {
      label: 'Asset: ' + store.state.assetName,
      items: [
        {
          label: 'USD',
          command: async () => {
            store.state.asset = 31566704
            store.state.assetName = 'USD'
          }
        },
        {
          label: 'EUR',
          command: async () => {
            store.state.asset = 227855942
            store.state.assetName = 'EUR'
          }
        },
        {
          label: 'Gold',
          command: async () => {
            store.state.asset = 1241944285
            store.state.assetName = 'Gold'
          }
        },
        {
          label: 'GoldDAO',
          command: async () => {
            store.state.asset = 1241945177
            store.state.assetName = 'GoldDAO'
          }
        },
        {
          label: 'VoteCoin',
          command: async () => {
            store.state.asset = 452399768
            store.state.assetName = 'VoteCoin'
          }
        },
        {
          label: 'gAlgo',
          command: async () => {
            store.state.asset = 793124631
            store.state.assetName = 'gAlgo'
          }
        },
        {
          label: 'Voitest',
          command: async () => {
            store.state.asset = 1392374998
            store.state.assetName = 'Voitest'
          }
        }
      ]
    },
    {
      label: 'Currency: ' + store.state.currencyName,
      items: [
        {
          label: 'EUR',
          command: async () => {
            store.state.currency = 'EUR'
            store.state.currencyName = 'EUR'
            store.state.currencyAsset = 227855942
          }
        },
        {
          label: 'USD',
          command: async () => {
            store.state.currency = 'USD'
            store.state.currencyName = 'USD'
            store.state.currencyAsset = 31566704
          }
        },
        {
          label: 'Bitcoin',
          command: async () => {
            store.state.currency = 'BTC'
            store.state.currencyName = 'Bitcoin'
            store.state.currencyAsset = 386192725
          }
        },
        {
          label: 'Algorand',
          command: async () => {
            store.state.currency = 'ALGO'
            store.state.currencyName = 'Algorand'
            store.state.currencyAsset = 0
          }
        }
      ]
    },
    {
      label: 'Theme',
      icon: 'pi pi-palette',
      items: makeThemes()
    }
  ]
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
  <div class="card m-2">
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
