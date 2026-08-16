import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildBranchPages, type Branch } from '../../utils/branches'
import {
  CASA_CURRENCY_INTENTS,
  CASA_FIXED_INTENTS,
  CASA_INTENTS,
  CASA_INTENT_META,
  availableIntents,
  branchesWithHours,
  branchesWithPhone,
  buildCurrencyMarket,
  currencyFactsFor,
  currencyPositionSentence,
  departmentLabels,
  formatPesosEs,
  formatRateEs,
  intentAvailable,
  intentCurrencyCode,
  intentDescription,
  intentHeading,
  intentTitle,
  intentsFor,
  isCasaIntent,
  isCurrencyIntent,
  joinEs,
  marketPositionSentence,
  quotedCurrenciesFor,
  type CasaFacts,
  type CasaIntent,
  type MarketQuoteRow,
} from '../../utils/casaIntents'

function branch(overrides: Partial<Branch> = {}): Branch {
  return {
    origin: 'gales',
    id: '1',
    name: 'Casa Central',
    dept: 'MONTEVIDEO',
    locality: '',
    address: '18 de Julio 1046',
    phone: '2900 1234',
    hours: 'Lunes a Viernes de 9 a 18 hs.',
    lat: -34.9,
    lng: -56.18,
    mapUrl: '',
    ...overrides,
  }
}

function facts(overrides: Partial<CasaFacts> = {}): CasaFacts {
  const branches = buildBranchPages([branch()], { gales: 'Cambio Gales' })
  return {
    origin: 'gales',
    name: 'Cambio Gales',
    branches,
    departments: ['Montevideo'],
    usd: { buy: 39.2, sell: 41.6, type: '' },
    marketBestSell: 40.63,
    marketBestBuy: 40.03,
    marketSize: 43,
    sellRank: 37,
    buyRank: 30,
    rating: { score: 4.2, count: 180 },
    bcuUrl: 'https://www.bcu.gub.uy/x',
    website: 'https://gales.com.uy',
    quotedCurrencies: ['EUR', 'BRL', 'ARS'],
    currency: null,
    ...overrides,
  }
}

/** A market feed fixture: `count` casas quoting `code`, plus one interbank row. */
function marketRows(
  code: string,
  quotes: Array<{ origin: string; buy: number; sell: number; type?: string }>
): MarketQuoteRow[] {
  return [
    ...quotes.map(quote => ({
      origin: quote.origin,
      code,
      type: quote.type ?? '',
      buy: quote.buy,
      sell: quote.sell,
    })),
    // The trap the dollar path already hit: an interbank reference published
    // WITHOUT the `isInterBank` flag, only `type: 'INTERBANCARIO'`.
    { origin: 'la_favorita', code, type: 'INTERBANCARIO', buy: 45, sell: 45 },
  ]
}

describe('the intent set', () => {
  it('narrows only known slugs', () => {
    expect(isCasaIntent('horarios')).toBe(true)
    expect(isCasaIntent('telefono')).toBe(true)
    expect(isCasaIntent('sucursales')).toBe(false)
    expect(isCasaIntent('')).toBe(false)
  })

  it('has presentation metadata for every intent', () => {
    for (const intent of CASA_INTENTS) {
      const meta = CASA_INTENT_META[intent]
      expect(meta.slug).toBe(intent)
      expect(meta.label.trim()).not.toBe('')
      expect(meta.tag.trim()).not.toBe('')
      expect(meta.icon).toMatch(/^mdi-/)
    }
  })

  // `definePageMeta`'s validate callback is extracted at build time and cannot
  // close over an import, so the page repeats the list as a literal. If someone
  // adds a sixth intent here and forgets the page, every URL for it would 404
  // while the sitemap advertised it — this is the tripwire.
  it('matches the literals the route guard inlines', () => {
    const page = readFileSync(
      join(__dirname, '..', '..', 'pages', 'casa', '[origin]', '[intent].vue'),
      'utf8'
    )

    const fixed = page.match(/const known = \[([^\]]+)\]/)
    expect(fixed).toBeTruthy()
    const inlinedFixed = (fixed?.[1] ?? '')
      .split(',')
      .map(part => part.trim().replace(/^'|'$/g, ''))
      .filter(Boolean)
    expect(inlinedFixed).toEqual([...CASA_FIXED_INTENTS])

    // The currency map in the guard must agree with the shared catalogue in BOTH
    // directions: a slug the guard does not know 404s while the sitemap lists it,
    // and a code typed wrong sends the reader a page about another currency.
    const currencies = page.match(/const currencies: Record<string, string> = \{([\s\S]*?)\n {4}\}/)
    expect(currencies).toBeTruthy()
    const inlinedPairs = [
      ...(currencies?.[1] ?? '').matchAll(/'?([a-z-]+)'?:\s*'([A-Z]{3})'/g),
    ].map(match => [match[1], match[2]] as const)
    expect(Object.fromEntries(inlinedPairs)).toEqual(
      Object.fromEntries(CASA_CURRENCY_INTENTS.map(slug => [slug, intentCurrencyCode(slug)]))
    )
  })

  it('separates currency slices from fixed sections', () => {
    for (const slug of CASA_CURRENCY_INTENTS) {
      expect(isCurrencyIntent(slug)).toBe(true)
      expect(intentCurrencyCode(slug)).toMatch(/^[A-Z]{3}$/)
    }
    for (const slug of CASA_FIXED_INTENTS) {
      expect(isCurrencyIntent(slug)).toBe(false)
      expect(intentCurrencyCode(slug)).toBeNull()
    }
  })

  // The dollar already has two pages answering it from both sides; a third
  // would compete with them for the same query.
  it('has no dollar slice', () => {
    expect(CASA_CURRENCY_INTENTS).not.toContain('dolar')
    expect(isCasaIntent('dolar')).toBe(false)
  })
})

