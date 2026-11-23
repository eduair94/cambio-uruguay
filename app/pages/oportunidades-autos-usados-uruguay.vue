<template>
  <VContainer class="py-6 py-md-10">
    <VBreadcrumbs
      :items="[{ title: 'Autos usados', to: localePath(CARS_PATH) }, { title: 'Oportunidades' }]"
      class="px-0 mb-2"
    />
    <header class="mb-6">
      <h1 class="text-h4 font-weight-bold mb-2">Oportunidades en autos usados en Uruguay</h1>
      <!-- La lista ENTERA, no la página que se ve: las páginas 2 en adelante y cada filtro van
           noindex, así que sin este resumen la URL indexada sólo contaba las 20 primeras. -->
      <p v-if="summary?.total" class="text-body-1 mb-3" data-testid="deal-summary">
        <template v-if="summary.total === 1">
          La lista tiene <strong>1 auto usado</strong> que pide menos que otros iguales, con
          comparación {{ summary.strict ? 'sólida' : 'exploratoria' }}.
        </template>
        <template v-else>
          La lista tiene <strong>{{ formatCarCount(summary.total) }} autos usados</strong> que piden
          menos que otros iguales: {{ formatCarCount(summary.strict) }} con comparación sólida y
          {{ formatCarCount(summary.exploratory) }} con comparación exploratoria.
          <template
            v-if="
              summary.minUsd !== null &&
              summary.maxUsd !== null &&
              summary.medianUsd !== null &&
              summary.medianGap !== null
            "
          >
            Piden entre {{ formatCarUsd(summary.minUsd) }} y
            {{ formatCarUsd(summary.maxUsd) }} (mediana {{ formatCarUsd(summary.medianUsd) }}) y la
            diferencia mediana contra sus comparables es de {{ carPercent(summary.medianGap) }}.
          </template>
        </template>
        <template v-if="leadModels.length">
          {{
            leadModels.length === 1 ? 'El modelo que más aparece:' : 'Los modelos que más aparecen:'
          }}
          <template v-for="part in leadModels" :key="part.marketSlug">
            <span>{{ part.name }}</span> ({{ part.count }}){{ part.trail }}
          </template>
        </template>
        Cálculo del
        <time :datetime="generatedAt">{{ formatCarDate(generatedAt) }}</time
        >.
      </p>
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
          <!-- Un div y no un párrafo: VChip dibuja un div adentro (noChipInsideParagraph.test.ts). -->
          <div
            v-if="budgetChips.length"
            class="d-flex flex-wrap align-center ga-2 mb-4"
            data-testid="deal-budgets"
          >
            <span class="text-body-2">Por presupuesto:</span>
            <VChip
              v-for="row in budgetChips"
              :key="row.budget"
              size="small"
              :color="query.priceMax === row.budget ? 'primary' : undefined"
              :variant="query.priceMax === row.budget ? 'flat' : 'outlined'"
              :aria-pressed="query.priceMax === row.budget ? 'true' : 'false'"
              @click="toggleBudget(row.budget)"
            >
              Hasta {{ formatCarUsd(row.budget) }}
              <template v-if="onlyBudgetFilter">({{ formatCarCount(row.count) }})</template>
            </VChip>
          </div>
          <p v-if="!data.items.length" class="text-body-1">
            Hoy no hay autos que cumplan estas condiciones con esos filtros. Es un resultado válido:
            la regla es exigente a propósito.
          </p>
          <div ref="resultsList" class="cars-rows">
            <FeedEdge :feed="feed" edge="top" />
            <template v-for="(item, index) in feed.items" :key="item.subject.key">
              <FeedAd :index="index" :feed="feed" />
              <CarsOpportunityCard :item="item" />
            </template>
            <FeedEdge :feed="feed" edge="bottom" />
          </div>
          <FeedControls :feed="feed">
            <template #pagination>
              <VPagination
                v-if="data.total > data.perPage"
                :model-value="query.page"
                :length="Math.ceil(data.total / data.perPage)"
                :total-visible="3"
                class="mt-6"
                @update:model-value="page => changePage(page)"
              />
            </template>
          </FeedControls>
        </template>
      </template>
    </CarsSidebarLayout>

    <template v-if="summary?.total">
      <section v-if="summary.budgets.length" id="por-presupuesto" class="mt-10">
        <h2 class="text-h5 mb-3">Oportunidades por presupuesto</h2>
        <p class="text-body-2 text-medium-emphasis mb-3">
          Sobre la lista entera del {{ formatCarDate(generatedAt) }}, sin filtros. Cada tope cuenta
          también los autos más baratos: los de hasta {{ formatCarUsd(summary.budgets[0]!.budget) }}
          entran en todos los demás.
        </p>
        <VTable class="cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th scope="col">Presupuesto</th>
              <th scope="col">Oportunidades</th>
              <th scope="col">Con comparación sólida</th>
              <th scope="col">Diferencia mediana</th>
              <th scope="col">Qué se compra con ese dinero</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in summary.budgets" :key="row.budget">
              <td data-label="Presupuesto">Hasta {{ formatCarUsd(row.budget) }}</td>
              <td data-label="Oportunidades">{{ formatCarCount(row.count) }}</td>
              <td data-label="Con comparación sólida">{{ formatCarCount(row.strict) }}</td>
              <td data-label="Diferencia mediana">{{ carPercent(row.medianGap) }}</td>
              <td data-label="Qué se compra con ese dinero">
                <!-- Ruta cruda, sin localePath: las páginas por presupuesto existen sólo en
                     español; /en/autos-usados-uruguay/hasta-… sería un 404. -->
                <NuxtLink :to="carBudgetPath(row.budget)">
                  Qué se compra con {{ formatCarUsd(row.budget) }}
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </VTable>
      </section>

      <section v-if="summary.models.length" id="por-modelo" class="mt-10">
        <h2 class="text-h5 mb-3">Modelos con más oportunidades</h2>
        <VTable class="cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th scope="col">Modelo</th>
              <th scope="col">Oportunidades</th>
              <th scope="col">Con comparación sólida</th>
              <th scope="col">Precio pedido</th>
              <th scope="col">Años</th>
              <th scope="col">Diferencia mediana</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in summary.models" :key="row.marketSlug">
              <td data-label="Modelo">{{ row.brand }} {{ row.model }}</td>
              <td data-label="Oportunidades">{{ formatCarCount(row.count) }}</td>
              <td data-label="Con comparación sólida">{{ formatCarCount(row.strict) }}</td>
              <td data-label="Precio pedido">{{ formatCarUsdSpan(row.minUsd, row.maxUsd) }}</td>
              <td data-label="Años">{{ formatCarYearSpan(row.yearFrom, row.yearTo) }}</td>
              <td data-label="Diferencia mediana">{{ carPercent(row.medianGap) }}</td>
            </tr>
          </tbody>
        </VTable>
        <p v-if="summary.otherModels" class="text-body-2 text-medium-emphasis mt-2 mb-0">
          Además hay {{ formatCarCount(summary.otherModels.count) }} modelos con
          {{
            summary.otherModels.maxEach === 1
              ? '1 oportunidad'
              : `${summary.otherModels.maxEach} oportunidades o menos`
          }}
          cada uno; están en la lista de arriba.
        </p>
      </section>
    </template>

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

    <!-- `:ad="false"`: la página ya lleva su unidad dentro de la grilla (FeedAd, feedAd.test.ts). -->
    <FaqSection
      v-if="faq.length"
      :items="faq"
      heading="Preguntas frecuentes"
      :expanded="true"
      :ad="false"
    />
  </VContainer>
