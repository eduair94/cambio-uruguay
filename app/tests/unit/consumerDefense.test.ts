import { describe, expect, it } from 'vitest'

import {
  ABUSIVE_CLAUSE_EXAMPLES,
  ABUSIVE_CLAUSE_RULE,
  DEFENSE_FAQ,
  DEFENSE_LEVERS,
  DEFENSE_POWERS,
  DEFENSE_SOURCES,
  DEFENSE_STEPS,
  DEFENSE_THESIS,
  DEFENSE_TRAMITE,
  IN_STORE_ALWAYS,
  IN_STORE_POLICY_RULE,
  IN_STORE_RETRACT_RULE,
  STORE_RULES,
} from '../../utils/consumerDefense'

describe('la tesis: qué puede y qué no puede el organismo', () => {
  // Es lo que la página existe para decir, y lo que nadie dice.
  it('deja claro que no ordena la devolución del dinero', () => {
    expect(DEFENSE_THESIS).toMatch(/no te devuelve la plata/i)
    expect(DEFENSE_THESIS).toMatch(/tentar el acuerdo/i)
    expect(DEFENSE_THESIS).toMatch(/juez/i)
  })

  it('separa facultades de límites y tiene de los dos', () => {
    const puede = DEFENSE_POWERS.filter(p => p.can)
    const noPuede = DEFENSE_POWERS.filter(p => !p.can)
    expect(puede.length).toBeGreaterThanOrEqual(4)
    expect(noPuede.length).toBeGreaterThanOrEqual(3)
  })

  it('cada facultad y cada límite cita su fuente', () => {
    for (const p of DEFENSE_POWERS) {
      expect(p.source.length).toBeGreaterThan(8)
      expect(p.detail.length).toBeGreaterThan(60)
    }
  })

  // La confusión cara: creer que la multa es plata para el consumidor.
  it('aclara que la multa la cobra el Estado, no el consumidor', () => {
    const multa = DEFENSE_POWERS.find(p => !p.can && /multa/i.test(p.title))!
    expect(multa).toBeDefined()
    expect(multa.detail).toMatch(/no repara|Estado/i)
  })

  it('las sanciones del art. 47 están con su rango', () => {
    const sancion = DEFENSE_POWERS.find(p => /sancionar/i.test(p.title))!
    expect(sancion.detail).toMatch(/20 a 4\.000 UR/)
    expect(sancion.source).toMatch(/art\. 47/)
  })
})

describe('compra presencial', () => {
  // El malentendido más común del país en materia de consumo.
  it('dice que el retracto de 5 días NO aplica en la tienda física', () => {
    expect(IN_STORE_RETRACT_RULE).toMatch(/compra a distancia|no aplica/i)
    expect(IN_STORE_RETRACT_RULE).toMatch(/pudo ver el producto/i)
  })

  it('pero que la política anunciada sí obliga al comercio', () => {
    expect(IN_STORE_POLICY_RULE).toMatch(/antes de la transacci[oó]n/i)
    expect(IN_STORE_POLICY_RULE).toMatch(/art\. 14/)
  })

  // El producto fallado no depende de ninguna política de cambios.
  it('separa el caso del producto fallado', () => {
    expect(IN_STORE_ALWAYS).toMatch(/art\. 33/)
    expect(IN_STORE_ALWAYS).toMatch(/vale/i)
  })

  it('trae las cuatro reglas concretas del mostrador', () => {
    expect(STORE_RULES).toHaveLength(4)
    const all = STORE_RULES.map(r => `${r.title} ${r.detail}`).join(' ')
    expect(all).toMatch(/no puede (tener vencimiento|caducar)|no puede vencer/i)
    expect(all).toMatch(/precio de lista/i)
    expect(all).toMatch(/efectivamente pagado/i)
    for (const r of STORE_RULES) expect(r.source.length).toBeGreaterThan(8)
  })
})

