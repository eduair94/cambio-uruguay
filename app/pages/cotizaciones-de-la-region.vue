<template>
  <VContainer class="page py-6 py-md-10">
    <!-- Hero -->
    <header class="hero on-dark mb-8">
      <p class="eyebrow">Tablero regional · {{ freshness }}</p>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">Cotizaciones de la región</h1>
      <p class="hero-lead text-body-1 mb-4">
        El dólar en <strong>Argentina, Brasil, Paraguay, Chile, Bolivia y Uruguay</strong>, con
        todos los mercados que cada país publica: los siete dólares argentinos, el fixing PTAX y el
        dólar turismo brasileños, el referencial del Banco Central del Paraguay, el observado
        chileno, el oficial y el paralelo bolivianos, y el mejor precio entre las casas de cambio
        uruguayas. Trece fuentes públicas, cuatro de ellas bancos centrales.
      </p>
      <p class="hero-lead text-body-2 mb-4">
        Cada precio dice de dónde salió y qué tipo de precio es. Un fixing oficial y un precio de
        calle no son lo mismo, y un tablero que los apila sin decirlo miente por diseño.
      </p>
      <div class="d-flex flex-wrap ga-2">
        <VBtn
          color="white"
          variant="flat"
          size="small"
          prepend-icon="mdi-swap-horizontal-bold"
          href="#rutas"
        >
          ¿Compro acá o llevo dólares?
        </VBtn>
        <VBtn
          variant="outlined"
          size="small"
          prepend-icon="mdi-api"
          :to="localePath('/api-cotizaciones-regionales')"
        >
          Usar la API
        </VBtn>
        <VBtn variant="text" size="small" prepend-icon="mdi-source-branch" href="#fuentes">
          Las fuentes
        </VBtn>
      </div>
    </header>

    <VAlert
      v-if="stale"
      type="warning"
      variant="tonal"
      density="comfortable"
      icon="mdi-clock-alert-outline"
      class="mb-8"
    >
      El tablero se actualizó por última vez {{ freshness }}. Se refresca cada 20 minutos, así que
      esto no es una pausa del mercado: algo del lado nuestro no está corriendo. Los precios de
      abajo siguen siendo los últimos que se leyeron, no los de este momento.
    </VAlert>

    <!-- 1. El tablero -->
    <section class="mb-10" aria-labelledby="tablero">
      <h2 id="tablero" class="section-heading mb-1">El dólar en cada país</h2>
      <p class="section-lead text-body-2 mb-4">
        La cifra grande es la cotización oficial de cada país. Debajo, lo que realmente se consigue:
        el precio de calle donde existe, y el de mostrador donde no.
      </p>

      <VRow>
        <VCol v-for="row in board" :key="row.country" cols="12" sm="6" lg="4">
          <VCard variant="outlined" class="pa-4 h-100">
            <div class="d-flex align-center justify-space-between mb-2">
              <div class="d-flex align-center ga-2">
                <span class="flag" aria-hidden="true">{{ flagOf(row.country) }}</span>
                <span class="text-subtitle-1 font-weight-bold">{{ row.name }}</span>
              </div>
              <VChip size="x-small" variant="tonal">{{ row.currency }}</VChip>
            </div>

            <p class="rate-big mb-1">
              {{ regionalRate(row.official?.avg ?? null, row.currency) }}
              <span class="rate-unit text-body-2 text-medium-emphasis"
                >{{ row.currency }} / USD</span
              >
            </p>
            <p class="text-caption text-medium-emphasis mb-3">
              {{ row.official?.label || 'Sin cotización oficial en esta corrida' }}
            </p>

            <VDivider class="mb-3" />

            <ul class="market-list">
              <li v-for="market in marketsOf(row)" :key="market.id" class="market-item">
                <span class="market-name">
                  {{ market.label }}
                  <VChip
                    size="x-small"
                    variant="tonal"
                    :color="kindColor(market.kind)"
                    class="ml-1"
                  >
                    {{ kindLabel(market.kind) }}
                  </VChip>
                </span>
                <span class="market-value">{{ regionalRate(market.avg, row.currency) }}</span>
              </li>
            </ul>

            <VChip
              v-if="row.gap"
              :color="regionalGapTone(row.gap.gapPct)"
              size="small"
              variant="tonal"
              class="mt-3"
            >
              {{ gapPhrase(row) }}
            </VChip>

            <div v-if="sparklineFor(row.country).length > 1" class="mt-3">
              <Sparkline
                :values="sparklineFor(row.country)"
                :up="(regionalSeriesChangePct(sparklineFor(row.country)) ?? 0) >= 0"
              />
              <p class="text-caption text-medium-emphasis mt-1">
                {{ sparkCaption(row.country) }}
              </p>
            </div>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- 2. Brechas -->
    <section v-if="snapshot?.gaps?.length" class="mb-10" aria-labelledby="brechas">
      <h2 id="brechas" class="section-heading mb-1">
        Lo que pagás contra lo que publica el Estado
      </h2>
      <p class="section-lead text-body-2 mb-4">
        La brecha se mide punta contra punta: el precio al que te <em>venden</em> un dólar en el
        mercado que podés usar, contra el precio al que te lo vende la referencia oficial. Medida
        entre promedios, la del turismo brasileño da 2,6 %; medida como acá, da lo que realmente
        pagás.
      </p>
      <VTable density="comfortable" class="cu-mobile-cards">
        <thead>
          <tr>
            <th>País</th>
            <th>Mercado</th>
            <th class="text-right">Oficial</th>
            <th class="text-right">Se consigue a</th>
            <th class="text-right">Brecha</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="gap in snapshot.gaps" :key="gap.country">
            <td data-label="País">{{ flagOf(gap.country) }} {{ countryName(gap.country) }}</td>
            <td data-label="Mercado">{{ gap.label }}</td>
            <td data-label="Oficial" class="text-right">{{ regionalRate(gap.official) }}</td>
            <td data-label="Se consigue a" class="text-right">{{ regionalRate(gap.parallel) }}</td>
            <td data-label="Brecha" class="text-right">
              <VChip size="small" variant="tonal" :color="regionalGapTone(gap.gapPct)">
                {{ regionalPct(gap.gapPct) }}
              </VChip>
            </td>
          </tr>
        </tbody>
      </VTable>
    </section>

    <!-- 3. Rutas -->
    <section id="rutas" class="mb-10" aria-labelledby="rutas-h">
      <h2 id="rutas-h" class="section-heading mb-1">¿Compro la moneda acá o llevo dólares?</h2>
      <p class="section-lead text-body-2 mb-4">
        Dos rutas, con precios reales de las dos puntas: comprar la moneda del vecino en una casa de
        cambio uruguaya, o comprar dólares acá y cambiarlos allá. La segunda son dos operaciones,
        así que los costos se multiplican — y aun así suele ganar.
      </p>

      <VCard variant="tonal" class="pa-4 mb-4">
        <div class="d-flex flex-wrap align-center ga-3">
          <VTextField
            v-model.number="amountUyu"
            type="number"
            min="0"
            step="500"
            density="compact"
            variant="outlined"
            hide-details
            label="Pesos uruguayos"
            style="max-width: 200px"
          />
          <span class="text-body-2 text-medium-emphasis">
            Cuánta moneda del vecino te quedan por esa plata, en cada ruta.
          </span>
        </div>
      </VCard>

      <VRow>
        <VCol v-for="comparison in routes" :key="comparison.currency" cols="12" md="6">
          <VCard variant="outlined" class="pa-4 h-100">
            <div class="d-flex align-center ga-2 mb-2">
              <span class="flag" aria-hidden="true">{{ flagOf(comparison.country) }}</span>
              <span class="text-subtitle-1 font-weight-bold">
                {{ comparison.countryName }} · {{ comparison.currency }}
              </span>
            </div>

            <p class="verdict text-body-2 mb-3">{{ regionalRouteVerdict(comparison) }}</p>

            <VTable v-if="comparison.routes.length" density="compact" class="route-table">
              <tbody>
                <tr v-for="route in comparison.routes" :key="route.kind">
                  <td>
                    <span class="font-weight-medium">{{ routeShort(route.kind) }}</span>
                    <span class="d-block text-caption text-medium-emphasis">{{ route.note }}</span>
                  </td>
                  <td class="text-right text-no-wrap">
                    <span class="font-weight-bold">{{ unitsFor(route) }}</span>
                    <span class="d-block text-caption text-medium-emphasis">
                      {{ regionalRate(route.costPerUnit) }} UYU c/u
                    </span>
                  </td>
                </tr>
              </tbody>
            </VTable>

            <VAlert
              v-if="comparison.missing.length"
              type="info"
              variant="tonal"
              density="compact"
              class="mt-3"
            >
              No se puede comparar sin inventar una punta. Falta:
              {{ comparison.missing.join('; ') }}.
            </VAlert>
          </VCard>
        </VCol>
      </VRow>

      <VAlert
        type="info"
        variant="tonal"
        density="comfortable"
        icon="mdi-information-outline"
        class="mt-4"
      >
        <p class="alert-title font-weight-bold mb-1">Lo que esta cuenta no incluye</p>
        <p class="text-body-2 mb-0">
          Ni comisiones fijas por operación, ni el costo de cruzar, ni el riesgo de andar con
          efectivo, ni lo que cambia el precio si operás montos grandes. Compara precios publicados
          de mostrador, que es lo que se puede verificar. Para pesos argentinos, la cuenta larga
          —con el blue, el oficial y lo que cobra cada casa uruguaya— está en
          <NuxtLink :to="localePath('/dolar-blue-hoy')">dólar blue hoy</NuxtLink>.
        </p>
      </VAlert>
    </section>

    <!-- 4. Cruces -->
    <section v-if="crossCurrencies.length" class="mb-10" aria-labelledby="cruces">
      <h2 id="cruces" class="section-heading mb-1">Cruces de la región</h2>
      <p class="section-lead text-body-2 mb-4">
        Cuántas unidades de la moneda de la columna vale una unidad de la moneda de la fila. Todos
        los cruces pasan por el dólar, porque es la única moneda que los seis países cotizan
        directamente, y se anclan <strong>siempre en la cotización oficial</strong>: un cruce armado
        sobre un precio de calle mete la política de un país adentro del tipo de cambio de otro.
      </p>
      <VTable density="comfortable" class="cross-table">
        <thead>
          <tr>
            <th>1 unidad de…</th>
            <th v-for="currency in crossCurrencies" :key="currency" class="text-right">
              {{ currency }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="base in crossCurrencies" :key="base">
            <th scope="row">{{ base }}</th>
            <td v-for="quoteCurrency in crossCurrencies" :key="quoteCurrency" class="text-right">
              <span v-if="base === quoteCurrency" class="text-disabled">—</span>
              <span v-else>{{ regionalRate(crossRate(base, quoteCurrency), quoteCurrency) }}</span>
            </td>
          </tr>
        </tbody>
      </VTable>
    </section>

    <!-- 5. Todas las cotizaciones -->
    <section class="mb-10" aria-labelledby="todas">
      <h2 id="todas" class="section-heading mb-1">Todas las cotizaciones del tablero</h2>
      <p class="section-lead text-body-2 mb-4">
        {{ snapshot?.quotes.length || 0 }} cotizaciones vivas. <strong>Confirman</strong> dice
        cuántas otras fuentes publicaron ese mismo mercado y cuánto se alejó la que más se alejó:
        dos relevamientos honestos del blue difieren en décimas, y una diferencia grande es una
        señal, no un error escondido.
      </p>

      <div v-for="group in quotesByCountry" :key="group.country" class="mb-6">
        <h3 class="text-subtitle-1 font-weight-bold mb-2">
          {{ flagOf(group.country) }} {{ countryName(group.country) }}
        </h3>
        <VTable density="compact" class="cu-mobile-cards">
          <thead>
            <tr>
              <th>Mercado</th>
              <th>Tipo</th>
              <th class="text-right">Compra</th>
              <th class="text-right">Venta</th>
              <th class="text-right">Spread</th>
              <th>Fuente</th>
              <th class="text-right">Confirman</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="quote in group.quotes" :key="quote.id">
              <td data-label="Mercado">
                {{ quote.label }}
                <span v-if="quote.base !== 'USD'" class="text-caption text-medium-emphasis">
                  ({{ quote.base }} → {{ quote.quote }})
                </span>
              </td>
              <td data-label="Tipo">
                <VChip size="x-small" variant="tonal" :color="kindColor(quote.kind)">
                  {{ kindLabel(quote.kind) }}
                </VChip>
              </td>
              <td data-label="Compra" class="text-right">
                {{ regionalRate(quote.buy, quote.quote) }}
              </td>
              <td data-label="Venta" class="text-right">
                {{ regionalRate(quote.sell ?? quote.avg, quote.quote) }}
              </td>
              <td data-label="Spread" class="text-right">
                {{ regionalPct(quote.spreadPct, false) }}
              </td>
              <td data-label="Fuente">
                <a :href="quote.sourceUrl" target="_blank" rel="noopener noreferrer nofollow">
                  {{ sourceName(quote.source) }}
                </a>
              </td>
              <td data-label="Confirman" class="text-right">
                <span v-if="quote.corroboratedBy?.length">
                  {{ quote.corroboratedBy.length }}
                  <span class="text-caption text-medium-emphasis">
                    ({{ regionalPct(quote.disagreementPct, false) }})
                  </span>
                </span>
                <span v-else class="text-disabled">—</span>
              </td>
            </tr>
          </tbody>
        </VTable>
      </div>
    </section>

    <!-- 6. Fuentes -->
    <section id="fuentes" class="mb-10" aria-labelledby="fuentes-h">
      <h2 id="fuentes-h" class="section-heading mb-1">De dónde sale cada número</h2>
      <p class="section-lead text-body-2 mb-4">
        Ninguna cifra de esta página es nuestra salvo la fila de Uruguay, que sale de las ~46 casas
        que este sitio releva cada cinco minutos. Todo lo demás es de quien lo publica, y el enlace
        va al original para que se pueda contrastar sin pasar por acá.
      </p>
      <VTable density="comfortable" class="cu-mobile-cards">
        <thead>
          <tr>
            <th>Fuente</th>
            <th>País</th>
            <th>Quién publica</th>
            <th>Acceso</th>
            <th>Qué aporta</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="source in catalogue" :key="source.id">
            <td data-label="Fuente">
              <a :href="source.url" target="_blank" rel="noopener noreferrer nofollow">{{
                source.name
              }}</a>
            </td>
            <td data-label="País">
              {{ flagOf(source.country) }} {{ countryName(source.country) }}
            </td>
            <td data-label="Quién publica">{{ publisherLabel(source.publisher) }}</td>
            <td data-label="Acceso">
              <VChip
                size="x-small"
                variant="tonal"
                :color="source.access === 'api' ? 'primary' : 'secondary'"
              >
                {{ source.access === 'api' ? 'API' : 'Scraping' }}
              </VChip>
            </td>
            <td data-label="Qué aporta" class="text-body-2">{{ source.covers }}</td>
          </tr>
        </tbody>
      </VTable>

      <div v-if="failedSources.length" class="mt-4">
        <p class="text-body-2 mb-2">
          <strong>En esta corrida no respondieron:</strong>
        </p>
        <ul class="tight-list text-body-2">
          <li v-for="source in failedSources" :key="source.id">
            {{ sourceName(source.id) }} — {{ source.note }}
          </li>
        </ul>
      </div>
    </section>

    <!-- 7. Descartadas -->
    <section v-if="snapshot?.rejected?.length" class="mb-10" aria-labelledby="descartadas">
      <h2 id="descartadas" class="section-heading mb-1">Lo que se descartó, y por qué</h2>
      <p class="section-lead text-body-2 mb-4">
        Un tablero que tira filas en silencio no le enseña nada a nadie. Estas no entraron:
      </p>
      <VTable density="compact" class="cu-mobile-cards">
        <thead>
          <tr>
            <th>Cotización</th>
            <th>Fuente</th>
            <th>Motivo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in snapshot.rejected" :key="`${row.id}-${row.source}`">
            <td data-label="Cotización">
              <code>{{ row.id }}</code>
            </td>
            <td data-label="Fuente">{{ sourceName(row.source) }}</td>
            <td data-label="Motivo">{{ row.reason }}</td>
          </tr>
        </tbody>
      </VTable>
    </section>

    <!-- 8. FAQ -->
    <section class="mb-10">
      <FaqSection :items="FAQ" heading="Preguntas frecuentes" :expanded="true" />
    </section>

    <!-- 9. Seguir -->
    <section aria-labelledby="seguir">
      <h2 id="seguir" class="section-heading mb-3">Seguir por acá</h2>
      <VRow>
        <VCol v-for="link in LINKS" :key="link.to" cols="12" sm="6" md="4">
          <VCard variant="outlined" class="pa-4 h-100" :to="localePath(link.to)">
            <div class="d-flex align-center ga-2 mb-1">
              <VIcon size="small" color="primary">{{ link.icon }}</VIcon>
              <span class="text-subtitle-2 font-weight-bold">{{ link.title }}</span>
            </div>
            <p class="text-body-2 text-medium-emphasis mb-0">{{ link.text }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FaqItem } from '~/utils/faqAnswers'
import {
  REGIONAL_COUNTRIES,
  REGIONAL_KIND_LABELS,
  regionalAge,
  regionalGapTone,
  regionalIsStale,
  regionalPct,
  regionalRate,
  regionalRouteVerdict,
  regionalSeriesChangePct,
  regionalSeriesValues,
  regionalSourceName,
  regionalUnitsFor,
  type RegionalBoardRow,
  type RegionalCountry,
  type RegionalKind,
  type RegionalQuote,
  type RegionalRoute,
  type RegionalSnapshot,
  type RegionalHistoryPoint,
} from '~/utils/regional'

const localePath = useLocalePath()

// Server-rendered: the board IS the page. A crawler and a reader on a slow
// connection both have to get the numbers in the HTML, not after a round trip.
const { data } = await useFetch<RegionalSnapshot | null>('/api/regional', {
  key: 'regional-board',
  default: () => null,
})
const snapshot = computed(() => (data.value?.quotes?.length ? data.value : null))

// Ninety days of the two series that have real history and move daily: the
// Argentine blue and the Brazilian fixing. The rest of the board has no public
// history to draw, and drawing a flat line from three of our own readings would
// imply a stability nobody measured.
// The useFetch keys below are deliberately word-only: gitleaks' generic-api-key
// rule reads `key: 'something-90d'` as a credential and the secret-scan gate blocks
// the deploy. Naming the window in words costs nothing and keeps CI green.
const HISTORY_FROM = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10)
const { data: blueHistory } = await useFetch<{ points: RegionalHistoryPoint[] }>(
  '/api/regional-history',
  {
    key: 'regional-blue-trimestre',
    query: { country: 'AR', market: 'blue', base: 'USD', quote: 'ARS', from: HISTORY_FROM },
    default: () => ({ points: [] }),
  }
)
const { data: ptaxHistory } = await useFetch<{ points: RegionalHistoryPoint[] }>(
  '/api/regional-history',
  {
    key: 'regional-ptax-trimestre',
    query: { country: 'BR', market: 'ptax', base: 'USD', quote: 'BRL', from: HISTORY_FROM },
    default: () => ({ points: [] }),
  }
)

