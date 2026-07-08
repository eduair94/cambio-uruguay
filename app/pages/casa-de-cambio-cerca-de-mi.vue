<template>
  <v-container fluid class="pa-2 pa-sm-4 nearby-casas-page">
    <h1 class="text-h5 mb-2">{{ t('nearbyCasas.title') }}</h1>
    <p class="text-body-2 mb-4">{{ t('nearbyCasas.subtitle') }}</p>

    <v-row dense align="end" class="mb-2">
      <v-col cols="6" sm="4" md="3">
        <v-select
          v-model="currency"
          :items="currencyItems"
          :label="t('map.currency')"
          density="compact"
          variant="outlined"
          hide-details
        />
      </v-col>
      <v-col cols="6" sm="4" md="3">
        <v-select
          v-model="direction"
          :items="directionItems"
          :label="t('map.direction')"
          density="compact"
          variant="outlined"
          hide-details
        />
      </v-col>
      <v-col cols="12" sm="4" md="3">
        <span class="text-caption">{{ t('map.radius') }}: {{ radiusKm }} km</span>
        <v-slider
          v-model="radiusKm"
          :min="1"
          :max="50"
          :step="1"
          hide-details
          density="compact"
          :aria-label="`${t('map.radius')} (km)`"
        />
      </v-col>
      <v-col cols="12" md="3">
        <v-btn color="primary" :loading="locating" block @click="locate">
          <v-icon start>mdi-crosshairs-gps</v-icon>{{ t('map.useMyLocation') }}
        </v-btn>
      </v-col>
    </v-row>

    <v-alert
      v-if="geoError"
      type="warning"
      density="compact"
      class="mb-2"
      closable
      @click:close="geoError = ''"
    >
      {{ geoError }}
    </v-alert>

    <div v-if="!userLocation" class="mb-4">
      <p class="text-caption mb-1">{{ t('nearbyCasas.chooseCity') }}</p>
      <v-chip-group>
        <v-chip
          v-for="city in QUICK_CITIES"
          :key="city.name"
          size="small"
          variant="outlined"
          data-testid="nearby-city-chip"
          @click="setLocation(city.lat, city.lng)"
        >
          {{ city.name }}
        </v-chip>
      </v-chip-group>
    </div>

    <template v-if="userLocation">
      <v-btn-toggle
        v-model="sortMode"
        mandatory
        density="compact"
        color="primary"
        variant="outlined"
        divided
        class="mb-3"
      >
        <v-btn value="smart" size="small">{{ t('nearbyCasas.sortSmart') }}</v-btn>
        <v-btn value="distance" size="small">{{ t('nearbyCasas.sortDistance') }}</v-btn>
        <v-btn value="rate" size="small">{{ t('nearbyCasas.sortRate') }}</v-btn>
      </v-btn-toggle>

      <div v-if="sorted.length" class="nearby-list">
        <NearbyCasaCard
          v-for="(item, i) in sorted"
          :key="item.branch.id"
          :rank="i + 1"
          :name="item.casa.name"
          :distance-km="item.distanceKm"
          :rate-label="formatRate(item.rate)"
          :currency-code="currency"
          :google-rating="item.casa.googleRating"
          :google-review-count="item.casa.googleReviewCount"
          :hours="item.branch.hours"
          :address="item.branch.address"
          :locality="item.branch.locality"
          :lat="item.branch.lat"
          :lng="item.branch.lng"
        />
      </div>
      <v-alert v-else type="info" variant="tonal" density="comfortable">
        {{ t('nearbyCasas.noneInRadius') }}
      </v-alert>

      <div class="mt-4">
        <v-btn variant="outlined" @click="showMap = !showMap">
          <v-icon start>mdi-map</v-icon>
          {{ showMap ? t('nearbyCasas.hideMap') : t('nearbyCasas.viewOnMap') }}
        </v-btn>
        <LocationsMap
          v-if="showMap"
          :branches="mapBranches"
          :user-location="userLocation"
          :radius-km="radiusKm"
          height="60vh"
          class="mt-3"
        />
      </div>
    </template>
    <v-card v-else variant="outlined" class="pa-6 text-center">
      {{ t('map.setLocationHint') }}
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import NearbyCasaCard from '~/components/nearby/NearbyCasaCard.vue'
import LocationsMap from '~/components/map/LocationsMap.vue'
import { buildRatesByOrigin, type RatesByOrigin } from '~/utils/nearbyRates'
import { rankNearbyCasas, type RankedCasa } from '~/utils/nearbyCasas'
import { CASAS_REPUTATION } from '~/utils/casasDirectory'
import type { MapBranch } from '~/server/utils/locations'

