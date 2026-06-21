<template>
  <v-container fluid class="pa-2 pa-sm-4">
    <h1 class="text-h5 mb-2">{{ t('map.title') }}</h1>
    <p class="text-body-2 mb-4">{{ t('map.subtitle') }}</p>

    <v-row dense class="mb-2">
      <v-col cols="12" sm="6" md="3">
        <v-select
          v-model="currency"
          :items="currencyItems"
          :label="t('map.currency')"
          density="compact"
          variant="outlined"
          hide-details
        />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-select
          v-model="direction"
          :items="directionItems"
          :label="t('map.direction')"
          density="compact"
          variant="outlined"
          hide-details
        />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <div class="px-1">
          <span class="text-caption">{{ t('map.radius') }}: {{ radiusKm }} km</span>
          <v-slider v-model="radiusKm" :min="1" :max="50" :step="1" hide-details density="compact" />
        </div>
      </v-col>
      <v-col cols="12" sm="6" md="3" class="d-flex align-center">
        <v-btn color="primary" :loading="locating" block @click="locate">
          <v-icon start>mdi-crosshairs-gps</v-icon>{{ t('map.useMyLocation') }}
        </v-btn>
      </v-col>
    </v-row>

    <v-alert v-if="geoError" type="warning" density="compact" class="mb-2" closable @click:close="geoError = ''">
      {{ geoError }}
    </v-alert>

    <v-row>
      <v-col cols="12" md="8">
        <LocationsMap
          ref="mapRef"
          :branches="branches"
          :user-location="userLocation"
          :radius-km="userLocation ? radiusKm : 0"
          :highlight-id="highlightId"
          :popup-for="popupFor"
          height="72vh"
          @marker-click="onMarkerClick"
        />
      </v-col>
      <v-col cols="12" md="4">
        <v-card variant="outlined" class="ranked-panel">
          <v-card-title class="text-subtitle-1">
            {{ userLocation ? t('map.bestNearby') : t('map.setLocationPrompt') }}
          </v-card-title>
          <v-card-text v-if="userLocation && ranked.length" class="pa-0">
            <v-list density="compact">
              <v-list-item
                v-for="(r, i) in ranked"
                :key="r.branch.id"
                :active="r.branch.id === highlightId"
                @click="focus(r.branch.id)"
              >
                <template #prepend>
                  <span class="rank-num">{{ i + 1 }}</span>
                </template>
                <v-list-item-title>
                  {{ nameFor(r.branch.origin) }} — {{ formatRate(r.rate) }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ r.branch.locality }} · {{ r.distanceKm.toFixed(1) }} km
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
          <v-card-text v-else-if="userLocation">
            {{ t('map.noneInRadius') }}
          </v-card-text>
          <v-card-text v-else>
            {{ t('map.setLocationHint') }}
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import LocationsMap from '~/components/map/LocationsMap.vue'
import { buildRatesByOrigin, rankNearby, type RatesByOrigin } from '~/utils/nearbyRates'

const { t, locale } = useI18n()
const { getAllLocations, getProcessedExchangeData } = useApiService()

const branches = ref<any[]>([])
const ratesByOrigin = ref<RatesByOrigin>({})
const localData = ref<Record<string, any>>({})

const currency = ref('USD')
const direction = ref<'buy' | 'sell'>('buy')
const radiusKm = ref(5)
const userLocation = ref<{ lat: number; lng: number } | null>(null)
const highlightId = ref<string | null>(null)
const locating = ref(false)
const geoError = ref('')
const mapRef = ref<any>(null)

// Currencies actually present in today's rate data, USD first.
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

const ranked = computed(() => {
  if (!userLocation.value) return []
  return rankNearby(branches.value, ratesByOrigin.value, userLocation.value, radiusKm.value, currency.value, direction.value)
})

function nameFor(origin: string): string {
  return localData.value[origin]?.name || origin
}
function formatRate(n: number): string {
  return new Intl.NumberFormat(locale.value, { maximumFractionDigits: 2 }).format(n)
}
function popupFor(b: any): string {
  const rate = ratesByOrigin.value[b.origin]?.[currency.value]
  const esc = (s: string) =>
    String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
  const rawDir =
    b.mapUrl && /^https?:\/\//i.test(b.mapUrl)
      ? b.mapUrl
      : `https://www.google.com/maps/search/${encodeURIComponent(`${b.name} ${b.address} ${b.locality}`)}`
  const dir = esc(rawDir)
  const rateLine = rate
    ? `<br>${esc(currency.value)}: ${t('compra')} ${rate.buy ?? '—'} / ${t('venta')} ${rate.sell ?? '—'}`
    : ''
  return `<strong>${esc(nameFor(b.origin))}</strong><br>${esc(b.address)}<br>${esc(b.locality)}, ${esc(b.dept)}` +
    (b.hours ? `<br><em>${esc(b.hours)}</em>` : '') +
    rateLine +
    `<br><a href="${dir}" target="_blank" rel="noopener">${t('map.directions')} →</a>`
}

function onMarkerClick(b: any) {
  highlightId.value = b.id
}
function focus(id: string) {
  highlightId.value = id
  mapRef.value?.focusBranch(id)
}
function locate() {
  if (!import.meta.client || !navigator.geolocation) {
    geoError.value = t('map.geoUnavailable')
    return
  }
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userLocation.value = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      locating.value = false
    },
    () => {
      geoError.value = t('map.geoDenied')
      userLocation.value = { lat: -34.9011, lng: -56.1645 } // fallback: Montevideo
      locating.value = false
    },
    { enableHighAccuracy: true, timeout: 8000 }
  )
}

// Load data (client-side; the list is large and not needed for SSR/SEO body).
const { data } = await useLazyAsyncData('mapa-data', async () => {
  const [locs, processed] = await Promise.all([getAllLocations(), getProcessedExchangeData('')])
  return { locs, processed }
})
watch(
  data,
  (d) => {
    if (!d) return
    branches.value = d.locs || []
    ratesByOrigin.value = buildRatesByOrigin((d.processed?.exchangeData || []) as any[])
    localData.value = d.processed?.localData || {}
    if (currencyItems.value.length && !currencyItems.value.includes(currency.value)) {
      currency.value = currencyItems.value[0]
    }
  },
  { immediate: true }
)

useSeoMeta({
  title: () => t('seo.mapaTitle'),
  description: () => t('seo.mapaDescription'),
  ogTitle: () => t('seo.mapaTitle'),
  ogDescription: () => t('seo.mapaDescription'),
  twitterCard: 'summary_large_image',
})
defineOgImageComponent('Cambio', {
  title: () => t('seo.mapaTitle'),
  tag: 'Mapa',
  locale: locale.value as 'es' | 'en' | 'pt',
})
useHead(() => ({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: t('seo.mapaTitle'),
        numberOfItems: branches.value.length,
      }),
    },
  ],
}))
</script>

<style scoped>
.ranked-panel {
  max-height: 72vh;
  overflow-y: auto;
}
.rank-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin-right: 8px;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  color: #fff;
  font-size: 12px;
}
</style>
