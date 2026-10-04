<template>
  <VContainer class="py-6 py-md-10">
    <VBreadcrumbs :items="breadcrumbs" class="px-0 mb-2" />

    <template v-if="!data">
      <h1 class="text-h5 font-weight-bold mb-3">
        {{
          failureCode === 404
            ? 'No hay precios de alquiler publicados para este barrio'
            : 'No pudimos cargar los precios de este barrio'
        }}
      </h1>
      <VBtn color="primary" :to="localePath(RENTALS_PATH)">Ir al directorio de alquileres</VBtn>
    </template>

    <template v-else>
      <header class="mb-6">
        <h1 class="text-h4 font-weight-bold mb-2">{{ heading }}</h1>
        <p class="text-body-1 mb-1">{{ intro }}</p>
        <p v-if="dataDate" class="text-body-2 text-medium-emphasis mb-0">
          Precios pedidos en avisos vigentes, actualizados el {{ dataDate }}. No son precios de
          contratos firmados.
        </p>
        <VAlert
          v-if="!data.indexable"
          type="info"
          variant="outlined"
          density="compact"
          class="mt-3"
        >
          Todavía hay pocos avisos o datos recientes de este barrio para publicar precios firmes.
        </VAlert>
      </header>

      <section v-for="group in tables" :key="group.type" class="mb-8">
        <h2 class="text-h6 mb-2">{{ group.title }}</h2>
        <div class="barrio-table">
          <VTable class="cu-mobile-cards" density="compact">
            <caption class="text-left text-body-2 text-medium-emphasis pb-2">
              Mediana y rango del 50 % central de lo que se pide por mes, en pesos uruguayos. El
              alquiler no incluye gastos comunes; el total mensual los suma.
            </caption>
            <thead>
              <tr>
                <th scope="col">Dormitorios</th>
                <th scope="col">Mediana</th>
                <th scope="col">Rango (p25–p75)</th>
                <th scope="col">Gastos comunes</th>
                <th scope="col">Total mensual</th>
                <th scope="col">$/m²</th>
                <th scope="col">Avisos</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="cell in group.cells" :key="cell.bedrooms">
                <td data-label="">
                  <NuxtLink
                    :to="
                      rentalBarrioDirectoryPath(data.department, data.neighborhood, cell.bedrooms)
                    "
                  >
                    {{ BEDROOM_LABEL[cell.bedrooms] }}
                  </NuxtLink>
                </td>
                <td data-label="Mediana">{{ formatUyu(cell.prices.rent.median) }}</td>
                <td data-label="Rango (p25–p75)">
                  {{
                    cell.prices.rent.p25 === null || cell.prices.rent.p75 === null
                      ? '—'
                      : `${formatUyu(cell.prices.rent.p25)} – ${formatUyu(cell.prices.rent.p75)}`
                  }}
                </td>
                <td data-label="Gastos comunes">
                  {{ formatUyu(cell.prices.commonExpenses.median) }}
                </td>
                <td data-label="Total mensual">{{ formatUyu(cell.prices.monthlyTotal.median) }}</td>
                <td data-label="$/m²">{{ formatUyu(cell.prices.builtSquareMeter.median) }}</td>
                <td data-label="Avisos">{{ cell.prices.rent.count }}</td>
              </tr>
            </tbody>
          </VTable>
        </div>
      </section>

      <p v-if="rankSentence" class="text-body-1 mb-8">
        {{ rankSentence }}
        <NuxtLink :to="localePath('/barrios-alquileres-uruguay')">Comparar barrios</NuxtLink>
      </p>

      <section v-if="data.listings.length" class="mb-8">
        <div class="d-flex flex-wrap align-center justify-space-between ga-2 mb-3">
          <h2 class="text-h6 mb-0">Avisos de hoy en {{ data.neighborhood }}</h2>
          <VBtn variant="text" :to="data.directoryPath">Ver todos en el directorio</VBtn>
        </div>
        <div class="barrio-grid">
          <VCard
            v-for="listing in data.listings.slice(0, 6)"
            :key="listing.key"
            :to="rentalPropertyPath(listing.key)"
            variant="outlined"
            class="pa-4"
          >
            <p class="barrio-listing-title text-body-1 font-weight-medium mb-2">
              {{ listing.title || 'Vivienda en alquiler' }}
            </p>
            <p class="text-h6 mb-1">{{ rentalMoney(listing.price, listing.currency) }}</p>
            <p class="text-body-2 text-medium-emphasis mb-0">
              {{ listingFacts(listing) }}
            </p>
          </VCard>
        </div>
      </section>
      <div v-else class="mb-8">
        <VBtn variant="tonal" color="primary" :to="data.directoryPath">
          Ver los avisos de {{ data.neighborhood }} en el directorio
        </VBtn>
      </div>

      <!-- Sin RentalsZoneServicesPanel: /api/rentals/zone-profile pide el código de zona
           (`mvd:N`) y `officialZone` trae el nombre oficial; entra cuando la API mande el código. -->
      <section v-if="data.similar.length" class="mb-8">
        <h2 class="text-h6 mb-2">Barrios con precios parecidos</h2>
        <div class="d-flex flex-wrap ga-2">
          <VChip
            v-for="item in data.similar"
            :key="item.path"
            :to="localePath(item.path)"
            variant="outlined"
          >
            {{ item.neighborhood
            }}<template v-if="item.median !== null">&nbsp;· {{ formatUyu(item.median) }}</template>
          </VChip>
        </div>
      </section>

      <section v-if="data.largest.length" class="mb-8">
        <h2 class="text-h6 mb-2">Barrios de {{ data.department }} con más avisos</h2>
        <div class="d-flex flex-wrap ga-2">
          <VChip
            v-for="item in data.largest"
            :key="item.path"
            :to="localePath(item.path)"
            variant="outlined"
          >
            {{ item.neighborhood
            }}<template v-if="item.median !== null">&nbsp;· {{ formatUyu(item.median) }}</template>
          </VChip>
        </div>
      </section>

      <section class="mb-8">
        <h2 class="text-h6 mb-2">Antes de alquilar</h2>
        <ul class="barrio-guides">
          <li v-for="guide in GUIDES" :key="guide.to">
            <NuxtLink :to="localePath(guide.to)">{{ guide.label }}</NuxtLink>
          </li>
        </ul>
      </section>

      <FaqSection :items="faq" heading="Preguntas frecuentes" :expanded="true" />

      <AssistantCta topic="hogar" class="mt-6" />
    </template>
  </VContainer>
