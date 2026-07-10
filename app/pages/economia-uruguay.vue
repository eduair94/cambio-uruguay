<template>
  <div class="economia-page">
    <VContainer>
      <!-- Header -->
      <header class="text-center pt-2 pb-6 py-md-10">
        <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">{{ t('economia.title') }}</h1>
        <p class="text-body-1 text-grey-lighten-1 mx-auto economia-intro">
          {{ t('economia.intro') }}
        </p>
        <VChip class="mt-4" color="success" size="small" variant="tonal">
          <VIcon start size="small">mdi-autorenew</VIcon>
          {{ t('economia.updatedAuto') }}
        </VChip>
        <div class="d-flex justify-center mt-4">
          <ShareButtons :text="t('economia.metaTitle')" />
        </div>
      </header>

      <!-- AI briefing: economy analysis (client-only, never blocks SSR) -->
      <ClientOnly>
        <VCard v-if="aiPending || aiHtml" class="ai-briefing mb-8 pa-5">
          <div class="d-flex align-center mb-3">
            <VIcon color="primary" class="mr-2">mdi-robot-outline</VIcon>
            <span class="text-subtitle-1 font-weight-bold">{{ t('economia.aiTitle') }}</span>
            <VChip size="x-small" color="primary" variant="tonal" class="ml-2 font-weight-bold">
              {{ t('economia.aiBadge') }}
            </VChip>
          </div>
          <div v-if="aiPending" class="d-flex align-center text-grey-lighten-1 text-body-2">
            <VProgressCircular indeterminate size="20" width="2" color="primary" class="mr-3" />
            {{ t('economia.aiLoading') }}
          </div>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div v-else class="ai-briefing-content" v-html="aiHtml" />
        </VCard>
      </ClientOnly>

      <!-- Topic quick-nav -->
      <div v-if="groups.length" class="d-flex flex-wrap justify-center ga-2 mb-8">
        <VChip
          v-for="g in groups"
          :key="g.topic"
          :href="`#${g.topic}`"
          size="small"
          variant="tonal"
          color="primary"
        >
          <VIcon start size="small">{{ topicIcon(g.topic) }}</VIcon>
          {{ t(`economia.topics.${g.topic}`) }}
        </VChip>
      </div>

      <!-- News grouped by topic -->
      <section v-for="g in groups" :id="g.topic" :key="g.topic" class="mb-8 economia-topic">
        <h2 class="text-h6 font-weight-bold mb-3 economia-topic-title">
          <VIcon start size="small" color="primary">{{ topicIcon(g.topic) }}</VIcon>
          {{ t(`economia.topics.${g.topic}`) }}
        </h2>
        <VRow>
          <VCol v-for="item in g.items" :key="item.link" cols="12" sm="6" md="4">
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
                <h3 class="text-body-1 font-weight-bold mb-2 news-title">{{ item.title }}</h3>
                <div class="mt-auto pt-2">
                  <span class="text-caption text-link font-weight-medium">
                    {{ t('economia.readMore') }}
                    <VIcon size="14">mdi-open-in-new</VIcon>
                  </span>
                </div>
              </div>
            </VCard>
          </VCol>
        </VRow>
      </section>

      <!-- Empty / error state -->
      <VAlert v-if="!groups.length" type="info" variant="tonal" class="my-8">
        {{ t('economia.empty') }}
      </VAlert>

      <p class="text-caption text-grey-darken-1 text-center mt-6">{{ t('economia.disclaimer') }}</p>

      <!-- Cross-links: dollar news, investing, financial health -->
      <VRow class="my-6">
        <VCol cols="12" md="4">
          <VCard :to="localePath('/noticias')" class="cross-link pa-4 h-100" hover variant="flat">
            <VIcon color="primary" class="mb-2">mdi-newspaper-variant-outline</VIcon>
            <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ t('economia.crossNews') }}</h3>
            <p class="text-body-2 text-grey-lighten-1 mb-0">{{ t('economia.crossNewsText') }}</p>
          </VCard>
        </VCol>
        <VCol cols="12" md="4">
          <VCard
            :to="localePath('/inversiones-uruguay')"
            class="cross-link pa-4 h-100"
            hover
            variant="flat"
          >
            <VIcon color="primary" class="mb-2">mdi-chart-areaspline</VIcon>
            <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ t('economia.crossInvest') }}</h3>
            <p class="text-body-2 text-grey-lighten-1 mb-0">{{ t('economia.crossInvestText') }}</p>
          </VCard>
        </VCol>
        <VCol cols="12" md="4">
          <VCard
            :to="localePath('/salud-financiera')"
            class="cross-link pa-4 h-100"
            hover
            variant="flat"
          >
            <VIcon color="primary" class="mb-2">mdi-heart-pulse</VIcon>
            <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ t('economia.crossHealth') }}</h3>
            <p class="text-body-2 text-grey-lighten-1 mb-0">{{ t('economia.crossHealthText') }}</p>
          </VCard>
        </VCol>
      </VRow>

      <!-- CTA back to comparator -->
      <VCard class="cta-economia my-8 pa-6 text-center" variant="flat">
        <h2 class="text-h6 font-weight-bold mb-2 text-white">{{ t('economia.ctaTitle') }}</h2>
        <p class="text-body-2 text-grey-lighten-1 mb-4">{{ t('economia.ctaText') }}</p>
        <VBtn :to="localePath('/')" color="primary" variant="elevated">
          <VIcon start>mdi-chart-line</VIcon>
          {{ t('economia.ctaButton') }}
        </VBtn>
      </VCard>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import { marked } from 'marked'
