<template>
  <div class="coins-page pb-8">
    <!-- Breadcrumb -->
    <div class="mb-3">
      <VBtn :to="localePath('/')" variant="text" size="small" class="px-1">
        <VIcon start size="small">mdi-arrow-left</VIcon>
        {{ c.ui.backToHome }}
      </VBtn>
    </div>

    <!-- Header -->
    <VCard class="overflow-hidden mb-4" elevation="8">
      <div class="bg-gradient-coins pa-6 on-dark">
        <div class="d-flex align-center ga-4 flex-wrap">
          <VAvatar size="56" class="d-none d-md-flex bg-white">
            <VIcon size="32" color="primary">mdi-hand-coin-outline</VIcon>
          </VAvatar>
          <div>
            <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-1">{{ c.title }}</h1>
            <p class="text-body-1 text-grey-lighten-2 mb-0 coins-lead">{{ c.description }}</p>
          </div>
        </div>
        <div class="d-flex align-center justify-space-between flex-wrap ga-2 mt-3">
          <span class="text-caption text-grey-lighten-2">
            <VIcon start size="x-small">mdi-calendar-check</VIcon>{{ c.ui.lastChecked }}:
            {{ lastCheckedDate }}
          </span>
          <ShareButtons :url="canonicalUrl" :text="c.title" />
        </div>
      </div>
    </VCard>

    <!-- TL;DR quick answer -->
    <VCard class="coins-tldr pa-4 pa-sm-5 mb-4" variant="flat">
      <h2 class="text-subtitle-1 font-weight-bold mb-3">
        <VIcon start size="small" color="primary">mdi-lightning-bolt</VIcon>{{ c.ui.tldrTitle }}
      </h2>
      <ul class="coins-tldr-list">
        <li v-for="(item, i) in c.tldr" :key="i">{{ item }}</li>
      </ul>
    </VCard>

    <!-- Disclaimer -->
    <VAlert
      type="info"
      variant="tonal"
      density="comfortable"
      class="mb-4"
      icon="mdi-information-outline"
    >
      {{ c.ui.disclaimer }}
    </VAlert>

    <!-- Prose sections -->
    <VCard
      v-for="section in c.sections"
      :key="section.id"
      variant="flat"
      class="coins-section mb-4 pa-5"
    >
      <h2 :id="section.id" class="text-h6 font-weight-bold mb-3">{{ section.heading }}</h2>
      <p
        v-for="(p, i) in section.paragraphs"
        :key="i"
        class="text-body-1 text-grey-lighten-1 coins-prose mb-3"
      >
        {{ p }}
      </p>
      <ul v-if="section.bullets?.length" class="coins-bullets">
        <li v-for="(b, i) in section.bullets" :key="i">{{ b }}</li>
      </ul>
    </VCard>

    <!-- Step by step -->
    <VCard variant="flat" class="coins-section mb-4 pa-5">
      <h2 class="text-h6 font-weight-bold mb-3">{{ c.ui.stepsTitle }}</h2>
      <ol class="coins-steps">
        <li v-for="(step, i) in c.steps" :key="i" class="mb-3">
          <span class="font-weight-bold">{{ step.name }}.</span>
          <span class="text-grey-lighten-1"> {{ step.text }}</span>
        </li>
      </ol>
    </VCard>

    <!-- FAQ -->
    <VCard variant="flat" class="coins-section mb-4 pa-5">
      <h2 class="text-h6 font-weight-bold mb-3">{{ c.ui.faqTitle }}</h2>
      <VExpansionPanels variant="accordion" class="coins-faq">
        <VExpansionPanel v-for="(item, i) in c.faq" :key="i">
          <VExpansionPanelTitle class="font-weight-medium">{{ item.q }}</VExpansionPanelTitle>
          <VExpansionPanelText>{{ item.a }}</VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </VCard>

    <!-- CTA -->
    <VCard class="cta-coins mb-4 pa-6 text-center" variant="flat">
      <h2 class="text-h6 font-weight-bold mb-2 text-white">{{ c.ui.ctaTitle }}</h2>
      <p class="text-body-2 text-grey-lighten-1 mb-4">{{ c.ui.ctaText }}</p>
      <VBtn :to="localePath('/mapa')" color="primary" variant="elevated" class="cta-btn">
        <VIcon start>mdi-map-marker-radius</VIcon>{{ c.ui.ctaButton }}
      </VBtn>
    </VCard>

    <!-- Related links -->
    <VCard variant="flat" class="coins-section mb-4 pa-5">
      <h2 class="text-subtitle-1 font-weight-bold mb-3">{{ c.ui.relatedTitle }}</h2>
      <div class="d-flex flex-wrap ga-2">
        <VChip
          v-for="link in c.related"
          :key="link.to"
          :to="localePath(link.to)"
          color="primary"
          variant="tonal"
          size="small"
          link
        >
          <VIcon start size="small">mdi-link-variant</VIcon>{{ link.label }}
        </VChip>
      </div>
    </VCard>

    <!-- Sources -->
    <VCard variant="flat" class="coins-section pa-5">
      <h2 class="text-subtitle-2 font-weight-bold mb-2">
        <VIcon start size="small" color="primary">mdi-link-variant</VIcon>{{ c.ui.sourcesTitle }}
      </h2>
      <ul class="coins-sources">
        <li v-for="(src, i) in sources" :key="i">
          <a :href="src.to" target="_blank" rel="noopener noreferrer">{{ src.label }}</a>
        </li>
      </ul>
    </VCard>
  </div>
