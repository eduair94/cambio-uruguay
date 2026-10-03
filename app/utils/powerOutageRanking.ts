/**
 * El ranking de barrios por minutos sin luz, armado desde el mismo libro que ya alimenta las
 * barras de barrio del directorio de alquileres.
 *
 * Por qué una página y no una fila más de un filtro: el dato no existe publicado en ninguna otra
 * parte. URSEA publica la calidad del servicio por AGRUPAMIENTO —42 agrupamientos definidos por
 * zona geográfica (uno o varios departamentos) y, dentro de la zona, por densidad de suministros—
 * y su informe no desagrega por barrio. El backend integra cada diez minutos el mapa público de
 * UTE y deja minutos por cliente y por mes para cada uno de los 63 barrios de UTE, que es la
 * desagregación que nadie publica.
 *
 * Tres reglas que este módulo no negocia, porque son las que hacen honesta a la página:
 *
 *  1. UN DATO PROVISORIO SE DICE PROVISORIO. El libro publica desde los 3 días medidos y la cifra
 *     recién es definitiva a los 14; mientras tanto viaja `provisional` y los días medidos, para
 *     que la página los imprima al lado del número y no detrás de un asterisco.
 *  2. LA REFERENCIA DE URSEA NO ES UNA META DE ESTE BARRIO. Los 36 min/30 días salen del Tca de
 *     3,6 h por semestre del agrupamiento «Urbano alta densidad BT», que se mide sobre un
 *     agrupamiento entero y con la metodología de URSEA, no sobre un barrio y no con la nuestra.
 *     Va como la única vara pública contra la que se puede leer un número, nunca como un
 *     incumplimiento: de ahí `aboveBenchmark` como conteo y ningún veredicto por barrio.
 *  3. AUSENCIA NO ES CERO. Un barrio sin fila de luz no entra con 0 min: no entra.
 */
import type { RentalZoneScores } from './rentalZoneTypes'
import {
  URSEA_URBAN_DENSE_MINUTES_PER_MONTH,
  UTE_ECSE_URL,
  RENTAL_POWER_MIN_DAYS,
  RENTAL_POWER_PRELIMINARY_DAYS,
} from './rentalZoneServices'

/** URSEA's own quality report: the Tca table and the 42 groupings it publishes instead of barrios. */
export const URSEA_QUALITY_REPORT_URL =
  'https://www.gub.uy/unidad-reguladora-servicios-energia-agua/comunicacion/publicaciones/informe-calidad-servicio-distribucion-energia-electrica/informe-1'

export const POWER_OUTAGE_BENCHMARK_MINUTES = URSEA_URBAN_DENSE_MINUTES_PER_MONTH
/** What Google publishes of a meta description before cutting; the same 155 the budget test uses. */
const SNIPPET_LIMIT = 155
export const POWER_OUTAGE_MIN_DAYS = RENTAL_POWER_MIN_DAYS
export const POWER_OUTAGE_PRELIMINARY_DAYS = RENTAL_POWER_PRELIMINARY_DAYS

export interface PowerOutageSource {
  label: string
  url: string
}

export const POWER_OUTAGE_SOURCES: readonly PowerOutageSource[] = [
  { label: 'UTE — mapa interactivo de la situación del servicio eléctrico', url: UTE_ECSE_URL },
  {
    label: 'URSEA — Informe de calidad del servicio de distribución, calidad del servicio técnico',
    url: URSEA_QUALITY_REPORT_URL,
  },
]

export interface PowerOutageRow {
  id: string
  name: string
  department: string
  /**
   * `barrio` for the 62 INE barrios of Montevideo plus Puerto (`mvd:<code>`), `localidad` for the
   * rest of the country (`ute:<id>`). Medido el 2026-10-03: de las 143 áreas con dato, la mayoría
   * son localidades, así que llamarlas todas «barrio» (Tranqueras, Chuy, Vergara) sería falso.
   */
  kind: 'barrio' | 'localidad'
  /** Minutes per customer per 30 days without power, unplanned cuts only. */
  minutes: number
  /** Share of the other measured areas that fare worse (1 = the area with fewest minutes). */
  betterThan: number
}

export interface PowerOutageRanking {
  generatedAt: string
  observedFrom: string | null
  observedTo: string | null
  observedDays: number
  /** The layer's own status, as the directory's `usable()` reads it. */
  status: 'ready' | 'preliminary' | 'stale'
  /** True while the ledger has fewer than {@link POWER_OUTAGE_MIN_DAYS} days observed. */
  provisional: boolean
  /** True when the measured window has not been refreshed recently: the figures are last week's. */
  stale: boolean
  /** Every measured area, fewest minutes first. */
  rows: PowerOutageRow[]
  /** How many of those are Montevideo barrios, and how many localities elsewhere. */
  barrios: number
  localidades: number
  median: number
  /** How many measured areas sit above URSEA's dense-urban reference. Never a per-area verdict. */
  aboveBenchmark: number
  departments: string[]
}

/** Minutes as a reader says them: `96` -> `1 h 36 min`, `36` -> `36 min`. */
export function formatOutageMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) return '—'
  const rounded = Math.round(minutes)
  if (rounded < 1) return 'menos de 1 min'
  if (rounded < 60) return `${rounded} min`
  const hours = Math.floor(rounded / 60)
  const rest = rounded % 60
  return rest ? `${hours} h ${rest} min` : `${hours} h`
}

