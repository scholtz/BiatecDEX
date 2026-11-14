<script setup lang="ts">
import Card from 'primevue/card'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import { useTheme } from '@/composables/useTheme'
import { buildChartUrl, resolveChartProvider } from '@/scripts/chart/chartUrl'
const props = defineProps<{
  interval?: number

  class?: string
}>()
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
  if (!provider.value || !pair || !assetCode || !currencyCode) return null
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
      <iframe
        v-show="chartSrc"
        class="w-full h-full flex-grow-1"
        data-cy="trade-chart"
        :data-chart-provider="provider ?? 'none'"
        :src="chartSrc ?? 'about:blank'"
        :title="t('components.asaChart.title')"
        loading="lazy"
        allow="fullscreen"
      ></iframe>
      <div
        v-if="!chartSrc"
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
