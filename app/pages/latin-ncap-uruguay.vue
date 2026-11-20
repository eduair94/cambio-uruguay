<template>
  <VContainer class="ncap-page py-8 py-md-12">
    <nav aria-label="Ruta de navegación" class="text-caption mb-4">
      <NuxtLink :to="localePath('/')" class="text-decoration-none">Cambio Uruguay</NuxtLink>
      <span class="mx-1 text-grey">›</span>
      <NuxtLink
        :to="localePath('/temas/comprar-y-mantener-auto-uruguay')"
        class="text-decoration-none"
      >
        Comprar y mantener un auto
      </NuxtLink>
      <span class="mx-1 text-grey">›</span>
      <span class="text-grey">Latin NCAP</span>
    </nav>

    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">SEGURIDAD</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Latin NCAP: los ensayos de los autos que se venden en Uruguay
      </h1>
      <p class="lead mb-6">
        <strong>{{ stats.tests }} ensayos</strong> de <strong>{{ stats.models }} modelos</strong> de
        {{ stats.brands }} marcas, publicados por Latin NCAP entre {{ stats.firstYear }} y
        {{ stats.lastYear }}, cada uno con el enlace a su propio resultado. Es la lista, no un
        ranking: lo que Latin NCAP califica es <strong>una versión con sus airbags</strong> en un
        momento, no «el modelo».
      </p>

      <VCard class="warn-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-alert-outline" color="warning" class="mr-3 mt-1" />
          <div>
            <p class="warn-title mb-2">La estrella es del ensayo, no del auto</p>
            <p class="mb-0">
              De los {{ stats.tests }} ensayos, sólo
              <strong>{{ stats.withVersionBoundary }}</strong> dicen en su nombre desde qué fecha o
              desde qué número de chasis valen. Y
              <strong>{{ stats.multiTested }} de los {{ stats.models }} modelos</strong> tienen más
              de un ensayo, con {{ stats.sameYearModels }} que tienen dos del mismo año. Antes de
              leer una estrella como la del auto que estás mirando, mirá cuál de los ensayos
              corresponde a esa versión.
            </p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- 1. El caso que no admite otra lectura -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">
        El mismo modelo, el mismo año, dos resultados distintos
      </h2>
      <p class="section-intro mb-5">
        No hace falta discutirlo en abstracto: hay {{ sameYearPairs.length }} pares de ensayos del
        mismo modelo, el mismo protocolo y el mismo año que dieron notas distintas. Ni la fecha ni
        la exigencia del protocolo explican la diferencia; lo único que queda es qué versión se
        subió al banco de pruebas.
      </p>
      <VTable class="cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th class="text-left">Modelo</th>
            <th class="text-left">Año del ensayo</th>
            <th class="text-left">Versión peor calificada</th>
            <th class="text-left">Versión mejor calificada</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="pair in sameYearPairs" :key="`${pair.slug}-${pair.protocol}-${pair.testYear}`">
            <td data-label="Modelo" class="font-weight-medium">{{ pair.label }}</td>
            <td data-label="Año del ensayo">{{ pair.testYear }}</td>
            <td data-label="Versión peor calificada">
              <a :href="pair.lower.url" target="_blank" rel="noopener noreferrer nofollow">
                {{ score(pair.lower) }} — {{ pair.lower.testedName }}
              </a>
            </td>
            <td data-label="Versión mejor calificada">
              <a :href="pair.higher.url" target="_blank" rel="noopener noreferrer nofollow">
                {{ score(pair.higher) }} — {{ pair.higher.testedName }}
              </a>
            </td>
          </tr>
        </tbody>
      </VTable>
      <p class="mt-5 mb-0">
        Y mirando el historial completo de cada modelo la distancia llega más lejos:
        {{ splitModels }} modelos se separan 3 estrellas o más entre sus propios ensayos del mismo
        protocolo. El extremo es <strong>{{ widestSplit.label }}</strong
        >, con {{ score(widestSplit.worst) }} en {{ widestSplit.worst.testYear }} y
        {{ score(widestSplit.best) }} en {{ widestSplit.best.testYear }}.
      </p>
    </section>

    <!-- 2. Los protocolos -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Las notas de dos protocolos no se comparan</h2>
      <p class="section-intro mb-5">
        Latin NCAP cambió cómo califica. Hasta 2019 publicaba dos notas separadas —ocupante adulto y
        ocupante niño— y desde 2020 publica una sola calificación para todo el ensayo, con una
        exigencia distinta. «Cuatro estrellas» de 2015 y «cuatro estrellas» de 2022 no son la misma
        afirmación, así que esta página nunca las pone en la misma columna.
      </p>
      <VRow>
        <VCol v-for="row in stats.perProtocol" :key="row.protocol" cols="12" md="4">
          <VCard variant="outlined" class="pa-4 h-100 protocol-card">
            <p class="text-subtitle-2 font-weight-bold mb-1">{{ row.label }}</p>
            <p class="text-h6 font-weight-bold mb-1">{{ row.tests }} ensayos</p>
            <p class="text-body-2 text-medium-emphasis mb-0">{{ scoringOf(row.protocol) }}</p>
          </VCard>
        </VCol>
      </VRow>
      <VCard class="note-card pa-5 pa-md-6 mt-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-chart-bar" color="info" class="mr-3 mt-1" />
          <div>
            <p class="note-title mb-2">El protocolo 2020 reparte en las dos puntas</p>
            <p class="mb-0">
              De los {{ stats.modern.tests }} ensayos publicados con el protocolo vigente,
              <strong>{{ stats.modern.zero }} dieron 0 de 5</strong> y
              <strong>{{ stats.modern.five }} dieron 5 de 5</strong>: entre esas dos puntas están
              {{ stats.modern.zero + stats.modern.five }} de {{ stats.modern.tests }}. No es que el
              promedio sea bajo, es que el resultado casi nunca queda en el medio.
            </p>
          </div>
        </div>
      </VCard>
    </section>

    <!-- 3. La tabla entera -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Todos los ensayos, marca por marca</h2>
      <p class="section-intro mb-5">
        Cada ensayo con su nombre completo tal como lo publica Latin NCAP —ahí está la cantidad de
        airbags de la unidad ensayada—, su año y el enlace a su resultado oficial. El más nuevo de
        cada modelo va primero.
      </p>
      <div v-for="group in groups" :key="group.brandSlug" class="mb-8">
        <h3 class="text-h6 font-weight-bold mb-3">{{ group.brand }}</h3>
        <VTable class="cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th class="text-left">Modelo</th>
              <th class="text-left">Ensayo</th>
              <th class="text-left">Año</th>
              <th class="text-left">Resultado</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="model in group.models" :key="model.slug">
              <!-- El modelo se repite en cada fila a propósito: en <600px la tabla se apila en
                   tarjetas (`cu-mobile-cards`) y una celda vacía dejaría una tarjeta con el rótulo
                   «Modelo» y nada al lado. -->
              <tr v-for="entry in model.entries" :key="entry.url + entry.testedName">
                <td data-label="Modelo" class="font-weight-medium">{{ model.model }}</td>
                <td data-label="Ensayo">
                  <a :href="entry.url" target="_blank" rel="noopener noreferrer nofollow">
                    {{ entry.testedName }}
                  </a>
                </td>
                <td data-label="Año">{{ entry.testYear }}</td>
                <td data-label="Resultado">{{ resultLabel(entry) }}</td>
              </tr>
            </template>
          </tbody>
        </VTable>
      </div>
    </section>

    <!-- 4. Los límites -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Lo que esta página no dice</h2>
      <ul class="plain-list">
        <li>
          <strong>No elige «el auto más seguro».</strong> Un ranking pediría comparar notas de
          protocolos distintos y de versiones distintas del mismo modelo, que es exactamente lo que
          los datos no permiten.
        </li>
        <li>
          <strong>No asigna un ensayo a un año de modelo.</strong> Latin NCAP califica la unidad que
          ensayó; sólo {{ stats.withVersionBoundary }} de los {{ stats.tests }} ensayos declaran
          desde qué fecha o chasis valen.
        </li>
        <li>
          <strong>La ausencia no es un veredicto.</strong> Un modelo que no está en esta tabla no
          fue ensayado por Latin NCAP, y eso no dice que sea seguro ni que no lo sea.
        </li>
        <li>
          <strong>No habla de equipamiento obligatorio.</strong> Qué tiene que traer un auto para
          circular en Uruguay lo fija la normativa nacional, no un ensayo privado, y acá no se
          publica ninguna cifra de ese lado.
        </li>
      </ul>
    </section>

    <FaqSection :items="faq" heading="Preguntas frecuentes" :expanded="true" class="mb-8" />

    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-3">Seguí con el auto que estás mirando</h2>
      <VRow>
        <VCol v-for="link in relatedLinks" :key="link.to" cols="12" sm="6" md="4">
          <VCard variant="outlined" class="pa-4 h-100" :to="localePath(link.to)">
            <p class="text-subtitle-2 font-weight-bold mb-1">{{ link.title }}</p>
            <p class="text-body-2 text-medium-emphasis mb-0">{{ link.body }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <section class="mb-4">
      <h2 class="text-h6 font-weight-bold mb-2">Fuente</h2>
      <ul class="sources">
        <li>
          Latin NCAP —
          <a :href="LATIN_NCAP_SOURCE" target="_blank" rel="noopener noreferrer nofollow">
            resultados publicados
          </a>
          . Cada fila de esta página se verificó contra la página de su propio resultado el
          {{ verifiedAt }}; el enlace de cada ensayo va a esa página y no a un resumen nuestro.
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FaqItem } from '~/utils/faqAnswers'
import {
  latinNcapLabel,
  type LatinNcapEntry,
  type LatinNcapProtocol,
} from '~/utils/carAdvisorFigures'
import {
  LATIN_NCAP_SOURCE,
  LATIN_NCAP_URL,
  LATIN_NCAP_VERIFIED_AT,
  NCAP_PROTOCOLS,
  ncapAdultScore,
  ncapBrandGroups,
  ncapSameYearPairs,
  ncapSeo,
  ncapSplits,
  ncapStats,
} from '~/utils/latinNcapPage'

