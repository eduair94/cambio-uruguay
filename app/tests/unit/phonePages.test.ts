// app/tests/unit/phonePages.test.ts
//
// Source-text contract for `/celulares-uruguay` and `/celulares-uruguay/<modelo>`, the same kind of
// check `seoContract.test.ts` and `componentResolution.test.ts` already run over the whole site, but
// specific to what THIS family must never regress on: a real 404 for a slug the API does not know
// (via `validate`, before any render), a server-rendered price (`useFetch`, not a client-only
// fetch), the `Product`/`AggregateOffer` JSON-LD this family's SEO depends on, and no rating claim
// this site never measured.
//
// `seoContract.test.ts` covers the generic contract (title/description, canonical, structured data,
// single H1, never noindexed, emitted by the sitemap) via its own `PROGRAMMATIC_PAGES` list, which
// both files below are also added to. This file adds the checks specific to the celulares shape.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const PAGES_DIR = join(__dirname, '..', '..', 'pages', 'celulares-uruguay')
const indexSrc = readFileSync(join(PAGES_DIR, 'index.vue'), 'utf8')
const detailSrc = readFileSync(join(PAGES_DIR, '[modelo].vue'), 'utf8')

/** The template's first element tag, ignoring leading whitespace/comments. */
function rootTag(source: string): string | null {
  const template = source.match(/<template>([\s\S]*)<\/template>/)?.[1] ?? ''
  const withoutComments = template.replace(/<!--[\s\S]*?-->/g, '').trim()
  return withoutComments.match(/^<([A-Z][A-Z0-9]*)/i)?.[1] ?? null
}

function h1Count(source: string): number {
  const template = source.split('<script setup')[0] ?? ''
  return (template.match(/<h1[\s>]/g) ?? []).length
}

/**
 * Strips template comments, block comments and line comments so a source-text check for a banned
 * pattern isn't tripped up by an explanatory comment that mentions the pattern ON PURPOSE (both
 * pages document the URSEC bug this guards against). Mirrors `componentResolution.test.ts`'s own
 * `scriptOf`.
 */
function stripComments(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
}

/**
 * Fix round 1 (2026-09-17): `phoneImportEstimate` leaves `ursecUyu` deliberately separate from
 * `traveler.totalUyu`/`courier.totalUyu` (and the `savingTravelerUyu`/`savingCourierUyu` derived
 * from them) — a page that reads those raw fields as "the total" or "the saving" silently drops the
 * $239 URSEC certificate and systematically favours "conviene traerlo". `phoneImportTotals()` is the
 * one place that adds it back in, on a DIFFERENT object (`importTotals`/`totals`, with its own
 * `travelerTotalUyu`/`courierTotalUyu`/`savingTravelerUyu`/`savingCourierUyu`) — so this can't be a
 * bare "does the property name appear anywhere" check (that would also flag the FIX). It has to be
 * rooted at the known raw-estimate variable names both pages actually use (`estimate`/
 * `importEstimate`, optionally `.value`), which is exactly what a stray `estimate.traveler.totalUyu`
 * or `estimate.savingTravelerUyu` looks like and what `totals.travelerTotalUyu` never does.
 */
function usesRawEstimateTotals(source: string): boolean {
  const code = stripComments(source)
  return (
    /\b(?:importEstimate|estimate)(?:\.value)?\.(?:traveler|courier)\.totalUyu\b/.test(code) ||
    /\b(?:importEstimate|estimate)(?:\.value)?\.saving(?:Traveler|Courier)Uyu\b/.test(code)
  )
}

