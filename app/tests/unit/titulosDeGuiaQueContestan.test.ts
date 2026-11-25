import { describe, expect, it } from 'vitest'
import { getGuide } from '../../utils/guides'

/**
 * Los títulos de guía que NOMBRABAN el tema mientras su propia descripción ya traía la respuesta.
 * Cinco el 2026-11-20, tres más el 2026-11-25 (su nota está junto a sus filas).
 *
 * POR QUÉ FALTABA ESTE ARREGLO, Y POR QUÉ NO ERA UN DESCUIDO. Las once tandas de snippet de
 * octubre se eligieron por PRESUPUESTO: `guideSnippetBudget.test.ts` lista las guías pasadas de 60
 * caracteres de título o de 155 de descripción, y esas listas fueron la cola de trabajo («la tanda
 * salió de las 64 libres, por mayor sobrante total»). El criterio funcionó —los dos pozos están
 * pagados— pero no puede ver a una guía cuyo título ENTRA en el presupuesto y no contesta nada: no
 * sobra ni un carácter, así que nunca aparece en ninguna lista. Las cinco de acá llegaron a su
 * descripción por esa misma cola —las filas `descripciones-de-las-guias-respuesta-primero` (1/10) y
 * `-2` (7/10)— y salieron de ella con la respuesta adelante en la descripción y el título intacto,
 * que es el renglón sobre el que se hace clic. Es el mismo modo de fallar que
 * `seoDescriptionBudget.test.ts` se anotó el 2026-11-02: no una medición en rojo, una medición que
 * no alcanza a la página.
 *
 * QUÉ FIJA ESTE ARCHIVO. No que el título «conteste» —eso no es mecanizable y una lista de deuda
 * con falsos positivos es peor que ninguna—, sino que la respuesta que el título publica siga
 * siendo la que la guía afirma en su propio cuerpo. Es el contrapeso que `rentAdjustment.test.ts`
 * le pone al coeficiente literal de `/coeficiente-de-reajuste-de-alquileres-uruguay`: una cifra en
 * el título es una cifra que puede envejecer en silencio, y acá el único ancla honesto es el texto
 * de la misma página. Si alguien reescribe el cuerpo y la respuesta cambia, el título se cae con
 * él en vez de quedar mintiendo en el SERP.
 *
 * EL TÍTULO NO ES SÓLO EL RENGLÓN DEL SERP. `guide.title` es también el H1 de
 * `pages/guias/[slug].vue`, el og:title/twitter:title, la imagen OG, el texto de compartir y el
 * `name` del JSON-LD: cambiarlo cambia todo eso. Por eso dos de los cinco conservan al frente la
 * consulta con la que la guía YA tenía impresiones («herederos forzosos», «licencia y salario
 * vacacional»): sacarla del título y del H1 a la vez arriesgaba justo la posición que trae la
 * muestra. Y cada afirmación del título se cita en la tarjeta de Fuentes de su guía (la norma o el
 * operador), no sólo en el cuerpo.
 *
 * El largo no se mide acá: lo mide `guideSnippetBudget.test.ts` sobre las 154 guías, con la marca
 * incluida (`rendered()` suma « | Cambio Uruguay», o sea 17 caracteres, así que el techo real del
 * título del catálogo es 43).
 */
const textoDe = (slug: string) => {
  const guia = getGuide(slug)
  expect(guia, `falta la guía ${slug}`).toBeDefined()
  const g = guia!
  const partes = [g.description, ...g.sections.flatMap(s => [s.heading, s.body])]
  for (const faq of g.faqs ?? []) partes.push(faq.q, faq.a)
  for (const step of g.steps ?? []) partes.push(step.name, step.text)
  return partes.join('\n')
}

/**
 * Por guía: el título que se publica hoy, el que nombraba el tema y no contestaba, y las marcas
 * que la respuesta del título tiene que seguir teniendo en el cuerpo.
 *
 * SÓLO PUEDE CRECER. Sacar una fila de acá es devolverle a una guía el título que anunciaba en vez
 * de contestar, y además apaga el control que ata su respuesta al cuerpo.
 */
