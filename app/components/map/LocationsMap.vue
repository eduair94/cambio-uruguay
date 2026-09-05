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
  /** Disable Leaflet HTML popups when the page supplies its own contextual panel. */
  popups?: boolean
  /** Optional touch target around the unchanged visual dot. */
  markerHitSize?: number
  popupFor?: (b: Branch) => string
  directionsLabel?: string
  cashPoints?: CashPoint[]
  cashLabel?: string
  /**
   * Encuadrar la cámara sobre los marcadores en el primer render con datos.
   *
   * Opt-in y no comportamiento por defecto para no tocar /mapa ni
   * /casa-de-cambio-cerca-de-mi, que abren a propósito en una vista fija.
   */
  fitToMarkers?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  center: () => [-34.9011, -56.1645], // Montevideo
  zoom: 7,
  height: '70vh',
  userLocation: null,
  radiusKm: 0,
  highlightId: null,
  popups: true,
  markerHitSize: 0,
  popupFor: undefined,
  directionsLabel: 'Cómo llegar',
  cashPoints: () => [],
  cashLabel: 'Retiro de efectivo',
  fitToMarkers: false,
})

const emit = defineEmits<{ 'marker-click': [branch: Branch]; 'map-click': [] }>()

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
let initStarted = false
/** Ya se encuadró sobre los datos: sólo se hace en el primer render con marcadores. */
let hasFitted = false
const markersById = new Map<string, any>()
const branchById = new Map<string, Branch>()
let currentHighlightId: string | null = null

// Stable colour per origin (hash → hue) so each casa is visually distinct.
function colorFor(origin: string): string {
  let h = 0
  for (let i = 0; i < origin.length; i++) h = (h * 31 + origin.charCodeAt(i)) % 360
  return `hsl(${h}, 70%, 45%)`
}

function pinIcon(origin: string, highlighted: boolean) {
  const c = colorFor(origin)
  const size = highlighted ? 18 : 12
  const hitSize = Math.max(size, props.markerHitSize)
  return L.divIcon({
    className: highlighted ? 'casa-pin casa-pin--selected' : 'casa-pin',
    html: `<span style="display:flex;width:${hitSize}px;height:${hitSize}px;align-items:center;justify-content:center"><span style="display:block;width:${size}px;height:${size}px;border-radius:50%;background:${c};border:2px solid #fff;box-shadow:0 0 3px rgba(0,0,0,.5)"></span></span>`,
    iconSize: [hitSize, hitSize],
    iconAnchor: [hitSize / 2, hitSize / 2],
  })
}