describe('las dos palancas', () => {
  it('están las dos y cada una con su artículo', () => {
    expect(DEFENSE_LEVERS).toHaveLength(2)
    const [plazo, audiencia] = DEFENSE_LEVERS
    expect(plazo.source).toMatch(/art\. 37/)
    expect(audiencia.source).toMatch(/art\. 42/)
  })

  // Lo que hace que el silencio del comercio deje de correr en tu contra.
  it('la del plazo explica la interrupción y su condición de cese', () => {
    const plazo = DEFENSE_LEVERS[0]
    expect(plazo.detail).toMatch(/se interrumpe/i)
    expect(plazo.detail).toMatch(/niegue expresamente/i)
  })

  // Y la que hace que abandonar tras la inasistencia sea el peor momento para abandonar.
  it('la de la audiencia explica la presunción simple', () => {
    const audiencia = DEFENSE_LEVERS[1]
    expect(audiencia.detail).toMatch(/presunci[oó]n simple/i)
    expect(audiencia.detail).toMatch(/dos o m[aá]s audiencias/i)
  })
})

describe('el trámite', () => {
  it('es gratis, en línea y con los datos que publica gub.uy', () => {
    expect(DEFENSE_TRAMITE.cost).toMatch(/no tiene costo/i)
    expect(DEFENSE_TRAMITE.channel).toMatch(/en l[ií]nea/i)
    expect(DEFENSE_TRAMITE.estimatedDays).toBe(45)
    expect(DEFENSE_TRAMITE.followUpBusinessDays).toBe(15)
    expect(DEFENSE_TRAMITE.phone).toBe('0800 7005')
    expect(DEFENSE_TRAMITE.url).toMatch(/^https:\/\/www\.gub\.uy\/tramites\//)
  })

  it('enumera las identidades aceptadas', () => {
    expect(DEFENSE_TRAMITE.identities.length).toBeGreaterThanOrEqual(4)
    const all = DEFENSE_TRAMITE.identities.join(' ')
    expect(all).toMatch(/gub\.uy/)
    expect(all).toMatch(/Abitab/)
    expect(all).toMatch(/Antel/)
  })

  it('los pasos van numerados y terminan en la decisión de ir a la Justicia', () => {
    expect(DEFENSE_STEPS.map(s => s.n)).toEqual([1, 2, 3, 4, 5])
    for (const s of DEFENSE_STEPS) expect(s.detail.length).toBeGreaterThan(60)
    expect(DEFENSE_STEPS[DEFENSE_STEPS.length - 1].detail).toMatch(/judicial|juez/i)
  })
})

describe('cláusulas abusivas', () => {
  it('explica que son nulas y que el juez integra el contrato', () => {
    expect(ABUSIVE_CLAUSE_RULE).toMatch(/art\. 30/)
    expect(ABUSIVE_CLAUSE_RULE).toMatch(/nulidad/i)
    expect(ABUSIVE_CLAUSE_RULE).toMatch(/integra el contrato/i)
  })

  it('lista ejemplos de los que enumera la ley', () => {
    expect(ABUSIVE_CLAUSE_EXAMPLES.length).toBeGreaterThanOrEqual(6)
    const all = ABUSIVE_CLAUSE_EXAMPLES.join(' ')
    expect(all).toMatch(/carga de la prueba/i)
    expect(all).toMatch(/silencio/i)
    expect(all).toMatch(/renovaci[oó]n autom[aá]tica/i)
  })
})

describe('integridad', () => {
  it('cada pregunta tiene respuesta corta y desarrollo', () => {
    expect(DEFENSE_FAQ.length).toBeGreaterThanOrEqual(8)
    for (const f of DEFENSE_FAQ) {
      expect(f.question.endsWith('?') || f.question.endsWith('.')).toBe(true)
      expect(f.short.length).toBeGreaterThan(20)
      expect(f.answer.length).toBeGreaterThan(150)
    }
  })

  // Nada de citar blogs: la ley y el MEF, nada más.
  it('toda fuente es oficial', () => {
    expect(DEFENSE_SOURCES.length).toBeGreaterThanOrEqual(5)
    for (const s of DEFENSE_SOURCES) {
      expect(s.url).toMatch(/^https:\/\/(www\.)?(impo\.com\.uy|gub\.uy)/)
    }
  })

  it('la primera pregunta es la que corrige la creencia equivocada', () => {
    expect(DEFENSE_FAQ[0].question).toMatch(/devolver la plata/i)
    expect(DEFENSE_FAQ[0].short).toMatch(/^No\b/)
  })
})
