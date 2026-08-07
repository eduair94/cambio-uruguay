import { describe, expect, it } from 'vitest'
import {
  buildUsdComparison,
  CASA_TYPE_SLUGS,
  CASAS_PATH,
  CASAS_REPUTATION,
  casaTypePaths,
  categoryFromTypeSlug,
  getCasasContent,
  CASAS_LAST_RESEARCHED,
  OFF_MARKET_PCT,
  resolveReviewDate,
  typeSlugForCategory,
  type CasaCategory,
  type UsdRateRow,
} from '../../utils/casasDirectory'

const row = (
  origin: string,
  buy: number,
  sell: number,
  type = '',
  isInterBank = false
): UsdRateRow => ({ origin, code: 'USD', type, buy, sell, isInterBank })

describe('buildUsdComparison', () => {
  it('returns empty for empty input', () => {
    expect(buildUsdComparison([])).toEqual([])
  })

  it('excludes interbank rows and non-USD codes', () => {
    const out = buildUsdComparison([
      row('bcu', 40, 40, '', true),
      { origin: 'gales', code: 'EUR', type: '', buy: 45, sell: 47 },
      row('gales', 39.5, 41.5),
    ])
    expect(out.map(e => e.origin)).toEqual(['gales'])
  })

  it('prefers the plain cash row over BILLETE over other types', () => {
    const out = buildUsdComparison([
      row('brou', 38.9, 41.4, 'EBROU'),
      row('brou', 38.4, 41.9, 'BILLETE'),
    ])
    expect(out[0]?.type).toBe('BILLETE')
    const out2 = buildUsdComparison([row('gales', 39, 41, 'BILLETE'), row('gales', 39.2, 41.2, '')])
    expect(out2[0]?.type).toBe('')
  })

  it('skips rows with non-positive prices', () => {
    expect(buildUsdComparison([row('x', 0, 41)])).toEqual([])
  })

  it('treats a null type as the plain cash row', () => {
    const out = buildUsdComparison([{ origin: 'y', code: 'USD', type: null, buy: 39, sell: 41 }])
    expect(out[0]?.type).toBe('')
  })

  it('computes spread and gap-to-best', () => {
    const out = buildUsdComparison([row('a', 39, 41), row('b', 39.5, 40.5)])
    const a = out.find(e => e.origin === 'a')
    const b = out.find(e => e.origin === 'b')
    // spread = (sell-buy)/midpoint*100
    expect(a?.spreadPct).toBeCloseTo((2 / 40) * 100, 5)
    // best sell = 40.5 (b), best buy = 39.5 (b)
    expect(b?.gapSellPct).toBeCloseTo(0, 5)
    expect(b?.gapBuyPct).toBeCloseTo(0, 5)
    expect(a?.gapSellPct).toBeCloseTo(((41 - 40.5) / 40.5) * 100, 5)
    expect(a?.gapBuyPct).toBeCloseTo(((39.5 - 39) / 39.5) * 100, 5)
  })

  it('labels the operation behind each quote', () => {
    const out = buildUsdComparison([
      row('gales', 39, 41),
      row('brou', 39.5, 41, 'EBROU'),
      row('itau', 39.2, 41.25, 'TRANSFERENCIA'),
      row('prex', 40.05, 40.45),
    ])
    const by = new Map(out.map(e => [e.origin, e]))
    expect(by.get('gales')).toMatchObject({ operation: 'cash', requiresAccount: false })
    expect(by.get('brou')).toMatchObject({ operation: 'app', requiresAccount: true })
    expect(by.get('itau')).toMatchObject({ operation: 'transfer', requiresAccount: true })
    expect(by.get('prex')).toMatchObject({ operation: 'app', requiresAccount: true })
  })

  it('never flags an off-market quote without a real market to compare against', () => {
    // Nine quotes, one absurd: too few for a median to mean anything.
    const rows = Array.from({ length: 8 }, (_, i) => row(`casa${i}`, 39, 41))
    rows.push(row('broken', 4, 6))
    expect(buildUsdComparison(rows).every(e => !e.offMarket)).toBe(true)
  })

  it('flags a quote further than the threshold from the median, and only that one', () => {
    // A 20-house market clustered at 39/41, plus one board shifted ~5% down —
    // the shape of the real Baluma Cambio quote that used to win "best price".
    const rows = Array.from({ length: 20 }, (_, i) => row(`casa${i}`, 39 + i * 0.01, 41 + i * 0.01))
    rows.push(row('stale_board', 37.15, 39.55))
    const out = buildUsdComparison(rows)
    expect(out.filter(e => e.offMarket).map(e => e.origin)).toEqual(['stale_board'])
  })

  it('leaves a merely competitive quote alone', () => {
    const rows = Array.from({ length: 20 }, (_, i) => row(`casa${i}`, 39 + i * 0.01, 41 + i * 0.01))
    // 1.5% better on the sell side: aggressive pricing, not a broken scrape.
    rows.push(row('sharp', 39.5, 40.4))
    const out = buildUsdComparison(rows)
    expect(out.find(e => e.origin === 'sharp')?.offMarket).toBe(false)
  })

  it('uses a documented threshold', () => {
    expect(OFF_MARKET_PCT).toBe(3)
  })
})

