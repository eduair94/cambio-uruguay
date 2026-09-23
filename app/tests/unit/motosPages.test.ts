// Contrato de fuente de `/motos-usadas-uruguay` y `/motos-usadas-uruguay/<marca>-<modelo>`: la
// misma clase de comprobación que ya corren `seoContract.test.ts` y `pageContainer.test.ts` sobre
// todo el sitio, pero específica de lo que ESTA familia no puede perder.
//
// Todo lo que se vigila acá se rompe en silencio: el precio que no se renderiza en el servidor (el
// buscador ve una tabla vacía), la clave imposible que no 404ea antes de setup, el `aggregateRating`
// que este sitio nunca midió, y el estado "todavía no hay datos" — que el día del deploy es el
// único estado que existe, porque el job no corrió nunca.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const PAGES_DIR = join(__dirname, '..', '..', 'pages', 'motos-usadas-uruguay')
const indexSrc = readFileSync(join(PAGES_DIR, 'index.vue'), 'utf8')
const detailSrc = readFileSync(join(PAGES_DIR, '[key].vue'), 'utf8')
const pages: Array<[string, string]> = [
  ['index.vue', indexSrc],
  ['[key].vue', detailSrc],
]

/** El primer tag del template, salteando comentarios y espacios. */
function rootTag(source: string): string | null {
  const template = source.match(/<template>([\s\S]*)<\/template>/)?.[1] ?? ''
  const withoutComments = template.replace(/<!--[\s\S]*?-->/g, '').trim()
  return withoutComments.match(/^<([A-Z][A-Z0-9]*)/i)?.[1] ?? null
}

/** El template sin comentarios: un comentario que menciona a propósito un patrón prohibido no
 * puede hacer fallar la búsqueda de ese patrón. */
function templateOf(source: string): string {
  return (source.match(/<template>([\s\S]*)<\/template>/)?.[1] ?? '').replace(
    /<!--[\s\S]*?-->/g,
    ''
  )
}

/**
 * El archivo entero sin comentarios de ningún tipo. La ficha EXPLICA por qué no declara
 * `aggregateRating`, así que buscar el patrón sobre el fuente crudo se dispararía con la
 * explicación — que es justo el comentario que hay que conservar. Mismo `stripComments` que usa
 * `componentResolution.test.ts`.
 */