describe('celulares-uruguay/[modelo].vue', () => {
  it('valida la forma del slug y lo confirma contra la API antes de renderizar (patrón de descuentos-con-tarjeta-uruguay/marca/[marca].vue)', () => {
    expect(detailSrc).toMatch(/definePageMeta\s*\(\s*\{/)
    expect(detailSrc).toMatch(/validate\s*:/)
    expect(detailSrc).toContain('PHONE_SLUG_RE')
    expect(detailSrc).toMatch(/\$fetch\(\s*`\/api\/phones\/\$\{/)
  })

  it('usa useFetch con una clave que incluye el slug y transform (server-rendered, no client-only)', () => {
    expect(detailSrc).toMatch(/useFetch(<[^>]*>)?\(/)
    expect(detailSrc).toMatch(/key:\s*\(\)\s*=>\s*`[^`]*\$\{slug/)
    expect(detailSrc).toMatch(/transform\s*:/)
  })

  it('renderiza exactamente un H1', () => {
    expect(h1Count(detailSrc)).toBe(1)
  })

  it('declara título, descripción y OG con useSeoMeta', () => {
    expect(detailSrc).toMatch(/useSeoMeta\s*\(/)
    expect(detailSrc).toMatch(/\btitle[,:]/)
    expect(detailSrc).toMatch(/\bdescription[,:]/)
    expect(detailSrc).toMatch(/ogTitle:/)
    expect(detailSrc).toMatch(/ogDescription:/)
  })

  it('canonical literal, absoluto y sin prefijo de idioma (nunca localePath)', () => {
    expect(detailSrc).toMatch(/rel:\s*'canonical'/)
    expect(detailSrc).toContain('https://cambio-uruguay.com/celulares-uruguay/')
    // La ruling del controlador: canonical/ogUrl/JSON-LD son strings literales, nunca armados con
    // localePath (que sí se usa para navegación, como los enlaces a los hermanos). Se busca
    // puntualmente la línea que arma `canonical`, no cualquier uso de localePath en el archivo.
    const canonicalLine = detailSrc
      .split('\n')
      .find(line => /\bconst\s+canonical\b/.test(line) || /canonical\s*=\s*computed/.test(line))
    expect(canonicalLine, 'no encontré la línea que define `canonical`').toBeTruthy()
    expect(canonicalLine).not.toContain('localePath')
  })

  it('JSON-LD: BreadcrumbList y Product con AggregateOffer en UYU, sin AggregateRating', () => {
    expect(detailSrc).toContain('application/ld+json')
    expect(detailSrc).toContain('https://schema.org')
    expect(detailSrc).toContain('BreadcrumbList')
    expect(detailSrc).toContain('AggregateOffer')
    expect(detailSrc).toContain('lowPrice')
    expect(detailSrc).toContain('highPrice')
    expect(detailSrc).toContain('offerCount')
    expect(detailSrc).toMatch(/priceCurrency:\s*'UYU'/)
    // El sitio no mide calificaciones: ninguna ficha de producto puede inventar una.
    expect(detailSrc).not.toContain('AggregateRating')
  })

  it('el Product sólo se arma con ofertas NUEVAS (nunca usadas/reacondicionadas en el AggregateOffer)', () => {
    // La banda que alimenta el JSON-LD tiene que ser la de la condición 'new', no un pool de todas.
    expect(detailSrc).toMatch(/\bbands\??\.new\b/)
  })

  it('usa FaqSection, ChartsLineChart dentro de ClientOnly y una VContainer raíz', () => {
    expect(detailSrc).toContain('<FaqSection')
    expect(detailSrc).toContain('<ChartsLineChart')
    expect(detailSrc).toContain('<ClientOnly>')
    expect(rootTag(detailSrc)).toBe('VContainer')
  })

  it('nunca se declara noindex', () => {
    expect(detailSrc).not.toMatch(/noindex/i)
  })

  it('el enlace externo de cada oferta lleva rel nofollow noopener y target _blank', () => {
    expect(detailSrc).toMatch(/rel="nofollow noopener"/)
    expect(detailSrc).toMatch(/target="_blank"/)
  })

  it('el aviso de eSIM usa exactamente el texto acordado, condicionado a esimOnlySeen', () => {
    expect(detailSrc).toContain('esimOnlySeen')
    // Espacios/saltos de línea normalizados: la plantilla puede envolver la frase en varias líneas,
    // lo que importa es que el TEXTO acordado esté intacto.
    const normalized = detailSrc.replace(/\s+/g, ' ')
    expect(normalized).toContain(
      'Algunas ofertas son de equipos sólo eSIM: confirmá que tu compañía lo soporte antes de comprar'
    )
  })

  it('la cuenta de traer el celular de EE.UU. usa phoneImportEstimate y muestra el URSEC', () => {
    expect(detailSrc).toContain('phoneImportEstimate')
    expect(detailSrc).toContain('ursecUyu')
  })

  it('enlaza las guías de aduana existentes, no inventa reglas propias', () => {
    expect(detailSrc).toMatch(/franquicia-viajero-uruguay/)
    expect(detailSrc).toMatch(/franquicia-aduana-uruguay/)
  })

  it('todo total y ahorro pasa por phoneImportTotals, nunca el totalUyu/saving crudo de phoneImportEstimate', () => {
    expect(detailSrc).toContain('phoneImportTotals')
    expect(usesRawEstimateTotals(detailSrc)).toBe(false)
  })

  it('declara la imagen social con defineOgImageComponent', () => {
    expect(detailSrc).toMatch(/defineOgImageComponent\(\s*'Cambio'/)
  })

  it('el enlace "Ver oferta" de cada fila tiene un nombre accesible que distingue vendedor y condición', () => {
    expect(detailSrc).toMatch(
      /aria-label="`Ver oferta[^`]*sellerLabel\(offer\)[^`]*condition[^`]*`"/
    )
  })

  it('si un modelo está a la vez ambiguo y viejo, reasonUnpublishable dice las dos cosas (no sólo la primera)', () => {
    const script = detailSrc.split('<script setup')[1] ?? ''
    const reasonFn = script.slice(
      script.indexOf('reasonUnpublishable'),
      script.indexOf('reasonUnpublishable') + 900
    )
    // Un array acumulado (`reasons.push` dos veces + `reasons.join`), no dos `return` tempranos
    // mutuamente excluyentes: esa es la forma que permite que las dos razones convivan.
    expect(reasonFn.match(/reasons\.push/g)?.length ?? 0).toBeGreaterThanOrEqual(2)
    expect(reasonFn).toMatch(/reasons\.join/)
  })
})

describe('celulares-uruguay/index.vue', () => {
  it('renderiza exactamente un H1', () => {
    expect(h1Count(indexSrc)).toBe(1)
  })

  it('el H1 es el acordado', () => {
    expect(indexSrc).toContain('Precio de celulares en Uruguay: iPhone, Samsung, Motorola y Xiaomi')
  })

  it('enlaza cada modelo con localePath a su propia ficha', () => {
    expect(indexSrc).toMatch(/localePath\(`\/celulares-uruguay\/\$\{/)
  })

  it('declara título, descripción, OG y canonical literal', () => {
    expect(indexSrc).toMatch(/useSeoMeta\s*\(/)
    expect(indexSrc).toMatch(/ogTitle:/)
    expect(indexSrc).toMatch(/ogDescription:/)
    expect(indexSrc).toMatch(/rel:\s*'canonical'/)
    expect(indexSrc).toContain("'https://cambio-uruguay.com/celulares-uruguay'")
  })

  it('JSON-LD: BreadcrumbList + ItemList de fichas', () => {
    expect(indexSrc).toContain('application/ld+json')
    expect(indexSrc).toContain('BreadcrumbList')
    expect(indexSrc).toContain('ItemList')
  })

  it('trae la sección de traer el celular de EE.UU. con la tabla de PHONE_US_PRICES', () => {
    expect(indexSrc).toContain('PHONE_US_PRICES')
    expect(indexSrc).toContain('phoneImportEstimate')
  })

  it('raíz VContainer y nunca noindex', () => {
    expect(rootTag(indexSrc)).toBe('VContainer')
    expect(indexSrc).not.toMatch(/noindex/i)
  })

  it('usa FaqSection', () => {
    expect(indexSrc).toContain('<FaqSection')
  })

  it('la tabla de traer de EE.UU. usa phoneImportTotals, nunca el totalUyu crudo de phoneImportEstimate', () => {
    expect(indexSrc).toContain('phoneImportTotals')
    expect(usesRawEstimateTotals(indexSrc)).toBe(false)
  })

  it('declara la imagen social con defineOgImageComponent', () => {
    expect(indexSrc).toMatch(/defineOgImageComponent\(\s*'Cambio'/)
  })
})
