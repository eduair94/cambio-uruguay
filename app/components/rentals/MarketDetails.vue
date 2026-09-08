<template>
  <div
    v-if="details"
    id="detalle-mercado"
    class="market-details"
    data-testid="rental-market-details"
  >
    <header class="market-details__heading">
      <div>
        <h2>{{ t('title') }}</h2>
        <p>{{ t('intro') }}</p>
      </div>
      <div class="market-details__download">
        <VBtn variant="outlined" prepend-icon="mdi-download" @click="downloadCsv">
          {{ t('download') }}
        </VBtn>
        <p>{{ t('downloadHint') }}</p>
        <span class="sr-only" role="status">{{ downloaded ? t('downloaded') : '' }}</span>
      </div>
    </header>

    <section v-if="details.priceStats" aria-labelledby="market-statistics-title">
      <h3 id="market-statistics-title">{{ t('statistics') }}</h3>
      <p>{{ t('statisticsHint') }}</p>
      <p class="market-details__finding">
        {{
          t('spread', { low: money(details.priceStats.p10), high: money(details.priceStats.p90) })
        }}
      </p>
      <p v-if="details.priceStats.count < 8" class="market-details__note">{{ t('smallSample') }}</p>
      <table class="market-details__table cu-mobile-cards">
        <caption class="sr-only">
          {{
            t('statistics')
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col">{{ t('measure') }}</th>
            <th scope="col">{{ t('price') }} ({{ analysis.query.currency }})</th>
            <th scope="col">{{ t('meaning') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="stat in statistics"
            :key="stat.key"
            :class="{ 'is-median': stat.key === 'median' }"
          >
            <th scope="row">{{ t(stat.label) }}</th>
            <td :data-label="t('price')" class="market-details__number">{{ money(stat.value) }}</td>
            <td :data-label="t('meaning')" class="cu-cell-prose">{{ t(stat.hint) }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section id="superficie-alquiler" aria-labelledby="market-area-title">
      <div class="market-details__heading">
        <div>
          <h3 id="market-area-title">{{ t('areaTitle') }}</h3>
          <p>{{ t('areaHint') }}</p>
        </div>
        <label class="market-details__field">
          {{ t('areaBasis') }}
          <select
            v-model="areaBasis"
            name="market-area-basis"
            aria-describedby="market-area-basis-hint"
          >
            <option value="built">{{ t('built') }}</option>
            <option value="total">{{ t('total') }}</option>
          </select>
        </label>
      </div>
      <p id="market-area-basis-hint" class="market-details__note">{{ t('areaBasisHint') }}</p>
      <template v-if="points.length">
        <figure class="market-details__scatter">
          <figcaption>
            <h4>{{ t('scatterTitle') }}</h4>
            <p>{{ t('scatterHint', { n: integer(points.length), total: integer(areaCount) }) }}</p>
          </figcaption>
          <p class="market-details__axis-title">
            {{ t('chartPrice', { currency: analysis.query.currency }) }}
          </p>
          <div class="market-details__plot-layout">
            <div class="market-details__y-axis" aria-hidden="true">
              <span v-for="tick in [...priceTicks].reverse()" :key="tick">{{ compact(tick) }}</span>
            </div>
            <svg
              class="market-details__plot"
              viewBox="0 0 1000 260"
              preserveAspectRatio="none"
              role="img"
              aria-labelledby="market-scatter-title market-scatter-description"
            >
              <title id="market-scatter-title">{{ t('scatterTitle') }}</title>
              <desc id="market-scatter-description">
                {{ t('scatterDescription', { currency: analysis.query.currency }) }}
              </desc>
              <line
                v-for="tick in priceTicks"
                :key="`y-${tick}`"
                x1="12"
                x2="988"
                :y1="pointY(tick)"
                :y2="pointY(tick)"
                class="market-details__grid-line"
                vector-effect="non-scaling-stroke"
              />
              <line
                v-for="tick in areaTicks"
                :key="`x-${tick}`"
                :x1="pointX(tick)"
                :x2="pointX(tick)"
                y1="8"
                y2="252"
                class="market-details__grid-line"
                vector-effect="non-scaling-stroke"
              />
              <circle
                v-for="(point, index) in points"
                :key="index"
                :cx="pointX(point.area)"
                :cy="pointY(point.price)"
                r="1.5"
                class="market-details__point"
                vector-effect="non-scaling-stroke"
              >
                <title>{{ decimal(point.area) }} m² · {{ money(point.price) }}</title>
              </circle>
            </svg>
            <div class="market-details__x-axis" aria-hidden="true">
              <span v-for="tick in areaTicks" :key="tick">{{ decimal(tick) }}</span>
            </div>
          </div>
          <p class="market-details__axis-title market-details__axis-title--x">
            {{ t('chartArea') }}
          </p>
        </figure>
        <details class="market-details__points-table">
          <summary>{{ t('viewPoints', { n: points.length }) }}</summary>
          <table class="market-details__table market-details__point-values">
            <caption class="sr-only">
              {{
                t('scatterTitle')
              }}
            </caption>
            <thead>
              <tr>
                <th scope="col">{{ t('area') }} (m²)</th>
                <th scope="col">{{ t('price') }} ({{ analysis.query.currency }})</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(point, index) in points" :key="index">
                <td>{{ decimal(point.area) }}</td>
                <td>{{ money(point.price) }}</td>
              </tr>
            </tbody>
          </table>
        </details>
        <table class="market-details__table cu-mobile-cards">
          <caption>
            {{
              t('sizeTableHint')
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">{{ t('size') }}</th>
              <th scope="col">{{ t('count') }}</th>
              <th scope="col">{{ t('median') }}</th>
              <th scope="col">{{ t('centralRange') }}</th>
              <th scope="col">{{ t('perM2') }}</th>
              <th scope="col">{{ t('monthly') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="band in areaBands" :key="band.key">
              <th scope="row">{{ areaBandLabel(band.min, band.max) }}</th>
              <td :data-label="t('count')">
                {{ integer(band.count)
                }}<small v-if="band.count > 0 && band.count < 8">{{ t('smallSample') }}</small>
              </td>
              <td :data-label="t('median')" class="market-details__number">
                {{ money(band.rent?.median) }}
              </td>
              <td :data-label="t('centralRange')">{{ range(band.rent) }}</td>
              <td :data-label="t('perM2')">{{ money(band.perM2[areaBasis]?.median) }}</td>
              <td :data-label="t('monthly')">
                {{ money(band.monthly?.median)
                }}<small>{{ t('expensesCount', { n: integer(band.expensesKnownCount) }) }}</small>
              </td>
            </tr>
          </tbody>
        </table>
      </template>
      <p v-else class="market-details__empty">{{ t('noArea') }}</p>
    </section>

    <section aria-labelledby="market-characteristics-title">
      <h3 id="market-characteristics-title">{{ t('characteristics') }}</h3>
      <p>{{ t('characteristicsHint') }}</p>
      <table v-if="featureRows.length" class="market-details__table cu-mobile-cards">
        <caption class="sr-only">
          {{
            t('characteristics')
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col">{{ t('feature') }}</th>
            <th scope="col">{{ t('count') }}</th>
            <th scope="col">{{ t('median') }}</th>
            <th scope="col">{{ t('centralRange') }}</th>
            <th scope="col">{{ t('monthly') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in featureRows" :key="row.key">
            <th scope="row">
              <small>{{ row.group }}</small
              >{{ row.label }}
            </th>
            <td :data-label="t('count')">
              {{ integer(row.summary.count)
              }}<small v-if="row.summary.count < 8">{{ t('smallSample') }}</small>
            </td>
            <td :data-label="t('median')" class="market-details__number">
              {{ money(row.summary.rent?.median) }}
            </td>
            <td :data-label="t('centralRange')">{{ range(row.summary.rent) }}</td>
            <td :data-label="t('monthly')">
              {{ money(row.summary.monthly?.median)
              }}<small>{{
                t('expensesCount', { n: integer(row.summary.expensesKnownCount) })
              }}</small>
            </td>
          </tr>
        </tbody>
      </table>
      <p class="market-details__note">{{ t('missingFeatures') }}</p>
    </section>

    <section id="cobertura-datos" aria-labelledby="market-coverage-title">
      <h3 id="market-coverage-title">{{ t('coverage') }}</h3>
      <p>{{ t('coverageHint', { n: integer(details.quality.total) }) }}</p>
      <ul class="market-details__coverage">
        <li v-for="row in qualityRows" :key="row.key">
          <div>
            <span>{{ t(row.key) }}</span
            ><strong>{{ coverageLabel(row.count) }}</strong>
          </div>
          <div class="market-details__bar" aria-hidden="true">
            <span :style="{ width: `${coveragePct(row.count)}%` }" />
          </div>
        </li>
      </ul>
      <p class="market-details__note">{{ t('freshnessHint') }}</p>
      <h4 class="market-details__source-heading">{{ t('sources') }}</h4>
      <p>{{ t('sourcesHint') }}</p>
      <ul class="market-details__sources">
        <li v-for="source in details.sources" :key="source.source">
          <strong>{{ RENTAL_SOURCE_LABEL[source.source] }}</strong>
          <span>{{ coverageLabel(source.count) }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import type {
  RentalAnalysisAreaBasis,
  RentalAnalysisMeasure,
  RentalAnalysisResponse,
  RentalAnalysisSummary,
} from '~/utils/rentalAnalysis'
import { rentalMarketDetailMessages } from '~/utils/rentalMarketDetailMessages'
import { RENTAL_SOURCE_LABEL } from '~/utils/rentals'

const props = defineProps<{ analysis: RentalAnalysisResponse }>()
const { locale } = useI18n()
type MessageKey = keyof typeof rentalMarketDetailMessages.es
const messages = computed(
  () =>
    rentalMarketDetailMessages[locale.value as 'es' | 'en' | 'pt'] ?? rentalMarketDetailMessages.es
)
const t = (key: MessageKey, values: Record<string, string | number> = {}) =>
  Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    messages.value[key]
  )
const numberLocale = computed(() =>
  locale.value === 'en' ? 'en-US' : locale.value === 'pt' ? 'pt-BR' : 'es-UY'
)
const integer = (value: number) =>
  new Intl.NumberFormat(numberLocale.value, { maximumFractionDigits: 0 }).format(value)
const decimal = (value: number) =>
  new Intl.NumberFormat(numberLocale.value, { maximumFractionDigits: 1 }).format(value)
const compact = (value: number) =>
  new Intl.NumberFormat(numberLocale.value, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
const money = (value: number | null | undefined) =>
  value == null
    ? t('noData')
    : new Intl.NumberFormat(numberLocale.value, {
        style: 'currency',
        currency: props.analysis.query.currency,
        currencyDisplay: 'narrowSymbol',
        maximumFractionDigits: 0,
      }).format(value)
const range = (measure: RentalAnalysisMeasure | null) =>
  measure ? `${money(measure.p25)} – ${money(measure.p75)}` : t('noData')
const details = computed(() => props.analysis.details)
const areaBasis = ref<RentalAnalysisAreaBasis>('built')
const downloaded = ref(false)
const points = computed(() => details.value?.scatter[areaBasis.value] ?? [])
const areaBands = computed(
  () => details.value?.areaBands.filter(row => row.basis === areaBasis.value) ?? []
)
const areaCount = computed(() =>
  areaBasis.value === 'built'
    ? (details.value?.quality.builtAreaKnown ?? 0)
    : (details.value?.quality.totalAreaKnown ?? 0)
)
const areaBandLabel = (min: number, max: number | null) =>
  max === null ? t('sizeLast', { min }) : t('sizeRange', { min, max })
const statistics = computed(() => {
  const stats = details.value?.priceStats
  if (!stats) return []
  return [
    { key: 'min', label: 'minimum', hint: 'minimumHint', value: stats.min },
    { key: 'p10', label: 'p10', hint: 'p10Hint', value: stats.p10 },
    { key: 'p25', label: 'p25', hint: 'p25Hint', value: stats.p25 },
    { key: 'median', label: 'median', hint: 'medianHint', value: stats.median },
    { key: 'p75', label: 'p75', hint: 'p75Hint', value: stats.p75 },
    { key: 'p90', label: 'p90', hint: 'p90Hint', value: stats.p90 },
    { key: 'max', label: 'maximum', hint: 'maximumHint', value: stats.max },
    { key: 'mean', label: 'mean', hint: 'meanHint', value: stats.mean },
  ] as Array<{ key: string; label: MessageKey; hint: MessageKey; value: number }>
})

const limits = computed(() => {
  const areas = points.value.map(point => point.area)
  const prices = points.value.map(point => point.price)
  const minArea = Math.floor(Math.min(...areas, 20) / 10) * 10
  const maxArea = Math.max(minArea + 20, Math.ceil(Math.max(...areas, 40) / 10) * 10)
  const maxPrice = Math.max(1, ...prices) * 1.06
  return { minArea, maxArea, maxPrice }
})
const areaTicks = computed(() =>
  Array.from(
    { length: 5 },
    (_, index) => limits.value.minArea + ((limits.value.maxArea - limits.value.minArea) * index) / 4
  )
)
const priceTicks = computed(() =>
  Array.from({ length: 5 }, (_, index) => (limits.value.maxPrice * index) / 4)
)
const pointX = (value: number) =>
  12 + ((value - limits.value.minArea) / (limits.value.maxArea - limits.value.minArea)) * 976
const pointY = (value: number) => 252 - (value / limits.value.maxPrice) * 244

const featureRows = computed(() => {
  const data = details.value
  if (!data) return []
  const rows: Array<{ key: string; group: string; label: string; summary: RentalAnalysisSummary }> =
    data.bathrooms.map(row => ({
      key: `bathrooms-${row.bathrooms}`,
      group: t('bathrooms'),
      label: t('bathroom', { n: row.bathrooms }),
      summary: row,
    }))
  if (data.parking.withParking.count)
    rows.push({
      key: 'parking-with',
      group: t('parking'),
      label: t('withParking'),
      summary: data.parking.withParking,
    })
  if (data.parking.withoutParking.count)
    rows.push({
      key: 'parking-without',
      group: t('parking'),
      label: t('withoutParking'),
      summary: data.parking.withoutParking,
    })
  if (props.analysis.query.type === 'all')
    for (const row of data.propertyTypes) {
      if (row.count)
        rows.push({
          key: `type-${row.type}`,
          group: t('propertyTypes'),
          label: t(row.type),
          summary: row,
        })
    }
  return rows
})
const qualityRows = computed(() => {
  const quality = details.value?.quality
  if (!quality) return []
  return [
    { key: 'expensesKnown', count: quality.expensesKnown },
    { key: 'builtAreaKnown', count: quality.builtAreaKnown },
    { key: 'totalAreaKnown', count: quality.totalAreaKnown },
    { key: 'bathroomsKnown', count: quality.bathroomsKnown },
    { key: 'parkingKnown', count: quality.parkingKnown },
    { key: 'observedWithin48Hours', count: quality.observedWithin48Hours },
  ] as Array<{ key: MessageKey; count: number }>
})
const coveragePct = (count: number) =>
  details.value?.quality.total ? Math.min(100, (count / details.value.quality.total) * 100) : 0
const coverageLabel = (count: number) =>
  t('coverageValue', {
    n: integer(count),
    total: integer(details.value?.quality.total ?? 0),
    pct: decimal(coveragePct(count)),
  })

function downloadCsv() {
  const data = props.analysis
  if (!data.details) return
  const query = data.query
  const header = [
    'section',
    'segment',
    'metric',
    'value',
    'unit',
    'currency',
    'department',
    'neighborhood',
    'property_type',
    'bedrooms',
    'catalogue_updated_at',
    'analyzed_at',
    'area_basis',
  ]
  const rows: Array<Array<string | number | null>> = [header]
  const append = (
    section: string,
    segment: string,
    metric: string,
    value: number | null,
    unit: string,
    basis = '',
    scope = query
  ) =>
    rows.push([
      section,
      segment,
      metric,
      value,
      unit,
      scope.currency,
      scope.department,
      scope.neighborhood,
      scope.type,
      scope.bedrooms,
      data.generatedAt,
      data.analyzedAt,
      basis,
    ])
  const summary = (
    section: string,
    segment: string,
    row: RentalAnalysisSummary,
    basis = '',
    scope = query
  ) => {
    append(section, segment, 'properties', row.count, 'count', basis, scope)
    for (const [name, measure] of Object.entries({
      rent: row.rent,
      common_expenses: row.expenses,
      monthly_total: row.monthly,
      built_m2: row.perM2.built,
      total_m2: row.perM2.total,
    })) {
      append(section, segment, `${name}_count`, measure?.count ?? 0, 'count', basis, scope)
      for (const metric of ['median', 'p25', 'p75'] as const)
        append(
          section,
          segment,
          `${name}_${metric}`,
          measure?.[metric] ?? null,
          name.endsWith('_m2') ? `${query.currency}/m2/month` : `${query.currency}/month`,
          basis,
          scope
        )
    }
  }
  summary('selection', 'all', data.summary)
  for (const row of data.departments)
    summary('department', row.name, row, '', { ...query, department: row.name, neighborhood: '' })
  for (const row of data.neighborhoods)
    summary('neighborhood', row.name, row, '', { ...query, neighborhood: row.name })
  for (const row of data.bedrooms)
    summary('bedrooms', String(row.bedrooms), row, '', { ...query, bedrooms: row.bedrooms })
  for (const row of data.details.areaBands) summary('area_band', row.key, row, row.basis)
  for (const row of data.details.bathrooms) summary('bathrooms', String(row.bathrooms), row)
  for (const row of data.details.propertyTypes) summary('property_type', row.type, row)
  summary('parking', 'with', data.details.parking.withParking)
  summary('parking', 'without', data.details.parking.withoutParking)
  for (const [key, value] of Object.entries(data.details.priceStats ?? {}))
    append(
      'price_statistics',
      'all',
      key,
      value,
      key === 'count' ? 'count' : `${query.currency}/month`
    )
  for (const [key, value] of Object.entries(data.details.quality))
    append('data_quality', 'all', key, value, 'count')
  for (const source of data.details.sources)
    append('sources', source.source, 'properties', source.count, 'count')
  const cell = (value: string | number | null) => {
    let text = value === null ? '' : String(value)
    if (typeof value === 'string' && /^[\s\p{Cc}]*[=+@-]/u.test(text)) text = `'${text}`
    return `"${text.replaceAll('"', '""')}"`
  }
  const csv = `\uFEFF${rows.map(row => row.map(cell).join(',')).join('\r\n')}`
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `alquileres-${query.currency.toLowerCase()}-${data.analyzedAt.slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  downloaded.value = true
}
</script>

<style scoped>
.market-details {
  margin-top: 52px;
  scroll-margin-top: 100px;
}
.market-details > section {
  margin-top: 38px;
  padding-top: 30px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.15);
  scroll-margin-top: 100px;
}
.market-details h2,
.market-details h3,
.market-details h4,
.market-details p,
.market-details figure,
.market-details ul {
  margin: 0;
}
.market-details h2 {
  font-size: 1.6rem;
  line-height: 1.3;
}
.market-details h3 {
  font-size: 1.25rem;
  line-height: 1.4;
}
.market-details h4 {
  font-size: 1rem;
  line-height: 1.4;
}
.market-details p {
  margin-top: 10px;
  max-width: 75ch;
  font-size: 0.9rem;
  line-height: 1.65;
}
.market-details__heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 28px;
}
.market-details__heading > div {
  min-width: 0;
}
.market-details__download {
  flex: 0 0 255px;
}
.market-details__download p {
  font-size: 0.76rem;
}
.market-details__finding {
  font-weight: 600;
}
.market-details__note {
  font-size: 0.8rem !important;
}
.market-details__table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 22px;
  font-size: 0.82rem;
  line-height: 1.55;
}
.market-details__table :is(th, td) {
  padding: 12px 10px;
  vertical-align: top;
  text-align: left;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.13);
}
.market-details__table thead th {
  font-size: 0.75rem;
  font-weight: 600;
}
.market-details__table tbody th {
  font-weight: 600;
}
.market-details__table small {
  display: block;
  margin-top: 5px;
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 1.5;
}
.market-details__table tbody th small {
  margin: 0 0 3px;
}
.market-details__table caption:not(.sr-only) {
  caption-side: bottom;
  padding-top: 12px;
  text-align: left;
  font-size: 0.78rem;
  line-height: 1.6;
}
.market-details__table .is-median {
  background: rgba(var(--v-theme-primary), 0.06);
}
.market-details__number {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.market-details__field {
  display: flex;
  flex: 0 0 185px;
  flex-direction: column;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 600;
}
.market-details__field select {
  min-height: 44px;
  width: 100%;
  padding: 8px 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.4);
  border-radius: 4px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  appearance: auto;
  font: inherit;
}
.market-details :is(select, summary):focus-visible {
  outline: 3px solid rgb(var(--v-theme-link));
  outline-offset: 3px;
}
.market-details__scatter {
  margin-top: 28px !important;
}
.market-details__scatter figcaption p {
  font-size: 0.8rem;
}
.market-details__axis-title {
  margin-top: 20px !important;
  font-size: 0.75rem !important;
}
.market-details__axis-title--x {
  margin: 7px 0 0 64px !important;
  text-align: center;
  max-width: none !important;
}
.market-details__plot-layout {
  display: grid;
  grid-template-columns: 60px minmax(0, 1fr);
  grid-template-rows: 270px auto;
  gap: 6px 4px;
  margin-top: 10px;
}
.market-details__y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  text-align: right;
  padding: 8px 5px 8px 0;
  font-size: 0.75rem;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.market-details__plot {
  width: 100%;
  height: 270px;
  overflow: visible;
}
.market-details__x-axis {
  grid-column: 2;
  display: flex;
  justify-content: space-between;
  padding: 0 5px;
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
}
.market-details__grid-line {
  stroke: rgba(var(--v-theme-on-surface), 0.14);
  stroke-width: 1;
}
.market-details__point {
  stroke: rgb(var(--v-theme-link));
  stroke-width: 5;
  fill: rgb(var(--v-theme-link));
  opacity: 0.74;
}
.market-details__point:hover {
  opacity: 1;
  stroke-width: 8;
}
.market-details__points-table {
  margin-top: 18px;
}
.market-details__points-table summary {
  width: fit-content;
  min-height: 44px;
  padding: 10px 0;
  cursor: pointer;
  color: rgb(var(--v-theme-link));
  font-size: 0.85rem;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.market-details__points-table summary:hover {
  text-decoration-thickness: 2px;
}
.market-details__point-values {
  max-width: 480px;
}
.market-details__empty {
  padding: 20px 0;
}
.market-details__coverage {
  list-style: none;
  padding: 0;
  margin-top: 24px !important;
  max-width: 780px;
}
.market-details__coverage li {
  margin-top: 19px;
}
.market-details__coverage li > div:first-child {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  font-size: 0.84rem;
}
.market-details__coverage strong {
  flex-shrink: 0;
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}
.market-details__bar {
  margin-top: 8px;
  height: 8px;
  background: rgba(var(--v-theme-on-surface), 0.08);
}
.market-details__bar span {
  display: block;
  height: 100%;
  background: rgb(var(--v-theme-link));
}
.market-details__source-heading {
  margin-top: 32px !important;
}
.market-details__sources {
  list-style: none;
  padding: 0;
  margin-top: 16px !important;
  max-width: 780px;
}
.market-details__sources li {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.13);
  font-size: 0.85rem;
}
.market-details__sources span {
  font-variant-numeric: tabular-nums;
}
.sr-only {
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
@media (max-width: 800px) {
  .market-details__heading {
    flex-direction: column;
    gap: 18px;
  }
  .market-details__download,
  .market-details__field {
    flex: none;
    width: 100%;
  }
  .market-details__field {
    max-width: 300px;
  }
  .market-details__download p {
    max-width: 55ch;
  }
  .market-details__table {
    font-size: 0.78rem;
  }
}
@media (max-width: 599px) {
  .market-details {
    margin-top: 40px;
  }
  .market-details h2 {
    font-size: 1.35rem;
  }
  .market-details h3 {
    font-size: 1.15rem;
  }
  .market-details > section {
    margin-top: 28px;
    padding-top: 24px;
  }
  .market-details__table.cu-mobile-cards tbody th {
    display: block;
    width: 100%;
    padding: 10px 12px;
    border: 0;
  }
  .market-details__table.cu-mobile-cards td {
    overflow-wrap: anywhere;
  }
  .market-details__table.cu-mobile-cards td small {
    flex: 1 0 100%;
  }
  .market-details__coverage li > div:first-child {
    flex-direction: column;
    gap: 4px;
  }
  .market-details__sources li {
    flex-direction: column;
    gap: 4px;
  }
  .market-details__plot-layout {
    grid-template-columns: 44px minmax(0, 1fr);
  }
  .market-details__axis-title--x {
    margin-left: 48px !important;
  }
}
</style>
