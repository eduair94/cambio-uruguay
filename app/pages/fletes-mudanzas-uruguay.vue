<!--
THESIS: Find a provider for the work and location, then inspect the price with its conditions.
OWN-WORLD: Existing housing hub: light-first Vuetify controls, Open Sans, blue links, quiet rows.
STORY: Service and department narrow the directory; source-backed details make quotes comparable.
FIRST VIEWPORT: Housing breadcrumb, concise introduction, service/area/search controls, first rows.
FORM: Extension of the rental journey: searchable directory with progressively disclosed evidence.
-->
<template>
  <VContainer class="moving-page py-4">
    <NuxtLink :to="localePath('/alquilar-en-uruguay')" class="back-link">{{ c.back }}</NuxtLink>
    <header>
      <h1>{{ c.title }}</h1>
      <p class="moving-lead">{{ c.intro }}</p>
      <p class="moving-meta">
        {{ c.reviewed }}: <time :datetime="MOVING_REVIEWED">{{ reviewed }}</time
        >. {{ c.snapshot }}
      </p>
      <nav class="page-jumps" :aria-label="c.title">
        <a href="#comparar">{{ c.guide }}</a>
        <a href="#fuentes">{{ c.sources }}</a>
      </nav>
    </header>
    <VAlert v-if="stale" type="info" variant="tonal" class="mb-4">{{ c.stale }}</VAlert>
    <section id="directorio" aria-labelledby="directory-title" class="directory-section">
      <h2 id="directory-title">{{ c.directory }}</h2>
      <div class="directory-filters">
        <VSelect
          v-model="category"
          :items="categoryOptions"
          :label="c.service"
          variant="outlined"
          density="comfortable"
          hide-details
        />
        <VSelect
          v-model="department"
          :items="departmentOptions"
          :label="c.department"
          variant="outlined"
          density="comfortable"
          hide-details
        />
        <VTextField
          v-model="query"
          :label="c.search"
          variant="outlined"
          density="comfortable"
          hide-details
          clearable
        />
      </div>
      <div class="directory-order">
        <VSelect
          v-model="sort"
          :items="sortOptions"
          :label="c.sort"
          class="sort-control"
          variant="outlined"
          density="comfortable"
          hide-details
        />
        <VBtn variant="tonal" color="primary" prepend-icon="mdi-link-variant" @click="shareSearch">
          {{ c.shareSearch }}
        </VBtn>
        <span role="status" class="share-status">{{ shareMessage }}</span>
      </div>
      <VTextField
        v-if="shareFallback"
        :model-value="shareFallback"
        :label="c.shareFallback"
        class="mt-3"
        variant="outlined"
        readonly
        hide-details
        @focus="($event.target as HTMLInputElement).select()"
      />
      <p v-if="sort !== 'name'" class="filter-hint">{{ c.sortHint }}</p>
      <div class="filter-checks">
        <VCheckbox v-model="pricedOnly" :label="c.pricesOnly" density="compact" hide-details />
        <VCheckbox v-model="vehicleOnly" :label="c.vehicleOnly" density="compact" hide-details />
        <VCheckbox
          v-if="department"
          v-model="localOnly"
          :label="c.localOnly"
          density="compact"
          hide-details
        />
      </div>
      <p class="filter-hint">{{ c.coverageHint }}</p>
      <div class="result-status">
        <p role="status" aria-live="polite">
          {{
            c.results
              .replace('{shown}', String(filtered.length))
              .replace('{total}', String(MOVING_PROVIDERS.length))
          }}
          · {{ c.countPrices.replace('{count}', String(pricedCount)) }}
        </p>
        <VBtn v-if="hasFilters" variant="text" size="small" @click="reset">{{ c.reset }}</VBtn>
      </div>
      <p v-if="locale !== 'es'" class="moving-meta">{{ c.original }}</p>
      <div v-if="!filtered.length" class="empty-results">
        <h3>{{ c.emptyTitle }}</h3>
        <p>{{ c.empty }}</p>
        <VBtn color="primary" variant="tonal" @click="reset">{{ c.reset }}</VBtn>
      </div>
      <template v-for="(provider, index) in visible" :key="provider.id">
        <p
          v-if="
            sort !== 'name' &&
            (index === 0 || priceGroup(provider) !== priceGroup(visible[index - 1]!))
          "
          class="price-group"
        >
          {{ priceGroupLabel(provider) }}
        </p>
        <VisibleProviderRow
          :provider="provider"
          :category="category"
          :query="query || ''"
          :sort-by-price="sort !== 'name'"
          :comparison-price="movingPriceForSort(provider, activeFilters)"
        />
      </template>
      <VBtn
        v-if="visible.length < filtered.length"
        variant="tonal"
        color="primary"
        class="my-4"
        @click="limit += 18"
        >{{ c.loadMore }} ({{ filtered.length - visible.length }})</VBtn
      >
    </section>

    <section id="comparar" class="guide-section" aria-labelledby="compare-title">
      <h2 id="compare-title">{{ c.compareTitle }}</h2>
      <p class="moving-lead">{{ c.compareIntro }}</p>
      <dl class="quote-checklist">
        <div v-for="item in c.checklist" :key="item.title">
          <dt>{{ item.title }}</dt>
          <dd>{{ item.text }}</dd>
        </div>
      </dl>
      <h3>{{ c.nextTitle }}</h3>
      <div class="next-links">
        <NuxtLink :to="localePath('/primer-alquiler-uruguay')">{{ c.paperwork }}</NuxtLink>
        <NuxtLink :to="localePath('/equipar-casa-uruguay')">{{ c.furnish }}</NuxtLink>
      </div>
    </section>

    <section id="fuentes" class="guide-section" aria-labelledby="sources-title">
      <h2 id="sources-title">{{ c.methodTitle }}</h2>
      <p>{{ c.method }}</p>
      <p>{{ c.methodology }}</p>
      <p>{{ c.coverageMethod }}</p>
      <p>{{ c.priceMethod }}</p>
      <details class="source-index">
        <summary>{{ c.sourceMore }} ({{ sourceIndex.length }})</summary>
        <ul>
          <li v-for="source in sourceIndex" :key="source.url">
            <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.title }}</a> ·
            {{ source.accessedAt }}
          </li>
        </ul>
      </details>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { defineAsyncComponent, hydrateOnVisible } from 'vue'
