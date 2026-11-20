// app/utils/carsDirectorySummary.ts
// El mercado en números dentro del directorio /autos-usados-uruguay.
//
// No calcula ninguna mediana: resume el informe que /mercado-de-autos-usados-uruguay ya publica
// (GET /api/car-report, `carreportsnapshots`, armado por classes/autos/report.ts). Si el directorio
// recalculara sus propias medianas sobre el catálogo, el sitio publicaría dos precios medianos del
// mismo mercado. La base del informe son los avisos publicados en DÓLARES: quedan afuera los avisos en
// pesos y los de moneda deducida, y el texto lo dice cada vez que da un número.
//
// Puro (sin Vue, sin I/O, sin Date.now ni toLocaleString): el resumen viaja en el payload de SSR y
// el navegador tiene que escribir exactamente lo mismo que el servidor.
import {
  CAR_BODY_LABELS,
  CAR_BODY_TYPES,
  CAR_DEPARTMENTS,
  carMarketSlugValid,
  formatCarDate,
  formatCarUsd,
  type CarFacet,
  type CarsResponse,
} from './cars'
import { CAR_BUDGET_MIN_MODELS, parseCarBudget, type CarBudget } from './carBudget'
import { carReportPercent, type CarReportResponse } from './carsReport'
import type { PublicCarBodyType } from './carsPublic'
import type { FaqItem } from './faqAnswers'

/** Con menos avisos que esto el informe no describe el mercado y el bloque no se dibuja. */
export const CARS_DIRECTORY_MIN_ADVERTS = 1000
/** Un informe más viejo que esto contra el catálogo que se está mostrando no se publica al lado. */
export const CARS_DIRECTORY_STALE_DAYS = 3
/** La primera franja del informe (classes/autos/report.ts, `PRICE_BANDS`): menos de US$ 5.000. */
export const CARS_DIRECTORY_CHEAP_USD = 5000

const DAY_MS = 86_400_000

export interface CarsDirectoryBand {
  /** Franja semiabierta del informe: desde `from` inclusive hasta `to` exclusive. */
  from: number
  to: number | null
  adverts: number
  share: number
}

export interface CarsDirectoryBudget {
  maxUsd: CarBudget
  /** Avisos entre el 80 % y el 100 % del tope. */
  adverts: number
  /** El modelo con más avisos de esa franja; null si ningún modelo llega a 8. */
  top: { name: string; medianYear: number } | null
  /** La página del presupuesto es indexable (mismo umbral que `hasta-[monto]-dolares.vue`). */
  hasPage: boolean
}

export interface CarsDirectoryBrand {
  slug: string
  name: string
  adverts: number
  share: number
  medianUsd: number
  medianYear: number
}

export interface CarsDirectorySummary {
  generatedAt: string
  adverts: number
  brands: number
  price: { p25: number; median: number; p75: number }
  yearMedian: number | null
  kmMedian: number | null
  bands: CarsDirectoryBand[]
  budgets: CarsDirectoryBudget[]
  brandsTop: CarsDirectoryBrand[]
  models: Array<{ name: string; adverts: number; medianUsd: number }>
  departments: Array<{ name: string; adverts: number; share: number }>
  /** null cuando el informe no trae el reparto por vendedor: un cero sería un número inventado. */
  dealerShare: number | null
  privateShare: number | null
  sellerGap: number | null
  negotiation: {
    windowDays: number
    changed: number
    cut: number
    raised: number
    medianCut: number
    /** Avisos que cambiaron de precio sobre todos los guardados (classes/autos/report.ts). */
    shareOfMarket: number | null
  } | null
}

const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const timeOf = (iso: unknown): number | null => {
  if (typeof iso !== 'string') return null
  const time = Date.parse(iso)
  return Number.isNaN(time) ? null : time
}

/** Franjas en orden y pegadas una a la otra; si no, no hay tabla (una franja de menos miente). */
function bandsOf(
  raw: CarReportResponse['data']['market']['priceBands'],
  total: number
): CarsDirectoryBand[] {
  if (!Array.isArray(raw) || raw.length < 2) return []
  for (let i = 0; i < raw.length; i++) {
    const band = raw[i]!
    const to = band.to
    if (!finite(band.from) || band.from < 0 || !finite(band.adverts) || band.adverts < 0) return []
    if (to !== null && !(finite(to) && to > band.from)) return []
    // Sólo la última puede quedar abierta, y cada una termina donde empieza la siguiente.
    if (i < raw.length - 1 && to !== raw[i + 1]!.from) return []
  }
  return raw.map(band => ({
    from: band.from,
    to: band.to,
    adverts: band.adverts,
    share: band.adverts / total,
  }))
}

