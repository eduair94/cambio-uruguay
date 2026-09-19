<template>
  <VContainer class="py-6 py-md-10">
    <VBreadcrumbs
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: DIRECTORIOS_HUB.label, to: localePath(DIRECTORIOS_HUB.path) },
        { title: 'Autos usados' },
      ]"
      class="px-0 mb-2"
    />
    <header class="mb-6">
      <h1 class="text-h4 font-weight-bold mb-2">Autos usados en venta en Uruguay</h1>
      <p class="text-body-1 mb-2">
        Los avisos de autos usados de Mercado Libre, Facebook Marketplace, Clasiautos y las webs de
        automotoras en un solo buscador, con el precio en dólares, los kilómetros y la comparación
        contra autos iguales.
        <template v-if="data">
          Hoy hay {{ data.coverage.listings.toLocaleString('es-UY') }} avisos vigentes; última
          lectura el {{ formatCarDate(data.coverage.lastReadAt) }}.
        </template>
      </p>
      <div class="d-flex flex-wrap ga-2">
        <VBtn
          color="primary"
          :to="localePath(CAR_OPPORTUNITIES_PATH)"
          prepend-icon="mdi-tag-arrow-down-outline"
        >
          Ver oportunidades
          <template v-if="data?.coverage.opportunities">
            ({{ data.coverage.opportunities }})
          </template>
        </VBtn>
        <VBtn
          variant="outlined"
          :to="localePath('/comprar-auto-con-deuda-uruguay')"
          prepend-icon="mdi-file-document-check-outline"
        >
          Antes de señar: deudas y SUCIVE
        </VBtn>
      </div>
    </header>

    <VRow>
      <VCol cols="12" md="3">
        <VBtn
          class="d-md-none mb-3"
          variant="outlined"
          block
          prepend-icon="mdi-filter-variant"
          :aria-expanded="filtersOpen"
          @click="filtersOpen = !filtersOpen"
        >
          {{ filtersOpen ? 'Ocultar filtros' : 'Filtros' }}
        </VBtn>
        <div class="cars-filters" :class="{ 'cars-filters--open': filtersOpen }">
          <CarsFilters :query="query" :facets="data?.facets ?? emptyFacets" @apply="update" />
        </div>
      </VCol>
      <VCol cols="12" md="9">
        <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-4">
          <h2 class="text-h6 mb-0">
            {{ data ? `${data.total.toLocaleString('es-UY')} avisos` : 'Avisos' }}
          </h2>
          <VSelect
            :model-value="query.sort"
            :items="sortItems"
            label="Ordenar"
            density="compact"
            variant="outlined"
            hide-details
            class="cars-sort"
            @update:model-value="value => update({ ...query, sort: value, page: 1 })"
          />
        </div>

        <VAlert v-if="error" type="warning" variant="outlined" class="mb-4">
          El directorio se está actualizando. Probá de nuevo en unos minutos.
        </VAlert>
        <p v-else-if="data && !data.items.length" class="text-body-1">
          No hay avisos con esos filtros. Probá ampliar el año, el precio o los kilómetros.
        </p>

        <div v-if="data?.items.length" class="cars-grid">
          <CarsListingCard v-for="car in data.items" :key="car.key" :car="car" />
        </div>

        <VPagination
          v-if="data && data.total > data.perPage"
          :model-value="query.page"
          :length="Math.min(500, Math.ceil(data.total / data.perPage))"
          :total-visible="3"
          class="mt-6"
          @update:model-value="page => update({ ...query, page })"
        />
      </VCol>
    </VRow>

    <section v-if="data?.coverage.models.length" class="mt-10">
      <h2 class="text-h5 mb-3">Precios por modelo</h2>
      <p class="text-body-2 mb-3">
        Cuánto se pide por cada modelo según el año y la versión, con el rango central de los
        avisos.
      </p>
      <div class="d-flex flex-wrap ga-2">
        <VBtn
          v-for="model in data.coverage.models.slice(0, 40)"
          :key="model.slug"
          size="small"
          variant="outlined"
          :to="localePath(carMarketPath(model.slug))"
        >
          {{ model.brand }} {{ model.model }} ({{ model.listings }})
        </VBtn>
      </div>
    </section>

    <section class="mt-10">
      <h2 class="text-h5 mb-3">Cómo leer estos datos</h2>
      <ul class="text-body-1 pl-5">
        <li>Son precios <strong>pedidos</strong> en avisos, no precios de venta cerrados.</li>
        <li>
          Las fuentes son Mercado Libre, que concentra la gran mayoría de los avisos del país,
          Facebook Marketplace, los clasificados Clasiautos y Dueño Directo, y las webs de Car One,
          Carper, Julio Automóviles, Shopping de Autos, Usados Fidocar y Motorlider. El conteo es de
          avisos vistos, no de autos en venta en Uruguay.
        </li>
        <li>
          Cómo está el mercado hoy —precios, qué modelo pierde más valor por año, qué se compra con
          cada presupuesto— está en el
          <NuxtLink :to="localePath(CAR_REPORT_PATH)">informe del mercado</NuxtLink>. Si vas a
          vender, el <NuxtLink :to="localePath(CAR_VALUATION_PATH)">tasador</NuxtLink> te dice
          cuánto se pide hoy por el tuyo y la
          <NuxtLink :to="localePath(CAR_SELL_PATH)">guía para vender</NuxtLink>, qué suma y qué
          resta en el precio.
        </li>
        <li>
          Los avisos cuyo vendedor declara deuda, choque, recupero de seguro o papeles pendientes
          tienen su propia lista:
          <NuxtLink :to="localePath(CAR_RISKS_PATH)">autos con deuda o chocados</NuxtLink>, con la
          cita del aviso y cuánto menos piden que el mismo auto sin declarar nada.
        </li>
        <li v-if="sourceLine">
          Avisos vigentes por fuente: {{ sourceLine }}.
          <template v-if="duplicateCount">
            {{ duplicateCount.toLocaleString('es-UY') }} avisos repetidos entre fuentes (el mismo
            auto publicado por la automotora en su web y en Mercado Libre) se muestran una sola vez.
          </template>
        </li>
        <li>
          En Facebook Marketplace la moneda a veces no está escrita: la deducimos comparando con
          autos iguales y lo marcamos como "moneda estimada".
        </li>
        <li>"Visto por primera vez" es la fecha en que leímos el aviso, no la de publicación.</li>
        <li>
          Los kilómetros son los que declara quien vende. Los valores de relleno (1, 111.111…) se
          muestran como "km no informado".
        </li>
        <li>
          Los avisos en pesos se muestran en pesos; el filtro en dólares usa la cotización del día.
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { CAR_RISKS_PATH } from '~/utils/carsRisk'
import { DIRECTORIOS_HUB, directoriosHubListItem } from '~/utils/directorios'
import { CAR_REPORT_PATH } from '~/utils/carsReport'
import { CAR_SELL_PATH, CAR_VALUATION_PATH } from '~/utils/carsValuation'
import {
  CAR_OPPORTUNITIES_PATH,
  CARS_PATH,
  carMarketPath,
  carsFiltered,
  carsQueryParams,
  formatCarDate,
  normalizeCarsQuery,
  type CarSort,
  type CarsQuery,
  type CarsResponse,
} from '~/utils/cars'

