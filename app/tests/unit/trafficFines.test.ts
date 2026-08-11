import { describe, expect, it } from 'vitest'

import {
  CONVENIO_FACTS,
  CONVENIO_VS_PRESCRIPCION_NOTE,
  DEADLINE_TRAP,
  DESCARGO_DIAS_HABILES,
  FINES_FAQ,
  FINES_SCOPE_NOTE,
  FINES_SOURCES,
  FINE_PRESCRIPTION_INTERRUPTS,
  FINE_PRESCRIPTION_RULE,
  FINE_PRESCRIPTION_YEARS,
  FINE_RECOGNITION_WARNING,
  FINE_REFUND_ROUTES,
  FINE_STEPS,
  MOTO_CILINDRADA_RULE,
  PATENTE_AFORO_RULE,
  PATENTE_BONIFICACIONES,
  PATENTE_BONIFICACION_TRAP,
  PATENTE_CLEARING_ABSENCE,
  PATENTE_CONSEQUENCES,
  PATENTE_CONSULTA_URL,
  PATENTE_DEUDA_URL,
  PATENTE_DUE_DATES,
  PATENTE_DUE_DATE_RULE,
  PATENTE_FIXED_BANDS,
  PATENTE_FLOOR_RULE,
  PATENTE_MORA_RECARGO_RULE,
  PATENTE_MORA_TIERS,
  PATENTE_PRESCRIPTION_RULE,
  PATENTE_PRESCRIPTION_TRAMITE,
  PATENTE_PRESCRIPTION_YEARS,
  PATENTE_RATES,
  PATENTE_VERIFIED_AT,
  PATENTE_YEAR,
  REEMPADRONAMIENTO_URL,
  REEMPADRONAR_COST_NOTE,
  REEMPADRONAR_FACTS,
  REEMPADRONAR_RULE,
  RECURSO_DIAS_CORRIDOS,
} from '../../utils/trafficFines'

describe('la trampa de plazos', () => {
  // Los dos plazos son 10 pero NO son la misma unidad. Es el error que cuesta la instancia.
  it('el descargo va en hábiles y el recurso en corridos', () => {
    expect(DESCARGO_DIAS_HABILES).toBe(10)
    expect(RECURSO_DIAS_CORRIDOS).toBe(10)
    const descargo = FINE_STEPS.find(s => /descargos/i.test(s.title))!
    const recurso = FINE_STEPS.find(s => /recurr/i.test(s.title))!
    expect(descargo.businessDays).toBe(true)
    expect(recurso.businessDays).toBe(false)
    expect(descargo.deadline).toMatch(/hábiles/)
    expect(recurso.deadline).toMatch(/corridos/)
  })

  it('lo advierte explícitamente', () => {
    expect(DEADLINE_TRAP).toMatch(/hábiles/)
    expect(DEADLINE_TRAP).toMatch(/corridos/)
    expect(DEADLINE_TRAP.length).toBeGreaterThan(150)
  })

  it('los pasos están numerados en orden', () => {
    expect(FINE_STEPS.map(s => s.n)).toEqual([1, 2, 3, 4])
    for (const s of FINE_STEPS) expect(s.detail.length).toBeGreaterThan(40)
  })
})

describe('prescripción de la multa', () => {
  it('son cinco años desde la infracción', () => {
    expect(FINE_PRESCRIPTION_YEARS).toBe(5)
    expect(FINE_PRESCRIPTION_RULE).toMatch(/cinco años/i)
    expect(FINE_PRESCRIPTION_RULE).toMatch(/se cometió la infracción/i)
  })

  // Mismo patrón que la prescripción tributaria nacional: no se aplica sola.
  it('deja claro que no opera sola: requiere resolución', () => {
    expect(FINE_PRESCRIPTION_RULE).toMatch(/no opera sola/i)
    expect(FINE_PRESCRIPTION_RULE).toMatch(/acto administrativo|resoluci[oó]n del intendente/i)
  })

  it('enumera qué interrumpe el plazo', () => {
    expect(FINE_PRESCRIPTION_INTERRUPTS.length).toBeGreaterThanOrEqual(3)
    const all = FINE_PRESCRIPTION_INTERRUPTS.join(' ')
    expect(all).toMatch(/convenio/i)
    expect(all).toMatch(/reconocimiento/i)
  })

  // La advertencia que evita resucitar una deuda vieja sin querer.
  it('advierte que pagar una cuota reinicia el reloj', () => {
    expect(FINE_RECOGNITION_WARNING).toMatch(/reinicia|interrumpir/i)
    expect(FINE_RECOGNITION_WARNING).toMatch(/asesorarte|asesorate/i)
  })
})

