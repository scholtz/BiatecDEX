import { describe, it, expect, afterEach, vi } from 'vitest'
import { WalletManager } from '@txnlab/use-wallet'
import { SUPPORTED_LOCALES, biatec } from 'biatec-wallet-use-wallet-client'
import { buildWalletConfigs } from '../walletRegistry'
import { dialogLocaleFor, syncBiatecWalletLocale } from '../walletLocale'
import { networks, ALGORAND_MAINNET } from '../networks'

/** The dialog language the Biatec adapter will use on its next connect(). */
const dialogLocale = (manager: WalletManager): string | undefined =>
  // `locale` is a TypeScript-private adapter field; reading it is the only way to see the state.
  (manager.getWallet('biatec') as unknown as { locale?: string }).locale

const newManager = (locale?: string): WalletManager =>
  new WalletManager({
    wallets: buildWalletConfigs('test-project-id', locale),
    networks,
    defaultNetwork: ALGORAND_MAINNET
  })

describe('dialogLocaleFor', () => {
  it('passes through the app languages the Biatec Wallet dialog ships', () => {
    for (const locale of ['sk', 'hu', 'it', 'ru', 'es', 'en']) {
      expect(SUPPORTED_LOCALES).toContain(locale)
      expect(dialogLocaleFor(locale)).toBe(locale)
    }
  })

  it('maps app languages the dialog does not ship to English, not to the browser language', () => {
    for (const locale of ['de', 'ko', 'pl', 'zh']) {
      expect(dialogLocaleFor(locale)).toBe('en')
    }
  })

  it('accepts regional tags and falls back to English for garbage', () => {
    expect(dialogLocaleFor('sk-SK')).toBe('sk')
    expect(dialogLocaleFor('')).toBe('en')
    expect(dialogLocaleFor('xx')).toBe('en')
  })
})

describe('buildWalletConfigs locale', () => {
  it('creates the Biatec adapter in the current app language', () => {
    const biatec = buildWalletConfigs('test-project-id', 'sk').find((c) => c.id === 'biatec')
    expect(biatec?.options?.locale).toBe('sk')
  })

  it('defaults the dialog to English when no language is given', () => {
    const biatec = buildWalletConfigs('test-project-id').find((c) => c.id === 'biatec')
    expect(biatec?.options?.locale).toBe('en')
  })
})

describe('syncBiatecWalletLocale', () => {
  it('re-localizes the already created adapter when the app language changes', () => {
    const manager = newManager('en')
    expect(dialogLocale(manager)).toBe('en')
    syncBiatecWalletLocale(manager, 'sk')
    expect(dialogLocale(manager)).toBe('sk')
    syncBiatecWalletLocale(manager, 'de')
    expect(dialogLocale(manager)).toBe('en')
  })

  it('does not touch other wallets and tolerates a missing Biatec wallet', () => {
    const manager = newManager('en')
    expect(() => syncBiatecWalletLocale(manager, 'sk')).not.toThrow()
    // Same private-field peek as dialogLocale above, on a wallet that must be left alone.
    const pera = manager.getWallet('pera') as unknown as { locale?: string }
    expect(pera.locale).toBeUndefined()
    const empty = new WalletManager({ wallets: [], networks, defaultNetwork: ALGORAND_MAINNET })
    expect(() => syncBiatecWalletLocale(empty, 'sk')).not.toThrow()
  })
})

describe('the connect dialog the user actually sees', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  // Only the Direct (popup) transport, so opening the dialog starts no WebSocket / WebRTC.
  const dialogManager = (locale: string): WalletManager =>
    new WalletManager({
      wallets: [biatec({ walletconnect: false, liquid: false, locale })],
      networks,
      defaultNetwork: ALGORAND_MAINNET
    })

  /** Opens the Biatec connect dialog, reads its title and cancels the pending connect(). */
  const openDialogTitle = async (manager: WalletManager): Promise<string> => {
    const pending = manager.getWallet('biatec')?.connect()
    const title = document.querySelector('.bcd-title')?.textContent ?? ''
    document.querySelector<HTMLButtonElement>('.bcd-close')?.click()
    await expect(pending).rejects.toThrow()
    return title
  }

  it('opens in the language the adapter was created with', async () => {
    expect(await openDialogTitle(dialogManager('sk'))).toBe('Pripojiť Biatec Wallet')
  })

  it('opens in the new language after syncBiatecWalletLocale, without recreating the adapter', async () => {
    const manager = dialogManager('en')
    syncBiatecWalletLocale(manager, 'sk')
    expect(await openDialogTitle(manager)).toBe('Pripojiť Biatec Wallet')
  })
})

describe('the Biatec Direct popup the user actually sees', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.body.replaceChildren()
  })

  /** Starts a Direct connect (it opens the popup at once) and returns the URL it opened. */
  const directPopupUrl = async (manager: WalletManager): Promise<URL> => {
    // A blocked popup (null) keeps the dialog open; cancelling it then rejects connect().
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const pending = manager.getWallet('biatec')?.connect({ method: 'direct' })
    document.querySelector<HTMLButtonElement>('.bcd-close')?.click()
    await expect(pending).rejects.toThrow()
    expect(open).toHaveBeenCalledTimes(1)
    return new URL(String(open.mock.calls[0]?.[0]))
  }

  const directManager = (locale: string): WalletManager =>
    new WalletManager({
      wallets: buildWalletConfigs('test-project-id', locale),
      networks,
      defaultNetwork: ALGORAND_MAINNET
    })

  it('opens the wallet popup in the language the DEX started in', async () => {
    const url = await directPopupUrl(directManager('sk'))
    expect(url.pathname).toBe('/direct')
    expect(url.searchParams.get('lang')).toBe('sk')
  })

  it('opens the wallet popup in the language the user switched the DEX to', async () => {
    const manager = directManager('en')
    syncBiatecWalletLocale(manager, 'sk')
    expect((await directPopupUrl(manager)).searchParams.get('lang')).toBe('sk')
  })

  it('falls back to English for DEX languages the wallet does not ship', async () => {
    const manager = directManager('sk')
    syncBiatecWalletLocale(manager, 'de')
    expect((await directPopupUrl(manager)).searchParams.get('lang')).toBe('en')
  })
})
