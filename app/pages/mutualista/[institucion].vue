<!--
THESIS: El tarifario completo de UNA mutualista, con el lugar que ocupa entre las 34, sin
convertir el menor importe publicado en el precio que le toca a quien lee.
STORY: Leer las dos cifras del encabezado, recorrer los cinco conceptos con su máximo autorizado
y su puesto, abrir el rango por régimen, y sólo después ir al archivo del MSP o al comparador.
FIRST VIEWPORT: Nombre, las dos cifras del tarifario y la fecha de vigencia. En teléfono las
filas se apilan en tarjetas con el mismo rótulo (`cu-mobile-cards`).
FORM: Ficha de tarifario, hereda el sistema visual de /tickets-mutualistas-uruguay.
-->
<template>
  <VContainer v-if="page" class="mutualista-page py-6 py-md-10" data-clarity-mask="True">
    <header class="page-intro mb-8">
      <p class="kicker mb-2">Tarifario IAMC del MSP · vigente desde {{ effectiveLabel }}</p>
      <h1 class="page-title mb-3">{{ page.heading }}</h1>
      <p class="lead mb-4">
        El Ministerio de Salud Pública publica, institución por institución, el
        <strong>máximo autorizado</strong> de cada tasa moderadora. En {{ page.name }} ese máximo es
        <strong>{{ money(headline.medicines) }}</strong> para el ticket de medicamentos y
        <strong>{{ money(headline.specialist) }}</strong> para la consulta con especialista. Son
        importes <strong>sin IVA ni timbres</strong>, como los publica el MSP.
      </p>
      <p class="lead-note mb-4">
        Esta página no dice cuánto vas a pagar vos: el archivo trae
        {{ page.totalColumns }} columnas de precio para {{ page.name }}
        <template v-if="page.regimeLabels.length">({{ page.regimeLabels.join(', ') }})</template>
        y cuál te corresponde lo define tu convenio, no este sitio. Abajo está el rango de lo que
        cada régimen publica, que es hasta dónde llega el dato.
      </p>
      <div class="intro-actions">
        <a
          :href="page.source.pageUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="source-link"
        >
          Ver el tarifario del MSP
          <VIcon size="16" aria-hidden="true">mdi-open-in-new</VIcon>
        </a>
        <NuxtLink :to="localePath(page.indexPath)" class="source-link">
          Comparar las {{ totalInstitutions }} instituciones
          <VIcon size="16" aria-hidden="true">mdi-table-arrow-right</VIcon>
        </NuxtLink>
      </div>
    </header>

    <section class="mb-10" aria-labelledby="tarifario">
      <h2 id="tarifario" class="section-title mb-2">
        Los cinco conceptos, y dónde cae en cada uno
      </h2>
      <p class="reading-width mb-5">
        El puesto compara el <strong>máximo autorizado</strong> contra el de las otras instituciones
        que publican el mismo concepto: 1 es el más bajo. Es la única comparación que el archivo
        permite hacer de verdad, porque el máximo es común a los regímenes de cada institución y las
        columnas de precio no lo son.
      </p>

      <VTable class="cu-mobile-cards tariff-table" density="comfortable">
        <caption class="sr-only">
          Máximo autorizado por concepto en
          {{
            page.name
          }}, con la mediana de las instituciones que publican cada concepto
        </caption>
        <thead>
          <tr>
            <th scope="col">Concepto</th>
            <th scope="col" class="text-right">Máximo autorizado</th>
            <th scope="col" class="text-right">Mediana</th>
            <th scope="col">Puesto</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="concept in page.concepts" :key="concept.id">
            <td data-label="Concepto">{{ concept.label }}</td>
            <td data-label="Máximo autorizado" class="text-right amount">
              {{ money(concept.maximumUyu) }}
              <p v-if="concept.maximumUyu === 0" class="value-note">
                Es lo que publica el archivo. Un cero no prueba que la prestación sea sin cargo.
              </p>
            </td>
            <td data-label="Mediana" class="text-right amount">
              {{ money(concept.medianUyu) }}
              <!-- La mediana se calcula sobre las instituciones que publican un importe mayor que
                   cero, así que el divisor no siempre son las 34: decirlo es la diferencia entre
                   una mediana y una mediana que se entiende. -->
              <p v-if="concept.of !== totalInstitutions" class="value-note">
                sobre las {{ concept.of }} que publican un importe
              </p>
            </td>
            <td data-label="Puesto">
              <template v-if="concept.rank !== null">
                {{ concept.rank }} de {{ concept.of }}
                <span class="rank-note">{{ rankNote(concept) }}</span>
              </template>
              <template v-else>Sin importe comparable</template>
            </td>
          </tr>
        </tbody>
      </VTable>
    </section>

    <section class="mb-10" aria-labelledby="regimenes">
      <h2 id="regimenes" class="section-title mb-2">Qué publica cada régimen</h2>
      <p class="reading-width mb-5">
        El MSP imprime varias columnas por régimen y el encabezado de cada una es el único lugar
        donde puede estar la condición que la explica. Acá va el <strong>rango</strong> de los
        importes de cada régimen, nunca uno elegido como «el precio»: para ver columna por columna
        con su encabezado y su celda de origen está
        <NuxtLink :to="localePath(page.indexPath)">el comparador</NuxtLink>.
      </p>

      <div
        v-for="concept in page.concepts"
        :key="`regimes-${concept.id}`"
        class="regime-block mb-6"
      >
        <h3 class="regime-title mb-2">{{ concept.label }}</h3>
        <ul v-if="concept.regimes.length" class="regime-list">
          <li v-for="regime in concept.regimes" :key="regime.affiliation">
            <strong>{{ regime.label }}</strong>
            <template v-if="regime.lowestUyu !== null && regime.highestUyu !== null">
              <template v-if="regime.lowestUyu === regime.highestUyu">
                : {{ money(regime.lowestUyu) }} en {{ columnsLabel(regime.pricedColumns) }} con
                importe, de {{ columnsLabel(regime.columns) }} del régimen.
              </template>
              <template v-else>
                : de {{ money(regime.lowestUyu) }} a {{ money(regime.highestUyu) }} en
                {{ columnsLabel(regime.pricedColumns) }} con importe, de
                {{ columnsLabel(regime.columns) }} del régimen.
              </template>
            </template>
            <template v-else>: sin ningún importe mayor que cero en el archivo.</template>
            <span v-if="regime.zeroColumns" class="regime-note">
              {{ columnsLabel(regime.zeroColumns) }} con $ 0,00, que el MSP publica así y no es una
              exoneración probada.
            </span>
            <span v-if="regime.missingColumns" class="regime-note">
              {{ columnsLabel(regime.missingColumns) }} sin dato; un hueco no se cuenta como cero.
            </span>
            <span v-if="regime.exceedingColumns" class="regime-note contradiction">
              {{ columnsLabel(regime.exceedingColumns) }} por encima del máximo que el propio
              archivo publica. Es una contradicción del origen: se muestra sin corregirla.
            </span>
          </li>
        </ul>
        <p v-else class="regime-note">El archivo no publica columnas para este concepto.</p>
      </div>
    </section>

    <section class="mb-10" aria-labelledby="fuente">
      <h2 id="fuente" class="section-title mb-2">De dónde sale cada cifra</h2>
      <p class="reading-width mb-4">
        De una sola fuente: la planilla de precios de tasas moderadoras de las IAMC que publica el
        MSP. No se le aplica ningún ajuste, no se completa ningún hueco y no se interpreta el
        encabezado de ninguna columna. La hoja de {{ page.name }} en ese archivo es
        <code>{{ page.sheet }}</code
        >.
      </p>
      <dl class="source-dates mb-4">
        <div>
          <dt>Vigente desde</dt>
          <dd>{{ effectiveLabel }}</dd>
        </div>
        <div>
          <dt>Publicado por el MSP</dt>
          <dd>{{ dayLabel(page.source.publishedAt) }}</dd>
        </div>
        <div>
          <dt>Verificado por nosotros</dt>
          <dd>{{ dayLabel(page.source.verifiedAt) }}</dd>
        </div>
      </dl>
      <div class="source-actions">
        <a :href="page.source.pageUrl" target="_blank" rel="noopener noreferrer">
          Página del MSP
          <VIcon size="16" aria-hidden="true">mdi-open-in-new</VIcon>
        </a>
        <a :href="page.source.downloadUrl" target="_blank" rel="noopener noreferrer">
          Planilla original (.xlsx)
          <VIcon size="16" aria-hidden="true">mdi-download-outline</VIcon>
        </a>
      </div>
    </section>

    <section class="next-step" aria-labelledby="seguir">
      <h2 id="seguir" class="section-title mb-2">Seguir por acá</h2>
      <ul class="next-list">
        <li>
          <NuxtLink :to="localePath(page.indexPath)">{{ page.indexLabel }}</NuxtLink> — las
          {{ totalInstitutions }} instituciones, columna por columna y con la celda de origen.
        </li>
        <li>
          <NuxtLink :to="localePath('/cambiar-de-mutualista-uruguay')"
            >Cambiar de mutualista</NuxtLink
          >
          — cuándo se puede y qué dígito de cédula habilita el corrimiento.
        </li>
        <li>
          <NuxtLink :to="localePath('/devolucion-fonasa-uruguay')">Devolución de FONASA</NuxtLink> —
          lo que se devuelve del aporte, que es otra cosa que el ticket.
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  getMutualistaPage,
  isMutualistaPageSlug,
  mutualistaDayLabel,
  mutualistaPageSlugs,
  formatMutualistaUyu,
  type MutualistaConceptSummary,
} from '~/utils/mutualistaPages'

