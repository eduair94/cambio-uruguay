<template>
  <!-- Gated on `guide`: an unknown slug throws a 404 in setup, so this keeps the
       error-path SSR render empty and crash-free. -->
  <div v-if="guide" class="guide-detail-page">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" md="9" lg="8">
          <!-- Breadcrumb / back link -->
          <div class="mb-4">
            <VBtn :to="localePath('/guias')" variant="text" size="small" class="px-1">
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
            <section v-for="(section, i) in guide.sections" :key="i" class="mb-6">
              <h2 class="text-h5 font-weight-bold mb-3">{{ section.heading }}</h2>
              <p class="text-body-1 text-grey-lighten-1 guide-prose">{{ section.body }}</p>
            </section>
          </article>

          <!-- Procedural steps (also emitted as HowTo schema) -->
          <section v-if="guide.steps?.length" class="guide-steps mb-2">
            <h2 class="text-h5 font-weight-bold mb-3">Paso a paso</h2>
            <ol class="guide-steps-list">
              <li v-for="(step, i) in guide.steps" :key="i" class="mb-3">
                <span class="font-weight-bold">{{ step.name }}.</span>
                <span class="text-grey-lighten-1">{{ ' ' + step.text }}</span>
              </li>
            </ol>
          </section>

          <!-- FAQ (also emitted as FAQPage schema) -->
          <section v-if="guide.faqs?.length" class="guide-faqs mb-2">
            <h2 class="text-h5 font-weight-bold mb-3">Preguntas frecuentes</h2>
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

          <!-- CTA to the comparator -->
          <VCard class="cta-guide my-8 pa-6 text-center" variant="flat">
            <h2 class="text-h6 font-weight-bold mb-2 text-white">{{ t('guias.ctaTitle') }}</h2>
            <p class="text-body-2 text-grey-lighten-1 mb-4">{{ t('guias.ctaText') }}</p>
            <VBtn :to="localePath('/')" color="primary" variant="elevated">
              <VIcon start>mdi-chart-line</VIcon>
              {{ t('guias.ctaButton') }}
            </VBtn>
          </VCard>

          <!-- Internal links: related pages -->
          <VCard variant="flat" class="related-links pa-5">
            <h2 class="text-subtitle-1 font-weight-bold mb-3">{{ t('guias.relatedTitle') }}</h2>
            <div class="d-flex flex-wrap ga-2">
              <VChip
                v-if="hub"
                :to="localePath(`/temas/${hub.slug}`)"
                color="primary"
                variant="flat"
                size="small"
                link
              >
                <VIcon start size="small">{{ hub.icon }}</VIcon>
                Tema: {{ hub.title }}
              </VChip>
              <VChip :to="localePath('/')" color="primary" variant="tonal" size="small" link>
                <VIcon start size="small">mdi-home</VIcon>
                {{ t('guias.linkHome') }}
              </VChip>
              <VChip
                :to="localePath('/comparar')"
                color="primary"
                variant="tonal"
                size="small"
                link
              >
                <VIcon start size="small">mdi-chart-multiple</VIcon>
                {{ t('guias.linkComparar') }}
              </VChip>
              <VChip
                :to="localePath('/dolar/montevideo')"
                color="primary"
                variant="tonal"
                size="small"
                link
              >
                <VIcon start size="small">mdi-map-marker</VIcon>
                {{ t('guias.linkMontevideo') }}
              </VChip>
              <VChip
                v-for="link in guide.related ?? []"
                :key="link.to"
                :to="localePath(link.to)"
                color="primary"
                variant="tonal"
                size="small"
                link
              >
                <VIcon start size="small">mdi-link-variant</VIcon>
                {{ link.label }}
              </VChip>
            </div>
          </VCard>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import { hubOfGuide } from '~/utils/guideHubs'
import { getGuide, guideSlugs } from '~/utils/guides'

// Reject unknown slugs at the route guard so they 404 (on SSR and client nav)
// without partially rendering this component. The guide catalogue is static and
// framework-agnostic, so the validator can read it directly. NOTE: `validate`
// is extracted at build time, so editing this list needs a dev-server restart.
definePageMeta({
  validate: route => guideSlugs().includes(String(route.params.slug ?? '')),
})

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

const slug = computed(() => String(route.params.slug ?? ''))
const guide = computed(() => getGuide(slug.value))
// The topic hub this guide belongs to, if any — the spoke → hub backlink.
const hub = computed(() => hubOfGuide(slug.value))

// Belt-and-suspenders: `validate` already 404s unknown slugs, but guard the
// setup too so the template's `v-if` never renders an undefined guide.
if (!guide.value) {
  throw createError({ statusCode: 404, statusMessage: 'Guía no encontrada' })
}

const canonicalUrl = computed(() => `https://cambio-uruguay.com/guias/${slug.value}`)

const updatedDisplay = computed(() =>
  guide.value
    ? new Date(guide.value.updatedAt).toLocaleDateString(locale.value, {
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

.guide-link {
  color: rgb(var(--v-theme-link));
  text-decoration: none;
  font-weight: 600;
}

.guide-link:hover {
  text-decoration: underline;
}

/* Readable CTA on dark theme (avoid Vuetify outlined color tinting the text) */
.cta-guide {
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.28);
  border-radius: 12px;
}

.related-links {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}
</style>
