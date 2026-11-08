import { beforeEach, describe, expect, it, vi } from 'vitest'
import { bulevarEspanaCopies, pocitosAlternatives } from './helpers/rentalCopies'
import { haversineKm } from '../../utils/nearbyRates'
import type { RentalPublicProperty } from '../../utils/rentals'

// El análisis de precio de una ficha de alquiler, con su cargador real (server/utils/propertyInsight)
// y los modelos simulados: el 8/11/2026 "la parecida más cercana" de nh6byn-10rlmiq era la misma
// vivienda publicada en InfoCasas, "a 50 m, mismo precio". La regla de copias la arma el cargador
// (título, superficie, punto y anunciante de cada fila), así que es el cargador el que se prueba.
const option = vi.fn()
let subjectRow: Record<string, unknown> | null = null
let peerRows: Array<Record<string, unknown>> = []
const aggregate = vi.fn((stages: Array<Record<string, any>>) => {
  const rows =
    typeof stages[0]?.$match?.key === 'string' ? (subjectRow ? [subjectRow] : []) : peerRows
  const result = Promise.resolve(rows)
  const chain: Promise<unknown[]> & {
    collation: () => unknown
    option: (value: unknown) => unknown
  } = Object.assign(result, {
    collation: () => chain,
    option: (value: unknown) => {
      option(value)
      return result
    },
  })
  return chain
})
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn(async () => undefined) }))
vi.mock('../../server/models/RentalMeta', () => ({
  RentalMetaModel: {
    findOne: () => ({ select: () => ({ lean: async () => ({ usdUyu: 40 }) }) }),
  },
}))
vi.mock('../../server/models/RentalListing', () => ({ RentalListingModel: { aggregate } }))
vi.mock('../../server/models/PropertySaleCatalog', () => ({
  PropertySaleCatalogModel: {},
  PropertySaleCatalogMetaModel: {},
}))
const { loadRentalInsight } = await import('../../server/utils/propertyInsight')

/** The subject as the loader reads it: its own point is the one its advert publishes. */
function asSubject(property: RentalPublicProperty) {
  return {
    ...property,
    offers: property.offers.map(offer => ({
      ...offer,
      identity: {
        version: 1,
        latitude: property.latitude,
        longitude: property.longitude,
        addressHidden: false,
      },
    })),
  }
}
/** A neighbour row with the distance the `$geoNear`-style stages would have added. */
function asPeer(property: RentalPublicProperty, origin: { lat: number; lng: number }) {
  const point =
    property.latitude !== null && property.longitude !== null
      ? { lat: property.latitude, lng: property.longitude }
      : null
  return { ...property, distanceKm: point ? haversineKm(origin, point) : null }
}

describe('loadRentalInsight — copies of the advert itself', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    subjectRow = null
    peerRows = []
  })

  it('never picks a copy of the advert, the InfoCasas one 0 m away included', async () => {
    const { subject, copies } = bulevarEspanaCopies()
    const { twice, distinct } = pocitosAlternatives()
    const origin = { lat: subject.latitude!, lng: subject.longitude! }
    subjectRow = asSubject(subject)
    peerRows = [...copies, ...twice, ...distinct].map(row => asPeer(row, origin))

    const insight = await loadRentalInsight(subject.key)
    expect(insight).not.toBeNull()
    const copyKeys = copies.map(row => row.key)
    const picked = insight!.picks.map(pick => pick.listing.key)
    expect(picked.length).toBeGreaterThan(0)
    for (const key of picked) expect(copyKeys, key).not.toContain(key)
    // The closest similar home is the nearest one that is NOT the subject on another portal.
    const nearestOther = peerRows
      .filter(row => !copyKeys.includes(String(row.key)) && typeof row.distanceKm === 'number')
      .sort((a, b) => (a.distanceKm as number) - (b.distanceKm as number))[0]!
    const closest = insight!.picks.find(pick => pick.kind === 'closest-similar')
    expect(closest?.listing.key).toBe(nearestOther.key)
    // The copies still count as market evidence: only what is offered changes.
    expect(insight!.comparables).toBeGreaterThanOrEqual(copies.length)
  })

  it('reads the copy evidence for the rule and never lets it out', async () => {
    const { subject, copies } = bulevarEspanaCopies()
    const origin = { lat: subject.latitude!, lng: subject.longitude! }
    subjectRow = asSubject(subject)
    peerRows = [...copies, ...pocitosAlternatives().distinct].map(row => asPeer(row, origin))

    const insight = await loadRentalInsight(subject.key)
    // The neighbours' projection carries the seller and the point the rule needs…
    const peerStages = aggregate.mock.calls[1]![0] as Array<Record<string, any>>
    const project = peerStages[peerStages.length - 1]!.$project
    expect(project).toMatchObject({ latitude: 1, longitude: 1, 'offers.sellerName': 1 })
    // …and none of it reaches the answer.
    const text = JSON.stringify(insight)
    for (const seller of ['RE/MAX', 'REMAX UNICO', 'Inmobiliaria'])
      expect(text).not.toContain(seller)
    expect(text).not.toContain('sellerName')
    expect(text).not.toContain('-56.15')
  })
})
