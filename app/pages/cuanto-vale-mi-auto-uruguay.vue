<template>
  <VContainer class="py-6 py-md-10">
    <VBreadcrumbs
      :items="[
        { title: 'Autos usados', to: localePath(CARS_PATH) },
        { title: '¿Cuánto vale mi auto?' },
      ]"
      class="px-0 mb-2"
    />

    <header class="mb-6">
      <h1 class="text-h4 font-weight-bold mb-2">¿Cuánto vale mi auto usado en Uruguay?</h1>
      <p class="text-body-1 mb-3">
        Elegí marca, modelo, año y kilómetros, y te decimos cuánto están pidiendo
        <strong>hoy</strong> por autos como el tuyo, corregido por kilometraje. Sale de los avisos
        vigentes de Mercado Libre, Facebook Marketplace y ocho webs de automotoras y clasificados,
        que leemos todos los días.
      </p>
      <VAlert type="info" variant="outlined" density="comfortable">
        Es lo que se <strong>pide</strong>, no lo que se paga. Si vendés a una automotora que te lo
        toma, la oferta va a ser menor que estos números: ellos también lo tienen que vender.
      </VAlert>
    </header>

    <VRow>
      <VCol cols="12" md="4">
        <form class="valuation-form" @submit.prevent="apply">
          <VSelect
            v-model="draft.brand"
            :items="brandItems"
            label="Marca"
            density="comfortable"
            variant="outlined"
            hide-details
          />
          <VSelect
            v-model="draft.model"
            :items="modelItems"
            :disabled="!draft.brand || !modelItems.length"
            label="Modelo"
            density="comfortable"
            variant="outlined"
            hide-details
          />
          <VSelect
            v-model="draft.year"
            :items="yearItems"
            :disabled="!yearItems.length"
            label="Año"
            density="comfortable"
            variant="outlined"
            hide-details
          />
          <VTextField
            v-model="draft.km"
            label="Kilómetros"
            inputmode="numeric"
            placeholder="Ej. 85000"
            density="comfortable"
            variant="outlined"
            hide-details
          />
          <VSelect
            v-if="versionItems.length > 1"
            v-model="draft.version"
            :items="versionItems"
            label="Versión (opcional)"
            density="comfortable"
            variant="outlined"
            hide-details
          />
          <VBtn type="submit" color="primary" block :disabled="!draft.model || !draft.year">
            Calcular
          </VBtn>
        </form>
      </VCol>

      <VCol cols="12" md="8">
        <VAlert v-if="marketError" type="info" variant="outlined">
          No pudimos leer el mercado de ese modelo. Probá de nuevo en unos minutos.
        </VAlert>

        <template v-else-if="estimate">
          <section class="valuation-result">
            <p class="text-body-2 text-medium-emphasis mb-1">
              {{ market?.brand }} {{ market?.model }} {{ query.year }}
              <template v-if="query.km !== null"> · {{ formatCarKm(query.km) }}</template>
              <template v-if="estimate.basis === 'version'">
                · {{ estimate.row.trim }} {{ estimate.row.engine }}
                {{ estimate.row.transmission === 'automatica' ? 'automática' : 'manual' }}
              </template>
            </p>
            <p class="text-h4 font-weight-bold mb-1">
              {{ formatCarUsd(estimate.suggested.market) }}
            </p>
            <p class="text-body-1 mb-4">
              es lo que se pide hoy por un auto como el tuyo. La mitad de los avisos parecidos está
              entre <strong>{{ formatCarUsd(estimate.low) }}</strong> y
              <strong>{{ formatCarUsd(estimate.high) }}</strong
              >.
            </p>

            <div class="valuation-prices">
              <div class="valuation-price">
                <p class="text-caption text-medium-emphasis mb-1">Para vender rápido</p>
                <p class="text-h6 font-weight-bold mb-0">
                  {{ formatCarUsd(estimate.suggested.quick) }}
                </p>
                <p class="text-caption mb-0">Más barato que tres de cada cuatro avisos iguales.</p>
              </div>
              <div class="valuation-price valuation-price--main">
                <p class="text-caption text-medium-emphasis mb-1">Precio de mercado</p>
                <p class="text-h6 font-weight-bold mb-0">
                  {{ formatCarUsd(estimate.suggested.market) }}
                </p>
                <p class="text-caption mb-0">La mediana de los avisos iguales.</p>
              </div>
              <div class="valuation-price">
                <p class="text-caption text-medium-emphasis mb-1">Tope realista</p>
                <p class="text-h6 font-weight-bold mb-0">
                  {{ formatCarUsd(estimate.suggested.ceiling) }}
                </p>
                <p class="text-caption mb-0">Arriba de esto competís con los más caros.</p>
              </div>
            </div>

            <ul class="text-body-2 pl-5 mt-4 mb-0">
              <li>
                Sale de <strong>{{ estimate.row.n }} avisos</strong> de
                {{ estimate.row.sellers }} vendedores
                {{
                  estimate.basis === 'version'
                    ? 'de la misma versión, motor y caja'
                    : 'del mismo modelo y año, de todas las versiones'
                }}, con {{ formatCarKm(estimate.row.kmMedian) }} de mediana.
              </li>
              <li v-if="query.km !== null && estimate.kmFactor !== 1">
                Tus kilómetros {{ estimate.kmFactor < 1 ? 'restan' : 'suman' }}
                {{ carReportPercent(Math.abs(1 - estimate.kmFactor), 1) }} contra esa mediana: en
                este mercado cada 10.000 km de diferencia pesan
                {{ carReportPercent(coefficients?.km.value ?? null, 1) }} en el precio del mismo
                modelo y año.
                <template v-if="estimate.kmCapped">
                  La corrección está topeada: tan lejos del kilometraje típico, el número es menos
                  confiable.
                </template>
              </li>
              <li v-if="estimate.basis === 'year' && automaticNote">{{ automaticNote }}</li>
              <li v-if="yearlyLoss !== null">
                Este modelo se pide unos {{ carReportPercent(modelDrop, 1) }} más barato por cada
                año de antigüedad: esperar un año a vender cuesta alrededor de
                {{ formatCarUsd(yearlyLoss) }}.
              </li>
              <li v-if="negotiationCut !== null">
                De los avisos que vimos cambiar de precio, la mayoría bajó, y el recorte mediano fue
                de
                {{ carReportPercent(negotiationCut, 1) }}. Contá con ese margen al publicar.
              </li>
            </ul>
            <p class="text-body-2 mt-4 mb-0">
              <NuxtLink :to="localePath(carMarketPath(query.model))">
                Ver los precios de {{ market?.brand }} {{ market?.model }} año por año
              </NuxtLink>
              ·
              <NuxtLink :to="localePath(CAR_SELL_PATH)">Guía para vender tu auto</NuxtLink>
            </p>
          </section>
        </template>

        <VAlert v-else-if="market && query.year" type="warning" variant="outlined">
          Hay menos de {{ CAR_VALUATION_MIN_SAMPLE }} avisos de {{ market.brand }}
          {{ market.model }} {{ query.year }} en este momento, y con menos que eso cualquier número
          sería una anécdota. Probá un año vecino o mirá
          <NuxtLink :to="localePath(carMarketPath(query.model))"
            >todos los años de este modelo</NuxtLink
          >.
        </VAlert>

        <section v-else class="valuation-empty">
          <p class="text-body-1 mb-2">
            Elegí el auto a la izquierda. Para cada modelo mostramos sólo los años que tienen avisos
            suficientes para dar un número.
          </p>
          <p v-if="deepestModels" class="text-body-2 text-medium-emphasis mb-0">
            Los modelos con más avisos hoy son {{ deepestModels }}: para esos el rango es más fino.
          </p>
        </section>
      </VCol>
    </VRow>

    <section class="mt-10">
      <h2 class="text-h5 mb-3">Cómo se calcula</h2>
      <ul class="text-body-1 pl-5">
        <li>
          Se toman los avisos vigentes del <strong>mismo modelo y año</strong> —o de la misma
          versión, motor y caja, si la elegís y hay avisos suficientes— y se miran sus precios: la
          mediana es el precio de mercado, y el cuarto más barato y el más caro marcan el rango.
        </li>
        <li>
          Esos precios se corrigen por tus kilómetros con lo que el propio mercado dice que pesan:
          en autos del mismo modelo y año, cada 10.000 km de diferencia se piden
          {{ carReportPercent(coefficients?.km.value ?? null, 1) }} más baratos (mediana de
          {{ coefficients?.km.cohorts ?? 'varias' }} cohortes). La corrección nunca pasa del 25 %.
        </li>
        <li>
          Los precios sugeridos se redondean a como redondea el mercado: seis de cada diez avisos
          terminan en 900, 500 o 990.
        </li>
        <li>
          Si hay menos de {{ CAR_VALUATION_MIN_SAMPLE }} avisos del auto, no damos número. Un precio
          inventado es peor que ninguno.
        </li>
        <li>
          Un mismo auto publicado en varias fuentes cuenta una vez, y quedan afuera los avisos con
          kilómetros de relleno (111.111), en pesos o de chocados declarados.
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import type { PublicCarMarketSnapshot } from '~/utils/carsPublic'
import { CARS_PATH, carMarketPath, formatCarKm, formatCarUsd } from '~/utils/cars'
import { carReportPercent, type CarReportResponse } from '~/utils/carsReport'
import {
  CAR_SELL_PATH,
  CAR_VALUATION_MIN_SAMPLE,
  CAR_VALUATION_PATH,
  carValuationRowKey,
  carValuationVersions,
  carValuationYearlyLoss,
  carValuationYears,
  estimateCarValue,
} from '~/utils/carsValuation'

