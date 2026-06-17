<template>
  <!-- `data` is null only for an unknown slug, where setup throws a 404. Gating
       the whole page on it keeps that error-path SSR render empty (and crash-free)
       so the thrown 404 status is what the response carries. -->
  <div v-if="data" class="pb-8">
    <!-- Header -->
    <v-row>
      <v-col cols="12">
        <v-card class="overflow-hidden" elevation="8">
          <div class="bg-gradient-cotizacion pa-6">
            <div class="d-flex align-center ga-4 flex-wrap">
              <v-avatar size="56" class="d-none d-md-flex bg-white">
                <v-icon size="32" color="primary">mdi-cash-multiple</v-icon>
              </v-avatar>
              <div>
                <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-1">
                  {{ $t('cotizacion.h1', { currency: currencyName }) }}
                </h1>
                <p class="text-body-1 text-grey-lighten-2 mb-0 cotizacion-intro">
                  {{ $t('cotizacion.intro', { currency: currencyName }) }}
                </p>
              </div>
            </div>
          </div>

          <v-card-text class="d-flex align-center flex-wrap ga-2 py-4">
            <v-chip color="primary" variant="tonal" size="small">
              <v-icon start size="small">mdi-bank</v-icon>
              {{ $t('cotizacion.housesCount', { count: quotes.length }) }}
            </v-chip>
            <v-chip color="success" variant="tonal" size="small">
              <v-icon start size="small">mdi-autorenew</v-icon>
              {{ $t('cotizacion.updatedAuto') }}
            </v-chip>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Best buy / best sell highlights -->
    <v-row v-if="bestBuy || bestSell" class="mt-2">
      <v-col v-if="bestSell" cols="12" md="6">
        <v-card class="pa-4" color="success" variant="tonal" data-testid="cotizacion-best-sell">
          <div class="text-overline">{{ $t('cotizacion.bestToBuy') }}</div>
          <div class="d-flex align-center justify-space-between flex-wrap ga-2">
            <span class="text-h6 font-weight-bold">{{ bestSell.name }}</span>
            <span class="text-h6">{{ formatRate(bestSell.sell) }}</span>
          </div>
        </v-card>
      </v-col>
      <v-col v-if="bestBuy" cols="12" md="6">
        <v-card class="pa-4" color="primary" variant="tonal" data-testid="cotizacion-best-buy">
          <div class="text-overline">{{ $t('cotizacion.bestToSell') }}</div>
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
        <p class="mt-4 text-h6">{{ $t('cotizacion.loading') }}</p>
      </v-col>
    </v-row>

    <!-- Quotes table -->
    <template v-else>
      <v-row class="mt-2">
        <v-col cols="12">
          <v-card>
            <v-card-title class="d-flex align-center py-3">
              <v-icon start>mdi-table</v-icon>
              {{ $t('cotizacion.tableTitle', { currency: currencyName }) }}
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
              data-testid="cotizacion-quotes"
            >
              <template #item.name="{ item }">
                <span class="font-weight-medium" data-testid="cotizacion-house-name">
                  {{ item.name }}
                </span>
                <v-chip
                  v-if="item.bestBuy"
                  color="primary"
                  size="x-small"
                  variant="flat"
                  class="ms-2"
                >
                  {{ $t('cotizacion.tagBestBuy') }}
                </v-chip>
                <v-chip
                  v-if="item.bestSell"
                  color="success"
                  size="x-small"
                  variant="flat"
                  class="ms-2"
                >
                  {{ $t('cotizacion.tagBestSell') }}
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
                    {{ $t('cotizacion.viewCasa') }}
                  </v-btn>
                  <v-btn
                    :to="localePath(`/historico/${item.origin}/${code}`)"
                    color="secondary"
                    variant="text"
                    size="small"
                  >
                    <v-icon start size="small">mdi-chart-line</v-icon>
                    {{ $t('cotizacion.viewHistory') }}
                  </v-btn>
                </div>
              </template>
            </v-data-table>

            <!-- No quotes -->
            <v-card-text v-else class="text-center pa-8" data-testid="cotizacion-empty">
              <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-bank-off</v-icon>
              <h2 class="text-h6 mb-2">{{ $t('cotizacion.emptyTitle') }}</h2>
              <p class="text-body-2 text-grey">
                {{ $t('cotizacion.emptyText', { currency: currencyName }) }}
              </p>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- SEO copy + CTAs -->
      <v-row class="mt-2">
        <v-col cols="12">
          <v-card class="cta-cotizacion pa-6 text-center" variant="flat">
            <h2 class="text-h6 font-weight-bold mb-2 text-white">
              {{ $t('cotizacion.ctaTitle', { currency: currencyName }) }}
            </h2>
            <p class="text-body-2 text-grey-lighten-1 mb-4">
              {{ $t('cotizacion.ctaText') }}
            </p>
            <div class="d-flex justify-center flex-wrap ga-2">
              <v-btn :to="localePath('/')" color="primary" variant="elevated">
                <v-icon start>mdi-chart-line</v-icon>
                {{ $t('cotizacion.ctaButton') }}
              </v-btn>
              <v-btn :to="localePath('/comparar')" color="secondary" variant="tonal">
                <v-icon start>mdi-compare-horizontal</v-icon>
                {{ $t('cotizacion.ctaCompare') }}
              </v-btn>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Internal linking: other currencies -->
      <v-row v-if="relatedCurrencies.length" class="mt-2">
        <v-col cols="12">
          <v-card>
            <v-card-title class="d-flex align-center py-3">
              <v-icon start>mdi-cash-multiple</v-icon>
              {{ $t('cotizacion.otherCurrencies') }}
            </v-card-title>
            <v-card-text class="d-flex flex-wrap ga-2">
              <v-chip
                v-for="cur in relatedCurrencies"
                :key="cur.slug"
                :to="localePath(`/cotizacion/${cur.slug}`)"
                color="primary"
                variant="tonal"
                size="small"
                link
              >
                {{ cur.name }}
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
import { useDisplay } from 'vuetify/lib/composables/display.mjs'
import type { ExchangeRate } from '~/types/api'
import {
  currencyDisplayName,
  currencyFromSlug,
  currencySlug,
  listCurrencySlugs,
  quotesForCurrency,
  type CurrencyCode,
  type CurrencyLang,
  type CurrencyQuote,
} from '~/utils/currencyPages'

