<!-- Operate: extend the established rental search, navy/paper surfaces and Open Sans.
     The hierarchy starts with search, asking price and own advert evidence. Desktop uses
     a sidebar; mobile keeps filter access visible and applies drafts from a side drawer. -->
<template>
  <VContainer class="sales-directory">
    <VBreadcrumbs
      :items="[
        { title: t('home'), to: localePath('/') },
        { title: t('sales'), disabled: true },
      ]"
      density="compact"
      class="px-0 py-1"
    />
    <header class="sales-directory__header">
      <h1>{{ t('title') }}</h1>
      <p>{{ t(smAndDown ? 'introShort' : 'intro') }}</p>
      <nav>
        <NuxtLink :to="localePath('/barrios-alquileres-uruguay')">{{
          globalT('nav.rentalZones')
        }}</NuxtLink>
        <NuxtLink :to="localePath('/alquileres-uruguay')">{{ t('rentals') }}</NuxtLink>
        <NuxtLink
          :to="{
            path: localePath('/oportunidades-inmobiliarias-uruguay'),
            query: { operation: 'sale' },
          }"
        >
          {{ t('opportunities') }}
        </NuxtLink>
        <NuxtLink :to="localePath('/comprar-o-alquilar-uruguay')">{{ t('buyOrRent') }}</NuxtLink>
        <a href="#sales-coverage">{{ t('coverage') }}</a>
      </nav>
    </header>
    <div class="sales-directory__workspace">
      <aside class="sales-directory__sidebar" :aria-label="t('filters')">
        <PropertySalesSearchFilters
          v-model:open="filtersOpen"
          :query="query"
          :facets="facetOverride || data?.facets || emptyFacets"
          :pending="pending"
          :mobile="smAndDown"
          @search="applyFilters"
          @location="loadFacets"
          @closed="restoreFilterContext"
        />
      </aside>
      <div class="sales-directory__content">
        <div class="sales-directory__toolbar">
          <VBtn
            v-if="smAndDown"
            color="link"
            variant="tonal"
            prepend-icon="mdi-tune-variant"
            aria-haspopup="dialog"
            aria-controls="sale-filter-dialog"
            :aria-expanded="filtersOpen"
            data-testid="sale-filter-trigger"
            @click="openFilters"
          >
            {{ t('filters') }}
            <span v-if="chips.length">({{ chips.length }})</span>
          </VBtn>
          <VBtnToggle
            v-if="!smAndDown"
            :model-value="query.view"
            mandatory
            divided
            variant="outlined"
            :aria-label="t('view')"
            @update:model-value="setView"
          >
            <VBtn value="lista" class="sales-directory__view-button" :aria-label="t('list')">
              <VIcon icon="mdi-view-list-outline" />
              <span class="sales-directory__view-label">{{ t('list') }}</span>
            </VBtn>
            <VBtn value="mapa" class="sales-directory__view-button" :aria-label="t('map')">
              <VIcon icon="mdi-map-outline" />
              <span class="sales-directory__view-label">{{ t('map') }}</span>
            </VBtn>
          </VBtnToggle>
          <VBtn
            v-else
            :icon="query.view === 'lista' ? 'mdi-map-outline' : 'mdi-view-list-outline'"
            variant="outlined"
            :aria-label="t(query.view === 'lista' ? 'map' : 'list')"
            data-testid="sale-view-trigger"
            @click="setView(query.view === 'lista' ? 'mapa' : 'lista')"
          />
          <VBtn
            :variant="savedOnly ? 'tonal' : 'text'"
            :color="savedOnly ? 'primary' : undefined"
            :prepend-icon="smAndDown ? undefined : 'mdi-heart-outline'"
            :aria-pressed="savedOnly"
            data-testid="sale-saved-trigger"
            class="sales-directory__saved-button"
            :aria-label="`${t('saved')} (${favorites.keys.value.length})`"
            @click="toggleSaved"
          >
            <VIcon v-if="smAndDown" icon="mdi-heart-outline" />
            <span v-if="!smAndDown" class="sales-directory__saved-label">{{ t('saved') }}</span>
            <span v-if="!smAndDown && favorites.ready.value"
              >({{ favorites.keys.value.length }})</span
            >
          </VBtn>
          <VBtn
            icon="mdi-share-variant-outline"
            variant="text"
            :aria-label="t('share')"
            data-testid="sale-share-trigger"
            @click="shareSearch"
          />
        </div>
        <div v-if="chips.length" class="sales-directory__chips">
          <VChip
            v-for="chip in chips"
            :key="chip.key"
            closable
            size="small"
            @click:close="removeFilter(chip.key)"
          >
            {{ chip.label }}
          </VChip>
          <VBtn size="small" variant="text" @click="clearFilters">{{ t('clear') }}</VBtn>
        </div>
        <div class="sales-directory__result-head">
          <h2 ref="resultsHeading" tabindex="-1" aria-live="polite">
            {{
              savedEmpty
                ? t('savedEmpty')
                : pending
                  ? t('loading')
                  : error
                    ? t('error')
                    : t('results', { n: (data?.total || 0).toLocaleString(locale) })
            }}
          </h2>
          <VSelect
            :model-value="query.sort"
            :items="sortItems"
            :label="t('sort')"
            variant="outlined"
            density="compact"
            hide-details
            class="sales-directory__sort"
            @update:model-value="setSort"
          />
        </div>
        <p v-if="savedOnly" class="sales-directory__notice">{{ t('savedUnavailable') }}</p>
        <div v-if="savedOnly && !savedEmpty" class="sales-directory__compare">
          <p>{{ t('compareHint') }}</p>
          <VBtn
            prepend-icon="mdi-compare-horizontal"
            variant="tonal"
            :disabled="compared.length < 2 || pending"
            @click="compareOpen = true"
          >
            {{ t('compare') }} ({{ compared.length }}/4)
          </VBtn>
        </div>
        <div :aria-busy="pending" class="sales-directory__results">
          <div v-if="savedEmpty" class="sales-directory__empty">
            <VIcon icon="mdi-heart-outline" size="42" />
            <p>{{ t('savedHint') }}</p>
            <VBtn color="primary" @click="toggleSaved">{{ t('allListings') }}</VBtn>
          </div>
          <VAlert
            v-else-if="error"
            type="error"
            variant="tonal"
            class="sale-request-status-message"
          >
            {{ t('error') }}
            <VBtn variant="text" @click="refresh()">{{ t('retry') }}</VBtn>
          </VAlert>
          <div
            v-else-if="pending"
            class="sales-directory__grid"
            role="status"
            :aria-label="t('loading')"
          >
            <VSkeletonLoader v-for="n in 4" :key="n" type="image, article" />
          </div>
          <PropertySalesMapBrowser
            v-else-if="query.view === 'mapa'"
            :query="effectiveQuery"
            @list="setView('lista')"
            @zone="selectZone"
          />
          <div v-else-if="data?.items.length" class="sales-directory__grid">
            <PropertySalesListingCard
              v-for="item in data.items"
              :key="item.key"
              :property="item"
              :area-basis="query.areaBasis"
              :compareable="savedOnly"
              :compared="compared.includes(item.key)"
              @compare="toggleCompare"
              @preview="openPreview"
            />
          </div>
          <div v-else class="sales-directory__empty">
            <VIcon icon="mdi-home-search-outline" size="42" />
            <h3>{{ t('empty') }}</h3>
            <p>{{ t('emptyHint') }}</p>
            <VBtn color="primary" @click="clearFilters">{{ t('clear') }}</VBtn>
          </div>
          <PropertyPhotoLightbox
            v-model="previewOpen"
            :title="preview?.title || ''"
            :photos="preview?.photos || []"
            :source="preview?.source || null"
            :detail-href="preview?.detailHref || ''"
          />
        </div>
        <nav
          v-if="!savedEmpty && !pending && query.view === 'lista' && (data?.pages || 0) > 1"
          class="sales-directory__pagination"
          :aria-label="t('page', { page: data?.page, pages: data?.pages })"
        >
          <VBtn
            :disabled="query.page <= 1"
            variant="outlined"
            prepend-icon="mdi-chevron-left"
            @click="goPage(query.page - 1)"
          >
            {{ t('previous') }}
          </VBtn>
          <span>{{ t('page', { page: data?.page, pages: data?.pages }) }}</span>
          <VBtn
            :disabled="query.page >= (data?.pages || 1)"
            variant="outlined"
            append-icon="mdi-chevron-right"
            @click="goPage(query.page + 1)"
          >
            {{ t('next') }}
          </VBtn>
        </nav>
        <section id="sales-coverage" class="sales-directory__coverage">
          <h2>{{ t('coverage') }}</h2>
          <p>{{ t('coverageText') }}</p>
          <p v-if="data?.coverage">
            {{ t('coverageCount', { n: data.coverage.listings.toLocaleString(locale) }) }}
          </p>
          <ul v-if="data?.coverage">
            <li v-for="source in data.coverage.sources" :key="source.key">
              <strong>
                {{ propertySaleSourceName(source.key) }} ·
                {{ source.listings.toLocaleString(locale) }}
              </strong>
              <time
                v-if="source.lastSeen"
                class="sales-directory__source-date"
                :datetime="source.lastSeen"
              >
                {{ t('read') }}: {{ date(source.lastSeen) }}
              </time>
            </li>
          </ul>
          <p>{{ t('coverageFresh') }}</p>
          <p>{{ t('disclaimer') }}</p>
        </section>
      </div>
    </div>
    <PropertySalesComparison v-model:open="compareOpen" :items="compareItems" />
    <VSnackbar v-model="toastOpen" timeout="4000">{{ toast }}</VSnackbar>
  </VContainer>
