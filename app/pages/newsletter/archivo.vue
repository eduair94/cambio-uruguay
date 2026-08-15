<template>
  <VContainer class="archive-page">
    <header class="text-center pt-2 pb-6 py-md-10">
      <VChip class="mb-4" color="primary" size="small" variant="tonal">
        <VIcon start size="small">mdi-archive-outline</VIcon>
        ARCHIVO
      </VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        {{ $t('newsletterArchive.title') }}
      </h1>
      <p class="text-body-1 text-medium-emphasis mx-auto archive-page__intro">
        {{ $t('newsletterArchive.subtitle') }}
      </p>
    </header>

    <VRow v-if="issues.length" data-testid="newsletter-archive-list">
      <VCol v-for="issue in issues" :key="issue.date" cols="12" sm="6" md="4">
        <NewsletterIssueCard :issue="issue" />
      </VCol>
    </VRow>

    <VAlert v-else type="info" variant="tonal" class="mx-auto archive-page__empty">
      {{ $t('newsletterArchive.empty') }}
    </VAlert>

    <div v-if="hasMore" class="text-center mt-8">
      <VBtn
        :to="localePath(`/newsletter/archivo?p=${page + 1}`)"
        variant="outlined"
        color="primary"
      >
        {{ $t('newsletterArchive.older') }}
        <VIcon end size="small">mdi-arrow-right</VIcon>
      </VBtn>
    </div>
    <div v-if="page > 1" class="text-center mt-3">
      <VBtn
        :to="localePath(page === 2 ? '/newsletter/archivo' : `/newsletter/archivo?p=${page - 1}`)"
        variant="text"
        color="primary"
        size="small"
      >
        <VIcon start size="small">mdi-arrow-left</VIcon>
        {{ $t('newsletterArchive.newer') }}
      </VBtn>
    </div>

    <VCard variant="tonal" class="archive-page__cta pa-6 mt-10 text-center mx-auto">
      <h2 class="text-h6 font-weight-bold mb-2">{{ $t('newsletterArchive.ctaTitle') }}</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        {{ $t('newsletterArchive.ctaSubtitle') }}
      </p>
      <VBtn :to="localePath('/newsletter')" color="primary" variant="elevated">
        <VIcon start>mdi-email-newsletter</VIcon>
        {{ $t('newsletterArchive.ctaButton') }}
      </VBtn>
    </VCard>
  </VContainer>
</template>

<script setup lang="ts">
// The newsletter archive hub: every daily issue, newest first.
//
// Paginated through `?p=`, not an infinite scroll — a crawler has to be able to
// reach issue 400 by following links, and each page keeps a bounded number of
// cards so the hub itself never becomes a 400-link doorway.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { NewsletterIssueSummary } from '~/utils/newsletterIssue'

const PER_PAGE = 30

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

const page = computed(() => Math.max(1, Number(route.query.p) || 1))

const { data } = await useAsyncData(
  () => `newsletter-archive-${page.value}`,
  () =>
    $fetch<{ issues: NewsletterIssueSummary[]; total: number }>('/api/newsletter/issues', {
      query: { limit: PER_PAGE, offset: (page.value - 1) * PER_PAGE },
    }).catch(() => ({ issues: [] as NewsletterIssueSummary[], total: 0 })),
  { watch: [page] }
)

const issues = computed(() => data.value?.issues ?? [])
const total = computed(() => data.value?.total ?? 0)
const hasMore = computed(() => page.value * PER_PAGE < total.value)

const canonicalUrl = computed(() =>
  page.value > 1
    ? `https://cambio-uruguay.com/newsletter/archivo?p=${page.value}`
    : 'https://cambio-uruguay.com/newsletter/archivo'
)

defineOgImageComponent('Cambio', {
  title: () => t('newsletterArchive.title'),
  subtitle: () => t('newsletterArchive.subtitle'),
  tag: 'ARCHIVO',
  locale: locale.value as 'es' | 'en' | 'pt',
})

useSeoMeta({
  title: () =>
    page.value > 1
      ? `${t('newsletterArchive.metaTitle')} — página ${page.value}`
      : t('newsletterArchive.metaTitle'),
  description: () => t('newsletterArchive.metaDescription'),
  ogTitle: () => t('newsletterArchive.title'),
  ogDescription: () => t('newsletterArchive.metaDescription'),
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [
    // Page 2+ carries no unique content of its own — the issues it lists each
    // have their own indexable page, and letting the pager into the index adds
    // near-identical hub copies competing with page 1. Still followed, so the
    // crawl path to the older issues stays open.
    ...(page.value > 1 ? [{ name: 'robots', content: 'noindex, follow' }] : []),
  ],
})
</script>

<style scoped>
.archive-page__intro {
  max-width: 60ch;
  line-height: 1.7;
}
.archive-page__empty,
.archive-page__cta {
  max-width: 640px;
  border-radius: 12px;
}
</style>