/**
 * `2026-09-30` -> `30/9/2026`, como lo escribe el resto del sitio.
 *
 * Se arma por partes y no con `Intl`/`toLocaleDateString`: la fecha se imprime en el SSR y otra vez
 * al hidratar, y el servidor y el navegador no tienen por qué coincidir ni en zona ni en ICU. Una
 * cadena que no es una fecha se devuelve tal cual: antes mostrar el crudo que una fecha inventada.
 */
export function formatOutageDay(iso: string | null | undefined): string {
  if (!iso) return '—'
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!match) return iso
  return `${Number(match[3])}/${Number(match[2])}/${match[1]}`
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = sorted.length >> 1
  if (!sorted.length) return 0
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2
}

/**
 * The ranking, or `null` when the ledger has nothing publishable: no snapshot, a `collecting` or
 * `unavailable` power layer, or fewer than two barrios with a figure (a "ranking" of one barrio
 * compares nothing).
 *
 * `stale` SÍ se publica, y no es una concesión: es la misma regla que el `usable()` del directorio
 * —`ready`, `preliminary` y `stale`— y la razón es que una ventana vieja es una medición real de
 * esa ventana. Lo que no se puede hacer es publicarla como si fuera la de hoy, así que viaja
 * marcada y la página imprime la fecha de cierre. Medido el 2026-10-03: el snapshot de producción
 * era del 30/9 y una guarda que rechazara `stale` habría dejado la página en blanco teniendo los
 * 143 barrios medidos.
 */
export function buildPowerOutageRanking(
  scores: RentalZoneScores | null | undefined
): PowerOutageRanking | null {
  const period = scores?.periods?.power
  if (!scores || !period) return null
  if (period.status !== 'ready' && period.status !== 'preliminary' && period.status !== 'stale')
    return null
  const rows: PowerOutageRow[] = []
  for (const [id, zone] of Object.entries(scores.zones)) {
    const row = zone.rows.find(entry => entry.attribute === 'luz')
    if (!row || !Number.isFinite(row.value)) continue
    rows.push({
      id,
      name: zone.name,
      department: zone.department,
      kind: id.startsWith('mvd:') ? 'barrio' : 'localidad',
      minutes: row.value,
      betterThan: row.betterThan,
    })
  }
  if (rows.length < 2) return null
  rows.sort((a, b) => a.minutes - b.minutes || a.name.localeCompare(b.name, 'es'))
  return {
    generatedAt: scores.generatedAt,
    observedFrom: period.from,
    observedTo: period.to,
    observedDays: Math.floor(period.observedDays),
    status: period.status,
    provisional: period.status === 'preliminary',
    stale: period.status === 'stale',
    rows,
    barrios: rows.filter(row => row.kind === 'barrio').length,
    localidades: rows.filter(row => row.kind === 'localidad').length,
    median: median(rows.map(row => row.minutes)),
    aboveBenchmark: rows.filter(row => row.minutes > POWER_OUTAGE_BENCHMARK_MINUTES).length,
    departments: [...new Set(rows.map(row => row.department))].sort((a, b) =>
      a.localeCompare(b, 'es')
    ),
  }
}

/** The N areas with the most minutes without power, worst first. */
export function worstPowerOutageRows(ranking: PowerOutageRanking, count = 10): PowerOutageRow[] {
  return [...ranking.rows].reverse().slice(0, count)
}

/** The N areas with the fewest, best first. */
export function bestPowerOutageRows(ranking: PowerOutageRanking, count = 10): PowerOutageRow[] {
  return ranking.rows.slice(0, count)
}

/**
 * El `<title>` sin la marca. Lleva el número del día cuando hay ranking: es la mitad del snippet
 * que decide el clic y la cifra no se puede escribir en un literal, porque cambia todos los días.
 */
export function powerOutageTitle(ranking: PowerOutageRanking | null): string {
  if (!ranking) return 'Cortes de luz por barrio en Uruguay'
  return `Cortes de luz: ${formatOutageMinutes(ranking.median)} al mes de mediana`
}

/**
 * La descripción, con la cifra adelante y por debajo de los 155 caracteres que publica el SERP.
 *
 * Sin ranking NO se inventa una cifra: queda la afirmación que la página sostiene igual, que es la
 * que justifica su existencia (URSEA no desagrega por barrio y acá se mide cada diez minutos).
 */
export function powerOutageDescription(ranking: PowerOutageRanking | null): string {
  if (!ranking)
    return (
      'Minutos sin luz por barrio y localidad, medidos del mapa público de UTE cada 10 minutos. ' +
      'URSEA publica por agrupamiento de departamentos, nunca por barrio.'
    )
  const worst = worstPowerOutageRows(ranking, 1)[0]!
  const days = ranking.observedDays
  const head = `Mediana de ${formatOutageMinutes(ranking.median)} sin luz al mes en ${ranking.rows.length} barrios y localidades`
  const tail = `${worst.name} es el peor con ${formatOutageMinutes(worst.minutes)}. ${days} días medidos del mapa de UTE.`
  const full = `${head}: ${tail}`
  // Un nombre largo con dos cifras de dos dígitos llega a pasarse: antes que publicar
  // una descripción cortada se cae el nombre propio, que es el dato menos escaso de los tres.
  return full.length <= SNIPPET_LIMIT
    ? full
    : `${head}, ${ranking.aboveBenchmark} por encima de los ${POWER_OUTAGE_BENCHMARK_MINUTES} min de referencia de URSEA. ${days} días medidos.`
}
