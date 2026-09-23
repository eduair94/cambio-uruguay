// El catálogo de /cuando-se-cobra-el-aguinaldo-uruguay.
//
// Lo que estas pruebas cuidan es que los HECHOS LEGALES no se corran solos: el aguinaldo es la
// doceava parte de lo cobrado en dinero, la cuota de junio tiene tope el 30 de junio y la de
// diciembre el techo de la ley (los diez días anteriores al 24) acortado por el decreto del año
// (en 2026, el 20 de diciembre). Cada uno sale de una fuente oficial; un cambio silencioso
// convierte la página en desinformación laboral, así que quedan fijados acá.

import { describe, expect, it } from 'vitest'

import {
  AGUINALDO_2026_CALENDAR,
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
  AGUINALDO_UNREGISTERED,
  AGUINALDO_VERIFIED_AT,
  aguinaldoFromCashSalaries,
  aguinaldoProporcional,
} from '../../utils/aguinaldo'

const ALL_TEXT = JSON.stringify({
  AGUINALDO_2026_CALENDAR,
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
  AGUINALDO_UNREGISTERED,
})

describe('las dos cuotas del aguinaldo', () => {
  it('describe exactamente la primera y la segunda mitad', () => {
    expect(AGUINALDO_MILESTONES.map(m => m.key)).toEqual(['primera', 'segunda'])
  })

  it('la cuota de diciembre lleva el techo legal (Ley 12.840) y la fecha del decreto 2026', () => {
    const segunda = AGUINALDO_MILESTONES.find(m => m.key === 'segunda')
    expect(segunda?.when).toMatch(/24 de diciembre/)
    expect(segunda?.when).toMatch(/20 de diciembre de 2026/)
    expect(segunda?.source).toMatch(/Ley 12\.840/)
    expect(segunda?.source).toMatch(/113\/026/)
  })

  // Corrección del 2026-09-22: la versión anterior decía que la fecha de junio «sale un día
  // impredecible». El DL 14.525 y el decreto anual dicen «dentro del mes de junio»: el tope es el
  // 30. Lo que cambia cada año es la fecha del decreto, no el tope.
  it('la cuota de junio tiene tope el 30 de junio, fijado por el DL 14.525 y el decreto anual', () => {
    const primera = AGUINALDO_MILESTONES.find(m => m.key === 'primera')
    expect(primera?.source).toMatch(/14\.525/)
    expect(primera?.when).toMatch(/30 de junio/)
    expect(primera?.when.toLowerCase()).toContain('dentro del mes de junio')
    expect(ALL_TEXT).not.toMatch(/impredecible/i)
  })
})

describe('el calendario 2026', () => {
  it('el decreto 2026 es el 113/026 y fija el 20 de diciembre (domingo) y el 30 de junio', () => {
    expect(AGUINALDO_2026_DECREE.number).toBe('Decreto 113/026')
    expect(AGUINALDO_2026_DECREE.url).toBe('https://www.impo.com.uy/bases/decretos/113-2026')
    expect(AGUINALDO_2026_DECREE.decemberDeadline).toBe('20 de diciembre de 2026')
    expect(AGUINALDO_2026_DECREE.decemberWeekday).toBe('domingo')
    expect(AGUINALDO_2026_DECREE.juneDeadline).toBe('30 de junio de 2026')
    expect(AGUINALDO_2026_DECREE.juneNote).toMatch(/30 de junio/)
    // El decreto dice «hasta el 20», no «antes del 20» como los anteriores: la nota lo aclara.
    expect(AGUINALDO_2026_DECREE.wordingNote).toMatch(/hasta el 20/)
  })

  it('separa privados, funcionarios públicos y construcción, cada uno con su norma', () => {
    const who = AGUINALDO_2026_CALENDAR.map(r => r.who.toLowerCase())
    expect(who.some(w => w.includes('privado'))).toBe(true)
    expect(who.some(w => w.includes('públicos'))).toBe(true)
    expect(who.some(w => w.includes('construcción'))).toBe(true)
    const publicos = AGUINALDO_2026_CALENDAR.find(r => /públicos/i.test(r.who))!
    expect(publicos.norm).toMatch(/122\/026/)
    expect(publicos.june).toMatch(/18 de junio de 2026/)
    // La cuota de diciembre del sector público no tiene decreto: se dice, no se inventa.
    expect(publicos.december).toMatch(/no tiene decreto/i)
    for (const row of AGUINALDO_2026_CALENDAR) expect(row.norm.length).toBeGreaterThan(0)
  })

  // La Ley 12.840 alcanza a patronos privados y personas públicas no estatales. Los funcionarios
  // públicos tienen norma propia (DL 14.360). El texto anterior decía «tanto en la actividad
  // privada como en el sector público» citando la ley equivocada.
  it('no atribuye el aguinaldo de los funcionarios públicos a la Ley 12.840', () => {
    const todos = AGUINALDO_FAQ.find(f => /todos los trabajadores/i.test(f.question))!
    expect(todos.answer).toMatch(/14\.360/)
    expect(todos.answer).toMatch(/pública no estatal/)
    expect(todos.answer).not.toMatch(/tanto en la actividad privada como en el sector público/i)
  })
})

