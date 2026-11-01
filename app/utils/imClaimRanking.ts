/**
 * El ranking de barrios de Montevideo por RECLAMOS registrados en la Intendencia —alumbrado,
 * saneamiento y limpieza—, armado desde el mismo libro que ya alimenta las barras de barrio del
 * directorio de alquileres.
 *
 * Por qué una página y no una barra más dentro de una tarjeta: la Intendencia publica su Sistema
 * Único de Reclamos como un volcado de datos abiertos —1,7 millones de filas, un ZIP de 44 MB con
 * un CSV de 300 MB adentro— y no publica ninguna tabla por barrio. El dato existe y no se puede
 * leer: la pregunta de quien está eligiendo dónde vivir, o de quien va a reclamar una luz quemada y
 * quiere saber si en su zona eso pasa seguido, no tiene respuesta publicada en ninguna parte. El
 * backend ya baja ese volcado, lo agrega por barrio INE y lo guarda; esta página saca a la
 * superficie, con su propia URL, lo que hoy sólo se ve como tres barras dentro de una tarjeta del
 * directorio de alquileres. Es la tercera de la serie: `/cortes-de-luz-por-barrio-uruguay` hace lo
 * mismo con el mapa de UTE y `/cortes-de-agua-por-barrio-uruguay` con los avisos de OSE.
 *
 * Cinco reglas que este módulo no negocia, porque son las que hacen honesta a la página:
 *
 *  1. SON RECLAMOS REGISTRADOS, NO PROBLEMAS. El número dice cuántas veces alguien levantó el
 *     teléfono o entró a la web de la Intendencia, no cuántas luces hay apagadas. Un barrio que
 *     reclama más puede ser un barrio más organizado, y uno sin reclamos puede ser uno que ya no
 *     espera respuesta. La dirección de la diferencia no se puede afirmar desde este dato y la
 *     página lo dice en vez de insinuar un ranking de calidad.
 *  2. EL DENOMINADOR SON CLIENTES DE UTE, NO HABITANTES. La tasa es por cada 1.000 suministros
 *     eléctricos del mismo barrio INE, que es el único denominador por barrio que se publica con
 *     la frecuencia necesaria. No es por hogar ni por persona: un barrio con muchos locales
 *     comerciales tiene más suministros que vecinos.
 *  3. LAS TRES FAMILIAS NO SE SUMAN. Alumbrado, saneamiento y limpieza son tres servicios
 *     distintos con tres públicos distintos; un total «de reclamos» mezclaría una boca de tormenta
 *     tapada con un contenedor quemado. Cada familia tiene su propia tabla y su propia mediana.
 *  4. ES MONTEVIDEO. El Sistema Único de Reclamos es de la Intendencia de Montevideo, así que las
 *     zonas son los barrios INE de Montevideo y ninguna otra. Las otras dieciocho intendencias no
 *     publican un volcado equivalente.
 *  5. AUSENCIA NO ES CERO. Un barrio sin fila en una familia no entra con 0 reclamos: no entra.
 *
 * Y una cosa que queda deliberadamente afuera: los reclamos de CALLES (viales), que el backend
 * también agrega. No entran al ranking del directorio —«a weak, noisy signal for a renter»— y
 * tampoco acá: el endpoint no los publica y esta página no inventa una cuarta tabla.
 */
import type { RentalZoneScores, RentalZoneScoreAttribute } from './rentalZoneTypes'
import { IM_CLAIMS_URL } from './rentalZoneServices'
import { formatOutageDay } from './powerOutageRanking'
import { monthsBetween } from './waterCutRanking'

/** What Google publishes of a meta description before cutting; the same 155 the budget test uses. */
const SNIPPET_LIMIT = 155
/** Lo que entra en el `<title>` del SERP contando la marca, el mismo 60 de `seoTitleBudget`. */
const TITLE_LIMIT = 60
const BRAND_SUFFIX = ' | Cambio Uruguay'

export interface ImClaimSource {
  label: string
  url: string
}

export const IM_CLAIM_SOURCES: readonly ImClaimSource[] = [
  {
    label:
      'Intendencia de Montevideo — Reclamos registrados en el Sistema Único de Reclamos (datos abiertos)',
    url: IM_CLAIMS_URL,
  },
]

