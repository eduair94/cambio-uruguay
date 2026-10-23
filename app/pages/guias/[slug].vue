<template>
  <!-- Gated on `guide`: an unknown slug throws a 404 in setup, so this keeps the
       error-path SSR render empty and crash-free. -->
  <div v-if="guide" class="guide-detail-page">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" md="9" lg="8">
          <!-- Breadcrumb / back link -->
          <div class="mb-4">
            <VBtn :to="localePath('/guias')" variant="text" size="small" class="cu-btn-flush">
              <VIcon start size="small">mdi-arrow-left</VIcon>
              {{ t('guias.backToList') }}
            </VBtn>
          </div>

          <!-- Header -->
          <header class="mb-6">
            <VChip class="mb-3" color="primary" size="small" variant="tonal">
              {{ guide.tag }}
            </VChip>
            <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">{{ guide.title }}</h1>
            <p class="text-body-1 text-grey-lighten-1 guide-lead">{{ guide.description }}</p>
            <ShareButtons class="mt-4 mb-2" :url="canonicalUrl" :text="guide.title" />
            <p class="text-caption text-grey-darken-1 mt-3">
              {{ t('guias.updated', { date: updatedDisplay }) }}
              · {{ t('guias.byAuthor') }}
              <a
                class="guide-link"
                href="https://www.linkedin.com/in/eduardo-airaudo/"
                target="_blank"
                rel="noopener noreferrer"
                >Eduardo Airaudo</a
              >
            </p>
          </header>

          <VDivider class="mb-6" />

          <!-- Sections -->
          <article class="guide-article">
            <template v-for="(section, i) in guide.sections" :key="i">
              <section class="mb-6">
                <h2
                  :id="sectionIds[i]"
                  class="guide-anchor text-h5 font-weight-bold mb-3"
                  tabindex="-1"
                >
                  {{ section.heading }}
                </h2>
                <p class="text-body-1 text-grey-lighten-1 guide-prose">{{ section.body }}</p>
                <div v-if="section.table" class="table-scroll mt-3">
                  <table class="guide-table cu-mobile-cards">
                    <thead>
                      <tr>
                        <th v-for="(header, hi) in section.table.headers" :key="hi">
                          {{ header }}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, ri) in section.table.rows" :key="ri">
                        <td
                          v-for="(cell, ci) in row"
                          :key="ci"
                          :data-label="ci === 0 ? '' : section.table.headers[ci]"
                        >
                          {{ cell }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <!-- Contextual links: the tool/page this very section talks about, clickable where
                   the reader is reading about it (the body itself is plain text). -->
                <div
                  v-if="section.links?.length"
                  class="d-flex flex-wrap ga-2 mt-3"
                  data-link-area="guide_section"
                >
                  <VChip
                    v-for="link in section.links"
                    :key="link.to"
                    :to="localePath(link.to)"
                    color="primary"
                    variant="tonal"
                    size="small"
                    link
                  >
                    <VIcon start size="small">mdi-arrow-right-circle-outline</VIcon>
                    {{ link.label }}
                  </VChip>
                </div>
              </section>
              <!-- Native disclosure keeps the first answer visible and works before hydration. -->
              <details v-if="i === 0 && contents.length > 1" class="guide-contents mb-6">
                <summary>{{ readingT('guideReading.contents') }}</summary>
                <nav
                  :aria-label="readingT('guideReading.contents')"
                  data-link-area="guide_contents"
                >
                  <ul>
                    <li v-for="(item, index) in contents" :key="item.id">
                      <a :href="`#${item.id}`" @click="trackSectionJump(item.kind, index)">
                        {{ item.label }}
                      </a>
                    </li>
                  </ul>
                </nav>
              </details>
              <!-- La unidad editorial, DESPUÉS de la primera sección: la respuesta de la guía va
                   primero y el anuncio se ve antes de que el lector que ya tiene lo suyo se vaya.
                   Es una por guía (más el cierre del layout = el tope de `maxAdSlots('normal')`),
                   entre secciones y nunca adentro de una, en ClientOnly como newsletter/[fecha].vue.
                   `adsOn` es el mismo idioma de adelanto-de-efectivo y sala-vip; la guarda real
                   (id de unidad, densidad) vive en AdSlot. -->
              <ClientOnly v-if="i === 0 && adsOn">
                <AdSlot placement="in-article" class="mb-6" />
              </ClientOnly>
            </template>
          </article>

          <!-- Enlaces de afiliado: sólo en las guías que los declaran (`affiliateIds`) y sólo cuando
               hay un acuerdo configurado. El texto de arriba dice lo mismo con o sin ellos, y el
               aviso va a la vista, nunca detrás de un desplegable. -->
          <section v-if="affiliateIds.length" class="guide-affiliates mb-6">
            <h2 class="text-subtitle-1 font-weight-bold mb-2">{{ t('affiliates.title') }}</h2>
            <div class="d-flex flex-wrap ga-3">
              <AffiliateLink v-for="id in affiliateIds" :id="id" :key="id" />
            </div>
            <AffiliateDisclosure />
          </section>

          <!-- Procedural steps (also emitted as HowTo schema) -->
          <section v-if="guide.steps?.length" class="guide-steps mb-2">
            <h2 id="paso-a-paso" class="guide-anchor text-h5 font-weight-bold mb-3" tabindex="-1">
              {{ readingT('guideReading.steps') }}
            </h2>
            <ol class="guide-steps-list">
              <li v-for="(step, i) in guide.steps" :key="i" class="mb-3">
                <span class="font-weight-bold">{{ step.name }}.</span>
                <span class="text-grey-lighten-1">{{ ' ' + step.text }}</span>
              </li>
            </ol>
          </section>

          <!-- FAQ (also emitted as FAQPage schema) -->
          <section v-if="guide.faqs?.length" class="guide-faqs mb-2">
            <h2
              id="preguntas-frecuentes"
              class="guide-anchor text-h5 font-weight-bold mb-3"
              tabindex="-1"
            >
              {{ readingT('guideReading.faqs') }}
            </h2>
            <VExpansionPanels variant="accordion" class="guide-faq-panels">
              <VExpansionPanel v-for="(faq, i) in guide.faqs" :key="i">
                <VExpansionPanelTitle class="font-weight-medium">
                  {{ faq.q }}
                </VExpansionPanelTitle>
                <VExpansionPanelText>
                  <p class="text-body-1 text-grey-lighten-1 guide-prose mb-0">{{ faq.a }}</p>
                </VExpansionPanelText>
              </VExpansionPanel>
            </VExpansionPanels>
          </section>

          <!-- Sources: primary references for any legal figure stated above -->
          <VCard v-if="guide.sources?.length" variant="flat" class="guide-sources mt-8 pa-5">
            <h2
              id="fuentes"
              class="guide-anchor text-subtitle-1 font-weight-bold mb-3"
              tabindex="-1"
            >
              <VIcon start size="small" color="primary">mdi-link-variant</VIcon>
              {{ readingT('guideReading.sources') }}
            </h2>
            <ul class="guide-sources-list">
              <li v-for="(source, i) in guide.sources" :key="i">
                <a :href="source.url" target="_blank" rel="noopener noreferrer">{{
                  source.label
                }}</a>
                <span v-if="source.publisher" class="source-publisher">
                  — {{ source.publisher }}
                </span>
              </li>
            </ul>
          </VCard>

          <!-- The guide's own recommendations precede its topic directory. -->
          <nav
            class="guide-next mt-8"
            aria-labelledby="seguir-leyendo"
            data-link-area="guide_next_steps"
          >
            <h2 id="seguir-leyendo" class="guide-anchor text-h6 font-weight-bold" tabindex="-1">
              {{ readingT('guideReading.next') }}
            </h2>
            <ul v-if="nextSteps.length" class="guide-next-list">
              <li v-for="link in nextSteps" :key="link.to">
                <NuxtLink :to="localePath(link.to)">
                  <span>{{ link.label }}</span>
                  <VIcon size="18" aria-hidden="true">mdi-arrow-right</VIcon>
                </NuxtLink>
              </li>
            </ul>
            <NuxtLink v-if="hub" :to="localePath(`/temas/${hub.slug}`)" class="guide-topic-link">
              {{ readingT('guideReading.topic', { topic: hub.title }) }}
            </NuxtLink>
            <NuxtLink v-else :to="localePath('/guias')" class="guide-topic-link">
              {{ readingT('guideReading.all') }}
            </NuxtLink>
          </nav>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import { adDensityForPath } from '~/utils/ads'
import { authorReference } from '~/utils/authorEntity'
import { measurementContext, measurementPath } from '~/utils/engagementMeasurement'
import { hubOfGuide } from '~/utils/guideHubs'
import { getGuide } from '~/utils/guides'
import { guideNextSteps, guideSectionIds } from '~/utils/guideReading'
import { guideReadingMessages } from '~/utils/guideReadingMessages'

// Reject unknown slugs at the route guard so they 404 (on SSR and client nav)
// without partially rendering this component. Nuxt extracts this guard into
// shared route metadata; load the catalogue only when this route is validated.
definePageMeta({
  validate: async route => {
    const catalogue = await import('~/utils/guides')
    return catalogue.guideSlugs().includes(String(route.params.slug ?? ''))
  },
})

const { t, locale } = useI18n()
const { t: readingT } = useI18n({ useScope: 'local', messages: guideReadingMessages })
const localePath = useLocalePath()
const route = useRoute()

const slug = computed(() => String(route.params.slug ?? ''))
const guide = computed(() => getGuide(slug.value))
// The topic hub this guide belongs to, if any — the spoke → hub backlink.
const hub = computed(() => hubOfGuide(slug.value))
const adsOn = computed(() => adDensityForPath(route.path) !== 'none')
const sectionIds = computed(() => guideSectionIds(guide.value?.sections ?? []))
const nextSteps = computed(() =>
  guide.value ? guideNextSteps(guide.value, hub.value?.resources) : []
)
const contents = computed(() => {
  const current = guide.value
  if (!current) return []
  const items = current.sections.map((section, index) => ({
    id: sectionIds.value[index]!,
    label: section.heading,
    kind: 'section',
  }))
  if (current.steps?.length)
    items.push({ id: 'paso-a-paso', label: readingT('guideReading.steps'), kind: 'steps' })
  if (current.faqs?.length)
    items.push({ id: 'preguntas-frecuentes', label: readingT('guideReading.faqs'), kind: 'faqs' })
  if (current.sources?.length)
    items.push({ id: 'fuentes', label: readingT('guideReading.sources'), kind: 'sources' })
  items.push({ id: 'seguir-leyendo', label: readingT('guideReading.next'), kind: 'next_steps' })
  return items
})
const track = useTrack()
function trackSectionJump(sectionKind: string, sectionIndex: number) {
  const path = measurementPath(route)
  if (!path || !import.meta.client) return
  track('guide_section_jump', {
    ...measurementContext(path, location.origin),
    section_kind: sectionKind,
    section_index: sectionIndex,
  })
}

// Belt-and-suspenders: `validate` already 404s unknown slugs, but guard the
// setup too so the template's `v-if` never renders an undefined guide.
if (!guide.value) {
  throw createError({ statusCode: 404, statusMessage: 'Guía no encontrada' })
}

// Enlaces de afiliado: sólo los que la guía declara Y tienen una URL configurada en runtimeConfig.
// Con la config vacía (el default) la lista queda vacía y el bloque entero no se dibuja.
const { canRender } = useAffiliates()
const affiliateIds = computed(() => (guide.value?.affiliateIds ?? []).filter(id => canRender(id)))

const canonicalUrl = computed(() => `https://cambio-uruguay.com/guias/${slug.value}`)

const updatedDisplay = computed(() =>
  guide.value
    ? new Date(guide.value.updatedAt).toLocaleDateString(dateLocale(locale.value), {
        timeZone: siteTimeZone(guide.value.updatedAt),
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : ''
)

// Branded OG image: per-guide title + description.
defineOgImageComponent('Cambio', {
  title: () => guide.value?.title ?? 'Guía',
  subtitle: () => guide.value?.description ?? '',
  tag: 'GUÍA',
})

// SEO meta driven by the guide content.
useSeoMeta({
  title: () => `${guide.value?.title ?? 'Guía'} | Cambio Uruguay`,
  description: () => guide.value?.description ?? '',
  ogTitle: () => guide.value?.title ?? 'Guía',
  ogDescription: () => guide.value?.description ?? '',
  ogType: 'article',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
  twitterTitle: () => guide.value?.title ?? 'Guía',
  twitterDescription: () => guide.value?.description ?? '',
})

// Article + BreadcrumbList JSON-LD for rich results, with author Eduardo Airaudo
// and publisher Cambio Uruguay.
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
              headline: guide.value?.title,
              description: guide.value?.description,
              image: `https://cambio-uruguay.com/__og-image__/image/guias/${slug.value}/og.png`,
              datePublished: guide.value?.updatedAt,
              dateModified: guide.value?.updatedAt,
              inLanguage: 'es-UY',
              mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl.value },
              speakable: {
                '@type': 'SpeakableSpecification',
                cssSelector: ['.guide-lead', '.guide-prose'],
              },
              // Por @id: el nodo Person completo vive en /acerca (utils/authorEntity.ts).
              author: authorReference(),
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
                  name: 'Guías',
                  item: 'https://cambio-uruguay.com/guias',
                },
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: guide.value?.title,
                  item: canonicalUrl.value,
                },
              ],
            },
            // HowTo for procedural guides — feeds AI Overview step extraction.
            ...(guide.value?.steps?.length
              ? [
                  {
                    '@type': 'HowTo',
                    name: guide.value.title,
                    description: guide.value.description,
                    step: guide.value.steps.map((s, i) => ({
                      '@type': 'HowToStep',
                      position: i + 1,
                      name: s.name,
                      text: s.text,
                    })),
                  },
                ]
              : []),
            // FAQPage for guides with Q&A — feeds AI Overview / rich-result answers.
            ...(guide.value?.faqs?.length
              ? [
                  {
                    '@type': 'FAQPage',
                    mainEntity: guide.value.faqs.map(f => ({
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
.guide-lead {
  line-height: 1.7;
}

.guide-prose {
  line-height: 1.8;
}

/* FAQ question: multi-line titles were cramped (Vuetify's default title
   line-height is tight). Give them breathing room top/bottom and per-line. */
.guide-faq-panels :deep(.v-expansion-panel-title) {
  line-height: 1.5;
  padding-top: 0.85rem;
  padding-bottom: 0.85rem;
  min-height: 3.25rem;
}

.guide-steps-list {
  padding-left: 1.25rem;
  line-height: 1.7;
}
.guide-steps-list li {
  padding-left: 0.25rem;
}

.table-scroll {
  overflow-x: auto;
}
.guide-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.guide-table th,
.guide-table td {
  padding: 8px 10px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
  text-align: left;
  vertical-align: top;
}
.guide-table thead th {
  font-weight: 700;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
.guide-table tbody th:first-child,
.guide-table tbody td:first-child {
  font-weight: 600;
  white-space: nowrap;
}

.guide-link {
  color: rgb(var(--v-theme-link));
  text-decoration: none;
  font-weight: 600;
}

.guide-link:hover {
  text-decoration: underline;
}

.guide-sources {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}
.guide-sources-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85rem;
  line-height: 1.5;
}
.guide-sources-list a {
  color: rgb(var(--v-theme-link));
  text-decoration: none;
  font-weight: 600;
}
.guide-sources-list a:hover {
  text-decoration: underline;
}
.source-publisher {
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.guide-anchor {
  scroll-margin-top: 88px;
}

.guide-contents {
  padding-block: 8px;
  border-block: 1px solid rgba(var(--v-theme-on-surface), 0.16);
}

.guide-contents summary {
  padding-block: 12px;
  font-weight: 600;
  cursor: pointer;
}

.guide-contents ul,
.guide-next-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.guide-contents a,
.guide-next a {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding-block: 10px;
  color: rgb(var(--v-theme-link));
  line-height: 1.5;
  text-decoration: underline;
  text-underline-offset: 0.2em;
  overflow-wrap: anywhere;
}

.guide-contents a:focus-visible,
.guide-contents summary:focus-visible,
.guide-next a:focus-visible {
  outline: 2px solid rgb(var(--v-theme-link));
  outline-offset: 4px;
}

.guide-next {
  padding-block: 24px;
  border-block: 1px solid rgba(var(--v-theme-on-surface), 0.16);
}

.guide-next h2 {
  margin-top: 0;
  margin-bottom: 12px;
}

.guide-next-list a {
  justify-content: space-between;
  gap: 16px;
  font-weight: 600;
}

.guide-next-list .v-icon {
  flex-shrink: 0;
}

.guide-topic-link {
  margin-top: 16px;
}
</style>
