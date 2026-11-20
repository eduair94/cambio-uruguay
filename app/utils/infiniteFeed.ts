/**
 * Scroll infinito de los directorios (alquileres, autos, motos, ventas, equipar…): la lógica
 * que no necesita DOM, para poder testearla sin navegador. El componente que la usa es
 * `components/InfiniteFeed.vue`; el diseño, `docs/superpowers/specs/2026-10-28-scroll-infinito-design.md`.
 *
 * La idea central es una lista virtual a nivel de PÁGINA: en el DOM vive sólo una ventana de
 * páginas contiguas, y las que quedaron lejos se reemplazan por un espaciador del alto que
 * medían. Así bajar 400 páginas de alquileres no deja 9.600 tarjetas con sus carruseles en
 * memoria: deja unas 96 y dos números.
 */

/** Cómo se recorre un directorio: con la paginación numerada o cargando más al bajar. */
export type ListMode = 'paginas' | 'scroll'

/** Preferencia del visitante, una sola para todos los directorios. */
export const LIST_MODE_STORAGE_KEY = 'cu_list_mode'

/**
 * El defecto sigue siendo la paginación: el pedido fue "la opción" de scroll infinito, y así lo
 * que pinta el servidor, los e2e y la medición quedan como estaban. Cambiarlo es esta línea.
 */
export const DEFAULT_LIST_MODE: ListMode = 'paginas'

export function normalizeListMode(value: unknown): ListMode {
  return value === 'scroll' || value === 'paginas' ? value : DEFAULT_LIST_MODE
}

/** Avisos que puede haber en el DOM a la vez. */
export const FEED_WINDOW_ITEMS = 96

/**
 * Avisos NUEVOS que se cargan solos antes de pausar y ofrecer "Cargar más". Sin pausa, el pie
 * de la página (el asistente, las preguntas, el footer) queda inalcanzable en un directorio de
 * 400 páginas.
 */
export const FEED_PAUSE_ITEMS = 120

/** Margen, en píxeles, con el que se pide la página siguiente antes de llegar al final. */
export const FEED_PREFETCH_MARGIN = 1600

/** Cuánto vive el recuerdo de la ventana para volver desde una ficha con "atrás". */
export const FEED_SNAPSHOT_TTL_MS = 30 * 60 * 1000

/** Nunca menos de tres páginas: la anterior, la que se mira y la siguiente. */
export function feedWindowPages(perPage: number): number {
  return Math.max(3, Math.ceil(FEED_WINDOW_ITEMS / Math.max(1, perPage)))
}

export function feedPausePages(perPage: number): number {
  return Math.max(3, Math.ceil(FEED_PAUSE_ITEMS / Math.max(1, perPage)))
}

/**
 * Alto del espaciador que reemplaza a un tramo de páginas sacadas del DOM.
 *
 * Cada alto medido ya incluye el `gap` que la grilla deja DESPUÉS de esa página. El espaciador
 * es un ítem más de la grilla (de ancho completo) y la grilla le agrega su propio `gap`, así que
 * se descuenta uno: espaciador + gap = lo que ocupaban las páginas.
 */
export function feedSpacerHeight(heights: readonly number[], gap: number): number {
  if (!heights.length) return 0
  const total = heights.reduce((sum, height) => sum + Math.max(0, height), 0)
  return Math.max(0, total - Math.max(0, gap))
}

export interface FeedWindowInput {
  /** Primera y última página conocidas (cargadas alguna vez, con alto medido o estimado). */
  first: number
  last: number
  /** Alto de cada página conocida; la que falte se estima con el promedio de las demás. */
  heights: ReadonlyMap<number, number>
  /** El viewport, medido desde el comienzo de la página `first`. */
  viewTop: number
  viewBottom: number
  margin: number
  maxPages: number
}

export interface FeedWindow {
  start: number
  end: number
}

function averageHeight(heights: ReadonlyMap<number, number>): number {
  const values = [...heights.values()].filter(value => value > 0)
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 1
}

/** Desplazamiento de cada página conocida desde el comienzo de `first`. */
export function feedOffsets(
  first: number,
  last: number,
  heights: ReadonlyMap<number, number>
): Map<number, { top: number; bottom: number }> {
  const fallback = averageHeight(heights)
  const offsets = new Map<number, { top: number; bottom: number }>()
  let top = 0
  for (let page = first; page <= last; page++) {
    const height = heights.get(page) ?? fallback
    offsets.set(page, { top, bottom: top + height })
    top += height
  }
  return offsets
}

/**
 * Qué páginas conviene tener en el DOM para lo que se está mirando: las que tocan el viewport
 * más el margen, recortadas al techo alrededor de la que está en el centro.
 */