// El catálogo es puro y no depende de la red, así que la guarda resuelve el slug antes de
// renderizar nada: una institución que no está en el archivo es un 404 de verdad y no una página
// vacía contestada con 200, que es lo que Google indexa como soft 404.
definePageMeta({
  validate: route => isMutualistaPageSlug(String(route.params.institucion ?? '')),
})

const localePath = useLocalePath()
const route = useRoute()

const page = computed(() => getMutualistaPage(String(route.params.institucion ?? '')))

if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Mutualista no encontrada' })
}

const totalInstitutions = mutualistaPageSlugs().length

const money = (value: number | null) => formatMutualistaUyu(value)
const dayLabel = (value: string) => mutualistaDayLabel(value)
const effectiveLabel = computed(() => mutualistaDayLabel(page.value?.effectiveFrom ?? ''))

const headline = computed(() => ({
  medicines:
    page.value?.concepts.find(concept => concept.id === 'medicamentos')?.maximumUyu ?? null,
  specialist:
    page.value?.concepts.find(concept => concept.id === 'especialistas')?.maximumUyu ?? null,
}))

/** «más bajo», «más alto» o «la mediana»: el puesto solo no dice de qué lado está. */
function rankNote(concept: MutualistaConceptSummary): string {
  if (concept.maximumUyu === null || concept.medianUyu === null) return ''
  if (concept.maximumUyu > concept.medianUyu) return '· sobre la mediana'
  if (concept.maximumUyu < concept.medianUyu) return '· bajo la mediana'
  return '· en la mediana'
}

