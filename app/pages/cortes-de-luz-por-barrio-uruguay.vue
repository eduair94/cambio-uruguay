<!--
  Cuántos minutos sin luz tuvo cada barrio, que es el único corte del dato que no publica nadie.

  URSEA publica la calidad del servicio por AGRUPAMIENTO: 42 agrupamientos definidos por zona
  geográfica (uno o varios departamentos) y, dentro de la zona, por densidad de suministros; su
  informe de calidad del servicio técnico no baja a barrio. El backend integra cada diez minutos el
  mapa público de UTE y deja minutos por cliente y por mes en cada barrio, así que esta página no
  releva nada nuevo: saca a la superficie, con su propia URL, el libro que hoy sólo se ve como una
  barra dentro de una tarjeta del directorio de alquileres.

  El snippet se arma en tiempo de render a propósito: la mediana y el peor barrio cambian todos los
  días y un literal los congelaría — es el defecto que `seoDescriptionBudget.test.ts` documenta.
-->
<template>
  <VContainer class="outages-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">SERVICIOS DEL HOGAR</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Cortes de luz por barrio y localidad en Uruguay
      </h1>
      <p v-if="ranking" class="lead mb-6">
        En los <strong>{{ ranking.observedDays }} días</strong> medidos hasta el
        {{ formatOutageDay(ranking.observedTo) }}, la mediana de las
        <strong>{{ ranking.rows.length }} áreas</strong> con dato —{{ ranking.barrios }} barrios de
        Montevideo y {{ ranking.localidades }} localidades del resto del país— es de
        <strong>{{ formatOutageMinutes(ranking.median) }}</strong> sin luz al mes por cliente, por
        cortes no programados. El peor es <strong>{{ worst[0]!.name }}</strong> con
        {{ formatOutageMinutes(worst[0]!.minutes) }}; el mejor,
        <strong>{{ best[0]!.name }}</strong> con {{ formatOutageMinutes(best[0]!.minutes) }}.
      </p>
      <p v-else class="lead mb-6">
        Esta página publica los minutos sin luz de cada barrio de Montevideo y de cada localidad del
        resto del país, integrados del mapa público de UTE cada diez minutos.
        <strong>Todavía no hay suficientes días medidos</strong> para publicar una cifra: el libro
        necesita {{ POWER_OUTAGE_PRELIMINARY_DAYS }} días para una cifra provisoria y
        {{ POWER_OUTAGE_MIN_DAYS }} para una definitiva, y no se publica un número antes de tenerlo.
      </p>

      <VAlert
        v-if="ranking?.provisional"
        type="info"
        variant="tonal"
        density="comfortable"
        class="mb-4"
      >
        <strong
          >Provisorio: {{ ranking.observedDays }} de {{ POWER_OUTAGE_MIN_DAYS }} días
          medidos.</strong
        >
        Es una medición real de una ventana corta, no una estimación: a los
        {{ POWER_OUTAGE_MIN_DAYS }} días la cifra pasa a definitiva y la etiqueta se cae sola.
      </VAlert>

      <!-- Una ventana vieja se publica con su fecha, nunca como si fuera la de hoy. -->
      <VAlert
        v-if="ranking?.stale"
        type="warning"
        variant="tonal"
        density="comfortable"
        class="mb-0"
      >
        <strong
          >La última ventana medida cierra el {{ formatOutageDay(ranking.observedTo) }}.</strong
        >
        Las cifras de abajo son de esa ventana y son reales, pero no son las de hoy: el libro no se
        actualizó desde entonces.
      </VAlert>
    </header>

    <section v-if="ranking" id="ranking" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Dónde hay más y dónde hay menos cortes</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        Minutos por cliente y por mes, sólo cortes <strong>no programados</strong>. La columna de
        referencia compara contra los {{ POWER_OUTAGE_BENCHMARK_MINUTES }} min al mes que salen del
        Tca de 3,6 h por semestre que URSEA publica para el agrupamiento «Urbano alta densidad BT».
        <strong>No es una meta de esa área</strong>: URSEA la mide sobre un agrupamiento entero, con
        su propia metodología, y buena parte de esta tabla no son zonas urbanas densas.
      </p>

      <h3 class="text-subtitle-1 font-weight-bold mb-3">Más minutos sin luz</h3>
      <VTable class="cu-mobile-cards mb-8" density="comfortable">
        <thead>
          <tr>
            <th scope="col">Barrio o localidad</th>
            <th scope="col">Departamento</th>
            <th scope="col" class="text-right">Sin luz al mes</th>
            <th scope="col" class="text-right">Contra la referencia</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in worst" :key="row.id">
            <td data-label="Barrio o localidad">{{ row.name }}</td>
            <td data-label="Departamento">{{ row.department }}</td>
            <td data-label="Sin luz al mes" class="text-right">
              {{ formatOutageMinutes(row.minutes) }}
            </td>
            <td data-label="Contra la referencia" class="text-right">{{ vsBenchmark(row) }}</td>
          </tr>
        </tbody>
      </VTable>

      <h3 class="text-subtitle-1 font-weight-bold mb-3">Menos minutos sin luz</h3>
      <VTable class="cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th scope="col">Barrio o localidad</th>
            <th scope="col">Departamento</th>
            <th scope="col" class="text-right">Sin luz al mes</th>
            <th scope="col" class="text-right">Contra la referencia</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in best" :key="row.id">
            <td data-label="Barrio o localidad">{{ row.name }}</td>
            <td data-label="Departamento">{{ row.department }}</td>
            <td data-label="Sin luz al mes" class="text-right">
              {{ formatOutageMinutes(row.minutes) }}
            </td>
            <td data-label="Contra la referencia" class="text-right">{{ vsBenchmark(row) }}</td>
          </tr>
        </tbody>
      </VTable>

      <p class="text-medium-emphasis mt-5 mb-0" style="max-width: 72ch">
        De las {{ ranking.rows.length }} áreas medidas,
        <strong>{{ ranking.aboveBenchmark }}</strong> están por encima de esa referencia y
        {{ ranking.rows.length - ranking.aboveBenchmark }} por debajo. Departamentos con dato:
        {{ ranking.departments.join(', ') }}.
      </p>
    </section>

    <section id="como-se-mide" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Cómo se mide, y qué no dice este número</h2>
      <VCard variant="flat" class="method-card pa-5 pa-md-6">
        <ul class="method-list mb-0">
          <li>
            <strong>La fuente es el mapa de UTE.</strong> Cada diez minutos se lee el mapa público
            de la situación del servicio eléctrico y se integra el tiempo que cada área estuvo
            afectada. El resultado son minutos por cliente y por mes, repartidos por la cantidad de
            clientes de cada una.
          </li>
          <li>
            <strong>Un hueco en la lectura no inventa horas.</strong> Si entre dos lecturas pasan
            más de veinte minutos, el tramo se acredita como diez y no como el hueco entero.
          </li>
          <li>
            <strong>Sólo cortes no programados.</strong> Los avisados de antemano se miden aparte y
            no entran en estas tablas: no describen lo mismo.
          </li>
          <li>
            <strong>No es una estadística oficial y no reemplaza a URSEA.</strong> URSEA publica por
            agrupamiento —42 agrupamientos por zona geográfica y densidad de suministros— y no
            desagrega por barrio ni por localidad; esta medición es nuestra, con otra metodología, y
            las dos cifras no son intercambiables.
          </li>
          <li>
            <strong>Un área sin dato no aparece con cero.</strong> No aparece. La ausencia no es una
            afirmación.
          </li>
        </ul>
      </VCard>
    </section>

    <section id="reclamo" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Si el corte te afectó</h2>
      <p class="mb-4" style="max-width: 72ch">
        El reclamo arranca en UTE y, si la respuesta no conforma, URSEA atiende en segunda
        instancia. Las compensaciones por incumplimiento de los indicadores de calidad no se piden
        caso por caso: se descuentan de la factura cuando el agrupamiento incumple. Eso está
        explicado en la página de la factura.
      </p>
      <div class="d-flex flex-wrap ga-3">
        <VBtn to="/factura-de-ute-uruguay" color="primary" variant="flat">
          Cómo se arma la factura de UTE
        </VBtn>
        <VBtn to="/a-quien-le-reclamo-uruguay" variant="outlined">A quién le reclamo</VBtn>
        <VBtn to="/barrios-alquileres-uruguay" variant="text">Comparar barrios para alquilar</VBtn>
      </div>
    </section>

    <section id="fuentes">
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <ul class="sources">
        <li v-for="source in POWER_OUTAGE_SOURCES" :key="source.url">
          <a :href="source.url" target="_blank" rel="noopener noreferrer" class="cu-link">
            {{ source.label }}
          </a>
        </li>
      </ul>
      <p v-if="ranking" class="text-caption text-medium-emphasis mt-3 mb-0">
        Ventana medida: {{ formatOutageDay(ranking.observedFrom) }} a
        {{ formatOutageDay(ranking.observedTo) }}.
      </p>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import type { RentalZoneScores } from '~/utils/rentalZoneTypes'
