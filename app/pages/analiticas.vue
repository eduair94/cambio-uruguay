<template>
  <VContainer class="py-6 analytics-page">
    <VCard class="overflow-hidden mb-5 analytics-hero-card" elevation="4">
      <div class="analytics-hero on-dark pa-6 pa-md-8">
        <div class="analytics-hero__grid">
          <div>
            <div class="analytics-hero__eyebrow mb-3">
              <span class="analytics-hero__pulse" aria-hidden="true" />
              {{ t('rateAnalytics.marketDesk') }}
            </div>
            <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-1">
              {{ t('rateAnalytics.title') }}
            </h1>
            <p class="text-body-1 text-grey-lighten-2 mb-0">
              {{ t('rateAnalytics.subtitle') }}
            </p>
          </div>
          <div class="analytics-hero__board" aria-label="Resumen de filtros activos">
            <div>
              <span>{{ t('rateAnalytics.window') }}</span>
              <strong>{{ heroPeriodLabel }}</strong>
            </div>
            <div>
              <span>{{ t('rateAnalytics.institutions') }}</span>
              <strong>{{ analytics?.series.length ?? 0 }}</strong>
            </div>
            <div>
              <span>{{ t('rateAnalytics.interval') }}</span>
              <strong>{{ heroIntervalLabel }}</strong>
            </div>
          </div>
        </div>
      </div>
    </VCard>

    <VCard class="analytics-panel analytics-filter-panel pa-4 pa-md-6 mb-5" variant="flat">
      <div class="d-flex align-center justify-space-between ga-3 flex-wrap mb-4">
        <div>
          <h2 class="text-h6 font-weight-bold mb-1">{{ t('rateAnalytics.filtersTitle') }}</h2>
          <p class="text-body-2 text-medium-emphasis mb-0">
            {{ t('rateAnalytics.filtersSubtitle') }}
          </p>
        </div>
        <VBtn variant="text" prepend-icon="mdi-filter-off-outline" @click="resetFilters">
          {{ t('rateAnalytics.reset') }}
        </VBtn>
      </div>

      <VRow density="comfortable">
        <VCol cols="12" sm="6" md="3">
          <VSelect
            v-model="selectedCurrency"
            :items="currencyOptions"
            :label="t('rateAnalytics.currency')"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <VSelect
            v-model="selectedPeriod"
            :items="periodOptions"
            :label="t('rateAnalytics.period')"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <VSelect
            v-model="selectedInterval"
            :items="intervalOptions"
            :label="t('rateAnalytics.interval')"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <VTextField
            v-model.number="uyuBudget"
            :label="t('rateAnalytics.budget')"
            type="number"
            min="1"
            step="1000"
            prefix="$"
            suffix="UYU"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" md="4">
          <VSelect
            v-model="selectedCategory"
            :items="categoryOptions"
            :label="t('rateAnalytics.category')"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" md="4">
          <VSelect
            v-model="selectedDepartment"
            :items="departmentOptions"
            :label="t('rateAnalytics.department')"
            clearable
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" md="4">
          <VAutocomplete
            v-model="selectedOrigins"
            :items="originOptions"
            :label="t('rateAnalytics.houses')"
            multiple
            chips
            closable-chips
            item-title="title"
            item-value="value"
            variant="outlined"
            density="comfortable"
            hide-details
          >
            <template #chip="{ item, index, props }">
              <VChip v-if="index === 0" v-bind="props" size="small" closable>
                {{ item.title }}
              </VChip>
              <span v-else-if="index === 1" class="text-caption text-medium-emphasis ms-1">
                +{{ selectedOrigins.length - 1 }}
              </span>
            </template>
          </VAutocomplete>
        </VCol>
      </VRow>

      <VAlert
        type="info"
        variant="tonal"
        density="compact"
        icon="mdi-source-branch"
        class="mt-4 mb-0"
      >
        {{ t('rateAnalytics.branchMethodology') }}
      </VAlert>

      <div class="analytics-actions d-flex justify-end mt-4">
        <VBtn
          color="primary"
          size="large"
          prepend-icon="mdi-chart-line"
          :loading="pending"
          :disabled="selectedOrigins.length === 0"
          @click="applyFilters"
        >
          {{ t('rateAnalytics.apply') }}
        </VBtn>
      </div>
    </VCard>

    <VAlert v-if="error" type="warning" variant="tonal" class="mb-5">
      {{ t('rateAnalytics.error') }}
    </VAlert>

    <template v-if="analytics?.series.length">
      <section class="market-summary mb-5" :aria-label="t('rateAnalytics.marketSummary')">
        <div class="market-summary__item">
          <div class="market-summary__icon market-summary__icon--buy">
            <VIcon size="19">mdi-arrow-bottom-left</VIcon>
          </div>
          <div>
            <div class="market-summary__label">
              {{ t('rateAnalytics.avgBuy') }}
            </div>
            <div class="market-summary__value text-primary">
              {{ formatUYU(currentAggregate?.buy) }}
            </div>
          </div>
        </div>
        <div class="market-summary__item">
          <div class="market-summary__icon market-summary__icon--sell">
            <VIcon size="19">mdi-arrow-top-right</VIcon>
          </div>
          <div>
            <div class="market-summary__label">
              {{ t('rateAnalytics.avgSell') }}
            </div>
            <div class="market-summary__value text-success">
              {{ formatUYU(currentAggregate?.sell) }}
            </div>
          </div>
        </div>
        <div class="market-summary__item">
          <div
            class="market-summary__icon"
            :class="periodChange >= 0 ? 'market-summary__icon--up' : 'market-summary__icon--down'"
          >
            <VIcon size="19">
              {{ periodChange >= 0 ? 'mdi-trending-up' : 'mdi-trending-down' }}
            </VIcon>
          </div>
          <div>
            <div class="market-summary__label">
              {{ t('rateAnalytics.periodChange') }}
            </div>
            <div
              class="market-summary__value"
              :class="periodChange >= 0 ? 'text-success' : 'text-error'"
            >
              {{ formatPct(periodChange) }}
            </div>
          </div>
        </div>
        <div class="market-summary__item">
          <div class="market-summary__icon market-summary__icon--power">
            <VIcon size="19">mdi-wallet-outline</VIcon>
          </div>
          <div>
            <div class="market-summary__label">
              {{ t('rateAnalytics.buyingPower') }}
            </div>
            <div class="market-summary__value">
              {{ formatForeign(currentAggregate?.purchasingPower) }}
            </div>
          </div>
        </div>
      </section>

      <VCard class="analytics-panel pa-4 pa-md-6 mb-5" variant="flat">
        <div class="d-flex align-center justify-space-between ga-3 flex-wrap mb-4">
          <div>
            <h2 class="text-h6 font-weight-bold mb-1">
              {{ t('rateAnalytics.ratesChart') }}
            </h2>
            <p class="text-body-2 text-medium-emphasis mb-0">
              {{ chartRangeLabel }}
            </p>
          </div>
          <div class="analytics-controls d-flex ga-2">
            <VBtnToggle
              v-model="chartMode"
              mandatory
              color="primary"
              variant="outlined"
              density="comfortable"
            >
              <VBtn value="average">{{ t('rateAnalytics.average') }}</VBtn>
              <VBtn value="houses">{{ t('rateAnalytics.byHouse') }}</VBtn>
            </VBtnToggle>
            <VBtnToggle
              v-if="chartMode === 'houses'"
              v-model="houseSide"
              mandatory
              color="secondary"
              variant="outlined"
              density="comfortable"
            >
              <VBtn value="buy">{{ t('rateAnalytics.buy') }}</VBtn>
              <VBtn value="sell">{{ t('rateAnalytics.sell') }}</VBtn>
            </VBtnToggle>
          </div>
        </div>

        <div class="analytics-chart">
          <ClientOnly>
            <LineChart
              :key="ratesChartKey"
              :chart-data="ratesChartData"
              :options="ratesChartOptions"
              :aria-label="t('rateAnalytics.ratesChartAria')"
            />
            <template #fallback>
              <VSkeletonLoader type="image" />
            </template>
          </ClientOnly>
        </div>
        <section
          v-if="chartMode === 'houses'"
          class="series-reference mt-5"
          aria-labelledby="series-reference-title"
        >
          <div class="series-reference__heading">
            <div>
              <h3 id="series-reference-title" class="text-subtitle-1 font-weight-bold mb-1">
                {{ t('rateAnalytics.seriesReference') }}
              </h3>
              <p class="text-body-2 text-medium-emphasis mb-0">
                {{ t('rateAnalytics.seriesReferenceHint') }}
              </p>
            </div>
            <div class="series-reference__controls">
              <VSwitch
                v-model="hideAnomalies"
                color="warning"
                density="compact"
                hide-details
                :label="t('rateAnalytics.hideAnomalies')"
              />
              <VBtn
                variant="text"
                size="small"
                prepend-icon="mdi-eye-multiple-outline"
                @click="showAllHouseSeries"
              >
                {{ t('rateAnalytics.showAll') }}
              </VBtn>
            </div>
          </div>

          <div
            v-if="preparedHouseChart.anomalies.length"
            class="anomaly-report"
            role="status"
            aria-live="polite"
          >
            <div class="anomaly-report__icon" aria-hidden="true">
              <VIcon size="20">mdi-chart-bell-curve-cumulative</VIcon>
            </div>
            <div>
              <strong>
                {{
                  t('rateAnalytics.anomaliesDetected', {
                    count: preparedHouseChart.anomalies.length,
                  })
                }}
              </strong>
              <p class="mb-2">{{ t('rateAnalytics.anomaliesMethod') }}</p>
              <ul>
                <li v-for="anomaly in anomalySummary" :key="`${anomaly.origin}-${anomaly.at}`">
                  <span
                    class="series-swatch"
                    :style="{ backgroundColor: houseColor(anomaly.origin) }"
                    aria-hidden="true"
                  />
                  <strong>{{ anomaly.houseName }}</strong>
                  · {{ formatDateTime(anomaly.at) }} · {{ formatUYU(anomaly.value) }}
                  →
                  {{ formatUYU(anomaly.baseline) }}
                  <span class="text-medium-emphasis">
                    ({{ formatPct(anomaly.deviationPct) }})
                  </span>
                </li>
                <li v-if="remainingAnomalies">
                  {{ t('rateAnalytics.moreAnomalies', { count: remainingAnomalies }) }}
                </li>
              </ul>
            </div>
          </div>

          <div class="series-reference__table-wrap">
            <table class="series-reference__table">
              <thead>
                <tr>
                  <th :aria-label="t('rateAnalytics.color')" />
                  <th>{{ t('rateAnalytics.house') }}</th>
                  <th class="text-end series-reference__optional">
                    {{ t('rateAnalytics.currentValue') }}
                  </th>
                  <th class="text-end series-reference__optional">
                    {{ t('rateAnalytics.dataPoints') }}
                  </th>
                  <th class="text-end series-reference__optional">
                    {{ t('rateAnalytics.missingPoints') }}
                  </th>
                  <th class="text-end">{{ t('rateAnalytics.anomalies') }}</th>
                  <th class="text-end">
                    <span class="series-reference__actions-label">
                      {{ t('rateAnalytics.seriesActions') }}
                    </span>
                    <VIcon class="series-reference__actions-icon" size="16" aria-hidden="true">
                      mdi-eye-settings-outline
                    </VIcon>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in seriesReferenceRows"
                  :key="row.origin"
                  :class="{ 'series-reference__row--hidden': !row.visible }"
                >
                  <td>
                    <span
                      class="series-swatch"
                      :style="{ backgroundColor: row.color }"
                      aria-hidden="true"
                    />
                  </td>
                  <td>
                    <span class="series-reference__house">{{ row.houseName }}</span>
                    <span v-if="row.type" class="text-caption text-medium-emphasis">
                      · {{ row.type }}
                    </span>
                  </td>
                  <td class="text-end series-reference__optional">
                    {{ formatUYU(row.current) }}
                  </td>
                  <td class="text-end series-reference__optional">
                    {{ row.availableCount }}
                  </td>
                  <td class="text-end series-reference__optional">
                    {{ row.gapCount }}
                  </td>
                  <td class="text-end">
                    <VChip
                      v-if="row.anomalies.length"
                      color="warning"
                      variant="tonal"
                      size="x-small"
                    >
                      {{ row.anomalies.length }}
                    </VChip>
                    <span v-else>—</span>
                  </td>
                  <td class="text-end">
                    <div class="series-reference__actions">
                      <VBtn
                        icon
                        variant="text"
                        size="x-small"
                        :color="row.visible ? 'primary' : undefined"
                        :aria-label="
                          t(
                            row.visible
                              ? 'rateAnalytics.hideHouseSeries'
                              : 'rateAnalytics.showHouseSeries',
                            { house: row.houseName }
                          )
                        "
                        @click="toggleHouseSeries(row.origin)"
                      >
                        <VIcon size="18">
                          {{ row.visible ? 'mdi-eye-outline' : 'mdi-eye-off-outline' }}
                        </VIcon>
                      </VBtn>
                      <VBtn
                        class="series-reference__only"
                        variant="text"
                        size="x-small"
                        :aria-label="
                          t('rateAnalytics.isolateHouseSeries', { house: row.houseName })
                        "
                        @click="isolateHouseSeries(row.origin)"
                      >
                        <VIcon size="17">mdi-crosshairs-gps</VIcon>
                        <span class="series-reference__only-label">
                          {{ t('rateAnalytics.only') }}
                        </span>
                      </VBtn>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </VCard>

      <VCard class="analytics-panel pa-4 pa-md-6 mb-5" variant="flat">
        <h2 class="text-h6 font-weight-bold mb-1">
          {{ t('rateAnalytics.powerChart') }}
        </h2>
        <p class="text-body-2 text-medium-emphasis mb-4">
          {{ t('rateAnalytics.powerDescription', { amount: formatUYU(uyuBudget) }) }}
        </p>
        <div class="analytics-chart analytics-chart--power">
          <ClientOnly>
            <LineChart
              :key="powerChartKey"
              :chart-data="powerChartData"
              :options="powerChartOptions"
              :aria-label="t('rateAnalytics.powerChartAria')"
            />
          </ClientOnly>
        </div>
      </VCard>

      <VAlert v-if="coverageNotice" type="info" variant="tonal" icon="mdi-history" class="mb-5">
        {{ coverageNotice }}
      </VAlert>

      <VCard class="analytics-panel pa-4 pa-md-6" variant="flat">
        <div class="d-flex align-center justify-space-between ga-3 flex-wrap mb-4">
          <div>
            <h2 class="text-h6 font-weight-bold mb-1">
              {{ t('rateAnalytics.tableTitle') }}
            </h2>
            <p class="text-body-2 text-medium-emphasis mb-0">
              {{ t('rateAnalytics.tableSubtitle', { count: houseRows.length }) }}
            </p>
          </div>
          <VChip variant="tonal" color="primary">
            {{ t('rateAnalytics.updatedAt', { time: formatDateTime(analytics.asOf) }) }}
          </VChip>
        </div>

        <VTable class="cu-mobile-cards analytics-table" hover>
          <thead>
            <tr>
              <th>{{ t('rateAnalytics.house') }}</th>
              <th>{{ t('rateAnalytics.branchesShort') }}</th>
              <th class="text-end">{{ t('rateAnalytics.buy') }}</th>
              <th class="text-end">{{ t('rateAnalytics.sell') }}</th>
              <th class="text-end">{{ t('rateAnalytics.change') }}</th>
              <th class="text-end">{{ t('rateAnalytics.powerShort') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in houseRows" :key="row.origin">
              <td :data-label="t('rateAnalytics.house')">
                <NuxtLink :to="localePath(`/casa/${row.origin}`)" class="house-link">
                  {{ row.houseName }}
                </NuxtLink>
                <span v-if="row.type" class="text-caption text-medium-emphasis ms-1">
                  · {{ row.type }}
                </span>
                <span class="analytics-category ms-2">
                  {{ categoryLabel(row.origin) }}
                </span>
              </td>
              <td :data-label="t('rateAnalytics.branchesShort')">
                {{ branchCount(row.origin) }}
              </td>
              <td class="text-end" :data-label="t('rateAnalytics.buy')">
                {{ formatUYU(row.buy) }}
              </td>
              <td class="text-end" :data-label="t('rateAnalytics.sell')">
                {{ formatUYU(row.sell) }}
              </td>
              <td
                class="text-end"
                :class="row.sellChangePct >= 0 ? 'text-success' : 'text-error'"
                :data-label="t('rateAnalytics.change')"
              >
                {{ formatPct(row.sellChangePct) }}
              </td>
              <td class="text-end" :data-label="t('rateAnalytics.powerShort')">
                {{ formatForeign(row.purchasingPower) }}
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
    </template>

    <VCard v-else-if="!pending" class="pa-8 text-center" variant="flat">
      <VIcon size="48" color="medium-emphasis">mdi-chart-line-variant</VIcon>
      <p class="text-body-1 text-medium-emphasis mt-3 mb-0">
        {{ t('rateAnalytics.empty') }}
      </p>
    </VCard>
  </VContainer>
</template>

<script setup lang="ts">
import { useTheme } from 'vuetify'
import LineChart from '~/components/charts/LineChart.vue'
import type { RateAnalyticsInterval, RateAnalyticsResponse } from '~/types/api'
import { CASAS_REPUTATION } from '~/utils/casasDirectory'
import {
  aggregateRateSeries,
  cleanRateAnalyticsSeries,
  prepareRateChartSeries,
  summarizeAnalyticsHouses,
} from '~/utils/rateAnalytics'

type InstitutionCategory = 'all' | 'casa' | 'banco' | 'fintech'

interface MapBranch {
  key: string
  origin: string
  id: string
  name: string
  dept: string
  locality: string
  address: string
}

interface AppliedQuery {
  code: string
  origins?: string
  from: string
  to: string
  interval: RateAnalyticsInterval
}

const { t, locale } = useI18n()
const localePath = useLocalePath()
const theme = useTheme()

const periodOptions = computed(() => [
  { title: t('rateAnalytics.last24h'), value: 1 },
  { title: t('rateAnalytics.last7d'), value: 7 },
  { title: t('rateAnalytics.last30d'), value: 30 },
  { title: t('rateAnalytics.last90d'), value: 90 },
  { title: t('rateAnalytics.lastYear'), value: 365 },
])
const intervalOptions = computed(() => [
  { title: t('rateAnalytics.hourly'), value: 'hour' },
  { title: t('rateAnalytics.daily'), value: 'day' },
])
const categoryOptions = computed(() => [
  { title: t('rateAnalytics.categoryAll'), value: 'all' },
  { title: t('rateAnalytics.categoryCasa'), value: 'casa' },
  { title: t('rateAnalytics.categoryBanco'), value: 'banco' },
  { title: t('rateAnalytics.categoryFintech'), value: 'fintech' },
])
const heroPeriodLabel = computed(
  () => periodOptions.value.find(option => option.value === selectedPeriod.value)?.title || ''
)
const heroIntervalLabel = computed(
  () => intervalOptions.value.find(option => option.value === selectedInterval.value)?.title || ''
)

const selectedCurrency = ref('USD')
const selectedPeriod = ref(1)
const selectedInterval = ref<RateAnalyticsInterval>('hour')
const selectedCategory = ref<InstitutionCategory>('all')
const selectedDepartment = ref<string | null>(null)
const selectedOrigins = ref<string[]>([])
const uyuBudget = ref(10_000)
const chartMode = ref<'average' | 'houses'>('average')
const houseSide = ref<'buy' | 'sell'>('sell')
const hideAnomalies = ref(true)
const hiddenHouseOrigins = ref<string[]>([])

const makeQuery = (
  code = 'USD',
  days = 1,
  interval: RateAnalyticsInterval = 'hour',
  origins?: string[]
): AppliedQuery => {
  const to = new Date()
  const from = new Date(to.getTime() - days * 86_400_000)
  return {
    code,
    origins: origins?.length ? origins.join(',') : undefined,
    from: from.toISOString(),
    to: to.toISOString(),
    interval,
  }
}

const appliedQuery = ref<AppliedQuery>(makeQuery())
const [{ data: analytics, pending, error }, { data: locations }] = await Promise.all([
  useAsyncData<RateAnalyticsResponse>(
    'rate-analytics',
    () => $fetch('/api/rate-analytics', { query: appliedQuery.value }),
    { watch: [appliedQuery] }
  ),
  useFetch<MapBranch[]>('/api/rate-analytics-branches', { default: () => [] }),
])

const currencyOptions = computed(() =>
  (analytics.value?.availableCurrencies ?? ['USD']).map(code => ({
    title: code,
    value: code,
  }))
)
const allCurrencyOrigins = computed(() =>
  (analytics.value?.availableOrigins ?? []).filter(origin =>
    origin.currencies.includes(selectedCurrency.value)
  )
)
const institutionCategories = new Map(
  CASAS_REPUTATION.map(institution => [institution.code, institution.category])
)
const institutionCategory = (origin: string) => institutionCategories.get(origin) ?? 'casa'
const categoryLabel = (origin: string) => {
  const category = institutionCategory(origin)
  const suffix = `${category.charAt(0).toUpperCase()}${category.slice(1)}`
  return t(`rateAnalytics.category${suffix}`)
}
const departmentOptions = computed(() =>
  [...new Set((locations.value ?? []).map(branch => branch.dept).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, locale.value)
  )
)
const departmentOriginSet = computed(() => {
  if (!selectedDepartment.value) return null
  return new Set(
    (locations.value ?? [])
      .filter(branch => branch.dept === selectedDepartment.value)
      .map(branch => branch.origin)
  )
})
const originOptions = computed(() =>
  allCurrencyOrigins.value
    .filter(
      origin =>
        selectedCategory.value === 'all' ||
        institutionCategory(origin.origin) === selectedCategory.value
    )
    .filter(origin => !departmentOriginSet.value || departmentOriginSet.value.has(origin.origin))
    .map(origin => ({ title: origin.houseName, value: origin.origin }))
)
const eligibleBranches = computed(() =>
  (locations.value ?? []).filter(
    branch =>
      selectedOrigins.value.includes(branch.origin) &&
      (!selectedDepartment.value || branch.dept === selectedDepartment.value)
  )
)
const selectAllForCurrentFilters = () => {
  selectedOrigins.value = originOptions.value.map(option => option.value)
}
if (analytics.value) selectAllForCurrentFilters()

watch([selectedCurrency, selectedCategory, selectedDepartment], () => {
  if (selectedPeriod.value > 31) selectedInterval.value = 'day'
  selectAllForCurrentFilters()
})
watch(selectedPeriod, days => {
  if (days > 31) selectedInterval.value = 'day'
})
watch(
  () => (analytics.value?.series ?? []).map(item => item.origin).join('|'),
  () => {
    hiddenHouseOrigins.value = []
  }
)

const applyFilters = () => {
  const days = selectedPeriod.value
  const interval = days > 31 ? 'day' : selectedInterval.value
  selectedInterval.value = interval
  appliedQuery.value = makeQuery(selectedCurrency.value, days, interval, selectedOrigins.value)
}

const resetFilters = () => {
  selectedCurrency.value = 'USD'
  selectedPeriod.value = 1
  selectedInterval.value = 'hour'
  selectedCategory.value = 'all'
  selectedDepartment.value = null
  uyuBudget.value = 10_000
  chartMode.value = 'average'
  houseSide.value = 'sell'
  hideAnomalies.value = true
  hiddenHouseOrigins.value = []
  nextTick(() => {
    selectAllForCurrentFilters()
    nextTick(applyFilters)
  })
}

const effectiveSeries = computed(() =>
  hideAnomalies.value
    ? cleanRateAnalyticsSeries(analytics.value?.series ?? [])
    : (analytics.value?.series ?? [])
)
const aggregatePoints = computed(() =>
  aggregateRateSeries(effectiveSeries.value, Number(uyuBudget.value) || 0)
)
const currentAggregate = computed(() => aggregatePoints.value.at(-1))
const firstSell = computed(
  () => aggregatePoints.value.find(point => typeof point.sell === 'number')?.sell ?? null
)
const periodChange = computed(() => {
  const first = firstSell.value
  const current = currentAggregate.value?.sell
  return first && current ? ((current - first) / first) * 100 : 0
})
const houseRows = computed(() =>
  summarizeAnalyticsHouses(effectiveSeries.value, Number(uyuBudget.value) || 0)
)
const displayCurrency = computed(() => analytics.value?.code || selectedCurrency.value)

const dateFormatter = computed(
  () =>
    new Intl.DateTimeFormat(locale.value, {
      day: '2-digit',
      month: '2-digit',
      ...(analytics.value?.interval === 'hour'
        ? { hour: '2-digit', minute: '2-digit' }
        : { year: '2-digit' }),
      timeZone: 'America/Montevideo',
    })
)
const formatLabel = (value: string) => dateFormatter.value.format(new Date(value))
const labels = computed(() => aggregatePoints.value.map(point => formatLabel(point.at)))
const dark = computed(() => theme.current.value.dark)
const axisColor = computed(() => (dark.value ? '#b8c1cc' : '#536170'))
const gridColor = computed(() => (dark.value ? 'rgba(255,255,255,0.08)' : 'rgba(20,45,70,0.10)'))
const houseColor = (origin: string) => {
  const hash = [...origin].reduce((value, character) => {
    return (value * 31 + character.charCodeAt(0)) >>> 0
  }, 17)
  const hue = hash % 360
  return `hsl(${hue} 68% ${dark.value ? 62 : 42}%)`
}
const preparedHouseChart = computed(() =>
  prepareRateChartSeries(analytics.value?.series ?? [], houseSide.value, hideAnomalies.value)
)
const hiddenHouseSet = computed(() => new Set(hiddenHouseOrigins.value))
const showAllHouseSeries = () => {
  hiddenHouseOrigins.value = []
}
const toggleHouseSeries = (origin: string) => {
  hiddenHouseOrigins.value = hiddenHouseSet.value.has(origin)
    ? hiddenHouseOrigins.value.filter(item => item !== origin)
    : [...hiddenHouseOrigins.value, origin]
}
const isolateHouseSeries = (origin: string) => {
  hiddenHouseOrigins.value = (analytics.value?.series ?? [])
    .map(item => item.origin)
    .filter(item => item !== origin)
}
const seriesReferenceRows = computed(() => {
  const currentByOrigin = new Map(
    (analytics.value?.series ?? []).map(item => [
      item.origin,
      houseSide.value === 'buy' ? item.currentBuy : item.currentSell,
    ])
  )
  return preparedHouseChart.value.series.map(item => ({
    ...item,
    color: houseColor(item.origin),
    current: currentByOrigin.get(item.origin) ?? null,
    visible: !hiddenHouseSet.value.has(item.origin),
  }))
})
const anomalySummary = computed(() => preparedHouseChart.value.anomalies.slice(0, 4))
const remainingAnomalies = computed(() =>
  Math.max(0, preparedHouseChart.value.anomalies.length - anomalySummary.value.length)
)

const ratesChartData = computed(() => {
  if (chartMode.value === 'average') {
    return {
      labels: labels.value,
      datasets: [
        {
          label: t('rateAnalytics.avgBuy'),
          data: aggregatePoints.value.map(point => point.buy),
          borderColor: '#2f81f7',
          backgroundColor: 'rgba(47,129,247,0.08)',
          tension: 0.2,
          pointRadius: aggregatePoints.value.length > 60 ? 0 : 2,
          pointHoverRadius: 5,
          spanGaps: false,
        },
        {
          label: t('rateAnalytics.avgSell'),
          data: aggregatePoints.value.map(point => point.sell),
          borderColor: '#16a085',
          backgroundColor: 'rgba(22,160,133,0.08)',
          tension: 0.2,
          pointRadius: aggregatePoints.value.length > 60 ? 0 : 2,
          pointHoverRadius: 5,
          spanGaps: false,
        },
      ],
    }
  }
  return {
    labels: preparedHouseChart.value.labels.map(formatLabel),
    datasets: preparedHouseChart.value.series.map(series => {
      const anomalyDates = new Set(series.anomalies.map(anomaly => anomaly.at))
      const color = houseColor(series.origin)
      return {
        origin: series.origin,
        label: series.houseName,
        data: series.data,
        borderColor: color,
        backgroundColor: color,
        borderWidth: 1.6,
        tension: 0.12,
        pointRadius: preparedHouseChart.value.labels.map(at =>
          !hideAnomalies.value && anomalyDates.has(at) ? 5 : 0
        ),
        pointHoverRadius: 5,
        pointBackgroundColor: preparedHouseChart.value.labels.map(at =>
          anomalyDates.has(at) ? '#d64545' : color
        ),
        pointBorderColor: preparedHouseChart.value.labels.map(at =>
          anomalyDates.has(at) ? '#ffffff' : color
        ),
        pointBorderWidth: preparedHouseChart.value.labels.map(at =>
          anomalyDates.has(at) ? 1.5 : 0
        ),
        spanGaps: false,
        hidden: hiddenHouseSet.value.has(series.origin),
      }
    }),
  }
})

const commonChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: false as const,
  interaction: {
    mode: (chartMode.value === 'houses' ? 'nearest' : 'index') as 'nearest' | 'index',
    intersect: false,
  },
  plugins: {
    legend: {
      display: chartMode.value === 'average',
      position: 'top' as const,
      labels: { color: axisColor.value, usePointStyle: true, padding: 14 },
    },
    tooltip: {
      mode: (chartMode.value === 'houses' ? 'nearest' : 'index') as 'nearest' | 'index',
      intersect: false,
    },
  },
  scales: {
    x: {
      ticks: { color: axisColor.value, maxTicksLimit: 12 },
      grid: { color: gridColor.value },
    },
    y: {
      ticks: {
        color: axisColor.value,
        callback: (value: string | number) =>
          typeof value === 'number' ? formatUYU(value) : value,
      },
      grid: { color: gridColor.value },
    },
  },
}))
const ratesChartOptions = commonChartOptions

