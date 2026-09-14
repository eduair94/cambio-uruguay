import { describe, expect, it } from 'vitest'
import {
  MOVING_CATEGORIES,
  MOVING_DEPARTMENTS,
  MOVING_PROVIDERS,
  MOVING_REVIEWED,
  filterMovingProviders,
  movingContactHref,
  movingEvidenceAge,
  movingVehicleDocumented,
  movingPricesFor,
  movingAreaInDepartment,
  type MovingProvider,
} from '../../utils/movingServices'

describe('moving directory evidence', () => {
  it('keeps complete, unique records with traceable prices, vehicles and contacts', () => {
    expect(MOVING_PROVIDERS.length).toBeGreaterThan(50)
    expect(new Set(MOVING_PROVIDERS.map(p => p.id)).size).toBe(MOVING_PROVIDERS.length)
    for (const provider of MOVING_PROVIDERS) {
      expect(provider.id).toMatch(/^[a-z0-9-]+$/)
      expect(provider.name).toBeTruthy()
      expect(provider.categories.length).toBeGreaterThan(0)
      expect(provider.categories.every(category => MOVING_CATEGORIES.includes(category))).toBe(true)
      if (provider.baseDepartment) expect(MOVING_DEPARTMENTS).toContain(provider.baseDepartment)
      const sources = new Set(provider.sources.map(source => source.url))
      expect(sources.size).toBeGreaterThan(0)
      for (const source of provider.sources) {
        expect(source.url).toMatch(/^https?:\/\//)
        expect(source.title).toBeTruthy()
        expect(source.accessedAt).toBe(MOVING_REVIEWED)
      }
      for (const item of [...provider.prices, ...provider.vehicles, ...provider.contacts]) {
        expect(sources.has(item.sourceUrl), `${provider.id}: ${item.sourceUrl}`).toBe(true)
      }
      for (const price of provider.prices) {
        expect(provider.categories).toContain(price.category)
        expect(Number.isFinite(price.amount), provider.id).toBe(true)
        expect(price.amount).toBeGreaterThanOrEqual(0)
        expect(['UYU', 'USD']).toContain(price.currency)
        expect(['hour', 'trip', 'km', 'item', 'month', 'm2', 'service']).toContain(price.unit)
        expect(['fixed', 'range', 'from']).toContain(price.kind)
        if (price.kind === 'range') expect(price.maxAmount).toBeGreaterThanOrEqual(price.amount)
        if (price.minimum) expect(typeof price.minimum).toBe('string')
        // Free municipal collection is evidence; an unpriced private quote is not zero.
        if (price.amount === 0)
          expect(['im-residuos-grandes', 'canelones-residuos-especiales']).toContain(provider.id)
      }
    }
  })

  it('preserves travel blocks and additional fees without inventing a cheap hourly move', () => {
    const dt = MOVING_PROVIDERS.find(p => p.id === 'dt-transportes')!
    const twoHours = dt.prices.find(p => p.label.includes('2 horas'))!
    expect(twoHours.unit).toBe('service')
    expect(twoHours.amount).toBe(3120)
    const freight = MOVING_PROVIDERS.find(p => p.id === 'depunta')!
    expect(freight.categories).not.toContain('moving')
    expect(freight.prices.every(p => p.unit === 'item')).toBe(true)
    expect(freight.prices.every(p => p.conditions?.includes('No es mudanza'))).toBe(true)
    const quoted = MOVING_PROVIDERS.find(p => p.id === 'deleste-fletes')!
    expect(quoted.prices).toEqual([])
  })

  it('never highlights a storage price for an assembly search or treats it as an assembly quote', () => {
    const dante = MOVING_PROVIDERS.find(p => p.id === 'empresa-dante')!
    expect(
      filterMovingProviders(MOVING_PROVIDERS, { category: 'assembly', query: 'Dante' }).map(
        p => p.id
      )
    ).toEqual(['empresa-dante'])
    expect(movingPricesFor(dante, 'assembly')).toEqual([])
    expect(filterMovingProviders([dante], { category: 'assembly', pricedOnly: true })).toEqual([])
    const dt = MOVING_PROVIDERS.find(p => p.id === 'dt-transportes')!
    expect(movingPricesFor(dt, 'assembly')[0]?.amount).toBe(1200)
    expect(movingPricesFor(dt, 'assembly').every(p => p.category === 'assembly')).toBe(true)
  })

  it('finds a furniture tariff by its label and leads with that work', () => {
    const results = filterMovingProviders(MOVING_PROVIDERS, {
      query: 'heladera',
      category: 'freight',
    })
    const depunta = results.find(p => p.id === 'depunta')!
    expect(depunta).toBeTruthy()
    expect(movingPricesFor(depunta, 'freight', 'heladera')[0]?.label).toContain('Heladera')
  })

  it('does not count the same commercial telephone as different providers', () => {
    const owners = new Map<string, string>()
    for (const provider of MOVING_PROVIDERS) {
      for (const contact of provider.contacts.filter(c => c.kind !== 'email')) {
        const phone = contact.value.replace(/\D/g, '').replace(/^598/, '').replace(/^0/, '')
        if (owners.has(phone)) expect(owners.get(phone), phone).toBe(provider.id)
        owners.set(phone, provider.id)
      }
    }
  })
})

const fixture = (overrides: Partial<MovingProvider>): MovingProvider => ({
  id: 'fixture',
  name: 'Fixture',
  categories: ['moving'],
  coverage: [],
  summary: '',
  services: [],
  vehicles: [],
  prices: [],
  contacts: [],
  website: 'https://example.test',
  sources: [],
  caveats: [],
  ...overrides,
})

describe('moving directory search', () => {
  const local = fixture({
    id: 'local',
    name: 'Fletes Pérez',
    baseDepartment: 'Canelones',
    coverage: ['Ciudad de la Costa'],
  })
  const national = fixture({
    id: 'national',
    name: 'Transportes Nacionales',
    baseDepartment: 'Montevideo',
    nationwide: true,
  })
  const unknown = fixture({ id: 'unknown', name: 'Armado', categories: ['assembly'] })
  it('distinguishes a local base from national coverage and unknown coverage', () => {
    expect(
      filterMovingProviders([local, national, unknown], { department: 'Canelones' }).map(p => p.id)
    ).toEqual(['local', 'national'])
    expect(
      filterMovingProviders([local, national], { department: 'Canelones', localOnly: true }).map(
        p => p.id
      )
    ).toEqual(['local'])
    expect(filterMovingProviders([unknown], { department: 'Montevideo' })).toEqual([])
    expect(movingAreaInDepartment('Costa de Oro', 'Canelones')).toBe(true)
    expect(movingAreaInDepartment('La Paz', 'Colonia')).toBe(false)
    expect(movingAreaInDepartment('Santa Ana', 'Colonia')).toBe(false)
    expect(
      filterMovingProviders(MOVING_PROVIDERS, {
        department: 'Canelones',
        category: 'assembly',
      }).some(p => p.id === 'schubert-pereyra')
    ).toBe(true)
  })
  it('combines accent-insensitive search, category and documented vehicle filters', () => {
    expect(
      filterMovingProviders([local, national], { query: 'perez costa' }).map(p => p.id)
    ).toEqual(['local'])
    expect(
      filterMovingProviders([local, unknown], { category: 'assembly' }).map(p => p.id)
    ).toEqual(['unknown'])
    expect(filterMovingProviders([local], { pricedOnly: true })).toEqual([])
    expect(
      movingVehicleDocumented({ label: 'Camión grande', sourceUrl: 'https://example.test' })
    ).toBe(false)
    expect(
      movingVehicleDocumented({ label: 'Camión', volumeM3: 23, sourceUrl: 'https://example.test' })
    ).toBe(true)
  })
})

describe('contact and freshness semantics', () => {
  const contact = {
    kind: 'whatsapp' as const,
    value: '099 216 595',
    sourceUrl: 'https://example.test',
  }
  it('links valid published numbers but refuses incomplete or malformed contacts', () => {
    expect(movingContactHref(contact)).toBe('https://wa.me/59899216595')
    expect(movingContactHref({ ...contact, kind: 'phone', value: '2400 1234' })).toBe(
      'tel:+59824001234'
    )
    expect(movingContactHref({ ...contact, value: '4623445' })).toBeUndefined()
    expect(movingContactHref({ ...contact, value: '099216595 / 099123456' })).toBeUndefined()
    expect(movingContactHref({ ...contact, kind: 'email', value: 'hola@example.test' })).toBe(
      'mailto:hola@example.test'
    )
  })
  it('uses a fixed evidence date rather than silently refreshing the catalogue', () => {
    expect(movingEvidenceAge('2026-09-14', '2026-12-15')).toBe(92)
    expect(movingEvidenceAge('not a date', '2026-09-14')).toBeNull()
  })
})
