import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { irpfBracketsUyu, URUGUAY } from '../../utils/calculators'
import { formatUYU } from '../../utils/format'
import { ID_CARD_BY_KEY } from '../../utils/idCard'
import { titleFits } from '../../utils/liveRateSeo'
import { getWithdrawContent } from '../../utils/withdrawCash'

/**
 * Títulos que Google cortaba: los cinco pasaban de 60 caracteres con la marca y el SERP los
 * mostraba truncados justo antes de lo que distingue a la página (el urgente de la cédula, el
 * "rentas de capital" de inversiones). Cada test mide el título con los valores reales y, donde
 * lleva una cifra, también con la cifra un orden de magnitud más larga.
 */
const page = (...parts: string[]) =>
  readFileSync(join(__dirname, '..', '..', 'pages', ...parts), 'utf8')

describe('títulos que entran en el SERP', () => {
  it('cédula: renovación y urgente entran juntos', () => {
    const fmt = new Intl.NumberFormat('es-UY', { minimumFractionDigits: 0 })
    const pesos = (n: number) => `$${fmt.format(n)}`
    const title = (renewal: number, urgent: number) =>
      `Cuánto sale la cédula: ${pesos(renewal)}, urgente ${pesos(urgent)}`
    const renewal = ID_CARD_BY_KEY['renovacion-comun']!.arancel
    const urgent = ID_CARD_BY_KEY['renovacion-urgente']!.arancel
    expect(titleFits(title(renewal, urgent))).toBe(true)
    // El urgente es el doble: con la renovación en tres cifras y el urgente en cuatro todavía entra.
    expect(titleFits(title(999, 1_998))).toBe(true)
    // Más allá, la página cae a la renovación sola, que entra con cualquier importe realista.
    expect(titleFits(`Cuánto sale la cédula: ${pesos(99_999)}`)).toBe(true)
    const source = page('cuanto-sale-la-cedula-de-identidad-uruguaya.vue')
    expect(source).toContain(
      '[`Cuánto sale la cédula: ${pesos(renovacion.arancel)}, urgente ${pesos(urgente.arancel)}`]'
    )
    expect(source).toContain('`Cuánto sale la cédula: ${pesos(renovacion.arancel)}`')
  })

  it('IRPF: el mínimo no imponible sale de la franja al 0 % y entra aun con la BPC al doble', () => {
    const [first] = irpfBracketsUyu(URUGUAY.bpc)
    expect(first!.rate).toBe(0)
    for (const bpc of [URUGUAY.bpc, URUGUAY.bpc * 2]) {
      const exempt = formatUYU(irpfBracketsUyu(bpc)[0]!.upTo, 0)
      expect(titleFits(`Calculadora de IRPF: exento hasta ${exempt}`)).toBe(true)
    }
    const source = page('herramientas', 'calculadora-irpf.vue')
    expect(source).toContain(':seo-title="seoTitle"')
    expect(source).toContain('formatUYU(irpfBracketsUyu(URUGUAY.bpc)[0]!.upTo, 0)')
  })

  it('las dos calculadoras de impuestos pasan un título corto', () => {
    for (const [file, title] of [
      ['calculadora-impuestos-importacion.vue', 'Calculadora de impuestos de importación'],
      ['calculadora-impuestos-inversiones.vue', 'Calculadora de impuestos sobre inversiones'],
    ] as const) {
      expect(titleFits(title)).toBe(true)
      expect(page('herramientas', file)).toContain(`seo-title="${title} | Cambio Uruguay"`)
    }
  })

  it('retirar efectivo: los tres idiomas entran', () => {
    for (const locale of ['es', 'en', 'pt'] as const) {
      const { metaTitle } = getWithdrawContent(locale)
      expect(titleFits(metaTitle), `${locale}: ${metaTitle}`).toBe(true)
    }
  })
})
