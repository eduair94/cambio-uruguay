import { describe, expect, it } from 'vitest'
import { publicPhotoFacts } from '../../utils/photoFactsPublic'

const doc = (over: Record<string, unknown> = {}) => ({
  ok: true,
  schema: 1,
  model: 'claude-haiku-5-5',
  readAt: '2026-11-23T14:25:00.000Z',
  source: 'mercadolibre',
  listingId: 'mercadolibre:1',
  photos: [
    { url: 'https://http2.mlstatic.com/a.jpg' },
    { url: 'https://http2.mlstatic.com/b.jpg' },
    { url: 'https://http2.mlstatic.com/c.jpg' },
  ],
  facts: {
    furniture: 'si',
    furniturePhoto: 1,
    seen: { integratedKitchen: 2, balconyTerrace: 0, acUnit: 0, pool: null },
  },
  ...over,
})
const offer = (over: Record<string, unknown> = {}) => ({
  listingId: 'mercadolibre:1',
  source: 'mercadolibre',
  declaredFurnished: null,
  ...over,
})

describe('publicPhotoFacts', () => {
  it('publishes furniture and the integrated kitchen, each with the photo that shows it', () => {
    expect(publicPhotoFacts(doc(), offer())).toEqual({
      listingId: 'mercadolibre:1',
      readAt: '2026-11-23',
      facts: [
        { fact: 'amueblada', photo: 'https://http2.mlstatic.com/b.jpg' },
        { fact: 'cocina_integrada', photo: 'https://http2.mlstatic.com/c.jpg' },
      ],
    })
  })

  it('never publishes what did not pass the bar: balcony, air conditioning, pool', () => {
    const facts = publicPhotoFacts(doc(), offer())!.facts.map(f => f.fact)
    expect(facts).not.toContain('balcon')
    expect(JSON.stringify(publicPhotoFacts(doc(), offer()))).not.toMatch(/balcon|acUnit|pool|aire/i)
  })

  it('says "sin muebles" for empty rooms', () => {
    const out = publicPhotoFacts(
      doc({ facts: { furniture: 'no', furniturePhoto: 0, seen: {} } }),
      offer()
    )
    expect(out?.facts).toEqual([{ fact: 'sin_muebles', photo: 'https://http2.mlstatic.com/a.jpg' }])
  })

  it('never repeats or contradicts what the advert declares about furniture', () => {
    for (const declaredFurnished of [true, false]) {
      const out = publicPhotoFacts(doc(), offer({ declaredFurnished }))
      expect(out?.facts.map(f => f.fact)).toEqual(['cocina_integrada'])
    }
  })

  it('does not say "amueblada" for InfoCasas, which sells virtual staging, but does say empty', () => {
    const info = { source: 'infocasas', listingId: 'infocasas:9' }
    expect(
      publicPhotoFacts(
        doc({ ...info, facts: { furniture: 'si', furniturePhoto: 1, seen: {} } }),
        offer(info)
      )
    ).toBeNull()
    expect(
      publicPhotoFacts(
        doc({ ...info, facts: { furniture: 'no', furniturePhoto: 1, seen: {} } }),
        offer(info)
      )?.facts
    ).toEqual([{ fact: 'sin_muebles', photo: 'https://http2.mlstatic.com/b.jpg' }])
  })

  it('publishes only the measured model and schema, and only a stored ok reading of the same advert', () => {
    expect(publicPhotoFacts(doc({ model: 'claude-sonnet-5-5' }), offer())).toBeNull()
    expect(publicPhotoFacts(doc({ schema: 2 }), offer())).toBeNull()
    expect(publicPhotoFacts(doc({ ok: false }), offer())).toBeNull()
    expect(publicPhotoFacts(doc(), offer({ listingId: 'mercadolibre:2' }))).toBeNull()
    expect(publicPhotoFacts(null, offer())).toBeNull()
  })

  it('drops a fact whose photo is missing or not an https URL', () => {
    const out = publicPhotoFacts(
      doc({
        photos: [{ url: 'javascript:alert(1)' }, { url: 'http://x.com/a.jpg' }, {}],
        facts: { furniture: 'si', furniturePhoto: 1, seen: { integratedKitchen: 2 } },
      }),
      offer()
    )
    expect(out).toBeNull()
  })
})
