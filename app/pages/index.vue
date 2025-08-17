<template>
  <div class="home-container">
    <!-- Hero Section -->
    <section class="hero-section pt-0 pt-md-5">
      <VContainer>
        <VRow justify="center" align="center" class="min-height-hero">
          <VCol cols="12" md="12" lg="12" class="text-center">
            <div class="hero-content">
              <h1
                class="hero-title text-h4 text-md-h3 text-md-h2 font-weight-bold mb-4"
              >
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
                  <VRow
                    align="center"
                    justify="center"
                    class="conversion-display-row"
                  >
                    <VCol cols="5" sm="4" class="text-center align-self-start">
                      <div class="conversion-display">
                        <span class="amount-text">{{
                          formatCurrency(amount)
                        }}</span>
                        <span v-if="selectedCurrency" class="currency-name">{{
                          t('codes.' + selectedCurrency)
                        }}</span>
                      </div>
                    </VCol>

                    <VCol cols="2" sm="4" class="text-center">
                      <VIcon color="success" size="24">mdi-arrow-right</VIcon>
                    </VCol>

                    <VCol cols="5" sm="4" class="text-center align-self-start">
                      <div class="conversion-display">
                        <span class="amount-text converted">{{
                          formatCurrency(conversionResult.convertedAmount)
                        }}</span>
                        <span
                          v-if="selectedTargetCurrency"
                          class="currency-name"
                          >{{ t('codes.' + selectedTargetCurrency) }}</span
                        >
                      </div>
                    </VCol>
                  </VRow>

                  <VDivider class="my-3" />

                  <div class="rate-info text-center">
                    <span class="rate-text">
                      1 {{ selectedCurrency }} =
                      {{ formatCurrency(conversionResult.rate) }}
                      {{ selectedTargetCurrency }}
                    </span>
                  </div>
                  <div class="rate-info text-center">
                    <span class="rate-text">
                      {{ formatCurrency(conversionResult.invertedRate) }}
                      {{ selectedCurrency }} = 1 {{ selectedTargetCurrency }}
                    </span>
                  </div>
                </VCard>

                <!-- Top 4 Best Rates -->
                <VCard
                  v-if="top4BestRates.length > 0"
                  class="best-rates-card pa-4 mb-4"
                  color="rgba(33, 150, 243, 0.1)"
                  variant="outlined"
                >
                  <h3
                    class="text-h6 font-weight-bold mb-3 mb-md-6 text-center text-white"
                  >
                    {{ getBestRatesTitle() }}
                  </h3>

                  <VRow>
                    <VCol
                      v-for="(rate, index) in top4BestRates"
                      :key="index"
                      class="pa-2 pa-sm-3"
                      cols="6"
                      sm="6"
                      md="3"
                    >
                      <nuxt-link
                        class="d-flex w-100 h-100 text-decoration-none"
                        :to="
                          localePath(`/historico/${rate.origin}/${rate.code}`)
                        "
                      >
                        <VCard
                          class="rate-item pa-3 text-center flex-grow-1"
                          :color="getRateCardColor(index)"
                          variant="tonal"
                        >
                          <div
                            class="rate-position text-h6 font-weight-bold mb-2"
                          >
                            #{{ index + 1 }}
                          </div>
                          <div
                            class="rate-name text-body-2 font-weight-medium mb-1"
                          >
                            {{ rate.source }}
                          </div>
                          <div class="rate-value text-h6 font-weight-bold mb-1">
                            ${{ rate.rate.toFixed(2) }}
                          </div>
                          <div v-if="rate.code" class="rate-type text-caption">
                            {{ getRateTypeLabel(rate.type) }}
                            {{ t('codes.' + rate.code) }}
                          </div>
                        </VCard>
                      </nuxt-link>
                    </VCol>
                  </VRow>
                </VCard>
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
              <VCard
                class="exchange-house-card pa-4 h-100 w-100"
                elevation="4"
                hover
              >
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
          <VCol
            v-for="(step, index) in steps"
            :key="index"
            cols="12"
            sm="6"
            md="3"
          >
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
          <VCol
            v-for="feature in features"
            :key="feature.title"
            cols="12"
            sm="6"
            md="4"
            lg="3"
          >
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
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'

