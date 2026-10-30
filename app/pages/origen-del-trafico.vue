<!--
  THESIS: De dónde viene la gente que visita el sitio, contado en público: buscadores, asistentes
  de IA, redes, los sitios web que enlazan (y si alguno trae mucha gente), y cómo cambió mes a mes.
  OWN-WORLD: Tercera hermana de /estadisticas-del-sitio y /paginas-mas-visitadas (misma fuente,
  GA4, mismo tono de transparencia). El documento llega armado campo por campo, sin nada privado
  (classes/site-analytics/trafficSources.ts); acá sólo se decide cómo contarlo
  (utils/trafficSources.ts).
  FAMILY: Sólo español; canonical literal aunque la ruta exista bajo /en/ y /pt/.
-->
<template>
  <VContainer class="traffic py-6 py-md-10">
    <header class="mb-6">
      <p class="traffic__eyebrow mb-2">Transparencia · últimos 90 días</p>
      <h1 class="traffic__title mb-3">De dónde viene la gente que visita Cambio Uruguay</h1>
      <p class="text-body-1 traffic__lead mb-2">
        Qué buscadores, qué asistentes de IA, qué redes y qué sitios web mandan visitas, cuáles lo
        hacen todos los días y cuál trajo mucha gente de golpe.
      </p>
      <p v-if="snapshot" class="text-body-2 text-medium-emphasis">
        Del {{ dayLabel(snapshot.range.start) }} al {{ dayLabel(snapshot.range.end) }}, con la
        historia mes a mes desde {{ monthLabel(snapshot.months[0] || '') }}. Se actualiza todos los
        días con Google Analytics.
      </p>
    </header>

    <VAlert v-if="!snapshot" type="info" variant="tonal" class="mb-6">
      Todavía no hay datos para mostrar. Se calculan una vez por día; volvé a mirar mañana.
    </VAlert>

    <template v-else>
      <section class="mb-8" aria-labelledby="answer-title">
        <VCard variant="tonal" color="primary" class="pa-5">
          <h2 id="answer-title" class="text-h6 font-weight-bold mb-3">La respuesta corta</h2>
          <ul class="text-body-1 traffic__answer">
            <li>
              <strong>{{ prPercent(answer.searchShareUy) }}</strong> {{ searchSentence }}
            </li>
            <li v-if="answer.spike">
              El enlace que más gente trajo fue en <strong>{{ answer.spike.label }}</strong
              >:
              {{ spikeSentence }}
              <template v-if="answer.spike.landing">
                Casi todas fueron a
                <NuxtLink :to="answer.spike.landing">{{ answer.spike.landing }}</NuxtLink
                >.
              </template>
              Fue un día: no se repitió.
            </li>
            <li v-if="answer.rising">
              <strong>{{ answer.rising.label }}</strong> es la fuente que más crece:
              {{ prNumber(answer.rising.recent) }} visitas en los últimos tres meses contra
              {{ prNumber(answer.rising.before) }} en los tres anteriores.
            </li>
            <li v-if="answer.steady.length">
              Los que mandan gente casi todos los días son
              <strong>{{ listOf(answer.steady.map(s => s.label)) }}</strong
              >.
            </li>
            <li>
              <template v-if="answer.websites.top">
                Los sitios web que enlazan trajeron {{ prNumber(answer.websites.total) }} visitas en
                dos años; el que más, {{ answer.websites.top.label }} ({{
                  prNumber(answer.websites.top.history)
                }}).
              </template>
              <template v-else>Ningún sitio web que enlace trajo visitas en dos años.</template>
              <template v-if="websitesAreSmall">
                Hoy ningún backlink de otro sitio trae una cantidad grande de gente.
              </template>
            </li>
          </ul>
        </VCard>
      </section>

      <div class="d-flex flex-wrap align-center ga-3 mb-4">
        <span class="text-body-2 text-medium-emphasis">Contar visitas</span>
        <VBtnToggle
          v-model="scope"
          mandatory
          density="comfortable"
          variant="outlined"
          color="primary"
          divided
        >
          <VBtn value="uy">Desde Uruguay</VBtn>
          <VBtn value="all">De todo el mundo</VBtn>
        </VBtnToggle>
      </div>
      <p v-if="scope === 'all'" class="text-body-2 text-medium-emphasis mb-4">
        Con todos los países, "Directo" crece mucho: ahí cae también el tráfico automatizado que
        ejecuta la página sin ser un lector.
      </p>

      <section class="mb-8" aria-labelledby="kinds-title">
        <h2 id="kinds-title" class="text-h6 font-weight-bold mb-1">Cómo llega la gente</h2>
        <p class="text-body-2 text-medium-emphasis mb-3">
          Visitas al sitio de los últimos 90 días, según de dónde vienen. "Con interacción" es la
          porción que se quedó más de diez segundos, vio dos páginas o hizo algo.
        </p>
        <VTable density="comfortable" class="cu-mobile-cards traffic__table">
          <thead>
            <tr>
              <th>De dónde</th>
              <th class="text-right">90 días</th>
              <th class="text-right">Del total</th>
              <th class="text-right">Con interacción</th>
              <th class="text-right">24 meses</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in kindRows" :key="row.kind">
              <td data-label="De dónde" class="traffic__subject">
                <span class="font-weight-medium">{{ KIND_LABELS[row.kind] }}</span>
                <div class="text-caption text-medium-emphasis">{{ KIND_HINTS[row.kind] }}</div>
              </td>
              <td data-label="90 días" class="text-right text-no-wrap font-weight-bold">
                {{ prNumber(row.sessions) }}
              </td>
              <td data-label="Del total" class="text-right text-no-wrap">
                {{ sharePct(row.share) }}
              </td>
              <td data-label="Con interacción" class="text-right text-no-wrap">
                {{ rateLabel(row.rate) }}
              </td>
              <td data-label="24 meses" class="text-right text-no-wrap">
                {{ prNumber(row.history) }}
              </td>
            </tr>
          </tbody>
        </VTable>
      </section>

      <section class="mb-8" aria-labelledby="months-title">
        <h2 id="months-title" class="text-h6 font-weight-bold mb-1">Mes a mes</h2>
        <p class="text-body-2 text-medium-emphasis mb-3">
          Visitas por mes según de dónde vienen. Tocá o pasá por encima de un mes para ver el
          detalle. El último mes está en curso.
        </p>
        <div class="traffic-chart">
          <ul class="traffic-chart__legend" aria-label="Series del gráfico">
            <li v-for="(series, i) in CHART_SERIES" :key="series.id">
              <span class="traffic-chart__swatch" :class="`traffic-chart__s${i + 1}`" />
              {{ series.label }}
            </li>
          </ul>
          <div class="traffic-chart__scroll">
            <div class="traffic-chart__plot" role="img" :aria-label="chartAria">
              <button
                v-for="(m, i) in chartMonths"
                :key="m.month"
                type="button"
                class="traffic-chart__col"
                :class="{ 'is-active': i === activeMonth }"
                :aria-label="monthReadout(m)"
                @mouseenter="hoverMonth = i"
                @focus="hoverMonth = i"
                @click="hoverMonth = i"
              >
                <span class="traffic-chart__area">
                  <span
                    class="traffic-chart__stack"
                    :class="{ 'is-small': barHeight(m) < SMALL_BAR }"
                    :style="{ height: `${barHeight(m)}%` }"
                  >
                    <span
                      v-for="(v, s) in m.values"
                      v-show="v > 0"
                      :key="s"
                      class="traffic-chart__seg"
                      :class="`traffic-chart__s${s + 1}`"
                      :style="{ flexGrow: v }"
                    />
                  </span>
                </span>
                <span
                  class="traffic-chart__label"
                  :class="{ 'is-minor': (chartMonths.length - 1 - i) % 3 !== 0 }"
                  >{{ monthLabel(m.month, true) }}</span
                >
              </button>
            </div>
          </div>
          <p v-if="activeChartMonth" class="text-body-2 traffic-chart__readout" aria-live="polite">
            <strong>{{ monthLabel(activeChartMonth.month) }}:</strong>
            {{ prNumber(activeChartMonth.total) }} visitas — {{ readoutParts(activeChartMonth) }}
          </p>
          <details class="mt-2">
            <summary class="text-body-2">Ver los números en una tabla</summary>
            <div class="traffic__overflow">
              <VTable density="compact" class="traffic__table">
                <thead>
                  <tr>
                    <th>Mes</th>
                    <th v-for="series in CHART_SERIES" :key="series.id" class="text-right">
                      {{ series.label }}
                    </th>
                    <th class="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="m in chartMonths" :key="m.month">
                    <td class="text-no-wrap">{{ monthLabel(m.month) }}</td>
                    <td v-for="(v, s) in m.values" :key="s" class="text-right text-no-wrap">
                      {{ prNumber(v) }}
                    </td>
                    <td class="text-right text-no-wrap font-weight-bold">
                      {{ prNumber(m.total) }}
                    </td>
                  </tr>
                </tbody>
              </VTable>
            </div>
          </details>
        </div>
      </section>

      <section class="mb-8" aria-labelledby="sources-title">
        <h2 id="sources-title" class="text-h6 font-weight-bold mb-1">
          Quién manda gente, uno por uno
        </h2>
        <p class="text-body-2 text-medium-emphasis mb-3">
          Cada buscador, asistente, red y sitio que trajo al menos {{ MIN_LISTED }} visitas en dos
          años, ordenados por lo que trajeron en ese tiempo. "Cómo trae gente" y "Adónde llegan" se
          calculan con las visitas de todo el mundo.
          <template v-if="snapshot.others.count">
            Otras {{ prNumber(snapshot.others.count) }} fuentes trajeron menos y suman
            {{ prNumber(snapshot.others.history) }} visitas.
          </template>
        </p>
        <div class="d-flex flex-wrap ga-2 mb-3" role="group" aria-label="Filtrar por tipo">
          <VChip
            v-for="k in kindFilters"
            :key="k"
            :variant="kindFilter === k ? 'flat' : 'outlined'"
            :color="kindFilter === k ? 'primary' : undefined"
            size="small"
            @click="kindFilter = kindFilter === k ? null : k"
          >
            {{ KIND_LABELS[k] }}
          </VChip>
        </div>
        <VTable density="comfortable" class="cu-mobile-cards traffic__table">
          <thead>
            <tr>
              <th>Fuente</th>
              <th class="text-right text-no-wrap">90 días</th>
              <th class="text-right text-no-wrap">24 meses</th>
              <th class="text-right">Con interacción</th>
              <th>Cómo trae gente</th>
              <th>Adónde llegan</th>
              <th>Mes a mes</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in sourceRows" :key="row.id">
              <td data-label="Fuente" class="traffic__subject">
                <a
                  v-if="row.kind === 'sitio' && linkableHost(row.id)"
                  :href="`https://${row.id}`"
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  class="font-weight-medium"
                  >{{ row.label }}</a
                >
                <span v-else class="font-weight-medium">{{ row.label }}</span>
                <div class="text-caption text-medium-emphasis">{{ KIND_LABELS[row.kind] }}</div>
              </td>
              <td data-label="90 días" class="text-right text-no-wrap font-weight-bold">
                {{ prNumber(row.recent) }}
              </td>
              <td data-label="24 meses" class="text-right text-no-wrap">
                {{ prNumber(row.total) }}
              </td>
              <td data-label="Con interacción" class="text-right text-no-wrap">
                {{ rateLabel(row.rate) }}
              </td>
              <td data-label="Cómo trae gente" class="text-no-wrap">
                <template v-if="row.pattern">
                  <VChip size="x-small" :color="patternColor(row.pattern)" variant="tonal">
                    {{ PATTERN_LABELS[row.pattern] }}
                  </VChip>
                  <div v-if="row.pattern === 'pico' && row.peak" class="text-caption">
                    {{ prNumber(row.peak.sessions) }} el {{ dayLabel(row.peak.day) }}
                  </div>
                  <div v-else-if="row.activeDays" class="text-caption text-medium-emphasis">
                    {{ prNumber(row.activeDays) }} días con visitas
                  </div>
                </template>
                <span v-else class="text-medium-emphasis">—</span>
              </td>
              <td data-label="Adónde llegan" class="traffic__landing">
                <NuxtLink v-if="row.landings[0]" :to="row.landings[0].path">
                  {{ pathLabel(row.landings[0].path) }}
                </NuxtLink>
                <span v-else class="text-medium-emphasis">—</span>
                <div
                  v-if="row.landings[0] && row.landingShare !== null"
                  class="text-caption text-medium-emphasis"
                >
                  {{ prPercent(row.landingShare) }} de sus visitas
                </div>
              </td>
              <td data-label="Mes a mes">
                <span
                  class="traffic__bars"
                  role="img"
                  :aria-label="`Visitas por mes: ${row.monthly.join(', ')}`"
                >
                  <span
                    v-for="(h, i) in prWeekBars(row.monthly)"
                    :key="i"
                    class="traffic__bar"
                    :style="{ height: h > 0 ? `${Math.max(8, Math.round(h * 100))}%` : '1px' }"
                  />
                </span>
              </td>
            </tr>
          </tbody>
        </VTable>
        <p v-if="!sourceRows.length" class="text-body-2 text-medium-emphasis mt-2">
          No hay fuentes de este tipo con visitas suficientes.
        </p>
      </section>

      <section v-if="snapshot.referrers.length" class="mb-8" aria-labelledby="referrers-title">
        <h2 id="referrers-title" class="text-h6 font-weight-bold mb-1">Las páginas que enlazan</h2>
        <p class="text-body-2 text-medium-emphasis mb-3">
          La página exacta de otro sitio donde estaba el enlace, cuando el sitio lo informa. X y
          Reddit sólo avisan su dominio, así que el posteo no aparece.
        </p>
        <VList density="compact" class="bg-transparent pa-0">
          <VListItem v-for="row in snapshot.referrers" :key="row.url" class="px-0">
            <a
              :href="`https://${row.url}`"
              target="_blank"
              rel="nofollow noopener noreferrer"
              class="font-weight-medium traffic__url"
              >{{ row.url }}</a
            >
            <div class="text-body-2 text-medium-emphasis">
              {{ prNumber(row.views) }} visitas en dos años · {{ KIND_LABELS[row.kind] }}
            </div>
          </VListItem>
        </VList>
      </section>

      <section class="mb-8" aria-labelledby="blind-title">
        <h2 id="blind-title" class="text-h6 font-weight-bold mb-2">Lo que esta página no ve</h2>
        <ul class="text-body-2 traffic__method">
          <li>
            <strong>Enlaces que nadie cliquea.</strong> Google Analytics cuenta visitas, no enlaces:
            un sitio que enlaza y no manda a nadie no aparece acá, aunque a Google le sirva para
            ordenar resultados.
          </li>
          <li>
            <strong>Las apps que no avisan de dónde vienen.</strong> Un enlace abierto desde
            WhatsApp, Instagram o la app de un correo suele llegar sin decirlo, y cuenta como
            directo.
          </li>
          <li>
            <strong>Quien rechaza las cookies de medición.</strong> Esas visitas no llegan a Google
            Analytics.
          </li>
        </ul>
      </section>

      <section class="mb-4" aria-labelledby="method-title">
        <h2 id="method-title" class="text-h6 font-weight-bold mb-2">Cómo se mide</h2>
        <ul class="text-body-2 traffic__method">
          <li>
            <strong>Sólo este sitio.</strong> La misma cuenta de Google Analytics recibió datos de
            otra aplicación y de servidores de prueba; todo se filtra por la dirección del sitio.
          </li>
          <li>
            <strong>Una fuente, una fila.</strong> Las variantes de una misma fuente se juntan: los
            enlaces cortos de X, la app de Reddit, los Yahoo de cada país.
          </li>
          <li>
            <strong>"Un pico"</strong> es una fuente que trajo en un solo día la mitad o más de todo
            lo que mandó en dos años. <strong>"En alza"</strong>: los últimos tres meses duplican a
            los tres anteriores. <strong>"Constante"</strong>: visitas en {{ STEADY_DAYS }} días
            distintos o más.
          </li>
          <li>
            <strong>Sin datos de nadie.</strong> Las direcciones se publican sin lo que va después
            del signo de pregunta, las fuentes con menos de {{ MIN_LISTED }} visitas sólo se
            cuentan, y nunca se publica la página de un correo, un buscador o un asistente de IA.
          </li>
          <li>
            Los totales del sitio están en
            <NuxtLink to="/estadisticas-del-sitio">estadísticas del sitio</NuxtLink> y lo que más se
            lee, en <NuxtLink to="/paginas-mas-visitadas">las páginas más visitadas</NuxtLink>.
          </li>
        </ul>
      </section>
    </template>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { prNumber, prPercent, prWeekBars } from '~/utils/pageRanking'
