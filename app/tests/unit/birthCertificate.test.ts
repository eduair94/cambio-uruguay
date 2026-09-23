// El catálogo de la partida publica aranceles de un organismo del Estado y, sobre todo, una FECHA
// de la que depende si se paga o no. Lo que se custodia acá no es la aritmética —hay una división
// y una resta— sino que ningún número quede huérfano de fuente, que el corte digital no se corra
// un día para ningún lado, y que el cuadro no se contradiga con el texto que lo rodea.
import { describe, expect, it } from 'vitest'

import {
  esDigital,
  PARTIDA_APOSTILLA,
  PARTIDA_BY_KEY,
  PARTIDA_DEADLINES,
  PARTIDA_DIGITAL_SINCE,
  PARTIDA_FACTS,
  PARTIDA_FAQ,
  PARTIDA_FEES,
  PARTIDA_FOREIGN_DIGITAL_SINCE_YEAR,
  PARTIDA_PATH,
  PARTIDA_SAME_FEE,
  PARTIDA_SOURCES,
  PARTIDA_UNPUBLISHED,
  PARTIDA_VERIFIED_AT,
  recargoUrgente,
  sobreprecioUrgente,
} from '../../utils/birthCertificate'

describe('los aranceles', () => {
  it('son los tres que publica la ficha, incluido el cero', () => {
    expect(PARTIDA_FEES.map(f => f.key)).toEqual([
      'digital',
      'manuscrita-comun',
      'manuscrita-urgente',
    ])
    for (const fee of PARTIDA_FEES) {
      expect(Number.isInteger(fee.arancel), fee.key).toBe(true)
      expect(fee.arancel, fee.key).toBeGreaterThanOrEqual(0)
      expect(fee.cubre.length, fee.key).toBeGreaterThan(20)
      expect(fee.entrega.length, fee.key).toBeGreaterThan(20)
    }
  })

  it('valen lo que dice el bloque «Costos» de gub.uy', () => {
    expect(PARTIDA_BY_KEY['digital']!.arancel).toBe(0)
    expect(PARTIDA_BY_KEY['manuscrita-comun']!.arancel).toBe(153)
    expect(PARTIDA_BY_KEY['manuscrita-urgente']!.arancel).toBe(612)
  })

  it('indexa por key sin perder ninguna fila', () => {
    expect(Object.keys(PARTIDA_BY_KEY)).toHaveLength(PARTIDA_FEES.length)
  })

  // El hallazgo de la página, calculado y no escrito a mano: si mañana se actualiza un arancel, el
  // titular se mueve solo o el test avisa que dejó de ser cierto.
  it('mide el urgente contra el común en vez de afirmar «cuatro veces»', () => {
    expect(recargoUrgente()).toBeCloseTo(4, 10)
  })

  it('mide en pesos lo que sale adelantar la entrega', () => {
    expect(sobreprecioUrgente()).toBe(459)
  })

  // El digital va PRIMERO y es el más barato: una tabla que empezara por la manuscrita le cobraría
  // mentalmente un trámite a quien no tiene que pagarlo.
  it('abre por la opción gratuita y ordena los importes de menor a mayor', () => {
    const amounts = PARTIDA_FEES.map(f => f.arancel)
    expect(amounts[0]).toBe(0)
    expect([...amounts].sort((a, b) => a - b)).toEqual(amounts)
  })
})

describe('la fecha que decide el precio', () => {
  it('corta donde corta la ficha y no un día antes', () => {
    expect(PARTIDA_DIGITAL_SINCE).toBe('2022-01-01')
    expect(PARTIDA_FOREIGN_DIGITAL_SINCE_YEAR).toBe(2015)
  })

  it('un hecho uruguayo inscripto desde el 1/1/2022 es digital, y el 31/12/2021 no', () => {
    expect(esDigital('2022-01-01', 'uruguay')).toBe(true)
    expect(esDigital('2026-09-23', 'uruguay')).toBe(true)
    expect(esDigital('2021-12-31', 'uruguay')).toBe(false)
    expect(esDigital('1987-05-04', 'uruguay')).toBe(false)
  })

  // El del extranjero tiene otro corte, y SIETE AÑOS antes. Aplicarle el de Uruguay le cobraría
  // $153 a quien puede descargarla gratis.
  it('al del extranjero le aplica su propio corte, que es por año', () => {
    expect(esDigital('2015-01-01', 'extranjero')).toBe(true)
    expect(esDigital('2015-12-31', 'extranjero')).toBe(true)
    expect(esDigital('2014-12-31', 'extranjero')).toBe(false)
    // La misma fecha, distinto origen: 2016 es digital afuera y todavía manuscrita acá.
    expect(esDigital('2016-06-01', 'extranjero')).toBe(true)
    expect(esDigital('2016-06-01', 'uruguay')).toBe(false)
  })

  it('no adivina ante una fecha que no es una fecha', () => {
    expect(esDigital('', 'uruguay')).toBe(false)
    expect(esDigital('2022', 'uruguay')).toBe(false)
    expect(esDigital('no sé', 'extranjero')).toBe(false)
  })
})

