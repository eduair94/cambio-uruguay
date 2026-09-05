<!--
THESIS: Find a viable home across portals by location, conditions and actual monthly cost.
OWN-WORLD: Extend Cambio Uruguay's navy/paper surfaces, Open Sans and blue actions.
STORY: Narrow the search, compare costs, save candidates, contact the original publisher.
FIRST VIEWPORT: Persistent filters beside the heading and results; location and budget lead.
FORM: Rental catalogue with a left filter sidebar and a personal comparison shortlist.
MOBILE: Results first; persistent thumb-reachable filters open a focused draft with fixed actions.
-->
<template>
  <VContainer class="rentals pt-1 pt-sm-4" :class="{ 'rentals--mobile': smAndDown }">
    <VBreadcrumbs :items="breadcrumbs" density="compact" class="px-0 py-1" />
    <div class="rentals-workspace">
      <header class="rentals-head">
        <h1>{{ t('title') }}</h1>
        <p class="rentals-lead">{{ t('subtitle') }}</p>
        <div class="rentals-provenance">
          <span v-if="activeSourceLabels">{{ activeSourceLabels }}</span>
          <span v-if="meta?.generatedAt">{{
            t('date', { date: dateLabel(meta.generatedAt) })
          }}</span>
          <a href="#rental-coverage">{{ t('coverage') }}</a>
        </div>
        <VAlert v-if="downSources.length" type="warning" variant="tonal" class="mt-3">{{
          t('sourceWarning', {
            sources: downSources.map(source => sourceLabel(source.key)).join(', '),
          })
        }}</VAlert>
      </header>
      <aside class="rentals-sidebar" :aria-label="t('mobileFilters')">
        <SearchFilters
          v-model:open="mobileFiltersOpen"
          :mobile="smAndDown"
          :query="query"
          :departments="data?.facets.departments ?? []"
          :neighborhoods="neighborhoodFacets"
          :pending="pending"
          @search="search"
          @clear="clearFilters"
          @department="loadNeighborhoods"
          @closed="restoreFilterContext"
        />
      </aside>
      <div class="rentals-content">
        <div v-if="smAndDown" class="rentals-mobile-bar">
          <VBtn
            color="primary"
            size="large"
            prepend-icon="mdi-tune-variant"
            aria-haspopup="dialog"
            aria-controls="rental-mobile-filters-dialog"
            :aria-expanded="mobileFiltersOpen"
            data-testid="rental-mobile-filters-trigger"
            @click="openMobileFilters"
            >{{ t('mobileFilters')
            }}<span v-if="filterChips.length"> ({{ filterChips.length }})</span></VBtn
          >
        </div>
        <div v-if="filterChips.length" class="rentals-chips" :aria-label="t('activeFilters')">
          <VChip
            v-for="chip in filterChips"
            :key="chip.key"
            closable
            variant="tonal"
            color="primary"
            :close-label="t('remove', { name: chip.label })"
            @click:close="removeFilter(chip.keys)"
            >{{ chip.label }}</VChip
          >
          <VBtn variant="text" size="small" @click="clearFilters">{{ t('reset') }}</VBtn>
        </div>
        <div class="rentals-tools">
          <VBtn variant="text" prepend-icon="mdi-bookmark-plus-outline" @click="saveSearch">{{
            t('saveSearch')
          }}</VBtn>
          <VBtn
            variant="text"
            prepend-icon="mdi-heart-outline"
            :aria-expanded="showSaved"
            aria-controls="rental-saved"
            @click="showSaved = !showSaved"
            >{{ t('saved') }} ({{ saved.favorites.length + saved.searches.length }})</VBtn
          >
          <VBtn variant="text" prepend-icon="mdi-share-variant-outline" @click="shareSearch">{{
            t('share')
          }}</VBtn>
        </div>
        <div v-if="showSaved" id="rental-saved" class="mb-6">
          <SavedPanel
            :state="saved"
            :usd-uyu="usdUyu"
            @open-search="openSavedSearch"
            @remove-search="removeSearch"
            @remove-favorite="removeFavorite"
          />
        </div>
        <section
          id="rental-results"
          class="rentals-results"
          :aria-busy="pending"
          tabindex="-1"
          :aria-label="t('searchResults')"
        >
          <div class="rentals-toolbar">
            <div class="rentals-summary" role="status" aria-live="polite">
              <h2>{{ pending ? t('searching') : t('results', { n: numberFormat(total) }) }}</h2>
              <p v-if="medianUyu && !pending">
                {{ t('typical', { price: `$ ${numberFormat(medianUyu)}` }) }}
              </p>
            </div>
            <VSelect
              :model-value="query.sort"
              :items="sortItems"
              :label="t('sort')"
              variant="outlined"
              density="compact"
              hide-details
              class="rentals-sort"
              @update:model-value="changeSort"
            />
            <VBtnToggle
              :model-value="view"
              mandatory
              variant="outlined"
              density="comfortable"
              divided
              @update:model-value="changeView"
              ><VBtn value="lista" prepend-icon="mdi-view-grid-outline">{{ t('list') }}</VBtn
              ><VBtn value="mapa" prepend-icon="mdi-map-marker-outline">{{
                t('map')
              }}</VBtn></VBtnToggle
            >
          </div>
          <VProgressLinear v-if="pending" indeterminate color="primary" class="mb-4" />
          <VAlert v-if="error" type="error" variant="tonal" class="mb-5" role="alert">
            {{ t('error') }}
            <VBtn variant="text" @click="refresh()">{{ t('retry') }}</VBtn>
          </VAlert>
          <section v-if="view === 'mapa'" class="rentals-map mb-6" :aria-label="t('map')">
            <VProgressLinear v-if="mapPending" indeterminate color="primary" class="mb-2" />
            <VAlert v-if="mapError" type="error" variant="tonal" class="mb-3">
              {{ t('error') }}
              <VBtn variant="text" @click="loadMap()">{{ t('retry') }}</VBtn>
            </VAlert>
            <p v-if="mapData" class="rentals-map__coverage">
              {{
                t('mapCoverage', {
                  located: numberFormat(mapData.located),
                  total: numberFormat(mapData.total),
                })
              }}
              <span v-if="mapData.shown < mapData.located">{{
                t('mapLimit', { n: numberFormat(mapData.shown) })
              }}</span>
            </p>
            <ClientOnly>
              <div
                v-if="mapMarkers.length && !mapError"
                ref="mapFrame"
                class="rentals-map__frame"
                tabindex="-1"
                :aria-label="t('map')"
                @keydown.esc="closeMapProperty()"
              >
                <LocationsMap
                  ref="rentalMap"
                  :branches="mapMarkers"
                  :popups="false"
                  :marker-hit-size="44"
                  :highlight-id="selectedMapKey"
                  :user-location="sedeCentro"
                  :radius-km="sedeCentro ? query.radioKm : 0"
                  :fit-to-markers="true"
                  height="100%"
                  :directions-label="t('open')"
                  @marker-click="selectMapProperty"
                  @map-click="closeMapProperty(false)"
                />
                <MapPropertyDetail
                  v-if="selectedMapKey"
                  :key="selectedMapKey"
                  :property="mapDetail?.property ?? null"
                  :point="selectedMapPoint"
                  :usd-uyu="mapDetail?.usdUyu ?? usdUyu"
                  :pending="mapDetailPending"
                  :error="mapDetailError"
                  :favorite="isFavorite(selectedMapKey)"
                  @close="closeMapProperty()"
                  @retry="selectMapProperty({ id: selectedMapKey! })"
                  @favorite="property => toggleFavorite(property, mapDetail?.usdUyu ?? usdUyu)"
                />
              </div>
              <VAlert v-else-if="!mapPending && !mapError" type="info" variant="tonal">
                {{ t('noMap') }}
                <VBtn variant="text" @click="changeView('lista')">{{ t('list') }}</VBtn>
              </VAlert>
            </ClientOnly>
          </section>
          <div v-if="!pending && !error && !items.length && view === 'lista'" class="rentals-empty">
            <VIcon size="40" color="primary">mdi-home-search-outline</VIcon>
            <h3>{{ t('empty') }}</h3>
            <p>{{ t('emptyHint') }}</p>
            <VBtn color="primary" variant="tonal" @click="clearFilters">{{ t('reset') }}</VBtn>
          </div>
          <div v-if="view === 'lista' && !error" class="rentals-grid">
            <article v-for="(property, index) in items" :key="property.key" class="rental-card">
              <div class="rental-card__visual">
                <a
                  :href="displayOffer(property)?.url"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  class="rental-card__media"
                  :aria-label="`${t('open')}: ${property.title}`"
                >
                  <img
                    v-if="displayOffer(property)?.image && !failedImages.has(property.key)"
                    :src="displayOffer(property)?.image || ''"
                    :alt="property.title"
                    :loading="index < 3 ? 'eager' : 'lazy'"
                    decoding="async"
                    width="400"
                    height="260"
                    @error="failedImages.add(property.key)"
                  />
                  <span v-else class="rental-card__noimage">
                    <VIcon size="36">mdi-home-city-outline</VIcon>
                    <span>{{ t('noPhoto') }}</span>
                  </span>
                  <span v-if="property.sources.length > 1" class="rental-card__badge">{{
                    t('portals', { n: property.sources.length })
                  }}</span>
                </a>
                <VBtn
                  class="rental-card__save"
                  :icon="isFavorite(property.key) ? 'mdi-heart' : 'mdi-heart-outline'"
                  :color="isFavorite(property.key) ? 'primary' : undefined"
                  :aria-label="`${t(isFavorite(property.key) ? 'unfavorite' : 'favorite')}: ${property.title}`"
                  :aria-pressed="isFavorite(property.key)"
                  variant="flat"
                  size="small"
                  @click="toggleFavorite(property)"
                />
              </div>
              <div class="rental-card__body">
                <p class="rental-card__where">
                  {{
                    [property.neighborhood, property.department].filter(Boolean).join(', ') ||
                    t('unknown')
                  }}
                </p>
                <h3>
                  <a
                    :href="displayOffer(property)?.url"
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    >{{ property.title }}</a
                  >
                </h3>
                <p class="rental-card__specs">{{ specsLabel(property) }}</p>
                <p v-if="property.address" class="rental-card__address">{{ property.address }}</p>
                <div class="rental-card__cost">
                  <p class="rental-card__price">
                    {{ priceLabel(property) }} <span>{{ t('rent') }}</span>
                  </p>
                  <p class="rental-card__expenses">{{ expensesLabel(property) }}</p>
                  <p
                    v-if="monthlyTotal(property) !== null"
                    class="rental-card__total"
                    :title="t('totalHint')"
                  >
                    <span>{{ t('monthlyTotal') }}</span
                    ><strong>$ {{ numberFormat(monthlyTotal(property)!) }}</strong>
                  </p>
                </div>
                <div class="rental-card__tags">
                  <VChip v-if="property.petsAllowed" size="small" variant="tonal">{{
                    t('pets')
                  }}</VChip
                  ><VChip v-if="(property.parkingSpaces ?? 0) > 0" size="small" variant="tonal">{{
                    t('parking')
                  }}</VChip
                  ><VChip v-if="property.furnished" size="small" variant="tonal">{{
                    t('furnished')
                  }}</VChip
                  ><VChip
                    v-for="guarantee in publishedGuarantees(property)"
                    :key="guarantee"
                    size="small"
                    variant="outlined"
                    >{{ t(guarantee) }}</VChip
                  >
                </div>
                <div class="rental-card__offers">
                  <a
                    v-for="offer in property.offers"
                    :key="offer.listingId"
                    :href="offer.url"
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    class="rental-card__offer"
                    :class="{
                      'rental-card__offer--selected':
                        offer.listingId === displayOffer(property)?.listingId,
                    }"
                    ><span>{{ sourceLabel(offer.source) }}</span
                    ><strong>{{ offerPrice(offer) }}</strong
                    ><VIcon size="16">mdi-open-in-new</VIcon></a
                  >
                </div>
                <p class="rental-card__meta">{{ sellerLabel(property) }}</p>
                <p class="rental-card__meta">
                  {{
                    t('seen', {
                      date: dateLabel(displayOffer(property)?.lastSeen || property.lastSeen),
                    })
                  }}
                </p>
              </div>
            </article>
          </div>
          <div v-if="pageCount > 1 && view === 'lista' && !error" class="mt-6">
            <VPagination
              :model-value="query.page"
              :length="pageCount"
              :total-visible="smAndDown ? 1 : 7"
              @update:model-value="onPageChange"
            />
            <p v-if="smAndDown" class="text-caption text-center mt-1">
              {{ t('pageStatus', { current: query.page, total: pageCount }) }}
            </p>
          </div>
        </section>
      </div>
    </div>
    <section id="rental-coverage" class="rentals-notes">
      <h2>{{ t('methodology') }}</h2>
      <p>{{ t('methodText') }}</p>
      <p>{{ t('scopeText') }} {{ t('freshnessText') }}</p>
      <details>
        <summary>{{ t('coverage') }}</summary>
        <p>{{ t('coverageText') }}</p>
        <template v-if="coverage">
          <p data-testid="rental-coverage-summary">
            <strong>{{
              t('coverageTotal', { n: numberFormat(coverage.properties) }, coverage.properties)
            }}</strong>
          </p>
          <p>{{ t('coverageScope') }}</p>
          <dl class="rentals-coverage-sources">
            <div
              v-for="source in coverage.sources"
              :key="source.key"
              :data-testid="`rental-coverage-source-${source.key}`"
            >
              <dt>{{ sourceLabel(source.key) }}</dt>
              <dd>
                <span>{{
                  t('coverageProperties', { n: numberFormat(source.properties) }, source.properties)
                }}</span>
                <small v-if="meta?.sources.some(run => run.key === source.key && !run.ok)">{{
                  t('coverageReadFailed')
                }}</small>
              </dd>
            </div>
          </dl>
          <p>{{ t('coverageCounted', { date: dateLabel(coverage.computedAt) }) }}</p>
        </template>
        <p v-else>{{ t('coverageUnavailable') }}</p>
        <p v-if="usdUyu">{{ t('rate', { rate: usdUyu.toFixed(2) }) }}</p>
        <h3>{{ t('otherPortals') }}</h3>
        <p>{{ t('externalHint') }}</p>
        <div class="rentals-external">
          <a
            v-for="portal in externalPortals"
            :key="portal.name"
            :href="portal.url"
            target="_blank"
            rel="noopener noreferrer"
            >{{ portal.name }} ↗</a
          >
        </div>
      </details>
    </section>
    <nav class="rentals-help" :aria-label="t('help')">
      <h2>{{ t('help') }}</h2>
      <NuxtLink v-for="link in relatedLinks" :key="link.to" :to="localePath(link.to)">
        {{ t(link.label) }}
        <VIcon size="16">mdi-arrow-right</VIcon>
      </NuxtLink>
    </nav>
    <VSnackbar v-model="snackbar" :timeout="4500" role="status">{{ feedback }}</VSnackbar>
  </VContainer>
