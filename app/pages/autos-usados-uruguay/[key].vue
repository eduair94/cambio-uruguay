<template>
  <VContainer class="py-6 py-md-10">
    <VBreadcrumbs :items="breadcrumbs" class="px-0 mb-2" />

    <template v-if="!data">
      <h1 class="text-h5 font-weight-bold mb-3">
        {{
          failureCode === 404
            ? 'Este aviso ya no está en el directorio'
            : 'No pudimos cargar el aviso'
        }}
      </h1>
      <p class="text-body-1 mb-4">
        {{
          failureCode === 404
            ? 'Los avisos de autos vencen o se venden rápido. Buscá autos parecidos en el directorio.'
            : 'Probá de nuevo en unos minutos.'
        }}
      </p>
      <VBtn color="primary" :to="localePath(CARS_PATH)">Ir al directorio</VBtn>
    </template>

    <template v-else>
      <VRow>
        <VCol cols="12" md="6">
          <div class="car-photo">
            <img
              v-if="car.picture"
              :src="car.picture"
              :alt="car.title"
              width="720"
              height="480"
              referrerpolicy="no-referrer"
            />
            <VIcon v-else icon="mdi-car-outline" size="64" />
          </div>
        </VCol>
        <VCol cols="12" md="6">
          <h1 class="text-h5 font-weight-bold mb-2">{{ car.title }}</h1>
          <p class="text-h4 font-weight-bold mb-1">{{ formatCarPrice(car) }}</p>
          <p v-if="carListedPriceNote(car)" class="text-body-2 mb-2" data-testid="car-listed-price">
            {{ carListedPriceNote(car) }}
          </p>
          <p v-if="car.priceConverted" class="text-body-2 text-medium-emphasis">
            ≈ {{ formatCarUsd(car.priceUsd) }} a la cotización del día
          </p>
          <VAlert
            v-if="car.currencyInferred"
            type="info"
            variant="outlined"
            density="compact"
            class="mb-2"
          >
            El aviso no dice la moneda: la dedujimos comparando con autos iguales.
          </VAlert>
          <p v-if="car.priceDrop" class="text-body-2 mb-2">
            Bajó de
            {{ formatCarPrice({ price: car.priceDrop.from, currency: car.priceDrop.currency }) }}
            el {{ formatCarDate(car.priceDrop.since) }}.
          </p>
          <VTable density="compact" class="mb-4">
            <tbody>
              <tr>
                <th scope="row">Año</th>
                <td>{{ car.year }}</td>
              </tr>
              <tr>
                <th scope="row">Kilómetros</th>
                <td>{{ formatCarKm(car.km) }}</td>
              </tr>
              <tr v-if="car.trim || car.engine">
                <th scope="row">Versión</th>
                <td>{{ [car.trim, car.engine].filter(Boolean).join(' · ') }}</td>
              </tr>
              <tr v-if="car.transmission">
                <th scope="row">Caja</th>
                <td>{{ CAR_TRANSMISSION_LABELS[car.transmission] }}</td>
              </tr>
              <tr v-if="car.fuel">
                <th scope="row">Combustible</th>
                <td>{{ CAR_FUEL_LABELS[car.fuel] }}</td>
              </tr>
              <tr v-if="car.fuelEconomy" data-testid="car-fuel-economy">
                <th scope="row">Rendimiento</th>
                <td>
                  <strong>{{ formatCarFuelEconomy(car.fuelEconomy) }}</strong>
                  <span class="d-block text-body-2 text-medium-emphasis">
                    {{ carFuelEconomySource(car.fuelEconomy) }}
                  </span>
                </td>
              </tr>
              <tr>
                <th scope="row">Ubicación</th>
                <td>{{ [car.neighborhood, car.department].filter(Boolean).join(', ') || '—' }}</td>
              </tr>
              <tr v-if="car.sellerType">
                <th scope="row">Vende</th>
                <td>{{ car.dealerName || CAR_SELLER_LABELS[car.sellerType] }}</td>
              </tr>
              <tr v-if="car.reference">
                <th scope="row">Referencia (guía de Mercado Libre)</th>
                <td>
                  {{ formatCarUsd(car.reference.priceUsd) }}
                  <span v-if="car.reference.basis === 'year'" class="text-medium-emphasis">
                    (promedio del año, todas las versiones)
                  </span>
                </td>
              </tr>
              <tr>
                <th scope="row">Fuente</th>
                <td>{{ car.sourceName }}</td>
              </tr>
              <tr>
                <th scope="row">Visto por primera vez</th>
                <td>{{ formatCarDate(car.firstSeen) }}</td>
              </tr>
              <tr>
                <th scope="row">Última lectura</th>
                <td>{{ formatCarDate(car.lastSeen) }}</td>
              </tr>
            </tbody>
          </VTable>
          <VAlert
            v-for="flag in car.flags"
            :key="flag"
            type="warning"
            variant="outlined"
            density="compact"
            class="mb-2"
          >
            {{ CAR_FLAG_LABELS[flag] }}.
          </VAlert>
          <section v-if="car.risks?.length" class="car-declared mb-4">
            <h2 class="text-subtitle-1 font-weight-bold mb-2">Lo que declara este aviso</h2>
            <div v-for="risk in car.risks" :key="risk.category" class="mb-3">
              <p class="text-body-2 font-weight-bold mb-1">
                {{ CAR_RISK_GUIDE[risk.category].label }}
              </p>
              <blockquote class="car-declared__quote mb-1">
                <q>{{ risk.quote }}</q>
                <span class="text-caption text-medium-emphasis">
                  — {{ risk.from === 'title' ? 'título del aviso' : 'descripción del aviso' }}
                </span>
              </blockquote>
              <p class="text-body-2 mb-0">
                {{ CAR_RISK_GUIDE[risk.category].meaning }}
                <strong>{{ CAR_RISK_GUIDE[risk.category].check }}</strong>
              </p>
            </div>
            <p class="text-body-2 mb-0">
              Lo dice el vendedor, no nosotros. Más avisos así, y cuánto descuenta el mercado por
              cada motivo, en
              <NuxtLink :to="localePath(CAR_RISKS_PATH)">autos con deuda o chocados</NuxtLink>.
            </p>
          </section>
          <div class="d-flex flex-wrap ga-2">
            <VBtn
              v-if="car.permalink"
              color="primary"
              :href="car.permalink"
              target="_blank"
              rel="nofollow noopener"
              append-icon="mdi-open-in-new"
            >
              Ver aviso en {{ car.sourceName }}
            </VBtn>
            <VBtn variant="outlined" :to="localePath('/comprar-auto-con-deuda-uruguay')">
              Revisar deudas antes de señar
            </VBtn>
          </div>
        </VCol>
      </VRow>

      <section v-if="data.cohort" class="mt-8">
        <h2 class="text-h6 mb-2">¿Cómo está el precio?</h2>
        <p class="text-body-1">
          Para {{ car.brand }} {{ car.model }} {{ data.cohort.trim || '' }} {{ car.year }} hay
          {{ data.cohort.n }} avisos comparables: la mitad pide menos de
          <strong>{{ formatCarUsd(data.cohort.median) }}</strong> y el rango central va de
          {{ formatCarUsd(data.cohort.p25) }} a {{ formatCarUsd(data.cohort.p75) }}, con
          {{ formatCarKm(data.cohort.kmMedian) }} de mediana. Este aviso pide
          {{ formatCarUsd(car.priceUsd) }}.
        </p>
      </section>

      <section v-if="data.opportunity" class="mt-8">
        <h2 class="text-h6 mb-2">Por qué aparece como oportunidad</h2>
        <CarsOpportunityCard :item="data.opportunity" hide-subject-link />
      </section>

      <section v-if="data.similar.length" class="mt-8">
        <h2 class="text-h6 mb-3">Otros {{ car.brand }} {{ car.model }} parecidos</h2>
        <div class="cars-grid">
          <CarsListingCard v-for="other in data.similar" :key="other.key" :car="other" />
        </div>
      </section>

      <p class="text-body-2 text-medium-emphasis mt-8">
        Datos del aviso publicado en {{ car.sourceName }}. Es un precio pedido, no una tasación;
        confirmá estado, papeles y deudas del vehículo antes de pagar.
      </p>
    </template>
  </VContainer>