const localePath = useLocalePath()

const stats = ncapStats()
const groups = ncapBrandGroups()
const sameYearPairs = ncapSameYearPairs()
const splits = ncapSplits(3)
const widestSplit = splits[0]!
/**
 * MODELOS, no casos: `ncapSplits` devuelve un caso por modelo Y protocolo, así que el Ford Ka
 * aparece dos veces (se separa 3 estrellas dentro del protocolo 2010-2015 y otra vez dentro del
 * 2016-2019). Contar casos y llamarlos «modelos» inflaba la frase en uno.
 */
const splitModels = new Set(splits.map(split => split.slug)).size

/** "0 de 5" o "1 estrella adulto", para una celda angosta. La etiqueta larga va en la tabla grande. */
const score = (entry: LatinNcapEntry) =>
  entry.protocol === '2020+'
    ? `${ncapAdultScore(entry)} de 5`
    : `${ncapAdultScore(entry)} de 5 adulto`

const resultLabel = (entry: LatinNcapEntry) => latinNcapLabel(entry)

const scoringOf = (protocol: LatinNcapProtocol) =>
  NCAP_PROTOCOLS.find(row => row.protocol === protocol)?.scoring ?? ''

const verifiedAt = computed(() => {
  const [year, month, day] = LATIN_NCAP_VERIFIED_AT.split('-')
  return `${Number(day)}/${Number(month)}/${year}`
})

