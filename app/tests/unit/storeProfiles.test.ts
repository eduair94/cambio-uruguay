import { describe, expect, it } from 'vitest'
import {
  storeBuyingAdvice,
  storeFaq,
  storeFreshSignals,
  storeIndexable,
  storeSignalFresh,
  storeSignalSummary,
  STORE_INDEXABLE_MIN_SIGNALS,
  STORE_SIGNAL_MAX_AGE_DAYS,
  type StorePublicProfile,
} from '../../utils/storeProfiles'

const NOW = new Date('2026-09-16T12:00:00.000Z')
const daysAgo = (n: number): string => new Date(NOW.getTime() - n * 86_400_000).toISOString()

function baseProfile(overrides: Partial<StorePublicProfile> = {}): StorePublicProfile {
  return {
    key: 'tienda-test',
    name: 'Tienda Test',
    domain: 'tiendatest.com.uy',
    kind: 'tienda-uy',
    rubros: ['general'],
    aliases: ['Tienda Test'],
    site: null,
    age: null,
    trustpilot: null,
    google: null,
    reddit: null,
    catalog: null,
    signals: 0,
    indexable: false,
    firstSeen: '2026-01-01',
    lastSeen: '2026-01-01',
    ...overrides,
  }
}

describe('STORE_SIGNAL_MAX_AGE_DAYS', () => {
  it('mirrors the backend cutoff (60 days)', () => {
    expect(STORE_SIGNAL_MAX_AGE_DAYS).toBe(60)
  })
})

describe('STORE_INDEXABLE_MIN_SIGNALS', () => {
  it('mirrors the backend threshold (3 signals)', () => {
    expect(STORE_INDEXABLE_MIN_SIGNALS).toBe(3)
  })
})

describe('storeSignalFresh', () => {
  it('is true within the cutoff and false past it, and false for a missing date', () => {
    expect(storeSignalFresh(daysAgo(1), NOW)).toBe(true)
    expect(storeSignalFresh(daysAgo(60), NOW)).toBe(true)
    expect(storeSignalFresh(daysAgo(61), NOW)).toBe(false)
    expect(storeSignalFresh(null, NOW)).toBe(false)
    expect(storeSignalFresh(undefined, NOW)).toBe(false)
  })
})

describe('storeIndexable', () => {
  it('is true only once fresh signals reach STORE_INDEXABLE_MIN_SIGNALS, ignoring the stored field', () => {
    const twoFresh = baseProfile({
      indexable: true, // stored value is deliberately wrong; the function must not trust it
      age: { since: '2020-01-01', source: 'crt.sh', checkedAt: daysAgo(1) },
      trustpilot: {
        score: 4,
        reviews: 10,
        reviewsLast12m: 5,
        claimed: true,
        alerts: 0,
        url: 'x',
        checkedAt: daysAgo(1),
      },
    })
    expect(storeIndexable(twoFresh, NOW)).toBe(false)

    const threeFresh = baseProfile({
      indexable: false, // stored value is deliberately wrong the other way
      age: { since: '2020-01-01', source: 'crt.sh', checkedAt: daysAgo(1) },
      trustpilot: {
        score: 4,
        reviews: 10,
        reviewsLast12m: 5,
        claimed: true,
        alerts: 0,
        url: 'x',
        checkedAt: daysAgo(1),
      },
      google: { rating: 4, reviews: 5, address: null, url: 'x', checkedAt: daysAgo(1) },
    })
    expect(storeIndexable(threeFresh, NOW)).toBe(true)
  })
})

