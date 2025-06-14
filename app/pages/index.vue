<template>
  <div class="mt-md-4">
    <!-- SEO Optimized Header Structure -->
    <div class="px-3">
      <header>
        <h1 class="text-h5 text-md-h4 font-weight-bold mb-3">
          {{ t('welcome') }}
        </h1>
        <h2 class="text-h6 mb-4 text-grey-lighten-1">
          {{ t('subtitle') }}
        </h2>
      </header>

      <!-- Enhanced SEO Content -->
      <section class="mb-4">
        <h3 class="sr-only">{{ t('seoTitle') }}</h3>
        <div class="hidden-content" style="position: absolute; left: -9999px">
          <p>{{ t('seoDescription') }}</p>
          <span>{{ t('seoKeywords') }}</span>
        </div>
      </section>
    </div>

    <div class="my-4">
      <ExchangeDataTable
        :items="items"
        :headers="getHeaders()"
        :location="location"
        :latitude="latitude"
        :longitude="longitude"
        :code-with="codeWith"
        :amount="amount"
        :last-pos="lastPos"
        :no-distance="noDistance"
      >
        <template #table-top>
          <div>
            <div class="px-3 pt-0 pt-3">
              <DonationSection :day="day" />
              <div>
                <ExchangeFilters
                  :selected-exchange-house="selectedExchangeHouse"
                  :exchange-house-options="exchangeHouseOptions"
                  :date-picker-menu="datePickerMenu"
                  :selected-date="selectedDate"
                  :want-to="wantTo"
                  :amount="amount"
                  :code="code"
                  :code-with="codeWith"
                  :location="location"
                  :latitude="latitude"
                  :longitude="longitude"
                  :not-inter-bank="notInterBank"
                  :not-conditional="notConditional"
                  :hidden-widgets="hiddenWidgets"
                  :only-inter-bank="onlyInterBank"
                  :items="items"
                  :savings="savings()"
                  :money-options="moneyOptions"
                  :formatted-locations="formattedLocations"
                  @update:selected-exchange-house="updateSelectedExchangeHouse"
                  @clear-exchange-house-filter="clearExchangeHouseFilter"
                  @update:date-picker-menu="datePickerMenu = $event"
                  @date-change="onDateChange"
                  @reset-date="resetDate"
                  @update:want-to="
                    (value: any) => {
                      wantTo = value
                      setPrice()
                    }
                  "
                  @update:amount="
                    (value) => {
                      amount = parseFloat(value)
                      setPrice()
                    }
                  "
                  @update:code="
                    (value) => {
                      code = value
                      updateTable()
                    }
                  "
                  @update:code-with="
                    (value) => {
                      codeWith = value
                      updateTable()
                    }
                  "
                  @update:location="
                    (value) => {
                      location = value
                      updateTable()
                    }
                  "
                  @geo-location-success="geoLocationSuccess"
                  @undo-distances="undoDistances"
                  @reset-all-filters="resetAllFilters"
                  @update:not-inter-bank="
                    (value) => {
                      notInterBank = value
                      updateTable()
                    }
                  "
                  @update:not-conditional="
                    (value) => {
                      notConditional = value
                      updateTable()
                    }
                  "
                  @update:hidden-widgets="
                    (value) => {
                      hiddenWidgets = value
                      hideWidgets(value)
                    }
                  "
                />
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
              />
            </div>
          </div>
        </template>
      </ExchangeDataTable>
    </div>

    <div class="d-flex flex-wrap grid-list-md ga-3">
      <v-btn
        link
        color="red darken-4"
        target="_blank"
        href="https://finanzas.com.uy/los-mejores-prestamos-de-bancos/"
      >
        {{ t('infoPrestamos') }}
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
        {{ t('appStatus') }}
      </v-btn>
    </div>
    <div class="mt-3">
      {{ t('consulta') }}
      <a class="white--text" href="mailto:admin@cambio-uruguay.com"
        >admin@cambio-uruguay.com</a
      >
    </div>

    <!-- API Usage Alert -->
    <VAlert
      v-model="showApiAlert"
      class="mt-3 mb-0 mb-md-3 bg-green-darken-4"
      type="success"
      density="compact"
      closable
    >
      {{ t('apiUsageMessage') }}
      <a
        class="text-white font-weight-bold"
        href="mailto:admin@cambio-uruguay.com"
      >
        admin@cambio-uruguay.com
      </a>
    </VAlert>

    <VSnackbar v-model="snackbar" :color="snackColor">
      <p class="text-white mb-0">{{ snackBarText }}</p>
      <template #actions>
        <VBtn variant="text" @click="snackbar = false"> {{ t('close') }} </VBtn>
      </template>
    </VSnackbar>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref } from 'vue'
