<!--
  THESIS: Qué consulta la gente en Uruguay en este sitio, contado en público y sin inflar: las
  páginas más visitadas por su semana normal (no por el empujón de un día), las que están creciendo,
  las que recomiendan los asistentes de IA y cómo llega cada visita.
  OWN-WORLD: Hermana de /estadisticas-del-sitio (misma fuente, GA4, y el mismo tono de
  transparencia). La versión con decisiones de trabajo es privada (/estadisticas-por-pagina); acá
  llega un documento aparte, armado campo por campo sin nada de eso
  (classes/site-analytics/publicTopPages.ts).
  FAMILY: Sólo español; canonical literal aunque la ruta exista bajo /en/ y /pt/.
-->
<template>
  <VContainer class="top-pages py-6 py-md-10">
    <header class="mb-6">
      <p class="top-pages__eyebrow mb-2">Lo más visto · últimos 28 días</p>
      <h1 class="top-pages__title mb-3">Las páginas más visitadas de Cambio Uruguay</h1>
      <p class="text-body-1 top-pages__lead mb-2">
        Qué consulta la gente en Uruguay: las cien páginas con más visitas en una semana normal, las
        que están creciendo, las que recomiendan los asistentes de IA y cómo llega cada visita.
      </p>
      <p v-if="snapshot" class="text-body-2 text-medium-emphasis">
        Del {{ dayLabel(snapshot.range.start) }} al {{ dayLabel(snapshot.range.end) }}, sólo visitas
        desde Uruguay. Se actualiza todos los días con Google Analytics.
      </p>
    </header>

    <VAlert v-if="!snapshot" type="info" variant="tonal" class="mb-6">
      Todavía no hay datos para mostrar. Se calculan una vez por día; volvé a mirar mañana.
    </VAlert>

    <template v-else>
      <VRow class="mb-6">
        <VCol cols="12" sm="6" md="3">
          <VCard variant="tonal" class="pa-4 h-100">
            <div class="text-caption text-medium-emphasis">Visitas a páginas</div>
            <div class="text-h5 font-weight-bold">{{ prNumber(snapshot.totals.viewsUy) }}</div>
            <div class="text-caption text-medium-emphasis">en 28 días, desde Uruguay</div>
          </VCard>
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <VCard variant="tonal" class="pa-4 h-100">
            <div class="text-caption text-medium-emphasis">Personas</div>
            <div class="text-h5 font-weight-bold">{{ prNumber(snapshot.totals.usersUy) }}</div>
            <div class="text-caption text-medium-emphasis">
              en {{ prNumber(snapshot.totals.sessionsUy) }} visitas al sitio
            </div>
          </VCard>
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <VCard variant="tonal" class="pa-4 h-100">
            <div class="text-caption text-medium-emphasis">Páginas consultadas</div>
            <div class="text-h5 font-weight-bold">{{ prNumber(snapshot.totals.pageCount) }}</div>
            <div class="text-caption text-medium-emphasis">
              las 10 primeras juntan {{ prPercent(topTenShare) }} de las visitas
            </div>
          </VCard>
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <VCard variant="tonal" class="pa-4 h-100">
            <div class="text-caption text-medium-emphasis">Desde buscadores</div>
            <div class="text-h5 font-weight-bold">
              {{ searchChange === null ? '—' : prTrend(searchChange) }}
            </div>
            <div class="text-caption text-medium-emphasis">
              visitas por semana, la última contra la primera
            </div>
          </VCard>
        </VCol>
      </VRow>

      <section class="mb-8" aria-labelledby="top-title">
        <h2 id="top-title" class="text-h6 font-weight-bold mb-1">Las 100 más visitadas</h2>
        <p class="text-body-2 text-medium-emphasis mb-3">
          Ordenadas por lo que recibe cada página en una semana normal: la mediana de sus semanas,
          sin la del empujón si lo hubo. Un enlace compartido un día no sube a nadie en esta lista.
        </p>
        <div class="d-flex flex-wrap ga-2 mb-3" role="group" aria-label="Filtrar por sección">
          <VChip
            v-for="section in sectionFilters"
            :key="section"
            :variant="sectionFilter === section ? 'flat' : 'outlined'"
            :color="sectionFilter === section ? 'primary' : undefined"
            size="small"
            @click="sectionFilter = sectionFilter === section ? null : section"
          >
            {{ section }}
          </VChip>
        </div>

        <VTable density="comfortable" class="cu-mobile-cards top-pages__table">
          <thead>
            <tr>
              <th class="text-right">#</th>
              <th>Página</th>
              <th class="text-right">Por semana</th>
              <th class="text-right">28 días</th>
              <th>Semana a semana</th>
              <th class="text-right">Tendencia</th>
              <th class="text-right">Tiempo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in visiblePages" :key="row.path">
              <td data-label="#" class="text-right text-no-wrap text-medium-emphasis">
                {{ row.rank }}
              </td>
              <td data-label="Página" class="top-pages__subject">
                <NuxtLink :to="row.path">{{ prLabel(row) }}</NuxtLink>
                <div class="text-caption text-medium-emphasis">
                  {{ topics.get(row.path)?.section || row.path }}
                  <VChip v-if="row.isNew" size="x-small" color="info" variant="tonal" class="ml-1">
                    Nueva
                  </VChip>
                </div>
              </td>
              <td data-label="Por semana" class="text-right text-no-wrap font-weight-bold">
                {{ whole(row.base) }}
              </td>
              <td data-label="28 días" class="text-right text-no-wrap">
                {{ prNumber(row.views) }}
              </td>
              <td data-label="Semana a semana">
                <span
                  class="top-pages__bars"
                  role="img"
                  :aria-label="`Visitas por semana: ${row.weeks.join(', ')}`"
                >
                  <span
                    v-for="(h, i) in prWeekBars(row.weeks)"
                    :key="i"
                    class="top-pages__bar"
                    :style="{ height: h > 0 ? `${Math.round(h * 100)}%` : '1px' }"
                  />
                </span>
              </td>
              <td data-label="Tendencia" class="text-right text-no-wrap" :class="trendClass(row)">
                {{ row.isPeak ? 'Pico' : prTrend(row.trend) }}
              </td>
              <td data-label="Tiempo" class="text-right text-no-wrap">
                {{ prSeconds(row.engagementSeconds) }}
              </td>
            </tr>
          </tbody>
        </VTable>
        <div class="d-flex justify-center mt-3">
          <VBtn
            v-if="visiblePages.length < filteredPages.length"
            variant="tonal"
            @click="limit += STEP"
          >
            Ver {{ Math.min(STEP, filteredPages.length - visiblePages.length) }} más
          </VBtn>
        </div>
      </section>

      <section v-if="snapshot.guides?.length" class="mb-8" aria-labelledby="guides-title">
        <h2 id="guides-title" class="text-h6 font-weight-bold mb-1">Las guías más leídas</h2>
        <p class="text-body-2 text-medium-emphasis mb-3">
          Las páginas que responden un problema concreto —trámites, bancos, deudas, alquilar,
          invertir— ordenadas por lo que se leen en una semana normal.
        </p>
        <VRow dense>
          <VCol v-for="row in snapshot.guides" :key="row.path" cols="12" sm="6" md="4">
            <VCard :to="row.path" variant="outlined" class="pa-4 h-100">
              <div class="text-body-1 font-weight-medium">{{ prLabel(row) }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ topicOf(row.path, t)?.section || row.path }}
              </div>
              <div class="text-body-2 mt-2">
                {{ whole(row.base) }} lecturas por semana · {{ prSeconds(row.engagementSeconds) }}
                por persona
              </div>
            </VCard>
          </VCol>
        </VRow>
      </section>

      <VRow class="mb-8">
        <VCol cols="12" md="6">
          <section aria-labelledby="rising-title">
            <h2 id="rising-title" class="text-h6 font-weight-bold mb-1">En alza</h2>
            <p class="text-body-2 text-medium-emphasis mb-3">
              Las que más visitas por semana ganaron en las dos últimas semanas, y las nuevas que ya
              tienen lectores. Sin contar empujones de un día.
            </p>
            <VList density="compact" class="bg-transparent pa-0">
              <VListItem v-for="row in snapshot.rising" :key="row.path" class="px-0">
                <NuxtLink :to="row.path" class="font-weight-medium">{{ prLabel(row) }}</NuxtLink>
                <div class="text-caption text-medium-emphasis">{{ row.path }}</div>
                <div class="text-body-2 text-medium-emphasis">
                  <template v-if="row.before === null">
                    Nueva: {{ whole(row.after) }} visitas por semana
                  </template>
                  <template v-else>
                    De {{ whole(row.before) }} a {{ whole(row.after) }} visitas por semana
                  </template>
                </div>
              </VListItem>
            </VList>
            <p v-if="!snapshot.rising.length" class="text-body-2 text-medium-emphasis">
              Esta semana ninguna página creció lo suficiente para entrar.
            </p>
          </section>
        </VCol>
        <VCol cols="12" md="6">
          <section aria-labelledby="ai-title">
            <h2 id="ai-title" class="text-h6 font-weight-bold mb-1">
              Las que recomiendan los asistentes de IA
            </h2>
            <p class="text-body-2 text-medium-emphasis mb-3">
              Páginas a las que llegó gente desde ChatGPT, Gemini, Perplexity y parecidos: el
              asistente la citó como fuente y alguien hizo clic.
            </p>
            <VList density="compact" class="bg-transparent pa-0">
              <VListItem v-for="row in snapshot.aiCited" :key="row.path" class="px-0">
                <NuxtLink :to="row.path" class="font-weight-medium">{{ prLabel(row) }}</NuxtLink>
                <div class="text-caption text-medium-emphasis">{{ row.path }}</div>
                <div class="text-body-2 text-medium-emphasis">
                  {{ prNumber(row.aiEntrances) }} visitas desde un asistente de IA
                </div>
              </VListItem>
            </VList>
            <p v-if="!snapshot.aiCited.length" class="text-body-2 text-medium-emphasis">
              Todavía no hay suficientes visitas desde asistentes de IA para armar la lista.
            </p>
          </section>
        </VCol>
      </VRow>

      <section class="mb-8" aria-labelledby="topics-title">
        <h2 id="topics-title" class="text-h6 font-weight-bold mb-1">Los temas más consultados</h2>
        <p class="text-body-2 text-medium-emphasis mb-3">
          Las páginas agrupadas por plantilla: todos los históricos juntos, todas las guías juntas,
          todas las fichas de alquiler juntas.
        </p>
        <VTable density="comfortable" class="cu-mobile-cards top-pages__table">
          <thead>
            <tr>
              <th>Tema</th>
              <th class="text-right">Páginas</th>
              <th class="text-right">Por semana</th>
              <th class="text-right">Del total</th>
              <th>Semana a semana</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="topic in snapshot.topics" :key="topic.family">
              <td data-label="Tema" class="top-pages__subject">
                <NuxtLink
                  v-if="familyTopic(topic.family, t).to"
                  :to="familyTopic(topic.family, t).to!"
                >
                  {{ familyTopic(topic.family, t).label }}
                </NuxtLink>
                <span v-else>{{ familyTopic(topic.family, t).label }}</span>
              </td>
              <td data-label="Páginas" class="text-right text-no-wrap">
                {{ prNumber(topic.urls) }}
              </td>
              <td data-label="Por semana" class="text-right text-no-wrap font-weight-bold">
                {{ whole(topic.base) }}
              </td>
              <td data-label="Del total" class="text-right text-no-wrap">
                {{ sharePct(topic.share) }}
              </td>
              <td data-label="Semana a semana">
                <span
                  class="top-pages__bars"
                  role="img"
                  :aria-label="`Visitas por semana: ${topic.weeks.join(', ')}`"
                >
                  <span
                    v-for="(h, i) in prWeekBars(topic.weeks)"
                    :key="i"
                    class="top-pages__bar"
                    :style="{ height: h > 0 ? `${Math.round(h * 100)}%` : '1px' }"
                  />
                </span>
              </td>
            </tr>
          </tbody>
        </VTable>
      </section>

      <VRow class="mb-8">
        <VCol cols="12" md="7">
          <section aria-labelledby="channels-title">
            <h2 id="channels-title" class="text-h6 font-weight-bold mb-1">Cómo llega la gente</h2>
            <p class="text-body-2 text-medium-emphasis mb-3">
              Visitas desde Uruguay por semana, según de dónde vienen.
            </p>
            <VTable density="compact" class="cu-mobile-cards top-pages__table">
              <thead>
                <tr>
                  <th>Canal</th>
                  <th v-for="(w, i) in snapshot.weeks" :key="i" class="text-right text-no-wrap">
                    {{ dayLabel(w.start) }}
                  </th>
                  <th class="text-right">Cambio</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="series in channelRows" :key="series.label">
                  <td data-label="Canal">{{ prChannelLabel(series.label) }}</td>
                  <td
                    v-for="(v, i) in series.weeks"
                    :key="i"
                    :data-label="`Semana del ${dayLabel(snapshot.weeks[i]?.start || '')}`"
                    class="text-right text-no-wrap"
                  >
                    {{ prNumber(v) }}
                  </td>
                  <td data-label="Cambio" class="text-right text-no-wrap font-weight-bold">
                    {{ channelDelta(series.weeks) }}
                  </td>
                </tr>
              </tbody>
            </VTable>
          </section>
        </VCol>
        <VCol cols="12" md="5">
          <section aria-labelledby="devices-title">
            <h2 id="devices-title" class="text-h6 font-weight-bold mb-1">Celular o computadora</h2>
            <p class="text-body-2 text-medium-emphasis mb-3">
              Porción de las visitas en la primera y en la última semana.
            </p>
            <div v-for="d in deviceRows" :key="d.label" class="mb-3">
              <div class="d-flex justify-space-between text-body-2">
                <span>{{ deviceLabel(d.label) }}</span>
                <span class="text-no-wrap">
                  {{ prPercent(d.first) }} → <strong>{{ prPercent(d.last) }}</strong>
                </span>
              </div>
              <VProgressLinear :model-value="d.last * 100" color="primary" height="8" rounded />
            </div>
          </section>
        </VCol>
      </VRow>

      <section class="mb-4" aria-labelledby="method-title">
        <h2 id="method-title" class="text-h6 font-weight-bold mb-2">Cómo se mide</h2>
        <ul class="text-body-2 top-pages__method">
          <li>
            <strong>Sólo visitas desde Uruguay.</strong> Google Analytics también cuenta tráfico
            automatizado de otros países que no son lectores; mezclarlo cambiaría el orden de la
            lista.
          </li>
          <li>
            <strong>"Por semana" es la mediana</strong> de las semanas en que la página tuvo
            visitas, sin la semana de un pico. "28 días" es la suma, tal cual.
          </li>
          <li>
            <strong>La tendencia</strong> compara las dos últimas semanas con las anteriores, por
            semana. "Pico" es una página que tuvo una semana sola con el triple de visitas que la
            segunda mejor, y después bajó.
          </li>
          <li>
            <strong>Tiempo</strong> es el tiempo promedio que cada persona tuvo la página abierta y
            en primer plano.
          </li>
          <li>
            Quedan fuera las páginas de cuenta y las privadas, las versiones en inglés y portugués,
            las páginas de error y las páginas de detalle de los directorios (cada aviso de
            alquiler, cada auto, cada modelo de celular), que sí cuentan en los temas.
          </li>
          <li>
            Las direcciones se publican sin lo que va después del signo de pregunta: nada de lo que
            alguien escribió en el buscador aparece acá. Los totales del sitio entero, con todos los
            países, están en
            <NuxtLink to="/estadisticas-del-sitio">estadísticas del sitio</NuxtLink>.
          </li>
        </ul>
      </section>
    </template>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  prChannelLabel,
  prLabel,
  prNumber,
  prPercent,
  prSeconds,
  prTrend,
  prWeekBars,
} from '~/utils/pageRanking'
import {
  channelChange,
  deviceLabel,
  familyTopic,
  topicOf,
  weekShares,
  type TopPageRow,
  type TopPagesSnapshot,
} from '~/utils/topPages'

