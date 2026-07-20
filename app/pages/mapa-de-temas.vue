<template>
  <div class="mapa-temas-page pb-8">
    <!-- Breadcrumb -->
    <div class="mb-3">
      <VBtn :to="localePath('/temas')" variant="text" size="small" class="px-1">
        <VIcon start size="small">mdi-arrow-left</VIcon>
        Temas
      </VBtn>
    </div>

    <!-- Header -->
    <VCard class="overflow-hidden mb-4" elevation="8">
      <div class="bg-gradient-mapa pa-6 on-dark">
        <span class="mapa-eyebrow">MAPA ANALÍTICO · ACTUALIZACIÓN TRIMESTRAL</span>
        <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-2 mt-1">
          Qué consultan los uruguayos sobre dinero
        </h1>
        <p class="text-body-1 text-grey-lighten-2 mb-0 mapa-intro">
          Cada 90 días cruzamos la <strong class="text-white">demanda real</strong> —lo que la gente
          pregunta en Reddit sobre plata, con volumen y momentum— contra
          <strong class="text-white">nuestra cobertura</strong> de guías, y le pedimos a la IA que
          lea el trimestre: qué crece, qué se enfría y dónde falta contenido.
        </p>
        <div class="d-flex flex-wrap align-center ga-3 mt-3">
          <VChip size="small" variant="flat" color="rgba(255,255,255,0.16)" class="mapa-stamp">
            <VIcon start size="14">mdi-robot-outline</VIcon>
            <span v-if="analysis?.asOf">Análisis IA: {{ fmtDate(analysis.asOf) }}</span>
            <span v-else>Análisis IA: en preparación</span>
          </VChip>
          <VChip
            v-if="nextRefreshDays !== null"
            size="small"
            variant="flat"
            color="rgba(255,255,255,0.16)"
            class="mapa-stamp"
          >
            <VIcon start size="14">mdi-calendar-refresh-outline</VIcon>
            Próximo en {{ nextRefreshDays }} días
          </VChip>
          <VSpacer class="d-none d-md-block" />
          <ShareButtons text="Mapa analítico de temas consultados en Uruguay" />
        </div>
      </div>
    </VCard>

    <!-- KPIs -->
    <VRow class="mb-2">
      <VCol cols="12" sm="4">
        <VCard class="kpi pa-4" variant="flat">
          <div class="kpi-value">{{ TOPIC_DEFS.length }}</div>
          <div class="kpi-label">temas de dinero monitoreados</div>
        </VCard>
      </VCol>
      <VCol cols="12" sm="4">
        <VCard class="kpi pa-4" variant="flat">
          <div class="kpi-value">
            <span v-if="hasDemand">{{ totalRecent }}</span
            ><span v-else class="kpi-dash">—</span>
          </div>
          <div class="kpi-label">consultas en los últimos 90 días</div>
        </VCard>
      </VCol>
      <VCol cols="12" sm="4">
        <VCard class="kpi pa-4" variant="flat">
          <div class="kpi-value kpi-gap">
            <span v-if="hasDemand">{{ gapCount }}</span
            ><span v-else class="kpi-dash">—</span>
          </div>
          <div class="kpi-label">gaps de cobertura detectados</div>
        </VCard>
      </VCol>
    </VRow>

    <!-- MAP -->
    <section class="mb-8">
      <h2 class="text-h6 font-weight-bold mb-1 mapa-section-title">
        <VIcon start size="small" color="primary">mdi-map-marker-radius-outline</VIcon>
        El mapa de la conversación
      </h2>
      <p class="text-body-2 text-grey-lighten-1 mb-4">
        Tamaño y posición horizontal = volumen de consultas. Altura y color = momentum de los
        últimos 90 días. Tocá un tema para ver el detalle y la lectura de la IA.
      </p>

      <VRow>
        <VCol cols="12" md="8">
          <VCard class="pa-2 pa-sm-3 map-card" variant="flat">
            <div class="d-flex align-center flex-wrap ga-3 px-2 pt-2 pb-1">
              <VBtnToggle
                v-model="mapMode"
                mandatory
                density="comfortable"
                variant="outlined"
                divided
              >
                <VBtn value="scatter" size="small">
                  <VIcon start size="16">mdi-scatter-plot</VIcon>
                  Burbujas
                </VBtn>
                <VBtn value="treemap" size="small">
                  <VIcon start size="16">mdi-view-grid-outline</VIcon>
                  Treemap
                </VBtn>
              </VBtnToggle>
              <VSpacer />
              <div class="d-flex align-center ga-2 legend-ramp">
                <span class="text-caption text-grey-lighten-1">enfría</span>
                <span class="ramp-bar" aria-hidden="true" />
                <span class="text-caption text-grey-lighten-1">crece</span>
              </div>
            </div>
            <ClientOnly>
              <MapaTopicMapChart
                :points="mapPoints"
                :mode="mapMode"
                :dark="isDark"
                :selected-id="selectedId"
                @select="select"
              />
              <template #fallback>
                <VSkeletonLoader type="image" class="map-skeleton" />
              </template>
            </ClientOnly>
          </VCard>
        </VCol>

        <!-- Detail panel -->
        <VCol cols="12" md="4">
          <VCard class="pa-4 h-100 detail-card" variant="flat">
            <template v-if="selected">
              <div class="d-flex align-center ga-3 mb-3">
                <VAvatar :style="{ background: selected.color }" size="42" class="detail-badge">
                  <VIcon size="22" color="#0a1020">{{ selected.icon }}</VIcon>
                </VAvatar>
                <div>
                  <div class="text-subtitle-1 font-weight-bold">{{ selected.label }}</div>
                  <div
                    class="text-caption d-flex align-center ga-1"
                    :style="{ color: trendColor(selected) }"
                  >
                    {{ TREND_META[selected.trend].arrow }} {{ TREND_META[selected.trend].label }} ·
                    {{ STATUS_LABEL[selected.status].toLowerCase() }}
                  </div>
                </div>
              </div>

              <VRow dense class="mb-1">
                <VCol cols="6">
                  <div class="detail-stat">
                    <div class="ds-k">VOLUMEN TOTAL</div>
                    <div class="ds-v">
                      <span v-if="hasDemand">{{ selected.total }}</span
                      ><span v-else>—</span>
                    </div>
                  </div>
                </VCol>
                <VCol cols="6">
                  <div class="detail-stat">
                    <div class="ds-k">ÚLTIMOS 90D</div>
                    <div class="ds-v">
                      <span v-if="hasDemand">{{ selected.recent }}</span
                      ><span v-else>—</span>
                    </div>
                  </div>
                </VCol>
              </VRow>

              <div class="mb-3">
                <div class="d-flex justify-space-between text-caption mb-1">
                  <span class="text-grey-lighten-1">Cobertura de contenido</span>
                  <span :style="{ color: STATUS_COLOR[selected.status] }" class="font-weight-bold">
                    {{ selected.cov }} {{ selected.cov === 1 ? 'guía' : 'guías' }}
                  </span>
                </div>
                <VProgressLinear
                  :model-value="Math.min(100, selected.cov * 18)"
                  :color="STATUS_COLOR[selected.status]"
                  height="8"
                  rounded
                  bg-color="rgba(127,147,179,0.22)"
                />
              </div>

              <div class="detail-insight">
                <div class="ai-tag">
                  <VIcon size="12">mdi-robot-outline</VIcon>
                  {{
                    analysis && analysisById[selected.id] ? 'Lectura de la IA' : 'Sobre este tema'
                  }}
                </div>
                {{ selected.insight }}
              </div>

              <div class="d-flex flex-wrap ga-2 mt-4 pt-3 detail-links">
                <VBtn
                  v-for="l in selected.related"
                  :key="l.to"
                  :to="localePath(l.to)"
                  size="x-small"
                  variant="tonal"
                  color="primary"
                >
                  {{ l.label }}
                  <VIcon end size="14">mdi-arrow-right</VIcon>
                </VBtn>
                <VBtn
                  v-if="selected.hub"
                  :to="localePath('/temas/' + selected.hub.slug)"
                  size="x-small"
                  variant="text"
                >
                  <VIcon start size="14">mdi-shape-outline</VIcon>
                  Hub: {{ selected.hub.title }}
                </VBtn>
              </div>
            </template>
            <div v-else class="detail-hint text-center text-grey-lighten-1">
              <VIcon size="34" class="mb-2 d-block mx-auto">mdi-gesture-tap</VIcon>
              Elegí un tema en el mapa para ver volumen, momentum, cobertura y la lectura de la IA.
            </div>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- RANKING -->
    <section class="mb-8">
      <h2 class="text-h6 font-weight-bold mb-1 mapa-section-title">
        <VIcon start size="small" color="primary">mdi-sort-variant</VIcon>
        Ranking por consultas de los últimos 90 días
      </h2>
      <p class="text-body-2 text-grey-lighten-1 mb-4">
        Los temas ordenados por demanda reciente, coloreados por momentum.
      </p>
      <VCard class="pa-3 pa-sm-4" variant="flat">
        <ClientOnly>
          <MapaTopicRankingChart
            v-if="hasDemand"
            :points="rankPoints"
            :dark="isDark"
            @select="select"
          />
          <div v-else class="text-body-2 text-grey-lighten-1 text-center py-8">
            Cargando el ranking en vivo…
          </div>
          <template #fallback>
            <VSkeletonLoader type="image" class="map-skeleton" />
          </template>
        </ClientOnly>
      </VCard>
    </section>

    <!-- COVERAGE -->
    <section class="mb-8">
      <h2 class="text-h6 font-weight-bold mb-1 mapa-section-title">
        <VIcon start size="small" color="primary">mdi-scale-balance</VIcon>
        Demanda vs. nuestra cobertura
      </h2>
      <p class="text-body-2 text-grey-lighten-1 mb-4">
        Cuánta gente pregunta sobre cada tema frente a cuántas guías nuestras lo responden. Los
        <strong class="gap-text">gaps</strong> son las oportunidades de contenido más claras.
      </p>
      <VCard variant="flat" class="overflow-hidden">
        <VTable class="coverage-table cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th>Tema</th>
              <th class="d-none d-sm-table-cell">Demanda 90d</th>
              <th class="text-center">Cobertura</th>
              <th class="text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="t in coverageRows"
              :key="t.id"
              class="coverage-row"
              :class="{ 'is-gap': t.status === 'gap' }"
              @click="select(t.id)"
            >
              <td data-label="">
                <div class="d-flex align-center ga-2">
                  <span class="cov-sq" :style="{ background: t.color }" />
                  <span class="font-weight-medium">{{ t.label }}</span>
                </div>
              </td>
              <td class="d-none d-sm-table-cell cov-demand" data-label="Demanda 90d">
                <VProgressLinear
                  v-if="hasDemand"
                  :model-value="maxRecent ? (t.recent / maxRecent) * 100 : 0"
                  color="primary"
                  height="8"
                  rounded
                  bg-color="rgba(127,147,179,0.18)"
                />
                <span v-else class="text-grey-lighten-1">—</span>
              </td>
              <td class="text-center num-cell" data-label="Cobertura">{{ t.cov }}</td>
              <td class="text-center" data-label="Estado">
                <VChip size="x-small" variant="flat" :style="statusChipStyle(t.status)">
                  {{ STATUS_LABEL[t.status] }}
                </VChip>
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
    </section>

    <!-- AI NARRATIVE -->
    <section class="mb-8">
      <h2 class="text-h6 font-weight-bold mb-1 mapa-section-title">
        <VIcon start size="small" color="primary">mdi-lightbulb-on-outline</VIcon>
        El análisis de la IA
      </h2>
      <p class="text-body-2 text-grey-lighten-1 mb-4">
        Generado con Gemini sobre los datos de demanda. Se regenera cada 90 días.
      </p>
      <VCard class="pa-5 pa-md-6 ai-card" variant="flat">
        <div class="ai-gemtag mb-4">
          <VIcon size="16">mdi-robot-outline</VIcon>
          ANÁLISIS GENERADO POR IA · TRIMESTRAL
        </div>

        <template v-if="analysis && analysis.overview.length">
          <p v-for="(p, i) in analysis.overview" :key="i" class="ai-para">{{ p }}</p>
        </template>
        <p v-else class="ai-para text-grey-lighten-1">
          La lectura trimestral de la IA se genera cuando hay datos de demanda suficientes. Mientras
          tanto, el mapa y el ranking de arriba ya muestran qué se consulta, con datos en vivo.
        </p>

        <!-- Content opportunities (computed from coverage, honest & deterministic) -->
        <div v-if="opportunities.length" class="opp-grid mt-5">
          <div
            v-for="o in opportunities"
            :key="o.id"
            class="opp"
            :class="{ medium: o.status === 'oportunidad' }"
            @click="select(o.id)"
          >
            <div class="opp-h">
              {{ o.label }}
              <VChip size="x-small" variant="flat" :style="statusChipStyle(o.status)">
                {{ STATUS_LABEL[o.status] }}
              </VChip>
            </div>
            <div class="opp-b">
              {{ o.cov === 0 ? 'Sin guías dedicadas' : o.cov + (o.cov === 1 ? ' guía' : ' guías') }}
              para un tema con demanda {{ o.demandWord }}.
              {{ o.hub ? 'Hub: ' + o.hub.title + '.' : '' }}
            </div>
          </div>
        </div>

        <div v-if="analysis && analysis.sources.length" class="ai-sources mt-5 pt-4">
          <div class="src-k mb-2">FUENTES CITADAS POR LA IA</div>
          <div class="d-flex flex-wrap ga-2">
            <a
              v-for="(s, i) in analysis.sources"
              :key="i"
              :href="s.url"
              target="_blank"
              rel="nofollow noopener"
              class="src-chip"
            >
              {{ s.label }}
            </a>
          </div>
        </div>
      </VCard>
    </section>

    <!-- TOPIC GRID -->
    <section class="mb-6">
      <h2 class="text-h6 font-weight-bold mb-1 mapa-section-title">
        <VIcon start size="small" color="primary">mdi-shape-outline</VIcon>
        Explorá los {{ TOPIC_DEFS.length }} temas
      </h2>
      <p class="text-body-2 text-grey-lighten-1 mb-4">
        Cada tema apunta al hub y las guías que lo responden en el sitio.
      </p>
      <VRow>
        <VCol v-for="t in gridTopics" :key="t.id" cols="12" sm="6" md="4">
          <VCard
            class="topic-card pa-4 h-100"
            variant="flat"
            :to="t.hub ? localePath('/temas/' + t.hub.slug) : undefined"
          >
            <div class="d-flex align-center ga-3">
              <VAvatar :style="{ background: t.color }" size="34" rounded="lg">
                <VIcon size="18" color="#0a1020">{{ t.icon }}</VIcon>
              </VAvatar>
              <span class="text-subtitle-2 font-weight-bold">{{ t.label }}</span>
            </div>
            <p class="text-body-2 text-grey-lighten-1 mt-2 mb-0 topic-blurb">{{ t.blurb }}</p>
            <div class="d-flex align-center justify-space-between mt-3 pt-2 topic-foot">
              <span class="text-caption text-grey-lighten-1">
                {{ t.hub ? t.hub.title : 'Sin hub' }}
              </span>
              <VChip size="x-small" variant="flat" :style="statusChipStyle(t.status)">
                {{ STATUS_LABEL[t.status] }}
              </VChip>
            </div>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Method note -->
    <VCard variant="flat" class="pa-4 method-note">
      <p class="text-caption text-grey-lighten-1 mb-2">
        <strong>Cómo se arma este mapa.</strong> Los datos de demanda salen del radar de temas de
        Reddit Uruguay (volumen y momentum a 90 días, clasificados por reglas, no por IA) y se
        refrescan a diario. La cobertura se mide contra nuestras guías con el mismo clasificador. La
        lectura interpretativa la genera Gemini cada 90 días sobre esos datos.
      </p>
      <p v-if="demand?.asOf" class="text-caption text-grey-lighten-1 mb-0">
        Datos de demanda actualizados el {{ fmtDate(demand.asOf) }}. Fuente: r/uruguay,
        r/UruguayFinanzas, r/Burises, r/Montevideo.
      </p>
    </VCard>
  </div>