/** El resumen que el directorio publica, o null si el informe no alcanza para decir nada. */
export function carsDirectorySummary(
  report: CarReportResponse | null | undefined
): CarsDirectorySummary | null {
  const data = report?.data
  const market = data?.market
  if (!report || !market || timeOf(report.generatedAt) === null) return null
  const adverts = market.adverts
  if (!finite(adverts) || adverts < CARS_DIRECTORY_MIN_ADVERTS) return null
  const p25: unknown = market.price?.p25
  const median: unknown = market.price?.median
  const p75: unknown = market.price?.p75
  if (!finite(p25) || !finite(median) || !finite(p75)) return null
  if (!(p25 > 0 && p25 <= median && median <= p75)) return null

  const budgets: CarsDirectoryBudget[] = []
  for (const tier of data.budgets ?? []) {
    const maxUsd = parseCarBudget(String(tier.maxUsd))
    if (maxUsd === null || !finite(tier.adverts)) continue
    const models = [...(tier.models ?? [])].sort((a, b) => b.adverts - a.adverts)
    const first = models[0]
    budgets.push({
      maxUsd,
      adverts: tier.adverts,
      top: first ? { name: `${first.brand} ${first.model}`, medianYear: first.medianYear } : null,
      hasPage: models.length >= CAR_BUDGET_MIN_MODELS,
    })
  }

  const negotiation = data.negotiation
  // La rotación del informe (`rotation`) NO se resume: es la vida mediana de los avisos que ya
  // salieron, dentro de una serie de semanas, y deja afuera a los que siguen publicados, que son
  // los que más duran. Publicada como "cuánto tarda en venderse" diría menos de lo que tarda.
  const sellers = market.sellers
  const sellerShare = (value: unknown): number | null =>
    sellers && finite(value) && value >= 0 ? value / adverts : null

  return {
    generatedAt: report.generatedAt,
    adverts,
    brands: market.brands,
    price: { p25, median, p75 },
    yearMedian: finite(market.year?.median) ? market.year.median : null,
    kmMedian: market.km && finite(market.km.median) ? market.km.median : null,
    bands: bandsOf(market.priceBands, adverts),
    budgets,
    brandsTop: (data.brands ?? [])
      .filter(brand => typeof brand.slug === 'string' && carMarketSlugValid(brand.slug))
      .slice(0, 10)
      .map(brand => ({
        slug: brand.slug,
        name: brand.name,
        adverts: brand.adverts,
        share: brand.share,
        medianUsd: brand.medianUsd,
        medianYear: brand.medianYear,
      })),
    models: (data.models ?? []).slice(0, 3).map(model => ({
      name: `${model.brand} ${model.model}`,
      adverts: model.adverts,
      medianUsd: model.price.median,
    })),
    departments: (market.departments ?? [])
      .filter(entry => CAR_DEPARTMENTS.includes(entry.department))
      .slice(0, 6)
      .map(entry => ({
        name: entry.department,
        adverts: entry.adverts,
        share: entry.adverts / adverts,
      })),
    dealerShare: sellerShare(sellers?.dealer),
    privateShare: sellerShare(sellers?.private),
    sellerGap: finite(data.sellerGaps?.median) ? data.sellerGaps.median : null,
    // Mismo umbral que el informe (`carReportFindings`): con menos de 50 cambios no hay tendencia.
    negotiation:
      negotiation && negotiation.changed >= 50 && finite(negotiation.medianCut)
        ? {
            windowDays: negotiation.windowDays,
            changed: negotiation.changed,
            cut: negotiation.cut,
            raised: negotiation.raised,
            medianCut: negotiation.medianCut,
            shareOfMarket: finite(negotiation.shareOfMarket) ? negotiation.shareOfMarket : null,
          }
        : null,
  }
}

/**
 * El informe sólo se publica al lado de un catálogo de la misma época: las dos fechas salen del
 * payload, así que el servidor y el navegador deciden lo mismo.
 */
export function carsDirectoryFresh(
  summary: CarsDirectorySummary | null | undefined,
  catalogGeneratedAt: string | null | undefined
): boolean {
  const report = timeOf(summary?.generatedAt)
  const catalog = timeOf(catalogGeneratedAt)
  if (report === null || catalog === null) return false
  return catalog - report <= CARS_DIRECTORY_STALE_DAYS * DAY_MS
}

/** "3.087": agrupado a mano, porque es-UY no agrupa los números de cuatro cifras en todo motor. */
export const carsDirectoryCount = (value: number): string =>
  Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')

