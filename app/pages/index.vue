<template>
  <div class="home-container">
    <!-- Hero Section -->
    <section class="hero-section pt-0 pt-md-5">
      <VContainer>
        <VRow justify="center" align="center" class="min-height-hero">
          <VCol cols="12" md="12" lg="12" class="text-center">
            <div class="hero-content">
              <h1 class="hero-title text-h4 text-md-h3 text-md-h2 font-weight-bold mb-4">
                {{ t('simpleTitle') }}
              </h1>
              <p class="hero-subtitle text-h6 text-grey-lighten-1 mb-6">
                {{ t('simpleSubtitle') }}
              </p>
              <p class="hero-description text-body-1 text-grey-lighten-2 mb-8">
                {{ t('simpleDescription') }}
              </p>

              <!-- Currency Converter Card -->
              <VCard class="exchange-card pa-6 mb-6" elevation="8">
                <h2 class="text-h5 font-weight-bold mb-6 text-center">
                  {{ t('quickExchange') }}
                </h2>

                <!-- Amount Input -->
                <VRow class="mb-0 mb-md-4">
                  <VCol cols="12">
                    <VTextField
                      v-model="amountInput"
                      hide-details
                      :label="t('enterAmount')"
                      variant="outlined"
                      density="comfortable"
                      type="number"
                      min="1"
                      class="amount-input"
                      prepend-inner-icon="mdi-cash"
                    />
                  </VCol>
                </VRow>

                <!-- Currency Selection Row -->
                <VRow class="currency-row" align="center">
                  <VCol cols="12" md="5">
                    <div class="currency-section">
                      <VAutocomplete
                        v-model="selectedCurrencyInput"
                        hide-details
                        :items="currencyOptions"
                        :label="t('from')"
                        variant="outlined"
                        density="comfortable"
                        item-title="title"
                        item-value="value"
                        class="currency-select"
                        clearable
                      />
                    </div>
                  </VCol>

                  <VCol cols="12" md="2" class="text-center pa-0 pa-md-3">
                    <div class="swap-btn_container">
                      <VBtn
                        icon
                        variant="outlined"
                        :size="mobile ? 'small' : 'large'"
                        color="primary"
                        class="swap-btn"
                        @click="swapCurrencies"
                      >
                        <VIcon>mdi-swap-horizontal</VIcon>
                      </VBtn>
                    </div>
                  </VCol>

                  <VCol cols="12" md="5">
                    <div class="currency-section">
                      <VAutocomplete
                        v-model="selectedTargetCurrencyInput"
                        hide-details
                        :items="currencyOptions"
                        :label="t('to')"
                        variant="outlined"
                        density="comfortable"
                        item-title="title"
                        item-value="value"
                        class="currency-select"
                        clearable
                      />
                    </div>
                  </VCol>
                </VRow>

                <VCardActions class="d-flex justify-end pa-0 pt-md-3 pb-3">
                  <VBtn
                    color="primary"
                    variant="elevated"
                    size="large"
                    :loading="loading"
                    class="w-100 w-md-auto my-5 my-md-0 px-5 convert-btn"
                    @click.prevent="updateExchange"
                  >
                    <VIcon start>mdi-calculator</VIcon>
                    {{ t('findBestRate') }}
                  </VBtn>
                </VCardActions>

                <!-- Conversion Result -->
                <VCard
                  class="conversion-result pa-4 mb-md-4"
                  color="rgba(76, 175, 80, 0.1)"
                  variant="outlined"
                >
                  <VRow align="center" justify="center" class="conversion-display-row">
                    <VCol cols="5" sm="4" class="text-center align-self-start">
                      <div class="conversion-display">
                        <span class="amount-text">
                          {{ formatCurrency(isForward ? amount : leftForReverse) }}
                        </span>
                        <span v-if="selectedCurrency" class="currency-name">
                          {{ t('codes.' + selectedCurrency) }}
                        </span>
                      </div>
                    </VCol>

                    <VCol cols="2" sm="4" class="text-center">
                      <DirectionToggle
                        :is-forward="isForward"
                        size="32"
                        color="success"
                        @toggle="toggleDirection"
                      />
                    </VCol>

                    <VCol cols="5" sm="4" class="text-center align-self-start">
                      <div class="conversion-display">
                        <span class="amount-text converted">
                          {{ formatCurrency(desiredRightAmount) }}
                        </span>
                        <span v-if="selectedTargetCurrency" class="currency-name">
                          {{ t('codes.' + selectedTargetCurrency) }}
                        </span>
                      </div>
                    </VCol>
                  </VRow>

                  <VDivider class="my-3" />

                  <div class="rate-info text-center">
                    <span v-if="isForward" class="rate-text">
                      1 {{ selectedCurrency }} =
                      {{ formatCurrency(conversionResult.rate) }}
                      {{ selectedTargetCurrency }}
                    </span>
                    <span v-else class="rate-text">
                      1 {{ selectedTargetCurrency }} =
                      {{ formatCurrency(conversionResult.reverseRate) }}
                      {{ selectedCurrency }}
                    </span>
                  </div>
                  <div class="rate-info text-center">
                    <span v-if="isForward" class="rate-text">
                      {{ formatCurrency(conversionResult.invertedRate) }}
                      {{ selectedCurrency }} = 1 {{ selectedTargetCurrency }}
                    </span>
                    <span v-else class="rate-text">
                      {{ formatCurrency(reverseInvertedRate) }}
                      {{ selectedTargetCurrency }} = 1 {{ selectedCurrency }}
                    </span>
                  </div>
                  <VDivider class="my-3" />
                  <!-- Dual conversion summary -->
                  <VRow class="text-center" align="center" justify="center">
                    <VCol cols="12" md="6">
                      <div class="text-subtitle-2 text-grey-lighten-1 mb-1">
                        {{ t('quickExchangeForward') }}
                      </div>
                      <div class="text-h6 font-weight-bold text-white">
                        {{ formatCurrency(dualConversion.forwardToAmount) }}
                        <span class="text-caption">{{ selectedTargetCurrency }}</span>
                      </div>
                    </VCol>
                    <VCol cols="12" md="6">
                      <div class="text-subtitle-2 text-grey-lighten-1 mb-1">
                        {{ t('quickExchangeReverse') }}
                      </div>
                      <div class="text-h6 font-weight-bold text-white">
                        {{ formatCurrency(dualConversion.reverseNeededAmount) }}
                        <span class="text-caption">{{ selectedTargetCurrency }}</span>
                      </div>
                      <div class="text-caption text-grey-lighten-1 mt-1">
                        {{ reverseHintText }}
                      </div>
                    </VCol>
                  </VRow>
                </VCard>

                <!-- Dual Best Rates: show both Sell and Buy for the subject currency; order by user intent -->
                <template v-if="subjectCode">
                  <!-- First card: current intent (sell or buy) -->
                  <VCard
                    v-if="primaryRatesForSubject.length"
                    class="best-rates-card pa-4 mb-4"
                    color="rgba(33, 150, 243, 0.1)"
                    variant="outlined"
                  >
                    <h3 class="text-h6 font-weight-bold mb-3 mb-md-6 text-center text-white">
                      {{ primaryTitle }}
                    </h3>
                    <VRow>
                      <VCol
                        v-for="(rate, index) in primaryRatesForSubject"
                        :key="`${rate.origin}-${index}-primary`"
                        class="pa-2 pa-sm-3"
                        cols="6"
                        sm="6"
                        md="3"
                      >
                        <nuxt-link
                          class="d-flex w-100 h-100 text-decoration-none"
                          :to="localePath(`/historico/${rate.origin}/${subjectCode}`)"
                        >
                          <VCard
                            class="rate-item pa-3 text-center flex-grow-1"
                            :color="getRateCardColor(index)"
                            variant="tonal"
                          >
                            <div class="rate-position text-h6 font-weight-bold mb-2">
                              #{{ index + 1 }}
                            </div>
                            <div class="rate-name text-body-2 font-weight-medium mb-1">
                              {{ rate.source }}
                            </div>
                            <div class="rate-value text-h6 font-weight-bold mb-1">
                              ${{ rate.rate.toFixed(2) }}
                            </div>
                            <div class="rate-type text-caption">
                              {{ intentIsSellingSubject ? t('buy') : t('sell') }}
                              {{ t('codes.' + subjectCode) }}
                            </div>
                          </VCard>
                        </nuxt-link>
                      </VCol>
                    </VRow>
                  </VCard>

                  <!-- Second card: the other intent -->
                  <VCard
                    v-if="secondaryRatesForSubject.length"
                    class="best-rates-card pa-4 mb-4"
                    color="rgba(33, 150, 243, 0.1)"
                    variant="outlined"
                  >
                    <h3 class="text-h6 font-weight-bold mb-3 mb-md-6 text-center text-white">
                      {{ secondaryTitle }}
                    </h3>
                    <VRow>
                      <VCol
                        v-for="(rate, index) in secondaryRatesForSubject"
                        :key="`${rate.origin}-${index}-secondary`"
                        class="pa-2 pa-sm-3"
                        cols="6"
                        sm="6"
                        md="3"
                      >
                        <nuxt-link
                          class="d-flex w-100 h-100 text-decoration-none"
                          :to="localePath(`/historico/${rate.origin}/${subjectCode}`)"
                        >
                          <VCard
                            class="rate-item pa-3 text-center flex-grow-1"
                            :color="getRateCardColor(index)"
                            variant="tonal"
                          >
                            <div class="rate-position text-h6 font-weight-bold mb-2">
                              #{{ index + 1 }}
                            </div>
                            <div class="rate-name text-body-2 font-weight-medium mb-1">
                              {{ rate.source }}
                            </div>
                            <div class="rate-value text-h6 font-weight-bold mb-1">
                              ${{ rate.rate.toFixed(2) }}
                            </div>
                            <div class="rate-type text-caption">
                              {{ intentIsSellingSubject ? t('sell') : t('buy') }}
                              {{ t('codes.' + subjectCode) }}
                            </div>
                          </VCard>
                        </nuxt-link>
                      </VCol>
                    </VRow>
                  </VCard>
                </template>
              </VCard>
              <div class="mt-5">
                <!-- Advanced Mode Button -->
                <VBtn
                  :to="localePath('/avanzado')"
                  color="secondary"
                  variant="outlined"
                  size="large"
                  class="mb-3"
                >
                  <VIcon start>mdi-cog</VIcon>
                  {{ t('viewAdvanced') }}
                </VBtn>
              </div>
            </div>
          </VCol>
        </VRow>
      </VContainer>
    </section>

    <!-- Top Exchange Houses Section -->
    <section class="top-exchanges-section py-12">
      <VContainer>
        <VRow>
          <VCol cols="12" class="text-center mb-8">
            <h2 class="text-h4 font-weight-bold mb-4">
              {{ t('topExchangeHouses') }}
            </h2>
            <p class="text-body-1 text-grey-lighten-2">
              {{ t('subtitle') }}
            </p>
          </VCol>
        </VRow>

        <VRow>
          <VCol
            v-for="exchange in topExchanges"
            :key="exchange.origin"
            cols="6"
            sm="6"
            md="4"
            lg="3"
          >
            <nuxt-link
              class="d-flex w-100 h-100 text-decoration-none"
              :to="localePath(`/historico/${exchange.origin}/${exchange.code}`)"
            >
              <VCard class="exchange-house-card pa-4 h-100 w-100" elevation="4" hover>
                <div class="text-center">
                  <VAvatar size="64" color="primary" class="mb-4">
                    <VIcon size="32" color="white"> mdi-bank </VIcon>
                  </VAvatar>
                  <h3 class="text-body-1 text-sm-h6 font-weight-bold mb-2">
                    {{ exchange.name }}
                  </h3>
                  <p class="text-body-2 text-grey-lighten-1 mb-3">
                    {{ formatCurrency(exchange.rate) }} = 1 {{ exchange.code }}
                  </p>
                  <VChip
                    :color="exchange.isRegulated ? 'green' : 'orange'"
                    size="small"
                    variant="elevated"
                  >
                    {{ exchange.isRegulated ? 'BCU' : 'No BCU' }}
                  </VChip>
                </div>
              </VCard>
            </nuxt-link>
          </VCol>
        </VRow>
      </VContainer>
    </section>

    <!-- How It Works Section -->
    <section class="how-it-works-section py-12 bg-grey-darken-4">
      <VContainer>
        <VRow>
          <VCol cols="12" class="text-center mb-8">
            <h2 class="text-h4 font-weight-bold mb-4">
              {{ t('howItWorks') }}
            </h2>
          </VCol>
        </VRow>

        <VRow>
          <VCol v-for="(step, index) in steps" :key="index" cols="12" sm="6" md="3">
            <div class="step-card text-center pa-4">
              <VAvatar size="80" color="primary" class="mb-4">
                <span class="text-h4 font-weight-bold">{{ index + 1 }}</span>
              </VAvatar>
              <h3 class="text-h6 font-weight-bold mb-3">
                {{ step.title }}
              </h3>
              <p class="text-body-2 text-grey-lighten-1">
                {{ step.description }}
              </p>
            </div>
          </VCol>
        </VRow>
      </VContainer>
    </section>

    <!-- Donation Card Component -->
    <DonationCard />

    <!-- Features Section -->
    <section class="features-section py-12">
      <VContainer>
        <VRow>
          <VCol cols="12" class="text-center mb-8">
            <h2 class="text-h4 font-weight-bold mb-4">
              {{ t('whyChooseUs') }}
            </h2>
          </VCol>
        </VRow>

        <VRow>
          <VCol v-for="feature in features" :key="feature.title" cols="12" sm="6" md="4" lg="3">
            <VCard
              v-if="feature.title === t('feature5Title')"
              class="feature-card pa-6 h-100 cursor-pointer"
              elevation="2"
              href="https://api.cambio-uruguay.com/api-docs"
              target="_blank"
              rel="noopener noreferrer"
              :ripple="true"
            >
              <div class="text-center">
                <VIcon :color="feature.color" size="48" class="mb-4">
                  {{ feature.icon }}
                </VIcon>
                <h3 class="text-h6 font-weight-bold mb-3">
                  {{ feature.title }}
                </h3>
                <p class="text-body-2 text-grey-lighten-1 mb-3">
                  {{ feature.description }}
                </p>
                <VBtn color="primary" variant="outlined" size="small">
                  <VIcon start size="small">mdi-open-in-new</VIcon>
                  {{ t('apiDocumentation') }}
                </VBtn>
              </div>
            </VCard>
            <VCard
              v-else-if="feature.title === t('feature6Title')"
              class="feature-card pa-6 h-100 cursor-pointer"
              elevation="2"
              href="https://github.com/eduair94/cambio-uruguay"
              target="_blank"
              rel="noopener noreferrer"
              :ripple="true"
            >
              <div class="text-center">
                <VIcon :color="feature.color" size="48" class="mb-4">
                  {{ feature.icon }}
                </VIcon>
                <h3 class="text-h6 font-weight-bold mb-3">
                  {{ feature.title }}
                </h3>
                <p class="text-body-2 text-grey-lighten-1 mb-3">
                  {{ feature.description }}
                </p>
                <VBtn color="primary" variant="outlined" size="small">
                  <VIcon start size="small">mdi-open-in-new</VIcon>
                  {{ t('viewRepository') }}
                </VBtn>
              </div>
            </VCard>
            <VCard v-else class="feature-card pa-6 h-100" elevation="2">
              <div class="text-center">
                <VIcon :color="feature.color" size="48" class="mb-4">
                  {{ feature.icon }}
                </VIcon>
                <h3 class="text-h6 font-weight-bold mb-3">
                  {{ feature.title }}
                </h3>
                <p class="text-body-2 text-grey-lighten-1">
                  {{ feature.description }}
                </p>
              </div>
            </VCard>
          </VCol>
        </VRow>
      </VContainer>
    </section>

    <!-- CTA Section -->
    <section class="cta-section py-6 py-sm-12 bg-primary">
      <VContainer>
        <VRow justify="center" align="center">
          <VCol cols="12" md="8" class="text-center">
            <h2 class="text-h6 text-sm-h4 font-weight-bold mb-4 text-white">
              {{ t('consultCurrentQuotes') }}
            </h2>
            <VBtn
              :to="localePath('/avanzado')"
              color="white"
              variant="elevated"
              size="x-large"
              class="text-primary font-weight-bold"
            >
              <VIcon start>mdi-chart-line</VIcon>
              {{ t('viewAdvanced') }}
            </VBtn>
          </VCol>
        </VRow>
      </VContainer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useLocalePath } from '#imports'
