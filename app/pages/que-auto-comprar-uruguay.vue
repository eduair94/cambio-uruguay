<template>
  <VContainer class="py-6 py-md-10">
    <VBreadcrumbs
      :items="[
        { title: 'Autos usados', to: localePath(CARS_PATH) },
        { title: '¿Qué auto comprar?' },
      ]"
      class="px-0 mb-2"
    />

    <header class="mb-6 advisor-header">
      <h1 class="text-h4 font-weight-bold mb-2">¿Qué auto usado comprar?</h1>
      <p class="text-body-1 mb-3">
        Contanos cuánto tenés, para qué lo vas a usar y qué te importa más. Te decimos qué modelo y
        qué año podés comprar hoy, cuánto te va a costar tenerlo por mes —combustible, patente,
        seguro obligatorio, mantenimiento y lo que pierde de valor— y cuánto salen sus repuestos.
        Sale de los avisos vigentes del
        <NuxtLink :to="localePath(CARS_PATH)">directorio de autos usados</NuxtLink>
        y de un relevamiento propio de repuestos en Mercado Libre.
      </p>
    </header>

    <VRow>
      <VCol cols="12" md="4">
        <form class="advisor-form" @submit.prevent="apply">
          <VTextField
            v-model="draft.presupuesto"
            label="¿Cuánto tenés para el auto? (US$)"
            inputmode="numeric"
            placeholder="Ej. 15000"
            density="comfortable"
            variant="outlined"
            hide-details="auto"
            :rules="[budgetRule]"
          />
          <VSelect
            v-model="draft.uso"
            :items="useItems"
            label="¿Para qué lo vas a usar?"
            :hint="useHint"
            persistent-hint
            density="comfortable"
            variant="outlined"
          />
          <VSelect
            v-model="draft.km"
            :items="kmItems"
            label="¿Cuántos kilómetros por año?"
            density="comfortable"
            variant="outlined"
            hide-details
          />
          <VSelect
            v-model="draft.personas"
            :items="peopleItems"
            label="¿Cuántos viajan habitualmente?"
            density="comfortable"
            variant="outlined"
            hide-details
          />
          <VSelect
            v-model="draft.caja"
            :items="transmissionItems"
            label="Caja"
            density="comfortable"
            variant="outlined"
            hide-details
          />
          <VSelect
            v-model="draft.combustible"
            :items="fuelItems"
            label="Combustible"
            placeholder="Cualquiera"
            persistent-placeholder
            multiple
            chips
            closable-chips
            density="comfortable"
            variant="outlined"
            hide-details
          />
          <VSelect
            v-model="draft.carroceria"
            :items="bodyItems"
            label="Carrocería"
            placeholder="Cualquiera"
            persistent-placeholder
            multiple
            chips
            closable-chips
            density="comfortable"
            variant="outlined"
            hide-details
          />
          <div>
            <p class="text-body-2 font-weight-medium mb-1">¿Qué te importa más? (hasta 3)</p>
            <VChipGroup v-model="draft.prioridad" multiple :max="3" column filter>
              <VChip
                v-for="item in CAR_ADVISOR_PRIORITIES"
                :key="item.value"
                :value="item.value"
                size="small"
                variant="outlined"
              >
                {{ item.title }}
              </VChip>
            </VChipGroup>
          </div>
          <VTextField
            v-model="draft.gastoMes"
            label="Gasto máximo por mes ($, opcional)"
            inputmode="numeric"
            placeholder="Ej. 12000"
            density="comfortable"
            variant="outlined"
            hide-details
          />
          <VBtn type="submit" color="primary" block :disabled="!draftBudget">Buscar mi auto</VBtn>
        </form>
      </VCol>

      <VCol cols="12" md="8">
        <VAlert v-if="advisorError" type="info" variant="outlined">
          El asesor se está actualizando. Probá de nuevo en unos minutos, o mirá mientras tanto el
          <NuxtLink :to="localePath(CARS_PATH)">directorio de autos usados</NuxtLink>.
        </VAlert>

        <VAlert v-else-if="budgetOutOfRange" type="warning" variant="outlined">
          El presupuesto tiene que estar entre US$ 1.000 y US$ 500.000. Corregilo a la izquierda y
          volvé a buscar.
        </VAlert>

        <template v-else-if="advice && query.budget">
          <p class="text-body-1 mb-4">
            <template v-if="advice.results.length">
              Con {{ formatCarUsd(query.budget) }}, estas son las
              <strong>{{ advice.results.length }} mejores opciones</strong> entre
              {{ advice.considered }} combinaciones de modelo, combustible y caja que entran en tu
              presupuesto y tus filtros, de {{ advice.models }} modelos con avisos suficientes.
            </template>
            <template v-else>
              Con {{ formatCarUsd(query.budget) }} y esos filtros no encontramos ningún modelo con
              avisos suficientes.
              <template v-if="advice.minimumBudget">
                Desde
                <NuxtLink :to="withBudget(advice.minimumBudget)">
                  {{ formatCarUsd(advice.minimumBudget) }}
                </NuxtLink>
                empieza a haber opciones.
              </template>
            </template>
            <span v-if="excludedText" class="d-block text-body-2 text-medium-emphasis mt-1">
              {{ excludedText }}
            </span>
          </p>

          <article
            v-for="(result, index) in advice.results"
            :key="`${result.marketSlug}-${result.fuel}-${result.transmission}`"
            class="advisor-card mb-4"
            :class="{ 'advisor-card--over': result.overMonthly }"
          >
            <header class="advisor-card__head">
              <div>
                <h2 class="text-h6 font-weight-bold mb-0">
                  {{ index + 1 }}. {{ result.brand }} {{ result.model }} {{ result.year }}
                </h2>
                <p class="text-body-2 text-medium-emphasis mb-0">
                  {{ CAR_FUEL_LABELS[result.fuel] }} ·
                  {{ CAR_TRANSMISSION_LABELS[result.transmission].toLowerCase() }}
                  <template v-if="result.space.body">
                    · {{ CAR_BODY_LABELS[result.space.body].toLowerCase() }}
                  </template>
                </p>
              </div>
              <div class="advisor-card__price">
                <p class="text-h6 font-weight-bold mb-0">{{ formatCarUsd(result.price.median) }}</p>
                <p class="text-caption mb-0">
                  mitad entre {{ formatCarUsd(result.price.p25) }} y
                  {{ formatCarUsd(result.price.p75) }} · {{ result.n }} avisos
                  <template v-if="result.kmMedian !== null">
                    · {{ formatCarKm(result.kmMedian) }}
                  </template>
                </p>
              </div>
            </header>

            <p v-if="result.stretch" class="text-body-2 mb-3">
              Negociando o eligiendo con más kilómetros, un {{ result.stretch.year }} desde
              {{ formatCarUsd(result.stretch.p25) }}.
            </p>

            <div class="advisor-card__grid">
              <section>
                <h3 class="advisor-card__label">Por qué</h3>
                <ul class="text-body-2 pl-4 mb-0">
                  <li v-for="line in result.reasons" :key="line">{{ line }}</li>
                </ul>
              </section>
              <section v-if="result.tradeoffs.length">
                <h3 class="advisor-card__label">Lo que resignás</h3>
                <ul class="text-body-2 pl-4 mb-0">
                  <li v-for="line in result.tradeoffs" :key="line">{{ line }}</li>
                </ul>
              </section>
            </div>

            <div class="advisor-card__grid mt-3">
              <section>
                <h3 class="advisor-card__label">
                  Lo que sale del bolsillo: {{ formatUyu(result.costs.monthlyCashUyu) }} por mes
                </h3>
                <table class="advisor-costs text-body-2">
                  <tbody>
                    <tr>
                      <th scope="row">
                        {{ result.fuel === 'electrico' ? 'Carga' : 'Combustible' }}
                        <span class="text-medium-emphasis"> ({{ consumptionText(result) }}) </span>
                      </th>
                      <td>{{ formatUyu(result.costs.fuelUyu / 12) }}</td>
                    </tr>
                    <tr>
                      <th scope="row">
                        Patente
                        <span class="text-medium-emphasis">
                          ({{ formatUyu(result.costs.patenteUyu) }} al año, estimada)
                        </span>
                      </th>
                      <td>{{ formatUyu(result.costs.patenteUyu / 12) }}</td>
                    </tr>
                    <tr>
                      <th scope="row">Seguro obligatorio (SOA promedio)</th>
                      <td>{{ formatUyu(result.costs.soaUyu / 12) }}</td>
                    </tr>
                    <tr>
                      <th scope="row">Mantenimiento</th>
                      <td>{{ formatUyu(result.costs.maintenanceUyu / 12) }}</td>
                    </tr>
                    <tr class="advisor-costs__extra">
                      <th scope="row">
                        Además, lo que pierde de valor
                        <span class="text-medium-emphasis">({{ depreciationText(result) }})</span>
                      </th>
                      <td>
                        {{
                          result.costs.depreciationKnown
                            ? formatUyu(result.costs.depreciationUyu / 12)
                            : 'sin dato'
                        }}
                      </td>
                    </tr>
                    <tr v-if="result.costs.depreciationKnown">
                      <th scope="row">Contando lo que pierde de valor</th>
                      <td>
                        <strong>{{ formatUyu(result.costs.annualUyu / 12) }}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </section>

              <section>
                <h3 class="advisor-card__label">Repuestos</h3>
                <template v-if="result.parts && result.partsMeasured">
                  <p class="text-body-2 mb-1">
                    <template v-if="result.parts.index !== null">
                      {{ partsIndexText(result.parts.index) }} ·
                    </template>
                    {{ result.parts.offers }} avisos en Mercado Libre, relevados el
                    {{ dayOf(result.parts.readAt) }}
                  </p>
                  <table class="advisor-costs text-body-2">
                    <tbody>
                      <tr v-for="part in result.parts.parts" :key="part.key">
                        <th scope="row">{{ CAR_PART_LABELS[part.key] }}</th>
                        <td>{{ formatUyu(part.median) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </template>
                <p v-else class="text-body-2 text-medium-emphasis mb-0">
                  Todavía no tenemos avisos de repuestos suficientes de este modelo para medirlos:
                  preguntá precios antes de comprar.
                </p>
              </section>
            </div>

            <div class="advisor-card__grid mt-3">
              <section>
                <h3 class="advisor-card__label">Seguridad</h3>
                <template v-if="result.safety.ncap.length">
                  <p class="text-body-2 mb-1">
                    Ensayos de Latin NCAP de este modelo. Cada uno es de una versión y un año:
                    confirmá cuál es el del auto que mirás.
                  </p>
                  <ul class="text-body-2 pl-4 mb-1">
                    <li v-for="test in result.safety.ncap" :key="test.url">
                      <a :href="test.url" target="_blank" rel="noopener">{{ test.testedName }}</a
                      >: {{ latinNcapLabel(test) }}.
                    </li>
                  </ul>
                </template>
                <p v-else class="text-body-2 mb-1">
                  No tenemos un ensayo de Latin NCAP de este modelo.
                </p>
                <p v-if="equipmentText(result)" class="text-body-2 mb-0">
                  {{ equipmentText(result) }}
                </p>
              </section>
              <section>
                <h3 class="advisor-card__label">Espacio</h3>
                <p class="text-body-2 mb-0">{{ spaceText(result) }}</p>
              </section>
            </div>

            <div class="advisor-card__actions mt-4">
              <VBtn
                :to="localePath({ path: CARS_PATH, query: result.listingsQuery })"
                color="primary"
                variant="flat"
                size="small"
              >
                Ver los avisos
              </VBtn>
              <VBtn
                :to="localePath(carMarketPath(result.marketSlug))"
                variant="outlined"
                size="small"
              >
                Precios año por año
              </VBtn>
              <VBtn
                :to="
                  localePath({
                    path: CAR_VALUATION_PATH,
                    query: {
                      marca: result.listingsQuery.brand,
                      modelo: result.marketSlug,
                      anio: String(result.year),
                    },
                  })
                "
                variant="text"
                size="small"
              >
                ¿Está bien el precio?
              </VBtn>
            </div>
          </article>

          <p v-if="advice.results.length" class="text-caption text-medium-emphasis">
            Nafta Súper 95 a {{ formatUyuDecimal(advice.fuel.super95) }} y gasoil 50-S a
            {{ formatUyuDecimal(advice.fuel.gasoil50s) }} el litro (ANCAP, vigentes desde
            {{ monthOfYearLabel(advice.fuel.from) || 'el último ajuste' }}). Dólar a
            {{ formatUyuDecimal(advice.usdUyu) }}. Avisos leídos el {{ generatedDay }}.
          </p>
        </template>

        <section v-else class="advisor-empty">
          <p class="text-body-1 mb-3">
            Completá al menos el presupuesto a la izquierda. Si no sabés por dónde empezar, probá
            uno de estos perfiles:
          </p>
          <ul class="text-body-1 pl-5 mb-0">
            <li v-for="profile in EXAMPLE_PROFILES" :key="profile.title">
              <NuxtLink :to="localePath({ path: CAR_ADVISOR_PATH, query: profile.query })">
                {{ profile.title }}
              </NuxtLink>
            </li>
          </ul>
        </section>
      </VCol>
    </VRow>

    <section class="mt-10">
      <h2 class="text-h5 mb-3">Antes de señar</h2>
      <ol class="advisor-checklist pl-5">
        <li v-for="item in CAR_ADVISOR_CHECKLIST" :key="item.title" class="mb-3">
          <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ item.title }}</h3>
          <p class="text-body-2 mb-1">{{ item.detail }}</p>
          <template v-if="item.url">
            <NuxtLink
              v-if="item.url.startsWith('/')"
              :to="localePath(item.url)"
              class="text-body-2"
            >
              {{ item.label }}
            </NuxtLink>
            <a v-else :href="item.url" target="_blank" rel="noopener" class="text-body-2">
              {{ item.label }}
            </a>
          </template>
        </li>
      </ol>
    </section>

    <section class="mt-10">
      <h2 class="text-h5 mb-3">Cómo se calcula</h2>
      <ul class="text-body-1 pl-5">
        <li>
          <strong>El año.</strong> Para cada modelo, combustible y caja, el año más nuevo cuya
          mediana de precio entra en tu presupuesto, con al menos tres avisos. Un modelo necesita 12
          avisos vigentes para entrar, y el mismo auto publicado en varias fuentes cuenta una vez.
        </li>
        <li>
          <strong>La patente.</strong> {{ PATENTE_2026.figure.note }}
          <a :href="PATENTE_2026.figure.sourceUrl" target="_blank" rel="noopener">Texto Ordenado</a>
          ·
          <a :href="PATENTE_CONSULTA_URL" target="_blank" rel="noopener">consulta por matrícula</a>.
        </li>
        <li>
          <strong>El combustible.</strong> El consumo mediano de los avisos de ese modelo, declarado
          o estimado por modelo, por tus kilómetros y el precio vigente de ANCAP. Los eléctricos,
          {{ CAR_ADVISOR_FIGURES.evKwhPer100Km.value }} kWh cada 100 km a
          {{ formatUyuDecimal(CAR_ADVISOR_FIGURES.kwhUyu.value) }} el kWh ({{
            CAR_ADVISOR_FIGURES.evKwhPer100Km.source.toLowerCase()
          }}).
        </li>
        <li>
          <strong>El seguro obligatorio.</strong>
          {{ formatUyu(CAR_ADVISOR_FIGURES.soaUyu.value) }} al año:
          {{ CAR_ADVISOR_FIGURES.soaUyu.note }}
        </li>
        <li>
          <strong>El mantenimiento.</strong>
          {{ formatUyu(CAR_ADVISOR_FIGURES.maintenanceFixedUyu.value) }} al año más
          {{ formatUyuDecimal(CAR_ADVISOR_FIGURES.maintenancePerKmUyu.value) }} por kilómetro,
          multiplicado por el índice de repuestos del modelo. Es un supuesto del sitio: no hay
          tarifario publicado de service.
        </li>
        <li>
          <strong>Lo que pierde de valor.</strong> La caída anual del modelo medida sobre sus
          propios avisos, la misma recta del
          <NuxtLink :to="localePath(CAR_REPORT_PATH)">informe del mercado</NuxtLink>; si el modelo
          no tiene curva, la típica del mercado.
        </li>
        <li>
          <strong>Los repuestos.</strong> Seis piezas buscadas en Mercado Libre Uruguay para cada
          modelo; el índice compara cada una con la mediana de todos los modelos. Cada modelo se
          relee cada dos semanas.
        </li>
        <li>
          <strong>El orden.</strong> Cada opción se puntúa contra las demás que pasaron tus filtros
          en siete cosas: antigüedad, costo de tenerlo, reventa, repuestos, seguridad, espacio y
          ajuste a tu uso. Lo que marcás como importante pesa el triple. Un dato que falta vale el
          punto medio: no castiga ni premia.
        </li>
      </ul>
      <p class="text-body-2 text-medium-emphasis">
        Lo que no podemos decirte: cuánto falla cada modelo (nadie lo publica en Uruguay), a qué
        precio se cierra la venta (sólo vemos lo que se pide) ni cuánto sale un seguro contra todo
        riesgo (se cotiza). Si dudás entre auto, moto u ómnibus, está el
        <NuxtLink :to="localePath('/conviene-auto-moto-o-omnibus-uruguay')">
          comparador de transporte</NuxtLink
        >.
      </p>
    </section>

    <FaqSection :items="[...CAR_ADVISOR_FAQ]" heading="Preguntas frecuentes" :expanded="true" />

    <AssistantCta topic="autos" :filters="assistantFilters" class="mt-8" />
  </VContainer>
