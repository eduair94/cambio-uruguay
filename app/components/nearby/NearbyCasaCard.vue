<template>
  <VCard class="nearby-casa-card pa-4 mb-3" variant="outlined" data-testid="nearby-casa-row">
    <div class="nearby-card-layout">
      <span class="nearby-rank">{{ rank }}</span>
      <div class="nearby-casa-content">
        <div class="nearby-casa-heading">
          <h3 class="text-subtitle-1 font-weight-bold mb-0" data-testid="nearby-casa-row-name">
            {{ name }}
          </h3>
          <span class="nearby-rating text-body-2" data-testid="nearby-rating">
            <template v-if="googleRating != null">
              <VIcon size="14" color="amber">mdi-star</VIcon>
              {{ googleRating.toFixed(1) }} ({{ googleReviewCount }})
            </template>
            <template v-else>{{ t('nearbyCasas.noReviews') }}</template>
          </span>
        </div>
        <div class="nearby-rate-line text-body-2 mt-1">
          {{ currencyCode }} {{ rateLabel }} · {{ distanceKm.toFixed(1) }} km
        </div>
        <div v-if="address" class="nearby-address text-caption text-grey-lighten-1 mt-1">
          {{ address }}<template v-if="locality">, {{ locality }}</template>
        </div>
        <div v-if="hours" class="nearby-hours text-caption mt-1">
          <VIcon size="12">mdi-clock-outline</VIcon>
          <span>{{ hours }}</span>
        </div>
        <div class="nearby-actions mt-3">
          <VBtn
            :href="mapsHref"
            target="_blank"
            rel="noopener"
            color="primary"
            size="small"
            variant="flat"
            class="nearby-action"
            data-testid="nearby-directions-link"
          >
            <VIcon start size="16">mdi-google-maps</VIcon>{{ t('nearbyCasas.getDirections') }}
          </VBtn>
          <VBtn
            :href="wazeHref"
            target="_blank"
            rel="noopener"
            color="info"
            size="small"
            variant="outlined"
            class="nearby-action"
            data-testid="nearby-waze-link"
          >
            <VIcon start size="16">mdi-waze</VIcon>{{ t('nearbyCasas.openWaze') }}
          </VBtn>
        </div>
      </div>
    </div>
  </VCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { googleMapsDirectionsUrl, wazeUrl } from '~/utils/directions'

interface Props {
  rank: number
  name: string
  distanceKm: number
  rateLabel: string
  currencyCode: string
  googleRating: number | null
  googleReviewCount: number | null
  hours: string
  address: string
  locality: string
  lat: number
  lng: number
}

const props = defineProps<Props>()
const { t } = useI18n()

const mapsHref = computed(() => googleMapsDirectionsUrl(props.lat, props.lng))
const wazeHref = computed(() => wazeUrl(props.lat, props.lng))
</script>

<style scoped>
.nearby-casa-card {
  border-radius: 12px;
}

.nearby-card-layout {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  align-items: start;
  gap: 16px;
}

.nearby-rank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}

.nearby-casa-content {
  min-width: 0;
}

.nearby-casa-heading {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
}

.nearby-casa-heading h3 {
  min-width: 0;
  overflow-wrap: anywhere;
}

.nearby-rating {
  display: inline-flex;
  align-items: center;
  justify-self: end;
  gap: 4px;
  min-height: 24px;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  white-space: nowrap;
}

.nearby-rating .v-icon {
  flex: 0 0 auto;
}

.nearby-rate-line {
  font-weight: 600;
}

.nearby-address {
  max-width: 75ch;
  line-height: 1.45;
}

.nearby-hours {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  max-width: 80ch;
  line-height: 1.45;
}

.nearby-hours .v-icon {
  flex: 0 0 auto;
  margin-top: 2px;
}

.nearby-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.nearby-action {
  min-height: 36px;
}

@media (max-width: 599.98px) {
  .nearby-card-layout {
    grid-template-columns: 30px minmax(0, 1fr);
    gap: 12px;
  }

  .nearby-casa-heading {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .nearby-rating {
    justify-self: start;
  }

  .nearby-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .nearby-action {
    width: 100%;
    min-width: 0;
    min-height: 40px;
    padding-inline: 8px;
    font-size: 0.72rem;
  }
}

@media (max-width: 350px) {
  .nearby-actions {
    grid-template-columns: 1fr;
  }
}
</style>