function stripComments(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

describe.each(pages)('%s: contrato compartido', (_file, src) => {
  it('arranca en un VContainer', () => {
    // El layout sólo aporta 12 px; el resto del margen lateral lo pone el container de la página.
    expect(rootTag(src)).toBe('VContainer')
  })

  it('declara exactamente un h1', () => {
    expect(templateOf(src).match(/<h1[\s>]/g) ?? []).toHaveLength(1)
  })

  it('declara título, descripción y canonical', () => {
    expect(src).toContain('useSeoMeta(')
    expect(src).toMatch(/description/)
    expect(src).toMatch(/rel: 'canonical'/)
  })

  it('renderiza en el servidor: el precio tiene que estar en el HTML que lee el buscador', () => {
    expect(src).toContain('await useAsyncData')
    expect(src).not.toContain('server: false')
  })

  it('no mete un VChip dentro de un <p>: rompería la hidratación de toda la página', () => {
    // VChip renderiza un <div>; el parser cierra el <p> antes y el DOM del servidor deja de
    // coincidir. La página se ve bien y ningún control reacciona.
    expect(templateOf(src)).not.toMatch(/<p[^>]*>[\s\S]{0,400}?<VChip/)
  })

  it('el canonical es literal y absoluto, nunca armado con localePath', () => {
    expect(src).toContain('https://cambio-uruguay.com')
    expect(src).not.toMatch(/canonical[^\n]*localePath/)
  })

  it('no repite el FAQPage: lo emite FaqSection', () => {
    expect(src).toContain('<FaqSection')
    expect(src).not.toContain("'@type': 'FAQPage'")
  })

  it('dice que los precios son pedidos y no de venta', () => {
    expect(src).toContain('pedidos')
    expect(src).toContain('no precios de venta cerrados')
  })

  it('la tabla ancha se apila como tarjetas en el celular', () => {
    expect(src).toContain('cu-mobile-cards')
    expect((src.match(/data-label=/g) ?? []).length).toBeGreaterThanOrEqual(5)
  })

  it('enlaza el comparador de transporte', () => {
    expect(src).toContain('MOTOS_COMPARADOR_PATH')
  })
})

describe('index.vue: el directorio', () => {
  it('tiene un estado para "el job todavía no corrió"', () => {
    // El día del deploy no hay un solo aviso. Sin este estado la página parece un mercado vacío.
    expect(indexSrc).toContain("payload.status === 'preparing'")
    expect(indexSrc).toContain('El relevamiento está arrancando')
  })

  it('distingue "no hay datos" de "no pudimos leer"', () => {
    expect(indexSrc).toContain("payload.status === 'unavailable'")
    expect(indexSrc).toContain('No es que no haya motos')
  })

  it('nunca deja `data` en null: la plantilla se dibuja igual', () => {
    // Sin el piso vacío, un fallo de red revienta el template antes de hidratar.
    expect(indexSrc).toContain('motoEmptyList(query.value')
  })

  it('no indexa las combinaciones de filtros', () => {
    expect(indexSrc).toContain('motoFiltered(query.value)')
    expect(indexSrc).toContain("'noindex, follow'")
  })

  it('el tope de precio dice que es en dólares y por qué', () => {
    expect(indexSrc).toContain('prefix="USD"')
    expect(indexSrc).toContain('única escala')
  })

  it('cada aviso se imprime en SU moneda, no convertido', () => {
    expect(indexSrc).toContain('motoMoney(item.price, item.currency)')
  })

  it('un aviso eléctrico enlaza a su propia ficha', () => {
    // La ficha de una línea eléctrica es otra (`<marca-modelo>-electrica`): enlazar a la de nafta
    // llevaría a la banda equivocada, o a un 404.
    expect(indexSrc).toContain('motoFichaSlug(item)')
  })

  it('enlaza también el directorio de autos usados', () => {
    expect(indexSrc).toContain('MOTOS_AUTOS_PATH')
  })
})

describe('[key].vue: la ficha', () => {
  it('una clave imposible 404ea antes de entrar a setup', () => {
    expect(detailSrc).toContain('definePageMeta(')
    expect(detailSrc).toContain('motoKeyValid(')
  })

  it('un fallo de base no se sirve como 404', () => {
    expect(detailSrc).toContain('failureCode')
    expect(detailSrc).toContain('503')
    expect(detailSrc).toContain('no-store')
  })

  it('publica AggregateOffer y ninguna calificación inventada', () => {
    // `AggregateOffer` y no `Offer`: lo que se publica es una banda sobre varios avisos de
    // terceros, no una venta nuestra. Y ninguna calificación: el sitio no mide reseñas de motos.
    const code = stripComments(detailSrc)
    expect(code).toContain("'@type': 'AggregateOffer'")
    expect(code).not.toContain('aggregateRating')
    expect(code).not.toContain('ratingValue')
  })

  it('se abstiene de la depreciación en vez de inventar una pendiente', () => {
    expect(detailSrc).toContain('model.annualDrop != null')
    expect(detailSrc).toContain('no podemos medir la depreciación')
  })

  it('dice que no hay banda en vez de publicar una mediana de dos avisos', () => {
    expect(detailSrc).toContain('avisos suficientes de este modelo')
  })

  it('sobrevive a `model === null` sin lecturas ansiosas', () => {
    // Una lectura ansiosa sobre una ficha que no existe tira dentro de setup y Nitro pisa el 404
    // con un 500 — el mismo defecto que ya se midió en la ficha de autos.
    expect(detailSrc).toContain('data.value?.model ?? null')
    expect(detailSrc).not.toContain('data.value!.model')
  })
})
