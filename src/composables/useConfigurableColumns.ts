import { ref, watch, type Ref } from 'vue'
import type { Breakpoint } from '@/composables/useBreakpoint'

export interface ConfigurableColumnDef {
  id: string
  labelKey: string
  /** Breakpoints at which the column is visible until the user picks columns explicitly. */
  defaultBreakpoints: Breakpoint[]
}

interface StoredColumnPrefs {
  columns: string[]
}

const readStored = (storageKey: string, validIds: Set<string>): string[] | null => {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null
    const parsed: Partial<StoredColumnPrefs> | null = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.columns)) return null
    // Ids that no longer exist (a column was renamed or removed) are dropped.
    return parsed.columns.filter((id): id is string => typeof id === 'string' && validIds.has(id))
  } catch {
    return null
  }
}

/**
 * Visible-column state of a table, as on the Explore Assets page: follows the breakpoint's
 * defaults until the user touches the column picker, from then on the choice is persisted in
 * localStorage (`storageKey`) and wins over breakpoint changes.
 */
export function useConfigurableColumns(
  defs: ConfigurableColumnDef[],
  storageKey: string,
  breakpoint: Ref<Breakpoint>
) {
  const defaultsFor = (bp: Breakpoint): string[] =>
    defs.filter((c) => c.defaultBreakpoints.includes(bp)).map((c) => c.id)

  const stored = readStored(storageKey, new Set(defs.map((c) => c.id)))
  const hasExplicitPrefs = ref(stored !== null)
  const visibleColumnIds = ref<string[]>(stored ?? defaultsFor(breakpoint.value))

  watch(breakpoint, (bp) => {
    if (!hasExplicitPrefs.value) visibleColumnIds.value = defaultsFor(bp)
  })

  const setVisibleColumns = (columns: string[]) => {
    visibleColumnIds.value = columns
    hasExplicitPrefs.value = true
    try {
      localStorage.setItem(storageKey, JSON.stringify({ columns } satisfies StoredColumnPrefs))
    } catch {
      // ignore storage errors (e.g. private browsing)
    }
  }

  const isColumnVisible = (id: string): boolean => visibleColumnIds.value.includes(id)

  return { visibleColumnIds, setVisibleColumns, isColumnVisible }
}
