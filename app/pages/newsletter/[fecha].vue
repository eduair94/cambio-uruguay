<template>
  <div v-if="issue" class="issue-page">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" md="9" lg="8">
          <div class="mb-4">
            <VBtn :to="localePath('/newsletter/archivo')" variant="text" size="small" class="px-1">
              <VIcon start size="small">mdi-arrow-left</VIcon>
              {{ $t('newsletterArchive.navTitle') }}
            </VBtn>
          </div>

          <header class="mb-5">
            <div class="d-flex align-center ga-2 mb-3 flex-wrap">
              <VChip color="primary" size="small" variant="tonal" class="font-weight-bold">
                EDICIÓN DIARIA
              </VChip>
              <time class="text-caption text-medium-emphasis" :datetime="issue.date">
                {{ formatIssueDate(issue.date) }}
              </time>
            </div>
            <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">{{ issue.title }}</h1>
            <p class="text-body-1 text-medium-emphasis issue-page__lead">{{ issue.summary }}</p>
            <ShareButtons class="mt-4" :url="canonicalUrl" :text="issue.title" />
          </header>

          <VDivider class="mb-6" />

          <NewsletterIssueDigest :currencies="issue.currencies" :news="issue.news" :ai="issue.ai" />

          <!-- The one in-article unit a `normal`-density route allows, at a real
               section break: the digest has finished and the navigation blocks
               are next, so nothing a reader is mid-way through gets interrupted.
               Renders only once NUXT_PUBLIC_ADSENSE_SLOT_IN_ARTICLE is set. -->
          <ClientOnly><AdSlot placement="in-article" class="mt-8" /></ClientOnly>

          <!-- Prev / next. Placed before the CTA so the reader who wants another
               day gets it without scrolling past a conversion block. -->
          <nav
            v-if="issue.prev || issue.next"
            class="issue-page__nav mt-8"
            aria-label="Otras ediciones"
          >
            <VRow>
              <VCol v-if="issue.prev" cols="12" sm="6">
                <VCard
                  :to="localePath(`/newsletter/${issue.prev}`)"
                  variant="tonal"
                  class="issue-page__nav-card pa-4 h-100"
                  hover
                >
                  <div class="text-caption text-medium-emphasis mb-1">
                    <VIcon size="14">mdi-arrow-left</VIcon>
                    Edición anterior
                  </div>
                  <div class="font-weight-medium">{{ formatIssueDate(issue.prev) }}</div>
                </VCard>
              </VCol>
              <VCol v-if="issue.next" cols="12" sm="6">
                <VCard
                  :to="localePath(`/newsletter/${issue.next}`)"
                  variant="tonal"
                  class="issue-page__nav-card pa-4 h-100 text-sm-right"
                  hover
                >
                  <div class="text-caption text-medium-emphasis mb-1">
                    Edición siguiente
                    <VIcon size="14">mdi-arrow-right</VIcon>
                  </div>
                  <div class="font-weight-medium">{{ formatIssueDate(issue.next) }}</div>
                </VCard>
              </VCol>
            </VRow>
          </nav>

          <!-- Conversion: the reader has just seen exactly what an issue is, so
               this is the one place on the site where the ask is already
               answered. Until now the signup form lived on /newsletter only. -->
          <VCard class="issue-page__cta my-8 pa-6" variant="flat">
            <h2 class="text-h6 font-weight-bold mb-2">
              {{ $t('newsletterArchive.subscribeTitle') }}
            </h2>
            <p class="text-body-2 text-medium-emphasis mb-4">
              {{ $t('newsletterArchive.subscribeSubtitle') }}
            </p>
            <NewsletterSignup />
          </VCard>

          <VCard variant="tonal" class="issue-page__live pa-5 text-center mb-4">
            <p class="text-body-2 mb-3">
              Esto es la foto del {{ formatIssueDate(issue.date) }}. Para el precio de ahora:
            </p>
            <VBtn :to="localePath('/')" color="primary" variant="elevated">
              <VIcon start>mdi-chart-line</VIcon>
              Ver la cotización de hoy
            </VBtn>
          </VCard>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
