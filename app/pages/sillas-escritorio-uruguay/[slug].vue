<!--
THESIS: One chair, every price in the country beside it, and the evidence behind its rating in the
same view — a buyer should be able to stop shopping here.
OWN-WORLD: Navy evidence surfaces, semantic price chips, sourced pros and cons.
STORY: See what it costs where, why it scores what it scores, then read the people who own one.
-->
<template>
  <VContainer class="chair-detail pt-1 pt-sm-4 pb-12">
    <VBreadcrumbs :items="breadcrumbs" density="compact" class="px-0 py-1" />

    <template v-if="pending">
      <VSkeletonLoader type="heading, image, paragraph, table" color="transparent" />
    </template>

    <template v-else-if="!product">
      <VAlert type="info" variant="tonal" rounded="lg" class="mt-4">
        {{ t('chairDetail.notFound') }}
        <template #append>
          <VBtn :to="localePath('/sillas-escritorio-uruguay/precios')" variant="text" size="small">
            {{ t('chairDetail.backToDirectory') }}
          </VBtn>
        </template>
      </VAlert>
    </template>

    <template v-else>
      <header class="detail-head">
        <div class="detail-gallery">
          <img
            v-if="activeImage"
            :src="activeImage.url"
            :alt="activeImage.alt"
            class="detail-photo"
            decoding="async"
          />
          <div v-else class="detail-photo detail-photo--empty" aria-hidden="true">
            <VIcon icon="mdi-chair-rolling" size="64" />
          </div>

          <ul v-if="product.images.length > 1" class="thumbs">
            <li v-for="(image, index) in product.images.slice(0, 5)" :key="image.url">
              <button
                type="button"
                :class="{ 'is-active': index === imageIndex }"
                :aria-label="t('chairDetail.photoOf', { seller: image.sourceName })"
                @click="imageIndex = index"
              >
                <img :src="image.url" :alt="image.alt" loading="lazy" decoding="async" />
              </button>
            </li>
          </ul>
          <p v-if="activeImage" class="photo-credit">
            {{ t('chairDetail.photoCredit') }}
            <a :href="activeImage.sourceUrl" target="_blank" rel="nofollow noopener">
              {{ activeImage.sourceName }}
            </a>
          </p>
        </div>

        <div class="detail-summary">
          <div class="detail-kicker">
            <VChip v-if="product.tier" size="x-small" color="amber" variant="flat">
              Tier {{ product.tier }}
            </VChip>
            <span>{{ t(`chairMarket.category.${product.category}`) }}</span>
          </div>

          <h1>{{ product.name }}</h1>

          <div class="detail-rating">
            <span class="stars" role="img" :aria-label="ratingAria">
              <VIcon
                v-for="(icon, index) in starIcons(product.stars)"
                :key="index"
                :icon="icon"
                size="20"
              />
            </span>
            <strong v-if="product.stars !== null">{{ product.stars.toFixed(1) }}</strong>
            <span class="rating-count">
              {{
                product.ratingCount
                  ? t('chairMarket.ratingCount', { count: product.ratingCount })
                  : t('chairMarket.noRating')
              }}
            </span>
            <VChip size="x-small" variant="tonal" :color="confidenceColor">
              {{ t(`chairDetail.confidence.${product.confidence}`) }}
            </VChip>
          </div>

          <p v-if="product.verdict" class="detail-verdict">{{ product.verdict }}</p>

          <VSheet v-if="product.price" border rounded="lg" class="price-panel pa-4">
            <dl class="price-panel__grid">
              <div>
                <dt>{{ t('chairDetail.bestPrice') }}</dt>
                <dd class="price-panel__lead">{{ formatChairPrice(product.price.min) }}</dd>
              </div>
              <div v-if="product.price.bestNew !== null">
                <dt>{{ t('chairDetail.bestNew') }}</dt>
                <dd>{{ formatChairPrice(product.price.bestNew) }}</dd>
              </div>
              <div v-if="product.price.bestUsed !== null">
                <dt>{{ t('chairDetail.bestUsed') }}</dt>
                <dd>{{ formatChairPrice(product.price.bestUsed) }}</dd>
              </div>
              <div>
                <dt>{{ t('chairDetail.sellers') }}</dt>
                <dd>{{ product.sellers }}</dd>
              </div>
            </dl>
          </VSheet>

          <VBtn
            v-if="best"
            :href="best.url"
            target="_blank"
            rel="nofollow noopener"
            color="primary"
            variant="flat"
            rounded="lg"
            class="mt-2"
          >
            {{
              t('chairDetail.buyAt', {
                seller: best.seller,
                price: formatChairPrice(best.priceUyu),
              })
            }}
            <VIcon end icon="mdi-open-in-new" size="16" />
          </VBtn>
        </div>
      </header>

      <section class="detail-block" aria-labelledby="offers-title">
        <h2 id="offers-title">{{ t('chairDetail.offersTitle') }}</h2>
        <p class="block-lead">{{ t('chairDetail.offersLead') }}</p>

        <div v-for="group in platforms" :key="group.source" class="platform">
          <h3>
            <VIcon :icon="chairSourceIcon(group.source)" size="18" />
            {{ t(`chairMarket.source.${group.source}`) }}
            <span>{{ t('chairDetail.offerCount', { count: group.offers.length }) }}</span>
          </h3>

          <table class="offer-table cu-mobile-cards">
            <thead>
              <tr>
                <th scope="col">{{ t('chairDetail.seller') }}</th>
                <th scope="col">{{ t('chairDetail.listing') }}</th>
                <th scope="col">{{ t('chairDetail.condition') }}</th>
                <th scope="col">{{ t('chairDetail.price') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="offer in group.offers"
                :key="offer.id"
                :class="{ 'is-best': offer.id === best?.id }"
              >
                <td :data-label="t('chairDetail.seller')">
                  {{ offer.seller }}
                  <span v-if="offer.location" class="offer-meta">{{ offer.location }}</span>
                </td>
                <td :data-label="t('chairDetail.listing')">
                  <a :href="offer.url" target="_blank" rel="nofollow noopener">{{ offer.title }}</a>
                  <span v-if="offer.freeShipping" class="offer-meta">{{
                    t('chairDetail.freeShipping')
                  }}</span>
                </td>
                <td :data-label="t('chairDetail.condition')">
                  {{ t(`chairDetail.conditionValue.${offer.condition}`) }}
                </td>
                <td :data-label="t('chairDetail.price')" class="offer-price">
                  <strong>{{ formatChairPrice(offer.price, offer.currency) }}</strong>
                  <span v-if="offer.currency === 'USD'" class="offer-meta">
                    ≈ {{ formatChairPrice(offer.priceUyu) }}
                  </span>
                  <span v-if="!offer.available" class="offer-meta">{{
                    t('chairDetail.outOfStock')
                  }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="disclaimer">
          {{
            t('chairDetail.priceDisclaimer', {
              rate: meta?.usdUyu?.toFixed(2) ?? '—',
              date: observedDate,
            })
          }}
        </p>
      </section>

      <section
        v-if="product.history.length > 1"
        class="detail-block"
        aria-labelledby="history-title"
      >
        <h2 id="history-title">{{ t('chairDetail.historyTitle') }}</h2>
        <p class="block-lead">
          {{ t('chairDetail.historyLead', { days: product.history.length }) }}
          <strong v-if="trend !== null" :class="trend > 0 ? 'trend-up' : 'trend-down'">
            {{ trend > 0 ? '+' : '' }}{{ trend }}%
          </strong>
        </p>
        <!-- A price chart with no price axis asks the reader to trust a shape. The high and low
             sit on the plot, so the line is readable as money rather than as a direction. -->
        <div class="sparkline-plot">
          <svg
            class="sparkline"
            :viewBox="`0 0 ${sparkWidth} ${sparkHeight}`"
            preserveAspectRatio="none"
            role="img"
            :aria-label="
              t('chairDetail.historyAria', {
                first: formatChairPrice(historyRange.first),
                last: formatChairPrice(historyRange.last),
              })
            "
          >
            <polyline :points="sparkArea" fill="currentColor" fill-opacity="0.09" stroke="none" />
            <polyline
              :points="sparkPoints"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              vector-effect="non-scaling-stroke"
            />
          </svg>
          <span class="sparkline-bound is-high">
            {{ t('chairDetail.historyHigh') }} {{ formatChairPrice(historyRange.high) }}
          </span>
          <span class="sparkline-bound is-low">
            {{ t('chairDetail.historyLow') }} {{ formatChairPrice(historyRange.low) }}
          </span>
        </div>
        <p class="sparkline-legend">
          <span>{{ product.history[0]?.date }}</span>
          <span>{{ product.history[product.history.length - 1]?.date }}</span>
        </p>
      </section>

      <section
        v-if="product.pros.length || product.cons.length"
        class="detail-block"
        aria-labelledby="opinion-title"
      >
        <h2 id="opinion-title">{{ t('chairDetail.opinionTitle') }}</h2>
        <div class="opinion-grid">
          <div v-if="product.pros.length">
            <h3>{{ t('chairTiers.pros') }}</h3>
            <ul>
              <li v-for="(point, index) in product.pros" :key="`pro-${index}`">
                {{ point.text }}
                <span class="sources">{{
                  t('chairTiers.supportedBy', { count: point.sourceIds.length })
                }}</span>
              </li>
            </ul>
          </div>
          <div v-if="product.cons.length">
            <h3>{{ t('chairTiers.cons') }}</h3>
            <ul>
              <li v-for="(point, index) in product.cons" :key="`con-${index}`">
                {{ point.text }}
                <span class="sources">{{
                  t('chairTiers.supportedBy', { count: point.sourceIds.length })
                }}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section
        v-if="product.ratingSignals.length"
        class="detail-block"
        aria-labelledby="signals-title"
      >
        <h2 id="signals-title">{{ t('chairDetail.signalsTitle') }}</h2>
        <p class="block-lead">{{ t('chairDetail.signalsLead') }}</p>
        <ul class="signal-list">
          <VCard
            v-for="signal in product.ratingSignals"
            :key="signal.source"
            tag="li"
            variant="outlined"
            rounded="lg"
            class="pa-4"
          >
            <div class="signal-head">
              <strong>{{ t(`chairDetail.signal.${signal.source}`) }}</strong>
              <span>{{ signal.stars.toFixed(1) }} ★</span>
              <span class="signal-weight">{{ Math.round(signal.weight * 100) }}%</span>
            </div>
            <p>{{ signal.detail }}</p>
          </VCard>
        </ul>
      </section>

      <section v-if="product.evidence.length" class="detail-block" aria-labelledby="evidence-title">
        <h2 id="evidence-title">
          {{ t('chairDetail.evidenceTitle', { count: product.evidence.length }) }}
        </h2>
        <p class="block-lead">{{ t('chairDetail.evidenceLead') }}</p>
        <ul class="reddit-evidence">
          <li
            v-for="source in product.evidence"
            :key="source.commentId"
            :class="{ 'is-reply': source.depth > 0 }"
            :style="{ '--reply-depth': Math.min(Math.max(source.depth, 0), 3) }"
          >
            <header>
              <span>
                <VIcon
                  :icon="source.sourceType === 'post' ? 'mdi-post-outline' : 'mdi-reply-outline'"
                  size="15"
                />
                {{
                  source.sourceType === 'post'
                    ? t('chairTiers.sourceType.post')
                    : source.depth > 0
                      ? t('chairTiers.sourceType.reply', { depth: source.depth })
                      : t('chairTiers.sourceType.comment')
                }}
              </span>
              <span>{{ t(`chairTiers.tone.${evidenceTone(source.sentiment)}`) }}</span>
            </header>
            <h3>{{ source.postTitle }}</h3>
            <p>{{ source.body || source.excerpt }}</p>
            <footer>
              <span>
                <VIcon icon="mdi-arrow-up-bold-outline" size="14" />
                {{ source.score }} · {{ evidenceDate(source.date) }}
              </span>
              <a :href="source.permalink" target="_blank" rel="noopener noreferrer">
                {{ t('chairTiers.openReddit') }}
                <VIcon icon="mdi-open-in-new" size="14" />
              </a>
            </footer>
          </li>
        </ul>
      </section>

      <section v-if="product.specs.length" class="detail-block" aria-labelledby="specs-title">
        <h2 id="specs-title">{{ t('chairDetail.specsTitle') }}</h2>
        <p class="block-lead">{{ t('chairDetail.specsLead') }}</p>
        <table class="spec-table cu-mobile-cards">
          <tbody>
            <tr v-for="spec in product.specs" :key="spec.id">
              <th scope="row">{{ spec.label }}</th>
              <td :data-label="spec.label">{{ spec.value }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section v-if="product.reviews.length" class="detail-block" aria-labelledby="reviews-title">
        <h2 id="reviews-title">{{ t('chairDetail.reviewsTitle') }}</h2>
        <ul class="review-list">
          <VCard
            v-for="review in product.reviews"
            :key="review.sourceUrl"
            tag="li"
            variant="tonal"
            rounded="lg"
            class="pa-4"
          >
            <p>{{ review.text }}</p>
            <footer>
              <a :href="review.sourceUrl" target="_blank" rel="nofollow noopener">{{
                review.source
              }}</a>
              <time v-if="review.date" :datetime="review.date">{{ review.date }}</time>
            </footer>
          </VCard>
        </ul>
      </section>

      <!-- Same card grammar as the directory: photo plate, name, rating, price. A row of bare
           underlined links was the one place on the site where a chair had no face. -->
      <section v-if="related.length" class="detail-block" aria-labelledby="related-title">
        <h2 id="related-title">{{ t('chairDetail.relatedTitle') }}</h2>
        <p class="block-lead">{{ t('chairDetail.relatedLead') }}</p>
        <ul class="related-grid">
          <li v-for="item in related" :key="item.slug" class="related-card">
            <NuxtLink :to="localePath(`/sillas-escritorio-uruguay/${item.slug}`)">
              <span class="related-card__media" aria-hidden="true">
                <img
                  v-if="item.images[0]"
                  :src="item.images[0].url"
                  :alt="item.images[0].alt"
                  loading="lazy"
                  decoding="async"
                />
                <VIcon v-else icon="mdi-chair-rolling" size="34" />
              </span>
              <span class="related-card__body">
                <strong>{{ item.name }}</strong>
                <span v-if="item.stars !== null" class="related-card__rating">
                  <VIcon icon="mdi-star" size="14" />
                  {{ item.stars.toFixed(1) }}
                  <span v-if="item.ratingCount">
                    {{ t('chairMarket.ratingCount', { count: item.ratingCount }) }}
                  </span>
                </span>
                <span v-if="item.price" class="related-card__price">
                  {{ t('chairMarket.fromPrice', { price: formatChairPrice(item.price.min) }) }}
                </span>
                <span v-else class="related-card__price is-muted">
                  {{ t('chairMarket.noPrice') }}
                </span>
              </span>
            </NuxtLink>
          </li>
        </ul>
      </section>

      <p class="detail-foot">
        <NuxtLink :to="localePath('/sillas-escritorio-uruguay/precios')">
          <VIcon icon="mdi-arrow-left" size="18" />
          {{ t('chairDetail.backToDirectory') }}
        </NuxtLink>
      </p>
    </template>
  </VContainer>
</template>

<script setup lang="ts">
import { useDisplay } from 'vuetify'
import {
  bestChairOffer,
  chairSourceIcon,
  formatChairPrice,
  offersByPlatform,
  priceTrend,
  starIcons,
  type ChairCatalogMeta,
  type ChairCatalogProduct,
} from '~/utils/chairCatalog'

interface ChairDetailResponse {
  product: ChairCatalogProduct | null
  meta: ChairCatalogMeta | null
  related: ChairCatalogProduct[]
}

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))
const chairDataKey = `chair-detail-${slug.value}`

const { data, pending } = await useAsyncData<ChairDetailResponse>(chairDataKey, () =>
  $fetch(`/api/chairs/${slug.value}`)
)

const product = computed(() => data.value?.product ?? null)
const meta = computed(() => data.value?.meta ?? null)
const related = computed(() => data.value?.related ?? [])
const imageIndex = ref(0)
const activeImage = computed(
  () => product.value?.images[imageIndex.value] ?? product.value?.images[0] ?? null
)
const best = computed(() => (product.value ? bestChairOffer(product.value) : null))
const platforms = computed(() => (product.value ? offersByPlatform(product.value) : []))
const trend = computed(() => (product.value ? priceTrend(product.value) : null))

const confidenceColor = computed(() =>
  product.value?.confidence === 'high'
    ? 'success'
    : product.value?.confidence === 'medium'
      ? 'info'
      : 'warning'
)

const ratingAria = computed(() =>
  !product.value || product.value.stars === null
    ? t('chairMarket.noRating')
    : t('chairMarket.ratingAria', {
        stars: product.value.stars.toFixed(1),
        count: product.value.ratingCount,
      })
)

const observedDate = computed(() => {
  const raw = best.value?.observedAt || meta.value?.asOf
  return raw
    ? new Date(raw).toLocaleDateString(locale.value, { day: '2-digit', month: 'short' })
    : '—'
})

const evidenceTone = (sentiment: number): 'positive' | 'neutral' | 'negative' =>
  sentiment >= 0.25 ? 'positive' : sentiment <= -0.25 ? 'negative' : 'neutral'

const evidenceDate = (value: string): string =>
  new Date(value).toLocaleDateString(locale.value, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

const { smAndDown } = useDisplay()

/**
 * The parent crumb used to be the hero headline ("La silla que aguanta tu jornada, según quienes ya
 * la probaron"), which wrapped to three lines on a phone and pushed the chair below the fold. It is
 * a nav label now, and on small screens the home crumb drops out too.
 */
const breadcrumbs = computed(() => {
  const tiers = {
    title: t('nav.chairTiers'),
    to: localePath('/sillas-escritorio-uruguay'),
    disabled: false,
  }
  const directory = {
    title: t('chairMarket.breadcrumb'),
    to: localePath('/sillas-escritorio-uruguay/precios'),
    disabled: false,
  }
  const current = { title: product.value?.name ?? slug.value, disabled: true }
  return smAndDown.value
    ? [directory, current]
    : [{ title: t('inicio'), to: localePath('/'), disabled: false }, tiers, directory, current]
})

// A hand-drawn sparkline keeps the page free of a charting dependency for four data points.
const sparkWidth = 600
const sparkHeight = 120
const historyRange = computed(() => {
  const points = product.value?.history ?? []
  const values = points.map(point => point.median)
  return {
    first: points[0]?.median ?? 0,
    last: points[points.length - 1]?.median ?? 0,
    low: values.length ? Math.min(...values) : 0,
    high: values.length ? Math.max(...values) : 0,
  }
})
const sparkPoints = computed(() => {
  const points = product.value?.history ?? []
  if (points.length < 2) return ''
  const values = points.map(point => point.median)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * sparkWidth
      const y = sparkHeight - ((point.median - min) / span) * (sparkHeight - 8) - 4
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
})

/** The same line closed along the baseline, so the plot reads as a filled trend rather than a wire. */
const sparkArea = computed(() =>
  sparkPoints.value ? `0,${sparkHeight} ${sparkPoints.value} ${sparkWidth},${sparkHeight}` : ''
)

const canonicalUrl = computed(
  () => `https://cambio-uruguay.com${localePath(`/sillas-escritorio-uruguay/${slug.value}`)}`
)

defineOgImageComponent('Cambio', {
  title: () => product.value?.name ?? t('chairDetail.metaFallbackTitle'),
  subtitle: () =>
    product.value?.price
      ? t('chairDetail.ogSubtitle', {
          price: formatChairPrice(product.value.price.min),
          sellers: product.value.sellers,
        })
      : t('chairDetail.metaFallbackSubtitle'),
  tag: 'SILLAS · PRECIOS',
})

useSeoMeta({
  title: () =>
    product.value
      ? t('chairDetail.metaTitle', { name: product.value.name })
      : t('chairDetail.metaFallbackTitle'),
  description: () =>
    product.value
      ? t('chairDetail.metaDescription', {
          name: product.value.name,
          price: product.value.price ? formatChairPrice(product.value.price.min) : '—',
          sellers: product.value.sellers,
        })
      : t('chairDetail.metaFallbackSubtitle'),
  ogType: 'website',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl.value }],
  script: product.value
    ? [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.value.name,
            brand: product.value.brand
              ? { '@type': 'Brand', name: product.value.brand }
              : undefined,
            model: product.value.model || undefined,
            image: product.value.images.map(image => image.url).slice(0, 4),
            description: product.value.verdict || undefined,
            url: canonicalUrl.value,
            // Only published when real reviews exist — an invented rating would be a lie to Google
            // and to the reader alike.
            aggregateRating:
              product.value.stars !== null && product.value.ratingCount > 0
                ? {
                    '@type': 'AggregateRating',
                    ratingValue: product.value.stars,
                    reviewCount: product.value.ratingCount,
                    bestRating: 5,
                    worstRating: 1,
                  }
                : undefined,
            offers: product.value.price
              ? {
                  '@type': 'AggregateOffer',
                  priceCurrency: 'UYU',
                  lowPrice: product.value.price.min,
                  highPrice: product.value.price.max,
                  offerCount: product.value.offers.length,
                  availability: 'https://schema.org/InStock',
                }
              : undefined,
          }),
        },
      ]
    : [],
}))
</script>

