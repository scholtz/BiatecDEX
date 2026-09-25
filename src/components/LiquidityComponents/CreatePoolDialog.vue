<script setup lang="ts">
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import AutoComplete, { type AutoCompleteCompleteEvent } from 'primevue/autocomplete'
import Message from 'primevue/message'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { BiatecAsset } from '@/api/models'
import { useAppStore } from '@/stores/app'
import { useNetwork } from '@txnlab/use-wallet-vue'
import getAlgodClient from '@/scripts/algo/getAlgodClient'
import { fetchTradeAssets, isTradeApiConfigured, getAssetImageUrl } from '@/service/tradeApi'
import { usePoolPairs } from '@/composables/usePoolPairs'

const { t } = useI18n()
const store = useAppStore()
const { activeNetworkConfig } = useNetwork()
// See CLAUDE.md "Pair-driven asset selection" — used only to tell the user,
// before they continue, whether this pair already has a pool (in which case
// "Continue" takes them to that pool's Add Liquidity screen instead of
// creating a duplicate).
const poolPairs = usePoolPairs()

// The trade API (name/symbol search) is only available on networks where it is
// configured. Elsewhere we resolve an exact ASA id directly from that network's
// algod node.
const tradeApiConfigured = computed(() => isTradeApiConfigured(store.state.env))

const props = defineProps<{
  modelValue: boolean
  /**
   * Pre-fill the base asset when the dialog opens (e.g. the Explore Assets
   * row's "add liquidity" action pre-selecting the asset it was clicked on
   * when that asset has no existing pool yet). Ignored once the user has
   * changed the base asset themselves within the same open dialog session.
   */
  initialBaseAssetId?: number
  initialBaseName?: string
  initialBaseUnitName?: string
  initialBaseDecimals?: number
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'create', value: { base: BiatecAsset; quote: BiatecAsset }): void
}>()

type Selectable = BiatecAsset & { _label?: string }

const base = ref<Selectable | null>(null)
const quote = ref<Selectable | null>(null)
const baseSuggestions = ref<Selectable[]>([])
const quoteSuggestions = ref<Selectable[]>([])

const ALGO_ASSET: Selectable = {
  index: 0,
  params: { name: 'Algorand', unitName: 'ALGO', decimals: 6 } as BiatecAsset['params'],
  _label: 'Algorand (ALGO) · #0'
}

const labelFor = (a: BiatecAsset): string => {
  const name = a.params?.name || `Asset #${a.index}`
  const unit = a.params?.unitName ? ` (${a.params.unitName})` : ''
  return `${name}${unit} · #${a.index}`
}

const decorate = (a: BiatecAsset): Selectable => ({ ...a, _label: labelFor(a) })

const imageUrl = (id: number): string | undefined => getAssetImageUrl(store.state.env, id)

const onImgError = (e: Event) => {
  ;(e.target as HTMLImageElement).style.visibility = 'hidden'
}

// Resolve a single ASA by exact id from the active network's algod node.
const lookupAssetById = async (id: number): Promise<Selectable | null> => {
  try {
    const algod = getAlgodClient(activeNetworkConfig.value)
    const info = (await algod.getAssetByID(id).do()) as {
      index?: number | bigint
      params?: { name?: string; unitName?: string; decimals?: number | bigint }
    }
    const params = info?.params
    return decorate({
      index: Number(info?.index ?? id),
      params: {
        name: params?.name,
        unitName: params?.unitName,
        decimals: params?.decimals !== undefined ? Number(params.decimals) : undefined
      } as BiatecAsset['params']
    })
  } catch (e) {
    console.warn('Asset id lookup failed', e)
    return null
  }
}

