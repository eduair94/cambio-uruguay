<!--
THESIS: Find asking prices below similar homes and inspect the evidence behind each result.
OWN-WORLD: Extend the site's navy/paper surfaces, Open Sans, blue actions and rental sidebar.
FIRST VIEWPORT: Operation, filters, actual asking price and comparison evidence.
MOBILE: Persistent filter access, a side drawer, and comparables expanded inside each result.
-->
<template>
  <VContainer class="opportunities">
    <VBreadcrumbs :items="breadcrumbs" density="compact" class="px-0 py-1" />
    <header class="opportunities__header">
      <h1>{{ t('title') }}</h1>
      <p>{{ t(smAndDown ? 'introCompact' : 'intro') }}</p>
      <div class="opportunities__intro-links">
        <a href="#opportunity-method">{{ t('methodShort') }}</a
        ><a href="#opportunity-coverage">{{ t('coverageShort') }}</a>
        <VBtn
          v-if="smAndDown"
          icon="mdi-share-variant-outline"
          variant="text"
          :aria-label="t('share')"
          class="opportunities__share-mobile"
          @click="shareSearch"
        />
      </div>
    </header>
    <div class="opportunities__workspace">
      <aside class="opportunities__sidebar" :aria-label="t('filters')">
        <OpportunityFilters
          v-model:open="filtersOpen"
          :query="query"
          :departments="data?.facets.departments ?? []"
          :neighborhoods="neighborhoodOverride ?? data?.facets.neighborhoods ?? []"
          :mobile="smAndDown"
          :pending="pending"
          @search="applyFilters"
          @clear="clearFilters"
          @department="loadNeighborhoods"
          @closed="restoreFilterContext"
        />
      </aside>
      <div class="opportunities__content">
        <div class="opportunities__controls">
          <VBtnToggle
            :model-value="query.operation"
            mandatory
            divided
            variant="outlined"
            color="link"
            :aria-label="t('operation')"
            @update:model-value="changeOperation"
            ><VBtn value="rent">{{ t('rent') }}</VBtn
            ><VBtn value="sale">{{ t('sale') }}</VBtn></VBtnToggle
          >
          <VBtn
            v-if="smAndDown"
            color="primary"
            prepend-icon="mdi-tune-variant"
            aria-haspopup="dialog"
            aria-controls="opportunity-filter-dialog"
            :aria-expanded="filtersOpen"
            data-testid="opportunity-filter-trigger"
            @click="openFilters"
            >{{ t('filters')
            }}<span v-if="filterChips.length"> ({{ filterChips.length }})</span></VBtn
          >
          <VBtn
            v-if="!smAndDown"
            variant="text"
            prepend-icon="mdi-share-variant-outline"
            class="opportunities__share"
            @click="shareSearch"
            >{{ t('share') }}</VBtn
          >
        </div>
        <div
          v-if="filterChips.length"
          class="opportunities__chips"
          :aria-label="t('activeFilters')"
        >
          <VChip
            v-for="chip in filterChips"
            :key="chip.key"
            closable
            variant="tonal"
            color="link"
            :close-label="t('remove', { name: chip.label })"
            @click:close="removeFilter(chip.key)"
            >{{ chip.label }}</VChip
          ><VBtn variant="text" @click="clearFilters">{{ t('clearFilters') }}</VBtn>
        </div>
        <section
          id="opportunity-results"
          ref="resultsElement"
          class="opportunities__results"
          tabindex="-1"
          :aria-busy="pending"
        >
          <div class="opportunities__toolbar">
            <div role="status" aria-live="polite">
              <h2>
                {{
                  pending
                    ? t('searching')
                    : error
                      ? t('resultsUnavailable')
                      : data?.total === 1
                        ? t('oneResult')
                        : t('results', { n: number(data?.total ?? 0) })
                }}
              </h2>
              <p v-if="data && !error">{{ t('updated', { date: date(data.generatedAt) }) }}</p>
            </div>
            <VSelect
              :model-value="query.sort"
              :items="sortItems"
              :label="t('sort')"
              variant="outlined"
              density="comfortable"
              hide-details
              class="opportunities__sort"
              @update:model-value="changeSort"
            />
          </div>
          <VProgressLinear v-if="pending" indeterminate color="primary" class="mb-4" />
          <VAlert
            v-if="error"
            type="warning"
            variant="tonal"
            role="alert"
            class="opportunities__notice"
            ><h3>{{ unavailable ? t('unavailable') : t('error') }}</h3>
            <p v-if="unavailable">{{ t('unavailableHint') }}</p>
            <div class="opportunities__notice-actions">
              <VBtn variant="tonal" @click="refresh()">{{ t('retry') }}</VBtn
              ><VBtn :to="localePath('/alquileres-uruguay')" variant="text">{{
                t('rentals')
              }}</VBtn>
            </div></VAlert
          >
          <VAlert v-else-if="data?.stale" type="warning" variant="tonal" class="mb-4">{{
            t('stale')
          }}</VAlert>
          <div v-if="data && !error && !pending && !items.length" class="opportunities__empty">
            <VIcon icon="mdi-home-search-outline" size="42" aria-hidden="true" />
            <h3>{{ t(emptyMessages.title) }}</h3>
            <p>{{ t(emptyMessages.hint) }}</p>
            <VBtn v-if="filterChips.length" variant="tonal" color="link" @click="clearFilters">{{
              t('clearFilters')
            }}</VBtn>
            <div v-else class="opportunities__empty-actions">
              <VBtn href="#opportunity-method" variant="tonal" color="link">{{
                t('methodShort')
              }}</VBtn
              ><VBtn :to="localePath('/alquileres-uruguay')" variant="text">{{
                t('rentals')
              }}</VBtn>
            </div>
          </div>
          <div v-if="!error" class="opportunities__list">
            <OpportunityCard
              v-for="item in items"
              :key="item.subject.id"
              :item="item"
              :signal="query.signal"
            />
          </div>
          <nav
            v-if="!error && (data?.pages ?? 0) > 1"
            class="opportunities__pagination"
            :aria-label="t('page', { n: data?.page ?? 1, total: data?.pages ?? 1 })"
          >
            <VBtn
              :disabled="pending || (data?.page ?? 1) <= 1"
              variant="outlined"
              @click="changePage((data?.page ?? 1) - 1)"
              >{{ t('previous') }}</VBtn
            ><span>{{ t('page', { n: data?.page ?? 1, total: data?.pages ?? 1 }) }}</span
            ><VBtn
              :disabled="pending || (data?.page ?? 1) >= (data?.pages ?? 1)"
              variant="outlined"
              @click="changePage((data?.page ?? 1) + 1)"
              >{{ t('next') }}</VBtn
            >
          </nav>
        </section>
        <section id="opportunity-method" class="opportunities__method">
          <h2>{{ t('method') }}</h2>
          <p>{{ t('methodIntro') }}</p>
          <ul>
            <li>{{ t('comparableHint') }}</li>
            <li>{{ t('methodSample') }}</li>
            <li>{{ t('methodDiscount') }}</li>
            <li>{{ t('methodExploratoryTotal') }}</li>
            <li>{{ t('methodExploratoryArea') }}</li>
            <li>{{ t('methodRobustness') }}</li>
            <li>{{ t('methodCosts') }}</li>
          </ul>
          <p>{{ t('methodLimits') }}</p>
        </section>
        <section id="opportunity-coverage" class="opportunities__coverage">
          <h2>{{ t('coverage') }}</h2>
          <p>{{ t('coverageHint') }}</p>
          <template v-if="data && !error"
            ><p>
              {{ t('analyzed', { n: number(data.stats.analyzed) }) }} ·
              {{ t('eligible', { n: number(data.stats.eligible) }) }}
            </p>
            <ul>
              <li v-for="source in data.coverage" :key="source.source">
                <strong>{{ sourceName(source.source) }} · {{ number(source.observed) }}</strong
                ><span
                  >{{ t(source.complete ? 'completeRead' : 'partialRead') }} ·
                  {{ t('sourceRead', { date: date(source.lastRead) }) }}</span
                >
              </li>
            </ul>
            <p>{{ t('sourceRead', { date: date(data.sourceReadAt) }) }}</p>
            <p v-if="query.operation === 'rent'">
              {{ t('conversion', { rate: opportunityNumber(data.usdUyu, locale, 2) }) }}
            </p></template
          >
        </section>
      </div>
    </div>
    <VSnackbar v-model="showSnackbar" :timeout="5000">{{ snackbar }}</VSnackbar>
  </VContainer>
