// `/latin-ncap-uruguay`: los ensayos de Latin NCAP de los modelos que se venden en Uruguay.
//
// POR QUÉ UNA PÁGINA. Los datos ya estaban en el repo desde setiembre (`utils/latinNcap.ts`,
// verificados uno por uno en latinncap.com el 2026-09-24) pero sólo se veían DENTRO de la ficha de
// un modelo del asesor de compra, o sea después de elegir presupuesto, uso y prioridades. Quien
// busca «cuántas estrellas tiene el Onix» no está armando un presupuesto: ya eligió el auto y
// pregunta por el ensayo. Es la misma demanda de MARCA que el sitio ya reparte entre `/historico` y
// `/historico/<casa>`, y acá no agrega una sola cifra nueva: le da una pantalla a los 124 ensayos.
//
// LA REGLA QUE NO SE AFLOJA, y es la del propio `utils/latinNcap.ts`: una estrella es de UN ensayo
// de UNA versión con SUS airbags en UN momento, no del modelo. Latin NCAP casi nunca publica desde
// qué año o número de chasis vale (6 de los 124 ensayos traen VIN en el nombre), así que esta página
// NO rankea autos, NO elige «el más seguro» y NO asigna un ensayo a un año de modelo. Muestra la
// lista y quien mira un auto confirma cuál de los ensayos corresponde a la versión que tiene
// adelante. El contraejemplo vive en los propios datos: el Hyundai Tucson tiene dos ensayos del
// MISMO año, el mismo protocolo y el mismo nombre de modelo, uno con 0 de 5 y otro con 3 de 5, y la
// única diferencia es cuántos airbags traía la unidad ensayada.
//
// Y LA AUSENCIA NO ES UN VEREDICTO: un modelo que no aparece acá no fue ensayado por Latin NCAP, lo
// que no dice que sea seguro ni que no lo sea.
//
// Módulo puro (sin Vue ni Nuxt), como el resto de `utils/`: lo carga `pages/latin-ncap-uruguay.vue`
// y lo cubre `tests/unit/latinNcapPage.test.ts`. Todas las cifras de la página —incluido el título y
// la descripción del snippet— se CALCULAN de la tabla, nunca se escriben a mano: si un ensayo nuevo
// entra a `latinNcap.ts`, el snippet se mueve con él.
import type { LatinNcapEntry, LatinNcapProtocol } from './carAdvisorFigures'
import { LATIN_NCAP } from './latinNcap'

export const LATIN_NCAP_PATH = '/latin-ncap-uruguay'
export const LATIN_NCAP_URL = `https://cambio-uruguay.com${LATIN_NCAP_PATH}`
/** El día en que se verificó cada resultado contra su propia página en latinncap.com. */
export const LATIN_NCAP_VERIFIED_AT = '2026-09-24'
export const LATIN_NCAP_SOURCE = 'https://www.latinncap.com/es/resultados'

/** Las marcas de los `marketSlug`, con el nombre que la marca usa. */
const BRAND_LABELS: Record<string, string> = {
  chevrolet: 'Chevrolet',
  citroen: 'Citroën',
  fiat: 'Fiat',
  ford: 'Ford',
  honda: 'Honda',
  hyundai: 'Hyundai',
  jeep: 'Jeep',
  kia: 'Kia',
  nissan: 'Nissan',
  peugeot: 'Peugeot',
  renault: 'Renault',
  suzuki: 'Suzuki',
  toyota: 'Toyota',
  volkswagen: 'Volkswagen',
}

/**
 * Los nombres de modelo que el separador por guiones no reconstruye, con el nombre tal como lo
 * escribe Latin NCAP en el propio ensayo (`testedName`): `up!`, `HB20`, `HR-V`, `T-Cross`.
 *
 * Es un mapa explícito y no una regla porque las excepciones no tienen forma común: una es un signo
 * de admiración, otra una sigla, otra un guion interno que el slug ya gastó como separador.
 */
