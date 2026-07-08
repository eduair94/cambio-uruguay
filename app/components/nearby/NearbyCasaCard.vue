<template>
  <VCard class="nearby-casa-card pa-4 mb-3" variant="outlined" data-testid="nearby-casa-row">
    <div class="d-flex align-start ga-3">
      <span class="nearby-rank">{{ rank }}</span>
      <div class="flex-grow-1">
        <div class="d-flex align-center flex-wrap ga-2">
          <h3 class="text-subtitle-1 font-weight-bold mb-0" data-testid="nearby-casa-row-name">
            {{ name }}
          </h3>
          <span class="text-body-2">
            <template v-if="googleRating != null">
              <VIcon size="14" color="amber">mdi-star</VIcon>
              {{ googleRating.toFixed(1) }} ({{ googleReviewCount }})
            </template>
            <template v-else>{{ t('nearbyCasas.noReviews') }}</template>
          </span>
        </div>
        <div class="text-body-2 mt-1">
          {{ currencyCode }} {{ rateLabel }} · {{ distanceKm.toFixed(1) }} km
        </div>
        <div v-if="address" class="text-caption text-grey-lighten-1 mt-1">
          {{ address }}<template v-if="locality">, {{ locality }}</template>
        </div>
        <div v-if="hours" class="text-caption mt-1">
          <VIcon size="12">mdi-clock-outline</VIcon> {{ hours }}
        </div>
        <div class="d-flex ga-2 mt-3 flex-wrap">
          <VBtn
            :href="mapsHref"
            target="_blank"
            rel="noopener"
            color="primary"
            size="small"
            variant="flat"
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
</style>
