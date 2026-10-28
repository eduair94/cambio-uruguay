<template>
  <VContainer fluid class="ro-page py-6">
    <h1 class="text-h5 text-sm-h4 mb-1">Hilos para contestar en Reddit</h1>
    <p class="text-body-2 text-medium-emphasis mb-4 ro-lead">
      Panel privado. Preguntas de los últimos 30 días en los subreddits uruguayos que una página del
      sitio contesta, con la página, el motivo y qué aportar. Lo arma el job
      <code>currency-reddit-opportunities</code> todos los días a las 07:21; no publica nada en
      Reddit ni escribe respuestas.
    </p>

    <VAlert v-if="forbidden" type="error" variant="tonal" class="mb-4">
      Esta cuenta no está en la lista de administradores.
    </VAlert>
    <VAlert v-else-if="loadError && !items.length" type="warning" variant="tonal" class="mb-4">
      No se pudo leer la cola. {{ loadError }}
      <template #append>
        <VBtn variant="text" size="small" @click="reload">Reintentar</VBtn>
      </template>
    </VAlert>

    <template v-if="!forbidden">
      <div v-if="meta" class="ro-run mb-4">
        <span>
          Última corrida: <strong>{{ asOfLabel }}</strong>
        </span>
        <span v-if="meta.recommendedTotal !== undefined">
          ({{ meta.recommendedTotal }} pendientes)
        </span>
        <VBtn variant="text" size="x-small" class="ms-1" @click="showRun = !showRun">
          {{ showRun ? 'Ocultar' : 'Qué leyó' }}
        </VBtn>
      </div>
      <VAlert v-if="stale" type="warning" variant="tonal" density="compact" class="mb-3">
        La cola es del {{ asOfLabel }}: el job no corre desde hace más de un día y medio.
      </VAlert>
      <VAlert v-if="judgeDown" type="error" variant="tonal" density="compact" class="mb-3">
        En la última corrida el juez no devolvió ningún veredicto ({{ meta?.judgeFailures }} lotes
        fallidos): la cola no sumó hilos nuevos. Suele ser la clave o la cuota de Gemini.
      </VAlert>
      <VExpandTransition>
        <VCard v-if="showRun && meta" variant="outlined" class="pa-4 mb-4">
          <table class="ro-run-table">
            <thead>
              <tr>
                <th scope="col">Sub</th>
                <th scope="col">Leídos</th>
                <th scope="col">Con candidatas</th>
                <th scope="col">Juzgados</th>
                <th scope="col">Recomendados</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in meta.subs" :key="s.sub">
                <th scope="row">r/{{ s.sub }}</th>
                <td>{{ s.fetched }}</td>
                <td>{{ s.candidates }}</td>
                <td>{{ s.judged }}</td>
                <td>{{ s.recommended }}</td>
              </tr>
            </tbody>
          </table>
          <ul v-if="meta.notes.length" class="ro-notes mt-3">
            <li v-for="note in meta.notes" :key="note">{{ note }}</li>
          </ul>
        </VCard>
      </VExpandTransition>

      <div class="ro-filters mb-2">
        <VTextField
          v-model="search"
          label="Buscar"
          density="compact"
          variant="outlined"
          clearable
          hide-details
          prepend-inner-icon="mdi-magnify"
          class="ro-filter-search"
        />
        <VSelect
          v-model="sub"
          :items="subItems"
          label="Sub"
          density="compact"
          variant="outlined"
          clearable
          hide-details
        />
        <VSelect
          v-model="family"
          :items="familyItems"
          label="Tema"
          density="compact"
          variant="outlined"
          clearable
          hide-details
        />
        <VSelect
          v-model="sort"
          :items="sortItems"
          label="Orden"
          density="compact"
          variant="outlined"
          hide-details
        />
      </div>
      <VChipGroup
        v-model="state"
        mandatory
        column
        selected-class="text-primary"
        class="mb-3"
        aria-label="Estado"
      >
        <VChip
          v-for="s in stateItems"
          :key="s.value"
          :value="s.value"
          variant="outlined"
          filter
          size="small"
        >
          {{ s.title }}<span v-if="s.count !== null" class="ms-1 ro-count">{{ s.count }}</span>
        </VChip>
      </VChipGroup>

      <p class="text-caption text-medium-emphasis mb-3" aria-live="polite">
        <template v-if="loading && !items.length">Cargando…</template>
        <template v-else>
          {{ total }} {{ total === 1 ? 'hilo' : 'hilos' }}
          <template v-if="startPage > 1"> · desde la página {{ startPage }}</template>
        </template>
      </p>

      <div v-if="startPage > 1 && items.length" class="text-center mb-3">
        <VBtn
          variant="text"
          size="small"
          prepend-icon="mdi-arrow-up"
          @click="goToPage(startPage - 1)"
        >
          Ver la página {{ startPage - 1 }}
        </VBtn>
      </div>

      <VRow v-if="loading && !items.length">
        <VCol v-for="n in 6" :key="n" cols="12" sm="6" lg="4">
          <VSkeletonLoader type="article, actions" class="ro-skeleton" />
        </VCol>
      </VRow>

      <VRow v-else-if="items.length">
        <VCol v-for="item in items" :key="item.postId" cols="12" sm="6" lg="4">
          <RedditOpportunityCard
            :item="item"
            :busy="busyId === item.postId"
            @update-state="payload => updateState(item, payload)"
            @copy="copy"
          />
        </VCol>
      </VRow>

      <div v-else-if="!loadError" class="ro-empty">
        <VIcon icon="mdi-forum-outline" size="32" class="mb-2" />
        <p v-if="!meta" class="mb-2">Todavía no hay cola. {{ hint }}</p>
        <p v-else-if="hasFilters" class="mb-2">No hay hilos con estos filtros.</p>
        <p v-else-if="state === 'open'" class="mb-2">
          No quedan hilos pendientes. Mañana a las 07:21 llegan los nuevos.
        </p>
        <p v-else class="mb-2">Nada en «{{ stateLabel }}» todavía.</p>
        <VBtn v-if="hasFilters" variant="tonal" @click="clearFilters">Limpiar filtros</VBtn>
      </div>

      <div ref="sentinel" class="ro-sentinel" aria-hidden="true" />

      <div v-if="items.length" class="ro-more">
        <VAlert v-if="loadError" type="warning" variant="tonal" density="compact" class="mb-3">
          No se pudo cargar la página siguiente. {{ loadError }}
        </VAlert>
        <VBtn
          v-if="hasMore"
          variant="tonal"
          :loading="loading"
          prepend-icon="mdi-chevron-down"
          @click="loadMore"
        >
          Cargar más
        </VBtn>
        <p v-else class="text-caption text-medium-emphasis">No hay más hilos.</p>
        <VPagination
          v-if="pages > 1"
          :model-value="currentPage"
          :length="pages"
          :total-visible="mobile ? 5 : 7"
          density="comfortable"
          class="mt-2"
          aria-label="Páginas de la cola"
          @update:model-value="goToPage"
        />
      </div>
    </template>

    <VSnackbar v-model="snack.show" :timeout="snack.undo ? 6000 : 2500" location="bottom">
      {{ snack.text }}
      <template v-if="snack.undo" #actions>
        <VBtn variant="text" @click="undo">Deshacer</VBtn>
      </template>
    </VSnackbar>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import {
  OPPS_FAMILY_LABELS,
  OPPS_PAGE_SIZE,
  OPPS_SORTS,
  parseOppsQuery,
  OPPS_SORT_LABELS,
  OPPS_STATE_LABELS,
  type OppItem,
  type OppState,
  type OppsSort,
  type OppsStateFilter,
} from '~/utils/redditOpportunities'

