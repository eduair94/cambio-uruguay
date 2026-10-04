import { describe, expect, it, vi } from 'vitest'

vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn(async () => undefined) }))
vi.mock('../../server/models/RentalListing', () => ({ RentalListingModel: { find: vi.fn() } }))
vi.mock('../../server/utils/rentalZones', () => ({ loadRentalZoneSnapshots: vi.fn() }))

const {
  loadRentalBarrio,
  loadIndexableRentalBarrios,
  resolveIndexableBarrioPath,
  startIndexableRentalBarrioPaths,
} = await import('../../server/utils/rentalBarrio')

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

describe('resolveIndexableBarrioPath (el enlace de la ficha)', () => {
  const indexable = () =>
    loadIndexableRentalBarrios({ snapshots: snapshots('2026-10-04T06:00:00Z'), now: () => NOW })

  it('otra grafía del mismo barrio cae en la misma página', async () => {
    expect(await resolveIndexableBarrioPath('Montevideo', 'POCITOS', { barrios: indexable })).toBe(
      '/alquiler/montevideo/pocitos'
    )
    const accented = async () => [{ path: '/alquiler/paysandu/barrio-jardin' }] as any
    expect(
      await resolveIndexableBarrioPath('Paysandú', 'Barrio Jardín', { barrios: accented })
    ).toBe('/alquiler/paysandu/barrio-jardin')
    expect(
      await resolveIndexableBarrioPath('PAYSANDU', 'barrio jardin', { barrios: accented })
    ).toBe('/alquiler/paysandu/barrio-jardin')
  })

  it('un barrio sin página indexable, o sin barrio, no lleva enlace', async () => {
    // Casabó tiene una sola celda: la página existe pero es noindex.
    expect(
      await resolveIndexableBarrioPath('Montevideo', 'Casabó', { barrios: indexable })
    ).toBeNull()
    expect(await resolveIndexableBarrioPath('Montevideo', '', { barrios: indexable })).toBeNull()
    expect(await resolveIndexableBarrioPath(null, 'Pocitos', { barrios: indexable })).toBeNull()
  })

  it('si el snapshot falla o tarda, la ficha sale sin enlace y sin esperar', async () => {
    const failing = async () => {
      throw new Error('mongo down')
    }
    expect(
      await resolveIndexableBarrioPath('Montevideo', 'Pocitos', { barrios: failing })
    ).toBeNull()
    const throwsSync = (() => {
      throw new Error('sync')
    }) as any
    expect(await startIndexableRentalBarrioPaths(throwsSync)).toBeNull()
    const started = Date.now()
    const hanging = () => new Promise<never>(() => undefined)
    expect(
      await resolveIndexableBarrioPath('Montevideo', 'Pocitos', { barrios: hanging, timeoutMs: 30 })
    ).toBeNull()
    expect(Date.now() - started).toBeLessThan(1000)
  })

  it('usa la lista que la ficha arrancó antes (en paralelo con Mongo)', async () => {
    const paths = startIndexableRentalBarrioPaths(indexable)
    expect(await resolveIndexableBarrioPath('Montevideo', 'Pocitos', { paths })).toBe(
      '/alquiler/montevideo/pocitos'
    )
  })
})
