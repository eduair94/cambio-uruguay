// El tablero de precios con motivo: /autos-chocados-y-con-deuda-uruguay.
//
// Todo lo que se afirma acá de un auto lo afirma su propio aviso, y se publica con la cita al lado.
// El sitio no dictamina que un auto esté chocado ni que tenga deuda: muestra dónde lo dice el
// vendedor y cuánto menos pide que los mismos autos que no dicen nada.
import type {
  PublicCarRiskCategory,
  PublicCarRiskItem,
  PublicCarRiskSeverity,
  PublicCarRiskSnapshot,
} from './carsPublic'

export const CAR_RISKS_PATH = '/autos-chocados-y-con-deuda-uruguay'
export const CAR_RISKS_PER_PAGE = 20
/** Un aviso que nadie vuelve a ver en cuatro días sale del tablero aunque el job no haya corrido. */
export const CAR_RISK_FRESH_DAYS = 4

export const CAR_RISK_CATEGORIES: readonly PublicCarRiskCategory[] = [
  'deuda',
  'papeles',
  'siniestro',
  'recupero',
  'mecanica',
  'chapa_extranjera',
  'uso_intensivo',
]

export interface CarRiskGuideEntry {
  label: string
  /** Qué implica para quien compra, en una línea. */
  meaning: string
  /** Qué hay que pedir antes de señar. */
  check: string
}

/**
 * Lo verificable de cada categoría. Las dos fuentes citadas se abrieron el 2026-09-18:
 * sucive.gub.uy (consulta de deuda y certificado) y la Dirección General de Registros del MEC.
 */
export const CAR_RISK_GUIDE: Record<PublicCarRiskCategory, CarRiskGuideEntry> = {
  deuda: {
    label: 'Deuda, prenda o embargo',
    meaning:
      'La patente impaga va con el vehículo, no con la persona: la hereda quien lo compra. Una prenda o un embargo bloquean la transferencia hasta que se levanten.',
    check:
      'Pedí el certificado del SUCIVE con la matrícula y, antes de señar, el certificado registral que pide la escribanía en la Dirección General de Registros.',
  },
  papeles: {
    label: 'Falta un papel para transferir',
    meaning:
      'Con libreta pero sin título no se puede transferir; con matrículas entregadas hay que reempadronar antes de volver a circular; una sucesión sin terminar no vende.',
    check:
      'Pedí título y libreta a nombre de quien vende. Si es sucesión, el certificado de resultancias de autos; si las matrículas están entregadas, preguntá en qué intendencia y cuánto sale reempadronar.',
  },
  siniestro: {
    label: 'Chocado, granizado o inundado',
    meaning:
      'El precio ya tiene adentro una reparación que todavía no se hizo, y no todos los daños se ven en las fotos.',
    check:
      'Llevalo a un taller de confianza antes de señar: chasis, airbags y si el número de chasis y motor coinciden con los papeles.',
  },
  recupero: {
    label: 'Recuperado de seguro',
    meaning:
      'Viene de un siniestro o de un robo que la aseguradora dio por perdido y después vendió. Es legal, y es otro mercado.',
    check:
      'Preguntá al seguro y al banco antes de comprar: no todos aceptan asegurar o financiar un auto con ese historial.',
  },
  mecanica: {
    label: 'No anda o se vende por partes',
    meaning: 'No es un auto usado barato: es un auto que hoy no circula, o directamente repuestos.',
    check:
      'Sacá la cuenta del arreglo con un mecánico antes de ofertar, y confirmá que se pueda transferir igual.',
  },
  chapa_extranjera: {
    label: 'Chapa extranjera',
    meaning:
      'Un auto empadronado afuera no circula acá como uno uruguayo: hay que importarlo y empadronarlo, y eso cuesta.',
    check: 'Averiguá el costo del trámite completo antes de mirar el precio del aviso.',
  },
  uso_intensivo: {
    label: 'Ex taxi, remise o flota',
    meaning:
      'Mismo año y kilómetros parecidos, pero un uso mucho más duro: motor, embrague y suspensión trabajaron el doble.',
    check: 'Pedí el historial de service y revisá tren delantero, embrague y caja con un mecánico.',
  },
}

export const CAR_RISK_SEVERITY_LABELS: Record<PublicCarRiskSeverity, string> = {
  alta: 'Cambia lo que estás comprando',
  media: 'Para tener en cuenta',
}

export interface CarRiskQuery {
  category: PublicCarRiskCategory | ''
  brand: string
  priceMax: number | null
  /** Sólo los que tienen descuento medido contra la cohorte limpia. */
  measured: boolean
  page: number
}

