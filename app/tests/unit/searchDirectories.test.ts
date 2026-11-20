import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { createDeadEndReporter } from '../../utils/searchDeadEnds'
import {
  DIRECTORY_Q_MAX,
  directorySearch,
  directorySearchLinks,
} from '../../utils/searchDirectories'
import { buildSearchIndex } from '../../utils/searchIndex'
import { scoreDocs } from '../../utils/siteNav'

const ctx = { locale: 'es', t: (key: string) => key }
const read = (path: string) => readFileSync(resolve(__dirname, '../..', path), 'utf8')

const tos = (q: string, fromPath?: string) => directorySearchLinks(q, fromPath).map(l => l.to)

describe('directorySearchLinks', () => {
  it('hands a car model to the used-car directory with the query encoded', () => {
    const links = directorySearchLinks('hyundai creta')
    expect(links.map(l => l.to)).toContain('/autos-usados-uruguay?q=hyundai%20creta')
    expect(links[0]).toMatchObject({ id: 'autos', kind: 'query', q: 'hyundai creta' })
  })

  it('picks only the directory the query names, not the whole list', () => {
    expect(tos('hyundai creta')).toEqual(['/autos-usados-uruguay?q=hyundai%20creta'])
    expect(tos('Subaru Impreza')).toEqual(['/autos-usados-uruguay?q=Subaru%20Impreza'])
    expect(tos('alquiler monoambiente')).toEqual(['/alquileres-uruguay?q=alquiler%20monoambiente'])
    expect(tos('heladera no frost')).toEqual([
      '/equipar-casa-uruguay/productos?q=heladera%20no%20frost',
    ])
  })

  it('sends a phone model to /celulares-uruguay filtered by the brand it really has', () => {
    const links = directorySearchLinks('iphone 13')
    expect(links[0]).toMatchObject({
      id: 'celulares',
      kind: 'brand',
      to: '/celulares-uruguay?marca=apple',
      brandLabel: 'Apple',
    })
    expect(links.map(l => l.to)).not.toContain('/autos-usados-uruguay?q=iphone%2013')
    expect(tos('galaxy a15')).toEqual(['/celulares-uruguay?marca=samsung'])
    expect(tos('celular barato')).toEqual(['/celulares-uruguay'])
    // The label the catalogue publishes, not the logo's capitals.
    expect(directorySearchLinks('oppo a79')[0]!.brandLabel).toBe('Oppo')
  })

  it('reads "moto g" as a Motorola phone, and "moto" alone as a motorbike', () => {
    expect(tos('moto g54')).toEqual(['/celulares-uruguay?marca=motorola'])
    expect(tos('moto 110')).toEqual(['/motos-usadas-uruguay'])
  })

  it('sends a motorbike brand to /motos-usadas-uruguay by its catalogue slug', () => {
    expect(tos('zanella sapucai')).toEqual(['/motos-usadas-uruguay?marca=zanella'])
    expect(tos('royal enfield')).toEqual(['/motos-usadas-uruguay?marca=royal-enfield'])
    expect(directorySearchLinks('royal enfield')[0]!.brandLabel).toBe('Royal Enfield')
    expect(directorySearchLinks('ktm duke')[0]!.brandLabel).toBe('KTM')
  })

  it('orders a brand that makes both cars and motorbikes by the rest of the query', () => {
    expect(tos('honda civic')).toEqual([
      '/autos-usados-uruguay?q=honda%20civic',
      '/motos-usadas-uruguay?marca=honda',
    ])
    expect(tos('honda moto')).toEqual([
      '/motos-usadas-uruguay?marca=honda',
      '/autos-usados-uruguay?q=honda%20moto',
    ])
    // The model decides too: the Wave is the bike half of Honda.
    expect(tos('honda wave')[0]).toBe('/motos-usadas-uruguay?marca=honda')
  })

  it('weighs the word for the kind of thing above a brand several directories share', () => {
    expect(tos('samsung heladera')).toEqual([
      '/equipar-casa-uruguay/productos?q=samsung%20heladera',
      '/celulares-uruguay?marca=samsung',
    ])
    expect(tos('celular usado')).toEqual(['/celulares-uruguay'])
  })

  it('does not read a year, a size or a plain word as a car, a bike or a phone', () => {
    // "2008" is a Peugeot only next to Peugeot; "mini" a car only next to a car word.
    expect(directorySearch('crisis 2008')).toEqual({ basis: 'none', links: [] })
    expect(tos('dolar 2008')).toEqual([])
    expect(tos('peugeot 2008')).toEqual(['/autos-usados-uruguay?q=peugeot%202008'])
    expect(tos('mini heladera')).toEqual(['/equipar-casa-uruguay/productos?q=mini%20heladera'])
    expect(tos('mini cooper')).toEqual(['/autos-usados-uruguay?q=mini%20cooper'])
    expect(tos('honor y gloria')).toEqual([])
    expect(tos('honor 90')).toEqual(['/celulares-uruguay?marca=honor'])
    expect(tos('winner')).toEqual([])
    expect(tos('moto winner')).toEqual(['/motos-usadas-uruguay?marca=winner'])
  })

  it('ignores punctuation around a model', () => {
    expect(tos('creta?')).toEqual(['/autos-usados-uruguay?q=creta%3F'])
    expect(tos('iphone,13')).toEqual(['/celulares-uruguay?marca=apple'])
  })

  it('uses the page the search was opened on when the words say nothing', () => {
    expect(directorySearch('evo 9', '/autos-usados-uruguay/precios/mitsubishi-lancer')).toEqual({
      basis: 'page',
      links: [expect.objectContaining({ to: '/autos-usados-uruguay?q=evo%209' })],
    })
    expect(tos('evo 9', '/en/autos-usados-uruguay')).toEqual(['/autos-usados-uruguay?q=evo%209'])
    expect(tos('a55', '/celulares-uruguay/samsung-galaxy-a55-128gb')).toEqual([
      '/celulares-uruguay',
    ])
    expect(tos('epson', '/equipar-casa-uruguay/productos/impresora')).toEqual([
      '/equipar-casa-uruguay/productos?q=epson',
    ])
  })

  it('offers nothing when neither the words nor the page name a directory', () => {
    // 17 of the 54 dead ends started on the home page: a currency typo has no directory.
    expect(directorySearch('plutonio verde')).toEqual({ basis: 'none', links: [] })
    expect(directorySearch('plutonio verde', '/')).toEqual({ basis: 'none', links: [] })
    expect(tos('plutonio verde', '/cotizacion/dolar')).toEqual([])
  })

  it('names the words as the basis for the GA4 terms that a typo rescue swallows', () => {
    // "impreza", "compass" and "creta" never reach the empty state: didYouMean rescues them.
    expect(directorySearch('Impreza')).toMatchObject({
      basis: 'query',
      links: [{ id: 'autos', to: '/autos-usados-uruguay?q=Impreza' }],
    })
    const creta = directorySearch('creta', '/autos-usados-uruguay/precios/hyundai-creta')
    expect(['query', 'page']).toContain(creta.basis)
    expect(creta.links[0]).toMatchObject({ id: 'autos', to: '/autos-usados-uruguay?q=creta' })
    for (const q of ['Subaru STI', 'WRX STI', 'Lancer Evolution', 'Audi TT', 'compass'])
      expect(directorySearch(q)).toMatchObject({ basis: 'query', links: [{ id: 'autos' }] })
  })

  it('never links back to the page the search was opened on', () => {
    expect(tos('sapucai', '/en/motos-usadas-uruguay')).not.toContain('/motos-usadas-uruguay')
    expect(tos('sapucai', '/motos-usadas-uruguay')).toEqual([])
    expect(tos('a55', '/celulares-uruguay')).toEqual([])
    expect(tos('iphone 13', '/celulares-uruguay?marca=apple')).toEqual([])
    // Another filter of the same hub is another page: the link stays.
    expect(tos('iphone 13', '/celulares-uruguay?marca=samsung')).toEqual([
      '/celulares-uruguay?marca=apple',
    ])
    expect(tos('hyundai creta', '/autos-usados-uruguay?q=hyundai+creta')).toEqual([])
  })

  it('trims, collapses spaces, caps at the directories own 80 characters, and gives nothing for empty input', () => {
    expect(directorySearchLinks('')).toEqual([])
    expect(directorySearchLinks('   ')).toEqual([])
    expect(tos('  hyundai    creta  ')).toEqual(['/autos-usados-uruguay?q=hyundai%20creta'])
    const long = `hyundai ${'x'.repeat(200)}`
    const [first] = directorySearchLinks(long)
    expect(first!.q).toHaveLength(DIRECTORY_Q_MAX)
    expect(DIRECTORY_Q_MAX).toBe(80)
    expect(tos('auto & cía')).toEqual(['/autos-usados-uruguay?q=auto%20%26%20c%C3%ADa'])
  })

  it('cuts by code point, so an emoji across the cap cannot break the URL', () => {
    // UTF-16 slicing left a lone surrogate and encodeURIComponent threw (a 500 on /buscar).
    const q = `auto ${'a'.repeat(74)}😀😀`
    expect(() => directorySearchLinks(q)).not.toThrow()
    const links = directorySearchLinks(q)
    expect(links.length).toBeGreaterThan(0)
    for (const l of links) {
      expect(() => decodeURIComponent(l.to)).not.toThrow()
      expect(Array.from(l.q)).toHaveLength(DIRECTORY_Q_MAX)
    }
    expect(() => directorySearchLinks(`${'a'.repeat(79)}😀`, '/autos-usados-uruguay')).not.toThrow()
  })
})

