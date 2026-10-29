<!--
  Comparador de autos usados. Contrato de dirección (impeccable, 2026-10-28):
  THESIS: el veredicto primero y calculado ("por qué elegirlo / lo que resignás", cada renglón con
    su número); la tabla es la prueba. Rechaza la planilla de fichas de 0 km de los comparadores
    de concesionaria: acá todo sale de avisos uruguayos vigentes.
  OWN-WORLD: Open Sans, tokens del tema, acciones azules; tres llaves de modelo (primary, secondary,
    info mezclados hacia la tinta) con forma propia —círculo, cuadrado, rombo— en encabezado,
    gráfico y tabla, para que la columna se reconozca sin depender del color.
  STORY: elijo dos o tres modelos → veo en qué gana cada uno con mi plata o a igual año → compruebo
    en el gráfico y en la tabla → voy a los avisos de ese año.
  FIRST VIEWPORT: título, una frase, la mesa de trabajo (modelos + lente) y el arranque del veredicto.
  FORM: estructura 4 de 5 (veredicto primero), semilla 4674f0e4; momento firma: la línea de
    presupuesto arrastrable del gráfico, donde cada curva la cruza está el año que esa plata compra.
-->
<template>
  <VContainer fluid class="compare-page">
    <VBreadcrumbs
      :items="[{ title: 'Autos usados', to: localePath(CARS_PATH) }, { title: 'Comparar modelos' }]"
      class="px-0"
    />

    <header class="compare-header">
      <h1 class="text-h4 font-weight-bold">Comparar autos usados</h1>
      <p class="lead">
        Dos o tres modelos lado a lado con los avisos de hoy: qué se pide por cada año, a qué año
        llegás con tu plata, cuánto cuesta tenerlo y en qué gana cada uno.
        <template v-if="data">
          {{ data.options.length }} modelos con avisos suficientes, leídos el
          {{ formatCarDate(data.generatedAt) }}.
        </template>
      </p>
    </header>

    <VAlert v-if="loadFailed" type="info" variant="outlined" class="mb-6">
      El comparador se está actualizando. Probá de nuevo en unos minutos, o mirá mientras tanto el
      <NuxtLink :to="localePath(CARS_PATH)">directorio de autos usados</NuxtLink>.
    </VAlert>

    <template v-else-if="data">
      <!-- La mesa de trabajo: qué modelos y con qué lente. -->
      <section class="bench" aria-label="Qué comparar">
        <div class="bench__models">
          <span v-for="(column, index) in data.columns" :key="column.slug" class="bench__pill">
            <CarsCompareKeyMark :index="index" :size="12" />
            <span class="bench__pill-name">{{ column.brand }} {{ column.model }}</span>
            <button
              v-if="data.columns.length > 1"
              type="button"
              class="bench__remove"
              :aria-label="`Sacar ${column.brand} ${column.model} de la comparación`"
              @click="removeModel(column.slug)"
            >
              <VIcon icon="mdi-close" size="18" />
            </button>
          </span>
          <VAutocomplete
            v-if="data.columns.length < CAR_COMPARE_MAX"
            v-model="adding"
            :items="addItems"
            item-title="title"
            item-value="value"
            label="Sumar un modelo"
            placeholder="Escribí marca o modelo"
            prepend-inner-icon="mdi-plus"
            density="compact"
            variant="outlined"
            hide-details
            auto-select-first
            class="bench__add"
            @update:model-value="addModel"
          >
            <template #item="{ props: itemProps, item }">
              <VListItem v-bind="itemProps" :subtitle="item.raw.subtitle" />
            </template>
          </VAutocomplete>
        </div>

        <p v-if="data.example" class="bench__hint">
          Arrancamos con los tres modelos con más avisos. Cambiá cualquiera.
        </p>
        <div
          v-if="data.rivals.length && data.columns.length < CAR_COMPARE_MAX"
          class="bench__rivals"
        >
          <span class="bench__rivals-label">Rivales del {{ data.columns[0]?.model }}:</span>
          <VChip
            v-for="rival in data.rivals"
            :key="rival.slug"
            size="small"
            variant="outlined"
            prepend-icon="mdi-plus"
            @click="addModel(rival.slug)"
          >
            {{ rival.brand }} {{ rival.model }}
          </VChip>
        </div>

        <VAlert
          v-if="data.missing.length"
          type="info"
          variant="tonal"
          density="compact"
          class="bench__missing"
        >
          {{ missingText }}
        </VAlert>

        <div class="bench__lens">
          <VBtnToggle
            :model-value="state.mode"
            mandatory
            density="comfortable"
            variant="outlined"
            divided
            class="bench__mode"
            aria-label="Cómo comparar"
            @update:model-value="setMode"
          >
            <VBtn value="anio">Mismo año</VBtn>
            <VBtn value="plata">Misma plata</VBtn>
          </VBtnToggle>

          <VSelect
            v-if="state.mode === 'anio'"
            :model-value="result?.year ?? null"
            :items="yearItems"
            label="Año"
            density="compact"
            variant="outlined"
            hide-details
            class="bench__year"
            @update:model-value="setYear"
          >
            <template #item="{ props: itemProps, item }">
              <VListItem v-bind="itemProps" :subtitle="item.raw.subtitle" />
            </template>
          </VSelect>

          <div v-else class="bench__budget">
            <VTextField
              :model-value="budgetText"
              label="Tu presupuesto"
              prefix="US$"
              inputmode="numeric"
              density="compact"
              variant="outlined"
              hide-details
              class="bench__budget-field"
              @update:model-value="onBudgetText"
            />
            <VSlider
              :model-value="state.budget ?? budgetRange.min"
              :min="budgetRange.min"
              :max="budgetRange.max"
              :step="500"
              hide-details
              color="primary"
              aria-label="Presupuesto"
              class="bench__slider"
              @update:model-value="value => setBudget(Number(value))"
            />
          </div>

          <VSelect
            :model-value="state.km"
            :items="kmItems"
            label="Kilómetros por año"
            density="compact"
            variant="outlined"
            hide-details
            class="bench__km"
            @update:model-value="value => (state.km = Number(value))"
          />
        </div>
      </section>

      <div v-if="result" :class="['compare-results', { 'is-refreshing': refreshing }]">
        <section class="compare-section" aria-labelledby="compare-verdict">
          <h2 id="compare-verdict" class="compare-section__title">Cuál te conviene</h2>
          <p class="compare-section__lead">
            {{ verdictLead }}
          </p>
          <CarsCompareVerdicts
            :columns="data.columns"
            :names="result.names"
            :points="result.points"
            :verdicts="result.verdicts"
            :mode="result.mode"
            :year="result.year"
            :budget="result.budget"
            @variant="setVariant"
          />
        </section>

        <section class="compare-section" aria-labelledby="compare-chart">
          <h2 id="compare-chart" class="compare-section__title">Lo que se pide por cada año</h2>
          <p class="compare-section__lead">
            <template v-if="result.mode === 'plata'">
              La línea punteada es tu presupuesto: arrastrala o tocá el gráfico para moverla. Donde
              cada curva queda por debajo está el año que esa plata compra.
            </template>
            <template v-else>
              La mediana de lo que se pide por cada año de cada modelo. Tocá un año para comparar
              ese.
            </template>
          </p>
          <CarsComparePriceChart
            :columns="data.columns"
            :names="result.names"
            :points="result.points"
            :mode="result.mode"
            :year="result.year"
            :budget="result.budget"
            :range="budgetRange"
            @year="setYear"
            @budget="setBudget"
          />
        </section>

        <section class="compare-section" aria-labelledby="compare-table">
          <div class="compare-section__bar">
            <h2 id="compare-table" class="compare-section__title">Todo lado a lado</h2>
            <VSwitch
              v-model="onlyDiff"
              label="Sólo lo que cambia"
              color="primary"
              density="compact"
              hide-details
              inset
            />
          </div>
          <CarsCompareEvidenceTable
            :columns="data.columns"
            :names="result.names"
            :groups="result.groups"
            :only-diff="onlyDiff"
          />
        </section>
      </div>

      <section class="compare-section compare-method" aria-labelledby="compare-method">
        <h2 id="compare-method" class="compare-section__title">De dónde sale cada número</h2>
        <ul class="compare-method__list">
          <li>
            <strong>Los precios.</strong> La mediana de lo que piden los avisos vigentes del
            <NuxtLink :to="localePath(CARS_PATH)">directorio de autos usados</NuxtLink>, por modelo,
            año, combustible y caja, sin los avisos que declaran deuda, choque o papeles. Un año
            entra con tres avisos o más. Son precios pedidos, no de cierre.
          </li>
          <li>
            <strong>La versión.</strong> Todos los modelos arrancan con la misma combinación de
            combustible y caja si la tienen, para no comparar una pick-up diésel con una nafta. Cada
            columna se puede cambiar.
          </li>
          <li>
            <strong>Lo que cuesta tenerlo.</strong> El mismo cálculo de
            <NuxtLink :to="localePath(CAR_ADVISOR_PATH)">¿qué auto comprar?</NuxtLink>: combustible
            al precio de ANCAP<template v-if="data.fuel.asOf"> vigente</template>, patente estimada
            con el SUCIVE 2026, seguro obligatorio y mantenimiento escalado por los repuestos.
          </li>
          <li>
            <strong>Lo que pierde de valor.</strong> La caída anual medida sobre los propios avisos
            del modelo, la misma recta del
            <NuxtLink :to="localePath(CAR_REPORT_PATH)">informe del mercado</NuxtLink>. Un modelo
            sin curva propia usa la del mercado para el costo, pero no compite en esa fila.
          </li>
          <li>
            <strong>Quién gana.</strong> Uno le gana a otro sólo si la diferencia entre los dos pasa
            el margen de ruido de la fila; lo parejo se dice y no suma. Latin NCAP se muestra y no
            decide: la lista completa está en
            <NuxtLink :to="localePath('/latin-ncap-uruguay')">los ensayos de Latin NCAP</NuxtLink>.
          </li>
        </ul>
        <p class="compare-method__limits">
          Lo que no podemos decirte: cuánto falla cada modelo (nadie lo publica en Uruguay), a qué
          precio se cierra la venta ni cuánto sale un seguro contra todo riesgo.
        </p>
      </section>

      <section v-if="data.popular.length" class="compare-section" aria-labelledby="compare-popular">
        <h2 id="compare-popular" class="compare-section__title">Comparaciones frecuentes</h2>
        <p class="compare-section__lead">
          Los modelos con más avisos contra sus rivales: misma carrocería y precio parecido a igual
          año.
        </p>
        <ul class="popular">
          <li v-for="group in data.popular" :key="group.map(option => option.slug).join()">
            <NuxtLink :to="popularLink(group)" class="popular__link">
              {{ popularTitle(group) }}
            </NuxtLink>
            <span class="popular__meta">
              {{ group[0]?.body ? CAR_BODY_LABELS[group[0].body] : '' }}
            </span>
          </li>
        </ul>
      </section>
    </template>

    <FaqSection
      :items="[...CAR_COMPARE_FAQ]"
      heading="Preguntas frecuentes"
      :expanded="true"
      class="compare-section"
    />

    <AssistantCta topic="autos" :filters="assistantFilters" class="mt-8" />
  </VContainer>