</template>

<script setup lang="ts">
import { useDisplay } from 'vuetify'
import SearchFilters from '~/components/rentals/SearchFilters.vue'
import SavedPanel from '~/components/rentals/SavedPanel.vue'
import MapPropertyDetail from '~/components/rentals/MapPropertyDetail.vue'
import { rentalMessages } from '~/utils/rentalMessages'
import {
  RENTAL_GUARANTEE_PUBLISHED,
  RENTAL_SOURCE_LABEL,
  RENTAL_SORTS,
  normalizeRentalQuery,
  rentalQueryToParams,
  rentalPriceLabel,
  totalMonthlyUyu,
  type RentalQuery,
  type RentalProperty,
  type RentalPublicProperty,
  type RentalPropertyDetailResponse,
  type RentalMapResponse,
  type RentalFacetValue,
  type RentalsResponse,
} from '~/utils/rentals'
import { MUTUALISTA_SEDES } from '~/utils/mutualistaSedes'
import {
  RENTAL_SAVED_STORAGE_ID,
  RENTAL_SAVED_FAVORITE_LIMIT,
  emptyRentalSaved,
  readRentalSaved,
  writeRentalSaved,
  saveRentalSearch,
  removeRentalSearch,
  toggleRentalFavorite,
  removeRentalFavorite,
} from '~/utils/rentalSaved'