describe('did-you-mean with more than one word', () => {
  const docs = buildSearchIndex(ctx)

  it('does not rescue one word of a two-word query into an unrelated guide', () => {
    // The nav entry carries its production label, the one the probe saw suggested.
    const labelled = buildSearchIndex({
      locale: 'es',
      t: (key: string) => (key === 'nav.queEmpresaAbrir' ? 'Qué empresa abrir' : key),
    })
    // The word alone still rescues (impreza ~ empresa): the directory link under it covers that.
    expect(scoreDocs('impreza', labelled).map(h => h.doc.to)).toContain(
      '/que-empresa-abrir-uruguay'
    )
    const hits = scoreDocs('subaru impreza', labelled)
    expect(hits.map(h => h.doc.to)).not.toContain('/que-empresa-abrir-uruguay')
    expect(hits).toEqual([])
  })

  it('keeps the single-word typo rescue: "cotizacon" and "dolr" still suggest', () => {
    const cotizacion = scoreDocs('cotizacon', docs)
    expect(cotizacion.length).toBeGreaterThan(0)
    expect(cotizacion.every(h => h.suggestion)).toBe(true)
    expect(cotizacion.map(h => h.doc.to)).toContain('/glosario/cotizacion')
    const dolar = scoreDocs('dolr', docs)
    expect(dolar.every(h => h.suggestion)).toBe(true)
    expect(dolar.map(h => h.doc.to)).toContain('/cotizacion/dolar')
  })

  it('still rescues a typo when every other word lands in the document', () => {
    // The typo is the SHORT word here: rescuing only the longest token would miss it.
    const canadian = scoreDocs('canadiense dolr', docs)
    expect(canadian[0]).toMatchObject({ suggestion: true })
    expect(canadian.map(h => h.doc.to)).toContain('/cotizacion/dolar-canadiense')
    const guide = scoreDocs('esconde cotizacon', docs)
    expect(guide.map(h => h.doc.to)).toEqual(['/guias/evitar-comisiones-cambio'])
  })

  it('lets a short absent word ride along with the typo instead of vetoing it', () => {
    const hoy = scoreDocs('cotizacon hoy', docs)
    expect(hoy.length).toBeGreaterThan(0)
    expect(hoy.every(h => h.suggestion)).toBe(true)
    expect(hoy.map(h => h.doc.to)).toContain('/glosario/cotizacion')
    expect(scoreDocs('subaru impreza', docs)).toEqual([])
  })
})

