<template>
  <VContainer fluid class="pr-page py-6">
    <div class="d-flex flex-wrap align-center justify-space-between ga-2 mb-1">
      <h1 class="text-h4">Ranking de páginas</h1>
      <VBtn to="/estadisticas-de-busqueda" variant="text" size="small" prepend-icon="mdi-magnify">
        Search Console y plan de ingreso
      </VBtn>
    </div>
    <p class="text-body-2 text-medium-emphasis mb-6">
      Panel privado. Qué páginas mueven el sitio, cuáles suben, cuáles se caen y cuáles engañan. Lo
      escribe el job <code>currency-site-analytics</code> una vez por día desde Google Analytics y
      sólo lo ven las cuentas de <code>NUXT_ADMIN_EMAILS</code>.
    </p>

    <VAlert v-if="pending" type="info" variant="tonal" class="mb-4">Cargando…</VAlert>

    <VAlert v-else-if="forbidden" type="error" variant="tonal" class="mb-4">
      Esta cuenta no está en la lista de administradores.
    </VAlert>

    <VAlert v-else-if="!snapshot" type="warning" variant="tonal" class="mb-4">
      Todavía no hay datos. {{ hint }}
    </VAlert>

    <template v-else>
      <VAlert v-if="stale" type="warning" variant="tonal" density="compact" class="mb-3">
        El ranking es del {{ asOfLabel }}: el job no corrió desde entonces.
      </VAlert>
      <VAlert v-if="snapshot.truncated" type="info" variant="tonal" density="compact" class="mb-3">
        Google Analytics recortó algún reporte: las páginas más chicas pueden faltar.
      </VAlert>

      <p class="text-caption text-medium-emphasis mb-3">
        Ventana {{ dayLabel(snapshot.range.start) }} a {{ dayLabel(snapshot.range.end) }} (28 días
        que terminan ayer, en el huso de la propiedad: {{ snapshot.timezone }}). Actualizado
        {{ asOfLabel }}.
      </p>

      <VRow class="mb-4">
        <VCol cols="12" sm="6" md="3">
          <VCard variant="outlined" class="pa-4 h-100">
            <div class="text-caption text-medium-emphasis">Vistas desde Uruguay</div>
            <div class="text-h5 font-weight-bold">{{ prNumber(snapshot.totals.viewsUy) }}</div>
            <div class="text-caption text-medium-emphasis">
              de {{ prNumber(snapshot.totals.viewsAll) }} medidas en total ({{
                prPercent(snapshot.totals.uyShare)
              }}). El ranking usa sólo Uruguay.
            </div>
          </VCard>
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <VCard variant="outlined" class="pa-4 h-100">
            <div class="text-caption text-medium-emphasis">Vistas uruguayas por semana</div>
            <div class="d-flex align-end ga-3 mt-1">
              <div
                v-for="(w, i) in snapshot.totals.weeklyUy"
                :key="i"
                class="text-center"
                :title="`Semana del ${dayLabel(snapshot.weeks[i]?.start || '')}`"
              >
                <div class="text-body-2 font-weight-bold">{{ prNumber(w) }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ dayLabel(snapshot.weeks[i]?.start || '') }}
                </div>
              </div>
            </div>
          </VCard>
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <VCard variant="outlined" class="pa-4 h-100">
            <div class="text-caption text-medium-emphasis">Páginas con visitas</div>
            <div class="text-h5 font-weight-bold">{{ prNumber(snapshot.pageCount) }}</div>
            <div class="text-caption text-medium-emphasis">
              las 10 primeras juntan {{ prPercent(topTenShare) }} de las vistas
            </div>
          </VCard>
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <VCard variant="outlined" class="pa-4 h-100">
            <div class="text-caption text-medium-emphasis mb-1">Por dónde entran (Uruguay)</div>
            <div
              v-for="c in snapshot.totals.channels.slice(0, 5)"
              :key="c.label"
              class="d-flex justify-space-between text-body-2"
            >
              <span>{{ prChannelLabel(c.label) }}</span>
              <span class="font-weight-bold">{{ prPercent(c.share) }}</span>
            </div>
          </VCard>
        </VCol>
      </VRow>

      <h2 class="text-h6 mb-1">Dónde enfocarse</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Armado con las cifras de abajo. El valor de una página es su base semanal por el
        multiplicador del tramo de su familia (contenido ×8, dato en vivo ×1, directorio ×0,2): es
        forma, no plata.
      </p>
      <VRow class="mb-6">
        <VCol v-for="group in focusGroups" :key="group.kind" cols="12" md="6">
          <VCard variant="outlined" class="pa-4 h-100">
            <div class="text-subtitle-1 font-weight-bold">{{ group.title }}</div>
            <div class="text-caption text-medium-emphasis mb-3">{{ group.why }}</div>
            <div v-for="item in group.items" :key="item.path" class="pr-focus-item mb-3">
              <a
                :href="item.path"
                target="_blank"
                rel="noopener"
                class="text-body-2 font-weight-bold"
              >
                {{ prLabel(item) }}
              </a>
              <div class="text-caption text-medium-emphasis pr-path">{{ item.path }}</div>
              <div class="text-body-2">{{ item.headline }}</div>
              <div class="text-caption text-medium-emphasis">{{ item.detail }}</div>
            </div>
          </VCard>
        </VCol>
      </VRow>

      <h2 class="text-h6 mb-3">Todas las páginas</h2>
      <VRow dense class="mb-2">
        <VCol cols="12" md="4">
          <VTextField
            v-model="query"
            label="Buscar ruta o título"
            density="compact"
            variant="outlined"
            clearable
            hide-details
            prepend-inner-icon="mdi-magnify"
          />
        </VCol>
        <VCol cols="12" sm="4" md="3">
          <VSelect
            v-model="family"
            :items="familyItems"
            label="Familia"
            density="compact"
            variant="outlined"
            clearable
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="4" md="2">
          <VSelect
            v-model="signal"
            :items="signalItems"
            label="Señal"
            density="compact"
            variant="outlined"
            clearable
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="4" md="3">
          <VSelect
            v-model="sortKey"
            :items="sortItems"
            label="Ordenar por"
            density="compact"
            variant="outlined"
            hide-details
          />
        </VCol>
      </VRow>
      <p class="text-caption text-medium-emphasis mb-2">
        {{ prNumber(filtered.length) }} de {{ prNumber(snapshot.pages.length) }} páginas guardadas.
      </p>

      <VTable density="compact" class="mb-3 cu-mobile-cards">
        <thead>
          <tr>
            <th class="text-right text-no-wrap">#</th>
            <th>Página</th>
            <th
              class="text-right text-no-wrap"
              title="Mediana de las semanas desde la primera con vistas"
            >
              Base / sem.
            </th>
            <th class="text-right text-no-wrap">28 días</th>
            <th>4 semanas</th>
            <th class="text-right text-no-wrap" title="Últimas dos semanas contra las primeras dos">
              Tend.
            </th>
            <th class="text-right text-no-wrap" title="Permanencia promedio por usuario">Perm.</th>
            <th class="text-right text-no-wrap" title="Porción de las vistas que son desde Uruguay">
              % UY
            </th>
            <th>Entradas</th>
            <th>Tramo</th>
            <th>Señales</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in visible" :key="row.path">
            <td data-label="#" class="text-right text-no-wrap text-medium-emphasis">
              {{ row.rank }}
            </td>
            <td data-label="Página" class="pr-subject">
              <a :href="row.path" target="_blank" rel="noopener">{{ prLabel(row) }}</a>
              <div class="text-caption text-medium-emphasis pr-path">{{ row.path }}</div>
            </td>
            <td data-label="Base / sem." class="text-right text-no-wrap font-weight-bold">
              {{ prNumber(row.base) }}
            </td>
            <td data-label="28 días" class="text-right text-no-wrap">{{ prNumber(row.views) }}</td>
            <td data-label="4 semanas">
              <span class="pr-bars" :title="row.weeks.join(' · ')">
                <span
                  v-for="(h, i) in prWeekBars(row.weeks)"
                  :key="i"
                  class="pr-bar"
                  :style="{ height: h > 0 ? `${Math.round(h * 100)}%` : '1px' }"
                />
              </span>
            </td>
            <td data-label="Tend." class="text-right text-no-wrap" :class="trendClass(row.trend)">
              {{ prTrend(row.trend) }}
            </td>
            <td data-label="Perm." class="text-right text-no-wrap">
              {{ prSeconds(row.engagementSeconds) }}
            </td>
            <td
              data-label="% UY"
              class="text-right text-no-wrap"
              :class="row.uyShare < 0.5 ? 'text-warning' : ''"
            >
              {{ prPercent(row.uyShare) }}
            </td>
            <td data-label="Entradas" class="text-caption">
              <span v-if="row.entrances.total">
                <strong>{{ prNumber(row.entrances.total) }}</strong>
                <span class="text-medium-emphasis"> · {{ entranceBreakdown(row.entrances) }}</span>
              </span>
              <span v-else class="text-medium-emphasis">—</span>
            </td>
            <td data-label="Tramo" class="text-caption">
              {{ row.tier }} <span class="text-medium-emphasis">×{{ row.multiplier }}</span>
            </td>
            <td data-label="Señales">
              <VChip
                v-for="s in row.signals"
                :key="s"
                size="x-small"
                variant="tonal"
                :color="PR_SIGNAL_COLORS[s]"
                :title="PR_SIGNAL_HELP[s]"
                class="mr-1 mb-1"
              >
                {{ PR_SIGNAL_LABELS[s] }}
              </VChip>
            </td>
          </tr>
        </tbody>
      </VTable>
      <div class="d-flex justify-center mb-8">
        <VBtn v-if="visible.length < filtered.length" variant="tonal" @click="limit += PAGE_STEP">
          Ver {{ Math.min(PAGE_STEP, filtered.length - visible.length) }} más
        </VBtn>
      </div>

      <h2 class="text-h6 mb-1">Familias</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Las mismas familias que usan Search Console y el plan de ingreso. Una ficha suelta no dice
        nada; cien juntas dicen si la plantilla trae gente.
      </p>
      <VTable density="compact" class="mb-8 cu-mobile-cards">
        <thead>
          <tr>
            <th>Familia</th>
            <th>Tramo</th>
            <th class="text-right text-no-wrap">URLs</th>
            <th class="text-right text-no-wrap">Base / sem.</th>
            <th class="text-right text-no-wrap">28 días</th>
            <th class="text-right text-no-wrap">% del sitio</th>
            <th>4 semanas</th>
            <th class="text-right text-no-wrap">Tend.</th>
            <th class="text-right text-no-wrap">Perm.</th>
            <th>Entradas</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in snapshot.families.slice(0, 40)" :key="f.family">
            <td data-label="Familia" class="pr-subject">{{ f.family }}</td>
            <td data-label="Tramo" class="text-caption">
              {{ f.tier }} <span class="text-medium-emphasis">×{{ f.multiplier }}</span>
            </td>
            <td data-label="URLs" class="text-right text-no-wrap">{{ prNumber(f.urls) }}</td>
            <td data-label="Base / sem." class="text-right text-no-wrap font-weight-bold">
              {{ prNumber(f.base) }}
            </td>
            <td data-label="28 días" class="text-right text-no-wrap">{{ prNumber(f.views) }}</td>
            <td data-label="% del sitio" class="text-right text-no-wrap">
              {{ prPercent(f.share) }}
            </td>
            <td data-label="4 semanas">
              <span class="pr-bars" :title="f.weeks.join(' · ')">
                <span
                  v-for="(h, i) in prWeekBars(f.weeks)"
                  :key="i"
                  class="pr-bar"
                  :style="{ height: h > 0 ? `${Math.round(h * 100)}%` : '1px' }"
                />
              </span>
            </td>
            <td data-label="Tend." class="text-right text-no-wrap" :class="trendClass(f.trend)">
              {{ prTrend(f.trend) }}
            </td>
            <td data-label="Perm." class="text-right text-no-wrap">
              {{ prSeconds(f.engagementSeconds) }}
            </td>
            <td data-label="Entradas" class="text-caption">
              <span v-if="f.entrances.total">
                <strong>{{ prNumber(f.entrances.total) }}</strong>
                <span class="text-medium-emphasis"> · {{ entranceBreakdown(f.entrances) }}</span>
              </span>
              <span v-else class="text-medium-emphasis">—</span>
            </td>
          </tr>
        </tbody>
      </VTable>

      <h2 class="text-h6 mb-2">Cómo se calcula</h2>
      <ul class="text-body-2 pr-method mb-4">
        <li>
          <strong>Sólo visitas desde Uruguay.</strong> En septiembre de 2026 la mayoría de lo que
          midió Google Analytics fue tráfico automatizado desde Singapur y un salto desde EE.UU.; el
          total de todos los países queda como columna (% UY) para ver qué página es de afuera.
        </li>
        <li>
          <strong>Base semanal = mediana</strong> de las semanas desde la primera con vistas, sin la
          semana del pico si lo hubo. La suma de 28 días la infla un solo día con un enlace
          compartido; la mediana no.
        </li>
        <li>
          <strong>Tendencia dentro de la ventana</strong>, por semana: las últimas dos semanas
          contra las anteriores en que la página ya existía. Nunca contra la ventana anterior: el
          2/9/2026 cambió el consentimiento y Google Analytics pasó a medir casi todo el tráfico,
          así que contra agosto todo "crece".
        </li>
        <li>
          <strong>Entradas</strong> = sesiones que empezaron en la página, por canal. Una página
          puede tener muchas vistas y pocas entradas: la gente llega a ella navegando el sitio.
        </li>
        <li>
          <strong>Pico</strong>: una semana que triplica a la segunda mejor y después se apaga (en
          la última semana todavía no se distingue de un crecimiento). <strong>Cae</strong> /
          <strong>crece</strong>: −40 % / +50 % por semana, con muestra mínima y nunca sobre un
          pico. "Suben" exige 20 vistas en las últimas dos semanas. <strong>Se van rápido</strong>:
          contenido con menos de 20 s por usuario; en una cotización, entrar, ver el número e irse
          es el éxito.
        </li>
      </ul>
    </template>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  PR_FOCUS_GROUPS,
  PR_SIGNAL_COLORS,
  PR_SIGNAL_HELP,
  PR_SIGNAL_LABELS,
  filterRankedPages,
  prChannelLabel,
  prFamilies,
  prIsStale,
  prLabel,
  prNumber,
  prPercent,
  prSeconds,
  prTrend,
  prWeekBars,
  sortRankedPages,
  type Entrances,
  type PageRankingSnapshot,
  type PageSignal,
  type PrSortKey,
} from '~/utils/pageRanking'

