<template>
  <div class="zone-explorer" data-testid="rental-zone-explorer">
    <div class="explorer-scroll">
      <VTextField
        v-model="search"
        :label="t('search')"
        clearable
        v-bind="field"
        prepend-inner-icon="mdi-magnify"
        class="zone-search"
      />
      <div class="zone-toolbar">
        <VBtn
          class="zone-filter-toggle"
          variant="text"
          prepend-icon="mdi-tune-variant"
          :aria-expanded="filtersOpen"
          :aria-controls="filtersId"
          @click="toggleFilters"
          >{{ t('filters') }}</VBtn
        >
        <div class="view-buttons" :aria-label="t('layer')">
          <VBtn
            :variant="view === 'list' ? 'tonal' : 'text'"
            :aria-pressed="view === 'list'"
            prepend-icon="mdi-format-list-bulleted"
            @click="view = 'list'"
            >{{ t('list') }}</VBtn
          >
          <VBtn
            :variant="view === 'map' ? 'tonal' : 'text'"
            :aria-pressed="view === 'map'"
            :disabled="!data?.boundaryUrl || !data?.zones.some(zone => zone.boundaryAvailable)"
            prepend-icon="mdi-map-outline"
            @click="view = 'map'"
            >{{ t('map') }}</VBtn
          >
        </div>
      </div>
      <button
        type="button"
        class="criteria-summary"
        :aria-expanded="filtersOpen"
        :aria-controls="filtersId"
        @click="toggleFilters"
      >
        <span>{{ criteriaSummary }}</span>
        <VIcon size="18">{{ filtersOpen ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</VIcon>
      </button>
      <div
        :id="filtersId"
        ref="filterPanel"
        class="zone-options"
        :class="{ 'is-expanded': filtersOpen }"
      >
        <div class="zone-controls">
          <VSelect
            v-model="department"
            :items="departments"
            :label="t('department')"
            :disabled="Boolean(lockedDepartment)"
            v-bind="field"
          />
          <VSelect v-model="layer" :items="layers" :label="t('layer')" v-bind="field" />
        </div>
        <div v-if="layer === 'prices'" class="cohort-controls">
          <VSelect v-model="propertyType" :items="types" :label="t('type')" v-bind="field">
            <template #selection="{ item }">
              <span :aria-label="item.title">{{
                propertyType === 'apartamento' ? t('apartmentShort') : item.title
              }}</span>
            </template>
          </VSelect>
          <VSelect v-model="bedrooms" :items="bedroomItems" :label="t('bedrooms')" v-bind="field" />
          <VSelect
            v-model="priceStatistic"
            :items="priceStatistics"
            :label="t('priceStatistic')"
            v-bind="field"
          />
          <VSelect v-model="sortOrder" :items="sortItems" :label="t('order')" v-bind="field" />
          <p class="hint">{{ t('cohortHint') }}</p>
        </div>
        <VSelect
          v-if="layer === 'services'"
          v-model="serviceCategory"
          :items="serviceItems"
          :label="t('services')"
          v-bind="field"
          class="service-filter"
        />
        <div v-if="layer !== 'prices'" class="context-order">
          <VSelect v-model="sortOrder" :items="sortItems" :label="t('order')" v-bind="field" />
        </div>
        <VBtn class="close-filters" variant="text" @click="toggleFilters">{{
          t('showComparison')
        }}</VBtn>
      </div>
      <p v-if="layer === 'crime'" class="hint">{{ t('crimeShort') }}</p>
      <p v-if="status === 'pending' || status === 'idle'" class="notice" role="status">
        {{ t('loading') }}
      </p>
      <div v-else-if="error || !data || data.status === 'unavailable'" class="notice" role="status">
        <p>{{ t('unavailable') }}</p>
        <VBtn variant="text" @click="refresh()">{{ t('retry') }}</VBtn>
      </div>
      <template v-else>
        <p v-if="data.status === 'stale'" class="notice" role="status">{{ t('stale') }}</p>
        <div class="zone-layout" :class="{ 'has-detail': selectedZone }">
          <div class="zone-browser">
            <template v-if="view === 'map'">
              <p class="map-caption">{{ t('mapShort') }}</p>
              <p v-if="boundaryPending" role="status">{{ t('loading') }}</p>
              <p v-else-if="boundaryError || !boundaries" role="status">
                {{ t('mapUnavailable') }}
              </p>
              <ClientOnly v-else
                ><ZoneMap
                  :boundaries="boundaries"
                  :colors="mapColors"
                  :labels="mapLabels"
                  :selected-id="selectedId"
                  @select="selectDetail"
              /></ClientOnly>
              <div class="legend" :aria-label="t('legend')">
                <strong>{{ metricLabel }}</strong>
                <p v-if="layer === 'crime'" class="meta">{{ crimePeriods.join(' · ') }}</p>
                <ul>
                  <li v-for="(bin, index) in bins" :key="index">
                    <i :style="{ background: palette[index] }" aria-hidden="true" />{{
                      valueLabel(bin.from)
                    }}<span v-if="bin.to !== bin.from"> – {{ valueLabel(bin.to) }}</span>
                  </li>
                  <li><i class="no-data-swatch" aria-hidden="true" />{{ t('noData') }}</li>
                </ul>
                <details class="map-methodology">
                  <summary>{{ t('mapMethodology') }}</summary>
                  <p class="hint">{{ t('mapScale') }}</p>
                  <p class="hint">{{ t('mapCoverage') }}</p>
                </details>
              </div>
            </template>
            <details :open="view === 'list'" class="list-wrapper">
              <summary>
                {{ t('listCount', { n: filteredZones.length }) }} · {{ metricLabel }}
              </summary>
              <p v-if="data.rentalDataAsOf" class="list-date">
                {{ date(data.rentalDataAsOf) }}
              </p>
              <p v-if="!filteredZones.length" role="status" class="notice">{{ t('empty') }}</p>
              <ul v-else class="zone-list">
                <li
                  v-for="zone in visibleZones"
                  :key="zone.id"
                  :class="{ 'is-current': selectedId === zone.id }"
                >
                  <button
                    type="button"
                    :data-zone-id="zone.id"
                    :aria-label="
                      t('viewZone', { name: `${zone.ref.neighborhood}, ${zone.ref.department}` })
                    "
                    :aria-pressed="selectedId === zone.id"
                    @click="selectDetail(zone.id)"
                  >
                    <span
                      ><strong>{{ zone.ref.neighborhood }}</strong
                      ><small>{{ zone.ref.department }}</small
                      ><small v-if="!zone.boundaryAvailable">{{ t('noMap') }}</small></span
                    >
                    <span class="row-value"
                      >{{ valueLabel(metric(zone))
                      }}<small v-if="layer === 'prices'">{{
                        t('sample', { n: zone.prices.rent.count })
                      }}</small></span
                    >
                  </button>
                  <VBtn
                    :icon="included(zone.ref) ? 'mdi-check-circle' : 'mdi-plus-circle-outline'"
                    :color="included(zone.ref) ? 'primary' : undefined"
                    variant="text"
                    :aria-label="`${t(included(zone.ref) ? 'remove' : 'add')}: ${zone.ref.neighborhood}`"
                    :aria-pressed="included(zone.ref)"
                    :disabled="!included(zone.ref) && !canAdd(zone.ref)"
                    @click="toggleZone(zone.ref, 'include')"
                  />
                </li>
              </ul>
              <VBtn
                v-if="visibleCount < filteredZones.length"
                variant="text"
                @click="visibleCount += 50"
                >{{ t('showMore') }}</VBtn
              >
            </details>
          </div>
          <ZoneDetail
            v-if="selectedZone"
            ref="detail"
            :zone="selectedZone"
            :layer="layer"
            :price-statistic="priceStatistic"
            :rental-date="data.rentalDataAsOf"
            :price-sources="data.sources"
            @close="closeDetail"
          >
            <div class="detail-actions">
              <VBtn
                :variant="included(selectedZone.ref) ? 'tonal' : 'flat'"
                color="primary"
                :disabled="!included(selectedZone.ref) && !canAdd(selectedZone.ref)"
                @click="toggleZone(selectedZone.ref, 'include')"
                >{{ t(included(selectedZone.ref) ? 'remove' : 'add') }}</VBtn
              >
              <VBtn
                v-if="!directory"
                variant="text"
                :disabled="!excluded(selectedZone.ref) && !canAdd(selectedZone.ref)"
                @click="toggleZone(selectedZone.ref, 'exclude')"
                >{{ t(excluded(selectedZone.ref) ? 'undoExclude' : 'exclude') }}</VBtn
              >
            </div>
          </ZoneDetail>
        </div>
      </template>
      <details v-if="selectionCount" class="selected-zones" open>
        <summary>{{ t('selected', { n: selectionCount }) }}</summary>
        <VRadioGroup
          v-if="!directory && draft.include.length"
          v-model="draft.mode"
          inline
          hide-details
        >
          <VRadio value="prefer" :label="t('prefer')" /><VRadio value="only" :label="t('only')" />
        </VRadioGroup>
        <p v-if="draft.include.length" class="hint">
          {{ t(draft.mode === 'only' || directory ? 'onlyHint' : 'preferHint') }}
        </p>
        <div v-for="kind in selectionKinds" :key="kind" class="selected-group">
          <p v-if="draft[kind].length" class="meta">
            {{ t(kind === 'include' ? 'included' : 'excluded') }}
          </p>
          <ul>
            <li v-for="zone in draft[kind]" :key="key(zone)">
              <span>{{ zone.neighborhood }} · {{ zone.department }}</span
              ><VBtn
                icon="mdi-close"
                variant="text"
                :aria-label="`${t('remove')}: ${zone.neighborhood}`"
                @click="toggleZone(zone, kind)"
              />
            </li>
          </ul>
        </div>
        <VBtn variant="text" @click="clearSelection">{{ t('reset') }}</VBtn>
      </details>
      <p v-if="selectionCount >= 20" class="notice" role="status">{{ t('selectionLimit') }}</p>
      <p v-if="mismatched" class="notice" role="alert">{{ t('mismatch') }}</p>
      <details class="comparison-methodology">
        <summary>{{ t('methodology') }}</summary>
        <p class="hint">{{ t('cohortHint') }}</p>
        <p v-if="directory" class="hint">{{ t('directoryHint') }}</p>
        <p class="hint">{{ t('publishedZones') }}</p>
        <template v-if="layer === 'crime'">
          <p class="hint">{{ t('crimeHint') }}</p>
          <p class="hint">{{ t('crimeCoverage') }}</p>
          <p v-for="period in crimePeriods" :key="period" class="meta">{{ period }}</p>
        </template>
        <p class="hint">{{ t('publicOnly') }}</p>
      </details>
    </div>
    <footer v-if="!standalone || selectionCount" class="explorer-footer">
      <VBtn variant="text" @click="emit('cancel')">{{ t('cancel') }}</VBtn>
      <VBtn color="primary" :disabled="mismatched" data-testid="rental-zones-apply" @click="apply">
        <span>{{ t('apply') }}</span>
        <span v-if="selectionCount"> ({{ selectionCount }})</span>
      </VBtn>
    </footer>
  </div>
</template>

<script setup lang="ts">
import type {
  RentalZone,
  RentalZonePreferences,
  RentalZoneRef,
  RentalZoneResponse,
  RentalZoneBoundaryCollection,
  RentalZonePropertyType,
  RentalZoneBedrooms,
  RentalZoneServiceCategory,
} from '~/utils/rentalZoneTypes'
import { rentalZoneMessages } from '~/utils/rentalZoneMessages'
import ZoneMap from './Map.client.vue'
import ZoneDetail from './Detail.vue'
const props = withDefaults(
  defineProps<{
    initial: RentalZonePreferences
    lockedDepartment?: string
    directory?: boolean
    standalone?: boolean
  }>(),
  { lockedDepartment: '', directory: false, standalone: false }
)
const emit = defineEmits<{ apply: [zones: RentalZonePreferences]; cancel: [] }>()
const { t, locale } = useI18n({ useScope: 'local', messages: rentalZoneMessages })
const draft = ref<RentalZonePreferences>({
  mode: props.initial.mode,
  include: props.initial.include.map(zone => ({ ...zone })),
  exclude: props.initial.exclude.map(zone => ({ ...zone })),
})
const department = ref(
  props.lockedDepartment || (props.directory ? draft.value.include[0]?.department || '' : '')
)
const propertyType = ref<RentalZonePropertyType>('apartamento')
const bedrooms = ref<RentalZoneBedrooms>('1')
const layer = ref<'prices' | 'services' | 'crime'>('prices')
const priceStatistic = ref<'median' | 'mean'>('median')
const sortOrder = ref<'name' | 'low' | 'high'>('low')
const filtersOpen = ref(false)
const filtersId = useId()
const filterPanel = ref<HTMLElement>()
async function toggleFilters() {
  filtersOpen.value = !filtersOpen.value
  if (filtersOpen.value) {
    await nextTick()
    filterPanel.value?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
  }
}
const view = ref<'list' | 'map'>('list')
const serviceCategory = ref<RentalZoneServiceCategory>('supermarket')
const search = ref('')
const selectedId = ref<string | null>(null)
const detail = ref<InstanceType<typeof ZoneDetail>>()
const visibleCount = ref(50)
const query = computed(() => ({
  department: department.value,
  propertyType: propertyType.value,
  bedrooms: bedrooms.value,
}))
const { data, status, error, refresh } = await useFetch<RentalZoneResponse>('/api/rentals/zones', {
  query,
  server: false,
  lazy: true,
  dedupe: 'cancel',
})
const field = { variant: 'outlined', density: 'comfortable', hideDetails: true } as const
const selectionKinds = ['include', 'exclude'] as const
const services: RentalZoneServiceCategory[] = [
  'supermarket',
  'grocery',
  'pharmacy',
  'healthcare',
  'transit',
  'education',
]
const serviceItems = computed(() => services.map(value => ({ value, title: t(value) })))
const layers = computed(() =>
  ['prices', 'services', 'crime'].map(value => ({ value, title: t(value) }))
)
const types = computed(() => ['apartamento', 'casa'].map(value => ({ value, title: t(value) })))
const priceStatistics = computed(() => [
  { value: 'median', title: t('statMedian') },
  { value: 'mean', title: t('statMean') },
])
const sortItems = computed(() => [
  { value: 'name', title: t('nameOrder') },
  { value: 'low', title: t('lowOrder') },
  { value: 'high', title: t('highOrder') },
])
const departments = computed(() => [
  { value: '', title: t('country') },
  ...Array.from(
    new Set([...(data.value?.departments || []), department.value].filter(Boolean))
  ).map(value => ({ value, title: value })),
])
const bedroomItems = computed(() => [
  { value: 'any', title: t('any') },
  { value: '0', title: t('studio') },
  ...['1', '2', '3'].map(value => ({ value, title: value })),
  { value: '4plus', title: t('fourPlus') },
])
const comparisonSummary = computed(() =>
  [
    propertyType.value === 'apartamento' ? t('apartmentShort') : t('casa'),
    t('bedroomsShort', {
      n: bedroomItems.value.find(item => item.value === bedrooms.value)?.title || bedrooms.value,
    }),
    t(priceStatistic.value === 'mean' ? 'statMean' : 'statMedian'),
    ...(sortOrder.value === 'name'
      ? []
      : [t(sortOrder.value === 'low' ? 'lowOrder' : 'highOrder')]),
  ].join(' · ')
)
const criteriaSummary = computed(() =>
  [
    department.value || t('country'),
    layer.value === 'prices' ? comparisonSummary.value : t(layer.value),
    ...(layer.value === 'services' ? [t(serviceCategory.value)] : []),
    ...(layer.value !== 'prices'
      ? [sortItems.value.find(item => item.value === sortOrder.value)!.title]
      : []),
  ].join(' · ')
)
const fold = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
const key = (zone: RentalZoneRef) => `${fold(zone.department)}:${fold(zone.neighborhood)}`
const included = (zone: RentalZoneRef) => draft.value.include.some(item => key(item) === key(zone))
const excluded = (zone: RentalZoneRef) => draft.value.exclude.some(item => key(item) === key(zone))
const selectionCount = computed(() => draft.value.include.length + draft.value.exclude.length)
const mismatched = computed(() =>
  Boolean(
    props.lockedDepartment &&
      [...draft.value.include, ...draft.value.exclude].some(
        zone => fold(zone.department) !== fold(props.lockedDepartment)
      )
  )
)
function canAdd(zone: RentalZoneRef) {
  if (selectionCount.value >= 20 && !included(zone) && !excluded(zone)) return false
  return (
    !props.directory ||
    !draft.value.include.length ||
    fold(draft.value.include[0]!.department) === fold(zone.department)
  )
}
function toggleZone(zone: RentalZoneRef, kind: 'include' | 'exclude') {
  const existing = draft.value[kind].findIndex(item => key(item) === key(zone))
  if (existing >= 0) {
    draft.value[kind].splice(existing, 1)
    return
  }
  if (!canAdd(zone)) return
  const other = kind === 'include' ? 'exclude' : 'include'
  draft.value[other] = draft.value[other].filter(item => key(item) !== key(zone))
  draft.value[kind].push({ ...zone })
  if (props.directory) draft.value.mode = 'only'
}
function clearSelection() {
  draft.value = { mode: 'prefer', include: [], exclude: [] }
}
function apply() {
  if (mismatched.value) return
  emit('apply', {
    ...draft.value,
    mode: draft.value.include.length ? (props.directory ? 'only' : draft.value.mode) : 'prefer',
    include: draft.value.include.map(zone => ({ ...zone })),
    exclude: draft.value.exclude.map(zone => ({ ...zone })),
  })
}
const filteredZones = computed(() => {
  const collator = new Intl.Collator(locale.value, { sensitivity: 'base' })
  return (data.value?.zones || [])
    .filter(
      zone =>
        !search.value ||
        fold(`${zone.ref.neighborhood} ${zone.ref.department}`).includes(fold(search.value))
    )
    .sort((a, b) => {
      const byName = collator.compare(a.ref.neighborhood, b.ref.neighborhood)
      if (sortOrder.value === 'name') return byName
      const left = metric(a),
        right = metric(b)
      if (left === null) return right === null ? byName : 1
      if (right === null) return -1
      return (sortOrder.value === 'low' ? left - right : right - left) || byName
    })
})
const visibleZones = computed(() => filteredZones.value.slice(0, visibleCount.value))
const selectedZone = computed(
  () => data.value?.zones.find(zone => zone.id === selectedId.value) || null
)
watch(search, () => {
  visibleCount.value = 50
})
watch(query, () => {
  visibleCount.value = 50
  selectedId.value = null
})
watch(data, result => {
  if (
    view.value === 'map' &&
    (!result?.boundaryUrl || !result.zones.some(zone => zone.boundaryAvailable))
  )
    view.value = 'list'
})
async function selectDetail(id: string) {
  if (!data.value?.zones.some(zone => zone.id === id)) return
  selectedId.value = id
  await nextTick()
  detail.value?.focus()
  if (window.innerWidth < 960)
    document
      .querySelector('[data-testid="rental-zone-detail"]')
      ?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
}
async function closeDetail() {
  const previous = selectedId.value
  selectedId.value = null
  if (!previous) return
  await nextTick()
  const origin = document.querySelector(`[data-zone-id="${CSS.escape(previous)}"]`)
  if (origin instanceof HTMLElement || origin instanceof SVGElement)
    origin.focus({ preventScroll: true })
}
const number = (value: number) =>
  new Intl.NumberFormat(locale.value, { maximumFractionDigits: 0 }).format(value)
const date = (value: string) =>
  Number.isFinite(Date.parse(value))
    ? new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeZone: 'UTC' }).format(
        new Date(value)
      )
    : t('noData')
