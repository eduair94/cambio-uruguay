// Canonicalization for /historico/[origin]/[currency]/[[type]].
//
// A casa quotes the same currency several ways. BILLETE, CABLE, TRANSFERENCIA and
// INTERBANCARIO are alternate views of the same page and fold into the base
// /historico/{origin}/{currency}, so Google consolidates their signals instead of
// splitting them across near-duplicates.
//
// eBROU FUE la excepción, y la medición la desmintió. Se la había dejado
// self-canonical porque /historico/brou/usd/ebrou "gana 10.717 impresiones
// propias" — pero esas impresiones no eran suyas. Los 28 días al 2026-09-02, de
// Search Console:
//
//   /historico/brou/usd/ebrou   25.808 impresiones →  20 clics (0,078 %) pos 8,4
//   /historico/brou/usd          8.095 impresiones →  83 clics (1,03 %)  pos 8,3
//
// Misma posición, trece veces peor conversión: la página profunda se lleva el
// tráfico de marca ("cotizacion brou", "brou cotizaciones", "dolar brou" —
// 34.259 impresiones y 52 clics repartidos entre tres URLs propias que compiten)
// y no lo convierte, porque quien busca "cotización BROU" ve un título sobre un
// canal que capaz ni conoce. Y la demanda que SÍ dice eBROU es chica y no
// convierte nada: las catorce consultas con "ebrou"/"e brou" suman 1.067
// impresiones y CERO clics en esos mismos 28 días.
//
// Así que ahora también se pliega. La página sigue existiendo y sirviendo el
// canal; lo único que cambia es a quién le atribuye Google la señal.
//
// PURE (no Vue/Nuxt runtime) so it is unit-testable in plain Node.

/**
 * Type segments that are their own page, not a duplicate view of the base.
 *
 * Hoy está VACÍO a propósito, y el helper sigue soportando el caso: si aparece
 * un canal que de verdad tenga demanda propia (consultas con su nombre Y clics),
 * se agrega acá y vuelve a ser página. El criterio para entrar es ese, no que la
 * URL acumule impresiones — eso fue lo que falló con eBROU.
 */
export const SELF_CANONICAL_HISTORY_TYPES: ReadonlySet<string> = new Set<string>()

/**
 * The canonical path for a history detail route.
 *
 * @param origin the casa id, e.g. `'brou'`.
 * @param currency the currency segment as routed, e.g. `'usd'`.
 * @param type the optional `[[type]]` segment as it appeared in the URL.
 * @returns the base path for a duplicate view, or the self path (preserving the
 *   segment's original case, so the canonical equals the URL actually visited).
 */
export function historyDetailCanonicalPath(
  origin: string,
  currency: string,
  type?: string | null
): string {
  const base = `/historico/${origin}/${currency}`
  const raw = String(type ?? '').trim()
  if (!raw) return base
  return SELF_CANONICAL_HISTORY_TYPES.has(raw.toLowerCase()) ? `${base}/${raw}` : base
}

/**
 * True when the `[[type]]` segment is a duplicate view that folds into the base
 * page — i.e. the URL visited is NOT its own canonical.
 *
 * Existe porque la canónica sola no alcanzaba. Medido el 2026-09-22 sobre
 * /historico/brou/usd/ebrou: `rel=canonical` apuntaba al padre, pero los siete
 * `rel=alternate hreflang` (es, es-ES, en, en-US, pt, pt-PT y x-default) que el
 * layout emite para toda ruta seguían apuntando a la variante misma. Google
 * ignora el hreflang de una URL no canónica y la contradicción debilita al
 * grupo entero, así que la página necesita saber si está plegada para re-apuntar
 * esos enlaces al grupo del padre.
 */
export function isFoldedHistoryType(type?: string | null): boolean {
  const raw = String(type ?? '').trim()
  return raw !== '' && !SELF_CANONICAL_HISTORY_TYPES.has(raw.toLowerCase())
}

/**
 * The hreflang cluster exactly as @nuxtjs/i18n emits it from the layout
 * (`useLocaleHead({ key: 'id' })`), so a page can override it link by link.
 *
 * Los `id` importan: unhead deduplica esos `<link>` por `id`, y un `id` es un
 * prop que sobrevive a cualquier sobreescritura — una entrada "vacía" con el
 * mismo `id` imprimiría igual `<link id="i18n-alt-es">`. Lo único que una
 * página puede hacer desde su lado es re-apuntarlos, y para eso tiene que
 * emitir los MISMOS ids que el layout: por código (`i18n-alt-es`), por ISO
 * (`i18n-alt-es-ES`) y el `x-default` (`i18n-xd`), que apunta al idioma por
 * defecto del sitio. Verificado contra el HTML de producción el 2026-09-22.
 */
export const HREFLANG_LOCALES = [
  { code: 'es', iso: 'es-ES' },
  { code: 'en', iso: 'en-US' },
  { code: 'pt', iso: 'pt-PT' },
] as const

export interface HreflangLink {
  id: string
  rel: 'alternate'
  hreflang: string
  href: string
}

/**
 * Builds the seven alternate links for one canonical path.
 *
 * @param urlFor absolute URL of that path in a given locale code (the page
 *   passes its `localePath` wrapped with the site host).
 */
export function hreflangLinksFor(urlFor: (code: string) => string): HreflangLink[] {
  const links: HreflangLink[] = [
    { id: 'i18n-xd', rel: 'alternate', hreflang: 'x-default', href: urlFor('es') },
  ]
  for (const { code, iso } of HREFLANG_LOCALES) {
    const href = urlFor(code)
    links.push({ id: `i18n-alt-${code}`, rel: 'alternate', hreflang: code, href })
    links.push({ id: `i18n-alt-${iso}`, rel: 'alternate', hreflang: iso, href })
  }
  return links
}