const LocationsMap = defineAsyncComponent(() => import('~/components/map/LocationsMap.vue'))
const { t, locale } = useI18n({ useScope: 'local', messages: rentalMessages })
const localePath = useLocalePath()
const route = useRoute()
const router = useRouter()
const { smAndDown } = useDisplay()
const mobileFiltersOpen = ref(false)
let filterActivator: HTMLElement | null = null
let filterReturnScroll = 0
let filtersApplied = false
function openMobileFilters(event: MouseEvent) {
  filterActivator = event.currentTarget as HTMLElement
  filterReturnScroll = window.scrollY
  filtersApplied = false
  mobileFiltersOpen.value = true
}
async function restoreFilterContext() {
  neighborhoodOverride.value = null
  await nextTick()
  if (filtersApplied) {
    focusSearchResults()
  } else if (filterActivator?.isConnected) {
    filterActivator.focus({ preventScroll: true })
    window.scrollTo({ top: filterReturnScroll, behavior: 'instant' })
  }
}
watch(smAndDown, mobile => {
  if (!mobile) mobileFiltersOpen.value = false
})
const query = computed(() => normalizeRentalQuery(route.query))
const requestParams = computed(() => rentalQueryToParams(query.value))
const requestKey = computed(() => JSON.stringify(requestParams.value))
const view = computed(() => (route.query.view === 'mapa' ? 'mapa' : 'lista'))
const { data, pending, error, refresh } = await useAsyncData<RentalsResponse>(
  'rental-directory',
  () => $fetch('/api/rentals', { query: requestParams.value }),
  { watch: [requestKey] }
)
const items = computed(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)
const meta = computed(() => data.value?.meta ?? null)
const coverage = computed(() => data.value?.coverage ?? null)
const medianUyu = computed(() => data.value?.medianUyu ?? 0)
const usdUyu = computed(() => meta.value?.usdUyu ?? 0)
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / (data.value?.perPage || 24))))
const downSources = computed(() => (meta.value?.sources ?? []).filter(source => !source.ok))
const activeSourceLabels = computed(() =>
  (coverage.value?.sources ?? [])
    .filter(source => source.properties > 0)
    .map(source => sourceLabel(source.key))
    .join(' · ')
)
const sortItems = computed(() =>
  RENTAL_SORTS.map(option => ({ title: t(option.value), value: option.value }))
)
const failedImages = reactive(new Set<string>())

