import { describe, expect, it } from 'vitest'

import {
  WAGE_BEYOND_MINIMUM,
  WAGE_INDUSTRY_GROUPS,
  WAGE_LOOKUP_STEPS,
  WAGE_SMN_IS_NOT_YOUR_MINIMUM,
  WAGE_FAQ,
  WAGE_LAYERS,
  WAGE_SOURCES,
} from '../../utils/wageCouncils'

describe('la confusión que la página corrige', () => {
  it('deja escrito que el SMN no es tu mínimo', () => {
    expect(WAGE_SMN_IS_NOT_YOUR_MINIMUM).toMatch(/no tu m[ií]nimo/i)
    expect(WAGE_SMN_IS_NOT_YOUR_MINIMUM).toMatch(/laudo/i)
    expect(WAGE_SMN_IS_NOT_YOUR_MINIMUM.length).toBeGreaterThan(150)
  })

  it('explica las tres capas en orden', () => {
    expect(WAGE_LAYERS.map(l => l.n)).toEqual([1, 2, 3])
    expect(WAGE_LAYERS.map(l => l.label)).toEqual(['Grupo', 'Subgrupo', 'Categoría'])
  })

  // El error que hace que alguien busque en el grupo equivocado.
  it('aclara que el grupo lo define la actividad de la empresa, no la tarea', () => {
    const grupo = WAGE_LAYERS.find(l => l.label === 'Grupo')!
    expect(grupo.detail).toMatch(/EMPRESA/)
    expect(grupo.detail).toMatch(/no tu tarea/i)
  })
})

describe('el método de búsqueda', () => {
  it('tiene los cuatro pasos numerados', () => {
    expect(WAGE_LOOKUP_STEPS.map(s => s.n)).toEqual([1, 2, 3, 4])
    for (const s of WAGE_LOOKUP_STEPS) expect(s.detail.length).toBeGreaterThan(40)
  })

  it('los pasos con enlace apuntan al MTSS', () => {
    const linked = WAGE_LOOKUP_STEPS.filter(s => s.url)
    expect(linked.length).toBeGreaterThanOrEqual(2)
    for (const s of linked) {
      expect(s.url).toMatch(/^https:\/\/www\.gub\.uy\/ministerio-trabajo-seguridad-social\//)
    }
  })

  // La salida cuando el laudo no aparece: el MTSS asesora gratis.
  it('el último paso ofrece la consulta gratuita del MTSS', () => {
    const last = WAGE_LOOKUP_STEPS[WAGE_LOOKUP_STEPS.length - 1]
    expect(last.title).toMatch(/gratis/i)
    expect(last.url).toMatch(/consultas-laborales-salariales/)
  })
})

describe('grupos publicados', () => {
  const names = () => WAGE_INDUSTRY_GROUPS.map(g => g.name)

  // El listado del MTSS va paginado de a 10 y son 20. Publicar sólo la página 1 dejaba afuera
  // justo las ramas donde trabaja el lector típico, y con el disclaimer puesto le afirmaba que
  // su rama no estaba en esta categoría. Esta aserción hubiera fallado con las 10 de antes.
  it('lista los VEINTE de industria y comercio, no sólo la primera página del MTSS', () => {
    expect(WAGE_INDUSTRY_GROUPS).toHaveLength(20)
  })

  // Las de la página 2, que eran las que faltaban: son las de mayor población empleada.
  it('incluye las ramas de la segunda página del listado', () => {
    expect(names()).toContain('Hoteles, restoranes y bares')
    expect(names()).toContain('Servicios de salud y anexos')
    expect(names()).toContain('Comercio minorista de la alimentación')
    expect(names()).toContain('Transporte y almacenamiento')
    expect(names()).toContain('Servicios de enseñanza')
  })

  it('mantiene las de la primera página', () => {
    expect(names()).toContain('Comercio en general')
    expect(names().some(g => /construcci[oó]n/i.test(g))).toBe(true)
  })

  // El número es dato del MTSS, no el índice del array: la página lo renderiza desde `g.n`.
  // Antes salía de `i + 1` y coincidía de casualidad porque el listado se cortaba justo en el 10.
  it('cada grupo trae su número oficial, correlativo del 1 al 20', () => {
    expect(WAGE_INDUSTRY_GROUPS.map(g => g.n)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1))
  })

  // Se buscan por nombre exacto en el listado del MTSS: una paráfrasis manda al lector a la nada.
  // «del medicamento» estaba borrado del grupo 7, que es donde lo busca quien trabaja en farma.
  it('transcribe los nombres oficiales, sin parafrasear', () => {
    const byN = (n: number) => WAGE_INDUSTRY_GROUPS.find(g => g.n === n)!.name
    expect(byN(7)).toBe(
      'Industria química, del medicamento, farmacéutica, de combustibles y anexos'
    )
    expect(byN(8)).toBe('Industria de productos metálicos, maquinarias y equipo')
    expect(byN(4)).toBe('Industria Textil')
    expect(byN(19)).toBe(
      'Servicios profesionales, técnicos, especializados y aquellos no incluidos en otros grupos'
    )
  })

  it('no hay grupos duplicados ni vacíos', () => {
    expect(new Set(names()).size).toBe(WAGE_INDUSTRY_GROUPS.length)
    expect(new Set(WAGE_INDUSTRY_GROUPS.map(g => g.n)).size).toBe(WAGE_INDUSTRY_GROUPS.length)
    for (const g of WAGE_INDUSTRY_GROUPS) expect(g.name.trim().length).toBeGreaterThan(4)
  })
})

