// Los plazos, las obligaciones y los derechos de `/teletrabajo-uruguay` salen del texto vigente de
// la Ley 19.978 y del Decreto 86/022, leídos artículo por artículo en impo.com.uy el 2026-11-19.
// Estos tests atan el contenido a esa lectura: cambiar un número obliga a cambiar el test y a
// volver a la norma, que es el único control real contra una cifra que se degrada sola.
import { describe, expect, it } from 'vitest'
import {
  TELETRABAJO_ACUERDO,
  TELETRABAJO_DERECHOS,
  TELETRABAJO_FAQ,
  TELETRABAJO_OBLIGACIONES,
  TELETRABAJO_PLAZOS,
  TELETRABAJO_RELATED,
  TELETRABAJO_SOURCES,
  TELETRABAJO_VERIFIED_AT,
  teletrabajoArticulosCitados,
  teletrabajoPlazosConNumero,
} from '../../utils/teletrabajo'

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

  it('la desconexión cita las DOS normas, que es donde está escrita dos veces', () => {
    const desconexion = TELETRABAJO_PLAZOS.find(plazo => /desconexión/i.test(plazo.concepto))!
    expect(desconexion.articulo).toMatch(/Ley 19\.978, art\. 8/)
    expect(desconexion.articulo).toMatch(/Decreto 86\/022, art\. 9/)
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
  })

  it('enumera los cinco costos del equipo que el decreto pone del lado del empleador', () => {
    const costos = TELETRABAJO_OBLIGACIONES.find(o => /mantenerlo andando/i.test(o.titular))!
    for (const costo of [
      'Instalación',
      'operación',
      'funcionamiento',
      'reemplazo',
      'mantenimiento',
    ]) {
      expect(costos.detalle, costo).toContain(costo)
    }
    expect(costos.articulo).toMatch(/Decreto 86\/022, art\. 8/)
  })

  it('dice que lo provisto no es salario ni materia gravada, que es la parte de plata', () => {
    const gravada = TELETRABAJO_OBLIGACIONES.find(o => /no es sueldo/i.test(o.titular))!
    expect(gravada.detalle).toMatch(/no se consideran salario ni materia gravada/)
    expect(gravada.articulo).toMatch(/Ley 19\.978, art\. 12/)
  })

  it('manda el accidente en casa a la Ley 16.074, no a una conclusión propia', () => {
    const accidente = TELETRABAJO_OBLIGACIONES.find(o => /accidente/i.test(o.titular))!
    expect(accidente.detalle).toMatch(/Ley 16\.074/)
    expect(accidente.articulo).toMatch(/Ley 19\.978, art\. 13/)
  })
})

describe('lo que el trabajador puede negarse a hacer', () => {
  it('arranca por la voluntariedad, que es el eje del régimen', () => {
    expect(TELETRABAJO_DERECHOS[0]!.derecho).toMatch(/consentimiento/i)
    expect(TELETRABAJO_DERECHOS[0]!.articulo).toMatch(/Ley 19\.978, art\. 3/)
  })

  it('cada derecho lleva su artículo', () => {
    for (const derecho of TELETRABAJO_DERECHOS) {
      expect(derecho.articulo, derecho.derecho.slice(0, 40)).toMatch(
        /(Ley 19\.978|Decreto 86\/022), art\. \d+/
      )
    }
  })

  it('incluye que no se puede sancionar por no responder en la desconexión', () => {
    const sancion = TELETRABAJO_DERECHOS.find(d => /sancionar/i.test(d.derecho))!
    expect(sancion.articulo).toMatch(/Decreto 86\/022, art\. 9/)
  })
})

describe('el contenido mínimo del acuerdo', () => {
  it('son los siete puntos que enumera el art. 3 del decreto', () => {
    expect(TELETRABAJO_ACUERDO).toHaveLength(7)
    expect(TELETRABAJO_ACUERDO.join(' ')).toMatch(/voluntaria/)
    expect(TELETRABAJO_ACUERDO.join(' ')).toMatch(/desconexión/)
    expect(TELETRABAJO_ACUERDO.join(' ')).toMatch(/herramientas informáticas/)
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
    // Es el punto entero de la página: afuera se afirma que la empresa paga UTE y ninguna de las
    // dos normas nombra la factura. Si alguien borra esta aclaración, el test cae.
    expect(luz.answer).toMatch(/ni el Decreto 86\/022 nombran la factura/i)
    expect(luz.answer).toMatch(/"servicios"/)
  })

  it('aclara que el exceso diario no es hora extra, que es la trampa de la jornada', () => {
    const extra = TELETRABAJO_FAQ.find(item => /horas extras/i.test(item.question))!
    expect(extra.answer).toMatch(/no constituye trabajo extraordinario/i)
    expect(extra.answer).toMatch(/misma semana/)
    expect(extra.answer).toMatch(/100 %/)
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
    expect(articulos).toContain('Ley 19.978 art. 12')
    expect(articulos).toContain('Decreto 86/022 art. 9')
    expect(articulos.length).toBeGreaterThanOrEqual(8)
    // Ordenado y sin repetidos: es lo que hace que el número de la página sea estable.
    expect(articulos).toEqual([...new Set(articulos)].sort())
  })
})
