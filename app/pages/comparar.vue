<template>
  <div>
    <!-- Header -->
    <v-row>
      <v-col cols="12">
        <v-card class="overflow-hidden" elevation="8">
          <div class="bg-gradient-compare pa-4">
            <div class="d-flex align-center ga-3 flex-wrap">
              <v-avatar size="56" class="d-none d-md-flex bg-white">
                <v-icon size="32" color="primary">mdi-chart-multiple</v-icon>
              </v-avatar>
              <div>
                <h1 class="text-h5 text-sm-h4 font-weight-bold text-white mb-1">
                  {{ $t('compare.title') }}
                </h1>
                <p class="text-body-2 text-grey-lighten-2 mb-0">
                  {{ $t('compare.subtitle') }}
                </p>
              </div>
            </div>
          </div>

          <!-- Controls -->
          <v-card-text>
            <v-row align="start">
              <v-col cols="12" md="4">
                <v-autocomplete
                  v-model="selectedCurrency"
                  :items="currencyOptions"
                  item-title="title"
                  item-value="value"
                  :label="$t('compare.currency')"
                  prepend-inner-icon="mdi-currency-usd"
                  density="compact"
                  variant="outlined"
                  hide-details
                  data-testid="compare-currency"
                />
              </v-col>
              <v-col cols="12" md="5">
                <v-autocomplete
                  v-model="selectedOrigins"
                  :items="originOptions"
                  item-title="title"
                  item-value="value"
                  :label="$t('compare.houses')"
                  :hint="$t('compare.housesHint')"
                  persistent-hint
                  multiple
                  chips
                  closable-chips
                  clearable
                  prepend-inner-icon="mdi-bank"
                  density="compact"
                  variant="outlined"
                  data-testid="compare-houses"
                  :error="tooManyHouses"
                  :error-messages="tooManyHouses ? $t('compare.maxHouses') : undefined"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-btn-toggle
                  v-model="priceKind"
                  mandatory
                  density="compact"
                  color="primary"
                  variant="outlined"
                  data-testid="compare-pricekind"
                >
                  <v-btn value="buy" size="small">{{ $t('compare.buy') }}</v-btn>
                  <v-btn value="sell" size="small">{{ $t('compare.sell') }}</v-btn>
                </v-btn-toggle>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Loading -->
    <v-row v-if="loading">
      <v-col cols="12" class="text-center py-10">
        <v-progress-circular indeterminate color="primary" size="64" />
        <p class="mt-4 text-h6">{{ $t('compare.loading') }}</p>
      </v-col>
    </v-row>

    <!-- Empty selection -->
    <v-row v-else-if="selectedOrigins.length === 0">
      <v-col cols="12">
        <v-alert type="info" variant="tonal" class="ma-2" data-testid="compare-empty">
          {{ $t('compare.pickHouses') }}
        </v-alert>
      </v-col>
    </v-row>

    <template v-else>
      <!-- Chart -->
      <v-row class="mt-2">
        <v-col cols="12">
          <v-card>
            <v-card-title class="d-flex align-center flex-wrap ga-2 py-3">
              <v-icon start>mdi-chart-line</v-icon>
              {{ $t('compare.chartTitle', { currency: selectedCurrency }) }}
              <v-chip class="ms-2" color="secondary" size="small">
                {{ priceKind === 'buy' ? $t('compare.buy') : $t('compare.sell') }}
              </v-chip>
            </v-card-title>
            <v-card-text>
              <div class="chart-wrap">
                <ClientOnly>
                  <LineChart
                    :key="chartKey"
                    :chart-data="chartData"
                    :options="chartOptions"
                    :aria-label="$t('compare.chartTitle', { currency: selectedCurrency })"
                  />
                  <template #fallback>
                    <div class="d-flex align-center justify-center fill-height">
                      <v-progress-circular indeterminate color="primary" />
                    </div>
                  </template>
                </ClientOnly>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Summary table -->
      <v-row class="mt-2">
        <v-col cols="12">
          <v-card>
            <v-card-title class="py-3">
              <v-icon start>mdi-table</v-icon>
              {{ $t('compare.summary') }}
            </v-card-title>
            <v-data-table
              :headers="headers"
              :items="summaryRows"
              :mobile="smAndDown"
              hide-default-footer
              :items-per-page="-1"
              density="compact"
              class="elevation-1"
              data-testid="compare-summary"
            >
              <template #item.house="{ item }">
                <div class="d-flex align-center ga-2">
                  <span
                    class="legend-dot"
                    :style="{ backgroundColor: item.color }"
                    aria-hidden="true"
                  />
                  <span class="font-weight-medium" data-testid="compare-summary-house">
                    {{ item.house }}
                  </span>
                </div>
              </template>
              <template #item.current="{ item }">
                {{ formatCurrency(item.current) }}
              </template>
              <template #item.min="{ item }">
                {{ formatCurrency(item.min) }}
              </template>
              <template #item.max="{ item }">
                {{ formatCurrency(item.max) }}
              </template>
              <template #item.avg="{ item }">
                {{ formatCurrency(item.avg) }}
              </template>
            </v-data-table>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- Back -->
    <v-row class="mt-6">
      <v-col cols="12" class="text-center">
        <v-btn link color="primary" size="large" :to="localePath('/')">
          <v-icon start>mdi-arrow-left</v-icon>
          {{ $t('volverAlInicio') }}
        </v-btn>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { useSeoMeta } from '#imports'
