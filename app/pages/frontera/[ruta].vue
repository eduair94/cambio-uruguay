<template>
  <!-- `data` is null only for an unknown/uncurated slug, where setup throws a
       404. Gating the whole page on it keeps that error-path SSR render empty
       (and crash-free) so the thrown 404 status is what the response carries. -->
  <div v-if="data" class="pb-8">
    <!-- Header -->
    <v-row>
      <v-col cols="12">
        <v-card class="overflow-hidden" elevation="8">
          <div class="bg-gradient-frontera pa-6 on-dark">
            <div class="d-flex align-center ga-4 flex-wrap">
              <v-avatar size="56" class="d-none d-md-flex bg-white">
                <v-icon size="32" color="primary">mdi-bridge</v-icon>
              </v-avatar>
              <div>
                <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-1">
                  {{ $t('frontera.h1', { currency: currencyName, department: departmentTitle }) }}
                </h1>
                <p class="text-body-1 text-grey-lighten-2 mb-0 frontera-intro">
                  {{
                    $t('frontera.intro', {
                      currency: currencyName,
                      department: departmentTitle,
                      border: route_.border,
                    })
                  }}
                </p>
              </div>
            </div>
          </div>

          <v-card-text class="d-flex align-center flex-wrap ga-2 py-4">
            <v-chip color="primary" variant="tonal" size="small">
              <v-icon start size="small">mdi-bank</v-icon>
              {{ $t('frontera.housesCount', { count: quotes.length }) }}
            </v-chip>
            <v-chip color="info" variant="tonal" size="small">
              <v-icon start size="small">mdi-map-marker-radius</v-icon>
              {{ $t('frontera.borderChip', { town: route_.town, border: route_.border }) }}
            </v-chip>
            <v-chip color="success" variant="tonal" size="small">
              <v-icon start size="small">mdi-autorenew</v-icon>
              {{ $t('frontera.updatedAuto') }}
            </v-chip>
            <v-spacer class="d-none d-sm-flex" />
            <ShareButtons :url="canonicalUrl" :text="metaTitle" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Best buy / best sell highlights -->
    <v-row v-if="bestBuy || bestSell" class="mt-2">
      <v-col v-if="bestSell" cols="12" md="6">
        <v-card class="pa-4" color="success" variant="tonal" data-testid="frontera-best-sell">
          <div class="text-overline">
            {{ $t('frontera.bestToBuy', { currency: currencyName }) }}
          </div>
          <div class="d-flex align-center justify-space-between flex-wrap ga-2">
            <span class="text-h6 font-weight-bold">{{ bestSell.name }}</span>
            <span class="text-h6">{{ formatRate(bestSell.sell) }}</span>
          </div>
        </v-card>
      </v-col>
      <v-col v-if="bestBuy" cols="12" md="6">
        <v-card class="pa-4" color="primary" variant="tonal" data-testid="frontera-best-buy">
          <div class="text-overline">
            {{ $t('frontera.bestToSell', { currency: currencyName }) }}
          </div>
          <div class="d-flex align-center justify-space-between flex-wrap ga-2">
            <span class="text-h6 font-weight-bold">{{ bestBuy.name }}</span>
            <span class="text-h6">{{ formatRate(bestBuy.buy) }}</span>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Loading -->
    <v-row v-if="pending">
      <v-col cols="12" class="text-center py-10">
        <v-progress-circular indeterminate color="primary" size="64" />
        <p class="mt-4 text-h6">{{ $t('frontera.loading') }}</p>
      </v-col>
    </v-row>

    <!-- Quotes table -->
    <template v-else>
      <v-row class="mt-2">
        <v-col cols="12">
          <v-card>
            <v-card-title class="d-flex align-center py-3">
              <v-icon start>mdi-table</v-icon>
              {{
                $t('frontera.tableTitle', {
                  currency: currencyName,
                  department: departmentTitle,
                })
              }}
            </v-card-title>

            <v-data-table
              v-if="quotes.length"
              :headers="headers"
              :items="quotes"
              :mobile="smAndDown"
              hide-default-footer
              :items-per-page="-1"
              density="compact"
              class="elevation-1"
              data-testid="frontera-quotes"
            >
              <template #item.name="{ item }">
                <span class="font-weight-medium" data-testid="frontera-house-name">
                  {{ item.name }}
                </span>
                <v-chip
                  v-if="item.bestBuy"
                  color="primary"
                  size="x-small"
                  variant="flat"
                  class="ms-2"
                >
                  {{ $t('frontera.tagBestBuy') }}
                </v-chip>
                <v-chip
                  v-if="item.bestSell"
                  color="success"
                  size="x-small"
                  variant="flat"
                  class="ms-2"
                >
                  {{ $t('frontera.tagBestSell') }}
                </v-chip>
              </template>
              <template #item.buy="{ item }">
                <span :class="{ 'font-weight-bold text-primary': item.bestBuy }">
                  {{ formatRate(item.buy) }}
                </span>
              </template>
              <template #item.sell="{ item }">
                <span :class="{ 'font-weight-bold text-success': item.bestSell }">
                  {{ formatRate(item.sell) }}
                </span>
              </template>
              <template #item.actions="{ item }">
                <div class="d-flex ga-1 justify-end flex-wrap">
                  <v-btn
                    :to="localePath(`/casa/${item.origin}`)"
                    color="primary"
                    variant="tonal"
                    size="small"
                  >
                    <v-icon start size="small">mdi-bank</v-icon>
                    {{ $t('frontera.viewCasa') }}
                  </v-btn>
                  <v-btn
                    :to="localePath(`/sucursales/${item.origin}`)"
                    color="secondary"
                    variant="text"
                    size="small"
                  >
                    <v-icon start size="small">mdi-map-marker</v-icon>
                    {{ $t('frontera.viewBranches') }}
                  </v-btn>
                </div>
              </template>
            </v-data-table>

            <!-- No quotes -->
            <v-card-text v-else class="text-center pa-8" data-testid="frontera-empty">
              <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-bank-off</v-icon>
              <h2 class="text-h6 mb-2">{{ $t('frontera.emptyTitle') }}</h2>
              <p class="text-body-2 text-grey">
                {{
                  $t('frontera.emptyText', {
                    currency: currencyName,
                    department: departmentTitle,
                  })
                }}
              </p>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Border context: unique SEO copy so each frontera page is substantive -->
      <v-row class="mt-2">
        <v-col cols="12">
          <v-card>
            <v-card-title class="d-flex align-center py-3">
              <v-icon start>mdi-information-outline</v-icon>
              {{
                $t('frontera.aboutTitle', {
                  currency: currencyName,
                  department: departmentTitle,
                })
              }}
            </v-card-title>
            <v-card-text>
              <p class="text-body-1 frontera-context mb-0">{{ route_.context }}</p>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- SEO copy + CTAs -->
      <v-row class="mt-2">
        <v-col cols="12">
          <v-card class="cta-frontera pa-6 text-center" variant="flat">
            <h2 class="text-h6 font-weight-bold mb-2 text-white">
              {{ $t('frontera.ctaTitle', { currency: currencyName }) }}
            </h2>
            <p class="text-body-2 text-grey-lighten-1 mb-4">
              {{ $t('frontera.ctaText') }}
            </p>
            <div class="d-flex justify-center flex-wrap ga-2">
              <v-btn
                :to="localePath(`/cotizacion/${route_.currencySlug}`)"
                color="primary"
                variant="elevated"
              >
                <v-icon start>mdi-cash-multiple</v-icon>
                {{ $t('frontera.ctaCurrency', { currency: currencyName }) }}
              </v-btn>
              <v-btn
                :to="localePath(`/dolar/${route_.departmentSlug}`)"
                color="secondary"
                variant="tonal"
              >
                <v-icon start>mdi-map-marker</v-icon>
                {{ $t('frontera.ctaDepartment', { department: departmentTitle }) }}
              </v-btn>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Internal linking: sibling frontera pages for the same currency -->
      <v-row v-if="siblingRoutes.length" class="mt-2">
        <v-col cols="12">
          <v-card>
            <v-card-title class="d-flex align-center py-3">
              <v-icon start>mdi-bridge</v-icon>
              {{ $t('frontera.otherBorders', { currency: currencyName }) }}
            </v-card-title>
            <v-card-text class="d-flex flex-wrap ga-2">
              <v-chip
                v-for="sib in siblingRoutes"
                :key="sib.slug"
                :to="localePath(`/frontera/${sib.slug}`)"
                color="primary"
                variant="tonal"
                size="small"
                link
              >
                {{ sib.departmentName }}
              </v-chip>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useSeoMeta } from '#imports'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'
