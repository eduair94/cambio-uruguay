<template>
  <div class="search-panel">
    <form
      class="bar"
      role="search"
      aria-label="Buscar en r/CharruaDevs"
      @submit.prevent="apply({ q: draftQ ?? '', page: 1 })"
    >
      <VTextField
        v-model="draftQ"
        label="Buscar en posts y comentarios"
        placeholder="junior, IA, despidos, contractor…"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="comfortable"
        hide-details
        clearable
        maxlength="100"
        @click:clear="apply({ q: '', page: 1 })"
      />
      <VBtn type="submit" color="primary" size="large" class="bar-btn">Buscar</VBtn>
    </form>

    <div class="presets">
      <span>Probá con</span>
      <button
        v-for="p in PRESETS"
        :key="p"
        type="button"
        class="preset"
        :aria-pressed="query.q === p"
        @click="apply({ q: p, page: 1 })"
      >
        {{ p }}
      </button>
    </div>

    <div class="filters">
      <div class="stance-filter">
        <span class="flabel">Sentimiento</span>
        <VChipGroup :model-value="query.stance" multiple column @update:model-value="onStance">
          <VChip
            v-for="s in STANCE_META"
            :key="s.value"
            :value="s.value"
            filter
            variant="outlined"
            size="small"
          >
            <span class="dot" :style="{ background: s.color }" aria-hidden="true" />{{ s.label }}
          </VChip>
        </VChipGroup>
      </div>
      <div class="selects">
        <VSelect
          :model-value="query.kind"
          :items="KIND_ITEMS"
          label="Tipo"
          density="compact"
          variant="outlined"
          hide-details
          @update:model-value="v => apply({ kind: (v || '') as SearchQuery['kind'], page: 1 })"
        />
        <VSelect
          :model-value="query.theme"
          :items="THEME_ITEMS"
          label="Tema"
          density="compact"
          variant="outlined"
          hide-details
          @update:model-value="v => apply({ theme: v || '', page: 1 })"
        />
        <VSelect
          :model-value="query.ai"
          :items="AI_ITEMS"
          label="Sobre la IA"
          density="compact"
          variant="outlined"
          hide-details
          @update:model-value="v => apply({ ai: v || '', page: 1 })"
        />
        <VSelect
          :model-value="query.event"
          :items="EVENT_ITEMS"
          label="Qué cuenta"
          density="compact"
          variant="outlined"
          hide-details
          @update:model-value="v => apply({ event: v || '', page: 1 })"
        />
        <VSelect
          :model-value="query.from ?? 0"
          :items="fromItems"
          label="Desde"
          density="compact"
          variant="outlined"
          hide-details
          @update:model-value="v => apply({ from: v ? Number(v) : null, page: 1 })"
        />
        <VSelect
          :model-value="query.to ?? 0"
          :items="toItems"
          label="Hasta"
          density="compact"
          variant="outlined"
          hide-details
          @update:model-value="v => apply({ to: v ? Number(v) : null, page: 1 })"
        />
        <VSelect
          :model-value="query.sort"
          :items="sortItems"
          label="Orden"
          density="compact"
          variant="outlined"
          hide-details
          @update:model-value="v => apply({ sort: v as SearchSort, page: 1 })"
        />
      </div>
      <VBtn
        v-if="!isDefaultSearch(query)"
        variant="text"
        size="small"
        prepend-icon="mdi-close"
        @click="reset"
      >
        Limpiar filtros
      </VBtn>
    </div>

    <div class="status" aria-live="polite">
      <template v-if="error">El buscador no respondió. Probá de nuevo en un rato.</template>
      <template v-else-if="!data">Buscando…</template>
      <template v-else>
        <strong>{{ fmtInt(data.total) }}</strong> {{ data.total === 1 ? 'texto' : 'textos'
        }}{{ query.q ? ` con «${query.q}»` : '' }}
        <template v-if="data.total"
          >· {{ fmtPct(sideShare('neg')) }} negativos ·
          {{ fmtPct(sideShare('pos')) }} positivos</template
        >
      </template>
    </div>
    <VProgressLinear v-if="pending && data" indeterminate height="2" color="primary" class="mb-2" />

    <div v-if="data && data.total" class="facets">
      <div class="dist" role="img" :aria-label="distAria">
        <span
          v-for="s in STANCE_META"
          :key="s.value"
          :style="{ width: `${(stanceShare(s.value) ?? 0) * 100}%`, background: s.color }"
          :title="`${s.label}: ${fmtPct(stanceShare(s.value))}`"
        />
      </div>
      <div class="dist-legend">
        <span v-for="s in STANCE_META" :key="s.value">
          <i :style="{ background: s.color }" aria-hidden="true" />{{ s.label }}
          {{ fmtPct(stanceShare(s.value)) }}
        </span>
      </div>
      <div v-if="yearRows.length > 1" class="years">
        <div class="years-title">Qué parte de esta búsqueda es negativa, año por año</div>
        <div v-for="y in yearRows" :key="y.y" class="year">
          <span class="y">{{ y.y }}</span>
          <span class="track"
            ><b :style="{ width: `${Math.round(y.neg * 100)}%`, background: NEG_COLOR }"
          /></span>
          <span class="v">{{ fmtPct(y.neg) }}</span>
          <span class="n">{{ fmtInt(y.n) }} textos</span>
        </div>
      </div>
    </div>

    <div class="results">
      <ResultCard v-for="item in data?.items ?? []" :key="item.rid" :item="item" :terms="terms" />
      <p v-if="data && !data.total" class="empty">
        Nada con esos filtros. Probá sacar alguno o buscar otra palabra.
      </p>
    </div>
    <VPagination
      v-if="pages > 1"
      :model-value="query.page"
      :length="pages"
      :total-visible="6"
      density="comfortable"
      class="mt-4"
      @update:model-value="goPage"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ResultCard from '~/components/mercadoIt/ResultCard.vue'
