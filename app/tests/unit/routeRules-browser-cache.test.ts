import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

// A `cache-control` that says only `s-maxage` is not a half-configured header, it
// is an unfinished sentence: `s-maxage` speaks to shared caches and says nothing
// about the browser. Cloudflare fills that silence with its Browser Cache TTL,
// and this zone has it set to a year.
//
// Measured 2026-09-04 against production:
//
//   origin  (:3311)  cache-control: s-maxage=3600
//   edge    (public) cache-control: max-age=31536000, s-maxage=3600
//
// The `max-age=31536000` is not in this repo — the edge appends it. The damage is
// not a stale headline: `/_nuxt/<hash>.js` filenames change every deploy, so a
// year-old HTML asks for 45 scripts that now 404 (verified: a stale hash returns
// 404), the app never hydrates, and the tab just spins. A repeat visitor is hit
// hardest, and a hard refresh "fixes" it until the next deploy — which is exactly
// what makes it read as random.
//
// What this test does NOT prove, measured the hard way by shipping the fix and
// re-measuring: the value written here is not what a visitor receives. Cloudflare
// overwrites `max-age` on anything it considers edge-cacheable, so `/` went out
// as `max-age=0` and arrived as `max-age=31536000`. `/sw.js` survives only because
// it declares no `s-maxage` and is therefore not edge-cached.
//
// On 2026-09-06 at 05:02:47 UTC the zone was changed to Respect Existing Headers.
// Production HIT responses then kept max-age=0 for both / and /widget while
// retaining their shared TTLs (3600 and 300 seconds). The dashboard correction,
// not another identical origin-header deploy, fixed the measured override.
// This file guards the half that lives in the repo:
// the origin must keep saying the honest thing, or the dashboard setting has
// nothing correct to respect. Verifying the edge belongs in a probe against
// production, not in a unit test — so do not read a green run here as proof that
// visitors revalidate.
const config = readFileSync(resolve(__dirname, '../../nuxt.config.ts'), 'utf-8')

/**
 * Pull the `cache-control` string out of every routeRule, keyed by route.
 *
 * Brace-balanced rather than indentation-matched: the rules are written both
 * inline and expanded, and a regex pinned to one closing indent silently skips
 * the other half — which would make the assertions below pass by finding
 * nothing.
 */