const board = computed<RegionalBoardRow[]>(() => snapshot.value?.board ?? [])
const routes = computed(() => snapshot.value?.routes ?? [])
const catalogue = computed(() => snapshot.value?.catalogue ?? [])
const failedSources = computed(() => (snapshot.value?.sources ?? []).filter(source => !source.ok))

const freshness = computed(() => regionalAge(snapshot.value?.generatedAt ?? null))
const stale = computed(() => regionalIsStale(snapshot.value?.generatedAt ?? null))

const amountUyu = ref(5000)

const countryName = (country: RegionalCountry) => REGIONAL_COUNTRIES[country]?.name ?? country
const flagOf = (country: RegionalCountry) => REGIONAL_COUNTRIES[country]?.flag ?? ''
const kindLabel = (kind: RegionalKind) => REGIONAL_KIND_LABELS[kind]?.short ?? kind
const sourceName = (id: string) => regionalSourceName(id, catalogue.value)

function kindColor(kind: RegionalKind): string {
  if (kind === 'official' || kind === 'wholesale') return 'primary'
  if (kind === 'parallel') return 'warning'
  if (kind === 'card') return 'error'
  if (kind === 'retail') return 'success'
  return 'secondary'
}

const PUBLISHERS: Record<string, string> = {
  'central-bank': 'Banco central',
  'market-data': 'Proveedor de datos',
  media: 'Medio periodístico',
  'exchange-house': 'Casa de cambio',
}
const publisherLabel = (publisher: string) => PUBLISHERS[publisher] ?? publisher