<style scoped>
.chair-detail {
  max-width: 1100px;
}

.detail-head {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
  gap: 32px;
  align-items: start;
  margin-top: 8px;
}

.detail-gallery {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-photo {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: contain;
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  padding: 12px;
}

.detail-photo--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.35;
}

.thumbs {
  display: flex;
  gap: 8px;
  list-style: none;
  padding: 0;
  margin: 0;
}

.thumbs button {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), 0.2);
  background: rgba(var(--v-theme-on-surface), 0.04);
  cursor: pointer;
}

.thumbs button.is-active {
  border-color: rgb(var(--v-theme-primary));
}

.thumbs img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.photo-credit {
  font-size: 0.75rem;
  opacity: 0.7;
  margin: 0;
}

.detail-summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-kicker {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 0.75rem;
  letter-spacing: 0.0333em;
  text-transform: uppercase;
  opacity: 0.8;
}

.detail-summary h1 {
  font-size: clamp(1.5rem, 3vw, 2.125rem);
  font-weight: 400;
  line-height: 1.18;
  margin: 0;
}

.detail-rating {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 0.75rem;
}

.stars {
  color: rgb(var(--v-theme-warning));
  display: inline-flex;
}

.detail-rating strong {
  font-size: 1.25rem;
  font-variant-numeric: tabular-nums;
}

