<template>
  <VContainer class="py-6 py-md-10">
    <VBreadcrumbs
      :items="[
        { title: 'Alquileres', to: localePath('/alquileres-uruguay') },
        { title: '¿Dónde vivir?' },
      ]"
      class="px-0 mb-2"
    />

    <header class="mb-6 housing-header">
      <h1 class="text-h4 font-weight-bold mb-2">
        ¿Dónde vivir? Alquilar o comprar, barrio por barrio
      </h1>
      <p class="text-body-1 mb-3">
        Contanos qué buscás, cuánto entra en tu hogar y qué te importa más. Te decimos en qué
        barrios lo que necesitás entra en tu plata, cuánto sale por mes y de entrada, si ahí
        conviene más alquilar o comprar, y cómo es cada barrio: denuncias, cortes de luz y agua,
        reclamos y servicios cerca. Sale de los avisos vigentes de alquiler y de venta que el sitio
        lee todos los días.
      </p>
    </header>

    <VRow>
      <VCol cols="12" md="4">
        <form class="housing-form" @submit.prevent="apply">
          <VSelect
            v-model="draft.operacion"
            :items="operationItems"
            label="¿Qué querés hacer?"
            density="comfortable"
            variant="outlined"
            hide-details
          />
          <VSelect
            v-model="draft.departamento"
            :items="departmentItems"
            label="Departamento"
            density="comfortable"
            variant="outlined"
            hide-details
          />
          <div class="housing-form__pair">
            <VSelect
              v-model="draft.tipo"
              :items="typeItems"
              label="Tipo"
              density="comfortable"
              variant="outlined"
              hide-details
            />
            <VSelect
              v-model="draft.dormitorios"
              :items="bedroomItems"
              label="Dormitorios"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </div>
          <VTextField
            v-model="draft.ingreso"
            label="Ingreso del hogar por mes ($, nominal)"
            inputmode="numeric"
            placeholder="Ej. 90000"
            density="comfortable"
            variant="outlined"
            hint="Lo que figura en los recibos, sumando a todos los que aportan."
            persistent-hint
          />
          <VTextField
            v-if="draft.operacion !== 'comprar'"
            v-model="draft.alquilerMax"
            label="Tu tope de alquiler ($, opcional)"
            inputmode="numeric"
            placeholder="Ej. 35000"
            density="comfortable"
            variant="outlined"
            hint="Alquiler más gastos comunes. Vacío: usamos el tope de la garantía."
            persistent-hint
          />
          <template v-if="draft.operacion !== 'alquilar'">
            <VTextField
              v-model="draft.ahorro"
              label="Ahorro para comprar (US$)"
              inputmode="numeric"
              placeholder="Ej. 30000"
              density="comfortable"
              variant="outlined"
              hide-details
            />
            <VSelect
              v-model="draft.credito"
              :items="creditItems"
              label="¿Cómo comprarías?"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </template>
          <div>
            <p class="text-body-2 font-weight-medium mb-1">¿Qué te importa más? (hasta 3)</p>
            <VChipGroup v-model="draft.prioridad" multiple :max="3" column filter>
              <VChip
                v-for="item in HOUSING_PRIORITIES"
                :key="item.value"
                :value="item.value"
                size="small"
                variant="outlined"
              >
                {{ item.title }}
              </VChip>
            </VChipGroup>
          </div>
          <VBtn type="submit" color="primary" block>Buscar barrios</VBtn>
        </form>
      </VCol>

      <VCol cols="12" md="8">
        <VAlert v-if="advisorError" type="info" variant="outlined">
          El asesor se está actualizando. Probá de nuevo en unos minutos, o mirá mientras tanto la
          <NuxtLink :to="localePath('/barrios-alquileres-uruguay')">comparación de barrios</NuxtLink
          >.
        </VAlert>

        <template v-else-if="advice && hasAnswers">
          <section class="housing-budget mb-4">
            <p v-for="line in budgetLines" :key="line" class="text-body-2 mb-1">{{ line }}</p>
          </section>

          <p class="text-body-1 mb-4">
            <template v-if="advice.results.length">
              Estos son los <strong>{{ advice.results.length }} barrios</strong> que mejor cumplen
              lo que marcaste, de {{ advice.considered }} donde lo que buscás entra en tu plata ({{
                advice.zones
              }}
              barrios de {{ query.department }} con avisos suficientes).
            </template>
            <template v-else>
              Con esos números no encontramos barrios de {{ query.department }} donde
              {{ bedroomsText }} entre en tu plata.
              <template v-if="advice.minimum?.rent">
                Alquilar empieza a haber desde {{ formatUyu(advice.minimum.rent) }} por mes.
              </template>
              <template v-if="advice.minimum?.sale">
                Comprar, desde {{ formatUsd(advice.minimum.sale) }}.
              </template>
            </template>
            <span v-if="excludedText" class="d-block text-body-2 text-medium-emphasis mt-1">
              {{ excludedText }}
            </span>
          </p>

          <article
            v-for="(result, index) in advice.results"
            :key="result.id"
            class="housing-card mb-4"
            :class="{ 'housing-card--stretch': isStretch(result) }"
          >
            <header class="housing-card__head">
              <div>
                <h2 class="text-h6 font-weight-bold mb-0">{{ index + 1 }}. {{ result.name }}</h2>
                <p class="text-body-2 text-medium-emphasis mb-0">
                  {{ bedroomsText }} · {{ query.department }}
                  <template v-if="result.official && foldName(result.official) !== result.id">
                    · barrio {{ result.official }}
                  </template>
                </p>
              </div>
            </header>

            <div class="housing-card__grid">
              <section v-if="result.rent && query.operation !== 'comprar'">
                <h3 class="housing-card__label">Alquiler</h3>
                <p class="text-h6 font-weight-bold mb-0">{{ formatUyu(result.rent.median) }}</p>
                <p class="text-caption mb-1">
                  mitad entre {{ formatUyu(result.rent.p25 ?? result.rent.median) }} y
                  {{ formatUyu(result.rent.p75 ?? result.rent.median) }} ·
                  {{ result.rent.n }} avisos
                </p>
                <p v-if="result.rent.expensesMedian" class="text-body-2 mb-0">
                  Más gastos comunes: {{ formatUyu(result.rent.expensesMedian) }} de mediana.
                </p>
                <p v-else-if="result.rent.expensesMedian === 0" class="text-body-2 mb-0">
                  La mitad de los avisos viene sin gastos comunes.
                </p>
                <p v-if="result.rentEntryUyu !== null" class="text-body-2 mb-0">
                  Para entrar: primer mes y comisión, unos {{ formatUyu(result.rentEntryUyu) }}.
                </p>
              </section>
              <section v-if="result.sale && query.operation !== 'alquilar'">
                <h3 class="housing-card__label">Venta</h3>
                <p class="text-h6 font-weight-bold mb-0">{{ formatUsd(result.sale.median) }}</p>
                <p class="text-caption mb-1">
                  mitad entre {{ formatUsd(result.sale.p25 ?? result.sale.median) }} y
                  {{ formatUsd(result.sale.p75 ?? result.sale.median) }} ·
                  {{ result.sale.n }} avisos
                  <template v-if="result.sale.m2Median !== null">
                    · {{ formatUsd(result.sale.m2Median) }} el m²
                  </template>
                </p>
                <p v-if="result.buy" class="text-body-2 mb-0">
                  Para entrar: {{ formatUsd(result.buy.downPayment) }} de anticipo y entre
                  {{ formatUsd(result.buy.entryLow) }} y {{ formatUsd(result.buy.entryHigh) }} de
                  gastos de compra.
                </p>
                <p v-if="result.buy && result.buy.installmentUyu > 0" class="text-body-2 mb-0">
                  Cuota del crédito: {{ formatUyu(result.buy.installmentUyu) }} por mes.
                </p>
              </section>
            </div>

            <section
              v-if="result.rentVsBuy && query.operation === 'comparar'"
              class="housing-card__versus mt-3"
            >
              <h3 class="housing-card__label">¿Alquilar o comprar acá?</h3>
              <p class="text-body-2 mb-0">
                La vivienda vale {{ decimal(result.rentVsBuy.yearsOfRent) }} años de alquiler (rinde
                {{ percent(result.rentVsBuy.grossYield, 1) }} bruto por año). Por mes, comprar sale
                {{ formatUyu(result.rentVsBuy.buyMonthly) }} de cuota y gastos comunes contra
                {{ formatUyu(result.rentVsBuy.rentMonthly) }} de alquiler con gastos comunes:
                <strong>{{ versusText(result) }}</strong>
              </p>
            </section>

            <div class="housing-card__grid mt-3">
              <section>
                <h3 class="housing-card__label">Por qué</h3>
                <ul class="text-body-2 pl-4 mb-0">
                  <li v-for="line in result.reasons" :key="line">{{ line }}</li>
                </ul>
              </section>
              <section v-if="result.tradeoffs.length">
                <h3 class="housing-card__label">Lo que resignás</h3>
                <ul class="text-body-2 pl-4 mb-0">
                  <li v-for="line in result.tradeoffs" :key="line">{{ line }}</li>
                </ul>
              </section>
            </div>

            <section class="mt-3">
              <h3 class="housing-card__label">Cómo es el barrio</h3>
              <ul v-if="contextLines(result).length" class="housing-context text-body-2 mb-0">
                <li v-for="line in contextLines(result)" :key="line.label">
                  <span>{{ line.label }}</span>
                  <meter
                    class="housing-context__bar"
                    min="0"
                    max="1"
                    :value="line.share"
                    :aria-label="`${line.label}: ${line.text}`"
                  />
                  <span class="housing-context__text">{{ line.text }}</span>
                </li>
              </ul>
              <p
                v-for="note in result.notes"
                :key="note"
                class="text-body-2 text-medium-emphasis mb-0"
              >
                {{ note }}
              </p>
            </section>

            <div class="housing-card__actions mt-4">
              <VBtn
                v-if="result.rentalsQuery"
                :to="localePath({ path: '/alquileres-uruguay', query: result.rentalsQuery })"
                color="primary"
                variant="flat"
                size="small"
              >
                Ver alquileres
              </VBtn>
              <VBtn
                v-if="result.salesQuery"
                :to="localePath({ path: '/venta-viviendas-uruguay', query: result.salesQuery })"
                variant="outlined"
                size="small"
              >
                Ver ventas
              </VBtn>
              <VBtn :to="localePath('/alquiler-ideal-uruguay')" variant="text" size="small">
                Elegir el apartamento
              </VBtn>
            </div>
          </article>

          <p v-if="advice.results.length" class="text-caption text-medium-emphasis">
            Alquileres de los avisos de los últimos diez días y ventas de InfoCasas y Casasweb, con
            8 avisos o más por barrio. Dólar a {{ formatUyuDecimal(advice.usdUyu) }}. Datos del
            {{ generatedDay }}.
          </p>
        </template>

        <section v-else class="housing-empty">
          <p class="text-body-1 mb-3">Completá el formulario, o empezá por uno de estos casos:</p>
          <ul class="text-body-1 pl-5 mb-0">
            <li v-for="profile in EXAMPLE_PROFILES" :key="profile.title">
              <NuxtLink :to="localePath({ path: HOUSING_ADVISOR_PATH, query: profile.query })">
                {{ profile.title }}
              </NuxtLink>
            </li>
          </ul>
        </section>
      </VCol>
    </VRow>

    <section class="mt-10">
      <h2 class="text-h5 mb-3">Antes de firmar</h2>
      <ol class="housing-checklist pl-5">
        <li v-for="item in HOUSING_ADVISOR_CHECKLIST" :key="item.title" class="mb-3">
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
          <strong>Los precios.</strong> Para cada barrio, la mediana de lo que se pide por
          {{ bedroomsText }}: alquileres de los avisos de los últimos diez días y ventas de los
          avisos vigentes, siempre con 8 avisos o más. Es lo que se pide, no lo que se cierra.
        </li>
        <li>
          <strong>El alquiler que alcanza.</strong> {{ HOUSING_GUARANTEE_CAPS.figure.note }} Si
          ponés tu propio tope, manda el tuyo y lo comparamos contra alquiler más gastos comunes.
        </li>
        <li>
          <strong>Lo que alcanza para comprar.</strong> El menor de dos techos: lo que cubre tu
          ahorro (la parte que no financia el crédito más los gastos de compra) y lo que permite la
          cuota tope sobre tu ingreso. {{ HOUSING_CREDIT_PROFILES.bhu.figure.note }}
          {{ HOUSING_CREDIT_PROFILES.banco.figure.note }} La cuota se calcula con la tasa efectiva
          anual pasada a mensual.
        </li>
        <li><strong>Los gastos de compra.</strong> {{ HOUSING_BUY_ENTRY.figure.note }}</li>
        <li>
          <strong>Cómo es el barrio.</strong> Denuncias del Ministerio del Interior, cortes de luz
          de UTE, cortes de agua de OSE, reclamos de saneamiento, limpieza y alumbrado de la
          Intendencia y servicios cercanos de OpenStreetMap. Cada barrio se compara con todos los
          barrios medidos: "menos denuncias que el 70 %" quiere decir que el 70 % de los barrios
          tiene más. Son registros, no un riesgo individual.
        </li>
        <li>
          <strong>El orden.</strong> Cada barrio se puntúa en precio, metros por la plata,
          denuncias, servicios, luz y agua, reclamos y, si vas a comprar, rentabilidad. Lo que
          marcás como importante pesa el triple, y un dato que falta vale el punto medio.
        </li>
      </ul>
      <p class="text-body-2 text-medium-emphasis">
        No incluye la contribución inmobiliaria ni el impuesto de Primaria, que dependen del valor
        catastral de cada padrón, ni los seguros del crédito. Para la cuenta completa de alquilar
        contra comprar, con el costo de oportunidad del anticipo, está la
        <NuxtLink :to="localePath('/comprar-o-alquilar-uruguay')">calculadora</NuxtLink>; para
        comparar barrios en un mapa, la
        <NuxtLink :to="localePath('/barrios-alquileres-uruguay')">comparación de barrios</NuxtLink>.
      </p>
    </section>

    <FaqSection :items="[...HOUSING_ADVISOR_FAQ]" heading="Preguntas frecuentes" :expanded="true" />

    <AssistantCta topic="hogar" :filters="assistantFilters" class="mt-8" />
  </VContainer>
