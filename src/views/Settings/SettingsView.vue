<script setup lang="ts">
import Layout from '@/layouts/PublicLayout.vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Fieldset from 'primevue/fieldset'
import Divider from 'primevue/divider'
import Badge from 'primevue/badge'
import { useAppStore, resetConfiguration } from '@/stores/app'
import { useI18n } from 'vue-i18n'
import { computed, ref } from 'vue'

const store = useAppStore()
const { t } = useI18n()

const currentNetwork = computed(() => {
  if (store.state.algodHost?.includes('mainnet')) return 'mainnet'
  if (store.state.algodHost?.includes('localhost')) return 'localnet'
  return 'custom'
})

const setMainnet = () => {
  store.state.algodHost = 'https://mainnet-api.algonode.cloud'
  store.state.algodPort = 443
  store.state.algodToken = ''
}

const setLocalnet = () => {
  store.state.algodHost = 'http://localhost'
  store.state.algodPort = 4001
  store.state.algodToken = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
}

const isMainnetActive = computed(
  () =>
    store.state.algodHost === 'https://mainnet-api.algonode.cloud' &&
    store.state.algodPort === 443 &&
    store.state.algodToken === ''
)

const isLocalnetActive = computed(
  () =>
    store.state.algodHost === 'http://localhost' &&
    store.state.algodPort === 4001 &&
    store.state.algodToken === 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
)
</script>

<template>
  <Layout>
    <div class="px-6 py-8 max-w-5xl mx-auto space-y-8">
      <!-- Page Header -->
      <div class="mb-6">
        <div
          class="settings-header bg-white/90 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl px-6 py-5 shadow"
        >
          <h1 class="text-3xl font-bold tracking-tight flex items-center gap-3 header-title">
            <i class="pi pi-cog text-blue-600"></i>
            <span>{{ t('views.settings.title') }}</span>
          </h1>
          <p class="mt-2 text-base leading-relaxed header-subtitle">
            Configure your Biatec DEX preferences and blockchain connection settings.
          </p>
        </div>
      </div>

      <!-- Blockchain Configuration -->
      <Card class="shadow-sm settings-card">
        <template #title>
          <div class="flex items-center gap-3">
            <i class="pi pi-server text-green-600"></i>
            <span>{{ t('views.settings.blockchain.title') }}</span>
            <Badge
              :value="currentNetwork.toUpperCase()"
              :severity="
                currentNetwork === 'mainnet'
                  ? 'success'
                  : currentNetwork === 'localnet'
                    ? 'info'
                    : 'warning'
              "
              class="ml-auto"
            />
          </div>
        </template>
        <template #content>
          <div class="space-y-6">
            <!-- Network Presets -->
            <div>
              <h3 class="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                Quick Network Setup
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Choose a predefined network configuration or set up a custom connection below.
              </p>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  :outlined="!isMainnetActive"
                  :severity="isMainnetActive ? 'success' : 'secondary'"
                  @click="setMainnet"
                  class="p-4 h-auto"
                >
                  <div class="flex flex-col items-center gap-2">
                    <i class="pi pi-globe text-2xl"></i>
                    <div class="text-center">
                      <div class="font-semibold">{{ t('views.settings.blockchain.mainnet') }}</div>
                      <div class="text-xs opacity-75">Production Network</div>
                    </div>
                  </div>
                </Button>
                <Button
                  :outlined="!isLocalnetActive"
                  :severity="isLocalnetActive ? 'info' : 'secondary'"
                  @click="setLocalnet"
                  class="p-4 h-auto"
                >
                  <div class="flex flex-col items-center gap-2">
                    <i class="pi pi-desktop text-2xl"></i>
                    <div class="text-center">
                      <div class="font-semibold">{{ t('views.settings.blockchain.localnet') }}</div>
                      <div class="text-xs opacity-75">Development Network</div>
                    </div>
                  </div>
                </Button>
              </div>
            </div>

            <Divider />

            <!-- Custom Configuration -->
            <Fieldset
              legend="Advanced Configuration"
              :toggleable="true"
              :collapsed="currentNetwork !== 'custom'"
            >
              <div class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <label for="algodHost" class="font-medium text-gray-700 dark:text-gray-300">
                    {{ t('views.settings.blockchain.endpoint') }}
                  </label>
                  <div class="md:col-span-2">
                    <InputText
                      v-model="store.state.algodHost"
                      id="algodHost"
                      type="url"
                      placeholder="https://mainnet-api.algonode.cloud"
                      class="w-full"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <label for="algodPort" class="font-medium text-gray-700 dark:text-gray-300">
                    {{ t('views.settings.blockchain.endpointPort') }}
                  </label>
                  <div class="md:col-span-2">
                    <InputNumber
                      v-model="store.state.algodPort"
                      id="algodPort"
                      :min="1"
                      :max="65535"
                      placeholder="443"
                      class="w-full"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <label for="algodToken" class="font-medium text-gray-700 dark:text-gray-300">
                    {{ t('views.settings.blockchain.endpointToken') }}
                  </label>
                  <div class="md:col-span-2">
                    <InputText
                      v-model="store.state.algodToken"
                      id="algodToken"
                      type="password"
                      placeholder="Leave empty for public endpoints"
                      class="w-full"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  <label for="lastRoundOffset" class="font-medium text-gray-700 dark:text-gray-300">
                    {{ t('views.settings.blockchain.lastRoundOffset') }}
                  </label>
                  <div class="md:col-span-2 space-y-1">
                    <InputNumber
                      v-model="store.state.lastRoundOffset"
                      id="lastRoundOffset"
                      :min="1"
                      :max="2000"
                      :step="1"
                      suffix=" rounds"
                      class="w-full"
                    />
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      {{ t('views.settings.blockchain.lastRoundOffsetHint') }}
                    </p>
                  </div>
                </div>
              </div>
            </Fieldset>
          </div>
        </template>
      </Card>

      <!-- Trading Configuration -->
      <Card class="shadow-sm settings-card">
        <template #title>
          <div class="flex items-center gap-3">
            <i class="pi pi-chart-line text-blue-600"></i>
            <span>{{ t('views.settings.swap.title') }}</span>
          </div>
        </template>
        <template #content>
          <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div>
                <label
                  for="slippage"
                  class="font-medium text-gray-700 dark:text-gray-300 block mb-1"
                >
                  {{ t('views.settings.swap.slippage') }}
                </label>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  Maximum price slippage tolerance for trades (basis points)
                </p>
              </div>
              <div class="md:col-span-2">
                <InputNumber
                  v-model="store.state.slippage"
                  inputId="slippage"
                  show-buttons
                  :min="0"
                  :max="1000"
                  :step="1"
                  suffix=" BPS"
                  class="w-full"
                />
                <p class="text-xs text-gray-500 mt-1">Recommended: 10-50 BPS (0.1%-0.5%)</p>
              </div>
            </div>
          </div>
        </template>
      </Card>

      <!-- System Configuration -->
      <Card class="shadow-sm settings-card border-red-200 dark:border-red-800">
        <template #title>
          <div class="flex items-center gap-3">
            <i class="pi pi-exclamation-triangle text-red-600"></i>
            <span class="text-red-700 dark:text-red-300">{{
              t('views.settings.default.dangerZone')
            }}</span>
          </div>
        </template>
        <template #content>
          <div class="space-y-4">
            <div
              class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
            >
              <div class="flex items-start gap-3">
                <i class="pi pi-exclamation-triangle text-red-600 mt-1"></i>
                <div>
                  <h4 class="font-semibold text-red-800 dark:text-red-200 mb-2">
                    Reset Configuration
                  </h4>
                  <p class="text-sm text-red-700 dark:text-red-300 mb-3">
                    This action will reset all your settings to default values. Your wallet
                    connection and authentication will remain intact, but all custom configurations
                    will be lost.
                  </p>
                  <Button @click="resetConfiguration" severity="danger" outlined class="px-4 py-2">
                    <i class="pi pi-refresh mr-2"></i>
                    {{ t('views.settings.default.resetConfiguration') }}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </Card>
    </div>
  </Layout>
