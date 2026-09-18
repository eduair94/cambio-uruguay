<!--
  Explorador de la serie de precios de un mercado: alquileres, viviendas en venta o autos usados.
  Dos medidas que NO son lo mismo, y la página nunca las mezcla: el NIVEL (lo que se pide hoy, que se
  mueve también cuando cambia qué avisos hay publicados) y la MISMA OFERTA (el mismo aviso contra su
  propio precio de hace 7/30/90 días). Sólo la segunda se llama "variación".
  Datos: /api/market-series (índice) y /api/market-series/series (una cohorte), escritos por el job
  currency-market-series. Diseño: docs/superpowers/specs/2026-09-18-seguimiento-de-precios-design.md.
-->
<template>
  <div class="market-explorer">
    <!-- ── Selectores ─────────────────────────────────────────────────────── -->
    <div v-if="isHousing && !compact" class="controls mb-4">
      <div class="d-flex flex-wrap ga-3 align-center mb-2">
        <VBtnToggle
          v-model="currency"
          mandatory
          density="comfortable"
          variant="outlined"
          divided
          aria-label="Moneda"
        >
          <VBtn v-for="option in currencyOptions" :key="option" :value="option">
            {{ option === 'UYU' ? 'Pesos' : 'Dólares' }}
          </VBtn>
        </VBtnToggle>
        <VAutocomplete
          v-model="scope"
          :items="scopeItems"
          label="Zona"
          density="comfortable"
          variant="outlined"
          hide-details
          class="scope-select"
          :no-data-text="'Sin zonas con suficientes avisos'"
        />
      </div>
      <VChipGroup
        v-model="type"
        mandatory
        column
        selected-class="text-primary"
        aria-label="Tipo de vivienda"
      >
        <VChip
          v-for="option in typeOptions"
          :key="option.value"
          :value="option.value"
          :disabled="option.disabled"
          filter
          variant="outlined"
        >
          {{ option.label }}
        </VChip>
      </VChipGroup>
      <VChipGroup
        v-model="bedrooms"
        mandatory
        column
        selected-class="text-primary"
        aria-label="Dormitorios"
      >
        <VChip
          v-for="option in bedroomOptions"
          :key="option.value"
          :value="option.value"
          :disabled="option.disabled"
          filter
          variant="outlined"
        >
          {{ option.label }}
        </VChip>
      </VChipGroup>
    </div>

    <div v-else-if="!isHousing" class="controls mb-4">
      <VAutocomplete
        v-if="!fixedModel"
        v-model="model"
        :items="modelItems"
        label="Modelo (vacío = todos los autos)"
        density="comfortable"
        variant="outlined"
        clearable
        hide-details
        class="scope-select mb-2"
        :no-data-text="'Sin modelos con suficientes avisos'"
      />
      <VChipGroup
        v-if="model && yearOptions.length"
        v-model="yearChoice"
        mandatory
        column
        selected-class="text-primary"
        aria-label="Año"
      >
        <VChip value="all" filter variant="outlined">Todos los años</VChip>
        <VChip
          v-for="option in yearOptions"
          :key="option.year"
          :value="String(option.year)"
          filter
          variant="outlined"
        >
          {{ option.year }}
        </VChip>
      </VChipGroup>
    </div>

    <!-- ── Sin datos ──────────────────────────────────────────────────────── -->
    <VAlert v-if="!series" type="info" variant="tonal" class="mb-4">
      <template v-if="!index && !compact">
        Todavía no hay datos: la lectura corre una vez por día, a las 10:03 de Uruguay.
      </template>
      <template v-else>
        {{ emptyMessage }}
      </template>
    </VAlert>

    <template v-else>
      <h3 class="text-subtitle-1 font-weight-bold mb-3">{{ series.label }}{{ cohortSuffix }}</h3>

      <!-- ── Nivel y misma oferta ─────────────────────────────────────────── -->
      <div class="market-grid mb-4">
        <VCard variant="outlined" class="pa-4">
          <p class="text-overline mb-1">Mediana pedida</p>
          <template v-if="latest && latest.med !== null">
            <p class="text-h5 font-weight-bold mb-1">
              {{ marketMoney(latest.med, seriesCurrency) }}
            </p>
            <p class="text-body-2 text-medium-emphasis mb-1">
              La mitad pide entre {{ marketMoney(latest.p25, seriesCurrency) }} y
              {{ marketMoney(latest.p75, seriesCurrency) }}. {{ marketCount(latest.n) }}
              {{ unitPlural }}.
            </p>
            <p v-if="latest.m2 && latest.m2.med !== null" class="text-body-2 mb-0">
              Por m² construido: {{ marketMoney(latest.m2.med, seriesCurrency) }} ({{
                marketCount(latest.m2.n)
              }}
              con superficie).
            </p>
          </template>
          <p v-else class="text-body-2 mb-0">
            Muy pocas {{ unitPlural }} para una mediana ({{ latest?.n ?? 0 }} de
            {{ MARKET_SAMPLE_MINIMUM }}).
          </p>
        </VCard>

        <VCard v-for="card in windowCards" :key="card.window" variant="outlined" class="pa-4">
          <p class="text-overline mb-1">Misma oferta, {{ card.window }} días</p>
          <template v-if="card.state.kind === 'ok'">
            <p class="text-h5 font-weight-bold mb-1">{{ marketPct(card.state.stats.chg) }}</p>
            <p class="text-body-2 text-medium-emphasis mb-0">
              {{ marketCount(card.state.stats.n) }} avisos que ya seguíamos:
              {{ marketCount(card.state.stats.down) }} bajaron,
              {{ marketCount(card.state.stats.up) }} subieron y
              {{ marketCount(card.state.stats.same) }} quedaron igual.
            </p>
          </template>
          <p v-else-if="card.state.kind === 'waiting'" class="text-body-2 mb-0">
            Se publica desde el {{ marketDay(card.state.from) }}: hace falta haber seguido cada
            aviso {{ card.window }} días.
          </p>
          <p v-else class="text-body-2 mb-0">
            Muy pocos avisos para medir ({{ card.state.n }} de {{ MARKET_PAIR_MINIMUM }}).
          </p>
        </VCard>
      </div>

      <!-- ── Serie ────────────────────────────────────────────────────────── -->
      <div v-if="chart" class="chart-wrap mb-2">
        <ClientOnly>
          <ChartsLineChart
            v-if="laidOut"
            :chart-data="chart.data"
            :options="chartOptions"
            :aria-label="chart.label"
          />
          <template #fallback>
            <VSkeletonLoader type="image" />
          </template>
        </ClientOnly>
      </div>
      <p v-if="chart" class="text-caption text-medium-emphasis mb-3">
        La línea es la mediana del precio pedido y la banda va del percentil 25 al 75. Se mueve
        también cuando cambia qué avisos hay publicados; la "misma oferta" no.
      </p>
      <p v-else class="text-caption text-medium-emphasis mb-3">
        El gráfico aparece con el segundo día de datos.
      </p>

      <VTable class="cu-mobile-cards mb-6" density="compact">
        <caption class="text-caption text-medium-emphasis text-left pb-2">
          {{
            historyCaption
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col">Día</th>
            <th scope="col" class="text-right">{{ unitCapitalized }}</th>
            <th scope="col" class="text-right">Mediana</th>
            <th scope="col" class="text-right">Percentil 25 a 75</th>
            <th scope="col" class="text-right">Misma oferta, 30 días</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in historyRows" :key="row.d">
            <td data-label="Día">{{ marketDay(row.d) }}</td>
            <td data-label="Avisos" class="text-right">{{ marketCount(row.n) }}</td>
            <td data-label="Mediana" class="text-right">
              {{ marketMoney(row.med, seriesCurrency) }}
            </td>
            <td data-label="Percentil 25 a 75" class="text-right">
              {{ marketMoney(row.p25, seriesCurrency) }} a
              {{ marketMoney(row.p75, seriesCurrency) }}
            </td>
            <td data-label="Misma oferta, 30 días" class="text-right">
              {{ marketPct(row.w30?.chg) }}
            </td>
          </tr>
        </tbody>
      </VTable>

      <!-- ── Mismo lugar, otros tipos (alquiler y venta) ──────────────────── -->
      <template v-if="isHousing && !compact && siblingRows.length > 1">
        <h3 class="text-subtitle-1 font-weight-bold mb-2">Mismo lugar, por tipo y dormitorios</h3>
        <VTable class="cu-mobile-cards mb-6" density="compact">
          <thead>
            <tr>
              <th scope="col">Vivienda</th>
              <th scope="col" class="text-right">{{ unitCapitalized }}</th>
              <th scope="col" class="text-right">Mediana</th>
              <th scope="col" class="text-right">Misma oferta, 30 días</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in siblingRows" :key="row.key">
              <td data-label="Vivienda">{{ row.label }}</td>
              <td data-label="Viviendas" class="text-right">{{ marketCount(row.n) }}</td>
              <td data-label="Mediana" class="text-right">
                {{ marketMoney(row.med, seriesCurrency) }}
              </td>
              <td data-label="Misma oferta, 30 días" class="text-right">
                {{ marketPct(row.w30) }}
              </td>
            </tr>
          </tbody>
        </VTable>
      </template>
    </template>

    <!-- ── Mayores movimientos de la misma oferta ───────────────────────── -->
    <template v-if="!compact && index && index.movers.window">
      <h3 class="text-subtitle-1 font-weight-bold mb-1">
        Dónde más se movió la misma oferta, últimos {{ index.movers.window }} días
      </h3>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Sólo {{ isHousing ? 'departamentos y barrios' : 'modelos' }} con 20 avisos o más que ya
        seguíamos. Tocá uno para ver su serie.
      </p>
      <div class="market-grid mb-6">
        <div v-for="side in moverSides" :key="side.title">
          <p class="text-subtitle-2 mb-1">{{ side.title }}</p>
          <p v-if="!side.rows.length" class="text-body-2 text-medium-emphasis">Ninguno.</p>
          <ul class="mover-list">
            <li v-for="mover in side.rows" :key="mover.key">
              <VBtn
                variant="text"
                density="comfortable"
                class="mover-btn"
                @click="selectKey(mover.key)"
              >
                {{ mover.label
                }}<span v-if="isHousing" class="text-medium-emphasis">
                  &nbsp;({{ mover.currency === 'UYU' ? 'pesos' : 'dólares' }})</span
                >
              </VBtn>
              <span class="mover-pct">{{ marketPct(mover.chg) }}</span>
              <span class="text-caption text-medium-emphasis"
                >&nbsp;· {{ marketCount(mover.pairs) }} avisos</span
              >
            </li>
          </ul>
        </div>
      </div>
    </template>

    <p v-if="dataDay" class="text-caption text-medium-emphasis mb-0">
      Datos del {{ marketDay(dataDay)
      }}<template v-if="trackingSince">
        · seguimiento desde el {{ marketDay(trackingSince) }}</template
      >.<template v-if="staleDay">
        Esta combinación no llegó al mínimo en la última lectura: el dato es del
        {{ marketDay(staleDay) }}.</template
      >
    </p>
  </div>
</template>

<script setup lang="ts">
import {
  carSeriesKey,
  housingSeriesKey,
  marketChart,
  marketCount,
  marketDay,
  marketMoney,
  marketPct,
  marketWindowState,
  MARKET_BEDROOM_LABELS,
  MARKET_BEDROOM_ORDER,
  MARKET_PAIR_MINIMUM,
  MARKET_SAMPLE_MINIMUM,
  MARKET_TYPE_LABELS,
  MARKET_TYPE_ORDER,
  MARKET_WINDOWS,
  type MarketBedrooms,
  type MarketCurrency,
  type MarketSeriesIndex,
  type MarketSeriesPoint,
  type MarketSeriesResponse,
  type MarketSibling,
  type MarketTypeBucket,
  type MarketVertical,
} from '~/utils/marketSeries'

const props = withDefaults(
  defineProps<{ vertical: MarketVertical; fixedModel?: string | null; compact?: boolean }>(),
  { fixedModel: null, compact: false }
)

const route = useRoute()
const router = useRouter()
const isHousing = computed(() => props.vertical !== 'autos')
const syncUrl = !props.fixedModel && !props.compact

const TYPES = MARKET_TYPE_ORDER
const BEDS = MARKET_BEDROOM_ORDER
const SCOPE_TOKEN = /^(?:uy|d:[a-z0-9-]{1,80}|b:[a-z0-9-]{1,80}:[a-z0-9-]{1,80})$/
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** A query value, only when this instance owns the URL. */
const queryValue = (name: string): string => {
  const value = route.query[name]
  return syncUrl && typeof value === 'string' ? value : ''
}

const initialCurrency = queryValue('moneda')
const currency = ref<MarketCurrency>(
  initialCurrency === 'UYU' || initialCurrency === 'USD'
    ? initialCurrency
    : props.vertical === 'alquiler'
      ? 'UYU'
      : 'USD'
)
const scope = ref<string>(SCOPE_TOKEN.test(queryValue('zona')) ? queryValue('zona') : 'uy')
const type = ref<MarketTypeBucket>(
  TYPES.includes(queryValue('tipo') as MarketTypeBucket)
    ? (queryValue('tipo') as MarketTypeBucket)
    : 'todas'
)
const bedrooms = ref<MarketBedrooms>(
  BEDS.includes(queryValue('dormitorios') as MarketBedrooms)
    ? (queryValue('dormitorios') as MarketBedrooms)
    : 'any'
)
const model = ref<string | null>(
  props.fixedModel ?? (SLUG.test(queryValue('modelo')) ? queryValue('modelo') : null)
)
const yearChoice = ref<string>(
  /^(?:19|20)\d{2}$/.test(queryValue('anio')) ? queryValue('anio') : 'all'
)
const year = computed(() => (yearChoice.value === 'all' ? null : Number(yearChoice.value)))

const seriesKey = computed(() =>
  props.vertical === 'autos'
    ? carSeriesKey(model.value, year.value)
    : housingSeriesKey(props.vertical, currency.value, type.value, bedrooms.value, scope.value)
)

const { data: indexData } = await useFetch<{ index: MarketSeriesIndex | null }>(
  '/api/market-series',
  {
    query: { v: props.vertical },
    key: `market-index-${props.vertical}`,
    immediate: !props.compact,
  }
)
const { data: seriesData } = await useFetch<MarketSeriesResponse>('/api/market-series/series', {
  query: computed(() => ({ key: seriesKey.value })),
})

const index = computed(() => indexData.value?.index ?? null)
const series = computed(() => seriesData.value?.series ?? null)
const latest = computed<MarketSeriesPoint | null>(() => series.value?.latest ?? null)
const seriesCurrency = computed<MarketCurrency>(() => series.value?.dims.currency ?? currency.value)
/** The day of the data, never the visitor's clock: SSR and the browser always agree. */
const dataDay = computed(() => index.value?.day ?? latest.value?.d ?? null)
const trackingSince = computed(
  () => index.value?.trackingSince ?? series.value?.points[0]?.d ?? latest.value?.d ?? null
)
const staleDay = computed(() =>
  latest.value && dataDay.value && latest.value.d < dataDay.value ? latest.value.d : null
)

const unitPlural = computed(() => (props.vertical === 'alquiler' ? 'viviendas' : 'avisos'))
const unitCapitalized = computed(() => (props.vertical === 'alquiler' ? 'Viviendas' : 'Avisos'))

const cohortSuffix = computed(() => {
  if (!isHousing.value || !series.value) return ''
  const parts: string[] = []
  if (type.value !== 'todas') parts.push(MARKET_TYPE_LABELS[type.value].toLowerCase())
  if (bedrooms.value !== 'any') parts.push(MARKET_BEDROOM_LABELS[bedrooms.value].toLowerCase())
  parts.push(seriesCurrency.value === 'UYU' ? 'en pesos' : 'en dólares')
  return ` · ${parts.join(', ')}`
})

const emptyMessage = computed(() =>
  isHousing.value
    ? `Esta combinación todavía no junta ${MARKET_SAMPLE_MINIMUM} ${unitPlural.value}. Probá con menos filtros o con otra zona.`
    : `Este modelo o año todavía no junta ${MARKET_SAMPLE_MINIMUM} avisos en dólares. Probá con todos los años.`
)

// ── Selectores ──────────────────────────────────────────────────────────────
const siblingByKey = computed(
  () => new Map((seriesData.value?.siblings ?? []).map(sibling => [sibling.key, sibling]))
)
const publishable = (sibling: MarketSibling | undefined): boolean =>
  !!sibling &&
  (sibling.latest.n >= MARKET_SAMPLE_MINIMUM ||
    [sibling.latest.w7, sibling.latest.w30, sibling.latest.w90].some(
      stats => (stats?.n ?? 0) >= MARKET_PAIR_MINIMUM
    ))

const currentScope = computed(
  () => index.value?.scopes.find(entry => entry.token === scope.value) ?? null
)
const currencyOptions = computed<MarketCurrency[]>(() => {
  const options = (['UYU', 'USD'] as const).filter(
    option => (currentScope.value?.n[option] ?? 0) > 0
  )
  return options.length ? options : [currency.value]
})
const scopeItems = computed(() =>
  (index.value?.scopes ?? [])
    .filter(entry => (entry.n[currency.value] ?? 0) > 0 || entry.token === scope.value)
    .map(entry => ({
      title:
        entry.scope === 'uy'
          ? 'Todo el país'
          : entry.scope === 'department'
            ? `${entry.label} (departamento)`
            : entry.label,
      value: entry.token,
    }))
)
const typeOptions = computed(() =>
  TYPES.map(option => ({
    value: option,
    label: MARKET_TYPE_LABELS[option],
    disabled:
      option !== type.value &&
      props.vertical !== 'autos' &&
      !publishable(
        siblingByKey.value.get(
          housingSeriesKey(props.vertical, currency.value, option, 'any', scope.value)
        )
      ),
  }))
)
const bedroomOptions = computed(() =>
  BEDS.map(option => ({
    value: option,
    label: MARKET_BEDROOM_LABELS[option],
    disabled:
      option !== bedrooms.value &&
      props.vertical !== 'autos' &&
      !publishable(
        siblingByKey.value.get(
          housingSeriesKey(props.vertical, currency.value, type.value, option, scope.value)
        )
      ),
  }))
)
const modelItems = computed(() =>
  (index.value?.models ?? []).map(entry => ({
    title: `${entry.brand} ${entry.model}`.trim(),
    value: entry.slug,
  }))
)
const yearOptions = computed(() =>
  (seriesData.value?.siblings ?? [])
    .filter(sibling => sibling.dims.year && publishable(sibling))
    .map(sibling => ({ year: sibling.dims.year as number, n: sibling.latest.n }))
    .sort((a, b) => b.year - a.year)
)

// A currency the place does not have would leave the page empty: fall back to one it has.
watch(currencyOptions, options => {
  if (!options.includes(currency.value)) currency.value = options[0]!
})
watch(model, () => {
  yearChoice.value = 'all'
})
// The model page stays mounted when navigating from one model to another.
watch(
  () => props.fixedModel,
  value => {
    if (value) model.value = value
  }
)

// The URL reflects the selection so a view can be shared. Not immediate: Vuetify controls emit on
// mount, and the first render must not rewrite the URL the visitor arrived with.
if (syncUrl) {
  watch([currency, scope, type, bedrooms, model, yearChoice], () => {
    const defaults = props.vertical === 'alquiler' ? 'UYU' : 'USD'
    const query: Record<string, string> = isHousing.value
      ? {
          ...(currency.value !== defaults ? { moneda: currency.value } : {}),
          ...(scope.value !== 'uy' ? { zona: scope.value } : {}),
          ...(type.value !== 'todas' ? { tipo: type.value } : {}),
          ...(bedrooms.value !== 'any' ? { dormitorios: bedrooms.value } : {}),
        }
      : {
          ...(model.value ? { modelo: model.value } : {}),
          ...(yearChoice.value !== 'all' ? { anio: yearChoice.value } : {}),
        }
    router.replace({ query })
  })
}

/** A mover row opens its own series. */
function selectKey(key: string): void {
  const parts = key.split('|')
  if (props.vertical === 'autos') {
    model.value = /^m:([a-z0-9-]+)$/.exec(parts[2] ?? '')?.[1] ?? null
    return
  }
  currency.value = parts[1] === 'USD' ? 'USD' : 'UYU'
  type.value = 'todas'
  bedrooms.value = 'any'
  scope.value = parts[4] ?? 'uy'
}

// ── Tarjetas, gráfico y tablas ─────────────────────────────────────────────
const windowCards = computed(() =>
  MARKET_WINDOWS.map(window => ({
    window,
    state: marketWindowState(
      latest.value?.[`w${window}`] ?? null,
      window,
      trackingSince.value ?? dataDay.value ?? '9999-12-31',
      dataDay.value ?? '0000-01-01'
    ),
  }))
)

const historyRows = computed(() =>
  [...(series.value?.points ?? [])].reverse().slice(0, props.compact ? 7 : 14)
)
const historyCaption = computed(() =>
  historyRows.value.length === 1
    ? 'El único día con dato por ahora'
    : `Últimos ${historyRows.value.length} días con dato`
)

const siblingRows = computed(() =>
  TYPES.flatMap(option =>
    BEDS.map(bed => {
      const key = housingSeriesKey(
        props.vertical as 'alquiler' | 'venta',
        currency.value,
        option,
        bed,
        scope.value
      )
      const sibling = siblingByKey.value.get(key)
      if (!sibling || sibling.latest.med === null) return null
      const label =
        bed === 'any'
          ? MARKET_TYPE_LABELS[option]
          : `${MARKET_TYPE_LABELS[option]}, ${MARKET_BEDROOM_LABELS[bed].toLowerCase()}`
      return {
        key,
        label,
        n: sibling.latest.n,
        med: sibling.latest.med,
        w30: sibling.latest.w30?.chg ?? null,
      }
    })
  ).filter((row): row is NonNullable<typeof row> => row !== null)
)

const moverSides = computed(() => [
  { title: 'Bajaron más', rows: index.value?.movers.down ?? [] },
  { title: 'Subieron más', rows: index.value?.movers.up ?? [] },
])

const chart = computed(() => {
  const points = series.value?.points ?? []
  if (points.length < 2) return null
  const data = marketChart(points)
  return {
    data: {
      labels: data.labels,
      datasets: [
        {
          label: 'Percentil 25',
          data: data.p25,
          borderColor: '#90a4ae',
          borderDash: [4, 4],
          pointRadius: 0,
          fill: false,
        },
        {
          label: 'Percentil 75',
          data: data.p75,
          borderColor: '#90a4ae',
          backgroundColor: 'rgba(144, 164, 174, 0.18)',
          borderDash: [4, 4],
          pointRadius: 0,
          fill: '-1',
        },
        {
          label: 'Mediana',
          data: data.med,
          borderColor: '#1565c0',
          backgroundColor: '#1565c0',
          tension: 0.2,
          pointRadius: 2,
        },
      ],
    },
    label: `Mediana del precio pedido de ${series.value?.label ?? ''}, del ${marketDay(points[0]!.d)} al ${marketDay(points[points.length - 1]!.d)}`,
  }
})

// Chart.js measures its container once, when it is created. Mounted during hydration it read a
// width of 0 and its resize observer never corrected it (measured: canvas 0 px inside a 768 px box).
// Creating it one frame after mount, once the layout exists, draws it at its real width.
const laidOut = ref(false)
onMounted(() => requestAnimationFrame(() => (laidOut.value = true)))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' } },
  scales: {
    x: { ticks: { maxRotation: 0, autoSkipPadding: 12 } },
    y: {
      ticks: {
        callback: (value: number | string) => marketMoney(Number(value), seriesCurrency.value),
      },
    },
  },
}))
</script>

<style scoped>
.market-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 12px;
}
.scope-select {
  min-width: 240px;
  max-width: 420px;
  flex: 1 1 240px;
}
.chart-wrap {
  position: relative;
  height: 280px;
}
.mover-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.mover-list li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}
.mover-btn {
  text-transform: none;
  letter-spacing: normal;
  padding-inline: 4px;
}
.mover-pct {
  font-weight: 600;
  margin-inline-start: 4px;
}
</style>
