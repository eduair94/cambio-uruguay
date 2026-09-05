<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RENTAL_SOURCE_LABEL, totalMonthlyUyu, type RentalCurrency } from '~/utils/rentals'
import type { RentalSavedFavorite, RentalSavedOffer, RentalSavedState } from '~/utils/rentalSaved'
import { rentalSavedMessages } from '~/utils/rentalSavedMessages'
import { rentalPropertyPath } from '~/utils/rentalPresentation'

const props = defineProps<{ state: RentalSavedState; usdUyu: number }>()
const emit = defineEmits<{
  openSearch: [params: Record<string, string>]
  removeSearch: [id: string]
  removeFavorite: [key: string]
}>()
const { t, locale } = useI18n({ useScope: 'local', messages: rentalSavedMessages })
const localePath = useLocalePath()
const selected = ref<string[]>([])
const showAll = ref(false)
let initialized = false

watch(
  () => props.state.favorites.map(favorite => favorite.key),
  keys => {
    selected.value = selected.value.filter(key => keys.includes(key))
    if (!initialized && keys.length) {
      selected.value = keys.slice(0, 4)
      initialized = true
    }
  },
  { immediate: true }
)

const shownFavorites = computed(() =>
  showAll.value ? props.state.favorites : props.state.favorites.slice(0, 6)
)
const compared = computed(() =>
  selected.value
    .map(key => props.state.favorites.find(favorite => favorite.key === key))
    .filter((favorite): favorite is RentalSavedFavorite => Boolean(favorite))
)
const numberLocale = computed(() =>
  locale.value.startsWith('en') ? 'en-US' : locale.value.startsWith('pt') ? 'pt-BR' : 'es-UY'
)

function choose(key: string, checked: unknown) {
  if (!checked) selected.value = selected.value.filter(value => value !== key)
  else if (!selected.value.includes(key) && selected.value.length < 4)
    selected.value = [...selected.value, key]
}

function money(amount: number | null, currency: RentalCurrency = 'UYU'): string {
  if (amount === null) return t('unknown')
  const formatted = new Intl.NumberFormat(numberLocale.value, {
    maximumFractionDigits: 0,
  }).format(amount)
  return `${currency === 'USD' ? 'U$S' : '$'} ${formatted}`
}

function savedDate(value: string): string {
  return new Intl.DateTimeFormat(numberLocale.value, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value))
}

/** Keep the compared rent, fees and total attached to the same saved advertisement. */
function comparedOffer(favorite: RentalSavedFavorite): RentalSavedOffer {
  const withTotal = favorite.offers.filter(
    offer => totalMonthlyUyu(offer, favorite.usdUyu) !== null
  )
  const candidates = withTotal.length ? withTotal : favorite.offers
  return candidates.reduce((best, offer) => {
    const score = totalMonthlyUyu(offer, favorite.usdUyu) ?? offer.priceUyu
    const bestScore = totalMonthlyUyu(best, favorite.usdUyu) ?? best.priceUyu
    return score < bestScore ? offer : best
  })
}

function expenseLabel(favorite: RentalSavedFavorite): string {
  const offer = comparedOffer(favorite)
  if (offer.commonExpenses === 0) return t('zeroExpenses')
  if (offer.commonExpenses === null || !offer.commonExpensesCurrency) return t('unknown')
  return money(offer.commonExpenses, offer.commonExpensesCurrency)
}