describe('la apostilla', () => {
  it('publica los dos importes de Cancillería y ninguno más', () => {
    expect(PARTIDA_APOSTILLA.map(a => a.key)).toEqual(['apostilla', 'legalizacion'])
    expect(PARTIDA_APOSTILLA.find(a => a.key === 'apostilla')!.arancel).toBe(777)
    expect(PARTIDA_APOSTILLA.find(a => a.key === 'legalizacion')!.arancel).toBe(379)
  })

  // Es el dato que más descoloca: hacerla valer afuera sale bastante más que la partida misma.
  it('cuesta más que la partida manuscrita urgente', () => {
    expect(PARTIDA_APOSTILLA.find(a => a.key === 'apostilla')!.arancel).toBeGreaterThan(
      PARTIDA_BY_KEY['manuscrita-urgente']!.arancel
    )
  })
})

describe('el resto del catálogo', () => {
  it('lista los cuatro hechos que comparten arancel', () => {
    expect(PARTIDA_SAME_FEE).toEqual(['Nacimiento', 'Reconocimiento', 'Matrimonio', 'Defunción'])
  })

  it('publica los cuatro plazos, uno por vía y modalidad', () => {
    expect(PARTIDA_DEADLINES.map(d => d.key)).toEqual([
      'comun-internet',
      'comun-agenda',
      'urgente-internet',
      'urgente-agenda',
    ])
    for (const row of PARTIDA_DEADLINES) expect(row.plazo.length, row.key).toBeGreaterThan(20)
  })

  it('no deja un hecho ni una pregunta sin texto', () => {
    expect(PARTIDA_FACTS.length).toBeGreaterThanOrEqual(5)
    for (const fact of PARTIDA_FACTS) {
      expect(fact.titulo.length, fact.key).toBeGreaterThan(5)
      expect(fact.detalle.length, fact.key).toBeGreaterThan(60)
    }
    expect(PARTIDA_UNPUBLISHED.length).toBeGreaterThanOrEqual(3)
    for (const item of PARTIDA_UNPUBLISHED) {
      expect(item.pregunta.endsWith('?'), item.key).toBe(true)
      expect(item.porQue.length, item.key).toBeGreaterThan(60)
    }
  })

  it('tiene preguntas frecuentes con pregunta y respuesta de verdad', () => {
    expect(PARTIDA_FAQ.length).toBeGreaterThanOrEqual(6)
    for (const faq of PARTIDA_FAQ) {
      expect(faq.question.endsWith('?'), faq.question).toBe(true)
      expect(faq.answer.length, faq.question).toBeGreaterThan(80)
    }
    expect(new Set(PARTIDA_FAQ.map(f => f.question)).size).toBe(PARTIDA_FAQ.length)
  })
})

// La regla de la casa: ningún importe sin una URL oficial que lo sostenga.
describe('las fuentes', () => {
  it('son todas oficiales y ninguna se repite', () => {
    expect(PARTIDA_SOURCES.length).toBeGreaterThanOrEqual(5)
    for (const source of PARTIDA_SOURCES) {
      expect(source.url, source.label).toMatch(/^https:\/\/(www\.gub\.uy|www\.impo\.com\.uy)\//)
      expect(source.label.length, source.url).toBeGreaterThan(40)
    }
    expect(new Set(PARTIDA_SOURCES.map(s => s.url)).size).toBe(PARTIDA_SOURCES.length)
  })

  // Los tres importes del cuadro, citados textualmente en alguna de las fuentes: es la forma de
  // que un número nuevo no pueda entrar sin que alguien haya abierto la ficha.
  it('cita textualmente cada importe que la página publica', () => {
    const labels = PARTIDA_SOURCES.map(s => s.label).join(' ')
    expect(labels).toContain('$153')
    expect(labels).toContain('612')
    expect(labels).toContain('$777')
    expect(labels).toContain('$379')
    expect(labels).toContain('no tienen costo')
  })

  it('lleva la fecha de verificación y la ruta de la página', () => {
    expect(PARTIDA_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(PARTIDA_PATH).toBe('/cuanto-sale-la-partida-de-nacimiento-uruguay')
  })
})