function cacheControlByRoute(): Map<string, string> {
  const found = new Map<string, string>()
  const start = config.indexOf('routeRules: {')
  if (start === -1) return found

  const header = /(['"])([^'"]+)\1\s*:\s*\{/g
  for (const match of config.slice(start).matchAll(header)) {
    const route = match[2]
    // Walk from the rule's `{` to its matching `}`.
    let depth = 0
    let i = start + match.index! + match[0].length - 1
    const from = i
    for (; i < config.length; i++) {
      if (config[i] === '{') depth++
      else if (config[i] === '}' && --depth === 0) break
    }
    const cc = config.slice(from, i).match(/['"]cache-control['"]\s*:\s*['"]([^'"]*)['"]/i)
    if (cc && !found.has(route)) found.set(route, cc[1])
  }
  return found
}

/**
 * Routes that serve an HTML document. An asset under a content-hashed path may
 * be immutable; a document may not, because its body names those hashes.
 *
 * Derived, not listed: a hand-kept list only guards the routes someone remembered
 * to add. With the edge respecting origin headers, every new document policy
 * must continue to ask the browser to revalidate after deployments.
 */
function documentRoutes(): string[] {
  // An asset route names a file: it carries an extension, an extension set, or
  // sits under a directory that only ever holds build output or well-known
  // metadata. Everything else in routeRules answers with HTML.
  const ASSET = [
    /\.([a-z0-9]{2,5}|\*)$/i, // /sw.js, /favicon.*
    /\{[^}]*\}/, // /**/*.{png,jpg,…}
    /^\/_nuxt\//, // hashed build output
    /^\/\.well-known\//, // metadata documents, not pages
  ]
  return [...cacheControlByRoute().keys()].filter(
    route => !ASSET.some(pattern => pattern.test(route))
  )
}

const DOCUMENT_ROUTES = documentRoutes()

describe('routeRules cache-control', () => {
  it('finds the cache-control declarations it means to check', () => {
    const rules = cacheControlByRoute()
    // Guard the parser itself: a regex that silently matches nothing would make
    // every assertion below vacuously true.
    expect(rules.get('/')).toBeTypeOf('string')
    expect(rules.get('/sw.js')).toMatch(/max-age=0/)
    expect(rules.get('/_nuxt/**')).toMatch(/immutable/)
    // Y una de las reglas por familia, para que un refactor del bloque (un helper, un spread)
    // no lo vuelva invisible a este parser sin que nadie se entere.
    expect(rules.get('/en/guias/**')).toBeTypeOf('string')
  })

  it.each(DOCUMENT_ROUTES)(
    'declares an explicit browser max-age for the document route %s',
    route => {
      const value = cacheControlByRoute().get(route)
      expect(value, `routeRules['${route}'] declares no cache-control`).toBeTypeOf('string')
      // `s-maxage` alone leaves the browser TTL to whatever sits in front of us.
      expect(
        value,
        `routeRules['${route}'] = "${value}" declares only a shared-cache TTL. ` +
          'Cloudflare will supply the browser one (this zone: 1 year), pinning HTML ' +
          'that points at content-hashed assets which 404 after the next deploy.'
      ).toMatch(/(^|[\s,])max-age=/)
    }
  )

  it('does not let a document route be cached immutably by the browser', () => {
    for (const route of DOCUMENT_ROUTES) {
      const value = cacheControlByRoute().get(route) ?? ''
      expect(value, `routeRules['${route}'] is immutable`).not.toMatch(/immutable/)
      const maxAge = Number(value.match(/(?:^|[\s,])max-age=(\d+)/)?.[1] ?? NaN)
      // Every navigation must revalidate after a deployment changes asset hashes.
      expect(maxAge, `routeRules['${route}'] browser max-age=${maxAge}`).toBe(0)
      expect(value, `routeRules['${route}'] must reject stale browser reuse`).toMatch(
        /(?:^|[\s,])must-revalidate(?:,|$)/
      )
    }
  })

  it('retains useful edge caching after the Cloudflare browser-TTL correction', () => {
    expect(cacheControlByRoute().get('/')).toMatch(/(?:^|[\s,])s-maxage=3600(?:,|$)/)
    expect(cacheControlByRoute().get('/widget')).toMatch(/(?:^|[\s,])s-maxage=300(?:,|$)/)
  })

  // Un cambio accidental de TTL no rompe nada y no lo ve nadie: se fija acá por familia.
  // Los tres idiomas y las dos formas (índice pelado y `/**`) tienen que decir lo mismo.
  it.each([
    ['guias', 86400],
    ['comparativas', 86400],
    ['glosario', 86400],
    ['importar', 86400],
    ['sucursales', 3600],
    ['sucursal', 3600],
    ['historico', 600],
    ['cotizacion', 600],
  ])('edge-caches the %s family for %i s in every locale and form', (family, ttl) => {
    const rules = cacheControlByRoute()
    for (const locale of ['', '/en', '/pt']) {
      for (const route of [`${locale}/${family}`, `${locale}/${family}/**`]) {
        expect(rules.get(route), route).toMatch(new RegExp(`(?:^|[\\s,])s-maxage=${ttl}(?:,|$)`))
      }
    }
  })

  it('edge-caches /casa/** (no bare index exists) for an hour in every locale', () => {
    const rules = cacheControlByRoute()
    for (const route of ['/casa/**', '/en/casa/**', '/pt/casa/**']) {
      expect(rules.get(route), route).toMatch(/(?:^|[\s,])s-maxage=3600(?:,|$)/)
    }
    expect(rules.has('/casa'), 'there is no /casa index page to cache').toBe(false)
  })

  it('edge-caches the flat question pages for six hours, by exact path only', () => {
    const rules = cacheControlByRoute()
    for (const slug of [
      'denunciar-ruidos-molestos-uruguay',
      'tarjetas-de-credito-uruguay',
      'inversiones-uruguay',
      'trabajo-para-menores-de-edad-uruguay',
      'sala-vip-aeropuerto-uruguay',
      'multas-de-transito-y-patente-uruguay',
      'cambiar-de-mutualista-uruguay',
      'cuanto-sale-la-cedula-de-identidad-uruguaya',
      'comisiones-de-transferencia-uruguay',
      'alquilar-estando-en-clearing',
      'retirar-efectivo-uruguay',
      'impuesto-autos-electricos-uruguay',
      'precio-de-la-nafta-uruguay',
      'devolucion-fonasa-uruguay',
      'salir-del-clearing',
      'prestamo-sin-recibo-de-sueldo-uruguay',
      'garantia-de-alquiler-uruguay',
      'impuesto-temu-uruguay',
      'franquicia-aduana-uruguay',
      'declaracion-de-irpf-uruguay',
      'fecha-de-cobro-bps-uruguay',
      'mejores-prestamos-uruguay',
      'descuentos-con-tarjeta-uruguay',
    ]) {
      for (const locale of ['', '/en', '/pt']) {
        const route = `${locale}/${slug}`
        expect(rules.get(route), route).toMatch(/(?:^|[\s,])s-maxage=21600(?:,|$)/)
      }
      // A glob here would swallow /cuenta, /mi-lista, /estado… and, for the two directories,
      // their own subroutes.
      expect(rules.has(`/${slug}/**`), `/${slug}/** must not exist`).toBe(false)
    }
  })
})
