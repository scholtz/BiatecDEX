<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  formatSmartNumberParts,
  usdAffixes,
  type SmartNumberInput
} from '@/scripts/common/formatSmartNumber'

// Biatec Scan style number: 4 significant digits, `0.0<sub>6</sub>1234` for tiny values,
// `12345k` / `1234M` / `1234B` for huge ones. See scripts/common/formatSmartNumber.ts.
const props = withDefaults(
  defineProps<{
    value?: SmartNumberInput
    /** Renders a dollar sign positioned like the active locale does. */
    usd?: boolean
    /** Text after the number, e.g. an asset symbol. */
    suffix?: string
    significantDigits?: number
    minFractionDigits?: number
    placeholder?: string
  }>(),
  {
    value: null,
    usd: false,
    suffix: '',
    significantDigits: 4,
    minFractionDigits: 2,
    placeholder: 'N/A'
  }
)

const { locale } = useI18n()

const parts = computed(() =>
  formatSmartNumberParts(props.value, {
    locale: locale.value,
    significantDigits: props.significantDigits,
    minFractionDigits: props.minFractionDigits
  })
)
const affixes = computed(() => (props.usd ? usdAffixes(locale.value) : { prefix: '', suffix: '' }))
</script>

<template>
  <span v-if="!parts">{{ placeholder }}</span>
  <span v-else
    >{{ parts.sign }}{{ affixes.prefix
    }}<template v-if="parts.zeros !== undefined"
      >{{ parts.integer }}{{ parts.decimalSeparator }}0<sub>{{ parts.zeros }}</sub
      >{{ parts.fraction }}</template
    ><template v-else
      >{{ parts.integer
      }}<template v-if="parts.fraction"
        >{{ parts.decimalSeparator }}{{ parts.fraction }}</template
      ></template
    >{{ parts.suffix }}{{ affixes.suffix
    }}<template v-if="suffix">&nbsp;{{ suffix }}</template></span
  >
</template>
