import { describe, expect, it } from 'vitest'
import { bestUsdPair } from '../../utils/ogRate'

/**
 * A market shaped like the live 2026-08-17 USD snapshot: medians around
 * 39,05 buy / 41,45 sell, one house paying aggressively (40,20) and one stale
 * board sitting ~4,6% under the market on both sides. Enough rows to clear
 * MIN_SAMPLE so the off-market detector actually engages.
 */
const house = (origin: string, buy: number, sell: number) => ({
  origin,
  code: 'USD',
  type: '',
  buy,
  sell,
})

const MARKET = [
  house('a', 38.6, 41.2),
  house('b', 38.8, 41.3),
  house('c', 38.9, 41.4),
  house('d', 39.0, 41.4),
  house('e', 39.05, 41.45),
  house('f', 39.1, 41.45),
  house('g', 39.2, 41.5),
  house('h', 39.3, 41.6),
  house('i', 39.4, 41.8),
  house('oca', 39.5, 40.56),
  house('cambio_fenix', 40.2, 41.9),
]

/** The stale board that poisoned the published pair before the filter existed. */
const STALE = house('baluma_cambio', 37.15, 39.55)

describe('bestUsdPair', () => {
  it('never publishes a pair where the best buy exceeds the best sell', () => {
    const { buy, sell } = bestUsdPair([...MARKET, STALE])
    expect(buy).not.toBeNull()
    expect(sell).not.toBeNull()
    expect(buy!).toBeLessThan(sell!)
  })

  it('drops the off-market board instead of reading an extreme off it', () => {
    expect(bestUsdPair([...MARKET, STALE]).sell).toBe(40.56)
    // Without the filter the stale 39,55 would win the "cheapest sell" race.
    expect(Math.min(...[...MARKET, STALE].map(r => r.sell))).toBe(39.55)
  })

  it('keeps an aggressive but on-market price', () => {
    expect(bestUsdPair([...MARKET, STALE]).buy).toBe(40.2)
  })

  it('ignores the BCU reference and typed (interbank / preferential) rows', () => {
    const noisy = [
      ...MARKET,
      { origin: 'bcu', code: 'USD', type: '', buy: 99, sell: 1 },
      { origin: 'brou', code: 'USD', type: 'interbancario', buy: 99, sell: 1 },
      { origin: 'brou', code: 'EUR', type: '', buy: 99, sell: 1 },
    ]
    expect(bestUsdPair(noisy)).toEqual({ buy: 40.2, sell: 40.56 })
  })

  it('returns nulls when the feed has no usable USD quote', () => {
    expect(bestUsdPair([])).toEqual({ buy: null, sell: null })
    expect(bestUsdPair([{ origin: 'bcu', code: 'USD', type: '', buy: 40, sell: 41 }])).toEqual({
      buy: null,
      sell: null,
    })
  })

  it('judges nothing in a market too thin for a median to mean anything', () => {
    const thin = [house('a', 39, 41), STALE]
    expect(bestUsdPair(thin)).toEqual({ buy: 39, sell: 39.55 })
  })
})