</template>

<script setup lang="ts">
import { CAR_ADVISOR_DEFAULT_KM, CAR_ADVISOR_KM_STEPS } from '~/utils/carAdvisor'
import { CAR_ADVISOR_PATH } from '~/utils/carAdvisorFigures'
import {
  CAR_COMPARE_FAQ,
  CAR_COMPARE_MAX,
  CAR_COMPARE_PATH,
  carCompareBudgetRange,
  carCompareModelsParam,
  carCompareQueryParams,
  carCompareSuggestedBudget,
  compareCars,
  normalizeCarCompareQuery,
  type CarCompareMode,
  type CarComparePick,
  type CarCompareOption,
  type CarCompareResponse,
} from '~/utils/carCompare'
import { CAR_BODY_LABELS, CARS_PATH, formatCarDate, formatCarKm, formatCarUsd } from '~/utils/cars'
import { CAR_REPORT_PATH } from '~/utils/carsReport'
import type { PublicCarFuel, PublicCarTransmission } from '~/utils/carsPublic'

const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()

// La consulta vive en la URL. Los modelos deciden qué se pide al servidor; el año, el presupuesto y
// los km se resuelven acá con la misma función pura, así mover el presupuesto no pide nada.
const query = computed(() => normalizeCarCompareQuery(route.query))
const modelsParam = computed(() => carCompareModelsParam(query.value.picks))

