import type { WalletManager } from '@txnlab/use-wallet'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, WALLET_ID } from 'biatec-wallet-use-wallet-client'

type DialogLocale = (typeof SUPPORTED_LOCALES)[number]

/**
 * Language the Biatec Wallet connect dialog opens in for an app language. The dialog ships a
 * subset of the DEX languages (no `de`, `ko`, `pl`, `zh`); for those it would otherwise pick the
 * *browser's* language, so a German DEX could open a Slovak dialog. English is the predictable
 * fallback. Regional tags match their base language (`sk-SK` → `sk`).
 */
export function dialogLocaleFor(appLocale: string): DialogLocale {
  const base = appLocale.split('-')[0]?.toLowerCase() ?? ''
  return SUPPORTED_LOCALES.find((locale) => locale === base) ?? DEFAULT_LOCALE
}

/** The one adapter field the connect dialog reads its language from, on every `connect()`. */
interface DialogLocaleHolder {
  locale?: string
}

/**
 * Re-localizes the already created Biatec Wallet adapter after the user switches the app language.
 * The adapter copies its `locale` option once, when the wallet manager is created, and reads the
 * copy each time it opens the connect dialog — so changing the language without a reload would
 * otherwise leave the dialog in the language the page was loaded with.
 */
export function syncBiatecWalletLocale(manager: WalletManager, appLocale: string): void {
  const wallet = manager.getWallet(WALLET_ID)
  if (!wallet) return
  // The adapter keeps `locale` as a TypeScript-private field with no public setter (it is a plain
  // instance property at runtime), so the proper type cannot express this write; walletLocale.test.ts
  // fails if a package update stops honouring it.
  ;(wallet as unknown as DialogLocaleHolder).locale = dialogLocaleFor(appLocale)
}
