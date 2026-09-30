import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import { usePoolPairs } from '@/composables/usePoolPairs'
import { AssetsService } from '@/service/AssetsService'
import type { BiatecAsset } from '@/api/models'

/**
 * State and navigation behind the "Create pool" form (`CreatePoolDialog`), shared by every
 * page that offers it (Explore Assets, Liquidity provider dashboard) so they behave
 * identically. Navigation is always a router push (never a full page load), so the sign-in
 * is kept.
 */
export function useCreatePool() {
  const store = useAppStore()
  const router = useRouter()
  const toast = useToast()
  const { t } = useI18n()
  const poolPairs = usePoolPairs()

  const showCreatePool = ref(false)
  const createPoolInitialBase = ref<{
    assetId: number
    name?: string
    unitName?: string
    decimals?: number
  } | null>(null)

  const openCreatePool = () => {
    createPoolInitialBase.value = null
    showCreatePool.value = true
  }

  // Entry point for bringing a brand-new (not yet pooled) asset into the pair
  // graph (see CLAUDE.md "Pair-driven asset selection"): pre-fills the
  // create-pool form's base asset with the one the user clicked on.
  const openCreatePoolForAsset = (assetCode: string) => {
    const network = store.state.env || 'algorand'
    const asset = AssetsService.getAsset(assetCode, network)
    createPoolInitialBase.value = asset
      ? {
          assetId: asset.assetId,
          name: asset.name,
          unitName: asset.symbol ?? asset.code,
          decimals: asset.decimals
        }
      : null
    showCreatePool.value = true
  }

  const onCreatePool = (payload: { base: BiatecAsset; quote: BiatecAsset }) => {
    const network = store.state.env || 'mainnet-v1.0'
    const baseAsset = AssetsService.ensureCustomAsset({
      assetId: Number(payload.base.index),
      name: payload.base.params?.name ?? undefined,
      unitName: payload.base.params?.unitName ?? undefined,
      decimals: payload.base.params?.decimals ?? undefined,
      network
    })
    const quoteAsset = AssetsService.ensureCustomAsset({
      assetId: Number(payload.quote.index),
      name: payload.quote.params?.name ?? undefined,
      unitName: payload.quote.params?.unitName ?? undefined,
      decimals: payload.quote.params?.decimals ?? undefined,
      network
    })
    if (baseAsset.assetId === quoteAsset.assetId) return
    showCreatePool.value = false

    // If a pool for this pair already exists, don't create a duplicate — take
    // the user to the most liquid existing pool's Add Liquidity screen instead
    // (see CLAUDE.md "Pair-driven asset selection").
    const existingPool = poolPairs.mostLiquidPoolForPair(baseAsset.assetId, quoteAsset.assetId)
    if (existingPool) {
      toast.add({
        severity: 'info',
        detail: t('components.createPool.pairExistsToast'),
        life: 5000
      })
      void router.push({
        name: 'add-liquidity',
        params: {
          network,
          assetCode: baseAsset.code,
          currencyCode: quoteAsset.code,
          ammAppId: existingPool.appId.toString()
        }
      })
      return
    }

    void router.push({
      name: 'liquidity-with-assets',
      params: {
        network,
        assetCode: baseAsset.code,
        currencyCode: quoteAsset.code
      }
    })
  }

  return {
    showCreatePool,
    createPoolInitialBase,
    openCreatePool,
    openCreatePoolForAsset,
    onCreatePool
  }
}