</template>

<script setup lang="ts">
import {
  CAR_ADVISOR_KM_STEPS,
  CAR_ADVISOR_PRIORITIES,
  CAR_ADVISOR_USES,
  carAdvisorDraft,
  carAdvisorQueryParams,
  normalizeCarAdvisorQuery,
  type CarAdvisorApiResponse,
  type CarAdvisorDraft,
  type CarAdvisorExclusion,
  type CarAdvisorResult,
} from '~/utils/carAdvisor'
import {
  CAR_ADVISOR_CHECKLIST,
  CAR_ADVISOR_FAQ,
  CAR_ADVISOR_FIGURES,
  CAR_ADVISOR_PATH,
  CAR_PART_LABELS,
  PATENTE_2026,
  latinNcapLabel,
} from '~/utils/carAdvisorFigures'
import { PATENTE_CONSULTA_URL } from '~/utils/trafficFines'
import {
  CAR_BODY_LABELS,
  CAR_BODY_TYPES,
  CAR_FUEL_LABELS,
  CAR_TRANSMISSION_LABELS,
  CARS_PATH,
  carMarketPath,
  formatCarKm,
  formatCarUsd,
} from '~/utils/cars'
import { CAR_REPORT_PATH, carReportPercent } from '~/utils/carsReport'
import { CAR_VALUATION_PATH } from '~/utils/carsValuation'
import { monthOfYearLabel } from '~/utils/fuelPrices'