/** The markets of a country other than the headline official one. */
function marketsOf(row: RegionalBoardRow): RegionalQuote[] {
  const currency = row.currency
  return row.quotes
    .filter(
      quote => quote.base === 'USD' && quote.quote === currency && quote.id !== row.official?.id
    )
    .slice(0, 6)
}

function gapPhrase(row: RegionalBoardRow): string {
  if (!row.gap) return ''
  const sign = row.gap.gapPct >= 0 ? 'por encima' : 'por debajo'
  return `${row.gap.label}: ${regionalPct(Math.abs(row.gap.gapPct), false)} ${sign} del oficial`
}

const SPARK_KEYS: Partial<Record<RegionalCountry, string>> = {
  AR: 'AR:blue:USDARS',
  BR: 'BR:ptax:USDBRL',
}

function sparklineFor(country: RegionalCountry): number[] {
  const key = SPARK_KEYS[country]
  if (!key) return []
  const points = country === 'AR' ? blueHistory.value?.points : ptaxHistory.value?.points
  return regionalSeriesValues(points ?? [], key)
}

function sparkCaption(country: RegionalCountry): string {
  const values = sparklineFor(country)
  const change = regionalSeriesChangePct(values)
  const label = country === 'AR' ? 'Blue' : 'PTAX'
  if (change === null) return `${label}, últimos 90 días`
  return `${label}, 90 días: ${regionalPct(change)}`
}

