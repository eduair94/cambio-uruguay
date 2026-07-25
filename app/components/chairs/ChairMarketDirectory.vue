<!--
THESIS: One row per chair, every platform priced side by side — the duplicate listings are the
problem this section exists to remove.
OWN-WORLD: Navy market board, semantic price chips, evidence kept next to every star rating.
STORY: Set a budget and a priority, watch the board reorder, open the chair that fits.
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

    <div class="market-controls" role="search">
      <VTextField
        v-model="filters.query"
        :label="t('chairMarket.searchLabel')"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="comfortable"
        hide-details
        clearable
        rounded="lg"
        class="control-search"
      />

      <VSelect
        v-model="filters.sort"
        :items="sortItems"
        :label="t('chairMarket.sortLabel')"
        variant="outlined"
        density="comfortable"
        hide-details
        rounded="lg"
        class="control-select"
      />

      <VSelect
        v-model="filters.brand"
        :items="brandItems"
        :label="t('chairMarket.brandLabel')"
        variant="outlined"
        density="comfortable"
        hide-details
        rounded="lg"
        class="control-select"
      />
    </div>

    <div class="market-filters">
      <div class="filter-chips" role="group" :aria-label="t('chairMarket.categoryLabel')">
        <VChip
          v-for="option in categoryItems"
          :key="option.value"
          :variant="filters.category === option.value ? 'flat' : 'tonal'"
          :color="filters.category === option.value ? 'primary' : undefined"
          size="small"
          :aria-pressed="filters.category === option.value"
          @click="filters.category = option.value"
        >
          {{ option.title }}
        </VChip>
      </div>

      <div class="filter-chips" role="group" :aria-label="t('chairMarket.conditionLabel')">
        <VChip
          v-for="option in conditionItems"
          :key="option.value"
          :variant="filters.condition === option.value ? 'flat' : 'tonal'"
          :color="filters.condition === option.value ? 'primary' : undefined"
          size="small"
          :aria-pressed="filters.condition === option.value"
          @click="filters.condition = option.value"
        >
          {{ option.title }}
        </VChip>
      </div>

      <div class="filter-budget">
        <label :for="budgetId">
          {{ t('chairMarket.budgetLabel') }}
          <strong>{{ budgetLabel }}</strong>
        </label>
        <VSlider
          :id="budgetId"
          v-model="budgetValue"
          :min="0"
          :max="budgetCeiling"
          :step="1000"
          color="primary"
          hide-details
          density="compact"
          :aria-valuetext="budgetLabel"
        />
      </div>
    </div>

    <p class="market-count" aria-live="polite">
      {{ t('chairMarket.showing', { shown: visible.length, total: products.length }) }}
    </p>

    <VAlert v-if="!pending && !products.length" type="info" variant="tonal" rounded="lg">
      {{ t('chairMarket.empty') }}
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
      <li v-for="product in paged" :key="product.slug" class="market-card">
        <NuxtLink :to="localePath(`/sillas-escritorio-uruguay/${product.slug}`)" class="card-media">
          <img
            v-if="product.images[0]"
            :src="product.images[0].url"
            :alt="product.images[0].alt"
            loading="lazy"
            decoding="async"
          />
          <span v-else class="card-media__fallback" aria-hidden="true">
            <VIcon icon="mdi-chair-rolling" size="42" />
          </span>
          <VChip v-if="product.tier" class="card-tier" size="x-small" variant="flat" color="amber">
            Tier {{ product.tier }}
          </VChip>
        </NuxtLink>

        <div class="card-body">
          <h3>
            <NuxtLink :to="localePath(`/sillas-escritorio-uruguay/${product.slug}`)">
              {{ product.name }}
            </NuxtLink>
          </h3>

          <p class="card-rating">
            <span class="stars" :aria-label="ratingAria(product)">
              <VIcon
                v-for="(icon, index) in starIcons(product.stars)"
                :key="index"
                :icon="icon"
                size="15"
              />
            </span>
            <span v-if="product.stars !== null" class="stars-value">{{
              product.stars.toFixed(1)
            }}</span>
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

          <div class="card-actions">
            <VBtn
              :to="localePath(`/sillas-escritorio-uruguay/${product.slug}`)"
              variant="flat"
              color="primary"
              size="small"
              rounded="lg"
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
            >
              {{ t('chairMarket.goToOffer', { seller: bestChairOffer(product)!.seller }) }}
              <VIcon end icon="mdi-open-in-new" size="14" />
            </VBtn>
          </div>
        </div>
      </li>
    </ul>

    <div v-if="visible.length > paged.length" class="market-more">
      <VBtn variant="tonal" rounded="lg" @click="pageSize += 24">
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
  type ChairCatalogMeta,
  type ChairCatalogCard,
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
const budgetId = useId()

