<!--
THESIS: A shortlist of real cars that two people can discuss using the same evidence.
OWN-WORLD: Existing light-first Vuetify controls, blue actions, neutral table rules and real photos.
STORY: Pick up to three adverts, inspect their differences, share the exact selection.
FIRST VIEWPORT: Task title, selected cars and factual table; search leads when the selection is empty.
FORM: A focused extension of the used-car directory, with a responsive comparison table and source links.
-->
<template>
  <VContainer class="car-comparison py-6 py-md-10">
    <header class="mb-6">
      <VBtn
        :to="localePath(CARS_PATH)"
        variant="text"
        class="cu-btn-flush mb-3"
        prepend-icon="mdi-arrow-left"
      >
        {{ t('directory') }}
      </VBtn>
      <h1 class="text-h4 font-weight-bold mb-3">{{ t('title') }}</h1>
      <p class="comparison-prose text-body-1 mb-0">{{ t('intro') }}</p>
      <p class="text-body-2 text-medium-emphasis mt-2 mb-0">
        {{ t('modelsLead') }}
        <NuxtLink :to="localePath('/comparar-autos-usados-uruguay')">{{
          t('modelsLink')
        }}</NuxtLink>
      </p>
    </header>

    <section
      v-if="keys.length"
      class="mb-8"
      :aria-labelledby="'comparison-selection'"
      :aria-busy="status === 'pending'"
    >
      <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-4">
        <h2 id="comparison-selection" class="text-h5 mb-0">{{ t('selection') }}</h2>
        <span class="text-body-2" aria-live="polite">{{ t('count', { count: keys.length }) }}</span>
        <VBtn variant="text" size="small" @click="setKeys([])">{{ t('clearSelection') }}</VBtn>
        <div v-if="entries.length >= 2" class="d-flex flex-wrap ga-2">
          <VBtn
            v-if="keys.length < CAR_COMPARISON_LIMIT"
            href="#comparison-search"
            variant="outlined"
            size="small"
            prepend-icon="mdi-plus"
            >{{ t('addAnother') }}</VBtn
          >
          <ShareButtons :url="shareUrl" :text="shareTitle" :description="shareDescription" />
        </div>
      </div>
      <VProgressLinear
        v-if="status === 'pending'"
        indeterminate
        color="primary"
        :aria-label="t('selection')"
        class="mb-3"
      />
      <VAlert v-if="comparisonError" type="warning" variant="outlined" class="mb-4">
        {{ t('unavailable') }}
        <VBtn variant="text" @click="refreshComparison()">{{ t('retry') }}</VBtn>
      </VAlert>
      <VAlert v-if="missing.length" type="info" variant="outlined" class="mb-4">
        {{ t('missing', { count: missing.length }) }}
        <VBtn variant="text" @click="setKeys(keys.filter(key => !missing.includes(key)))">{{
          t('removeMissing')
        }}</VBtn>
      </VAlert>
      <div class="comparison-selection">
        <article v-for="entry in entries" :key="entry.car.key" class="comparison-selected">
          <img
            v-if="entry.car.picture"
            :src="entry.car.picture"
            :alt="entry.car.title"
            width="160"
            height="110"
            referrerpolicy="no-referrer"
          />
          <div class="comparison-selected__body">
            <h3 class="text-body-1 font-weight-bold mb-1">
              <NuxtLink :to="localePath(carPath(entry.car.key))">{{ entry.car.title }}</NuxtLink>
            </h3>
            <p class="text-body-2 mb-1">{{ entry.car.year }} · {{ formatCarPrice(entry.car) }}</p>
            <p v-if="entry.stale" class="text-body-2 mb-1">{{ t('stale') }}</p>
            <VBtn
              variant="text"
              size="small"
              class="cu-btn-flush"
              :aria-label="t('remove', { name: entry.car.title })"
              prepend-icon="mdi-close"
              @click="setKeys(keys.filter(key => key !== entry.car.key))"
              >{{ t('removeShort') }}</VBtn
            >
          </div>
        </article>
      </div>
      <p v-if="keys.length === 1" class="text-body-1 mt-4 mb-0">{{ t('oneMore') }}</p>

      <div v-if="entries.length >= 2" class="comparison-table-wrap mt-5">
        <table class="comparison-table cu-mobile-cards cu-roomy">
          <caption class="text-h6 text-left mb-3">
            {{
              t('table')
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">{{ t('attribute') }}</th>
              <th v-for="entry in entries" :key="entry.car.key" scope="col">
                {{ entry.car.title }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id">
              <th scope="row">{{ t(row.id) }}</th>
              <td
                v-for="(cell, index) in row.cells"
                :key="entries[index]!.car.key"
                :data-label="entries[index]!.car.title"
                :class="{ 'cu-cell-prose': row.id === 'warnings' }"
              >
                <span :class="{ 'font-weight-bold': row.id === 'price' }">{{ cell.value }}</span>
                <small v-if="cell.note" class="comparison-note cu-cell-note">{{ cell.note }}</small>
              </td>
            </tr>
            <tr>
              <th scope="row">{{ t('source') }}</th>
              <td v-for="entry in entries" :key="entry.car.key" :data-label="entry.car.title">
                <a
                  v-if="entry.car.permalink"
                  :href="entry.car.permalink"
                  target="_blank"
                  rel="noopener noreferrer"
                  >{{ t('original', { source: entry.car.sourceName }) }}</a
                ><span v-else>{{ entry.car.sourceName }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <section v-if="entries.length >= 2" class="comparison-share mt-5">
        <div>
          <h3 class="text-h6 mb-2">{{ t('shareTitle') }}</h3>
          <p class="text-body-2 mb-0">{{ t('shareHelp') }}</p>
        </div>
        <ShareButtons :url="shareUrl" :text="shareTitle" :description="shareDescription" />
      </section>
    </section>

    <section
      v-if="keys.length < CAR_COMPARISON_LIMIT"
      class="comparison-search mb-10"
      aria-labelledby="comparison-search"
    >
      <h2 id="comparison-search" class="text-h5 mb-2">
        {{ keys.length ? t('search') : t('empty') }}
      </h2>
      <p v-if="!keys.length" class="comparison-prose text-body-1 mb-4">{{ t('emptyHelp') }}</p>
      <form class="comparison-search__form mt-4" @submit.prevent="submitSearch">
        <VTextField
          v-model="searchDraft"
          :label="t('searchLabel')"
          :placeholder="t('searchPlaceholder')"
          variant="outlined"
          density="comfortable"
          hide-details
          maxlength="100"
          clearable
        />
        <VBtn
          type="submit"
          color="primary"
          :loading="searchStatus === 'pending'"
          prepend-icon="mdi-magnify"
          >{{ t('search') }}</VBtn
        >
      </form>
      <VAlert v-if="searchError" type="warning" variant="outlined" class="mt-4">
        {{ t('unavailable') }}
        <VBtn variant="text" @click="refreshSearch()">{{ t('retry') }}</VBtn>
      </VAlert>
      <p v-else-if="searchData && !searchData.items.length" class="text-body-1 mt-4">
        {{ t('noResults') }}
      </p>
      <template v-else-if="searchData?.items.length">
        <h3 class="text-subtitle-1 font-weight-bold mt-5 mb-2">
          {{ searchQuery ? t('results', { query: searchQuery }) : t('recent') }}
        </h3>
        <ul class="comparison-results">
          <li v-for="car in searchData.items" :key="car.key">
            <img
              v-if="car.picture"
              :src="car.picture"
              alt=""
              width="100"
              height="70"
              loading="lazy"
              referrerpolicy="no-referrer"
            />
            <div class="comparison-result__body">
              <NuxtLink :to="localePath(carPath(car.key))" class="font-weight-bold">{{
                car.title
              }}</NuxtLink>
              <p class="text-body-2 mb-0">
                {{ formatCarPrice(car) }} · {{ car.year }} ·
                {{ car.km === null ? t('unknown') : formatCarKm(car.km) }}
              </p>
            </div>
            <VBtn
              :disabled="keys.includes(car.key)"
              :aria-label="t('addNamed', { name: car.title })"
              variant="outlined"
              size="small"
              :prepend-icon="keys.includes(car.key) ? 'mdi-check' : 'mdi-plus'"
              @click="setKeys([...keys, car.key])"
              >{{ keys.includes(car.key) ? t('selected') : t('add') }}</VBtn
            >
          </li>
        </ul>
      </template>
    </section>
    <p v-else class="text-body-2 mb-8">{{ t('full') }}</p>

    <section class="comparison-guide" aria-labelledby="comparison-guide">
      <h2 id="comparison-guide" class="text-h5 font-weight-bold mb-3">{{ t('guideTitle') }}</h2>
      <p class="text-body-1 mb-5">{{ t('guideIntro') }}</p>
      <section v-for="part in ['Same', 'Price', 'Ownership', 'Review']" :key="part" class="mb-5">
        <h3 class="text-h6 mb-2">{{ t(`guide${part}Title`) }}</h3>
        <p class="text-body-1 mb-0">{{ t(`guide${part}`) }}</p>
      </section>
      <h3 class="text-h6 mt-8 mb-3">{{ t('relatedTitle') }}</h3>
      <ul class="pl-5">
        <li v-for="link in related" :key="link.path" class="mb-2">
          <NuxtLink :to="localePath(link.path)">{{ t(link.label) }}</NuxtLink>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  CARS_PATH,
  carPath,
  formatCarDate,
  formatCarKm,
  formatCarPrice,
  formatCarUsd,
  type CarsResponse,
} from '~/utils/cars'
import {
  CAR_COMPARISON_LIMIT,
  CAR_COMPARISON_PATH,
  carComparisonEquipment,
  carComparisonKeys,
  carComparisonLocation,
  carComparisonWarningItems,
  type CarComparisonResponse,
} from '~/utils/carComparison'
import { CAR_COMPARISON_MESSAGES } from '~/utils/carComparisonMessages'
import type { PublicCarEquipment, PublicCarListing } from '~/utils/carsPublic'

const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()
const { t } = useI18n({ useScope: 'local', messages: CAR_COMPARISON_MESSAGES })
const keys = computed(() => carComparisonKeys(route.query.autos))
const {
  data: comparison,
  error: comparisonError,
  status,
  refresh: refreshComparison,
} = await useAsyncData(
  () => `car-comparison-${keys.value.join(',')}`,
  () =>
    keys.value.length
      ? $fetch<CarComparisonResponse>('/api/cars/compare-listings', {
          query: { autos: keys.value.join(',') },
        })
      : Promise.resolve({ items: [], missing: [] })
)
const entries = computed(() =>
  (comparison.value?.items ?? []).filter(entry => keys.value.includes(entry.car.key))
)
const missing = computed(() =>
  (comparison.value?.missing ?? []).filter(key => keys.value.includes(key))
)
async function setKeys(value: string[]) {
  await router.push(localePath(carComparisonLocation(value)))
  await nextTick()
  if (import.meta.client)
    document.getElementById('comparison-selection')?.scrollIntoView({ block: 'start' })
}

const searchDraft = ref('')
const searchQuery = ref('')
const canSearch = computed(() => keys.value.length < CAR_COMPARISON_LIMIT)
const {
  data: searchData,
  error: searchError,
  status: searchStatus,
  refresh: refreshSearch,
} = await useAsyncData<Pick<CarsResponse, 'items'>>(
  'car-comparison-search',
  () =>
    canSearch.value
      ? $fetch<CarsResponse>('/api/cars', { query: { q: searchQuery.value } })
      : Promise.resolve({ items: [] }),
  { watch: [searchQuery, canSearch] }
)
function submitSearch() {
  const next = (searchDraft.value || '').trim()
  if (next === searchQuery.value) void refreshSearch()
  else searchQuery.value = next
}

type Cell = { value: string; note?: string }
const known = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === '' ? t('unknown') : String(value)
const equipment = (car: PublicCarListing, key: PublicCarEquipment): Cell => {
  const value = carComparisonEquipment(car, key)
  return { value: value === null ? t('unknown') : t(value ? 'yes' : 'no') }
}
const rows = computed(() => {
  const definitions: Array<{ id: string; cell: (car: PublicCarListing) => Cell }> = [
    {
      id: 'price',
      cell: car => ({
        value: formatCarPrice(car),
        note: [
          car.currencyInferred ? t('inferred') : '',
          car.listedPrice !== null
            ? t('cash', {
                price: formatCarPrice({ price: car.listedPrice, currency: car.currency }),
              })
            : '',
        ]
          .filter(Boolean)
          .join(' · '),
      }),
    },
    {
      id: 'dollars',
      cell: car => ({
        value: `${car.priceConverted ? '≈ ' : ''}${formatCarUsd(car.priceUsd)}`,
        note: car.priceConverted ? t('converted') : undefined,
      }),
    },
    { id: 'year', cell: car => ({ value: known(car.year) }) },
    { id: 'km', cell: car => ({ value: car.km === null ? t('unknown') : formatCarKm(car.km) }) },
    {
      id: 'version',
      cell: car => ({ value: known([car.trim, car.engine].filter(Boolean).join(' · ')) }),
    },
    { id: 'fuel', cell: car => ({ value: car.fuel ? t(`fuelLabels.${car.fuel}`) : t('unknown') }) },
    {
      id: 'transmission',
      cell: car => ({
        value: car.transmission ? t(`transmissionLabels.${car.transmission}`) : t('unknown'),
      }),
    },
    {
      id: 'consumption',
      cell: car => ({
        value: car.fuelEconomy ? `${car.fuelEconomy.litersPer100Km} L/100 km` : t('unknown'),
        note: car.fuelEconomy
          ? t(car.fuelEconomy.basis === 'advert' ? 'consumptionAdvert' : 'consumptionEstimate')
          : undefined,
      }),
    },
    { id: 'abs', cell: car => equipment(car, 'abs') },
    { id: 'stability', cell: car => equipment(car, 'control_estabilidad') },
    { id: 'isofix', cell: car => equipment(car, 'isofix') },
    {
      id: 'place',
      cell: car => ({
        value: known([car.neighborhood, car.department].filter(Boolean).join(', ')),
      }),
    },
    { id: 'lastSeen', cell: car => ({ value: known(formatCarDate(car.lastSeen)) }) },
    {
      id: 'warnings',
      cell: car => {
        const warnings = carComparisonWarningItems(car)
        return {
          value: warnings.length
            ? warnings
                .map(
                  warning => `${t(warning.labelKey)}${warning.quote ? `: «${warning.quote}»` : ''}`
                )
                .join(' · ')
            : t('noWarnings'),
        }
      },
    },
  ]
  return definitions
    .filter(row => row.id !== 'dollars' || entries.value.some(entry => entry.car.priceConverted))
    .map(row => ({ id: row.id, cells: entries.value.map(entry => row.cell(entry.car)) }))
})
const related = [
  { path: '/que-auto-comprar-uruguay', label: 'advisor' },
  { path: '/mercado-de-autos-usados-uruguay', label: 'market' },
  { path: '/comprar-auto-con-deuda-uruguay', label: 'debts' },
]
const shareTitle = computed(() =>
  entries.value.length >= 2
    ? entries.value
        .map(entry => `${entry.car.brand} ${entry.car.model} ${entry.car.year}`)
        .join(' vs ')
    : t('title')
)
const shareDescription = computed(() => {
  const summaries = entries.value.map(({ car }) => {
    const uncertain =
      car.currencyInferred ||
      car.flags.some(flag => flag === 'financing' || flag === 'price_mismatch')
    const price = uncertain ? t('priceUncertain') : formatCarPrice(car)
    return `${car.brand} ${car.model} ${car.year}: ${price}${car.km === null ? '' : `, ${formatCarKm(car.km)}`}`
  })
  return `${t('shareSnapshot')} ${summaries.join(' · ')}`
})
const canonical = computed(() => `https://cambio-uruguay.com${localePath(CAR_COMPARISON_PATH)}`)
const shareUrl = computed(
  () =>
    `https://cambio-uruguay.com${router.resolve(localePath(carComparisonLocation(keys.value))).href}`
)
useSeoMeta({
  title: () => `${shareTitle.value} | Cambio Uruguay`,
  description: () => t('description'),
  ogTitle: () => shareTitle.value,
  ogDescription: () => t('description'),
  ogUrl: () => shareUrl.value,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  // Siempre noindex: el hub indexable de "comparar autos usados" es /comparar-autos-usados-uruguay
  // (modelos). Este compara avisos que elige el lector, como los comparadores de movilidad.
  robots: 'noindex, follow',
})
useHead(() => ({ link: [{ rel: 'canonical', href: canonical.value }] }))
defineOgImageComponent('Cambio', {
  title: () => shareTitle.value,
  subtitle: () => t('description'),
  tag: 'AUTOS',
})
</script>

<style scoped>
.comparison-prose,
.comparison-guide {
  max-width: 74ch;
}
#comparison-selection,
#comparison-search {
  scroll-margin-top: 120px;
}
.comparison-selection {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: 24px;
}
.comparison-selected {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  min-width: 0;
}
.comparison-selected img {
  width: 96px;
  height: 72px;
  object-fit: cover;
  border-radius: 8px;
}
.comparison-selected__body {
  min-width: 0;
  overflow-wrap: anywhere;
}
.comparison-selected__body p {
  margin-top: 0;
}
.comparison-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.comparison-table th,
.comparison-table td {
  text-align: left;
  vertical-align: top;
  padding: 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  overflow-wrap: anywhere;
}
.comparison-table thead th,
.comparison-table tbody th {
  background: rgba(var(--v-theme-on-surface), 0.04);
}
.comparison-table thead th:first-child {
  width: 20%;
}
.comparison-note {
  display: block;
  margin-top: 4px;
  font-size: 0.8rem;
  line-height: 1.5;
}
.comparison-share {
  display: flex;
  gap: 24px;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  background: rgba(var(--v-theme-primary), 0.06);
  border-radius: 12px;
}
.comparison-share p {
  max-width: 64ch;
  margin-top: 0;
}
.comparison-search__form {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 760px;
}
.comparison-results {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 24px;
}
.comparison-results li {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 16px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.comparison-results img {
  width: 80px;
  height: 64px;
  object-fit: cover;
  border-radius: 8px;
}
.comparison-result__body {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}
.comparison-result__body p {
  margin-top: 4px;
}
.comparison-guide p {
  margin-top: 0;
}
@media (max-width: 959px) {
  .comparison-results {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 599px) {
  .comparison-share,
  .comparison-search__form {
    flex-direction: column;
    align-items: stretch;
  }
  .comparison-table th,
  .comparison-table td {
    padding: 10px;
  }
  .comparison-table tbody th {
    display: block;
  }
  .comparison-table td::before {
    flex: 1 1 100%;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .comparison-results img {
    width: 60px;
    height: 56px;
  }
  .comparison-results li {
    gap: 8px;
  }
}
</style>
