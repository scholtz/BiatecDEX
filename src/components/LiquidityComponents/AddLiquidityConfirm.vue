<script setup lang="ts">
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import { useI18n } from 'vue-i18n'

export interface ReviewDeposit {
  name: string
  amountLabel: string
  symbol: string
  assetId: number
  isAlgo: boolean
}

export interface AddLiquidityReviewModel {
  pair: string
  willCreatePool: boolean
  deposits: ReviewDeposit[]
  poolSeedAlgoLabel: string | null
  networkFeeLabel: string
  walletPrompts: number
  poolAppId?: string
  lpFeePctLabel: string
  priceRangeLabel: string
}

const { t } = useI18n()

const props = defineProps<{
  modelValue: boolean
  summary: AddLiquidityReviewModel | null
  submitting?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const close = () => {
  emit('update:modelValue', false)
  emit('cancel')
}

const confirm = () => {
  emit('confirm')
}
</script>

<template>
  <Dialog
    :visible="props.modelValue"
    modal
    :closable="!props.submitting"
    :dismissableMask="!props.submitting"
    :draggable="false"
    class="alq-review"
    :style="{ width: '40rem', maxWidth: '95vw' }"
    @update:visible="(v) => emit('update:modelValue', v)"
  >
    <template #header>
      <div class="flex flex-col">
        <span class="text-lg font-semibold text-strong">{{
          t('components.addLiquidity.review.title')
        }}</span>
        <span class="text-sm text-muted">{{ t('components.addLiquidity.review.subtitle') }}</span>
      </div>
    </template>

    <div v-if="props.summary" class="flex flex-col gap-4">
      <!-- Operation -->
      <div class="surface-inset p-3 flex items-center justify-between gap-3">
        <div class="flex flex-col">
          <span class="eyebrow">{{ t('components.addLiquidity.review.operation') }}</span>
          <span class="font-semibold text-strong">{{ props.summary.pair }}</span>
        </div>
        <span
          class="alq-badge"
          :class="props.summary.willCreatePool ? 'alq-badge-warn' : 'alq-badge-ok'"
        >
          <i
            :class="props.summary.willCreatePool ? 'pi pi-plus-circle' : 'pi pi-check-circle'"
            class="mr-1"
          />
          {{
            props.summary.willCreatePool
              ? t('components.addLiquidity.review.creatingPool')
              : t('components.addLiquidity.review.existingPool')
          }}
        </span>
      </div>

      <!-- Deposits -->
      <div>
        <div class="eyebrow mb-2">{{ t('components.addLiquidity.review.depositsTitle') }}</div>
        <div class="flex flex-col gap-2">
          <div
            v-for="dep in props.summary.deposits"
            :key="dep.assetId"
            class="flex items-center justify-between surface-inset p-3"
          >
            <div class="flex flex-col">
              <span class="font-medium text-strong">{{ dep.name }}</span>
              <span class="text-xs text-subtle">
                {{ dep.isAlgo ? 'ALGO' : `ASA #${dep.assetId}` }}
              </span>
            </div>
            <span class="font-semibold text-strong tabular-nums"
              >{{ dep.amountLabel }} {{ dep.symbol }}</span
            >
          </div>
        </div>
      </div>

      <!-- ALGO costs -->
      <div>
        <div class="eyebrow mb-2">{{ t('components.addLiquidity.review.costsTitle') }}</div>
        <div class="surface-inset divide-y divider-border">
          <div
            v-if="props.summary.poolSeedAlgoLabel"
            class="flex items-center justify-between p-3"
          >
            <div class="flex flex-col">
              <span class="text-strong">{{ t('components.addLiquidity.review.poolSeed') }}</span>
              <span class="text-xs text-subtle">{{
                t('components.addLiquidity.review.poolSeedHint')
              }}</span>
            </div>
            <span class="font-semibold text-strong tabular-nums"
              >{{ props.summary.poolSeedAlgoLabel }} ALGO</span
            >
          </div>
          <div class="flex items-center justify-between p-3">
            <span class="text-strong">{{ t('components.addLiquidity.review.networkFees') }}</span>
            <span class="font-semibold text-strong tabular-nums"
              >≈ {{ props.summary.networkFeeLabel }} ALGO</span
            >
          </div>
        </div>
      </div>

      <!-- Wallet prompts -->
      <div class="alq-prompts surface-inset p-3 flex items-start gap-3">
        <i class="pi pi-wallet mt-0.5 text-lg" />
        <div class="text-sm text-muted">
          <i18n-t keypath="components.addLiquidity.review.promptsCount" tag="span">
            <template #count>
              <b class="text-strong">{{ props.summary.walletPrompts }}</b>
            </template>
          </i18n-t>
        </div>
      </div>

      <!-- Safety checklist -->
      <div>
        <div class="eyebrow mb-2">{{ t('components.addLiquidity.review.checklistTitle') }}</div>
        <ul class="alq-check flex flex-col gap-2 text-sm">
          <li class="flex items-start gap-2">
            <i class="pi pi-shield mt-0.5" />
            <span>{{ t('components.addLiquidity.review.check1') }}</span>
          </li>
          <li class="flex items-start gap-2">
            <i class="pi pi-arrow-right-arrow-left mt-0.5" />
            <span>{{ t('components.addLiquidity.review.check2') }}</span>
          </li>
          <li class="flex items-start gap-2">
            <i class="pi pi-building-columns mt-0.5" />
            <span>{{ t('components.addLiquidity.review.check3') }}</span>
          </li>
          <li class="flex items-start gap-2">
            <i class="pi pi-ban mt-0.5" />
            <span>{{ t('components.addLiquidity.review.check4') }}</span>
          </li>
        </ul>
      </div>

      <!-- Meta -->
      <div class="flex flex-wrap gap-x-6 gap-y-1 text-xs text-subtle">
        <span>{{ t('components.addLiquidity.review.lpFee') }}: {{ props.summary.lpFeePctLabel }}</span>
        <span
          >{{ t('components.addLiquidity.review.priceRange') }}:
          {{ props.summary.priceRangeLabel }}</span
        >
        <span v-if="props.summary.poolAppId"
          >{{ t('components.addLiquidity.review.poolApp') }}: #{{ props.summary.poolAppId }}</span
        >
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <Button
          :label="t('components.addLiquidity.review.cancel')"
          severity="secondary"
          text
          :disabled="props.submitting"
          @click="close"
        />
        <Button
          :label="t('components.addLiquidity.review.confirm')"
          icon="pi pi-check"
          :loading="props.submitting"
          @click="confirm"
        />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.alq-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  border: 1px solid var(--surface-border);
  white-space: nowrap;
}
.alq-badge-ok {
  color: var(--pos);
  border-color: color-mix(in srgb, var(--pos) 40%, transparent);
  background: color-mix(in srgb, var(--pos) 12%, transparent);
}
.alq-badge-warn {
  color: #d97706;
  border-color: color-mix(in srgb, #d97706 40%, transparent);
  background: color-mix(in srgb, #d97706 12%, transparent);
}
.alq-prompts i,
.alq-check i {
  color: var(--brand);
}
.alq-check span {
  color: var(--text-muted);
}
</style>