describe('storeFreshSignals', () => {
  it('counts a fresh, meaningful signal per field, ignoring stale or empty ones', () => {
    const profile = baseProfile({
      site: {
        status: 'ok',
        finalHost: 'tiendatest.com.uy',
        https: true,
        platform: 'shopify',
        phone: true,
        whatsapp: false,
        email: true,
        rut: null,
        address: null,
        policies: { returns: null, terms: null, privacy: null },
        payments: [],
        checkedAt: daysAgo(1),
      },
      trustpilot: {
        score: 4,
        reviews: 10,
        reviewsLast12m: 5,
        claimed: true,
        alerts: 0,
        url: 'https://trustpilot.com/review/tiendatest.com.uy',
        checkedAt: daysAgo(61),
      },
      catalog: { offers: 0, verticals: [], checkedAt: daysAgo(1) },
    })
    // site: fresh+ok (counts). trustpilot: exists but 61 days old (does not count).
    // catalog: fresh but zero offers, not a fact worth counting (does not count).
    expect(storeFreshSignals(profile, NOW)).toBe(1)
  })
})

describe('storeSignalSummary', () => {
  it('reports Trustpilot and Google numbers in es-UY format, with no verdict words', () => {
    const profile = baseProfile({
      trustpilot: {
        score: 1.4,
        reviews: 104,
        reviewsLast12m: 40,
        claimed: false,
        alerts: 0,
        url: 'https://trustpilot.com/review/tiendatest.com.uy',
        checkedAt: daysAgo(3),
      },
      google: {
        rating: 4.3,
        reviews: 812,
        address: null,
        url: 'https://maps.google.com/x',
        checkedAt: daysAgo(3),
      },
    })
    const summary = storeSignalSummary(profile, NOW)
    expect(summary).toContain('1,4')
    expect(summary).toContain('104')
    expect(summary).toContain('4,3')
    expect(summary).toContain('812')
    const lower = summary.toLowerCase()
    for (const banned of ['confiable', 'estafa', 'recomendamos', 'evitá']) {
      expect(lower).not.toContain(banned)
    }
  })

  it('drops a signal older than STORE_SIGNAL_MAX_AGE_DAYS instead of publishing it as current', () => {
    const profile = baseProfile({
      trustpilot: {
        score: 1.4,
        reviews: 104,
        reviewsLast12m: 40,
        claimed: false,
        alerts: 0,
        url: 'https://trustpilot.com/review/tiendatest.com.uy',
        checkedAt: daysAgo(3),
      },
      google: {
        rating: 4.3,
        reviews: 812,
        address: null,
        url: 'https://maps.google.com/x',
        checkedAt: daysAgo(61),
      },
    })
    const summary = storeSignalSummary(profile, NOW)
    expect(summary).toContain('1,4')
    expect(summary).not.toContain('4,3')
    expect(summary).not.toContain('812')
  })

  it('says plainly there are no verified signals yet when the profile has none', () => {
    const summary = storeSignalSummary(baseProfile(), NOW)
    expect(summary).toContain('Tienda Test')
    expect(summary.toLowerCase()).not.toContain('confiable')
  })

  it('groups a four-digit review count es-UY style, keeping the score as a plain decimal', () => {
    const profile = baseProfile({
      trustpilot: {
        score: 4,
        reviews: 12345,
        reviewsLast12m: 500,
        claimed: true,
        alerts: 0,
        url: 'https://trustpilot.com/review/tiendatest.com.uy',
        checkedAt: daysAgo(1),
      },
    })
    const summary = storeSignalSummary(profile, NOW)
    expect(summary).toContain('12.345')
    expect(summary).not.toContain('12345')
    expect(summary).toContain('4,0')
  })
})

