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

/**
 * Polls Biatec Scan's latest processed block for the active network and exposes whether the price
 * data may be out of sync (and whether the indexer is catching up). Mount once (App.vue).
 */
export function useScanSyncStatus() {
  const store = useAppStore()
  const state = ref<ScanSyncState>('unknown')
  const lagSeconds = ref(0)
  let previous: ScanBlock | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let stopped = false
  // Drops results of a request that was started for a network the user has since left.
  let generation = 0

  const poll = async () => {
    const myGeneration = generation
    const latest = await fetchScanLatestBlock(store.state.env)
    if (stopped || myGeneration !== generation) return
    const nowSec = Date.now() / 1000
    const next = classifyScanSync(latest, previous, nowSec)
    if (next !== state.value) state.value = next
    const lag = latest ? scanLagSeconds(latest, nowSec) : 0
    if (lag !== lagSeconds.value) lagSeconds.value = lag
    if (latest) previous = latest
    schedule()
  }

  const schedule = () => {
    if (stopped) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => void poll(), SCAN_SYNC_POLL_MS)
  }

  onMounted(() => void poll())
  watch(
    () => store.state.env,
    () => {
      generation++
      previous = null
      state.value = 'unknown'
      void poll()
    }
  )
  onUnmounted(() => {
    stopped = true
    if (timer) clearTimeout(timer)
  })

  return {
    state,
    lagSeconds,
    outOfSync: computed(() => state.value === 'syncing' || state.value === 'stalled')
  }
}
