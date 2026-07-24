<template>
  <VContainer class="py-6 analytics-page">
    <VCard class="overflow-hidden mb-5" elevation="8">
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

    <VCard class="pa-4 pa-md-6 mb-5" elevation="3">
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

      <VRow dense>
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
            v-model="selectedDepartment"
            :items="departmentOptions"
            :label="t('rateAnalytics.department')"
            clearable
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" md="8">
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
            <template #selection="{ item, index }">
              <VChip
                v-if="index < 2"
                size="small"
                closable
                @click:close="removeOrigin(String(item.value))"
              >
                {{ item.title }}
              </VChip>
              <span v-else-if="index === 2" class="text-caption text-medium-emphasis">
                +{{ selectedOrigins.length - 2 }}
              </span>
            </template>
          </VAutocomplete>
        </VCol>
        <VCol cols="12">
          <VAutocomplete
            v-model="selectedBranches"
            :items="branchOptions"
            :label="t('rateAnalytics.branches')"
            multiple
            chips
            closable-chips
            item-title="title"
            item-value="value"
            variant="outlined"
            density="comfortable"
            hide-details
            :disabled="branchOptions.length === 0"
          >
            <template #selection="{ item, index }">
              <VChip
                v-if="index < 2"
                size="small"
                closable
                @click:close="removeBranch(String(item.value))"
              >
                {{ item.title }}
              </VChip>
              <span v-else-if="index === 2" class="text-caption text-medium-emphasis">
                +{{ selectedBranches.length - 2 }}
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
          :disabled="effectiveOrigins.length === 0"
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
      <VRow dense class="mb-5">
        <VCol cols="12" sm="6" lg="3">
          <VCard class="metric-card pa-4 h-100" variant="flat">
            <div class="text-overline text-medium-emphasis">
              {{ t('rateAnalytics.avgBuy') }}
            </div>
            <div class="text-h5 font-weight-bold text-primary">
              {{ formatUYU(currentAggregate?.buy) }}
            </div>
          </VCard>
        </VCol>
        <VCol cols="12" sm="6" lg="3">
          <VCard class="metric-card pa-4 h-100" variant="flat">
            <div class="text-overline text-medium-emphasis">
              {{ t('rateAnalytics.avgSell') }}
            </div>
            <div class="text-h5 font-weight-bold text-success">
              {{ formatUYU(currentAggregate?.sell) }}
            </div>
          </VCard>
        </VCol>
        <VCol cols="12" sm="6" lg="3">
          <VCard class="metric-card pa-4 h-100" variant="flat">
            <div class="text-overline text-medium-emphasis">
              {{ t('rateAnalytics.periodChange') }}
            </div>
            <div
              class="text-h5 font-weight-bold"
              :class="periodChange >= 0 ? 'text-success' : 'text-error'"
            >
              {{ formatPct(periodChange) }}
            </div>
          </VCard>
        </VCol>
        <VCol cols="12" sm="6" lg="3">
          <VCard class="metric-card pa-4 h-100" variant="flat">
            <div class="text-overline text-medium-emphasis">
              {{ t('rateAnalytics.buyingPower') }}
            </div>
            <div class="text-h5 font-weight-bold">
              {{ formatForeign(currentAggregate?.purchasingPower) }}
            </div>
          </VCard>
        </VCol>
      </VRow>

      <VCard class="pa-4 pa-md-6 mb-5" elevation="3">
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
        <p
          v-if="chartMode === 'houses' && analytics.series.length > 12"
          class="text-caption text-medium-emphasis mt-3 mb-0"
        >
          {{ t('rateAnalytics.legendHint') }}
        </p>
      </VCard>

      <VCard class="pa-4 pa-md-6 mb-5" elevation="3">
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

      <VCard class="pa-4 pa-md-6" elevation="3">
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
import { aggregateRateSeries, summarizeAnalyticsHouses } from '~/utils/rateAnalytics'

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
const heroPeriodLabel = computed(
  () => periodOptions.value.find(option => option.value === selectedPeriod.value)?.title || ''
)
const heroIntervalLabel = computed(
  () => intervalOptions.value.find(option => option.value === selectedInterval.value)?.title || ''
)

const selectedCurrency = ref('USD')
const selectedPeriod = ref(1)
const selectedInterval = ref<RateAnalyticsInterval>('hour')
const selectedDepartment = ref<string | null>(null)
const selectedOrigins = ref<string[]>([])
const selectedBranches = ref<string[]>([])
const uyuBudget = ref(10_000)
const chartMode = ref<'average' | 'houses'>('average')
const houseSide = ref<'buy' | 'sell'>('sell')

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
const branchOptions = computed(() =>
  eligibleBranches.value
    .map(branch => ({
      title: [branch.name || branch.address || branch.id, branch.locality || branch.dept]
        .filter(Boolean)
        .join(' · '),
      value: branch.key,
    }))
    .sort((a, b) => a.title.localeCompare(b.title, locale.value))
)
const branchFilterActive = computed(
  () =>
    branchOptions.value.length > 0 && selectedBranches.value.length !== branchOptions.value.length
)
const effectiveOrigins = computed(() => {
  if (!branchFilterActive.value) return selectedOrigins.value
  const selected = new Set(selectedBranches.value)
  return [
    ...new Set(
      eligibleBranches.value.filter(branch => selected.has(branch.key)).map(branch => branch.origin)
    ),
  ]
})

