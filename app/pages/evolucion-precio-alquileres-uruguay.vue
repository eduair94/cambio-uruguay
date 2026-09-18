<!--
THESIS: "¿Bajan o suben los alquileres?" no se contesta con la mediana de hoy contra la de ayer: la
mediana se mueve también cuando cambia qué avisos hay publicados. La página separa las dos cosas:
cuánto se pide (nivel) y cuánto cambió el mismo aviso (misma oferta).
STORY: la serie por zona, tipo y dormitorios; cómo se mide; a dónde seguir; FAQ.
FORM: página de lectura con un explorador; el estado vive en la URL.
-->
<template>
  <VContainer class="page py-6 py-md-10">
    <header class="hero mb-6">
      <p class="eyebrow">Alquileres · Uruguay</p>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-2">
        Cuánto se mueve el precio de los alquileres en Uruguay
      </h1>
      <p class="text-body-1 text-medium-emphasis mb-2">
        Todos los días leemos los alquileres publicados en Mercado Libre, InfoCasas, El País,
        Casasweb y Facebook Marketplace y guardamos, por barrio, tipo de vivienda y dormitorios,
        cuánto se pide y cuánto cambió cada aviso contra su propio precio de hace una semana, un mes
        y tres meses.
      </p>
    </header>

    <section class="page-section" aria-labelledby="serie-title">
      <h2 id="serie-title" class="section-heading mb-3">La serie, por zona, tipo y dormitorios</h2>
      <MarketSeriesExplorer vertical="alquiler" />
    </section>

    <section class="page-section" aria-labelledby="como-title">
      <h2 id="como-title" class="section-heading mb-3">Cómo lo medimos</h2>
      <ul class="method-list">
        <li>
          <strong>Mediana pedida.</strong> Una observación por vivienda, aunque esté publicada en
          varios portales (tomamos la lectura más reciente, nunca la más barata). Se publica con
          {{ MARKET_SAMPLE_MINIMUM }} viviendas o más.
        </li>
        <li>
          <strong>Misma oferta.</strong> Cada aviso contra su propio precio de hace 7, 30 o 90 días.
          No cambia porque entren avisos baratos o se vayan los caros: sólo se mueve si los dueños
          repreciaron. Se publica con {{ MARKET_PAIR_MINIMUM }} avisos o más.
        </li>
        <li>
          <strong>Pesos y dólares no se mezclan.</strong> Un alquiler en dólares de Punta del Este
          es otra serie; nunca lo convertimos, porque eso movería la línea con el dólar y no con el
          alquiler.
        </li>
        <li>
          Son precios pedidos, sin gastos comunes. El contrato que se firma puede ser otro número.
        </li>
      </ul>
    </section>

    <section class="page-section" aria-labelledby="seguir-title">
      <h2 id="seguir-title" class="section-heading mb-3">Para seguir</h2>
      <ul class="method-list">
        <li>
          <NuxtLink :to="localePath('/alquileres-uruguay')"
            >Todos los alquileres publicados</NuxtLink
          >, con filtros por barrio, precio y garantía.
        </li>
        <li>
          <NuxtLink :to="localePath('/analisis-alquileres-uruguay')"
            >Análisis de alquileres</NuxtLink
          >: percentiles, precio por m² y mapa por barrio de hoy.
        </li>
        <li>
          <NuxtLink :to="localePath('/por-que-no-baja-el-alquiler-uruguay')"
            >Por qué no baja el alquiler</NuxtLink
          >.
        </li>
        <li>
          La misma medida para
          <NuxtLink :to="localePath('/evolucion-precio-viviendas-uruguay')"
            >viviendas en venta</NuxtLink
          >
          y para
          <NuxtLink :to="localePath('/evolucion-precio-autos-usados-uruguay')"
            >autos usados</NuxtLink
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
  query: { v: 'alquiler' },
  key: 'market-index-alquiler',
})
const faq = computed(() => marketSeriesFaq('alquiler', data.value?.index?.trackingSince))

const canonicalUrl = 'https://cambio-uruguay.com/evolucion-precio-alquileres-uruguay'
const title = 'Evolución del alquiler en Uruguay'
const description =
  'Cuánto se pide de alquiler por barrio, tipo y dormitorios, y cuánto cambió el mismo aviso en 7, 30 y 90 días. Pesos y dólares por separado, actualizado a diario.'

defineOgImageComponent('Cambio', {
  title: 'Evolución del alquiler',
  subtitle: 'Por barrio, tipo y dormitorios',
  tag: 'ALQUILERES',
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
        'evolucion precio alquiler uruguay, cuanto subieron los alquileres, bajan los alquileres montevideo, indice de alquileres uruguay, precio alquiler por barrio',
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
            name: 'Evolución del precio del alquiler',
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
