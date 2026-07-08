<template>
  <VContainer class="py-6">
    <VRow justify="center">
      <VCol cols="12" md="9" lg="8">
        <VCard class="overflow-hidden mb-5" elevation="8">
          <div class="hero pa-6">
            <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-1">
              {{ t('porQueDolar.title') }}
            </h1>
            <p class="text-body-1 text-grey-lighten-2 mb-3">{{ t('porQueDolar.subtitle') }}</p>
            <div class="d-flex justify-start justify-md-end">
              <ShareButtons :text="t('porQueDolar.title')" />
            </div>
          </div>
        </VCard>

        <WhyTodayCard
          class="mb-5"
          :summary="summary"
          :driver-labels="driverLabels"
          :headline-count="analysis?.headlines?.length ?? 0"
        />

        <VCard class="pa-5 mb-5" elevation="4">
          <h2 class="text-h6 font-weight-bold d-flex align-center ga-2 mb-1">
            <VIcon size="20" color="primary" icon="mdi-chart-line" />
            {{ t('porQueDolar.chartTitle') }}
          </h2>
          <p class="text-body-2 text-medium-emphasis mb-3">{{ t('porQueDolar.chartHint') }}</p>

          <div class="chart-legend d-flex ga-4 flex-wrap mb-4">
            <span class="d-flex align-center ga-2 text-caption text-medium-emphasis">
              <span class="legend-dot legend-dot--up" aria-hidden="true" />
              {{ t('porQueDolar.markerUp') }}
            </span>
            <span class="d-flex align-center ga-2 text-caption text-medium-emphasis">
              <span class="legend-dot legend-dot--down" aria-hidden="true" />
              {{ t('porQueDolar.markerDown') }}
            </span>
          </div>

          <ClientOnly>
            <PriceMovesChart
              :base="analysis?.base ?? []"
              :moves="analysis?.moves ?? []"
              @select="selected = $event"
            />
            <template #fallback>
              <VSkeletonLoader type="image" class="chart-skeleton" />
            </template>
          </ClientOnly>
        </VCard>

        <DollarDriversPanel
          class="mb-5"
          :correlations="analysis?.correlations ?? []"
          :driver-labels="driverLabels"
          :driver-series="driverSeriesValues"
        />

        <MovesTimeline
          class="mb-5"
          :moves="analysis?.moves ?? []"
          :driver-series="driverSeriesArr"
          :driver-labels="driverLabels"
          :selected-date="selected"
          @select="selected = $event"
        />

        <VCard class="pa-5 mb-5" variant="flat">
          <h2 class="text-subtitle-1 font-weight-bold mb-2">
            {{ t('porQueDolar.methodologyTitle') }}
          </h2>
          <p class="text-body-2 text-medium-emphasis mb-3">
            {{ t('porQueDolar.methodologyBody') }}
          </p>
          <p class="text-caption text-medium-emphasis mb-1">
            {{ t('porQueDolar.sources', { date: analysis?.asOf ?? '' }) }}
          </p>
          <p class="text-caption text-medium-emphasis font-italic mb-0">
            {{ t('porQueDolar.disclaimer') }}
          </p>
        </VCard>

        <VCard class="pa-5" variant="flat">
          <p class="text-body-2 text-grey-lighten-1 mb-0 d-flex flex-wrap align-center ga-2">
            <NuxtLink :to="localePath('/historico')" class="lnk">{{ $t('historico') }}</NuxtLink>
            <span aria-hidden="true">·</span>
            <NuxtLink :to="localePath('/dolar-hoy')" class="lnk">{{ $t('dolarHoy.nav') }}</NuxtLink>
            <span aria-hidden="true">·</span>
            <NuxtLink :to="localePath('/noticias')" class="lnk">{{ $t('noticias.nav') }}</NuxtLink>
          </p>
        </VCard>
      </VCol>
    </VRow>
  </VContainer>
</template>

<script setup lang="ts">
// Nuxt's default auto-import prefixes subfolder components by directory
// (components/analysis/WhyTodayCard.vue -> <AnalysisWhyTodayCard>), so these
// must be imported explicitly to be used under their bare names below —
// same workaround already established for components/charts/LineChart.vue
// in comparar.vue.
import WhyTodayCard from '~/components/analysis/WhyTodayCard.vue'
import PriceMovesChart from '~/components/analysis/PriceMovesChart.vue'
import DollarDriversPanel from '~/components/analysis/DollarDriversPanel.vue'
import MovesTimeline from '~/components/analysis/MovesTimeline.vue'
import { todaySummary } from '~/utils/attribution'

