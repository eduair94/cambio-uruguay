// Cómo se MIDE la tarjeta de captación de emails. `capture.ts` decide dónde se
// muestra; esto decide qué se cuenta.
//
// WHY: el 17-08-2026 un solo tuit puso 1.225 sesiones en
// /tarjetas-de-credito-uruguay (17 % de rebote, 179 s — el mejor enganche que el
// sitio midió nunca) y GA4 registró 1.274 `newsletter_capture_view` en esa
// ventana. El evento salía del `watch(visible)` del componente, y `remembered`
// arranca en `true`: el onMounted lo baja, el watch corre y el evento sale con la
// tarjeta recién insertada en el DOM, a pantallas de distancia del lector. Las
// 1.274 vistas medían "la tarjeta se montó". Contra ese número no se puede
// calcular ninguna tasa, así que todo experimento sobre la tarjeta —cambiarle el
// texto, moverla, agregarle algo— salía infalsificable. Primero la medición.
//
// PURE (sin Vue ni Nuxt) para que vitest-node pueda ejercitarla: el observador y
// el sessionStorage se inyectan.

/** La firma de `useTrack()`, repetida acá para no importar nada del runtime. */
export type TrackFn = (event: string, params?: Record<string, unknown>) => void

/** Lo mínimo de `Storage` que hace falta; el test le pasa un Map. */
export interface SessionLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/**
 * sessionStorage: ya se contó una vista en esta pestaña.
 *
 * Va en sessionStorage y no en una variable del módulo porque una recarga dentro
 * de la misma sesión de GA4 emitiría una segunda vista y volvería a inflar el
 * denominador — el defecto que se está arreglando, más chico.
 */
export const NEWSLETTER_VIEW_SESSION_KEY = 'cu_nl_seen'

interface ObserverLike {
  observe(el: Element): void
  disconnect(): void
}

type ObserverCtor = new (
  cb: (entries: { isIntersecting: boolean }[]) => void,
  options?: { threshold?: number }
) => ObserverLike

function browserObserver(): ObserverCtor | null {
  return typeof IntersectionObserver === 'undefined'
    ? null
    : (IntersectionObserver as unknown as ObserverCtor)
}

function browserSession(): SessionLike | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage
  } catch {
    // Safari en modo privado tira al TOCAR la propiedad, no al leerla.
    return null
  }
}

/**
 * Avisa una sola vez, cuando `el` entra en pantalla, y suelta el observador.
 *
 * `threshold: 0.5` a propósito: media tarjeta en pantalla es lo más parecido a
 * "una persona pudo leer esto". El `rootMargin: '400px'` que usa `AdSlot` sirve
 * para precargar un anuncio antes de que se vea, que es justo lo contrario de lo
 * que hace falta acá — volvería a contar vistas que nadie tuvo.
 */
export function observeFirstImpression(
  el: Element,
  onVisible: () => void,
  ctor: ObserverCtor | null = browserObserver()
): () => void {
  // Un navegador sin IntersectionObserver no puede decir si la tarjeta se vio, y
  // "no sé" se cuenta como nada: inventar la vista es cómo llegamos hasta acá.
  if (!ctor) return () => {}

  const io = new ctor(
    entries => {
      if (!entries.some(entry => entry.isIntersecting)) return
      io.disconnect()
      onVisible()
    },
    { threshold: 0.5 }
  )
  io.observe(el)
  return () => io.disconnect()
}

/**
 * El que emite `newsletter_capture_view`, como mucho una vez por sesión.
 *
 * Crear el reporter no emite nada: la vista la dispara el observador, nunca el
 * montaje.
 */
export function createNewsletterViewReporter(opts: {
  track: TrackFn
  source: () => string
  session?: () => SessionLike | null
}): { report(): void } {
  let fired = false
  const readSession = opts.session ?? browserSession

  return {
    report(): void {
      if (fired) return
      fired = true // antes de emitir: el guardia también cubre una reentrada

      const store = readSession()
      if (store) {
        try {
          if (store.getItem(NEWSLETTER_VIEW_SESSION_KEY) === '1') return
          store.setItem(NEWSLETTER_VIEW_SESSION_KEY, '1')
        } catch {
          // Sin memoria entre recargas queda el guardia de arriba, que alcanza
          // para la vista de esta página.
        }
      }

      opts.track('newsletter_capture_view', { source: opts.source() })
    },
  }
}

/**
 * El envío del formulario, con los tres momentos separados.
 *
 * Existía sólo el éxito (`newsletter_signup`), y un éxito sin su denominador no
 * es una tasa: 40 altas pueden ser 40 de 45 o 40 de 4.000. La intención sale
 * ANTES del pedido y el resultado DESPUÉS de que resuelve — mover el éxito arriba
 * del await contaría como conversión un backend caído.
 *
 * Los nombres de los eventos se quedan en el componente (y no acá) porque GA4
 * empareja las conversiones por string literal y `ga4-key-events.test.ts` vigila
 * ese call site.
 */
export async function runNewsletterSubmit(opts: {
  post: () => Promise<unknown>
  onSubmit: () => void
  onSuccess: () => void
  onError: () => void
}): Promise<'sent' | 'error'> {
  opts.onSubmit()
  try {
    await opts.post()
  } catch {
    opts.onError()
    return 'error'
  }
  opts.onSuccess()
  return 'sent'
}