import DirectionToggle from '@/components/DirectionToggle.vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'

const { mobile } = useDisplay()

// Interfaces
interface ExchangeItem {
  origin: string
  code: string
  buy: number
  sell: number
  type?: string
  isInterBank: boolean
  condition: string
  localData: {
    name?: string
    website?: string
    departments: string[]
    bcu?: boolean
  } | null
}

interface Step {
  title: string
  description: string
}

interface Feature {
  title: string
  description: string
  icon: string
  color: string
}

// Composables
const { t } = useI18n()
const localePath = useLocalePath()
const apiService = useApiService()
const route = useRoute()
const router = useRouter()

// Use input refs for v-models
const selectedCurrencyInput = ref((route.query.from as string) || 'USD')
const selectedTargetCurrencyInput = ref((route.query.to as string) || 'UYU')
const amountInput = ref(
  (() => {
    const queryAmount = Number(route.query.amount)
    return queryAmount && queryAmount > 0 ? queryAmount : 100
  })()
)

// selectedCurrency, selectedTargetCurrency, and amount are refs, set manually on button click
const selectedCurrency = ref(selectedCurrencyInput.value)
const selectedTargetCurrency = ref(selectedTargetCurrencyInput.value)
const amount = ref(amountInput.value)
// Rounding helper (shared)
const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100
const round4 = (n: number) => {
  const num = Number(n)
  const rounded = Math.round((num + Number.EPSILON) * 10000) / 10000

  // Check if the number ends with repetitive 999s and round up appropriately
  const str = rounded.toString()
  if (str.includes('.')) {
    const parts = str.split('.')
    const decimal = parts[1]
    // If decimal part ends with 999 or 9999, round up to cleaner number
    if (decimal && /9{3,}$/.test(decimal)) {
      // For numbers ending in 999+ pattern, round up to the next clean number
      const wholePart = parseInt(parts[0] || '0', 10)
      const nineCount = decimal.match(/9+$/)?.[0].length || 0

      if (nineCount >= 3) {
        // Round up to next whole number or to 2 decimal places
        if (decimal.length === 4 && nineCount === 4) {
          // 99.9999 -> 100.00
          return wholePart + 1
        } else if (nineCount >= 3) {
          // 12.3999 -> 12.40, 45.0999 -> 45.10
          const cleanDecimal = decimal.substring(0, decimal.length - nineCount)
          const lastDigit = parseInt(cleanDecimal[cleanDecimal.length - 1] || '0', 10)
          const newDecimal = cleanDecimal.substring(0, cleanDecimal.length - 1) + (lastDigit + 1)
          return parseFloat(`${wholePart}.${newDecimal.padEnd(2, '0')}`)
        }
      }
    }
  }

  return rounded
}

