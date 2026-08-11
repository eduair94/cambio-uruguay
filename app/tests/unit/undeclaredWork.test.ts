import { describe, expect, it } from 'vitest'

import {
  UNDECLARED_CLOCK,
  UNDECLARED_CORE_IDEA,
  UNDECLARED_DISCLAIMER,
  UNDECLARED_DOORS,
  UNDECLARED_EVIDENCE,
  UNDECLARED_FAQ,
  UNDECLARED_LOSSES,
  UNDECLARED_SOURCES,
  UNDECLARED_STILL_OWED,
} from '../../utils/undeclaredWork'

const allText = () =>
  [
    UNDECLARED_CORE_IDEA,
    UNDECLARED_DISCLAIMER,
    ...UNDECLARED_EVIDENCE,
    ...UNDECLARED_CLOCK.map(c => `${c.label} ${c.detail} ${c.norm}`),
    ...UNDECLARED_LOSSES.map(l => `${l.title} ${l.detail}`),
    ...UNDECLARED_STILL_OWED.map(o => `${o.title} ${o.detail}`),
    ...UNDECLARED_DOORS.map(
      d => `${d.goal} ${d.detail} ${d.requirements.join(' ')} ${d.doesNot} ${d.basis}`
    ),
    ...UNDECLARED_FAQ.map(f => `${f.question} ${f.short} ${f.answer}`),
  ].join(' ')

describe('la tesis de la página', () => {
  // Publicar «denunciá en el ministerio» a secas manda a la puerta equivocada a quien ya se fue.
  it('son tres puertas y cada una resuelve algo distinto', () => {
    expect(UNDECLARED_DOORS).toHaveLength(3)
    expect(UNDECLARED_DOORS.map(d => d.n)).toEqual([1, 2, 3])
    expect(new Set(UNDECLARED_DOORS.map(d => d.goal)).size).toBe(3)
    expect(UNDECLARED_DOORS.map(d => d.id)).toEqual(['mtss', 'bps', 'conciliacion'])
  })

  // La mitad que evita el viaje al organismo equivocado: qué NO hace cada puerta.
  it('cada puerta publica su límite, no sólo lo que promete', () => {
    for (const d of UNDECLARED_DOORS) {
      expect(d.doesNot.length).toBeGreaterThan(60)
      expect(d.requirements.length).toBeGreaterThanOrEqual(3)
      expect(d.channels.length).toBeGreaterThanOrEqual(2)
      expect(d.basis).toMatch(/Ley|Decreto|MTSS|BPS/)
    }
  })

  it('la idea de fondo separa derechos de aportes', () => {
    expect(UNDECLARED_CORE_IDEA).toMatch(/no te quita derechos/i)
    expect(UNDECLARED_CORE_IDEA).toMatch(/aguinaldo/i)
    expect(UNDECLARED_CORE_IDEA).toMatch(/prueba/i)
  })
})

describe('puerta 1: la Inspección General del Trabajo', () => {
  const door = () => UNDECLARED_DOORS.find(d => d.id === 'mtss')!

  // Los dos requisitos que hacen rebotar la denuncia si no se saben de antemano.
  it('avisa que pide vínculo vigente e infracción en curso', () => {
    const req = door().requirements.join(' ')
    expect(req).toMatch(/v[ií]nculo laboral vigente/i)
    expect(req).toMatch(/ocurriendo/i)
  })

  // El anonimato es el motivo por el que alguien se anima: va con su norma.
  it('apoya el anonimato en el Decreto 371/022 y marca la excepción', () => {
    expect(door().detail).toMatch(/371\/022/)
    expect(door().detail).toMatch(/an[oó]nimas/i)
    expect(door().requirements.join(' ')).toMatch(/acoso|sindical|discriminaci[oó]n/i)
  })

  it('cita la escala de sanciones del artículo 289 con sus tres tramos', () => {
    const t = door().detail
    expect(t).toMatch(/289/)
    expect(t).toMatch(/amonestaci[oó]n/i)
    expect(t).toMatch(/150 jornales/)
    expect(t).toMatch(/clausura/i)
  })

  // Lo dice la propia página del MTSS: esa oficina no liquida deudas laborales.
  it('aclara que no cobra la plata', () => {
    expect(door().doesNot).toMatch(/no hace c[aá]lculos de liquidaciones|no te cobra/i)
  })
})

