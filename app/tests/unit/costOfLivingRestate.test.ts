import { describe, expect, it } from 'vitest'
import {
  FOOD_CBA_MULTIPLE,
  INE_LINES_ANCHOR,
  INE_PER_CAPITA_LINES,
  RESTATE_MAX_MONTHS,
  monthsSince,
  restateFood,
} from '../../utils/costOfLiving'

describe('el ancla de las canastas del INE es legible por maquina', () => {
  it('tiene fecha ISO, no solo prosa', () => {
    expect(INE_LINES_ANCHOR).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('el multiplo de comida reproduce el foodPerAdult horneado', () => {
    // foodPerAdult: 13000 en COST_MODEL es ~2x la CBA per capita de Montevideo
    // ($6.628). La relacion se hace explicita para poder reexpresarla; el
    // baseline no cambia.
    const derived = INE_PER_CAPITA_LINES.montevideo.cba * FOOD_CBA_MULTIPLE
    expect(derived).toBeGreaterThan(13000 * 0.95)
    expect(derived).toBeLessThan(13000 * 1.05)
  })
})

describe('monthsSince', () => {
  it('cuenta meses calendario', () => {
    expect(monthsSince('2025-12-01', '2026-09-08')).toBe(9)
    expect(monthsSince('2025-12-01', '2025-12-31')).toBe(0)
    expect(monthsSince('2025-12-01', '2026-12-01')).toBe(12)
  })

  it('no devuelve negativos cuando la fecha pedida es anterior al ancla', () => {
    expect(monthsSince('2026-09-01', '2026-01-01')).toBe(0)
  })

  it('devuelve NaN con fechas ilegibles, para que el llamador no ajuste', () => {
    expect(Number.isNaN(monthsSince('no-es-fecha', '2026-09-08'))).toBe(true)
  })
})

describe('restateFood', () => {
  it('reexpresa la cifra publicada a la fecha pedida', () => {
    // 9 meses al 5,5 % interanual: 6628 * 1.055^(9/12) = ~6900.
    const out = restateFood(6628, 5.5, '2026-09-08')
    expect(out.published).toBe(6628)
    expect(out.restated).toBeGreaterThan(6628)
    expect(out.restated).toBeLessThan(6628 * 1.06)
    expect(out.monthsElapsed).toBe(9)
    expect(out.adjusted).toBe(true)
  })

  it('NO ajusta cuando no hay cifra de inflacion, y dice por que', () => {
    const out = restateFood(6628, null, '2026-09-08')
    expect(out.restated).toBe(6628)
    expect(out.adjusted).toBe(false)
    expect(out.note).toMatch(/inflaci/i)
  })

  it('NO ajusta con una inflacion imposible', () => {
    expect(restateFood(6628, 0, '2026-09-08').adjusted).toBe(false)
    expect(restateFood(6628, -3, '2026-09-08').adjusted).toBe(false)
    expect(restateFood(6628, 900, '2026-09-08').adjusted).toBe(false)
  })

  it('NO ajusta el mismo mes del ancla', () => {
    const out = restateFood(6628, 5.5, '2025-12-20')
    expect(out.restated).toBe(6628)
    expect(out.adjusted).toBe(false)
  })

  it('se NIEGA a indexar un ancla demasiado vieja en vez de capitalizarla', () => {
    // Capitalizar tres anios de inflacion sobre una canasta sin actualizar
    // esconde el problema (la canasta vieja) detras de un numero que parece
    // fresco. Es la leccion de "una cifra vieja pasa la banda".
    expect(RESTATE_MAX_MONTHS).toBe(36)
    const out = restateFood(6628, 5.5, '2029-06-01')
    expect(out.adjusted).toBe(false)
    expect(out.note).toMatch(/vieja|desactualizad/i)
  })

  it('redondea a peso entero: no se publican centesimos de canasta', () => {
    expect(Number.isInteger(restateFood(6628, 5.5, '2026-09-08').restated)).toBe(true)
  })
})
