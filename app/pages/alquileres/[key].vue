<!--
THESIS: Make a rental decision with the published costs, competing adverts and unanswered questions together.
OWN-WORLD: Extend the directory's navy/paper surfaces, Open Sans, blue actions and explicit data provenance.
STORY: Inspect the property, choose an advert, compare costs, prepare the enquiry and contact its publisher.
FIRST VIEWPORT: Property title and attributed photo alongside a sticky cost summary; mobile has a persistent contact action.
FORM: Property dossier with a working comparison, budget planner and visit checklist. No speculative marketing copy.
-->
<script setup lang="ts">
import BudgetPlanner from '~/components/rentals/BudgetPlanner.vue'
import { rentalPageMessages } from '~/utils/rentalPageMessages'
import type { RentalPageResponse } from '~/utils/rentalPage'
import {
  RENTAL_GUARANTEE_PUBLISHED,
  RENTAL_SOURCE_LABEL,
  totalMonthlyUyu,
  type RentalOffer,
  type RentalPublicProperty,
} from '~/utils/rentals'
import {
  emptyRentalSaved,
  readRentalSaved,
  writeRentalSaved,
  toggleRentalFavorite,
  rentalSavedSafeUrl,
  RENTAL_SAVED_STORAGE_ID,
  RENTAL_SAVED_FAVORITE_LIMIT,
} from '~/utils/rentalSaved'
import {
  rentalAmountUyu,
  rentalDate,
  rentalHasLocation,
  rentalMoney,
  rentalPhotos,
  rentalPropertyPath,
  rentalReturnPath,
  rentalStreet,
  RENTAL_RETURN_STORAGE,
} from '~/utils/rentalPresentation'

const { t, locale } = useI18n({ useScope: 'local', messages: rentalPageMessages })
const localePath = useLocalePath()
const route = useRoute()
const propertyKey = computed(() => String(route.params.key || ''))
const { data, pending, error, refresh } = await useAsyncData<RentalPageResponse>(
  () => `rental-page:${propertyKey.value}`,
  () => $fetch(`/api/rentals/ficha/${encodeURIComponent(propertyKey.value)}`)
)
const property = computed(() => data.value?.property ?? null)
const failureCode = computed(() => {
  const failure = error.value as { statusCode?: number; data?: { statusCode?: number } } | null
  return failure?.statusCode === 404 || failure?.data?.statusCode === 404 ? 404 : 503
})
if (import.meta.server) {
  const event = useRequestEvent()
  if (event) {
    useResponseHeader('cache-control').value = error.value
      ? 'no-store, max-age=0'
      : 'public, max-age=0, must-revalidate, s-maxage=60'
    if (error.value) setResponseStatus(event, failureCode.value)
  }
}
const canonical = computed(
  () =>
    `https://cambio-uruguay.com${localePath(data.value?.canonicalPath || rentalPropertyPath(propertyKey.value))}`
)
const selectedId = ref('')
const offerId = (offer: RentalOffer) => `${offer.source}:${offer.listingId}`
const offers = computed(() =>
  (property.value?.offers ?? []).filter(offer => rentalSavedSafeUrl(offer.url))
)
const defaultOffer = computed(() => property.value?.matchingOffer ?? offers.value[0])
const selectedOffer = computed(
  () => offers.value.find(offer => offerId(offer) === selectedId.value) ?? defaultOffer.value
)
const usdUyu = computed(() => data.value?.usdUyu ?? 0)
const source = (offer: RentalOffer) => RENTAL_SOURCE_LABEL[offer.source]
const money = (value: number, currency: RentalOffer['currency'] = 'UYU') =>
  rentalMoney(value, currency, locale.value)
const date = (value: string | null | undefined) =>
  rentalDate(value, locale.value) || t('notPublished')
const title = computed(() => property.value?.title || t('unavailableTitle'))
const uncertainData = computed(() =>
  data.value?.seo.reasons.some(
    reason =>
      reason.startsWith('conflicting_') ||
      reason === 'ambiguous_identity' ||
      reason === 'temporary_rental'
  )
)
const zone = computed(() =>
  [property.value?.neighborhood, property.value?.department].filter(Boolean).join(', ')
)
const street = computed(() => (property.value ? rentalStreet(property.value) : ''))
const types: Record<string, string> = {
  apartamento: 'apartment',
  casa: 'house',
  habitacion: 'room',
  local: 'commercial',
  oficina: 'office',
  terreno: 'land',
  otro: 'other',
}
const typeLabel = computed(() => t(types[property.value?.propertyType || 'otro'] || 'other'))
const total = computed(() =>
  selectedOffer.value ? totalMonthlyUyu(selectedOffer.value, usdUyu.value) : null
)
const rateMissing = computed(
  () =>
    !(usdUyu.value > 0) &&
    (selectedOffer.value?.currency === 'USD' ||
      selectedOffer.value?.commonExpensesCurrency === 'USD')
)
const expenses = (offer: RentalOffer) =>
  offer.commonExpenses === 0
    ? t('noExpenses')
    : offer.commonExpenses !== null && offer.commonExpensesCurrency
      ? money(offer.commonExpenses, offer.commonExpensesCurrency)
      : t('notPublished')