</template>

<script setup lang="ts">
import { useTheme } from 'vuetify'
import type { PublishedTopicsResponse } from '~/utils/redditTopicsClient'
import type { TemasAnalysis } from '~/utils/temasAnalysis'
// The ECharts charts live in components/mapa/*.client.vue, so Nuxt auto-imports
// them under their directory-prefixed names <MapaTopicMapChart> /
// <MapaTopicRankingChart> (used in the template above). Referencing the .client
// components by their auto-import name keeps them server-safe: on the server they
// resolve to a client-only placeholder, so ECharts never runs during SSR. Do NOT
// import them explicitly — that pulls ECharts into the SSR bundle and 500s the page.

const localePath = useLocalePath()
const vTheme = useTheme()
const isDark = computed(() => vTheme.current.value.dark)

// --- live data (client-only, no top-level await → avoids the Suspense first-click bug) ---
const { data: demand } = useLazyFetch<PublishedTopicsResponse>('/api/reddit-topics', {
  server: false,
  default: () => null,
})
const { data: analysis } = useLazyFetch<TemasAnalysis>('/api/temas-analysis', {
  server: false,
  default: () => null,
})

const mapMode = ref<'scatter' | 'treemap'>('scatter')
const selectedId = ref<string | null>(null)
function select(id: string) {
  selectedId.value = id
}

