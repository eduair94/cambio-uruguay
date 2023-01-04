<template>
  <div class="mt-md-4">
    <h1 class="text-h5">
      Encuentra la mejor cotización en el mercado, comparando entre más de 40
      casas de cambio.
    </h1>
    <client-only>
      <div class="my-4">
        <v-data-table
          :sort-by.sync="sortBy"
          :sort-desc.sync="sortDesc"
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
            <div class="px-3 pt-3">
              <div class="pt-2">
                <h3 class="font-weight-regular">
                  Cotizaciones del día {{ day }}. Se actualizan cada 10 minutos
                  con respecto a la información de la web.
                </h3>
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
                    <span class="mr-3"
                      >Si la información del sitio te sirvió, puedes ayudar a
                      mantenerlo</span
                    >
                    <div class="d-flex mt-2">
                      <a
                        target="_blank"
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
                        ></v-img>
                      </a>
                      <a
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
                        ></v-img>
                      </a>
                    </div>
                  </div>
                  <div class="button_section mb-3">
                    <v-btn color="blue darken-2" @click="install_app">
                      <v-icon>mdi-download</v-icon>
                    </v-btn>
                    <v-btn color="blue darken-1" @click="share">
                      <v-icon large> mdi-share </v-icon>
                    </v-btn>
                    <v-btn
                      link
                      color="#00acee"
                      target="_blank"
                      href="https://twitter.com/cambio_uruguay"
                    >
                      <v-icon large> mdi-twitter </v-icon>
                    </v-btn>
                    <v-btn
                      link
                      color="grey darken-3"
                      target="_blank"
                      href="https://github.com/eduair94/cambio-uruguay"
                    >
                      <v-icon large> mdi-github </v-icon>
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
                      class="mt-md-0"
                      @change="setPrice()"
                    >
                      <v-radio label="Quiero vender" value="sell"></v-radio>
                      <v-radio label="Quiero comprar" value="buy"></v-radio>
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
                      label="Moneda"
                      @change="updateTable"
                    >
                      <template slot="selection" slot-scope="data">
                        <!-- HTML that describe how select should render selected items -->
                        <span>{{ data.item }} - {{ texts[data.item] }}</span>
                      </template>
                      <template slot="item" slot-scope="data">
                        <!-- HTML that describe how select should render items when the select is open -->
                        <span>{{ data.item }} - {{ texts[data.item] }}</span>
                      </template>
                    </v-select>
                  </v-col>
                  <v-col cols="12" md="6" lg="3">
                    <v-select
                      v-model="location"
                      hide-details
                      :items="locations"
                      label="Departamento"
                      @change="updateTable"
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
                    <v-tooltip top>
                      <template #activator="{ on, attrs }">
                        <v-btn
                          class="mt-lg-3"
                          color="primary"
                          v-bind="attrs"
                          :loading="loadingDistances"
                          v-on="on"
                          @click="geoLocation"
                          >Locales cercanos</v-btn
                        >
                      </template>
                      <span
                        >Funciona de forma más precisa en celulares /
                        tablets</span
                      >
                    </v-tooltip>
                  </v-col>
                  <v-col
                    v-if="items && items.length"
                    class="py-0 my-0 mt-1 mt-md-3"
                    cols="12"
                  >
                    <span>{{ get_text() }}</span
                    ><br />
                    <v-alert
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
                        :label="`Ocultar cotizaciones interbancarias`"
                        @change="updateTable"
                      ></v-checkbox>
                      <v-checkbox
                        v-model="notConditional"
                        hide-details
                        :label="`Ocultar cotizaciones con condiciones`"
                        @change="updateTable"
                      ></v-checkbox>
                    </div>
                  </v-col>
                </v-row>
              </div>
            </div>
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
            <div>{{ item.condition }}</div>
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
              :maps="item.localData.maps"
              :origin="item.origin"
              :location="location"
              :latitude="latitude"
              :longitude="longitude"
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
            {{ formatDistance(item.distance) }}
          </template>
          <template #item.diff="{ item }"> {{ item.diff }}% </template>
        </v-data-table>
      </div>
    </client-only>
    <v-btn
      link
      color="orange darken-4"
      target="_blank"
      href="https://finanzas.com.uy/los-mejores-prestamos-de-bancos/"
    >
      Información sobre préstamos
    </v-btn>
    <div
      id="updates"
      style="width: 100%"
      class="w-100 d-flex justify-center mt-3 twitter_feed"
    >
      <a
        class="twitter-timeline"
        data-tweet-limit="5"
        data-width="100%"
        tw-align="center"
        data-theme="dark"
        align="center"
        href="https://twitter.com/cambio_uruguay?ref_src=twsrc%5Etfw"
      ></a>
    </div>
    <div class="mt-3">
      Ante cualquier problema / consulta / propuesta enviar correo electrónico a
      <a class="white--text" href="mailto:admin@cambio-uruguay.com"
        >admin@cambio-uruguay.com</a
      >
    </div>
    <v-alert class="mt-3 mt-md-4 mb-0 mb-md-3" type="info" dense>
      Este sitio fue creado únicamente con la intención de educar, no nos
      hacemos responsables por el mal uso de la información.
    </v-alert>
  </div>