describe('devolución de lo pagado de más', () => {
  it('ofrece las dos vías y sus límites', () => {
    expect(FINE_REFUND_ROUTES).toHaveLength(2)
    const all = FINE_REFUND_ROUTES.map(r => r.detail).join(' ')
    expect(all).toMatch(/empadronados en Montevideo/i)
    expect(all).toMatch(/abril, agosto y diciembre/i)
  })
})

describe('alcance', () => {
  // Aplicar el plazo de Montevideo en otro departamento es un error caro.
  it('aclara que el procedimiento es departamental aunque el tributo esté unificado', () => {
    expect(FINES_SCOPE_NOTE).toMatch(/SUCIVE/)
    expect(FINES_SCOPE_NOTE).toMatch(/cada intendencia/i)
    expect(FINES_SCOPE_NOTE).toMatch(/Montevideo/)
  })

  it('el FAQ lo repite donde el lector lo va a buscar', () => {
    const f = FINES_FAQ.find(x => /todo el pa[ií]s/i.test(x.question))!
    expect(f).toBeDefined()
    expect(f.answer).toMatch(/otro departamento/i)
  })
})

describe('integridad', () => {
  it('cada pregunta tiene respuesta corta y desarrollo', () => {
    expect(FINES_FAQ.length).toBeGreaterThanOrEqual(6)
    for (const f of FINES_FAQ) {
      expect(f.question.endsWith('?')).toBe(true)
      expect(f.answer.length).toBeGreaterThan(120)
    }
  })

  // impo.com.uy entró con el bloque de patente: es el texto legal oficial de las leyes 18.456,
  // 18.860 y 19.824, que no están publicadas en gub.uy.
  it('toda fuente es oficial', () => {
    expect(FINES_SOURCES.length).toBeGreaterThanOrEqual(4)
    for (const s of FINES_SOURCES) {
      expect(s.url).toMatch(/^https:\/\/([\w.]+\.)?(montevideo\.gub\.uy|gub\.uy|impo\.com\.uy)/)
    }
  })

  // El texto ordenado del SUCIVE se reordena y renumera todos los años. Enlazar el de 2022 hacía
  // que el lector chequeara las citas contra un documento que ya no rige.
  it('el texto ordenado que se enlaza es el vigente, no el de 2022', () => {
    expect(FINES_SOURCES.some(s => /sucivetextoordenado2022/i.test(s.url))).toBe(false)
    const to = FINES_SOURCES.filter(s => /texto ordenado del sucive/i.test(s.label))
    expect(to.length).toBeGreaterThanOrEqual(1)
    for (const s of to) expect(s.label).toMatch(/2026/)
  })
})