const powerChartData = computed(() => ({
  labels: labels.value,
  datasets: [
    {
      label: `${displayCurrency.value} · ${t('rateAnalytics.buyingPower')}`,
      data: aggregatePoints.value.map(point => point.purchasingPower),
      borderColor: '#9b59b6',
      backgroundColor: 'rgba(155,89,182,0.10)',
      fill: true,
      tension: 0.2,
      pointRadius: aggregatePoints.value.length > 60 ? 0 : 2,
      pointHoverRadius: 5,
      spanGaps: false,
    },
  ],
}))
const powerChartOptions = computed(() => ({
  ...commonChartOptions.value,
  plugins: {
    ...commonChartOptions.value.plugins,
    legend: { display: false },
  },
  scales: {
    ...commonChartOptions.value.scales,
    y: {
      ...commonChartOptions.value.scales.y,
      ticks: {
        color: axisColor.value,
        callback: (value: string | number) =>
          typeof value === 'number' ? formatForeign(value) : value,
      },
    },
  },
}))

const ratesChartKey = computed(
  () =>
    `${analytics.value?.asOf}-${chartMode.value}-${houseSide.value}-${
      hideAnomalies.value ? 'clean' : 'raw'
    }-${hiddenHouseOrigins.value.slice().sort().join('.')}-${dark.value ? 'dark' : 'light'}`
)
const powerChartKey = computed(
  () =>
    `${analytics.value?.asOf}-${uyuBudget.value}-${hideAnomalies.value ? 'clean' : 'raw'}-${
      dark.value ? 'dark' : 'light'
    }`
)
const chartRangeLabel = computed(() => {
  if (!analytics.value) return ''
  return `${formatDateTime(analytics.value.from)} — ${formatDateTime(analytics.value.to)} · ${
    analytics.value.series.length
  } ${t('rateAnalytics.housesCount')}`
})
const coverageNotice = computed(() => {
  if (!analytics.value?.intradayCoverageStart || analytics.value.interval !== 'hour') return ''
  const coverage = new Date(analytics.value.intradayCoverageStart)
  const from = new Date(analytics.value.from)
  if (coverage <= from) return ''
  return t('rateAnalytics.coverageNotice', { date: formatDateTime(coverage.toISOString()) })
})

