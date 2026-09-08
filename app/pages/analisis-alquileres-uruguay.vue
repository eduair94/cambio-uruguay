<!--
THESIS: Move from a local asking-price distribution to a home-specific reference with evidence.
OWN-WORLD: Existing Open Sans, paper/navy surfaces, blue actions, familiar labeled controls.
STORY: Select comparable homes, inspect area ranges and costs, then test one property's rent.
FIRST VIEWPORT: Compact heading, visible map and estimator actions, filters and area comparison.
FORM: Market explorer and estimation worksheet (surface seed ab18f049, structure 7); labeled ranges,
not decorative charts. On phones the chart rows recompose and the form stays in document flow.
-->
<template>
  <VContainer class="rental-analysis">
    <VBreadcrumbs :items="breadcrumbs" density="compact" class="px-0 py-1" />
    <header class="rental-analysis__header">
      <div>
        <h1>{{ t('title') }}</h1>
        <p class="rental-analysis__lead">{{ t('intro') }}</p>
      </div>
      <div class="rental-analysis__actions">
        <VBtn
          href="#mapa-alquileres"
          color="primary"
          prepend-icon="mdi-map-outline"
          @click.prevent="openMap"
        >
          {{ t('mapLink') }}
        </VBtn>
        <VBtn href="#estimar-alquiler" variant="outlined" prepend-icon="mdi-home-search-outline">
          {{ t('estimate') }}
        </VBtn>
      </div>
    </header>
    <nav class="rental-analysis__links" :aria-label="t('breadcrumb')">
      <NuxtLink :to="directoryLink">{{ t('directory') }}</NuxtLink>
      <a href="#mapa-alquileres" @click.prevent="openMap">{{ t('mapLayers') }}</a>
      <a href="#detalle-mercado">{{ t('detailLink') }}</a>
      <a href="#presupuesto-alquiler">{{ t('incomeLink') }}</a>
      <a href="#comparar-barrios">{{ t('compareLink') }}</a>
      <a href="#cobertura-datos">{{ t('coverageLink') }}</a>
      <a href="#metodologia-alquileres">{{ t('methodLink') }}</a>
    </nav>

    <section id="mercado-alquileres" aria-labelledby="market-title" class="rental-analysis__market">
      <h2 id="market-title">{{ t('market') }}</h2>
      <form
        class="rental-analysis__filters"
        :aria-label="t('filters')"
        @submit.prevent="applyFilters"
      >
        <label
          >{{ t('department') }}
          <select v-model="draft.department" name="department" data-testid="analysis-department">
            <option value="">{{ t('allDepartments') }}</option>
            <option v-for="department in departments" :key="department">{{ department }}</option>
          </select>
        </label>
        <label
          >{{ t('type') }}
          <select v-model="draft.type" name="type">
            <option value="all">{{ t('allTypes') }}</option>
            <option value="apartamento">{{ t('apartamento') }}</option>
            <option value="casa">{{ t('casa') }}</option>
          </select>
        </label>
        <label
          >{{ t('bedrooms') }}
          <select v-model="draft.bedrooms" name="bedrooms">
            <option :value="null">{{ t('allBedrooms') }}</option>
            <option :value="0">{{ t('studio') }}</option>
            <option v-for="n in 5" :key="n" :value="n">{{ n }}</option>
          </select>
        </label>
        <label
          >{{ t('currency') }}
          <select v-model="draft.currency" name="currency">
            <option value="UYU">{{ t('UYU') }}</option>
            <option value="USD">{{ t('USD') }}</option>
          </select>
        </label>
        <VBtn type="submit" color="primary" :loading="loading">{{ t('apply') }}</VBtn>
      </form>
      <div v-if="query.neighborhood" class="rental-analysis__scope">
        <strong>{{ query.department }} · {{ query.neighborhood }}</strong>
        <VBtn variant="text" size="small" @click="selectZone('')">{{ t('allNeighborhoods') }}</VBtn>
      </div>
      <div id="mapa-alquileres">
        <LazyRentalsAnalysisMap
          v-if="mapVisible"
          :analysis="error ? null : (data ?? null)"
          :query="query"
          :loading="loading"
          @explore="selectZone"
          @montevideo="selectMontevideo"
        />
      </div>
      <div :aria-busy="loading" aria-live="polite" class="rental-analysis__results">
        <div v-if="loading" class="rental-analysis__state" role="status">
          <VProgressCircular indeterminate color="primary" size="24" />
          <p>{{ t('loading') }}</p>
        </div>
        <div v-else-if="error" class="rental-analysis__state" role="alert">
          <h3>{{ t(staleCatalogue ? 'stale' : 'failed') }}</h3>
          <p v-if="staleCatalogue">{{ t('staleHint') }}</p>
          <p v-if="staleCatalogue && failureData?.data?.generatedAt" class="rental-analysis__note">
            {{ t('updated', { date: dateLabel(failureData.data.generatedAt) }) }}
          </p>
          <VBtn variant="outlined" @click="refresh()">{{ t('retry') }}</VBtn>
        </div>
        <div v-else-if="!data?.summary.count" class="rental-analysis__state">
          <h3>{{ t('empty') }}</h3>
          <p>{{ t('emptyHint') }}</p>
        </div>
        <template v-else>
          <div class="rental-analysis__provenance">
            <strong>{{ t('sample', { n: integer(data.summary.count) }) }}</strong>
            <span>{{ t('updated', { date: dateLabel(data.generatedAt) }) }}</span>
          </div>
          <p class="rental-analysis__note">{{ t('observed') }}</p>
          <dl class="rental-analysis__measures">
            <div>
              <dt>{{ t('rentMedian') }}</dt>
              <dd>{{ money(data.summary.rent?.median) }}</dd>
              <p v-if="data.summary.rent">
                {{
                  t('middle', {
                    low: money(data.summary.rent.p25),
                    high: money(data.summary.rent.p75),
                  })
                }}
              </p>
            </div>
            <div>
              <dt>{{ t('monthlyMedian') }}</dt>
              <dd>{{ money(data.summary.monthly?.median) }}</dd>
              <p>
                {{
                  expensesLabel(data.summary.expensesKnownCount, data.summary.expensesCoveragePct)
                }}
              </p>
            </div>
            <div>
              <dt>{{ t('perM2') }}</dt>
              <dd>{{ money(data.summary.perM2.built?.median) }}</dd>
              <p>{{ t('areaCount', { n: integer(data.summary.perM2.built?.count ?? 0) }) }}</p>
            </div>
          </dl>

          <section class="rental-analysis__zones" aria-labelledby="zone-title">
            <div class="rental-analysis__section-head">
              <div>
                <h3 id="zone-title">{{ t('zoneTitle') }}</h3>
                <p>{{ t('zoneHint') }}</p>
              </div>
              <label class="rental-analysis__sort"
                >{{ t('sort') }}
                <select v-model="zoneSort">
                  <option value="price">{{ t('sortPrice') }}</option>
                  <option value="count">{{ t('sortCount') }}</option>
                </select>
              </label>
            </div>
            <label class="rental-analysis__zone-search">
              <span>{{ t('findZone') }}</span>
              <input
                v-model="zoneSearch"
                name="analysis-zone-search"
                type="search"
                :placeholder="t('zoneSearchHint')"
              />
            </label>
            <p v-if="!zones.length" class="rental-analysis__note">{{ t('noZoneMatch') }}</p>
            <div class="rental-analysis__range-head" aria-hidden="true">
              <span>{{ t('zone') }}</span
              ><span>{{ t('range') }} · {{ query.currency }}</span
              ><span>{{ t('median') }}</span
              ><span>{{ t('count') }}</span>
            </div>
            <ul class="rental-analysis__range-list">
              <li
                v-for="zone in visibleZones"
                :key="zone.name"
                :class="{ 'is-selected': zone.name === query.neighborhood }"
              >
                <button
                  type="button"
                  class="rental-analysis__zone-link"
                  :aria-label="t('zoneAction', { zone: zone.name })"
                  @click="selectZone(zone.name)"
                >
                  {{ zone.name }}
                </button>
                <div class="rental-analysis__range-cell">
                  <div v-if="zone.rent" class="rental-analysis__range-track" aria-hidden="true">
                    <span
                      class="rental-analysis__range-band"
                      :style="{
                        left: percent(zone.rent.p25),
                        width: percent(zone.rent.p75 - zone.rent.p25),
                      }"
                    />
                    <span
                      class="rental-analysis__range-dot"
                      :style="{ left: percent(zone.rent.median) }"
                    />
                  </div>
                  <span v-if="zone.rent" class="rental-analysis__range-values">
                    {{ money(zone.rent.p25) }} – {{ money(zone.rent.p75) }}
                  </span>
                </div>
                <strong class="rental-analysis__zone-price">{{ money(zone.rent?.median) }}</strong>
                <span class="rental-analysis__zone-count"
                  >{{ integer(zone.count)
                  }}<small v-if="zone.count < 8">{{ t('few') }}</small></span
                >
              </li>
            </ul>
            <VBtn
              v-if="zones.length > 12"
              variant="text"
              class="mt-3"
              @click="allZones = !allZones"
              >{{ allZones ? t('showLess') : t('showAll', { n: zones.length }) }}</VBtn
            >
          </section>

          <div class="rental-analysis__chart-grid">
            <section aria-labelledby="distribution-title">
              <h3 id="distribution-title">{{ t('distributionTitle') }}</h3>
              <p>{{ t('distributionHint') }}</p>
              <ul class="rental-analysis__distribution">
                <li v-for="(bin, index) in data.distribution" :key="index">
                  <span>{{ money(bin.min) }} – {{ money(bin.max) }}</span>
                  <div class="rental-analysis__bar" aria-hidden="true">
                    <i :style="{ width: `${(bin.count / maxBin) * 100}%` }" />
                  </div>
                  <strong
                    :aria-label="
                      t('distributionLabel', {
                        n: bin.count,
                        low: money(bin.min),
                        high: money(bin.max),
                      })
                    "
                    >{{ integer(bin.count) }}</strong
                  >
                </li>
              </ul>
            </section>
            <section aria-labelledby="bedroom-title">
              <h3 id="bedroom-title">{{ t('bedroomTitle') }}</h3>
              <p>{{ t('bedroomHint') }}</p>
              <table class="rental-analysis__bedrooms cu-mobile-cards">
                <caption class="sr-only">
                  {{
                    t('bedroomTitle')
                  }}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">{{ t('bedrooms') }}</th>
                    <th scope="col">{{ t('rent') }}</th>
                    <th scope="col">{{ t('total') }}</th>
                    <th scope="col">{{ t('count') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in data.bedrooms" :key="row.bedrooms">
                    <td :data-label="t('bedrooms')">
                      {{ row.bedrooms === 0 ? t('studio') : row.bedrooms }}
                    </td>
                    <td :data-label="t('rent')">{{ money(row.rent?.median) }}</td>
                    <td :data-label="t('total')">
                      {{ money(row.monthly?.median)
                      }}<small>{{ t('count') }}: {{ row.expensesKnownCount }}</small>
                    </td>
                    <td :data-label="t('count')">
                      {{ integer(row.count) }}<small v-if="row.count < 8">{{ t('few') }}</small>
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>
          </div>

          <RentalsMarketDetails :analysis="data" />

          <section
            id="presupuesto-alquiler"
            class="rental-analysis__income"
            aria-labelledby="income-title"
          >
            <div>
              <h3 id="income-title">{{ t('incomeTitle') }}</h3>
              <p>{{ t('incomeHint') }}</p>
              <div class="rental-analysis__income-fields">
                <label
                  >{{ t('income') }} ({{ query.currency }})<input
                    v-model="income"
                    type="number"
                    inputmode="decimal"
                    min="1"
                    step="any"
                    :aria-describedby="'analysis-income-currency'"
                    data-testid="analysis-income"
                /></label>
                <label
                  >{{ t('allocation') }} (%)<input
                    v-model="allocation"
                    type="number"
                    inputmode="decimal"
                    min="1"
                    max="100"
                    step="any"
                /></label>
                <label
                  >{{ t('extraCosts') }} ({{ query.currency }})<input
                    v-model="extraCosts"
                    type="number"
                    inputmode="decimal"
                    min="0"
                    step="any"
                    data-testid="analysis-extra-costs"
                /></label>
              </div>
              <p id="analysis-income-currency" class="rental-analysis__note">
                {{ t('incomeCurrency', { currency: query.currency }) }}
              </p>
              <p class="rental-analysis__note">{{ t('extraCostsHint') }}</p>
            </div>
            <div class="rental-analysis__budget" role="status">
              <template v-if="validIncome">
                <span>{{ t('budget') }}</span
                ><strong>{{ money((Number(income) * Number(allocation)) / 100) }}</strong>
                <p v-if="data.summary.monthly">
                  {{
                    t('burden', {
                      pct: decimal(
                        ((data.summary.monthly.median + Number(extraCosts)) / Number(income)) * 100
                      ),
                    })
                  }}
                </p>
                <p v-else>{{ t('noData') }}: {{ t('monthlyMedian') }}.</p>
                <dl v-if="data.summary.monthly" class="rental-analysis__budget-facts">
                  <div>
                    <dt>{{ t('plannedMonthly') }}</dt>
                    <dd>{{ money(data.summary.monthly.median + Number(extraCosts)) }}</dd>
                  </div>
                  <div>
                    <dt>{{ t('annualCost') }}</dt>
                    <dd>{{ money((data.summary.monthly.median + Number(extraCosts)) * 12) }}</dd>
                  </div>
                  <div>
                    <dt>{{ t('requiredIncome', { pct: decimal(Number(allocation)) }) }}</dt>
                    <dd>
                      {{
                        money(
                          rentalAnalysisIncome(
                            data.summary.monthly.median,
                            Number(allocation),
                            Number(extraCosts)
                          )
                        )
                      }}
                    </dd>
                  </div>
                  <div>
                    <dt>{{ t('remainingIncome') }}</dt>
                    <dd>
                      {{ money(Number(income) - data.summary.monthly.median - Number(extraCosts)) }}
                    </dd>
                  </div>
                </dl>
              </template>
              <p v-else>{{ income !== '' ? t('incomeInvalid') : t('incomeEmpty') }}</p>
              <p class="rental-analysis__note">{{ t('budgetNote') }}</p>
            </div>
          </section>
          <RentalsZoneComparison
            :analysis="data"
            :allocation="validAllocation && validExtraCosts ? Number(allocation) : 0"
            :extra-costs="validExtraCosts ? Number(extraCosts) : 0"
            @explore="selectZone"
          />
        </template>
      </div>
    </section>

    <div id="estimar-alquiler" class="rental-analysis__estimator">
      <RentalsPriceEstimator
        :department="query.department"
        :neighborhood="query.neighborhood"
        :departments="departments"
        :neighborhoods="data?.facets.neighborhoods ?? []"
        :currency="query.currency"
        :facets-ready="!loading && !error"
        :facets-error="Boolean(error)"
        :facets-stale="staleCatalogue"
        @retry-facets="refresh"
      />
    </div>

    <section
      id="metodologia-alquileres"
      class="rental-analysis__method"
      aria-labelledby="method-title"
    >
      <h2 id="method-title">{{ t('methodTitle') }}</h2>
      <div class="rental-analysis__method-columns">
        <div>
          <p>{{ t('methodSample', { days: data?.coverage.staleDays ?? 10 }) }}</p>
          <p>{{ t('methodStats') }}</p>
          <p>{{ t('methodCosts') }}</p>
        </div>
        <div>
          <p>{{ t('methodArea') }}</p>
          <p>{{ t('methodLimits') }}</p>
          <h3>{{ t('officialTitle') }}</h3>
          <p>{{ t('officialText') }}</p>
          <a
            href="https://www.gub.uy/instituto-nacional-estadistica/datos-y-estadisticas/estadisticas/series-historicas-indicadores-actividad-inmobiliaria-iai-alquileres"
            target="_blank"
            rel="noopener noreferrer"
            >{{ t('officialLink') }} ↗</a
          >
        </div>
      </div>
    </section>
    <footer class="rental-analysis__next">
      <h2>{{ t('nextTitle') }}</h2>
      <p>{{ t('nextText') }}</p>
      <div class="rental-analysis__links">
        <VBtn :to="directoryLink" color="primary" variant="flat">{{ t('directory') }}</VBtn>
        <NuxtLink :to="localePath('/primer-alquiler-uruguay')">{{ t('firstRental') }}</NuxtLink>
      </div>
    </footer>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { withQuery } from 'ufo'
import { rentalAnalysisMessages } from '~/utils/rentalAnalysisMessages'
import { normalizeRentalAnalysisQuery, type RentalAnalysisResponse } from '~/utils/rentalAnalysis'
import { rentalAnalysisIncome } from '~/utils/rentalAnalysisComparison'

const { t, locale } = useI18n({ useScope: 'local', messages: rentalAnalysisMessages })
const localePath = useLocalePath()
const route = useRoute()
const router = useRouter()
const query = computed(() =>
  normalizeRentalAnalysisQuery({
    department: 'Montevideo',
    type: 'apartamento',
    bedrooms: 1,
    ...route.query,
  })
)
const draft = reactive({ ...query.value })
watch(query, value => Object.assign(draft, value))
const apiQuery = computed(() => ({ ...query.value, bedrooms: query.value.bedrooms ?? '' }))
const analysisUrl = computed(() => withQuery('/api/rentals/analysis', apiQuery.value))
const { data, pending, error, status, refresh } = await useFetch<RentalAnalysisResponse>(
  analysisUrl,
  { server: false, retry: 0 }
)
const mapVisible = ref(false)
async function openMap() {
  mapVisible.value = true
  if (route.hash !== '#mapa-alquileres')
    await router.replace({ query: route.query, hash: '#mapa-alquileres' })
  await nextTick()
  document.getElementById('mapa-alquileres')?.scrollIntoView({ block: 'start' })
}
onMounted(() => {
  if (route.hash === '#mapa-alquileres') openMap()
})
watch(
  () => route.hash,
  hash => {
    if (hash === '#mapa-alquileres') mapVisible.value = true
  }
)
async function selectMontevideo() {
  await router.replace({
    query: {
      ...query.value,
      bedrooms: query.value.bedrooms ?? '',
      department: 'Montevideo',
      neighborhood: '',
    },
    hash: '#mapa-alquileres',
  })
}
const loading = computed(() => pending.value || status.value === 'idle')
const failureData = computed(
  () => error.value?.data as { data?: { code?: string; generatedAt?: string } } | undefined
)
const staleCatalogue = computed(() => failureData.value?.data?.code === 'RENTAL_ANALYSIS_STALE')
const departmentCache = ref<string[]>(['Montevideo'])
watch(
  data,
  value => {
    if (value?.facets.departments.length) departmentCache.value = value.facets.departments
  },
  { immediate: true }
)
const departments = computed(() =>
  [...new Set([...departmentCache.value, query.value.department].filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'es')
  )
)
const allZones = ref(false)
const zoneSort = ref('price')
const zoneSearch = ref('')
const zoneText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .trim()
const zones = computed(() => {
  const rows = query.value.department ? data.value?.neighborhoods : data.value?.departments
  return [...(rows ?? [])]
    .filter(row => row.rent && zoneText(row.name).includes(zoneText(zoneSearch.value)))
    .sort((a, b) =>
      zoneSort.value === 'count'
        ? b.count - a.count || a.name.localeCompare(b.name)
        : a.rent!.median - b.rent!.median || a.name.localeCompare(b.name)
    )
})
const visibleZones = computed(() => (allZones.value ? zones.value : zones.value.slice(0, 12)))
const maxRange = computed(() => Math.max(1, ...zones.value.map(row => row.rent?.p75 ?? 0)) * 1.05)
const percent = (value: number) => `${(value / maxRange.value) * 100}%`
const maxBin = computed(() =>
  Math.max(1, ...(data.value?.distribution.map(row => row.count) ?? []))
)
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
      currency: query.value.currency,
      currencyDisplay: 'symbol',
      maximumFractionDigits: 0,
    })
)
const dateFormat = computed(
  () =>
    new Intl.DateTimeFormat(numberLocale.value, {
      dateStyle: 'medium',
      timeZone: 'America/Montevideo',
    })
)
const integer = (value: number) => integerFormat.value.format(value)
const decimal = (value: number) => decimalFormat.value.format(value)
const money = (value: number | null | undefined) =>
  value == null ? t('noData') : moneyFormat.value.format(value)
