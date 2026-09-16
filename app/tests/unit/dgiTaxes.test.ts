import { describe, expect, it } from 'vitest'

import {
  DEBT_REGIMES,
  DEPARTMENTAL_EXCLUSION,
  DGI_FAQ,
  DGI_SOURCES,
  EXTENSION_CAUSES,
  GOOD_HISTORY_RELIEF,
  INTERRUPTION_CAUSES,
  INTERRUPTION_WARNING,
  IRPF_CAMPAIGN,
  IRPF_FORMS,
  MORA_FACILIDADES_PCT,
  MORA_TIERS,
  NOT_OBLIGATED,
  OBLIGATION_CASES,
  PRESCRIPTION_NOT_AUTOMATIC,
  PRESCRIPTION_START,
  PRESCRIPTION_YEARS,
  PRESCRIPTION_YEARS_EXTENDED,
  RECARGOS_RULE,
  REFUND_RULE,
  RENTAL_CREDIT_ADVANCE_QUOTE,
  RENTAL_CREDIT_BASIS,
  RENTAL_CREDIT_CAP_QUOTE,
  RENTAL_CREDIT_CONDITION,
  RENTAL_CREDIT_CONFUSION,
  RENTAL_CREDIT_CONTRACT_QUOTE,
  RENTAL_CREDIT_FACTS,
  RENTAL_CREDIT_FORMS_QUOTE,
  RENTAL_CREDIT_IRPF_REQUIRED_QUOTE,
  RENTAL_CREDIT_MULTI_TENANT_QUOTE,
  RENTAL_CREDIT_ORDER_QUOTE,
  RENTAL_CREDIT_PCT,
  RENTAL_CREDIT_PCT_HISTORIC,
  RENTAL_CREDIT_QUOTE,
  RENTAL_CREDIT_REGISTRATION_QUOTE,
  RENTAL_CREDIT_SOURCE_URL,
  RENTAL_CREDIT_TITULAR_QUOTE,
  RENTAL_CREDIT_TOURISM_PCT,
  RENTAL_CREDIT_TOURISM_QUOTE,
  SANCTIONS_PRESCRIPTION,
} from '../../utils/dgiTaxes'