const MODEL_LABELS: Record<string, string> = {
  'chevrolet-onix-plus': 'Onix Plus',
  'honda-hr-v': 'HR-V',
  'hyundai-grand-i10': 'Grand i10',
  'hyundai-hb20': 'HB20',
  'toyota-sw4': 'SW4',
  'volkswagen-t-cross': 'T-Cross',
  'volkswagen-up': 'up!',
}

export interface NcapModelName {
  slug: string
  brandSlug: string
  brand: string
  model: string
  /** "Volkswagen T-Cross", para el encabezado de la fila y para el buscador del sitio. */
  label: string
}

/**
 * De `marketSlug` al nombre que se imprime.
 *
 * TIRA EXCEPCIÓN si la marca no está en el mapa, y eso es deliberado: el modo de fallar silencioso
 * sería imprimir "Byd" o "Jac" en mayúscula inicial y que nadie lo vea hasta que esté publicado.
 */
export function ncapModelName(slug: string): NcapModelName {
  const brandSlug = slug.split('-')[0]!
  const brand = BRAND_LABELS[brandSlug]
  if (!brand) throw new Error(`falta el nombre de la marca "${brandSlug}" (slug "${slug}")`)
  const model =
    MODEL_LABELS[slug] ??
    slug
      .slice(brandSlug.length + 1)
      .split('-')
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  return { slug, brandSlug, brand, model, label: `${brand} ${model}` }
}

/**
 * Los protocolos, con lo único que hay que saber para NO comparar entre ellos: hasta 2019 Latin
 * NCAP publicaba dos notas (adulto y niño) y desde 2020 una sola, y la exigencia de cada protocolo
 * es distinta. "4 estrellas de 2015" y "4 de 2022" no son la misma afirmación.
 */
export const NCAP_PROTOCOLS: ReadonlyArray<{
  protocol: LatinNcapProtocol
  label: string
  scoring: string
}> = Object.freeze([
  {
    protocol: '2010-2015',
    label: 'Protocolo 2010-2015',
    scoring: 'Dos notas separadas: ocupante adulto y ocupante niño.',
  },
  {
    protocol: '2016-2019',
    label: 'Protocolo 2016-2019',
    scoring: 'Dos notas separadas, con exigencia mayor que el protocolo anterior.',
  },
  {
    protocol: '2020+',
    label: 'Protocolo 2020 en adelante',
    scoring: 'Una sola calificación de 0 a 5 para todo el ensayo.',
  },
])

/**
 * La nota comparable DENTRO de un protocolo: la única del protocolo 2020 o, en los anteriores, la
 * del ocupante adulto.
 *
 * No existe una nota comparable ENTRE protocolos, y por eso esta función nunca se usa para ordenar
 * la tabla ni para elegir un "mejor": sólo para medir cuánto se separan los ensayos de un mismo
 * modelo bajo el mismo protocolo.
 */
export function ncapAdultScore(entry: LatinNcapEntry): number | null {
  return entry.protocol === '2020+' ? entry.stars : entry.adultStars
}

export interface NcapModelRow extends NcapModelName {
  /** Los ensayos del modelo, el más nuevo primero. */
  entries: LatinNcapEntry[]
}

export interface NcapBrandGroup {
  brandSlug: string
  brand: string
  models: NcapModelRow[]
}

