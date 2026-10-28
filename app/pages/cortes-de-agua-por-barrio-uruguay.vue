<!--
  Cuántas veces OSE avisó un corte de agua programado en cada barrio, que es la historia que el
  propio aviso no deja.

  OSE publica sus interrupciones programadas aviso por aviso —uno por intervención, con su texto y
  su fecha— y los baja de la web cuando el corte pasa, así que la pregunta de quien está eligiendo
  dónde vivir («¿acá cortan el agua seguido?») no tiene respuesta publicada en ninguna parte. El
  backend archiva cada aviso y le deriva el barrio al leerlo; esta página no releva nada nuevo: saca
  a la superficie, con su propia URL, el libro que hoy sólo se ve como una barra dentro de una
  tarjeta del directorio de alquileres. Es la gemela de /cortes-de-luz-por-barrio-uruguay, que hace
  lo mismo con el mapa de UTE.

  Lo que mide NO es lo mismo que la de luz y por eso las dos cifras nunca se comparan: allá son
  cortes NO programados y acá son justamente los avisados de antemano. Una rotura no está en este
  libro, porque nadie la avisa antes.

  El snippet se arma en tiempo de render a propósito: la mediana y la peor zona se mueven con la
  ventana y un literal los congelaría.
-->
<template>
  <VContainer class="water-cuts-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">SERVICIOS DEL HOGAR</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Cortes de agua programados por barrio y localidad en Uruguay
      </h1>
      <p v-if="ranking" class="lead mb-6">
        En los <strong>{{ ranking.periodMonths }} meses</strong> que van del
        {{ formatWaterCutDay(ranking.periodFrom) }} al {{ formatWaterCutDay(ranking.periodTo) }},
        las <strong>{{ ranking.rows.length }} zonas</strong> que el archivo cubre{{
          breakdown
        }}acumulan <strong>{{ ranking.attributedNotices }}</strong> avisos de corte programado
        atribuidos, con una mediana de
        <strong>{{ formatWaterCutsLabel(ranking.median) }}</strong> por zona. La que más tuvo es
        <strong>{{ worst[0]!.name }}</strong> con {{ formatWaterCuts(worst[0]!.notices) }}; la que
        menos, <strong>{{ best[0]!.name }}</strong> con {{ formatWaterCuts(best[0]!.notices) }}.
      </p>
      <p v-else class="lead mb-6">
        Esta página archiva los avisos de corte de agua <strong>programado</strong> que publica OSE
        y los cuenta por barrio de Montevideo y por localidad del resto del país.
        <strong>Ahora mismo no hay una ventana publicable</strong>: mientras el libro no tenga al
        menos dos zonas con cifra en una lectura reciente, no se publica un número.
      </p>

      <VAlert type="info" variant="tonal" density="comfortable" class="mb-0">
        <strong>Son avisos, no horas sin agua.</strong> El número cuenta cuántas veces OSE avisó un
        corte programado que nombra esa zona. No mide cuánto duró cada uno, no es una tasa por
        conexión, y <strong>una rotura no entra</strong>: este libro se arma de los avisos previos y
        una rotura no se avisa antes.
      </VAlert>
    </header>

    <section v-if="ranking" id="ranking" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Dónde se avisaron más cortes y dónde menos</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        Avisos de corte programado en la ventana medida. La columna de comparación dice qué parte de
        las otras zonas con dato está peor: 100 % es la zona con menos avisos de todas.
        <strong>No es un ranking de calidad del servicio</strong>: una zona con muchos avisos puede
        ser una zona donde OSE está renovando cañerías, que es trabajo hecho y no servicio roto.
      </p>

      <h3 class="text-subtitle-1 font-weight-bold mb-3">Más avisos de corte</h3>
      <VTable class="cu-mobile-cards mb-8" density="comfortable">
        <thead>
          <tr>
            <th scope="col">Barrio o localidad</th>
            <th scope="col">Departamento</th>
            <th scope="col" class="text-right">Avisos</th>
            <th scope="col" class="text-right">Mejor que</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in worst" :key="row.id">
            <td data-label="Barrio o localidad">{{ row.name }}</td>
            <td data-label="Departamento">{{ row.department }}</td>
            <td data-label="Avisos" class="text-right">{{ formatWaterCuts(row.notices) }}</td>
            <td data-label="Mejor que" class="text-right">{{ betterThanLabel(row) }}</td>
          </tr>
        </tbody>
      </VTable>

      <h3 class="text-subtitle-1 font-weight-bold mb-3">Menos avisos de corte</h3>
      <VTable class="cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th scope="col">Barrio o localidad</th>
            <th scope="col">Departamento</th>
            <th scope="col" class="text-right">Avisos</th>
            <th scope="col" class="text-right">Mejor que</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in best" :key="row.id">
            <td data-label="Barrio o localidad">{{ row.name }}</td>
            <td data-label="Departamento">{{ row.department }}</td>
            <td data-label="Avisos" class="text-right">{{ formatWaterCuts(row.notices) }}</td>
            <td data-label="Mejor que" class="text-right">{{ betterThanLabel(row) }}</td>
          </tr>
        </tbody>
      </VTable>

      <p class="text-medium-emphasis mt-5 mb-0" style="max-width: 72ch">
        Departamentos con al menos una zona nombrada: {{ ranking.departments.join(', ') }}.
      </p>
    </section>

    <section id="como-se-mide" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Cómo se cuenta, y qué no dice este número</h2>
      <VCard variant="flat" class="method-card pa-5 pa-md-6">
        <ul class="method-list mb-0">
          <li>
            <strong>La fuente es el propio aviso de OSE.</strong> Cada aviso de interrupción
            programada se archiva con su fecha cuando se publica, porque OSE lo baja de su web
            cuando el corte pasa. Lo que se cuenta acá son esos avisos archivados.
          </li>
          <li>
            <strong>El barrio sale de lo que el aviso escribe.</strong> Sólo se atribuye a una zona
            cuando el aviso la nombra. Un aviso que enumera calles y no nombra ningún barrio
            <strong>no se reparte</strong> entre los barrios que esas calles cruzan: no se cuenta en
            ninguno. Por eso el total de arriba es el de los avisos atribuidos y no el de todos los
            que publicó OSE.
          </li>
          <li>
            <strong>Un aviso no es un barrio entero sin agua.</strong> La mayoría afecta un puñado
            de cuadras; el aviso nombra la zona para ubicarlas. Que una zona tenga muchos avisos no
            dice que toda ella se quedó sin agua muchas veces.
          </li>
          <li>
            <strong>Sólo lo programado.</strong> Una rotura, una bajada de presión o un corte sin
            aviso no están acá. Es el recorte contrario al de la página de luz, que mide justamente
            los cortes <strong>no</strong> programados del mapa de UTE: las dos cifras miden cosas
            distintas y no se comparan entre sí.
          </li>
          <li>
            <strong>Una zona sin dato no aparece con cero.</strong> No aparece. La ausencia de
            avisos en nuestro archivo no es una afirmación sobre esa zona.
          </li>
          <li>
            <strong>No es una estadística oficial.</strong> Es un recuento propio de avisos
            públicos, con la ventana y la fecha a la vista. OSE no publica esta tabla.
          </li>
        </ul>
      </VCard>
    </section>

    <section id="que-hacer" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Si te dejaron sin agua</h2>
      <p class="mb-4" style="max-width: 72ch">
        El aviso de OSE dice la fecha, la franja horaria y la zona de cada corte programado, así que
        es lo primero que conviene mirar antes de reclamar: un corte avisado no es una falla. Si no
        había aviso, o si el agua no volvió cuando decía, el reclamo arranca en OSE.
      </p>
      <div class="d-flex flex-wrap ga-3">
        <VBtn :to="localePath('/factura-de-ose-uruguay')" color="primary" variant="flat">
          Cómo se arma la factura de OSE
        </VBtn>
        <VBtn :to="localePath('/cortes-de-luz-por-barrio-uruguay')" variant="outlined">
          Cortes de luz por barrio
        </VBtn>
        <VBtn :to="localePath('/a-quien-le-reclamo-uruguay')" variant="outlined">
          A quién le reclamo
        </VBtn>
        <VBtn :to="localePath('/barrios-alquileres-uruguay')" variant="text">
          Comparar barrios para alquilar
        </VBtn>
      </div>
    </section>

    <section id="fuentes">
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <ul class="sources">
        <li v-for="source in WATER_CUT_SOURCES" :key="source.url">
          <a :href="source.url" target="_blank" rel="noopener noreferrer" class="cu-link">
            {{ source.label }}
          </a>
        </li>
      </ul>
      <p v-if="ranking" class="text-caption text-medium-emphasis mt-3 mb-0">
        Ventana contada: {{ formatWaterCutDay(ranking.periodFrom) }} a
        {{ formatWaterCutDay(ranking.periodTo) }}. Última lectura del libro:
        {{ formatWaterCutDay(ranking.generatedAt) }}.
      </p>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import type { RentalZoneScores } from '~/utils/rentalZoneTypes'