// One archived newsletter issue — the daily page the content engine produces.
//
// The page is a permanent record of a day's market, so everything on it is read
// from the stored issue and nothing is recomputed from today's quotes: a visitor
// arriving in six months must see the numbers that were true on that date.
import { computed } from 'vue'
import { formatIssueDate, isIssueDate, type NewsletterIssue } from '~/utils/newsletterIssue'

/** The issue as the API serves it, with its archive neighbours attached. */
type IssueResponse = NewsletterIssue & { prev: string | null; next: string | null }

const localePath = useLocalePath()
const route = useRoute()
const fecha = computed(() => String(route.params.fecha ?? ''))

definePageMeta({
  // Reject anything that is not a real calendar date before the request is
  // made, so `/newsletter/algo` 404s instead of reaching the API.
  validate: route => isIssueDate(String(route.params.fecha ?? '')),
})

const { data: issue, error } = await useAsyncData(`newsletter-issue-${fecha.value}`, () =>
  $fetch<IssueResponse>(`/api/newsletter/issues/${fecha.value}`)
)

// Force the HTTP 404 on SSR — a thrown error alone renders the error view but
// can leave a dynamic route's status at 200 (same fix as blog/[slug].vue).
if (error.value || !issue.value) {
  const event = useRequestEvent()
  if (event) setResponseStatus(event, 404)
  throw createError({ statusCode: 404, statusMessage: 'Edición no encontrada', fatal: true })
}

const canonicalUrl = computed(() => `https://cambio-uruguay.com/newsletter/${fecha.value}`)

defineOgImageComponent('Cambio', {
  title: () => issue.value?.title ?? 'Newsletter',
  subtitle: () => issue.value?.summary ?? '',
  tag: 'NEWSLETTER',
})

useSeoMeta({
  title: () => `${issue.value?.title ?? 'Edición'} | Cambio Uruguay`,
  description: () => issue.value?.summary ?? '',
  ogTitle: () => issue.value?.title ?? '',
  ogDescription: () => issue.value?.summary ?? '',
  ogType: 'article',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
  twitterTitle: () => issue.value?.title ?? '',
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
              '@type': 'NewsArticle',
              headline: issue.value?.title,
              description: issue.value?.summary,
              image: `https://cambio-uruguay.com/__og-image__/image/newsletter/${fecha.value}/og.png`,
              // `datePublished` is the calendar day the issue reports on, which
              // is what a reader searching for that date means; `createdAt` is
              // only when the archiver happened to run.
              datePublished: `${fecha.value}T12:00:00-03:00`,
              dateModified: issue.value?.createdAt,
              inLanguage: 'es-UY',
              isAccessibleForFree: true,
              mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl.value },
              author: { '@type': 'Organization', name: 'Cambio Uruguay' },
              publisher: {
                '@type': 'Organization',
                name: 'Cambio Uruguay',
                logo: { '@type': 'ImageObject', url: 'https://cambio-uruguay.com/img/logo.png' },
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
                  name: 'Newsletter',
                  item: 'https://cambio-uruguay.com/newsletter',
                },
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: 'Ediciones',
                  item: 'https://cambio-uruguay.com/newsletter/archivo',
                },
                {
                  '@type': 'ListItem',
                  position: 4,
                  name: issue.value?.title,
                  item: canonicalUrl.value,
                },
              ],
            },
          ],
        })
      ),
    },
  ],
})
</script>

<style scoped>
.issue-page__lead {
  line-height: 1.7;
  font-size: 1.05rem;
}
.issue-page__nav-card,
.issue-page__cta,
.issue-page__live {
  border-radius: 12px;
  min-width: 0;
}
.issue-page__cta {
  background: rgba(25, 118, 210, 0.1);
  border: 1px solid rgba(25, 118, 210, 0.28);
}
</style>
