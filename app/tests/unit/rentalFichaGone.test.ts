import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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
// `key: { $ne }`) y las parecidas (`key: { $in }`). El simulacro contesta según la etapa, con o
// sin `.option()` detrás de la collation (las dos de la ficha caída llevan su tope de tiempo).
const option = vi.fn()
const aggregate = vi.fn((stages: Array<Record<string, any>>) => ({
  collation: () => {
    const key = stages[0]?.$match?.key
    const result = Promise.resolve(
      typeof key === 'string'
        ? []
        : key?.$in
          ? pool.filter(row => key.$in.includes(row.key))
          : key?.$ne
            ? pool
            : []
    )
    return Object.assign(result, {
      option: (value: unknown) => {
        option(value)
        return result
      },
    })
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
    { path: '/alquiler/montevideo/cerro', label: 'Cerro' },
    { path: '/alquiler/montevideo/malvin', label: 'Malvín' },
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
// Todos los barrios que conoce el sitio: los del relevamiento de precios (Malvín Norte está, sin
// página indexable) y los 62 del INE (acá sólo Cerro Norte, que hoy no tiene avisos).
const bucket = (neighborhood: string) => ({
  department: 'Montevideo',
  neighborhood,
  propertyType: 'apartamento',
  bedrooms: 'any',
  prices: { rent: { count: 20, mean: 30000, median: 30000, p25: 28000, p75: 32000 } },
})
const zoneSnapshots = {
  market: {
    generatedAt: '2026-11-07T06:00:00Z',
    buckets: ['Pocitos', 'Punta Carretas', 'Cerro', 'Malvín', 'Malvín Norte'].map(bucket),
  },
  context: {
    boundaries: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            zoneId: 'uy-mo-barrio-cerro-norte',
            name: 'Cerro Norte',
            department: 'Montevideo',
            officialCode: 'cerro-norte',
          },
          geometry: { type: 'Polygon', coordinates: [] },
        },
      ],
    },
  },
}
const loadRentalZoneSnapshots = vi.fn(async () => zoneSnapshots)
vi.mock('../../server/utils/rentalZones', () => ({ loadRentalZoneSnapshots }))
const { getRouterParam } = installNitroGlobals()
const setResponseHeader = vi.fn()
const setResponseStatus = vi.fn()
vi.stubGlobal('setResponseHeader', setResponseHeader)
vi.stubGlobal('setResponseStatus', setResponseStatus)
const handler = (await import('../../server/api/rentals/ficha/[key].get')).default
const { knownRentalBarrioPrefixes, startKnownRentalBarrioPrefixes } =
  await import('../../server/utils/rentalGone')
const {
  rentalFichaCacheControl,
  rentalGoneBarrioFromKey,
  rentalGoneFromError,
  rentalGoneDirectoryLink,
  rentalGoneDepartmentFromKey,
} = await import('../../utils/rentalGone')
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
    // Las dos agregaciones de la ficha caída (evidencia y parecidas) llevan su tope de tiempo.
    expect(option.mock.calls).toEqual([[{ maxTimeMS: 3000 }], [{ maxTimeMS: 3000 }]])
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
    route('montevideo-cerro-grecia-gone')
    expect(((await handler(event)) as any).data.barrioLink).toEqual({
      path: '/alquiler/montevideo/cerro',
      label: 'Cerro',
    })
  })

  it('never sends a pruned sub-barrio to its parent: Cerro Norte and Malvín Norte are other barrios', async () => {
    // Cerro Norte es un barrio del INE sin avisos hoy; Malvín Norte está en el relevamiento de
    // precios pero sin página indexable. Ninguno es "Cerro" ni "Malvín": queda el departamento.
    for (const key of [
      'montevideo-cerro-norte-grecia-gone',
      'montevideo-malvin-norte-hipica-gone',
    ]) {
      route(key)
      const body = (await handler(event)) as any
      expect(body.data.gone, key).toMatchObject({ department: 'Montevideo', neighborhood: null })
      expect(body.data.barrioLink, key).toBeNull()
    }
  })

  it('falls back to the department when the key names no indexable barrio', async () => {
    route('montevideo-apartamento-gone')
    const body = (await handler(event)) as any
    expect(body.data.gone.department).toBe('Montevideo')
    expect(body.data.barrioLink).toBeNull()
    route('treinta-y-tres-centro-gone')
    expect(((await handler(event)) as any).data.gone.department).toBe('Treinta y Tres')
    // Sin departamento reconocible, un 404 sin alternativas, que el borde guarda poco.
    loadRentalZoneSnapshots.mockClear()
    route('uy-gone')
    const bare = (await handler(event)) as any
    expect(bare.statusCode).toBe(404)
    expect(bare.data).toBeUndefined()
    expect(setResponseHeader).toHaveBeenLastCalledWith(
      event,
      'cache-control',
      'public, max-age=0, s-maxage=30'
    )
    // Una clave sin departamento no puede nombrar un barrio: ni se buscan.
    expect(loadRentalZoneSnapshots).not.toHaveBeenCalled()
  })

  it('gives an invalid key a 404 without touching Mongo', async () => {
    route('NULL')
    const body = (await handler(event)) as any
    expect(body).toMatchObject({ statusCode: 404 })
    expect(body.data).toBeUndefined()
    expect(connectDb).not.toHaveBeenCalled()
    expect(findOne).not.toHaveBeenCalled()
    expect(setResponseStatus).toHaveBeenCalledWith(event, 404, 'Rental property is not available')
    expect(setResponseHeader).toHaveBeenCalledWith(
      event,
      'cache-control',
      'public, max-age=0, s-maxage=30'
    )
  })

  it('still answers an honest 404 when the alternatives cannot be read, cached briefly', async () => {
    findOneFailure = new Error('mongo stalled')
    route('montevideo-pocitos-bulevar-espana-gone')
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      const body = (await handler(event)) as any
      expect(body.statusCode).toBe(404)
      expect(body.data).toBeUndefined()
      // A transient stall must not leave the dead end at the edge for five minutes.
      expect(setResponseHeader).toHaveBeenCalledWith(
        event,
        'cache-control',
        'public, max-age=0, s-maxage=30'
      )
      expect(setResponseHeader).not.toHaveBeenCalledWith(
        event,
        'cache-control',
        'public, max-age=0, s-maxage=300'
      )
    } finally {
      log.mockRestore()
    }
  })
})

