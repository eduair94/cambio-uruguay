<template>
  <VContainer class="py-6 py-md-10">
    <VBreadcrumbs
      :items="[{ title: 'Autos usados', to: localePath(CARS_PATH) }, { title: 'Oportunidades' }]"
      class="px-0 mb-2"
    />
    <header class="mb-6">
      <h1 class="text-h4 font-weight-bold mb-2">Oportunidades en autos usados en Uruguay</h1>
      <p class="text-body-1 mb-3">
        Autos que piden bastante menos que otros avisos del
        <strong>mismo modelo, año, versión, motor y caja</strong>, con kilómetros parecidos, en
        Mercado Libre, Facebook Marketplace y webs de automotoras. Cada uno pasó por su propia
        ficha: sigue activo, con el mismo precio y sin menciones de choque, airbags faltantes,
        recupero de seguro, deudas, matrículas entregadas o chapa extranjera.
      </p>
      <VAlert type="warning" variant="outlined" density="comfortable">
        No es una tasación ni una garantía. Un precio bajo puede tener una explicación que el aviso
        no dice: pedí el Certificado SUCIVE, revisá el título y hacé revisar el auto antes de señar.
      </VAlert>
    </header>

    <VRow>
      <VCol cols="12" md="3">
        <form class="deal-filters" @submit.prevent="apply">
          <VSelect
            v-model="draft.tier"
            :items="tierItems"
            label="Evidencia"
            density="comfortable"
            variant="outlined"
            hide-details
          />
          <VSelect
            v-model="draft.brand"
            :items="brandItems"
            label="Marca"
            density="comfortable"
            variant="outlined"
            hide-details
          />
          <VTextField
            v-model="draft.priceMax"
            label="Presupuesto máximo (US$)"
            inputmode="numeric"
            density="comfortable"
            variant="outlined"
            hide-details
          />
          <VSelect
            v-model="draft.department"
            :items="departmentItems"
            label="Departamento"
            density="comfortable"
            variant="outlined"
            hide-details
          />
          <VSelect
            v-model="draft.seller"
            :items="sellerItems"
            label="Vende"
            density="comfortable"
            variant="outlined"
            hide-details
          />
          <VBtn type="submit" color="primary" block>Aplicar</VBtn>
        </form>
      </VCol>
      <VCol cols="12" md="9">
        <VAlert v-if="error" type="info" variant="outlined" class="mb-4">
          La comparación se está calculando. Volvé en unos minutos.
        </VAlert>
        <template v-else-if="data">
          <p class="text-body-2 text-medium-emphasis mb-4">
            {{ data.total }} resultados · cálculo del {{ formatCarDate(data.generatedAt) }} sobre
            {{ data.stats.input.toLocaleString('es-UY') }} avisos, de los cuales
            {{ data.stats.analyzed.toLocaleString('es-UY') }} tenían suficientes comparables.
          </p>
          <p v-if="!data.items.length" class="text-body-1">
            Hoy no hay autos que cumplan estas condiciones con esos filtros. Es un resultado válido:
            la regla es exigente a propósito.
          </p>
          <div class="d-flex flex-column ga-4">
            <CarsOpportunityCard v-for="item in data.items" :key="item.subject.key" :item="item" />
          </div>
          <VPagination
            v-if="data.total > data.perPage"
            :model-value="query.page"
            :length="Math.ceil(data.total / data.perPage)"
            :total-visible="3"
            class="mt-6"
            @update:model-value="page => navigate({ ...query, page })"
          />
        </template>
      </VCol>
    </VRow>

    <section v-if="data" id="metodo" class="mt-10">
      <h2 class="text-h5 mb-3">Cómo se calcula</h2>
      <ul class="text-body-1 pl-5">
        <li>
          Cada aviso se compara sólo contra avisos del mismo modelo, año, versión, motor y caja, con
          kilómetros dentro de {{ formatCarKm(data.policy.kmToleranceMin) }} o
          {{ carPercent(data.policy.kmToleranceRatio) }}, lo que sea mayor. La muestra se arma antes
          de mirar los precios.
        </li>
        <li>
          <strong>Comparación sólida:</strong> al menos
          {{ data.policy.strict.minimumComparables }} avisos de
          {{ data.policy.strict.minimumSellers }} vendedores distintos, el precio
          {{ carPercent(data.policy.strict.minimumGap) }} o más por debajo de la mediana y por
          debajo del cuarto más barato, y la diferencia se sostiene ({{
            carPercent(data.policy.strict.minimumSellerSensitivityGap)
          }}
          o más) aunque se saque de la muestra a cualquier vendedor.
        </li>
        <li>
          <strong>Comparación exploratoria:</strong> desde
          {{ data.policy.exploratory.minimumComparables }} avisos y
          {{ data.policy.exploratory.minimumSellers }} vendedores, con
          {{ carPercent(data.policy.exploratory.minimumGap) }} de diferencia.
        </li>
        <li>
          Nunca se muestra un auto con más km que tres de cada cuatro comparables, ni diferencias de
          más de {{ carPercent(data.policy.maximumGap) }}: casi siempre esconden un error o un
          problema.
        </li>
        <li>
          Se excluyen avisos con km de relleno, precio en pesos, títulos que hablan de entrega y
          cuotas, o menciones de choque, airbags faltantes, recupero, deuda, leasing, matrículas
          entregadas o chapa extranjera en el título o la descripción.
        </li>
        <li>Máximo {{ data.policy.maximumPerSeller }} avisos por vendedor en cada muestra.</li>
        <li>
          Un mismo auto publicado en varias fuentes cuenta una sola vez. Los avisos de Facebook
          Marketplace cuya moneda dedujimos nunca cuentan como oportunidad ni entran a la muestra.
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  CAR_OPPORTUNITIES_PATH,
  CAR_SELLERS,
  CAR_SELLER_LABELS,
  CARS_PATH,
  carOpportunityQueryParams,
  carPercent,
  formatCarDate,
  formatCarKm,
  normalizeCarOpportunityQuery,
  type CarOpportunitiesResponse,
  type CarOpportunityQuery,
} from '~/utils/cars'

