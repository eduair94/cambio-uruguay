// Genera app/utils/armadoresMapData.ts: los 62 barrios INE 2011 de Montevideo como trazos SVG
// simplificados, para el mapa-selector de /armadores-de-muebles-montevideo.
//
// Se corre a mano desde la raíz (`node app/scripts/build-armadores-map.mjs`, `--check` para sólo
// comparar). Es la única pieza que lee fuera de app/: el build de Nuxt sigue autosuficiente y usa
// el archivo generado y versionado. Fuente: classes/propertyzones/sources/ine2011.json (WGS84).
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')
const source = JSON.parse(
  readFileSync(join(root, 'classes/propertyzones/sources/ine2011.json'), 'utf8')
)
const NAMES = {
  1: 'Ciudad Vieja',
  2: 'Centro',
  3: 'Barrio Sur',
  4: 'Cordón',
  5: 'Palermo',
  6: 'Parque Rodó',
  7: 'Punta Carretas',
  8: 'Pocitos',
  9: 'Buceo',
  10: 'Parque Batlle, Villa Dolores',
  11: 'Malvín',
  12: 'Malvín Norte',
  13: 'Punta Gorda',
  14: 'Carrasco',
  15: 'Carrasco Norte',
  16: 'Bañados de Carrasco',
  17: 'Maroñas, Parque Guaraní',
  18: 'Flor de Maroñas',
  19: 'Las Canteras',
  20: 'Punta de Rieles, Bella Italia',
  21: 'Jardines del Hipódromo',
  22: 'Ituzaingó',
  23: 'Unión',
  24: 'Villa Española',
  25: 'Mercado Modelo, Bolívar',
  26: 'Castro, Pérez Castellanos',
  27: 'Cerrito',
  28: 'Las Acacias',
  29: 'Aires Puros',
  30: 'Casavalle',
  31: 'Piedras Blancas',
  32: 'Manga, Toledo Chico',
  33: 'Paso de las Duranas',
  34: 'Peñarol, Lavalleja',
  35: 'Cerro',
  36: 'Casabó, Pajas Blancas',
  37: 'La Paloma, Tomkinson',
  38: 'La Teja',
  39: 'Prado, Nueva Savona',
  40: 'Capurro, Bella Vista',
  41: 'Aguada',
  42: 'Reducto',
  43: 'Atahualpa',
  44: 'Jacinto Vera',
  45: 'La Figurita',
  46: 'Larrañaga',
  47: 'La Blanqueada',
  48: 'Villa Muñoz, Retiro',
  49: 'La Comercial',
  50: 'Tres Cruces',
  51: 'Brazo Oriental',
  52: 'Sayago',
  53: 'Conciliación',
  54: 'Belvedere',
  55: 'Nuevo París',
  56: 'Tres Ombúes, Pueblo Victoria',
  57: 'Paso de la Arena',
  58: 'Colón Sureste, Abayubá',
  59: 'Colón Centro y Noroeste',
  60: 'Lezica, Melilla',
  61: 'Villa García, Manga Rural',
  62: 'Manga',
}

// Proyección equirectangular con el coseno de la latitud media: a esta escala (40 km) basta.
const LAT0 = -34.82
const KX = Math.cos((LAT0 * Math.PI) / 180)
const [MINX, MINY, MAXX, MAXY] = [-56.432, -34.939, -56.023, -34.701]
const WIDTH = 1000
const scale = WIDTH / ((MAXX - MINX) * KX)
const HEIGHT = Math.round((MAXY - MINY) * scale)
const project = ([lng, lat]) => [(lng - MINX) * KX * scale, (MAXY - lat) * scale]

