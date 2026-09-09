<!--
THESIS: Make a rental decision with the published costs, competing adverts and unanswered questions together.
OWN-WORLD: Extend the directory's navy/paper surfaces, Open Sans, blue actions and explicit data provenance.
STORY: See the photos, price and key facts first; then description, location, adverts and the enquiry.
FIRST VIEWPORT: Title with the key-facts strip, the cover photo with its counter, and a sticky price card with the contact action; mobile keeps a persistent price + contact bar.
FORM: A portal-style property page (Mercado Libre / InfoCasas grammar) with the site's provenance demoted to footnotes, never removed.
-->
<script setup lang="ts">
import BudgetPlanner from '~/components/rentals/BudgetPlanner.vue'
import PropertyGallery from '~/components/rentals/PropertyGallery.vue'
import { rentalPageMessages } from '~/utils/rentalPageMessages'
import type { RentalPageResponse } from '~/utils/rentalPage'
import { rentalPageSchema } from '~/utils/rentalPageSeo'
import {
  RENTAL_GUARANTEE_PUBLISHED,
  RENTAL_SOURCE_LABEL,
  totalMonthlyUyu,
  type RentalOffer,
  type RentalPublicProperty,
} from '~/utils/rentals'
import { portalPriceGap, rentalListedFor } from '~/utils/rentalPortals'
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
const availability = useRentalAvailability()
const { data, pending, error, refresh } = await useAsyncData<RentalPageResponse>(
  () => `rental-page:${propertyKey.value}`,
  () =>
    $fetch(`/api/rentals/ficha/${encodeURIComponent(propertyKey.value)}`, {
      query: availability.withRevision({}),
    })
)
availability.watchChanges(() => refresh())
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
const sourceName = (key: RentalOffer['source']) => RENTAL_SOURCE_LABEL[key]
// La brecha se calcula sobre los avisos QUE SE MUESTRAN (`offers`, ya filtrados por enlace usable):
// anunciar un precio más barato en un aviso que la ficha no enlaza sería una promesa sin puerta.
const priceGap = computed(() =>
  property.value ? portalPriceGap({ ...property.value, offers: offers.value }) : null
)
// Mismo instante para servidor y cliente: ver el comentario en /alquileres-uruguay.
const renderedAt = useState('rental-rendered-at', () => Date.now())
const listedFor = computed(() =>
  property.value
    ? rentalListedFor({ ...property.value, offers: offers.value }, new Date(renderedAt.value))
    : null
)
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
  garaje: 'garage',
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
const sellerType = (offer: RentalOffer) =>
  t(
    offer.sellerType === 'particular'
      ? 'individual'
      : offer.sellerType === 'inmobiliaria'
        ? 'agency'
        : 'notPublished'
  )
const seller = (offer: RentalOffer) =>
  [offer.sellerName, sellerType(offer)].filter(Boolean).join(' · ')
