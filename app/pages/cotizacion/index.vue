<template>
  <div class="cotizacion-hub">
    <VContainer>
      <header class="text-center py-8 py-md-12">
        <VChip class="mb-4" color="primary" size="small" variant="tonal">
          <VIcon start size="small">mdi-cash-multiple</VIcon>
          COTIZACIONES
        </VChip>
        <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
          Cotizaciones de todas las monedas en Uruguay hoy
        </h1>
        <p class="text-body-1 text-grey-lighten-1 mx-auto cotizacion-intro">
          Compará la cotización de compra y venta del dólar, el euro, el real y muchas otras monedas
          —incluido el oro— entre las casas de cambio de Uruguay. Precios actualizados
          automáticamente para que encuentres dónde comprar y vender al mejor precio.
        </p>
        <div class="d-flex justify-center mt-4">
          <ShareButtons :url="canonicalUrl" />
        </div>
      </header>

      <section v-for="group in groups" :key="group.titleKey" class="mb-8">
        <h2 class="text-h6 font-weight-bold mb-4 d-flex align-center">
          <VIcon start color="primary">{{ group.icon }}</VIcon>
          {{ group.label }}
        </h2>
        <VRow>
          <VCol v-for="cur in group.items" :key="cur.slug" cols="12" sm="6" md="4">
            <VCard
              :to="localePath(`/cotizacion/${cur.slug}`)"
              class="h-100 cur-card"
              variant="tonal"
              link
            >
              <VCardItem>
                <template #prepend>
                  <VAvatar color="primary" variant="tonal" size="40">
                    <VIcon>{{ group.icon }}</VIcon>
                  </VAvatar>
                </template>
                <VCardTitle class="text-body-1 font-weight-bold">{{ cur.name }}</VCardTitle>
                <VCardSubtitle v-if="cur.count">{{ cur.count }} casas de cambio</VCardSubtitle>
                <VCardSubtitle v-else>Cotización de referencia</VCardSubtitle>
              </VCardItem>
              <VCardText class="pt-0">
                <div class="d-flex justify-space-between text-body-2">
                  <span class="text-grey-lighten-1">Compra desde</span>
                  <span class="font-weight-medium">{{ formatRate(cur.buy) }}</span>
                </div>
                <div class="d-flex justify-space-between text-body-2">
                  <span class="text-grey-lighten-1">Venta desde</span>
                  <span class="font-weight-medium">{{ formatRate(cur.sell) }}</span>
                </div>
              </VCardText>
            </VCard>
          </VCol>
        </VRow>
      </section>

      <section class="mb-8">
        <h2 class="text-h6 font-weight-bold mb-4 d-flex align-center">
          <VIcon start color="primary">mdi-frequently-asked-questions</VIcon>
          Preguntas frecuentes sobre las cotizaciones
        </h2>
        <VExpansionPanels variant="accordion">
          <VExpansionPanel v-for="(faq, i) in faqs" :key="i">
            <VExpansionPanelTitle class="font-weight-medium">
              {{ faq.question }}
            </VExpansionPanelTitle>
            <VExpansionPanelText class="text-body-2">{{ faq.answer }}</VExpansionPanelText>
          </VExpansionPanel>
        </VExpansionPanels>
      </section>

      <VCard class="cta-cotizacion my-8 pa-6 text-center" variant="flat">
        <h2 class="text-h6 font-weight-bold mb-2 text-white">¿Buscás el mejor precio del dólar?</h2>
        <p class="text-body-2 text-grey-lighten-1 mb-4">
          Usá el comparador para ver, en vivo, la casa de cambio con el mejor precio en todo el
          país.
        </p>
        <div class="d-flex justify-center flex-wrap ga-2">
          <VBtn :to="localePath('/')" color="primary" variant="elevated">
            <VIcon start>mdi-chart-line</VIcon>
            Ir al comparador
          </VBtn>
          <VBtn :to="localePath('/convertir')" color="secondary" variant="tonal">
            <VIcon start>mdi-cash-sync</VIcon>
            Convertir montos
          </VBtn>
        </div>
      </VCard>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import type { ExchangeRate } from '~/types/api'
import {
  CURRENCY_GROUPS,
  currencyDisplayName,
  currencyFromSlug,
  quotesForCurrency,
  type CurrencyCode,
} from '~/utils/currencyPages'

const localePath = useLocalePath()
const { getProcessedExchangeData } = useApiService()

// Spanish labels + icons for each group (the hub is Spanish-targeted, like /convertir).
const GROUP_META: Record<string, { label: string; icon: string }> = {
  groupMajors: { label: 'Monedas principales', icon: 'mdi-currency-usd' },
  groupRegion: { label: 'Región y viajes', icon: 'mdi-airplane' },
  groupIntl: { label: 'Monedas internacionales', icon: 'mdi-earth' },
  groupCommodities: { label: 'Metales preciosos', icon: 'mdi-gold' },
}

// SSR fetch: today's quotes once, summarised per currency (best buy/sell + count).
const { data } = await useAsyncData('cotizacion-hub', async () => {
  const result = await getProcessedExchangeData('')
  const rows = (result?.exchangeData ?? []) as ExchangeRate[]
  const summary: Record<string, { buy: number | null; sell: number | null; count: number }> = {}
  for (const group of CURRENCY_GROUPS) {
    for (const slug of group.slugs) {
      const code = currencyFromSlug(slug) as CurrencyCode
      const quotes = quotesForCurrency(rows, code)
      const buys = quotes.map(q => q.buy).filter((n): n is number => typeof n === 'number' && n > 0)
      const sells = quotes
        .map(q => q.sell)
        .filter((n): n is number => typeof n === 'number' && n > 0)
      summary[slug] = {
        buy: buys.length ? Math.max(...buys) : null,
        sell: sells.length ? Math.min(...sells) : null,
        count: quotes.length,
      }
    }
  }
  return summary
})