const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()
const tierItems = [
  { title: 'Sólida y exploratoria', value: '' },
  { title: 'Sólo comparación sólida', value: 'strict' },
  { title: 'Sólo exploratoria', value: 'exploratory' },
]
const sellerItems = [
  { title: 'Dueño o automotora', value: '' },
  ...CAR_SELLERS.map(value => ({ title: CAR_SELLER_LABELS[value], value })),
]

const query = computed(() => normalizeCarOpportunityQuery(route.query as Record<string, unknown>))
const { data, error } = await useAsyncData(
  'car-opportunities',
  () =>
    $fetch<CarOpportunitiesResponse>('/api/car-opportunities', {
      query: carOpportunityQueryParams(query.value),
    }),
  { watch: [query] }
)
const brandItems = computed(() => [
  { title: 'Todas las marcas', value: '' },
  ...(data.value?.brands ?? []).map(brand => ({
    title: `${brand.name} (${brand.count})`,
    value: brand.slug,
  })),
])
const departmentItems = computed(() => [
  { title: 'Todo el país', value: '' },
  ...(data.value?.departments ?? []).map(value => ({ title: value, value })),
])

const toDraft = (value: CarOpportunityQuery) => ({
  tier: value.tier as string,
  brand: value.brand,
  priceMax: value.priceMax?.toString() ?? '',
  department: value.department,
  seller: value.seller as string,
})
const draft = reactive(toDraft(query.value))
watch(query, next => Object.assign(draft, toDraft(next)))

function navigate(next: CarOpportunityQuery) {
  router.replace({ query: carOpportunityQueryParams(next) })
}
function apply() {
  navigate(normalizeCarOpportunityQuery({ ...draft }))
}

const canonical = `https://cambio-uruguay.com${CAR_OPPORTUNITIES_PATH}`
const title = 'Oportunidades en autos usados en Uruguay'
const description =
  'Autos usados que piden menos que otros avisos del mismo modelo, año, versión, motor y caja en Uruguay, con los comparables a la vista y cada ficha revisada. No es una tasación.'

useSeoMeta({
  title: `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogUrl: canonical,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  // Filter combinations are thin copies of this list; only the base URL is indexed.
  robots: () => (Object.keys(route.query).length ? 'noindex, follow' : 'index, follow'),
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
                name: 'Autos usados',
                item: `https://cambio-uruguay.com${CARS_PATH}`,
              },
              { '@type': 'ListItem', position: 2, name: 'Oportunidades', item: canonical },
            ],
          },
        ],
      }),
    },
  ],
})
</script>

<style scoped>
.deal-filters {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
@media (min-width: 960px) {
  .deal-filters {
    position: sticky;
    top: 80px;
  }
}
</style>
