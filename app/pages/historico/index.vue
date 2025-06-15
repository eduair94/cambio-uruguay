<template>
  <div>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center flex-wrap ga-3 py-4">
            <v-icon class="mr-2" color="primary">mdi-chart-line</v-icon>
            <span class="text-h5 text-md-h4">{{
              $t('historical.currentQuotes')
            }}</span>
            <v-spacer></v-spacer>
            <v-chip class="mt-2 mt-md-0" color="success" size="small">
              <v-icon start size="small">mdi-clock-outline</v-icon>
              {{ $t('historical.updated') }}: {{ lastUpdate }}
            </v-chip>
          </v-card-title>
          <!-- Filtros -->
          <v-card-text>
            <v-row>
              <v-col cols="12" md="3">
                <v-select
                  v-model="selectedOrigin"
                  :items="originOptions"
                  :label="$t('historical.exchangeHouse')"
                  clearable
                  prepend-inner-icon="mdi-bank"
                  density="compact"
                  variant="outlined"
                  hide-details
                ></v-select>
              </v-col>
              <v-col cols="12" md="3">
                <v-select
                  v-model="selectedCurrency"
                  :items="currencyOptions"
                  :label="$t('historical.currency')"
                  clearable
                  prepend-inner-icon="mdi-currency-usd"
                  density="compact"
                  variant="outlined"
                  hide-details
                ></v-select>
              </v-col>
              <v-col cols="12" md="3">
                <v-select
                  v-model="selectedType"
                  :items="typeOptions"
                  :label="$t('historical.type')"
                  clearable
                  prepend-inner-icon="mdi-tag"
                  density="compact"
                  variant="outlined"
                  hide-details
                ></v-select>
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field
                  v-model="search"
                  :label="$t('historical.search')"
                  prepend-inner-icon="mdi-magnify"
                  clearable
                  density="compact"
                  variant="outlined"
                  hide-details
                ></v-text-field>
              </v-col>
            </v-row>
          </v-card-text>
          <!-- Tabla de datos -->
          <v-data-table
            :headers="headers"
            :items="filteredItems"
            :search="search"
            :mobile="smAndDown"
            :loading="loading"
            :items-per-page="20"
            :items-per-page-options="[
              { value: 10, title: '10' },
              { value: 20, title: '20' },
              { value: 50, title: '50' },
              { value: 100, title: '100' },
              { value: -1, title: '$vuetify.dataFooter.itemsPerPageAll' },
            ]"
            class="elevation-1"
            :sort-by="[{ key: 'origin', order: 'asc' }]"
            ><!-- Celda de Origen con enlace -->
            <template #item.origin="{ item }">
              <v-btn
                v-if="item.origin"
                :to="`/historico/${item.origin}`"
                variant="text"
                color="primary"
                size="small"
                class="text-capitalize"
              >
                <v-icon start size="small">mdi-bank</v-icon>
                {{ formatOriginName(item.origin) }}
              </v-btn>
              <span v-else class="text-grey">N/A</span>
            </template>

            <!-- Celda de Moneda con enlace -->
            <template #item.code="{ item }">
              <v-btn
                v-if="item.origin && item.code"
                :to="`/historico/${item.origin}/${item.code}`"
                variant="text"
                color="secondary"
                size="small"
              >
                <v-avatar size="20" class="mr-2">
                  <img :src="getCurrencyFlag(item.code)" :alt="item.code" />
                </v-avatar>
                {{ item.code }}
              </v-btn>
              <span v-else class="text-grey">N/A</span>
            </template>

            <!-- Celda de Tipo -->
            <template #item.type="{ item }">
              <v-chip
                v-if="item.type"
                size="small"
                :color="getTypeColor(item.type)"
                variant="flat"
              >
                {{ item.type }}
              </v-chip>
              <span v-else class="text-grey">-</span>
            </template>

            <!-- Celda de Compra -->
            <template #item.buy="{ item }">
              <div class="text-right">
                <span class="font-weight-bold text-success">
                  ${{ formatNumber(item.buy) }}
                </span>
              </div>
            </template>

            <!-- Celda de Venta -->
            <template #item.sell="{ item }">
              <div class="text-right">
                <span class="font-weight-bold text-error">
                  ${{ formatNumber(item.sell) }}
                </span>
              </div>
            </template>

            <!-- Celda de Spread -->
            <template #item.spread="{ item }">
              <div class="text-right">
                <v-chip
                  size="small"
                  :color="getSpreadColor(item.spread)"
                  variant="flat"
                >
                  {{ formatNumber(item.spread) }}%
                </v-chip>
              </div>
            </template>

            <!-- Celda de Nombre -->
            <template #item.name="{ item }">
              <div class="text-truncate" style="max-width: 200px">
                {{ item.name || '-' }}
              </div>
            </template>

            <!-- Slot para cuando no hay datos -->
            <template #no-data>
              <div class="text-center pa-4">
                <v-icon size="64" color="grey-lighten-1"
                  >mdi-database-remove</v-icon
                >
                <p class="text-h6 text-grey mt-4">
                  {{ $t('historical.noDataAvailable') }}
                </p>
              </div>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { useSeoMeta } from '#imports'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay } from 'vuetify/lib/composables/display.mjs'