const parkingSpaces = computed(
  () => selectedOffer.value?.parkingSpaces ?? property.value?.parkingSpaces ?? 0
)
// The strip under the title: the four numbers a portal visitor scans before anything else.
const keyFacts = computed(() => {
  const entry = property.value
  if (!entry) return []
  const facts: { icon: string; text: string }[] = []
  if (entry.bedrooms === 0) facts.push({ icon: 'mdi-bed-outline', text: t('studio') })
  else if (entry.bedrooms !== null)
    facts.push({
      icon: 'mdi-bed-outline',
      text: t('bedroomCount', { n: entry.bedrooms }, entry.bedrooms),
    })
  if (entry.bathrooms !== null)
    facts.push({
      icon: 'mdi-shower',
      text: t('bathroomCount', { n: entry.bathrooms }, entry.bathrooms),
    })
  if (entry.area) facts.push({ icon: 'mdi-ruler-square', text: `${entry.area} m²` })
  if (parkingSpaces.value > 0)
    facts.push({
      icon: 'mdi-car-outline',
      text: t('parkingCount', { n: parkingSpaces.value }, parkingSpaces.value),
    })
  return facts
})
interface Fact {
  key: string
  label: string
  value: string
  empty?: boolean
}
/** Half a column holds a label and a short value; past that the pair stacks instead of wrapping. */
const stacked = (fact: Fact) => fact.value.length > 20
// Property-level facts. A detail surface is shown only when it says something the headline
// surface does not: the same 20 m² repeated as built, total and land is noise, not data.
const propertyFacts = computed<Fact[]>(() => {
  const entry = property.value
  if (!entry) return []
  const details = selectedOffer.value?.details
  const surface = (key: string, value: number | null | undefined): Fact[] =>
    value && value !== entry.area ? [{ key, label: t(key), value: `${value} m²` }] : []
  return [
    { key: 'type', label: t('type'), value: typeLabel.value },
    {
      key: 'bedrooms',
      label: t('bedrooms'),
      value:
        entry.bedrooms === 0
          ? t('studio')
          : entry.bedrooms === null
            ? t('notPublished')
            : String(entry.bedrooms),
      empty: entry.bedrooms === null,
    },
    {
      key: 'bathrooms',
      label: t('bathrooms'),
      value: entry.bathrooms === null ? t('notPublished') : String(entry.bathrooms),
      empty: entry.bathrooms === null,
    },
    {
      key: 'area',
      label: t('mapArea'),
      value: entry.area ? `${entry.area} m²` : t('notPublished'),
      empty: !entry.area,
    },
    ...surface('builtArea', details?.builtArea),
    ...surface('totalArea', details?.totalArea),
    ...surface('landArea', details?.landArea),
    ...surface('terraceArea', details?.terraceArea),
  ]
})
// Conditions belong to ONE advert, never to the merged property.
const conditionFacts = computed<Fact[]>(() => {
  const offer = selectedOffer.value
  if (!offer) return []
  const parking = offer.parkingSpaces ?? 0
  return [
    {
      key: 'pets',
      label: t('petsCondition'),
      value: t(offer.petsAllowed ? 'accepted' : 'notPublished'),
      empty: !offer.petsAllowed,
    },
    {
      key: 'furnished',
      label: t('furnishedCondition'),
      value: t(offer.furnished ? 'declared' : 'notPublished'),
      empty: !offer.furnished,
    },
    {
      key: 'garage',
      label: t('garageCondition'),
      value: parking > 0 ? String(parking) : t('notPublished'),
      empty: !(parking > 0),
    },
    {
      key: 'guarantee',
      label: t('guaranteeCondition'),
      value: guarantees.value.length ? guarantees.value.join(' · ') : t('notPublished'),
      empty: !guarantees.value.length,
    },
  ]
})
const photos = computed(() => (property.value ? rentalPhotos(property.value) : []))
const saved = ref(emptyRentalSaved())
const favorite = computed(() => saved.value.favorites.some(item => item.key === propertyKey.value))
const returnPath = ref('')
const notice = ref('')
const snackbar = ref(false)
const checked = ref<string[]>([])
const showMap = ref(false)
const LocationsMap = defineAsyncComponent(() => import('~/components/map/LocationsMap.vue'))
const mapped = computed(() => property.value && rentalHasLocation(property.value))
// The map is the portal norm, but Leaflet is not free: it mounts by itself only once the
// location section is about to scroll into view, and the toggle still lets the visitor hide it.
const locationSection = ref<HTMLElement | null>(null)
let mapObserver: IntersectionObserver | null = null
watch(
  locationSection,
  element => {
    mapObserver?.disconnect()
    mapObserver = null
    if (!element || !mapped.value || typeof IntersectionObserver === 'undefined') return
    mapObserver = new IntersectionObserver(
      entries => {
        if (!entries.some(entry => entry.isIntersecting)) return
        showMap.value = true
        mapObserver?.disconnect()
        mapObserver = null
      },
      { rootMargin: '200px 0px' }
    )
    mapObserver.observe(element)
  },
  { flush: 'post' }
)
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
onBeforeUnmount(() => {
  window.removeEventListener('storage', onStorage)
  mapObserver?.disconnect()
})
watch(propertyKey, () => {
  selectedId.value = ''
  checked.value = []
  showMap.value = false
})
const relatedOffer = (entry: RentalPublicProperty) => entry.matchingOffer ?? entry.offers[0]
const relatedSpecs = (entry: RentalPublicProperty) =>
  [
    entry.bedrooms === 0
      ? t('studio')
      : entry.bedrooms !== null
        ? t('bedroomCount', { n: entry.bedrooms }, entry.bedrooms)
        : '',
    entry.bathrooms !== null ? t('bathroomCount', { n: entry.bathrooms }, entry.bathrooms) : '',
    entry.area ? `${entry.area} m²` : '',
  ]
    .filter(Boolean)
    .join(' · ')
const pageTitle = computed(() =>
  property.value && defaultOffer.value
    ? t('propertySeo', {
        type: [
          typeLabel.value,
          !uncertainData.value && property.value.bedrooms !== null
            ? property.value.bedrooms === 0
              ? t('studio')
              : t('seoBedrooms', { n: property.value.bedrooms })
            : '',
        ]
          .filter(Boolean)
          .join(' '),
        zone: zone.value || 'Uruguay',
        price: money(defaultOffer.value.price, defaultOffer.value.currency),
      })
    : title.value
)
const description = computed(() =>
  property.value
    ? t('propertyDescription', {
        summary: [pageTitle.value, street.value].filter(Boolean).join(' · '),
      })
    : t('unavailableHint')
)
const primaryPhoto = computed(() => photos.value[0])
const primaryPhotoAlt = computed(() =>
  primaryPhoto.value
    ? t('photoDescription', { title: primaryPhoto.value.title || title.value, n: 1 })
    : undefined
)
// Keep the generated URL usable for older links and image crawlers, even when
// the published preview uses the advert's own photo.
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
  ogImage: () => primaryPhoto.value?.url,
  ogImageAlt: () => primaryPhotoAlt.value,
  twitterImage: () => primaryPhoto.value?.url,
  twitterImageAlt: () => primaryPhotoAlt.value,
  twitterTitle: () => pageTitle.value,
  twitterDescription: () => description.value,
  twitterCard: 'summary_large_image',
  robots: () =>
    locale.value === 'es' && data.value?.seo.indexable && !error.value
      ? 'index, follow, max-image-preview:large'
      : 'noindex, follow',
})
// Use explicit head tags: the installed production useSeoMeta optimizer drops
// its options argument, including tagPriority. Keep this photo override at the
// OG module's priority without removing the generated card's payload.
useHead(
  () => ({
    meta: primaryPhoto.value
      ? [
          { property: 'og:image', content: primaryPhoto.value.url },
          { name: 'twitter:image', content: primaryPhoto.value.url },
          { name: 'twitter:image:src', content: primaryPhoto.value.url },
          { property: 'og:image:type', content: null },
          { property: 'og:image:width', content: null },
          { property: 'og:image:height', content: null },
          { name: 'twitter:image:width', content: null },
          { name: 'twitter:image:height', content: null },
        ]
      : [],
  }),
  { tagPriority: 'high' }
)
useHead(() => ({
  link: [{ rel: 'canonical', href: canonical.value }],
  script:
    property.value && !error.value
      ? [
          {
            type: 'application/ld+json',
            key: 'rental-property-schema',
            innerHTML: JSON.stringify(
              rentalPageSchema({
                property: property.value,
                canonical: canonical.value,
                locale: locale.value,
                title: pageTitle.value,
                description: description.value,
                uncertain: Boolean(uncertainData.value),
                breadcrumbs: [
                  { name: t('country'), url: `https://cambio-uruguay.com${localePath('/')}` },
                  {
                    name: t('title'),
                    url: `https://cambio-uruguay.com${localePath('/alquileres-uruguay')}`,
                  },
                  { name: title.value, url: canonical.value },
                ],
                photoCaption: (photoTitle, n) => t('photoDescription', { title: photoTitle, n }),
                photoCredit: photoSource =>
                  t('photoCredit', { source: RENTAL_SOURCE_LABEL[photoSource] }),
              })
            ).replace(/</g, '\\u003c'),
          },
        ]
      : [],
}))
</script>

