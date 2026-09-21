<template>
  <VContainer class="py-6 py-md-10">
    <VBreadcrumbs
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: DIRECTORIOS_HUB.label, to: localePath(DIRECTORIOS_HUB.path) },
        { title: 'Equipar una casa', to: localePath('/equipar-casa-uruguay') },
        { title: 'Avisos' },
      ]"
      class="px-0 mb-2"
    />
    <header class="mb-6">
      <h1 class="text-h4 font-weight-bold mb-2">Productos para equipar la casa en Uruguay</h1>
      <p class="text-body-1 mb-2">
        Los avisos de heladeras, colchones, lavarropas, ollas, sábanas y todo lo que una casa vacía
        necesita, de Mercado Libre, Facebook Marketplace y las tiendas uruguayas, en un solo
        buscador con filtros por categoría, condición, marca y precio.
        <template v-if="data">
          Hoy hay {{ data.total.toLocaleString('es-UY') }} avisos vigentes<template
            v-if="data.generatedAt"
            >; última lectura el {{ formatDate(data.generatedAt) }}</template
          >.
        </template>
      </p>
      <div class="d-flex flex-wrap ga-2">
        <VBtn
          variant="outlined"
          :to="localePath(EQUIPAR_LISTA_PATH)"
          prepend-icon="mdi-playlist-check"
        >
          Mi lista
        </VBtn>
      </div>
    </header>

    <EquiparDirectorio
      :query="query"
      :data="data"
      :error="error"
      :facets="facets"
      :chips="chips"
      anchor-id="equipar-resultados"
      @update="update"
      @remove="remove"
      @clear="clear"
    />

    <EquiparListaBar />

    <section class="mt-10" aria-labelledby="por-categoria-title">
      <h2 id="por-categoria-title" class="text-h5 mb-3">Avisos por categoría</h2>
      <p class="text-body-2 mb-3">
        Cada categoría tiene su propio buscador, con el tamaño o tipo como primer filtro y la
        comparativa de precios al lado.
      </p>
      <div class="d-flex flex-wrap ga-2">
        <VBtn
          v-for="categoria in categoriaLinks"
          :key="categoria.key"
          size="small"
          variant="outlined"
          :to="localePath(equiparProductoPath(categoria.key))"
        >
          {{ categoria.label }}<template v-if="categoria.count"> ({{ categoria.count }})</template>
        </VBtn>
      </div>
    </section>

    <section class="mt-10" aria-labelledby="como-leer-title">
      <h2 id="como-leer-title" class="text-h5 mb-3">Cómo leer estos datos</h2>
      <ul class="text-body-1 pl-5">
        <li>Son precios <strong>pedidos</strong> en avisos, no precios de venta cerrados.</li>
        <li>
          Las fuentes son Mercado Libre, Facebook Marketplace (Montevideo) y las tiendas uruguayas
          que lee <NuxtLink :to="localePath('/equipar-casa-uruguay')">equipar una casa</NuxtLink>
          todos los días. Un aviso que no vimos en los últimos cuatro días desaparece de acá.
        </li>
        <li>
          Un aviso cuyo precio queda muy por debajo del resto de su categoría (una funda titulada
          como heladera, un error de moneda) no entra en la lista: la cifra de arriba dice cuántos
          quedaron afuera hoy.
        </li>
        <li>
          Los avisos en dólares se muestran en dólares; el filtro de precio y el total de tu lista
          usan la cotización del día.
        </li>
        <li>
          En Marketplace un aviso es usado salvo que el vendedor diga que es nuevo. Nuevo y usado
          nunca se promedian: la
          <NuxtLink :to="localePath('/equipar-casa-uruguay')">comparativa por categoría</NuxtLink>
          publica las dos bandas por separado.
        </li>
        <li>
          «Agregar a mi lista» guarda el aviso en tu navegador, nada más. La lista suma en pesos y
          te dice qué imprescindible te falta.
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { DIRECTORIOS_HUB, directoriosHubListItem } from '~/utils/directorios'
import { EQUIPAR_CATEGORY_PAGES } from '~/utils/equiparCategoryPages'
import {
  EQUIPAR_LISTA_PATH,
  EQUIPAR_PRODUCTOS_PATH,
  equiparProductoPath,
} from '~/utils/equiparProductos'

const localePath = useLocalePath()
const { query, data, error, facets, chips, filtered, update, remove, clear } =
  await useEquiparProductosDirectorio()

/** Every category, in necessity order, with today's count where the facet has one. */
const categoriaLinks = computed(() => {
  const counts = new Map(facets.value.categorias.map(row => [row.slug, row.count]))
  return EQUIPAR_CATEGORY_PAGES.map(page => ({
    key: page.key,
    label: page.label,
    count: counts.get(page.key) ?? 0,
  }))
})

function formatDate(value: string): string {
  const time = Date.parse(value)
  if (Number.isNaN(time)) return value
  return new Date(time).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Montevideo',
  })
}

const canonical = `https://cambio-uruguay.com${EQUIPAR_PRODUCTOS_PATH}`
const title = 'Productos para equipar la casa en Uruguay'
const description =
  'Avisos para equipar una casa en Uruguay: heladeras, colchones, lavarropas y más, nuevos y usados, de Mercado Libre, Marketplace y tiendas. Armá tu lista.'

defineOgImageComponent('Cambio', {
  title,
  subtitle: 'Equipar una casa',
  tag: 'AVISOS',
})

useSeoMeta({
  title: `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogUrl: canonical,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  // Each filter combination is a thin copy of this page: only the base URL is indexed.
  robots: () => (filtered.value ? 'noindex, follow' : 'index, follow'),
})

useHead({
  link: [{ rel: 'canonical', href: canonical }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'CollectionPage', name: title, description, url: canonical },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Inicio',
                item: 'https://cambio-uruguay.com/',
              },
              directoriosHubListItem(2),
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Equipar una casa',
                item: 'https://cambio-uruguay.com/equipar-casa-uruguay',
              },
              { '@type': 'ListItem', position: 4, name: 'Avisos', item: canonical },
            ],
          },
        ],
      }),
    },
  ],
})
</script>