// El login hace falta para tener token; la ruta del servidor vuelve a chequear la lista de
// administradores, que es lo que de verdad protege la cola.
definePageMeta({ middleware: 'auth' })

useHead({
  title: 'Hilos para contestar en Reddit — panel privado',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

interface Facet {
  value: string
  count: number
}
interface RunMeta {
  asOf: string
  recommendedTotal: number
  subs: Array<{
    sub: string
    fetched: number
    candidates: number
    judged: number
    recommended: number
  }>
  notes: string[]
  judged: number
  judgeFailures: number
}
interface OppsResponse {
  items: OppItem[]
  total: number
  page: number
  pages: number
  facets: { subs: Facet[]; families: Facet[]; states: Facet[] }
  meta: RunMeta | null
  hint: string
}

const { authFetch } = useAuthFetch()
const route = useRoute()
const router = useRouter()
const { mobile } = useDisplay()

const initial = parseOppsQuery(route.query as Record<string, unknown>)
const search = ref(initial.q)
const sub = ref<string | null>(initial.sub)
const family = ref<string | null>(initial.family)
const state = ref<OppsStateFilter>(initial.state)
const sort = ref<OppsSort>(initial.sort)

const items = ref<OppItem[]>([])
const total = ref(0)
const pages = ref(1)
const startPage = ref(initial.page)
/** Cargas completadas. Sólo sirve para volver a mirar el centinela después de cada una. */
const loads = ref(0)
const facets = ref<OppsResponse['facets']>({ subs: [], families: [], states: [] })
const meta = ref<RunMeta | null>(null)
const hint = ref('')
// `true` desde el arranque: la primera carga sale en `onMounted` (hace falta el token del
// navegador), y hasta entonces el SSR tiene que mostrar el esqueleto, no "no hay cola".
const loading = ref(true)
const loadError = ref('')
const forbidden = ref(false)
const showRun = ref(false)
const busyId = ref('')

/** Cada carga lleva un número: una respuesta vieja que llega tarde no pisa la lista de un filtro nuevo. */
let generation = 0

/**
 * Desde dónde sigue la lista. Por OFFSET y no por número de página: marcar una card la saca del
 * filtro en el servidor y de la lista acá, así que "lo que ya se ve" es la cuenta exacta de cuánto
 * saltear. Con números de página, después de descartar tres la página 2 empezaba tres filas más
 * adelante y esas tres no aparecían nunca.
 */
const nextOffset = computed(() => (startPage.value - 1) * OPPS_PAGE_SIZE + items.value.length)
const hasMore = computed(() => nextOffset.value < total.value)
/** La página que se marca en la paginación: hasta dónde llegó el scroll. */
const currentPage = computed(() =>
  Math.min(pages.value, Math.max(startPage.value, Math.ceil(nextOffset.value / OPPS_PAGE_SIZE)))
)

function filterQuery(): Record<string, string> {
  const q: Record<string, string> = { state: state.value, sort: sort.value }
  if (sub.value) q.sub = sub.value
  if (family.value) q.family = family.value
  if (search.value?.trim()) q.q = search.value.trim()
  return q
}

async function fetchFrom(offset: number, replace: boolean): Promise<void> {
  const gen = replace ? ++generation : generation
  loading.value = true
  loadError.value = ''
  try {
    const res = await authFetch<OppsResponse>('/api/reddit-opportunities', {
      query: { ...filterQuery(), offset, limit: OPPS_PAGE_SIZE },
    })
    if (gen !== generation) return
    const known = new Set(replace ? [] : items.value.map(i => i.postId))
    items.value = replace
      ? res.items
      : [...items.value, ...res.items.filter(i => !known.has(i.postId))]
    total.value = res.total
    pages.value = res.pages
    loads.value++
    facets.value = res.facets
    meta.value = res.meta
    hint.value = res.hint
  } catch (e: any) {
    if (gen !== generation) return
    const status = e?.statusCode || e?.response?.status
    forbidden.value = status === 403
    loadError.value = status ? `La ruta respondió ${status}.` : 'Sin conexión.'
  } finally {
    if (gen === generation) loading.value = false
  }
}

function syncUrl(): void {
  const q: Record<string, string> = filterQuery()
  if (startPage.value > 1) q.page = String(startPage.value)
  if (q.state === 'open') delete q.state
  if (q.sort === 'rank') delete q.sort
  router.replace({ query: q })
}

function reload(): void {
  startPage.value = 1
  items.value = []
  snack.show = false
  syncUrl()
  void fetchFrom(0, true)
}

function goToPage(page: number): void {
  if (page < 1 || page > pages.value) return
  // Arriba de golpe y ANTES de pedir: con un scroll suave el centinela del fondo seguía a la vista
  // cuando llegaba la página elegida, y el scroll infinito cargaba enseguida la siguiente.
  if (import.meta.client) window.scrollTo({ top: 0 })
  startPage.value = page
  items.value = []
  syncUrl()
  void fetchFrom((page - 1) * OPPS_PAGE_SIZE, true)
}

function loadMore(): void {
  if (loading.value || !hasMore.value) return
  void fetchFrom(nextOffset.value, false)
}

let debounce: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(debounce)
  debounce = setTimeout(reload, 300)
})
watch([sub, family, state, sort], reload)