const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()
const filtersOpen = ref(false)
const emptyFacets = { brands: [], models: [], departments: [], sources: [] }
const sortItems: Array<{ title: string; value: CarSort }> = [
  { title: 'Vistos más recientemente', value: 'recent' },
  { title: 'Menor precio', value: 'price_asc' },
  { title: 'Mayor precio', value: 'price_desc' },
  { title: 'Menos kilómetros', value: 'km_asc' },
  { title: 'Más nuevos', value: 'year_desc' },
  { title: 'Menor consumo', value: 'consumption_asc' },
]

const query = computed(() => normalizeCarsQuery(route.query as Record<string, unknown>))
const { data, error } = await useAsyncData(
  'cars-directory',
  () => $fetch<CarsResponse>('/api/cars', { query: carsQueryParams(query.value) }),
  { watch: [query] }
)

const sourceLine = computed(() =>
  (data.value?.coverage.sources ?? [])
    .filter(source => source.listings > 0)
    .map(source => `${source.name} ${source.listings.toLocaleString('es-UY')}`)
    .join(' · ')
)
const duplicateCount = computed(() =>
  (data.value?.coverage.sources ?? []).reduce((sum, source) => sum + source.duplicates, 0)
)

function update(next: CarsQuery) {
  filtersOpen.value = false
  router.replace({ query: carsQueryParams(next) })
}

const canonical = `https://cambio-uruguay.com${CARS_PATH}`
const title = 'Autos usados en venta en Uruguay'
const description =
  'Buscador de autos usados en venta en Uruguay: precio en dólares, kilómetros, versión y comparación contra autos iguales. Avisos de Mercado Libre, Facebook Marketplace y automotoras, actualizados todos los días.'

useSeoMeta({
  title: `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogUrl: canonical,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  // Each filter combination is a thin copy of this page: only the base URL is indexed.
  robots: () => (carsFiltered(query.value) ? 'noindex, follow' : 'index, follow'),
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
              { '@type': 'ListItem', position: 3, name: 'Autos usados', item: canonical },
            ],
          },
        ],
      }),
    },
  ],
})
</script>

<style scoped>
.cars-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 16px;
}
.cars-sort {
  max-width: 240px;
}
.cars-filters {
  display: none;
}
.cars-filters--open {
  display: block;
}
@media (min-width: 960px) {
  .cars-filters {
    display: block;
    position: sticky;
    top: 80px;
  }
}
</style>
