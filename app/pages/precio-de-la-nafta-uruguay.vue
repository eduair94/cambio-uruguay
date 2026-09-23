<template>
  <VContainer class="nafta py-8" style="max-width: 1100px">
    <VBreadcrumbs :items="crumbs" class="px-0 pb-2" />

    <header class="mb-6">
      <VChip color="primary" variant="tonal" size="small" class="mb-3">
        Combustibles<template v-if="month"> · vigente desde el 1.º de {{ month }}</template>
      </VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">Precio de la nafta en Uruguay hoy</h1>
      <p class="text-body-1" style="max-width: 68ch">
        La Nafta Súper 95 vale <strong>{{ fmt(latest.super95) }}</strong> el litro y la Premium 97
        <strong>{{ fmt(latest.premium97) }}</strong
        >; el Gasoil 50-S, <strong>{{ fmt(latest.gasoil50s) }}</strong
        >, y el supergás, <strong>{{ fmt(latest.supergas) }}</strong> el kilo. Precios fijados por
        decreto, iguales en todo el país<template v-if="month"
          >, vigentes desde el 1.º de {{ month }}</template
        >.
      </p>
      <p v-if="superMove" class="text-body-2 text-medium-emphasis mb-1" style="max-width: 68ch">
        {{ superMove }}
      </p>
      <p v-if="yearMove" class="text-body-2 text-medium-emphasis" style="max-width: 68ch">
        {{ yearMove }}
      </p>
    </header>

    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-3">Precios vigentes por producto</h2>
      <div class="table-wrap">
        <VTable class="cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th scope="col">Producto</th>
              <th scope="col" class="text-right">Precio</th>
              <th scope="col" class="text-right">vs. mes anterior</th>
              <th scope="col" class="text-right">Último cambio</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in products" :key="p.key">
              <td data-label="Producto">
                {{ p.label }}
                <span class="text-medium-emphasis">(por {{ p.unit }})</span>
              </td>
              <td data-label="Precio" class="text-right font-weight-bold">
                {{ fmt(latest[p.key]) }}
              </td>
              <td data-label="vs. mes anterior" class="text-right">{{ p.change }}</td>
              <td data-label="Último cambio" class="text-right">{{ p.last }}</td>
            </tr>
          </tbody>
        </VTable>
      </div>
      <VAlert v-if="staleMonth" type="info" variant="tonal" density="comfortable" class="mt-3">
        <span class="text-body-2">
          Última vigencia publicada: 1.º de {{ month }}. Si el Ejecutivo ya fijó los precios de
          {{ currentMonth }}, la tabla se actualiza en el día.
        </span>
      </VAlert>
      <p class="text-caption text-medium-emphasis mt-2">Fuente: ANCAP. {{ asOfLabel }}</p>
    </section>

    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-3">Cuándo cambia el precio</h2>
      <p v-if="nextMonth" class="mb-2" style="max-width: 68ch">
        El próximo cambio posible es el <strong>1.º de {{ nextMonth }}</strong
        >.
      </p>
      <p style="max-width: 68ch">
        El decreto se firma en los últimos días del mes, después del informe de paridad de
        importación que publica
        <a :href="URSEA_PPI_URL" target="_blank" rel="noopener noreferrer" class="cu-link">URSEA</a
        >. Si el Ejecutivo decide mantener los precios, la tabla de arriba no se mueve.
      </p>
    </section>

    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-3">Histórico mensual</h2>
      <div class="chart-wrap">
        <ClientOnly>
          <LineChart
            :chart-data="chartData"
            :options="chartOptions"
            aria-label="Evolución mensual del precio de la nafta, el gasoil y el supergás"
          />
          <template #fallback>
            <VSkeletonLoader type="image" />
          </template>
        </ClientOnly>
      </div>
      <div class="table-wrap mt-4">
        <VTable class="cu-mobile-cards" density="compact">
          <thead>
            <tr>
              <th scope="col">Vigencia</th>
              <th scope="col" class="text-right">Súper 95</th>
              <th scope="col" class="text-right">Premium 97</th>
              <th scope="col" class="text-right">Gasoil 50-S</th>
              <th scope="col" class="text-right">Gasoil 10-S</th>
              <th scope="col" class="text-right">Queroseno</th>
              <th scope="col" class="text-right">Supergás (kg)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in visibleRows" :key="r.from">
              <td data-label="Vigencia">{{ monthLabel(r.from) }}</td>
              <td data-label="Súper 95" class="text-right">{{ fmt(r.super95) }}</td>
              <td data-label="Premium 97" class="text-right">{{ fmt(r.premium97) }}</td>
              <td data-label="Gasoil 50-S" class="text-right">{{ fmt(r.gasoil50s) }}</td>
              <td data-label="Gasoil 10-S" class="text-right">{{ fmt(r.gasoil10s) }}</td>
              <td data-label="Queroseno" class="text-right">{{ fmt(r.queroseno) }}</td>
              <td data-label="Supergás (kg)" class="text-right">{{ fmt(r.supergas) }}</td>
            </tr>
          </tbody>
        </VTable>
      </div>
      <VBtn
        v-if="rowsDesc.length > 12"
        variant="text"
        size="small"
        class="mt-2"
        @click="showAll = !showAll"
      >
        {{ showAll ? 'Ver sólo el último año' : `Ver las ${rowsDesc.length} vigencias` }}
      </VBtn>
    </section>

    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-3">Cómo se fija el precio</h2>
      <div v-for="s in howItWorks" :key="s.heading" class="mb-4">
        <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ s.heading }}</h3>
        <p class="text-body-2" style="max-width: 68ch">{{ s.body }}</p>
      </div>
    </section>

    <FaqSection :items="faq" heading="Preguntas frecuentes" expanded />

    <section class="mt-8 mb-8">
      <h2 class="text-h5 font-weight-bold mb-3">Fuentes</h2>
      <ul class="sources">
        <li v-for="s in sources" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer" class="cu-link">
            {{ s.label }}
          </a>
        </li>
      </ul>
      <p class="text-caption text-medium-emphasis">Verificado el {{ verifiedAt }}.</p>
    </section>

    <section>
      <h2 class="text-h5 font-weight-bold mb-3">Seguir leyendo</h2>
      <div class="d-flex flex-wrap ga-2">
        <VBtn
          v-for="l in related"
          :key="l.to"
          :to="localePath(l.to)"
          variant="tonal"
          color="primary"
          size="small"
        >
          {{ l.label }}
        </VBtn>
      </div>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
