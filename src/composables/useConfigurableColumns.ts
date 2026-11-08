import { readonly, ref, watch, type Ref } from 'vue'
import type { Breakpoint } from '@/composables/useBreakpoint'

export interface ConfigurableColumnDef {
  id: string
  labelKey: string
  /** Breakpoints at which the column is visible until the user picks columns explicitly. */
  defaultBreakpoints: Breakpoint[]
}

interface StoredColumnPrefs {
  columns: string[]
  /** Every column id that existed when the choice was saved (to spot columns added later). */
  known?: string[]
}

export interface ConfigurableColumnsOptions {
  /** Columns that cannot be hidden (e.g. the one that identifies a row). */
  required?: string[]
}

/**
 * Visible-column state of a table, as on the Explore Assets page: follows the breakpoint's
 * defaults until the user touches the column picker, from then on the choice is persisted in
 * localStorage (`storageKey`) and wins over breakpoint changes. Columns added in a later release
 * (not in the saved `known` list) are shown where their breakpoint defaults say so.
 */
export function useConfigurableColumns(
  defs: ConfigurableColumnDef[],
  storageKey: string,
  breakpoint: Ref<Breakpoint>,
  options: ConfigurableColumnsOptions = {}
) {
  const required = options.required ?? []
  const validIds = new Set(defs.map((c) => c.id))
  const defaultsFor = (bp: Breakpoint): string[] =>
    defs.filter((c) => c.defaultBreakpoints.includes(bp)).map((c) => c.id)
  const withRequired = (ids: string[]): string[] => [
    ...required.filter((id) => validIds.has(id) && !ids.includes(id)),
    ...ids
  ]

  const readStored = (): string[] | null => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return null
      const parsed: Partial<StoredColumnPrefs> | null = JSON.parse(raw)
      if (!parsed || !Array.isArray(parsed.columns)) return null
      const ids = parsed.columns.filter(
        (id): id is string => typeof id === 'string' && validIds.has(id)
      )
      // An empty list would leave a blank table the user cannot see how to recover from.
      if (ids.length === 0) return null
      // Columns that did not exist when the choice was saved follow their breakpoint defaults.
      const known = new Set(Array.isArray(parsed.known) ? parsed.known : [...validIds])
      const added = defaultsFor(breakpoint.value).filter(
        (id) => !known.has(id) && !ids.includes(id)
      )
      return withRequired([...ids, ...added])
    } catch {
      return null
    }
  }

  const stored = readStored()
  const hasExplicitPrefs = ref(stored !== null)
  const visibleColumnIds = ref<string[]>(stored ?? defaultsFor(breakpoint.value))

  watch(breakpoint, (bp) => {
    if (!hasExplicitPrefs.value) visibleColumnIds.value = defaultsFor(bp)
  })

  const setVisibleColumns = (picked: string[]) => {
    const columns = withRequired(picked)
    // The picker cannot hide every column: an empty pick is ignored.
    if (columns.length === 0) return
    visibleColumnIds.value = columns
    hasExplicitPrefs.value = true
    try {
      const prefs: StoredColumnPrefs = { columns, known: [...validIds] }
      localStorage.setItem(storageKey, JSON.stringify(prefs))
    } catch {
      // ignore storage errors (e.g. private browsing)
    }
  }

  const isColumnVisible = (id: string): boolean => visibleColumnIds.value.includes(id)

  return { visibleColumnIds: readonly(visibleColumnIds), setVisibleColumns, isColumnVisible }
}
