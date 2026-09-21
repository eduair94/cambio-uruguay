<template>
  <VContainer class="py-6 py-md-10">
    <VBreadcrumbs
      :items="[
        { title: 'Autos usados', to: localePath(CARS_PATH) },
        { title: 'Con deuda o chocados' },
      ]"
      class="px-0 mb-2"
    />
    <header class="mb-6">
      <h1 class="text-h4 font-weight-bold mb-2">
        Autos con deuda, chocados o con papeles pendientes
      </h1>
      <p class="text-body-1 mb-3">
        Avisos de Uruguay cuyo propio vendedor dice que el auto tiene algo: deuda de patente o
        prenda, papeles que faltan, choque, recupero de seguro, mecánica rota, chapa extranjera o
        uso de taxi. Al lado de cada uno va <strong>la frase del aviso</strong> y cuánto pide de más
        o de menos que los mismos autos que no declaran nada.
      </p>
      <VAlert type="warning" variant="outlined" density="comfortable">
        Esto no es una lista de oportunidades. Es un precio con una condición adentro: el descuento
        existe porque alguien va a tener que resolver eso. Acá abajo está qué pedir antes de señar.
      </VAlert>
    </header>

    <section v-if="measured.length" class="mb-8">
      <h2 class="text-h5 mb-3">Cuánto cambia el precio lo que el aviso declara</h2>
      <VTable class="cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th scope="col">Lo que declara el aviso</th>
            <th scope="col">Avisos</th>
            <th scope="col">Con diferencia medida</th>
            <th scope="col">Diferencia mediana</th>
            <th scope="col">El 50 % central</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in measured" :key="row.category">
            <td data-label="Lo que declara el aviso">{{ CAR_RISK_GUIDE[row.category].label }}</td>
            <td data-label="Avisos">{{ row.adverts }}</td>
            <td data-label="Con diferencia medida">{{ row.measured }}</td>
            <td data-label="Diferencia mediana">
              <strong>{{ formatCarRiskGap(row.medianGap) }}</strong>
            </td>
            <td data-label="El 50 % central">{{ formatCarRiskRange(row.p25Gap, row.p75Gap) }}</td>
          </tr>
        </tbody>
      </VTable>
      <p class="text-body-2 text-medium-emphasis mt-2">
        Cada descuento se mide contra avisos del mismo modelo, año, versión, motor y caja
        <strong>que no declaran nada</strong>, con kilómetros parecidos. Una categoría muestra
        mediana recién con cinco avisos medidos.
      </p>
    </section>

    <!-- Fuera de la grilla en mobile, por lo mismo que `pages/autos-usados-uruguay/index.vue`. -->
    <CarsFilterPanel
      v-if="smAndDown"
      v-model:open="filtersOpen"
      mobile
      :total="data?.total ?? null"
      @apply="apply"
      @clear="clear"
    >
      <VSelect
        v-model="draft.category"
        :items="categoryItems"
        label="Qué declara"
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
      <VCheckbox
        v-model="draft.measured"
        label="Sólo con diferencia medida"
        density="comfortable"
        hide-details
      />
    </CarsFilterPanel>

    <CarsSidebarLayout>
      <template #filters>
        <CarsFilterPanel
          v-if="!smAndDown"
          :mobile="false"
          :total="data?.total ?? null"
          @apply="apply"
          @clear="clear"
        >
          <VSelect
            v-model="draft.category"
            :items="categoryItems"
            label="Qué declara"
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
          <!-- Los mismos filtros sobre el aviso que /oportunidades-autos-usados-uruguay. -->
          <CarsSubjectFilterFields v-model="subject" />
          <VCheckbox
            v-model="draft.measured"
            label="Sólo con diferencia medida"
            density="comfortable"
            hide-details
          />
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
          @update:sort="value => navigate({ ...query, sort: value as CarRiskSort, page: 1 })"
        />
        <VAlert v-if="error" type="info" variant="outlined" class="mb-4">
          El tablero se está calculando. Volvé en unos minutos.
        </VAlert>
        <template v-else-if="data">
          <div
            class="d-flex flex-wrap align-center justify-space-between ga-3 mb-2"
            :class="smAndDown ? 'mt-3' : ''"
          >
            <h2 id="risk-results" class="text-h6 mb-0 cars-anchor">
              {{ data.total.toLocaleString('es-UY') }} {{ data.total === 1 ? 'aviso' : 'avisos' }}
            </h2>
            <VSelect
              v-if="!smAndDown"
              :model-value="query.sort"
              :items="sortItems"
              label="Ordenar"
              density="compact"
              variant="outlined"
              hide-details
              class="risk-sort"
              data-testid="risk-sort"
              @update:model-value="value => navigate({ ...query, sort: value, page: 1 })"
            />
          </div>
          <p class="text-body-2 text-medium-emphasis mb-4">
            Cálculo del {{ formatCarDate(data.generatedAt) }} sobre
            {{ data.stats.input.toLocaleString('es-UY') }} avisos vigentes, de los cuales
            {{ data.stats.declared.toLocaleString('es-UY') }} declaran algo y
            {{ data.stats.measured.toLocaleString('es-UY') }} tienen con qué compararse.
          </p>
          <p v-if="!data.items.length" class="text-body-1">
            No hay avisos que declaren esto con esos filtros. Que un auto no declare nada no quiere
            decir que esté limpio: quiere decir que su aviso no lo dice.
          </p>
          <div class="d-flex flex-column ga-4">
            <CarsRiskCard v-for="item in data.items" :key="item.subject.key" :item="item" />
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

    <section class="mt-10">
      <h2 class="text-h5 mb-3">Qué pedir antes de señar, según lo que diga el aviso</h2>
      <VTable class="cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th scope="col">Lo que declara</th>
            <th scope="col">Qué significa para vos</th>
            <th scope="col">Qué pedir</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="category in CAR_RISK_CATEGORIES" :key="category">
            <td data-label="Lo que declara">
              <strong>{{ CAR_RISK_GUIDE[category].label }}</strong>
            </td>
            <td data-label="Qué significa para vos">{{ CAR_RISK_GUIDE[category].meaning }}</td>
            <td data-label="Qué pedir">{{ CAR_RISK_GUIDE[category].check }}</td>
          </tr>
        </tbody>
      </VTable>
      <p class="text-body-2 text-medium-emphasis mt-3">
        La deuda de patente se consulta en
        <a href="https://www.sucive.gub.uy/" target="_blank" rel="noopener">SUCIVE</a> con la
        matrícula, y el certificado registral que muestra prendas y embargos lo pide la escribanía
        en la
        <a
          href="https://www.gub.uy/ministerio-educacion-cultura/direccion-general-registros"
          target="_blank"
          rel="noopener"
        >
          Dirección General de Registros </a
        >. Verificado el 18/9/2026.
      </p>
    </section>

    <section class="mt-10">
      <h2 class="text-h5 mb-3">Cómo se arma esta lista</h2>
      <ul class="text-body-1 pl-5">
        <li>
          Todo lo que dice esta página de un auto lo dice su propio aviso, y va con la cita al lado.
          El sitio no revisa autos ni dictamina que uno esté chocado.
        </li>
        <li>
          Lo negado no cuenta: "sin deuda" y "nunca chocado" son argumentos de venta, no riesgos.
        </li>
        <li>
          El descuento se mide contra la cohorte <strong>limpia</strong>: meter chocados en la
          mediana del modelo abarataría a todos y taparía justamente lo que queremos medir.
        </li>
        <li>
          Cuando un auto no tiene con qué compararse se publica igual, sin número. Preferimos decir
          "no se pudo medir" antes que inventar un porcentaje.
        </li>
        <li>
          Un aviso que no declara nada puede igual tener deuda o un choque sin contar:
          <strong>la ausencia no es una afirmación</strong>. Por eso la lista de al lado, la de
          <NuxtLink :to="localePath(CAR_OPPORTUNITIES_PATH)">oportunidades</NuxtLink>, tampoco
          garantiza nada y pide las mismas verificaciones.
        </li>
        <li>
          Todavía no leímos la descripción de todos los avisos, así que esta lista crece cada día.
          Lo que falta se lee por orden de utilidad, empezando por los que están baratos sin
          explicación.
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { useDisplay } from 'vuetify'
import { CAR_OPPORTUNITIES_PATH, CARS_PATH, carSubjectDraft, formatCarDate } from '~/utils/cars'
import {
  CAR_RISKS_PATH,
  CAR_RISK_CATEGORIES,
  CAR_RISK_GUIDE,
  carRiskQueryParams,
  formatCarRiskGap,
  formatCarRiskRange,
  normalizeCarRiskQuery,
  type CarRiskQuery,
  type CarRiskSort,
  type CarRisksResponse,
} from '~/utils/carsRisk'

