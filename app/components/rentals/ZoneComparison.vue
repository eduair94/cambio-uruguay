<template>
  <section
    id="comparar-barrios"
    class="rental-comparison"
    aria-labelledby="comparison-title"
    data-testid="rental-zone-comparison"
  >
    <h3 id="comparison-title">{{ t('title') }}</h3>
    <p>{{ t('intro') }}</p>
    <p v-if="!analysis.query.department">{{ t('chooseDepartment') }}</p>
    <template v-else>
      <div class="rental-comparison__selectors">
        <label v-for="(_, index) in 3" :key="index">
          {{ t('choice', { n: index + 1 }) }}
          <select v-model="selected[index]" :name="`comparison-zone-${index + 1}`">
            <option value="">{{ t('none') }}</option>
            <option
              v-for="zone in choices"
              :key="zone.name"
              :value="zone.name"
              :disabled="selected.includes(zone.name) && selected[index] !== zone.name"
            >
              {{ zone.name }}
            </option>
          </select>
        </label>
      </div>
      <div class="rental-comparison__columns">
        <article v-for="(row, index) in rows" :key="row.name" class="rental-comparison__area">
          <h4>{{ row.name }}</h4>
          <p class="rental-comparison__meta">{{ t('count', { n: integer(row.count) }) }}</p>
          <p v-if="row.count < 8" class="rental-comparison__notice">{{ t('small') }}</p>
          <dl>
            <div>
              <dt>{{ t('rent') }}</dt>
              <dd class="rental-comparison__price">{{ money(row.rent?.median) }}</dd>
            </div>
            <div>
              <dt>{{ t('range') }}</dt>
              <dd>{{ money(row.rent?.p25) }} – {{ money(row.rent?.p75) }}</dd>
            </div>
            <div>
              <dt>{{ t('monthly') }}</dt>
              <dd>
                {{ money(row.monthly?.median)
                }}<small>{{ t('sample', { n: integer(row.expensesKnownCount) }) }}</small>
              </dd>
            </div>
            <div>
              <dt>{{ t('area') }}</dt>
              <dd>
                {{ money(row.perM2.built?.median)
                }}<small>{{ t('sample', { n: integer(row.perM2.built?.count ?? 0) }) }}</small>
              </dd>
            </div>
            <div>
              <dt>{{ t('expenses') }}</dt>
              <dd>
                {{
                  t('coverage', {
                    n: integer(row.expensesKnownCount),
                    total: integer(row.count),
                    pct: decimal(row.expensesCoveragePct),
                  })
                }}
              </dd>
            </div>
            <div v-if="allocation > 0 && allocation <= 100">
              <dt>{{ t('income', { pct: decimal(allocation) }) }}</dt>
              <dd>
                {{ money(rentalAnalysisIncome(row.monthly?.median, allocation, extraCosts)) }}
              </dd>
            </div>
            <div v-if="index > 0 && row.rent && rows[0]?.rent">
              <dt>{{ t('difference') }}</dt>
              <dd>
                {{ signedMoney(row.rent.median - rows[0].rent.median) }} ({{
                  signedPercent((row.rent.median / rows[0].rent.median - 1) * 100)
                }})
              </dd>
            </div>
            <div v-else-if="index === 0 && row.rent">
              <dt>{{ t('reference') }}</dt>
              <dd>{{ row.name }}</dd>
            </div>
          </dl>
          <button type="button" class="rental-comparison__link" @click="$emit('explore', row.name)">
            {{ t('explore') }}
          </button>
        </article>
      </div>
      <p class="rental-comparison__meta">{{ t('basis') }}</p>
      <p v-if="allocation > 0 && allocation <= 100" class="rental-comparison__meta">
        {{ t('incomeNote', { extra: money(extraCosts) }) }}
      </p>
      <p v-if="contextLoading" role="status">{{ t('loading') }}</p>
      <div v-else-if="contextError" class="rental-comparison__notice">
        <p>{{ t('failed') }}</p>
        <button type="button" class="rental-comparison__link" @click="refreshContext()">
          {{ t('retry') }}
        </button>
      </div>
      <template v-else-if="contextReady && rows.length">
        <details class="rental-comparison__evidence" open>
          <summary>{{ t('services') }}</summary>
          <p>{{ t('serviceNote') }}</p>
          <div class="rental-comparison__columns">
            <article v-for="row in contextRows" :key="row.name">
              <h4>{{ row.name }}</h4>
              <template
                v-if="row.context?.services && row.context.services.status !== 'unavailable'"
              >
                <p v-if="row.context.services.status === 'stale'" class="rental-comparison__notice">
                  {{ t('stale') }}
                </p>
                <dl>
                  <div v-for="category in services" :key="category">
                    <dt>{{ t(category) }}</dt>
                    <dd>{{ integer(row.context.services.counts[category]) }}</dd>
                  </div>
                </dl>
                <p class="rental-comparison__meta">
                  {{ t('date', { date: date(row.context.services.source.dataAsOf) }) }}
                </p>
                <a
                  :href="row.context.services.source.url"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>{{ t('source') }}: OpenStreetMap / Geofabrik ↗</span>
                </a>
              </template>
              <p v-else class="rental-comparison__meta">{{ t('unavailable') }}</p>
            </article>
          </div>
        </details>
        <details class="rental-comparison__evidence">
          <summary>{{ t('crime') }}</summary>
          <p>{{ t('crimeNote') }}</p>
          <div class="rental-comparison__columns">
            <article v-for="row in contextRows" :key="row.name">
              <h4>{{ row.name }}</h4>
              <template v-if="row.context?.crime && row.context.crime.status !== 'unavailable'">
                <p class="rental-comparison__meta">
                  {{ t('geography', { name: row.context.crime.geographyName }) }}
                </p>
                <p
                  v-if="row.context.crime.geography === 'department'"
                  class="rental-comparison__notice"
                >
                  {{ t('departmentCrime') }}
                </p>
                <p class="rental-comparison__meta">
                  {{
                    t('period', {
                      from: date(row.context.crime.periodFrom),
                      to: date(row.context.crime.periodTo),
                    })
                  }}
                </p>
                <p v-if="row.context.crime.status === 'stale'" class="rental-comparison__notice">
                  {{ t('stale') }}
                </p>
                <dl>
                  <div>
                    <dt>{{ t('crimeTotal') }}</dt>
                    <dd>{{ integer(row.context.crime.total) }}</dd>
                  </div>
                  <div v-for="offense in offenses" :key="offense">
                    <dt>{{ t(offense) }}</dt>
                    <dd>{{ integer(row.context.crime.byOffense[offense]) }}</dd>
                  </div>
                </dl>
                <a :href="row.context.crime.source.url" target="_blank" rel="noopener noreferrer">
                  <span>{{ row.context.crime.source.name }} ↗</span>
                </a>
              </template>
              <p v-else class="rental-comparison__meta">{{ t('unavailable') }}</p>
            </article>
          </div>
        </details>
      </template>
      <NuxtLink :to="localePath('/barrios-alquileres-uruguay')">{{ t('map') }}</NuxtLink>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { RentalAnalysisResponse } from '~/utils/rentalAnalysis'