</template>

<script setup lang="ts">
import { VPagination } from 'vuetify/components'
import { useDisplay } from 'vuetify'
import { CAR_RISKS_PATH } from '~/utils/carsRisk'
import { carBudgetPath } from '~/utils/carBudget'
import {
  carOpportunityFaq,
  carOpportunityLeadModels,
  formatCarCount,
  formatCarUsdSpan,
  formatCarYearSpan,
  type CarOpportunitiesWithSummary,
} from '~/utils/carOpportunitySummary'
import {
  CAR_OPPORTUNITIES_PATH,
  CARS_PATH,
  carOpportunityQueryParams,
  carSubjectDraft,
  carPercent,
  formatCarDate,
  formatCarKm,
  formatCarUsd,
  normalizeCarOpportunityQuery,
  type CarOpportunitiesResponse,
  type CarOpportunityQuery,
  type CarOpportunitySort,
} from '~/utils/cars'

// Directorio: filtros + grilla con el ancho del marco (layouts/default.vue, `.container_custom--wide`).
definePageMeta({ wide: true })
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
    $fetch<CarOpportunitiesWithSummary>('/api/car-opportunities', {
      query: carOpportunityQueryParams(query.value),
    }),
  { watch: [query] }
)
// El resumen de la lista entera (sin filtros) que la API manda con cada página. Opcional: una
// respuesta que el borde cacheó antes del despliegue no lo trae, y entonces no se dibuja nada.
const summary = computed(() => data.value?.summary)
const generatedAt = computed(() => data.value?.generatedAt ?? '')
// Hasta tres modelos para la primera frase. Cada nombre en su propio elemento, para que la memoria
// de traducción no cambie de clave cada vez que cambia el modelo del día; los separadores (con su
// espacio, que la plantilla no conserva) salen del helper y tienen test.
const leadModels = computed(() => carOpportunityLeadModels(summary.value?.models ?? []))
/** Los topes que recortan la lista: el que ya entra entero no filtra nada. */
const budgetChips = computed(() =>
  (summary.value?.budgets ?? []).filter(row => row.count < summary.value!.total)
)
/** El número del chip es de la lista entera: con otro filtro puesto ya no describe lo que se ve. */
const onlyBudgetFilter = computed(
  () => activeCount.value === (query.value.priceMax !== null ? 1 : 0)
)
const faq = computed(() =>
  summary.value && data.value
    ? carOpportunityFaq(summary.value, data.value.policy, data.value.stats, data.value.generatedAt)
    : []
)
// "Cargar más al bajar" (composables/useInfiniteFeed.ts): la lista recorre `feed.items`.
const resultsList = ref<HTMLElement | null>(null)
const feed = useInfiniteFeed<CarOpportunitiesResponse['items'][number]>({
  id: 'oportunidades-autos',
  itemKey: item => item.subject.key,
  list: resultsList,
  items: () => data.value?.items ?? [],
  page: () => query.value.page,
  pageCount: () => (data.value ? Math.ceil(data.value.total / data.value.perPage) : 1),
  perPage: () => data.value?.perPage ?? 20,
  resetKey: () => JSON.stringify(carOpportunityQueryParams({ ...query.value, page: 1 })),
  fetchPage: (page, signal) =>
    $fetch<CarOpportunitiesResponse>('/api/car-opportunities', {
      query: carOpportunityQueryParams({ ...query.value, page }),
      signal,
    }).then(response => response.items),
  enabled: () => !error.value,
  goToPage: changePage,
  anchorId: 'deal-results',
})
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
/** Un chip de presupuesto pone ese tope de precio; tocar el que está puesto lo saca. */
function toggleBudget(budget: number) {
  navigate({ ...query.value, priceMax: query.value.priceMax === budget ? null : budget, page: 1 })
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
  'Autos que piden menos que otros del mismo modelo, año, versión, motor y caja, con los comparables a la vista y cada ficha revisada. No es una tasación.'

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

useHead(() => ({
  link: [{ rel: 'canonical', href: canonical }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'CollectionPage',
            name: title,
            description,
            url: canonical,
            // La fecha del cálculo publicado (sin cálculo, JSON.stringify la omite).
            dateModified: data.value?.generatedAt,
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
              { '@type': 'ListItem', position: 2, name: 'Oportunidades', item: canonical },
            ],
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
/* Las fichas son filas anchas: una columna en el ancho de siempre (~650) y dos, del mismo tamaño,
   cuando el marco ancho del layout (`wide`) da lugar. `start` para que abrir los comparables de una
   no estire a su vecina. FeedAd y FeedEdge ocupan la fila entera (grid-column: 1 / -1). */
.cars-rows {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 560px), 1fr));
  align-items: start;
  gap: 16px;
}
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