const selectAllForCurrentFilters = () => {
  selectedOrigins.value = originOptions.value.map(option => option.value)
  nextTick(() => {
    selectedBranches.value = branchOptions.value.map(option => option.value)
  })
}
const removeOrigin = (origin: string) => {
  selectedOrigins.value = selectedOrigins.value.filter(value => value !== origin)
}
const removeBranch = (branch: string) => {
  selectedBranches.value = selectedBranches.value.filter(value => value !== branch)
}

if (analytics.value) selectAllForCurrentFilters()

watch([selectedCurrency, selectedDepartment], () => {
  if (selectedPeriod.value > 31) selectedInterval.value = 'day'
  selectAllForCurrentFilters()
})
watch(selectedOrigins, () => {
  selectedBranches.value = branchOptions.value.map(option => option.value)
})
watch(selectedPeriod, days => {
  if (days > 31) selectedInterval.value = 'day'
})

const applyFilters = () => {
  const days = selectedPeriod.value
  const interval = days > 31 ? 'day' : selectedInterval.value
  selectedInterval.value = interval
  appliedQuery.value = makeQuery(selectedCurrency.value, days, interval, effectiveOrigins.value)
}

const resetFilters = () => {
  selectedCurrency.value = 'USD'
  selectedPeriod.value = 1
  selectedInterval.value = 'hour'
  selectedDepartment.value = null
  uyuBudget.value = 10_000
  chartMode.value = 'average'
  houseSide.value = 'sell'
  nextTick(() => {
    selectAllForCurrentFilters()
    nextTick(applyFilters)
  })
}

const aggregatePoints = computed(() =>
  aggregateRateSeries(analytics.value?.series ?? [], Number(uyuBudget.value) || 0)
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
  summarizeAnalyticsHouses(analytics.value?.series ?? [], Number(uyuBudget.value) || 0)
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
const houseColor = (index: number) => {
  const hue = (index * 47 + 205) % 360
  return `hsl(${hue} 68% ${dark.value ? 62 : 42}%)`
}

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
          spanGaps: true,
        },
        {
          label: t('rateAnalytics.avgSell'),
          data: aggregatePoints.value.map(point => point.sell),
          borderColor: '#16a085',
          backgroundColor: 'rgba(22,160,133,0.08)',
          tension: 0.2,
          pointRadius: aggregatePoints.value.length > 60 ? 0 : 2,
          pointHoverRadius: 5,
          spanGaps: true,
        },
      ],
    }
  }
  return {
    labels: labels.value,
    datasets: (analytics.value?.series ?? []).map((series, index) => ({
      label: series.houseName,
      data: series.points.map(point => point[houseSide.value]),
      borderColor: houseColor(index),
      backgroundColor: houseColor(index),
      borderWidth: 1.5,
      tension: 0.15,
      pointRadius: 0,
      pointHoverRadius: 4,
      spanGaps: true,
    })),
  }
})

const commonChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: false as const,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: {
      display: chartMode.value === 'average' || (analytics.value?.series.length ?? 0) <= 12,
      position: 'top' as const,
      labels: { color: axisColor.value, usePointStyle: true, padding: 14 },
    },
    tooltip: { mode: 'index' as const, intersect: false },
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
      spanGaps: true,
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
    `${analytics.value?.asOf}-${chartMode.value}-${houseSide.value}-${dark.value ? 'dark' : 'light'}`
)
const powerChartKey = computed(
  () => `${analytics.value?.asOf}-${uyuBudget.value}-${dark.value ? 'dark' : 'light'}`
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
  const selected = new Set(selectedBranches.value)
  const branches = eligibleBranches.value.filter(branch => branch.origin === origin)
  return branchFilterActive.value
    ? branches.filter(branch => selected.has(branch.key)).length
    : branches.length
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
.analytics-hero {
  position: relative;
  isolation: isolate;
  background:
    linear-gradient(rgba(73, 173, 215, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(73, 173, 215, 0.08) 1px, transparent 1px),
    radial-gradient(circle at 78% 18%, rgba(30, 194, 160, 0.2), transparent 32%),
    linear-gradient(135deg, #102a43 0%, #144e68 58%, #11695d 100%);
  background-size:
    28px 28px,
    28px 28px,
    auto,
    auto;
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
  font-family: 'Roboto Mono', 'SFMono-Regular', Consolas, monospace;
  font-size: 0.88rem;
  font-variant-numeric: tabular-nums;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: linear-gradient(
    145deg,
    rgba(var(--v-theme-surface), 1),
    rgba(var(--v-theme-surface-variant), 0.32)
  );
}

.analytics-chart {
  height: 410px;
  min-height: 320px;
}

.analytics-chart--power {
  height: 320px;
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

@media (max-width: 960px) {
  .analytics-hero__grid {
    grid-template-columns: 1fr;
    gap: 24px;
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

  .analytics-actions .v-btn {
    width: 100%;
  }

  .analytics-controls {
    width: 100%;
    overflow-x: auto;
    padding-bottom: 4px;
    scrollbar-width: thin;
  }

  .analytics-controls .v-btn-toggle {
    flex: 0 0 auto;
  }

  .analytics-chart {
    height: 340px;
  }

  .analytics-chart--power {
    height: 290px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .analytics-hero__pulse {
    box-shadow: none;
  }
}
</style>
