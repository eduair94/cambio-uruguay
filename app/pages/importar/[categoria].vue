<template>
  <!-- Gated on `category`: un slug desconocido tira 404 en setup, así que el render
       del camino de error queda vacío y no explota en SSR. -->
  <div v-if="category" class="import-category-page">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" md="10" lg="9">
          <!-- Volver al índice -->
          <div class="mb-4">
            <VBtn :to="localePath('/importar')" variant="text" size="small" class="px-1">
              <VIcon start size="small">mdi-arrow-left</VIcon>
              Importar por categoría
            </VBtn>
          </div>

          <!-- Encabezado -->
          <VCard class="overflow-hidden mb-6" elevation="8">
            <div class="bg-gradient-tool pa-6 on-dark">
              <div class="d-flex align-center ga-4 flex-wrap">
                <VAvatar size="56" class="d-none d-md-flex bg-white">
                  <VIcon size="32" color="primary">{{ category.icon }}</VIcon>
                </VAvatar>
                <div>
                  <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-1">
                    {{ category.title }}
                  </h1>
                  <p class="text-body-1 text-grey-lighten-2 mb-0 category-lead">
                    {{ category.description }}
                  </p>
                </div>
              </div>
              <div class="d-flex justify-start justify-md-end mt-3">
                <ShareButtons :text="category.title" />
              </div>
            </div>
          </VCard>

          <!-- Veredicto por régimen: la respuesta a "¿cuánto pago?" antes de cualquier prosa -->
          <section class="mb-8">
            <h2 class="text-h6 font-weight-bold mb-1">Cuánto paga, según cómo entre</h2>
            <p class="text-body-2 text-grey-lighten-1 section-intro mb-4">
              Un envío entra por un solo camino. Los dos primeros son los regímenes postales (hasta
              US$ {{ FRANCHISE_ANNUAL_USD }} y {{ MAX_WEIGHT_KG }} kg por envío); el tercero es la
              importación formal, con despachante.
            </p>
            <div class="regime-grid">
              <VCard
                v-for="row in regimeRows"
                :key="row.key"
                variant="flat"
                class="regime-card pa-4"
                :class="`regime-${row.outcome.tone}`"
              >
                <div class="d-flex align-center ga-2 mb-2">
                  <VIcon size="small" :color="TONE_COLOR[row.outcome.tone]">
                    {{ TONE_ICON[row.outcome.tone] }}
                  </VIcon>
                  <span class="text-overline text-grey">{{ row.label }}</span>
                </div>
                <p class="text-subtitle-1 font-weight-bold mb-2 regime-verdict">
                  {{ row.outcome.verdict }}
                </p>
                <p class="text-body-2 text-grey-lighten-1 mb-0 regime-detail">
                  {{ row.outcome.detail }}
                </p>
              </VCard>
            </div>
          </section>

          <!-- Qué entra en esta categoría -->
          <section class="mb-8">
            <h2 class="text-h6 font-weight-bold mb-3">Qué cuenta como {{ category.navLabel }}</h2>
            <div class="d-flex flex-wrap ga-2 mb-3">
              <VChip
                v-for="example in category.examples"
                :key="example"
                size="small"
                variant="tonal"
                color="primary"
              >
                {{ example }}
              </VChip>
            </div>
            <div v-if="category.notIncluded?.length" class="d-flex flex-wrap ga-2 align-center">
              <span class="text-caption text-grey">No entra:</span>
              <VChip
                v-for="item in category.notIncluded"
                :key="item"
                size="small"
                variant="tonal"
                color="grey"
              >
                {{ item }}
              </VChip>
            </div>
          </section>

          <!-- Tributo por tributo -->
          <section class="mb-8">
            <h2 class="text-h6 font-weight-bold mb-3">Impuestos, uno por uno</h2>
            <div class="table-scroll">
              <table class="category-table cu-mobile-cards">
                <thead>
                  <tr>
                    <th>Tributo</th>
                    <th>Esta categoría</th>
                    <th>Por qué</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="line in category.taxes" :key="line.concept">
                    <td>{{ line.concept }}</td>
                    <td data-label="Esta categoría" class="font-weight-bold">{{ line.value }}</td>
                    <td data-label="Por qué">
                      {{ line.detail }}
                      <a
                        v-if="line.source"
                        :href="line.source.url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="category-link"
                      >
                        {{ line.source.label }}
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- Beneficios -->
          <section v-if="category.benefits.length" class="mb-8">
            <h2 class="text-h6 font-weight-bold mb-3">Beneficios a los que podés acceder</h2>
            <VCard
              v-for="benefit in category.benefits"
              :key="benefit.title"
              variant="flat"
              class="benefit-card pa-4 mb-3"
            >
              <div class="d-flex align-center ga-2 mb-2">
                <VIcon size="small" color="success">mdi-check-decagram-outline</VIcon>
                <span class="text-subtitle-2 font-weight-bold">{{ benefit.title }}</span>
              </div>
              <p class="text-body-2 text-grey-lighten-1 benefit-detail mb-2">
                {{ benefit.detail }}
              </p>
              <a
                :href="benefit.url"
                target="_blank"
                rel="noopener noreferrer"
                class="text-caption category-link"
              >
                {{ benefit.norm }}
              </a>
            </VCard>
          </section>

          <!-- Cómo declararlo: el corazón de la página -->
          <section class="mb-8">
            <h2 class="text-h6 font-weight-bold mb-2">
              Cómo declararlo para que te apliquen el beneficio
            </h2>
            <p class="text-body-2 text-grey-lighten-1 section-intro mb-4">
              {{ category.declare.intro }}
            </p>
            <ol class="declare-steps">
              <li v-for="(step, i) in category.declare.steps" :key="i" class="mb-3">
                <span class="font-weight-bold">{{ step.name }}.</span>
                <span class="text-grey-lighten-1">{{ ' ' + step.text }}</span>
              </li>
            </ol>
            <VAlert
              v-if="category.declare.pitfalls.length"
              type="warning"
              variant="tonal"
              density="comfortable"
              class="mt-4"
              icon="mdi-alert-outline"
            >
              <p class="text-subtitle-2 font-weight-bold mb-2">
                Lo que te hace perder el beneficio
              </p>
              <ul class="pitfall-list">
                <li v-for="(pitfall, i) in category.declare.pitfalls" :key="i">{{ pitfall }}</li>
              </ul>
            </VAlert>
          </section>

          <!-- Trámites ante otros organismos -->
          <section v-if="category.procedures?.length" class="mb-8">
            <h2 class="text-h6 font-weight-bold mb-3">Trámites antes de que te lo liberen</h2>
            <VCard
              v-for="proc in category.procedures"
              :key="proc.organism"
              variant="flat"
              class="procedure-card pa-4 mb-3"
            >
              <div class="d-flex align-center ga-2 mb-2">
                <VIcon size="small" color="info">mdi-file-document-check-outline</VIcon>
                <span class="text-subtitle-2 font-weight-bold">
                  {{ ORGANISM_LABEL[proc.organism] }}
                </span>
              </div>
              <p class="text-body-2 text-grey-lighten-1 procedure-line mb-2">
                <strong>Cuándo:</strong> {{ proc.when }}
              </p>
              <p class="text-body-2 text-grey-lighten-1 procedure-line mb-2">
                <strong>Cómo:</strong> {{ proc.how }}
              </p>
              <a
                :href="proc.url"
                target="_blank"
                rel="noopener noreferrer"
                class="text-caption category-link"
              >
                Sitio del organismo
              </a>
            </VCard>
          </section>

          <!-- Cosas a considerar -->
          <section v-if="category.considerations.length" class="mb-8">
            <h2 class="text-h6 font-weight-bold mb-3">Cosas a considerar</h2>
            <ul class="consideration-list">
              <li v-for="(item, i) in category.considerations" :key="i" class="mb-2">{{ item }}</li>
            </ul>
          </section>

          <!-- Calculadora, precargada con esta categoría -->
          <VCard class="cta-calc my-8 pa-6" variant="flat">
            <h2 class="text-h6 font-weight-bold mb-2">Calculá tu envío</h2>
            <p class="text-body-2 text-grey-lighten-1 mb-4 cta-text">
              La calculadora aplica el tratamiento de esta categoría y compara los dos regímenes
              postales para tu valor y tu peso.
            </p>
            <VBtn :to="calculatorLink" color="primary" variant="elevated">
              <VIcon start>mdi-calculator-variant-outline</VIcon>
              Abrir la calculadora con {{ category.navLabel }}
            </VBtn>
          </VCard>

          <!-- FAQ -->
          <section v-if="category.faqs.length" class="mb-8">
            <h2 class="text-h6 font-weight-bold mb-3">Preguntas frecuentes</h2>
            <VExpansionPanels variant="accordion" class="category-faq-panels">
              <VExpansionPanel v-for="(faq, i) in category.faqs" :key="i">
                <VExpansionPanelTitle class="font-weight-medium">{{ faq.q }}</VExpansionPanelTitle>
                <VExpansionPanelText>
                  <p class="text-body-2 text-grey-lighten-1 faq-answer mb-0">{{ faq.a }}</p>
                </VExpansionPanelText>
              </VExpansionPanel>
            </VExpansionPanels>
          </section>

          <!-- Fuentes -->
          <VCard variant="flat" class="category-sources pa-5 mb-6">
            <h2 class="text-subtitle-1 font-weight-bold mb-3">
              <VIcon start size="small" color="primary">mdi-link-variant</VIcon>
              Fuentes
            </h2>
            <ul class="sources-list">
              <li v-for="(source, i) in category.sources" :key="i">
                <a :href="source.url" target="_blank" rel="noopener noreferrer">{{
                  source.label
                }}</a>
                <span v-if="source.note" class="source-note"> — {{ source.note }}</span>
              </li>
            </ul>
            <p class="text-caption text-grey mt-3 mb-0">
              Contrastado con las fuentes el {{ verifiedDisplay }}. Es información de referencia, no
              asesoramiento profesional: confirmá con la Dirección Nacional de Aduanas antes de
              comprar.
            </p>
          </VCard>

          <!-- Otras categorías -->
          <VCard variant="flat" class="related-links pa-5">
            <h2 class="text-subtitle-1 font-weight-bold mb-3">Otras categorías</h2>
            <div class="d-flex flex-wrap ga-2">
              <VChip
                v-for="other in otherCategories"
                :key="other.slug"
                :to="localePath(`/importar/${other.slug}`)"
                color="primary"
                variant="tonal"
                size="small"
                link
              >
                <VIcon start size="small">{{ other.icon }}</VIcon>
                {{ other.navLabel }}
              </VChip>
            </div>
          </VCard>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import { FRANCHISE_ANNUAL_USD, MAX_WEIGHT_KG } from '~/utils/importRules'
