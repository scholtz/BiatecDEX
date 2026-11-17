import { ref } from 'vue'

/**
 * The USDC <-> fUSDC conversion in flight, shared by every instance of the dialog. Module
 * scope on purpose: leaving the dashboard unmounts the dialog, but the submitted group can
 * still confirm, so a freshly mounted dialog must find the form locked until the outcome of
 * the first conversion is known (the wait itself keeps running after the unmount).
 */
const processing = ref(false)
/** Sent, waiting for the outcome. */
const waiting = ref(false)

export const useFolksLendInFlight = () => ({ processing, waiting })
