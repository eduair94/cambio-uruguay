// /cuanto-gastar-en-un-sommier-uruguay: cuánto conviene gastar en un sommier de 2 plazas y dónde
// la plata deja de comprar algo.
//
// La pregunta llegó tal cual a r/uruguay el 19/10/2026 («Cuánto se debería gastar en un sommier de
// 2 plazas. Hasta cuándo es inversión y cuándo ya pasa a ser una estafa o dinero mal gastado»), y la
// mitad que el sitio puede medir ya la relevaba la cosecha de /equipar-casa-uruguay: desde ese día
// el sommier tiene su propia fila (`classes/equipar/registry.ts`). Este módulo no cosecha nada: lee
// las dos cosas que la cosecha deja y las cruza.
//
//   - La BANDA de cada medida (`equiparitems`, p25/mediana/p75): la misma cifra que publican
//     /equipar-casa-uruguay y /equipar-casa-uruguay/sommier, para que el sitio no diga dos medianas.
//   - Los AVISOS de los últimos 4 días (`equiparlistings`): de ahí sale lo que la banda no dice, que
//     es QUÉ compra cada tramo de precio según su propio título, y cuánto se aleja el precio tachado
//     del precio que el mercado cobra.
//
// `app/utils` es un namespace de auto-import PLANO: todo lleva el prefijo `sommier`/`SOMMIER_`.
// Puro a propósito (sin Vue ni Nuxt): lo prueba vitest en node.

import type { EquiparBand } from './equipar'
import type { FaqItem } from './faqAnswers'
import { dateLocale } from './format'

export const SOMMIER_PATH = '/cuanto-gastar-en-un-sommier-uruguay'
export const SOMMIER_CATEGORY_PATH = '/equipar-casa-uruguay/sommier'

/** El título del `<title>`: con la marca que agrega la página, 55 caracteres (el SERP corta en ~60). */
export const SOMMIER_TITLE = 'Cuánto gastar en un sommier en Uruguay'
export const SOMMIER_H1 = '¿Cuánto gastar en un sommier de 2 plazas?'
/** ≤ 155 caracteres: lo que pasa de ahí Google no lo acorta, lo saca (seoDescriptionBudget). */
export const SOMMIER_DESCRIPTION =
  'Cuánto sale hoy un sommier de 2 plazas en Uruguay, qué compra cada tramo de precio y cuándo pagar más ya no compra nada: precios relevados todos los días.'

/** Misma ventana que /api/equipar: un aviso que no vimos en 4 días no está a la venta hoy. */
export const SOMMIER_WINDOW_DAYS = 4

/** Debajo de esto una mediana describe ruido. El mismo piso que las bandas de equipar (bands.ts). */
export const SOMMIER_MIN_SAMPLE = 8

/** Un tramo con menos avisos que esto muestra cuántos hay, pero no proporciones. */
export const SOMMIER_MIN_TRAMO = 5

/** Los años contra los que se reparte el precio por noche. Son un horizonte, no una vida útil. */
export const SOMMIER_YEARS = [5, 8, 10] as const

/**
 * Las medidas, en el orden en que se leen. Espejo de las variantes de `sommier` en
 * `classes/equipar/registry.ts` (mismas claves, mismas etiquetas): `sommierSizesParity.test.ts` lo
 * vigila. El colchón usa las mismas tres claves, y por eso se pueden poner lado a lado.
 */
export const SOMMIER_SIZES = [
  { variant: '2plazas', label: '2 plazas (130 a 150 cm)', short: '2 plazas' },
  { variant: 'queen', label: 'Queen o King (160 cm o más)', short: 'Queen o King' },
  { variant: '1plaza', label: '1 plaza o plaza y media', short: '1 plaza' },
] as const

export type SommierVariant = (typeof SOMMIER_SIZES)[number]['variant']

export const SOMMIER_DEFAULT_VARIANT: SommierVariant = '2plazas'

// ---------------------------------------------------------------------------------------------
// Qué dice el título

