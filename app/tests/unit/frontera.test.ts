import { describe, expect, it } from 'vitest'

import type { ExchangeRate } from '../../types/api'
import { slugifyDepartment, type LocalDataMap } from '../../utils/departments'
import {
  FRONTERA_ROUTES,
  fronteraBestBuy,
  fronteraBestSell,
  fronteraFromSlug,
  fronteraRoutesForCode,
  housesForFrontera,
  listFronteraSlugs,
} from '../../utils/frontera'

// localData fixture (GET /localData shape): three border casas plus one that is
// nowhere near the frontier, so the department filter is exercised.
const localData: LocalDataMap = {
  fenix: {
    name: 'Cambio Fénix',
    website: '',
    maps: '',
    bcu: '',
    // Accent mismatch on purpose: the route slug is accent-stripped.
    departments: ['RIVERA'],
  },
  matriz: {
    name: 'Cambio Matriz',
    website: '',
    maps: '',
    bcu: '',
    departments: ['RIVERA', 'MONTEVIDEO'],
  },
  brou: {
    name: 'BROU',
    website: '',
    maps: '',
    bcu: '',
    departments: ['RÍO NEGRO', 'MONTEVIDEO'],
  },
  // Montevideo-only: must never appear on a Rivera page even though it quotes BRL.
  aeromar: {
    name: 'Aeromar',
    website: '',
    maps: '',
    bcu: '',
    departments: ['MONTEVIDEO'],
  },
}

const row = (
  origin: string,
  code: string,
  buy: number,
  sell: number,
  type: ExchangeRate['type'] = 'BILLETE'
): ExchangeRate => ({ origin, date: '2026-08-04', type, code, name: origin, buy, sell })

const rows: ExchangeRate[] = [
  row('fenix', 'BRL', 7.1, 7.6),
  row('fenix', 'USD', 39, 41),
  row('matriz', 'BRL', 7.25, 7.8), // best buy in Rivera (highest buy)
  // A wholesale row that must be ignored (not a plain/cash quote).
  row('matriz', 'BRL', 9.9, 5.0, 'INTERBANCARIO'),
  row('aeromar', 'BRL', 8.5, 7.0), // Montevideo — outside every frontera dept
  row('brou', 'ARS', 0.03, 0.05),
]

describe('the curated allowlist', () => {
  it('has unique slugs shaped {currencySlug}-en-{departmentSlug}', () => {
    const slugs = listFronteraSlugs()
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const route of FRONTERA_ROUTES) {
      expect(route.slug).toBe(`${route.currencySlug}-en-${route.departmentSlug}`)
    }
  })

  it('only curates BRL and ARS', () => {
    for (const route of FRONTERA_ROUTES) {
      expect(['BRL', 'ARS']).toContain(route.code)
    }
  })

  it('keeps departmentSlug in sync with the display name', () => {
    for (const route of FRONTERA_ROUTES) {
      expect(route.departmentSlug).toBe(slugifyDepartment(route.departmentName))
    }
  })

  it('gives every route a non-empty unique context paragraph', () => {
    const contexts = FRONTERA_ROUTES.map(r => r.context)
    expect(new Set(contexts).size).toBe(contexts.length)
    for (const c of contexts) expect(c.length).toBeGreaterThan(120)
  })
})

describe('fronteraFromSlug', () => {
  it('resolves a curated slug', () => {
    expect(fronteraFromSlug('real-en-rivera')?.departmentName).toBe('Rivera')
  })

  it('is case-insensitive and trims', () => {
    expect(fronteraFromSlug('  REAL-EN-RIVERA ')?.code).toBe('BRL')
  })

  it('returns null for an uncurated combination', () => {
    expect(fronteraFromSlug('real-en-montevideo')).toBeNull()
    expect(fronteraFromSlug('')).toBeNull()
  })
})

describe('fronteraRoutesForCode', () => {
  it('splits the catalogue by currency', () => {
    expect(fronteraRoutesForCode('BRL').every(r => r.code === 'BRL')).toBe(true)
    expect(fronteraRoutesForCode('ARS').every(r => r.code === 'ARS')).toBe(true)
    expect(fronteraRoutesForCode('BRL').length + fronteraRoutesForCode('ARS').length).toBe(
      FRONTERA_ROUTES.length
    )
  })
})

describe('housesForFrontera', () => {
  const rivera = fronteraFromSlug('real-en-rivera')!

  it('lists only casas with a branch in the department', () => {
    const quotes = housesForFrontera(localData, rows, rivera)
    const origins = quotes.map(q => q.origin).sort()
    expect(origins).toEqual(['fenix', 'matriz'])
    expect(origins).not.toContain('aeromar') // Montevideo-only, though it quotes BRL
  })

  it('ignores non-plain/cash rows when picking the quote', () => {
    const quotes = housesForFrontera(localData, rows, rivera)
    const matriz = quotes.find(q => q.origin === 'matriz')!
    expect(matriz.buy).toBe(7.25) // the BILLETE row, not the INTERBANCARIO 9.9
    expect(matriz.sell).toBe(7.8)
  })

  it('flags best buy/sell within the department only', () => {
    const quotes = housesForFrontera(localData, rows, rivera)
    // matriz pays the most (7.25) even though aeromar's 8.5 is higher market-wide.
    expect(fronteraBestBuy(quotes)?.origin).toBe('matriz')
    // fenix charges the least to buy reales (7.6 < 7.8).
    expect(fronteraBestSell(quotes)?.origin).toBe('fenix')
  })

  it('returns empty when no casa in the department quotes the currency', () => {
    const salto = fronteraFromSlug('peso-argentino-en-salto')!
    expect(housesForFrontera(localData, rows, salto)).toEqual([])
  })

  it('matches departments accent-insensitively', () => {
    const rioNegro = fronteraFromSlug('peso-argentino-en-rio-negro')!
    const quotes = housesForFrontera(localData, rows, rioNegro)
    expect(quotes.map(q => q.origin)).toEqual(['brou']) // 'RÍO NEGRO' vs slug 'rio-negro'
  })
})
