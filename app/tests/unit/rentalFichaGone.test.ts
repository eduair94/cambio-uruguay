import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'
import { bulevarEspanaCopies, pocitosAlternatives } from './helpers/rentalCopies'
import type { RentalPublicProperty } from '../../utils/rentals'

// La ficha que ya no está (rentals-voice-02): sigue siendo 404, pero lleva las parecidas que siguen
// publicadas, la propia vivienda si sigue en otro portal y la página de su barrio. Los modelos van
// simulados; las reglas de parecidas y copias son las reales (server/utils/rentalPage.ts).
const connectDb = vi.fn()
let staleDoc: Record<string, unknown> | null = null
let findOneFailure: Error | null = null
const findOneQuery = {
  select: vi.fn(() => findOneQuery),
  maxTimeMS: vi.fn(() => findOneQuery),
  lean: vi.fn(async () => {
    if (findOneFailure) throw findOneFailure
    return staleDoc
  }),
}
const findOne = vi.fn(() => findOneQuery)
let pool: RentalPublicProperty[] = []
// Una sola colección, tres lecturas: la ficha (por clave exacta), la evidencia (mismo barrio,
// `key: { $ne }`) y las parecidas (`key: { $in }`). El simulacro contesta según la etapa.
const aggregate = vi.fn((stages: Array<Record<string, any>>) => ({
  collation: async () => {
    const key = stages[0]?.$match?.key
    if (typeof key === 'string') return []
    if (key?.$in) return pool.filter(row => key.$in.includes(row.key))
    if (key?.$ne) return pool
    return []
  },
}))
vi.mock('../../server/utils/db', () => ({ connectDb }))
vi.mock('../../server/models/RentalMeta', () => ({
  RentalMetaModel: {
    findOne: () => ({ select: () => ({ lean: async () => ({ usdUyu: 40 }) }) }),
  },
}))
vi.mock('../../server/models/RentalListing', () => ({
  RentalListingModel: { aggregate, findOne },
}))
vi.mock('../../server/utils/rentalAvailability', () => ({
  loadRentalAvailabilityIndex: async () => ({}),
  annotateRentalAvailability: (property: object) => ({ ...property, availability: 'annotated' }),
}))
vi.mock('../../server/utils/rentalIndexAllowlist', () => ({
  loadRentalIndexAllowlist: () => Promise.resolve(null),
}))
const links = new Map(
  [
    { path: '/alquiler/montevideo/pocitos', label: 'Pocitos' },
    { path: '/alquiler/montevideo/punta', label: 'Punta' },
    { path: '/alquiler/montevideo/punta-carretas', label: 'Punta Carretas' },
    { path: '/alquiler/canelones/ciudad-de-la-costa', label: 'Ciudad de la Costa' },
  ].map(link => [link.path, link])
)
const resolveIndexableBarrioLink = vi.fn(async (_department: string, neighborhood: string) =>
  neighborhood.toLowerCase() === 'pocitos' ? links.get('/alquiler/montevideo/pocitos')! : null
)
vi.mock('../../server/utils/rentalBarrio', () => ({
  RENTAL_BARRIO_LINK_TIMEOUT_MS: 1500,
  startIndexableRentalBarrioLinks: () => Promise.resolve(links),
  resolveIndexableBarrioLink,
}))
const { getRouterParam } = installNitroGlobals()
const setResponseHeader = vi.fn()
const setResponseStatus = vi.fn()
vi.stubGlobal('setResponseHeader', setResponseHeader)
vi.stubGlobal('setResponseStatus', setResponseStatus)
const handler = (await import('../../server/api/rentals/ficha/[key].get')).default
const { rentalGoneFromError, rentalGoneDirectoryLink, rentalGoneDepartmentFromKey } =
  await import('../../utils/rentalGone')
const { rentalLookalikeFacts, rentalLookalikes } = await import('../../utils/rentalLookalike')

const event = {} as never
const route = (slug: string) => getRouterParam.mockReturnValue(slug)
/** The stale row as Mongo keeps it, projected the way the endpoint reads it. */
function storedRow(property: RentalPublicProperty, lastSeen = '2026-10-20') {
  return {
    key: property.key,
    title: property.title,
    department: property.department,
    neighborhood: property.neighborhood,
    propertyType: property.propertyType,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    area: property.area,
    price: property.price,
    currency: property.currency,
    priceUyu: property.priceUyu,
    latitude: property.latitude,
    longitude: property.longitude,
    lastSeen,
    offers: property.offers.map(offer => ({ ...offer, lastSeen })),
  }
}

