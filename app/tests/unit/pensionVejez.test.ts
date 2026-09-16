import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  AJUSTE_PASIVIDADES_2026_PCT,
  BPS_FIGURES_2026_UPDATED_AT,
  PENSION_VEJEZ_INVALIDEZ_2026,
} from '../../utils/bpsFigures2026'
import { formatNumber } from '../../utils/format'
import {
  ADJUSTMENT_2026_PCT,
  AGE_REQUIREMENT,
  AMOUNT_2026,
  AMOUNT_UPDATED_AT,
  APPLY_URL,
  INCOMPATIBILITIES,
  INVALIDITY_AGE_RULE,
  INVALIDITY_AMOUNT_2026,
  INVALIDITY_EVALUATION,
  INVALIDITY_EVALUATION_URL,
  INVALIDITY_HAS_MIN_AGE,
  INVALIDITY_LAPSE_RULE,
  INVALIDITY_MEANS_TEST,
  INVALIDITY_NAME,
  INVALIDITY_RESIDENCY_RULE,
  INVALIDITY_ROUTES,
  INVALIDITY_URL,
  LAPSE_RULE,
  MEANS_TEST,
  PENSION_FAQ,
  PENSION_SOURCES,
  PENSION_VERIFIED_AT,
  RESIDENCY_RULE,
  VS_OTHERS,
} from '../../utils/pensionVejez'

