<template>
  <VContainer class="aduana-faq-page py-6 py-md-10">
    <nav class="mb-4" aria-label="Migas de pan">
      <VBtn :to="localePath('/franquicia-aduana-uruguay')" variant="text" size="small" class="px-1">
        <VIcon start size="small">mdi-arrow-left</VIcon>
        Franquicia y aduana
      </VBtn>
    </nav>

    <header class="faq-hero mb-8">
      <div class="faq-hero__copy">
        <p class="faq-kicker mb-2">Aduana · importaciones · Uruguay</p>
        <h1 class="faq-title mb-4">Preguntas frecuentes de aduana e importaciones</h1>
        <p class="faq-lede text-medium-emphasis mb-4">
          Las dudas que se repiten en r/uruguay, agrupadas por intención y respondidas con normas y
          procedimientos oficiales. Reddit nos dice <em>qué falta explicar</em>; nunca se usa como
          fuente legal.
        </p>
        <div class="d-flex flex-wrap align-center ga-3">
          <VChip color="primary" variant="tonal" prepend-icon="mdi-comment-question-outline">
            {{ ADUANA_FAQS.length }} respuestas
          </VChip>
          <span class="text-body-2 text-medium-emphasis">
            Fuentes revisadas el {{ lastReviewedLabel }}
            <template v-if="hasPartialUpdate">
              · última actualización el {{ lastModifiedLabel }}
            </template>
          </span>
        </div>
      </div>

      <aside class="reading-key" aria-labelledby="reading-key-title">
        <h2 id="reading-key-title" class="text-subtitle-1 font-weight-bold mb-3">
          Cómo marcamos la certeza
        </h2>
        <dl class="reading-key__list">
          <div>
            <dt><span class="evidence-dot evidence-dot--norma" /> Norma verificada</dt>
            <dd>La respuesta sale de una ley, decreto o resolución citada.</dd>
          </div>
          <div>
            <dt><span class="evidence-dot evidence-dot--procedimiento" /> Procedimiento oficial</dt>
            <dd>Es la forma de operar publicada por el organismo.</dd>
          </div>
          <div>
            <dt><span class="evidence-dot evidence-dot--zona" /> Zona gris</dt>
            <dd>La fuente no fija un número o existe una contradicción que mostramos.</dd>
          </div>
        </dl>
      </aside>
    </header>

    <VAlert type="info" variant="tonal" density="comfortable" class="mb-6">
      <strong>Actualización importante:</strong> Aduanas ya
      <a
        href="https://www.aduanas.gub.uy/innovaportal/v/28221/1/innova.front/"
        target="_blank"
        rel="noopener noreferrer"
      >
        publica las empresas extranjeras registradas</a
      >. Además, algunos envíos retenidos por courier pueden usar un despacho simplificado
      gestionado por el propio operador; no es un formulario directo para el comprador.
    </VAlert>

    <section class="search-workbench mb-8" aria-labelledby="buscar-duda">
      <div class="search-workbench__top">
        <div>
          <h2 id="buscar-duda" class="text-h6 font-weight-bold mb-1">Buscá tu caso</h2>
          <p class="text-body-2 text-medium-emphasis mb-0">
            Probá producto, plataforma, monto o síntoma: “semillas”, “tarjeta”, “retenido”, “DHL”.
          </p>
        </div>
        <span class="result-count" aria-live="polite">
          {{ filteredFaqs.length }} {{ filteredFaqs.length === 1 ? 'resultado' : 'resultados' }}
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
          v-for="category in ADUANA_FAQ_CATEGORIES"
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
          :id="`tema-${group.id}`"
          :key="group.id"
          class="faq-group mb-10"
          :aria-labelledby="`titulo-${group.id}`"
        >
          <div class="faq-group__heading mb-4">
            <div>
              <h2 :id="`titulo-${group.id}`" class="text-h5 font-weight-bold mb-1">
                <VIcon start color="primary" size="small">{{ group.icon }}</VIcon>
                {{ group.label }}
              </h2>
              <p class="text-body-2 text-medium-emphasis mb-0">{{ group.description }}</p>
            </div>
            <span class="text-caption text-medium-emphasis"
              >{{ group.items.length }} preguntas</span
            >
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
                      {{ basisLabel[faq.basis] }}
                    </span>
                  </div>
                  <p class="text-body-2 text-medium-emphasis mt-1 mb-0">
                    {{ faq.shortAnswer }}
                  </p>
                </div>
              </VExpansionPanelTitle>

              <VExpansionPanelText>
                <div class="faq-answer">
                  <p>{{ faq.answer }}</p>

                  <div class="faq-answer__actions">
                    <NuxtLink
                      v-if="faq.related"
                      :to="localePath(faq.related.to)"
                      class="related-link"
                    >
                      <VIcon size="16">mdi-arrow-right-circle-outline</VIcon>
                      {{ faq.related.label }}
                    </NuxtLink>

                    <div class="source-links" aria-label="Fuentes de esta respuesta">
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
                  </div>
                </div>
              </VExpansionPanelText>
            </VExpansionPanel>
          </VExpansionPanels>
        </section>
      </template>

      <VAlert v-else type="info" variant="tonal" class="my-10">
        No encontramos una pregunta con esos términos. Probá una palabra más general o
        <VBtn variant="text" size="small" class="ml-1" @click="clearFilters">
          limpiar filtros
        </VBtn>
        .
      </VAlert>

      <section class="source-index mt-12" aria-labelledby="fuentes-title">
        <div class="source-index__heading">
          <div>
            <h2 id="fuentes-title" class="text-h5 font-weight-bold mb-1">
              Fuentes oficiales y de primera parte
            </h2>
            <p class="text-body-2 text-medium-emphasis mb-0">
              Las normas y organismos sostienen las reglas; Correo y las plataformas solo respaldan
              sus propios procedimientos o condiciones.
            </p>
          </div>
          <VIcon size="30" color="primary">mdi-bookshelf</VIcon>
        </div>

        <ul class="source-index__list mt-5">
          <li v-for="source in sourceIndex" :key="source.url">
            <a :href="source.url" target="_blank" rel="noopener noreferrer">
              <span>{{ source.label }}</span>
              <small>{{ source.authority }}</small>
            </a>
          </li>
        </ul>
      </section>

      <VAlert type="warning" variant="tonal" density="comfortable" class="mt-8">
        Información general, no asesoramiento aduanero. Las listas de productos son orientativas y
        no taxativas; para mercadería cara, regulada o destinada a un negocio, pedí confirmación
        escrita al organismo competente antes de comprar.
      </VAlert>
    </main>
  </VContainer>