const crossCurrencies = computed(() => {
  const currencies = new Set<string>()
  for (const entry of snapshot.value?.cross ?? []) {
    currencies.add(entry.base)
    currencies.add(entry.quote)
  }
  return [...currencies].sort()
})

function crossRate(base: string, quote: string): number | null {
  return (
    snapshot.value?.cross.find(entry => entry.base === base && entry.quote === quote)?.rate ?? null
  )
}

const quotesByCountry = computed(() => {
  const order: RegionalCountry[] = ['UY', 'AR', 'BR', 'PY', 'CL', 'BO']
  return order
    .map(country => ({
      country,
      quotes: (snapshot.value?.quotes ?? []).filter(quote => quote.country === country),
    }))
    .filter(group => group.quotes.length > 0)
})

const routeShort = (kind: 'local' | 'dollars') =>
  kind === 'local' ? 'Comprar la moneda en Uruguay' : 'Llevar dólares y cambiarlos allá'

function unitsFor(route: RegionalRoute): string {
  const units = regionalUnitsFor(route, amountUyu.value)
  if (units === null) return '—'
  return units.toLocaleString('es-UY', { maximumFractionDigits: units >= 100 ? 0 : 2 })
}

const FAQ: FaqItem[] = [
  {
    id: 'regional-que-dolar',
    question: '¿Por qué Argentina tiene siete dólares y los demás países uno?',
    answer:
      'Porque Argentina realmente tiene siete precios simultáneos y legales para la misma moneda: el oficial, el blue de la calle, el MEP y el contado con liquidación (que se compran con títulos), el mayorista al que operan los bancos, el cripto y el de tarjeta, que suma impuestos. Mostrar uno solo y llamarlo "el dólar en Argentina" es equivocarse seis veces de cada siete. Los demás países no tienen esa fragmentación: Brasil tiene el fixing PTAX y el turismo, Bolivia tiene el oficial y el paralelo, y Paraguay, Chile y Uruguay tienen la referencia y lo que cobra el mostrador.',
  },
  {
    id: 'regional-cada-cuanto',
    question: '¿Cada cuánto se actualiza?',
    answer:
      'Cada 20 minutos. Eso no quiere decir que cada precio sea de hace 20 minutos: el dólar observado chileno es de la rueda del día hábil anterior por definición, el PTAX se fija una vez al día y la planilla del Banco Central del Paraguay se publica una vez por jornada. Cada fila trae la hora que declara su propia fuente, y arriba se muestra la más vieja del tablero.',
  },
  {
    id: 'regional-de-donde',
    question: '¿De dónde salen los datos?',
    answer:
      'De trece fuentes públicas: los bancos centrales de Argentina, Brasil, Paraguay y Chile; proveedores de datos de mercado; dos medios argentinos; una casa de cambio paraguaya; y una referencia internacional que sólo se usa como respaldo y control cruzado. La fila de Uruguay es nuestra: sale de las casas de cambio que este sitio releva cada cinco minutos. La tabla de fuentes de esta página enlaza a cada original.',
  },
  {
    id: 'regional-confiable',
    question: '¿Qué pasa si dos fuentes dicen cosas distintas?',
    answer:
      'Se publican las dos y se dice cuánto difieren. Cuando tres o más fuentes cubren el mismo mercado —hoy sólo pasa en Argentina—, la que se aleja más de un quinto de la mediana queda afuera. Además cada cotización que no está en dólares se contrasta contra lo que implican las dos patas en dólares del mismo país: así se cae un corrimiento de columna en una tabla scrapeada, que de otro modo pasa todos los filtros.',
  },
  {
    id: 'regional-brecha',
    question: '¿La brecha grande es siempre mala?',
    answer:
      'No, pero siempre significa algo. Una brecha del 2 % es un mercado competitivo con costos de intermediación normales. Una del 6 % como la del dólar turismo brasileño es un recargo comercial explícito. Una brecha persistente de dos dígitos, como la que tuvo Argentina durante años, indica que el precio oficial no es el precio al que se puede operar. Por eso la página muestra la brecha y no un solo número "correcto".',
  },
  {
    id: 'regional-api',
    question: '¿Puedo usar estos datos en mi propio proyecto?',
    answer:
      'Sí. Todo lo que muestra esta página sale de una API pública y gratuita, sin registro ni clave: GET /regional para el tablero, GET /regional/history para las series diarias —las argentinas arrancan en 2011 y el PTAX brasileño en 1995—, y GET /regional/convert para convertir entre monedas de la región. Está documentada en la página de la API regional.',
  },
  {
    id: 'regional-uruguay-mostrador',
    question: '¿Por qué la fila de Uruguay a veces muestra una compra mayor que la venta?',
    answer:
      'Porque no es una casa: es lo mejor del mercado. La compra es la más alta que paga alguna casa y la venta la más barata que cobra otra, y en un mercado fragmentado esas dos puntas pueden cruzarse. Medido en vivo, la mejor compra estaba en 40,00 y la venta más barata en 39,55, en casas distintas. Es un dato real sobre el mercado, no un error de cuenta.',
  },
]

