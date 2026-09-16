import { describe, expect, it } from 'vitest'

import { riseSplit } from '../../utils/aiReleases'
import { stratifiedRiseGap } from '../../utils/aiReleasesStrata'

const months = (year: number) =>
  Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`)

describe('stratifiedRiseGap', () => {
  it('sin muestra en ningún año devuelve null y no 0/0', () => {
    const s = stratifiedRiseGap(['2025-01', '2025-02'], [1, 2], new Set())
    expect(s.gap).toBeNull()
    expect(s.weight).toBe(0)
  })

  it('un año sin meses de los dos tipos no entra en el promedio', () => {
    // El año entero es "con lanzamiento": no tiene contra qué compararse adentro de su año.
    const ms = months(2024)
    const values = ms.map((_, i) => i)
    const s = stratifiedRiseGap(ms, values, new Set(ms))
    expect(s.strata).toHaveLength(1)
    expect(s.strata[0]!.without.share).toBeNull()
    expect(s.gap).toBeNull()
    expect(s.weight).toBe(0)
  })

  // Este es el caso que motivó el módulo, y es el que pasó con los datos reales: crudo parece que
  // el lanzamiento sube la serie, y separando por año casi toda esa ventaja se evapora, porque los
  // lanzamientos están amontonados justo en el año en que la serie subía sola.
  it('achica la ventaja que en realidad venía del año', () => {
    const ms = [...months(2024), ...months(2025)]
    // 2024 baja todos los meses; 2025 sube todos los meses.
    const values = [...months(2024).map((_, i) => 100 - i), ...months(2025).map((_, i) => 100 + i)]
    // Un lanzamiento en 2024 y cuatro en 2025: el racimo está donde la serie sube sola.
    const releases = new Set(['2024-06', '2025-05', '2025-06', '2025-07', '2025-08'])

    const crude = riseSplit(ms, values, releases)
    const crudeGap = crude.withRelease.share! - crude.without.share!
    const s = stratifiedRiseGap(ms, values, releases)

    // 2025 sube entero, con lanzamiento y sin él: adentro de ese año no hay ninguna ventaja.
    const y2025 = s.strata.find(x => x.key === '2025')!
    expect(y2025.withRelease.share).toBe(1)
    expect(y2025.without.share).toBe(1)

    expect(crudeGap).toBeGreaterThan(0.2)
    expect(s.gap!).toBeLessThan(crudeGap / 2)
    expect(s.weight).toBeGreaterThan(0)
  })

  it('conserva una ventaja que sí está adentro del año', () => {
    const ms = months(2025)
    // Escalón en el medio del año; con ventana de 1 mes sólo lo cruzan los meses del escalón.
    const values = ms.map((_, i) => (i >= 6 ? 9 : 0))
    const s = stratifiedRiseGap(ms, values, new Set(['2025-06']), 1)
    const y = s.strata.find(x => x.key === '2025')!
    expect(y.withRelease.share).toBe(1)
    expect(y.without.share).toBeLessThan(1)
    expect(s.gap!).toBeGreaterThan(0)
  })

  it('pesa cada año por sus meses con lanzamiento', () => {
    const ms = [...months(2024), ...months(2025)]
    const values = ms.map(() => 1)
    const s = stratifiedRiseGap(ms, values, new Set(['2024-06', '2025-05', '2025-06']))
    // Serie plana: nadie sube, así que todas las brechas son 0 y el peso son los 3 meses.
    expect(s.gap).toBe(0)
    expect(s.weight).toBe(3)
  })

  it('un hueco (null) descarta el mes, no lo promedia con menos valores', () => {
    const ms = months(2025)
    const values: Array<number | null> = ms.map((_, i) => i)
    values[4] = null
    const s = stratifiedRiseGap(ms, values, new Set(['2025-06']))
    // 2025-06 es el índice 5 y el hueco cae en su ventana previa: no puede entrar.
    const y = s.strata.find(x => x.key === '2025')
    expect(y?.withRelease.n ?? 0).toBe(0)
  })
})