const filters = reactive<ChairDirectoryFilters>(emptyChairFilters())
const pageSize = ref(24)

/** The slider is a plain number; `maxPrice: null` means "no budget set". */
const budgetCeiling = computed(() =>
  Math.max(20000, Math.ceil((props.priceMax || 60000) / 1000) * 1000)
)
const budgetValue = computed({
  get: () => filters.maxPrice ?? budgetCeiling.value,
  set: (value: number) => {
    filters.maxPrice = value >= budgetCeiling.value ? null : value
  },
})
const budgetLabel = computed(() =>
  filters.maxPrice === null ? t('chairMarket.budgetAny') : formatChairPrice(filters.maxPrice)
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

const visible = computed(() => filterChairProducts(props.products, filters))
const paged = computed(() => visible.value.slice(0, pageSize.value))

watch(
  () => [
    filters.query,
    filters.category,
    filters.brand,
    filters.condition,
    filters.sort,
    filters.maxPrice,
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
    : t('chairMarket.ratingAria', { stars: product.stars.toFixed(1), count: product.ratingCount })
</script>

<style scoped>
.chair-market {
  display: flex;
  flex-direction: column;
  gap: 20px;
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
  font-weight: 500;
  letter-spacing: 0.0333em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
  margin: 0 0 6px;
}

.market-head h2 {
  font-size: clamp(1.5rem, 3vw, 2.125rem);
  font-weight: 400;
  line-height: 1.18;
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
  letter-spacing: 0.0333em;
  text-transform: uppercase;
  opacity: 0.7;
}

.market-stats dd {
  margin: 2px 0 0;
  font-size: 1.25rem;
  font-variant-numeric: tabular-nums;
}

.market-controls {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
}

.market-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 24px;
  align-items: center;
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-chips .v-chip {
  cursor: pointer;
}

.filter-budget {
  flex: 1 1 260px;
  min-width: 220px;
}

.filter-budget label {
  display: flex;
  gap: 8px;
  font-size: 0.75rem;
  letter-spacing: 0.0333em;
  text-transform: uppercase;
  opacity: 0.75;
}

.filter-budget strong {
  font-variant-numeric: tabular-nums;
  opacity: 1;
}

.market-count {
  margin: 0;
  font-size: 0.75rem;
  opacity: 0.75;
}

.market-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 18px;
  list-style: none;
  padding: 0;
  margin: 0;
}

.market-card {
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  border: 1px solid rgba(var(--v-border-color), 0.16);
  background: rgb(var(--v-theme-surface));
  overflow: hidden;
  transition:
    box-shadow 180ms ease,
    transform 180ms ease;
}

.market-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.32);
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
}

.card-body h3 {
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.35;
  margin: 0;
}

.card-body h3 a {
  color: inherit;
  text-decoration: none;
}

.card-body h3 a:hover {
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
  font-weight: 500;
}

.stars-count {
  opacity: 0.72;
}

.card-price {
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.card-price strong {
  font-size: 1.25rem;
  font-variant-numeric: tabular-nums;
}

.card-price__range {
  font-size: 0.75rem;
  opacity: 0.7;
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
  opacity: 0.7;
}

.card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.market-more {
  display: flex;
  justify-content: center;
}

.market-sources {
  border-top: 1px solid rgba(var(--v-border-color), 0.16);
  padding-top: 14px;
}

.market-sources summary {
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
}

.market-sources__note {
  margin: 10px 0;
  font-size: 0.75rem;
  opacity: 0.75;
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
  opacity: 0.7;
  font-size: 0.75rem;
  margin-top: 2px;
}

@media (max-width: 960px) {
  .market-controls {
    grid-template-columns: 1fr;
  }

  .market-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .market-card,
  .market-card:hover {
    transition: none;
    transform: none;
  }
}
</style>