/** Las tres familias que el endpoint publica, en el orden en que la página las muestra. */
export type ImClaimFamilyId = Extract<
  RentalZoneScoreAttribute,
  'alumbrado' | 'saneamiento' | 'limpieza'
>

export interface ImClaimFamilyDef {
  id: ImClaimFamilyId
  /** Cómo se nombra en un encabezado. */
  label: string
  /** Qué reclamo entra en esta familia, en una línea. */
  blurb: string
  icon: string
}

export const IM_CLAIM_FAMILIES: readonly ImClaimFamilyDef[] = [
  {
    id: 'alumbrado',
    label: 'Alumbrado',
    blurb: 'Luminarias apagadas, intermitentes o rotas en la vía pública.',
    icon: 'mdi-lightbulb-outline',
  },
  {
    id: 'saneamiento',
    label: 'Saneamiento',
    blurb: 'Bocas de tormenta, colectores y desagües del área de Saneamiento.',
    icon: 'mdi-pipe-disconnected',
  },
  {
    id: 'limpieza',
    label: 'Limpieza',
    blurb: 'Problemas de limpieza y estado de los contenedores de residuos.',
    icon: 'mdi-trash-can-outline',
  },
]

export interface ImClaimRow {
  id: string
  name: string
  /** Reclamos de esta familia cada 1.000 clientes de UTE del mismo barrio, en la ventana medida. */
  rate: number
  /** Share of the other measured barrios that fare worse (1 = the one with fewest claims). */
  betterThan: number
}

export interface ImClaimFamily extends ImClaimFamilyDef {
  rows: ImClaimRow[]
  median: number
  /** El barrio con más reclamos de la familia. */
  worst: ImClaimRow
  /** El barrio con menos. */
  best: ImClaimRow
}

export interface ImClaimRanking {
  generatedAt: string
  periodFrom: string
  periodTo: string
  /** Meses que abarca la ventana. Nunca un literal: sale de las dos fechas del propio libro. */
  periodMonths: number
  /** Las familias con dato publicable, en el orden del registro. */
  families: ImClaimFamily[]
  /** Barrios con dato en al menos una familia. */
  barrios: number
}

/**
 * Una tasa como la escribe un lector uruguayo: `96.9` -> `96,9`, `12` -> `12`.
 *
 * Un decimal y no dos: la tasa sale de un conteo de doce meses sobre un padrón de suministros, y el
 * segundo decimal sugiere una precisión que el denominador no tiene.
 */
