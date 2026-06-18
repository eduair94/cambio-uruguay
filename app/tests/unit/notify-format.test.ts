import { describe, it, expect } from 'vitest'
import { alertText } from '../../server/utils/push'

describe('alertText', () => {
  it('formats a best-buy alert', () => {
    const t = alertText(
      { currency: 'USD', kind: 'bestBuy', op: '>=', target: 41, origin: 'any' } as any,
      41.2
    )
    expect(t.title).toContain('USD')
    expect(t.body).toContain('41.2')
    expect(t.body).toContain('41')
  })

  it('mentions the casa when origin is specific', () => {
    const t = alertText(
      { currency: 'EUR', kind: 'bestSell', op: '<', target: 44, origin: 'brou' } as any,
      43.5
    )
    expect(t.body.toLowerCase()).toContain('brou')
  })
})
