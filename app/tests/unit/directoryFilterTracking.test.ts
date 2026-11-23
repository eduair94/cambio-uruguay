import { describe, expect, it, vi } from 'vitest'
import {
  IGNORED_FILTER_KEYS,
  filterChanges,
  trackFilterChanges,
} from '../../utils/directoryFilterTracking'

// El evento dice QUÉ filtro se tocó y nunca con qué valor: un valor puede ser una dirección, un
// precio o texto libre del visitante.
describe('filterChanges', () => {
  it('poner un filtro es set', () => {
    expect(filterChanges({}, { barrio: 'pocitos' })).toEqual([{ filter: 'barrio', action: 'set' }])
  })

  it('sacarlo es clear', () => {
    expect(filterChanges({ barrio: 'pocitos' }, {})).toEqual([
      { filter: 'barrio', action: 'clear' },
    ])
  })

  it('cambiar el valor es set', () => {
    expect(filterChanges({ barrio: 'pocitos' }, { barrio: 'centro' })).toEqual([
      { filter: 'barrio', action: 'set' },
    ])
  })

  it('el mismo valor no es un cambio', () => {
    expect(filterChanges({ barrio: 'pocitos' }, { barrio: 'pocitos' })).toEqual([])
  })

  it('paginar, ordenar o cambiar de vista no es filtrar', () => {
    expect(filterChanges({ page: '2' }, { page: '3' })).toEqual([])
    expect(filterChanges({ barrio: 'pocitos' }, { barrio: 'pocitos', page: '2' })).toEqual([])
    expect(filterChanges({}, { sort: 'price_asc', view: 'mapa', perPage: '48' })).toEqual([])
    for (const key of ['page', 'perPage', 'sort', 'view', 'refLat', 'refLng'])
      expect(IGNORED_FILTER_KEYS).toContain(key)
  })

  it('arreglos y objetos iguales en instancias distintas no son un cambio', () => {
    expect(filterChanges({ tipos: ['casa', 'apto'] }, { tipos: ['casa', 'apto'] })).toEqual([])
    expect(filterChanges({ rango: { min: 1, max: 2 } }, { rango: { max: 2, min: 1 } })).toEqual([])
    expect(filterChanges({ tipos: ['casa'] }, { tipos: ['casa', 'apto'] })).toEqual([
      { filter: 'tipos', action: 'set' },
    ])
  })

  it("'', null, undefined y [] cuentan como ausentes", () => {
    expect(filterChanges({ q: '', a: null, b: [], c: undefined }, {})).toEqual([])
    expect(filterChanges({}, { q: '', a: null, b: [] })).toEqual([])
    expect(filterChanges({ q: 'garage' }, { q: '' })).toEqual([{ filter: 'q', action: 'clear' }])
    expect(filterChanges({ tipos: [] }, { tipos: ['casa'] })).toEqual([
      { filter: 'tipos', action: 'set' },
    ])
  })

  it('devuelve los cambios ordenados por nombre', () => {
    expect(
      filterChanges({ zeta: '1', alfa: '1' }, { mid: '1', alfa: '2', page: '4' }).map(
        change => change.filter
      )
    ).toEqual(['alfa', 'mid', 'zeta'])
  })

  it('acepta otra lista de claves a ignorar', () => {
    expect(filterChanges({}, { page: '2', barrio: 'x' }, ['barrio'])).toEqual([
      { filter: 'page', action: 'set' },
    ])
  })
})

describe('trackFilterChanges', () => {
  it('manda un directory_filter por filtro con directorio, nombre y acción, sin el valor', () => {
    const track = vi.fn()
    trackFilterChanges(
      track,
      'alquileres',
      { neighborhood: 'Pocitos', priceMax: '30000', page: '2' },
      { q: 'Bulevar Artigas 1234', priceMax: '25000' }
    )
    expect(track.mock.calls).toEqual([
      ['directory_filter', { directory: 'alquileres', filter: 'neighborhood', action: 'clear' }],
      ['directory_filter', { directory: 'alquileres', filter: 'priceMax', action: 'set' }],
      ['directory_filter', { directory: 'alquileres', filter: 'q', action: 'set' }],
    ])
    for (const [, params] of track.mock.calls) {
      expect(Object.keys(params).sort()).toEqual(['action', 'directory', 'filter'])
      const sent = JSON.stringify(params)
      for (const value of ['Pocitos', '30000', '25000', 'Bulevar', '1234']) {
        expect(sent).not.toContain(value)
      }
    }
  })

  it('cuenta una sola vez el mismo filtro escrito tecla por tecla', () => {
    const track = vi.fn()
    let clock = 1_000_000
    const now = () => clock
    for (const typed of ['2', '20', '202', '2026']) {
      trackFilterChanges(track, 'motos', {}, { yearMin: typed }, now)
      clock += 300
    }
    expect(track).toHaveBeenCalledTimes(1)
    clock += 5_000
    trackFilterChanges(track, 'motos', { yearMin: '2026' }, { yearMin: '2020' }, now)
    expect(track).toHaveBeenCalledTimes(2)
    trackFilterChanges(track, 'motos', { yearMin: '2020' }, {}, now)
    trackFilterChanges(track, 'motos', {}, { yearMin: '2019' }, now)
    expect(track.mock.calls.map(([, params]) => params.action)).toEqual([
      'set',
      'set',
      'clear',
      'set',
    ])
  })

  it('no manda nada si no cambió ningún filtro', () => {
    const track = vi.fn()
    trackFilterChanges(track, 'autos', { brand: 'toyota' }, { brand: 'toyota', page: '3' })
    expect(track).not.toHaveBeenCalled()
  })
})
