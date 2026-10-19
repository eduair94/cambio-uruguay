import { describe, expect, it } from 'vitest'
import { addIva, URUGUAY } from '../../utils/calculators'
import { indicatorFromSlug, type EvolutionPoint } from '../../utils/indicators'
import { IVA_TASA_BASICA, IVA_TASA_MINIMA } from '../../utils/ivaTarjeta'
import { computePayroll } from '../../utils/payroll'
import {
  TOOL_SNIPPET_IVA_EXAMPLE,
  TOOL_SNIPPET_IVA_SOURCES,
  TOOL_SNIPPET_PAYROLL_YEAR,
  TOOL_SNIPPET_SUELDO_NOMINAL,
  toolSnippetInflacion,
  toolSnippetIva,
  toolSnippetSueldoLiquido,
  uiYearChange,
  type ToolSnippet,
} from '../../utils/toolSnippets'

/** Mismo presupuesto que `seoTitleBudget` / `seoDescriptionBudget`: la marca cuenta. */
const MAX_TITLE = 60
const MAX_DESCRIPTION = 155
const withBrand = (title: string) => `${title} | Cambio Uruguay`

/** Los separadores de `toLocaleString`: espacio duro entre "$" y la cifra. */
const plain = (text: string) => text.replace(/\u00A0/g, ' ')

function expectFits(snippet: ToolSnippet) {
  expect(withBrand(snippet.title).length, snippet.title).toBeLessThanOrEqual(MAX_TITLE)
  if (snippet.description) {
    expect(snippet.description.length, snippet.description).toBeLessThanOrEqual(MAX_DESCRIPTION)
  }
}

describe('toolSnippetIva', () => {
  const snippet = toolSnippetIva()

  it('contesta con las dos tasas del T.O. 2023 en el título y en la descripción', () => {
    for (const rate of [IVA_TASA_BASICA, IVA_TASA_MINIMA]) {
      expect(snippet.title).toContain(`${rate} %`)
      expect(snippet.description).toContain(`${rate} %`)
    }
    expect(snippet.title).toMatch(/^IVA en Uruguay/)
    expect(snippet.title).toMatch(/calculadora/i)
  })

  it('el ejemplo es el que da la propia calculadora', () => {
    const r = addIva(TOOL_SNIPPET_IVA_EXAMPLE, IVA_TASA_BASICA)
    expect(r.gross).toBe(1220)
    expect(plain(snippet.description!)).toContain('$ 1.000 + IVA = $ 1.220')
  })

  it('entra entero en el SERP', () => expectFits(snippet))

  it('cita la ley y la DGI, con URL oficial', () => {
    expect(TOOL_SNIPPET_IVA_SOURCES.length).toBeGreaterThanOrEqual(2)
    for (const source of TOOL_SNIPPET_IVA_SOURCES) {
      expect(source.url).toMatch(/^https:\/\/www\.(impo\.com\.uy|gub\.uy)\//)
    }
  })
})

describe('toolSnippetSueldoLiquido', () => {
  const bpc = URUGUAY.bpc
  const snippet = toolSnippetSueldoLiquido()

  it('publica un líquido que coincide con la regla, hecha a mano', () => {
    // El ejemplo va por debajo de 10 BPC: ahí el Decreto 148/007 art. 63 no suma el 6 % a la
    // renta, así que la cuenta es la escala lisa menos el crédito por deducciones.
    const n = TOOL_SNIPPET_SUELDO_NOMINAL
    expect(n).toBeGreaterThan(2.5 * bpc) // FONASA 4,5 % sin hijos ni cónyuge (BPS)
    expect(n).toBeGreaterThan(7 * bpc)
    expect(n).toBeLessThanOrEqual(10 * bpc)

    const aportes = n * 0.15 + n * 0.045 + n * 0.001
    const gross = (n - 7 * bpc) * 0.1
    const credit = aportes * 0.14 // nominal anual < 180 BPC
    const irpf = Math.max(0, gross - credit)
    const liquido = Math.round((n - aportes - irpf) * 100) / 100

    expect(computePayroll({ nominal: n }).liquido).toBeCloseTo(liquido, 2)
    expect(plain(snippet.description!)).toContain(
      `$ ${n.toLocaleString('es-UY')} nominales son $ ${Math.round(liquido).toLocaleString('es-UY')} en mano`
    )
  })

  it('el año del título es el de la BPC vigente que usa la calculadora', () => {
    const bpcIndicator = indicatorFromSlug('bpc')!
    expect(bpcIndicator.referenceValue).toBe(URUGUAY.bpc)
    expect(String(TOOL_SNIPPET_PAYROLL_YEAR)).toBe(bpcIndicator.legal!.validFrom.slice(0, 4))
    expect(snippet.title).toContain(String(TOOL_SNIPPET_PAYROLL_YEAR))
    expect(snippet.title.toLowerCase()).toContain('nominal a líquido')
  })

  it('entra entero en el SERP', () => expectFits(snippet))
})

describe('toolSnippetInflacion', () => {
  const day = (iso: string, value: number): EvolutionPoint => ({
    date: iso,
    buy: value,
    sell: value,
  })

  it('sin lectura viva no publica ninguna cifra, pero el título dice Uruguay', () => {
    const snippet = toolSnippetInflacion(null)
    expect(snippet.description).toBeUndefined()
    expect(snippet.title).toBe('Calculadora de inflación en Uruguay')
    expect(snippet.heading).toBe(snippet.title)
  })

  it('mide 12 meses de la UI y fecha el dato', () => {
    const points = [
      day('2025-10-19T03:00:00.000Z', 6.3739),
      day('2026-04-19T03:00:00.000Z', 6.52),
      day('2026-10-19T03:00:00.000Z', 6.6699),
    ]
    const change = uiYearChange(points)
    expect(change?.date).toBe('2026-10-19T03:00:00.000Z')
    expect(change?.pct).toBeCloseTo(4.644, 2)
    const snippet = toolSnippetInflacion(change)
    expect(snippet.description).toContain('subió 4,64 % en 12 meses')
    expect(snippet.description).toContain('BCU, 19 de octubre de 2026')
    expectFits(snippet)
  })

  it('no inventa la variación cuando la serie no llega a 12 meses', () => {
    const points = [day('2026-06-01T03:00:00.000Z', 6.5), day('2026-10-19T03:00:00.000Z', 6.67)]
    expect(uiYearChange(points)).toBeNull()
    expect(uiYearChange([])).toBeNull()
  })
})