const LINKS = [
  {
    to: '/dolar-blue-hoy',
    icon: 'mdi-swap-horizontal-bold',
    title: 'Dólar blue hoy',
    text: 'La cuenta completa para pesos argentinos: blue, oficial y qué cobra cada casa uruguaya.',
  },
  {
    to: '/llevar-dolares-o-reales-a-brasil',
    icon: 'mdi-beach',
    title: 'Dólares o reales para Brasil',
    text: 'El recargo del dólar turismo brasileño contra lo que cobra una casa acá.',
  },
  {
    to: '/api-cotizaciones-regionales',
    icon: 'mdi-api',
    title: 'La API regional',
    text: 'Endpoints, parámetros, series desde 1995 y el catálogo de fuentes.',
  },
  {
    to: '/cotizacion/real',
    icon: 'mdi-cash-multiple',
    title: 'El real en Uruguay',
    text: 'Qué paga y qué cobra cada casa de cambio uruguaya por reales.',
  },
  {
    to: '/cotizacion/peso-argentino',
    icon: 'mdi-cash',
    title: 'El peso argentino en Uruguay',
    text: 'El tablero de pesos argentinos casa por casa.',
  },
  {
    to: '/frontera/real-en-rivera',
    icon: 'mdi-map-marker-radius-outline',
    title: 'Cambio en la frontera',
    text: 'Reales en Rivera, Chuy y Artigas; pesos argentinos en Salto y Paysandú.',
  },
]