const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()

// La respuesta vive en la URL: se comparte y se abre ya calculada desde el servidor.
const query = computed(() => normalizeCarAdvisorQuery(route.query))
const params = computed(() => carAdvisorQueryParams(query.value))
const paramsKey = computed(() => JSON.stringify(params.value))

const { data: advice, error: advisorError } = await useAsyncData(
  'car-advisor',
  () =>
    query.value.budget
      ? $fetch<CarAdvisorApiResponse>('/api/cars/advisor', { query: params.value })
      : Promise.resolve(null),
  { watch: [paramsKey] }
)

// El formulario sigue a la URL: un perfil de ejemplo o el enlace de "desde US$ X" cambian la
// consulta sin rearmar la página, y el formulario tiene que mostrar lo que se está calculando.
const draft = reactive<CarAdvisorDraft>(carAdvisorDraft(query.value))
watch(query, next => Object.assign(draft, carAdvisorDraft(next)))
const budgetOutOfRange = computed(
  () => Boolean(route.query.presupuesto) && query.value.budget === null
)

const draftQuery = computed(() =>
  normalizeCarAdvisorQuery({
    presupuesto: draft.presupuesto,
    uso: draft.uso,
    km: String(draft.km),
    personas: String(draft.personas),
    caja: draft.caja,
    combustible: draft.combustible.join(','),
    carroceria: draft.carroceria.join(','),
    prioridad: draft.prioridad.join(','),
    gastoMes: draft.gastoMes,
  })
)
const draftBudget = computed(() => draftQuery.value.budget)
const budgetRule = (value: string) =>
  !value ||
  draftBudget.value !== null ||
  'Escribí un monto en dólares entre US$ 1.000 y US$ 500.000'