<template>
  <VContainer class="rental-page pt-1 pt-sm-4" data-testid="rental-property-page">
    <div class="rental-page__topbar">
      <VBtn
        :to="returnPath || localePath('/alquileres-uruguay')"
        variant="text"
        prepend-icon="mdi-arrow-left"
        class="rental-page__back cu-btn-flush"
        :class="{ 'is-generic': !returnPath }"
        >{{ returnPath ? t('back') : t('search') }}</VBtn
      >
      <VBreadcrumbs :items="breadcrumbs" density="compact" class="rental-page__crumbs px-0 py-0" />
    </div>
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
          <div class="rental-page__heading-row">
            <div class="rental-page__heading-text">
              <p class="rental-page__zone">{{ typeLabel }} · {{ zone }}</p>
              <h1>{{ title }}</h1>
              <p v-if="street" class="rental-page__street">
                <VIcon icon="mdi-map-marker-outline" size="18" aria-hidden="true" />{{ street }}
              </p>
            </div>
            <div class="rental-page__tools">
              <VBtn
                :icon="favorite ? 'mdi-heart' : 'mdi-heart-outline'"
                variant="text"
                :aria-pressed="favorite"
                :aria-label="t(favorite ? 'unfavorite' : 'favorite')"
                :title="t(favorite ? 'unfavorite' : 'favorite')"
                class="rental-page__icon-tool"
                @click="save"
              />
              <VBtn
                icon="mdi-share-variant-outline"
                variant="text"
                :aria-label="t('share')"
                :title="t('share')"
                class="rental-page__icon-tool"
                @click="share"
              />
            </div>
          </div>
          <ul v-if="keyFacts.length" class="rental-page__keyfacts" :aria-label="t('keyFacts')">
            <li v-for="fact in keyFacts" :key="fact.icon">
              <VIcon :icon="fact.icon" size="20" aria-hidden="true" />{{ fact.text }}
            </li>
          </ul>
          <VAlert v-if="uncertainData" type="warning" variant="tonal" class="mt-4">{{
            t('uncertainData')
          }}</VAlert>
        </header>
        <PropertyGallery :property="property" class="rental-page__gallery" />
        <nav class="rental-page__sections" :aria-label="t('onThisPage')">
          <a href="#rental-facts-title">{{ t('factsShort') }}</a>
          <a href="#rental-description-title">{{ t('descriptionShort') }}</a>
          <a href="#rental-location-title">{{ t('locationShort') }}</a>
          <a href="#rental-page-offers">{{ t('costsShort') }}</a>
          <a href="#rental-visit-title">{{ t('visitShort') }}</a>
        </nav>
        <section class="rental-page__section" aria-labelledby="rental-facts-title">
          <h2 id="rental-facts-title">{{ t('features') }}</h2>
          <p v-if="uncertainData" class="rental-page__note">
            <strong>{{ t('factsToConfirm') }}</strong>
          </p>
          <dl class="rental-page__facts">
            <div
              v-for="fact in propertyFacts"
              :key="fact.key"
              :class="{ 'is-stacked': stacked(fact) }"
            >
              <dt>{{ fact.label }}</dt>
              <dd :class="{ 'is-empty': fact.empty }">{{ fact.value }}</dd>
            </div>
          </dl>
          <div class="rental-page__subhead">
            <h3>{{ t('conditions') }}</h3>
            <span>{{ t('selectedSource', { source: source(selectedOffer) }) }}</span>
          </div>
          <dl class="rental-page__facts">
            <div
              v-for="fact in conditionFacts"
              :key="fact.key"
              :class="{ 'is-stacked': stacked(fact) }"
            >
              <dt>{{ fact.label }}</dt>
              <dd :class="{ 'is-empty': fact.empty }">{{ fact.value }}</dd>
            </div>
          </dl>
          <p v-if="selectedOffer.details?.guaranteeText" class="rental-page__quote">
            <strong>{{ t('guaranteeText') }}:</strong> {{ selectedOffer.details.guaranteeText }}
          </p>
          <template v-if="selectedOffer.details?.amenities?.length">
            <div class="rental-page__subhead">
              <h3>{{ t('amenitiesTitle') }}</h3>
            </div>
            <ul class="rental-page__amenities">
              <li v-for="amenity in selectedOffer.details.amenities" :key="amenity">
                <VIcon icon="mdi-check" size="16" aria-hidden="true" />{{ amenity }}
              </li>
            </ul>
          </template>
          <p class="rental-page__note">{{ t('sourceFacts') }}</p>
        </section>
        <section class="rental-page__section" aria-labelledby="rental-description-title">
          <h2 id="rental-description-title">{{ t('descriptionShort') }}</h2>
          <p
            v-if="selectedOffer.details?.description"
            class="rental-page__description"
            data-testid="rental-source-description"
          >
            {{ selectedOffer.details.description }}
          </p>
          <p v-else>{{ t('descriptionEmpty') }}</p>
          <p class="rental-page__note">
            {{ t('descriptionSource', { source: source(selectedOffer) }) }}
          </p>
        </section>
        <section
          ref="locationSection"
          class="rental-page__section"
          aria-labelledby="rental-location-title"
        >
          <h2 id="rental-location-title">{{ t('locationShort') }}</h2>
          <p class="rental-page__address">
            <VIcon icon="mdi-map-marker-outline" size="20" aria-hidden="true" />
            <span>{{ [street, zone].filter(Boolean).join(' · ') }}</span>
          </p>
          <template v-if="mapped">
            <div class="rental-page__location-actions">
              <VBtn
                variant="tonal"
                prepend-icon="mdi-map-outline"
                :aria-expanded="showMap"
                aria-controls="rental-location-map"
                @click="showMap = !showMap"
                >{{ t(showMap ? 'hideMap' : 'showMap') }}</VBtn
              >
              <VBtn variant="text" :to="nearbyLink" prepend-icon="mdi-home-search-outline">{{
                t('exploreArea')
              }}</VBtn>
            </div>
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
            <p class="rental-page__note">{{ t('mapLocationHint') }}</p>
          </template>
          <template v-else>
            <p class="rental-page__note">{{ t('noCoordinates') }}</p>
            <div class="rental-page__location-actions">
              <VBtn variant="text" :to="nearbyLink" prepend-icon="mdi-home-search-outline">{{
                t('exploreArea')
              }}</VBtn>
            </div>
          </template>
          <PropertyNearbyServices operation="rent" :property-key="property.key" />
        </section>
        <section
          v-if="market?.status !== 'not_comparable'"
          class="rental-page__section"
          aria-labelledby="rental-market-title"
        >
          <h2 id="rental-market-title">{{ t('marketShort') }}</h2>
          <template v-if="market?.status === 'available' && market.medianRentUyu !== null">
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
            <p v-if="difference !== null" class="rental-page__verdict">
              {{
                Math.abs(difference) < 1
                  ? t('atMedian')
                  : t('marketDifference', {
                      n: Math.abs(difference),
                      direction: t(difference > 0 ? 'above' : 'below'),
                    })
              }}
            </p>
            <p class="rental-page__note">
              {{
                t('marketIntro', { n: market.sampleSize, zone: market.scope?.neighborhood || zone })
              }}
              {{ t('marketHint') }}
            </p>
          </template>
          <p v-else class="rental-page__note">
            {{ t('smallSample', { n: market?.minimumSample || 10 }) }}
          </p>
        </section>
        <section
          id="rental-page-offers"
          class="rental-page__section"
          aria-labelledby="rental-offers-title"
        >
          <h2 id="rental-offers-title">
            {{ t('advertsShort') }}<span v-if="offers.length > 1"> ({{ offers.length }})</span>
          </h2>
          <p v-if="offers.length > 1" class="rental-page__note">{{ t('offersHint') }}</p>
          <VAlert
            v-if="priceGap"
            type="success"
            variant="tonal"
            density="comfortable"
            class="mb-4"
            data-testid="rental-page-gap"
          >
            <p class="font-weight-medium mb-1">{{ t('gapHeading') }}</p>
            <p class="mb-1">
              {{
                t('gapLine', {
                  cheap: source(priceGap.cheapestOffer),
                  cheapPrice: money(priceGap.cheapestUyu),
                  dear: sourceName(priceGap.runnerUpSource),
                  diff: money(priceGap.diffUyu),
                  pct: Math.round(priceGap.diffPct),
                })
              }}
            </p>
            <p class="text-caption mb-0">{{ t('gapNote') }}</p>
          </VAlert>
          <RentalsAvailabilityReport
            :offers="offers"
            :summary="property.availability"
            :preferred="selectedOffer || undefined"
            :title="property.title"
          />
          <ul class="rental-page__offers">
            <li
              v-for="offer in offers"
              :key="offerId(offer)"
              :class="{
                'is-selected': offers.length > 1 && offerId(offer) === offerId(selectedOffer),
              }"
            >
              <div class="rental-page__offer-head">
                <div class="rental-page__offer-title">
                  <h3>{{ source(offer) }}</h3>
                  <p>{{ seller(offer) }}</p>
                </div>
                <span
                  v-if="offers.length > 1 && offerId(offer) === offerId(selectedOffer)"
                  class="rental-page__offer-flag"
                  ><VIcon icon="mdi-check-circle" size="16" aria-hidden="true" />{{
                    t('selectedOffer')
                  }}</span
                >
              </div>
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
              <PropertyAdvertiserContact :publisher="offer" />
              <p class="rental-page__offer-seen">{{ t('seen', { date: date(offer.lastSeen) }) }}</p>
              <details class="rental-page__offer-more">
                <summary>{{ t('advertData') }}</summary>
                <p>{{ t('originalTitle', { title: offer.title }) }}</p>
                <p>{{ t('advertReference', { source: source(offer), id: offer.listingId }) }}</p>
                <p v-if="offer.publishedAt">
                  {{ t('publishedDate', { date: date(offer.publishedAt) }) }}
                </p>
              </details>
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
                  variant="outlined"
                  append-icon="mdi-open-in-new"
                  >{{ t('mapOpen', { source: source(offer) }) }}</VBtn
                >
              </div>
            </li>
          </ul>
        </section>
        <BudgetPlanner :key="property.key" :offer="selectedOffer" :usd-uyu="usdUyu" />
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
          <p v-if="listedFor" data-testid="rental-page-listed">
            {{
              t(listedFor.basis === 'published' ? 'listedPublished' : 'listedObserved', {
                days: listedFor.days,
                date: date(listedFor.date),
              })
            }}
          </p>
          <p v-if="listedFor?.basis === 'observed'" class="text-caption">
            {{ t('listedObservedNote') }}
          </p>
          <p>{{ t('firstIndexed', { date: date(property.firstSeen) }) }}</p>
          <p>{{ t('freshnessHint') }}</p>
          <NuxtLink :to="{ path: localePath('/alquileres-uruguay'), hash: '#rental-coverage' }">{{
            t('coverage')
          }}</NuxtLink>
        </section>
      </article>
      <aside class="rental-page__decision" aria-labelledby="rental-cost-title">
        <h2 id="rental-cost-title">{{ t('costTitle') }}</h2>
        <p class="rental-page__rent">
          {{ money(selectedOffer.price, selectedOffer.currency)
          }}<span
            >{{ t('monthlyRent') }} ·
            {{ t('selectedSource', { source: source(selectedOffer) }) }}</span
          >
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
          <template
            v-if="
              usdUyu > 0 &&
              (selectedOffer.currency === 'USD' || selectedOffer.commonExpensesCurrency === 'USD')
            "
          >
            {{ t('rate', { rate: usdUyu.toFixed(2) }) }}
          </template>
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
        <div class="rental-page__publisher">
          <p>
            <VIcon
              :icon="
                selectedOffer.sellerType === 'inmobiliaria'
                  ? 'mdi-office-building-outline'
                  : 'mdi-account-outline'
              "
              size="20"
              aria-hidden="true"
            />
            <span
              ><span class="rental-page__publisher-label">{{ t('publisher') }}</span>
              <strong>{{ selectedOffer.sellerName || sellerType(selectedOffer) }}</strong>
              <template v-if="selectedOffer.sellerName">
                · {{ sellerType(selectedOffer) }}</template
              >
            </span>
          </p>
          <PropertyAdvertiserContact :publisher="selectedOffer" compact />
        </div>
        <VBtn
          :prepend-icon="favorite ? 'mdi-heart' : 'mdi-heart-outline'"
          :aria-pressed="favorite"
          variant="tonal"
          block
          @click="save"
          >{{ t(favorite ? 'unfavorite' : 'favorite') }}</VBtn
        >
        <p class="rental-page__note">{{ t('saveHint') }}</p>
        <p v-if="offers.length > 1" class="rental-page__decision-link">
          <a href="#rental-page-offers">{{ t('advertsShort') }} ({{ offers.length }})</a>
        </p>
      </aside>
      <section
        v-if="data?.similar.length"
        class="rental-page__similar rental-page__section"
        aria-labelledby="rental-similar-title"
      >
        <h2 id="rental-similar-title">{{ t('similarTitle') }}</h2>
        <p class="rental-page__note">{{ t('similarHint') }}</p>
        <ul>
          <li v-for="entry in data.similar" :key="entry.key">
            <NuxtLink :to="localePath(rentalPropertyPath(entry.key))">
              <span class="rental-page__similar-media">
                <img
                  v-if="rentalSavedSafeUrl(relatedOffer(entry)?.image)"
                  :src="rentalSavedSafeUrl(relatedOffer(entry)?.image)!"
                  :alt="entry.title"
                  width="320"
                  height="200"
                  loading="lazy"
                  referrerpolicy="no-referrer"
                />
                <VIcon v-else icon="mdi-home-city-outline" size="36" aria-hidden="true" />
              </span>
              <span class="rental-page__similar-body">
                <b>{{ money(relatedOffer(entry).price, relatedOffer(entry).currency) }}</b>
                <span class="rental-page__similar-expenses"
                  >{{ t('expenses') }}: {{ expenses(relatedOffer(entry)) }}</span
                >
                <strong>{{ entry.title }}</strong>
                <span class="rental-page__similar-specs">{{ relatedSpecs(entry) }}</span>
                <span class="rental-page__similar-zone">{{
                  [entry.neighborhood, entry.department].filter(Boolean).join(', ')
                }}</span>
              </span>
            </NuxtLink>
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
        />
        <p class="rental-page__bar-price">
          <strong>{{ money(selectedOffer.price, selectedOffer.currency) }}</strong>
          <span>{{
            total === null ? t('monthlyRent') : t('priceBarTotal', { price: money(total) })
          }}</span>
        </p>
        <VBtn
          :href="rentalSavedSafeUrl(selectedOffer.url)!"
          target="_blank"
          rel="noopener noreferrer nofollow"
          color="primary"
          append-icon="mdi-open-in-new"
          :aria-label="t('contact')"
          >{{ t('openAdvertShort') }}</VBtn
        >
      </div>
    </div>
    <VSnackbar v-model="snackbar" :timeout="5000">{{ notice }}</VSnackbar>
  </VContainer>
