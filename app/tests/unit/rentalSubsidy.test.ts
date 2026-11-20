import { describe, expect, it } from 'vitest'
import {
  RENTAL_SUBSIDY_PATH,
  RENTAL_SUBSIDY_TITLE,
  RENTAL_SUBSIDY_VERIFIED_AT,
  SUBSIDY_FIRST_CALL,
  SUBSIDY_INCOME_BANDS,
  SUBSIDY_INCOME_MAX_UR,
  SUBSIDY_INCOME_MIN_UR,
  SUBSIDY_ONE_BEDROOM_CAP_UR,
  SUBSIDY_PRIORITY_GROUPS,
  SUBSIDY_RENT_CAPS,
  SUBSIDY_REQUIREMENTS,
  SUBSIDY_SOURCES,
  SUBSIDY_TOP_CAP_UR,
  SUBSIDY_UNPUBLISHED,
  callExceedsGeneralCap,
  rentalSubsidyDescription,
  subsidyUrInPesos,
} from '../../utils/rentalSubsidy'

/** Las cifras que la ficha del MVOT publica, tal como las publica. */
describe('las tablas del programa son las de la ficha oficial', () => {
  it('abre el ingreso en 15 UR para todo tamaño de hogar', () => {
    expect(SUBSIDY_INCOME_BANDS.every(band => band.minUr === SUBSIDY_INCOME_MIN_UR)).toBe(true)
    expect(SUBSIDY_INCOME_MIN_UR).toBe(15)
  })

  it('topea el ingreso en 38, 48, 55, 60 y 65 UR según los integrantes', () => {
    expect(SUBSIDY_INCOME_BANDS.map(band => [band.members, band.maxUr])).toEqual([
      [1, 38],
      [2, 48],
      [3, 55],
      [4, 60],
      [5, 65],
    ])
    expect(SUBSIDY_INCOME_MAX_UR).toBe(65)
  })

  it('topea el alquiler en 8, 10 y 12 UR según los dormitorios', () => {
    expect(SUBSIDY_RENT_CAPS.map(cap => [cap.bedrooms, cap.maxUr])).toEqual([
      [1, 8],
      [2, 10],
      [3, 12],
    ])
    expect(SUBSIDY_ONE_BEDROOM_CAP_UR).toBe(8)
    expect(SUBSIDY_TOP_CAP_UR).toBe(12)
  })

  // El techo tiene que crecer con el hogar: una banda que baje al sumar un integrante sería un
  // error de transcripción y ninguna otra prueba lo vería.
  it('el techo de ingreso no baja al crecer el hogar', () => {
    const maxes = SUBSIDY_INCOME_BANDS.map(band => band.maxUr)
    expect([...maxes].sort((a, b) => a - b)).toEqual(maxes)
    expect(SUBSIDY_INCOME_BANDS.every(band => band.maxUr > band.minUr)).toBe(true)
  })
})

describe('el primer llamado contradice a la tabla general, y eso es el dato', () => {
  it('pide un alquiler por encima del tope más alto de la ficha', () => {
    expect(SUBSIDY_FIRST_CALL.rentUr).toBe(13)
    expect(callExceedsGeneralCap(SUBSIDY_FIRST_CALL)).toBe(true)
  })

  it('pide un ingreso mínimo mayor que los 15 UR de la ficha general', () => {
    expect(SUBSIDY_FIRST_CALL.incomeBands.every(band => band.minUr > SUBSIDY_INCOME_MIN_UR)).toBe(
      true
    )
    expect(
      SUBSIDY_FIRST_CALL.incomeBands.map(band => [band.members, band.minUr, band.maxUr])
    ).toEqual([
      [2, 20, 60],
      [3, 25, 72],
      [4, 30, 84],
    ])
  })

  it('cierra después de abrir', () => {
    expect(SUBSIDY_FIRST_CALL.closesOn > SUBSIDY_FIRST_CALL.opensOn).toBe(true)
  })
})

describe('la conversión a pesos', () => {
  it('multiplica por la UR del día', () => {
    expect(subsidyUrInPesos(8, 1_700)).toBe(13_600)
  })

  // Una página que imprime «$ 0» o una cifra vieja rotulada «hoy» es peor que una que no imprime
  // el peso: sin lectura válida de la UR, no hay peso.
  it.each([null, undefined, 0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'devuelve null con una UR de %s',
    value => {
      expect(subsidyUrInPesos(8, value as number | null | undefined)).toBeNull()
    }
  )

  it('devuelve null para un valor en UR que no es un número positivo', () => {
    expect(subsidyUrInPesos(0, 1_700)).toBeNull()
    expect(subsidyUrInPesos(Number.NaN, 1_700)).toBeNull()
  })
})

describe('el snippet entra en el SERP y nunca es genérico', () => {
  it('el título entra en 60 caracteres con la marca', () => {
    expect(`${RENTAL_SUBSIDY_TITLE} | Cambio Uruguay`.length).toBeLessThanOrEqual(60)
  })

  it('las dos variantes de la descripción entran en 155 caracteres', () => {
    for (const value of [1_700, null]) {
      const description = rentalSubsidyDescription(value)
      expect(description.length, description).toBeLessThanOrEqual(155)
      expect(description.length).toBeGreaterThan(80)
    }
  })

  // La regla de oro del sitio: la descripción trae un dato, y el de esta página es el tope.
  it('la variante con UR viva trae la cifra en pesos y la variante sin UR el tope en UR', () => {
    expect(rentalSubsidyDescription(1_700)).toContain('$ 13.600')
    expect(rentalSubsidyDescription(null)).toContain('8 a 12 UR')
    expect(rentalSubsidyDescription(null)).not.toContain('$')
  })

  it('abre por la respuesta, que es un no', () => {
    for (const value of [1_700, null])
      expect(rentalSubsidyDescription(value).startsWith('No cubre el alquiler que ya pagás')).toBe(
        true
      )
  })
})

describe('la ficha se puede auditar', () => {
  it('cada fuente es una URL oficial uruguaya', () => {
    expect(SUBSIDY_SOURCES.length).toBeGreaterThanOrEqual(3)
    for (const source of SUBSIDY_SOURCES) {
      expect(source.url).toMatch(/^https:\/\/www\.gub\.uy\//)
      expect(source.label.length).toBeGreaterThan(10)
    }
  })

  it('declara la fecha de verificación y la ruta', () => {
    expect(RENTAL_SUBSIDY_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(RENTAL_SUBSIDY_PATH).toBe('/subsidio-de-alquiler-uruguay')
  })

  it('dice qué no publica y por qué', () => {
    expect(SUBSIDY_UNPUBLISHED.length).toBeGreaterThanOrEqual(3)
    for (const item of SUBSIDY_UNPUBLISHED) expect(item.why.length).toBeGreaterThan(40)
    // El proyecto de ley de los jubilados tiene que seguir declarado como proyecto: es el error
    // que esta página existe para no cometer.
    expect(SUBSIDY_UNPUBLISHED.map(item => item.id)).toContain('jubilados')
  })

  it('lista los requisitos y los grupos prioritarios con su detalle', () => {
    expect(SUBSIDY_REQUIREMENTS.length).toBeGreaterThanOrEqual(5)
    for (const requirement of SUBSIDY_REQUIREMENTS)
      expect(requirement.detail.length).toBeGreaterThan(30)
    expect(SUBSIDY_PRIORITY_GROUPS.length).toBe(2)
  })
})