</template>

<script setup lang="ts">
import { useDisplay } from 'vuetify'
import OpportunityFilters from '~/components/property-opportunities/Filters.vue'
import OpportunityCard from '~/components/property-opportunities/OpportunityCard.vue'
import { propertyOpportunityMessages } from '~/utils/propertyOpportunityMessages'
import {
  normalizeOpportunityQuery,
  type OpportunityQuery,
  type PropertyOpportunitiesResponse,
} from '~/utils/propertyOpportunityQuery'
import {
  opportunityDate,
  opportunityMoney,
  opportunityNumber,
  opportunitySourceLabels,
} from '~/utils/propertyOpportunityPresentation'
import type { OpportunitySource } from '~/utils/propertyOpportunities'

const { t, locale } = useI18n({ useScope: 'local', messages: propertyOpportunityMessages })
const localePath = useLocalePath()
const route = useRoute()
const router = useRouter()
const { smAndDown } = useDisplay()
const query = computed(() => normalizeOpportunityQuery(route.query))
const requestKey = computed(() => JSON.stringify(query.value))
const { data, pending, error, refresh } = await useAsyncData<PropertyOpportunitiesResponse>(
  'property-opportunities',
  () => $fetch('/api/property-opportunities', { query: query.value }),
  { watch: [requestKey] }
)
const items = computed(() =>
  !pending.value && data.value?.operation === query.value.operation ? data.value.items : []
)
const unavailable = computed(() => error.value?.statusCode === 503)
const number = (value: number) => opportunityNumber(value, locale.value)
const date = (value: string) => opportunityDate(value, locale.value) || t('unknownDate')
const sourceName = (value: OpportunitySource) => opportunitySourceLabels[value]
const sortItems = computed(() =>
  ['evidence', 'discount', 'price', 'recent'].map(value => ({
    title: t(
      value === 'discount'
        ? query.value.signal === 'price_per_m2'
          ? 'discountPerArea'
          : 'discountTotal'
        : value
    ),
    value,
  }))
)
const breadcrumbs = computed(() => [
  { title: t('home'), to: localePath('/') },
  { title: t('breadcrumb'), disabled: true },
])
const resultsElement = ref<HTMLElement | null>(null)
const filtersOpen = ref(false)
const neighborhoodOverride = ref<string[] | null>(null)
let facetRequest = 0
let filterActivator: HTMLElement | null = null
let filterReturnScroll = 0
let filtersApplied = false
type FilterKey =
  | 'department'
  | 'neighborhood'
  | 'type'
  | 'bedrooms'
  | 'maxPrice'
  | 'confidence'
  | 'signal'
  | 'evidence'
