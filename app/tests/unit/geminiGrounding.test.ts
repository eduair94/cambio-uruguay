import { describe, it, expect } from 'vitest'
import { extractGroundedHeadlines, isNoNewsText } from '../../utils/geminiGrounding'

// Fixture shape captured from a real live smoke-test call during design
// (2026-01-26 USD BCU rate-cut query) — see docs/superpowers/specs/2026-07-08-gemini-news-grounding-design.md
const REAL_CHUNKS = [
  {
    web: {
      uri: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AAA',
      title: 'ccea.com.uy',
    },
  },
  {
    web: {
      uri: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/BBB',
      title: 'montevideo.com.uy',
    },
  },
  {
    web: {
      uri: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/CCC',
      title: 'blasinayasociados.com',
    },
  },
  {
    web: {
      uri: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/DDD',
      title: 'www.busqueda.com.uy',
    },
  },
  {
    web: {
      uri: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/EEE',
      title: 'enperspectiva.uy',
    },
  },
]

const REAL_SUPPORTS = [
  {
    segment: {
      endIndex: 152,
      text: 'El 26 de enero de 2026, el Banco Central del Uruguay (BCU) redujo la Tasa de Política Monetaria (TPM) en 100 puntos básicos, estableciéndola en 6,5%.',
    },
    groundingChunkIndices: [0, 1, 2, 3],
  },
  {
    segment: {
      startIndex: 153,
      endIndex: 502,
      text: 'Esta medida, tomada en una reunión adelantada del Comité de Política Monetaria (COPOM), buscó contrarrestar el desalineamiento de la inflación respecto a la meta y evitar una mayor caída del dólar estadounidense.',
    },
    groundingChunkIndices: [0, 1, 2, 3, 4],
  },
  {
    segment: {
      startIndex: 503,
      endIndex: 631,
      text: 'La decisión de bajar la tasa de interés se esperaba que desalentara las inversiones en pesos y respaldara el valor del dólar.',
    },
    groundingChunkIndices: [3],
  },
  {
    segment: {
      startIndex: 632,
      endIndex: 794,
      text: 'El anuncio de esta reunión y la expectativa de un recorte en la tasa ya habían provocado una leve subida del dólar en el mercado cambiario el viernes anterior.',
    },
    groundingChunkIndices: [4],
  },
]

describe('extractGroundedHeadlines', () => {
  it('picks, per chunk, the most specific (fewest-indices) supporting segment as title', () => {
    const out = extractGroundedHeadlines(REAL_CHUNKS, REAL_SUPPORTS)
    // chunk 3 is cited alone by the 3rd segment -> that becomes its title, not the broad first one
    const chunk3 = out.find(h => h.link.endsWith('DDD'))
    expect(chunk3?.title).toBe(
      'La decisión de bajar la tasa de interés se esperaba que desalentara las inversiones en pesos y respaldara el valor del dólar.'
    )
    // chunk 4 is cited alone by the 4th segment
    const chunk4 = out.find(h => h.link.endsWith('EEE'))
    expect(chunk4?.title).toBe(
      'El anuncio de esta reunión y la expectativa de un recorte en la tasa ya habían provocado una leve subida del dólar en el mercado cambiario el viernes anterior.'
    )
    // chunk 0 is only ever cited by the broad first/second segments -> falls back to the first (earliest)
    const chunk0 = out.find(h => h.link.endsWith('AAA'))
    expect(chunk0?.title).toBe(
      'El 26 de enero de 2026, el Banco Central del Uruguay (BCU) redujo la Tasa de Política Monetaria (TPM) en 100 puntos básicos, estableciéndola en 6,5%.'
    )
  })

  it('strips a leading www. from the domain for `source`', () => {
    const out = extractGroundedHeadlines(REAL_CHUNKS, REAL_SUPPORTS)
    const chunk3 = out.find(h => h.link.endsWith('DDD'))
    expect(chunk3?.source).toBe('busqueda.com.uy')
  })

  it('truncates a title longer than 140 chars with an ellipsis', () => {
    const longText = 'x'.repeat(200)
    const chunks = [{ web: { uri: 'https://example.com/redirect', title: 'example.com' } }]
    const supports = [{ segment: { endIndex: 200, text: longText }, groundingChunkIndices: [0] }]
    const out = extractGroundedHeadlines(chunks, supports)
    expect(out[0]!.title.length).toBe(140)
    expect(out[0]!.title.endsWith('...')).toBe(true)
  })

  it('skips a chunk with no web.uri', () => {
    const chunks = [
      { web: { title: 'no-uri.com' } },
      { web: { uri: 'https://ok.com/x', title: 'ok.com' } },
    ]
    const supports: never[] = []
    const out = extractGroundedHeadlines(chunks, supports)
    expect(out).toHaveLength(1)
    expect(out[0]!.source).toBe('ok.com')
  })

  it('falls back to the domain as title when no support segment covers a chunk', () => {
    const chunks = [{ web: { uri: 'https://ok.com/x', title: 'ok.com' } }]
    const out = extractGroundedHeadlines(chunks, [])
    expect(out[0]!.title).toBe('ok.com')
  })

  it('caps at `limit` (default 3)', () => {
    const out = extractGroundedHeadlines(REAL_CHUNKS, REAL_SUPPORTS)
    expect(out).toHaveLength(3)
    const out5 = extractGroundedHeadlines(REAL_CHUNKS, REAL_SUPPORTS, 5)
    expect(out5).toHaveLength(5)
  })
})

describe('isNoNewsText', () => {
  it('is true for an exact or prefixed SIN NOTICIAS reply, case-insensitive', () => {
    expect(isNoNewsText('SIN NOTICIAS')).toBe(true)
    expect(isNoNewsText('sin noticias')).toBe(true)
    expect(isNoNewsText('  Sin Noticias.')).toBe(true)
    expect(isNoNewsText('Sin noticias relevantes para esta fecha.')).toBe(true)
  })
  it('is false for a real narrative', () => {
    expect(isNoNewsText('El BCU redujo la tasa de interés...')).toBe(false)
    expect(isNoNewsText('')).toBe(false)
  })
})