</template>

<script setup lang="ts">
import {
  HOUSING_CREDITS,
  HOUSING_OPERATIONS,
  HOUSING_PRIORITIES,
  foldZoneName,
  housingAdvisorDraft,
  housingAdvisorQueryParams,
  normalizeHousingAdvisorQuery,
  type HousingAdvisorApiResponse,
  type HousingAdvisorDraft,
  type HousingAdvisorResult,
  type HousingExclusion,
  type HousingScoreAttribute,
} from '~/utils/housingAdvisor'
import {
  HOUSING_ADVISOR_CHECKLIST,
  HOUSING_ADVISOR_FAQ,
  HOUSING_ADVISOR_PATH,
  HOUSING_BUY_ENTRY,
  HOUSING_CREDIT_PROFILES,
  HOUSING_GUARANTEE_CAPS,
} from '~/utils/housingAdvisorFigures'
import { RENTAL_ZONE_DEPARTMENTS } from '~/utils/rentalZones'

const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()

// Las respuestas viven en la URL: se comparten y se abren ya calculadas desde el servidor.
const query = computed(() => normalizeHousingAdvisorQuery(route.query))
const params = computed(() => housingAdvisorQueryParams(query.value))
const paramsKey = computed(() => JSON.stringify(params.value))
const hasAnswers = computed(() => Object.keys(params.value).length > 0)