const demandById = computed(() => new Map((demand.value?.topics ?? []).map(t => [t.id, t])))
const analysisById = computed(() => new Map((analysis.value?.topics ?? []).map(t => [t.id, t])))
const hasDemand = computed(() => (demand.value?.topics?.length ?? 0) > 0)

// Momentum = share of a topic's posts that are recent, normalized across topics.
const maxShare = computed(() => {
  let m = 0.0001
  for (const def of TOPIC_DEFS) {
    const d = demandById.value.get(def.id)
    if (d && d.total > 0) m = Math.max(m, d.recent / d.total)
  }
  return m
})

// Demand rank (0 = most consulted) for the coverage status heuristic.
const rankById = computed(() => {
  const arr = TOPIC_DEFS.map(def => ({
    id: def.id,
    recent: demandById.value.get(def.id)?.recent ?? 0,
  }))
  arr.sort((a, b) => b.recent - a.recent)
  return new Map(arr.map((x, i) => [x.id, i]))
})

interface TopicView {
  id: string
  label: string
  icon: string
  blurb: string
  total: number
  recent: number
  mo: number
  color: string
  cov: number
  status: import('~/utils/topicColors').CoverageStatus
  trend: 'up' | 'down' | 'stable'
  insight: string
  hub: ReturnType<typeof hubFor>
  related: Array<{ label: string; to: string }>
}