import type { ExchangeRate } from '~/types/api'
import { currencyDisplayName, type CurrencyLang, type CurrencyQuote } from '~/utils/currencyPages'
import type { LocalDataMap } from '~/utils/departments'
import {
  fronteraBestBuy,
  fronteraBestSell,
  fronteraFromSlug,
  fronteraRoutesForCode,
  housesForFrontera,
  type FronteraRoute,
} from '~/utils/frontera'

// Validate the slug against the curated allowlist BEFORE rendering. Running in
// the route guard yields a real 404 status (on SSR and client navigation) and,
// unlike throwing inside setup, never partially renders this component. The
// allowlist is pure data, so this needs no I/O (cf. /dolar/:departamento, which
// must fetch the live department list).
definePageMeta({
  validate: route => fronteraFromSlug(String(route.params.ruta ?? '')) !== null,
})

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const { smAndDown } = useDisplay()
const { getProcessedExchangeData } = useApiService()

// Resolved curated route (validated by the guard above; the fallback keeps types
// non-null for the SSR error-path render before the 404 throws).
const route_ = computed<FronteraRoute>(
  () => fronteraFromSlug(String(route.params.ruta ?? '')) ?? fronteraRoutesForCode('BRL')[0]
)
const lang = computed<CurrencyLang>(() =>
  (['es', 'en', 'pt'] as const).includes(locale.value as CurrencyLang)
    ? (locale.value as CurrencyLang)
    : 'es'
)
const currencyName = computed(() => currencyDisplayName(route_.value.code, lang.value))
const departmentTitle = computed(() => route_.value.departmentName)