const loading = ref<boolean>(true)
const realExchangeData = ref<any[]>([])
const availableCurrencies = ref<string[]>(['USD', 'ARS', 'BRL', 'EUR', 'UYU'])

// Popular currencies without flags - for autocomplete
const currencyOptions = computed(() => {
  return availableCurrencies.value.map(code => ({
    title: code ? code + ' - ' + t('codes.' + code) : '',
    value: code,
  }))
})

const topExchanges = computed(() => {
  if (!realExchangeData.value.length || !selectedCurrency.value) return []

  const currencyData = realExchangeData.value.filter(
    item =>
      (item.code === selectedCurrency.value || item.code === selectedTargetCurrency.value) &&
      item.localData?.name &&
      (item.buy > 0 || item.sell > 0)
  )

  if (currencyData.length === 0) return []

  // Determine if we're converting FROM or TO the selected currency
  const isConvertingFrom =
    selectedCurrency.value !== 'UYU' && selectedTargetCurrency.value === 'UYU'
  const isConvertingTo = selectedCurrency.value === 'UYU' && selectedTargetCurrency.value !== 'UYU'

  let rates = []

  if (isConvertingFrom) {
    // User is selling the selected currency (FROM currency TO UYU)
    // Show top 4 selling rates (highest buy rates = best for user selling)
    rates = currencyData
      .map(item => ({
        source: item.localData?.name || item.origin,
        rate: item.buy,
        type: 'buy' as const, // This is what the exchange house pays (buys from user)
        origin: item.origin,
        name: item.localData.name,
        code: item.code,
        isRegulated: item.localData.bcu || false,
      }))
      .sort((a, b) => b.rate - a.rate) // Highest buy rate first
  } else if (isConvertingTo) {
    // User is buying the selected currency (FROM UYU TO currency)
    // Show top 4 buying rates (lowest sell rates = best for user buying)
    rates = currencyData
      .map(item => ({
        source: item.localData?.name || item.origin,
        rate: item.sell,
        type: 'sell' as const, // This is what the exchange house sells (user buys)
        origin: item.origin,
        code: item.code,
        name: item.localData.name,
        isRegulated: item.localData.bcu || false,
      }))
      .sort((a, b) => a.rate - b.rate) // Lowest sell rate first
  } else {
    // For other conversions, show mixed rates (2 buy + 2 sell)
    const buyRates = currencyData
      .filter(item => item.code === selectedCurrency.value)
      .map(item => ({
        source: item.localData?.name || item.origin,
        rate: item.buy,
        type: 'buy' as const,
        origin: item.origin,
        code: item.code,
        name: item.localData.name,
        isRegulated: item.localData.bcu || false,
      }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 4)

    const sellRates = currencyData
      .filter(item => item.code === selectedTargetCurrency.value)
      .map(item => ({
        source: item.localData?.name || item.origin,
        rate: item.sell,
        type: 'sell' as const,
        code: item.code,
        origin: item.origin,
        name: item.localData.name,
        isRegulated: item.localData.bcu || false,
      }))
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 4)

    rates = [...buyRates, ...sellRates]
  }

  // Remove duplicates based on source name and type

  return rates.slice(0, 8)
})

