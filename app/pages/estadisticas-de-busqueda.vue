<template>
  <div class="gsc-page py-6">
    <h1 class="text-h4 mb-1">Search Console</h1>
    <p class="text-body-2 text-medium-emphasis mb-6">
      Panel privado. Lo escribe el job <code>currency-gsc</code> una vez por día y no lo ve nadie
      más que las cuentas de <code>NUXT_ADMIN_EMAILS</code>.
    </p>

    <VAlert v-if="pending" type="info" variant="tonal" class="mb-4">Cargando…</VAlert>

    <VAlert v-else-if="forbidden" type="error" variant="tonal" class="mb-4">
      Esta cuenta no está en la lista de administradores.
    </VAlert>

    <VAlert v-else-if="!snapshot" type="warning" variant="tonal" class="mb-4">
      Todavía no hay datos. {{ hint }}
    </VAlert>

    <template v-else>
      <!-- Alerts first: this block is the reason to open the page on a normal day. -->
      <VAlert
        v-for="alert in snapshot.alerts"
        :key="alert.code + alert.message"
        :type="alert.level === 'critical' ? 'error' : 'warning'"
        variant="tonal"
        class="mb-3"
      >
        {{ alert.message }}
      </VAlert>

      <VRow class="mb-2">
        <VCol v-for="card in summary" :key="card.label" cols="6" md="3">
          <VCard variant="outlined" class="pa-4 h-100">
            <div class="text-caption text-medium-emphasis">{{ card.label }}</div>
            <div class="text-h5 font-weight-bold">{{ card.value }}</div>
            <div
              v-if="card.delta"
              class="text-caption"
              :class="card.good ? 'text-success' : 'text-error'"
            >
              {{ card.delta }}
            </div>
          </VCard>
        </VCol>
      </VRow>

      <p class="text-caption text-medium-emphasis mb-6">
        Ventana {{ snapshot.window.startDate }} a {{ snapshot.window.endDate }} (Search Console
        cierra cada día con ~3 días de atraso). Archivo propio: {{ snapshot.archivedDays }} días
        guardados.
      </p>

      <!-- The honest framing: how much of the impression pile can never become a click. -->
      <VCard variant="tonal" color="warning" class="pa-4 mb-6">
        <div class="text-subtitle-1 font-weight-bold mb-1">
          Impresiones que no son clics posibles
        </div>
        <div class="text-body-2">
          {{ formatNumber(snapshot.zeroClickPool.impressions) }} impresiones ({{
            scPercent(snapshot.zeroClickPool.shareOfImpressions, 1)
          }}
          del total) están en {{ snapshot.zeroClickPool.queries }} consultas que Google contesta en
          la propia pantalla — la caja de respuesta del dólar, el conversor. Rindieron
          {{ snapshot.zeroClickPool.clicks }} clics. Ese pozo está excluido de las oportunidades de
          abajo a propósito: subir de posición ahí no cambia nada.
        </div>
      </VCard>

      <!-- La cola de qué escribir. Va JUSTO DESPUÉS del pozo de cero clics porque es su respuesta:
           si el 43 % de las impresiones no puede convertirse en clic, crecer es entrar donde el
           sitio hoy no aparece, y eso no lo puede ver Search Console. -->
      <h2 class="text-h6 mb-2">Qué escribir (fuera de lo que ya rankeamos)</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Search Console sólo lista consultas donde el sitio <em>ya</em> aparece. Esta cola sale del
        autocompletado uruguayo: preguntas que la gente tipea, filtradas por las temáticas del
        sitio, comparadas contra el índice propio para saber si ya están cubiertas y clasificadas
        mirando el SERP. La escribe el job <code>currency-search-demand</code> los domingos.
        <strong>No publica nada</strong>: es una lista para leer y decidir.
      </p>
      <VAlert v-if="!demand" type="info" variant="tonal" density="compact" class="mb-8">
        Todavía no hay cola. {{ demandHint }}
      </VAlert>
      <template v-else>
        <p class="text-caption text-medium-emphasis mb-2">
          {{ demand.asOf }} · {{ formatNumber(demand.harvested) }} sugerencias cosechadas,
          {{ formatNumber(demand.inScope) }} dentro de las temáticas,
          {{ formatNumber(demand.probed) }} clasificadas mirando el SERP. El orden del
          autocompletado es un proxy de frecuencia relativa, no un volumen de búsquedas.
        </p>
        <VTable v-if="demand.items.length" density="compact" class="mb-8 cu-mobile-cards">
          <thead>
            <tr>
              <th>Consulta</th>
              <th>Tema</th>
              <th>SERP</th>
              <th class="text-right">Cobertura</th>
              <th class="text-right">¿Ya rankeamos?</th>
              <th>Por qué</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in demand.items" :key="item.query">
              <td data-label="Consulta" class="gsc-subject">{{ item.query }}</td>
              <td data-label="Tema" class="text-caption">{{ item.topic }}</td>
              <td data-label="SERP">
                <VChip size="x-small" variant="tonal" :color="scDemandColor(item.serp?.verdict)">
                  {{ scDemandLabel(item.serp?.verdict) }}
                </VChip>
              </td>
              <td data-label="Cobertura" class="text-right">
                <span v-if="item.bestPath" :title="item.bestPath">
                  {{ scPercent(item.coverage, 0) }}
                </span>
                <span v-else class="text-medium-emphasis">—</span>
              </td>
              <td data-label="¿Ya rankeamos?" class="text-right">
                <!-- La única señal que dice qué hace GOOGLE y no qué tenemos nosotros. Si ya
                     aparecemos, el trabajo es mejorar la página que existe, no escribir otra. -->
                <span
                  v-if="item.known"
                  :title="`${item.known.impressions} impresiones, ${item.known.clicks} clics`"
                >
                  pos {{ item.known.position.toFixed(1) }}
                </span>
                <span v-else class="text-medium-emphasis">no</span>
              </td>
              <td data-label="Por qué" class="text-caption">{{ item.why }}</td>
            </tr>
          </tbody>
        </VTable>
        <VAlert v-else type="warning" variant="tonal" density="compact" class="mb-8">
          La última corrida no encontró ningún hueco: o el sitio ya cubre lo que el autocompletado
          sugiere, o el servidor de SERP no contestó. Los dos casos se ven igual acá, y se
          distinguen en el log de <code>currency-search-demand</code>.
        </VAlert>
      </template>

      <h2 class="text-h6 mb-2">Demanda y plata, en la misma fila</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Lo que Search Console mide de demanda y lo que GA4 mide de ingreso, por familia de
        plantilla. Se pueden cruzar porque las dos usan el mismo criterio de familia. Es la tabla
        que decide dónde escribir: más clics en una familia que no monetiza no es progreso.
      </p>
      <VAlert
        v-if="!revenue || revenue.pending"
        type="info"
        variant="tonal"
        density="compact"
        class="mb-3"
      >
        <template v-if="!revenue">
          Todavía no hay lectura de ingresos. Corre con el job diario
          <code>currency-site-analytics</code>.
        </template>
        <template v-else>
          El enlace AdSense↔GA4 se creó recién y Google tarda hasta 24 h en devolver datos. Las
          columnas de plata van a estar en cero hasta entonces.
        </template>
      </VAlert>
      <VTable density="compact" class="mb-8 cu-mobile-cards">
        <thead>
          <tr>
            <th>Familia</th>
            <th class="text-right">Impresiones</th>
            <th class="text-right">Clics</th>
            <th class="text-right">CTR</th>
            <th class="text-right">Vistas</th>
            <th class="text-right">RPM</th>
            <th class="text-right">Ingreso</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in familyEconomics" :key="row.bucket">
            <td data-label="Familia">{{ row.bucket }}</td>
            <td data-label="Impresiones" class="text-right">{{ formatNumber(row.impressions) }}</td>
            <td data-label="Clics" class="text-right">{{ formatNumber(row.clicks) }}</td>
            <td data-label="CTR" class="text-right" :class="ctrClass(row.ctr)">
              {{ scPercent(row.ctr) }}
            </td>
            <td data-label="Vistas" class="text-right">{{ formatNumber(row.views) }}</td>
            <td data-label="RPM" class="text-right">
              {{ row.views ? formatRevenue(row.rpm, revenueCurrency) : '—' }}
            </td>
            <td data-label="Ingreso" class="text-right font-weight-bold">
              {{ row.adRevenue ? formatRevenue(row.adRevenue, revenueCurrency) : '—' }}
            </td>
          </tr>
        </tbody>
      </VTable>

      <h2 class="text-h6 mb-2">Rendimiento por familia de página</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        La tabla que decide dónde escribir: el clic por impresión de cada plantilla, medido, no
        supuesto.
      </p>
      <VTable density="compact" class="mb-8 cu-mobile-cards">
        <thead>
          <tr>
            <th>Familia</th>
            <th class="text-right">URLs</th>
            <th class="text-right">Impresiones</th>
            <th class="text-right">Clics</th>
            <th class="text-right">CTR</th>
            <th class="text-right">Posición</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in topPageTypes" :key="row.bucket">
            <td data-label="Familia">{{ row.bucket }}</td>
            <td data-label="URLs" class="text-right">{{ row.urls }}</td>
            <td data-label="Impresiones" class="text-right">{{ formatNumber(row.impressions) }}</td>
            <td data-label="Clics" class="text-right">{{ formatNumber(row.clicks) }}</td>
            <td data-label="CTR" class="text-right" :class="ctrClass(row.ctr)">
              {{ scPercent(row.ctr) }}
            </td>
            <td data-label="Posición" class="text-right">{{ row.position.toFixed(1) }}</td>
          </tr>
        </tbody>
      </VTable>

      <h2 class="text-h6 mb-2">Oportunidades</h2>
      <VChipGroup v-model="kindFilter" class="mb-3" column>
        <VChip value="" filter size="small">Todas</VChip>
        <VChip
          v-for="(meta, kind) in SC_OPPORTUNITY_LABELS"
          :key="kind"
          :value="kind"
          filter
          size="small"
        >
          {{ meta.label }}
        </VChip>
      </VChipGroup>
      <p v-if="kindFilter" class="text-body-2 text-medium-emphasis mb-3">
        {{ SC_OPPORTUNITY_LABELS[kindFilter as ScOpportunity['kind']].why }}
      </p>

      <VTable density="compact" class="mb-8 cu-mobile-cards">
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Consulta o URL</th>
            <th class="text-right">Impr.</th>
            <th class="text-right">Clics</th>
            <th class="text-right">Pos.</th>
            <th class="text-right">Clics a ganar</th>
            <th>Por qué</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(op, i) in visibleOpportunities" :key="op.kind + op.subject + i">
            <td data-label="Tipo">
              <VChip size="x-small" :color="kindColor(op.kind)" variant="tonal">
                {{ SC_OPPORTUNITY_LABELS[op.kind].label }}
              </VChip>
            </td>
            <td data-label="Consulta o URL" class="gsc-subject">{{ op.subject }}</td>
            <td data-label="Impresiones" class="text-right">{{ formatNumber(op.impressions) }}</td>
            <td data-label="Clics" class="text-right">{{ op.clicks }}</td>
            <td data-label="Posición" class="text-right">{{ op.position }}</td>
            <td data-label="Clics a ganar" class="text-right font-weight-bold">
              {{ op.potentialClicks || '—' }}
            </td>
            <td data-label="Por qué" class="text-caption">{{ op.note }}</td>
          </tr>
        </tbody>
      </VTable>

      <h2 class="text-h6 mb-2">Curva de CTR del propio sitio</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Cuánto paga cada posición <em>acá</em>, calculado con las consultas que sí admiten clic. Es
        contra esta curva que se mide "CTR bajo la curva", no contra una tabla de la industria.
      </p>
      <VTable density="compact" class="mb-8">
        <thead>
          <tr>
            <th>Posición</th>
            <th v-for="p in snapshot.ctrCurve" :key="p.position" class="text-right">
              {{ p.position }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>CTR</td>
            <td
              v-for="p in snapshot.ctrCurve"
              :key="p.position"
              class="text-right"
              :class="p.derived ? '' : 'text-medium-emphasis'"
            >
              {{ scPercent(p.ctr, 1) }}
            </td>
          </tr>
        </tbody>
      </VTable>
      <p class="text-caption text-medium-emphasis mb-8">
        En gris, los puntos interpolados por falta de muestra.
      </p>

      <h2 class="text-h6 mb-2">Indexación (muestra rotativa)</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        <template v-if="snapshot.indexation.skippedReason">{{
          snapshot.indexation.skippedReason
        }}</template>
        <template v-else>
          {{ snapshot.indexation.indexed }} de {{ snapshot.indexation.checked }} URLs muestreadas el
          {{ snapshot.indexation.asOf }} están indexadas. La cuota de la API es 2.000 por día, así
          que el job rota la muestra en vez de barrer el sitio entero.
        </template>
      </p>
      <VTable
        v-if="snapshot.indexation.rows?.length"
        density="compact"
        class="mb-8 cu-mobile-cards"
      >
        <thead>
          <tr>
            <th>URL</th>
            <th>Veredicto</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in snapshot.indexation.rows" :key="row.url">
            <td data-label="URL" class="gsc-subject">{{ shortUrl(row.url) }}</td>
            <td data-label="Veredicto">
              <VChip
                size="x-small"
                :color="row.verdict === 'PASS' ? 'success' : 'error'"
                variant="tonal"
              >
                {{ row.verdict }}
              </VChip>
            </td>
            <td data-label="Estado" class="text-caption">{{ row.coverageState }}</td>
          </tr>
        </tbody>
      </VTable>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  SC_OPPORTUNITY_LABELS,
  scPercent,
  type ScOpportunity,
  type SearchConsoleSnapshot,
} from '~/utils/searchConsole'
import { scDemandColor, scDemandLabel, type SearchDemandQueue } from '~/utils/searchDemand'
import { formatRevenue, type SiteRevenueSnapshot } from '~/utils/siteRevenue'

