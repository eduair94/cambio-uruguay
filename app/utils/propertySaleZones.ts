/**
 * Area-navigation anchors from MVOT's public CAT_Barrios_Mvd polygons, read 2026-09-06.
 * https://sit.mvot.gub.uy/arcgis/rest/services/03_CBASE/MAPA_BASE_VECTORIAL/MapServer/56
 * Polygon centroid, with an interior scanline point if the centroid falls outside.
 * These locate a named area, NEVER an advert or a house. No hidden source coordinates.
 * Exact folded names only: compound official districts are not guessed from sub-neighborhoods.
 */
export const PROPERTY_SALE_ZONE_SOURCE =
  'https://sit.mvot.gub.uy/arcgis/rest/services/03_CBASE/MAPA_BASE_VECTORIAL/MapServer/56'
const zones: readonly (readonly [string, number, number])[] = [
  ['AGUADA', -34.89121, -56.18853],
  ['AIRES PUROS', -34.85168, -56.18792],
  ['ATAHUALPA', -34.86553, -56.18956],
  ['BAÑADOS DE CARRASCO', -34.83724, -56.0787],
  ['BARRIO SUR', -34.91143, -56.18953],
  ['BELVEDERE', -34.84903, -56.22405],
  ['BRAZO ORIENTAL', -34.86334, -56.17966],
  ['BUCEO', -34.89621, -56.12888],
  ['CAPURRO BELLA VISTA', -34.87491, -56.20592],
  ['CARRASCO', -34.88382, -56.05663],
  ['CARRASCO NORTE', -34.87394, -56.06722],
  ['CASABO PAJAS BLANCAS', -34.87145, -56.31126],
  ['CASAVALLE', -34.8307, -56.16947],
  ['CASTRO CASTELLANOS', -34.85683, -56.15834],
  ['CENTRO', -34.90411, -56.19222],
  ['CERRITO', -34.85384, -56.17104],
  ['CERRO', -34.8827, -56.25349],
  ['CIUDAD VIEJA', -34.90734, -56.20548],
  ['COLON CENTRO Y NOROESTE', -34.79957, -56.22978],
  ['COLON SURESTE ABAYUBA', -34.76595, -56.19934],
  ['CONCILIACION', -34.8237, -56.2371],
  ['CORDON', -34.90198, -56.17589],
  ['FIGURITA', -34.87725, -56.17726],
  ['FLOR DE MAROÑAS', -34.85107, -56.12469],
  ['ITUZAINGO', -34.84792, -56.14447],
  ['JACINTO VERA', -34.87548, -56.17076],
  ['JARDINES DEL HIPODROMO', -34.83734, -56.13355],
  ['LA BLANQUEADA', -34.8874, -56.15321],
  ['LA COMERCIAL', -34.8873, -56.16988],
  ['LA PALOMA TOMKINSON', -34.85864, -56.26917],
  ['LA TEJA', -34.86887, -56.22968],
  ['LARRAÑAGA', -34.87971, -56.16144],
  ['LAS ACACIAS', -34.84163, -56.16066],
  ['LAS CANTERAS', -34.87092, -56.1039],
  ['LEZICA MELILLA', -34.76452, -56.29284],
  ['MALVIN', -34.89083, -56.10591],
  ['MALVIN NORTE', -34.8784, -56.11914],
  ['MANGA', -34.81125, -56.14805],
  ['MANGA TOLEDO CHICO', -34.76901, -56.14619],
  ['MAROÑAS PARQUE GUARANI', -34.86375, -56.12373],
  ['MERCADO MODELO Y BOLIVAR', -34.86891, -56.15968],
  ['NUEVO PARIS', -34.84035, -56.24478],
  ['PALERMO', -34.91123, -56.17846],
  ['PARQUE RODO', -34.90856, -56.16817],
  ['PASO DE LA ARENA', -34.82425, -56.34333],
  ['PASO DE LAS DURANAS', -34.84767, -56.20377],
  ['PEÑAROL LAVALLEJA', -34.82425, -56.19784],
  ['PIEDRAS BLANCAS', -34.824, -56.1411],
  ['POCITOS', -34.90878, -56.15069],
  ['PQUE BATLLE VILLA DOLORES', -34.89562, -56.14994],
  ['PRADO NUEVA SAVONA', -34.86215, -56.20515],
  ['PUERTO', -34.90252, -56.20789],
  ['PUNTA CARRETAS', -34.92186, -56.1609],
  ['PUNTA GORDA', -34.89047, -56.08153],
  ['PUNTA RIELES BELLA ITALIA', -34.82385, -56.10239],
  ['REDUCTO', -34.87779, -56.18778],
  ['SAYAGO', -34.83455, -56.21297],
  ['TRES CRUCES', -34.89451, -56.16586],
  ['TRES OMBUES PBLO VICTORIA', -34.85905, -56.24091],
  ['UNION', -34.87828, -56.13852],
  ['VILLA ESPAÑOLA', -34.86327, -56.14468],
  ['VILLA GARCIA MANGA RURAL', -34.79283, -56.07989],
  ['VILLA MUÑOZ RETIRO', -34.88804, -56.17805],
]
const fold = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
const byName = new Map(zones.map(([name, lat, lng]) => [fold(name), { name, lat, lng }]))
export function resolvePropertySaleZone(
  department: string,
  neighborhood: string
): { name: string; lat: number; lng: number } | null {
  if (fold(department) !== 'montevideo') return null
  return byName.get(fold(neighborhood)) ?? null
}