.rating-count {
  opacity: 0.75;
}

.detail-verdict {
  margin: 0;
  max-width: 68ch;
  line-height: 1.5;
}

.price-panel {
  margin-top: 8px;
}

.price-panel__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin: 0;
}

.price-panel dt {
  font-size: 0.75rem;
  letter-spacing: 0.0333em;
  text-transform: uppercase;
  opacity: 0.72;
}

.price-panel dd {
  margin: 2px 0 0;
  font-size: 1.25rem;
  font-variant-numeric: tabular-nums;
}

.price-panel__lead {
  color: rgb(var(--v-theme-primary));
}

.detail-block {
  margin-top: 40px;
}

.detail-block h2 {
  font-size: 1.25rem;
  font-weight: 500;
  margin: 0 0 4px;
}

.block-lead {
  margin: 0 0 16px;
  opacity: 0.8;
  max-width: 70ch;
}

.platform + .platform {
  margin-top: 24px;
}

.platform h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 500;
  margin: 0 0 8px;
}

.platform h3 span {
  font-size: 0.75rem;
  opacity: 0.7;
}

.offer-table,
.spec-table {
  width: 100%;
  border-collapse: collapse;
}

.offer-table th,
.offer-table td,
.spec-table th,
.spec-table td {
  text-align: left;
  padding: 8px 10px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.14);
  vertical-align: top;
}