describe('storeFaq', () => {
  it('answers "¿es confiable?" with the enumerated signals, ending with the disclaimer', () => {
    const profile = baseProfile({
      trustpilot: {
        score: 4.2,
        reviews: 50,
        reviewsLast12m: 10,
        claimed: true,
        alerts: 0,
        url: 'https://trustpilot.com/review/tiendatest.com.uy',
        checkedAt: daysAgo(2),
      },
    })
    const faqs = storeFaq(profile, null)
    const confiable = faqs.find(f => f.question === `¿${profile.name} es confiable?`)
    expect(confiable).toBeTruthy()
    expect(confiable!.answer).toContain('4,2')
    expect(
      confiable!.answer.endsWith('No es una calificación nuestra: cada dato dice de dónde sale.')
    ).toBe(true)
  })

  it('answers "¿tiene local físico?" with the Google address when it exists', () => {
    const profile = baseProfile({
      google: {
        rating: 4,
        reviews: 5,
        address: 'Av. Italia 123, Montevideo',
        url: 'https://maps.google.com/x',
        checkedAt: daysAgo(1),
      },
    })
    const faqs = storeFaq(profile, null)
    const local = faqs.find(f => f.question === `¿${profile.name} tiene local físico?`)
    expect(local!.answer).toContain('Av. Italia 123, Montevideo')
  })

  it('falls back to the site JSON-LD address when Google has none', () => {
    const profile = baseProfile({
      site: {
        status: 'ok',
        finalHost: 'tiendatest.com.uy',
        https: true,
        platform: 'shopify',
        phone: true,
        whatsapp: false,
        email: true,
        rut: null,
        address: 'Bulevar Artigas 456, Montevideo',
        policies: { returns: null, terms: null, privacy: null },
        payments: [],
        checkedAt: daysAgo(1),
      },
    })
    const faqs = storeFaq(profile, null)
    const local = faqs.find(f => f.question === `¿${profile.name} tiene local físico?`)
    expect(local!.answer).toContain('Bulevar Artigas 456, Montevideo')
  })

  it('says there is no published address when neither source has one', () => {
    const profile = baseProfile()
    const faqs = storeFaq(profile, null)
    const local = faqs.find(f => f.question === `¿${profile.name} tiene local físico?`)
    expect(local!.answer).toBe('No encontramos una dirección publicada.')
  })

  it('includes "¿Cómo le reclamo a <name>?"', () => {
    const profile = baseProfile()
    const faqs = storeFaq(profile, null)
    expect(faqs.some(f => f.question === `¿Cómo le reclamo a ${profile.name}?`)).toBe(true)
  })

  it('links to the Bankos brand page when a slug resolved, and says so plainly when it did not', () => {
    const profile = baseProfile()
    const withBrand = storeFaq(profile, 'tienda-test')
    const withoutBrand = storeFaq(profile, null)
    const question = `¿${profile.name} tiene descuentos con tarjeta?`
    expect(withBrand.find(f => f.question === question)!.answer).toContain(
      '/descuentos-con-tarjeta-uruguay/marca/tienda-test'
    )
    const noBrandAnswer = withoutBrand.find(f => f.question === question)!.answer
    expect(noBrandAnswer).not.toContain('/descuentos-con-tarjeta')
    // Must say the store has no page of its own — never claim it is absent from Bankos'
    // catalogue, which is a different (and unverified) fact (fix round 1, minor).
    expect(noBrandAnswer).toContain('no tiene una página propia de descuentos con tarjeta')
    expect(noBrandAnswer.toLowerCase()).not.toContain('catálogo')
  })
})

describe('storeBuyingAdvice', () => {
  it('links to the customs pages for compra-exterior', () => {
    const advice = storeBuyingAdvice('compra-exterior')
    const links = advice.items.map(i => i.to)
    expect(links).toContain('/franquicia-aduana-uruguay')
    expect(links).toContain('/guias/impuesto-temu-uruguay')
    expect(links).toContain('/problemas-con-la-aduana-uruguay')
  })

  it('links to consumer-rights pages and cites the 5-business-day withdrawal for tienda-uy', () => {
    const advice = storeBuyingAdvice('tienda-uy')
    const links = advice.items.map(i => i.to)
    expect(links).toContain('/derechos-consumidor-compras-online')
    expect(links).toContain('/defensa-al-consumidor-uruguay')
    const text = advice.items.map(i => i.text).join(' ')
    expect(text).toContain('5 días hábiles')
    expect(text).toContain('17.250')
  })
})
