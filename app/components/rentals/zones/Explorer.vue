<template>
  <div
    ref="root"
    class="zone-explorer"
    :class="{ 'is-standalone': standalone }"
    data-testid="rental-zone-explorer"
  >
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
        <VSelect
          v-if="layer === 'claims'"
          v-model="claimCategory"
          :items="claimItems"
          :label="t('claimCategory')"
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
      <p v-else-if="layer === 'power'" class="hint">{{ t('powerShort') }}</p>
      <p v-else-if="layer === 'water'" class="hint">{{ t('waterShort') }}</p>
      <p v-else-if="layer === 'claims'" class="hint">{{ t('claimsShort') }}</p>
      <p
        v-if="layer === 'power' && data?.utilities?.power?.status === 'preliminary'"
        class="notice collecting"
        role="status"
      >
        {{
          t('powerPreliminary', {
            date: date(data.utilities.power.observedFrom || ''),
            days: number(Math.floor(data.utilities.power.observedDays)),
          })
        }}
      </p>
      <p
        v-if="layer === 'power' && data?.utilities?.power?.status === 'collecting'"
        class="notice collecting"
        role="status"
      >
        {{
          t('powerCollecting', {
            date: date(data.utilities.power.observedFrom || ''),
            days: number(Math.floor(data.utilities.power.observedDays)),
          })
        }}
      </p>
      <p v-if="status === 'pending' || status === 'idle'" class="notice" role="status">
        {{ t('loading') }}
      </p>
      <div v-else-if="error || !data || data.status === 'unavailable'" class="notice" role="status">
        <p>{{ t('unavailable') }}</p>
        <VBtn variant="text" @click="refresh()">{{ t('retry') }}</VBtn>
      </div>
      <template v-else>
        <p v-if="data.status === 'stale'" class="notice" role="status">{{ t('stale') }}</p>
        <div class="zone-layout" :class="{ 'has-detail': selectedZone && !inlineDetail }">
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
                      legendLabel(bin.from)
                    }}<span v-if="bin.to !== bin.from"> – {{ legendLabel(bin.to) }}</span>
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
                  <!-- On a phone the panel opens under its own row: after the list it
                       would land up to 50 rows away from the tap. -->
                  <ZoneDetail
                    v-if="inlineDetail && selectedId === zone.id"
                    v-bind="detailProps(zone)"
                    @toggle="kind => toggleZone(zone.ref, kind)"
                    @close="closeDetail"
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
            v-if="selectedZone && !inlineDetail"
            v-bind="detailProps(selectedZone)"
            @toggle="kind => toggleZone(selectedZone!.ref, kind)"
            @close="closeDetail"
          />
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
  RentalClaimCategory,
} from '~/utils/rentalZoneTypes'
import { useDisplay } from 'vuetify'
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
const layer = ref<'prices' | 'services' | 'crime' | 'power' | 'water' | 'claims'>('prices')
const claimCategory = ref<RentalClaimCategory>('alumbrado')
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
const root = ref<HTMLElement>()
// Below `md` the panel stacks instead of sitting beside the list, so in the list view it opens
// under the tapped row. On the map it still follows the map.
const { mdAndUp } = useDisplay()
const inlineDetail = computed(() => view.value === 'list' && !mdAndUp.value)
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
  ['prices', 'power', 'water', 'claims', 'services', 'crime'].map(value => ({
    value,
    title: t(value),
  }))
)
const claimItems = computed(() =>
  (['alumbrado', 'saneamiento', 'limpieza', 'calles'] as const).map(value => ({
    value,
    title: t(`claim_${value}`),
  }))
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
    ...(layer.value === 'claims' ? [t(`claim_${claimCategory.value}`)] : []),
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
const detailProps = (zone: RentalZone) => ({
  zone,
  layer: layer.value,
  priceStatistic: priceStatistic.value,
  rentalDate: data.value?.rentalDataAsOf ?? null,
  priceSources: data.value?.sources ?? [],
  meta: data.value?.utilities,
  choice: {
    included: included(zone.ref),
    excluded: excluded(zone.ref),
    canAdd: canAdd(zone.ref),
    canExclude: !props.directory,
  },
})
async function selectDetail(id: string) {
  if (!data.value?.zones.some(zone => zone.id === id)) return
  selectedId.value = id
  await nextTick()
  const panel = root.value?.querySelector<HTMLElement>('[data-testid="rental-zone-detail"]')
  panel?.focus({ preventScroll: true })
  // Inline, bring the row and its panel into view together so the tapped name stays on screen.
  if (!mdAndUp.value)
    (inlineDetail.value ? panel?.closest('li') : panel)?.scrollIntoView({
      block: 'nearest',
      behavior: 'instant',
    })
}
async function closeDetail() {
  const previous = selectedId.value
  const wasInline = inlineDetail.value
  selectedId.value = null
  if (!previous) return
  await nextTick()
  const origin = root.value?.querySelector(`[data-zone-id="${CSS.escape(previous)}"]`)
  if (origin instanceof HTMLElement || origin instanceof SVGElement) {
    origin.focus({ preventScroll: true })
    // A long panel collapses from under the reader: put its row back in view.
    if (wasInline) origin.scrollIntoView({ block: 'nearest', behavior: 'instant' })
  }
}
const number = (value: number) =>
  new Intl.NumberFormat(locale.value, { maximumFractionDigits: 0 }).format(value)
const date = (value: string) =>
  Number.isFinite(Date.parse(value))
    ? new Intl.DateTimeFormat(dateLocale(locale.value), {
        dateStyle: 'medium',
        timeZone: 'UTC',
      }).format(new Date(value))
    : t('noData')
function metric(zone: RentalZone): number | null {
  if (layer.value === 'prices') return zone.prices.rent[priceStatistic.value]
  // Rankings and the map only use figures of the zone itself, never a department fallback.
  if (layer.value === 'power')
    return zone.utilities?.power?.geography === 'zone'
      ? zone.utilities.power.unplannedMinutes
      : null
  if (layer.value === 'water')
    return zone.utilities?.water?.geography === 'zone' ? zone.utilities.water.notices : null
  if (layer.value === 'claims')
    return zone.utilities?.claims?.perThousand?.[claimCategory.value] ?? null
  if (layer.value === 'services')
    return zone.services?.status === 'unavailable'
      ? null
      : (zone.services?.counts[serviceCategory.value] ?? null)
  return zone.crime?.status !== 'unavailable' && zone.crime?.geography === 'neighborhood'
    ? zone.crime.total
    : null
}
const decimal = (value: number) =>
  new Intl.NumberFormat(locale.value, { maximumFractionDigits: 1 }).format(value)
const valueLabel = (value: number | null) =>
  value === null
    ? t(layer.value === 'prices' ? 'insufficient' : 'noData')
    : layer.value === 'prices'
      ? `$ ${number(value)}`
      : layer.value === 'power'
        ? t('powerMinutes', { n: decimal(value) })
        : layer.value === 'claims'
          ? decimal(value)
          : number(value)
/** Legend steps: the unit is already in the legend title. */
const legendLabel = (value: number) =>
  layer.value === 'prices'
    ? `$ ${number(value)}`
    : layer.value === 'power' || layer.value === 'claims'
      ? decimal(value)
      : number(value)
const metricLabel = computed(() =>
  layer.value === 'prices'
    ? `${t(priceStatistic.value === 'mean' ? 'mean' : 'rent')} · UYU`
    : layer.value === 'services'
      ? t(serviceCategory.value)
      : layer.value === 'power'
        ? t('powerStat')
        : layer.value === 'water'
          ? t('waterStat')
          : layer.value === 'claims'
            ? `${t(`claim_${claimCategory.value}`)} · ${t('claimsStat')}`
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
  // Small ranges (minutes per month, complaints per 1,000) keep one decimal instead of collapsing.
  const step = max - min < 50 ? 10 : 1
  return palette.map((_, index) => ({
    from: Math.round((min + ((max - min) * index) / 5) * step) / step,
    to: Math.round((min + ((max - min) * (index + 1)) / 5) * step) / step,
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
  --zone-gutter: 20px;
  /* Where the sticky toolbar pins: the dialog's own scroller, or under the app bar on the page. */
  --zone-pin: 0px;
  --zone-bar: 0px;
  --zone-offset: calc(var(--zone-pin) + var(--zone-bar) + 8px);
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}
.zone-explorer.is-standalone {
  --zone-pin: var(--v-layout-top, 0px);
}
/* No top padding: a sticky child pins to the scroller's content edge, so a padded top left a
   strip above the toolbar where the list showed through. The search field carries the offset. */
.explorer-scroll {
  min-height: 0;
  overflow-y: auto;
  padding: 0 var(--zone-gutter) var(--zone-gutter);
  scroll-padding-top: var(--zone-offset);
  overscroll-behavior: contain;
}
.zone-search {
  margin-top: var(--zone-gutter);
}
/* On its own page the explorer scrolls with the document (the container already pads it). */
.is-standalone .explorer-scroll {
  overflow: visible;
  padding: 0;
}
.is-standalone .zone-search {
  margin-top: 0;
}
.is-standalone :is(.zone-list > li, .zone-options) {
  scroll-margin-top: var(--zone-offset);
}
/* On the page the toolbar sits on the canvas, inside the container's own padding. */
.is-standalone .zone-toolbar {
  background: rgb(var(--v-theme-background));
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
/* The figure keeps its width and the name wraps: a long left column ("Sin mapa oficial
   disponible") used to squeeze "12 avisos comparables" onto two lines. */
.row-value {
  flex: 0 0 auto;
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
  .zone-explorer {
    --zone-gutter: 16px;
    --zone-bar: 48px;
  }
  .zone-layout.has-detail {
    grid-template-columns: minmax(0, 1fr);
  }
  /* Full-bleed with a hairline so rows visibly slide under it instead of being cut off. */
  .zone-toolbar {
    position: sticky;
    top: var(--zone-pin);
    z-index: 5;
    margin-inline: calc(-1 * var(--zone-gutter));
    padding: 4px var(--zone-gutter);
    border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }
  .is-standalone .zone-toolbar {
    margin-inline: 0;
    padding-inline: 0;
  }
  /* One scroller: a list with its own 420px scroll box inside the dialog's trapped the thumb
     at its end (overscroll-behavior: contain) and cut the last row in half. */
  .zone-list {
    max-height: none;
    overflow: visible;
  }
  .zone-list > li {
    flex-wrap: wrap;
  }
  .zone-list > li > .zone-detail {
    flex: 1 0 100%;
    margin: 0 8px 12px;
  }
}
/* Phones, and phones on their side: the toolbar becomes a full-bleed tab bar and the
   comparison criteria fold behind it. */
@media (max-width: 599px), (max-width: 959px) and (max-height: 559px) {
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
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
    gap: 0;
    margin-block: 8px 0;
    padding: 0;
  }
  .zone-toolbar .v-btn {
    min-width: 0;
    height: var(--zone-bar);
    min-height: var(--zone-bar);
    padding-inline: 8px;
    border-radius: 0;
    letter-spacing: normal;
    font-size: 0.75rem;
    color: rgba(var(--v-theme-on-surface), 0.76);
  }
  /* The current view reads as a tab: link ink and an underline, not a grey block. */
  .zone-toolbar .v-btn[aria-pressed='true'] {
    color: rgb(var(--v-theme-link));
    box-shadow: inset 0 -2px 0 rgb(var(--v-theme-primary));
  }
  .zone-toolbar .v-btn[aria-pressed='true'] :deep(.v-btn__underlay) {
    opacity: 0;
  }
  .zone-toolbar .zone-filter-toggle[aria-expanded='true'] {
    color: rgb(var(--v-theme-link));
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
    position: relative;
    gap: 0;
  }
  .view-buttons::before {
    content: '';
    position: absolute;
    inset-block: 12px;
    inset-inline-start: 0;
    border-inline-start: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
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
  /* Wide enough for "12 avisos comparables" on one line from 390px, so a row is two lines
     tall instead of four. */
  .row-value {
    max-width: min(9.5rem, 38vw);
  }
}
</style>