describe('puerta 2: BPS', () => {
  const door = () => UNDECLARED_DOORS.find(d => d.id === 'bps')!

  // El artículo 88 se llama literalmente «derecho de iniciativa del trabajador». Presentarlo como
  // un favor que se pide es perder el punto entero.
  it('publica el derecho de iniciativa del artículo 88 con su nombre', () => {
    const t = door().detail
    expect(t).toMatch(/derecho de iniciativa/i)
    expect(t).toMatch(/88/)
    expect(t).toMatch(/individual o colectivamente/i)
  })

  it('marca el corte del registro en abril de 1996', () => {
    expect(door().requirements.join(' ')).toMatch(/1996/)
  })

  // A diferencia del MTSS, acá no se exige seguir trabajando: es la puerta de quien ya se fue.
  it('deja claro que no exige vínculo vigente', () => {
    expect(door().requirements.join(' ')).toMatch(/no exige v[ií]nculo vigente/i)
  })
})

describe('puerta 3: conciliación previa', () => {
  const door = () => UNDECLARED_DOORS.find(d => d.id === 'conciliacion')!

  it('es obligatoria antes del juicio y cita la Ley 18.572', () => {
    expect(door().detail).toMatch(/18\.572/)
    expect(door().requirements.join(' ')).toMatch(/20 UR/)
  })

  // Las dos cosas que juegan a favor de quien reclama y que casi nadie sabe.
  it('nombra la interrupción de la prescripción y la presunción por incomparecencia', () => {
    const t = door().detail
    expect(t).toMatch(/interrumpe la prescripci[oó]n/i)
    expect(t).toMatch(/18\.091/)
    expect(t).toMatch(/presunci[oó]n simple/i)
  })
})

describe('el reloj', () => {
  it('tiene las tres reglas y cada una con su artículo', () => {
    expect(UNDECLARED_CLOCK).toHaveLength(3)
    for (const c of UNDECLARED_CLOCK) {
      expect(c.norm).toMatch(/Ley 18\.091, art[ií]culo [123]/)
      expect(c.detail.length).toBeGreaterThan(80)
    }
  })

  // Un año y cinco años son cosas distintas: confundirlos da el consejo contrario.
  it('distingue el año desde el cese de los cinco años de los créditos', () => {
    const uno = UNDECLARED_CLOCK.find(c => /art[ií]culo 1$/.test(c.norm))!
    const dos = UNDECLARED_CLOCK.find(c => /art[ií]culo 2$/.test(c.norm))!
    expect(uno.detail).toMatch(/al a[ñn]o/i)
    expect(uno.detail).toMatch(/d[ií]a siguiente/i)
    expect(dos.detail).toMatch(/cinco a[ñn]os/i)
    expect(dos.detail).toMatch(/exigibles/i)
  })
})

describe('accidente de trabajo', () => {
  const loss = () => UNDECLARED_LOSSES.find(l => /accidente/i.test(l.title))!

  // Las dos mitades del artículo 8 tienen que ir juntas: publicar sólo la buena da falsa
  // tranquilidad, publicar sólo la mala niega una cobertura que existe.
  it('publica que el BSE cubre igual Y que la indemnización va a valor de salario mínimo', () => {
    const t = loss().detail
    expect(t).toMatch(/con independencia de que sus patronos/i)
    expect(t).toMatch(/un salario m[ií]nimo nacional/i)
    expect(t).toMatch(/16\.074/)
  })

  it('el título no promete cobertura plena', () => {
    expect(loss().title).toMatch(/salario m[ií]nimo/i)
  })
})

describe('lo que se pierde y lo que se debe igual', () => {
  it('el seguro de paro está entre las pérdidas y enlaza a su página', () => {
    const paro = UNDECLARED_LOSSES.find(l => /seguro de paro/i.test(l.title))!
    expect(paro.to).toBe('/seguro-de-paro-uruguay')
    expect(paro.detail).toMatch(/180 d[ií]as/)
  })

  it('los derechos que subsisten enlazan a las guías que ya existen', () => {
    expect(UNDECLARED_STILL_OWED.length).toBeGreaterThanOrEqual(4)
    for (const o of UNDECLARED_STILL_OWED) {
      expect(o.to).toBeDefined()
      expect(o.to!.startsWith('/')).toBe(true)
    }
  })

  it('la prueba es método, con al menos media docena de ítems', () => {
    expect(UNDECLARED_EVIDENCE.length).toBeGreaterThanOrEqual(6)
    expect(UNDECLARED_EVIDENCE.join(' ')).toMatch(/subordinaci[oó]n/i)
  })
})

