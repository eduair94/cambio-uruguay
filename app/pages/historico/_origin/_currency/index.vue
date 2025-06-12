<template>
  <div class="pa-4">
    <!-- Header Section -->
    <v-row>
      <v-col cols="12">
        <v-card class="mb-6">
          <v-card-title
            class="text-h4 justify-center blue darken-4 white--text"
          >
            📈 Histórico de Cotizaciones
          </v-card-title>
          <v-card-text class="text-center pa-4">
            <v-chip color="primary" large class="ma-2">
              {{ exchangeHouseName }}
            </v-chip>
            <v-chip color="secondary" large class="ma-2">
              {{ $route.params.currency }}
            </v-chip>
            <v-chip v-if="$route.params.type" color="accent" large class="ma-2">
              {{ $route.params.type.toUpperCase() }}
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
                <v-icon left color="primary">mdi-calendar-range</v-icon>
                <span class="text-h6">Período de Análisis:</span>
              </v-col>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="selectedPeriod"
                  :items="periodOptions"
                  item-text="text"
                  item-value="value"
                  outlined
                  dense
                  :loading="loading"
                  @change="onPeriodChange"
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
        <p class="mt-4 text-h6">Cargando datos históricos...</p>
      </v-col>
    </v-row>

    <!-- Error State -->
    <v-row v-else-if="error">
      <v-col cols="12">
        <v-alert type="error" prominent class="ma-4">
          <h3>Error al cargar los datos</h3>
          <p>{{ error }}</p>
          <v-btn color="white" text @click="fetchData"> Reintentar </v-btn>
        </v-alert>
      </v-col>
    </v-row>

    <!-- Main Content -->
    <div v-else-if="evolutionData">
      <!-- Statistics Cards -->
      <v-row class="mb-6">
        <v-col cols="12" md="3" sm="6">
          <v-card class="text-center green darken-4">
            <v-card-title class="justify-center white--text">
              <v-icon left color="white">mdi-trending-up</v-icon>
              Compra Actual
            </v-card-title>
            <v-card-text class="white--text">
              <div class="text-h4 font-weight-bold">
                {{ formatCurrency(evolutionData.statistics.buy.current) }}
              </div>
              <div class="caption">
                Cambio:
                {{ formatPercentage(evolutionData.statistics.buy.change) }}%
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3" sm="6">
          <v-card class="text-center red darken-4">
            <v-card-title class="justify-center white--text">
              <v-icon left color="white">mdi-trending-down</v-icon>
              Venta Actual
            </v-card-title>
            <v-card-text class="white--text">
              <div class="text-h4 font-weight-bold">
                {{ formatCurrency(evolutionData.statistics.sell.current) }}
              </div>
              <div class="caption">
                Cambio:
                {{ formatPercentage(evolutionData.statistics.sell.change) }}%
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3" sm="6">
          <v-card class="text-center blue darken-4">
            <v-card-title class="justify-center white--text">
              <v-icon left color="white">mdi-chart-line</v-icon>
              Promedio Compra
            </v-card-title>
            <v-card-text class="white--text">
              <div class="text-h4 font-weight-bold">
                {{ formatCurrency(evolutionData.statistics.buy.avg) }}
              </div>
              <div class="caption">
                Min: {{ formatCurrency(evolutionData.statistics.buy.min) }} |
                Max: {{ formatCurrency(evolutionData.statistics.buy.max) }}
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3" sm="6">
          <v-card class="text-center purple darken-4">
            <v-card-title class="justify-center white--text">
              <v-icon left color="white">mdi-database</v-icon>
              Datos Totales
            </v-card-title>
            <v-card-text class="white--text">
              <div class="text-h4 font-weight-bold">
                {{ evolutionData.statistics.totalDataPoints }}
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
            <v-card-title>
              <v-icon left>mdi-chart-line</v-icon>
              Evolución de Cotizaciones - {{ $route.params.currency }}
              <v-spacer></v-spacer>
              <v-btn-toggle v-model="chartType" mandatory dense>
                <v-btn small value="line">
                  <v-icon small>mdi-chart-line</v-icon>
                </v-btn>
                <v-btn small value="bar">
                  <v-icon small>mdi-chart-bar</v-icon>
                </v-btn>
              </v-btn-toggle>
            </v-card-title>
            <v-card-text>
              <div style="position: relative; height: 400px">
                <line-chart
                  v-if="chartType === 'line'"
                  :chart-data="chartData"
                  :options="chartOptions"
                  style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                  "
                />
                <bar-chart
                  v-else
                  :chart-data="chartData"
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
              <v-icon left>mdi-table</v-icon>
              Datos Detallados
              <v-spacer></v-spacer>
              <v-text-field
                v-model="search"
                append-icon="mdi-magnify"
                label="Buscar por fecha..."
                single-line
                hide-details
                dense
              ></v-text-field>
            </v-card-title>
            <v-data-table
              :headers="headers"
              :items="tableData"
              :search="search"
              :items-per-page="25"
              :footer-props="{
                'items-per-page-options': [10, 25, 50, 100],
              }"
              class="elevation-1"
              dense
            >
              <template slot="item.date" slot-scope="{ item }">
                <span>{{ formatDate(item.date) }}</span>
              </template>
              <template slot="item.buy" slot-scope="{ item }">
                <v-chip :color="getBuyColor(item.buy)" dark small>
                  {{ formatCurrency(item.buy) }}
                </v-chip>
              </template>
              <template slot="item.sell" slot-scope="{ item }">
                <v-chip :color="getSellColor(item.sell)" dark small>
                  {{ formatCurrency(item.sell) }}
                </v-chip>
              </template>
              <template slot="item.spread" slot-scope="{ item }">
                <span>{{ formatCurrency(item.spread) }}</span>
              </template>
              <template slot="item.type" slot-scope="{ item }">
                <v-chip v-if="item.type" small outlined>
                  {{ item.type }}
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
        <v-btn color="primary" large @click="$router.push('/')">
          <v-icon left>mdi-arrow-left</v-icon>
          Volver al inicio
        </v-btn>
      </v-col>
    </v-row>
  </div>