</template>

<script lang="ts">
export default {
  name: 'HomePage',
  components: {
    BCU: () => import('../components/BCU.vue'),
    SearchExchange: () => import('../components/SearchExchange.vue'),
  },
  data() {
    return {
      loadingDistances: false,
      sortBy: undefined,
      sortDesc: undefined,
      onlyInterbank: ['UR', 'UP'],
      location: 'TODOS',
      locations: ['TODOS', 'MONTEVIDEO'],
      texts: {
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
      },
      money: ['USD', 'ARS', 'BRL', 'EUR', 'GBP'],
      amount: 100,
      show_install: false,
      wantTo: 'buy',
      notConditional: false,
      day: new Date().toJSON().slice(0, 10),
      code: '',
      notInterBank: true,
      items: [],
      all_items: [],
      enableDistance: false,
      latitude: 0,
      longitude: 0
    }
  },
  head() {
    return {
      script: [
        {
          src: 'https://platform.twitter.com/widgets.js',
          defer: true,
          hid: 'twitter',
          charset: 'utf-8',
        },
      ],
    }
  },
  computed: {
    onlyInterBank() {
      return this.onlyInterbank.includes(this.code)
    },
  },
  beforeMount() {
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
    this.amount = this.$route.query.amount
      ? parseFloat(this.$route.query.amount)
      : 100
    this.wantTo = this.$route.query.wantTo ? this.$route.query.wantTo : 'buy'
    this.code = this.$route.query.currency ? this.$route.query.currency : 'USD'
    this.location = this.$route.query.location
      ? this.$route.query.location
      : 'TODOS'
    this.get_data()
  },
  methods: {
    async geoLocationSuccess(info) {
      const latitude = info.coords.latitude
      const longitude = info.coords.longitude
      this.latitude = latitude
      this.longitude = longitude
      const distances = await this.$axios
        .get(
          `https://cambio.shellix.cc/distances?latitude=${latitude}&longitude=${longitude}`
        )
        .then((res) => res.data)
      this.all_items = this.all_items.map((item) => {
        item.distance = distances[item.origin]
          ? distances[item.origin]
          : 9999999
        return item
      })
      this.updateTable()
      this.enableDistance = true
      this.sortBy = 'distance'
      this.sortDesc = false
      this.loadingDistances = false
    },
    formatDistance(item: number) {
      if (!item || item === 9999999) return '-'
      if (item >= 1000) {
        return Math.round(item / 1000.0) + ' km'
      } else if (item >= 100) {
        return Math.round(item) + ' m'
      } else {
        return item.toFixed(1) + ' m'
      }
    },
    geoLocationError(err) {
      console.log(err)
      this.loadingDistances = false
      alert('No se ha podido determinar su ubicación actual')
    },
    geoLocation() {
      this.loadingDistances = true
      navigator.geolocation.getCurrentPosition(
        this.geoLocationSuccess,
        this.geoLocationError
      )
    },
    capitalize(str: string) {
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
    },
    getHeaders() {
      const toReturn = [
        {
          text: this.wantTo === 'buy' ? 'Pagas' : 'Recibes',
          value: 'amount',
          width: 'auto',
        },
        {
          text: 'Moneda',
          align: 'start',
          sortable: false,
          width: '180px',
          value: 'code',
        },
        { text: 'Casa de Cambio', value: 'localData.name' },
        { text: 'Compra (UY)', value: 'buy' },
        { text: 'Venta (UY)', value: 'sell' },
        { text: 'Dif (%)', value: 'diff' },
        { text: 'Sitio web', value: 'localData.website', sortable: false },
        { text: '', value: 'localData.location', sortable: false },
        { text: 'Condicional', value: 'condition', width: '250px' },
        { text: 'BCU', value: 'localData.bcu', width: '50px' },
      ]
      if (this.enableDistance) {
        toReturn.push({
          text: 'Distancia',
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
      return `Puedes ahorrar hasta un ${savePercent.toFixed(
        2
      )}% utilizando nuestra app.`
    },
    share() {
      let text = this.buy ? 'vender ' : 'comprar '
      if (this.texts[this.code]) {
        text +=
          this.texts[this.code].toLowerCase() + ' ' + '(' + this.code + ')'
      } else {
        text += this.code
      }
      let extra = ''
      if (this.location !== 'TODOS') {
        extra += 'de' + this.capitalize(this.location) + ' '
      }
      const finalText =
        'Estas son las mejores entidades uruguayas ' + extra + 'para ' + text
      console.log('Text', finalText)
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
      } else {
        alert('App already installed / rejected')
      }
    },
    get_text() {
      if (!this.items.length) return
      const m = this.formatMoney(this.items[0].amount)
      if (this.wantTo === 'buy') {
        return `Comprar ${this.amount} ${this.code} te costará un total de ${m}`
      } else {
        return `Te darán ${m} por tus ${this.amount} ${this.code}`
      }
    },
    getColor({ index, buy, sell }) {
      if (index === 0) return 'green darken-4'
      if (index === this.items.length - 1) return 'red darken-4'
      if (this.wantTo === 'sell') {
        if (buy === this.items[0].buy) return 'green darken-4'
        if (buy === this.items[this.items.length - 1].buy) return 'red darken-4'
      } else {
        if (sell === this.items[0].sell) return 'green darken-4'
        if (sell === this.items[this.items.length - 1].sell)
          return 'red darken-4'
      }
      return ''
    },
    formatMoney(number) {
      return number.toLocaleString('es-ES', {
        style: 'currency',
        currency: 'UYU',
      })
    },
    isInterBank(item) {
      return (
        item.origin === 'bcu' ||
        ['INTERBANCARIO', 'FONDO/CABLE'].includes(item.type)
      )
    },
    getCondition(el) {
      if (el.origin === 'prex') {
        return 'Require del uso de la tarjeta prex, debe ser solicitada en su sitio web.'
      }
      if (el.type === 'EBROU') {
        return 'Require de cuenta web en el banco BROU, debe abrirse una caja de ahorro en dicho banco'
      }
      return ''
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
      this.setPrice()
    },
    setPrice() {
      if (this.amount < 0) {
        this.amount = 0
      }
      this.$router.push({
        query: {
          ...this.$route.query,
          currency: this.code,
          amount: this.amount,
          wantTo: this.wantTo,
          location: this.location,
        },
      })
      this.items.sort((a, b) => {
        if (this.wantTo === 'buy') {
          return b.sell <= a.sell ? 1 : -1
        }
        return b.buy <= a.buy ? -1 : 1
      })
      this.items = this.items.map((el, index) => {
        el.index = index
        const sell = this.amount * el.sell
        const buy = this.amount * el.buy
        el.amount = this.wantTo === 'sell' ? buy : sell
        el.diff = (((sell - buy) / buy) * 100).toFixed(2)
        return el
      })
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
    async get_data() {
      const localData = await this.$axios
        .get('https://cambio.shellix.cc/localData')
        .then((res) => res.data)

      for (const key in localData) {
        const val = localData[key]
        const departments = val.departments
        if (departments && departments.length) {
          for (const dep of departments) {
            if (!this.locations.includes(dep)) {
              this.locations.push(dep)
            }
          }
        }
      }
      const data = await this.$axios
        .get('https://cambio.shellix.cc')
        .then((res) =>
          res.data
            .map((el: any) => {
              el.localData = localData[el.origin]
              if (!el.localData) {
                console.log('missing localData', el)
                el.localData = null
              }
              el.isInterBank = this.isInterBank(el)
              el.condition = this.getCondition(el)
              return el
            })
            .filter((el: any) => el.localData)
        )
      this.all_items = data
      this.updateTable()
      data.forEach(({ code }) => {
        if (!this.money.includes(code)) {
          this.money.push(code)
        }
      })
      this.setPrice()
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
  > .v-data-table__mobile-row:nth-child(9) {
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
</style>