// Explícito: components/charts/ no se auto-importa plano (el nombre auto-importado sería
// `ChartsLineChart`), así que <LineChart> quedaría como elemento desconocido, en silencio.
import LineChart from '~/components/charts/LineChart.vue'
import {
  FUEL_HOW_IT_WORKS,
  FUEL_PRODUCTS,
  FUEL_SOURCES,
  FUEL_VERIFIED_AT,
  buildFuelFaq,
  changeBetween,
  formatUyu,
  lastChange,
  monthLabel,
  monthOfYearLabel,
  nextMonthOfYearLabel,
  yearAgo,
} from '~/utils/fuelPrices'
import type { FuelResponse, FuelRow } from '~/utils/fuelPrices'

const localePath = useLocalePath()

const { data } = await useFetch<FuelResponse>('/api/combustibles', { key: 'combustibles' })

// La ruta del servidor siempre contesta (cae al baseline horneado si el backend no responde), pero
// la página no puede depender de eso: una fila vacía imprime "—" y no rompe el render.
const EMPTY_ROW: FuelRow = {
  from: '',
  super95: null,
  premium97: null,
  gasoil50s: null,
  gasoil10s: null,
  queroseno: null,
  supergas: null,
}

const latest = computed<FuelRow>(() => data.value?.latest ?? EMPTY_ROW)
const previous = computed<FuelRow | null>(() => data.value?.previous ?? null)
const rowsAsc = computed<FuelRow[]>(() => data.value?.rows ?? [])
const rowsDesc = computed(() => [...rowsAsc.value].reverse())

const showAll = ref(false)
const visibleRows = computed(() => (showAll.value ? rowsDesc.value : rowsDesc.value.slice(0, 12)))

const fmt = formatUyu
// "setiembre de 2026": estas dos van dentro de la frase «1.º de …». Las celdas de la tabla siguen
// con `monthLabel` ("setiembre 2026"), que es una etiqueta y no una oración.
const month = computed(() => monthOfYearLabel(latest.value.from))
const nextMonth = computed(() => nextMonthOfYearLabel(latest.value.from))

// El mes de hoy en Montevideo, resuelto UNA vez en setup: en el template `Date.now()` se
// reevaluaría en cada render y el SSR y el cliente podrían no coincidir.
const TODAY_MONTH = new Date()
  .toLocaleDateString('en-CA', { timeZone: 'America/Montevideo' })
  .slice(0, 7)
const currentMonth = monthOfYearLabel(`${TODAY_MONTH}-01`)

/**
 * La vigencia más nueva no es de este mes.
 *
 * No es un error por sí solo —el decreto se firma en los últimos días del mes y puede tardar— pero
 * la página dice "hoy" en el título, así que tiene que admitir cuándo el dato que muestra es del
 * mes pasado en vez de dejar al lector suponiendo que nadie tocó el precio.
 */
