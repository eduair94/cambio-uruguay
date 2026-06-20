import { describe, expect, it } from 'vitest'
import type { ExchangeRate } from '../../types/api'
import {
  CURRENCY_GROUPS,
  TROY_OUNCE_GRAMS,
  currencyContext,
  currencyDisplayName,
  currencyFromSlug,
  currencyPrep,
  currencySlug,
  goldGramPrices,
  listCurrencySlugs,
  quotesForCurrency,
  ratesForOrigin,
} from '../../utils/currencyPages'

// Minimal rate fixture mirroring the GET / shape. Mixes plain (''), cash
// (BILLETE) and excluded (INTERBANCARIO/CABLE) types across several houses.
const rows: ExchangeRate[] = [
  {
    origin: 'itau',
    date: '2026-06-17',
    type: '',
    code: 'USD',
    name: 'Dólar',
    buy: 39.5,
    sell: 41.5,
  },
  {
    origin: 'brou',
    date: '2026-06-17',
    type: '',
    code: 'USD',
    name: 'Dólar',
    buy: 40.0,
    sell: 41.0,
  },
  {
    origin: 'prex',
    date: '2026-06-17',
    type: '',
    code: 'USD',
    name: 'Dólar',
    buy: 38.0,
    sell: 42.0,
  },
  // Cash quote (BILLETE) is included.
  {
    origin: 'gales',
    date: '2026-06-17',
    type: 'BILLETE',
    code: 'USD',
    name: 'Dólar billete',
    buy: 39.9,
    sell: 40.5,
  },
  // Interbank + cable rows must be excluded from the plain/cash table.
  {
    origin: 'la_favorita',
    date: '2026-06-17',
    type: 'INTERBANCARIO',
    code: 'USD',
    name: 'Interbancario',
    buy: 39.7,
    sell: 39.7,
  },
  {
    origin: 'bcu',
    date: '2026-06-17',
    type: 'CABLE',
    code: 'USD',
    name: 'Cable',
    buy: 40.1,
    sell: 40.1,
  },
  // EUR + ARS for other-currency / casa tests.
  {
    origin: 'itau',
    date: '2026-06-17',
    type: '',
    code: 'EUR',
    name: 'Euro',
    buy: 44.0,
    sell: 47.0,
  },
  {
    origin: 'brou',
    date: '2026-06-17',
    type: '',
    code: 'EUR',
    name: 'Euro',
    buy: 45.0,
    sell: 46.0,
  },
  {
    origin: 'itau',
    date: '2026-06-17',
    type: '',
    code: 'ARS',
    name: 'Peso Argentino',
    buy: 0.02,
    sell: 0.04,
  },
  // A duplicate plain row for the same house+code: the first one must win.
  { origin: 'itau', date: '2026-06-17', type: '', code: 'USD', name: 'Dólar dup', buy: 1, sell: 1 },
]

describe('currencyFromSlug / currencySlug', () => {
  it('maps every pretty slug to its ISO code', () => {
    expect(currencyFromSlug('dolar')).toBe('USD')
    expect(currencyFromSlug('euro')).toBe('EUR')
    expect(currencyFromSlug('real')).toBe('BRL')
    expect(currencyFromSlug('peso-argentino')).toBe('ARS')
  })

  it('accepts the raw lowercase ISO code as a slug', () => {
    expect(currencyFromSlug('usd')).toBe('USD')
    expect(currencyFromSlug('eur')).toBe('EUR')
    expect(currencyFromSlug('brl')).toBe('BRL')
    expect(currencyFromSlug('ars')).toBe('ARS')
  })

  it('is case-insensitive and trims', () => {
    expect(currencyFromSlug('  DOLAR ')).toBe('USD')
    expect(currencyFromSlug('USD')).toBe('USD')
  })

  it('returns null for an unknown or empty slug', () => {
    expect(currencyFromSlug('zzz')).toBeNull()
    expect(currencyFromSlug('')).toBeNull()
    expect(currencyFromSlug('   ')).toBeNull()
  })

  it('maps each ISO code back to its canonical pretty slug', () => {
    expect(currencySlug('USD')).toBe('dolar')
    expect(currencySlug('EUR')).toBe('euro')
    expect(currencySlug('BRL')).toBe('real')
    expect(currencySlug('ARS')).toBe('peso-argentino')
  })

  it('maps the extended currency slugs to their ISO codes', () => {
    expect(currencyFromSlug('oro')).toBe('XAU')
    expect(currencyFromSlug('yen')).toBe('JPY')
    expect(currencyFromSlug('franco-suizo')).toBe('CHF')
    expect(currencyFromSlug('guarani')).toBe('PYG')
    expect(currencyFromSlug('peso-chileno')).toBe('CLP')
    expect(currencyFromSlug('sol-peruano')).toBe('PEN')
    expect(currencyFromSlug('peso-colombiano')).toBe('COP')
    expect(currencyFromSlug('peso-mexicano')).toBe('MXN')
    expect(currencyFromSlug('dolar-canadiense')).toBe('CAD')
    expect(currencyFromSlug('dolar-australiano')).toBe('AUD')
    expect(currencyFromSlug('libra-esterlina')).toBe('GBP')
  })

  it('keeps the four majors first so casa pages order them first', () => {
    expect(listCurrencySlugs().slice(0, 4)).toEqual(['dolar', 'euro', 'real', 'peso-argentino'])
  })

  it('round-trips slug -> code -> slug for every supported currency', () => {
    for (const slug of listCurrencySlugs()) {
      const code = currencyFromSlug(slug)
      expect(code).not.toBeNull()
      expect(currencySlug(code!)).toBe(slug)
    }
  })
})