const searchAssets = async (query: string): Promise<Selectable[]> => {
  const q = (query || '').trim()
  const results: Selectable[] = []
  // Always surface ALGO when relevant — it is not returned by the asset index.
  if (!q || 'algorand'.includes(q.toLowerCase()) || 'algo'.includes(q.toLowerCase()) || q === '0') {
    results.push(ALGO_ASSET)
  }

  const isId = /^\d+$/.test(q)

  // No trade API for this network: accept an exact ASA id resolved via algod.
  if (!tradeApiConfigured.value) {
    if (isId && q !== '0') {
      const asset = await lookupAssetById(Number(q))
      if (asset) results.push(asset)
    }
    return results
  }

  try {
    const data = isId
      ? await fetchTradeAssets(store.state.env, { ids: q, size: 25 })
      : await fetchTradeAssets(store.state.env, { search: q, size: 25 })
    for (const a of data) {
      if (a.index === 0) continue // already covered by ALGO entry
      results.push(decorate(a))
    }
  } catch (e) {
    console.error('Asset search failed', e)
  }
  return results
}

const searchPlaceholder = computed(() =>
  tradeApiConfigured.value
    ? t('components.createPool.searchPlaceholder')
    : t('components.createPool.idOnlyPlaceholder')
)

const onSearchBase = async (event: AutoCompleteCompleteEvent) => {
  baseSuggestions.value = await searchAssets(event.query)
}
const onSearchQuote = async (event: AutoCompleteCompleteEvent) => {
  quoteSuggestions.value = await searchAssets(event.query)
}

const sameAsset = computed(
  () =>
    !!base.value &&
    !!quote.value &&
    typeof base.value !== 'string' &&
    typeof quote.value !== 'string' &&
    base.value.index === quote.value.index
)

const canContinue = computed(
  () =>
    !!base.value &&
    !!quote.value &&
    typeof base.value !== 'string' &&
    typeof quote.value !== 'string' &&
    !sameAsset.value
)

// Whether a pool already exists for the selected pair — only meaningful once
// the pair graph has loaded (poolPairs.loaded); while loading we don't yet
// know, so no message is shown rather than a possibly-wrong "no pool" claim.
const pairAlreadyExists = computed(
  () =>
    poolPairs.loaded.value &&
    !!base.value &&
    !!quote.value &&
    typeof base.value !== 'string' &&
    typeof quote.value !== 'string' &&
    !sameAsset.value &&
    poolPairs.hasPair(base.value.index, quote.value.index)
)

const swap = () => {
  const tmp = base.value
  base.value = quote.value
  quote.value = tmp
}

watch(
  () => props.modelValue,
  (visible) => {
    if (!visible) return
    // Reset on every open so a stale selection from a previous open (e.g. via
    // a different row's "add liquidity" action) never leaks in.
    quote.value = null
    if (props.initialBaseAssetId === undefined) {
      base.value = null
      return
    }
    base.value = decorate({
      index: props.initialBaseAssetId,
      params: {
        name: props.initialBaseName,
        unitName: props.initialBaseUnitName,
        decimals: props.initialBaseDecimals
      } as BiatecAsset['params']
    })
  }
)

const close = () => emit('update:modelValue', false)

const onContinue = () => {
  if (!canContinue.value || !base.value || !quote.value) return
  emit('create', { base: base.value as BiatecAsset, quote: quote.value as BiatecAsset })
}
</script>

