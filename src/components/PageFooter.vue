<script setup lang="ts">
import { useAppStore } from '@/stores/app'
import { useAVMAuthentication } from 'algorand-authentication-component-vue'
import Card from 'primevue/card'
import { useI18n } from 'vue-i18n'

const store = useAppStore()
const { authStore } = useAVMAuthentication()
const { t } = useI18n()
</script>
<template>
  <Card class="m-2 text-center bg-white/20 text-gray-900">
    <template #content>
      <div class="p-2 overflow-x-auto">
        <div class="flex flex-col gap-2 min-w-max items-center text-center">
          <div>
            <i18n-t keypath="layout.footer.grantSupport" tag="span">
              <template #xgov>
                <a
                  href="https://github.com/algorandfoundation/xGov/blob/main/Proposals/xgov-80.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="underline hover:text-primary"
                  >xGov#80</a
                >
              </template>
            </i18n-t>
            <span class="ml-1">{{ store.state.assetCode }} {{ store.state.currencyCode }}</span>
          </div>
          <div>
            <i18n-t keypath="layout.footer.community" tag="span">
              <template #biatec>
                <a
                  href="https://www.biatec.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="underline hover:text-primary"
                  >www.biatec.io</a
                >
              </template>
              <template #discord>
                <a
                  href="https://discord.gg/gvGvmZ7c8s"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="underline hover:text-primary"
                  >Biatec Discord</a
                >
              </template>
            </i18n-t>
          </div>
          <div v-if="authStore.isAuthenticated">
            {{ t('layout.footer.authenticatedAs', { account: authStore.account.toString() }) }}
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>