const comparisonRows = computed(() => [
  {
    label: t('location'),
    value: (favorite: RentalSavedFavorite) =>
      [favorite.neighborhood, favorite.department].filter(Boolean).join(', ') || t('unknown'),
  },
  {
    label: t('rent'),
    value: (favorite: RentalSavedFavorite) => {
      const offer = comparedOffer(favorite)
      return money(offer.price, offer.currency)
    },
  },
  { label: t('expenses'), value: expenseLabel },
  {
    label: t('monthly'),
    value: (favorite: RentalSavedFavorite) => money(favorite.monthlyTotalUyu),
    highlight: true,
  },
  {
    label: t('bedrooms'),
    value: (favorite: RentalSavedFavorite) =>
      favorite.bedrooms === 0 ? t('studio') : (favorite.bedrooms ?? t('unknown')),
  },
  {
    label: t('bathrooms'),
    value: (favorite: RentalSavedFavorite) => favorite.bathrooms ?? t('unknown'),
  },
  {
    label: t('area'),
    value: (favorite: RentalSavedFavorite) =>
      favorite.area === null ? t('unknown') : `${favorite.area} m²`,
  },
  {
    label: t('garages'),
    value: (favorite: RentalSavedFavorite) => favorite.parkingSpaces ?? t('unknown'),
  },
  {
    label: t('furnished'),
    value: (favorite: RentalSavedFavorite) => (favorite.furnished ? t('confirmed') : t('unknown')),
  },
  {
    label: t('pets'),
    value: (favorite: RentalSavedFavorite) =>
      favorite.petsAllowed ? t('confirmed') : t('unknown'),
  },
  {
    label: t('guarantees'),
    value: (favorite: RentalSavedFavorite) =>
      favorite.guarantees.map(guarantee => t(`guarantee_${guarantee}`)).join(', ') || t('unknown'),
  },
  { label: t('saved'), value: (favorite: RentalSavedFavorite) => savedDate(favorite.savedAt) },
])
</script>

<template>
  <div class="rental-saved-panel">
    <p class="saved-local-note">{{ t('local') }}</p>

    <section class="saved-section" aria-labelledby="rental-saved-searches">
      <h3 id="rental-saved-searches">{{ t('searches') }}</h3>
      <p v-if="!state.searches.length" class="saved-empty">{{ t('searchEmpty') }}</p>
      <ul v-else class="saved-searches">
        <li v-for="search in state.searches" :key="search.id" class="saved-search">
          <v-btn
            variant="outlined"
            color="primary"
            class="saved-search-open"
            prepend-icon="mdi-magnify"
            :aria-label="t('openSearch', { name: search.label })"
            @click="emit('openSearch', search.params)"
          >
            {{ search.label }}
          </v-btn>
          <v-btn
            variant="text"
            icon="mdi-close"
            size="small"
            :aria-label="t('removeSearch', { name: search.label })"
            @click="emit('removeSearch', search.id)"
          />
        </li>
      </ul>
    </section>

    <section class="saved-section" aria-labelledby="rental-saved-favorites">
      <h3 id="rental-saved-favorites">{{ t('favorites') }} ({{ state.favorites.length }})</h3>
      <p v-if="!state.favorites.length" class="saved-empty">{{ t('favoritesEmpty') }}</p>
      <template v-else>
        <div class="saved-choose-note">
          <p>{{ t('choose') }}</p>
          <span aria-live="polite">{{ t('selected', { count: selected.length }) }}</span>
        </div>
        <ul class="saved-favorites">
          <li v-for="favorite in shownFavorites" :key="favorite.key" class="saved-favorite">
            <v-checkbox
              :model-value="selected.includes(favorite.key)"
              :disabled="selected.length >= 4 && !selected.includes(favorite.key)"
              :label="favorite.title"
              :aria-label="t('compareProperty', { name: favorite.title })"
              hide-details
              density="compact"
              color="primary"
              @update:model-value="choose(favorite.key, $event)"
            />
            <v-btn
              variant="text"
              icon="mdi-close"
              size="small"
              :aria-label="t('removeFavorite', { name: favorite.title })"
              @click="emit('removeFavorite', favorite.key)"
            />
          </li>
        </ul>
        <v-btn
          v-if="state.favorites.length > 6"
          variant="text"
          color="primary"
          :aria-expanded="showAll"
          @click="showAll = !showAll"
        >
          {{ showAll ? t('fewer') : t('more', { count: state.favorites.length }) }}
        </v-btn>
        <p v-if="!compared.length" class="saved-empty">{{ t('compareEmpty') }}</p>
        <template v-else>
          <p class="saved-snapshot-note">{{ t('snapshot') }}</p>
          <p class="saved-scroll-hint">{{ t('scroll') }}</p>
          <div class="saved-table-scroll" tabindex="0" role="region" :aria-label="t('compare')">
            <table class="saved-compare-table">
              <caption class="sr-only">
                {{
                  t('compare')
                }}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{{ t('property') }}</th>
                  <th v-for="favorite in compared" :key="favorite.key" scope="col">
                    <NuxtLink :to="localePath(rentalPropertyPath(favorite.key))">{{
                      favorite.title
                    }}</NuxtLink>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in comparisonRows"
                  :key="row.label"
                  :class="{ 'saved-total-row': row.highlight }"
                >
                  <th scope="row">{{ row.label }}</th>
                  <td v-for="favorite in compared" :key="favorite.key">
                    {{ row.value(favorite) }}
                  </td>
                </tr>
                <tr>
                  <th scope="row">{{ t('source') }}</th>
                  <td v-for="favorite in compared" :key="favorite.key">
                    <a
                      :href="comparedOffer(favorite).url"
                      target="_blank"
                      rel="noopener noreferrer"
                      >{{ RENTAL_SOURCE_LABEL[comparedOffer(favorite).source] }}</a
                    >
                  </td>
                </tr>
                <tr>
                  <th scope="row">{{ t('allOffers') }}</th>
                  <td v-for="favorite in compared" :key="favorite.key">
                    <ul class="saved-offer-links">
                      <li v-for="offer in favorite.offers" :key="offer.url">
                        <a :href="offer.url" target="_blank" rel="noopener noreferrer">
                          {{ RENTAL_SOURCE_LABEL[offer.source] }} ·
                          {{ money(offer.price, offer.currency) }}
                        </a>
                      </li>
                    </ul>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="saved-total-note">{{ t('totalNote') }}</p>
        </template>
      </template>
    </section>
  </div>
