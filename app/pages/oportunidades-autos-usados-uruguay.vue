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
      <p class="text-body-2 mt-3 mb-0">
        Los avisos que sí dicen por qué están baratos —deuda, choque, recupero, papeles— están en
        <NuxtLink :to="localePath(CAR_RISKS_PATH)">autos con deuda o chocados</NuxtLink>, con la
        frase del vendedor y cuánto descuenta el mercado por cada motivo.
      </p>
    </header>

    <!--
      En mobile el panel es un cajón que se teletransporta al body: va FUERA de la grilla.
      Adentro de la celda del layout, su vnode se parcheaba contra una celda que en mobile no
      se renderiza y Vue moría en `shouldUpdateComponent`; el botón no abría nada y no había
      error al tocarlo. Ver `pages/autos-usados-uruguay/index.vue`.
    -->
    <CarsFilterPanel
      v-if="smAndDown"
      v-model:open="filtersOpen"
      mobile
      :total="data?.total ?? null"
      noun="oportunidad"
      noun-plural="oportunidades"
      @apply="apply"
      @clear="clear"
    >
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
      <CarsSubjectFilterFields v-model="subject" />
    </CarsFilterPanel>

    <CarsSidebarLayout>
      <template #filters>
        <CarsFilterPanel
          v-if="!smAndDown"
          :mobile="false"
          :total="data?.total ?? null"
          noun="oportunidad"
          noun-plural="oportunidades"
          @apply="apply"
          @clear="clear"
        >
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
          <CarsSubjectFilterFields v-model="subject" />
        </CarsFilterPanel>
      </template>
      <template #default>
        <CarsToolbar
          v-if="smAndDown"
          :sort="query.sort"
          :items="sortItems"
          :active-count="activeCount"
          :open="filtersOpen"
          @open="filtersOpen = true"
          @update:sort="value => navigate({ ...query, sort: value as CarOpportunitySort, page: 1 })"
        />
        <AssistantCta topic="oportunidadesAutos" class="mb-4" />
        <VAlert v-if="error" type="info" variant="outlined" class="mb-4">
          La comparación se está calculando. Volvé en unos minutos.
        </VAlert>
        <template v-else-if="data">
          <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-2">
            <h2 id="deal-results" class="text-h6 mb-0 cars-anchor">
              {{ data.total.toLocaleString('es-UY') }}
              {{ data.total === 1 ? 'oportunidad' : 'oportunidades' }}
            </h2>
            <VSelect
              v-if="!smAndDown"
              :model-value="query.sort"
              :items="sortItems"
              label="Ordenar"
              density="compact"
              variant="outlined"
              hide-details
              class="deal-sort"
              data-testid="deal-sort"
              @update:model-value="value => navigate({ ...query, sort: value, page: 1 })"
            />
          </div>
          <p class="text-body-2 text-medium-emphasis mb-4">
            Cálculo del {{ formatCarDate(data.generatedAt) }} sobre
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
            @update:model-value="page => changePage(page)"
          />
        </template>
      </template>
    </CarsSidebarLayout>

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
import { useDisplay } from 'vuetify'
import { CAR_RISKS_PATH } from '~/utils/carsRisk'
import {
  CAR_OPPORTUNITIES_PATH,
  CARS_PATH,
  carOpportunityQueryParams,
  carSubjectDraft,
  carPercent,
  formatCarDate,
  formatCarKm,
  normalizeCarOpportunityQuery,
  type CarOpportunitiesResponse,
  type CarOpportunityQuery,
  type CarOpportunitySort,
} from '~/utils/cars'

const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()
const { smAndDown } = useDisplay()
const filtersOpen = ref(false)
watch(smAndDown, mobile => {
  if (!mobile) filtersOpen.value = false
})
const tierItems = [
  { title: 'Sólida y exploratoria', value: '' },
  { title: 'Sólo comparación sólida', value: 'strict' },
  { title: 'Sólo exploratoria', value: 'exploratory' },
]
const sortItems: Array<{ title: string; value: CarOpportunitySort }> = [
  { title: 'Mayor diferencia', value: 'gap' },
  { title: 'Menor precio', value: 'price_asc' },
  { title: 'Más nuevos', value: 'year_desc' },
  { title: 'Menos kilómetros', value: 'km_asc' },
  { title: 'Menor consumo', value: 'consumption_asc' },
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

const toDraft = (value: CarOpportunityQuery) => ({
  tier: value.tier as string,
  brand: value.brand,
})
const draft = reactive(toDraft(query.value))
// The filters on the advert itself are the same form as on /autos-chocados-y-con-deuda-uruguay.
const subject = ref(carSubjectDraft(query.value))
watch(query, next => {
  Object.assign(draft, toDraft(next))
  subject.value = carSubjectDraft(next)
})

/**
 * Cuántos filtros están puestos, para el contador del botón. Se cuenta sobre la consulta
 * aplicada, no sobre el borrador: el número tiene que describir lo que hay en pantalla.
 */
const activeCount = computed(
  () =>
    [query.value.tier, query.value.brand].filter(Boolean).length +
    Object.values(carSubjectDraft(query.value)).filter(Boolean).length
)

/** Cambiar de página además sube al comienzo de la lista; ver utils/paginationScroll.ts. */
function changePage(page: number) {
  navigate({ ...query.value, page })
  scrollToPageTop('deal-results')
}

function navigate(next: CarOpportunityQuery) {
  filtersOpen.value = false
  router.replace({ query: carOpportunityQueryParams(next) })
}
function apply() {
  // The order is chosen next to the results, not in the form: applying filters keeps it.
  navigate(normalizeCarOpportunityQuery({ ...draft, ...subject.value, sort: query.value.sort }))
}
function clear() {
  navigate(normalizeCarOpportunityQuery({ sort: query.value.sort }))
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
.cars-anchor {
  /* La barra del sitio es fixed (65 px): sin este margen el encabezado de la lista
     queda tapado justo despues de paginar. */
  scroll-margin-top: 84px;
}
.deal-sort {
  max-width: 260px;
}
@media (min-width: 960px) {
  .deal-filters {
    position: sticky;
    top: 80px;
  }
}
</style>