const { data, error, status } = await useAsyncData(
  'car-compare',
  () =>
    $fetch<CarCompareResponse>('/api/cars/compare', {
      query: modelsParam.value ? { modelos: modelsParam.value } : {},
    }),
  { watch: [modelsParam] }
)
const loadFailed = computed(() => !!error.value && !data.value)
const refreshing = computed(() => status.value === 'pending' && !!data.value)
if (import.meta.server && loadFailed.value) {
  const event = useRequestEvent()
  if (event) {
    setResponseStatus(event, 503)
    useResponseHeader('cache-control').value = 'no-store, max-age=0'
  }
}

const state = reactive<{
  mode: CarCompareMode
  year: number | null
  budget: number | null
  km: number
}>({
  mode: query.value.budget !== null ? 'plata' : 'anio',
  year: query.value.year,
  budget: query.value.budget,
  km: query.value.kmYear,
})

const result = computed(() =>
  data.value?.columns.length
    ? compareCars(data.value, {
        picks: [],
        year: state.mode === 'anio' ? state.year : null,
        budget: state.mode === 'plata' ? state.budget : null,
        kmYear: state.km,
      })
    : null
)
const budgetRange = computed(() => carCompareBudgetRange(data.value?.columns ?? []))

// -- La URL sigue al estado (y el estado a la URL, si se navega hacia atrás) --------------------------
const picksInUrl = (): CarComparePick[] => query.value.picks
function urlFor(picks: CarComparePick[]): Record<string, string> {
  return carCompareQueryParams({
    picks,
    year: state.mode === 'anio' ? state.year : null,
    budget: state.mode === 'plata' ? state.budget : null,
    kmYear: state.km,
  })
}
let pending: ReturnType<typeof setTimeout> | null = null
watch(
  () => [state.mode, state.year, state.budget, state.km],
  () => {
    if (pending) clearTimeout(pending)
    pending = setTimeout(() => {
      const next = urlFor(picksInUrl())
      if (JSON.stringify(next) !== JSON.stringify(carCompareQueryParams(query.value)))
        router.replace({ query: next })
    }, 350)
  }
)
watch(query, next => {
  const mode: CarCompareMode = next.budget !== null ? 'plata' : 'anio'
  if (mode !== state.mode) state.mode = mode
  if (mode === 'plata' && next.budget !== state.budget) state.budget = next.budget
  if (mode === 'anio' && next.year !== null && next.year !== state.year) state.year = next.year
  if (next.kmYear !== state.km) state.km = next.kmYear
})

