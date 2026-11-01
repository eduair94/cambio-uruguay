<!--
  Cuántos reclamos de alumbrado, saneamiento y limpieza registra cada barrio de Montevideo, que es
  la tabla que la Intendencia tiene y no publica.

  La IM publica su Sistema Único de Reclamos como datos abiertos: un ZIP de 44 MB con un CSV de 300
  MB y 1,7 millones de filas. El dato existe y no se puede leer sin bajarlo entero, así que la
  pregunta de quien está eligiendo dónde vivir —o de quien va a reclamar una luz quemada y quiere
  saber si en su zona eso pasa seguido— no tiene respuesta publicada en ninguna parte. El backend ya
  baja ese volcado y lo agrega por barrio INE; esta página no releva nada nuevo: saca a la
  superficie, con su propia URL, las tres barras que hoy sólo se ven dentro de una tarjeta del
  directorio de alquileres. Es la tercera de la serie, después de /cortes-de-luz-por-barrio-uruguay
  (mapa de UTE) y /cortes-de-agua-por-barrio-uruguay (avisos de OSE).

  Lo que mide NO es la calidad del servicio y por eso la página nunca ordena por «peor barrio»: un
  reclamo es alguien que reclamó. Un barrio que reclama más puede ser uno más organizado y uno sin
  reclamos puede ser uno que ya no espera respuesta; la dirección de la diferencia no sale de este
  dato. Las tres familias tampoco se suman entre sí: son tres servicios distintos.

  El snippet se arma en tiempo de render a propósito: la mediana y el barrio que más reclama se
  mueven con cada lectura del volcado y un literal los congelaría.
