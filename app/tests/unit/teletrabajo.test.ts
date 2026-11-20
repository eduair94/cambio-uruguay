// Los plazos, las obligaciones y los derechos de `/teletrabajo-uruguay` salen del texto vigente de
// la Ley 19.978, del Decreto 86/022 y de la Ley 16.074, leídos artículo por artículo en impo.com.uy
// (`TELETRABAJO_VERIFIED_AT`). Estos tests atan el contenido a esa lectura: cambiar un número obliga
// a cambiar el test y a volver a la norma, que es el único control real contra una cifra que se
// degrada sola. Cada regla guarda en `cita` las palabras EXACTAS de la norma, y los tests exigen que
// lo que la página afirma salga de esa cita.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  TELETRABAJO_ACUERDO,
  TELETRABAJO_ALCANCE,
  TELETRABAJO_DERECHOS,
  TELETRABAJO_FAQ,
  TELETRABAJO_NORMAS,
  TELETRABAJO_OBLIGACIONES,
  TELETRABAJO_PLAZOS,
  TELETRABAJO_RELATED,
  TELETRABAJO_SOURCES,
  TELETRABAJO_VERIFIED_AT,
  teletrabajoArticulosCitados,
  teletrabajoPlazosConNumero,
} from '../../utils/teletrabajo'

const PAGE = readFileSync(resolve(__dirname, '../../pages/teletrabajo-uruguay.vue'), 'utf8')

describe('a quién se aplica', () => {
  it('es la relación de dependencia con un empleador privado o público no estatal (Ley 19.978, art. 2)', () => {
    expect(TELETRABAJO_ALCANCE.articulo).toBe('Ley 19.978, art. 2')
    expect(TELETRABAJO_ALCANCE.cita).toMatch(/subordinación y dependencia/)
    expect(TELETRABAJO_ALCANCE.cita).toMatch(/persona privada o de derecho público no estatal/)
    expect(TELETRABAJO_ALCANCE.texto).toMatch(/dependencia/)
    expect(TELETRABAJO_ALCANCE.texto).toMatch(/No cubre a quien trabaja para el Estado/)
  })

  it('la página lo dice arriba, antes de los plazos', () => {
    const alcance = PAGE.indexOf('TELETRABAJO_ALCANCE.texto')
    const plazos = PAGE.indexOf('Los cuatro plazos')
    expect(alcance).toBeGreaterThan(0)
    expect(alcance).toBeLessThan(plazos)
  })

  it('y hay una pregunta frecuente que lo contesta', () => {
    const faq = TELETRABAJO_FAQ.find(item => /Estado o como independiente/.test(item.question))!
    expect(faq.answer).toMatch(/Ley 19\.978, art\. 2/)
  })
})

describe('los plazos', () => {
  it('son las ocho horas de desconexión, los 90 días, los 7 de aviso y los 45 que vuelven permanente', () => {
    expect(TELETRABAJO_PLAZOS).toHaveLength(4)
    const porConcepto = (patron: RegExp) =>
      TELETRABAJO_PLAZOS.find(plazo => patron.test(plazo.concepto))!

    expect(porConcepto(/desconexión/i).valor).toBe('8 horas continuas')
    expect(porConcepto(/volver a presencial/i).valor).toBe('90 días corridos')
    expect(porConcepto(/aviso previo/i).valor).toBe('7 días corridos')
    expect(porConcepto(/permanente/i).valor).toBe('Más de 45 días')
  })

  it('cada número sale de la cita textual de la norma', () => {
    const porConcepto = (patron: RegExp) =>
      TELETRABAJO_PLAZOS.find(plazo => patron.test(plazo.concepto))!
    expect(porConcepto(/desconexión/i).cita).toMatch(/desconexión mínima de 8 horas continuas/)
    expect(porConcepto(/volver a presencial/i).cita).toMatch(/90 \(noventa\) días corridos/)
    expect(porConcepto(/aviso previo/i).cita).toMatch(/no inferior a 7 \(siete\) días corridos/)
    expect(porConcepto(/permanente/i).cita).toMatch(/más de 45 \(cuarenta y cinco\) días/)
  })

  it('la desconexión cita las DOS normas, que es donde está escrita dos veces', () => {
    const desconexion = TELETRABAJO_PLAZOS.find(plazo => /desconexión/i.test(plazo.concepto))!
    expect(desconexion.articulo).toMatch(/Ley 19\.978, art\. 8/)
    expect(desconexion.articulo).toMatch(/Decreto 86\/022, art\. 9/)
    // El decreto dice que las partes acuerdan «el horario de desconexión», no el de inicio.
    expect(desconexion.detalle).toMatch(/horario de desconexión/)
  })

  // Los siete días de aviso están en la ley («no inferior a siete días»); el decreto agrega
  // «corridos» y el medio electrónico.
  it('el aviso de siete días cita la ley y el decreto', () => {
    const aviso = TELETRABAJO_PLAZOS.find(plazo => /aviso previo/i.test(plazo.concepto))!
    expect(aviso.articulo).toMatch(/Ley 19\.978, art\. 7/)
    expect(aviso.articulo).toMatch(/Decreto 86\/022, art\. 4/)
  })

  // El plazo de 45 días es SÓLO del decreto: el título de la tabla tiene que nombrarlo.
  it('el título de la tabla nombra al decreto, porque el plazo de 45 días es sólo suyo', () => {
    const permanente = TELETRABAJO_PLAZOS.find(plazo => /permanente/i.test(plazo.concepto))!
    expect(permanente.articulo).toBe('Decreto 86/022, art. 4')
    expect(PAGE).toMatch(/Los cuatro plazos de la ley y su decreto/)
  })

  it('cada plazo nombra el artículo que lo fija', () => {
    for (const plazo of TELETRABAJO_PLAZOS) {
      expect(plazo.articulo, plazo.concepto).toMatch(/(Ley 19\.978|Decreto 86\/022), art\. \d+/)
    }
    expect(teletrabajoPlazosConNumero()).toBe(4)
  })
})

