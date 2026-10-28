import type { Ref } from 'vue'
import {
  FEED_PREFETCH_MARGIN,
  FeedPageCache,
  feedAppendDecision,
  feedDesiredWindow,
  feedOffsets,
  feedPageAt,
  feedPagesOnScreen,
  feedPausePages,
  feedSpacerHeight,
  feedWindowPages,
  saveFeedSnapshot,
  takeFeedSnapshot,
  type FeedWindow,
  type ListMode,
} from '~/utils/infiniteFeed'
import { scrollToPageTop } from '~/utils/paginationScroll'

export type FeedStatus = 'idle' | 'loading' | 'paused' | 'error' | 'done'

export interface InfiniteFeedOptions<T> {
  /** Nombre del directorio: separa el recuerdo de "volver atrás" y va en el evento de GA4. */
  id: string
  /** El elemento de la lista (la grilla): los ítems son sus hijos directos. */
  list: Ref<HTMLElement | { $el?: unknown } | null>
  /** Los avisos de la página que pidió la URL (los que pintó el servidor). */
  items: () => readonly T[]
  page: () => number
  pageCount: () => number
  perPage: () => number
  /** Los filtros SIN la página: si cambian, la lista vuelve a empezar. */
  resetKey: () => string
  /** La página `page` de la MISMA búsqueda; el resultado se descarta salvo los avisos. */
  fetchPage: (page: number, signal: AbortSignal) => Promise<readonly T[]>
  /** Sólo hay scroll infinito cuando se muestra la lista (no el mapa, no un error). */
  enabled?: () => boolean
  /** Volver a la paginación parado en otra página: navegar a ella. */
  goToPage?: (page: number) => void
  /** Ancla del comienzo de los resultados, para "Volver arriba". */
  anchorId?: string
}

// "Atrás" del navegador: sólo entonces se rearma la ventana guardada. Una navegación nueva al
// mismo directorio (un enlace del menú) empieza de cero, como la paginación.
let lastPopstate = 0
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    lastPopstate = Date.now()
  })
}

function range(from: number, to: number): number[] {
  const pages: number[] = []
  for (let page = from; page <= to; page++) pages.push(page)
  return pages
}

/**
 * Scroll infinito con memoria acotada para un directorio paginado.
 *
 * La página sigue dueña de su `v-for`: recorre `feed.items` en vez de los avisos de la página,
 * pone `<FeedEdge :feed="feed" edge="top" />` justo antes de los avisos y `edge="bottom"` justo
 * después (son los espaciadores y las marcas que delimitan los ítems), y mete su `VPagination`
 * en el slot `pagination` de `<FeedControls>`. Cada aviso tiene que rendir UN elemento: así se
 * miden las páginas por orden, sin envoltorios que rompan los selectores `grilla > tarjeta`.
 *
 * La lógica sin DOM (qué ventana, cuándo pausar, alto de los espaciadores) vive en
 * `utils/infiniteFeed.ts`; ver ahí el porqué de cada techo.
 *
 * Se declara DESPUÉS de todo lo que leen sus getters: en una navegación dentro del sitio los
 * llama en el mismo `setup` (para rearmar la ventana antes del primer render), y un `const`
 * declarado más abajo revienta con "Cannot access before initialization".
 */
