<template>
  <VContainer class="sale-detail">
    <NuxtLink :to="backPath" class="sale-detail__back" :aria-label="t('back')">
      <VIcon icon="mdi-arrow-left" size="20" />
      {{ t('back') }}
    </NuxtLink>
    <section v-if="error || !data" class="sale-detail__failure" aria-live="polite">
      <h1>{{ t(failureCode === 404 ? 'detailNotFoundTitle' : 'detailUnavailableTitle') }}</h1>
      <p>{{ t(failureCode === 404 ? 'detailNotFoundHint' : 'detailUnavailableHint') }}</p>
      <VBtn v-if="failureCode !== 404" color="primary" :loading="pending" @click="refresh()">
        {{ t('retry') }}
      </VBtn>
    </section>
    <template v-else>
      <header class="sale-detail__header">
        <p>
          {{
            [property.neighborhood, property.locality, property.department]
              .filter((value, index, all) => value && all.indexOf(value) === index)
              .join(' · ')
          }}
        </p>
        <h1>{{ property.title }}</h1>
        <div class="sale-detail__header-actions">
          <span>
            {{ propertySaleSourceName(property.source) }}
            <template v-if="property.sellerName">· {{ property.sellerName }}</template>
          </span>
          <VBtn
            :prepend-icon="favorites.has(property.key) ? 'mdi-heart' : 'mdi-heart-outline'"
            variant="tonal"
            :aria-pressed="favorites.has(property.key)"
            @click="favorites.toggle(property.key)"
          >
            {{ t(favorites.has(property.key) ? 'unsave' : 'save') }}
          </VBtn>
          <VBtn
            icon="mdi-share-variant-outline"
            variant="text"
            :aria-label="t('share')"
            @click="share"
          />
        </div>
      </header>
      <div class="sale-detail__layout">
        <div class="sale-detail__main">
          <PropertySalesGallery
            :images="images"
            :title="property.title"
            :source-name="propertySaleSourceName(property.source)"
            :source-url="property.url"
          />
          <section
            v-if="property.conditions.length"
            class="sale-detail__section sale-detail__conditions"
          >
            <h2>{{ t('conditions') }}</h2>
            <ul>
              <li v-for="condition in property.conditions" :key="condition">{{ t(condition) }}</li>
            </ul>
            <p>{{ t('conditionsHint') }}</p>
          </section>
          <section class="sale-detail__section">
            <h2>{{ t('description') }}</h2>
            <p class="sale-detail__description">{{ property.description || t('noDescription') }}</p>
          </section>
          <section v-if="property.amenities.length" class="sale-detail__section">
            <h2>{{ t('amenities') }}</h2>
            <ul class="sale-detail__amenities">
              <li v-for="amenity in property.amenities" :key="amenity">{{ amenity }}</li>
            </ul>
          </section>
          <section class="sale-detail__section">
            <h2>{{ t('location') }}</h2>
            <template v-if="propertySaleHasGeo(property.geo)">
              <p>{{ t(property.geo?.precision === 'exact' ? 'exact' : 'approximate') }}</p>
              <VBtn
                v-if="!mapOpen"
                prepend-icon="mdi-map-outline"
                variant="outlined"
                class="mt-4"
                @click="mapOpen = true"
              >
                {{ t('showLocation') }}
              </VBtn>
              <ClientOnly v-if="mapOpen">
                <LocationsMap
                  :branches="branches"
                  :center="[property.geo!.lat, property.geo!.lng]"
                  :zoom="15"
                  :popups="false"
                  :marker-hit-size="44"
                  height="360px"
                  class="sale-detail__map"
                />
              </ClientOnly>
            </template>
            <p v-else>{{ t('noLocation') }}</p>
            <PropertyNearbyServices operation="sale" :property-key="property.key" />
          </section>
        </div>
        <aside class="sale-detail__aside">
          <section class="sale-detail__facts">
            <h2>{{ t('facts') }}</h2>
            <PropertySalesFacts :property="property" :area-basis="preferredArea" />
            <p class="sale-detail__monthly">{{ t('monthlyHint') }}</p>
            <VBtn
              :href="property.url"
              target="_blank"
              rel="noopener noreferrer"
              color="primary"
              block
              append-icon="mdi-open-in-new"
            >
              {{ t('original') }}
            </VBtn>
            <p class="sale-detail__source-hint">{{ t('sourceHint') }}</p>
            <PropertyAdvertiserContact :publisher="property" />
            <dl class="sale-detail__dates">
              <div>
                <dt>{{ t('source') }}</dt>
                <dd>{{ propertySaleSourceName(property.source) }}</dd>
              </div>
              <div>
                <dt>{{ t('seller') }}</dt>
                <dd>{{ property.sellerName || t('unknown') }}</dd>
              </div>
              <div>
                <dt>{{ t('read') }}</dt>
                <dd>
                  <time :datetime="property.lastSeen">{{ date(property.lastSeen) }}</time>
                </dd>
              </div>
              <div v-if="property.publishedAt">
                <dt>{{ t('published') }}</dt>
                <dd>
                  <time :datetime="property.publishedAt">{{ date(property.publishedAt) }}</time>
                </dd>
              </div>
              <div v-if="property.firstSeen">
                <dt>{{ t('firstSeen') }}</dt>
                <dd>
                  <time :datetime="property.firstSeen">{{ date(property.firstSeen) }}</time>
                </dd>
              </div>
            </dl>
          </section>
          <NuxtLink
            :to="localePath('/comprar-o-alquilar-uruguay')"
            class="sale-detail__guide"
            :aria-label="t('buyOrRent')"
          >
            {{ t('buyOrRent') }}
            <VIcon icon="mdi-arrow-right" size="18" aria-hidden="true" />
          </NuxtLink>
        </aside>
      </div>
      <section v-if="data.similar.length" class="sale-detail__similar">
        <h2>{{ t('similar') }}</h2>
        <div>
          <PropertySalesListingCard
            v-for="item in data.similar.slice(0, 4)"
            :key="item.key"
            :property="item"
          />
        </div>
      </section>
      <p class="sale-detail__disclaimer">{{ t('disclaimer') }}</p>
    </template>
    <VSnackbar v-model="toastOpen" timeout="4000">{{ toast }}</VSnackbar>
    <VSnackbar v-model="favorites.limited.value" timeout="4000">{{ t('savedLimit') }}</VSnackbar>
    <VSnackbar v-model="favorites.storageFailed.value" timeout="6000">{{
      t('savedTemporary')
    }}</VSnackbar>
  </VContainer>