import { format, parseISO } from 'date-fns'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'
import LineChart from '~/components/charts/LineChart.vue'
import type { EvolutionResponse } from '~/types/api'
import { buildComparisonChartData, type LabelledSeries, type PriceKind } from '~/utils/comparison'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { smAndDown } = useDisplay()
const { getEvolutionData, getProcessedExchangeData } = useApiService()
const route = useRoute()
const router = useRouter()

const MAX_HOUSES = 4

// Distinct, colour-blind-friendly palette; index N maps to dataset N.
const PALETTE = [
  '#42a5f5', // blue
  '#ef5350', // red
  '#66bb6a', // green
  '#ffa726', // orange
] as const

// Stable colour for dataset N (wraps; never undefined under noUncheckedIndexedAccess).
const colorAt = (i: number): string => PALETTE[i % PALETTE.length] ?? PALETTE[0]

// One row per processed exchange-house quote for "today". Only the fields the
// selector needs are read; the API payload carries more.
interface ExchangeRow {
  origin: string
  code: string
  localData?: { name?: string } | null
}

// State — seeded from the URL query so a shared/reloaded link restores the view.
const parseOriginsParam = (raw: unknown): string[] => {
  if (typeof raw !== 'string' || !raw) return []
  return [
    ...new Set(
      raw
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    ),
  ].slice(0, MAX_HOUSES)
}
const firstQueryValue = (raw: unknown): string =>
  Array.isArray(raw) ? (raw[0] ?? '') : typeof raw === 'string' ? raw : ''

const selectedCurrency = ref(firstQueryValue(route.query.moneda) || 'USD')
const selectedOrigins = ref<string[]>(parseOriginsParam(route.query.casas))
const priceKind = ref<PriceKind>(firstQueryValue(route.query.tipo) === 'buy' ? 'buy' : 'sell')

const tooManyHouses = computed(() => selectedOrigins.value.length > MAX_HOUSES)

// Mirror the current selection into the URL (replace, so it doesn't spam history).
// Client-only: the watcher is non-immediate, so SSR setup never redirects.
watch([selectedCurrency, selectedOrigins, priceKind], () => {
  router.replace({
    query: {
      ...route.query,
      moneda: selectedCurrency.value,
      casas: selectedOrigins.value.length ? selectedOrigins.value.join(',') : undefined,
      tipo: priceKind.value,
    },
  })
})