import { useCambioStore } from '~/stores/cambio'

// Initialize API service
const apiService = useApiService()

// Define interfaces for type safety
interface ExchangeItem {
  origin: string
  code: string
  buy: number
  sell: number
  amount: number
  pos: number
  type?: string
  isInterBank: boolean
  condition: string
  diff: string
  localData: {
    name?: string
    website?: string
    departments: string[]
    location?: string
  } | null
  distance?: number
}

interface ExchangeHouseOption {
  text: string
  value: string
  website?: string
}

interface MoneyOption {
  text: string
  value: string
}

interface LocationOption {
  text: string
  value: string
}

interface Texts {
  [locale: string]: {
    [code: string]: string
  }
}

// Component imports
const ExchangeDataTable = defineAsyncComponent(
  () => import('~/components/ExchangeDataTable.vue'),
)
const ExchangeFilters = defineAsyncComponent(
  () => import('~/components/ExchangeFilters.vue'),
)
const DonationSection = defineAsyncComponent(
  () => import('~/components/DonationSection.vue'),
)

// Composables
const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useCambioStore()
const { start, finish } = useLoadingIndicator()

// Reactive data
const snackColor = ref<string>('green darken-4')
const routeHasQuery = ref<boolean>(false)
const hiddenWidgets = ref<boolean>(false)
const hasScroll = ref<boolean>(false)
const allItems = ref<ExchangeItem[]>([])
const snackbar = ref<boolean>(false)
const snackBarText = ref<string>('')
const showApiAlert = ref<boolean>(true)
const loadingDistances = ref<boolean>(false)
const onlyInterBank = ref<string[]>(['UR', 'UP'])
const location = ref<string>('TODOS')
const selectedExchangeHouse = ref<ExchangeHouseOption[]>([])
const exchangeHouseOptions = ref<ExchangeHouseOption[]>([])
const filteredItems = ref<ExchangeItem[]>([])
const locations = ref<string[]>(['TODOS', 'MONTEVIDEO'])
const money = ref<string[]>(['USD', 'ARS', 'BRL', 'EUR', 'GBP', 'UYU'])
const amount = ref<number>(100)
const wantTo = ref<'buy' | 'sell'>('buy')
const notConditional = ref<boolean>(false)
const day = ref<string>(new Date().toLocaleDateString('en-CA'))
const selectedDate = ref<string>(new Date().toLocaleDateString('en-CA'))
const datePickerMenu = ref<boolean>(false)
const isDateManuallySelected = ref<boolean>(false)
const code = ref<string>('USD')
const codeWith = ref<string>('UYU')
const notInterBank = ref<boolean>(true)
const items = ref<ExchangeItem[]>([])
const enableDistance = ref<boolean>(false)
const latitude = ref<number>(0)
const longitude = ref<number>(0)
const noDistance = ref<number>(9999999)
const lastPos = ref<number>(0)
const scrollWidth = ref<number>(0)

// Refs for template elements
const wrapper2 = ref<HTMLElement | null>(null)

// Computed properties
const moneyOptions = computed<MoneyOption[]>(() => {
  return money.value.map((code: string) => ({
    text: t('codes.' + code),
    value: code,
  }))
})

const formattedLocations = computed<LocationOption[]>(() => {
  return locations.value.map((location: string) => ({
    text: location === 'TODOS' ? 'Todos' : location,
    value: location,
  }))
})