/** Todos los modelos ensayados, agrupados por marca, en orden alfabético de marca y de modelo. */
export function ncapBrandGroups(entries: readonly LatinNcapEntry[] = LATIN_NCAP): NcapBrandGroup[] {
  const byModel = new Map<string, LatinNcapEntry[]>()
  for (const entry of entries) {
    const list = byModel.get(entry.marketSlug)
    if (list) list.push(entry)
    else byModel.set(entry.marketSlug, [entry])
  }
  const rows: NcapModelRow[] = [...byModel.entries()].map(([slug, list]) => ({
    ...ncapModelName(slug),
    entries: [...list].sort(
      (a, b) => b.testYear - a.testYear || a.testedName.localeCompare(b.testedName)
    ),
  }))
  const byBrand = new Map<string, NcapBrandGroup>()
  for (const row of rows) {
    const group = byBrand.get(row.brandSlug)
    if (group) group.models.push(row)
    else byBrand.set(row.brandSlug, { brandSlug: row.brandSlug, brand: row.brand, models: [row] })
  }
  return [...byBrand.values()]
    .map(group => ({
      ...group,
      models: group.models.sort((a, b) => a.model.localeCompare(b.model, 'es')),
    }))
    .sort((a, b) => a.brand.localeCompare(b.brand, 'es'))
}

export interface NcapSplit extends NcapModelName {
  protocol: LatinNcapProtocol
  /** Los dos extremos del mismo modelo bajo el mismo protocolo. */
  worst: LatinNcapEntry
  best: LatinNcapEntry
  spread: number
  /** Los dos ensayos son del mismo año: ni la fecha explica la diferencia, sólo la versión. */
  sameYear: boolean
}

/**
 * Los modelos cuyos propios ensayos se separan, DENTRO de un mismo protocolo, por `minSpread`
 * estrellas o más.
 *
 * Es la prueba de la única cosa que esta página afirma: la estrella es del ensayo. Se exige el mismo
 * protocolo a propósito —cruzar protocolos probaría el otro punto, que no son comparables— y se
 * marca aparte el caso en que los dos ensayos son además del mismo año, donde ya no queda ninguna
 * explicación salvo qué versión se ensayó.
 */
export function ncapSplits(
  minSpread = 3,
  entries: readonly LatinNcapEntry[] = LATIN_NCAP
): NcapSplit[] {
  const splits: NcapSplit[] = []
  for (const group of ncapBrandGroups(entries)) {
    for (const row of group.models) {
      for (const { protocol } of NCAP_PROTOCOLS) {
        const scored = row.entries
          .filter(entry => entry.protocol === protocol && ncapAdultScore(entry) !== null)
          .sort((a, b) => ncapAdultScore(a)! - ncapAdultScore(b)!)
        if (scored.length < 2) continue
        const worst = scored[0]!
        const best = scored[scored.length - 1]!
        const spread = ncapAdultScore(best)! - ncapAdultScore(worst)!
        if (spread < minSpread) continue
        splits.push({
          ...ncapModelName(row.slug),
          protocol,
          worst,
          best,
          spread,
          sameYear: worst.testYear === best.testYear,
        })
      }
    }
  }
  return splits.sort(
    (a, b) =>
      b.spread - a.spread ||
      Number(b.sameYear) - Number(a.sameYear) ||
      a.label.localeCompare(b.label, 'es')
  )
}

export interface NcapSameYearPair extends NcapModelName {
  protocol: LatinNcapProtocol
  testYear: number
  lower: LatinNcapEntry
  higher: LatinNcapEntry
}

/**
 * Los pares de ensayos del MISMO modelo, el MISMO protocolo y el MISMO año que dieron notas
 * distintas.
 *
 * Es el caso que no admite ninguna otra lectura: ni la fecha ni la exigencia del protocolo explican
 * la diferencia, así que lo único que queda es qué versión se ensayó. El Hyundai Tucson de 2022 da
 * 0 de 5 con dos airbags y 3 de 5 con seis, y las dos filas dicen "Hyundai Tucson".
 */