// SSR fetch: localData (department -> houses) + today's quotes (each house's
// current buy/sell for this currency). Keyed by slug so each page caches apart.
const { data, pending } = await useAsyncData<CurrencyQuote[] | null>(
  () => `frontera-${route_.value.slug}`,
  async () => {
    const result = await getProcessedExchangeData('')
    const localData = (result?.localData ?? {}) as LocalDataMap
    const rows = (result?.exchangeData ?? []) as ExchangeRate[]
    return housesForFrontera(localData, rows, route_.value)
  }
)

// The `validate` hook 404s uncurated slugs before this renders; this is a
// belt-and-suspenders fallback that keeps the SSR error-path render empty.
if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Ruta de frontera no encontrada' })
}

const quotes = computed<CurrencyQuote[]>(() => data.value ?? [])
const bestBuy = computed<CurrencyQuote | null>(() => fronteraBestBuy(quotes.value))
const bestSell = computed<CurrencyQuote | null>(() => fronteraBestSell(quotes.value))

const siblingRoutes = computed(() =>
  fronteraRoutesForCode(route_.value.code).filter(r => r.slug !== route_.value.slug)
)

const headers = computed(() => [
  { title: t('frontera.colHouse'), key: 'name', sortable: false },
  {
    title: t('frontera.colBuy', { currency: currencyName.value }),
    key: 'buy',
    sortable: true,
    align: 'end' as const,
  },
  {
    title: t('frontera.colSell', { currency: currencyName.value }),
    key: 'sell',
    sortable: true,
    align: 'end' as const,
  },
  { title: '', key: 'actions', sortable: false, align: 'end' as const },
])