interface CambioItem {
  origin: string
  code: string
  type: string
  buy: number
  sell: number
  name: string
  spread: number
}

interface CurrencyName {
  [key: string]: string
}

interface CurrencyFlag {
  [key: string]: string
}

interface TypeColor {
  [key: string]: string
}

interface OriginNameMap {
  [key: string]: string
}

const { t, locale } = useI18n()
// Router and route
const route = useRoute()
const router = useRouter()
const { smAndDown } = useDisplay()

// Initialize API service
const apiService = useApiService()

// SEO/Head
useSeoMeta({
  title: () => t('seo.historicalTitle'),
  description: () => t('seo.historicalDescription'),
  keywords: () => t('seo.historicalKeywords'),
  ogTitle: () => t('seo.historicalTitle'),
  ogDescription: () => t('seo.historicalDescription'),
  ogType: 'website',
  ogUrl: 'https://cambio-uruguay.com/historico',
  twitterCard: 'summary_large_image',
  twitterTitle: () => t('seo.historicalTitle'),
  twitterDescription: () => t('seo.historicalDescription'),
})

// Reactive state
const search = ref('')
const selectedOrigin = ref<string | null>(null)
const selectedCurrency = ref<string | null>(null)
const selectedType = ref<string | null>(null)

// Load data using useAsyncData for SSR
const {
  data: rawData,
  pending: loading,
  error,
  refresh,
} = await useAsyncData(
  'historico-cambios',
  async () => {
    try {
      const today = new Date().toLocaleDateString('en-CA')
      const result = await apiService.getExchangeData(today)

      if (result.error) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Error al cargar las cotizaciones',
        })
      }

      return result
    } catch (err) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Error al cargar las cotizaciones',
      })
    }
  },
  {
    server: true,
    default: () => [],
  },
)

// Process the data and calculate spreads
const items = computed<CambioItem[]>(() => {
  if (!rawData.value || (rawData.value as any)?.error) return []

  const dataArray = Array.isArray(rawData.value)
    ? rawData.value
    : [rawData.value]

  return dataArray
    .map((item: any) => ({
      ...item,
      spread: calculateSpread(item.buy, item.sell),
    }))
    .filter((item: any) => item.origin) // Filter items without origin
})