const staleMonth = computed(() => {
  const from = latest.value.from
  return Boolean(from) && from.slice(0, 7) !== TODAY_MONTH
})

const URSEA_PPI_URL =
  'https://www.gub.uy/unidad-reguladora-servicios-energia-agua/tematica/paridad-precios-importacion-ppi'

const signed = (c: { abs: number; pct: number } | null): string =>
  c == null
    ? '—'
    : c.abs === 0
      ? '= sin cambio'
      : `${c.abs > 0 ? '▲' : '▼'} ${fmt(Math.abs(c.abs))} (${Math.abs(c.pct).toLocaleString('es-UY')} %)`

const products = computed(() =>
  FUEL_PRODUCTS.map(p => {
    const lc = lastChange(rowsAsc.value, p.key)
    return {
      ...p,
      change: signed(changeBetween(previous.value?.[p.key], latest.value[p.key])),
      last: lc ? `${monthLabel(lc.from)}: ${fmt(lc.before)} → ${fmt(lc.after)}` : 'sin cambios',
    }
  })
)

const superMove = computed(() => {
  const c = changeBetween(previous.value?.super95, latest.value.super95)
  if (!c || !previous.value) return ''
  if (c.abs === 0) return `La Súper 95 no cambió respecto de ${monthLabel(previous.value.from)}.`
  return `La Súper 95 ${c.abs > 0 ? 'subió' : 'bajó'} ${fmt(Math.abs(c.abs))} por litro respecto de ${monthLabel(previous.value.from)} (${Math.abs(c.pct).toLocaleString('es-UY')} %).`
})

// El contraste que no da la tabla: doce meses es lo que separa una suba de un mes de una tendencia.
//
// El porcentaje se calcula sobre el precio de HACE UN AÑO (es el denominador de `changeBetween`),
// así que la frase tiene que decir cuánto se movió el precio de hoy POR ENCIMA de aquel, no cuánto
// "menos" costaba entonces: $ 78,20 → $ 88,67 es +13,39 % mirando desde 2025 y −11,81 % mirando
// desde hoy, y son dos números distintos para el mismo movimiento.
const yearMove = computed(() => {
  const before = yearAgo(rowsAsc.value, latest.value.from)
  const c = before ? changeBetween(before.super95, latest.value.super95) : null
  if (!before || !c) return ''
  const when = monthLabel(before.from)
  if (!when) return ''
  if (c.abs === 0) return `Hace un año, en ${when}, la Súper 95 valía lo mismo.`
  const pct = Math.abs(c.pct).toLocaleString('es-UY')
  return `Hace un año, en ${when}, la Súper 95 costaba ${fmt(before.super95)}: hoy está ${pct} % ${c.abs > 0 ? 'por encima' : 'por debajo'}.`
})

const asOfLabel = computed(() =>
  data.value?.asOf
    ? `Tabla leída el ${new Date(data.value.asOf).toLocaleDateString('es-UY', { timeZone: 'America/Montevideo' })}.`
    : 'Tabla verificada a mano.'
)

const faq = computed(() => buildFuelFaq(latest.value, previous.value, rowsAsc.value))
const howItWorks = FUEL_HOW_IT_WORKS
const sources = FUEL_SOURCES
const verifiedAt = new Date(`${FUEL_VERIFIED_AT}T12:00:00Z`).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const related = [
  {
    label: 'Descuentos en combustible',
    to: '/descuentos-con-tarjeta-uruguay/rubro/combustible-y-vehiculos',
  },
  { label: 'IMESI a autos eléctricos', to: '/impuesto-autos-electricos-uruguay' },
  { label: 'Cuánto cuesta tener auto', to: '/guias/costos-de-tener-auto-uruguay' },
  // Cuánta nafta gastás depende de los kilómetros que hacés, y esa cuenta —contra el boleto—
  // está del otro lado.
  { label: '¿Auto, moto u ómnibus?', to: '/conviene-auto-moto-o-omnibus-uruguay' },
  { label: 'Costo de vida', to: '/herramientas/costo-de-vida' },
  { label: 'Dólar hoy', to: '/dolar-hoy' },
]