</template>

<script setup lang="ts">
import {
  ADUANA_FAQ_CATEGORIES,
  ADUANA_FAQ_LAST_REVIEWED,
  ADUANA_FAQ_SOURCES,
  ADUANA_FAQS,
  aduanaFaqGroups,
  aduanaFaqHaystack,
  aduanaFaqLastModified,
  aduanaFaqSources,
  normalizeAduanaFaqText,
  type AduanaFaq,
  type AduanaFaqBasis,
  type AduanaFaqCategoryId,
} from '~/utils/aduanaFaq'

const localePath = useLocalePath()

const query = ref('')
const activeCategory = ref<'all' | AduanaFaqCategoryId>('all')

function clearFilters() {
  query.value = ''
  activeCategory.value = 'all'
}

const normalizedQuery = computed(() => normalizeAduanaFaqText(query.value.trim()))
const filteredFaqs = computed(() =>
  ADUANA_FAQS.filter(faq => {
    const categoryMatches = activeCategory.value === 'all' || faq.category === activeCategory.value
    const queryMatches =
      !normalizedQuery.value || aduanaFaqHaystack(faq).includes(normalizedQuery.value)
    return categoryMatches && queryMatches
  })
)
const groups = computed(() => aduanaFaqGroups(filteredFaqs.value))
const sourceIndex = Object.values(ADUANA_FAQ_SOURCES).sort((a, b) =>
  a.authority.localeCompare(b.authority, 'es')
)

const basisLabel: Record<AduanaFaqBasis, string> = {
  norma: 'Norma verificada',
  procedimiento: 'Procedimiento oficial',
  'zona-gris': 'Zona gris',
}

