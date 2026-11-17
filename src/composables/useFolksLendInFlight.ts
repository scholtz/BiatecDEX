import { ref } from 'vue'

/**
 * True while a USDC <-> fUSDC conversion is sent and its outcome is not known yet. Shared by
 * every instance of the dialog - module scope on purpose: leaving the dashboard unmounts the
 * dialog, but the submitted group can still confirm, so a freshly mounted dialog must find the
 * form locked until the first conversion has an outcome (the wait itself keeps running after
 * the unmount, and every node call in it has a timeout, so the flag is always released).
 * Only the sent phase is shared: building and signing lock the instance they run in.
 */
const waiting = ref(false)

export const useFolksLendInFlight = () => ({ waiting })