const savings = (): string => {
  if (!items.value.length) return ''
  const i = items.value
  const key = wantTo.value === 'buy' ? 'sell' : 'buy'
  const maxValue = i[0][key]
  const minValue = i[i.length - 1][key]
  let savePercent = 0
  if (key === 'buy') {
    savePercent = ((maxValue - minValue) / minValue) * 100
  } else {
    savePercent = ((minValue - maxValue) / maxValue) * 100
  }
  const saveAmount =
    Math.abs((maxValue - minValue) * amount.value).toFixed(2) +
    ' ' +
    codeWith.value
  const s = savePercent.toFixed(2)
  const loc = {
    es: `Puedes ahorrar hasta un ${s}% (${saveAmount}) utilizando nuestra app.`,
    en: `You can save up to ${s}% (${saveAmount}) by using our app`,
    pt: `Você pode economizar até ${s}% (${saveAmount}) ao utilizar nosso aplicativo`,
  }
  return loc[locale.value]
}

const getHeaders = () => {
  const toReturn = [
    {
      title: 'Rank',
      key: 'pos',
      width: 'auto',
    },
    {
      title: wantTo.value === 'buy' ? t('pagas') : t('recibes'),
      key: 'amount',
      width: 'auto',
    },
    {
      title: t('moneda'),
      align: 'start',
      width: '180px',
      key: 'code',
    },
    { title: t('casaDeCambio'), key: 'localData.name' },
    { title: t('compra') + ` (${codeWith.value})`, key: 'buy' },
    { title: t('venta') + ` (${codeWith.value})`, key: 'sell' },
    { title: 'Dif (%)', key: 'diff' },
    {
      title: t('sitioWeb'),
      key: 'localData.website',
      sortable: false,
      width: 'auto',
    },
    {
      title: t('buscarSucursal'),
      key: 'localData.location',
      sortable: false,
    },
    { title: t('condicional'), key: 'condition', width: '250px' },
    { title: 'BCU', key: 'localData.bcu', width: '50px' },
    {
      title: t('historical.viewHistorical'),
      key: 'historical',
      sortable: false,
      width: '140px',
    },
  ]
  if (enableDistance.value) {
    toReturn.push({
      title: t('distancia'),
      key: 'distance',
      width: 'auto',
    })
  }
  return toReturn
}

const clearExchangeHouseFilter = () => {
  selectedExchangeHouse.value = []
  updateTable()
}

const updateSelectedExchangeHouse = (value: any[]) => {
  console.log('Updating selected exchange house:', value)
  selectedExchangeHouse.value = value
  updateTable()
}

const onDateChange = (newDate: string) => {
  console.log('onDateChange', newDate)
  selectedDate.value = newDate
  isDateManuallySelected.value = true
  datePickerMenu.value = false
  fetchDataForDate(newDate)
}

const resetDate = () => {
  selectedDate.value = new Date().toLocaleDateString('en-CA')
  isDateManuallySelected.value = false
  setup()
}

const geoLocationSuccess = (opt: {
  distances: any
  lat: number
  lng: number
  distanceData: any
  radius: number
}) => {
  console.log('opt', opt)
  const { distances, lat, lng, distanceData, radius } = opt
  latitude.value = lat
  longitude.value = lng
  let items = allItems.value.map((item: any) => {
    item.distance = distances[item.origin]
      ? distances[item.origin]
      : noDistance.value
    if (item.distance !== noDistance.value) {
      item.distanceData = distanceData[item.distance]
    }
    return item
  })
  if (radius) {
    items = items.filter((item: any) => item.distance <= radius)
  }
  allItems.value = items
  updateTable()
  enableDistance.value = true
  openSnack('Distancias cargadas correctamente')
}

const undoDistances = () => {
  enableDistance.value = false
  latitude.value = 0
  longitude.value = 0
  updateTable()
}

const resetAllFilters = () => {
  selectedExchangeHouse.value = []
  location.value = 'TODOS'
  notInterBank.value = true
  notConditional.value = false
  amount.value = 100
  code.value = 'USD'
  codeWith.value = 'UYU'
  wantTo.value = 'buy'

  updateTable()

  openSnack(t('filtersReset') || 'Filtros restablecidos')
}

const openSnack = (text: string, timeout = 2000, color = 'green darken-4') => {
  snackbar.value = true
  snackBarText.value = text
  snackColor.value = color
  setTimeout(() => {
    snackbar.value = false
  }, timeout)
}

