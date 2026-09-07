// Distancias para "¿dónde está más barato cerca de mí?".
//
// Los 18 locales sin coordenada del catálogo existen y se publican, pero no
// pueden entrar en una consulta por radio: sin coordenada no hay distancia, y
// devolverlos igual convertiría el radio en decoración.
const EARTH_KM = 6371;
const rad = (deg: number): number => (deg * Math.PI) / 180;

/** Distancia en kilómetros entre dos coordenadas. */
export function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}

/**
 * Chequeo de CORDURA del parámetro, no un geocerco.
 *
 * Un rectángulo alrededor de Uruguay no puede excluir Buenos Aires: está a
 * prácticamente la misma latitud, cruzando el Río de la Plata, y dentro del
 * rango de longitudes del propio país. Lo que esta función atrapa es un `near`
 * mal armado —latitud y longitud invertidas, grados en vez de decimales, un
 * cero— que devolvería una lista vacía sin decir por qué. Quién está cerca de
 * qué local lo decide la distancia, no esta caja.
 */
export function withinPlausibleRange(lat: number, lon: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lon) && lat <= -29.5 && lat >= -35.5 && lon <= -52.5 && lon >= -59.0;
}
