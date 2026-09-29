// El catálogo de peajes de `/peajes-uruguay`.
//
// Lo que se vigila acá NO es que las cifras sean las de hoy —eso lo decide la fuente y se
// reverifica a mano—, sino las tres cosas que pueden romperse sin que nadie lo note:
//
//   1. Que la relación entre las tres tarifas siga siendo la que ordena toda la página. Si un
//      ajuste dejara el SUCIVE por debajo del Telepeaje, el titular («el mismo paso tiene tres
//      precios y el SUCIVE es el caro») pasaría a ser falso y la página lo seguiría diciendo.
//   2. Que la aritmética del viaje cuente las pasadas como las cuenta la tarifa: es «en cada
//      sentido», así que una ida y vuelta por dos peajes son cuatro pasadas y no dos.
//   3. Que cada cifra publicada tenga fuente: el archivo no puede quedarse sin la lista, y las
//      fuentes tienen que ser de los dominios que el sitio acepta para normativa uruguaya.
import { describe, expect, it } from 'vitest'
import {
  TOLL_CATEGORIES,
  TOLL_CAR_CATEGORY_ID,
  TOLL_DISCOUNTS,
  TOLL_DISCOUNT_ZONE_2_TOWNS,
  TOLL_EXEMPTIONS,
  TOLL_FAQ,
  TOLL_LOCAL_EXEMPTIONS,
  TOLL_PLAZAS,
  TOLL_SOURCES,
  TOLL_NEXT_ADJUSTMENT,
  TOLL_TARIFF_EFFECTIVE_FROM,
  TOLLS_VERIFIED_AT,
  suciveSurchargePct,
  telepeajeSavingUyu,
  tollCategory,
  tollPlazasByRoute,
  tollPrice,
  tollTripCostUyu,
} from '../../utils/tolls'

