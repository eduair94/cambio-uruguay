// Filtros, órdenes y tarjeta por ficha técnica del directorio de /monopatines-electricos-uruguay.
//
// El directorio es COMPARTIDO con /equipar-casa-uruguay/productos: todo lo de acá tiene que existir
// sólo cuando pregunta la vertical de movilidad y dejar a equipar exactamente como estaba.
import { describe, expect, it } from 'vitest'
import {
  equiparProductosChips,
  equiparProductosFiltered,
  equiparProductosNormalize,
  equiparProductosParams,
  equiparProductosWithout,
} from '../../utils/equiparProductos'
import {
  equiparProductoPublic,
  equiparProductosMatch,
  equiparProductosSort,
  EQUIPAR_PRODUCTOS_PROJECTION,
} from '../../server/utils/equiparProductos'
import {
  MONOPATIN_KWH_UYU,
  monopatinChargeCostUyu,
  monopatinSpecChips,
  monopatinSpecsPublic,
} from '../../utils/monopatinFicha'

const CUTOFF = '2026-11-01'
const movilidad = (raw: Record<string, unknown>) =>
  equiparProductosNormalize({ categoria: 'monopatin-electrico', ...raw }, 'movilidad')

describe('la consulta de ficha técnica', () => {
  it('equipar no cambia: no aparece ningún campo de ficha ni orden nuevo', () => {
    const query = equiparProductosNormalize({ autonomia: '30', rasgos: 'plegable', orden: 'precio_km' })
    expect(query).not.toHaveProperty('ficha')
    expect(query.orden).toBe('precio_asc')
  })

  it('movilidad lee autonomía, velocidad, rasgos y los órdenes nuevos', () => {
    const query = movilidad({
      autonomia: '30',
      velocidad: 'hasta-25',
      potencia: '350-500',
      carga: '120',
      peso: '15',
      rueda: '9-10',
      rasgos: 'plegable,disco,inventado',
      ficha: '1',
      orden: 'precio_km',
    })
    expect(query.ficha).toEqual({
      autonomia: 30,
      velocidad: 'hasta-25',
      potencia: '350-500',
      carga: 120,
      peso: 15,
      rueda: '9-10',
      rasgos: ['plegable', 'disco'],
      soloFicha: true,
    })
    expect(query.orden).toBe('precio_km')
  })

  it('descarta valores inválidos', () => {
    const query = movilidad({ autonomia: '-3', velocidad: 'rapido', carga: '9999', peso: 'x' })
    expect(query.ficha).toMatchObject({ autonomia: null, velocidad: '', carga: null, peso: null })
  })

  it('ida y vuelta por la URL', () => {
    const query = movilidad({ autonomia: '45', rasgos: 'suspension,app', orden: 'autonomia_desc' })
    const params = equiparProductosParams(query)
    expect(params).toMatchObject({ autonomia: '45', rasgos: 'suspension,app', orden: 'autonomia_desc' })
    expect(equiparProductosNormalize(params, 'movilidad').ficha).toEqual(query.ficha)
    expect(equiparProductosParams(movilidad({}))).toEqual({ categoria: 'monopatin-electrico' })
  })

  it('un filtro de ficha cuenta como filtro (la URL va noindex) y tiene su chip', () => {
    const query = movilidad({ autonomia: '30', rasgos: 'plegable', carga: '120' })
    expect(equiparProductosFiltered(query, ['categoria'])).toBe(true)
    expect(equiparProductosFiltered(movilidad({}), ['categoria'])).toBe(false)
    const chips = equiparProductosChips(query, undefined, 'monopatin-electrico')
    expect(chips.map(chip => chip.label)).toEqual(['30 km o más', 'Soporta 120 kg o más', 'Plegable'])
  })

  it('cada chip saca sólo lo suyo', () => {
    const query = movilidad({ autonomia: '30', rasgos: 'plegable,disco' })
    const sinAutonomia = equiparProductosWithout(query, ['ficha.autonomia'])
    expect(sinAutonomia.ficha).toMatchObject({ autonomia: null, rasgos: ['plegable', 'disco'] })
    const sinDisco = equiparProductosWithout(query, ['ficha.rasgos.disco'])
    expect(sinDisco.ficha?.rasgos).toEqual(['plegable'])
  })
})

describe('el $match de la ficha', () => {
  it('traduce cada filtro al campo guardado', () => {
    const match = equiparProductosMatch(
      movilidad({
        autonomia: '30',
        velocidad: 'hasta-25',
        potencia: '350-500',
        carga: '120',
        peso: '15',
        rueda: 'mas-10',
        rasgos: 'plegable,disco',
      }),
      CUTOFF
    )
    expect(match).toMatchObject({
      'specs.rangeKm': { $gte: 30 },
      'specs.maxSpeedKmh': { $lte: 25 },
      'specs.motorW': { $gt: 350, $lte: 500 },
      'specs.maxLoadKg': { $gte: 120 },
      'specs.weightKg': { $lte: 15 },
      'specs.wheelInches': { $gt: 10 },
      'specs.foldable': true,
      'specs.discBrake': true,
    })
  })

  it('"sólo con ficha" pide algún campo leído de la ficha o la descripción', () => {
    const match = equiparProductosMatch(movilidad({ ficha: '1' }), CUTOFF)
    expect(match.$or).toEqual(
      expect.arrayContaining([{ 'specs.from.rangeKm': { $in: ['ficha', 'descripcion'] } }])
    )
  })

  it('ignora un filtro para contar su propia faceta', () => {
    const match = equiparProductosMatch(movilidad({ autonomia: '30', carga: '120' }), CUTOFF, [
      'ficha.autonomia',
    ])
    expect(match).not.toHaveProperty(['specs.rangeKm'])
    expect(match).toHaveProperty(['specs.maxLoadKg'])
  })

  it('ordenar por precio por km o por peso deja afuera a los que no tienen el dato', () => {
    expect(equiparProductosMatch(movilidad({ orden: 'precio_km' }), CUTOFF)).toMatchObject({
      uyuPerKm: { $type: 'number' },
    })
    expect(equiparProductosMatch(movilidad({ orden: 'peso_asc' }), CUTOFF)).toMatchObject({
      'specs.weightKg': { $type: 'number' },
    })
    expect(equiparProductosSort('autonomia_desc')).toEqual({
      'specs.rangeKm': -1,
      priceUyu: 1,
      listingId: 1,
    })
    expect(equiparProductosSort('precio_km')).toEqual({ uyuPerKm: 1, listingId: 1 })
  })
})

