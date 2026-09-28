// El catálogo de `/prestamo-hipotecario-uruguay`.
//
// Lo que se vigila acá no es aritmética por deporte: son las tres formas en que esta página puede
// empezar a mentir sin que nada se ponga rojo. (1) Una cifra que se suelta de su fuente: cada
// límite del FGCH viaja con la frase textual de la ANV, y un valor que dejó de estar contenido en su
// propia cita es una paráfrasis que se convirtió en dato. (2) Un redondeo que afloja un requisito:
// el fondo pide una cuota «inferior al 35 %» y un ahorro «entre el 5 % y el 25 %», así que redondear
// hacia arriba la cuota o publicar sólo el 5 % del ahorro admite lo que el organismo rechaza.
// (3) Una tasa de interés publicada: la página promete explícitamente no publicar ninguna, y es la
// promesa más fácil de romper el día que alguien agregue "una sola, de referencia".

import { describe, expect, it } from 'vitest'

import {
  ANV_FGCH_SOURCE,
  DEDUCTIBLE_LENDERS,
  DGI_MORTGAGE_SOURCE,
  DGI_PUBLISHED_DEDUCTION,
  FGCH_LIMITS,
  FGCH_MAX_HOUSEHOLD_INCOME_UR,
  FGCH_MAX_PAYMENT_SHARE,
  MORTGAGE_DEDUCTION_BPC,
  MORTGAGE_FAQ,
  MORTGAGE_HOME_CAP_UI,
  MORTGAGE_SOURCES,
  MORTGAGE_UNITS,
  MORTGAGE_VERIFIED_AT,
  PLAN_UR_BENEFITS,
  PLAN_UR_MAX_ORIGINAL_USD,
  deductionCapUyu,
  maxPaymentFromIncome,
  priorSavingsRange,
  urToPesos,
} from '../../utils/mortgageLoan'

describe('cada límite del FGCH sigue sostenido por la frase de la ANV', () => {
  it('publica los seis límites, sin huecos', () => {
    expect(FGCH_LIMITS).toHaveLength(6)
    for (const limit of FGCH_LIMITS) {
      expect(limit.label.length, limit.id).toBeGreaterThan(0)
      expect(limit.value.length, limit.id).toBeGreaterThan(0)
      // La cita es lo que hace verificable a la fila: sin ella el valor es una afirmación nuestra.
      expect(limit.quote.length, limit.id).toBeGreaterThan(20)
    }
  })

  it('no repite un id', () => {
    expect(new Set(FGCH_LIMITS.map(l => l.id)).size).toBe(FGCH_LIMITS.length)
  })

  // El defecto que esto atrapa: alguien edita `value` (redondea, simplifica, "aclara") y la cita
  // sigue diciendo otra cosa. Cada número del valor tiene que estar en la cita que lo respalda.
  it('todo número impreso en el valor aparece en la cita que lo respalda', () => {
    for (const limit of FGCH_LIMITS) {
      for (const digits of limit.value.match(/\d+/g) ?? []) {
        expect(limit.quote, `${limit.id}: "${limit.value}" vs "${limit.quote}"`).toContain(digits)
      }
    }
  })

  it('mantiene el techo de ingreso y el tope de cuota alineados con sus filas', () => {
    const income = FGCH_LIMITS.find(l => l.id === 'ingreso')!
    expect(income.quote).toContain(String(FGCH_MAX_HOUSEHOLD_INCOME_UR))
    const payment = FGCH_LIMITS.find(l => l.id === 'cuota')!
    expect(payment.quote).toContain(String(FGCH_MAX_PAYMENT_SHARE * 100))
  })
})

describe('las cuentas no aflojan ningún requisito', () => {
  it('convierte UR a pesos y se abstiene sin UR viva', () => {
    expect(urToPesos(100, 1800)).toBe(180000)
    // Sin UR no hay peso: ni cero, ni un valor congelado.
    for (const bad of [null, undefined, 0, -1, Number.NaN]) {
      expect(urToPesos(100, bad as number | null)).toBeNull()
    }
    expect(urToPesos(0, 1800)).toBeNull()
    expect(urToPesos(-5, 1800)).toBeNull()
  })

  it('redondea la cuota máxima HACIA ABAJO, porque el tope es "inferior al 35 %"', () => {
    // 35 % de 100.003 es 35.001,05: hacia arriba publicaría una cuota que el fondo rechaza.
    expect(maxPaymentFromIncome(100003)).toBe(35001)
    expect(maxPaymentFromIncome(60000)).toBe(21000)
    expect(maxPaymentFromIncome(0)).toBeNull()
    expect(maxPaymentFromIncome(-1)).toBeNull()
    expect(maxPaymentFromIncome(Number.NaN)).toBeNull()
  })

  it('publica el ahorro previo como RANGO y no sólo por su piso', () => {
    // Resumir «entre el 5 % y el 25 %» como «5 %» es el error que esta función existe para no
    // cometer: el requisito real puede ser cinco veces más alto.
    expect(priorSavingsRange(4_000_000)).toEqual({ min: 200_000, max: 1_000_000 })
    expect(priorSavingsRange(0)).toBeNull()
    expect(priorSavingsRange(Number.NaN)).toBeNull()
  })

  it('calcula el tope del IRPF con la BPC del año en vez de copiar el monto de la DGI', () => {
    expect(deductionCapUyu(6864)).toBe(MORTGAGE_DEDUCTION_BPC * 6864)
    // Con la BPC del ejercicio que la DGI publicó, la cuenta reproduce su monto: es la prueba de
    // que el tope son 36 BPC y no un número suelto. $ 236.736 / 36 = $ 6.576 de BPC en 2025.
    expect(deductionCapUyu(6576)).toBe(DGI_PUBLISHED_DEDUCTION.amountUyu)
    expect(deductionCapUyu(0)).toBeNull()
    expect(deductionCapUyu(-1)).toBeNull()
  })

  it('deja el tope y el techo de vivienda donde los fija la norma', () => {
    expect(MORTGAGE_DEDUCTION_BPC).toBe(36)
    expect(MORTGAGE_HOME_CAP_UI).toBe(1_000_000)
    expect(PLAN_UR_MAX_ORIGINAL_USD).toBe(80_000)
  })
})