describe('la base del aguinaldo', () => {
  it('toma el sueldo en dinero y deja afuera los tickets de alimentación', () => {
    const tickets = AGUINALDO_BASE_RULES.find(r => /tickets/i.test(r.item))
    expect(tickets?.counts).toBe(false)
    const sueldo = AGUINALDO_BASE_RULES.find(r => /dinero/i.test(r.item))
    expect(sueldo?.counts).toBe(true)
  })

  it('las prestaciones en especie no integran la base, salvo la excepción rural con su ley', () => {
    const especie = AGUINALDO_BASE_RULES.find(r => /especie/i.test(r.item))
    expect(especie?.counts).toBe(false)
    const rural = AGUINALDO_BASE_RULES.find(r => /rural/i.test(r.item))
    expect(rural?.counts).toBe(true)
    expect(rural?.detail).toMatch(/13\.619/)
  })

  it('el salario vacacional, la participación en ganancias y el aguinaldo anterior quedan afuera, con norma', () => {
    const sv = AGUINALDO_BASE_RULES.find(r => /salario vacacional/i.test(r.item))
    expect(sv?.counts).toBe(false)
    expect(sv?.detail).toMatch(/49\/000/)
    const ganancias = AGUINALDO_BASE_RULES.find(r => /ganancias/i.test(r.item))
    expect(ganancias?.counts).toBe(false)
    expect(ganancias?.detail).toMatch(/12\.840/)
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

  it('incluye las preguntas de la cola de demanda', () => {
    const questions = AGUINALDO_FAQ.map(f => f.question)
    expect(questions.some(q => /3 meses/.test(q))).toBe(true)
    expect(questions.some(q => /incapacitad/.test(q))).toBe(true)
    expect(questions.some(q => /no me pagan/i.test(q))).toBe(true)
    expect(questions.some(q => /cuántos días/i.test(q))).toBe(true)
    expect(questions.some(q => /en negro/i.test(q))).toBe(true)
    expect(questions.some(q => /seguro de paro/i.test(q))).toBe(true)
    expect(questions.some(q => /diciembre de 2026/i.test(q))).toBe(true)
  })

  // El FAQ de «¿cuándo se cobra?» decía «antes del 24 de diciembre» a secas. En 2026 el decreto
  // acorta el plazo al 20: el FAQ lo lleva con el número del decreto.
  it('el FAQ de cuándo se cobra lleva el 20 de diciembre de 2026 y el decreto que lo fija', () => {
    const cuando = AGUINALDO_FAQ.find(f => /cuándo se cobra/i.test(f.question))!
    expect(cuando.answer).toMatch(/20 de diciembre/)
    expect(cuando.answer).toMatch(/113\/026/)
    expect(cuando.short).not.toMatch(/antes del 24/i)
  })

  it('el FAQ de descuentos dice que el IRPF del aguinaldo se calcula aparte, a la tasa marginal máxima', () => {
    const descuentos = AGUINALDO_FAQ.find(f => /descuentos/i.test(f.question))!
    expect(descuentos.answer).toMatch(/IRPF/)
    expect(descuentos.answer).toMatch(/tasa marginal máxima/i)
    // Lo que no se dice: que «te sube de franja».
    expect(descuentos.answer).not.toMatch(/te sube de franja(?! )/i)
  })

  it('cada fuente apunta a un organismo oficial (gub.uy, un subdominio suyo, o impo.com.uy)', () => {
    expect(AGUINALDO_SOURCES.length).toBeGreaterThanOrEqual(3)
    for (const s of AGUINALDO_SOURCES) {
      expect(s.url).toMatch(/^https:\/\/([\w-]+\.)*(gub\.uy|impo\.com\.uy)\//)
      expect(s.label.length).toBeGreaterThan(0)
    }
  })

  // El enlace al DL 14.525 apuntaba a /bases/leyes/, que en IMPO devuelve «Acceso no válido». La
  // URL pública del documento es /bases/decretos-ley/.
  it('el DL 14.525 se cita con su URL pública de IMPO, y el decreto 2026 está en las fuentes', () => {
    const urls = AGUINALDO_SOURCES.map(s => s.url)
    expect(urls).toContain('https://www.impo.com.uy/bases/decretos-ley/14525-1976')
    expect(urls).not.toContain('https://www.impo.com.uy/bases/leyes/14525-1976')
    expect(urls).toContain('https://www.impo.com.uy/bases/decretos/113-2026')
    expect(new Set(urls).size).toBe(urls.length)
  })

  it('la fecha de verificación es la de la última lectura, en formato ISO', () => {
    expect(AGUINALDO_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(AGUINALDO_VERIFIED_AT >= '2026-09-22').toBe(true)
  })

  it('escribe setiembre, nunca septiembre', () => {
    expect(ALL_TEXT).not.toMatch(/septiembre/i)
  })
})

describe('el plazo, la mora y dónde reclamar', () => {
  it('la multa del doble cita la Ley 12.840 y el recargo del 10 % cita la Ley 18.572', () => {
    const multa = AGUINALDO_LATE_PAYMENT_CONSEQUENCES.find(c => /doble/i.test(c.label))
    const recargo = AGUINALDO_LATE_PAYMENT_CONSEQUENCES.find(c => /10 ?%/.test(c.label))
    expect(multa?.source).toMatch(/12\.840/)
    expect(recargo?.source).toMatch(/18\.572/)
  })

  // La multa es una sanción (Ley 5.427): la cobra el Estado. El recargo del 10 % sí es del
  // trabajador. Confundirlos hace creer que «cobrás el doble».
  it('aclara que la multa no la cobra el trabajador y el recargo sí', () => {
    const multa = AGUINALDO_LATE_PAYMENT_CONSEQUENCES.find(c => /doble/i.test(c.label))!
    expect(multa.detail).toMatch(/5\.427/)
    expect(multa.detail).toMatch(/no vos/i)
    const recargo = AGUINALDO_LATE_PAYMENT_CONSEQUENCES.find(c => /10 ?%/.test(c.label))!
    expect(recargo.detail).toMatch(/a favor|va al trabajador/i)
  })

  it('el canal de denuncia trae oficina, email y al menos un teléfono', () => {
    expect(AGUINALDO_COMPLAINT_CHANNEL.office.length).toBeGreaterThan(0)
    expect(AGUINALDO_COMPLAINT_CHANNEL.email).toMatch(/@mtss\.gub\.uy$/)
    expect(AGUINALDO_COMPLAINT_CHANNEL.phones.length).toBeGreaterThan(0)
  })

  // La IGTSS sólo recibe denuncias con vínculo vigente; el desvinculado va al Centro de
  // Asesoramiento y las liquidaciones las hace DINATRA. Y hay un plazo para reclamar.
  it('dice a quién atiende la Inspección, a dónde va el desvinculado y hasta cuándo se reclama', () => {
    expect(AGUINALDO_COMPLAINT_CHANNEL.onlyWhileEmployed).toMatch(/vigente/i)
    expect(AGUINALDO_COMPLAINT_CHANNEL.afterLeaving).toMatch(/Centro de Asesoramiento/)
    expect(AGUINALDO_COMPLAINT_CHANNEL.liquidations).toMatch(/DINATRA/)
    expect(AGUINALDO_COMPLAINT_CHANNEL.prescription).toMatch(/18\.091/)
    expect(AGUINALDO_COMPLAINT_CHANNEL.prescription).toMatch(/al año|un año/i)
    expect(AGUINALDO_COMPLAINT_CHANNEL.prescription).toMatch(/cinco años/i)
  })
})

describe('en negro', () => {
  it('afirma el derecho con la ley y da los pasos para probar el vínculo', () => {
    expect(AGUINALDO_UNREGISTERED.right).toMatch(/12\.840/)
    expect(AGUINALDO_UNREGISTERED.right).toMatch(/relación de trabajo/i)
    expect(AGUINALDO_UNREGISTERED.steps.length).toBeGreaterThanOrEqual(3)
    expect(AGUINALDO_UNREGISTERED.steps.join(' ')).toMatch(/BPS/)
    expect(AGUINALDO_UNREGISTERED.steps.join(' ')).toMatch(/18\.091/)
  })
})

describe('régimen especial de la construcción', () => {
  // Corrección del 2026-09-22: el aguinaldo de la construcción lo liquida el BPS con la aportación
  // unificada de la Ley 14.411 (Decreto 951/975). El Fondo Social de la Construcción (Dec. 466/008)
  // es otra prestación y su página no menciona el aguinaldo. La versión anterior los confundía.
  it('lo paga el BPS por la Ley 14.411, no el Fondo Social', () => {
    expect(AGUINALDO_CONSTRUCTION.mechanism).toMatch(/BPS/)
    expect(AGUINALDO_CONSTRUCTION.mechanism).toMatch(/14\.411/)
    expect(AGUINALDO_CONSTRUCTION.mechanism).toMatch(/951\/975/)
    expect(AGUINALDO_CONSTRUCTION.mechanism).not.toMatch(/Fondo Social/)
    expect(AGUINALDO_CONSTRUCTION.notFondoSocial).toMatch(/466\/008/)
    expect(AGUINALDO_CONSTRUCTION.notFondoSocial).toMatch(/no menciona el aguinaldo/i)
  })

  it('lleva los períodos propios del sector: noviembre–abril en junio y mayo–octubre en diciembre', () => {
    expect(AGUINALDO_CONSTRUCTION.periods).toMatch(/noviembre/i)
    expect(AGUINALDO_CONSTRUCTION.periods).toMatch(/abril/i)
    expect(AGUINALDO_CONSTRUCTION.periods).toMatch(/mayo a octubre/i)
  })

  // La ventana «11 de junio / 14 al 17 de junio» era de la página del BPS de 2021. No se publica
  // una fecha de junio 2026 que el BPS no anunció; la última edición documentada es dic-2025.
  it('no publica una ventana de junio inventada: fecha la última edición (diciembre de 2025)', () => {
    expect(AGUINALDO_CONSTRUCTION.lastEdition).toMatch(/12 de diciembre de 2025/)
    expect(ALL_TEXT).not.toMatch(/11 de junio/)
    expect(ALL_TEXT).not.toMatch(/14 al 17 de junio/)
    const urls = AGUINALDO_SOURCES.map(s => s.url)
    expect(urls).not.toContain(
      'https://www.bps.gub.uy/18045/pago-de-aguinaldo-a-trabajadores-de-la-construccion.html'
    )
  })
})

describe('licencia, enfermedad, accidente, maternidad y seguro de paro', () => {
  it('cubre las seis situaciones', () => {
    const situations = AGUINALDO_LEAVE_CASES.map(l => l.situation)
    expect(situations.some(s => /licencia/i.test(s))).toBe(true)
    expect(situations.some(s => /enfermedad/i.test(s))).toBe(true)
    expect(situations.some(s => /BSE/.test(s))).toBe(true)
    expect(situations.some(s => /maternidad/i.test(s))).toBe(true)
    expect(situations.some(s => /seguro de paro/i.test(s))).toBe(true)
    expect(situations.some(s => /incapacidad parcial/i.test(s))).toBe(true)
  })

  // El seguro de paro: las normas no prevén cuota parte (DL 15.180 no la menciona; la página del
  // BPS define el monto sin ella), a diferencia de enfermedad, maternidad y paternidad. Se afirma
  // la asimetría con esas citas, sin inventar la frase «no genera» como si fuera oficial.
  it('el seguro de paro se explica como ausencia verificada en las normas, sin la frase «no genera»', () => {
    const paro = AGUINALDO_LEAVE_CASES.find(l => /seguro de paro/i.test(l.situation))!
    expect(paro.detail).not.toMatch(/no genera/i)
    expect(paro.detail).toMatch(/15\.180/)
    expect(paro.detail).toMatch(/BPS/)
    expect(paro.detail).toMatch(/maternidad/i)
  })

  it('la enfermedad cita el DL 14.407 y al BPS como pagador; el BSE se declara sin fuente', () => {
    const enfermedad = AGUINALDO_LEAVE_CASES.find(l => /enfermedad/i.test(l.situation))!
    expect(enfermedad.detail).toMatch(/14\.407/)
    expect(enfermedad.detail).toMatch(/cuota parte de aguinaldo/i)
    const bse = AGUINALDO_LEAVE_CASES.find(l => /BSE/.test(l.situation))!
    expect(bse.detail).toMatch(/no hay fuente primaria/i)
    expect(bse.detail).toMatch(/66,67 %/)
  })

  it('maternidad y paternidad citan la Ley 19.161', () => {
    const mat = AGUINALDO_LEAVE_CASES.find(l => /maternidad/i.test(l.situation))!
    expect(mat.detail).toMatch(/19\.161/)
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
    // Las otras filas sí citan una fuente y no llevan esa advertencia.
    const enfermedad = AGUINALDO_LEAVE_CASES.find(l => /enfermedad/i.test(l.situation))!
    expect(enfermedad.detail).not.toMatch(/razonamiento/i)
  })

  // No hay antigüedad mínima: la del año fue sólo para 1960 (art. 6). Se dice con el artículo.
  it('desarma el mito del año de antigüedad citando el art. 6 de la Ley 12.840', () => {
    const tresMeses = AGUINALDO_FAQ.find(f => /3 meses/.test(f.question))!
    expect(tresMeses.answer).toMatch(/1960/)
    expect(tresMeses.answer).toMatch(/art\. 6/)
  })
})
