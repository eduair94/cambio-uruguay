// El catálogo de /cuando-se-cobra-el-aguinaldo-uruguay.
//
// Lo que estas pruebas cuidan es que los HECHOS LEGALES no se corran solos: el aguinaldo es la
// doceava parte de lo cobrado en dinero, el plazo firme es el de diciembre y la cuota de junio la
// fija un decreto. Cada uno sale de una fuente oficial; un cambio silencioso convierte la página en
// desinformación laboral, así que quedan fijados acá.

import { describe, expect, it } from 'vitest'

import {
  AGUINALDO_2026_DECREE,
  AGUINALDO_BASE_RULES,
  AGUINALDO_COMPLAINT_CHANNEL,
  AGUINALDO_CONSTRUCTION,
  AGUINALDO_FAQ,
  AGUINALDO_LATE_PAYMENT_CONSEQUENCES,
  AGUINALDO_LEAVE_CASES,
  AGUINALDO_MILESTONES,
  AGUINALDO_RETIREES,
  AGUINALDO_SOURCES,
  aguinaldoFromCashSalaries,
  aguinaldoProporcional,
} from '../../utils/aguinaldo'

describe('las dos cuotas del aguinaldo', () => {
  it('describe exactamente la primera y la segunda mitad', () => {
    expect(AGUINALDO_MILESTONES.map(m => m.key)).toEqual(['primera', 'segunda'])
  })

  it('la cuota de diciembre es la del plazo legal (Ley 12.840)', () => {
    const segunda = AGUINALDO_MILESTONES.find(m => m.key === 'segunda')
    expect(segunda?.when).toMatch(/24 de diciembre/)
    expect(segunda?.source).toMatch(/Ley 12\.840/)
  })

  it('la cuota de junio depende del decreto anual, no de una fecha fija', () => {
    const primera = AGUINALDO_MILESTONES.find(m => m.key === 'primera')
    expect(primera?.source).toMatch(/14\.525/)
    expect(primera?.when.toLowerCase()).toContain('decreto')
    // No se publica una fecha fija de junio: sería inventarla.
    expect(primera?.when).not.toMatch(/\b\d{1,2} de junio\b/)
  })
})

describe('la base del aguinaldo', () => {
  it('toma el sueldo en dinero y deja afuera los tickets de alimentación', () => {
    const tickets = AGUINALDO_BASE_RULES.find(r => /tickets/i.test(r.item))
    expect(tickets?.counts).toBe(false)
    const sueldo = AGUINALDO_BASE_RULES.find(r => /dinero/i.test(r.item))
    expect(sueldo?.counts).toBe(true)
  })

  it('las prestaciones en especie no integran la base', () => {
    const especie = AGUINALDO_BASE_RULES.find(r => /especie/i.test(r.item))
    expect(especie?.counts).toBe(false)
  })
})

describe('el cálculo: la doceava parte de lo cobrado en dinero', () => {
  it('divide el total anual entre doce', () => {
    expect(aguinaldoFromCashSalaries(120000)).toBeCloseTo(10000, 6)
  })

  it('el proporcional al egreso usa la misma cuenta sobre lo trabajado', () => {
    expect(aguinaldoProporcional(60000)).toBeCloseTo(aguinaldoFromCashSalaries(60000), 6)
  })

  it('nunca devuelve un número negativo ni rompe con entradas inválidas', () => {
    expect(aguinaldoFromCashSalaries(-100)).toBe(0)
    expect(aguinaldoFromCashSalaries(Number.NaN)).toBe(0)
  })
})