</template>
<script setup lang="ts">
import {
  propertySaleHasGeo,
  propertySalePath,
  propertySaleValidKey,
  type PropertySaleDetailResponse,
  type PropertySaleAreaBasis,
} from '~/utils/propertySales'
import { propertySaleSourceName, propertySalesMessages } from '~/utils/propertySalesMessages'
const route = useRoute()
const localePath = useLocalePath()
const { t, locale } = useI18n({ useScope: 'local', messages: propertySalesMessages })
const key = computed(() => String(route.params.key || ''))
const { data, pending, error, refresh } = await useAsyncData<PropertySaleDetailResponse>(
  () => `property-sale-${key.value}`,
  () => {
    if (!propertySaleValidKey(key.value))
      throw createError({ statusCode: 404, statusMessage: 'Advert not found' })
    return $fetch<PropertySaleDetailResponse>(
      `/api/property-sales/ficha/${encodeURIComponent(key.value)}`
    )
  }
)
const failureCode = computed(() => {
  const failure = error.value as { statusCode?: number; data?: { statusCode?: number } } | null
  return failure?.statusCode === 404 || failure?.data?.statusCode === 404 ? 404 : 503
})
if (import.meta.server && (error.value || !data.value)) {
  const event = useRequestEvent()
  if (event) {
    setResponseStatus(event, failureCode.value)
    useResponseHeader('cache-control').value = 'no-store, max-age=0'
  }
}
const property = computed(() => data.value!.property)
const images = computed(() => [
  ...new Set(
    [...(property.value.images || []), property.value.image].filter((url): url is string => !!url)
  ),
])
const favorites = usePropertySaleFavorites()
const mapOpen = ref(false)
const LocationsMap = defineAsyncComponent(() => import('~/components/map/LocationsMap.vue'))
const backPath = ref(localePath('/venta-viviendas-uruguay'))
const preferredArea = computed<PropertySaleAreaBasis>(() =>
  property.value.areas.built
    ? 'built'
    : property.value.areas.total
      ? 'total'
      : property.value.areas.land
        ? 'land'
        : 'reported'
)
const branches = computed(() =>
  property.value.geo
    ? [
        {
          id: property.value.key,
          origin: 'property-sales',
          name: property.value.title,
          dept: property.value.department,
          locality: property.value.locality,
          address: '',
          phone: '',
          hours: '',
          lat: property.value.geo.lat,
          lng: property.value.geo.lng,
          mapUrl: '',
          source: 'property-sales',
        },
      ]
    : []
)
const date = (value: string) =>
  new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'long',
    timeZone: /^\d{4}-\d{2}-\d{2}$/.test(value) ? 'UTC' : 'America/Montevideo',
  }).format(new Date(value))
