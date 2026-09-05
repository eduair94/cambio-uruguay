<template>
  <aside
    class="rental-map-detail"
    data-testid="rental-map-detail"
    role="region"
    aria-labelledby="rental-map-detail-heading"
    :aria-busy="pending"
    @keydown.esc.stop.prevent="emit('close')"
  >
    <header class="rental-map-detail__header">
      <h3 id="rental-map-detail-heading" ref="heading" tabindex="-1">{{ t('mapProperty') }}</h3>
      <VBtn
        data-testid="rental-map-detail-close"
        icon="mdi-close"
        variant="text"
        :aria-label="t('mapClose')"
        @click="emit('close')"
      />
    </header>
    <div ref="body" class="rental-map-detail__body" tabindex="0" :aria-label="t('mapProperty')">
      <div v-if="pending" class="rental-map-detail__loading" role="status">
        <p>{{ t('mapLoading') }}</p>
        <p v-if="point" class="rental-map-detail__price">
          {{ money(point.price, point.currency) }}
        </p>
        <p v-if="point?.neighborhood">{{ point.neighborhood }}</p>
        <VSkeletonLoader type="image, paragraph" />
      </div>
      <div v-else-if="error" class="rental-map-detail__error" role="alert">
        <VIcon size="32">mdi-home-search-outline</VIcon>
        <p>{{ t(error === 'unavailable' ? 'mapUnavailable' : 'mapDetailError') }}</p>
        <VBtn color="primary" variant="tonal" @click="emit('retry')">{{ t('retry') }}</VBtn>
      </div>
      <template v-else-if="property && offer">
        <div class="rental-map-detail__hero">
          <div class="rental-map-detail__photo">
            <img
              v-if="photo && !photoFailed"
              :src="photo"
              :alt="title"
              width="360"
              height="216"
              decoding="async"
              referrerpolicy="no-referrer"
              @error="photoFailed = true"
            />
            <span v-else><VIcon size="28">mdi-home-city-outline</VIcon>{{ t('noPhoto') }}</span>
          </div>
          <div class="rental-map-detail__intro">
            <p class="rental-map-detail__where">{{ location || t('unknown') }}</p>
            <h4>{{ title }}</h4>
            <p v-if="address">{{ address }}</p>
          </div>
        </div>

        <div class="rental-map-detail__cost">
          <p class="rental-map-detail__price">
            {{ money(offer.price, offer.currency) }} <span>{{ t('rent') }}</span>
          </p>
          <p class="rental-map-detail__fees">{{ expensesLabel(offer) }}</p>
          <dl class="rental-map-detail__total">
            <dt>{{ t('monthlyTotal') }}</dt>
            <dd>{{ total === null ? t('unknown') : money(total) }}</dd>
          </dl>
          <p class="rental-map-detail__note">
            {{ t(total === null ? 'mapTotalUnknown' : 'totalHint') }}
          </p>
          <p v-if="usesConversion && usdUyu > 0" class="rental-map-detail__note">
            {{ t('rate', { rate: usdUyu.toFixed(2) }) }}
          </p>
        </div>

        <h4 class="rental-map-detail__section-title">{{ t('features') }}</h4>
        <dl class="rental-map-detail__facts">
          <div>
            <dt>{{ t('type') }}</dt>
            <dd>{{ typeLabel }}</dd>
          </div>
          <div>
            <dt>{{ t('bedrooms') }}</dt>
            <dd>
              {{ property.bedrooms === 0 ? t('studio') : (property.bedrooms ?? t('unknown')) }}
            </dd>
          </div>
          <div>
            <dt>{{ t('bathrooms') }}</dt>
            <dd>{{ property.bathrooms ?? t('unknown') }}</dd>
          </div>
          <div>
            <dt>{{ t('mapArea') }}</dt>
            <dd>{{ property.area ? `${property.area} m²` : t('unknown') }}</dd>
          </div>
        </dl>
        <div v-if="features.length" class="rental-map-detail__tags">
          <VChip v-for="feature in features" :key="feature" size="small" variant="tonal">{{
            feature
          }}</VChip>
        </div>
        <template v-if="guarantees.length">
          <h4 class="rental-map-detail__section-title">{{ t('conditions') }}</h4>
          <p>{{ guarantees.join(' · ') }}</p>
        </template>

        <h4 class="rental-map-detail__section-title">{{ t('mapPortals') }}</h4>
        <ul class="rental-map-detail__offers">
          <li v-for="entry in offers" :key="`${entry.source}:${entry.listingId}`">
            <a
              :href="rentalSavedSafeUrl(entry.url)!"
              target="_blank"
              rel="noopener noreferrer nofollow"
              :aria-label="`${t('mapOpen', { source: sourceLabel(entry.source) })}: ${money(entry.price, entry.currency)}`"
            >
              <span class="rental-map-detail__offer-line"
                ><strong>{{ sourceLabel(entry.source) }}</strong
                ><VIcon size="18">mdi-open-in-new</VIcon></span
              >
              <span v-if="isMatching(entry)" class="rental-map-detail__matching">{{
                t('mapMatching')
              }}</span>
              <span class="rental-map-detail__offer-line"
                ><span>{{ t('rent') }}</span
                ><strong>{{ money(entry.price, entry.currency) }}</strong></span
              >
              <span>{{ expensesLabel(entry) }}</span>
              <span v-if="totalMonthlyUyu(entry, usdUyu) !== null"
                >{{ t('monthlyTotal') }}: {{ money(totalMonthlyUyu(entry, usdUyu)!) }}</span
              >
            </a>
          </li>
        </ul>
        <p class="rental-map-detail__publisher">{{ sellerLabel }}</p>
        <p class="rental-map-detail__note">{{ t('seen', { date: seen }) }}</p>
        <p class="rental-map-detail__note">{{ t('mapLocationHint') }}</p>
        <p class="rental-map-detail__note">{{ t('mapContactHint') }}</p>
      </template>
    </div>
    <footer v-if="property && offer && !pending && !error" class="rental-map-detail__footer">
      <VBtn
        data-testid="rental-map-detail-save"
        :icon="favorite ? 'mdi-heart' : 'mdi-heart-outline'"
        :aria-label="t(favorite ? 'unfavorite' : 'favorite')"
        :aria-pressed="favorite"
        :color="favorite ? 'primary' : undefined"
        variant="tonal"
        @click="emit('favorite', property)"
      />
      <VBtn
        v-if="offerUrl"
        :href="offerUrl"
        target="_blank"
        rel="noopener noreferrer nofollow"
        color="primary"
        append-icon="mdi-open-in-new"
        class="rental-map-detail__open"
        >{{ t('mapOpen', { source: sourceLabel(offer.source) }) }}</VBtn
      >
    </footer>
  </aside>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { rentalMessages } from '~/utils/rentalMessages'