/** Igual que `norm()` de `classes/equipar/classify.ts`: minúsculas, sin tildes, espacios simples. */
export function sommierNorm(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9%"'\s.,+-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * El núcleo del colchón que trae el conjunto, según lo que el propio aviso dice. Un título puede
 * nombrar varias cosas ("resortes pocket + espuma"); manda el núcleo, que es lo que define cómo se
 * hunde, y en este orden: pocket antes que Bonnell antes que "resortes" a secas antes que espuma.
 */
export type SommierCore = 'pocket' | 'bonnell' | 'resortes' | 'espuma' | 'sin-dato'

export const SOMMIER_CORES: ReadonlyArray<{ key: SommierCore; label: string }> = [
  { key: 'pocket', label: 'Resortes pocket (individuales)' },
  { key: 'bonnell', label: 'Resortes Bonnell (de bloque)' },
  { key: 'resortes', label: 'Resortes, sin decir de qué tipo' },
  { key: 'espuma', label: 'Espuma' },
  { key: 'sin-dato', label: 'El título no lo dice' },
]

const CORE_PATTERNS: ReadonlyArray<[Exclude<SommierCore, 'sin-dato'>, RegExp]> = [
  [
    'pocket',
    /\b(pocket|pockets|ensacad\w*|embolsad\w*|micro ?resortes?|resortes? (individuales|independientes))\b/,
  ],
  ['bonnell', /\bbonn?ell?\b/],
  ['resortes', /\b(resortes?|springs?)\b/],
  // "D28" es la densidad de la espuma escrita como la escriben los fabricantes.
  ['espuma', /\b(espuma|alta densidad|poliuretano|d ?[2-4]\d)\b/],
]

export function sommierCore(title: string): SommierCore {
  const text = sommierNorm(title)
  for (const [core, pattern] of CORE_PATTERNS) if (pattern.test(text)) return core
  return 'sin-dato'
}

/** Una capa de confort arriba del núcleo: pillow top, euro top, viscoelástica, látex o gel. */
export function sommierHasComfortLayer(title: string): boolean {
  return /\b(?:pillow ?top|euro ?top|visco\w*|memory|latex|gel)\b/.test(sommierNorm(title))
}

/** "Ortopédico", "terapéutico", "postural": palabras que el aviso usa y nadie certifica. */
export function sommierSaysOrtopedico(title: string): boolean {
  return /\b(?:ortoped\w*|terapeut\w*|postural\w*)\b/.test(sommierNorm(title))
}

// ---------------------------------------------------------------------------------------------
// Cuentas

/** Interpolación lineal, la misma de `classes/precios/plausibility.ts::percentile`. */
export function sommierPercentile(sorted: readonly number[], q: number): number {
  if (!sorted.length) return Number.NaN
  if (sorted.length === 1) return sorted[0]!
  const position = (sorted.length - 1) * q
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  if (lower === upper) return sorted[lower]!
  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (position - lower)
}

const medianOf = (values: readonly number[]): number | null => {
  if (values.length < SOMMIER_MIN_SAMPLE) return null
  return Math.round(
    sommierPercentile(
      [...values].sort((a, b) => a - b),
      0.5
    )
  )
}

/** Lo que la API lee de cada aviso. Nunca viaja al navegador: sólo los agregados. */
export interface SommierListingRow {
  title: string
  /** En la moneda del aviso. */
  price: number
  /** Siempre en pesos, a la cotización de la corrida. */
  priceUyu: number
  /** El precio tachado, en la moneda del aviso; null si el aviso no muestra uno por encima. */
  listPrice: number | null
}

/** El precio tachado en pesos, a la misma cotización que convirtió el precio del aviso. */
export function sommierListPriceUyu(row: SommierListingRow): number | null {
  if (typeof row.listPrice !== 'number' || !(row.listPrice > row.price) || !(row.price > 0)) {
    return null
  }
  return Math.round((row.listPrice * row.priceUyu) / row.price)
}

export type SommierTramoKey = 'bajo' | 'medio' | 'alto' | 'tope'

export interface SommierTramo {
  key: SommierTramoKey
  /**
   * Los cortes en pesos; null = abierto. Cada precio cae en un solo tramo: "bajo" es menos de `to`,
   * "medio" va de `from` a `to` con los dos bordes adentro, y "alto" y "tope" empiezan después de
   * `from` (ver {@link sommierInTramo}).
   */
  from: number | null
  to: number | null
  n: number
  cores: Record<SommierCore, number>
  comfort: number
  ortopedico: number
  tachado: number
}

export interface SommierCoreStat {
  key: SommierCore
  label: string
  n: number
  median: number | null
}

export interface SommierOrtopedico {
  n: number
  median: number
  otherN: number
  otherMedian: number
  /** Cuánto más (o menos) pide en mediana el aviso que dice "ortopédico", redondeado. */
  premiumPct: number
}

export interface SommierTachado {
  /** Avisos nuevos de la medida. */
  total: number
  /** Cuántos muestran un precio tachado por encima del que cobran. */
  withList: number
  /** El descuento que declaran, en mediana: 1 − precio / tachado. */
  medianOffPct: number
  /** De los que tachan, cuántos tachan un precio por encima del p90 de lo que cobra el mercado. */
  listAboveP90: number | null
}

export interface SommierAnalysis {
  /** Avisos nuevos de la medida vistos en la ventana, sin los que la banda marcó sospechosos. */
  listings: number
  /** El precio que 9 de cada 10 avisos no pasan. Sólo con la muestra mínima. */
  p90: number | null
  tramos: SommierTramo[]
  cores: SommierCoreStat[]
  ortopedico: SommierOrtopedico | null
  tachado: SommierTachado | null
}

const emptyCores = (): Record<SommierCore, number> => ({
  pocket: 0,
  bonnell: 0,
  resortes: 0,
  espuma: 0,
  'sin-dato': 0,
})

/**
 * Los cortes de los tramos. p25 y p75 son los de la BANDA publicada —los mismos que imprime la ficha
 * de la categoría—, y el p90 sale de los avisos, porque la banda no lo guarda. Las dos muestras no son
 * idénticas (la banda es la corrida, los avisos son 4 días), así que el p90 puede quedar por debajo
 * del p75 en una medida con pocos avisos: entonces no hay tramo "tope" y el "alto" queda abierto.
 */
function tramoBounds(
  band: EquiparBand,
  p90: number | null
): Array<{ key: SommierTramoKey; from: number | null; to: number | null }> {
  const bounds: Array<{ key: SommierTramoKey; from: number | null; to: number | null }> = [
    { key: 'bajo', from: null, to: band.p25 },
    { key: 'medio', from: band.p25, to: band.p75 },
  ]
  if (p90 !== null && p90 > band.p75) {
    bounds.push({ key: 'alto', from: band.p75, to: p90 })
    bounds.push({ key: 'tope', from: p90, to: null })
  } else {
    bounds.push({ key: 'alto', from: band.p75, to: null })
  }
  return bounds
}

/** ¿Este precio cae en este tramo? Los bordes van una sola vez: p25 y p75 son del tramo del medio. */
export function sommierInTramo(
  price: number,
  tramo: Pick<SommierTramo, 'key' | 'from' | 'to'>
): boolean {
  const aboveFrom =
    tramo.from === null || (tramo.key === 'medio' ? price >= tramo.from : price > tramo.from)
  const belowTo = tramo.to === null || (tramo.key === 'bajo' ? price < tramo.to : price <= tramo.to)
  return aboveFrom && belowTo
}

const EMPTY_ANALYSIS: SommierAnalysis = {
  listings: 0,
  p90: null,
  tramos: [],
  cores: SOMMIER_CORES.map(core => ({ ...core, n: 0, median: null })),
  ortopedico: null,
  tachado: null,
}

/**
 * Todo lo que la página dice de una medida además de su banda. Cada cifra exige su muestra: una
 * mediana con menos de {@link SOMMIER_MIN_SAMPLE} avisos no se publica, y la comparación "ortopédico"
 * contra el resto pide la muestra en los DOS lados.
 */
export function sommierAnalyze(
  rows: readonly SommierListingRow[],
  band: EquiparBand | null
): SommierAnalysis {
  const valid = rows.filter(row => Number.isFinite(row.priceUyu) && row.priceUyu > 0)
  if (!valid.length) return { ...EMPTY_ANALYSIS, cores: EMPTY_ANALYSIS.cores.map(c => ({ ...c })) }

  const sorted = valid.map(row => row.priceUyu).sort((a, b) => a - b)
  const p90 =
    sorted.length >= SOMMIER_MIN_SAMPLE ? Math.round(sommierPercentile(sorted, 0.9)) : null

  const read = valid.map(row => ({
    price: row.priceUyu,
    core: sommierCore(row.title),
    comfort: sommierHasComfortLayer(row.title),
    ortopedico: sommierSaysOrtopedico(row.title),
    list: sommierListPriceUyu(row),
  }))

  const tramos: SommierTramo[] =
    band && sorted.length >= SOMMIER_MIN_SAMPLE
      ? tramoBounds(band, p90).map(bound => {
          const inside = read.filter(row => sommierInTramo(row.price, bound))
          const cores = emptyCores()
          for (const row of inside) cores[row.core]++
          return {
            ...bound,
            n: inside.length,
            cores,
            comfort: inside.filter(row => row.comfort).length,
            ortopedico: inside.filter(row => row.ortopedico).length,
            tachado: inside.filter(row => row.list !== null).length,
          }
        })
      : []

  const cores: SommierCoreStat[] = SOMMIER_CORES.map(core => {
    const prices = read.filter(row => row.core === core.key).map(row => row.price)
    return { ...core, n: prices.length, median: medianOf(prices) }
  })

  const saysIt = read.filter(row => row.ortopedico).map(row => row.price)
  const rest = read.filter(row => !row.ortopedico).map(row => row.price)
  const saysMedian = medianOf(saysIt)
  const restMedian = medianOf(rest)
  const ortopedico =
    saysMedian !== null && restMedian !== null
      ? {
          n: saysIt.length,
          median: saysMedian,
          otherN: rest.length,
          otherMedian: restMedian,
          premiumPct: Math.round((saysMedian / restMedian - 1) * 100),
        }
      : null

  const listed = read.filter((row): row is typeof row & { list: number } => row.list !== null)
  const tachado =
    sorted.length >= SOMMIER_MIN_SAMPLE && listed.length
      ? {
          total: sorted.length,
          withList: listed.length,
          medianOffPct: Math.round(
            sommierPercentile(
              listed.map(row => (1 - row.price / row.list) * 100).sort((a, b) => a - b),
              0.5
            )
          ),
          listAboveP90: p90 === null ? null : listed.filter(row => row.list > p90).length,
        }
      : null

  return { listings: sorted.length, p90, tramos, cores, ortopedico, tachado }
}

// ---------------------------------------------------------------------------------------------
// Lo que viaja

export interface SommierSize {
  variant: SommierVariant
  label: string
  short: string
  /** La banda publicada del conjunto (`equiparitems`): la misma de la ficha de la categoría. */
  band: EquiparBand | null
  /** El colchón solo, de la misma medida: lo que el conjunto suma es la base. */
  colchonBand: EquiparBand | null
  analysis: SommierAnalysis
}

/** `GET /api/sommier`. Sólo agregados: ni títulos, ni vendedores, ni enlaces. */
export interface SommierResponse {
  generatedAt: string | null
  sizes: SommierSize[]
}

export function sommierEmptyResponse(): SommierResponse {
  return {
    generatedAt: null,
    sizes: SOMMIER_SIZES.map(size => ({
      ...size,
      band: null,
      colchonBand: null,
      analysis: sommierAnalyze([], null),
    })),
  }
}

/** Arma la respuesta a partir de lo que leyó la API, siempre con las tres medidas y en su orden. */
export function sommierBuildResponse(input: {
  generatedAt: string | null
  sommierBands: Readonly<Record<string, EquiparBand | null | undefined>>
  colchonBands: Readonly<Record<string, EquiparBand | null | undefined>>
  rowsByVariant: Readonly<Record<string, readonly SommierListingRow[] | undefined>>
}): SommierResponse {
  return {
    generatedAt: input.generatedAt,
    sizes: SOMMIER_SIZES.map(size => {
      const band = input.sommierBands[size.variant] ?? null
      return {
        ...size,
        band,
        colchonBand: input.colchonBands[size.variant] ?? null,
        analysis: sommierAnalyze(input.rowsByVariant[size.variant] ?? [], band),
      }
    }),
  }
}

export function sommierSize(
  response: SommierResponse | null | undefined,
  variant: string
): SommierSize | null {
  return response?.sizes.find(size => size.variant === variant) ?? null
}

/** Lo que suma la base: la mediana del conjunto contra la del colchón solo, de la misma medida. */
export function sommierBasePremium(
  size: Pick<SommierSize, 'band' | 'colchonBand'> | null
): { diff: number; pct: number } | null {
  if (!size?.band || !size.colchonBand) return null
  const diff = size.band.median - size.colchonBand.median
  if (!(diff > 0)) return null
  return { diff, pct: Math.round((diff / size.colchonBand.median) * 100) }
}

/** Precio repartido por noche. `years` es el horizonte que elige el lector, no una vida útil. */
export function sommierPerNight(price: number, years: number): number | null {
  if (!(price > 0) || !(years > 0)) return null
  return price / (years * 365)
}

// ---------------------------------------------------------------------------------------------
// Formato

/** "$ 25.990", con espacio duro para que no se parta en dos renglones en el celular. */
export function sommierMoney(value: number): string {
  return `$\u00A0${Math.round(value).toLocaleString('es-UY')}`
}

/** Por noche: un decimal debajo de $ 100, que es donde el decimal todavía dice algo. */
export function sommierMoneyPerNight(value: number): string {
  const digits = value < 100 ? 1 : 0
  return `$\u00A0${value.toLocaleString('es-UY', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`
}

/** `'2026-10-20T13:05:00Z'` → `'20 de octubre de 2026'`, en el día de Montevideo. */
export function sommierDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const value = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00Z` : iso
  const time = Date.parse(value)
  if (Number.isNaN(time)) return null
  return new Date(time).toLocaleDateString(dateLocale('es'), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Montevideo',
  })
}

/** "3 de 12": una proporción chica se lee mejor contada que en porcentaje. */
export function sommierShare(part: number, total: number): string {
  if (total < SOMMIER_MIN_TRAMO) return '—'
  return `${part} de ${total}`
}

export function sommierTramoLabel(tramo: Pick<SommierTramo, 'key'>): string {
  switch (tramo.key) {
    case 'bajo':
      return 'El cuarto más barato'
    case 'medio':
      return 'La mitad del medio'
    case 'alto':
      return 'Más caro que 3 de cada 4'
    default:
      return 'Más caro que 9 de cada 10'
  }
}

export function sommierTramoRange(tramo: Pick<SommierTramo, 'from' | 'to'>): string {
  if (tramo.from === null && tramo.to !== null) return `menos de ${sommierMoney(tramo.to)}`
  if (tramo.to === null && tramo.from !== null) return `más de ${sommierMoney(tramo.from)}`
  if (tramo.from !== null && tramo.to !== null) {
    return `${sommierMoney(tramo.from)} a ${sommierMoney(tramo.to)}`
  }
  return ''
}

// ---------------------------------------------------------------------------------------------
// La respuesta, en palabras

/**
 * El primer párrafo: la respuesta con las cifras del día, renderizada en el servidor para que el
 * buscador la pueda citar. Sin banda no inventa una: lo dice, y si el colchón solo tiene la suya,
 * la da como piso.
 */
export function sommierAnswer(size: SommierSize | null, generatedAt: string | null): string {
  const date = sommierDate(generatedAt)
  const label = size?.short ?? '2 plazas'
  if (size?.band) {
    const { band } = size
    const p90 = size.analysis.p90
    const top =
      p90 !== null && p90 > band.p75
        ? ` Pagar más de ${sommierMoney(p90)} es pagar más que nueve de cada diez avisos de la misma medida.`
        : ''
    return (
      `Un sommier de ${label} nuevo, con su colchón, cuesta hoy ${sommierMoney(band.median)} en mediana, ` +
      `y la mitad de los avisos pide entre ${sommierMoney(band.p25)} y ${sommierMoney(band.p75)}.` +
      top +
      ` Medido sobre ${band.n} avisos de tiendas uruguayas y Mercado Libre${date ? ` el ${date}` : ''}.`
    )
  }
  if (size?.colchonBand) {
    return (
      `Todavía no reunimos avisos suficientes de sommier de ${label} para publicar una mediana. ` +
      `El colchón solo de esa medida cuesta hoy ${sommierMoney(size.colchonBand.median)} en mediana: ` +
      `un sommier, que es ese colchón más la base, no baja de ahí.`
    )
  }
  return `Todavía no reunimos avisos suficientes de sommier de ${label} para publicar una mediana. La página se completa sola con la próxima lectura de tiendas y Mercado Libre.`
}

/**
 * Las preguntas frecuentes, con las cifras de la medida que se pregunta (2 plazas). Cada respuesta
 * con un número dice de dónde sale; sin muestra, la respuesta lo dice en vez de callarlo.
 */
export function sommierFaq(size: SommierSize | null, generatedAt: string | null): FaqItem[] {
  const date = sommierDate(generatedAt)
  const when = date ? ` (relevado el ${date})` : ''
  const label = size?.short ?? '2 plazas'
  const band = size?.band ?? null
  const analysis = size?.analysis ?? null
  const items: FaqItem[] = []

  items.push({
    id: 'cuanto-sale',
    question: `¿Cuánto sale un sommier de ${label} en Uruguay?`,
    answer: band
      ? `La mediana de los sommiers nuevos de ${label} con colchón es ${sommierMoney(band.median)}, y la mitad de los avisos está entre ${sommierMoney(band.p25)} y ${sommierMoney(band.p75)}${when}. Son ${band.n} avisos de tiendas uruguayas y Mercado Libre.`
      : `Todavía no reunimos avisos suficientes de sommier de ${label} para publicar una mediana. La cifra aparece sola cuando la cosecha diaria los junta.`,
  })

  const p90 = analysis?.p90 ?? null
  items.push({
    id: 'cuanto-gastar',
    question: '¿Cuánto conviene gastar en un sommier?',
    answer: band
      ? `Lo razonable es la mitad del medio del mercado: entre ${sommierMoney(band.p25)} y ${sommierMoney(band.p75)} para ${label}. Pagar más es inversión mientras compre algo que puedas nombrar y comprobar en el aviso (el tipo de resorte, la densidad de la espuma, la garantía por escrito)${p90 !== null && p90 > band.p75 ? `; por encima de ${sommierMoney(p90)} estás pagando más que nueve de cada diez avisos, y conviene saber exactamente por qué` : ''}.`
      : 'Lo razonable es la mitad del medio del mercado de tu medida. Pagar más es inversión mientras compre algo que puedas nombrar y comprobar en el aviso: el tipo de resorte, la densidad de la espuma, la garantía por escrito.',
  })

  const premium = sommierBasePremium(size)
  items.push({
    id: 'vs-colchon',
    question: '¿Cuánto más caro es un sommier que un colchón solo?',
    answer: premium
      ? `En ${label}, la mediana del conjunto con base es ${sommierMoney(size!.band!.median)} y la del colchón solo ${sommierMoney(size!.colchonBand!.median)}: la base suma ${sommierMoney(premium.diff)} en mediana, un ${premium.pct} % más${when}. Son medianas de dos grupos de avisos distintos, no el precio de una base suelta.`
      : `Hoy no tenemos las dos medianas de ${label} (conjunto y colchón solo) como para compararlas. Lo que se siente al dormir es el colchón; la base le da altura y un apoyo parejo.`,
  })

  const tachado = analysis?.tachado ?? null
  items.push({
    id: 'tachado',
    question: '¿El precio tachado de un sommier es real?',
    answer: tachado
      ? `De ${tachado.total} sommiers nuevos de ${label}, ${tachado.withList} muestran un precio tachado, con un descuento declarado de ${tachado.medianOffPct} % en mediana${tachado.listAboveP90 !== null && p90 !== null ? `, y ${tachado.listAboveP90} de esos tachan un precio por encima de ${sommierMoney(p90)}, que es más de lo que piden nueve de cada diez avisos de la misma medida` : ''}. Lo que sirve para comparar es lo que cobra el mercado hoy, no el número tachado.`
      : 'Lo que sirve para comparar es lo que cobra el mercado hoy por la misma medida, no el número tachado: un "antes" que nadie cobró no es un descuento.',
  })

  const orto = analysis?.ortopedico ?? null
  items.push({
    id: 'ortopedico',
    question: '¿Un sommier «ortopédico» vale lo que cuesta de más?',
    answer: orto
      ? `Los ${orto.n} avisos de ${label} que se presentan como ortopédicos, terapéuticos o posturales piden ${sommierMoney(orto.median)} en mediana, contra ${sommierMoney(orto.otherMedian)} de los otros ${orto.otherN} (${orto.premiumPct >= 0 ? `${orto.premiumPct} % más` : `${Math.abs(orto.premiumPct)} % menos`}). La palabra no dice qué tiene adentro: preguntá el tipo y la cantidad de resortes, o la densidad de la espuma.`
      : 'La palabra no dice qué tiene adentro. Preguntá el tipo y la cantidad de resortes, o la densidad de la espuma, y compará con otros de la misma medida que digan lo mismo.',
  })

  items.push({
    id: 'usado',
    question: '¿Conviene comprar un sommier usado?',
    answer:
      'No: el conjunto trae colchón, y un colchón usado es lo que no se recomienda (chinches, ácaros y un hundimiento que no se ve hasta que dormís encima). La base sola usada es otra compra.',
  })

  items.push({
    id: 'medidas',
    question: '¿Qué medida tiene un sommier de 2 plazas?',
    answer:
      'La habitual es 140 × 190 cm, la misma del colchón de 2 plazas; queen es 160 × 200 cm y king 200 × 200 cm. Confirmá la de tu dormitorio, y que el aviso diga si el precio incluye la base y el colchón.',
  })

  return items
}
