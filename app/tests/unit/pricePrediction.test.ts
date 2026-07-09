import { describe, it, expect } from 'vitest'
import { computePeriodChanges, parseAiReply } from '../../server/utils/pricePrediction'

describe('computePeriodChanges', () => {
  it('computes 7d/30d/90d pct change from a 100-point daily series', () => {
    // index 0 = 100 days ago ... index 99 = latest (today)
    const series = Array.from({ length: 100 }, (_, i) => ({
      date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
      value: 40 + i * 0.1, // steadily rising, so pctChange should be positive for every window
    }))
    const changes = computePeriodChanges(series)
    expect(changes).toHaveLength(3)
    const byPeriod = Object.fromEntries(changes.map(c => [c.period, c.pctChange]))
    expect(byPeriod['7d']).toBeGreaterThan(0)
    expect(byPeriod['30d']).toBeGreaterThan(0)
    expect(byPeriod['90d']).toBeGreaterThan(0)
    // 90d window should show a larger cumulative pct change than the 7d window
    expect(byPeriod['90d']).toBeGreaterThan(byPeriod['7d']!)
  })

  it('returns empty array when series has fewer than 2 points', () => {
    expect(computePeriodChanges([])).toEqual([])
    expect(computePeriodChanges([{ date: '2026-01-01', value: 40 }])).toEqual([])
  })

  it('skips a period whose anchor point would be zero-valued', () => {
    const series = [
      { date: '2026-01-01', value: 0 },
      { date: '2026-01-02', value: 40 },
    ]
    const changes = computePeriodChanges(series)
    expect(changes.find(c => c.period === '7d')).toBeUndefined()
  })
})

describe('parseAiReply', () => {
  it('parses a well-formed reply into lean/confidence/reasoning', () => {
    const text =
      'LEAN: up\nCONFIANZA: media\nRAZONAMIENTO: El dólar mostró una tendencia alcista leve en la última semana, sin catalizadores fuertes.'
    const parsed = parseAiReply(text)
    expect(parsed).toEqual({
      lean: 'up',
      confidence: 'medium',
      reasoning:
        'El dólar mostró una tendencia alcista leve en la última semana, sin catalizadores fuertes.',
    })
  })

  it('is case-insensitive on the LEAN/CONFIANZA labels and values', () => {
    const text = 'lean: DOWN\nconfianza: ALTA\nrazonamiento: Presión bajista sostenida.'
    const parsed = parseAiReply(text)
    expect(parsed?.lean).toBe('down')
    expect(parsed?.confidence).toBe('high')
  })

  it('returns null when a required field is missing', () => {
    expect(parseAiReply('LEAN: up\nRAZONAMIENTO: algo')).toBeNull()
    expect(parseAiReply('')).toBeNull()
  })

  it('returns null when the reasoning is empty', () => {
    expect(parseAiReply('LEAN: up\nCONFIANZA: baja\nRAZONAMIENTO:   ')).toBeNull()
  })
})