describe('resolveReviewDate', () => {
  // The store is currently stamped 2026-07-05 while the shipped snapshot is
  // 2026-07-24, so "prefer the store" dated the page — and its JSON-LD
  // dateModified — backwards in production.
  it('never goes backwards from the researched snapshot', () => {
    expect(resolveReviewDate('2026-07-05T07:30:00.000Z', '2026-07-24')).toBe('2026-07-24')
  })

  it('follows the refresh once it overtakes the snapshot', () => {
    expect(resolveReviewDate('2026-08-04T07:30:00.000Z', '2026-07-24')).toBe('2026-08-04')
  })

  it('falls back to the snapshot when the store is empty', () => {
    expect(resolveReviewDate(null, '2026-07-24')).toBe('2026-07-24')
    expect(resolveReviewDate(undefined, '2026-07-24')).toBe('2026-07-24')
    expect(resolveReviewDate('', '2026-07-24')).toBe('2026-07-24')
  })

  it('treats the same day as no change', () => {
    expect(resolveReviewDate('2026-07-24T23:59:00.000Z', '2026-07-24')).toBe('2026-07-24')
  })

  it('defaults to the shipped constant', () => {
    expect(resolveReviewDate(null)).toBe(CASAS_LAST_RESEARCHED)
  })
})

describe('house-type slugs', () => {
  it('round-trips every category through its slug', () => {
    for (const category of ['casa', 'banco', 'fintech'] as CasaCategory[]) {
      expect(categoryFromTypeSlug(typeSlugForCategory(category))).toBe(category)
    }
  })

  it('resolves the three public slugs', () => {
    expect(categoryFromTypeSlug('casas-de-cambio')).toBe('casa')
    expect(categoryFromTypeSlug('bancos')).toBe('banco')
    expect(categoryFromTypeSlug('fintech')).toBe('fintech')
  })

  it('rejects anything else, so an invented slug 404s', () => {
    for (const slug of ['', 'banco', 'BANCOS', 'cripto', '../casa']) {
      expect(categoryFromTypeSlug(slug)).toBeNull()
    }
  })

  it('emits one sitemap path per type, all under the directory', () => {
    const paths = casaTypePaths()
    expect(paths.length).toBe(Object.keys(CASA_TYPE_SLUGS).length)
    expect(new Set(paths).size).toBe(paths.length)
    for (const p of paths) expect(p.startsWith(`${CASAS_PATH}/`)).toBe(true)
  })

  it('every type slice has at least one house, so no page renders empty', () => {
    for (const slug of Object.keys(CASA_TYPE_SLUGS)) {
      const category = categoryFromTypeSlug(slug)
      expect(CASAS_REPUTATION.filter(c => c.category === category).length).toBeGreaterThan(0)
    }
  })
})

describe('CASAS_REPUTATION invariants', () => {
  it('covers the tracked origins with unique codes and valid categories', () => {
    const codes = CASAS_REPUTATION.map(c => c.code)
    expect(new Set(codes).size).toBe(codes.length)
    expect(codes.length).toBeGreaterThanOrEqual(30)
    expect(CASAS_REPUTATION.every(c => ['casa', 'banco', 'fintech'].includes(c.category))).toBe(
      true
    )
  })

  it('includes every authenticated exchange provider in the shared catalogue', () => {
    const byCode = new Map(CASAS_REPUTATION.map(c => [c.code, c]))

    expect(byCode.get('oca')).toMatchObject({ name: 'OCA', category: 'fintech' })
    expect(byCode.get('santander')).toMatchObject({ name: 'Santander', category: 'banco' })
    expect(byCode.get('scotiabank')).toMatchObject({ name: 'Scotiabank', category: 'banco' })
    expect(byCode.get('bbva')).toMatchObject({ name: 'BBVA', category: 'banco' })
  })

  it('ratings are in range and always sourced', () => {
    for (const c of CASAS_REPUTATION) {
      if (c.googleRating != null) {
        expect(c.googleRating).toBeGreaterThanOrEqual(1)
        expect(c.googleRating).toBeLessThanOrEqual(5)
        expect(c.googleReviewCount).toBeGreaterThan(0)
        expect(c.ratingSource).toBeTruthy()
      } else {
        // No rating means no phantom count either.
        expect(c.googleReviewCount).toBeNull()
      }
    }
  })

  it('every source and press ref has a label and an http(s) url', () => {
    for (const c of CASAS_REPUTATION) {
      for (const ref of [...c.sources, ...c.press]) {
        expect(ref.label.length).toBeGreaterThan(3)
        expect(ref.url).toMatch(/^https?:\/\//)
      }
    }
  })

  it('LAST_RESEARCHED is an ISO date', () => {
    expect(CASAS_LAST_RESEARCHED).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('getCasasContent', () => {
  it('returns structurally identical trees for es/en/pt and falls back to es', () => {
    const es = getCasasContent('es')
    for (const loc of ['en', 'pt'] as const) {
      const tree = getCasasContent(loc)
      expect(Object.keys(tree).sort()).toEqual(Object.keys(es).sort())
      expect(tree.faq.length).toBe(es.faq.length)
      expect(tree.methodology.length).toBe(es.methodology.length)
    }
    expect(getCasasContent('fr').lang).toBe('es-UY')
  })
})