<template>
  <Dialog
    :visible="props.modelValue"
    modal
    :draggable="false"
    class="create-pool"
    :style="{ width: '40rem', maxWidth: '95vw' }"
    @update:visible="(v) => emit('update:modelValue', v)"
  >
    <template #header>
      <div class="flex flex-col">
        <span class="text-lg font-semibold text-strong">{{
          t('components.createPool.title')
        }}</span>
        <span class="text-sm text-muted">{{ t('components.createPool.subtitle') }}</span>
      </div>
    </template>

    <div class="flex flex-col gap-4">
      <Message v-if="!tradeApiConfigured" severity="info" class="!mt-0">{{
        t('components.createPool.idOnlyHint')
      }}</Message>
      <!-- Base asset -->
      <div class="flex flex-col gap-1.5">
        <label class="eyebrow">{{ t('components.createPool.baseAsset') }}</label>
        <AutoComplete
          v-model="base"
          :suggestions="baseSuggestions"
          optionLabel="_label"
          dropdown
          forceSelection
          :delay="300"
          :placeholder="searchPlaceholder"
          class="w-full create-pool-ac"
          data-cy="create-pool-base"
          inputClass="cp-base-input"
          @complete="onSearchBase"
        >
          <template #option="{ option }">
            <div class="flex items-center gap-3 py-1">
              <img
                v-if="imageUrl(option.index)"
                :src="imageUrl(option.index)"
                alt=""
                class="w-7 h-7 rounded-md object-cover border divider-border"
                @error="onImgError"
              />
              <span
                v-else
                class="w-7 h-7 rounded-md flex items-center justify-center text-xs surface-inset shrink-0"
                >{{ (option.params?.unitName || option.params?.name || '?').slice(0, 2) }}</span
              >
              <div class="flex flex-col min-w-0">
                <span class="font-medium text-strong truncate">{{
                  option.params?.name || `Asset #${option.index}`
                }}</span>
                <span class="text-xs text-subtle truncate">
                  {{ option.params?.unitName ? option.params.unitName + ' · ' : '' }}#{{
                    option.index
                  }}
                </span>
              </div>
            </div>
          </template>
        </AutoComplete>
      </div>

      <div class="flex justify-center">
        <Button
          icon="pi pi-arrow-right-arrow-left"
          severity="secondary"
          text
          rounded
          :aria-label="t('components.createPool.swap')"
          v-tooltip.top="t('components.createPool.swap')"
          class="rotate-90"
          @click="swap"
        />
      </div>

      <!-- Quote asset -->
      <div class="flex flex-col gap-1.5">
        <label class="eyebrow">{{ t('components.createPool.quoteAsset') }}</label>
        <AutoComplete
          v-model="quote"
          :suggestions="quoteSuggestions"
          optionLabel="_label"
          dropdown
          forceSelection
          :delay="300"
          :placeholder="searchPlaceholder"
          class="w-full create-pool-ac"
          data-cy="create-pool-quote"
          inputClass="cp-quote-input"
          @complete="onSearchQuote"
        >
          <template #option="{ option }">
            <div class="flex items-center gap-3 py-1">
              <img
                v-if="imageUrl(option.index)"
                :src="imageUrl(option.index)"
                alt=""
                class="w-7 h-7 rounded-md object-cover border divider-border"
                @error="onImgError"
              />
              <span
                v-else
                class="w-7 h-7 rounded-md flex items-center justify-center text-xs surface-inset shrink-0"
                >{{ (option.params?.unitName || option.params?.name || '?').slice(0, 2) }}</span
              >
              <div class="flex flex-col min-w-0">
                <span class="font-medium text-strong truncate">{{
                  option.params?.name || `Asset #${option.index}`
                }}</span>
                <span class="text-xs text-subtle truncate">
                  {{ option.params?.unitName ? option.params.unitName + ' · ' : '' }}#{{
                    option.index
                  }}
                </span>
              </div>
            </div>
          </template>
        </AutoComplete>
      </div>

      <Message v-if="sameAsset" severity="warn" class="!mt-0">{{
        t('components.createPool.sameAssetWarning')
      }}</Message>

      <Message v-else-if="pairAlreadyExists" severity="info" class="!mt-0">{{
        t('components.createPool.pairExistsHint')
      }}</Message>

      <div v-else class="surface-inset p-3 text-sm text-muted flex items-start gap-2">
        <i class="pi pi-info-circle mt-0.5 text-base" style="color: var(--brand)" />
        <span>{{ t('components.createPool.hint') }}</span>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <Button
          :label="t('components.createPool.cancel')"
          severity="secondary"
          text
          @click="close"
        />
        <Button
          :label="t('components.createPool.continue')"
          icon="pi pi-arrow-right"
          iconPos="right"
          data-cy="create-pool-continue"
          :disabled="!canContinue"
          @click="onContinue"
        />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.create-pool-ac :deep(.p-autocomplete-input) {
  width: 100%;
}
</style>
