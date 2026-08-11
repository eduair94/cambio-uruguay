import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  ASSE_ANYTIME_RULE,
  CHANGE_EFFECTIVE_RULE,
  COVERAGE_FALLBACKS,
  POST_CHANGE_LOCK_RULE,
  CPE_MENSUAL,
  CPE_MENSUAL_ANTERIOR,
  DIGIT_MONTH,
  EXTENSION_TRES_MESES_2020,
  FONASA_MANDATORY_RULE,
  FONASA_RATE_RULE,
  HEALTH_COVERAGE_VERIFIED_AT,
  MINOR_CONTINUITY_MIN_CONTRIB_MONTHS,
  MINOR_CONTINUITY_MONTHS,
  MINOR_CONTINUITY_WINDOW_MONTHS,
  REFUND_REACH_AFTER,
  REFUND_REACH_BEFORE,
  REFUND_TIMELINE,
  SNIS_PROVIDER_KINDS,
  URGENCY_RULES,
  topeAnualAporte,
  HEALTH_FAQ,
  HEALTH_SOURCES,
  LAST_PUBLISHED_REFUND,
  MIN_PERMANENCE_MONTHS,
  MOBILITY_EXCEPTIONS,
  MOBILITY_REQUIREMENTS,
  MONTH_NAMES,
  REFUND_FACTS,
  checkMobility,
} from '../../utils/healthProvider'

describe('calendario de movilidad regulada', () => {
  // El calendario de BPS, dígito por dígito. Si esto se rompe, la página le dice a alguien
  // que vaya a la mutualista el mes equivocado.
  it('asigna a cada dígito el mes que publica BPS', () => {
    expect(DIGIT_MONTH[3]).toBe(3) // marzo
    expect(DIGIT_MONTH[4]).toBe(4)
    expect(DIGIT_MONTH[5]).toBe(5)
    expect(DIGIT_MONTH[6]).toBe(6)
    expect(DIGIT_MONTH[7]).toBe(7)
    expect(DIGIT_MONTH[8]).toBe(8)
    expect(DIGIT_MONTH[9]).toBe(9)
    expect(DIGIT_MONTH[0]).toBe(10) // octubre
    expect(DIGIT_MONTH[1]).toBe(11)
    expect(DIGIT_MONTH[2]).toBe(12)
  })

  it('cubre los diez dígitos, sin repetir mes', () => {
    const months = Object.values(DIGIT_MONTH)
    expect(months).toHaveLength(10)
    expect(new Set(months).size).toBe(10)
  })

  it('no hay movilidad en enero ni febrero', () => {
    const months = Object.values(DIGIT_MONTH)
    expect(months).not.toContain(1)
    expect(months).not.toContain(2)
  })
})

describe('checkMobility', () => {
  it('con permanencia suficiente, habilita y nombra el mes', () => {
    const r = checkMobility({ cedulaDigit: 7, permanenceMonths: 30 })
    expect(r.month).toBe(7)
    expect(r.monthName).toBe('julio')
    expect(r.canChange).toBe(true)
    expect(r.monthsShort).toBe(0)
    expect(r.verdict).toContain('julio')
  })

  it('sin permanencia suficiente, dice cuántos meses faltan', () => {
    const r = checkMobility({ cedulaDigit: 0, permanenceMonths: 10 })
    expect(r.monthName).toBe('octubre')
    expect(r.canChange).toBe(false)
    expect(r.monthsShort).toBe(MIN_PERMANENCE_MONTHS - 10)
    expect(r.verdict).toContain('13')
  })

  it('el corte está exactamente en 23 meses', () => {
    expect(checkMobility({ cedulaDigit: 1, permanenceMonths: 22 }).canChange).toBe(false)
    expect(checkMobility({ cedulaDigit: 1, permanenceMonths: 23 }).canChange).toBe(true)
  })

  it('singulariza «mes» cuando falta uno solo', () => {
    const r = checkMobility({ cedulaDigit: 5, permanenceMonths: MIN_PERMANENCE_MONTHS - 1 })
    expect(r.verdict).toContain('1 mes ')
    expect(r.verdict).not.toContain('1 meses')
  })

  it('rechaza un dígito inválido sin romper', () => {
    const r = checkMobility({ cedulaDigit: 42, permanenceMonths: 30 })
    expect(r.month).toBeNull()
    expect(r.canChange).toBe(false)
    expect(r.verdict).toMatch(/dígito/)
  })

  it('trata una permanencia negativa como 0', () => {
    const r = checkMobility({ cedulaDigit: 3, permanenceMonths: -5 })
    expect(r.monthsShort).toBe(MIN_PERMANENCE_MONTHS)
  })

  it('el nombre del mes coincide con el índice del calendario', () => {
    for (const [digit, month] of Object.entries(DIGIT_MONTH)) {
      const r = checkMobility({ cedulaDigit: Number(digit), permanenceMonths: 24 })
      expect(r.monthName).toBe(MONTH_NAMES[month - 1])
    }
  })
})