import ProviderRow from '~/components/moving/ProviderRow.vue'
import {
  MOVING_CATEGORIES,
  MOVING_DEPARTMENTS,
  MOVING_PATH,
  MOVING_PROVIDERS,
  MOVING_REVIEWED,
  filterMovingProviders,
  movingEvidenceAge,
  movingPricesFor,
  readMovingQuery,
  buildMovingQuery,
  sortMovingProviders,
  movingPriceForSort,
  movingPriceGroupKey,
  type MovingDirectoryState,
  type MovingProvider,
  type MovingSort,
} from '~/utils/movingServices'
import { movingServicesCopy } from '~/utils/movingServicesCopy'

// Keep the component import in the SSR manifest so its CSS is present even
// without JavaScript. Only hydration waits for the row to approach the viewport.
const VisibleProviderRow = defineAsyncComponent({
  loader: () => Promise.resolve(ProviderRow),
  hydrate: hydrateOnVisible({ rootMargin: '200px' }),
})

const { locale } = useI18n()
const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()
const c = computed(() => movingServicesCopy(locale.value))
const directoryState = computed(() => readMovingQuery(route.query))
const query = ref<string | null>(directoryState.value.query)
const category = computed({
  get: () => directoryState.value.category,
  set: value => updateState({ category: value }),
})
const department = computed({
  get: () => directoryState.value.department,
  set: value => updateState({ department: value }),
})
const pricedOnly = computed({
  get: () => directoryState.value.pricedOnly,
  set: value => updateState({ pricedOnly: value }),
})
const vehicleOnly = computed({
  get: () => directoryState.value.vehicleOnly,
  set: value => updateState({ vehicleOnly: value }),
})
const localOnly = computed({
  get: () => directoryState.value.localOnly,
  set: value => updateState({ localOnly: value }),
})
const sort = computed({
  get: () => directoryState.value.sort,
  set: (value: MovingSort) => updateState({ sort: value }),
})
let queryTimer: ReturnType<typeof setTimeout> | undefined
let draftRevision = 0
const ownNavigations = new Map<string, { draftRevision: number }>()
function scheduleQueryUpdate() {
  if (queryTimer) clearTimeout(queryTimer)
  const value = query.value || ''
  if (ownNavigations.size || value.trim() === directoryState.value.query) return
  queryTimer = setTimeout(() => updateState({ query: query.value || '' }, true), 300)
}
function updateState(patch: Partial<MovingDirectoryState>, replace = false) {
  if (queryTimer) clearTimeout(queryTimer)
  const nextQuery = buildMovingQuery(
    { ...directoryState.value, query: query.value || '', ...patch },
    route.query
  )
  const target = { path: route.path, query: nextQuery, hash: route.hash }
  const fullPath = router.resolve(target).fullPath
  if (fullPath === route.fullPath) return
  const navigation = { draftRevision }
  ownNavigations.set(fullPath, navigation)
  const failed = () => {
    if (ownNavigations.get(fullPath) !== navigation) return
    ownNavigations.delete(fullPath)
    if (draftRevision > navigation.draftRevision) scheduleQueryUpdate()
  }
  return (replace ? router.replace(target) : router.push(target)).then(
    failure => {
      if (failure) failed()
      return failure
    },
    error => {
      failed()
      throw error
    }
  )
}
watch(
  query,
  () => {
    draftRevision++
    scheduleQueryUpdate()
  },
  { flush: 'sync' }
)
watch(
  () => route.fullPath,
  () => {
    // Nuxt can expose useRoute after router.push resolves. Keep our marker until
    // that acknowledgement, so a late reset cannot erase a more recent draft.
    const navigation = ownNavigations.get(route.fullPath)
    if (navigation) ownNavigations.delete(route.fullPath)
    else ownNavigations.clear()
    const value = directoryState.value.query
    const newerDraft = navigation && draftRevision > navigation.draftRevision
    if (!newerDraft && (query.value || '').trim() !== value) query.value = value
    scheduleQueryUpdate()
  }
)
onBeforeUnmount(() => {
  if (queryTimer) clearTimeout(queryTimer)
  ownNavigations.clear()
})
const limit = ref(18)
const hasFilters = computed(() =>
  Boolean(
    category.value ||
      department.value ||
      query.value ||
      pricedOnly.value ||
      vehicleOnly.value ||
      localOnly.value ||
      sort.value !== 'name'
  )
)
const categoryOptions = computed(() => [
  { title: c.value.allServices, value: '' },
  ...MOVING_CATEGORIES.map(value => ({ title: c.value.categories[value], value })),
])
const departmentOptions = computed(() => [
  { title: c.value.allDepartments, value: '' },
  ...MOVING_DEPARTMENTS.map(value => ({ title: value, value })),
])
const sortOptions = computed(() => [
  { title: c.value.sortName, value: 'name' },
  { title: c.value.sortPriceAsc, value: 'price-asc' },
  { title: c.value.sortPriceDesc, value: 'price-desc' },
])
const activeFilters = computed(() => ({
  category: category.value,
  department: department.value,
  query: query.value || '',
  pricedOnly: pricedOnly.value,
  vehicleOnly: vehicleOnly.value,
  localOnly: localOnly.value,
}))
const filtered = computed(() =>
  sortMovingProviders(
    filterMovingProviders(MOVING_PROVIDERS, activeFilters.value),
    activeFilters.value,
    sort.value
  )
)
const visible = computed(() => filtered.value.slice(0, limit.value))
const pricedCount = computed(
  () =>
    filtered.value.filter(provider =>
      movingPricesFor(provider, category.value).some(price => !price.additional)
    ).length
)
watch([category, department, query, pricedOnly, vehicleOnly, localOnly, sort], () => {
  limit.value = 18
  shareMessage.value = ''
  shareFallback.value = ''
})
function reset() {
  query.value = ''
  return updateState({
    category: '',
    department: '',
    query: '',
    pricedOnly: false,
    vehicleOnly: false,
    localOnly: false,
    sort: 'name',
  })
}
function priceGroup(provider: MovingProvider) {
  return movingPriceGroupKey(movingPriceForSort(provider, activeFilters.value))
}
function priceGroupLabel(provider: MovingProvider) {
  const price = movingPriceForSort(provider, activeFilters.value)
  return price
    ? `${c.value.categories[price.category]} · ${price.currency} / ${c.value.units[price.unit]}`
    : c.value.noComparablePrice
}
const shareMessage = ref('')
const shareFallback = ref('')
async function shareSearch() {
  await updateState({ query: query.value || '' }, true)
  await nextTick()
  // Share only this directory's controls; unrelated tracking parameters stay out of copied links.
  const path = router.resolve({
    path: route.path,
    query: buildMovingQuery(directoryState.value),
  }).fullPath
  const url = new URL(path, window.location.origin).href
  try {
    await navigator.clipboard.writeText(url)
    shareMessage.value = c.value.shareCopied
  } catch {
    shareFallback.value = url
    shareMessage.value = c.value.shareFallback
  }
}
const reviewed = computed(() =>
  new Intl.DateTimeFormat(
    locale.value === 'en' ? 'en-US' : locale.value === 'pt' ? 'pt-BR' : 'es-UY',
    { dateStyle: 'medium', timeZone: 'UTC' }
  ).format(new Date(`${MOVING_REVIEWED}T12:00:00Z`))
)
// Keep SSR and hydration on the same date, including around midnight.
const today = useState('moving-directory-date', () => new Date().toISOString().slice(0, 10))
const stale = computed(() => (movingEvidenceAge(MOVING_REVIEWED, today.value) ?? 0) > 90)
const sourceIndex = [
  ...new Map(
    MOVING_PROVIDERS.flatMap(provider => provider.sources).map(source => [source.url, source])
  ).values(),
]
const canonical = computed(() => `https://cambio-uruguay.com${localePath(MOVING_PATH)}`)
defineOgImageComponent('Cambio', {
  title: () => c.value.title,
  subtitle: () => c.value.description,
  tag: 'VIVIENDA',
})
useSeoMeta({
  title: () => `${c.value.title} | Cambio Uruguay`,
  description: () => c.value.description,
  ogTitle: () => c.value.title,
  ogDescription: () => c.value.description,
  ogType: 'website',
  ogUrl: () => canonical.value,
  twitterCard: 'summary_large_image',
})
useHead(() => ({
  link: [{ rel: 'canonical', href: canonical.value }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: c.value.title,
        description: c.value.description,
        url: canonical.value,
        dateModified: MOVING_REVIEWED,
        inLanguage: locale.value,
        about: { '@type': 'Thing', name: 'Servicios para mudanzas en Uruguay' },
        // The visible page is a researched directory, not a merchant offering these services.
        citation: sourceIndex.map(source => source.url),
      }).replace(/</g, '\\u003c'),
    },
  ],
}))
</script>