describe('the known barrios behind a pruned key', () => {
  it('lists every barrio of the price survey and the INE names, as key prefixes', () => {
    const prefixes = knownRentalBarrioPrefixes(zoneSnapshots as never)
    expect(prefixes).toEqual(
      expect.arrayContaining([
        'montevideo-pocitos',
        'montevideo-cerro',
        'montevideo-malvin-norte',
        'montevideo-cerro-norte',
      ])
    )
  })

  it('never rejects: a failing snapshot read means "unknown"', async () => {
    expect(await startKnownRentalBarrioPrefixes(() => Promise.reject(new Error('down')))).toBeNull()
    expect(
      await startKnownRentalBarrioPrefixes(() => {
        throw new Error('sync')
      })
    ).toBeNull()
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

  it('links the longest known barrio only when that one has its own page', () => {
    const pages = [...links.values()]
    const known = ['montevideo-cerro', 'montevideo-cerro-norte', 'montevideo-pocitos']
    expect(rentalGoneBarrioFromKey('montevideo-cerro-norte-grecia-gone', pages, known)).toBeNull()
    expect(rentalGoneBarrioFromKey('montevideo-cerro-grecia-gone', pages, known)).toMatchObject({
      path: '/alquiler/montevideo/cerro',
      department: 'Montevideo',
    })
    // A prefix has to end at a word: "pocitos" is not the start of "pocitosnuevo".
    expect(
      rentalGoneBarrioFromKey('montevideo-pocitosnuevo-gone', pages, ['montevideo-pocitosnuevo'])
    ).toBeNull()
    // Without the known list (its read failed), the longest page still wins, as before.
    expect(rentalGoneBarrioFromKey('montevideo-cerro-norte-grecia-gone', pages)?.label).toBe(
      'Cerro'
    )
  })
})

describe('the ficha document cache-control', () => {
  it('caches a live ficha a minute, a gone one with alternatives five, a bare one thirty seconds', () => {
    expect(rentalFichaCacheControl({ failed: false, status: 503, alternatives: false })).toBe(
      'public, max-age=0, must-revalidate, s-maxage=60'
    )
    expect(rentalFichaCacheControl({ failed: true, status: 404, alternatives: true })).toBe(
      'public, max-age=0, must-revalidate, s-maxage=300'
    )
    expect(rentalFichaCacheControl({ failed: true, status: 404, alternatives: false })).toBe(
      'public, max-age=0, must-revalidate, s-maxage=30'
    )
  })

  it('never caches a 503, and every cached HTML answer revalidates', () => {
    for (const alternatives of [true, false])
      expect(rentalFichaCacheControl({ failed: true, status: 503, alternatives })).toBe(
        'no-store, max-age=0'
      )
    for (const status of [404, 503] as const)
      for (const failed of [true, false])
        for (const alternatives of [true, false]) {
          const value = rentalFichaCacheControl({ failed, status, alternatives })
          if (value.includes('s-maxage')) expect(value).toContain('must-revalidate')
        }
  })

  it('is what the page sends, decided after the gone data is read', () => {
    const page = readFileSync(resolve(__dirname, '../../pages/alquileres/[key].vue'), 'utf8')
    expect(page).toContain('rentalFichaCacheControl({')
    expect(page.indexOf('const gone = computed(')).toBeLessThan(
      page.indexOf('rentalFichaCacheControl({')
    )
  })
})

describe('the gone page order', () => {
  it('shows the same home still listed first, then the next steps, then the similar homes', () => {
    const page = readFileSync(resolve(__dirname, '../../pages/alquileres/[key].vue'), 'utf8')
    const at = (text: string) => {
      const index = page.indexOf(text)
      expect(index, text).toBeGreaterThan(-1)
      return index
    }
    const seen = at("t('goneLastSeen'")
    const copy = at('data-testid="rental-gone-copy"')
    const links = at('class="rental-page__gone-links"')
    const similar = at("t('goneSimilarTitle')")
    expect(seen).toBeLessThan(copy)
    // On a phone the three buttons wrap onto two or three rows: after them, the copy fell below
    // the fold.
    expect(copy).toBeLessThan(links)
    expect(links).toBeLessThan(similar)
  })
})
