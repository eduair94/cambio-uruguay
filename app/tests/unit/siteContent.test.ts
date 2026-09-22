import { describe, expect, it } from 'vitest'
import {
  buildSiteContentIndex,
  cleanSiteChunkText,
  normalizeSitePath,
  readSitePage,
  searchSiteContent,
  siteContentTokens,
  siteLocaleFallback,
  sitePassage,
  type SiteChunk,
} from '../../server/utils/siteContent'

const chunk = (over: Partial<SiteChunk>): SiteChunk => ({
  path: '/x',
  tier: 'full',
  chunkIndex: 0,
  title: 'X',
  headingPath: 'X',
  text: '',
  crawledAt: '2026-09-21T04:20:00.000Z',
  ...over,
})

const CHUNKS: SiteChunk[] = [
  chunk({
    path: '/franquicia-courier-uruguay',
    title: 'Franquicia courier en Uruguay',
    headingPath: 'Franquicia courier en Uruguay',
    text: 'Cookies para medir visitas y mostrar anuncios. Política de privacidad\nCuánto podés traer por courier sin pagar impuestos: hasta US$ 800 al año en tres envíos.',
  }),
  chunk({
    path: '/franquicia-courier-uruguay',
    chunkIndex: 1,
    title: 'Franquicia courier en Uruguay',
    headingPath: 'Franquicia courier en Uruguay › Qué pasa si te pasás',
    text: 'Por encima de la franquicia el envío paga IVA y aranceles en el régimen general.',
  }),
  chunk({
    path: '/alquilar-en-uruguay',
    title: 'Cómo alquilar en Uruguay',
    headingPath: 'Cómo alquilar en Uruguay › Garantías',
    text: 'La garantía de ANDA, la de Contaduría y el seguro de fianza son las más aceptadas.',
  }),
  chunk({
    path: '/casa/itau',
    tier: 'stub',
    title: 'Itaú: cotización dólar hoy',
    headingPath: 'Itaú: cotización dólar hoy',
    text: 'Dólar en Itaú hoy: compra $38,85, venta $41,25.',
  }),
]

describe('site content index', () => {
  const index = buildSiteContentIndex(CHUNKS, 0)

  it('drops the consent banner the crawler read from the page chrome', () => {
    expect(cleanSiteChunkText(CHUNKS[0]!.text)).not.toMatch(/Cookies/)
    expect(index.pages.get('/franquicia-courier-uruguay')![0]!.text).toMatch(/^Cuánto podés/)
  })

  it('folds accents and drops stopwords', () => {
    expect(siteContentTokens('¿Cuánto cobra Itaú por la garantía?')).toEqual([
      'cuanto',
      'cobra',
      'itau',
      'garantia',
    ])
  })

  it('finds the page that answers, with the passage and its section', () => {
    const [hit] = searchSiteContent(index, 'cuanto puedo traer por courier sin impuestos')
    expect(hit!.path).toBe('/franquicia-courier-uruguay')
    expect(hit!.passages[0]!.text).toMatch(/US\$ 800/)
    expect(hit!.crawledAt).toBe('2026-09-21T04:20:00.000Z')
  })

  it('matches a proper noun written without its accent', () => {
    expect(searchSiteContent(index, 'itau dolar')[0]!.path).toBe('/casa/itau')
  })

  it('returns nothing for a query made only of filler', () => {
    expect(searchSiteContent(index, 'hola che una consulta')).toEqual([])
  })

  it('reads a page in order, with its sections as headings', () => {
    const page = readSitePage(index, '/franquicia-courier-uruguay')!
    expect(page.title).toBe('Franquicia courier en Uruguay')
    expect(page.text).toMatch(/US\$ 800[\s\S]*## Qué pasa si te pasás[\s\S]*régimen general/)
    expect(page.nextOffset).toBeNull()
  })

  it('pages a long text with an offset', () => {
    const first = readSitePage(index, '/franquicia-courier-uruguay', 0, 40)!
    expect(first.text).toHaveLength(40)
    expect(first.nextOffset).toBe(40)
    const next = readSitePage(index, '/franquicia-courier-uruguay', first.nextOffset!, 40)!
    expect(next.offset).toBe(40)
    expect(readSitePage(index, '/no-existe')).toBeNull()
  })
})

describe('sitePassage', () => {
  it('centres a long text on the first query word', () => {
    const text = `${'relleno '.repeat(200)}la garantía de alquiler${' cola'.repeat(200)}`
    const passage = sitePassage(text, ['garantia'], 200)
    expect(passage).toMatch(/^….*garantía de alquiler.*…$/s)
    expect(passage.length).toBeLessThanOrEqual(202)
  })
})

describe('normalizeSitePath', () => {
  it('accepts paths and site URLs, and rejects other hosts', () => {
    expect(normalizeSitePath('https://cambio-uruguay.com/alquilar-en-uruguay/?a=1#b')).toBe(
      '/alquilar-en-uruguay'
    )
    expect(normalizeSitePath('alquilar-en-uruguay')).toBe('/alquilar-en-uruguay')
    expect(normalizeSitePath('https://www.cambio-uruguay.com/')).toBe('/')
    expect(normalizeSitePath('https://example.com/x')).toBeNull()
    expect(normalizeSitePath('//evil.com/x')).toBeNull()
    expect(normalizeSitePath('')).toBeNull()
  })

  it('falls back from a translated URL to the indexed Spanish page', () => {
    expect(siteLocaleFallback('/en/alquilar-en-uruguay')).toBe('/alquilar-en-uruguay')
    expect(siteLocaleFallback('/pt')).toBe('/')
    expect(siteLocaleFallback('/alquilar-en-uruguay')).toBeNull()
  })
})