const view = computed<TopicView[]>(() =>
  TOPIC_DEFS.map(def => {
    const d = demandById.value.get(def.id)
    const a = analysisById.value.get(def.id)
    const total = d?.total ?? 0
    const recent = d?.recent ?? 0
    const mo = total > 0 ? Math.min(1, recent / total / maxShare.value) : 0
    const cov = coverageCount(def.id)
    const status = coverageStatus(cov, rankById.value.get(def.id) ?? 99, TOPIC_DEFS.length)
    const trend = a?.trend ?? (mo > 0.62 ? 'up' : mo < 0.34 ? 'down' : 'stable')
    return {
      id: def.id,
      label: def.label,
      icon: def.icon,
      blurb: def.blurb,
      total,
      recent,
      mo,
      color: momentumColor(mo),
      cov,
      status,
      trend,
      insight: a?.insight ?? def.blurb,
      hub: hubFor(def.id),
      related: [...def.related],
    }
  })
)

const viewById = computed(() => new Map(view.value.map(v => [v.id, v])))
const selected = computed(() =>
  selectedId.value ? (viewById.value.get(selectedId.value) ?? null) : null
)

// Auto-select the top-demand topic once live data lands.
watch(hasDemand, ok => {
  if (ok && !selectedId.value) {
    const top = [...view.value].sort((a, b) => b.recent - a.recent)[0]
    if (top) selectedId.value = top.id
  }
})

