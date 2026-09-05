<template>
  <component
    :is="mobile ? VDialog : 'div'"
    v-bind="dialogProps"
    @update:model-value="emit('update:open', $event)"
    @after-enter="focusDialogHeading"
    @after-leave="emit('closed')"
  >
    <form
      class="rental-search"
      :class="{ 'rental-search--dialog': mobile }"
      :aria-label="t('search')"
      @submit.prevent="submit"
    >
      <header v-if="mobile" class="rental-search__header">
        <h2 id="rental-filters-title" ref="dialogHeading" tabindex="-1">
          {{ t('mobileFilters') }}
        </h2>
        <VBtn
          icon="mdi-close"
          variant="text"
          :aria-label="t('closeFilters')"
          data-testid="rental-filters-cancel"
          @click="emit('update:open', false)"
        />
      </header>
      <div class="rental-search__scroll">
        <div class="rental-search__main">
          <VSelect
            v-model="draft.department"
            :items="departments"
            :label="t('location')"
            v-bind="field"
            @update:model-value="clearNeighborhoods"
          />
          <VAutocomplete
            v-model="draft.neighborhoods"
            :items="neighborhoods"
            :custom-filter="rentalTextMatches"
            :label="t('neighborhoods')"
            multiple
            chips
            closable-chips
            clear-on-select
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
            v-model="draft.monthlyMax"
            class="rental-search__budget"
            :label="t('monthlyMax')"
            type="number"
            min="0"
            inputmode="numeric"
            clearable
            v-bind="field"
          />
          <VBtn
            v-if="!mobile"
            class="rental-search__submit"
            color="primary"
            type="submit"
            size="large"
            prepend-icon="mdi-magnify"
            :loading="pending"
            >{{ t('search') }}</VBtn
          >
        </div>
        <p class="rental-search__hint">{{ t('monthlyHint') }}</p>
        <div class="rental-search__quick">
          <VCheckbox
            v-model="draft.pets"
            :label="t('pets')"
            hide-details
            density="compact"
            color="primary"
          />
          <VCheckbox
            v-model="draft.owner"
            :label="t('owner')"
            hide-details
            density="compact"
            color="primary"
          />
          <VCheckbox
            v-model="noExpenses"
            :label="t('noExpenses')"
            hide-details
            density="compact"
            color="primary"
          />
          <VBtn
            v-if="!mobile"
            variant="text"
            :append-icon="expanded ? 'mdi-chevron-up' : 'mdi-chevron-down'"
            :aria-expanded="expanded"
            aria-controls="rental-advanced"
            @click="expanded = !expanded"
            >{{ t(expanded ? 'less' : 'more') }}</VBtn
          >
        </div>
        <div v-show="mobile || expanded" id="rental-advanced" class="rental-search__advanced">
          <fieldset>
            <legend>{{ t('budget') }}</legend>
            <div class="rental-search__fields">
              <VTextField
                v-model="draft.priceMin"
                :label="t('priceMin')"
                type="number"
                min="0"
                inputmode="numeric"
                clearable
                v-bind="field"
              />
              <VTextField
                v-model="draft.priceMax"
                :label="t('priceMax')"
                type="number"
                min="0"
                inputmode="numeric"
                clearable
                v-bind="field"
              />
              <VTextField
                v-model="draft.expensesMax"
                :label="t('expensesMax')"
                type="number"
                min="0"
                inputmode="numeric"
                clearable
                v-bind="field"
              />
              <VSelect
                v-model="draft.currency"
                :items="currencyItems"
                :label="t('currency')"
                v-bind="field"
              />
            </div>
            <VCheckbox
              v-model="draft.withExpenses"
              :label="t('expensesKnown')"
              hide-details
              density="compact"
              color="primary"
            />
          </fieldset>
          <fieldset>
            <legend>{{ t('features') }}</legend>
            <VCheckbox
              v-model="draft.bedroomsExact"
              :label="t('exactBedrooms')"
              :disabled="draft.bedrooms === null || draft.bedrooms === 0"
              hide-details
              density="compact"
              color="primary"
              class="mb-3"
            />
            <div class="rental-search__fields">
              <VSelect
                v-model="draft.bathrooms"
                :items="bathroomItems"
                :label="t('bathrooms')"
                v-bind="field"
              />
              <VTextField
                v-model="draft.areaMin"
                :label="t('areaMin')"
                type="number"
                min="0"
                inputmode="numeric"
                clearable
                v-bind="field"
              />
              <VTextField
                v-model="draft.areaMax"
                :label="t('areaMax')"
                type="number"
                min="0"
                inputmode="numeric"
                clearable
                v-bind="field"
              />
              <VTextField
                v-model="draft.q"
                :label="t('text')"
                maxlength="80"
                clearable
                v-bind="field"
              />
            </div>
            <div class="rental-search__checks">
              <VCheckbox
                v-model="draft.parking"
                :label="t('parking')"
                hide-details
                density="compact"
                color="primary"
              />
              <VCheckbox
                v-model="draft.furnished"
                :label="t('furnished')"
                hide-details
                density="compact"
                color="primary"
              />
            </div>
          </fieldset>
          <fieldset>
            <legend>{{ t('conditions') }}</legend>
            <div class="rental-search__fields">
              <VSelect
                v-model="draft.guarantees"
                :items="guaranteeItems"
                :label="t('guarantee')"
                multiple
                chips
                closable-chips
                clearable
                v-bind="field"
              />
              <VSelect
                v-model="draft.source"
                :items="sourceItems"
                :label="t('source')"
                v-bind="field"
              />
            </div>
            <p class="rental-search__hint">{{ t('guaranteeHint') }}</p>
            <VCheckbox
              v-model="draft.multi"
              :label="t('multi')"
              hide-details
              density="compact"
              color="primary"
            />
          </fieldset>
          <fieldset>
            <legend>{{ t('nearby') }}</legend>
            <div class="rental-search__fields">
              <VSelect
                v-model="institution"
                :items="mutualistaItems"
                :label="t('institution')"
                clearable
                v-bind="field"
                @update:model-value="draft.sedes = []"
              />
              <VSelect
                v-model="draft.sedes"
                :items="sedeItems"
                :label="t('branches')"
                :disabled="!institution"
                multiple
                chips
                closable-chips
                clearable
                v-bind="field"
              />
            </div>
            <VSlider
              v-model="draft.radioKm"
              :label="t('radius', { n: draft.radioKm })"
              :min="0.3"
              :max="5"
              :step="0.1"
              :disabled="!draft.sedes.length"
              hide-details
              class="mt-4"
            />
            <p class="rental-search__hint">{{ t('nearbyHint') }}</p>
          </fieldset>
          <p class="rental-search__hint">{{ t('knownHint') }}</p>
          <VAlert
            v-if="invalidRange && !mobile"
            type="error"
            variant="tonal"
            class="mt-3"
            role="alert"
            >{{ t('invalidRange') }}</VAlert
          >
          <div v-if="!mobile" class="rental-search__actions">
            <VBtn variant="text" @click="reset">{{ t('reset') }}</VBtn>
            <VBtn color="primary" type="submit" :loading="pending" prepend-icon="mdi-magnify">{{
              t('search')
            }}</VBtn>
          </div>
        </div>
      </div>
      <footer v-if="mobile" class="rental-search__footer">
        <p v-if="invalidRange" class="rental-search__error" role="alert">{{ t('invalidRange') }}</p>
        <VBtn variant="text" data-testid="rental-filters-reset" @click="reset">{{
          t('clearDraft')
        }}</VBtn>
        <VBtn color="primary" type="submit" data-testid="rental-filters-apply" :loading="pending">{{
          t('applyFilters')
        }}</VBtn>
      </footer>
    </form>
  </component>