const dateLabel = (value: string) =>
  Number.isFinite(Date.parse(value)) ? dateFormat.value.format(new Date(value)) : t('noData')
const expensesLabel = (n: number, pct: number) =>
  t('knownExpenses', { n: integer(n), pct: decimal(pct) })
const income = ref<number | string>('')
const allocation = ref<number | string>(30)
const extraCosts = ref<number | string>(0)
const validAllocation = computed(
  () =>
    Number.isFinite(Number(allocation.value)) &&
    Number(allocation.value) >= 1 &&
    Number(allocation.value) <= 100
)
const validExtraCosts = computed(
  () => Number.isFinite(Number(extraCosts.value)) && Number(extraCosts.value) >= 0
)
const validIncome = computed(
  () =>
    Number.isFinite(Number(income.value)) &&
    Number(income.value) > 0 &&
    validAllocation.value &&
    validExtraCosts.value
)
watch(
  () => query.value.currency,
  () => {
    income.value = ''
    extraCosts.value = 0
  }
)
async function applyFilters() {
  allZones.value = false
  zoneSearch.value = ''
  await router.replace({
    hash: route.hash,
    query: {
      ...draft,
      bedrooms: draft.bedrooms ?? '',
      neighborhood: draft.department === query.value.department ? query.value.neighborhood : '',
    },
  })
}
async function selectZone(name: string) {
  await router.replace({
    hash: route.hash,
    query: {
      ...query.value,
      bedrooms: query.value.bedrooms ?? '',
      ...(query.value.department ? { neighborhood: name } : { department: name, neighborhood: '' }),
    },
  })
}
const directoryLink = computed(() =>
  localePath({
    path: '/alquileres-uruguay',
    query: {
      department: query.value.department,
      neighborhood: query.value.neighborhood,
      type: query.value.type === 'all' ? '' : query.value.type,
      bedrooms: query.value.bedrooms ?? '',
      bedroomsExact: query.value.bedrooms !== null ? '1' : '',
      currency: query.value.currency,
    },
  })
)
const breadcrumbs = computed(() => [
  { title: 'Cambio Uruguay', to: localePath('/') },
  { title: t('breadcrumb'), disabled: true },
])
const canonical = computed(
  () => `https://cambio-uruguay.com${localePath('/analisis-alquileres-uruguay')}`
)
defineOgImageComponent('Cambio', {
  title: () => t('title'),
  subtitle: () => t('seo'),
  tag: 'URUGUAY',
})
useSeoMeta({
  title: () => t('breadcrumb'),
  description: () => t('seo'),
  ogTitle: () => t('title'),
  ogDescription: () => t('seo'),
  ogUrl: () => canonical.value,
  ogType: 'website',
  twitterCard: 'summary_large_image',
})
useHead(() => ({
  link: [{ rel: 'canonical', href: canonical.value }],
  meta: Object.keys(route.query).length ? [{ name: 'robots', content: 'noindex, follow' }] : [],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebPage',
            '@id': `${canonical.value}#page`,
            url: canonical.value,
            name: t('title'),
            description: t('seo'),
            inLanguage: locale.value,
            isPartOf: {
              '@type': 'WebSite',
              name: 'Cambio Uruguay',
              url: 'https://cambio-uruguay.com',
            },
            breadcrumb: { '@id': `${canonical.value}#breadcrumbs` },
          },
          {
            '@type': 'BreadcrumbList',
            '@id': `${canonical.value}#breadcrumbs`,
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Cambio Uruguay',
                item: `https://cambio-uruguay.com${localePath('/')}`,
              },
              { '@type': 'ListItem', position: 2, name: t('breadcrumb'), item: canonical.value },
            ],
          },
        ],
      }).replace(/</g, '\\u003c'),
    },
  ],
}))
</script>