const { t, locale } = useI18n()
const { getAllLocations, getProcessedExchangeData } = useApiService()

const branches = ref<MapBranch[]>([])
const ratesByOrigin = ref<RatesByOrigin>({})

const currency = ref('USD')
const direction = ref<'buy' | 'sell'>('buy')
const radiusKm = ref(5)
const userLocation = ref<{ lat: number; lng: number } | null>(null)
const locating = ref(false)
const geoError = ref('')
const showMap = ref(false)
const sortMode = ref<'smart' | 'distance' | 'rate'>('smart')

// Quick-pick fallback when geolocation is denied/unavailable — tourist-friendly
// alternative to a silent Montevideo default (unlike /mapa, we don't force a
// location the user hasn't chosen; the empty-state prompt stays visible until
// they either geolocate or tap a chip).
const QUICK_CITIES = [
  { name: 'Montevideo', lat: -34.9011, lng: -56.1645 },
  { name: 'Punta del Este', lat: -34.967, lng: -54.95 },
  { name: 'Colonia del Sacramento', lat: -34.4626, lng: -57.84 },
  { name: 'Salto', lat: -31.3833, lng: -57.9667 },
]

const currencyItems = computed(() => {
  const set = new Set<string>()
  for (const o of Object.keys(ratesByOrigin.value)) {
    for (const c of Object.keys(ratesByOrigin.value[o])) set.add(c)
  }
  const arr = Array.from(set)
  arr.sort((a, b) => (a === 'USD' ? -1 : b === 'USD' ? 1 : a.localeCompare(b)))
  return arr
})

const directionItems = computed(() => [
  { title: t('map.haveForeign', { c: currency.value }), value: 'buy' },
  { title: t('map.needForeign', { c: currency.value }), value: 'sell' },
])

const ranked = computed<RankedCasa<MapBranch>[]>(() => {
  if (!userLocation.value) return []
  return rankNearbyCasas(
    branches.value,
    CASAS_REPUTATION,
    ratesByOrigin.value,
    userLocation.value,
    radiusKm.value,
    currency.value,
    direction.value
  )
})

const sorted = computed(() => {
  const list = [...ranked.value]
  if (sortMode.value === 'distance') {
    list.sort((a, b) => a.distanceKm - b.distanceKm)
  } else if (sortMode.value === 'rate') {
    list.sort((a, b) => (direction.value === 'buy' ? b.rate - a.rate : a.rate - b.rate))
  }
  // 'smart' keeps rankNearbyCasas()'s own blended-score order.
  return list
})

const mapBranches = computed(() => sorted.value.map(item => item.branch))

function formatRate(n: number): string {
  return new Intl.NumberFormat(locale.value, { maximumFractionDigits: 2 }).format(n)
}

function setLocation(lat: number, lng: number) {
  userLocation.value = { lat, lng }
  geoError.value = ''
}

function locate() {
  if (!import.meta.client || !navigator.geolocation) {
    geoError.value = t('map.geoUnavailable')
    return
  }
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    pos => {
      userLocation.value = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      locating.value = false
    },
    () => {
      geoError.value = t('nearbyCasas.geoDenied')
      locating.value = false
    },
    { enableHighAccuracy: true, timeout: 8000 }
  )
}

const { data } = useLazyAsyncData('nearby-casas-data', async () => {
  const [locs, processed] = await Promise.all([getAllLocations(), getProcessedExchangeData('')])
  return { locs, processed }
})
watch(
  data,
  d => {
    if (!d) return
    branches.value = (d.locs || []) as MapBranch[]
    ratesByOrigin.value = buildRatesByOrigin((d.processed?.exchangeData || []) as any[])
    if (currencyItems.value.length && !currencyItems.value.includes(currency.value)) {
      currency.value = currencyItems.value[0]
    }
  },
  { immediate: true }
)

useSeoMeta({
  title: () => t('seo.nearbyCasasTitle'),
  description: () => t('seo.nearbyCasasDescription'),
  ogTitle: () => t('seo.nearbyCasasTitle'),
  ogDescription: () => t('seo.nearbyCasasDescription'),
  twitterCard: 'summary_large_image',
})
defineOgImageComponent('Cambio', {
  title: () => t('seo.nearbyCasasTitle'),
  tag: 'Cerca de mí',
  locale: locale.value as 'es' | 'en' | 'pt',
})
useHead(() => ({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: t('seo.nearbyCasasTitle'),
        numberOfItems: sorted.value.length,
      }),
    },
  ],
}))
</script>