// Steps for how it works
const steps = computed<Step[]>(() => [
  {
    title: t('step1'),
    description: t('step1'),
  },
  {
    title: t('step2'),
    description: t('step2'),
  },
  {
    title: t('step3'),
    description: t('step3'),
  },
  {
    title: t('step4'),
    description: t('step4'),
  },
])

// Features
const features = computed<Feature[]>(() => [
  {
    title: t('feature1Title'),
    description: t('feature1Description'),
    icon: 'mdi-clock-outline',
    color: 'green',
  },
  {
    title: t('feature2Title'),
    description: t('feature2Description'),
    icon: 'mdi-bank-outline',
    color: 'blue',
  },
  {
    title: t('feature3Title'),
    description: t('feature3Description'),
    icon: 'mdi-currency-usd',
    color: 'orange',
  },
  {
    title: t('feature4Title'),
    description: t('feature4Description'),
    icon: 'mdi-heart-outline',
    color: 'red',
  },
  {
    title: t('feature5Title'),
    description: t('feature5Description'),
    icon: 'mdi-api',
    color: 'purple',
  },
  {
    title: t('feature6Title'),
    description: t('feature6Description'),
    icon: 'mdi-github',
    color: 'grey',
  },
])

// (removed) legacy helpers replaced by dual sections