interface CarFacet {
  slug: string
  name: string
  count: number
}
interface CarsFacetsResponse {
  facets: { brands: CarFacet[]; models: CarFacet[] }
}

const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()

const text = (value: unknown): string => (typeof value === 'string' ? value : '')
const slug = (value: unknown): string =>
  text(value)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 60)
const whole = (value: unknown, min: number, max: number): number | null => {
  const parsed = Number(text(value).replace(/\D/g, ''))
  return text(value) && Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null
}

// La elección vive en la URL: un resultado se comparte y se abre ya calculado desde el servidor.
const query = computed(() => ({
  brand: slug(route.query.marca),
  model: slug(route.query.modelo),
  year: whole(route.query.anio, 1970, 2030),
  km: whole(route.query.km, 0, 1_500_000),
  version: text(route.query.version).slice(0, 80),
}))

const { data: brandsData } = await useAsyncData('valuation-brands', () =>
  $fetch<CarsFacetsResponse>('/api/cars', { query: { perPage: 1 } })
)
const { data: reportData } = await useAsyncData('car-report', () =>
  $fetch<CarReportResponse>('/api/car-report')
)

const draft = reactive({
  brand: query.value.brand,
  model: query.value.model,
  year: query.value.year,
  km: query.value.km === null ? '' : String(query.value.km),
  version: query.value.version,
})