const mapPoints = computed(() =>
  view.value.map(v => ({
    id: v.id,
    label: v.label,
    total: v.total,
    recent: v.recent,
    mo: v.mo,
    color: v.color,
  }))
)
const rankPoints = computed(() =>
  [...view.value]
    .filter(v => v.recent > 0)
    .sort((a, b) => b.recent - a.recent)
    .map(v => ({ id: v.id, label: v.label, recent: v.recent, color: v.color }))
)
const coverageRows = computed(() =>
  [...view.value].sort((a, b) => b.recent - a.recent || b.total - a.total)
)
const gridTopics = computed(() =>
  [...view.value].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))
)

const maxRecent = computed(() => Math.max(0, ...view.value.map(v => v.recent)))
const totalRecent = computed(() => view.value.reduce((s, v) => s + v.recent, 0))
const gapCount = computed(() => view.value.filter(v => v.status === 'gap').length)

const opportunities = computed(() =>
  [...view.value]
    .filter(v => v.status !== 'cubierto')
    .sort((a, b) => {
      const rank = { gap: 0, oportunidad: 1, cubierto: 2 } as const
      return rank[a.status] - rank[b.status] || b.recent - a.recent
    })
    .slice(0, 3)
    .map(v => ({
      ...v,
      demandWord:
        v.recent >= (maxRecent.value || 1) * 0.6
          ? 'alta'
          : v.recent > 0
            ? 'sostenida'
            : 'recurrente',
    }))
)