describe('lo que pone la empresa', () => {
  it('la regla del desacuerdo dice equipos, insumos Y servicios (Ley 19.978, art. 12)', () => {
    const sinAcuerdo = TELETRABAJO_OBLIGACIONES.find(o => /Sin acuerdo/i.test(o.titular))!
    expect(sinAcuerdo.detalle).toMatch(/equipos, los insumos y los servicios/)
    expect(sinAcuerdo.articulo).toMatch(/Ley 19\.978, art\. 12/)
    expect(sinAcuerdo.cita).toMatch(/^En caso de desacuerdo/)
  })

  it('enumera los cinco costos del equipo, y SÓLO para el caso en que no hay acuerdo', () => {
    const costos = TELETRABAJO_OBLIGACIONES.find(o => /mantenerlo andando/i.test(o.titular))!
    for (const costo of [
      'instalación',
      'operación',
      'funcionamiento',
      'reemplazo',
      'mantenimiento',
    ]) {
      expect(costos.detalle, costo).toContain(costo)
      expect(costos.cita, costo).toContain(costo)
    }
    // Las dos normas lo condicionan: «En caso de desacuerdo» (ley) y «Para el caso de no existir
    // acuerdo» (decreto). Publicarlo sin la condición fue el defecto del borrador.
    expect(costos.titular).toMatch(/en ese mismo caso/i)
    expect(costos.detalle).toMatch(/^Si no se acordó otra cosa/)
    expect(costos.cita).toMatch(/^Para el caso de no existir acuerdo/)
    expect(costos.articulo).toMatch(/Ley 19\.978, art\. 12/)
    expect(costos.articulo).toMatch(/Decreto 86\/022, art\. 8/)
  })

  it('dice que lo provisto no es salario ni materia gravada, que es la parte de plata', () => {
    const gravada = TELETRABAJO_OBLIGACIONES.find(o => /no es sueldo/i.test(o.titular))!
    expect(gravada.detalle).toMatch(/salario, materia gravada ni asignación computable/)
    expect(gravada.cita).toMatch(/no serán considerados a ningún efecto parte del salario/)
    expect(gravada.articulo).toMatch(/Ley 19\.978, art\. 12/)
  })

  // Ninguna de las normas nombra el IRPF y ninguna fuente de la DGI lo dice: no se afirma.
  it('no afirma nada sobre el IRPF, que la norma no nombra', () => {
    for (const o of TELETRABAJO_OBLIGACIONES) expect(o.detalle, o.titular).not.toMatch(/IRPF/)
    for (const item of TELETRABAJO_FAQ) expect(item.answer, item.question).not.toMatch(/IRPF/)
  })

  it('el accidente se cubre si es a causa del trabajo o en ocasión del mismo (Ley 16.074, art. 2)', () => {
    const accidente = TELETRABAJO_OBLIGACIONES.find(o => /accidente/i.test(o.titular))!
    expect(accidente.titular).not.toMatch(/en tu casa es accidente de trabajo/)
    expect(accidente.detalle).toMatch(/Ley 16\.074/)
    expect(accidente.detalle).toMatch(/a causa del trabajo o en ocasión del mismo/)
    expect(accidente.cita).toMatch(/a causa del trabajo o en ocasión del mismo/)
    expect(accidente.articulo).toMatch(/Ley 19\.978, art\. 13/)
    expect(accidente.articulo).toMatch(/Ley 16\.074, art\. 2/)
  })

  it('el aviso de la luz condiciona los costos del equipo al desacuerdo', () => {
    expect(PAGE).toMatch(/En ese mismo caso, lo que está escrito con todas las letras/)
  })
})