const { data: advice, error: advisorError } = await useAsyncData(
  'housing-advisor',
  () =>
    hasAnswers.value
      ? $fetch<HousingAdvisorApiResponse>('/api/housing/advisor', { query: params.value })
      : Promise.resolve(null),
  { watch: [paramsKey] }
)

// El formulario sigue a la URL: un caso de ejemplo cambia la consulta sin rearmar la página.
const draft = reactive<HousingAdvisorDraft>(housingAdvisorDraft(query.value))
watch(query, next => Object.assign(draft, housingAdvisorDraft(next)))

function apply() {
  const next = normalizeHousingAdvisorQuery({
    operacion: draft.operacion,
    departamento: draft.departamento,
    tipo: draft.tipo,
    dormitorios: String(draft.dormitorios),
    ingreso: draft.ingreso,
    alquilerMax: draft.operacion === 'comprar' ? '' : draft.alquilerMax,
    ahorro: draft.operacion === 'alquilar' ? '' : draft.ahorro,
    credito: draft.credito,
    plazo: draft.plazo,
    prioridad: draft.prioridad.join(','),
  })
  router.replace({ query: housingAdvisorQueryParams(next) })
}

const operationItems = HOUSING_OPERATIONS.map(item => ({ title: item.title, value: item.value }))
const departmentItems = [...RENTAL_ZONE_DEPARTMENTS]
const typeItems = [
  { title: 'Apartamento', value: 'apartamento' },
  { title: 'Casa', value: 'casa' },
]
const bedroomItems = [
  { title: 'Monoambiente', value: 0 },
  { title: '1', value: 1 },
  { title: '2', value: 2 },
  { title: '3', value: 3 },
  { title: '4 o más', value: 4 },
]
const creditItems = HOUSING_CREDITS.map(item => ({ title: item.title, value: item.value }))

