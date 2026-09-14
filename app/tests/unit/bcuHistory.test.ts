import { describe, expect, it } from 'vitest'
import {
  bcuHistoryCopy,
  bcuReferenceExplanation,
  formatBcuNumber,
  formatBcuReference,
  hasSingleBcuReference,
} from '../../utils/bcuHistory'

describe('BCU reference fields', () => {
  it('requires exact equality throughout the supplied scope', () => {
    expect(hasSingleBcuReference([{ buy: 40.2, sell: 40.2 }])).toBe(true)
    expect(
      hasSingleBcuReference([
        { buy: 40.1, sell: 40.2 },
        { buy: 40.2, sell: 40.2 },
      ])
    ).toBe(false)
    expect(hasSingleBcuReference([{ buy: 40.2001, sell: 40.2002 }])).toBe(false)
    for (const rows of [
      [],
      [{ buy: 0, sell: 0 }],
      [{ buy: NaN, sell: NaN }],
      [{ buy: Infinity, sell: Infinity }],
      [{ buy: 40, sell: 0 }],
    ]) {
      expect(hasSingleBcuReference(rows)).toBe(false)
    }
  })

  it('preserves small differences and indexed-unit precision, without publishing zero for missing values', () => {
    expect(formatBcuReference({ buy: 40.2001, sell: 40.2002 })).toBe('TCC 40,2001 · TCV 40,2002')
    expect(formatBcuReference({ buy: 6.6426, sell: 6.6426 })).toBe('6,6426')
    expect(formatBcuNumber(6.6426, 'en')).toBe('6.6426')
    expect(formatBcuNumber(0)).toBe('—')
  })

  it.each(['es', 'en', 'pt'])('limits the BEVSA methodology to USD PROMED.FONDO (%s)', locale => {
    expect(bcuReferenceExplanation('usd', 'promed.fondo', locale)).toContain('BEVSA')
    for (const type of ['CABLE', 'BILLETE', '', 'UNKNOWN']) {
      expect(bcuReferenceExplanation('USD', type, locale)).not.toContain('BEVSA')
    }
    for (const currency of ['UI', 'UP', 'UR']) {
      expect(bcuReferenceExplanation(currency, 'PROMED.FONDO', locale)).toBe(
        bcuHistoryCopy(locale).indexed
      )
      expect(bcuHistoryCopy(locale).unit(currency)).toContain(`1 ${currency}`)
    }
  })
})
