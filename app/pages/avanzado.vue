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
      <a
class="white--text"
href="mailto:admin@cambio-uruguay.com"
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
import { computed, onMounted, ref } from 'vue'

// Initialize API service
const apiService = useApiService()
const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const { start, finish } = useLoadingIndicator()

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

const df = {
  amount: 100,
  wantTo: 'buy' as 'buy' | 'sell',
  notInterBank: true,
  location: 'TODOS',
  code: 'USD',
  codeWith: 'UYU',
  selectedDate: new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Montevideo',
  }),
}

// Reactive data
const snackColor = ref<string>('green darken-4')
const routeHasQuery = ref<boolean>(false)
const hiddenWidgets = ref<boolean>(false)
const hasScroll = ref<boolean>(false)
const allItems = ref<ExchangeItem[]>([])
const snackbar = ref<boolean>(false)
const snackBarText = ref<string>('')
const showApiAlert = ref<boolean>(true)
const onlyInterBank = ref<string[]>(['UR', 'UP'])
const location = ref<string>(df.location)
const selectedExchangeHouse = ref<ExchangeHouseOption[]>([])
const exchangeHouseOptions = ref<ExchangeHouseOption[]>([])
const locations = ref<string[]>(['TODOS', 'MONTEVIDEO'])
const money = ref<string[]>(['USD', 'ARS', 'BRL', 'EUR', 'GBP', 'UYU'])
const amount = ref<number>(df.amount)
const wantTo = ref<'buy' | 'sell'>(df.wantTo)
const notConditional = ref<boolean>(false)
const day = ref<string>('')
const selectedDate = ref<string>(df.selectedDate)
const datePickerMenu = ref<boolean>(false)
const isDateManuallySelected = ref<boolean>(false)
const code = ref<string>(df.code)
const codeWith = ref<string>(df.codeWith)
const notInterBank = ref<boolean>(df.notInterBank)
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
  const firstItem = i[0]
  const lastItem = i[i.length - 1]
  if (!firstItem || !lastItem) return ''

  const maxValue = firstItem[key]
  const minValue = lastItem[key]
  if (typeof maxValue !== 'number' || typeof minValue !== 'number') return ''

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
  fetchDataForDate()
}

