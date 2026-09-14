import { describe, expect, it } from 'vitest'
import {
  MUTUALISTA_COST_CONCEPTS,
  MUTUALISTA_COST_SOURCE,
  MUTUALISTA_COSTS,
  formatMutualistaBaseAmount,
  getMutualistaCostRows,
  normalizeMutualistaAffiliation,
  normalizeMutualistaAmount,
  normalizeMutualistaCondition,
  type MutualistaCostConceptId,
} from '../../utils/mutualistaCosts'

describe('MSP prices preserve source meaning', () => {
  it('does not turn blanks, numeric text, percentages or invalid values into a price', () => {
    for (const value of [undefined, null, '', '0', '371,60', '40%', NaN, Infinity, -1, false]) {
      expect(normalizeMutualistaAmount(value)).toBeNull()
    }
    expect(normalizeMutualistaAmount(0)).toBe(0)
    expect(normalizeMutualistaAmount(371.59852199681904)).toBe(371.59852199681904)
  })

  it('keeps named conditions but does not infer a convenio from auxiliary percentages', () => {
    expect(normalizeMutualistaCondition(' ANCAP ')).toBe('ANCAP')
    for (const value of [null, undefined, '', '  ', 0.4, 0]) {
      expect(normalizeMutualistaCondition(value)).toBeNull()
    }
    const casmu = getMutualistaCostRows('casmu', 'medicamentos', 'fonasa')
    const discount = casmu.find(row => row.column === 'Q')
    expect(discount?.condition).toBeNull()
    expect(discount?.label).toBe('PRECIO 4 = 40% desceunto')
  })

  it('keeps Sanidad Policial distinct from both FONASA groups', () => {
    expect(normalizeMutualistaAffiliation(' NO  FONASA ')).toBe('no-fonasa')
    expect(normalizeMutualistaAffiliation('fonasa')).toBe('fonasa')
    expect(normalizeMutualistaAffiliation('SANIDAD POLICIAL')).toBe('sanidad-policial')
    expect(normalizeMutualistaAffiliation('particular')).toBeNull()
    expect(normalizeMutualistaAffiliation(null)).toBeNull()
    const rows = getMutualistaCostRows('gremeda', 'medicamentos', 'sanidad-policial')
    expect(rows.map(row => row.column)).toEqual(['Q', 'R'])
    expect(getMutualistaCostRows('gremeda', 'medicamentos', 'no-fonasa')).not.toEqual(
      expect.arrayContaining(rows)
    )
  })

  it('preserves different columns, source cells and blanks in the same institution', () => {
    const rows = getMutualistaCostRows('a-espanola', 'medicina-general', 'fonasa')
    expect(rows).toHaveLength(16)
    expect(rows.find(row => row.column === 'W')).toMatchObject({
      amountUyu: 172.66469098326567,
      sourceCell: 'A.Española!W25',
      valueCell: 'W25',
      condition: null,
      maximumAuthorizedUyu: 172.66469098326567,
    })
    expect(rows.find(row => row.column === 'Y')?.amountUyu).toBeNull()
    expect(rows.find(row => row.column === 'AB')).toMatchObject({
      amountUyu: 82.14085989509563,
      condition: 'ANCAP',
      sourceCell: 'A.Española!AB25',
    })
    expect(getMutualistaCostRows('a-espanola', 'medicamentos', 'fonasa')).toEqual(
      expect.arrayContaining([expect.objectContaining({ column: 'Z', amountUyu: 0 })])
    )
  })

  it('does not replace the published maximum with a calculated maximum', () => {
    const row = getMutualistaCostRows('camedur', 'medicina-general', 'sanidad-policial').find(
      item => item.column === 'N'
    )
    expect(row).toMatchObject({
      sourceCell: 'CAMEDUR!N25',
      amountUyu: 160,
      maximumAuthorizedUyu: 150.77739354179056,
      exceedsPublishedMaximum: true,
    })
    const anomalies = MUTUALISTA_COSTS.flatMap(institution =>
      MUTUALISTA_COST_CONCEPTS.flatMap(concept =>
        getMutualistaCostRows(institution.id, concept.id).filter(row => row.exceedsPublishedMaximum)
      )
    )
    expect(anomalies.map(item => item.sourceCell)).toEqual(['CAMEDUR!N25'])
  })

  it('uses the institution field, preserving the sheet name separately', () => {
    expect(MUTUALISTA_COSTS.find(item => item.id === 'amdm')).toMatchObject({
      sheet: 'AMDM',
      name: 'AMECOM',
    })
  })

  it('retains the complete five-concept extraction from the dated 34-sheet publication', () => {
    expect(MUTUALISTA_COST_SOURCE).toMatchObject({
      publishedAt: '2026-09-03',
      effectiveFrom: '2026-07-01',
      sha256: '1c189260422ff5a131bbb2e87d862b1c0226974378d2d402eea5337a868df821',
    })
    expect(MUTUALISTA_COSTS).toHaveLength(34)
    expect(new Set(MUTUALISTA_COSTS.map(item => item.id)).size).toBe(34)
    expect(MUTUALISTA_COSTS.reduce((total, item) => total + item.columns.length, 0)).toBe(422)
    for (const institution of MUTUALISTA_COSTS) {
      expect(institution.effectiveFrom).toBe('2026-07-01')
      for (const concept of MUTUALISTA_COST_CONCEPTS) {
        expect(institution.sourceRows[concept.id].label).toBe(concept.sourceLabel)
        const maximum = institution.maxima[concept.id]
        expect(maximum).not.toBeNull()
        expect(maximum).toBeGreaterThanOrEqual(0)
        expect(maximum).toBeLessThanOrEqual(880)
      }
    }
  })

  it('returns no fabricated rows for an unknown institution or concept', () => {
    expect(getMutualistaCostRows('', 'medicamentos')).toEqual([])
    expect(getMutualistaCostRows('unknown', 'medicamentos')).toEqual([])
    expect(getMutualistaCostRows('casmu', 'unknown' as MutualistaCostConceptId)).toEqual([])
  })

  it('formats base amounts without adding taxes or changing missing values into free prices', () => {
    expect(formatMutualistaBaseAmount(371.59852199681904)).toBe('$ 371,60')
    expect(formatMutualistaBaseAmount(0)).toBe('$ 0,00')
    expect(formatMutualistaBaseAmount(null)).toBe('Sin dato')
  })
})
