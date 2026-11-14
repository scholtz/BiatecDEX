import type { ISwapQuote } from '@/interface/ISwapQuote'
import { toBps } from './swapQuote'

export type VenueChoice = 'biatec' | 'folks' | 'none'

export interface ChooseVenueInput {
  biatec: ISwapQuote | null
  folks: ISwapQuote | null
  /** Allowed shortfall of the Biatec quote against Folks, basis points (`store.state.slippage`). */
  toleranceBps: number
}

/** A quote that cannot be executed: nothing to send or nothing to receive. */
const usable = (quote: ISwapQuote | null): quote is ISwapQuote =>
  quote !== null && quote.inputAmount > 0n && quote.outputAmount > 0n

/**
 * Biatec Router executes by default; the Folks quote is only a best-effort check of it.
 *
 * - no Biatec quote: Folks when there is one, else none;
 * - no Folks quote (network not supported, timeout, error): Biatec - the check never blocks
 *   trading;
 * - both: compare like for like - output for fixed input, input for fixed output. Biatec is
 *   accepted unless it is worse than Folks by more than `toleranceBps`.
 *
 * Integer math on bigint only.
 */
export const chooseVenue = ({ biatec, folks, toleranceBps }: ChooseVenueInput): VenueChoice => {
  if (!usable(biatec)) return usable(folks) ? 'folks' : 'none'
  if (!usable(folks)) return 'biatec'
  // Quotes for different swap modes are not comparable; Folks is the venue that was
  // executing every order before Biatec Router became the default.
  if (biatec.swapMode !== folks.swapMode) return 'folks'
  const tolerance = toBps(toleranceBps)
  if (biatec.swapMode === 'FIXED_INPUT') {
    // Receive at least folks.out * (1 - tolerance).
    return biatec.outputAmount * 10000n >= folks.outputAmount * (10000n - tolerance)
      ? 'biatec'
      : 'folks'
  }
  // Fixed output: pay at most folks.in * (1 + tolerance).
  return biatec.inputAmount * 10000n <= folks.inputAmount * (10000n + tolerance)
    ? 'biatec'
    : 'folks'
}
