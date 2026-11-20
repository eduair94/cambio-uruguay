// What scripts/i18n/autotranslate-job.mjs translates, and what it must leave alone. PURE, so the
// unit tests read the same rules the job runs (tests/unit/autoTranslateJob.test.ts).

/**
 * Which Spanish pages get translated, in which order (lower first). The editorial site first; then
 * the archives whose text, once published, does not change (blog, newsletter); then the
 * directories whose pages are mostly data (discounts, stores, prices), and last the catalogues
 * whose text is listings that come and go. `null` = never: a rental listing's description is
 * the advertiser's text and is gone in days (and those pages live in their own sitemap anyway).
 */
export const FAMILIES = [
  [/^\/guias(?:\/|$)/, 1],
  [
    /^\/(?:glosario|herramientas|temas|importar|convertir|cotizacion|dolar|frontera|couriers-uruguay|tarjetas-de-credito-uruguay|tarjetas-de-debito-uruguay|mutualista|indicadores|videos-de-economia-uruguay|casas-de-cambio)(?:\/|$)/,
    2,
  ],
  [/^\/(?:comparativas|sucursales|historico|casa|sucursal|alquiler)(?:\/|$)/, 4],
  [/^\/(?:blog|newsletter)\//, 5],
  [/^\/(?:descuentos-con-tarjeta-uruguay|tiendas-online-uruguay|precio)\//, 6],
  [
    /^\/(?:autos-usados-uruguay|motos-usadas-uruguay|celulares-uruguay|sillas-escritorio-uruguay|equipar-casa-uruguay|monopatines-electricos-uruguay|bicicletas-electricas-uruguay|venta-viviendas-uruguay|inmobiliarias-uruguay)\//,
    7,
  ],
  [/^\/alquileres\//, null],
]

/** Priority tier of a Spanish path; null when the job does not translate it (yet). */
export function familyOf(path) {
  for (const [pattern, tier] of FAMILIES) if (pattern.test(path)) return tier
  // A top-level page: the editorial core of the site.
  return path.split('/').length <= 2 ? 0 : 3
}

/**
 * The routes of change-log rows still inside their 28-day window (docs/seo/experiments.json):
 * those pages are rendered exactly as before. Two exceptions, both about the rollout itself
 * rather than a page: the language rows (`idiomas-traducidos-por-maquina*`,
 * `traduccion-por-maquina*`), and any locale-wide route like `/fr/*`, which would otherwise
 * reserve the whole site.
 */
export function embargoRoutes(experiments, today = new Date()) {
  const since = new Date(today.getTime() - 28 * 86_400_000).toISOString().slice(0, 10)
  const routes = new Set()
  for (const row of experiments ?? []) {
    if (!row?.shippedOn || row.shippedOn < since) continue
    if (/^(?:idiomas-traducidos-por-maquina|traduccion-por-maquina)/.test(String(row.id))) continue
    for (const route of row.routes ?? []) {
      if (/^\/[a-z]{2}\/\*$/.test(route)) continue
      routes.add(route)
    }
  }
  return [...routes]
}

/**
 * The job's translation order: one group per family (reserved pages after every family, since
 * they cannot be announced before their window closes), each with the hashes it is the first to
 * need. `pages` come sorted by priority; a hash shared by several families goes to the first.
 *
 * @param {Array<{ _id: string, tier?: number, segs?: Array<[string, number]> }>} pages
 * @param {(path: string) => boolean} isReserved
 * @returns {Array<{ key: string, hashes: string[] }>} groups in translation order
 */
export function translationGroups(pages, isReserved) {
  const groups = new Map()
  const seen = new Set()
  for (const page of pages) {
    const key = `${isReserved(page._id) ? 1 : 0}:${page.tier ?? 9}`
    if (!groups.has(key)) groups.set(key, [])
    const hashes = groups.get(key)
    for (const [hash] of page.segs ?? []) {
      if (seen.has(hash)) continue
      seen.add(hash)
      hashes.push(hash)
    }
  }
  return [...groups]
    .map(([key, hashes]) => ({ key, hashes }))
    .sort((a, b) => {
      const [reservedA, tierA] = a.key.split(':').map(Number)
      const [reservedB, tierB] = b.key.split(':').map(Number)
      return reservedA - reservedB || tierA - tierB
    })
}

/**
 * How many times a segment may come back invalid before the job stops asking for it. Once: every
 * attempt already tries three token styles on the example and on the template, and what fails is
 * the content, not luck ("Destinatario menor de edad" → "Recipient under the age of 18" invents a
 * figure; "te jubilás a los" → "retire at age 10" too). A refusal is not a failure.
 */
export const FAILURE_LIMIT = 1

/**
 * Whether a remembered failure (`autotranslationfailures`, `{ n, at }`) is skipped. It is retried
 * once its last failure is older than `retryAfter` (a timestamp): the checks or the service may
 * have changed since.
 */
export function giveUp(row, retryAfter) {
  return (row?.n ?? 0) >= FAILURE_LIMIT && new Date(row.at).getTime() > retryAfter
}

/** Locales that go through every family before the others start one: most of the traffic. */
export const FIRST_LOCALES = ['en', 'pt']

/**
 * The (group, locale) pairs in the order the job translates them: English and Portuguese
 * through every family first (a blog post in English is worth more than a 39th language of the
 * same editorial page), then family by family, every other locale in turn.
 *
 * @param {Array<{ key: string, hashes: string[] }>} groups as translationGroups returns them
 * @param {string[]} locales in priority order
 * @returns {Array<{ group: { key: string, hashes: string[] }, locale: string }>} the pairs
 */
export function translationOrder(groups, locales) {
  const first = locales.filter(locale => FIRST_LOCALES.includes(locale))
  const rest = locales.filter(locale => !FIRST_LOCALES.includes(locale))
  return [
    ...first.flatMap(locale => groups.map(group => ({ group, locale }))),
    ...groups.flatMap(group => rest.map(locale => ({ group, locale }))),
  ]
}
