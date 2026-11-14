<script setup lang="ts">
import Card from 'primevue/card'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import { useTheme } from '@/composables/useTheme'
import { buildChartUrl, resolveChartProvider } from '@/scripts/chart/chartUrl'
const props = withDefaults(
  defineProps<{
    interval?: number
    /** False while the page is still applying the route's pair (useRouteParams' routesReady):
     * no chart is loaded for the store's default pair in the meantime. */
    ready?: boolean

    class?: string
  }>(),
  { interval: undefined, ready: true, class: undefined }
)
const store = useAppStore()
const { isDark } = useTheme()
const { t, locale } = useI18n()

const provider = computed(() => resolveChartProvider(store.state.chartProvider, store.state.env))

const chartSrc = computed(() => {
  // store.state is shallow reactive and the pair's assets are swapped in place, so the
  // top-level codes and pair are the reactive dependencies (anti-freeze rule 8).
  const pair = store.state.pair
  const assetCode = store.state.assetCode
  const currencyCode = store.state.currencyCode
  if (!props.ready || !provider.value || !pair || !assetCode || !currencyCode) return null
  return buildChartUrl({
    provider: provider.value,
    env: store.state.env,
    assetId: pair.asset?.assetId,
    currencyId: pair.currency?.assetId,
    interval: props.interval,
    dark: isDark.value,
    locale: locale.value
  })
})
</script>
<template>
  <Card id="chart" :class="props.class" class="mr-2">
    <template #content>
      <!-- Keyed: a new src remounts the iframe instead of navigating it, so theme, language
           or pair changes do not pile up entries in the tab's Back history. -->
      <iframe
        :key="chartSrc ?? 'none'"
        v-show="chartSrc"
        class="w-full h-full flex-grow-1"
        data-cy="trade-chart"
        :data-chart-provider="chartSrc ? provider : 'none'"
        :src="chartSrc ?? 'about:blank'"
        :title="t('components.asaChart.title')"
        loading="lazy"
        allow="fullscreen"
      ></iframe>
      <div
        v-if="!chartSrc && props.ready"
        class="flex h-full items-center justify-center p-4 text-center text-sm opacity-75"
        data-cy="trade-chart-unavailable"
      >
        {{ t('components.asaChart.unavailable') }}
      </div>
    </template>
  </Card>
</template>

<style>
#chart .p-card-body,
#chart .p-card-content {
  height: 100%;
  margin: 0;
  padding: 0;
}
</style>