describe('availability gating', () => {
  const base = { branches: [], quotesUsd: false, hasBcu: false, hasRating: false }

  it('needs a parseable schedule for /horarios', () => {
    const withHours = buildBranchPages([branch()])
    const withoutHours = buildBranchPages([branch({ hours: 'Sin informar' })])
    expect(intentAvailable('horarios', { ...base, branches: withHours })).toBe(true)
    expect(intentAvailable('horarios', { ...base, branches: withoutHours })).toBe(false)
  })

  it('needs a dialable number for /telefono', () => {
    const withPhone = buildBranchPages([branch()])
    const withoutPhone = buildBranchPages([branch({ phone: '' })])
    expect(intentAvailable('telefono', { ...base, branches: withPhone })).toBe(true)
    expect(intentAvailable('telefono', { ...base, branches: withoutPhone })).toBe(false)
  })

  it('needs a public USD quote for the buy/sell pages', () => {
    expect(intentAvailable('comprar-dolares', base)).toBe(false)
    expect(intentAvailable('vender-dolares', base)).toBe(false)
    expect(intentAvailable('comprar-dolares', { ...base, quotesUsd: true })).toBe(true)
  })

  it('accepts /opiniones on a rating, a BCU entry or a branch — and nothing else', () => {
    expect(intentAvailable('opiniones', base)).toBe(false)
    expect(intentAvailable('opiniones', { ...base, hasRating: true })).toBe(true)
    expect(intentAvailable('opiniones', { ...base, hasBcu: true })).toBe(true)
    expect(intentAvailable('opiniones', { ...base, branches: buildBranchPages([branch()]) })).toBe(
      true
    )
  })

  it('rejects an unknown intent defensively', () => {
    expect(intentAvailable('sucursales' as CasaIntent, base)).toBe(false)
  })

  it('opens a currency slice only where the casa quotes that currency', () => {
    expect(intentAvailable('euro', { ...base, quotedCurrencies: ['EUR'] })).toBe(true)
    expect(intentAvailable('euro', { ...base, quotedCurrencies: ['BRL'] })).toBe(false)
    expect(intentAvailable('guarani', base)).toBe(false)
  })

  it('lists available intents in catalogue order', () => {
    const branches = buildBranchPages([branch()])
    expect(
      intentsFor({
        branches,
        quotesUsd: true,
        hasBcu: true,
        hasRating: true,
        quotedCurrencies: ['EUR', 'BRL'],
      })
    ).toEqual([...CASA_FIXED_INTENTS, 'euro', 'real'])
    expect(intentsFor({ ...base, quotesUsd: true })).toEqual(['comprar-dolares', 'vender-dolares'])
  })

  it('agrees with itself when called through the resolved facts', () => {
    expect(availableIntents(facts())).toEqual([
      ...CASA_FIXED_INTENTS,
      'euro',
      'real',
      'peso-argentino',
    ])
    expect(
      availableIntents(
        facts({ usd: null, branches: [], bcuUrl: '', rating: null, quotedCurrencies: [] })
      )
    ).toEqual([])
  })
})