describe('la fila pública', () => {
  it('proyecta la ficha y el precio por km', () => {
    expect(EQUIPAR_PRODUCTOS_PROJECTION).toMatchObject({ specs: 1, uyuPerKm: 1 })
  })

  it('publica la ficha saneada, sin la procedencia interna', () => {
    const row = equiparProductoPublic({
      listingId: 'ml:1',
      uyuPerKm: 800,
      specs: {
        rangeKm: 30,
        maxSpeedKmh: 25,
        motorW: 350,
        weightKg: 'pesado',
        foldable: true,
        secreto: 'x',
        from: { rangeKm: 'ficha' },
      },
    } as never)
    expect(row.specs).toMatchObject({ rangeKm: 30, maxSpeedKmh: 25, motorW: 350, weightKg: null, foldable: true, fromFicha: true })
    expect(row.specs).not.toHaveProperty('from')
    expect(row.specs).not.toHaveProperty('secreto')
    expect(row.uyuPerKm).toBe(800)
  })

  it('una fila de equipar sale igual que antes', () => {
    const row = equiparProductoPublic({ listingId: 'store:x:1', title: 'Heladera' } as never)
    expect(row).not.toHaveProperty('specs')
    expect(row).not.toHaveProperty('uyuPerKm')
  })

  it('una ficha que sólo salió del título no es "de ficha"', () => {
    expect(monopatinSpecsPublic({ rangeKm: 40, from: { rangeKm: 'titulo' } })?.fromFicha).toBe(false)
    expect(monopatinSpecsPublic({ from: {} })).toBeNull()
  })
})

describe('formato', () => {
  it('la franja de la tarjeta: autonomía, velocidad, potencia y peso', () => {
    expect(
      monopatinSpecChips({ ...monopatinSpecsPublic({ rangeKm: 45, maxSpeedKmh: 25, motorW: 800, weightKg: 26.3, from: { rangeKm: 'ficha' } })! })
    ).toEqual(['45 km', '25 km/h', '800 W', '26,3 kg'])
  })

  it('una carga completa con la tarifa de UTE y la pérdida del cargador', () => {
    expect(monopatinChargeCostUyu(360)).toBe(Math.round((360 / 1000 / 0.85) * MONOPATIN_KWH_UYU))
    expect(monopatinChargeCostUyu(null)).toBeNull()
    expect(MONOPATIN_KWH_UYU).toBeCloseTo(8.452 * 1.22, 1)
  })
})

describe('las facetas de la ficha', () => {
  it('cada dimensión cuenta sin su propio filtro y con los demás', async () => {
    const { monopatinFichaFacetPlan } = await import('../../server/utils/monopatinFichaFacets')
    const plan = monopatinFichaFacetPlan(
      movilidad({ autonomia: '30', velocidad: 'hasta-25', rasgos: 'plegable' }),
      CUTOFF
    )
    const velocidad = plan.find(step => step.dimension === 'velocidad')!
    expect(velocidad.match).not.toHaveProperty(['specs.maxSpeedKmh'])
    expect(velocidad.match).toHaveProperty(['specs.rangeKm'])
    expect(velocidad.match).toHaveProperty(['specs.foldable'])
    // Un nulo es MENOR que cualquier número en una comparación de agregación: sin el $isNumber,
    // "hasta 25 km/h" contaría a todos los avisos sin el dato.
    expect(JSON.stringify(velocidad.group)).toContain('$isNumber')
  })

  it('convierte los conteos en opciones con su etiqueta, sin las vacías salvo la elegida', async () => {
    const { monopatinFichaFacetsFrom } = await import('../../server/utils/monopatinFichaFacets')
    const facets = monopatinFichaFacetsFrom(
      {
        autonomia: { o20: 40, o30: 22, o45: 0, o60: 0 },
        velocidad: { 'hasta-25': 50, '25-35': 10, 'mas-35': 0 },
        potencia: {},
        carga: { o100: 30 },
        peso: {},
        rueda: {},
        rasgos: { plegable: 44, suspension: 0 },
        conFicha: 61,
      },
      movilidad({ autonomia: '45' }).ficha!
    )
    expect(facets.autonomia).toEqual([
      { slug: '20', name: '20 km o más', count: 40 },
      { slug: '30', name: '30 km o más', count: 22 },
      { slug: '45', name: '45 km o más', count: 0 },
    ])
    expect(facets.velocidad.map(facet => facet.slug)).toEqual(['hasta-25', '25-35'])
    expect(facets.rasgos).toEqual([{ slug: 'plegable', name: 'Plegable', count: 44 }])
    expect(facets.conFicha).toBe(61)
  })
})