import {
  WATER_CUT_SOURCES,
  bestWaterCutRows,
  buildWaterCutRanking,
  formatWaterCutDay,
  formatWaterCuts,
  formatWaterCutsLabel,
  waterCutDescription,
  waterCutTitle,
  waterCutZonesBreakdown,
  worstWaterCutRows,
  type WaterCutRow,
} from '~/utils/waterCutRanking'

const localePath = useLocalePath()
const canonicalUrl = 'https://cambio-uruguay.com/cortes-de-agua-por-barrio-uruguay'

// El endpoint contesta 503 mientras la capa no tiene nada publicable, y eso no es un error de esta
// página: `default` deja la vista en su estado "todavía sin ventana" en vez de romper el SSR.
const { data: scores } = await useFetch<RentalZoneScores | null>('/api/rentals/zone-scores', {
  key: 'water-cut-zone-scores',
  default: () => null,
})

const ranking = computed(() => buildWaterCutRanking(scores.value))
const worst = computed<WaterCutRow[]>(() => (ranking.value ? worstWaterCutRows(ranking.value) : []))
const best = computed<WaterCutRow[]>(() => (ranking.value ? bestWaterCutRows(ranking.value) : []))

const betterThanLabel = (row: WaterCutRow) => `${Math.round(row.betterThan * 100)} %`
// Lleva sus propios espacios: una zona nombrada sola no abre guion y la frase tiene que cerrar
// igual («las 62 zonas que el archivo cubre acumulan …»).
const breakdown = computed(() => (ranking.value ? waterCutZonesBreakdown(ranking.value) : ' '))