import {
  IMPORT_CATEGORIES,
  getImportCategory,
  importCategorySlugs,
  type RegimeOutcome,
} from '~/utils/importCategories'

// Slug desconocido → 404 en el guard, sin render parcial. El catálogo es estático y puro, así que
// el validator lo lee directo. OJO: `validate` se extrae en build, así que editar la lista exige
// reiniciar el dev server.
definePageMeta({
  validate: route => importCategorySlugs().includes(String(route.params.categoria ?? '')),
})

const localePath = useLocalePath()
const route = useRoute()
const { locale } = useI18n()

const slug = computed(() => String(route.params.categoria ?? ''))
const category = computed(() => getImportCategory(slug.value))

// Cinturón y tiradores: `validate` ya 404ea, pero el setup también, para que el template nunca
// renderice una categoría indefinida.
if (!category.value) {
  throw createError({ statusCode: 404, statusMessage: 'Categoría no encontrada' })
}

const ORGANISM_LABEL: Record<string, string> = {
  MSP: 'MSP — Ministerio de Salud Pública',
  URSEC: 'URSEC (vía VUCE)',
  MGAP: 'MGAP — Ganadería, Agricultura y Pesca',
  SMA: 'Servicio de Material y Armamento (Ejército)',
}

const TONE_COLOR: Record<RegimeOutcome['tone'], string> = {
  good: 'success',
  warn: 'warning',
  bad: 'error',
}