// Login is required to get a bearer token at all; the server route re-checks the allowlist, which
// is the check that actually protects the data.
definePageMeta({ middleware: 'auth' })

useHead({
  title: 'Search Console — panel privado',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

const { authFetch } = useAuthFetch()

const snapshot = ref<SearchConsoleSnapshot | null>(null)
const hint = ref('')
const pending = ref(true)
const forbidden = ref(false)
const kindFilter = ref<string>('')
const revenue = ref<SiteRevenueSnapshot | null>(null)
const demand = ref<SearchDemandQueue | null>(null)
const demandHint = ref('')

try {
  const res = await authFetch<{ snapshot: SearchConsoleSnapshot | null; hint?: string }>(
    '/api/search-console'
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

// El ingreso va en su propia petición y su propio try: es la mitad más nueva del tablero y no
// tiene por qué llevarse puesta la de búsqueda si el enlace AdSense↔GA4 todavía no devuelve nada.
try {
  const res = await authFetch<{ snapshot: SiteRevenueSnapshot | null }>('/api/site-revenue')
  revenue.value = res.snapshot
} catch {
  revenue.value = null
}

// Y la cola de contenido en la suya: es semanal, y una semana sin corrida no puede vaciar el resto
// del tablero.
try {
  const res = await authFetch<{ queue: SearchDemandQueue | null; hint?: string }>(
    '/api/search-demand'
  )
  demand.value = res.queue
  demandHint.value = res.hint || ''
} catch {
  demand.value = null
  demandHint.value = 'La ruta de la cola no respondió.'
}

const formatNumber = (n: number) => new Intl.NumberFormat('es-UY').format(Math.round(n || 0))

const summary = computed(() => {
  const s = snapshot.value
  if (!s) return []
  const delta = (cur: number, prev: number) => {
    if (!prev) return { text: '', good: true }
    const pct = ((cur - prev) / prev) * 100
    return { text: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)} % vs ventana anterior`, good: pct >= 0 }
  }
  const c = delta(s.totals.clicks, s.previousTotals.clicks)
  const i = delta(s.totals.impressions, s.previousTotals.impressions)
  const r = delta(s.totals.ctr, s.previousTotals.ctr)
  // Lower position is better, so the sign is inverted here on purpose.
  const p = delta(s.previousTotals.position, s.totals.position)
  return [
    { label: 'Clics', value: formatNumber(s.totals.clicks), delta: c.text, good: c.good },
    {
      label: 'Impresiones',
      value: formatNumber(s.totals.impressions),
      delta: i.text,
      good: i.good,
    },
    { label: 'CTR', value: scPercent(s.totals.ctr, 3), delta: r.text, good: r.good },
    { label: 'Posición media', value: s.totals.position.toFixed(2), delta: p.text, good: p.good },
  ]
})

const topPageTypes = computed(() => (snapshot.value?.pageTypes || []).slice(0, 25))

/**
 * La tabla que decide dónde escribir: la demanda que mide Search Console y la plata que mide GA4,
 * en la misma fila. Se pueden cruzar porque las dos usan el MISMO `bucketOf` para armar la familia.
 *
 * Ordenada por ingreso mientras haya, y por impresiones el primer día, para que sirva igual antes
 * de que el enlace con AdSense empiece a devolver datos.
 */
const familyEconomics = computed(() => {
  const search = snapshot.value?.pageTypes || []
  const money = new Map((revenue.value?.families || []).map(f => [f.bucket, f]))
  const rows = search.map(row => {
    const m = money.get(row.bucket)
    return {
      bucket: row.bucket,
      urls: row.urls,
      impressions: row.impressions,
      clicks: row.clicks,
      ctr: row.ctr,
      views: m?.screenPageViews ?? 0,
      rpm: m?.rpm ?? 0,
      adRevenue: m?.adRevenue ?? 0,
    }
  })
  rows.sort((a, b) => b.adRevenue - a.adRevenue || b.impressions - a.impressions)
  return rows.slice(0, 25)
})

const revenueCurrency = computed(() => revenue.value?.currency || 'USD')

const visibleOpportunities = computed(() => {
  const all = snapshot.value?.opportunities || []
  const filtered = kindFilter.value ? all.filter(o => o.kind === kindFilter.value) : all
  return filtered.slice(0, 80)
})

function kindColor(kind: ScOpportunity['kind']): string {
  switch (kind) {
    case 'striking-distance':
      return 'primary'
    case 'ctr-below-curve':
      return 'info'
    case 'cannibalisation':
      return 'warning'
    case 'falling':
      return 'error'
    case 'rising':
      return 'success'
    case 'new-query':
      return 'purple'
    default:
      return 'grey'
  }
}

function ctrClass(ctr: number): string {
  if (ctr >= 0.02) return 'text-success font-weight-bold'
  if (ctr < 0.002) return 'text-error'
  return ''
}

const shortUrl = (u: string) => u.replace(/^https?:\/\/[^/]+/, '') || '/'
</script>

<style scoped>
.gsc-subject {
  max-width: 26rem;
  overflow-wrap: anywhere;
}
</style>