const chartData = computed(() => ({
  labels: rowsAsc.value.map(r => monthLabel(r.from)),
  datasets: [
    {
      label: 'Súper 95',
      data: rowsAsc.value.map(r => r.super95),
      borderColor: '#1976d2',
      tension: 0.2,
    },
    {
      label: 'Premium 97',
      data: rowsAsc.value.map(r => r.premium97),
      borderColor: '#7b1fa2',
      tension: 0.2,
    },
    {
      label: 'Gasoil 50-S',
      data: rowsAsc.value.map(r => r.gasoil50s),
      borderColor: '#388e3c',
      tension: 0.2,
    },
    {
      label: 'Supergás (kg)',
      data: rowsAsc.value.map(r => r.supergas),
      borderColor: '#f57c00',
      tension: 0.2,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' } },
  scales: {
    x: { ticks: { maxRotation: 0, autoSkipPadding: 12 } },
    y: { ticks: { callback: (v: number) => `$ ${v}` } },
  },
}

const crumbs = computed(() => [
  { title: 'Inicio', to: localePath('/') },
  { title: 'Precio de la nafta', disabled: true },
])

const canonicalUrl = 'https://cambio-uruguay.com/precio-de-la-nafta-uruguay'

/**
 * La cifra se estampa en el `<title>` SÓLO si vino en la respuesta.
 *
 * `EMPTY_ROW` mantiene el cuerpo en pie (imprime "—"), pero un guion en el `<title>` no es un
 * degradado elegante: es "Precio de la nafta hoy: — el litro" en el SERP, y una `og:image` que
 * dice "Súper 95 — · Gasoil —" en cada card de WhatsApp. Misma guarda que
 * `pages/indicadores/[indicador].vue`: con dato, título con número; sin dato, título estable.
 */
const livePrice = computed(() => (latest.value.super95 == null ? null : fmt(latest.value.super95)))
const STATIC_TITLE = 'Precio de la nafta en Uruguay hoy'
const STATIC_DESCRIPTION =
  'Cuánto sale el litro de nafta Súper 95 y Premium 97, el gasoil y el supergás en Uruguay: quién fija el precio, cuándo cambia y el histórico mensual de ANCAP.'

const title = computed(() =>
  livePrice.value ? `Precio de la nafta hoy: ${livePrice.value} el litro` : STATIC_TITLE
)
const description = computed(() =>
  livePrice.value
    ? `Nafta Súper 95 ${livePrice.value}, Premium 97 ${fmt(latest.value.premium97)}, Gasoil 50-S ${fmt(latest.value.gasoil50s)} y supergás ${fmt(latest.value.supergas)} el kilo${month.value ? `, vigentes desde el 1.º de ${month.value}` : ''}. Cuánto subió, cuándo cambia y el histórico mensual de ANCAP.`
    : STATIC_DESCRIPTION
)

defineOgImageComponent('Cambio', {
  title: 'Precio de la nafta hoy',
  subtitle:
    latest.value.super95 != null && latest.value.gasoil50s != null
      ? `Súper 95 ${fmt(latest.value.super95)} · Gasoil ${fmt(latest.value.gasoil50s)}`
      : 'Súper 95, gasoil y supergás',
  tag: 'COMBUSTIBLES',
})

useSeoMeta({
  title: () => `${title.value} | Cambio Uruguay`,
  description: () => description.value,
  ogTitle: () => title.value,
  ogDescription: () => description.value,
  ogType: 'article',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: () => title.value,
  twitterDescription: () => description.value,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [
    {
      name: 'keywords',
      content:
        'precio nafta, precio de la nafta hoy, nafta uruguay, nafta super 95 precio, nafta premium 97 precio, precio gasoil, precio supergas, cuanto sube la nafta, cuando sube la nafta, precio combustibles uruguay, ancap precios',
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
                name: 'Inicio',
                item: 'https://cambio-uruguay.com/',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Precio de la nafta',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'Article',
            headline: title.value,
            description: description.value,
            inLanguage: 'es-UY',
            dateModified: latest.value.from || FUEL_VERIFIED_AT,
            mainEntityOfPage: canonicalUrl,
            author: { '@type': 'Organization', name: 'Cambio Uruguay' },
            publisher: { '@type': 'Organization', name: 'Cambio Uruguay' },
            citation: FUEL_SOURCES.map(s => ({
              '@type': 'CreativeWork',
              name: s.label,
              url: s.url,
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.table-wrap {
  overflow-x: auto;
}
.nafta :deep(.v-table) {
  width: 100%;
}
/* El contenedor del canvas mide 100 % de alto: sin una altura acá el gráfico colapsa a cero. */
.chart-wrap {
  position: relative;
  height: clamp(240px, 44vw, 360px);
}
.cu-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}
.cu-link:hover {
  text-decoration: underline;
}
.sources {
  padding-left: 1.1rem;
  font-size: 0.9rem;
}
.sources li {
  margin-bottom: 4px;
}
</style>