import type { RentalZoneResponse, RentalZoneServiceCategory } from '~/utils/rentalZoneTypes'
import {
  rentalAnalysisContext,
  rentalAnalysisIncome,
  rentalAnalysisLocationName,
} from '~/utils/rentalAnalysisComparison'
import { rentalComparisonMessages } from '~/utils/rentalComparisonMessages'

const props = withDefaults(
  defineProps<{ analysis: RentalAnalysisResponse; allocation?: number; extraCosts?: number }>(),
  { allocation: 30, extraCosts: 0 }
)
defineEmits<{ explore: [name: string] }>()
const { t, locale } = useI18n({ useScope: 'local', messages: rentalComparisonMessages })
const localePath = useLocalePath()
const selected = ref<string[]>(['', '', ''])
const choices = computed(() =>
  [...props.analysis.neighborhoods].sort((a, b) => a.name.localeCompare(b.name, locale.value))
)
watch(
  () => [props.analysis.query.department, props.analysis.neighborhoods] as const,
  () => {
    const candidates = [...props.analysis.neighborhoods].sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name)
    )
    const valid = new Set(candidates.map(row => row.name))
    const kept = selected.value.filter(value => valid.has(value))
    if (!kept.length && valid.has(props.analysis.query.neighborhood))
      kept.push(props.analysis.query.neighborhood)
    for (const row of candidates)
      if (kept.length < 3 && !kept.includes(row.name)) kept.push(row.name)
    selected.value = [...kept, '', '', ''].slice(0, 3)
  },
  { immediate: true }
)
const rows = computed(() =>
  [...new Set(selected.value)].flatMap(name => {
    const row = props.analysis.neighborhoods.find(zone => zone.name === name)
    return row ? [row] : []
  })
)
// Only the independent territorial layers are read here. This endpoint's converted prices
// never enter the same-currency analysis or the household calculations.
const contextQuery = computed(() => ({
  department: props.analysis.query.department,
  propertyType: 'apartamento',
  bedrooms: 'any',
}))
const {
  data: contextData,
  pending: contextPending,
  status: contextStatus,
  error: contextError,
  refresh: refreshContext,
} = await useFetch<RentalZoneResponse>('/api/rentals/zones', { query: contextQuery, server: false })
const contextLoading = computed(() => contextPending.value || contextStatus.value === 'idle')
const contextReady = computed(
  () =>
    !contextLoading.value &&
    !contextError.value &&
    contextData.value != null &&
    rentalAnalysisLocationName(contextData.value.filters.department) ===
      rentalAnalysisLocationName(props.analysis.query.department)
)
const contextRows = computed(() =>
  rows.value.map(row => ({
    name: row.name,
    context: contextReady.value
      ? rentalAnalysisContext(
          contextData.value?.zones ?? [],
          props.analysis.query.department,
          row.name
        )
      : null,
  }))
)
const services: RentalZoneServiceCategory[] = [
  'supermarket',
  'grocery',
  'pharmacy',
  'healthcare',
  'transit',
  'education',
]
const offenses = ['hurto', 'rapina', 'lesiones', 'violencia-domestica', 'abigeato']
const numberLocale = computed(() =>
  locale.value === 'en' ? 'en-US' : locale.value === 'pt' ? 'pt-BR' : 'es-UY'
)
const integerFormat = computed(() => new Intl.NumberFormat(numberLocale.value))
const decimalFormat = computed(
  () => new Intl.NumberFormat(numberLocale.value, { maximumFractionDigits: 1 })
)
const moneyFormat = computed(
  () =>
    new Intl.NumberFormat(numberLocale.value, {
      style: 'currency',
      currency: props.analysis.query.currency,
      maximumFractionDigits: 0,
    })
)
const dateFormat = computed(
  () => new Intl.DateTimeFormat(numberLocale.value, { dateStyle: 'medium', timeZone: 'UTC' })
)
const integer = (value: number | null | undefined) =>
  value == null ? t('noData') : integerFormat.value.format(value)
