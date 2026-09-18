<!--
THESIS: el precio de la vivienda en venta sube o baja, pero la mediana de los avisos no alcanza para
saberlo: si esta semana entraron casas baratas, baja sola. La página separa cuánto se pide (nivel,
también por m² construido) de cuánto cambió el mismo aviso (misma oferta).
STORY: la serie por zona, tipo y dormitorios; cómo se mide; a dónde seguir; FAQ.
FORM: página de lectura con un explorador; el estado vive en la URL.
-->
<template>
  <VContainer class="page py-6 py-md-10">
    <header class="hero mb-6">
      <p class="eyebrow">Viviendas en venta · Uruguay</p>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-2">
        Cuánto se mueve el precio de las viviendas en venta en Uruguay
      </h1>
      <p class="text-body-1 text-medium-emphasis mb-2">
        Todos los días leemos las casas y apartamentos en venta publicados en InfoCasas y Casasweb y
        guardamos, por barrio, tipo y dormitorios, cuánto se pide —en total y por metro cuadrado
        construido— y cuánto cambió cada aviso contra su propio precio de hace una semana, un mes y
        tres meses.
      </p>
    </header>

    <section class="page-section" aria-labelledby="serie-title">
      <h2 id="serie-title" class="section-heading mb-3">La serie, por zona, tipo y dormitorios</h2>
      <MarketSeriesExplorer vertical="venta" />
    </section>

    <section class="page-section" aria-labelledby="como-title">
      <h2 id="como-title" class="section-heading mb-3">Cómo lo medimos</h2>
      <ul class="method-list">
        <li>
          <strong>Mediana pedida.</strong> Un aviso, una observación. Se publica con
          {{ MARKET_SAMPLE_MINIMUM }} avisos o más; el precio por m² usa sólo la superficie
          construida que declara el propio aviso y pide su propio mínimo.
        </li>
        <li>
          <strong>Misma oferta.</strong> Cada aviso contra su propio precio de hace 7, 30 o 90 días.
          Es la forma de ver si los vendedores están bajando, sin que la mezcla de avisos engañe. Se
          publica con {{ MARKET_PAIR_MINIMUM }} avisos o más.
        </li>
        <li>
          <strong>Dólares y pesos no se mezclan.</strong> Casi todo se publica en dólares; lo que se
          publica en pesos es otra serie, sin conversión.
        </li>
        <li>
          Son precios pedidos. El precio de escritura puede ser otro y no se publica por aviso.
        </li>
      </ul>
    </section>

    <section class="page-section" aria-labelledby="seguir-title">
      <h2 id="seguir-title" class="section-heading mb-3">Para seguir</h2>
      <ul class="method-list">
        <li>
          <NuxtLink :to="localePath('/venta-viviendas-uruguay')"
            >Todas las viviendas en venta</NuxtLink
          >, con mapa y filtros.
        </li>
        <li>
          <NuxtLink :to="localePath('/oportunidades-inmobiliarias-uruguay')"
            >Oportunidades inmobiliarias</NuxtLink
          >: avisos que piden menos que sus comparables.
        </li>
        <li>
          <NuxtLink :to="localePath('/comprar-o-alquilar-uruguay')">¿Comprar o alquilar?</NuxtLink>
        </li>
        <li>
          La misma medida para
          <NuxtLink :to="localePath('/evolucion-precio-alquileres-uruguay')">alquileres</NuxtLink> y
          para
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
  query: { v: 'venta' },
  key: 'market-index-venta',
})
const faq = computed(() => marketSeriesFaq('venta', data.value?.index?.trackingSince))

const canonicalUrl = 'https://cambio-uruguay.com/evolucion-precio-viviendas-uruguay'
const title = 'Evolución del precio de la vivienda'
const description =
  'Cuánto se pide por casas y apartamentos en venta por barrio, en total y por m² construido, y cuánto cambió el mismo aviso en 7, 30 y 90 días. Actualizado a diario.'

defineOgImageComponent('Cambio', {
  title: 'Evolución del precio de la vivienda',
  subtitle: 'Por barrio, en total y por m²',
  tag: 'VIVIENDAS',
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
        'evolucion precio vivienda uruguay, precio metro cuadrado montevideo, bajan los precios de las casas uruguay, precio apartamentos en venta tendencia',
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
            name: 'Evolución del precio de la vivienda',
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