// Confirmed URL filters alone fetch results. Back/Forward restores the complete draft form.
function navigate(params: Record<string, string>) {
  return router.push({ query: { ...params, ...(view.value === 'mapa' ? { view: 'mapa' } : {}) } })
}
function focusSearchResults() {
  const results = document.getElementById('rental-results')
  results?.focus({ preventScroll: true })
  results?.scrollIntoView({ block: 'start', behavior: 'instant' })
}
async function search(next: RentalQuery) {
  const closingMobileFilters = mobileFiltersOpen.value
  if (closingMobileFilters) {
    filtersApplied = true
    mobileFiltersOpen.value = false
  }
  await navigate(rentalQueryToParams({ ...next, page: 1 }))
  // The dialog restores focus after its closing animation; the sidebar stays on screen.
  if (!closingMobileFilters) {
    await nextTick()
    focusSearchResults()
  }
}
async function clearFilters() {
  await navigate({})
  await nextTick()
  focusSearchResults()
}
function removeFilter(keys: string[]) {
  const params = Object.fromEntries(
    Object.entries(requestParams.value).filter(([key]) => ![...keys, 'page'].includes(key))
  )
  void navigate(params)
}
function changeSort(sort: RentalQuery['sort']) {
  search({ ...query.value, sort })
}
function changeView(next: string) {
  void router.push({
    query: { ...requestParams.value, ...(next === 'mapa' ? { view: 'mapa' } : {}) },
  })
}
async function onPageChange(page: number) {
  await navigate(rentalQueryToParams({ ...query.value, page }))
  document.getElementById('rental-results')?.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'start',
  })
}
const neighborhoodOverride = ref<RentalFacetValue[] | null>(null)
const neighborhoodFacets = computed(
  () => neighborhoodOverride.value ?? data.value?.facets.neighborhoods ?? []
)
let neighborhoodRequest = 0
watch(requestKey, () => {
  neighborhoodRequest++
  neighborhoodOverride.value = null
})
async function loadNeighborhoods(department: string) {
  const request = ++neighborhoodRequest
  if (department === query.value.department) {
    neighborhoodOverride.value = null
    return
  }
  neighborhoodOverride.value = []
  try {
    const result = await $fetch<RentalsResponse>('/api/rentals', {
      query: { department, perPage: 6 },
    })
    if (request === neighborhoodRequest) neighborhoodOverride.value = result.facets.neighborhoods
  } catch {
    if (request === neighborhoodRequest) notify(t('error'))
  }
}
const filterChips = computed(() => {
  const q = query.value
  const chips: Array<{ key: string; keys: string[]; label: string }> = []
  const add = (key: string, label: string, keys = [key]) => chips.push({ key, keys, label })
  if (q.department) add('department', q.department, ['department', 'neighborhood', 'neighborhoods'])
  if (q.neighborhoods.length)
    add('neighborhoods', q.neighborhoods.join(', '), ['neighborhood', 'neighborhoods'])
  if (q.type) add('type', typeLabel(q.type))
  if (q.q) add('q', q.q)
  if (q.bedrooms !== null)
    add(
      'bedrooms',
      q.bedrooms === 0
        ? t('studio')
        : `${q.bedrooms}${q.bedroomsExact ? '' : '+'} ${t('bedrooms')}`,
      ['bedrooms', 'bedroomsExact']
    )
  for (const [key, value] of Object.entries({
    bathrooms: q.bathrooms,
    areaMin: q.areaMin,
    areaMax: q.areaMax,
    priceMin: q.priceMin,
    priceMax: q.priceMax,
    monthlyMax: q.monthlyMax,
    expensesMax: q.expensesMax,
  })) {
    if (value !== null) add(key, `${t(key)}: ${numberFormat(value)}`)
  }
  for (const [key, active, label] of [
    ['pets', q.pets, 'pets'],
    ['parking', q.parking, 'parking'],
    ['furnished', q.furnished, 'furnished'],
    ['dueno', q.owner, 'owner'],
    ['gc', q.withExpenses, 'expensesKnown'],
    ['multi', q.multi, 'multi'],
  ] as const) {
    if (active) add(key, t(label))
  }
  if (q.currency) add('currency', q.currency)
  if (q.source) add('source', sourceLabel(q.source))
  if (q.guarantees.length) add('garantia', q.guarantees.map(g => t(g)).join(', '))
  if (q.sedes.length) add('sedes', `${t('nearby')} · ${q.radioKm} km`, ['sedes', 'radio'])
  return chips
})