function apply() {
  if (!draftBudget.value) return
  router.replace({ query: carAdvisorQueryParams(draftQuery.value) })
}

const useItems = CAR_ADVISOR_USES.map(item => ({
  title: item.title,
  value: item.value,
}))
const useHint = computed(() => CAR_ADVISOR_USES.find(item => item.value === draft.uso)?.hint ?? '')
const kmItems = computed(() =>
  [...new Set([...CAR_ADVISOR_KM_STEPS, query.value.kmYear])]
    .sort((a, b) => a - b)
    .map(km => ({ title: `${formatCarKm(km)} por año`, value: km }))
)
const peopleItems = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(people => ({
  title: people === 1 ? 'Sólo yo' : `${people} personas`,
  value: people,
}))
const transmissionItems = [
  { title: 'Me da igual', value: '' },
  { title: 'Manual', value: 'manual' },
  { title: 'Automática', value: 'automatica' },
]
const fuelItems = (['nafta', 'diesel', 'hibrido', 'electrico'] as const).map(fuel => ({
  title: CAR_FUEL_LABELS[fuel],
  value: fuel,
}))
const bodyItems = CAR_BODY_TYPES.map(body => ({ title: CAR_BODY_LABELS[body], value: body }))

const EXAMPLE_PROFILES = [
  {
    title: 'Primer auto para la ciudad con US$ 10.000, que salga poco tenerlo',
    query: { presupuesto: '10000', uso: 'ciudad', prioridad: 'costo,repuestos' },
  },
  {
    title: 'Familia de cinco con US$ 20.000, seguridad y espacio',
    query: {
      presupuesto: '20000',
      personas: '5',
      carroceria: 'suv,sedan,rural,monovolumen',
      prioridad: 'seguridad,espacio',
    },
  },
  {
    title: 'Trabajo y carga con US$ 25.000 y 30.000 km por año',
    query: { presupuesto: '25000', uso: 'carga', km: '30000', prioridad: 'repuestos,reventa' },
  },
  {
    title: 'Automático, lo más nuevo posible con US$ 15.000',
    query: { presupuesto: '15000', caja: 'automatica', prioridad: 'nuevo,reventa' },
  },
]