describe('campaña de IRPF', () => {
  it('declara a qué ejercicio corresponde, no sólo el número', () => {
    // El umbral cambia todos los años: publicarlo suelto lo vuelve engañoso en doce meses.
    expect(IRPF_CAMPAIGN.incomeYear).toBe(2025)
    expect(IRPF_CAMPAIGN.campaignYear).toBe(2026)
    expect(IRPF_CAMPAIGN.incomeThreshold).toBeGreaterThan(0)
  })

  it('las fechas están en orden y son ISO', () => {
    const d = IRPF_CAMPAIGN
    for (const k of ['opensForDependents', 'opens', 'deadline', 'refundsFrom'] as const) {
      expect(d[k]).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
    expect(d.opensForDependents <= d.opens).toBe(true)
    expect(d.opens < d.deadline).toBe(true)
    expect(d.refundsFrom > d.opens).toBe(true)
  })

  it('la regla del día 15 está publicada', () => {
    expect(IRPF_CAMPAIGN.refundCutoffDay).toBe(15)
    expect(REFUND_RULE).toMatch(/15/)
    expect(REFUND_RULE).toMatch(/mes siguiente/i)
  })

  it('cubre los tres tipos de declarante y el caso más común', () => {
    const kinds = new Set(OBLIGATION_CASES.map(c => c.kind))
    expect(kinds).toEqual(new Set(['dependiente', 'independiente', 'capital']))
    expect(OBLIGATION_CASES.some(c => /m[aá]s de un empleador/i.test(c.situation))).toBe(true)
  })

  it('dice explícitamente quién NO está obligado', () => {
    expect(NOT_OBLIGATED).toMatch(/un solo empleador/i)
    expect(NOT_OBLIGATED.length).toBeGreaterThan(80)
  })

  it('lista los tres formularios', () => {
    const codes = IRPF_FORMS.map(f => f.code)
    expect(codes).toContain('1102')
    expect(codes).toContain('1103')
    expect(codes).toContain('1101')
  })
})

describe('crédito fiscal de IRPF por arrendamiento (T.O. 2023 DGI, art. 51 T7)', () => {
  // EL HALLAZGO: el porcentaje vigente es 8 %, no el 6 % que circula. Confundir uno con
  // otro es el error concreto que esta sección existe para corregir.
  it('el porcentaje vigente es 8 %, no 6 %', () => {
    expect(RENTAL_CREDIT_PCT).toBe(8)
    expect(RENTAL_CREDIT_PCT).not.toBe(RENTAL_CREDIT_PCT_HISTORIC)
  })

  it('el 6 % histórico y el 6 % turístico son cifras iguales pero de regímenes distintos', () => {
    expect(RENTAL_CREDIT_PCT_HISTORIC).toBe(6)
    expect(RENTAL_CREDIT_TOURISM_PCT).toBe(6)
  })

  it('publica la cita verbatim del artículo, con el 8 % y la condición del arrendador', () => {
    expect(RENTAL_CREDIT_QUOTE).toMatch(/8% \(ocho por ciento\)/)
    expect(RENTAL_CREDIT_QUOTE).toMatch(/vivienda permanente/i)
    expect(RENTAL_CREDIT_QUOTE).toMatch(/se identifique el arrendador/i)
  })

  it('publica la cita del régimen turístico como algo DISTINTO, no como el crédito general', () => {
    expect(RENTAL_CREDIT_TOURISM_QUOTE).toMatch(/6% \(seis por ciento\)/)
    expect(RENTAL_CREDIT_TOURISM_QUOTE).toMatch(/tur[ií]sticos/i)
  })

  // Fix round 3: "única condición" / "no exige nada más" era falso — se contradecía con la
  // propia tabla de la sección, que exige además contrato/titular/IRPF generado. El ARTÍCULO
  // sólo exige identificar al arrendador; la guía de DGI agrega las condiciones operativas.
  it('distingue lo que exige el artículo de lo que agrega la guía de DGI, sin decir "única"', () => {
    expect(RENTAL_CREDIT_CONDITION).toMatch(/identificar al arrendador/i)
    expect(RENTAL_CREDIT_CONDITION).toMatch(/titular del contrato/i)
    expect(RENTAL_CREDIT_CONDITION).toMatch(/haber generado IRPF/i)
    expect(RENTAL_CREDIT_CONDITION).not.toMatch(/única condición|unica condicion/i)
    expect(RENTAL_CREDIT_CONDITION).not.toMatch(/no exige nada más/i)
  })

  it('nada publicado de esta sección repite la afirmación falsa de la "única condición"', () => {
    const rentalCreditTexts = [
      RENTAL_CREDIT_QUOTE,
      RENTAL_CREDIT_TOURISM_QUOTE,
      RENTAL_CREDIT_CONDITION,
      RENTAL_CREDIT_CONFUSION,
      RENTAL_CREDIT_BASIS,
      ...RENTAL_CREDIT_FACTS.map(f => f.quote),
      ...DGI_FAQ.filter(f => /alquiler/i.test(f.question)).map(f => f.answer),
    ]
    for (const text of rentalCreditTexts) {
      expect(text).not.toMatch(/única condición|unica condicion/i)
      expect(text).not.toMatch(/no exige nada más/i)
    }
  })

  it('agrega la condición de ser titular del contrato, que la sección no publicaba — cita verbatim', () => {
    expect(RENTAL_CREDIT_TITULAR_QUOTE).toMatch(/titulares del contrato de arrendamiento/i)
    expect(RENTAL_CREDIT_TITULAR_QUOTE).toMatch(/solamente podrán acceder/i)
  })

  it('exige haber generado IRPF por rentas de trabajo en el ejercicio — cita verbatim, sin año fijo', () => {
    expect(RENTAL_CREDIT_IRPF_REQUIRED_QUOTE).toMatch(/haber generado IRPF por rentas de trabajo/i)
    expect(RENTAL_CREDIT_IRPF_REQUIRED_QUOTE).toMatch(/durante el ejercicio/i)
    // Cortada a propósito antes del año de la campaña (round 2); el corte se marca con "…".
    expect(RENTAL_CREDIT_IRPF_REQUIRED_QUOTE).toMatch(/…$/)
    expect(RENTAL_CREDIT_IRPF_REQUIRED_QUOTE).not.toMatch(/2025/)
  })

  it('explica por qué el 6 % sigue circulando sin afirmar la ley/decreto puntual del cambio', () => {
    expect(RENTAL_CREDIT_CONFUSION).toMatch(/31\/12\/2023/)
    expect(RENTAL_CREDIT_CONFUSION).toMatch(/tur[ií]sticos/i)
    // No se inventa un número de ley/decreto que el dossier marcó sin verificar.
    expect(RENTAL_CREDIT_CONFUSION).not.toMatch(/ley n[uú]mero|decreto n[uú]mero|ley \d{2}\.\d{3}/i)
  })

  // Los cinco puntos que el dossier marcaba SIN VERIFICAR (plazo del contrato, registro,
  // formulario exacto, tope, orden IRPF→IASS) se confirmaron con cita verbatim propia contra
  // la publicación de DGI y se promovieron a hecho: fix round 1 de este task.
  it('el contrato: escrito, un año o más, puede estar vencido — cita verbatim COMPLETA', () => {
    expect(RENTAL_CREDIT_CONTRACT_QUOTE).toMatch(/celebrados por escrito/i)
    expect(RENTAL_CREDIT_CONTRACT_QUOTE).toMatch(/plazo igual o mayor a un año/i)
    expect(RENTAL_CREDIT_CONTRACT_QUOTE).toMatch(/se encuentren vencidos/i)
    // Fix round 3: la oración real sigue después de "año" — cortarla ahí sin marcarlo
    // presentaba una oración truncada como si fuera la cita entera.
    expect(RENTAL_CREDIT_CONTRACT_QUOTE).toMatch(/en tanto puedan identificar al arrendador/i)
    expect(RENTAL_CREDIT_CONTRACT_QUOTE.trim().endsWith('identificar al arrendador.')).toBe(true)
  })

  it('no hace falta registrar el contrato — cita verbatim', () => {
    expect(RENTAL_CREDIT_REGISTRATION_QUOTE).toMatch(/no es condición necesaria/i)
    expect(RENTAL_CREDIT_REGISTRATION_QUOTE).toMatch(/inscripto/i)
  })

  it('el formulario para reclamarlo es el 1102 o el 1103 — cita verbatim', () => {
    expect(RENTAL_CREDIT_FORMS_QUOTE).toMatch(/formulario 1102 o 1103/i)
  })

  it('el tope: el excedente no se devuelve ni se arrastra — cita verbatim', () => {
    expect(RENTAL_CREDIT_CAP_QUOTE).toMatch(
      /no podrá ser imputado a impuestos de futuros ejercicios/i
    )
    expect(RENTAL_CREDIT_CAP_QUOTE).toMatch(/dará derecho a devolución/i)
  })

  it('el orden es IRPF primero y el excedente después contra IASS — cita verbatim', () => {
    expect(RENTAL_CREDIT_ORDER_QUOTE).toMatch(/primer término al IRPF/i)
    expect(RENTAL_CREDIT_ORDER_QUOTE).toMatch(/excedente podrá imputarse al IASS/i)
  })

  it('publica las nueve citas juntas, en el orden de la sección y el FAQ', () => {
    expect(RENTAL_CREDIT_FACTS).toHaveLength(9)
    const quotes = RENTAL_CREDIT_FACTS.map(f => f.quote)
    expect(quotes).toEqual([
      RENTAL_CREDIT_CONTRACT_QUOTE,
      RENTAL_CREDIT_TITULAR_QUOTE,
      RENTAL_CREDIT_IRPF_REQUIRED_QUOTE,
      RENTAL_CREDIT_REGISTRATION_QUOTE,
      RENTAL_CREDIT_FORMS_QUOTE,
      RENTAL_CREDIT_CAP_QUOTE,
      RENTAL_CREDIT_ORDER_QUOTE,
      RENTAL_CREDIT_ADVANCE_QUOTE,
      RENTAL_CREDIT_MULTI_TENANT_QUOTE,
    ])
    // Cada hecho promovido trae su propio encabezado legible, no un genérico repetido.
    expect(new Set(RENTAL_CREDIT_FACTS.map(f => f.heading)).size).toBe(9)
  })

  it('enlaza la publicación oficial de DGI sobre este crédito, y aparece en DGI_SOURCES', () => {
    expect(RENTAL_CREDIT_SOURCE_URL).toMatch(/^https:\/\/(www\.)?gub\.uy\//)
    expect(DGI_SOURCES.some(s => s.url === RENTAL_CREDIT_SOURCE_URL)).toBe(true)
  })

  it('las cuatro preguntas del FAQ sobre alquiler están y responden con el 8 %', () => {
    const cuanto = DGI_FAQ.find(f => /cu[aá]nto puedo descontar/i.test(f.question))
    const seisUOcho = DGI_FAQ.find(f => /6 % u 8 %/i.test(f.question))
    const comoReclamo = DGI_FAQ.find(f => /c[oó]mo reclamo/i.test(f.question))
    const tieneTope = DGI_FAQ.find(f => /tiene tope/i.test(f.question))
    expect(cuanto?.answer).toMatch(/8 %/)
    expect(seisUOcho?.answer).toMatch(/8 %/)
    expect(seisUOcho?.answer).toMatch(/6 %/)
    // Fix round 3: la cita del régimen turístico embebida acá también estaba cortada a mitad
    // de oración (faltaba la cláusula de identificación), sin marcarlo.
    expect(seisUOcho?.answer).toMatch(/siempre que se identifique al arrendador/i)
    // Las dos nuevas preguntas responden con los hechos recién confirmados, no con un hedge.
    expect(comoReclamo?.answer).toMatch(/formulario 1102 o 1103/i)
    expect(comoReclamo?.answer).toMatch(/plazo igual o mayor a un año/i)
    expect(comoReclamo?.answer).toMatch(/en tanto puedan identificar al arrendador/i)
    expect(comoReclamo?.answer).toMatch(/titulares del contrato de arrendamiento/i)
    expect(comoReclamo?.answer).not.toMatch(/confirmalos en DGI|confirmalo en DGI/i)
    expect(tieneTope?.answer).toMatch(/IASS/)
    expect(tieneTope?.answer).toMatch(/dará derecho a devolución/i)
    // Fix round 3: "cuánto puedo descontar" ya no afirma que identificar al arrendador es la
    // única condición — la guía de DGI agrega ser titular, contrato y haber generado IRPF.
    expect(cuanto?.answer).toMatch(/titular del contrato de arrendamiento/i)
    expect(cuanto?.answer).not.toMatch(/única condición|no exige nada más/i)
  })

  // Fix round 2: la guía de DGI está fechada 26/01/2026 y habla del "año 2025" porque es la
  // guía de esa campaña puntual. La regla de fondo no es un año fijo, así que la sección la
  // generaliza como "el ejercicio que declarás" — y nada publicado cita "2025".
  it('generaliza la base de cálculo al ejercicio que se declara, no a un año fijo', () => {
    expect(RENTAL_CREDIT_BASIS).toMatch(/ejercicio que declar/i)
    expect(RENTAL_CREDIT_BASIS).toMatch(/8 %/)
    expect(RENTAL_CREDIT_BASIS).not.toMatch(/2025|2026|2027/)
  })

  it('alquiler pagado por adelantado: sólo se imputa lo devengado ese año — cita verbatim', () => {
    expect(RENTAL_CREDIT_ADVANCE_QUOTE).toMatch(/por adelantado/i)
    expect(RENTAL_CREDIT_ADVANCE_QUOTE).toMatch(
      /efectivamente pagado y devengado en el año correspondiente/i
    )
  })

  it('dos o más arrendatarios: de común acuerdo, o en partes iguales — cita verbatim', () => {
    expect(RENTAL_CREDIT_MULTI_TENANT_QUOTE).toMatch(/común acuerdo/i)
    expect(RENTAL_CREDIT_MULTI_TENANT_QUOTE).toMatch(/partes iguales/i)
  })

  it('ningún texto publicado de esta sección cita un año fijo (2025/2026/2027)', () => {
    const rentalCreditTexts = [
      RENTAL_CREDIT_QUOTE,
      RENTAL_CREDIT_TOURISM_QUOTE,
      RENTAL_CREDIT_CONDITION,
      RENTAL_CREDIT_CONFUSION,
      RENTAL_CREDIT_BASIS,
      ...RENTAL_CREDIT_FACTS.map(f => f.quote),
    ]
    for (const text of rentalCreditTexts) expect(text).not.toMatch(/\b2025\b|\b2026\b|\b2027\b/)
    // El 31/12/2023 sí es un dato legal fijo (el corte de la reforma), no un año de campaña.
    expect(RENTAL_CREDIT_CONFUSION).toMatch(/31\/12\/2023/)
  })

  it('ninguna respuesta del FAQ de alquiler cita un año de campaña fijo', () => {
    const rentalFaqs = DGI_FAQ.filter(f => /alquiler/i.test(f.question))
    expect(rentalFaqs.length).toBeGreaterThanOrEqual(4)
    for (const f of rentalFaqs) {
      expect(f.answer).not.toMatch(/\b2025\b|\b2026\b|\b2027\b/)
      expect(f.short).not.toMatch(/\b2025\b|\b2026\b|\b2027\b/)
    }
  })
})

describe('mora (art. 94)', () => {
  it('la multa escala con el atraso', () => {
    expect(MORA_TIERS.map(t => t.pct)).toEqual([5, 10, 20])
    for (let i = 1; i < MORA_TIERS.length; i++) {
      expect(MORA_TIERS[i].pct).toBeGreaterThan(MORA_TIERS[i - 1].pct)
    }
  })

  it('facilidades de pago paga el tramo intermedio', () => {
    expect(MORA_FACILIDADES_PCT).toBe(10)
  })

  // No publicamos una tasa de recargo: la fija el PE y el art. 94 sólo pone un techo relativo.
  it('no publica una tasa de recargo concreta, sí la regla', () => {
    expect(RECARGOS_RULE).toMatch(/Poder Ejecutivo/)
    expect(RECARGOS_RULE).toMatch(/Banco Central/)
    expect(RECARGOS_RULE).not.toMatch(/\d+(?:,\d+)?\s*% mensual/)
  })

  it('documenta la salida por buena historia de pago', () => {
    expect(GOOD_HISTORY_RELIEF).toMatch(/sin multa/i)
    expect(GOOD_HISTORY_RELIEF).toMatch(/un año/i)
  })
})

describe('prescripción tributaria', () => {
  it('cinco años, diez en los supuestos agravados', () => {
    expect(PRESCRIPTION_YEARS).toBe(5)
    expect(PRESCRIPTION_YEARS_EXTENDED).toBe(10)
    expect(EXTENSION_CAUSES.length).toBeGreaterThanOrEqual(5)
  })

  it('el cómputo arranca al fin del año civil, no cuando te reclaman', () => {
    expect(PRESCRIPTION_START).toMatch(/a[ñn]o civil/i)
  })

  // La trampa práctica: el plazo cumplido no borra nada por sí solo.
  it('deja claro que no es automática', () => {
    expect(PRESCRIPTION_NOT_AUTOMATIC).toMatch(/NO opera autom/i)
    expect(PRESCRIPTION_NOT_AUTOMATIC).toMatch(/petici[oó]n de parte/i)
  })

  it('las sanciones siguen al tributo salvo la contravención', () => {
    expect(SANCTIONS_PRESCRIPTION).toMatch(/contravenci[oó]n/i)
    expect(SANCTIONS_PRESCRIPTION).toMatch(/cinco a[ñn]os/i)
  })

  it('documenta qué interrumpe el plazo', () => {
    // El art. 39 enumera SEIS causales y la pagina publicaba dos como si fueran la lista entera.
    // Las que faltaban son las que dependen del propio deudor —reconocer la deuda, pagar una
    // parte— o sea las unicas que alguien puede disparar sin querer leyendo esta pagina.
    expect(INTERRUPTION_CAUSES).toHaveLength(6)
    const todas = INTERRUPTION_CAUSES.join(' ')
    expect(todas).toMatch(/acta final de inspecci[oó]n/i)
    expect(todas).toMatch(/reconocimiento expreso o t[aá]cito/i)
    expect(todas).toMatch(/pago o consignaci[oó]n total o parcial/i)
    expect(todas).toMatch(/emplazamiento judicial/i)
    expect(todas).toMatch(/dem[aá]s medios del derecho com[uú]n/i)
    // Y la advertencia tiene que decir lo que cambia una decision de hoy.
    expect(INTERRUPTION_WARNING).toMatch(/pagar una parte|cuota/i)
  })
})

describe('el error que la página existe para evitar', () => {
  // Código Tributario art. 1: se aplica a todos los tributos EXCEPTO aduaneros y departamentales.
  it('avisa que la patente NO se rige por el artículo 38', () => {
    expect(DEPARTMENTAL_EXCLUSION).toMatch(/departamentales/i)
    expect(DEPARTMENTAL_EXCLUSION).toMatch(/patente/i)
    expect(DEPARTMENTAL_EXCLUSION).toMatch(/intendencia/i)
  })

  it('separa los tres regímenes que la gente mezcla', () => {
    expect(DEBT_REGIMES).toHaveLength(3)
    const labels = DEBT_REGIMES.map(r => r.label).join(' ')
    expect(labels).toMatch(/nacionales/i)
    expect(labels).toMatch(/departamentales/i)
    expect(labels).toMatch(/privada/i)
    // La deuda privada ya tiene su página: hay que mandar ahí, no re-explicarla.
    expect(DEBT_REGIMES.find(r => /privada/i.test(r.label))?.to).toBe('/saldar-deudas-uruguay')
  })
})

describe('integridad', () => {
  it('cada pregunta del FAQ tiene respuesta corta y desarrollo', () => {
    expect(DGI_FAQ.length).toBeGreaterThanOrEqual(6)
    for (const f of DGI_FAQ) {
      expect(f.question.endsWith('?')).toBe(true)
      expect(f.short.length).toBeGreaterThan(10)
      expect(f.answer.length).toBeGreaterThan(120)
    }
  })

  it('toda regla publicada tiene fuente oficial', () => {
    expect(DGI_SOURCES.length).toBeGreaterThanOrEqual(6)
    for (const s of DGI_SOURCES) expect(s.url).toMatch(/^https:\/\/(www\.)?(impo|gub)\./)
    // Los cuatro artículos que sostienen la página.
    const urls = DGI_SOURCES.map(s => s.url).join(' ')
    for (const art of ['/1', '/38', '/39', '/94']) {
      expect(urls).toContain(`14306-1974${art}`)
    }
  })
})