const relatedLinks = [
  {
    to: '/que-auto-comprar-uruguay',
    title: '¿Qué auto usado comprar?',
    body: 'El modelo y el año que te alcanzan, con los ensayos de cada modelo al lado del costo.',
  },
  {
    to: '/autos-usados-uruguay',
    title: 'Autos usados',
    body: 'Los avisos de diez fuentes, con el precio comparado contra autos iguales.',
  },
  {
    to: '/autos-chocados-y-con-deuda-uruguay',
    title: 'Autos chocados y con deuda',
    body: 'Lo que el aviso declara y cuánto menos se pide por eso.',
  },
  {
    to: '/mercado-de-autos-usados-uruguay',
    title: 'El mercado de autos usados',
    body: 'Qué se ofrece, cuánto pierde cada modelo por año y qué se compra con cada presupuesto.',
  },
]

const faq: FaqItem[] = [
  {
    question: '¿Cuántas estrellas tiene mi auto?',
    answer:
      'Buscá el modelo en la tabla y mirá el nombre completo del ensayo: ahí está la cantidad de airbags de la unidad que Latin NCAP ensayó. Si tu auto es de otra versión, ese ensayo no habla de él. El Hyundai Tucson de 2022 es el ejemplo: con dos airbags dio 0 de 5 y con seis dio 3 de 5, y las dos filas se llaman «Hyundai Tucson».',
  },
  {
    question: '¿Puedo comparar un ensayo de 2015 con uno de 2022?',
    answer:
      'No. Hasta 2019 Latin NCAP publicaba dos notas separadas (adulto y niño) y desde 2020 publica una sola, con una exigencia distinta. Dos resultados con el mismo número de estrellas pero de protocolos distintos no dicen lo mismo, y por eso acá cada ensayo se muestra siempre con su protocolo.',
  },
  {
    question: '¿Mi modelo no aparece, es porque es inseguro?',
    answer:
      'No. Que un modelo no esté en esta tabla significa que Latin NCAP no publicó un ensayo de él, nada más. La ausencia de un ensayo no es un resultado: no dice que el auto sea seguro ni que no lo sea.',
  },
  {
    question: '¿Esta página rankea los autos más seguros de Uruguay?',
    answer:
      'No, y es a propósito. Armar un ranking obligaría a comparar notas de protocolos distintos y a elegir una versión por modelo cuando el mismo modelo tiene hasta cinco estrellas de diferencia entre sus propios ensayos. La página muestra la lista completa y cada quien la lee contra la versión que está mirando.',
  },
  {
    question: '¿De dónde salen estos datos?',
    answer: `De las páginas de resultados de Latin NCAP (latinncap.com), una por ensayo. Son ${stats.tests} ensayos de ${stats.models} modelos que se venden en Uruguay, verificados uno por uno el 24/9/2026, y cada fila enlaza a la página del resultado para que se pueda controlar.`,
  },
]