import {
  CHART_SERIES,
  dayLabel,
  engagementRate,
  KIND_HINTS,
  KIND_LABELS,
  linkableHost,
  monthLabel,
  monthlyChart,
  PATTERN_LABELS,
  patternOf,
  shortAnswer,
  STEADY_DAYS,
  trimLeadingEmpty,
  type ChartMonth,
  type SourceKind,
  type SourcePattern,
  type TrafficSourcesSnapshot,
} from '~/utils/trafficSources'

/** Espejo de `MIN_LISTED_SESSIONS` del job: sólo para el texto. */
const MIN_LISTED = 3

const { data } = await useFetch<TrafficSourcesSnapshot | null>('/api/site-traffic-sources')
const snapshot = computed(() => (data.value && data.value.sources?.length ? data.value : null))

const scope = ref<'uy' | 'all'>('uy')
const uy = computed(() => scope.value === 'uy')

const answer = computed(() => shortAnswer(snapshot.value!))
const google = computed(() => snapshot.value?.sources.find(s => s.id === 'google') || null)
// Las frases con comas se arman acá: un `<template v-if>` en medio de una oración deja un blanco
// antes de la coma ("buscador , y casi").
const searchSentence = computed(() => {
  const g = google.value
  return (
    'de las visitas desde Uruguay llegan desde un buscador' +
    (g ? `, y casi todas desde Google (${prNumber(g.sessionsUy)} en 90 días).` : '.')
  )
})
const spikeSentence = computed(() => {
  const s = answer.value.spike
  return s
    ? `${prNumber(s.sessions)} visitas el ${dayLabel(s.day)}, el ${prPercent(s.share)} de todo ` +
        'lo que esa fuente mandó en dos años.'
    : ''
})
/** Los sitios web trajeron menos del 1 % de las visitas en dos años. */
const websitesAreSmall = computed(() => {
  const total = snapshot.value?.totals.history || 0
  return total > 0 && answer.value.websites.total / total < 0.01
})