const guarantees = computed(() =>
  (selectedOffer.value?.guarantees ?? [])
    .filter(value => RENTAL_GUARANTEE_PUBLISHED.includes(value))
    .map(value => t(value))
)
const seller = (offer: RentalOffer) =>
  [
    offer.sellerName,
    t(
      offer.sellerType === 'particular'
        ? 'individual'
        : offer.sellerType === 'inmobiliaria'
          ? 'agency'
          : 'notPublished'
    ),
  ]
    .filter(Boolean)
    .join(' · ')
const photos = computed(() => (property.value ? rentalPhotos(property.value) : []))
const photoIndex = ref(0)
const failedPhotos = ref(new Set<string>())
const photo = computed(() => photos.value[photoIndex.value])
function photoFailed(url: string) {
  failedPhotos.value.add(url)
  const alternative = photos.value.findIndex(entry => !failedPhotos.value.has(entry.url))
  if (alternative >= 0) photoIndex.value = alternative
}
const saved = ref(emptyRentalSaved())
const favorite = computed(() => saved.value.favorites.some(item => item.key === propertyKey.value))
const returnPath = ref('')
const notice = ref('')
const snackbar = ref(false)
const checked = ref<string[]>([])
const showMap = ref(false)
const LocationsMap = defineAsyncComponent(() => import('~/components/map/LocationsMap.vue'))
const mapped = computed(() => property.value && rentalHasLocation(property.value))
const branches = computed(() =>
  property.value && mapped.value
    ? [
        {
          origin: 'rental',
          id: property.value.key,
          name: title.value,
          dept: property.value.department,
          locality: property.value.neighborhood,
          address: street.value,
          phone: '',
          hours: '',
          lat: property.value.latitude!,
          lng: property.value.longitude!,
          mapUrl: '',
          source: selectedOffer.value ? source(selectedOffer.value) : '',
        },
      ]
    : []
)
const nearbyLink = computed(() => ({
  path: localePath('/alquileres-uruguay'),
  query: {
    department: property.value?.department || undefined,
    neighborhood: property.value?.neighborhood || undefined,
    type: property.value?.propertyType || undefined,
  },
}))
const questions = computed(() => [
  'questionAvailability',
  'questionAddress',
  'questionExpenses',
  'questionGuarantee',
  'questionPets',
  'questionContract',
  'questionEntry',
  'questionVisit',
])
const market = computed(() => data.value?.market)
const difference = computed(() => {
  if (!selectedOffer.value || !market.value?.medianRentUyu) return null
  const rent = rentalAmountUyu(
    selectedOffer.value.price,
    selectedOffer.value.currency,
    usdUyu.value
  )
  return rent === null ? null : Math.round((rent / market.value.medianRentUyu - 1) * 100)
})
const breadcrumbs = computed(() => [
  { title: t('country'), to: localePath('/') },
  { title: t('search'), to: localePath('/alquileres-uruguay') },
  { title: zone.value || t('overview'), disabled: true },
])
function notify(message: string) {
  notice.value = message
  snackbar.value = true
}
function save() {
  if (!property.value) return
  if (!favorite.value && saved.value.favorites.length >= RENTAL_SAVED_FAVORITE_LIMIT)
    return notify(t('favoriteLimit'))
  saved.value = toggleRentalFavorite(saved.value, property.value, usdUyu.value)
  if (!writeRentalSaved(saved.value)) notify(t('storageError'))
}
async function copy(value: string, success: string) {
  try {
    await navigator.clipboard.writeText(value)
    notify(success)
  } catch {
    notify(t('copyFailed'))
  }
}
function copyInquiry() {
  if (!selectedOffer.value) return
  const remaining = questions.value.filter(
    key => key !== 'questionVisit' && !checked.value.includes(key)
  )
  void copy(
    [
      t('inquiryStart', { title: title.value, url: selectedOffer.value.url }),
      ...remaining.map(key => t(key)),
      t('inquiryEnd'),
    ].join('\n\n'),
    t('copied')
  )
}
async function share() {
  if (navigator.share) {
    try {
      await navigator.share({ title: title.value, url: canonical.value })
      return
    } catch (failure) {
      if ((failure as Error).name === 'AbortError') return
    }
  }
  await copy(canonical.value, t('shareDone'))
}
function onStorage(event: StorageEvent) {
  if (event.key === RENTAL_SAVED_STORAGE_ID || event.key === null) saved.value = readRentalSaved()
}
onMounted(() => {
  saved.value = readRentalSaved()
  try {
    returnPath.value = rentalReturnPath(window.sessionStorage.getItem(RENTAL_RETURN_STORAGE)) || ''
  } catch {
    /* The directory link remains available. */
  }
  window.addEventListener('storage', onStorage)
})
onBeforeUnmount(() => window.removeEventListener('storage', onStorage))
watch(propertyKey, () => {
  selectedId.value = ''
  photoIndex.value = 0
  failedPhotos.value = new Set()
  checked.value = []
  showMap.value = false
})
const relatedOffer = (entry: RentalPublicProperty) => entry.matchingOffer ?? entry.offers[0]
const pageTitle = computed(() =>
  property.value && defaultOffer.value
    ? t('propertySeo', {
        type: typeLabel.value,
        zone: zone.value || 'Uruguay',
        price: money(defaultOffer.value.price, defaultOffer.value.currency),
      })
    : title.value
)
const description = computed(() =>
  property.value
    ? t('propertyDescription', { title: title.value, zone: zone.value || 'Uruguay' })
    : t('unavailableHint')
)
defineOgImageComponent('Cambio', {
  title: () => pageTitle.value,
  subtitle: () => zone.value || t('title'),
  tag: 'ALQUILERES',
})
useSeoMeta({
  title: () => pageTitle.value,
  description: () => description.value,
  ogTitle: () => pageTitle.value,
  ogDescription: () => description.value,
  ogUrl: () => canonical.value,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  robots: () =>
    locale.value === 'es' && data.value?.seo.indexable && !error.value
      ? 'index, follow'
      : 'noindex, follow',
})
useHead(() => ({
  link: [{ rel: 'canonical', href: canonical.value }],
  script:
    property.value && !error.value
      ? [
          {
            type: 'application/ld+json',
            innerHTML: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'BreadcrumbList',
                  itemListElement: [
                    {
                      '@type': 'ListItem',
                      position: 1,
                      name: t('title'),
                      item: `https://cambio-uruguay.com${localePath('/alquileres-uruguay')}`,
                    },
                    { '@type': 'ListItem', position: 2, name: title.value, item: canonical.value },
                  ],
                },
                {
                  '@type': 'RealEstateListing',
                  '@id': `${canonical.value}#listing`,
                  url: canonical.value,
                  name: title.value,
                  description: description.value,
                  inLanguage: locale.value,
                  image: photos.value.map(image => image.url),
                  about: {
                    '@type':
                      property.value.propertyType === 'apartamento'
                        ? 'Apartment'
                        : property.value.propertyType === 'casa'
                          ? 'SingleFamilyResidence'
                          : 'Place',
                    name: title.value,
                    address: {
                      '@type': 'PostalAddress',
                      addressCountry: 'UY',
                      addressRegion: property.value.department,
                      ...(property.value.neighborhood
                        ? { addressLocality: property.value.neighborhood }
                        : {}),
                      ...(street.value ? { streetAddress: street.value } : {}),
                    },
                    ...(['apartamento', 'casa'].includes(property.value.propertyType)
                      ? {
                          ...(property.value.bedrooms !== null
                            ? { numberOfBedrooms: property.value.bedrooms }
                            : {}),
                          ...(property.value.bathrooms !== null
                            ? { numberOfBathroomsTotal: property.value.bathrooms }
                            : {}),
                          ...(property.value.area
                            ? {
                                floorSize: {
                                  '@type': 'QuantitativeValue',
                                  value: property.value.area,
                                  unitCode: 'MTK',
                                },
                              }
                            : {}),
                        }
                      : {}),
                  },
                  offers: offers.value.map(offer => ({
                    '@type': 'Offer',
                    url: offer.url,
                    price: offer.price,
                    priceCurrency: offer.currency,
                    businessFunction: 'http://purl.org/goodrelations/v1#LeaseOut',
                    priceSpecification: {
                      '@type': 'UnitPriceSpecification',
                      price: offer.price,
                      priceCurrency: offer.currency,
                      unitText: 'mes',
                    },
                  })),
                },
              ],
            }).replace(/</g, '\\u003c'),
          },
        ]
      : [],
}))
</script>