</template>

<script setup lang="ts">
import { CAR_RISKS_PATH, CAR_RISK_GUIDE } from '~/utils/carsRisk'
import {
  CAR_FLAG_LABELS,
  CAR_FUEL_LABELS,
  CAR_SELLER_LABELS,
  CAR_TRANSMISSION_LABELS,
  CARS_PATH,
  carKeyValid,
  carMarketPath,
  carPath,
  formatCarDate,
  formatCarKm,
  formatCarPrice,
  carListedPriceNote,
  formatCarFuelEconomy,
  carFuelEconomySource,
  formatCarUsd,
  type CarDetailResponse,
} from '~/utils/cars'

const route = useRoute()
const localePath = useLocalePath()
const key = computed(() => String(route.params.key || ''))
const { data, error } = await useAsyncData<CarDetailResponse>(
  () => `car-${key.value}`,
  () => {
    if (!carKeyValid(key.value))
      throw createError({ statusCode: 404, statusMessage: 'Advert not found' })
    return $fetch<CarDetailResponse>(`/api/cars/ficha/${encodeURIComponent(key.value)}`)
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
const car = computed(() => data.value!.car)
const breadcrumbs = computed(() => [
  { title: 'Autos usados', to: localePath(CARS_PATH) },
  ...(data.value?.market
    ? [
        {
          title: `${data.value.market.brand} ${data.value.market.model}`,
          to: localePath(carMarketPath(data.value.market.slug)),
        },
      ]
    : []),
  { title: data.value?.car.title ?? 'Aviso' },
])
const canonical = computed(() => `https://cambio-uruguay.com${carPath(key.value)}`)
const title = computed(() =>
  data.value ? `${car.value.title} ${car.value.year}` : 'Aviso de auto usado'
)
const description = computed(() =>
  data.value
    ? `${car.value.title}, ${car.value.year}, ${formatCarKm(car.value.km)}: ${formatCarPrice(car.value)}. Comparado contra avisos iguales en Uruguay.`
    : 'Aviso de auto usado en Uruguay.'
)

useSeoMeta({
  title: () => `${title.value} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogUrl: canonical,
  // An advert expires within weeks: the page helps decide, it does not belong in the index.
  robots: 'noindex, follow',
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonical.value }],
  script: data.value
    ? [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Car',
            name: car.value.title,
            brand: { '@type': 'Brand', name: car.value.brand },
            model: car.value.model,
            vehicleModelDate: String(car.value.year),
            ...(car.value.km !== null
              ? {
                  mileageFromOdometer: {
                    '@type': 'QuantitativeValue',
                    value: car.value.km,
                    unitCode: 'KMT',
                  },
                }
              : {}),
            url: canonical.value,
            offers: {
              '@type': 'Offer',
              price: car.value.price,
              priceCurrency: car.value.currency,
              url: car.value.permalink,
              itemCondition: 'https://schema.org/UsedCondition',
            },
          }),
        },
      ]
    : [],
}))
</script>

<style scoped>
.car-declared {
  border-left: 3px solid rgb(var(--v-theme-warning));
  padding-left: 12px;
}
.car-declared__quote {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
}
.car-photo {
  aspect-ratio: 3 / 2;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.car-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cars-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 16px;
}
</style>
