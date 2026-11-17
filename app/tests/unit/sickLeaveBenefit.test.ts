// El motor del subsidio por enfermedad (`utils/sickLeaveBenefit.ts`), que alimenta
// `/herramientas/calculadora-subsidio-por-enfermedad`.
//
// Las cifras de este régimen no se calculan: se copian del BPS con su fecha, por la cadena de tres
// normas que el encabezado del módulo documenta (art. 27 del Decreto-Ley 14.407 → Ley 18.725 →
// Ley 19.003). Así que lo que se fija acá es (a) que el tope siga siendo el que el BPS publica y no
// una multiplicación de la BPC, (b) las tres reglas que mueven plata —el 70 %, los tres días sin
// cubrir y la doceava de aguinaldo— y (c) que la página publique los mismos números que el módulo.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { URUGUAY } from '../../utils/calculators'
import { getTool } from '../../utils/tools'
import {
  DAYS_PER_MONTH,
  SICK_LEAVE_AGUINALDO_DIVISOR,
  SICK_LEAVE_CAP_SINCE,
  SICK_LEAVE_MONTHLY_CAP,
  SICK_LEAVE_RATE,
  SICK_LEAVE_RURAL_PATRON_CAP,
  SICK_LEAVE_VERIFIED_AT,
  SICK_LEAVE_WAITING_DAYS,
  baseWhereCapBites,
  computeSickLeave,
} from '../../utils/sickLeaveBenefit'

const MAX_DESCRIPTION = 155
const MAX_TITLE = 60

describe('las cifras que publica el BPS', () => {
  it('copia el tope de enero de 2026 y su vigencia, sin calcularlo', () => {
    expect(SICK_LEAVE_MONTHLY_CAP).toBe(67754)
    expect(SICK_LEAVE_CAP_SINCE).toBe('01/2026')
    expect(SICK_LEAVE_RURAL_PATRON_CAP).toBe(40655)
    expect(SICK_LEAVE_VERIFIED_AT).toBe('2026-11-17')
  })

  // La trampa que `unemploymentBenefit.ts` ya documenta: la Ley 19.003 re-basó el tope, así que la
  // cantidad de BPC de la escala de la Ley 18.725 ya no da el número que se paga. Si alguien algún
  // día "simplifica" el tope a `8 * URUGUAY.bpc`, la página empieza a publicar $ 12.842 de menos.
  it('el tope NO es ocho BPC, que es lo que diría la escala original', () => {
    expect(8 * URUGUAY.bpc).not.toBe(SICK_LEAVE_MONTHLY_CAP)
    expect(SICK_LEAVE_MONTHLY_CAP).toBeGreaterThan(8 * URUGUAY.bpc)
  })

  it('el 70 %, los tres días y la doceava son las del decreto-ley y su reglamento', () => {
    expect(SICK_LEAVE_RATE).toBe(0.7)
    expect(SICK_LEAVE_WAITING_DAYS).toBe(3)
    expect(SICK_LEAVE_AGUINALDO_DIVISOR).toBe(12)
  })
})

