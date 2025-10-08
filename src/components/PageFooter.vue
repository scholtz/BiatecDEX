<script setup lang="ts">
import { useAppStore } from '@/stores/app'
import { useAVMAuthentication } from 'algorand-authentication-component-vue'
import Card from 'primevue/card'
import { useI18n, I18nT } from 'vue-i18n'

const store = useAppStore()
const { authStore } = useAVMAuthentication()
const { t } = useI18n()
</script>
<template>
  <Card class="m-2 text-center bg-white/20 text-gray-900">
    <template #content>
      <div class="p-2">
        <div>
          <I18nT keypath="layout.footer.grantSupport">
            <template #xgov>
              <a
                href="https://github.com/algorandfoundation/xGov/blob/main/Proposals/xgov-80.md"
                target="_blank"
                >xGov#80</a
              >
            </template>
          </I18nT>
          <span class="ml-1">{{ store.state.assetCode }} {{ store.state.currencyCode }}</span>
        </div>
        <div>
          <I18nT keypath="layout.footer.community">
            <template #biatec>
              <a href="https://www.biatec.io" target="_blank">www.biatec.io</a>
            </template>
            <template #discord>
              <a href="https://discord.gg/gvGvmZ7c8s" target="_blank">Biatec Discord</a>
            </template>
          </I18nT>
        </div>
        <div v-if="authStore.isAuthenticated">
          {{ t('layout.footer.authenticatedAs', { account: authStore.account.toString() }) }}
        </div>
      </div>
    </template>
  </Card>
</template>