const { t } = useI18n()

const { data } = await useFetch<TopPagesSnapshot | null>('/api/site-top-pages')
const snapshot = computed(() => (data.value && data.value.pages?.length ? data.value : null))

const STEP = 25
const limit = ref(STEP)
const sectionFilter = ref<string | null>(null)

/** Tema (sección de la navegación) de cada página listada. */
const topics = computed(() => {
  const map = new Map<string, { label: string; section: string }>()
  for (const row of snapshot.value?.pages || []) {
    const topic = topicOf(row.path, t)
    if (topic) map.set(row.path, topic)
  }
  return map
})

const sectionFilters = computed(() => {
  const counts = new Map<string, number>()
  for (const topic of topics.value.values())
    counts.set(topic.section, (counts.get(topic.section) || 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([section]) => section)
})

const filteredPages = computed(() =>
  (snapshot.value?.pages || []).filter(
    row => !sectionFilter.value || topics.value.get(row.path)?.section === sectionFilter.value
  )
)
const visiblePages = computed(() => filteredPages.value.slice(0, limit.value))
watch(sectionFilter, () => (limit.value = STEP))

const topTenShare = computed(() => {
  const s = snapshot.value
  if (!s || !s.totals.viewsUy) return 0
  const top = [...s.pages]
    .sort((a, b) => b.views - a.views)
    .slice(0, 10)
    .reduce((acc, p) => acc + p.views, 0)
  return top / s.totals.viewsUy
})

/** Canales con volumen de verdad: "Otros sitios" con 1 → 5 visitas no es un +400 % que decir. */
const CHANNEL_MIN_SESSIONS = 40
const channelRows = computed(() =>
  (snapshot.value?.totals.weeklyChannels || []).filter(
    s => s.weeks.reduce((a, b) => a + b, 0) >= CHANNEL_MIN_SESSIONS
  )
)
/** Cambio de la primera a la última semana, sólo si la primera semana lo sostiene. */
const channelDelta = (weeks: number[]) => {
  const change = (weeks[0] || 0) >= 20 ? channelChange(weeks) : null
  return change === null ? '—' : prTrend(change)
}
const searchChange = computed(() => {
  const search = snapshot.value?.totals.weeklyChannels.find(s => s.label === 'Organic Search')
  return search ? channelChange(search.weeks) : null
})

const deviceRows = computed(() => {
  const series = snapshot.value?.totals.weeklyDevices || []
  const weeks = series[0]?.weeks.length || 0
  if (!weeks) return []
  const first = weekShares(series, 0)
  const last = weekShares(series, weeks - 1)
  // Sin la tablet en 0 % → 0 %: no dice nada.
  return series
    .map((s, i) => ({ label: s.label, first: first[i].share, last: last[i].share }))
    .filter(d => d.first >= 0.005 || d.last >= 0.005)
})

/** Las medianas pueden terminar en ,5: en una página pública se leen como enteros. */
const whole = (n: number | null) => prNumber(Math.round(n || 0))

/** Un tema chico no es "0 %". */
const sharePct = (x: number) => (x > 0 && x < 0.005 ? '<1 %' : prPercent(x))

const trendClass = (row: TopPageRow) =>
  row.isPeak || row.trend === null
    ? 'text-medium-emphasis'
    : row.trend <= -0.4
      ? 'text-error'
      : row.trend >= 0.5
        ? 'text-success'
        : ''

/** `2026-09-01` → `1/9`. */
const dayLabel = (ymd: string) => {
  const [, m, d] = ymd.split('-').map(Number)
  return m && d ? `${d}/${m}` : ymd
}

// ── SEO ──────────────────────────────────────────────────────────────────────────────────────
// Absoluto y LITERAL: la página es sólo en español y el canonical tiene que ser el mismo string
// también bajo /en/ y /pt/.
const CANONICAL = 'https://cambio-uruguay.com/paginas-mas-visitadas'
const seoTitle = 'Las páginas más visitadas del sitio'
const seoDescription =
  'Las 100 páginas más visitadas desde Uruguay en 28 días, las que están creciendo, las que citan ' +
  'ChatGPT y otras IA, y cómo llega la gente.'

defineOgImageComponent('Cambio', {
  title: 'Las páginas más visitadas',
  subtitle: 'Qué se consulta en Uruguay, semana a semana',
  tag: 'TRANSPARENCIA',
})

useSeoMeta({
  title: `${seoTitle} | Cambio Uruguay`,
  description: seoDescription,
  ogTitle: seoTitle,
  ogDescription: seoDescription,
  ogType: 'website',
  ogUrl: CANONICAL,
  twitterCard: 'summary_large_image',
  twitterTitle: seoTitle,
  twitterDescription: seoDescription,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: CANONICAL }],
  script: [
    {
      type: 'application/ld+json',
      // `Dataset` por la misma razón que /estadisticas-del-sitio: lo que se publica es un conjunto
      // de datos con fecha, y las fechas salen del documento, no del build. `ItemList` con las diez
      // primeras para que el resultado pueda mostrarlas como lista.
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Dataset',
            '@id': CANONICAL,
            name: seoTitle,
            description: seoDescription,
            url: CANONICAL,
            inLanguage: 'es-UY',
            isAccessibleForFree: true,
            license: 'https://cambio-uruguay.com/terminos',
            creator: {
              '@type': 'Organization',
              name: 'Cambio Uruguay',
              url: 'https://cambio-uruguay.com',
            },
            temporalCoverage: snapshot.value
              ? `${snapshot.value.range.start}/${snapshot.value.range.end}`
              : undefined,
            dateModified: snapshot.value?.asOf ?? undefined,
            variableMeasured: ['Visitas por semana', 'Visitas en 28 días', 'Tiempo en la página'],
          },
          ...(snapshot.value
            ? [
                {
                  '@type': 'ItemList',
                  name: 'Las diez páginas más visitadas',
                  itemListElement: snapshot.value.pages.slice(0, 10).map((row, i) => ({
                    '@type': 'ListItem',
                    position: i + 1,
                    name: prLabel(row),
                    url: `https://cambio-uruguay.com${row.path === '/' ? '' : row.path}`,
                  })),
                },
              ]
            : []),
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Cambio Uruguay',
                item: 'https://cambio-uruguay.com',
              },
              { '@type': 'ListItem', position: 2, name: seoTitle, item: CANONICAL },
            ],
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.top-pages__eyebrow {
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.4;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
}
.top-pages__title {
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.02em;
}
.top-pages__lead {
  max-width: 48rem;
}
.top-pages__subject {
  max-width: 26rem;
  overflow-wrap: anywhere;
}
.top-pages__bars {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 22px;
}
.top-pages__bar {
  width: 8px;
  background: rgb(var(--v-theme-primary));
  opacity: 0.8;
}
.top-pages__method li {
  margin-bottom: 0.4rem;
}
</style>