-->
<template>
  <VContainer class="im-claims-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">SERVICIOS DEL HOGAR</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Reclamos a la Intendencia de Montevideo por barrio: alumbrado, saneamiento y limpieza
      </h1>
      <p v-if="ranking" class="lead mb-6">
        En los <strong>{{ ranking.periodMonths }} meses</strong> que van del
        {{ formatImClaimDay(ranking.periodFrom) }} al {{ formatImClaimDay(ranking.periodTo) }}, los
        <strong>{{ ranking.barrios }} barrios</strong> con dato registran una mediana de
        <strong>{{ formatClaimRateLabel(alumbradoMedian) }} clientes</strong> por alumbrado. Cada
        familia se cuenta aparte: abajo están las tres, con el barrio que más reclama y el que menos
        en cada una.
      </p>
      <p v-else class="lead mb-6">
        Esta página cuenta los reclamos que la Intendencia de Montevideo registra en su Sistema
        Único de Reclamos y los ordena por barrio.
        <strong>Ahora mismo no hay una ventana publicable</strong>: mientras el volcado no tenga al
        menos dos barrios con cifra en una lectura reciente, no se publica un número.
      </p>

      <VAlert type="info" variant="tonal" density="comfortable" class="mb-0">
        <strong>Son reclamos, no problemas.</strong> El número dice cuántas veces alguien reclamó,
        no cuántas luminarias están apagadas. Un barrio que reclama más puede ser un barrio más
        organizado, y uno que reclama poco puede ser uno que ya no espera respuesta:
        <strong>no es un ranking de calidad del servicio</strong>.
      </VAlert>
    </header>

    <section v-if="ranking" id="familias" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Las tres familias, una por una</h2>
      <p class="text-medium-emphasis mb-6" style="max-width: 72ch">
        La tasa es <strong>reclamos cada 1.000 clientes de UTE</strong> del mismo barrio en la
        ventana medida. La columna de comparación dice qué parte de los otros barrios con dato
        reclama más: 100 % es el barrio que menos reclama de todos.
        <strong>Las tres no se suman</strong> — una boca de tormenta tapada y un contenedor quemado
        no son la misma cosa y no comparten público.
      </p>

      <article v-for="family in ranking.families" :key="family.id" class="family mb-10">
        <h3 class="text-h6 font-weight-bold mb-1">
          <VIcon :icon="family.icon" size="small" class="mr-1" />
          {{ family.label }}
        </h3>
        <p class="text-body-2 text-medium-emphasis mb-4" style="max-width: 72ch">
          {{ family.blurb }} Mediana de
          <strong>{{ formatClaimRateLabel(family.median) }} clientes</strong> en
          {{ family.rows.length }} barrios. El que más reclama es
          <strong>{{ family.worst.name }}</strong> con {{ formatClaimRate(family.worst.rate) }}; el
          que menos, <strong>{{ family.best.name }}</strong> con
          {{ formatClaimRate(family.best.rate) }}.
        </p>

        <h4 class="text-subtitle-2 font-weight-bold mb-2">Más reclamos registrados</h4>
        <VTable class="cu-mobile-cards mb-6" density="comfortable">
          <thead>
            <tr>
              <th scope="col">Barrio</th>
              <th scope="col" class="text-right">Cada 1.000 clientes</th>
              <th scope="col" class="text-right">Reclama menos que</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in worstImClaimRows(family)" :key="row.id">
              <td data-label="Barrio">{{ row.name }}</td>
              <td data-label="Cada 1.000 clientes" class="text-right">
                {{ formatClaimRate(row.rate) }}
              </td>
              <td data-label="Reclama menos que" class="text-right">{{ betterThan(row) }}</td>
            </tr>
          </tbody>
        </VTable>

        <h4 class="text-subtitle-2 font-weight-bold mb-2">Menos reclamos registrados</h4>
        <VTable class="cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th scope="col">Barrio</th>
              <th scope="col" class="text-right">Cada 1.000 clientes</th>
              <th scope="col" class="text-right">Reclama menos que</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in bestImClaimRows(family)" :key="row.id">
              <td data-label="Barrio">{{ row.name }}</td>
              <td data-label="Cada 1.000 clientes" class="text-right">
                {{ formatClaimRate(row.rate) }}
              </td>
              <td data-label="Reclama menos que" class="text-right">{{ betterThan(row) }}</td>
            </tr>
          </tbody>
        </VTable>
      </article>
    </section>

    <section id="como-se-mide" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Cómo se cuenta, y qué no dice este número</h2>
      <VCard variant="flat" class="method-card pa-5 pa-md-6">
        <ul class="method-list mb-0">
          <li>
            <strong>La fuente es el volcado de la propia Intendencia.</strong> El Sistema Único de
            Reclamos se publica como datos abiertos y se relee cuando cambia su ficha. Son los
            últimos doce meses completos que trae el archivo, no una selección nuestra.
          </li>
          <li>
            <strong>El denominador son clientes de UTE, no vecinos.</strong> La tasa va por cada
            1.000 suministros eléctricos del mismo barrio INE, que es el único padrón por barrio con
            la frecuencia necesaria. No es por hogar ni por persona: un barrio con muchos locales
            comerciales tiene más suministros que habitantes.
          </li>
          <li>
            <strong>Un reclamo es alguien que reclamó.</strong> No mide cuántos focos hay apagados,
            cuánto tardó la cuadrilla ni si el problema se resolvió: el archivo registra la entrada,
            no el final. Dos barrios con el mismo problema pueden tener tasas muy distintas sólo
            porque en uno se reclama más.
          </li>
          <li>
            <strong>Las tres familias no se suman.</strong> Alumbrado, saneamiento y limpieza son
            tres servicios con tres públicos distintos. Un total «de reclamos» mezclaría cosas que
            no se parecen, así que cada familia tiene su tabla y su mediana.
          </li>
          <li>
            <strong>Es Montevideo.</strong> El Sistema Único de Reclamos es de la Intendencia de
            Montevideo, así que las zonas son sus barrios INE y ninguna otra. Las demás intendencias
            no publican un volcado equivalente, y por eso esta página no tiene filas del interior.
          </li>
          <li>
            <strong>Los reclamos de calles quedan afuera.</strong> El archivo también trae los
            viales, y no se publican acá: es una señal ruidosa —una obra en curso genera reclamos
            mientras arregla el problema— y no entra al ranking.
          </li>
          <li>
            <strong>Un barrio sin dato no aparece con cero.</strong> No aparece. La ausencia de
            reclamos en el archivo no es una afirmación sobre ese barrio.
          </li>
          <li>
            <strong>No es una estadística oficial.</strong> Es un recuento propio sobre datos
            abiertos públicos, con la ventana y la fecha a la vista. La Intendencia publica el
            volcado; esta tabla no la publica nadie.
          </li>
        </ul>
      </VCard>
    </section>

    <section id="como-reclamar" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Si tenés algo para reclamar</h2>
      <p class="mb-4" style="max-width: 72ch">
        Los reclamos de esta página entran por la Intendencia, que es la que atiende el alumbrado,
        el saneamiento y la limpieza de la vía pública. Lo que se corta de luz adentro de tu casa es
        otra cosa y lo atiende UTE; el agua, OSE. Si del otro lado hay una empresa y no un servicio
        municipal, el organismo que te corresponde cambia.
      </p>
      <div class="d-flex flex-wrap ga-3">
        <VBtn :to="localePath('/a-quien-le-reclamo-uruguay')" color="primary" variant="flat">
          A quién le reclamo
        </VBtn>
        <VBtn :to="localePath('/cortes-de-luz-por-barrio-uruguay')" variant="outlined">
          Cortes de luz por barrio
        </VBtn>
        <VBtn :to="localePath('/cortes-de-agua-por-barrio-uruguay')" variant="outlined">
          Cortes de agua por barrio
        </VBtn>
        <VBtn :to="localePath('/barrios-alquileres-uruguay')" variant="text">
          Comparar barrios para alquilar
        </VBtn>
      </div>
    </section>

    <section id="fuentes">
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <ul class="sources">
        <li v-for="source in IM_CLAIM_SOURCES" :key="source.url">
          <a :href="source.url" target="_blank" rel="noopener noreferrer" class="cu-link">
            {{ source.label }}
          </a>
        </li>
      </ul>
      <p v-if="ranking" class="text-caption text-medium-emphasis mt-3 mb-0">
        Ventana contada: {{ formatImClaimDay(ranking.periodFrom) }} a
        {{ formatImClaimDay(ranking.periodTo) }}. Última lectura del libro:
        {{ formatImClaimDay(ranking.generatedAt) }}.
      </p>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import type { RentalZoneScores } from '~/utils/rentalZoneTypes'
