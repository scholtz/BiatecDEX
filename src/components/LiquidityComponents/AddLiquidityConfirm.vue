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
  // Exact number of new pool contracts (ticks) to deploy, and total bins touched
  newPoolCount: number
  tickCount: number
  deposits: ReviewDeposit[]
  // What the wallet will ask to sign
  groups: number
  transactions: number
  // ALGO costs (display strings, already formatted — exact, not estimates)
  poolFundingMbrLabel: string | null
  poolSeedPerContractLabel: string
  lpReserveMbrLabel: string | null
  totalMbrLabel: string
  networkFeeLabel: string
  totalAlgoLabel: string
  // Meta
  lpFeePctLabel: string
  priceRangeLabel: string
  poolAppId?: string
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
    :style="{ width: '42rem', maxWidth: '95vw' }"
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
              ? t('components.addLiquidity.review.newPoolsBadge', {
                  count: props.summary.newPoolCount
                })
              : t('components.addLiquidity.review.existingPool')
          }}
        </span>
      </div>

      <!-- New contracts notice -->
      <div
        v-if="props.summary.willCreatePool"
        class="surface-inset p-3 flex items-start gap-2 text-sm text-muted"
      >
        <i class="pi pi-server mt-0.5 text-base" style="color: var(--brand)" />
        <span>
          {{
            t('components.addLiquidity.review.contractsLine', {
              newPools: props.summary.newPoolCount,
              ticks: props.summary.tickCount
            })
          }}
        </span>
      </div>

      <!-- What you'll sign: groups + transactions -->
      <div>
        <div class="eyebrow mb-2">{{ t('components.addLiquidity.review.whatYouSign') }}</div>
        <div class="grid grid-cols-2 gap-2">
          <div class="surface-inset p-3 flex flex-col items-center text-center">
            <span class="text-2xl font-bold text-strong tabular-nums">{{
              props.summary.groups
            }}</span>
            <span class="text-xs text-muted mt-0.5">{{
              t('components.addLiquidity.review.groupsToSign')
            }}</span>
          </div>
          <div class="surface-inset p-3 flex flex-col items-center text-center">
            <span class="text-2xl font-bold text-strong tabular-nums">{{
              props.summary.transactions
            }}</span>
            <span class="text-xs text-muted mt-0.5">{{
              t('components.addLiquidity.review.transactionsToSign')
            }}</span>
          </div>
        </div>
        <p class="text-xs text-subtle mt-1.5 flex items-center gap-1.5">
          <i class="pi pi-wallet" />
          {{ t('components.addLiquidity.review.groupsHint') }}
        </p>
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

      <!-- Minimum balance (MBR) -->
      <div v-if="props.summary.poolFundingMbrLabel || props.summary.lpReserveMbrLabel">
        <div class="eyebrow mb-2">{{ t('components.addLiquidity.review.mbrTitle') }}</div>
        <div class="surface-inset divide-y divider-border">
          <div
            v-if="props.summary.poolFundingMbrLabel"
            class="flex items-center justify-between p-3"
          >
            <div class="flex flex-col">
              <span class="text-strong">{{ t('components.addLiquidity.review.poolSeed') }}</span>
              <span class="text-xs text-subtle">
                {{
                  t('components.addLiquidity.review.poolSeedDetail', {
                    count: props.summary.newPoolCount,
                    amount: props.summary.poolSeedPerContractLabel
                  })
                }}
              </span>
            </div>
            <span class="font-semibold text-strong tabular-nums"
              >{{ props.summary.poolFundingMbrLabel }} ALGO</span
            >
          </div>
          <div
            v-if="props.summary.lpReserveMbrLabel"
            class="flex items-center justify-between p-3"
          >
            <div class="flex flex-col">
              <span class="text-strong">{{ t('components.addLiquidity.review.lpReserve') }}</span>
              <span class="text-xs text-subtle">{{
                t('components.addLiquidity.review.lpReserveHint')
              }}</span>
            </div>
            <span class="font-semibold text-strong tabular-nums"
              >{{ props.summary.lpReserveMbrLabel }} ALGO</span
            >
          </div>
        </div>
      </div>

      <!-- ALGO totals: MBR + network fees -->
      <div>
        <div class="eyebrow mb-2">{{ t('components.addLiquidity.review.costsTitle') }}</div>
        <div class="surface-inset divide-y divider-border">
          <div class="flex items-center justify-between p-3">
            <span class="text-strong">{{ t('components.addLiquidity.review.mbrTitle') }}</span>
            <span class="font-semibold text-strong tabular-nums"
              >{{ props.summary.totalMbrLabel }} ALGO</span
            >
          </div>
          <div class="flex items-center justify-between p-3">
            <span class="text-strong">{{ t('components.addLiquidity.review.networkFees') }}</span>
            <span class="font-semibold text-strong tabular-nums"
              >{{ props.summary.networkFeeLabel }} ALGO</span
            >
          </div>
          <div class="flex items-center justify-between p-3 alq-total">
            <span class="font-semibold text-strong">{{
              t('components.addLiquidity.review.totalAlgo')
            }}</span>
            <span class="font-bold text-strong tabular-nums"
              >{{ props.summary.totalAlgoLabel }} ALGO</span
            >
          </div>
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
          data-cy="review-cancel"
          :disabled="props.submitting"
          @click="close"
        />
        <Button
          :label="t('components.addLiquidity.review.confirm')"
          icon="pi pi-check"
          data-cy="review-confirm"
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
.alq-total {
  background: var(--brand-soft);
}
.alq-check i {
  color: var(--brand);
}
.alq-check span {
  color: var(--text-muted);
}
</style>