<style scoped>
.rental-analysis {
  max-width: 1200px;
  padding-bottom: 56px;
}
.rental-analysis h1,
.rental-analysis h2,
.rental-analysis h3,
.rental-analysis p,
.rental-analysis dl,
.rental-analysis dd,
.rental-analysis ul {
  margin: 0;
}
.rental-analysis h1 {
  font-size: clamp(1.7rem, 3.6vw, 2.5rem);
  line-height: 1.18;
  font-weight: 800;
  letter-spacing: -0.02em;
  text-wrap: balance;
}
.rental-analysis h2 {
  font-size: clamp(1.4rem, 2.5vw, 1.8rem);
  line-height: 1.25;
  font-weight: 700;
}
.rental-analysis h3 {
  font-size: 1.15rem;
  line-height: 1.35;
  font-weight: 700;
}
.rental-analysis p {
  line-height: 1.6;
  max-width: 72ch;
}
.rental-analysis a:not(.v-btn) {
  color: rgb(var(--v-theme-link));
}
.rental-analysis__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
  margin-top: 20px;
}
.rental-analysis__header > div {
  max-width: 770px;
}
.rental-analysis__actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
}
#mapa-alquileres {
  scroll-margin-top: 100px;
}
.rental-analysis__lead {
  margin-top: 16px !important;
  font-size: 1.05rem;
}
.rental-analysis__links {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 24px;
  margin-top: 20px;
}
.rental-analysis__links > a:not(.v-btn) {
  padding-block: 7px;
  text-underline-offset: 3px;
}
.rental-analysis__market {
  margin-top: 40px;
}
.rental-analysis__filters {
  display: grid;
  grid-template-columns: 1.1fr 1fr 0.7fr 1fr auto;
  align-items: end;
  gap: 16px;
  margin-top: 20px;
  padding: 20px;
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.16);
}
.rental-analysis label {
  display: flex;
  flex-direction: column;
  gap: 7px;
  font-size: 0.85rem;
  font-weight: 600;
  min-width: 0;
}
.rental-analysis select,
.rental-analysis input {
  width: 100%;
  min-height: 44px;
  padding: 9px 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.4);
  border-radius: 4px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  font: inherit;
  font-weight: 400;
}
.rental-analysis select {
  appearance: auto;
}
.rental-analysis :is(select, input, button, a):focus-visible {
  outline: 3px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
}
.rental-analysis__scope {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
}
.rental-analysis__state {
  padding: 48px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
}
.rental-analysis__provenance {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  align-items: baseline;
  margin-top: 28px;
}
.rental-analysis__provenance span,
.rental-analysis__note {
  font-size: 0.83rem;
  color: rgba(var(--v-theme-on-surface), 0.78);
}
.rental-analysis__note {
  margin-top: 8px !important;
}
.rental-analysis__measures {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 28px;
  padding-block: 26px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.16);
}
.rental-analysis__measures dt {
  font-size: 0.9rem;
}
.rental-analysis__measures dd {
  margin-top: 7px;
  font-size: clamp(1.25rem, 2.5vw, 1.8rem);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.rental-analysis__measures p {
  margin-top: 8px;
  font-size: 0.8rem;
}
.rental-analysis__zones {
  margin-top: 32px;
}
#presupuesto-alquiler {
  scroll-margin-top: 100px;
}
.rental-analysis__zone-search {
  margin-top: 16px;
  max-width: 380px;
}
.rental-analysis__budget-facts {
  margin-top: 16px !important;
  font-size: 0.85rem;
}
.rental-analysis__budget-facts > div {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 0;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.15);
}
.rental-analysis__budget-facts dd {
  font-weight: 600;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.rental-analysis__section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}