const TITULOS = [
  {
    slug: 'alquilar-sin-garantia-uruguay',
    titulo: 'Alquilar sin garantía: seguro, ANDA o LUC',
    nombrabaElTema: 'Cómo alquilar sin garantía en Uruguay',
    respaldo: [/seguro de fianza/i, /ANDA/, /Ley de Urgente Consideración/i],
    fuente: 'https://www.impo.com.uy/bases/leyes/19889-2020/421',
  },
  {
    slug: 'legitima-y-herederos-forzosos-uruguay',
    // «Herederos forzosos» se queda al frente: es la consulta con la que la guía ya rankea
    // (posición ~5 en «herederos forzosos uruguay», ~4 en «heredero forzoso»).
    titulo: 'Herederos forzosos: legítima 1/2, 2/3 o 3/4',
    nombrabaElTema: 'Legítima y herederos forzosos en Uruguay',
    respaldo: [/la mitad del patrimonio/i, /dos tercios/i, /tres cuartos/i, /herederos forzosos/i],
    fuente: 'https://www.impo.com.uy/bases/codigo-civil/16603-1994/887',
  },
  {
    slug: 'hay-impuesto-a-la-herencia-uruguay',
    titulo: 'No hay impuesto a la herencia: sí el ITP',
    nombrabaElTema: '¿Hay impuesto a la herencia en Uruguay?',
    respaldo: [/no hay un impuesto sucesorio o a la herencia/i, /\bITP\b/],
    // La nota de IMPO sobre la Ley 12.804: el Impuesto a las Herencias, Legados y Donaciones lo
    // derogó el Decreto Ley 14.252 (art. 318, 1974). Lo que queda es el ITP por causa de muerte.
    fuente: 'https://www.impo.com.uy/bases/leyes/12804-1960/147',
  },
  {
    slug: 'licencia-y-salario-vacacional-uruguay',
    // «Licencia y salario vacacional» se queda: las consultas donde la guía entra al top 10 son
    // las de «salario vacacional y licencia es lo mismo». «Base» porque los 20 días son el mínimo
    // (Ley 12.590 art. 1) y la antigüedad suma más (art. 2), que la descripción explica.
    titulo: 'Licencia y salario vacacional: 20 días base',
    nombrabaElTema: 'Licencia y salario vacacional en Uruguay',
    respaldo: [/veinte días como mínimo/i, /cada cuatro años/i],
    fuente: 'https://www.impo.com.uy/bases/leyes/12590-1958/1',
  },
  {
    slug: 'elegir-o-cambiar-de-afap-uruguay',
    titulo: 'Cambiar de AFAP: gratis, mirá la comisión',
    nombrabaElTema: 'Cómo elegir o cambiarte de AFAP en Uruguay',
    respaldo: [/trámite gratuito/i, /comisión de administración/i],
    fuente: 'https://www.rafap.com.uy/mvdcms/Contenidos/Traspaso-cambio-de-AFAP--uc1022',
  },
  // ---- Segunda tanda, 2026-11-25 ----
  //
  // Las TRES guías que quedaban con el defecto de arriba y la ruta libre de toda ventana de
  // medición abierta (`npm run seo_debt`: 13 libres de 32 en los quince pozos, y ninguna de esas
  // trece es una guía; estas tres no salen de un pozo porque, igual que las cinco de arriba,
  // ningún presupuesto puede verlas: los tres títulos entraban en los 60 caracteres).
  //
  // CÓMO SE ENCONTRARON. Mismo método que la primera tanda, mecanizado: de las 70 guías con la
  // ruta libre hoy, las que devuelven la consulta («Cómo…», «¿…?») o cierran con la etiqueta del
  // tema («… en Uruguay», «… cómo funciona») Y además tienen tarjeta de Fuentes, porque sin texto
  // primario que citar el título no se puede mover sin inventarle respaldo a una afirmación
  // nueva. Dieron ocho; cuatro no tienen `sources` (`plazo-fijo-en-uruguay-conviene`,
  // `bonos-y-renta-fija-uruguay`, `conviene-ahorrar-en-dolares-uruguay` y
  // `facturar-como-freelancer-uruguay`, las cuatro evergreen de julio) y quedan pendientes de que
  // alguien las documente; la quinta, `costos-de-tener-auto-uruguay`, ya contesta
  // («…: depreciación») y era un falso positivo de la heurística.
  //
  // SÓLO EL TÍTULO. Las tres descripciones ya abren por la respuesta y entran en 155, así que no
  // se tocan: es la misma decisión que `titulos-de-las-guias-respuesta-primero-5` (9/10). Y
  // ninguna afirmación es nueva: las tres salen del cuerpo de su propia guía, que es la regla que
  // la nota de arriba dejó escrita.
  {
    slug: 'como-saber-si-tengo-deudas-uruguay',
    // El título devolvía la consulta entera y la página contesta que la respuesta es una lista y
    // no un lugar. Los dos registros que reúnen a muchos acreedores van al título —nombre propio
    // adelante, que es la regla medida del sitio— y el «no hay un registro único» se queda en la
    // descripción, donde ya estaba: repetirlo en los dos renglones gastaría el del título en algo
    // que el SERP ya publica dos líneas más abajo.
    titulo: 'Deudas: Central de Riesgos y Clearing',
    nombrabaElTema: 'Cómo saber si tengo deudas en Uruguay',
    respaldo: [
      /Ningún organismo junta todas las deudas de una persona/i,
      /Central de Riesgos del Banco Central/i,
      /Clearing de Informes/i,
    ],
    fuente: 'https://subsitio.bcu.gub.uy/central-de-riesgos/',
  },
  {
    slug: 'como-pedir-un-aumento-de-sueldo-uruguay',
    // «Aumento de sueldo» se queda al frente: es la consulta de la guía. Lo que cambia es el
    // resto del renglón, que repetía «cómo pedir» —o sea el verbo que el lector ya escribió— en
    // lugar de la respuesta que la guía da en su primera sección: antes de pedir hay un piso que
    // no se negocia con el jefe, se consulta, y por debajo de él la diferencia se reclama.
    titulo: 'Aumento de sueldo: primero mirá el laudo',
    nombrabaElTema: 'Cómo pedir un aumento de sueldo en Uruguay',
    respaldo: [
      /fijar el monto mínimo de los salarios por categoría laboral/i,
      /por debajo del laudo de tu categoría/i,
      /Consejos de Salarios/,
    ],
    fuente: 'https://www.impo.com.uy/bases/leyes/10449-1943/5',
  },
  {
    slug: 'jubilacion-y-afap-como-funciona-uruguay',
    // «Jubilación y AFAP» se queda; «cómo funciona» era la etiqueta que anunciaba el índice. La
    // respuesta que publica ahora es la del cuerpo y la del FAQ que encabeza la página («¿Me está
    // entrando plata a una AFAP?»), y es deliberadamente SIN cantidad: el cuerpo dice «el caso de
    // la enorme mayoría» como aside y la guía no cita ninguna estadística de cuántos son, así que
    // un título con «la mayoría» publicaría una cifra sin fuente. La condición entera (antes de
    // diciembre de 2023, bajo el tope A y sin la opción del art. 8) la completa la descripción.
    titulo: 'Jubilación y AFAP: no a todos les entra',
    nombrabaElTema: 'Jubilación y AFAP en Uruguay: cómo funciona',
    respaldo: [
      /no significa que a todo el mundo le esté entrando plata a una AFAP/i,
      /aplicables exclusivamente/i,
      /tope A/,
    ],
    fuente: 'https://www.impo.com.uy/bases/leyes/20130-2023/22',
  },
] as const