</template>
<script setup lang="ts">
import { useDisplay } from 'vuetify'
import {
  normalizePropertySalesQuery,
  propertySalesQueryToParams,
  propertySalesFiltered,
  propertySalePath,
  type PropertySalesQuery,
  type PropertySalesResponse,
} from '~/utils/propertySales'
import { propertySaleSourceName, propertySalesMessages } from '~/utils/propertySalesMessages'
import type { PropertyPreviewRequest } from '~/utils/photoViewer'
const { t, locale } = useI18n({ useScope: 'local', messages: propertySalesMessages })
const { t: globalT } = useI18n({ useScope: 'global' })
// Un solo visor para toda la grilla: la tarjeta sólo dice qué foto tocaron.
const preview = shallowRef<PropertyPreviewRequest | null>(null)
const previewOpen = ref(false)
function openPreview(request: PropertyPreviewRequest) {
  preview.value = request
  previewOpen.value = true
}
const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()
const { smAndDown } = useDisplay()
const favorites = usePropertySaleFavorites()
const savedOnly = useState('property-sales-saved-view', () => false)
const compared = ref<string[]>([])
const compareOpen = ref(false)
const filtersOpen = ref(false)
const resultsHeading = ref<HTMLElement | null>(null)
const facetOverride = ref<PropertySalesResponse['facets'] | null>(null)
const emptyFacets: PropertySalesResponse['facets'] = {
  departments: [],
  localities: [],
  neighborhoods: [],
  types: [],
  sellers: [],
  sources: [],
}
const query = computed(() => normalizePropertySalesQuery(route.query))
const agencyName = useAgencySelection(() => query.value.agency)
const savedEmpty = computed(
  () => savedOnly.value && (!favorites.ready.value || favorites.keys.value.length === 0)
)
const effectiveQuery = computed(() =>
  savedOnly.value
    ? { ...query.value, keys: favorites.keys.value, perPage: 48, page: 1 }
    : query.value
)
const params = computed(() => propertySalesQueryToParams(effectiveQuery.value))
const { data, pending, error, refresh } = await useAsyncData(
  'property-sales-directory',
  () =>
    savedEmpty.value
      ? Promise.resolve(null)
      : $fetch<PropertySalesResponse>('/api/property-sales', { query: params.value }),
  { watch: [params, savedEmpty] }
)
const compareItems = computed(() =>
  (data.value?.items || []).filter(item => compared.value.includes(item.key))
)
const sortItems = computed(() => [
  { title: t('recentSort'), value: 'recent' },
  { title: t('priceAsc'), value: 'price_asc' },
  { title: t('priceDesc'), value: 'price_desc' },
  { title: t('areaDesc'), value: 'area_desc' },
])
const filterLabels: Record<string, string> = {
  q: 'keywords',
  department: 'department',
  locality: 'locality',
  neighborhood: 'neighborhood',
  type: 'type',
  bedrooms: 'bedrooms',
  bathrooms: 'bathrooms',
  minPrice: 'minPrice',
  maxPrice: 'maxPrice',
  minArea: 'minArea',
  maxArea: 'maxArea',
  parking: 'parking',
  furnished: 'furnished',
  photos: 'photos',
  amenity: 'amenity',
  seller: 'seller',
  agency: 'selectedAgency',
  owner: 'owner',
  recent: 'recent',
  source: 'source',
}
const chips = computed(() =>
  Object.entries(propertySalesQueryToParams(query.value))
    .filter(([key]) => key in filterLabels)
    .map(([key, value]) => ({
      key,
      label:
        key === 'agency' && agencyName.value
          ? agencyName.value
          : `${t(filterLabels[key]!)}${['agency', 'owner', 'parking', 'furnished', 'photos'].includes(key) ? '' : `: ${['type', 'amenity'].includes(key) ? t(value) : key === 'source' ? propertySaleSourceName(value) : value}`}`,
    }))
)
const toast = ref('')
const toastOpen = ref(false)
let filterTrigger: HTMLElement | null = null
let filterScroll = 0
let applied = false
let facetController: AbortController | null = null
function announce(message: string) {
  toast.value = message
  toastOpen.value = true
}
function navigate(next: PropertySalesQuery) {
  return router.push({ path: route.path, query: propertySalesQueryToParams(next) })
}
function openFilters(event: MouseEvent) {
  facetController?.abort()
  facetOverride.value = null
  filterTrigger = event.currentTarget as HTMLElement
  filterScroll = window.scrollY
  applied = false
  filtersOpen.value = true
}
function restoreFilterContext() {
  facetController?.abort()
  facetOverride.value = null
  if (applied) {
    resultsHeading.value?.focus({ preventScroll: true })
    resultsHeading.value?.scrollIntoView({ block: 'start' })
  } else {
    filterTrigger?.focus({ preventScroll: true })
    window.scrollTo({ top: filterScroll, behavior: 'instant' })
  }
}
async function applyFilters(next: PropertySalesQuery) {
  facetController?.abort()
  applied = true
  facetOverride.value = null
  await navigate(next)
  filtersOpen.value = false
  if (!smAndDown.value) resultsHeading.value?.scrollIntoView({ block: 'start' })
}
function clearFilters() {
  facetController?.abort()
  facetOverride.value = null
  return navigate(normalizePropertySalesQuery({ view: query.value.view }))
}
function removeFilter(key: string) {
  const next = {
    ...query.value,
    [key]: normalizePropertySalesQuery({})[key as keyof PropertySalesQuery],
    page: 1,
  }
  if (key === 'department') {
    next.locality = ''
    next.neighborhood = ''
  }
  if (key === 'locality') next.neighborhood = ''
  return navigate(next)
}
async function setView(view: 'lista' | 'mapa') {
  await navigate({ ...query.value, view, page: 1 })
  resultsHeading.value?.focus({ preventScroll: true })
  resultsHeading.value?.scrollIntoView({ block: 'start' })
}
function setSort(sort: PropertySalesQuery['sort']) {
  return navigate({ ...query.value, sort, page: 1 })
}
function toggleSaved() {
  savedOnly.value = !savedOnly.value
  compared.value = []
  if (savedOnly.value) navigate({ ...query.value, page: 1 })
}
function toggleCompare(key: string) {
  if (compared.value.includes(key)) compared.value = compared.value.filter(value => value !== key)
  else if (compared.value.length < 4) compared.value.push(key)
  else announce(t('compareLimit'))
}
async function goPage(page: number) {
  await navigate({ ...query.value, page })
  resultsHeading.value?.focus({ preventScroll: true })
  resultsHeading.value?.scrollIntoView({ block: 'start' })
}
function selectZone(zone: { department: string; neighborhood: string }) {
  return applyFilters({
    ...query.value,
    department: zone.department,
    locality: '',
    neighborhood: zone.neighborhood,
    view: 'lista',
    page: 1,
  })
}
async function loadFacets(next: PropertySalesQuery) {
  facetController?.abort()
  const current = new AbortController()
  facetController = current
  facetOverride.value = {
    ...(data.value?.facets || emptyFacets),
    localities: [],
    neighborhoods: [],
  }
  try {
    const result = await $fetch<PropertySalesResponse>('/api/property-sales', {
      query: propertySalesQueryToParams({ ...next, page: 1 }),
      signal: current.signal,
    })
    if (!current.signal.aborted) facetOverride.value = result.facets
  } catch {
    /* Applying still fetches the selected filters; stale dependant options stay hidden. */
  }
}
const date = (value: string) =>
  new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium',
    timeZone: 'America/Montevideo',
  }).format(new Date(value))