.rental-analysis__section-head p,
.rental-analysis__chart-grid p,
.rental-analysis__income p {
  margin-top: 8px;
  font-size: 0.9rem;
}
.rental-analysis__sort {
  min-width: 210px !important;
}
.rental-analysis__range-head,
.rental-analysis__range-list li {
  display: grid;
  grid-template-columns: 170px minmax(120px, 1fr) 115px 86px;
  gap: 20px;
  align-items: center;
}
.rental-analysis__range-head {
  margin-top: 24px;
  padding: 8px 12px;
  font-size: 0.75rem;
}
.rental-analysis__range-list {
  list-style: none;
  padding: 0;
}
.rental-analysis__range-list li {
  padding: 13px 12px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}
.rental-analysis__range-list li:hover,
.rental-analysis__range-list li.is-selected {
  background: rgba(var(--v-theme-primary), 0.06);
}
.rental-analysis__zone-link {
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  text-align: left;
  text-decoration: underline;
  text-underline-offset: 3px;
  color: rgb(var(--v-theme-link));
  min-height: 44px;
  font-size: 0.9rem;
}
.rental-analysis__range-track {
  height: 20px;
  position: relative;
}
.rental-analysis__range-track::before {
  content: '';
  position: absolute;
  top: 9px;
  left: 0;
  right: 0;
  height: 1px;
  background: rgba(var(--v-theme-on-surface), 0.14);
}
.rental-analysis__range-band {
  position: absolute;
  top: 4px;
  height: 12px;
  min-width: 2px;
  border-radius: 2px;
  background: rgb(var(--v-theme-primary));
}
.rental-analysis__range-dot {
  position: absolute;
  width: 10px;
  height: 10px;
  top: 5px;
  border-radius: 50%;
  background: rgb(var(--v-theme-on-surface));
  border: 2px solid rgb(var(--v-theme-surface));
  transform: translateX(-50%);
}
.rental-analysis__range-values {
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
}
.rental-analysis__zone-price {
  font-size: 0.95rem;
  font-variant-numeric: tabular-nums;
}
.rental-analysis__zone-count {
  font-size: 0.85rem;
}
.rental-analysis small {
  display: block;
  font-size: 0.72rem;
  font-weight: 400;
  margin-top: 3px;
}
.rental-analysis__chart-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 36px;
  margin-top: 44px;
}
.rental-analysis__distribution {
  list-style: none;
  padding: 0;
  margin-top: 22px !important;
}
.rental-analysis__distribution li {
  display: grid;
  grid-template-columns: minmax(125px, 1fr) 1fr 35px;
  align-items: center;
  gap: 12px;
  margin-top: 13px;
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}
.rental-analysis__bar {
  height: 18px;
  background: rgba(var(--v-theme-primary), 0.06);
}
.rental-analysis__bar i {
  display: block;
  height: 100%;
  background: rgb(var(--v-theme-link));
}
.rental-analysis__bedrooms {
  width: 100%;
  border-collapse: collapse;
  margin-top: 18px;
  font-size: 0.8rem;
}
.rental-analysis__bedrooms :is(th, td) {
  padding: 12px 8px;
  text-align: left;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.14);
  vertical-align: top;
}
.rental-analysis__income {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 32px;
  margin-top: 44px;
  padding: 28px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.16);
  border-radius: 12px;
}
.rental-analysis__income-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 20px;
}
.rental-analysis__budget {
  align-self: center;
}
.rental-analysis__budget > span {
  font-size: 0.85rem;
}
.rental-analysis__budget > strong {
  display: block;
  margin-top: 6px;
  font-size: 1.8rem;
  font-variant-numeric: tabular-nums;
}
.rental-analysis__estimator,
.rental-analysis__method {
  margin-top: 56px;
  scroll-margin-top: 95px;
}
.rental-analysis__method-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 36px;
  margin-top: 20px;
}
.rental-analysis__method p {
  margin-top: 16px;
  font-size: 0.9rem;
}
.rental-analysis__method h3 {
  margin-top: 24px;
}
.rental-analysis__method a {
  display: inline-block;
  margin-top: 12px;
}
.rental-analysis__next {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.16);
  margin-top: 40px;
  padding-top: 32px;
}
.rental-analysis__next > p {
  margin-top: 12px;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
@media (max-width: 959px) {
  .rental-analysis__header {
    align-items: flex-start;
    flex-direction: column;
    gap: 20px;
  }
  .rental-analysis__filters {
    grid-template-columns: 1fr 1fr;
  }
  .rental-analysis__filters > .v-btn {
    grid-column: 1 / -1;
  }
  .rental-analysis__range-head,
  .rental-analysis__range-list li {
    grid-template-columns: 130px minmax(80px, 1fr) 95px 70px;
    gap: 12px;
  }
  .rental-analysis__chart-grid,
  .rental-analysis__income {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 599px) {
  .rental-analysis__market {
    margin-top: 32px;
  }
  .rental-analysis__filters {
    padding: 16px;
    gap: 14px 12px;
  }
  .rental-analysis__filters label {
    font-size: 0.78rem;
  }
  .rental-analysis__filters select {
    padding-inline: 8px;
  }
  .rental-analysis__measures {
    grid-template-columns: 1fr;
    gap: 22px;
  }
  .rental-analysis__measures > div {
    display: grid;
    grid-template-columns: 1.15fr 1fr;
    gap: 4px 12px;
    align-items: baseline;
  }
  .rental-analysis__measures dd {
    margin-top: 0;
    text-align: right;
    font-size: 1.25rem;
  }
  .rental-analysis__measures p {
    grid-column: 1 / -1;
    margin-top: 2px;
  }
  .rental-analysis__section-head {
    flex-direction: column;
    gap: 16px;
  }
  .rental-analysis__sort {
    width: 100%;
  }
  .rental-analysis__range-head {
    display: none;
  }
  .rental-analysis__range-list {
    margin-top: 20px !important;
  }
  .rental-analysis__range-list li {
    grid-template-columns: 1fr auto;
    gap: 2px 16px;
    padding: 12px 0;
  }
  .rental-analysis__range-cell {
    grid-row: 2;
    grid-column: 1;
  }
  .rental-analysis__zone-price {
    grid-row: 1;
    grid-column: 2;
  }
  .rental-analysis__zone-count {
    grid-row: 2;
    grid-column: 2;
    text-align: right;
  }
  .rental-analysis__income {
    padding: 20px 16px;
    gap: 24px;
  }
  .rental-analysis__income-fields {
    grid-template-columns: 1fr;
  }
  .rental-analysis__method-columns {
    grid-template-columns: 1fr;
    gap: 0;
  }
  .rental-analysis__estimator,
  .rental-analysis__method {
    margin-top: 40px;
  }
}
</style>
