<!--
  /estadisticas-reddit — qué contestó nuestro bot en Reddit, en público.

  Mismo espíritu que /estado (que publica si los scrapers andan) y /estadisticas-del-sitio (que
  publica cuánta gente entra): si el sitio tiene una cuenta que comenta sola en comunidades ajenas,
  la única forma honesta de tenerla es que cualquiera pueda auditarla. Por eso acá está TODO — no
  sólo lo que contestó, sino cuántos hilos descartó y por qué, cuántas preguntas no supo contestar, y
  cuáles de sus comentarios terminaron borrados.

  Los números salen de /api/reddit-stats: un documento agregado que el job `currency-reddit-stats`
  escribe cada tres horas desde el registro del propio bot. El registro tiene una fila por hilo
  evaluado desde el primer día, así que esta página es el histórico completo y no una ventana móvil.

  Lo que NO sale: el autor de ningún hilo. Reddit ya lo publica; republicar agrupada y buscable la
  lista de quién preguntó por plata es otra cosa, y no hace falta para nada de lo que se muestra acá.
-->
<template>
  <VContainer class="reddit-stats py-6">
    <VCard class="overflow-hidden mb-5" elevation="4">
      <div class="reddit-stats__hero on-dark pa-6 pa-md-8">
        <div class="reddit-stats__hero-grid">
          <div>
            <div class="reddit-stats__eyebrow mb-3">
              <span class="reddit-stats__pulse" aria-hidden="true" />
              {{ t('redditStats.eyebrow') }}
            </div>
            <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-2">
              {{ t('redditStats.title') }}
            </h1>
            <p class="text-body-1 text-grey-lighten-2 mb-0">{{ t('redditStats.subtitle') }}</p>
          </div>
          <div v-if="stats" class="reddit-stats__board">
            <div>
              <span>{{ t('redditStats.account') }}</span>
              <strong>u/{{ stats.account || '—' }}</strong>
            </div>
            <div>
              <span>{{ t('redditStats.since') }}</span>
              <strong>{{ sinceLabel }}</strong>
            </div>
            <div>
              <span>{{ t('redditStats.updated') }}</span>
              <strong>{{ updatedLabel }}</strong>
            </div>
          </div>
        </div>
      </div>
    </VCard>

    <VCard v-if="!stats" variant="outlined" class="pa-6 text-center">
      <VIcon size="42" color="medium-emphasis" class="mb-3">mdi-database-clock-outline</VIcon>
      <h2 class="text-h6 font-weight-bold mb-2">{{ t('redditStats.empty.title') }}</h2>
      <p class="text-body-2 text-medium-emphasis mb-0">{{ t('redditStats.empty.body') }}</p>
    </VCard>

    <template v-else>
      <!-- Los cuatro números que contestan "¿qué hizo?" antes de cualquier detalle. -->
      <div class="metric-grid mb-5">
        <VCard variant="outlined" class="pa-4 metric-card metric-card--hero">
          <div class="metric-value">{{ fmt(stats.totals.answered) }}</div>
          <div class="metric-label">{{ t('redditStats.metric.answered') }}</div>
        </VCard>
        <VCard variant="outlined" class="pa-4 metric-card">
          <div class="metric-value">{{ fmt(stats.totals.evaluated) }}</div>
          <div class="metric-label">{{ t('redditStats.metric.evaluated') }}</div>
        </VCard>
        <VCard variant="outlined" class="pa-4 metric-card">
          <div class="metric-value">{{ fmt(stats.totals.subs) }}</div>
          <div class="metric-label">{{ t('redditStats.metric.subs') }}</div>
        </VCard>
        <VCard variant="outlined" class="pa-4 metric-card">
          <div class="metric-value">{{ fmt(stats.totals.pages) }}</div>
          <div class="metric-label">{{ t('redditStats.metric.pages') }}</div>
        </VCard>
      </div>

      <!-- Las tres proporciones. Publicar la tasa de respuesta es lo que evita la lectura contraria:
           que la cuenta comenta en todo lo que se mueve. -->
      <div class="ratio-grid mb-5">
        <VCard variant="outlined" class="pa-4">
          <div class="d-flex align-baseline ga-2">
            <span class="text-h5 font-weight-bold">{{ pct(rateAnswer) }}</span>
          </div>
          <div class="metric-label">{{ t('redditStats.metric.answerRate') }}</div>
        </VCard>
        <VCard variant="outlined" class="pa-4">
          <div class="d-flex align-baseline ga-2">
            <span class="text-h5 font-weight-bold">{{ pct(rateSurvival) }}</span>
            <span class="text-caption text-medium-emphasis">
              {{ fmt(stats.totals.alive) }} / {{ fmt(stats.totals.answered) }}
            </span>
          </div>
          <div class="metric-label">{{ t('redditStats.metric.survival') }}</div>
        </VCard>
        <VCard variant="outlined" class="pa-4">
          <div class="d-flex align-baseline ga-2">
            <span class="text-h5 font-weight-bold">{{ avgScore.toFixed(1) }}</span>
            <span class="text-caption text-medium-emphasis">
              {{ fmt(stats.totals.score) }} {{ t('redditStats.metric.score').toLowerCase() }}
            </span>
          </div>
          <div class="metric-label">{{ t('redditStats.metric.avgScore') }}</div>
        </VCard>
      </div>

      <!-- Actividad día por día -->
      <section class="mb-6" aria-labelledby="serie-title">
        <h2 id="serie-title" class="text-h6 font-weight-bold mb-1">
          {{ t('redditStats.chart.title') }}
        </h2>
        <p class="text-body-2 text-medium-emphasis mb-3">{{ t('redditStats.chart.subtitle') }}</p>

        <VCard variant="outlined" class="pa-4">
          <div class="bars" role="img" :aria-label="t('redditStats.chart.title')">
            <div v-for="day in series" :key="day.date" class="bar-col">
              <div class="bar-stack">
                <div
                  v-if="day.posted"
                  class="bar bar--posted"
                  :style="{ height: barHeight(day.posted) }"
                  :title="`${day.date}: ${day.posted}`"
                />
                <div
                  v-if="day.gaps"
                  class="bar bar--gap"
                  :style="{ height: barHeight(day.gaps) }"
                  :title="`${day.date}: ${day.gaps}`"
                />
              </div>
            </div>
          </div>
          <div class="bar-axis">
            <span>{{ dateLabel(series[0]?.date ?? null) }}</span>
            <span>{{ dateLabel(series[series.length - 1]?.date ?? null) }}</span>
          </div>
          <div class="d-flex flex-wrap ga-4 mt-3 text-caption">
            <span class="legend"
              ><i class="dot dot--posted" />{{ t('redditStats.chart.posted') }}</span
            >
            <span class="legend"><i class="dot dot--gap" />{{ t('redditStats.chart.gaps') }}</span>
          </div>
        </VCard>
      </section>

      <!-- Lo que contestó -->
      <section class="mb-6" aria-labelledby="respuestas-title">
        <h2 id="respuestas-title" class="text-h6 font-weight-bold mb-1">
          {{ t('redditStats.answers.title') }}
        </h2>
        <p class="text-body-2 text-medium-emphasis mb-3">{{ t('redditStats.answers.subtitle') }}</p>

        <VCard v-if="!stats.answers.length" variant="outlined" class="pa-4 text-body-2">
          {{ t('redditStats.answers.none') }}
        </VCard>

        <VCard
          v-for="(a, i) in stats.answers"
          v-else
          :key="`${a.postPermalink}-${i}`"
          variant="outlined"
          class="mb-3 pa-4 answer-card"
        >
          <div class="d-flex align-start flex-wrap ga-2 mb-2">
            <div class="flex-grow-1">
              <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ a.postTitle }}</h3>
              <div class="text-caption text-medium-emphasis">
                r/{{ a.sub }} · {{ dateLabel(a.postedAt) }}
              </div>
            </div>
            <VChip
              size="small"
              :color="a.removed ? 'error' : 'success'"
              variant="tonal"
              :prepend-icon="a.removed ? 'mdi-close-circle-outline' : 'mdi-check-circle-outline'"
            >
              {{ a.removed ? t('redditStats.answers.removed') : t('redditStats.answers.alive') }}
              · {{ a.score >= 0 ? '+' : '' }}{{ a.score }}
            </VChip>
          </div>

          <p class="reply-text mb-3">{{ a.replyText }}</p>

          <div class="d-flex flex-wrap ga-3 text-caption">
            <a
              v-if="a.postPermalink"
              :href="redditUrl(a.postPermalink)"
              target="_blank"
              rel="noopener nofollow"
              class="d-inline-flex align-center ga-1"
            >
              <VIcon size="14">mdi-reddit</VIcon>{{ t('redditStats.answers.openThread') }}
            </a>
            <NuxtLink
              v-if="a.pagePath"
              :to="localePath(a.pagePath)"
              class="d-inline-flex align-center ga-1"
            >
              <VIcon size="14">mdi-link-variant</VIcon>{{ a.pagePath }}
            </NuxtLink>
          </div>
        </VCard>
      </section>

      <!-- Dónde y con qué -->
      <div class="two-col mb-6">
        <VCard variant="outlined" class="pa-4">
          <h2 class="text-subtitle-1 font-weight-bold mb-3">{{ t('redditStats.subs.title') }}</h2>
          <div v-for="row in stats.bySub" :key="row.name" class="rank-row">
            <span class="rank-name">r/{{ row.name }}</span>
            <span class="rank-bar"><i :style="{ width: share(row.count, stats.bySub) }" /></span>
            <span class="rank-count">{{ row.count }}</span>
          </div>
        </VCard>

        <VCard variant="outlined" class="pa-4">
          <h2 class="text-subtitle-1 font-weight-bold mb-3">{{ t('redditStats.pages.title') }}</h2>
          <div v-for="row in stats.byPage" :key="row.name" class="rank-row">
            <NuxtLink :to="localePath(row.name)" class="rank-name">{{ row.name }}</NuxtLink>
            <span class="rank-bar"><i :style="{ width: share(row.count, stats.byPage) }" /></span>
            <span class="rank-count">{{ row.count }}</span>
          </div>
        </VCard>
      </div>

      <!-- Por qué descarta -->
      <section class="mb-6" aria-labelledby="descartes-title">
        <h2 id="descartes-title" class="text-h6 font-weight-bold mb-1">
          {{ t('redditStats.reasons.title') }}
        </h2>
        <p class="text-body-2 text-medium-emphasis mb-3">{{ t('redditStats.reasons.subtitle') }}</p>

        <VCard variant="outlined" class="pa-4">
          <div v-for="row in stats.byRejectReason" :key="row.name" class="rank-row">
            <span class="rank-name">{{ explainReason(row.name) }}</span>
            <span class="rank-bar"
              ><i :style="{ width: share(row.count, stats.byRejectReason) }"
            /></span>
            <span class="rank-count">{{ fmt(row.count) }}</span>
          </div>
        </VCard>
      </section>

      <!-- Lo que falta escribir -->
      <section class="mb-6" aria-labelledby="huecos-title">
        <h2 id="huecos-title" class="text-h6 font-weight-bold mb-1">
          {{ t('redditStats.open.title') }}
        </h2>
        <p class="text-body-2 text-medium-emphasis mb-3">{{ t('redditStats.open.subtitle') }}</p>

        <VCard variant="outlined" class="pa-4">
          <p v-if="!stats.openQuestions.length" class="text-body-2 mb-0">
            {{ t('redditStats.open.none') }}
          </p>
          <ul v-else class="open-list">
            <li v-for="q in stats.openQuestions" :key="q.permalink">
              <a :href="redditUrl(q.permalink)" target="_blank" rel="noopener nofollow">{{
                q.title
              }}</a>
              <span class="text-caption text-medium-emphasis"> — r/{{ q.sub }}</span>
            </li>
          </ul>
        </VCard>
      </section>

      <!-- Las reglas -->
      <section class="mb-2" aria-labelledby="reglas-title">
        <h2 id="reglas-title" class="text-h6 font-weight-bold mb-1">
          {{ t('redditStats.rules.title') }}
        </h2>
        <p class="text-body-2 text-medium-emphasis mb-3">{{ t('redditStats.rules.subtitle') }}</p>

        <div class="two-col">
          <VCard v-for="rule in BOT_RULES" :key="rule.title" variant="outlined" class="pa-4">
            <div class="d-flex align-start ga-3">
              <VIcon size="22" color="primary">{{ rule.icon }}</VIcon>
              <div>
                <h3 class="text-subtitle-2 font-weight-bold mb-1">{{ rule.title }}</h3>
                <p class="text-body-2 mb-0">{{ rule.body }}</p>
              </div>
            </div>
          </VCard>
        </div>
      </section>
    </template>
  </VContainer>