.offer-table thead th {
  font-size: 0.75rem;
  letter-spacing: 0.0333em;
  text-transform: uppercase;
  opacity: 0.72;
}

.offer-table tr.is-best {
  background: rgba(var(--v-theme-primary), 0.08);
}

.offer-price strong {
  font-variant-numeric: tabular-nums;
}

.offer-meta {
  display: block;
  font-size: 0.75rem;
  opacity: 0.7;
}

.disclaimer {
  margin-top: 12px;
  font-size: 0.75rem;
  opacity: 0.7;
}

.sparkline-plot {
  position: relative;
  margin-bottom: 6px;
}

.sparkline {
  display: block;
  width: 100%;
  height: 120px;
  color: rgb(var(--v-theme-primary));
}

.sparkline-bound {
  position: absolute;
  right: 0;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgb(var(--v-theme-surface));
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  opacity: 0.78;
}

.sparkline-bound.is-high {
  top: 0;
}

.sparkline-bound.is-low {
  bottom: 0;
}

.sparkline-legend {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  opacity: 0.7;
  margin: 0;
}

.trend-up {
  color: rgb(var(--v-theme-error));
}

.trend-down {
  color: rgb(var(--v-theme-success));
}

.opinion-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 24px;
}

.opinion-grid h3 {
  font-size: 1rem;
  font-weight: 500;
  margin: 0 0 8px;
}

