import { describe, expect, it } from 'vitest'
import {
  attachRentalZoneUtilities,
  parseRentalServiceAttributes,
  projectRentalZoneImpact,
  projectRentalZoneServices,
  rentalServiceFilterOptions,
  rentalServiceZoneIds,
  rentalServiceZoneFold,
  rentalZoneUtilitiesMeta,
} from '../../utils/rentalZoneServices'
import { buildRentalZoneResponse, projectRentalZoneSnapshots } from '../../utils/rentalZones'

const now = Date.parse('2026-10-20T12:00:00Z')
const power = (minutes: number, name = 'Pocitos', department = 'Montevideo') => ({
  name,
  department,
  customers: 47000,
  unplannedMinutes: minutes,
  plannedMinutes: 1,
  cutsPerMonth: 3,
  cutsPerThousand: 0.064,
})
const counts = (value: number) => ({ alumbrado: value, saneamiento: value, limpieza: value, calles: value })
const raw = {
  version: 1,
  generatedAt: '2026-10-20T06:53:00.000Z',
  names: { 'mvd:8': 'Pocitos', 'mvd:10': 'Parque Batlle, Villa Dolores', 'ute:3210': 'Punta Del Este', bad: 'x' },
  localities: {
    'ute:3210': { name: 'Punta Del Este', department: 'Maldonado', aliases: [] },
    'ute:3205': { name: 'Maldonado Urbano', department: 'Maldonado', aliases: ['Maldonado'] },
  },
  power: {
    status: 'ready',
    observedFrom: '2026-09-19',
    observedTo: '2026-10-19',
    observedDays: 30,
    coverage: 0.97,
    zones: { 'mvd:8': power(12), 'mvd:10': power(40, 'Parque Batlle, Villa Dolores'), 'ute:3210': power(90, 'Punta Del Este', 'Maldonado') },
    departments: { Canelones: power(55, 'Canelones', 'Canelones') },
  },
  water: {
    periodFrom: '2024-10-20',
    periodTo: '2026-10-20',
    fetchedAt: '2026-10-20T08:29:00.000Z',
    notices: 300,
    montevideoNotices: 200,
    montevideoMatched: 120,
    zones: { 'mvd:8': { notices: 2, hours: 9 }, 'mvd:10': { notices: 5, hours: 30 } },
    departments: { Maldonado: { notices: 40, hours: 160 } },
  },
  claims: {
    periodFrom: '2025-09-01',
    periodTo: '2026-08-31',
    source: { fetchedAt: '2026-09-20T06:53:00.000Z' },
    zones: {
      'mvd:8': { counts: counts(100), perThousand: counts(2.1), customers: 47000 },
      'mvd:10': { counts: counts(300), perThousand: null, customers: null },
    },
  },
  levels: {
    thresholds: { luz: { low: 20, high: 60, zones: 3 }, agua: { low: 2, high: 4, zones: 62 } },
    byZone: {
      luz: { 'mvd:8': 'low', 'mvd:10': 'mid', 'ute:3210': 'high' },
      agua: { 'mvd:8': 'low', 'mvd:10': 'high' },
      alumbrado: { 'mvd:8': 'low', 'mvd:10': 'bad' },
    },
  },
}
const aliases = { 'montevideo|parque batlle': { zone: 'mvd:10', share: 0.92, n: 40 }, bad: { zone: 'nope', share: 1, n: 1 } }
const snapshot = projectRentalZoneServices(raw, aliases)!

describe('projectRentalZoneServices', () => {
  it('keeps only valid ids and levels', () => {
    expect(snapshot.names.bad).toBeUndefined()
    expect(snapshot.aliases.bad).toBeUndefined()
    expect(snapshot.byZone.alumbrado).toEqual({ 'mvd:8': 'low' })
    expect(snapshot.claims?.zones['mvd:10'].perThousand).toBeNull()
    expect(projectRentalZoneServices({ version: 2 }, {})).toBeNull()
  })
})

