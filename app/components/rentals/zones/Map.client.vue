<template>
  <div>
    <div ref="element" class="zone-map" :aria-label="t('map')" />
    <p v-if="failed" role="status" class="map-error">{{ t('mapUnavailable') }}</p>
  </div>
</template>

<script setup lang="ts">
import type { Map as LeafletMap, GeoJSON, Path, Layer } from 'leaflet'
import type { GeoJsonObject, Feature } from 'geojson'
import type { RentalZoneBoundaryCollection } from '~/utils/rentalZoneTypes'
import { rentalZoneMessages } from '~/utils/rentalZoneMessages'

const props = defineProps<{
  boundaries: RentalZoneBoundaryCollection
  colors: Record<string, string>
  labels: Record<string, string>
  selectedId: string | null
}>()
const emit = defineEmits<{ select: [id: string]; failed: [] }>()
const { t } = useI18n({ useScope: 'local', messages: rentalZoneMessages })
const element = ref<HTMLElement>()
const failed = ref(false)
const config = useRuntimeConfig()
let map: LeafletMap | undefined
let shapes: GeoJSON | undefined
let leaflet: typeof import('leaflet')
let observer: ResizeObserver | undefined
let disposed = false
let fitted = false
const style = (id: string) => ({
  color: props.selectedId === id ? '#102c4c' : '#ffffff',
  weight: props.selectedId === id ? 3 : 1,
  fillColor: props.colors[id] || '#d4d9df',
  fillOpacity: 0.78,
})
function render() {
  if (!map || !leaflet) return
  shapes?.remove()
  shapes = leaflet
    .geoJSON(props.boundaries as GeoJsonObject, {
      style: feature => style(feature?.properties?.zoneId || ''),
      onEachFeature(feature: Feature, layer: Layer) {
        const id = String(feature.properties?.zoneId || '')
        layer.on('click', () => emit('select', id))
        layer.on('add', () => {
          const path = (layer as Path).getElement()
          if (!path) return
          path.setAttribute('tabindex', '0')
          path.setAttribute('role', 'button')
          path.setAttribute('data-zone-id', id)
          path.setAttribute(
            'aria-label',
            props.labels[id] || String(feature.properties?.name || id)
          )
          path.setAttribute('aria-pressed', String(props.selectedId === id))
          path.addEventListener('keydown', event => {
            const key = (event as KeyboardEvent).key
            if (key === 'Enter' || key === ' ') {
              event.preventDefault()
              emit('select', id)
            }
          })
        })
      },
    })
    .addTo(map)
  if (!fitted && shapes.getBounds().isValid()) {
    map.fitBounds(shapes.getBounds(), { padding: [12, 12], animate: false })
    fitted = true
  }
}
onMounted(async () => {
  try {
    leaflet = await import('leaflet')
    await import('leaflet/dist/leaflet.css')
    if (disposed || !element.value) return
    map = leaflet.map(element.value, { scrollWheelZoom: false }).setView([-34.86, -56.17], 11)
    leaflet
      .tileLayer(
        (config.public.tileUrl as string) || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }
      )
      .addTo(map)
    render()
    observer = new ResizeObserver(() => map?.invalidateSize())
    observer.observe(element.value)
  } catch {
    failed.value = true
    emit('failed')
  }
})
watch(() => [props.boundaries, props.colors, props.labels], render)
watch(
  () => props.selectedId,
  () => {
    shapes?.eachLayer(layer => {
      const shape = layer as Path & { feature?: Feature }
      const id = String(shape.feature?.properties?.zoneId || '')
      shape.setStyle(style(id))
      shape.getElement()?.setAttribute('aria-pressed', String(props.selectedId === id))
    })
  }
)
onBeforeUnmount(() => {
  disposed = true
  observer?.disconnect()
  map?.remove()
})
</script>

<style scoped>
.zone-map {
  height: min(56vh, 520px);
  min-height: 280px;
  border-radius: 8px;
  z-index: 0;
}
.map-error {
  margin: 12px 0 0;
}
.zone-map :deep(.leaflet-interactive:focus-visible) {
  outline: none;
  stroke: #102c4c;
  stroke-width: 4px;
}
.zone-map :deep(.leaflet-control-zoom a) {
  width: 44px;
  height: 44px;
  line-height: 44px;
}
</style>
