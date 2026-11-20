import { describe, expect, it } from 'vitest'

import {
  DOMESTIC_WORK_CATEGORIES,
  DOMESTIC_WORK_CONTRIBUTIONS,
  DOMESTIC_WORK_FLOOR_MONTHLY,
  DOMESTIC_WORK_HEALTH_MINIMUM,
  DOMESTIC_WORK_LEGAL_LIMITS,
  DOMESTIC_WORK_SOURCES,
  DOMESTIC_WORK_WAGE_PERIOD,
  domesticWorkCategory,
} from '../../utils/domesticWork'
import { getGuide } from '../../utils/guides'

/**
 * Las cifras de `/guias/trabajo-domestico-uruguay`, contra su fuente primaria.
 *
 * Son dos clases de número y caducan distinto. Los mínimos del Grupo 21 tienen fecha de
 * vencimiento escrita (31/12/2026) y los porcentajes de aporte no, pero cambian por decreto sin
 * avisar. El riesgo que este archivo cubre no es que estén mal hoy: es que alguien edite la PROSA
 * de la guía y deje `utils/domesticWork.ts` con el número viejo, o al revés, y el sitio pase a
 * decir dos cosas sobre el mismo laudo. Por eso la guía COMPONE sus tablas y su título desde el
 * catálogo, y lo que se verifica acá es que siga haciéndolo.
 *
 * Y se vigila la otra mitad, que es lo que esta guía existe para no hacer: no se publica un total
 * «lo que sale por mes», ni Fonasa en pesos, ni el mínimo de la categoría general al 30/6/2026 que
 * el MTSS no publica, ni los ejemplos de aportación del folleto del BPS como si fueran de hoy.
 */
const SLUG = 'trabajo-domestico-uruguay'

