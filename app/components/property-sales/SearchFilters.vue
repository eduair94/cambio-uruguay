<template>
  <component
    :is="mobile ? VDialog : 'div'"
    v-bind="dialogProps"
    @update:model-value="emit('update:open', $event)"
    @after-enter="heading?.focus({ preventScroll: true })"
    @after-leave="emit('closed')"
  >
    <form
      class="sale-search"
      :class="{ 'sale-search--mobile': mobile }"
      :aria-label="t('search')"
      @submit.prevent="submit"
    >
      <header>
        <h2 id="sale-filter-title" ref="heading" tabindex="-1">{{ t('filters') }}</h2>
        <VBtn
          v-if="mobile"
          icon="mdi-close"
          variant="text"
          :aria-label="t('closeFilters')"
          data-testid="sale-filter-close"
          @click="emit('update:open', false)"
        />
      </header>
      <div class="sale-search__body">
        <VTextField
          v-model="draft.q"
          :label="t('keywords')"
          :placeholder="t('keywordsHint')"
          v-bind="field"
          clearable
        />
        <fieldset>
          <legend>{{ t('location') }}</legend>
          <VAutocomplete
            v-model="draft.department"
            :items="facetItems('departments')"
            :label="t('department')"
            v-bind="field"
            clearable
            @update:model-value="changeLocation('department')"
          />
          <VAutocomplete
            v-model="draft.locality"
            :items="facetItems('localities')"
            :label="t('locality')"
            v-bind="field"
            clearable
            @update:model-value="changeLocation('locality')"
          />
          <VAutocomplete
            v-model="draft.neighborhood"
            :items="facetItems('neighborhoods')"
            :label="t('neighborhood')"
            v-bind="field"
            clearable
          />
        </fieldset>
        <fieldset>
          <legend>{{ t('price') }}</legend>
          <VSelect
            v-model="draft.currency"
            :items="['USD', 'UYU']"
            :label="t('currency')"
            v-bind="field"
          />
          <div class="sale-search__pair">
            <VTextField
              v-model="draft.minPrice"
              :label="t('minPrice')"
              type="number"
              min="0"
              inputmode="numeric"
              v-bind="field"
            />
            <VTextField
              v-model="draft.maxPrice"
              :label="t('maxPrice')"
              type="number"
              min="0"
              inputmode="numeric"
              v-bind="field"
            />
          </div>
          <p>{{ t('priceHint') }}</p>
        </fieldset>
        <component
          :is="mobile ? 'details' : 'div'"
          class="sale-search__advanced"
          :open="advancedOpen"
          @toggle="advancedOpen = ($event.target as HTMLDetailsElement).open"
        >
          <summary v-if="mobile">{{ t('features') }}</summary>
          <fieldset>
            <legend v-if="!mobile">{{ t('features') }}</legend>
            <VSelect
              v-model="draft.type"
              :items="[
                { title: t('all'), value: 'all' },
                ...['casa', 'apartamento'].map(value => ({ title: t(value), value })),
              ]"
              :label="t('type')"
              v-bind="field"
            />
            <div class="sale-search__pair">
              <VSelect
                v-model="draft.bedrooms"
                :items="bedroomItems"
                :label="t('bedrooms')"
                v-bind="field"
              />
              <VSelect
                v-model="draft.bathrooms"
                :items="bathroomItems"
                :label="t('bathroomsMin')"
                v-bind="field"
              />
            </div>
            <VCheckbox
              v-for="key in checks"
              :key="key"
              v-model="draft[key]"
              :label="t(key)"
              density="compact"
              hide-details
            />
            <VSelect
              v-model="draft.amenity"
              :items="[
                { title: t('any'), value: '' },
                ...PROPERTY_SALES_AMENITIES.map(value => ({ title: t(value), value })),
              ]"
              :label="t('amenity')"
              v-bind="field"
            />
          </fieldset>
          <fieldset>
            <legend>{{ t('area') }}</legend>
            <VSelect
              v-model="draft.areaBasis"
              :items="
                ['built', 'total', 'land', 'reported'].map(value => ({ title: t(value), value }))
              "
              :label="t('areaBasis')"
              v-bind="field"
            />
            <div class="sale-search__pair">
              <VTextField
                v-model="draft.minArea"
                :label="t('minArea')"
                type="number"
                min="0"
                inputmode="decimal"
                v-bind="field"
              />
              <VTextField
                v-model="draft.maxArea"
                :label="t('maxArea')"
                type="number"
                min="0"
                inputmode="decimal"
                v-bind="field"
              />
            </div>
            <p>{{ t('areaHint') }}</p>
          </fieldset>
          <fieldset>
            <legend>{{ t('source') }}</legend>
            <VSelect
              v-model="draft.source"
              :items="[
                { title: t('all'), value: 'all' },
                ...facets.sources.map(item => ({
                  title: propertySaleSourceName(item.value),
                  value: item.value,
                })),
              ]"
              :label="t('source')"
              v-bind="field"
            />
            <VAutocomplete
              v-model="draft.seller"
              :items="facetItems('sellers')"
              :label="t('seller')"
              v-bind="field"
              clearable
            />
            <VSelect
              v-model="draft.recent"
              :items="[
                { title: t('all'), value: 'all' },
                ...['1', '3', '7'].map(value => ({ title: t(`recent${value}`), value })),
              ]"
              :label="t('recent')"
              v-bind="field"
            />
          </fieldset>
        </component>
      </div>
      <footer>
        <p v-if="invalid" role="alert" class="sale-search__error">{{ t('rangeError') }}</p>
        <VBtn variant="text" @click="reset">{{ t('clear') }}</VBtn>
        <VBtn type="submit" color="primary" :loading="pending" data-testid="sale-filter-apply">
          {{ t('apply') }}
        </VBtn>
      </footer>
    </form>
  </component>
