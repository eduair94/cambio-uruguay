<template>
  <div class="news-page">
    <VContainer>
      <!-- Header -->
      <header class="text-center py-8 py-md-12">
        <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">{{ t('noticias.title') }}</h1>
        <p class="text-body-1 text-grey-lighten-1 mx-auto news-intro">{{ t('noticias.intro') }}</p>
        <VChip class="mt-4" color="success" size="small" variant="tonal">
          <VIcon start size="small">mdi-autorenew</VIcon>
          {{ t('noticias.updatedAuto') }}
        </VChip>
      </header>

      <!-- News grid -->
      <VRow v-if="news && news.length">
        <VCol v-for="item in news" :key="item.link" cols="12" sm="6" md="4">
          <VCard
            class="news-card h-100 d-flex flex-column"
            :href="item.link"
            target="_blank"
            rel="noopener nofollow"
            elevation="3"
            hover
          >
            <div class="pa-4 d-flex flex-column flex-grow-1">
              <div class="d-flex align-center justify-space-between mb-3">
                <VChip size="x-small" color="primary" variant="tonal" class="font-weight-medium">
                  {{ item.source }}
                </VChip>
                <span class="text-caption text-grey-lighten-1">{{
                  relativeDate(item.pubDate)
                }}</span>
              </div>
              <h2 class="text-body-1 font-weight-bold mb-2 news-title">{{ item.title }}</h2>
              <div class="mt-auto pt-2">
                <span class="text-caption text-primary font-weight-medium">
                  {{ t('noticias.readMore') }}
                  <VIcon size="14">mdi-open-in-new</VIcon>
                </span>
              </div>
            </div>
          </VCard>
        </VCol>
      </VRow>

      <!-- Empty / error state -->
      <VAlert v-else type="info" variant="tonal" class="my-8">
        {{ t('noticias.empty') }}
      </VAlert>

      <p class="text-caption text-grey-darken-1 text-center mt-6">{{ t('noticias.disclaimer') }}</p>

      <!-- CTA back to comparator (internal link for SEO + conversion) -->
      <VCard
        class="cta-news my-8 pa-6 text-center"
        color="rgba(33,150,243,0.08)"
        variant="outlined"
      >
        <h2 class="text-h6 font-weight-bold mb-2">{{ t('noticias.ctaTitle') }}</h2>
        <p class="text-body-2 text-grey-lighten-1 mb-4">{{ t('noticias.ctaText') }}</p>
        <VBtn :to="localePath('/')" color="primary" variant="elevated">
          <VIcon start>mdi-chart-line</VIcon>
          {{ t('noticias.ctaButton') }}
        </VBtn>
      </VCard>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
interface NewsItem {
  title: string
  link: string
  source: string
  pubDate: string
  snippet: string
}

const { t, locale } = useI18n()
const localePath = useLocalePath()

const { data: news } = await useFetch<NewsItem[]>('/api/news', {
  key: 'news-uy',
  default: () => [],
})

const relativeDate = (dateStr: string) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const diffMin = Math.round((d.getTime() - Date.now()) / 60000)
  const rtf = new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto' })
  const absMin = Math.abs(diffMin)
  if (absMin < 60) return rtf.format(Math.round(diffMin), 'minute')
  if (absMin < 1440) return rtf.format(Math.round(diffMin / 60), 'hour')
  return rtf.format(Math.round(diffMin / 1440), 'day')
}

// SEO
useSeoMeta({
  title: () => t('noticias.metaTitle'),
  description: () => t('noticias.metaDescription'),
  ogTitle: () => t('noticias.metaTitle'),
  ogDescription: () => t('noticias.metaDescription'),
  ogType: 'website',
})

// ItemList JSON-LD of the current headlines (each as NewsArticle)
useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: computed(() =>
        JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: t('noticias.title'),
          itemListElement: (news.value || []).map((n, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: n.link,
            item: {
              '@type': 'NewsArticle',
              headline: n.title,
              datePublished: n.pubDate ? new Date(n.pubDate).toISOString() : undefined,
              publisher: { '@type': 'Organization', name: n.source },
            },
          })),
        })
      ),
    },
  ],
})
</script>

<style scoped>
.news-intro {
  max-width: 720px;
  line-height: 1.7;
}

.news-card {
  text-decoration: none;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.news-card:hover {
  transform: translateY(-3px);
}

.news-title {
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.news-snippet {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