const toast = ref('')
const toastOpen = ref(false)
async function share() {
  try {
    const url = `https://cambio-uruguay.com${localePath(propertySalePath(key.value))}`
    if (navigator.share) await navigator.share({ title: property.value.title, url })
    else {
      await navigator.clipboard.writeText(url)
      toast.value = t('copied')
      toastOpen.value = true
    }
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      toast.value = t('shareError')
      toastOpen.value = true
    }
  }
}
onMounted(() => {
  try {
    const stored = sessionStorage.getItem('cu_property_sale_search')
    if (stored && /^\/(?:en\/|pt\/)?venta-viviendas-uruguay(?:\?|$)/.test(stored))
      backPath.value = stored
  } catch {
    /* A direct visit still has a working catalogue link. */
  }
})
useSeoMeta({
  title: () =>
    data.value && !error.value
      ? `${data.value.property.title} | ${t('sales')}`
      : t(failureCode.value === 404 ? 'detailNotFoundTitle' : 'detailUnavailableTitle'),
  description: () => data.value?.property.description.slice(0, 160) || t('seoDescription'),
  ogTitle: () => data.value?.property.title || t('sales'),
  ogDescription: () => data.value?.property.description.slice(0, 160) || t('seoDescription'),
  robots: () => (data.value?.indexable && !error.value ? 'index,follow' : 'noindex,follow'),
})
useHead(() => ({
  link: [
    {
      rel: 'canonical',
      href: `https://cambio-uruguay.com${localePath(propertySalePath(key.value))}`,
    },
  ],
  script:
    data.value && !error.value
      ? [
          {
            key: 'property-sale-schema',
            type: 'application/ld+json',
            innerHTML: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'RealEstateListing',
              '@id': `https://cambio-uruguay.com${localePath(propertySalePath(key.value))}#listing`,
              url: `https://cambio-uruguay.com${localePath(propertySalePath(key.value))}`,
              name: data.value.property.title,
              description: data.value.property.description || undefined,
              image: data.value.property.images.length
                ? data.value.property.images
                : data.value.property.image || undefined,
              datePosted: data.value.property.publishedAt || undefined,
              isBasedOn: data.value.property.url,
              mainEntity: {
                '@type': data.value.property.propertyType === 'casa' ? 'House' : 'Apartment',
                '@id': `https://cambio-uruguay.com${localePath(propertySalePath(key.value))}#advertised-property`,
                name: data.value.property.title,
                numberOfBedrooms: data.value.property.bedrooms ?? undefined,
                numberOfBathroomsTotal: data.value.property.bathrooms ?? undefined,
                floorSize: data.value.property.areas.built
                  ? {
                      '@type': 'QuantitativeValue',
                      value: data.value.property.areas.built,
                      unitCode: 'MTK',
                    }
                  : undefined,
                address: {
                  '@type': 'PostalAddress',
                  addressCountry: 'UY',
                  addressRegion: data.value.property.department || undefined,
                  addressLocality: data.value.property.locality || undefined,
                },
              },
              offers: {
                '@type': 'Offer',
                price: data.value.property.price.amount,
                priceCurrency: data.value.property.price.currency,
                url: data.value.property.url,
                itemOffered: {
                  '@id': `https://cambio-uruguay.com${localePath(propertySalePath(key.value))}#advertised-property`,
                },
              },
            }).replace(/</g, '\\u003c'),
          },
        ]
      : [],
}))
defineOgImageComponent('Cambio', {
  title: data.value?.property.title || t('sales'),
  description: t('seoDescription'),
})
</script>
<style scoped>
.sale-detail {
  max-width: 1280px;
  padding: 12px;
}
:where(.sale-detail) :where(h1, h2, p, dl, dd) {
  margin: 0;
}
.sale-detail a:not(.v-btn) {
  color: rgb(var(--v-theme-link));
}
.sale-detail__back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  font-size: 0.9rem;
}
.sale-detail__header {
  padding: 16px 0 24px;
}
.sale-detail__failure {
  padding: 32px 0;
  min-height: 260px;
}
.sale-detail__failure p {
  margin: 16px 0 24px;
  max-width: 640px;
  line-height: 1.7;
}
.sale-detail__header > p {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
}
.sale-detail h1 {
  font-size: clamp(1.5rem, 3.8vw, 2.3rem);
  line-height: 1.35;
  font-weight: 800;
  letter-spacing: -0.02em;
  overflow-wrap: anywhere;
  margin-top: 8px;
}
.sale-detail__header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 16px;
}
.sale-detail__header-actions > span {
  font-size: 0.85rem;
  margin-right: auto;
  color: rgba(var(--v-theme-on-surface), 0.7);
}
.sale-detail__layout {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(300px, 1fr);
  gap: 32px;
  align-items: start;
}
.sale-detail__main,
.sale-detail__aside {
  min-width: 0;
}
.sale-detail__facts {
  position: sticky;
  top: 88px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.15);
  border-radius: 14px;
  background: rgb(var(--v-theme-surface));
  padding: 24px;
}
.sale-detail h2 {
  font-size: 1.2rem;
  font-weight: 800;
}
.sale-detail__facts h2 {
  margin-bottom: 16px;
}
.sale-detail__facts .v-btn {
  min-height: 48px;
  margin-top: 20px;
}
.sale-detail .sale-detail__monthly,
.sale-detail .sale-detail__source-hint {
  font-size: 0.78rem;
  line-height: 1.65;
  color: rgba(var(--v-theme-on-surface), 0.72);
  margin-top: 16px;
}
.sale-detail .sale-detail__dates {
  display: grid;
  gap: 12px;
  margin-top: 24px;
  font-size: 0.8rem;
}
.sale-detail__dates dt {
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-size: 0.75rem;
}
.sale-detail__dates dd {
  font-weight: 600;
  overflow-wrap: anywhere;
}
.sale-detail__section {
  padding-top: 24px;
  margin-top: 24px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.14);
}
.sale-detail__section > p {
  margin-top: 16px;
  line-height: 1.75;
}
.sale-detail__description {
  white-space: pre-line;
  overflow-wrap: anywhere;
  font-size: 0.95rem;
}
.sale-detail__conditions {
  border-left: 3px solid rgb(var(--v-theme-warning));
  padding: 16px;
  background: rgba(var(--v-theme-warning), 0.04);
  border-top: 0;
  border-radius: 0 10px 10px 0;
}
.sale-detail__conditions ul {
  padding-left: 20px;
  line-height: 1.8;
  margin: 12px 0;
}
.sale-detail__conditions p {
  font-size: 0.83rem;
}
.sale-detail__amenities {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  list-style: none;
  padding: 0;
  margin: 16px 0 0;
}
.sale-detail__amenities li {
  padding: 8px 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.15);
  border-radius: 8px;
  font-size: 0.85rem;
}
.sale-detail__map {
  margin-top: 16px;
  border-radius: 12px;
  overflow: hidden;
}
.sale-detail__guide {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  margin-top: 16px;
  font-size: 0.85rem;
}
.sale-detail__similar {
  margin-top: 40px;
}
.sale-detail__similar > div {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-top: 20px;
}
.sale-detail .sale-detail__disclaimer {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
  margin-top: 32px;
  margin-bottom: 24px;
}
.sale-detail a:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
}
@media (max-width: 1199px) {
  .sale-detail__similar > div {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 959px) {
  .sale-detail__layout {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  .sale-detail__main,
  .sale-detail__aside {
    width: 100%;
  }
  .sale-detail__aside {
    order: 1;
  }
  .sale-detail__main {
    display: contents;
  }
  .sale-detail__main > .sale-detail__section {
    order: 2;
    width: 100%;
  }
  .sale-detail__main > .sale-gallery {
    order: 0;
    width: 100%;
  }
  .sale-detail__facts {
    padding: 16px;
    position: static;
  }
  .sale-detail__facts :deep(.sale-facts__grid) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .sale-detail__dates {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 599px) {
  .sale-detail__similar > div {
    grid-template-columns: 1fr;
  }
  .sale-detail__facts :deep(.sale-facts__grid) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .sale-detail__header-actions {
    gap: 8px;
  }
  .sale-detail__header-actions > span {
    width: 100%;
  }
  .sale-detail__header-actions .v-btn {
    font-size: 0.8rem;
  }
  .sale-detail__facts :deep(.sale-facts__grid dd) {
    font-size: 0.8rem;
  }
}
</style>