describe('los derechos del teletrabajador', () => {
  it('arranca por la voluntariedad, que es el eje del régimen', () => {
    expect(TELETRABAJO_DERECHOS[0]!.derecho).toMatch(/consentimiento/i)
    expect(TELETRABAJO_DERECHOS[0]!.articulo).toMatch(/Ley 19\.978, art\. 3/)
  })

  it('cada derecho lleva su artículo y su cita', () => {
    for (const derecho of TELETRABAJO_DERECHOS) {
      expect(derecho.articulo, derecho.derecho.slice(0, 40)).toMatch(
        /(Ley 19\.978|Decreto 86\/022), art\. \d+/
      )
      expect(derecho.cita.length, derecho.derecho.slice(0, 40)).toBeGreaterThan(40)
    }
  })

  it('incluye que no se puede sancionar por negarse a tareas en la desconexión', () => {
    const sancion = TELETRABAJO_DERECHOS.find(d => /sancionar/i.test(d.derecho))!
    expect(sancion.articulo).toMatch(/Decreto 86\/022, art\. 9/)
    expect(sancion.cita).toMatch(/no podrá ser sancionado/)
  })

  // El decreto dice «considerando el horario de funcionamiento y las necesidades de la empresa»,
  // no «dentro del horario».
  it('la libre distribución de la jornada usa las palabras del decreto', () => {
    const jornada = TELETRABAJO_DERECHOS.find(d => /distribuir libremente/i.test(d.derecho))!
    expect(jornada.derecho).toMatch(
      /considerando el horario de funcionamiento y las necesidades de la empresa/
    )
    expect(jornada.derecho).not.toMatch(/dentro del horario/)
  })

  it('el registro de horas protege también al grupo familiar (Decreto 86/022, art. 6)', () => {
    const registro = TELETRABAJO_DERECHOS.find(d => /registrar tus horas/i.test(d.derecho))!
    expect(registro.derecho).toMatch(/grupo familiar/)
  })

  // «La contracara es que tampoco se te impone uno» era una inferencia, no texto de la ley.
  it('el lugar se dice como lo dice la ley, sin agregarle una contracara', () => {
    const lugar = TELETRABAJO_DERECHOS.find(d => /lugar desde el que/i.test(d.derecho))!
    expect(lugar.derecho).toMatch(/En ningún caso podés exigirle al empleador/)
    expect(lugar.derecho).not.toMatch(/contracara|se te impone/)
  })
})

describe('el contenido mínimo del acuerdo', () => {
  it('son los siete puntos que enumera el art. 3 del decreto', () => {
    expect(TELETRABAJO_ACUERDO).toHaveLength(7)
    expect(TELETRABAJO_ACUERDO.join(' ')).toMatch(/voluntaria/)
    expect(TELETRABAJO_ACUERDO.join(' ')).toMatch(/desconexión/)
    expect(TELETRABAJO_ACUERDO.join(' ')).toMatch(/tecnologías de la información/)
  })

  // El decreto: «Si existen horarios o rangos horarios en los que el teletrabajador distribuirá sus
  // horas de trabajo». Es condicional, no un horario obligatorio.
  it('el punto de los horarios es condicional, como en el decreto', () => {
    const horarios = TELETRABAJO_ACUERDO.find(punto => /horari/i.test(punto))!
    expect(horarios).toMatch(/^Si hay horarios o franjas horarias/)
  })
})