// Exchange rate calculation
const getExchangeRate = (fromCurrency: string, toCurrency: string): number => {
  if (!realExchangeData.value.length) return 0

  if (fromCurrency === toCurrency) return 1

  // If converting from UYU to another currency
  if (toCurrency === 'UYU') {
    const currencyData = realExchangeData.value
      .sort((a, b) => b.buy - a.buy)
      .find(item => item.code === fromCurrency && item.buy > 0)
    return currencyData ? currencyData.buy : 0
  }

  // If converting to UYU from another currency
  if (fromCurrency === 'UYU') {
    const currencyData = realExchangeData.value
      .sort((a, b) => a.sell - b.sell)
      .find(item => item.code === toCurrency && item.sell > 0)
    return currencyData?.sell ? 1 / currencyData.sell : 0
  }

  // Cross-currency conversion through UYU
  const fromToUYU = getExchangeRate(fromCurrency, 'UYU')
  const uyuToTarget = getExchangeRate('UYU', toCurrency)

  return fromToUYU * uyuToTarget
}

const conversionResult = ref({
  rate: 0,
  invertedRate: 0,
  convertedAmount: 0,
  reverseRate: 0,
  reverseReceiveAmount: 0,
})

// Inverted reverse rate helper (1 / reverseRate)
const reverseInvertedRate = computed(() =>
  conversionResult.value.reverseRate > 0 ? 1 / conversionResult.value.reverseRate : 0
)

// Dual conversion: forward (from -> to) and reverse-needed (how much of target to sell to get the entered amount)
const dualConversion = ref({
  forwardToAmount: 0,
  reverseNeededAmount: 0,
})

// UI direction: forward (left->right) vs reverse (right->left)
const isForward = ref(true)
// Initialize from query param dir=f|r (defaults to forward)
if (typeof route.query.dir === 'string') {
  const lower = route.query.dir.toLowerCase()
  isForward.value = !(lower === 'r' || lower === 'reverse' || lower === '0' || lower === 'false')
}
// We keep the right-hand amount constant across direction toggles
const desiredRightAmount = ref(0)
// High-precision right-hand amount to avoid toggle rounding drift
const desiredRightAmountRaw = ref(0)
// Left-side needed when we are in reverse (buying on left to receive desiredRightAmount on right)
const leftForReverse = ref(0)