// The map never requests thousands of points while the user is browsing the list.
const mapParams = computed(() => {
  const params = { ...requestParams.value }
  delete params.page
  delete params.perPage
  return params
})
const mapKey = computed(() => JSON.stringify(mapParams.value))
const {
  data: mapData,
  pending: mapPending,
  error: mapError,
  execute: loadMap,
} = await useAsyncData<RentalMapResponse>(
  'rental-directory-map',
  () => $fetch('/api/rentals/mapa', { query: mapParams.value }),
  { server: false, immediate: false }
)
watch([view, mapKey], () => {
  void closeMapProperty(false)
  if (view.value === 'mapa') void loadMap()
})
const sedeCentro = computed(() => {
  if (query.value.sedes.length !== 1) return null
  const sede = MUTUALISTA_SEDES.find(s => s.osmId === query.value.sedes[0])
  return sede ? { lat: sede.lat, lng: sede.lng } : null
})
const mapMarkers = computed(() =>
  (mapData.value?.points ?? []).map(point => ({
    origin: 'alquiler',
    id: point.key,
    name: point.neighborhood || t('rent'),
    dept: point.neighborhood || '',
    locality: '',
    address: point.neighborhood || '',
    phone: '',
    hours: '',
    lat: point.lat,
    lng: point.lng,
    mapUrl: point.url,
    source: 'alquileres',
  }))
)
const rentalMap = ref<{
  focusMarker: (id: string) => boolean
  revealMarker: (
    id: string,
    padding: { top: number; right: number; bottom: number; left: number }
  ) => void
} | null>(null)
const mapFrame = ref<HTMLElement | null>(null)
const selectedMapKey = ref<string | null>(null)
const selectedMapPoint = computed(
  () => mapData.value?.points.find(point => point.key === selectedMapKey.value) ?? null
)
const mapDetail = shallowRef<RentalPropertyDetailResponse | null>(null)
const mapDetailPending = ref(false)
const mapDetailError = ref<'unavailable' | 'failed' | null>(null)
let mapDetailRequest: AbortController | null = null
// One full property is fetched on selection; the other map points remain lightweight.
async function selectMapProperty(marker: { id: string }) {
  if (mapPending.value || !mapData.value?.points.some(point => point.key === marker.id)) return
  if (selectedMapKey.value === marker.id && (mapDetailPending.value || mapDetail.value)) return
  // Keep map context visible above the mobile sheet, and desktop actions inside the viewport.
  mapFrame.value?.scrollIntoView({
    block: smAndDown.value ? 'start' : 'nearest',
    behavior: 'instant',
  })
  mapDetailRequest?.abort()
  const request = new AbortController()
  mapDetailRequest = request
  selectedMapKey.value = marker.id
  mapDetail.value = null
  mapDetailError.value = null
  mapDetailPending.value = true
  try {
    const detail = await $fetch<RentalPropertyDetailResponse>(
      `/api/rentals/propiedad/${encodeURIComponent(marker.id)}`,
      { query: mapParams.value, signal: request.signal, retry: 0 }
    )
    if (mapDetailRequest === request) mapDetail.value = detail
  } catch (error) {
    if (mapDetailRequest === request && !request.signal.aborted) {
      mapDetailError.value =
        (error as { statusCode?: number }).statusCode === 404 ? 'unavailable' : 'failed'
    }
  } finally {
    if (mapDetailRequest === request) {
      mapDetailPending.value = false
      await nextTick()
      if (mapDetailRequest === request) revealSelectedMapProperty()
    }
  }
}
function revealSelectedMapProperty() {
  const frame = mapFrame.value?.getBoundingClientRect()
  const panel = mapFrame.value?.querySelector('.rental-map-detail')?.getBoundingClientRect()
  if (!frame || !panel || !selectedMapKey.value) return
  // Reserve room for the whole 44px target, not only the centre of its dot.
  if (smAndDown.value) {
    if (panel.top - frame.top < 80) return
    rentalMap.value?.revealMarker(selectedMapKey.value, {
      top: 28,
      right: 28,
      bottom: Math.max(28, frame.bottom - panel.top + 28),
      left: 66,
    })
  } else {
    rentalMap.value?.revealMarker(selectedMapKey.value, {
      top: 28,
      right: Math.max(28, frame.right - panel.left + 28),
      bottom: 28,
      left: 66,
    })
  }
}
async function closeMapProperty(restoreFocus = true) {
  const key = selectedMapKey.value
  mapDetailRequest?.abort()
  mapDetailRequest = null
  selectedMapKey.value = null
  mapDetail.value = null
  mapDetailError.value = null
  mapDetailPending.value = false
  if (restoreFocus && key) {
    await nextTick()
    if (!rentalMap.value?.focusMarker(key)) mapFrame.value?.focus({ preventScroll: true })
  }
}
let mapVisibility: IntersectionObserver | null = null
watch(mapFrame, frame => {
  mapVisibility?.disconnect()
  if (!frame) return
  mapVisibility = new IntersectionObserver(([entry]) => {
    // A mobile sheet should not follow the user into coverage, saved items or the footer.
    if (!entry?.isIntersecting) void closeMapProperty(false)
  })
  mapVisibility.observe(frame)
})
watch(mapError, error => {
  if (error) void closeMapProperty(false)
})
const numberFormat = (value: number) =>
  new Intl.NumberFormat(
    locale.value === 'en' ? 'en-US' : locale.value === 'pt' ? 'pt-BR' : 'es-UY',
    { maximumFractionDigits: 0 }
  ).format(value)