describe('el cuadro de tarifas', () => {
  it('trae las siete categorías del MTOP, numeradas 1 a 7', () => {
    expect(TOLL_CATEGORIES.map(category => category.id)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('mantiene el orden que sostiene el titular: Telepeaje < básica < SUCIVE', () => {
    for (const category of TOLL_CATEGORIES) {
      expect(category.telepeajeUyu, `cat ${category.id}`).toBeLessThan(category.basicaUyu)
      expect(category.basicaUyu, `cat ${category.id}`).toBeLessThan(category.suciveUyu)
    }
  })

  it('cobra el mismo precio a las categorías que la fuente empareja', () => {
    const [uno, dos, tres, cuatro, cinco] = TOLL_CATEGORIES
    expect(dos!.telepeajeUyu).toBe(uno!.telepeajeUyu)
    expect(cuatro!.telepeajeUyu).toBe(tres!.telepeajeUyu)
    expect(cinco!.telepeajeUyu).toBe(tres!.telepeajeUyu)
  })

  it('la categoría del auto existe y es la 1', () => {
    const car = tollCategory(TOLL_CAR_CATEGORY_ID)
    expect(car).toBeDefined()
    expect(car!.vehicles).toContain('Autos y camionetas')
    expect(tollCategory(99)).toBeUndefined()
  })

  it('elige el precio de cada forma de pago', () => {
    const car = tollCategory(TOLL_CAR_CATEGORY_ID)!
    expect(tollPrice(car, 'telepeaje')).toBe(car.telepeajeUyu)
    expect(tollPrice(car, 'basica')).toBe(car.basicaUyu)
    expect(tollPrice(car, 'sucive')).toBe(car.suciveUyu)
  })

  it('el recargo del SUCIVE sobre el TAG del auto redondea al 28 % que publica la página', () => {
    const car = tollCategory(TOLL_CAR_CATEGORY_ID)!
    expect(Math.round(suciveSurchargePct(car))).toBe(28)
    expect(telepeajeSavingUyu(car)).toBeCloseTo(29.57, 2)
  })
})

describe('el total de un viaje', () => {
  const car = tollCategory(TOLL_CAR_CATEGORY_ID)!

  it('cuenta la ida y vuelta como el doble de pasadas, porque la tarifa es en cada sentido', () => {
    expect(tollTripCostUyu(car, 'telepeaje', 2, false)).toBe(car.telepeajeUyu * 2)
    expect(tollTripCostUyu(car, 'telepeaje', 2, true)).toBe(car.telepeajeUyu * 4)
  })

  it('no inventa un costo con cero peajes ni con un número negativo o fraccionario', () => {
    expect(tollTripCostUyu(car, 'sucive', 0, true)).toBe(0)
    expect(tollTripCostUyu(car, 'sucive', -3, true)).toBe(0)
    expect(tollTripCostUyu(car, 'basica', 1.9, false)).toBe(car.basicaUyu)
  })
})

describe('los puestos de recaudación', () => {
  it('lista los quince que publica el MTOP, sin nombres repetidos', () => {
    expect(TOLL_PLAZAS).toHaveLength(15)
    expect(new Set(TOLL_PLAZAS.map(plaza => plaza.name)).size).toBe(15)
  })

  it('agrupa por ruta conservando el orden de aparición y sin perder ninguno', () => {
    const groups = tollPlazasByRoute()
    expect(groups.map(group => group.route)).toEqual([
      'Ruta 1',
      'Ruta 2',
      'Ruta 3',
      'Ruta 5',
      'Ruta 8',
      'Ruta 9',
      'Ruta 11',
      'Ruta Interbalnearia',
    ])
    expect(groups.reduce((total, group) => total + group.plazas.length, 0)).toBe(TOLL_PLAZAS.length)
  })

  it('no publica el departamento, que el listado oficial no trae', () => {
    for (const plaza of TOLL_PLAZAS) {
      expect(Object.keys(plaza).sort()).toEqual(['km', 'name', 'operator', 'route'])
    }
  })

  it('cada exoneración local apunta a un puesto que existe', () => {
    const names = new Set(TOLL_PLAZAS.map(plaza => plaza.name))
    for (const exemption of TOLL_LOCAL_EXEMPTIONS) expect(names).toContain(exemption.plaza)
    for (const town of TOLL_DISCOUNT_ZONE_2_TOWNS) expect(names).toContain(town.plaza)
  })
})

describe('bonificaciones y exoneraciones', () => {
  it('ordena las bonificaciones de mayor a menor y todas citan su artículo', () => {
    const percentages = TOLL_DISCOUNTS.map(discount => discount.pct)
    expect([...percentages].sort((a, b) => b - a)).toEqual(percentages)
    for (const discount of TOLL_DISCOUNTS) {
      expect(discount.pct).toBeGreaterThan(0)
      expect(discount.pct).toBeLessThanOrEqual(100)
      expect(discount.article).toMatch(/^art\. \d+$/)
    }
  })

  it('dice que las motos no pagan, que es el dato que la página pone arriba', () => {
    const minor = TOLL_EXEMPTIONS.find(exemption => exemption.who.includes('porte menor'))
    expect(minor).toBeDefined()
    expect(minor!.who).toContain('motos')
  })
})

describe('las fuentes y las fechas', () => {
  it('publica una fuente por cada cosa que la página afirma, y todas son oficiales', () => {
    expect(TOLL_SOURCES.length).toBeGreaterThanOrEqual(6)
    for (const source of TOLL_SOURCES) {
      expect(source.url).toMatch(/^https:\/\/(www\.)?(gub\.uy|impo\.com\.uy)\//)
      expect(source.label.length).toBeGreaterThan(10)
    }
    // Las dos patas: la tarifa la publica el MTOP, el régimen lo fija el decreto.
    expect(TOLL_SOURCES.some(source => source.url.includes('gub.uy'))).toBe(true)
    expect(
      TOLL_SOURCES.some(source => source.url.includes('impo.com.uy/bases/decretos/119-2023'))
    ).toBe(true)
  })

  it('las fechas son ISO y el próximo ajuste es posterior a la vigencia', () => {
    for (const date of [TOLLS_VERIFIED_AT, TOLL_TARIFF_EFFECTIVE_FROM, TOLL_NEXT_ADJUSTMENT])
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(TOLL_NEXT_ADJUSTMENT > TOLL_TARIFF_EFFECTIVE_FROM).toBe(true)
    expect(TOLLS_VERIFIED_AT >= TOLL_TARIFF_EFFECTIVE_FROM).toBe(true)
  })

  it('ninguna respuesta de la FAQ queda sin pregunta ni repetida', () => {
    expect(TOLL_FAQ.length).toBeGreaterThanOrEqual(5)
    const questions = TOLL_FAQ.map(item => item.question)
    expect(new Set(questions).size).toBe(questions.length)
    for (const item of TOLL_FAQ) {
      expect(item.question.endsWith('?')).toBe(true)
      expect(item.answer.length).toBeGreaterThan(40)
    }
  })
})