describe('currency markets', () => {
  const rows = marketRows('EUR', [
    { origin: 'gales', buy: 44, sell: 50 },
    { origin: 'brou', buy: 45, sell: 49 },
    { origin: 'itau', buy: 43, sell: 51 },
  ])

  it('drops the interbank reference even when the flag is unset', () => {
    const market = buildCurrencyMarket(rows, 'EUR')
    expect(market.picked.has('la_favorita')).toBe(false)
    expect(market.bySell).toHaveLength(3)
  })

  it('prefers the plain cash board when a casa publishes several', () => {
    const multi = [
      { origin: 'brou', code: 'EUR', type: 'EBROU', buy: 46, sell: 48 },
      { origin: 'brou', code: 'EUR', type: '', buy: 45, sell: 49 },
    ]
    expect(buildCurrencyMarket(multi, 'EUR').picked.get('brou')?.sell).toBe(49)
  })

  it('ignores a quote missing either side', () => {
    const broken = [
      { origin: 'x', code: 'EUR', type: '', buy: 0, sell: 50 },
      { origin: 'y', code: 'EUR', type: '', buy: 45, sell: 0 },
    ]
    expect(buildCurrencyMarket(broken, 'EUR').picked.size).toBe(0)
  })

  it('resolves a casa’s position, spread and ranks', () => {
    const currency = currencyFactsFor(rows, 'gales', 'euro')
    expect(currency).toBeTruthy()
    expect(currency?.code).toBe('EUR')
    expect(currency?.bestSell).toBe(49)
    expect(currency?.bestBuy).toBe(45)
    expect(currency?.marketSize).toBe(3)
    expect(currency?.sellRank).toBe(2)
    expect(currency?.buyRank).toBe(2)
    expect(currency?.spreadPct).toBeCloseTo(((50 - 44) / 47) * 100, 6)
  })

  it('returns null for a casa that does not quote the currency', () => {
    expect(currencyFactsFor(rows, 'santander', 'euro')).toBeNull()
  })

  it('lists a casa’s quoted currencies without the dollar slice', () => {
    const mixed = [
      { origin: 'gales', code: 'USD', type: '', buy: 39, sell: 41 },
      { origin: 'gales', code: 'EUR', type: '', buy: 44, sell: 50 },
      { origin: 'gales', code: 'BRL', type: '', buy: 7, sell: 8 },
      { origin: 'gales', code: 'ZZZ', type: '', buy: 1, sell: 2 },
    ]
    // USD is absent because no `/casa/x/dolar` slice exists, and ZZZ because it
    // is not in the currency catalogue.
    expect(quotedCurrenciesFor(mixed, 'gales')).toEqual(['EUR', 'BRL'])
  })

  // Thin markets are the whole reason `offMarketDetector` stands down below ten
  // quotes: with five boards, one of them being 4% off the median is normal.
  it('crowns a winner even in a market too thin to judge outliers', () => {
    const thin = marketRows('PYG', [
      { origin: 'a', buy: 0.004, sell: 0.007 },
      { origin: 'b', buy: 0.005, sell: 0.0068 },
    ])
    const currency = currencyFactsFor(thin, 'b', 'guarani')
    expect(currency?.marketSize).toBe(2)
    expect(currency?.sellRank).toBe(1)
  })
})

describe('currency copy', () => {
  const rows = marketRows('EUR', [
    { origin: 'gales', buy: 44, sell: 50 },
    { origin: 'brou', buy: 45, sell: 49 },
  ])
  const withEuro = facts({ currency: currencyFactsFor(rows, 'gales', 'euro') })

  it('titles and headings name the currency and the casa', () => {
    expect(intentHeading('euro', withEuro)).toContain('Euro')
    expect(intentHeading('euro', withEuro)).toContain('Cambio Gales')
    expect(intentTitle('euro', withEuro)).toContain('Euro')
  })

  it('puts this casa’s own numbers in the description', () => {
    const description = intentDescription('euro', withEuro)
    expect(description).toContain('44,00')
    expect(description).toContain('50,00')
    expect(description.length).toBeLessThanOrEqual(300)
  })

  it('quantifies the gap, the spread and the size of the market', () => {
    const sentence = currencyPositionSentence(withEuro)
    expect(sentence).toContain('44,00')
    expect(sentence).toContain('50,00')
    expect(sentence).toContain('49,00')
    expect(sentence).toContain('%')
    expect(sentence).not.toContain('NaN')
    expect(sentence).not.toContain('undefined')
  })

  it('warns instead of comparing when almost nobody quotes it', () => {
    const solo = marketRows('XAU', [{ origin: 'gales', buy: 100000, sell: 120000 }])
    const alone = facts({ currency: currencyFactsFor(solo, 'gales', 'oro') })
    expect(currencyPositionSentence(alone)).toContain('pocas casas')
  })

  it('says nothing at all when there is no quote to talk about', () => {
    expect(currencyPositionSentence(facts({ currency: null }))).toBe('')
  })

  it('never leaves a currency page with an empty verdict', () => {
    for (const slug of CASA_CURRENCY_INTENTS) {
      const code = intentCurrencyCode(slug) as string
      const market = marketRows(code, [
        { origin: 'gales', buy: 10, sell: 12 },
        { origin: 'brou', buy: 11, sell: 11.5 },
      ])
      const data = facts({ currency: currencyFactsFor(market, 'gales', slug) })
      expect(currencyPositionSentence(data).length).toBeGreaterThan(120)
      expect(intentHeading(slug, data).length).toBeGreaterThan(10)
      expect(intentDescription(slug, data).length).toBeGreaterThan(80)
    }
  })
})