const kindRows = computed(() => {
  const s = snapshot.value
  if (!s) return []
  const total = uy.value ? s.totals.sessionsUy : s.totals.sessions
  return s.kinds
    .map(k => {
      const sessions = uy.value ? k.sessionsUy : k.sessions
      const engaged = uy.value ? k.engagedSessionsUy : k.engagedSessions
      return {
        kind: k.kind,
        sessions,
        share: total > 0 ? sessions / total : 0,
        rate: engagementRate(engaged, sessions),
        history: uy.value ? k.historyUy : k.history,
      }
    })
    .filter(k => k.sessions > 0 || k.history > 0)
    .sort((a, b) => b.sessions - a.sessions)
})

const chartMonths = computed(() =>
  snapshot.value ? trimLeadingEmpty(monthlyChart(snapshot.value, uy.value)) : []
)
const chartMax = computed(() => Math.max(1, ...chartMonths.value.map(m => m.total)))
const barHeight = (m: ChartMonth) =>
  m.total > 0 ? Math.max(1, (m.total / chartMax.value) * 100) : 0
/**
 * Por debajo de esta altura (en % del más alto) la barra va sin huecos entre colores: con 2 px por
 * hueco, una barra de 5 px se volvía cinco rayas iguales y exageraba las series chicas.
 */