describe('preguntas y fuentes', () => {
  it('todas las preguntas están completas', () => {
    expect(AGUINALDO_FAQ.length).toBeGreaterThanOrEqual(5)
    for (const f of AGUINALDO_FAQ) {
      expect(f.question.length).toBeGreaterThan(0)
      expect(f.short.length).toBeGreaterThan(0)
      expect(f.answer.length).toBeGreaterThan(40)
    }
  })

  it('incluye las cuatro preguntas de la cola de demanda', () => {
    const questions = AGUINALDO_FAQ.map(f => f.question)
    expect(questions.some(q => /3 meses/.test(q))).toBe(true)
    expect(questions.some(q => /incapacitad/.test(q))).toBe(true)
    expect(questions.some(q => /no me pagan/i.test(q))).toBe(true)
    expect(questions.some(q => /cuántos días/i.test(q))).toBe(true)
  })

  it('cada fuente apunta a un organismo oficial (gub.uy, un subdominio suyo, o impo.com.uy)', () => {
    expect(AGUINALDO_SOURCES.length).toBeGreaterThanOrEqual(3)
    for (const s of AGUINALDO_SOURCES) {
      expect(s.url).toMatch(/^https:\/\/([\w-]+\.)*(gub\.uy|impo\.com\.uy)\//)
      expect(s.label.length).toBeGreaterThan(0)
    }
  })
})

describe('el plazo, la mora y dónde reclamar', () => {
  it('la multa del doble cita la Ley 12.840 y el recargo del 10 % cita la Ley 18.572', () => {
    const multa = AGUINALDO_LATE_PAYMENT_CONSEQUENCES.find(c => /doble/i.test(c.label))
    const recargo = AGUINALDO_LATE_PAYMENT_CONSEQUENCES.find(c => /10 ?%/.test(c.label))
    expect(multa?.source).toMatch(/12\.840/)
    expect(recargo?.source).toMatch(/18\.572/)
  })

  it('el canal de denuncia trae oficina, email y al menos un teléfono', () => {
    expect(AGUINALDO_COMPLAINT_CHANNEL.office.length).toBeGreaterThan(0)
    expect(AGUINALDO_COMPLAINT_CHANNEL.email).toMatch(/@mtss\.gub\.uy$/)
    expect(AGUINALDO_COMPLAINT_CHANNEL.phones.length).toBeGreaterThan(0)
  })

  it('el decreto 2026 confirma el 20 de diciembre sin prometer una fecha fija de junio', () => {
    expect(AGUINALDO_2026_DECREE.decemberDeadline).toBe('20 de diciembre de 2026')
    expect(AGUINALDO_2026_DECREE.juneNote).not.toMatch(/\b\d{1,2} de junio\b/)
  })
})

describe('régimen especial de la construcción', () => {
  it('nombra el Fondo Social y no inventa una fórmula de cálculo', () => {
    expect(AGUINALDO_CONSTRUCTION.mechanism).toMatch(/Fondo Social de la Construcción/)
    expect(AGUINALDO_CONSTRUCTION.mechanism).toMatch(/466\/008/)
    expect(AGUINALDO_CONSTRUCTION.formulaNote.length).toBeGreaterThan(0)
  })
})

describe('licencia, enfermedad y seguro de paro', () => {
  it('cubre las tres situaciones', () => {
    const situations = AGUINALDO_LEAVE_CASES.map(l => l.situation)
    expect(situations.some(s => /licencia/i.test(s))).toBe(true)
    expect(situations.some(s => /enfermedad/i.test(s))).toBe(true)
    expect(situations.some(s => /seguro de paro/i.test(s))).toBe(true)
  })

  it('no afirma que el seguro de paro genera o no aguinaldo: remite al BPS', () => {
    const paro = AGUINALDO_LEAVE_CASES.find(l => /seguro de paro/i.test(l.situation))
    expect(paro?.detail).not.toMatch(/no genera/i)
    expect(paro?.detail).toMatch(/BPS/)
  })
})

describe('jubilados y pensionistas', () => {
  it('aclara que no cobran aguinaldo y separa la partida especial', () => {
    expect(AGUINALDO_RETIREES.detail).toMatch(/no paga aguinaldo/i)
    expect(AGUINALDO_RETIREES.amount).toBe(3151)
    expect(AGUINALDO_RETIREES.benefit).toMatch(/no es un aguinaldo/i)
  })

  // La partida la fija el BPS edición por edición: la que está publicada con su letra chica es la
  // de 2025 ("mayores de 65 años al 31/10/2025"). Sin el año adentro del texto, "$ 3.151" en un
  // archivo verificado en 2026 se lee como la cifra de este año — es la falla que ya dejó la BPC
  // de 2024 publicada durante meses.
  it('la partida va fechada: el año viaja en el texto, no sólo en un campo', () => {
    expect(AGUINALDO_RETIREES.amountYear).toBe(2025)
    expect(AGUINALDO_RETIREES.benefit).toMatch(/edición 2025/i)
    expect(AGUINALDO_RETIREES.eligibility).toMatch(/edición 2025/i)
    expect(AGUINALDO_RETIREES.eligibility).toContain('31 de octubre de 2025')
    // Y dice que la cifra de la edición siguiente no sale de esta página.
    expect(AGUINALDO_RETIREES.benefit).toMatch(/cada año/i)
  })

  // "3.111 BPC" se lee en Uruguay como tres mil ciento once. Es 3,111.
  it('el tope en BPC usa la coma decimal uruguaya', () => {
    expect(AGUINALDO_RETIREES.eligibility).toContain('3,111 BPC')
    expect(AGUINALDO_RETIREES.eligibility).not.toContain('3.111 BPC')
  })
})

// Fix round final. Tres cosas que el texto decía de más o de menos.
describe('lo que dice la ley, con la palabra de la ley', () => {
  it('la multa del art. 7 es el doble del SUELDO ANUAL COMPLEMENTARIO, no de lo adeudado', () => {
    const multa = AGUINALDO_LATE_PAYMENT_CONSEQUENCES.find(c => /doble/i.test(c.label))!
    expect(multa.detail).toMatch(/doble del monto del sueldo anual complementario/i)
    expect(multa.detail).not.toMatch(/doble del monto adeudado/i)
    const faq = AGUINALDO_FAQ.find(f => /doble/i.test(f.answer))
    expect(faq?.answer).toMatch(/doble del monto del sueldo anual complementario/i)
    for (const f of AGUINALDO_FAQ) expect(f.answer).not.toMatch(/doble del monto adeudado/i)
  })

  // La fila de licencia vive en una tabla titulada "Qué dice la fuente oficial", y el dossier la
  // marca como "Abierto / no se investigó": tiene que leerse como razonamiento, no como cita.
  it('la fila de licencia se declara razonamiento, no cita', () => {
    const licencia = AGUINALDO_LEAVE_CASES.find(l => /licencia/i.test(l.situation))!
    expect(licencia.detail).toMatch(/razonamiento/i)
    expect(licencia.detail).toMatch(/no hay una página oficial/i)
    // Y remite a dónde confirmarlo, como hace la fila del seguro de paro.
    expect(licencia.detail).toMatch(/MTSS|BPS/)
    // Las otras dos filas sí citan una fuente y no llevan esa advertencia.
    const enfermedad = AGUINALDO_LEAVE_CASES.find(l => /enfermedad/i.test(l.situation))!
    expect(enfermedad.detail).not.toMatch(/razonamiento/i)
  })
})