const { data: modelsData } = await useAsyncData(
  'valuation-models',
  () =>
    draft.brand
      ? $fetch<CarsFacetsResponse>('/api/cars', { query: { brand: draft.brand, perPage: 1 } })
      : Promise.resolve(null),
  { watch: [() => draft.brand] }
)
const { data: marketData, error: marketError } = await useAsyncData(
  'valuation-market',
  () =>
    draft.model
      ? $fetch<{ market: PublicCarMarketSnapshot }>(`/api/cars/market/${draft.model}`)
      : Promise.resolve(null),
  { watch: [() => draft.model] }
)

const market = computed(() => marketData.value?.market ?? null)
const coefficients = computed(() => reportData.value?.data.valuation ?? null)

const brandItems = computed(() =>
  (brandsData.value?.facets.brands ?? []).map(brand => ({
    title: `${brand.name} (${brand.count})`,
    value: brand.slug,
  }))
)
const modelItems = computed(() =>
  (modelsData.value?.facets.models ?? []).map(model => ({
    title: `${model.name} (${model.count})`,
    value: model.slug,
  }))
)
const yearItems = computed(() => (market.value ? carValuationYears(market.value) : []))
const versionItems = computed(() => {
  if (!market.value || !draft.year) return []
  const versions = carValuationVersions(market.value, draft.year).map(row => ({
    title: [
      row.trim,
      row.engine,
      row.transmission === 'automatica' ? 'automática' : 'manual',
      `(${row.n})`,
    ]
      .filter(Boolean)
      .join(' '),
    value: carValuationRowKey(row),
  }))
  return versions.length ? [{ title: 'Todas las versiones', value: '' }, ...versions] : []
})

