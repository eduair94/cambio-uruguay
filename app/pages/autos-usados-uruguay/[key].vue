<template>
  <VContainer class="py-6 py-md-10">
    <VBreadcrumbs :items="breadcrumbs" class="px-0 mb-2" />

    <template v-if="!data || !car">
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
              v-if="activePicture"
              :src="activePicture"
              :alt="car.title"
              width="720"
              height="480"
              referrerpolicy="no-referrer"
            />
            <VIcon v-else icon="mdi-car-outline" size="64" />
          </div>
          <div v-if="gallery.length > 1" class="car-gallery mt-2" data-testid="car-gallery">
            <button
              v-for="(url, index) in gallery"
              :key="url"
              type="button"
              class="car-gallery__thumb"
              :class="{ 'car-gallery__thumb--active': url === activePicture }"
              :aria-label="`Foto ${index + 1} de ${gallery.length}`"
              :aria-pressed="url === activePicture"
              @click="activePicture = url"
            >
              <img
                :src="url"
                alt=""
                loading="lazy"
                width="120"
                height="80"
                referrerpolicy="no-referrer"
              />
            </button>
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
              <tr v-if="car.body" data-testid="car-body">
                <th scope="row">Carrocería</th>
                <td>
                  <strong>{{ formatCarBody(car.body) }}</strong>
                  <span class="d-block text-body-2 text-medium-emphasis">
                    {{ carBodySource(car.body) }}
                  </span>
                </td>
              </tr>
              <tr v-if="car.doors || car.color">
                <th scope="row">Puertas y color</th>
                <td>
                  {{
                    [
                      car.doors ? `${car.doors} puertas` : null,
                      car.color ? (CAR_COLOR_LABELS[car.color] ?? car.color) : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  }}
                </td>
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
                <th scope="row">Consumo</th>
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
          <CarsSellerPhone :car="car" />
        </VCol>
      </VRow>

      <section v-if="car.specs && hasSpecSheet" class="mt-8" data-testid="car-specs">
        <h2 class="text-h6 mb-1">Ficha técnica</h2>
        <p class="text-body-2 text-medium-emphasis mb-4">
          Según la ficha del aviso en {{ car.sourceName }}, leída el
          {{ formatCarDate(car.specs.readAt) }}. La cargó el vendedor; no la verificamos.
        </p>
        <VRow>
          <VCol v-if="specTables.mechanics.length > 1" cols="12" md="4">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">Motor y mecánica</h3>
            <VTable density="compact" class="car-specs__table">
              <tbody>
                <tr v-for="item in specTables.mechanics" :key="item.label">
                  <th scope="row">{{ item.label }}</th>
                  <td>{{ item.value }}</td>
                </tr>
              </tbody>
            </VTable>
          </VCol>
          <VCol v-if="specTables.dimensions.length > 1" cols="12" md="4">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">Medidas y capacidad</h3>
            <VTable density="compact" class="car-specs__table">
              <tbody>
                <tr v-for="item in specTables.dimensions" :key="item.label">
                  <th scope="row">{{ item.label }}</th>
                  <td>{{ item.value }}</td>
                </tr>
              </tbody>
            </VTable>
          </VCol>
          <VCol v-if="specTables.deal.length" cols="12" md="4">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">Condiciones del aviso</h3>
            <VTable density="compact" class="car-specs__table">
              <tbody>
                <tr v-for="item in specTables.deal" :key="item.label">
                  <th scope="row">{{ item.label }}</th>
                  <td>{{ item.value }}</td>
                </tr>
              </tbody>
            </VTable>
          </VCol>
        </VRow>
        <template v-if="equipmentGroups.length">
          <h3 class="text-subtitle-1 font-weight-bold mt-4 mb-1">Equipamiento</h3>
          <p class="text-body-2 text-medium-emphasis mb-3">
            Lo que el vendedor marcó en la ficha. Tachado, lo que marcó que el auto no tiene.
          </p>
          <div
            v-for="group in equipmentGroups"
            :key="group.title"
            class="mb-3"
            data-testid="car-equipment-group"
          >
            <h4 class="text-body-2 font-weight-bold mb-1">{{ group.title }}</h4>
            <ul class="car-equipment">
              <li v-for="label in group.has" :key="label" class="car-equipment__item">
                <VIcon size="14" aria-hidden="true">mdi-check</VIcon>
                {{ label }}
              </li>
              <li
                v-for="label in group.lacks"
                :key="`no-${label}`"
                class="car-equipment__item car-equipment__item--missing"
              >
                <VIcon size="14" aria-hidden="true">mdi-close</VIcon>
                <s>{{ label }}</s>
              </li>
            </ul>
          </div>
        </template>
      </section>

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
  CAR_BODY_LABELS,
  CAR_COLOR_LABELS,
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
  formatCarBody,
  carBodySource,
  formatCarFuelEconomy,
  carFuelEconomySource,
  formatCarUsd,
  type CarDetailResponse,
} from '~/utils/cars'
import {
  CAR_DRIVETRAIN_LABELS,
  carEquipmentGroups,
  carHasSpecSheet,
  carSpecTables,
} from '~/utils/carsSpecs'

