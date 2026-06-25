<script setup lang="ts">
import Layout from '@/layouts/PublicLayout.vue'
import Card from 'primevue/card'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { helpCategories, helpUseCases, type HelpUseCase } from '@/data/helpUseCases'
import { useLocalizedRoute } from '@/composables/useLocalizedRoute'

const { t } = useI18n()
const router = useRouter()
const { helpDetailPath } = useLocalizedRoute()

const search = ref('')

interface DecoratedUseCase extends HelpUseCase {
  title: string
  summary: string
}

const decorated = computed<DecoratedUseCase[]>(() =>
  helpUseCases.map((useCase) => ({
    ...useCase,
    title: t(`views.help.useCases.${useCase.slug}.title`),
    summary: t(`views.help.useCases.${useCase.slug}.summary`)
  }))
)

const filtered = computed<DecoratedUseCase[]>(() => {
  const query = search.value.trim().toLowerCase()
  if (!query) return decorated.value
  return decorated.value.filter(
    (useCase) =>
      useCase.title.toLowerCase().includes(query) || useCase.summary.toLowerCase().includes(query)
  )
})

const sections = computed(() =>
  helpCategories
    .map((category) => ({
      category,
      label: t(`views.help.categories.${category}`),
      useCases: filtered.value.filter((useCase) => useCase.category === category)
    }))
    .filter((section) => section.useCases.length > 0)
)

const openUseCase = (slug: string) => {
  router.push(helpDetailPath(slug))
}
</script>

<template>
  <Layout>
    <div class="w-full max-w-5xl mx-auto">
      <Card class="mb-2">
        <template #content>
          <div class="m-3 help-prose">
            <h1 class="flex items-center gap-2">
              <i class="pi pi-question-circle text-2xl" />
              {{ t('views.help.title') }}
            </h1>
            <p>{{ t('views.help.subtitle') }}</p>
            <IconField iconPosition="left" class="block mt-4 max-w-xl">
              <InputIcon class="pi pi-search" />
              <InputText
                v-model="search"
                class="w-full"
                :placeholder="t('views.help.searchPlaceholder')"
              />
            </IconField>
          </div>
        </template>
      </Card>

      <div v-if="sections.length === 0" class="text-center text-muted p-8">
        {{ t('views.help.noResults') }}
      </div>

      <section v-for="section in sections" :key="section.category" class="mb-4">
        <h2 class="help-section-title">{{ section.label }}</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <button
            v-for="useCase in section.useCases"
            :key="useCase.slug"
            type="button"
            class="help-card text-left"
            :data-help-slug="useCase.slug"
            @click="openUseCase(useCase.slug)"
          >
            <div class="flex items-start gap-3">
              <span class="help-card-icon">
                <i :class="useCase.icon" />
              </span>
              <div class="min-w-0">
                <div class="help-card-title">{{ useCase.title }}</div>
                <div class="help-card-summary">{{ useCase.summary }}</div>
              </div>
              <i class="pi pi-angle-right help-card-chevron" />
            </div>
          </button>
        </div>
      </section>
    </div>
  </Layout>
</template>

<style scoped>
.help-prose h1 {
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}
.help-prose p {
  color: var(--text-muted);
  max-width: 70ch;
}
.help-section-title {
  font-size: 1.15rem;
  font-weight: 650;
  margin: 0.25rem 0 0.75rem 0.25rem;
}
.help-card {
  display: block;
  width: 100%;
  padding: 1rem;
  border-radius: 0.75rem;
  border: 1px solid var(--surface-border);
  background: var(--surface-card);
  box-shadow: var(--shadow-sm);
  transition:
    border-color 0.2s ease,
    transform 0.12s ease,
    box-shadow 0.2s ease;
  cursor: pointer;
}
.help-card:hover {
  border-color: var(--brand);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md, var(--shadow-sm));
}
.help-card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 0.6rem;
  background: var(--surface-inset);
  color: var(--brand);
  font-size: 1.1rem;
}
.help-card-title {
  font-weight: 650;
  margin-bottom: 0.15rem;
}
.help-card-summary {
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.35;
}
.help-card-chevron {
  margin-left: auto;
  color: var(--text-muted);
  align-self: center;
}
</style>
