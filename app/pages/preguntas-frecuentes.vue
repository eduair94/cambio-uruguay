<template>
  <main class="faq-page">
    <VContainer class="text-center py-8">
      <h1 class="text-h4 font-weight-bold mb-3">{{ t('faq.title') }}</h1>
      <p class="text-body-1 text-grey-lighten-1 mx-auto" style="max-width: 720px">
        {{ t('faq.intro') }}
      </p>
    </VContainer>
    <FaqBlock :items="items" :emit-schema="true" :expanded="true" />
  </main>
</template>

<script setup lang="ts">
import type { FaqItem } from '~/utils/faqAnswers'

const { t, locale } = useI18n()

const { data } = await useFetch<{ generatedAt: string; items: FaqItem[] }>('/api/faq', {
  query: { lang: locale },
  default: () => ({ generatedAt: '', items: [] as FaqItem[] }),
})

const items = computed(() => data.value?.items ?? [])

const canonicalUrl = computed(
  () =>
    `https://cambio-uruguay.com${
      locale.value === 'es' ? '/preguntas-frecuentes' : `/${locale.value}/preguntas-frecuentes`
    }`
)

// Branded, copyright-free OG image (the FAQPage schema already ships via
// FaqBlock); the page previously had no social/Search preview image.
defineOgImageComponent('Cambio', {
  title: () => t('faq.title'),
  tag: 'FAQ',
  locale: locale.value as 'es' | 'en' | 'pt',
})

// Declared here rather than through `$seo.setupPageSEO()` inside a watchEffect,
// which is what this page used to do. That call re-ran on every locale (and
// fetch) change, and each run registered ANOTHER useHead entry — so switching
// language left the document with two `<link rel="canonical">` and two
// BreadcrumbList blocks, which is exactly the ambiguity a canonical exists to
// remove. Reactive getters update the same entry in place instead. It also
// dropped the `og:locale: es_ES` the plugin hardcoded onto the /en and /pt
// copies.
useSeoMeta({
  title: () => t('faq.metaTitle'),
  description: () => t('faq.metaDescription'),
  ogTitle: () => t('faq.title'),
  ogDescription: () => t('faq.metaDescription'),
  ogType: 'website',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
  twitterTitle: () => t('faq.title'),
  twitterDescription: () => t('faq.metaDescription'),
  ogImageAlt: () => t('faq.title'),
  twitterImageAlt: () => t('faq.title'),
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl.value }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Cambio Uruguay',
            item: 'https://cambio-uruguay.com',
          },
          { '@type': 'ListItem', position: 2, name: t('faq.title'), item: canonicalUrl.value },
        ],
      }),
    },
  ],
}))
</script>