const SMALL_BAR = 12
const hoverMonth = ref<number | null>(null)
/** Sin mes elegido, el último mes completo (el último está en curso). */
const activeMonth = computed(() =>
  hoverMonth.value !== null && hoverMonth.value < chartMonths.value.length
    ? hoverMonth.value
    : Math.max(0, chartMonths.value.length - 2)
)
const activeChartMonth = computed(() => chartMonths.value[activeMonth.value] || null)
const readoutParts = (m: ChartMonth) =>
  CHART_SERIES.map((series, s) =>
    m.values[s] > 0 ? `${series.label} ${prNumber(m.values[s])}` : ''
  )
    .filter(Boolean)
    .join(' · ')
const monthReadout = (m: ChartMonth) =>
  `${monthLabel(m.month)}: ${prNumber(m.total)} visitas. ` +
  CHART_SERIES.map((series, s) => `${series.label} ${prNumber(m.values[s])}`).join(', ')
const chartAria = computed(
  () =>
    `Visitas por mes según de dónde vienen, de ${monthLabel(chartMonths.value[0]?.month || '')} ` +
    `a ${monthLabel(chartMonths.value[chartMonths.value.length - 1]?.month || '')}`
)

const kindFilter = ref<SourceKind | null>(null)
const kindFilters = computed(() => {
  const seen = new Set((snapshot.value?.sources || []).map(s => s.kind))
  return (Object.keys(KIND_LABELS) as SourceKind[]).filter(k => seen.has(k))
})

