import { describe, expect, it } from 'vitest'
import {
  BOARD_CURRENCIES,
  MAX_AMOUNT,
  buildBoard,
  buildComparison,
  parseAmount,
  quoteKind,
  scaleBoard,
  type PizarraRow,
} from '../../utils/pizarra'

const row = (p: Partial<PizarraRow> & { origin: string; code: string }): PizarraRow => ({
  type: '',
  buy: undefined,
  sell: undefined,
  isInterBank: false,
  condition: '',
  localData: { name: p.origin.toUpperCase() },
  ...p,
})

// A slice of the real market: casas, a bank quoting two ways, a fintech, the
// BCU reference and an interbank row.
const market: PizarraRow[] = [
  row({ origin: 'gales', code: 'USD', buy: 39.5, sell: 41.2 }),
  row({ origin: 'fortex', code: 'USD', buy: 39.65, sell: 40.85 }),
  row({ origin: 'brou', code: 'USD', buy: 39, sell: 41.5 }),
  row({
    origin: 'brou',
    code: 'USD',
    type: 'EBROU',
    condition: 'ebrou_condition',
    buy: 39.5,
    sell: 41,
  }),
  row({ origin: 'prex', code: 'USD', condition: 'prex_condition', buy: 40.05, sell: 40.45 }),
  row({ origin: 'bcu', code: 'USD', buy: 40.2, sell: 40.3, isInterBank: true }),
  row({
    origin: 'la_favorita',
    code: 'USD',
    type: 'INTERBANCARIO',
    isInterBank: true,
    buy: 40.25,
    sell: 40.25,
  }),
  row({ origin: 'gales', code: 'EUR', buy: 44.15, sell: 49.01 }),
  row({ origin: 'gales', code: 'BRL', buy: 7, sell: 8.7 }),
  row({ origin: 'gales', code: 'ARS', buy: 0.02, sell: 0.2 }),
  row({ origin: 'gales', code: 'XAU', buy: 164974, sell: 181422 }),
]

describe('buildBoard', () => {
  it('always returns the four board currencies in order', () => {
    expect(buildBoard([]).map(b => b.code)).toEqual([...BOARD_CURRENCIES])
  })

  it('picks the highest buy and the lowest sell of the market', () => {
    const usd = buildBoard(market).find(b => b.code === 'USD')!
    // Highest public buy is Prex at 40.05 (bcu 40.20 and the interbank 40.25
    // are higher but nobody can transact at them).
    expect(usd.buy).toMatchObject({ value: 40.05, origin: 'prex' })
    expect(usd.sell).toMatchObject({ value: 40.45, origin: 'prex' })
  })

  it('never lets the BCU reference or an interbank quote win the headline', () => {
    const usd = buildBoard(market).find(b => b.code === 'USD')!
    expect(usd.buy.origin).not.toBe('bcu')
    expect(usd.buy.origin).not.toBe('la_favorita')
    expect(usd.sell.origin).not.toBe('bcu')
  })

  it('reports null instead of inventing a price when nobody quotes', () => {
    const board = buildBoard([row({ origin: 'gales', code: 'USD', buy: 39, sell: 41 })])
    const eur = board.find(b => b.code === 'EUR')!
    expect(eur.buy).toEqual({ value: null, origin: null, name: null })
    expect(eur.sell.value).toBeNull()
  })

  it('ignores zero and negative prices', () => {
    const board = buildBoard([
      row({ origin: 'broken', code: 'USD', buy: 0, sell: 0 }),
      row({ origin: 'gales', code: 'USD', buy: 39, sell: 41 }),
    ])
    expect(board.find(b => b.code === 'USD')!.buy.origin).toBe('gales')
  })

  it('falls back to the origin id when a house has no display name', () => {
    const board = buildBoard([
      { origin: 'cambio_x', code: 'USD', buy: 39, sell: 41, localData: null },
    ])
    expect(board.find(b => b.code === 'USD')!.buy.name).toBe('cambio_x')
  })

  // Shipped bug, caught on the built server: the two sides come from different
  // houses, so one stale board is enough to print "compra 40,20 / venta 39,55"
  // — a spread that reads as nonsense and would send a reader to a bad price.
  it('never prints an inverted spread because of one stale board', () => {
    const wide: PizarraRow[] = [
      ...Array.from({ length: 20 }, (_, i) =>
        row({ origin: `casa${i}`, code: 'USD', buy: 39 + i * 0.01, sell: 41 + i * 0.01 })
      ),
      row({ origin: 'cambio_principal', code: 'USD', buy: 40.2, sell: 41.2 }),
      // Whole pizarra ~5% low: the market's lowest sell, and not to be trusted.
      row({ origin: 'baluma_cambio', code: 'USD', buy: 37.15, sell: 39.55 }),
    ]
    const usd = buildBoard(wide).find(b => b.code === 'USD')!
    expect(usd.sell.origin).not.toBe('baluma_cambio')
    expect(usd.sell.value!).toBeGreaterThan(usd.buy.value!)
  })

  it('still uses a thin market as-is rather than emptying the board', () => {
    // Only two houses quote ARS; neither may be dismissed as an outlier.
    const usd = buildBoard([
      row({ origin: 'a', code: 'ARS', buy: 0.02, sell: 0.2 }),
      row({ origin: 'b', code: 'ARS', buy: 0.015, sell: 0.3 }),
    ]).find(b => b.code === 'ARS')!
    expect(usd.buy.value).toBe(0.02)
    expect(usd.sell.value).toBe(0.2)
  })
})