describe('branch filters', () => {
  it('keeps only branches with something printable', () => {
    const pages = buildBranchPages([
      branch({ id: '1' }),
      branch({ id: '2', hours: 'ABITAB SA', phone: '' }),
      branch({ id: '3', hours: '-', phone: '123' }),
    ])
    expect(branchesWithHours(pages)).toHaveLength(1)
    expect(branchesWithPhone(pages)).toHaveLength(1)
  })

  it('lists departments deduped and alphabetical', () => {
    const pages = buildBranchPages([
      branch({ id: '1', dept: 'MONTEVIDEO' }),
      branch({ id: '2', dept: 'CANELONES' }),
      branch({ id: '3', dept: 'MONTEVIDEO' }),
      branch({ id: '4', dept: 'PAYSANDÚ' }),
    ])
    expect(departmentLabels(pages)).toEqual(['Canelones', 'Montevideo', 'Paysandú'])
  })
})

describe('prose helpers', () => {
  it('joins a list the way Spanish writes it', () => {
    expect(joinEs([])).toBe('')
    expect(joinEs(['Montevideo'])).toBe('Montevideo')
    expect(joinEs(['Montevideo', 'Canelones'])).toBe('Montevideo y Canelones')
    expect(joinEs(['A', 'B', 'C'])).toBe('A, B y C')
  })

  it('formats rates and pesos in Uruguayan notation', () => {
    expect(formatRateEs(41.6)).toBe('41,60')
    expect(formatPesosEs(41600.4)).toBe('41.600')
  })
})

describe('page copy', () => {
  it('gives every intent a distinct heading and title', () => {
    const data = facts()
    const headings = CASA_INTENTS.map(intent => intentHeading(intent, data))
    const titles = CASA_INTENTS.map(intent => intentTitle(intent, data))
    expect(new Set(headings).size).toBe(CASA_INTENTS.length)
    expect(new Set(titles).size).toBe(CASA_INTENTS.length)
    for (const heading of headings) expect(heading).toContain('Cambio Gales')
  })

  it('names the department when the casa only operates in one', () => {
    expect(intentTitle('horarios', facts({ departments: ['Rivera'] }))).toContain('en Rivera')
    expect(intentTitle('horarios', facts({ departments: ['Rivera', 'Salto'] }))).toContain(
      'en Uruguay'
    )
  })

  // The failure mode of a programmatic family is 44 descriptions that differ
  // only by the casa name. These must carry this casa's own numbers.
  it('builds descriptions from the casa’s own figures', () => {
    const data = facts()
    expect(intentDescription('horarios', data)).toContain('1 sucursal')
    expect(intentDescription('telefono', data)).toContain('1 número')
    expect(intentDescription('opiniones', data)).toContain('4.2')
    expect(intentDescription('opiniones', data)).toContain('180 reseñas')
    expect(intentDescription('comprar-dolares', data)).toContain('41,60')
    expect(intentDescription('vender-dolares', data)).toContain('39,20')
  })

  it('describes reputation without a rating rather than inventing one', () => {
    const text = intentDescription('opiniones', facts({ rating: null }))
    expect(text.startsWith('Reputación')).toBe(true)
    expect(text).not.toContain('NaN')
  })
})

describe('market position', () => {
  it('quantifies the gap and the rank', () => {
    const text = marketPositionSentence('comprar-dolares', facts())
    expect(text).toContain('41,60')
    expect(text).toContain('40,63')
    expect(text).toContain('0,97')
    expect(text).toContain('970')
    expect(text).toContain('37º de 43')
  })

  it('says so plainly when the casa is the cheapest', () => {
    const text = marketPositionSentence('comprar-dolares', facts({ marketBestSell: 41.6 }))
    expect(text).toContain('la venta más barata')
    expect(text).not.toContain('más por dólar')
  })

  it('says so plainly when the casa pays best', () => {
    const text = marketPositionSentence('vender-dolares', facts({ marketBestBuy: 39.2 }))
    expect(text).toContain('mejor paga')
  })

  // An off-market board is dropped from the ranking, so its rank is null. The
  // gap is still worth stating; "0º de 43" is not.
  it('states the gap without a rank when the casa is outside the ranked set', () => {
    const text = marketPositionSentence('comprar-dolares', facts({ sellRank: null }))
    expect(text).toContain('más por dólar')
    expect(text).not.toContain('º de')
  })

  it('returns nothing when the casa publishes no quote', () => {
    expect(marketPositionSentence('comprar-dolares', facts({ usd: null }))).toBe('')
    expect(marketPositionSentence('vender-dolares', facts({ marketBestBuy: null }))).toBe('')
  })
})