function defaultPopup(b: Branch): string {
  const esc = (s: string) =>
    String(s).replace(
      /[&<>"]/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string
    )
  const rawDir =
    b.mapUrl && /^https?:\/\//i.test(b.mapUrl)
      ? b.mapUrl
      : `https://www.google.com/maps/search/${encodeURIComponent(`${b.name} ${b.address} ${b.locality}`)}`
  const dir = esc(rawDir)
  return (
    `<strong>${esc(b.name || b.origin)}</strong><br>${esc(b.address)}<br>${esc(b.locality)}, ${esc(b.dept)}` +
    (b.hours ? `<br><em>${esc(b.hours)}</em>` : '') +
    (b.phone ? `<br>📞 ${esc(b.phone)}` : '') +
    `<br><a href="${dir}" target="_blank" rel="noopener">${esc(props.directionsLabel)} →</a>`
  )
}

async function init() {
  if (initStarted || !el.value) return
  initStarted = true
  // import('leaflet') yields the ESM namespace; L.map/tileLayer are named exports
  // but the markercluster plugin augments leaflet's *default* object (and window.L),
  // so use that — otherwise L.markerClusterGroup is undefined and init throws.
  const leafletMod: any = await import('leaflet')
  L = leafletMod.default ?? leafletMod
  if (import.meta.client) (window as any).L = L
  await import('leaflet.markercluster')
  await import('leaflet/dist/leaflet.css')
  await import('leaflet.markercluster/dist/MarkerCluster.css')
  await import('leaflet.markercluster/dist/MarkerCluster.Default.css')

  map = L.map(el.value, { scrollWheelZoom: true }).setView(props.center, props.zoom)
  map.on('click', (event: { originalEvent?: MouseEvent }) => {
    const target = event.originalEvent?.target
    // A cluster zoom, marker selection or map control must not dismiss the page's panel.
    if (
      target instanceof Element &&
      target.closest('.leaflet-marker-icon, .leaflet-popup, .leaflet-control')
    )
      return
    emit('map-click')
  })
  L.tileLayer(tileUrl, {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
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
    html: `<span style="display:flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:4px;background:#00897b;border:2px solid #fff;box-shadow:0 0 3px rgba(0,0,0,.5);color:#fff;font-size:10px;font-weight:700;line-height:1">$</span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

function cashPopup(p: CashPoint): string {
  const esc = (s: string) =>
    String(s).replace(
      /[&<>"]/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string
    )
  const q = encodeURIComponent(`${p.name} ${p.address} ${p.locality}`)
  const dir = esc(`https://www.google.com/maps/search/${q}`)
  return (
    `<strong>${esc(p.name || p.label)}</strong><br><span style="color:#00897b;font-weight:600">${esc(p.label)} · ${esc(props.cashLabel)}</span>` +
    (p.address ? `<br>${esc(p.address)}` : '') +
    (p.locality ? `<br>${esc(p.locality)}` : '') +
    (p.hours ? `<br><em>${esc(p.hours)}</em>` : '') +
    (p.phone ? `<br>📞 ${esc(p.phone)}` : '') +
    `<br><a href="${dir}" target="_blank" rel="noopener">${esc(props.directionsLabel)} →</a>`
  )
}

function renderCashPoints() {
  if (!cashCluster) return
  cashCluster.clearLayers()
  for (const p of props.cashPoints || []) {
    const label = p.name || p.label
    const m = L.marker([p.lat, p.lng], { icon: cashIcon(), title: label, alt: label })
    if (props.popups) m.bindPopup(cashPopup(p))
    cashCluster.addLayer(m)
  }
}

function renderMarkers() {
  if (!cluster) return
  cluster.clearLayers()
  markersById.clear()
  branchById.clear()
  const popup = props.popupFor || defaultPopup
  for (const b of props.branches) {
    // title/alt give the (keyboard-focusable) marker an accessible name so it
    // isn't an unnamed command for screen readers / axe `aria-command-name`.
    const label = b.name || b.origin
    const m = L.marker([b.lat, b.lng], {
      icon: pinIcon(b.origin, b.id === props.highlightId),
      title: label,
      alt: label,
    })
    if (props.popups) m.bindPopup(popup(b))
    m.on('click', () => emit('marker-click', b))
    markersById.set(b.id, m)
    branchById.set(b.id, b)
    cluster.addLayer(m)
  }
  currentHighlightId = props.highlightId ?? null
  fitOnce()
}

/**
 * Encuadra la cámara sobre los marcadores, UNA sola vez.
 *
 * Tres cuidados, y los tres vienen de cómo se usa este componente:
 *
 *  1. Sólo el primer render con datos. `renderMarkers` corre con cada cambio de `branches`, y en
 *     el mapa de descuentos eso pasa con CADA chip de filtro: un fitBounds incondicional movería
 *     la cámara en cada toque, que es exactamente lo que nadie quiere mientras mira una zona.
 *  2. Bounds vacíos. `cluster.getBounds()` sin capas devuelve bounds inválidos y `fitBounds` tira
 *     "Bounds are not valid".
 *  3. La ubicación del visitante manda. Si ya se centró en dónde está parado, encuadrar sobre todo
 *     el país le saca de la pantalla lo único que le importaba.
 */
function fitOnce() {
  if (!props.fitToMarkers || hasFitted || !map || !cluster) return
  if (props.userLocation) return
  if (!props.branches.length) return
  const bounds = cluster.getBounds()
  if (!bounds || !bounds.isValid()) return
  hasFitted = true
  map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 })
}

// Swap only the affected marker icons when the highlight changes. A full
// renderMarkers() here would clearLayers() and rebuild every marker — which
// destroys the marker the user just clicked and closes its popup before it can
// show (the "double-click to open the popup" bug), since a marker click sets
// highlightId in the same tick.
function applyHighlight(id: string | null) {
  const next = id ?? null
  if (currentHighlightId === next) return
  const prev = currentHighlightId
  if (prev) {
    const m = markersById.get(prev)
    const b = branchById.get(prev)
    if (m && b) m.setIcon(pinIcon(b.origin, false))
  }
  if (next) {
    const m = markersById.get(next)
    const b = branchById.get(next)
    if (m && b) m.setIcon(pinIcon(b.origin, true))
  }
  currentHighlightId = next
}

function renderUser() {
  if (!map) return
  if (userMarker) {
    map.removeLayer(userMarker)
    userMarker = null
  }
  if (radiusCircle) {
    map.removeLayer(radiusCircle)
    radiusCircle = null
  }
  if (!props.userLocation) return
  const ll: [number, number] = [props.userLocation.lat, props.userLocation.lng]
  userMarker = L.circleMarker(ll, {
    radius: 7,
    color: '#1976d2',
    fillColor: '#1976d2',
    fillOpacity: 1,
  }).addTo(map)
  if (props.radiusKm && props.radiusKm > 0) {
    radiusCircle = L.circle(ll, {
      radius: props.radiusKm * 1000,
      color: '#1976d2',
      weight: 1,
      fillOpacity: 0.05,
    }).addTo(map)
    map.fitBounds(radiusCircle.getBounds(), { padding: [20, 20] })
  } else {
    map.setView(ll, 13)
  }
}

// Public-ish helper the page can call by ref to focus a branch.
function focusBranch(id: string) {
  const m = markersById.get(id)
  if (m && map && cluster) {
    cluster.zoomToShowLayer(m, () => {
      if (props.popups) m.openPopup()
    })
  }
}

/** Restore keyboard focus without moving the document or revealing an offscreen marker. */
function focusMarker(id: string): boolean {
  const markerElement = markersById.get(id)?.getElement()
  const mapElement = el.value
  if (!(markerElement instanceof HTMLElement) || !markerElement.isConnected || !mapElement)
    return false
  const markerBounds = markerElement.getBoundingClientRect()
  const mapBounds = mapElement.getBoundingClientRect()
  // Leaflet pans on focus. Only focus an already visible marker; otherwise the parent can
  // focus the map region and preserve the camera chosen while its detail panel was open.
  if (
    !markerBounds.width ||
    !markerBounds.height ||
    markerBounds.left < mapBounds.left ||
    markerBounds.right > mapBounds.right ||
    markerBounds.top < mapBounds.top ||
    markerBounds.bottom > mapBounds.bottom
  )
    return false
  markerElement.focus({ preventScroll: true })
  return document.activeElement === markerElement
}

/** Keep the selected point in the area left visible by the page's detail panel. */
function revealMarker(
  id: string,
  padding: { top: number; right: number; bottom: number; left: number }
): void {
  const marker = markersById.get(id)
  // A clustered marker must not trigger a zoom or reveal a different world copy.
  if (!map || !marker || !map.hasLayer(marker)) return
  const size = map.getSize()
  if (size.x < 44 || size.y < 44) return
  const clampAxis = (start: number, end: number, dimension: number) => {
    const available = dimension - 44
    const safe = (value: number) =>
      Number.isFinite(value) ? Math.min(available, Math.max(0, value)) : 0
    const first = safe(start)
    const last = safe(end)
    const scale = Math.min(1, available / Math.max(1, first + last))
    return [first * scale, last * scale]
  }
  const [left, right] = clampAxis(padding.left, padding.right, size.x)
  const [top, bottom] = clampAxis(padding.top, padding.bottom, size.y)
  map.panInside(marker.getLatLng(), {
    paddingTopLeft: [left, top],
    paddingBottomRight: [right, bottom],
    animate: false,
  })
}
defineExpose({ focusBranch, focusMarker, revealMarker })

// <client-only> renders its default-slot div AFTER this component's onMounted
// fires, so el.value can still be null here. Watch the ref and init the moment
// the div attaches; the initStarted guard keeps it to a single run.
onMounted(init)
watch(el, () => {
  if (el.value) init()
})
onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
  }
  cluster = null
  cashCluster = null
  userMarker = null
  radiusCircle = null
  initStarted = false
  hasFitted = false
  markersById.clear()
  branchById.clear()
  currentHighlightId = null
})

watch(
  () => props.branches,
  () => renderMarkers(),
  { deep: false }
)
watch(
  () => props.cashPoints,
  () => renderCashPoints(),
  { deep: false }
)
watch(
  () => [props.popups, props.markerHitSize],
  () => {
    renderMarkers()
    renderCashPoints()
  }
)
watch(
  () => [props.userLocation, props.radiusKm],
  () => renderUser(),
  { deep: true }
)
watch(
  () => props.highlightId,
  id => applyHighlight(id ?? null)
)
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