function metric(zone: RentalZone): number | null {
  if (layer.value === 'prices') return zone.prices.rent[priceStatistic.value]
  if (layer.value === 'services')
    return zone.services?.status === 'unavailable'
      ? null
      : (zone.services?.counts[serviceCategory.value] ?? null)
  return zone.crime?.status !== 'unavailable' && zone.crime?.geography === 'neighborhood'
    ? zone.crime.total
    : null
}
const valueLabel = (value: number | null) =>
  value === null
    ? t(layer.value === 'prices' ? 'insufficient' : 'noData')
    : layer.value === 'prices'
      ? `$ ${number(value)}`
      : number(value)
const metricLabel = computed(() =>
  layer.value === 'prices'
    ? `${t(priceStatistic.value === 'mean' ? 'mean' : 'rent')} · UYU`
    : layer.value === 'services'
      ? t(serviceCategory.value)
      : t('crime')
)
const crimePeriods = computed(() =>
  Array.from(
    new Set(
      (data.value?.zones || [])
        .filter(zone => zone.crime && zone.crime.status !== 'unavailable')
        .map(zone =>
          t('period', {
            from: zone.crime?.periodFrom ? date(zone.crime.periodFrom) : t('noData'),
            to: zone.crime?.periodTo ? date(zone.crime.periodTo) : t('noData'),
          })
        )
    )
  )
)
const palette = ['#d6e6f5', '#a8cae8', '#75a9d7', '#3d80ba', '#15517e']
const values = computed(() =>
  (data.value?.zones || [])
    .filter(zone => zone.boundaryAvailable)
    .map(metric)
    .filter((value): value is number => value !== null && Number.isFinite(value))
)
const bins = computed(() => {
  if (!values.value.length) return []
  const min = Math.min(...values.value),
    max = Math.max(...values.value)
  if (min === max) return [{ from: min, to: max }]
  return palette.map((_, index) => ({
    from: Math.round(min + ((max - min) * index) / 5),
    to: Math.round(min + ((max - min) * (index + 1)) / 5),
  }))
})
function color(value: number | null) {
  if (value === null || !bins.value.length) return '#d4d9df'
  const index = bins.value.findIndex(bin => value <= bin.to)
  return palette[index < 0 ? palette.length - 1 : index]!
}
const mapColors = computed(() =>
  Object.fromEntries((data.value?.zones || []).map(zone => [zone.id, color(metric(zone))]))
)
const mapLabels = computed(() =>
  Object.fromEntries(
    (data.value?.zones || []).map(zone => [
      zone.id,
      `${zone.ref.neighborhood}: ${metricLabel.value}, ${valueLabel(metric(zone))}`,
    ])
  )
)
const boundaries = shallowRef<RentalZoneBoundaryCollection | null>(null)
const boundaryPending = ref(false)
const boundaryError = ref(false)
let boundaryRequest: AbortController | null = null
let boundaryUrl = ''
watch(
  () => [view.value, data.value?.boundaryUrl],
  async () => {
    const url = data.value?.boundaryUrl
    if (!url) {
      boundaryRequest?.abort()
      boundaries.value = null
      boundaryUrl = ''
      boundaryPending.value = false
      return
    }
    if (view.value !== 'map' || !url || boundaryUrl === url) return
    boundaryRequest?.abort()
    const current = new AbortController()
    boundaryRequest = current
    boundaryPending.value = true
    boundaryError.value = false
    try {
      const result = await $fetch<RentalZoneBoundaryCollection>(url, {
        signal: current.signal,
        retry: 0,
        timeout: 15000,
      })
      if (boundaryRequest !== current) return
      boundaries.value = result
      boundaryUrl = url
    } catch {
      if (!current.signal.aborted) boundaryError.value = true
    } finally {
      if (boundaryRequest === current) boundaryPending.value = false
    }
  }
)
onBeforeUnmount(() => boundaryRequest?.abort())
</script>