const resetDate = () => {
  selectedDate.value = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Montevideo',
  })
  isDateManuallySelected.value = false
  fetchDataForDate()
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
  if (t?.hideWidget) {
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

const fetchDataForDate = async () => {
  start()
  const date = selectedDate.value
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

const getValueQuery = (value: string | number, key: any) => {
  return value === (df as any)[key] ? undefined : value
}

const setPrice = () => {
  if (amount.value < 0) {
    amount.value = 0
  }

  const query = {
    currency: getValueQuery(code.value, 'code'),
    amount: getValueQuery(amount.value, 'amount'),
    wantTo: getValueQuery(wantTo.value, 'wantTo'),
    location: getValueQuery(location.value, 'location'),
    currency_with: getValueQuery(codeWith.value, 'codeWith'),
    date: getValueQuery(selectedDate.value, 'selectedDate'),
    notInterBank: notInterBank.value ? undefined : 0,
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
    } catch {
      // Ignore parsing errors for invalid query parameters
    }
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
      const prevItem = arr[index - 1]
      if (prevItem) {
        if (wantToSell) {
          if (el.buy !== prevItem.buy) {
            pos++
          }
        } else if (el.sell !== prevItem.sell) {
          pos++
        }
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

/**
 * Extract date from query parameters for server-side use
 * This function works on both server and client side
 */
const getDateFromQuery = () => {
  const query = route.query

  if (query.date && typeof query.date === 'string') {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (dateRegex.test(query.date)) {
      const parsedDate = new Date(query.date)
      if (!Number.isNaN(parsedDate.getTime())) {
        return query.date
      }
    }
  }

  // Return current date if no valid date in query
  return ''
}

// Server-side data fetching for better SEO and initial page load
const { data: initialData } = await useAsyncData(
  'exchange-data',
  async () => {
    // Get date from query parameters for server-side compatibility
    const currentDate = getDateFromQuery()
    console.log('Server-side fetching data for date:', currentDate)

    try {
      const result = await apiService.getProcessedExchangeData(currentDate)

      // Also return the query parameters for client-side state initialization
      return {
        ...result,
        queryParams: route.query,
        fetchedDate: currentDate,
      }
    } catch (error) {
      console.error('Server-side data fetching error:', error)
      return {
        localData: [],
        locations: [],
        exchangeData: [],
        error: error,
        queryParams: route.query,
        fetchedDate: currentDate,
      }
    }
  },
  {
    server: true,
    default: () => {
      return {
        localData: [],
        locations: [],
        exchangeData: [],
        error: null,
        queryParams: {},
        fetchedDate: new Date().toLocaleDateString('en-CA', {
          timeZone: 'America/Montevideo',
        }),
      }
    },
  },
)

console.log('Initial data from server:', initialData.value.queryParams)

// Initialize data from server-side fetch
if (initialData.value && initialData.value.exchangeData) {
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

  // Set the data
  allItems.value = initialData.value.exchangeData
  locations.value = initialData.value.locations || ['TODOS', 'MONTEVIDEO']

  // Set the date if it was fetched from query params
  if (initialData.value.fetchedDate) {
    selectedDate.value = initialData.value.fetchedDate
    day.value = initialData.value.fetchedDate

    // Mark as manually selected if different from today
    const today = new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/Montevideo',
    })
    if (initialData.value.fetchedDate !== today) {
      isDateManuallySelected.value = true
    }
  }

  buildExchangeHouseOptions()
  getData()
}

/**
 * Validate and sanitize query parameter values
 * @param value - The query parameter value to validate
 * @param type - The expected type of the parameter
 * @param allowedValues - Array of allowed values for enum-like parameters
 * @returns The sanitized value or null if invalid
 */
const validateQueryParam = (
  value: any,
  type: 'string' | 'number' | 'boolean' | 'date',
  allowedValues?: string[],
): any => {
  if (value === undefined || value === null) return null

  try {
    switch (type) {
      case 'string':
        if (typeof value === 'string') {
          const sanitized = value.trim().toUpperCase()
          if (allowedValues && !allowedValues.includes(sanitized)) {
            return null
          }
          return sanitized
        }
        break

      case 'number':
        const numValue =
          typeof value === 'string' ? Number.parseFloat(value) : value
        if (!Number.isNaN(numValue) && numValue >= 0) {
          return numValue
        }
        break

      case 'boolean':
        if (value === '1' || value === 'true' || value === true) return true
        if (value === '0' || value === 'false' || value === false) return false
        break

      case 'date':
        if (typeof value === 'string') {
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/
          if (dateRegex.test(value)) {
            const parsedDate = new Date(value)
            if (!Number.isNaN(parsedDate.getTime())) {
              return value
            }
          }
        }
        break
    }
  } catch (error) {
    console.error('Error validating query parameter:', error)
  }

  return null
}

/**
 * Apply query parameters from server-side data
 * This function applies query parameters that were passed from server-side
 */
const applyServerSideQueryParams = (queryParams: any) => {
  if (!queryParams || typeof queryParams !== 'object') return

  try {
    // Apply non-date parameters (date is already handled in server fetch)

    // Currency settings
    const currencyCode = validateQueryParam(
      queryParams.currency,
      'string',
      money.value,
    )
    if (currencyCode) {
      code.value = currencyCode
    }

    const currencyWithCode = validateQueryParam(
      queryParams.currency_with,
      'string',
      money.value,
    )
    if (currencyWithCode) {
      codeWith.value = currencyWithCode
    }

    // Amount setting
    const amountValue = validateQueryParam(queryParams.amount, 'number')
    if (amountValue !== null) {
      amount.value = amountValue
    }

    // Want to buy/sell setting
    const wantToValue = validateQueryParam(queryParams.wantTo, 'string', [
      'BUY',
      'SELL',
    ])
    if (wantToValue) {
      wantTo.value = wantToValue.toLowerCase() as 'buy' | 'sell'
    }

    // Location setting
    const locationValue = validateQueryParam(
      queryParams.location,
      'string',
      locations.value,
    )
    if (locationValue) {
      location.value = locationValue
    }

    // Filter settings
    const notInterBankValue = validateQueryParam(
      queryParams.notInterBank,
      'boolean',
    )
    if (notInterBankValue !== null) {
      notInterBank.value = notInterBankValue
    }

    const notConditionalValue = validateQueryParam(
      queryParams.notConditional,
      'boolean',
    )
    if (notConditionalValue !== null) {
      notConditional.value = notConditionalValue
    }

    // Geolocation coordinates (if provided)
    const latValue = validateQueryParam(queryParams.lat, 'number')
    const lngValue = validateQueryParam(queryParams.lng, 'number')
    if (latValue !== null && lngValue !== null) {
      latitude.value = latValue
      longitude.value = lngValue
      enableDistance.value = true
    }

    // Mark that route has query parameters
    if (Object.keys(queryParams).length > 0) {
      routeHasQuery.value = true
    }

    console.log('Applied server-side query parameters:', {
      currency: code.value,
      currency_with: codeWith.value,
      amount: amount.value,
      wantTo: wantTo.value,
      location: location.value,
      notInterBank: notInterBank.value,
      notConditional: notConditional.value,
      hasCoordinates: enableDistance.value,
    })
  } catch (error) {
    console.error('Error applying server-side query parameters:', error)
  }
}

/**
 * Load and apply data from route query parameters (client-side)
 * This function reads URL query parameters and sets component state accordingly
 */
const loadDataFromQueryParams = () => {
  const query = route.query

  try {
    // Currency settings
    const currencyCode = validateQueryParam(
      query.currency,
      'string',
      money.value,
    )
    if (currencyCode) {
      code.value = currencyCode
    }

    const currencyWithCode = validateQueryParam(
      query.currency_with,
      'string',
      money.value,
    )
    if (currencyWithCode) {
      codeWith.value = currencyWithCode
    }

    // Amount setting
    const amountValue = validateQueryParam(query.amount, 'number')
    if (amountValue !== null) {
      amount.value = amountValue
    }

    // Want to buy/sell setting
    const wantToValue = validateQueryParam(query.wantTo, 'string', [
      'BUY',
      'SELL',
    ])
    if (wantToValue) {
      wantTo.value = wantToValue.toLowerCase() as 'buy' | 'sell'
    }

    // Location setting
    const locationValue = validateQueryParam(
      query.location,
      'string',
      locations.value,
    )
    if (locationValue) {
      location.value = locationValue
    }

    // Date setting (for client-side navigation)
    const dateValue = validateQueryParam(query.date, 'date')
    if (dateValue && dateValue !== selectedDate.value) {
      selectedDate.value = dateValue
      isDateManuallySelected.value = true
    }

    // Filter settings
    const notInterBankValue = validateQueryParam(query.notInterBank, 'boolean')
    if (notInterBankValue !== null) {
      notInterBank.value = notInterBankValue
    }

    const notConditionalValue = validateQueryParam(
      query.notConditional,
      'boolean',
    )
    if (notConditionalValue !== null) {
      notConditional.value = notConditionalValue
    }

    // Exchange houses filter
    if (query.exchangeHouses && typeof query.exchangeHouses === 'string') {
      const exchangeHousesArray = query.exchangeHouses
        .split(',')
        .filter(Boolean)
      if (exchangeHousesArray.length > 0) {
        // Set selected exchange houses (will be validated after data loads)
        nextTick(() => {
          const validExchangeHouses = exchangeHousesArray
            .map((origin) => {
              const option = exchangeHouseOptions.value.find(
                (opt) => opt.value === origin,
              )
              return option ? option : null
            })
            .filter(Boolean) as ExchangeHouseOption[]

          if (validExchangeHouses.length > 0) {
            selectedExchangeHouse.value = validExchangeHouses
          }
        })
      }
    }

    // Geolocation coordinates (if provided)
    const latValue = validateQueryParam(query.lat, 'number')
    const lngValue = validateQueryParam(query.lng, 'number')
    if (latValue !== null && lngValue !== null) {
      latitude.value = latValue
      longitude.value = lngValue
      enableDistance.value = true
    }

    // Mark that route has query parameters
    if (Object.keys(query).length > 0) {
      routeHasQuery.value = true
    }

    console.log('Loaded data from query parameters:', {
      currency: code.value,
      currency_with: codeWith.value,
      amount: amount.value,
      wantTo: wantTo.value,
      location: location.value,
      date: selectedDate.value,
      notInterBank: notInterBank.value,
      notConditional: notConditional.value,
      hiddenWidgets: hiddenWidgets.value,
      hasCoordinates: enableDistance.value,
    })

    // Update table if data is already loaded
    if (allItems.value.length > 0) {
      updateTable()
    }
  } catch (error) {
    console.error('Error loading data from query parameters:', error)
    openSnack('Error al cargar parámetros de la URL', 5000, 'orange darken-2')
  }
}

// Lifecycle hooks
onMounted(() => {
  console.log('mounted index.vue')

  // Initialize date values on client side to prevent hydration mismatch
  const currentDate = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Montevideo',
  })
  // Only set default date if not already set from server-side data
  if (!selectedDate.value) {
    day.value = currentDate
    selectedDate.value = currentDate
  }

  // Apply server-side query parameters first
  console.log('Initial data from server:', initialData.value)
  if (initialData.value?.queryParams) {
    applyServerSideQueryParams(initialData.value.queryParams)
  }

  // Then load any additional client-side query parameters
  loadDataFromQueryParams()

  if (localStorage.getItem('hideWidgets') === 'true') {
    hiddenWidgets.value = true
  }
})

