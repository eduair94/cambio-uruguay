<!--
THESIS: "los autos usados están bajando" se dice mucho y se mide poco. La mediana de un modelo se
mueve con la mezcla de años publicada; la página separa cuánto se pide (nivel, por modelo y año) de
cuánto cambió el mismo aviso contra su propio precio (misma oferta).
STORY: la serie por modelo y año; cómo se mide; a dónde seguir; FAQ.
FORM: página de lectura con un explorador; el estado vive en la URL.
-->
<template>
  <VContainer class="page py-6 py-md-10">
    <header class="hero mb-6">
      <p class="eyebrow">Autos usados · Uruguay</p>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-2">
        Cuánto se mueve el precio de los autos usados en Uruguay
      </h1>
      <p class="text-body-1 text-medium-emphasis mb-2">
        Todos los días leemos los autos usados publicados en Mercado Libre, Facebook Marketplace y
        las webs de automotoras y particulares, y guardamos, por modelo y año, cuánto se pide y
        cuánto cambió cada aviso contra su propio precio de hace una semana, un mes y tres meses.
      </p>
    </header>

    <section class="page-section" aria-labelledby="serie-title">
      <h2 id="serie-title" class="section-heading mb-3">La serie, por modelo y año</h2>
      <MarketSeriesExplorer vertical="autos" />
    </section>

    <section class="page-section" aria-labelledby="como-title">
      <h2 id="como-title" class="section-heading mb-3">Cómo lo medimos</h2>
      <ul class="method-list">
        <li>
          <strong>Mediana pedida.</strong> Un aviso, una observación, sólo con precio en dólares
          publicado como tal: una moneda deducida o un precio en pesos convertido quedan afuera. Se
          publica con {{ MARKET_SAMPLE_MINIMUM }} avisos o más.
        </li>
        <li>
          <strong>La mezcla de años engaña.</strong> La mediana de un modelo sube si esta semana hay
          más autos nuevos publicados. Por eso se puede elegir el año, y por eso existe la segunda
          medida.
        </li>
        <li>
          <strong>Misma oferta.</strong> Cada aviso contra su propio precio de hace 7, 30 o 90 días.
          Se publica con {{ MARKET_PAIR_MINIMUM }} avisos o más; un aviso que en ese lapso se
          duplica o se parte a la mitad no cuenta.
        </li>
        <li>
          Quedan afuera los avisos que declaran choque, deuda, recupero o chapa extranjera, igual
          que en la página de cada modelo.
        </li>
      </ul>
    </section>

    <section class="page-section" aria-labelledby="seguir-title">
      <h2 id="seguir-title" class="section-heading mb-3">Para seguir</h2>
      <ul class="method-list">
        <!-- El directorio y sus páginas están en la barra "En esta sección": acá sólo lo que no. -->
        <li>
          La misma medida para
          <NuxtLink :to="localePath('/evolucion-precio-alquileres-uruguay')">alquileres</NuxtLink> y
          para
          <NuxtLink :to="localePath('/evolucion-precio-viviendas-uruguay')"
            >viviendas en venta</NuxtLink
          >.
        </li>
      </ul>
    </section>

    <FaqSection :items="faq" heading="Preguntas frecuentes" :expanded="true" />
  </VContainer>
</template>

<script setup lang="ts">
import {
  marketSeriesFaq,
  MARKET_PAIR_MINIMUM,
  MARKET_SAMPLE_MINIMUM,
  type MarketSeriesIndex,
} from '~/utils/marketSeries'

const localePath = useLocalePath()

// Misma clave que el explorador: una sola petición, compartida.
const { data } = await useFetch<{ index: MarketSeriesIndex | null }>('/api/market-series', {
  query: { v: 'autos' },
  key: 'market-index-autos',
})
const faq = computed(() => marketSeriesFaq('autos', data.value?.index?.trackingSince))

const canonicalUrl = 'https://cambio-uruguay.com/evolucion-precio-autos-usados-uruguay'
const title = 'Evolución del precio de autos usados'
const description =
  'Cuánto se pide por cada modelo y año de auto usado en Uruguay, y cuánto cambió el mismo aviso en 7, 30 y 90 días. En dólares, actualizado a diario.'

defineOgImageComponent('Cambio', {
  title: 'Evolución del precio de autos usados',
  subtitle: 'Por modelo y año',
  tag: 'AUTOS',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'article',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [
    {
      name: 'keywords',
      content:
        'evolucion precio autos usados uruguay, bajan los autos usados uruguay, precio auto usado tendencia, cuanto vale mi auto este mes',
    },
  ],
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
            item: 'https://cambio-uruguay.com/',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Evolución del precio de autos usados',
            item: canonicalUrl,
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.eyebrow {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
  margin-bottom: 4px;
}
.section-heading {
  font-size: 1.25rem;
  font-weight: 800;
}
.page-section {
  margin-bottom: 32px;
}
.method-list {
  margin: 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
