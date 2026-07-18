<template>
  <VContainer class="py-6">
    <VRow justify="center">
      <VCol cols="12" md="10" lg="9">
        <VCard class="overflow-hidden mb-5" elevation="8">
          <div class="hero pa-6 on-dark">
            <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-1">
              {{ $t('mejorCasa.h1') }}
            </h1>
            <p class="text-body-1 text-grey-lighten-2 mb-3">{{ $t('mejorCasa.subtitle') }}</p>
            <div class="d-flex justify-start justify-md-end">
              <ShareButtons :text="$t('mejorCasa.h1')" />
            </div>
          </div>

          <!-- The answer, server-rendered: the named winner and what you save.
               This is the one question an answer box cannot settle, because it
               needs all 40 casas' rates, not one. -->
          <VCardText v-if="winner" class="cu-answer pa-5">
            <p class="text-body-1 mb-2">
              {{
                $t('mejorCasa.answer', {
                  casa: winner.name,
                  rate: formatRate(winner.rate),
                  savings: formatMoney(savingsOn1000),
                  count: ranking.ranked.length,
                })
              }}
            </p>
            <p class="text-body-2 text-medium-emphasis mb-0">
              {{ $t('mejorCasa.average', { average: formatRate(ranking.marketAverage) }) }}
              <time :datetime="asOfIso">{{ $t('mejorCasa.asOf', { date: asOfDate }) }}</time>
            </p>
          </VCardText>
        </VCard>

        <VCard v-if="pending" class="pa-5 mb-5">
          <VSkeletonLoader type="table" class="bg-transparent" />
        </VCard>

        <VCard v-else-if="ranking.ranked.length" class="pa-0 mb-5">
          <VTable density="comfortable" class="cu-mobile-cards">
            <thead>
              <tr>
                <th>#</th>
                <th>{{ $t('mejorCasa.colCasa') }}</th>
                <th class="text-end">{{ $t('mejorCasa.colRate') }}</th>
                <th class="text-end d-none d-sm-table-cell">{{ $t('mejorCasa.colSavings') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(house, i) in ranking.ranked" :key="house.origin">
                <td data-label="#">{{ i + 1 }}</td>
                <td data-label="">
                  <NuxtLink :to="localePath(`/casa/${house.origin}`)" class="casa-link">
                    {{ house.name }}
                  </NuxtLink>
                </td>
                <td class="text-end font-weight-medium" :data-label="$t('mejorCasa.colRate')">
                  ${{ formatRate(house.rate) }}
                </td>
                <td
                  class="text-end d-none d-sm-table-cell text-medium-emphasis"
                  :data-label="$t('mejorCasa.colSavings')"
                >
                  <span v-if="house.savingsVsAvg > 0">
                    ${{ formatMoney(house.savingsVsAvg) }}
                  </span>
                  <span v-else>—</span>
                </td>
              </tr>
            </tbody>
          </VTable>
          <VCardText class="text-caption text-medium-emphasis">
            {{ $t('mejorCasa.methodology', { amount: REFERENCE_AMOUNT }) }}
          </VCardText>
        </VCard>

        <VAlert v-else type="info" variant="tonal" class="mb-5">
          {{ $t('mejorCasa.noData') }}
        </VAlert>

        <FaqBlock v-if="faqItems.length" :items="faqItems" :heading="$t('faq.title')" />
      </VCol>
    </VRow>
  </VContainer>
</template>

<script setup lang="ts">
import type { ExchangeRate } from '~/types/api'
import { buildFaqItems, HOME_FAQ_IDS, type FaqItem, type FaqLang } from '~/utils/faqAnswers'
import { rankExchanges } from '~/utils/recommendation'
import { pickOriginRate, publicRates } from '~/utils/rateSource'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { getProcessedExchangeData } = useApiService()

/** The basket the savings figure is quoted on. A round number a reader can scale. */
const REFERENCE_AMOUNT = 1000

// Blocking, so the named winner is in the crawlable HTML. The whole point of the
// page is to answer "which casa is cheapest today" before anyone clicks.
const { data, pending } = await useAsyncData('mejor-casa-rates', async () => {
  const result = await getProcessedExchangeData('')
  return {
    rows: (result?.exchangeData ?? []) as ExchangeRate[],
  }
})

const rawRows = computed<ExchangeRate[]>(() => data.value?.rows ?? [])

// One row per casa, or the ranking lists the same house twice: BROU publishes a
// plain USD quote AND an eBROU quote, and so does Cambio Minas. `pickOriginRate`
// picks each casa's walk-in quote over its conditional ones.
//
// `publicRates` first drops the BCU reference and the interbank/wholesale types:
// a "cheapest casa" list must never rank the central bank, which quotes no
// retail price, nor a rate nobody can transact at.
//
// `ExchangeRate.name` is the CURRENCY's name ("Dólar USA"), not the casa's, so
// the house name comes from localData — the same remap WhereToChange does.
const rankableRows = computed(() => {
  const rows = publicRates(rawRows.value)
  const origins = [...new Set(rows.filter(r => r.code === 'USD').map(r => r.origin))]
  return origins.flatMap(origin => {
    const row = pickOriginRate(rows, origin, 'USD')
    if (!row) return []
    return [
      {
        origin,
        code: row.code,
        buy: row.buy,
        sell: row.sell,
        name: (row as { localData?: { name?: string } }).localData?.name ?? origin,
      },
    ]
  })
})

const ranking = computed(() => rankExchanges(rankableRows.value, 'USD', 'buy', REFERENCE_AMOUNT))

const winner = computed(() => ranking.value.ranked[0] ?? null)

/** What the winner saves you against the market average on the reference basket. */
const savingsOn1000 = computed(() => winner.value?.savingsVsAvg ?? 0)

const localeTag = computed(() =>
  locale.value?.startsWith('en') ? 'en-US' : locale.value?.startsWith('pt') ? 'pt-BR' : 'es-UY'
)

const formatRate = (n: number) =>
  n.toLocaleString(localeTag.value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatMoney = (n: number) =>
  n.toLocaleString(localeTag.value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })

/** The freshest scrape date in the payload — never `new Date()`. */
const asOfIso = computed(() => {
  const dates = rawRows.value
    .map(r => (r.date ? new Date(r.date).getTime() : Number.NaN))
    .filter(Number.isFinite)
  return dates.length ? new Date(Math.max(...dates)).toISOString() : ''
})

const asOfDate = computed(() =>
  asOfIso.value
    ? new Date(asOfIso.value).toLocaleDateString(localeTag.value, {
        timeZone: 'America/Montevideo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : ''
)

// Reuse the site's data-grounded answers rather than authoring a second set of
// FAQ prose. buildFaqItems takes the RAW rows — it filters internally.
const faqItems = computed<FaqItem[]>(() => {
  const lang = (
    locale.value?.startsWith('en') ? 'en' : locale.value?.startsWith('pt') ? 'pt' : 'es'
  ) as FaqLang
  const all = buildFaqItems(rawRows.value, lang)
  return all.filter(item => HOME_FAQ_IDS.includes(item.id as (typeof HOME_FAQ_IDS)[number]))
})

const canonical = 'https://cambio-uruguay.com/mejor-casa-de-cambio'

const metaDescription = computed(() => {
  if (!winner.value) return t('mejorCasa.metaDescriptionGeneric')
  return t('mejorCasa.metaDescription', {
    casa: winner.value.name,
    rate: formatRate(winner.value.rate),
    savings: formatMoney(savingsOn1000.value),
  })
})

defineOgImageComponent('Cambio', {
  title: () => t('mejorCasa.h1'),
  subtitle: () => t('mejorCasa.subtitle'),
  tag: 'MEJOR CASA',
})

useSeoMeta({
  title: () => t('mejorCasa.metaTitle'),
  description: () => metaDescription.value,
  ogTitle: () => t('mejorCasa.metaTitle'),
  ogDescription: () => metaDescription.value,
  ogType: 'website',
  ogUrl: canonical,
  twitterCard: 'summary_large_image',
})

// BreadcrumbList + ItemList only. FaqBlock already emits the FAQPage JSON-LD;
// a second one on the same page would compete with it.
useHead(() => ({
  link: [{ key: 'i18n-can', hid: 'i18n-can', rel: 'canonical', href: canonical }],
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
          { '@type': 'ListItem', position: 2, name: t('mejorCasa.h1'), item: canonical },
        ],
      }),
    },
    {
      type: 'application/ld+json',
      innerHTML: computed(() =>
        ranking.value.ranked.length
          ? JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'ItemList',
              name: t('mejorCasa.metaTitle'),
              itemListOrder: 'https://schema.org/ItemListOrderAscending',
              numberOfItems: ranking.value.ranked.length,
              itemListElement: ranking.value.ranked.slice(0, 10).map((h, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: h.name,
                url: `https://cambio-uruguay.com/casa/${h.origin}`,
              })),
            })
          : ''
      ),
    },
  ],
}))
</script>

<style scoped>
.hero {
  background: linear-gradient(135deg, #2f81f7 0%, #16c784 100%);
}

.cu-answer {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.casa-link {
  color: inherit;
  text-decoration: none;
}

.casa-link:hover,
.casa-link:focus-visible {
  text-decoration: underline;
}
</style>
