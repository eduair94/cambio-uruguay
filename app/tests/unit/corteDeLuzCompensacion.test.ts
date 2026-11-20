import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  CORTE_LUZ_EXCLUIDOS,
  CORTE_LUZ_FAQ,
  CORTE_LUZ_MECANISMO,
  CORTE_LUZ_NO_PUBLICADO,
  CORTE_LUZ_PATH,
  CORTE_LUZ_RECLAMO,
  CORTE_LUZ_SOURCES,
  CORTE_LUZ_TITLE,
  CORTE_LUZ_VERIFIED_AT,
  CORRECCION_PLAZO_DIAS,
  ESPERA_ANTES_DE_URSEA_DIAS_HABILES,
  FUERZA_MAYOR_PLAZO_DIAS_HABILES,
  PROGRAMADOS_TOPE_PCT,
  RETRASO_PROMEDIO_MESES,
  RETRASO_RESPUESTA_PCT_DIARIO,
  corteDeLuzDescription,
} from '../../utils/corteDeLuzCompensacion'

const PAGE = readFileSync(
  join(__dirname, '..', '..', 'pages', 'compensacion-por-corte-de-luz-uruguay.vue'),
  'utf8'
)

/**
 * Los números que la página publica salen de artículos del Reglamento de Calidad del Servicio de
 * Distribución de Energía Eléctrica, no de una nota de prensa, y son los únicos que esta página
 * puede sostener: viven en el CUERPO del reglamento y no en las Tablas 1 y 2, que las Resoluciones
 * URSEA 88/005 y 36/006 modificaron y cuyo texto ordenado vigente URSEA publica como PDF escaneado.
 *
 * Si alguien cambia uno de estos valores, lo que tiene que cambiar primero es la fuente.
 */
describe('las cifras salen del reglamento y no de ningún otro lado', () => {
  it('fija el 30 % diario por demora en la respuesta (art. 62)', () => {
    expect(RETRASO_RESPUESTA_PCT_DIARIO).toBe(30)
    expect(RETRASO_PROMEDIO_MESES).toBe(6)
  })

  it('fija los 15 días hábiles antes de ir a URSEA', () => {
    expect(ESPERA_ANTES_DE_URSEA_DIAS_HABILES).toBe(15)
  })

  it('fija los 3 días hábiles para declarar fuerza mayor (art. 14)', () => {
    expect(FUERZA_MAYOR_PLAZO_DIAS_HABILES).toBe(3)
  })

  it('fija los 120 días de corrección (art. 49) y el tope de programados (art. 13)', () => {
    expect(CORRECCION_PLAZO_DIAS).toBe(120)
    expect(PROGRAMADOS_TOPE_PCT).toBe(15)
  })
})

describe('el snippet entra en el SERP y trae los números', () => {
  const description = corteDeLuzDescription()

  it('el título entra en 60 caracteres con la marca', () => {
    expect(`${CORTE_LUZ_TITLE} | Cambio Uruguay`.length).toBeLessThanOrEqual(60)
  })

  it('la descripción entra en 155 caracteres', () => {
    expect(description.length).toBeLessThanOrEqual(155)
  })

  /**
   * La regla de oro medida en este sitio: una descripción con el número del día corre a ~1,4 % y una
   * genérica a 0,03–0,2 %. Acá los números son los dos verificados, y además la descripción tiene
   * que abrir por la respuesta —que la compensación no se pide—, que es la expectativa que corrige.
   */
  it('la descripción trae las dos cifras y abre por la respuesta', () => {
    expect(description).toContain(`${RETRASO_RESPUESTA_PCT_DIARIO} %`)
    expect(description).toContain(String(ESPERA_ANTES_DE_URSEA_DIAS_HABILES))
    expect(description).toMatch(/^La compensación por cortes no se pide/)
  })

  it('no promete un umbral de horas, que es lo que no se puede verificar', () => {
    expect(description).not.toMatch(/\bhoras\b/i)
  })
})