async function shareSearch() {
  const url = new URL(route.path, window.location.origin)
  const shareQuery = propertySalesQueryToParams(effectiveQuery.value)
  Object.entries(shareQuery).forEach(([key, value]) => url.searchParams.set(key, value))
  try {
    if (navigator.share) await navigator.share({ title: t('title'), url: url.href })
    else {
      await navigator.clipboard.writeText(url.href)
      announce(t('copied'))
    }
  } catch (err) {
    if ((err as Error).name !== 'AbortError') announce(t('shareError'))
  }
}
watch(
  () => favorites.keys.value,
  keys => {
    compared.value = compared.value.filter(key => keys.includes(key))
  }
)
watch(
  () => route.fullPath,
  () => {
    facetOverride.value = null
    if (import.meta.client)
      try {
        sessionStorage.setItem('cu_property_sale_search', route.fullPath)
      } catch {
        /* Search still works without storage. */
      }
  },
  { immediate: true }
)
onBeforeUnmount(() => facetController?.abort())
useSeoMeta({
  title: () => t('title'),
  description: () => t('seoDescription'),
  ogTitle: () => t('title'),
  ogDescription: () => t('seoDescription'),
  robots: () => (propertySalesFiltered(route.query) ? 'noindex,follow' : 'index,follow'),
})
useHead(() => ({
  link: [
    {
      rel: 'canonical',
      href: `https://cambio-uruguay.com${localePath('/venta-viviendas-uruguay')}`,
    },
  ],
  script: [
    {
      key: 'property-sales-collection-schema',
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'CollectionPage',
            '@id': `https://cambio-uruguay.com${localePath('/venta-viviendas-uruguay')}#collection`,
            url: `https://cambio-uruguay.com${localePath('/venta-viviendas-uruguay')}`,
            name: t('title'),
            description: t('seoDescription'),
            mainEntity:
              data.value && !pending.value && !error.value
                ? {
                    '@type': 'ItemList',
                    numberOfItems: data.value.items.length,
                    itemListElement: data.value.items.map((item, index) => ({
                      '@type': 'ListItem',
                      position: index + 1,
                      name: item.title,
                      url: `https://cambio-uruguay.com${localePath(propertySalePath(item.key))}`,
                    })),
                  }
                : undefined,
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: t('home'),
                item: `https://cambio-uruguay.com${localePath('/')}`,
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: t('sales'),
                item: `https://cambio-uruguay.com${localePath('/venta-viviendas-uruguay')}`,
              },
            ],
          },
        ],
      }).replace(/</g, '\\u003c'),
    },
  ],
}))
defineOgImageComponent('Cambio', { title: t('title'), description: t('seoDescription') })
</script>
<style scoped>
.sales-directory {
  max-width: 1280px;
  padding: 12px;
}
.sales-directory :is(h1, h2, h3, p) {
  margin: 0;
}
.sales-directory__header {
  padding: 12px 0 24px;
}
.sales-directory h1 {
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: -0.025em;
}
.sales-directory__header > p {
  margin-top: 12px;
  max-width: 850px;
  line-height: 1.65;
  color: rgba(var(--v-theme-on-surface), 0.75);
}
.sales-directory__header nav {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 20px;
  margin-top: 8px;
}
.sales-directory a {
  color: rgb(var(--v-theme-link));
}
.sales-directory__header nav a {
  font-size: 0.83rem;
  min-height: 36px;
  display: flex;
  align-items: center;
}
.sales-directory__workspace {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 24px;
}
.sales-directory__sidebar {
  min-width: 0;
}
.sales-directory__sidebar > :first-child {
  position: sticky;
  top: 82px;
  max-height: calc(100dvh - 100px);
  overflow-y: auto;
}
.sales-directory__content {
  min-width: 0;
}
.sales-directory__toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  background: rgb(var(--v-theme-background));
  position: sticky;
  top: 64px;
  z-index: 5;
  padding: 8px 0;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}
