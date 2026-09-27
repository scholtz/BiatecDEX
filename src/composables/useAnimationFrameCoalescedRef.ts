import { onUnmounted, shallowRef, watch, type Ref } from 'vue'

/**
 * Returns a ref that mirrors `source()`, updated onto the DOM at most once per animation
 * frame instead of once per reactivity pass.
 *
 * Built for PrimeVue's `<Chart>`: it deep-watches its `data`/`options` props and, on ANY
 * change, tears down and reconstructs the underlying Chart.js instance via an async
 * `import('chart.js/auto').then(...)` with no guard against having been unmounted before
 * that resolves (see `node_modules/primevue/chart`'s `initChart`/`reinit` — not ours to
 * change). A multi-pass reactive cascade (e.g. AddLiquidity.vue's route-pin state
 * machine settling — see CLAUDE.md's anti-freeze rule 6 and the `ROOT CAUSE` comment on
 * `chartDataStable` in AddLiquidity.vue) can recompute a chart's data/options several
 * times before it settles; feeding PrimeVue's Chart the raw computed directly re-triggers
 * its reinit() once per pass. This coalesces those passes into one update per frame.
 *
 * `source` may return `null`/`undefined` (e.g. before a distribution/config exists yet);
 * such values are skipped rather than applied, so `stable.value` is only ever seeded with
 * `initial` or a genuine non-null value from `source()` — never null once initialized with
 * a non-null `initial`. The value is always read FRESH at flush time (`source()`, not the
 * value captured when the frame was scheduled), so a later change within the same frame
 * is never silently dropped in favor of a stale earlier one.
 */
export function useAnimationFrameCoalescedRef<T>(
  source: () => T | null | undefined,
  initial: T
): Ref<T> {
  const stable = shallowRef(initial) as Ref<T>
  let frame: number | null = null

  const flush = () => {
    frame = null
    const next = source()
    if (next != null) stable.value = next
  }

  watch(source, () => {
    if (frame !== null) return
    frame = requestAnimationFrame(flush)
  })

  onUnmounted(() => {
    if (frame !== null) {
      cancelAnimationFrame(frame)
      frame = null
    }
  })

  return stable
}
