import { describe, expect, it } from 'vitest'
import {
  CASH_LIMIT_SHARE_CAP_UI,
  CASH_LIMIT_SHARE_PCT,
  CASH_LIMIT_UI,
  RENT_BANK_RULE_FINE_MONTHS,
  RENT_BANK_RULE_FROM,
  RENT_BANK_RULE_REPEALED_ON,
  RENT_BANK_RULE_THRESHOLD_BPC,
  RENT_PAYMENT_ALL_RULES,
  RENT_PAYMENT_FAQ,
  RENT_PAYMENT_SOURCES,
  RENT_PAYMENT_STATUS_LABEL,
  RENT_PAYMENT_TIMELINE,
  RENT_PAYMENT_UNRESOLVED,
  RENT_PAYMENT_VERIFIED_ON,
  TOURIST_CASH_MAX_MONTHS,
  TOURIST_DEPOSIT_BUSINESS_DAYS,
  type RentPaymentStatus,
} from '../../utils/rentPaymentMeans'
import { RENT_CREDIT_PERCENT } from '../../utils/rentTaxCredit'

/**
 * El contrato de `/pagar-el-alquiler-en-efectivo-uruguay`.
 *
 * La página afirma algo fuerte —que no existe obligación legal de cobrar el alquiler por banco— y
 * eso se sostiene en una cadena de tres textos: el artículo que la creó, el artículo que lo derogó
 * y el reglamento que quedó colgando. Si alguien reescribe una de las tres citas, o le cambia el
 * estado a una regla, el test lo dice antes de que la página publique una conclusión sin respaldo.
 */