</template>

<style scoped>
/* `anywhere` parte adentro de la palabra: a 320px el título salía "Monoambient / e en alquiler".
   Se rompe sólo lo que no entra solo en una línea, y `anywhere` queda para lo que de verdad lo
   necesita — la descripción del origen, los valores y las referencias del aviso. */
.rental-page {
  max-width: 1220px;
  padding-bottom: 64px;
  overflow-wrap: break-word;
}
.rental-page__topbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 20px;
  margin-bottom: 16px;
}
.rental-page :deep(.v-breadcrumbs) {
  flex-wrap: wrap;
  font-size: 0.875rem;
}
.rental-page :deep(.v-breadcrumbs-item) {
  white-space: normal;
  overflow-wrap: anywhere;
}
.rental-page__back {
  min-height: 44px;
}
.rental-page__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 32px 40px;
  align-items: start;
}
.rental-page__main {
  min-width: 0;
}
/* Every text block declares its own gap; the browser's 1em margins are not ours. `dd` belongs in
   this list: its UA `margin-inline-start: 40px` indented every value that is not in a flex row.
   `:where()` and NOT `:is()`: `:is()` takes the specificity of its argument, so this reset scored
   (0,1,1) and beat every `.rental-page__x { margin-top }` in this file, which score (0,1,0). It
   was silently flattening seventeen blocks to zero — the amenity chips sat flush against their
   own heading. `:where()` scores zero, so the reset still clears the UA margins and every class
   below still wins. Medido en producción antes y después; ver docs/app/CSS_RESET_SPECIFICITY.md. */