const EXAMPLE_PROFILES = [
  {
    title: 'Pareja que alquila un apartamento de 1 dormitorio con $ 90.000 de ingreso',
    query: {
      operacion: 'alquilar',
      dormitorios: '1',
      ingreso: '90000',
      prioridad: 'precio,servicios',
    },
  },
  {
    title:
      'Familia que quiere comprar 3 dormitorios con US$ 40.000 ahorrados y $ 180.000 de ingreso',
    query: {
      operacion: 'comprar',
      dormitorios: '3',
      ingreso: '180000',
      ahorro: '40000',
      prioridad: 'seguridad,metros',
    },
  },
  {
    title: '¿Alquilar o comprar 2 dormitorios con $ 120.000 de ingreso y US$ 30.000?',
    query: { ingreso: '120000', ahorro: '30000', prioridad: 'precio,luz' },
  },
  {
    title: 'Comprar un 1 dormitorio para alquilarlo, con US$ 40.000 y $ 100.000 de ingreso',
    query: {
      operacion: 'comprar',
      dormitorios: '1',
      ingreso: '100000',
      ahorro: '40000',
      prioridad: 'inversion',
    },
  },
]

const grouped = (value: number): string =>
  Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
const formatUyu = (value: number): string => `$ ${grouped(value)}`
const formatUsd = (value: number): string => `US$ ${grouped(value)}`
const formatUyuDecimal = (value: number): string => `$ ${value.toFixed(2).replace('.', ',')}`
const decimal = (value: number): string => value.toFixed(1).replace('.', ',')
const percent = (value: number, digits = 0): string =>
  `${(value * 100).toFixed(digits).replace('.', ',')} %`
