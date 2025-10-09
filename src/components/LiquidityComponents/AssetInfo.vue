<script setup lang="ts">
import { getDummySigner } from '../../scripts/algo/getDummySigner'
import { useAppStore } from '../../stores/app'
import { type AppPoolInfo } from 'biatec-concentrated-liquidity-amm'
import formatNumber from '../../scripts/asset/formatNumber'
import { computed, onMounted, reactive, watch } from 'vue'
import { useRoute } from 'vue-router'
import { computeWeightedPeriods } from './weightedPeriods'
import { useI18n } from 'vue-i18n'
const props = defineProps<{
  class?: string
}>()

const store = useAppStore()
const route = useRoute()
const { t } = useI18n()
var state = reactive({
  mounted: false,
  loading: false,
  price: null as AppPoolInfo | null
})
const weightedPeriods = computed(() => {
  if (!state.price) return null

  return computeWeightedPeriods(state.price)
})

onMounted(async () => {
  await load()
  state.mounted = true
})
watch(
  () => store.state.clientPP,
  async () => {
    if (!state.mounted) return
    await load()
  }
)

watch(
  () => route?.params?.assetCode,
  async () => {
    console.log('AssetInfo: assetId changed', route.params.assetCode)
    if (!state.mounted) return
    await load()
  }
)
watch(
  () => route?.params?.currencyCode,
  async () => {
    console.log('AssetInfo: currency.assetId changed', route.params.currencyCode)
    if (!state.mounted) return
    await load()
  }
)

