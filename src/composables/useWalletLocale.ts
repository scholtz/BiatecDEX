import { inject, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { WalletManager } from '@txnlab/use-wallet'
import { syncBiatecWalletLocale } from '@/scripts/algo/walletLocale'

/**
 * Keeps the Biatec Wallet connect dialog in the language selected in the DEX: every language
 * switch is pushed to the wallet manager that `WalletManagerPlugin` provides. Call once, from a
 * component that is mounted for the app's whole life (the layout).
 */
export function useWalletLocale(): void {
  const { locale } = useI18n()
  // Provided by WalletManagerPlugin under this key (no exported injection key).
  const manager = inject<WalletManager | undefined>('walletManager', undefined)
  if (!manager) return
  watch(locale, (appLocale) => syncBiatecWalletLocale(manager, appLocale), { immediate: true })
}