:where(.rental-page) :where(h1, h2, h3, p, ul, ol, dl, dd) {
  margin: 0;
}
.rental-page h1 {
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  line-height: 1.2;
  text-wrap: balance;
  margin: 4px 0 8px;
}
.rental-page h2 {
  font-size: 1.25rem;
  line-height: 1.3;
  font-weight: 700;
  text-wrap: balance;
}
.rental-page h3 {
  font-size: 1rem;
  line-height: 1.4;
  font-weight: 700;
}
.rental-page p {
  line-height: 1.6;
}
.rental-page__section > h2 + p,
.rental-page__section > h2 + dl,
.rental-page__section > h2 + ul {
  margin-top: 12px;
}
.rental-page__section > p + p {
  margin-top: 8px;
}
.rental-page a:not(.v-btn) {
  color: rgb(var(--v-theme-link));
  text-underline-offset: 3px;
}
.rental-page a:focus-visible,
.rental-page button:focus-visible,
.rental-page summary:focus-visible,
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

/* Heading: the kicker, the title, the address and the four numbers a visitor scans first. */
.rental-page__heading-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px 24px;
}
.rental-page__heading-text {
  min-width: 0;
}
.rental-page__zone {
  font-size: 0.8rem;
  font-weight: 700;
  color: rgb(var(--v-theme-link));
}
.rental-page__street {
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgba(var(--v-theme-on-surface), 0.76);
  font-size: 0.95rem;
}
.rental-page__tools {
  display: flex;
  flex-shrink: 0;
  gap: 4px;
  margin-inline-end: -8px;
}
.rental-page__tools .rental-page__icon-tool {
  width: 44px;
  height: 44px;
}
.rental-page__keyfacts {
  list-style: none;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 22px;
  margin-top: 14px;
  font-size: 0.95rem;
  font-weight: 600;
}
.rental-page__keyfacts li {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.rental-page__keyfacts .v-icon {
  color: rgba(var(--v-theme-on-surface), 0.68);
}
.rental-page__gallery {
  margin-top: 20px;
}

/* In-page nav: one row, scrolls sideways on a phone, sticks under the app bar. */
.rental-page__sections {
  position: sticky;
  top: 64px;
  z-index: 2;
  display: flex;
  gap: 4px;
  margin-top: 16px;
  padding-block: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  background: rgb(var(--v-theme-background));
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.rental-page__sections::-webkit-scrollbar {
  display: none;
}
.rental-page__sections a {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  min-height: 40px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  transition: background-color 150ms ease;
}
.rental-page__sections a:hover {
  background: rgba(var(--v-theme-primary), 0.08);
}
/* Keep the padding, move the box: the first label sits on the column edge like every heading
   below it, and its hover pill still breathes on both sides (the `cu-btn-flush` idiom). */
.rental-page__sections a:first-child {
  margin-inline-start: -12px;
}
.rental-page h2[id],
.rental-page__section,
.rental-page__section :deep(.nearby-services) {
  scroll-margin-top: 124px;
}

/* Sections are separated by a hairline and a generous gap: portal rhythm. */
.rental-page__section {
  margin-top: 32px;
  padding-top: 28px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.rental-page__section:first-of-type {
  border-top: 0;
  padding-top: 0;
  margin-top: 28px;
}
.rental-page__note {
  margin-top: 12px;
  font-size: 0.8rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.72);
}
.rental-page__subhead {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 12px;
  margin-top: 24px;
}
.rental-page__subhead span {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.72);
}
.rental-page__facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 40px;
  margin-top: 12px;
}
.rental-page__facts > div {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px 16px;
  padding: 11px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
/* A value too long for half a column stops fighting its label and stacks under it: the pair
   "Garantías mencionadas / ANDA · Contaduría · Aseguradora" wrapped on both sides at 374px. */
.rental-page__facts > div.is-stacked {
  display: block;
}
.rental-page__facts > div.is-stacked dd {
  margin-top: 2px;
  text-align: start;
}
.rental-page dt {
  font-size: 0.875rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.76);
}
.rental-page dd {
  font-weight: 700;
  line-height: 1.5;
  text-align: end;
  overflow-wrap: anywhere;
}
.rental-page dd.is-empty {
  font-weight: 400;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
.rental-page__quote {
  margin-top: 16px;
  font-size: 0.95rem;
}
.rental-page__amenities {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0;
  list-style: none;
  margin-top: 12px;
}
.rental-page__amenities li {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px 6px 10px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 999px;
  font-size: 0.875rem;
}
.rental-page__amenities .v-icon {
  color: rgb(var(--v-theme-primary));
}
.rental-page__description {
  white-space: pre-line;
  overflow-wrap: anywhere;
  max-width: 72ch;
}
.rental-page__address {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 12px;
  font-weight: 600;
}
.rental-page__address .v-icon {
  flex-shrink: 0;
  margin-top: 2px;
  color: rgba(var(--v-theme-on-surface), 0.68);
}
.rental-page__location-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-top: 16px;
}
.rental-page__map {
  border-radius: 12px;
  overflow: hidden;
  margin-top: 16px;
  isolation: isolate;
}
.rental-page__market {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 16px;
}
.rental-page__market > div {
  padding: 16px 18px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
}
.rental-page__market dd {
  margin-top: 4px;
  font-size: 1.5rem;
  line-height: 1.2;
  text-align: start;
  font-variant-numeric: tabular-nums;
}
.rental-page__verdict {
  margin-top: 16px;
  font-weight: 700;
}