<template>
  <VContainer class="rental-page pt-1 pt-sm-4" data-testid="rental-property-page">
    <VBreadcrumbs :items="breadcrumbs" density="compact" class="px-0 py-1" />
    <VBtn
      :to="returnPath || localePath('/alquileres-uruguay')"
      variant="text"
      prepend-icon="mdi-arrow-left"
      class="rental-page__back"
      >{{ returnPath ? t('back') : t('search') }}</VBtn
    >
    <VSkeletonLoader v-if="pending" type="heading, image, paragraph" />
    <section v-else-if="error || !property || !selectedOffer" class="rental-page__unavailable">
      <h1>{{ t(failureCode === 404 ? 'unavailableTitle' : 'unavailableError') }}</h1>
      <p>{{ t(failureCode === 404 ? 'unavailableHint' : 'unavailableRetry') }}</p>
      <VBtn v-if="failureCode !== 404" color="primary" @click="refresh()">{{ t('retry') }}</VBtn>
      <VBtn v-else color="primary" :to="localePath('/alquileres-uruguay')">{{ t('search') }}</VBtn>
    </section>
    <div v-else class="rental-page__layout">
      <article class="rental-page__main">
        <header class="rental-page__heading">
          <p class="rental-page__zone">{{ typeLabel }} · {{ zone }}</p>
          <h1>{{ title }}</h1>
          <VAlert v-if="uncertainData" type="warning" variant="tonal" class="my-4">{{
            t('uncertainData')
          }}</VAlert>
          <p v-if="street">{{ street }}</p>
          <div class="rental-page__tools">
            <VBtn
              :prepend-icon="favorite ? 'mdi-heart' : 'mdi-heart-outline'"
              variant="text"
              :aria-pressed="favorite"
              @click="save"
              >{{ t(favorite ? 'unfavorite' : 'favorite') }}</VBtn
            >
            <VBtn prepend-icon="mdi-share-variant-outline" variant="text" @click="share">{{
              t('share')
            }}</VBtn>
          </div>
        </header>
        <figure class="rental-page__gallery">
          <img
            v-if="photo && !failedPhotos.has(photo.url)"
            :src="photo.url"
            :alt="photo.title || title"
            width="720"
            height="450"
            decoding="async"
            fetchpriority="high"
            referrerpolicy="no-referrer"
            class="rental-page__photo"
            @error="photoFailed(photo.url)"
          />
          <div v-else class="rental-page__photo rental-page__photo--empty">
            <VIcon icon="mdi-home-city-outline" size="44" /><span>{{ t('noGallery') }}</span>
          </div>
          <div v-if="photos.length > 1" class="rental-page__thumbs" :aria-label="t('photoHint')">
            <button
              v-for="(entry, index) in photos"
              :key="entry.url"
              type="button"
              :aria-label="
                t('photoNumber', { n: index + 1, source: RENTAL_SOURCE_LABEL[entry.source] })
              "
              :aria-pressed="index === photoIndex"
              :disabled="failedPhotos.has(entry.url)"
              @click="photoIndex = index"
            >
              <img
                :src="entry.url"
                alt=""
                width="76"
                height="56"
                loading="lazy"
                referrerpolicy="no-referrer"
              />
            </button>
          </div>
          <figcaption v-if="photo && !failedPhotos.has(photo.url)">
            <a :href="photo.sourceUrl" target="_blank" rel="noopener noreferrer nofollow">{{
              t('photoCredit', { source: RENTAL_SOURCE_LABEL[photo.source] })
            }}</a>
            <p>{{ t('photoHint') }}</p>
          </figcaption>
        </figure>
        <section class="rental-page__section" aria-labelledby="rental-facts-title">
          <h2 id="rental-facts-title">{{ t('features') }}</h2>
          <dl class="rental-page__facts">
            <div>
              <dt>{{ t('type') }}</dt>
              <dd>{{ typeLabel }}</dd>
            </div>
            <div>
              <dt>{{ t('bedrooms') }}</dt>
              <dd>
                {{
                  property.bedrooms === 0 ? t('studio') : (property.bedrooms ?? t('notPublished'))
                }}
              </dd>
            </div>
            <div>
              <dt>{{ t('bathrooms') }}</dt>
              <dd>{{ property.bathrooms ?? t('notPublished') }}</dd>
            </div>
            <div>
              <dt>{{ t('mapArea') }}</dt>
              <dd>{{ property.area ? `${property.area} m²` : t('notPublished') }}</dd>
            </div>
          </dl>
          <p class="rental-page__note">{{ t('sourceFacts') }}</p>
        </section>
        <section
          id="rental-page-offers"
          class="rental-page__section"
          aria-labelledby="rental-offers-title"
        >
          <h2 id="rental-offers-title">{{ t('offersHeading') }}</h2>
          <p>{{ t('offersHint') }}</p>
          <ul class="rental-page__offers">
            <li
              v-for="offer in offers"
              :key="offerId(offer)"
              :class="{ 'is-selected': offerId(offer) === offerId(selectedOffer) }"
            >
              <div class="rental-page__offer-head">
                <h3>{{ source(offer) }}</h3>
                <span v-if="offerId(offer) === offerId(selectedOffer)">{{
                  t('selectedOffer')
                }}</span>
              </div>
              <p>{{ seller(offer) }}</p>
              <dl class="rental-page__offer-costs">
                <div>
                  <dt>{{ t('rent') }}</dt>
                  <dd>{{ money(offer.price, offer.currency) }}</dd>
                </div>
                <div>
                  <dt>{{ t('expenses') }}</dt>
                  <dd>{{ expenses(offer) }}</dd>
                </div>
                <div>
                  <dt>{{ t('monthlyTotal') }}</dt>
                  <dd>
                    {{
                      totalMonthlyUyu(offer, usdUyu) === null
                        ? t('notPublished')
                        : money(totalMonthlyUyu(offer, usdUyu)!)
                    }}
                  </dd>
                </div>
              </dl>
              <p class="rental-page__note">{{ t('seen', { date: date(offer.lastSeen) }) }}</p>
              <p v-if="offer.publishedAt" class="rental-page__note">
                {{ t('publishedDate', { date: date(offer.publishedAt) }) }}
              </p>
              <div class="rental-page__offer-actions">
                <VBtn
                  v-if="offers.length > 1"
                  variant="tonal"
                  :aria-pressed="offerId(offer) === offerId(selectedOffer)"
                  @click="selectedId = offerId(offer)"
                  >{{ t('chooseOffer') }}</VBtn
                ><VBtn
                  :href="rentalSavedSafeUrl(offer.url)!"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  variant="text"
                  append-icon="mdi-open-in-new"
                  >{{ t('mapOpen', { source: source(offer) }) }}</VBtn
                >
              </div>
            </li>
          </ul>
        </section>
        <section class="rental-page__section" aria-labelledby="rental-conditions-title">
          <h2 id="rental-conditions-title">{{ t('offerFeatures') }}</h2>
          <p class="rental-page__note">
            {{ t('selectedSource', { source: source(selectedOffer) }) }}
          </p>
          <dl class="rental-page__facts">
            <div>
              <dt>{{ t('petsCondition') }}</dt>
              <dd>{{ t(selectedOffer.petsAllowed ? 'accepted' : 'notPublished') }}</dd>
            </div>
            <div>
              <dt>{{ t('furnishedCondition') }}</dt>
              <dd>{{ t(selectedOffer.furnished ? 'declared' : 'notPublished') }}</dd>
            </div>
            <div>
              <dt>{{ t('garageCondition') }}</dt>
              <dd>
                {{
                  (selectedOffer.parkingSpaces ?? 0) > 0
                    ? selectedOffer.parkingSpaces
                    : t('notPublished')
                }}
              </dd>
            </div>
            <div>
              <dt>{{ t('guaranteeCondition') }}</dt>
              <dd>{{ guarantees.length ? guarantees.join(' · ') : t('notPublished') }}</dd>
            </div>
          </dl>
          <p>{{ t('knownHint') }}</p>
        </section>
        <BudgetPlanner :key="property.key" :offer="selectedOffer" :usd-uyu="usdUyu" />
        <section class="rental-page__section" aria-labelledby="rental-location-title">
          <h2 id="rental-location-title">{{ t('locationTitle') }}</h2>
          <p>{{ [street, zone].filter(Boolean).join(' · ') }}</p>
          <template v-if="mapped">
            <p class="rental-page__note">{{ t('mapLocationHint') }}</p>
            <VBtn
              variant="tonal"
              prepend-icon="mdi-map-marker-outline"
              :aria-expanded="showMap"
              aria-controls="rental-location-map"
              @click="showMap = !showMap"
              >{{ t(showMap ? 'hideMap' : 'showMap') }}</VBtn
            >
            <div v-if="showMap" id="rental-location-map" class="rental-page__map">
              <ClientOnly
                ><LocationsMap
                  :branches="branches"
                  :center="[property.latitude!, property.longitude!]"
                  :zoom="15"
                  height="320px"
                  :popups="false"
                  :marker-hit-size="44"
              /></ClientOnly>
            </div>
          </template>
          <p v-else class="rental-page__note">{{ t('noCoordinates') }}</p>
          <p>
            <NuxtLink :to="nearbyLink">{{ t('exploreArea') }}</NuxtLink>
          </p>
        </section>
        <section
          v-if="market?.status !== 'not_comparable'"
          class="rental-page__section"
          aria-labelledby="rental-market-title"
        >
          <h2 id="rental-market-title">{{ t('marketTitle') }}</h2>
          <template v-if="market?.status === 'available' && market.medianRentUyu !== null">
            <p>
              {{
                t('marketIntro', { n: market.sampleSize, zone: market.scope?.neighborhood || zone })
              }}
            </p>
            <dl class="rental-page__market">
              <div>
                <dt>{{ t('median') }}</dt>
                <dd>{{ money(market.medianRentUyu) }}</dd>
              </div>
              <div v-if="market.p25RentUyu !== null && market.p75RentUyu !== null">
                <dt>{{ t('middleRange') }}</dt>
                <dd>{{ money(market.p25RentUyu) }} – {{ money(market.p75RentUyu) }}</dd>
              </div>
            </dl>
            <p v-if="difference !== null">
              <strong>{{
                Math.abs(difference) < 1
                  ? t('atMedian')
                  : t('marketDifference', {
                      n: Math.abs(difference),
                      direction: t(difference > 0 ? 'above' : 'below'),
                    })
              }}</strong>
            </p>
            <p class="rental-page__note">{{ t('marketHint') }}</p>
          </template>
          <p v-else>{{ t('smallSample', { n: market?.minimumSample || 10 }) }}</p>
        </section>
        <section class="rental-page__section" aria-labelledby="rental-visit-title">
          <h2 id="rental-visit-title">{{ t('visitTitle') }}</h2>
          <p>{{ t('visitIntro') }}</p>
          <ul class="rental-page__questions">
            <li v-for="question in questions" :key="question">
              <label
                ><input v-model="checked" type="checkbox" :value="question" /><span>{{
                  t(question)
                }}</span></label
              >
            </li>
          </ul>
          <VBtn
            color="primary"
            variant="tonal"
            prepend-icon="mdi-content-copy"
            @click="copyInquiry"
            >{{ t('copyQuestions') }}</VBtn
          >
        </section>
        <section
          class="rental-page__section rental-page__provenance"
          aria-labelledby="rental-provenance-title"
        >
          <h2 id="rental-provenance-title">{{ t('provenanceTitle') }}</h2>
          <p>{{ t('firstIndexed', { date: date(property.firstSeen) }) }}</p>
          <p>{{ t('freshnessHint') }}</p>
          <NuxtLink :to="{ path: localePath('/alquileres-uruguay'), hash: '#rental-coverage' }">{{
            t('coverage')
          }}</NuxtLink>
        </section>
      </article>
      <aside class="rental-page__decision" aria-labelledby="rental-cost-title">
        <h2 id="rental-cost-title">{{ t('costTitle') }}</h2>
        <p class="rental-page__note">
          {{ t('selectedSource', { source: source(selectedOffer) }) }}
        </p>
        <p class="rental-page__rent">
          {{ money(selectedOffer.price, selectedOffer.currency)
          }}<span>{{ t('monthlyRent') }}</span>
        </p>
        <dl class="rental-page__monthly">
          <div>
            <dt>{{ t('expenses') }}</dt>
            <dd>{{ expenses(selectedOffer) }}</dd>
          </div>
          <div class="rental-page__monthly-total">
            <dt>{{ t('monthlyTotal') }}</dt>
            <dd>{{ total === null ? t('notPublished') : money(total) }}</dd>
          </div>
        </dl>
        <p class="rental-page__note">
          {{ total === null ? t(rateMissing ? 'rateUnavailable' : 'costUnknown') : t('totalHint') }}
        </p>
        <p
          v-if="
            usdUyu > 0 &&
            (selectedOffer.currency === 'USD' || selectedOffer.commonExpensesCurrency === 'USD')
          "
          class="rental-page__note"
        >
          {{ t('rate', { rate: usdUyu.toFixed(2) }) }}
        </p>
        <p v-if="offers.length > 1">
          <a href="#rental-page-offers">{{ t('offersHeading') }} ({{ offers.length }})</a>
        </p>
        <VBtn
          :href="rentalSavedSafeUrl(selectedOffer.url)!"
          target="_blank"
          rel="noopener noreferrer nofollow"
          color="primary"
          append-icon="mdi-open-in-new"
          class="rental-page__contact"
          data-testid="rental-page-contact"
          >{{ t('contact') }}</VBtn
        >
        <p class="rental-page__note">{{ t('mapContactHint') }}</p>
        <VBtn
          :prepend-icon="favorite ? 'mdi-heart' : 'mdi-heart-outline'"
          :aria-pressed="favorite"
          variant="tonal"
          block
          @click="save"
          >{{ t(favorite ? 'unfavorite' : 'favorite') }}</VBtn
        >
        <p class="rental-page__note">{{ t('saveHint') }}</p>
      </aside>
      <section
        v-if="data?.similar.length"
        class="rental-page__similar rental-page__section"
        aria-labelledby="rental-similar-title"
      >
        <h2 id="rental-similar-title">{{ t('similarTitle') }}</h2>
        <p>{{ t('similarHint') }}</p>
        <ul>
          <li v-for="entry in data.similar" :key="entry.key">
            <NuxtLink :to="localePath(rentalPropertyPath(entry.key))"
              ><img
                v-if="rentalSavedSafeUrl(relatedOffer(entry)?.image)"
                :src="rentalSavedSafeUrl(relatedOffer(entry)?.image)!"
                :alt="entry.title"
                width="320"
                height="200"
                loading="lazy"
                referrerpolicy="no-referrer"
              /><span class="rental-page__similar-body"
                ><span>{{ [entry.neighborhood, entry.department].filter(Boolean).join(', ') }}</span
                ><strong>{{ entry.title }}</strong
                ><span
                  >{{
                    entry.bedrooms === 0
                      ? t('studio')
                      : entry.bedrooms !== null
                        ? `${entry.bedrooms} ${t('bedrooms').toLowerCase()}`
                        : ''
                  }}{{ entry.area ? ` · ${entry.area} m²` : '' }}</span
                ><b>{{ money(relatedOffer(entry).price, relatedOffer(entry).currency) }}</b
                ><span>{{ t('expenses') }}: {{ expenses(relatedOffer(entry)) }}</span></span
              ></NuxtLink
            >
          </li>
        </ul>
      </section>
      <nav class="rental-page__help" :aria-label="t('helpTitle')">
        <h2>{{ t('helpTitle') }}</h2>
        <NuxtLink :to="localePath('/alquilar-en-uruguay')">{{ t('guide') }}</NuxtLink
        ><NuxtLink :to="localePath('/alquilar-sin-recibo-de-sueldo')">{{
          t('independent')
        }}</NuxtLink
        ><NuxtLink :to="localePath('/alquilar-estando-en-clearing')">{{ t('clearing') }}</NuxtLink>
      </nav>
      <div class="rental-page__mobile-action">
        <VBtn
          :icon="favorite ? 'mdi-heart' : 'mdi-heart-outline'"
          :aria-label="t(favorite ? 'unfavorite' : 'favorite')"
          :aria-pressed="favorite"
          variant="tonal"
          @click="save"
        /><VBtn
          :href="rentalSavedSafeUrl(selectedOffer.url)!"
          target="_blank"
          rel="noopener noreferrer nofollow"
          color="primary"
          append-icon="mdi-open-in-new"
          >{{ t('contact') }}</VBtn
        >
      </div>
    </div>
    <VSnackbar v-model="snackbar" :timeout="5000">{{ notice }}</VSnackbar>
  </VContainer>
