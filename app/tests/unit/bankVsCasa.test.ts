import { describe, expect, it } from 'vitest'

import {
  COMPARED_KINDS,
  compareInstitutionKinds,
  differenceOn,
  type KindGap,
} from '../../utils/bankVsCasa'
import type { CurrencyQuote } from '../../utils/currencyPages'

const quote = (origin: string, buy: number | null, sell: number | null): CurrencyQuote => ({
  origin,
  name: origin,
  buy,
  sell,
  bestBuy: false,
  bestSell: false,
})

/**
 * Un mercado de cotizaciones sanas: cinco casas y los cinco bancos reales de `ORIGIN_CATEGORY`.
 *
 * Diez filas a propósito — es exactamente `MIN_SAMPLE`, el piso a partir del cual el detector de
 * pizarras fuera de mercado se anima a descartar. Por debajo de eso no filtra nada y media de
 * estas pruebas no probaría lo que dice probar.
 */
const market = (): CurrencyQuote[] => [
  quote('cambio_principal', 39.5, 41.0),
  quote('gales', 39.6, 41.1),
  quote('cambio_sir', 39.4, 41.2),
  quote('varlix', 39.5, 41.15),
  quote('indumex', 39.45, 41.05),
  quote('brou', 38.9, 41.9),
  quote('itau', 39.0, 41.8),
  quote('santander', 38.95, 41.85),
  quote('bbva', 38.85, 41.95),
  quote('scotiabank', 38.8, 42.0),
]

describe('compareInstitutionKinds', () => {
  it('agrupa cada pizarra en su tipo de institución', () => {
    const { summaries } = compareInstitutionKinds(market())
    expect(summaries.map(s => s.kind)).toEqual([...COMPARED_KINDS])
    expect(summaries.find(s => s.kind === 'casa')!.count).toBe(5)
    expect(summaries.find(s => s.kind === 'banco')!.count).toBe(5)
    // Ninguna fintech cotiza en este mercado: el grupo viaja igual, vacío, para que la página
    // pueda decir "hoy no publican" en vez de omitir la fila.
    expect(summaries.find(s => s.kind === 'fintech')!.count).toBe(0)
  })

  it('corona el mejor mostrador de cada grupo, no el del mercado', () => {
    const { summaries } = compareInstitutionKinds(market())
    const casa = summaries.find(s => s.kind === 'casa')!
    const banco = summaries.find(s => s.kind === 'banco')!
    expect(casa.bestSell?.origin).toBe('cambio_principal')
    expect(casa.bestBuy?.origin).toBe('gales')
    // La mejor venta del grupo banco es la más barata ENTRE BANCOS, aunque toda casa la mejore.
    expect(banco.bestSell?.origin).toBe('itau')
    expect(banco.bestBuy?.origin).toBe('itau')
  })

  it('mide la diferencia comprando dólares contra el precio del ganador', () => {
    const { sell } = compareInstitutionKinds(market())
    expect(sell).not.toBeNull()
    expect(sell!.winner).toBe('casa')
    expect(sell!.loser).toBe('banco')
    // 41,80 (Itaú) − 41,00 (Principal)
    expect(sell!.perUnit).toBeCloseTo(0.8, 10)
    expect(sell!.pct).toBeCloseTo((0.8 / 41.0) * 100, 10)
  })

  it('mide la otra punta con la compra más alta, no con la más baja', () => {
    const { buy } = compareInstitutionKinds(market())
    expect(buy!.winner).toBe('casa')
    // 39,60 (Gales) − 39,00 (Itaú)
    expect(buy!.perUnit).toBeCloseTo(0.6, 10)
  })

  it('deja ganar al banco cuando el banco gana', () => {
    const rows = market().map(q => (q.origin === 'itau' ? quote('itau', 39.9, 40.5) : q))
    const { sell, buy } = compareInstitutionKinds(rows)
    expect(sell!.winner).toBe('banco')
    expect(buy!.winner).toBe('banco')
  })

  it('descarta la pizarra fuera de mercado antes de coronar', () => {
    // Una coma perdida en un banco: 4,19 en vez de 41,90. Sin el descarte sería "el banco vende
    // el dólar a $4" y la página publicaría justo lo contrario de lo que pasa.
    const rows = market().map(q => (q.origin === 'brou' ? quote('brou', 3.89, 4.19) : q))
    const { sell, summaries } = compareInstitutionKinds(rows)
    expect(summaries.find(s => s.kind === 'banco')!.count).toBe(4)
    expect(sell!.winner).toBe('casa')
    expect(sell!.loser).toBe('banco')
  })

  it('lleva la mediana del grupo al lado del mejor precio', () => {
    const banco = compareInstitutionKinds(market()).summaries.find(s => s.kind === 'banco')!
    // Cinco ventas: 41,80 · 41,85 · 41,90 · 41,95 · 42,00
    expect(banco.medianSell).toBeCloseTo(41.9, 10)
  })

  it('no inventa una diferencia cuando un grupo no publica', () => {
    const soloCasas = market().filter(
      q => !['brou', 'itau', 'santander', 'bbva', 'scotiabank'].includes(q.origin)
    )
    const { sell, buy, summaries } = compareInstitutionKinds(soloCasas)
    expect(summaries.find(s => s.kind === 'banco')!.count).toBe(0)
    expect(sell).toBeNull()
    expect(buy).toBeNull()
  })

  it('ignora precios nulos o cero sin romper el grupo', () => {
    const rows = market().map(q => (q.origin === 'gales' ? quote('gales', null, 0) : q))
    const casa = compareInstitutionKinds(rows).summaries.find(s => s.kind === 'casa')!
    expect(casa.count).toBe(5)
    expect(casa.bestBuy?.origin).toBe('cambio_principal')
    expect(casa.bestSell?.origin).toBe('cambio_principal')
  })

  it('con un empate exacto no corona a nadie por más de cero', () => {
    const rows = market().map(q => (q.origin === 'itau' ? quote('itau', 39.6, 41.0) : q))
    const { sell, buy } = compareInstitutionKinds(rows)
    expect(sell!.perUnit).toBe(0)
    expect(sell!.pct).toBe(0)
    expect(buy!.perUnit).toBe(0)
  })

  it('sobrevive a un mercado vacío', () => {
    const { summaries, sell, buy } = compareInstitutionKinds([])
    expect(summaries).toHaveLength(COMPARED_KINDS.length)
    expect(summaries.every(s => s.count === 0)).toBe(true)
    expect(sell).toBeNull()
    expect(buy).toBeNull()
  })
})

describe('differenceOn', () => {
  const gap: KindGap = { winner: 'casa', loser: 'banco', perUnit: 0.8, pct: 1.95 }

  it('lleva la diferencia por unidad a una operación concreta', () => {
    expect(differenceOn(gap, 1000)).toBeCloseTo(800, 10)
  })

  it('devuelve null sin diferencia o sin monto', () => {
    expect(differenceOn(null, 1000)).toBeNull()
    expect(differenceOn(gap, 0)).toBeNull()
    expect(differenceOn(gap, -5)).toBeNull()
  })
})
