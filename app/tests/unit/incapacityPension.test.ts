// La incapacidad del BPS: lo que no puede cambiar sin volver a las fuentes.
//
// Como en `survivorPension.test.ts`, estos tests no comprueban que el catálogo «tenga datos»: fijan
// las afirmaciones que la página publica y que salen de un artículo o de una ficha concreta. Acá
// hace falta más que en otras páginas porque el tema tiene dos trampas propias. La primera es que
// los resúmenes de terceros siguen publicando el 65 % del régimen anterior a la Ley 20.130. La
// segunda es que el piso del subsidio transitorio NO es un importe escrito en la ley: es un
// reenvío a otra prestación, cuyo valor corriente vive en `bpsFigures2026.ts`, así que la cifra
// que la página imprime tiene que seguir siendo esa y no una copia que envejece sola.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { PENSION_VEJEZ_INVALIDEZ_2026 } from '../../utils/bpsFigures2026'
import {
  INCAPACITY_BENEFITS,
  INCAPACITY_CHILD_CONDITIONS,
  INCAPACITY_COMPLEMENTS,
  INCAPACITY_CONTROLS,
  INCAPACITY_EVALUATION_DOCS,
  INCAPACITY_FALLBACK_YEARS,
  INCAPACITY_FAQ,
  INCAPACITY_FLOOR_LAW_AMOUNT,
  INCAPACITY_FLOOR_LAW_YEAR,
  INCAPACITY_PATH,
  INCAPACITY_PREJUBILATORIO,
  INCAPACITY_RATE_AT_65_PCT,
  INCAPACITY_RATE_AT_70_PCT,
  INCAPACITY_REGIME_START,
  INCAPACITY_REVIEW_LEAD_DAYS,
  INCAPACITY_SERVICE_RULES,
  INCAPACITY_SOURCES,
  INCAPACITY_SUBSIDY_FLOOR,
  INCAPACITY_SUBSIDY_MAX_YEARS,
  INCAPACITY_UNPUBLISHED,
  INCAPACITY_VERIFIED_AT,
  incapacityFallbackShare,
  incapacityServiceMonthsForAge,
} from '../../utils/incapacityPension'

const PAGE = readFileSync(
  join(__dirname, '..', '..', 'pages', 'jubilacion-por-incapacidad-uruguay.vue'),
  'utf8'
)

describe('las dos prestaciones', () => {
  it('son exactamente dos, y una sola tiene piso escrito', () => {
    expect(INCAPACITY_BENEFITS.map(benefit => benefit.id)).toEqual(['parcial', 'total'])
    // La asimetría del art. 50 contra el art. 48 es la mitad de lo que esta página explica: si
    // alguien le inventa un piso a la jubilación por incapacidad total, esto se pone rojo.
    const withFloor = INCAPACITY_BENEFITS.filter(benefit => benefit.floor !== null)
    expect(withFloor.map(benefit => benefit.id)).toEqual(['parcial'])
  })

  it('el subsidio transitorio dura tres años', () => {
    expect(INCAPACITY_SUBSIDY_MAX_YEARS).toBe(3)
    expect(INCAPACITY_BENEFITS[0]!.duration).toContain('3 años')
  })

  it('la jubilación por incapacidad total es vitalicia', () => {
    expect(INCAPACITY_BENEFITS[1]!.duration).toContain('Vitalicia')
  })

  it('cada prestación apunta a una fuente del listado', () => {
    const ids = new Set(INCAPACITY_SOURCES.map(source => source.id))
    for (const benefit of INCAPACITY_BENEFITS)
      expect(ids.has(benefit.sourceId), benefit.id).toBe(true)
  })
})

describe('el piso del subsidio transitorio', () => {
  // El art. 50 manda al monto de la prestación no contributiva por invalidez y vejez: no hay un
  // importe propio que mantener, y duplicarlo es la falla que `bpsFigures2026.ts` documenta.
  it('es la misma constante que publica la pensión por invalidez y vejez', () => {
    expect(INCAPACITY_SUBSIDY_FLOOR).toBe(PENSION_VEJEZ_INVALIDEZ_2026)
  })

  it('conserva el monto inicial que escribió la ley, con su año', () => {
    expect(INCAPACITY_FLOOR_LAW_AMOUNT).toBe(13_838)
    expect(INCAPACITY_FLOOR_LAW_YEAR).toBe(2023)
    // El valor corriente tiene que ser mayor que el inicial de 2023: el beneficio se ajusta por el
    // art. 67 de la Constitución. Si alguna vez quedara por debajo, hay un dato mal copiado.
    expect(INCAPACITY_SUBSIDY_FLOOR).toBeGreaterThan(INCAPACITY_FLOOR_LAW_AMOUNT)
  })

  // La descripción del snippet imprime la cifra como literal (así la mide
  // `seoDescriptionBudget.test.ts`), así que acá va el candado: si el BPS reajusta y alguien
  // actualiza la constante sin tocar la página, el snippet publicaría un número viejo.
  it('la página imprime esa misma cifra en su descripción', () => {
    const formatted = INCAPACITY_SUBSIDY_FLOOR.toLocaleString('es-UY')
    expect(PAGE).toContain(`$ ${formatted}`)
  })
})