const formatUYU = (value?: number | null) =>
  typeof value === 'number' && Number.isFinite(value)
    ? new Intl.NumberFormat(locale.value, {
        style: 'currency',
        currency: 'UYU',
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      }).format(value)
    : '—'
const formatForeign = (value?: number | null) =>
  typeof value === 'number' && Number.isFinite(value)
    ? `${new Intl.NumberFormat(locale.value, { maximumFractionDigits: 2 }).format(value)} ${
        displayCurrency.value
      }`
    : '—'
const formatPct = (value: number) =>
  `${value > 0 ? '+' : ''}${new Intl.NumberFormat(locale.value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}%`
const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Montevideo',
  }).format(new Date(value))
const branchCount = (origin: string) => {
  return eligibleBranches.value.filter(branch => branch.origin === origin).length
}

const canonical = 'https://cambio-uruguay.com/analiticas'
useSeoMeta({
  title: () => t('rateAnalytics.metaTitle'),
  description: () => t('rateAnalytics.metaDescription'),
  ogTitle: () => t('rateAnalytics.metaTitle'),
  ogDescription: () => t('rateAnalytics.metaDescription'),
  ogType: 'website',
  ogUrl: canonical,
  twitterCard: 'summary_large_image',
})
useHead({ link: [{ rel: 'canonical', href: canonical }] })
defineOgImageComponent('Cambio', {
  title: () => t('rateAnalytics.title'),
  subtitle: () => t('rateAnalytics.subtitle'),
  tag: 'ANALÍTICAS',
})
</script>