// -- Los modelos -----------------------------------------------------------------------------------
const currentPicks = (): CarComparePick[] =>
  query.value.picks.length
    ? query.value.picks
    : (data.value?.columns ?? []).map(column => ({
        slug: column.slug,
        fuel: null,
        transmission: null,
      }))

function goTo(picks: CarComparePick[]) {
  router.replace({ query: urlFor(picks) })
}

const adding = ref<string | null>(null)
function addModel(slug: string | null) {
  if (!slug) return
  const picks = currentPicks()
  if (!picks.some(pick => pick.slug === slug) && picks.length < CAR_COMPARE_MAX)
    goTo([...picks, { slug, fuel: null, transmission: null }])
  nextTick(() => (adding.value = null))
}
function removeModel(slug: string) {
  goTo(currentPicks().filter(pick => pick.slug !== slug))
}
/** Cambiar la versión de una columna fija la de todas: así las otras no se mueven solas. */
function setVariant(index: number, token: string) {
  const [fuel, transmission] = token.split('-') as [PublicCarFuel, PublicCarTransmission]
  const picks = (data.value?.columns ?? []).map((column, position) =>
    position === index
      ? { slug: column.slug, fuel, transmission }
      : { slug: column.slug, fuel: column.variant.fuel, transmission: column.variant.transmission }
  )
  goTo(picks)
}

