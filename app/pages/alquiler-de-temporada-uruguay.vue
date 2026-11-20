<template>
  <div class="temporada-page">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" md="10" lg="8">
          <header class="mb-6">
            <VChip class="mb-3" color="primary" size="small" variant="tonal">
              <VIcon start size="small">mdi-beach</VIcon>
              Alquiler
            </VChip>
            <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">
              Alquiler de temporada en Uruguay: los {{ maxDays }} días que lo definen
            </h1>
            <p class="text-body-1 temporada-lead">
              No lo convierte en «de temporada» que sea verano ni que lo diga el contrato: lo
              convierten dos cosas, que el inmueble esté en zona turística y que el plazo
              <strong>no pase de {{ maxDays }} días</strong>. Si entra ahí, queda fuera de la Ley de
              Arrendamientos y el desalojo pasa a ser de <strong>{{ evictionDays }} días</strong>.
            </p>
            <ShareButtons
              class="mt-4"
              :url="canonicalUrl"
              text="Alquiler de temporada en Uruguay: 120 días, y desalojo en 15"
            />
            <p class="text-caption text-medium-emphasis mt-3">
              Textos legales cotejados contra impo.com.uy y gub.uy el {{ verifiedDisplay }}. La
              redacción vigente del literal que define el contrato es la que le dio el art. 5 de la
              Ley 20.352, promulgada el 19 de setiembre de 2024.
            </p>
          </header>

          <VDivider class="mb-6" />

          <!-- 1. La definición y lo que cuelga de ella -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Las siete reglas del contrato</h2>
            <p class="text-body-1 temporada-prose mb-4">
              Todas salen del Decreto-Ley 14.219, la Ley de Arrendamientos, y las seis primeras de
              un solo literal: el A del artículo 28. Es el que dice qué contratos quedan afuera de
              la ley, y el que la Ley 20.352 reescribió en 2024.
            </p>
            <VCard
              v-for="rule in rules"
              :key="rule.id"
              variant="outlined"
              class="temporada-card pa-4 mb-3"
            >
              <p class="text-subtitle-1 font-weight-bold temporada-card-title">{{ rule.label }}</p>
              <p class="text-body-2 temporada-card-body">{{ rule.detail }}</p>
            </VCard>
            <VAlert type="info" variant="tonal" density="comfortable" class="mt-4">
              <p class="text-body-2 temporada-alert">
                <strong>La sanción del abuso mira al dueño, no al inquilino.</strong> Es la parte
                del literal que casi nunca se cita: si se comprueba que el contrato de temporada se
                usó para disfrazar un alquiler de vivienda permanente, el condenado
                «preceptivamente» en tributos, costos y daños y perjuicios es el arrendador. Si lo
                que buscás es un alquiler para vivir todo el año, el directorio está en
                <NuxtLink :to="localePath('/alquileres-uruguay')" class="cu-link">
                  alquileres </NuxtLink
                >, y los plazos del régimen común en
                <NuxtLink :to="localePath('/desalojo-de-alquiler-uruguay')" class="cu-link">
                  desalojo </NuxtLink
                >.
              </p>
            </VAlert>
          </section>

          <!-- 2. La Ley 20.352 -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              Si además lo ofrecés como alojamiento turístico
            </h2>
            <p class="text-body-1 temporada-prose mb-4">
              Alquilar por temporada y ofrecer hospedaje no son lo mismo. La Ley 20.352 alcanza al
              «hospedaje transitorio, en condiciones de inmediata ocupación en el que se ofrezcan
              uno o más servicios en forma onerosa», y a eso le llama
              <strong>inmuebles de uso turístico</strong>. Son cinco obligaciones y ninguna depende
              de cuántos días dure la estadía.
            </p>
            <VTable class="temporada-table cu-mobile-cards mb-4" density="comfortable">
              <thead>
                <tr>
                  <th>Obligación</th>
                  <th>Qué dice</th>
                  <th>Artículo</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="duty in duties" :key="duty.id">
                  <td data-label="Obligación" class="font-weight-medium">{{ duty.label }}</td>
                  <td data-label="Qué dice" class="cu-cell-prose">{{ duty.detail }}</td>
                  <td data-label="Artículo">{{ duty.article }}</td>
                </tr>
              </tbody>
            </VTable>
            <VAlert type="warning" variant="tonal" density="comfortable">
              <p class="text-body-2 temporada-alert">
                <strong>La ley rige y el reglamento todavía se espera.</strong> La Ley 20.352 está
                publicada desde el 27 de setiembre de 2024, pero su art. 6 encarga al Poder
                Ejecutivo reglamentarla. El Ministerio de Turismo comunicó el 24 de noviembre de
                2025 que había presentado el <em>proyecto</em> de decreto —registro obligatorio con
                un número único visible para el turista, plataformas digitales que sólo podrán
                publicar alojamientos registrados y 180 días para adecuarse—, y su propio trámite de
                inscripción, actualizado el 2 de marzo de 2026, todavía no lista una categoría de
                vivienda turística. Por eso acá no vas a encontrar una fecha de entrada en vigencia
                ni un monto de multa: lo que hay publicado es un proyecto, y un proyecto no es una
                norma.
              </p>
            </VAlert>
          </section>

          <!-- 3. Lo que no publicamos -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Cuatro cosas que acá no vas a encontrar</h2>
            <p class="text-body-1 temporada-prose mb-4">
              Porque no podemos sostenerlas con una fuente oficial vigente, y una cifra sin fuente
              en una decisión de este tamaño es peor que ninguna.
            </p>
            <ul class="temporada-list">
              <li v-for="item in unpublished" :key="item.id">
                <strong>{{ item.label }}</strong> — {{ item.why }}
              </li>
            </ul>
          </section>

          <!-- La unidad intermedia, antes de las preguntas: mismo corte que FaqSection (ver
               docs/seo/adsense-growth-loop.md, 31/10/2026). Sólo dibuja en densidad normal. -->
          <AdSlot placement="in-article" class="mb-6" />
          <!-- 4. FAQ -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Preguntas frecuentes</h2>
            <VExpansionPanels variant="accordion">
              <VExpansionPanel v-for="faq in faqs" :key="faq.question" :title="faq.question">
                <template #text>
                  <p class="text-body-2 temporada-faq">{{ faq.answer }}</p>
                </template>
              </VExpansionPanel>
            </VExpansionPanels>
          </section>

          <!-- 5. Fuentes y vecinos -->
          <section class="mb-4">
            <h2 class="text-h5 font-weight-bold mb-3">Fuentes</h2>
            <ul class="temporada-list mb-6">
              <li v-for="source in sources" :key="source.id">
                <a :href="source.url" target="_blank" rel="noopener noreferrer" class="cu-link">{{
                  source.label
                }}</a>
                <template v-if="source.shownAt"> — {{ displayDate(source.shownAt) }} </template>
              </li>
            </ul>
            <p class="text-body-2 temporada-prose">
              Los impuestos y los riesgos de ser anfitrión están en la guía de
              <NuxtLink :to="localePath('/guias/alquiler-temporario-uruguay')" class="cu-link">
                alquiler temporario y Airbnb </NuxtLink
              >. Por qué la costa concentra la vivienda cerrada nueve meses al año, en
              <NuxtLink :to="localePath('/por-que-no-baja-el-alquiler-uruguay')" class="cu-link">
                por qué no baja el alquiler </NuxtLink
              >. Y las demás páginas del tema, en
              <NuxtLink :to="localePath('/temas/alquiler-y-vivienda-uruguay')" class="cu-link">
                Alquilar en Uruguay </NuxtLink
              >.
            </p>
          </section>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import {
  SEASONAL_DUTIES,
  SEASONAL_EVICTION_DAYS,
  SEASONAL_FAQ,
  SEASONAL_MAX_DAYS,
  SEASONAL_PATH,
  SEASONAL_RULES,
  SEASONAL_SOURCES,
  SEASONAL_UNPUBLISHED,
  SEASONAL_VERIFIED_AT,
} from '~/utils/seasonalRental'