const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()
const { smAndDown } = useDisplay()
const filtersOpen = ref(false)
watch(smAndDown, mobile => {
  if (!mobile) filtersOpen.value = false
})

const query = computed(() => normalizeCarRiskQuery(route.query as Record<string, unknown>))
const { data, error } = await useAsyncData(
  'car-risks',
  () => $fetch<CarRisksResponse>('/api/car-risks', { query: carRiskQueryParams(query.value) }),
  { watch: [query] }
)

const measured = computed(() =>
  (data.value?.categories ?? []).filter(row => row.medianGap !== null)
)
const categoryItems = computed(() => [
  { title: 'Todo lo declarado', value: '' },
  ...CAR_RISK_CATEGORIES.map(category => ({
    title: CAR_RISK_GUIDE[category].label,
    value: category,
  })),
])
const brandItems = computed(() => [
  { title: 'Todas las marcas', value: '' },
  ...(data.value?.brands ?? []).map(brand => ({
    title: `${brand.name} (${brand.count})`,
    value: brand.slug,
  })),
])

const sortItems: Array<{ title: string; value: CarRiskSort }> = [
  { title: 'Mayor diferencia', value: 'gap' },
  { title: 'Menor precio', value: 'price_asc' },
  { title: 'Más nuevos', value: 'year_desc' },
  { title: 'Menos kilómetros', value: 'km_asc' },
  { title: 'Menor consumo', value: 'consumption_asc' },
]

