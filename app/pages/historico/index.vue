<template>
  <div class="pa-4">
    <v-container fluid>
      <v-row>
        <v-col cols="12">
          <v-card>
            <v-card-title class="d-flex align-center">
              <v-icon class="mr-2" color="primary">mdi-chart-line</v-icon>
              <span class="text-h5 text-md-h4">{{
                $t('historical.currentQuotes')
              }}</span>
              <v-spacer></v-spacer>
              <v-chip
                class="mt-2 mt-md-0"
                color="success"
                text-color="white"
                small
              >
                <v-icon left small>mdi-clock-outline</v-icon>
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
                    prepend-icon="mdi-bank"
                    dense
                    outlined
                    hide-details
                  ></v-select>
                </v-col>
                <v-col cols="12" md="3">
                  <v-select
                    v-model="selectedCurrency"
                    :items="currencyOptions"
                    :label="$t('historical.currency')"
                    clearable
                    prepend-icon="mdi-currency-usd"
                    dense
                    outlined
                    hide-details
                  ></v-select>
                </v-col>
                <v-col cols="12" md="3">
                  <v-select
                    v-model="selectedType"
                    :items="typeOptions"
                    :label="$t('historical.type')"
                    clearable
                    prepend-icon="mdi-tag"
                    dense
                    outlined
                    hide-details
                  ></v-select>
                </v-col>
                <v-col cols="12" md="3">
                  <v-text-field
                    v-model="search"
                    :label="$t('historical.search')"
                    prepend-icon="mdi-magnify"
                    clearable
                    dense
                    outlined
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
              :loading="loading"
              :items-per-page="20"
              :footer-props="{
                'items-per-page-options': [10, 20, 50, 100, -1],
              }"
              class="elevation-1"
              sort-by="origin"
            >
              <!-- Celda de Origen con enlace -->
              <template slot="item.origin" slot-scope="{ item }">
                <v-btn
                  v-if="item.origin"
                  :to="localePath(`/historico/${item.origin}`)"
                  text
                  color="primary"
                  small
                  class="text-capitalize"
                >
                  <v-icon left small>mdi-bank</v-icon>
                  {{ formatOriginName(item.origin) }}
                </v-btn>
                <span v-else class="grey--text">N/A</span>
              </template>

              <!-- Celda de Moneda con enlace -->
              <template slot="item.code" slot-scope="{ item }">
                <v-btn
                  v-if="item.origin && item.code"
                  :to="localePath(`/historico/${item.origin}/${item.code}`)"
                  text
                  color="secondary"
                  small
                >
                  <v-avatar size="20" class="mr-2">
                    <img :src="getCurrencyFlag(item.code)" :alt="item.code" />
                  </v-avatar>
                  {{ item.code }}
                </v-btn>
                <span v-else class="grey--text">N/A</span>
              </template>

              <!-- Celda de Tipo -->
              <template slot="item.type" slot-scope="{ item }">
                <v-chip
                  v-if="item.type"
                  small
                  :color="getTypeColor(item.type)"
                  text-color="white"
                >
                  {{ item.type }}
                </v-chip>
                <span v-else class="grey--text">-</span>
              </template>

              <!-- Celda de Compra -->
              <template slot="item.buy" slot-scope="{ item }">
                <div class="text-right">
                  <span class="font-weight-bold text-success">
                    ${{ formatNumber(item.buy) }}
                  </span>
                </div>
              </template>

              <!-- Celda de Venta -->
              <template slot="item.sell" slot-scope="{ item }">
                <div class="text-right">
                  <span class="font-weight-bold text-error">
                    ${{ formatNumber(item.sell) }}
                  </span>
                </div>
              </template>

              <!-- Celda de Spread -->
              <template slot="item.spread" slot-scope="{ item }">
                <div class="text-right">
                  <v-chip
                    small
                    :color="getSpreadColor(item.spread)"
                    text-color="white"
                  >
                    {{ formatNumber(item.spread) }}%
                  </v-chip>
                </div>
              </template>

              <!-- Celda de Nombre -->
              <template slot="item.name" slot-scope="{ item }">
                <div class="text-truncate" style="max-width: 200px">
                  {{ item.name || '-' }}
                </div>
              </template>

              <!-- Slot para cuando no hay datos -->
              <template slot="no-data">
                <div class="text-center pa-4">
                  <v-icon size="64" color="grey lighten-1"
                    >mdi-database-remove</v-icon
                  >
                  <p class="text-h6 grey--text mt-4">
                    {{ $t('historical.noDataAvailable') }}
                  </p>
                </div>
              </template>

              <!-- Slot para loading -->
              <template slot="loading">
                <div class="text-center pa-4">
                  <v-progress-circular
                    indeterminate
                    color="primary"
                    size="64"
                  ></v-progress-circular>
                  <p class="text-h6 mt-4">
                    {{ $t('historical.loadingQuotes') }}
                  </p>
                </div>
              </template>
            </v-data-table>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script lang="ts">
