<template>
  <div class="mt-md-4">
    <!-- SEO Optimized Header Structure -->
    <header>
      <h1 class="text-h5 text-md-h4 font-weight-bold mb-3">
        {{ $t('welcome') }}
      </h1>
      <h2 class="text-h6 mb-4 grey--text text--lighten-1">
        {{ $t('subtitle') }}
      </h2>
    </header>

    <!-- Enhanced SEO Content -->
    <section class="mb-4">
      <h3 class="sr-only">{{ $t('seoTitle') }}</h3>
      <div class="hidden-content" style="position: absolute; left: -9999px">
        <p>{{ $t('seoDescription') }}</p>
        <span>{{ $t('seoKeywords') }}</span>
      </div>
    </section>

    <div class="my-4">
      <client-only>
        <v-data-table
          :item-class="row_classes"
          :headers="getHeaders()"
          :items="items"
          :footer-props="{
            'items-per-page-options': [10, 20, 30, 40, 50],
          }"
          :items-per-page="50"
          class="elevation-1 money_table"
        >
          <template #top>
            <div>
              <div class="px-3 pt-3">
                <div class="pt-2">
                  <h2 class="font-weight-regular text-body-1">
                    {{ fixTitle($t('title')) }}
                  </h2>
                  <div
                    class="d-flex flex-wrap align-center top_container justify-space-between mb-md-4"
                  >
                    <div
                      class="my-3 mb-0 md-md-3 grey darken-3 pa-3 px-lg-5 text-subtitle-1 d-flex align-center flex-wrap donation_container"
                    >
                      <span class="mr-3 text_info"
                        >{{ $t('info') }}
                        <a
                          target="_blank"
                          class="white--text"
                          href="https://www.trustpilot.com/review/cambio-uruguay.com"
                        >
                          {{ $t('here') }}</a
                        ></span
                      >
                      <div class="d-flex mt-2">
                        <a
                          target="_blank"
                          aria-label="Donar con Paypal"
                          class="white--text d-flex mr-4 align-center justify-content-left donation_logo"
                          href="https://ko-fi.com/cambio_uruguay"
                        >
                          <v-img
                            max-width="50px"
                            height="50px"
                            contain
                            src="/img/paypal_icon.png"
                          >
                            <template #sources>
                              <source srcset="/img/paypal_icon.webp" />
                            </template>
                          </v-img>
                        </a>
                        <a
                          aria-label="Donar con Mercado Pago"
                          class="white--text d-flex align-center justify-content-left donation_logo"
                          target="_blank"
                          href="https://mpago.la/19j46vX"
                        >
                          <v-img
                            max-width="50px"
                            height="50px"
                            contain
                            src="/img/mercadopago_icon.png"
                          >
                            <template #sources>
                              <source srcset="/img/mercadopago_icon.webp" />
                            </template>
                          </v-img>
                        </a>
                      </div>
                    </div>
                    <div class="button_section mb-3 mt-3 mt-md-0"></div>
                  </div>
                </div>
                <div>
                  <!-- Real-time Exchange House Search -->
                  <v-row class="mb-4">
                    <v-col cols="12" md="6">
                      <v-autocomplete
                        v-model="selectedExchangeHouse"
                        class="selectExchangeHouse"
                        :items="exchangeHouseOptions"
                        :label="$t('searchExchangeHouse')"
                        :no-data-text="$t('noExchangeHousesFound')"
                        multiple
                        clearable
                        chips
                        deletable-chips
                        hide-details
                        outlined
                        prepend-inner-icon="mdi-magnify"
                        @input="filterByExchangeHouse"
                        @click:clear="clearExchangeHouseFilter"
                      >
                      </v-autocomplete>
                    </v-col>
                    <v-col cols="12" md="6">
                      <div class="d-flex align-center">
                        <v-menu
                          v-model="datePickerMenu"
                          :close-on-content-click="false"
                          :nudge-right="40"
                          transition="scale-transition"
                          offset-y
                          min-width="auto"
                          class="flex-grow-1"
                        >
                          <template #activator="{ on, attrs }">
                            <v-text-field
                              v-model="selectedDate"
                              :label="$t('selectDate')"
                              prepend-inner-icon="mdi-calendar"
                              readonly
                              outlined
                              hide-details
                              v-bind="attrs"
                              v-on="on"
                            ></v-text-field>
                          </template>
                          <v-date-picker
                            v-model="selectedDate"
                            :max="new Date().toLocaleDateString('en-CA')"
                            @input="onDateChange"
                            @change="datePickerMenu = false"
                          ></v-date-picker>
                        </v-menu>
                        <v-btn
                          :title="$t('resetDate')"
                          class="ml-2"
                          icon
                          color="primary"
                          @click="resetDate"
                        >
                          <v-icon>mdi-refresh</v-icon>
                        </v-btn>
                      </div>
                    </v-col>
                  </v-row>

                  <v-row style="max-width: 1800px">
                    <v-col cols="12" md="6" lg="2">
                      <v-radio-group
                        v-model="wantTo"
                        hide-details
                        class="mt-0 mt-md-0"
                        @change="setPrice()"
                      >
                        <v-radio
                          :label="$t('wantToSell')"
                          value="sell"
                        ></v-radio>
                        <v-radio :label="$t('wantToBuy')" value="buy"></v-radio>
                      </v-radio-group>
                    </v-col>
                    <v-col cols="12" md="6" lg="2">
                      <v-text-field
                        v-model="amount"
                        hide-details
                        :label="
                          (wantTo === 'buy' ? $t('get') : $t('pay')) +
                          ' XXX ' +
                          code
                        "
                        type="number"
                        min="0"
                        placeholder="10"
                        @input="setPrice()"
                      >
                        <template #append-outer>
                          <v-btn
                            fab
                            color="primary"
                            small
                            @click="changeCode(code, code_with)"
                          >
                            <v-icon>mdi-cached</v-icon>
                          </v-btn>
                        </template>
                      </v-text-field>
                    </v-col>
                    <v-col cols="12" md="6" lg="3">
                      <v-select
                        v-model="code"
                        hide-details
                        :items="money"
                        :label="wantTo === 'buy' ? $t('get') : $t('pay')"
                        @change="updateTable()"
                      >
                        <template slot="selection" slot-scope="data">
                          <span>{{ data.item }} - {{ getTexts(data) }}</span>
                        </template>
                        <template slot="item" slot-scope="data">
                          <span>{{ data.item }} - {{ getTexts(data) }}</span>
                        </template>
                      </v-select>
                      <v-select
                        v-model="code_with"
                        class="mt-3"
                        hide-details
                        :items="plusUy(money)"
                        :label="wantTo === 'buy' ? $t('pay') : $t('get')"
                        @change="updateTable()"
                      >
                        <template slot="selection" slot-scope="data">
                          <span>{{ data.item }} - {{ getTexts(data) }}</span>
                        </template>
                        <template slot="item" slot-scope="data">
                          <span>{{ data.item }} - {{ getTexts(data) }}</span>
                        </template>
                      </v-select>
                    </v-col>
                    <v-col cols="12" md="6" lg="3">
                      <v-select
                        v-model="location"
                        hide-details
                        :items="locations"
                        :label="$t('departments')"
                        @change="updateTable()"
                      >
                        <template slot="selection" slot-scope="data">
                          <!-- HTML that describe how select should render selected items -->
                          <span>{{ capitalize(data.item) }}</span>
                        </template>
                        <template slot="item" slot-scope="data">
                          <!-- HTML that describe how select should render items when the select is open -->
                          <span>{{ capitalize(data.item) }}</span>
                        </template>
                      </v-select>
                    </v-col>
                    <v-col cols="12" md="6" lg="2">
                      <div class="mt-lg-3 d-flex flex-wrap gap-10">
                        <div>
                          <LocationPopup
                            ref="locationPopup"
                            @geoLocationSuccess="geoLocationSuccess"
                          />
                        </div>
                        <v-btn
                          aria-label="deshacer carga distancias"
                          :disabled="!latitude"
                          color="blue darken-3"
                          @click="undoDistances"
                        >
                          <v-icon> mdi-undo </v-icon>
                        </v-btn>
                        <v-btn
                          :title="$t('resetFilters')"
                          color="orange darken-3"
                          @click="resetAllFilters"
                        >
                          <v-icon> mdi-restore </v-icon>
                        </v-btn>
                      </div>
                    </v-col>
                    <v-col
                      v-if="items && items.length"
                      class="py-0 my-0 mt-1 mt-md-3"
                      cols="12"
                    >
                      <span>{{ get_text() }}</span
                      ><br />
                      <v-alert
                        v-if="amount"
                        class="green darken-4 mb-0 mt-3"
                        type="success"
                        dense
                      >
                        {{ savings() }}
                      </v-alert>
                    </v-col>
                    <v-col class="pt-0 mb-5" cols="12">
                      <div style="gap: 10px" class="d-flex flex-wrap">
                        <v-checkbox
                          v-model="notInterBank"
                          :disabled="onlyInterBank"
                          class="mr-md-3"
                          hide-details
                          :label="$t('hideInterBank')"
                          @change="updateTable()"
                        ></v-checkbox>
                        <v-checkbox
                          v-model="notConditional"
                          hide-details
                          :label="$t('hideConditional')"
                          @change="updateTable()"
                        ></v-checkbox>
                        <v-checkbox
                          v-model="hiddenWidgets"
                          hide-details
                          :label="$t('hideWidgets')"
                          @change="hideWidgets"
                        ></v-checkbox>
                      </div>
                    </v-col>
                  </v-row>
                </div>
              </div>
              <div
                v-show="hasScroll"
                id="wrapper2"
                ref="wrapper2"
                class="scroll-style-1"
              >
                <div
                  id="div2"
                  :style="{ width: scrollWidth }"
                  class="width-scroll"
                ></div>
              </div>
            </div>
          </template>
          <template #item.pos="{ item }">
            <span>#{{ item.pos }}</span>
          </template>
          <template #item.code="{ item }">
            <span
              >{{ item.code }}
              {{ item.type ? '(' + item.type + ')' : '' }}</span
            >
          </template>
          <template #item.buy="{ item }">
            <span>{{ formatNumber(item.buy) }}</span>
          </template>
          <template #item.sell="{ item }">
            <span>{{ formatNumber(item.sell) }}</span>
          </template>
          <template #item.condition="{ item }">
            <div v-if="item.condition" class="py-md-1">
              {{ $t(item.condition) }}
            </div>
          </template>
          <template #item.localData.website="{ item }">
            <a
              class="white--text d-block website_link"
              target="_blank"
              :href="item.localData.website"
              >{{
                item.localData.website
                  .replace(/(^\w+:|^)\/\//, '')
                  .replace(/\/$/, '')
              }}</a
            >
          </template>
          <template #item.localData.location="{ item }">
            <SearchExchange
              :type="item.type"
              :maps="item.localData.maps"
              :origin="item.origin"
              :location="location"
              :latitude="latitude"
              :longitude="longitude"
              :local-data="item.localData"
            />
          </template>
          <template #item.localData.bcu="{ item }">
            <BCU :item="item"></BCU>
          </template>
          <template #item.amount="{ item }">
            <v-chip :color="getColor(item)" class="ma-2">
              {{ formatMoney(item.amount) }}
            </v-chip>
          </template>
          <template slot="item.historical" slot-scope="{ item }">
            <div class="d-flex flex-column py-2" style="gap: 4px">
              <v-btn
                v-if="item.origin"
                :to="localePath(`/historico/${item.origin}`)"
                color="primary"
                small
                outlined
                dense
                class="text-caption mb-2"
              >
                <v-icon small left>mdi-chart-line</v-icon>
                Casa
              </v-btn>
              <v-btn
                v-if="item.origin && item.code"
                :to="getLinkHistory(item)"
                color="secondary"
                small
                outlined
                dense
                class="text-caption"
              >
                <v-icon small left>mdi-currency-usd</v-icon>
                Moneda
              </v-btn>
            </div>
          </template>
          <template #item.distance="{ item }">
            <a
              v-if="item.distance !== no_distance"
              :href="getDistanceLink(item)"
              target="_blank"
              class="white--text"
              >{{ formatDistance(item.distance) }}</a
            >
            <span v-else>-</span>
          </template>
          <template #item.diff="{ item }"> {{ item.diff }}% </template>
        </v-data-table>
      </client-only>
    </div>
    <div class="d-flex flex-wrap grid-list-md gap-10">
      <v-btn
        link
        color="red darken-4"
        target="_blank"
        href="https://finanzas.com.uy/los-mejores-prestamos-de-bancos/"
      >
        {{ $t('infoPrestamos') }}
      </v-btn>
      <v-btn
        color="primary"
        target="_blank"
        link
        href="https://docs.google.com/document/d/1BBDrsiT778SEIn5hqYltl-7dxQq9dSeG/edit"
      >
        <v-icon> mdi-file-document </v-icon>
      </v-btn>
      <v-btn
        aria-label="github"
        link
        color="grey darken-3"
        target="_blank"
        href="https://github.com/eduair94/cambio-uruguay"
      >
        <v-icon large> mdi-github </v-icon>
      </v-btn>
      <v-btn
        color="green darken-2"
        target="_blank"
        link
        href="https://status.cambio-uruguay.com"
      >
        App Status
      </v-btn>
    </div>
    <div class="mt-3">
      {{ $t('consulta') }}
      <a class="white--text" href="mailto:admin@cambio-uruguay.com"
        >admin@cambio-uruguay.com</a
      >
    </div>
    <v-alert class="mt-3 mt-md-4 mb-0 mb-md-3 blue darken-4" type="info" dense>
      {{ $t('disclaimer') }}
    </v-alert>

    <!-- API Usage Alert -->
    <v-alert
      v-model="showApiAlert"
      class="mt-3 mb-0 mb-md-3 green darken-4"
      type="success"
      dense
      dismissible
    >
      {{ $t('apiUsageMessage') }}
      <a
        class="white--text font-weight-bold"
        href="mailto:admin@cambio-uruguay.com"
      >
        admin@cambio-uruguay.com
      </a>
    </v-alert>

    <v-snackbar v-model="snackbar" color="green darken-2">
      <p class="text--white mb-0">{{ snackBarText }}</p>
      <template #action="{ attrs }">
        <v-btn text v-bind="attrs" @click="snackbar = false"> Close </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script lang="ts">
import { mapGetters } from 'vuex'
import { notFound } from '../services/not_found'
export default {
  name: 'HomePage',
  components: {
    LocationPopup: () => import('../components/LocationPopup.vue'),
    BCU: () => import('../components/BCU.vue'),
    SearchExchange: () => import('../components/SearchExchange.vue'),
  },
  async middleware({ store, redirect, $axios, $i18n, query }) {},
  data() {
    return {
      routeHasQuery: false,
      hiddenWidgets: false,
      hasScroll: false,
      all_items: [],
      snackbar: false,
      snackBarText: '',
      showApiAlert: true,
      loadingDistances: false,
      onlyInterbank: ['UR', 'UP'],
      location: 'TODOS',
      // Exchange house search functionality
      selectedExchangeHouse: [],
      exchangeHouseOptions: [],
      filteredItems: [],
      texts: {
        es: {
          USD: 'Dólares estadounidenses',
          ARS: 'Pesos Argentinos',
          BRL: 'Reales Brasileños',
          EUR: 'Euros',
          GBP: 'Libras Esterlinas',
          XAU: 'Oro',
          UR: 'Unidades Reajustables',
          UP: 'Unidad Previsional',
          UI: 'Unidades Indexadas',
          PYG: 'Guaraníes Paraguayos',
          PEN: 'Soles Peruanos',
          MXP: 'Pesos Mexicanos',
          JPY: 'Yenes',
          CLP: 'Pesos Chilenos',
          CHF: 'Francos Suizos',
          CAD: 'Dólares Canadienses',
          AUD: 'Dólares Australianos',
          UYU: 'Pesos Uruguayos',
        },
        pt: {
          USD: 'Dólares dos Estados Unidos',
          ARS: 'Pesos Argentinos',
          BRL: 'Reais Brasileiros',
          EUR: 'Euros',
          GBP: 'Libras Esterlinas Britânicas)',
          XAU: 'Ouro',
          UR: 'Unidades reajustáveis',
          UP: 'Unidade Previsional',
          UI: 'Unidades indexadas',
          PYG: 'Guaranis paraguaios',
          PEN: 'Soles peruanos',
          MXP: 'Pesos Mexicanos',
          JPY: 'iene japonês',
          CLP: 'Pesos chilenos',
          CHF: 'Francos suíços',
          CAD: 'Dólares canadenses',
          AUD: 'Dólares australianos',
          UYU: 'Pesos Uruguayos',
        },
        en: {
          USD: 'United States Dollars',
          ARS: 'Argentine Pesos',
          BRL: 'Brazilian Reais',
          EUR: 'Euros',
          GBP: 'British Pounds Sterling',
          XAU: 'Gold',
          UR: 'Readjustable Units',
          UP: 'Unidade Previsional',
          UI: 'Indexed Units',
          PYG: 'Paraguayan Guaraníes',
          PEN: 'Peruvian Soles',
          MXP: 'Mexican Pesos',
          JPY: 'Japanese Yen',
          CLP: 'Chilean Pesos',
          CHF: 'Swiss Francs',
          CAD: 'Canadian Dollars',
          AUD: 'Australian Dollars',
          UYU: 'Pesos Uruguayos',
        },
      },
      money: ['USD', 'ARS', 'BRL', 'EUR', 'GBP', 'UYU'],
      amount: 100,
      show_install: false,
      wantTo: 'buy',
      notConditional: false,
      day: new Date().toLocaleDateString('en-CA'),
      selectedDate: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD format using local date
      datePickerMenu: false, // Controls the date picker menu visibility
      isDateManuallySelected: false, // Track if user manually selected a date
      code: '',
      code_with: '',
      notInterBank: true,
      items: [],
      enableDistance: false,
      latitude: 0,
      longitude: 0,
      no_distance: 9999999,
      lastPos: undefined,
      scrollWidth: 0,
    }
  },
  head() {
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Cambio Uruguay',
      description: this.$t('seoDescription'),
      url: 'https://cambio-uruguay.com',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'All',
      offers: {
        '@type': 'Offer',
        description: 'Compare exchange rates from over 40 exchange houses',
        price: '0',
        priceCurrency: 'USD',
      },
      author: {
        '@type': 'Organization',
        name: 'Cambio Uruguay',
        url: 'https://cambio-uruguay.com',
      },
    }

    return {
      ...this.$nuxtI18nHead({
        addSeoAttributes: true,
      }),
      script: [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify(structuredData),
        },
      ],
      __dangerouslyDisableSanitizersByTagID: {
        'structured-data': ['innerHTML'],
      },
    }
  },
  computed: {
    ...mapGetters({
      allItems: 'all_items',
      locations: 'locations',
      fortex: 'fortex',
    }),
    onlyInterBank() {
      return this.onlyInterbank.includes(this.code)
    },
  },
  async beforeMount() {
    await this.beforeMountSetup()
  },
  mounted() {
    this.setScrollBar()
  },
  methods: {
    getLinkHistory(item: any) {
      let link = `/historico/${item.origin}/${item.code}`
      if (item.type) {
        link = `/historico/${item.origin}/${item.code}/${item.type}`
      }
      return this.localePath(link)
    },
    // Exchange house search methods
    filterByExchangeHouse() {
      if (
        !this.selectedExchangeHouse ||
        this.selectedExchangeHouse.length === 0
      ) {
        this.updateTable()
        this.setPrice() // Update URL to reflect cleared filter
        return
      }

      // Get the selected origins values (for multiple selection)
      const selectedOrigins = this.selectedExchangeHouse.map((item) =>
        typeof item === 'object' ? item.value : item
      )

      // Apply all existing filters first
      this.updateTable()

      // Then filter by the selected exchange houses
      this.items = this.items.filter((item) =>
        selectedOrigins.includes(item.origin)
      ) // Recalculate positions and amounts, and update URL
      this.setPrice()
    },
    clearExchangeHouseFilter() {
      this.selectedExchangeHouse = []
      this.updateTable()
      this.setPrice() // Update URL to reflect cleared filter
    },
    // Date change method
    async onDateChange() {
      this.isDateManuallySelected = true // Mark that user manually selected a date
      await this.setup()
      this.get_data()
    }, // Reset date method
    async resetDate() {
      this.selectedDate = new Date().toLocaleDateString('en-CA')
      this.isDateManuallySelected = false // Reset the flag when user resets to today
      await this.setup()
      this.get_data()
    },

    // Reset all filters method
    async resetAllFilters() {
      // Reset all form fields to their default values
      this.amount = 100
      this.wantTo = 'buy'
      this.code = 'USD'
      this.code_with = 'UYU'
      this.location = 'TODOS'
      this.selectedDate = new Date().toLocaleDateString('en-CA')
      this.isDateManuallySelected = false
      this.notInterBank = true
      this.notConditional = false
      this.hiddenWidgets = false
      this.selectedExchangeHouse = []

      // Reset distance filters
      this.undoDistances()

      // Update data and table
      await this.setup()
      this.get_data()

      // Show confirmation
      this.snackbar = true
      this.snackBarText = this.$t('filtersReset') || 'Filtros restablecidos'
      setTimeout(() => {
        this.snackbar = false
      }, 2000)
    },

    buildExchangeHouseOptions() {
      const uniqueOrigins = [
        ...new Set(this.all_items.map((item) => item.origin)),
      ]
      this.exchangeHouseOptions = uniqueOrigins
        .map((origin) => {
          const item = this.all_items.find((i) => i.origin === origin)
          return {
            text: item.localData?.name || origin,
            value: origin,
            website: item.localData?.website,
          }
        })
        .sort((a, b) => a.text.localeCompare(b.text))
    },

    // Helper method to fetch data for a specific date
    async fetchDataForDate(date) {
      const localData = await this.$axios
        .get('https://api.cambio-uruguay.com/localData')
        .then((res) => res.data)

      const getCondition = (el) => {
        if (el.origin === 'prex') {
          return 'prex_condition'
        }
        if (el.type === 'EBROU') {
          return 'ebrou_condition'
        }
        return ''
      }

      const isInterBank = (item: any) => {
        return (
          item.origin === 'bcu' ||
          ['INTERBANCARIO', 'FONDO/CABLE'].includes(item.type)
        )
      }

      try {
        const data = await this.$axios
          .get('https://api.cambio-uruguay.com', {
            params: { date: date },
          })
          .then((res) => {
            // Check if the response contains an error
            if (res.data && res.data.error === 'No results found') {
              throw new Error('No results found')
            }
            return (res.data as any[])
              .map((el: any) => {
                el.localData = localData[el.origin]
                if (!el.localData) {
                  el.localData = null
                }
                el.isInterBank = isInterBank(el)
                el.condition = getCondition(el)
                return el
              })
              .filter((el: any) => el.localData)
          })

        return data
      } catch (error) {
        console.error('API Error for date', date, ':', error)
        return null // Return null to indicate no data found
      }
    },

    async setup() {
      ;(window as any).startLoading()
      const locations = ['TODOS', 'MONTEVIDEO']
      const localData = await this.$axios
        .get('https://api.cambio-uruguay.com/localData')
        .then((res) => res.data)
      console.log('Local Data Response', localData)
      for (const key in localData) {
        const val = localData[key]
        const departments = val.departments
        if (departments && departments.length) {
          for (const dep of departments) {
            if (!locations.includes(dep)) {
              locations.push(dep)
            }
          }
        }
      }

      const getCondition = (el) => {
        if (el.origin === 'prex') {
          return 'prex_condition'
        }
        if (el.type === 'EBROU') {
          return 'ebrou_condition'
        }
        return ''
      }

      const isInterBank = (item: any) => {
        return (
          item.origin === 'bcu' ||
          ['INTERBANCARIO', 'FONDO/CABLE'].includes(item.type)
        )
      }

      const dataFortex = await this.$axios
        .get('https://api.cambio-uruguay.com/fortex')
        .then((res) => res.data)
      this.$store.dispatch('setFortex', dataFortex)

      // Implement fallback logic to find data from previous dates
      let data = []
      let currentDate = this.selectedDate
      let attempts = 0
      const maxAttempts = 7

      // Only try fallback if the date was not manually selected by the user
      if (!this.isDateManuallySelected) {
        while (attempts < maxAttempts && data.length === 0) {
          try {
            const response = await this.$axios.get(
              'https://api.cambio-uruguay.com',
              {
                params: { date: currentDate },
              }
            )

            if (response.data && response.data.error !== 'No results found') {
              data = (response.data as any[])
                .map((el: any) => {
                  el.localData = localData[el.origin]
                  if (!el.localData) {
                    el.localData = null
                  }
                  el.isInterBank = isInterBank(el)
                  el.condition = getCondition(el)
                  return el
                })
                .filter((el: any) => el.localData)

              // If we found data but it's from a previous date, update selectedDate
              if (data.length > 0 && currentDate !== this.selectedDate) {
                this.selectedDate = currentDate
                console.log(
                  `No data for ${this.selectedDate}, using data from ${currentDate}`
                )
              }
              break
            }
          } catch (error) {
            console.error('API Error for date', currentDate, ':', error)
          }

          // Move to previous day
          const previousDate = new Date(currentDate)
          previousDate.setDate(previousDate.getDate() - 1)
          currentDate = previousDate.toLocaleDateString('en-CA')
          attempts++
        }
      } else {
        // User manually selected a date, just try that date once
        try {
          const response = await this.$axios.get(
            'https://api.cambio-uruguay.com',
            {
              params: { date: this.selectedDate },
            }
          )

          if (response.data && response.data.error !== 'No results found') {
            data = (response.data as any[])
              .map((el: any) => {
                el.localData = localData[el.origin]
                if (!el.localData) {
                  el.localData = null
                }
                el.isInterBank = isInterBank(el)
                el.condition = getCondition(el)
                return el
              })
              .filter((el: any) => el.localData)
          }
        } catch (error) {
          console.error('API Error:', error)
          this.snackbar = true
          this.snackBarText = this.$t('noDataAvailable')
        }
      }

      // If still no data found after all attempts, show error
      if (data.length === 0) {
        this.snackbar = true
        this.snackBarText = this.$t('noDataAvailable')
      }

      console.log('Data', data)
      this.$store.dispatch('setLocations', locations)
      this.$store.dispatch('setItems', data)
      this.all_items = [...this.allItems]
      ;(window as any).stopLoading()
    },
    changeCode(code: string, codeWith: string) {
      this.code = codeWith
      this.code_with = code
      this.updateTable()
    },
    formatNumber(number: number) {
      const nString = number.toString()
      if (!nString.includes('.')) {
        return number.toFixed(2)
      }
      const n = number.toPrecision(2)
      const nSplit = nString.split('.')[1]
      if (nSplit.length <= 2) {
        return number.toFixed(2)
      }
      return n
    },
    hideFeedback() {
      document.head.insertAdjacentHTML(
        'beforeend',
        `<style type="text/css" class="custom_style_list">
                    ._hj_feedback_container {
                      display:none!important;
                    }
            </style>`
      )
    },
    hideWidgets(val: boolean, att = 0) {
      const t = (window as any).Tawk_API
      if (t && t.hideWidget) {
        if (val) {
          localStorage.setItem('hideWidgets', '1')
          t.hideWidget()
          this.hideFeedback()
        } else {
          localStorage.removeItem('hideWidgets')
          t.showWidget()
          const el = document.querySelector('.custom_style_list')
          if (el) el.remove()
        }
      } else {
        this.$nextTick(() => {
          att++
          if (att === 10) {
            console.log('hide widget', att)
            return
          }
          this.hideWidgets(val, att)
        })
      }
    },
    readQueryParameters() {
      // Check if there are query parameters when loading the url
      this.routeHasQuery = Object.keys(this.$route.query).length > 0

      if (this.$route.query.notConditional) {
        this.notConditional = true
      }
      if (this.$route.query.notInterBank) {
        this.notInterBank = true
      }
      this.amount = this.$route.query.amount
        ? parseFloat(this.$route.query.amount)
        : 100
      this.wantTo = this.$route.query.wantTo ? this.$route.query.wantTo : 'buy'
      this.code = this.$route.query.currency
        ? this.$route.query.currency
        : 'USD'
      this.location = this.$route.query.location
        ? this.$route.query.location
        : 'TODOS'
      this.code_with = this.$route.query.currency_with
        ? this.$route.query.currency_with
        : 'UYU' // Load selected date from query parameters or default to today
      this.selectedDate = this.$route.query.date
        ? this.$route.query.date
        : new Date().toLocaleDateString('en-CA')
    },
    async beforeMountSetup() {
      // Set query parameters
      this.readQueryParameters()
      await this.setup()

      // Build exchange house options for autocomplete
      this.buildExchangeHouseOptions()
      let pwaInstall = false
      try {
        if (!window.matchMedia('(display-mode: standalone)').matches) {
          pwaInstall = true
        }
      } catch (e) {
        console.error(e)
      }
      if (pwaInstall) {
        ;(window as any).deferredPrompt = null
        window.addEventListener('beforeinstallprompt', (e) => {
          ;(window as any).deferredPrompt = e
          if (e !== null) {
            this.show_install = true
          }
        })
      }

      // Load selected exchange houses from query parameters
      if (this.$route.query.exchangeHouses) {
        try {
          const exchangeHouses = this.$route.query.exchangeHouses.split(
            ','
          ) as string
          if (Array.isArray(exchangeHouses)) {
            this.selectedExchangeHouse = exchangeHouses
          }
        } catch (e) {
          console.error('Error parsing exchangeHouses from query:', e)
        }
      }

      this.get_data()

      if (localStorage.getItem('hideWidgets') === '1') {
        this.hiddenWidgets = true
        ;(window as any).Tawk_API.onLoad = () => {
          ;(window as any).Tawk_API.hideWidget()
        }
        this.hideFeedback()
      }
    },
    plusUy(array: string[]) {
      return [...array.filter((el) => el !== this.code), 'UYU']
    },
    setScrollBar() {
      const tableWrapper = document.querySelector(
        '.money_table .v-data-table__wrapper'
      )
      if (!tableWrapper) {
        this.$nextTick(() => {
          this.setScrollBar()
        })
        return
      }
      // Check if resolution is mobile.
      const isMobile = document.querySelector(
        '.money_table.v-data-table--mobile'
      )
      this.hasScroll = tableWrapper.scrollWidth > tableWrapper.clientWidth
      let wp1 = null
      let wp2 = null
      let wrapper1 = null
      let wrapper2 = null
      if (this.hasScroll && !isMobile) {
        wrapper1 = document.querySelector('.money_table .v-data-table__wrapper')
        wrapper2 = this.$refs.wrapper2
        if (!wrapper2 || !wrapper1) {
          this.$nextTick(() => {
            this.setScrollBar()
          })
          return
        }

        const table = document.querySelector('.money_table table')

        this.scrollWidth = table.clientWidth + 10 + 'px'

        let scrolling = false
        wp1 = function () {
          if (scrolling) {
            scrolling = false
            return true
          }
          scrolling = true

          wrapper2.scrollLeft = wrapper1.scrollLeft
        }

        wp2 = function () {
          if (scrolling) {
            scrolling = false
            return true
          }
          scrolling = true
          wrapper1.scrollLeft = wrapper2.scrollLeft
        }

        wrapper1.addEventListener('scroll', wp1)
        wrapper2.addEventListener('scroll', wp2)
      }

      addEventListener(
        'resize',
        () => {
          if (wrapper1) {
            wrapper1.removeEventListener('scroll', wp1)
            wrapper2.removeEventListener('scroll', wp2)
          }
          this.setScrollBar()
        },
        { once: true }
      )
    },
    getTexts(data: any) {
      return this.texts[this.$i18n.locale][data.item]
    },
    getDistanceLink({ distanceData, localData, origin }) {
      if (distanceData) {
        const { latitude, longitude, map } = distanceData
        if (map) return map
        if (!notFound.includes(origin)) {
          return `https://www.google.com.uy/maps/search/${encodeURI(
            localData.name
          )}/@${latitude},${longitude},18.77z`
        } else {
          return `https://www.google.com.uy/maps/search/${latitude},${longitude}`
        }
      }
    },
    fixTitle(text: string) {
      return text.replace('{{day}}', this.day)
    },
    geoLocationSuccess(
      distances: any,
      latitude: number,
      longitude: number,
      distanceData: any,
      radius: number
    ) {
      this.latitude = latitude
      this.longitude = longitude
      let allItems = this.all_items.map((item: any) => {
        item.distance = distances[item.origin]
          ? distances[item.origin]
          : this.no_distance
        if (item.distance !== this.no_distance) {
          item.distanceData = distanceData[item.distance]
        }
        return item
      })
      if (radius) {
        allItems = allItems.filter((item: any) => item.distance <= radius)
      }
      this.all_items = allItems
      this.updateTable()
      this.enableDistance = true
      this.snackbar = true
      this.snackBarText = 'Distancias cargadas correctamente'
      setTimeout(() => {
        this.snackbar = false
      }, 1500)
    },
    undoDistances() {
      this.latitude = 0
      this.longitude = 0
      this.enableDistance = false
      this.all_items = [...this.allItems]
      this.updateTable()
    },
    formatDistance(item: number) {
      if (item >= 1000) {
        return Math.round(item / 1000.0) + ' km'
      } else if (item >= 100) {
        return Math.round(item) + ' m'
      } else {
        return item.toFixed(1) + ' m'
      }
    },
    capitalize(entry: string) {
      let str = entry
      if (entry === 'TODOS') {
        const locale = this.$i18n.locale
        const tr = {
          es: 'TODOS',
          en: 'ALL',
          pt: 'TODOS',
        }
        str = tr[locale]
      }
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
    },
    getHeaders() {
      const toReturn = [
        {
          text: 'Rank',
          value: 'pos',
          width: 'auto',
        },
        {
          text: this.wantTo === 'buy' ? this.$t('pagas') : this.$t('recibes'),
          value: 'amount',
          width: 'auto',
        },
        {
          text: this.$t('moneda'),
          align: 'start',
          sortable: false,
          width: '180px',
          value: 'code',
        },
        { text: this.$t('casaDeCambio'), value: 'localData.name' },
        { text: this.$t('compra') + ` (${this.code_with})`, value: 'buy' },
        { text: this.$t('venta') + ` (${this.code_with})`, value: 'sell' },
        { text: 'Dif (%)', value: 'diff' },
        {
          text: this.$t('sitioWeb'),
          value: 'localData.website',
          sortable: false,
          width: 'auto',
        },
        {
          text: this.$t('buscarSucursal'),
          value: 'localData.location',
          sortable: false,
        },
        { text: this.$t('condicional'), value: 'condition', width: '250px' },
        { text: 'BCU', value: 'localData.bcu', width: '50px' },
        {
          text: this.$t('historical.viewHistorical'),
          value: 'historical',
          sortable: false,
          width: '140px',
        },
      ]
      if (this.enableDistance) {
        toReturn.push({
          text: this.$t('distancia'),
          value: 'distance',
          width: 'auto',
        })
      }
      return toReturn
    },
    savings() {
      if (!this.items.length) return
      const i = this.items
      const key = this.wantTo === 'buy' ? 'sell' : 'buy'
      const maxValue = i[0][key]
      const minValue = i[i.length - 1][key]
      let savePercent = 0
      if (key === 'buy') {
        savePercent = ((maxValue - minValue) / minValue) * 100
      } else {
        savePercent = ((minValue - maxValue) / maxValue) * 100
      }
      const saveAmount =
        Math.abs((maxValue - minValue) * this.amount).toFixed(2) +
        ' ' +
        this.code_with
      const s = savePercent.toFixed(2)
      const loc = {
        es: `Puedes ahorrar hasta un ${s}% (${saveAmount}) utilizando nuestra app.`,
        en: `You can save up to ${s}% (${saveAmount}) by using our app`,
        pt: `Você pode economizar até ${s}% (${saveAmount}) ao utilizar nosso aplicativo`,
      }
      return loc[this.$i18n.locale]
    },
    share() {
      let text = this.buy ? `${this.$t('sell')} ` : `${this.$t('buy')} `
      if (this.texts[this.$i18n.locale][this.code]) {
        text +=
          this.texts[this.$i18n.locale][this.code].toLowerCase() +
          ' ' +
          '(' +
          this.code +
          ')'
      } else {
        text += this.code
      }
      let extra = ''
      if (this.location !== 'TODOS') {
        extra += this.$t('from') + this.capitalize(this.location) + ' '
      }
      const loc = {
        es: 'Estas son las mejores entidades uruguayas',
        en: 'These are the best Uruguayan entities',
        pt: 'Estas são as melhores entidades uruguaias',
      }
      const finalText =
        loc[this.$i18n.locale] + ' ' + extra + this.$t('to') + ' ' + text
      try {
        navigator.share({
          url: window.location.href,
          text: finalText,
          title: 'Cambio Uruguay',
        })
      } catch (e) {
        console.error(e)
      }
    },
    async install_app() {
      const deferredPrompt = (window as any).deferredPrompt
      if (deferredPrompt) {
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') {
          ;(window as any).deferredPrompt = null
        }
      } else if (this.$refs.pwa_open) {
        this.$refs.pwa_open.click()
      }
    },
    get_text() {
      if (!this.items.length) return
      const m = this.formatMoney(this.items[0].amount)
      if (this.wantTo === 'buy') {
        const loc = {
          es: `Comprar ${this.amount} ${this.code} te costará un total de ${m}.`,
          en: `Buying ${this.amount} ${this.code} will cost you a total of ${m}.`,
          pt: `Comprar ${this.amount} ${this.code} lhe custará um total de ${m}.`,
        }
        return loc[this.$i18n.locale]
      } else {
        const loc = {
          es: `Te darán ${m} por tus ${this.amount} ${this.code}.`,
          en: `You will receive ${m} for your ${this.amount} ${this.code}.`,
          pt: `Você receberá ${m} por seus ${this.amount} ${this.code}.`,
        }
        return loc[this.$i18n.locale]
      }
    },
    getColor({ pos }) {
      if (this.amount === 0) return ''
      if (pos === 1) return 'green darken-4'
      if (pos === this.lastPos) return 'red darken-4'
      return ''
    },
    formatMoney(number) {
      return number.toLocaleString('es-ES', {
        style: 'currency',
        currency: this.code_with,
      })
    },
    row_classes(item) {
      if (item.isInterBank) {
        return 'purple darken-4'
      }
      if (item.condition) {
        return 'grey darken-3'
      }
      return ''
    },
    updateTable() {
      if (this.code === 'UYU') {
        this.items = this.all_items.filter(
          (el) =>
            (!this.code || el.code === this.code_with) &&
            (!this.notInterBank ||
              !el.isInterBank ||
              this.onlyInterbank.includes(this.code)) &&
            (!this.notConditional || !el.condition) &&
            (this.location === 'TODOS' ||
              !el.localData.departments.length ||
              el.localData.departments.includes(this.location))
        )
      } else {
        this.items = this.all_items.filter(
          (el) =>
            (!this.code || el.code === this.code) &&
            (!this.notInterBank ||
              !el.isInterBank ||
              this.onlyInterbank.includes(this.code)) &&
            (!this.notConditional || !el.condition) &&
            (this.location === 'TODOS' ||
              !el.localData.departments.length ||
              el.localData.departments.includes(this.location))
        )
      } // Apply exchange house filter if one is selected
      if (this.selectedExchangeHouse && this.selectedExchangeHouse.length > 0) {
        const selectedOrigins = this.selectedExchangeHouse.map((item) =>
          typeof item === 'object' ? item.value : item
        )
        this.items = this.items.filter((el) =>
          selectedOrigins.includes(el.origin)
        )
      }

      if (this.code_with && this.code_with !== 'UYU') {
        const codeOrigins: any = {}
        this.items = this.items
          .filter((el) => {
            if (this.code === 'UYU') return true
            const f = this.all_items.find(
              (e) =>
                e.origin === el.origin &&
                e.code === this.code_with &&
                e.type === el.type
            )
            codeOrigins[el.origin + (el.type ? el.type : '')] = f
            return f !== undefined
          })
          .map((e) => {
            const el = { ...e }
            if (this.code === 'UYU') {
              el.sell = 1 / e.buy
              el.buy = 1 / e.sell
            } else if (el.origin === 'fortex') {
              if (
                (this.code_with === 'ARS' && this.code === 'USD') ||
                (this.code === 'ARS' && this.code_with === 'USD')
              ) {
                el.sell = this.fortex[this.code_with][this.code]
              } else {
                el.sell = 1 / this.fortex[this.code_with][this.code]
              }
              el.buy = this.fortex[this.code][this.code_with]
            } else {
              const f = codeOrigins[el.origin + (el.type ? el.type : '')]
              el.sell = e.sell / f.buy
              el.buy = e.buy / f.sell
            }
            return el
          })
      }
      this.setPrice()
    },
    setPrice() {
      if (this.amount < 0) {
        this.amount = 0
      }
      const query: any = {
        currency: this.code,
        amount: this.amount,
        wantTo: this.wantTo,
        location: this.location,
        currency_with: this.code_with,
        date: this.selectedDate,
        notInterBank: this.notInterBank ? 1 : undefined,
        notConditional: this.notConditional ? 1 : undefined,
        exchangeHouses:
          this.selectedExchangeHouse && this.selectedExchangeHouse.length > 0
            ? this.selectedExchangeHouse.join(',')
            : undefined,
      }
      // Change route.
      if (this.routeHasQuery) {
        // If there are no query parameters, we push the new query
        this.$router.push({
          ...this.$route.query,
          query,
        })
      } else {
        this.routeHasQuery = true
      }
      const amount = this.amount
      const wanToSell = this.wantTo === 'sell'
      this.items.sort((a, b) => {
        if (wanToSell) {
          if (b.buy === a.buy) return 0
          return b.buy <= a.buy ? -1 : 1
        }
        if (b.sell === a.sell) return 0
        return b.sell <= a.sell ? 1 : -1
      })
      let pos = 1
      this.items = (this.items as any[]).map((el, index, arr) => {
        if (index !== 0) {
          if (wanToSell) {
            if (el.buy !== arr[index - 1].buy) {
              pos++
            }
          } else if (el.sell !== arr[index - 1].sell) {
            pos++
          }
        }
        el.pos = pos
        const sell = amount * el.buy
        const buy = amount * el.sell
        el.amount = wanToSell ? sell : buy
        el.diff = (((buy - sell) / sell) * 100).toFixed(2)
        return el
      })
      this.lastPos = pos
    },
    finishLoading() {
      this.$nextTick(() => {
        const el = document.getElementById('spinner-wrapper')
        if (el) el.style.display = 'none'
        else {
          this.finishLoading()
        }
      })
    },
    get_data() {
      this.all_items.forEach(({ code }) => {
        if (!this.money.includes(code)) {
          this.money.push(code)
        }
      })
      this.updateTable()

      // Apply exchange house filter if there are selected items from query parameters
      if (this.selectedExchangeHouse && this.selectedExchangeHouse.length > 0) {
        this.filterByExchangeHouse()
      }

      this.finishLoading()
    },
  },
}
</script>
