// La página existe porque el job de demanda encontró tres consultas del mismo tema cuyo SERP son
// foros, y sobrevive sólo si cada afirmación sigue teniendo su documento al lado. Lo que este test
// vigila no es la redacción: es que no aparezca una cifra sin fuente, que cada fuente tenga URL y
// fecha, que las tres escaleras de bloqueo sigan siendo las que publica Antel, y que lo que Antel
// NO publica (el plazo del móvil para volver) siga estando dicho como ausencia y no como dato.
//
// La primera versión (2026-09-03) afirmaba que Antel "no publica" cuántos días pasan hasta el
// bloqueo. La segunda lectura (2026-09-22) la refutó en parte: no publica DÍAS salvo uno (los 30
// días del tarifario de fija), pero sí publica FACTURAS en tres documentos. Este archivo fija esa
// corrección para que no vuelva la versión vieja.
import { describe, expect, it } from 'vitest'
import {
  A_FAVOR_DEL_CLIENTE,
  ANTECEDENTE_COVID,
  ANTEL_DEUDA_FAQ,
  ANTEL_DEUDA_SOURCES,
  ANTEL_DEUDA_VERIFIED_AT,
  CONTRATO,
  ESCALERAS,
  PLAZOS_CONTRATO,
  RECLAMO,
  RECONEXION,
  REGISTRO_MOROSOS,
  RESCISION,
  SANCIONES,
  SECUENCIA,
  fuentePrincipal,
  type HechoAntel,
} from '../../utils/antelDeuda'

const HECHOS: HechoAntel[] = [
  ...SECUENCIA,
  ...RECONEXION,
  ...CONTRATO,
  ...RESCISION,
  ...REGISTRO_MOROSOS,
  ...A_FAVOR_DEL_CLIENTE,
  ANTECEDENTE_COVID,
]

/** Todo lo que cita una fuente por id, sea hecho, escalera, sanción, plazo o paso del reclamo. */
const CITAN: { nombre: string; fuenteIds: readonly string[] }[] = [
  ...HECHOS.map(h => ({ nombre: h.pregunta, fuenteIds: h.fuenteIds })),
  ...ESCALERAS.map(e => ({ nombre: e.servicio, fuenteIds: e.fuenteIds })),
  ...SANCIONES.map(s => ({ nombre: s.documento, fuenteIds: s.fuenteIds })),
  ...PLAZOS_CONTRATO.map(p => ({ nombre: p.plan, fuenteIds: p.fuenteIds })),
  ...RECLAMO.map(r => ({ nombre: r.titulo, fuenteIds: r.fuenteIds })),
]

const TEXTOS: string[] = [
  ...HECHOS.flatMap(h => [h.pregunta, h.respuesta, h.fuente]),
  ...ESCALERAS.flatMap(e => [
    e.documento,
    e.vigencia,
    e.bloqueoSaliente,
    e.bloqueoTotal,
    e.supresion,
  ]),
  ...SANCIONES.flatMap(s => [s.documento, s.multa, s.recargo]),
  ...CONTRATO.flatMap(c => [c.respuesta]),
  ...RECLAMO.flatMap(r => [r.titulo, r.detalle, r.fuente]),
  ...ANTEL_DEUDA_FAQ.flatMap(f => [f.question, f.answer]),
  ...ANTEL_DEUDA_SOURCES.map(s => s.label),
]

/** Hosts que publican los documentos citados. Nada de foros ni de sitios de trámites de terceros. */
const HOSTS_OFICIALES = [
  'www.antel.com.uy',
  'antel.com.uy',
  'tienda.antel.com.uy',
  'mensajes-servicios.antel.com.uy',
  'web.archive.org',
  'www.impo.com.uy',
  'www.gub.uy',
]