const TONE_ICON: Record<RegimeOutcome['tone'], string> = {
  good: 'mdi-check-circle-outline',
  warn: 'mdi-alert-circle-outline',
  bad: 'mdi-close-circle-outline',
}

const regimeRows = computed(() => {
  const c = category.value
  if (!c) return []
  return [
    { key: 'franquicia', label: 'Con franquicia anual', outcome: c.regimes.franquicia },
    { key: 'prestacion', label: 'Prestación única', outcome: c.regimes.prestacionUnica },
    { key: 'general', label: 'Régimen general', outcome: c.regimes.general },
  ]
})

const otherCategories = computed(() => IMPORT_CATEGORIES.filter(c => c.slug !== slug.value))

// La calculadora acepta `?tipo=` y precarga la categoría. Se pasa como objeto: `localePath` con la
// query pegada en el string la deja tal cual en rutas con prefijo de idioma.
const calculatorLink = computed(() => ({
  path: localePath('/herramientas/calculadora-impuestos-importacion'),
  query: { tipo: category.value?.productTypeId },
}))

const canonicalUrl = computed(() => `https://cambio-uruguay.com/importar/${slug.value}`)

const verifiedDisplay = computed(() =>
  category.value
    ? new Date(category.value.verifiedAt).toLocaleDateString(locale.value, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : ''
)

defineOgImageComponent('Cambio', {
  title: () => category.value?.title ?? 'Importar a Uruguay',
  subtitle: () => category.value?.description ?? '',
  tag: 'IMPORTAR',
})

useSeoMeta({
  title: () => `${category.value?.title ?? 'Importar'} | Cambio Uruguay`,
  description: () => category.value?.description ?? '',
  ogTitle: () => category.value?.title ?? 'Importar a Uruguay',
  ogDescription: () => category.value?.description ?? '',
  ogType: 'article',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
  twitterTitle: () => category.value?.title ?? 'Importar a Uruguay',
  twitterDescription: () => category.value?.description ?? '',
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: computed(() =>
        JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Article',
              headline: category.value?.title,
              description: category.value?.description,
              image: `https://cambio-uruguay.com/__og-image__/image/importar/${slug.value}/og.png`,
              datePublished: category.value?.verifiedAt,
              dateModified: category.value?.verifiedAt,
              inLanguage: 'es-UY',
              mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl.value },
              speakable: {
                '@type': 'SpeakableSpecification',
                cssSelector: ['.category-lead', '.regime-verdict'],
              },
              author: {
                '@type': 'Person',
                name: 'Eduardo Airaudo',
                url: 'https://www.linkedin.com/in/eduardo-airaudo/',
              },
              publisher: {
                '@type': 'Organization',
                name: 'Cambio Uruguay',
                logo: {
                  '@type': 'ImageObject',
                  url: 'https://cambio-uruguay.com/img/logo.png',
                },
              },
            },
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
                  name: 'Importar por categoría',
                  item: 'https://cambio-uruguay.com/importar',
                },
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: category.value?.title,
                  item: canonicalUrl.value,
                },
              ],
            },
            ...(category.value?.declare.steps.length
              ? [
                  {
                    '@type': 'HowTo',
                    name: `Cómo declarar ${category.value.navLabel} al importar a Uruguay`,
                    description: category.value.declare.intro,
                    step: category.value.declare.steps.map((s, i) => ({
                      '@type': 'HowToStep',
                      position: i + 1,
                      name: s.name,
                      text: s.text,
                    })),
                  },
                ]
              : []),
            ...(category.value?.faqs.length
              ? [
                  {
                    '@type': 'FAQPage',
                    mainEntity: category.value.faqs.map(f => ({
                      '@type': 'Question',
                      name: f.q,
                      acceptedAnswer: { '@type': 'Answer', text: f.a },
                    })),
                  },
                ]
              : []),
          ],
        })
      ),
    },
  ],
})
</script>