const hideFeedback = () => {
  document.head.insertAdjacentHTML(
    'beforeend',
    `<style type="text/css" class="custom_style_list">
                    ._hj_feedback_container {
                      display:none!important;
                    }
            </style>`,
  )
}

const hideWidgets = (val: boolean, att = 0) => {
  const t = (window as any).Tawk_API
  if (t && t.hideWidget) {
    if (val) {
      localStorage.setItem('hideWidgets', '1')
      t.hideWidget()
      hideFeedback()
    } else {
      localStorage.removeItem('hideWidgets')
      t.showWidget()
      const el = document.querySelector('.custom_style_list')
      if (el) el.remove()
    }
  } else {
    nextTick(() => {
      att++
      if (att === 10) {
        console.log('hide widget', att)
        return
      }
      hideWidgets(val, att)
    })
  }
}

const buildExchangeHouseOptions = () => {
  const uniqueOrigins = [
    ...new Set(allItems.value.map((item: ExchangeItem) => item.origin)),
  ]
  exchangeHouseOptions.value = uniqueOrigins
    .map((origin: string) => {
      const item = allItems.value.find((i: ExchangeItem) => i.origin === origin)
      return {
        text: item?.localData?.name || origin,
        value: origin,
        website: item?.localData?.website,
      }
    })
    .sort((a, b) => a.text.localeCompare(b.text))
}

const fetchDataForDate = async (date: string) => {
  start()
  try {
    const data = await apiService.getProcessedExchangeData(date)
    if (data.error) {
      console.log('Data', data)

      // Handle the new detailed error structure
      let errorMessage = 'Error fetching data'
      const error = data.error as any

      if (typeof error === 'string') {
        errorMessage = error
      } else if (error && typeof error === 'object') {
        // Handle combined error structure
        if ('combined' in error && error.combined) {
          errorMessage = error.combined
        } else if ('message' in error && error.message) {
          errorMessage = error.message
        } else if ('exchange' in error && error.exchange?.message) {
          errorMessage = error.exchange.message
        }
      }

      // Log detailed error information for debugging
      console.error('Detailed API Error:', data.error)
      allItems.value = []
      getData()
      openSnack(errorMessage, 10000, 'red')
    } else {
      allItems.value = data.exchangeData
      buildExchangeHouseOptions()
      getData()
    }
  } catch (error) {
    console.error('API Error for date', date, ':', error)
    // Extract error details using the utility function
    const errorDetails = apiService.extractErrorDetails(error)
    console.error('Extracted error details:', errorDetails)
    openSnack(errorDetails.message, 10000, 'red')
  } finally {
    finish()
  }
}

const updateTable = () => {
  if (code.value === 'UYU') {
    items.value = allItems.value.filter(
      (el) =>
        (!code.value || el.code === codeWith.value) &&
        (!notInterBank.value ||
          !el.isInterBank ||
          onlyInterBank.value.includes(code.value)) &&
        (!notConditional.value || !el.condition) &&
        (location.value === 'TODOS' ||
          !el?.localData?.departments.length ||
          el.localData.departments.includes(location.value)),
    )
  } else {
    items.value = allItems.value.filter(
      (el) =>
        (!code.value || el.code === code.value) &&
        (!notInterBank.value ||
          !el.isInterBank ||
          onlyInterBank.value.includes(code.value)) &&
        (!notConditional.value || !el.condition) &&
        (location.value === 'TODOS' ||
          !el?.localData?.departments.length ||
          el.localData.departments.includes(location.value)),
    )
  }

  // Apply exchange house filter if one is selected
  if (selectedExchangeHouse.value && selectedExchangeHouse.value.length > 0) {
    const selectedOrigins = selectedExchangeHouse.value.map((item) =>
      typeof item === 'object' ? item.value : item,
    )
    items.value = items.value.filter((el) =>
      selectedOrigins.includes(el.origin),
    )
  }

  if (codeWith.value && codeWith.value !== 'UYU') {
    const codeOrigins: any = {}
    items.value = items.value
      .filter((el) => {
        if (code.value === 'UYU') return true
        const f = allItems.value.find(
          (e) =>
            e.origin === el.origin &&
            e.code === codeWith.value &&
            e.type === el.type,
        )
        codeOrigins[el.origin + (el.type ? el.type : '')] = f
        return f !== undefined
      })
      .map((e) => {
        const el = { ...e }
        if (code.value === 'UYU') {
          el.sell = 1 / e.buy
          el.buy = 1 / e.sell
        } else {
          const f = codeOrigins[el.origin + (el.type ? el.type : '')]
          el.sell = e.sell / f.buy
          el.buy = e.buy / f.sell
        }
        return el
      })
  }
  setPrice()
}