const grouped = (value: number): string =>
  Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
const formatUyu = (value: number): string => `$ ${grouped(value)}`
const formatUyuDecimal = (value: number): string => `$ ${value.toFixed(2).replace('.', ',')}`

const EXCLUSION_LABELS: Record<CarAdvisorExclusion, string> = {
  presupuesto: 'por presupuesto',
  caja: 'por la caja',
  combustible: 'por el combustible',
  carroceria: 'por la carrocería',
  uso: 'por el uso',
  plazas: 'por las plazas',
  debajo: 'por quedar muy por debajo de tu presupuesto',
}
const excludedText = computed(() => {
  const parts = (advice.value?.excluded ?? [])
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .map(item => `${item.count} ${EXCLUSION_LABELS[item.reason]}`)
  return parts.length ? `Combinaciones que quedaron afuera: ${parts.join(', ')}.` : ''
})

function consumptionText(result: CarAdvisorResult): string {
  const value = result.costs.consumption
  if (value === null) return 'sin dato'
  const unit = result.fuel === 'electrico' ? 'kWh/100 km' : 'L/100 km'
  const figure = `${value.toFixed(1).replace('.', ',')} ${unit}`
  return result.costs.consumptionEstimated ? `${figure}, estimado` : figure
}

function partsIndexText(index: number): string {
  if (Math.abs(index - 1) < 0.05) return 'En línea con el modelo típico'
  return index < 1
    ? `${Math.round((1 - index) * 100)} % más baratos que el modelo típico`
    : `${Math.round((index - 1) * 100)} % más caros que el modelo típico`
}

