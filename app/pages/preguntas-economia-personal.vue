<template>
  <VContainer class="money-faq-page py-6 py-md-10">
    <nav class="mb-5" aria-label="Migas de pan">
      <VBtn :to="localePath('/temas-de-dinero-reddit')" variant="text" size="small" class="px-1">
        <VIcon start size="small">mdi-arrow-left</VIcon>
        Temas de dinero en Reddit
      </VBtn>
    </nav>

    <header class="faq-hero mb-8">
      <div>
        <p class="faq-kicker mb-2">Economía cotidiana · Uruguay</p>
        <h1 class="faq-title mb-4">Preguntas frecuentes sobre dinero en Uruguay</h1>
        <p class="faq-lede text-medium-emphasis mb-5">
          Reunimos las dudas que aparecen una y otra vez en comunidades uruguayas y las respondemos
          con la norma, el dato o el procedimiento oficial al lado. Reddit sirve para descubrir
          preguntas; <strong>no se usa como fuente de la respuesta</strong>.
        </p>

        <div class="faq-metrics" aria-label="Alcance y vigencia">
          <span>
            <strong>{{ PERSONAL_FAQS.length }}</strong>
            respuestas
          </span>
          <span>
            <strong>{{ FAQ_CATEGORIES.length }}</strong>
            temas
          </span>
          <span>
            <strong>{{ sourceIndex.length }}</strong>
            fuentes
          </span>
          <span>
            revisado el <strong>{{ lastReviewedLabel }}</strong>
          </span>
        </div>
      </div>

      <aside class="evidence-key" aria-labelledby="evidence-key-title">
        <h2 id="evidence-key-title" class="text-subtitle-1 font-weight-bold mb-2">
          Qué respalda cada respuesta
        </h2>
        <p class="text-body-2 text-medium-emphasis mb-4">
          La etiqueta separa una obligación jurídica de un dato, un trámite o un criterio prudente.
        </p>
        <ul class="evidence-key__list">
          <li v-for="basis in basisKey" :key="basis.id">
            <span :class="['evidence-dot', `evidence-dot--${basis.id}`]" />
            <span>
              <strong>{{ basis.label }}</strong>
              <small>{{ basis.description }}</small>
            </span>
          </li>
        </ul>
      </aside>
    </header>

    <VAlert type="info" variant="tonal" density="comfortable" class="scope-note mb-7">
      <div class="scope-note__content">
        <div>
          Esta guía cubre los temas generales. Para reglas de importación usá la
          <NuxtLink :to="localePath('/preguntas-frecuentes-aduana-uruguay')">
            FAQ de aduana y franquicias</NuxtLink
          >; para contratos, garantías y rescisión, la
          <NuxtLink :to="localePath('/alquilar-en-uruguay')">guía de alquileres</NuxtLink>.
        </div>
        <ShareButtons text="Preguntas frecuentes sobre dinero en Uruguay" />
      </div>
    </VAlert>

    <section class="search-workbench mb-9" aria-labelledby="search-title">
      <div class="search-workbench__heading">
        <div>
          <h2 id="search-title" class="text-h6 font-weight-bold mb-1">Encontrá tu caso</h2>
          <p class="text-body-2 text-medium-emphasis mb-0">
            Buscá por situación, organismo o término: “Clearing”, “AFAP”, “IRPF”, “cuotas” o
            “cripto”.
          </p>
        </div>
        <span class="result-count" aria-live="polite">
          {{ filteredFaqs.length }}
          {{ filteredFaqs.length === 1 ? 'respuesta' : 'respuestas' }}
        </span>
      </div>

      <VTextField
        v-model="query"
        clearable
        hide-details
        variant="outlined"
        density="comfortable"
        prepend-inner-icon="mdi-magnify"
        label="Buscar una pregunta"
        class="mt-4"
      />

      <div class="category-filter mt-4" role="group" aria-label="Filtrar por tema">
        <VBtn
          size="small"
          :variant="activeCategory === 'all' ? 'flat' : 'outlined'"
          :color="activeCategory === 'all' ? 'primary' : undefined"
          @click="activeCategory = 'all'"
        >
          Todas
        </VBtn>
        <VBtn
          v-for="category in FAQ_CATEGORIES"
          :key="category.id"
          size="small"
          :variant="activeCategory === category.id ? 'flat' : 'outlined'"
          :color="activeCategory === category.id ? 'primary' : undefined"
          @click="activeCategory = category.id"
        >
          <VIcon start size="16">{{ category.icon }}</VIcon>
          {{ category.label }}
        </VBtn>
      </div>
    </section>

    <main>
      <template v-if="groups.length">
        <section
          v-for="group in groups"
          :id="`tema-${group.category}`"
          :key="group.category"
          class="faq-group mb-10"
          :aria-labelledby="`title-${group.category}`"
        >
          <div class="faq-group__heading mb-4">
            <div>
              <p class="faq-group__eyebrow mb-1">{{ group.items.length }} preguntas</p>
              <h2 :id="`title-${group.category}`" class="text-h5 font-weight-bold mb-1">
                <VIcon start color="primary" size="small">{{ group.icon }}</VIcon>
                {{ group.label }}
              </h2>
              <p class="text-body-2 text-medium-emphasis mb-0">{{ group.description }}</p>
            </div>
          </div>

          <VExpansionPanels multiple class="faq-panels">
            <VExpansionPanel
              v-for="faq in group.items"
              :id="`pregunta-${faq.id}`"
              :key="faq.id"
              eager
            >
              <VExpansionPanelTitle class="faq-question">
                <div class="faq-question__content">
                  <div class="d-flex flex-wrap align-center ga-2">
                    <span class="font-weight-bold">{{ faq.question }}</span>
                    <span :class="['evidence-label', `evidence-label--${faq.basis}`]">
                      {{ basisLabels[faq.basis] }}
                    </span>
                    <span v-if="faq.howCommon === 'muy_comun'" class="common-label">
                      Muy consultada
                    </span>
                  </div>
                  <p class="text-body-2 text-medium-emphasis mt-1 mb-0">
                    {{ faq.shortAnswer }}
                  </p>
                </div>
              </VExpansionPanelTitle>

              <VExpansionPanelText>
                <div class="faq-answer">
                  <p class="mb-4">{{ faq.answer }}</p>

                  <div class="faq-answer__footer">
                    <div class="source-links" aria-label="Fuentes de esta respuesta">
                      <span class="source-links__label">Fuentes</span>
                      <a
                        v-for="source in sourcesFor(faq)"
                        :key="source.url"
                        :href="source.url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="source-link"
                      >
                        <VIcon size="14">mdi-open-in-new</VIcon>
                        {{ source.authority }}
                        <VTooltip activator="parent" location="top">{{ source.label }}</VTooltip>
                      </a>
                    </div>

                    <div v-if="faq.related?.length" class="related-links">
                      <NuxtLink
                        v-for="related in faq.related"
                        :key="related.to"
                        :to="localePath(related.to)"
                      >
                        {{ related.label }}
                        <VIcon size="15">mdi-arrow-right</VIcon>
                      </NuxtLink>
                    </div>
                  </div>
                </div>
              </VExpansionPanelText>
            </VExpansionPanel>
          </VExpansionPanels>
        </section>
      </template>

      <VAlert v-else type="info" variant="tonal" class="my-10">
        No encontramos una respuesta con esos términos.
        <VBtn variant="text" size="small" class="ml-1" @click="clearFilters">
          Limpiar filtros
        </VBtn>
      </VAlert>

      <section class="method-note mt-12" aria-labelledby="method-title">
        <div>
          <p class="faq-kicker mb-2">Método editorial</p>
          <h2 id="method-title" class="text-h5 font-weight-bold mb-3">
            Una duda social no se convierte en un hecho
          </h2>
          <p class="text-body-2 text-medium-emphasis mb-0">
            El corpus de Reddit ayuda a medir qué se pregunta y con qué palabras. Cada respuesta se
            contrasta después con BCU, DGI, BPS, MTSS, INE, IMPO u otro organismo competente. Si la
            fuente no permite una conclusión única —por ejemplo, parte del tratamiento tributario de
            criptoactivos— se marca como zona gris y no se inventa una tasa.
          </p>
        </div>
        <VIcon size="42" color="primary">mdi-shield-check-outline</VIcon>
      </section>

      <section class="source-index mt-10" aria-labelledby="sources-title">
        <div class="source-index__heading">
          <div>
            <h2 id="sources-title" class="text-h5 font-weight-bold mb-1">
              Índice de fuentes verificadas
            </h2>
            <p class="text-body-2 text-medium-emphasis mb-0">
              Acceso directo a las {{ sourceIndex.length }} normas, estadísticas y páginas
              institucionales citadas.
            </p>
          </div>
          <VChip size="small" color="primary" variant="tonal">
            Solo fuentes primarias u oficiales
          </VChip>
        </div>

        <ul class="source-index__list mt-5">
          <li v-for="source in sourceIndex" :key="source.url">
            <a :href="source.url" target="_blank" rel="noopener noreferrer">
              <span>{{ source.label }}</span>
              <small>{{ source.authority }} · {{ sourceKindLabels[source.kind] }}</small>
            </a>
          </li>
        </ul>
      </section>

      <VAlert type="warning" variant="tonal" density="comfortable" class="mt-8">
        Información general, no asesoramiento financiero, jurídico, contable ni previsional. Las
        reglas y cifras dependen de la fecha y del caso; por eso cada respuesta muestra su fuente y
        la fecha de revisión del catálogo.
      </VAlert>
    </main>
  </VContainer>