</template>

<script lang="ts">
import moment from 'moment'

export default {
  name: 'HistoricoDetail',
  components: {
    LineChart: () => import('@/components/charts/LineChart.vue'),
    BarChart: () => import('@/components/charts/BarChart.vue'),
  },
  validate({ params }) {
    // Validate that both origin and currency are provided
    // Type parameter is optional
    return params.origin && params.currency
  },
  data() {
    return {
      loading: false,
      error: null,
      evolutionData: null,
      chartType: 'line',
      search: '',
      selectedPeriod: 6, // Default to 6 months
      periodOptions: [
        { text: '3 meses', value: 3 },
        { text: '6 meses', value: 6 },
        { text: '12 meses', value: 12 },
        { text: '24 meses', value: 24 },
      ],
      headers: [
        { text: 'Fecha', value: 'date', sortable: true },
        { text: 'Compra', value: 'buy', sortable: true },
        { text: 'Venta', value: 'sell', sortable: true },
        { text: 'Spread', value: 'spread', sortable: true },
        { text: 'Tipo', value: 'type', sortable: false },
        { text: 'Nombre', value: 'name', sortable: false },
      ],
    }
  },
  head() {
    const origin = this.$route.params.origin?.toUpperCase() || ''
    const currency = this.$route.params.currency?.toUpperCase() || ''
    const type = this.$route.params.type?.toUpperCase() || ''

    const titleSuffix = type ? ` (${type})` : ''
    return {
      title: `Histórico ${origin} - ${currency}${titleSuffix} | Cambio Uruguay`,
      meta: [
        {
          hid: 'description',
          name: 'description',
          content: `Evolución histórica de cotizaciones ${currency}${titleSuffix} en ${origin}. Gráficos, estadísticas y datos detallados de cambio de moneda en Uruguay.`,
        },
        {
          hid: 'keywords',
          name: 'keywords',
          content: `histórico cotizaciones, ${origin}, ${currency}, ${type}, evolución cambio, gráfico cotizaciones, estadísticas cambio uruguay`,
        },
      ],
    }
  },
  computed: {
    exchangeHouseName() {
      const names = {
        brou: 'Banco República (BROU)',
        prex: 'Prex',
        cambios_alpe: 'Cambios Alpe',
        gales: 'Gales',
        varlix: 'Varlix',
      }
      return (
        names[this.$route.params.origin?.toLowerCase()] ||
        this.$route.params.origin?.toUpperCase()
      )
    },
    tableData() {
      if (!this.evolutionData?.evolution) return []

      return this.evolutionData.evolution
        .map((item) => ({
          ...item,
          spread: item.sell - item.buy,
          date: item.date,
        }))
        .reverse() // Show most recent first
    },
    chartData() {
      if (!this.evolutionData?.evolution) return { labels: [], datasets: [] }

      const evolution = this.evolutionData.evolution
      const labels = evolution.map((item) => moment(item.date).format('MM/DD'))

      return {
        labels,
        datasets: [
          {
            label: 'Precio Compra',
            data: evolution.map((item) => item.buy),
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.1,
            fill: false,
            pointRadius: 3,
            pointHoverRadius: 5,
          },
          {
            label: 'Precio Venta',
            data: evolution.map((item) => item.sell),
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            tension: 0.1,
            fill: false,
            pointRadius: 3,
            pointHoverRadius: 5,
          },
        ],
      }
    },
    chartOptions() {
      return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
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
            text: `Evolución ${this.$route.params.currency} - ${this.exchangeHouseName}`,
            color: '#1976d2',
            font: {
              size: 16,
              weight: 'bold',
            },
          },
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#1976d2',
              usePointStyle: true,
              padding: 20,
            },
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: '#1976d2',
            borderWidth: 1,
            callbacks: {
              label: (context) => {
                // Use inline formatting to avoid referencing this
                const value = context.parsed.y
                if (typeof value !== 'number')
                  return `${context.dataset.label}: -`
                return `${context.dataset.label}: ${value.toLocaleString(
                  'es-UY',
                  {
                    style: 'currency',
                    currency: 'UYU',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}`
              },
            },
          },
        },
        scales: {
          x: {
            type: 'category',
            display: true,
            title: {
              display: true,
              text: 'Fecha',
              color: '#1976d2',
              font: {
                size: 14,
                weight: 'bold',
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
            type: 'linear',
            display: true,
            title: {
              display: true,
              text: 'Precio (UYU)',
              color: '#1976d2',
              font: {
                size: 14,
                weight: 'bold',
              },
            },
            ticks: {
              color: '#666666',
              callback: (value) => {
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
      }
    },
  },
  async mounted() {
    // Load period from localStorage or URL query parameter
    this.loadPeriodFromStorage()
    await this.fetchData()
  },
  methods: {
    loadPeriodFromStorage() {
      // First check URL query parameter
      const queryPeriod = this.$route.query.period
      if (queryPeriod) {
        const period = parseInt(queryPeriod as string)
        if ([3, 6, 12, 24].includes(period)) {
          this.selectedPeriod = period
          this.savePeriodToStorage(period)
          return
        }
      }

      // If no valid query parameter, check localStorage
      if (process.client) {
        const savedPeriod = localStorage.getItem('cambio-uruguay-period')
        if (savedPeriod) {
          const period = parseInt(savedPeriod)
          if ([3, 6, 12, 24].includes(period)) {
            this.selectedPeriod = period
            this.updateUrlQuery(period)
          }
        }
      }
    },

    savePeriodToStorage(period: number) {
      if (process.client) {
        localStorage.setItem('cambio-uruguay-period', period.toString())
      }
    },

    updateUrlQuery(period: number) {
      // Update URL query parameter without navigation
      const query = { ...this.$route.query, period: period.toString() }
      this.$router.replace({ query })
    },

    async onPeriodChange() {
      // Save to localStorage and update URL
      this.savePeriodToStorage(this.selectedPeriod)
      this.updateUrlQuery(this.selectedPeriod)

      // Fetch new data with the selected period
      await this.fetchData()
    },

    async fetchData() {
      ;(window as any).startLoading()
      this.loading = true
      this.error = null

      try {
        const { origin, currency, type } = this.$route.params

        // Build the URL with optional type parameter
        let url = `https://api.cambio-uruguay.com/evolution/${origin}/${currency}`
        if (type) {
          url += `/${type}`
        }
        url += `?period=${this.selectedPeriod}`

        const response = await this.$axios.get(url)
        this.evolutionData = response.data
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching evolution data:', error)
        this.error =
          error.response?.data?.message ||
          'Error al cargar los datos históricos'
      } finally {
        this.loading = false
        ;(window as any).stopLoading()
      }
    },
    formatCurrency(value) {
      if (typeof value !== 'number') return '-'
      return value.toLocaleString('es-UY', {
        style: 'currency',
        currency: 'UYU',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    },
    formatPercentage(value) {
      if (typeof value !== 'number') return '0.00'
      return value.toFixed(2)
    },
    formatDate(dateString) {
      return moment(dateString).format('DD/MM/YYYY')
    },
    formatDateRange() {
      if (!this.evolutionData?.statistics?.dateRange) return ''
      const { start, end } = this.evolutionData.statistics.dateRange
      return `${moment(start).format('DD/MM/YY')} - ${moment(end).format(
        'DD/MM/YY'
      )}`
    },
    getBuyColor(value) {
      const stats = this.evolutionData?.statistics?.buy
      if (!stats) return 'grey'

      const range = stats.max - stats.min
      const position = (value - stats.min) / range

      if (position > 0.7) return 'red darken-2'
      if (position > 0.3) return 'orange darken-2'
      return 'green darken-2'
    },
    getSellColor(value) {
      const stats = this.evolutionData?.statistics?.sell
      if (!stats) return 'grey'

      const range = stats.max - stats.min
      const position = (value - stats.min) / range

      if (position > 0.7) return 'red darken-2'
      if (position > 0.3) return 'orange darken-2'
      return 'green darken-2'
    },
  },
}
</script>

<style scoped>
.v-card {
  transition: transform 0.2s ease-in-out;
}

.chart-container {
  position: relative;
  height: 400px;
  width: 100%;
}

.elevation-1 {
  box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.1) !important;
}

.text-h4 {
  font-weight: 600;
}

.caption {
  font-size: 0.875rem;
  opacity: 0.8;
}
</style>