const columnsLabel = (count: number) => `${count} ${count === 1 ? 'columna' : 'columnas'}`

const canonicalUrl = computed(() => `https://cambio-uruguay.com${page.value?.path ?? ''}`)

defineOgImageComponent('Cambio', {
  title: () => page.value?.name ?? '',
  subtitle: () => `Ticket y orden · ${money(headline.value.medicines)} de medicamentos`,
  tag: 'MSP · UYU',
})

useSeoMeta({
  title: () => `${page.value?.title ?? ''} | Cambio Uruguay`,
  description: () => page.value?.description ?? '',
  ogTitle: () => page.value?.heading ?? '',
  ogDescription: () => page.value?.description ?? '',
  ogType: 'article',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: computed(() => {
        const model = page.value
        if (!model) return ''
        return JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [
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
                  name: model.indexLabel,
                  item: `https://cambio-uruguay.com${model.indexPath}`,
                },
                { '@type': 'ListItem', position: 3, name: model.name, item: canonicalUrl.value },
              ],
            },
            {
              '@type': 'WebPage',
              '@id': canonicalUrl.value,
              url: canonicalUrl.value,
              name: model.title,
              description: model.description,
              inLanguage: 'es-UY',
              dateModified: model.source.verifiedAt,
              citation: model.source.pageUrl,
              publisher: {
                '@type': 'Organization',
                name: 'Cambio Uruguay',
                url: 'https://cambio-uruguay.com',
              },
            },
          ],
        })
      }),
    },
  ],
})
</script>

<style scoped>
.mutualista-page {
  max-width: 1040px;
}
.kicker {
  font-size: 0.875rem;
  font-weight: 600;
}
.page-title {
  font-size: clamp(1.5rem, 5vw, 2.1rem);
  line-height: 1.2;
  font-weight: 750;
  text-wrap: balance;
}
.lead,
.lead-note,
.reading-width {
  max-width: 72ch;
  margin-top: 0;
  line-height: 1.7;
}
.lead-note {
  font-size: 0.9375rem;
}
.section-title {
  margin-top: 0;
  font-size: clamp(1.2rem, 3vw, 1.5rem);
  line-height: 1.3;
  font-weight: 750;
  text-wrap: balance;
}
.regime-title {
  margin-top: 0;
  font-size: 1.0625rem;
  font-weight: 700;
}
.intro-actions,
.source-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
}
.mutualista-page a {
  color: rgb(var(--v-theme-link));
  text-underline-offset: 3px;
}
.source-link,
.source-actions a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
}
.tariff-table td {
  padding-top: 14px !important;
  padding-bottom: 14px !important;
  vertical-align: top;
}
.amount {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.value-note {
  max-width: 28ch;
  margin-top: 6px;
  font-size: 0.8125rem;
  line-height: 1.5;
  text-align: left;
  white-space: normal;
}
.rank-note {
  display: block;
  margin-top: 2px;
  font-size: 0.8125rem;
}
.regime-list,
.next-list {
  margin-top: 0;
  padding-left: 20px;
  line-height: 1.7;
}
.regime-list li,
.next-list li {
  margin-bottom: 10px;
}
.regime-note {
  display: block;
  margin-top: 4px;
  font-size: 0.8125rem;
  line-height: 1.5;
}
.contradiction {
  font-weight: 600;
}
.source-dates {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 28px;
  margin-top: 0;
}
.source-dates dt {
  font-size: 0.875rem;
}
.source-dates dd {
  margin: 0;
  font-weight: 600;
}
.next-step {
  margin-top: 48px;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
@media (max-width: 599px) {
  .value-note {
    max-width: none;
  }
  .next-step {
    margin-top: 36px;
  }
}
</style>