import {
  AI_LABELS,
  EVENT_LABELS,
  fmtInt,
  fmtPct,
  isDefaultSearch,
  normalizeSearchQuery,
  queryTerms,
  SEARCH_MAX_PAGE,
  searchQueryToParams,
  STANCE_META,
  stanceMeta,
  THEME_LABELS,
  type SearchQuery,
  type SearchResponse,
  type SearchSort,
} from '~/utils/charruadevs'

const props = defineProps<{ years: number[] }>()

const route = useRoute()
const router = useRouter()

// La URL es el estado: se puede compartir una búsqueda y el botón atrás deshace un filtro.
const query = computed(() => normalizeSearchQuery(route.query as Record<string, unknown>))
const params = computed(() => searchQueryToParams(query.value))
const draftQ = ref<string | null>(query.value.q)
watch(
  () => query.value.q,
  q => {
    draftQ.value = q
  }
)

// Sólo en el cliente: los resultados no hacen falta en el HTML del servidor y sumarlos al payload
// engordaría cada visita a la página por una sección que la mayoría no usa.
const { data, pending, error } = useFetch<SearchResponse>('/api/charruadevs/search', {
  query: params,
  server: false,
  lazy: true,
  key: 'charruadevs-search',
})

const PRESETS = [
  'IA',
  'junior',
  'despidos',
  'saturado',
  'contractor',
  'sueldo',
  'emigrar',
  'entrevista',
]
const KIND_ITEMS = [
  { title: 'Posts y comentarios', value: '' },
  { title: 'Sólo posts', value: 'post' },
  { title: 'Sólo comentarios', value: 'comment' },
]
const THEME_ITEMS = [
  { title: 'Todos los temas', value: '' },
  ...Object.entries(THEME_LABELS).map(([value, title]) => ({ title, value })),
]
const AI_ITEMS = [
  { title: 'Cualquiera', value: '' },
  ...Object.entries(AI_LABELS).map(([value, title]) => ({ title, value })),
]
const EVENT_ITEMS = [
  { title: 'Cualquiera', value: '' },
  ...Object.entries(EVENT_LABELS).map(([value, title]) => ({ title, value })),
]
const NEG_COLOR = stanceMeta(-1).color

const yearList = computed(() =>
  props.years.length ? props.years : [2021, 2022, 2023, 2024, 2025, 2026]
)
const fromItems = computed(() => [
  { title: 'Desde el inicio', value: 0 },
  ...yearList.value.map(y => ({ title: String(y), value: y })),
])
const toItems = computed(() => [
  { title: 'Hasta hoy', value: 0 },
  ...yearList.value.map(y => ({ title: String(y), value: y })),
])
const sortItems = computed(() => [
  { title: 'Más recientes', value: 'recent' },
  { title: 'Más votados', value: 'votes' },
  ...(query.value.q ? [{ title: 'Más relevantes', value: 'relevance' }] : []),
])

