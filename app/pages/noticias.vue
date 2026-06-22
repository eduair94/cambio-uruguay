<template>
  <div class="news-page">
    <VContainer>
      <!-- Header -->
      <header class="text-center pt-2 pb-6 py-md-12">
        <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">{{ t('noticias.title') }}</h1>
        <p class="text-body-1 text-grey-lighten-1 mx-auto news-intro">{{ t('noticias.intro') }}</p>
        <VChip class="mt-4" color="success" size="small" variant="tonal">
          <VIcon start size="small">mdi-autorenew</VIcon>
          {{ t('noticias.updatedAuto') }}
        </VChip>
        <div class="d-flex justify-center mt-4">
          <ShareButtons :text="t('noticias.metaTitle')" />
        </div>
      </header>

      <!-- AI pulse: news summary + dollar trend (client-only, never blocks SSR) -->
      <ClientOnly>
        <VCard v-if="aiPending || aiHtml" class="ai-pulse mb-8 pa-5">
          <div class="d-flex align-center mb-3">
            <VIcon color="primary" class="mr-2">mdi-robot-outline</VIcon>
            <span class="text-subtitle-1 font-weight-bold">{{ t('noticias.aiTitle') }}</span>
            <VChip size="x-small" color="primary" variant="tonal" class="ml-2 font-weight-bold">
              {{ t('noticias.aiBadge') }}
            </VChip>
          </div>
          <div v-if="aiPending" class="d-flex align-center text-grey-lighten-1 text-body-2">
            <VProgressCircular indeterminate size="20" width="2" color="primary" class="mr-3" />
            {{ t('noticias.aiLoading') }}
          </div>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div v-else class="ai-pulse-content" v-html="aiHtml" />
        </VCard>
      </ClientOnly>

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
                <span class="text-caption text-link font-weight-medium">
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
      <VCard class="cta-news my-8 pa-6 text-center" variant="flat">
        <h2 class="text-h6 font-weight-bold mb-2 text-white">{{ t('noticias.ctaTitle') }}</h2>
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
import { marked } from 'marked'
import DOMPurify from 'isomorphic-dompurify'

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

// AI summary + dollar trend — client-lazy so the slow/cold AI call never blocks SSR.
const { data: ai, pending: aiPending } = useLazyFetch<{ insight: string | null }>('/api/news-ai', {
  query: { lang: locale },
  server: false,
  default: () => ({ insight: null }),
})

marked.setOptions({ breaks: true, gfm: true })
const aiHtml = computed(() => {
  const txt = ai.value?.insight
  if (!txt) return ''
  const html = marked.parse(txt) as string
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'p',
      'br',
      'hr',
      'strong',
      'em',
      'ul',
      'ol',
      'li',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'blockquote',
      'code',
      'pre',
    ],
    ALLOWED_ATTR: ['class'],
    ALLOW_DATA_ATTR: false,
  })
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

// Branded OG image for the news page
defineOgImageComponent('Cambio', {
  title: () =>
    ({
      es: 'Noticias del Dólar en Uruguay',
      en: "Uruguay's Dollar News",
      pt: 'Notícias do Dólar no Uruguai',
    })[locale.value as 'es' | 'en' | 'pt'],
  subtitle: () =>
    ({
      es: 'Resumen con IA + titulares de los principales medios',
      en: 'AI summary + headlines from major outlets',
      pt: 'Resumo com IA + manchetes dos principais meios',
    })[locale.value as 'es' | 'en' | 'pt'],
  tag: 'NOTICIAS',
  locale: locale.value as 'es' | 'en' | 'pt',
})

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

/* Readable CTA on dark theme (avoid Vuetify outlined `color` tinting the text) */
.cta-news {
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.28);
  border-radius: 12px;
}

.ai-pulse {
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.1), rgba(124, 77, 255, 0.07));
  border: 1px solid rgba(33, 150, 243, 0.25);
  border-radius: 14px;
}

.ai-pulse-content :deep(h1),
.ai-pulse-content :deep(h2),
.ai-pulse-content :deep(h3) {
  font-size: 1rem;
  font-weight: 700;
  margin: 0.7rem 0 0.3rem;
  color: #fff;
}
.ai-pulse-content :deep(p) {
  margin: 0.4rem 0;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.86);
}
.ai-pulse-content :deep(strong) {
  color: #fff;
}
.ai-pulse-content :deep(em) {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.86em;
}
.ai-pulse-content :deep(ul),
.ai-pulse-content :deep(ol) {
  padding-left: 1.2rem;
  color: rgba(255, 255, 255, 0.86);
}
.ai-pulse-content :deep(li) {
  margin: 0.2rem 0;
}
.ai-pulse-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0.5rem 0;
}
.ai-pulse-content :deep(th),
.ai-pulse-content :deep(td) {
  border: 1px solid rgba(255, 255, 255, 0.14);
  padding: 0.3rem 0.5rem;
  font-size: 0.85rem;
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