describe('patente: cómo se calcula', () => {
  // El error de base: creer que la patente sale de lo que pagaste el auto. Sale de un aforo.
  it('explica que la base es el aforo y no el precio de compra', () => {
    expect(PATENTE_AFORO_RULE).toMatch(/aforo/i)
    expect(PATENTE_AFORO_RULE).toMatch(/18\.860/)
    expect(PATENTE_AFORO_RULE).toMatch(/no se estima|se consulta/i)
  })

  // El resumen corto invoca SÓLO la ley 18.860, así que tiene que usar su fecha y su verbo.
  // Estuvo publicado al revés: «fijan ... antes del 30 de octubre». El 30 es del art. 6 del texto
  // ordenado del SUCIVE, que este párrafo no nombra, y quien fija es el Congreso de Intendentes.
  it('atribuye a la ley 18.860 su propia fecha y su propio verbo', () => {
    expect(PATENTE_AFORO_RULE).toMatch(/31 de octubre/)
    expect(PATENTE_AFORO_RULE).not.toMatch(/30 de octubre/)
    expect(PATENTE_AFORO_RULE).toMatch(/eleva una propuesta/i)
    expect(PATENTE_AFORO_RULE).toMatch(/Congreso de Intendentes/)
  })

  it('trae las alícuotas de las tres categorías con su base', () => {
    const cats = new Set(PATENTE_RATES.map(r => r.category))
    expect(cats).toEqual(new Set(['A', 'B', 'C']))
    for (const r of PATENTE_RATES) expect(r.base.length).toBeGreaterThan(5)
    const a0 = PATENTE_RATES.find(r => /Autos y camionetas 0 km/.test(r.vehicle))!
    expect(a0.rate).toBe('5%')
    expect(a0.base).toMatch(/sin IVA/)
    const usados = PATENTE_RATES.find(r => /Autos y camionetas usados/.test(r.vehicle))!
    expect(usados.rate).toBe('4,5%')
    expect(PATENTE_RATES.find(r => r.category === 'B')!.rate).toBe('1,3%')
  })

  // Las cifras de este bloque se revotan cada noviembre: sin fecha propia no se pueden auditar.
  it('declara su propia fecha de verificación y el ejercicio', () => {
    expect(PATENTE_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(PATENTE_YEAR).toBe(2026)
  })

  // Grep de «cilindrada» sobre app/ daba cero. Y la respuesta honesta es que la escala no existe.
  it('publica la ausencia de escala por cilindrada y el único corte real', () => {
    expect(MOTO_CILINDRADA_RULE).toMatch(/no existe una escala nacional/i)
    expect(MOTO_CILINDRADA_RULE).toMatch(/500 cc/)
    expect(MOTO_CILINDRADA_RULE).toMatch(/499 cc/)
    expect(MOTO_CILINDRADA_RULE).toMatch(/consulta por matrícula/i)
    const moto = PATENTE_RATES.filter(r => r.category === 'C')
    expect(moto.length).toBeGreaterThanOrEqual(4)
    expect(moto.some(r => /Lo fija la intendencia/i.test(r.rate))).toBe(true)
  })

  // El argumento del bloque de motos se sostiene sin afirmar qué proporción del parque son las de
  // menos de 500 cc: esa estadística no está en ninguna fuente de FINES_SOURCES.
  it('no cuantifica el parque de motos, que es un dato que no tenemos', () => {
    const faq = FINES_FAQ.find(f => /moto según la cilindrada/i.test(f.question))!
    for (const text of [MOTO_CILINDRADA_RULE, faq.answer]) {
      expect(text).not.toMatch(/mayoría del parque|casi todo el parque/i)
      expect(text).not.toMatch(/para la mayoría/i)
    }
    expect(MOTO_CILINDRADA_RULE).toMatch(/no encontramos esa estadística|no publicamos qué prop/i)
  })

  // Dos fuentes oficiales discrepan sobre la base de los eléctricos usados: la nota de prensa del
  // Congreso dice «valor de mercado» y el art. 2.1 del TOS 2026 dice «sin IVA». Manda la norma.
  it('sigue al texto ordenado en la base de los eléctricos usados', () => {
    const elec = PATENTE_RATES.find(r => /Eléctricos usados/i.test(r.vehicle))!
    expect(elec.rate).toBe('2,25%')
    expect(elec.base).toMatch(/sin IVA/)
  })

  // La fuente pone esa fila bajo el encabezado «Usadas». Sin el «usadas», la fila choca con la de
  // arriba y las dos parecen aplicar a la misma moto de 499 cc.
  it('la fila de arrastre por IPC dice que es de motos usadas', () => {
    const arrastre = PATENTE_RATES.find(r => /IPC/i.test(r.rate))!
    expect(arrastre.vehicle).toMatch(/usadas/i)
    const cero = PATENTE_RATES.find(r => /Lo fija la intendencia/i.test(r.rate))!
    expect(cero.vehicle).toMatch(/0 km/)
  })

  it('las bandas por antigüedad van con importe y con el piso del sistema', () => {
    expect(PATENTE_FIXED_BANDS).toHaveLength(4)
    expect(PATENTE_FIXED_BANDS[0]).toEqual({ years: 'Hasta 1975', amount: '$ 0,00' })
    for (const b of PATENTE_FIXED_BANDS) expect(b.amount).toMatch(/^\$ [\d.,]+$/)
    expect(PATENTE_FLOOR_RULE).toMatch(/1992/)
    expect(PATENTE_FLOOR_RULE).toMatch(/1986-1991/)
  })

  // Publicar el mecanismo sin el link deja al lector sin su número.
  it('lleva a la consulta oficial por matrícula', () => {
    expect(PATENTE_CONSULTA_URL).toBe('https://www.sucive.gub.uy/consulta_patente')
    expect(PATENTE_DEUDA_URL).toBe('https://www.sucive.gub.uy/consulta_deuda')
  })

  it('las bonificaciones son 20 y 10 y se aclara que no se acumulan', () => {
    expect(PATENTE_BONIFICACIONES.map(b => b.pct)).toEqual(['20%', '10%'])
    expect(PATENTE_BONIFICACION_TRAP).toMatch(/no se acumulan/i)
    expect(PATENTE_DUE_DATES).toHaveLength(6)
    expect(PATENTE_DUE_DATE_RULE).toMatch(/primer día hábil/i)
  })

  // «Se pierde por completo» chocaba con la propia fuente: el art. 11 del texto ordenado habilita
  // a pagar después con las bonificaciones cuando el atraso fue por causa ajena, y el SUCIVE
  // prorroga por circular cuando el vehículo no tiene valor de patente asignado. Y falta la
  // condición del art. 31 que sí hace perder el 20%: el pago tiene que ser en un solo acto.
  it('la trampa del 20% no es categórica y trae la condición del pago en un solo acto', () => {
    expect(PATENTE_BONIFICACION_TRAP).not.toMatch(/se pierde por completo/i)
    expect(PATENTE_BONIFICACION_TRAP).toMatch(/un solo acto/i)
    expect(PATENTE_BONIFICACION_TRAP).toMatch(/más de una vez/i)
    expect(PATENTE_BONIFICACION_TRAP).toMatch(/artículo 11|causa ajena/i)
    expect(PATENTE_BONIFICACION_TRAP).toMatch(/art\. 31|artículo 31/i)
  })

  // El art. 11 del TOS 2026 tiene DOS condiciones operativas que la primera versión omitía, y sin
  // ellas la excepción se lee como «si tuviste un motivo genuino conservás el 20% para siempre».
  // Textual: «una vez que queda habilitado el pago, el sistema lo comunicará a la Intendencia
  // respectiva, la que a su vez se lo comunicará al contribuyente. Si la comunicación a la
  // Intendencia se realiza dentro de los 15 primeros días del mes el pago podrá realizarse sin las
  // sanciones por mora y con las bonificaciones correspondientes, hasta el fin del mes siguiente y
  // si se realiza después del día 15 del mes el pago con iguales condiciones podrá realizarse hasta
  // el día 15 del mes subsiguiente.» O sea: lo dispara el sistema cuando el pago no estaba
  // habilitado, y la ventana se cierra.
  it('la excepción del artículo 11 va con su disparador y con su ventana cerrada', () => {
    // Quién la dispara: el sistema, cuando el pago pasa a estar habilitado.
    expect(PATENTE_BONIFICACION_TRAP).toMatch(/una vez que queda habilitado el pago/i)
    expect(PATENTE_BONIFICACION_TRAP).toMatch(/el sistema se lo comunica/i)
    // Y hasta cuándo corre, en sus dos ramas.
    expect(PATENTE_BONIFICACION_TRAP).toMatch(/15 primeros días del mes/i)
    expect(PATENTE_BONIFICACION_TRAP).toMatch(/fin del mes siguiente/i)
    expect(PATENTE_BONIFICACION_TRAP).toMatch(/15 del mes subsiguiente/i)
  })

  // La Comisión del art. 4 de la ley 18.860 ELEVA una propuesta antes del 31 de octubre; el art. 6
  // del texto ordenado dice que FIJA antes del 30. Ninguna fuente dice «propone antes del 30», y
  // guidesReddit.ts ya publica la fecha de la ley: el sitio no puede afirmar dos cosas distintas.
  it('el FAQ del aforo no inventa el híbrido de las dos normas', () => {
    const faq = FINES_FAQ.find(f => /cuánto pago de patente/i.test(f.question))!
    expect(faq.answer).not.toMatch(/propone los valores imponibles antes del 30 de octubre/i)
    expect(faq.answer).toMatch(/31 de octubre/)
    expect(faq.answer).toMatch(/30 de octubre/)
    expect(faq.answer).toMatch(/15 de noviembre/)
  })

  // Las seis cuotas van del 20 de enero al 20 de noviembre: pagar contado adelanta la última diez
  // meses, no doce. «Un año» hacía parecer menos conveniente el contado de lo que es.
  it('no infla el plazo que se adelanta al pagar de contado', () => {
    const faq = FINES_FAQ.find(f => /de una o en cuotas/i.test(f.question))!
    expect(faq.answer).not.toMatch(/adelantar el dinero un año/i)
    expect(faq.answer).toMatch(/entre dos y diez meses/i)
    expect(faq.answer).toMatch(/un solo acto/i)
  })
})

describe('patente: si no pagás', () => {
  it('la mora es escalonada y aclara la reducción vigente', () => {
    expect(PATENTE_MORA_TIERS).toHaveLength(3)
    expect(PATENTE_MORA_TIERS[0].multa).toMatch(/^5%/)
    expect(PATENTE_MORA_TIERS[1].multa).toMatch(/^10%/)
    expect(PATENTE_MORA_TIERS[2].multa).toMatch(/^20%/)
    // El artículo escribe 5/10/20 pero los reduce a la mitad desde 2019: sin el efectivo,
    // el lector compara contra una boleta que dice otra cosa.
    for (const t of PATENTE_MORA_TIERS) expect(t.multa).toMatch(/efectivo/)
    expect(PATENTE_MORA_RECARGO_RULE).toMatch(/Banco Central/)
    expect(PATENTE_MORA_RECARGO_RULE).toMatch(/no acá|en la liquidación/i)
  })

  it('cada consecuencia cita la norma que la habilita', () => {
    expect(PATENTE_CONSEQUENCES.length).toBeGreaterThanOrEqual(4)
    for (const c of PATENTE_CONSEQUENCES) {
      expect(c.norm).toMatch(/arts?\./i)
      expect(c.detail.length).toBeGreaterThan(80)
    }
    const all = PATENTE_CONSEQUENCES.map(c => `${c.label} ${c.detail}`).join(' ')
    expect(all).toMatch(/no puede transferirse/i)
    expect(all).toMatch(/25%/)
    expect(all).toMatch(/placas/i)
    expect(PATENTE_CONSEQUENCES.some(c => /19\.824/.test(c.norm))).toBe(true)
  })

  // El art. 45 del TOS 2026 sólo prohíbe TRANSFERIR; el «ni reempadronarse» del viejo art. 41 se
  // eliminó y el reempadronamiento pasó al art. 46, que admite expresamente deuda a vencer. Fundir
  // los dos bloqueos en una frase le dice a alguien que no puede hacer un trámite que sí puede.
  it('separa el bloqueo de transferencia del de reempadronamiento', () => {
    const all = PATENTE_CONSEQUENCES.map(c => `${c.label} ${c.detail}`).join(' ')
    expect(all).not.toMatch(/transferirse ni reempadronarse/i)
    expect(all).toMatch(/aunque todavía no haya vencido/i)
    expect(all).toMatch(/deuda VENCIDA/)
    expect(all).toMatch(/reconocimiento por quien quede como titular/i)
    const reemp = PATENTE_CONSEQUENCES.find(c => /reempadronar/i.test(c.label))!
    expect(reemp.norm).toMatch(/46/)
  })

  // El SUCIVE renumera su texto ordenado todos los años y en 2026 se movieron siete artículos.
  // Los números viejos no fallan ruidosamente: existen y son de otro tema.
  it('cita el texto ordenado 2026 y no los números corridos del 2022', () => {
    const sucive = PATENTE_CONSEQUENCES.filter(c => /SUCIVE/.test(c.norm))
    expect(sucive.length).toBeGreaterThanOrEqual(4)
    for (const c of sucive) expect(c.norm).toMatch(/2026/)
    const byLabel = (re: RegExp) => PATENTE_CONSEQUENCES.find(c => re.test(c.label))!
    expect(byLabel(/pagar la patente corriente/i).norm).toMatch(/art\. 29\b/)
    expect(byLabel(/transferir/i).norm).toMatch(/art\. 45\b/)
    expect(byLabel(/circular/i).norm).toMatch(/art\. 10\b/)
  })

  // «Persecución judicial de los adeudos» estaba en el art. 23 del texto ordenado 2022 y no está
  // en el 2026 ni en la ley 18.860. Era una de las cuatro palancas con las que se contrapesaba la
  // ausencia del clearing, así que se cae de las dos listas.
  it('no publica la persecución judicial, que el texto vigente ya no habilita', () => {
    const all = PATENTE_CONSEQUENCES.map(c => `${c.label} ${c.detail} ${c.norm}`).join(' ')
    expect(all).not.toMatch(/persecuci[oó]n judicial/i)
    expect(all).not.toMatch(/refinanciaci[oó]n/i)
    expect(PATENTE_CLEARING_ABSENCE).not.toMatch(/persecuci[oó]n judicial/i)
    const clearing = FINES_FAQ.find(f => /entro en el clearing/i.test(f.question))!
    expect(clearing.answer).not.toMatch(/persecuci[oó]n judicial/i)
  })

  // 13 formulaciones preguntaban por el clearing. Se publica la ausencia, no una negativa inventada.
  it('el clearing se publica como ausencia de fuente, no como afirmación', () => {
    expect(PATENTE_CLEARING_ABSENCE).toMatch(/no consta/i)
    expect(PATENTE_CLEARING_ABSENCE).toMatch(/clearing/i)
    expect(PATENTE_CLEARING_ABSENCE).toMatch(/pedile la fuente/i)
    // Y no debe deslizarse a afirmar que sí informan.
    expect(PATENTE_CLEARING_ABSENCE).not.toMatch(/la intendencia informa al clearing/i)
  })

  // Patente y multa NO prescriben igual: mezclarlos es el error que esta página tiene que cortar.
  it('la patente prescribe a los diez y se distingue de los cinco de la multa', () => {
    expect(PATENTE_PRESCRIPTION_YEARS).toBe(10)
    expect(PATENTE_PRESCRIPTION_YEARS).not.toBe(FINE_PRESCRIPTION_YEARS)
    expect(PATENTE_PRESCRIPTION_RULE).toMatch(/diez años/i)
    expect(PATENTE_PRESCRIPTION_RULE).toMatch(/cinco años/i)
    expect(PATENTE_PRESCRIPTION_TRAMITE).toMatch(/hay que pedirla/i)
    expect(PATENTE_PRESCRIPTION_TRAMITE).toMatch(/sin costo/i)
  })

  // EL HALLAZGO GRAVE DE LA AUDITORÍA 2026-08-10. «La prescripción se interrumpe cuando así lo
  // dispone el Gobierno Departamental por acto administrativo firme» es el art. 18 del texto
  // ordenado 2022 y NO está en el 2026: el art. 18 vigente fija los diez años y no regula la
  // interrupción. Publicar la cláusula derogada le decía a alguien con deuda de más de diez años
  // que firmar o reconocer no le movía el reloj de la patente. Se publica la ausencia.
  it('no publica la cláusula de interrupción derogada y sí publica la ausencia', () => {
    expect(PATENTE_PRESCRIPTION_RULE).not.toMatch(/acto administrativo firme/i)
    expect(PATENTE_PRESCRIPTION_RULE).not.toMatch(/se interrumpe cuando/i)
    expect(PATENTE_PRESCRIPTION_RULE).toMatch(/no regula la interrupción|no dice qué interrumpe/i)
    // Lo que el art. 18 vigente SÍ agrega, y hay que conservar.
    expect(PATENTE_PRESCRIPTION_RULE).toMatch(/sin excepciones/i)
    expect(PATENTE_PRESCRIPTION_RULE).toMatch(/acto administrativo/i)
    expect(PATENTE_PRESCRIPTION_RULE).toMatch(/2026/)
    const faq = FINES_FAQ.find(f => /deuda de patente prescribe/i.test(f.question))!
    expect(faq.answer).not.toMatch(/acto administrativo firme/i)
    expect(faq.answer).toMatch(/no regula la interrupción/i)
  })

  it('el convenio trae sus reglas duras y ningún importe inventado', () => {
    expect(CONVENIO_FACTS.length).toBeGreaterThanOrEqual(5)
    const all = CONVENIO_FACTS.map(c => `${c.label} ${c.detail}`).join(' ')
    expect(all).toMatch(/36 cuotas/)
    expect(all).toMatch(/tres días hábiles/i)
    expect(all).toMatch(/atraso de tres/i)
    // Los planes de regularización abren y cierran por ventanas: sus importes no son permanentes.
    expect(all).not.toMatch(/\bUI\b/)
  })

  // El art. 25 del TOS 2026 cambió la unidad del convenio de multas: un convenio POR CADA MULTA,
  // no uno por boleta. Cambia cuántas entregas iniciales hay que pagar en tres días hábiles.
  it('el convenio de multas se cuenta por multa y no por boleta', () => {
    const all = CONVENIO_FACTS.map(c => `${c.label} ${c.detail}`).join(' ')
    expect(all).toMatch(/por cada multa/i)
    expect(all).not.toMatch(/uno por cada boleta/i)
    const faq = FINES_FAQ.find(f => /convenio por la deuda de patente/i.test(f.question))!
    expect(faq.answer).toMatch(/por cada multa/i)
    expect(faq.answer).not.toMatch(/uno por cada boleta/i)
  })

  // El TOS 2026 borró «las multas por espirometrías no serán convenibles» del art. 25: la única
  // exclusión escrita en norma vigente es la del decreto 303/023 art. 6.
  it('no publica la prohibición de convenio por espirometría como si fuera vigente', () => {
    const all = CONVENIO_FACTS.map(c => `${c.label} ${c.detail}`).join(' ')
    expect(all).not.toMatch(
      /espirometría no son convenibles|espirometrías no ser[áa]n convenibles/i
    )
    expect(all).toMatch(/lesiones graves o fallecidos/i)
    expect(all).toMatch(/303\/023/)
    expect(FINES_SOURCES.some(s => /303-2023/.test(s.url))).toBe(true)
  })

  // La advertencia de multas (pagar revive la deuda) no se traslada tal cual a la patente, pero
  // tampoco se da vuelta: en la patente no hay norma que diga qué interrumpe.
  it('desambigua la advertencia de convenio entre multa y patente', () => {
    expect(CONVENIO_VS_PRESCRIPCION_NOTE).toMatch(/multas/i)
    expect(CONVENIO_VS_PRESCRIPCION_NOTE).toMatch(/artículo 18/i)
    expect(CONVENIO_VS_PRESCRIPCION_NOTE).not.toMatch(/acto administrativo firme/i)
    expect(CONVENIO_VS_PRESCRIPCION_NOTE).toMatch(/no regula la interrupción/i)
    expect(CONVENIO_VS_PRESCRIPCION_NOTE).toMatch(/reconocés los adeudos/i)
  })
})

describe('reempadronar en otro departamento', () => {
  // La creencia a desarmar: que el departamento se elige buscando la patente más barata.
  it('ata el empadronamiento al domicilio permanente, no a la conveniencia', () => {
    expect(REEMPADRONAR_RULE).toMatch(/no se elige/i)
    expect(REEMPADRONAR_RULE).toMatch(/domicilio permanente/i)
    expect(REEMPADRONAR_RULE).toMatch(/intereses económicos/i)
  })

  it('trae la declaración jurada, la denuncia por falsedad y los 30 días hábiles', () => {
    const all = REEMPADRONAR_FACTS.map(r => `${r.label} ${r.detail}`).join(' ')
    expect(all).toMatch(/declaración jurada/i)
    expect(all).toMatch(/falsedad ideológica/i)
    expect(all).toMatch(/treinta días hábiles/i)
  })

  // El art. 46 admite expresamente deuda a vencer; el bloqueo es sólo por deuda VENCIDA. La
  // versión anterior abría diciendo «rige el mismo bloqueo que para la transferencia» y se
  // contradecía a sí misma en la oración siguiente.
  it('el bloqueo del reempadronamiento es sólo por deuda vencida', () => {
    const all = REEMPADRONAR_FACTS.map(r => `${r.label} ${r.detail}`).join(' ')
    expect(all).not.toMatch(/no puede reempadronarse un vehículo que deba patente/i)
    expect(all).toMatch(/deuda VENCIDA/)
    expect(all).toMatch(/a vencer no bloquea|deuda a vencer/i)
    const reemp = REEMPADRONAR_FACTS.find(r => /VENCIDA/.test(r.label))!
    // La versión anterior abría con «Rige el mismo bloqueo que para la transferencia».
    expect(reemp.detail).toMatch(/^No rige el mismo bloqueo/)
    const faq = FINES_FAQ.find(f => /reempadronar el auto en otro departamento/i.test(f.question))!
    expect(faq.answer).toMatch(/deuda vencida/i)
    expect(faq.answer).not.toMatch(/si el vehículo debe patente, multas o cuotas de convenio/i)
  })

  // La tasa varía por intendencia: un número de un departamento hace presupuestar mal en otro.
  it('no publica un importe de trámite y manda a la intendencia', () => {
    expect(REEMPADRONAR_COST_NOTE).toMatch(/varía según la intendencia/i)
    expect(REEMPADRONAR_COST_NOTE).toMatch(/consultalo en la intendencia/i)
    expect(REEMPADRONAR_COST_NOTE).not.toMatch(/\$\s?[\d.]+/)
    expect(REEMPADRONAMIENTO_URL).toBe('https://www.sucive.gub.uy/solicitud_reempadronamiento')
  })
})

describe('el FAQ cubre las tres preguntas de patente', () => {
  const find = (re: RegExp) => FINES_FAQ.find(f => re.test(f.question))

  it('contesta cuánto se paga, qué pasa si no pagás y si conviene reempadronar', () => {
    expect(find(/cuánto pago de patente/i)).toBeDefined()
    expect(find(/no pagué la patente/i)).toBeDefined()
    expect(find(/reempadronar el auto en otro departamento/i)).toBeDefined()
  })

  it('contesta por la moto y por el clearing, que es lo que nadie contestaba', () => {
    const moto = find(/moto según la cilindrada/i)!
    expect(moto.answer).toMatch(/500 cc/)
    const clearing = find(/entro en el clearing/i)!
    expect(clearing.short).toMatch(/no consta/i)
  })

  it('el FAQ de prescripción de patente no se confunde con el de multas', () => {
    const f = find(/deuda de patente prescribe/i)!
    expect(f.answer).toMatch(/diez años/i)
    expect(f.answer).toMatch(/no lo confundas/i)
  })
})