const dateLabel = (value: string) => {
  const date = new Date(value)
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value)
  return Number.isFinite(date.getTime())
    ? date.toLocaleString(
        locale.value === 'en' ? 'en-US' : locale.value === 'pt' ? 'pt-BR' : 'es-UY',
        {
          day: '2-digit',
          month: '2-digit',
          ...(dateOnly ? {} : { hour: '2-digit' as const, minute: '2-digit' as const }),
          timeZone: dateOnly ? 'UTC' : 'America/Montevideo',
        }
      )
    : t('unknown')
}
const sourceLabel = (source: string) =>
  RENTAL_SOURCE_LABEL[source as keyof typeof RENTAL_SOURCE_LABEL] ?? source
const typeLabel = (type: string) =>
  t(
    (
      {
        apartamento: 'apartment',
        casa: 'house',
        habitacion: 'room',
        local: 'commercial',
        oficina: 'office',
        terreno: 'land',
        otro: 'other',
      } as Record<string, string>
    )[type] || 'other'
  )
const displayOffer = (property: RentalProperty) => property.matchingOffer ?? property.offers[0]
const offerPrice = (offer: { price: number; currency: string }) =>
  `${offer.currency === 'USD' ? 'U$S' : '$'} ${numberFormat(offer.price)}`
const priceLabel = (property: RentalProperty) => {
  const offer = displayOffer(property)
  return offer
    ? offerPrice(offer)
    : rentalPriceLabel(property.price, property.currency, usdUyu.value)
}
const specsLabel = (property: RentalProperty) =>
  [
    typeLabel(property.propertyType),
    property.bedrooms !== null
      ? property.bedrooms === 0
        ? t('studio')
        : `${property.bedrooms} ${t('bedrooms').toLowerCase()}`
      : '',
    property.bathrooms !== null ? `${property.bathrooms} ${t('bathrooms').toLowerCase()}` : '',
    property.area ? `${property.area} m²` : '',
  ]
    .filter(Boolean)
    .join(' · ')
const monthlyTotal = (property: RentalProperty) => {
  const offer = displayOffer(property)
  return offer ? totalMonthlyUyu(offer, usdUyu.value) : null
}
const expensesLabel = (property: RentalProperty) => {
  const offer = displayOffer(property)
  if (offer?.commonExpenses === 0) return t('noExpenses')
  if (!offer || offer.commonExpenses === null || !offer.commonExpensesCurrency)
    return t('expensesUnknown')
  return `${t('expenses')}: ${offerPrice({ price: offer.commonExpenses, currency: offer.commonExpensesCurrency })}`
}
const publishedGuarantees = (property: RentalProperty) =>
  (property.guarantees ?? []).filter(g => RENTAL_GUARANTEE_PUBLISHED.includes(g))
const sellerLabel = (property: RentalProperty) => {
  const offer = displayOffer(property)
  const type = t(
    offer?.sellerType === 'particular'
      ? 'individual'
      : offer?.sellerType === 'inmobiliaria'
        ? 'agency'
        : 'unknown'
  )
  return offer?.sellerName && !/^(?:particular|mercado libre)$/i.test(offer.sellerName)
    ? `${type} · ${offer.sellerName}`
    : type
}