export function ncapSameYearPairs(
  entries: readonly LatinNcapEntry[] = LATIN_NCAP
): NcapSameYearPair[] {
  const pairs: NcapSameYearPair[] = []
  for (const group of ncapBrandGroups(entries)) {
    for (const row of group.models) {
      const buckets = new Map<string, LatinNcapEntry[]>()
      for (const entry of row.entries) {
        const key = `${entry.protocol}|${entry.testYear}`
        const list = buckets.get(key)
        if (list) list.push(entry)
        else buckets.set(key, [entry])
      }
      for (const list of buckets.values()) {
        const scored = list
          .filter(entry => ncapAdultScore(entry) !== null)
          .sort((a, b) => ncapAdultScore(a)! - ncapAdultScore(b)!)
        if (scored.length < 2) continue
        const lower = scored[0]!
        const higher = scored[scored.length - 1]!
        if (ncapAdultScore(lower) === ncapAdultScore(higher)) continue
        pairs.push({
          ...ncapModelName(row.slug),
          protocol: lower.protocol,
          testYear: lower.testYear,
          lower,
          higher,
        })
      }
    }
  }
  return pairs.sort(
    (a, b) =>
      ncapAdultScore(b.higher)! -
        ncapAdultScore(b.lower)! -
        (ncapAdultScore(a.higher)! - ncapAdultScore(a.lower)!) ||
      a.label.localeCompare(b.label, 'es')
  )
}

export interface NcapStats {
  tests: number
  models: number
  brands: number
  firstYear: number
  lastYear: number
  /** Cuántos ensayos tiene cada protocolo. */
  perProtocol: Array<{ protocol: LatinNcapProtocol; label: string; tests: number }>
  /** La distribución del protocolo 2020, que es el único con una nota única. */
  modern: { tests: number; zero: number; five: number }
  /** Ensayos que declaran desde qué unidad valen (VIN o fecha en el nombre del ensayo). */
  withVersionBoundary: number
  /** Modelos con más de un ensayo, y de ésos los que tienen dos del mismo año. */
  multiTested: number
  sameYearModels: number
}

/** Todo lo que la página afirma con un número, calculado de la tabla. */
export function ncapStats(entries: readonly LatinNcapEntry[] = LATIN_NCAP): NcapStats {
  const groups = ncapBrandGroups(entries)
  const models = groups.flatMap(group => group.models)
  const modern = entries.filter(entry => entry.protocol === '2020+')
  return {
    tests: entries.length,
    models: models.length,
    brands: groups.length,
    firstYear: Math.min(...entries.map(entry => entry.testYear)),
    lastYear: Math.max(...entries.map(entry => entry.testYear)),
    perProtocol: NCAP_PROTOCOLS.map(({ protocol, label }) => ({
      protocol,
      label,
      tests: entries.filter(entry => entry.protocol === protocol).length,
    })),
    modern: {
      tests: modern.length,
      zero: modern.filter(entry => entry.stars === 0).length,
      five: modern.filter(entry => entry.stars === 5).length,
    },
    withVersionBoundary: entries.filter(entry => /VIN|desde/i.test(entry.testedName)).length,
    multiTested: models.filter(model => model.entries.length > 1).length,
    sameYearModels: models.filter(
      model => new Set(model.entries.map(entry => entry.testYear)).size < model.entries.length
    ).length,
  }
}

/**
 * El título y la descripción del snippet, ARMADOS de la tabla.
 *
 * La regla de oro del sitio está medida: una descripción con el número del día corre a ~1,4 % de
 * CTR y una genérica a 0,03-0,2 % desde la misma posición. Y un número escrito a mano en el
 * `<head>` de una página se separa de sus datos sin que nada avise, que es el modo de fallar que
 * este sitio ya pagó. Así que acá se calcula: `tests/unit/latinNcapPage.test.ts` vigila además que
 * no se pase de 155 caracteres.
 */
export function ncapSeo(stats: NcapStats = ncapStats()): { title: string; description: string } {
  return {
    title: `Latin NCAP: estrellas de ${stats.models} modelos en Uruguay`,
    description:
      `Los ${stats.tests} ensayos de Latin NCAP de ${stats.models} modelos que se venden en Uruguay, ` +
      `con enlace a cada resultado. Con el protocolo 2020, ${stats.modern.zero} dieron 0 de 5 y ` +
      `${stats.modern.five} dieron 5.`,
  }
}
