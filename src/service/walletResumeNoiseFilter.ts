// ── Expected wallet-resume noise filter ──────────────────────────────────────
// @txnlab/use-wallet's Mnemonic wallet provider intentionally refuses to operate
// on a non-testnet network — WalletManager.checkMainnet() throws "Production
// network detected. Aborting." by design, since a mnemonic is stored as plaintext
// and should never be allowed near mainnet funds. The app's defaultNetwork is
// 'mainnet-v1.0' (see main.ts), so every app boot's automatic session-resume hits
// this guard for the Mnemonic wallet specifically — not because a session was ever
// connected on mainnet (checkMainnet() also guards connect(), so that could never
// have happened), but because WalletManager.resumeSessions() calls every
// registered wallet's resumeSession() unconditionally, before checking whether
// that wallet even has a stored session.
//
// @txnlab/use-wallet-vue's WalletManagerPlugin.install() already catches this
// itself (`manager.resumeSessions().catch(error => console.error('Error resuming
// sessions:', error))`), so it is not a functional bug — the wallet still connects
// and resumes correctly on testnet (App.vue's network-switch watcher calls
// setActiveNetwork(), which checkMainnet() reads live) — but it is guaranteed,
// scary-looking console noise on every single page load for every visitor on the
// app's default network. Removing the Mnemonic wallet entirely would silence the
// noise but also remove a real, working, documented capability (see
// views.about.disclaimer5 in the locale files) on every network, not just
// mainnet — so instead this recognizes and filters out ONLY that one exact,
// known-benign console.error call, leaving every other console.error (including a
// genuine failure to resume a DIFFERENT wallet, or the same message for some other
// underlying reason) visible.

const EXPECTED_PREFIX = 'Error resuming sessions:'
const EXPECTED_MESSAGE = /Production network detected\. Aborting\./

/**
 * True for the exact console.error call @txnlab/use-wallet-vue's
 * WalletManagerPlugin.install() makes when the Mnemonic wallet's checkMainnet()
 * guard rejects resumeSessions() on a non-testnet network.
 */
// `unknown[]` is unavoidable: this classifies whatever a console.error call was
// given, which is arbitrary by definition.
export function isExpectedWalletResumeNoise(args: unknown[]): boolean {
  if (args.length < 2 || args[0] !== EXPECTED_PREFIX) return false
  const error = args[1]
  return error instanceof Error && EXPECTED_MESSAGE.test(error.message)
}

/**
 * Wraps console.error to drop the one known-benign call above; every other call
 * (including any other error logged with the same "Error resuming sessions:"
 * prefix, e.g. a genuinely broken wallet extension) passes through unchanged.
 *
 * Must be installed before `app.use(WalletManagerPlugin, ...)` — the plugin's own
 * resumeSessions().catch() handler runs asynchronously (after app.use() itself has
 * already returned), so the filter needs to already be active by the time that
 * later microtask logs.
 */
export function installWalletResumeNoiseFilter(): void {
  const originalConsoleError = console.error.bind(console)
  console.error = (...args: unknown[]) => {
    if (isExpectedWalletResumeNoise(args)) return
    originalConsoleError(...args)
  }
}