const decimal = (value: number) => decimalFormat.value.format(value)
const money = (value: number | null | undefined) =>
  value == null ? t('noData') : moneyFormat.value.format(value)
const signedMoney = (value: number) => `${value > 0 ? '+' : ''}${money(value)}`
const signedPercent = (value: number) => `${value > 0 ? '+' : ''}${decimal(value)}%`
const date = (value: string | null) =>
  value && Number.isFinite(Date.parse(value))
    ? dateFormat.value.format(new Date(value))
    : t('noData')
</script>

<style scoped>
.rental-comparison {
  scroll-margin-top: 100px;
  margin-top: 36px;
  padding-top: 28px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.18);
}
:where(.rental-comparison) :where(h3, h4, p, dl, dd) {
  margin: 0;
}
.rental-comparison h3 {
  font-size: 1.25rem;
  line-height: 1.35;
}
.rental-comparison h4 {
  font-size: 1.08rem;
  line-height: 1.35;
}
.rental-comparison p {
  margin-top: 10px;
  line-height: 1.6;
  font-size: 0.9rem;
  max-width: 85ch;
}
.rental-comparison__selectors,
.rental-comparison__columns {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
  margin-top: 20px;
}
.rental-comparison__selectors label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.88rem;
  font-weight: 600;
}
.rental-comparison select {
  appearance: auto;
  width: 100%;
  min-height: 44px;
  padding: 8px 10px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.4);
  border-radius: 4px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  font: inherit;
}
.rental-comparison__area {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.2);
  padding-top: 14px;
}
.rental-comparison article {
  min-width: 0;
}
.rental-comparison dl {
  margin-top: 12px;
}
.rental-comparison dl > div {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  padding: 10px 0;
}
.rental-comparison dt {
  font-size: 0.79rem;
  line-height: 1.5;
}
.rental-comparison dd {
  margin-top: 4px;
  font-size: 0.95rem;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  line-height: 1.5;
}
.rental-comparison dd small {
  display: block;
  font-weight: 400;
  font-size: 0.76rem;
  margin-top: 3px;
}
.rental-comparison .rental-comparison__price {
  font-size: 1.45rem;
}
.rental-comparison .rental-comparison__meta {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.8);
}
.rental-comparison__notice {
  padding: 10px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  font-size: 0.82rem;
}
.rental-comparison :is(a, .rental-comparison__link) {
  color: rgb(var(--v-theme-link));
  display: inline-block;
  text-decoration: underline;
  text-underline-offset: 3px;
  font-size: 0.85rem;
  line-height: 1.6;
  margin-top: 14px;
  overflow-wrap: anywhere;
}
.rental-comparison__link {
  border: 0;
  background: transparent;
  padding: 8px 0;
  min-height: 44px;
  cursor: pointer;
}
.rental-comparison :is(a, button, select, summary):focus-visible {
  outline: 3px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
}
.rental-comparison__evidence {
  padding: 18px 0;
  margin-top: 20px;
  border-block: 1px solid rgba(var(--v-theme-on-surface), 0.18);
}
.rental-comparison summary {
  cursor: pointer;
  min-height: 44px;
  align-content: center;
  font-weight: 600;
  line-height: 1.5;
}
@media (max-width: 700px) {
  .rental-comparison__selectors,
  .rental-comparison__columns {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  .rental-comparison__selectors {
    gap: 12px;
  }
  .rental-comparison dl > div {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    align-items: baseline;
  }
  .rental-comparison dd {
    text-align: right;
  }
}
@media (prefers-reduced-motion: reduce) {
  .rental-comparison {
    scroll-behavior: auto;
  }
}
</style>