const saved = ref(emptyRentalSaved())
const showSaved = ref(false)
const snackbar = ref(false)
const feedback = ref('')
function notify(message: string) {
  feedback.value = message
  snackbar.value = true
}
function persist() {
  if (!writeRentalSaved(saved.value)) notify(t('storageError'))
}
function saveSearch() {
  const label = filterChips.value.map(chip => chip.label).join(' · ') || t('country')
  const next = saveRentalSearch(saved.value, label, query.value)
  if (
    saved.value.searches.some(
      search => !next.searches.some(candidate => candidate.id === search.id)
    )
  ) {
    notify(t('searchLimit'))
    showSaved.value = true
    return
  }
  saved.value = next
  persist()
  showSaved.value = true
}
function removeSearch(id: string) {
  saved.value = removeRentalSearch(saved.value, id)
  persist()
}
function removeFavorite(key: string) {
  saved.value = removeRentalFavorite(saved.value, key)
  persist()
}
function toggleFavorite(property: RentalPublicProperty, rate = usdUyu.value) {
  if (!isFavorite(property.key) && saved.value.favorites.length >= RENTAL_SAVED_FAVORITE_LIMIT) {
    notify(t('favoriteLimit'))
    showSaved.value = true
    return
  }
  saved.value = toggleRentalFavorite(saved.value, property, rate)
  persist()
}
const isFavorite = (key: string) => saved.value.favorites.some(item => item.key === key)
function openSavedSearch(params: Record<string, string>) {
  void navigate(rentalQueryToParams(normalizeRentalQuery(params)))
}
async function shareSearch() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    notify(t('copied'))
  } catch {
    notify(t('copyError'))
  }
}
const onStorage = (event: StorageEvent) => {
  if (event.key === RENTAL_SAVED_STORAGE_ID || event.key === null) saved.value = readRentalSaved()
}
onMounted(() => {
  saved.value = readRentalSaved()
  window.addEventListener('storage', onStorage)
  if (view.value === 'mapa') void loadMap()
})
onBeforeUnmount(() => {
  window.removeEventListener('storage', onStorage)
  mapDetailRequest?.abort()
  mapVisibility?.disconnect()
})
const breadcrumbs = computed(() => [
  { title: t('country'), to: localePath('/') },
  { title: t('search'), disabled: true },
])
const externalPortals = [
  { name: 'Gallito', url: 'https://www.gallito.com.uy/inmuebles/alquiler' },
  { name: 'BuscandoCasa', url: 'https://www.buscandocasa.com/' },
  { name: 'Casasweb', url: 'https://casasweb.com/' },
  { name: 'Inmuebles El País', url: 'https://inmuebles.elpais.com.uy/' },
]
const relatedLinks = [
  { to: '/alquilar-en-uruguay', label: 'guide' },
  { to: '/alquilar-sin-recibo-de-sueldo', label: 'independent' },
  { to: '/alquilar-estando-en-clearing', label: 'clearing' },
]
const canonicalUrl = computed(
  () => `https://cambio-uruguay.com${localePath('/alquileres-uruguay')}`
)
defineOgImageComponent('Cambio', {
  title: () => t('title'),
  subtitle: () => t('subtitle'),
  tag: 'ALQUILERES',
})
useSeoMeta({
  title: () =>
    locale.value === 'es'
      ? 'Alquileres en Uruguay: compará portales, precios y gastos'
      : t('title'),
  description: () => t('subtitle'),
  ogTitle: () => t('title'),
  ogDescription: () => t('subtitle'),
  ogType: 'website',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
})
useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl.value }],
  meta:
    query.value.page > 1 ||
    filterChips.value.length ||
    query.value.sort !== 'recientes' ||
    view.value === 'mapa'
      ? [{ name: 'robots', content: 'noindex, follow' }]
      : [],
  script: items.value.length
    ? [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: t('title'),
            url: canonicalUrl.value,
            numberOfItems: items.value.length,
            itemListElement: items.value.map((property, index) => ({
              '@type': 'ListItem',
              position: (query.value.page - 1) * query.value.perPage + index + 1,
              name: property.title,
              url: displayOffer(property)?.url,
            })),
          }).replace(/</g, '\\u003c'),
        },
      ]
    : [],
}))
</script>