<style scoped>
.analytics-page {
  max-width: 1320px;
}

.analytics-hero-card {
  border: 1px solid rgba(184, 243, 230, 0.16);
}

.analytics-hero {
  position: relative;
  isolation: isolate;
  background:
    radial-gradient(circle at 78% 18%, rgba(30, 194, 160, 0.2), transparent 32%),
    linear-gradient(135deg, #102a43 0%, #144e68 58%, #11695d 100%);
}

.analytics-hero__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 0.72fr);
  gap: 32px;
  align-items: end;
}

.analytics-hero__eyebrow {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #b8f3e6;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.analytics-hero__pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f5b942;
  box-shadow: 0 0 0 5px rgba(245, 185, 66, 0.14);
}

.analytics-hero h1 {
  letter-spacing: -0.035em;
}

.analytics-hero__board {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid rgba(184, 243, 230, 0.24);
  border-radius: 12px;
  background: rgba(6, 26, 42, 0.54);
  backdrop-filter: blur(8px);
}

.analytics-hero__board > div {
  min-width: 0;
  padding: 13px 14px;
}

.analytics-hero__board > div + div {
  border-inline-start: 1px solid rgba(184, 243, 230, 0.18);
}

.analytics-hero__board span,
.analytics-hero__board strong {
  display: block;
}

