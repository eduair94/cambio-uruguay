export interface MapBranch {
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
  source: 'bcu' | 'osm' | 'web'
}

const str = (v: any): string => (v === undefined || v === null ? '' : String(v))

export function projectBackendBranch(raw: any): MapBranch | null {
  const lat = Number(raw?.lat)
  const lng = Number(raw?.lng)
  if (!isFinite(lat) || !isFinite(lng) || lat === 0 || lng === 0) return null
  return {
    origin: str(raw.origin),
    id: str(raw.id),
    name: str(raw.name),
    dept: str(raw.dept),
    locality: str(raw.locality),
    address: str(raw.address),
    phone: str(raw.phone),
    hours: str(raw.hours),
    lat,
    lng,
    mapUrl: str(raw.mapUrl),
    source: 'bcu',
  }
}

// Rough metres between two lat/lng points (equirectangular approximation — fine for ~tens of metres).
function metresBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const lat = ((aLat + bLat) / 2) * (Math.PI / 180)
  const x = dLng * Math.cos(lat)
  return Math.sqrt(dLat * dLat + x * x) * R
}

const DEDUPE_METRES = 60

export function buildLocations(backend: any[], extra: MapBranch[]): MapBranch[] {
  const projected = (backend || [])
    .map(projectBackendBranch)
    .filter((b): b is MapBranch => b !== null)

  const kept: MapBranch[] = [...projected]
  for (const e of extra || []) {
    const lat = Number(e.lat)
    const lng = Number(e.lng)
    if (!isFinite(lat) || !isFinite(lng) || lat === 0 || lng === 0) continue
    const dup = projected.some(
      p => p.origin === e.origin && metresBetween(p.lat, p.lng, lat, lng) < DEDUPE_METRES
    )
    if (!dup) kept.push({ ...e, lat, lng })
  }
  return kept
}