const localePath = useLocalePath()

const rules = SEASONAL_RULES
const duties = SEASONAL_DUTIES
const unpublished = SEASONAL_UNPUBLISHED
const faqs = SEASONAL_FAQ
const sources = SEASONAL_SOURCES
const maxDays = SEASONAL_MAX_DAYS
const evictionDays = SEASONAL_EVICTION_DAYS

const displayDate = (iso: string): string =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

const verifiedDisplay = displayDate(SEASONAL_VERIFIED_AT)

const canonicalUrl = `https://cambio-uruguay.com${SEASONAL_PATH}`

// El título y la descripción van como literales EN LA PÁGINA, que es la forma que leen
// `seoTitleBudget.test.ts` y `seoDescriptionBudget.test.ts` sin ejecutar la app: una cadena armada
// desde un módulo sale del control de los 60 y los 155 caracteres y del de snippets repetidos.
// Que no envejezcan contra las constantes de la ley lo vigila `seasonalRental.test.ts`.
const title = 'Alquiler de temporada en Uruguay: 120 días'
const description =
  'Hasta 120 días en zona turística y desalojo en 15: así define el contrato por temporada el art. 28 de la Ley de Arrendamientos desde la Ley 20.352.'

defineOgImageComponent('Cambio', {
  title: 'Alquiler de temporada en Uruguay',
  subtitle: `Hasta ${SEASONAL_MAX_DAYS} días, desalojo en ${SEASONAL_EVICTION_DAYS}`,
  tag: 'ALQUILER',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'article',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [
    {
      name: 'keywords',
      content:
        'alquiler de temporada uruguay, contrato de alquiler por temporada, alquiler temporada punta del este, ley 20352 alojamiento turistico, registro de operadores turisticos mintur, desalojo alquiler de temporada, alquilar por temporada en dolares',
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
                name: 'Cambio Uruguay',
                item: 'https://cambio-uruguay.com',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Alquilar en Uruguay',
                item: 'https://cambio-uruguay.com/temas/alquiler-y-vivienda-uruguay',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Alquiler de temporada',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: faqs.map(faq => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: { '@type': 'Answer', text: faq.answer },
            })),
          },
          {
            '@type': 'Article',
            headline: title,
            description,
            inLanguage: 'es-UY',
            dateModified: SEASONAL_VERIFIED_AT,
            mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
            publisher: {
              '@type': 'Organization',
              name: 'Cambio Uruguay',
              url: 'https://cambio-uruguay.com',
            },
            citation: sources.map(source => ({
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
/* Vuetify 4 no anula el margen de los bloques de texto y éste no colapsa dentro de una tarjeta ni
   de un item de flex: cada bloque declara el suyo (DESIGN.md → "The Text Block Owns Its Top
   Margin Rule"). */
.temporada-lead,
.temporada-prose,
.temporada-alert,
.temporada-faq,
.temporada-card-title {
  margin-top: 0;
}

.temporada-lead {
  font-size: 1.0625rem;
  line-height: 1.7;
}

.temporada-prose {
  line-height: 1.7;
}

.temporada-card-title {
  margin-bottom: 0.35rem;
}

.temporada-card-body {
  margin-top: 0;
  margin-bottom: 0;
  line-height: 1.65;
}

.temporada-list {
  padding-left: 1.25rem;
  line-height: 1.7;
}

.temporada-list li + li {
  margin-top: 0.6rem;
}

.temporada-table :deep(th) {
  font-weight: 700;
}
</style>
