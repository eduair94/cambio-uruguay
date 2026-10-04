// app/tests/unit/rentalBarrio.test.ts
import { describe, expect, it } from 'vitest'
import {
  buildRentalBarrioPage,
  listRentalBarrios,
  rentalBarrioDirectoryPath,
  rentalBarrioPath,
  rentalBarrioSlug,
} from '../../utils/rentalBarrio'
import type { RentalZoneSnapshots } from '../../utils/rentalZones'

const NOW = Date.parse('2026-10-04T12:00:00Z')
const dist = (median: number | null, count = 20) => ({
  count,
  mean: median,
  median,
  p25: median === null ? null : Math.round(median * 0.85),
  p75: median === null ? null : Math.round(median * 1.15),
})
const empty = { count: 0, mean: null, median: null, p25: null, p75: null }
const bucket = (
  neighborhood: string,
  propertyType: 'apartamento' | 'casa',
  bedrooms: 'any' | '0' | '1' | '2' | '3' | '4plus',
  median: number | null,
  count = 20,
  department = 'Montevideo'
) => ({
  department,
  neighborhood,
  propertyType,
  bedrooms,
  prices: {
    rent: dist(median, count),
    commonExpenses: dist(median === null ? null : 6000, count),
    monthlyTotal: dist(median === null ? null : median + 6000, count),
    builtSquareMeter: empty,
    sources: 3,
    lastSeenFrom: '2026-09-28T00:00:00.000Z',
    lastSeenTo: '2026-10-03T00:00:00.000Z',
  },
})
const snapshots = (generatedAt = '2026-10-04T06:53:00.000Z'): RentalZoneSnapshots =>
  ({
    market: {
      generatedAt,
      rentalDataAsOf: generatedAt,
      buckets: [
        bucket('POCITOS', 'apartamento', 'any', 32000, 900),
        bucket('Pocitos', 'apartamento', '2', 36000, 300),
        bucket('POCITOS', 'apartamento', '1', 27000, 250),
        bucket('Pocitos', 'casa', 'any', null, 5),
        bucket('Cordón', 'apartamento', 'any', 24000, 1200),
        bucket('CORDON', 'apartamento', '2', 26000, 400),
        bucket('Malvín', 'apartamento', 'any', 28000, 500),
        bucket('MALVIN', 'apartamento', '2', 34000, 200),
        bucket('Casabó', 'casa', 'any', 15000, 9),
        bucket('Carrasco', 'apartamento', 'any', 45000, 100, 'Canelones'),
        bucket('Carrasco', 'apartamento', '2', 47000, 40, 'Canelones'),
      ],
    },
    context: null,
  }) as unknown as RentalZoneSnapshots

describe('rentalBarrioSlug / rentalBarrioPath', () => {
  it('pliega tildes, mayúsculas y espacios', () => {
    expect(rentalBarrioSlug('Malvín Norte')).toBe('malvin-norte')
    expect(rentalBarrioSlug('  PUNTA   CARRETAS ')).toBe('punta-carretas')
    expect(rentalBarrioPath('Cerro Largo', 'Melo')).toBe('/alquiler/cerro-largo/melo')
  })
})

describe('listRentalBarrios', () => {
  it('une las grafías de un mismo barrio y separa departamentos', () => {
    const list = listRentalBarrios(snapshots())
    const pocitos = list.filter(item => item.slug === 'pocitos')
    expect(pocitos).toHaveLength(1)
    expect(pocitos[0]!.neighborhood).toBe('Pocitos')
    expect(pocitos[0]!.publishableCells).toBe(3)
    expect(pocitos[0]!.listings).toBe(905)
    const carrasco = list.filter(item => item.slug === 'carrasco')
    expect(carrasco.map(item => item.departmentSlug)).toEqual(['canelones'])
    expect(list.find(item => item.slug === 'malvin')!.neighborhood).toBe('Malvín')
  })
})

describe('buildRentalBarrioPage', () => {
  it('arma celdas, rank, similares y más buscados', () => {
    const page = buildRentalBarrioPage(snapshots(), 'montevideo', 'pocitos', NOW)!
    expect(page.path).toBe('/alquiler/montevideo/pocitos')
    // `casa/any` de Pocitos tiene mediana nula (n = 5): page.cells sólo trae celdas publicables.
    expect(page.cells.map(cell => `${cell.propertyType}/${cell.bedrooms}`)).toEqual([
      'apartamento/any',
      'apartamento/1',
      'apartamento/2',
    ])
    expect(page.officialZone).toBeNull()
    expect(page.rank).toEqual({ position: 1, of: 3, propertyType: 'apartamento', bedrooms: '2' })
    expect(page.similar.map(link => link.neighborhood)).toEqual(['Malvín', 'Cordón'])
    expect(page.largest[0]!.neighborhood).toBe('Cordón')
    expect(page.largest.some(link => link.neighborhood === 'Carrasco')).toBe(false)
    expect(page.indexable).toBe(true)
  })

  it('sin la celda de 2 dormitorios, compara por apartamento/any', () => {
    const data = snapshots()
    data.market!.buckets = data.market!.buckets.filter(
      row => !(row.neighborhood.toLowerCase() === 'pocitos' && row.bedrooms === '2')
    )
    const page = buildRentalBarrioPage(data, 'montevideo', 'pocitos', NOW)!
    expect(page.rank).toEqual({ position: 1, of: 3, propertyType: 'apartamento', bedrooms: 'any' })
  })

  it('con menos de dos celdas publicables no se indexa', () => {
    const page = buildRentalBarrioPage(snapshots(), 'montevideo', 'casabo', NOW)!
    expect(page.cells).toHaveLength(1)
    expect(page.indexable).toBe(false)
    expect(page.rank).toBeNull()
  })

  it('un snapshot de más de 7 días se sirve pero no se indexa', () => {
    const page = buildRentalBarrioPage(snapshots('2026-09-26T06:53:00.000Z'), 'montevideo', 'pocitos', NOW)!
    expect(page.indexable).toBe(false)
    expect(page.generatedAt).toBe('2026-09-26T06:53:00.000Z')
  })

  it('reconoce el barrio oficial de Montevideo (para el panel de servicios)', () => {
    const data = snapshots()
    ;(data as any).context = { boundaries: { features: [{ properties: { name: 'POCITOS', officialCode: '1' } }] } }
    expect(buildRentalBarrioPage(data, 'montevideo', 'pocitos', NOW)!.officialZone).toBe('POCITOS')
    expect(buildRentalBarrioPage(data, 'montevideo', 'cordon', NOW)!.officialZone).toBeNull()
    expect(buildRentalBarrioPage(data, 'canelones', 'carrasco', NOW)!.officialZone).toBeNull()
  })

  it('arma el filtro del directorio', () => {
    expect(rentalBarrioDirectoryPath('Montevideo', 'Pocitos', '2')).toBe(
      '/alquileres-uruguay?department=Montevideo&neighborhood=Pocitos&bedrooms=2'
    )
    expect(rentalBarrioDirectoryPath('Montevideo', 'Pocitos', 'any')).toBe(
      '/alquileres-uruguay?department=Montevideo&neighborhood=Pocitos'
    )
  })

  it('barrio o departamento desconocido, o sin mercado, devuelve null', () => {
    expect(buildRentalBarrioPage(snapshots(), 'montevideo', 'carrasco', NOW)).toBeNull()
    expect(buildRentalBarrioPage(snapshots(), 'atlantida', 'pocitos', NOW)).toBeNull()
    expect(buildRentalBarrioPage({ market: null, context: null }, 'montevideo', 'pocitos', NOW)).toBeNull()
  })
})
