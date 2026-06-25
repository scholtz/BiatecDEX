<script setup lang="ts">
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import AutoComplete, { type AutoCompleteCompleteEvent } from 'primevue/autocomplete'
import Message from 'primevue/message'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAVMTradeReporterAPI } from '@/api'
import type { BiatecAsset } from '@/api/models'

const { t } = useI18n()
const api = getAVMTradeReporterAPI()

const props = defineProps<{ modelValue: boolean }>()
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

const imageUrl = (id: number) =>
  `https://algorand-trades.de-4.biatec.io/api/asset/image/${id}`

const onImgError = (e: Event) => {
  ;(e.target as HTMLImageElement).style.visibility = 'hidden'
}

const searchAssets = async (query: string): Promise<Selectable[]> => {
  const q = (query || '').trim()
  const results: Selectable[] = []
  // Always surface ALGO when relevant — it is not returned by the asset index.
  if (!q || 'algorand'.includes(q.toLowerCase()) || 'algo'.includes(q.toLowerCase()) || q === '0') {
    results.push(ALGO_ASSET)
  }
  try {
    const isId = /^\d+$/.test(q)
    const response = isId
      ? await api.getApiAsset({ ids: q, size: 25 })
      : await api.getApiAsset({ search: q, size: 25 })
    const data = response?.data ?? []
    for (const a of data) {
      if (a.index === 0) continue // already covered by ALGO entry
      results.push(decorate(a))
    }
  } catch (e) {
    console.error('Asset search failed', e)
  }
  return results
}

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

const swap = () => {
  const tmp = base.value
  base.value = quote.value
  quote.value = tmp
}

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
          :placeholder="t('components.createPool.searchPlaceholder')"
          class="w-full create-pool-ac"
          @complete="onSearchBase"
        >
          <template #option="{ option }">
            <div class="flex items-center gap-3 py-1">
              <img
                :src="imageUrl(option.index)"
                alt=""
                class="w-7 h-7 rounded-md object-cover border divider-border"
                @error="onImgError"
              />
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
          :placeholder="t('components.createPool.searchPlaceholder')"
          class="w-full create-pool-ac"
          @complete="onSearchQuote"
        >
          <template #option="{ option }">
            <div class="flex items-center gap-3 py-1">
              <img
                :src="imageUrl(option.index)"
                alt=""
                class="w-7 h-7 rounded-md object-cover border divider-border"
                @error="onImgError"
              />
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

      <div class="surface-inset p-3 text-sm text-muted flex items-start gap-2">
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
