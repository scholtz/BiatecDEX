import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import { fetchScanLatestBlock, isTradeApiConfigured } from '@/service/tradeApi'
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
/** Old block and no baseline yet: look again soon to tell 'syncing' from 'stalled'. */
export const SCAN_SYNC_BASELINE_POLL_MS = 4_000

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
  let lastPollAt = 0
  let lastPollEnv = ''
  let hiddenAt = 0

  const outOfSyncNow = () => state.value === 'syncing' || state.value === 'stalled'

  const clearTimer = () => {
    if (timer) clearTimeout(timer)
    timer = null
  }

  const schedule = (delayMs: number = SCAN_SYNC_POLL_MS) => {
    clearTimer()
    if (stopped || document.hidden || !isTradeApiConfigured(store.state.env)) return
    timer = setTimeout(() => void poll(), delayMs)
  }

  const poll = async () => {
    const myGeneration = generation
    lastPollAt = Date.now()
    lastPollEnv = store.state.env
    let nextDelay = SCAN_SYNC_POLL_MS
    // No trade API on this network: nothing to poll, nothing to warn about.
    if (!isTradeApiConfigured(store.state.env)) return
    let latest: ScanBlock | null = null
    try {
      latest = await fetchScanLatestBlock(store.state.env)
    } catch {
      // Never let an unexpected rejection end the polling loop; count it as a failed poll.
    }
    if (stopped || myGeneration !== generation) return
    if (latest) {
      failures = 0
      const nowSec = Date.now() / 1000
      const outdatedReplica = !!previous && latest.round < previous.round
      const next = classifyScanSync(latest, previous, nowSec)
      if (next === 'unknown' && !previous) nextDelay = SCAN_SYNC_BASELINE_POLL_MS
      // Keep the standing verdict while the baseline is being re-established (tab wake) and
      // when a replica reports an older round: neither tells us anything new.
      const keepVerdict = outdatedReplica || (next === 'unknown' && outOfSyncNow())
      if (!keepVerdict && next !== state.value) state.value = next
      const lag = scanLagSeconds(latest, nowSec)
      if (lag !== lagSeconds.value) lagSeconds.value = lag
      // Keep the highest round seen: replicas reporting a slightly older watermark must not flap.
      if (!previous || latest.round >= previous.round) previous = latest
    } else if (++failures >= SCAN_SYNC_MAX_FAILURES && state.value !== 'unknown') {
      state.value = 'unknown'
      lagSeconds.value = 0
    }
    schedule(nextDelay)
  }

  /** Restart the loop from scratch: invalidate in-flight work and poll right now. */
  const restart = () => {
    generation++
    clearTimer()
    if (!document.hidden) void poll()
  }

  const onVisibility = () => {
    if (document.hidden) {
      hiddenAt = Date.now()
      clearTimer()
      return
    }
    // After a long pause `previous` is stale: a "syncing" verdict needs a fresh baseline.
    if (Date.now() - hiddenAt > SCAN_SYNC_POLL_MS) previous = null
    // A quick tab flip right after a poll does not cost another request.
    if (lastPollEnv === store.state.env && Date.now() - lastPollAt < SCAN_SYNC_POLL_MS) schedule()
    else restart()
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibility)
    if (!document.hidden) void poll()
  })
  watch(
    () => store.state.env,
    () => {
      previous = null
      failures = 0
      state.value = 'unknown'
      lagSeconds.value = 0
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
