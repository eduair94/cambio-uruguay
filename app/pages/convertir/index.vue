<template>
  <div class="convert-hub">
    <VContainer>
      <header class="text-center pt-2 pb-6 py-md-12">
        <VChip class="mb-4" color="primary" size="small" variant="tonal">
          <VIcon start size="small">mdi-cash-sync</VIcon>
          CONVERSIONES
        </VChip>
        <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
          Conversiones de monedas a pesos uruguayos
        </h1>
        <p class="text-body-1 text-grey-lighten-1 mx-auto convert-intro">
          ¿Cuánto es 100 dólares en pesos uruguayos? ¿Y 1.000 pesos en dólares? Encontrá la
          conversión exacta con la cotización en vivo de más de 40 casas de cambio. Elegí un monto
          frecuente o usá el
          <NuxtLink :to="localePath('/herramientas/conversor-de-monedas')">conversor</NuxtLink>.
        </p>
        <div class="d-flex justify-center mt-4">
          <ShareButtons :url="canonicalUrl" />
        </div>
      </header>

      <section v-for="group in groups" :key="group.key" class="mb-8">
        <h2 class="text-h6 font-weight-bold mb-4 d-flex align-center">
          <VIcon start color="primary">mdi-swap-horizontal</VIcon>
          {{ group.label }}
        </h2>
        <div class="d-flex flex-wrap ga-2">
          <VChip
            v-for="entry in group.items"
            :key="entry.slug"
            :to="localePath(`/convertir/${entry.slug}`)"
            color="primary"
            variant="tonal"
            link
          >
            {{ amountLabel(entry.amount, entry.from) }}
          </VChip>
        </div>
      </section>

      <VCard class="cta-convert my-8 pa-6 text-center" variant="flat">
        <h2 class="text-h6 font-weight-bold mb-2 text-white">Compará todas las casas de cambio</h2>
        <p class="text-body-2 text-grey-lighten-1 mb-4">
          Mirá el detalle de compra y venta por casa antes de operar.
        </p>
        <VBtn :to="localePath('/cotizacion/dolar')" color="primary" variant="elevated">
          <VIcon start>mdi-chart-line</VIcon>
          Cotización del dólar
        </VBtn>
      </VCard>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import { amountLabel, convertEntries, CONVERT_CURRENCIES, type ConvertCode } from '~/utils/convert'

const localePath = useLocalePath()

// Group entries by directed pair for the hub listing.
const groups = (() => {
  const seen = new Map<
    string,
    { key: string; label: string; items: (typeof convertEntries)[number][] }
  >()
  for (const entry of convertEntries) {
    const key = `${entry.from}-${entry.to}`
    if (!seen.has(key)) {
      const fromN = CONVERT_CURRENCIES[entry.from as ConvertCode].plural
      const toN = CONVERT_CURRENCIES[entry.to as ConvertCode].plural
      seen.set(key, {
        key,
        label: `De ${fromN} a ${toN}`,
        items: [],
      })
    }
    seen.get(key)!.items.push(entry)
  }
  return Array.from(seen.values())
})()

const canonicalUrl = 'https://cambio-uruguay.com/convertir'

defineOgImageComponent('Cambio', {
  title: 'Conversiones de monedas a pesos uruguayos',
  subtitle: 'Dólar, euro, real y peso argentino con cotización en vivo',
  tag: 'CONVERTIR',
})

useSeoMeta({
  title: 'Conversiones de monedas a pesos uruguayos | Cambio Uruguay',
  description:
    'Cuánto es en pesos uruguayos: convertí dólares, euros, reales y pesos argentinos con la cotización en vivo de más de 40 casas de cambio. Montos frecuentes listos para consultar.',
  ogTitle: 'Conversiones de monedas a pesos uruguayos',
  ogDescription:
    'Convertí dólares, euros, reales y pesos argentinos a pesos uruguayos con cotización en vivo.',
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
})

// BreadcrumbList so the hub sits in the crawl trail, plus an ItemList of the
// directed pairs it links to, so the conversion families can earn rich results.
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
            name: 'Conversiones de monedas a pesos uruguayos',
            inLanguage: 'es',
            isPartOf: { '@id': 'https://cambio-uruguay.com/#website' },
            speakable: { '@type': 'SpeakableSpecification', cssSelector: ['.convert-intro'] },
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
              { '@type': 'ListItem', position: 2, name: 'Conversiones', item: canonicalUrl },
            ],
          },
          {
            '@type': 'ItemList',
            name: 'Conversiones frecuentes de monedas',
            itemListElement: convertEntries.map((entry, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: amountLabel(entry.amount, entry.from),
              url: `https://cambio-uruguay.com/convertir/${entry.slug}`,
            })),
          },
        ],
      }),
    },
  ],
})
</script>

<style scoped>
.convert-intro {
  max-width: 760px;
  line-height: 1.7;
}
.convert-intro :deep(a) {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}
.convert-intro :deep(a:hover) {
  text-decoration: underline;
}
.cta-convert {
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.28);
  border-radius: 12px;
}
</style>