function equipmentText(result: CarAdvisorResult): string {
  const items = [
    ['control de estabilidad', result.safety.esc],
    ['airbags frontales', result.safety.airbags],
    ['ABS', result.safety.abs],
    ['ISOFIX', result.safety.isofix],
  ] as const
  const known = items.filter(([, share]) => share && share.n >= 5)
  if (!known.length) return ''
  return `En las fichas de este modelo: ${known
    .map(([label, share]) => `${label} ${Math.round(share!.share * 100)} %`)
    .join(', ')}.`
}

function spaceText(result: CarAdvisorResult): string {
  const { seats, trunkL, lengthMm, fourByFour } = result.space
  const parts = [
    seats !== null ? `${seats} plazas` : null,
    trunkL !== null ? `baúl de ${grouped(trunkL)} litros` : null,
    lengthMm !== null ? `${(lengthMm / 1000).toFixed(2).replace('.', ',')} m de largo` : null,
    fourByFour && fourByFour.share >= 0.2
      ? `${Math.round(fourByFour.share * 100)} % de las fichas con 4x4`
      : null,
  ].filter(Boolean)
  return parts.length ? `${parts.join(', ')}.` : 'Ninguna ficha de este modelo lo dice.'
}

const withBudget = (budget: number) =>
  localePath({
    path: CAR_ADVISOR_PATH,
    query: carAdvisorQueryParams({ ...query.value, budget }),
  })