</template>

<script setup lang="ts">
import { VDialog } from 'vuetify/components'
import { rentalMessages } from '~/utils/rentalMessages'
import {
  RENTAL_GUARANTEE_PUBLISHED,
  RENTAL_SOURCE_LABEL,
  normalizeRentalQuery,
  rentalTextMatches,
  type RentalFacetValue,
  type RentalQuery,
} from '~/utils/rentals'
import { MUTUALISTA_SEDES, mutualistasConSede } from '~/utils/mutualistaSedes'

const props = withDefaults(
  defineProps<{
    query: RentalQuery
    departments: RentalFacetValue[]
    neighborhoods: RentalFacetValue[]
    pending: boolean
    mobile?: boolean
    open?: boolean
  }>(),
  { mobile: false, open: false }
)
const emit = defineEmits<{
  search: [query: RentalQuery]
  clear: []
  department: [department: string]
  'update:open': [open: boolean]
  closed: []
}>()
const { t } = useI18n({ useScope: 'local', messages: rentalMessages })
const dialogHeading = ref<HTMLElement | null>(null)
const viewportHeight = ref<number | null>(null)
const viewportTop = ref(0)
const dialogProps = computed(() =>
  props.mobile
    ? {
        modelValue: props.open,
        fullscreen: true,
        transition: 'dialog-bottom-transition',
        id: 'rental-mobile-filters-dialog',
        'data-testid': 'rental-mobile-filters-dialog',
        'aria-labelledby': 'rental-filters-title',
        contentProps: {
          style: {
            height: viewportHeight.value ? `${viewportHeight.value}px` : '100dvh',
            maxHeight: '100%',
            top: `${viewportTop.value}px`,
            overflow: 'hidden',
          },
        },
      }
    : {}
)
function syncViewport() {
  viewportHeight.value = window.visualViewport?.height ?? window.innerHeight
  viewportTop.value = window.visualViewport?.offsetTop ?? 0
}
function stopViewport() {
  window.visualViewport?.removeEventListener('resize', syncViewport)
  window.visualViewport?.removeEventListener('scroll', syncViewport)
  window.removeEventListener('resize', syncViewport)
}
function focusDialogHeading() {
  dialogHeading.value?.focus({ preventScroll: true })
}
const copy = (query: RentalQuery): RentalQuery => ({
  ...query,
  neighborhoods: [...query.neighborhoods],
  guarantees: [...query.guarantees],
  sedes: [...query.sedes],
})
const draft = ref(copy(props.query))
const expanded = ref(props.query.bedroomsExact)
const institution = ref(
  MUTUALISTA_SEDES.find(s => s.osmId === props.query.sedes[0])?.mutualista || ''
)
watch(
  () => props.open,
  open => {
    if (!import.meta.client) return
    stopViewport()
    if (!open) return
    draft.value = copy(props.query)
    institution.value =
      MUTUALISTA_SEDES.find(s => s.osmId === props.query.sedes[0])?.mutualista || ''
    syncViewport()
    window.visualViewport?.addEventListener('resize', syncViewport)
    window.visualViewport?.addEventListener('scroll', syncViewport)
    window.addEventListener('resize', syncViewport)
  }
)
onBeforeUnmount(() => {
  if (import.meta.client) stopViewport()
})
watch(
  () => props.query,
  query => {
    draft.value = copy(query)
    institution.value = MUTUALISTA_SEDES.find(s => s.osmId === query.sedes[0])?.mutualista || ''
  }
)
watch(
  () => draft.value.department,
  department => emit('department', department)
)
const field = { variant: 'outlined', density: 'comfortable', hideDetails: true } as const
const departments = computed(() => [
  { title: t('country'), value: '' },
  ...Array.from(
    new Set([...props.departments.map(f => f.value), draft.value.department].filter(Boolean))
  ).map(value => ({ title: value, value })),
])
const neighborhoods = computed(() =>
  Array.from(new Set([...props.neighborhoods.map(f => f.value), ...draft.value.neighborhoods])).map(
    value => ({ title: value, value })
  )
)
const typeItems = computed(() => [
  { title: t('any'), value: '' },
  ...Object.entries({
    apartamento: 'apartment',
    casa: 'house',
    habitacion: 'room',
    local: 'commercial',
    oficina: 'office',
    terreno: 'land',
    otro: 'other',
  }).map(([value, label]) => ({ title: t(label), value })),
])
const bedroomItems = computed(() => [
  { title: t('any'), value: null },
  { title: t('studio'), value: 0 },
  ...[1, 2, 3, 4].map(value => ({
    title: draft.value.bedroomsExact ? String(value) : t('atLeast', { n: value }),
    value,
  })),
])
const bathroomItems = computed(() => [
  { title: t('any'), value: null },
  ...[1, 2, 3].map(value => ({ title: t('atLeast', { n: value }), value })),
])
const currencyItems = computed(() => [
  { title: t('any'), value: '' },
  { title: t('uyu'), value: 'UYU' },
  { title: t('usd'), value: 'USD' },
])
const sourceItems = computed(() => [
  { title: t('allSources'), value: '' },
  ...Object.entries(RENTAL_SOURCE_LABEL).map(([value, title]) => ({ title, value })),
])
const guaranteeItems = computed(() =>
  RENTAL_GUARANTEE_PUBLISHED.map(value => ({ title: t(value), value }))
)
const mutualistaItems = mutualistasConSede()
const sedeItems = computed(() =>
  MUTUALISTA_SEDES.filter(s => s.mutualista === institution.value).map(s => ({
    title: `${s.nombre}${s.direccion ? ` · ${s.direccion}` : ''}`,
    value: s.osmId,
  }))
)
const noExpenses = computed({
  get: () => String(draft.value.expensesMax) === '0',
  set: value => {
    draft.value.expensesMax = value ? 0 : null
  },
})
const invalidRange = computed(() =>
  [
    [draft.value.priceMin, draft.value.priceMax],
    [draft.value.areaMin, draft.value.areaMax],
  ].some(
    ([min, max]) =>
      min !== null &&
      max !== null &&
      Number(min) > 0 &&
      Number(max) > 0 &&
      Number(min) > Number(max)
  )
)
function submit() {
  if (invalidRange.value) {
    expanded.value = true
    return
  }
  emit('search', copy(draft.value))
}
function reset() {
  draft.value = normalizeRentalQuery()
  institution.value = ''
  if (!props.mobile) emit('clear')
}
function clearNeighborhoods() {
  draft.value.neighborhoods = []
  draft.value.neighborhood = ''
}
</script>

