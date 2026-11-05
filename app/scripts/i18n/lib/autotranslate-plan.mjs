// What scripts/i18n/autotranslate-job.mjs translates, and what it must leave alone. PURE, so the
// unit tests read the same rules the job runs (tests/unit/autoTranslateJob.test.ts).

/**
 * Which Spanish pages get translated, in which order (lower first). `null` = not now: the
 * catalogues whose text is mostly data (listings, prices, addresses, Reddit quotes) would fill
 * the memory with text that changes every day, and their template text is the same as a sibling
 * page's anyway. They can be added here once the editorial site is done.
 */
export const FAMILIES = [
  [/^\/guias(?:\/|$)/, 1],
  [
    /^\/(?:glosario|herramientas|temas|importar|convertir|cotizacion|dolar|frontera|couriers-uruguay|tarjetas-de-credito-uruguay|tarjetas-de-debito-uruguay|mutualista|indicadores|videos-de-economia-uruguay|casas-de-cambio)(?:\/|$)/,
    2,
  ],
  [/^\/(?:comparativas|sucursales|historico|casa|sucursal|alquiler)(?:\/|$)/, 4],
  [
    /^\/(?:alquileres|autos-usados-uruguay|motos-usadas-uruguay|celulares-uruguay|precio|descuentos-con-tarjeta-uruguay|sillas-escritorio-uruguay|equipar-casa-uruguay|tiendas-online-uruguay|monopatines-electricos-uruguay|bicicletas-electricas-uruguay|venta-viviendas-uruguay|inmobiliarias-uruguay|newsletter|blog)\//,
    null,
  ],
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