describe('the gone ficha API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    connectDb.mockReset().mockResolvedValue(undefined)
    staleDoc = null
    findOneFailure = null
    pool = []
  })

  it('answers a stale row with a cacheable 404 that carries the alternatives', async () => {
    const { subject, copies } = bulevarEspanaCopies()
    const { twice, distinct } = pocitosAlternatives()
    staleDoc = storedRow(subject)
    pool = [...copies, ...twice, ...distinct]
    route(subject.key)
    const body = (await handler(event)) as any
    expect(setResponseStatus).toHaveBeenCalledWith(event, 404, 'Rental property is not available')
    expect(setResponseHeader).toHaveBeenCalledWith(
      event,
      'cache-control',
      'public, max-age=0, s-maxage=300'
    )
    expect(body).toMatchObject({ error: true, statusCode: 404 })
    expect(body.data.gone).toEqual({
      department: 'Montevideo',
      neighborhood: 'Pocitos',
      propertyType: 'apartamento',
      bedrooms: 2,
      lastSeen: '2026-10-20',
    })
    expect(body.data.barrioLink).toEqual({ path: '/alquiler/montevideo/pocitos', label: 'Pocitos' })
    // Seis viviendas distintas, ninguna copia de la que se fue; la copia viva va aparte.
    const similar = body.data.similar as RentalPublicProperty[]
    expect(similar.length).toBeLessThanOrEqual(6)
    expect(similar).toHaveLength(6)
    expect(new Set(similar.map(row => row.key)).size).toBe(6)
    const gone = rentalLookalikeFacts(subject)
    for (const row of similar) expect(rentalLookalikes(gone, rentalLookalikeFacts(row))).toBe(false)
    expect(body.data.lookalike.key).toBe('bulevar-espana-infocasas')
    // Las filas vivas salen como las de una ficha viva: anunciantes públicos y disponibilidad.
    expect(body.data.lookalike.availability).toBe('annotated')
    expect(similar.every(row => (row as any).availability === 'annotated')).toBe(true)
    // La fila vieja nunca sale entera.
    expect(JSON.stringify(body.data.gone)).not.toContain('sellerName')
    expect(findOne).toHaveBeenCalledWith({ key: subject.key })
  })

  it('links a pruned key to its indexable barrio, the longest matching prefix', async () => {
    route('montevideo-punta-carretas-ellauri-gone')
    const body = (await handler(event)) as any
    expect(body.statusCode).toBe(404)
    expect(body.data).toEqual({
      gone: {
        department: 'Montevideo',
        neighborhood: 'Punta Carretas',
        propertyType: null,
        bedrooms: null,
        lastSeen: null,
      },
      lookalike: null,
      similar: [],
      barrioLink: { path: '/alquiler/montevideo/punta-carretas', label: 'Punta Carretas' },
    })
    // Sin fila no hay parecidas que calcular.
    expect(aggregate).toHaveBeenCalledTimes(1)
  })

  it('falls back to the department when the key names no indexable barrio', async () => {
    route('montevideo-apartamento-gone')
    const body = (await handler(event)) as any
    expect(body.data.gone.department).toBe('Montevideo')
    expect(body.data.barrioLink).toBeNull()
    route('treinta-y-tres-centro-gone')
    expect(((await handler(event)) as any).data.gone.department).toBe('Treinta y Tres')
    // Sin departamento reconocible, un 404 sin alternativas.
    route('uy-gone')
    const bare = (await handler(event)) as any
    expect(bare.statusCode).toBe(404)
    expect(bare.data).toBeUndefined()
  })

  it('gives an invalid key a 404 without touching Mongo', async () => {
    route('NULL')
    const body = (await handler(event)) as any
    expect(body).toMatchObject({ statusCode: 404 })
    expect(body.data).toBeUndefined()
    expect(connectDb).not.toHaveBeenCalled()
    expect(findOne).not.toHaveBeenCalled()
    expect(setResponseStatus).toHaveBeenCalledWith(event, 404, 'Rental property is not available')
  })

  it('still answers an honest 404 when the alternatives cannot be read', async () => {
    findOneFailure = new Error('mongo stalled')
    route('montevideo-pocitos-bulevar-espana-gone')
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      const body = (await handler(event)) as any
      expect(body.statusCode).toBe(404)
      expect(body.data).toBeUndefined()
    } finally {
      log.mockRestore()
    }
  })
})

