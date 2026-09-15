import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SEARCH_QUERY,
  excerptAround,
  fmtPct,
  fmtPts,
  highlightSegments,
  isDefaultSearch,
  monthLabel,
  normalizeSearchQuery,
  outOfTen,
  queryTerms,
  searchQueryToParams,
  stanceMeta,
} from '../../utils/charruadevs'

describe('normalizeSearchQuery', () => {
  it('returns the defaults for an empty query', () => {
    expect(normalizeSearchQuery({})).toEqual(DEFAULT_SEARCH_QUERY)
    expect(isDefaultSearch(normalizeSearchQuery({}))).toBe(true)
  })

  it('parses, dedupes and orders every filter', () => {
    expect(
      normalizeSearchQuery({
        q: '  no  hay   laburo ',
        s: '-2,1,9,-1,1',
        k: 'comment',
        t: 'ia',
        ia: 'amenaza',
        ev: 'busca',
        desde: '2026',
        hasta: '2023',
        orden: 'votes',
        p: '3',
      })
    ).toEqual({
      q: 'no hay laburo',
      stance: [-2, -1, 1],
      kind: 'comment',
      theme: 'ia',
      ai: 'amenaza',
      event: 'busca',
      from: 2023,
      to: 2026,
      sort: 'votes',
      page: 3,
    })
  })

  it('drops invented values instead of passing them to Mongo', () => {
    expect(
      normalizeSearchQuery({
        k: 'user',
        t: 'nope',
        ia: 'x',
        ev: 'y',
        desde: '1999',
        p: '0',
        orden: 'relevance',
        s: 'a',
      })
    ).toEqual(DEFAULT_SEARCH_QUERY)
    expect(normalizeSearchQuery({ t: 'toString' }).theme).toBe('')
  })

  it('only sorts by relevance when there is something to be relevant to', () => {
    expect(normalizeSearchQuery({ q: 'ia', orden: 'relevance' }).sort).toBe('relevance')
    expect(normalizeSearchQuery({ orden: 'relevance' }).sort).toBe('recent')
  })

  it('takes the first value of a repeated parameter and caps the text', () => {
    expect(normalizeSearchQuery({ q: ['ia', 'junior'] }).q).toBe('ia')
    expect(normalizeSearchQuery({ q: 'x'.repeat(300) }).q).toHaveLength(100)
  })
})

describe('searchQueryToParams', () => {
  it('omits defaults and round-trips through the URL', () => {
    expect(searchQueryToParams(DEFAULT_SEARCH_QUERY)).toEqual({})
    const q = normalizeSearchQuery({ q: 'ia', s: '-2,-1', desde: '2025', orden: 'votes', p: '2' })
    expect(searchQueryToParams(q)).toEqual({
      q: 'ia',
      s: '-2,-1',
      desde: '2025',
      orden: 'votes',
      p: '2',
    })
    expect(normalizeSearchQuery(searchQueryToParams(q))).toEqual(q)
  })
})

describe('highlight and excerpt', () => {
  it('matches without accents or case and keeps the original text', () => {
    expect(highlightSegments('El mercado ESTÁ saturado', queryTerms('esta'))).toEqual([
      { text: 'El mercado ', hit: false },
      { text: 'ESTÁ', hit: true },
      { text: ' saturado', hit: false },
    ])
  })

  it('merges overlapping hits', () => {
    expect(highlightSegments('laburo', ['labur', 'laburo']).filter(s => s.hit)).toEqual([
      { text: 'laburo', hit: true },
    ])
  })

  it('never lights up a short term inside another word', () => {
    // "IA" dentro de "industrias" era el primer resultado resaltado de la búsqueda "IA".
    expect(
      highlightSegments('Las industrias y la IA', queryTerms('IA')).filter(s => s.hit)
    ).toEqual([{ text: 'IA', hit: true }])
  })

  it('lets a long term match its own suffixes, like the stemmer does', () => {
    expect(highlightSegments('los despidieron a todos', ['despid']).filter(s => s.hit)).toEqual([
      { text: 'despid', hit: true },
    ])
    expect(highlightSegments('los redespidieron', ['despid']).filter(s => s.hit)).toEqual([])
  })

  it('centres the excerpt on the standalone term, not on a substring', () => {
    const body = `En otras industrias ${'relleno '.repeat(60)}la IA cambió todo ${'fin '.repeat(60)}`
    const ex = excerptAround(body, ['ia'], 120)
    expect(ex).toContain('la IA cambió')
    expect(ex).not.toContain('industrias')
  })

  it('ignores punctuation and one-letter words in the query', () => {
    expect(queryTerms('¿La IA, y el "junior"?')).toEqual(['la', 'ia', 'el', 'junior'])
  })

  it('centres the excerpt on the first hit', () => {
    const body = `${'palabra '.repeat(100)}contractor ${'fin '.repeat(100)}`
    const ex = excerptAround(body, ['contractor'], 120)
    expect(ex).toContain('contractor')
    expect(ex.startsWith('… ')).toBe(true)
    expect(ex.length).toBeLessThanOrEqual(126)
  })

  it('leaves short texts alone', () => {
    expect(excerptAround('corto', ['x'])).toBe('corto')
  })
})

describe('format', () => {
  it('formats percentages, months and the stance scale', () => {
    expect(fmtPct(0.624)).toBe('62 %')
    expect(fmtPct(null)).toBe('—')
    expect(outOfTen(0.72)).toBe('7')
    expect(fmtPts(0.72, 0.38)).toBe('+34 puntos')
    expect(fmtPts(0.2, 0.33)).toBe('−13 puntos')
    expect(monthLabel('2023-01')).toBe('ene 2023')
    expect(stanceMeta(-2).label).toBe('Catastrofista')
    expect(stanceMeta(null).label).toBe('Neutral')
  })
})