/* One card per advert. Selection is a ring, not a stripe. */
.rental-page__offers {
  list-style: none;
  padding: 0;
  margin-top: 16px;
  display: grid;
  gap: 12px;
}
.rental-page__offers > li {
  padding: 18px 20px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  transition: box-shadow 150ms ease;
}
.rental-page__offers > li.is-selected {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: inset 0 0 0 1px rgb(var(--v-theme-primary));
}
.rental-page__offer-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px 16px;
  flex-wrap: wrap;
}
.rental-page__offer-title p {
  margin-top: 2px;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.76);
}
.rental-page__offer-flag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-link));
  font-size: 0.75rem;
  font-weight: 700;
}
.rental-page__offer-costs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
  padding: 12px 0;
  border-block: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.rental-page__offer-costs dd {
  margin-top: 2px;
  text-align: start;
}
.rental-page__offer-seen {
  margin-top: 8px;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.72);
}
.rental-page__offer-more {
  margin-top: 4px;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.72);
}
.rental-page__offer-more summary {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  cursor: pointer;
  color: rgb(var(--v-theme-link));
  font-weight: 600;
}
/* "Referencia en InfoCasas: infocasas:194222908" es una sola palabra de 30 caracteres. */
.rental-page__offer-more p {
  overflow-wrap: anywhere;
}
.rental-page__offer-more p + p {
  margin-top: 4px;
}
.rental-page__offer-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
}

