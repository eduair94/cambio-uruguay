import { describe, expect, it } from 'vitest'

import {
  buildResultGroups,
  flattenResults,
  fold,
  levenshtein,
  makeDoc,
  navToDocs,
  scoreDocs,
  tokenize,
  type SearchDoc,
  type SearchType,
} from '../../utils/siteNav'

const doc = (
  id: string,
  type: SearchType,
  title: string,
  extra: Partial<Parameters<typeof makeDoc>[0]> = {}
): SearchDoc =>
  makeDoc({
    id,
    type,
    section: 'market',
    title,
    description: '',
    icon: 'mdi-circle',
    to: `/${id.split(':')[1] ?? id}`,
    keywords: [],
    ...extra,
  })

describe('fold', () => {
  it('strips diacritics and lowercases', () => {
    expect(fold('Histórico')).toBe('historico')
    expect(fold('DÓLAR')).toBe('dolar')
    expect(fold('  Préstamo  ')).toBe('prestamo')
  })
})

describe('tokenize', () => {
  it('folds and splits on whitespace, dropping empties', () => {
    expect(tokenize('  100  USD ')).toEqual(['100', 'usd'])
    expect(tokenize('')).toEqual([])
  })
})

describe('levenshtein', () => {
  it('measures edit distance', () => {
    expect(levenshtein('historico', 'historico', 2)).toBe(0)
    expect(levenshtein('histrico', 'historico', 2)).toBe(1)
    expect(levenshtein('hstrico', 'historico', 2)).toBe(2)
  })

  it('early-exits above max instead of computing the true distance', () => {
    expect(levenshtein('abcdefgh', 'zzzzzzzz', 2)).toBe(3)
    expect(levenshtein('ab', 'abcdefgh', 2)).toBe(3)
  })
})

describe('scoreDocs tiers', () => {
  const docs = [
    doc('page:/historico', 'page', 'Histórico'),
    doc('page:/historico-largo', 'page', 'Histórico largo de cotizaciones'),
    doc('glossary:historia', 'glossary', 'Historia del mercado', {
      section: 'learn',
      description: 'Menciona el histórico del dólar.',
    }),
  ]

  it('returns nothing for an empty query', () => {
    expect(scoreDocs('', docs)).toEqual([])
    expect(scoreDocs('   ', docs)).toEqual([])
  })

  it('ranks exact slug above title prefix above haystack match', () => {
    const results = scoreDocs('historico', docs)
    expect(results.map(r => r.doc.id)).toEqual([
      'page:/historico',
      'page:/historico-largo',
      'glossary:historia',
    ])
    expect(results[0]!.score).toBeGreaterThan(results[1]!.score)
    expect(results[1]!.score).toBeGreaterThan(results[2]!.score)
  })

  it('matches accent-insensitively', () => {
    expect(scoreDocs('histórico', docs)[0]!.doc.id).toBe('page:/historico')
  })

  it('scores a title-exact match above a title-prefix match', () => {
    const items = [
      doc('page:/a', 'page', 'Cambio', { to: '/x-a' }),
      doc('page:/b', 'page', 'Cambio de divisas', { to: '/x-b' }),
    ]
    const results = scoreDocs('cambio', items)
    expect(results[0]!.doc.id).toBe('page:/a')
  })

  it('matches every token as a word prefix', () => {
    const items = [doc('page:/casa', 'page', 'Casas de cambio')]
    expect(scoreDocs('cas cam', items)).toHaveLength(1)
    expect(scoreDocs('cas zzz', items)).toHaveLength(0)
  })
})

describe('scoreDocs alias bonus', () => {
  it('surfaces a doc matched only by a keyword', () => {
    const items = [
      doc('page:/prestamos-uruguay', 'page', 'Préstamos', {
        keywords: ['credito', 'financiamiento'],
      }),
    ]
    const results = scoreDocs('credito', items)
    expect(results).toHaveLength(1)
    // keywords live in the haystack, so this clears tier 6 (26), then takes the
    // alias bonus (30) and the page boost (12).
    expect(results[0]!.score).toBe(68)
  })

  it('stacks the alias bonus on top of a textual tier', () => {
    const items = [doc('page:/dolar-hoy', 'page', 'Dólar hoy', { keywords: ['dolar'] })]
    const [hit] = scoreDocs('dolar', items)
    // title prefix 74 + alias 30 + page boost 12
    expect(hit!.score).toBe(116)
  })
})

describe('scoreDocs textual gate', () => {
  it('drops a doc with no textual and no alias signal regardless of type boost', () => {
    const items = [
      doc('action:theme', 'action', 'Cambiar tema', { keywords: ['tema'] }),
      doc('casa:brou', 'casa', 'BROU', { section: 'houses' }),
    ]
    expect(scoreDocs('zzzz', items)).toEqual([])
  })

  it('prefers a page over a glossary term at the same textual tier', () => {
    const items = [
      doc('page:/spread', 'page', 'Spread'),
      doc('glossary:spread-cambiario', 'glossary', 'Spread', { section: 'learn' }),
    ]
    const results = scoreDocs('spread', items)
    expect(results[0]!.doc.type).toBe('page')
    expect(results[1]!.doc.type).toBe('glossary')
  })
})