// Conversion result computed property
const setConversionRate = () => {
  const rate = Number(getExchangeRate(selectedCurrency.value, selectedTargetCurrency.value))
  const reverseRate = Number(getExchangeRate(selectedTargetCurrency.value, selectedCurrency.value))
  const rawConvertedAmount = Number(amount.value) * rate
  conversionResult.value = {
    rate,
    invertedRate: rate > 0 ? 1 / rate : 0,
    convertedAmount: round2(rawConvertedAmount),
    reverseRate,
    reverseReceiveAmount: round2(Number(amount.value) * reverseRate),
  }
  // Forward amount (entered amount converted to target)
  dualConversion.value.forwardToAmount = conversionResult.value.convertedAmount
  // Reverse summary:
  // - In forward mode: target to sell to get the entered left amount
  // - In reverse mode: show the fixed right-hand amount (avoid double rounding)
  if (reverseRate > 0) {
    const reverseNeeded = isForward.value
      ? Number(amount.value) / reverseRate
      : desiredRightAmountRaw.value > 0
        ? desiredRightAmountRaw.value
        : Number(amount.value) / reverseRate
    dualConversion.value.reverseNeededAmount = round2(reverseNeeded)
  } else {
    dualConversion.value.reverseNeededAmount = 0
  }
  // end setConversionRate

  // Maintain invariants for UI:
  // - desiredRightAmount remains the target shown on the right
  if (desiredRightAmountRaw.value <= 0) {
    if (isForward.value) {
      // Forward: initialize from forward conversion
      desiredRightAmountRaw.value = rawConvertedAmount
    } else {
      // Reverse: initialize from reverse math (right needed to obtain left)
      desiredRightAmountRaw.value = reverseRate > 0 ? Number(amount.value) / reverseRate : 0
    }
    desiredRightAmount.value = round2(desiredRightAmountRaw.value)
  }
  // - leftForReverse display depends on direction
  if (isForward.value) {
    // Forward: show how much you'd get on the left if you sell the right amount
    leftForReverse.value = reverseRate > 0 ? round2(desiredRightAmountRaw.value * reverseRate) : 0
  } else {
    // Reverse: show exactly the desired left amount the user is targeting
    leftForReverse.value = round2(Number(amount.value))
  }
}

// UI text helpers
const reverseHintText = computed(() =>
  t('quickExchangeReverseHint', {
    // Use left-hand amount for the message; in reverse it's leftForReverse
    amount: formatCurrency(isForward.value ? amount.value : leftForReverse.value),
    from: selectedCurrency.value,
    to: selectedTargetCurrency.value,
  })
)

// (removed) legacy combined list replaced by intent-ordered dual lists

// Subject currency is the non-UYU currency among from/to; user intent flags
const subjectCode = computed(() => {
  if (selectedCurrency.value !== 'UYU' && selectedCurrency.value) return selectedCurrency.value
  if (selectedTargetCurrency.value !== 'UYU' && selectedTargetCurrency.value)
    return selectedTargetCurrency.value
  return 'USD' // default fallback for UI; hidden by v-if if no data
})

// User intent for the subject currency (sell vs buy) that flips with arrow direction
// - If forward and FROM is subject (to UYU): selling subject
// - If forward and TO is subject (from UYU): buying subject
// - Reverse inverts the intent
const intentIsSellingSubject = computed(() => {
  const subj = subjectCode.value
  if (!subj) return false
  const fromIsSubject = selectedCurrency.value === subj
  const toIsSubject = selectedTargetCurrency.value === subj
  if (!fromIsSubject && !toIsSubject) return false
  return isForward.value ? fromIsSubject : !fromIsSubject
})

// Build top 4 lists for subject currency: sell (houses buy) and buy (houses sell)
const top4SellRatesForSubject = computed(() => {
  if (!realExchangeData.value.length || !subjectCode.value) return []
  const items = realExchangeData.value
    .filter(item => item.code === subjectCode.value && item.buy > 0 && item.localData?.name)
    .map(item => ({
      origin: item.origin,
      source: item.localData?.name || item.origin,
      rate: item.buy,
    }))
    .sort((a, b) => b.rate - a.rate)
  return items.slice(0, 4)
})

const top4BuyRatesForSubject = computed(() => {
  if (!realExchangeData.value.length || !subjectCode.value) return []
  const items = realExchangeData.value
    .filter(item => item.code === subjectCode.value && item.sell > 0 && item.localData?.name)
    .map(item => ({
      origin: item.origin,
      source: item.localData?.name || item.origin,
      rate: item.sell,
    }))
    .sort((a, b) => a.rate - b.rate)
  return items.slice(0, 4)
})

// Primary/secondary intent-ordered lists and titles
const primaryRatesForSubject = computed(() =>
  intentIsSellingSubject.value ? top4SellRatesForSubject.value : top4BuyRatesForSubject.value
)
const secondaryRatesForSubject = computed(() =>
  intentIsSellingSubject.value ? top4BuyRatesForSubject.value : top4SellRatesForSubject.value
)
const primaryTitle = computed(() =>
  intentIsSellingSubject.value
    ? `${t('bestToSell')} ${subjectCode.value}`
    : `${t('bestToBuy')} ${subjectCode.value}`
)
const secondaryTitle = computed(() =>
  intentIsSellingSubject.value
    ? `${t('bestToBuy')} ${subjectCode.value}`
    : `${t('bestToSell')} ${subjectCode.value}`
)

// Swap currencies function
const swapCurrencies = () => {
  const temp = selectedCurrencyInput.value
  selectedCurrencyInput.value = selectedTargetCurrencyInput.value
  selectedTargetCurrencyInput.value = temp
}

// Get color for rate card based on position
const getRateCardColor = (index: number): string => {
  const colors = ['gold', 'silver', 'orange', 'blue']
  return colors[index] || 'grey'
}

// Methods
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-UY', {
    style: 'currency',
    currency: 'UYU',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

// Function to update query parameters
const updateQueryParams = () => {
  const query = {
    from: selectedCurrency.value,
    to: selectedTargetCurrency.value,
    amount: amount.value.toString(),
    dir: isForward.value ? undefined : 'r',
  }

  // Only update if parameters have actually changed
  if (
    route.query.from !== query.from ||
    route.query.to !== query.to ||
    route.query.amount !== query.amount ||
    route.query.dir !== query.dir
  ) {
    try {
      router.push({ query })
    } catch {
      // Ignore navigation errors (e.g., duplicate navigation)
    }
  }
}