describe('quoteKind', () => {
  it('labels each kind of quote', () => {
    expect(quoteKind(row({ origin: 'gales', code: 'USD' }))).toBe('cash')
    expect(quoteKind(row({ origin: 'bcu', code: 'USD' }))).toBe('official')
    expect(quoteKind(row({ origin: 'la_favorita', code: 'USD', isInterBank: true }))).toBe(
      'wholesale'
    )
    expect(quoteKind(row({ origin: 'brou', code: 'USD', condition: 'ebrou_condition' }))).toBe(
      'conditional'
    )
  })

  it('treats the BCU as official even if also flagged interbank', () => {
    expect(quoteKind(row({ origin: 'bcu', code: 'USD', isInterBank: true }))).toBe('official')
  })
})

describe('buildComparison', () => {
  it('hides nothing — every quote in the payload is listed', () => {
    const groups = buildComparison(market)
    const total = groups.reduce((n, g) => n + g.rows.length, 0)
    expect(total).toBe(market.length)
  })

  it('keeps the wholesale and official rows, labelled', () => {
    const usd = buildComparison(market).find(g => g.code === 'USD')!
    expect(usd.rows.find(r => r.origin === 'bcu')?.kind).toBe('official')
    expect(usd.rows.find(r => r.type === 'INTERBANCARIO')?.kind).toBe('wholesale')
  })

  it('never crowns a wholesale or official row as best', () => {
    const usd = buildComparison(market).find(g => g.code === 'USD')!
    for (const r of usd.rows) {
      if (r.kind === 'wholesale' || r.kind === 'official') {
        expect(r.bestBuy).toBe(false)
        expect(r.bestSell).toBe(false)
      }
    }
  })

  it('marks the obtainable best buy and best sell', () => {
    const usd = buildComparison(market).find(g => g.code === 'USD')!
    expect(usd.rows.filter(r => r.bestSell).map(r => r.origin)).toEqual(['prex'])
    expect(usd.rows.filter(r => r.bestBuy).map(r => r.origin)).toEqual(['prex'])
  })

  it('sorts each group cheapest-sell first', () => {
    const usd = buildComparison(market).find(g => g.code === 'USD')!
    const sells = usd.rows.map(r => r.sell ?? Infinity)
    expect(sells).toEqual([...sells].sort((a, b) => a - b))
  })

  it('puts the board currencies first and keeps the exotic ones', () => {
    const codes = buildComparison(market).map(g => g.code)
    expect(codes.slice(0, 4)).toEqual(['USD', 'EUR', 'BRL', 'ARS'])
    expect(codes).toContain('XAU')
  })

  it('drops only rows with no usable price at all', () => {
    const groups = buildComparison([
      row({ origin: 'a', code: 'USD', buy: 0, sell: 0 }),
      row({ origin: 'b', code: 'USD', buy: 39 }),
    ])
    expect(groups[0]!.rows.map(r => r.origin)).toEqual(['b'])
  })

  it('returns nothing for an empty market instead of throwing', () => {
    expect(buildComparison([])).toEqual([])
  })
})

describe('parseAmount', () => {
  it('reads a plain number', () => {
    expect(parseAmount('100')).toBe(100)
    expect(parseAmount(250)).toBe(250)
  })

  it('accepts the Uruguayan decimal comma', () => {
    expect(parseAmount('1234,5')).toBe(1234.5)
    expect(parseAmount('1234.5')).toBe(1234.5)
  })

  it('defaults to 1 for anything unusable', () => {
    for (const bad of ['', '   ', 'abc', '-5', '0', null, undefined, {}, NaN]) {
      expect(parseAmount(bad)).toBe(1)
    }
  })

  it('takes the first value when the query key repeats', () => {
    expect(parseAmount(['50', '900'])).toBe(50)
  })

  it('caps an absurd amount instead of rendering a wall of digits', () => {
    expect(parseAmount('999999999999999')).toBe(MAX_AMOUNT)
    expect(parseAmount('1e400')).toBe(1)
  })
})

describe('scaleBoard', () => {
  const board = buildBoard(market)

  it('multiplies every price and leaves the houses attached', () => {
    const scaled = scaleBoard(board, 100)
    const usd = scaled.find(b => b.code === 'USD')!
    expect(usd.buy.value).toBeCloseTo(4005, 6)
    expect(usd.sell.value).toBeCloseTo(4045, 6)
    expect(usd.buy.origin).toBe('prex')
  })

  it('is the identity at 1', () => {
    expect(scaleBoard(board, 1)).toEqual(board)
  })

  it('leaves a missing price missing rather than turning it into 0', () => {
    const scaled = scaleBoard(buildBoard([]), 100)
    expect(scaled.every(b => b.buy.value === null && b.sell.value === null)).toBe(true)
  })

  it('does not mutate the board it was given', () => {
    const snapshot = JSON.parse(JSON.stringify(board))
    scaleBoard(board, 7)
    expect(board).toEqual(snapshot)
  })
})