export function feedDesiredWindow(input: FeedWindowInput): FeedWindow {
  const { first, last, heights, viewTop, viewBottom, margin, maxPages } = input
  const offsets = feedOffsets(first, last, heights)
  const touched = intersecting(offsets, first, last, viewTop - margin, viewBottom + margin)
  if (!touched) {
    // Todo lo conocido queda lejos arriba (se está leyendo lo que va después de la lista, o se
    // espera la página siguiente) o lejos abajo: se conserva sólo la página del borde. Conservar
    // "las últimas N" volvía a meter páginas viejas arriba justo mientras se esperaba la nueva.
    const below = viewTop >= offsets.get(last)!.bottom
    return below ? { start: last, end: last } : { start: first, end: first }
  }
  const { start, end } = touched
  if (end - start + 1 <= maxPages) return { start, end }
  const center = feedPageAt(first, last, heights, (viewTop + viewBottom) / 2)
  let lo = Math.max(start, center - Math.floor((maxPages - 1) / 2))
  let hi = lo + maxPages - 1
  if (hi > end) {
    hi = end
    lo = Math.max(start, hi - maxPages + 1)
  }
  return { start: lo, end: hi }
}

function intersecting(
  offsets: Map<number, { top: number; bottom: number }>,
  first: number,
  last: number,
  from: number,
  to: number
): FeedWindow | null {
  let start = -1
  let end = -1
  for (let page = first; page <= last; page++) {
    const { top, bottom } = offsets.get(page)!
    if (bottom > from && top < to) {
      if (start === -1) start = page
      end = page
    }
  }
  return start === -1 ? null : { start, end }
}

/**
 * Las páginas que están EN pantalla, o `null` si ninguna (se está leyendo lo que va después de
 * la lista). Ésas nunca se sacan del DOM, aunque superen el techo.
 */
export function feedPagesOnScreen(
  input: Omit<FeedWindowInput, 'margin' | 'maxPages'>
): FeedWindow | null {
  const offsets = feedOffsets(input.first, input.last, input.heights)
  return intersecting(offsets, input.first, input.last, input.viewTop, input.viewBottom)
}

/** La página que ocupa una posición (medida desde el comienzo de `first`). */
export function feedPageAt(
  first: number,
  last: number,
  heights: ReadonlyMap<number, number>,
  position: number
): number {
  const offsets = feedOffsets(first, last, heights)
  for (let page = first; page <= last; page++) {
    if (position < offsets.get(page)!.bottom) return page
  }
  return last
}

export interface FeedAppendInput {
  viewBottom: number
  margin: number
  /** Alto de todo lo conocido, de `first` a `last`. */
  knownHeight: number
  last: number
  pageCount: number
  /** Páginas nuevas cargadas solas desde el último "Cargar más". */
  autoLoaded: number
  pausePages: number
}

export type FeedAppendDecision = 'load' | 'pause' | 'done' | 'wait'

/** Si al acercarse al final corresponde pedir la página siguiente, pausar o nada. */
export function feedAppendDecision(input: FeedAppendInput): FeedAppendDecision {
  if (input.last >= input.pageCount) return 'done'
  if (input.viewBottom + input.margin < input.knownHeight) return 'wait'
  return input.autoLoaded >= input.pausePages ? 'pause' : 'load'
}

/**
 * Datos de las páginas que salieron de la ventana, para no volver a pedirlas si el visitante
 * sube un poco. Con techo: más allá se vuelven a pedir (la API las tiene en caché).
 */
export class FeedPageCache<T> {
  private readonly entries = new Map<number, readonly T[]>()

  constructor(private readonly max: number) {}

  get(page: number): readonly T[] | undefined {
    const items = this.entries.get(page)
    if (items) {
      this.entries.delete(page)
      this.entries.set(page, items)
    }
    return items
  }

  set(page: number, items: readonly T[]): void {
    this.entries.delete(page)
    this.entries.set(page, items)
    while (this.entries.size > this.max) {
      const oldest = this.entries.keys().next().value as number
      this.entries.delete(oldest)
    }
  }

  delete(page: number): void {
    this.entries.delete(page)
  }

  clear(): void {
    this.entries.clear()
  }

  get size(): number {
    return this.entries.size
  }
}

/** Lo que se recuerda de una ventana para volver desde una ficha con "atrás". */
export interface FeedSnapshot<T = unknown> {
  resetKey: string
  startPage: number
  first: number
  last: number
  windowStart: number
  windowEnd: number
  pages: Array<[number, readonly T[]]>
  heights: Array<[number, number]>
  gap: number
  autoLoaded: number
  savedAt: number
}

const snapshots = new Map<string, FeedSnapshot>()

export function saveFeedSnapshot(feedId: string, snapshot: FeedSnapshot): void {
  snapshots.set(feedId, snapshot)
}

/**
 * La ventana guardada, sólo si es de la MISMA búsqueda (filtros y página de arranque) y no
 * venció. Se consume: un segundo montaje no la vuelve a usar.
 */
export function takeFeedSnapshot<T>(
  feedId: string,
  resetKey: string,
  startPage: number,
  now: number
): FeedSnapshot<T> | null {
  const snapshot = snapshots.get(feedId)
  snapshots.delete(feedId)
  if (!snapshot) return null
  if (snapshot.resetKey !== resetKey || snapshot.startPage !== startPage) return null
  if (now - snapshot.savedAt > FEED_SNAPSHOT_TTL_MS) return null
  return snapshot as FeedSnapshot<T>
}
