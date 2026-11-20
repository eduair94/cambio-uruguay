import { describe, expect, it } from 'vitest'
import {
  assembleCarComparison,
  carComparisonEquipment,
  carComparisonKeys,
  carComparisonLocation,
  carComparisonWarningItems,
} from '../../utils/carComparison'
import type { PublicCarListing, PublicCarSpecs } from '../../utils/carsPublic'

describe('shareable car selection', () => {
  it('round trips the sender order, deduplicates and caps at three valid public advert IDs', () => {
    const keys = carComparisonKeys('fb-123456,ml-MLU123456,fb-123456,carone-2,julio-3')
    expect(keys).toEqual(['fb-123456', 'ml-MLU123456', 'carone-2'])
    const location = carComparisonLocation(keys)
    expect(location.path).toBe('/autos-usados-uruguay/comparar')
    expect(carComparisonKeys(location.query.autos)).toEqual(keys)
  })

  it('handles repeated parameters and refuses URLs, operators and malformed IDs', () => {
    expect(carComparisonKeys(['ml-MLU123456', 'carone-3,../x', { $ne: null }])).toEqual([
      'ml-MLU123456',
      'carone-3',
    ])
    for (const value of [null, 3, { $ne: null }, 'https://example.com', 'ml-MLU1;drop', 'fb-1']) {
      expect(carComparisonKeys(value)).toEqual([])
    }
    expect(carComparisonLocation([])).toEqual({ path: '/autos-usados-uruguay/comparar', query: {} })
  })

  it('retains removed adverts as explicit missing entries, and flags stale or invalid dates', () => {
    const now = Date.parse('2026-11-05T12:00:00Z')
    const fresh = { key: 'carone-1', lastSeen: '2026-11-05T00:00:00Z' } as PublicCarListing
    const old = { key: 'carone-2', lastSeen: '2026-10-01T00:00:00Z' } as PublicCarListing
    const invalid = { key: 'carone-3', lastSeen: 'invalid' } as PublicCarListing
    const response = assembleCarComparison(
      ['carone-2', 'carone-9', 'carone-1'],
      [fresh, old],
      4,
      now
    )
    expect(response.items.map(entry => [entry.car.key, entry.stale])).toEqual([
      ['carone-2', true],
      ['carone-1', false],
    ])
    expect(response.missing).toEqual(['carone-9'])
    expect(assembleCarComparison(['carone-3'], [invalid], 4, now).items[0]!.stale).toBe(true)
  })
})

describe('declared car equipment', () => {
  const car = (equipment: string[], missing: string[]) => ({
    specs: { equipment, missing } as PublicCarSpecs,
  })

  it('never interprets an unlisted feature or a missing sheet as absence', () => {
    expect(carComparisonEquipment({ specs: null }, 'abs')).toBe(null)
    expect(carComparisonEquipment(car([], []), 'abs')).toBe(null)
    expect(carComparisonEquipment(car(['abs'], []), 'abs')).toBe(true)
    expect(carComparisonEquipment(car([], ['abs']), 'abs')).toBe(false)
    expect(carComparisonEquipment(car(['abs'], ['abs']), 'abs')).toBe(null)
  })
})

it('preserves declared mechanical and intensive-use risks even without legacy flags', () => {
  expect(
    carComparisonWarningItems({
      flags: [],
      risks: [
        {
          category: 'mecanica',
          severity: 'alta',
          quote: 'Motor fundido, no arranca',
          from: 'description',
        },
        { category: 'uso_intensivo', severity: 'media', quote: 'Ex taxi', from: 'title' },
      ],
    })
  ).toEqual([
    { labelKey: 'riskLabels.mecanica', quote: 'Motor fundido, no arranca' },
    { labelKey: 'riskLabels.uso_intensivo', quote: 'Ex taxi' },
  ])
})