/** La franja como la lee quien busca: los topes son exclusivos, así que se escribe uno menos. */
export function carsDirectoryBandLabel(band: Pick<CarsDirectoryBand, 'from' | 'to'>): string {
  if (band.to === null) return `${formatCarUsd(band.from)} o más`
  if (band.from === 0) return `menos de ${formatCarUsd(band.to)}`
  return `${formatCarUsd(band.from)} a ${formatCarUsd(band.to - 1)}`
}

/** Los mismos topes, como filtros del buscador (que compara con `>=` y `<=`). */
export function carsDirectoryBandParams(
  band: Pick<CarsDirectoryBand, 'from' | 'to'>
): Record<string, string> {
  const params: Record<string, string> = {}
  if (band.from > 0) params.priceMin = String(band.from)
  if (band.to !== null) params.priceMax = String(band.to - 1)
  return params
}

export const carsDirectoryLead = (summary: CarsDirectorySummary): string =>
  `En los avisos publicados en dólares el precio mediano pedido es ${formatCarUsd(summary.price.median)}, y la mitad pide entre ${formatCarUsd(summary.price.p25)} y ${formatCarUsd(summary.price.p75)}.`

/** "La mitad de los publicados es modelo 2018 o más nuevo y …"; vacío sin año mediano. */
export function carsDirectoryProfile(summary: CarsDirectorySummary): string {
  if (summary.yearMedian === null) return ''
  const km =
    summary.kmMedian === null
      ? ''
      : ` y la mitad de los que informan los kilómetros declara menos de ${carsDirectoryCount(summary.kmMedian)} km`
  return `La mitad de los publicados es modelo ${summary.yearMedian} o más nuevo${km}.`
}

export function carsDirectoryBudgetLine(tier: CarsDirectoryBudget): string {
  const head = `${carsDirectoryCount(tier.adverts)} avisos entre ${formatCarUsd(tier.maxUsd * 0.8)} y ${formatCarUsd(tier.maxUsd)}.`
  return tier.top
    ? `${head} El modelo con más avisos en esa franja es ${tier.top.name}, con año mediano ${tier.top.medianYear}.`
    : head
}

/** Los atajos de departamento y carrocería: sólo valores que el buscador acepta como filtro. */
export function carsDirectoryBrowse(
  facets: Pick<CarsResponse['facets'], 'departments' | 'bodies'> | null | undefined
): { departments: CarFacet[]; bodies: Array<CarFacet & { slug: PublicCarBodyType }> } | null {
  if (!facets) return null
  const departments = (facets.departments ?? []).filter(
    facet => facet.count > 0 && CAR_DEPARTMENTS.includes(facet.slug)
  )
  const bodies = (facets.bodies ?? [])
    .filter(
      (facet): facet is CarFacet & { slug: PublicCarBodyType } =>
        facet.count > 0 && (CAR_BODY_TYPES as readonly string[]).includes(facet.slug)
    )
    .map(facet => ({ ...facet, name: CAR_BODY_LABELS[facet.slug] }))
  return departments.length || bodies.length ? { departments, bodies } : null
}

