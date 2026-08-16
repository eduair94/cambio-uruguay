import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildBranchPages, type Branch } from '../../utils/branches'
import {
  CASA_INTENTS,
  CASA_INTENT_META,
  availableIntents,
  branchesWithHours,
  branchesWithPhone,
  departmentLabels,
  formatPesosEs,
  formatRateEs,
  intentAvailable,
  intentDescription,
  intentHeading,
  intentTitle,
  intentsFor,
  isCasaIntent,
  joinEs,
  marketPositionSentence,
  type CasaFacts,
  type CasaIntent,
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
    ...overrides,
  }
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
  it('matches the literal the route guard inlines', () => {
    const page = readFileSync(
      join(__dirname, '..', '..', 'pages', 'casa', '[origin]', '[intent].vue'),
      'utf8'
    )
    const match = page.match(/const known = \[([^\]]+)\]/)
    expect(match).toBeTruthy()
    const inlined = (match?.[1] ?? '')
      .split(',')
      .map(part => part.trim().replace(/^'|'$/g, ''))
      .filter(Boolean)
    expect(inlined).toEqual([...CASA_INTENTS])
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

  it('lists available intents in catalogue order', () => {
    const branches = buildBranchPages([branch()])
    expect(intentsFor({ branches, quotesUsd: true, hasBcu: true, hasRating: true })).toEqual([
      ...CASA_INTENTS,
    ])
    expect(intentsFor({ ...base, quotesUsd: true })).toEqual(['comprar-dolares', 'vender-dolares'])
  })

  it('agrees with itself when called through the resolved facts', () => {
    expect(availableIntents(facts())).toEqual([...CASA_INTENTS])
    expect(availableIntents(facts({ usd: null, branches: [], bcuUrl: '', rating: null }))).toEqual(
      []
    )
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
