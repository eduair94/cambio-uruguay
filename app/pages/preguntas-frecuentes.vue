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
const { $seo } = useNuxtApp()

const { data } = await useFetch<{ generatedAt: string; items: FaqItem[] }>('/api/faq', {
  query: { lang: locale },
  default: () => ({ generatedAt: '', items: [] as FaqItem[] }),
})

const items = computed(() => data.value?.items ?? [])

const canonicalPath = computed(() =>
  locale.value === 'es' ? '/preguntas-frecuentes' : `/${locale.value}/preguntas-frecuentes`
)

watchEffect(() => {
  $seo.setupPageSEO({
    title: t('faq.metaTitle'),
    description: t('faq.metaDescription'),
    canonicalUrl: $seo.generateCanonicalUrl(canonicalPath.value),
    breadcrumbs: [
      { name: 'Cambio Uruguay', url: 'https://cambio-uruguay.com' },
      { name: t('faq.title'), url: $seo.generateCanonicalUrl(canonicalPath.value) },
    ],
  })
})

// Branded, copyright-free OG image (the FAQPage schema already ships via
// FaqBlock); the page previously had no social/Search preview image.
defineOgImageComponent('Cambio', {
  title: () => t('faq.title'),
  tag: 'FAQ',
  locale: locale.value as 'es' | 'en' | 'pt',
})
useSeoMeta({
  ogImageAlt: () => t('faq.title'),
  twitterImageAlt: () => t('faq.title'),
})
</script>
