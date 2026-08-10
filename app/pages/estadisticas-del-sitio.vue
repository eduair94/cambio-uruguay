<!--
  /estadisticas-del-sitio — the site's own traffic, in public.

  Same spirit as /estado (which publishes whether the scrapers are actually working): if we ask
  people to trust the rates, the least we can do is show how many people read them and where they
  come from. Data: /api/site-analytics, one aggregate document written daily from the GA4 Data API
  by the backend job `currency-site-analytics` (docs/analytics/GA4_DATA_API.md).

  Nothing here is per-visitor. Totals, whole days, top-N lists — and page paths arrive without their
  query string, so a term typed into /buscar can never surface on this page.
-->
<template>
  <VContainer class="site-stats py-6">
    <VCard class="overflow-hidden mb-5" elevation="4">
      <div class="site-stats__hero on-dark pa-6 pa-md-8">
        <div class="site-stats__hero-grid">
          <div>
            <div class="site-stats__eyebrow mb-3">
              <span class="site-stats__pulse" aria-hidden="true" />
              {{ t('siteStats.eyebrow') }}
            </div>
            <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-2">
              {{ t('siteStats.title') }}
            </h1>
            <p class="text-body-1 text-grey-lighten-2 mb-0">{{ t('siteStats.subtitle') }}</p>
          </div>
          <div v-if="snapshot" class="site-stats__board">
            <div>
              <span>{{ t('siteStats.window') }}</span>
              <strong>{{ rangeLabel }}</strong>
            </div>
            <div>
              <span>{{ t('siteStats.updated') }}</span>
              <strong>{{ updatedLabel }}</strong>
            </div>
            <div>
              <span>{{ t('siteStats.source') }}</span>
              <strong>Google Analytics 4</strong>
            </div>
          </div>
        </div>
      </div>
    </VCard>

    <!-- Ahora mismo: the only live part of the page. Hidden entirely when nobody is on the site
         (or GA4 is not wired up), because "0 personas ahora" is a worse answer than no card. -->
    <VCard v-if="live" variant="outlined" class="pa-4 pa-md-5 mb-5 live-card">
      <div class="live-grid">
        <div class="live-headline">
          <div class="site-stats__eyebrow live-eyebrow mb-2">
            <span class="site-stats__pulse" aria-hidden="true" />
            {{ t('siteStats.liveNow') }}
          </div>
          <div class="d-flex align-baseline ga-2">
            <span class="text-h4 font-weight-bold">{{
              formatCount(live.activeUsers, locale)
            }}</span>
            <span class="text-body-2 text-medium-emphasis">{{ t('siteStats.liveUsers') }}</span>
          </div>
          <div class="text-caption text-medium-emphasis mt-1">{{ liveAgeLabel }}</div>
        </div>

        <div class="live-spark" role="img" :aria-label="t('siteStats.liveSparkAria')">
          <div class="live-spark__bars">
            <span
              v-for="(height, i) in sparkHeights"
              :key="i"
              class="live-spark__bar"
              :style="{ height: `${Math.max(4, height * 100)}%` }"
            />
          </div>
          <div class="live-spark__axis text-caption text-medium-emphasis">
            <span>{{ t('siteStats.liveMinutesAgo', { n: 30 }) }}</span>
            <span>{{ t('siteStats.liveNowShort') }}</span>
          </div>
        </div>

        <div v-if="live.pages.length" class="live-pages">
          <div class="text-caption text-medium-emphasis mb-2">{{ t('siteStats.liveReading') }}</div>
          <div v-for="page in live.pages.slice(0, 5)" :key="page.title" class="live-page-row">
            <span class="live-page-row__title text-body-2">{{ page.title }}</span>
            <span class="live-page-row__count text-body-2 font-weight-bold">
              {{ formatCount(page.activeUsers, locale) }}
            </span>
          </div>
        </div>
      </div>
    </VCard>

    <div v-if="pending" class="text-center py-12">
      <VProgressCircular indeterminate color="primary" size="48" />
    </div>

    <VAlert
      v-else-if="!snapshot"
      type="info"
      variant="tonal"
      class="mb-5"
      :title="t('siteStats.empty.title')"
    >
      {{ t('siteStats.empty.body') }}
    </VAlert>

    <template v-else>
      <VAlert
        v-if="stale"
        type="warning"
        variant="tonal"
        density="comfortable"
        class="mb-5"
        icon="mdi-clock-alert-outline"
      >
        {{ t('siteStats.staleWarning', { date: updatedLabel }) }}
      </VAlert>

      <!-- KPI row: each metric against the equally long window before it -->
      <VRow dense class="mb-2">
        <VCol v-for="metric in metrics" :key="metric.key" cols="6" md="4" lg="2">
          <VCard variant="outlined" class="pa-3 h-100 kpi-card">
            <div class="d-flex align-center justify-space-between mb-1">
              <VIcon :icon="metric.icon" size="small" class="text-medium-emphasis" />
              <VChip
                v-if="metric.deltaPct !== null"
                :color="deltaColor(metric.direction)"
                size="x-small"
                variant="tonal"
                class="font-weight-bold"
              >
                {{ formatDelta(metric.deltaPct, locale) }}
              </VChip>
            </div>
            <div class="text-h6 font-weight-bold">{{ metricValue(metric) }}</div>
            <div class="text-caption text-medium-emphasis">
              {{ t(`siteStats.metric.${metric.key}`) }}
            </div>
          </VCard>
        </VCol>
      </VRow>

      <p class="text-caption text-medium-emphasis mb-5">
        {{ t('siteStats.comparedTo', { start: previousStart, end: previousEnd }) }}
      </p>

      <!-- Trend -->
      <VCard variant="outlined" class="pa-4 pa-md-5 mb-5">
        <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-4">
          <div>
            <h2 class="text-h6 font-weight-bold mb-1">{{ t('siteStats.trendTitle') }}</h2>
            <p class="text-body-2 text-medium-emphasis mb-0">{{ t('siteStats.trendHint') }}</p>
          </div>
          <div class="d-flex flex-wrap ga-2">
            <VBtnToggle
              v-model="chartMetric"
              mandatory
              density="comfortable"
              variant="outlined"
              divided
            >
              <VBtn value="activeUsers">{{ t('siteStats.metric.activeUsers') }}</VBtn>
              <VBtn value="sessions">{{ t('siteStats.metric.sessions') }}</VBtn>
              <VBtn value="screenPageViews">{{ t('siteStats.metric.screenPageViews') }}</VBtn>
            </VBtnToggle>
            <VBtnToggle
              v-model="chartDays"
              mandatory
              density="comfortable"
              variant="outlined"
              divided
            >
              <VBtn :value="30">30 d</VBtn>
              <VBtn :value="90">90 d</VBtn>
            </VBtnToggle>
          </div>
        </div>

        <div class="site-stats__chart">
          <ClientOnly>
            <LineChart
              :key="`${chartMetric}-${chartDays}`"
              :chart-data="chartData"
              :options="chartOptions"
              :aria-label="t('siteStats.chartAria')"
            />
            <template #fallback>
              <VSkeletonLoader type="image" />
            </template>
          </ClientOnly>
        </div>

        <p v-if="peak" class="text-body-2 text-medium-emphasis mb-0 mt-3">
          {{
            t('siteStats.peak', {
              date: formatDay(peak.date, locale),
              users: formatCount(peak.activeUsers, locale),
            })
          }}
        </p>
      </VCard>

      <!-- Top pages -->
      <VCard variant="outlined" class="pa-4 pa-md-5 mb-5">
        <h2 class="text-h6 font-weight-bold mb-1">{{ t('siteStats.pagesTitle') }}</h2>
        <p class="text-body-2 text-medium-emphasis mb-4">{{ t('siteStats.pagesHint') }}</p>

        <VTable density="comfortable" class="cu-mobile-cards stats-table">
          <thead>
            <tr>
              <th>{{ t('siteStats.table.page') }}</th>
              <th class="text-right">{{ t('siteStats.table.views') }}</th>
              <th class="text-right">{{ t('siteStats.table.users') }}</th>
              <th class="text-right">{{ t('siteStats.table.time') }}</th>
              <th>{{ t('siteStats.table.share') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="page in snapshot.topPages" :key="page.path">
              <td :data-label="t('siteStats.table.page')">
                <NuxtLink :to="page.path" class="stats-link">{{ pageLabel(page) }}</NuxtLink>
                <div class="text-caption text-medium-emphasis">{{ page.path }}</div>
              </td>
              <td :data-label="t('siteStats.table.views')" class="text-right">
                {{ formatCount(page.views, locale) }}
              </td>
              <td :data-label="t('siteStats.table.users')" class="text-right">
                {{ formatCount(page.users, locale) }}
              </td>
              <td :data-label="t('siteStats.table.time')" class="text-right">
                {{ formatDuration(page.avgEngagementSeconds, durationUnits) }}
              </td>
              <td :data-label="t('siteStats.table.share')" class="share-cell">
                <VProgressLinear
                  :model-value="pageShare(page, snapshot.totals) * 100"
                  color="primary"
                  height="8"
                  rounded
                />
                <span class="text-caption text-medium-emphasis">
                  {{ formatPercent(pageShare(page, snapshot.totals), locale) }}
                </span>
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCard>

      <!-- Breakdowns -->
      <VRow dense class="mb-5">
        <VCol v-for="group in breakdowns" :key="group.key" cols="12" md="4">
          <VCard variant="outlined" class="pa-4 h-100">
            <h2 class="text-subtitle-1 font-weight-bold mb-1">
              <VIcon :icon="group.icon" size="small" class="mr-1" />
              {{ t(`siteStats.breakdown.${group.key}`) }}
            </h2>
            <p class="text-caption text-medium-emphasis mb-3">
              {{ t(`siteStats.breakdownHint.${group.key}`) }}
            </p>
            <div v-if="!group.rows.length" class="text-body-2 text-medium-emphasis">
              {{ t('siteStats.noData') }}
            </div>
            <div v-for="row in group.rows" :key="row.label" class="share-row">
              <div class="d-flex align-center justify-space-between ga-2">
                <span class="text-body-2">{{ group.translate(row.label) }}</span>
                <span class="text-body-2 font-weight-bold">
                  {{ formatPercent(row.share, locale, 0) }}
                </span>
              </div>
              <VProgressLinear
                :model-value="row.share * 100"
                :color="group.color"
                height="6"
                rounded
                class="mt-1"
              />
            </div>
          </VCard>
        </VCol>
      </VRow>

      <!-- Events -->
      <VCard variant="outlined" class="pa-4 pa-md-5 mb-5">
        <h2 class="text-h6 font-weight-bold mb-1">{{ t('siteStats.eventsTitle') }}</h2>
        <p class="text-body-2 text-medium-emphasis mb-4">{{ t('siteStats.eventsHint') }}</p>

        <VTable density="comfortable" class="cu-mobile-cards stats-table">
          <thead>
            <tr>
              <th>{{ t('siteStats.table.event') }}</th>
              <th class="text-right">{{ t('siteStats.table.count') }}</th>
              <th class="text-right">{{ t('siteStats.table.users') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in snapshot.events" :key="row.name">
              <td :data-label="t('siteStats.table.event')">
                <code class="event-name">{{ row.name }}</code>
                <VChip
                  v-if="isKeyEvent(row.name)"
                  size="x-small"
                  color="success"
                  variant="tonal"
                  class="ml-2"
                >
                  {{ t('siteStats.keyEvent') }}
                </VChip>
                <VChip
                  v-else-if="isAutomaticEvent(row.name)"
                  size="x-small"
                  variant="tonal"
                  class="ml-2"
                >
                  {{ t('siteStats.autoEvent') }}
                </VChip>
              </td>
              <td :data-label="t('siteStats.table.count')" class="text-right">
                {{ formatCount(row.count, locale) }}
              </td>
              <td :data-label="t('siteStats.table.users')" class="text-right">
                {{ formatCount(row.users, locale) }}
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCard>

      <!-- How this is measured -->
      <VCard variant="outlined" class="pa-4 pa-md-5">
        <h2 class="text-h6 font-weight-bold mb-3">{{ t('siteStats.methodTitle') }}</h2>
        <ul class="method-list">
          <li v-for="(item, i) in methodItems" :key="i" class="text-body-2">{{ item }}</li>
        </ul>
        <div class="d-flex flex-wrap ga-2 mt-4">
          <VBtn
            :to="localePath('/privacidad')"
            variant="tonal"
            size="small"
            prepend-icon="mdi-shield-lock-outline"
          >
            {{ t('siteStats.privacyLink') }}
          </VBtn>
          <VBtn
            :to="localePath('/estado')"
            variant="text"
            size="small"
            prepend-icon="mdi-heart-pulse"
          >
            {{ t('siteStats.estadoLink') }}
          </VBtn>
          <VBtn
            :to="localePath('/desarrolladores')"
            variant="text"
            size="small"
            prepend-icon="mdi-api"
          >
            {{ t('siteStats.devLink') }}
          </VBtn>
        </div>
      </VCard>
    </template>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useTheme } from 'vuetify'
// Explicit: components/charts/ is not auto-imported flat, so `<LineChart>` would render as an
// unknown element (silently — no console error, just an empty box where the chart should be).
import LineChart from '~/components/charts/LineChart.vue'
import {
  formatCount,
  formatDay,
  formatDelta,
  formatDuration,
  formatPercent,
  isAutomaticEvent,
  isKeyEvent,
  movingAverage,
  pageLabel,
  pageShare,
  seriesSlice,
  summaryMetrics,
  busiestDay,
  isStale,
  hasLiveActivity,
  realtimeAgeSeconds,
  sparklineHeights,
  type TrendDirection,
  type RealtimeSnapshot,
  type SiteAnalyticsSnapshot,
  type SummaryMetric,
} from '~/utils/siteAnalytics'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const theme = useTheme()

// Not lazy: the numbers are the page, so they must be in the server-rendered HTML — the endpoint is
// cached for an hour and the document is a few KB.
const { data, pending } = await useFetch<SiteAnalyticsSnapshot | null>('/api/site-analytics')
const snapshot = computed(() => data.value || null)

// The live half. Also resolved on the server so the panel is in the first paint (the backend caches
// it 45 s, this route 30 s, so an SSR hit is cheap), then refreshed on a timer from the client.
const { data: realtimeData, refresh: refreshRealtime } = await useFetch<RealtimeSnapshot | null>(
  '/api/site-analytics-realtime'
)
const live = computed(() => (hasLiveActivity(realtimeData.value) ? realtimeData.value : null))
const sparkHeights = computed(() => sparklineHeights(live.value?.perMinute || []))

// Ticks the "hace X s" label without re-fetching. Kept in a ref (not Date.now() inside a computed)
// so the value is deterministic during SSR and only starts moving once mounted.
const clock = ref<Date | null>(null)
const liveAge = computed(() =>
  live.value && clock.value ? realtimeAgeSeconds(live.value.asOf, clock.value) : 0
)
// Past a minute and a half, seconds stop being information ("hace 36.797 s" is just noise).
const liveAgeLabel = computed(() =>
  liveAge.value < 90
    ? t('siteStats.liveAgeSeconds', { n: liveAge.value })
    : t('siteStats.liveAgeMinutes', { n: Math.round(liveAge.value / 60) })
)

const REFRESH_MS = 60_000
let refreshTimer: ReturnType<typeof setInterval> | undefined
let clockTimer: ReturnType<typeof setInterval> | undefined

function onVisibilityChange() {
  // A background tab must not keep polling; coming back should show something current immediately
  // rather than up-to-a-minute-old numbers under a "live" badge.
  if (document.visibilityState === 'visible') void refreshRealtime()
}

onMounted(() => {
  clock.value = new Date()
  clockTimer = setInterval(() => {
    clock.value = new Date()
  }, 5_000)
  refreshTimer = setInterval(() => {
    if (document.visibilityState === 'visible') void refreshRealtime()
  }, REFRESH_MS)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  if (clockTimer) clearInterval(clockTimer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})

const chartMetric = ref<'activeUsers' | 'sessions' | 'screenPageViews'>('activeUsers')
const chartDays = ref(30)

const stale = computed(() => (snapshot.value ? isStale(snapshot.value.asOf) : false))
const metrics = computed<SummaryMetric[]>(() =>
  snapshot.value ? summaryMetrics(snapshot.value) : []
)

const dateFormatter = computed(
  () => new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short', timeZone: 'UTC' })
)
const formatIsoDay = (day: string) => {
  const [y, m, d] = (day || '').split('-').map(Number)
  if (!y || !m || !d) return day || '—'
  return dateFormatter.value.format(new Date(Date.UTC(y, m - 1, d)))
}

const rangeLabel = computed(() =>
  snapshot.value
    ? `${formatIsoDay(snapshot.value.range.start)} – ${formatIsoDay(snapshot.value.range.end)}`
    : '—'
)
const previousStart = computed(() => formatIsoDay(snapshot.value?.previousRange.start || ''))
const previousEnd = computed(() => formatIsoDay(snapshot.value?.previousRange.end || ''))
const updatedLabel = computed(() => {
  const asOf = snapshot.value?.asOf
  if (!asOf) return '—'
  const at = new Date(asOf)
  return Number.isNaN(at.getTime())
    ? '—'
    : new Intl.DateTimeFormat(locale.value, {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: snapshot.value?.timezone || 'America/Montevideo',
      }).format(at)
})

const durationUnits = computed(() => ({
  min: t('siteStats.unit.min'),
  sec: t('siteStats.unit.sec'),
}))

const series = computed(() => seriesSlice(snapshot.value?.daily || [], chartDays.value))
const peak = computed(() => busiestDay(series.value))

const dark = computed(() => theme.current.value.dark)
const axisColor = computed(() => (dark.value ? '#b8c1cc' : '#536170'))
const gridColor = computed(() => (dark.value ? 'rgba(255,255,255,0.08)' : 'rgba(20,45,70,0.10)'))

const chartData = computed(() => {
  const points = series.value
  const values = points.map(point => point[chartMetric.value])
  return {
    labels: points.map(point => formatIsoDay(point.date)),
    datasets: [
      {
        label: t(`siteStats.metric.${chartMetric.value}`),
        data: values,
        borderColor: '#26a69a',
        backgroundColor: 'rgba(38,166,154,0.14)',
        fill: true,
        tension: 0.25,
        pointRadius: points.length > 45 ? 0 : 2,
        pointHoverRadius: 5,
      },
      {
        // Weekday/weekend swing is bigger than most real movements on a site this size, so the
        // trend the eye should follow is the smoothed one.
        label: t('siteStats.average7'),
        data: movingAverage(values, 7),
        borderColor: '#7e57c2',
        borderDash: [6, 4],
        borderWidth: 2,
        fill: false,
        tension: 0.3,
        pointRadius: 0,
      },
    ],
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: false as const,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: {
      position: 'top' as const,
      labels: { color: axisColor.value, usePointStyle: true, padding: 14 },
    },
    tooltip: { mode: 'index' as const, intersect: false },
  },
  scales: {
    x: { ticks: { color: axisColor.value, maxTicksLimit: 10 }, grid: { color: gridColor.value } },
    y: {
      beginAtZero: true,
      ticks: {
        color: axisColor.value,
        callback: (value: string | number) =>
          typeof value === 'number' ? formatCount(value, locale.value) : value,
      },
      grid: { color: gridColor.value },
    },
  },
}))

/** GA4 answers in English; the three we can actually enumerate get translated, the rest pass through. */
const deviceLabel = (label: string) => {
  const key = label.toLowerCase()
  return ['mobile', 'desktop', 'tablet'].includes(key) ? t(`siteStats.device.${key}`) : label
}

const breakdowns = computed(() => [
  {
    key: 'channels',
    icon: 'mdi-source-branch',
    color: 'primary',
    rows: snapshot.value?.channels || [],
    translate: (label: string) => label,
  },
  {
    key: 'countries',
    icon: 'mdi-earth',
    color: 'teal',
    rows: snapshot.value?.countries || [],
    translate: (label: string) => label,
  },
  {
    key: 'devices',
    icon: 'mdi-cellphone-link',
    color: 'deep-purple',
    rows: snapshot.value?.devices || [],
    translate: deviceLabel,
  },
])

const methodItems = computed(() => [
  t('siteStats.method.source'),
  t('siteStats.method.live'),
  t('siteStats.method.window'),
  t('siteStats.method.aggregate'),
  t('siteStats.method.consent'),
  t('siteStats.method.bare'),
])

function deltaColor(direction: TrendDirection): string {
  return direction === 'up' ? 'success' : direction === 'down' ? 'error' : 'grey'
}

function metricValue(metric: SummaryMetric): string {
  if (metric.format === 'percent') return formatPercent(metric.value, locale.value)
  if (metric.format === 'duration') return formatDuration(metric.value, durationUnits.value)
  return formatCount(metric.value, locale.value)
}

const title = 'Estadísticas del sitio'
const description =
  'Cuánta gente usa cambio-uruguay.com: usuarios, sesiones, páginas más leídas, de dónde llegan y con qué dispositivo. Datos agregados de Google Analytics 4, actualizados todos los días.'
const canonicalUrl = 'https://cambio-uruguay.com/estadisticas-del-sitio'

defineOgImageComponent('Cambio', {
  title: 'Estadísticas del sitio',
  subtitle: 'Cuánta gente lo usa, en público',
  tag: 'TRANSPARENCIA',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
}))
</script>

<style scoped>
/* Same gradient family and accents as /analiticas' hero: the two dashboards are siblings (rates
   analytics vs site analytics) and should read as one product, not two. */
.site-stats__hero {
  position: relative;
  isolation: isolate;
  background:
    radial-gradient(circle at 78% 18%, rgba(30, 194, 160, 0.2), transparent 32%),
    linear-gradient(135deg, #102a43 0%, #144e68 58%, #11695d 100%);
}
.site-stats__hero-grid {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}
.site-stats__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 999px;
  color: #b8f3e6;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.site-stats__pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f5b942;
  box-shadow: 0 0 0 0 rgba(245, 185, 66, 0.7);
  animation: site-stats-pulse 2.2s infinite;
}
@keyframes site-stats-pulse {
  70% {
    box-shadow: 0 0 0 10px rgba(245, 185, 66, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(245, 185, 66, 0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .site-stats__pulse {
    animation: none;
  }
}
.site-stats__board {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px 24px;
}
.site-stats__board span {
  display: block;
  color: rgba(255, 255, 255, 0.65);
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.site-stats__board strong {
  color: #fff;
  font-size: 0.95rem;
}
.kpi-card {
  min-height: 104px;
}
/* Live panel: headline, sparkline and "what they're reading" side by side on desktop, stacked on a
   phone. `minmax(0, …)` on every track — a long page title in the third column would otherwise
   push the grid wider than the card and give the whole page a horizontal scrollbar. */
.live-grid {
  display: grid;
  grid-template-columns: minmax(0, auto) minmax(0, 1fr) minmax(0, 260px);
  align-items: center;
  gap: 20px 28px;
}
.live-eyebrow {
  border-color: rgba(var(--v-theme-primary), 0.35);
  color: rgb(var(--v-theme-primary));
}
.live-spark__bars {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 64px;
}
.live-spark__bar {
  flex: 1 1 0;
  min-width: 2px;
  border-radius: 2px 2px 0 0;
  background: linear-gradient(
    180deg,
    rgb(var(--v-theme-primary)) 0%,
    rgba(var(--v-theme-primary), 0.35) 100%
  );
  transition: height 0.4s ease;
}
@media (prefers-reduced-motion: reduce) {
  .live-spark__bar {
    transition: none;
  }
}
.live-spark__axis {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
}
.live-page-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 3px 0;
}
.live-page-row__title {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
@media (max-width: 959px) {
  .live-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .live-spark__bars {
    height: 48px;
  }
}
.site-stats__chart {
  position: relative;
  /* Fixed 340px left a phone with a chart taller than the text around it; clamp keeps the aspect
     sane from 360px up without letting it collapse on a short viewport. */
  height: clamp(220px, 42vw, 340px);
}
.stats-table :deep(th) {
  font-weight: 700;
  white-space: nowrap;
}
.stats-table :deep(td) {
  padding-top: 12px;
  padding-bottom: 12px;
}
.stats-link {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
  text-decoration: none;
}
.stats-link:hover {
  text-decoration: underline;
}
.share-cell {
  min-width: 140px;
}
.share-row {
  margin-top: 12px;
}
.share-row:first-of-type {
  margin-top: 0;
}
.event-name {
  font-size: 0.85rem;
}
.method-list {
  margin: 0;
  padding-left: 1.2rem;
}
.method-list li {
  margin-top: 8px;
}
.method-list li:first-child {
  margin-top: 0;
}
</style>