const load = async () => {
  if (!store.state.clientPP) {
    console.log('AssetInfo: clientPP not initialized')

    return
  }
  state.price = null
  state.loading = true
  try {
    console.log('AssetInfo: loading..')
    var signer = getDummySigner()
    var price = await store.state.clientPP.getPrice({
      args: {
        appPoolId: 0,
        assetA: store.state.pair.asset.assetId,
        assetB: store.state.pair.currency.assetId
      },
      sender: signer.address,
      signer: signer.transactionSigner
    })
    if (price) {
      state.price = price
    }
  } catch (e) {
    console.error('AssetInfo: Error loading price', e)
  } finally {
    state.loading = false
  }
}
</script>
<template>
  <Card :class="props.class">
    <template #content>
      <div class="overflow-x-auto">
        <div
          v-if="state.loading || !state.price?.latestPrice"
          class="flex flex-row flex-grow gap-2 w-full min-w-max"
        >
          <h2 class="w-full flex items-center">
            {{
              t('components.assetInfo.title', {
                asset: store.state.pair.asset.name,
                currency: store.state.pair.currency.name
              })
            }}
          </h2>
          <div class="w-full flex items-center" v-if="state.loading">
            {{ t('components.assetInfo.loading') }}
          </div>
          <div class="w-full flex items-center" v-else>{{ t('components.assetInfo.noData') }}</div>
        </div>
        <div v-else class="flex flex-row flex-grow gap-2 w-full min-w-max">
          <h2 class="w-full flex items-center">
            {{
              t('components.assetInfo.title', {
                asset: store.state.pair.asset.name,
                currency: store.state.pair.currency.name
              })
            }}
          </h2>
          <div class="w-full flex items-center" v-if="!state.loading">
            {{ t('components.assetInfo.latestPrice') }}
            {{ formatNumber(Number(state.price.latestPrice) / 1e9) }}
            {{ state.price.latestPrice > state.price.period1NowVwap ? '↑' : '↓' }}
          </div>
          <div
            class="w-full flex items-center"
            v-if="!state.loading && (weightedPeriods?.period1?.volume ?? 0) > 0"
          >
            <span
              :title="`Last tick time: ${new Date(Number(state.price.period1NowTime) * 1000).toLocaleString()} Previous tick time: ${new Date(Number(state.price.period1PrevTime) * 1000).toLocaleString()}`"
            >
              {{ t('components.assetInfo.minutePrice') }} </span
            >: {{ formatNumber((weightedPeriods?.period1?.price ?? 0) / 1e9) }}
            <span v-if="state.price.period1PrevVwap > 0">
              {{
                (weightedPeriods?.period1?.price ?? 0) >
                (weightedPeriods?.period1?.previousPrice ?? 0)
                  ? '↑'
                  : '↓'
              }}
            </span>
            {{ t('components.assetInfo.volume') }}
            {{
              formatNumber(
                (weightedPeriods?.period1?.volume ?? 0) / 1e9,
                undefined,
                undefined,
                undefined,
                undefined,
                store.state.pair.currency.symbol
              )
            }}
            <span v-if="state.price.period1PrevVwap > 0">
              {{
                (weightedPeriods?.period1?.volume ?? 0) >
                (weightedPeriods?.period1?.previousVolume ?? 0)
                  ? '↑'
                  : '↓'
              }}
            </span>
          </div>
          <div
            class="w-full flex items-center"
            v-if="!state.loading && (weightedPeriods?.period2?.volume ?? 0) > 0"
          >
            <span
              :title="`Last tick time: ${new Date(Number(state.price.period2NowTime) * 1000).toLocaleString()} Previous tick time: ${new Date(Number(state.price.period2PrevTime) * 1000).toLocaleString()}`"
              >{{ t('components.assetInfo.dayPrice') }}</span
            >: {{ formatNumber((weightedPeriods?.period2?.price ?? 0) / 1e9) }}
            <span v-if="state.price.period2PrevVwap > 0">
              {{
                (weightedPeriods?.period2?.price ?? 0) >
                (weightedPeriods?.period2?.previousPrice ?? 0)
                  ? '↑'
                  : '↓'
              }}
            </span>
            {{ t('components.assetInfo.volume') }}
            {{
              formatNumber(
                (weightedPeriods?.period2?.volume ?? 0) / 1e9,
                undefined,
                undefined,
                undefined,
                undefined,
                store.state.pair.currency.symbol
              )
            }}
            <span v-if="state.price.period2PrevVwap > 0">
              {{
                (weightedPeriods?.period2?.volume ?? 0) >
                (weightedPeriods?.period2?.previousVolume ?? 0)
                  ? '↑'
                  : '↓'
              }}
            </span>
          </div>
          <div
            class="w-full flex items-center"
            v-if="!state.loading && (weightedPeriods?.period3?.volume ?? 0) > 0"
          >
            <span
              :title="`Last tick time: ${new Date(Number(state.price.period3NowTime) * 1000).toLocaleString()} Previous tick time: ${new Date(Number(state.price.period3PrevTime) * 1000).toLocaleString()}`"
              >{{ t('components.assetInfo.monthPrice') }}</span
            >: {{ formatNumber((weightedPeriods?.period3?.price ?? 0) / 1e9) }}
            <span v-if="state.price.period3PrevVwap > 0">
              {{
                (weightedPeriods?.period3?.price ?? 0) >
                (weightedPeriods?.period3?.previousPrice ?? 0)
                  ? '↑'
                  : '↓'
              }}
            </span>
            {{ t('components.assetInfo.volume') }}
            {{
              formatNumber(
                (weightedPeriods?.period3?.volume ?? 0) / 1e9,
                undefined,
                undefined,
                undefined,
                undefined,
                store.state.pair.currency.symbol
              )
            }}
            <span v-if="state.price.period3PrevVwap > 0">
              {{
                (weightedPeriods?.period3?.volume ?? 0) >
                (weightedPeriods?.period3?.previousVolume ?? 0)
                  ? '↑'
                  : '↓'
              }}
            </span>
          </div>
          <div
            class="w-full flex items-center"
            v-if="!state.loading && (weightedPeriods?.period4?.volume ?? 0) > 0"
          >
            <span
              :title="`Last tick time: ${new Date(Number(state.price.period4NowTime) * 1000).toLocaleString()} Previous tick time: ${new Date(Number(state.price.period4PrevTime) * 1000).toLocaleString()}`"
              >{{ t('components.assetInfo.yearPrice') }}</span
            >: {{ formatNumber((weightedPeriods?.period4?.price ?? 0) / 1e9) }}
            <span v-if="state.price.period4PrevVwap > 0">
              {{
                (weightedPeriods?.period4?.price ?? 0) >
                (weightedPeriods?.period4?.previousPrice ?? 0)
                  ? '↑'
                  : '↓'
              }}
            </span>
            {{ t('components.assetInfo.volume') }}
            {{
              formatNumber(
                (weightedPeriods?.period4?.volume ?? 0) / 1e9,
                undefined,
                undefined,
                undefined,
                undefined,
                store.state.pair.currency.symbol
              )
            }}
            <span v-if="state.price.period4PrevVwap > 0">
              {{
                (weightedPeriods?.period4?.volume ?? 0) >
                (weightedPeriods?.period4?.previousVolume ?? 0)
                  ? '↑'
                  : '↓'
              }}
            </span>
          </div>
          <Button :disabled="state.loading" class="w-80" size="small" @click="load" variant="link">
            {{ t('components.assetInfo.refresh') }}
          </Button>
        </div>
      </div>
      <!-- <pre>{{
        JSON.stringify(
          state.price,
          (key, value) => (typeof value === 'bigint' ? value.toString() : value),
          2
        )
      }}</pre> -->
    </template>
  </Card>
</template>