import {
  IM_CLAIM_SOURCES,
  bestImClaimRows,
  buildImClaimRanking,
  formatClaimRate,
  formatClaimRateLabel,
  formatImClaimDay,
  imClaimDescription,
  imClaimFamily,
  imClaimTitle,
  worstImClaimRows,
  type ImClaimRow,
} from '~/utils/imClaimRanking'

const localePath = useLocalePath()
const canonicalUrl = 'https://cambio-uruguay.com/reclamos-a-la-intendencia-por-barrio-uruguay'

// El endpoint contesta 503 mientras la capa no tiene nada publicable, y eso no es un error de esta
// página: `default` deja la vista en su estado "todavía sin ventana" en vez de romper el SSR.
const { data: scores } = await useFetch<RentalZoneScores | null>('/api/rentals/zone-scores', {
  key: 'im-claim-zone-scores',
  default: () => null,
})

const ranking = computed(() => buildImClaimRanking(scores.value))
// La mediana del párrafo de apertura es la de alumbrado, que es la familia con más barrios con
// dato; si esa familia no publica, se usa la primera que sí, nunca un cero inventado.
const alumbradoMedian = computed(
  () => (imClaimFamily(ranking.value, 'alumbrado') ?? ranking.value?.families[0])?.median ?? 0
)

const betterThan = (row: ImClaimRow) => `${Math.round(row.betterThan * 100)} %`

const title = computed(() => imClaimTitle(ranking.value))
const description = computed(() => imClaimDescription(ranking.value))

defineOgImageComponent('Cambio', {
  title: 'Reclamos a la Intendencia por barrio',
  subtitle: 'Alumbrado, saneamiento y limpieza, de los datos abiertos de la IM',
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
        'reclamos intendencia de montevideo, sistema unico de reclamos, reclamo alumbrado montevideo, reclamo saneamiento montevideo, reclamo limpieza montevideo, foco quemado montevideo reclamo, contenedor quemado reclamo, barrios con mas reclamos montevideo',
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
                name: 'A quién le reclamo',
                item: 'https://cambio-uruguay.com/a-quien-le-reclamo-uruguay',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Reclamos a la Intendencia por barrio',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'Dataset',
            name: 'Reclamos de alumbrado, saneamiento y limpieza por barrio de Montevideo',
            description: description.value,
            inLanguage: 'es-UY',
            isAccessibleForFree: true,
            temporalCoverage: ranking.value
              ? `${ranking.value.periodFrom}/${ranking.value.periodTo}`
              : undefined,
            spatialCoverage: { '@type': 'Place', name: 'Montevideo, Uruguay' },
            variableMeasured:
              'Reclamos registrados en el Sistema Único de Reclamos de la Intendencia de Montevideo cada 1.000 clientes de UTE del mismo barrio INE, por familia de servicio',
            creator: { '@type': 'Organization', name: 'Cambio Uruguay' },
            citation: IM_CLAIM_SOURCES.map(source => ({
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
.im-claims-page .lead {
  max-width: 72ch;
  font-size: 1.05rem;
  line-height: 1.6;
}
.family + .family {
  border-top: 1px solid rgba(var(--v-border-color), 0.16);
  padding-top: 1.75rem;
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