describe('el catálogo del trabajo doméstico', () => {
  it('tiene las tres categorías que rigen desde el 1/7/2026, ordenadas por mínimo', () => {
    expect(DOMESTIC_WORK_CATEGORIES.map(category => category.slug)).toEqual([
      'general',
      'cocina',
      'cuidados',
    ])
    const mensuales = DOMESTIC_WORK_CATEGORIES.map(category => category.monthlyUyu)
    const porHora = DOMESTIC_WORK_CATEGORIES.map(category => category.hourlyUyu)
    expect(mensuales).toEqual([...mensuales].sort((a, b) => a - b))
    expect(porHora).toEqual([...porHora].sort((a, b) => a - b))
    expect(DOMESTIC_WORK_FLOOR_MONTHLY).toBe(32051)
  })

  it('publica los valores del comunicado R 14/2026, mensual y por hora', () => {
    expect(domesticWorkCategory('general')).toMatchObject({ monthlyUyu: 32051, hourlyUyu: 169 })
    expect(domesticWorkCategory('cocina')).toMatchObject({ monthlyUyu: 33796, hourlyUyu: 178 })
    expect(domesticWorkCategory('cuidados')).toMatchObject({ monthlyUyu: 34885, hourlyUyu: 184 })
    expect(domesticWorkCategory('sin-categoria')).toBeUndefined()
  })

  /**
   * El BPS publica el mensual y el por hora por separado, así que no hay una fórmula que derive
   * uno del otro: el cociente da ~189,7 horas donde 44 h semanales por 52/12 darían 190,67. No se
   * puede exigir una igualdad, pero sí que el cociente caiga en la banda que esa relación admite,
   * y eso es exactamente lo que atrapa un dígito transpuesto en cualquiera de las dos columnas.
   */
  it('mantiene el mensual y el por hora a una distancia plausible', () => {
    for (const category of DOMESTIC_WORK_CATEGORIES) {
      const horas = category.monthlyUyu / category.hourlyUyu
      expect(horas, `${category.slug}: ${horas.toFixed(1)} h`).toBeGreaterThan(185)
      expect(horas, `${category.slug}: ${horas.toFixed(1)} h`).toBeLessThan(195)
    }
  })

  it('declara la vigencia junto con los montos, no sólo en prosa', () => {
    expect(DOMESTIC_WORK_WAGE_PERIOD.from).toBe('2026-07-01')
    expect(DOMESTIC_WORK_WAGE_PERIOD.to).toBe('2026-12-31')
    expect(DOMESTIC_WORK_WAGE_PERIOD.label).toContain('31/12/2026')
  })

  it('lleva el cuadro de aportes con el jubilatorio que suma 22,5 %', () => {
    const jubilatorio = DOMESTIC_WORK_CONTRIBUTIONS.find(
      row => row.concept === 'Aporte jubilatorio'
    )
    expect(jubilatorio).toMatchObject({ personal: '15 %', employer: '7,5 %' })
    for (const row of DOMESTIC_WORK_CONTRIBUTIONS) {
      expect(row.concept.trim().length).toBeGreaterThan(0)
      expect(row.personal.trim().length).toBeGreaterThan(0)
      expect(row.employer.trim().length).toBeGreaterThan(0)
    }
  })

  it('no le pone un número cerrado a Fonasa', () => {
    const fonasa = DOMESTIC_WORK_CONTRIBUTIONS.find(row => row.concept === 'Fonasa')
    expect(fonasa?.personal).toBe('3 % a 8 %')
    expect(fonasa?.employer).toContain('complemento de cuota mutual')
    expect(fonasa?.note).toBeTruthy()
  })

  it('escribe el umbral de salud en jornales, horas y BPC, nunca en pesos', () => {
    expect(DOMESTIC_WORK_HEALTH_MINIMUM).toEqual({ jornales: 13, monthlyHours: 104, bpc: 1.25 })
  })

  it('cita el artículo de la Ley 18.065 en cada límite legal', () => {
    expect(DOMESTIC_WORK_LEGAL_LIMITS.length).toBeGreaterThanOrEqual(7)
    for (const limit of DOMESTIC_WORK_LEGAL_LIMITS)
      expect(limit.article, limit.label).toMatch(/^art\. \d+$/)
  })

  it('cita BPS, MTSS e IMPO, todas con URL absoluta de un organismo oficial', () => {
    const urls = DOMESTIC_WORK_SOURCES.map(source => source.url)
    expect(urls.length).toBeGreaterThanOrEqual(6)
    for (const url of urls)
      expect(url).toMatch(/^https:\/\/(www\.bps\.gub\.uy|www\.gub\.uy|www\.impo\.com\.uy)\//)
    expect(urls).toContain(
      'https://www.bps.gub.uy/bps/file/24374/2/2026---comunicado-r-14---trabajo-domestico-aumento-salarial-julio-2026.pdf'
    )
    expect(urls).toContain('https://www.impo.com.uy/bases/leyes/18065-2006')
    expect(
      urls.some(url =>
        url.startsWith(
          'https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/trabajo-domestico'
        )
      )
    ).toBe(true)
  })
})

describe('la guía del trabajo doméstico', () => {
  const guide = getGuide(SLUG)

  it('está en el catálogo, con fuentes y preguntas', () => {
    expect(guide).toBeDefined()
    expect(guide!.sources?.length ?? 0).toBeGreaterThanOrEqual(6)
    expect(guide!.faqs?.length ?? 0).toBeGreaterThanOrEqual(5)
    expect(guide!.sections.length).toBeGreaterThanOrEqual(7)
  })

  it('entra en el SERP: título y descripción dentro de presupuesto, con la cifra adelante', () => {
    expect(`${guide!.title} | Cambio Uruguay`.length).toBeLessThanOrEqual(60)
    expect(guide!.description.length).toBeLessThanOrEqual(155)
    // La regla de oro: el número del día, no un adjetivo.
    expect(guide!.title).toContain('32.051')
    expect(guide!.description).toContain('32.051')
  })

  it('compone sus montos desde el catálogo: no hay un segundo literal que pueda separarse', () => {
    const texto = JSON.stringify(guide)
    for (const category of DOMESTIC_WORK_CATEGORIES) {
      const mensual = category.monthlyUyu.toLocaleString('es-UY')
      expect(texto, `falta ${category.slug}: ${mensual}`).toContain(mensual)
      expect(texto, `falta el valor por hora de ${category.slug}`).toContain(
        String(category.hourlyUyu)
      )
    }
  })

  it('dice qué fuente oficial eligió cuando dos dicen distinto', () => {
    const texto = JSON.stringify(guide)
    expect(texto).toContain('32.875')
    expect(texto).toContain('33.935')
    expect(texto).toContain('es el organismo que liquida')
  })

  it('no publica un total mensual ni Fonasa en pesos', () => {
    const texto = JSON.stringify(guide)
    expect(texto).toContain('no hay un total')
    expect(texto).toContain('un total promedio no describe a ningún hogar')
  })

  it('marca los ejemplos del folleto del BPS como mecanismo y no como referencia', () => {
    const texto = JSON.stringify(guide)
    expect(texto).toContain('4.628')
    expect(texto).toContain('sirven para ver el mecanismo')
  })

  it('cita textualmente los artículos 2 y 4 de la Ley 18.065', () => {
    const texto = JSON.stringify(guide)
    expect(texto).toContain('ocho horas diarias, y de cuarenta y cuatro horas semanales')
    expect(texto).toContain('treinta y seis horas ininterrumpidas')
  })

  it('no afirma la indemnización del embarazo por su cuenta', () => {
    const texto = JSON.stringify(guide)
    expect(texto).toContain('que el BPS cuantifica en 6 sueldos')
  })
})