describe('los títulos de guía que pasaron a contestar', () => {
  it.each(TITULOS.map(t => [t.slug, t] as const))(
    '%s publica el título nuevo y no vuelve al que nombraba el tema',
    (_slug, caso) => {
      const guia = getGuide(caso.slug)
      expect(guia, `falta la guía ${caso.slug}`).toBeDefined()
      expect(guia!.title).toBe(caso.titulo)
      expect(guia!.title).not.toBe(caso.nombrabaElTema)
    }
  )

  // La razón por la que este archivo existe: la respuesta del título tiene que estar afirmada en el
  // cuerpo de la misma guía. Ninguna cifra del título es nueva.
  it.each(TITULOS.map(t => [t.slug, t] as const))(
    '%s sostiene en su cuerpo la respuesta que publica en el título',
    (_slug, caso) => {
      const texto = textoDe(caso.slug)
      for (const marca of caso.respaldo) expect(texto, `${caso.slug} ${marca}`).toMatch(marca)
    }
  )

  // Y la afirmación del título tiene que poder chequearse contra la norma o el operador: cada
  // guía cita en su tarjeta de Fuentes el texto primario que sostiene lo que el título publica.
  it.each(TITULOS.map(t => [t.slug, t] as const))(
    '%s cita en Fuentes el texto primario que sostiene el título',
    (_slug, caso) => {
      const urls = (getGuide(caso.slug)?.sources ?? []).map(s => s.url)
      expect(urls).toContain(caso.fuente)
    }
  )

  // Presupuesto del renglón: con « | Cambio Uruguay» (17) cada título entra en 60.
  it.each(TITULOS.map(t => [t.slug, t] as const))('%s entra en 43 caracteres', (_slug, caso) => {
    expect(caso.titulo.length).toBeLessThanOrEqual(43)
  })
})