const { title, description } = ncapSeo(stats)

defineOgImageComponent('Cambio', {
  title: 'Latin NCAP en Uruguay',
  subtitle: `${stats.tests} ensayos de ${stats.models} modelos`,
  tag: 'SEGURIDAD',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'article',
  ogUrl: LATIN_NCAP_URL,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: LATIN_NCAP_URL }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          // El rastro que el renglón verde del resultado imprime en vez de la URL cruda. El eslabón
          // del medio es el mismo que la página le muestra arriba del título, igual que en
          // /seguro-obligatorio-de-auto-uruguay: el tema al que pertenece.
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Cambio Uruguay',
                item: 'https://cambio-uruguay.com',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Comprar y mantener un auto',
                item: 'https://cambio-uruguay.com/temas/comprar-y-mantener-auto-uruguay',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Latin NCAP',
                item: LATIN_NCAP_URL,
              },
            ],
          },
          {
            '@type': 'Article',
            headline: title,
            description,
            url: LATIN_NCAP_URL,
            inLanguage: 'es-UY',
            dateModified: LATIN_NCAP_VERIFIED_AT,
            author: { '@type': 'Organization', name: 'Cambio Uruguay' },
            publisher: { '@type': 'Organization', name: 'Cambio Uruguay' },
            isBasedOn: LATIN_NCAP_SOURCE,
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.lead {
  font-size: 1.1rem;
  line-height: 1.7;
  max-width: 72ch;
  margin-top: 0;
}

.section-intro {
  max-width: 72ch;
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.7;
  margin-top: 0;
}

.note-card {
  border: 1px solid rgba(var(--v-theme-info), 0.35);
  background: rgba(var(--v-theme-info), 0.06);
}

.warn-card {
  border: 1px solid rgba(var(--v-theme-warning), 0.35);
  background: rgba(var(--v-theme-warning), 0.06);
}

.note-title,
.warn-title {
  font-weight: 700;
  margin-top: 0;
}

.protocol-card {
  border: 1px solid rgba(var(--v-border-color), 0.16);
}

.plain-list,
.sources {
  margin-top: 0;
  padding-left: 1.25rem;
}

.plain-list li,
.sources li {
  margin-top: 0.5rem;
}
</style>
