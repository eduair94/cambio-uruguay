import { describe, expect, it } from 'vitest'

import { computePageRecords } from '../../utils/rateStats'

describe('computePageRecords — el bundle que publican las páginas', () => {
  const day = (n: number, value: number) => ({
    date: `2026-01-${String(n).padStart(2, '0')}`,
    value,
  })

  it('devuelve el paquete completo con una serie normal', () => {
    const r = computePageRecords(
      [day(1, 40), day(2, 41), day(3, 42), day(4, 41.5), day(5, 43)],
      new Date('2026-01-06T12:00:00Z')
    )
    expect(r).not.toBeNull()
    expect(r!.max.value).toBe(43)
    expect(r!.min.value).toBe(40)
    expect(r!.daysSinceHigh).toBe(1)
    expect(r!.streak).toBeDefined()
  })

  // Menos de tres puntos no es un récord: es ruido con fecha.
  it('no publica nada con menos de tres puntos', () => {
    expect(computePageRecords([])).toBeNull()
    expect(computePageRecords([day(1, 40)])).toBeNull()
    expect(computePageRecords([day(1, 40), day(2, 41)])).toBeNull()
  })

  // El guarda que importa: un corrimiento de coma no puede salir como "el máximo del período".
  it('el saneamiento va adentro y no se puede saltear', () => {
    const conGlitch = [day(1, 40), day(2, 41), day(3, 410), day(4, 41.5), day(5, 42)]
    const r = computePageRecords(conGlitch, new Date('2026-01-06T12:00:00Z'))
    expect(r).not.toBeNull()
    expect(r!.max.value).toBeLessThan(100)
  })

  it('no rompe con valores no finitos', () => {
    const r = computePageRecords([
      day(1, 40),
      { date: '2026-01-02', value: Number.NaN },
      day(3, 42),
      day(4, 41),
    ])
    if (r) {
      expect(Number.isFinite(r.max.value)).toBe(true)
      expect(Number.isFinite(r.min.value)).toBe(true)
    }
  })
})
