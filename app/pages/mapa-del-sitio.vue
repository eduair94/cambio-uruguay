<template>
  <div class="sitemap-page">
    <VContainer>
      <header class="text-center pt-2 pb-6 py-md-10">
        <VChip class="mb-4" color="primary" size="small" variant="tonal">
          <VIcon start size="small">mdi-sitemap-outline</VIcon>
          {{ $t('nav.sitemap').toUpperCase() }}
        </VChip>
        <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">{{ $t('sitemapPage.h1') }}</h1>
        <p class="text-body-1 text-grey-lighten-1 mx-auto sitemap-page__intro">
          {{ $t('sitemapPage.intro') }}
        </p>
      </header>

      <section v-for="section in sections" :key="section.id" class="mb-10">
        <h2 class="text-h6 font-weight-bold mb-4 d-flex align-center">
          <VIcon start color="primary">mdi-folder-outline</VIcon>
          {{ $t(section.titleKey) }}
        </h2>

        <ul class="sitemap-page__links mb-4">
          <li v-for="entry in section.entries" :key="entry.to">
            <NuxtLink :to="localePath(entry.to as string)" class="sitemap-page__link">
              <VIcon size="small">{{ entry.icon }}</VIcon>
              {{ $t(entry.labelKey) }}
            </NuxtLink>
          </li>
        </ul>

        <!-- The long tail: catalogue leaves that no menu lists. This is what
             gives crawlers a path to every tool, term, guide and casa. -->
        <template v-for="group in longTail[section.id] ?? []" :key="group.title">
          <h3 class="text-subtitle-2 font-weight-bold mt-4 mb-2 text-grey-lighten-1">
            {{ group.title }}
          </h3>
          <ul class="sitemap-page__links sitemap-page__links--dense">
            <li v-for="link in group.links" :key="link.to">
              <NuxtLink :to="localePath(link.to)" class="sitemap-page__link">{{
                link.label
              }}</NuxtLink>
            </li>
          </ul>
        </template>
      </section>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import { CASAS_REPUTATION } from '~/utils/casasDirectory'
import { convertEntries, convertTitle } from '~/utils/convert'
import {
  CURRENCY_SLUG_TO_CODE,
  currencyDisplayName,
  type CurrencyCode,
  type CurrencyLang,
} from '~/utils/currencyPages'
import { glossary } from '~/utils/glossary'
import { guides } from '~/utils/guides'
import { indicators } from '~/utils/indicators'
import { NAV_SECTIONS } from '~/utils/siteNav'
import { tools } from '~/utils/tools'

const localePath = useLocalePath()
const { t, locale } = useI18n()

interface TailLink {
  to: string
  label: string
}
interface TailGroup {
  title: string
  links: TailLink[]
}

/** Internal entries only — external links belong in the footer, not the sitemap. */
const sections = computed(() =>
  NAV_SECTIONS.map(s => ({ ...s, entries: s.entries.filter(e => e.to) }))
)

const longTail = computed<Record<string, TailGroup[]>>(() => {
  const lang: CurrencyLang = locale.value === 'en' || locale.value === 'pt' ? locale.value : 'es'
  return {
    tools: [
      {
        title: t('nav.herramientas'),
        links: tools.map(tool => ({ to: `/herramientas/${tool.slug}`, label: tool.title })),
      },
      {
        title: t('nav.cotizacion'),
        links: (Object.entries(CURRENCY_SLUG_TO_CODE) as Array<[string, CurrencyCode]>).map(
          ([slug, code]) => ({
            to: `/cotizacion/${slug}`,
            label: currencyDisplayName(code, lang),
          })
        ),
      },
      {
        title: t('nav.indicadores'),
        links: indicators.map(i => ({ to: `/indicadores/${i.slug}`, label: i.name })),
      },
      {
        title: t('nav.convertir'),
        links: convertEntries.map(e => ({ to: `/convertir/${e.slug}`, label: convertTitle(e) })),
      },
    ],
    learn: [
      {
        title: t('guias.nav'),
        links: guides.map(g => ({ to: `/guias/${g.slug}`, label: g.title })),
      },
      {
        title: t('nav.glosario'),
        links: glossary.map(g => ({ to: `/glosario/${g.slug}`, label: g.term })),
      },
    ],
    houses: [
      {
        title: t('nav.casasDirectory'),
        links: CASAS_REPUTATION.map(c => ({ to: `/casa/${c.code}`, label: c.name })),
      },
    ],
  }
})

const canonicalUrl = 'https://cambio-uruguay.com/mapa-del-sitio'

defineOgImageComponent('Cambio', {
  title: 'Mapa del sitio',
  subtitle: 'Todas las páginas de Cambio Uruguay',
  tag: 'MAPA DEL SITIO',
})

useSeoMeta({
  title: () => `${t('sitemapPage.metaTitle')} | Cambio Uruguay`,
  description: () => t('sitemapPage.metaDescription'),
  ogTitle: () => t('sitemapPage.h1'),
  ogDescription: () => t('sitemapPage.intro'),
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
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
          { '@type': 'ListItem', position: 2, name: 'Mapa del sitio', item: canonicalUrl },
        ],
      }),
    },
  ],
})
</script>

<style scoped lang="scss">
.sitemap-page__intro {
  max-width: 640px;
}

.sitemap-page__links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.sitemap-page__links--dense {
  font-size: 0.86rem;
}

.sitemap-page__link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: rgb(var(--v-theme-link));
  text-decoration: none;

  &:hover,
  &:focus-visible {
    text-decoration: underline;
  }
}
</style>
