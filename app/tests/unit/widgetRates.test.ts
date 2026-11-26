import { describe, expect, it } from 'vitest'
import { bestPair, bestUsdPair } from '../../utils/ogRate'
import {
  buildWidgetRates,
  formatWidgetRate,
  isClassicWidget,
  parseWidgetCurrencies,
  parseWidgetOrigin,
  widgetRows,
} from '../../utils/widgetRates'
import { buildWidgetEmbed, widgetHeight, widgetSrc } from '../../utils/widgetEmbed'

// A small feed shaped like GET / of the API (2026-11-25): three houses plus BROU and BCU.
const FEED = [
  { origin: 'bcu', code: 'USD', type: '', buy: 40.7, sell: 40.7 },
  { origin: 'brou', code: 'USD', type: '', buy: 39.6, sell: 42 },
  { origin: 'brou', code: 'USD', type: 'EBROU', buy: 40.1, sell: 41.5 },
  { origin: 'brou', code: 'EUR', type: '', buy: 42.62, sell: 47.27 },
  { origin: 'brou', code: 'BRL', type: '', buy: 6.4, sell: 8.1 },
  { origin: 'brou', code: 'ARS', type: '', buy: 0.02, sell: 0.2 },
  { origin: 'gales', code: 'USD', type: '', buy: 39.9, sell: 41.6 },
  { origin: 'varlix', code: 'USD', type: '', buy: 40, sell: 41.45 },
  { origin: 'gales', code: 'EUR', type: '', buy: 43.3, sell: 47.3 },
  { origin: 'varlix', code: 'EUR', type: '', buy: 43.3, sell: 47.3 },
  { origin: 'gales', code: 'BRL', type: '', buy: 6.75, sell: 8 },
  { origin: 'varlix', code: 'BRL', type: '', buy: 6.75, sell: 8 },
  { origin: 'gales', code: 'ARS', type: '', buy: 0.02, sell: 0.035 },
  { origin: 'varlix', code: 'ARS', type: '', buy: 0.02, sell: 0.035 },
  // A transfer row is not a counter price and must never be the best one.
  { origin: 'itau', code: 'USD', type: 'TRANSFERENCIA', buy: 45, sell: 30 },
]

describe('bestPair', () => {
  it('keeps the dollar exactly as bestUsdPair always computed it', () => {
    expect(bestPair(FEED, 'USD')).toEqual(bestUsdPair(FEED))
  })

  it('works for the other counter currencies, without BCU or typed rows', () => {
    const usd = bestPair(FEED, 'USD')
    expect(usd.buy).toBe(40)
    expect(usd.sell).toBe(41.45)
    expect(bestPair(FEED, 'ARS').sell).toBe(0.035)
    expect(bestPair(FEED, 'XXX')).toEqual({ buy: null, sell: null })
  })

  it('ignores a board that buys at or above what it sells (Prex ARS 0,02 / 0,02, 25/11/2026)', () => {
    const feed = [
      ...FEED,
      { origin: 'prex', code: 'ARS', type: '', buy: 0.02, sell: 0.02 },
      { origin: 'fortex', code: 'ARS', type: '', buy: 0.0236, sell: 0.0286 },
    ]
    const ars = bestPair(feed, 'ARS')
    expect(ars).toEqual({ buy: 0.0236, sell: 0.0286 })
    expect(ars.buy!).toBeLessThan(ars.sell!)
  })

  it('never hands the widget an impossible pair', () => {
    // Two coherent boards whose extremes cross: the best buy is above the best sell.
    const crossed = [
      { origin: 'a', code: 'BRL', type: '', buy: 7.9, sell: 8.5 },
      { origin: 'b', code: 'BRL', type: '', buy: 6.5, sell: 7.5 },
    ]
    expect(buildWidgetRates(crossed).mejor.BRL).toEqual({ buy: null, sell: null })
  })
})