const formatRate = (value: number | null): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-'
  // The peso argentino trades below 1 UYU, so it needs extra decimals or the
  // rate collapses to "0,05" and loses meaning; the real is shown with 2.
  const small = value !== 0 && Math.abs(value) < 1
  return value.toLocaleString('es-UY', {
    style: 'currency',
    currency: 'UYU',
    minimumFractionDigits: 2,
    maximumFractionDigits: small ? 4 : 2,
  })
}

const canonicalUrl = computed(() => `https://cambio-uruguay.com/frontera/${route_.value.slug}`)

// Meta description leads with the live best-buy house + price so the SERP snippet
// carries the actual number, falling back to a number-less sentence when the
// scrape is briefly unavailable (mirrors the historico origin page).
const metaTitle = computed(() =>
  t('frontera.metaTitle', { currency: currencyName.value, department: departmentTitle.value })
)
const metaDescription = computed(() => {
  const best = bestBuy.value
  if (best && typeof best.buy === 'number') {
    return t('frontera.metaDescriptionLive', {
      currency: currencyName.value,
      department: departmentTitle.value,
      house: best.name,
      price: formatRate(best.buy),
      count: quotes.value.length,
    })
  }
  return t('frontera.metaDescription', {
    currency: currencyName.value,
    department: departmentTitle.value,
  })
})

// Branded OG image.
defineOgImageComponent('Cambio', {
  title: () =>
    t('frontera.ogTitle', { currency: currencyName.value, department: departmentTitle.value }),
  subtitle: () => t('frontera.ogSubtitle', { border: route_.value.border }),
  tag: () => (route_.value.currencySlug === 'real' ? 'REAL' : 'PESO ARG.'),
  locale: locale.value as 'es' | 'en' | 'pt',
})

// SEO meta.
useSeoMeta({
  title: () => metaTitle.value,
  description: () => metaDescription.value,
  ogTitle: () => metaTitle.value,
  ogDescription: () => metaDescription.value,
  ogType: 'website',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
  twitterTitle: () => metaTitle.value,
  twitterDescription: () => metaDescription.value,
})

// ExchangeRateSpecification + Place + BreadcrumbList JSON-LD for rich results.
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
              '@type': 'WebPage',
              '@id': `${canonicalUrl.value}#webpage`,
              url: canonicalUrl.value,
              name: metaTitle.value,
              inLanguage: locale.value,
              dateModified: new Date().toISOString(),
              isPartOf: { '@id': 'https://cambio-uruguay.com/#website' },
              speakable: {
                '@type': 'SpeakableSpecification',
                cssSelector: ['.frontera-intro', '.frontera-context'],
              },
            },
            {
              '@type': 'Place',
              name: departmentTitle.value,
              address: {
                '@type': 'PostalAddress',
                addressRegion: departmentTitle.value,
                addressCountry: 'UY',
              },
            },
            {
              '@type': 'ExchangeRateSpecification',
              currency: route_.value.code,
              currentExchangeRate: {
                '@type': 'UnitPriceSpecification',
                priceCurrency: 'UYU',
                ...(bestSell.value?.sell ? { price: bestSell.value.sell } : {}),
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
                  name: metaTitle.value,
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
.bg-gradient-frontera {
  background: linear-gradient(135deg, #2e7d32 0%, #00897b 100%);
}

.frontera-intro {
  max-width: 760px;
  line-height: 1.6;
}

.frontera-context {
  max-width: 820px;
  line-height: 1.7;
}

/* Readable CTA on dark theme (avoid Vuetify outlined color tinting the text) */
.cta-frontera {
  background: rgba(46, 125, 50, 0.12);
  border: 1px solid rgba(46, 125, 50, 0.3);
  border-radius: 12px;
}
</style>