const foldName = foldZoneName

const bedroomsText = computed(() => {
  const what = query.value.type === 'casa' ? 'una casa' : 'un apartamento'
  const beds = query.value.bedrooms
  return beds === 0
    ? `${what} monoambiente`
    : `${what} de ${beds >= 4 ? '4 dormitorios o más' : `${beds} dormitorio${beds === 1 ? '' : 's'}`}`
})

const budgetLines = computed(() => {
  const response = advice.value
  if (!response) return []
  const { budget } = response
  const current = query.value
  const lines: string[] = []
  if (current.operation !== 'comprar') {
    if (budget.rentMax !== null && budget.rentBasis === 'alquiler' && current.income !== null)
      lines.push(
        `Con ${formatUyu(current.income)} de ingreso, la Contaduría y ANDA aceptan un alquiler de hasta ${formatUyu(budget.rentMax)} (40 %)${budget.rentMaxMapfre !== null ? `; Mapfre, hasta ${formatUyu(budget.rentMaxMapfre)} (30 %)` : ''}.`
      )
    else if (budget.rentMax !== null)
      lines.push(`Tu tope: ${formatUyu(budget.rentMax)} por mes con gastos comunes.`)
    else
      lines.push(
        'Sin ingreso ni tope no filtramos el alquiler por plata: poné tu ingreso para ver qué alcanza.'
      )
  }
  if (current.operation !== 'alquilar') {
    if (budget.buyMax === 0)
      lines.push(
        'Para comprar hace falta ahorro para el anticipo y los gastos de compra: poné cuánto tenés ahorrado.'
      )
    else if (budget.buyMax !== null && budget.profile && current.savings !== null)
      lines.push(
        `Con ${formatUsd(current.savings)} de ahorro y el crédito ${budget.profile.label === 'BHU' ? 'del BHU' : 'de un banco privado'} (financia ${percent(budget.profile.financing)}, cuota hasta ${percent(budget.profile.installmentCap)} del ingreso, ${percent(budget.profile.tea, 2)} a ${budget.years} años) alcanza hasta ${formatUsd(budget.buyMax)}: el ahorro cubre hasta ${formatUsd(budget.buyMaxBySavings ?? 0)}${budget.buyMaxByIncome !== null ? ` y la cuota hasta ${formatUsd(budget.buyMaxByIncome)}` : ', y sin ingreso no sabemos cuánta cuota podés pagar'}.`
      )
    else if (budget.buyMax !== null && current.savings !== null)
      lines.push(
        `Al contado, con ${formatUsd(current.savings)} alcanza hasta ${formatUsd(budget.buyMax)} contando los gastos de compra.`
      )
  }
  return lines
})