<style scoped>
.rentals {
  max-width: 1280px;
  padding-bottom: 48px;
}
.rentals--mobile {
  padding-bottom: calc(104px + env(safe-area-inset-bottom));
}
.rentals-content,
.rentals-sidebar {
  min-width: 0;
}
.rentals-sidebar {
  display: none;
}
.rentals-mobile-bar {
  position: fixed;
  inset: auto 0 0;
  z-index: 1900;
  display: flex;
  padding: 12px max(84px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom))
    max(12px, env(safe-area-inset-left));
  background: rgb(var(--v-theme-surface));
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.rentals-mobile-bar > .v-btn {
  flex: 1;
  min-width: 0;
  min-height: 48px;
}
.rentals-head {
  margin: 12px 0 24px;
}
.rentals-head h1 {
  margin: 0 0 8px;
  font-size: 2rem;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.02em;
}
.rentals-lead {
  margin: 0;
  max-width: 75ch;
  color: rgba(var(--v-theme-on-surface), 0.8);
}
.rentals-provenance {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  margin-top: 12px;
  font-size: 0.78rem;
  color: rgba(var(--v-theme-on-surface), 0.76);
}
.rentals-provenance a,
.rentals-external a,
.rentals-help a {
  color: rgb(var(--v-theme-link));
  text-underline-offset: 3px;
}
.rentals-chips,
.rentals-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
}
.rentals-tools {
  margin: 8px 0 12px;
}
.rentals--mobile .rentals-chips :deep(.v-chip) {
  height: auto;
  min-height: 44px;
  max-width: 100%;
}
.rentals--mobile .rentals-chips :deep(.v-chip__content) {
  min-width: 0;
  white-space: normal;
  overflow-wrap: anywhere;
}
.rentals--mobile .rentals-chips :deep(.v-chip__close) {
  flex: 0 0 44px;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  max-width: 44px;
  max-height: 44px;
}
.rentals-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  margin: 20px 0;
}
.rentals-summary {
  margin-right: auto;
}
.rentals-summary h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}
.rentals-summary p {
  margin: 4px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.76);
  font-size: 0.8rem;
}
.rentals-sort {
  flex: 0 1 210px;
  min-width: 175px;
}
.rentals-results {
  scroll-margin-top: 90px;
}
.rentals-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}
.rental-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
  display: flex;
  flex-direction: column;
}
.rental-card__visual {
  position: relative;
}
.rental-card__media {
  display: block;
  aspect-ratio: 3 / 2;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.rental-card__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.rental-card__noimage {
  display: flex;
  gap: 8px;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: rgba(var(--v-theme-on-surface), 0.72);
  font-size: 0.8rem;
}
.rental-card__badge {
  position: absolute;
  bottom: 12px;
  left: 12px;
  padding: 4px 10px;
  border-radius: 6px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.78rem;
  font-weight: 700;
}
.rental-card__save {
  position: absolute;
  top: 10px;
  right: 10px;
}
.rental-card__body {
  padding: 18px;
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 8px;
  min-width: 0;
}
.rental-card__body p {
  margin: 0;
}
.rental-card__where {
  color: rgb(var(--v-theme-link));
  font-size: 0.8rem;
  font-weight: 600;
}
.rental-card h3 {
  margin: 0;
  font-size: 1rem;
  line-height: 1.4;
  overflow-wrap: anywhere;
}
.rental-card h3 a {
  color: inherit;
  text-decoration: none;
}
.rental-card h3 a:hover {
  text-decoration: underline;
}
.rental-card__specs,
.rental-card__address {
  font-size: 0.8rem;
}
.rental-card__address,
.rental-card__meta,
.rental-card__expenses {
  color: rgba(var(--v-theme-on-surface), 0.76);
}
.rental-card__cost {
  margin: 8px 0;
  padding: 12px 0;
  border-block: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.rental-card__price {
  font-size: 1.35rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.rental-card__price span {
  font-size: 0.75rem;
  font-weight: 400;
  margin-left: 4px;
}
.rental-card__expenses {
  font-size: 0.8rem;
  margin-top: 4px !important;
}
.rental-card__total {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 10px !important;
  font-size: 0.875rem;
}
.rental-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.rental-card__offers {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: auto 0 4px;
  padding-top: 16px;
}
.rental-card__offer {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 0.78rem;
  text-decoration: none;
  color: inherit;
  background: rgba(var(--v-theme-on-surface), 0.05);
}
.rental-card__offer strong {
  margin-left: auto;
  white-space: nowrap;
}
.rental-card__offer--selected,
.rental-card__offer:hover {
  background: rgba(var(--v-theme-primary), 0.12);
}
.rental-card__meta {
  font-size: 0.75rem;
  overflow-wrap: anywhere;
}
.rentals-map {
  border-radius: 12px;
  overflow: hidden;
}
.rentals-map__coverage {
  margin: 0 0 16px;
  font-size: 0.875rem;
}
.rentals-map__frame {
  position: relative;
  height: max(400px, 68vh);
  height: max(400px, 68dvh);
  scroll-margin-top: 100px;
  scroll-margin-bottom: 16px;
}
@media (min-width: 960px) {
  .rentals-map__frame {
    height: min(max(400px, 68dvh), calc(100dvh - 128px));
  }
}
.rentals-empty {
  padding: 40px 20px;
  text-align: center;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
}
.rentals-empty h3 {
  margin: 16px 0 8px;
}
.rentals-empty p {
  margin: 0 auto 20px;
  max-width: 65ch;
}
.rentals-notes {
  margin-top: 56px;
  max-width: 78ch;
}
.rentals-notes h2,
.rentals-help h2 {
  margin: 0 0 16px;
  font-size: 1.25rem;
}
.rentals-notes p {
  margin: 12px 0;
  color: rgba(var(--v-theme-on-surface), 0.8);
  line-height: 1.65;
}
.rentals-notes details {
  margin-top: 24px;
}
.rentals-notes summary {
  cursor: pointer;
  font-weight: 700;
  min-height: 44px;
  display: list-item;
}
.rentals-notes h3 {
  margin: 24px 0 8px;
  font-size: 1rem;
}
.rentals-coverage-sources {
  margin: 20px 0;
}
.rentals-coverage-sources > div {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px 20px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.rentals-coverage-sources dt {
  font-weight: 600;
}
.rentals-coverage-sources dd {
  margin: 0;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.rentals-coverage-sources small {
  display: block;
  margin-top: 4px;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.8);
}
@media (max-width: 599px) {
  .rentals-coverage-sources > div {
    grid-template-columns: minmax(0, 1fr);
    gap: 4px;
  }
  .rentals-coverage-sources dd {
    text-align: left;
  }
}
.rentals-external {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.rentals-help {
  margin-top: 40px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
}
.rentals-help h2 {
  width: 100%;
  margin-bottom: 0;
}
.rentals :deep(a:focus-visible),
.rentals summary:focus-visible {
  outline: 3px solid rgb(var(--v-theme-primary));
  outline-offset: 4px;
}
@media (min-width: 960px) {
  .rentals-workspace {
    display: grid;
    grid-template-columns: 304px minmax(0, 1fr);
    grid-template-areas:
      'filters heading'
      'filters results';
    column-gap: 24px;
    align-items: start;
  }
  .rentals-head {
    grid-area: heading;
    margin: 0 0 12px;
  }
  .rentals-sidebar {
    display: block;
    grid-area: filters;
    position: sticky;
    top: 90px;
  }
  .rentals-content {
    grid-area: results;
  }
}
@media (max-width: 959px) {
  .rentals-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }
  .rentals-summary {
    flex-basis: 100%;
  }
}
@media (max-width: 599px) {
  .rentals-head h1 {
    font-size: 1.55rem;
  }
  .rentals-grid {
    grid-template-columns: 1fr;
  }
  .rentals-sort {
    flex: 1;
    min-width: 150px;
  }
  .rentals-toolbar {
    gap: 12px;
  }
  .rentals-tools {
    gap: 0;
  }
  .rentals-provenance {
    gap: 6px 12px;
  }
}
</style>