const title = computed(() => waterCutTitle(ranking.value))
const description = computed(() => waterCutDescription(ranking.value))

defineOgImageComponent('Cambio', {
  title: 'Cortes de agua por barrio',
  subtitle: 'Avisos de corte programado de OSE, archivados',
  tag: 'SERVICIOS DEL HOGAR',
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
        'cortes de agua uruguay, corte de agua por barrio, ose cortes programados, corte de agua montevideo, cuantos cortes de agua tiene mi barrio, interrupciones programadas ose, barrios con mas cortes de agua, ose aviso de corte',
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
                name: 'Factura de OSE',
                item: 'https://cambio-uruguay.com/factura-de-ose-uruguay',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Cortes de agua por barrio',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'Dataset',
            name: 'Avisos de corte de agua programado por barrio y localidad en Uruguay',
            description: description.value,
            inLanguage: 'es-UY',
            isAccessibleForFree: true,
            temporalCoverage: ranking.value
              ? `${ranking.value.periodFrom}/${ranking.value.periodTo}`
              : undefined,
            spatialCoverage: { '@type': 'Place', name: 'Uruguay' },
            variableMeasured:
              'Avisos de interrupción programada del servicio de agua potable atribuidos a un barrio o localidad nombrado en el aviso',
            creator: { '@type': 'Organization', name: 'Cambio Uruguay' },
            citation: WATER_CUT_SOURCES.map(source => ({
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
.water-cuts-page .lead {
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
.method-list li + li {
  margin-top: 0.75rem;
}
.sources {
  padding-left: 1.1rem;
  max-width: 78ch;
}
.sources li + li {
  margin-top: 0.4rem;
}
</style>
