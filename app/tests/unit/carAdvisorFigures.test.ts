import { describe, expect, it } from 'vitest'
import {
  CAR_ADVISOR_CHECKLIST,
  CAR_ADVISOR_FIGURES,
  PATENTE_2026,
  estimatePatenteUyu,
  latinNcapLabel,
} from '../../utils/carAdvisorFigures'
import { LATIN_NCAP, latinNcapResults } from '../../utils/latinNcap'

describe('patente 2026 (Texto Ordenado del SUCIVE)', () => {
  it('usado: 4,5 % del valor de mercado al dólar del SUCIVE', () => {
    expect(estimatePatenteUyu(13_000, 'nafta', 2019)).toBeCloseTo(13_000 * 41.826 * 0.045, 2)
    expect(estimatePatenteUyu(13_000, 'hibrido', 2019)).toBeCloseTo(24_468.21, 2)
  })
  it('eléctrico usado: 2,25 % del valor sin IVA', () => {
    expect(estimatePatenteUyu(20_000, 'electrico', 2022)).toBeCloseTo(
      ((20_000 * 41.826) / 1.22) * 0.0225,
      2
    )
  })
  it('ningún modelo 1992 o posterior paga menos que la banda 1986-1991', () => {
    expect(estimatePatenteUyu(3_000, 'nafta', 2005)).toBe(8_770.1)
  })
  it('los modelos viejos pagan su banda fija', () => {
    expect(estimatePatenteUyu(5_000, 'nafta', 1990)).toBe(8_770.1)
    expect(estimatePatenteUyu(5_000, 'nafta', 1985)).toBe(4_385.05)
    expect(estimatePatenteUyu(5_000, 'nafta', 1978)).toBe(2_923.37)
    expect(estimatePatenteUyu(5_000, 'nafta', 1970)).toBe(0)
  })
  it('las bonificaciones no se acumulan: 20 % pagando el año, 10 % pagando en fecha', () => {
    expect(PATENTE_2026.payYearBonus).toBe(0.2)
    expect(PATENTE_2026.onTimeBonus).toBe(0.1)
  })
})

describe('cifras con fecha y fuente', () => {
  const figures = [PATENTE_2026.figure, ...Object.values(CAR_ADVISOR_FIGURES)]
  it.each(figures.map(figure => [figure.source, figure]))('%s', (_, figure) => {
    expect(figure.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(figure.source.length).toBeGreaterThan(5)
    expect(figure.sourceUrl).toMatch(/^https:\/\//)
    expect(Number.isFinite(figure.value)).toBe(true)
  })
  it('el checklist enlaza sólo a fuentes oficiales o al propio sitio', () => {
    for (const item of CAR_ADVISOR_CHECKLIST) {
      if (item.url) expect(item.url).toMatch(/^https:\/\/([a-z]+\.)*gub\.uy\/|^\/[a-z]/)
    }
    expect(CAR_ADVISOR_CHECKLIST.length).toBeGreaterThanOrEqual(5)
  })
})

describe('Latin NCAP', () => {
  it('cada resultado viene de latinncap.com, con estrellas válidas para su protocolo', () => {
    expect(LATIN_NCAP.length).toBeGreaterThan(50)
    for (const entry of LATIN_NCAP) {
      expect(entry.url.startsWith('https://www.latinncap.com/')).toBe(true)
      expect(entry.testYear).toBeGreaterThanOrEqual(2010)
      const stars =
        entry.protocol === '2020+' ? [entry.stars] : [entry.adultStars, entry.childStars]
      for (const value of stars) {
        expect(Number.isInteger(value)).toBe(true)
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(5)
      }
    }
  })

  it('los ensayos de un modelo van del más reciente al más viejo, y un modelo sin ensayo no tiene', () => {
    const onix = latinNcapResults('chevrolet-onix', 10)
    expect(onix.length).toBeGreaterThan(1)
    expect(onix.map(entry => entry.testYear)).toEqual(
      [...onix.map(entry => entry.testYear)].sort((a, b) => b - a)
    )
    expect(latinNcapResults('volkswagen-saveiro')).toEqual([])
  })

  it('la etiqueta dice el protocolo, porque 2015 y 2023 no se comparan', () => {
    const old = LATIN_NCAP.find(entry => entry.protocol !== '2020+')!
    expect(latinNcapLabel(old)).toContain(old.protocol)
  })
})
