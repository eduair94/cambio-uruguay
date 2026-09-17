<template>
  <VContainer class="py-6 py-md-10">
    <VBreadcrumbs
      :items="[
        { title: 'Autos usados', to: localePath(CARS_PATH) },
        { title: data ? `${data.market.brand} ${data.market.model}` : 'Modelo' },
      ]"
      class="px-0 mb-2"
    />

    <template v-if="!data">
      <h1 class="text-h5 font-weight-bold mb-3">
        {{
          failureCode === 404
            ? 'No hay suficientes avisos de este modelo'
            : 'No pudimos cargar el modelo'
        }}
      </h1>
      <VBtn color="primary" :to="localePath(CARS_PATH)">Ir al directorio</VBtn>
    </template>

    <template v-else>
      <header class="mb-6">
        <h1 class="text-h4 font-weight-bold mb-2">{{ heading }}</h1>
        <p class="text-body-1">
          {{ data.market.listings }} avisos vigentes de {{ data.market.brand }}
          {{ data.market.model }} usado en Mercado Libre, leídos el
          {{ formatCarDate(data.market.generatedAt) }}. Son precios pedidos, agrupados por año y por
          versión; no es una tasación.
        </p>
        <VAlert
          v-if="!data.indexable"
          type="info"
          variant="outlined"
          density="compact"
          class="mt-3"
        >
          Con menos de {{ CAR_MARKET_INDEX_MIN }} avisos los rangos cambian mucho de un día a otro:
          tomalos como referencia gruesa.
        </VAlert>
      </header>

      <section v-if="data.market.years.length" class="mb-8">
        <h2 class="text-h6 mb-2">Precio por año</h2>
        <CarsMarketTable
          :rows="data.market.years"
          caption="Todas las versiones juntas; sólo años con 5 avisos o más."
        />
      </section>

      <section v-if="data.market.rows.length" class="mb-8">
        <h2 class="text-h6 mb-2">Precio por año y versión</h2>
        <CarsMarketTable
          :rows="data.market.rows"
          show-version
          caption="Misma versión, motor y caja; sólo combinaciones con 5 avisos o más."
        />
      </section>

      <section v-if="data.opportunities.length" class="mb-8">
        <h2 class="text-h6 mb-3">Oportunidades de este modelo</h2>
        <div class="d-flex flex-column ga-4">
          <CarsOpportunityCard
            v-for="item in data.opportunities"
            :key="item.subject.key"
            :item="item"
          />
        </div>
      </section>

      <section v-if="data.listings.length" class="mb-8">
        <div class="d-flex flex-wrap align-center justify-space-between ga-2 mb-3">
          <h2 class="text-h6 mb-0">Avisos vigentes</h2>
          <VBtn variant="text" :to="directoryLink">Filtrar en el directorio</VBtn>
        </div>
        <div class="cars-grid">
          <CarsListingCard v-for="car in data.listings" :key="car.key" :car="car" />
        </div>
      </section>
    </template>
  </VContainer>
</template>

<script setup lang="ts">
import {
  CAR_MARKET_INDEX_MIN,
  CARS_PATH,
  carMarketPath,
  carMarketSlugValid,
  formatCarDate,
  formatCarUsd,
  type CarMarketResponse,
} from '~/utils/cars'

const route = useRoute()
const localePath = useLocalePath()
const slug = computed(() => String(route.params.slug || ''))
const { data, error } = await useAsyncData<CarMarketResponse>(
  () => `car-market-${slug.value}`,
  () => {
    if (!carMarketSlugValid(slug.value))
      throw createError({ statusCode: 404, statusMessage: 'Model not found' })
    return $fetch<CarMarketResponse>(`/api/cars/market/${encodeURIComponent(slug.value)}`)
  }
)
const failureCode = computed(() => {
  const failure = error.value as { statusCode?: number; data?: { statusCode?: number } } | null
  return failure?.statusCode === 404 || failure?.data?.statusCode === 404 ? 404 : 503
})
if (import.meta.server && (error.value || !data.value)) {
  const event = useRequestEvent()
  if (event) {
    setResponseStatus(event, failureCode.value)
    useResponseHeader('cache-control').value = 'no-store, max-age=0'
  }
}

const directoryLink = computed(() =>
  localePath({
    path: CARS_PATH,
    query: data.value ? { brand: data.value.market.brandSlug, model: data.value.market.slug } : {},
  })
)
const name = computed(() =>
  data.value ? `${data.value.market.brand} ${data.value.market.model}` : 'Auto'
)
const heading = computed(() => `${name.value} usado: precios en Uruguay`)
const canonical = computed(() => `https://cambio-uruguay.com${carMarketPath(slug.value)}`)
const latest = computed(() => data.value?.market.years[0] ?? null)
const description = computed(() =>
  latest.value
    ? `Cuánto se pide por un ${name.value} usado en Uruguay: un ${latest.value.year} tiene mediana de ${formatCarUsd(latest.value.median)} sobre ${latest.value.n} avisos. Precios por año y versión, actualizados todos los días.`
    : `Precios pedidos por ${name.value} usado en Uruguay, por año y versión.`
)

useSeoMeta({
  title: () => `${heading.value} | Cambio Uruguay`,
  description,
  ogTitle: heading,
  ogDescription: description,
  ogUrl: canonical,
  // A model with few adverts exists as a page but must not promise a range the sample can't hold.
  robots: () => (data.value?.indexable ? 'index, follow' : 'noindex, follow'),
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonical.value }],
  script: data.value
    ? [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Product',
                name: `${name.value} usado`,
                brand: { '@type': 'Brand', name: data.value.market.brand },
                url: canonical.value,
                ...(data.value.market.years.length
                  ? {
                      offers: {
                        '@type': 'AggregateOffer',
                        priceCurrency: 'USD',
                        lowPrice: Math.min(...data.value.market.years.map(row => row.p25)),
                        highPrice: Math.max(...data.value.market.years.map(row => row.p75)),
                        offerCount: data.value.market.listings,
                      },
                    }
                  : {}),
              },
              {
                '@type': 'BreadcrumbList',
                itemListElement: [
                  {
                    '@type': 'ListItem',
                    position: 1,
                    name: 'Autos usados',
                    item: `https://cambio-uruguay.com${CARS_PATH}`,
                  },
                  { '@type': 'ListItem', position: 2, name: name.value, item: canonical.value },
                ],
              },
            ],
          }),
        },
      ]
    : [],
}))
</script>

<style scoped>
.cars-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
</style>
