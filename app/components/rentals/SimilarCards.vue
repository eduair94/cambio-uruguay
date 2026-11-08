<!--
  Las tarjetas de "Otras propiedades para comparar": las usa la ficha viva y la ficha que ya no está
  (que muestra la misma vivienda si sigue publicada y las parecidas que siguen publicadas).
  Precio y gastos comunes del aviso que la tarjeta muestra, nunca mezclados entre portales.
-->
<template>
  <ul class="rental-similar-cards">
    <li v-for="entry in items" :key="entry.key">
      <NuxtLink :to="rentalPropertyPath(entry.key)">
        <span class="rental-similar-cards__media">
          <img
            v-if="rentalSavedSafeUrl(offerOf(entry)?.image)"
            :src="rentalSavedSafeUrl(offerOf(entry)?.image)!"
            :alt="entry.title"
            width="320"
            height="200"
            loading="lazy"
            referrerpolicy="no-referrer"
          />
          <VIcon v-else icon="mdi-home-city-outline" size="36" aria-hidden="true" />
        </span>
        <span class="rental-similar-cards__body">
          <b>{{ money(offerOf(entry).price, offerOf(entry).currency) }}</b>
          <span class="rental-similar-cards__expenses"
            >{{ t('expenses') }}: {{ expenses(offerOf(entry)) }}</span
          >
          <strong>{{ entry.title }}</strong>
          <span class="rental-similar-cards__specs">{{ specs(entry) }}</span>
          <span class="rental-similar-cards__zone">{{
            [entry.neighborhood, entry.department].filter(Boolean).join(', ')
          }}</span>
        </span>
      </NuxtLink>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { rentalPageMessages } from '~/utils/rentalPageMessages'
import { rentalMoney, rentalPropertyPath } from '~/utils/rentalPresentation'
import { rentalSavedSafeUrl } from '~/utils/rentalSaved'
import type { RentalOffer, RentalPublicProperty } from '~/utils/rentals'

defineProps<{ items: readonly RentalPublicProperty[] }>()
const { t, locale } = useI18n({ useScope: 'local', messages: rentalPageMessages })

const offerOf = (entry: RentalPublicProperty) => (entry.matchingOffer ?? entry.offers[0])!
const money = (value: number, currency: RentalOffer['currency'] = 'UYU') =>
  rentalMoney(value, currency, locale.value)
const expenses = (offer: RentalOffer) =>
  offer.commonExpenses === 0
    ? t('noExpenses')
    : offer.commonExpenses !== null && offer.commonExpensesCurrency
      ? money(offer.commonExpenses, offer.commonExpensesCurrency)
      : t('notPublished')
const specs = (entry: RentalPublicProperty) =>
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
</script>

<style scoped>
/* A card grid in the directory's vocabulary: ink on the card, blue only on the title. */
.rental-similar-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  padding: 0;
  margin: 20px 0 0;
  list-style: none;
}
.rental-similar-cards li {
  min-width: 0;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
  transition:
    transform 180ms ease,
    box-shadow 180ms ease;
}
.rental-similar-cards li:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}
.rental-similar-cards a {
  display: block;
  height: 100%;
  text-decoration: none;
  color: inherit;
}
.rental-similar-cards a:hover strong {
  text-decoration: underline;
}
.rental-similar-cards a:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
}
.rental-similar-cards__media {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 3 / 2;
  background: rgba(var(--v-theme-on-surface), 0.06);
  color: rgba(var(--v-theme-on-surface), 0.5);
}
.rental-similar-cards__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.rental-similar-cards__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px 16px;
}
.rental-similar-cards__body > b {
  font-size: 1.25rem;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}
.rental-similar-cards__expenses,
.rental-similar-cards__specs,
.rental-similar-cards__zone {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.76);
}
.rental-similar-cards__body > strong {
  margin-top: 6px;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.4;
  color: rgb(var(--v-theme-link));
}
@media (max-width: 959px) {
  .rental-similar-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 599px) {
  .rental-similar-cards {
    grid-template-columns: 1fr;
  }
}
@media (prefers-reduced-motion: reduce) {
  .rental-similar-cards li {
    transition: none;
  }
  .rental-similar-cards li:hover {
    transform: none;
  }
}
</style>