import { rentalSavedSafeUrl } from '~/utils/rentalSaved'
import {
  RENTAL_GUARANTEE_PUBLISHED,
  RENTAL_SOURCE_LABEL,
  totalMonthlyUyu,
  type RentalCurrency,
  type RentalMapPoint,
  type RentalOffer,
  type RentalPublicProperty,
} from '~/utils/rentals'

const props = defineProps<{
  property: RentalPublicProperty | null
  point: RentalMapPoint | null
  usdUyu: number
  pending: boolean
  error: 'unavailable' | 'failed' | null
  favorite: boolean
}>()
const emit = defineEmits<{
  close: []
  retry: []
  favorite: [property: RentalPublicProperty]
}>()
const { t, locale } = useI18n({ useScope: 'local', messages: rentalMessages })
const heading = ref<HTMLElement | null>(null)
const body = ref<HTMLElement | null>(null)
const photoFailed = ref(false)
const offer = computed(() => props.property?.matchingOffer ?? props.property?.offers[0])
const title = computed(() => offer.value?.title || props.property?.title || '')
const address = computed(() => {
  const value = props.property?.address?.trim() || ''
  const compare = new Intl.Collator(locale.value, { sensitivity: 'base', ignorePunctuation: true })
  // Some portals put their headline in the address field; repeating it adds no location detail.
  return [title.value, props.property?.title || ''].some(
    candidate =>
      compare.compare(value.replace(/\s+/g, ' '), candidate.trim().replace(/\s+/g, ' ')) === 0
  )
    ? ''
    : value
})
const photo = computed(() => rentalSavedSafeUrl(offer.value?.image))
const offerUrl = computed(() => rentalSavedSafeUrl(offer.value?.url))
const offers = computed(() =>
  (props.property?.offers ?? []).filter(entry => rentalSavedSafeUrl(entry.url))
)
const location = computed(() =>
  [props.property?.neighborhood, props.property?.department].filter(Boolean).join(', ')
)
const total = computed(() => (offer.value ? totalMonthlyUyu(offer.value, props.usdUyu) : null))
const usesConversion = computed(
  () => offer.value?.currency === 'USD' || offer.value?.commonExpensesCurrency === 'USD'
)
const numberLocale = computed(() =>
  locale.value === 'en' ? 'en-US' : locale.value === 'pt' ? 'pt-BR' : 'es-UY'
)
function money(value: number, currency: RentalCurrency = 'UYU') {
  return `${currency === 'USD' ? 'U$S' : '$'} ${new Intl.NumberFormat(numberLocale.value, { maximumFractionDigits: 0 }).format(value)}`
}
function expensesLabel(entry: RentalOffer) {
  if (entry.commonExpenses === 0) return t('noExpenses')
  if (entry.commonExpenses === null || !entry.commonExpensesCurrency) return t('expensesUnknown')
  return `${t('expenses')}: ${money(entry.commonExpenses, entry.commonExpensesCurrency)}`
}
const sourceLabel = (source: RentalOffer['source']) => RENTAL_SOURCE_LABEL[source]
const isMatching = (entry: RentalOffer) =>
  entry.source === offer.value?.source && entry.listingId === offer.value?.listingId