const nextRefreshDays = computed(() => {
  if (!analysis.value?.asOf) return null
  const next = Date.parse(analysis.value.asOf) + 90 * 24 * 60 * 60 * 1000
  return Math.max(0, Math.ceil((next - Date.now()) / (24 * 60 * 60 * 1000)))
})

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-UY', { day: 'numeric', month: 'short', year: 'numeric' })
}
function trendColor(v: TopicView): string {
  return v.trend === 'up' ? '#ff7a45' : v.trend === 'down' ? '#4fd1c5' : '#93a4c2'
}
function statusChipStyle(status: import('~/utils/topicColors').CoverageStatus) {
  const c = STATUS_COLOR[status]
  return {
    color: c,
    background: `color-mix(in srgb, ${c} 15%, transparent)`,
    border: `1px solid color-mix(in srgb, ${c} 34%, transparent)`,
    fontWeight: 600,
  }
}

// --- SEO ---
const canonicalUrl = 'https://cambio-uruguay.com/mapa-de-temas'
const pageTitle = 'Mapa analítico de temas consultados en Uruguay'
const pageDescription =
  'Mapa interactivo de los temas de dinero que más consultan los uruguayos: dólar, alquiler, deudas, impuestos, inversión, cripto y más. Volumen y momentum de la demanda real cruzados con nuestra cobertura de guías, con una lectura por IA que se actualiza cada 90 días.'

defineOgImageComponent('Cambio', {
  title: 'Mapa de temas consultados',
  subtitle: 'Qué consultan los uruguayos sobre dinero, con datos',
  tag: 'MAPA ANALÍTICO',
})