describe('computeSickLeave', () => {
  it('paga el 70 % y descuenta los tres primeros días de la certificación', () => {
    const r = computeSickLeave({ monthlyBase: 60000, certifiedDays: 10 })
    expect(r.grossMonthly).toBe(42000)
    expect(r.monthly).toBe(42000)
    expect(r.cappedByTope).toBe(false)
    expect(r.unpaidDays).toBe(3)
    expect(r.paidDays).toBe(7)
    expect(r.daily).toBe(1400)
    expect(r.subsidy).toBe(9800)
    // La doceava parte del subsidio, Decreto 7/976 art. 12.
    expect(r.aguinaldoShare).toBe(816.67)
    expect(r.total).toBe(10616.67)
    expect(r.lostToWaitingDays).toBe(4200)
  })

  it('con internación paga desde el primer día', () => {
    const r = computeSickLeave({ monthlyBase: 60000, certifiedDays: 10, hospitalized: true })
    expect(r.unpaidDays).toBe(0)
    expect(r.paidDays).toBe(10)
    expect(r.subsidy).toBe(14000)
    expect(r.lostToWaitingDays).toBe(0)
  })

  it('recorta por el tope en vez de pagar el 70 % de una base alta', () => {
    const r = computeSickLeave({ monthlyBase: 200000, certifiedDays: 33 })
    expect(r.grossMonthly).toBe(140000)
    expect(r.monthly).toBe(SICK_LEAVE_MONTHLY_CAP)
    expect(r.cappedByTope).toBe(true)
    expect(r.daily).toBe(Math.round((SICK_LEAVE_MONTHLY_CAP / DAYS_PER_MONTH) * 100) / 100)
  })

  it('el tope empieza a morder donde el 70 % lo alcanza', () => {
    const at = baseWhereCapBites()
    expect(at).toBe(96791.43)
    expect(computeSickLeave({ monthlyBase: at - 1000, certifiedDays: 10 }).cappedByTope).toBe(false)
    expect(computeSickLeave({ monthlyBase: at + 1000, certifiedDays: 10 }).cappedByTope).toBe(true)
  })

  it('una certificación de tres días o menos no cobra nada, y lo dice', () => {
    const r = computeSickLeave({ monthlyBase: 60000, certifiedDays: 3 })
    expect(r.paidDays).toBe(0)
    expect(r.unpaidDays).toBe(3)
    expect(r.total).toBe(0)
    expect(r.lostToWaitingDays).toBe(4200)

    const dos = computeSickLeave({ monthlyBase: 60000, certifiedDays: 2 })
    expect(dos.unpaidDays).toBe(2)
    expect(dos.paidDays).toBe(0)
  })

  it('no explota con lo que un input numérico puede mandar', () => {
    for (const bad of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const r = computeSickLeave({ monthlyBase: bad, certifiedDays: bad })
      expect(Number.isFinite(r.total)).toBe(true)
      expect(r.total).toBe(0)
      expect(r.paidDays).toBe(0)
    }
  })

  it('los días se truncan: medio día certificado no existe', () => {
    expect(computeSickLeave({ monthlyBase: 60000, certifiedDays: 10.9 }).paidDays).toBe(7)
  })
})

describe('la ficha de la calculadora en el catálogo', () => {
  const tool = getTool('calculadora-subsidio-por-enfermedad')

  it('existe y vive bajo /herramientas', () => {
    expect(tool).toBeDefined()
    expect(tool!.to).toBeUndefined()
    expect(tool!.category).toBe('finanzas')
  })

  it('la descripción publica el 70 %, el tope con su vigencia y el cuarto día', () => {
    const description = tool!.description
    expect(description).toContain('70 %')
    expect(description).toContain('67.754')
    expect(description).toContain(SICK_LEAVE_CAP_SINCE)
    expect(description).toContain('cuarto día')
  })

  it('título y descripción entran en el SERP', () => {
    expect(`${tool!.title} | Cambio Uruguay`.length).toBeLessThanOrEqual(MAX_TITLE)
    expect(tool!.description.length, tool!.description).toBeLessThanOrEqual(MAX_DESCRIPTION)
  })

  // El tope del snippet es el mismo literal que el módulo. Si el BPS reajusta en enero y alguien
  // toca sólo la constante, esto delata la copia vieja antes de que el SERP publique dos cifras.
  it('el tope de la descripción es la constante del módulo', () => {
    const asProse = SICK_LEAVE_MONTHLY_CAP.toLocaleString('es-UY')
    expect(tool!.description).toContain(asProse)
  })
})

describe('la página de la calculadora', () => {
  const source = readFileSync(
    join(__dirname, '..', '..', 'pages', 'herramientas', 'calculadora-subsidio-por-enfermedad.vue'),
    'utf8'
  )

  it('no escribe ninguna cifra a mano: todas salen del módulo', () => {
    expect(source).toContain("from '~/utils/sickLeaveBenefit'")
    expect(source).not.toContain('67.754')
    expect(source).not.toContain('67754')
  })

  it('declara el divisor diario como estimación propia, porque ninguna norma lo fija', () => {
    // La frase va buscada en el FAQ, que es una sola línea: la del cuerpo la parte prettier.
    expect(source).toContain('ninguna de las dos normas fija cuántos días tiene el mes')
    expect(source).toContain('daysPerMonth')
  })

  it('avisa que el monto es nominal: el BPS descuenta aportes al pagar', () => {
    expect(source).toContain('nominal')
    expect(source).toContain('arts. 6 y 8')
  })

  it('cita las cuatro fuentes oficiales', () => {
    expect(source).toContain('https://www.bps.gub.uy/4774/subsidio-por-enfermedad.html')
    expect(source).toContain('https://www.impo.com.uy/bases/decretos-ley/14407-1975')
    expect(source).toContain('https://www.impo.com.uy/bases/decretos/7-1976')
    expect(source).toContain('https://www.impo.com.uy/bases/leyes/18725-2011/2')
  })
})
