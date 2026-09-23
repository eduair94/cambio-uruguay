// UTM 21S → WGS84, sin dependencias.
//
// Las paradas de ómnibus de la Intendencia vienen proyectadas en EPSG:32721 (`WGS 84 / UTM zone
// 21S`, lo dice el propio `.prj` del archivo), no en latitud/longitud, así que hay que
// desproyectarlas antes de poder rutear o medir una distancia. Es la serie inversa estándar de
// Snyder; acá está escrita entera porque agregar `proj4` al backend por una sola fórmula de
// cuarenta líneas es peor negocio que tener la fórmula.
//
// Verificado el 22/9/2026 contra el geocodificador: la parada de Coruña y Roletti (X 577981,398 /
// Y 6140774,574) da -34,872405 / -56,146758, y Google ubica esa esquina en -34,872245 / -56,146935.
// Los ~18 metros de diferencia son la distancia entre el poste de la parada y el centro del cruce,
// no un error de la proyección.

const K0 = 0.9996;
const A = 6378137.0;
const F = 1 / 298.257223563;
const E2 = F * (2 - F);
const EP2 = E2 / (1 - E2);
/** Meridiano central de la faja 21. */
const LON0 = -57;
/** El falso norte del hemisferio sur. */
const FALSE_NORTHING = 10_000_000;
const FALSE_EASTING = 500_000;

const toDegrees = (radians: number): number => (radians * 180) / Math.PI;
const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export interface LatLon {
  lat: number;
  lon: number;
}

export function utm21sToWgs84(easting: number, northing: number): LatLon | null {
  if (!Number.isFinite(easting) || !Number.isFinite(northing)) return null;

  const x = easting - FALSE_EASTING;
  const y = northing - FALSE_NORTHING;
  const m = y / K0;
  const mu = m / (A * (1 - E2 / 4 - (3 * E2 ** 2) / 64 - (5 * E2 ** 3) / 256));
  const e1 = (1 - Math.sqrt(1 - E2)) / (1 + Math.sqrt(1 - E2));

  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) +
    ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);

  const sinPhi1 = Math.sin(phi1);
  const cosPhi1 = Math.cos(phi1);
  const tanPhi1 = Math.tan(phi1);
  const c1 = EP2 * cosPhi1 ** 2;
  const t1 = tanPhi1 ** 2;
  const n1 = A / Math.sqrt(1 - E2 * sinPhi1 ** 2);
  const r1 = (A * (1 - E2)) / (1 - E2 * sinPhi1 ** 2) ** 1.5;
  const d = x / (n1 * K0);

  const lat =
    phi1 -
    ((n1 * tanPhi1) / r1) *
      (d ** 2 / 2 -
        ((5 + 3 * t1 + 10 * c1 - 4 * c1 ** 2 - 9 * EP2) * d ** 4) / 24 +
        ((61 + 90 * t1 + 298 * c1 + 45 * t1 ** 2 - 252 * EP2 - 3 * c1 ** 2) * d ** 6) / 720);

  const lon =
    toRadians(LON0) +
    (d -
      ((1 + 2 * t1 + c1) * d ** 3) / 6 +
      ((5 - 2 * c1 + 28 * t1 - 3 * c1 ** 2 + 8 * EP2 + 24 * t1 ** 2) * d ** 5) / 120) /
      cosPhi1;

  const result = { lat: toDegrees(lat), lon: toDegrees(lon) };
  if (!Number.isFinite(result.lat) || !Number.isFinite(result.lon)) return null;
  return result;
}

/**
 * Distancia en metros entre dos puntos (haversine).
 *
 * Alcanza de sobra para lo que se usa acá —decidir qué paradas quedan a menos de X metros de un
 * punto— y no depende de nada.
 */
export function metersBetween(from: LatLon, to: LatLon): number {
  const radius = 6_371_000;
  const dLat = toRadians(to.lat - from.lat);
  const dLon = toRadians(to.lon - from.lon);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return Math.round(2 * radius * Math.asin(Math.min(1, Math.sqrt(a))));
}