// Validate the slug against the supported currency list BEFORE rendering. Running
// in the route guard yields a real 404 status (on SSR and client navigation) and,
// unlike throwing inside setup, never partially renders this component.
definePageMeta({
  validate: route => currencyFromSlug(String(route.params.moneda ?? '')) !== null,
})

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const { smAndDown } = useDisplay()
const { getProcessedExchangeData } = useApiService()

// Resolved currency code for this slug (validated by the guard above; the `??`
// keeps types non-null for the SSR error-path render before the 404 throws).
const code = computed<CurrencyCode>(
  () => currencyFromSlug(String(route.params.moneda ?? '')) ?? 'USD'
)
const lang = computed<CurrencyLang>(() =>
  (['es', 'en', 'pt'] as const).includes(locale.value as CurrencyLang)
    ? (locale.value as CurrencyLang)
    : 'es'
)
const currencyName = computed(() => currencyDisplayName(code.value, lang.value))

// SSR fetch: today's quotes, reduced to this currency's plain/cash rows with the
// best buy/sell flagged. Keyed by code so each currency page is cached separately.
const { data, pending } = await useAsyncData<CurrencyQuote[] | null>(
  () => `cotizacion-${code.value}`,
  async () => {
    const result = await getProcessedExchangeData('')
    const rows = (result?.exchangeData ?? []) as ExchangeRate[]
    return quotesForCurrency(rows, code.value)
  }
)

// The `validate` hook 404s unknown slugs before this renders; this is a
// belt-and-suspenders fallback that keeps the SSR error-path render empty.
if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Moneda no encontrada' })
}

const quotes = computed<CurrencyQuote[]>(() => data.value ?? [])
const bestBuy = computed<CurrencyQuote | null>(() => quotes.value.find(q => q.bestBuy) ?? null)
const bestSell = computed<CurrencyQuote | null>(() => quotes.value.find(q => q.bestSell) ?? null)

const relatedCurrencies = computed(() =>
  listCurrencySlugs()
    .filter(slug => slug !== currencySlug(code.value))
    .map(slug => ({
      slug,
      name: currencyDisplayName(currencyFromSlug(slug) as CurrencyCode, lang.value),
    }))
)

const headers = computed(() => [
  { title: t('cotizacion.colHouse'), key: 'name', sortable: false },
  { title: t('cotizacion.colBuy'), key: 'buy', sortable: true, align: 'end' as const },
  { title: t('cotizacion.colSell'), key: 'sell', sortable: true, align: 'end' as const },
  { title: '', key: 'actions', sortable: false, align: 'end' as const },
])

const formatRate = (value: number | null): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-'
  return value.toLocaleString('es-UY', {
    style: 'currency',
    currency: 'UYU',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const canonicalUrl = computed(
  () => `https://cambio-uruguay.com/cotizacion/${currencySlug(code.value)}`
)

// Branded OG image for the currency page.
defineOgImageComponent('Cambio', {
  title: () => t('cotizacion.ogTitle', { currency: currencyName.value }),
  subtitle: () => t('cotizacion.ogSubtitle', { currency: currencyName.value }),
  tag: 'COTIZACIÓN',
})

// SEO meta.
useSeoMeta({
  title: () => t('cotizacion.metaTitle', { currency: currencyName.value }),
  description: () => t('cotizacion.metaDescription', { currency: currencyName.value }),
  ogTitle: () => t('cotizacion.metaTitle', { currency: currencyName.value }),
  ogDescription: () => t('cotizacion.metaDescription', { currency: currencyName.value }),
  ogType: 'website',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
  twitterTitle: () => t('cotizacion.metaTitle', { currency: currencyName.value }),
  twitterDescription: () => t('cotizacion.metaDescription', { currency: currencyName.value }),
})

// ExchangeRateSpecification + BreadcrumbList JSON-LD for rich results.
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
              '@type': 'ExchangeRateSpecification',
              currency: code.value,
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
                  name: t('cotizacion.h1', { currency: currencyName.value }),
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
.bg-gradient-cotizacion {
  background: linear-gradient(135deg, #16c784 0%, #2f81f7 100%);
}

.cotizacion-intro {
  max-width: 760px;
  line-height: 1.6;
}

/* Readable CTA on dark theme (avoid Vuetify outlined color tinting the text) */
.cta-cotizacion {
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.28);
  border-radius: 12px;
}
</style>