.sales-directory__toolbar .v-btn {
  min-height: 44px;
}
.sales-directory__toolbar .v-btn-toggle {
  flex-shrink: 0;
}
.sales-directory__toolbar .sales-directory__view-button {
  min-width: 44px;
}
.sales-directory__view-label {
  margin-left: 6px;
}
.sales-directory__chips {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 16px;
}
.sales-directory__chips :deep(.v-chip) {
  max-width: 100%;
  height: auto;
  min-height: 32px;
}
.sales-directory__chips :deep(.v-chip__content) {
  white-space: normal;
  overflow-wrap: anywhere;
}
.sales-directory__result-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 20px 0 16px;
}
.sales-directory__result-head h2 {
  font-size: 1.1rem;
  scroll-margin-top: 140px;
}
.sales-directory__sort {
  max-width: 230px;
  min-width: 160px;
}
.sales-directory__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.sales-directory__empty {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  text-align: center;
  gap: 16px;
  padding: 24px;
}
.sales-directory__empty p {
  max-width: 480px;
}
.sales-directory__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px 0;
  flex-wrap: wrap;
  font-size: 0.85rem;
}
.sales-directory__coverage {
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.15);
  scroll-margin-top: 140px;
}
.sales-directory__coverage h2 {
  font-size: 1.25rem;
}
.sales-directory__coverage p {
  font-size: 0.875rem;
  line-height: 1.7;
  margin-top: 12px;
  color: rgba(var(--v-theme-on-surface), 0.75);
}
.sales-directory__coverage ul {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 24px;
  list-style: none;
  padding: 0;
  margin: 16px 0;
}
.sales-directory__coverage li {
  display: grid;
  gap: 4px;
  font-size: 0.85rem;
}
.sales-directory__coverage time {
  font-size: 0.75rem;
}
.sales-directory__notice {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
  margin-bottom: 12px !important;
}
.sales-directory__compare {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.sales-directory__compare p {
  font-size: 0.8rem;
}
.sales-directory a:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
}
@media (max-width: 959px) {
  .sales-directory__header {
    padding: 6px 0 12px;
  }
  .sales-directory__header > p {
    margin-top: 6px;
    line-height: 1.45;
  }
  .sales-directory__header nav {
    margin-top: 4px;
  }
  .sales-directory__workspace {
    display: block;
  }
  .sales-directory__sidebar {
    height: 0;
  }
  .sales-directory__toolbar {
    top: 64px;
    margin: 0;
    padding: 5px 0;
    gap: 3px;
    flex-wrap: wrap;
  }
  .sales-directory__toolbar > .v-btn:last-child {
    margin-left: auto;
  }
  .sales-directory__toolbar .v-btn-toggle {
    height: 44px;
  }
  .sales-directory__toolbar :deep(.v-btn) {
    padding-inline: 10px;
    min-width: 44px;
    height: 44px;
    letter-spacing: 0;
  }
  /* The one labelled button in the bar keeps Vuetify's default padding: its
     prepend icon sits in a negative margin and at 10px it was 6px from the edge. */
  .sales-directory__toolbar > [data-testid='sale-filter-trigger'] {
    padding-inline: 16px;
  }
  .sales-directory__toolbar .sales-directory__saved-button {
    padding-inline: 4px;
    width: 44px;
    flex: 0 0 44px;
  }
  .sales-directory__toolbar > [data-testid='sale-share-trigger'] {
    width: 44px;
    flex: 0 0 44px;
  }
  .sales-directory__chips {
    flex-wrap: nowrap;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    padding-top: 8px;
    gap: 6px;
    scrollbar-width: thin;
  }
  .sales-directory__chips :deep(.v-chip) {
    flex: none;
    height: 44px;
    min-height: 44px;
    max-width: none;
  }
  .sales-directory__chips :deep(.v-chip__content) {
    white-space: nowrap;
  }
  .sales-directory__chips :deep(.v-chip__close) {
    min-width: 44px;
    min-height: 44px;
    justify-content: center;
  }
  .sales-directory__chips > .v-btn {
    flex: none;
    min-height: 44px;
  }
  .sales-directory__view-label {
    display: none;
  }
  .sales-directory__result-head {
    padding-top: 12px;
    gap: 12px;
  }
  .sales-directory__sort {
    max-width: 190px;
  }
  .sales-directory__header > p {
    font-size: 0.9rem;
  }
}
@media (max-width: 599px) {
  .sales-directory__saved-label {
    display: none;
  }
  .sales-directory__header nav > a:nth-child(n + 3) {
    display: none;
  }
  .sales-directory__grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .sales-directory__result-head h2 {
    font-size: 1rem;
  }
  .sales-directory__sort {
    max-width: 165px;
    min-width: 145px;
  }
  .sales-directory__toolbar {
    gap: 3px;
  }
  .sales-directory__toolbar > .v-btn {
    font-size: 0.75rem;
  }
  .sales-directory__toolbar :deep(.v-btn__prepend) {
    margin-inline-end: 4px;
  }
  .sales-directory__header nav {
    column-gap: 14px;
  }
  .sales-directory__compare {
    align-items: flex-start;
    flex-direction: column;
  }
  .sales-directory__pagination {
    gap: 8px;
  }
  .sales-directory__pagination > span {
    width: 100%;
    text-align: center;
    order: 2;
  }
}
</style>