import {
  POWER_OUTAGE_BENCHMARK_MINUTES,
  POWER_OUTAGE_MIN_DAYS,
  POWER_OUTAGE_PRELIMINARY_DAYS,
  POWER_OUTAGE_SOURCES,
  bestPowerOutageRows,
  buildPowerOutageRanking,
  formatOutageDay,
  formatOutageMinutes,
  powerOutageDescription,
  powerOutageTitle,
  worstPowerOutageRows,
  type PowerOutageRow,
} from '~/utils/powerOutageRanking'

const canonicalUrl = 'https://cambio-uruguay.com/cortes-de-luz-por-barrio-uruguay'

// El endpoint contesta 503 mientras el libro no tiene nada publicable, y eso no es un error de
// esta página: `default` deja la vista en su estado "todavía midiendo" en vez de romper el SSR.
const { data: scores } = await useFetch<RentalZoneScores | null>('/api/rentals/zone-scores', {
  key: 'power-outage-zone-scores',
  default: () => null,
})

const ranking = computed(() => buildPowerOutageRanking(scores.value))
const worst = computed<PowerOutageRow[]>(() =>
  ranking.value ? worstPowerOutageRows(ranking.value) : []
)
const best = computed<PowerOutageRow[]>(() =>
  ranking.value ? bestPowerOutageRows(ranking.value) : []
)

