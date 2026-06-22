<template>
  <div class="withdraw-page pb-8">
    <!-- Breadcrumb -->
    <div class="mb-3">
      <VBtn :to="localePath('/herramientas')" variant="text" size="small" class="px-1">
        <VIcon start size="small">mdi-arrow-left</VIcon>
        {{ c.ui.backToTools }}
      </VBtn>
    </div>

    <!-- Header -->
    <VCard class="overflow-hidden mb-4" elevation="8">
      <div class="bg-gradient-withdraw pa-6">
        <div class="d-flex align-center ga-4 flex-wrap">
          <VAvatar size="56" class="d-none d-md-flex bg-white">
            <VIcon size="32" color="primary">mdi-cash-multiple</VIcon>
          </VAvatar>
          <div>
            <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-1">{{ c.title }}</h1>
            <p class="text-body-1 text-grey-lighten-2 mb-0 withdraw-lead">{{ c.description }}</p>
          </div>
        </div>
        <div class="d-flex align-center justify-space-between flex-wrap ga-2 mt-3">
          <span class="text-caption text-grey-lighten-2">
            <VIcon start size="x-small">mdi-calendar-check</VIcon>{{ c.ui.lastChecked }}
          </span>
          <ShareButtons :url="canonicalUrl" :text="c.title" />
        </div>
      </div>
    </VCard>

    <!-- TL;DR quick answer -->
    <VCard class="withdraw-tldr pa-4 pa-sm-5 mb-4" variant="flat">
      <h2 class="text-subtitle-1 font-weight-bold mb-3">
        <VIcon start size="small" color="primary">mdi-lightning-bolt</VIcon>{{ c.ui.tldrTitle }}
      </h2>
      <ul class="withdraw-tldr-list">
        <li v-for="(item, i) in c.tldr" :key="i">{{ item }}</li>
      </ul>
    </VCard>

    <!-- Disclaimer / time-box note -->
    <VAlert
      type="info"
      variant="tonal"
      density="comfortable"
      class="mb-4"
      icon="mdi-information-outline"
    >
      {{ c.ui.disclaimer }}
    </VAlert>

    <!-- Prose sections, with the network table and zone directory interleaved -->
    <template v-for="section in c.sections" :key="section.id">
      <VCard variant="flat" class="withdraw-section mb-4 pa-5">
        <h2 :id="section.id" class="text-h6 font-weight-bold mb-3">{{ section.heading }}</h2>
        <p
          v-for="(p, i) in section.paragraphs"
          :key="i"
          class="text-body-1 text-grey-lighten-1 withdraw-prose mb-3"
        >
          {{ p }}
        </p>
        <ul v-if="section.bullets?.length" class="withdraw-bullets">
          <li v-for="(b, i) in section.bullets" :key="i">{{ b }}</li>
        </ul>
      </VCard>

      <!-- ATM-network comparison table (right after the networks intro) -->
      <VCard v-if="section.id === 'redes'" class="withdraw-section mb-4 pa-4 pa-sm-5">
        <!-- Desktop: table -->
        <div class="d-none d-md-block">
          <VTable density="comfortable" class="withdraw-table">
            <thead>
              <tr>
                <th>{{ c.ui.tableNetwork }}</th>
                <th>{{ c.ui.tableReach }}</th>
                <th class="text-right">{{ c.ui.tableUsd }}</th>
                <th class="text-right">{{ c.ui.tableUyu }}</th>
                <th>{{ c.ui.tableNote }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in c.networkRows" :key="row.network">
                <td class="font-weight-medium">{{ row.network }}</td>
                <td class="text-grey-lighten-1">{{ row.reach }}</td>
                <td class="text-right">{{ row.usdPerTxn }}</td>
                <td class="text-right">{{ row.uyuPerTxn }}</td>
                <td class="text-grey-lighten-1">{{ row.note }}</td>
              </tr>
            </tbody>
          </VTable>
        </div>
        <!-- Mobile: stacked cards -->
        <div class="d-md-none">
          <div v-for="row in c.networkRows" :key="row.network" class="withdraw-net-card">
            <div class="d-flex align-center justify-space-between ga-2 mb-1">
              <span class="text-subtitle-1 font-weight-bold">{{ row.network }}</span>
              <span class="withdraw-net-cap">{{ row.usdPerTxn }} · {{ row.uyuPerTxn }}</span>
            </div>
            <p class="text-caption text-grey-lighten-1 mb-1">{{ row.reach }}</p>
            <p class="text-caption text-grey-lighten-1 mb-0">{{ row.note }}</p>
          </div>
        </div>
      </VCard>

      <!-- Tourist-zone directory (after the DCC section, before casas de cambio) -->
      <VCard v-if="section.id === 'dcc'" class="withdraw-section mb-4 pa-5">
        <h2 class="text-h6 font-weight-bold mb-2">{{ c.ui.zonesTitle }}</h2>
        <p class="text-caption text-grey-lighten-1 mb-4">{{ c.ui.zonesIntro }}</p>
        <VRow>
          <VCol v-for="zone in c.zones" :key="zone.id" cols="12" md="6">
            <div class="withdraw-zone">
              <div class="d-flex align-center ga-2 mb-1">
                <VIcon size="20" color="primary">{{ zone.icon }}</VIcon>
                <h3 class="text-subtitle-1 font-weight-bold">{{ zone.name }}</h3>
              </div>
              <p class="text-body-2 text-grey-lighten-1 mb-2">{{ zone.summary }}</p>
              <ul class="withdraw-zone-tips">
                <li v-for="(tip, i) in zone.tips" :key="i">{{ tip }}</li>
              </ul>
            </div>
          </VCol>
        </VRow>
      </VCard>

      <!-- Live IVA status, derived from the date (resolveIvaStatus) -->
      <VAlert
        v-if="section.id === 'iva-turistas'"
        type="success"
        variant="tonal"
        density="comfortable"
        class="withdraw-iva-live mb-4"
        icon="mdi-check-decagram"
      >
        <div class="font-weight-bold">{{ c.ivaLive.heading }}</div>
        <div class="text-caption mb-2">{{ ivaAsOf }}</div>
        <ul class="withdraw-bullets mb-0">
          <li>{{ c.ivaLive.hotel }}</li>
          <li>{{ ivaBase }}</li>
          <li>{{ ivaSeasonal }}</li>
        </ul>
      </VAlert>
    </template>

    <!-- Step by step -->
    <VCard variant="flat" class="withdraw-section mb-4 pa-5">
      <h2 class="text-h6 font-weight-bold mb-3">{{ c.ui.stepsTitle }}</h2>
      <ol class="withdraw-steps">
        <li v-for="(step, i) in c.steps" :key="i" class="mb-3">
          <span class="font-weight-bold">{{ step.name }}.</span>
          <span class="text-grey-lighten-1"> {{ step.text }}</span>
        </li>
      </ol>
    </VCard>

    <!-- FAQ -->
    <VCard variant="flat" class="withdraw-section mb-4 pa-5">
      <h2 class="text-h6 font-weight-bold mb-3">{{ c.ui.faqTitle }}</h2>
      <VExpansionPanels variant="accordion" class="withdraw-faq">
        <VExpansionPanel v-for="(item, i) in c.faq" :key="i">
          <VExpansionPanelTitle class="font-weight-medium">{{ item.q }}</VExpansionPanelTitle>
          <VExpansionPanelText>{{ item.a }}</VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </VCard>

    <!-- CTA -->
    <VCard class="cta-withdraw mb-4 pa-6 text-center" variant="flat">
      <h2 class="text-h6 font-weight-bold mb-2 text-white">{{ c.ui.ctaTitle }}</h2>
      <p class="text-body-2 text-grey-lighten-1 mb-4">{{ c.ui.ctaText }}</p>
      <VBtn :to="localePath('/comparar')" color="primary" variant="elevated" class="cta-btn">
        <VIcon start>mdi-chart-multiple</VIcon>{{ c.ui.ctaButton }}
      </VBtn>
      <VBtn :to="{ path: localePath('/mapa'), query: { cash: '1' } }" color="teal" variant="tonal" class="cta-btn mt-3">
        <VIcon start>mdi-map-marker-radius</VIcon>{{ c.ui.mapButton }}
      </VBtn>
    </VCard>

    <!-- Related links -->
    <VCard variant="flat" class="withdraw-section mb-4 pa-5">
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
    <VCard variant="flat" class="withdraw-section pa-5">
      <h2 class="text-subtitle-2 font-weight-bold mb-2">
        <VIcon start size="small" color="primary">mdi-link-variant</VIcon>{{ c.ui.sourcesTitle }}
      </h2>
      <ul class="withdraw-sources">
        <li v-for="(src, i) in sources" :key="i">
          <a :href="src.to" target="_blank" rel="noopener noreferrer">{{ src.label }}</a>
        </li>
      </ul>
    </VCard>
  </div>
</template>

<script setup lang="ts">
import {
  getWithdrawContent,
  LAST_RESEARCHED,
  WITHDRAW_PATH,
  WITHDRAW_SOURCES,
} from '~/utils/withdrawCash'
import { resolveIvaStatus } from '~/utils/ivaStatus'

const { locale } = useI18n()
const localePath = useLocalePath()

// Localized content tree for the active UI locale (falls back to es).
const c = computed(() => getWithdrawContent(locale.value))
const sources = WITHDRAW_SOURCES

// Live tourist-IVA status, derived purely from today's date. The page always
// states the currently-in-force benefits (it flips on 2026-10-01 and each
// season) — kept honest by the withdraw:iva-check watchdog task.
const ivaNow = resolveIvaStatus(new Date())
const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString(c.value.lang, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
const ivaAsOf = computed(() => c.value.ivaLive.asOf.replace('{date}', fmtDate(ivaNow.date)))
const ivaBase = computed(() =>
  c.value.ivaLive.base.replace('{points}', String(ivaNow.baseReductionPoints))
)
const ivaSeasonal = computed(() =>
  ivaNow.seasonalActive && ivaNow.seasonalWindow
    ? c.value.ivaLive.seasonalOn.replace('{end}', fmtDate(ivaNow.seasonalWindow.end))
    : c.value.ivaLive.seasonalOff
)

// Per-locale canonical: localePath prefixes /en and /pt; es stays unprefixed.
// hreflang alternates are injected globally by the layout (useLocaleHead).
const canonicalUrl = computed(() => `https://cambio-uruguay.com${localePath(WITHDRAW_PATH)}`)

// Short uppercase OG tag, localized.
const ogTag = computed(
  () => ({ es: 'EFECTIVO', en: 'CASH', pt: 'DINHEIRO' })[locale.value] ?? 'EFECTIVO'
)

defineOgImageComponent('Cambio', {
  title: () => c.value.title,
  subtitle: () => c.value.description,
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

// Canonical + keywords + structured data (Article + FAQPage + HowTo + ItemList +
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
            datePublished: LAST_RESEARCHED,
            dateModified: LAST_RESEARCHED,
            inLanguage: c.value.lang,
            mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl.value },
            speakable: {
              '@type': 'SpeakableSpecification',
              cssSelector: ['.withdraw-lead', '.withdraw-prose'],
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
            '@type': 'ItemList',
            name: c.value.ui.zonesTitle,
            itemListElement: c.value.zones.map((z, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: z.name,
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
.withdraw-page {
  overflow-x: hidden;
}

.bg-gradient-withdraw {
  background: linear-gradient(135deg, #16c784 0%, #2f81f7 100%);
}

.withdraw-lead {
  max-width: 820px;
  line-height: 1.6;
}

.withdraw-prose {
  line-height: 1.8;
}

.withdraw-section,
.withdraw-tldr {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}

.withdraw-tldr {
  background: rgba(22, 199, 132, 0.08);
  border-color: rgba(22, 199, 132, 0.25);
}

.withdraw-tldr-list,
.withdraw-bullets,
.withdraw-zone-tips,
.withdraw-sources {
  margin: 0;
  padding-left: 1.1rem;
}

.withdraw-tldr-list li,
.withdraw-bullets li,
.withdraw-zone-tips li,
.withdraw-sources li {
  margin-bottom: 0.45rem;
  color: rgba(255, 255, 255, 0.82);
  line-height: 1.6;
}

.withdraw-zone-tips li,
.withdraw-sources li {
  font-size: 0.9rem;
}

.withdraw-table :deep(td),
.withdraw-table :deep(th) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.withdraw-net-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 14px 16px;
}

.withdraw-net-card + .withdraw-net-card {
  margin-top: 12px;
}

.withdraw-net-cap {
  font-weight: 700;
  color: #16c784;
  white-space: nowrap;
  font-size: 0.85rem;
}

.withdraw-zone {
  height: 100%;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 12px;
  padding: 14px 16px;
}

.withdraw-steps {
  padding-left: 1.25rem;
  line-height: 1.7;
}

.withdraw-steps li {
  padding-left: 0.25rem;
}

.withdraw-sources a {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}

.withdraw-sources a:hover {
  text-decoration: underline;
}

.cta-withdraw {
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
