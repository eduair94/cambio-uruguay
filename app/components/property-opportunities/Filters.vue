<template>
  <component
    :is="mobile ? VDialog : 'div'"
    v-bind="dialogProps"
    @update:model-value="emit('update:open', $event)"
    @after-enter="heading?.focus({ preventScroll: true })"
    @after-leave="emit('closed')"
  >
    <form
      class="opportunity-filters"
      :class="{ 'opportunity-filters--dialog': mobile }"
      @submit.prevent="submit"
    >
      <header>
        <h2 id="opportunity-filters-title" ref="heading" tabindex="-1">{{ t('filters') }}</h2>
        <VBtn
          v-if="mobile"
          icon="mdi-close"
          variant="text"
          :aria-label="t('closeFilters')"
          @click="emit('update:open', false)"
        />
      </header>
      <div class="opportunity-filters__scroll">
        <VSelect
          v-model="draft.department"
          :items="departmentItems"
          :label="t('department')"
          v-bind="field"
          @update:model-value="draft.neighborhood = ''"
        />
        <VAutocomplete
          v-model="draft.neighborhood"
          :items="neighborhoodItems"
          :label="t('neighborhood')"
          clearable
          v-bind="field"
        />
        <VSelect v-model="draft.type" :items="typeItems" :label="t('type')" v-bind="field" />
        <VSelect
          v-model="draft.bedrooms"
          :items="bedroomItems"
          :label="t('bedrooms')"
          v-bind="field"
        />
        <VTextField
          v-model="budget"
          :label="t(query.operation === 'rent' ? 'maxRent' : 'maxSale')"
          type="number"
          min="1"
          step="any"
          inputmode="decimal"
          clearable
          v-bind="field"
          :error="invalidBudget"
        />
        <p v-if="invalidBudget" class="opportunity-filters__error" role="alert">
          {{ t('invalidBudget') }}
        </p>
        <p class="opportunity-filters__hint">
          {{ t(query.operation === 'rent' ? 'rentBudget' : 'saleBudget') }}
        </p>
        <VSelect
          v-model="draft.confidence"
          :items="confidenceItems"
          :label="t('confidence')"
          v-bind="field"
        />
        <p class="opportunity-filters__hint">{{ t('confidenceHint') }}</p>
      </div>
      <footer>
        <VBtn variant="text" @click="clear">{{ t('reset') }}</VBtn
        ><VBtn type="submit" color="primary" :loading="pending">{{ t('apply') }}</VBtn>
      </footer>
    </form>
  </component>
</template>

<script setup lang="ts">
import { VDialog } from 'vuetify/components'
import { propertyOpportunityMessages } from '~/utils/propertyOpportunityMessages'
import type { OpportunityQuery } from '~/utils/propertyOpportunityQuery'

