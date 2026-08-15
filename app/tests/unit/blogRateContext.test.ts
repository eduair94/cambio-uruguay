// The market line the daily blog articles are grounded on.
//
// This string is the ONLY quantitative thing the model is given, and the prompt
// tells it not to invent figures — so whatever this line implies is what two
// published pages a day will say. It has to be true without needing context the
// model does not have.
import { describe, expect, it, vi } from 'vitest'

import { rateContext } from '../../server/utils/blog'

interface Row {
  origin: string
  code: string
  type?: string
  buy: number
  sell: number
}

// `server/utils/blog.ts` reaches for Nitro auto-imports at module scope in other
// functions; `rateContext` itself is pure, but the import has to resolve.
vi.stubGlobal('useStorage', () => ({
  getItem: async () => null,
  setItem: async () => {},
  getKeys: async () => [],
}))

const row = (over: Partial<Row> = {}): Row => ({
  origin: 'casa_a',
  code: 'USD',
  type: '',
  buy: 38,
  sell: 39.5,
  ...over,
})

describe('rateContext', () => {
  it('names the casa behind each price', () => {
    const s = rateContext([
      row({ origin: 'baluma_cambio', sell: 39.55, buy: 38.1 }),
      row({ origin: 'cambio_fenix', sell: 40.9, buy: 40.25 }),
    ])
    expect(s).toContain('baluma_cambio')
    expect(s).toContain('cambio_fenix')
    expect(s).toContain('39.55')
    expect(s).toContain('40.25')
  })

  it('says out loud that the two prices are different casas', () => {
    // The real defect this guards: on 2026-08-15 the cheapest seller quoted
    // 39,55 while the best payer quoted 40,25. Listed as "mejor venta 39.55,
    // mejor compra 40.25" with no owner, that reads as one market handing out
    // 0,70 a dollar for free — and the model wrote articles reasoning from it.
    const s = rateContext([
      row({ origin: 'baluma_cambio', sell: 39.55, buy: 38.1 }),
      row({ origin: 'cambio_fenix', sell: 40.9, buy: 40.25 }),
    ])
    expect(s).toMatch(/DOS casas distintas/i)
    expect(s).toMatch(/no hay ninguna ganancia asegurada/i)
    expect(s).toMatch(/arbitraje/i)
  })

  it('still warns when the sell price is below the buy price', () => {
    // The inversion is legitimate data, not a glitch — it must be explained,
    // never filtered out, or the article would quote a rate nobody offers.
    const s = rateContext([
      row({ origin: 'barata', sell: 39.55, buy: 30 }),
      row({ origin: 'paga_mas', sell: 45, buy: 40.25 }),
    ])
    expect(s).toContain('39.55')
    expect(s).toContain('40.25')
    expect(s).toMatch(/DOS casas distintas/i)
  })

  it('ignores the BCU and typed rows when picking the retail best', () => {
    const s = rateContext([
      { origin: 'bcu', code: 'USD', buy: 39, sell: 39.2 },
      row({ origin: 'interbank', type: 'BILLETE', sell: 1, buy: 99 }),
      row({ origin: 'casa_real', sell: 39.55, buy: 38.1 }),
    ])
    // The BCU keeps its own labelled line…
    expect(s).toContain('Cotización oficial BCU')
    // …but must not be mistaken for the retail best.
    expect(s).toContain('casa_real')
    expect(s).not.toContain('interbank')
  })

  it('never claims a best buy when no casa publishes one', () => {
    const s = rateContext([row({ origin: 'solo_vende', sell: 39.55, buy: 0 })])
    expect(s).toContain('39.55')
    expect(s).not.toMatch(/compra mejor pagada/i)
  })

  it('emits nothing rather than a zero when there are no retail rows', () => {
    expect(rateContext([])).toBe('')
    // A `0.00` would be a real-looking quote the model is told to trust.
    expect(rateContext([])).not.toContain('0.00')
  })
})