export function useInfiniteFeed<T>(options: InfiniteFeedOptions<T>) {
  const listMode = useListMode()
  const nuxtApp = useNuxtApp()
  const enabled = computed(() => options.enabled?.() ?? true)
  const active = computed(() => listMode.mode.value === 'scroll' && enabled.value)

  const base = ref(options.page())
  let baseKey = options.resetKey()
  const first = ref(base.value)
  const last = ref(base.value)
  const windowStart = ref(base.value)
  const windowEnd = ref(base.value)
  const pages = shallowRef(new Map<number, readonly T[]>())
  const topSpace = ref(0)
  const bottomSpace = ref(0)
  const status = ref<FeedStatus>('idle')
  const previousStatus = ref<'idle' | 'loading' | 'error'>('idle')
  const visiblePage = ref(base.value)
  const autoLoaded = ref(0)

  const maxPages = computed(() => feedWindowPages(options.perPage()))
  const pausePages = computed(() => feedPausePages(options.perPage()))
  // Fuera de la ventana: datos sueltos para no volver a pedir lo que se acaba de ver.
  let spare = new FeedPageCache<T>(maxPages.value * 2)
  const heights = new Map<number, number>()
  let gap = 0
  let awaitingItems = false
  let controller: AbortController | null = null
  const inflight = new Map<number, Promise<readonly T[] | null>>()
  let moving = false
  let frame = 0
  let attached = false
  let initialized = false

  const items = computed<readonly T[]>(() => {
    if (!active.value) return options.items()
    const out: T[] = []
    for (let page = windowStart.value; page <= windowEnd.value; page++) {
      const chunk = pages.value.get(page)
      if (chunk) out.push(...chunk)
    }
    return out
  })

  /** La ventana arranca en la primera página conocida: su primer aviso es el primero de la lista. */
  const atStart = computed(() => !active.value || windowStart.value === first.value)
  const canLoadPrevious = computed(
    () => active.value && first.value > 1 && windowStart.value === first.value
  )

  function listElement(): HTMLElement | null {
    const value = options.list.value as unknown
    if (typeof HTMLElement === 'undefined') return null
    if (value instanceof HTMLElement) return value
    const el = (value as { $el?: unknown } | null)?.$el
    return el instanceof HTMLElement ? el : null
  }

  function spacers() {
    topSpace.value = feedSpacerHeight(
      range(first.value, windowStart.value - 1).map(page => heights.get(page) ?? 0),
      gap
    )
    bottomSpace.value = feedSpacerHeight(
      range(windowEnd.value + 1, last.value).map(page => heights.get(page) ?? 0),
      gap
    )
  }

  function reset(list: readonly T[]) {
    controller?.abort()
    controller = null
    inflight.clear()
    spare = new FeedPageCache<T>(maxPages.value * 2)
    heights.clear()
    base.value = options.page()
    baseKey = options.resetKey()
    first.value = base.value
    last.value = base.value
    windowStart.value = base.value
    windowEnd.value = base.value
    visiblePage.value = base.value
    pages.value = new Map([[base.value, list]])
    topSpace.value = 0
    bottomSpace.value = 0
    autoLoaded.value = 0
    status.value = base.value >= options.pageCount() ? 'done' : 'idle'
    previousStatus.value = 'idle'
    awaitingItems = false
    moving = false
    initialized = true
    schedule()
  }

  /** Los elementos de cada página de la ventana, por orden entre las dos marcas. */
  function pageElements(): Map<number, HTMLElement[]> | null {
    const list = listElement()
    if (!list) return null
    const top = list.querySelector(':scope > [data-feed-edge="top"]')
    const bottom = list.querySelector(':scope > [data-feed-edge="bottom"]')
    if (!top || !bottom) return null
    const elements: HTMLElement[] = []
    for (let el = top.nextElementSibling; el && el !== bottom; el = el.nextElementSibling) {
      elements.push(el as HTMLElement)
    }
    const byPage = new Map<number, HTMLElement[]>()
    let index = 0
    for (let page = windowStart.value; page <= windowEnd.value; page++) {
      const count = pages.value.get(page)?.length ?? 0
      byPage.set(page, elements.slice(index, index + count))
      index += count
    }
    // Un aviso que rinde dos elementos (o ninguno) desalinea todo: sin medidas confiables no
    // se saca nada del DOM, y la lista se comporta como un "cargar más" común.
    return index === elements.length ? byPage : null
  }

  function measure(byPage: Map<number, HTMLElement[]>) {
    const list = listElement()
    if (!list) return
    gap = Number.parseFloat(getComputedStyle(list).rowGap) || 0
    for (let page = windowStart.value; page <= windowEnd.value; page++) {
      const own = byPage.get(page)
      if (!own?.length) continue
      const top = own[0]!.getBoundingClientRect().top
      const next = byPage.get(page + 1)
      if (next?.length) {
        heights.set(page, next[0]!.getBoundingClientRect().top - top)
        continue
      }
      let bottom = top
      for (const el of own) bottom = Math.max(bottom, el.getBoundingClientRect().bottom)
      // Lo que separa esta página de la siguiente: el `gap` de la grilla o, en una lista de
      // bloques (las filas-tarjeta de una tabla en el teléfono), el margen del último ítem.
      const margin = Number.parseFloat(getComputedStyle(own[own.length - 1]!).marginBottom) || 0
      heights.set(page, bottom - top + gap + margin)
    }
  }

  function fetchInto(page: number): Promise<readonly T[] | null> {
    const pending = inflight.get(page)
    if (pending) return pending
    controller ??= new AbortController()
    const signal = controller.signal
    const key = baseKey
    const promise = options
      .fetchPage(page, signal)
      .then(list => {
        if (signal.aborted || key !== baseKey) return null
        spare.set(page, list)
        return list
      })
      .catch(error => {
        if (signal.aborted || key !== baseKey) return null
        throw error
      })
      .finally(() => inflight.delete(page))
    inflight.set(page, promise)
    return promise
  }

  async function append() {
    const page = last.value + 1
    status.value = 'loading'
    try {
      const list = await fetchInto(page)
      if (!list) return
      spare.delete(page)
      if (!list.length) {
        status.value = 'done'
        return
      }
      last.value = page
      if (windowEnd.value === page - 1) {
        const next = new Map(pages.value)
        next.set(page, list)
        pages.value = next
        windowEnd.value = page
      } else {
        spare.set(page, list)
      }
      autoLoaded.value++
      status.value = page >= options.pageCount() ? 'done' : 'idle'
    } catch {
      status.value = 'error'
    }
    schedule()
  }

  async function loadPrevious() {
    if (!canLoadPrevious.value || previousStatus.value === 'loading') return
    const page = first.value - 1
    previousStatus.value = 'loading'
    try {
      const list = await fetchInto(page)
      if (!list) return
      spare.delete(page)
      // Aparece donde estaba el botón, delante de lo que se mira: es lo que se pidió ver.
      const next = new Map(pages.value)
      next.set(page, list)
      pages.value = next
      first.value = page
      windowStart.value = page
      previousStatus.value = 'idle'
    } catch {
      previousStatus.value = 'error'
    }
    schedule()
  }

  /** El primer elemento todavía visible de una página que se queda, y dónde está. */
  function pickAnchor(byPage: Map<number, HTMLElement[]>, target: FeedWindow) {
    for (
      let page = Math.max(target.start, windowStart.value);
      page <= Math.min(target.end, windowEnd.value);
      page++
    ) {
      for (const el of byPage.get(page) ?? []) {
        const rect = el.getBoundingClientRect()
        if (rect.bottom > 0) return { el, top: rect.top }
      }
    }
    return null
  }

  async function moveWindow(target: FeedWindow, byPage: Map<number, HTMLElement[]>) {
    moving = true
    try {
      const missing = range(target.start, target.end).filter(
        page => !pages.value.has(page) && !spare.get(page)
      )
      if (missing.length) {
        // Se piden y se vuelve a calcular: mientras tanto el visitante pudo seguir bajando.
        await Promise.all(missing.map(fetchInto))
        return
      }
      const anchor = pickAnchor(byPage, target)
      const next = new Map<number, readonly T[]>()
      for (const page of range(target.start, target.end)) {
        next.set(page, pages.value.get(page) ?? spare.get(page)!)
        spare.delete(page)
      }
      for (const [page, list] of pages.value) {
        if (page < target.start || page > target.end) spare.set(page, list)
      }
      pages.value = next
      windowStart.value = target.start
      windowEnd.value = target.end
      spacers()
      await nextTick()
      // Con los altos medidos el ancla no se mueve; si se movió (cambió el ancho y con él las
      // columnas), se corrige en el acto para que lo que se está mirando no salte.
      if (anchor?.el.isConnected) {
        const drift = anchor.el.getBoundingClientRect().top - anchor.top
        if (Math.abs(drift) > 1) window.scrollBy({ top: drift, behavior: 'instant' })
      }
    } catch {
      status.value = 'error'
    } finally {
      moving = false
      schedule()
    }
  }

  function sync() {
    if (!active.value || awaitingItems || moving) return
    const byPage = pageElements()
    if (!byPage) {
      // Sin medidas: sólo agregar al acercarse al final.
      const bottom = listElement()?.getBoundingClientRect().bottom ?? Infinity
      if (bottom - window.innerHeight < FEED_PREFETCH_MARGIN) decideAppend(0, 0, true)
      return
    }
    measure(byPage)
    const firstEl = byPage.get(windowStart.value)?.[0]
    if (!firstEl) return
    const originTop =
      firstEl.getBoundingClientRect().top - (topSpace.value > 0 ? topSpace.value + gap : 0)
    const viewTop = -originTop
    const viewBottom = window.innerHeight - originTop
    const knownHeight = feedOffsets(first.value, last.value, heights).get(last.value)!.bottom
    visiblePage.value = feedPageAt(first.value, last.value, heights, (viewTop + viewBottom) / 2)
    decideAppend(viewBottom, knownHeight, false)

    const input = { first: first.value, last: last.value, heights, viewTop, viewBottom }
    const desired = feedDesiredWindow({
      ...input,
      margin: FEED_PREFETCH_MARGIN,
      maxPages: maxPages.value,
    })
    // Lo que está EN pantalla nunca se saca, aunque supere el techo (páginas muy cortas).
    const onScreen = feedPagesOnScreen(input)
    const target = onScreen
      ? { start: Math.min(desired.start, onScreen.start), end: Math.max(desired.end, onScreen.end) }
      : desired
    if (target.start !== windowStart.value || target.end !== windowEnd.value) {
      void moveWindow(target, byPage)
    }
  }

  function decideAppend(viewBottom: number, knownHeight: number, nearEnd: boolean) {
    if (status.value === 'loading' || status.value === 'error') return
    const decision = feedAppendDecision({
      viewBottom: nearEnd ? Infinity : viewBottom,
      margin: FEED_PREFETCH_MARGIN,
      knownHeight,
      last: last.value,
      pageCount: options.pageCount(),
      autoLoaded: autoLoaded.value,
      pausePages: pausePages.value,
    })
    if (decision === 'done') status.value = 'done'
    else if (decision === 'pause') status.value = 'paused'
    else if (decision === 'load') void append()
  }

  function schedule() {
    if (!import.meta.client || frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      sync()
    })
  }

  function attach() {
    if (!import.meta.client || attached) return
    attached = true
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })
    schedule()
  }

  function detach() {
    if (!attached) return
    attached = false
    window.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', schedule)
    if (frame) cancelAnimationFrame(frame)
    frame = 0
  }

  function deactivate() {
    detach()
    controller?.abort()
    controller = null
    inflight.clear()
    spare.clear()
    initialized = false
  }

  /** "Cargar más" después de la pausa: el visitante pidió seguir, se reanuda la tanda. */
  function resume() {
    autoLoaded.value = 0
    status.value = 'idle'
    void append()
  }

  function retry() {
    status.value = 'idle'
    previousStatus.value = 'idle'
    schedule()
  }

  /** Vuelve a la primera página de la búsqueda y suelta todo lo cargado. */
  async function backToTop() {
    reset(options.items())
    await nextTick()
    scrollToPageTop(options.anchorId)
  }

  function setMode(next: ListMode) {
    if (next === listMode.mode.value) return
    if (next === 'paginas' && active.value) {
      // A la paginación parado donde se estaba mirando, no de vuelta a la página de arranque.
      const target = visiblePage.value
      listMode.set('paginas', options.id)
      if (target !== base.value && options.goToPage) options.goToPage(target)
      else nextTick(() => scrollToPageTop(options.anchorId))
      return
    }
    listMode.set(next, options.id)
  }

  watch(
    () => [options.resetKey(), options.page()] as const,
    () => {
      awaitingItems = true
    }
  )
  watch(
    () => options.items(),
    list => {
      if (!active.value) return
      const sameSearch = options.resetKey() === baseKey && options.page() === base.value
      if (awaitingItems || !sameSearch) {
        reset(list)
        return
      }
      // Los mismos filtros con datos refrescados: sólo se reemplaza la página de arranque.
      if (pages.value.has(base.value)) {
        const next = new Map(pages.value)
        next.set(base.value, list)
        pages.value = next
      } else {
        spare.set(base.value, list)
      }
    }
  )
  watch(active, on => {
    if (on) {
      reset(options.items())
      attach()
    } else {
      deactivate()
    }
  })

  function restore(): boolean {
    if (Date.now() - lastPopstate > 3000) return false
    const snapshot = takeFeedSnapshot<T>(options.id, options.resetKey(), options.page(), Date.now())
    if (!snapshot) return false
    reset(options.items())
    for (const [page, height] of snapshot.heights) heights.set(page, height)
    gap = snapshot.gap
    first.value = snapshot.first
    last.value = snapshot.last
    windowStart.value = snapshot.windowStart
    windowEnd.value = snapshot.windowEnd
    pages.value = new Map(snapshot.pages)
    autoLoaded.value = snapshot.autoLoaded
    status.value = snapshot.last >= options.pageCount() ? 'done' : 'idle'
    spacers()
    return true
  }

  // Navegación dentro del sitio (no hidratación): la preferencia ya se puede leer en el setup,
  // y volver con "atrás" arma la ventana guardada ANTES del primer render, así la posición que
  // restaura el router de Nuxt cae sobre los mismos avisos.
  if (import.meta.client && !nuxtApp.isHydrating) {
    listMode.load()
    if (active.value && !restore()) reset(options.items())
  }

  onMounted(() => {
    listMode.load()
    // En la hidratación el cambio de modo lo toma el `watch(active)`; acá sólo lo ya armado.
    if (active.value && initialized) attach()
  })

  onBeforeUnmount(() => {
    if (active.value && initialized && !awaitingItems) {
      saveFeedSnapshot(options.id, {
        resetKey: baseKey,
        startPage: base.value,
        first: first.value,
        last: last.value,
        windowStart: windowStart.value,
        windowEnd: windowEnd.value,
        pages: [...pages.value],
        heights: [...heights],
        gap,
        autoLoaded: autoLoaded.value,
        savedAt: Date.now(),
      })
    }
    deactivate()
  })

  return reactive({
    enabled,
    active,
    items,
    base,
    first,
    last,
    windowStart,
    windowEnd,
    topSpace,
    bottomSpace,
    status,
    previousStatus,
    visiblePage,
    atStart,
    canLoadPrevious,
    pageCount: computed(() => options.pageCount()),
    loadPrevious,
    resume,
    retry,
    backToTop,
    setMode,
  })
}

export type InfiniteFeed = ReturnType<typeof useInfiniteFeed>