describe('la página declara su SEO y su rastro', () => {
  it('tiene canonical absoluto sobre su propia ruta', () => {
    expect(PAGE).toContain("rel: 'canonical'")
    // La página lo arma como `https://cambio-uruguay.com${CORTE_LUZ_PATH}`, así que lo que se exige
    // es el host absoluto —un canonical relativo lo ignora Google— y que la ruta la ponga esta
    // constante, no un literal que pueda separarse de ella en silencio.
    expect(PAGE).toContain('https://cambio-uruguay.com${CORTE_LUZ_PATH}')
    expect(CORTE_LUZ_PATH).toBe('/compensacion-por-corte-de-luz-uruguay')
  })

  it('emite BreadcrumbList y FAQPage', () => {
    expect(PAGE).toContain('application/ld+json')
    expect(PAGE).toContain('BreadcrumbList')
    expect(PAGE).toContain('FAQPage')
  })

  it('tiene un solo h1', () => {
    expect((PAGE.match(/<h1[\s>]/g) ?? []).length).toBe(1)
  })

  it('no se autoexcluye del índice', () => {
    expect(PAGE).not.toMatch(/noindex/i)
  })
})

describe('todo lo que se afirma tiene de dónde', () => {
  it('cada paso del mecanismo y del reclamo cita su artículo o su ficha', () => {
    for (const paso of [...CORTE_LUZ_MECANISMO, ...CORTE_LUZ_RECLAMO]) {
      expect(paso.basis.trim().length, paso.title).toBeGreaterThan(0)
      expect(paso.basis, paso.title).toMatch(/arts?\.|Título|gub\.uy|URSEA/)
    }
  })

  it('las tres fuentes son oficiales y con URL', () => {
    expect(CORTE_LUZ_SOURCES.length).toBeGreaterThanOrEqual(3)
    for (const source of CORTE_LUZ_SOURCES) {
      expect(source.url, source.label).toMatch(/^https:\/\/(www\.)?(impo\.com\.uy|gub\.uy)\//)
      expect(source.label.length, source.url).toBeGreaterThan(20)
    }
  })

  it('la fecha de verificación es una fecha ISO', () => {
    expect(CORTE_LUZ_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  /**
   * El bloque que más vale de esta página: lo que NO publica. Si alguien lo vacía, lo que queda es
   * una página que promete el umbral de horas sin tenerlo, que es el error que el repo evita a
   * propósito en varias páginas.
   */
  it('dice en la página qué no publica, incluido el umbral de horas', () => {
    expect(CORTE_LUZ_NO_PUBLICADO.length).toBeGreaterThanOrEqual(3)
    const labels = CORTE_LUZ_NO_PUBLICADO.map(item => item.label).join(' ')
    expect(labels).toMatch(/horas/i)
    const detalles = CORTE_LUZ_NO_PUBLICADO.map(item => item.detail).join(' ')
    expect(detalles).toContain('88/005')
    expect(detalles).toContain('36/006')
  })
})

describe('la fuerza mayor se cuenta entera', () => {
  const texto = CORTE_LUZ_EXCLUIDOS.map(item => `${item.label} ${item.detail}`).join(' ')

  it('trae los cuatro supuestos de pleno derecho del art. 13', () => {
    expect(texto).toContain('45 °C')
    expect(texto).toContain('−10 °C')
    expect(texto).toContain('130 km/h')
    expect(texto).toMatch(/inundaciones/i)
  })

  /**
   * La mitad que nadie cuenta: la fuerza mayor no es automática para el distribuidor. Si UTE no la
   * notifica en plazo, el art. 14 la considera renunciada y esas horas vuelven al cómputo. Una lista
   * de exclusiones sin esta línea deja al lector creyendo que todo temporal borra su derecho.
   */
  it('dice que UTE la pierde si no la declara en plazo', () => {
    expect(texto).toMatch(/renuncia/i)
    expect(texto).toContain(`${FUERZA_MAYOR_PLAZO_DIAS_HABILES} días hábiles`)
  })
})

describe('la FAQ contesta y no se contradice con el cuerpo', () => {
  it('cada pregunta tiene respuesta', () => {
    expect(CORTE_LUZ_FAQ.length).toBeGreaterThanOrEqual(5)
    for (const faq of CORTE_LUZ_FAQ) {
      expect(faq.question.endsWith('?'), faq.question).toBe(true)
      expect(faq.answer.length, faq.question).toBeGreaterThan(80)
    }
  })

  it('la primera contesta que no hay trámite', () => {
    expect(CORTE_LUZ_FAQ[0]!.answer).toMatch(/^No\./)
  })

  it('ninguna respuesta afirma un umbral de horas de corte', () => {
    for (const faq of CORTE_LUZ_FAQ) {
      expect(faq.answer, faq.question).not.toMatch(/\b\d+\s*horas\b/i)
    }
  })
})
