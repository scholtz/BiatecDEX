<script lang="ts">
import { reactive } from 'vue'

// Module scope (a plain <script> block runs once, <script setup> once per row): shared by every row.
// Urls that failed to load (404 = asset without a logo) and when: a re-created row (sort, page, live update) does not request
// the same missing image again, but only for FAILED_RETRY_MS - a transient failure (offline, 5xx) or a freshly uploaded logo
// recovers without a page reload (checked when a row renders, not on a timer). Keyed by url, so another asset or network is never affected.
const FAILED_RETRY_MS = 5 * 60 * 1000
const failedUrls = reactive(new Map<string, number>())
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'
import { getAssetImageUrl } from '@/service/tradeApi'

/**
 * The asset logo of a table row. It always occupies the same 40 px square, so logos and names line up in one column whatever
 * the asset: an asset without a logo (or whose logo fails to load) shows its initial instead of a gap. Used by every asset table.
 */
const props = defineProps<{ assetId: number | bigint; name?: string }>()

const store = useAppStore()
const url = computed(() => getAssetImageUrl(store.state.env, props.assetId))
const showImage = computed(() => !!url.value && !isRecentlyFailed(url.value))
const isRecentlyFailed = (u: string): boolean => {
  const at = failedUrls.get(u)
  if (at === undefined) return false
  if (Date.now() - at < FAILED_RETRY_MS) return true
  failedUrls.delete(u) // expired: retry, and do not keep the entry for the rest of the session
  return false
}
// The url of the image that actually errored: the row can already show another asset when a late error event arrives.
const onError = (event: Event): void => {
  const failed = (event.target as HTMLImageElement).getAttribute('src')
  if (failed) failedUrls.set(failed, Date.now())
}
// Array.from keeps a leading emoji / astral character whole (charAt would split the surrogate pair).
const initial = computed(() => (Array.from((props.name ?? '').trim())[0] ?? '').toUpperCase())
</script>

<template>
  <div class="shrink-0 w-10 h-10">
    <img
      v-if="showImage"
      :src="url"
      alt=""
      loading="lazy"
      decoding="async"
      class="w-10 h-10 rounded-lg object-cover border border-surface-200 dark:border-surface-700"
      @error="onError"
    />
    <div
      v-else
      class="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-300 border border-surface-200 dark:border-surface-700"
      aria-hidden="true"
    >
      {{ initial }}
    </div>
  </div>
</template>
