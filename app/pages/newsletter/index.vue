<template>
  <VContainer class="py-8">
    <VRow justify="center">
      <VCol cols="12" md="7" lg="6">
        <VAlert
          v-if="banner"
          :type="banner.type"
          variant="tonal"
          class="mb-6"
          data-testid="newsletter-banner"
        >
          <div class="font-weight-bold">{{ banner.title }}</div>
          <div>{{ banner.msg }}</div>
        </VAlert>

        <VCard elevation="6" class="overflow-hidden">
          <div class="bg-gradient-news pa-5 text-white on-dark">
            <div class="d-flex align-center ga-3">
              <VIcon size="36">mdi-email-newsletter</VIcon>
              <div>
                <h1 class="text-h5 font-weight-bold mb-1">{{ $t('newsletter.title') }}</h1>
                <p class="text-body-2 mb-0 text-grey-lighten-3">{{ $t('newsletter.subtitle') }}</p>
              </div>
            </div>
          </div>
          <VCardText class="pa-6">
            <NewsletterSignup />
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- Archive teaser.
         Doubles as the proof of what a subscriber actually receives (the signup
         form alone asked for an address in exchange for a description) and as
         the crawl path to the archive: each day's issue is a new page, and this
         is where a crawler that only ever sees /newsletter finds them. -->
    <VRow v-if="issues.length" justify="center" class="mt-8">
      <VCol cols="12" md="10" lg="9">
        <div class="d-flex align-end justify-space-between flex-wrap ga-3 mb-4">
          <div>
            <h2 class="text-h6 font-weight-bold mb-1">{{ $t('newsletterArchive.recentTitle') }}</h2>
            <p class="text-body-2 text-medium-emphasis mb-0">
              {{ $t('newsletterArchive.recentSubtitle') }}
            </p>
          </div>
          <VBtn
            :to="localePath('/newsletter/archivo')"
            variant="text"
            color="primary"
            size="small"
            class="flex-shrink-0"
          >
            {{ $t('newsletterArchive.seeAll') }}
            <VIcon end size="small">mdi-arrow-right</VIcon>
          </VBtn>
        </div>

        <VRow>
          <VCol v-for="issue in issues" :key="issue.date" cols="12" sm="6" md="4">
            <NewsletterIssueCard :issue="issue" />
          </VCol>
        </VRow>
      </VCol>
    </VRow>
  </VContainer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useSeoMeta } from '#imports'
import type { NewsletterIssueSummary } from '~/utils/newsletterIssue'

const { t, locale } = useI18n()
const route = useRoute()
const localePath = useLocalePath()

// Latest issues for the teaser. Non-blocking by design: the signup form is the
// page's job, and a cold archive (or a storage hiccup) must never keep it from
// rendering — an empty list just hides the section.
const { data: archive } = await useAsyncData('newsletter-archive-teaser', () =>
  $fetch<{ issues: NewsletterIssueSummary[] }>('/api/newsletter/issues', {
    query: { limit: 3 },
  }).catch(() => ({ issues: [] as NewsletterIssueSummary[] }))
)
const issues = computed(() => archive.value?.issues ?? [])

const banner = computed(() => {
  const state = route.query.state
  if (state === 'confirmed')
    return {
      type: 'success' as const,
      title: t('newsletter.confirmedTitle'),
      msg: t('newsletter.confirmedMsg'),
    }
  if (state === 'unsubscribed')
    return {
      type: 'info' as const,
      title: t('newsletter.unsubscribedTitle'),
      msg: t('newsletter.unsubscribedMsg'),
    }
  if (state === 'invalid')
    return {
      type: 'warning' as const,
      title: t('newsletter.invalidTitle'),
      msg: t('newsletter.invalidMsg'),
    }
  return null
})

useSeoMeta({
  title: () => t('newsletter.metaTitle'),
  description: () => t('newsletter.metaDescription'),
  ogTitle: () => t('newsletter.metaTitle'),
  ogDescription: () => t('newsletter.metaDescription'),
})

defineOgImageComponent('Cambio', {
  title: () => t('newsletter.title'),
  subtitle: () => t('newsletter.subtitle'),
  tag: 'NEWSLETTER',
  locale: locale.value as 'es' | 'en' | 'pt',
})
</script>

<style scoped>
.bg-gradient-news {
  background: linear-gradient(135deg, #16c784 0%, #2f81f7 100%);
}
</style>
