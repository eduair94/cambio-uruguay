import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { COST_MODEL, estimateBudget } from '../../utils/costOfLiving'
import { formatUYU } from '../../utils/format'

/**
 * El título de /herramientas/costo-de-vida lleva lo esencial por mes de una persona sola
 * alquilando en Montevideo: el número que la calculadora muestra al abrir. Este test fija que el
 * escenario del título sea el de los valores por defecto de la página y que el título entre en
 * el SERP aun cuando el total pase a seis cifras.
 */
const SOURCE = readFileSync(
  join(__dirname, '..', '..', 'pages', 'herramientas', 'costo-de-vida.vue'),
  'utf8'
)

describe('título vivo de la calculadora de costo de vida', () => {
  it('entra en 60 caracteres con seis cifras', () => {
    const title = `Costo de vida en Uruguay: ${formatUYU(159_300, 0)} al mes | Cambio Uruguay`
    expect(title.length).toBeLessThanOrEqual(60)
  })

  it('el ingreso no cambia el total del título', () => {
    const base = {
      situation: 'solo',
      city: 'montevideo',
      housing: 'alquila',
      children: 0,
      zone: 'intermedio',
      transport: 'publico_diario',
      lifestyle: 'moderado',
      health: 'fonasa',
    } as const
    const a = estimateBudget({ ...base, netIncome: 0 }, COST_MODEL).essentials
    const b = estimateBudget({ ...base, netIncome: 60_000 }, COST_MODEL).essentials
    expect(a).toBe(b)
    expect(a).toBeGreaterThan(0)
  })

  it('el escenario del título es el de los valores por defecto de la página', () => {
    for (const [name, value] of [
      ['situation', 'solo'],
      ['city', 'montevideo'],
      ['housing', 'alquila'],
      ['zone', 'intermedio'],
      ['transport', 'publico_diario'],
      ['lifestyle', 'moderado'],
      ['health', 'fonasa'],
    ] as const) {
      expect(SOURCE, name).toMatch(new RegExp(`const ${name} = ref<\\w+>\\('${value}'\\)`))
      expect(SOURCE, name).toContain(`${name}: '${value}',`)
    }
  })

  it('pasa el título y la descripción a ToolShell sólo con el modelo vivo', () => {
    expect(SOURCE).toContain(':seo-title="seoTitle"')
    expect(SOURCE).toContain(':seo-description="seoDescription"')
    expect(SOURCE).toMatch(/if \(!live\.value\?\.model\) return null/)
  })
})
