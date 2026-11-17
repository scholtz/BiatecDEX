import { computed, ref } from 'vue'

/**
 * USDC <-> fUSDC conversions that are sent and whose outcome is not known yet. Shared by every
 * instance of the dialog - module scope on purpose: leaving the dashboard unmounts the dialog,
 * but the submitted group can still confirm, so a freshly mounted dialog must find the form
 * locked until every sent conversion has an outcome (the wait itself keeps running after the
 * unmount, and every node call in it has a timeout, so the lock is always released).
 *
 * A counter, not a flag, and the release is owned: only the submit that called `begin()` calls
 * the function it got back. A submit that fails before its send (signature cancelled in another
 * instance of the dialog) must not unlock the form while a group of another submit is in flight.
 * Only the sent phase is shared: building and signing lock the instance they run in.
 */
const inFlight = ref(0)
const waiting = computed(() => inFlight.value > 0)

/** Marks one conversion as sent; the returned function releases it (once). */
const begin = (): (() => void) => {
  inFlight.value++
  let released = false
  return () => {
    if (released) return
    released = true
    inFlight.value--
  }
}

export const useFolksLendInFlight = () => ({ waiting, begin })