export default {
  name: 'HistoricoIndex',
  data() {
    return {
      loading: true,
      search: '',
      items: [],
      selectedOrigin: null,
      selectedCurrency: null,
      selectedType: null,
      lastUpdate: '',
    }
  },
  head() {
    return {
      title: this.$t('historical.currentQuotes') + ' - Cambio Uruguay',
      meta: [
        {
          hid: 'description',
          name: 'description',
          content:
            'Consulta las cotizaciones actuales de todas las casas de cambio de Uruguay. Compara precios y encuentra la mejor opción.',
        },
      ],
    }
  },
  computed: {
    headers() {
      return [
        {
          text: this.$t('historical.exchangeHouse'),
          value: 'origin',
          sortable: true,
          width: '180px',
        },
        {
          text: this.$t('historical.currency'),
          value: 'code',
          sortable: true,
          width: '120px',
        },
        {
          text: this.$t('historical.type'),
          value: 'type',
          sortable: true,
          width: '100px',
        },
        {
          text: this.$t('historical.buy'),
          value: 'buy',
          sortable: true,
          align: 'end',
          width: '120px',
        },
        {
          text: this.$t('historical.sell'),
          value: 'sell',
          sortable: true,
          align: 'end',
          width: '120px',
        },
        {
          text: this.$t('historical.spread'),
          value: 'spread',
          sortable: true,
          align: 'end',
          width: '100px',
        },
        {
          text: this.$t('historical.name'),
          value: 'name',
          sortable: true,
          width: '200px',
        },
      ]
    },
    originOptions() {
      const origins = [
        ...new Set(this.items.map((item) => item.origin).filter(Boolean)),
      ]
      return origins.sort().map((origin) => ({
        text: this.formatOriginName(origin),
        value: origin,
      }))
    },
    currencyOptions() {
      const currencies = [
        ...new Set(this.items.map((item) => item.code).filter(Boolean)),
      ]
      return currencies.sort().map((currency) => ({
        text: `${currency} - ${this.getCurrencyName(currency)}`,
        value: currency,
      }))
    },
    typeOptions() {
      const types = [
        ...new Set(this.items.map((item) => item.type).filter(Boolean)),
      ]
      return types.sort().map((type) => ({
        text: type,
        value: type,
      }))
    },
    filteredItems() {
      let filtered = this.items

      if (this.selectedOrigin) {
        filtered = filtered.filter(
          (item) => item.origin === this.selectedOrigin
        )
      }

      if (this.selectedCurrency) {
        filtered = filtered.filter(
          (item) => item.code === this.selectedCurrency
        )
      }

      if (this.selectedType) {
        filtered = filtered.filter((item) => item.type === this.selectedType)
      }

      return filtered
    },
  },
  async mounted() {
    // Restaurar filtros desde query parameters
    this.restoreFiltersFromQuery()
    await this.loadData()
  },
  watch: {
    selectedOrigin() {
      this.updateQueryParams()
    },
    selectedCurrency() {
      this.updateQueryParams()
    },
    selectedType() {
      this.updateQueryParams()
    },
    search() {
      this.updateQueryParams()
    },
  },
  methods: {
    async loadData() {
      try {
        ;(window as any).startLoading()
        this.loading = true
        const response = await fetch('https://api.cambio-uruguay.com')
        const data = await response.json()

        // Procesar datos y calcular spread
        this.items = data
          .map((item) => ({
            ...item,
            spread: this.calculateSpread(item.buy, item.sell),
          }))
          .filter((item) => item.origin) // Filtrar items sin origen

        this.lastUpdate = new Date().toLocaleString('es-UY', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
      } catch (error) {
        // Error loading data
        this.$nuxt.error({
          statusCode: 500,
          message: 'Error al cargar las cotizaciones',
        })
      } finally {
        this.loading = false
        ;(window as any).stopLoading()
      }
    },
    calculateSpread(buy, sell) {
      if (!buy || !sell || buy === 0) return 0
      return (((sell - buy) / buy) * 100).toFixed(2)
    },
    formatOriginName(origin) {
      if (!origin) return 'N/A'

      // Mapeo de nombres más amigables
      const nameMap = {
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
    },
    getCurrencyName(code) {
      const currencyNames = {
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
    },
    getCurrencyFlag(code) {
      const flags = {
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
    },
    getTypeColor(type) {
      const colors = {
        BILLETE: 'green',
        CABLE: 'blue',
        'PROMED.FONDO': 'purple',
        EBROU: 'orange',
        '': 'grey',
      }
      return colors[type] || 'grey'
    },
    getSpreadColor(spread) {
      const spreadNum = parseFloat(spread)
      if (spreadNum <= 2) return 'green'
      if (spreadNum <= 5) return 'orange'
      return 'red'
    },
    formatNumber(value) {
      if (!value || value === 0) return '0.00'
      return new Intl.NumberFormat('es-UY', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      }).format(value)
    },
    restoreFiltersFromQuery() {
      const query = this.$route.query

      // Restaurar filtros desde query parameters
      if (query.origin) {
        this.selectedOrigin = query.origin
      }
      if (query.currency) {
        this.selectedCurrency = query.currency
      }
      if (query.type) {
        this.selectedType = query.type
      }
      if (query.search) {
        this.search = query.search
      }
    },
    updateQueryParams() {
      // Evitar loops infinitos durante la inicialización
      if (this.loading) return

      const query: any = {}

      // Solo agregar parámetros que tengan valor
      if (this.selectedOrigin) {
        query.origin = this.selectedOrigin
      }
      if (this.selectedCurrency) {
        query.currency = this.selectedCurrency
      }
      if (this.selectedType) {
        query.type = this.selectedType
      }
      if (this.search) {
        query.search = this.search
      }

      // Actualizar la URL sin causar navegación
      this.$router
        .replace({
          path: this.$route.path,
          query,
        })
        .catch(() => {
          // Ignorar errores de navegación redundante
        })
    },
    goToExample() {
      this.$router.push('/historico/brou/USD')
    },
  },
}
</script>

<style scoped>
.v-data-table {
  border-radius: 8px;
}

.v-data-table >>> .v-data-table__wrapper {
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

.v-btn.text {
  text-transform: none;
}

.v-data-table >>> th {
  font-weight: 600 !important;
}

.v-avatar img {
  border-radius: 2px;
}

@media (max-width: 960px) {
  .v-data-table >>> .v-data-table__wrapper {
    overflow-x: auto;
  }
}
</style>
