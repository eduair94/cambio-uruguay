import { describe, expect, it } from 'vitest'
import {
  affordableChairOffers,
  chairCatalogSlug,
  chairGallery,
  chairMedia,
  cheapestChairOffer,
  convertChairOfferPrice,
  groupChairTiers,
  priorityAffinity,
  sentimentPercentages,
  sortChairsForPriority,
  type ChairTierItem,
} from '../../utils/chairTiers'

const chair = (overrides: Partial<ChairTierItem>): ChairTierItem => ({
  slug: 'base',
  name: 'Base',
  brand: '',
  model: '',
  tier: 'A',
  score: 70,
  confidence: 'medium',
  sources: 4,
  posts: 0,
  comments: 4,
  replies: 0,
  uniqueAuthors: 4,
  positive: 2,
  neutral: 1,
  negative: 1,
  themes: [],
  summary: '',
  generalReview: { verdict: '', pros: [], cons: [] },
  evidence: [],
  offers: [],
  image: null,
  ...overrides,
})

describe('chair tier presentation logic', () => {
  it('groups only populated tiers in canonical order', () => {
    const groups = groupChairTiers([
      chair({ tier: 'C', name: 'C' }),
      chair({ tier: 'S', name: 'S' }),
    ])
    expect(groups.map(group => group.tier)).toEqual(['S', 'C'])
  })

  it('reorders a tier by the selected workday priority without changing its tier', () => {
    const durable = chair({
      name: 'Durable',
      score: 66,
      themes: [{ id: 'durability', mentions: 4, positive: 4, negative: 0 }],
    })
    const comfortable = chair({
      name: 'Comfortable',
      score: 80,
      themes: [{ id: 'comfort', mentions: 6, positive: 5, negative: 1 }],
    })
    const sorted = sortChairsForPriority([comfortable, durable], 'durability')
    expect(sorted.map(item => item.name)).toEqual(['Durable', 'Comfortable'])
    expect(priorityAffinity(durable, 'durability')).toBeGreaterThan(0)
  })

  it('returns percentages that always add to 100', () => {
    const distribution = sentimentPercentages(chair({ positive: 2, neutral: 2, negative: 1 }))
    expect(distribution.positive + distribution.neutral + distribution.negative).toBe(100)
  })

  it('converts offers with the live USD sell rate', () => {
    expect(
      convertChairOfferPrice(
        {
          id: 'usd',
          seller: 'Store',
          channel: 'local-store',
          title: 'Chair',
          price: 500,
          currency: 'USD',
          condition: 'new',
          verifiedAt: '2026-07-25',
          url: 'https://example.com',
        },
        'UYU',
        42
      )
    ).toBe(21000)
  })

  it('chooses the strongest tier within budget before the cheapest chair', () => {
    const offer = (price: number) => ({
      id: String(price),
      seller: 'Store',
      channel: 'local-store' as const,
      title: 'Chair',
      price,
      currency: 'UYU' as const,
      condition: 'new' as const,
      verifiedAt: '2026-07-25',
      url: 'https://example.com',
    })
    const options = affordableChairOffers(
      [
        chair({ name: 'Tier B', tier: 'B', score: 80, offers: [offer(10000)] }),
        chair({ name: 'Tier A', tier: 'A', score: 72, offers: [offer(15000)] }),
      ],
      20000,
      'UYU',
      42
    )
    expect(options[0].chair.name).toBe('Tier A')
  })
})

describe('chair photo resolution', () => {
  it('prefers the gallery the backend stored', () => {
    const stored = {
      url: 'https://example.com/stored.jpg',
      alt: 'Stored',
      sourceName: 'Seller',
      sourceUrl: 'https://example.com',
    }
    const item = chair({ slug: 'vigo-atlas', gallery: [stored] })
    expect(chairGallery(item)).toEqual([stored])
    expect(chairMedia(item)).toEqual(stored)
  })

  it('falls back to the local catalog for a v1 model-only slug', () => {
    // Methodology v1 wrote "atlas", not "vigo-atlas", and carried no image at all.
    const gallery = chairGallery(chair({ slug: 'atlas' }))
    expect(gallery.length).toBeGreaterThan(1)
    expect(gallery[0].sourceName).toBe('World Vigo')
    expect(chairCatalogSlug('atlas')).toBe('vigo-atlas')
  })

  it('never guesses a photo for a brand-only group', () => {
    expect(chairGallery(chair({ slug: 'vigo' }))).toEqual([])
    expect(chairMedia(chair({ slug: 'herman-miller' }))).toBeNull()
  })
})

describe('chair from-price', () => {
  const offer = (price: number, currency: 'UYU' | 'USD') => ({
    id: `${currency}-${price}`,
    seller: 'Store',
    channel: 'local-store' as const,
    title: 'Chair',
    price,
    currency,
    condition: 'new' as const,
    verifiedAt: '2026-07-25',
    url: 'https://example.com',
  })

  it('compares mixed currencies through the live rate', () => {
    const cheapest = cheapestChairOffer(
      { offers: [offer(20000, 'UYU'), offer(400, 'USD')] },
      'UYU',
      42
    )
    expect(cheapest?.currency).toBe('USD')
  })

  it('ranks only what it can express in the reading currency when no rate is available', () => {
    const cheapest = cheapestChairOffer(
      { offers: [offer(20000, 'UYU'), offer(400, 'USD')] },
      'UYU',
      null
    )
    expect(cheapest?.currency).toBe('UYU')
  })

  it('still names a price when nothing can be converted', () => {
    const cheapest = cheapestChairOffer(
      { offers: [offer(900, 'USD'), offer(400, 'USD')] },
      'UYU',
      null
    )
    expect(cheapest?.price).toBe(400)
  })

  it('returns null when the chair has no offers', () => {
    expect(cheapestChairOffer({ offers: [] }, 'UYU', 42)).toBeNull()
  })
})