</template>
<script setup lang="ts">
import { VDialog } from 'vuetify/components'
import {
  normalizePropertySalesQuery,
  PROPERTY_SALES_AMENITIES,
  type PropertySalesQuery,
  type PropertySalesResponse,
} from '~/utils/propertySales'
import { propertySaleSourceName, propertySalesMessages } from '~/utils/propertySalesMessages'
const props = defineProps<{
  query: PropertySalesQuery
  facets: PropertySalesResponse['facets']
  pending: boolean
  mobile: boolean
  open: boolean
}>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  search: [query: PropertySalesQuery]
  location: [query: PropertySalesQuery]
  closed: []
}>()
const { t } = useI18n({ useScope: 'local', messages: propertySalesMessages })
const field = { variant: 'outlined', density: 'comfortable', hideDetails: true } as const
const checks = ['parking', 'furnished', 'photos'] as const
const draft = ref(normalizePropertySalesQuery(props.query as unknown as Record<string, unknown>))
const heading = ref<HTMLElement | null>(null)
const invalid = ref(false)
const advancedOpen = ref(false)
const viewportHeight = ref('100dvh')
const viewportTop = ref('0px')
const bedroomItems = computed(() => [
  { title: t('any'), value: '' },
  { title: t('studio'), value: 0 },
  ...Array.from({ length: 8 }, (_, i) => ({ title: i === 7 ? '8+' : String(i + 1), value: i + 1 })),
])
const bathroomItems = computed(() => [
  { title: t('any'), value: '' },
  ...Array.from({ length: 8 }, (_, i) => ({ title: `${i + 1}+`, value: i + 1 })),
])
const facetItems = (key: keyof PropertySalesResponse['facets']) =>
  props.facets[key].map(item => ({
    title: `${item.value} (${item.count.toLocaleString()})`,
    value: item.value,
  }))
