<template>
  <div>
    <!-- Exchange House Information Section -->
    <v-row v-if="evolutionData?.localData">
      <v-col cols="12">
        <v-card class="overflow-hidden" elevation="8">
          <div class="bg-gradient-to-r from-blue-600 to-purple-600 pa-3 on-dark">
            <v-row align="center" no-gutters>
              <v-col cols="12" md="8">
                <div class="d-flex align-top">
                  <v-avatar size="56" class="d-none d-md-flex me-4 bg-white">
                    <v-icon size="32" color="primary">mdi-bank</v-icon>
                  </v-avatar>
                  <div>
                    <p class="cu-eyebrow text-grey-lighten-2 mb-1">
                      📈 {{ $t('historicoCotizaciones') }}
                    </p>
                    <h1 class="text-h6 text-sm-h5 text-md-h4 font-weight-bold text-white">
                      {{
                        $t('historical.heading', {
                          currency: currencyLabel,
                          origin: exchangeHouseName,
                        })
                      }}
                    </h1>
                    <div class="d-flex flex-wrap ga-2 align-center mt-1">
                      <v-chip color="secondary" size="small">
                        {{ route.params.currency }}
                      </v-chip>
                      <v-chip v-if="route.params.type" color="accent" size="small">
                        {{ (route.params.type as string).toUpperCase() }}
                      </v-chip>
                    </div>
                    <div class="my-3">
                      <CollapsibleChips
                        :items="evolutionData.localData.departments"
                        :max-visible="2"
                        size="small"
                        text-color="white"
                        chip-class="me-1 mb-1"
                        icon="mdi-map-marker"
                        :icon-size="16"
                      />
                    </div>
                  </div>
                </div>
              </v-col>
              <v-col cols="12" md="4" class="text-center text-md-right">
                <div class="d-flex flex-column flex-md-row justify-start justify-md-end ga-2">
                  <v-btn
                    v-if="evolutionData.localData.website"
                    :href="evolutionData.localData.website"
                    target="_blank"
                    color="white"
                    variant="outlined"
                    size="small"
                    class="text-decoration-none"
                  >
                    <v-icon start>mdi-web</v-icon>
                    {{ $t('sitioWeb') }}
                  </v-btn>
                  <v-btn
                    v-if="evolutionData.localData.maps"
                    :href="evolutionData.localData.maps"
                    target="_blank"
                    color="white"
                    variant="outlined"
                    size="small"
                    class="text-decoration-none"
                  >
                    <v-icon start>mdi-map</v-icon>
                    {{ $t('ubicacion') }}
                  </v-btn>
                  <v-btn
                    v-if="evolutionData.localData.bcu"
                    :href="evolutionData.localData.bcu"
                    target="_blank"
                    color="white"
                    variant="outlined"
                    size="small"
                    class="text-decoration-none"
                  >
                    <v-icon start>mdi-shield-check</v-icon>
                    BCU
                  </v-btn>
                </div>
              </v-col>
            </v-row>
          </div>

          <!-- The answer, in server-rendered plain text: the figure the search
               query asked for, before any chart, selector or spinner. Suppressed
               entirely when the payload is incomplete — a finance page states no
               rate rather than a partial one. -->
          <v-card-text v-if="answerFacts" class="cu-answer pa-4">
            <p class="text-body-1 mb-0">
              {{ answerSentence }}
              <time :datetime="answerFacts.asOf" class="text-medium-emphasis">
                {{ $t('historical.asOf', { date: asOfDate }) }}
              </time>
            </p>

            <!-- Records for THIS casa and THIS currency: facts no single-rate
                 competitor can publish, and unique text per URL, which is what
                 the near-identical templates lacked. -->
            <dl v-if="periodRecords" class="cu-records mt-4 mb-0">
              <div class="cu-record">
                <dt>{{ $t('records.max') }}</dt>
                <dd>
                  ${{ formatRate(periodRecords.max.value, localeTag) }}
                  <span class="text-medium-emphasis">
                    · {{ formatDay(periodRecords.max.date) }}
                  </span>
                </dd>
              </div>
              <div class="cu-record">
                <dt>{{ $t('records.min') }}</dt>
                <dd>
                  ${{ formatRate(periodRecords.min.value, localeTag) }}
                  <span class="text-medium-emphasis">
                    · {{ formatDay(periodRecords.min.date) }}
                  </span>
                </dd>
              </div>
              <div v-if="periodRecords.biggest" class="cu-record">
                <dt>{{ $t('records.biggestMove') }}</dt>
                <dd>
                  {{ formatChangePct(periodRecords.biggest.pct, localeTag) }} %
                  <span class="text-medium-emphasis">
                    · {{ formatDay(periodRecords.biggest.date) }}
                  </span>
                </dd>
              </div>
              <div v-if="periodRecords.daysSinceHigh !== null" class="cu-record">
                <dt>{{ $t('records.daysSinceHigh') }}</dt>
                <dd>{{ $t('records.days', { days: periodRecords.daysSinceHigh }) }}</dd>
              </div>
            </dl>
            <p v-if="streakSentence" class="text-body-2 text-medium-emphasis mt-2 mb-0">
              {{ streakSentence }}
            </p>
          </v-card-text>

          <!-- Additional Info Bar -->
          <v-card-text class="bg-grey-lighten-5 pa-4">
            <v-row align="center">
              <v-col cols="12" md="6">
                <div class="d-flex align-center">
                  <v-icon color="success" class="me-2">mdi-check-circle</v-icon>
                  <span class="text-body-2 font-weight-medium">
                    {{ $t('institucionRegulada') }}
                  </span>
                </div>
              </v-col>
              <v-col cols="12" md="6" class="text-md-right">
                <div class="d-flex align-center justify-start justify-md-end">
                  <v-icon color="info" class="me-2">mdi-information</v-icon>
                  <span class="text-body-2">
                    {{ $t('datosHistoricosDisponibles') }}
                  </span>
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Period Selection -->
    <v-row class="mb-4">
      <v-col cols="12" md="6" offset-md="3">
        <v-card>
          <v-card-text>
            <v-row align="center">
              <v-col cols="12" sm="6">
                <v-icon start color="primary">mdi-calendar-range</v-icon>
                <span class="text-h6">Período de Análisis:</span>
              </v-col>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="selectedPeriod"
                  :items="periodOptions"
                  item-title="text"
                  item-value="value"
                  variant="outlined"
                  density="compact"
                  :loading="loading"
                  hide-details
                  @update:model-value="onPeriodChange"
                >
                  <template #prepend-inner>
                    <v-icon color="primary">mdi-clock-outline</v-icon>
                  </template>
                </v-select>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Loading State -->
    <v-row v-if="loading">
      <v-col cols="12" class="text-center">
        <v-progress-circular indeterminate color="primary" size="64" />
        <p class="mt-4 text-h6">{{ $t('cargandoDatosHistoricos') }}</p>
      </v-col>
    </v-row>

    <!-- Error State -->
    <v-row v-else-if="error">
      <v-col cols="12">
        <v-alert type="error" prominent class="ma-4">
          <h3>{{ $t('errorCargarDatos') }}</h3>
          <p>{{ error.message || error }}</p>
          <v-btn color="error" variant="text" @click="refresh">
            {{ $t('reintentar') }}
          </v-btn>
        </v-alert>
      </v-col>
    </v-row>

    <!-- Main Content -->
    <div v-else-if="evolutionData">
      <!-- Statistics Cards -->
      <v-row class="mb-6">
        <v-col cols="12" md="3" sm="6">
          <v-card class="text-center bg-green-darken-4">
            <v-card-title class="justify-center text-white">
              <v-icon start color="white">mdi-trending-up</v-icon>
              {{ $t('compraActual') }}
            </v-card-title>
            <v-card-text class="text-white">
              <div class="text-h5 text-md-h4 font-weight-bold">
                {{ formatCurrency((evolutionData as any)?.statistics?.buy?.current || 0) }}
              </div>
              <div class="caption">
                Cambio:
                {{ formatPercentage((evolutionData as any)?.statistics?.buy?.change || 0) }}%
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3" sm="6">
          <v-card class="text-center bg-red-darken-4">
            <v-card-title class="justify-center text-white">
              <v-icon start color="white">mdi-trending-down</v-icon>
              {{ $t('ventaActual') }}
            </v-card-title>
            <v-card-text class="text-white">
              <div class="text-h5 text-md-h4 font-weight-bold">
                {{ formatCurrency((evolutionData as any)?.statistics?.sell?.current || 0) }}
              </div>
              <div class="caption">
                {{ $t('cambio') }}:
                {{ formatPercentage((evolutionData as any)?.statistics?.sell?.change || 0) }}%
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3" sm="6">
          <v-card class="text-center bg-blue-darken-4">
            <v-card-title class="justify-center text-white">
              <v-icon start color="white">mdi-chart-line</v-icon>
              {{ $t('promedioCompra') }}
            </v-card-title>
            <v-card-text class="text-white">
              <div class="text-h5 text-md-h4 font-weight-bold">
                {{ formatCurrency((evolutionData as any)?.statistics?.buy?.avg || 0) }}
              </div>
              <div class="caption">
                Min:
                {{ formatCurrency((evolutionData as any)?.statistics?.buy?.min || 0) }}
                | Max:
                {{ formatCurrency((evolutionData as any)?.statistics?.buy?.max || 0) }}
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3" sm="6">
          <v-card class="text-center bg-blue-darken-4">
            <v-card-title class="justify-center text-white">
              <v-icon start color="white">mdi-database</v-icon>
              {{ $t('datosTotales') }}
            </v-card-title>
            <v-card-text class="text-white">
              <div class="text-h5 text-md-h4 font-weight-bold">
                {{ (evolutionData as any)?.statistics?.totalDataPoints || 0 }}
              </div>
              <div class="caption">
                {{ formatDateRange() }}
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- AI Trend Analysis -->
      <v-row class="mb-6">
        <v-col cols="12">
          <AITrendCard
            :insight="aiInsight"
            :loading="aiLoading"
            :error="aiError"
            @analyze="requestAIAnalysis"
          />
        </v-col>
      </v-row>

      <!-- Chart Section -->
      <v-row class="mb-6">
        <v-col cols="12">
          <v-card>
            <v-card-title class="d-flex align-center flex-wrap ga-3 py-3">
              <v-icon start>mdi-chart-line</v-icon>
              {{ $t('evolucionCotizaciones') }} - {{ route.params.currency }}
              <v-spacer />
              <v-btn-toggle v-model="chartType" mandatory density="compact">
                <v-btn
                  variant="outlined"
                  size="small"
                  value="line"
                  :aria-label="$t('chartTypeLine')"
                >
                  <v-icon size="small">mdi-chart-line</v-icon>
                </v-btn>
                <v-btn variant="outlined" size="small" value="bar" :aria-label="$t('chartTypeBar')">
                  <v-icon size="small">mdi-chart-bar</v-icon>
                </v-btn>
              </v-btn-toggle>
            </v-card-title>
            <v-card-text>
              <div
                :class="['chart-container']"
                role="img"
                :aria-label="`${$t('evolucionCotizaciones')} - ${route.params.currency}`"
                style="position: relative; height: 400px"
              >
                <Line
                  v-if="chartType === 'line'"
                  :data="chartData"
                  :options="chartOptions"
                  style="position: absolute; top: 0; left: 0; width: 100%; height: 100%"
                />
                <Bar
                  v-else
                  :data="chartData"
                  :options="chartOptions"
                  style="position: absolute; top: 0; left: 0; width: 100%; height: 100%"
                />
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Data Table -->
      <v-row>
        <v-col cols="12">
          <v-card>
            <v-card-title>
              <v-icon start>mdi-table</v-icon>
              {{ $t('datosDetallados') }}
              <v-spacer />
              <v-text-field
                v-model="search"
                append-inner-icon="mdi-magnify"
                :label="$t('buscarPorFecha')"
                single-line
                hide-details
                density="compact"
              />
            </v-card-title>
            <v-data-table
              :headers="headers"
              :items="tableData"
              :mobile="smAndDown"
              :search="search"
              :items-per-page="25"
              :items-per-page-options="[
                { value: 10, title: '10' },
                { value: 25, title: '25' },
                { value: 50, title: '50' },
                { value: 100, title: '100' },
              ]"
              class="elevation-1"
              density="compact"
            >
              <template #item.date="{ item }">
                <span>{{ formatDate((item as any).date) }}</span>
              </template>
              <template #item.buy="{ item }">
                <v-chip :color="getBuyColor((item as any).buy)" variant="flat" size="small">
                  {{ formatCurrency((item as any).buy) }}
                </v-chip>
              </template>
              <template #item.sell="{ item }">
                <v-chip :color="getSellColor((item as any).sell)" variant="flat" size="small">
                  {{ formatCurrency((item as any).sell) }}
                </v-chip>
              </template>
              <template #item.spread="{ item }">
                <span>{{ formatCurrency((item as any).spread) }}</span>
              </template>
              <template #item.type="{ item }">
                <v-chip v-if="(item as any).type" size="small" variant="outlined">
                  {{ (item as any).type }}
                </v-chip>
                <span v-else>-</span>
              </template>
            </v-data-table>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- Data-grounded FAQ for this currency + scoped FAQPage JSON-LD -->
    <FaqBlock v-if="currencyFaqItems.length" :items="currencyFaqItems" :heading="$t('faq.title')" />

    <!-- Up-link to the casa hub. This leaf is the site's highest-impression
         page; /casa/[origin] is the page meant to win the "cambio {casa}" brand
         query and had almost no inbound internal links. Worded differently from
         the up-links on /historico/[origin] and /sucursales/[origin] so three
         pages do not repeat one anchor. -->
    <v-row class="mt-6">
      <v-col v-if="evolutionData?.localData" cols="12" class="text-center">
        <v-btn
          link
          class="mb-4"
          color="primary"
          variant="tonal"
          size="large"
          :to="localePath(`/casa/${route.params.origin}`)"
        >
          <v-icon start>mdi-storefront-outline</v-icon>
          {{ $t('casaPage.fromHistorico', { casa: exchangeHouseName }) }}
        </v-btn>
      </v-col>
      <v-col cols="12" class="text-center">
        <v-btn link class="mb-4" color="primary" variant="text" :to="localePath('/')">
          <v-icon start>mdi-arrow-left</v-icon>
          {{ $t('volverAlInicio') }}
        </v-btn>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { useSeoMeta } from '#imports'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js'