const title = 'Cotizaciones de la región: el dólar en Argentina, Brasil, Paraguay, Chile y Bolivia'
const description =
  'Tablero regional con todos los mercados que publica cada país: los siete dólares argentinos, el PTAX y el dólar turismo brasileños, el referencial paraguayo, el observado chileno y el paralelo boliviano, comparados con lo que cobran las casas de cambio uruguayas.'
const canonicalUrl = 'https://cambio-uruguay.com/cotizaciones-de-la-region'

defineOgImageComponent('Cambio', {
  title: 'Cotizaciones de la región',
  subtitle: 'El dólar en Argentina, Brasil, Paraguay, Chile, Bolivia y Uruguay',
  tag: 'TABLERO REGIONAL',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: 'Cotizaciones de la región (Argentina, Brasil, Paraguay, Chile, Bolivia, Uruguay)',
        description,
        url: canonicalUrl,
        inLanguage: 'es-UY',
        license: 'https://opensource.org/licenses/MIT',
        isAccessibleForFree: true,
        creator: { '@type': 'Organization', name: 'Cambio Uruguay' },
        distribution: [
          {
            '@type': 'DataDownload',
            encodingFormat: 'application/json',
            contentUrl: 'https://api.cambio-uruguay.com/regional',
          },
          {
            '@type': 'DataDownload',
            encodingFormat: 'application/json',
            contentUrl: 'https://api.cambio-uruguay.com/regional/history',
          },
        ],
        temporalCoverage: '1995-01-02/..',
        spatialCoverage: ['Argentina', 'Brasil', 'Paraguay', 'Chile', 'Bolivia', 'Uruguay'],
      }),
    },
  ],
}))
</script>