const filterChips = computed(() => {
  const q = query.value
  const chips: { key: FilterKey; label: string }[] = []
  if (q.department) chips.push({ key: 'department', label: q.department })
  if (q.neighborhood) chips.push({ key: 'neighborhood', label: q.neighborhood })
  if (q.type !== 'all')
    chips.push({ key: 'type', label: t(q.type === 'casa' ? 'house' : 'apartment') })
  if (q.bedrooms !== '')
    chips.push({ key: 'bedrooms', label: q.bedrooms ? t('beds', { n: q.bedrooms }) : t('studio') })
  if (q.maxPrice)
    chips.push({
      key: 'maxPrice',
      label: `≤ ${opportunityMoney({ amount: q.maxPrice, currency: q.operation === 'rent' ? 'UYU' : 'USD' }, locale.value)}`,
    })
  if (q.confidence !== 'all') chips.push({ key: 'confidence', label: t(q.confidence) })
  if (q.signal !== 'all') chips.push({ key: 'signal', label: t(q.signal) })
  if (q.evidence !== 'all') chips.push({ key: 'evidence', label: t(q.evidence) })
  return chips
})
const emptyMessages = computed(() => {
  if (filterChips.value.length) return { title: 'empty', hint: 'emptyHint' }
  return data.value?.stats.analyzed === 0
    ? { title: 'emptyEvidence', hint: 'emptyEvidenceHint' }
    : { title: 'emptyCriteria', hint: 'emptyCriteriaHint' }
})
async function updateQuery(next: OpportunityQuery) {
  const normalized = normalizeOpportunityQuery(next as unknown as Record<string, unknown>)
  const params: Record<string, string> = { operation: normalized.operation }
  for (const key of [
    'department',
    'neighborhood',
    'type',
    'bedrooms',
    'maxPrice',
    'confidence',
    'signal',
    'evidence',
    'sort',
    'page',
  ] as const) {
    const value = normalized[key]
    if (
      value !== '' &&
      value !== null &&
      value !== 'all' &&
      value !== 'evidence' &&
      !(key === 'page' && value === 1)
    )
      params[key] = String(value)
  }
  await router.push({ path: route.path, query: params })
}
async function focusResults() {
  await nextTick()
  resultsElement.value?.scrollIntoView({ block: 'start', behavior: 'instant' })
  resultsElement.value?.focus({ preventScroll: true })
}
function openFilters(event: MouseEvent) {
  filterActivator = event.currentTarget as HTMLElement
  filterReturnScroll = window.scrollY
  filtersApplied = false
  filtersOpen.value = true
}
async function restoreFilterContext() {
  neighborhoodOverride.value = null
  facetRequest++
  await nextTick()
  if (filtersApplied) await focusResults()
  else if (filterActivator?.isConnected) {
    filterActivator.focus({ preventScroll: true })
    window.scrollTo({ top: filterReturnScroll, behavior: 'instant' })
  }
}
async function applyFilters(next: OpportunityQuery) {
  filtersApplied = true
  await updateQuery(next)
  filtersOpen.value = false
  if (!smAndDown.value) await focusResults()
}
async function clearFilters() {
  await applyFilters(normalizeOpportunityQuery({ operation: query.value.operation }))
}
async function removeFilter(key: FilterKey) {
  const defaults = normalizeOpportunityQuery({})
  await applyFilters({
    ...query.value,
    [key]: defaults[key],
    ...(key === 'department' ? { neighborhood: '' } : {}),
    page: 1,
  })
}
async function changeOperation(operation: unknown) {
  if (operation !== 'sale' && operation !== 'rent') return
  neighborhoodOverride.value = null
  await updateQuery({ ...query.value, operation, maxPrice: null, page: 1 })
}
async function changeSort(sort: OpportunityQuery['sort']) {
  await updateQuery({ ...query.value, sort, page: 1 })
}
async function changePage(page: number) {
  await updateQuery({ ...query.value, page })
  await focusResults()
}
async function loadNeighborhoods(department: string) {
  const id = ++facetRequest
  if (department === query.value.department) {
    neighborhoodOverride.value = null
    return
  }
  neighborhoodOverride.value = []
  try {
    const result = await $fetch<PropertyOpportunitiesResponse>('/api/property-opportunities', {
      query: { operation: query.value.operation, department, perPage: 1 },
    })
    if (id === facetRequest) neighborhoodOverride.value = result.facets.neighborhoods
  } catch {
    if (id === facetRequest) neighborhoodOverride.value = []
  }
}
watch(smAndDown, mobile => {
  if (!mobile) filtersOpen.value = false
})
const showSnackbar = ref(false)
const snackbar = ref('')
async function shareSearch() {
  try {
    if (navigator.share) await navigator.share({ title: t('title'), url: window.location.href })
    else {
      await navigator.clipboard.writeText(window.location.href)
      snackbar.value = t('copied')
      showSnackbar.value = true
    }
  } catch (caught) {
    if ((caught as Error)?.name === 'AbortError') return
    snackbar.value = t('shareError')
    showSnackbar.value = true
  }
}
const canonicalUrl = computed(
  () => `https://cambio-uruguay.com${localePath('/oportunidades-inmobiliarias-uruguay')}`
)
defineOgImageComponent('Cambio', {
  title: () => t('title'),
  subtitle: () => t('intro'),
  tag: 'URUGUAY',
})
useSeoMeta({
  title: () => t('title'),
  description: () => t('intro'),
  ogTitle: () => t('title'),
  ogDescription: () => t('intro'),
  ogType: 'website',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
})
useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl.value }],
  meta: Object.keys(route.query).length ? [{ name: 'robots', content: 'noindex, follow' }] : [],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'CollectionPage',
            '@id': `${canonicalUrl.value}#page`,
            url: canonicalUrl.value,
            name: t('title'),
            description: t('intro'),
            inLanguage: locale.value,
            isPartOf: {
              '@type': 'WebSite',
              name: 'Cambio Uruguay',
              url: 'https://cambio-uruguay.com',
            },
            breadcrumb: { '@id': `${canonicalUrl.value}#breadcrumbs` },
          },
          {
            '@type': 'BreadcrumbList',
            '@id': `${canonicalUrl.value}#breadcrumbs`,
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: t('home'),
                item: `https://cambio-uruguay.com${localePath('/')}`,
              },
              { '@type': 'ListItem', position: 2, name: t('breadcrumb'), item: canonicalUrl.value },
            ],
          },
        ],
      }).replace(/</g, '\\u003c'),
    },
  ],
}))
</script>