export interface CarRiskFacet {
  slug: string
  name: string
  count: number
}

export interface CarRisksResponse {
  generatedAt: string
  usdUyu: number
  stats: PublicCarRiskSnapshot['stats']
  categories: PublicCarRiskSnapshot['categories']
  total: number
  page: number
  perPage: number
  items: PublicCarRiskItem[]
  brands: CarRiskFacet[]
}

const integer = (value: unknown, min: number, max: number): number | null => {
  const parsed = Number(String(value ?? '').replace(/\D/g, ''))
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null
  return Math.trunc(parsed)
}

const slug = (value: unknown): string =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 40)

export function normalizeCarRiskQuery(input: Record<string, unknown>): CarRiskQuery {
  const category = CAR_RISK_CATEGORIES.find(name => name === input.category)
  return {
    category: category ?? '',
    brand: slug(input.brand),
    priceMax: integer(input.priceMax, 500, 500_000),
    measured: input.measured === '1' || input.measured === true || input.measured === 'true',
    page: integer(input.page, 1, 200) ?? 1,
  }
}

export function carRiskQueryParams(query: CarRiskQuery): Record<string, string> {
  const params: Record<string, string> = {}
  if (query.category) params.category = query.category
  if (query.brand) params.brand = query.brand
  if (query.priceMax) params.priceMax = String(query.priceMax)
  if (query.measured) params.measured = '1'
  if (query.page > 1) params.page = String(query.page)
  return params
}

export function queryCarRisks(
  snapshot: PublicCarRiskSnapshot,
  input: Record<string, unknown>,
  now = new Date()
): CarRisksResponse {
  const query = normalizeCarRiskQuery(input)
  const cutoff = now.getTime() - CAR_RISK_FRESH_DAYS * 86_400_000
  // Igual que en oportunidades: la API retira lo viejo sola, para que un job caído no deje
  // publicados avisos que ya no existen.
  const fresh = snapshot.items.filter(entry => Date.parse(entry.subject.lastSeen) >= cutoff)
  const brands = new Map<string, CarRiskFacet>()
  for (const entry of fresh) {
    const facet = brands.get(entry.subject.brandSlug) ?? {
      slug: entry.subject.brandSlug,
      name: entry.subject.brand,
      count: 0,
    }
    facet.count++
    brands.set(facet.slug, facet)
  }
  const filtered = fresh
    .filter(entry => !query.category || entry.risks.some(risk => risk.category === query.category))
    .filter(entry => !query.brand || entry.subject.brandSlug === query.brand)
    .filter(entry => query.priceMax === null || entry.subject.priceUsd <= query.priceMax)
    .filter(entry => !query.measured || entry.gap !== null)
    .sort(
      (a, b) =>
        (b.gap ?? -1) - (a.gap ?? -1) ||
        (a.severity === b.severity ? 0 : a.severity === 'alta' ? -1 : 1) ||
        a.subject.key.localeCompare(b.subject.key)
    )
  const start = (query.page - 1) * CAR_RISKS_PER_PAGE
  return {
    generatedAt: snapshot.generatedAt,
    usdUyu: snapshot.usdUyu,
    stats: snapshot.stats,
    categories: snapshot.categories,
    total: filtered.length,
    page: query.page,
    perPage: CAR_RISKS_PER_PAGE,
    items: filtered.slice(start, start + CAR_RISKS_PER_PAGE),
    brands: [...brands.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  }
}

/**
 * "23 % más barato" / "2 % más caro", nunca un número cuando no se pudo medir.
 *
 * La primera versión escribía `−${gap}` dando por hecho que declarar algo abarata. No siempre: los
 * avisos que declaran papeles pendientes piden ~2 % MÁS que los que no declaran nada, y el signo
 * fijo imprimía "−-2 %" en la página.
 */
export const formatCarRiskGap = (gap: number | null): string => {
  if (gap === null) return 'sin comparables'
  const percent = Math.round(Math.abs(gap) * 100)
  if (percent === 0) return 'igual precio'
  return gap > 0 ? `${percent} % más barato` : `${percent} % más caro`
}

/** El 50 % central de la categoría, y si cruza el cero la diferencia no es clara. */
export const formatCarRiskRange = (p25: number | null, p75: number | null): string => {
  if (p25 === null || p75 === null) return 'sin comparables'
  if (p25 <= 0 && p75 >= 0) return 'sin diferencia clara'
  const direction = p25 > 0 ? 'más barato' : 'más caro'
  const low = Math.round(Math.abs(p25) * 100)
  const high = Math.round(Math.abs(p75) * 100)
  return `de ${Math.min(low, high)} % a ${Math.max(low, high)} % ${direction}`
}
