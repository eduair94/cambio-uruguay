<template>
  <div>
    <!-- Header Section -->
    <v-row>
      <v-col cols="12">
        <v-card class="mb-0 md-mb-6">
          <v-card-title
            class="text-h5 text-md-h4 justify-center bg-blue-darken-4 text-white text-center"
          >
            📈 {{ $t('historicoCotizaciones') }}
          </v-card-title>
          <v-card-text class="text-center pa-4">
            <v-chip color="primary" size="large" class="ma-2">
              {{ exchangeHouseName }}
            </v-chip>
            <v-chip color="secondary" size="large" class="ma-2">
              {{ route.params.currency }}
            </v-chip>
            <v-chip
              v-if="route.params.type"
              color="accent"
              size="large"
              class="ma-2"
            >
              {{ (route.params.type as string).toUpperCase() }}
            </v-chip>
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
        <v-progress-circular
          indeterminate
          color="primary"
          size="64"
        ></v-progress-circular>
        <p class="mt-4 text-h6">{{ $t('cargandoDatosHistoricos') }}</p>
      </v-col>
    </v-row>

    <!-- Error State -->
    <v-row v-else-if="error">
      <v-col cols="12">
        <v-alert type="error" prominent class="ma-4">
          <h3>{{ $t('errorCargarDatos') }}</h3>
          <p>{{ error.message || error }}</p>
          <v-btn color="white" variant="text" @click="refresh">
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
                {{
                  formatCurrency(
                    (evolutionData as any)?.statistics?.buy?.current || 0,
                  )
                }}
              </div>
              <div class="caption">
                Cambio:
                {{
                  formatPercentage(
                    (evolutionData as any)?.statistics?.buy?.change || 0,
                  )
                }}%
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
                {{
                  formatCurrency(
                    (evolutionData as any)?.statistics?.sell?.current || 0,
                  )
                }}
              </div>
              <div class="caption">
                {{ $t('cambio') }}:
                {{
                  formatPercentage(
                    (evolutionData as any)?.statistics?.sell?.change || 0,
                  )
                }}%
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
                {{
                  formatCurrency(
                    (evolutionData as any)?.statistics?.buy?.avg || 0,
                  )
                }}
              </div>
              <div class="caption">
                Min:
                {{
                  formatCurrency(
                    (evolutionData as any)?.statistics?.buy?.min || 0,
                  )
                }}
                | Max:
                {{
                  formatCurrency(
                    (evolutionData as any)?.statistics?.buy?.max || 0,
                  )
                }}
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3" sm="6">
          <v-card class="text-center bg-purple-darken-4">
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

      <!-- Chart Section -->
      <v-row class="mb-6">
        <v-col cols="12">
          <v-card>
            <v-card-title class="d-flex align-center flex-wrap ga-3 py-3">
              <v-icon start>mdi-chart-line</v-icon>
              {{ $t('evolucionCotizaciones') }} - {{ route.params.currency }}
              <v-spacer></v-spacer>
              <v-btn-toggle v-model="chartType" mandatory density="compact">
                <v-btn variant="outlined" size="small" value="line">
                  <v-icon size="small">mdi-chart-line</v-icon>
                </v-btn>
                <v-btn variant="outlined" size="small" value="bar">
                  <v-icon size="small">mdi-chart-bar</v-icon>
                </v-btn>
              </v-btn-toggle>
            </v-card-title>
            <v-card-text>
              <div style="position: relative; height: 400px">
                <Line
                  v-if="chartType === 'line'"
                  :data="chartData"
                  :options="chartOptions"
                  style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                  "
                />
                <Bar
                  v-else
                  :data="chartData"
                  :options="chartOptions"
                  style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                  "
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
              <v-spacer></v-spacer>
              <v-text-field
                v-model="search"
                append-inner-icon="mdi-magnify"
                :label="$t('buscarPorFecha')"
                single-line
                hide-details
                density="compact"
              ></v-text-field>
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
                <v-chip
                  :color="getBuyColor((item as any).buy)"
                  variant="flat"
                  size="small"
                >
                  {{ formatCurrency((item as any).buy) }}
                </v-chip>
              </template>
              <template #item.sell="{ item }">
                <v-chip
                  :color="getSellColor((item as any).sell)"
                  variant="flat"
                  size="small"
                >
                  {{ formatCurrency((item as any).sell) }}
                </v-chip>
              </template>
              <template #item.spread="{ item }">
                <span>{{ formatCurrency((item as any).spread) }}</span>
              </template>
              <template #item.type="{ item }">
                <v-chip
                  v-if="(item as any).type"
                  size="small"
                  variant="outlined"
                >
                  {{ (item as any).type }}
                </v-chip>
                <span v-else>-</span>
              </template>
            </v-data-table>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- Back Button -->
    <v-row class="mt-6">
      <v-col cols="12" class="text-center">
        <v-btn class="mb-4" color="primary" size="large" @click="navigateHome">
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
import moment from 'moment'
import { computed, ref } from 'vue'
import { Bar, Line } from 'vue-chartjs'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay } from 'vuetify/lib/composables/display.mjs'