<style scoped>
.opportunities {
  max-width: 1280px;
  padding-bottom: 56px;
}
.opportunities__header {
  margin: 16px 0 26px;
  max-width: 880px;
}
.opportunities h1 {
  font-size: clamp(1.6rem, 3.5vw, 2.25rem);
  line-height: 1.2;
  margin: 0 0 12px;
  text-wrap: balance;
}
.opportunities__header p {
  margin: 0;
  font-size: 1rem;
  line-height: 1.7;
  max-width: 70ch;
}
.opportunities__intro-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0 20px;
  margin-top: 8px;
}
.opportunities a {
  color: rgb(var(--v-theme-link));
}
.opportunities__intro-links a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  font-size: 0.85rem;
}
.opportunities__share-mobile {
  margin-left: auto;
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
}
.opportunities__workspace {
  display: grid;
  grid-template-columns: 282px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}
.opportunities__sidebar {
  position: sticky;
  top: 130px;
  min-width: 0;
}
.opportunities__content {
  min-width: 0;
}
.opportunities__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
  padding-bottom: 16px;
}
.opportunities__controls :deep(.v-btn) {
  min-height: 44px;
}
.opportunities__share {
  margin-left: auto;
}
.opportunities__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 0 18px;
}
.opportunities__chips :deep(.v-chip) {
  min-height: 44px;
  height: auto;
  white-space: normal;
}
.opportunities__chips :deep(.v-chip__close) {
  min-width: 44px;
  min-height: 44px;
  justify-content: center;
}
.opportunities__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 20px;
}
.opportunities h2 {
  font-size: 1.18rem;
  margin: 0;
  line-height: 1.5;
}
.opportunities__toolbar p {
  margin: 3px 0 0;
  font-size: 0.76rem;
  color: rgba(var(--v-theme-on-surface), 0.8);
}
.opportunities__sort {
  flex: 0 1 225px;
}
.opportunities__sort :deep(input),
.opportunities__sort :deep(.v-select__selection) {
  font-size: 16px;
}
.opportunities__list {
  display: grid;
  gap: 20px;
}
.opportunities__results,
.opportunities__method,
.opportunities__coverage {
  scroll-margin-top: 155px;
}
.opportunities__results:focus {
  outline: none;
}
.opportunities__empty {
  padding: 40px 20px;
  text-align: center;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
}
.opportunities__empty h3 {
  font-size: 1.1rem;
  margin: 14px 0 8px;
}
.opportunities__empty p {
  max-width: 58ch;
  margin: 0 auto 20px;
  line-height: 1.7;
}
.opportunities__empty-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}
.opportunities__empty-actions :deep(.v-btn) {
  min-height: 44px;
}
.opportunities__notice {
  margin-bottom: 20px;
}
.opportunities__notice h3 {
  margin: 0;
  font-size: 1rem;
}
.opportunities__notice p {
  margin: 10px 0 0;
  line-height: 1.6;
}
.opportunities__notice-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 16px;
}
.opportunities__notice-actions :deep(.v-btn) {
  min-height: 44px;
}
.opportunities__pagination {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin: 24px 0;
}
.opportunities__pagination span {
  text-align: center;
  font-size: 0.82rem;
}
.opportunities__pagination :deep(.v-btn) {
  min-height: 44px;
}
.opportunities__method,
.opportunities__coverage {
  margin-top: 42px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding-top: 24px;
}
.opportunities__method p,
.opportunities__coverage p,
.opportunities__method ul {
  font-size: 0.9rem;
  line-height: 1.75;
  margin: 12px 0 0;
  max-width: 72ch;
}
.opportunities__method ul {
  padding-left: 20px;
}
.opportunities__method li + li {
  margin-top: 8px;
}
.opportunities__coverage ul {
  padding: 0;
  list-style: none;
  margin: 16px 0 0;
}
.opportunities__coverage li {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 5px 18px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  font-size: 0.84rem;
}
.opportunities__coverage li span {
  font-size: 0.76rem;
  color: rgba(var(--v-theme-on-surface), 0.8);
}
@media (max-width: 959px) {
  .opportunities__workspace {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }
  .opportunities__sidebar {
    position: static;
  }
  .opportunities__sidebar > :not(.v-overlay) {
    display: none;
  }
  .opportunities__controls {
    position: sticky;
    top: 64px;
    z-index: 8;
    padding: 10px 0;
    margin-bottom: 16px;
    background: rgb(var(--v-theme-background));
    border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }
  .opportunities__share {
    margin-left: 0;
  }
  .opportunities__results {
    scroll-margin-top: 150px;
  }
}
@media (max-width: 599px) {
  .opportunities {
    padding: 12px;
  }
  .opportunities__header {
    margin: 8px 0 12px;
  }
  .opportunities h1 {
    font-size: 1.35rem;
    line-height: 1.3;
    margin-bottom: 8px;
  }
  .opportunities__header p {
    font-size: 0.875rem;
    line-height: 1.5;
  }
  .opportunities__intro-links {
    gap: 0 14px;
    margin-top: 4px;
    align-items: center;
  }
  .opportunities__toolbar {
    align-items: stretch;
    flex-direction: column;
  }
  .opportunities__sort {
    flex-basis: auto;
  }
  .opportunities__controls {
    gap: 8px;
  }
  .opportunities__controls :deep(.v-btn) {
    padding-inline: 12px;
    font-size: 0.8rem;
  }
  .opportunities__pagination {
    gap: 6px;
  }
  .opportunities__pagination :deep(.v-btn) {
    padding-inline: 10px;
  }
}
</style>
