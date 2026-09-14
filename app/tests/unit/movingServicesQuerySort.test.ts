import { describe, expect, it } from 'vitest'
import {
  MOVING_PROVIDERS,
  buildMovingQuery,
  movingPriceForSort,
  movingPriceGroupKey,
  readMovingQuery,
  sortMovingProviders,
  type MovingDirectoryState,
  type MovingPrice,
  type MovingProvider,
  type MovingRouteQuery,
} from '../../utils/movingServices'

describe('shareable moving filters', () => {
  it('round trips every filter and price order while preserving unrelated parameters', () => {
    const state: MovingDirectoryState = {
      category: 'freight',
      department: 'Canelones',
      query: 'heladera chica',
      pricedOnly: true,
      vehicleOnly: true,
      localOnly: true,
      sort: 'price-desc',
    }
    const campaign = { utm_source: 'rental hub', tag: ['saved', 'shared'] }
    const query = buildMovingQuery(state, campaign)
    expect(query).toEqual({
      ...campaign,
      servicio: 'freight',
      departamento: 'Canelones',
      q: 'heladera chica',
      precios: '1',
      camion: '1',
      local: '1',
      orden: 'precio-desc',
    })
    expect(readMovingQuery(query)).toEqual(state)
    expect(query.tag).not.toBe(campaign.tag)
    expect(campaign).toEqual({ utm_source: 'rental hub', tag: ['saved', 'shared'] })
  })

  it('omits defaults and removes only owned parameters when filters are cleared', () => {
    const previous: MovingRouteQuery = {
      servicio: 'assembly',
      departamento: 'Montevideo',
      q: 'placard',
      precios: '1',
      camion: '1',
      local: '1',
      orden: 'precio-asc',
      utm_campaign: 'mudanza',
      preview: null,
    }
    expect(buildMovingQuery(readMovingQuery({}), previous)).toEqual({
      utm_campaign: 'mudanza',
      preview: null,
    })
    expect(previous.servicio).toBe('assembly')
    expect(buildMovingQuery({})).toEqual({})
  })

  it('normalizes canonical department names, accents, spaces and encoded search text', () => {
    const state = readMovingQuery({
      servicio: ' ASSEMBLY ',
      departamento: ' rio negro ',
      q: '  Mesa   & ropero + cajón  ',
      orden: 'precio-asc',
    })
    expect(state.category).toBe('assembly')
    expect(state.department).toBe('Río Negro')
    expect(state.query).toBe('Mesa & ropero + cajón')
    const encoded = new URLSearchParams(buildMovingQuery(state) as Record<string, string>)
    expect(readMovingQuery(Object.fromEntries(encoded))).toEqual(state)
  })

  it('rejects invalid enum values and never activates local-only without a department', () => {
    expect(
      readMovingQuery({
        servicio: 'storage<script>',
        departamento: 'Uruguay',
        precios: 'false',
        camion: 'true',
        local: '1',
        orden: 'cheapest',
      })
    ).toEqual(readMovingQuery({}))
    expect(buildMovingQuery({ localOnly: true })).toEqual({})
    expect(readMovingQuery({ departamento: 'Canelones', local: '1' }).localOnly).toBe(true)
  })

  it('uses the first repeated parameter consistently instead of choosing a later valid value', () => {
    const state = readMovingQuery({
      servicio: ['assembly', 'moving'],
      departamento: [null, 'Montevideo'],
      q: ['mesa', 'ropero'],
      precios: ['0', '1'],
      orden: ['invalid', 'precio-desc'],
    })
    expect(state).toEqual({ ...readMovingQuery({}), category: 'assembly', query: 'mesa' })
    expect(readMovingQuery({ servicio: [], q: null })).toEqual(readMovingQuery({}))
  })

  it('restores independent URL states for reload and back/forward without carrying old flags', () => {
    const history = [
      buildMovingQuery({ category: 'assembly', query: 'mesa' }),
      buildMovingQuery({ department: 'Canelones', localOnly: true, sort: 'price-asc' }),
      buildMovingQuery({}),
    ]
    expect(readMovingQuery(history[1])).toEqual({
      ...readMovingQuery({}),
      department: 'Canelones',
      localOnly: true,
      sort: 'price-asc',
    })
    expect(readMovingQuery(history[0])).toEqual({
      ...readMovingQuery({}),
      category: 'assembly',
      query: 'mesa',
    })
    expect(readMovingQuery(history[2])).toEqual(readMovingQuery({}))
  })
})

const price = (amount: number, overrides: Partial<MovingPrice> = {}): MovingPrice => ({
  category: 'moving',
  label: 'Mudanza, camión y chofer',
  amount,
  currency: 'UYU',
  unit: 'hour',
  kind: 'fixed',
  sourceUrl: 'https://example.test/tarifas',
  ...overrides,
})

const provider = (id: string, prices: MovingPrice[], name = id): MovingProvider => ({
  id,
  name,
  categories: [...new Set(prices.map(item => item.category))],
  coverage: [],
  summary: '',
  services: [],
  vehicles: [],
  prices,
  contacts: [],
  website: 'https://example.test',
  sources: [],
  caveats: [],
})