<style scoped>
.moving-page {
  max-width: 1160px;
}
.moving-page h1 {
  margin: 16px 0 0;
  max-width: 30ch;
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  text-wrap: balance;
}
.moving-page h2 {
  margin: 0 0 16px;
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  font-weight: 700;
  line-height: 1.2;
}
.moving-page h3 {
  margin: 24px 0 8px;
  font-size: 1.25rem;
}
.moving-page p {
  margin: 12px 0 0;
  max-width: 75ch;
}
.moving-page a {
  color: rgb(var(--v-theme-link));
  text-underline-offset: 3px;
}
.moving-page a:focus-visible,
summary:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 4px;
}
.back-link {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  font-size: 0.875rem;
}
.moving-lead {
  font-size: 1.075rem;
  line-height: 1.65;
}
.moving-meta,
.filter-hint {
  font-size: 0.8rem;
  line-height: 1.5;
}
.page-jumps {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 24px;
  margin: 8px 0 16px;
}
.page-jumps a {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  font-size: 0.875rem;
}
.directory-section,
.guide-section {
  scroll-margin-top: 90px;
}
.directory-filters {
  display: grid;
  grid-template-columns: 1fr 1fr 1.2fr;
  gap: 16px;
}
.filter-checks {
  display: flex;
  flex-wrap: wrap;
  gap: 0 24px;
  margin-top: 8px;
}
.filter-checks :deep(.v-selection-control) {
  flex: 0 1 auto;
}
.filter-checks :deep(.v-label) {
  font-size: 0.875rem;
  opacity: 1;
}
.result-status {
  display: flex;
  gap: 8px 16px;
  align-items: center;
  justify-content: space-between;
  margin: 16px 0 8px;
}
.result-status p {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
}
.empty-results {
  padding: 24px 0;
  border-top: 1px solid rgba(var(--v-border-color), 0.25);
}
.directory-order {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
  margin-top: 16px;
}
.sort-control {
  flex: 0 1 370px;
  min-width: 280px;
}
.share-status {
  font-size: 0.875rem;
}
.moving-page .price-group {
  margin: 28px 0 12px;
  font-size: 1rem;
  font-weight: 700;
}
.empty-results h3 {
  margin-top: 0;
}
.empty-results p {
  margin-bottom: 16px;
}
.guide-section {
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid rgba(var(--v-border-color), 0.25);
}
.quote-checklist {
  margin: 24px 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px 40px;
}
.quote-checklist dt {
  font-weight: 700;
}
.quote-checklist dd {
  margin: 8px 0 0;
  line-height: 1.6;
  font-size: 0.95rem;
}
.next-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
}
.next-links a {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
}
.source-index {
  margin-top: 24px;
  font-size: 0.875rem;
}
.source-index summary {
  padding: 12px 0;
  font-weight: 600;
  cursor: pointer;
}
.source-index ul {
  padding-left: 20px;
  margin-top: 8px;
}
.source-index li {
  margin: 8px 0;
  overflow-wrap: anywhere;
}
@media (max-width: 700px) {
  .moving-page h1 {
    margin-top: 8px;
  }
  .moving-lead {
    font-size: 1rem;
    line-height: 1.5;
  }
  .directory-filters {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .directory-filters > :last-child {
    grid-column: 1 / -1;
  }
  .filter-checks {
    display: block;
  }
  .sort-control {
    flex-basis: 100%;
    min-width: 0;
  }
  .quote-checklist {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .result-status {
    flex-wrap: wrap;
  }
}
@media (max-width: 380px) {
  .directory-filters {
    grid-template-columns: 1fr;
  }
}
</style>
