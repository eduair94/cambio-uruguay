import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  AJUSTE_PASIVIDADES_2026_PCT,
  BPS_FIGURES_2026_SOURCE_URL,
  BPS_FIGURES_2026_UPDATED_AT,
  BPS_FIGURES_2026_VERIFIED_AT,
  JUBILACION_MINIMA_2026,
  PENSION_VEJEZ_INVALIDEZ_2026,
} from '../../utils/bpsFigures2026'
import { AMOUNT_2026, ADJUSTMENT_2026_PCT } from '../../utils/pensionVejez'
import {
  RETIREMENT_ADJUSTMENT_2026_PCT,
  RETIREMENT_MIN_GENERAL_2026,
} from '../../utils/retirementAge'
import {
  APPLY_STEPS,
  AUMENTO_2026_FROM,
  AUMENTO_2026_PCT,
  BASE_2026,
  DEDUCTION_PCT,
  ELIGIBLE,
  EXAMPLES,
  SUPLEMENTO_FAQ,
  SUPLEMENTO_SOURCES,
  SUPLEMENTO_VERIFIED_AT,
  estimateSupplement,
} from '../../utils/suplementoSolidario'

describe('suplemento solidario 2026', () => {
  it('valores oficiales', () => {
    expect(BASE_2026).toBe(17591)
    expect(DEDUCTION_PCT).toBe(33)
    // Las dos cifras del BPS se leen del módulo canónico: `suplementoSolidario` ya no las exporta.
    expect(JUBILACION_MINIMA_2026).toBe(20935)
    expect(PENSION_VEJEZ_INVALIDEZ_2026).toBe(18575)
    expect(SUPLEMENTO_VERIFIED_AT).toBe('2026-09-15')
  })
  it('estimateSupplement descuenta el 33 % de la pasividad', () => {
    expect(estimateSupplement(15000)).toBe(12641)
    expect(estimateSupplement(30000)).toBe(7691)
    expect(estimateSupplement(53400)).toBe(0)
    expect(estimateSupplement(0)).toBe(17591)
  })
  it('otros ingresos: 33 % sobre el tope si tiene 65 o más, 100 % si no', () => {
    expect(estimateSupplement(30000, { otherIncome: 3000, age: 70 })).toBe(7691 - 990)
    expect(estimateSupplement(30000, { otherIncome: 3000, age: 60 })).toBe(7691 - 3000)
  })
  it('basura → null', () => {
    expect(estimateSupplement(Number.NaN)).toBeNull()
    expect(estimateSupplement(-5)).toBeNull()
    expect(estimateSupplement(30000, { otherIncome: Number.NaN })).toBeNull()
  })
  it('los ejemplos de la tabla salen de la misma función', () => {
    for (const e of EXAMPLES) expect(estimateSupplement(e.pension)).toBe(e.supplement)
  })
  it('catálogo', () => {
    expect(ELIGIBLE.length).toBeGreaterThanOrEqual(2)
    expect(APPLY_STEPS.length).toBeGreaterThanOrEqual(3)
    expect(SUPLEMENTO_FAQ.length).toBeGreaterThanOrEqual(6)
    for (const f of SUPLEMENTO_FAQ) expect(f.answer.length).toBeGreaterThan(40)
    expect(SUPLEMENTO_SOURCES.length).toBeGreaterThanOrEqual(4)
    for (const s of SUPLEMENTO_SOURCES) expect(s.url).toMatch(/^https:\/\//)
  })
})

// Las tres cifras del BPS de 2026 (mínima, pensión vejez/invalidez, ajuste) estaban declaradas tres
// veces, con tres nombres distintos, en tres archivos. El BPS reajusta TODOS los marzos: dos copias
// actualizadas y una olvidada dejan una página publicando una cifra vieja, verde en toda la suite.
// Estas pruebas fijan que haya UNA casa (`utils/bpsFigures2026.ts`) y que los otros tres módulos
// la importen en vez de repetir el literal.
describe('una sola casa para las cifras del BPS 2026', () => {
  it('el módulo canónico publica las tres cifras con su fuente y su fecha', () => {
    expect(JUBILACION_MINIMA_2026).toBe(20935)
    expect(PENSION_VEJEZ_INVALIDEZ_2026).toBe(18575)
    expect(AJUSTE_PASIVIDADES_2026_PCT).toBe(5.97)
    expect(BPS_FIGURES_2026_SOURCE_URL).toMatch(/^https:\/\/www\.bps\.gub\.uy\//)
    expect(BPS_FIGURES_2026_UPDATED_AT).toBe('2026-02-09')
    expect(BPS_FIGURES_2026_VERIFIED_AT).toBe('2026-09-16')
  })

  it('los alias de cada módulo devuelven exactamente esas cifras', () => {
    expect(RETIREMENT_MIN_GENERAL_2026).toBe(JUBILACION_MINIMA_2026)
    expect(AMOUNT_2026).toBe(PENSION_VEJEZ_INVALIDEZ_2026)
    expect(AUMENTO_2026_PCT).toBe(AJUSTE_PASIVIDADES_2026_PCT)
    expect(RETIREMENT_ADJUSTMENT_2026_PCT).toBe(AJUSTE_PASIVIDADES_2026_PCT)
    expect(ADJUSTMENT_2026_PCT).toBe(AJUSTE_PASIVIDADES_2026_PCT)
    expect(AUMENTO_2026_FROM).toBe(BPS_FIGURES_2026_UPDATED_AT)
  })

  it('ningún consumidor vuelve a declarar el literal por su cuenta', () => {
    const utils = join(__dirname, '..', '..', 'utils')
    for (const file of ['suplementoSolidario.ts', 'retirementAge.ts', 'pensionVejez.ts']) {
      const source = readFileSync(join(utils, file), 'utf8')
      expect(source).toContain('./bpsFigures2026')
      // Una asignación cruda del número es justo la duplicación que se eliminó.
      expect(source).not.toMatch(/=\s*20935\b/)
      expect(source).not.toMatch(/=\s*18575\b/)
      expect(source).not.toMatch(/=\s*5\.97\b/)
    }
  })

  // `utils/` es un namespace plano para el auto-import de Nuxt: si dos archivos exportan el mismo
  // nombre, cuál gana depende del orden de escaneo. Las tres cifras canónicas tienen que salir de
  // UN solo archivo, y esto lo vigila por texto, que es lo único que ve la colisión.
  it('ningún otro módulo de utils/ re-exporta los nombres canónicos', () => {
    const canonical = [
      'JUBILACION_MINIMA_2026',
      'PENSION_VEJEZ_INVALIDEZ_2026',
      'AJUSTE_PASIVIDADES_2026_PCT',
    ]
    // Sin regex "clever": una declaración `export const X`, o el cuerpo de un `export { … }`.
    // Los `import { … }` no cuentan, que es justo lo que hacen retirementAge y pensionVejez.
    const exportsCanonical = (source: string) =>
      canonical.some(name => {
        if (new RegExp(`export\\s+const\\s+${name}\\b`).test(source)) return true
        return source
          .split(/\bexport\s*\{/)
          .slice(1)
          .some(chunk => new RegExp(`\\b${name}\\b`).test(chunk.split('}')[0] ?? ''))
      })

    const utils = join(__dirname, '..', '..', 'utils')
    const owners = readdirSync(utils)
      .filter(f => f.endsWith('.ts'))
      .filter(f => exportsCanonical(readFileSync(join(utils, f), 'utf8')))
    expect(owners).toEqual(['bpsFigures2026.ts'])
  })
})