function sourcesFor(faq: AduanaFaq) {
  return aduanaFaqSources(faq)
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

// Two different facts, and the page needs both. ADUANA_FAQ_LAST_REVIEWED is the last time the WHOLE
// catalogue was re-read; `lastModified` is the last time anything in it changed, which a partial
// pass moves forward on its own. Publishing only the first told Google (and the reader) that nothing
// had changed since 2026-07-26 while two answers had been rewritten later.
const lastReviewedLabel = formatDate(ADUANA_FAQ_LAST_REVIEWED)
const lastModified = aduanaFaqLastModified()
const lastModifiedLabel = formatDate(lastModified)
const hasPartialUpdate = lastModified !== ADUANA_FAQ_LAST_REVIEWED
const canonicalUrl = 'https://cambio-uruguay.com/preguntas-frecuentes-aduana-uruguay'
const title = 'Preguntas frecuentes de aduana e importaciones en Uruguay'
const description = `${ADUANA_FAQS.length} respuestas verificadas sobre franquicia, IVA, courier, Correo, paquetes retenidos, productos, equipaje y DUA en Uruguay, con fuentes oficiales.`

defineOgImageComponent('Cambio', {
  title: 'Aduana e importaciones: preguntas frecuentes',
  subtitle: 'Respuestas verificadas con la norma y el trámite oficial al lado',
  tag: 'ADUANA',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [
    {
      name: 'keywords',
      content:
        'preguntas aduana uruguay, faq franquicia uruguay, importar uruguay, paquete retenido aduana, courier uruguay impuestos, productos prohibidos aduana, franquicia 800, aduana reddit uruguay',
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
                name: 'Preguntas frecuentes de aduana',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            dateModified: lastModified,
            mainEntity: ADUANA_FAQS.map(faq => ({
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
.aduana-faq-page {
  max-width: 1120px;
}

.faq-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.65fr);
  gap: clamp(28px, 5vw, 64px);
  align-items: end;
}

.faq-kicker {
  color: rgb(var(--v-theme-primary));
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.faq-title {
  max-width: 18ch;
  font-size: clamp(2.25rem, 5vw, 4.25rem);
  font-weight: 850;
  line-height: 1.02;
  letter-spacing: -0.035em;
  text-wrap: balance;
}

.faq-lede {
  max-width: 68ch;
  font-size: 1.05rem;
  line-height: 1.7;
}

.reading-key {
  padding: 22px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}

.reading-key__list {
  display: grid;
  gap: 14px;
  margin: 0;
}

.reading-key__list div {
  display: grid;
  gap: 3px;
}

.reading-key dt {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 0.86rem;
  font-weight: 800;
}

.reading-key dd {
  margin: 0 0 0 18px;
  color: rgba(var(--v-theme-on-surface), 0.72);
  font-size: 0.78rem;
  line-height: 1.45;
}

.evidence-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.evidence-dot--norma {
  background: rgb(var(--v-theme-success));
}

.evidence-dot--procedimiento {
  background: rgb(var(--v-theme-info));
}

.evidence-dot--zona {
  background: rgb(var(--v-theme-warning));
}

.search-workbench {
  padding: 24px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 16px;
  background:
    linear-gradient(135deg, rgba(var(--v-theme-primary), 0.08), transparent 44%),
    rgb(var(--v-theme-surface));
  box-shadow: 10px 16px 34px rgba(0, 0, 0, 0.12);
}

.search-workbench__top,
.faq-group__heading,
.source-index__heading {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  justify-content: space-between;
}

.result-count {
  flex: 0 0 auto;
  padding-top: 3px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.82rem;
  font-weight: 800;
}

.category-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.faq-group {
  scroll-margin-top: 90px;
}

.faq-question {
  min-height: 76px;
}

.faq-question__content {
  min-width: 0;
  padding-block: 5px;
  line-height: 1.4;
}

.evidence-label {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.015em;
}

.evidence-label--norma {
  color: rgb(var(--v-theme-success));
  background: rgba(var(--v-theme-success), 0.12);
}

.evidence-label--procedimiento {
  color: rgb(var(--v-theme-info));
  background: rgba(var(--v-theme-info), 0.12);
}

.evidence-label--zona-gris {
  color: rgb(var(--v-theme-warning));
  background: rgba(var(--v-theme-warning), 0.14);
}

.faq-answer {
  max-width: 74ch;
  color: rgba(var(--v-theme-on-surface), 0.88);
  font-size: 0.94rem;
  line-height: 1.7;
}

.faq-answer p {
  margin-bottom: 14px;
}

.faq-answer__actions {
  display: grid;
  gap: 12px;
  padding-top: 2px;
}

.related-link,
.source-link {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  width: fit-content;
  font-weight: 750;
  text-decoration: none;
}

.related-link {
  color: rgb(var(--v-theme-link));
  font-size: 0.86rem;
}

.source-links {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.source-link {
  padding: 4px 8px;
  color: rgba(var(--v-theme-on-surface), 0.76);
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  font-size: 0.75rem;
}

.related-link:hover,
.source-link:hover {
  text-decoration: underline;
}

.related-link:focus-visible,
.source-link:focus-visible {
  outline: 3px solid rgba(var(--v-theme-primary), 0.38);
  outline-offset: 3px;
}

.source-index {
  padding-top: 32px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.source-index__list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 28px;
  padding: 0;
  list-style: none;
}

.source-index__list li {
  border-bottom: 1px solid rgba(var(--v-border-color), 0.14);
}

.source-index__list a {
  display: grid;
  gap: 3px;
  padding: 13px 2px;
  color: rgb(var(--v-theme-on-surface));
  text-decoration: none;
}

.source-index__list a:hover span {
  color: rgb(var(--v-theme-link));
  text-decoration: underline;
}

.source-index__list small {
  color: rgba(var(--v-theme-on-surface), 0.65);
}

@media (max-width: 860px) {
  .faq-hero {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .faq-title {
    max-width: 20ch;
  }
}

@media (max-width: 600px) {
  .aduana-faq-page {
    padding-inline: 16px;
  }

  .faq-title {
    font-size: clamp(2rem, 11vw, 3rem);
  }

  .search-workbench {
    padding: 18px;
  }

  .search-workbench__top,
  .faq-group__heading,
  .source-index__heading {
    display: grid;
    gap: 8px;
  }

  .category-filter {
    flex-wrap: nowrap;
    padding-bottom: 4px;
    overflow-x: auto;
    scrollbar-width: thin;
  }

  .category-filter .v-btn {
    flex: 0 0 auto;
  }

  .source-index__list {
    grid-template-columns: 1fr;
  }
}
</style>
