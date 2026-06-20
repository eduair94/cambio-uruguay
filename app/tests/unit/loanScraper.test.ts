import { describe, expect, it } from 'vitest'
import { parseLenderRate, stripHtml, TEA_PARSERS } from '../../server/utils/loanScraper'

// Fixtures are tag-stripped rate text captured from each lender's live rate page
// (2026-06-19). Parsers must pull the representative advertised TEA out of the surrounding noise.
// Expected values are externally verified from the published rates.

describe('parseLenderRate', () => {
  it('oca: extracts 39% TEA from "T.E.A. 39%" anchor', () => {
    // Captured from https://oca.uy/prestamos/ — example block text after tag-stripping
    const text = 'las últimas 5 de $5.223 T.E.A. 39%. Sujeto a aprobación crediticia Ejemplo'
    expect(parseLenderRate('oca', text)).toEqual({ id: 'oca', teaPct: 39, ok: true })
  })

  it('pronto: extracts 49% TEA from "TEA: 49%" anchor', () => {
    // Captured from https://www.pronto.com.uy/tasa-29/ — example section after tag-stripping
    const text = 'con tu recibo de ingreso. TEA: 49% + Iva. Ptf: $1.198.092'
    expect(parseLenderRate('pronto', text)).toEqual({ id: 'pronto', teaPct: 49, ok: true })
  })

  it('cash: extracts 63.9% TEA from the >=10k UI / <=366-day tier anchor', () => {
    // Captured from https://prestamocash.com.uy/prestamo — rate table after tag-stripping
    const text =
      'TEA Interés: Hasta 366 días y menor o igual a 10.000 UI – 121.4%, Hasta 366 días y mayor o igual a 10.000 UI – 63.9%, 367 días o más y hasta 10.000 UI - 128.9%'
    expect(parseLenderRate('cash', text)).toEqual({ id: 'cash', teaPct: 63.9, ok: true })
  })

  it('rejects an implausible TEA (out of the 5–250 band) and keeps ok=false', () => {
    expect(parseLenderRate('oca', 'T.E.A. 999%. Sujeto a aprobación')).toEqual({
      id: 'oca',
      teaPct: null,
      ok: false,
    })
  })

  it('returns ok=false when the anchor is missing', () => {
    expect(parseLenderRate('oca', 'sin tasas hoy').ok).toBe(false)
  })

  it('returns ok=false for an unknown lender id', () => {
    expect(parseLenderRate('nope', 'TEA 50%')).toEqual({ id: 'nope', teaPct: null, ok: false })
  })

  it('strips HTML tags before matching', () => {
    // OCA anchor wrapped in HTML should still parse
    const html = '<p>las últimas 5 de $5.223</p><span>T.E.A. 39%</span>. Sujeto a aprobación'
    expect(parseLenderRate('oca', html)).toEqual({ id: 'oca', teaPct: 39, ok: true })
  })
})

describe('stripHtml', () => {
  it('removes tags, scripts and entities', () => {
    expect(stripHtml('<script>x</script><p>TEA&nbsp;39%</p>')).toContain('TEA 39%')
    expect(stripHtml('<p>TEA&nbsp;39%</p>')).not.toContain('<p>')
  })
})

describe('TEA_PARSERS catalogue', () => {
  it('lists oca, pronto, and cash as the HTML-scrapable lenders', () => {
    expect(Object.keys(TEA_PARSERS).sort()).toEqual(['cash', 'oca', 'pronto'].sort())
  })
})
