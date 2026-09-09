<template>
  <section
    ref="rootElement"
    class="analysis-map"
    aria-labelledby="analysis-map-title"
    data-testid="rental-analysis-map"
  >
    <header class="analysis-map__header">
      <h2 id="analysis-map-title">{{ t('title') }}</h2>
      <p>{{ t('intro') }}</p>
    </header>
    <div v-if="!inMontevideo" class="analysis-map__notice">
      <p>{{ t('outside') }}</p>
      <VBtn variant="outlined" @click="emit('montevideo')">{{ t('montevideo') }}</VBtn>
    </div>
    <template v-else>
      <div class="analysis-map__layers" role="group" :aria-label="t('layer')">
        <button
          v-for="item in layers"
          :key="item.value"
          type="button"
          :aria-pressed="selection.layer === item.value"
          @click="selection.layer = item.value"
        >
          <VIcon :icon="item.icon" size="20" aria-hidden="true" />
          <span>{{ t(item.label) }}</span>
        </button>
      </div>
      <div class="analysis-map__controls">
        <label v-if="selection.layer === 'prices'">
          {{ t('priceStatistic') }}
          <select v-model="selection.statistic" name="analysis-map-statistic">
            <option value="mean">{{ t('meanChoice') }}</option>
            <option value="median">{{ t('medianChoice') }}</option>
          </select>
        </label>
        <label v-else-if="selection.layer === 'services'">
          {{ t('services') }}
          <select v-model="selection.service" name="analysis-map-service">
            <option v-for="category in serviceCategories" :key="category" :value="category">
              {{ t(category) }}
            </option>
          </select>
        </label>
        <label v-else>
          {{ t('offense') }}
          <select v-model="selection.offense" name="analysis-map-offense">
            <option v-for="offense in offenses" :key="offense.value" :value="offense.value">
              {{ t(offense.label) }}
            </option>
          </select>
        </label>
        <p v-if="selection.layer === 'prices'" class="analysis-map__scope">{{ cohortLabel }}</p>
        <p v-else-if="selection.layer === 'crime'" class="analysis-map__scope">
          {{ t('crimeShort') }}
        </p>
        <p v-else class="analysis-map__scope">{{ t('servicesShort') }}</p>
      </div>

      <div v-if="selection.layer === 'prices'" class="analysis-map__layer-note">
        <p>{{ t('priceMapScope') }}</p>
        <p v-if="loading" role="status">{{ t('priceLoading') }}</p>
        <p v-else-if="!pricesReady" role="status">{{ t('priceUnavailable') }}</p>
        <p v-else-if="analysis?.generatedAt" class="analysis-map__meta">
          {{ t('updated', { date: date(analysis.generatedAt) }) }}
        </p>
      </div>
      <div v-else-if="contextPending" class="analysis-map__notice" role="status">
        {{ t('contextLoading') }}
      </div>
      <div v-else-if="contextError" class="analysis-map__notice" role="status">
        <p>{{ t('contextError') }}</p>
        <VBtn variant="text" @click="loadContext(true)">{{ t('retryContext') }}</VBtn>
      </div>
      <p v-else-if="selection.layer === 'crime' && crimePeriods.length" class="analysis-map__meta">
        {{ crimePeriods.join(' · ') }}
      </p>
      <p
        v-else-if="selection.layer === 'services' && serviceDates.length"
        class="analysis-map__meta"
      >
        {{ t('dataDate', { date: serviceDates.join(' · ') }) }}
      </p>
      <p v-if="selection.layer !== 'prices'" class="analysis-map__meta">{{ t('contextScope') }}</p>

      <div
        v-if="boundaryPending"
        class="analysis-map__loading"
        role="status"
        :aria-label="t('mapLoading')"
      >
        <p>{{ t('mapLoading') }}</p>
      </div>
      <div v-else-if="boundaryError || !boundaries" class="analysis-map__notice" role="status">
        <p>{{ t('mapError') }}</p>
        <VBtn variant="outlined" @click="loadBoundaries(true)">{{ t('retryMap') }}</VBtn>
      </div>
      <template v-else>
        <p v-if="unmatchedNeighborhood" class="analysis-map__notice" role="status">
          {{ t('unmatchedNeighborhood', { name: query.neighborhood }) }}
        </p>
        <div class="analysis-map__layout" :class="{ 'has-detail': selectedRow }">
          <div class="analysis-map__canvas">
            <ClientOnly>
              <AnalysisZoneMap
                v-if="!rendererError"
                :key="mapRevision"
                :boundaries="boundaries"
                :colors="colors"
                :labels="labels"
                :selected-id="selectedId"
                @select="selectRow"
                @failed="rendererError = true"
              />
              <template #fallback
                ><div class="analysis-map__loading" role="status">
                  {{ t('mapLoading') }}
                </div></template
              >
            </ClientOnly>
            <div v-if="rendererError" class="analysis-map__notice" role="status">
              <p>{{ t('mapUnavailable') }}</p>
              <VBtn variant="outlined" @click="retryRenderer">{{ t('retryMap') }}</VBtn>
            </div>
            <div class="analysis-map__legend" :aria-label="t('legend')">
              <strong>{{ metricLabel }}</strong>
              <div v-if="scale.count" class="analysis-map__scale">
                <div class="analysis-map__swatches" aria-hidden="true">
                  <span
                    v-for="color in scale.min === scale.max
                      ? [RENTAL_ANALYSIS_MAP_PALETTE[2]]
                      : RENTAL_ANALYSIS_MAP_PALETTE"
                    :key="color"
                    :style="{ background: color }"
                  />
                </div>
                <div class="analysis-map__limits">
                  <span>{{ valueLabel(scale.min) }}</span
                  ><span v-if="scale.max !== scale.min">{{ valueLabel(scale.max) }}</span>
                </div>
              </div>
              <p>{{ t('scaleCount', { n: scale.count, total: rows.length }) }}</p>
              <p class="analysis-map__no-data">
                <span
                  :style="{ background: RENTAL_ANALYSIS_MAP_NO_DATA_COLOR }"
                  aria-hidden="true"
                />{{ t(selection.layer === 'prices' ? 'noPriceMetric' : 'noMetric') }}
              </p>
              <p v-if="selection.layer === 'prices'">{{ t('priceMinimum') }}</p>
            </div>
          </div>
          <aside
            v-if="selectedRow"
            ref="detailElement"
            tabindex="-1"
            class="analysis-map__detail"
            :aria-label="selectedRow.name"
            data-testid="analysis-map-detail"
          >
            <div class="analysis-map__detail-heading">
              <h3>{{ selectedRow.name }}</h3>
              <button
                type="button"
                class="analysis-map__close"
                :aria-label="t('closeDetail')"
                @click="closeDetail"
              >
                <VIcon icon="mdi-close" size="22" aria-hidden="true" />
              </button>
            </div>
            <p class="analysis-map__meta">{{ selectedRow.department }}</p>
            <p class="analysis-map__metric-label">{{ metricLabel }}</p>
            <strong class="analysis-map__value">{{ valueLabel(metric(selectedRow)) }}</strong>
            <template v-if="selection.layer === 'prices'">
              <p>{{ t('priceSample', { n: selectedRow.rental?.count ?? 0 }) }}</p>
              <p class="analysis-map__meta">{{ t('rentPeriod', { currency: query.currency }) }}</p>
              <dl
                v-if="metric(selectedRow) !== null && selectedRow.rental"
                class="analysis-map__facts"
              >
                <div>
                  <dt>{{ t(selection.statistic === 'mean' ? 'medianChoice' : 'meanChoice') }}</dt>
                  <dd>
                    {{
                      money(selectedRow.rental[selection.statistic === 'mean' ? 'median' : 'mean'])
                    }}
                  </dd>
                </div>
                <div>
                  <dt>{{ t('range') }}</dt>
                  <dd>{{ money(selectedRow.rental.p25) }} – {{ money(selectedRow.rental.p75) }}</dd>
                </div>
              </dl>
            </template>
            <template v-else-if="selection.layer === 'services'">
              <p v-if="metric(selectedRow) === null">{{ t('noServices') }}</p>
              <p v-if="selectedRow.services?.status === 'stale'" class="analysis-map__notice">
                {{ t('stale') }}
              </p>
              <p v-if="selectedRow.services?.source.dataAsOf" class="analysis-map__meta">
                {{ t('dataDate', { date: date(selectedRow.services.source.dataAsOf) }) }}
              </p>
            </template>
            <template v-else>
              <p v-if="selectedRow.crime?.status === 'stale'" class="analysis-map__notice">
                {{ t('stale') }}
              </p>
              <p v-if="selectedRow.crime" class="analysis-map__meta">
                {{ period(selectedRow.crime) }}
              </p>
              <p>{{ t('crimeHint') }}</p>
            </template>
            <p v-if="selectedSource" class="analysis-map__source">
              <a
                :href="selectedSource.url"
                :aria-label="selectedSource.name"
                target="_blank"
                rel="noopener noreferrer"
                ><span>{{ selectedSource.name }} ↗</span></a
              >
            </p>
            <button
              type="button"
              class="analysis-map__link"
              @click="emit('explore', selectedRow.rental?.name ?? selectedRow.name)"
            >
              {{ t('exploreAnalysis') }}
            </button>
          </aside>
        </div>
        <p v-if="!selectedRow" class="analysis-map__choose">{{ t('chooseDetail') }}</p>

        <details class="analysis-map__list">
          <summary>{{ t('listValues', { n: rows.length }) }}</summary>
          <table class="cu-mobile-cards analysis-map__table">
            <caption class="analysis-map__sr-only">
              {{
                metricLabel
              }}
            </caption>
            <thead>
              <tr>
                <th scope="col">{{ t('neighborhood') }}</th>
                <th scope="col">{{ t('metric') }}</th>
                <th scope="col">{{ t('reading') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in sortedRows" :key="row.id">
                <td :data-label="t('neighborhood')">
                  <button
                    type="button"
                    class="analysis-map__link"
                    :data-map-row="row.id"
                    :aria-pressed="selectedId === row.id"
                    @click="selectRow(row.id, $event.currentTarget as HTMLElement)"
                  >
                    {{ row.name }}
                  </button>
                </td>
                <td :data-label="t('metric')">{{ valueLabel(metric(row)) }}</td>
                <td :data-label="t('reading')" class="cu-cell-prose">
                  <template v-if="selection.layer === 'prices'">{{
                    t('priceSample', { n: row.rental?.count ?? 0 })
                  }}</template>
                  <template v-else-if="selection.layer === 'services'"
                    >{{ date(row.services?.source.dataAsOf)
                    }}<small v-if="row.services?.status === 'stale'">{{
                      t('stale')
                    }}</small></template
                  >
                  <template v-else
                    >{{ row.crime ? period(row.crime) : t('noData')
                    }}<small v-if="row.crime?.status === 'stale'">{{ t('stale') }}</small></template
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </details>
        <details class="analysis-map__method">
          <summary>{{ t('mapMethodology') }}</summary>
          <p>{{ t('scaleHint') }}</p>
          <p>{{ t('geometryHint') }}</p>
          <template v-if="selection.layer === 'prices'"
            ><p>{{ t('priceScope') }}</p>
            <p>{{ t('meanExplanation') }}</p>
            <p>{{ t('priceMinimum') }}</p></template
          >
          <template v-else-if="selection.layer === 'crime'"
            ><p>{{ t('crimeHint') }}</p>
            <p>{{ t('crimeCoverage') }}</p></template
          >
          <template v-else
            ><p>{{ t('servicesHint') }}</p>
            <p>{{ t('nearbyHint') }}</p></template
          >
          <p>
            <a
              :href="boundaries.source.url"
              :aria-label="boundaries.source.name"
              target="_blank"
              rel="noopener noreferrer"
              ><span>{{ boundaries.source.name }} ↗</span></a
            >
          </p>
        </details>
      </template>
    </template>
    <NuxtLink
      :to="localePath('/barrios-alquileres-uruguay')"
      :aria-label="t('fullExplorer')"
      class="analysis-map__full-link"
      ><span>{{ t('fullExplorer') }} ↗</span></NuxtLink
    >
  </section>
</template>

<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  shallowRef,
  watch,
} from 'vue'
import type { RentalAnalysisQuery, RentalAnalysisResponse } from '~/utils/rentalAnalysis'
import type {
  RentalZoneBoundaryCollection,
  RentalZoneCrime,
  RentalZoneResponse,
  RentalZoneServiceCategory,
} from '~/utils/rentalZoneTypes'
import {
  rentalAnalysisMapColor,
  rentalAnalysisMapMatches,
  rentalAnalysisMapMetric,
  rentalAnalysisMapRows,
  rentalAnalysisMapScale,
  RENTAL_ANALYSIS_MAP_NO_DATA_COLOR,
  RENTAL_ANALYSIS_MAP_PALETTE,
  type RentalAnalysisMapLayer,
  type RentalAnalysisMapRow,
  type RentalAnalysisMapSelection,
} from '~/utils/rentalAnalysisMap'
import { rentalAnalysisLocationName } from '~/utils/rentalAnalysisComparison'
import { rentalAnalysisMapMessages } from '~/utils/rentalAnalysisMapMessages'

const props = withDefaults(
  defineProps<{
    analysis: RentalAnalysisResponse | null
    query: RentalAnalysisQuery
    loading?: boolean
  }>(),
  { loading: false }
)
const emit = defineEmits<{ explore: [neighborhood: string]; montevideo: [] }>()
const { t, locale } = useI18n({ useScope: 'local', messages: rentalAnalysisMapMessages })
const localePath = useLocalePath()
const AnalysisZoneMap = defineAsyncComponent(() => import('./zones/Map.client.vue'))
const inMontevideo = computed(
  () => rentalAnalysisLocationName(props.query.department) === 'montevideo'
)
const selection = reactive<RentalAnalysisMapSelection>({
  layer: 'prices',
  statistic: 'mean',
  service: 'supermarket',
  offense: 'all',
})
const layers: Array<{ value: RentalAnalysisMapLayer; label: string; icon: string }> = [
  { value: 'prices', label: 'rentalLayer', icon: 'mdi-home-city-outline' },
  { value: 'crime', label: 'crimeLayer', icon: 'mdi-chart-box-outline' },
  { value: 'services', label: 'serviceLayer', icon: 'mdi-map-marker-outline' },
]
const serviceCategories: RentalZoneServiceCategory[] = [
  'supermarket',
  'grocery',
  'pharmacy',
  'healthcare',
  'transit',
  'education',
]
const offenses = [
  { value: 'all', label: 'allOffenses' },
  { value: 'hurto', label: 'theft' },
  { value: 'rapina', label: 'robbery' },
  { value: 'lesiones', label: 'injuries' },
  { value: 'violencia-domestica', label: 'domesticViolence' },
  { value: 'abigeato', label: 'livestockTheft' },
]
const boundaries = shallowRef<RentalZoneBoundaryCollection | null>(null)
const boundaryPending = ref(false)
const boundaryError = ref(false)
const contextData = shallowRef<RentalZoneResponse | null>(null)
const contextPending = ref(false)
const contextError = ref(false)
const selectedId = ref<string | null>(null)
const rootElement = ref<HTMLElement>()
const detailElement = ref<HTMLElement>()
const rendererError = ref(false)
const mapRevision = ref(0)
let boundaryController: AbortController | null = null
let contextController: AbortController | null = null
let selectionTrigger: HTMLElement | SVGElement | null = null
const pricesReady = computed(
  () => !props.loading && rentalAnalysisMapMatches(props.analysis, props.query)
)
const rows = computed(() =>
  rentalAnalysisMapRows(
    boundaries.value,
    pricesReady.value ? props.analysis : null,
    props.query,
    contextData.value
  )
)
const sortedRows = computed(() =>
  [...rows.value].sort((a, b) => a.name.localeCompare(b.name, locale.value))
)
const metric = (row: RentalAnalysisMapRow) => rentalAnalysisMapMetric(row, selection)
const scale = computed(() => rentalAnalysisMapScale(rows.value.map(metric)))
const colors = computed(() =>
  Object.fromEntries(
    rows.value.map(row => [row.id, rentalAnalysisMapColor(metric(row), scale.value)])
  )
)
const labels = computed(() =>
  Object.fromEntries(
    rows.value.map(row => [row.id, `${row.name}: ${metricLabel.value}, ${valueLabel(metric(row))}`])
  )
)
const selectedRow = computed(() => rows.value.find(row => row.id === selectedId.value) ?? null)
const unmatchedNeighborhood = computed(() =>
  Boolean(
    props.query.neighborhood &&
      boundaries.value &&
      !rows.value.some(
        row =>
          rentalAnalysisLocationName(row.name) ===
          rentalAnalysisLocationName(props.query.neighborhood)
      )
  )
)
const selectedSource = computed(() =>
  selection.layer === 'services'
    ? selectedRow.value?.services?.source
    : selection.layer === 'crime'
      ? selectedRow.value?.crime?.source
      : null
)
const metricLabel = computed(() =>
  selection.layer === 'prices'
    ? `${t(selection.statistic === 'mean' ? 'mean' : 'rent')} · ${props.query.currency}`
    : selection.layer === 'services'
      ? t(selection.service)
      : `${t('crimeLayer')} · ${t(offenses.find(item => item.value === selection.offense)!.label)}`
)
const cohortLabel = computed(() =>
  t('mapCohort', {
    type: t(props.query.type === 'all' ? 'allTypes' : props.query.type),
    bedrooms:
      props.query.bedrooms === null
        ? t('allBedrooms')
        : props.query.bedrooms === 0
          ? t('studio')
          : t('bedroomCount', { n: props.query.bedrooms }),
    currency: props.query.currency,
  })
)
const numberLocale = computed(() =>
  locale.value === 'en' ? 'en-US' : locale.value === 'pt' ? 'pt-BR' : 'es-UY'
)
const formatters = computed(() => ({
  number: new Intl.NumberFormat(numberLocale.value, { maximumFractionDigits: 0 }),
  money: new Intl.NumberFormat(numberLocale.value, {
    style: 'currency',
    currency: props.query.currency,
    maximumFractionDigits: 0,
  }),
  date: new Intl.DateTimeFormat(numberLocale.value, { dateStyle: 'medium', timeZone: 'UTC' }),
}))
const number = (value: number) => formatters.value.number.format(value)
const money = (value: number | null) =>
  value === null ? t('noData') : formatters.value.money.format(value)
const valueLabel = (value: number | null) =>
  value === null
    ? t(selection.layer === 'prices' ? 'noPriceMetric' : 'noMetric')
    : selection.layer === 'prices'
      ? money(value)
      : number(value)
const date = (value: string | null | undefined) =>
  value && Number.isFinite(Date.parse(value))
    ? formatters.value.date.format(new Date(value))
    : t('noData')
const period = (crime: RentalZoneCrime) =>
  t('crimePeriod', { from: date(crime.periodFrom), to: date(crime.periodTo) })
const crimePeriods = computed(() => [
  ...new Set(
    rows.value
      .filter(row => row.crime && row.crime.status !== 'unavailable')
      .map(row => period(row.crime!))
  ),
])
const serviceDates = computed(() => [
  ...new Set(
    rows.value
      .filter(row => row.services && row.services.status !== 'unavailable')
      .map(row => date(row.services!.source.dataAsOf))
  ),
])

function polygonFor(id: string): SVGElement | null {
  return (
    Array.from(rootElement.value?.querySelectorAll<SVGElement>('.leaflet-interactive') ?? []).find(
      element => element.getAttribute('aria-label') === labels.value[id]
    ) ?? null
  )
}
async function selectRow(id: string, trigger?: HTMLElement) {
  if (!rows.value.some(row => row.id === id)) return
  selectionTrigger = trigger ?? polygonFor(id)
  selectedId.value = id
  await nextTick()
  detailElement.value?.focus({ preventScroll: true })
  if (window.innerWidth < 960)
    detailElement.value?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
}
async function closeDetail() {
  const target = selectionTrigger?.isConnected
    ? selectionTrigger
    : selectedId.value
      ? polygonFor(selectedId.value)
      : null
  selectedId.value = null
  await nextTick()
  if (target?.isConnected) target.focus({ preventScroll: true })
  else
    rootElement.value
      ?.querySelector<HTMLButtonElement>('.analysis-map__layers button[aria-pressed="true"]')
      ?.focus({ preventScroll: true })
}
function retryRenderer() {
  rendererError.value = false
  mapRevision.value++
}
async function loadBoundaries(force = false) {
  if (!inMontevideo.value || (boundaries.value && !force) || (boundaryPending.value && !force))
    return
  boundaryController?.abort()
  const controller = new AbortController()
  boundaryController = controller
  boundaryPending.value = true
  boundaryError.value = false
  try {
    const result = await $fetch<RentalZoneBoundaryCollection>('/api/rentals/zone-boundaries', {
      signal: controller.signal,
      timeout: 15000,
      retry: 0,
    })
    if (boundaryController !== controller) return
    boundaries.value = result
    mapRevision.value++
  } catch {
    if (boundaryController === controller && !controller.signal.aborted) boundaryError.value = true
  } finally {
    if (boundaryController === controller) boundaryPending.value = false
  }
}
async function loadContext(force = false) {
  if (
    !inMontevideo.value ||
    selection.layer === 'prices' ||
    (contextData.value && !force) ||
    (contextPending.value && !force)
  )
    return
  contextController?.abort()
  const controller = new AbortController()
  contextController = controller
  contextPending.value = true
  contextError.value = false
  try {
    const result = await $fetch<RentalZoneResponse>('/api/rentals/zones', {
      query: { department: 'Montevideo', propertyType: 'apartamento', bedrooms: 'any' },
      signal: controller.signal,
      timeout: 15000,
      retry: 0,
    })
    if (contextController !== controller) return
    contextData.value = result
  } catch {
    if (contextController === controller && !controller.signal.aborted) contextError.value = true
  } finally {
    if (contextController === controller) contextPending.value = false
  }
}
watch(
  () => [props.query.neighborhood, boundaries.value] as const,
  () => {
    const matches = rows.value.filter(
      row =>
        rentalAnalysisLocationName(row.name) ===
        rentalAnalysisLocationName(props.query.neighborhood)
    )
    selectedId.value = matches.length === 1 ? matches[0]!.id : null
  }
)
watch(
  () => [inMontevideo.value, selection.layer] as const,
  ([enabled]) => {
    if (!import.meta.client || !enabled) return
    void loadBoundaries()
    void loadContext()
  }
)
onMounted(() => {
  void loadBoundaries()
  void loadContext()
})
onBeforeUnmount(() => {
  boundaryController?.abort()
  contextController?.abort()
})
</script>

<style scoped>
.analysis-map {
  margin-top: 28px;
  padding: 24px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.15);
  border-radius: 12px;
  scroll-margin-top: 100px;
}
.analysis-map :is(h2, h3, p, ul, dl, dd) {
  margin: 0;
}
.analysis-map h2 {
  font-size: 1.5rem;
  line-height: 1.35;
}
.analysis-map h3 {
  font-size: 1.2rem;
  line-height: 1.4;
}
.analysis-map p {
  margin-top: 10px;
  max-width: 75ch;
  font-size: 0.875rem;
  line-height: 1.6;
}
.analysis-map__layers {
  display: flex;
  gap: 8px;
  margin-top: 22px;
  max-width: 700px;
}
.analysis-map__layers button {
  display: flex;
  flex: 1;
  justify-content: center;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  padding: 10px 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.35);
  border-radius: 4px;
  color: rgb(var(--v-theme-on-surface));
  background: rgb(var(--v-theme-surface));
  font-size: 0.875rem;
  line-height: 1.4;
  cursor: pointer;
}
.analysis-map__layers button:hover {
  background: rgba(var(--v-theme-primary), 0.05);
}
.analysis-map__layers button[aria-pressed='true'] {
  border-color: rgb(var(--v-theme-link));
  color: rgb(var(--v-theme-link));
  background: rgba(var(--v-theme-primary), 0.08);
  font-weight: 700;
}
.analysis-map__controls {
  display: flex;
  align-items: end;
  gap: 18px;
  margin-top: 18px;
}
.analysis-map__controls label {
  display: flex;
  flex: 0 1 330px;
  flex-direction: column;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 600;
}
.analysis-map__controls select {
  width: 100%;
  min-height: 44px;
  padding: 8px 10px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.4);
  border-radius: 4px;
  color: rgb(var(--v-theme-on-surface));
  background: rgb(var(--v-theme-surface));
  font: inherit;
  appearance: auto;
}
.analysis-map p.analysis-map__scope {
  margin: 0 0 8px;
  font-size: 0.8rem;
}
.analysis-map__layer-note p {
  font-size: 0.8rem;
}
.analysis-map__notice {
  margin-top: 18px;
  padding: 14px 0;
}
.analysis-map__notice p {
  margin: 0 0 10px;
}
.analysis-map__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 22px;
  margin-top: 22px;
  align-items: start;
}
.analysis-map__layout.has-detail {
  grid-template-columns: minmax(0, 1fr) 290px;
}
.analysis-map__canvas {
  min-width: 0;
}
.analysis-map__loading {
  min-height: 300px;
  padding: 22px;
  margin-top: 20px;
  background: rgba(var(--v-theme-on-surface), 0.04);
}
.analysis-map__legend {
  margin-top: 16px;
  font-size: 0.85rem;
}
.analysis-map__legend p {
  font-size: 0.76rem;
  margin-top: 7px;
}
.analysis-map__scale {
  max-width: 440px;
  margin-top: 10px;
}
.analysis-map__swatches {
  display: flex;
  height: 14px;
}
.analysis-map__swatches span {
  flex: 1;
}
.analysis-map__limits {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 5px;
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
}
.analysis-map__no-data {
  display: flex;
  align-items: center;
  gap: 7px;
}
.analysis-map__no-data span {
  display: inline-block;
  width: 14px;
  height: 14px;
  flex: 0 0 14px;
}
.analysis-map__detail {
  min-width: 0;
  padding: 0 0 8px;
  scroll-margin-top: 100px;
  outline: none;
}
.analysis-map__detail:focus-visible {
  outline: 2px solid rgb(var(--v-theme-link));
  outline-offset: 5px;
}
.analysis-map__detail-heading {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 12px;
}
.analysis-map__close {
  display: grid;
  place-items: center;
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
}
.analysis-map__close:hover {
  background: rgba(var(--v-theme-on-surface), 0.08);
}
.analysis-map p.analysis-map__meta {
  font-size: 0.75rem;
  margin-top: 8px;
}
.analysis-map__detail p {
  font-size: 0.8rem;
}
.analysis-map p.analysis-map__metric-label {
  margin-top: 18px;
  font-weight: 600;
}
.analysis-map__value {
  display: block;
  margin-top: 6px;
  font-size: 1.5rem;
  line-height: 1.4;
  font-variant-numeric: tabular-nums;
}
.analysis-map__facts {
  display: grid;
  gap: 14px;
  margin-top: 20px !important;
  font-size: 0.8rem;
}
.analysis-map__facts dt {
  margin-bottom: 4px;
}
.analysis-map__facts dd {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.analysis-map__source {
  overflow-wrap: anywhere;
}
.analysis-map a,
.analysis-map__link {
  color: rgb(var(--v-theme-link));
  text-underline-offset: 3px;
}
.analysis-map__link {
  min-height: 44px;
  padding: 8px 0;
  background: none;
  border: 0;
  cursor: pointer;
  text-decoration: underline;
  text-align: left;
  font-size: 0.85rem;
  line-height: 1.5;
}
.analysis-map__link:hover {
  text-decoration-thickness: 2px;
}
.analysis-map :is(button, select, summary, a):focus-visible {
  outline: 3px solid rgb(var(--v-theme-link));
  outline-offset: 3px;
}
.analysis-map__list,
.analysis-map__method {
  margin-top: 20px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.15);
  padding-top: 4px;
}
.analysis-map summary {
  min-height: 44px;
  padding: 12px 0;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
}
.analysis-map__method p {
  font-size: 0.8rem;
}
.analysis-map__table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
  font-size: 0.8rem;
}
.analysis-map__table :is(th, td) {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.15);
  text-align: left;
  vertical-align: top;
}
.analysis-map__table th {
  font-size: 0.75rem;
}
.analysis-map__table small {
  display: block;
  margin-top: 5px;
}
.analysis-map__full-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  margin-top: 18px;
  font-size: 0.85rem;
}
.analysis-map__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
@media (max-width: 959px) {
  .analysis-map__layout.has-detail {
    grid-template-columns: minmax(0, 1fr);
  }
  .analysis-map__detail {
    padding-top: 18px;
    border-top: 1px solid rgba(var(--v-theme-on-surface), 0.15);
  }
}
@media (max-width: 599px) {
  .analysis-map {
    padding: 16px 12px;
  }
  .analysis-map h2 {
    font-size: 1.25rem;
  }
  .analysis-map__layers {
    gap: 5px;
  }
  .analysis-map__layers button {
    flex-direction: column;
    padding: 9px 5px;
    gap: 5px;
    font-size: 0.76rem;
  }
  .analysis-map__controls {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  .analysis-map__controls label {
    flex: none;
  }
  .analysis-map p.analysis-map__scope {
    margin: 0;
  }
  .analysis-map__table td {
    overflow-wrap: anywhere;
  }
}
</style>