describe('las cifras son las de la norma, en la unidad de la norma', () => {
  it('fija el tope del régimen derogado en BPC y la multa en alquileres', () => {
    expect(RENT_BANK_RULE_THRESHOLD_BPC).toBe(40)
    expect(RENT_BANK_RULE_FINE_MONTHS).toBe(3)
  })

  it('fija el tope general de efectivo del art. 35 en UI', () => {
    expect(CASH_LIMIT_UI).toBe(200000)
    expect(CASH_LIMIT_SHARE_PCT).toBe(5)
    expect(CASH_LIMIT_SHARE_CAP_UI).toBe(450000)
  })

  it('fija las dos cifras del alquiler turístico', () => {
    expect(TOURIST_CASH_MAX_MONTHS).toBe(4)
    expect(TOURIST_DEPOSIT_BUSINESS_DAYS).toBe(1)
  })

  // El orden importa: la obligación no puede estar derogada antes de empezar a regir.
  it('ordena las dos fechas del régimen', () => {
    expect(RENT_BANK_RULE_FROM < RENT_BANK_RULE_REPEALED_ON).toBe(true)
    expect(RENT_BANK_RULE_FROM).toBe('2015-12-01')
    expect(RENT_BANK_RULE_REPEALED_ON).toBe('2020-07-09')
  })

  it('lleva una fecha de verificación con forma de fecha', () => {
    expect(RENT_PAYMENT_VERIFIED_ON).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('ninguna afirmación viaja sin su norma', () => {
  it('toda regla cita artículo, URL y estado', () => {
    expect(RENT_PAYMENT_ALL_RULES.length).toBeGreaterThanOrEqual(8)
    const estados: RentPaymentStatus[] = ['vigente', 'derogada', 'sin-base-legal', 'no-resuelto']
    for (const rule of RENT_PAYMENT_ALL_RULES) {
      expect(rule.heading.length, rule.id).toBeGreaterThan(10)
      expect(rule.body.length, rule.id).toBeGreaterThan(40)
      expect(rule.law, rule.id).toMatch(/art\./)
      expect(rule.url, rule.id).toMatch(/^https:\/\/www\.impo\.com\.uy\//)
      expect(estados, rule.id).toContain(rule.status)
    }
  })

  it('los identificadores no se repiten', () => {
    const ids = RENT_PAYMENT_ALL_RULES.map(rule => rule.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  // La cadena de la derogación es lo único que sostiene la conclusión de la página: las tres piezas
  // tienen que estar, y la del medio tiene que ser la LUC.
  it('publica la derogación expresa de la LUC, textual', () => {
    const derogacion = RENT_PAYMENT_ALL_RULES.find(rule => rule.id === 'derogacion')
    expect(derogacion?.status).toBe('derogada')
    expect(derogacion?.quote).toContain('Deróganse los artículos 36, 36 BIS, 39, 40')
    expect(derogacion?.url).toBe('https://www.impo.com.uy/bases/leyes/19889-2020/224')
  })

  it('no declara vigente el reglamento que quedó sin ley', () => {
    for (const id of ['decreto-264', 'irpf-reglamento']) {
      const rule = RENT_PAYMENT_ALL_RULES.find(item => item.id === id)
      expect(rule?.status, id).toBe('sin-base-legal')
    }
  })

  it('deja los dos huecos como no resueltos y no los contesta', () => {
    expect(RENT_PAYMENT_UNRESOLVED.length).toBeGreaterThanOrEqual(2)
    for (const rule of RENT_PAYMENT_UNRESOLVED) expect(rule.status).toBe('no-resuelto')
  })

  it('cada estado tiene etiqueta', () => {
    for (const rule of RENT_PAYMENT_ALL_RULES)
      expect(RENT_PAYMENT_STATUS_LABEL[rule.status], rule.id).toBeTruthy()
  })
})

describe('las fuentes son primarias y verificables', () => {
  it('todas son de impo.com.uy y ninguna se repite con la misma etiqueta', () => {
    expect(RENT_PAYMENT_SOURCES.length).toBeGreaterThanOrEqual(6)
    for (const source of RENT_PAYMENT_SOURCES) {
      expect(source.url).toMatch(/^https:\/\/www\.impo\.com\.uy\//)
      expect(source.label.length).toBeGreaterThan(15)
    }
    const labels = RENT_PAYMENT_SOURCES.map(source => source.label)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('nombra las tres piezas de la cadena y el artículo que sigue vigente', () => {
    const labels = RENT_PAYMENT_SOURCES.map(source => source.label).join(' | ')
    expect(labels).toContain('Ley 19.889 (LUC), art. 224')
    expect(labels).toContain('Ley 19.210, art. 39')
    expect(labels).toContain('Ley 19.210, art. 35')
    expect(labels).toContain('Decreto 264/015')
  })

  // El crédito del inquilino no se escribe a mano acá: si cambia en su propio módulo, cambia solo.
  it('el porcentaje del inquilino sale del catálogo del crédito fiscal', () => {
    const label = RENT_PAYMENT_SOURCES.find(source => source.url.endsWith('51_T7'))?.label ?? ''
    expect(label).toContain(`${RENT_CREDIT_PERCENT} %`)
  })
})

describe('la línea de tiempo cuenta la historia completa', () => {
  it('va en orden y termina en la derogación', () => {
    const fechas = RENT_PAYMENT_TIMELINE.map(event => event.on)
    expect([...fechas].sort()).toEqual(fechas)
    expect(RENT_PAYMENT_TIMELINE.at(-1)?.law).toContain('19.889')
  })

  it('cada hito lleva norma y URL', () => {
    for (const event of RENT_PAYMENT_TIMELINE) {
      expect(event.on).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(event.law.length).toBeGreaterThan(5)
      expect(event.url).toMatch(/^https:\/\/www\.impo\.com\.uy\//)
    }
  })
})

describe('las preguntas frecuentes contestan y no inventan', () => {
  it('cada una tiene pregunta y respuesta', () => {
    expect(RENT_PAYMENT_FAQ.length).toBeGreaterThanOrEqual(6)
    for (const faq of RENT_PAYMENT_FAQ) {
      expect(faq.question.endsWith('?'), faq.question).toBe(true)
      expect(faq.answer.length, faq.question).toBeGreaterThan(60)
    }
  })

  it('ninguna pregunta se repite', () => {
    const preguntas = RENT_PAYMENT_FAQ.map(faq => faq.question)
    expect(new Set(preguntas).size).toBe(preguntas.length)
  })

  /**
   * El barrido que importa. Los dos topes de esta página están en BPC y en UI, unidades que se
   * mueven todos los años, y el sitio tiene su valor en vivo. Un importe en pesos escrito acá
   * envejece sin que nadie lo note y es el error recurrente del repo: si hace falta mostrarlo en
   * pesos, se convierte en la página con el valor del día, no se congela en el catálogo.
   */
  it('no congela ningún importe en pesos', () => {
    const textos = [
      ...RENT_PAYMENT_FAQ.flatMap(faq => [faq.question, faq.answer]),
      ...RENT_PAYMENT_ALL_RULES.flatMap(rule => [rule.heading, rule.body, rule.quote ?? '']),
      ...RENT_PAYMENT_TIMELINE.map(event => event.label),
    ]
    for (const texto of textos) {
      expect(texto, texto.slice(0, 60)).not.toMatch(/\$\s?\d/)
      expect(texto, texto.slice(0, 60)).not.toMatch(/\bUS\$/)
    }
  })
})