describe('pensión a la vejez (BPS) 2026', () => {
  it('monto oficial 2026', () => {
    expect(AMOUNT_2026).toBe(18575)
  })

  it('requisito de edad, con la excepción por cuidados', () => {
    expect(AGE_REQUIREMENT.base).toBe(70)
    expect(AGE_REQUIREMENT.caregiverFrom).toBe(65)
    expect(AGE_REQUIREMENT.caregiverYears).toBe(7)
  })

  it('regla de residencia menciona 10 de los últimos 20 años', () => {
    expect(RESIDENCY_RULE).toContain('10')
    expect(RESIDENCY_RULE).toContain('20')
  })

  it('carencia de recursos cubre las tres reglas oficiales', () => {
    const detail = MEANS_TEST.map(rule => rule.detail).join(' ')
    // Ingreso propio: 50 % y el tope de dos pensiones.
    expect(detail).toContain('50 %')
    expect(detail).toContain('dos pensiones')
    // Núcleo conviviente: 4 BPC y 33 % de descuento sobre el excedente.
    expect(detail).toContain('4 BPC')
    expect(detail).toContain('33 %')
    // Familiares no convivientes: entre 10 y 13 BPC.
    expect(detail).toContain('10 y 13 BPC')
    expect(MEANS_TEST.length).toBe(3)
  })

  it('incompatibilidades menciona causal jubilatoria', () => {
    expect(INCOMPATIBILITIES).toContain('causal jubilatoria')
  })

  it('caducidad menciona los tres meses sin cobrar', () => {
    expect(LAPSE_RULE).toContain('tres meses')
  })

  it('distingue pensión a la vejez, asistencia a la vejez (MIDES) y jubilación', () => {
    const ids = VS_OTHERS.map(row => row.id)
    expect(ids).toContain('pension-vejez')
    expect(ids).toContain('asistencia-vejez')
    expect(ids).toContain('jubilacion')

    const mides = VS_OTHERS.find(row => row.id === 'asistencia-vejez')
    expect(mides?.managedBy).toBe('MIDES')
    const bps = VS_OTHERS.find(row => row.id === 'pension-vejez')
    expect(bps?.managedBy).toBe('BPS')
  })

  it('el trámite apunta al BPS', () => {
    expect(APPLY_URL).toMatch(/^https:\/\/www\.bps\.gub\.uy\//)
  })

  it('FAQ: al menos 6 preguntas, todas con respuesta sustancial', () => {
    expect(PENSION_FAQ.length).toBeGreaterThanOrEqual(6)
    for (const item of PENSION_FAQ) {
      expect(item.answer.length).toBeGreaterThan(40)
    }
  })

  it('FAQ cubre las preguntas clave del brief', () => {
    const ids = PENSION_FAQ.map(item => item.id)
    expect(ids).toContain('tengo-jubilacion')
    expect(ids).toContain('es-lo-mismo-mides')

    const jubilacion = PENSION_FAQ.find(item => item.id === 'tengo-jubilacion')
    expect(jubilacion?.answer).toMatch(/no\b/i)
    const mides = PENSION_FAQ.find(item => item.id === 'es-lo-mismo-mides')
    expect(mides?.answer).toMatch(/no\b/i)
  })

  it('fuentes: al menos 4, todas https, al menos dos de bps.gub.uy', () => {
    expect(PENSION_SOURCES.length).toBeGreaterThanOrEqual(4)
    for (const source of PENSION_SOURCES) {
      expect(source.url).toMatch(/^https:\/\//)
    }
    const bpsSources = PENSION_SOURCES.filter(source => source.url.includes('bps.gub.uy'))
    expect(bpsSources.length).toBeGreaterThanOrEqual(2)
  })

  it('fecha de verificación', () => {
    expect(PENSION_VERIFIED_AT).toBe('2026-09-16')
  })
})

// El error que estas pruebas impiden que vuelva: la fila de comparación se llamaba "Pensión a la
// vejez e invalidez" pero su `who` publicaba SÓLO la regla de edad de la vejez, y la página de
// jubilación mandaba acá a quien tiene una incapacidad. Alguien de 45 años leía que hay que tener
// 70. La pensión por invalidez es otra prestación, del mismo monto, y NO tiene edad mínima.
describe('la vía por invalidez, que no tiene edad mínima', () => {
  it('no hay edad mínima, y la regla lo dice con todas las letras', () => {
    expect(INVALIDITY_HAS_MIN_AGE).toBe(false)
    expect(INVALIDITY_AGE_RULE).toMatch(/no tiene edad mínima/i)
    expect(INVALIDITY_AGE_RULE).toMatch(/cualquier edad/i)
    // Y no se le puede colar la edad de la vejez como si fuera un requisito suyo.
    expect(INVALIDITY_AGE_RULE).not.toMatch(/(?:tener|desde los|a partir de los)\s+70/i)
  })

  it('el monto es el mismo que la pensión a la vejez, y sale de la misma fila del BPS', () => {
    expect(INVALIDITY_AMOUNT_2026).toBe(AMOUNT_2026)
    expect(INVALIDITY_AMOUNT_2026).toBe(18575)
    expect(INVALIDITY_NAME).toBe('Pensión por invalidez')
  })

  it('la evalúa el BPS por junta médica, no un certificado ni esta página', () => {
    expect(INVALIDITY_EVALUATION).toMatch(/BPS/)
    expect(INVALIDITY_EVALUATION).toMatch(/evaluación médica|Evaluación de incapacidad/i)
    expect(INVALIDITY_EVALUATION).toMatch(/certificado/i)
  })

  it('las dos vías: discapacidad severa (sin carencia de recursos) e incapacidad común', () => {
    expect(INVALIDITY_ROUTES.map(r => r.id)).toEqual(['discapacidad-severa', 'incapacidad-comun'])
    const severa = INVALIDITY_ROUTES.find(r => r.id === 'discapacidad-severa')
    // El trato distinto del examen de ingresos es el dato del dossier (sección B) y lleva su norma.
    expect(severa?.detail).toMatch(/sin prueba de carencia de recursos/i)
    expect(severa?.detail).toContain('32-30/2006')
    const comun = INVALIDITY_ROUTES.find(r => r.id === 'incapacidad-comun')
    expect(comun?.detail).toMatch(/carencia de recursos/i)
  })

  it('el examen de ingresos de la invalidez NO es el de la vejez', () => {
    // Vejez: 50 % del ingreso propio desde el primer peso, tope dos pensiones.
    // Invalidez común: 33 % sobre el excedente de tres pensiones.
    expect(INVALIDITY_MEANS_TEST).toMatch(/33 %/)
    expect(INVALIDITY_MEANS_TEST).toMatch(/tres pensiones/i)
    expect(INVALIDITY_MEANS_TEST).toContain('32-30/2006')
    expect(MEANS_TEST[0]!.detail).toMatch(/50 %/)
  })

  it('residencia y caducidad de la invalidez van publicadas', () => {
    expect(INVALIDITY_RESIDENCY_RULE).toContain('10')
    expect(INVALIDITY_RESIDENCY_RULE).toContain('20')
    expect(INVALIDITY_LAPSE_RULE).toMatch(/tres meses/i)
  })

  it('la fila de comparación cubre LAS DOS vías, no sólo la edad de la vejez', () => {
    const row = VS_OTHERS.find(r => r.id === 'pension-vejez')!
    expect(row.name).toBe('Pensión a la vejez e invalidez')
    expect(row.who).toMatch(/70/)
    expect(row.who).toMatch(/invalidez/i)
    expect(row.who).toMatch(/sin edad mínima/i)
  })

  it('el FAQ contesta las tres preguntas de invalidez', () => {
    const ids = PENSION_FAQ.map(f => f.id)
    expect(ids).toContain('invalidez-edad')
    expect(ids).toContain('invalidez-quien-decide')
    expect(ids).toContain('invalidez-carencia')
    const edad = PENSION_FAQ.find(f => f.id === 'invalidez-edad')!
    expect(edad.answer).toMatch(/^No\./)
    expect(edad.answer).toMatch(/edad/i)
  })

  it('las fuentes incluyen la ficha de invalidez y el trámite de evaluación', () => {
    const urls = PENSION_SOURCES.map(s => s.url)
    expect(urls).toContain(INVALIDITY_URL)
    expect(urls).toContain(INVALIDITY_EVALUATION_URL)
    expect(INVALIDITY_URL).toContain('pension-por-invalidez')
  })
})

// Las cifras del BPS tienen UNA casa (`utils/bpsFigures2026.ts`). El BPS reajusta todos los marzos:
// con una copia local, este módulo se queda viejo solo el día que alguien actualice el otro.
describe('las cifras 2026 vienen del módulo único', () => {
  it('monto, fecha y ajuste son los de bpsFigures2026, no copias', () => {
    expect(AMOUNT_2026).toBe(PENSION_VEJEZ_INVALIDEZ_2026)
    expect(AMOUNT_UPDATED_AT).toBe(BPS_FIGURES_2026_UPDATED_AT)
    expect(ADJUSTMENT_2026_PCT).toBe(AJUSTE_PASIVIDADES_2026_PCT)
  })
})

// Mismo defecto que ya arreglado en /cuando-me-puedo-jubilar-uruguay: la tarjeta del monto
// interpolaba el 5.97 crudo, que en JS imprime "5.97" con PUNTO, mientras el FAQ de la misma
// página escribe "5,97" a mano. Dos formatos del mismo número en la misma pantalla.
describe('el ajuste 2026 se imprime con coma, no con punto', () => {
  it('formatNumber(ADJUSTMENT_2026_PCT) da "5,97"', () => {
    expect(ADJUSTMENT_2026_PCT).toBe(5.97)
    expect(formatNumber(ADJUSTMENT_2026_PCT)).toBe('5,97')
  })

  it('la página usa formatNumber para el ajuste, no una interpolación cruda', () => {
    const source = readFileSync(
      join(__dirname, '..', '..', 'pages', 'pension-a-la-vejez-uruguay.vue'),
      'utf8'
    )
    expect(source).toContain('formatNumber(ADJUSTMENT_2026_PCT)')
    expect(source).not.toMatch(/\{\{\s*ADJUSTMENT_2026_PCT\s*\}\}/)
  })

  // La misma cifra sale en /suplemento-solidario-bps con otro alias: se arregló ahí también.
  it('la página del suplemento tampoco interpola el porcentaje crudo', () => {
    const source = readFileSync(
      join(__dirname, '..', '..', 'pages', 'suplemento-solidario-bps.vue'),
      'utf8'
    )
    expect(source).toContain('formatNumber(AUMENTO_2026_PCT)')
    expect(source).not.toMatch(/\{\{\s*AUMENTO_2026_PCT\s*\}\}/)
  })
})