describe('qué más da el laudo', () => {
  it('enumera lo que se suele dejar sin reclamar', () => {
    expect(WAGE_BEYOND_MINIMUM.length).toBeGreaterThanOrEqual(5)
    expect(WAGE_BEYOND_MINIMUM.join(' ')).toMatch(/prima|antig[üu]edad/i)
    expect(WAGE_BEYOND_MINIMUM.join(' ')).toMatch(/licencia/i)
  })
})

describe('hablar del sueldo con un compañero', () => {
  const faq = () =>
    WAGE_FAQ.find(f => /hablar del sueldo/i.test(f.question) && /sancionar/i.test(f.question))!

  it('está en el FAQ', () => {
    expect(faq()).toBeDefined()
  })

  // La respuesta es un NEGATIVO. Si no se dice que no hay norma, el vacío se lee como prohibición.
  it('publica la ausencia de norma, no una prohibición', () => {
    const a = faq().answer
    expect(a).toMatch(/no existe en Uruguay ninguna norma que proh[ií]ba/i)
    expect(faq().short).toMatch(/no hay norma/i)
  })

  // El deber de reserva del art. 4 es otro, y confundirlos da la respuesta contraria: no alcanza
  // a lo que cobra el trabajador.
  it('acota la reserva de la Ley 18.566 a la información entregada para negociar', () => {
    const a = faq().answer
    expect(a).toMatch(/Ley 18\.566/)
    expect(a).toMatch(/art[ií]culo 4/i)
    expect(a).toMatch(/no sobre lo que vos cobr[aá]s/i)
  })

  // Decía «la única reserva que la ley impone sobre información salarial». Es una afirmación
  // exhaustiva sobre todo el ordenamiento que ninguna fuente sostiene, y tiene contraejemplo.
  it('no afirma que esa sea la ÚNICA reserva del ordenamiento', () => {
    expect(faq().answer).not.toMatch(/[úu]nica reserva/i)
  })

  // El contraejemplo, con su artículo: alcanza a quien maneja el dato ajeno, no al propio sueldo.
  it('distingue el secreto de quien liquida sueldos ajenos (Ley 18.331, artículo 11)', () => {
    const a = faq().answer
    expect(a).toMatch(/Ley 18\.331/)
    expect(a).toMatch(/art[ií]culo 11/i)
    expect(a).toMatch(/secreto profesional/i)
  })

  // Publicaba «sancionarte requiere una falta real y proporcionada, y probarla le toca al
  // empleador» en modo categórico y sin artículo, en un módulo donde todo lo legal va con norma.
  // No está codificado: se publica la ausencia y de dónde salen esos límites.
  it('no publica el estándar disciplinario como si fuera texto legal', () => {
    const a = faq().answer
    expect(a).toMatch(/no est[áa] reglamentado por ley/i)
    expect(a).toMatch(/doctrina y la jurisprudencia/i)
    expect(a).not.toMatch(/Sancionarte requiere una falta real y proporcionada/i)
    expect(faq().short).not.toMatch(/exige una falta real/i)
  })

  // El sitio ya enseña (guía de tolerancia) que reglamento, contrato y convenio SÍ obligan.
  // Decir «política de empresa, no obligación legal» a secas dejaba al lector creyendo que la
  // cláusula firmada no lo alcanza.
  it('reconcilia con el resto del sitio: sin ley puede haber igual obligación contractual', () => {
    const a = faq().answer
    expect(a).toMatch(/contrato/i)
    expect(a).toMatch(/reglamento interno/i)
    expect(a).toMatch(/convenio colectivo/i)
    expect(a).toMatch(/proporcionada/i)
    expect(a).not.toMatch(/pol[ií]tica de empresa, no obligaci[oó]n legal/i)
  })

  it('engancha la represalia con la Ley 17.940 y con la denuncia ante el MTSS', () => {
    const a = faq().answer
    expect(a).toMatch(/Ley 17\.940/)
    expect(a).toMatch(/libertad sindical/i)
    expect(a).toMatch(/Inspecci[oó]n General del Trabajo/i)
  })

  // Los dos requisitos que hacen rebotar la denuncia si no se saben de antemano.
  it('avisa que la denuncia pide vínculo vigente e infracción en curso, y no es anónima', () => {
    const a = faq().answer
    expect(a).toMatch(/v[ií]nculo laboral vigente/i)
    expect(a).toMatch(/est[eé] ocurriendo/i)
    expect(a).toMatch(/no es an[oó]nima/i)
  })
})