</template>

<script setup lang="ts">
import {
  BOT_RULES,
  averageScore,
  answerRate,
  explainReason,
  lastDays,
  survivalRate,
  type RedditBotStats,
  type RedditStatsCount,
} from '~/utils/redditStats'

const { t, locale } = useI18n()
const localePath = useLocalePath()

const { data: stats } = await useFetch<RedditBotStats | null>('/api/reddit-stats', {
  key: 'reddit-stats',
  default: () => null,
})

/** Treinta días. Suficiente para ver la cadencia sin que las barras queden invisibles en un celular. */
const series = computed(() => (stats.value ? lastDays(stats.value.days ?? [], 30) : []))

const rateAnswer = computed(() => (stats.value ? answerRate(stats.value.totals) : 0))
const rateSurvival = computed(() => (stats.value ? survivalRate(stats.value.totals) : 0))
const avgScore = computed(() => (stats.value ? averageScore(stats.value.totals) : 0))

/** El día con más barra, para escalar. Nunca cero: dividir por cero deja todas las barras al 100 %. */
const peak = computed(() => Math.max(1, ...series.value.map(d => Math.max(d.posted, d.gaps))))

const fmt = (n: number): string => new Intl.NumberFormat(locale.value).format(n || 0)
const pct = (n: number): string => `${(n || 0).toFixed(n >= 10 ? 0 : 1)} %`
const barHeight = (n: number): string => `${Math.max(4, Math.round((n / peak.value) * 100))}%`

