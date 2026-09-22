// El catálogo de garantías de alquiler tiene una regla que no es de estilo: ninguna cifra puede
// existir sin la URL de la que se leyó, y ninguna conversión a pesos puede salir sin una UR viva.
// La página se publica justamente porque nadie convierte los topes en UR a pesos; si la conversión
// se cayera a un valor por defecto, publicaríamos un número inventado con cara de dato oficial.

import { describe, expect, it } from 'vitest'

import {
  GUARANTEE_OPTIONS,
  RENTAL_GUARANTEE_FAQ,
  RENTAL_GUARANTEE_SOURCES,
  RENTAL_GUARANTEE_VERIFIED_AT,
  UR_BENCHMARKS,
  monthlyFeeInPesos,
  urToPesos,
} from '../../utils/rentalGuarantee'

const OFFICIAL_HOSTS = ['gub.uy', 'impo.com.uy']

describe('el catálogo de garantías de alquiler', () => {
  it('no repite ids', () => {
    const ids = GUARANTEE_OPTIONS.map(o => o.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('le da a cada opción una fuente con URL https', () => {
    for (const option of GUARANTEE_OPTIONS) {
      expect(option.source.label.length, option.id).toBeGreaterThan(10)
      expect(option.source.url, option.id).toMatch(/^https:\/\//)
    }
  })

  it('respalda cada opción del Estado con una fuente oficial uruguaya', () => {
    // Una garantía del Estado citada a un blog o a un portal inmobiliario sería exactamente el
    // defecto que esta página dice no tener.
    for (const option of GUARANTEE_OPTIONS.filter(
      o => o.issuer === 'estado' || o.issuer === 'regimen'
    )) {
      const host = new URL(option.source.url).hostname
      expect(
        OFFICIAL_HOSTS.some(official => host === official || host.endsWith(`.${official}`)),
        `${option.id} cita ${host}`
      ).toBe(true)
    }
  })

  it('no publica precio de ninguna garantía privada', () => {
    // Las privadas cotizan caso a caso: un porcentaje acá sería un número inventado.
    for (const option of GUARANTEE_OPTIONS.filter(o => o.issuer === 'privado')) {
      expect(option.monthlyFeePct, option.id).toBeNull()
      expect(option.depositPct, option.id).toBeNull()
    }
  })

  it('cobra la misma comisión del 3 % en las tres garantías del Estado', () => {
    const state = GUARANTEE_OPTIONS.filter(o => o.issuer === 'estado')
    expect(state).toHaveLength(3)
    for (const option of state) expect(option.monthlyFeePct, option.id).toBe(3)
  })

  it('mantiene los topes en UR que publican la ANV y el MVOT', () => {
    const byId = new Map(GUARANTEE_OPTIONS.map(o => [o.id, o]))
    expect(byId.get('fga')?.maxRentUr).toBe(18)
    expect(byId.get('fga-jovenes')?.maxRentUr).toBe(22.5)
    // La CGN no publica tope: `null` significa "no publicado", nunca "sin tope".
    expect(byId.get('cgn')?.maxRentUr).toBeNull()
    expect(byId.get('cgn')?.maxRentNote).toBeTruthy()
  })

  it('cobra la mitad de depósito en el fondo para jóvenes', () => {
    const byId = new Map(GUARANTEE_OPTIONS.map(o => [o.id, o]))
    expect(byId.get('fga')?.depositPct).toBe(24)
    expect(byId.get('fga-jovenes')?.depositPct).toBe(12)
  })

  it('le da requisitos a toda opción', () => {
    for (const option of GUARANTEE_OPTIONS) {
      expect(option.requirements.length, option.id).toBeGreaterThan(2)
      for (const req of option.requirements) expect(req.trim().length).toBeGreaterThan(15)
    }
  })
})

describe('los topes en UR que la página convierte a pesos', () => {
  it('no repite ids y son todos positivos', () => {
    const ids = UR_BENCHMARKS.map(b => b.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const b of UR_BENCHMARKS) expect(b.ur).toBeGreaterThan(0)
  })

  it('incluye los tres topes de alquiler que publican los fondos', () => {
    const values = UR_BENCHMARKS.map(b => b.ur)
    expect(values).toContain(18)
    expect(values).toContain(21)
    expect(values).toContain(22.5)
  })

  it('no contradice el tope declarado por cada opción', () => {
    const declared = new Set(
      GUARANTEE_OPTIONS.map(o => o.maxRentUr).filter((v): v is number => v != null)
    )
    for (const value of declared) expect(UR_BENCHMARKS.map(b => b.ur)).toContain(value)
  })
})

describe('urToPesos', () => {
  it('convierte con la UR viva y redondea a pesos enteros', () => {
    expect(urToPesos(18, 1921.36)).toBe(34_584)
    expect(urToPesos(22.5, 1921.36)).toBe(43_231)
  })

  it('devuelve null sin UR en vez de caer a un valor por defecto', () => {
    // Éste es el test que importa: un número acá sería un tope oficial inventado.
    expect(urToPesos(18, null)).toBeNull()
    expect(urToPesos(18, undefined)).toBeNull()
    expect(urToPesos(18, 0)).toBeNull()
    expect(urToPesos(18, Number.NaN)).toBeNull()
  })

  it('rechaza una cantidad de UR que no es un número positivo', () => {
    expect(urToPesos(0, 1921.36)).toBeNull()
    expect(urToPesos(-1, 1921.36)).toBeNull()
    expect(urToPesos(Number.NaN, 1921.36)).toBeNull()
  })
})

describe('monthlyFeeInPesos', () => {
  it('calcula el 3 % del alquiler', () => {
    expect(monthlyFeeInPesos(20_000, 3)).toBe(600)
    expect(monthlyFeeInPesos(45_000, 3)).toBe(1_350)
  })

  it('devuelve null cuando el emisor no publica el porcentaje', () => {
    expect(monthlyFeeInPesos(20_000, null)).toBeNull()
    expect(monthlyFeeInPesos(0, 3)).toBeNull()
    expect(monthlyFeeInPesos(Number.NaN, 3)).toBeNull()
  })
})

describe('las preguntas frecuentes y las fuentes', () => {
  it('no repite ids de FAQ y contesta cada pregunta', () => {
    const ids = RENTAL_GUARANTEE_FAQ.map(f => f.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const item of RENTAL_GUARANTEE_FAQ) {
      expect(item.question.endsWith('?'), item.id).toBe(true)
      expect(item.answer.length, item.id).toBeGreaterThan(80)
    }
  })

  it('lista sólo fuentes https y sin repetir', () => {
    const urls = RENTAL_GUARANTEE_SOURCES.map(s => s.url)
    expect(new Set(urls).size).toBe(urls.length)
    for (const url of urls) expect(url).toMatch(/^https:\/\//)
  })

  it('cita la fuente de cada opción en la lista del pie', () => {
    const urls = new Set(RENTAL_GUARANTEE_SOURCES.map(s => s.url))
    for (const option of GUARANTEE_OPTIONS)
      expect(urls.has(option.source.url), option.id).toBe(true)
  })

  it('lleva fecha de verificación con forma ISO', () => {
    expect(RENTAL_GUARANTEE_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(Number.isNaN(Date.parse(RENTAL_GUARANTEE_VERIFIED_AT))).toBe(false)
  })
})