const addItems = computed(() => {
  const chosen = new Set(data.value?.columns.map(column => column.slug))
  return (data.value?.options ?? [])
    .filter(option => !chosen.has(option.slug))
    .map(option => ({
      title: `${option.brand} ${option.model}`,
      value: option.slug,
      subtitle: `${option.adverts} avisos${option.body ? ` · ${CAR_BODY_LABELS[option.body]}` : ''}`,
    }))
})

const missingText = computed(() => {
  const names = (data.value?.missing ?? []).map(slug => slug.replace(/-/g, ' '))
  if (!names.length) return ''
  return `${names.length === 1 ? `No encontramos «${names[0]}»` : `No encontramos «${names.join('», «')}»`} con avisos suficientes: el comparador usa los modelos con 12 avisos vigentes o más.`
})

// -- La lente --------------------------------------------------------------------------------------
function setMode(mode: CarCompareMode) {
  if (!mode || mode === state.mode) return
  if (mode === 'plata' && state.budget === null && data.value)
    state.budget = carCompareSuggestedBudget(data.value, result.value?.year ?? null)
  if (mode === 'anio' && state.year === null) state.year = result.value?.year ?? null
  state.mode = mode
}
function setYear(year: number | null) {
  if (typeof year !== 'number') return
  state.year = year
  if (state.mode !== 'anio') state.mode = 'anio'
}
function setBudget(budget: number) {
  if (!Number.isFinite(budget)) return
  state.budget = Math.round(budget)
}
const budgetText = computed(() =>
  state.budget === null ? '' : String(state.budget).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
)
function onBudgetText(value: string) {
  const digits = Number(String(value ?? '').replace(/\D/g, ''))
  if (digits >= 1_000 && digits <= 500_000) state.budget = digits
}

const yearItems = computed(() =>
  (result.value?.years ?? []).map(option => {
    const lacking = option.present
      .map((present, index) => (present ? null : result.value?.names[index]))
      .filter((name): name is string => !!name)
    return {
      title: String(option.year),
      value: option.year,
      subtitle: lacking.length ? `sin avisos suficientes de ${lacking.join(' ni ')}` : undefined,
    }
  })
)
const kmItems = computed(() =>
  [...new Set([...CAR_ADVISOR_KM_STEPS, CAR_ADVISOR_DEFAULT_KM, state.km])]
    .sort((a, b) => a - b)
    .map(km => ({ title: formatCarKm(km), value: km }))
)

const verdictLead = computed(() => {
  if (!result.value || !data.value) return ''
  if (data.value.columns.length < 2) return ''
  const target =
    result.value.mode === 'plata' && result.value.budget !== null
      ? `con ${formatCarUsd(result.value.budget)}`
      : `por un ${result.value.year}`
  return `Lo que cada uno gana ${target} y ${formatCarKm(result.value.kmYear)} por año, frente a los otros. Lo que queda parejo no cuenta.`
})

const onlyDiff = ref(false)

// -- Comparaciones frecuentes ----------------------------------------------------------------------
const popularLink = (group: CarCompareOption[]) =>
  localePath({
    path: CAR_COMPARE_PATH,
    query: { modelos: group.map(option => option.slug).join(',') },
  })
function popularTitle(group: CarCompareOption[]): string {
  const names = group.map(option => `${option.brand} ${option.model}`)
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} y ${names.at(-1)}` : (names[0] ?? '')
}

const assistantFilters = computed(() =>
  (data.value?.columns ?? []).map(column => `${column.brand} ${column.model}`)
)

// -- SEO -------------------------------------------------------------------------------------------
const canonical = `https://cambio-uruguay.com${CAR_COMPARE_PATH}`
const title = 'Comparar autos usados en Uruguay'
const description =
  'Compará dos o tres autos usados con los avisos de hoy: a qué año llegás con tu plata, cuánto cuesta tenerlo y en qué gana cada modelo.'