// Load initial data only once
const loadInitialData = async () => {
  loading.value = true

  try {
    const date = new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/Montevideo',
    })
    const data = await apiService.getProcessedExchangeData(date)

    if (data.error) {
      console.error('API Error:', data.error)
      return
    }

    // Store the real exchange data
    const realData = data.exchangeData.filter(item => {
      if (item.isInterBank && ['USD', 'BRL', 'ARG'].includes(item.code)) return false
      return true
    })

    realExchangeData.value = realData

    // Extract available currencies including UYU
    const currencies = new Set<string>()
    data.exchangeData.forEach((item: ExchangeItem) => {
      currencies.add(item.code)
    })

    // Always include UYU as it's the base currency
    currencies.add('UYU')

    availableCurrencies.value = Array.from(currencies).sort()

    setConversionRate()
  } catch (error) {
    console.error('Error loading initial data:', error)
  } finally {
    loading.value = false
  }
}

// Lifecycle
onMounted(() => {
  // Load initial data only once
  loadInitialData()
})

// Add cleanup to prevent memory leaks
onBeforeUnmount(() => {
  // Clear large data arrays to help garbage collection
  if (realExchangeData.value.length > 0) {
    realExchangeData.value = []
  }
  if (availableCurrencies.value.length > 0) {
    availableCurrencies.value = []
  }
})

const updateExchange = () => {
  loading.value = true
  selectedCurrency.value = selectedCurrencyInput.value
  selectedTargetCurrency.value = selectedTargetCurrencyInput.value
  amount.value = Number(amountInput.value) || 0
  setConversionRate()
  // Preserve the shown result when inverted; only reset desiredRightAmount in forward mode
  if (isForward.value) {
    // Recompute desiredRight using high precision to avoid future drift
    const r = conversionResult.value.rate
    desiredRightAmountRaw.value = amount.value * r
    desiredRightAmount.value = round2(desiredRightAmountRaw.value)
  } else {
    // Reverse mode: the input amount represents the left-side desired amount (e.g., USD to obtain)
    const rr = conversionResult.value.reverseRate
    if (rr > 0) {
      // Compute the right-side amount needed to obtain the left amount
      desiredRightAmountRaw.value = Number(amount.value) / rr
      desiredRightAmount.value = round2(desiredRightAmountRaw.value)
    } else {
      desiredRightAmountRaw.value = 0
      desiredRightAmount.value = 0
    }
    // Show exactly the entered left amount on the left side
    leftForReverse.value = round2(amount.value)
  }
  updateQueryParams()
  setTimeout(() => {
    loading.value = false
  }, 200)
}

// Toggle display direction and update input to reflect reverse semantics
const toggleDirection = () => {
  isForward.value = !isForward.value
  // Keep the right amount fixed; recompute left based on direction
  if (!isForward.value) {
    // Selling on right to buy on left: left obtained = desiredRightAmount * reverseRate
    const r = conversionResult.value.reverseRate
    if (r > 0) {
      amount.value = round4(desiredRightAmountRaw.value * r)
    } else {
      amount.value = 0
    }
    amountInput.value = amount.value
  } else {
    // Selling on left to buy on right (forward): left is the amount needed to receive desiredRightAmount
    const r = conversionResult.value.rate
    if (r > 0) {
      amount.value = round4(desiredRightAmountRaw.value / r)
    } else {
      amount.value = 0
    }
    amountInput.value = amount.value
  }
  setConversionRate()
  // Reflect current direction in the URL
  updateQueryParams()
}

// SEO Configuration
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

useSeoMeta({
  title: () => t('seo.homeTitle'),
  description: () => t('seo.homeDescription'),
  keywords: () => t('seo.homeKeywords'),
  ogTitle: () => t('seo.homeTitle'),
  ogDescription: () => t('seo.homeDescription'),
  ogType: 'website',
  ogUrl: 'https://cambio-uruguay.com',
  twitterCard: 'summary_large_image',
  twitterTitle: () => t('seo.homeTitle'),
  twitterDescription: () => t('seo.homeDescription'),
})
</script>

<style scoped>
/* Hero Section */
.home-container {
  min-height: 100vh;
}

.hero-section {
  background: linear-gradient(135deg, rgba(25, 32, 72, 0.95) 0%, rgba(76, 81, 191, 0.85) 100%);
  position: relative;
  overflow: hidden;
}

.hero-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)" /></svg>');
  opacity: 0.3;
  animation: float 20s ease-in-out infinite;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0px);
  }

  50% {
    transform: translateY(-20px);
  }
}

.min-height-hero {
  min-height: 70vh;
}

.hero-content {
  position: relative;
  z-index: 2;
}

.hero-title {
  color: #ffffff;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  margin-bottom: 1.5rem;
  animation: fadeInUp 0.8s ease-out;
}

.hero-subtitle {
  color: #e3f2fd;
  font-weight: 400;
  margin-bottom: 2rem;
  animation: fadeInUp 0.8s ease-out 0.2s both;
}

.hero-description {
  color: #f5f5f5;
  max-width: 600px;
  margin: 0 auto 2rem;
  animation: fadeInUp 0.8s ease-out 0.4s both;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Exchange Card */
.exchange-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  animation: fadeInUp 0.8s ease-out 0.6s both;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
}

.exchange-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
}

.amount-input {
  .v-field__input {
    font-size: 1.2em;
    font-weight: 500;
  }
}