/** Cuánto ocupa una fila del ranking respecto de la más grande. */
const share = (count: number, rows: readonly RedditStatsCount[]): string => {
  const top = Math.max(1, ...rows.map(r => r.count))
  return `${Math.max(3, Math.round((count / top) * 100))}%`
}

const redditUrl = (permalink: string): string =>
  permalink.startsWith('http') ? permalink : `https://www.reddit.com${permalink}`

const dateLabel = (value: string | Date | null): string => {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(locale.value, { day: 'numeric', month: 'short', year: 'numeric' })
}

const sinceLabel = computed(() => (stats.value?.since ? dateLabel(stats.value.since) : '—'))
const updatedLabel = computed(() => (stats.value?.asOf ? dateLabel(stats.value.asOf) : '—'))

// ── SEO ──
const canonicalUrl = 'https://cambio-uruguay.com/estadisticas-reddit'
useSeoMeta({
  title: () => `${t('redditStats.title')} | Cambio Uruguay`,
  description: () => t('redditStats.subtitle'),
  ogTitle: () => t('redditStats.title'),
  ogDescription: () => t('redditStats.subtitle'),
  ogType: 'website',
  ogUrl: canonicalUrl,
})
useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      // `Dataset` y no `WebPage` a secas: lo que esta página publica ES un conjunto de datos —
      // cuántas dudas se contestaron, dónde, con qué enlace y cómo cayó cada una— y describirlo como
      // tal es lo que permite que se lo cite como fuente en vez de como una nota de opinión.
      // `dateModified` sale de la foto, no de la fecha de build: la página se regenera sola y decir
      // que cambió cuando no cambió es exactamente la clase de dato que no queremos publicar.
      innerHTML: computed(() =>
        JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Dataset',
              '@id': canonicalUrl,
              name: t('redditStats.title'),
              description: t('redditStats.subtitle'),
              url: canonicalUrl,
              inLanguage: 'es-UY',
              isAccessibleForFree: true,
              license: 'https://cambio-uruguay.com/terminos',
              creator: {
                '@type': 'Organization',
                name: 'Cambio Uruguay',
                url: 'https://cambio-uruguay.com',
              },
              temporalCoverage: stats.value?.since ? `${stats.value.since}/..` : undefined,
              dateModified: stats.value?.asOf ?? undefined,
              variableMeasured: [
                t('redditStats.metric.answered'),
                t('redditStats.metric.evaluated'),
                t('redditStats.metric.gaps'),
                t('redditStats.metric.alive'),
              ],
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: 'Cambio Uruguay',
                  item: 'https://cambio-uruguay.com',
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: t('redditStats.title'),
                  item: canonicalUrl,
                },
              ],
            },
          ],
        })
      ),
    },
  ],
})
</script>