const EXCLUSION_LABELS: Record<HousingExclusion, string> = {
  sin_datos: 'sin avisos suficientes',
  presupuesto: 'fuera de tu plata',
}
const excludedText = computed(() => {
  const parts = (advice.value?.excluded ?? [])
    .filter(item => item.count > 0)
    .map(item => `${item.count} ${EXCLUSION_LABELS[item.reason]}`)
  return parts.length ? `Barrios que quedaron afuera: ${parts.join(', ')}.` : ''
})

function isStretch(result: HousingAdvisorResult): boolean {
  const operation = query.value.operation
  if (operation === 'alquilar') return result.rentStretch
  if (operation === 'comprar') return result.saleStretch
  return !(result.rentFits || result.saleFits) && (result.rentStretch || result.saleStretch)
}

function versusText(result: HousingAdvisorResult): string {
  const versus = result.rentVsBuy!
  const gap = versus.buyMonthly - versus.rentMonthly
  if (gap < 0)
    return `comprar sale ${formatUyu(-gap)} menos por mes, pero necesitás ${formatUsd(result.buy?.cashNeeded ?? 0)} de entrada.`
  return `alquilar sale ${formatUyu(gap)} menos por mes.`
}

const CONTEXT_ROWS: Array<{
  label: string
  attributes: HousingScoreAttribute[]
  phrase: string
}> = [
  { label: 'Denuncias', attributes: ['denuncias'], phrase: 'menos que' },
  { label: 'Cortes de luz', attributes: ['luz'], phrase: 'menos que' },
  { label: 'Cortes de agua', attributes: ['agua'], phrase: 'menos que' },
  {
    label: 'Reclamos',
    attributes: ['saneamiento', 'limpieza', 'alumbrado'],
    phrase: 'menos que',
  },
  { label: 'Servicios cerca', attributes: ['servicios'], phrase: 'más que' },
]