const sourceRows = computed(() =>
  (snapshot.value?.sources || [])
    .filter(s => !kindFilter.value || s.kind === kindFilter.value)
    .map(s => {
      const recent = uy.value ? s.sessionsUy : s.sessions
      const total = uy.value ? s.historyUy : s.history
      return {
        ...s,
        recent,
        total,
        rate: engagementRate(uy.value ? s.engagedSessionsUy : s.engagedSessions, recent),
        pattern: patternOf(s),
        landingShare: s.landings[0] && s.history > 0 ? s.landings[0].sessions / s.history : null,
      }
    })
    .filter(s => s.total > 0 || s.recent > 0)
    .sort((a, b) => b.total - a.total || b.recent - a.recent || a.label.localeCompare(b.label))
)

const patternColor = (p: SourcePattern) =>
  p === 'pico' ? 'warning' : p === 'en-alza' ? 'success' : p === 'constante' ? 'info' : undefined

const pathLabel = (path: string) => (path === '/' ? 'Portada' : path)
const rateLabel = (rate: number | null) => (rate === null ? '—' : prPercent(rate))
/** Un tipo chico no es "0 %". */
const sharePct = (x: number) => (x > 0 && x < 0.005 ? '<1 %' : prPercent(x))
const listOf = (xs: string[]) =>
  xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`

// ── SEO ──────────────────────────────────────────────────────────────────────────────────────
// Absoluto y LITERAL: la página es sólo en español y el canonical tiene que ser el mismo string
// también bajo /en/ y /pt/.
const CANONICAL = 'https://cambio-uruguay.com/origen-del-trafico'
const seoTitle = 'De dónde viene la gente que visita el sitio'
const seoDescription =
  'Buscadores, asistentes de IA, redes y sitios que enlazan: de dónde llegan las visitas a ' +
  'Cambio Uruguay, mes a mes, y si algún enlace trae mucha gente.'

defineOgImageComponent('Cambio', {
  title: 'De dónde viene la gente',
  subtitle: 'Buscadores, IA, redes y los sitios que enlazan',
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
      // `Dataset` como sus dos hermanas: lo publicado es un conjunto de datos con fecha, y las
      // fechas salen del documento, no del build.
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
              ? `${snapshot.value.history.start}/${snapshot.value.history.end}`
              : undefined,
            dateModified: snapshot.value?.asOf ?? undefined,
            variableMeasured: [
              'Visitas por fuente',
              'Visitas por tipo de fuente',
              'Visitas por mes',
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
.traffic__eyebrow {
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.4;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
}
.traffic__title {
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.02em;
}
.traffic__lead {
  max-width: 48rem;
}
.traffic__answer {
  padding-left: 1.2rem;
}
.traffic__answer li {
  margin-bottom: 0.45rem;
}
.traffic__subject {
  max-width: 24rem;
  overflow-wrap: anywhere;
}
.traffic__landing,
.traffic__url {
  overflow-wrap: anywhere;
}
.traffic__overflow {
  overflow-x: auto;
}
.traffic__bars {
  display: inline-flex;
  align-items: flex-end;
  gap: 1px;
  height: 22px;
}
.traffic__bar {
  width: 3px;
  background: rgb(var(--v-theme-primary));
  opacity: 0.8;
}
.traffic__method li {
  margin-bottom: 0.4rem;
}

/*
 * El gráfico mes a mes. Las cinco series usan las cinco primeras ranuras de la paleta categórica
 * validada (claro y oscuro, pares vecinos con daltonismo), en ese orden: ver CHART_SERIES en
 * utils/trafficSources.ts. En claro tres colores quedan por debajo de 3:1 contra el fondo, por eso
 * la leyenda, la línea de detalle y la tabla de abajo cuentan lo mismo con texto.
 */
.traffic-chart {
  --s1: #2a78d6;
  --s2: #eb6834;
  --s3: #1baf7a;
  --s4: #eda100;
  --s5: #e87ba4;
}
.v-theme--dark .traffic-chart {
  --s1: #3987e5;
  --s2: #d95926;
  --s3: #199e70;
  --s4: #c98500;
  --s5: #d55181;
}
.traffic-chart__s1 {
  background: var(--s1);
}
.traffic-chart__s2 {
  background: var(--s2);
}
.traffic-chart__s3 {
  background: var(--s3);
}
.traffic-chart__s4 {
  background: var(--s4);
}
.traffic-chart__s5 {
  background: var(--s5);
}
.traffic-chart__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 1rem;
  list-style: none;
  padding: 0;
  margin: 0 0 0.75rem;
  font-size: 0.875rem;
}
.traffic-chart__legend li {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
.traffic-chart__swatch {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}
.traffic-chart__scroll {
  overflow-x: auto;
  /* Lugar para que la etiqueta del primer y del último mes desborde su columna sin cortarse. */
  padding-inline: 0.75rem;
}
.traffic-chart__plot {
  display: flex;
  align-items: stretch;
  gap: 4px;
  height: 240px;
  min-width: 18rem;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.traffic-chart__col {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: stretch;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  border-radius: 4px 4px 0 0;
}
.traffic-chart__col:hover,
.traffic-chart__col:focus-visible,
.traffic-chart__col.is-active {
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.traffic-chart__area {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-height: 0;
}
.traffic-chart__stack {
  display: flex;
  flex-direction: column-reverse;
  gap: 2px;
  margin: 0 2px;
  overflow: hidden;
  border-radius: 4px 4px 0 0;
}
.traffic-chart__seg {
  flex-basis: 0;
  min-height: 2px;
}
.traffic-chart__stack.is-small {
  gap: 0;
}
.traffic-chart__stack.is-small .traffic-chart__seg {
  min-height: 0;
}
.traffic-chart__label {
  /* Flex y no block: una etiqueta más ancha que su columna se desborda parejo hacia los dos lados. */
  display: flex;
  justify-content: center;
  margin-top: 4px;
  font-size: 0.68rem;
  line-height: 1.2;
  text-align: center;
  white-space: nowrap;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
/* Angosto: una etiqueta cada tres meses, contando desde el último, para que no se pisen. */
@media (max-width: 760px) {
  .traffic-chart__plot {
    gap: 2px;
  }
  .traffic-chart__label.is-minor {
    visibility: hidden;
  }
  .traffic-chart__label {
    overflow: visible;
  }
}
.traffic-chart__readout {
  margin-top: 0.6rem;
  min-height: 2.6em;
}
</style>
