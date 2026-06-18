import { describe, it, expect } from 'vitest'
import { averageSell } from '../../utils/currencyPages'

const rows = [
  { origin: 'a', code: 'USD', type: '', buy: 39, sell: 41.0, name: 'A' },
  { origin: 'b', code: 'USD', type: '', buy: 39, sell: 41.4, name: 'B' },
  { origin: 'c', code: 'USD', type: '', buy: 39, sell: 41.2, name: 'C' },
]

describe('averageSell', () => {
  it('averages positive sell quotes', () => {
    expect(averageSell(rows as any, 'USD')).toBeCloseTo(41.2, 5)
  })
  it('returns null when no quotes', () => {
    expect(averageSell(rows as any, 'EUR')).toBeNull()
  })
})
