<template>
  <VContainer class="py-6 py-md-10">
    <VBreadcrumbs :items="breadcrumbs" class="px-0 mb-2" />

    <template v-if="!data">
      <h1 class="text-h5 font-weight-bold mb-3">
        {{
          failureCode === 404
            ? 'No hay datos publicados para este presupuesto'
            : 'No pudimos cargar los autos de este presupuesto'
        }}
      </h1>
      <VBtn color="primary" :to="localePath(CARS_PATH)">Ir al directorio de autos usados</VBtn>
    </template>

    <template v-else>
      <header class="mb-6">
        <h1 class="text-h4 font-weight-bold mb-2">{{ heading }}</h1>
        <p class="text-body-1 mb-1">{{ intro }}</p>
        <p v-if="dataDate" class="text-body-2 text-medium-emphasis mb-0">
          Precios pedidos en avisos vigentes de Mercado Libre, Facebook Marketplace y webs de
          automotoras, actualizados el {{ dataDate }}. No es una tasación.
        </p>
        <VAlert
          v-if="!data.indexable"
          type="info"
          variant="outlined"
          density="compact"
          class="mt-3"
        >
          Hoy hay pocos modelos con avisos suficientes en este presupuesto: tomá la tabla como
          referencia gruesa.
        </VAlert>
      </header>

      <section v-if="data.models.length" class="mb-8">
        <h2 class="text-h6 mb-2">Qué modelos se compran con {{ usd }}</h2>
        <div class="budget-table">
          <VTable class="cu-mobile-cards" density="compact">
            <caption class="text-left text-body-2 text-medium-emphasis pb-2">
              Mediana de precio, año y kilómetros de cada modelo dentro de la franja; sólo modelos
              con 8 avisos o más.
            </caption>
            <thead>
              <tr>
                <th scope="col">Modelo</th>
                <th scope="col">Mediana</th>
                <th scope="col">Año</th>
                <th scope="col">Kilómetros</th>
                <th scope="col">Avisos</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in data.models" :key="row.marketSlug">
                <td data-label="">
                  <NuxtLink v-if="row.hasPage" :to="localePath(carMarketPath(row.marketSlug))">
                    {{ carBudgetModelName(row) }}
                  </NuxtLink>
                  <template v-else>{{ carBudgetModelName(row) }}</template>
                </td>
                <td data-label="Mediana">{{ formatUsd(row.medianUsd) }}</td>
                <td data-label="Año">{{ row.medianYear }}</td>
                <td data-label="Kilómetros">
                  {{ row.medianKm === null ? '—' : formatCarKm(row.medianKm) }}
                </td>
                <td data-label="Avisos">{{ row.adverts.toLocaleString('es-UY') }}</td>
              </tr>
            </tbody>
          </VTable>
        </div>
      </section>

      <VAlert type="info" variant="tonal" density="compact" class="mb-8">
        La franja es lo que se pide <strong>cerca</strong> del tope: entre {{ bandFrom }} y
        {{ usd }} (del 80 % al 100 %), no todo lo que cuesta menos. Por eso muestra lo que se compra
        gastando {{ usd }}, no lo más barato que entra.
      </VAlert>

      <section class="mb-8">
        <div class="d-flex flex-wrap align-center justify-space-between ga-2 mb-3">
          <h2 class="text-h6 mb-0">Avisos vigentes hasta {{ usd }}</h2>
          <VBtn variant="text" :to="directoryLink">Ver todos en el directorio</VBtn>
        </div>
        <p class="text-body-2 text-medium-emphasis mb-3">
          Avisos entre {{ listingFloor }} y {{ usd }}, los de año más nuevo primero.
        </p>
        <div v-if="data.listings.length" class="budget-grid">
          <CarsListingCard v-for="car in data.listings" :key="car.key" :car="car" />
        </div>
        <VBtn v-else variant="tonal" color="primary" :to="directoryLink">
          Ver los autos hasta {{ usd }} en el directorio
        </VBtn>
      </section>

      <section class="mb-8">
        <h2 class="text-h6 mb-2">Qué revisar antes de comprar</h2>
        <ul class="budget-guides">
          <li v-for="guide in GUIDES" :key="guide.to">
            <NuxtLink :to="localePath(guide.to)">{{ guide.label }}</NuxtLink>
          </li>
        </ul>
      </section>

      <section class="mb-8">
        <h2 class="text-h6 mb-2">Otros presupuestos</h2>
        <div class="d-flex flex-wrap ga-2 mb-3">
          <VChip
            v-for="other in data.others"
            :key="other"
            :to="localePath(carBudgetPath(other))"
            variant="outlined"
          >
            Hasta {{ formatUsd(other) }}
          </VChip>
        </div>
        <p class="text-body-2 mb-0">
          ¿Todavía no sabés qué modelo?
          <NuxtLink :to="localePath('/que-auto-comprar-uruguay')">Qué auto comprar</NuxtLink>
          ·
          <NuxtLink :to="localePath('/mercado-de-autos-usados-uruguay')">
            Informe del mercado de autos usados
          </NuxtLink>
        </p>
      </section>

      <FaqSection :items="faq" heading="Preguntas frecuentes" :expanded="true" />
    </template>
  </VContainer>