<style scoped>
.zone-explorer {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}
.explorer-scroll {
  min-height: 0;
  overflow-y: auto;
  padding: 20px;
  overscroll-behavior: contain;
}
:where(.zone-explorer) :where(p, ul) {
  margin: 0;
}
.zone-controls {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.zone-toolbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  margin-block: 8px;
  background: rgb(var(--v-theme-surface));
}
.zone-filter-toggle,
.criteria-summary,
.close-filters {
  display: none;
}
.view-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}
.view-buttons .v-btn {
  min-height: 44px;
  flex: 1;
}
.cohort-controls {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}
.cohort-controls p {
  grid-column: 1/-1;
}
.service-filter {
  margin-top: 16px;
  max-width: 400px;
}
.context-order {
  margin-top: 12px;
  max-width: 400px;
}
.zone-explorer .hint {
  margin-top: 12px;
  font-size: 0.8rem;
  line-height: 1.5;
}
.zone-explorer .meta {
  margin-top: 12px;
  color: rgba(var(--v-theme-on-surface), 0.76);
  font-size: 0.8rem;
}
.notice {
  padding-block: 20px;
}
.zone-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 20px;
  margin-top: 12px;
  align-items: start;
}
.zone-layout.has-detail {
  grid-template-columns: minmax(0, 1fr) minmax(260px, 0.72fr);
}
.zone-layout > * {
  min-width: 0;
}
.zone-browser > .hint {
  margin-bottom: 12px;
}
.zone-list {
  list-style: none;
  padding: 0;
  max-height: 420px;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.zone-list > li {
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.zone-list > li.is-current {
  background: rgba(var(--v-theme-primary), 0.08);
}
.zone-list button:not(.v-btn) {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
  flex: 1;
  text-align: left;
  padding: 12px 8px;
  min-height: 64px;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.zone-list button > span {
  min-width: 0;
}
.zone-list strong {
  display: block;
  font-weight: 600;
}
.zone-list small {
  display: block;
  font-size: 0.8rem;
  line-height: 1.4;
  margin-top: 4px;
  color: rgba(var(--v-theme-on-surface), 0.76);
}
.row-value {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.zone-list .v-btn {
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
}
summary {
  min-height: 44px;
  display: flex;
  align-items: center;
  cursor: pointer;
  font-weight: 600;
}
summary::before {
  content: '▸';
  margin-right: 8px;
}
details[open] > summary::before {
  content: '▾';
}
.map-caption,
.list-date {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.76);
}
.zone-explorer .map-caption {
  margin-block: 0 8px;
}
.zone-explorer .list-date {
  margin-block: -4px 8px;
}
.comparison-methodology {
  margin-top: 16px;
  font-size: 0.8rem;
}
.map-methodology summary {
  font-weight: 400;
}
.legend {
  margin-block: 12px;
  font-size: 0.8rem;
}
.legend ul {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding: 8px 0 0;
  list-style: none;
}
.legend li {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.legend i {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.no-data-swatch {
  background: #d4d9df;
}
.selected-zones {
  margin-top: 24px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.selected-group ul {
  list-style: none;
  padding: 0;
}
.selected-group li {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
}
.selected-group li > span {
  flex: 1;
  min-width: 0;
}
.detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}
.detail-actions .v-btn {
  min-height: 44px;
}
.explorer-footer {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 8px;
  padding: 12px 20px max(12px, env(safe-area-inset-bottom));
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-surface));
}
.explorer-footer .v-btn {
  min-height: 44px;
  padding-inline: 8px;
  letter-spacing: normal;
  white-space: nowrap;
}
.zone-explorer :deep(input) {
  font-size: 16px;
}
@media (max-width: 959px) {
  .zone-layout.has-detail {
    grid-template-columns: minmax(0, 1fr);
  }
  .explorer-scroll {
    padding: 16px;
  }
}
@media (max-width: 599px) {
  .zone-controls {
    grid-template-columns: minmax(0, 1fr);
  }
  .cohort-controls {
    gap: 8px;
  }
  .zone-options:not(.is-expanded) {
    display: none;
  }
  .zone-options {
    padding-block: 8px;
  }
  .zone-toolbar {
    position: sticky;
    top: 0;
    z-index: 5;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
    gap: 0;
    margin-block: 4px;
    border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }
  .zone-toolbar .v-btn {
    min-width: 0;
    padding-inline: 8px;
    min-height: 44px;
    letter-spacing: normal;
    font-size: 0.75rem;
  }
  .zone-filter-toggle,
  .close-filters {
    display: inline-flex;
  }
  .close-filters {
    min-height: 44px;
    margin-top: 8px;
  }
  .view-buttons {
    gap: 0;
  }
  .criteria-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
    min-height: 44px;
    margin-top: 0;
    padding: 8px 0;
    border: 0;
    background: transparent;
    color: rgb(var(--v-theme-link));
    text-align: left;
    cursor: pointer;
    font: inherit;
    font-size: 0.8rem;
  }
  .explorer-footer {
    padding-inline: 12px;
  }
  .row-value {
    max-width: 112px;
  }
}
</style>