/* Currency Selection Row */
.currency-row {
  position: relative;

  .currency-section {
    position: relative;
  }

  .swap-btn {
    transition: all 0.3s ease;

    &:hover {
      transform: rotate(180deg);
    }
  }
}

/* Conversion Result */
.conversion-result {
  border-radius: 12px;

  .conversion-display-row {
    min-height: 60px;
    align-items: center;
  }

  .conversion-display {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;

    .amount-text {
      font-size: 1.4em;
      font-weight: 600;
      color: white;

      &.converted {
        color: #4caf50;
      }
    }

    .currency-name {
      font-size: 0.9em;
      color: #b0bec5;
      margin-top: 4px;
    }
  }

  .rate-info {
    .rate-text {
      font-size: 0.9em;
      color: #81c784;
      font-weight: 500;
    }
  }
}

/* Mobile responsiveness for conversion result */
@media (max-width: 600px) {
  .conversion-result {
    .conversion-display-row {
      .v-col {
        margin-bottom: 8px;
      }
    }

    .conversion-display {
      .amount-text {
        font-size: 1.2em;
      }

      .currency-name {
        font-size: 0.8em;
      }
    }
  }
}

/* Best Rates Card */
.best-rates-card {
  border-radius: 12px;

  .rate-item {
    transition: all 0.3s ease;
    border-radius: 8px;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .rate-position {
      color: #ffc107;
    }

    .rate-name {
      color: #e0e0e0;
      font-size: 0.8em;
    }

    .rate-value {
      color: #4caf50;
    }

    .rate-type {
      color: #b0bec5;
    }
  }
}

/* Action Button */
.convert-btn {
  min-width: 180px;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0.5px;
}

/* Sections */
.top-exchanges-section {
  background: #121212;
  padding: 80px 0;
}

.how-it-works-section {
  padding: 80px 0;
  background: #1e1e1e;
}

.features-section {
  background: #121212;
  padding: 80px 0;
}

.cta-section {
  padding: 80px 0;
  background: linear-gradient(135deg, #1976d2 0%, #42a5f5 100%);
}

/* Cards */
.exchange-house-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.exchange-house-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.2);
}

.step-card {
  transition: transform 0.3s ease;
}

.step-card:hover {
  transform: translateY(-5px);
}

.feature-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.2);
}

.feature-card.cursor-pointer:hover {
  transform: translateY(-8px);
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.4);
  border-color: rgba(156, 39, 176, 0.3);
}

.cursor-pointer {
  cursor: pointer;
}

/* Responsive Design */
@media (max-width: 768px) {
  .swap-btn_container {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10;

    .swap-btn {
      background: linear-gradient(135deg, rgba(25, 32, 72, 0.95) 0%, rgba(76, 81, 191, 0.85) 100%);
      border-color: transparent;

      box-shadow: rgba(0, 0, 0, 0.2);

      i {
        color: white;
      }
    }
  }

  .hero-section {
    padding: 40px 0 0;
  }

  .hero-title {
    font-size: 2rem;
  }

  .hero-subtitle {
    font-size: 1.2rem;
  }

  .exchange-card {
    margin: 0 -20px;
    border-radius: 0;
  }

  .top-exchanges-section,
  .how-it-works-section,
  .features-section,
  .cta-section {
    padding: 40px 0;
  }

  .best-rates-card {
    .rate-item {
      margin-bottom: 8px;
    }
  }
}

@media (max-width: 480px) {
  .hero-title {
    font-size: 1.75rem;
  }

  .hero-subtitle {
    font-size: 1.1rem;
  }

  .exchange-card {
    padding: 20px;
  }
}

/* Accessibility */
.exchange-card:focus-within {
  outline: 2px solid #42a5f5;
  outline-offset: 2px;
}

.exchange-house-card:focus-within {
  outline: 2px solid #42a5f5;
  outline-offset: 2px;
}

/* Animation delays for staggered effect */
.exchange-house-card:nth-child(1) {
  animation: fadeInUp 0.6s ease-out 0.1s both;
}

.exchange-house-card:nth-child(2) {
  animation: fadeInUp 0.6s ease-out 0.2s both;
}

.exchange-house-card:nth-child(3) {
  animation: fadeInUp 0.6s ease-out 0.3s both;
}

.exchange-house-card:nth-child(4) {
  animation: fadeInUp 0.6s ease-out 0.4s both;
}

.step-card:nth-child(1) {
  animation: fadeInUp 0.6s ease-out 0.1s both;
}

.step-card:nth-child(2) {
  animation: fadeInUp 0.6s ease-out 0.2s both;
}

.step-card:nth-child(3) {
  animation: fadeInUp 0.6s ease-out 0.3s both;
}

.step-card:nth-child(4) {
  animation: fadeInUp 0.6s ease-out 0.4s both;
}

.feature-card:nth-child(1) {
  animation: fadeInUp 0.6s ease-out 0.1s both;
}

.feature-card:nth-child(2) {
  animation: fadeInUp 0.6s ease-out 0.2s both;
}

.feature-card:nth-child(3) {
  animation: fadeInUp 0.6s ease-out 0.3s both;
}

.feature-card:nth-child(4) {
  animation: fadeInUp 0.6s ease-out 0.4s both;
}

.feature-card:nth-child(5) {
  animation: fadeInUp 0.6s ease-out 0.5s both;
}

.feature-card:nth-child(6) {
  animation: fadeInUp 0.6s ease-out 0.6s both;
}
</style>