.analytics-hero__board span {
  color: rgba(231, 250, 246, 0.68);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.analytics-hero__board strong {
  overflow: hidden;
  margin-top: 4px;
  color: #fff;
  font-family: ui-monospace, 'Cascadia Mono', 'SFMono-Regular', Consolas, monospace;
  font-size: 0.88rem;
  font-variant-numeric: tabular-nums;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.analytics-panel {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-surface));
}

.analytics-filter-panel {
  border-top: 3px solid rgba(var(--v-theme-primary), 0.72);
}

.market-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}

.market-summary__item {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 12px;
  padding: 17px 18px;
}

.market-summary__item + .market-summary__item {
  border-inline-start: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.market-summary__icon {
  display: grid;
  flex: 0 0 36px;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 9px;
  background: rgba(var(--v-theme-primary), 0.11);
  color: rgb(var(--v-theme-primary));
}

.market-summary__icon--sell,
.market-summary__icon--up {
  background: rgba(var(--v-theme-success), 0.11);
  color: rgb(var(--v-theme-success));
}

.market-summary__icon--down {
  background: rgba(var(--v-theme-error), 0.1);
  color: rgb(var(--v-theme-error));
}

.market-summary__icon--power {
  background: rgba(155, 89, 182, 0.12);
  color: #b57bd3;
}

.market-summary__label {
  overflow: hidden;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.market-summary__value {
  overflow: hidden;
  margin-top: 3px;
  font-family: ui-monospace, 'Cascadia Mono', 'SFMono-Regular', Consolas, monospace;
  font-size: clamp(1rem, 1.8vw, 1.32rem);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.analytics-chart {
  height: 410px;
  min-height: 320px;
}

.analytics-chart--power {
  height: 320px;
}

.series-reference {
  padding-top: 20px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.series-reference__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.series-reference__controls {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}

.anomaly-report {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  margin-top: 16px;
  padding: 14px 16px;
  border: 1px solid rgba(var(--v-theme-warning), 0.36);
  border-radius: 12px;
  background: rgba(var(--v-theme-warning), 0.08);
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.82rem;
  line-height: 1.5;
}

.anomaly-report__icon {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 9px;
  background: rgba(var(--v-theme-warning), 0.16);
  color: rgb(var(--v-theme-warning));
}

.anomaly-report p {
  color: rgba(var(--v-theme-on-surface), 0.68);
}

.anomaly-report ul {
  display: grid;
  gap: 5px;
  margin: 0;
  padding-inline-start: 18px;
}

.anomaly-report li {
  padding-inline-start: 2px;
}

.series-reference__table-wrap {
  overflow: auto;
  max-height: 390px;
  margin-top: 16px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
}

.series-reference__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
  font-variant-numeric: tabular-nums;
}

.series-reference__table th,
.series-reference__table td {
  padding: 9px 10px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  text-align: start;
  white-space: nowrap;
}

.series-reference__table th {
  position: sticky;
  z-index: 1;
  top: 0;
  background: rgb(var(--v-theme-surface));
  color: rgba(var(--v-theme-on-surface), 0.64);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.045em;
  text-transform: uppercase;
}

.series-reference__table tbody tr:last-child td {
  border-bottom: 0;
}

.series-reference__table tbody tr {
  transition:
    background-color 140ms ease,
    opacity 140ms ease;
}

.series-reference__table tbody tr:hover {
  background: rgba(var(--v-theme-primary), 0.045);
}

.series-reference__row--hidden {
  opacity: 0.46;
}

.series-reference__house {
  color: rgb(var(--v-theme-on-surface));
  font-weight: 650;
}

.series-swatch {
  display: inline-block;
  flex: 0 0 auto;
  width: 12px;
  height: 12px;
  border: 2px solid rgba(var(--v-theme-on-surface), 0.24);
  border-radius: 3px;
  vertical-align: -1px;
}

.anomaly-report .series-swatch {
  margin-inline-end: 6px;
}

.series-reference__actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
}

.series-reference__actions-icon {
  display: none;
}

.series-reference__only {
  gap: 4px;
}

.house-link {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
  text-decoration: none;
}

.house-link:hover {
  text-decoration: underline;
}

.analytics-table th {
  white-space: nowrap;
}

.analytics-category {
  display: inline-block;
  padding: 2px 6px;
  border: 1px solid rgba(var(--v-theme-primary), 0.24);
  border-radius: 5px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.62rem;
  font-weight: 700;
  vertical-align: middle;
}

@media (max-width: 960px) {
  .analytics-hero__grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .market-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .market-summary__item:nth-child(3) {
    border-inline-start: 0;
  }

  .market-summary__item:nth-child(n + 3) {
    border-block-start: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }
}

@media (max-width: 600px) {
  .analytics-page {
    padding-inline: 12px !important;
  }

  .analytics-hero__board > div {
    padding: 11px 9px;
  }

  .analytics-hero__board span {
    font-size: 0.55rem;
    letter-spacing: 0.06em;
  }

  .analytics-hero__board strong {
    font-size: 0.75rem;
  }

  .market-summary {
    grid-template-columns: 1fr;
  }

  .market-summary__item {
    padding: 14px;
  }

  .market-summary__item + .market-summary__item {
    border-block-start: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    border-inline-start: 0;
  }

  .market-summary__item:nth-child(3) {
    border-block-start: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }

  .market-summary__value {
    font-size: 1.08rem;
  }

  .analytics-actions .v-btn {
    width: 100%;
  }

  .analytics-controls {
    width: 100%;
    align-items: stretch;
    flex-direction: column;
  }

  .analytics-controls .v-btn-toggle {
    display: flex;
    width: 100%;
  }

  .analytics-controls .v-btn {
    flex: 1 1 0;
    min-width: 0;
    padding-inline: 8px;
    font-size: 0.72rem;
  }

  .analytics-chart {
    height: 340px;
  }

  .analytics-chart--power {
    height: 290px;
  }

  .series-reference__heading {
    align-items: stretch;
    flex-direction: column;
    gap: 12px;
  }

  .series-reference__controls {
    justify-content: space-between;
  }

  .series-reference__controls .v-switch {
    min-width: 0;
  }

  .anomaly-report {
    grid-template-columns: 1fr;
    padding: 13px;
  }

  .series-reference__table th,
  .series-reference__table td {
    padding: 8px 7px;
  }

  .series-reference__optional {
    display: none;
  }

  .series-reference__actions-label,
  .series-reference__only-label {
    display: none;
  }

  .series-reference__actions-icon {
    display: inline-flex;
  }

  .series-reference__only {
    min-width: 28px !important;
    padding-inline: 4px !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  .analytics-hero__pulse {
    box-shadow: none;
  }
}
</style>