</template>

<script setup lang="ts">
import type { RentalBarrioListing, RentalBarrioResponse } from '~/server/utils/rentalBarrio'
import type { FaqItem } from '~/utils/faqAnswers'
import { rentalBarrioDirectoryPath, type RentalBarrioCell } from '~/utils/rentalBarrio'
import {
  BEDROOM_LABEL,
  formatUyu,
  rentalBarrioDate,
  rentalBarrioDescription,
  rentalBarrioFaq,
  rentalBarrioIntro,
  rentalBarrioRankSentence,
  rentalBarrioTitle,
} from '~/utils/rentalBarrioCopy'
import { rentalMoney, rentalPropertyPath } from '~/utils/rentalPresentation'
import type { RentalZonePropertyType } from '~/utils/rentalZoneTypes'

// Sólo en español, como las fichas de alquiler: el contenido (barrios, avisos) es en español.
defineI18nRoute({ locales: ['es'] })
definePageMeta({
  validate: route =>
    /^[a-z0-9-]{1,80}$/.test(String(route.params.departamento)) &&
    /^[a-z0-9-]{1,80}$/.test(String(route.params.barrio)),
})

const RENTALS_PATH = '/alquileres-uruguay'
const SITE = 'https://cambio-uruguay.com'
const GUIDES = [
  { to: '/garantia-de-alquiler-uruguay', label: 'Garantías de alquiler: cuál conviene' },
  { to: '/guias/deposito-de-alquiler-uruguay', label: 'Depósito de alquiler' },
  { to: '/primer-alquiler-uruguay', label: 'Tu primer alquiler' },
  { to: '/guias/que-revisar-antes-de-firmar-alquiler', label: 'Qué revisar antes de firmar' },
  { to: '/evolucion-precio-alquileres-uruguay', label: 'Evolución del precio de los alquileres' },
  { to: '/barrios-alquileres-uruguay', label: 'Comparar barrios' },
] as const
const TYPE_TITLE: Record<RentalZonePropertyType, string> = {
  apartamento: 'Apartamentos',
  casa: 'Casas',
}

const route = useRoute()
const localePath = useLocalePath()
const department = computed(() => String(route.params.departamento || ''))
const barrio = computed(() => String(route.params.barrio || ''))

const { data, error } = await useAsyncData<RentalBarrioResponse>(
  () => `rental-barrio-${department.value}-${barrio.value}`,
  () =>
    $fetch<RentalBarrioResponse>('/api/rentals/barrio', {
      query: { department: department.value, barrio: barrio.value },
    })
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

const heading = computed(() =>
  data.value ? rentalBarrioTitle(data.value) : 'Precios de alquiler por barrio'
)
const description = computed(() => (data.value ? rentalBarrioDescription(data.value) : ''))
const intro = computed(() => (data.value ? rentalBarrioIntro(data.value) : ''))
const rankSentence = computed(() => (data.value ? rentalBarrioRankSentence(data.value) : null))
const faq = computed<FaqItem[]>(() => (data.value ? rentalBarrioFaq(data.value) : []))
const canonical = computed(() =>
  data.value ? `${SITE}${data.value.path}` : `${SITE}/alquiler/${department.value}/${barrio.value}`
)
const dataDate = computed(() => (data.value ? rentalBarrioDate(data.value) : null))

const breadcrumbs = computed(() => [
  { title: 'Inicio', to: localePath('/') },
  { title: 'Alquileres', to: localePath(RENTALS_PATH) },
  { title: data.value?.neighborhood ?? 'Barrio' },
])

const tables = computed(() => {
  const cells = data.value?.cells ?? []
  return (['apartamento', 'casa'] as const)
    .map(type => ({
      type,
      title: TYPE_TITLE[type],
      cells: cells.filter((cell: RentalBarrioCell) => cell.propertyType === type),
    }))
    .filter(group => group.cells.length > 0)
})

function listingFacts(listing: RentalBarrioListing): string {
  const facts: string[] = []
  if (listing.bedrooms === 0) facts.push('Monoambiente')
  else if (listing.bedrooms !== null)
    facts.push(`${listing.bedrooms} ${listing.bedrooms === 1 ? 'dormitorio' : 'dormitorios'}`)
  if (listing.area !== null) facts.push(`${listing.area} m²`)
  return facts.join(' · ') || (listing.propertyType === 'casa' ? 'Casa' : 'Apartamento')
}

useSeoMeta({
  title: () => `${heading.value} | Cambio Uruguay`,
  description,
  ogTitle: heading,
  ogDescription: description,
  ogUrl: canonical,
  // Un barrio con pocos datos existe como página pero no promete un rango que la muestra no sostiene.
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
                name: 'Alquileres',
                item: `${SITE}${RENTALS_PATH}`,
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: data.value.neighborhood,
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
.barrio-table {
  overflow-x: auto;
}
.barrio-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 16px;
}
.barrio-listing-title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.barrio-guides {
  padding-left: 1.25rem;
}
</style>