// Login is required to get a bearer token at all; the server route re-checks the allowlist, which
// is the check that actually protects the data.
definePageMeta({ middleware: 'auth' })

useHead({
  title: 'Ranking de páginas — panel privado',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

const PAGE_STEP = 50

const { authFetch } = useAuthFetch()

const snapshot = ref<PageRankingSnapshot | null>(null)
const hint = ref('')
const pending = ref(true)
const forbidden = ref(false)

try {
  const res = await authFetch<{ snapshot: PageRankingSnapshot | null; hint?: string }>(
    '/api/site-page-ranking'
  )
  snapshot.value = res.snapshot
  hint.value = res.hint || ''
} catch (e: any) {
  // 403 (not on the allowlist) and 503 (allowlist unset) are the same thing to a reader: no data.
  forbidden.value = e?.statusCode === 403 || e?.response?.status === 403
  hint.value = 'La ruta respondió ' + (e?.statusCode || e?.response?.status || 'error') + '.'
} finally {
  pending.value = false
}

const query = ref('')
const family = ref<string | null>(null)
const signal = ref<PageSignal | null>(null)
const sortKey = ref<PrSortKey>('base')
const limit = ref(PAGE_STEP)

const signalItems = (Object.keys(PR_SIGNAL_LABELS) as PageSignal[]).map(value => ({
  value,
  title: PR_SIGNAL_LABELS[value],
}))
const sortItems: { value: PrSortKey; title: string }[] = [
  { value: 'base', title: 'Base semanal' },
  { value: 'views', title: 'Vistas en 28 días' },
  { value: 'value', title: 'Valor (base × tramo)' },
  { value: 'trend', title: 'Tendencia' },
  { value: 'engagement', title: 'Permanencia' },
]

const familyItems = computed(() => prFamilies(snapshot.value?.pages || []))

const filtered = computed(() =>
  sortRankedPages(
    filterRankedPages(snapshot.value?.pages || [], {
      q: query.value || '',
      family: family.value,
      signal: signal.value,
    }),
    sortKey.value
  )
)
const visible = computed(() => filtered.value.slice(0, limit.value))
watch([query, family, signal, sortKey], () => (limit.value = PAGE_STEP))

const focusGroups = computed(() =>
  PR_FOCUS_GROUPS.map(group => ({
    ...group,
    items: (snapshot.value?.focus || []).filter(f => f.kind === group.kind),
  })).filter(group => group.items.length)
)

const topTenShare = computed(() => {
  const s = snapshot.value
  if (!s) return 0
  const total = s.pages.reduce((acc, p) => acc + p.views, 0)
  const top = [...s.pages]
    .sort((a, b) => b.views - a.views)
    .slice(0, 10)
    .reduce((acc, p) => acc + p.views, 0)
  return total > 0 ? top / total : 0
})

const stale = computed(() => !!snapshot.value && prIsStale(snapshot.value.asOf))
const asOfLabel = computed(() =>
  snapshot.value
    ? new Intl.DateTimeFormat('es-UY', {
        dateStyle: 'medium',
        timeStyle: 'short',
        hourCycle: 'h23',
        timeZone: 'America/Montevideo',
      }).format(new Date(snapshot.value.asOf))
    : ''
)

/** `2026-09-01` → `1/9`. */
const dayLabel = (ymd: string) => {
  const [, m, d] = ymd.split('-').map(Number)
  return m && d ? `${d}/${m}` : ymd
}

const trendClass = (t: number | null) =>
  t === null ? 'text-medium-emphasis' : t <= -0.4 ? 'text-error' : t >= 0.5 ? 'text-success' : ''

const ENTRANCE_PARTS: { key: Exclude<keyof Entrances, 'total'>; label: string }[] = [
  { key: 'organic', label: 'búsq.' },
  { key: 'direct', label: 'dir.' },
  { key: 'social', label: 'redes' },
  { key: 'ai', label: 'IA' },
  { key: 'other', label: 'otros' },
]
const entranceBreakdown = (e: Entrances) =>
  ENTRANCE_PARTS.filter(p => e[p.key] > 0)
    .map(p => `${p.label} ${prNumber(e[p.key])}`)
    .join(' · ')
</script>

<style scoped>
.pr-subject {
  max-width: 24rem;
  overflow-wrap: anywhere;
}
.pr-path {
  overflow-wrap: anywhere;
}
.pr-bars {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 22px;
}
.pr-bar {
  width: 7px;
  border-radius: 1px;
  background: rgb(var(--v-theme-primary));
  opacity: 0.8;
}
.pr-method li {
  margin-bottom: 0.4rem;
}
</style>