</template>

<script setup lang="ts">
import {
  CAR_BUDGET_LISTING_FLOOR,
  carBudgetDescription,
  carBudgetFaq,
  carBudgetIntro,
  carBudgetModelName,
  carBudgetPath,
  carBudgetTitle,
  formatUsd,
  parseCarBudget,
  type CarBudgetResponse,
} from '~/utils/carBudget'
import { CARS_PATH, carMarketPath, formatCarDate, formatCarKm } from '~/utils/cars'
import type { FaqItem } from '~/utils/faqAnswers'

// Sólo en español, a diferencia del directorio de autos y de las páginas de modelo (que son
// trilingües): el texto de cada tramo se arma en español. Quien enlace acá desde una página
// trilingüe usa la ruta cruda, sin localePath, o en /en y /pt cae en un 404.
defineI18nRoute({ locales: ['es'] })
definePageMeta({
  validate: route => parseCarBudget(route.params.monto) !== null,
})

const SITE = 'https://cambio-uruguay.com'
const GUIDES = [
  { to: '/comprar-auto-con-deuda-uruguay', label: 'Auto usado con deuda: qué se hereda' },
  {
    to: '/guias/titulo-del-auto-uruguay',
    label: 'Título del auto: ¿hace falta o alcanza la libreta?',
  },
  { to: '/guias/transferir-un-auto-uruguay', label: 'Cómo transferir un auto' },
  {
    to: '/autos-chocados-y-con-deuda-uruguay',
    label: 'Autos chocados y con deuda: lo que declaran los avisos',
  },
] as const

const route = useRoute()
const localePath = useLocalePath()
// `validate` ya filtró: acá el monto siempre es uno de los topes.
const budget = computed(() => parseCarBudget(route.params.monto) ?? 6000)

const { data, error } = await useAsyncData<CarBudgetResponse>(
  () => `car-budget-${budget.value}`,
  () => $fetch<CarBudgetResponse>(`/api/cars/budget/${budget.value}`)
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

const usd = computed(() => formatUsd(budget.value))
const listingFloor = computed(() => formatUsd(Math.round(budget.value * CAR_BUDGET_LISTING_FLOOR)))
const bandFrom = computed(() => formatUsd(budget.value * 0.8))
const heading = computed(() => carBudgetTitle(budget.value))
const description = computed(() => (data.value ? carBudgetDescription(data.value) : ''))
const intro = computed(() => (data.value ? carBudgetIntro(data.value) : ''))
const faq = computed<FaqItem[]>(() => (data.value ? carBudgetFaq(data.value) : []))
const dataDate = computed(() =>
  data.value?.generatedAt ? formatCarDate(data.value.generatedAt) : null
)
const canonical = computed(() => `${SITE}${carBudgetPath(budget.value)}`)
const directoryLink = computed(() =>
  localePath({ path: CARS_PATH, query: { priceMax: String(budget.value) } })
)

const breadcrumbs = computed(() => [
  { title: 'Inicio', to: localePath('/') },
  { title: 'Autos usados', to: localePath(CARS_PATH) },
  { title: `Hasta ${usd.value}` },
])

useSeoMeta({
  title: () => `${heading.value} | Cambio Uruguay`,
  description,
  ogTitle: heading,
  ogDescription: description,
  ogUrl: canonical,
  // Un tramo con pocos modelos existe como página pero no contesta "qué comprar".
  robots: () => (data.value?.indexable ? 'index, follow' : 'noindex, follow'),
})

// Sólo BreadcrumbList: el FAQPage lo emite FaqSection.
useHead(() => ({
  link: [{ rel: 'canonical', href: canonical.value }],
  script: data.value
    ? [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITE}/` },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Autos usados',
                item: `${SITE}${CARS_PATH}`,
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: `Hasta ${usd.value}`,
                item: canonical.value,
              },
            ],
          }),
        },
      ]
    : [],
}))
</script>

<style scoped>
.budget-table {
  overflow-x: auto;
}
.budget-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 16px;
}
.budget-guides {
  padding-left: 1.25rem;
}
</style>
