import { onMounted, onUnmounted, ref } from 'vue'

/**
 * Tracks the current responsive breakpoint bucket, keyed to this project's
 * Tailwind breakpoints (default Tailwind CSS 4 `screens`, unmodified by
 * `tailwind.config.js` — see `sm:`/`lg:`/`xl:` usage in `AllAssetsView.vue`).
 */
export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl'

const BREAKPOINTS: { name: Breakpoint; minWidth: number }[] = [
  { name: '2xl', minWidth: 1536 },
  { name: 'xl', minWidth: 1280 },
  { name: 'lg', minWidth: 1024 },
  { name: 'md', minWidth: 768 },
  { name: 'sm', minWidth: 0 }
]

const resolveBreakpoint = (width: number): Breakpoint => {
  for (const bp of BREAKPOINTS) {
    if (width >= bp.minWidth) return bp.name
  }
  return 'sm'
}

const DEBOUNCE_MS = 150

/**
 * Composable exposing the current responsive breakpoint bucket. Listens to
 * `window` resize (debounced) and cleans the listener up on unmount.
 */
export function useBreakpoint() {
  const breakpoint = ref<Breakpoint>(
    resolveBreakpoint(typeof window !== 'undefined' ? window.innerWidth : 1024)
  )

  let debounceTimer: ReturnType<typeof setTimeout> | undefined

  const update = () => {
    breakpoint.value = resolveBreakpoint(window.innerWidth)
  }

  const onResize = () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(update, DEBOUNCE_MS)
  }

  onMounted(() => {
    update()
    window.addEventListener('resize', onResize)
  })

  onUnmounted(() => {
    if (debounceTimer) clearTimeout(debounceTimer)
    window.removeEventListener('resize', onResize)
  })

  return { breakpoint }
}