describe('attachRentalZoneUtilities', () => {
  it('uses the INE area of an exact official name', () => {
    const zone = attachRentalZoneUtilities(snapshot, { department: 'Montevideo', neighborhood: 'Pocitos' }, '8', now)!
    expect(zone.official).toEqual({ id: 'mvd:8', name: 'Pocitos', match: 'exact', share: null })
    expect(zone.power).toMatchObject({ geography: 'zone', unplannedMinutes: 12 })
    expect(zone.water).toEqual({ geography: 'zone', geographyName: 'Pocitos', notices: 2, hours: 9 })
    expect(zone.claims?.perThousand?.alumbrado).toBe(2.1)
    expect(zone.levels).toEqual({ luz: 'low', agua: 'low', alumbrado: 'low' })
  })

  it('reaches the INE area through a measured alias, saying so', () => {
    const zone = attachRentalZoneUtilities(snapshot, { department: 'Montevideo', neighborhood: 'PARQUE BATLLE' }, null, now)!
    expect(zone.official).toEqual({ id: 'mvd:10', name: 'Parque Batlle, Villa Dolores', match: 'alias', share: 0.92 })
    expect(zone.levels.agua).toBe('high')
  })

  it('matches interior towns by UTE name and falls back to department context', () => {
    const pde = attachRentalZoneUtilities(snapshot, { department: 'Maldonado', neighborhood: 'Punta del Este' }, null, now)!
    expect(pde.official?.id).toBe('ute:3210')
    expect(pde.power?.geography).toBe('zone')
    expect(pde.water).toMatchObject({ geography: 'department', notices: 40 })
    const town = attachRentalZoneUtilities(snapshot, { department: 'Maldonado', neighborhood: 'Maldonado' }, null, now)!
    expect(town.official?.id).toBe('ute:3205')
    const canelones = attachRentalZoneUtilities(snapshot, { department: 'Canelones', neighborhood: 'Solymar' }, null, now)!
    expect(canelones.official).toBeNull()
    expect(canelones.power).toMatchObject({ geography: 'department', geographyName: 'Canelones', unplannedMinutes: 55 })
    expect(attachRentalZoneUtilities(snapshot, { department: 'Rocha', neighborhood: 'x' }, null, now)).toBeNull()
  })

  it('hides a layer once it is too old and never shows power while it is still collecting', () => {
    const late = Date.parse('2026-11-05T00:00:00Z')
    const zone = attachRentalZoneUtilities(snapshot, { department: 'Montevideo', neighborhood: 'Pocitos' }, '8', late)!
    expect(zone.power).toBeNull()
    expect(zone.levels.luz).toBeUndefined()
    const collecting = projectRentalZoneServices({ ...raw, power: { ...raw.power, status: 'collecting' } }, aliases)
    expect(attachRentalZoneUtilities(collecting, { department: 'Montevideo', neighborhood: 'Pocitos' }, '8', now)!.power).toBeNull()
    expect(rentalZoneUtilitiesMeta(collecting, now)?.power?.status).toBe('collecting')
  })
})

describe('service filter', () => {
  it('parses only the offered attributes', () => {
    expect(parseRentalServiceAttributes('luz,agua,calles,nada')).toEqual(['luz', 'agua'])
    expect(parseRentalServiceAttributes(['limpieza', 'alumbrado'])).toEqual(['alumbrado', 'limpieza'])
    expect(parseRentalServiceAttributes(undefined)).toEqual([])
  })

  it('intersects the best third of every requested attribute', () => {
    expect(rentalServiceZoneIds(snapshot, ['luz'], now)).toEqual(['mvd:8'])
    expect(rentalServiceZoneIds(snapshot, ['luz', 'agua'], now)).toEqual(['mvd:8'])
    expect(rentalServiceZoneIds(snapshot, [], now)).toEqual([])
  })

  it('refuses rather than ignores an attribute it cannot evaluate', () => {
    expect(rentalServiceZoneIds(snapshot, ['saneamiento'], now)).toBeNull()
    expect(rentalServiceZoneIds(null, ['luz'], now)).toBeNull()
    const options = rentalServiceFilterOptions(snapshot, now)
    expect(options.find(option => option.attribute === 'luz')).toMatchObject({ available: true, low: 20 })
    expect(options.find(option => option.attribute === 'saneamiento')?.available).toBe(false)
  })

  it('folds names like the backend', () => {
    expect(rentalServiceZoneFold('  Pque. Batlle,  V. Dolores ')).toBe('pque batlle v dolores')
  })
})

describe('zone response', () => {
  it('carries the layers and their sources through the existing response', () => {
    const snapshots = projectRentalZoneSnapshots(null, { version: 1, generatedAt: '2026-10-20', utilities: raw, aliases })
    const response = buildRentalZoneResponse(snapshots, { department: 'Maldonado', propertyType: 'apartamento', bedrooms: 'any' }, now)
    expect(response.utilities?.power?.status).toBe('ready')
    expect(response.sources.map(source => source.url)).toContain('https://www.ose.com.uy/interrupciones/programados')
  })
})

describe('projectRentalZoneImpact', () => {
  it('validates the stored analysis and dates it', () => {
    const impact = projectRentalZoneImpact({
      version: 1,
      generatedAt: '2026-10-20T06:53:00.000Z',
      rentalDataAsOf: '2026-10-20T04:52:00.000Z',
      minimumListings: 15,
      zones: [{ zone: 'mvd:8', name: 'Pocitos', n: 300, rentM2: 690 }, { zone: 'x', name: 'x', n: 1, rentM2: 1 }],
      attributes: [
        { attribute: 'limpieza', zones: 31, rho: -0.42, rhoLow: -0.7, rhoHigh: -0.09, xLow: 18, xHigh: 38, pct: -7.9, pctLow: -16, pctHigh: 1.9, verdict: 'lower', points: [{ zone: 'mvd:8', x: 20, y: 690 }] },
        { attribute: 'otro', zones: 31 },
      ],
      joint: { zones: 31, r2: 0.6, coefficients: [{ attribute: 'limpieza', pctPerSd: -4, low: -12, high: 5 }] },
    }, now)!
    expect(impact.status).toBe('ready')
    expect(impact.zones).toHaveLength(1)
    expect(impact.attributes.map(item => item.attribute)).toEqual(['limpieza'])
    expect(impact.joint?.coefficients).toHaveLength(1)
    expect(projectRentalZoneImpact({ version: 1 }, now)).toBeNull()
  })
})