// Los controles de Vuetify emiten al montar: comparar con la URL actual convierte ese eco en un no-op.
function apply(patch: Partial<SearchQuery>) {
  const next = normalizeSearchQuery(searchQueryToParams({ ...query.value, ...patch }))
  const nextParams = searchQueryToParams(next)
  if (JSON.stringify(nextParams) === JSON.stringify(params.value)) return Promise.resolve()
  return router.push({ query: nextParams })
}

function onStance(v: unknown) {
  const list = (Array.isArray(v) ? v : []).map(Number).filter(n => Number.isInteger(n))
  apply({ stance: list.sort((a, b) => a - b), page: 1 })
}

function reset() {
  draftQ.value = ''
  if (!isDefaultSearch(query.value)) router.push({ query: {} })
}

async function goPage(p: number) {
  await apply({ page: p })
  document.getElementById('buscador')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const terms = computed(() => queryTerms(query.value.q))
const stanceTotal = computed(() =>
  Object.values(data.value?.facets.stance ?? {}).reduce((a, b) => a + b, 0)
)
function stanceShare(v: number): number | null {
  if (!stanceTotal.value || !data.value) return null
  return (data.value.facets.stance[String(v)] ?? 0) / stanceTotal.value
}
function sideShare(side: 'neg' | 'pos'): number | null {
  if (!stanceTotal.value || !data.value) return null
  const f = data.value.facets.stance
  const n = side === 'neg' ? (f['-2'] ?? 0) + (f['-1'] ?? 0) : (f['1'] ?? 0) + (f['2'] ?? 0)
  return n / stanceTotal.value
}
const distAria = computed(() =>
  STANCE_META.map(s => `${s.label} ${fmtPct(stanceShare(s.value))}`).join(', ')
)
const yearRows = computed(() =>
  (data.value?.facets.byYear ?? [])
    .map(y => {
      const n = y.neg + y.neu + y.pos
      return { y: y.y, n, neg: n ? y.neg / n : 0 }
    })
    .filter(y => y.n >= 10)
)
const pages = computed(() =>
  Math.min(SEARCH_MAX_PAGE, Math.ceil((data.value?.total ?? 0) / (data.value?.perPage || 20)))
)
</script>

<style scoped>
.search-panel {
  display: grid;
  gap: 14px;
}
.bar {
  display: flex;
  gap: 8px;
  align-items: center;
}
.bar-btn {
  flex: none;
}
.presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  font-size: 0.85rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.preset {
  font: inherit;
  font-size: 0.85rem;
  color: rgb(var(--v-theme-on-surface));
  background: transparent;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 999px;
  padding: 2px 10px;
  cursor: pointer;
}
.preset:hover,
.preset[aria-pressed='true'] {
  border-color: rgb(var(--v-theme-primary));
}
.filters {
  display: grid;
  gap: 10px;
}
.flabel {
  font-size: 0.8rem;
  font-weight: 600;
  margin-right: 8px;
}
.stance-filter {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}
.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 6px;
}
.selects {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 10px;
}
.status {
  font-size: 0.95rem;
  min-height: 1.5em;
}
.facets {
  display: grid;
  gap: 8px;
}
.dist {
  display: flex;
  height: 12px;
  border-radius: 4px;
  overflow: hidden;
  gap: 2px;
}
.dist span {
  display: block;
  height: 100%;
  min-width: 0;
}
.dist-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}
.dist-legend i {
  width: 9px;
  height: 9px;
  border-radius: 4px;
  display: inline-block;
  margin-right: 5px;
}
.years {
  display: grid;
  gap: 4px;
  max-width: 560px;
}
.years-title {
  font-size: 0.8rem;
  font-weight: 600;
  margin-top: 4px;
}
.year {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 44px 90px;
  gap: 8px;
  align-items: center;
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}
.track {
  display: block;
  height: 8px;
  background: rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 4px;
  overflow: hidden;
}
.track b {
  display: block;
  height: 100%;
}
.n {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.empty {
  margin: 12px 0 0;
}
@media (max-width: 600px) {
  .bar {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
