<template>
  <div>
    <p class="map-hint">{{ t('mapHint') }}</p>
    <div ref="element" class="point-map" :aria-label="t('map')" />
    <p v-if="error" role="alert">{{ t(error) }}</p>
    <p v-if="point" class="map-hint" role="status">{{ t('selectedPoint') }}</p>
    <div class="map-actions">
      <VBtn variant="tonal" :disabled="!ready" @click="useCenter">{{ t('center') }}</VBtn>
      <VBtn color="primary" :disabled="!point" @click="point && emit('select', point)">{{
        t('confirmPoint')
      }}</VBtn>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { Map as LeafletMap, CircleMarker } from 'leaflet'
import { rentalFitMessages } from '~/utils/rentalFitMessages'
import { parseRentalReferencePoint } from '~/utils/rentalDistance'
const props = defineProps<{ initial?: { lat: number; lng: number } | null }>()
const emit = defineEmits<{ select: [point: { lat: number; lng: number }] }>()
const { t } = useI18n({ useScope: 'local', messages: rentalFitMessages })
const element = ref<HTMLElement>()
const ready = ref(false)
const error = ref('')
const point = ref<{ lat: number; lng: number } | null>(props.initial || null)
const config = useRuntimeConfig()
let map: LeafletMap | undefined
let marker: CircleMarker | undefined
let leaflet: typeof import('leaflet')
let disposed = false
function select(lat: number, lng: number) {
  const valid = parseRentalReferencePoint({ refLat: lat, refLng: lng })
  if (!valid) {
    error.value = 'outside'
    return
  }
  point.value = valid
  error.value = ''
  if (!map) return
  if (marker) marker.setLatLng(valid)
  else
    marker = leaflet
      .circleMarker(valid, { radius: 10, color: '#1976d2', fillOpacity: 0.8 })
      .addTo(map)
}
function useCenter() {
  if (map) {
    const center = map.getCenter()
    select(center.lat, center.lng)
  }
}
onMounted(async () => {
  try {
    leaflet = await import('leaflet')
    await import('leaflet/dist/leaflet.css')
    if (disposed || !element.value) return
    map = leaflet.map(element.value, {
      center: props.initial || [-34.89, -56.17],
      zoom: props.initial ? 15 : 12,
      scrollWheelZoom: false,
    })
    leaflet
      .tileLayer(
        (config.public.tileUrl as string) || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }
      )
      .addTo(map)
    map.on('click', event => select(event.latlng.lat, event.latlng.lng))
    if (point.value) select(point.value.lat, point.value.lng)
    ready.value = true
    map.invalidateSize()
  } catch {
    error.value = 'mapError'
  }
})
onBeforeUnmount(() => {
  disposed = true
  map?.remove()
})
</script>
<style scoped>
.point-map {
  height: min(48vh, 380px);
  min-height: 220px;
  border-radius: 8px;
  z-index: 0;
}
.map-hint {
  margin: 0 0 12px;
  line-height: 1.5;
}
.map-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}
.map-actions .v-btn {
  min-height: 44px;
  white-space: normal;
}
</style>