export function formatClaimRate(rate: number): string {
  if (!Number.isFinite(rate) || rate < 0) return '—'
  const rounded = Math.round(rate * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace('.', ',')
}

/**
 * `96.9` -> `96,9 reclamos cada 1.000`, `1` -> `1 reclamo cada 1.000`.
 *
 * El singular viaja acá por el mismo motivo que en la página de agua: concordar en el llamador
 * obligaba a repetir la decisión en cada frase, y la primera versión publicaba «mediana de 1
 * reclamos cada 1.000».
 */
export function formatClaimRateLabel(rate: number): string {
  const value = formatClaimRate(rate)
  if (value === '—') return value
  return value === '1' ? '1 reclamo cada 1.000' : `${value} reclamos cada 1.000`
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = sorted.length >> 1
  if (!sorted.length) return 0
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2
}

/**
 * El ranking, o `null` cuando el libro no tiene nada publicable: sin snapshot, sin ventana de
 * reclamos —el endpoint sólo manda `periods.claims` cuando la capa pasa su propia guarda de
 * frescura, 75 días desde el cierre del período— o sin ninguna familia con al menos dos barrios,
 * porque un «ranking» de un barrio no compara nada.
 */
export function buildImClaimRanking(
  scores: RentalZoneScores | null | undefined
): ImClaimRanking | null {
  const period = scores?.periods?.claims
  if (!scores || !period?.from || !period?.to) return null
  const families: ImClaimFamily[] = []
  const conDato = new Set<string>()
  for (const def of IM_CLAIM_FAMILIES) {
    const rows: ImClaimRow[] = []
    for (const [id, zone] of Object.entries(scores.zones)) {
      const row = zone.rows.find(entry => entry.attribute === def.id)
      if (!row || !Number.isFinite(row.value) || row.value < 0) continue
      rows.push({ id, name: zone.name, rate: row.value, betterThan: row.betterThan })
    }
    if (rows.length < 2) continue
    rows.sort((a, b) => a.rate - b.rate || a.name.localeCompare(b.name, 'es'))
    for (const row of rows) conDato.add(row.id)
    families.push({
      ...def,
      rows,
      median: median(rows.map(row => row.rate)),
      best: rows[0]!,
      worst: rows[rows.length - 1]!,
    })
  }
  if (!families.length) return null
  return {
    generatedAt: scores.generatedAt,
    periodFrom: period.from,
    periodTo: period.to,
    periodMonths: monthsBetween(period.from, period.to),
    families,
    barrios: conDato.size,
  }
}

/** Los N barrios con más reclamos de una familia, el peor primero. */
export function worstImClaimRows(family: ImClaimFamily, count = 10): ImClaimRow[] {
  return [...family.rows].reverse().slice(0, count)
}

/** Los N con menos, el mejor primero. */
export function bestImClaimRows(family: ImClaimFamily, count = 10): ImClaimRow[] {
  return family.rows.slice(0, count)
}

/** La familia por id, para que la página no vuelva a recorrer el arreglo en cada bloque. */
export function imClaimFamily(
  ranking: ImClaimRanking | null,
  id: ImClaimFamilyId
): ImClaimFamily | null {
  return ranking?.families.find(family => family.id === id) ?? null
}

/**
 * La familia que encabeza el snippet: alumbrado, que es la que más barrios con dato tiene, y si no
 * publica, la primera que sí. Nunca un cero: sin ninguna familia el snippet se escribe sin cifra.
 */
function headlineFamily(ranking: ImClaimRanking | null): ImClaimFamily | null {
  if (!ranking) return null
  return imClaimFamily(ranking, 'alumbrado') ?? ranking.families[0] ?? null
}

/**
 * El `<title>` sin la marca. Lleva la cifra del día cuando hay ranking: es la mitad del snippet que
 * decide el clic y no se puede escribir en un literal, porque la ventana se corre con cada lectura
 * del volcado.
 *
 * Si la cifra no deja entrar el título en el SERP con la marca puesta, se cae la cifra y no la
 * palabra por la que se busca: un título cortado no dice ni una cosa ni la otra.
 */
export function imClaimTitle(ranking: ImClaimRanking | null): string {
  const plain = 'Reclamos a la Intendencia por barrio'
  const family = headlineFamily(ranking)
  if (!family) return plain
  const withFigure = `Reclamos de ${family.label.toLowerCase()}: ${formatClaimRate(family.median)} cada mil`
  return (withFigure + BRAND_SUFFIX).length <= TITLE_LIMIT ? withFigure : plain
}

/**
 * La descripción, con la cifra adelante y por debajo de los 155 caracteres que publica el SERP.
 *
 * Sin ranking NO se inventa una cifra: queda la afirmación que la página sostiene igual, que es la
 * que justifica su existencia (la Intendencia publica el volcado y no la tabla por barrio).
 */
export function imClaimDescription(ranking: ImClaimRanking | null): string {
  const family = headlineFamily(ranking)
  if (!ranking || !family)
    return (
      'Cuántos reclamos de alumbrado, saneamiento y limpieza registra cada barrio de Montevideo, ' +
      'de los datos abiertos de la propia Intendencia.'
    )
  const head = `Mediana de ${formatClaimRateLabel(family.median)} clientes por ${family.label.toLowerCase()} en ${ranking.periodMonths} meses`
  const full = `${head}: ${family.worst.name} es el barrio que más reclama, con ${formatClaimRate(family.worst.rate)}. Datos abiertos de la IM.`
  return full.length <= SNIPPET_LIMIT
    ? full
    : `${head}, en ${ranking.barrios} barrios. Datos abiertos de la IM.`
}

export { formatOutageDay as formatImClaimDay }
