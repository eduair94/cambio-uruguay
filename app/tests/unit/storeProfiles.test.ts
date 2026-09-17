import { describe, expect, it } from 'vitest'
import {
  storeAddress,
  storeBuyingAdvice,
  storeFaq,
  storeFormatDate,
  storeFreshSignals,
  storeHubItemList,
  storeIndexable,
  storeMentionsCount,
  storePlatformLabel,
  storeSignalFresh,
  storeSignalSummary,
  STORE_INDEXABLE_MIN_SIGNALS,
  STORE_REDDIT_MAX_MENTIONS,
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

describe('STORE_REDDIT_MAX_MENTIONS', () => {
  it('mirrors the backend cap (500 mentions)', () => {
    expect(STORE_REDDIT_MAX_MENTIONS).toBe(500)
  })
})

describe('storeMentionsCount', () => {
  it('reports the exact count when not capped', () => {
    expect(storeMentionsCount({ mentions: 42, capped: false })).toBe('42')
  })

  it('reports "500 o más" when capped, never a bare 500 (item 2)', () => {
    expect(storeMentionsCount({ mentions: 500, capped: true })).toBe('500 o más')
  })
})

describe('storePlatformLabel', () => {
  it('maps every known platform key to a human label', () => {
    expect(storePlatformLabel('fenicio')).toBe('Fenicio')
    expect(storePlatformLabel('shopify')).toBe('Shopify')
    expect(storePlatformLabel('vtex')).toBe('VTEX')
    expect(storePlatformLabel('woocommerce')).toBe('WooCommerce')
    expect(storePlatformLabel('tiendanube')).toBe('Tiendanube')
    expect(storePlatformLabel('wix')).toBe('Wix')
    expect(storePlatformLabel('magento')).toBe('Magento')
    expect(storePlatformLabel('nextjs')).toBe('Next.js')
  })

  it('returns null for "otra" and for a missing/unknown value (fix round F1, item 15)', () => {
    expect(storePlatformLabel('otra')).toBeNull()
    expect(storePlatformLabel(null)).toBeNull()
    expect(storePlatformLabel(undefined)).toBeNull()
    expect(storePlatformLabel('')).toBeNull()
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

  it('says "En línea desde" with a long es-UY date, not "dominio registrado" with a raw ISO date (item 1)', () => {
    const profile = baseProfile({
      age: { since: '2019-09-30', source: 'crt.sh', checkedAt: daysAgo(1) },
    })
    const summary = storeSignalSummary(profile, NOW)
    expect(summary).toContain(`En línea desde ${storeFormatDate('2019-09-30')}`)
    expect(summary).not.toContain('dominio registrado')
    expect(summary).not.toContain('2019-09-30')
  })

  it('capitalizes every joined sentence, never a lowercase start after a period (item 1)', () => {
    const profile = baseProfile({
      age: { since: '2019-09-30', source: 'crt.sh', checkedAt: daysAgo(1) },
      site: {
        status: 'ok',
        finalHost: 'tiendatest.com.uy',
        https: true,
        platform: 'shopify',
        phone: false,
        whatsapp: false,
        email: false,
        rut: null,
        address: null,
        policies: { returns: null, terms: null, privacy: null },
        payments: [],
        checkedAt: daysAgo(1),
      },
    })
    const summary = storeSignalSummary(profile, NOW)
    // Split on ". " (the join separator, with the trailing "." stripped by the split boundary) and
    // check every fragment starts with an uppercase letter.
    const sentences = summary.replace(/\.$/, '').split('. ')
    expect(sentences.length).toBeGreaterThan(1)
    for (const sentence of sentences) {
      expect(sentence[0]).toBe(sentence[0]!.toUpperCase())
    }
  })

  it('says "500 o más" for a capped Reddit count, never the bare cap number (item 2)', () => {
    const profile = baseProfile({
      reddit: {
        mentions: 500,
        byYear: {},
        threads: [],
        tone: null,
        capped: true,
        checkedAt: daysAgo(1),
      },
    })
    const summary = storeSignalSummary(profile, NOW)
    expect(summary).toContain('500 o más menciones')
  })
})

describe('storeAddress', () => {
  it('prefers a fresh Google address over a fresh site address', () => {
    const profile = baseProfile({
      google: {
        rating: 4,
        reviews: 5,
        address: 'Av. Italia 123, Montevideo',
        url: 'x',
        checkedAt: daysAgo(1),
      },
      site: {
        status: 'ok',
        finalHost: 'tiendatest.com.uy',
        https: true,
        platform: 'shopify',
        phone: false,
        whatsapp: false,
        email: false,
        rut: null,
        address: 'Bulevar Artigas 456, Montevideo',
        policies: { returns: null, terms: null, privacy: null },
        payments: [],
        checkedAt: daysAgo(1),
      },
    })
    const address = storeAddress(profile, NOW)
    expect(address).toEqual({
      address: 'Av. Italia 123, Montevideo',
      source: 'google',
      checkedAt: daysAgo(1),
    })
  })

  it('falls back to a fresh site address when Google is stale (fix round 1, item 2)', () => {
    const profile = baseProfile({
      google: {
        rating: 4,
        reviews: 5,
        address: 'Av. Italia 123, Montevideo',
        url: 'x',
        checkedAt: daysAgo(61), // stale
      },
      site: {
        status: 'ok',
        finalHost: 'tiendatest.com.uy',
        https: true,
        platform: 'shopify',
        phone: false,
        whatsapp: false,
        email: false,
        rut: null,
        address: 'Bulevar Artigas 456, Montevideo',
        policies: { returns: null, terms: null, privacy: null },
        payments: [],
        checkedAt: daysAgo(1), // fresh
      },
    })
    const address = storeAddress(profile, NOW)
    expect(address).toEqual({
      address: 'Bulevar Artigas 456, Montevideo',
      source: 'site',
      checkedAt: daysAgo(1),
    })
  })

  it('returns null when both sources are stale, not a guessed-current address', () => {
    const profile = baseProfile({
      google: {
        rating: 4,
        reviews: 5,
        address: 'Av. Italia 123, Montevideo',
        url: 'x',
        checkedAt: daysAgo(61),
      },
      site: {
        status: 'ok',
        finalHost: 'tiendatest.com.uy',
        https: true,
        platform: 'shopify',
        phone: false,
        whatsapp: false,
        email: false,
        rut: null,
        address: 'Bulevar Artigas 456, Montevideo',
        policies: { returns: null, terms: null, privacy: null },
        payments: [],
        checkedAt: daysAgo(90),
      },
    })
    expect(storeAddress(profile, NOW)).toBeNull()
  })

  it('returns null when neither source has ever published an address', () => {
    expect(storeAddress(baseProfile(), NOW)).toBeNull()
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

  it('judges freshness against the passed `now` (servedAt), never a fresh internal new Date() (fix round F2, item B)', () => {
    const servedAt = new Date('2026-01-10T00:00:00.000Z')
    const checkedAt = new Date(servedAt.getTime() - 10 * 86_400_000).toISOString() // 10 days before servedAt
    const profile = baseProfile({
      trustpilot: {
        score: 4,
        reviews: 10,
        reviewsLast12m: 5,
        claimed: true,
        alerts: 0,
        url: 'x',
        checkedAt,
      },
    })
    // Same profile, same checkedAt, two different `now` instants: fresh 10 days after checkedAt,
    // stale 130 days after it (past STORE_SIGNAL_MAX_AGE_DAYS). If storeFaq built its own
    // `new Date()` instead of using the argument, both calls would agree with each other (whatever
    // the real wall clock says) instead of disagreeing with each other as asserted here.
    const freshAnswer = storeFaq(profile, null, servedAt).find(
      f => f.question === `¿${profile.name} es confiable?`
    )!.answer
    const staleAnswer = storeFaq(
      profile,
      null,
      new Date(servedAt.getTime() + 120 * 86_400_000)
    ).find(f => f.question === `¿${profile.name} es confiable?`)!.answer
    expect(freshAnswer).toContain('Trustpilot')
    expect(staleAnswer).not.toContain('Trustpilot')
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

  it('says there is no VERIFIED address when neither source was ever queried (fix round F2, item C)', () => {
    // baseProfile() has google: null and site: null — neither source was ever asked, so the
    // generic answer replaces the old blanket claim that always named both sources regardless.
    const profile = baseProfile()
    const faqs = storeFaq(profile, null)
    const local = faqs.find(f => f.question === `¿${profile.name} tiene local físico?`)
    expect(local!.answer).toBe('No tenemos una dirección verificada.')
  })

  it('names only Google Maps when it is the only source fresh AND answered, with no address (item C)', () => {
    const profile = baseProfile({
      google: { rating: 4, reviews: 5, address: null, url: 'x', checkedAt: daysAgo(1) },
      // site is null: never queried, so it must never be named as a checked source.
    })
    const faqs = storeFaq(profile, null)
    const local = faqs.find(f => f.question === `¿${profile.name} tiene local físico?`)
    expect(local!.answer).toBe('No encontramos una dirección publicada en Google Maps.')
  })

  it('names only the site when it is the only source fresh AND answered, with no address (item C)', () => {
    const profile = baseProfile({
      site: {
        status: 'ok',
        finalHost: 'tiendatest.com.uy',
        https: true,
        platform: 'shopify',
        phone: false,
        whatsapp: false,
        email: false,
        rut: null,
        address: null,
        policies: { returns: null, terms: null, privacy: null },
        payments: [],
        checkedAt: daysAgo(1),
      },
      // google is null: never queried, so it must never be named as a checked source.
    })
    const faqs = storeFaq(profile, null)
    const local = faqs.find(f => f.question === `¿${profile.name} tiene local físico?`)
    expect(local!.answer).toBe('No encontramos una dirección publicada en el sitio de la tienda.')
  })

  it('names a blocked site scan as never checked, even though profile.site is not null (item C)', () => {
    const profile = baseProfile({
      google: { rating: 4, reviews: 5, address: null, url: 'x', checkedAt: daysAgo(1) },
      site: {
        status: 'blocked',
        finalHost: 'tiendatest.com.uy',
        https: true,
        platform: 'otra',
        phone: false,
        whatsapp: false,
        email: false,
        rut: null,
        address: null,
        policies: { returns: null, terms: null, privacy: null },
        payments: [],
        checkedAt: daysAgo(1),
      },
    })
    const faqs = storeFaq(profile, null)
    const local = faqs.find(f => f.question === `¿${profile.name} tiene local físico?`)
    expect(local!.answer).toBe('No encontramos una dirección publicada en Google Maps.')
  })

  it('names both sources only when BOTH are fresh AND answered, with neither having an address (item C)', () => {
    const profile = baseProfile({
      google: { rating: 4, reviews: 5, address: null, url: 'x', checkedAt: daysAgo(1) },
      site: {
        status: 'ok',
        finalHost: 'tiendatest.com.uy',
        https: true,
        platform: 'shopify',
        phone: false,
        whatsapp: false,
        email: false,
        rut: null,
        address: null,
        policies: { returns: null, terms: null, privacy: null },
        payments: [],
        checkedAt: daysAgo(1),
      },
    })
    const faqs = storeFaq(profile, null)
    const local = faqs.find(f => f.question === `¿${profile.name} tiene local físico?`)
    expect(local!.answer).toBe(
      'No encontramos una dirección publicada en Google Maps ni en el sitio de la tienda.'
    )
  })

  it('says "Dirección publicada:", not "Sí:", for a physical address (item 15)', () => {
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
    expect(local!.answer.startsWith('Dirección publicada: Av. Italia 123, Montevideo')).toBe(true)
    expect(local!.answer.startsWith('Sí:')).toBe(false)
  })

  it('says there is no VERIFIED address when both sources are stale (fix round 1, item 2; fix round F2, item C)', () => {
    // A far-past date is stale under any real "now" the test runs at, unlike `daysAgo` (which is
    // relative to the file's fixed NOW and would drift fresh as real time passes it). Neither
    // source is "fresh AND answered" here, so this is now the generic answer (item C) — the old
    // copy named both sources even though neither had actually answered recently.
    const staleForever = '2000-01-01T00:00:00.000Z'
    const profile = baseProfile({
      google: {
        rating: 4,
        reviews: 5,
        address: 'Av. Italia 123, Montevideo',
        url: 'x',
        checkedAt: staleForever,
      },
      site: {
        status: 'ok',
        finalHost: 'tiendatest.com.uy',
        https: true,
        platform: 'shopify',
        phone: false,
        whatsapp: false,
        email: false,
        rut: null,
        address: 'Bulevar Artigas 456, Montevideo',
        policies: { returns: null, terms: null, privacy: null },
        payments: [],
        checkedAt: staleForever,
      },
    })
    const faqs = storeFaq(profile, null)
    const local = faqs.find(f => f.question === `¿${profile.name} tiene local físico?`)
    expect(local!.answer).toBe('No tenemos una dirección verificada.')
    expect(local!.answer).not.toContain('Montevideo')
  })

  it('includes "¿Cómo le reclamo a <name>?"', () => {
    const profile = baseProfile()
    const faqs = storeFaq(profile, null)
    expect(faqs.some(f => f.question === `¿Cómo le reclamo a ${profile.name}?`)).toBe(true)
  })

  it('links to the Bankos brand page via `link` (never a raw path in the answer text), and says so plainly when it did not resolve (item 14)', () => {
    const profile = baseProfile()
    const withBrand = storeFaq(profile, 'tienda-test')
    const withoutBrand = storeFaq(profile, null)
    const question = `¿${profile.name} tiene descuentos con tarjeta?`

    const withBrandAnswer = withBrand.find(f => f.question === question)!
    expect(withBrandAnswer.answer).not.toContain('/descuentos-con-tarjeta')
    expect(withBrandAnswer.link).toEqual({
      label: expect.stringContaining(profile.name),
      to: '/descuentos-con-tarjeta-uruguay/marca/tienda-test',
    })

    const withoutBrandAnswer = withoutBrand.find(f => f.question === question)!
    expect(withoutBrandAnswer.link).toBeUndefined()
    expect(withoutBrandAnswer.answer).not.toContain('/descuentos-con-tarjeta')
    // Must say the store has no page of its own — never claim it is absent from Bankos'
    // catalogue, which is a different (and unverified) fact (fix round 1, minor).
    expect(withoutBrandAnswer.answer).toContain(
      'no tiene una página propia de descuentos con tarjeta'
    )
    expect(withoutBrandAnswer.answer.toLowerCase()).not.toContain('catálogo')
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

describe('storeHubItemList', () => {
  it('lists only the stores with a profile, in the order given, as absolute-URL ListItems', () => {
    const graph = storeHubItemList([
      { key: 'temu', name: 'Temu', hasProfile: true },
      { key: 'sin-ficha', name: 'Sin Ficha', hasProfile: false },
      { key: 'shein', name: 'Shein', hasProfile: true },
    ])
    expect(graph).toHaveLength(1)
    const [itemList] = graph as Array<{ itemListElement: Array<Record<string, unknown>> }>
    expect(itemList!.itemListElement).toEqual([
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Temu',
        url: 'https://cambio-uruguay.com/tiendas-online-uruguay/temu',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Shein',
        url: 'https://cambio-uruguay.com/tiendas-online-uruguay/shein',
      },
    ])
  })

  it('omits the node entirely, not a zero-item ItemList, when nothing has a profile yet (fix round 1, item 4)', () => {
    expect(storeHubItemList([{ key: 'temu', name: 'Temu', hasProfile: false }])).toEqual([])
    expect(storeHubItemList([])).toEqual([])
  })
})