.opinion-grid ul {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sources {
  display: block;
  font-size: 0.75rem;
  opacity: 0.66;
}

.muted {
  opacity: 0.7;
  margin: 0;
}

.signal-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
}

.signal-list > * {
  list-style: none;
}

.signal-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.signal-weight {
  margin-left: auto;
  font-size: 0.75rem;
  opacity: 0.7;
}

.signal-list p {
  margin: 4px 0 0;
  font-size: 0.75rem;
  opacity: 0.8;
}

.reddit-evidence {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  padding: 0;
  margin: 20px 0 0;
  list-style: none;
}

/* Depth is carried by the indent and by the labelled type in the header, never by a thick colored
   edge: DESIGN.md's no-side-tab rule, which the tier page already follows and this list did not. */
.reddit-evidence li {
  min-width: 0;
  padding: 18px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 7%, rgb(var(--v-theme-surface)));
}

.reddit-evidence li.is-reply {
  margin-left: calc(min(var(--reply-depth), 3) * 18px);
  border-left-color: rgba(var(--v-theme-primary), 0.58);
}

.reddit-evidence header,
.reddit-evidence footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  font-size: 0.78rem;
  color: rgba(var(--v-theme-on-surface), 0.72);
}

.reddit-evidence header span,
.reddit-evidence footer span,
.reddit-evidence footer a {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.reddit-evidence h3 {
  margin: 10px 0 6px;
  font-size: 0.875rem;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.reddit-evidence p {
  margin: 0 0 14px;
  white-space: pre-line;
  line-height: 1.62;
  overflow-wrap: anywhere;
}

.reddit-evidence footer a {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
  text-decoration: none;
}

.review-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.review-list > * {
  list-style: none;
}

.review-list p {
  margin: 0 0 6px;
}

.review-list footer {
  display: flex;
  gap: 12px;
  font-size: 0.75rem;
  opacity: 0.75;
}

.related-grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 14px;
}

.related-card {
  list-style: none;
  min-width: 0;
}

.related-card a {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  text-decoration: none;
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease;
}

.related-card a:hover,
.related-card a:focus-visible {
  transform: translateY(-3px);
  border-color: rgba(var(--v-theme-primary), 0.55);
  box-shadow: 0 10px 22px rgba(5, 10, 22, 0.16);
}

.related-card__media {
  display: flex;
  aspect-ratio: 4 / 3;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.related-card__media img {
  width: 100%;
  height: 100%;
  padding: 10px;
  object-fit: contain;
}

.related-card__body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 5px;
  padding: 12px 14px 14px;
}

.related-card__body strong {
  display: -webkit-box;
  overflow: hidden;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.related-card__rating {
  display: flex;
  gap: 4px;
  align-items: center;
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.related-card__rating .v-icon {
  color: rgb(var(--v-theme-warning));
}

.related-card__rating span {
  font-weight: 400;
  opacity: 0.72;
}

.related-card__price {
  margin-top: auto;
  padding-top: 4px;
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.related-card__price.is-muted {
  font-weight: 400;
  opacity: 0.68;
}

.detail-foot {
  margin-top: 32px;
}

.detail-foot a {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  color: rgb(var(--v-theme-link));
  font-weight: 700;
  text-decoration: none;
}

.detail-foot a:hover,
.detail-foot a:focus-visible {
  text-decoration: underline;
}

@media (max-width: 960px) {
  .detail-head {
    grid-template-columns: 1fr;
  }

  .reddit-evidence li.is-reply {
    margin-left: calc(min(var(--reply-depth), 3) * 8px);
  }
}
</style>
