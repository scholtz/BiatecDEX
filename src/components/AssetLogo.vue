<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import { getAssetImageUrl } from '@/service/tradeApi'

/**
 * The asset logo of a table row. It always occupies the same 40 px square, so logos and names line up in one column whatever
 * the asset: an asset without a logo (or whose logo fails to load) shows its initial instead of a gap. Used by every asset table.
 */
const props = defineProps<{ assetId: number | bigint; name: string }>()

const store = useAppStore()
const url = computed(() => getAssetImageUrl(store.state.env, props.assetId))
// The row component can be reused for another asset (sort / filter), so a failure belongs to the url, not to the element.
const failedUrl = ref<string>()
watch(url, () => (failedUrl.value = undefined))
const showImage = computed(() => !!url.value && failedUrl.value !== url.value)
const initial = computed(() => props.name.trim().charAt(0).toUpperCase())
</script>

<template>
  <div class="shrink-0 w-10 h-10">
    <img
      v-if="showImage"
      :src="url"
      :alt="`${name} logo`"
      loading="lazy"
      decoding="async"
      class="w-10 h-10 rounded-lg object-cover border border-surface-200 dark:border-surface-700"
      @error="failedUrl = url"
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