useSeoMeta({
  title: `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogUrl: canonical,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  // La URL desnuda se indexa; cada combinación de modelos es una copia de la misma herramienta.
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
            name: 'Comparar autos usados',
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
              { '@type': 'ListItem', position: 2, name: 'Comparar modelos', item: canonical },
            ],
          },
        ],
      }),
    },
  ],
})
</script>

<style scoped>
.compare-page {
  /* Las tres llaves de modelo: los colores del tema mezclados hacia la tinta, así una línea de 2 px
     pasa 3:1 sobre el blanco (el ámbar puro no) y sobre el azul noche. */
  --compare-key-0: color-mix(
    in srgb,
    rgb(var(--v-theme-primary)) 82%,
    rgb(var(--v-theme-on-surface))
  );
  --compare-key-1: color-mix(
    in srgb,
    rgb(var(--v-theme-secondary)) 70%,
    rgb(var(--v-theme-on-surface))
  );
  --compare-key-2: color-mix(in srgb, rgb(var(--v-theme-info)) 82%, rgb(var(--v-theme-on-surface)));
}
/* Sólo los bloques de la página: un selector descendiente acá se filtraba a los componentes hijos
   y le ganaba al margen de "Lo que resignás". */
.compare-header > :is(h1, p),
.compare-section > :is(h2, p, ul),
.compare-section__bar > h2,
.bench > p {
  margin-top: 0;
}
.compare-header {
  max-width: 820px;
  margin-bottom: 24px;
}
.compare-header h1 {
  margin-bottom: 8px;
}
.lead {
  font-size: 1.075rem;
  line-height: 1.65;
  margin-bottom: 0;
  max-width: 72ch;
}

.bench {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 16px;
  background: rgb(var(--v-theme-surface));
}
.bench__models {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.bench__pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 4px 0 16px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 999px;
  font-weight: 600;
  min-width: 0;
}
.bench__pill-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bench__remove {
  display: inline-grid;
  border: 0;
  background: transparent;
  cursor: pointer;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  transition: background-color 150ms ease-out;
}
.bench__remove:hover {
  background: rgba(var(--v-theme-on-surface), 0.08);
}
.bench__add {
  flex: 1 1 240px;
  max-width: 360px;
}
.bench__hint {
  margin: 0;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.bench__rivals {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.bench__rivals-label {
  font-size: 0.875rem;
  font-weight: 600;
}
.bench__missing {
  margin: 0;
}
.bench__lens {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.bench__year,
.bench__km {
  flex: 0 1 200px;
  min-width: 160px;
}
.bench__budget {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1 1 360px;
  min-width: 0;
}
.bench__budget-field {
  flex: 0 0 160px;
}
.bench__slider {
  flex: 1 1 auto;
  min-width: 120px;
}

.compare-results {
  transition: opacity 200ms ease-out;
}
.compare-results.is-refreshing {
  opacity: 0.55;
}
.compare-section {
  margin-top: 40px;
}
.compare-section__title {
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.01em;
  margin-bottom: 8px;
}
.compare-section__lead {
  max-width: 72ch;
  margin-bottom: 16px;
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
}
.compare-section__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 24px;
}
.compare-section__bar .compare-section__title {
  margin-bottom: 0;
}

.compare-method {
  max-width: 820px;
}
.compare-method__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-left: 20px;
  margin-bottom: 16px;
}
.compare-method__limits {
  font-size: 0.95rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.popular {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 8px 24px;
  padding: 0;
  list-style: none;
}
.popular li {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
  min-width: 0;
}
.popular__link {
  font-weight: 600;
  color: rgb(var(--v-theme-link));
}
.popular__meta {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

@media (max-width: 599.98px) {
  .bench {
    padding: 16px 12px;
  }
  .bench__add {
    max-width: none;
    flex-basis: 100%;
  }
  .bench__mode {
    width: 100%;
  }
  .bench__mode :deep(.v-btn) {
    flex: 1 1 50%;
  }
  .bench__budget {
    flex-wrap: wrap;
  }
  .bench__budget-field {
    flex: 1 1 100%;
  }
  .bench__year,
  .bench__km {
    flex: 1 1 140px;
  }
}
</style>
