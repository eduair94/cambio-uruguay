<!--
  /estado — live scraper health dashboard. Shows, per casa de cambio, whether we
  are actually collecting fresh data, distinguishing a hard run failure from a
  "ran but parsed nothing" silent failure. Data: /api/scraper-health.
-->
<template>
  <v-container class="estado-page py-6">
    <header class="mb-6">
      <h1 class="text-h4 font-weight-bold mb-2">{{ t('estado.title') }}</h1>
      <p class="text-body-1 text-medium-emphasis mb-3">{{ t('estado.subtitle') }}</p>
      <div v-if="data" class="d-flex flex-wrap align-center ga-3">
        <v-chip :color="healthColor" variant="flat" size="large" class="font-weight-bold">
          {{ t('estado.operational', { n: data.summary.live, total: data.summary.total }) }}
          · {{ data.summary.okPct }}%
        </v-chip>
        <span v-if="data.minutesAgo != null" class="text-body-2 text-medium-emphasis">
          {{ t('estado.updated') }}: {{ t('estado.minutesAgo', { n: data.minutesAgo }) }}
        </span>
      </div>
    </header>

    <div v-if="pending" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="48" />
    </div>

    <v-alert v-else-if="error || !data" type="error" variant="tonal">
      {{ t('estado.loadError') }}
    </v-alert>

    <template v-else>
      <!-- Status summary cards -->
      <v-row dense class="mb-2">
        <v-col v-for="c in summaryCards" :key="c.key" cols="6" md="3">
          <v-card variant="outlined" class="summary-card pa-3 h-100" :class="`tone-${c.key}`">
            <div class="d-flex align-center mb-1">
              <v-icon :icon="c.icon" :color="c.color" class="mr-2" />
              <span class="text-h5 font-weight-bold">{{ c.count }}</span>
            </div>
            <div class="text-subtitle-2 font-weight-bold">{{ c.label }}</div>
            <div class="text-caption text-medium-emphasis">{{ c.desc }}</div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Insights + detected issues -->
      <v-row dense class="mb-2">
        <v-col cols="12" md="6">
          <v-card variant="outlined" class="pa-4 h-100">
            <h2 class="text-subtitle-1 font-weight-bold mb-3">
              <v-icon icon="mdi-chart-box-outline" size="small" class="mr-1" />
              {{ t('estado.insights') }}
            </h2>
            <dl class="insight-list ma-0">
              <div v-for="row in insightRows" :key="row.key" class="insight-row">
                <dt class="text-body-2">{{ row.label }}</dt>
                <dd class="text-body-2 font-weight-bold ma-0">{{ row.value }}</dd>
              </div>
            </dl>
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-card variant="outlined" class="pa-4 h-100">
            <h2 class="text-subtitle-1 font-weight-bold mb-3">
              <v-icon icon="mdi-bug-outline" size="small" class="mr-1" />
              {{ t('estado.issuesHeading') }}
            </h2>
            <div v-if="!data.insights.issues.length" class="d-flex align-center text-success">
              <v-icon icon="mdi-check-circle" class="mr-2" />{{ t('estado.allGood') }}
            </div>
            <div v-else class="issue-list">
              <div
                v-for="iss in data.insights.issues"
                :key="iss.origin"
                class="issue-row"
                :class="`issue-${iss.status}`"
              >
                <v-icon :icon="statusMeta[iss.status].icon" size="small" class="mr-2 mt-1" />
                <div>
                  <div class="font-weight-bold">{{ iss.name }}</div>
                  <div class="text-caption text-medium-emphasis">{{ iss.detail }}</div>
                </div>
              </div>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Per-casa table -->
      <v-card variant="outlined" class="mt-2">
        <v-table density="comfortable" class="estado-table">
          <thead>
            <tr>
              <th>{{ t('estado.colCasa') }}</th>
              <th>{{ t('estado.colStatus') }}</th>
              <th class="text-center d-none d-sm-table-cell">{{ t('estado.colCurrencies') }}</th>
              <th class="text-right d-none d-md-table-cell">{{ t('estado.colUsd') }}</th>
              <th class="text-right d-none d-md-table-cell">{{ t('estado.colDuration') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in data.scrapers" :key="s.origin">
              <td>
                <a
                  v-if="s.website"
                  :href="s.website"
                  target="_blank"
                  rel="noopener"
                  class="casa-link"
                >
                  {{ s.name }}
                </a>
                <span v-else>{{ s.name }}</span>
                <div class="text-caption text-medium-emphasis">{{ s.origin }}</div>
              </td>
              <td>
                <div class="status-cell">
                  <v-chip
                    :color="statusMeta[s.status].color"
                    size="small"
                    variant="flat"
                    class="font-weight-bold"
                  >
                    <v-icon :icon="statusMeta[s.status].icon" start size="x-small" />
                    {{ t('estado.status.' + s.status) }}
                  </v-chip>
                  <div v-if="s.error" class="status-error text-caption text-error">
                    {{ s.error }}
                  </div>
                </div>
              </td>
              <td class="text-center d-none d-sm-table-cell">
                <span class="text-body-2">{{ s.currencies.length || '—' }}</span>
              </td>
              <td class="text-right d-none d-md-table-cell">
                <span v-if="s.usdBuy && s.usdSell" class="text-body-2">
                  {{ fmt(s.usdBuy) }} / {{ fmt(s.usdSell) }}
                </span>
                <span v-else class="text-medium-emphasis">—</span>
              </td>
              <td class="text-right d-none d-md-table-cell text-body-2">
                {{ s.durationMs != null ? ms(s.durationMs) : '—' }}
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>

      <!-- Methodology -->
      <v-card variant="tonal" class="pa-4 mt-4">
        <h2 class="text-subtitle-1 font-weight-bold mb-2">
          <v-icon icon="mdi-information-outline" size="small" class="mr-1" />
          {{ t('estado.methodologyHeading') }}
        </h2>
        <p class="text-body-2 mb-0">{{ t('estado.methodologyText') }}</p>
      </v-card>
    </template>
  </v-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ScraperHealth, ScraperStatus } from '~/server/api/scraper-health.get'

const { t, locale } = useI18n()

// Not lazy: resolve on the server so SSR and the client hydrate the SAME
// populated lists. The endpoint is server-cached (5 min), so TTFB stays low and
// the dashboard is crawlable. Lazy would render an empty list on the server and
// a filled one on the client, tripping a Vuetify VList tabindex hydration warn.
const { data, pending, error } = await useFetch<ScraperHealth>('/api/scraper-health')

const statusMeta: Record<ScraperStatus, { color: string; icon: string }> = {
  live: { color: 'success', icon: 'mdi-check-circle' },
  stale: { color: 'warning', icon: 'mdi-clock-alert-outline' },
  silent: { color: 'orange', icon: 'mdi-volume-off' },
  error: { color: 'error', icon: 'mdi-alert-circle' },
}

const healthColor = computed(() => {
  const pct = data.value?.summary.okPct ?? 0
  if (pct >= 90) return 'success'
  if (pct >= 70) return 'warning'
  return 'error'
})

const summaryCards = computed(() => {
  const s = data.value?.summary
  if (!s) return []
  return (['live', 'stale', 'silent', 'error'] as ScraperStatus[]).map(key => ({
    key,
    count: s[key],
    icon: statusMeta[key].icon,
    color: statusMeta[key].color,
    label: t('estado.status.' + key),
    desc: t('estado.statusDesc.' + key),
  }))
})

// Flatten the insight figures into label/value rows so the template stays a
// single clean v-for (avoids the prettier vs vue-eslint icon-wrap conflict).
const insightRows = computed(() => {
  const i = data.value?.insights
  if (!i) return []
  const rows: { key: string; label: string; value: string }[] = []
  rows.push({ key: 'usdMedian', label: t('estado.usdMedian'), value: `$ ${fmt(i.usdMedianSell)}` })
  if (i.usdSellRange) {
    rows.push({
      key: 'usdRange',
      label: t('estado.usdRange'),
      value: `$ ${fmt(i.usdSellRange.min)} – $ ${fmt(i.usdSellRange.max)}`,
    })
  }
  if (i.bestUsdBuy) {
    rows.push({
      key: 'bestBuy',
      label: t('estado.bestBuy'),
      value: `${i.bestUsdBuy.name} · $ ${fmt(i.bestUsdBuy.sell)}`,
    })
  }
  if (i.bestUsdSell) {
    rows.push({
      key: 'bestSell',
      label: t('estado.bestSell'),
      value: `${i.bestUsdSell.name} · $ ${fmt(i.bestUsdSell.buy)}`,
    })
  }
  if (i.avgDurationMs != null) {
    rows.push({ key: 'avgDuration', label: t('estado.avgDuration'), value: ms(i.avgDurationMs) })
  }
  if (i.usdOutliers.length) {
    rows.push({
      key: 'outliers',
      label: t('estado.outliers'),
      value: i.usdOutliers.map(o => o.origin).join(', '),
    })
  }
  return rows
})

function fmt(n: number | null | undefined): string {
  if (n == null) return '—'
  return new Intl.NumberFormat(locale.value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}
function ms(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)} s` : `${n} ms`
}

useSeoMeta({
  title: () => t('estado.seoTitle'),
  description: () => t('estado.seoDescription'),
  ogTitle: () => t('estado.seoTitle'),
  ogDescription: () => t('estado.seoDescription'),
  twitterCard: 'summary_large_image',
  robots: 'noindex, follow',
})
defineOgImageComponent('Cambio', {
  title: () => t('estado.title'),
  tag: 'Estado',
  locale: locale.value as 'es' | 'en' | 'pt',
})
</script>

<style scoped>
.summary-card {
  border-radius: 12px;
}
.tone-error {
  border-color: rgba(244, 67, 54, 0.4);
}
.tone-silent {
  border-color: rgba(255, 152, 0, 0.4);
}
.casa-link {
  color: inherit;
  font-weight: 600;
  text-decoration: none;
}
.casa-link:hover {
  text-decoration: underline;
}
.estado-table :deep(th) {
  font-weight: 700;
  white-space: nowrap;
}
/* Give every row vertical breathing room so the chips don't hug the row
   dividers (keep cells vertically centred — top-aligning made single-chip rows
   look top-heavy). */
.estado-table :deep(td) {
  padding-top: 14px;
  padding-bottom: 14px;
}
/* Stack the status chip and its error message with a clear gap; cap the error
   width so a long message wraps tidily instead of crowding the chip/next row. */
.status-cell {
  display: flex;
  margin: 6px 0;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding-block: 2px;
}
.status-error {
  line-height: 1.35;
  max-width: 320px;
}
.insight-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding: 6px 0;
  border-bottom: 1px solid rgba(128, 128, 128, 0.12);
}
.insight-row:last-child {
  border-bottom: none;
}
.insight-row dd {
  text-align: right;
}
.issue-row {
  display: flex;
  align-items: flex-start;
  padding: 6px 0;
}
.issue-error .v-icon {
  color: rgb(var(--v-theme-error));
}
.issue-silent .v-icon {
  color: #fb8c00;
}
.issue-stale .v-icon {
  color: rgb(var(--v-theme-warning));
}
</style>