describe('cuánto gana un cargo público', () => {
  const faq = () => WAGE_FAQ.find(f => /cargo p[uú]blico/i.test(f.question))!

  it('está en el FAQ y remite a dónde se consulta', () => {
    expect(faq()).toBeDefined()
    expect(faq().question).toMatch(/d[oó]nde se consulta/i)
  })

  it('apoya la obligación en la Ley 18.381 y el Decreto 232/010', () => {
    const a = faq().answer
    expect(a).toMatch(/Ley 18\.381/)
    expect(a).toMatch(/Decreto 232\/010/)
    expect(a).toMatch(/art[ií]culo 38/i)
  })

  it('nombra los canales concretos', () => {
    const a = faq().answer
    expect(a).toMatch(/transparencia/i)
    expect(a).toMatch(/Uruguay Concursa/)
    expect(a).toMatch(/UAIP/)
  })

  // El art. 15 pone TRES condiciones a la prórroga y se publicaban dos. Sin «circunstancias
  // excepcionales» la prórroga parece de libre disposición del organismo, y es justo la condición
  // que le da argumento a quien reclama por vencimiento del plazo.
  it('publica las tres condiciones de la prórroga del artículo 15, no dos', () => {
    const a = faq().answer
    expect(a).toMatch(/veinte d[ií]as|20 d[ií]as/i)
    expect(a).toMatch(/razones fundadas/i)
    expect(a).toMatch(/por escrito/i)
    expect(a).toMatch(/circunstancias excepcionales/i)
  })

  // ACÁ SE INVIRTIÓ UN DATO VERDADERO Y ESTE TEST LO SOSTUVO: uruguayconcursa.gub.uy es una SPA
  // Angular y curl sobre /llamado/<id> devuelve un shell de 699 bytes. Eso prueba que no hay SSR,
  // NO que el dato falte. Renderizadas con navegador el 2026-08-10, las fichas traen «Retribución»
  // como campo de «Información General»: /llamado/853 (Nº 0040/2013, MGAP) y el llamado abierto
  // /llamado/42478 (Nº 0044/2026, MEF-Catastro). Publicar que el monto «no está en la ficha del
  // portal» mandaba al lector a rastrear un PDF ignorando el campo que tenía delante, y era la
  // única pregunta de la página donde SÍ hay un monto oficial publicado. Los dos canales existen:
  // la respuesta tiene que nombrar los dos. Si esto vuelve a invertirse, se rompe acá.
  it('dice que la retribución está en la ficha del llamado Y en las bases adjuntas', () => {
    const a = faq().answer
    // El canal que se había negado, con el ancla verificable: el campo vive en «Información General».
    expect(a).toMatch(/ficha del llamado/i)
    expect(a).toMatch(/publica la retribuci[oó]n/i)
    expect(a).toMatch(/Informaci[oó]n General/)
    // El otro canal, que sigue siendo cierto (ejemplo FGN: el desglose va en un anexo de bases).
    expect(a).toMatch(/bases/i)
    expect(a).toMatch(/anexo/i)
    // Por qué igual no republicamos el importe: el campo viene fechado a valores de otro momento.
    expect(a).toMatch(/fecha de valores/i)
    // Las dos redacciones falsas, palabra por palabra, para que no puedan volver.
    expect(a).not.toMatch(/no en la ficha del portal/i)
    expect(a).not.toMatch(/hay que buscarlo en el documento de bases/i)
  })

  // El atajo que la gente busca y que no sirve: hay que decirlo o lo van a buscar igual.
  it('desmiente que el Registro de Vínculos con el Estado sirva para esto', () => {
    const a = faq().answer
    expect(a).toMatch(/Registro de V[ií]nculos con el Estado/i)
    expect(a).toMatch(/no registra remuneraciones/i)
  })

  it('mantiene el recorte del módulo: canal sí, monto por cargo no', () => {
    expect(faq().answer).toMatch(/no publicamos montos por cargo/i)
  })
})

