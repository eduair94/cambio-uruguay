import { describe, expect, it } from 'vitest'
import {
  SOMMIER_DESCRIPTION,
  SOMMIER_MIN_SAMPLE,
  SOMMIER_SIZES,
  SOMMIER_TITLE,
  sommierAnalyze,
  sommierAnswer,
  sommierBasePremium,
  sommierBuildResponse,
  sommierCore,
  sommierEmptyResponse,
  sommierFaq,
  sommierHasComfortLayer,
  sommierInTramo,
  sommierListPriceUyu,
  sommierPerNight,
  sommierSaysOrtopedico,
  sommierShare,
  sommierSize,
  type SommierListingRow,
} from '../../utils/sommierBudget'
import type { EquiparBand } from '../../utils/equipar'

const row = (priceUyu: number, title = 'Sommier 2 plazas', listPrice: number | null = null) =>
  ({ title, price: priceUyu, priceUyu, listPrice }) satisfies SommierListingRow

const band: EquiparBand = { p25: 20_000, median: 30_000, p75: 40_000, min: 10_000, n: 40 }

describe('lo que dice el título', () => {
  it.each([
    ['Sommier Rosen Pocket 2 Plazas', 'pocket'],
    ['Sommier Resortes Ensacados 160x200', 'pocket'],
    ['Sommier Inducol Bonnell 2 Plazas', 'bonnell'],
    ['Sommier Bonell 140x190', 'bonnell'],
    ['Sommier Resortes 2 Plazas Inducol', 'resortes'],
    ['Sommier Espuma Alta Densidad 2 Plazas', 'espuma'],
    ['Sommier D28 2 Plazas', 'espuma'],
    ['Sommier Divino Grand Royal', 'sin-dato'],
  ])('%s → %s', (title, core) => {
    expect(sommierCore(title)).toBe(core)
  })

  it('el núcleo manda sobre la capa: pocket con espuma arriba es pocket', () => {
    expect(sommierCore('Sommier Pocket + Espuma Viscoelástica Pillow Top')).toBe('pocket')
    expect(sommierHasComfortLayer('Sommier Pocket + Espuma Viscoelástica Pillow Top')).toBe(true)
    expect(sommierHasComfortLayer('Sommier Bonnell 2 plazas')).toBe(false)
  })

  it('reconoce las palabras que nadie certifica, con o sin tilde', () => {
    expect(sommierSaysOrtopedico('Sommier Ortopédico 2 Plazas')).toBe(true)
    expect(sommierSaysOrtopedico('Sommier Terapeutico')).toBe(true)
    expect(sommierSaysOrtopedico('Sommier Postural Pocket')).toBe(true)
    expect(sommierSaysOrtopedico('Sommier Pocket 2 plazas')).toBe(false)
  })
})

describe('el precio tachado', () => {
  it('se pasa a pesos con la misma cotización que el precio del aviso', () => {
    // Un aviso en dólares: USD 600 tachado a USD 800, a 40 pesos.
    expect(sommierListPriceUyu({ title: '', price: 600, priceUyu: 24_000, listPrice: 800 })).toBe(
      32_000
    )
  })

  it('un "tachado" igual o menor que el precio no es un tachado', () => {
    expect(sommierListPriceUyu(row(30_000, '', 30_000))).toBeNull()
    expect(sommierListPriceUyu(row(30_000, '', 25_000))).toBeNull()
    expect(sommierListPriceUyu(row(30_000, '', null))).toBeNull()
  })
})