const hasFilters = computed(() => !!(sub.value || family.value || search.value?.trim()))
function clearFilters(): void {
  sub.value = null
  family.value = null
  search.value = ''
}

const subItems = computed(() =>
  facets.value.subs.map(f => ({ value: f.value, title: `r/${f.value} (${f.count})` }))
)
const familyItems = computed(() =>
  facets.value.families.map(f => ({
    value: f.value,
    title: `${OPPS_FAMILY_LABELS[f.value] ?? f.value} (${f.count})`,
  }))
)
const sortItems = OPPS_SORTS.map(value => ({ value, title: OPPS_SORT_LABELS[value] }))
const stateItems = computed(() =>
  (Object.keys(OPPS_STATE_LABELS) as OppsStateFilter[]).map(value => ({
    value,
    title: OPPS_STATE_LABELS[value],
    count: value === 'all' ? null : (facets.value.states.find(s => s.value === value)?.count ?? 0),
  }))
)
const stateLabel = computed(() => OPPS_STATE_LABELS[state.value])

const asOfLabel = computed(() =>
  meta.value
    ? new Intl.DateTimeFormat('es-UY', {
        dateStyle: 'medium',
        timeStyle: 'short',
        hourCycle: 'h23',
        timeZone: 'America/Montevideo',
      }).format(new Date(meta.value.asOf))
    : ''
)
const stale = computed(
  () => !!meta.value && Date.now() - new Date(meta.value.asOf).getTime() > 36 * 3_600_000
)
const judgeDown = computed(() => !!meta.value && meta.value.judgeFailures > 0 && !meta.value.judged)