</template>

<style scoped>
/* Global spacing adjustments for settings page */
:deep(.settings-card) {
  padding: 0.75rem 1.25rem 1.5rem 1.25rem;
  border-radius: 0.75rem;
}

:deep(.settings-card .p-card-content) {
  padding-top: 0.5rem;
}

:deep(.p-card-title) {
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.4;
}

:deep(.p-fieldset) {
  border-radius: 0.5rem;
  padding: 0.5rem 1rem 1rem 1rem;
}

:deep(.p-fieldset-legend) {
  font-weight: 600;
  color: #374151;
  padding: 0.35rem 0.75rem;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 0.5rem;
}

:deep(.dark .p-fieldset-legend) {
  color: #d1d5db;
  background: rgba(31, 41, 55, 0.6);
}

/* Improve label readability */
label {
  line-height: 1.4;
}

/* Header readability enhancements */
.settings-header .header-title {
  color: #0f172a; /* slate-900 */
}
.dark .settings-header .header-title {
  color: #f8fafc; /* slate-50 */
}
.settings-header .header-subtitle {
  color: #334155; /* slate-700 */
  max-width: 56ch;
}
.dark .settings-header .header-subtitle {
  color: #cbd5e1; /* slate-300 */
}
.settings-header {
  transition:
    background 0.25s ease,
    border-color 0.25s ease;
}

/* Danger zone improvements */
.danger-zone-text {
  line-height: 1.5;
}

/* Responsive tweaks */
@media (max-width: 640px) {
  :deep(.settings-card) {
    padding: 0.75rem 0.9rem 1.1rem 0.9rem;
  }
}
</style>