</template>

<script setup lang="ts">
import {
  FAQ_CATEGORIES,
  PERSONAL_FAQS,
  PERSONAL_FAQ_CONTENT_UPDATED_AT,
  PERSONAL_FAQ_SOURCES,
  faqHaystack,
  faqsByCategory,
  normalizeFaqText,
  personalFaqSources,
  type FaqBasis,
  type FaqCategory,
  type PersonalFaq,
  type PersonalFaqSource,
} from '~/utils/personalFinanceFaq'

const localePath = useLocalePath()
const query = ref('')
const activeCategory = ref<'all' | FaqCategory>('all')

const normalizedQuery = computed(() => normalizeFaqText(query.value.trim()))
const filteredFaqs = computed(() =>
  PERSONAL_FAQS.filter(faq => {
    const categoryMatches = activeCategory.value === 'all' || faq.category === activeCategory.value
    const queryMatches = !normalizedQuery.value || faqHaystack(faq).includes(normalizedQuery.value)
    return categoryMatches && queryMatches
  })
)
const groups = computed(() => faqsByCategory(filteredFaqs.value))

const sourceIndex = Object.values(PERSONAL_FAQ_SOURCES).sort(
  (a, b) => a.authority.localeCompare(b.authority, 'es') || a.label.localeCompare(b.label, 'es')
)