describe('las fuentes', () => {
  it('son las dos normas del régimen más la del seguro de accidentes, todas de IMPO', () => {
    expect(TELETRABAJO_SOURCES).toHaveLength(3)
    for (const fuente of TELETRABAJO_SOURCES) {
      expect(fuente.url, fuente.label).toMatch(/^https:\/\/www\.impo\.com\.uy\/bases\//)
      expect(fuente.publisher).toBe('IMPO — Centro de Información Oficial')
    }
  })

  // En IMPO, `/bases/leyes/<n>` es el texto vigente y `/bases/leyes-originales/<n>` el de la
  // promulgación: citar el segundo es publicar algo que puede estar derogado.
  it('cita el texto vigente y nunca el original', () => {
    for (const fuente of TELETRABAJO_SOURCES) {
      expect(fuente.url, fuente.label).not.toMatch(/leyes-originales/)
    }
  })

  it('declara cuándo se leyeron', () => {
    expect(TELETRABAJO_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('las preguntas frecuentes', () => {
  it('contestan la de la luz diciendo lo que la norma NO dice', () => {
    const luz = TELETRABAJO_FAQ.find(item => /luz y el internet/i.test(item.question))!
    // Es el punto entero de la página: ninguna de las dos normas nombra la factura. Si alguien
    // borra esta aclaración, el test cae.
    expect(luz.answer).toMatch(/ni el Decreto 86\/022 nombran la factura/i)
    expect(luz.answer).toMatch(/"servicios"/)
    // Y los costos del equipo, con la condición del desacuerdo.
    expect(luz.answer).toMatch(/En ese mismo caso, sin acuerdo, los costos/)
  })

  it('aclara que el exceso diario no es hora extra, que es la trampa de la jornada', () => {
    const extra = TELETRABAJO_FAQ.find(item => /horas extras/i.test(item.question))!
    expect(extra.answer).toMatch(/no constituye trabajo extraordinario/i)
    expect(extra.answer).toMatch(/misma semana/)
    expect(extra.answer).toMatch(/100 %/)
    // La cita entre comillas tiene que ser la literal del decreto, art. 5.
    expect(extra.answer).toMatch(/"con las tasas de recargo que correspondan"/)
    expect(extra.answer).not.toMatch(/recargos aplicables/)
    // Ninguna norma ordena las diferencias: el superlativo no tiene fuente.
    expect(extra.answer).not.toMatch(/más importante/)
  })

  // Ninguna fuente dice cuántos teletrabajadores no tienen acuerdo; la ley y el decreto, al
  // contrario, exigen uno escrito. No se publica una proporción que nadie midió.
  it('no afirma que la mayoría no acordó nada', () => {
    expect(PAGE).not.toMatch(/caso de la\s+mayoría/)
  })

  it('el régimen híbrido usa la frase del decreto, que no se limita a los días de teletrabajo', () => {
    const hibrido = TELETRABAJO_FAQ.find(item => /dos días por semana/i.test(item.question))!
    expect(hibrido.answer).toMatch(
      /"a la totalidad de las jornadas trabajadas en régimen de teletrabajo parcial o híbrido"/
    )
    expect(hibrido.answer).not.toMatch(/todos los días de teletrabajo/)
  })

  it('cada respuesta cita al menos un artículo', () => {
    for (const item of TELETRABAJO_FAQ) {
      expect(item.answer, item.question).toMatch(/art\. \d+/)
    }
  })

  it('no repite una pregunta', () => {
    const preguntas = TELETRABAJO_FAQ.map(item => item.question)
    expect(new Set(preguntas).size).toBe(preguntas.length)
  })
})

describe('el enlazado', () => {
  it('lleva a páginas del sitio, con ruta absoluta y sin dominio', () => {
    expect(TELETRABAJO_RELATED.length).toBeGreaterThanOrEqual(4)
    for (const rel of TELETRABAJO_RELATED) {
      expect(rel.to, rel.label).toMatch(/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/)
    }
  })

  it('enlaza horas extras, que es la página cuya regla el teletrabajo cambia', () => {
    expect(TELETRABAJO_RELATED.map(rel => rel.to)).toContain('/horas-extras-uruguay')
  })
})

describe('el recuento de artículos que la página imprime', () => {
  it('sale de los propios textos y no de un número escrito a mano', () => {
    const articulos = teletrabajoArticulosCitados()
    expect(articulos).toContain('Ley 19.978 art. 2')
    expect(articulos).toContain('Ley 19.978 art. 12')
    expect(articulos).toContain('Decreto 86/022 art. 9')
    // Sólo lo cita la respuesta del régimen híbrido: prueba que el recuento lee también las FAQ.
    expect(articulos).toContain('Decreto 86/022 art. 1')
    expect(articulos).toHaveLength(18)
    // Ordenado y sin repetidos: es lo que hace que el número de la página sea estable.
    expect(articulos).toEqual([...new Set(articulos)].sort())
  })

  // La página dice «entre la Ley 19.978, el Decreto 86/022 y la Ley 16.074»: las tres tienen que
  // aportar al menos un artículo al recuento, o la frase miente.
  it('cuenta al menos un artículo de cada una de las normas que la frase nombra', () => {
    const articulos = teletrabajoArticulosCitados()
    for (const norma of TELETRABAJO_NORMAS) {
      expect(
        articulos.some(a => a.startsWith(`${norma} art.`)),
        norma
      ).toBe(true)
      expect(PAGE, norma).toContain(norma)
    }
  })
})