describe('los mínimos de actividad', () => {
  it('son los cuatro de la ficha, y la puerta del cese es sólo de la total', () => {
    expect(INCAPACITY_SERVICE_RULES).toHaveLength(4)
    const soloTotal = INCAPACITY_SERVICE_RULES.filter(rule => rule.appliesTo === 'total')
    expect(soloTotal.map(rule => rule.id)).toEqual(['despues-del-cese'])
  })

  it('el corte está en los 25 años cumplidos, que quedan del lado de los seis meses', () => {
    expect(incapacityServiceMonthsForAge(25)).toBe(6)
    expect(incapacityServiceMonthsForAge(26)).toBe(24)
    expect(incapacityServiceMonthsForAge(0)).toBe(6)
  })

  it('no adivina el mínimo de una edad que no se puede leer', () => {
    expect(incapacityServiceMonthsForAge(-1)).toBeNull()
    expect(incapacityServiceMonthsForAge(30.5)).toBeNull()
    expect(incapacityServiceMonthsForAge(Number.NaN)).toBeNull()
  })
})

describe('la tasa del artículo 46', () => {
  it('fija los dos puntos que usa el artículo 48', () => {
    expect(INCAPACITY_RATE_AT_65_PCT).toBe(1.5)
    expect(INCAPACITY_RATE_AT_70_PCT).toBe(1.96)
    expect(INCAPACITY_FALLBACK_YEARS).toBe(15)
  })

  // La regla de respaldo del art. 48 son dos números del propio artículo multiplicados, y la
  // página lo dice así. El test fija la cuenta para que nadie la redondee a mano.
  it('la regla de respaldo da el 29,4 % del sueldo básico jubilatorio', () => {
    expect(incapacityFallbackShare()).toBe(29.4)
  })
})

describe('los complementos', () => {
  it('son el 20 % por hijos y el 25 % por dependencia severa', () => {
    expect(INCAPACITY_COMPLEMENTS.map(complement => complement.percent)).toEqual([20, 25])
    const severa = INCAPACITY_COMPLEMENTS.find(c => c.id === 'dependencia-severa')
    expect(severa?.appliesTo).toBe('total')
  })

  it('conserva las cuatro condiciones de los hijos que publica el BPS', () => {
    expect(INCAPACITY_CHILD_CONDITIONS).toHaveLength(4)
    for (const condition of INCAPACITY_CHILD_CONDITIONS)
      expect(condition.length).toBeGreaterThan(20)
  })
})

describe('el trámite y los controles', () => {
  it('pide la historia clínica y dice que para el subsidio son tres años', () => {
    expect(INCAPACITY_EVALUATION_DOCS).toHaveLength(4)
    expect(INCAPACITY_EVALUATION_DOCS[0]).toContain('tres')
  })

  it('la revisión se pide desde 180 días antes del vencimiento', () => {
    expect(INCAPACITY_REVIEW_LEAD_DAYS).toBe(180)
  })

  it('los 180 días prejubilatorios se descuentan en cuotas de hasta el 10 %', () => {
    expect(INCAPACITY_PREJUBILATORIO.days).toBe(180)
    expect(INCAPACITY_PREJUBILATORIO.maxMonthlyDeductionPct).toBe(10)
  })

  it('conserva las cuatro consecuencias del control médico', () => {
    expect(INCAPACITY_CONTROLS).toHaveLength(4)
  })
})

describe('las fuentes y las abstenciones', () => {
  it('toda fuente es del BPS o de impo.com.uy, con identificador único', () => {
    const ids = new Set<string>()
    for (const source of INCAPACITY_SOURCES) {
      expect(source.url).toMatch(/^https:\/\/(www\.bps\.gub\.uy|www\.impo\.com\.uy)\//)
      expect(ids.has(source.id), source.id).toBe(false)
      ids.add(source.id)
      expect(source.label.length).toBeGreaterThan(10)
    }
  })

  // Las cinco abstenciones son el contenido, no una nota al pie: el 65 % del régimen viejo es el
  // número que todos los resúmenes publican y el que esta página se niega a publicar.
  it('declara las cinco cosas que no publica, cada una con su por qué', () => {
    expect(INCAPACITY_UNPUBLISHED).toHaveLength(5)
    for (const item of INCAPACITY_UNPUBLISHED) expect(item.why.length).toBeGreaterThan(40)
    expect(INCAPACITY_UNPUBLISHED.map(item => item.id)).toContain('sesenta-y-cinco-por-ciento')
  })

  // Si el 65 % se cuela en el cuerpo de la página, la abstención dejó de ser verdad. La página
  // nombra los 65 AÑOS de la edad mínima proyectada del art. 48, que es otra cosa: lo que no puede
  // aparecer es un porcentaje.
  it('la página no publica el 65 % como la tasa vigente', () => {
    expect(PAGE).not.toContain('65 %')
    expect(PAGE).toContain('65 años')
  })

  it('el régimen nuevo arranca el 1/8/2023 y la verificación es posterior', () => {
    expect(INCAPACITY_REGIME_START).toBe('2023-08-01')
    expect(INCAPACITY_VERIFIED_AT > INCAPACITY_REGIME_START).toBe(true)
  })

  it('la ruta es la de la página', () => {
    expect(INCAPACITY_PATH).toBe('/jubilacion-por-incapacidad-uruguay')
  })
})

describe('el FAQ', () => {
  it('cada pregunta pregunta y cada respuesta contesta', () => {
    expect(INCAPACITY_FAQ.length).toBeGreaterThanOrEqual(6)
    const ids = new Set<string>()
    for (const faq of INCAPACITY_FAQ) {
      expect(faq.question.endsWith('?'), faq.id).toBe(true)
      expect(faq.answer.length).toBeGreaterThan(80)
      expect(ids.has(faq.id), faq.id).toBe(false)
      ids.add(faq.id)
    }
  })

  it('contesta la pregunta que decide si la página sirve: ya tengo causal', () => {
    const answer = INCAPACITY_FAQ.find(faq => faq.id === 'ya-tengo-causal')?.answer ?? ''
    expect(answer).toContain('art. 41')
  })
})