describe('the dead-end report', () => {
  it('reports a query once per opening, whatever its case, accents or spacing', () => {
    const r = createDeadEndReporter()
    expect(r.shouldReport('Subaru Impreza')).toBe(true)
    expect(r.shouldReport('subaru   impreza ')).toBe(false)
    expect(r.shouldReport('SUBARÚ IMPREZA')).toBe(false)
    expect(r.shouldReport('subaru')).toBe(true)
    expect(r.shouldReport('   ')).toBe(false)
    r.reset()
    expect(r.shouldReport('subaru impreza')).toBe(true)
  })
})

describe('where the directory links render', () => {
  const palette = read('components/SearchPalette.vue')
  const page = read('pages/buscar.vue')
  const component = read('components/SearchDirectoryLinks.vue')

  it('sit in the palette empty state, before the Ask-AI link, with the page it was opened on', () => {
    const empty = palette.slice(
      palette.indexOf('v-else-if="!amountHit" class="search-palette__empty"')
    )
    const links = empty.indexOf('<SearchDirectoryLinks')
    expect(links).toBeGreaterThan(-1)
    expect(links).toBeLessThan(empty.indexOf('search.askAiEmpty'))
    expect(empty).toMatch(/<SearchDirectoryLinks[^>]*:from-path="route\.fullPath"/)
    expect(empty).toMatch(/<SearchDirectoryLinks[^>]*@navigate="open = false"/)
  })

  it('sit under a did-you-mean in the palette, before the see-all link', () => {
    const results = palette.slice(palette.indexOf('<template v-else-if="hasResults">'))
    const block = results.slice(0, results.indexOf('</template>'))
    const links = block.indexOf('<SearchDirectoryLinks')
    expect(links).toBeGreaterThan(-1)
    expect(links).toBeLessThan(block.indexOf('search-palette__see-all'))
    expect(block.slice(links)).toMatch(/^<SearchDirectoryLinks\s+v-if="isSuggestion"/)
    expect(block.slice(links)).toMatch(/^<SearchDirectoryLinks[^>]*:from-path="route\.fullPath"/)
  })

  it('sit in the /buscar empty card, before the Ask-AI button, and under its did-you-mean', () => {
    const empty = page.slice(page.indexOf('class="search-page__empty'))
    const links = empty.indexOf('<SearchDirectoryLinks')
    expect(links).toBeGreaterThan(-1)
    expect(links).toBeLessThan(empty.indexOf('search.askAiEmpty'))
    expect(page).toMatch(/<SearchDirectoryLinks v-if="query && isSuggestion"/)
  })

  it('build every href through localePath and carry their own es/en/pt copy', () => {
    expect(component).toMatch(/localePath\(link\.path\)/)
    expect(component).toMatch(/useScope: 'local'/)
    for (const lang of ['es:', 'en:', 'pt:']) expect(component).toContain(lang)
    expect(component).toContain('data-cta="search-directory"')
  })

  it('take the theme link colour, which clears AA in both themes (info teal is 4.3:1)', () => {
    expect(component).toContain('color: rgb(var(--v-theme-link))')
    expect(component).not.toMatch(/color:\s*rgb\(var\(--v-theme-info\)\)/)
  })
})

describe('search tracking', () => {
  const palette = read('components/SearchPalette.vue')
  const page = read('pages/buscar.vue')

  it('sends search_term next to q on every search event', () => {
    expect(palette).toMatch(
      /track\('search_select', \{\s*q: query\.value,\s*search_term: query\.value/
    )
    expect(palette).toMatch(/track\('search_no_results', \{ q, search_term: q \}\)/)
    expect(page).toMatch(
      /track\('search_results_view', \{\s*q: query\.value,\s*search_term: query\.value/
    )
  })

  it('resets the dead-end report on each opening, reports on the settled pause, not on close', () => {
    const openWatch = palette.slice(palette.indexOf('watch(\n  open,'))
    expect(openWatch.slice(0, openWatch.indexOf('{ immediate: true }'))).toContain(
      'deadEnds.reset()'
    )
    expect(palette).toMatch(
      /setTimeout\(\(\) => \{[^}]*deadEnds\.shouldReport\(q\)\) track\('search_no_results'/
    )
    const onClosed = palette.slice(palette.indexOf('function onClosed'))
    const body = onClosed.slice(0, onClosed.indexOf('\n}'))
    expect(body).not.toContain('search_no_results')
    expect(body).not.toContain('deadEnds')
  })
})
