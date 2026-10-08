import { describe, expect, it } from 'vitest'
import { rentalAgeDays, rentalFreshness } from '../../utils/rentals'

// The card said only "Última vez visto: 8/10", which is when WE read the advert, not how old it is.
// "Más recientes" and the new `dias=` window both sort and filter by `freshAt`; the card now says it.
describe('how old a rental advert is', () => {
  const generatedAt = '2026-10-08T03:49:00.000Z'

  it('counts whole days between the advert and the run that produced the page', () => {
    expect(rentalAgeDays('2026-10-08', generatedAt)).toBe(0)
    expect(rentalAgeDays('2026-10-07T22:10:00Z', generatedAt)).toBe(1)
    expect(rentalAgeDays('2026-09-08', generatedAt)).toBe(30)
    // A portal date ahead of our clock is today, never "in -1 days".
    expect(rentalAgeDays('2026-10-09', generatedAt)).toBe(0)
    for (const bad of [null, undefined, '', 'pronto'])
      expect(rentalAgeDays(bad, generatedAt)).toBeNull()
    expect(rentalAgeDays('2026-10-08', 'nunca')).toBeNull()
  })

  it('says "published" only when a portal gave the date, and "first seen" otherwise', () => {
    const offer = (publishedAt: string | null) => ({ publishedAt })
    expect(
      rentalFreshness(
        { freshAt: '2026-10-05', offers: [offer(null), offer('2026-10-05')] },
        generatedAt
      )
    ).toEqual({ days: 3, published: true })
    expect(rentalFreshness({ freshAt: '2026-10-05', offers: [offer(null)] }, generatedAt)).toEqual({
      days: 3,
      published: false,
    })
    expect(rentalFreshness({ freshAt: '', offers: [] }, generatedAt)).toBeNull()
  })
})
