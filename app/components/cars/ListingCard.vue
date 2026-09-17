<template>
  <article class="car-card" :data-car-key="car.key">
    <NuxtLink :to="localePath(carPath(car.key))" class="car-card__photo" :aria-label="car.title">
      <img
        v-if="car.picture && !failed"
        :src="car.picture"
        :alt="car.title"
        loading="lazy"
        width="360"
        height="240"
        referrerpolicy="no-referrer"
        @error="failed = true"
      />
      <span v-else class="car-card__nophoto"><VIcon icon="mdi-car-outline" size="40" /></span>
    </NuxtLink>
    <div class="car-card__body">
      <div v-if="car.opportunity || car.priceDrop || car.flags.length" class="car-card__badges">
        <span v-if="car.opportunity" class="car-badge car-badge--deal">
          {{ carPercent(car.opportunity.gap) }} bajo la mediana
        </span>
        <span v-if="car.priceDrop" class="car-badge car-badge--drop">
          Bajó
          {{ formatCarPrice({ price: car.priceDrop.from - car.price, currency: car.currency }) }}
        </span>
        <span v-if="car.flags.length" class="car-badge car-badge--flag">
          {{ CAR_FLAG_LABELS[car.flags[0]!] }}
        </span>
      </div>
      <h3 class="car-card__title">
        <NuxtLink :to="localePath(carPath(car.key))">{{ car.title }}</NuxtLink>
      </h3>
      <p class="car-card__price">
        {{ formatCarPrice(car) }}
        <span v-if="car.priceConverted" class="text-caption text-medium-emphasis">
          (≈ {{ formatCarUsd(car.priceUsd) }})
        </span>
        <span v-if="car.currencyInferred" class="text-caption text-medium-emphasis">
          (moneda estimada)
        </span>
      </p>
      <p class="car-card__facts">{{ facts }}</p>
      <p v-if="place" class="car-card__place">{{ place }}</p>
      <p class="car-card__source">{{ car.sourceName }}</p>
    </div>
  </article>
</template>

<script setup lang="ts">
import {
  CAR_FLAG_LABELS,
  CAR_FUEL_LABELS,
  CAR_SELLER_LABELS,
  CAR_TRANSMISSION_LABELS,
  carPath,
  carPercent,
  formatCarKm,
  formatCarPrice,
  formatCarUsd,
} from '~/utils/cars'
import type { PublicCarListing } from '~/utils/carsPublic'

const props = defineProps<{ car: PublicCarListing }>()
const localePath = useLocalePath()
const failed = ref(false)
const facts = computed(() =>
  [
    String(props.car.year),
    formatCarKm(props.car.km),
    props.car.transmission && CAR_TRANSMISSION_LABELS[props.car.transmission],
    props.car.fuel && CAR_FUEL_LABELS[props.car.fuel],
  ]
    .filter(Boolean)
    .join(' · ')
)
const place = computed(() =>
  [
    props.car.neighborhood,
    props.car.department,
    props.car.sellerType && CAR_SELLER_LABELS[props.car.sellerType],
  ]
    .filter(Boolean)
    .join(' · ')
)
</script>

<style scoped>
.car-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
}
.car-card__photo {
  display: block;
  aspect-ratio: 3 / 2;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.car-card__photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.car-card__nophoto {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.car-card__body {
  padding: 12px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.car-card__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.car-badge {
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 999px;
  padding: 2px 8px;
  border: 1px solid currentColor;
}
.car-badge--deal {
  color: rgb(var(--v-theme-success));
}
.car-badge--drop {
  color: rgb(var(--v-theme-info));
}
.car-badge--flag {
  color: rgb(var(--v-theme-warning));
}
.car-card__title {
  font-size: 1rem;
  line-height: 1.3;
  margin: 0;
}
.car-card__title a {
  color: inherit;
  text-decoration: none;
}
.car-card__title a:hover {
  text-decoration: underline;
}
.car-card__price {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
}
.car-card__facts,
.car-card__place,
.car-card__source {
  font-size: 0.875rem;
  margin: 0;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
</style>