useSeoMeta({
  title: () => `${pageTitle} | Cambio Uruguay`,
  description: pageDescription,
  ogTitle: pageTitle,
  ogDescription: pageDescription,
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: pageTitle,
  twitterDescription: pageDescription,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [
    {
      name: 'keywords',
      content:
        'temas consultados uruguay, qué consultan los uruguayos, dólar, alquiler, deudas, clearing, impuestos, IRPF, inversión, cripto, jubilación, mapa de temas, demanda de finanzas personales',
    },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Cambio Uruguay',
                item: 'https://cambio-uruguay.com/',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Temas',
                item: 'https://cambio-uruguay.com/temas',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Mapa analítico de temas',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'Dataset',
            name: 'Temas de dinero más consultados en Uruguay',
            description: pageDescription,
            creator: { '@type': 'Organization', name: 'Cambio Uruguay' },
            temporalCoverage: 'P90D',
            isAccessibleForFree: true,
            url: canonicalUrl,
          },
          {
            '@type': 'ItemList',
            name: 'Temas de dinero consultados en Uruguay',
            itemListElement: TOPIC_DEFS.map((t, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: t.label,
              url: TOPIC_HUB[t.id]
                ? `https://cambio-uruguay.com/temas/${TOPIC_HUB[t.id]}`
                : canonicalUrl,
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
/* Header hero */
.bg-gradient-mapa {
  background:
    radial-gradient(680px 300px at 15% 10%, rgba(255, 122, 69, 0.28), transparent 60%),
    radial-gradient(560px 300px at 85% 90%, rgba(79, 209, 197, 0.24), transparent 62%),
    linear-gradient(135deg, #17223b 0%, #0f1830 100%);
}
.mapa-eyebrow {
  font-family: 'SFMono-Regular', ui-monospace, 'Cascadia Code', Consolas, monospace;
  font-size: 11px;
  letter-spacing: 0.18em;
  color: rgba(255, 255, 255, 0.62);
  font-weight: 600;
}
.mapa-intro {
  max-width: 62ch;
  line-height: 1.6;
}
.mapa-stamp {
  font-family: 'SFMono-Regular', ui-monospace, 'Cascadia Code', Consolas, monospace;
  font-size: 11.5px !important;
  color: #fff !important;
}

/* section titles: left accent bar, house style */
.mapa-section-title {
  border-left: 3px solid rgb(var(--v-theme-primary));
  padding-left: 10px;
}

/* KPIs */
.kpi {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
}
.v-theme--light .kpi {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.08);
}
.kpi-value {
  font-family: 'SFMono-Regular', ui-monospace, 'Cascadia Code', Consolas, monospace;
  font-variant-numeric: tabular-nums;
  font-size: 34px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.02em;
}
.kpi-gap {
  color: #ff5d6c;
}
.kpi-dash {
  color: rgba(var(--v-theme-on-surface), 0.35);
}
.kpi-label {
  font-size: 12.5px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-top: 8px;
}

/* map + detail */
.map-card,
.detail-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
}
.v-theme--light .map-card,
.v-theme--light .detail-card {
  background: #fff;
  border-color: rgba(0, 0, 0, 0.08);
}
.map-skeleton {
  height: 440px;
}
.legend-ramp .ramp-bar {
  display: inline-block;
  width: 90px;
  height: 9px;
  border-radius: 6px;
  background: linear-gradient(90deg, #4fd1c5, #7f93b3, #ffb454, #ff7a45);
}
.detail-badge {
  flex: none;
}
.detail-stat {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 11px;
  padding: 10px 11px;
}
.v-theme--light .detail-stat {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.07);
}
.ds-k {
  font-family: 'SFMono-Regular', ui-monospace, Consolas, monospace;
  font-size: 10px;
  letter-spacing: 0.12em;
  color: rgba(var(--v-theme-on-surface), 0.5);
}
.ds-v {
  font-family: 'SFMono-Regular', ui-monospace, Consolas, monospace;
  font-variant-numeric: tabular-nums;
  font-size: 21px;
  font-weight: 600;
  margin-top: 2px;
}
.detail-insight {
  font-size: 13.5px;
  line-height: 1.55;
  color: rgba(var(--v-theme-on-surface), 0.82);
}
.ai-tag {
  font-family: 'SFMono-Regular', ui-monospace, Consolas, monospace;
  font-size: 9.5px;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-link));
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 6px;
}
.detail-links {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.v-theme--light .detail-links {
  border-top-color: rgba(0, 0, 0, 0.08);
}
.detail-hint {
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  min-height: 220px;
  font-size: 13.5px;
  padding: 20px;
}

/* coverage table */
.coverage-table :deep(th) {
  font-family: 'SFMono-Regular', ui-monospace, Consolas, monospace;
  font-size: 10.5px !important;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.5) !important;
}
.coverage-row {
  cursor: pointer;
}
.coverage-row.is-gap {
  background: color-mix(in srgb, #ff5d6c 6%, transparent);
}
.cov-sq {
  width: 11px;
  height: 11px;
  border-radius: 3px;
  flex: none;
}
.cov-demand {
  min-width: 140px;
}
.num-cell {
  font-family: 'SFMono-Regular', ui-monospace, Consolas, monospace;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
.gap-text {
  color: #ff5d6c;
}

/* AI card */
.ai-card {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, rgb(var(--v-theme-link)) 8%, rgba(255, 255, 255, 0.02)),
    rgba(255, 255, 255, 0.02)
  );
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
}
.v-theme--light .ai-card {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, rgb(var(--v-theme-primary)) 6%, #fff),
    #fff
  );
  border-color: rgba(0, 0, 0, 0.08);
}
.ai-gemtag {
  font-family: 'SFMono-Regular', ui-monospace, Consolas, monospace;
  font-size: 11px;
  letter-spacing: 0.1em;
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.ai-para {
  font-size: 15.5px;
  line-height: 1.68;
  color: rgba(var(--v-theme-on-surface), 0.85);
  max-width: 72ch;
  margin-bottom: 13px;
}
.opp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 12px;
}
.opp {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-left: 3px solid #ff5d6c;
  border-radius: 11px;
  padding: 13px 14px;
  cursor: pointer;
}
.opp.medium {
  border-left-color: #f5a524;
}
.v-theme--light .opp {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.08);
}
.opp-h {
  font-size: 13.5px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.opp-b {
  font-size: 12.5px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-top: 6px;
  line-height: 1.5;
}
.ai-sources {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.v-theme--light .ai-sources {
  border-top-color: rgba(0, 0, 0, 0.08);
}
.src-k {
  font-family: 'SFMono-Regular', ui-monospace, Consolas, monospace;
  font-size: 10px;
  letter-spacing: 0.13em;
  color: rgba(var(--v-theme-on-surface), 0.5);
}
.src-chip {
  font-size: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 5px 10px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  text-decoration: none;
}
.src-chip:hover {
  border-color: rgb(var(--v-theme-link));
  color: rgb(var(--v-theme-on-surface));
}
.v-theme--light .src-chip {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.1);
}

/* topic grid */
.topic-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  transition:
    border-color 0.15s ease,
    transform 0.15s ease;
}
.topic-card:hover {
  border-color: rgb(var(--v-theme-link));
  transform: translateY(-2px);
}
.v-theme--light .topic-card {
  background: #fff;
  border-color: rgba(0, 0, 0, 0.08);
}
.topic-blurb {
  min-height: 40px;
  line-height: 1.45;
}
.topic-foot {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.v-theme--light .topic-foot {
  border-top-color: rgba(0, 0, 0, 0.08);
}

/* method note */
.method-note {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
}
.v-theme--light .method-note {
  background: rgba(0, 0, 0, 0.015);
  border-color: rgba(0, 0, 0, 0.06);
}

@media (prefers-reduced-motion: reduce) {
  .topic-card,
  .topic-card:hover {
    transition: none;
    transform: none;
  }
}
</style>
