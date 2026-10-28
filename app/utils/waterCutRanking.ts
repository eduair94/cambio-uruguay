/**
 * El ranking de barrios y localidades por cortes de agua PROGRAMADOS de OSE, armado desde el mismo
 * libro que ya alimenta las barras de barrio del directorio de alquileres.
 *
 * Por qué una página y no una barra más dentro de una tarjeta: OSE publica sus interrupciones
 * programadas como AVISOS sueltos —uno por intervención, con su texto y su fecha— y los baja de la
 * web cuando el corte pasa. No hay una tabla por barrio en ninguna parte, así que la pregunta que
 * se hace quien busca casa («¿en esta zona cortan el agua seguido?») no tiene respuesta publicada.
 * El backend archiva cada aviso y le deriva el barrio al leerlo, y de ahí sale esta cuenta. La
 * página gemela de luz (`/cortes-de-luz-por-barrio-uruguay`) hace lo mismo con el mapa de UTE.
 *
 * Cuatro reglas que este módulo no negocia, porque son las que hacen honesta a la página:
 *
 *  1. SE CUENTAN AVISOS, NO HORAS SIN AGUA. El número es cuántas veces OSE avisó un corte
 *     programado que nombra esa zona en la ventana medida. No es tiempo sin servicio, no es una
 *     tasa por conexión, y dos avisos no son necesariamente el doble de molestia.
 *  2. SÓLO LO PROGRAMADO. Una rotura no entra: OSE no la avisa de antemano y este libro se arma de
 *     los avisos previos. Un barrio tranquilo en esta tabla puede tener roturas y no se sabría acá,
 *     que es lo contrario de la página de luz, donde lo medido son justamente los cortes NO
 *     programados. Las dos cifras no se comparan entre sí.
 *  3. EL BARRIO SALE DEL AVISO, Y SÓLO SI ESTÁ ESCRITO. El nombre se deriva de los barrios que el
 *     propio aviso nombra, nunca de las calles que enumera. Un aviso que sólo da calles no se
 *     reparte entre los barrios que esas calles cruzan: no se cuenta en ninguno. La cobertura es
 *     parcial a propósito y la página lo dice.
 *  4. AUSENCIA NO ES CERO. Una zona sin fila de agua no entra con 0 cortes: no entra.
 */
import type { RentalZoneScores } from './rentalZoneTypes'
import { OSE_NOTICES_URL } from './rentalZoneServices'
import { formatOutageDay } from './powerOutageRanking'

/** What Google publishes of a meta description before cutting; the same 155 the budget test uses. */
const SNIPPET_LIMIT = 155
/** Lo que entra en el `<title>` del SERP contando la marca, el mismo 60 de `seoTitleBudget`. */
const TITLE_LIMIT = 60
const BRAND_SUFFIX = ' | Cambio Uruguay'

export interface WaterCutSource {
  label: string
  url: string
}

export const WATER_CUT_SOURCES: readonly WaterCutSource[] = [
  { label: 'OSE — Interrupciones programadas del servicio de agua potable', url: OSE_NOTICES_URL },
]

export interface WaterCutRow {
  id: string
  name: string
  department: string
  /**
   * `barrio` para los 62 barrios INE de Montevideo más Puerto (`mvd:<code>`), `localidad` para el
   * resto del país. Es la misma distinción que hace la página de luz, y por el mismo motivo:
   * llamar «barrio» a Chuy o a Vergara sería falso.
   */
  kind: 'barrio' | 'localidad'
  /** Avisos de corte programado de OSE que nombran esta zona en la ventana medida. */
  notices: number
  /** Share of the other measured areas that fare worse (1 = the area with fewest notices). */
  betterThan: number
}

export interface WaterCutRanking {
  generatedAt: string
  periodFrom: string
  periodTo: string
  /** Meses que abarca la ventana medida, redondeados. Nunca un literal: sale de las dos fechas. */
  periodMonths: number
  /** Todas las zonas con dato, la de menos avisos primero. */
  rows: WaterCutRow[]
  barrios: number
  localidades: number
  median: number
  /** Suma de los avisos atribuidos a una zona. No es el total que publicó OSE. */
  attributedNotices: number
  departments: string[]
}