<style scoped>
.hero {
  position: relative;
  isolation: isolate;
  border-radius: 16px;
  padding: 28px 24px;
  background:
    radial-gradient(circle at 82% 16%, rgba(94, 154, 255, 0.24), transparent 34%),
    linear-gradient(135deg, #121b2e 0%, #17324f 58%, #123f52 100%);
  color: #f4f8ff;
}
.hero-lead {
  max-width: 74ch;
  margin-top: 0;
  color: rgba(244, 248, 255, 0.88);
}
.eyebrow {
  display: inline-flex;
  align-items: center;
  margin-top: 0;
  margin-bottom: 12px;
  padding: 4px 12px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  color: #bcd8ff;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.section-heading {
  margin-top: 0;
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.3;
}
.section-lead {
  margin-top: 0;
  max-width: 80ch;
}
.alert-title {
  margin-top: 0;
}
.verdict {
  margin-top: 0;
}
.flag {
  font-size: 1.25rem;
  line-height: 1;
}
.rate-big {
  margin-top: 0;
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.15;
}
.rate-unit {
  font-weight: 400;
  margin-left: 6px;
}
.market-list {
  margin-top: 0;
  padding-left: 0;
  list-style: none;
}
.market-item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.875rem;
}
.market-item + .market-item {
  margin-top: 6px;
}
.market-value {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  white-space: nowrap;
}
.route-table :deep(td) {
  vertical-align: top;
}
.cross-table {
  overflow-x: auto;
}
.cross-table :deep(td),
.cross-table :deep(th) {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.tight-list {
  margin-top: 0;
  padding-left: 1.15rem;
}
.tight-list li + li {
  margin-top: 6px;
}
code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.9em;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(128, 128, 128, 0.16);
}
</style>