describe('represalia', () => {
  const faq = () => UNDECLARED_FAQ.find(f => /echar por denunciar/i.test(f.question))!

  // NO hay fuero general del denunciante. Prometerlo expone a quien confíe en eso.
  it('no inventa una protección general y sí publica la sindical con su ley', () => {
    const a = faq().answer
    expect(a).toMatch(/No existe en Uruguay una norma/i)
    expect(a).toMatch(/17\.940/)
    expect(a).toMatch(/libertad sindical/i)
    expect(faq().short).toMatch(/no hay un fuero general/i)
  })
})

describe('primera infancia', () => {
  const faq = () => UNDECLARED_FAQ.find(f => /primera infancia/i.test(f.question))!

  // LA TRAMPA DE FUENTES: el Decreto 268/014 art. 1 sigue diciendo que autoriza el MEC, pero el
  // texto VIGENTE del art. 101 de la Ley 18.437 (redacción de la Ley 19.889) puso autorización,
  // registro, supervisión y sanciones en el INAU, y el MEC dejó de emitirlas el 1/1/2021. Guiarse
  // por el decreto manda al lector al organismo equivocado.
  it('nombra al INAU como el organismo que autoriza, no al MEC', () => {
    const a = faq().answer
    expect(a).toMatch(/INAU/)
    expect(a).toMatch(/18\.437/)
    expect(a).toMatch(/19\.889/)
    expect(a).toMatch(/1\.º de enero de 2021|1\/1\/2021/)
  })

  it('advierte que esa puerta puede terminar en clausura y no reemplaza a las otras', () => {
    const a = faq().answer
    expect(a).toMatch(/clausura/i)
    expect(a).toMatch(/no reemplaza/i)
  })
})

describe('integridad', () => {
  it('cada pregunta tiene respuesta corta y desarrollo', () => {
    expect(UNDECLARED_FAQ.length).toBeGreaterThanOrEqual(8)
    for (const f of UNDECLARED_FAQ) {
      expect(f.question.endsWith('?')).toBe(true)
      expect(f.answer.length).toBeGreaterThan(150)
      expect(f.short.length).toBeGreaterThan(20)
    }
    expect(new Set(UNDECLARED_FAQ.map(f => f.question)).size).toBe(UNDECLARED_FAQ.length)
  })

  it('toda fuente es oficial uruguaya o el sindicato de rama, y no hay duplicados', () => {
    expect(UNDECLARED_SOURCES.length).toBeGreaterThanOrEqual(15)
    for (const s of UNDECLARED_SOURCES) {
      expect(s.url).toMatch(
        /^https:\/\/(www\.impo\.com\.uy|(?:[a-z-]+\.)*gub\.uy|www\.pitcnt\.uy)\//
      )
      expect(s.label.length).toBeGreaterThan(10)
    }
    expect(new Set(UNDECLARED_SOURCES.map(s => s.url)).size).toBe(UNDECLARED_SOURCES.length)
  })

  // Los textos se renderizan planos, sin links: si una norma se cita y no está en las fuentes, el
  // lector no tiene cómo contrastarla.
  it('cada norma citada en el cuerpo tiene su enlace en las fuentes', () => {
    const urls = UNDECLARED_SOURCES.map(s => s.url).join(' ')
    const texto = allText()
    const normas: [RegExp, string][] = [
      [/Decreto 371\/022/, 'decretos/371-2022'],
      [/Ley 15\.903|15\.903/, 'leyes/15903-1987'],
      [/Ley 16\.713|16\.713/, 'leyes/16713-1995'],
      [/Ley 18\.091|18\.091/, 'leyes/18091-2007'],
      [/Ley 18\.572|18\.572/, 'leyes/18572-2009'],
      [/Ley 16\.074|16\.074/, 'leyes/16074-1989'],
      [/Ley 17\.940|17\.940/, 'leyes/17940-2006'],
      [/Ley 18\.437|18\.437/, 'leyes/18437-2008'],
      [/Decreto 268\/014/, 'decretos/268-2014'],
    ]
    for (const [mencion, slug] of normas) {
      if (mencion.test(texto)) expect(urls).toContain(slug)
    }
  })

  // Los importes de multas de BPS conviven con otra escala y con comunicados internos: no se
  // republican. Los que sí van son los que están escritos en la ley, con su artículo.
  it('no publica importes en pesos', () => {
    expect(allText()).not.toMatch(/\$\s?\d/)
  })

  it('deja el aviso de que no es asesoramiento jurídico', () => {
    expect(UNDECLARED_DISCLAIMER).toMatch(/no es asesoramiento jur[ií]dico/i)
  })
})
