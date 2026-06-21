<template>
  <client-only>
    <div ref="el" class="locations-map" :style="{ height }" />
    <template #fallback>
      <div class="locations-map locations-map--loading" :style="{ height }">
        <v-progress-circular indeterminate color="primary" />
      </div>
    </template>
  </client-only>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'

interface Branch {
  origin: string
  id: string
  name: string
  dept: string
  locality: string
  address: string
  phone: string
  hours: string
  lat: number
  lng: number
  mapUrl: string
  source: string
}

interface CashPoint {
  network: string
  label: string
  id: string
  name: string
  address: string
  locality: string
  dept: string
  phone: string
  hours: string
  lat: number
  lng: number
}

interface Props {
  branches: Branch[]
  center?: [number, number]
  zoom?: number
  height?: string
  userLocation?: { lat: number; lng: number } | null
  radiusKm?: number
  highlightId?: string | null
  popupFor?: (b: Branch) => string
  directionsLabel?: string
  cashPoints?: CashPoint[]
  cashLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  center: () => [-34.9011, -56.1645], // Montevideo
  zoom: 7,
  height: '70vh',
  userLocation: null,
  radiusKm: 0,
  highlightId: null,
  popupFor: undefined,
  directionsLabel: 'Cómo llegar',
  cashPoints: () => [],
  cashLabel: 'Retiro de efectivo',
})

const emit = defineEmits<{ 'marker-click': [branch: Branch] }>()

const config = useRuntimeConfig()
const tileUrl =
  (config.public as any).tileUrl || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

const el = ref<HTMLElement | null>(null)
let L: any = null
let map: any = null
let cluster: any = null
let cashCluster: any = null
let userMarker: any = null
let radiusCircle: any = null
const markersById = new Map<string, any>()

// Stable colour per origin (hash → hue) so each casa is visually distinct.
function colorFor(origin: string): string {
  let h = 0
  for (let i = 0; i < origin.length; i++) h = (h * 31 + origin.charCodeAt(i)) % 360
  return `hsl(${h}, 70%, 45%)`
}

function pinIcon(origin: string, highlighted: boolean) {
  const c = colorFor(origin)
  const size = highlighted ? 18 : 12
  return L.divIcon({
    className: 'casa-pin',
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:50%;background:${c};border:2px solid #fff;box-shadow:0 0 3px rgba(0,0,0,.5)"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function defaultPopup(b: Branch): string {
  const esc = (s: string) =>
    String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
  const rawDir =
    b.mapUrl && /^https?:\/\//i.test(b.mapUrl)
      ? b.mapUrl
      : `https://www.google.com/maps/search/${encodeURIComponent(`${b.name} ${b.address} ${b.locality}`)}`
  const dir = esc(rawDir)
  return `<strong>${esc(b.name || b.origin)}</strong><br>${esc(b.address)}<br>${esc(b.locality)}, ${esc(b.dept)}` +
    (b.hours ? `<br><em>${esc(b.hours)}</em>` : '') +
    (b.phone ? `<br>📞 ${esc(b.phone)}` : '') +
    `<br><a href="${dir}" target="_blank" rel="noopener">${esc(props.directionsLabel)} →</a>`
}

async function init() {
  if (!el.value) return
  L = await import('leaflet')
  await import('leaflet.markercluster')
  await import('leaflet/dist/leaflet.css')
  await import('leaflet.markercluster/dist/MarkerCluster.css')
  await import('leaflet.markercluster/dist/MarkerCluster.Default.css')

  map = L.map(el.value, { scrollWheelZoom: true }).setView(props.center, props.zoom)
  L.tileLayer(tileUrl, {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map)

  cluster = (L as any).markerClusterGroup({ chunkedLoading: true, maxClusterRadius: 50 })
  map.addLayer(cluster)
  renderMarkers()

  cashCluster = (L as any).markerClusterGroup({ chunkedLoading: true, maxClusterRadius: 60 })
  map.addLayer(cashCluster)
  renderCashPoints()

  renderUser()
}

function cashIcon() {
  return L.divIcon({
    className: 'cash-pin',
    html: `<span style="display:flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:3px;background:#00897b;border:2px solid #fff;box-shadow:0 0 3px rgba(0,0,0,.5);color:#fff;font-size:10px;font-weight:700;line-height:1">$</span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

function cashPopup(p: CashPoint): string {
  const esc = (s: string) =>
    String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
  const q = encodeURIComponent(`${p.name} ${p.address} ${p.locality}`)
  const dir = esc(`https://www.google.com/maps/search/${q}`)
  return `<strong>${esc(p.name || p.label)}</strong><br><span style="color:#00897b;font-weight:600">${esc(p.label)} · ${esc(props.cashLabel)}</span>` +
    (p.address ? `<br>${esc(p.address)}` : '') +
    (p.locality ? `<br>${esc(p.locality)}` : '') +
    (p.hours ? `<br><em>${esc(p.hours)}</em>` : '') +
    (p.phone ? `<br>📞 ${esc(p.phone)}` : '') +
    `<br><a href="${dir}" target="_blank" rel="noopener">${esc(props.directionsLabel)} →</a>`
}

function renderCashPoints() {
  if (!cashCluster) return
  cashCluster.clearLayers()
  for (const p of props.cashPoints || []) {
    const m = L.marker([p.lat, p.lng], { icon: cashIcon() })
    m.bindPopup(cashPopup(p))
    cashCluster.addLayer(m)
  }
}

function renderMarkers() {
  if (!cluster) return
  cluster.clearLayers()
  markersById.clear()
  const popup = props.popupFor || defaultPopup
  for (const b of props.branches) {
    const m = L.marker([b.lat, b.lng], { icon: pinIcon(b.origin, b.id === props.highlightId) })
    m.bindPopup(popup(b))
    m.on('click', () => emit('marker-click', b))
    markersById.set(b.id, m)
    cluster.addLayer(m)
  }
}

function renderUser() {
  if (!map) return
  if (userMarker) { map.removeLayer(userMarker); userMarker = null }
  if (radiusCircle) { map.removeLayer(radiusCircle); radiusCircle = null }
  if (!props.userLocation) return
  const ll: [number, number] = [props.userLocation.lat, props.userLocation.lng]
  userMarker = L.circleMarker(ll, { radius: 7, color: '#1976d2', fillColor: '#1976d2', fillOpacity: 1 }).addTo(map)
  if (props.radiusKm && props.radiusKm > 0) {
    radiusCircle = L.circle(ll, { radius: props.radiusKm * 1000, color: '#1976d2', weight: 1, fillOpacity: 0.05 }).addTo(map)
    map.fitBounds(radiusCircle.getBounds(), { padding: [20, 20] })
  } else {
    map.setView(ll, 13)
  }
}

// Public-ish helper the page can call by ref to focus a branch.
function focusBranch(id: string) {
  const m = markersById.get(id)
  if (m && map && cluster) {
    cluster.zoomToShowLayer(m, () => m.openPopup())
  }
}
defineExpose({ focusBranch })

onMounted(init)
onBeforeUnmount(() => {
  if (map) { map.remove(); map = null }
  cluster = null
  cashCluster = null
  userMarker = null
  radiusCircle = null
  markersById.clear()
})

watch(() => props.branches, () => renderMarkers(), { deep: false })
watch(() => props.cashPoints, () => renderCashPoints(), { deep: false })
watch(() => [props.userLocation, props.radiusKm], () => renderUser(), { deep: true })
watch(() => props.highlightId, () => renderMarkers())
</script>

<style scoped>
.locations-map {
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  z-index: 0;
}
.locations-map--loading {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.04);
}
</style>