<style scoped>
.category-lead,
.section-intro,
.regime-detail,
.benefit-detail,
.procedure-line,
.faq-answer,
.cta-text {
  line-height: 1.7;
}

/* Los tres caminos, uno al lado del otro en desktop y apilados en el teléfono. */
.regime-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr;
}

@media (min-width: 700px) {
  .regime-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.regime-card {
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.03);
}

.regime-good {
  border-color: rgba(var(--v-theme-success), 0.45);
}

.regime-warn {
  border-color: rgba(var(--v-theme-warning), 0.45);
}

.regime-bad {
  border-color: rgba(var(--v-theme-error), 0.4);
}

.benefit-card,
.procedure-card,
.category-sources,
.related-links {
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.03);
}

.table-scroll {
  overflow-x: auto;
}

.category-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.category-table th,
.category-table td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
  text-align: left;
  vertical-align: top;
}

.category-table thead th {
  font-weight: 700;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.category-table tbody td:first-child {
  font-weight: 600;
  white-space: nowrap;
}

.declare-steps {
  padding-left: 1.25rem;
  line-height: 1.75;
}

.pitfall-list,
.consideration-list,
.sources-list {
  padding-left: 1.1rem;
  line-height: 1.7;
  margin: 0;
}

.sources-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85rem;
}

.sources-list a,
.category-link {
  color: rgb(var(--v-theme-link));
  text-decoration: none;
  font-weight: 600;
}

.sources-list a:hover,
.category-link:hover {
  text-decoration: underline;
}

.source-note {
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-weight: 400;
}

.cta-calc {
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.28);
  border-radius: 12px;
}

/* El título de la pregunta se apretaba en varias líneas (line-height de Vuetify). */
.category-faq-panels :deep(.v-expansion-panel-title) {
  line-height: 1.5;
  padding-top: 0.85rem;
  padding-bottom: 0.85rem;
  min-height: 3.25rem;
}
</style>