// --- Source data: the list of houses + the currencies they quote -------------
const { data: houseData } = await useAsyncData('compare-houses', async () => {
  const result = await getProcessedExchangeData('')
  const rows = (result?.exchangeData ?? []) as ExchangeRow[]
  return rows
})

// Currencies available across all houses (e.g. USD, EUR, ...).
const currencyOptions = computed(() => {
  const rows = houseData.value ?? []
  const codes = [...new Set(rows.map(r => r.code).filter(Boolean))]
  return codes.sort().map(code => ({ title: code, value: code }))
})

// Houses that quote the currently selected currency, as {title,value}.
const originOptions = computed(() => {
  const rows = houseData.value ?? []
  const seen = new Map<string, string>()
  for (const row of rows) {
    if (row.code !== selectedCurrency.value) continue
    if (!row.origin || seen.has(row.origin)) continue
    seen.set(row.origin, row.localData?.name || formatOriginName(row.origin))
  }
  return [...seen.entries()]
    .map(([value, title]) => ({ title, value }))
    .sort((a, b) => a.title.localeCompare(b.title))
})

const originName = (origin: string): string =>
  originOptions.value.find(o => o.value === origin)?.title || formatOriginName(origin)

// --- Evolution series for the selected houses --------------------------------
// Keyed by currency + sorted origins so switching either refetches.
const evolutionKey = computed(
  () => `compare-evo-${selectedCurrency.value}-${[...selectedOrigins.value].sort().join(',')}`
)

// NOT lazy on purpose: a shared/reloaded link carries the houses in the query,
// so we want the series resolved during SSR. That way the chart branch hydrates
// directly instead of flickering loading→chart on the client — the latter leaves
// the <ClientOnly> chart wrapper stuck on its fallback spinner. With no houses
// selected the handler returns [] instantly, so the default page stays fast.
const { data: evolutions, pending: loading } = await useAsyncData<EvolutionResponse[]>(
  'compare-evolutions',
  async () => {
    const origins = selectedOrigins.value.slice(0, MAX_HOUSES)
    if (origins.length === 0) return []

    const results = await Promise.all(
      origins.map(origin => getEvolutionData(origin, selectedCurrency.value))
    )
    // Drop any house whose fetch errored; keep strict typing on the rest.
    return results.filter(r => !r.error && r.data).map(r => r.data as EvolutionResponse)
  },
  { default: () => [], watch: [evolutionKey] }
)

// Reset house selection when the currency changes (a house may not quote it).
watch(selectedCurrency, () => {
  selectedOrigins.value = selectedOrigins.value.filter(o =>
    originOptions.value.some(opt => opt.value === o)
  )
})

// --- Chart -------------------------------------------------------------------
const labelledSeries = computed<LabelledSeries[]>(() =>
  (evolutions.value ?? []).map(evo => ({
    label: originName(evo.origin),
    points: evo.evolution,
  }))
)

const merged = computed(() => buildComparisonChartData(labelledSeries.value, priceKind.value))

const chartData = computed(() => ({
  labels: merged.value.labels.map(date => format(parseISO(date), 'dd/MM/yy')),
  datasets: merged.value.datasets.map((ds, i) => {
    const color = colorAt(i)
    return {
      label: ds.label,
      data: ds.data,
      borderColor: color,
      backgroundColor: color,
      tension: 0.2,
      spanGaps: true,
      fill: false,
      pointRadius: 2,
      pointHoverRadius: 5,
    }
  }),
}))

