// El asesor "¿Cuál te conviene?" de /monopatines-electricos-uruguay: requisitos escritos, tres
// elecciones con nombre y su porqué, y nunca una lista vacía muda.
import { describe, expect, it } from 'vitest'
import {
  MONOPATIN_ASESOR_DEFAULT,
  asesorQueryFicha,
  asesorRequisitos,
  recomendarMonopatines,
  type AsesorInput,
  type MonopatinCandidato,
} from '../../utils/monopatinAsesor'

const specs = (over: Partial<MonopatinCandidato['specs']>): MonopatinCandidato['specs'] => ({
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
  ...over,
})

const candidato = (
  id: string,
  priceUyu: number,
  over: Partial<MonopatinCandidato['specs']>,
  extra: Partial<MonopatinCandidato> = {}
): MonopatinCandidato => ({
  id,
  title: `Monopatín ${id}`,
  url: `https://x/${id}`,
  image: null,
  price: priceUyu,
  currency: 'UYU',
  priceUyu,
  condition: 'new',
  source: 'mercadolibre',
  sellerName: 'Vendedor',
  brand: '',
  variant: 'urbano',
  specs: specs(over),
  ...extra,
})

const input = (over: Partial<AsesorInput> = {}): AsesorInput => ({ ...MONOPATIN_ASESOR_DEFAULT, ...over })

describe('asesorRequisitos', () => {
  it('10 km por día y 75 kg piden 16 km declarados y 85 kg de carga', () => {
    expect(asesorRequisitos(input({ kmDia: 10, pesoKg: 75, terreno: 'algunas' }))).toEqual({
      autonomiaDeclaradaMin: 16,
      factorReal: 0.65,
      cargaMin: 85,
      potenciaMin: 350,
      pesoMax: null,
    })
  })

  it('con más de 90 kg la autonomía real baja al 55 % y con muchas subidas pide 500 W', () => {
    const requisitos = asesorRequisitos(input({ kmDia: 11, pesoKg: 100, terreno: 'muchas', loCarga: true }))
    expect(requisitos).toMatchObject({ autonomiaDeclaradaMin: 20, factorReal: 0.55, cargaMin: 110, potenciaMin: 500, pesoMax: 15 })
  })

  it('en llano no pide potencia', () => {
    expect(asesorRequisitos(input({ terreno: 'llano' })).potenciaMin).toBeNull()
  })
})

describe('recomendarMonopatines', () => {
  const pool = [
    candidato('barato', 15_000, { rangeKm: 20, maxLoadKg: 100, motorW: 350, weightKg: 13 }),
    candidato('rinde', 22_000, { rangeKm: 45, maxLoadKg: 120, motorW: 500, weightKg: 18 }),
    candidato('liviano', 25_000, { rangeKm: 25, maxLoadKg: 100, motorW: 350, weightKg: 11 }),
    candidato('potente', 40_000, { rangeKm: 40, maxLoadKg: 150, motorW: 1000, weightKg: 24, maxSpeedKmh: 45 }),
    candidato('corto', 9_000, { rangeKm: 8, maxLoadKg: 100, motorW: 350 }),
    candidato('sin-carga', 12_000, { rangeKm: 30, motorW: 350 }),
    candidato('usado', 5_000, { rangeKm: 30, maxLoadKg: 120, motorW: 350 }, { condition: 'used' }),
  ]

  it('tres elecciones distintas con su nombre y su porqué', () => {
    const result = recomendarMonopatines(pool, input({ kmDia: 10, pesoKg: 75, terreno: 'algunas' }))
    expect(result.cumplen.map(c => c.id)).toEqual(['barato', 'rinde', 'liviano', 'potente'])
    expect(result.picks.map(pick => [pick.kind, pick.candidato.id])).toEqual([
      ['barato', 'barato'],
      ['autonomia', 'rinde'],
      ['subidas', 'potente'],
    ])
    const barato = result.picks[0]!
    expect(barato.titulo).toBe('La más barata que cumple')
    expect(barato.porque).toContain('Autonomía real estimada: 13 km para tus 10 km por día')
    expect(barato.porque).toContain('Soporta 100 kg (vos + 10 kg de mochila)')
  })

  it('si lo carga, la tercera es la más liviana', () => {
    const result = recomendarMonopatines(pool, input({ loCarga: true }))
    expect(result.picks.map(pick => pick.kind)).toEqual(['barato', 'autonomia', 'liviano'])
    expect(result.picks[2]!.candidato.id).toBe('liviano')
    expect(result.picks[2]!.porque).toContain('Pesa 11 kg: se sube a una escalera o al ómnibus')
  })

  it('avisa la velocidad que pasa el tope de Montevideo y San José, sin decir "ilegal"', () => {
    const result = recomendarMonopatines(pool, input())
    const potente = result.picks.find(pick => pick.candidato.id === 'potente')!
    const aviso = potente.porque.find(line => line.includes('25 km/h'))!
    expect(aviso).toBe('Declara 45 km/h: en Montevideo y San José se circula hasta 25 km/h')
    expect(aviso.toLowerCase()).not.toContain('ilegal')
  })

  it('un aviso sin el dato de la carga no cumple y se cuenta aparte', () => {
    const result = recomendarMonopatines(pool, input())
    expect(result.cumplen.map(c => c.id)).not.toContain('sin-carga')
    expect(result.descartes.sinDato).toBe(1)
    expect(result.descartes.autonomia).toBe(1)
  })

  it('usados sólo si se pide', () => {
    expect(recomendarMonopatines(pool, input()).cumplen.map(c => c.id)).not.toContain('usado')
    expect(recomendarMonopatines(pool, input({ usados: true })).cumplen[0]!.id).toBe('usado')
  })

  it('el presupuesto deja afuera lo que cuesta más', () => {
    const result = recomendarMonopatines(pool, input({ presupuesto: 20_000 }))
    expect(result.cumplen.map(c => c.id)).toEqual(['barato'])
    expect(result.descartes.presupuesto).toBe(3)
  })

  it('si nadie cumple, dice qué requisito aflojar', () => {
    const result = recomendarMonopatines(pool, input({ kmDia: 30, pesoKg: 75 }))
    expect(result.cumplen).toEqual([])
    expect(result.picks).toEqual([])
    expect(result.aflojar).toBe('autonomia')
  })
})

describe('asesorQueryFicha', () => {
  it('lleva los requisitos al directorio', () => {
    const requisitos = asesorRequisitos(input({ kmDia: 10, pesoKg: 75, terreno: 'algunas' }))
    expect(asesorQueryFicha(requisitos, input({ presupuesto: 30_000 }))).toEqual({
      ficha: {
        autonomia: 16,
        velocidad: '',
        potencia: '',
        potenciaMin: 350,
        carga: 85,
        peso: null,
        rueda: '',
        rasgos: [],
        soloFicha: true,
      },
      precioMax: 30_000,
      condicion: 'nuevo',
    })
  })
})

describe('GET /api/movilidad/monopatin-asesor', () => {
  it('sólo lee el snapshot precalculado, con caché de borde, y falla sin cachear', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const route = readFileSync(
      join(__dirname, '..', '..', 'server', 'api', 'movilidad', 'monopatin-asesor.get.ts'),
      'utf8'
    )
    expect(route).toContain('MovilidadSpecSnapshotModel')
    expect(route).toContain("key: 'monopatin-electrico'")
    expect(route).toContain('public, max-age=300')
    expect(route).toContain("'no-store'")
    expect(route).not.toMatch(/MovilidadListingModel/)
  })
})