import { format, parseISO } from 'date-fns'
import { computed, ref } from 'vue'
import { Bar, Line } from 'vue-chartjs'
import { useRoute, useRouter } from 'vue-router'
import { currencyFaqIds, type FaqItem } from '~/utils/faqAnswers'
import { useDisplay } from 'vuetify'
import { markPoints } from '~/utils/chartMoveMarkers'
import { attributeMove } from '~/utils/attribution'
import { historyDetailCanonicalPath } from '~/utils/historyCanonical'
import {
  biggestMove,
  computeRecords,
  computeStreak,
  daysSinceHigh,
  sanitizeSeries,
} from '~/utils/rateStats'
import { currencyDisplayName, currencyFromSlug, type CurrencyLang } from '~/utils/currencyPages'
import {
  factsFromRows,
  formatChangePct,
  formatRate,
  rateAnswerFacts,
  selectTypeRows,
  type EvolutionRow,
  type EvolutionStatistics,
} from '~/utils/rateAnswer'

const { smAndDown } = useDisplay()
const { t } = useI18n()
const localePath = useLocalePath()

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
)
// Define types
interface EvolutionItem {
  date: string
  buy: number
  sell: number
  type?: string
  name?: string
}

interface Statistics {
  buy: {
    current: number
    change: number
    avg: number
    min: number
    max: number
  }
  sell: {
    current: number
    change: number
    avg: number
    min: number
    max: number
  }
  totalDataPoints: number
  dateRange: {
    start: string
    end: string
  }
}

