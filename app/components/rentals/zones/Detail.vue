<template>
  <section
    ref="section"
    class="zone-detail"
    tabindex="-1"
    :aria-label="zone.ref.neighborhood"
    data-testid="rental-zone-detail"
  >
    <header>
      <h3>{{ zone.ref.neighborhood }}</h3>
      <p>{{ zone.ref.department }}</p>
    </header>
    <p v-if="!zone.boundaryAvailable" class="meta">{{ t('noMap') }}</p>
    <template v-if="layer === 'prices'">
      <p class="stat-label">{{ t(priceStatistic === 'mean' ? 'mean' : 'rent') }}</p>
      <strong class="stat">{{ money(zone.prices.rent[priceStatistic]) }}</strong>
      <p class="meta">{{ t('sample', { n: zone.prices.rent.count }) }}</p>
      <p v-if="zone.prices.rent.median === null" class="notice">{{ t('minimum') }}</p>
      <dl class="facts">
        <div>
          <dt>{{ t(priceStatistic === 'mean' ? 'rent' : 'mean') }}</dt>
          <dd>{{ money(zone.prices.rent[priceStatistic === 'mean' ? 'median' : 'mean']) }}</dd>
        </div>
        <div>
          <dt>{{ t('range') }}</dt>
          <dd>{{ money(zone.prices.rent.p25) }} – {{ money(zone.prices.rent.p75) }}</dd>
        </div>
      </dl>
      <p class="hint">{{ t('rentHint') }}</p>
      <details>
        <summary>{{ t('morePrices') }}</summary>
        <dl class="facts">
          <div v-for="item in additionalPrices" :key="item.key">
            <dt>{{ t(item.key) }}</dt>
            <dd>{{ money(item.value.median) }}</dd>
            <small>{{ t('sample', { n: item.value.count }) }}</small>
          </div>
        </dl>
      </details>
      <p class="hint">{{ t('publishedZones') }}</p>
    </template>
    <template v-else-if="layer === 'services'">
      <p v-if="!zone.services || zone.services.status === 'unavailable'" class="notice">
        {{ t('unavailableSnapshot') }}
      </p>
      <template v-else>
        <p v-if="zone.services.status === 'stale'" class="notice">{{ t('stale') }}</p>
        <dl class="facts">
          <div v-for="category in serviceCategories" :key="category">
            <dt>{{ t(category) }}</dt>
            <dd>{{ number(zone.services.counts[category]) }}</dd>
          </div>
        </dl>
      </template>
      <p class="hint">{{ t('servicesHint') }}</p>
      <p class="hint">{{ t('nearbyHint') }}</p>
    </template>
    <template v-else>
      <p v-if="!zone.crime || zone.crime.status === 'unavailable'" class="notice">
        {{ t('unavailableSnapshot') }}
      </p>
      <template v-else>
        <p v-if="zone.crime.status === 'stale'" class="notice">{{ t('stale') }}</p>
        <p class="hint">{{ t('geography', { name: zone.crime.geographyName }) }}</p>
        <p v-if="zone.crime.geography === 'department'" class="notice">
          {{ t('departmentCrime') }}
        </p>
        <p>
          {{ t('period', { from: date(zone.crime.periodFrom), to: date(zone.crime.periodTo) }) }}
        </p>
        <strong class="stat">{{
          zone.crime.total === null ? t('noData') : t('complaints', { n: number(zone.crime.total) })
        }}</strong>
        <dl class="facts">
          <div v-for="(count, offense) in zone.crime.byOffense" :key="offense">
            <dt>{{ offenseLabel(offense) }}</dt>
            <dd>{{ number(count) }}</dd>
          </div>
        </dl>
      </template>
      <p class="hint">{{ t('crimeHint') }}</p>
      <p class="hint">{{ t('crimeCoverage') }}</p>
      <p class="hint">{{ t('notZero') }}</p>
    </template>
    <p v-if="dataAsOf" class="meta">{{ t('dataDate', { date: date(dataAsOf) }) }}</p>
    <details class="evidence">
      <summary>{{ t('evidence') }}</summary>
      <ul>
        <li v-for="source in sources" :key="source.url">
          <a v-if="safe(source.url)" :href="source.url" target="_blank" rel="noopener noreferrer">{{
            source.name
          }}</a
          ><span v-else>{{ source.name }}</span>
          <span v-if="source.dataAsOf"> · {{ date(source.dataAsOf) }}</span>
        </li>
      </ul>
      <p class="hint">{{ t('publishedZones') }}</p>
    </details>
    <NuxtLink :to="rentalsLink" class="rental-link" target="_blank" rel="noopener">
      <span>{{ t('rentalsInZone') }}</span>
      <VIcon size="18">mdi-arrow-right</VIcon>
    </NuxtLink>
    <slot />
  </section>