/** "A, B y C". */
function joined(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`
}

type Coverage = Pick<CarsResponse['coverage'], 'listings' | 'sources'>

/**
 * Las preguntas frecuentes del directorio. Las PREGUNTAS son fijas (el FAQPage se identifica por
 * ellas y no puede cambiar de un día al otro); las respuestas llevan los números del informe, y una
 * pregunta cuya medición falta no se publica.
 */
export function carsDirectoryFaq(
  summary: CarsDirectorySummary | null | undefined,
  coverage: Coverage | null | undefined
): FaqItem[] {
  if (!summary) return []
  const usd = formatCarUsd
  const count = carsDirectoryCount
  const items: FaqItem[] = []

  items.push({
    id: 'autos-precio-tipico',
    question: '¿Cuánto sale un auto usado en Uruguay?',
    answer: `El precio mediano pedido es ${usd(summary.price.median)} y la mitad de los avisos pide entre ${usd(summary.price.p25)} y ${usd(summary.price.p75)}. Sale de ${count(summary.adverts)} avisos publicados en dólares, medidos el ${formatCarDate(summary.generatedAt)}. Son precios pedidos en avisos, no precios de venta cerrados.`,
  })

  const [cheap, next] = summary.bands
  if (cheap && next && cheap.from === 0 && cheap.to === CARS_DIRECTORY_CHEAP_USD) {
    items.push({
      id: 'autos-menos-de',
      question: `¿Cuántos autos usados hay por menos de ${usd(CARS_DIRECTORY_CHEAP_USD)}?`,
      answer: `${count(cheap.adverts)} avisos publicados en dólares piden menos de ${usd(CARS_DIRECTORY_CHEAP_USD)} (${carReportPercent(cheap.share, 1)} del total) y ${count(next.adverts)} piden de ${carsDirectoryBandLabel(next)}. Contando los publicados en pesos y los de Facebook con la moneda estimada hay más: el buscador los pasa a dólares para filtrar por precio.`,
    })
  }

  const withTop = summary.budgets.filter(tier => tier.top)
  if (withTop.length >= 2) {
    const lines = withTop.map(
      tier => `con ${usd(tier.maxUsd)}, ${tier.top!.name} ${tier.top!.medianYear}`
    )
    const sentence = lines.join('; ')
    items.push({
      id: 'autos-presupuesto',
      question: '¿Qué auto usado se compra con cada presupuesto?',
      answer: `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}. Es el modelo con más avisos entre el 80 % y el 100 % de cada presupuesto, con el año mediano de esos avisos.`,
    })
  }

  if (summary.models.length) {
    const [first, ...rest] = summary.models
    const parts = [
      `${first!.name} (${count(first!.adverts)} avisos, mediana ${usd(first!.medianUsd)})`,
      ...rest.map(model => `${model.name} (${count(model.adverts)}, ${usd(model.medianUsd)})`),
    ]
    items.push({
      id: 'autos-modelos',
      question: '¿Cuáles son los autos usados con más avisos en Uruguay?',
      answer: `${joined(parts)}. Es oferta medida en avisos: en Uruguay las transferencias de usados no se publican por modelo.`,
    })
  }

  if (summary.departments.length >= 3) {
    const lead = summary.departments.slice(0, 3)
    const after = summary.departments.slice(3).map(entry => entry.name)
    const shares = lead.map(
      (entry, index) =>
        `el ${carReportPercent(entry.share)} ${index === 0 ? 'está en' : 'en'} ${entry.name}`
    )
    items.push({
      id: 'autos-departamentos',
      question: '¿En qué departamentos hay más autos usados en venta?',
      answer: `De los avisos publicados en dólares, ${joined(shares)}.${after.length ? ` Después vienen ${joined(after)}.` : ''}`,
    })
  }

  const sources = [...(coverage?.sources ?? [])]
    .filter(source => source.listings > 0)
    .sort((a, b) => b.listings - a.listings)
  if (coverage && sources.length >= 2) {
    const [a, b, ...rest] = sources
    const tail = rest.length
      ? ` El resto se reparte entre ${joined(rest.map(source => `${source.name} (${count(source.listings)})`))}.`
      : ''
    items.push({
      id: 'autos-fuentes',
      question: '¿Dónde se publican los autos usados en Uruguay?',
      answer: `De los ${count(coverage.listings)} avisos vigentes que leemos, ${count(a!.listings)} están en ${a!.name} y ${count(b!.listings)} en ${b!.name}.${tail} El mismo auto publicado en más de una fuente se muestra una sola vez.`,
    })
  }

  if (summary.sellerGap !== null) {
    const more = summary.sellerGap >= 0
    const split =
      summary.dealerShare !== null && summary.privateShare !== null
        ? ` De los avisos publicados en dólares, el ${carReportPercent(summary.dealerShare)} es de automotoras y el ${carReportPercent(summary.privateShare)}, de dueños.`
        : ''
    items.push({
      id: 'autos-automotora-o-dueno',
      question: '¿Sale más caro comprarle a una automotora que a un dueño?',
      answer: `Por el mismo modelo y año, una automotora pide ${carReportPercent(Math.abs(summary.sellerGap), 1)} ${more ? 'más' : 'menos'} que un dueño.${split}`,
    })
  }

  const negotiation = summary.negotiation
  if (negotiation) {
    const share =
      negotiation.shareOfMarket !== null && negotiation.shareOfMarket > 0
        ? `, el ${carReportPercent(negotiation.shareOfMarket, 1)} de los publicados`
        : ''
    items.push({
      id: 'autos-bajas-de-precio',
      question: '¿Cuánto bajan de precio los autos usados publicados?',
      answer: `En los últimos ${negotiation.windowDays} días ${count(negotiation.changed)} avisos cambiaron de precio${share}: ${count(negotiation.cut)} bajaron y ${count(negotiation.raised)} subieron. Los que bajaron recortaron ${carReportPercent(negotiation.medianCut, 1)} en la mediana. Son cambios que vimos entre dos lecturas nuestras, no rebajas que el aviso dice tener.`,
    })
  }

  return items
}