</template>

<style scoped>
.rental-saved-panel {
  min-width: 0;
}
.saved-local-note,
.saved-empty,
.saved-snapshot-note,
.saved-total-note {
  margin: 0;
  max-width: 75ch;
  font-size: 0.875rem;
  line-height: 1.6;
}
.saved-section {
  margin-top: 24px;
}
.saved-section h3 {
  margin: 0 0 12px;
  font-size: 1.125rem;
  line-height: 1.4;
}
.saved-searches,
.saved-favorites,
.saved-offer-links {
  margin: 0;
  padding: 0;
  list-style: none;
}
.saved-searches {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
}
.saved-search {
  display: flex;
  align-items: center;
  min-width: 0;
  max-width: 100%;
}
.saved-search-open {
  max-width: calc(100% - 40px);
  min-height: 44px;
  height: auto;
  padding-block: 8px;
}
.saved-search-open :deep(.v-btn__content) {
  white-space: normal;
  overflow-wrap: anywhere;
  text-align: left;
}
.saved-choose-note {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 4px 16px;
  margin-bottom: 8px;
  font-size: 0.875rem;
}
.saved-choose-note p {
  margin: 0;
}
.saved-favorite {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 44px;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.saved-favorite :deep(.v-label) {
  padding-block: 8px;
  font-size: 0.875rem;
  overflow-wrap: anywhere;
  opacity: 1;
}
.saved-snapshot-note {
  margin-top: 20px;
}
.saved-scroll-hint {
  margin: 8px 0;
  font-size: 0.8rem;
}
.saved-table-scroll {
  margin-top: 12px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
}
.saved-table-scroll:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
}
.saved-compare-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  line-height: 1.5;
}
.saved-compare-table th,
.saved-compare-table td {
  min-width: 190px;
  max-width: 280px;
  padding: 12px 16px;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  overflow-wrap: anywhere;
}
.saved-compare-table th:first-child {
  min-width: 156px;
  width: 156px;
}
.saved-compare-table thead th {
  background: rgba(var(--v-theme-on-surface), 0.05);
  font-weight: 700;
}
.saved-compare-table tbody th {
  font-weight: 500;
}
.saved-compare-table tbody tr:last-child :is(th, td) {
  border-bottom: 0;
}
.saved-total-row {
  background: rgba(var(--v-theme-primary), 0.08);
  font-variant-numeric: tabular-nums;
}
.saved-total-row :is(th, td) {
  font-weight: 700;
}
.saved-offer-links li + li {
  margin-top: 8px;
}
.saved-compare-table a {
  color: rgb(var(--v-theme-link));
  text-underline-offset: 3px;
}
.saved-total-note {
  margin-top: 12px;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
@media (min-width: 1000px) {
  .saved-scroll-hint {
    display: none;
  }
}
</style>