interface LocalData {
  name: string
  website: string
  maps: string
  bcu: string
  departments: string[]
}

interface EvolutionData {
  evolution: EvolutionItem[]
  statistics: Statistics
  localData: LocalData
}

// Route validation
definePageMeta({
  validate: route => {
    return !!(route.params.origin && route.params.currency)
  },
})

// Router and route
const router = useRouter()
const route = useRoute()

// Get API service and loading composable
const { getEvolutionData } = useApiService()
const { withLoading } = useLoading()

// AI Insights
const { loading: aiLoading, error: aiError, insight: aiInsight, getTrendAnalysis } = useAIInsights()

const { locale } = useI18n()

/** BCP-47 tag for number/date formatting: the site's audience is Uruguay. */
const localeTag = computed(() =>
  locale.value?.startsWith('en') ? 'en-US' : locale.value?.startsWith('pt') ? 'pt-BR' : 'es-UY'
)

// Data-grounded FAQ for this currency (rate/buy/sell of route.params.currency),
// rendered with its own scoped FAQPage JSON-LD via FaqBlock.
const { data: faqData } = await useFetch<{ generatedAt: string; items: FaqItem[] }>('/api/faq', {
  query: { lang: locale },
  default: () => ({ generatedAt: '', items: [] as FaqItem[] }),
})
const currencyFaqItems = computed(() => {
  const ids = currencyFaqIds(String(route.params.currency ?? '').toUpperCase())
  return (faqData.value?.items ?? []).filter(i => ids.includes(i.id))
})

