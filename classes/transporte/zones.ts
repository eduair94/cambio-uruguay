// Las zonas entre las que se rutea: los 62 barrios oficiales de Montevideo más las localidades del
// área metropolitana que el sistema de ómnibus cubre de verdad.
//
// Los 62 salen del MISMO archivo INE 2011 que ya usa `/alquileres-uruguay` para sus barrios
// (`classes/propertyzones/sources/ine2011.json`): usar otra lista habría dado dos vocabularios de
// barrio en el mismo sitio, y el visitante que filtra alquileres por "La Blanqueada" tiene que poder
// elegir "La Blanqueada" acá y que sea la misma.
//
// EL CENTROIDE COMO PUNTO DE LA ZONA, y sus límites: un barrio no es un punto, así que la comparación
// entre dos barrios es entre sus centros y no entre dos direcciones. Eso alcanza para decidir si
// comprar un vehículo (la respuesta no cambia porque el origen esté tres cuadras más al norte) y no
// alcanza para planificar un viaje — por eso la página ofrece además escribir la dirección exacta,
// que es el único camino que consulta un servicio externo en el momento. El centroide de un polígono
// cóncavo puede caer fuera del barrio o en un parque; Valhalla engancha al camino más cercano, así
// que el efecto es una ruta que arranca en la calle de al lado, no un error.
import { loadOfficialPropertyZoneGeometry } from "../propertyzones/sources/geometry";
import type { TransportZone } from "./types";

/**
 * Localidades del área metropolitana con sus coordenadas.
 *
 * No salen del INE 2011 porque ese archivo son los barrios de Montevideo y nada más. Son las cinco
 * localidades de Canelones con más gente que viaja a Montevideo todos los días, y están acá porque
 * el trayecto Ciudad de la Costa–Centro es exactamente el caso donde la respuesta cambia: 20 km en
 * los que el ómnibus deja de ser competitivo y la moto empieza a tener sentido.
 */
const METRO_LOCALITIES: readonly TransportZone[] = [
  { slug: "ciudad-de-la-costa", name: "Ciudad de la Costa", department: "Canelones", lat: -34.8167, lon: -55.9500, kind: "localidad" },
  { slug: "las-piedras", name: "Las Piedras", department: "Canelones", lat: -34.7269, lon: -56.2206, kind: "localidad" },
  { slug: "pando", name: "Pando", department: "Canelones", lat: -34.7167, lon: -55.9500, kind: "localidad" },
  { slug: "la-paz", name: "La Paz", department: "Canelones", lat: -34.7583, lon: -56.2250, kind: "localidad" },
  { slug: "barros-blancos", name: "Barros Blancos", department: "Canelones", lat: -34.7500, lon: -56.0167, kind: "localidad" },
  { slug: "canelones-ciudad", name: "Canelones (ciudad)", department: "Canelones", lat: -34.5228, lon: -56.2772, kind: "localidad" },
];

/** Centroide de un anillo de polígono, por el área firmada. */
export function ringCentroid(ring: readonly (readonly number[])[]): { lat: number; lon: number } | null {
  if (!Array.isArray(ring) || ring.length < 3) return null;
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const current = ring[index];
    const next = ring[(index + 1) % ring.length];
    if (!current || !next) continue;
    const [x0, y0] = current;
    const [x1, y1] = next;
    if (typeof x0 !== "number" || typeof y0 !== "number" || typeof x1 !== "number" || typeof y1 !== "number") continue;
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  if (!area) {
    // Polígono degenerado: el promedio de los vértices es mejor que nada y nunca es NaN.
    const points = ring.filter(point => typeof point?.[0] === "number" && typeof point?.[1] === "number");
    if (!points.length) return null;
    return {
      lon: points.reduce((sum, point) => sum + (point[0] as number), 0) / points.length,
      lat: points.reduce((sum, point) => sum + (point[1] as number), 0) / points.length,
    };
  }
  const factor = 1 / (3 * area);
  return { lon: cx * factor, lat: cy * factor };
}

/** El anillo exterior más grande de una geometría (Polygon o MultiPolygon). */
function largestRing(geometry: any): readonly (readonly number[])[] | null {
  if (!geometry) return null;
  if (geometry.type === "Polygon") return geometry.coordinates?.[0] ?? null;
  if (geometry.type === "MultiPolygon") {
    let best: readonly (readonly number[])[] | null = null;
    for (const polygon of geometry.coordinates ?? []) {
      const ring = polygon?.[0];
      if (Array.isArray(ring) && (!best || ring.length > best.length)) best = ring;
    }
    return best;
  }
  return null;
}

export function zoneSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Las zonas de la matriz, en orden estable: primero Montevideo por nombre, después el área metro. */
export function transportZones(now = new Date()): TransportZone[] {
  const { zones } = loadOfficialPropertyZoneGeometry(now);
  const montevideo: TransportZone[] = [];
  for (const zone of zones) {
    const ring = largestRing((zone as any).geometry);
    const centroid = ring ? ringCentroid(ring) : null;
    if (!centroid) continue;
    montevideo.push({
      slug: zoneSlug(zone.name),
      name: zone.name,
      department: "Montevideo",
      lat: Number(centroid.lat.toFixed(6)),
      lon: Number(centroid.lon.toFixed(6)),
      kind: "ine",
    });
  }
  montevideo.sort((a, b) => a.name.localeCompare(b.name, "es"));
  return [...montevideo, ...METRO_LOCALITIES];
}