describe('currencyContext', () => {
  it('returns a non-empty Spanish blurb for every supported currency', () => {
    for (const slug of listCurrencySlugs()) {
      const code = currencyFromSlug(slug)!
      const text = currencyContext(code)
      expect(typeof text).toBe('string')
      expect(text.length).toBeGreaterThan(40)
    }
  })

  it('gives each currency a distinct blurb', () => {
    const blurbs = listCurrencySlugs().map(slug => currencyContext(currencyFromSlug(slug)!))
    expect(new Set(blurbs).size).toBe(blurbs.length)
  })
})

describe('CURRENCY_GROUPS', () => {
  it('places every supported slug in exactly one group', () => {
    const grouped = CURRENCY_GROUPS.flatMap(g => g.slugs)
    expect([...grouped].sort()).toEqual([...listCurrencySlugs()].sort())
    expect(new Set(grouped).size).toBe(grouped.length)
  })
})

describe('currencyPrep', () => {
  it('uses masculine "del"/"do" for ordinary currencies', () => {
    expect(currencyPrep('USD', 'es')).toBe('del')
    expect(currencyPrep('XAU', 'es')).toBe('del')
    expect(currencyPrep('USD', 'pt')).toBe('do')
  })

  it('uses feminine "de la"/"da" for the libra (GBP)', () => {
    expect(currencyPrep('GBP', 'es')).toBe('de la')
    expect(currencyPrep('GBP', 'pt')).toBe('da')
  })

  it('returns an empty preposition for English (no article needed)', () => {
    expect(currencyPrep('USD', 'en')).toBe('')
    expect(currencyPrep('GBP', 'en')).toBe('')
  })
})

describe('goldGramPrices', () => {
  it('derives per-gram 24k/18k/14k prices from a per-troy-ounce price', () => {
    // One troy ounce priced at exactly TROY_OUNCE_GRAMS -> 24k gram price of 1.
    const prices = goldGramPrices(TROY_OUNCE_GRAMS)
    expect(prices.map(p => p.karat)).toEqual([24, 18, 14])
    expect(prices[0]!.pricePerGram).toBeCloseTo(1, 6)
    expect(prices[1]!.pricePerGram).toBeCloseTo(0.75, 6)
    expect(prices[2]!.pricePerGram).toBeCloseTo(0.5833, 6)
  })

  it('scales linearly with the ounce price', () => {
    const [g24] = goldGramPrices(179245.44)
    expect(g24!.pricePerGram).toBeCloseTo(179245.44 / TROY_OUNCE_GRAMS, 4)
  })

  it('returns an empty list for a non-positive price', () => {
    expect(goldGramPrices(0)).toEqual([])
    expect(goldGramPrices(-5)).toEqual([])
    expect(goldGramPrices(Number.NaN)).toEqual([])
  })
})

describe('currencyDisplayName', () => {
  it('returns localised names', () => {
    expect(currencyDisplayName('USD', 'es')).toBe('Dólar')
    expect(currencyDisplayName('USD', 'en')).toBe('US Dollar')
    expect(currencyDisplayName('ARS', 'es')).toBe('Peso Argentino')
    expect(currencyDisplayName('BRL', 'en')).toBe('Brazilian Real')
  })

  it('defaults to Spanish', () => {
    expect(currencyDisplayName('EUR')).toBe('Euro')
  })
})