</template>

<script setup lang="ts">
import { COINS_PATH, COINS_SOURCES, getCoinsContent, LAST_RESEARCHED } from '~/utils/coins'

const { locale } = useI18n()
const localePath = useLocalePath()

// Localized content tree for the active UI locale (falls back to es).
const c = computed(() => getCoinsContent(locale.value))
const sources = COINS_SOURCES

const lastCheckedDate = computed(() =>
  new Date(`${LAST_RESEARCHED}T00:00:00Z`).toLocaleDateString(c.value.lang, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
)

// Per-locale canonical: localePath prefixes /en and /pt; es stays unprefixed.
// hreflang alternates are injected globally by the layout (useLocaleHead).
const canonicalUrl = computed(() => `https://cambio-uruguay.com${localePath(COINS_PATH)}`)
const ogImageUrl = computed(
  () => `https://cambio-uruguay.com/__og-image__/image${localePath(COINS_PATH)}/og.png`
)

// Short uppercase OG tag, localized.
const ogTag = computed(
  () => ({ es: 'MONEDAS', en: 'COINS', pt: 'MOEDAS' })[locale.value] ?? 'MONEDAS'
)

defineOgImageComponent('Cambio', {
  title: () => c.value.title,
  subtitle: () => c.value.metaTitle,
  tag: () => ogTag.value,
})

useSeoMeta({
  title: () => `${c.value.metaTitle} | Cambio Uruguay`,
  description: () => c.value.description,
  ogTitle: () => c.value.title,
  ogDescription: () => c.value.description,
  ogType: 'article',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
  twitterTitle: () => c.value.title,
  twitterDescription: () => c.value.description,
})

// Canonical + keywords + structured data (Article + FAQPage + HowTo +
// BreadcrumbList). Reactive so it tracks the active locale on client navigation.
useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl.value }],
  meta: [{ name: 'keywords', content: c.value.keywords }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Article',
            headline: c.value.title,
            description: c.value.description,
            image: ogImageUrl.value,
            datePublished: LAST_RESEARCHED,
            dateModified: LAST_RESEARCHED,
            inLanguage: c.value.lang,
            mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl.value },
            speakable: {
              '@type': 'SpeakableSpecification',
              cssSelector: ['.coins-lead', '.coins-prose'],
            },
            author: {
              '@type': 'Person',
              name: 'Eduardo Airaudo',
              url: 'https://www.linkedin.com/in/eduardo-airaudo/',
            },
            publisher: {
              '@type': 'Organization',
              name: 'Cambio Uruguay',
              logo: { '@type': 'ImageObject', url: 'https://cambio-uruguay.com/img/logo.png' },
            },
          },
          {
            '@type': 'FAQPage',
            mainEntity: c.value.faq.map(item => ({
              '@type': 'Question',
              name: item.q,
              acceptedAnswer: { '@type': 'Answer', text: item.a },
            })),
          },
          {
            '@type': 'HowTo',
            name: c.value.ui.stepsTitle,
            description: c.value.description,
            step: c.value.steps.map((s, i) => ({
              '@type': 'HowToStep',
              position: i + 1,
              name: s.name,
              text: s.text,
            })),
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
              { '@type': 'ListItem', position: 2, name: c.value.title, item: canonicalUrl.value },
            ],
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.coins-page {
  overflow-x: hidden;
}

.bg-gradient-coins {
  background: linear-gradient(135deg, #b8860b 0%, #2f81f7 100%);
}

.coins-lead {
  max-width: 820px;
  line-height: 1.6;
}

.coins-prose {
  line-height: 1.8;
}

.coins-section,
.coins-tldr {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}

.coins-tldr {
  background: rgba(184, 134, 11, 0.1);
  border-color: rgba(184, 134, 11, 0.3);
}

.coins-tldr-list,
.coins-bullets,
.coins-sources {
  margin: 0;
  padding-left: 1.1rem;
}

.coins-tldr-list li,
.coins-bullets li,
.coins-sources li {
  margin-bottom: 0.45rem;
  color: rgba(255, 255, 255, 0.82);
  line-height: 1.6;
}

.v-theme--light .coins-tldr-list li,
.v-theme--light .coins-bullets li,
.v-theme--light .coins-sources li {
  color: rgba(0, 0, 0, 0.82);
}

.coins-sources li {
  font-size: 0.9rem;
}

.coins-steps {
  padding-left: 1.25rem;
  line-height: 1.7;
}

.coins-steps li {
  padding-left: 0.25rem;
}

.coins-sources a {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}

.coins-sources a:hover {
  text-decoration: underline;
}

.cta-coins {
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.28);
  border-radius: 12px;
}

.cta-btn {
  height: auto;
  min-height: 44px;
  max-width: 100%;
  white-space: normal;
}

.cta-btn :deep(.v-btn__content) {
  white-space: normal;
  padding-block: 8px;
}
</style>