// Last update timestamp
const lastUpdate = computed(() => {
  return new Date().toLocaleString('es-UY', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
})

// Computed properties
const headers = computed(() => [
  {
    title: t('historical.exchangeHouse'),
    key: 'origin',
    sortable: true,
    width: '180px',
  },
  {
    title: t('historical.currency'),
    key: 'code',
    sortable: true,
    width: '120px',
  },
  {
    title: t('historical.type'),
    key: 'type',
    sortable: true,
    width: '100px',
  },
  {
    title: t('historical.buy'),
    key: 'buy',
    sortable: true,
    align: 'end' as const,
    width: '120px',
  },
  {
    title: t('historical.sell'),
    key: 'sell',
    sortable: true,
    align: 'end' as const,
    width: '120px',
  },
  {
    title: t('historical.spread'),
    key: 'spread',
    sortable: true,
    align: 'end' as const,
    width: '100px',
  },
  {
    title: t('historical.name'),
    key: 'name',
    sortable: true,
    width: '200px',
  },
])

const originOptions = computed(() => {
  const origins = [
    ...new Set(items.value.map((item) => item.origin).filter(Boolean)),
  ]
  return origins.sort().map((origin) => ({
    title: formatOriginName(origin),
    value: origin,
  }))
})

const currencyOptions = computed(() => {
  const currencies = [
    ...new Set(items.value.map((item) => item.code).filter(Boolean)),
  ]
  return currencies.sort().map((currency) => ({
    title: `${currency} - ${getCurrencyName(currency)}`,
    value: currency,
  }))
})

const typeOptions = computed(() => {
  const types = [
    ...new Set(items.value.map((item) => item.type).filter(Boolean)),
  ]
  return types.sort().map((type) => ({
    title: type,
    value: type,
  }))
})

const filteredItems = computed(() => {
  let filtered = items.value

  if (selectedOrigin.value) {
    filtered = filtered.filter((item) => item.origin === selectedOrigin.value)
  }

  if (selectedCurrency.value) {
    filtered = filtered.filter((item) => item.code === selectedCurrency.value)
  }

  if (selectedType.value) {
    filtered = filtered.filter((item) => item.type === selectedType.value)
  }

  return filtered
})

// Methods
const calculateSpread = (buy: number, sell: number): number => {
  if (!buy || !sell || buy === 0) return 0
  return parseFloat((((sell - buy) / buy) * 100).toFixed(2))
}

const formatOriginName = (origin: string): string => {
  if (!origin) return 'N/A'

  // Mapeo de nombres más amigables
  const nameMap: OriginNameMap = {
    brou: 'BROU',
    bcu: 'BCU',
    itau: 'Itaú',
    prex: 'Prex',
    cambio_argentino: 'Cambio Argentino',
    cambio_federal: 'Cambio Federal',
    cambio_romantico: 'Cambio Romántico',
    cambio_maiorano: 'Cambio Maiorano',
    cambio_aguerrebere: 'Cambio Aguerrebere',
    mas_cambio: 'Más Cambio',
    cambio_pampex: 'Cambio Pampex',
    baluma_cambio: 'Baluma Cambio',
    cambio_regul: 'Cambio Regul',
    cambio_vexel: 'Cambio Vexel',
    cambio_pando: 'Cambio Pando',
    cambio_minas: 'Cambio Minas',
    aeromar: 'Aeromar',
    cambilex: 'Cambilex',
    indumex: 'Indumex',
    cambio_oriental: 'Cambio Oriental',
    cambio_openn: 'Cambio Openn',
    gales: 'Gales',
    cambio_sicurezza: 'Cambio Sicurezza',
    suizo: 'Suizo',
    cambio_ingles: 'Cambio Inglés',
    matriz: 'Matriz',
    cambio_rynder: 'Cambio Rynder',
    cambio_young: 'Cambio Young',
    cambio_misiones: 'Cambio Misiones',
    alter_cambio: 'Alter Cambio',
    cambio_3: 'Cambio 3',
    cambial: 'Cambial',
    cambio_principal: 'Cambio Principal',
    cambio_fenix: 'Cambio Fénix',
    aspen: 'Aspen',
    cambio_pernas: 'Cambio Pernas',
    varlix: 'Varlix',
    cambio_sir: 'Cambio Sir',
    cambio_obelisco: 'Cambio Obelisco',
  }

  return (
    nameMap[origin] ||
    origin.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  )
}

const getCurrencyName = (code: string): string => {
  const currencyNames: CurrencyName = {
    USD: 'Dólar Estadounidense',
    EUR: 'Euro',
    BRL: 'Real Brasileño',
    ARS: 'Peso Argentino',
    XAU: 'Oro',
    CHF: 'Franco Suizo',
    GBP: 'Libra Esterlina',
    PYG: 'Guaraní',
    UR: 'Unidad Reajustable',
    UP: 'Unidad Previsional',
    UI: 'Unidad Indexada',
  }
  return currencyNames[code] || code
}

const getCurrencyFlag = (code: string): string => {
  const flags: CurrencyFlag = {
    USD: 'https://flagcdn.com/w20/us.png',
    EUR: 'https://flagcdn.com/w20/eu.png',
    BRL: 'https://flagcdn.com/w20/br.png',
    ARS: 'https://flagcdn.com/w20/ar.png',
    CHF: 'https://flagcdn.com/w20/ch.png',
    GBP: 'https://flagcdn.com/w20/gb.png',
    PYG: 'https://flagcdn.com/w20/py.png',
    XAU: '🥇',
    UR: 'https://flagcdn.com/w20/uy.png',
    UP: 'https://flagcdn.com/w20/uy.png',
    UI: 'https://flagcdn.com/w20/uy.png',
  }
  return flags[code] || 'https://flagcdn.com/w20/uy.png'
}

const getTypeColor = (type: string): string => {
  const colors: TypeColor = {
    BILLETE: 'green',
    CABLE: 'blue',
    'PROMED.FONDO': 'purple',
    EBROU: 'orange',
    '': 'grey',
  }
  return colors[type] || 'grey'
}

const getSpreadColor = (spread: number | string): string => {
  const spreadNum =
    typeof spread === 'number' ? spread : parseFloat(String(spread))
  if (spreadNum <= 2) return 'green'
  if (spreadNum <= 5) return 'orange'
  return 'red'
}

const formatNumber = (value: number): string => {
  if (!value || value === 0) return '0.00'
  return new Intl.NumberFormat('es-UY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value)
}

const restoreFiltersFromQuery = () => {
  const query = route.query

  // Restaurar filtros desde query parameters
  if (query.origin && typeof query.origin === 'string') {
    selectedOrigin.value = query.origin
  }
  if (query.currency && typeof query.currency === 'string') {
    selectedCurrency.value = query.currency
  }
  if (query.type && typeof query.type === 'string') {
    selectedType.value = query.type
  }
  if (query.search && typeof query.search === 'string') {
    search.value = query.search
  }
}

const updateQueryParams = () => {
  // Evitar loops infinitos durante la inicialización
  if (loading.value) return

  const query: Record<string, string> = {}

  // Solo agregar parámetros que tengan valor
  if (selectedOrigin.value) {
    query.origin = selectedOrigin.value
  }
  if (selectedCurrency.value) {
    query.currency = selectedCurrency.value
  }
  if (selectedType.value) {
    query.type = selectedType.value
  }
  if (search.value) {
    query.search = search.value
  }

  // Actualizar la URL sin causar navegación
  router
    .replace({
      path: route.path,
      query,
    })
    .catch(() => {
      // Ignorar errores de navegación redundante
    })
}

const goToExample = () => {
  router.push('/historico/brou/USD')
}

// Watchers
watch(selectedOrigin, updateQueryParams)
watch(selectedCurrency, updateQueryParams)
watch(selectedType, updateQueryParams)
watch(search, updateQueryParams)

// Lifecycle - restore filters from query parameters on mount
onMounted(() => {
  restoreFiltersFromQuery()
})
</script>

<style scoped>
.v-data-table {
  border-radius: 8px;
}

.v-data-table :deep(.v-table__wrapper) {
  border-radius: 8px;
}

.text-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.v-chip {
  font-weight: 500;
}

.v-btn[variant='text'] {
  text-transform: none;
}

.v-data-table :deep(th) {
  font-weight: 600 !important;
}

.v-avatar img {
  border-radius: 2px;
}

@media (max-width: 960px) {
  .v-data-table :deep(.v-table__wrapper) {
    overflow-x: auto;
  }
}
</style>
