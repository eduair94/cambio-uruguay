import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  LATEST_RENT_ADJUSTMENT,
  RENT_ADJUSTMENT_MONTHS,
  RENT_ADJUSTMENT_PATH,
  RENT_ADJUSTMENT_VERIFIED_AT,
  adjustedRent,
  formatRentAdjustmentCoefficient,
  formatRentAdjustmentPercent,
  rentAdjustmentFor,
  rentAdjustmentPercent,
} from '../../utils/rentAdjustment'
import { titleFits } from '../../utils/liveRateSeo'

const PAGE = readFileSync(
  join(__dirname, '..', '..', 'pages', 'coeficiente-de-reajuste-de-alquileres-uruguay.vue'),
  'utf8'
)

describe('la serie del coeficiente de reajuste de alquileres', () => {
  it('va del mes más nuevo al más viejo, sin huecos ni repetidos', () => {
    const meses = RENT_ADJUSTMENT_MONTHS.map(entry => entry.month)
    expect(meses).toEqual([...meses].sort().reverse())
    expect(new Set(meses).size).toBe(meses.length)
    // Diez meses seguidos de 2026: si alguien suma el siguiente, la cuenta sube y nada más se mueve.
    expect(meses).toEqual([
      '2026-10',
      '2026-09',
      '2026-08',
      '2026-07',
      '2026-06',
      '2026-05',
      '2026-04',
      '2026-03',
      '2026-02',
      '2026-01',
    ])
  })

  it('cada fila trae su decreto y la ficha de IMPO que la sostiene', () => {
    for (const entry of RENT_ADJUSTMENT_MONTHS) {
      // La forma del número de decreto de IMPO: `256/026`.
      expect(entry.decree, entry.month).toMatch(/^\d{1,3}\/0\d{2}$/)
      // La URL es la ficha del MISMO decreto, no una página genérica: si se despegan, una fila
      // quedaría citando el decreto de otro mes, que es el único error que acá no se puede ver a ojo.
      const [numero, anio] = entry.decree.split('/') as [string, string]
      expect(entry.decreeUrl, entry.month).toBe(
        `https://www.impo.com.uy/bases/decretos/${numero}-2${anio}`
      )
      // Ningún coeficiente plausible: por debajo de 1 el alquiler bajaría y por encima de 1,5 sería
      // un 50 % anual. Es una guarda de forma, no una afirmación sobre el mercado.
      expect(entry.coefficient, entry.month).toBeGreaterThan(1)
      expect(entry.coefficient, entry.month).toBeLessThan(1.5)
      expect(entry.label, entry.month).toMatch(/^[a-záéíóú]+ de \d{4}$/)
    }
  })

  it('el último es el primero de la lista', () => {
    expect(LATEST_RENT_ADJUSTMENT).toBe(RENT_ADJUSTMENT_MONTHS[0])
    expect(LATEST_RENT_ADJUSTMENT.month).toBe('2026-10')
    expect(LATEST_RENT_ADJUSTMENT.decree).toBe('256/026')
  })

  it('el día de la lectura es una fecha, no `new Date()`', () => {
    expect(RENT_ADJUSTMENT_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('la aritmética del reajuste', () => {
  it('el por ciento sale del coeficiente con dos decimales exactos', () => {
    expect(rentAdjustmentPercent(1.0468)).toBe(4.68)
    expect(rentAdjustmentPercent(1.0294)).toBe(2.94)
    expect(formatRentAdjustmentPercent(1.0468)).toBe('4,68 %')
    expect(formatRentAdjustmentCoefficient(1.0468)).toBe('1,0468')
    // 1,03 son 3,00 % y no «3 %»: los dos decimales son los del coeficiente, no un adorno.
    expect(formatRentAdjustmentPercent(1.03)).toBe('3,00 %')
  })

  it('el alquiler reajustado se redondea al peso', () => {
    expect(adjustedRent(20000, 1.0468)).toBe(20936)
    expect(adjustedRent(23500, 1.0468)).toBe(24600)
  })

  it('un alquiler que no es un monto no devuelve cero: devuelve nada', () => {
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY])
      expect(adjustedRent(bad, 1.0468)).toBeNull()
  })

  it('busca un mes de la serie y no inventa el que falta', () => {
    expect(rentAdjustmentFor('2026-01')?.decree).toBe('23/026')
    expect(rentAdjustmentFor('2026-11')).toBeNull()
  })
})

/**
 * El título y la descripción de la página son literales, que es la forma que leen los dos
 * presupuestos de snippet sin ejecutar la app. El riesgo de un literal es que envejezca en silencio
 * cuando se sume el mes siguiente a la serie, y esto es lo que lo impide.
 */
describe('el snippet de la página no se despega del último decreto', () => {
  const percent = formatRentAdjustmentPercent(LATEST_RENT_ADJUSTMENT.coefficient)
  const coefficient = formatRentAdjustmentCoefficient(LATEST_RENT_ADJUSTMENT.coefficient)
  const [mes] = LATEST_RENT_ADJUSTMENT.label.split(' de ') as [string]

  it('el título nombra el mes y el aumento del último coeficiente', () => {
    expect(PAGE).toContain(`const title = 'Reajuste de alquileres: ${mes}, ${percent}'`)
  })

  it('el título entra en el SERP para cualquier mes y un aumento de dos cifras', () => {
    for (const nombre of RENT_ADJUSTMENT_MONTHS.map(entry => entry.label.split(' de ')[0]!))
      expect(titleFits(`Reajuste de alquileres: ${nombre}, ${percent}`), nombre).toBe(true)
    // El peor caso realista: el mes más largo del año y un aumento de dos cifras enteras.
    expect(titleFits('Reajuste de alquileres: setiembre, 12,34 %')).toBe(true)
    expect(titleFits('Reajuste de alquileres: diciembre, 12,34 %')).toBe(true)
  })

  it('la descripción nombra el coeficiente, el aumento y el decreto', () => {
    const description = PAGE.match(/const description =\n\s+'([^']+)'/)?.[1]
    expect(description).toBeDefined()
    expect(description).toContain(LATEST_RENT_ADJUSTMENT.label)
    expect(description).toContain(percent)
    expect(description).toContain(coefficient)
    expect(description).toContain(LATEST_RENT_ADJUSTMENT.decree)
    expect(description).toContain(`${RENT_ADJUSTMENT_MONTHS.length} meses`)
    expect(description!.length).toBeLessThanOrEqual(155)
  })

  it('la canónica es la ruta del catálogo, absoluta', () => {
    expect(PAGE).toContain(
      'const canonicalUrl = `https://cambio-uruguay.com${RENT_ADJUSTMENT_PATH}`'
    )
    expect(RENT_ADJUSTMENT_PATH).toBe('/coeficiente-de-reajuste-de-alquileres-uruguay')
  })
})