// --- marcar ---------------------------------------------------------------------------------

interface Undo {
  /** El hilo tal como estaba antes de marcarlo. */
  item: OppItem
  index: number
  previous: OppState
  to: OppState
  /** La carga en la que se marcó: si después cambió el filtro, la card no es de esta lista. */
  gen: number
}

const snack = reactive<{ show: boolean; text: string; undo: Undo | null }>({
  show: false,
  text: '',
  undo: null,
})

function toast(text: string, undoable: Undo | null = null): void {
  snack.text = text
  snack.undo = undoable
  snack.show = true
}

async function postState(postId: string, nextState: OppState, answerUrl?: string): Promise<void> {
  await authFetch('/api/reddit-opportunities/state', {
    method: 'POST',
    body: { postId, state: nextState, answerUrl },
  })
}

/** Actualización optimista: la card cambia o sale de la vista al instante, y vuelve si falla. */
async function updateState(
  item: OppItem,
  payload: { state: OppState; answerUrl?: string }
): Promise<void> {
  const index = items.value.findIndex(i => i.postId === item.postId)
  if (index < 0) return
  const previous = item.state
  const leaves = state.value !== 'all' && state.value !== payload.state
  const next: OppItem = {
    ...item,
    state: payload.state,
    stateAt: new Date().toISOString(),
    answerUrl: payload.state === 'answered' ? (payload.answerUrl ?? item.answerUrl) : '',
    answerVisible: null,
    answerCheckedAt: null,
  }
  busyId.value = item.postId
  if (leaves) {
    items.value.splice(index, 1)
    total.value = Math.max(0, total.value - 1)
  } else {
    items.value.splice(index, 1, next)
  }
  try {
    await postState(item.postId, payload.state, payload.answerUrl)
    bumpCount(previous, -1)
    bumpCount(payload.state, +1)
    const verb =
      payload.state === 'answered'
        ? 'Marcado como respondido'
        : payload.state === 'dismissed'
          ? 'Descartado'
          : 'De vuelta en pendientes'
    toast(
      verb,
      payload.state === 'open'
        ? null
        : { item, index, previous, to: payload.state, gen: generation }
    )
  } catch (e: any) {
    if (leaves) {
      items.value.splice(index, 0, item)
      total.value += 1
    } else {
      items.value.splice(index, 1, item)
    }
    toast(e?.data?.statusMessage || 'No se pudo guardar. Probá de nuevo.')
  } finally {
    busyId.value = ''
  }
}