describe('los tramos', () => {
  it('cada precio cae en un solo tramo, y p25 y p75 son del medio', () => {
    const tramos = sommierAnalyze(
      Array.from({ length: 20 }, (_, i) => row(15_000 + i * 2_000)),
      band
    ).tramos
    for (const price of [19_999, 20_000, 30_000, 40_000, 40_001, 45_000, 60_000]) {
      expect(
        tramos.filter(tramo => sommierInTramo(price, tramo)).length,
        `${price} cae en un solo tramo`
      ).toBe(1)
    }
    const medio = tramos.find(tramo => tramo.key === 'medio')!
    expect(sommierInTramo(20_000, medio)).toBe(true)
    expect(sommierInTramo(40_000, medio)).toBe(true)
  })

  it('cuenta lo que dice el título en cada tramo, y los tramos suman todos los avisos', () => {
    const rows = [
      ...Array.from({ length: 6 }, () => row(15_000, 'Sommier Espuma 2 plazas')),
      ...Array.from({ length: 10 }, () => row(30_000, 'Sommier Bonnell 2 plazas', 45_000)),
      ...Array.from({ length: 4 }, () => row(45_000, 'Sommier Pocket Pillow Top Ortopédico')),
      ...Array.from({ length: 2 }, () => row(90_000, 'Sommier Pocket Latex')),
    ]
    const analysis = sommierAnalyze(rows, band)
    expect(analysis.listings).toBe(22)
    expect(analysis.tramos.reduce((sum, tramo) => sum + tramo.n, 0)).toBe(22)
    const bajo = analysis.tramos.find(tramo => tramo.key === 'bajo')!
    expect(bajo.cores.espuma).toBe(6)
    const medio = analysis.tramos.find(tramo => tramo.key === 'medio')!
    expect(medio.cores.bonnell).toBe(10)
    expect(medio.tachado).toBe(10)
    const above = analysis.tramos.filter(tramo => tramo.key === 'alto' || tramo.key === 'tope')
    expect(above.reduce((sum, tramo) => sum + tramo.cores.pocket, 0)).toBe(6)
    expect(above.reduce((sum, tramo) => sum + tramo.comfort, 0)).toBe(6)
  })

  it('sin la muestra mínima no parte en tramos ni publica un p90', () => {
    const analysis = sommierAnalyze(
      Array.from({ length: SOMMIER_MIN_SAMPLE - 1 }, () => row(30_000)),
      band
    )
    expect(analysis.listings).toBe(SOMMIER_MIN_SAMPLE - 1)
    expect(analysis.p90).toBeNull()
    expect(analysis.tramos).toEqual([])
    expect(analysis.tachado).toBeNull()
  })

  it('sin banda publicada tampoco: los cortes de 25 % y 75 % son los de la ficha', () => {
    const analysis = sommierAnalyze(
      Array.from({ length: 20 }, (_, i) => row(20_000 + i * 1_000)),
      null
    )
    expect(analysis.tramos).toEqual([])
    expect(analysis.p90).not.toBeNull()
  })

  it('si el p90 de los avisos queda debajo del p75 de la banda, el tramo de arriba queda abierto', () => {
    const analysis = sommierAnalyze(
      Array.from({ length: 10 }, () => row(25_000)),
      band
    )
    expect(analysis.p90).toBe(25_000)
    expect(analysis.tramos.map(tramo => tramo.key)).toEqual(['bajo', 'medio', 'alto'])
    expect(analysis.tramos.at(-1)!.to).toBeNull()
  })

  it('una proporción con menos de 5 avisos no se imprime', () => {
    expect(sommierShare(2, 4)).toBe('—')
    expect(sommierShare(2, 5)).toBe('2 de 5')
  })
})

describe('las comparaciones exigen muestra en los dos lados', () => {
  it('"ortopédico" contra el resto sólo con 8 de cada lado', () => {
    const rows = [
      ...Array.from({ length: 8 }, () => row(44_000, 'Sommier Ortopédico 2 plazas')),
      ...Array.from({ length: 8 }, () => row(40_000, 'Sommier 2 plazas')),
    ]
    expect(sommierAnalyze(rows, band).ortopedico).toEqual({
      n: 8,
      median: 44_000,
      otherN: 8,
      otherMedian: 40_000,
      premiumPct: 10,
    })
    expect(sommierAnalyze(rows.slice(1), band).ortopedico).toBeNull()
  })

  it('el tachado cuenta cuántos tachan por encima del p90 de lo que cobra el mercado', () => {
    const rows = [
      ...Array.from({ length: 9 }, (_, i) => row(20_000 + i * 1_000)),
      row(30_000, 'Sommier', 100_000),
    ]
    const { tachado, p90 } = sommierAnalyze(rows, band)
    expect(p90).not.toBeNull()
    expect(tachado).toMatchObject({ total: 10, withList: 1, medianOffPct: 70, listAboveP90: 1 })
  })

  it('la base suma lo que separa las dos medianas, nunca un número negativo', () => {
    const colchon: EquiparBand = { ...band, median: 20_000 }
    expect(sommierBasePremium({ band, colchonBand: colchon })).toEqual({ diff: 10_000, pct: 50 })
    expect(sommierBasePremium({ band: colchon, colchonBand: band })).toBeNull()
    expect(sommierBasePremium({ band, colchonBand: null })).toBeNull()
  })
})