</template>

<script setup lang="ts">
import type {
  RentalZone,
  RentalZoneSource,
  RentalZoneServiceCategory,
} from '~/utils/rentalZoneTypes'
import { rentalZoneMessages } from '~/utils/rentalZoneMessages'
const props = defineProps<{
  zone: RentalZone
  layer: 'prices' | 'services' | 'crime'
  priceStatistic: 'median' | 'mean'
  rentalDate: string | null
  priceSources: RentalZoneSource[]
}>()
const { t, locale } = useI18n({ useScope: 'local', messages: rentalZoneMessages })
const localePath = useLocalePath()
const section = ref<HTMLElement>()
const serviceCategories: RentalZoneServiceCategory[] = [
  'supermarket',
  'grocery',
  'pharmacy',
  'healthcare',
  'transit',
  'education',
]
const number = (value: number | null | undefined) =>
  value == null ? t('noData') : new Intl.NumberFormat(locale.value).format(value)
const money = (value: number | null | undefined) =>
  value == null ? t('noData') : `$ ${number(Math.round(value))}`
const date = (value: string | null) =>
  value && Number.isFinite(Date.parse(value))
    ? new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeZone: 'UTC' }).format(
        new Date(value)
      )
    : t('noData')
const safe = (url: string) => /^https:\/\//.test(url)
const offenseKeys: Record<string, string> = {
  hurto: 'theft',
  hurtos: 'theft',
  rapina: 'robbery',
  rapinas: 'robbery',
  lesiones: 'injuries',
  violencia_domestica: 'domesticViolence',
  abigeato: 'livestockTheft',
}
function offenseLabel(value: string | number) {
  const normalized = String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
  const key = offenseKeys[normalized]
  return key ? t(key) : String(value)
}
const additionalPrices = computed(() => [
  { key: 'commonExpenses', value: props.zone.prices.commonExpenses },
  { key: 'monthlyTotal', value: props.zone.prices.monthlyTotal },
  { key: 'builtSquareMeter', value: props.zone.prices.builtSquareMeter },
])
const sources = computed(() =>
  props.layer === 'services'
    ? props.zone.services
      ? [props.zone.services.source]
      : []
    : props.layer === 'crime'
      ? props.zone.crime
        ? [props.zone.crime.source]
        : []
      : props.priceSources
)
const dataAsOf = computed(() =>
  props.layer === 'prices' ? props.rentalDate : sources.value[0]?.dataAsOf
)
const rentalsLink = computed(() => ({
  path: localePath('/alquileres-uruguay'),
  query: {
    department: props.zone.ref.department,
    neighborhood: props.zone.ref.neighborhood,
    type: 'vivienda',
  },
}))
defineExpose({ focus: () => section.value?.focus({ preventScroll: true }) })
</script>

<style scoped>
.zone-detail {
  scroll-margin-top: 84px;
  min-width: 0;
  padding: 20px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
.zone-detail :is(h3, p, ul, dl, dd) {
  margin: 0;
}
header {
  margin-bottom: 20px;
}
h3 {
  font-size: 1.25rem;
  line-height: 1.3;
}
header p,
.meta {
  color: rgba(var(--v-theme-on-surface), 0.76);
  font-size: 0.8rem;
}
.stat-label {
  margin-top: 16px;
}
.stat {
  display: block;
  font-size: 1.5rem;
  font-variant-numeric: tabular-nums;
  margin-block: 4px;
}
.facts {
  display: grid;
  gap: 12px;
  margin-block: 20px !important;
}
.facts > div {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 4px 16px;
}
dd {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: right;
}
small {
  grid-column: 1/-1;
  font-size: 0.8rem;
}
.zone-detail .hint {
  font-size: 0.8rem;
  line-height: 1.5;
  margin-top: 12px;
}
.zone-detail .notice {
  margin-block: 12px;
  font-size: 0.875rem;
}
.zone-detail .meta {
  margin-top: 12px;
}
summary {
  cursor: pointer;
  min-height: 44px;
  display: flex;
  align-items: center;
  font-weight: 600;
}
summary::before {
  content: '▸';
  margin-right: 8px;
}
details[open] > summary::before {
  content: '▾';
}
details {
  margin-top: 12px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.evidence ul {
  padding-left: 20px;
}
.evidence li + li {
  margin-top: 8px;
}
.rental-link {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  min-height: 44px;
  margin-top: 16px;
  color: rgb(var(--v-theme-link));
}
@media (max-width: 599px) {
  .facts > div {
    grid-template-columns: minmax(0, 1fr);
  }
  dd {
    text-align: left;
  }
}
</style>
