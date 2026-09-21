<template>
  <VContainer class="py-6 py-md-10">
    <VBreadcrumbs
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: 'Equipar una casa', to: localePath('/equipar-casa-uruguay') },
        { title: 'Avisos', to: localePath(EQUIPAR_PRODUCTOS_PATH) },
        { title: page.label },
      ]"
      class="px-0 mb-2"
    />
    <header class="mb-6">
      <h1 class="text-h4 font-weight-bold mb-2">{{ h1 }}</h1>
      <p class="text-body-1 mb-2">
        {{ intro }}
        <template v-if="data">
          Hoy hay {{ data.total.toLocaleString('es-UY') }}
          {{ data.total === 1 ? 'aviso vigente' : 'avisos vigentes'
          }}<template v-if="sourceLine"> ({{ sourceLine }})</template>.
        </template>
      </p>
      <div class="d-flex flex-wrap ga-2">
        <VBtn
          color="primary"
          variant="tonal"
          :to="localePath(`/equipar-casa-uruguay/${slug}`)"
          prepend-icon="mdi-chart-line"
        >
          Cuánto sale: precios y modelos
        </VBtn>
        <VBtn
          variant="outlined"
          :to="localePath(EQUIPAR_PRODUCTOS_PATH)"
          prepend-icon="mdi-view-grid-outline"
        >
          Todas las categorías
        </VBtn>
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
      :fixed-categoria="slug"
      anchor-id="equipar-resultados"
      @update="update"
      @remove="remove"
      @clear="clear"
    />

    <EquiparListaBar />

    <section v-if="siblings.length" class="mt-10" aria-labelledby="otras-title">
      <h2 id="otras-title" class="text-h5 mb-3">Otras categorías {{ roomName }}</h2>
      <div class="d-flex flex-wrap ga-2">
        <VBtn
          v-for="sibling in siblings"
          :key="sibling.key"
          size="small"
          variant="outlined"
          :to="localePath(equiparProductoPath(sibling.key))"
        >
          {{ sibling.label }}
        </VBtn>
      </div>
    </section>

    <section class="mt-10" aria-labelledby="como-leer-title">
      <h2 id="como-leer-title" class="text-h5 mb-3">Cómo leer estos datos</h2>
      <ul class="text-body-1 pl-5">
        <li>Son precios <strong>pedidos</strong> en avisos, no precios de venta cerrados.</li>
        <li>
          Un aviso que no vimos en los últimos cuatro días desaparece de acá; uno cuyo precio queda
          muy por debajo del resto de la categoría (un accesorio mal titulado, un error de moneda)
          no entra en la lista.
        </li>
        <li>
          Nuevo y usado nunca se promedian. La banda de precio por tamaño, la mediana de cada día y
          los modelos con más vendedores están en
          <NuxtLink :to="localePath(`/equipar-casa-uruguay/${slug}`)"
            >{{ page.label }}: cuánto sale</NuxtLink
          >.
        </li>
        <li v-if="page.usedNote">{{ page.usedNote }}</li>
        <li>
          «Agregar a mi lista» guarda el aviso en tu navegador, nada más; la lista suma en pesos y
          te dice qué imprescindible te falta.
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  EQUIPAR_CATEGORY_PAGES,
  equiparCategoryPage,
  equiparGrammarFor,
  isEquiparCategorySlug,
} from '~/utils/equiparCategoryPages'
import {
  EQUIPAR_LISTA_PATH,
  EQUIPAR_PRODUCTOS_PATH,
  equiparProductoPath,
} from '~/utils/equiparProductos'

// A real 404 for an invented slug: `validate` runs before setup. Only the imported function is
// visible to the macro, never a module constant.
definePageMeta({
  validate: route => isEquiparCategorySlug(String(route.params.categoria ?? '')),
})

const route = useRoute()
const localePath = useLocalePath()
const slug = computed(() => String(route.params.categoria ?? ''))
const found = equiparCategoryPage(slug.value)
if (!found) {
  throw createError({ statusCode: 404, statusMessage: 'Categoría no encontrada', fatal: true })
}
const page = computed(() => equiparCategoryPage(slug.value) ?? found)

const { query, data, error, facets, chips, filtered, update, remove, clear } =
  await useEquiparProductosDirectorio(slug.value)