describe('integridad de los datos publicados', () => {
  it('están documentados los requisitos y las cinco salidas fuera de fecha', () => {
    expect(MOBILITY_REQUIREMENTS.length).toBeGreaterThanOrEqual(4)
    expect(MOBILITY_EXCEPTIONS).toHaveLength(5)
    for (const e of MOBILITY_EXCEPTIONS) {
      expect(e.when.length).toBeGreaterThan(5)
      expect(e.detail.length).toBeGreaterThan(40)
    }
  })

  it('la regla de efectividad del cambio está escrita', () => {
    expect(CHANGE_EFFECTIVE_RULE).toMatch(/primer día hábil/)
  })

  // Los umbrales de la devolución cambian todos los años: publicarlos sin ejercicio los
  // convierte en desinformación doce meses después.
  it('la devolución publicada declara a qué ejercicio corresponde', () => {
    expect(LAST_PUBLISHED_REFUND.year).toBeGreaterThan(2020)
    expect(LAST_PUBLISHED_REFUND.workerThreshold).toBeGreaterThan(0)
    expect(LAST_PUBLISHED_REFUND.retireeThreshold).toBeGreaterThan(
      LAST_PUBLISHED_REFUND.workerThreshold
    )
    expect(LAST_PUBLISHED_REFUND.availableFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('los datos de la devolución explican el mecanismo', () => {
    expect(REFUND_FACTS.length).toBeGreaterThanOrEqual(4)
    for (const f of REFUND_FACTS) expect(f.detail.length).toBeGreaterThan(40)
  })
})

describe('tope de aporte y el cambio de 2026', () => {
  // La aritmética que hace publicable la fórmula: con el CPE del Decreto 317/025 da exacto.
  it('el tope anual de una persona sola son $ 100.395', () => {
    expect(CPE_MENSUAL).toBe(6693)
    expect(topeAnualAporte(1)).toBe(100_395)
    expect(topeAnualAporte(1)).toBe(Math.round(CPE_MENSUAL * 12 * 1.25))
  })

  it('el tope escala con la cantidad de personas que cubrís', () => {
    expect(topeAnualAporte(2)).toBe(topeAnualAporte(1) * 2)
    expect(topeAnualAporte(3)).toBeGreaterThan(topeAnualAporte(2))
  })

  it('nunca calcula con menos de un beneficiario', () => {
    expect(topeAnualAporte(0)).toBe(topeAnualAporte(1))
    expect(topeAnualAporte(-4)).toBe(topeAnualAporte(1))
  })

  it('el CPE nuevo es mayor que el anterior, que es lo que reduce el alcance', () => {
    expect(CPE_MENSUAL).toBeGreaterThan(CPE_MENSUAL_ANTERIOR)
    expect(topeAnualAporte(1, CPE_MENSUAL)).toBeGreaterThan(
      topeAnualAporte(1, CPE_MENSUAL_ANTERIOR)
    )
    expect(REFUND_REACH_AFTER).toBeLessThan(REFUND_REACH_BEFORE)
  })

  // El error de plazos que la página existe para evitar: creer que ya te afecta este año.
  it('deja claro qué ejercicio va por el régimen anterior y cuál por el nuevo', () => {
    const prev = REFUND_TIMELINE.find(t => t.regime === 'anterior')!
    const next = REFUND_TIMELINE.find(t => t.regime === 'nuevo')!
    expect(prev.contributionYear).toBe(2025)
    expect(prev.paidIn).toBe(2026)
    expect(next.contributionYear).toBe(2026)
    expect(next.paidIn).toBe(2027)
    expect(next.contributionYear).toBeGreaterThan(prev.contributionYear)
  })

  it('cita el decreto que fija el CPE', () => {
    expect(HEALTH_SOURCES.some(s => s.url.includes('317-2025'))).toBe(true)
  })
})

// EL ERROR QUE ESTE BLOQUE EXISTE PARA IMPEDIR. La primera versión de la página enumeraba
// «las cuatro salidas fuera de fecha» y omitía la más ancha de todas, que además ya estaba en la
// fuente citada en primer lugar: BPS 16772 dice, bajo «Condiciones para realizar el cambio», que
// «el cambio hacia ASSE o seguros integrales puede realizarse en cualquier momento». Alguien que
// se quiere pasar a ASSE leía las cuatro salidas, no se reconocía en ninguna y esperaba hasta
// once meses su mes por dígito para un cambio que puede hacer hoy.
describe('el cambio hacia ASSE o un seguro integral no está atado al calendario', () => {
  it('la salida está publicada entre las excepciones, y es la primera', () => {
    const libre = MOBILITY_EXCEPTIONS.find(e => /ASSE/.test(e.title))
    expect(libre).toBeTruthy()
    expect(MOBILITY_EXCEPTIONS[0]).toBe(libre)
    expect(libre!.title).toMatch(/seguro integral/i)
    expect(libre!.when).toMatch(/cualquier momento/i)
  })

  // La regla va apoyada en fuentes que la afirman de frente, no en el silencio de gub.uy sobre
  // la ventana anual, que fue como se coló la primera vez.
  it('la regla cita a BPS y a los dos decretos que la dicen con todas las letras', () => {
    expect(ASSE_ANYTIME_RULE).toMatch(/cualquier momento/)
    expect(ASSE_ANYTIME_RULE).toMatch(/344\/020 art\. 17/)
    expect(ASSE_ANYTIME_RULE).toMatch(/114\/023 art\. 5/)
    const urls = HEALTH_SOURCES.map(s => s.url).join(' ')
    expect(urls).toContain('decretos/344-2020')
    expect(urls).toContain('decretos/114-2023')
  })

  // La contrapartida honesta: entrar es libre, salir no. Publicar la salida sin el candado del
  // art. 13 la vende como reversible y no lo es.
  it('publica el candado de dos años que deja el cambio, no sólo la puerta abierta', () => {
    expect(POST_CHANGE_LOCK_RULE).toMatch(/dos años calendario/)
    expect(POST_CHANGE_LOCK_RULE).toMatch(/344\/020 art\. 13/)
  })

  it('el FAQ del cambio fuera de fecha nombra ASSE y el seguro integral, no sólo las cuatro causales', () => {
    const f = HEALTH_FAQ.find(q => /fuera del mes/i.test(q.question))!
    expect(f).toBeTruthy()
    expect(f.short).toMatch(/ASSE/)
    expect(f.answer).toMatch(/ASSE/)
    expect(f.answer).toMatch(/seguro integral/i)
    expect(f.answer).toMatch(/cualquier momento/)
  })

  // El FAQ que abre la página tampoco puede presentar el calendario como si mandara siempre.
  it('el FAQ del calendario aclara que sólo manda hacia una mutualista', () => {
    const f = HEALTH_FAQ.find(q => /¿Cuándo puedo cambiar de mutualista\?/.test(q.question))!
    expect(f.answer).toMatch(/ASSE/)
  })

  // El padrón del SNIS reforzaba el error diciendo que ASSE «se puede elegir con FONASA igual que
  // cualquier otro»: en el momento del cambio, justamente, no es igual que cualquier otro.
  it('la ficha de ASSE no la iguala al resto en la regla de movilidad', () => {
    const asse = SNIS_PROVIDER_KINDS.find(p => p.label === 'ASSE')!
    expect(asse.detail).not.toMatch(/igual que cualquier otro/)
    expect(asse.detail).toMatch(/cualquier momento/)
  })

  // Ni el módulo ni la página pueden seguir contando cuatro salidas.
  it('en ninguna parte quedan «cuatro» salidas, excepciones ni situaciones', () => {
    const texto = [
      ...MOBILITY_EXCEPTIONS.map(e => `${e.title} ${e.when} ${e.detail}`),
      ...HEALTH_FAQ.map(f => `${f.question} ${f.short} ${f.answer}`),
      ASSE_ANYTIME_RULE,
      POST_CHANGE_LOCK_RULE,
    ].join(' ')
    expect(texto).not.toMatch(/cuatro (salidas|excepciones|situaciones|causales)/i)
  })
})

describe('cese laboral: renuncia, despido, fin del seguro de paro', () => {
  // Los tres números de la continuidad de los hijos van juntos o no significan nada: 12 meses
  // de cobertura, pero sólo si hubo 12 meses de aportes dentro de una ventana de 24.
  it('la continuidad de los hijos publica los tres números que la condicionan', () => {
    expect(MINOR_CONTINUITY_MONTHS).toBe(12)
    expect(MINOR_CONTINUITY_MIN_CONTRIB_MONTHS).toBe(12)
    expect(MINOR_CONTINUITY_WINDOW_MONTHS).toBe(24)
    expect(MINOR_CONTINUITY_WINDOW_MONTHS).toBeGreaterThan(MINOR_CONTINUITY_MIN_CONTRIB_MONTHS)
  })

  // Si alguien un día borra el `inForce: false`, la página pasa a prometer tres meses de
  // cobertura que no existen desde 2020. Es el error más caro que puede cometer este módulo.
  it('la extensión de tres meses queda marcada como NO vigente y fechada', () => {
    expect(EXTENSION_TRES_MESES_2020.inForce).toBe(false)
    expect(EXTENSION_TRES_MESES_2020.year).toBe(2020)
    expect(EXTENSION_TRES_MESES_2020.months).toBe(3)
    expect(EXTENSION_TRES_MESES_2020.funding).toMatch(/Coronavirus|COVID/)
  })

  it('las salidas incluyen ASSE y la afiliación particular, con su detalle', () => {
    expect(COVERAGE_FALLBACKS.length).toBeGreaterThanOrEqual(3)
    const titles = COVERAGE_FALLBACKS.map(f => f.title).join(' | ')
    expect(titles).toMatch(/ASSE/)
    expect(titles).toMatch(/particular/i)
    for (const f of COVERAGE_FALLBACKS) expect(f.detail.length).toBeGreaterThan(60)
  })

  // ASSE no te afilia sola: decir lo contrario deja a alguien creyendo que está cubierto.
  it('deja claro que ASSE no es automático', () => {
    const asse = COVERAGE_FALLBACKS.find(f => f.title.includes('ASSE'))!
    expect(asse.detail).toMatch(/No es automático/)
    expect(asse.detail).toMatch(/no tiene costo/)
  })

  // El trámite de gub.uy pide «Certificado de Residencia. En subsidio: … la constancia de
  // residencia en trámite». La constancia de domicilio es OTRO papel (seccional o escribano):
  // nombrarla mal manda al lector al mostrador con la documentación equivocada.
  it('nombra el certificado de residencia como lo nombra el trámite, no «constancia de domicilio»', () => {
    const asse = COVERAGE_FALLBACKS.find(f => f.title.includes('ASSE'))!
    expect(asse.detail).toMatch(/certificado de residencia/i)
    expect(asse.detail).toMatch(/constancia de residencia en trámite/i)
    expect(asse.detail).not.toMatch(
      /con cédula, certificado de ingresos del hogar y constancia de domicilio/
    )
  })

  // gub.uy NO dice en ninguna parte que la afiliación se pueda hacer «en cualquier momento del
  // año»: sólo enumera los puestos de afiliación. Era un dato agregado, atribuido a una fuente
  // que no lo afirma. La corrección siguiente lo empeoró de otra manera: justificó la regla con
  // «sin ventana declarada», o sea con el silencio de gub.uy, cuando BPS y dos decretos la
  // afirman de frente. Un argumento del silencio se cae solo el día que la fuente cambia de
  // redacción; la norma, no.
  it('no le atribuye a gub.uy una ventana anual que la fuente no publica', () => {
    const asse = COVERAGE_FALLBACKS.find(f => f.title.includes('ASSE'))!
    expect(asse.detail).not.toMatch(/en cualquier momento del año/)
  })

  it('la salida a ASSE se apoya en la norma, no en el silencio de gub.uy', () => {
    const asse = COVERAGE_FALLBACKS.find(f => f.title.includes('ASSE'))!
    expect(asse.detail).not.toMatch(/sin ventana declarada/)
    expect(asse.detail).toMatch(/344\/020 art\. 17/)
  })

  // La regla cualitativa que reemplaza al dato que no existe: nadie publica que la mutualista
  // deba mantenerte sin carencias, así que se publica la ausencia y no una promesa.
  it('sobre seguir como socio particular publica la ausencia de norma, no una garantía', () => {
    const particular = COVERAGE_FALLBACKS.find(f => /particular/i.test(f.title))!
    expect(particular.detail).toMatch(/No consta norma/)
  })

  it('el FAQ responde el caso del despido y del fin del paro', () => {
    const f = HEALTH_FAQ.find(q => /renuncio|despiden|paro/i.test(q.question))!
    expect(f).toBeTruthy()
    expect(f.answer).toMatch(/12 meses|doce meses/)
    expect(f.answer).toMatch(/ASSE/)
    expect(f.answer).toMatch(/2020/)
  })

  // La continuidad de los menores NO sale de la página de BPS que se citaba: esa sólo habla de
  // «los menores de edad a su cargo», y el «(*) menores de 18 o mayores con discapacidad» es la
  // nota al pie de la TABLA DE APORTES, otra afirmación de la misma página. La norma que dice
  // quiénes y por cuánto es la Ley 18.731 art. 30, que además agrega dos precisiones.
  it('la continuidad cita la Ley 18.731 art. 30 y sus dos precisiones', () => {
    const hijos = COVERAGE_FALLBACKS.find(f => /12 meses/.test(f.title))!
    expect(hijos.detail).toMatch(/18\.731 art\. 30/)
    expect(hijos.detail).toMatch(/mayores de esa edad con discapacidad/)
    // Se cuentan desde el mes SIGUIENTE al cese, no desde el cese.
    expect(hijos.detail).toMatch(/mes SIGUIENTE al del cese/)
    // Y cesa antes si consigue amparo propio o por otro generante.
    expect(hijos.detail).toMatch(/por sí o a través de otro generante/)
  })

  // La ventana de 24 meses no está en la ley (que sólo exige «no menor a un año»): es criterio de
  // cómputo de BPS. Publicarla como si fuera legal es atribuirle a la norma algo que no dice.
  it('atribuye la ventana de 24 meses a BPS, no a la ley', () => {
    const hijos = COVERAGE_FALLBACKS.find(f => /12 meses/.test(f.title))!
    expect(hijos.detail).toMatch(/BPS lo computa/)
    expect(MINOR_CONTINUITY_WINDOW_MONTHS).toBe(24)
  })

  // El desmentido de la extensión COVID publica fecha, ventana y financiamiento: sin las URLs
  // en las fuentes, el lector no tiene con qué verificar justamente lo que vino a desmentirse.
  it('publica las fuentes del desmentido de la extensión de 2020', () => {
    const urls = HEALTH_SOURCES.map(s => s.url).join(' ')
    expect(urls).toContain('bps.gub.uy/17508')
    expect(urls).toContain('gobierno-extiende-cobertura-salud-para-trabajadores-situacion-despido')
  })
})

describe('urgencia y emergencia en otro prestador', () => {
  it('publica las reglas y ninguna inventa un importe', () => {
    expect(URGENCY_RULES).toHaveLength(6)
    for (const r of URGENCY_RULES) {
      expect(r.detail.length).toBeGreaterThan(60)
      // Ningún arancel ni tasa moderadora en pesos: el valor lo autoriza el Poder Ejecutivo y se
      // actualiza, así que publicar uno solo envejece mal.
      expect(r.detail).not.toMatch(/\$\s?\d/)
    }
  })

  // EL ERROR GRAVE QUE ESTE TEST EXISTE PARA IMPEDIR. La regla del «centro más próximo» es de la
  // EMERGENCIA (Ley 19.535 art. 147 inc. 2). En la URGENCIA sólo se puede ir a otro prestador si
  // el propio no tiene sede en esa localidad ni asegura cobertura por otra institución (art. 145
  // inc. 5). Publicarlas fundidas manda a alguien con una urgencia a una guardia ajena creyendo
  // que paga la tasa moderadora.
  it('separa la regla de la emergencia de la de la urgencia', () => {
    const emergencia = URGENCY_RULES.find(r => /^Emergencia/i.test(r.title))!
    const urgencia = URGENCY_RULES.find(r => /^Urgencia/i.test(r.title))!
    expect(emergencia).toBeTruthy()
    expect(urgencia).toBeTruthy()

    // El centro más próximo aparece en la de emergencia…
    expect(emergencia.detail).toMatch(/más próximo o accesible/)
    expect(emergencia.detail).toMatch(/147/)

    // …y NO como derecho incondicionado en la de urgencia, que tiene que traer la condición.
    expect(urgencia.detail).toMatch(/145 inc\. 5|sede principal ni secundaria/)
    expect(urgencia.detail).toMatch(/sólo si/)
    expect(urgencia.detail).not.toMatch(/más próximo o accesible/)
  })

  it('ninguna regla afirma «urgencia y emergencia en el centro más próximo» como una sola cosa', () => {
    const joined = URGENCY_RULES.map(r => `${r.title} ${r.detail}`).join(' ')
    expect(joined).not.toMatch(/urgencia y emergencia en el centro asistencial más próximo/)
    // Tampoco en el FAQ ni en el label de la fuente, que es por donde se coló la primera vez.
    const faq = HEALTH_FAQ.map(f => f.answer).join(' ')
    expect(faq).not.toMatch(/urgencia y emergencia en el centro asistencial más próximo/)
    const labels = HEALTH_SOURCES.map(s => s.label).join(' ')
    expect(labels).not.toMatch(/urgencia y emergencia en cualquier prestador/)
  })

  it('dice a quién se le paga, que es la pregunta real', () => {
    const joined = URGENCY_RULES.map(r => `${r.title} ${r.detail}`).join(' ')
    expect(joined).toMatch(/tasa moderadora/)
    expect(joined).toMatch(/institución de origen/)
    expect(joined).toMatch(/traslado/i)
  })

  // Decreto 211/018 art. 19 fija la tasa moderadora SÓLO para la urgencia. Prometerla para la
  // emergencia es inventar un régimen de cobro que la reglamentación no establece.
  it('la tasa moderadora se publica atada a la urgencia, y la emergencia como ausencia', () => {
    const pago = URGENCY_RULES.find(r => /tasa moderadora/i.test(r.title))!
    expect(pago.title).toMatch(/urgencia/i)
    expect(pago.detail).toMatch(/atención de urgencia/)
    expect(pago.detail).toMatch(/Consulta Urgencia Centralizada/)
    // La ausencia, publicada explícitamente.
    expect(pago.detail).toMatch(/EMERGENCIA la reglamentación no fija una tasa equivalente/)
  })

  // Ley 19.535 art. 148 inc. 2 y Decreto 211/018 art. 21 dicen «PODRÁN saldar», y el decreto
  // condiciona la opción al uso del sistema informático de la JUNASA. No es un automatismo.
  it('el saldo entre prestadores se publica como facultad condicionada, no como automatismo', () => {
    const fonasa = URGENCY_RULES.find(r => /FONASA/i.test(r.title))!
    expect(fonasa.detail).toMatch(/PODRÁN saldar/)
    expect(fonasa.detail).toMatch(/facultad/i)
    expect(fonasa.detail).toMatch(/sistema informático/)
    // Y los que no están en el SNS quedan fuera del mecanismo.
    expect(fonasa.detail).toMatch(/no está incorporado al Seguro Nacional de Salud/)
    // La versión equivocada afirmaba que «saldan» a secas.
    expect(fonasa.detail).not.toMatch(/Salud saldan esa facturación/)
  })

  it('el FAQ de urgencia y emergencia no promete un precio, y explica por qué', () => {
    const f = HEALTH_FAQ.find(q => /emergencia/i.test(q.question))!
    expect(f).toBeTruthy()
    expect(f.answer).toMatch(/19\.535/)
    expect(f.answer).toMatch(/147 inc\. 2/)
    expect(f.answer).toMatch(/145 inc\. 5/)
    // La razón publicada tiene que ser la verdadera: el valor lo autoriza el Poder Ejecutivo
    // (Decreto 211/018 art. 19), no lo fija cada institución a su criterio.
    expect(f.answer).toMatch(/lo autoriza el Poder Ejecutivo/)
    expect(f.answer).not.toMatch(/no hay una tabla única/)
    expect(f.answer).not.toMatch(/depende de tu institución/)
  })
})

describe('obligatoriedad del FONASA y elección de prestador', () => {
  it('separa aportar (obligatorio) de elegir (libre)', () => {
    expect(FONASA_MANDATORY_RULE).toMatch(/no es opcional/)
    expect(FONASA_MANDATORY_RULE).toMatch(/18\.211 art\. 61/)
    expect(FONASA_RATE_RULE).toMatch(/2,5 BPC/)
    expect(FONASA_RATE_RULE).toMatch(/No depende del prestador/)
  })

  it('el padrón elegible incluye ASSE, mutualistas y seguros integrales privados', () => {
    expect(SNIS_PROVIDER_KINDS).toHaveLength(3)
    const labels = SNIS_PROVIDER_KINDS.map(p => p.label).join(' | ')
    expect(labels).toMatch(/ASSE/)
    expect(labels).toMatch(/IAMC/)
    expect(labels).toMatch(/[Ss]eguros integrales/)
  })

  // El malentendido que la pregunta viene a corregir: un seguro privado se elige CON el FONASA,
  // no EN LUGAR del FONASA.
  it('el FAQ dice que el seguro privado no reemplaza al FONASA', () => {
    const f = HEALTH_FAQ.find(q => /obligatorio el FONASA/i.test(q.question))!
    expect(f).toBeTruthy()
    expect(f.answer).toMatch(/no podés cambiar el FONASA por un seguro privado/)
    expect(f.answer).toMatch(/doble cobertura/)
    expect(f.answer).toMatch(/monotributista/)
  })

  // Ley 18.211 art. 11 dice «PODRÁN integrar … estatales y no estatales»: es una habilitación,
  // no la enumeración cerrada de quién integra el sistema.
  it('el art. 11 se cita como habilitación y no pierde «no estatales»', () => {
    const f = HEALTH_FAQ.find(q => /obligatorio el FONASA/i.test(q.question))!
    expect(f.answer).toMatch(/PODRÁN integrar/)
    expect(f.answer).toMatch(/estatales y no estatales/)
    expect(f.answer).not.toMatch(/entre las entidades que integran el Sistema Nacional Integrado/)
  })

  // Art. 58 limita el deber de no rechazo a los usuarios AMPARADOS POR EL SEGURO NACIONAL DE
  // SALUD. Publicarlo sin ese recorte le promete la protección justamente a quien el mismo
  // archivo manda a afiliarse como socio particular, que es el caso al que no alcanza.
  it('el deber de no rechazo se publica con su recorte: sólo amparados por el Seguro', () => {
    const f = HEALTH_FAQ.find(q => /obligatorio el FONASA/i.test(q.question))!
    expect(f.answer).toMatch(/AMPARADO POR EL SEGURO NACIONAL DE SALUD/)
    expect(f.answer).toMatch(/no de un contrato particular/)
    expect(f.answer).not.toMatch(/Ningún prestador del sistema puede rechazarte/)
  })
})

describe('FAQ y fuentes', () => {
  it('cada pregunta del FAQ tiene respuesta corta y desarrollo', () => {
    expect(HEALTH_FAQ.length).toBeGreaterThanOrEqual(6)
    for (const f of HEALTH_FAQ) {
      expect(f.question.endsWith('?')).toBe(true)
      expect(f.answer.length).toBeGreaterThan(80)
    }
  })

  it('las tres preguntas nuevas están en el FAQ', () => {
    expect(HEALTH_FAQ).toHaveLength(11)
  })

  it('toda regla publicada tiene fuente oficial', () => {
    expect(HEALTH_SOURCES.length).toBeGreaterThanOrEqual(3)
    for (const s of HEALTH_SOURCES) {
      expect(s.url).toMatch(/^https:\/\/www\.(bps\.gub\.uy|impo\.com\.uy|gub\.uy)\//)
    }
  })

  // Cada bloque nuevo tiene que traer su norma: sin esto, una FAQ puede afirmar algo que
  // ninguna de las fuentes listadas respalda.
  it('están citadas las normas del bloque nuevo', () => {
    const urls = HEALTH_SOURCES.map(s => s.url).join(' ')
    expect(urls).toContain('19535-2017')
    expect(urls).toContain('211-2018')
    expect(urls).toContain('17930-2005')
    expect(urls).toContain('afiliacion-asse')
    expect(urls).toContain('afiliacion-mutual-trabajadores')
  })

  it('el bloque nuevo declara su propia fecha de verificación', () => {
    expect(HEALTH_COVERAGE_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

// Un export que nadie importa no está publicado: está escrito. La primera versión de este bloque
// definió y testeó las salidas de cobertura, las reglas de urgencia y el padrón del SNIS, pero la
// página no importaba ninguna, así que el sitio no desmentía nada y el lector veía sólo la fecha
// vieja de verificación. Este test hace que el módulo y la página no puedan divergir en silencio.
describe('lo que se declara publicado llega de verdad a la página', () => {
  const page = readFileSync(
    fileURLToPath(new URL('../../pages/cambiar-de-mutualista-uruguay.vue', import.meta.url)),
    'utf8'
  )

  const publicados = [
    'ASSE_ANYTIME_RULE',
    'POST_CHANGE_LOCK_RULE',
    'COVERAGE_FALLBACKS',
    'URGENCY_RULES',
    'SNIS_PROVIDER_KINDS',
    'FONASA_MANDATORY_RULE',
    'FONASA_RATE_RULE',
    'EXTENSION_TRES_MESES_2020',
    'MINOR_CONTINUITY_MONTHS',
    'MINOR_CONTINUITY_MIN_CONTRIB_MONTHS',
    'MINOR_CONTINUITY_WINDOW_MONTHS',
    'HEALTH_COVERAGE_VERIFIED_AT',
  ]

  it.each(publicados)('la página importa y renderiza %s', nombre => {
    // Importado…
    expect(page).toMatch(new RegExp(`\\b${nombre}\\b`))
    // …y usado fuera del bloque de import, que es lo que lo pone delante del lector.
    const usos = page.match(new RegExp(`\\b${nombre}\\b`, 'g')) ?? []
    expect(usos.length).toBeGreaterThanOrEqual(2)
  })

  it('la página muestra la fecha de verificación del bloque nuevo, no sólo la vieja', () => {
    expect(page).toMatch(/coverageVerifiedAt/)
    expect(page).toMatch(/HEALTH_COVERAGE_VERIFIED_AT/)
  })

  // El título de la sección, la bajada del encabezado y la meta description contaban cuatro
  // salidas. El número vivía en el .vue, así que arreglar sólo el módulo dejaba la página
  // diciendo lo contrario que sus propias tarjetas.
  it('la página no promete cuatro salidas ni en el título, ni en la bajada, ni en la description', () => {
    expect(page).not.toMatch(/cuatro (salidas|excepciones|situaciones|causales)/i)
    expect(page).toMatch(/cinco salidas/i)
  })
})