describe('las dos unidades se explican sin reclamar el valor del día', () => {
  it('describe UI y UR con el índice que mueve a cada una', () => {
    expect(MORTGAGE_UNITS).toHaveLength(2)
    const ui = MORTGAGE_UNITS.find(u => u.code === 'UI')!
    const ur = MORTGAGE_UNITS.find(u => u.code === 'UR')!
    expect(ui.follows).toMatch(/IPC/)
    expect(ur.follows).toMatch(/Salarios/i)
    expect(ui.slug).toBe('unidad-indexada')
    expect(ur.slug).toBe('unidad-reajustable')
  })

  // El cluster UR de `seoContract.test.ts` reparte la intención: el INDICADOR es dueño de "valor ...
  // hoy". Este catálogo alimenta otra página, así que no puede traer el valor ni reclamarlo.
  it('no congela ningún valor de UI o UR en el catálogo', () => {
    for (const unit of MORTGAGE_UNITS) {
      expect(unit.meaning).not.toMatch(/\$|\bpesos\s+\d/)
      expect(`${unit.follows} ${unit.cadence} ${unit.meaning}`).not.toMatch(/\d[.,]\d{2,}/)
    }
  })
})

describe('la página no publica tasas de interés propias', () => {
  // La promesa explícita de la página. Las dos únicas tasas que puede nombrar son las del Plan UR,
  // que son las que la ANV ya fijó para créditos viejos y no una oferta de mercado.
  it('sólo nombra las dos tasas que la ANV fija en el Plan UR', () => {
    expect(PLAN_UR_BENEFITS.map(b => b.rate)).toEqual(['0 % de interés', '2,5 % de interés'])
    expect(PLAN_UR_BENEFITS[0]!.window).toMatch(/1993/)
    expect(PLAN_UR_BENEFITS[1]!.window).toMatch(/1994.*2008/)
  })

  it('tiene una respuesta que dice explícitamente que no publica la tasa', () => {
    const answer = MORTGAGE_FAQ.find(f => f.id === 'tasas')?.answer ?? ''
    expect(answer).toMatch(/no la publica/i)
  })
})

describe('todo lo que se afirma tiene una fuente citable', () => {
  it('cita ANV, DGI y BHU con URL de su propio dominio', () => {
    expect(MORTGAGE_SOURCES.length).toBeGreaterThanOrEqual(4)
    for (const source of MORTGAGE_SOURCES) {
      expect(source.label.length).toBeGreaterThan(0)
      expect(source.url).toMatch(/^https:\/\//)
    }
    expect(ANV_FGCH_SOURCE.url).toContain('anv.gub.uy')
    expect(DGI_MORTGAGE_SOURCE.url).toContain('gub.uy')
  })

  it('enumera los prestamistas deducibles como lista de la norma', () => {
    expect(DEDUCTIBLE_LENDERS.length).toBe(3)
    expect(DEDUCTIBLE_LENDERS.join(' ')).toMatch(/BHU/)
    expect(DEDUCTIBLE_LENDERS.join(' ')).toMatch(/MEVIR/)
  })

  it('lleva la fecha de lectura de las fuentes', () => {
    expect(MORTGAGE_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('la FAQ contesta con datos y sin ids repetidos', () => {
  it('trae cinco preguntas, cada una con su respuesta', () => {
    expect(MORTGAGE_FAQ.length).toBe(5)
    expect(new Set(MORTGAGE_FAQ.map(f => f.id)).size).toBe(MORTGAGE_FAQ.length)
    for (const item of MORTGAGE_FAQ) {
      expect(item.question.endsWith('?'), item.id).toBe(true)
      expect(item.answer.length, item.id).toBeGreaterThan(80)
    }
  })
})