interface AnalysisResponse {
  currency: string
  asOf: string
  base: { date: string; value: number }[]
  correlations: { key: string; r: number; n: number }[]
  moves: {
    date: string
    pctChange: number
    direction: 'up' | 'down' | 'flat'
    headlines: { title: string; source: string; link: string }[]
    narrative: string | null
  }[]
  headlines: { title: string; source: string; link: string; pubDate: string }[]
}

interface DriversResponse {
  drivers: { key: string; label: string; source: string }[]
  series: { key: string; points: { date: string; value: number }[] }[]
}

const localePath = useLocalePath()
const { t } = useI18n()

const { data: analysis } = await useFetch<AnalysisResponse>('/api/analysis/USD')
const { data: drivers } = await useFetch<DriversResponse>('/api/drivers')

// Shared "selected move" state: a click on a chart marker or a timeline
// header both write here, so either surface can drive the other's highlight.
const selected = ref<string | null>(null)

const driverLabels = computed<Record<string, string>>(() =>
  Object.fromEntries((drivers.value?.drivers ?? []).map(d => [d.key, d.label]))
)

const driverSeriesArr = computed(() => drivers.value?.series ?? [])

// Sparkline inputs only need the recent trend, not the full aligned history.
const driverSeriesValues = computed<Record<string, number[]>>(() =>
  Object.fromEntries(driverSeriesArr.value.map(s => [s.key, s.points.slice(-30).map(p => p.value)]))
)

const summary = computed(() =>
  todaySummary(analysis.value?.base ?? [], analysis.value?.correlations ?? [])
)

const canonical = computed(() => 'https://cambio-uruguay.com/por-que-sube-el-dolar')

defineOgImageComponent('Cambio', {
  title: () => t('porQueDolar.title'),
  subtitle: () => t('porQueDolar.subtitle'),
  tag: 'ANÁLISIS',
})

useSeoMeta({
  title: () => t('porQueDolar.metaTitle'),
  description: () => t('porQueDolar.metaDescription'),
  ogTitle: () => t('porQueDolar.metaTitle'),
  ogDescription: () => t('porQueDolar.metaDescription'),
  ogType: 'article',
  ogUrl: () => canonical.value,
  twitterCard: 'summary_large_image',
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonical.value }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Article',
            headline: t('porQueDolar.metaTitle'),
            description: t('porQueDolar.metaDescription'),
            datePublished: analysis.value?.asOf ?? new Date().toISOString().slice(0, 10),
            dateModified: analysis.value?.asOf ?? new Date().toISOString().slice(0, 10),
            inLanguage: 'es-UY',
            mainEntityOfPage: { '@type': 'WebPage', '@id': canonical.value },
            author: {
              '@type': 'Person',
              name: 'Eduardo Airaudo',
              url: 'https://www.linkedin.com/in/eduardo-airaudo/',
            },
            publisher: {
              '@type': 'Organization',
              name: 'Cambio Uruguay',
              logo: { '@type': 'ImageObject', url: 'https://cambio-uruguay.com/img/logo.png' },
            },
          },
          {
            '@type': 'Dataset',
            name: t('porQueDolar.metaTitle'),
            description: t('porQueDolar.metaDescription'),
            url: canonical.value,
            license: 'https://creativecommons.org/licenses/by/4.0/',
            creator: {
              '@type': 'Organization',
              name: 'Cambio Uruguay',
              url: 'https://cambio-uruguay.com',
            },
            variableMeasured: [
              'USD/UYU',
              ...(analysis.value?.correlations ?? []).map(c => driverLabels.value[c.key] ?? c.key),
            ],
            temporalCoverage:
              analysis.value?.base && analysis.value.base.length > 0
                ? `${analysis.value.base[0]!.date}/${analysis.value.asOf}`
                : undefined,
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
/* Same brand blue/green as dolar-hoy's hero, but anchored in a dark "data
   terminal" ink rather than starting bright — this page is the analytical
   deep-dive, dolar-hoy is the at-a-glance number, so the two heroes read as
   related but distinct. */
.hero {
  background: linear-gradient(135deg, #0f172a 0%, #1e3a63 45%, #16c784 100%);
}

.chart-skeleton {
  height: 360px;
}

/* Reuses the exact up/down hex pair already established by PriceMovesChart's
   markers and Sparkline, so the legend matches what it's explaining. */
.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.legend-dot--up {
  background: #16c784;
}

.legend-dot--down {
  background: #ea3943;
}

.lnk {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}
</style>