const { smAndDown } = useDisplay()

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
  Filler,
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

interface EvolutionData {
  evolution: EvolutionItem[]
  statistics: Statistics
}

// Route validation
definePageMeta({
  validate: (route) => {
    return !!(route.params.origin && route.params.currency)
  },
})

// Router and route
const router = useRouter()
const route = useRoute()

// Get API service and loading composable
const { getEvolutionData } = useApiService()
const { withLoading } = useLoading()

// Reactive state
const chartType = ref('line')
const search = ref('')
const selectedPeriod = ref(6) // Default to 6 months
const { t } = useI18n()

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
  return origin.replace(/[-_]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
}

// Dynamic names for SEO
const exchangeHouseName = computed(() =>
  formatOriginName(route.params.origin as string),
)
const currencyName = computed(() => route.params.currency as string)

// SEO Configuration with dynamic values
useSeoMeta({
  title: () =>
    t('seo.historicalDetailTitle', {
      origin: exchangeHouseName.value,
      currency: currencyName.value,
    }),
  description: () =>
    t('seo.historicalDetailDescription', {
      origin: exchangeHouseName.value,
      currency: currencyName.value,
    }),
  keywords: () => t('seo.historicalDetailKeywords'),
  ogTitle: () =>
    t('seo.historicalDetailTitle', {
      origin: exchangeHouseName.value,
      currency: currencyName.value,
    }),
  ogDescription: () =>
    t('seo.historicalDetailDescription', {
      origin: exchangeHouseName.value,
      currency: currencyName.value,
    }),
  ogType: 'website',
  ogUrl: () =>
    `https://cambio-uruguay.com/historico/${route.params.origin}/${route.params.currency}${
      route.params.type ? '/' + route.params.type : ''
    }`,
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
})

// Load period from storage/query on client
const loadPeriodFromStorage = () => {
  // First check URL query parameter
  const queryPeriod = route.query.period
  if (queryPeriod) {
    const period = parseInt(queryPeriod as string)
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
      const period = parseInt(savedPeriod)
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

// Server-side data fetching with asyncData
const {
  data: evolutionData,
  error,
  pending: loading,
  refresh,
} = await useLazyAsyncData(
  `evolution-${route.params.origin}-${route.params.currency}-${route.params.type || 'default'}`,
  async () => {
    const { origin, currency, type } = route.params
    const period = selectedPeriod.value || 6

    return await withLoading(async () => {
      const result = await getEvolutionData(
        origin as string,
        currency as string,
        type as string | undefined,
        period,
      )

      if (result.error) {
        throw createError({
          statusCode: 500,
          statusMessage: result.error.message || 'Error loading evolution data',
        })
      }

      return result.data
    }, 'Cargando datos históricos...')
  },
  {
    watch: [selectedPeriod],
  },
)

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
  if (!(evolutionData.value as any)?.evolution)
    return { labels: [], datasets: [] }

  const evolution = (evolutionData.value as any).evolution
  const labels = evolution.map((item: EvolutionItem) =>
    moment(item.date).format('MM/DD'),
  )

  return {
    labels,
    datasets: [
      {
        label: 'Precio Compra',
        data: evolution.map((item: EvolutionItem) => item.buy),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
        fill: false,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
      {
        label: 'Precio Venta',
        data: evolution.map((item: EvolutionItem) => item.sell),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1,
        fill: false,
        pointRadius: 3,
        pointHoverRadius: 5,
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
      text: `Evolución ${route.params.currency} - ${exchangeHouseName.value}`,
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
        maxTicksLimit: 10,
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
  const query = { ...route.query, period: period.toString() }
  router.replace({ query })
}

const onPeriodChange = async () => {
  // Save to localStorage and update URL
  savePeriodToStorage(selectedPeriod.value)
  updateUrlQuery(selectedPeriod.value)

  // Refresh data with the selected period using loading wrapper
  await withLoading(async () => {
    await refresh()
  }, 'Actualizando período...')
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
  return moment(dateString).format('DD/MM/YYYY')
}

const formatDateRange = (): string => {
  if (!(evolutionData.value as any)?.statistics?.dateRange) return ''
  const { start, end } = (evolutionData.value as any).statistics.dateRange
  return `${moment(start).format('DD/MM/YY')} - ${moment(end).format(
    'DD/MM/YY',
  )}`
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

const navigateHome = () => {
  router.push('/')
}
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
</style>
