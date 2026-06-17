<template>
  <div class="guides-page">
    <VContainer>
      <!-- Header -->
      <header class="text-center py-8 py-md-12">
        <VChip class="mb-4" color="primary" size="small" variant="tonal">
          <VIcon start size="small">mdi-book-open-variant</VIcon>
          {{ t('guias.tag') }}
        </VChip>
        <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">{{ t('guias.h1') }}</h1>
        <p class="text-body-1 text-grey-lighten-1 mx-auto guides-intro">{{ t('guias.intro') }}</p>
      </header>

      <!-- Guides grid -->
      <VRow data-testid="guides-list">
        <VCol v-for="guide in guides" :key="guide.slug" cols="12" sm="6" md="6">
          <VCard
            class="guide-card h-100 d-flex flex-column"
            :to="localePath(`/guias/${guide.slug}`)"
            elevation="3"
            hover
            data-testid="guide-card"
          >
            <div class="pa-5 d-flex flex-column flex-grow-1">
              <div class="d-flex align-center justify-space-between mb-3">
                <VChip size="x-small" color="primary" variant="tonal" class="font-weight-bold">
                  {{ guide.tag }}
                </VChip>
                <span class="text-caption text-grey-lighten-1">
                  {{ t('guias.updated', { date: formatDate(guide.updatedAt) }) }}
                </span>
              </div>
              <h2 class="text-h6 font-weight-bold mb-2 guide-title">{{ guide.title }}</h2>
              <p class="text-body-2 text-grey-lighten-1 mb-4 guide-desc">{{ guide.description }}</p>
              <div class="mt-auto">
                <span class="text-caption text-primary font-weight-medium">
                  {{ t('guias.readGuide') }}
                  <VIcon size="14">mdi-arrow-right</VIcon>
                </span>
              </div>
            </div>
          </VCard>
        </VCol>
      </VRow>

      <!-- CTA back to comparator -->
      <VCard class="cta-guides my-8 pa-6 text-center" variant="flat">
        <h2 class="text-h6 font-weight-bold mb-2 text-white">{{ t('guias.ctaTitle') }}</h2>
        <p class="text-body-2 text-grey-lighten-1 mb-4">{{ t('guias.ctaText') }}</p>
        <VBtn :to="localePath('/')" color="primary" variant="elevated">
          <VIcon start>mdi-chart-line</VIcon>
          {{ t('guias.ctaButton') }}
        </VBtn>
      </VCard>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import { guides } from '~/utils/guides'

const { t, locale } = useI18n()
const localePath = useLocalePath()

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(locale.value, { year: 'numeric', month: 'long', day: 'numeric' })

const canonicalUrl = 'https://cambio-uruguay.com/guias'

// Branded OG image for the guides hub.
defineOgImageComponent('Cambio', {
  title: 'Guías sobre el dólar en Uruguay',
  subtitle: 'Cómo comprar, comparar y cambiar divisas',
  tag: 'GUÍAS',
})

// SEO meta.
useSeoMeta({
  title: () => t('guias.metaTitle'),
  description: () => t('guias.metaDescription'),
  ogTitle: () => t('guias.metaTitle'),
  ogDescription: () => t('guias.metaDescription'),
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: () => t('guias.metaTitle'),
  twitterDescription: () => t('guias.metaDescription'),
})

// ItemList JSON-LD of the guides for rich results.
useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Guías de Cambio Uruguay',
        itemListElement: guides.map((g, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `https://cambio-uruguay.com/guias/${g.slug}`,
          name: g.title,
        })),
      }),
    },
  ],
})
</script>

<style scoped>
.guides-intro {
  max-width: 720px;
  line-height: 1.7;
}

.guide-card {
  text-decoration: none;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.guide-card:hover {
  transform: translateY(-3px);
}

.guide-title {
  line-height: 1.4;
}

.guide-desc {
  line-height: 1.6;
}

/* Readable CTA on dark theme (avoid Vuetify outlined color tinting the text) */
.cta-guides {
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.28);
  border-radius: 12px;
}
</style>
