import { describe, expect, it } from 'vitest'
import {
  BICICLETA_ASESOR_DEFAULT,
  bicicletaAsesorConsejo,
  bicicletaAsesorQueryFicha,
  bicicletaRequisitos,
  recomendarBicicletas,
  type BicicletaAsesorInput,
  type BicicletaCandidato,
} from '../../utils/bicicletaAsesor'

const specs = (over: Partial<BicicletaCandidato['specs']> = {}): BicicletaCandidato['specs'] => ({
  rangeKm: null,
  maxSpeedKmh: null,
  motorW: null,
  motorPeakW: null,
  batteryV: null,
  batteryAh: null,
  batteryWh: null,
  chargeHours: null,
  maxLoadKg: null,
  weightKg: null,
  wheelInches: null,
  minAge: null,
  foldable: null,
  suspension: null,
  discBrake: null,
  bluetooth: null,
  brakes: null,
  ipRating: null,
  gears: null,
  removableBattery: null,
  throttle: null,
  centralMotor: null,
  ...over,
})

const bici = (
  id: string,
  priceUyu: number,
  over: Partial<BicicletaCandidato['specs']> = {},
  condition: 'new' | 'used' = 'new'
): BicicletaCandidato => ({
  id,
  title: `Bicicleta Eléctrica ${id}`,
  url: `https://example.com/${id}`,
  image: null,
  price: priceUyu,
  currency: 'UYU',
  priceUyu,
  condition,
  source: 'mercadolibre',
  sellerName: 'Vendedor',
  brand: 'Marca',
  variant: 'urbana',
  specs: specs(over),
})

const input = (over: Partial<BicicletaAsesorInput> = {}): BicicletaAsesorInput => ({
  ...BICICLETA_ASESOR_DEFAULT,
  ...over,
})

describe('requisitos de una bici', () => {
  it('autonomía real 60 % (50 % sobre 90 kg), peso + 10 kg y potencia por subidas', () => {
    expect(bicicletaRequisitos(input({ kmDia: 15, pesoKg: 75 }))).toMatchObject({
      autonomiaDeclaradaMin: 25,
      factorReal: 0.6,
      cargaMin: 85,
      potenciaMin: 350,
      acelerador: false,
    })
    expect(bicicletaRequisitos(input({ kmDia: 15, pesoKg: 100, terreno: 'muchas' }))).toMatchObject(
      {
        autonomiaDeclaradaMin: 30,
        factorReal: 0.5,
        cargaMin: 110,
        potenciaMin: 500,
      }
    )
    expect(bicicletaRequisitos(input({ terreno: 'llano' })).potenciaMin).toBeNull()
  })
})

describe('recomendarBicicletas', () => {
  const lista = [
    bici('barata', 30_000, { rangeKm: 40, maxLoadKg: 120, motorW: 350, weightKg: 26 }),
    bici('rinde', 45_000, { rangeKm: 100, maxLoadKg: 150, motorW: 350, weightKg: 22 }),
    bici('potente', 60_000, { rangeKm: 50, maxLoadKg: 120, motorW: 750, weightKg: 30 }),
    bici('plegable', 50_000, { rangeKm: 35, maxLoadKg: 120, motorW: 350, foldable: true }),
    bici('corta', 20_000, { rangeKm: 15, maxLoadKg: 120, motorW: 350 }),
    bici('sinFicha', 10_000, { rangeKm: 60 }),
    bici('usada', 15_000, { rangeKm: 60, maxLoadKg: 120, motorW: 500 }, 'used'),
  ]

  it('la más barata que cumple, la que más rinde por peso y la más potente con subidas', () => {
    const r = recomendarBicicletas(lista, input())
    expect(r.picks.map(p => [p.kind, p.candidato.id])).toEqual([
      ['barato', 'barata'],
      ['autonomia', 'rinde'],
      ['subidas', 'potente'],
    ])
    // Sin datos de carga y potencia, "sinFicha" no cumple ni se cuenta como falla.
    expect(r.descartes.sinDato).toBe(1)
    expect(r.cumplen.some(c => c.id === 'usada')).toBe(false)
  })

  it('si la sube, la tercera es la más fácil de subir (plegable o 22 kg o menos)', () => {
    const r = recomendarBicicletas(lista, input({ laSube: true }))
    const tercera = r.picks.find(p => p.kind === 'liviana')
    expect(tercera?.candidato.id).toBe('plegable')
    expect(tercera?.porque.join(' ').toLowerCase()).toContain('es plegable')
  })

  it('pedir acelerador deja sólo las que lo declaran, y lo dice cuando ninguna', () => {
    const conAcelerador = [
      ...lista,
      bici('acelera', 55_000, { rangeKm: 60, maxLoadKg: 120, motorW: 500, throttle: true }),
    ]
    const r = recomendarBicicletas(conAcelerador, input({ acelerador: true }))
    expect(r.cumplen.map(c => c.id)).toEqual(['acelera'])

    const nadie = recomendarBicicletas(lista, input({ acelerador: true }))
    expect(nadie.cumplen).toEqual([])
    expect(nadie.aflojar).toBe('acelerador')
    expect(bicicletaAsesorConsejo('acelerador', input())).toContain('acelerador')
  })

  it('los usados sólo entran si se piden', () => {
    const r = recomendarBicicletas(lista, input({ usados: true }))
    expect(r.cumplen[0]?.id).toBe('usada')
  })

  it('pasa los requisitos al directorio, con acelerador como rasgo y rodado vacío', () => {
    const req = bicicletaRequisitos(input({ acelerador: true, presupuesto: 60_000 }))
    const query = bicicletaAsesorQueryFicha(req, input({ acelerador: true, presupuesto: 60_000 }))
    expect(query.ficha).toMatchObject({
      autonomia: 25,
      potenciaMin: 350,
      carga: 85,
      rodado: '',
      rasgos: ['acelerador'],
      soloFicha: true,
    })
    expect(query).toMatchObject({ precioMax: 60_000, condicion: 'nuevo' })
  })

  it('a más de 25 km/h lo dice con la norma europea, sin decir "ilegal"', () => {
    const r = recomendarBicicletas(
      [bici('rapida', 40_000, { rangeKm: 60, maxLoadKg: 120, motorW: 500, maxSpeedKmh: 35 })],
      input()
    )
    const texto = r.picks[0]!.porque.join(' ')
    expect(texto).toContain('35 km/h')
    expect(texto).toContain('norma europea')
    expect(texto.toLowerCase()).not.toContain('ilegal')
  })
})