/** Douglas–Peucker sobre un anillo ya proyectado (tolerancia en unidades del viewBox). */
function simplify(points, tolerance) {
  if (points.length <= 4) return points
  const keep = new Uint8Array(points.length)
  keep[0] = keep[points.length - 1] = 1
  const stack = [[0, points.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()
    let max = 0
    let index = -1
    const [ax, ay] = points[a]
    const [bx, by] = points[b]
    const dx = bx - ax
    const dy = by - ay
    const len = Math.hypot(dx, dy) || 1
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i]
      const d = Math.abs(dy * px - dx * py + bx * ay - by * ax) / len
      if (d > max) [max, index] = [d, i]
    }
    if (max > tolerance && index > 0) {
      keep[index] = 1
      stack.push([a, index], [index, b])
    }
  }
  return points.filter((_, i) => keep[i])
}

const round = value => Math.round(value * 10) / 10
const ringPath = ring => {
  // Un anillo cerrado empieza y termina en el mismo punto: la cuerda mide cero y Douglas–Peucker
  // lo borraría entero. Se parte en el vértice más lejano del primero y se simplifica cada mitad.
  const projected = ring.map(project)
  const [x0, y0] = projected[0]
  let far = 1
  for (let i = 1; i < projected.length; i++)
    if (
      Math.hypot(projected[i][0] - x0, projected[i][1] - y0) >
      Math.hypot(projected[far][0] - x0, projected[far][1] - y0)
    )
      far = i
  const points = [
    ...simplify(projected.slice(0, far + 1), 1.2),
    ...simplify(projected.slice(far), 1.2).slice(1),
  ]
  if (points.length < 4) return ''
  return 'M' + points.map(([x, y]) => `${round(x)} ${round(y)}`).join('L') + 'Z'
}

const barrios = source.zones
  .map(zone => {
    const polygons =
      zone.geometry.type === 'Polygon' ? [zone.geometry.coordinates] : zone.geometry.coordinates
    const d = polygons
      .flatMap(polygon => polygon.map(ringPath))
      .filter(Boolean)
      .join('')
    // Centro aproximado (promedio de vértices del anillo exterior más grande): para el rótulo.
    const outer = polygons
      .map(p => p[0])
      .sort((a, b) => b.length - a.length)[0]
      .map(project)
    const cx = outer.reduce((sum, [x]) => sum + x, 0) / outer.length
    const cy = outer.reduce((sum, [, y]) => sum + y, 0) / outer.length
    return {
      code: zone.officialCode,
      name: NAMES[zone.officialCode],
      d,
      cx: round(cx),
      cy: round(cy),
    }
  })
  .sort((a, b) => Number(a.code) - Number(b.code))

const missing = barrios.filter(b => !b.name)
if (missing.length) throw new Error(`barrios sin nombre: ${missing.map(b => b.code).join(', ')}`)

// Con el formato de Prettier (comillas simples, coma final): el lint del CI recorre todo app/.
const barrioLiteral = b =>
  [
    '  {',
    `    code: '${b.code}',`,
    `    name: '${b.name}',`,
    `    d: '${b.d}',`,
    `    cx: ${b.cx},`,
    `    cy: ${b.cy},`,
    '  },',
  ].join('\n')

const output = `// GENERADO por app/scripts/build-armadores-map.mjs desde classes/propertyzones/sources/ine2011.json
// (INE, aproximaciones a barrios de Montevideo, Censo 2011). No editar a mano.
export interface ArmadorMapBarrio {
  code: string
  name: string
  d: string
  cx: number
  cy: number
}

export const ARMADOR_MAP_VIEWBOX = '0 0 ${WIDTH} ${HEIGHT}'

export const ARMADOR_MAP_BARRIOS: readonly ArmadorMapBarrio[] = [
${barrios.map(barrioLiteral).join('\n')}
]
`
const target = join(here, '..', 'utils', 'armadoresMapData.ts')
if (process.argv.includes('--check')) {
  const current = readFileSync(target, 'utf8')
  if (current !== output) {
    console.error(
      'armadoresMapData.ts no coincide con la fuente: correr node app/scripts/build-armadores-map.mjs'
    )
    process.exit(1)
  }
  console.log('armadoresMapData.ts al día')
} else {
  writeFileSync(target, output)
  console.log(
    `armadoresMapData.ts: ${barrios.length} barrios, ${output.length} bytes, viewBox 0 0 ${WIDTH} ${HEIGHT}`
  )
}