const toDraft = (value: CarRiskQuery) => ({
  category: value.category as string,
  brand: value.brand,
  measured: value.measured,
})
const draft = reactive(toDraft(query.value))
const subject = ref(carSubjectDraft(query.value))
watch(query, next => {
  Object.assign(draft, toDraft(next))
  subject.value = carSubjectDraft(next)
})

/**
 * Cuántos filtros están puestos, para el contador del botón. Se cuenta sobre la consulta
 * aplicada, no sobre el borrador: el número describe lo que hay en pantalla.
 */
const activeCount = computed(
  () =>
    [query.value.category, query.value.brand, query.value.measured].filter(Boolean).length +
    Object.values(carSubjectDraft(query.value)).filter(Boolean).length
)

/** Cambiar de página además sube al comienzo de la lista; ver utils/paginationScroll.ts. */
function changePage(page: number) {
  navigate({ ...query.value, page })
  scrollToPageTop('risk-results')
}

function navigate(next: CarRiskQuery) {
  filtersOpen.value = false
  router.replace({ query: carRiskQueryParams(next) })
}
function apply() {
  // The order is chosen next to the results: applying filters keeps it.
  navigate(
    normalizeCarRiskQuery({
      ...draft,
      ...subject.value,
      measured: draft.measured ? '1' : '',
      sort: query.value.sort,
    })
  )
}
function clear() {
  navigate(normalizeCarRiskQuery({ sort: query.value.sort }))
}

const canonical = `https://cambio-uruguay.com${CAR_RISKS_PATH}`
const title = 'Autos con deuda o chocados en Uruguay'
const description =
  'Avisos de autos usados cuyo vendedor declara deuda, choque, recupero de seguro o papeles pendientes, con la frase del aviso y cuánto menos piden que el mismo auto sin declarar nada.'

useSeoMeta({
  title: `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogUrl: canonical,
  ogType: 'website',
  twitterCard: 'summary_large_image',
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
              { '@type': 'ListItem', position: 2, name: 'Con deuda o chocados', item: canonical },
            ],
          },
        ],
      }),
    },
  ],
})
</script>

<style scoped>
.risk-filters {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cars-anchor {
  /* La barra del sitio es fixed (65 px): sin este margen el encabezado de la lista
     queda tapado justo despues de paginar. */
  scroll-margin-top: 84px;
}
.risk-sort {
  max-width: 260px;
}
@media (min-width: 960px) {
  .risk-filters {
    position: sticky;
    top: 80px;
  }
}
</style>