const requestAIAnalysis = async () => {
  const lang = locale.value?.startsWith('en') ? 'en' : locale.value?.startsWith('pt') ? 'pt' : 'es'
  await getTrendAnalysis(route.params.currency as string, lang, route.params.origin as string)
}

// Reactive state
const chartType = ref('line')
const search = ref('')
const selectedPeriod = ref(6) // Default to 6 months

// Phase 3: inline move markers + attribution, gated to currencies the
// analysis backend actually supports. Any other currency (or a failed
// fetch) leaves the chart exactly as it was before this feature — no
// markers, no extra tooltip line, no thrown errors.
const ANALYSIS_SUPPORTED = new Set(['USD', 'EUR', 'ARS'])
const currencyUpper = computed(() => String(route.params.currency ?? '').toUpperCase())
const analysisSupported = computed(() => ANALYSIS_SUPPORTED.has(currencyUpper.value))

interface AnalysisMove {
  date: string
  pctChange: number
  direction: 'up' | 'down' | 'flat'
}
interface AnalysisResponse {
  moves: AnalysisMove[]
}
interface DriversResponse {
  drivers: { key: string; label: string; source: string }[]
  series: { key: string; points: { date: string; value: number }[] }[]
}

const { data: analysisData } = useLazyAsyncData<AnalysisResponse | null>(
  `historico-analysis-${currencyUpper.value}`,
  async () => {
    if (!analysisSupported.value) return null
    return await $fetch<AnalysisResponse>(`/api/analysis/${currencyUpper.value}`).catch(() => null)
  }
)

const { data: driversData } = useLazyAsyncData<DriversResponse | null>(
  `historico-drivers-${currencyUpper.value}`,
  async () => {
    if (!analysisSupported.value) return null
    return await $fetch<DriversResponse>('/api/drivers').catch(() => null)
  }
)

const moves = computed<AnalysisMove[]>(() => analysisData.value?.moves ?? [])
const driverLabels = computed<Record<string, string>>(() =>
  Object.fromEntries((driversData.value?.drivers ?? []).map(d => [d.key, d.label]))
)
const driverSeriesArr = computed(() => driversData.value?.series ?? [])

// Period options
const periodOptions = computed(() => [
  { text: t('tresMeses'), value: 3 },
  { text: t('seisMeses'), value: 6 },
  { text: t('doceMeses'), value: 12 },
  { text: t('veinticuatroMeses'), value: 24 },
])

// Table headers
const headers = computed(() => [
  { title: t('fechaLabel'), key: 'date', sortable: true },
  { title: t('compra'), key: 'buy', sortable: true },
  { title: t('venta'), key: 'sell', sortable: true },
  { title: 'Spread', key: 'spread', sortable: true },
  { title: t('tipoLabel'), key: 'type', sortable: false },
  { title: t('nombre'), key: 'name', sortable: false },
])