describe('integridad', () => {
  it('el FAQ arranca por la pregunta tal como se hace', () => {
    expect(WAGE_FAQ[0].question).toMatch(/cu[aá]nto/i)
  })

  it('cada pregunta tiene respuesta corta y desarrollo', () => {
    expect(WAGE_FAQ.length).toBeGreaterThanOrEqual(8)
    for (const f of WAGE_FAQ) {
      expect(f.question.endsWith('?')).toBe(true)
      expect(f.answer.length).toBeGreaterThan(120)
      expect(f.short.length).toBeGreaterThan(20)
    }
  })

  it('no hay preguntas repetidas', () => {
    expect(new Set(WAGE_FAQ.map(f => f.question)).size).toBe(WAGE_FAQ.length)
  })

  // Publicar tablas de laudos sería dato viejo garantizado; la página publica el método. Lo mismo
  // vale para los sueldos públicos: publicamos el canal, nunca el monto.
  it('no publica importes, ni de laudos ni de cargos del Estado', () => {
    const all = [
      ...WAGE_FAQ.map(f => f.answer),
      ...WAGE_FAQ.map(f => f.short),
      ...WAGE_BEYOND_MINIMUM,
      WAGE_SMN_IS_NOT_YOUR_MINIMUM,
    ].join(' ')
    expect(all).not.toMatch(/\$\s?\d{1,3}[.,]\d{3}/)
    expect(all).not.toMatch(/\$/)
    expect(all).not.toMatch(/\bpesos\b/i)
  })

  // Se aflojó de «sólo MTSS» a «sólo Estado uruguayo» al sumar IMPO, UAIP, ONSC y MEF: lo que no
  // se afloja es que ninguna cita salga de una fuente que no sea oficial.
  it('toda fuente es oficial uruguaya, y el MTSS sigue estando', () => {
    expect(WAGE_SOURCES.length).toBeGreaterThanOrEqual(3)
    for (const s of WAGE_SOURCES) {
      expect(s.url).toMatch(/^https:\/\/(www\.impo\.com\.uy|(?:[a-z-]+\.)*gub\.uy)\//)
      expect(s.label.length).toBeGreaterThan(10)
    }
    const mtss = WAGE_SOURCES.filter(s => s.url.includes('ministerio-trabajo-seguridad-social'))
    expect(mtss.length).toBeGreaterThanOrEqual(3)
  })

  it('no hay URLs de fuente duplicadas', () => {
    expect(new Set(WAGE_SOURCES.map(s => s.url)).size).toBe(WAGE_SOURCES.length)
  })

  // Cada norma que el FAQ cita tiene que tener su enlace en la lista de fuentes, o el lector no
  // puede contrastarla: los textos del FAQ se renderizan planos, sin links.
  it('cada norma citada en el FAQ tiene su enlace en las fuentes', () => {
    const urls = WAGE_SOURCES.map(s => s.url).join(' ')
    const texto = WAGE_FAQ.map(f => f.answer).join(' ')
    const normas: [RegExp, string][] = [
      [/Ley 17\.940/, 'leyes/17940-2006'],
      [/Ley 18\.566/, 'leyes/18566-2009'],
      [/Ley 18\.331/, 'leyes/18331-2008'],
      [/Ley 16\.045/, 'leyes/16045-1989'],
      [/Ley 18\.381/, 'leyes/18381-2008'],
      [/Decreto 232\/010/, 'decretos/232-2010'],
    ]
    for (const [mencion, slug] of normas) {
      if (mencion.test(texto)) expect(urls).toContain(slug)
    }
  })
})