describe('buildWidgetRates', () => {
  const data = buildWidgetRates(FEED, new Date('2026-11-25T12:00:00Z'))

  it('resolves the BROU board, with the eBROU dollar as its own row', () => {
    expect(data.brou.USD).toEqual({ buy: 39.6, sell: 42 })
    expect(data.brou.EBROU).toEqual({ buy: 40.1, sell: 41.5 })
    expect(data.brou.ARS).toEqual({ buy: 0.02, sell: 0.2 })
    expect(data.at).toBe('2026-11-25T12:00:00.000Z')
  })

  it('returns empty pairs, not a crash, when the API answered nothing', () => {
    const empty = buildWidgetRates([])
    expect(empty.mejor.USD).toEqual({ buy: null, sell: null })
    expect(empty.brou.EBROU).toEqual({ buy: null, sell: null })
  })
})

describe('widget options', () => {
  it('parses currencies into the fixed order and falls back to the dollar', () => {
    expect(parseWidgetCurrencies('ars,usd')).toEqual(['USD', 'ARS'])
    expect(parseWidgetCurrencies(['EUR', 'BRL'])).toEqual(['EUR', 'BRL'])
    expect(parseWidgetCurrencies('<script>')).toEqual(['USD'])
    expect(parseWidgetCurrencies(undefined)).toEqual(['USD'])
  })

  it('only knows two origins', () => {
    expect(parseWidgetOrigin('brou')).toBe('brou')
    expect(parseWidgetOrigin('gales')).toBe('mejor')
    expect(parseWidgetOrigin(undefined)).toBe('mejor')
  })

  it('treats only the dollar alone at the best price as the classic card', () => {
    expect(isClassicWidget(['USD'], 'mejor')).toBe(true)
    expect(isClassicWidget(['USD'], 'brou')).toBe(false)
    expect(isClassicWidget(['USD', 'EUR'], 'mejor')).toBe(false)
  })

  it('adds the eBROU row right after the dollar on the BROU board', () => {
    const data = buildWidgetRates(FEED)
    expect(widgetRows(data, ['USD', 'EUR'], 'brou').map(r => r.key)).toEqual([
      'USD',
      'EBROU',
      'EUR',
    ])
    expect(widgetRows(data, ['USD', 'EUR'], 'mejor').map(r => r.key)).toEqual(['USD', 'EUR'])
    expect(widgetRows(null, ['USD'], 'mejor')).toEqual([{ key: 'USD', buy: null, sell: null }])
  })

  it('prints the Argentine peso with three decimals instead of rounding 0,035 to 0,04', () => {
    expect(formatWidgetRate(0.035)).toBe('0,035')
    expect(formatWidgetRate(0.02)).toBe('0,02')
    expect(formatWidgetRate(41.5)).toBe('41,50')
    expect(formatWidgetRate(null)).toBe('—')
  })
})

describe('embed snippet with options', () => {
  it('keeps the URL and height of the widget that is already embedded out there', () => {
    expect(widgetSrc({ currencies: ['USD'], origin: 'mejor' })).toBe(
      'https://cambio-uruguay.com/widget?theme=dark'
    )
    expect(widgetHeight()).toBe(170)
    expect(buildWidgetEmbed()).toContain('height="170"')
  })

  it('adds monedas and origen only when they say something', () => {
    expect(widgetSrc({ theme: 'light', currencies: ['EUR', 'USD'], origin: 'brou' })).toBe(
      'https://cambio-uruguay.com/widget?theme=light&monedas=USD,EUR&origen=brou'
    )
    expect(widgetSrc({ currencies: ['USD'], origin: 'brou' })).toBe(
      'https://cambio-uruguay.com/widget?theme=dark&origen=brou'
    )
  })

  it('grows the iframe one row per currency, counting the eBROU dollar', () => {
    const two = widgetHeight(['USD', 'EUR'], 'mejor')
    const twoBrou = widgetHeight(['USD', 'EUR'], 'brou')
    expect(twoBrou).toBeGreaterThan(two)
    expect(widgetHeight(['USD', 'EUR', 'BRL', 'ARS'], 'brou')).toBeLessThanOrEqual(360)
    expect(buildWidgetEmbed({ currencies: ['USD', 'EUR'] })).toContain(`height="${two}"`)
    expect(buildWidgetEmbed({ currencies: ['USD', 'EUR'] })).toContain('Cotizaciones del día')
  })
})