const { mobile } = useDisplay()

// Interfaces
interface ExchangeHouse {
  name: string
  origin: string
  usdRate: number
  isRegulated: boolean
}

interface ExchangeResult {
  buyRate: number
  sellRate: number
  source: string
  origin: string
}

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

interface CurrencyOption {
  title: string
  value: string
  flag: string
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
  })(),
)

// selectedCurrency, selectedTargetCurrency, and amount are refs, set manually on button click
const selectedCurrency = ref(selectedCurrencyInput.value)
const selectedTargetCurrency = ref(selectedTargetCurrencyInput.value)
const amount = ref(amountInput.value)

const loading = ref<boolean>(true)
const realExchangeData = ref<any[]>([])
const availableCurrencies = ref<string[]>(['USD', 'ARS', 'BRL', 'EUR', 'UYU'])

// Popular currencies without flags - for autocomplete
const currencyOptions = computed(() => {
  return availableCurrencies.value.map((code) => ({
    title: code ? code + ' - ' + t('codes.' + code) : '',
    value: code,
  }))
})

const topExchanges = computed(() => {
  if (!realExchangeData.value.length || !selectedCurrency.value) return []

  const currencyData = realExchangeData.value.filter(
    (item) =>
      (item.code === selectedCurrency.value ||
        item.code === selectedTargetCurrency.value) &&
      item.localData?.name &&
      (item.buy > 0 || item.sell > 0),
  )

  if (currencyData.length === 0) return []

  // Determine if we're converting FROM or TO the selected currency
  const isConvertingFrom =
    selectedCurrency.value !== 'UYU' && selectedTargetCurrency.value === 'UYU'
  const isConvertingTo =
    selectedCurrency.value === 'UYU' && selectedTargetCurrency.value !== 'UYU'

  let rates = []

  if (isConvertingFrom) {
    // User is selling the selected currency (FROM currency TO UYU)
    // Show top 4 selling rates (highest buy rates = best for user selling)
    rates = currencyData
      .map((item) => ({
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
      .map((item) => ({
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
      .filter((item) => item.code === selectedCurrency.value)
      .map((item) => ({
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
      .filter((item) => item.code === selectedTargetCurrency.value)
      .map((item) => ({
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

// Get appropriate label for rate type
const getRateTypeLabel = (type: 'buy' | 'sell'): string => {
  const isConvertingFrom =
    selectedCurrency.value !== 'UYU' && selectedTargetCurrency.value === 'UYU'
  const isConvertingTo =
    selectedCurrency.value === 'UYU' && selectedTargetCurrency.value !== 'UYU'

  if (isConvertingFrom) {
    // User is selling the selected currency
    return type === 'buy' ? 'Te pagan en' : 'Te pagan'
  } else if (isConvertingTo) {
    // User is buying the selected currency
    return type === 'sell' ? 'Pagas en' : 'Pagas'
  } else {
    // Mixed conversion
    return type === 'buy' ? t('buying') : t('selling')
  }
}

// Get appropriate title for best rates section
const getBestRatesTitle = (): string => {
  if (!selectedCurrency.value || !selectedTargetCurrency.value)
    return t('topBestRates')

  const isConvertingFrom =
    selectedCurrency.value !== 'UYU' && selectedTargetCurrency.value === 'UYU'
  const isConvertingTo =
    selectedCurrency.value === 'UYU' && selectedTargetCurrency.value !== 'UYU'

  if (isConvertingFrom) {
    return t('bestToSell') + ` ${selectedCurrency.value}`
  } else if (isConvertingTo) {
    return t('bestToBuy') + ` ${selectedTargetCurrency.value}`
  } else {
    return t('topBestRates')
  }
}

// Exchange rate calculation
const getExchangeRate = (fromCurrency: string, toCurrency: string): number => {
  if (!realExchangeData.value.length) return 0

  if (fromCurrency === toCurrency) return 1

  // If converting from UYU to another currency
  if (toCurrency === 'UYU') {
    const currencyData = realExchangeData.value
      .sort((a, b) => b.buy - a.buy)
      .find((item) => item.code === fromCurrency && item.buy > 0)
    return currencyData ? currencyData.buy : 0
  }

  // If converting to UYU from another currency
  if (fromCurrency === 'UYU') {
    const currencyData = realExchangeData.value
      .sort((a, b) => a.sell - b.sell)
      .find((item) => item.code === toCurrency && item.sell > 0)
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
})

// Conversion result computed property
const setConversionRate = () => {
  const rate = getExchangeRate(
    selectedCurrency.value,
    selectedTargetCurrency.value,
  )
  conversionResult.value = {
    rate,
    invertedRate: 1 / rate,
    convertedAmount: amount.value * rate,
  }
  console.log('Conversion Rate', conversionResult.value)
}

// Top 4 best rates for the selected currency
const top4BestRates = computed(() => {
  if (!realExchangeData.value.length || !selectedCurrency.value) return []

  const currencyData = realExchangeData.value.filter(
    (item) =>
      (item.code === selectedCurrency.value ||
        item.code === selectedTargetCurrency.value) &&
      item.localData?.name &&
      (item.buy > 0 || item.sell > 0),
  )

  if (currencyData.length === 0) return []

  // Determine if we're converting FROM or TO the selected currency
  const isConvertingFrom =
    selectedCurrency.value !== 'UYU' && selectedTargetCurrency.value === 'UYU'
  const isConvertingTo =
    selectedCurrency.value === 'UYU' && selectedTargetCurrency.value !== 'UYU'

  let rates = []

  if (isConvertingFrom) {
    // User is selling the selected currency (FROM currency TO UYU)
    // Show top 4 selling rates (highest buy rates = best for user selling)
    rates = currencyData
      .map((item) => ({
        source: item.localData?.name || item.origin,
        rate: item.buy,
        code: item.code,
        type: 'buy' as const, // This is what the exchange house pays (buys from user)
        origin: item.origin,
      }))
      .sort((a, b) => b.rate - a.rate) // Highest buy rate first
      .slice(0, 4)
  } else if (isConvertingTo) {
    // User is buying the selected currency (FROM UYU TO currency)
    // Show top 4 buying rates (lowest sell rates = best for user buying)
    rates = currencyData
      .map((item) => ({
        source: item.localData?.name || item.origin,
        rate: item.sell,
        code: item.code,
        type: 'sell' as const, // This is what the exchange house sells (user buys)
        origin: item.origin,
      }))
      .sort((a, b) => a.rate - b.rate) // Lowest sell rate first
      .slice(0, 4)
  } else {
    // For other conversions, show mixed rates (2 buy + 2 sell)
    const buyRates = currencyData
      .filter((item) => item.code === selectedCurrency.value)
      .map((item) => ({
        source: item.localData?.name || item.origin,
        rate: item.buy,
        code: item.code,
        type: 'buy' as const,
        origin: item.origin,
      }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 2)

    const sellRates = currencyData
      .filter((item) => item.code === selectedTargetCurrency.value)
      .map((item) => ({
        source: item.localData?.name || item.origin,
        rate: item.sell,
        code: item.code,
        type: 'sell' as const,
        origin: item.origin,
      }))
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 2)

    rates = [...buyRates, ...sellRates]
  }

  // Remove duplicates based on source name and type
  const uniqueRates = rates

  return uniqueRates.slice(0, 4)
})

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
  }

  // Only update if parameters have actually changed
  if (
    route.query.from !== query.from ||
    route.query.to !== query.to ||
    route.query.amount !== query.amount
  ) {
    try {
      router.push({ query })
    } catch (e) {}
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
    const realData = data.exchangeData.filter((item) => {
      if (item.isInterBank && ['USD', 'BRL', 'ARG'].includes(item.code))
        return false
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
  amount.value = amountInput.value
  setConversionRate()
  updateQueryParams()
  setTimeout(() => {
    loading.value = false
  }, 200)
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
  background: linear-gradient(
    135deg,
    rgba(25, 32, 72, 0.95) 0%,
    rgba(76, 81, 191, 0.85) 100%
  );
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
      background: linear-gradient(
        135deg,
        rgba(25, 32, 72, 0.95) 0%,
        rgba(76, 81, 191, 0.85) 100%
      );
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