const typeLabel = computed(() =>
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
    )[props.property?.propertyType ?? 'otro'] || 'other'
  )
)
// Conditions belong to the displayed offer, just like its rent and common expenses.
const features = computed(() =>
  [
    offer.value?.petsAllowed ? t('pets') : '',
    (offer.value?.parkingSpaces ?? 0) > 0 ? `${t('parking')} (${offer.value?.parkingSpaces})` : '',
    offer.value?.furnished ? t('furnished') : '',
  ].filter(Boolean)
)
const guarantees = computed(() =>
  (offer.value?.guarantees ?? [])
    .filter(value => RENTAL_GUARANTEE_PUBLISHED.includes(value))
    .map(value => t(value))
)
const sellerLabel = computed(() => {
  const entry = offer.value
  const type = t(
    entry?.sellerType === 'particular'
      ? 'individual'
      : entry?.sellerType === 'inmobiliaria'
        ? 'agency'
        : 'unknown'
  )
  return entry?.sellerName && !/^(?:particular|mercado libre)$/i.test(entry.sellerName)
    ? `${type} · ${entry.sellerName}`
    : type
})
const seen = computed(() => {
  const value = offer.value?.lastSeen || ''
  const date = new Date(value)
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value)
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(numberLocale.value, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        ...(dateOnly ? {} : { hour: '2-digit' as const, minute: '2-digit' as const }),
        timeZone: dateOnly ? 'UTC' : 'America/Montevideo',
      }).format(date)
    : t('unknown')
})
watch(photo, () => {
  photoFailed.value = false
})
watch(
  () => props.property?.key,
  () => {
    if (body.value) body.value.scrollTop = 0
  }
)
onMounted(async () => {
  await nextTick()
  heading.value?.focus({ preventScroll: true })
})
</script>