function contextLines(result: HousingAdvisorResult) {
  return CONTEXT_ROWS.flatMap(row => {
    const values = row.attributes
      .map(attribute => result.context[attribute]?.betterThan)
      .filter((value): value is number => typeof value === 'number')
    if (!values.length) return []
    const share = values.reduce((sum, value) => sum + value, 0) / values.length
    return [{ label: row.label, share, text: `${row.phrase} el ${percent(share)} de los barrios` }]
  })
}

const generatedDay = computed(() => {
  const match = /^\d{4}-(\d{2})-(\d{2})/.exec(advice.value?.generatedAt ?? '')
  return match ? `${match[2]}/${match[1]}` : 'último relevamiento'
})

// La pregunta para el asistente se arma con las mismas respuestas del formulario.
const assistantFilters = computed(() => {
  const current = query.value
  return [
    HOUSING_OPERATIONS.find(item => item.value === current.operation)?.title.toLowerCase() ?? '',
    current.department,
    bedroomsText.value,
    current.income !== null ? `ingreso ${formatUyu(current.income)}` : '',
    current.savings !== null ? `ahorro ${formatUsd(current.savings)}` : '',
  ].filter(Boolean)
})

const canonical = `https://cambio-uruguay.com${HOUSING_ADVISOR_PATH}`
const title = '¿Dónde vivir? Alquilar o comprar por barrio'
const description =
  'Qué barrio te conviene para alquilar o comprar en Uruguay según tu ingreso y ahorro: precios, cuota, denuncias, cortes de luz y servicios de cada barrio.'

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
            name: '¿Dónde vivir?',
            description,
            url: canonical,
            applicationCategory: 'FinanceApplication',
            operatingSystem: 'Any',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'UYU' },
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Alquileres',
                item: 'https://cambio-uruguay.com/alquileres-uruguay',
              },
              { '@type': 'ListItem', position: 2, name: '¿Dónde vivir?', item: canonical },
            ],
          },
        ],
      }),
    },
  ],
})
</script>

<style scoped>
.housing-header {
  max-width: 820px;
}
.housing-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.housing-form__pair {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  gap: 12px;
}
@media (min-width: 960px) {
  .housing-form {
    position: sticky;
    top: 80px;
  }
}
.housing-budget {
  border-left: 3px solid rgb(var(--v-theme-primary));
  padding: 4px 0 4px 12px;
}
.housing-card,
.housing-empty {
  border: 1px solid rgba(var(--v-border-color), 0.2);
  border-radius: 12px;
  padding: 20px;
}
.housing-card--stretch {
  border-style: dashed;
}
.housing-card__head {
  margin-bottom: 12px;
}
.housing-card__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.housing-card__label {
  font-size: 0.875rem;
  font-weight: 700;
  margin-bottom: 4px;
}
.housing-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.housing-context {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 4px;
}
.housing-context li {
  display: grid;
  grid-template-columns: 130px 110px 1fr;
  align-items: center;
  gap: 8px;
}
.housing-context__bar {
  width: 100%;
  height: 8px;
  appearance: none;
  border: 0;
  border-radius: 999px;
  background: rgba(var(--v-border-color), 0.2);
  overflow: hidden;
}
.housing-context__bar::-webkit-meter-bar {
  background: rgba(var(--v-border-color), 0.2);
  border: 0;
  border-radius: 999px;
}
.housing-context__bar::-webkit-meter-optimum-value {
  background: rgb(var(--v-theme-primary));
  border-radius: 999px;
}
.housing-context__bar::-moz-meter-bar {
  background: rgb(var(--v-theme-primary));
  border-radius: 999px;
}
.housing-checklist {
  max-width: 820px;
}
@media (max-width: 599.98px) {
  .housing-card__grid {
    grid-template-columns: 1fr;
  }
  .housing-context li {
    grid-template-columns: 1fr 80px;
  }
  .housing-context__text {
    grid-column: 1 / -1;
  }
}
</style>