<style scoped>
.reddit-stats__hero {
  /* Losa oscura permanente, con el tratamiento .on-dark: los neutrales oscuros de DESIGN.md, que
     son los mismos en los dos temas, mas un radial del token de accion. */
  background:
    radial-gradient(120% 140% at 100% 0%, rgba(var(--v-theme-primary), 0.45), transparent 55%),
    linear-gradient(135deg, #0a0e1a 0%, #121a2e 100%);
}
.reddit-stats__hero-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: 1fr;
}
@media (min-width: 960px) {
  .reddit-stats__hero-grid {
    grid-template-columns: 1.6fr 1fr;
    align-items: center;
  }
}
.reddit-stats__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  opacity: 0.85;
}
.reddit-stats__pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgb(var(--v-theme-success));
}
.reddit-stats__board {
  display: grid;
  gap: 0.75rem;
}
.reddit-stats__board > div {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.25);
  padding-bottom: 0.4rem;
}
.reddit-stats__board span {
  font-size: 0.8rem;
  opacity: 0.75;
}
.reddit-stats__board strong {
  font-size: 0.875rem;
}

.metric-grid,
.ratio-grid,
.two-col {
  display: grid;
  gap: 0.75rem;
}
.metric-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
@media (min-width: 700px) {
  .metric-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .ratio-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .two-col {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.metric-card {
  border-radius: 12px;
}
.metric-value {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}
.metric-card--hero .metric-value {
  color: rgb(var(--v-theme-primary));
}
.metric-label {
  font-size: 0.8rem;
  opacity: 0.75;
  margin-top: 0.25rem;
}

/* Barras: CSS y no una librería de gráficos. Son treinta valores y dos series; traer echarts para
   esto costaría más kilobytes que toda la página. */
.bars {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 160px;
  overflow-x: auto;
}
.bar-col {
  flex: 1 0 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}
.bar-stack {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 2px;
}
.bar {
  width: 45%;
  min-height: 2px;
  border-radius: 4px 4px 0 0;
}
.bar--posted {
  background: rgb(var(--v-theme-primary));
}
.bar--gap {
  background: rgba(var(--v-theme-warning), 0.75);
}
.bar-axis {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  opacity: 0.6;
  margin-top: 0.35rem;
}
.legend {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 4px;
  display: inline-block;
}
.dot--posted {
  background: rgb(var(--v-theme-primary));
}
.dot--gap {
  background: rgba(var(--v-theme-warning), 0.75);
}

.answer-card {
  border-radius: 12px;
}
.reply-text {
  white-space: pre-wrap;
  font-size: 0.95rem;
  line-height: 1.6;
  padding: 0.75rem 0.9rem;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.rank-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 90px 44px;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0;
  font-size: 0.875rem;
}
.rank-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rank-bar {
  display: block;
  height: 6px;
  border-radius: 4px;
  background: rgba(var(--v-theme-on-surface), 0.08);
}
.rank-bar i {
  display: block;
  height: 100%;
  border-radius: 4px;
  background: rgb(var(--v-theme-primary));
}
.rank-count {
  text-align: right;
  font-variant-numeric: tabular-nums;
  opacity: 0.8;
}

.open-list {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.875rem;
  line-height: 1.8;
}
</style>
