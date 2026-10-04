import { describe, expect, it, vi } from 'vitest'

vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn(async () => undefined) }))
vi.mock('../../server/models/RentalListing', () => ({ RentalListingModel: { find: vi.fn() } }))
vi.mock('../../server/utils/rentalZones', () => ({ loadRentalZoneSnapshots: vi.fn() }))

const { loadRentalBarrio, loadIndexableRentalBarrios } =
  await import('../../server/utils/rentalBarrio')

const NOW = Date.parse('2026-10-04T12:00:00Z')
const dist = (median: number | null) => ({
  count: 20,
  mean: median,
  median,
  p25: median,
  p75: median,
})
const prices = (median: number | null) => ({
  rent: dist(median),
  commonExpenses: dist(null),
  monthlyTotal: dist(null),
  builtSquareMeter: dist(null),
  sources: 2,
  lastSeenFrom: null,
  lastSeenTo: null,
})
const snapshots = (generatedAt: string) => async () =>
  ({
    market: {
      generatedAt,
      rentalDataAsOf: generatedAt,
      buckets: [
        {
          department: 'Montevideo',
          neighborhood: 'Pocitos',
          propertyType: 'apartamento',
          bedrooms: 'any',
          prices: prices(32000),
        },
        {
          department: 'Montevideo',
          neighborhood: 'Pocitos',
          propertyType: 'apartamento',
          bedrooms: '2',
          prices: prices(36000),
        },
        {
          department: 'Montevideo',
          neighborhood: 'Casabó',
          propertyType: 'casa',
          bedrooms: 'any',
          prices: prices(15000),
        },
      ],
    },
    context: null,
  }) as any

describe('loadRentalBarrio', () => {
  it('agrega avisos y el enlace al directorio', async () => {
    const listings = vi.fn(async () => [
      {
        key: 'montevideo-pocitos-x',
        title: 'Apto 2 dorm',
        propertyType: 'apartamento',
        bedrooms: 2,
        price: 35000,
        currency: 'UYU' as const,
        area: 60,
      },
    ])
    const page = await loadRentalBarrio('montevideo', 'pocitos', {
      snapshots: snapshots('2026-10-04T06:00:00Z'),
      listings,
      now: () => NOW,
    })
    expect(page!.listings).toHaveLength(1)
    expect(listings).toHaveBeenCalledWith('Montevideo', 'Pocitos')
    expect(page!.directoryPath).toBe(
      '/alquileres-uruguay?department=Montevideo&neighborhood=Pocitos'
    )
    expect(page!.indexable).toBe(true)
  })

  it('si los avisos fallan, la página sale igual sin avisos', async () => {
    const page = await loadRentalBarrio('montevideo', 'pocitos', {
      snapshots: snapshots('2026-10-04T06:00:00Z'),
      listings: async () => {
        throw new Error('timeout')
      },
      now: () => NOW,
    })
    expect(page!.listings).toEqual([])
  })

  it('barrio desconocido devuelve null; snapshot caído propaga el error', async () => {
    expect(
      await loadRentalBarrio('montevideo', 'atlantida', {
        snapshots: snapshots('2026-10-04T06:00:00Z'),
        listings: async () => [],
        now: () => NOW,
      })
    ).toBeNull()
    await expect(
      loadRentalBarrio('montevideo', 'pocitos', {
        snapshots: async () => {
          throw new Error('503')
        },
        listings: async () => [],
        now: () => NOW,
      })
    ).rejects.toThrow('503')
  })
})

describe('loadIndexableRentalBarrios', () => {
  it('sólo barrios con dos celdas y snapshot fresco', async () => {
    const fresh = await loadIndexableRentalBarrios({
      snapshots: snapshots('2026-10-04T06:00:00Z'),
      now: () => NOW,
    })
    expect(fresh.map(item => item.path)).toEqual(['/alquiler/montevideo/pocitos'])
    const stale = await loadIndexableRentalBarrios({
      snapshots: snapshots('2026-09-20T06:00:00Z'),
      now: () => NOW,
    })
    expect(stale).toEqual([])
  })
})