describe('quotesForCurrency', () => {
  it('includes only plain/cash quotes, one row per house', () => {
    const quotes = quotesForCurrency(rows, 'USD')
    const origins = quotes.map(q => q.origin).sort()
    // itau, brou, prex (plain) + gales (BILLETE); interbank/cable excluded.
    expect(origins).toEqual(['brou', 'gales', 'itau', 'prex'])
  })

  it('keeps the first plain/cash row for a duplicated house+code', () => {
    const quotes = quotesForCurrency(rows, 'USD')
    const itau = quotes.find(q => q.origin === 'itau')
    expect(itau?.buy).toBe(39.5) // first itau USD row, not the buy:1 duplicate
    expect(itau?.sell).toBe(41.5)
  })

  it('flags the highest buy as bestBuy', () => {
    const quotes = quotesForCurrency(rows, 'USD')
    const bestBuy = quotes.find(q => q.bestBuy)
    expect(bestBuy?.origin).toBe('brou') // 40.0 is the highest buy
  })

  it('flags the lowest sell as bestSell', () => {
    const quotes = quotesForCurrency(rows, 'USD')
    const bestSell = quotes.find(q => q.bestSell)
    expect(bestSell?.origin).toBe('gales') // 40.5 (BILLETE) is the lowest sell
  })

  it('handles distinct best-buy and best-sell houses', () => {
    const quotes = quotesForCurrency(rows, 'EUR')
    expect(quotes.find(q => q.bestBuy)?.origin).toBe('brou') // 45.0 highest buy
    expect(quotes.find(q => q.bestSell)?.origin).toBe('brou') // 46.0 lowest sell
  })

  it('returns an empty list when no house quotes the currency', () => {
    expect(quotesForCurrency(rows, 'BRL')).toEqual([])
    expect(quotesForCurrency([], 'USD')).toEqual([])
  })

  it('sorts results by display name', () => {
    const quotes = quotesForCurrency(rows, 'USD')
    const names = quotes.map(q => q.name)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'es')))
  })
})

describe('quotesForCurrency — excludes the BCU reference', () => {
  // The BCU publishes a near-zero-spread reference quote (here typed BILLETE)
  // that is NOT a casa de cambio. It must never be listed as a house nor win the
  // "mejor cambio" highlight, otherwise "Dólar billete" (the BCU row) shows as
  // the best rate even though nobody can transact at it.
  const withBcu: ExchangeRate[] = [
    {
      origin: 'bcu',
      date: '2026-06-18',
      type: 'BILLETE',
      code: 'USD',
      name: 'BCU',
      buy: 40.097,
      sell: 40.097,
    },
    {
      origin: 'itau',
      date: '2026-06-18',
      type: '',
      code: 'USD',
      name: 'Itaú',
      buy: 39.5,
      sell: 41.5,
    },
    {
      origin: 'brou',
      date: '2026-06-18',
      type: '',
      code: 'USD',
      name: 'BROU',
      buy: 40.0,
      sell: 41.0,
    },
  ]

  it('never lists the BCU row as a casa quote', () => {
    const quotes = quotesForCurrency(withBcu, 'USD')
    expect(quotes.some(q => q.origin === 'bcu')).toBe(false)
  })

  it('flags a real casa (not BCU) as best buy and best sell', () => {
    const quotes = quotesForCurrency(withBcu, 'USD')
    // Without the fix the BCU 40.097 row wins both (lowest sell, highest buy).
    expect(quotes.find(q => q.bestSell)?.origin).toBe('brou') // 41.0, not bcu 40.097
    expect(quotes.find(q => q.bestBuy)?.origin).toBe('brou') // 40.0, not bcu 40.097
  })
})

describe('ratesForOrigin', () => {
  it('returns one plain/cash row per currency for the casa', () => {
    const rates = ratesForOrigin(rows, 'itau')
    expect(rates.map(r => r.code)).toEqual(['USD', 'EUR', 'ARS'])
  })

  it('keeps the first plain/cash row per currency', () => {
    const rates = ratesForOrigin(rows, 'itau')
    const usd = rates.find(r => r.code === 'USD')
    expect(usd?.buy).toBe(39.5) // not the buy:1 duplicate
  })

  it('orders major currencies (USD, EUR, BRL, ARS) first', () => {
    const rates = ratesForOrigin(rows, 'itau')
    expect(rates[0]?.code).toBe('USD')
    expect(rates[1]?.code).toBe('EUR')
  })

  it('excludes interbank/cable-only houses from plain/cash data', () => {
    expect(ratesForOrigin(rows, 'la_favorita')).toEqual([])
    expect(ratesForOrigin(rows, 'bcu')).toEqual([])
  })

  it('returns an empty list for an unknown or blank origin', () => {
    expect(ratesForOrigin(rows, 'nonexistent')).toEqual([])
    expect(ratesForOrigin(rows, '   ')).toEqual([])
  })
})
