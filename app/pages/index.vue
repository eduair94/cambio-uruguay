<template>
  <div class="mt-md-4">
    <h1 class="text-h5">
      {{ $t('welcome') }}
    </h1>
    <div class="my-4">
      <h1 style="display: none">
        cotizaciones uruguay,casa cambiaria,cambio moneda,cambio dólares,cambio
        pesos argentinos,cambio reales,cambio euros,varlix,prex,gales,cambio
        montevideo,cambio,donde cambiar dólares en Uruguay,cambio divisas,donde
        comprar pesos argentinos en uruguay,donde comprar dolares en uruguay
      </h1>
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
                    class="
                      d-flex
                      flex-wrap
                      align-center
                      top_container
                      justify-space-between
                      mb-md-4
                    "
                  >
                    <div
                      class="
                        my-3
                        mb-0
                        md-md-3
                        grey
                        darken-3
                        pa-3
                        px-lg-5
                        text-subtitle-1
                        d-flex
                        align-center
                        flex-wrap
                        donation_container
                      "
                    >
                      <span class="mr-3">{{ $t('info') }}</span>
                      <div class="d-flex mt-2">
                        <a
                          target="_blank"
                          aria-label="Donar con Paypal"
                          class="
                            white--text
                            d-flex
                            mr-4
                            align-center
                            justify-content-left
                            donation_logo
                          "
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
                          class="
                            white--text
                            d-flex
                            align-center
                            justify-content-left
                            donation_logo
                          "
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
                    <div class="button_section mb-3">
                      <v-btn
                        color="#78C257"
                        link
                        target="_blank"
                        href="https://play.google.com/store/apps/details?id=com.cambio_uruguay.twa"
                      >
                        <v-icon> mdi-android </v-icon>
                      </v-btn>
                      <a
                        ref="pwa_open"
                        style="display: none"
                        target="_blank"
                        href="https://cambio-uruguay.com"
                        >PWA</a
                      >
                      <v-btn
                        aria-label="compartir"
                        color="blue darken-1"
                        @click="share"
                      >
                        <v-icon large> mdi-share </v-icon>
                      </v-btn>
                      <v-btn
                        aria-label="twitter"
                        link
                        color="#00acee"
                        target="_blank"
                        href="https://twitter.com/cambio_uruguay"
                      >
                        <v-icon large> mdi-twitter </v-icon>
                      </v-btn>
                      <v-btn
                        aria-label="linkedin"
                        link
                        color="#0e76a8"
                        target="_blank"
                        href="https://www.linkedin.com/company/cambio-uruguay/"
                      >
                        <v-icon large> mdi-linkedin </v-icon>
                      </v-btn>
                    </div>
                  </div>
                </div>
                <div>
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
                        :label="'XXX ' + code"
                        type="number"
                        min="0"
                        placeholder="10"
                        @input="setPrice()"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" md="6" lg="3">
                      <v-select
                        v-model="code"
                        hide-details
                        :items="money"
                        :label="$t('currency')"
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
                        :label="
                          wantTo === 'buy'
                            ? $t('buying_with')
                            : $t('paying_with')
                        "
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
                      <div class="mt-lg-3 d-flex flex-wrap">
                        <div class="mr-2">
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
            <span>{{ item.buy.toFixed(2) }}</span>
          </template>
          <template #item.sell="{ item }">
            <span>{{ item.sell.toFixed(2) }}</span>
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
    <v-snackbar v-model="snackbar" color="green darken-2">
      <p class="text--white mb-0">{{ snackBarText }}</p>
      <template #action="{ attrs }">
        <v-btn text v-bind="attrs" @click="snackbar = false"> Close </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script lang="ts">
import { mapGetters, mapActions } from 'vuex'
import { notFound } from '../services/not_found'
export default {
  name: 'HomePage',
  components: {
    LocationPopup: () => import('../components/LocationPopup.vue'),
    BCU: () => import('../components/BCU.vue'),
    SearchExchange: () => import('../components/SearchExchange.vue'),
  },
  async middleware({ store, redirect, $axios, $i18n, query }) {
    const locations = ['TODOS', 'MONTEVIDEO']
    const localData = await $axios
      .get('https://cambio.shellix.cc/localData')
      .then((res) => res.data)
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

    const dataFortex = await $axios
      .get('https://cambio.shellix.cc/fortex')
      .then((res) => res.data)
    store.dispatch('setFortex', dataFortex)

    const data = await $axios.get('https://cambio.shellix.cc').then((res) =>
      (res.data as any[])
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
    )
    store.dispatch('setLocations', locations)
    store.dispatch('setItems', data)
  },
  data() {
    return {
      hiddenWidgets: false,
      hasScroll: false,
      all_items: [],
      snackbar: false,
      snackBarText: '',
      loadingDistances: false,
      onlyInterbank: ['UR', 'UP'],
      location: 'TODOS',
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
      day: new Date().toLocaleDateString(),
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
    return this.$nuxtI18nHead({
      addSeoAttributes: true,
    })
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
  beforeMount() {
    this.beforeMount()
  },
  mounted() {
    ;(window as any).startLoading = () => {
      const el = document.getElementById('spinner-wrapper')
      if (el) el.style.display = 'flex'
    }
    ;(window as any).stopLoading = () => {
      const el = document.getElementById('spinner-wrapper')
      if (el) el.style.display = 'none'
    }
    this.setScrollBar()
  },
  methods: {
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
    beforeMount() {
      this.all_items = [...this.allItems]
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
        : 'UYU'
      this.get_data()

      if (localStorage.getItem('hideWidgets') === '1') {
        this.hiddenWidgets = true
        ;(window as any).Tawk_API.onLoad = () => {
          ;(window as any).Tawk_API.hideWidget()
          this.hideFeedback()
        }
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
        notInterBank: this.notInterBank ? 1 : undefined,
        notConditional: this.notConditional ? 1 : undefined,
      }
      // Change route.
      this.$router.push({
        ...this.$route.query,
        query,
      })
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
      this.finishLoading()
    },
  },
}
</script>

<style lang="scss">
body {
  font-family: 'Open Sans', sans-serif;
}

.no_link {
  text-decoration: none;
}
.website_link {
  word-break: break-all;
  max-width: 100%;
  min-width: 150px;
}

.button_section {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

@media (min-width: 768px) {
  .website_link {
    min-width: 200px;
  }
}

@media (max-width: 1750px) {
  body .container {
    max-width: 100% !important;
  }
}

.v-data-table__mobile-row {
  width: 100%;
}

.money_table
  .v-data-table__mobile-table-row
  > .v-data-table__mobile-row:nth-child(10) {
  flex-direction: column;
  justify-content: flex-start;
  .v-data-table__mobile-row__header {
    width: 100%;
  }
  .v-data-table__mobile-row__cell {
    text-align: left;
    div {
      margin-bottom: 12px;
    }
  }
}

.top_container {
  gap: 12px;
}

.donation_logo {
  transition: ease-in-out 0.3s;
}
.donation_logo:hover {
  transform: scale(1.05);
  filter: drop-shadow(0px 0px 3px black);
}

.gap-10 {
  gap: 10px;
}

#wrapper2 {
  width: 100%;
  overflow-x: scroll;
  overflow-y: hidden;
}

/* This div allow to make the scroll function and show the scrollbar */
#div2 {
  height: 1px;
  overflow: scroll;
}

@media (max-width: 768px) {
  .button_section {
    gap: 5px !important;
    button,
    a {
      min-width: 30px !important;
      max-width: calc(80vw / 5);
    }
  }
}
</style>