const setPrice = () => {
  if (amount.value < 0) {
    amount.value = 0
  }

  const query = {
    currency: code.value,
    amount: amount.value,
    wantTo: wantTo.value,
    location: location.value,
    currency_with: codeWith.value,
    date: selectedDate.value,
    notInterBank: notInterBank.value ? 1 : undefined,
    notConditional: notConditional.value ? 1 : undefined,
    exchangeHouses:
      selectedExchangeHouse.value && selectedExchangeHouse.value.length > 0
        ? selectedExchangeHouse.value.join(',')
        : undefined,
  }

  // Change route
  if (routeHasQuery.value) {
    const toPush = {
      ...route.query,
      query,
    }
    console.log('Updating route with query:', toPush)
    try {
      router.push(toPush)
    } catch (error) {}
  } else {
    routeHasQuery.value = true
  }

  const amountValue = amount.value
  const wantToSell = wantTo.value === 'sell'

  items.value.sort((a, b) => {
    if (wantToSell) {
      if (b.buy === a.buy) return 0
      return b.buy <= a.buy ? -1 : 1
    }
    if (b.sell === a.sell) return 0
    return b.sell <= a.sell ? 1 : -1
  })

  let pos = 1
  items.value = items.value.map((el, index, arr) => {
    if (index !== 0) {
      if (wantToSell) {
        if (el.buy !== arr[index - 1].buy) {
          pos++
        }
      } else if (el.sell !== arr[index - 1].sell) {
        pos++
      }
    }
    el.pos = pos
    const sell = amountValue * el.buy
    const buy = amountValue * el.sell
    el.amount = wantToSell ? sell : buy
    el.diff = (((buy - sell) / sell) * 100).toFixed(2)
    return el
  })
  lastPos.value = pos
}

const getData = () => {
  allItems.value.forEach(({ code }) => {
    if (!money.value.includes(code)) {
      money.value.push(code)
    }
  })
  updateTable()
}

const setup = async () => {
  fetchDataForDate(selectedDate.value)
}

// Server-side data fetching for better SEO and initial page load
const { data: initialData } = await useAsyncData(
  'exchange-data',
  async () => {
    const currentDate = new Date().toLocaleDateString('en-CA')
    try {
      return await apiService.getProcessedExchangeData(currentDate)
    } catch (error) {
      console.error('Server-side data fetching error:', error)
      return null
    }
  },
  {
    server: true, // Only fetch on server
    default: () => [],
  },
)

// Initialize data from server-side fetch
if (
  initialData.value &&
  !Array.isArray(initialData.value) &&
  initialData.value.exchangeData
) {
  if (initialData.value.error) {
    let errorMessage = 'Error loading initial data'
    const error = initialData.value.error as any

    if (typeof error === 'string') {
      errorMessage = error
    } else if (error && typeof error === 'object') {
      if ('combined' in error && error.combined) {
        errorMessage = error.combined
      } else if ('message' in error && error.message) {
        errorMessage = error.message
      }
    }

    openSnack(errorMessage, 10000)
  }

  allItems.value = initialData.value.exchangeData
  locations.value = initialData.value.locations || ['TODOS', 'MONTEVIDEO']
  buildExchangeHouseOptions()
  getData()
}

// Lifecycle hooks
onMounted(() => {
  console.log('mounted index.vue')
  // Fetch locations from API
  // Only run setup if no data was loaded server-side
  if (!allItems.value.length) {
    setup()
  }
})

// SEO Head
useSeoMeta({
  title: () => t('seoTitle'),
  description: () => t('seoDescription'),
  keywords: () => t('seoKeywords'),
})

const structuredData = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Cambio Uruguay',
  description: t('seoDescription'),
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
}))

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify(structuredData.value),
    },
  ],
})
</script>