describe('rentalGoneFromError', () => {
  const data = {
    gone: {
      department: 'Montevideo',
      neighborhood: 'Pocitos',
      propertyType: 'apartamento',
      bedrooms: 2,
      lastSeen: '2026-10-20',
    },
    lookalike: bulevarEspanaCopies().copies[2],
    similar: Array.from({ length: 8 }, (_, index) => ({
      ...pocitosAlternatives().distinct[0]!,
      key: `pocitos-${'abcdefgh'[index]}`,
    })),
    barrioLink: { path: '/alquiler/montevideo/pocitos', label: 'Pocitos' },
  }

  it('reads a createError with the data on it and a $fetch error with the 404 body on it', () => {
    const direct = rentalGoneFromError({ statusCode: 404, data })
    const fetched = rentalGoneFromError({
      statusCode: 404,
      data: { error: true, statusCode: 404, statusMessage: 'gone', data },
    })
    for (const result of [direct, fetched]) {
      expect(result?.gone).toEqual(data.gone)
      expect(result?.lookalike?.key).toBe('bulevar-espana-infocasas')
      expect(result?.similar).toHaveLength(6)
      expect(result?.barrioLink).toEqual(data.barrioLink)
    }
  })

  it('is null for a plain 404, a 503 or anything else, and drops what is not a public link', () => {
    expect(rentalGoneFromError({ statusCode: 404 })).toBeNull()
    expect(rentalGoneFromError({ statusCode: 503, data: { statusCode: 503 } })).toBeNull()
    expect(rentalGoneFromError(null)).toBeNull()
    expect(rentalGoneFromError('gone')).toBeNull()
    const odd = rentalGoneFromError({
      data: {
        ...data,
        gone: { ...data.gone, bedrooms: 'dos', lastSeen: 'ayer', propertyType: 'castillo' },
        barrioLink: { path: 'https://example.com/alquiler/montevideo/pocitos', label: 'Pocitos' },
        lookalike: { key: 'no-offers' },
      },
    })
    expect(odd?.gone).toMatchObject({ bedrooms: null, lastSeen: null, propertyType: null })
    expect(odd?.barrioLink).toBeNull()
    expect(odd?.lookalike).toBeNull()
  })
})

describe('the gone page links', () => {
  it('sends to the directory with the same type and bedrooms, the barrio only with its page', () => {
    const gone = {
      department: 'Montevideo',
      neighborhood: 'POCITOS',
      propertyType: 'apartamento' as const,
      bedrooms: 2,
      lastSeen: '2026-10-20',
    }
    const barrio = { path: '/alquiler/montevideo/pocitos', label: 'Pocitos' }
    expect(rentalGoneDirectoryLink(gone, barrio)).toEqual({
      path: '/alquileres-uruguay?department=Montevideo&neighborhood=Pocitos&type=apartamento&bedrooms=2&bedroomsExact=1',
      label: 'Pocitos',
    })
    // Sin página del barrio no se escribe la grafía cruda del aviso: se ofrece el departamento.
    expect(rentalGoneDirectoryLink(gone, null)).toEqual({
      path: '/alquileres-uruguay?department=Montevideo&type=apartamento&bedrooms=2&bedroomsExact=1',
      label: 'Montevideo',
    })
    expect(
      rentalGoneDirectoryLink({ ...gone, bedrooms: 0, propertyType: null }, barrio)?.path
    ).toBe('/alquileres-uruguay?department=Montevideo&neighborhood=Pocitos&bedrooms=0')
    expect(rentalGoneDirectoryLink({ ...gone, bedrooms: 5 }, null)?.path).toContain('bedrooms=4')
    expect(rentalGoneDirectoryLink({ ...gone, department: null }, barrio)).toBeNull()
  })

  it('reads the department from any key, hyphenated names included', () => {
    expect(rentalGoneDepartmentFromKey('san-jose-libertad-gone')).toBe('San José')
    expect(rentalGoneDepartmentFromKey('rio-negro-fray-bentos-gone')).toBe('Río Negro')
    expect(rentalGoneDepartmentFromKey('rivera-centro-gone')).toBe('Rivera')
    expect(rentalGoneDepartmentFromKey('uy-gone')).toBeNull()
  })
})