describe('la respuesta', () => {
  it('siempre trae las tres medidas, en su orden, aunque la base no conteste', () => {
    const empty = sommierEmptyResponse()
    expect(empty.sizes.map(size => size.variant)).toEqual(SOMMIER_SIZES.map(size => size.variant))
    expect(empty.sizes.every(size => size.band === null && size.analysis.listings === 0)).toBe(true)
  })

  it('arma cada medida con su banda, la del colchón y sus avisos', () => {
    const response = sommierBuildResponse({
      generatedAt: '2026-10-20T13:00:00Z',
      sommierBands: { '2plazas': band },
      colchonBands: { '2plazas': { ...band, median: 18_000 }, queen: band },
      rowsByVariant: { '2plazas': Array.from({ length: 12 }, () => row(30_000)) },
    })
    const dos = sommierSize(response, '2plazas')!
    expect(dos.band).toEqual(band)
    expect(dos.colchonBand?.median).toBe(18_000)
    expect(dos.analysis.listings).toBe(12)
    const queen = sommierSize(response, 'queen')!
    expect(queen.band).toBeNull()
    expect(queen.colchonBand).toEqual(band)
  })

  it('el párrafo de arriba da la banda del día con su fecha de Montevideo', () => {
    const response = sommierBuildResponse({
      generatedAt: '2026-10-20T02:00:00Z',
      sommierBands: { '2plazas': band },
      colchonBands: {},
      rowsByVariant: { '2plazas': Array.from({ length: 20 }, (_, i) => row(20_000 + i * 2_000)) },
    })
    const text = sommierAnswer(sommierSize(response, '2plazas'), response.generatedAt)
    expect(text).toContain('$\u00A030.000 en mediana')
    expect(text).toContain('entre $\u00A020.000 y $\u00A040.000')
    expect(text).toContain('nueve de cada diez')
    // 02:00 UTC del 20 es todavía el 19 en Montevideo.
    expect(text).toContain('19 de octubre de 2026')
  })

  it('sin banda no inventa una: lo dice, y da el colchón solo como piso si lo tiene', () => {
    const response = sommierBuildResponse({
      generatedAt: null,
      sommierBands: {},
      colchonBands: { '2plazas': { ...band, median: 18_000 } },
      rowsByVariant: {},
    })
    const text = sommierAnswer(sommierSize(response, '2plazas'), null)
    expect(text).toContain('Todavía no reunimos')
    expect(text).toContain('$\u00A018.000')
    expect(sommierAnswer(null, null)).toContain('Todavía no reunimos')
  })

  it('el FAQ contesta con cifras cuando las hay y lo dice cuando no', () => {
    const full = sommierBuildResponse({
      generatedAt: '2026-10-20T13:00:00Z',
      sommierBands: { '2plazas': band },
      colchonBands: { '2plazas': { ...band, median: 20_000 } },
      rowsByVariant: { '2plazas': Array.from({ length: 20 }, (_, i) => row(20_000 + i * 2_000)) },
    })
    const faq = sommierFaq(sommierSize(full, '2plazas'), full.generatedAt)
    expect(new Set(faq.map(item => item.id)).size).toBe(faq.length)
    expect(faq.find(item => item.id === 'cuanto-sale')!.answer).toContain('$\u00A030.000')
    expect(faq.find(item => item.id === 'vs-colchon')!.answer).toContain('$\u00A010.000')
    expect(faq.find(item => item.id === 'usado')!.answer).toMatch(/^No/)

    const empty = sommierFaq(null, null)
    expect(empty.find(item => item.id === 'cuanto-sale')!.answer).toContain('Todavía no')
    expect(empty.every(item => !item.answer.includes('NaN'))).toBe(true)
  })
})

describe('el precio por noche', () => {
  it('reparte el precio en los años que elige el lector', () => {
    expect(sommierPerNight(36_500, 10)).toBe(10)
    expect(sommierPerNight(0, 8)).toBeNull()
    expect(sommierPerNight(30_000, 0)).toBeNull()
  })
})

describe('el snippet entra en el SERP', () => {
  it('el título con la marca no pasa de 60 y la descripción no pasa de 155', () => {
    expect(`${SOMMIER_TITLE} | Cambio Uruguay`.length).toBeLessThanOrEqual(60)
    expect(SOMMIER_DESCRIPTION.length).toBeLessThanOrEqual(155)
  })
})
