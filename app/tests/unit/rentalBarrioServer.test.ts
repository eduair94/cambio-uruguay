import { describe, expect, it, vi } from 'vitest'

vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn(async () => undefined) }))
vi.mock('../../server/models/RentalListing', () => ({ RentalListingModel: { find: vi.fn() } }))
vi.mock('../../server/utils/rentalZones', () => ({ loadRentalZoneSnapshots: vi.fn() }))
vi.mock('../../server/utils/rentalIndexAllowlist', () => ({
  loadRentalIndexAllowlist: vi.fn(async () => null),
}))

const {
  RENTAL_BARRIO_LISTINGS,
  RENTAL_BARRIO_LISTINGS_HINT,
  latestRentalBarrioListings,
  loadRentalBarrio,
  loadIndexableRentalBarrios,
  pickRentalBarrioListings,
  rentalBarrioNeighborhoodSpellings,
  resolveIndexableBarrioLink,
  startIndexableRentalBarrioLinks,
} = await import('../../server/utils/rentalBarrio')
const { RentalListingModel } = await import('../../server/models/RentalListing')
const { loadRentalIndexAllowlist } = await import('../../server/utils/rentalIndexAllowlist')

const NOW = Date.parse('2026-10-04T12:00:00Z')
/** A fresh, complete Search Console list (`rentalIndexHygiene.ts`) naming these fichas only. */
const allowlistOf = (...paths: string[]) => ({
  asOf: '2026-10-03',
  windowDays: 56,
  minImpressions: 5,
  paths: new Set(paths),
})
/** A stored property as the barrio query projects it: one current InfoCasas advert. */
const listingRow = (
  key: string,
  over: Record<string, unknown> = {},
  advert: Record<string, unknown> = {}
) => ({
  key,
  title: 'Apartamento 2 dormitorios en Pocitos',
  propertyType: 'apartamento',
  department: 'Montevideo',
  neighborhood: 'Pocitos',
  // A street without a door number: rows that only share it are not one home (see the fold test).
  address: 'Bulevar España',
  bedrooms: 2,
  bathrooms: 1,
  area: 60,
  firstSeen: '2026-09-28',
  offers: [
    {
      source: 'infocasas',
      listingId: `ic-${key}`,
      url: `https://www.infocasas.com.uy/${key}`,
      title: 'Apartamento 2 dormitorios en Pocitos',
      image: `https://cdn.infocasas.com.uy/${key}.jpg`,
      price: 42000,
      currency: 'UYU',
      priceUyu: 42000,
      commonExpenses: 13400,
      commonExpensesCurrency: 'UYU',
      lastSeen: '2026-10-03',
      ...advert,
    },
  ],
  ...over,
})
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
        image: 'https://cdn.infocasas.com.uy/x.jpg',
        commonExpenses: 9000,
        commonExpensesCurrency: 'UYU' as const,
        totalUyu: 44000,
      },
    ])
    const page = await loadRentalBarrio('montevideo', 'pocitos', {
      snapshots: snapshots('2026-10-04T06:00:00Z'),
      listings,
      now: () => NOW,
    })
    expect(page!.listings).toHaveLength(1)
    expect(listings).toHaveBeenCalledWith('Montevideo', ['Pocitos'])
    // The spellings steer the server query; the public JSON does not carry them.
    expect(page).not.toHaveProperty('spellings')
    expect(page!.nameShared).toBe(false)
    expect(page!.directoryPath).toBe(
      '/alquileres-uruguay?department=Montevideo&neighborhood=Pocitos'
    )
    expect(page!.indexable).toBe(true)
  })

  it('si los avisos fallan, la página sale igual sin avisos y queda el rastro en el log', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    try {
      const page = await loadRentalBarrio('montevideo', 'pocitos', {
        snapshots: snapshots('2026-10-04T06:00:00Z'),
        listings: async () => {
          throw new Error('timeout')
        },
        now: () => NOW,
      })
      expect(page!.listings).toEqual([])
      expect(warn).toHaveBeenCalledWith('[rental-barrio] listings failed', expect.any(Error))
    } finally {
      warn.mockRestore()
    }
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

describe('latestRentalBarrioListings (la consulta de avisos)', () => {
  const chainFor = (rows: unknown[]) => {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {}
    for (const step of ['sort', 'hint', 'limit', 'select', 'maxTimeMS', 'collation'])
      chain[step] = vi.fn(() => chain)
    chain.lean = vi.fn(async () => rows)
    return chain
  }

  it('usa el índice {department, neighborhood}: grafías exactas, sin collation, sólo viviendas', async () => {
    const chain = chainFor([
      listingRow(
        'pocitos-a',
        {},
        { details: { description: 'Luminoso, al frente y con balcón.' } }
      ),
      // Facebook without gastos comunes: its ficha is `noindex` (missing_known_monthly_cost).
      listingRow(
        'montevideo-apartamento-13eecmn',
        {},
        { commonExpenses: null, source: 'facebook' }
      ),
      { key: 'sin-avisos', title: 'x', price: 35000 },
    ])
    const find = vi.mocked(RentalListingModel.find).mockReturnValue(chain as any)
    const rows = await latestRentalBarrioListings('Montevideo', ['POCITOS', 'Pocitos'], NOW)

    expect(find).toHaveBeenCalledTimes(1)
    const filter = find.mock.calls[0]![0] as Record<string, any>
    expect(Object.keys(filter).sort()).toEqual([
      'department',
      'lastSeen',
      'neighborhood',
      'propertyType',
    ])
    expect(filter.department).toBe('Montevideo')
    expect(filter.neighborhood.$in).toEqual(
      expect.arrayContaining(['POCITOS', 'Pocitos', 'pocitos'])
    )
    expect(filter.propertyType).toEqual({ $in: ['apartamento', 'casa'] })
    // The same cutoff `buildRentalFilter` applies: RENTAL_STALE_DAYS (10) before now, as a day.
    expect(filter.lastSeen).toEqual({ $gte: '2026-09-24' })
    expect(chain.collation).not.toHaveBeenCalled()
    // `lastSeen` is a day shared by thousands of rows: the key used to pick the cards.
    expect(chain.sort).toHaveBeenCalledWith({ freshAt: -1, key: 1 })
    // That sort matches an index of its own; the barrio's index keeps the scan to the barrio.
    expect(chain.hint).toHaveBeenCalledWith(RENTAL_BARRIO_LISTINGS_HINT)
    expect(chain.limit).toHaveBeenCalledWith(80)
    expect(chain.maxTimeMS).toHaveBeenCalledWith(3000)
    const projection = chain.select!.mock.calls[0]![0] as Record<string, number>
    for (const field of [
      'offers.image',
      'offers.commonExpenses',
      'offers.currency',
      'offers.url',
      'offers.furnished',
      'offers.parkingSpaces',
      'firstSeen',
    ])
      expect(projection[field]).toBe(1)
    // The ficha's verdict reads the advert's description; nothing else of `details`, and no
    // gallery, seller or contact data.
    expect(Object.keys(projection).filter(field => /details/.test(field))).toEqual([
      'offers.details.description',
    ])
    expect(Object.keys(projection).some(field => /seller|contact|phone|images/i.test(field))).toBe(
      false
    )
    expect(rows.map(row => row.key)).toEqual(['pocitos-a'])
    expect(rows[0]).toEqual({
      key: 'pocitos-a',
      title: 'Apartamento 2 dormitorios en Pocitos',
      propertyType: 'apartamento',
      bedrooms: 2,
      price: 42000,
      currency: 'UYU',
      area: 60,
      image: 'https://cdn.infocasas.com.uy/pocitos-a.jpg',
      commonExpenses: 13400,
      commonExpensesCurrency: 'UYU',
      totalUyu: 55400,
    })
    // The description was read for the verdict and stays here.
    expect(JSON.stringify(rows)).not.toContain('balcón')
  })

  it('aplica la higiene del índice de la ficha con la lista que lee la ficha', async () => {
    const old = { firstSeen: '2026-07-01' }
    const chain = chainFor([
      listingRow('vieja-sin-demanda', old),
      listingRow('vieja-con-demanda', old),
      listingRow('joven'),
    ])
    vi.mocked(RentalListingModel.find)
      .mockReset()
      .mockReturnValue(chain as any)
    const allowlist = vi
      .mocked(loadRentalIndexAllowlist)
      .mockResolvedValueOnce(allowlistOf('/alquileres/vieja-con-demanda'))
    const rows = await latestRentalBarrioListings('Montevideo', ['Pocitos'], NOW)
    expect(allowlist).toHaveBeenCalled()
    // More than 8 weeks old and unseen by Search Console: its ficha is `noindex, follow`.
    expect(rows.map(row => row.key)).toEqual(['vieja-con-demanda', 'joven'])
  })

  it('declara en el esquema el índice que fuerza', async () => {
    // A hint naming an index Mongo does not have fails the query, and the cards vanish in silence.
    const { RentalListingModel: real } = await vi.importActual<
      typeof import('../../server/models/RentalListing')
    >('../../server/models/RentalListing')
    expect(real.schema.indexes().map(([fields]) => fields)).toContainEqual({
      ...RENTAL_BARRIO_LISTINGS_HINT,
    })
  })

  it('el departamento va en su grafía canónica; sin grafías no consulta', async () => {
    const chain = chainFor([])
    const find = vi
      .mocked(RentalListingModel.find)
      .mockReset()
      .mockReturnValue(chain as any)
    await latestRentalBarrioListings('PAYSANDU', ['Barrio Jardín'], NOW)
    expect((find.mock.calls[0]![0] as Record<string, unknown>).department).toBe('Paysandú')
    find.mockClear()
    expect(await latestRentalBarrioListings('Montevideo', [], NOW)).toEqual([])
    expect(find).not.toHaveBeenCalled()
  })

  it('las variantes de grafía son del mismo barrio y nada más', () => {
    const spellings = rentalBarrioNeighborhoodSpellings(['MALVÍN NORTE', 'Malvín Norte'])
    expect(spellings).toEqual(
      expect.arrayContaining([
        'MALVÍN NORTE',
        'MALVIN NORTE',
        'Malvín Norte',
        'Malvin Norte',
        'malvín norte',
        'malvin norte',
      ])
    )
    const fold = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    expect(new Set(spellings.map(fold))).toEqual(new Set(['malvin norte']))
  })
})

describe('pickRentalBarrioListings (las tarjetas de "Avisos recientes")', () => {
  it('only lists fichas that pass their own quality gate, in the order the query read them', () => {
    const rows = [
      listingRow('con-todo'),
      listingRow('sin-gastos', {}, { commonExpenses: null, commonExpensesCurrency: null }),
      listingRow('sin-foto', {}, { image: null }),
      listingRow('sin-dormitorios', { bedrooms: null }),
      listingRow('pocos-datos', { bathrooms: null, area: null }),
      listingRow('aviso-vencido', {}, { lastSeen: '2026-09-01' }),
      listingRow('sin-calle', { address: '' }),
      listingRow('temporada', { title: 'Alquiler de temporada en Pocitos frente al mar' }),
      listingRow('sin-gastos-cero', {}, { commonExpenses: 0, commonExpensesCurrency: null }),
    ]
    const cards = pickRentalBarrioListings(rows, NOW)
    expect(cards.map(card => card.key)).toEqual(['con-todo', 'sin-gastos-cero'])
    // Zero gastos comunes is a published amount: the total is the rent.
    expect(cards[1]).toMatchObject({ commonExpenses: 0, totalUyu: 42000 })
  })

  it('prices each card with ONE advert, the cheapest one whose costs add up', () => {
    // The cheapest advert of the property says nothing about gastos comunes.
    const facebook = listingRow(
      'dos-avisos',
      {},
      {
        source: 'facebook',
        listingId: 'fb-dos-avisos',
        url: 'https://www.facebook.com/marketplace/item/1',
        image: 'https://scontent.xx.fbcdn.net/1.jpg',
        price: 38000,
        priceUyu: 38000,
        commonExpenses: null,
        commonExpensesCurrency: null,
      }
    ).offers[0]!
    const row = listingRow('dos-avisos')
    row.offers.unshift(facebook)
    const [card] = pickRentalBarrioListings([row], NOW)
    expect(card).toMatchObject({ price: 42000, commonExpenses: 13400, totalUyu: 55400 })
    // The photo comes from the same advert first.
    expect(card!.image).toBe('https://cdn.infocasas.com.uy/dos-avisos.jpg')
  })

  it('adds a dollar rent and peso gastos comunes in pesos', () => {
    const [card] = pickRentalBarrioListings(
      [
        listingRow(
          'dolares',
          {},
          { price: 1200, currency: 'USD', priceUyu: 49860, commonExpenses: 8000 }
        ),
      ],
      NOW
    )
    expect(card).toMatchObject({
      price: 1200,
      currency: 'USD',
      commonExpenses: 8000,
      totalUyu: 57860,
    })
  })

  it(`shows at most ${RENTAL_BARRIO_LISTINGS}`, () => {
    const rows = Array.from({ length: 12 }, (_, index) =>
      listingRow(`vivienda-${'abcdefghijkl'[index]}`)
    )
    expect(pickRentalBarrioListings(rows, NOW)).toHaveLength(RENTAL_BARRIO_LISTINGS)
  })

  it('reads the advert description the way the ficha does', () => {
    const prose = (text: string) => ({ details: { description: text } })
    const long =
      'Apartamento luminoso con living comedor amplio, cocina integrada, balcón al frente y ' +
      'calefacción central. Edificio con portería, a dos cuadras de la rambla y cerca de todo.'
    expect(long.length).toBeGreaterThanOrEqual(160)
    const cards = pickRentalBarrioListings(
      [
        // The advert says three bedrooms where the ficha says two: `conflicting_bedrooms`, noindex.
        listingRow('dice-tres', {}, prose('Hermoso apartamento de 3 dormitorios, muy luminoso.')),
        // No street, but a source description long enough to say something: the ficha is indexable.
        listingRow('sin-calle-con-texto', { address: '' }, prose(long)),
        listingRow('sin-calle-sin-texto', { address: '' }, prose('Muy lindo.')),
      ],
      NOW
    )
    expect(cards.map(card => card.key)).toEqual(['sin-calle-con-texto'])
  })

  it('counts furniture and parking from the current adverts, as the public pipeline does', () => {
    // Two attributes besides the bedrooms: one short of the three the ficha asks for, unless an
    // advert seen today adds them. What the property stores from older adverts does not count.
    const sparse = { bathrooms: null, area: null }
    const cards = pickRentalBarrioListings(
      [
        listingRow('guardado', { ...sparse, parkingSpaces: 1, furnished: true }),
        listingRow('declarado', sparse, { parkingSpaces: 1, furnished: true }),
        listingRow('se-contradice', sparse, { parkingSpaces: 1, furnished: true }),
      ].map(row =>
        row.key === 'se-contradice'
          ? {
              ...row,
              offers: [
                ...row.offers,
                { ...row.offers[0]!, listingId: 'ml-otro', furnished: false },
              ],
            }
          : row
      ),
      NOW
    )
    // "se-contradice": one advert says furnished and another does not, so furniture is unknown.
    expect(cards.map(card => card.key)).toEqual(['declarado'])
  })

  it('gives no card to properties that share an advert: both fichas are noindex', () => {
    const shared = { listingId: 'ic-compartido', url: 'https://www.infocasas.com.uy/compartido' }
    const cards = pickRentalBarrioListings(
      [listingRow('una', {}, shared), listingRow('otra', {}, shared), listingRow('aparte')],
      NOW
    )
    expect(cards.map(card => card.key)).toEqual(['aparte'])
  })

  it('shows one card per home: same street and door, rent and rooms', () => {
    // 2026-11-08, Pocitos: "ELLAURI 1084" from El País and from Mercado Libre, the same flat.
    const ellauri = { address: 'ELLAURI 1084', bathrooms: 2 }
    const cards = pickRentalBarrioListings(
      [
        listingRow('ellauri-el-pais', ellauri, { source: 'elpais', listingId: 'ep-ellauri' }),
        listingRow(
          'ellauri-mercado-libre',
          { ...ellauri, address: 'Ellauri 1084' },
          {
            source: 'mercadolibre',
            listingId: 'ml-ellauri',
          }
        ),
        // The same building at another rent, or another size of home, is another card.
        listingRow('ellauri-otro-precio', ellauri, { price: 45000, priceUyu: 45000 }),
        listingRow(
          'ellauri-tres-dorm',
          { ...ellauri, bedrooms: 3, title: 'Apartamento 3 dormitorios en Pocitos' },
          { title: 'Apartamento 3 dormitorios en Pocitos' }
        ),
        // Without a door number the street names a block: nothing folds.
        listingRow('bulevar-a'),
        listingRow('bulevar-b'),
      ],
      NOW
    )
    expect(cards.map(card => card.key)).toEqual([
      'ellauri-el-pais',
      'ellauri-otro-precio',
      'ellauri-tres-dorm',
      'bulevar-a',
      'bulevar-b',
    ])
  })

  it('applies the index hygiene only with a fresh list, like the ficha', () => {
    const rows = [listingRow('vieja', { firstSeen: '2026-07-01' }), listingRow('joven')]
    expect(
      pickRentalBarrioListings(rows, NOW, { allowlist: allowlistOf() }).map(card => card.key)
    ).toEqual(['joven'])
    expect(pickRentalBarrioListings(rows, NOW, { allowlist: null }).map(card => card.key)).toEqual([
      'vieja',
      'joven',
    ])
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

describe('resolveIndexableBarrioLink (el enlace de la ficha)', () => {
  const indexable = () =>
    loadIndexableRentalBarrios({ snapshots: snapshots('2026-10-04T06:00:00Z'), now: () => NOW })

  it('otra grafía del mismo barrio cae en la misma página, con el nombre de la página', async () => {
    // La ficha guarda 'POCITOS'; el botón dice 'Pocitos', el rótulo de la página del barrio.
    expect(
      await resolveIndexableBarrioLink('Montevideo', 'POCITOS', { barrios: indexable })
    ).toEqual({ path: '/alquiler/montevideo/pocitos', label: 'Pocitos' })
    const accented = async () =>
      [{ path: '/alquiler/paysandu/barrio-jardin', neighborhood: 'Barrio Jardín' }] as any
    const jardin = { path: '/alquiler/paysandu/barrio-jardin', label: 'Barrio Jardín' }
    expect(
      await resolveIndexableBarrioLink('Paysandú', 'Barrio Jardín', { barrios: accented })
    ).toEqual(jardin)
    expect(
      await resolveIndexableBarrioLink('PAYSANDU', 'barrio jardin', { barrios: accented })
    ).toEqual(jardin)
  })

  it('un barrio sin página indexable, o sin barrio, no lleva enlace', async () => {
    // Casabó tiene una sola celda: la página existe pero es noindex.
    expect(
      await resolveIndexableBarrioLink('Montevideo', 'Casabó', { barrios: indexable })
    ).toBeNull()
    expect(await resolveIndexableBarrioLink('Montevideo', '', { barrios: indexable })).toBeNull()
    expect(await resolveIndexableBarrioLink(null, 'Pocitos', { barrios: indexable })).toBeNull()
  })

  it('si el snapshot falla o tarda, la ficha sale sin enlace y sin esperar', async () => {
    const failing = async () => {
      throw new Error('mongo down')
    }
    expect(
      await resolveIndexableBarrioLink('Montevideo', 'Pocitos', { barrios: failing })
    ).toBeNull()
    const throwsSync = (() => {
      throw new Error('sync')
    }) as any
    expect(await startIndexableRentalBarrioLinks(throwsSync)).toBeNull()
    const started = Date.now()
    const hanging = () => new Promise<never>(() => undefined)
    expect(
      await resolveIndexableBarrioLink('Montevideo', 'Pocitos', { barrios: hanging, timeoutMs: 30 })
    ).toBeNull()
    expect(Date.now() - started).toBeLessThan(1000)
  })

  it('usa la lista que la ficha arrancó antes (en paralelo con Mongo)', async () => {
    const links = startIndexableRentalBarrioLinks(indexable)
    expect(await resolveIndexableBarrioLink('Montevideo', 'Pocitos', { links })).toEqual({
      path: '/alquiler/montevideo/pocitos',
      label: 'Pocitos',
    })
  })
})