const dayOf = (iso: string): string => {
  const match = /^\d{4}-(\d{2})-(\d{2})/.exec(iso)
  return match ? `${match[2]}/${match[1]}` : ''
}

function depreciationText(result: CarAdvisorResult): string {
  if (!result.costs.depreciationKnown) return 'no hay precios de años suficientes para medirlo'
  if (result.costs.depreciationFromMarket) return 'caída típica del mercado'
  return `${carReportPercent(result.annualDrop, 1)} por año`
}

const generatedDay = computed(() => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(advice.value?.generatedAt ?? '')
  return match ? `${match[3]}/${match[2]}/${match[1]}` : ''
})

// La pregunta para el asistente se arma con las mismas respuestas del formulario.
const assistantFilters = computed(() => {
  const current = query.value
  return [
    current.budget ? `hasta ${formatCarUsd(current.budget)}` : '',
    CAR_ADVISOR_USES.find(item => item.value === current.use)?.title.toLowerCase() ?? '',
    current.transmission ? CAR_TRANSMISSION_LABELS[current.transmission].toLowerCase() : '',
    ...current.fuels.map(fuel => CAR_FUEL_LABELS[fuel].toLowerCase()),
    ...current.bodies.map(body => CAR_BODY_LABELS[body].toLowerCase()),
  ].filter(Boolean)
})

const canonical = `https://cambio-uruguay.com${CAR_ADVISOR_PATH}`
const title = '¿Qué auto usado comprar? Asesor en Uruguay'
const description =
  'Qué auto usado comprar en Uruguay con tu presupuesto: el modelo y el año que te alcanzan, cuánto sale tenerlo por mes y cuánto cuestan sus repuestos.'

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
            name: '¿Qué auto usado comprar?',
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
              { '@type': 'ListItem', position: 2, name: '¿Qué auto comprar?', item: canonical },
            ],
          },
        ],
      }),
    },
  ],
})
</script>

<style scoped>
.advisor-header {
  max-width: 820px;
}
.advisor-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
@media (min-width: 960px) {
  .advisor-form {
    position: sticky;
    top: 80px;
  }
}
.advisor-card,
.advisor-empty {
  border: 1px solid rgba(var(--v-border-color), 0.2);
  border-radius: 12px;
  padding: 20px;
}
.advisor-card--over {
  opacity: 0.8;
  border-style: dashed;
}
.advisor-card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 12px;
}
.advisor-card__price {
  text-align: right;
}
.advisor-card__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.advisor-card__label {
  font-size: 0.875rem;
  font-weight: 700;
  margin-bottom: 4px;
}
.advisor-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.advisor-costs {
  width: 100%;
  border-collapse: collapse;
}
.advisor-costs th {
  font-weight: 400;
  text-align: left;
  padding: 2px 8px 2px 0;
}
.advisor-costs td {
  text-align: right;
  white-space: nowrap;
  padding: 2px 0;
  font-variant-numeric: tabular-nums;
}
.advisor-costs__extra th,
.advisor-costs__extra td {
  border-top: 1px solid rgba(var(--v-border-color), 0.2);
  padding-top: 6px;
}
.advisor-checklist {
  max-width: 820px;
}
@media (max-width: 599.98px) {
  .advisor-card__head {
    flex-direction: column;
  }
  .advisor-card__price {
    text-align: left;
  }
  .advisor-card__grid {
    grid-template-columns: 1fr;
  }
}
</style>