</template>

<style scoped>
.rental-page {
  max-width: 1220px;
  padding-bottom: 64px;
}
.rental-page__back {
  margin: 8px 0 20px -12px;
  min-height: 44px;
}
.rental-page__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 344px;
  gap: 36px 44px;
  align-items: start;
}
.rental-page__main {
  min-width: 0;
}
.rental-page h1 {
  font-size: clamp(1.5rem, 2.5vw, 2rem);
  line-height: 1.25;
  text-wrap: balance;
  margin: 8px 0 12px;
  overflow-wrap: anywhere;
}
.rental-page h2 {
  font-size: 1.375rem;
  line-height: 1.35;
  margin: 0 0 12px;
  text-wrap: balance;
}
.rental-page h3 {
  font-size: 1.0625rem;
  margin: 0;
}
.rental-page p {
  margin: 10px 0;
  line-height: 1.65;
}
.rental-page a:not(.v-btn) {
  color: rgb(var(--v-theme-link));
  text-underline-offset: 3px;
}
.rental-page a:focus-visible,
.rental-page button:focus-visible,
.rental-page input:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
}
.rental-page .v-btn {
  min-height: 44px;
  max-width: 100%;
  height: auto;
}
.rental-page :deep(.v-btn__content) {
  white-space: normal;
  padding-block: 8px;
  line-height: 1.4;
}
.rental-page__zone {
  font-weight: 600;
}
.rental-page__tools {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin: 12px 0 20px -12px;
}
.rental-page__gallery {
  margin: 0;
}
.rental-page__photo {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 8 / 5;
  max-height: 460px;
  object-fit: contain;
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.rental-page__photo--empty {
  aspect-ratio: auto;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  gap: 16px;
  min-height: 220px;
  padding: 24px;
  text-align: center;
}
.rental-page__gallery figcaption {
  font-size: 0.8125rem;
  margin-top: 12px;
}
.rental-page__gallery figcaption p {
  margin-top: 6px;
}
.rental-page__thumbs {
  display: flex;
  gap: 8px;
  padding: 12px 2px 2px;
  overflow-x: auto;
}
.rental-page__thumbs button {
  flex: 0 0 80px;
  border: 2px solid transparent;
  border-radius: 8px;
  overflow: hidden;
  height: 60px;
}
.rental-page__thumbs button[aria-pressed='true'] {
  border-color: rgb(var(--v-theme-primary));
}
.rental-page__thumbs img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.rental-page__section {
  margin-top: 40px;
  scroll-margin-top: 100px;
}
.rental-page__facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 24px;
  margin: 16px 0;
}
.rental-page__facts > div {
  padding: 14px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.rental-page dt {
  font-size: 0.875rem;
  line-height: 1.5;
}
.rental-page dd {
  margin: 4px 0 0;
  font-weight: 700;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.rental-page__note {
  font-size: 0.875rem;
}
.rental-page__offers {
  list-style: none;
  padding: 0;
  margin: 20px 0;
}
.rental-page__offers > li {
  padding: 22px 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.rental-page__offer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.rental-page__offer-head > span {
  color: rgb(var(--v-theme-link));
  font-size: 0.8125rem;
  font-weight: 700;
}
.rental-page__offer-costs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 16px 0;
}
.rental-page__offer-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 16px;
}
.rental-page__decision {
  position: sticky;
  top: 96px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 14px;
  padding: 24px;
  background: rgb(var(--v-theme-surface));
}
.rental-page__decision h2 {
  font-size: 1.125rem;
}
.rental-page__rent {
  font-size: 2rem;
  font-weight: 750;
  line-height: 1.25 !important;
  font-variant-numeric: tabular-nums;
}
.rental-page__rent > span {
  display: block;
  font-size: 0.875rem;
  font-weight: 400;
  margin-top: 8px;
}
.rental-page__monthly {
  margin-top: 24px;
}
.rental-page__monthly > div {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px 16px;
  padding-block: 10px;
}
.rental-page__monthly-total {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.rental-page__monthly-total dd {
  font-size: 1.375rem;
}
.rental-page__decision > a:not(.v-btn) {
  display: inline-block;
  margin-top: 8px;
}
.rental-page__contact {
  width: 100%;
  margin-top: 24px;
  min-height: 48px !important;
}
.rental-page__map {
  border-radius: 12px;
  overflow: hidden;
  margin-top: 20px;
  isolation: isolate;
}
.rental-page__market {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-block: 24px;
}
.rental-page__market dd {
  font-size: 1.375rem;
  font-variant-numeric: tabular-nums;
}
.rental-page__questions {
  list-style: none;
  padding: 0;
  margin: 16px 0 24px;
}
.rental-page__questions label {
  display: flex;
  align-items: start;
  gap: 14px;
  padding-block: 12px;
  cursor: pointer;
  line-height: 1.55;
  min-height: 48px;
}
.rental-page__questions input {
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
  margin-top: 2px;
  accent-color: rgb(var(--v-theme-primary));
}
.rental-page__questions input:checked + span {
  text-decoration: line-through;
}
.rental-page__provenance {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding-top: 24px;
}
.rental-page__similar,
.rental-page__help {
  grid-column: 1 / -1;
}
.rental-page__similar {
  margin-top: 8px;
}
.rental-page__similar ul {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
  padding: 0;
  list-style: none;
  margin-top: 24px;
}
.rental-page__similar li {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  overflow: hidden;
}
.rental-page__similar a {
  display: block;
  height: 100%;
  text-decoration: none;
  color: inherit;
}
.rental-page__similar a:hover strong {
  text-decoration: underline;
}
.rental-page__similar img {
  width: 100%;
  height: 180px;
  object-fit: cover;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.rental-page__similar-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
}
.rental-page__similar-body > span {
  font-size: 0.875rem;
}
.rental-page__similar-body > strong {
  color: rgb(var(--v-theme-link));
  line-height: 1.4;
}
.rental-page__similar-body > b {
  font-size: 1.25rem;
}
.rental-page__help {
  display: flex;
  gap: 12px 28px;
  flex-wrap: wrap;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding-top: 24px;
}
.rental-page__help h2 {
  flex-basis: 100%;
}
.rental-page__help a {
  min-height: 44px;
}
.rental-page__mobile-action {
  display: none;
}
.rental-page__unavailable {
  max-width: 65ch;
  padding-block: 24px 80px;
}
@media (min-width: 960px) and (max-height: 740px) {
  .rental-page__decision {
    position: static;
  }
}
@media (max-width: 959px) {
  .rental-page {
    padding-bottom: calc(104px + env(safe-area-inset-bottom));
  }
  .rental-page__layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 28px;
  }
  .rental-page__main {
    display: contents;
  }
  .rental-page__heading {
    grid-row: 1;
  }
  .rental-page__gallery {
    grid-row: 2;
  }
  .rental-page__decision {
    grid-row: 3;
    position: static;
    padding: 20px;
  }
  .rental-page__section {
    margin-top: 16px;
  }
  .rental-page__photo {
    max-height: 380px;
  }
  .rental-page__tools {
    margin-bottom: 0;
  }
  .rental-page__similar ul {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .rental-page__mobile-action {
    position: fixed;
    z-index: 1900;
    inset: auto 0 0;
    display: flex;
    justify-content: center;
    gap: 10px;
    padding: 10px max(76px, env(safe-area-inset-right)) max(10px, env(safe-area-inset-bottom))
      max(12px, env(safe-area-inset-left));
    background: rgb(var(--v-theme-surface));
    border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }
  .rental-page__mobile-action > .v-btn {
    min-height: 48px;
  }
  .rental-page__mobile-action > .v-btn:last-child {
    flex: 1;
    max-width: 420px;
    min-width: 0;
  }
}
@media (max-width: 599px) {
  .rental-page__back {
    margin-bottom: 12px;
  }
  .rental-page__layout {
    gap: 20px;
  }
  .rental-page__photo {
    max-height: 260px;
  }
  .rental-page__offer-costs {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .rental-page__offer-costs > div {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 6px 12px;
  }
  .rental-page__offer-costs dd {
    margin-top: 0;
  }
  .rental-page__offer-actions > .v-btn {
    width: 100%;
  }
  .rental-page__market {
    grid-template-columns: 1fr;
    gap: 18px;
  }
  .rental-page__similar ul {
    grid-template-columns: 1fr;
  }
  .rental-page__similar img {
    height: 200px;
  }
  .rental-page__mobile-action {
    padding-right: max(64px, env(safe-area-inset-right));
  }
}
</style>
