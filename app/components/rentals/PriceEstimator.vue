<!--
THESIS: Describe one home, then inspect the actual competition behind its price range.
OWN-WORLD: Cambio Uruguay's paper surfaces, blue actions and compact labeled controls.
STORY: Enter comparable attributes, read the range, inspect each supporting listing.
FIRST VIEWPORT: A two-column form with its action below; results follow in reading order.
FORM: Inline estimator within the rental analysis page, with a responsive comparison table.
-->
<template>
  <section
    class="rent-estimator"
    data-testid="rental-price-estimator"
    aria-labelledby="estimator-heading"
  >
    <header>
      <h2 id="estimator-heading">{{ t('title') }}</h2>
      <p>{{ t('intro') }}</p>
    </header>
    <form class="rent-estimator__form" :aria-busy="busy" @submit.prevent="estimate">
      <div class="rent-estimator__fields">
        <label :for="`${id}-department`">
          <span>{{ t('department') }}</span>
          <select
            :id="`${id}-department`"
            v-model="form.department"
            name="estimator-department"
            required
          >
            <option value="" disabled>{{ t('chooseDepartment') }}</option>
            <option v-for="name in departmentOptions" :key="name" :value="name">{{ name }}</option>
          </select>
        </label>
        <label :for="`${id}-neighborhood`">
          <span>{{ t('neighborhood') }}</span>
          <select
            :id="`${id}-neighborhood`"
            v-model="form.neighborhood"
            name="estimator-neighborhood"
            :disabled="neighborhoodsBusy || !form.department || !neighborhoodOptions.length"
            required
          >
            <option value="" disabled>
              {{
                t(
                  neighborhoodsBusy
                    ? 'loadingNeighborhoods'
                    : neighborhoodOptions.length
                      ? 'chooseNeighborhood'
                      : 'noNeighborhoods'
                )
              }}
            </option>
            <option v-for="name in neighborhoodOptions" :key="name" :value="name">
              {{ name }}
            </option>
          </select>
        </label>
        <div v-if="neighborhoodsError" class="rent-estimator__field-error" role="alert">
          <p>{{ t(neighborhoodsStale ? 'stale' : 'neighborhoodError') }}</p>
          <button
            type="button"
            class="rent-estimator__text-button"
            @click="loadNeighborhoods(true)"
          >
            {{ t('retry') }}
          </button>
        </div>
        <label :for="`${id}-type`">
          <span>{{ t('type') }}</span>
          <select :id="`${id}-type`" v-model="form.type" name="estimator-type" required>
            <option value="apartamento">{{ t('apartment') }}</option>
            <option value="casa">{{ t('house') }}</option>
          </select>
        </label>
        <label :for="`${id}-bedrooms`">
          <span>{{ t('bedrooms') }}</span>
          <select :id="`${id}-bedrooms`" v-model="form.bedrooms" name="estimator-bedrooms" required>
            <option v-for="n in [0, 1, 2, 3, 4, 5]" :key="n" :value="String(n)">
              {{ n === 0 ? t('studio') : n }}
            </option>
          </select>
        </label>
        <label :for="`${id}-bathrooms`">
          <span>{{ t('bathrooms') }}</span>
          <select
            :id="`${id}-bathrooms`"
            v-model="form.bathrooms"
            name="estimator-bathrooms"
            required
          >
            <option v-for="n in [1, 2, 3, 4, 5]" :key="n" :value="String(n)">{{ n }}</option>
          </select>
        </label>
        <label :for="`${id}-parking`">
          <span>{{ t('parking') }}</span>
          <select :id="`${id}-parking`" v-model="form.parkingSpaces" name="estimator-parking">
            <option value="">{{ t('noParkingFilter') }}</option>
            <option v-for="n in [0, 1, 2, 3, 4, 5]" :key="n" :value="String(n)">{{ n }}</option>
          </select>
        </label>
        <label :for="`${id}-area`">
          <span>{{ t('area') }}</span>
          <input
            :id="`${id}-area`"
            v-model="form.area"
            name="estimator-area"
            type="number"
            min="20"
            max="450"
            step="0.1"
            inputmode="decimal"
            :aria-describedby="`${id}-area-hint`"
            required
          />
          <small :id="`${id}-area-hint`">{{ t('areaHint') }}</small>
        </label>
        <label :for="`${id}-area-basis`">
          <span>{{ t('areaBasis') }}</span>
          <select
            :id="`${id}-area-basis`"
            v-model="form.areaBasis"
            name="estimator-area-basis"
            required
          >
            <option value="built">{{ t('built') }}</option>
            <option v-if="form.type === 'apartamento'" value="total">{{ t('total') }}</option>
          </select>
          <small v-if="form.type === 'casa'">{{ t('houseArea') }}</small>
        </label>
        <label :for="`${id}-asking`" class="rent-estimator__asking">
          <span>{{ t('asking', { currency }) }}</span>
          <input
            :id="`${id}-asking`"
            v-model="form.askingPrice"
            name="estimator-asking"
            type="number"
            min="1"
            max="10000000"
            step="0.01"
            inputmode="decimal"
            :aria-describedby="`${id}-asking-hint`"
          />
          <small :id="`${id}-asking-hint`">{{ t('askingHint') }}</small>
        </label>
      </div>
      <p v-if="error" class="rent-estimator__error" role="alert">{{ t(error) }}</p>
      <div class="rent-estimator__actions">
        <VBtn
          type="submit"
          color="primary"
          :loading="busy"
          :disabled="neighborhoodsBusy || !form.neighborhood"
        >
          {{ t(error === 'requestError' ? 'retry' : 'submit') }}
        </VBtn>
        <span role="status">{{ busy ? t('submitting') : '' }}</span>
      </div>
      <p class="rent-estimator__disclaimer">{{ t('disclaimer') }}</p>
    </form>

    <div v-if="!result && !busy" class="rent-estimator__idle" role="status">
      {{ t(hasCompared ? 'revised' : 'idle') }}
    </div>
    <section
      v-if="result"
      ref="resultElement"
      class="rent-estimator__result"
      data-testid="rental-estimate-result"
      :aria-labelledby="`${id}-result-title`"
      tabindex="-1"
    >
      <h3 :id="`${id}-result-title`">{{ t('resultTitle') }}</h3>
      <p class="rent-estimator__sample">
        {{ t('sample', { n: result.sampleCount, advertisers: result.advertiserCount }) }}
      </p>
      <p v-if="result.comparables[0]" class="rent-estimator__small">
        {{ t('sampleSource', { source: RENTAL_SOURCE_LABEL[result.comparables[0].source] }) }}
      </p>
      <div v-if="result.status === 'supported' && result.range" class="rent-estimator__supported">
        <h4>{{ t('supported') }}</h4>
        <dl class="rent-estimator__range">
          <div>
            <dt>{{ t('p25') }}</dt>
            <dd>{{ money(result.range.p25) }}</dd>
          </div>
          <div class="rent-estimator__median">
            <dt>{{ t('median') }}</dt>
            <dd>{{ money(result.range.median) }}</dd>
          </div>
          <div>
            <dt>{{ t('p75') }}</dt>
            <dd>{{ money(result.range.p75) }}</dd>
          </div>
        </dl>
        <p class="rent-estimator__small">{{ currency }} · {{ t('monthlyUnit') }}</p>
        <p>{{ t('centralHint') }}</p>
        <div v-if="result.comparisonToAskingPct !== null" class="rent-estimator__asking-result">
          <p>
            <strong>{{ askingComparison }}</strong>
          </p>
          <p>{{ t('askingContext') }}</p>
        </div>
        <div class="rent-estimator__monthly">
          <h4>{{ t('monthlyTitle') }}</h4>
          <p v-if="result.monthly">
            {{
              t('monthlySummary', {
                price: money(result.monthly.median),
                n: result.expensesKnownCount,
              })
            }}
          </p>
          <p v-else>
            {{ t('unknownExpenses', { n: result.expensesKnownCount, total: result.sampleCount }) }}
          </p>
          <p class="rent-estimator__small">{{ t('monthlyCaveat') }}</p>
        </div>
      </div>
      <div v-else class="rent-estimator__abstention">
        <h4>{{ t(result.status === 'dispersed' ? 'dispersed' : 'insufficient') }}</h4>
        <p v-if="result.reason">{{ t(result.reason) }}</p>
      </div>
      <p class="rent-estimator__method">
        {{
          t('criteria', {
            tolerance: result.criteria.areaTolerancePct,
            comparables: result.criteria.minComparables,
            advertisers: result.criteria.minAdvertisers,
          })
        }}
      </p>
      <p class="rent-estimator__small">{{ t('sourceScope') }}</p>
      <p class="rent-estimator__small">
        {{ t('snapshot', { date: dateLabel(result.generatedAt) }) }}
      </p>

      <div v-if="result.comparables.length" class="rent-estimator__comparables">
        <h4>{{ t('comparableTitle') }}</h4>
        <p v-if="result.comparables.length < result.sampleCount" class="rent-estimator__small">
          {{
            t('comparableSubset', { shown: result.comparables.length, total: result.sampleCount })
          }}
        </p>
        <table class="cu-mobile-cards rent-estimator__table">
          <caption class="rent-estimator__sr-only">
            {{
              t('comparableTitle')
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">{{ t('property') }}</th>
              <th scope="col">{{ t('rent') }}</th>
              <th scope="col">{{ t('features') }}</th>
              <th scope="col">{{ t('expenses') }}</th>
              <th scope="col">{{ t('seen') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in result.comparables" :key="item.propertyKey">
              <td :data-label="t('property')">
                <NuxtLink :to="localePath(rentalPropertyPath(item.propertyKey))">{{
                  item.title
                }}</NuxtLink>
                <a
                  :href="item.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="rent-estimator__original"
                >
                  {{ t('original', { source: RENTAL_SOURCE_LABEL[item.source] }) }}
                </a>
              </td>
              <td :data-label="t('rent')" class="rent-estimator__price">
                {{ money(item.price, item.currency) }}
              </td>
              <td :data-label="t('features')">{{ features(item) }}</td>
              <td :data-label="t('expenses')">
                {{
                  item.commonExpenses === null
                    ? t('unknown')
                    : money(item.commonExpenses, item.currency)
                }}
              </td>
              <td :data-label="t('seen')">
                <time :datetime="item.lastSeen">{{ dateLabel(item.lastSeen) }}</time>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { normalizeRentalEstimateQuery } from '~/utils/rentalAnalysis'
import type {
  RentalAnalysisResponse,
  RentalAnalysisComparable,
  RentalEstimateResponse,
  RentalAnalysisType,
  RentalAnalysisAreaBasis,
} from '~/utils/rentalAnalysis'
import { rentalEstimateMessages } from '~/utils/rentalEstimateMessages'
import { rentalPropertyPath } from '~/utils/rentalPresentation'
import { RENTAL_SOURCE_LABEL, type RentalCurrency } from '~/utils/rentals'

const props = defineProps<{
  department: string
  neighborhood: string
  neighborhoods: string[]
  departments: string[]
  currency: RentalCurrency
}>()
const { t, locale } = useI18n({ useScope: 'local', messages: rentalEstimateMessages })
const localePath = useLocalePath()
const id = useId()
const form = reactive({
  department: props.department,
  neighborhood: props.neighborhood,
  type: 'apartamento' as RentalAnalysisType,
  bedrooms: '1',
  bathrooms: '1',
  area: '',
  areaBasis: 'built' as RentalAnalysisAreaBasis,
  parkingSpaces: '',
  askingPrice: '',
})
const result = ref<RentalEstimateResponse | null>(null)
const resultElement = ref<HTMLElement | null>(null)
const busy = ref(false)
const hasCompared = ref(false)
const error = ref<'validation' | 'requestError' | 'stale' | null>(null)
const neighborhoodsBusy = ref(false)
const neighborhoodsError = ref(false)
const neighborhoodsStale = ref(false)
const localNeighborhoods = ref([...props.neighborhoods])
let estimateController: AbortController | undefined
let neighborhoodsController: AbortController | undefined
let estimateSequence = 0
let neighborhoodsSequence = 0
const departmentOptions = computed(() => [
  ...new Set([...props.departments, form.department].filter(Boolean)),
])
const neighborhoodOptions = computed(() => [
  ...new Set([...localNeighborhoods.value, form.neighborhood].filter(Boolean)),
])
const numberLocale = computed(() =>
  locale.value === 'en' ? 'en-US' : locale.value === 'pt' ? 'pt-BR' : 'es-UY'
)
const money = (amount: number, currency = props.currency) =>
  new Intl.NumberFormat(numberLocale.value, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
const dateLabel = (value: string) => {
  const date = new Date(value)
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(numberLocale.value, {
        dateStyle: 'medium',
        timeZone: 'America/Montevideo',
      }).format(date)
    : t('unknown')
}
const askingComparison = computed(() => {
  const percent = result.value?.comparisonToAskingPct
  if (percent === null || percent === undefined) return ''
  return t(percent > 0 ? 'askingAbove' : percent < 0 ? 'askingBelow' : 'askingEqual', {
    pct: new Intl.NumberFormat(numberLocale.value, { maximumFractionDigits: 1 }).format(
      Math.abs(percent)
    ),
  })
})
const features = (item: RentalAnalysisComparable) =>
  [
    item.bedrooms === null
      ? ''
      : item.bedrooms === 0
        ? t('studio')
        : t('bedroomCount', { n: item.bedrooms }),
    item.bathrooms === null ? '' : t('bathroomCount', { n: item.bathrooms }),
    item.area === null
      ? ''
      : `${item.area} m² · ${t(item.areaBasis === 'total' ? 'total' : 'built')}`,
    item.parkingSpaces === null ? '' : t('parkingCount', { n: item.parkingSpaces }),
  ]
    .filter(Boolean)
    .join(' · ') || t('unknown')

function clearEstimate() {
  estimateSequence++
  estimateController?.abort()
  result.value = null
  busy.value = false
  error.value = null
}
watch(() => [form, props.currency], clearEstimate, { deep: true, flush: 'sync' })
watch(
  () => props.currency,
  () => {
    form.askingPrice = ''
  }
)
watch(
  () => form.type,
  type => {
    if (type === 'casa') form.areaBasis = 'built'
  },
  { flush: 'sync' }
)
watch(
  () => [props.department, props.neighborhood],
  () => {
    form.department = props.department
    form.neighborhood = props.neighborhood
  }
)
watch(
  () => props.neighborhoods,
  names => {
    if (form.department === props.department) localNeighborhoods.value = [...names]
  }
)
watch(
  () => [form.department, props.currency],
  ([department], [previousDepartment]) => {
    if (department !== previousDepartment)
      form.neighborhood = department === props.department ? props.neighborhood : ''
    if (import.meta.client) void loadNeighborhoods()
  }
)
onMounted(() => {
  void loadNeighborhoods()
})

async function loadNeighborhoods(force = false) {
  const sequence = ++neighborhoodsSequence
  neighborhoodsController?.abort()
  neighborhoodsError.value = false
  neighborhoodsStale.value = false
  neighborhoodsBusy.value = false
  if (!form.department) {
    localNeighborhoods.value = []
    return
  }
  if (!force && form.department === props.department && props.neighborhoods.length) {
    localNeighborhoods.value = [...props.neighborhoods]
    return
  }
  localNeighborhoods.value = []
  neighborhoodsBusy.value = true
  neighborhoodsController = new AbortController()
  try {
    const response = await $fetch<RentalAnalysisResponse>('/api/rentals/analysis', {
      query: { department: form.department, currency: props.currency },
      signal: neighborhoodsController.signal,
    })
    if (sequence !== neighborhoodsSequence) return
    localNeighborhoods.value = response.facets.neighborhoods
    if (!localNeighborhoods.value.includes(form.neighborhood)) form.neighborhood = ''
  } catch (caught) {
    if (sequence === neighborhoodsSequence) {
      neighborhoodsError.value = true
      neighborhoodsStale.value = isStaleFailure(caught)
    }
  } finally {
    if (sequence === neighborhoodsSequence) neighborhoodsBusy.value = false
  }
}

async function estimate() {
  const query = normalizeRentalEstimateQuery({ ...form, currency: props.currency })
  clearEstimate()
  if (!query) {
    error.value = 'validation'
    return
  }
  const sequence = ++estimateSequence
  estimateController = new AbortController()
  busy.value = true
  hasCompared.value = true
  try {
    const response = await $fetch<RentalEstimateResponse>('/api/rentals/estimate', {
      method: 'POST',
      body: query,
      signal: estimateController.signal,
    })
    if (sequence !== estimateSequence) return
    result.value = response
    await nextTick()
    if (sequence === estimateSequence) resultElement.value?.focus({ preventScroll: true })
  } catch (caught) {
    if (sequence === estimateSequence)
      error.value = isStaleFailure(caught) ? 'stale' : 'requestError'
  } finally {
    if (sequence === estimateSequence) busy.value = false
  }
}
function isStaleFailure(caught: unknown) {
  return (
    (caught as { data?: { data?: { code?: string } } })?.data?.data?.code ===
    'RENTAL_ANALYSIS_STALE'
  )
}
onBeforeUnmount(() => {
  estimateSequence++
  neighborhoodsSequence++
  estimateController?.abort()
  neighborhoodsController?.abort()
})
</script>

<style scoped>
.rent-estimator {
  scroll-margin-top: 150px;
  min-width: 0;
}
.rent-estimator header {
  margin-bottom: 24px;
}
.rent-estimator h2 {
  margin: 0;
  font-size: 1.5rem;
  line-height: 1.3;
  text-wrap: balance;
}
.rent-estimator h3 {
  margin: 0;
  font-size: 1.25rem;
  line-height: 1.4;
}
.rent-estimator h4 {
  margin: 0;
  font-size: 1rem;
  line-height: 1.5;
}
.rent-estimator p {
  margin: 8px 0 0;
  max-width: 72ch;
  line-height: 1.65;
}
.rent-estimator__form {
  max-width: 820px;
}
.rent-estimator__fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 24px;
}
.rent-estimator label {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
  font-size: 0.875rem;
  font-weight: 600;
}
.rent-estimator select,
.rent-estimator input {
  width: 100%;
  min-width: 0;
  min-height: 46px;
  padding: 9px 12px;
  font: inherit;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.4;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.42);
  border-radius: 6px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
}
.rent-estimator select {
  appearance: auto;
  padding-right: 28px;
}
.rent-estimator select:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
.rent-estimator small {
  font-size: 0.78rem;
  font-weight: 400;
  line-height: 1.5;
}
.rent-estimator small,
.rent-estimator__small,
.rent-estimator__disclaimer {
  color: rgba(var(--v-theme-on-surface), 0.8);
}
.rent-estimator__small,
.rent-estimator__disclaimer {
  font-size: 0.8125rem;
}
.rent-estimator__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin: 24px 0 12px;
}
.rent-estimator__actions :deep(.v-btn) {
  min-height: 46px;
  max-width: 100%;
  height: auto;
}
.rent-estimator__actions :deep(.v-btn__content) {
  white-space: normal;
  padding: 8px 0;
}
.rent-estimator__actions span {
  font-size: 0.8125rem;
}
.rent-estimator__field-error {
  grid-column: 1 / -1;
}
.rent-estimator__error,
.rent-estimator__field-error {
  color: rgb(var(--v-theme-error));
}
.rent-estimator__text-button {
  min-height: 44px;
  color: rgb(var(--v-theme-link));
  text-decoration: underline;
}
.rent-estimator__idle {
  margin-top: 24px;
  padding: 20px 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  font-size: 0.875rem;
}
.rent-estimator__result {
  margin-top: 32px;
  padding-top: 28px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.rent-estimator__sample {
  font-weight: 600;
}
.rent-estimator__supported,
.rent-estimator__abstention {
  margin-top: 24px;
}
.rent-estimator__range {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  max-width: 780px;
  margin: 18px 0 0;
  padding: 18px 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.rent-estimator__range dt {
  font-size: 0.8125rem;
}
.rent-estimator__range dd {
  margin: 6px 0 0;
  font-size: clamp(1.1rem, 2vw, 1.6rem);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
.rent-estimator__median {
  color: rgb(var(--v-theme-link));
}
.rent-estimator__median dd {
  font-weight: 800;
}
.rent-estimator__asking-result,
.rent-estimator__monthly {
  margin-top: 24px;
}
.rent-estimator p.rent-estimator__method {
  margin-top: 24px;
  font-size: 0.875rem;
}
.rent-estimator__comparables {
  margin-top: 32px;
}
.rent-estimator__table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  margin-top: 14px;
  font-size: 0.8125rem;
  line-height: 1.5;
}
.rent-estimator__table th,
.rent-estimator__table td {
  padding: 14px 10px;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  overflow-wrap: anywhere;
}
.rent-estimator__table th:first-child {
  width: 30%;
}
.rent-estimator__table th:nth-child(3) {
  width: 23%;
}
.rent-estimator__table a {
  color: rgb(var(--v-theme-link));
  text-underline-offset: 3px;
}
.rent-estimator__table a:hover {
  text-decoration-thickness: 2px;
}
.rent-estimator__original {
  display: block;
  margin-top: 8px;
  font-size: 0.75rem;
}
.rent-estimator__price {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.rent-estimator :is(input, select, button, a):focus-visible {
  outline: 2px solid rgb(var(--v-theme-link));
  outline-offset: 3px;
}
.rent-estimator__result:focus-visible {
  outline: 2px solid rgb(var(--v-theme-link));
  outline-offset: 8px;
}
.rent-estimator__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
@media (max-width: 599px) {
  .rent-estimator__fields {
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
  }
  .rent-estimator__range {
    gap: 12px;
  }
  .rent-estimator__range dt {
    font-size: 0.72rem;
  }
  .rent-estimator__range dd {
    font-size: 1rem;
  }
  .rent-estimator__table {
    table-layout: auto;
  }
  .rent-estimator__table td {
    padding: 10px 0;
  }
  .rent-estimator__table a {
    display: inline-block;
    padding: 7px 0;
  }
  .rent-estimator__table .rent-estimator__original {
    display: block;
    margin-top: 0;
  }
  .rent-estimator__actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