/* The decision card: price first, one action, the publisher, then save. */
.rental-page__decision {
  position: sticky;
  top: 96px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 16px;
  padding: 24px;
  background: rgb(var(--v-theme-surface));
}
.rental-page__decision h2 {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.0333em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.72);
}
.rental-page__rent {
  margin-top: 8px;
  font-size: 2rem;
  font-weight: 750;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}
.rental-page__rent > span {
  display: block;
  margin-top: 4px;
  font-size: 0.8rem;
  font-weight: 400;
  color: rgba(var(--v-theme-on-surface), 0.72);
}
.rental-page__monthly {
  margin-top: 16px;
}
.rental-page__monthly > div {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 16px;
  padding-block: 10px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.rental-page__monthly-total dd {
  font-size: 1.375rem;
  font-variant-numeric: tabular-nums;
}
.rental-page__decision .rental-page__note {
  margin-top: 8px;
}
/* Both actions in the card are full width and the same height: two stacked buttons that differ by
   4px read as a mistake, not as hierarchy. Hierarchy is carried by fill against tonal. */
.rental-page__decision > .v-btn {
  width: 100%;
  min-height: 48px !important;
}
.rental-page__contact {
  margin-top: 20px;
}
.rental-page__publisher {
  margin-block: 20px;
  padding-top: 16px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
/* Un solo eje de texto: el ícono abre la columna y todo lo que sigue —nombre, tipo y el enlace a
   la inmobiliaria— arranca en la misma vertical. */
.rental-page__publisher {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  gap: 2px 8px;
}
.rental-page__publisher > p {
  display: contents;
  font-size: 0.95rem;
}
.rental-page__publisher > p > .v-icon {
  margin-top: 2px;
  color: rgba(var(--v-theme-on-surface), 0.68);
}
.rental-page__publisher > .advertiser-contact {
  grid-column: 2;
}
.rental-page__publisher-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.0333em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.72);
}
.rental-page__decision-link {
  margin-top: 12px;
  font-size: 0.875rem;
}

/* The budget planner sits between two sections; the next section's rule is its closing line. */
.rental-page :deep(.rental-budget) {
  margin-top: 32px;
  border-bottom: 0;
  padding-block: 12px 8px;
}

/* Visit checklist and provenance. */
.rental-page__questions {
  list-style: none;
  padding: 0;
  margin: 12px 0 20px;
}
.rental-page__questions label {
  display: flex;
  align-items: start;
  gap: 14px;
  padding-block: 10px;
  cursor: pointer;
  line-height: 1.55;
  min-height: 44px;
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
  color: rgba(var(--v-theme-on-surface), 0.6);
}
.rental-page__provenance p,
.rental-page__provenance a {
  font-size: 0.875rem;
}
.rental-page__provenance a {
  display: inline-block;
  margin-top: 8px;
}

