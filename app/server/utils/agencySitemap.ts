import { agencyIndexable, type AgencySummary } from '../../utils/agencies'
import { agencyKey } from '../../utils/propertyAdvertiser'
import { loadAgencyDirectory } from './agencies'
import { disconnectDbAfterPrerender } from './db'

const LOCALES = [
  { prefix: '', hreflang: 'es-ES' },
  { prefix: '/en', hreflang: 'en-US' },
  { prefix: '/pt', hreflang: 'pt-PT' },
] as const

/**
 * Las fichas indexables de inmobiliarias, en los tres idiomas. A diferencia de las de alquiler,
 * la ficha de inmobiliaria es `index,follow` en EN y PT (la página no distingue idioma), así que
 * el sitemap declara las tres con sus alternativas, igual que la propia página en su `<head>`.
 *
 * La clave va CRUDA (`infocasas:13651`), no por `agencyPath`, que la codifica: el módulo de sitemap
 * vuelve a codificar el camino y el `%3A` saldría como `%253A`, una URL distinta de la canónica.
 * `agencyKey` ya la restringe a `[\w-]` después de los dos puntos.
 *
 * Sin `lastmod`: la última vez que vimos un aviso de la inmobiliaria no prueba que su ficha haya
 * cambiado, el mismo criterio que alquileres y ventas.
 */
export function agencySitemapUrls(rows: AgencySummary[]) {
  const urls: Array<{ loc: string; alternatives: Array<{ hreflang: string; href: string }> }> = []
  const seen = new Set<string>()
  for (const row of rows) {
    const key = agencyKey(row.agency?.key)
    if (!key || seen.has(key) || !agencyIndexable(row)) continue
    seen.add(key)
    const path = `/inmobiliarias-uruguay/${key}`
    const alternatives = [
      ...LOCALES.map(locale => ({ hreflang: locale.hreflang, href: `${locale.prefix}${path}` })),
      { hreflang: 'x-default', href: path },
    ]
    for (const locale of LOCALES) urls.push({ loc: `${locale.prefix}${path}`, alternatives })
  }
  return urls
}

export async function loadAgencySitemapUrls() {
  try {
    const urls = agencySitemapUrls(await loadAgencyDirectory())
    // Un directorio vacío es una lectura fallida, no un veredicto: si se devolviera, el handler
    // cacheado lo guardaría y el sitemap se quedaría una hora sin las fichas que tenía.
    if (!urls.length) throw new Error('Agency directory returned no indexable agencies')
    return urls
  } finally {
    await disconnectDbAfterPrerender()
  }
}