// Cambiar de marca invalida el modelo, y cambiar de modelo invalida el año y la versión.
watch(
  () => draft.brand,
  (next, previous) => {
    if (previous !== undefined && next !== previous) {
      draft.model = ''
      draft.year = null
      draft.version = ''
    }
  }
)
watch(
  () => draft.model,
  (next, previous) => {
    if (previous !== undefined && next !== previous) {
      draft.year = null
      draft.version = ''
    }
  }
)

const estimate = computed(() => {
  if (!market.value || !query.value.year || query.value.model !== market.value.slug) return null
  return estimateCarValue(market.value, coefficients.value, {
    year: query.value.year,
    km: query.value.km,
    rowKey: query.value.version || null,
  })
})

const modelDrop = computed(
  () =>
    reportData.value?.data.models.find(model => model.marketSlug === query.value.model)
      ?.annualDrop ?? null
)
const yearlyLoss = computed(() =>
  estimate.value ? carValuationYearlyLoss(estimate.value.suggested.market, modelDrop.value) : null
)
const negotiationCut = computed(() => reportData.value?.data.negotiation.medianCut ?? null)
const automaticNote = computed(() => {
  const premium = coefficients.value?.automatic.value ?? null
  if (premium === null) return ''
  return `El rango mezcla cajas. En el mismo modelo, año y versión, la automática se pide ${carReportPercent(premium, 1)} más que la manual: si el tuyo es automático, estás en la mitad de arriba.`
})

const kmParam = (value: string): string | undefined => {
  const km = whole(value, 0, 1_500_000)
  return km === null ? undefined : String(km)
}

// Sale del informe, no de un texto fijo: los modelos con más oferta cambian.
const deepestModels = computed(() => {
  const names = (reportData.value?.data.models ?? [])
    .slice(0, 5)
    .map(model => `${model.brand} ${model.model}`)
  return names.length ? `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}` : ''
})

function apply() {
  router.replace({
    query: {
      marca: draft.brand || undefined,
      modelo: draft.model || undefined,
      anio: draft.year ? String(draft.year) : undefined,
      km: kmParam(draft.km),
      version: draft.version || undefined,
    },
  })
}

const canonical = `https://cambio-uruguay.com${CAR_VALUATION_PATH}`
const title = '¿Cuánto vale mi auto usado en Uruguay?'
const description =
  'Calculá cuánto se pide hoy por tu auto usado en Uruguay: modelo, año y kilómetros contra los avisos vigentes de Mercado Libre, Facebook y automotoras, con el rango y cómo publicarlo.'

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
          {
            '@type': 'WebApplication',
            name: title,
            description,
            url: canonical,
            applicationCategory: 'FinanceApplication',
            operatingSystem: 'Any',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
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
              { '@type': 'ListItem', position: 2, name: '¿Cuánto vale mi auto?', item: canonical },
            ],
          },
        ],
      }),
    },
  ],
})
</script>

<style scoped>
.valuation-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
@media (min-width: 960px) {
  .valuation-form {
    position: sticky;
    top: 80px;
  }
}
.valuation-result,
.valuation-empty {
  border: 1px solid rgba(var(--v-border-color), 0.2);
  border-radius: 12px;
  padding: 20px;
}
.valuation-prices {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.valuation-price {
  border: 1px solid rgba(var(--v-border-color), 0.2);
  border-radius: 12px;
  padding: 12px;
}
.valuation-price--main {
  border-color: rgb(var(--v-theme-primary));
  border-width: 2px;
}
@media (max-width: 599px) {
  .valuation-prices {
    grid-template-columns: 1fr;
  }
}
</style>