// Una clave que no tiene forma de clave (`ml-MLU1; drop`) es un 404 ANTES de tocar la base y
// antes de que nuxt-og-image vuelva a pedir la página para leer su payload: `validate` corre
// fuera de setup, igual que en equipar/productos. La macro sólo ve imports, nunca constantes.
definePageMeta({
  validate: route => carKeyValid(String(route.params.key ?? '')),
})

const route = useRoute()
const localePath = useLocalePath()
const key = computed(() => String(route.params.key || ''))
const { data, error } = await useAsyncData<CarDetailResponse>(
  () => `car-${key.value}`,
  () => $fetch<CarDetailResponse>(`/api/cars/ficha/${encodeURIComponent(key.value)}`)
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
// `null` cuando el aviso ya no está, nunca `data.value!`: el 22/9/2026 una lectura ansiosa
// (`ref(gallery.value[0])`) sobre un aviso vencido tiraba TypeError dentro de setup y Nitro
// pisaba el 404 recién puesto con un 500 "Server Error", en los tres idiomas y también en el
// endpoint /__og-image__ que vuelve a pedir la página. Todo lo que cuelga de `car` tiene que
// seguir vivo con `car.value === null`; `tests/unit/carsDetailPageStatus.test.ts` lo vigila.
const car = computed(() => data.value?.car ?? null)
// The advert's own gallery when its page was read; the search-card cover otherwise.
const gallery = computed(() =>
  car.value?.pictures?.length ? car.value.pictures : car.value?.picture ? [car.value.picture] : []
)
const activePicture = ref<string | null>(gallery.value[0] ?? null)
watch(gallery, list => {
  activePicture.value = list[0] ?? null
})
const specTables = computed(() =>
  car.value ? carSpecTables(car.value) : { mechanics: [], dimensions: [], deal: [] }
)
const equipmentGroups = computed(() => carEquipmentGroups(car.value?.specs))
const hasSpecSheet = computed(() => !!car.value && carHasSpecSheet(car.value))
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
  car.value ? `${car.value.title} ${car.value.year}` : 'Aviso de auto usado'
)
const description = computed(() =>
  car.value
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
  script: car.value
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
            ...(gallery.value.length ? { image: gallery.value } : {}),
            ...(car.value.body ? { bodyType: CAR_BODY_LABELS[car.value.body.type] } : {}),
            ...(car.value.color ? { color: CAR_COLOR_LABELS[car.value.color] } : {}),
            ...(car.value.doors ? { numberOfDoors: car.value.doors } : {}),
            ...(car.value.fuel ? { fuelType: CAR_FUEL_LABELS[car.value.fuel] } : {}),
            ...(car.value.transmission
              ? { vehicleTransmission: CAR_TRANSMISSION_LABELS[car.value.transmission] }
              : {}),
            ...(car.value.engine || car.value.specs?.powerHp
              ? {
                  vehicleEngine: {
                    '@type': 'EngineSpecification',
                    ...(car.value.engine ? { engineDisplacement: car.value.engine } : {}),
                    ...(car.value.specs?.powerHp
                      ? {
                          enginePower: {
                            '@type': 'QuantitativeValue',
                            value: car.value.specs.powerHp,
                            unitCode: 'BHP',
                          },
                        }
                      : {}),
                  },
                }
              : {}),
            ...(car.value.specs?.seats ? { seatingCapacity: car.value.specs.seats } : {}),
            ...(car.value.specs?.gears ? { numberOfForwardGears: car.value.specs.gears } : {}),
            ...(car.value.specs?.drivetrain
              ? { driveWheelConfiguration: CAR_DRIVETRAIN_LABELS[car.value.specs.drivetrain] }
              : {}),
            ...(car.value.specs?.fuelTankL
              ? {
                  fuelCapacity: {
                    '@type': 'QuantitativeValue',
                    value: car.value.specs.fuelTankL,
                    unitCode: 'LTR',
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
.car-gallery {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.car-gallery__thumb {
  flex: 0 0 auto;
  width: 96px;
  aspect-ratio: 3 / 2;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(var(--v-theme-on-surface), 0.06);
  cursor: pointer;
}
.car-gallery__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.car-gallery__thumb--active {
  border-color: rgb(var(--v-theme-primary));
}
.car-specs__table th {
  white-space: nowrap;
  padding-right: 16px;
}
.car-equipment {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 8px;
  list-style: none;
  margin: 0;
  padding: 0;
}
.car-equipment__item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8125rem;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 999px;
  padding: 2px 10px 2px 8px;
}
.car-equipment__item--missing {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.cars-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 16px;
}
</style>