describe('cada fuente tiene URL oficial, editor y fecha de lectura', () => {
  it('los ids son únicos', () => {
    const ids = ANTEL_DEUDA_SOURCES.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(ANTEL_DEUDA_SOURCES.map(s => [s.id, s] as const))('%s', (_id, src) => {
    expect(src.url).toMatch(/^https:\/\//)
    expect(HOSTS_OFICIALES, `host no oficial: ${src.url}`).toContain(new URL(src.url).host)
    expect(src.publisher.trim().length).toBeGreaterThan(2)
    expect(src.label.trim().length).toBeGreaterThan(10)
    expect(src.seenOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(new Date(`${src.seenOn}T00:00:00Z`).getTime()).toBeLessThanOrEqual(Date.now())
  })

  it('la copia de archivo es sólo para la tabla que Antel retiró, y lo dice', () => {
    const archivadas = ANTEL_DEUDA_SOURCES.filter(s => s.url.includes('web.archive.org'))
    expect(archivadas).toHaveLength(1)
    expect(archivadas[0]!.label).toMatch(/retirada/i)
    expect(archivadas[0]!.url).toMatch(/antel\.com\.uy\/personas\/novedades\/nuevo-regimen/)
  })
})

describe('cada hecho trae su documento', () => {
  it.each(CITAN.map(c => [c.nombre, c] as const))(
    '%s cita al menos una fuente que existe',
    (_n, c) => {
      expect(c.fuenteIds.length).toBeGreaterThan(0)
      const ids = new Set(ANTEL_DEUDA_SOURCES.map(s => s.id))
      for (const id of c.fuenteIds) expect(ids.has(id), `fuente desconocida: ${id}`).toBe(true)
      expect(fuentePrincipal(c)).toBeTruthy()
    }
  )

  it.each(HECHOS.map(h => [h.pregunta, h] as const))('%s explica y nombra el artículo', (_p, h) => {
    expect(h.fuente.trim().length).toBeGreaterThan(10)
    expect(h.respuesta.trim().length).toBeGreaterThan(40)
  })
})

describe('las tres escaleras son las que publica Antel', () => {
  it('son tres: fija (tarifario 2026), móvil (condiciones 2023) y la tabla general retirada', () => {
    expect(ESCALERAS.map(e => e.id)).toEqual(['fija', 'movil', 'tabla-2023'])
  })

  it('fija: 2.ª factura → saliente, 30 días después → total, 6.º vencimiento → supresión', () => {
    const fija = ESCALERAS.find(e => e.id === 'fija')!
    expect(fija.bloqueoSaliente).toMatch(/2\.ª factura/)
    expect(fija.bloqueoSaliente).toMatch(/5 %/)
    expect(fija.bloqueoTotal).toMatch(/30 días del bloqueo saliente/)
    expect(fija.supresion).toMatch(/6\.º vencimiento/)
    expect(fija.vigencia).toMatch(/enero 2026/)
    expect(fija.fuenteIds[0]).toBe('boletin-fija')
  })

  it('móvil: 1 factura → saliente, 2 consecutivas → total', () => {
    const movil = ESCALERAS.find(e => e.id === 'movil')!
    expect(movil.bloqueoSaliente).toMatch(/^1 factura impaga/)
    expect(movil.bloqueoTotal).toMatch(/^2 facturas consecutivas/)
    expect(movil.fuenteIds[0]).toBe('cond-movil')
  })

  it('la tabla de junio 2023 dice que está retirada del sitio, con la fecha de la última copia', () => {
    const tabla = ESCALERAS.find(e => e.id === 'tabla-2023')!
    expect(tabla.vigencia).toMatch(/Retirada/)
    expect(tabla.vigencia).toMatch(/11\/12\/2025/)
    expect(tabla.bloqueoSaliente).toMatch(/2\.ª factura vencida/)
    expect(tabla.bloqueoTotal).toMatch(/3\.ª/)
    expect(tabla.supresion).toMatch(/4\.ª/)
    expect(tabla.supresion).toMatch(/prepago/)
  })

  it('el único plazo en días viene del tarifario de fija y la secuencia lo dice así', () => {
    const paso = SECUENCIA.find(p => /único plazo en días/i.test(p.pregunta))
    expect(paso, 'falta el renglón del plazo en días').toBeTruthy()
    expect(paso!.respuesta).toMatch(/30 días del bloqueo saliente/)
    expect(paso!.fuenteIds).toContain('boletin-fija')
  })
})

describe('lo que Antel no publica se dice que no lo publica, y nada más se marca así', () => {
  it('lo único sin publicar es el plazo de reconexión del móvil', () => {
    const sinPublicar = HECHOS.filter(p => p.sinPublicar)
    expect(sinPublicar.length).toBeGreaterThanOrEqual(1)
    for (const h of sinPublicar) {
      expect(h.pregunta).toMatch(/móvil/i)
      expect(h.respuesta).not.toMatch(/\b\d+\s*(horas|hs|días|dias)\b/i)
      expect(h.respuesta).toMatch(/no lo publica|sin plazo|ausencia verificada/i)
    }
  })

  it('la página ya no dice que Antel no publica cuántas facturas hacen falta', () => {
    for (const t of TEXTOS) {
      expect(t).not.toMatch(/no publica cu[aá]nt[ao]s facturas/i)
      expect(t).not.toMatch(/cualquier cantidad de días que leas por ahí no sale/i)
    }
  })
})

describe('las afirmaciones refutadas o sin fuente no vuelven', () => {
  it('no se publica "tres facturas vencidas" como regla ni avisos por SMS como promesa', () => {
    for (const t of TEXTOS) {
      // La única mención permitida es la que la desmiente.
      if (/tres facturas vencidas/i.test(t)) expect(t).toMatch(/tercero|sin fuente|no dice/i)
      if (/\bSMS\b/.test(t)) expect(t).toMatch(/ning[uú]n documento|no dice|no promete/i)
    }
  })

  it('no hay reconexión "en pocas horas" ni "24 y 48 horas" como dato', () => {
    for (const t of TEXTOS) {
      if (/pocas horas/i.test(t)) expect(t).toMatch(/tercero|no sale de un documento/i)
      expect(t).not.toMatch(/24 y 48 horas/i)
    }
  })

  it('el cargo de $5.500 va con su tarifario y con la condición marcada como no impresa', () => {
    const hecho = CONTRATO.find(c => /5\.500/.test(c.respuesta))
    expect(hecho, 'falta el cargo de cambio de producto por renovación').toBeTruthy()
    expect(hecho!.fuenteIds).toContain('tarifario-datos')
    expect(hecho!.respuesta).toMatch(/no imprime|no se puede leer/i)
    expect(hecho!.respuesta).toMatch(/778/)
  })

  it('la baja "sin cargo con 6 meses de aviso" no aparece (sale de un comentario de Reddit)', () => {
    for (const t of TEXTOS) expect(t).not.toMatch(/6 meses de (aviso|anticipación)/i)
  })

  it('la multa 5/10/20 % del Código Tributario se presenta como la norma de referencia, no como fórmula de Antel', () => {
    const norma = SANCIONES.find(s => s.id === 'norma')!
    expect(norma.multa).toMatch(/20 %/)
    expect(norma.multa).toMatch(/referencia legal|no una fórmula de Antel/i)
    const fija = SANCIONES.find(s => s.id === 'fija')!
    expect(fija.multa).not.toMatch(/20 %/)
    expect(fija.multa).toMatch(/10 %/)
    expect(fija.recargo).toMatch(/art\. 33/)
    const movil = SANCIONES.find(s => s.id === 'movil')!
    expect(movil.recargo).toMatch(/BCU/)
    expect(movil.recargo).toMatch(/10 %/)
  })

  it('el 20 % de renovación móvil sólo al pasar a un plan de mayor valor', () => {
    const hecho = CONTRATO.find(c => /20 %/.test(c.respuesta))
    expect(hecho).toBeTruthy()
    expect(hecho!.respuesta).toMatch(/mayor valor/)
  })

  it('las 24 horas del 121 salen de la cláusula 7.1 de internet, no de la FAQ de fija', () => {
    const r = A_FAVOR_DEL_CLIENTE.find(x => /24 horas/.test(x.respuesta))
    expect(r).toBeTruthy()
    expect(r!.fuente).toMatch(/cláusula 7\.1/)
    expect(r!.fuenteIds).toContain('cond-internet')
  })

  it('la FAQ de baja de URSEC es del 30/01/2023 y el trámite del 27/07/2026; no existe una del 17/07/2026', () => {
    for (const t of TEXTOS) expect(t).not.toMatch(/17\/07\/2026/)
    expect(ANTEL_DEUDA_SOURCES.find(s => s.id === 'ursec-baja')!.label).toMatch(/30\/01\/2023/)
    expect(ANTEL_DEUDA_SOURCES.find(s => s.id === 'ursec-tramite')!.label).toMatch(/27\/07\/2026/)
  })
})

describe('los plazos que sí están publicados', () => {
  it('la reconexión son 48 horas hábiles en el fijo y 72 en internet', () => {
    const paso = SECUENCIA.find(p => /Cuánto tarda en volver el servicio/i.test(p.pregunta))
    expect(paso).toBeTruthy()
    expect(paso!.respuesta).toContain('48 horas hábiles')
    expect(paso!.respuesta).toContain('72 horas')
    expect(paso!.fuenteIds[0]).toBe('faq-facturacion')
  })

  it('no hay cargo de reconexión, y se dice con los tarifarios al lado', () => {
    const r = RECONEXION.find(x => /No hay cargo de reconexión/i.test(x.pregunta))
    expect(r).toBeTruthy()
    expect(r!.fuenteIds).toContain('tarifarios-2026')
  })

  it('los reintegros: 12 h en internet y 6 h en móvil, siempre a solicitud', () => {
    const internet = A_FAVOR_DEL_CLIENTE.find(x => /12 horas/.test(x.pregunta))!
    const movil = A_FAVOR_DEL_CLIENTE.find(x => /6 horas/.test(x.pregunta))!
    expect(internet.respuesta).toMatch(/a solicitud/i)
    expect(movil.respuesta).toMatch(/a solicitud/i)
  })

  it('los plazos de contrato: 2 años, 12 meses y 24 meses, con tienda o tarifario al lado', () => {
    const plazos = PLAZOS_CONTRATO.map(p => p.plazo)
    expect(plazos).toContain('2 años')
    expect(plazos).toContain('12 meses')
    expect(plazos).toContain('24 meses')
    const basico = PLAZOS_CONTRATO.find(p => p.id === 'fibra-basico')!
    expect(basico.precio).toMatch(/1\.650/)
    expect(basico.fuenteIds).toContain('tarifario-datos')
  })

  it('rescisión anticipada: la totalidad de las mensualidades, no un porcentaje', () => {
    const r = RESCISION.find(x => /todas las mensualidades/i.test(x.pregunta))!
    expect(r.respuesta).toMatch(/totalidad de las mensualidades/)
    expect(r.respuesta).toMatch(/No es un porcentaje/)
    const movil = RESCISION.find(x => /meses restantes/i.test(x.pregunta))!
    expect(movil.respuesta).toMatch(/tarifa mensual/)
    expect(movil.respuesta).toMatch(/amortizar/)
  })

  it('el camino URSEC tiene trámite, dirección, horario y el límite de lo que puede hacer', () => {
    expect(RECLAMO.map(r => r.id)).toEqual(['antel', 'ursec', 'servicio-o-equipo', 'limites'])
    const ursec = RECLAMO.find(r => r.id === 'ursec')!
    expect(ursec.detalle).toMatch(/Av\. Uruguay 988/)
    expect(ursec.detalle).toMatch(/9:15 a 15:15/)
    expect(ursec.detalle).toMatch(/sin costo/)
    expect(ursec.fuenteIds).toContain('ursec-tramite')
    const limites = RECLAMO.find(r => r.id === 'limites')!
    expect(limites.detalle).toMatch(/no existe obligación legal/)
  })
})

describe('la FAQ sale del autocompletado, no de la imaginación', () => {
  it('tiene entre 3 y 5 preguntas con id único', () => {
    expect(ANTEL_DEUDA_FAQ.length).toBeGreaterThanOrEqual(3)
    expect(ANTEL_DEUDA_FAQ.length).toBeLessThanOrEqual(5)
    expect(new Set(ANTEL_DEUDA_FAQ.map(f => f.id)).size).toBe(ANTEL_DEUDA_FAQ.length)
  })

  it.each(ANTEL_DEUDA_FAQ.map(f => [f.question, f] as const))('%s tiene respuesta', (_q, item) => {
    expect(item.answer.trim().length).toBeGreaterThan(60)
  })

  it('cubre las tres consultas que trajo el job de demanda, más la del contrato', () => {
    const todas = ANTEL_DEUDA_FAQ.map(f => f.question.toLowerCase()).join(' | ')
    expect(todas).toMatch(/no pago la factura de antel/)
    expect(todas).toMatch(/cuándo te corta antel/)
    expect(todas).toMatch(/demora antel en reconectar/)
    expect(todas).toMatch(/vence mi contrato/)
  })

  it('la respuesta al corte cuenta facturas y no promete avisos', () => {
    const q = ANTEL_DEUDA_FAQ.find(f => /cuándo te corta/i.test(f.question))!
    expect(q.answer).toMatch(/facturas vencidas, no en días/i)
    expect(q.answer).toMatch(/segunda impaga/i)
    expect(q.answer).toMatch(/dos consecutivas/i)
    expect(q.answer).toMatch(/retirada/i)
  })
})

describe('ortografía y fechas', () => {
  it('setiembre, nunca septiembre; ninguna fecha con mes y sin año', () => {
    for (const t of TEXTOS) {
      expect(t).not.toMatch(/septiembre/i)
      // "de junio de 2023" sí; "en junio" suelto, no.
      const suelto = t.match(
        /\b(?:en|desde|hasta|de)\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|setiembre|octubre|noviembre|diciembre)\b(?!\s+de\s+\d{4})(?!\s+\d{4})/i
      )
      expect(suelto, `mes sin año en: ${t}`).toBeNull()
    }
  })

  it('la fecha de verificación es ISO, no del futuro, y posterior a la primera lectura', () => {
    expect(ANTEL_DEUDA_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(new Date(`${ANTEL_DEUDA_VERIFIED_AT}T00:00:00Z`).getTime()).toBeLessThanOrEqual(
      Date.now()
    )
    expect(ANTEL_DEUDA_VERIFIED_AT > '2026-09-03').toBe(true)
  })
})