const vsBenchmark = (row: PowerOutageRow) => {
  const diff = Math.round(row.minutes - POWER_OUTAGE_BENCHMARK_MINUTES)
  if (diff === 0) return 'igual'
  return diff > 0 ? `+${diff} min` : `${diff} min`
}

const title = computed(() => powerOutageTitle(ranking.value))
const description = computed(() => powerOutageDescription(ranking.value))

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
        'cortes de luz uruguay, corte de luz por barrio, cuantos cortes de luz tiene mi barrio, minutos sin luz ute, calidad del servicio ursea, cortes de luz montevideo, ute corte de luz zona, barrios con mas cortes de luz',
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
                name: 'Factura de UTE',
                item: 'https://cambio-uruguay.com/factura-de-ute-uruguay',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Cortes de luz por barrio',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'Dataset',
            name: 'Minutos sin luz por barrio y localidad en Uruguay',
            description: description.value,
            inLanguage: 'es-UY',
            isAccessibleForFree: true,
            temporalCoverage:
              ranking.value?.observedFrom && ranking.value?.observedTo
                ? `${ranking.value.observedFrom}/${ranking.value.observedTo}`
                : undefined,
            spatialCoverage: { '@type': 'Place', name: 'Uruguay' },
            variableMeasured:
              'Minutos sin suministro eléctrico por cliente y por mes, cortes no programados',
            creator: { '@type': 'Organization', name: 'Cambio Uruguay' },
            citation: POWER_OUTAGE_SOURCES.map(source => ({
              '@type': 'CreativeWork',
              name: source.label,
              url: source.url,
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.outages-page .lead {
  max-width: 72ch;
  font-size: 1.05rem;
  line-height: 1.6;
}
.method-card {
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 14px;
}
.method-list {
  padding-left: 1.1rem;
  max-width: 78ch;
}
.method-list li {
  margin-top: 0.75rem;
}
.method-list li:first-child {
  margin-top: 0;
}
.sources {
  padding-left: 1.1rem;
  font-size: 0.9rem;
}
.sources li {
  margin-top: 4px;
}
.cu-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}
.cu-link:hover {
  text-decoration: underline;
}
</style>