function bumpCount(value: OppState, delta: number): void {
  const row = facets.value.states.find(s => s.value === value)
  if (row) row.count = Math.max(0, row.count + delta)
}

/** Vuelve el hilo al estado de antes, y a su lugar en la lista si había salido de la vista. */
async function undo(): Promise<void> {
  const pending = snack.undo
  snack.show = false
  if (!pending) return
  try {
    // Volver a "respondido" devuelve también el enlace del comentario, que el otro estado borró.
    const url = pending.previous === 'answered' ? pending.item.answerUrl || undefined : undefined
    await postState(pending.item.postId, pending.previous, url)
    // Si el filtro cambió desde que se marcó, la card no pertenece a esta lista: se relee la lista
    // en vez de meterla donde no va y mover conteos que nunca la incluyeron.
    if (pending.gen !== generation) {
      reload()
      return
    }
    bumpCount(pending.to, -1)
    bumpCount(pending.previous, +1)
    const at = items.value.findIndex(i => i.postId === pending.item.postId)
    if (at >= 0) {
      items.value.splice(at, 1, pending.item)
    } else {
      items.value.splice(Math.min(pending.index, items.value.length), 0, pending.item)
      total.value += 1
    }
  } catch {
    toast('No se pudo deshacer.')
  }
}

async function copy(url: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(url)
    toast('Enlace copiado')
  } catch {
    toast(url)
  }
}

// --- scroll infinito -----------------------------------------------------------------------

const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

onMounted(() => {
  void fetchFrom((startPage.value - 1) * OPPS_PAGE_SIZE, true)
  if (typeof IntersectionObserver === 'undefined' || !sentinel.value) return
  // 600 px antes del final: la página siguiente llega antes de que se vea el hueco.
  observer = new IntersectionObserver(
    entries => {
      if (entries.some(e => e.isIntersecting) && items.value.length && !loadError.value) loadMore()
    },
    { rootMargin: '600px 0px' }
  )
  observer.observe(sentinel.value)
})

// El observador avisa al ENTRAR en vista. Si después de cargar una página el centinela sigue a la
// vista (pantalla alta, página corta), no hay un segundo aviso y el scroll se quedaría quieto.
watch(loads, async () => {
  await nextTick()
  const el = sentinel.value
  if (!el || loadError.value) return
  if (el.getBoundingClientRect().top < window.innerHeight + 600) loadMore()
})

onBeforeUnmount(() => {
  observer?.disconnect()
  clearTimeout(debounce)
})
</script>

<style scoped>
.ro-page {
  max-width: 1440px;
}
.ro-lead {
  max-width: 72ch;
}
.ro-run {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.78);
}
.ro-run-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
}
.ro-run-table th,
.ro-run-table td {
  text-align: right;
  padding: 4px 8px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}
.ro-run-table th:first-child,
.ro-run-table thead th:first-child {
  text-align: left;
}
.ro-run-table thead th {
  font-size: 0.75rem;
  font-weight: 700;
  color: rgba(var(--v-theme-on-surface), 0.72);
}
.ro-notes {
  font-size: 0.8rem;
  padding-left: 18px;
  color: rgba(var(--v-theme-on-surface), 0.74);
}
.ro-filters {
  display: grid;
  grid-template-columns: minmax(0, 2fr) repeat(3, minmax(0, 1fr));
  gap: 12px;
}
/* Menos de 960 px: dos por fila. Apilados eran cuatro filas que empujaban la primera card fuera de
   la pantalla, y tres por fila truncaban los valores ("Te…", "Re…") a 360 px. */
@media (max-width: 959px) {
  .ro-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
}
.ro-count {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}
.ro-skeleton {
  border-radius: 12px;
}
.ro-empty {
  text-align: center;
  padding: 48px 16px;
  color: rgba(var(--v-theme-on-surface), 0.74);
}
.ro-sentinel {
  height: 1px;
}
.ro-more {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
}
</style>