<style scoped>
.rental-map-detail {
  position: absolute;
  inset: 12px 12px 12px auto;
  z-index: 2;
  width: min(360px, calc(100% - 72px));
  display: flex;
  flex-direction: column;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  border-radius: 12px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.24);
  overflow: hidden;
  font-size: 0.875rem;
  line-height: 1.5;
}
.rental-map-detail p,
.rental-map-detail h3,
.rental-map-detail h4,
.rental-map-detail dl,
.rental-map-detail dd {
  margin: 0;
}
.rental-map-detail__header,
.rental-map-detail__footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  flex-shrink: 0;
}
.rental-map-detail__header {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.rental-map-detail__header h3 {
  flex: 1;
  font-size: 0.875rem;
}
.rental-map-detail__header .v-btn,
.rental-map-detail__footer .v-btn {
  min-width: 44px;
  min-height: 44px;
}
.rental-map-detail__body {
  overflow-y: auto;
  overscroll-behavior-y: contain;
  min-height: 0;
  padding: 0 16px 20px;
}
.rental-map-detail__body:focus-visible,
.rental-map-detail__header h3:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -2px;
}
.rental-map-detail__photo {
  margin: 0 -16px;
  height: 180px;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.rental-map-detail__photo img {
  display: block;
  height: 100%;
  width: 100%;
  object-fit: cover;
}
.rental-map-detail__photo > span {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 100%;
  padding: 8px;
  text-align: center;
  font-size: 0.75rem;
}
.rental-map-detail__intro {
  padding-top: 12px;
}
.rental-map-detail__intro h4 {
  font-size: 1rem;
  line-height: 1.4;
  margin: 4px 0;
  overflow-wrap: anywhere;
}
.rental-map-detail__intro p {
  font-size: 0.8rem;
  overflow-wrap: anywhere;
}
.rental-map-detail__where {
  color: rgb(var(--v-theme-link));
}
.rental-map-detail__cost {
  margin-top: 16px;
  padding: 12px 0;
  border-block: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.rental-map-detail__price {
  font-size: 1.4rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.rental-map-detail__price span {
  font-size: 0.75rem;
  font-weight: 400;
}
.rental-map-detail .rental-map-detail__fees {
  margin-top: 4px;
}
.rental-map-detail .rental-map-detail__total {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-top: 12px;
  font-weight: 700;
}
.rental-map-detail__total dd {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.rental-map-detail .rental-map-detail__note {
  font-size: 0.75rem;
  margin-top: 8px;
  color: rgba(var(--v-theme-on-surface), 0.8);
}
.rental-map-detail .rental-map-detail__section-title {
  margin: 20px 0 8px;
  font-size: 0.875rem;
}
.rental-map-detail__facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.rental-map-detail__facts dt {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.8);
}
.rental-map-detail__facts dd {
  font-weight: 600;
}
.rental-map-detail__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 16px;
}
.rental-map-detail__offers {
  list-style: none;
  padding: 0;
  margin: 0;
}
.rental-map-detail__offers li + li {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.rental-map-detail__offers a {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 0;
  color: inherit;
  text-decoration: none;
  font-size: 0.8rem;
}
.rental-map-detail__offers a:hover .rental-map-detail__offer-line:first-child {
  text-decoration: underline;
}
.rental-map-detail__offer-line {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.rental-map-detail__offer-line:first-child {
  color: rgb(var(--v-theme-link));
}
.rental-map-detail__matching {
  font-size: 0.75rem;
  color: rgb(var(--v-theme-link));
}
.rental-map-detail .rental-map-detail__publisher {
  margin-top: 16px;
  overflow-wrap: anywhere;
}
.rental-map-detail__footer {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.rental-map-detail__open {
  flex: 1;
  min-width: 0 !important;
  height: auto;
  padding-block: 10px;
  font-size: 0.8rem;
}
.rental-map-detail__open :deep(.v-btn__content) {
  white-space: normal;
  overflow-wrap: anywhere;
}
.rental-map-detail__loading,
.rental-map-detail__error {
  padding-top: 16px;
}
.rental-map-detail__error p {
  margin: 12px 0 16px;
}
@media (max-width: 959px) {
  .rental-map-detail {
    position: fixed;
    inset: auto max(8px, env(safe-area-inset-right))
      calc(60px + max(12px, env(safe-area-inset-bottom))) max(8px, env(safe-area-inset-left));
    z-index: 1850;
    width: auto;
    max-height: min(62dvh, calc(100dvh - 170px));
  }
}
@media (max-width: 959px), (max-height: 700px) {
  .rental-map-detail__hero {
    display: grid;
    grid-template-columns: 88px minmax(0, 1fr);
    gap: 12px;
    padding-top: 12px;
  }
  .rental-map-detail__photo {
    margin: 0;
    height: 110px;
    border-radius: 6px;
    overflow: hidden;
  }
  .rental-map-detail__intro {
    padding: 0;
  }
  .rental-map-detail__intro h4 {
    font-size: 0.875rem;
  }
}
</style>