/* Similar homes: a card grid in the directory's vocabulary, ink on the card, blue only on the title. */
.rental-page__similar,
.rental-page__help {
  grid-column: 1 / -1;
}
.rental-page__similar ul {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  padding: 0;
  list-style: none;
  margin-top: 20px;
}
.rental-page__similar li {
  min-width: 0;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
  transition:
    transform 180ms ease,
    box-shadow 180ms ease;
}
.rental-page__similar li:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}
.rental-page .rental-page__similar a {
  display: block;
  height: 100%;
  text-decoration: none;
  color: inherit;
}
.rental-page__similar a:hover strong {
  text-decoration: underline;
}
.rental-page__similar-media {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 3 / 2;
  background: rgba(var(--v-theme-on-surface), 0.06);
  color: rgba(var(--v-theme-on-surface), 0.5);
}
.rental-page__similar-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.rental-page__similar-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px 16px;
}
.rental-page__similar-body > b {
  font-size: 1.25rem;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}
.rental-page__similar-expenses,
.rental-page__similar-specs {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.76);
}
.rental-page__similar-body > strong {
  margin-top: 6px;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.4;
  color: rgb(var(--v-theme-link));
}
.rental-page__similar-zone {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.76);
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
  display: inline-flex;
  align-items: center;
  min-height: 44px;
}
.rental-page__mobile-action {
  display: none;
}
.rental-page__unavailable {
  max-width: 65ch;
  padding-block: 24px 80px;
}
.rental-page__unavailable h1 {
  margin-bottom: 12px;
}
.rental-page__unavailable p {
  margin-bottom: 20px;
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
    gap: 24px;
  }
  .rental-page__main {
    display: contents;
  }
  .rental-page__heading {
    grid-row: 1;
  }
  .rental-page__gallery {
    grid-row: 2;
    margin-top: 0;
  }
  .rental-page__decision {
    grid-row: 3;
    position: static;
    padding: 20px;
  }
  /* The chip row scrolls sideways; the fade says so before anyone swipes. */
  .rental-page__sections {
    margin-top: 0;
    mask-image: linear-gradient(to right, #000 calc(100% - 40px), transparent);
  }
  .rental-page__section {
    margin-top: 24px;
    padding-top: 24px;
  }
  .rental-page__section:first-of-type {
    margin-top: 20px;
  }
  .rental-page__similar ul {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .rental-page__mobile-action {
    position: fixed;
    z-index: 1900;
    inset: auto 0 0;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    padding: 10px max(12px, env(safe-area-inset-right)) max(10px, env(safe-area-inset-bottom))
      max(12px, env(safe-area-inset-left));
    background: rgb(var(--v-theme-surface));
    border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    box-shadow: 0 -6px 16px rgba(0, 0, 0, 0.08);
  }
  .rental-page__mobile-action > .v-btn {
    min-height: 48px;
  }
  .rental-page__mobile-action > .v-btn:first-child {
    width: 48px;
    height: 48px;
  }
  .rental-page__mobile-action > .v-btn:last-child {
    min-width: 0;
    height: auto;
    padding-block: 10px;
  }
  .rental-page__mobile-action :deep(.v-btn__content) {
    white-space: normal;
    overflow-wrap: anywhere;
    line-height: 1.3;
  }
  .rental-page__bar-price {
    display: flex;
    flex-direction: column;
    min-width: 0;
    line-height: 1.2;
  }
  .rental-page__bar-price strong {
    font-size: 1.25rem;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .rental-page__bar-price span {
    font-size: 0.75rem;
    color: rgba(var(--v-theme-on-surface), 0.72);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
@media (max-width: 767px) {
  .rental-page__sections {
    top: 56px;
  }
  .rental-page h2[id],
  .rental-page__section,
  .rental-page__section :deep(.nearby-services) {
    scroll-margin-top: 112px;
  }
}
/* Desktop shows the breadcrumb; a "back" that only repeats its middle crumb adds nothing. */
@media (min-width: 600px) {
  .rental-page__back.is-generic {
    display: none;
  }
}
@media (max-width: 599px) {
  .rental-page__topbar {
    margin-bottom: 8px;
  }
  .rental-page__crumbs {
    display: none;
  }
  /* Los dos botones se llevaban 88 de los 296px de la fila y al título le quedaban 161: a 320px
     "Monoambiente" no entraba en su propia línea y se partía al medio. Salen del flujo, se apoyan
     sobre el kicker —que sí puede envolver— y el título recupera el ancho entero. */
  .rental-page__heading-row {
    position: relative;
    display: block;
  }
  .rental-page__zone {
    padding-inline-end: 92px;
  }
  .rental-page__tools {
    position: absolute;
    top: -4px;
    inset-inline-end: -8px;
    gap: 0;
    margin-inline-end: 0;
  }
  .rental-page__keyfacts {
    gap: 6px 16px;
    font-size: 0.875rem;
  }
  .rental-page__layout {
    gap: 20px;
  }
  .rental-page__facts {
    grid-template-columns: 1fr;
    gap: 0;
  }
  .rental-page__offers > li {
    padding: 16px;
  }
  .rental-page__offer-costs {
    grid-template-columns: 1fr;
    gap: 6px;
  }
  .rental-page__offer-costs > div {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 4px 12px;
  }
  .rental-page__offer-costs dd {
    margin-top: 0;
    text-align: end;
  }
  .rental-page__offer-actions > .v-btn {
    width: 100%;
  }
  .rental-page__market {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .rental-page__similar ul {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 359px) {
  .rental-page__bar-price span {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .rental-page__similar li,
  .rental-page__sections a,
  .rental-page__offers > li {
    transition: none;
  }
  .rental-page__similar li:hover {
    transform: none;
  }
}
</style>