import DOMPurify from 'isomorphic-dompurify'

type EconomyTopic = 'inflacion' | 'empleo' | 'empresas' | 'bcu' | 'comercio_exterior' | 'fiscal'

interface EconomyNewsItem {
  title: string
  link: string
  source: string
  pubDate: string
  snippet: string
  topic: EconomyTopic
}

const { t, locale } = useI18n()
const localePath = useLocalePath()

const TOPIC_ORDER: EconomyTopic[] = [
  'inflacion',
  'empleo',
  'empresas',
  'bcu',
  'comercio_exterior',
  'fiscal',
]

const TOPIC_ICONS: Record<EconomyTopic, string> = {
  inflacion: 'mdi-trending-up',
  empleo: 'mdi-briefcase-outline',
  empresas: 'mdi-domain',
  bcu: 'mdi-bank-outline',
  comercio_exterior: 'mdi-ferry',
  fiscal: 'mdi-file-percent-outline',
}
const topicIcon = (topic: EconomyTopic) => TOPIC_ICONS[topic] ?? 'mdi-finance'

const { data: news } = await useFetch<EconomyNewsItem[]>('/api/economy-news', {
  key: 'economy-news-uy',
  default: () => [],
})

// Headlines grouped by topic, in canonical order, dropping empty topics.
const groups = computed(() =>
  TOPIC_ORDER.map(topic => ({
    topic,
    items: (news.value || []).filter(n => n.topic === topic),
  })).filter(g => g.items.length > 0)
)

// AI briefing — client-lazy so the slow/cold AI call never blocks SSR.
const { data: ai, pending: aiPending } = useLazyFetch<{ insight: string | null }>(
  '/api/economy-ai',
  {
    query: { lang: locale },
    server: false,
    default: () => ({ insight: null }),
  }
)

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

// Branded OG image
defineOgImageComponent('Cambio', {
  title: () =>
    ({
      es: 'Noticias de Economía de Uruguay',
      en: "Uruguay's Economy News",
      pt: 'Notícias de Economia do Uruguai',
    })[locale.value as 'es' | 'en' | 'pt'],
  subtitle: () =>
    ({
      es: 'Titulares por área + informe con IA',
      en: 'Headlines by topic + AI briefing',
      pt: 'Manchetes por área + resumo com IA',
    })[locale.value as 'es' | 'en' | 'pt'],
  tag: 'ECONOMÍA',
  locale: locale.value as 'es' | 'en' | 'pt',
})

// SEO
useSeoMeta({
  title: () => t('economia.metaTitle'),
  description: () => t('economia.metaDescription'),
  ogTitle: () => t('economia.metaTitle'),
  ogDescription: () => t('economia.metaDescription'),
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
          name: t('economia.title'),
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
.economia-intro {
  max-width: 760px;
  line-height: 1.7;
}

.economia-topic-title {
  border-left: 3px solid rgb(var(--v-theme-primary));
  padding-left: 10px;
  scroll-margin-top: 90px;
}

.economia-topic {
  scroll-margin-top: 90px;
}

.cta-economia {
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.28);
  border-radius: 12px;
}

.cross-link {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  text-decoration: none;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}
.cross-link:hover {
  transform: translateY(-2px);
}
.v-theme--light .cross-link {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.08);
}

.ai-briefing {
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.1), rgba(124, 77, 255, 0.07));
  border: 1px solid rgba(33, 150, 243, 0.25);
  border-radius: 14px;
}

.ai-briefing-content :deep(h1),
.ai-briefing-content :deep(h2),
.ai-briefing-content :deep(h3) {
  font-size: 1rem;
  font-weight: 700;
  margin: 0.7rem 0 0.3rem;
  color: #fff;
}
.ai-briefing-content :deep(p) {
  margin: 0.4rem 0;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.86);
}
.ai-briefing-content :deep(strong) {
  color: #fff;
}
.ai-briefing-content :deep(em) {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.86em;
}
.ai-briefing-content :deep(ul),
.ai-briefing-content :deep(ol) {
  padding-left: 1.2rem;
  color: rgba(255, 255, 255, 0.86);
}
.ai-briefing-content :deep(li) {
  margin: 0.2rem 0;
}

.v-theme--light .ai-briefing-content :deep(h1),
.v-theme--light .ai-briefing-content :deep(h2),
.v-theme--light .ai-briefing-content :deep(h3) {
  color: rgba(0, 0, 0, 0.87);
}
.v-theme--light .ai-briefing-content :deep(p) {
  color: rgba(0, 0, 0, 0.82);
}
.v-theme--light .ai-briefing-content :deep(strong) {
  color: rgba(0, 0, 0, 0.87);
}
.v-theme--light .ai-briefing-content :deep(em) {
  color: rgba(0, 0, 0, 0.6);
}
.v-theme--light .ai-briefing-content :deep(ul),
.v-theme--light .ai-briefing-content :deep(ol) {
  color: rgba(0, 0, 0, 0.82);
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
</style>
