<!--
THESIS: One row per chair, every platform priced side by side — the duplicate listings are the
problem this section exists to remove.
OWN-WORLD: Cambio Uruguay navy surfaces and action blue on a catalogue layout people already know:
sticky facet rail, results toolbar, removable filter chips.
STORY: Set a budget and a type, watch the count fall, open the chair that fits.
-->
<template>
  <section class="chair-market" aria-labelledby="chair-market-title">
    <header class="market-head">
      <div>
        <p class="market-kicker">{{ t('chairMarket.kicker') }}</p>
        <h2 id="chair-market-title">{{ t('chairMarket.title') }}</h2>
        <p class="market-lead">{{ t('chairMarket.lead') }}</p>
      </div>

      <dl v-if="meta" class="market-stats">
        <div>
          <dt>{{ t('chairMarket.statChairs') }}</dt>
          <dd>{{ meta.products }}</dd>
        </div>
        <div>
          <dt>{{ t('chairMarket.statOffers') }}</dt>
          <dd>{{ meta.offers }}</dd>
        </div>
        <div>
          <dt>{{ t('chairMarket.statSellers') }}</dt>
          <dd>{{ meta.sellers }}</dd>
        </div>
        <div>
          <dt>{{ t('chairMarket.statUpdated') }}</dt>
          <dd>
            <time :datetime="meta.asOf">{{ formatDate(meta.asOf) }}</time>
          </dd>
        </div>
      </dl>
    </header>

    <div class="market-layout">
      <!-- Facet rail: sticky on desktop, the same panel inside a sheet on phones. -->
      <aside class="facet-rail" :aria-label="t('chairMarket.filtersTitle')">
        <div class="facet-rail__inner">
          <ChairsChairFilterPanel
            :filters="filters"
            :brands="brands"
            :budget-ceiling="budgetCeiling"
            :category-items="categoryItems"
            :condition-items="conditionItems"
            :rating-items="ratingItems"
            :brand-items="brandItems"
            @update:filters="applyFilters"
            @clear="resetFilters"
          />
        </div>
      </aside>

      <div class="market-results">
        <!-- Results toolbar: stays under the app bar so sorting and the count are always reachable. -->
        <div class="results-bar">
          <VBtn
            class="d-lg-none"
            variant="tonal"
            rounded="lg"
            size="small"
            prepend-icon="mdi-tune-variant"
            @click="filtersOpen = true"
          >
            {{ t('chairMarket.openFilters') }}
            <VBadge
              v-if="activeFilters.length"
              color="primary"
              :content="activeFilters.length"
              inline
            />
          </VBtn>

          <p class="results-bar__count" aria-live="polite">
            {{ t('chairMarket.showing', { shown: visible.length, total: products.length }) }}
          </p>

          <VSelect
            v-model="filters.sort"
            :items="sortItems"
            :label="t('chairMarket.sortLabel')"
            variant="outlined"
            density="compact"
            hide-details
            rounded="lg"
            class="results-bar__sort"
          />
        </div>

        <div v-if="activeFilters.length" class="active-filters">
          <VChip
            v-for="chip in activeFilters"
            :key="chip.id"
            size="small"
            variant="tonal"
            color="primary"
            closable
            :aria-label="t('chairMarket.removeFilter', { filter: chip.label })"
            @click:close="chip.clear()"
          >
            {{ chip.label }}
          </VChip>
          <VBtn variant="text" size="small" rounded="lg" @click="resetFilters">
            {{ t('chairMarket.clearAll') }}
          </VBtn>
        </div>

        <VAlert v-if="!pending && !products.length" type="info" variant="tonal" rounded="lg">
          {{ t('chairMarket.empty') }}
        </VAlert>

        <VAlert v-else-if="!pending && !visible.length" type="info" variant="tonal" rounded="lg">
          {{ t('chairMarket.noMatches') }}
          <template #append>
            <VBtn variant="text" size="small" @click="resetFilters">
              {{ t('chairMarket.clearAll') }}
            </VBtn>
          </template>
        </VAlert>

        <div v-if="pending" class="market-grid">
          <VSkeletonLoader
            v-for="index in 6"
            :key="index"
            type="image, heading, text"
            color="transparent"
          />
        </div>

        <ul v-else class="market-grid">
          <VCard
            v-for="product in paged"
            :key="product.slug"
            tag="li"
            class="market-card"
            rounded="lg"
            variant="outlined"
          >
            <NuxtLink
              :to="localePath(`/sillas-escritorio-uruguay/${product.slug}`)"
              class="card-media"
              tabindex="-1"
              aria-hidden="true"
            >
              <img
                v-if="product.images[0]"
                :src="product.images[0].url"
                :alt="product.images[0].alt"
                loading="lazy"
                decoding="async"
              />
              <span v-else class="card-media__fallback">
                <VIcon icon="mdi-chair-rolling" size="42" />
              </span>
              <VChip
                v-if="product.tier"
                class="card-tier"
                size="x-small"
                variant="flat"
                color="amber"
              >
                Tier {{ product.tier }}
              </VChip>
            </NuxtLink>

            <div class="card-body">
              <h3 class="card-title">
                <NuxtLink :to="localePath(`/sillas-escritorio-uruguay/${product.slug}`)">
                  {{ product.name }}
                </NuxtLink>
              </h3>

              <p class="card-rating">
                <span class="stars" role="img" :aria-label="ratingAria(product)">
                  <VIcon
                    v-for="(icon, index) in starIcons(product.stars)"
                    :key="index"
                    :icon="icon"
                    size="15"
                  />
                </span>
                <span v-if="product.stars !== null" class="stars-value">
                  {{ product.stars.toFixed(1) }}
                </span>
                <span class="stars-count">
                  {{
                    product.ratingCount
                      ? t('chairMarket.ratingCount', { count: product.ratingCount })
                      : t('chairMarket.noRating')
                  }}
                </span>
              </p>

              <p class="card-price">
                <strong>{{ bestPriceLabel(product) }}</strong>
                <span
                  v-if="product.price && product.price.max > product.price.min"
                  class="card-price__range"
                >
                  {{ t('chairMarket.upTo', { price: formatChairPrice(product.price.max) }) }}
                </span>
              </p>

              <ul class="card-platforms">
                <li v-for="group in platformSummary(product)" :key="group.source">
                  <VIcon :icon="chairSourceIcon(group.source)" size="14" />
                  {{ t(`chairMarket.source.${group.source}`) }}
                  <span>{{ group.count }}</span>
                </li>
              </ul>

              <!-- Pinned to the bottom, so every card in a row lines its actions up. -->
              <div class="card-actions">
                <VBtn
                  :to="localePath(`/sillas-escritorio-uruguay/${product.slug}`)"
                  variant="flat"
                  color="primary"
                  size="small"
                  rounded="lg"
                  block
                >
                  {{ t('chairMarket.viewChair') }}
                </VBtn>
                <VBtn
                  v-if="bestChairOffer(product)"
                  :href="bestChairOffer(product)!.url"
                  target="_blank"
                  rel="nofollow noopener"
                  variant="text"
                  size="small"
                  rounded="lg"
                  block
                  append-icon="mdi-open-in-new"
                >
                  {{ t('chairMarket.goToOffer', { seller: bestChairOffer(product)!.seller }) }}
                </VBtn>
              </div>
            </div>
          </VCard>
        </ul>

        <div v-if="visible.length > paged.length" class="market-more">
          <VBtn variant="tonal" rounded="lg" size="large" @click="pageSize += 24">
            {{ t('chairMarket.loadMore') }}
          </VBtn>
        </div>

        <details v-if="meta?.sources?.length" class="market-sources">
          <summary>{{ t('chairMarket.sourcesTitle') }}</summary>
          <p class="market-sources__note">
            {{ t('chairMarket.sourcesNote', { rate: meta.usdUyu.toFixed(2) }) }}
          </p>
          <table class="cu-mobile-cards">
            <thead>
              <tr>
                <th scope="col">{{ t('chairMarket.sourceName') }}</th>
                <th scope="col">{{ t('chairMarket.sourceListings') }}</th>
                <th scope="col">{{ t('chairMarket.sourceStatus') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="source in meta.sources" :key="source.key">
                <td :data-label="t('chairMarket.sourceName')">{{ source.label }}</td>
                <td :data-label="t('chairMarket.sourceListings')">{{ source.listings }}</td>
                <td :data-label="t('chairMarket.sourceStatus')">
                  <VChip :color="source.ok ? 'success' : 'warning'" size="x-small" variant="tonal">
                    {{ source.ok ? t('chairMarket.sourceOk') : t('chairMarket.sourceFail') }}
                  </VChip>
                  <span class="market-sources__detail">{{ source.note }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </details>
      </div>
    </div>

    <!-- Phones get the same facets as a full-screen sheet, the pattern every catalogue app uses. -->
    <VDialog v-model="filtersOpen" fullscreen transition="dialog-bottom-transition">
      <VCard>
        <VToolbar density="comfortable" color="surface">
          <VToolbarTitle>{{ t('chairMarket.filtersTitle') }}</VToolbarTitle>
          <VBtn
            icon="mdi-close"
            :aria-label="t('chairMarket.closeFilters')"
            @click="filtersOpen = false"
          />
        </VToolbar>
        <VCardText>
          <ChairsChairFilterPanel
            :filters="filters"
            :brands="brands"
            :budget-ceiling="budgetCeiling"
            :category-items="categoryItems"
            :condition-items="conditionItems"
            :rating-items="ratingItems"
            :brand-items="brandItems"
            @update:filters="applyFilters"
            @clear="resetFilters"
          />
        </VCardText>
        <VCardActions class="filter-sheet__actions">
          <VBtn color="primary" variant="flat" block rounded="lg" @click="filtersOpen = false">
            {{ t('chairMarket.showResults', { count: visible.length }) }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </section>
</template>

<script setup lang="ts">
import {
  bestChairOffer,
  chairSourceIcon,
  emptyChairFilters,
  filterChairProducts,
  formatChairPrice,
  platformSummary,
  starIcons,
  type ChairCatalogCard,
  type ChairCatalogMeta,
  type ChairCategory,
  type ChairDirectoryFilters,
} from '~/utils/chairCatalog'

const props = defineProps<{
  products: ChairCatalogCard[]
  meta: ChairCatalogMeta | null
  pending: boolean
  brands: Array<{ value: string; count: number }>
  priceMax: number
}>()

const { t, locale } = useI18n()
const localePath = useLocalePath()

const filters = reactive<ChairDirectoryFilters>(emptyChairFilters())
const pageSize = ref(24)
const filtersOpen = ref(false)

const budgetCeiling = computed(() =>
  Math.max(20000, Math.ceil((props.priceMax || 60000) / 1000) * 1000)
)

const sortItems = computed(() => [
  { value: 'relevance', title: t('chairMarket.sort.relevance') },
  { value: 'price-asc', title: t('chairMarket.sort.priceAsc') },
  { value: 'price-desc', title: t('chairMarket.sort.priceDesc') },
  { value: 'rating', title: t('chairMarket.sort.rating') },
  { value: 'sellers', title: t('chairMarket.sort.sellers') },
])

const brandItems = computed(() => [
  { value: 'all', title: t('chairMarket.allBrands') },
  ...props.brands.map(brand => ({ value: brand.value, title: `${brand.value} (${brand.count})` })),
])

const categoryItems = computed<Array<{ value: ChairCategory | 'all'; title: string }>>(() => [
  { value: 'all', title: t('chairMarket.category.all') },
  { value: 'ergonomic', title: t('chairMarket.category.ergonomic') },
  { value: 'gaming', title: t('chairMarket.category.gaming') },
  { value: 'executive', title: t('chairMarket.category.executive') },
  { value: 'operative', title: t('chairMarket.category.operative') },
])

const conditionItems = computed<Array<{ value: 'all' | 'new' | 'used'; title: string }>>(() => [
  { value: 'all', title: t('chairMarket.condition.all') },
  { value: 'new', title: t('chairMarket.condition.new') },
  { value: 'used', title: t('chairMarket.condition.used') },
])

const ratingItems = computed(() => [
  { value: 0, title: t('chairMarket.rating.any') },
  { value: 3, title: t('chairMarket.rating.from', { stars: 3 }) },
  { value: 4, title: t('chairMarket.rating.from', { stars: 4 }) },
  { value: 4.5, title: t('chairMarket.rating.from', { stars: '4,5' }) },
])

const visible = computed(() => filterChairProducts(props.products, filters))
const paged = computed(() => visible.value.slice(0, pageSize.value))

const applyFilters = (next: ChairDirectoryFilters): void => {
  Object.assign(filters, next)
}

function resetFilters(): void {
  Object.assign(filters, emptyChairFilters())
}

/** Removable summary of what is currently narrowing the list. */
const activeFilters = computed(() => {
  const chips: Array<{ id: string; label: string; clear: () => void }> = []
  if (filters.query.trim()) {
    chips.push({
      id: 'query',
      label: `"${filters.query.trim()}"`,
      clear: () => (filters.query = ''),
    })
  }
  if (filters.category !== 'all') {
    chips.push({
      id: 'category',
      label: t(`chairMarket.category.${filters.category}`),
      clear: () => (filters.category = 'all'),
    })
  }
  if (filters.brand !== 'all') {
    chips.push({ id: 'brand', label: filters.brand, clear: () => (filters.brand = 'all') })
  }
  if (filters.condition !== 'all') {
    chips.push({
      id: 'condition',
      label: t(`chairMarket.condition.${filters.condition}`),
      clear: () => (filters.condition = 'all'),
    })
  }
  if (filters.maxPrice !== null) {
    chips.push({
      id: 'price',
      label: t('chairMarket.upTo', { price: formatChairPrice(filters.maxPrice) }),
      clear: () => (filters.maxPrice = null),
    })
  }
  if (filters.minStars > 0) {
    chips.push({
      id: 'stars',
      label: t('chairMarket.rating.from', { stars: filters.minStars }),
      clear: () => (filters.minStars = 0),
    })
  }
  return chips
})

watch(
  () => [
    filters.query,
    filters.category,
    filters.brand,
    filters.condition,
    filters.sort,
    filters.maxPrice,
    filters.minStars,
  ],
  () => {
    pageSize.value = 24
  }
)

const formatDate = (value: string): string =>
  new Date(value).toLocaleDateString(locale.value, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

function bestPriceLabel(product: ChairCatalogCard): string {
  const offer = bestChairOffer(product)
  if (!offer) return t('chairMarket.noPrice')
  return t('chairMarket.fromPrice', { price: formatChairPrice(offer.priceUyu) })
}

const ratingAria = (product: ChairCatalogCard): string =>
  product.stars === null
    ? t('chairMarket.noRating')
    : t('chairMarket.ratingAria', {
        stars: product.stars.toFixed(1),
        count: product.ratingCount,
      })
</script>

<style scoped>
.chair-market {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: 48px;
}

.market-head {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  justify-content: space-between;
  align-items: flex-end;
}

.market-kicker {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  /* Action Blue reaches only 4.18:1 on Midnight Canvas, and 12px bold needs 4.5:1. The palette's
     dark-surface accent is Link Sky; light mode takes the deeper Ink Blue. */
  color: #64b5f6;
  margin: 0 0 6px;
}

.v-theme--light .market-kicker {
  color: #1565c0;
}

.market-head h2 {
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.01em;
  margin: 0;
}

.market-lead {
  margin: 8px 0 0;
  max-width: 62ch;
  opacity: 0.82;
}

.market-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin: 0;
}

.market-stats dt {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.0333em;
  text-transform: uppercase;
  opacity: 0.75;
}

.market-stats dd {
  margin: 2px 0 0;
  font-size: 1.25rem;
  font-variant-numeric: tabular-nums;
}

/* Catalogue layout: facets on the left, results on the right. */
.market-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 24px;
  /* NOT align-items: start — that shrink-wraps the rail to its own height, leaving position:
     sticky no room to travel, so the facets scrolled away with the first screen of results. */
  align-items: stretch;
}

.facet-rail__inner {
  position: sticky;
  /* Clears the app bar; the rail scrolls on its own when the facets are taller than the viewport. */
  top: 88px;
  max-height: calc(100vh - 108px);
  overflow-y: auto;
  padding-right: 4px;
}

.market-results {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.results-bar {
  position: sticky;
  top: 64px;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  background: rgb(var(--v-theme-background));
  border-bottom: 1px solid rgba(var(--v-border-color), 0.14);
}

.results-bar__count {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.0333em;
  opacity: 0.85;
}

.results-bar__sort {
  margin-left: auto;
  max-width: 220px;
}

.active-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.market-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
  list-style: none;
  padding: 0;
  margin: 0;
}

.market-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.card-media {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 4 / 3;
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.card-media img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 10px;
}

.card-media__fallback {
  opacity: 0.35;
}

.card-tier {
  position: absolute;
  top: 10px;
  left: 10px;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  /* Lets the actions sit at the bottom of every card, whatever the title length. */
  flex: 1 1 auto;
}

.card-title {
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.35;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.7em;
}

.card-title a {
  color: inherit;
  text-decoration: none;
}

.card-title a:hover {
  text-decoration: underline;
}

.card-rating {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 0.75rem;
}

.stars {
  color: rgb(var(--v-theme-warning));
  display: inline-flex;
}

.stars-value {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.stars-count {
  opacity: 0.8;
}

.card-price {
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.card-price strong {
  font-size: 1.25rem;
  font-variant-numeric: tabular-nums;
}

.card-price__range {
  font-size: 0.75rem;
  opacity: 0.8;
}

.card-platforms {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 0.75rem;
}

.card-platforms li {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.07);
}

.card-platforms span {
  font-variant-numeric: tabular-nums;
  opacity: 0.8;
}

.card-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: auto;
  padding-top: 8px;
}

.market-more {
  display: flex;
  justify-content: center;
  padding: 8px 0 4px;
}

.filter-sheet__actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  padding: 12px 16px 20px;
  border-top: 1px solid rgba(var(--v-border-color), 0.14);
}

.market-sources {
  border-top: 1px solid rgba(var(--v-border-color), 0.16);
  padding-top: 14px;
}

.market-sources summary {
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.0333em;
}

.market-sources__note {
  margin: 10px 0;
  font-size: 0.75rem;
  opacity: 0.85;
}

.market-sources table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.75rem;
}

.market-sources th,
.market-sources td {
  text-align: left;
  padding: 6px 8px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
  vertical-align: top;
}

.market-sources__detail {
  display: block;
  opacity: 0.85;
  font-size: 0.75rem;
  margin-top: 2px;
}

@media (max-width: 1279px) {
  .market-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .facet-rail {
    display: none;
  }

  .results-bar__sort {
    max-width: 170px;
  }
}

@media (max-width: 599px) {
  .chair-market {
    margin-top: 32px;
  }

  .market-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .market-grid {
    grid-template-columns: repeat(auto-fill, minmax(155px, 1fr));
    gap: 12px;
  }

  .card-body {
    padding: 12px;
    gap: 6px;
  }

  .card-price strong {
    font-size: 1rem;
  }
}
</style>
