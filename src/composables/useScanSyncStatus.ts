import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import { fetchScanLatestBlock } from '@/service/tradeApi'
import {
  classifyScanSync,
  scanLagSeconds,
  type ScanBlock,
  type ScanSyncState
} from '@/scripts/state/scanSyncStatus'

/** One request per interval, never a tight loop; the next poll is scheduled after the previous ends. */
export const SCAN_SYNC_POLL_MS = 15_000
/** A single failed poll keeps the last state; only this many in a row make the status unknown. */
export const SCAN_SYNC_MAX_FAILURES = 3

/**
 * Polls Biatec Scan's latest processed block for the active network and exposes whether the price
 * data may be out of sync (and whether the indexer is catching up). Mount once (App.vue).
 * Pauses while the tab is hidden and polls again as soon as it is visible.
 */
export function useScanSyncStatus() {
  const store = useAppStore()
  const state = ref<ScanSyncState>('unknown')
  const lagSeconds = ref(0)
  let previous: ScanBlock | null = null
  let failures = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  let stopped = false
  // Bumped on a network switch / resume; results of requests started before it are dropped.
  let generation = 0

  const clearTimer = () => {
    if (timer) clearTimeout(timer)
    timer = null
  }

  const schedule = () => {
    clearTimer()
    if (stopped || document.hidden) return
    timer = setTimeout(() => void poll(), SCAN_SYNC_POLL_MS)
  }

  const poll = async () => {
    const myGeneration = generation
    const latest = await fetchScanLatestBlock(store.state.env)
    if (stopped || myGeneration !== generation) return
    if (latest) {
      failures = 0
      const nowSec = Date.now() / 1000
      const next = classifyScanSync(latest, previous, nowSec)
      if (next !== state.value) state.value = next
      const lag = scanLagSeconds(latest, nowSec)
      if (lag !== lagSeconds.value) lagSeconds.value = lag
      previous = latest
    } else if (++failures >= SCAN_SYNC_MAX_FAILURES && state.value !== 'unknown') {
      state.value = 'unknown'
    }
    schedule()
  }

  /** Restart the loop from scratch: invalidate in-flight work and poll right now. */
  const restart = () => {
    generation++
    clearTimer()
    void poll()
  }

  const onVisibility = () => {
    if (document.hidden) {
      clearTimer()
    } else {
      // `previous` may be minutes old after a sleep: a "syncing" verdict needs a fresh baseline.
      previous = null
      restart()
    }
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibility)
    void poll()
  })
  watch(
    () => store.state.env,
    () => {
      previous = null
      failures = 0
      state.value = 'unknown'
      restart()
    }
  )
  onUnmounted(() => {
    stopped = true
    clearTimer()
    document.removeEventListener('visibilitychange', onVisibility)
  })

  return {
    state,
    lagSeconds,
    outOfSync: computed(() => state.value === 'syncing' || state.value === 'stalled')
  }
}