// Structured Data for SEO
const structuredData = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: t('seo.homeTitle'),
  description: t('seo.homeDescription'),
  url: 'https://cambio-uruguay.com',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'All',
  offers: {
    '@type': 'Offer',
    description: t('seo.homeDescription'),
    price: '0',
    priceCurrency: 'USD',
  },
  author: {
    '@type': 'Person',
    name: 'Eduardo Airaudo',
    url: 'https://www.linkedin.com/in/eairaudo/',
    sameAs: [
      'https://www.linkedin.com/in/eairaudo/',
      'https://github.com/eduair94',
    ],
  },
  publisher: {
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

// SEO Configuration with multilingual support
useSeoMeta({
  title: () => t('seo.homeTitle'),
  description: () => t('seo.homeDescription'),
  keywords: () => t('seo.homeKeywords'),
  ogTitle: () => t('seo.homeTitle'),
  ogDescription: () => t('seo.homeDescription'),
  ogType: 'website',
  ogUrl: () => {
    const baseUrl = 'https://cambio-uruguay.com'
    const queryString = new URLSearchParams(
      route.query as Record<string, string>,
    ).toString()
    return queryString ? `${baseUrl}?${queryString}` : baseUrl
  },
  twitterCard: 'summary_large_image',
  twitterTitle: () => t('seo.homeTitle'),
  twitterDescription: () => t('seo.homeDescription'),
})
</script>