describe('scoreDocs did-you-mean fallback', () => {
  const docs = [doc('page:/historico', 'page', 'Histórico')]

  it('fires only when the tiered pass finds nothing', () => {
    const typo = scoreDocs('histrico', docs)
    expect(typo).toHaveLength(1)
    expect(typo[0]!.suggestion).toBe(true)
    expect(typo[0]!.doc.id).toBe('page:/historico')

    const exact = scoreDocs('historico', docs)
    expect(exact).toHaveLength(1)
    expect(exact[0]!.suggestion).toBeUndefined()
  })

  it('gives up beyond two edits', () => {
    expect(scoreDocs('hzzzrico', docs)).toEqual([])
  })

  it('ignores very short queries so single letters do not match everything', () => {
    expect(scoreDocs('zz', docs)).toEqual([])
  })
})

describe('flattenResults', () => {
  it('keeps strict score order regardless of section', () => {
    const items = [
      doc('currency:dolar-australiano', 'currency', 'Dólar Australiano', { section: 'tools' }),
      doc('page:/dolar-hoy', 'page', 'Dólar hoy', { section: 'market', keywords: ['dolar'] }),
    ]
    const { rows, docs } = flattenResults(scoreDocs('dolar', items), 8)
    expect(rows.map(r => r.doc.id)).toEqual(['page:/dolar-hoy', 'currency:dolar-australiano'])
    expect(rows.map(r => r.idx)).toEqual([0, 1])
    expect(docs[0]!.id).toBe('page:/dolar-hoy')
  })

  it('respects the limit', () => {
    const items = [
      doc('page:/a', 'page', 'Cambio uno'),
      doc('page:/b', 'page', 'Cambio dos'),
      doc('page:/c', 'page', 'Cambio tres'),
    ]
    expect(flattenResults(scoreDocs('cambio', items), 2).rows).toHaveLength(2)
  })
})

describe('buildResultGroups', () => {
  it('orders sections by their best hit, not by NAV_SECTIONS order', () => {
    // `services` sorts after `tools` in NAV_SECTIONS, but scores higher here:
    // the exact-title page must not be buried under the weaker tool match.
    const results = scoreDocs('prestamo', [
      doc('tool:calculadora-prestamo', 'tool', 'Calculadora de préstamo', { section: 'tools' }),
      doc('page:/prestamos-uruguay', 'page', 'Prestamo', { section: 'services' }),
    ])
    const { groups } = buildResultGroups(results, 8)
    expect(groups.map(g => g.id)).toEqual(['services', 'tools'])
  })

  it('numbers rows in reading order and exposes the same flat list', () => {
    const results = scoreDocs('cambio', [
      doc('glossary:x', 'glossary', 'Cambio de divisas', { section: 'learn' }),
      doc('page:/casas-de-cambio', 'page', 'Cambio', { section: 'houses' }),
    ])
    const { groups, docs } = buildResultGroups(results, 8)
    const rows = groups.flatMap(g => g.items)
    expect(rows.map(r => r.idx)).toEqual([0, 1])
    expect(rows.map(r => r.doc.id)).toEqual(docs.map(d => d.id))
    // docs[idx] is always the row the keyboard cursor is on.
    for (const row of rows) expect(docs[row.idx]!.id).toBe(row.doc.id)
  })

  it('respects the limit', () => {
    const results = scoreDocs('cambio', [
      doc('page:/a', 'page', 'Cambio uno'),
      doc('page:/b', 'page', 'Cambio dos'),
      doc('page:/c', 'page', 'Cambio tres'),
    ])
    expect(buildResultGroups(results, 2).docs).toHaveLength(2)
  })
})

describe('navToDocs', () => {
  const t = (key: string) => key

  it('emits one doc per internal route and skips external links', () => {
    const docs = navToDocs(t, 'es')
    expect(docs.some(d => d.id === 'page:/prestamos-uruguay')).toBe(true)
    expect(docs.some(d => d.id === 'page:/inversiones-uruguay')).toBe(true)
    expect(docs.some(d => d.id === 'page:/preguntas-frecuentes')).toBe(true)
    expect(docs.some(d => d.href)).toBe(false)
  })

  it('emits a theme action plus one language action per foreign locale', () => {
    const es = navToDocs(t, 'es')
    expect(es.filter(d => d.type === 'action').map(d => d.id)).toEqual([
      'action:theme',
      'action:lang:en',
      'action:lang:pt',
    ])

    const en = navToDocs(t, 'en')
    expect(en.some(d => d.id === 'action:lang:en')).toBe(false)
    expect(en.some(d => d.id === 'action:lang:es')).toBe(true)
  })

  it('folds the precomputed haystacks', () => {
    const [first] = navToDocs(t, 'es')
    expect(first!._title).toBe(first!._title.toLowerCase())
    expect(first!._hay).not.toMatch(/[áéíóúñ]/)
  })
})
