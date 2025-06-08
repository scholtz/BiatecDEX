<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue'
import PageFooter from '@/components/PageFooter.vue'
import Toast from 'primevue/toast'
import { useAppStore } from '@/stores/app'
import { AlgorandAuthentication, type INotification } from 'algorand-authentication-component-vue'

import { useToast } from 'primevue/usetoast'

const store = useAppStore()
const toast = useToast()
const props = withDefaults(
  defineProps<{
    authRequired?: boolean
  }>(),
  {
    authRequired: false
  }
)

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
</script>
<template>
  <div class="flex flex-col min-h-screen">
    <Toast />
    <AlgorandAuthentication
      :authorizedOnlyAccess="store.state.forceAuth || props.authRequired"
      arc14Realm="BiatecDEX"
      @onNotification="onNotification"
    >
      <PageHeader />
      <div class="flex-1 flex flex-row mx-2 my-0 h-full">
        <slot />
      </div>
      <PageFooter />
    </AlgorandAuthentication>
  </div>
</template>