const groups = computed(() =>
  CURRENCY_GROUPS.map(group => ({
    titleKey: group.titleKey,
    label: GROUP_META[group.titleKey]?.label ?? group.titleKey,
    icon: GROUP_META[group.titleKey]?.icon ?? 'mdi-cash',
    items: group.slugs.map(slug => {
      const code = currencyFromSlug(slug) as CurrencyCode
      const s = data.value?.[slug]
      return {
        slug,
        name: currencyDisplayName(code, 'es'),
        buy: s?.buy ?? null,
        sell: s?.sell ?? null,
        count: s?.count ?? 0,
      }
    }),
  }))
)

const formatRate = (value: number | null): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  const small = value !== 0 && Math.abs(value) < 1
  return value.toLocaleString('es-UY', {
    style: 'currency',
    currency: 'UYU',
    minimumFractionDigits: 2,
    maximumFractionDigits: small ? 4 : 2,
  })
}

// FAQ aimed at featured snippets / AI Overviews for "cotizaciones uruguay".
const faqs = [
  {
    question: '¿Dónde comprar dólares al mejor precio en Uruguay?',
    answer:
      'Para comprar al mejor precio conviene comparar la cotización de venta de varias casas de cambio: la diferencia entre la más barata y la más cara puede ser de varios pesos por dólar. En Cambio Uruguay mostramos esos precios actualizados automáticamente para que compres donde más te conviene.',
  },
  {
    question: '¿Cada cuánto se actualizan las cotizaciones?',
    answer:
      'Las cotizaciones se actualizan automáticamente varias veces al día, con datos de más de 40 casas de cambio y del Banco Central del Uruguay (BCU), de modo que la foto que ves es muy cercana al mercado en vivo.',
  },
  {
    question: '¿Qué monedas puedo comparar además del dólar?',
    answer:
      'Además del dólar, podés comparar el euro, el real, el peso argentino, la libra esterlina, el yen, el franco suizo, el guaraní, el peso chileno y otras monedas, e incluso el precio del oro, en las casas de cambio que las cotizan.',
  },
  {
    question: '¿Cuál es la diferencia entre el precio de compra y el de venta?',
    answer:
      'La casa de cambio compra la moneda a un precio (compra) y la vende a otro más alto (venta). Si vos comprás dólares, te importa el precio de venta; si los vendés, el de compra. La diferencia entre ambos se llama spread.',
  },
  {
    question: '¿Conviene cambiar dólares en el aeropuerto?',
    answer:
      'En general no: en aeropuertos y zonas turísticas las cotizaciones suelen ser menos favorables. Comparar entre casas de cambio antes de operar casi siempre te deja mejor parado, sobre todo en montos altos.',
  },
]

const canonicalUrl = 'https://cambio-uruguay.com/cotizacion'

defineOgImageComponent('Cambio', {
  title: 'Cotizaciones de todas las monedas en Uruguay',
  subtitle: 'Dólar, euro, real, oro y más, en vivo por casa de cambio',
  tag: 'COTIZACIONES',
})

useSeoMeta({
  title: 'Cotizaciones de Todas las Monedas en Uruguay Hoy | Cambio Uruguay',
  description:
    'Cotización de compra y venta del dólar, euro, real, peso argentino, oro y más monedas en las casas de cambio de Uruguay. Precios en vivo para comprar y vender al mejor precio.',
  ogTitle: 'Cotizaciones de todas las monedas en Uruguay hoy',
  ogDescription:
    'Compará el precio de compra y venta de cada moneda entre las casas de cambio de Uruguay.',
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
})

// BreadcrumbList + ItemList JSON-LD so the hub can earn rich results.
useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebPage',
            '@id': `${canonicalUrl}#webpage`,
            url: canonicalUrl,
            name: 'Cotizaciones de todas las monedas en Uruguay hoy',
            inLanguage: 'es',
            dateModified: new Date().toISOString(),
            isPartOf: { '@id': 'https://cambio-uruguay.com/#website' },
            speakable: { '@type': 'SpeakableSpecification', cssSelector: ['.cotizacion-intro'] },
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
              { '@type': 'ListItem', position: 2, name: 'Cotizaciones', item: canonicalUrl },
            ],
          },
          {
            '@type': 'ItemList',
            name: 'Cotizaciones de monedas en Uruguay',
            itemListElement: CURRENCY_GROUPS.flatMap(g => g.slugs).map((slug, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: currencyDisplayName(currencyFromSlug(slug) as CurrencyCode, 'es'),
              url: `https://cambio-uruguay.com/cotizacion/${slug}`,
            })),
          },
          {
            '@type': 'FAQPage',
            mainEntity: faqs.map(f => ({
              '@type': 'Question',
              name: f.question,
              acceptedAnswer: { '@type': 'Answer', text: f.answer },
            })),
          },
        ],
      }),
    },
  ],
})
</script>

<style scoped>
.cotizacion-intro {
  max-width: 780px;
  line-height: 1.7;
}
.cur-card {
  transition: transform 0.15s ease;
}
.cur-card:hover {
  transform: translateY(-2px);
}
.cta-cotizacion {
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.28);
  border-radius: 12px;
}
</style>
