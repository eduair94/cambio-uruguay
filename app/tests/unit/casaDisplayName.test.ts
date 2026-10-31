// El nombre visible de una casa sale de su `origin`, nunca de `row.name` (la etiqueta de la moneda
// en la pizarra: "Real", "REAL", "http://rynder.com.uy/img/bra.jpg"). Ver la memoria del repo sobre
// `name` y app/utils/currencyPages.ts.
import { describe, expect, it } from 'vitest'
import type { ExchangeRate } from '../../types/api'
import { casaDisplayName, quotesForCurrency } from '../../utils/currencyPages'

const row = (origin: string, name: string, buy: number, sell: number): ExchangeRate => ({
  origin,
  name,
  buy,
  sell,
  code: 'BRL',
  type: '',
  date: '2026-10-31',
})

describe('casaDisplayName', () => {
  it('prefiere localData, después las siglas conocidas, después el slug humanizado', () => {
    expect(casaDisplayName('gales', { gales: { name: 'Cambio Gales' } })).toBe('Cambio Gales')
    expect(casaDisplayName('brou')).toBe('BROU')
    expect(casaDisplayName('itau')).toBe('Itaú')
    expect(casaDisplayName('cambio_pando')).toBe('Cambio Pando')
    expect(casaDisplayName('cambio_rynder', { cambio_rynder: { name: '  ' } })).toBe(
      'Cambio Rynder'
    )
  })
})

describe('quotesForCurrency nunca usa la etiqueta de la moneda como casa', () => {
  it('la URL de una imagen o "REAL" no llegan al nombre', () => {
    const quotes = quotesForCurrency(
      [
        row('cambio_rynder', 'http://rynder.com.uy/img/bra.jpg', 7.5, 8.6),
        row('cambio_principal', 'REAL', 7.8, 8.3),
        row('brou', 'Real', 7.6, 8.4),
      ],
      'BRL',
      { cambio_principal: { name: 'Cambio Principal' } }
    )
    const names = quotes.map(q => q.name).sort()
    expect(names).toEqual(['BROU', 'Cambio Principal', 'Cambio Rynder'])
    for (const q of quotes) {
      expect(q.name).not.toMatch(/real|http|\.jpg/i)
    }
  })
})