const dialogProps = computed(() =>
  props.mobile
    ? {
        modelValue: props.open,
        scrollable: true,
        transition: 'slide-x-reverse-transition',
        'aria-labelledby': 'sale-filter-title',
        contentProps: {
          id: 'sale-filter-dialog',
          style: {
            position: 'fixed',
            width: 'min(420px, calc(100vw - 20px))',
            maxWidth: 'none',
            height: viewportHeight.value,
            maxHeight: viewportHeight.value,
            top: viewportTop.value,
            right: '0',
            left: 'auto',
            margin: '0',
            borderRadius: '16px 0 0 16px',
            overflow: 'hidden',
          },
        },
      }
    : {}
)
function syncViewport() {
  viewportHeight.value = `${window.visualViewport?.height || window.innerHeight}px`
  viewportTop.value = `${window.visualViewport?.offsetTop || 0}px`
}
function changeLocation(key: 'department' | 'locality') {
  if (key === 'department') draft.value.locality = ''
  draft.value.neighborhood = ''
  emit('location', normalizePropertySalesQuery(draft.value as unknown as Record<string, unknown>))
}
function reset() {
  draft.value = normalizePropertySalesQuery({ view: props.query.view, keys: props.query.keys })
  invalid.value = false
  emit('location', draft.value)
}
function submit() {
  const normalized = normalizePropertySalesQuery(draft.value as unknown as Record<string, unknown>)
  invalid.value =
    (normalized.minPrice !== null &&
      normalized.maxPrice !== null &&
      normalized.minPrice > normalized.maxPrice) ||
    (normalized.minArea !== null &&
      normalized.maxArea !== null &&
      normalized.minArea > normalized.maxArea)
  if (invalid.value) return
  emit('search', { ...normalized, page: 1 })
}
watch(
  () => props.query,
  query => {
    draft.value = normalizePropertySalesQuery(query as unknown as Record<string, unknown>)
    invalid.value = false
  },
  { deep: true }
)
watch(
  () => props.open,
  open => {
    if (open) {
      draft.value = normalizePropertySalesQuery(props.query as unknown as Record<string, unknown>)
      const q = props.query
      advancedOpen.value = Boolean(
        q.type !== 'all' ||
          q.bedrooms !== '' ||
          q.bathrooms !== '' ||
          q.parking ||
          q.furnished ||
          q.photos ||
          q.amenity ||
          q.minArea !== null ||
          q.maxArea !== null ||
          q.source !== 'all' ||
          q.seller ||
          q.recent !== 'all'
      )
      invalid.value = false
      syncViewport()
    }
  }
)
onMounted(() => {
  syncViewport()
  window.visualViewport?.addEventListener('resize', syncViewport)
  window.visualViewport?.addEventListener('scroll', syncViewport)
  window.addEventListener('resize', syncViewport)
})
onBeforeUnmount(() => {
  window.visualViewport?.removeEventListener('resize', syncViewport)
  window.visualViewport?.removeEventListener('scroll', syncViewport)
  window.removeEventListener('resize', syncViewport)
})
</script>
<style scoped>
.sale-search {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.14);
  border-radius: 14px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  overflow: hidden;
}
.sale-search :is(h2, p) {
  margin: 0;
}
.sale-search header,
.sale-search footer {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex: none;
}
.sale-search h2 {
  font-size: 1.05rem;
  font-weight: 800;
}
.sale-search__body {
  padding: 8px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.sale-search__body > .v-input {
  flex: 0 0 auto;
}
.sale-search__advanced {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.sale-search--mobile .sale-search__advanced {
  display: block;
}
.sale-search__advanced > summary {
  min-height: 44px;
  padding-block: 10px;
  font-weight: 700;
  color: rgb(var(--v-theme-link));
  cursor: pointer;
}
.sale-search__advanced > summary:focus-visible {
  outline: 2px solid rgb(var(--v-theme-link));
  outline-offset: 2px;
}
.sale-search--mobile .sale-search__advanced fieldset {
  margin-top: 16px;
}
.sale-search fieldset {
  border: 0;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
.sale-search legend {
  font-weight: 700;
  font-size: 0.85rem;
  margin-bottom: 12px;
}
.sale-search fieldset p {
  font-size: 0.76rem;
  line-height: 1.55;
  color: rgba(var(--v-theme-on-surface), 0.7);
}
.sale-search__pair {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
}
.sale-search footer {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  flex-wrap: wrap;
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  background: rgb(var(--v-theme-surface));
}
.sale-search footer .v-btn {
  min-height: 44px;
}
.sale-search__error {
  flex-basis: 100%;
  color: rgb(var(--v-theme-error));
  font-size: 0.85rem;
}
.sale-search--mobile {
  height: 100%;
  border: 0;
  border-radius: 0;
  display: flex;
  flex-direction: column;
}
.sale-search--mobile .sale-search__body {
  overflow-y: auto;
  overscroll-behavior: contain;
  min-height: 0;
  flex: 1;
  gap: 16px;
  padding-top: 8px;
}
.sale-search--mobile header,
.sale-search--mobile footer {
  padding-block: 8px;
}
.sale-search--mobile footer {
  padding-bottom: max(8px, env(safe-area-inset-bottom));
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
}
.sale-search--mobile footer .v-btn {
  min-width: 0;
  padding-inline: 8px;
}
.sale-search--mobile footer :deep(.v-btn__content) {
  white-space: normal;
}
.sale-search--mobile footer .sale-search__error {
  grid-column: 1 / -1;
}
.sale-search :deep(.v-field__input) {
  font-size: 0.9rem;
}
.sale-search :deep(.v-label) {
  font-size: 0.83rem;
}
.sale-search :deep(.v-selection-control) {
  min-height: 44px;
}
@media (max-width: 959px) {
  .sale-search :deep(.v-field__input) {
    font-size: 1rem;
  }
}
</style>