// Utility function to format origin name
const formatOriginName = (origin: string): string => {
  if (!origin) return ''
  return origin.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// Load period from storage/query on client
const loadPeriodFromStorage = () => {
  // First check URL query parameter
  const queryPeriod = route.query.period
  if (queryPeriod) {
    const period = Number.parseInt(queryPeriod as string)
    if ([3, 6, 12, 24].includes(period)) {
      selectedPeriod.value = period
      savePeriodToStorage(period)
      return
    }
  }

  // If no valid query parameter, check localStorage
  if (typeof window !== 'undefined') {
    const savedPeriod = localStorage.getItem('cambio-uruguay-period')
    if (savedPeriod) {
      const period = Number.parseInt(savedPeriod)
      if ([3, 6, 12, 24].includes(period)) {
        selectedPeriod.value = period
        updateUrlQuery(period)
      }
    }
  }
}

// Initialize period on client-side
onMounted(() => {
  loadPeriodFromStorage()
})

onBeforeMount(() => {
  const queryPeriod = route.query.period
  if (queryPeriod) {
    const period = Number.parseInt(queryPeriod as string)
    if ([3, 6, 12, 24].includes(period)) {
      selectedPeriod.value = period
    }
  }
})

// Blocking (not lazy) on purpose: this is the site's highest-impression
// template, and with a lazy fetch the server rendered a spinner — the casa name,
// the rate, the table and the whole header block sit behind `v-if="evolutionData"`.
// Googlebot, AI crawlers and the SERP snippet saw none of it. The payload is one
// small JSON document from an endpoint that is already cached upstream; the
// heavy `/api/analysis` and `/api/drivers` overlays stay lazy below.
const {
  data: evolutionData,
  error,
  pending: loading,
  refresh,
} = await useAsyncData(
  `evolution-${route.params.origin}-${route.params.currency}-${route.params.type || 'default'}`,
  async () => {
    const { origin, currency, type } = route.params
    let period = route.query.period ? Number.parseInt(route.query.period as string) : 6
    if (Number.isNaN(period) || ![3, 6, 12, 24].includes(period)) {
      period = 6 // Default to 6 months if invalid
    }

    return await withLoading(async () => {
      const result = await getEvolutionData(
        origin as string,
        currency as string,
        type as string | undefined,
        period
      )

      if (result.error) {
        throw createError({
          statusCode: 500,
          statusMessage: result.error.message || 'Error loading evolution data',
        })
      }

      return result.data as EvolutionData
    }, 'Cargando datos históricos...')
  }
)

// Watch for changes in the period query parameter
watch(
  () => route.query.period,
  (newPeriod, oldPeriod) => {
    if (newPeriod !== oldPeriod && newPeriod !== undefined) {
      route.query.period = newPeriod
      // Trigger your refresh logic here
      withLoading(async () => {
        await refresh()
      }, 'Actualizando período...')
    }
  }
)

// Dynamic names for SEO
const exchangeHouseName = computed(() => {
  return evolutionData.value?.localData?.name || formatOriginName(route.params.origin as string)
})

// Currency codes (usd/eur/brl/ars/xau…) read better uppercased in the title,
// H1 and breadcrumb ("BROU USD hoy" not "BROU usd hoy").
const currencyName = computed(() => String(route.params.currency ?? '').toUpperCase())

// This route serves USD, EUR, BRL, ARS, XAU… so the H1 and the answer sentence
// must name the actual currency ("el dólar", "o real"), never a hardcoded one.
const currencyLabel = computed(() => {
  const code = currencyFromSlug(String(route.params.currency ?? ''))
  if (!code) return currencyName.value
  return currencyDisplayName(code, locale.value as CurrencyLang)
})

// The facts the SSR answer block states, or null when the payload is incomplete
// — in which case the page renders its generic copy instead of a partial rate.
// Built from the evolution ROWS of a single rate type, not the API's
// `statistics`: /evolution/brou/USD interleaves eBROU and plain rows, so
// `statistics.current` is whichever type sorts last (eBROU's 40,90) while
// /casa/brou shows the walk-in 41,40 — the same casa, two rates. Falls back to
// `statistics` when the payload has no rows to select from.
const answerFacts = computed(() => {
  const payload = evolutionData.value as {
    statistics?: EvolutionStatistics
    evolution?: EvolutionRow[]
  } | null
  const rows = payload?.evolution
  const periodMonths = payload?.statistics?.dateRange?.periodMonths
  const fromRows = rows?.length
    ? factsFromRows(rows, route.params.type as string | undefined, periodMonths)
    : null
  return fromRows ?? rateAnswerFacts(payload?.statistics)
})

/** Render an ISO date as `DD/MM/AAAA` in Montevideo. */
const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString(localeTag.value, {
    timeZone: 'America/Montevideo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

/** The most recent date in the series, as `DD/MM/AAAA` in Montevideo. */
const asOfDate = computed(() => (answerFacts.value ? formatDay(answerFacts.value.asOf) : ''))

// Records over the selected period, from this casa's sell prices for the ONE
// rate type the page is about. `sanitizeSeries` drops decimal-shift artefacts
// first: a scraper glitch must never be published as "el máximo del período" on
// a finance page. Unique per casa and per currency, which is the point — the
// thin, near-identical templates are what Google declined to index.
const sellSeries = computed(() => {
  const rows = (evolutionData.value as { evolution?: EvolutionRow[] } | null)?.evolution ?? []
  const typed = selectTypeRows(rows, route.params.type as string | undefined)
  return sanitizeSeries(
    typed
      .map(r => ({ date: r.date, value: r.sell }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  )
})

const periodRecords = computed(() => {
  const series = sellSeries.value
  // Two points cannot establish a record worth publishing.
  if (series.length < 3) return null
  const records = computeRecords(series)
  if (!records.max || !records.min) return null
  return {
    max: records.max,
    min: records.min,
    streak: computeStreak(series),
    biggest: biggestMove(series),
    daysSinceHigh: daysSinceHigh(series),
  }
})

/** "subió 3 días seguidos" / "bajó 2 días seguidos" / "" when flat. */
const streakSentence = computed(() => {
  const r = periodRecords.value
  if (!r || r.streak.direction === 'flat' || r.streak.days < 1) return ''
  return t(r.streak.direction === 'up' ? 'records.streakUp' : 'records.streakDown', {
    days: r.streak.days,
  })
})

// The answer sentence, server-rendered as plain text above the chart. Built from
// i18n params so es/en/pt all read naturally.
const answerSentence = computed(() => {
  const f = answerFacts.value
  if (!f) return ''
  return t('historical.answer', {
    currency: currencyLabel.value,
    origin: exchangeHouseName.value,
    date: asOfDate.value,
    sell: formatRate(f.sell, localeTag.value),
    buy: formatRate(f.buy, localeTag.value),
    months: f.periodMonths,
    change: formatChangePct(f.changePct, localeTag.value),
    max: formatRate(f.maxSell, localeTag.value),
    min: formatRate(f.minSell, localeTag.value),
  })
})

// Computed properties
const tableData = computed(() => {
  if (!(evolutionData.value as any)?.evolution) return []

  return (evolutionData.value as any).evolution
    .map((item: EvolutionItem) => ({
      ...item,
      spread: item.sell - item.buy,
      date: item.date,
    }))
    .reverse() // Show most recent first
})

const chartData = computed(() => {
  if (!(evolutionData.value as any)?.evolution) return { labels: [], datasets: [] }

  const evolution = (evolutionData.value as any).evolution
  const labels = evolution.map((item: EvolutionItem) => format(parseISO(item.date), 'MM/yyyy'))
  const dates = evolution.map((item: EvolutionItem) => item.date)
  // Chart.js's PointElement routes an unset pointBackgroundColor to the
  // dataset's own `backgroundColor` (the translucent rgba, NOT borderColor).
  // Pass that exact value as the default so a day with no move renders
  // pixel-identical to before this feature; only matched days get the
  // fully-opaque up/down marker color.
  const buyMarks = markPoints(dates, moves.value, 'rgba(75, 192, 192, 0.2)')
  const sellMarks = markPoints(dates, moves.value, 'rgba(255, 99, 132, 0.2)')

  return {
    labels,
    datasets: [
      {
        label: t('precioCompra'),
        data: evolution.map((item: EvolutionItem) => item.buy),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
        fill: false,
        pointRadius: buyMarks.pointRadius,
        pointBackgroundColor: buyMarks.pointBackgroundColor,
        // +2 over each point's own radius so hovering never shrinks a
        // highlighted move marker (was a flat 5, smaller than the marker's 6).
        pointHoverRadius: buyMarks.pointRadius.map(r => r + 2),
      },
      {
        label: t('precioVenta'),
        data: evolution.map((item: EvolutionItem) => item.sell),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1,
        fill: false,
        pointRadius: sellMarks.pointRadius,
        pointBackgroundColor: sellMarks.pointBackgroundColor,
        pointHoverRadius: sellMarks.pointRadius.map(r => r + 2),
      },
    ],
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  elements: {
    line: {
      tension: 0.1,
    },
    point: {
      radius: 3,
      hoverRadius: 5,
    },
  },
  plugins: {
    title: {
      display: true,
      text: `${t('evolucion')} ${route.params.currency} - ${(evolutionData.value as EvolutionData)?.localData.name}`,
      color: '#1976d2',
      font: {
        size: 16,
        weight: 'bold' as const,
      },
    },
    legend: {
      display: true,
      position: 'top' as const,
      labels: {
        color: '#1976d2',
        usePointStyle: true,
        padding: 20,
      },
    },
    tooltip: {
      mode: 'index' as const,
      intersect: false,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#ffffff',
      bodyColor: '#ffffff',
      borderColor: '#1976d2',
      borderWidth: 1,
      callbacks: {
        title: (context: any) => {
          // Include year in the tooltip title
          const dataIndex = context[0].dataIndex
          const evolution = (evolutionData.value as any).evolution
          const date = evolution[dataIndex].date
          return format(parseISO(date), 'dd/MM/yyyy')
        },
        label: (context: any) => {
          // Use inline formatting to avoid referencing this
          const value = context.parsed.y
          if (typeof value !== 'number') return `${context.dataset.label}: -`
          return `${context.dataset.label}: ${value.toLocaleString('es-UY', {
            style: 'currency',
            currency: 'UYU',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`
        },
        afterBody: (context: any) => {
          const dataIndex = context[0]?.dataIndex
          if (dataIndex === undefined) return []
          const evolution = (evolutionData.value as any)?.evolution ?? []
          const date = evolution[dataIndex]?.date
          if (!date) return []
          const dayDate = String(date).slice(0, 10)
          const isMoveDay = moves.value.some(m => m.date === dayDate)
          if (!isMoveDay) return []
          const top = attributeMove(dayDate, driverSeriesArr.value).slice(0, 3)
          if (!top.length) return []
          return [
            '',
            `${t('historicoMoveAttribution')}:`,
            ...top.map(
              d =>
                `${driverLabels.value[d.key] ?? d.key} ${d.dayMovePct >= 0 ? '+' : ''}${d.dayMovePct.toFixed(1)}%`
            ),
          ]
        },
      },
    },
  },
  scales: {
    x: {
      type: 'category' as const,
      display: true,
      title: {
        display: true,
        text: 'Fecha',
        color: '#1976d2',
        font: {
          size: 14,
          weight: 'bold' as const,
        },
      },
      ticks: {
        color: '#666666',
      },
      grid: {
        color: 'rgba(25, 118, 210, 0.1)',
        drawOnChartArea: true,
      },
    },
    y: {
      type: 'linear' as const,
      display: true,
      title: {
        display: true,
        text: 'Precio (UYU)',
        color: '#1976d2',
        font: {
          size: 14,
          weight: 'bold' as const,
        },
      },
      ticks: {
        color: '#666666',
        callback: (value: any) => {
          // Use inline formatting to avoid referencing this
          if (typeof value !== 'number') return value
          return value.toLocaleString('es-UY', {
            style: 'currency',
            currency: 'UYU',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        },
      },
      grid: {
        color: 'rgba(25, 118, 210, 0.1)',
        drawOnChartArea: true,
      },
    },
  },
}))

// Methods
const savePeriodToStorage = (period: number) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('cambio-uruguay-period', period.toString())
  }
}

const updateUrlQuery = (period: number) => {
  // Update URL query parameter without navigation
  if (route.query && Number.parseInt(route.query.period as string) === period) return
  const query = { period: period.toString() }
  router.replace({ query })
}

const onPeriodChange = async () => {
  // Save to localStorage and update URL
  savePeriodToStorage(selectedPeriod.value)
  updateUrlQuery(selectedPeriod.value)
}

const formatCurrency = (value: number): string => {
  if (typeof value !== 'number') return '-'
  return value.toLocaleString('es-UY', {
    style: 'currency',
    currency: 'UYU',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const formatPercentage = (value: number): string => {
  if (typeof value !== 'number') return '0.00'
  return value.toFixed(2)
}

const formatDate = (dateString: string): string => {
  return format(parseISO(dateString), 'dd/MM/yyyy')
}

const formatDateRange = (): string => {
  if (!(evolutionData.value as any)?.statistics?.dateRange) return ''
  const { start, end } = (evolutionData.value as any).statistics.dateRange
  return `${format(parseISO(start), 'dd/MM/yy')} - ${format(parseISO(end), 'dd/MM/yy')}`
}

const getBuyColor = (value: number): string => {
  const stats = (evolutionData.value as any)?.statistics?.buy
  if (!stats) return 'grey'

  const range = stats.max - stats.min
  const position = (value - stats.min) / range

  if (position > 0.7) return 'red-darken-2'
  if (position > 0.3) return 'orange-darken-2'
  return 'green-darken-2'
}

const getSellColor = (value: number): string => {
  const stats = (evolutionData.value as any)?.statistics?.sell
  if (!stats) return 'grey'

  const range = stats.max - stats.min
  const position = (value - stats.min) / range

  if (position > 0.7) return 'red-darken-2'
  if (position > 0.3) return 'orange-darken-2'
  return 'green-darken-2'
}

// SEO Configuration with dynamic values
// Lead the snippet with this casa's actual numbers — the rate is what the query
// asked for. The rate lives in the description, never the <title>: a title is
// cached in the SERP for weeks and would go stale, while Google refreshes a
// description. Falls back to the generic sentence when the payload is short.
const seoDescription = computed(() => {
  const f = answerFacts.value
  if (!f) {
    return t('seo.historicalDetailDescription', {
      origin: exchangeHouseName.value,
      currency: currencyName.value,
    })
  }
  return t('seo.historicalDetailDescriptionLive', {
    origin: exchangeHouseName.value,
    currency: currencyLabel.value,
    sell: formatRate(f.sell, localeTag.value),
    buy: formatRate(f.buy, localeTag.value),
  })
})

useSeoMeta({
  title: () =>
    t('seo.historicalDetailTitle', {
      origin: exchangeHouseName.value,
      currency: currencyName.value,
    }),
  description: () => seoDescription.value,
  keywords: () => t('seo.historicalDetailKeywords'),
  ogTitle: () =>
    t('seo.historicalDetailTitle', {
      origin: exchangeHouseName.value,
      currency: currencyName.value,
    }),
  ogDescription: () => seoDescription.value,
  ogType: 'website',
  // Matches <link rel=canonical>: a type variant shares the base page's og:url.
  ogUrl: () => historicalCanonical.value,
  twitterCard: 'summary_large_image',
  twitterTitle: () =>
    t('seo.historicalDetailTitle', {
      origin: exchangeHouseName.value,
      currency: currencyName.value,
    }),
  twitterDescription: () =>
    t('seo.historicalDetailDescription', {
      origin: exchangeHouseName.value,
      currency: currencyName.value,
    }),
  ogImageAlt: () =>
    t('seo.historicalDetailTitle', {
      origin: exchangeHouseName.value,
      currency: currencyName.value,
    }),
  twitterImageAlt: () =>
    t('seo.historicalDetailTitle', {
      origin: exchangeHouseName.value,
      currency: currencyName.value,
    }),
})

// Branded, copyright-free OG image (1200x630) generated server-side by
// nuxt-og-image. This page previously declared summary_large_image but shipped
// no image, so social/Search previews had no visual.
defineOgImageComponent('Cambio', {
  title: () =>
    t('seo.historicalDetailTitle', {
      origin: exchangeHouseName.value,
      currency: currencyName.value,
    }),
  tag: () => currencyName.value,
  locale: locale.value as 'es' | 'en' | 'pt',
})

// The one URL that represents this page. BILLETE/CABLE/INTERBANCARIO are
// alternate views of the same series and fold into the base, so Google
// consolidates their signals instead of splitting them across near-duplicates;
// eBROU is a distinct product and stays self-canonical.
//
// Used for <link rel=canonical>, og:url, the BreadcrumbList trail and the
// Dataset url, so structured data never points somewhere the canonical does not.
const historicalCanonical = computed(
  () =>
    `https://cambio-uruguay.com${historyDetailCanonicalPath(
      String(route.params.origin),
      String(route.params.currency),
      route.params.type as string | undefined
    )}`
)
useHead(() => ({
  // Overrides the self-canonical that @nuxtjs/i18n's useLocaleHead emits from
  // the layout — it keys the tag `i18n-can`, so reuse that key or both render.
  link: [
    {
      key: 'i18n-can',
      hid: 'i18n-can',
      rel: 'canonical',
      href: historicalCanonical.value,
    },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: t('inicio'),
            item: 'https://cambio-uruguay.com/',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: t('historico'),
            item: 'https://cambio-uruguay.com/historico',
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: exchangeHouseName.value,
            item: `https://cambio-uruguay.com/historico/${route.params.origin}`,
          },
          {
            '@type': 'ListItem',
            position: 4,
            name: currencyName.value,
            item: historicalCanonical.value,
          },
        ],
      }),
    },
    {
      // Dataset schema for the historical time series → Google Dataset Search /
      // dataset rich results. Describes the buy/sell series without depending on
      // the (lazy) fetched numbers; temporalCoverage is added only when loaded.
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: t('seo.historicalDetailTitle', {
          origin: exchangeHouseName.value,
          currency: currencyName.value,
        }),
        description: t('seo.historicalDetailDescription', {
          origin: exchangeHouseName.value,
          currency: currencyName.value,
        }),
        url: historicalCanonical.value,
        isAccessibleForFree: true,
        creator: {
          '@type': 'Organization',
          name: 'Cambio Uruguay',
          url: 'https://cambio-uruguay.com',
        },
        keywords: [currencyName.value, exchangeHouseName.value, 'cotización', 'Uruguay', 'BCU'],
        variableMeasured: [
          { '@type': 'PropertyValue', name: t('compra'), unitText: 'UYU' },
          { '@type': 'PropertyValue', name: t('venta'), unitText: 'UYU' },
        ],
        ...(tableData.value.length
          ? {
              temporalCoverage: `${String(tableData.value[tableData.value.length - 1].date).slice(0, 10)}/${String(tableData.value[0].date).slice(0, 10)}`,
            }
          : {}),
      }),
    },
  ],
}))
</script>

<style scoped>
.chart-container {
  position: relative;
  height: 400px;
  width: 100%;
}

.caption {
  font-size: 0.875rem;
  opacity: 0.8;
}

/* Gradient background for exchange house info */
.bg-gradient-to-r {
  background: linear-gradient(135deg, #1565c0 0%, #42a5f5 100%);
  position: relative;
  overflow: hidden;
}

.bg-gradient-to-r::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 40% 80%, rgba(255, 255, 255, 0.05) 0%, transparent 50%);
  pointer-events: none;
}

/* Animated gradient effect */
.bg-gradient-to-r {
  background-size: 400% 400%;
  animation: gradientShift 6s ease infinite;
}

@keyframes gradientShift {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

/* Enhanced button hover effects */
.v-btn:hover {
  transform: translateY(-2px);
  transition: transform 0.2s ease;
}

/* Glassmorphism effect for chips */
.v-chip {
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.15) !important;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* The generic "Histórico de Cotizaciones" label above the H1. It used to BE the
   h2; it is now a plain paragraph so the casa+currency line can be the h1. */
.cu-eyebrow {
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

/* The server-rendered answer paragraph. Plain text on purpose: no chart, no
   accordion — this is what a snippet and an AI crawler read. */
.cu-answer {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.cu-answer time {
  white-space: nowrap;
}

/* Records grid. Colours inherit so both themes stay AA without a re-skin — the
   light-mode axe sweep fails any hardcoded white surface. */
.cu-records {
  display: grid;
  gap: 0.75rem 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
  margin: 0;
}

.cu-record dt {
  font-size: 0.75rem;
  letter-spacing: 0.02em;
  opacity: 0.75;
  text-transform: uppercase;
}

.cu-record dd {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}
</style>