const grammar = computed(() => equiparGrammarFor(slug.value))
/** "nuevas y usadas" / "nuevos y usados", agreeing with the category noun. */
const nuevosYUsados = computed(() =>
  grammar.value.gender === 'f' ? 'nuevas y usadas' : 'nuevos y usados'
)
const plural = computed(
  () => page.value.plural.charAt(0).toUpperCase() + page.value.plural.slice(1)
)
const h1 = computed(() => `${plural.value} en venta en Uruguay: ${nuevosYUsados.value}`)
const intro = computed(
  () =>
    `Todos los avisos de ${page.value.plural.toLowerCase()} de Mercado Libre, Facebook Marketplace y las tiendas uruguayas, con filtros por tamaño, condición, marca, vendedor y precio.`
)

const sourceLine = computed(() =>
  (facets.value.fuentes ?? [])
    .filter(row => row.count > 0)
    .map(row => `${row.name} ${row.count.toLocaleString('es-UY')}`)
    .join(' · ')
)

const ROOM_NAMES: Record<string, string> = {
  cocina: 'de la cocina',
  dormitorio: 'del dormitorio',
  bano: 'del baño',
  living: 'del living',
  limpieza: 'de limpieza',
}
const roomName = computed(() => ROOM_NAMES[page.value.room] ?? '')
const siblings = computed(() =>
  EQUIPAR_CATEGORY_PAGES.filter(other => other.room === page.value.room && other.key !== slug.value)
)

const canonical = computed(() => `https://cambio-uruguay.com${equiparProductoPath(slug.value)}`)
const titleText = computed(() => `${plural.value} en venta en Uruguay`)
const description = computed(
  () =>
    `${plural.value} ${nuevosYUsados.value} en venta en Uruguay: avisos de Mercado Libre, Marketplace y tiendas, con filtros por tamaño, marca y precio. Armá tu lista.`
)

defineOgImageComponent('Cambio', {
  title: () => titleText.value,
  subtitle: 'Avisos para equipar la casa',
  tag: 'AVISOS',
})

useSeoMeta({
  title: () => `${titleText.value} | Cambio Uruguay`,
  description: () => description.value,
  ogTitle: () => titleText.value,
  ogDescription: () => description.value,
  ogUrl: () => canonical.value,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  // A filter beyond the route's own category is a thin copy: only the clean URL is indexed.
  robots: () => (filtered.value ? 'noindex, follow' : 'index, follow'),
})

/**
 * Up to 10 listings with price and link: never ratings, which this site does not measure. Price
 * and URL come from the SAME listing, so the Offer never states a price the link does not show.
 */
const productsLd = computed(() =>
  (data.value?.items ?? []).slice(0, 10).map((producto, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    item: {
      '@type': 'Product',
      name: producto.title,
      ...(producto.brand ? { brand: { '@type': 'Brand', name: producto.brand } } : {}),
      ...(producto.image ? { image: producto.image } : {}),
      offers: {
        '@type': 'Offer',
        price: producto.priceUyu,
        priceCurrency: 'UYU',
        itemCondition:
          producto.condition === 'used'
            ? 'https://schema.org/UsedCondition'
            : 'https://schema.org/NewCondition',
        availability: 'https://schema.org/InStock',
        url: producto.url,
        seller: { '@type': 'Organization', name: producto.sellerName },
      },
    },
  }))
)

useHead({
  link: [{ rel: 'canonical', href: canonical }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'CollectionPage',
            name: titleText.value,
            description: description.value,
            url: canonical.value,
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Inicio',
                item: 'https://cambio-uruguay.com/',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Equipar una casa',
                item: 'https://cambio-uruguay.com/equipar-casa-uruguay',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Avisos',
                item: `https://cambio-uruguay.com${EQUIPAR_PRODUCTOS_PATH}`,
              },
              { '@type': 'ListItem', position: 4, name: page.value.label, item: canonical.value },
            ],
          },
          ...(productsLd.value.length
            ? [
                {
                  '@type': 'ItemList',
                  name: titleText.value,
                  numberOfItems: productsLd.value.length,
                  itemListElement: productsLd.value,
                },
              ]
            : []),
        ],
      }),
    },
  ],
})
</script>
