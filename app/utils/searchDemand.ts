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
  items: ScDemandItem[]
}

/** Cómo se pinta un veredicto. `undefined` = no se alcanzó a mirar el SERP. */
export function scDemandColor(verdict?: ScDemandVerdict): string {
  if (verdict === 'escribir') return 'success'
  if (verdict === 'no-entrar') return 'error'
  return 'warning'
}

export function scDemandLabel(verdict?: ScDemandVerdict): string {
  if (verdict === 'escribir') return 'escribir'
  if (verdict === 'no-entrar') return 'no entrar'
  if (verdict === 'dudoso') return 'dudoso'
  return 'sin mirar'
}
