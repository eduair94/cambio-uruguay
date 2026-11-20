// La forma de la cola de "qué escribir" que produce el job de backend `currency-search-demand`.
//
// Espejo de tipos de `classes/demand/classify.ts` + `classes/demand/refresh.ts`. Está acá porque
// `app/` es un paquete aparte y no importa nada de fuera de su carpeta; la paridad del ESQUEMA la
// vigila `tests/appdb/schema_parity.test.ts` en la raíz.
//
// NO ES PÚBLICO. La cola dice dónde el sitio no llega, que es exactamente el mapa que un
// competidor querría. Se sirve detrás de la misma lista de administradores que Search Console.

export type ScDemandVerdict = 'escribir' | 'dudoso' | 'no-entrar'

export interface ScDemandSerp {
  verdict: ScDemandVerdict
  reason: string
  calculators: number
  institutional: number
  weak: number
}

export type ScDemandFailureReason =
  'http' | 'timeout' | 'network' | 'empty-results' | 'invalid-response' | 'unexpected'

export type ScDemandSerpCheck =
  | { status: 'classified' }
  | { status: 'failed'; reason: ScDemandFailureReason; httpStatus?: number }
  | { status: 'not-attempted'; reason: 'budget' | 'disabled' }

export interface ScDemandSerpRun {
  startedAt: string
  finishedAt: string
  budget: number
  attempted: number
  failures: Partial<Record<ScDemandFailureReason, number>>
  httpStatuses: Record<string, number>
  notAttempted: { budget: number; disabled: number }
}

/** Lo que el archivo de Search Console ya sabe de la consulta. */
export interface ScDemandKnown {
  impressions: number
  clicks: number
  position: number
}

export interface ScDemandItem {
  query: string
  topic: string | null
  /** Posición en el autocompletado: 0 es la primera. Proxy de frecuencia, NO un volumen. */
  rank: number
  /** 0..1 — cuánto lo cubre ya el sitio. */
  coverage: number
  bestPath: string | null
  serp?: ScDemandSerp
  serpCheck?: ScDemandSerpCheck
  /** Presente cuando Google YA muestra el sitio para esta consulta exacta. */
  known?: ScDemandKnown
  score: number
  why: string
}

export interface SearchDemandQueue {
  key: string
  asOf: string
  harvested: number
  local: number
  inScope: number
  probed: number
  /** Ausente en snapshots anteriores; no significa cero intentos. */
  serpRun?: ScDemandSerpRun
  items: ScDemandItem[]
}

/** Sin assessment no hay veredicto: ni una falla ni una omisión descartan una consulta. */
export function scDemandColor(verdict?: ScDemandVerdict): string {
  if (verdict === 'escribir') return 'success'
  if (verdict === 'no-entrar') return 'error'
  return 'warning'
}

export function scDemandLabel(verdict?: ScDemandVerdict, check?: ScDemandSerpCheck): string {
  if (verdict === 'escribir') return 'escribir'
  if (verdict === 'no-entrar') return 'no entrar'
  if (verdict === 'dudoso') return 'dudoso'
  if (check?.status === 'failed') return 'falló la evaluación'
  if (check?.status === 'not-attempted') {
    return check.reason === 'budget' ? 'sin intento: presupuesto' : 'etapa omitida'
  }
  return 'sin diagnóstico'
}

const failureLabels: Record<ScDemandFailureReason, string> = {
  http: 'respuesta HTTP de error',
  timeout: 'tiempo de espera agotado',
  network: 'fallo de conexión',
  'empty-results': 'lista de resultados vacía',
  'invalid-response': 'respuesta no interpretable',
  unexpected: 'fallo no identificado',
}

export function scDemandWhy(item: ScDemandItem): string {
  if (
    !item.serp &&
    !item.serpCheck &&
    item.why === 'sin clasificar: no llegó al presupuesto de SERP, hay que mirarlo a mano'
  ) {
    // Sólo este fallback antiguo atribuía a presupuesto una ausencia sin diagnóstico.
    // Los motivos de posición conocida o cobertura siguen siendo válidos sin un SERP.
    return 'Esta corrida no guardó el diagnóstico del intento SERP; hay que revisarlo a mano.'
  }
  if (!item.serp && item.serpCheck?.status === 'failed') {
    const check = item.serpCheck
    const detail =
      check.reason === 'http' && check.httpStatus !== undefined
        ? `HTTP ${check.httpStatus}`
        : failureLabels[check.reason]
    return `${item.why}. Diagnóstico: ${detail}.`
  }
  return item.why
}

/** Resumen del conjunto evaluado, no de las 40 filas que sobrevivieron en la tabla. */
export function scDemandRunSummary(run?: ScDemandSerpRun): string {
  if (!run) return 'Esta corrida no guardó un diagnóstico de intentos SERP.'
  const failed = Object.values(run.failures).reduce((total, count) => total + (count ?? 0), 0)
  return (
    `${run.attempted} intentos; ${failed} fallidos; ` +
    `${run.notAttempted.budget} sin intento por presupuesto; ` +
    `${run.notAttempted.disabled} con la etapa omitida. Límite de consultas: ${run.budget}.`
  )
}

export function scDemandFailureSummary(run?: ScDemandSerpRun): string {
  if (!run) return ''
  const reasons = Object.entries(failureLabels)
    .filter(([reason]) => (run.failures[reason as ScDemandFailureReason] ?? 0) > 0)
    .map(([reason, label]) => `${label}: ${run.failures[reason as ScDemandFailureReason]}`)
  const statuses = Object.entries(run.httpStatuses)
    .filter(
      ([status, count]) =>
        /^\d{3}$/.test(status) && Number(status) >= 100 && Number(status) <= 599 && count > 0
    )
    .map(([status, count]) => `HTTP ${status}: ${count}`)
  return [...reasons, ...statuses].join(' · ')
}