/** Un conteo como lo escribe un lector: `7` -> `7`, `7.5` -> `7,5`. */
export function formatWaterCuts(notices: number): string {
  if (!Number.isFinite(notices) || notices < 0) return '—'
  const rounded = Math.round(notices * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace('.', ',')
}

/**
 * `7` -> `7 cortes programados`, `1` -> `1 corte programado`.
 *
 * El singular importa y el adjetivo viaja acá a propósito: media tabla tiene un solo aviso, y
 * concordar «programado» en el llamador obligaba a repetir la misma decisión en cada frase (la
 * primera versión publicaba «mediana de 1 corte de agua programados»).
 */
export function formatWaterCutsLabel(notices: number): string {
  const value = formatWaterCuts(notices)
  if (value === '—') return value
  return value === '1' ? '1 corte programado' : `${value} cortes programados`
}

/**
 * Meses enteros entre dos días ISO, redondeando. Se arma con las partes de la cadena y no con
 * `Date`/`Intl` por la misma razón que `formatOutageDay`: la cuenta se hace en el SSR y otra vez al
 * hidratar, y el servidor y el navegador no tienen por qué coincidir en zona horaria.
 */
export function monthsBetween(from: string | null, to: string | null): number {
  const start = /^(\d{4})-(\d{2})-(\d{2})/.exec(from ?? '')
  const end = /^(\d{4})-(\d{2})-(\d{2})/.exec(to ?? '')
  if (!start || !end) return 0
  const months = (Number(end[1]) - Number(start[1])) * 12 + (Number(end[2]) - Number(start[2]))
  const days = Number(end[3]) - Number(start[3])
  return Math.max(0, Math.round(months + days / 30))
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = sorted.length >> 1
  if (!sorted.length) return 0
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2
}

/**
 * El ranking, o `null` cuando el libro no tiene nada publicable: sin snapshot, sin capa de agua
 * utilizable —el endpoint sólo manda `periods.water` cuando la capa pasa su propia guarda de
 * frescura— o con menos de dos zonas con cifra, porque un «ranking» de una zona no compara nada.
 */
export function buildWaterCutRanking(
  scores: RentalZoneScores | null | undefined
): WaterCutRanking | null {
  const period = scores?.periods?.water
  if (!scores || !period?.from || !period?.to) return null
  const rows: WaterCutRow[] = []
  for (const [id, zone] of Object.entries(scores.zones)) {
    const row = zone.rows.find(entry => entry.attribute === 'agua')
    if (!row || !Number.isFinite(row.value) || row.value < 0) continue
    rows.push({
      id,
      name: zone.name,
      department: zone.department,
      kind: id.startsWith('mvd:') ? 'barrio' : 'localidad',
      notices: row.value,
      betterThan: row.betterThan,
    })
  }
  if (rows.length < 2) return null
  rows.sort((a, b) => a.notices - b.notices || a.name.localeCompare(b.name, 'es'))
  return {
    generatedAt: scores.generatedAt,
    periodFrom: period.from,
    periodTo: period.to,
    periodMonths: monthsBetween(period.from, period.to),
    rows,
    barrios: rows.filter(row => row.kind === 'barrio').length,
    localidades: rows.filter(row => row.kind === 'localidad').length,
    median: median(rows.map(row => row.notices)),
    attributedNotices: rows.reduce((total, row) => total + row.notices, 0),
    departments: [...new Set(rows.map(row => row.department))].sort((a, b) =>
      a.localeCompare(b, 'es')
    ),
  }
}

/** Las N zonas con más avisos, la peor primero. */
export function worstWaterCutRows(ranking: WaterCutRanking, count = 10): WaterCutRow[] {
  return [...ranking.rows].reverse().slice(0, count)
}

/** Las N zonas con menos, la mejor primero. */
export function bestWaterCutRows(ranking: WaterCutRanking, count = 10): WaterCutRow[] {
  return ranking.rows.slice(0, count)
}

/**
 * El `<title>` sin la marca. Lleva la cifra del día cuando hay ranking: es la mitad del snippet que
 * decide el clic y no se puede escribir en un literal, porque la ventana se corre todos los días.
 *
 * Si la cifra no deja entrar el título en el SERP con la marca puesta, se cae la cifra y no la
 * palabra por la que se busca: un título cortado no dice ni una cosa ni la otra.
 */
export function waterCutTitle(ranking: WaterCutRanking | null): string {
  const plain = 'Cortes de agua programados por barrio'
  if (!ranking) return plain
  const withFigure = `Cortes de agua: mediana de ${formatWaterCuts(ranking.median)} en ${ranking.periodMonths} meses`
  return (withFigure + BRAND_SUFFIX).length <= TITLE_LIMIT ? withFigure : plain
}

/**
 * La descripción, con la cifra adelante y por debajo de los 155 caracteres que publica el SERP.
 *
 * Sin ranking NO se inventa una cifra: queda la afirmación que la página sostiene igual, que es la
 * que justifica su existencia (OSE avisa corte por corte y baja el aviso cuando pasa).
 */
export function waterCutDescription(ranking: WaterCutRanking | null): string {
  if (!ranking)
    return (
      'Cuántos cortes de agua programados avisó OSE en cada barrio y localidad. ' +
      'OSE publica aviso por aviso y los baja cuando pasa: acá quedan archivados.'
    )
  const worst = worstWaterCutRows(ranking, 1)[0]!
  const head = `Mediana de ${formatWaterCutsLabel(ranking.median)} de agua en ${ranking.periodMonths} meses en ${ranking.rows.length} zonas`
  const full = `${head}: ${worst.name} es la peor con ${formatWaterCuts(worst.notices)}. Avisos de OSE, archivados uno por uno.`
  return full.length <= SNIPPET_LIMIT ? full : `${head}. Avisos de OSE, archivados uno por uno.`
}

export { formatOutageDay as formatWaterCutDay }