<style scoped>
.rental-search {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  padding: 20px;
  background: rgb(var(--v-theme-surface));
}
.rental-search__main {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.rental-search__submit {
  height: 56px;
}
.rental-search__hint {
  margin: 12px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.78);
  font-size: 0.8rem;
  line-height: 1.5;
}
.rental-search__quick,
.rental-search__checks {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 24px;
}
.rental-search__quick {
  margin-top: 8px;
}
.rental-search__quick > .v-btn {
  margin-left: auto;
}
.rental-search__advanced {
  padding-top: 12px;
}
fieldset {
  border: 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding: 20px 0 8px;
  margin: 12px 0 0;
  min-width: 0;
}
legend {
  padding-right: 12px;
  font-weight: 700;
}
.rental-search__fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.rental-search__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}
.rental-search--dialog {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  border: 0;
  border-radius: 0;
  padding: 0;
  overflow: hidden;
}
.rental-search__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex: 0 0 auto;
  padding: max(8px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) 8px
    max(16px, env(safe-area-inset-left));
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.rental-search__header h2 {
  margin: 0;
  font-size: 1.25rem;
  line-height: 1.3;
}
.rental-search--dialog .rental-search__scroll {
  flex: 1 1 auto;
  min-height: 0;
  padding: 20px max(16px, env(safe-area-inset-right)) 24px max(16px, env(safe-area-inset-left));
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior-y: contain;
  scroll-padding-block: 16px;
}
.rental-search--dialog .rental-search__main {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.rental-search--dialog .rental-search__main > :first-child,
.rental-search--dialog .rental-search__main > :nth-child(2),
.rental-search--dialog .rental-search__budget {
  grid-column: 1 / -1;
}
.rental-search--dialog :deep(input) {
  font-size: 16px;
}
.rental-search--dialog :deep(.v-selection-control) {
  min-height: 44px;
}
.rental-search--dialog :deep(.v-autocomplete__selection),
.rental-search--dialog :deep(.v-select__selection) {
  min-height: 44px;
}
.rental-search--dialog :deep(.v-autocomplete .v-field input) {
  /* Keep the search row stable when a tap moves focus to the next filter. */
  min-width: 64px;
}
.rental-search--dialog :deep(.v-chip) {
  min-height: 44px;
}
.rental-search--dialog :deep(.v-chip__close) {
  flex: 0 0 44px;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  max-width: 44px;
  max-height: 44px;
}
.rental-search--dialog :deep(.v-selection-control .v-label) {
  white-space: normal;
  overflow-wrap: anywhere;
}
.rental-search__footer {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  padding: 12px max(84px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom))
    max(12px, env(safe-area-inset-left));
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-surface));
}
.rental-search__footer > .v-btn {
  min-height: 48px;
  padding-inline: 8px;
}
.rental-search__error {
  grid-column: 1 / -1;
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.4;
  color: rgb(var(--v-theme-error));
}
@media (max-width: 599px) {
  .rental-search {
    padding: 16px;
  }
  .rental-search--dialog {
    padding: 0;
  }
  .rental-search__main {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px 10px;
  }
  .rental-search__main > :nth-child(2),
  .rental-search__budget,
  .rental-search__submit {
    grid-column: 1 / -1;
  }
  .rental-search__main > :first-child {
    grid-column: 1 / -1;
  }
  .rental-search__quick {
    gap: 0 12px;
  }
  .rental-search__quick > .v-btn {
    margin-left: 0;
  }
  .rental-search__fields {
    grid-template-columns: 1fr;
  }
  .rental-search__actions {
    position: sticky;
    bottom: 0;
    padding: 12px 0;
    background: rgb(var(--v-theme-surface));
    z-index: 1;
  }
}
</style>