const props = defineProps<{
  query: OpportunityQuery
  departments: string[]
  neighborhoods: string[]
  mobile: boolean
  open: boolean
  pending: boolean
}>()
const emit = defineEmits<{
  search: [query: OpportunityQuery]
  clear: []
  department: [value: string]
  'update:open': [value: boolean]
  closed: []
}>()
const { t } = useI18n({ useScope: 'local', messages: propertyOpportunityMessages })
const heading = ref<HTMLElement | null>(null)
const draft = ref({ ...props.query })
const budget = ref<string | number | null>(props.query.maxPrice)
const invalidBudget = ref(false)
const viewport = ref<{ height: number; top: number } | null>(null)
const field = { variant: 'outlined' as const, density: 'comfortable' as const, hideDetails: true }
const departmentItems = computed(() =>
  [
    { title: t('allZones'), value: '' },
    ...new Set([draft.value.department, ...props.departments].filter(Boolean)),
  ].map(value => (typeof value === 'string' ? { title: value, value } : value))
)
const neighborhoodItems = computed(() => [
  ...new Set([draft.value.neighborhood, ...props.neighborhoods].filter(Boolean)),
])
const typeItems = computed(() => [
  { title: t('any'), value: 'all' },
  { title: t('apartment'), value: 'apartamento' },
  { title: t('house'), value: 'casa' },
])
const bedroomItems = computed(() => [
  { title: t('any'), value: '' },
  ...Array.from({ length: 9 }, (_, n) => ({ title: n ? `${n}` : t('studio'), value: n })),
])
const confidenceItems = computed(() => [
  { title: t('any'), value: 'all' },
  { title: t('supported'), value: 'supported' },
  { title: t('limited'), value: 'limited' },
])
const dialogProps = computed(() =>
  props.mobile
    ? {
        modelValue: props.open,
        id: 'opportunity-filter-dialog',
        class: 'opportunity-filter-drawer',
        transition: 'opportunity-drawer-transition',
        'aria-labelledby': 'opportunity-filters-title',
        contentProps: {
          style: {
            width: 'min(420px, calc(100vw - 16px))',
            maxWidth: 'calc(100vw - 16px)',
            height: viewport.value ? `${viewport.value.height}px` : '100dvh',
            maxHeight: '100%',
            top: `${viewport.value?.top ?? 0}px`,
            right: 0,
            left: 'auto',
            margin: 0,
            overflow: 'hidden',
          },
        },
      }
    : {}
)
function syncViewport() {
  viewport.value = {
    height: window.visualViewport?.height ?? window.innerHeight,
    top: window.visualViewport?.offsetTop ?? 0,
  }
}
function stopViewport() {
  window.visualViewport?.removeEventListener('resize', syncViewport)
  window.visualViewport?.removeEventListener('scroll', syncViewport)
  window.removeEventListener('resize', syncViewport)
}
watch(
  () => [props.query, props.open],
  () => {
    draft.value = { ...props.query }
    budget.value = props.query.maxPrice
    invalidBudget.value = false
  },
  { deep: true }
)
watch(
  () => draft.value.department,
  value => emit('department', value)
)
watch(
  () => props.open,
  open => {
    if (!import.meta.client) return
    stopViewport()
    if (open) {
      syncViewport()
      window.visualViewport?.addEventListener('resize', syncViewport)
      window.visualViewport?.addEventListener('scroll', syncViewport)
      window.addEventListener('resize', syncViewport)
    }
  }
)
onBeforeUnmount(() => {
  if (import.meta.client) stopViewport()
})
function submit() {
  const amount = budget.value === '' || budget.value === null ? null : Number(budget.value)
  invalidBudget.value = amount !== null && (!Number.isFinite(amount) || amount <= 0)
  if (invalidBudget.value) return
  emit('search', {
    ...draft.value,
    neighborhood: draft.value.neighborhood || '',
    maxPrice: amount,
    page: 1,
  })
}
function clear() {
  invalidBudget.value = false
  emit('clear')
}
</script>

<style scoped>
.opportunity-filters {
  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - 150px);
  min-width: 0;
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
.opportunity-filters--dialog {
  height: 100%;
  max-height: 100%;
  border: 0;
  border-radius: 0;
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 0 0 auto;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
h2 {
  margin: 0;
  font-size: 1.15rem;
}
.opportunity-filters__scroll {
  flex: 1 1 auto;
  display: grid;
  align-content: start;
  grid-template-columns: minmax(0, 1fr);
  gap: 20px;
  padding: 24px 16px;
  min-height: 0;
  overflow: auto;
  overscroll-behavior-y: contain;
}
.opportunity-filters__hint {
  margin: -8px 0 0;
  font-size: 0.8rem;
  line-height: 1.55;
  color: rgba(var(--v-theme-on-surface), 0.8);
}
.opportunity-filters__error {
  margin: -8px 0 0;
  font-size: 0.85rem;
  color: rgb(var(--v-theme-error));
}
footer {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 8px;
  flex: 0 0 auto;
  padding: 12px 12px max(12px, env(safe-area-inset-bottom));
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
footer :deep(.v-btn) {
  min-height: 48px;
  padding-inline: 8px;
}
.opportunity-filters :deep(input),
.opportunity-filters :deep(.v-select__selection),
.opportunity-filters :deep(.v-autocomplete__selection) {
  font-size: 16px;
}
.opportunity-filters :deep(.v-field-label:not(.v-field-label--floating)) {
  font-size: 14px;
}
</style>
<style>
.opportunity-filter-drawer > .v-overlay__content.opportunity-drawer-transition-enter-active,
.opportunity-filter-drawer > .v-overlay__content.opportunity-drawer-transition-leave-active {
  transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
}
.opportunity-filter-drawer > .v-overlay__content.opportunity-drawer-transition-enter-from,
.opportunity-filter-drawer > .v-overlay__content.opportunity-drawer-transition-leave-to {
  transform: translateX(100%);
}
@media (prefers-reduced-motion: reduce) {
  .opportunity-filter-drawer > .v-overlay__content {
    transition: none !important;
  }
}
</style>