// Bump the key so chart.js fully recreates when structure changes.
const chartKey = computed(
  () => `${selectedCurrency.value}-${priceKind.value}-${selectedOrigins.value.join('|')}`
)

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  // No entrance animation. The chart unmounts/remounts on every selection change
  // (the `loading` branch swaps it out during each refetch), so an in-flight
  // animation frame can outlive its chart — Chart.js's Animator then calls
  // ctx.save() on the destroyed chart's nulled context and throws, leaving the
  // canvas blank until a reload. Updates already use update('none'); disabling
  // the create animation removes the Animator path entirely.
  animation: false as const,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: {
      display: true,
      position: 'top' as const,
      labels: { color: '#e0e0e0', usePointStyle: true, padding: 16 },
    },
    tooltip: {
      mode: 'index' as const,
      intersect: false,
      callbacks: {
        label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) => {
          const value = ctx.parsed.y
          if (typeof value !== 'number') return `${ctx.dataset.label}: -`
          return `${ctx.dataset.label}: ${formatCurrency(value)}`
        },
      },
    },
  },
  scales: {
    x: {
      ticks: { color: '#9e9e9e', maxTicksLimit: 12 },
      grid: { color: 'rgba(255, 255, 255, 0.08)' },
    },
    y: {
      ticks: {
        color: '#9e9e9e',
        callback: (value: string | number) =>
          typeof value === 'number' ? formatCurrency(value) : value,
      },
      grid: { color: 'rgba(255, 255, 255, 0.08)' },
    },
  },
}))

// --- Summary table -----------------------------------------------------------
interface SummaryRow {
  house: string
  color: string
  current: number
  min: number
  max: number
  avg: number
}

const summaryRows = computed<SummaryRow[]>(() =>
  (evolutions.value ?? []).map((evo, i) => {
    const stat = evo.statistics[priceKind.value]
    return {
      house: originName(evo.origin),
      color: colorAt(i),
      current: stat.current,
      min: stat.min,
      max: stat.max,
      avg: stat.avg,
    }
  })
)

const headers = computed(() => [
  { title: t('compare.house'), key: 'house', sortable: false },
  { title: t('compare.current'), key: 'current', sortable: true, align: 'end' as const },
  { title: t('compare.min'), key: 'min', sortable: true, align: 'end' as const },
  { title: t('compare.max'), key: 'max', sortable: true, align: 'end' as const },
  { title: t('compare.avg'), key: 'avg', sortable: true, align: 'end' as const },
])

// --- Helpers -----------------------------------------------------------------
const formatCurrency = (value: number): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-'
  return value.toLocaleString('es-UY', {
    style: 'currency',
    currency: 'UYU',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const formatOriginName = (origin: string): string => {
  if (!origin) return ''
  return origin.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// Branded OG image for the comparison page
defineOgImageComponent('Cambio', {
  title: () =>
    ({
      es: 'Comparar Casas de Cambio',
      en: 'Compare Exchange Houses',
      pt: 'Comparar Casas de Câmbio',
    })[locale.value as 'es' | 'en' | 'pt'],
  subtitle: () =>
    ({
      es: 'Superponé la evolución de varias casas en el tiempo',
      en: 'Overlay the evolution of several houses over time',
      pt: 'Sobreponha a evolução de várias casas ao longo do tempo',
    })[locale.value as 'es' | 'en' | 'pt'],
  tag: 'COMPARADOR',
  locale: locale.value as 'es' | 'en' | 'pt',
})

// SEO
useSeoMeta({
  title: () => t('seo.compareTitle'),
  description: () => t('seo.compareDescription'),
  keywords: () => t('seo.compareKeywords'),
  ogTitle: () => t('seo.compareTitle'),
  ogDescription: () => t('seo.compareDescription'),
  ogType: 'website',
  ogUrl: 'https://cambio-uruguay.com/comparar',
  twitterCard: 'summary_large_image',
  twitterTitle: () => t('seo.compareTitle'),
  twitterDescription: () => t('seo.compareDescription'),
})
</script>

<style scoped>
.chart-wrap {
  position: relative;
  height: 420px;
  width: 100%;
}

.bg-gradient-compare {
  background: linear-gradient(135deg, #1565c0 0%, #7b1fa2 100%);
}

.legend-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex: 0 0 auto;
}
</style>