describe('published moving price order', () => {
  it('uses the displayed relevant tariff, not the cheapest unrelated entry in a provider', () => {
    const catalog = provider('catalog', [
      price(2000),
      price(100),
      price(600, { label: 'Envío de heladera', category: 'freight', unit: 'item' }),
      price(50, { label: 'Suplemento heladera', additional: true, category: 'freight' }),
    ])
    const other = provider('other', [price(1500)])
    expect(movingPriceForSort(catalog)).toBe(catalog.prices[0])
    expect(sortMovingProviders([catalog, other], {}, 'price-asc').map(item => item.id)).toEqual([
      'other',
      'catalog',
    ])
    expect(movingPriceForSort(catalog, { category: 'freight', query: 'heladera' })).toBe(
      catalog.prices[2]
    )
    expect(movingPriceGroupKey(catalog.prices[2])).toBe('freight|UYU|item')
  })

  it('uses assembly prices and leaves the unquoted assembly service unpriced', () => {
    const dante = MOVING_PROVIDERS.find(item => item.id === 'empresa-dante')!
    const dt = MOVING_PROVIDERS.find(item => item.id === 'dt-transportes')!
    expect(movingPriceForSort(dante, { category: 'assembly' })).toBeUndefined()
    expect(movingPriceForSort(dt, { category: 'assembly' })?.amount).toBe(1200)
    expect(movingPriceGroupKey(movingPriceForSort(dante, { category: 'assembly' }))).toBe(
      'unpriced'
    )
  })

  it('keeps service, currency and unit groups intact in both directions', () => {
    const rows = [
      provider('usd', [price(10, { currency: 'USD' })]),
      provider('uy-expensive', [price(2000)]),
      provider('assembly', [price(1, { category: 'assembly', unit: 'item' })]),
      provider('trip', [price(2, { unit: 'trip' })]),
      provider('uy-cheap', [price(1000)]),
    ]
    expect(sortMovingProviders(rows, {}, 'price-asc').map(item => item.id)).toEqual([
      'uy-cheap',
      'uy-expensive',
      'trip',
      'usd',
      'assembly',
    ])
    expect(sortMovingProviders(rows, {}, 'price-desc').map(item => item.id)).toEqual([
      'uy-expensive',
      'uy-cheap',
      'trip',
      'usd',
      'assembly',
    ])
  })

  it('keeps package totals and half-hour blocks intact instead of manufacturing hourly rates', () => {
    const hourly = provider('hourly', [price(2000)])
    const block = provider('half-hour', [
      price(1400, { unit: 'service', label: 'Bloque de 30 minutos', minimum: '30 minutos' }),
    ])
    const pack = provider('two-hours', [
      price(3120, { unit: 'service', label: 'Paquete de 2 horas, camión chico, 2 ayudantes' }),
    ])
    expect(
      sortMovingProviders([pack, hourly, block], {}, 'price-asc').map(item => item.id)
    ).toEqual(['hourly', 'half-hour', 'two-hours'])
    expect(movingPriceForSort(pack)).toMatchObject({ amount: 3120, unit: 'service' })
    expect(movingPriceForSort(block)).toMatchObject({ amount: 1400, minimum: '30 minutos' })
  })

  it('uses the visible starting amount for ranges and from prices without altering qualifiers', () => {
    const range = provider('range', [price(500, { kind: 'range', maxAmount: 9000 })])
    const fixed = provider('fixed', [price(1000)])
    const from = provider('from', [price(700, { kind: 'from' })])
    expect(sortMovingProviders([fixed, range, from], {}, 'price-asc').map(item => item.id)).toEqual(
      ['range', 'from', 'fixed']
    )
    expect(movingPriceForSort(range)).toMatchObject({ kind: 'range', maxAmount: 9000 })
    expect(movingPriceForSort(from)?.kind).toBe('from')
  })

  it('places missing and extra-only prices last in both directions, preserving explicit zero', () => {
    const missing = provider('missing', [], 'A sin precio')
    const extraOnly = provider('extra-only', [price(1, { additional: true })], 'B adicional')
    const paid = provider('paid', [price(100)])
    const free = provider('free', [price(0)])
    expect(
      sortMovingProviders([missing, paid, extraOnly, free], {}, 'price-asc').map(p => p.id)
    ).toEqual(['free', 'paid', 'missing', 'extra-only'])
    expect(
      sortMovingProviders([missing, paid, extraOnly, free], {}, 'price-desc').map(p => p.id)
    ).toEqual(['paid', 'free', 'missing', 'extra-only'])
    expect(movingPriceForSort(extraOnly)).toBeUndefined()
  })

  it('excludes invalid amounts from the selected tariff', () => {
    expect(movingPriceForSort(provider('invalid', [price(Number.NaN), price(-1)]))).toBeUndefined()
    expect(movingPriceForSort(provider('mixed', [price(Infinity), price(1500)]))?.amount).toBe(1500)
  })

  it('breaks equal-price ties by name then id without mutating input or tariff order', () => {
    const z = provider('z', [price(100)], 'Zeta')
    const a2 = provider('a2', [price(100)], 'Alfa')
    const a1 = provider('a1', [price(100)], 'Alfa')
    const rows = [z, a2, a1]
    const original = structuredClone(rows)
    for (const sort of ['price-asc', 'price-desc'] as const)
      expect(sortMovingProviders(rows, {}, sort).map(item => item.id)).toEqual(['a1', 'a2', 'z'])
    expect(rows).toEqual(original)
  })

  it('retains alphabetical browsing by default, including unpriced providers', () => {
    const rows = [provider('priced', [price(1)], 'Zeta'), provider('unpriced', [], 'Alfa')]
    expect(sortMovingProviders(rows).map(item => item.id)).toEqual(['unpriced', 'priced'])
  })
})
