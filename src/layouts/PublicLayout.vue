<script setup lang="ts">
import TopHeader from '@/components/TopHeader2.vue'
import PageFooter from '@/components/PageFooter.vue'
import Toast from 'primevue/toast'
import { useAppStore } from '@/stores/app'
import { AlgorandAuthentication } from 'algorand-authentication-component-vue'
import type { IAuthenticationStore, INotification } from 'algorand-authentication-component-vue'
import { onMounted, ref, watch } from 'vue'
import { useToast } from 'primevue/usetoast'

const store = useAppStore()
const toast = useToast()

function onStateChange(e: IAuthenticationStore) {
  store.state.authState.isAuthenticated = e.isAuthenticated
  store.state.authState.arc14Header = e.arc14Header
  store.state.authState.wallet = e.wallet
  store.state.authState.account = e.account
  store.state.authState.count = e.count
  store.state.authState.arc76email = e.arc76email
  store.state.authState.anyWallet = e.anyWallet
}
function onNotification(e: INotification) {
  try {
    if (e.severity == 'error') {
      console.error(e.message)
    } else {
      console.log('onNotification', e)
    }
    toast.add({
      severity: e.severity,
      detail: e.message,
      life: 5000
    })
  } catch (e: any) {
    console.error(e.message)
  }
}
const authComponent = ref<InstanceType<typeof AlgorandAuthentication>>()

onMounted(() => {
  store.state.authComponent = authComponent.value
})

watch(
  () => store.state.forceAuth,
  () => {
    console.log('store.state.forceAuth', store.state.forceAuth)
    if (store.state.forceAuth) {
      store.state.authState.inAuthentication = true
      store.state.authComponent.auth(undefined)
    }
  }
)
watch(
  () => store.state.authComponent,
  () => {
    if (!store.state.authComponent) {
      store.state.authComponent = authComponent.value
    }
  }
)
</script>
<template>
  <div class="flex flex-column min-h-full p-0 m-0">
    <Toast />
    <TopHeader :hideTopMenu="false" />
    <Suspense>
      <AlgorandAuthentication
        arc14Realm="BiatecDEX"
        @onStateChange="onStateChange"
        @onNotification="onNotification"
        ref="authComponent"
        :wallets="['pera', 'exodus', 'defly', 'myalgo', 'mnemonic']"
        useDemoMnemonics="novel consider desert ribbon cage first audit couple discover seed text guard crater exchange roof stable march tortoise hockey magic dawn jacket cricket ability bright"
        :algodHost="store.state.algodHost"
        :algodPort="store.state.algodPort"
        :algodToken="store.state.algodToken"
        :store="store.state.authState"
      >
        <div class="flex-grow-1 flex flex-column m-2">
          <slot />
        </div>
      </AlgorandAuthentication>
    </Suspense>
    <PageFooter />
  </div>
</template>
