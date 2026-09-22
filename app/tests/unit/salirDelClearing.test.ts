// /salir-del-clearing: las 7 categorías del BCU, el informe de Equifax y "qué pasa si estoy en
// clearing", todo fechado y con la corrección de que el BCU republica los topes cada mes.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  BCU_CENTRAL_URL,
  BCU_CONSULTA_URL,
  BCU_NOT_PUBLISHED,
  BCU_RISK_CATEGORIES,
  CLEARING_CONSEQUENCES,
  CLEARING_REVIEWED,
  CLEARING_SOURCES,
  EQUIFAX_ALERT_EVENTS,
  EQUIFAX_CANCELLED_YEARS,
  EQUIFAX_FREE_ACCESS,
  EQUIFAX_PRODUCTS,
  clearingFaq,
} from '../../utils/salirDelClearing'

const PAGE = readFileSync(join(__dirname, '..', '..', 'pages', 'salir-del-clearing.vue'), 'utf8')

describe('categorías de la Central de Riesgos del BCU', () => {
  it('son exactamente las siete, en el orden del BCU, cada una con su definición', () => {
    expect(BCU_RISK_CATEGORIES.map(c => c.code)).toEqual(['1A', '1C', '2A', '2B', '3', '4', '5'])
    for (const c of BCU_RISK_CATEGORIES) expect(c.definition.length).toBeGreaterThan(15)
    expect(BCU_RISK_CATEGORIES.find(c => c.code === '1C')!.definition).toBe(
      'Deudores con capacidad de pago fuerte'
    )
    expect(BCU_RISK_CATEGORIES.find(c => c.code === '5')!.definition).toBe(
      'Deudores irrecuperables'
    )
    expect(new Set(BCU_RISK_CATEGORIES.map(c => c.id)).size).toBe(7)
  })

  it('dice con las palabras del BCU qué no se publica, y enlaza la consulta gratuita', () => {
    expect(BCU_NOT_PUBLISHED).toMatch(/15 años/)
    expect(BCU_CONSULTA_URL).toMatch(/^https:\/\/consultadeuda\.bcu\.gub\.uy\//)
    expect(BCU_CENTRAL_URL).toMatch(/^https:\/\/subsitio\.bcu\.gub\.uy\/central-de-riesgos/)
    expect(PAGE).toContain('BCU_RISK_CATEGORIES')
    expect(PAGE).toContain('BCU_CONSULTA_URL')
  })
})

describe('el informe de Equifax', () => {
  it('la vía gratuita es el teléfono, cada 6 meses, y los precios están fechados', () => {
    expect(EQUIFAX_FREE_ACCESS.phone).toBe('2628 1515')
    expect(EQUIFAX_FREE_ACCESS.cadence).toMatch(/6 meses/)
    expect(CLEARING_REVIEWED).toMatch(/^2026-09-\d\d$/)
    const byId = Object.fromEntries(EQUIFAX_PRODUCTS.map(p => [p.id, p.price]))
    expect(byId.miclearing).toBe('$ 540')
    expect(byId['huella-3']).toBe('$ 740')
    expect(byId['huella-6']).toBe('$ 990')
    expect(byId.alertas).toBe('Gratis')
    expect(byId.gestiones).toBe('Gratis')
    expect(EQUIFAX_ALERT_EVENTS).toContain('denuncias de cédula')
  })

  it('Equifax conserva lo cancelado con atraso 3 años, y se dice como práctica, no como ley', () => {
    expect(EQUIFAX_CANCELLED_YEARS).toBe(3)
    const faq = clearingFaq().find(f => f.id === 'cuanto-tiempo')!
    expect(faq.answer).toMatch(/cinco años no renovables, contados desde la cancelación/)
    expect(faq.answer).toMatch(/Equifax declara[\s\S]{0,80}tres años/)
  })
})

describe('qué pasa si estoy en clearing', () => {
  const faq = clearingFaq()

  it('la pregunta lleva la frase de búsqueda literal y responde primero', () => {
    const q = faq.find(f => f.id === 'que-pasa')!
    expect(q.question).toBe('¿Qué pasa si estoy en clearing?')
    expect(q.answer).toMatch(/^Te rechazan/)
    expect(q.link?.to).toBe('/prestamo-sin-recibo-de-sueldo-uruguay')
    expect(PAGE).toContain('¿Qué pasa si estoy en clearing?')
  })

  it('la anécdota de Porto se cuenta como rechazo inicial revertido, no como rechazo consumado', () => {
    const porto = CLEARING_CONSEQUENCES.find(c => c.id === 'garantia-alquiler')!
    expect(porto.text).toContain(
      'Un usuario con reporte 1C fue rechazado inicialmente por Porto para una garantía de alquiler; al reenviar la solicitud con su reporte Clearing, la aceptaron (r/uruguay, junio de 2026).'
    )
    expect(porto.sourceUrl).toMatch(/reddit\.com\/r\/uruguay\/comments\/1typb0p/)
    const texto = [
      faq.map(f => f.answer).join(' '),
      CLEARING_CONSEQUENCES.map(c => c.text).join(' '),
    ].join(' ')
    expect(texto).not.toMatch(/rechazados? por Porto incluso con/i)
  })

  it('la única financiera que dice prestar en el clearing es Pronto!, y nadie te "saca" por un pago', () => {
    const prestamos = CLEARING_CONSEQUENCES.find(c => c.id === 'prestamos')!
    expect(prestamos.text).toMatch(/Pronto!/)
    expect(prestamos.text).toMatch(/OCA exige/)
    const estafa = CLEARING_CONSEQUENCES.find(c => c.id === 'estafa')!
    expect(estafa.text).toMatch(/no requiere gestores ni intermediarios/)
    for (const c of CLEARING_CONSEQUENCES) {
      if (c.sourceUrl) expect(c.sourceUrl).toMatch(/^https:\/\//)
    }
  })

  it('tiene entre 3 y 5 preguntas, con ids únicos y respuestas de texto plano', () => {
    expect(faq.length).toBeGreaterThanOrEqual(3)
    expect(faq.length).toBeLessThanOrEqual(5)
    expect(new Set(faq.map(f => f.id)).size).toBe(faq.length)
    for (const f of faq) {
      expect(f.answer).not.toMatch(/<[a-z]/)
      expect(f.answer).not.toMatch(/septiembre/)
    }
  })
})

describe('los topes del BCU se republican cada mes, no cada trimestre', () => {
  it('ni el util ni la página dicen "cada trimestre" o "trimestralmente"', () => {
    const util = readFileSync(join(__dirname, '..', '..', 'utils', 'salirDelClearing.ts'), 'utf8')
    for (const text of [util, PAGE]) {
      expect(text).not.toMatch(/cada trimestre/i)
      expect(text).not.toMatch(/trimestralmente/i)
      expect(text).not.toMatch(/septiembre/)
    }
    expect(clearingFaq().find(f => f.id === 'tasa')!.answer).toMatch(/todos los meses/)
  })

  it('la página emite un solo FAQPage: el de FaqSection, no uno a mano', () => {
    expect(PAGE).toContain('<FaqSection :items="faq"')
    expect(PAGE).not.toContain("'@type': 'FAQPage'")
  })
})

describe('fuentes', () => {
  it('todas https, con Equifax y el BCU, y la página las lee del util', () => {
    for (const s of CLEARING_SOURCES) expect(s.url).toMatch(/^https:\/\//)
    expect(CLEARING_SOURCES.some(s => /equifax/i.test(s.url))).toBe(true)
    expect(CLEARING_SOURCES.some(s => s.url === BCU_CENTRAL_URL)).toBe(true)
    expect(PAGE).toContain('CLEARING_SOURCES')
  })
})