const basisLabels: Record<FaqBasis, string> = {
  norma: 'Norma verificada',
  procedimiento: 'Procedimiento oficial',
  'dato-oficial': 'Dato oficial',
  criterio: 'Criterio prudente',
  'zona-gris': 'Zona gris',
}

const basisKey: Array<{ id: FaqBasis; label: string; description: string }> = [
  { id: 'norma', label: 'Norma', description: 'Ley, decreto o regla aplicable.' },
  { id: 'procedimiento', label: 'Procedimiento', description: 'Paso publicado por el organismo.' },
  {
    id: 'dato-oficial',
    label: 'Dato oficial',
    description: 'Cifra o serie con fecha identificada.',
  },
  {
    id: 'criterio',
    label: 'Criterio',
    description: 'Comparación prudente, sin prometer resultados.',
  },
  { id: 'zona-gris', label: 'Zona gris', description: 'La fuente no permite una respuesta única.' },
]

const sourceKindLabels: Record<PersonalFaqSource['kind'], string> = {
  norma: 'norma',
  'fuente-oficial': 'fuente oficial',
  estadistica: 'estadística oficial',
}

function sourcesFor(faq: PersonalFaq) {
  return personalFaqSources(faq)
}

function clearFilters() {
  query.value = ''
  activeCategory.value = 'all'
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

// La fecha que ve el lector tiene que cubrir las respuestas MÁS NUEVAS, no la última revisión
// completa del catálogo: si no, la página se fecha antes de contenido que ya publicó.
const lastReviewedLabel = formatDate(PERSONAL_FAQ_CONTENT_UPDATED_AT)
const canonicalUrl = 'https://cambio-uruguay.com/preguntas-economia-personal'
const title = 'Preguntas frecuentes sobre dinero y economía personal en Uruguay'
const description = `${PERSONAL_FAQS.length} respuestas verificadas sobre dólar, ahorro, alquiler, deudas, créditos, bancos, derechos del consumidor, reclamos, trabajo, impuestos, empresas, AFAP y cripto en Uruguay.`

defineOgImageComponent('Cambio', {
  title: 'Dinero en Uruguay: preguntas frecuentes',
  subtitle: 'Cada respuesta con la norma, el dato o el procedimiento oficial',
  tag: 'FAQ',
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
  meta: [
    {
      name: 'keywords',
      content:
        'economía personal Uruguay, preguntas dinero Uruguay, dólar, ahorro, inversión, alquiler, clearing, préstamos, tarjetas, bancos, derechos consumidor, reclamo, cobranza, asesoramiento jurídico, consulta laboral, IRPF, sueldo, inflación, monotributo, AFAP, cripto',
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
                name: 'Preguntas sobre dinero en Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            dateModified: PERSONAL_FAQ_CONTENT_UPDATED_AT,
            mainEntity: PERSONAL_FAQS.map(faq => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
              },
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.money-faq-page {
  max-width: 1140px;
}

.faq-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(310px, 0.65fr);
  gap: clamp(28px, 5vw, 64px);
  align-items: end;
}

.faq-kicker,
.faq-group__eyebrow {
  color: rgb(var(--v-theme-primary));
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.faq-title {
  max-width: 17ch;
  font-size: clamp(2.25rem, 5vw, 4.35rem);
  font-weight: 850;
  line-height: 1.02;
  letter-spacing: -0.04em;
  text-wrap: balance;
}

.faq-lede {
  max-width: 68ch;
  font-size: 1.05rem;
  line-height: 1.7;
}

.faq-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 20px;
  color: rgba(var(--v-theme-on-surface), 0.72);
  font-size: 0.82rem;
}

.faq-metrics span {
  display: inline-flex;
  gap: 5px;
  align-items: baseline;
}

.faq-metrics strong {
  color: rgb(var(--v-theme-on-surface));
}

.evidence-key,
.search-workbench,
.method-note,
.source-index {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 16px;
  background: rgb(var(--v-theme-surface));
}

.evidence-key {
  padding: 22px;
}

.evidence-key__list {
  display: grid;
  gap: 12px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.evidence-key__list li {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.evidence-key__list span:last-child {
  display: grid;
  gap: 1px;
}

.evidence-key__list strong {
  font-size: 0.82rem;
}

.evidence-key__list small {
  color: rgba(var(--v-theme-on-surface), 0.64);
  font-size: 0.74rem;
  line-height: 1.35;
}

.evidence-dot {
  width: 9px;
  height: 9px;
  margin-top: 5px;
  border-radius: 50%;
  flex: 0 0 auto;
}

.evidence-dot--norma {
  background: rgb(var(--v-theme-success));
}

.evidence-dot--procedimiento {
  background: rgb(var(--v-theme-info));
}

.evidence-dot--dato-oficial {
  background: rgb(var(--v-theme-primary));
}

.evidence-dot--criterio {
  background: rgb(var(--v-theme-warning));
}

.evidence-dot--zona-gris {
  background: rgb(var(--v-theme-error));
}

.scope-note__content {
  display: flex;
  gap: 18px;
  align-items: center;
  justify-content: space-between;
}

.scope-note a {
  color: inherit;
  font-weight: 800;
}

.search-workbench {
  padding: clamp(18px, 3vw, 28px);
}

.search-workbench__heading,
.source-index__heading {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  justify-content: space-between;
}

.result-count {
  padding: 5px 10px;
  border: 1px solid rgba(var(--v-theme-primary), 0.35);
  border-radius: 999px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.76rem;
  font-weight: 800;
  white-space: nowrap;
}

.category-filter {
  display: flex;
  gap: 8px;
  padding-bottom: 5px;
  overflow-x: auto;
  scrollbar-width: thin;
}

.category-filter :deep(.v-btn) {
  flex: 0 0 auto;
}

.faq-group {
  scroll-margin-top: 90px;
}

.faq-group__heading {
  max-width: 720px;
}

.faq-panels :deep(.v-expansion-panel) {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  box-shadow: none;
}

.faq-panels :deep(.v-expansion-panel + .v-expansion-panel) {
  margin-top: 8px;
}

.faq-question {
  min-height: 78px;
}

.faq-question__content {
  min-width: 0;
  padding: 5px 12px 5px 0;
}

.evidence-label,
.common-label {
  padding: 3px 7px;
  border: 1px solid currentColor;
  border-radius: 999px;
  font-size: 0.66rem;
  font-weight: 800;
  line-height: 1.2;
  white-space: nowrap;
}

.evidence-label--norma {
  color: rgb(var(--v-theme-success));
}

.evidence-label--procedimiento {
  color: rgb(var(--v-theme-info));
}

.evidence-label--dato-oficial {
  color: rgb(var(--v-theme-primary));
}

.evidence-label--criterio {
  color: rgb(var(--v-theme-warning));
}

.evidence-label--zona-gris {
  color: rgb(var(--v-theme-error));
}

.common-label {
  color: rgba(var(--v-theme-on-surface), 0.62);
}

.faq-answer {
  max-width: 84ch;
  color: rgba(var(--v-theme-on-surface), 0.88);
  line-height: 1.68;
}

.faq-answer__footer {
  display: grid;
  gap: 15px;
  padding-top: 15px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.source-links,
.related-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
}

.source-links__label {
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.source-link,
.related-links a {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  color: rgb(var(--v-theme-primary));
  font-size: 0.78rem;
  font-weight: 750;
  text-decoration: none;
}

.source-link:hover,
.related-links a:hover,
.source-link:focus-visible,
.related-links a:focus-visible {
  text-decoration: underline;
}

.method-note {
  display: flex;
  gap: 28px;
  align-items: center;
  justify-content: space-between;
  padding: clamp(22px, 4vw, 36px);
}

.method-note > div {
  max-width: 74ch;
}

.source-index {
  padding: clamp(22px, 4vw, 36px);
}

.source-index__list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px 24px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.source-index__list a {
  display: grid;
  gap: 2px;
  min-height: 48px;
  padding: 9px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  color: rgb(var(--v-theme-on-surface));
  text-decoration: none;
}

.source-index__list a:hover span,
.source-index__list a:focus-visible span {
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
}

.source-index__list span {
  font-size: 0.83rem;
  font-weight: 750;
  line-height: 1.35;
}

.source-index__list small {
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.7rem;
}

@media (max-width: 900px) {
  .faq-hero {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .evidence-key {
    max-width: 680px;
  }
}

@media (max-width: 600px) {
  .money-faq-page {
    padding-inline: 16px;
  }

  .faq-title {
    font-size: clamp(2.15rem, 12vw, 3.15rem);
  }

  .scope-note__content,
  .search-workbench__heading,
  .source-index__heading {
    align-items: stretch;
    flex-direction: column;
  }

  .result-count {
    align-self: flex-start;
  }

  .faq-question {
    min-height: 90px;
  }

  .method-note {
    align-items: flex-start;
  }

  .method-note > .v-icon {
    display: none;
  }

  .source-index__list {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .faq-panels :deep(*) {
    scroll-behavior: auto;
  }
}
</style>
