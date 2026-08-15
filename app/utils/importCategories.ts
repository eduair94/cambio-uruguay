// app/utils/importCategories.ts
// Catálogo de las páginas /importar/<categoria>: una ficha por tipo de artículo con lo que paga,
// el beneficio al que puede acceder, cómo hay que declararlo para que se lo apliquen, y qué
// trámite necesita antes de que Aduana lo libere.
//
// POR QUÉ VIVE ACÁ: la página sólo renderiza. Todo lo que afirma una cifra o una obligación es un
// dato con norma y URL, testeable en `app/tests/unit/importCategories.test.ts`, que falla si una
// categoría se queda sin fuente o si su `productTypeId` no existe en el catálogo del calculador.
//
// LOS MONTOS DEL RÉGIMEN NO SE DUPLICAN ACÁ (US$ 800, 3 envíos, 60%, mínimo US$ 20, 20 kg): salen
// de `~/utils/importRules`, que es efectivo-fechado y se alimenta de `/api/aduana`. Este módulo
// describe el TRATAMIENTO POR MERCADERÍA, que es lo que el régimen no resuelve solo.
//
// LA REGLA DE ORO: si una fuente oficial no lo dice, acá no se afirma. Varias fichas dicen
// explícitamente "la norma no lo resuelve" — eso es una respuesta, no un hueco.

import { IMPORT_PRODUCT_TYPES, type Organism } from './importProductTypes'

/** Una referencia primaria: norma, resolución o página oficial. */
export interface CategorySource {
  label: string
  url: string
  /** Qué se lee exactamente ahí, cuando el título no alcanza. */
  note?: string
}

/** Cómo le va a la mercadería en cada uno de los tres caminos posibles. */
export interface RegimeOutcome {
  /** Veredicto corto, para el chip/encabezado: «No paga nada», «60% del valor»… */
  verdict: string
  /** El detalle, con la norma que lo sostiene. */
  detail: string
  /** `good` conviene, `warn` se puede pero cuesta, `bad` no es una opción. */
  tone: 'good' | 'warn' | 'bad'
}

/** Un tributo concreto y qué le pasa a esta categoría. */
export interface CategoryTaxLine {
  concept: string
  /** Lo que se paga: «0% (exento)», «22%», «10%»… */
  value: string
  detail: string
  source?: CategorySource
}

/** Un beneficio o exoneración al que la categoría puede acceder. */
export interface CategoryBenefit {
  title: string
  detail: string
  /** Norma + artículo, tal como se cita al lector. */
  norm: string
  url: string
}

/** Trámite ante otro organismo, con el detalle operativo que la página promete. */
export interface CategoryProcedure {
  organism: Organism
  /** Cuándo hace falta de verdad (y cuándo no). */
  when: string
  /** Dónde y cómo se hace. */
  how: string
  url: string
}

/** Un paso del instructivo de declaración (se emite también como HowTo en JSON-LD). */
export interface DeclareStep {
  name: string
  text: string
}

/** La ficha completa de una categoría. */
export interface ImportCategory {
  /** Slug de la URL: /importar/<slug>. */
  slug: string
  /** Categoría equivalente en el calculador (`IMPORT_PRODUCT_TYPES`). */
  productTypeId: string
  /** H1 y <title>. */
  title: string
  /** Etiqueta corta para chips, listados y navegación. */
  navLabel: string
  /** Meta description y bajada. */
  description: string
  icon: string
  /** Qué entra en esta categoría, en las palabras del lector. */
  examples: string[]
  /** Qué NO entra, cuando la confusión es previsible. */
  notIncluded?: string[]
  /** El resultado por régimen: es la respuesta a «¿cuánto pago?». */
  regimes: {
    franquicia: RegimeOutcome
    prestacionUnica: RegimeOutcome
    general: RegimeOutcome
  }
  /** Tributo por tributo. */
  taxes: CategoryTaxLine[]
  /** Exoneraciones y ventajas a las que puede acceder. */
  benefits: CategoryBenefit[]
  /** Trámites ante otros organismos. */
  procedures?: CategoryProcedure[]
  /** Cómo declararlo para que le apliquen el tratamiento correcto. */
  declare: {
    intro: string
    steps: DeclareStep[]
    /** Los errores que hacen perder el beneficio. */
    pitfalls: string[]
  }
  /** Cosas a considerar antes de comprar. */
  considerations: string[]
  faqs: { q: string; a: string }[]
  sources: CategorySource[]
  /** Fecha en que se contrastó con las fuentes de arriba (YYYY-MM-DD). */
  verifiedAt: string
}

/**
 * El catálogo. Una ficha por categoría del calculador, generada a partir de la investigación
 * verificada y auditada contra fuente primaria (ver el encabezado de este archivo).
 *
 * El orden es editorial: primero lo que más se busca y lo que tiene un beneficio real que reclamar.
 */
export const IMPORT_CATEGORIES: ImportCategory[] = [
  {
    slug: 'libros',
    productTypeId: 'libros',
    title: 'Importar libros a Uruguay: exención total y cómo declararlo',
    navLabel: 'Libros',
    description:
      'Los libros están exonerados de todo tributo nacional y quedan fuera del tope de US$ 800: pedile al operador que declare el envío como J/01 y no como franquicia.',
    icon: 'mdi-book-open-variant',
    examples: [
      'Una novela comprada en Amazon',
      'Libros de texto y bibliografía para la facultad',
      'Revistas y folletos',
      'Catálogos de difusión de obras',
      'Material educativo: mapas, globos terráqueos, láminas escolares',
      'Reproducciones impresas de obras de arte',
    ],
    notIncluded: [
      'Los lectores electrónicos (Kindle, Kobo): el Decreto 220/998 art. 40-BIS los excluye expresamente y pagan 22%',
      'El material pornográfico: es la única exclusión expresa de la exoneración de IVA a libros',
      'CD, DVD, diapositivas, láminas o programas de ordenador cuyo contenido no sea exclusivamente pedagógico',
    ],
    regimes: {
      franquicia: {
        verdict: 'No la necesitás (y no consume cupo)',
        detail:
          'El Decreto 50/026 art. 4 inciso final saca a los libros del tope de monto, y la RG DNA 11/2026 num. 26 los exceptúa del num. 25 lit. b) V y VI, que es donde viven los US$ 800 anuales y los 3 envíos. En la declaración un libro no va como franquicia: va por el tipo de envío J, subcategoría 01.',
        tone: 'good',
      },
      prestacionUnica: {
        verdict: 'No corresponde pagarla',
        detail:
          'La prestación única del 60% es opcional: la Ley 20.446 art. 627 dice que el titular "podrá optar". La exoneración del libro es legal (Ley 15.913 art. 8 lit. C y Título 10 art. 41), así que no hay motivo para optar por ella. Ninguna norma, resolución ni FAQ dice si un libro puede ser gravado con el 60%: en ese punto la norma no lo resuelve.',
        tone: 'good',
      },
      general: {
        verdict: 'Exento igual, pero con DUA y despachante',
        detail:
          'Por encima de US$ 1.000 de factura la DNA aplica ese umbral como techo del canal postal y el envío pasa a despacho formal. La exoneración del art. 8 lit. C de la Ley 15.913 sigue existiendo: lo que cambia es el trámite, no el tributo. Ojo: ese umbral de US$ 1.000 es, por texto de la ley, la condición para que no sea preceptivo el despachante, no un tope de exoneración.',
        tone: 'warn',
      },
    },
    taxes: [
      {
        concept: 'IVA',
        value: '0% (exento)',
        detail:
          'El art. 38 num. 1 lit. H exonera "diarios, periódicos, revistas, libros y folletos de cualquier naturaleza, con excepción de los pornográficos", y agrega que también queda exento el material educativo. El num. 3 lit. B extiende esa exoneración a la importación de los mismos bienes.',
        source: {
          label: 'Título 10 T.O. 2023 art. 38',
          url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/38_T10',
        },
      },
      {
        concept: 'Mínimo de US$ 20 de IVA',
        value: 'No aplica',
        detail:
          'El piso de US$ 20 del régimen postal tiene una excepción expresa: no corre cuando el envío está integrado exclusivamente por bienes cuya importación está exonerada de IVA (Título 10 art. 13 lit. B inciso 3, agregado por la Ley 20.446 art. 660, repetido en la RG 11/2026 num. 27). "Exclusivamente" es estricto: alcanza con un producto gravado en la caja para perder la excepción.',
        source: {
          label: 'Título 10 T.O. 2023 art. 13',
          url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/13_T10',
        },
      },
      {
        concept: 'Arancel',
        value: '0% (exonerado)',
        detail:
          'La Ley del Libro 15.913 art. 8 lit. C) exonera la importación de obras literarias, artísticas, científicas, docentes y material educativo "de todo tributo nacional, incluidos los proventos, precios portuarios, recargos, tasa de movilización de bultos y demás gravámenes aduaneros". El Título 10 art. 41 dice lo mismo, en cualquier soporte, incluido el informático.',
        source: {
          label: 'Ley 15.913 (Ley del Libro)',
          url: 'https://www.impo.com.uy/bases/leyes/15913-1987',
        },
      },
      {
        concept: 'Tasa consular',
        value: '0% (exonerada)',
        detail:
          'La tasa consular es 5% sobre el valor en aduana (Ley 19.535 art. 265) y sus exoneraciones son taxativas, pero el art. 8 lit. C de la Ley 15.913 nombra expresamente las tasas consulares entre lo que la exoneración del libro alcanza.',
        source: {
          label: 'Ley 19.535 art. 265',
          url: 'https://www.impo.com.uy/bases/leyes/19535-2017/265',
        },
      },
      {
        concept: 'Prestación única (60%)',
        value: 'No corresponde',
        detail:
          'Es una opción del titular, no una liquidación automática: la ley dice que "podrá optar". Un libro se declara como envío exceptuado del pago de tributos (tipo J, subcategoría 01) según la RG 11/2026 num. 28 lit. c. Si un libro puede o no ser gravado con el 60%, ninguna norma, resolución ni FAQ lo dice.',
        source: {
          label: 'RG DNA 11/2026',
          url: 'https://www.aduanas.gub.uy/innovaportal/file/28447/1/rg-11_2026.pdf',
        },
      },
      {
        concept: 'IMESI',
        value: 'No aplica',
        detail:
          'El IMESI grava rubros taxativos del Título 11 (bebidas alcohólicas, tabacos, cosméticos y perfumería, vehículos automotores, lubricantes, entre otros). Los libros no están en la lista, así que tampoco los alcanza la exclusión absoluta del régimen postal que la Ley 20.446 art. 633 impone a la mercadería gravada por IMESI.',
        source: {
          label: 'Ley 20.446 art. 633',
          url: 'https://www.impo.com.uy/bases/leyes/20446-2025/633',
        },
      },
    ],
    benefits: [
      {
        title: 'Exoneración de todo tributo nacional, no sólo del IVA',
        detail:
          'La exoneración del libro no es una tasa reducida: cubre aranceles aduaneros, tasas consulares, proventos, precios portuarios, recargos y tasa de movilización de bultos. Y alcanza a todo tipo de soporte material de la obra.',
        norm: 'Ley 15.913 art. 8 lit. C) y Título 10 T.O. 2023 art. 41',
        url: 'https://www.impo.com.uy/bases/leyes/15913-1987',
      },
      {
        title: 'No consume el cupo de US$ 800 ni los 3 envíos',
        detail:
          'El decreto exceptúa el monto y la RG 11/2026 num. 26 exceptúa a los libros del numeral 25 lit. b) V, que es el que contiene los dos límites: hasta 3 envíos por año civil y US$ 800 anuales. En prosa, la DNA lo publica como ingreso "sin restricción de frecuencia en el año civil" mientras la factura no supere US$ 1.000.',
        norm: 'Decreto 50/026 art. 4 inciso final + RG DNA 11/2026 num. 26',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
      },
      {
        title: 'El piso de US$ 20 de IVA no muerde',
        detail:
          'Un envío integrado exclusivamente por libros está exonerado de IVA, y por eso queda fuera del mínimo de US$ 20 que sí paga cualquier otra compra chica. Si mezclás un libro con algo gravado, el envío entero pierde esa excepción.',
        norm: 'Título 10 art. 13 lit. B inciso 3 (Ley 20.446 art. 660) y RG 11/2026 num. 27',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/13_T10',
      },
      {
        title: 'Sin despachante hasta US$ 1.000 de factura',
        detail:
          'Para libros y material educativo que entren por correo internacional con factura de hasta US$ 1.000, la intervención del despachante no es preceptiva. Es la condición del inciso final del art. 8, agregado por la Ley 19.355 art. 228; la DNA, en cambio, lo publica como si fuera el techo del canal postal.',
        norm: 'Ley 15.913 art. 8 inciso final (Ley 19.355 art. 228)',
        url: 'https://www.impo.com.uy/bases/leyes/15913-1987',
      },
      {
        title: 'Los libros electrónicos también están exonerados',
        detail:
          'El Decreto 220/998 art. 40-BIS (agregado por el Decreto 440/012) exonera el libro electrónico, incluida la licencia de uso por período o a perpetuidad. Lo que no queda incluido son los dispositivos de lectura electrónica.',
        norm: 'Decreto 220/998 art. 40-BIS',
        url: 'https://www.impo.com.uy/bases/decretos/220-1998',
      },
      {
        title: 'Compromiso internacional de no gravar el libro',
        detail:
          'Uruguay aprobó por Ley 17.046 el Acuerdo de Florencia (UNESCO 1950) y su Protocolo de Nairobi (1976), que obligan a no gravar la importación de libros y material educativo. El instrumento se depositó el 20/4/1999.',
        norm: 'Ley 17.046',
        url: 'https://www.impo.com.uy/bases/leyes/17046-1998',
      },
    ],
    declare: {
      intro:
        'Acá está el dato que casi nadie te dice: un libro no se declara como franquicia. La RG DNA 11/2026 num. 28 lit. c define un campo "Tipo de envío" donde G es franquicia, H es prestación única (60%) y J son los envíos exceptuados del pago de tributos. Los libros van en J, subcategoría 01, "Material al amparo de la Ley N.º 15.913/87". El default del operador es G: si no pedís el J/01, el envío entra como franquicia y te consume cupo.',
      steps: [
        {
          name: 'Guardá la factura antes de que salga el paquete',
          text: 'Necesitás la factura original de compra, con el detalle que muestre que es un libro o material educativo y el valor total. La RG 11/2026 num. 26 exceptúa a los libros incluso del num. 25 lit. b) VI (la exigencia de que el envío vaya acompañado de la documentación de valor), pero igual la vas a querer: es lo que te ubica por debajo del umbral de US$ 1.000 y lo que mostrás si te retienen.',
        },
        {
          name: 'Pedile al operador postal o courier el tipo de envío J/01',
          text: 'El que declara ante la Aduana es el operador, no vos (Decreto 50/026 arts. 8 y 9). Escribile antes de que el envío llegue y pedí por escrito que se declare como tipo de envío J, subcategoría 01, "Material al amparo de la Ley N.º 15.913/87", y no como G (franquicia). Dejá el pedido documentado por mail o chat.',
        },
        {
          name: 'Si viene por Correo Uruguayo, declaralo vos primero en el formulario web',
          text: 'Entrá al formulario "Ahíva" con el tracking de 13 caracteres y datos idénticos a los de tu cédula. Sabé de antemano que el formulario público no tiene campo para invocar la exoneración del libro ni para poner NCM: sólo pregunta compra u obsequio, franquicia sí/no y medio de pago. No hay procedimiento oficial publicado que explique cómo una persona física reclama la exoneración en el flujo normal, así que si tenés dudas, reforzalo por el 0800 2108 del Correo y guardá constancia.',
        },
        {
          name: 'Registrá el rubro correcto, sin confundirlo con la exoneración',
          text: 'El Anexo del Decreto 50/026 (art. 9 lit. g) obliga a registrar cada envío en un rubro codificado, y uno de ellos es "Libros, revistas y material editorial". Ese rubro es estadístico y declarativo: elegirlo no te otorga la exoneración. La exoneración la da el tipo de envío J/01 más la Ley 15.913.',
        },
        {
          name: 'Si te llega liquidado o te lo declararon como franquicia, reclamá antes de pagar',
          text: 'No hay norma ni FAQ que diga si se puede cambiar el régimen después de presentada la declaración: es un hueco real. Escribile al operador señalando la RG 11/2026 num. 28 lit. c (tipo J/01) y el num. 26 (excepción a los 3 envíos y a los US$ 800). Si no te dan bola, la DNA atiende en info@aduanas.gub.uy y 2 915 00 07, de lunes a viernes de 9 a 17.',
        },
        {
          name: 'Si te lo retienen, ahí sí tenés un canal formal para invocarlo',
          text: 'El trámite de envío retenido es presencial y con agenda previa, y la documentación se lleva en papel. La RG 14/2026 num. 15 lit. k.iii permite optar por un régimen especial y adjuntar la documentación que lo acredite: llevá la factura impresa, el art. 8 lit. C de la Ley 15.913 y la RG 11/2026 num. 26. El almacenamiento durante la demora lo pagás vos.',
        },
        {
          name: 'Mirá el reloj',
          text: 'Tenés 30 días desde el ingreso al país para pagar tributos, si es que corresponden, y 90 días sin retirar del depósito antes de que se configure abandono no infraccional (Decreto 50/026 art. 14). El famoso plazo de "10 días desde la notificación de retención" no es un plazo legal: es la ventana tarifaria del cargo de gestión del Correo Uruguayo.',
        },
      ],
      pitfalls: [
        'Dejar que el operador declare G (franquicia) por default: te consume uno de los 3 envíos y el cupo en dólares, cuando el libro está exceptuado de los dos.',
        'Meter un libro y algo gravado en la misma caja: el envío deja de estar integrado "exclusivamente" por bienes exonerados y vuelve a correr el mínimo de US$ 20 de IVA.',
        'Comprar un Kindle o un Kobo pensando que va con el libro: el Decreto 220/998 art. 40-BIS excluye expresamente los dispositivos de lectura electrónica, que pagan 22%.',
        'Pasarse de US$ 1.000 de factura en un envío: la DNA lo saca del canal postal y pasás a DUA con despachante. Acordate de que el valor es el total de la factura, con todos los conceptos que figuren adicionados en ella.',
        'Pagar el 60% "para sacarlo rápido": la prestación única es una opción, no una obligación, y sobre un bien exonerado por ley no tiene sentido.',
        'Declarar de menos: la Ley 20.446 art. 632 castiga la subvaluación con una multa igual al doble de los tributos que debieron pagarse, y la reincidencia dentro de 12 meses te saca del régimen por 12 meses.',
        'Asumir que en el mostrador conocen la excepción: no está en la FAQ del MEF, ni en la FAQ de la DNA, ni en la página de Correo Uruguayo. Llevá impresa la RG 11/2026 num. 26.',
      ],
    },
    considerations: [
      'Qué cuenta como libro lo define la Ley 15.913 art. 3 (en la redacción del art. 296 de la Ley 20.212): toda obra científica, artística, literaria o de cualquier otra índole que constituya una publicación unitaria, en cualquier soporte susceptible de lectura, percepción auditiva o táctil. En caso de discusión, quien decide es la Comisión Nacional del Libro (art. 17), no la Aduana.',
      'Diarios, periódicos, comics, manga y libros usados quedan sin resolver: están cubiertos por la exoneración de IVA del art. 38 num. 1 lit. H, pero no aparecen nombrados en el art. 8 lit. C de la Ley 15.913 ni en la página de la DNA. Para el IVA estás cubierto; para el resto de los tributos, la norma no lo resuelve y no conviene darlo por hecho en ningún sentido.',
      'Hay contra-evidencia oficial que te van a citar en el mostrador: la noticia de la DNA del 28/04/2026 dice, sin mencionar la excepción, que "todos los envíos realizados al amparo del régimen de franquicias consumirán tanto el cupo anual en dólares como el cupo de los 3 envíos permitidos". La excepción vive en una resolución escaneada y en una página secundaria. Vas a tener que pelearla con el texto en la mano.',
      'El régimen tiene dos topes independientes: US$ 800 de valor de factura y 20 kg por envío. Lo que la RG 11/2026 num. 26 exceptúa es el num. 25 lit. b) V, donde están los US$ 800 y los 3 envíos; sobre el peso la norma no dice nada, así que conviene no llenar la caja de más.',
      'El valor es el total de la factura con todos los conceptos adicionados en ella (Decreto 50/026 art. 5). Si el vendedor te factura el envío en la misma línea, eso cuenta para el umbral de US$ 1.000.',
      'Material educativo tiene nómina propia (Decreto 220/998 art. 40): cuadernos, hojas para escritura de hasta 19×24 cm, hojas ilustradas para escolares, globos terráqueos, mapas, reproducciones impresas de obras de arte, obras pictóricas y esculturas. Carteles, planos, láminas, diapositivas, casetes, videocasetes, discos compactos, programas de ordenador y CD-ROM entran sólo si su contenido es exclusivamente pedagógico.',
      'La exoneración es de tributos y no dice nada de lo que cobra el operador: el almacenamiento durante la demora lo paga el destinatario, y el Correo Uruguayo cobra su cargo de gestión aparte.',
    ],
    faqs: [
      {
        q: '¿Comprar un libro me gasta uno de los 3 envíos del año?',
        a: 'Según la RG DNA 11/2026 num. 26, no. Esa resolución exceptúa el ingreso de libros de los requisitos del num. 25 lit. b) V, que es el numeral donde están los dos límites: hasta 3 envíos por año civil y US$ 800 anuales sumados. La propia DNA lo dice en prosa en su página de mercaderías con exoneraciones especiales: los libros amparados en la Ley 15.913 pueden ingresar "sin restricción de frecuencia en el año civil" mientras la factura no supere US$ 1.000. El problema es operativo, no jurídico: la excepción no aparece en la FAQ del MEF, ni en la FAQ general de la DNA, ni en la página de Correo Uruguayo, y una noticia oficial de la DNA del 28/04/2026 afirma lo contrario sin mencionarla.',
      },
      {
        q: 'Compré un libro de US$ 30 en Amazon. ¿Pago el mínimo de US$ 20 de IVA?',
        a: 'No, si en la caja hay sólo libros. El Título 10 art. 13 lit. B inciso 3, agregado por la Ley 20.446 art. 660, dice que el mínimo no se aplica cuando el envío está integrado exclusivamente por bienes cuya importación se encuentra exonerada de IVA, y la RG 11/2026 num. 27 lo repite. Los libros están exonerados por el art. 38 num. 1 lit. H. Ahora, "exclusivamente" es estricto: si en el mismo paquete viene un marcador, un póster o cualquier cosa gravada, el envío pierde la excepción y el piso vuelve a correr. Lo que sí podés terminar pagando son cargos del operador postal, que no son tributos.',
      },
      {
        q: '¿El Kindle entra con la exoneración del libro?',
        a: 'No. El Decreto 220/998 art. 40-BIS exonera el libro electrónico y hasta la licencia de uso por período o a perpetuidad, pero cierra con una frase expresa: no quedan incluidos los dispositivos de lectura electrónica. Un Kindle o un Kobo es electrónica de consumo y paga 22% de IVA por la regla residual. Al no estar exonerado, se declara como cualquier otra compra: franquicia (tipo de envío G), y ahí sí te consume cupo, o prestación única del 60% (tipo H), que es opcional.',
      },
      {
        q: '¿Qué pasa si el pedido de libros supera los US$ 1.000?',
        a: 'El umbral de US$ 1.000 de la Ley 15.913 art. 8 inciso final, agregado por la Ley 19.355 art. 228, es la condición para que la intervención del despachante no sea preceptiva cuando el material entra por correo internacional. No es un tope de exoneración: por encima, la exoneración de todo tributo nacional del art. 8 lit. C sigue existiendo. Lo que cambia es el trámite, porque la DNA aplica ese umbral como techo del canal postal, y arriba pasás a despacho formal con DUA y despachante. En la práctica, si podés, dividí la compra en varios envíos.',
      },
      {
        q: 'El courier ya declaró mi libro como franquicia. ¿Puedo cambiarlo?',
        a: 'La norma no lo resuelve. La RG DNA 14/2026, Anexo I num. 15 lit. k, obliga al declarante a determinar el régimen aduanero aplicable al envío, pero no hay norma ni FAQ que diga si esa opción se puede modificar después de presentada la declaración. Lo concreto: reclamale al operador citando la RG 11/2026 num. 28 lit. c, que define el tipo de envío J subcategoría 01 para material amparado en la Ley 15.913. Si el envío queda retenido, ahí sí tenés canal formal: la RG 14/2026 num. 15 lit. k.iii permite optar por un régimen especial y adjuntar la documentación que lo acredite, en trámite presencial con agenda previa.',
      },
      {
        q: '¿Un libro usado o un manga tienen el mismo tratamiento?',
        a: 'Para el IVA, sí: el art. 38 num. 1 lit. H exonera "libros y folletos de cualquier naturaleza" sin distinguir entre nuevo y usado, y la única exclusión expresa es el material pornográfico. Para el resto de los tributos hay que ser honesto: los libros usados y los comics no aparecen nombrados en el art. 8 lit. C de la Ley 15.913 ni en la página de la DNA, así que si alguien discute el encuadre en el J/01, la norma no lo resuelve. Quien define qué es libro a estos efectos es la Comisión Nacional del Libro, no la Aduana.',
      },
    ],
    sources: [
      {
        label: 'Título 10 T.O. 2023 art. 38 — exoneraciones de IVA (num. 1 lit. H, num. 3 lit. B)',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/38_T10',
        note: 'Exonera diarios, periódicos, revistas, libros y folletos, salvo pornográficos, y extiende la exoneración a la importación.',
      },
      {
        label: 'Título 10 T.O. 2023 art. 41 — importación de obras y material educativo',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/41_T10',
        note: 'Exonera de todo tributo nacional la importación de obras literarias, artísticas, científicas y docentes en cualquier soporte.',
      },
      {
        label: 'Ley 15.913 (Ley del Libro), arts. 3, 8 y 17',
        url: 'https://www.impo.com.uy/bases/leyes/15913-1987',
        note: 'Definición de libro, exoneración de todo tributo nacional incluidas tasas consulares y el umbral de US$ 1.000 para el despachante.',
      },
      {
        label: 'RG DNA 11/2026 (nums. 25, 26, 27 y 28 lit. c)',
        url: 'https://www.aduanas.gub.uy/innovaportal/file/28447/1/rg-11_2026.pdf',
        note: 'Tipos de envío G / H / J-01; excepción de los libros a los US$ 800 y a los 3 envíos; mínimo de US$ 20 de IVA y su excepción.',
      },
      {
        label: 'Decreto 50/026 (arts. 4, 5, 8, 9, 14 y Anexo art. 9 lit. g)',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
        note: 'Deja los libros fuera del tope de monto, define el valor declarable, quién declara, plazos y el rubro "Libros, revistas y material editorial".',
      },
      {
        label: 'Título 10 T.O. 2023 art. 13 — base del IVA y mínimo del régimen postal',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/13_T10',
        note: 'Inciso 3, agregado por la Ley 20.446 art. 660: el mínimo de US$ 20 no corre si el envío es exclusivamente de bienes exonerados.',
      },
      {
        label: 'Decreto 220/998 — reglamento del IVA (arts. 40 y 40-BIS)',
        url: 'https://www.impo.com.uy/bases/decretos/220-1998',
        note: 'Nómina de material educativo y exoneración del libro electrónico, con exclusión expresa de los dispositivos de lectura.',
      },
      {
        label: 'DNA — mercaderías con exoneraciones especiales',
        url: 'https://www.aduanas.gub.uy/innovaportal/v/28228/1/innova.front/',
        note: 'Publica el ingreso de libros "sin restricción de frecuencia en el año civil" hasta US$ 1.000 de factura. Atención: la página lleva fecha 09/01/2026, anterior al Decreto 50/026.',
      },
      {
        label: 'Ley 17.046 — Acuerdo de Florencia y Protocolo de Nairobi',
        url: 'https://www.impo.com.uy/bases/leyes/17046-1998',
        note: 'Compromiso internacional de no gravar la importación de libros y material educativo.',
      },
    ],
    verifiedAt: '2026-08-15',
  },
  {
    slug: 'celulares-y-radiofrecuencia',
    productTypeId: 'radiofrecuencia',
    title: 'Importar un celular a Uruguay: IVA, certificado URSEC y cómo declararlo',
    navLabel: 'Celulares y radio',
    description:
      'Un celular paga 22% de IVA y necesita certificado previo de URSEC en VUCE ($204 a $239, hasta 2 días hábiles); lo que sólo usa Wi-Fi o Bluetooth está exceptuado.',
    icon: 'mdi-cellphone-wireless',
    examples: [
      'Un celular comprado en Amazon o AliExpress',
      'Un router con módem celular (4G/5G)',
      'Un GPS de auto o de mano',
      'Un handy o walkie-talkie',
      'Una cámara de seguridad con chip celular',
      'Un dron que se comunica por radioenlace propietario',
      'Antenas y equipos que transmiten fuera de 2,4 y 5,8 GHz',
    ],
    notIncluded: [
      'Auriculares, mouse, smartwatch, joystick y cámaras que operen sólo en Wi-Fi o Bluetooth: no interviene URSEC',
      'Vaporizadores y cigarrillos electrónicos, incluidos los de tabaco calentado: importación prohibida',
      'Miras térmicas y de visión nocturna: sólo por empresas registradas ante el SMA',
      'Drones que se comunican por Wi-Fi o Bluetooth en 2,4/5,8 GHz: no necesitan URSEC',
    ],
    regimes: {
      franquicia: {
        verdict: 'IVA 22%, mínimo US$ 20',
        detail:
          'La franquicia exonera aranceles pero el IVA se sigue liquidando (Ley 20.446 art. 627 inc. 2). No hay ninguna norma que baje el IVA de la electrónica: corre la tasa básica del 22% del art. 34 del Título 10. En el régimen postal el IVA se calcula sobre el valor de factura o declaración de valor y no puede ser inferior a US$ 20 por envío (Ley 20.446 art. 660). El certificado de URSEC, cuando corresponde, se necesita igual.',
        tone: 'warn',
      },
      prestacionUnica: {
        verdict: '60% del valor, mínimo US$ 20',
        detail:
          'Es opcional: la ley dice que el titular "podrá optar" por pagarla, y sustituye toda la tributación de la importación. Para esta categoría es igual o peor que la franquicia, porque el 60% se aplica sobre la misma base sobre la que la franquicia aplica 22%; por debajo de US$ 33,33 las dos caen en el piso de US$ 20 y da lo mismo. No exime del certificado de URSEC.',
        tone: 'warn',
      },
      general: {
        verdict: 'Arriba de US$ 800 o 20 kg',
        detail:
          'Si el envío supera el valor de factura de US$ 800 o los 20 kg, sale del régimen postal y entra por despacho formal: valor en aduana CIF, arancel según NCM, tasa consular del 5% (3% con ACE N.º 18) e IVA sobre valor en aduana más arancel, suma que se incrementa un 50% cuando el importador es un no contribuyente. Ahí la intervención del despachante es la regla (CAROU art. 14).',
        tone: 'warn',
      },
    },
    taxes: [
      {
        concept: 'IVA',
        value: '22%',
        detail:
          'Regla residual: todo bien paga la tasa básica salvo que esté exonerado (art. 38) o listado en la tasa mínima (art. 36). La electrónica no está en ninguna de las dos listas. La propia DGI matiza con un "en principio", pero para celulares y equipos de radio no hay beneficio.',
        source: {
          label: 'Título 10 T.O. 2023 art. 34',
          url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/34_T10',
        },
      },
      {
        concept: 'Piso de IVA del régimen postal',
        value: 'US$ 20 por envío',
        detail:
          'El IVA del envío postal no puede ser inferior al equivalente a US$ 20, salvo que el envío esté integrado exclusivamente por bienes cuya importación esté exonerada. Un celular no lo está, así que el piso corre. Muerde por debajo de US$ 90,91 de factura: un cargador de US$ 25 paga US$ 20, no US$ 5,50. Caveat: ni las FAQ del MEF ni las de la DNA mencionan este mínimo al explicar la franquicia (sólo lo citan para el 60%) y no hay ningún ejemplo numérico oficial de una compra con franquicia pagando IVA.',
        source: {
          label: 'Ley 20.446 art. 660',
          url: 'https://www.impo.com.uy/bases/leyes/20446-2025/660',
        },
      },
      {
        concept: 'Arancel (TGA)',
        value: '0% dentro de la franquicia',
        detail:
          'La franquicia anual es expresamente exenta de aranceles. Fuera de ella, el arancel depende del NCM y el listado vigente lo publica el MEF: no verificamos alícuota por partida. Uruguay está facultado a aplicar 0% a Bienes de Informática y Telecomunicaciones hasta el 31/12/2029, pero eso es una facultad sobre el listado, no una garantía para tu producto.',
        source: {
          label: 'Ley 20.446 art. 627',
          url: 'https://www.impo.com.uy/bases/leyes/20446-2025/627',
        },
      },
      {
        concept: 'Tasa consular',
        value: '5% (3% Mercosur), tributo del régimen general',
        detail:
          'Se calcula sobre el valor en aduana y sus exoneraciones son taxativas: admisión temporaria, petróleo crudo y ciertos combustibles, y bienes de capital de uso industrial, agropecuario o pesquero con TGA extrazona de 2% o 0%. Un celular de una persona física no entra en ninguna. En la prestación única el 60% sustituye toda la tributación de la importación; qué pasa con la tasa consular dentro de la franquicia, la norma no lo resuelve.',
        source: {
          label: 'Ley 19.535 art. 265',
          url: 'https://www.impo.com.uy/bases/leyes/19535-2017/265',
        },
      },
      {
        concept: 'IMESI',
        value: 'No aplica',
        detail:
          'Los rubros gravados por IMESI que releva esta guía son bebidas alcohólicas, tabaco, cosméticos y perfumería, vehículos automotores y lubricantes. La electrónica de consumo no está entre ellos, y eso importa: la mercadería gravada por IMESI queda fuera del régimen postal en todos los casos (Ley 20.446 art. 633).',
        source: {
          label: 'Ley 20.446 art. 633',
          url: 'https://www.impo.com.uy/bases/leyes/20446-2025/633',
        },
      },
      {
        concept: 'Certificado URSEC',
        value: '$204 a $239 ($852 con homologación)',
        detail:
          'No es un tributo, es el costo del trámite en VUCE. Es un gasto tuyo, previo, y no forma parte de la base imponible de nada.',
        source: {
          label: 'URSEC — trámite persona física',
          url: 'https://www.gub.uy/tramites/certificado-para-habilitar-ingreso-al-pais-equipos-radioelectricos-bajo-regimen-franquicia-persona-fisica',
        },
      },
    ],
    benefits: [
      {
        title: 'Exoneración por origen: hasta US$ 200 desde EE.UU.',
        detail:
          'Dentro de la franquicia, los envíos de hasta US$ 200 provenientes de países con acuerdo comercial (EE.UU., por el TIFA) están exonerados. La residencia fiscal del vendedor se acredita con la factura. Desde el 1/10/2026 el emisor de la factura tiene que estar registrado ante la DNA; si no lo está, no se aplica la exoneración.',
        norm: 'Decreto 50/026 art. 3',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
      },
      {
        title: 'Obsequio familiar entre personas físicas',
        detail:
          'El envío no comercial entre personas físicas, con mercadería en cantidades razonables y para uso personal, está exento de todo tributo. Igual consume cupo de la franquicia, y no te salva del certificado de URSEC si el equipo lo requiere: el control del organismo es independiente del tributo.',
        norm: 'Decreto 50/026 art. 3',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
      },
      {
        title: 'Sin despachante en el canal postal',
        detail:
          'Ninguna operación del régimen de envíos postales exige despachante, y el Código Aduanero deja los envíos postales no comerciales fuera de los casos en que su intervención es preceptiva (CAROU art. 15). Es un ahorro frente al despacho formal.',
        norm: 'Decreto 50/026 art. 17 y Ley 20.446 art. 627',
        url: 'https://www.impo.com.uy/bases/leyes/20446-2025/627',
      },
    ],
    procedures: [
      {
        organism: 'URSEC',
        when: 'Según la FAQ de la DNA (sección URSEC), hace falta certificado para celular, router con módem celular, GPS, handy y cámara con conexión celular. NO hace falta para dispositivos que operen únicamente con Wi-Fi (2,4 y/o 5,8 GHz, estándares 802.11, es decir Wifi4, Wifi5 y Wifi6) y/o Bluetooth 802.15: auriculares, mouse, smartwatch, joystick, cámaras y similares (Resoluciones URSEC 275/2021 y 297/2021). Un celular transmite en espectro licenciado, así que no entra en esa excepción. Un dron entra en la excepción si se comunica por Wi-Fi o Bluetooth en 2,4/5,8 GHz, y queda fuera si usa un protocolo propietario de radioenlace.',
        how: 'El trámite lo inicia la propia persona física en VUCE: "Certificado para habilitar el ingreso al país de equipos radioeléctricos bajo el régimen de franquicia (Persona Física)". Costo publicado entre $204 y $239, y $852 si además el equipo requiere homologación. Plazo máximo de URSEC: 2 días hábiles; la homologación, cuando corresponde, puede demorar hasta 120 días. Una vez aprobado, el certificado se envía automáticamente al sistema de la Dirección Nacional de Aduanas.',
        url: 'https://www.gub.uy/tramites/certificado-para-habilitar-ingreso-al-pais-equipos-radioelectricos-bajo-regimen-franquicia-persona-fisica',
      },
    ],
    declare: {
      intro:
        'Acá el orden importa más que en cualquier otra categoría: el certificado de URSEC es previo. La bisagra del Decreto 50/026 art. 7 es literal: la mercadería que requiere autorización y carece de ella queda fuera del régimen entero, ni franquicia ni 60%. Con el certificado, tu celular sigue adentro y tributa normalmente.',
      steps: [
        {
          name: 'Mirá las bandas antes de comprar',
          text: 'Buscá en la ficha técnica en qué frecuencias transmite. Si es sólo Wi-Fi (2,4 y/o 5,8 GHz, 802.11) y/o Bluetooth 802.15, URSEC no interviene y no tenés trámite. Si es un celular, un router con módem celular, un GPS, un handy o una cámara con conexión celular, sí lo necesitás. Un dron depende de cómo se comunica: Wi-Fi/Bluetooth no, radioenlace propietario sí.',
        },
        {
          name: 'Sacá el certificado en VUCE antes de que llegue',
          text: 'Entrá a VUCE e iniciá vos mismo el trámite de persona física de URSEC. Costo entre $204 y $239, hasta 2 días hábiles de plazo. Si el equipo requiere homologación son $852 y puede demorar hasta 120 días, así que en ese caso conviene tenerlo resuelto antes de comprar. Aprobado, el certificado se envía automáticamente al sistema de la Aduana; distinto es el envío retenido, donde los certificados de otros organismos se llevan en papel.',
        },
        {
          name: 'Pagá con tu propia tarjeta',
          text: 'Tarjeta de crédito o débito internacional, o dinero electrónico internacional de una institución regulada por el BCU, y la titularidad tiene que coincidir con la del comprador y con la del destinatario. Si te la compra un tercero, perdés la franquicia y la operación se liquida al 60%.',
        },
        {
          name: 'Elegí el régimen: es un campo de la declaración',
          text: 'El declarante tiene que determinar el régimen aduanero aplicable al envío. La declaración lleva un campo "Tipo de envío" con códigos: "G" es franquicia y "H" es prestación única del 60%. Para un celular te conviene G. Los códigos J son para envíos exceptuados del pago de tributos (J/01 libros, J/02 medicamentos de uso personal): tu celular no va por ahí.',
        },
        {
          name: 'Declaralo vos (Correo) o controlá al courier',
          text: 'Si llega por Correo Uruguayo, el que declara primero sos vos, en el formulario web del Correo: tracking de 13 caracteres y datos idénticos a los de la cédula. Si llega por courier, declara el operador: pedile por escrito con qué tipo de envío lo declaró y que confirme que el certificado de URSEC quedó asociado. No hay norma ni FAQ que diga si el régimen se puede cambiar una vez presentada la declaración: pedilo antes.',
        },
        {
          name: 'Guardá la factura y pagá dentro de los 30 días',
          text: 'El envío tiene que ir acompañado de la documentación que acredite el valor: el total de la factura original, con todos los conceptos adicionados. Tenés 30 días desde el ingreso al país para pagar los tributos y 90 días para retirar del depósito; pasados esos plazos hay abandono no infraccional. El "10 días desde la notificación" que circula no es un plazo legal: es la ventana tarifaria del cargo de gestión del Correo.',
        },
        {
          name: 'Si te lo retienen, es presencial',
          text: 'El trámite de envío retenido se hace con agenda previa y en persona, y los certificados de otros organismos se llevan en papel. El almacenamiento durante la demora lo pagás vos. Si el motivo es que falta el certificado de URSEC, sacalo primero: sin el certificado previo la Aduana no inicia el trámite.',
        },
      ],
      pitfalls: [
        'Comprar primero y averiguar después: si el equipo llega sin el certificado de URSEC, no es que pagues más, es que queda fuera de los dos regímenes (Decreto 50/026 art. 7) y sólo te queda devolverlo a origen, a tu costo, dentro de los 30 días.',
        'Que te lo pague otro. Si la tarjeta no es tuya, se cae la franquicia y la operación pasa al 60%.',
        'No preguntarle al courier con qué tipo de envío lo declaró. Si quedó como "H" y querías franquicia, ninguna norma dice que se pueda corregir después.',
        'Subvaluar la factura para esquivar el piso de US$ 20: la multa es el doble de los tributos que debiste pagar, se pierde la franquicia de esa operación y la reincidencia dentro de 12 meses te prohíbe operar en el régimen por otros 12.',
        'Creer que porque el equipo es chico y barato no paga nada. El piso de IVA de US$ 20 corre igual, y un accesorio de US$ 25 paga los mismos US$ 20 que uno de US$ 90.',
        'Guiarse por las páginas viejas: la página de la DNA de productos con permisos es del 09/01/2026, anterior al Decreto 50/026, y el paso 3 del instructivo del Correo Uruguayo todavía publica los topes derogados de US$ 50 y US$ 200 como condición de la franquicia.',
      ],
    },
    considerations: [
      'El costo real no es sólo el IVA: sumá los $204 a $239 del certificado de URSEC (o $852 con homologación) antes de comparar contra el precio de plaza.',
      'El tiempo es el riesgo mayor. URSEC tiene 2 días hábiles de plazo máximo, pero la homologación puede llevar hasta 120 días y el reloj de los 30 días para pagar corre desde que el envío entra al país, no desde que vos resolvés el trámite.',
      'No está publicado cuánto tiempo vale el certificado ni si sirve para más de un envío. Si pensás traer dos equipos, no asumas que uno solo alcanza.',
      'El Correo Uruguayo, por política propia, no admite baterías de litio en envíos internacionales, y las restricciones aéreas de IATA/OACI las decide cada aerolínea u operador. No es una prohibición aduanera uruguaya y no existe cifra oficial uruguaya de Wh: verificá con el operador que vas a usar antes de comprar.',
      'Para esta categoría la franquicia es igual o mejor que el 60% si cumplís sus requisitos (persona física mayor de edad con documento uruguayo, uso personal, tarjeta propia, cupo disponible): 22% contra 60% sobre la misma base. Sólo empatan por debajo de US$ 33,33, donde las dos caen en el piso de US$ 20.',
      'Si el vendedor tiene residencia fiscal en EE.UU. y la factura no pasa de US$ 200, el envío queda exonerado dentro de la franquicia. Desde el 1/10/2026 ese vendedor va a tener que estar registrado ante la DNA para que valga.',
      'El cupo se imputa por fecha de desaduanamiento, no de compra: un celular comprado en diciembre que despacha en enero consume el cupo del año nuevo.',
    ],
    faqs: [
      {
        q: '¿Necesito URSEC para unos auriculares Bluetooth o un smartwatch?',
        a: 'No. Las Resoluciones URSEC 275/2021 y 297/2021 sacan del control a los dispositivos que operen únicamente con Wi-Fi (2,4 y/o 5,8 GHz, estándares 802.11) y/o Bluetooth 802.15. El texto del trámite lo dice así: no es necesaria la intervención de URSEC para dispositivos que operen únicamente con Wifi4, Wifi5 y Wifi6 y/o Bluetooth. Ahí caen auriculares, mouse, smartwatch, joystick y cámaras que sólo usan esas tecnologías. Igual pagan 22% de IVA como cualquier electrónica: la excepción es de trámite, no de impuesto.',
      },
      {
        q: '¿Y para un celular? ¿No es lo mismo, si tiene Wi-Fi?',
        a: 'No es lo mismo. Un celular además transmite en espectro licenciado, o sea fuera de las bandas de la excepción, así que necesita el certificado previo de URSEC. La FAQ de la DNA lo lista expresamente junto al router con módem celular, el GPS, el handy y la cámara con conexión celular. El trámite lo iniciás vos en VUCE, no lo hace el vendedor ni el courier.',
      },
      {
        q: '¿Cuánto pago por un celular de US$ 400 con franquicia?',
        a: 'Con franquicia el arancel queda exonerado y el IVA se liquida al 22% sobre el valor de factura: son US$ 88. Se le suman los $204 a $239 del certificado de URSEC y lo que cobre el operador postal por su gestión. Con la prestación única serían US$ 240, así que no tiene sentido optar por ella. Dos caveats honestos: no está resuelto si el incremento del 50% de la base que rige en el régimen general también corre en el régimen postal (acá se aplica la regla postal, sin incremento), y ni el MEF ni la DNA publicaron un solo ejemplo numérico de una compra con franquicia pagando IVA.',
      },
      {
        q: '¿Qué pasa si el paquete llega y todavía no tengo el certificado?',
        a: 'El Decreto 50/026 art. 7 deja fuera del régimen a la mercadería que requiere autorización y carece de ella. No es que pagues un recargo: quedás afuera de los dos regímenes, ni franquicia ni 60%, y la salida es devolverlo a origen a tu costo dentro de los 30 días. Si te lo retienen, el trámite es presencial con agenda previa y el almacenamiento lo pagás vos. Sacá el certificado antes.',
      },
      {
        q: '¿Un dron necesita permiso de DINACIA para importarlo?',
        a: 'No hay trámite de permiso de importación de drones en DINACIA, y DINACIA no figura entre los organismos controladores de la Aduana. Lo que sí lleva es un Registro de Drones, gratuito, en utm.dinacia.gub.uy. Lo que define el trámite aduanero es cómo se comunica el aparato: si usa Wi-Fi o Bluetooth en 2,4/5,8 GHz no precisa URSEC; si usa un protocolo propietario de radioenlace, sí.',
      },
      {
        q: '¿El certificado de URSEC me sirve para el próximo celular?',
        a: 'No está publicado. Ni el trámite ni las resoluciones dicen cuánto tiempo vale el certificado ni si ampara más de un envío. Es un hueco real de la normativa, no algo que se pueda deducir. Si vas a traer dos equipos, lo prudente es tramitar uno por envío y preguntarle a URSEC antes, no asumir que se reutiliza.',
      },
    ],
    sources: [
      {
        label: 'URSEC — certificado de ingreso de equipos radioeléctricos (persona física)',
        url: 'https://www.gub.uy/tramites/certificado-para-habilitar-ingreso-al-pais-equipos-radioelectricos-bajo-regimen-franquicia-persona-fisica',
        note: 'Costo, plazo de 2 días hábiles, homologación de hasta 120 días y el texto de la excepción Wi-Fi/Bluetooth (Resoluciones URSEC 275/2021 y 297/2021). Actualizado 27/07/2026.',
      },
      {
        label: 'Decreto 50/026',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
        note: 'Art. 3 (exoneraciones dentro de la franquicia), art. 4 (requisitos), art. 5 (valor), art. 7 (mercadería sin la autorización requerida), art. 14 (plazos), art. 17 (sin despachante).',
      },
      {
        label: 'Ley 20.446 art. 627',
        url: 'https://www.impo.com.uy/bases/leyes/20446-2025/627',
        note: 'Franquicia de US$ 800 anuales en hasta 3 envíos, exenta de aranceles, con el IVA liquidándose igual; y la prestación única del 60% como opción.',
      },
      {
        label: 'Ley 20.446 art. 660',
        url: 'https://www.impo.com.uy/bases/leyes/20446-2025/660',
        note: 'El piso de US$ 20 de IVA del régimen postal, salvo envío integrado exclusivamente por bienes exonerados.',
      },
      {
        label: 'Título 10 T.O. 2023 art. 34',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/34_T10',
        note: 'Tasa básica del 22%, la que corre para toda la electrónica.',
      },
      {
        label: 'RG DNA 11/2026',
        url: 'https://www.aduanas.gub.uy/innovaportal/file/28447/1/rg-11_2026.pdf',
        note: 'Num. 27 (piso de IVA) y num. 28 lit. c: los códigos del campo "Tipo de envío" — G franquicia, H prestación única, J exceptuados.',
      },
      {
        label: 'DNA — preguntas frecuentes del régimen 2026',
        url: 'https://www.aduanas.gub.uy/innovaportal/v/28231/1/innova.front/',
        note: 'Sección URSEC: celular, router con módem celular, GPS, handy y cámara con conexión celular requieren certificado. También el criterio de imputación del cupo por fecha de desaduanamiento.',
      },
      {
        label: 'DNA — productos que requieren permisos o no pueden ingresar',
        url: 'https://www.aduanas.gub.uy/innovaportal/v/28229/1/innova.front/',
        note: 'Atención: publicada el 09/01/2026, anterior al Decreto 50/026. La propia DNA aclara que el listado es orientativo y no taxativo.',
      },
      {
        label: 'Correo Uruguayo — cómo declarar su compra u obsequio',
        url: 'https://www.correo.com.uy/como-declarar-su-compra-u-obsequio',
        note: 'Formulario web de declaración con tracking de 13 caracteres. Atención: su paso 3 todavía publica los topes derogados de US$ 50 y US$ 200.',
      },
    ],
    verifiedAt: '2026-08-15',
  },
  {
    slug: 'electronica',
    productTypeId: 'electronica',
    title: 'Importar electrónica a Uruguay: impuestos y cómo declararlo',
    navLabel: 'Electrónica sin radio',
    description:
      'La electrónica paga 22% de IVA incluso con franquicia, con un mínimo de US$ 20 por envío, y no necesita certificado de URSEC si sólo usa Wi-Fi o Bluetooth.',
    icon: 'mdi-laptop',
    examples: [
      'Notebook o laptop',
      'Monitor, teclado y mouse',
      'Disco SSD externo, memorias y componentes de PC',
      'Auriculares Bluetooth y parlantes portátiles',
      'Smartwatch y pulseras de actividad',
      'Consola de videojuegos y joysticks',
      'Cámara de fotos sin conexión celular',
      'Lector de libros electrónicos (Kindle, Kobo)',
    ],
    notIncluded: [
      'Celulares: transmiten en espectro licenciado y necesitan certificado previo de URSEC',
      'Routers con módem celular, GPS, handies y cámaras con conexión celular: también van con URSEC',
      'Drones con radioenlace propietario (los que sólo usan Wi-Fi o Bluetooth en 2,4/5,8 GHz sí entran acá)',
      'Vaporizadores y cigarrillos electrónicos: importación prohibida, incluidos accesorios y repuestos',
    ],
    regimes: {
      franquicia: {
        verdict: 'IVA 22%, mínimo US$ 20',
        detail:
          'La franquicia exime aranceles, no el IVA: el art. 627 inc. 2 de la Ley 20.446 remite al art. 4 y al literal B del art. 13 del Título 10 y el IVA se sigue liquidando. La electrónica no está exonerada ni en tasa mínima, así que va al 22% sobre el valor de factura y le corre el piso de US$ 20 por envío. Caveat: ni la FAQ del MEF ni la de la DNA mencionan ese mínimo al explicar la franquicia (sólo lo citan para el 60%), y no hay ningún ejemplo numérico oficial de una compra con franquicia pagando IVA.',
        tone: 'warn',
      },
      prestacionUnica: {
        verdict: '60% del valor, mínimo US$ 20',
        detail:
          'Sustituye toda la tributación de la importación, arancel incluido, y es opcional: la ley dice que el titular "podrá optar". Para electrónica es el camino más caro, porque por franquicia el IVA es 22% y no 60%. Queda como alternativa cuando ya gastaste los US$ 800 o los 3 envíos del año, o cuando no se cumple algún requisito de la franquicia (por ejemplo, que la compra no la hayas pagado vos con un medio de pago a tu nombre).',
        tone: 'warn',
      },
      general: {
        verdict: 'IVA 22% + tasa consular 5% + arancel según NCM',
        detail:
          'Es a donde caés si el envío pasa de US$ 800 de factura o de 20 kg. Ahí el IVA se calcula sobre el valor en aduana (CIF) más el arancel y, si importa un particular no contribuyente, esa suma se incrementa un 50% (art. 13 lit. B del Título 10). Se suma la tasa consular del 5% y el arancel del NCM, que puede ser 0% para Bienes de Informática y Telecomunicaciones (Decreto 167/022, hasta el 31/12/2029). Fuera del canal postal la intervención del despachante vuelve a ser la regla (CAROU art. 14).',
        tone: 'warn',
      },
    },
    taxes: [
      {
        concept: 'IVA',
        value: '22%',
        detail:
          'Tasa básica del art. 34 del Título 10. No hay ninguna norma que ponga la electrónica de consumo, computadoras o laptops en la tasa mínima (art. 36) ni entre las exoneraciones (art. 38), así que paga por regla residual. La propia FAQ de la DGI lo dice con un hedge: "en principio" todo está gravado al 22% salvo exoneración o tasa mínima; la tasa básica la fija el art. 34, no los arts. 36/38.',
        source: {
          label: 'Título 10 T.O. 2023, art. 34',
          url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/34_T10',
        },
      },
      {
        concept: 'Mínimo de IVA por envío',
        value: 'US$ 20',
        detail:
          'En el régimen postal el IVA se aplica sobre el valor de factura o la declaración de valor, y "en ningún caso" puede pagarse menos que el equivalente a US$ 20, salvo que el envío esté integrado exclusivamente por bienes exonerados. La electrónica no lo está, así que el piso corre siempre. A la tasa del 22% el mínimo muerde por debajo de US$ 90,91: una compra de US$ 40 paga los mismos US$ 20 que una de US$ 90.',
        source: {
          label: 'Título 10 T.O. 2023, art. 13 lit. B (inciso agregado por Ley 20.446 art. 660)',
          url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/13_T10',
        },
      },
      {
        concept: 'Arancel (TGA)',
        value: '0% con franquicia',
        detail:
          'La franquicia anual es expresamente exenta de aranceles. Fuera del régimen postal el arancel depende del NCM del producto; Uruguay puede aplicar 0% a Bienes de Informática y Telecomunicaciones hasta el 31/12/2029 (MERCOSUR/CMC/DEC 08/21, Decreto 167/022). No verificamos alícuotas partida por partida: si tu compra sale del canal postal, el arancel concreto hay que mirarlo en el listado vigente del MEF.',
        source: {
          label: 'Ley 20.446 art. 627',
          url: 'https://www.impo.com.uy/bases/leyes/20446-2025/627',
        },
      },
      {
        concept: 'IMESI',
        value: 'No aplica',
        detail:
          'El IMESI no es un porcentaje del CIF: alcanza rubros puntuales del Título 11 y se liquida sobre valores reales o sobre precios fictos que fija el Poder Ejecutivo. No se encontró norma que grave con IMESI la electrónica de consumo, y por eso ésta no queda excluida del régimen postal por el art. 633 de la Ley 20.446, que dice que el régimen "no se aplicará en ningún caso" a la mercadería gravada por ese impuesto.',
        source: {
          label: 'Título 11 T.O. 2023',
          url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/1_T11',
        },
      },
      {
        concept: 'Tasa consular',
        value: '5% (sólo fuera del régimen postal)',
        detail:
          '5% sobre el valor en aduana, 3% si la mercadería viene amparada en el ACE N.º 18 (Mercosur). Las exoneraciones son taxativas —admisión temporaria, petróleo crudo y ciertos combustibles, y bienes de capital de uso industrial, agropecuario o pesquero con TGA extrazona de 2% o 0%— y ninguna alcanza a la electrónica de consumo. El Poder Ejecutivo está facultado a bajarla y no lo hizo.',
        source: {
          label: 'Ley 19.535 art. 265',
          url: 'https://www.impo.com.uy/bases/leyes/19535-2017/265',
        },
      },
      {
        concept: 'Prestación única (opcional)',
        value: '60% del valor, mínimo US$ 20',
        detail:
          'Se paga "en sustitución a toda tributación relativa a la importación definitiva… ya sea por concepto arancelario o tributo interno". Es una opción, no una obligación: la ley dice que el titular "podrá optar". Para electrónica es el camino caro, porque dentro de la franquicia el IVA se liquida al 22%.',
        source: {
          label: 'Ley 20.446 art. 627',
          url: 'https://www.impo.com.uy/bases/leyes/20446-2025/627',
        },
      },
    ],
    benefits: [
      {
        title: 'Sin trámite de URSEC si el equipo sólo usa Wi-Fi o Bluetooth',
        detail:
          'URSEC no interviene en el ingreso de dispositivos que operen únicamente con Wifi4, Wifi5 y Wifi6 y/o Bluetooth (es decir, únicamente en 2,4 GHz y/o 5,8 GHz con estándares Wi-Fi 802.11 o Bluetooth 802.15): auriculares, mouse, smartwatch, joystick, cámaras y similares. Te ahorrás el costo del certificado, los 2 días hábiles de trámite y el riesgo de que el envío quede retenido.',
        norm: 'Resolución URSEC 275/021 num. 1, ampliada por la 297/021',
        url: 'https://www.gub.uy/tramites/certificado-para-habilitar-ingreso-al-pais-equipos-radioelectricos-bajo-regimen-franquicia-persona-fisica',
      },
      {
        title: 'Tu propio equipo usado no está gravado si lo tenés hace 6 meses o más',
        detail:
          'La importación por un no contribuyente de bienes afectados a su uso personal con al menos 6 meses de anterioridad no está gravada por IVA, siempre que se pruebe documentalmente. Es la vía de quien se manda su propia notebook desde el exterior, no la de una compra nueva.',
        norm: 'Decreto 220/998 art. 102',
        url: 'https://www.impo.com.uy/bases/decretos/220-1998',
      },
    ],
    procedures: [
      {
        organism: 'URSEC',
        when: 'NO hace falta si el equipo opera únicamente con Wi-Fi (Wifi4, Wifi5, Wifi6) y/o Bluetooth: auriculares, mouse, smartwatch, joysticks, cámaras y similares en 2,4/5,8 GHz, y drones que se comuniquen por esas tecnologías. SÍ hace falta, y es previo, si el aparato lleva radio licenciada o un radioenlace propietario: celular, router con módem celular, GPS, handy, cámara con conexión celular, drone con enlace propietario.',
        how: 'Lo inicia la propia persona física en VUCE, con el trámite "Certificado para habilitar el ingreso al país de equipos radioeléctricos bajo el régimen de franquicia (Persona Física)". Costo publicado: $239, y $852 si el equipo además requiere homologación. URSEC tiene un plazo máximo de 2 días hábiles; la homologación, cuando corresponde, puede demorar hasta 120 días. Una vez aprobado, el certificado se envía automáticamente al sistema de la Dirección Nacional de Aduanas. No está publicado cuánto tiempo vale el certificado ni si sirve para más de un envío.',
        url: 'https://www.gub.uy/tramites/certificado-para-habilitar-ingreso-al-pais-equipos-radioelectricos-bajo-regimen-franquicia-persona-fisica',
      },
    ],
    declare: {
      intro:
        'La electrónica no tiene un canal propio: se declara como cualquier compra, con tipo de envío "G" (franquicia) o "H" (prestación única). Los códigos "J" de envíos exceptuados del pago de tributos son para material amparado en la Ley 15.913, medicamentos de uso personal, numismática y valija diplomática, así que acá el trabajo es asegurarte de que te declaren el régimen que elegiste y con el valor correcto.',
      steps: [
        {
          name: 'Confirmá que el equipo no lleva radio licenciada',
          text: 'Si sólo usa Wi-Fi o Bluetooth, no necesitás nada de URSEC. Si tiene módem celular, GPS, handy o radioenlace propietario, el certificado de URSEC va ANTES: sin la autorización, el art. 7 del Decreto 50/026 deja el envío fuera de los dos regímenes.',
        },
        {
          name: 'Pagá con tu propio medio de pago y guardá la factura completa',
          text: 'Tarjeta de crédito o débito internacional, o dinero electrónico internacional de una institución regulada por el BCU, y la titularidad tiene que coincidir: quien compra, quien paga y quien recibe son la misma persona. Guardá la factura original: el valor del régimen es el total de esa factura, incluidos todos los conceptos que figuren adicionados en la misma. El envío debe ir acompañado de la documentación que acredite el valor.',
        },
        {
          name: 'Elegí el régimen antes del despacho y pedilo por escrito',
          text: 'La opción de régimen es un campo de la declaración: el declarante tiene que determinar el régimen aduanero aplicable al envío (RG DNA 14/2026, Anexo I num. 15 lit. k). Pedile al courier u operador postal que declare tipo de envío "G" si vas por franquicia, o "H" si elegís la prestación única del 60%. No hay norma ni FAQ que diga si se puede cambiar después de presentada la declaración.',
        },
        {
          name: 'Si llega por Correo Uruguayo, declaralo vos primero',
          text: 'El destinatario declara el envío en el formulario web del Correo ("Ahíva"): número de tracking de 13 caracteres y datos idénticos a los de la cédula. El formulario pide si es compra u obsequio, si usás franquicia y con qué medio de pago. Ojo con esa página: al 03/08/2026 todavía publica como condición de la franquicia los topes derogados de US$ 50 y US$ 200 del Decreto 356/014.',
        },
        {
          name: 'Pagá dentro de los 30 días y retirá antes de los 90',
          text: 'Tenés 30 días desde el ingreso al país para pagar los tributos y 90 días para retirar del depósito; vencido cualquiera de los dos, el envío cae en abandono no infraccional (Decreto 50/026 art. 14). El "plazo de 10 días desde la notificación de retención" no es un plazo legal: es la ventana tarifaria del cargo de gestión del Correo Uruguayo.',
        },
        {
          name: 'Si queda retenido, agendá y llevá los papeles impresos',
          text: 'El trámite del envío retenido es presencial y con agenda previa; los certificados de otros organismos se llevan en papel y el almacenamiento durante la demora lo paga el destinatario. Consultas: DNA info@aduanas.gub.uy o 2 915 00 07 (L-V 9-17); Correo Uruguayo 0800 2108.',
        },
      ],
      pitfalls: [
        'Que la compra la pague otro: si la tarjeta o el dinero electrónico no está a tu nombre, se pierde la franquicia y la operación se liquida al 60%.',
        'Declarar menos valor del que dice la factura: la multa es igual al doble de los tributos que debieron pagarse, se pierde la franquicia de esa operación y, si reincidís dentro de los 12 meses, quedás 12 meses sin poder operar en el régimen.',
        'Creer que una compra chica no paga nada: en electrónica nada del envío está exonerado, así que el piso de US$ 20 de IVA corre igual.',
        'Meter en la misma caja un accesorio con radio licenciada (un módem celular, un GPS) sin el certificado de URSEC: sin autorización previa el envío queda fuera de la franquicia y de la prestación única, y se puede devolver a origen a costo del interesado dentro de los 30 días.',
        'No chequear qué régimen te declararon: la opción es un campo de la declaración y no hay norma ni FAQ que diga si se puede cambiar después de presentada, así que conviene confirmarlo antes.',
        'Comprar algo con batería de litio pensando en mandarlo por Correo Uruguayo: el Correo no admite baterías de litio en envíos internacionales.',
      ],
    },
    considerations: [
      'El IVA que pagás es definitivo: el anticipo del Decreto 220/998 art. 115 es sólo para contribuyentes, y un particular no lo deduce ni lo recupera.',
      'El valor del régimen es el total de la factura con todos los conceptos que figuren adicionados en ella, no sólo el precio del producto: un envío de US$ 780 puede pasarse de los US$ 800 sin que lo veas venir.',
      'Los US$ 800 de valor de factura y los 20 kg por envío son topes independientes. Con electrónica voluminosa —un monitor, un gabinete, una impresora— te pasás de peso mucho antes que de plata.',
      'Baterías de litio: no hay prohibición aduanera uruguaya. Es una restricción de transporte aéreo (IATA/OACI) y la decide cada aerolínea u operador; el Correo Uruguayo, por política propia, no las admite en envíos internacionales. No existe cifra oficial uruguaya de Wh: los 100 Wh o 160 Wh que circulan no salen de ninguna norma nacional.',
      'El cupo se imputa por fecha de desaduanamiento, no de compra: si comprás en diciembre y el envío se desaduana en enero, consume el cupo del año siguiente.',
      'Si el vendedor tiene residencia fiscal en EE.UU. (acuerdo TIFA), los envíos de hasta US$ 200 están exonerados dentro de la franquicia; se acredita con la factura. Desde el 1/10/2026 el emisor de la factura tiene que estar registrado ante la DNA o no se aplica la exoneración.',
      'Antes de comparar precios contra plaza, hacé la cuenta completa: producto + flete + 22% de IVA (o el piso de US$ 20 si la compra es chica) + lo que cobre el operador postal por su gestión.',
    ],
    faqs: [
      {
        q: '¿Una laptop paga IVA si uso la franquicia?',
        a: 'Sí. La franquicia anual exime aranceles, no el IVA: el art. 627 inc. 2 de la Ley 20.446 remite al art. 4 y al literal B del art. 13 del Título 10. La electrónica no figura entre las exoneraciones del art. 38 ni en la tasa mínima del art. 36, así que va al 22% sobre el valor de factura. Hay que decirlo con honestidad: ni la FAQ del MEF ni la de la DNA mencionan el mínimo de US$ 20 cuando explican la franquicia (sólo lo citan para el 60%), y no existe ningún ejemplo numérico oficial de una compra con franquicia pagando IVA.',
      },
      {
        q: '¿Necesito certificado de URSEC para unos auriculares Bluetooth o un smartwatch?',
        a: 'No. La Resolución URSEC 275/021, ampliada por la 297/021, dice que no es necesaria la intervención de URSEC para dispositivos que operen únicamente con Wifi4, Wifi5 y Wifi6 y/o Bluetooth. Eso cubre auriculares, mouse, smartwatch, joysticks, cámaras y similares que sólo usen esas tecnologías en 2,4 y 5,8 GHz. Sí necesitan certificado el celular, el router con módem celular, el GPS, el handy y la cámara con conexión celular: un celular transmite en espectro licenciado y por eso no entra en la excepción.',
      },
      {
        q: '¿Puedo traer un power bank o algo con batería de litio?',
        a: 'No hay prohibición aduanera uruguaya sobre las baterías de litio. Es una restricción de transporte aéreo (IATA/OACI) y la aplica cada aerolínea u operador, así lo dice la propia Aduana. El Correo Uruguayo, por política propia, no admite baterías de litio en envíos internacionales, así que si comprás algo con batería vas a depender de que el operador que uses lo acepte. No hay ninguna cifra oficial uruguaya de watt-hora: los límites de 100 Wh o 160 Wh que ves citados no salen de una norma nacional.',
      },
      {
        q: '¿Un Kindle paga como libro?',
        a: 'No. Los libros y los e-books están exonerados, pero el Decreto 220/998 art. 40-BIS excluye expresamente los dispositivos de lectura electrónica. Un Kindle o un Kobo pagan 22% de IVA. Los libros que le cargues adentro sí están exonerados, incluida la licencia de uso por período o a perpetuidad; el aparato, no.',
      },
      {
        q: '¿Qué pasa si la compra pasa de US$ 800 o de 20 kg?',
        a: 'Sale del régimen postal y va por el régimen general. Ahí el IVA se calcula sobre el valor en aduana (CIF: incluye flete hasta el lugar de importación, gastos de carga, descarga y manipulación, y seguro) más el arancel y, si importa un particular no contribuyente, esa suma se incrementa un 50%. Se suma la tasa consular del 5% —3% si la mercadería viene amparada en el ACE N.º 18— y el arancel del NCM, que puede ser 0% para Bienes de Informática y Telecomunicaciones hasta el 31/12/2029. Y la intervención del despachante vuelve a ser la regla (CAROU art. 14), porque la excepción de los envíos postales no comerciales ya no aplica.',
      },
      {
        q: '¿Un drone necesita permiso para entrar?',
        a: 'Depende de cómo se comunique. Si usa Wi-Fi o Bluetooth en 2,4/5,8 GHz, no necesita URSEC; si usa un protocolo propietario de radioenlace, sí. DINACIA no tiene trámite de permiso de importación de drones ni figura entre los organismos controladores de la Aduana: lo que sí lleva es un Registro de Drones gratuito en utm.dinacia.gub.uy (Resolución DINACIA 291/2014), que es otra cosa. En impuestos, el drone es electrónica común: 22% de IVA.',
      },
    ],
    sources: [
      {
        label: 'Título 10 T.O. 2023, art. 34 — tasas del IVA',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/34_T10',
        note: 'Tasa básica 22%: la electrónica paga por regla residual.',
      },
      {
        label: 'Título 10 T.O. 2023, art. 13 lit. B — base del IVA y mínimo postal',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/13_T10',
        note: 'Inciso agregado por la Ley 20.446 art. 660: el IVA del envío postal no puede ser menor al equivalente de US$ 20.',
      },
      {
        label: 'Ley 20.446 art. 627 — franquicia y prestación única',
        url: 'https://www.impo.com.uy/bases/leyes/20446-2025/627',
      },
      {
        label: 'Ley 20.446 art. 633 — mercadería gravada por IMESI',
        url: 'https://www.impo.com.uy/bases/leyes/20446-2025/633',
        note: 'El régimen no se aplica en ningún caso a la mercadería gravada por IMESI; la electrónica de consumo no lo está.',
      },
      {
        label: 'Decreto 50/026 — reglamento del régimen de envíos postales',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
        note: 'Art. 5 (valor), art. 7 (mercadería sin autorización), art. 14 (plazos de 30 y 90 días), art. 17 (sin despachante).',
      },
      {
        label: 'RG DNA 11/2026 (PDF)',
        url: 'https://www.aduanas.gub.uy/innovaportal/file/28447/1/rg-11_2026.pdf',
        note: 'Num. 27 repite el mínimo de US$ 20 de IVA; num. 28 lit. c define los códigos de tipo de envío G, H y J.',
      },
      {
        label: 'URSEC / VUCE — certificado de ingreso de equipos radioeléctricos (persona física)',
        url: 'https://www.gub.uy/tramites/certificado-para-habilitar-ingreso-al-pais-equipos-radioelectricos-bajo-regimen-franquicia-persona-fisica',
        note: 'Costo $239 ($852 con homologación), plazo de URSEC 2 días hábiles, y la excepción Wi-Fi/Bluetooth de las Resoluciones 275/2021 y 297/2021.',
      },
      {
        label: 'Decreto 220/998 — reglamento del IVA',
        url: 'https://www.impo.com.uy/bases/decretos/220-1998',
        note: 'Art. 40-BIS excluye los lectores electrónicos; art. 102 (bien de uso personal con 6 meses de antigüedad); art. 115 (anticipo sólo para contribuyentes).',
      },
      {
        label: 'DNA — preguntas frecuentes del régimen 2026',
        url: 'https://www.aduanas.gub.uy/innovaportal/v/28231/1/innova.front/',
        note: 'Equipos que sí requieren URSEC, imputación del cupo por fecha de desaduanamiento y baterías de litio como restricción de transporte aéreo.',
      },
      {
        label: 'Correo Uruguayo — cómo declarar su compra u obsequio',
        url: 'https://www.correo.com.uy/como-declarar-su-compra-u-obsequio',
        note: 'DESACTUALIZADA: al 03/08/2026 el paso 3 sigue publicando los topes derogados de US$ 50 y US$ 200 del Decreto 356/014 como condición de la franquicia.',
      },
    ],
    verifiedAt: '2026-08-15',
  },
  {
    slug: 'ropa-y-calzado',
    productTypeId: 'ropa',
    title: 'Importar ropa y calzado a Uruguay: impuestos y cómo declararlo',
    navLabel: 'Ropa y calzado',
    description:
      'La ropa y el calzado no tienen exención: pagan 22% de IVA y el IVA de un envío postal nunca baja de US$ 20, así que por debajo de US$ 90,91 el piso encarece todo.',
    icon: 'mdi-tshirt-crew',
    examples: [
      'una campera o un buzo',
      'zapatillas y botas',
      'vaqueros, remeras y ropa interior',
      'una cartera, un bolso o una mochila',
      'un reloj de pulsera común y sus mallas',
      'bisutería y accesorios de pelo',
      'gorros, sombreros y paraguas',
      'ropa y calzado de bebé',
    ],
    notIncluded: [
      'Perfumes y cosméticos: algunos están gravados por IMESI y lo gravado por IMESI queda fuera del régimen postal entero (Ley 20.446 art. 633 y Decreto 50/026 art. 7). Tienen ficha aparte.',
      'Anteojos graduados, lentes de contacto, cristales y armazones: según el Comunicado del MSP del 26/08/2024 no pueden ingresar a nombre de una persona física, sólo por empresas habilitadas. Los lentes de sol tienen una vía propia y limitada.',
      'Relojes inteligentes, auriculares y prendas con electrónica: van por la ficha de electrónica. URSEC no interviene en dispositivos que operen únicamente con Wi-Fi o Bluetooth en 2,4 y 5,8 GHz (Resoluciones URSEC 275/2021 y 297/2021).',
      'Prendas o calzado con baterías de litio incorporadas: el Correo Uruguayo, por política propia, no admite baterías de litio en envíos internacionales. No es una prohibición aduanera, es transporte.',
    ],
    regimes: {
      franquicia: {
        verdict: 'IVA 22%, mínimo US$ 20',
        detail:
          'La franquicia anual (hasta US$ 800 y 3 envíos por año civil) exime de aranceles, pero el IVA se sigue liquidando: el art. 627 inc. 2 de la Ley 20.446 remite al art. 4 y al literal B del art. 13 del Título 10. Para ropa y calzado es el camino más barato, porque el 22% es menos de la mitad del 60% de la prestación única.',
        tone: 'warn',
      },
      prestacionUnica: {
        verdict: '60% del valor, mínimo US$ 20',
        detail:
          'Es opcional: la ley dice que el titular podrá optar por pagarla, y sustituye toda tributación de la importación definitiva, ya sea por concepto arancelario o tributo interno. Para esta categoría casi nunca conviene: sólo tiene sentido si ya quemaste los 3 envíos o el cupo anual de US$ 800, o si preferís reservar la franquicia para una compra más cara.',
        tone: 'warn',
      },
      general: {
        verdict: 'IVA 22% + arancel + tasa consular 5%',
        detail:
          'Los topes del régimen postal son US$ 800 de valor de factura y 20 kg por envío, y son independientes entre sí. Fuera del régimen postal, el IVA se calcula sobre el valor en aduana (CIF) más el arancel, y si importa un no contribuyente esa suma se incrementa un 50% (art. 13 lit. B del Título 10). Se suma la tasa consular del 5% (3% con ACE N.º 18 del Mercosur), que no integra la base del IVA. El arancel depende del NCM de la prenda y no hay ninguna alícuota verificada partida por partida.',
        tone: 'warn',
      },
    },
    taxes: [
      {
        concept: 'IVA',
        value: '22%',
        detail:
          'Por regla residual. La tasa básica la fija el art. 34 del Título 10; la ropa, el calzado y los accesorios no figuran en la lista de tasa mínima del art. 36 ni entre las exoneraciones del art. 38. No hay ningún beneficio de IVA para esta categoría.',
        source: {
          label: 'Título 10 T.O. 2023 art. 34',
          url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/34_T10',
        },
      },
      {
        concept: 'Piso de IVA en envíos postales',
        value: 'Mínimo US$ 20 por envío',
        detail:
          'El inciso 3 del art. 13 lit. B (agregado por el art. 660 de la Ley 20.446, vigente desde el 1/1/2026) manda aplicar la tasa sobre el valor de factura o declaración de valor, y agrega que en ningún caso el monto a pagar puede ser inferior al equivalente a US$ 20, salvo que el envío esté integrado exclusivamente por bienes cuya importación se encuentra exonerada. La ropa no está exonerada, así que el piso corre siempre. A la tasa del 22% el piso muerde por debajo de US$ 90,91. Caveat: ni las FAQ del MEF ni las de la DNA mencionan este mínimo al explicar la franquicia, sólo al explicar el 60%, y no hay ningún ejemplo numérico oficial de una compra con franquicia pagando IVA.',
        source: {
          label: 'Ley 20.446 art. 660',
          url: 'https://www.impo.com.uy/bases/leyes/20446-2025/660',
        },
      },
      {
        concept: 'Arancel',
        value: '0% dentro de la franquicia',
        detail:
          'La franquicia anual está expresamente exenta de aranceles. Fuera de ella, el arancel depende del NCM de cada prenda y no está verificada ninguna alícuota partida por partida. La prestación única del 60% también absorbe el arancel, porque sustituye toda tributación de la importación definitiva, por concepto arancelario o tributo interno.',
        source: {
          label: 'Ley 20.446 art. 627',
          url: 'https://www.impo.com.uy/bases/leyes/20446-2025/627',
        },
      },
      {
        concept: 'Prestación única',
        value: '60% del valor',
        detail:
          'Alternativa opcional a la franquicia, con un mínimo de US$ 20 por envío. Sustituye toda tributación de la importación definitiva: arancel y tributo interno. Para ropa es casi tres veces el 22%.',
        source: {
          label: 'Ley 20.446 art. 627',
          url: 'https://www.impo.com.uy/bases/leyes/20446-2025/627',
        },
      },
      {
        concept: 'IMESI',
        value: 'No aplica',
        detail:
          'Los rubros que aparecen gravados por IMESI son cosméticos y perfumería, bebidas alcohólicas, tabacos, vehículos automotores y lubricantes; la ropa, el calzado y los accesorios no están entre ellos. Importa saberlo por la consecuencia: lo gravado por IMESI queda fuera del régimen postal de forma absoluta (Ley 20.446 art. 633 y Decreto 50/026 art. 7), y por eso conviene no mezclarlo en la misma caja que la ropa.',
        source: {
          label: 'Ley 20.446 art. 633',
          url: 'https://www.impo.com.uy/bases/leyes/20446-2025/633',
        },
      },
      {
        concept: 'Tasa consular',
        value: '5% (3% con Mercosur) en el régimen general',
        detail:
          'Se calcula sobre el valor en aduana y sus exoneraciones son taxativas: admisión temporaria, petróleo crudo y ciertos combustibles, y bienes de capital de uso industrial, agropecuario o pesquero con arancel extrazona 0% o 2%. Nada de eso alcanza a la ropa. Qué pasa con la tasa consular dentro del régimen postal no está resuelto: la norma de la franquicia exonera aranceles y no la nombra, y la prestación única habla de sustituir el concepto arancelario y el tributo interno, sin mencionarla.',
        source: {
          label: 'Ley 19.535 art. 265',
          url: 'https://www.impo.com.uy/bases/leyes/19535-2017/265',
        },
      },
    ],
    benefits: [
      {
        title: 'Franquicia anual: sin aranceles',
        detail:
          'Hasta US$ 800 por año civil en un máximo de 3 envíos, exenta de aranceles. El IVA del 22% se sigue liquidando, con el piso de US$ 20. Es el único beneficio general al que accede la ropa, y en la declaración se corresponde con el tipo de envío G.',
        norm: 'Ley 20.446 art. 627 y Decreto 50/026',
        url: 'https://www.impo.com.uy/bases/leyes/20446-2025/627',
      },
      {
        title: 'Origen con acuerdo comercial: hasta US$ 200 exonerados',
        detail:
          'Dentro de la franquicia, los envíos de hasta US$ 200 provenientes de un país con acuerdo comercial (el caso del TIFA con Estados Unidos) están exonerados. La residencia fiscal del vendedor se acredita con la factura. Desde el 1/10/2026 el emisor de la factura tiene que estar registrado ante la DNA; si no lo está, la exoneración no se aplica.',
        norm: 'Decreto 50/026 art. 3 y RG DNA 09/2026 (prorrogada por las RG 12 y 21/2026)',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
      },
      {
        title: 'Obsequio familiar: exento de todo tributo',
        detail:
          'Si la ropa te la manda una persona física del exterior a vos como persona física, sin fin comercial, en cantidades razonables y para uso personal, el envío está exento de todo tributo. Igual consume cupo de la franquicia. Como no hay compra, el valor va por declaración de valor.',
        norm: 'Decreto 50/026 art. 3',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
      },
      {
        title: 'Ropa tuya usada con más de 6 meses: no gravada',
        detail:
          'La importación por un no contribuyente de bienes afectados a su uso personal con al menos 6 meses de anterioridad no está gravada por IVA, siempre que se pruebe documentalmente. Sirve para el que se manda su propia ropa desde el exterior, no para una compra nueva.',
        norm: 'Decreto 220/998 art. 102',
        url: 'https://www.impo.com.uy/bases/decretos/220-1998',
      },
    ],
    declare: {
      intro:
        'Para ropa no hay certificados de ningún organismo: no interviene el MSP, ni URSEC, ni el MGAP. Todo lo que decide cuánto pagás pasa por cómo se declara el envío. El punto clave es el campo Tipo de envío de la declaración aduanera: G es franquicia, H es prestación única del 60% y los códigos J son para envíos exceptuados de tributos. El default del operador es G, pero conviene confirmarlo antes, porque no hay norma ni FAQ que diga si el régimen se puede cambiar después de presentada la declaración.',
      steps: [
        {
          name: 'Comprá con tu tarjeta y a tu nombre',
          text: 'El pago tiene que salir de una tarjeta de crédito o débito internacional, o de dinero electrónico internacional emitido por una institución regulada por el BCU, y la titularidad tiene que coincidir con el titular de la compra y con el destinatario del envío. Si te la compró un tercero, se pierde la franquicia y el envío se liquida al 60%.',
        },
        {
          name: 'Pedí la factura y que viaje con el paquete',
          text: 'El valor es el total de la factura original de compra, incluidos todos los conceptos que figuren adicionados en ella. El envío debe ir acompañado de la documentación que acredite ese valor. Si no hay factura, va declaración de valor. Descargá el comprobante de la tienda apenas comprás.',
        },
        {
          name: 'Declaralo vos si viene por Correo Uruguayo',
          text: 'Quien declara ante la Aduana es el operador postal o el courier, pero si llega por Correo Uruguayo tenés que completar antes el formulario web del Correo con el tracking de 13 caracteres y datos idénticos a los de tu cédula.',
        },
        {
          name: 'Confirmá que el tipo de envío sea G',
          text: 'La RG DNA 11/2026 num. 28 lit. c define el campo Tipo de envío: G para franquicia, H para la prestación única del 60%. Los códigos J son para envíos exceptuados del pago de tributos (material de la Ley 15.913, medicamentos de uso personal, numismática, valija diplomática) y no alcanzan a la ropa. El default del operador es G; si querés que sea otro, o querés asegurarte de que quede en G, decilo antes de que presente la declaración.',
        },
        {
          name: 'Registrate ante la DNA si querés adelantarte',
          text: 'La franquicia exige ser persona física mayor de edad con documento uruguayo, uso personal sin fines comerciales, un máximo de 3 envíos por año y registro por única vez ante la DNA con identidad digital (RG DNA 10/2026, sistema LUCIA KIT). Al 2026-08-15 ese registro es voluntario.',
        },
        {
          name: 'Pagá dentro de los 30 días',
          text: 'Tenés 30 días desde el ingreso al país para pagar los tributos, y 90 días para retirar del depósito; pasados esos plazos hay abandono no infraccional (Decreto 50/026 art. 14). El cupo anual se imputa por fecha de desaduanamiento, no por fecha de compra. Si el envío queda retenido, el trámite es presencial con agenda previa y el almacenamiento durante la demora lo pagás vos.',
        },
        {
          name: 'Si te declararon el régimen que no era',
          text: 'No hay norma ni FAQ que diga si el régimen se puede cambiar después de presentada la declaración: la RG DNA 14/2026 lo trata como un campo que el declarante determina, y nada más. Reclamale primero al operador que declaró. Si no lo corrige, la DNA atiende en info@aduanas.gub.uy y 2 915 00 07 (lunes a viernes de 9 a 17); el Correo Uruguayo, en el 0800 2108.',
        },
      ],
      pitfalls: [
        'Que te lo compre y lo pague otra persona: la titularidad del medio de pago tiene que coincidir con la del comprador y la del destinatario. Si no coincide, se pierde la franquicia y va al 60%.',
        'No mirar qué régimen se declaró. El campo Tipo de envío lo determina el declarante y la norma no resuelve si se puede cambiar después: entre G (22% de IVA) y H (60% del valor) la diferencia se decide antes de presentar la declaración.',
        'Declarar menos de lo que dice la factura: la multa es igual al doble de los tributos que debían pagarse, la reincidencia dentro de 12 meses prohíbe operar en el régimen por 12 meses, y esa operación pierde la franquicia y no consume cupo.',
        'Creer que el mínimo de US$ 20 sólo se aplica al 60%. Está en la ley del IVA y corre también con franquicia, porque la ropa no es un bien exonerado.',
        'Meter un perfume o un cosmético gravado por IMESI en la misma caja que la ropa: lo gravado por IMESI queda fuera del régimen postal entero, ni franquicia ni 60%.',
        'Guiarte por los topes de US$ 50 y US$ 200 que el Correo Uruguayo todavía publica en el paso 3 de su instructivo. Son del Decreto 356/014, derogado. Los topes vigentes son US$ 800 de factura y 20 kg por envío.',
      ],
    },
    considerations: [
      'El piso de US$ 20 castiga las compras chicas. Una remera de US$ 30 pagaría US$ 6,60 al 22%, pero el mínimo lo lleva a US$ 20: dos tercios del precio de la prenda. Recién por encima de US$ 90,91 el 22% supera al piso y el impuesto vuelve a ser proporcional.',
      'Por eso conviene juntar prendas en un mismo envío en vez de mandar pedidos sueltos: el mínimo es por envío, no por prenda. La contra es que tenés 3 envíos por año y el cupo de US$ 800 se agota igual.',
      'Entre franquicia y prestación única, para ropa la cuenta no tiene vuelta: 22% contra 60% sobre el mismo valor. La única razón sensata para pagar el 60% es guardar los envíos de franquicia para una compra más cara o ya haber consumido el cupo.',
      'Los 20 kg se llenan rápido con abrigo y calzado. Es un tope por envío, independiente del de US$ 800: podés quedarte corto de plata y largo de peso, o al revés.',
      'El valor incluye todos los conceptos que figuren adicionados en la factura. Si la tienda te factura el envío en la misma factura, ese envío suma al valor y también al cupo.',
      'Si comprás en Estados Unidos y el total no pasa de US$ 200, el envío puede quedar exonerado por acuerdo comercial. Guardá la factura donde figure el vendedor: la residencia fiscal se acredita con ella, y desde el 1/10/2026 además hay que mirar que el emisor esté registrado ante la DNA.',
      'La franquicia es para uso personal sin fines comerciales: traer un lote de ropa para revender no entra por ahí. Y el IVA que pagás como particular es definitivo: no se deduce ni se recupera.',
    ],
    faqs: [
      {
        q: '¿Cuánto pago por unas zapatillas de US$ 150?',
        a: 'Con franquicia, IVA del 22% sobre el valor de factura: US$ 33. El mínimo de US$ 20 no muerde porque el impuesto ya lo supera. Con la prestación única, el 60% serían US$ 90: US$ 57 de diferencia en una sola compra. Y si el envío viniera de Estados Unidos con factura de hasta US$ 200, podría quedar exonerado por acuerdo comercial.',
      },
      {
        q: '¿Me conviene el 60% alguna vez con ropa?',
        a: 'Casi nunca por precio: el 60% es casi tres veces el 22%. Sirve como decisión de cupo, no de plata. Si te quedan pocos envíos en el año y esperás una compra grande, pagar el 60% por una compra chica deja libres los envíos de franquicia. Tené presente que el mínimo de US$ 20 corre en los dos regímenes, así que en compras muy chicas la diferencia entre uno y otro se achica.',
      },
      {
        q: 'Me lo manda mi hermana de regalo, ¿pago algo?',
        a: 'Si es un envío no comercial entre personas físicas, con mercadería en cantidades razonables y para uso personal, está exento de todo tributo. Igual consume cupo de tus 3 envíos anuales. Como no hay compra, no hay factura: el valor va por declaración de valor. La norma pide que las cantidades sean razonables y no fija ninguna cifra.',
      },
      {
        q: '¿Un reloj, una cartera o bisutería entran igual que la ropa?',
        a: 'Sí, en cuanto a impuestos: 22% de IVA, sin exención propia y sin trámites de otros organismos. El Anexo del Decreto 50/026 los trata como rubros separados a la hora de declarar (Vestimenta y manufacturas textiles, Calzado, Bolsos, carteras y mochilas, Relojes y sus partes, Bisutería), pero eso es un rubro estadístico y declarativo, no un tratamiento tributario distinto. La excepción es el reloj inteligente, que es electrónica.',
      },
      {
        q: '¿Necesito despachante o algún certificado?',
        a: 'No. Ninguna operación del régimen postal exige despachante (Decreto 50/026 art. 17 y Ley 20.446 art. 627), y la ropa no está controlada por el MSP, URSEC ni el MGAP. En el despacho formal, fuera del régimen postal, la intervención del despachante es la regla (CAROU art. 14).',
      },
      {
        q: 'Vi en la página del Correo que el tope es US$ 200, ¿en qué quedamos?',
        a: 'Esa página está desactualizada. El instructivo del Correo Uruguayo, en el paso 3, todavía publica los topes de US$ 50 para envíos no exprés y US$ 200 para EMS como condición de la franquicia: son del Decreto 356/014, derogado. Lo mismo pasa con varias páginas de la propia Aduana anteriores al Decreto 50/026. Los números vigentes son US$ 800 anuales, 3 envíos y 20 kg por envío, y el mínimo de IVA es US$ 20, no US$ 10.',
      },
    ],
    sources: [
      {
        label: 'Título 10 T.O. 2023 art. 34 — tasas del IVA',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/34_T10',
        note: 'Fija la tasa básica del 22%, que es la que paga la ropa por regla residual.',
      },
      {
        label: 'Título 10 T.O. 2023 art. 36 — tasa mínima',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/36_T10',
        note: 'La lista del 10%. La ropa, el calzado y los accesorios no figuran.',
      },
      {
        label: 'Título 10 T.O. 2023 art. 38 — exoneraciones',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/38_T10',
        note: 'La lista de bienes exonerados. Tampoco figura la ropa: por eso el piso de US$ 20 corre siempre.',
      },
      {
        label: 'Ley 20.446 art. 660 — mínimo de US$ 20 de IVA en envíos postales',
        url: 'https://www.impo.com.uy/bases/leyes/20446-2025/660',
        note: 'Agrega el inciso que fija la base sobre el valor de factura y el piso de US$ 20.',
      },
      {
        label: 'Ley 20.446 art. 627 — franquicia y prestación única',
        url: 'https://www.impo.com.uy/bases/leyes/20446-2025/627',
        note: 'US$ 800 anuales en 3 envíos exentos de aranceles; el 60% es opcional (podrá optar).',
      },
      {
        label: 'Decreto 50/026 — reglamento del régimen postal',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
        note: 'Valor (art. 5), medio de pago y requisitos (art. 4), exoneraciones de origen y obsequio (art. 3), plazos (art. 14), sin despachante (art. 17) y el Anexo de rubros de declaración.',
      },
      {
        label: 'RG DNA 11/2026 (PDF)',
        url: 'https://www.aduanas.gub.uy/innovaportal/file/28447/1/rg-11_2026.pdf',
        note: 'Num. 28 lit. c: los códigos del campo Tipo de envío (G franquicia, H prestación única, J exceptuados). Num. 27 repite el mínimo de US$ 20.',
      },
      {
        label: 'DNA — preguntas frecuentes del régimen 2026',
        url: 'https://www.aduanas.gub.uy/innovaportal/v/28231/1/innova.front/',
        note: 'Imputación del cupo por fecha de desaduanamiento y pérdida de franquicia si pagó un tercero. No menciona el mínimo de US$ 20 al explicar la franquicia.',
      },
      {
        label: 'Correo Uruguayo — cómo declarar su compra u obsequio',
        url: 'https://www.correo.com.uy/como-declarar-su-compra-u-obsequio',
        note: 'El formulario web con tracking de 13 caracteres. Atención: el paso 3 sigue publicando los topes derogados de US$ 50 y US$ 200.',
      },
    ],
    verifiedAt: '2026-08-15',
  },
  {
    slug: 'juguetes',
    productTypeId: 'juguetes',
    title: 'Importar juguetes a Uruguay: impuestos, exenciones y cómo declararlo',
    navLabel: 'Juguetes y hobby',
    description:
      'Los juguetes pagan 22% de IVA aun usando la franquicia, y en el régimen postal el IVA no baja de US$ 20 por envío: debajo de US$ 90,91 ese piso es el costo real.',
    icon: 'mdi-toy-brick',
    examples: [
      'Sets de bloques tipo Lego',
      'Muñecas y figuras de acción',
      'Juegos de mesa importados',
      'Autos y aviones a control remoto',
      'Consolas y videojuegos',
      'Puzzles, maquetas y modelismo',
      'Coleccionables y figuras de vinilo',
      'Drones de hobby',
    ],
    notIncluded: [
      'Réplicas, airsoft y pistolas de aire comprimido: la DNA las lista como mercadería controlada por el SMA y ese permiso no tiene modalidad para persona física',
      'Pirotecnia de estruendo: prohibida por la Ley 20.246 art. 1 para uso comercial o domiciliario',
      'Miras térmicas y de visión nocturna: sólo por empresas registradas ante el SMA (Decreto 345/020)',
      'Armas: la DNA no las admite en el régimen de encomiendas postales internacionales',
    ],
    regimes: {
      franquicia: {
        verdict: 'IVA 22%, mínimo US$ 20',
        detail:
          'La franquicia exonera aranceles, pero el IVA se sigue liquidando (Ley 20.446 art. 627 inc. 2) y los juguetes no tienen ninguna exoneración ni tasa mínima: van al 22% por regla residual. En el régimen postal el IVA se calcula sobre el valor de factura o la declaración de valor y no puede ser inferior a US$ 20 por envío (Título 10 art. 13 lit. B inciso 3, agregado por la Ley 20.446 art. 660). Ese piso muerde en todo juguete de menos de US$ 90,91.',
        tone: 'warn',
      },
      prestacionUnica: {
        verdict: '60% del valor, mínimo US$ 20',
        detail:
          'Es opcional: la ley dice que el titular "podrá optar" por pagarla, y sustituye toda la tributación de la importación, arancelaria e interna. Para un juguete casi siempre es peor que el 22% de la franquicia. La excepción es la parte baja de la tabla: por debajo de US$ 33 el 60% también choca contra el mínimo de US$ 20 por envío, así que las dos puertas terminan costando lo mismo. A cambio, no usa la franquicia y por lo tanto no consume uno de los 3 envíos anuales.',
        tone: 'warn',
      },
      general: {
        verdict: 'IVA 22% + arancel + 5% de tasa consular',
        detail:
          'Si el envío pasa de US$ 800 de factura o de 20 kg, queda fuera del canal postal y va a despacho formal. Ahí el IVA se calcula sobre el valor en aduana (CIF) más el arancel, y para un particular esa suma se incrementa un 50% (Título 10 art. 13 lit. B). Se suma la tasa consular del 5% —3% si viene amparada en el ACE N.º 18 del Mercosur— cuyas exoneraciones son taxativas y no alcanzan a los juguetes. El arancel depende del NCM del producto y no hay una alícuota verificada para el rubro.',
        tone: 'warn',
      },
    },
    taxes: [
      {
        concept: 'IVA',
        value: '22%',
        detail:
          'Tasa básica del art. 34 del Título 10. Los juguetes no figuran ni en la lista de tasa mínima (art. 36) ni entre las exoneraciones (art. 38), así que caen en la regla residual. No hay ningún beneficio de IVA propio de la categoría.',
        source: {
          label: 'Título 10 T.O. 2023 art. 34',
          url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/34_T10',
        },
      },
      {
        concept: 'Mínimo de IVA en envíos postales',
        value: 'US$ 20 por envío',
        detail:
          'En el régimen postal el IVA se aplica sobre el valor de factura o la declaración de valor, y "en ningún caso" puede ser inferior a US$ 20, salvo que el envío esté integrado exclusivamente por bienes cuya importación está exonerada de este impuesto. Un juguete de US$ 30 paga los US$ 20 igual: 66% efectivo. Aviso honesto: ni las FAQ del MEF ni las de la DNA mencionan este mínimo cuando explican la franquicia (sólo lo citan para el 60%), y no existe ningún ejemplo numérico oficial de una compra con franquicia pagando IVA.',
        source: {
          label: 'Ley 20.446 art. 660',
          url: 'https://www.impo.com.uy/bases/leyes/20446-2025/660',
        },
      },
      {
        concept: 'Prestación única',
        value: '60% del valor (mín. US$ 20)',
        detail:
          'Sustituye toda la tributación de la importación definitiva, arancelaria e interna. Es una opción del titular, no una liquidación automática: si no querés gastar cupo, se paga; si el juguete es caro, es la puerta más cara.',
        source: {
          label: 'Ley 20.446 art. 627',
          url: 'https://www.impo.com.uy/bases/leyes/20446-2025/627',
        },
      },
      {
        concept: 'Arancel',
        value: '0% con franquicia',
        detail:
          'La franquicia anual de US$ 800 es expresamente exenta de aranceles, y el 60% de la prestación única ya los incluye. El arancel sólo reaparece fuera del canal postal, donde depende del NCM: no hay alícuota verificada partida por partida para juguetes.',
        source: {
          label: 'Ley 20.446 art. 627',
          url: 'https://www.impo.com.uy/bases/leyes/20446-2025/627',
        },
      },
      {
        concept: 'IMESI',
        value: 'Sin norma que lo grave',
        detail:
          'No se verificó ninguna norma que someta juguetes al IMESI. Importa más de lo que parece: la mercadería gravada por IMESI queda fuera del régimen postal entero, sin franquicia y sin 60% (Ley 20.446 art. 633). Los juguetes no tienen ese problema.',
        source: {
          label: 'Ley 20.446 art. 633',
          url: 'https://www.impo.com.uy/bases/leyes/20446-2025/633',
        },
      },
      {
        concept: 'Tasa consular',
        value: '5% (3% Mercosur), en el régimen general',
        detail:
          'Se calcula sobre el valor en aduana. Sus exoneraciones son taxativas —admisión temporaria, petróleo crudo y ciertos combustibles, y bienes de capital de uso industrial, agropecuario o pesquero— y ninguna alcanza a los juguetes. El Poder Ejecutivo está facultado a bajarla y no lo hizo.',
        source: {
          label: 'Ley 19.535 art. 265',
          url: 'https://www.impo.com.uy/bases/leyes/19535-2017/265',
        },
      },
    ],
    benefits: [
      {
        title: 'Obsequio familiar: exento de todo tributo',
        detail:
          'El envío no comercial entre personas físicas, con mercadería en cantidades razonables y para uso personal, queda exento de todo tributo. Es la vía real para el juguete que te manda un familiar del exterior. Sí consume cupo del año. Tiene que declararse como obsequio, no como compra. Un matiz que conviene tener presente: la norma exonera el envío, y el piso de US$ 20 del IVA está redactado para levantarse cuando el envío está integrado exclusivamente por bienes exonerados; cómo juegan exactamente las dos reglas entre sí no lo resuelve ninguna norma ni FAQ publicada.',
        norm: 'Decreto 50/026 art. 3',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
      },
      {
        title: 'Origen con acuerdo comercial: hasta US$ 200 exonerados',
        detail:
          'Los envíos de hasta US$ 200 provenientes de países con acuerdo comercial (el caso del TIFA con Estados Unidos) están exonerados dentro de la franquicia. La residencia fiscal del vendedor se acredita con la factura. Desde el 1/10/2026 el emisor de la factura tiene que estar registrado ante la DNA; si no lo está, no se aplica la exoneración.',
        norm: 'Decreto 50/026 art. 3',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
      },
      {
        title: 'Franquicia anual: sin aranceles',
        detail:
          'Hasta US$ 800 por año civil en un máximo de 3 envíos, exentos de aranceles. Es el único beneficio genérico al que accede un juguete: no hay exoneración de IVA para la categoría. Quien no cumple los requisitos del art. 4 —mayor de edad con documento uruguayo, uso personal sin fines comerciales— no accede.',
        norm: 'Ley 20.446 art. 627 y Decreto 50/026 art. 4',
        url: 'https://www.impo.com.uy/bases/leyes/20446-2025/627',
      },
    ],
    procedures: [
      {
        organism: 'URSEC',
        when: 'Sólo si el juguete transmite por radio fuera de Wi-Fi y Bluetooth. La propia URSEC declara que no es necesaria su intervención para dispositivos que operen únicamente con Wi-Fi 4, 5 o 6 y/o Bluetooth —en la resolución, equipos que funcionan únicamente en 2,4 GHz y/o 5,8 GHz con estándares Wi-Fi 802.11 o Bluetooth 802.15, y los ejemplos que se nombran son auriculares, mouse, smartwatch, joystick, cámaras y similares—. SÍ hace falta para un dron con radioenlace propietario, y para cualquier equipo con módem celular o GPS. La excepción está escrita por tecnología, no por producto: fijate en la ficha técnica antes que en la caja.',
        how: 'Lo inicia la propia persona física en VUCE: trámite "Certificado para habilitar el ingreso al país de equipos radioeléctricos bajo el régimen de franquicia (Persona Física)". Costo publicado $239, y $852 si además el equipo requiere homologación. URSEC tiene 2 días hábiles de plazo máximo; la homologación, cuando corresponde, puede llevar hasta 120 días. Aprobado, el certificado se envía automáticamente al sistema de la Aduana. No está publicado cuánto tiempo vale ese certificado ni si sirve para más de un envío.',
        url: 'https://www.gub.uy/tramites/certificado-para-habilitar-ingreso-al-pais-equipos-radioelectricos-bajo-regimen-franquicia-persona-fisica',
      },
      {
        organism: 'SMA',
        when: 'Réplicas, airsoft y pistolas de aire comprimido. Acá hay que ser preciso: no hay norma vigente que regule airsoft ni réplicas. Ni la Ley 19.247 ni los Decretos 377/016 y 345/020 mencionan "aire comprimido", "réplica" ni "airsoft". Lo único concreto es que la DNA lista "pistolas de aire comprimido" entre las mercaderías controladas por el SMA: es criterio administrativo del organismo, no norma.',
        how: 'El permiso del SMA se tramita en VUCE como empresa o despachante y cuesta 2 UR: no existe modalidad para persona física. En los hechos, un particular no tiene por dónde tramitarlo. Y si la mercadería requiere autorización y carece de ella, el Decreto 50/026 art. 7 la deja fuera del régimen entero: ni franquicia ni 60%, con devolución a origen a tu costo dentro de los 30 días. La página de la Aduana que lista los organismos controladores es del 09/01/2026, anterior al Decreto 50/026, y la propia DNA aclara que es orientativa y no taxativa.',
        url: 'https://www.aduanas.gub.uy/innovaportal/v/28229/1/innova.front/',
      },
    ],
    declare: {
      intro:
        'El juguete no tiene un canal especial de declaración: va por el mismo circuito que la ropa o la electrónica. Lo que decide cuánto pagás es un campo de la declaración —el tipo de envío— y quien declara ante la Aduana es el operador postal o courier, no vos. Por eso conviene saber qué tiene que decir.',
      steps: [
        {
          name: 'Antes de comprar, revisá tres cosas',
          text: 'Si transmite por radio distinto de Wi-Fi o Bluetooth, necesitás el certificado de URSEC previo. Si trae batería de litio, el Correo Uruguayo por política propia no lo admite en envíos internacionales y por vía aérea la restricción es de IATA/OACI, con cada aerolínea u operador decidiendo. Si es réplica o airsoft, no hay vía para persona física. Estos tres filtros se resuelven antes de pagar, no después.',
        },
        {
          name: 'Pagá con tu propia tarjeta',
          text: 'El medio de pago tiene que ser tarjeta de crédito o débito internacional, o dinero electrónico internacional emitido por una institución regulada por el BCU, y la titularidad tiene que coincidir con quien compra y con el destinatario del envío. Si la compra la paga un tercero, se pierde la franquicia y la operación se liquida al 60%.',
        },
        {
          name: 'Guardá la factura y declará el valor completo',
          text: 'El valor es el total de la factura original de compra, incluidos todos los conceptos que figuren adicionados en ella. El envío tiene que ir acompañado de la documentación que acredite ese valor. Un set de bloques con envío facturado aparte sigue valiendo lo que dice la factura: no lo recortes.',
        },
        {
          name: 'Si llega por Correo Uruguayo, declaralo vos primero',
          text: 'Entrá al formulario web del Correo ("Ahíva") con el número de tracking de 13 caracteres y datos idénticos a los de tu cédula. Ahí elegís compra u obsequio, si usás franquicia y el medio de pago. Ojo: el paso 3 de esa página todavía publica los topes derogados de US$ 50 y US$ 200 del viejo Decreto 356/014. Ignorá esas cifras: los topes vigentes del régimen son US$ 800 de factura y 20 kg.',
        },
        {
          name: 'Verificá el tipo de envío que declara el operador',
          text: 'La declaración aduanera lleva un campo "Tipo de envío": "G" es franquicia y "H" es prestación única del 60%. El grupo "J" es para envíos exceptuados del pago de tributos y sus subcategorías publicadas son J/01 (material al amparo de la Ley 15.913), J/02 (medicamentos de uso personal), J/03 (numismática) y J/04 (valija diplomática): ningún juguete entra ahí. Pedile al operador que confirme cuál declaró. No hay norma ni FAQ que diga si el régimen se puede cambiar después de presentada la declaración: asumí que no.',
        },
        {
          name: 'Elegí el rubro correcto',
          text: 'El Anexo del Decreto 50/026 obliga a registrar cada envío en un rubro codificado. Para esta categoría los que corresponden son "Juguetes, juegos y artículos para recreo", "Videojuegos y consolas", "Artículos deportivos", "Artículos para fiestas" o "Bisutería. Objetos de arte o colección y antigüedades". Es un rubro estadístico y declarativo: no define exoneraciones, pero un rubro mal puesto es una inconsistencia visible para la Aduana.',
        },
        {
          name: 'Pagá dentro de los 30 días',
          text: 'Tenés 30 días desde el ingreso al país para pagar los tributos y 90 días para retirar del depósito; vencidos, hay abandono no infraccional. Si el envío queda retenido, el trámite es presencial con agenda previa, los certificados de otros organismos se llevan en papel y el almacenamiento durante la demora lo pagás vos.',
        },
      ],
      pitfalls: [
        'Dejar que el operador declare el régimen por defecto sin preguntar. Es el campo que decide entre 22% y 60%, y no hay norma ni FAQ que diga si se puede cambiar después de presentada la declaración.',
        'Que la compra la pague otra persona. La titularidad del medio de pago tiene que coincidir con el comprador y el destinatario; si no, se cae la franquicia y va al 60%.',
        'Declarar como obsequio familiar un juguete que compraste vos. La exención del art. 3 es para envíos no comerciales entre personas físicas; declarar de menos habilita la multa del art. 632: el doble de los tributos que debiste pagar, más la pérdida de la franquicia de esa operación.',
        'Bajar el valor de factura para esquivar el mínimo de US$ 20. La reincidencia dentro de los 12 meses te prohíbe operar en el régimen por 12 meses.',
        'Suponer que con franquicia un juguete barato no paga nada. El piso de US$ 20 de IVA no se salva por ser franquicia; sólo lo salva un envío integrado exclusivamente por bienes exonerados, y un juguete no lo es.',
        'Comprar el dron o el auto RC y tramitar URSEC recién cuando la Aduana lo retiene. Sin el certificado previo la mercadería queda fuera del régimen entero, no simplemente demorada.',
      ],
    },
    considerations: [
      'El costo real de un juguete barato no es el 22%: es el piso de US$ 20. Un juguete de US$ 25 paga US$ 20; uno de US$ 60 también. Recién a partir de los US$ 90,91 el 22% supera el mínimo y el porcentaje empieza a mandar. Como el piso es por envío, juntar varias cosas chicas en un solo envío paga un solo mínimo.',
      'Debajo de US$ 33 da igual la franquicia que el 60%: las dos terminan en US$ 20. Ahí la única diferencia es el cupo, porque la franquicia se limita a 3 envíos y US$ 800 por año civil y esos tres envíos se agotan rápido.',
      'Los 20 kg por envío son un tope independiente del de US$ 800, y en juguetes se llega antes por volumen que por precio: casas de muñecas, pistas, sets grandes. Un envío barato pero pesado también sale del canal postal.',
      'El cupo se imputa por fecha de desaduanamiento, no por fecha de compra. Un pedido de diciembre que despacha en enero cae en el cupo del año siguiente: útil para planificar regalos de fin de año.',
      'Batería de litio: no hay prohibición aduanera uruguaya, es una restricción de transporte aéreo IATA/OACI y cada aerolínea u operador decide. El Correo Uruguayo, por política propia, no admite baterías de litio en envíos internacionales. No hay ninguna cifra oficial uruguaya de Wh: desconfiá de cualquier página que te dé un número.',
      'Un juguete que opere únicamente con Wi-Fi o Bluetooth no necesita URSEC, pero el criterio es la tecnología de radio, no la categoría del producto. Si el control remoto usa un enlace propietario, el trámite existe y son $239 más 2 días hábiles de plazo máximo.',
      'Si coleccionás monedas, la declaración tiene un código propio (J/03, numismática) dentro del grupo de envíos exceptuados del pago de tributos. Más allá de la existencia del código, la norma no resuelve el alcance de ese grupo para un particular: preguntale al operador antes de asumir que no pagás.',
    ],
    faqs: [
      {
        q: 'Compré un juguete de US$ 30 con franquicia, ¿pago algo?',
        a: 'Sí. El 22% de US$ 30 son US$ 6,60, pero en el régimen postal el IVA no puede ser inferior a US$ 20 por envío, así que pagás US$ 20. La franquicia te exime de aranceles, no del IVA. Vale una advertencia: ni las preguntas frecuentes del MEF ni las de la DNA mencionan ese mínimo cuando explican la franquicia —lo citan sólo para la prestación única del 60%— y no hay ningún ejemplo numérico oficial de una compra con franquicia liquidando IVA. El texto de la ley es claro; la comunicación oficial, no.',
      },
      {
        q: '¿La consola o el joystick necesitan permiso de URSEC?',
        a: 'No, si operan únicamente con Wi-Fi 4, 5 o 6 y/o Bluetooth: la propia URSEC declara que no interviene en esos casos, y entre los ejemplos que se nombran están auriculares, mouse, smartwatch, joystick y cámaras. Sí necesitan certificado los equipos con módem celular o GPS. Un dron es el caso limítrofe: si se comunica por Wi-Fi o Bluetooth en 2,4 o 5,8 GHz no requiere URSEC, y si usa un protocolo propietario de radioenlace, sí. DINACIA, por su parte, no tiene trámite de permiso de importación de drones: lleva un Registro de Drones gratuito en utm.dinacia.gub.uy.',
      },
      {
        q: '¿Puedo traer un airsoft o una réplica por correo?',
        a: 'En la práctica, no. No hay norma vigente que regule airsoft, réplicas ni armas de aire comprimido en Uruguay: el proyecto de ley sobre armas de aire comprimido no fue sancionado. Lo que sí existe es que la Aduana lista "pistolas de aire comprimido" entre las mercaderías controladas por el SMA, y eso es criterio administrativo, no norma. El permiso del SMA se tramita en VUCE únicamente como empresa o despachante, sin modalidad para persona física. Y si la mercadería requiere autorización y carece de ella, el envío queda fuera del régimen entero: no hay opción de pagar el 60% y quedarse tranquilo. Las armas, directamente, la DNA no las admite en encomiendas postales internacionales.',
      },
      {
        q: 'Mi hermana me manda un juguete de regalo desde el exterior, ¿pago IVA?',
        a: 'Si califica como obsequio familiar —envío no comercial entre personas físicas, mercadería en cantidades razonables y para uso personal— queda exento de todo tributo. Ese envío igual consume cupo de tu año. La clave está en la declaración: hay que marcarlo como obsequio y no como compra. Si lo compraste vos y pedís que te lo manden como regalo, eso ya no es un obsequio y entrás en el terreno del art. 632, que castiga con el doble de los tributos que debieron pagarse.',
      },
      {
        q: '¿Me conviene pagar el 60% en lugar de usar la franquicia?',
        a: 'Para juguetes, casi nunca por plata: el 22% siempre es menos que el 60%. La única zona donde da igual es por debajo de US$ 33, porque ahí las dos rutas chocan contra el mínimo de US$ 20. Lo que sí puede convenir es no gastar cupo: la franquicia son 3 envíos y US$ 800 por año civil, y si esperás una compra grande más adelante, quemar un envío en un juguete de US$ 25 es caro en términos de cupo. La opción es tuya: la ley dice que el titular "podrá optar", pero el régimen se determina en la declaración que presenta el operador postal, así que hay que pedirla.',
      },
      {
        q: '¿Y si el pedido supera los US$ 800 o los 20 kg?',
        a: 'Sale del régimen postal y va a despacho formal por régimen general. Ahí el IVA se calcula sobre el valor en aduana —CIF, o sea con flete, gastos de manipulación y seguro adentro— más el arancel, y para un particular esa base se incrementa un 50%. Se agrega la tasa consular del 5%, o 3% si viene amparada en el ACE N.º 18 del Mercosur, y el arancel según el NCM del producto: no hay una alícuota verificada para juguetes. Conviene partir la compra en envíos que respeten los dos topes antes que discutir con la calculadora del despacho.',
      },
    ],
    sources: [
      {
        label: 'Ley 20.446 art. 627 — régimen de envíos postales',
        url: 'https://www.impo.com.uy/bases/leyes/20446-2025/627',
        note: 'Franquicia de US$ 800 exenta de aranceles con el IVA subsistente, y la prestación única del 60% como opción del titular.',
      },
      {
        label: 'Ley 20.446 art. 660 — mínimo de IVA en envíos postales',
        url: 'https://www.impo.com.uy/bases/leyes/20446-2025/660',
        note: 'Agrega el inciso 3 al art. 13 lit. B del Título 10: el IVA se liquida sobre el valor de factura o declaración de valor y en ningún caso puede ser inferior a US$ 20, salvo envío integrado exclusivamente por bienes exonerados.',
      },
      {
        label: 'Decreto 50/026 — reglamento del régimen',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
        note: 'Exoneraciones del art. 3 (obsequio familiar y origen con acuerdo comercial), valor del art. 5, exclusión del art. 7 sin autorización, plazos del art. 14 y rubros del Anexo.',
      },
      {
        label: 'Título 10 T.O. 2023 art. 34 — tasas del IVA',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/34_T10',
        note: 'Tasa básica 22%, la que aplica a juguetes por regla residual.',
      },
      {
        label: 'Título 10 T.O. 2023 art. 38 — exoneraciones del IVA',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/38_T10',
        note: 'La nómina donde los juguetes no figuran: por eso no hay exención de categoría.',
      },
      {
        label: 'RG DNA 11/2026',
        url: 'https://www.aduanas.gub.uy/innovaportal/file/28447/1/rg-11_2026.pdf',
        note: 'Códigos de tipo de envío G (franquicia), H (60%) y J (exceptuados, con J/03 numismática), y el mínimo de US$ 20 en el numeral 27 del Anexo I.',
      },
      {
        label: 'URSEC — certificado de ingreso de equipos radioeléctricos (persona física)',
        url: 'https://www.gub.uy/tramites/certificado-para-habilitar-ingreso-al-pais-equipos-radioelectricos-bajo-regimen-franquicia-persona-fisica',
        note: 'Costo, plazos y la excepción textual para dispositivos que operen únicamente con Wi-Fi o Bluetooth.',
      },
      {
        label: 'DNA — productos que requieren permisos o no pueden ingresar',
        url: 'https://www.aduanas.gub.uy/innovaportal/v/28229/1/innova.front/',
        note: 'Lista los organismos controladores, incluido el SMA para pistolas de aire comprimido. Atención: la página es del 09/01/2026, anterior al Decreto 50/026, y la propia DNA aclara que es orientativa y no taxativa.',
      },
      {
        label: 'Correo Uruguayo — cómo declarar su compra u obsequio',
        url: 'https://www.correo.com.uy/como-declarar-su-compra-u-obsequio',
        note: 'El formulario web con el tracking de 13 caracteres. Su paso 3 todavía publica los topes derogados de US$ 50 y US$ 200: son del Decreto 356/014, ya sin vigencia.',
      },
    ],
    verifiedAt: '2026-08-15',
  },
  {
    slug: 'medicamentos',
    productTypeId: 'medicamentos',
    title: 'Importar medicamentos a Uruguay: IVA, permiso del MSP y cómo declarar',
    navLabel: 'Medicamentos',
    description:
      'Los medicamentos pagan IVA al 10% con un mínimo de US$ 20 por envío, pero el MSP sólo habilita el ingreso por particulares en un caso: producto no registrado en el país.',
    icon: 'mdi-pill',
    examples: [
      'una especialidad farmacéutica que acá no está registrada',
      'la medicación de un tratamiento que te manda un familiar del exterior',
      'un genérico comprado en una farmacia online porque acá sale más caro',
      'medicación crónica que se discontinuó en plaza',
      'un repelente corporal contra mosquitos registrado ante el MSP',
      'un remedio de venta libre comprado junto con otras cosas',
    ],
    notIncluded: [
      'vitaminas y suplementos: pagan 22%, no la tasa mínima',
      'productos médicos, tiras reactivas, anteojos y lentes de contacto',
      'cosméticos, protectores solares y perfumería',
      'psicofármacos y estupefacientes: trámite VUCE sólo para empresas',
    ],
    regimes: {
      franquicia: {
        verdict: 'IVA 10%, mínimo US$ 20',
        detail:
          'La franquicia exime aranceles pero el IVA se sigue liquidando (Ley 20.446 art. 627 inc. 2). Los medicamentos y especialidades farmacéuticas están en la tasa mínima del 10% (Título 10 art. 36 lit. B), no exonerados, así que les corre el piso de US$ 20 de IVA por envío. Y todo esto recién importa si antes conseguiste la autorización del MSP: sin ella el envío no entra por ningún régimen.',
        tone: 'warn',
      },
      prestacionUnica: {
        verdict: '60% del valor, mínimo US$ 20',
        detail:
          'Existe como opción —la ley dice que el titular podrá optar— y sustituye toda la tributación de la importación. Para medicamentos casi nunca conviene: pagar 60% cuando el IVA es 10% sólo tiene sentido si perdiste la franquicia, por ejemplo porque pagó un tercero. La excepción de cupo del RG DNA 11/2026 num. 26 está escrita sobre requisitos de la franquicia; cómo juega por esta vía, la norma no lo resuelve.',
        tone: 'warn',
      },
      general: {
        verdict: 'DUA, y el permiso no cambia',
        detail:
          'Arriba de US$ 800 o 20 kg salís del canal postal: valor CIF, arancel según NCM, tasa consular 5% (Ley 19.535 art. 265, cuyas exoneraciones son taxativas y no incluyen medicamentos) e IVA al 10% sobre valor en aduana más arancel, suma que para un no contribuyente se incrementa un 50% (Título 10 art. 13 lit. B). La barrera sanitaria del MSP es exactamente la misma.',
        tone: 'warn',
      },
    },
    taxes: [
      {
        concept: 'IVA',
        value: '10% (tasa mínima)',
        detail:
          'Medicamentos y especialidades farmacéuticas están listados en la tasa mínima (Título 10 art. 36 lit. B, reglamentado por el Decreto 220/998 art. 101 lit. b). No están exonerados: pagan, sólo que a la mitad de la tasa básica.',
        source: {
          label: 'Título 10 art. 36',
          url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/36_T10',
        },
      },
      {
        concept: 'Piso de IVA del régimen postal',
        value: 'Mínimo US$ 20 por envío',
        detail:
          'La Ley 20.446 art. 660 agregó que el IVA de un envío postal no puede ser inferior a US$ 20, salvo que el envío esté integrado exclusivamente por bienes exonerados. El medicamento no está exonerado, así que el piso corre: a la tasa mínima muerde en toda compra por debajo de US$ 200. Aviso honesto: ni las FAQ del MEF ni las de la DNA mencionan este mínimo al explicar la franquicia, y no hay ningún ejemplo numérico oficial de una compra con franquicia pagando IVA.',
        source: {
          label: 'Ley 20.446 art. 660',
          url: 'https://www.impo.com.uy/bases/leyes/20446-2025/660',
        },
      },
      {
        concept: 'Arancel',
        value: '0% dentro de la franquicia',
        detail:
          'La franquicia anual es expresamente exenta de aranceles (Ley 20.446 art. 627). Fuera del régimen postal el arancel depende del NCM del producto; no hay alícuota verificada partida por partida.',
        source: {
          label: 'Ley 20.446 art. 627',
          url: 'https://www.impo.com.uy/bases/leyes/20446-2025/627',
        },
      },
      {
        concept: 'Prestación única',
        value: '60%, mínimo US$ 20',
        detail:
          'Sustituye toda la tributación de la importación definitiva, arancelaria e interna. Es opcional y, para un medicamento con IVA al 10%, es el camino caro.',
        source: {
          label: 'Decreto 50/026',
          url: 'https://www.impo.com.uy/bases/decretos/50-2026',
        },
      },
      {
        concept: 'Tasa consular',
        value: '5%, sólo fuera del canal postal',
        detail:
          'Se aplica sobre el valor en aduana en el despacho general (Ley 19.535 art. 265). Las exoneraciones son taxativas —admisión temporaria, ciertos combustibles y bienes de capital— y los medicamentos no figuran.',
        source: {
          label: 'Ley 19.535 art. 265',
          url: 'https://www.impo.com.uy/bases/leyes/19535-2017/265',
        },
      },
      {
        concept: 'IMESI',
        value: 'No aplica',
        detail:
          'El IMESI grava rubros determinados: bebidas alcohólicas, tabaco, cosméticos y perfumería, vehículos automotores y lubricantes. Los medicamentos no aparecen entre ellos en las normas relevadas. Importa mucho, porque lo gravado por IMESI queda fuera del régimen postal entero (Ley 20.446 art. 633).',
        source: {
          label: 'Ley 20.446 art. 633',
          url: 'https://www.impo.com.uy/bases/leyes/20446-2025/633',
        },
      },
      {
        concept: 'Anticipo de IVA',
        value: 'No lo paga el particular',
        detail:
          'El anticipo del Decreto 220/998 art. 115 es sólo para contribuyentes. Para vos el IVA de importación es definitivo: no se deduce ni se recupera.',
        source: {
          label: 'Decreto 220/998',
          url: 'https://www.impo.com.uy/bases/decretos/220-1998',
        },
      },
    ],
    benefits: [
      {
        title: 'Tasa mínima de IVA: 10% en vez de 22%',
        detail:
          'Medicamentos y especialidades farmacéuticas están en la nómina de la tasa mínima. Es un beneficio del producto, no del régimen: rige tanto en el canal postal como en un despacho general.',
        norm: 'Título 10 T.O. 2023 art. 36 lit. B + Decreto 220/998 art. 101 lit. b',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/36_T10',
      },
      {
        title: 'Repelentes corporales al 10%',
        detail:
          'Los repelentes corporales contra mosquitos registrados ante el MSP también entran en la tasa mínima, por el inciso agregado por el Decreto 51/016. Es la única extensión que pudimos verificar fuera del medicamento propiamente dicho.',
        norm: 'Decreto 220/998 art. 101 lit. b inc. 2',
        url: 'https://www.impo.com.uy/bases/decretos/220-1998',
      },
      {
        title: 'Fuera del cupo de US$ 800 y de los 3 envíos, con autorización del MSP',
        detail:
          'El Decreto 50/026 art. 4 inciso final exceptúa del cupo a los medicamentos de uso personal con la debida autorización del MSP. El RG DNA 11/2026 num. 26 va más lejos: exceptúa el numeral 25 lit. b) V, que es el que contiene los dos límites —los 3 envíos anuales y los US$ 800—, para libros y para medicamentos de uso personal, estos últimos con autorización del MSP. La autorización es la condición, no un detalle. Contra-evidencia que conviene tener a mano: una noticia oficial de la DNA del 28/04/2026 dice, sin mencionar excepción alguna, que todos los envíos de franquicia consumen tanto el cupo en dólares como el de los 3 envíos, y la excepción no aparece en la FAQ del MEF, en la FAQ de la DNA ni en la página del Correo.',
        norm: 'Decreto 50/026 art. 4 inciso final + RG DNA 11/2026 num. 26',
        url: 'https://www.aduanas.gub.uy/innovaportal/file/28447/1/rg-11_2026.pdf',
      },
      {
        title: 'Sin despachante',
        detail:
          'Ninguna operación del régimen postal exige despachante. Tampoco los medicamentos. El costo del trámite del MSP, además, es cero: es gratuito y se hace por internet.',
        norm: 'Decreto 50/026 art. 17 + Ley 20.446 art. 627',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
      },
    ],
    procedures: [
      {
        organism: 'MSP',
        when: 'Siempre, antes de comprar. El MSP dice textualmente que no autoriza el ingreso al país de productos de salud del exterior por particulares. No existe una franja general de uso personal que te dispense. La única puerta abierta es la excepción: producto no registrado en Uruguay, con prescripción médica específica, bajo responsabilidad del médico tratante y del prestador, con consentimiento informado, y cuando no exista ningún producto equivalente registrado en el país. Si el medicamento sí está registrado acá, esa puerta no aplica y no encontramos otra publicada.',
        how: 'Trámite MSP-DGS Ingreso de medicamentos no registrados, gratuito y por internet. Se presentan dos formularios firmados por el usuario, el médico tratante y la Dirección Técnica de tu prestador de salud, más el consentimiento informado (Decreto 18/020 reglamento anexo art. 19; Decreto 353/023). El canal es correo electrónico a la Unidad de Farmacovigilancia del Departamento de Medicamentos: farmacovigilancia@msp.gub.uy. No es VUCE. No hay cantidad máxima publicada: el médico declara cantidad a ingresar y duración del tratamiento, y se evalúa caso a caso. Ojo con dos trámites que se parecen y no sirven: Importación de medicamentos no registrados en nuestro país es sólo para laboratorios habilitados, y la constancia para transporte de medicamentos de uso personal es para llevarlos al exterior, no para traerlos.',
        url: 'https://www.gub.uy/tramites/ingreso-medicamentos-no-registrados-ciudadanos-uruguayos',
      },
    ],
    declare: {
      intro:
        'Con medicamentos el orden importa más que en cualquier otra categoría: primero el permiso, después la compra. El Decreto 50/026 art. 7 deja fuera del régimen a la mercadería que requiere autorización y carece de ella, y eso no es un recargo: es quedarse sin franquicia y sin el 60% al mismo tiempo. Estos son los pasos.',
      steps: [
        {
          name: 'Conseguí la autorización del MSP antes de pagar',
          text: 'Hablá con tu médico tratante y con la Dirección Técnica de tu prestador, armá los dos formularios y el consentimiento informado, y mandalos a farmacovigilancia@msp.gub.uy. Es gratis. Sin ese ida y vuelta resuelto, comprar es apostar.',
        },
        {
          name: 'Pagá con tu propia tarjeta',
          text: 'Tarjeta de crédito o débito internacional, o dinero electrónico internacional de una institución regulada por el BCU, y la titularidad tiene que coincidir con quien compra y con el destinatario. Si pagó un tercero se pierde la franquicia y la operación se liquida al 60% (Decreto 50/026 art. 15 y FAQ de la DNA). Con IVA al 10%, esa diferencia duele.',
        },
        {
          name: 'Guardá la documentación completa desde el día uno',
          text: 'Factura original de compra —el valor declarado es el total de la factura con todos los conceptos adicionados—, la receta y la autorización del MSP. Si no hay factura, va declaración de valor. Todo esto es lo que después te van a pedir en papel si el envío queda retenido.',
        },
        {
          name: 'Pedí que se declare como tipo de envío J/02',
          text: 'La declaración aduanera lleva un campo Tipo de envío con códigos: G es franquicia, H es prestación única y J agrupa los envíos que, en el texto de la resolución, por su contenido, características o por aplicación de la normativa vigente se encuentren exceptuados del pago de tributos. Una de sus subcategorías es literalmente J/02, Medicamentos de uso personal (RG DNA 11/2026 num. 28 lit. c). El default del operador es G, así que si querés el J/02 hay que pedirlo expresamente al courier o al operador postal. Aviso: la norma no explica cómo se concilia esa etiqueta con el hecho de que el medicamento sí paga IVA al 10%.',
        },
        {
          name: 'Si viene por Correo Uruguayo, declaralo vos primero',
          text: 'Tenés que completar el formulario web del Correo con el tracking de 13 caracteres y los datos idénticos a tu cédula. Aviso: ese formulario público sólo pregunta compra u obsequio, franquicia sí o no, y medio de pago. No tiene campo para invocar el tratamiento del medicamento ni para adjuntar la autorización. Declaralo igual y guardá por escrito cualquier respuesta que recibas.',
        },
        {
          name: 'Si queda retenido, ahí sí podés invocar el régimen',
          text: 'El RG DNA 14/2026 num. 15 lit. k permite al declarante determinar el régimen aduanero aplicable, y el lit. k.iii habilita a optar por un régimen especial adjuntando la documentación que lo acredite. El trámite del envío retenido es presencial con agenda previa, los certificados de otros organismos se llevan en papel y el almacenamiento durante la demora lo pagás vos. Sin el certificado previo del MSP, la DNA no inicia el trámite.',
        },
        {
          name: 'Pagá dentro de los 30 días',
          text: 'Tenés 30 días desde el ingreso al país para pagar los tributos y 90 días para retirar del depósito. Vencidos, es abandono no infraccional (Decreto 50/026 art. 14). El plazo de 10 días del que habla mucha gente no es legal: es la ventana tarifaria del cargo de gestión del Correo Uruguayo.',
        },
      ],
      pitfalls: [
        'Comprar primero y averiguar el permiso después. Sin autorización del MSP el art. 7 saca el envío del régimen entero —ni franquicia ni 60%— y la única salida publicada es devolverlo a origen a tu costo dentro de los 30 días.',
        'Dar por hecho que uso personal alcanza. No existe una franja general de uso personal que dispense de permisos de organismos. Es la confusión más cara de esta categoría.',
        'Dejar que el operador declare G por default sin siquiera preguntar por el J/02, que es el código que la RG 11/2026 reserva a medicamentos de uso personal.',
        'Que pague otro. Tarjeta de un familiar, de la pareja o de un amigo: se pierde la franquicia y se liquida al 60%.',
        'Suponer que un envío chico no paga nada. El piso de US$ 20 de IVA muerde en toda compra por debajo de US$ 200 a la tasa mínima: por un remedio de US$ 40 el IVA teórico serían US$ 4, y el mínimo lo lleva a US$ 20.',
        'Poner en la misma caja suplementos, vitaminas o cosméticos. Pagan 22%, tienen su propio control del MSP y te complican una declaración que ya de por sí es delicada.',
        'Subvaluar la factura para bajar el IVA. La multa es igual al doble de los tributos que debiste pagar, perdés la franquicia de esa operación y la reincidencia dentro de los 12 meses te prohíbe operar en el régimen por un año (Ley 20.446 art. 632).',
      ],
    },
    considerations: [
      'La variable no es el impuesto, es el permiso. El 10% de IVA es la parte fácil; conseguir que el MSP habilite el ingreso es la parte que puede no ocurrir.',
      'Si el medicamento sí está registrado en Uruguay, no encontramos vía publicada para traerlo por tu cuenta: el trámite del MSP para personas es sólo para productos no registrados. Es un hueco real de la normativa, no algo que estés haciendo mal.',
      'La DNA publica un tope de US$ 200 de factura y 20 kg para medicamentos de uso personal por franquicia, sin restricción de frecuencia. Esa cifra no está en el Decreto 50/026 ni en la Ley 20.446, y coincide con el tope por envío del derogado Decreto 356/014. Tratalo como criterio operativo de la Aduana, no como norma, y no te sorprendas si te lo aplican igual.',
      'No hay cantidad máxima publicada —ni meses de tratamiento ni unidades—. El médico declara cantidad y duración y el MSP evalúa caso a caso. Cualquiera que te diga un número exacto se lo está inventando.',
      'El piso de US$ 20 de IVA hace que fraccionar compras chicas sea la peor estrategia posible: cada envío arrastra su propio mínimo.',
      'Psicofármacos y estupefacientes quedan afuera de todo esto: el trámite en VUCE es sólo para empresas, con registro y cupo. No hay vía de importación personal.',
      'Los topes del canal postal siguen siendo US$ 800 de factura y 20 kg por envío, y son independientes entre sí. La excepción del RG 11/2026 num. 26, cuando aplica, está escrita sobre el numeral que contiene el monto y la frecuencia; el peso no está en ese numeral.',
      'Verificá la fecha de las páginas oficiales que leas: la página de la DNA sobre exoneraciones especiales es del 09/01/2026, anterior al Decreto 50/026, y el paso 3 del instructivo del Correo Uruguayo todavía publica los topes derogados de US$ 50 y US$ 200 como condición de la franquicia.',
    ],
    faqs: [
      {
        q: '¿Puedo comprar un medicamento por internet y que me llegue por correo?',
        a: 'En general no. El MSP afirma que no autoriza el ingreso al país de productos de salud del exterior por particulares. La única excepción que publica es para un producto no registrado en Uruguay, con prescripción médica específica, bajo responsabilidad del médico tratante y de tu prestador, con consentimiento informado, y siempre que no exista un equivalente registrado acá. O entrás por esa puerta, o el envío no tiene un camino habilitado.',
      },
      {
        q: '¿Cuánto voy a pagar de impuestos?',
        a: 'Dentro de la franquicia, IVA a la tasa mínima del 10% sobre el valor de factura, sin aranceles, con un mínimo de US$ 20 por envío. Ese piso muerde en toda compra por debajo de US$ 200, así que en la práctica un envío chico paga US$ 20 igual. Dos advertencias honestas: ni el MEF ni la DNA mencionan este mínimo cuando explican la franquicia —sólo lo citan para el 60%— y no existe ningún ejemplo numérico oficial de una compra con franquicia pagando IVA. Y queda abierto si el incremento del 50% de la base del régimen general también corre en el canal postal: el inciso postal manda aplicar las tasas sobre el valor de factura, y esa es la lectura que usamos.',
      },
      {
        q: '¿El medicamento me consume el cupo de US$ 800 y uno de los 3 envíos?',
        a: 'Según la norma, no, si tenés la autorización del MSP. El Decreto 50/026 art. 4 inciso final exceptúa del cupo a los medicamentos de uso personal con la debida autorización, y el RG DNA 11/2026 num. 26 exceptúa el numeral que contiene los dos límites, el de los 3 envíos y el de los US$ 800. Ahora la contra: una noticia oficial de la DNA del 28/04/2026 dice, sin mencionar excepción alguna, que todos los envíos de franquicia consumen tanto el cupo en dólares como el de 3 envíos, y la excepción no aparece en la FAQ del MEF, en la FAQ de la DNA ni en la página del Correo. Vive en una resolución escaneada. Llevá la cita del num. 26 impresa: es probable que la tengas que pelear.',
      },
      {
        q: '¿Qué pasa si el paquete llega sin la autorización del MSP?',
        a: 'Es el peor escenario y conviene entenderlo antes de comprar. El Decreto 50/026 art. 7 excluye del régimen a la mercadería que requiere autorización y carece de ella: el envío queda afuera de los dos regímenes, no es cuestión de pagar el 60% y llevártelo. Lo que se puede hacer es devolverlo a origen, a costo tuyo, dentro de los 30 días. Y sin el certificado previo la DNA ni siquiera inicia el trámite del envío retenido.',
      },
      {
        q: '¿Las vitaminas y los suplementos entran en el 10%?',
        a: 'No. La DGI resolvió que la tasa la define la inscripción en el registro del MSP: si el producto no está registrado como medicamento, especialidad farmacéutica o alimento de uso medicinal, paga 22% aunque tenga finalidad nutricional o terapéutica (Consulta 6.343, del 30/11/2020). Y además siguen controlados por el MSP, con la misma regla dura. Un frasco de vitaminas no es un medicamento a estos efectos.',
      },
      {
        q: '¿Necesito despachante para traer un medicamento?',
        a: 'No. Ninguna operación del régimen postal exige despachante (Decreto 50/026 art. 17 y Ley 20.446 art. 627). Lo que necesitás es el permiso sanitario y la documentación. Si el envío supera los US$ 800 o los 20 kg salís del canal postal y ahí entrás al despacho formal, donde la intervención del despachante es la regla, se suma la tasa consular del 5% y la base del IVA se calcula sobre valor en aduana más arancel incrementado un 50% por ser no contribuyente.',
      },
    ],
    sources: [
      {
        label: 'Título 10 T.O. 2023 art. 36 — tasa mínima de IVA',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/36_T10',
        note: 'Literal B: medicamentos y especialidades farmacéuticas.',
      },
      {
        label: 'Ley 20.446 art. 660 — piso de US$ 20 de IVA en el régimen postal',
        url: 'https://www.impo.com.uy/bases/leyes/20446-2025/660',
        note: 'Vigente desde el 1/1/2026; sólo se salva el envío integrado exclusivamente por bienes exonerados.',
      },
      {
        label: 'Decreto 50/026 — reglamento del régimen de envíos postales',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
        note: 'Art. 4 inciso final (excepción de cupo con autorización del MSP), art. 7 (sin autorización, fuera del régimen), arts. 14, 15 y 17.',
      },
      {
        label: 'RG DNA 11/2026 (PDF)',
        url: 'https://www.aduanas.gub.uy/innovaportal/file/28447/1/rg-11_2026.pdf',
        note: 'Num. 26 (excepción para medicamentos de uso personal), num. 27 (mínimo de IVA) y num. 28 lit. c (códigos de tipo de envío, J/02).',
      },
      {
        label: 'MSP — Ingreso de medicamentos no registrados (ciudadanos)',
        url: 'https://www.gub.uy/tramites/ingreso-medicamentos-no-registrados-ciudadanos-uruguayos',
        note: 'Gratuito, por internet; formularios firmados por usuario, médico tratante y Dirección Técnica; canal farmacovigilancia@msp.gub.uy.',
      },
      {
        label: 'MSP — ¿puedo ingresar productos de salud desde el exterior?',
        url: 'https://www.gub.uy/ministerio-salud-publica/',
        note: 'Fuente de la afirmación de que el MSP no autoriza el ingreso por particulares, salvo la excepción del producto no registrado.',
      },
      {
        label: 'Decreto 220/998 — reglamento del IVA',
        url: 'https://www.impo.com.uy/bases/decretos/220-1998',
        note: 'Art. 101 lit. b (medicamentos y repelentes al 10%) y art. 115 (el anticipo es sólo para contribuyentes).',
      },
      {
        label: 'DNA — mercaderías con exoneraciones especiales',
        url: 'https://www.aduanas.gub.uy/innovaportal/v/28228/1/innova.front/',
        note: 'Página del 09/01/2026, anterior al Decreto 50/026. El criterio de los US$ 200 de factura sin restricción de frecuencia es de la DNA, no de la norma.',
      },
      {
        label: 'Correo Uruguayo — cómo declarar su compra u obsequio',
        url: 'https://www.correo.com.uy/como-declarar-su-compra-u-obsequio',
        note: 'Formulario web con tracking de 13 caracteres. Su paso 3, actualizado al 03/08/2026, todavía publica los topes derogados de US$ 50 y US$ 200.',
      },
    ],
    verifiedAt: '2026-08-15',
  },
  {
    slug: 'suplementos-y-vitaminas',
    productTypeId: 'suplementos',
    title: 'Importar suplementos y vitaminas a Uruguay: impuestos y trámites',
    navLabel: 'Suplementos y vitaminas',
    description:
      'Los suplementos y vitaminas pagan 22% de IVA, con un piso de US$ 20 por envío, y el MSP no habilita el ingreso por particulares salvo excepción puntual.',
    icon: 'mdi-nutrition',
    examples: [
      'Multivitamínico de iHerb o Amazon',
      'Vitamina D3, vitamina C, complejo B',
      'Magnesio, zinc, hierro',
      'Omega 3 / aceite de pescado',
      'Creatina y pre-entreno',
      'Proteína de suero (whey) y caseína',
      'Colágeno hidrolizado',
      'Cápsulas de hierbas (cúrcuma, ashwagandha)',
    ],
    notIncluded: [
      'Medicamentos y especialidades farmacéuticas registrados ante el MSP: pagan 10% y tienen su propia ficha',
      'Tiras reactivas de glicemia y reactivos de diagnóstico: van con productos médicos',
      'Snacks, barritas, café o té para consumo común: van con alimentos',
      'Cremas y cosméticos: tienen ficha propia, porque ahí pesa el IMESI (los protectores solares registrados ante el MSP, en cambio, están fuera de ese impuesto)',
    ],
    regimes: {
      franquicia: {
        verdict: 'IVA 22%, mínimo US$ 20',
        detail:
          'La franquicia exime aranceles pero no el IVA: el art. 627 inc. 2 de la Ley 20.446 remite al Título 10, y un suplemento que no está inscripto como medicamento, especialidad farmacéutica o alimento de uso medicinal queda en la tasa básica del 22% (criterio DGI, Consulta 6.343 del 30/11/2020). Encima corre el piso de US$ 20 de IVA por envío, porque no es mercadería exonerada. Y la franquicia no te saca del control del MSP.',
        tone: 'warn',
      },
      prestacionUnica: {
        verdict: '60% del valor, mínimo US$ 20',
        detail:
          'Es opcional: la ley dice que el titular "podrá optar". Sustituye toda la tributación de la importación. Para un suplemento gravado al 22% casi nunca conviene: sólo tiene sentido si ya quemaste el cupo, si no cumplís algún requisito de la franquicia o si pagó un tercero. El piso de US$ 20 por envío también aplica acá.',
        tone: 'warn',
      },
      general: {
        verdict: '22% + arancel + 5% de tasa consular',
        detail:
          'Por arriba de US$ 800 de factura o de 20 kg salís del régimen postal y entrás por despacho formal, donde la intervención del despachante es la regla (CAROU art. 14). Ahí el IVA se calcula sobre valor en aduana más arancel y, si importás como particular, esa suma se incrementa un 50%. Se suma la tasa consular del 5% (3% con ACE N.º 18). El control del MSP sigue igual.',
        tone: 'warn',
      },
    },
    taxes: [
      {
        concept: 'IVA',
        value: '22%',
        detail:
          'Regla residual del Título 10: todo bien paga la tasa básica salvo que esté exonerado (art. 38) o listado en la tasa mínima (art. 36). Los suplementos no están en ninguna de las dos listas. La DGI lo dijo expreso en la Consulta 6.343 (30/11/2020): la tasa la define la inscripción en el registro del MSP, y si el producto no figura como medicamento, especialidad farmacéutica o alimento de uso medicinal, paga 22% aunque tenga finalidad nutricional o terapéutica.',
        source: {
          label: 'Título 10 T.O. 2023 art. 34 (tasas del IVA)',
          url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/34_T10',
        },
      },
      {
        concept: 'Piso de IVA del régimen postal',
        value: 'US$ 20 por envío',
        detail:
          'Desde el 1/1/2026 el monto de IVA de un envío postal no puede ser inferior al equivalente a US$ 20, salvo que el envío esté integrado exclusivamente por bienes exonerados. Un suplemento no está exonerado, así que el piso muerde por debajo de US$ 90,91 de factura. Aviso obligatorio: ni la FAQ del MEF ni la de la DNA mencionan este mínimo cuando explican la franquicia (sólo lo citan para el 60%), y no hay ningún ejemplo numérico oficial de una compra con franquicia que pague IVA.',
        source: {
          label: 'Título 10 T.O. 2023 art. 13 lit. B (base del IVA)',
          url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/13_T10',
        },
      },
      {
        concept: 'Arancel',
        value: '0% dentro de la franquicia',
        detail:
          'La franquicia anual de hasta US$ 800 en un máximo de 3 envíos es, por definición legal, exenta de aranceles. Fuera del régimen postal el arancel depende del NCM del producto y no verificamos alícuotas partida por partida: no hay una cifra única para suplementos.',
        source: {
          label: 'Ley 20.446 art. 627',
          url: 'https://www.impo.com.uy/bases/leyes/20446-2025/627',
        },
      },
      {
        concept: 'IMESI',
        value: 'No aplica',
        detail:
          'Los suplementos no aparecen entre los rubros del Título 11 que verificamos —cosméticos y perfumería, bebidas alcohólicas, tabacos, vehículos automotores y lubricantes—. Importa saberlo, porque toda mercadería gravada por IMESI queda fuera del régimen postal de forma absoluta (Ley 20.446 art. 633).',
        source: {
          label: 'Ley 20.446 art. 633',
          url: 'https://www.impo.com.uy/bases/leyes/20446-2025/633',
        },
      },
      {
        concept: 'Tasa consular',
        value: '5% (3% Mercosur), sólo fuera del régimen postal',
        detail:
          'Se aplica sobre el valor en aduana en el despacho general. Las exoneraciones son taxativas —admisión temporaria, ciertos combustibles y bienes de capital con TGA extrazona de 2% o 0%— y no alcanzan a los suplementos. El Poder Ejecutivo está facultado a bajarla y no lo hizo.',
        source: {
          label: 'Ley 19.535 art. 265',
          url: 'https://www.impo.com.uy/bases/leyes/19535-2017/265',
        },
      },
      {
        concept: 'Prestación única (opcional)',
        value: '60% del valor, mínimo US$ 20',
        detail:
          'En sustitución de toda tributación relativa a la importación definitiva, sea arancelaria o de tributo interno. Es una opción del titular, no una liquidación automática, salvo que pierdas la franquicia (por ejemplo, si pagó un tercero).',
        source: {
          label: 'Ley 20.446 art. 627',
          url: 'https://www.impo.com.uy/bases/leyes/20446-2025/627',
        },
      },
    ],
    benefits: [
      {
        title: 'Origen con acuerdo comercial: hasta US$ 200 exonerados',
        detail:
          'Dentro de la franquicia, los envíos de hasta US$ 200 provenientes de países con acuerdo comercial (EE.UU./TIFA) están exonerados. Pesa mucho acá, porque la mayoría de los suplementos se compran en tiendas estadounidenses. La residencia fiscal del vendedor se acredita con la factura. Desde el 1/10/2026 el emisor de la factura tiene que estar registrado ante la DNA; si no lo está, no se aplica la exoneración. No te libera del control del MSP.',
        norm: 'Decreto 50/026 art. 3 (RG DNA 09/2026, prorrogada por las RG 12 y 21/2026)',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
      },
      {
        title: 'Obsequio familiar',
        detail:
          'El envío no comercial entre personas físicas, con mercadería en cantidades razonables y para uso personal, está exento de todo tributo. Si un familiar en el exterior te manda vitaminas, esa es la vía. Igual consume cupo, y la norma no resuelve cómo juega esta exención con el piso de US$ 20 de IVA: no hay ejemplo oficial. Tampoco te libera del control del MSP.',
        norm: 'Decreto 50/026 art. 3',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
      },
    ],
    procedures: [
      {
        organism: 'MSP',
        when: 'El MSP controla los productos de salud y la FAQ oficial es tajante: "el MSP no autoriza el ingreso al país de productos de salud del exterior por particulares". No existe una franja general de uso personal que te dispense. La única excepción publicada es para productos no registrados en el país, con prescripción médica específica, sin equivalente registrado acá y bajo responsabilidad del médico tratante. Hueco a decir en voz alta: no está publicado cómo se resuelve el caso de un suplemento común de venta libre que llega en un envío no retenido.',
        how: 'La excepción se pide por correo electrónico a farmacovigilancia@msp.gub.uy (Departamento de Medicamentos, Unidad de Farmacovigilancia), no por VUCE. Es gratuito y exige dos formularios firmados por vos, por el médico tratante y por la Dirección Técnica de tu prestador de salud, más el consentimiento informado. No hay cantidad máxima publicada: el médico declara la cantidad a ingresar y la duración del tratamiento, y se evalúa caso a caso.',
        url: 'https://www.gub.uy/tramites/ingreso-medicamentos-no-registrados-ciudadanos-uruguayos',
      },
      {
        organism: 'MGAP',
        when: 'Si el suplemento es un alimento de origen animal —o si el envío incluye productos vegetales acondicionados al detalle en envases de más de 500 gramos— entra en la nómina de la Resolución MGAP 1.720/021, que prohíbe ingresarlos por encomienda o correo, sin franja de uso personal. La nómina no es taxativa: cualquier otro producto puede quedar prohibido si le falta el certificado oficial. La norma no aclara si una proteína de suero, un colágeno o un aceite de pescado en cápsulas quedan alcanzados: eso lo resuelve el organismo caso a caso, no un texto publicado.',
        how: 'No se encontró ningún trámite en VUCE dirigido a persona física para traer estos productos por correo. Si el envío queda alcanzado, no hay permiso que conseguir por esta vía.',
        url: 'https://www.gub.uy/ministerio-ganaderia-agricultura-pesca/comunicacion/publicaciones/nomina-productos-autorizados-ingresar-pais',
      },
    ],
    declare: {
      intro:
        'Los suplementos no tienen un canal propio de declaración: van por el mismo campo "Tipo de envío" que cualquier otra compra. Lo que sí es específico de esta categoría es que el ahorro se juega antes, en cómo armás el pedido, y que el riesgo real no es el impuesto sino el control sanitario.',
      steps: [
        {
          name: 'Mirá cómo está registrado el producto antes de pagar',
          text: 'La tasa y el trámite dependen de la inscripción en el registro del MSP, no de lo que diga el envase. Si el producto está registrado como medicamento o especialidad farmacéutica, la tasa es 10% y te corresponde la ficha de medicamentos, con el trámite del MSP. Si no lo está —el caso de la enorme mayoría de los suplementos deportivos y vitaminas de venta libre—, es 22% y no hay beneficio de tasa.',
        },
        {
          name: 'Pagá con tu propia tarjeta y a tu nombre',
          text: 'La franquicia exige tarjeta de crédito o débito internacional, o dinero electrónico internacional emitido por una institución regulada por el BCU, y que la titularidad del medio de pago coincida con el titular de la compra y con el destinatario. Si pagó un tercero perdés la franquicia y el envío se liquida al 60%.',
        },
        {
          name: 'Guardá la factura con el detalle y el valor total',
          text: 'El valor es el total de la factura original de compra, incluidos todos los conceptos adicionados en ella. El envío debe ir acompañado de la documentación que acredite ese valor; si no hay factura, va declaración de valor. Con suplementos conviene que la factura describa el producto: es lo primero que te van a pedir si el envío queda retenido por el control sanitario.',
        },
        {
          name: 'Pedí el tipo de envío que corresponde: "G"',
          text: 'La opción de régimen es un campo de la declaración y la RG DNA 11/2026 num. 28 lit. c codifica el tipo de envío: "G" es franquicia y "H" es prestación única del 60%. Los códigos "J" son para envíos exceptuados del pago de tributos, y el J/02 está rotulado "Medicamentos de uso personal": un suplemento que no está registrado como medicamento no encaja en esa etiqueta, y ninguna norma ni FAQ dice qué pasa si se declara igual. Pedile al operador postal el "G" y no inventes un J.',
        },
        {
          name: 'Si llega por Correo Uruguayo, declaralo vos primero',
          text: 'En el resto de los couriers declara el operador. Por Correo Uruguayo el destinatario declara en el formulario web ("Ahíva") con el tracking de 13 caracteres y los datos idénticos a la cédula. Ojo con esa página: el paso 3, actualizado el 03/08/2026, todavía publica los topes derogados de US$ 50 y US$ 200 como si fueran condición de la franquicia. No lo son: el régimen vigente es US$ 800 anuales en 3 envíos.',
        },
        {
          name: 'Elegí el rubro de la declaración',
          text: 'El Anexo del Decreto 50/026 obliga a registrar el envío en un rubro codificado, y en esa lista no hay ninguno de alimentos ni de suplementos: el que queda es "Otros". Es un rubro estadístico y declarativo; no define ni cambia el tratamiento tributario.',
        },
        {
          name: 'Si te lo retienen, contá los plazos y el peor escenario',
          text: 'El trámite del envío retenido es presencial y con agenda previa, y los certificados de otros organismos se llevan en papel. Tenés 30 días desde el ingreso al país para pagar los tributos y 90 días de depósito antes del abandono; el almacenamiento durante la demora lo pagás vos. Si la mercadería requiere autorización y no la tenés, el Decreto 50/026 art. 7 la deja fuera del régimen entero —ni franquicia ni 60%— y la salida es devolverla a origen, a tu costo, dentro de los 30 días.',
        },
      ],
      pitfalls: [
        'Suponer que una vitamina paga 10% "porque es salud": la tasa la define el registro ante el MSP, y sin ese registro son 22% (Consulta DGI 6.343).',
        'Pedirle al operador el código J/02, que dice "Medicamentos de uso personal", para un suplemento que no está registrado como medicamento.',
        'Partir el pedido en varios envíos chicos creyendo que abajo de cierto monto no se paga: el piso de US$ 20 de IVA es por envío, y además gastás cupo de los 3 envíos anuales.',
        'Que pague la compra otro (pareja, familiar, la tarjeta de la empresa): se pierde la franquicia y se liquida el 60%.',
        'Declarar menos valor del que dice la factura: la multa es el doble de los tributos que debieron pagarse, y la reincidencia dentro de 12 meses te prohíbe operar en el régimen por otros 12.',
        'Dar por hecho que "es un alimento, no un remedio" y por eso ningún organismo lo mira: el MSP controla productos de salud y el MGAP prohíbe por correo los alimentos de origen animal.',
      ],
    },
    considerations: [
      'El piso de US$ 20 de IVA cambia toda la matemática de esta categoría: un frasco de US$ 25 paga US$ 20, o sea casi un 80% efectivo. Por debajo de US$ 90,91 de factura siempre pagás el piso y no el 22%. Consolidar en un envío grande, y no en tres chicos, es la palanca más directa que tenés.',
      'Los suplementos consumen cupo como cualquier otra compra: 3 envíos y US$ 800 por año civil. No están entre las excepciones (esas son libros y medicamentos con autorización del MSP). Y el cupo se imputa por fecha de desaduanamiento, no por fecha de compra.',
      'El peso importa tanto como el monto: el tope de 20 kg por envío es independiente del de US$ 800. Con polvos de proteína o packs grandes se llega antes al kilaje que al dinero.',
      'Si comprás en EE.UU. y el envío no pasa de US$ 200, corre la exoneración por origen dentro de la franquicia. Lo que la norma no resuelve es cómo se combina con el piso de US$ 20 de IVA, porque no hay ejemplo oficial publicado. Desde el 1/10/2026 el emisor de la factura tiene que estar registrado ante la DNA: si no lo está, no hay exoneración.',
      'El riesgo grande no es el impuesto, es el control sanitario. Si el producto necesita autorización del MSP y no la tenés, el envío queda afuera de los dos regímenes y la única salida publicada es devolverlo a origen pagando vos. Ese es el escenario que hay que sopesar antes de comprar, no después.',
      'Fijate qué tiene adentro además del principio activo. Los alimentos de origen animal están prohibidos por encomienda o correo, y los productos vegetales acondicionados al detalle lo están en envases de más de 500 gramos. La nómina del MGAP no es taxativa.',
      'No hay ningún ejemplo numérico oficial de una compra con franquicia que pague IVA. Presupuestá con el piso incluido y no te sorprendas si la cifra que te cotiza el operador no coincide con lo que leíste en una FAQ.',
    ],
    faqs: [
      {
        q: '¿Las vitaminas pagan 10% de IVA como los medicamentos?',
        a: 'No, salvo que el producto esté inscripto en el registro del MSP como medicamento, especialidad farmacéutica o alimento de uso medicinal. Ese es el criterio expreso de la DGI en la Consulta 6.343 del 30/11/2020: la tasa la define la inscripción, no la finalidad. Un multivitamínico vendido como suplemento dietario paga 22% aunque su propósito sea nutricional o terapéutico. Si tu producto sí está registrado como medicamento, cambia todo: tasa mínima del 10% y trámite del MSP.',
      },
      {
        q: '¿Cuánto voy a pagar por un pedido de US$ 40 en suplementos?',
        a: 'El 22% de US$ 40 son US$ 8,80, pero el envío no puede liquidar menos de US$ 20 de IVA, así que pagás US$ 20. En la práctica es un 50% sobre lo que gastaste. Ese piso rige tanto en franquicia como en la prestación única del 60%, y deja de morder recién por encima de US$ 90,91 de factura. Aclaración honesta: ni el MEF ni la DNA mencionan este mínimo en sus preguntas frecuentes sobre la franquicia, sólo al explicar el 60%.',
      },
      {
        q: '¿Necesito permiso del MSP para traerme un multivitamínico?',
        a: 'La FAQ oficial del MSP dice que no autoriza el ingreso al país de productos de salud del exterior por particulares, y no existe ninguna franja general de uso personal que te exceptúe. La única excepción publicada es para productos no registrados acá, con prescripción médica específica, sin equivalente registrado en el país y con consentimiento informado, tramitada por el médico y la dirección técnica de tu prestador ante farmacovigilancia@msp.gub.uy. Lo que no está publicado —y hay que decirlo— es cómo se resuelve en la práctica un suplemento de venta libre que llega en un envío que nadie retiene.',
      },
      {
        q: '¿Puedo traer proteína de suero, colágeno o aceite de pescado?',
        a: 'Ahí el problema no es el impuesto sino el MGAP. La Resolución 1.720/021 prohíbe ingresar por encomienda o correo los alimentos de origen animal, sin franja de uso personal, y su nómina no es taxativa: cualquier producto puede quedar prohibido si le falta el certificado oficial. Ninguna norma publicada dice si una proteína de suero o una cápsula de aceite de pescado quedan alcanzadas, así que es una decisión del organismo caso a caso. Si el envío queda alcanzado, no hay trámite de persona física en VUCE para destrabarlo.',
      },
      {
        q: '¿Me conviene pagar el 60% en vez de usar la franquicia?',
        a: 'Para suplementos, casi nunca. Con franquicia pagás 22% de IVA —o el piso de US$ 20, el que sea mayor— y cero arancel; con la prestación única pagás 60% del valor, también con ese mínimo de US$ 20. La opción del 60% sirve cuando ya usaste los 3 envíos o los US$ 800 del año, o cuando no cumplís algún requisito de la franquicia. Y ojo: no siempre es una elección, porque si la compra la pagó un tercero perdés la franquicia y el envío se liquida al 60% igual.',
      },
      {
        q: '¿Conviene dividir el pedido en varias compras chicas?',
        a: 'No. El piso de US$ 20 de IVA se aplica por envío, así que tres pedidos de US$ 30 pagan US$ 60 en total, mientras que un solo pedido de US$ 90 paga US$ 20. Además cada envío te come uno de los 3 cupos anuales. Lo único que puede empujarte a dividir es el tope de 20 kg por envío, que es independiente del tope en dólares.',
      },
    ],
    sources: [
      {
        label: 'Título 10 T.O. 2023 art. 34 — tasas del IVA',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/34_T10',
        note: 'Tasa básica 22%: regla residual para todo bien no exonerado ni listado en tasa mínima.',
      },
      {
        label: 'Título 10 T.O. 2023 art. 36 — tasa mínima',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/36_T10',
        note: 'Lista taxativa del 10%: los suplementos no figuran.',
      },
      {
        label: 'Título 10 T.O. 2023 art. 13 lit. B — base del IVA',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/13_T10',
        note: 'Inciso 3 (agregado por Ley 20.446 art. 660): piso de US$ 20 de IVA por envío postal, salvo envíos integrados exclusivamente por bienes exonerados.',
      },
      {
        label: 'Ley 20.446 art. 627 — régimen de envíos postales',
        url: 'https://www.impo.com.uy/bases/leyes/20446-2025/627',
        note: 'Franquicia de US$ 800 anuales en 3 envíos, exenta de aranceles pero no de IVA; prestación única del 60% como opción.',
      },
      {
        label: 'Decreto 50/026',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
        note: 'Art. 3 (exoneración por origen y obsequios familiares), art. 5 (valor), art. 7 (mercadería sin la autorización requerida queda fuera del régimen), art. 14 (plazos de 30 y 90 días), art. 15 (pago por tercero).',
      },
      {
        label: 'RG DNA 11/2026',
        url: 'https://www.aduanas.gub.uy/innovaportal/file/28447/1/rg-11_2026.pdf',
        note: 'Num. 27 (piso de US$ 20 de IVA) y num. 28 lit. c (códigos de tipo de envío: G franquicia, H prestación única, J exceptuados).',
      },
      {
        label: 'MSP — ¿puedo ingresar productos de salud desde el exterior?',
        url: 'https://www.gub.uy/ministerio-salud-publica/',
        note: 'El MSP no autoriza el ingreso de productos de salud por particulares; la excepción es sólo para productos no registrados con prescripción médica.',
      },
      {
        label: 'MSP — ingreso de medicamentos no registrados',
        url: 'https://www.gub.uy/tramites/ingreso-medicamentos-no-registrados-ciudadanos-uruguayos',
        note: 'Trámite gratuito de la excepción, por correo a farmacovigilancia@msp.gub.uy, con firma del médico tratante y de la dirección técnica del prestador.',
      },
      {
        label: 'Resolución MGAP 1.720/021 — nómina de productos',
        url: 'https://www.gub.uy/ministerio-ganaderia-agricultura-pesca/comunicacion/publicaciones/nomina-productos-autorizados-ingresar-pais',
        note: 'Prohíbe por encomienda o correo los alimentos de origen animal y los productos vegetales acondicionados al detalle en envases de más de 500 g; nómina no taxativa.',
      },
    ],
    verifiedAt: '2026-08-15',
  },
  {
    slug: 'productos-medicos-y-opticos',
    productTypeId: 'medicos',
    title: 'Importar productos médicos y ópticos a Uruguay: impuestos y trámites',
    navLabel: 'Médicos y ópticos',
    description:
      'Los anteojos graduados y lentes de contacto no pueden entrar a nombre de una persona física: sólo empresas habilitadas ante el MSP. El resto paga 22% de IVA, salvo implantes quirúrgicos y reactivos de diagnóstico, que van al 10%.',
    icon: 'mdi-medical-bag',
    examples: [
      'tensiómetro digital de brazo',
      'glucómetro y tiras reactivas de glicemia',
      'oxímetro de pulso',
      'nebulizador o aspirador nasal',
      'termómetro clínico',
      'audífono o prótesis auditiva',
      'silla de ruedas, andador, bastón',
      'férulas, ortesis y vendajes',
    ],
    notIncluded: [
      'Anteojos graduados, lentes de contacto, cristales y armazones: no pueden ingresar a nombre de una persona física.',
      'Medicamentos y especialidades farmacéuticas: tienen tasa e itinerario propios (10% y autorización del MSP).',
      'Suplementos y vitaminas: pagan 22% y van por su propia ficha.',
      'Lectores electrónicos, wearables y electrónica de consumo, aunque midan pasos o pulsaciones.',
    ],
    regimes: {
      franquicia: {
        verdict: 'Sin arancel, pero IVA igual (22%, o 10% en dos casos) con mínimo de US$ 20',
        detail:
          'La franquicia exonera aranceles, no el IVA: el art. 627 inc. 2 de la Ley 20.446 remite igual al art. 4 y al literal B del art. 13 del Título 10. Y estos productos no están exceptuados del cupo: la excepción de los US$ 800 y de los 3 envíos es sólo para libros y para medicamentos de uso personal con autorización del MSP (RG DNA 11/2026 num. 26). Un tensiómetro consume cupo como cualquier otra cosa.',
        tone: 'warn',
      },
      prestacionUnica: {
        verdict: '60% del valor, mínimo US$ 20 por envío',
        detail:
          'Es opcional: la ley dice que el titular podrá optar. Sustituye toda la tributación de la importación, arancel y tributo interno incluidos. Lo que no sustituye es el permiso del organismo: pagar el 60% no habilita un producto que el MSP no dejó entrar.',
        tone: 'warn',
      },
      general: {
        verdict: 'IVA + arancel + 5% de tasa consular',
        detail:
          'Arriba de US$ 800 de factura o de 20 kg se sale del canal postal: valor en aduana CIF, tasa consular 5% (3% con ACE N.º 18), y base del IVA igual al valor normal de aduana más el arancel, incrementada un 50% cuando importa un no contribuyente. El arancel depende del NCM y acá no verificamos ninguna alícuota partida por partida. Para óptica graduada el problema no es el régimen: no puede venir a nombre de una persona física, sólo por empresas habilitadas ante el MSP.',
        tone: 'warn',
      },
    },
    taxes: [
      {
        concept: 'IVA (tasa básica)',
        value: '22%',
        detail:
          'Es la regla residual: todo bien paga 22% salvo que esté expresamente exonerado o listado en la tasa mínima. Un producto médico externo paga 22% aunque esté registrado en el MSP como dispositivo terapéutico: así lo resolvió la DGI en la Consulta 6.551. Tensiómetros, oxímetros, nebulizadores y ortesis caen acá.',
        source: {
          label: 'Título 10 T.O. 2023, art. 34',
          url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/34_T10',
        },
      },
      {
        concept: 'IVA (tasa mínima)',
        value: '10%',
        detail:
          'Sólo dos casos. Implantes quirúrgicos: la Resolución DGI 909/005 define los implementos a ser incorporados al organismo humano como los diseñados para implantarse totalmente en el cuerpo, para sustituir una superficie epitelial u ocular mediante intervención quirúrgica, o para introducirse quirúrgicamente y permanecer al menos 30 días. Y reactivos de diagnóstico para análisis clínicos, con las tiras reactivas de glicemia nombradas expresamente (Consultas DGI 6.470 y 5.226).',
        source: {
          label: 'Título 10 T.O. 2023, art. 36',
          url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/36_T10',
        },
      },
      {
        concept: 'Mínimo de IVA del régimen postal',
        value: 'US$ 20 por envío',
        detail:
          'El IVA de un envío postal no puede ser inferior al equivalente a US$ 20, salvo que el envío esté integrado exclusivamente por bienes cuya importación esté exonerada. Ningún producto de esta categoría tiene una exoneración de IVA por producto —la de la Ley 18.651 es un beneficio personal y condicionado, no una tasa—, así que en los hechos el piso corre. Muerde por debajo de US$ 90,91 a la tasa básica y por debajo de US$ 200 a la mínima.',
        source: {
          label: 'Ley 20.446, art. 660',
          url: 'https://www.impo.com.uy/bases/leyes/20446-2025/660',
        },
      },
      {
        concept: 'Arancel',
        value: '0% con franquicia',
        detail:
          'La franquicia anual es expresamente exenta de aranceles. Fuera de ella el arancel depende del NCM del producto y no hay una alícuota verificada para esta categoría. Con la prestación única del 60% tampoco se paga arancel aparte: ese 60% se aplica en sustitución de toda la tributación de la importación.',
        source: {
          label: 'Decreto 50/026',
          url: 'https://www.impo.com.uy/bases/decretos/50-2026',
        },
      },
      {
        concept: 'Tasa consular',
        value: '5% (3% Mercosur), fuera del régimen postal',
        detail:
          'Se aplica sobre el valor en aduana en el despacho general. Las exoneraciones de la Ley 19.535 art. 265 son taxativas (admisión temporaria, petróleo crudo y ciertos combustibles, y bienes de capital de uso industrial, agropecuario o pesquero con TGA extrazona de 2% o 0%) y no alcanzan a los productos médicos de uso personal.',
        source: {
          label: 'Ley 19.535, art. 265',
          url: 'https://www.impo.com.uy/bases/leyes/19535-2017/265',
        },
      },
      {
        concept: 'IMESI',
        value: 'No aplica',
        detail:
          'Los hechos gravados del Título 11 que verificamos son otros: cosméticos y perfumería, bebidas alcohólicas, tabacos, vehículos automotores y lubricantes. Importa porque la mercadería gravada por IMESI queda fuera del régimen postal en todos los casos (Ley 20.446 art. 633), y esta categoría no cae ahí.',
        source: {
          label: 'Título 11 T.O. 2023 (IMESI)',
          url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/1_T11',
        },
      },
    ],
    benefits: [
      {
        title: 'Implantes quirúrgicos al 10% de IVA',
        detail:
          'La tasa mínima alcanza los implementos a ser incorporados al organismo humano. El criterio de qué entra es el de la Resolución DGI 909/005: implantarse totalmente en el cuerpo, sustituir una superficie epitelial u ocular por cirugía, o introducirse quirúrgicamente y permanecer al menos 30 días. Un producto que se usa por fuera del cuerpo no entra, por más terapéutico que sea.',
        norm: 'Título 10 T.O. 2023, art. 36 + Resolución DGI 909/005',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/36_T10',
      },
      {
        title: 'Reactivos de diagnóstico y tiras de glicemia al 10%',
        detail:
          'Los reactivos para análisis clínicos van a la tasa mínima, y la DGI incluyó expresamente las tiras reactivas de glicemia en las Consultas 6.470 y 5.226. Ojo con la asimetría doméstica: las tiras van a la tasa mínima y el medidor, que es un producto médico externo, queda en el 22% según la Consulta DGI 6.551.',
        norm: 'Título 10 T.O. 2023, art. 36 + Consultas DGI 6.470 y 5.226',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/36_T10',
      },
      {
        title: 'Ayudas técnicas para personas con discapacidad',
        detail:
          'La Ley 18.651 exonera de tributos a la importación de prótesis auditivas, visuales y físicas, ortesis y elementos de movilidad. No es una tasa de producto sino un beneficio personal y condicionado: exige discapacidad acreditada, inscripción en el Registro Nacional de la Discapacidad, falta de ingresos suficientes y que el bien no se produzca en el país. La norma no resuelve cómo se invoca ese beneficio dentro de un envío postal.',
        norm: 'Ley 18.651, arts. 88 a 90',
        url: 'https://www.impo.com.uy/bases/leyes/18651-2010',
      },
    ],
    procedures: [
      {
        organism: 'MSP',
        when: 'Siempre que compres anteojos graduados, lentes de contacto, cristales o armazones. No hay excepción de uso personal ni monto que la habilite.',
        how: 'No hay trámite para vos. El Comunicado del MSP del 26/08/2024, que invoca el Decreto 474/968 y el Decreto 03/008, dice que estos productos no pueden ingresar a nombre de una persona física: sólo por empresas habilitadas ante el MSP. Si lo comprás igual, el envío llega sin la autorización que el MSP exige, y el art. 7 del Decreto 50/026 deja fuera del régimen a la mercadería que requiere autorización y carece de ella: se puede devolver a origen a costo del interesado dentro de los 30 días.',
        url: 'https://www.gub.uy/ministerio-salud-publica/',
      },
      {
        organism: 'MSP',
        when: 'Lentes de sol sin graduación. Es la única excepción cuantificada que publica el MSP.',
        how: 'Un particular puede pedir por única vez la liberación de hasta 2 unidades para uso personal. El trámite es pago, se hace en VUCE y exige una declaración jurada de un técnico óptico habilitado. Es por única vez: la norma no lo plantea como un cupo que se renueve.',
        url: 'https://www.vuce.gub.uy/',
      },
      {
        organism: 'MSP',
        when: 'Cuando el producto médico no está registrado en Uruguay. Si está registrado, rige la regla general y el MSP no autoriza el ingreso de productos de salud por particulares.',
        how: 'Trámite de la Dirección General de la Salud para personas físicas, gratuito, que pide la factura, el folleto del producto y una nota declarando que no se consiguió en plaza. Conviene tenerlo aprobado antes de que llegue el envío: sin el certificado previo la DNA no inicia el trámite del envío retenido.',
        url: 'https://www.gub.uy/ministerio-salud-publica/',
      },
      {
        organism: 'URSEC',
        when: 'Sólo si el aparato transmite fuera de Wi-Fi y Bluetooth. Un glucómetro o un tensiómetro que se sincroniza por Bluetooth NO necesita nada; un equipo con módem celular propio sí.',
        how: 'Las Resoluciones URSEC 275/021 y 297/021 dejan afuera de la intervención de URSEC a los dispositivos que operan únicamente en 2,4 GHz y/o 5,8 GHz con estándares Wi-Fi 802.11 o Bluetooth 802.15. Cuando sí corresponde, la propia persona física inicia el certificado en VUCE: costo publicado entre $204 y $239, plazo máximo de 2 días hábiles de URSEC, y el certificado queda enviado automáticamente al sistema de la Aduana. No está publicado cuánto tiempo vale ese certificado ni si sirve para más de un envío.',
        url: 'https://www.gub.uy/tramites/certificado-para-habilitar-ingreso-al-pais-equipos-radioelectricos-bajo-regimen-franquicia-persona-fisica',
      },
    ],
    declare: {
      intro:
        'Acá el orden importa: primero el permiso, después la compra, y recién al final la declaración. Un producto médico que necesita autorización y llega sin ella no queda caro, queda afuera del régimen entero.',
      steps: [
        {
          name: 'Chequeá si el producto puede entrar a tu nombre',
          text: 'Óptica graduada (anteojos con graduación, lentes de contacto, cristales, armazones) no puede ingresar a nombre de una persona física: sólo por empresas habilitadas ante el MSP. Lentes de sol: hasta 2 unidades, por única vez, con trámite pago en VUCE. El resto de los productos médicos entra, pero con la regla general de que el MSP no autoriza el ingreso de productos de salud por particulares, salvo la excepción del producto no registrado.',
        },
        {
          name: 'Si el producto no está registrado en Uruguay, tramitá la autorización antes de comprar',
          text: 'Es el trámite de la Dirección General de la Salud del MSP para personas físicas, gratuito. Te van a pedir la factura, el folleto del producto y una nota declarando que no lo conseguiste en plaza. El art. 7 del Decreto 50/026 deja fuera del régimen a la mercadería que requiere autorización y carece de ella: sin certificado no hay franquicia ni 60%, y se puede devolver a origen a tu costo dentro de los 30 días.',
        },
        {
          name: 'Pagá con tu propia tarjeta',
          text: 'El Decreto 50/026 art. 4 lit. d y e exige tarjeta de crédito o débito internacional, o dinero electrónico internacional de una institución regulada por el BCU, y que la titularidad coincida con la del comprador y la del destinatario. Si te lo paga un familiar, se pierde la franquicia y el envío se liquida al 60%.',
        },
        {
          name: 'Guardá la factura original del vendedor',
          text: 'El valor es el total de la factura original de compra, con todos los conceptos que figuren adicionados en ella. El envío tiene que ir acompañado de la documentación que acredite ese valor. Si el producto es un implante o un reactivo de diagnóstico, guardá también la descripción técnica: es lo único con lo que vas a poder sostener el 10%.',
        },
        {
          name: 'Decidí el régimen antes de que el operador declare',
          text: 'La declaración lleva un campo Tipo de envío (RG DNA 11/2026 num. 28 lit. c): G es franquicia y H es prestación única del 60%. Los códigos J son para envíos exceptuados del pago de tributos y ninguno de los cuatro publicados corresponde a productos médicos: el J/02 es medicamentos de uso personal. Si viene por courier, avisale al operador qué régimen querés; si viene por Correo Uruguayo, lo declarás vos en el formulario web con el tracking de 13 caracteres y los datos idénticos a los de tu cédula. No hay norma ni FAQ que diga si el régimen se puede cambiar después de presentada la declaración.',
        },
        {
          name: 'Si te corresponde el 10%, preparate para tener que reclamarlo',
          text: 'El formulario público del Correo no tiene campo para invocar una tasa distinta ni para poner NCM. La única vía publicada para pedir un tratamiento especial es la del envío retenido: la RG DNA 14/2026 num. 15 lit. k.iii permite optar por un régimen especial y adjuntar la documentación que lo acredite. Ese trámite es presencial, con agenda previa, y los certificados de otros organismos se llevan en papel.',
        },
        {
          name: 'Pagá dentro de los plazos',
          text: 'Tenés 30 días desde el ingreso al país para pagar los tributos y 90 días para retirar del depósito; vencido cualquiera de los dos hay abandono no infraccional (Decreto 50/026 art. 14). El almacenamiento durante la demora lo pagás vos. El plazo de 10 días que a veces te mencionan no es un plazo legal: es la ventana tarifaria del cargo de gestión del Correo Uruguayo.',
        },
      ],
      pitfalls: [
        'Comprar anteojos graduados o lentes de contacto pensando que el uso personal alcanza. No existe una franja general de uso personal que dispense del permiso, y estos productos no pueden ingresar a nombre de una persona física.',
        'Comprar el equipo no registrado y tramitar el permiso del MSP después. Sin el certificado previo la DNA no inicia el trámite del envío retenido y el envío queda fuera de los dos regímenes.',
        'Que te lo pague otro. Si la titularidad del medio de pago no es tuya se cae la franquicia y se liquida el 60%, aunque el paquete venga a tu nombre.',
        'Suponer que estar registrado en el MSP baja el IVA al 10%. La DGI resolvió lo contrario en la Consulta 6.551: el producto médico externo paga 22%.',
        'Pedirle al vendedor una factura por menos. La Ley 20.446 art. 632 castiga la subvaluación con multa igual al doble de los tributos que debieron pagarse, se pierde la franquicia de esa operación y la reincidencia en 12 meses prohíbe operar en el régimen por 12 meses.',
        'Creer que pagar el 60% te evita el permiso. La prestación única sustituye tributación, no autorizaciones de organismos.',
      ],
    },
    considerations: [
      'El piso de US$ 20 de IVA cambia la cuenta en las compras chicas. Un oxímetro de US$ 30 a la tasa básica daría US$ 6,60 de IVA, pero el mínimo lo lleva a US$ 20. El piso muerde por debajo de US$ 90,91 a la tasa básica y por debajo de US$ 200 a la mínima. Caveat honesto: ni las FAQ del MEF ni las de la DNA mencionan este mínimo cuando explican la franquicia, sólo lo citan para el 60%, y no existe ningún ejemplo numérico oficial de una compra con franquicia pagando IVA.',
      'El aparato y su consumible pueden tener tasas distintas: las tiras reactivas de glicemia van al 10% y el medidor al 22%. La norma no resuelve cómo se liquida una caja que mezcla las dos tasas.',
      'Estos productos consumen cupo. La excepción de los US$ 800 y de los 3 envíos por año es sólo para libros y para medicamentos de uso personal con autorización del MSP. Si dependés de un consumible que reponés seguido, los 3 envíos anuales se te van rápido.',
      'El tope de 20 kg por envío es independiente del de US$ 800 y pega justo donde no lo esperás: sillas de ruedas, andadores y camas ortopédicas son baratas en dólares y pesadas en kilos.',
      'Si el equipo trae batería de litio, el problema es el transporte, no la Aduana. No hay prohibición aduanera uruguaya: es una restricción de transporte aéreo IATA/OACI que decide cada aerolínea u operador, y el Correo Uruguayo por política propia no admite baterías de litio en envíos internacionales. No existe cifra oficial uruguaya de Wh.',
      'Bluetooth y Wi-Fi no disparan URSEC. Un tensiómetro o un glucómetro que se sincroniza con el celular queda fuera de la intervención de URSEC por las Resoluciones 275/021 y 297/021. Un equipo con módem celular propio sí necesita el certificado.',
      'En el régimen postal no necesitás despachante: ni el art. 627 de la Ley 20.446 ni el art. 17 del Decreto 50/026 lo exigen, y el CAROU art. 15 lo saca de lo preceptivo para los envíos postales no comerciales. Arriba de los US$ 800 o de los 20 kg la operación pasa a despacho formal, donde su intervención vuelve a ser la regla (CAROU art. 14).',
    ],
    faqs: [
      {
        q: '¿Puedo comprar anteojos con mi receta en una óptica online del exterior?',
        a: 'No a tu nombre. El Comunicado del MSP del 26/08/2024, que invoca el Decreto 474/968 y el Decreto 03/008, dice que los anteojos graduados, los lentes de contacto, los cristales y los armazones sólo pueden ingresar por empresas habilitadas ante el MSP. No hay monto ni cantidad publicada que lo habilite para una persona física, y tener receta no cambia nada. Si el paquete llega igual, llega sin la autorización exigida y el art. 7 del Decreto 50/026 lo deja fuera del régimen entero: no es que pagás más, es que no entra, y se puede devolver a origen a tu costo dentro de los 30 días.',
      },
      {
        q: '¿Y unos lentes de sol comunes?',
        a: 'Ahí sí hay una puerta, y es la única excepción cuantificada que publica el MSP: un particular puede pedir por única vez la liberación de hasta 2 unidades para uso personal. El trámite se hace en VUCE, es pago, y exige una declaración jurada de un técnico óptico habilitado. Es por única vez: la norma no lo plantea como un cupo que se renueve. Y son lentes de sol sin graduación: si llevan graduación volvés al caso anterior.',
      },
      {
        q: 'Mi tensiómetro está registrado en el MSP. ¿Paga 10% de IVA?',
        a: 'No. La DGI lo resolvió en la Consulta 6.551: los productos médicos externos pagan 22% aunque estén registrados en el MSP como dispositivo terapéutico. La tasa mínima del 10% alcanza sólo a los implantes quirúrgicos, con la definición estricta de la Resolución DGI 909/005, y a los reactivos de diagnóstico para análisis clínicos, incluidas las tiras reactivas de glicemia. Todo lo que se usa por fuera del cuerpo queda en la tasa básica.',
      },
      {
        q: 'Compré un oxímetro de US$ 40 con franquicia. ¿Cuánto pago?',
        a: 'Arancel, cero: la franquicia anual está exenta de aranceles. IVA, en cambio, se sigue liquidando. A la tasa básica serían US$ 8,80, pero el régimen postal tiene un mínimo de US$ 20 de IVA por envío (Ley 20.446 art. 660 y RG DNA 11/2026, Anexo I num. 27), y sólo se salvan los envíos integrados exclusivamente por bienes cuya importación esté exonerada, que no es el caso. Así que la cuenta te da US$ 20. Hay que decir el caveat: las FAQ oficiales no mencionan este mínimo al explicar la franquicia y no existe ningún ejemplo numérico oficial de una compra con franquicia pagando IVA.',
      },
      {
        q: 'Tengo discapacidad acreditada. ¿La silla de ruedas que compré online entra exonerada?',
        a: 'La Ley 18.651 arts. 88 a 90 sí exonera de tributos la importación de prótesis auditivas, visuales y físicas, ortesis y elementos de movilidad. Pero no es una tasa de producto: es un beneficio personal y condicionado, que exige discapacidad acreditada, inscripción en el Registro Nacional de la Discapacidad, falta de ingresos suficientes y que el bien no se produzca en el país. La norma no resuelve cómo se invoca ese beneficio dentro de un envío postal, y entre los códigos de tipo de envío publicados en la RG 11/2026 no hay ninguno para este caso. Si vas por ese camino, contá con que va a haber que discutirlo en un trámite presencial.',
      },
      {
        q: '¿Si pago la prestación única del 60% me ahorro el permiso del MSP?',
        a: 'No. El 60% se aplica en sustitución de toda la tributación de la importación, sea arancelaria o de tributo interno, y nada más. Las autorizaciones de organismos son otra cosa. El art. 7 del Decreto 50/026 excluye del régimen a la mercadería que requiere autorización y carece de ella, y eso deja el envío afuera de los dos caminos: ni franquicia ni prestación única. Vale la pena notar la asimetría: la Ley 20.446 art. 633 dice que el régimen podrá no aplicarse a la mercadería restringida, y el decreto convirtió esa facultad en algo categórico.',
      },
    ],
    sources: [
      {
        label: 'Decreto 50/026 — régimen de envíos postales internacionales',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
        note: 'Art. 4 (requisitos de la franquicia y medio de pago), art. 5 (valor), art. 7 (mercadería que requiere autorización), art. 14 (plazos), art. 17 (sin despachante).',
      },
      {
        label: 'Ley 20.446, art. 660 — mínimo de IVA en el régimen postal',
        url: 'https://www.impo.com.uy/bases/leyes/20446-2025/660',
        note: 'Vigente desde el 1/1/2026. El IVA del envío no puede ser inferior al equivalente a US$ 20 salvo envío integrado exclusivamente por bienes exonerados.',
      },
      {
        label: 'Ley 20.446, art. 633 — mercadería excluida del régimen',
        url: 'https://www.impo.com.uy/bases/leyes/20446-2025/633',
      },
      {
        label: 'Título 10 T.O. 2023, art. 36 — tasa mínima de IVA',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/36_T10',
        note: 'Base del 10% para implantes quirúrgicos (definidos por la Resolución DGI 909/005) y reactivos de diagnóstico (Consultas DGI 6.470 y 5.226).',
      },
      {
        label: 'Título 10 T.O. 2023, art. 34 — tasa básica de IVA',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/34_T10',
        note: 'El 22% es la regla residual; el producto médico externo queda acá según la Consulta DGI 6.551.',
      },
      {
        label: 'Ley 18.651, arts. 88 a 90 — ayudas técnicas',
        url: 'https://www.impo.com.uy/bases/leyes/18651-2010',
      },
      {
        label: 'RG DNA 11/2026',
        url: 'https://www.aduanas.gub.uy/innovaportal/file/28447/1/rg-11_2026.pdf',
        note: 'Num. 26 (excepción de cupo sólo para libros y medicamentos), Anexo I num. 27 (mínimo de IVA) y num. 28 lit. c (códigos G, H y J del campo Tipo de envío).',
      },
      {
        label: 'MSP — ¿puedo ingresar productos de salud desde el exterior?',
        url: 'https://www.gub.uy/ministerio-salud-publica/',
        note: 'El MSP no autoriza el ingreso de productos de salud por particulares; la excepción es el producto no registrado. De acá salen también el comunicado sobre óptica graduada y la liberación por única vez de hasta 2 lentes de sol.',
      },
      {
        label: 'URSEC — certificado de ingreso de equipos radioeléctricos (persona física)',
        url: 'https://www.gub.uy/tramites/certificado-para-habilitar-ingreso-al-pais-equipos-radioelectricos-bajo-regimen-franquicia-persona-fisica',
        note: 'Costo publicado entre $204 y $239, plazo máximo de 2 días hábiles. No aplica a equipos que operen únicamente con Wi-Fi o Bluetooth en 2,4 y 5,8 GHz.',
      },
      {
        label: 'DNA — productos que requieren permisos o no pueden ingresar',
        url: 'https://www.aduanas.gub.uy/innovaportal/v/28229/1/innova.front/',
        note: 'Cuidado: esta página es del 09/01/2026, anterior al Decreto 50/026. Sirve para ver qué organismo controla qué, no para las cifras del régimen.',
      },
    ],
    verifiedAt: '2026-08-15',
  },
  {
    slug: 'cosmeticos-y-perfumeria',
    productTypeId: 'cosmeticos',
    title: 'Importar cosméticos a Uruguay: IVA, IMESI y cómo declararlo',
    navLabel: 'Cosméticos y perfumería',
    description:
      'El perfume y el maquillaje pagan IMESI y por eso quedan fuera del régimen postal; el champú, el jabón y el desodorante sí entran y pagan IVA 22%, con piso de US$ 20.',
    icon: 'mdi-lipstick',
    examples: [
      'perfume, extracto o eau de parfum',
      'maquillaje: base, labial, sombras, máscara',
      'cremas faciales, sérums y contorno de ojos',
      'champú y acondicionador',
      'desodorante y antitranspirante',
      'protector solar',
      'pasta dental y cepillos de dientes',
      'tintura, decolorante y fijador para el pelo',
    ],
    notIncluded: [
      'medicamentos dermatológicos con receta: van por la categoría de medicamentos, con la puerta del MSP',
      'suplementos de colágeno, biotina o vitaminas para la piel: son suplementos, IVA 22% por criterio de la DGI',
      'depiladoras, luz pulsada y aparatos de belleza: son electrónica, no cosmética',
      'lentes de contacto cosméticos: son producto médico y no pueden ingresar a nombre de una persona física',
    ],
    regimes: {
      franquicia: {
        verdict: 'Sólo si el producto no paga IMESI',
        detail:
          'Champú, jabón de tocador, pasta dentífrica, cepillo de dientes, agua colonia, desodorante y antisudoral, talco, polvo para el cuerpo y protector solar registrado ante el MSP están fuera del hecho gravado del IMESI (Decreto 96/990 art. 27, redacción del Decreto 396/012), así que pueden venir por franquicia y pagan sólo IVA 22%. Lo mismo con acondicionadores, tinturas, decolorantes, fijadores y lociones para después de afeitar, que están a tasa 0% de IMESI. Igual corre el mínimo de US$ 20 de IVA por envío.',
        tone: 'warn',
      },
      prestacionUnica: {
        verdict: '60% del valor, mínimo US$ 20',
        detail:
          'Es opcional y sustituye toda la tributación de la importación, pero sólo existe para la cosmética que no está gravada por IMESI: si el producto paga IMESI, el envío está fuera del régimen postal entero y tampoco hay 60%. Para un champú o un desodorante, pagar 60% en vez del 22% de IVA de la franquicia no tiene sentido salvo que te hayas quedado sin cupo anual.',
        tone: 'warn',
      },
      general: {
        verdict: 'La única vía para perfume y maquillaje',
        detail:
          'Lo gravado por IMESI queda excluido del régimen postal: la Ley 20.446 art. 633 dice que el régimen no se aplicará "en ningún caso" a mercadería gravada por ese impuesto, y el Decreto 50/026 art. 7 lo reglamenta. Queda el despacho formal, donde se suman IVA, IMESI, arancel según NCM y tasa consular 5%, y donde la intervención del despachante es la regla (CAROU art. 14). No verificamos alícuotas de arancel partida por partida.',
        tone: 'bad',
      },
    },
    taxes: [
      {
        concept: 'IVA',
        value: '22%',
        detail:
          'Ningún cosmético figura en la lista de tasa mínima (art. 36) ni en la de exoneraciones (art. 38) del Título 10, así que corre la tasa básica del art. 34. En el régimen postal el IVA se calcula sobre el valor de factura o la declaración de valor.',
        source: {
          label: 'Título 10 T.O. 2023 art. 34',
          url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/34_T10',
        },
      },
      {
        concept: 'Mínimo de IVA por envío',
        value: 'US$ 20',
        detail:
          'El IVA de un envío postal no puede ser menor al equivalente a US$ 20, salvo que la caja esté integrada exclusivamente por bienes exonerados. Ningún cosmético lo está, así que el piso siempre corre: por debajo de US$ 90,91 de factura vas a pagar más que el 22%. Aviso honesto: ni la FAQ del MEF ni la de la DNA mencionan este mínimo cuando explican la franquicia (sólo lo citan para el 60%), y no hay ningún ejemplo numérico oficial de una compra con franquicia pagando IVA.',
        source: {
          label: 'Ley 20.446 art. 660',
          url: 'https://www.impo.com.uy/bases/leyes/20446-2025/660',
        },
      },
      {
        concept: 'IMESI — cosméticos y perfumería',
        value: '10%',
        detail:
          'El Título 11 art. 1 num. 8 grava cosméticos y perfumería con una tasa máxima de 20%; el Poder Ejecutivo la fijó en 10% (Decreto 96/990 art. 25 inc. 2). Es el impuesto que decide todo acá: estar gravado por IMESI te deja fuera del régimen postal.',
        source: {
          label: 'Título 11 T.O. 2023 (IMESI)',
          url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/1_T11',
        },
      },
      {
        concept: 'IMESI — productos excluidos',
        value: 'No aplica',
        detail:
          'Quedan fuera del hecho gravado: jabones de tocador, jabones, cremas y brochas de afeitar, pastas dentífricas, cepillos de dientes, aguas colonias, desodorantes y antisudorales, talco, polvo para el cuerpo, champúes y protectores solares registrados ante el MSP.',
        source: {
          label: 'Decreto 96/990 art. 27',
          url: 'https://www.impo.com.uy/bases/decretos/96-1990',
        },
      },
      {
        concept: 'IMESI — productos a tasa 0%',
        value: '0%',
        detail:
          'Acondicionadores y cremas de enjuague, decolorantes, tinturas y fijadores de cabello, y lociones para después de afeitar. Están alcanzados pero a tasa cero, y por eso tampoco quedan afuera del régimen postal por este motivo.',
        source: {
          label: 'Decreto 96/990 (reglamento del IMESI)',
          url: 'https://www.impo.com.uy/bases/decretos/96-1990',
        },
      },
      {
        concept: 'Base del IMESI para un particular',
        value: 'Valor en aduana + arancel, +50%',
        detail:
          'Para cosméticos y perfumería importados por no contribuyentes, el IMESI se calcula sobre el valor en aduana más el arancel, incrementado un 50% (Decreto 96/990 art. 11 num. I). Es definitivo: un particular no lo deduce ni lo recupera.',
        source: {
          label: 'Decreto 96/990',
          url: 'https://www.impo.com.uy/bases/decretos/96-1990',
        },
      },
      {
        concept: 'Tasa consular',
        value: '5% (sólo régimen general)',
        detail:
          'Se calcula sobre el valor en aduana (CIF) y baja a 3% si la mercadería viene amparada en el ACE N.º 18 del Mercosur. Las exoneraciones son taxativas y ninguna alcanza a la cosmética. No integra la base del IVA.',
        source: {
          label: 'Ley 19.535 art. 265',
          url: 'https://www.impo.com.uy/bases/leyes/19535-2017/265',
        },
      },
      {
        concept: 'Arancel',
        value: 'Según NCM',
        detail:
          'Dentro de la franquicia anual el envío está exento de aranceles. Fuera de ella, la alícuota depende de la partida NCM y no verificamos ninguna alícuota concreta para cosmética: no la des por sentada.',
        source: {
          label: 'Ley 20.446 art. 627',
          url: 'https://www.impo.com.uy/bases/leyes/20446-2025/627',
        },
      },
    ],
    benefits: [
      {
        title: 'Higiene personal fuera del IMESI',
        detail:
          'El decreto saca del hecho gravado a jabones de tocador, jabones, cremas y brochas de afeitar, pastas dentífricas, cepillos de dientes, aguas colonias, desodorantes y antisudorales, talco, polvo para el cuerpo, champúes y protectores solares registrados ante el MSP. El beneficio es doble: no pagan IMESI y siguen dentro del régimen postal, que es lo que el perfume pierde.',
        norm: 'Decreto 96/990 art. 27, redacción del Decreto 396/012',
        url: 'https://www.impo.com.uy/bases/decretos/96-1990',
      },
      {
        title: 'Capilares y after-shave a tasa 0% de IMESI',
        detail:
          'Acondicionadores y cremas de enjuague, decolorantes, tinturas, fijadores de cabello y lociones para después de afeitar están a tasa cero. Están alcanzados por el impuesto, pero pagan 0 y no se caen del régimen postal por estar gravados.',
        norm: 'Decreto 96/990 (reglamento del IMESI)',
        url: 'https://www.impo.com.uy/bases/decretos/96-1990',
      },
      {
        title: 'Exoneración por origen con acuerdo comercial (hasta US$ 200)',
        detail:
          'Dentro de la franquicia, los envíos de hasta US$ 200 con origen amparado en un acuerdo comercial (EE.UU./TIFA) están exonerados; la residencia fiscal del vendedor se acredita con la factura. Sirve para la cosmética que sí puede entrar por el régimen. Desde el 1/10/2026 el emisor de la factura tiene que estar registrado ante la DNA o la exoneración no se aplica.',
        norm: 'Decreto 50/026 art. 3; RG DNA 09/2026, prorrogada por las RG 12 y 21/2026',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
      },
    ],
    procedures: [
      {
        organism: 'MSP',
        when: 'Los cosméticos son productos de salud bajo control del MSP. La regla publicada es que el MSP no autoriza el ingreso al país de productos de salud del exterior por particulares (Decreto 18/020, reglamento anexo, art. 19). No existe una franja general de "uso personal" que te dispense del control, y no encontramos un trámite publicado dirigido a persona física para traer cosméticos.',
        how: 'No encontramos un trámite que una persona física pueda iniciar para su propio pedido de cosmética. Los trámites del MSP-DGS para personas físicas que sí existen son otros: el de ingreso de medicamentos no registrados y el de productos médicos no registrados. Si la Aduana te retiene el envío por control del MSP, el art. 7 del Decreto 50/026 deja la mercadería fuera de los dos regímenes cuando requiere autorización y no la tiene, y podés devolverla a origen a tu costo dentro de los 30 días.',
        url: 'https://www.gub.uy/ministerio-salud-publica/',
      },
    ],
    declare: {
      intro:
        'Acá el trámite empieza antes de comprar: el tratamiento no lo define "cosmética", lo define el producto exacto. Un frasco cambia si es agua colonia o perfume. Todo lo que sigue asume que ya verificaste de qué lado del IMESI cae lo que estás por poner en el carrito.',
      steps: [
        {
          name: 'Clasificá el producto antes de pagar',
          text: 'Buscá tu producto en la lista del Decreto 96/990 art. 27 (excluidos) y en la de tasa 0%. Si está en alguna, entra por el régimen postal. Si no está en ninguna —perfume, maquillaje, cremas faciales, esmaltes—, está gravado por IMESI y no entra: la Ley 20.446 art. 633 dice que el régimen no se aplicará "en ningún caso" a mercadería gravada por ese impuesto. Ojo con el protector solar: la exclusión del IMESI está condicionada a que el producto esté registrado ante el MSP, así que es algo para verificar antes de comprar, no para dar por sentado.',
        },
        {
          name: 'Pedí una factura con el detalle producto por producto',
          text: 'El valor declarable es el total de la factura original con todos los conceptos adicionados (Decreto 50/026 art. 5), pero acá además necesitás que el detalle diga qué es cada cosa. Una factura que dice "beauty products" te deja sin argumento para sostener que es champú y no perfume. Guardá también el link del producto con su descripción.',
        },
        {
          name: 'Pagá vos, con tu tarjeta',
          text: 'Tarjeta de crédito o débito internacional, o dinero electrónico internacional de una institución regulada por el BCU, y la titularidad tiene que coincidir con el titular de la compra y con el destinatario (Decreto 50/026 art. 4 lit. d y e). Si pagó un tercero se pierde la franquicia y el envío se liquida al 60%.',
        },
        {
          name: 'Fijá el tipo de envío en la declaración',
          text: 'La declaración aduanera lleva un campo "Tipo de envío" (RG DNA 11/2026 num. 28 lit. c): "G" es franquicia y "H" es prestación única del 60%. Si venís por courier, el operador declara por vos: pedile por escrito que vaya como "G". Los códigos J son para envíos exceptuados de tributos por su contenido —J/01 material de la Ley 15.913 (libros), J/02 medicamentos de uso personal, J/03 numismática, J/04 valija diplomática— y ninguno cubre cosmética.',
        },
        {
          name: 'Si llega por Correo Uruguayo, declaralo vos primero',
          text: 'Entrá al formulario web del Correo ("Ahíva") con el tracking de 13 caracteres y datos idénticos a los de tu cédula, y elegí compra u obsequio, franquicia sí o no, y medio de pago. Ese formulario no tiene campo para invocar tratamientos especiales ni para poner NCM. Aviso: el paso 3 de esa página del Correo (actualizada el 03/08/2026) todavía publica los topes derogados de US$ 50 y US$ 200 del Decreto 356/014 como condición de la franquicia. No son los vigentes.',
        },
        {
          name: 'Registrá el rubro y pagá dentro del plazo',
          text: 'El Anexo del Decreto 50/026 obliga a registrar cada envío en un rubro codificado y en esa nómina no hay rubro de cosmética: cae en "Otros". Es un rubro estadístico, no define el tratamiento tributario. Tenés 30 días desde el ingreso al país para pagar los tributos y 90 días para retirar del depósito; pasados esos plazos, abandono no infraccional (Decreto 50/026 art. 14).',
        },
        {
          name: 'Si queda retenido, agendá y andá con papeles',
          text: 'El trámite de envío retenido es presencial y con agenda previa, y los certificados de otros organismos se llevan en papel. El almacenamiento durante la demora lo pagás vos. En envío retenido la RG DNA 14/2026 num. 15 lit. k.iii sí permite optar por un régimen especial y adjuntar la documentación que lo acredite.',
        },
      ],
      pitfalls: [
        'Comprar un perfume creyendo que entra por franquicia. Está gravado por IMESI y el régimen postal no se aplica "en ningún caso" a mercadería gravada por ese impuesto (Ley 20.446 art. 633). No es que pagues más: no entra por ese canal.',
        'Factura genérica. Si dice "cosmetics" o "gift" y no producto por producto, la clasificación la termina haciendo la Aduana y perdés la discusión sobre si tu frasco es agua colonia o perfume.',
        'Mezclar en la misma caja. No hay norma ni FAQ que resuelva qué pasa con un envío que combina un perfume gravado con champú no gravado. Si te importa el resultado, no lo mezcles.',
        'Pagar con la tarjeta de otro o comprar a nombre de otro: se pierde la franquicia y se liquida al 60% (Decreto 50/026 art. 15 y FAQ de la DNA).',
        'Subvaluar para esquivar el IMESI o el piso de US$ 20: la multa es igual al doble de los tributos que debieron pagarse, la reincidencia dentro de los 12 meses te prohíbe operar en el régimen por 12 meses y esa operación no consume cupo (Ley 20.446 art. 632).',
        'Dejar que el operador elija el régimen por default. No hay norma ni FAQ que diga si se puede cambiar la opción de régimen después de presentada la declaración.',
      ],
    },
    considerations: [
      'La pregunta que decide todo es una sola: ¿tu producto está gravado por IMESI? Si sí, no hay régimen postal. Si no, es un envío común que paga IVA 22%.',
      'El aerosol es un problema aparte del impuesto: el Correo Uruguayo no admite gases comprimidos ni aerosoles como mercancía peligrosa, por el envase y no por la función. Un desodorante en aerosol o un fijador en spray pueden quedar frenados aunque tributariamente estén limpios.',
      'El piso de US$ 20 de IVA hace que los pedidos chicos de cosmética rindan mal: por debajo de US$ 90,91 de factura pagás el mínimo, no el 22%. Juntar el pedido en un envío más grande baja el costo efectivo por producto.',
      'El protector solar sólo sale del IMESI si está registrado ante el MSP. Si comprás una marca que no se vende en Uruguay, esa condición es la que puede fallar.',
      'El líquido pesa: el tope del régimen son 20 kg por envío, independiente del tope de US$ 800 de factura. Un pedido de champú y acondicionador llega antes al kilaje que al monto.',
      'Los cosméticos están bajo control del MSP y no encontramos ninguna vía publicada para que un particular pida autorización. Si te retienen el envío por ese motivo, la mercadería queda fuera de los dos regímenes y la única salida publicada es devolverla a origen a tu costo dentro de los 30 días.',
      'El cupo se imputa por fecha de desaduanamiento, no por fecha de compra (FAQ de la DNA). Comprar el 28 de diciembre no te garantiza que consuma el cupo de ese año.',
    ],
    faqs: [
      {
        q: '¿Puedo traer un perfume por courier o por el Correo?',
        a: 'Por el régimen de envíos postales, no. La perfumería está gravada por IMESI (Título 11 art. 1 num. 8, tasa fijada en 10% por el Decreto 96/990 art. 25 inc. 2) y la Ley 20.446 art. 633 dice que el régimen no se aplicará "en ningún caso" a mercadería gravada por ese impuesto; el Decreto 50/026 art. 7 lo reglamenta. No es cuestión de pagar más: no hay franquicia ni prestación única del 60% disponible. Queda el despacho formal por régimen general, con DUA y con el despachante como regla (CAROU art. 14). Distinto es el caso del agua colonia, que el Decreto 96/990 art. 27 nombra expresamente entre los productos no gravados.',
      },
      {
        q: '¿Champú, desodorante y pasta de dientes entran normal?',
        a: 'Sí. Están entre los productos que el Decreto 96/990 art. 27 saca del hecho gravado del IMESI, así que no se caen del régimen postal por ese motivo y pagan IVA 22% sobre el valor de factura. También quedan adentro los acondicionadores, tinturas, decolorantes, fijadores y lociones para después de afeitar, que están a tasa 0% de IMESI. Sigue corriendo el mínimo de US$ 20 de IVA por envío y sigue consumiendo cupo de la franquicia si la usás.',
      },
      {
        q: 'Compro US$ 60 de champú y acondicionador. ¿Cuánto pago?',
        a: 'El 22% de US$ 60 son US$ 13,20, pero el mínimo de IVA del régimen postal es US$ 20 por envío, y la excepción sólo corre si la caja está integrada exclusivamente por bienes exonerados, cosa que ningún cosmético es. Así que pagás US$ 20 (Ley 20.446 art. 660 y RG DNA 11/2026 num. 27). El envío te consume uno de los 3 del año y US$ 60 del cupo de US$ 800. Aclaración necesaria: no está resuelto si el incremento del 50% de la base del art. 13 lit. B también corre en el régimen postal; nuestra cuenta aplica el inciso postal, que manda liquidar sobre el valor de factura, sin ese incremento.',
      },
      {
        q: '¿Me conviene pagar el 60% en vez de la franquicia?',
        a: 'Para cosmética no gravada por IMESI, casi nunca: la franquicia te deja pagando IVA 22% y la prestación única es 60% del valor. La opción es del titular —la ley dice que "podrá optar"— y tiene sentido si ya usaste los 3 envíos del año o agotaste los US$ 800, o si el envío no cumple algún requisito de la franquicia. Los dos caminos tienen un piso de US$ 20 por envío, pero por conceptos distintos: en la prestación única es el mínimo de la propia prestación, y en la franquicia es el mínimo de IVA. Y si el producto está gravado por IMESI, ninguno de los dos está disponible.',
      },
      {
        q: '¿El MSP me puede frenar el paquete de cosmética?',
        a: 'Los cosméticos son productos de salud bajo control del MSP, y la regla publicada por el ministerio es que no autoriza el ingreso al país de productos de salud del exterior por particulares (Decreto 18/020, reglamento anexo, art. 19). No existe una franja general de "uso personal" que te dispense del control, y no encontramos un trámite en VUCE pensado para que una persona física traiga su propia cosmética. Si el envío queda retenido por ese motivo, el art. 7 del Decreto 50/026 lo deja fuera de los dos regímenes y la salida publicada es devolverlo a origen a tu costo dentro de los 30 días. Cuánto de esto se aplica en el mostrador es práctica de la Aduana, no norma escrita.',
      },
      {
        q: '¿Y si es un regalo que me manda un familiar del exterior?',
        a: 'Los obsequios familiares entre personas físicas, en cantidades razonables y para uso personal, están exentos de todo tributo dentro de la franquicia (Decreto 50/026 art. 3), aunque igual consumen cupo. Pero la exención tributaria no cambia la exclusión del IMESI: si lo que te mandan es un perfume, el envío sigue siendo mercadería gravada por IMESI y el régimen postal no se le aplica. Para un jabón, un champú o un agua colonia, en cambio, el obsequio familiar funciona.',
      },
    ],
    sources: [
      {
        label: 'Decreto 96/990 — reglamento del IMESI (arts. 11, 25 y 27)',
        url: 'https://www.impo.com.uy/bases/decretos/96-1990',
        note: 'Fija la tasa en 10%, lista los productos excluidos del hecho gravado y los de tasa 0%, y define la base +50% para el no contribuyente.',
      },
      {
        label: 'Título 11 T.O. 2023 — IMESI',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/1_T11',
        note: 'Art. 1 num. 8: cosméticos y perfumería, tasa máxima 20%.',
      },
      {
        label: 'Ley 20.446 art. 633',
        url: 'https://www.impo.com.uy/bases/leyes/20446-2025/633',
        note: 'El régimen de envíos postales no se aplica "en ningún caso" a mercadería gravada por IMESI.',
      },
      {
        label: 'Decreto 50/026 — régimen de envíos postales internacionales',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
        note: 'Art. 3 exoneraciones, art. 4 requisitos, art. 5 valor, art. 7 exclusiones, art. 14 plazos, art. 15 pérdida de la franquicia.',
      },
      {
        label: 'Título 10 T.O. 2023 art. 34 — tasas del IVA',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/34_T10',
        note: 'Tasa básica 22%: ningún cosmético figura en la tasa mínima del art. 36 ni en las exoneraciones del art. 38.',
      },
      {
        label: 'Ley 20.446 art. 660 — mínimo de IVA en envíos postales',
        url: 'https://www.impo.com.uy/bases/leyes/20446-2025/660',
        note: 'El IVA no puede ser inferior a US$ 20 salvo envío integrado exclusivamente por bienes exonerados.',
      },
      {
        label: 'RG DNA 11/2026',
        url: 'https://www.aduanas.gub.uy/innovaportal/file/28447/1/rg-11_2026.pdf',
        note: 'Num. 27 repite el mínimo de US$ 20; num. 28 lit. c define los códigos de tipo de envío G, H y J.',
      },
      {
        label: 'DNA — preguntas frecuentes del régimen 2026',
        url: 'https://www.aduanas.gub.uy/innovaportal/v/28231/1/innova.front/',
        note: 'Imputación del cupo por fecha de desaduanamiento y pérdida de la franquicia si pagó un tercero.',
      },
      {
        label: 'Correo Uruguayo — cómo declarar su compra u obsequio',
        url: 'https://www.correo.com.uy/como-declarar-su-compra-u-obsequio',
        note: 'Formulario web de declaración. Atención: su paso 3 todavía publica los topes derogados de US$ 50 y US$ 200.',
      },
    ],
    verifiedAt: '2026-08-15',
  },
  {
    slug: 'alimentos',
    productTypeId: 'alimentos',
    title: 'Importar alimentos a Uruguay: impuestos, exenciones y cómo declarar',
    navLabel: 'Alimentos',
    description:
      'Arroz, fideos, aceite, yerba y café pagan 10% de IVA, pero el mínimo de US$ 20 muerde por debajo de US$ 200, y el MGAP prohíbe por correo todo alimento de origen animal.',
    icon: 'mdi-food-apple',
    examples: [
      'Yerba y café en grano',
      'Arroz, fideos y harinas',
      'Aceite de oliva y otros aceites comestibles',
      'Té y especias en envases chicos',
      'Snacks, chocolates y galletitas',
      'Gaseosas y bebidas sin alcohol',
      'Salsas, condimentos y mezclas secas',
      'Sal y azúcar de uso doméstico',
    ],
    notIncluded: [
      'Carne, fiambres, quesos, leche y cualquier alimento de origen animal: la Resolución MGAP 1.720/021 los prohíbe por encomienda o correo, sin franja de uso personal',
      'Frutas y verduras frescas, semillas y plantas: prohibidas por el mismo anexo del MGAP',
      'Bebidas alcohólicas: quedan fuera del régimen postal en todos los casos por estar gravadas con IMESI (Ley 20.446 art. 633)',
      'Suplementos y vitaminas: pagan 22% y los controla el MSP; tienen su propia ficha',
    ],
    regimes: {
      franquicia: {
        verdict: 'IVA 10% o 22%, mínimo US$ 20',
        detail:
          'La franquicia exime aranceles pero el IVA se sigue liquidando (Ley 20.446 art. 627 inc. 2). Los alimentos de la tasa mínima pagan 10% y el resto 22%, sobre el valor de factura. El monto de IVA no puede ser inferior al equivalente a US$ 20 por envío, salvo que la caja lleve exclusivamente bienes exonerados: a la tasa del 10% ese piso muerde en toda compra por debajo de US$ 200.',
        tone: 'warn',
      },
      prestacionUnica: {
        verdict: '60% del valor, mínimo US$ 20',
        detail:
          'Es opcional: la ley dice que el titular "podrá optar" por pagarla, y sustituye toda tributación de la importación. Para alimentos no hay caso en que salga más barata que la franquicia: el 60% siempre iguala o supera al IVA del 10% o del 22% con el mismo piso de US$ 20. Sirve cuando ya usaste los 3 envíos o los US$ 800 del año, o cuando no cumplís algún requisito de la franquicia.',
        tone: 'warn',
      },
      general: {
        verdict: 'Otro canal, con más tributos',
        detail:
          'Fuera del régimen postal la importación va con DUA y ahí se suman la tasa consular de 5% sobre el valor en aduana (3% si viene amparada en el ACE N.º 18 del Mercosur), el arancel que corresponda al NCM y un IVA que se calcula sobre valor en aduana más arancel, incrementado un 50% por importar un no contribuyente. La prohibición del MGAP está escrita para el ingreso por encomienda o correo; qué exige el MGAP fuera de ese canal no lo resuelven las fuentes que revisamos.',
        tone: 'warn',
      },
    },
    taxes: [
      {
        concept: 'IVA tasa mínima',
        value: '10%',
        detail:
          'Pan blanco común y galleta de campaña, pescado, carne y menudencias frescos, enfriados o congelados, aceites comestibles, arroz, harina de cereales y subproductos de su molienda, pastas y fideos, sal para uso doméstico, azúcar, yerba, café, té y grasas comestibles. La yerba al 10% admite mezclas con otras hierbas de hasta un 15%. Carne avícola, porcina y de conejo también van al 10%, y frutas, flores y hortalizas en estado natural cuando se venden a consumidores finales.',
        source: {
          label: 'Título 10 T.O. 2023 art. 36',
          url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/36_T10',
        },
      },
      {
        concept: 'IVA tasa básica',
        value: '22%',
        detail:
          'Todo alimento que no esté en la lista de la tasa mínima ni exonerado: snacks, chocolates, galletitas, gaseosas, suplementos alimenticios, mezclas y preparados. Es la regla residual del art. 34.',
        source: {
          label: 'Título 10 T.O. 2023 art. 34',
          url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/34_T10',
        },
      },
      {
        concept: 'IVA — leche',
        value: '0% (exento)',
        detail:
          'La leche pasterizada, ultrapasterizada, vitaminizada, descremada y en polvo está exonerada, y la exoneración de la venta interna se extiende a la importación. Quedan afuera la leche saborizada y la UHT/UAT. Es la única exoneración de IVA sobre alimentos que encontramos efectivamente vigente, y es leche: un alimento de origen animal, que el MGAP no deja entrar por encomienda ni correo. En la práctica, por este canal no la vas a poder usar.',
        source: {
          label: 'Título 10 T.O. 2023 art. 38',
          url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/38_T10',
        },
      },
      {
        concept: 'Piso de IVA del régimen postal',
        value: 'US$ 20 por envío',
        detail:
          'El IVA de un envío postal no puede ser inferior al equivalente a US$ 20, salvo que el envío esté integrado exclusivamente por bienes cuya importación está exonerada. A la tasa mínima el piso muerde por debajo de US$ 200 de factura; a la básica, por debajo de US$ 90,91. Aviso necesario: ni las preguntas frecuentes del MEF ni las de la DNA mencionan este mínimo cuando explican la franquicia (sólo lo citan para el 60%), y no hay ningún ejemplo numérico oficial de una compra con franquicia que pague IVA.',
        source: {
          label: 'Ley 20.446 art. 660',
          url: 'https://www.impo.com.uy/bases/leyes/20446-2025/660',
        },
      },
      {
        concept: 'Arancel',
        value: '0% con franquicia',
        detail:
          'La franquicia anual es expresamente exenta de aranceles y la prestación única del 60% los sustituye. Fuera del régimen postal el arancel depende del NCM del producto y no verificamos alícuotas partida por partida: no te fíes de ningún porcentaje que no salga del listado vigente.',
        source: {
          label: 'Ley 20.446 art. 627',
          url: 'https://www.impo.com.uy/bases/leyes/20446-2025/627',
        },
      },
      {
        concept: 'Tasa consular',
        value: '5% (3% Mercosur) sólo en el régimen general',
        detail:
          'Es un tributo del despacho formal, sobre el valor en aduana, y sus exoneraciones son taxativas: admisión temporaria, petróleo crudo y ciertos combustibles, y bienes de capital de uso industrial, agropecuario o pesquero. Ningún alimento está en esa lista. El Poder Ejecutivo está facultado a bajarla y no lo hizo.',
        source: {
          label: 'Ley 19.535 art. 265',
          url: 'https://www.impo.com.uy/bases/leyes/19535-2017/265',
        },
      },
      {
        concept: 'IMESI',
        value: 'No aplica a los alimentos',
        detail:
          'No encontramos alimentos entre los rubros gravados por IMESI que verificamos (bebidas alcohólicas y tabaco, cosméticos y perfumería, vehículos y lubricantes). Las bebidas alcohólicas y el tabaco sí están gravados, y esa mercadería queda fuera del régimen postal de forma absoluta. Si en la misma caja metés una botella, el problema deja de ser la tasa y pasa a ser que el envío no entra por este régimen.',
        source: {
          label: 'Ley 20.446 art. 633',
          url: 'https://www.impo.com.uy/bases/leyes/20446-2025/633',
        },
      },
    ],
    benefits: [
      {
        title: 'Tasa mínima del 10% para la comida de despensa',
        detail:
          'Arroz, fideos y pastas, harinas y subproductos de su molienda, aceites comestibles, azúcar, sal de uso doméstico, yerba, café y té pagan 10% en vez de 22% sobre el mismo valor de factura. No encontramos ningún trámite publicado para pedir la tasa mínima: sale de la naturaleza del producto, siempre que la factura permita identificarlo.',
        norm: 'Título 10 T.O. 2023 art. 36 lit. A y Decreto 220/998 art. 101 lit. a',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/36_T10',
      },
      {
        title: 'Frutas, flores y hortalizas en estado natural al 10%',
        detail:
          'La tasa mínima las alcanza cuando se venden a consumidores finales. Anotado por completitud tributaria: por encomienda o correo no entran igual, porque el anexo del MGAP prohíbe frutas y verduras frescas.',
        norm: 'Título 10 T.O. 2023 art. 36 lit. K',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/36_T10',
      },
      {
        title: 'Leche exonerada de IVA, y con ella la excepción al piso de US$ 20',
        detail:
          'La leche pasterizada, ultrapasterizada, vitaminizada, descremada y en polvo está exonerada (no la saborizada ni la UHT/UAT), y un envío integrado exclusivamente por bienes exonerados no tiene el mínimo de US$ 20. El beneficio existe en el papel; el freno es sanitario, no tributario: es alimento de origen animal y el MGAP lo prohíbe por este canal.',
        norm: 'Título 10 T.O. 2023 art. 38 num. 1 lit. F y num. 3 lit. B',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/38_T10',
      },
      {
        title: 'Obsequio familiar entre personas físicas: exento de todo tributo',
        detail:
          'Si el envío es no comercial entre personas físicas, con mercadería en cantidades razonables y para uso personal, queda exento de todo tributo. Igual consume cupo del año, y no levanta ninguna prohibición sanitaria: un paquete de comida casera de origen animal sigue sin poder entrar.',
        norm: 'Decreto 50/026 art. 3',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
      },
    ],
    procedures: [
      {
        organism: 'MGAP',
        when: 'Hay que mirarlo antes de comprar, siempre. No es un permiso que se pide: es una prohibición de canal. No pueden ingresar por encomienda ni correo los alimentos de origen animal, las frutas y verduras frescas, las semillas, las plantas, los animales vivos, los fertilizantes ni los plaguicidas, y no hay franja de uso personal que dispense de eso. Los productos vegetales acondicionados al detalle —té, especias, orégano— están prohibidos sólo en envases de más de 500 gramos; por debajo de ese corte el anexo no los prohíbe, lo que no es lo mismo que un permiso: la nómina no es taxativa.',
        how: 'El MGAP publica una nómina de productos autorizados a ingresar al país. No encontramos un trámite dirigido a persona física para liberar lo prohibido, ni una cantidad tolerada. Y la nómina no es taxativa: cualquier otro producto puede quedar prohibido si le falta el certificado oficial que corresponda. Si tu producto no aparece claramente del lado autorizado, tratalo como riesgo, no como permitido.',
        url: 'https://www.gub.uy/ministerio-ganaderia-agricultura-pesca/comunicacion/publicaciones/nomina-productos-autorizados-ingresar-pais',
      },
    ],
    declare: {
      intro:
        'Con alimentos la declaración se juega antes de pagar: casi todos los problemas son de contenido, no de tributo. Y lo poco que hay que hacer bien del lado impositivo es que la factura deje ver qué comida es, porque la diferencia entre 10% y 22% la define el producto, no lo que vos escribas.',
      steps: [
        {
          name: 'Contrastá lo que comprás contra la nómina del MGAP',
          text: 'Antes de pagar. Si el carrito tiene algo de origen animal, fruta o verdura fresca, semillas o plantas, no lo compres para que venga por correo o encomienda: está prohibido y no hay trámite de persona física publicado para destrabarlo.',
        },
        {
          name: 'Mirá el gramaje de cada envase',
          text: 'Los productos vegetales acondicionados al detalle están prohibidos sólo en envases de más de 500 gramos. Té, especias y orégano son los ejemplos del propio anexo. Un paquete grande de un producto vegetal es exactamente el error caro, y el corte es por envase, no por total del envío.',
        },
        {
          name: 'Hacé la cuenta con el piso de US$ 20 puesto',
          text: 'Franquicia: pagás el IVA que corresponda al producto (10% o 22%) sobre el valor de factura, pero nunca menos de US$ 20 por envío. Prestación única: 60% del valor con el mismo mínimo. Con alimentos de tasa mínima, todo lo que compres por debajo de US$ 200 termina pagando los US$ 20. Consolidar en menos envíos es lo que te ahorra piso; ojo que los 20 kg por envío se llenan rápido con comida.',
        },
        {
          name: 'Decile al operador qué tipo de envío declarar',
          text: 'La declaración aduanera tiene un campo "Tipo de envío": G es régimen de franquicia y H es prestación única del 60%. Los alimentos no tienen código propio de excepción: los J/01 y J/02 son sólo para material de la Ley 15.913 (libros) y medicamentos de uso personal con autorización del MSP. El default del operador es G. Si querés el otro régimen, pedilo por escrito al courier o al operador postal antes del arribo: ninguna norma ni FAQ dice si se puede cambiar después de presentada la declaración.',
        },
        {
          name: 'Pagá con tu propia tarjeta o dinero electrónico',
          text: 'Tiene que ser tarjeta de crédito o débito internacional, o dinero electrónico internacional emitido por una institución regulada por el BCU, y la titularidad tiene que coincidir con quien compra y con el destinatario. Si te lo paga un familiar con su tarjeta, perdés la franquicia y el envío se liquida al 60%.',
        },
        {
          name: 'Si viene por Correo Uruguayo, declaralo vos primero',
          text: 'Entrá al formulario web del Correo con el tracking de 13 caracteres y poné los datos idénticos a los de tu cédula. Aviso: el paso 3 de esa página todavía publica como condición de la franquicia los topes derogados de US$ 50 para envíos no exprés y US$ 200 para EMS, del Decreto 356/014. Ignorá esas cifras: el régimen vigente es el del Decreto 50/026.',
        },
        {
          name: 'Guardá la factura discriminada y contá los plazos',
          text: 'El envío tiene que ir acompañado de documentación que acredite el valor, y esa factura es la que sostiene que lo tuyo es arroz o yerba y no "grocery". Desde el ingreso al país tenés 30 días para pagar los tributos y 90 días para retirar del depósito; vencidos, abandono no infraccional. Si te lo retienen, el trámite es presencial con agenda previa, los certificados de otros organismos van en papel, y el almacenamiento durante la demora lo pagás vos.',
        },
      ],
      pitfalls: [
        'Meter un solo producto gravado junto a los exonerados: la excepción al piso de US$ 20 exige que el envío esté integrado exclusivamente por bienes exonerados, y un ítem alcanza para perderla.',
        'Factura genérica que dice "food" o "grocery": sin poder identificar el producto no hay cómo sostener el 10%, y la regla residual es 22%.',
        'Que pague otra persona. Si la titularidad del medio de pago no coincide con la del comprador y la del destinatario, se cae la franquicia y se liquida el 60%.',
        'Suponer que "es poquito" salva un alimento de origen animal. No existe franja general de uso personal que dispense de los permisos y prohibiciones de otros organismos.',
        'Declarar menos de lo que pagaste: la multa es igual al doble de los tributos que debieron pagarse, se pierde la franquicia de esa operación y la reincidencia dentro de 12 meses te prohíbe operar en el régimen por otros 12.',
        'Dejar que el operador declare el tipo de envío por su cuenta cuando querés franquicia: la opción de régimen es un campo de la declaración y ninguna norma ni FAQ dice si se puede cambiar después de presentada.',
      ],
    },
    considerations: [
      'El piso de US$ 20 de IVA arruina la compra chica. Comprar US$ 40 de fideos paga lo mismo que comprar US$ 200: veinte dólares. En alimentos de tasa mínima, todo lo que esté por debajo de US$ 200 está pagando de más en términos porcentuales.',
      'El límite que te va a frenar es el peso, no el dinero. Son 20 kg por envío y US$ 800 por año, y son independientes: con comida llenás los kilos mucho antes que los dólares.',
      'Lo verdaderamente decisivo es sanitario. La prohibición del MGAP alcanza categorías enteras de comida y no admite excepción por cantidad; la nómina, además, no es taxativa, así que el silencio sobre tu producto no equivale a permiso.',
      'El calendario juega en contra de lo perecedero: 30 días para pagar tributos, 90 para retirar del depósito, y si el envío se retiene el trámite es presencial con agenda previa. Comida con vencimiento corto y un envío trabado no combinan.',
      'Un producto que parece alimento puede no serlo a efectos de la tasa. Los suplementos alimenticios pagan 22% —el criterio de la DGI mira la inscripción en el registro del MSP, no la finalidad nutricional— y además caen bajo control del MSP.',
      'Si en la misma compra metés bebidas alcohólicas, el envío entero deja de ser un problema de tasa: la mercadería gravada por IMESI está excluida del régimen postal en todos los casos.',
      'Las exoneraciones de carne ovina, pescado, carne de ave y carne de cerdo del art. 38 son condicionales, dependen de que lo disponga el Poder Ejecutivo, y no encontramos decreto que las haya puesto en vigencia: en los hechos siguen al 10%.',
    ],
    faqs: [
      {
        q: '¿Puedo traer yerba, café o té del exterior por correo?',
        a: 'Del lado tributario, sí: los tres están en la tasa mínima del 10%, y la yerba admite mezclas con otras hierbas de hasta un 15% sin perderla. Del lado sanitario, el anexo del MGAP prohíbe los productos vegetales acondicionados al detalle sólo cuando el envase pasa de 500 gramos, y nombra justamente al té y a las especias como ejemplo. Mirá el envase antes de comprar: el corte es por envase, no por peso total del envío. Y acordate de que si la compra queda por debajo de US$ 200, el IVA no baja de US$ 20.',
      },
      {
        q: '¿Cuánto pago por una compra de US$ 50 de fideos y aceite?',
        a: 'Por franquicia, el IVA sería el 10% de US$ 50, o sea US$ 5, pero el régimen postal fija que el monto de IVA no puede ser inferior al equivalente a US$ 20: pagás US$ 20. Por prestación única serían el 60% de US$ 50, o sea US$ 30. La franquicia gana, y el envío te consume uno de los tres del año y US$ 50 del cupo de US$ 800. Un aviso que corresponde: ni las preguntas frecuentes del MEF ni las de la DNA mencionan ese mínimo cuando explican la franquicia, y no existe ejemplo numérico oficial de una compra con franquicia que pague IVA. El mínimo está en la ley y en la resolución de la DNA, pero la comunicación oficial no lo repite.',
      },
      {
        q: '¿Y el chocolate, las galletitas y los snacks?',
        a: 'Tributariamente, 22%: no figuran en la tasa mínima ni entre las exoneraciones, así que corre la regla residual. Con el piso de US$ 20, cualquier compra por debajo de US$ 90,91 termina pagando esos veinte dólares igual. El punto delicado es otro: la prohibición del MGAP alcanza a los alimentos de origen animal, y el anexo no resuelve expresamente el caso del producto procesado que lleva leche o manteca entre sus ingredientes. No podemos decirte que un chocolate con leche pase, ni que no pase: la norma no lo aclara y la nómina no es taxativa.',
      },
      {
        q: 'La leche en polvo está exonerada de IVA, ¿me conviene traerla?',
        a: 'La exoneración existe y es amplia: leche pasterizada, ultrapasterizada, vitaminizada, descremada y en polvo, con la exoneración de la venta interna extendida a la importación, y quedan afuera la saborizada y la UHT/UAT. Además, un envío integrado exclusivamente por bienes exonerados no tiene el mínimo de US$ 20. El problema es que la leche es un alimento de origen animal y la Resolución MGAP 1.720/021 prohíbe ingresar alimentos de origen animal por encomienda o correo, sin franja de uso personal. Por este canal, el beneficio tributario no se puede aprovechar.',
      },
      {
        q: '¿Tengo que hacer algún trámite en el MGAP antes de que llegue el paquete?',
        a: 'No hay un trámite de persona física publicado para liberar alimentos por este canal. Lo que hay es una nómina de productos autorizados a ingresar al país: si tu producto está del lado prohibido, no es cuestión de conseguir un papel, no entra por encomienda ni correo. Y si no aparece, tampoco quiere decir que esté habilitado: la propia resolución aclara que la lista no es taxativa y que cualquier producto puede quedar prohibido si le falta el certificado oficial que corresponda. Para los productos vegetales acondicionados al detalle en envases de hasta 500 g, el anexo no los prohíbe y no encontramos gestión previa exigida; tampoco encontramos una constancia oficial de que estén habilitados.',
      },
      {
        q: 'Mi familia en el exterior me quiere mandar comida de regalo. ¿Cambia algo?',
        a: 'En tributos sí: el obsequio familiar entre personas físicas, no comercial, en cantidades razonables y para uso personal, está exento de todo tributo. Pero consume cupo del año igual. En sanidad no cambia nada: si el paquete lleva algo de origen animal, fruta o verdura fresca o semillas, la prohibición del MGAP se aplica igual, sea regalo o compra. Y si el envío se traba, el trámite presencial con agenda previa y el almacenamiento los vas a tener que resolver vos, acá.',
      },
    ],
    sources: [
      {
        label: 'Título 10 T.O. 2023 art. 36 — IVA tasa mínima',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/36_T10',
        note: 'Lit. A (canasta), lit. K (frutas, flores y hortalizas en estado natural a consumidores finales) y lit. L (carne avícola, porcina y de conejo).',
      },
      {
        label: 'Título 10 T.O. 2023 art. 38 — exoneraciones de IVA',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/38_T10',
        note: 'Num. 1 lit. F exonera la leche (sin saborizada ni UHT/UAT); num. 3 lit. B extiende la exoneración a la importación.',
      },
      {
        label: 'Título 10 T.O. 2023 art. 34 — tasa básica 22%',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/34_T10',
        note: 'La regla residual: todo lo que no esté exonerado ni en la tasa mínima.',
      },
      {
        label: 'Ley 20.446 art. 660 — piso de US$ 20 de IVA en envíos postales',
        url: 'https://www.impo.com.uy/bases/leyes/20446-2025/660',
        note: 'Vigente desde el 1/1/2026; la excepción exige que el envío esté integrado exclusivamente por bienes exonerados.',
      },
      {
        label: 'Ley 20.446 art. 627 — franquicia y prestación única',
        url: 'https://www.impo.com.uy/bases/leyes/20446-2025/627',
        note: 'La franquicia es exenta de aranceles y el IVA se sigue liquidando; el 60% es opcional ("podrá optar").',
      },
      {
        label: 'Decreto 50/026 — reglamento del régimen postal',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
        note: 'Valor de factura (art. 5), medio de pago y requisitos (art. 4), obsequios familiares (art. 3), plazos de 30 y 90 días (art. 14).',
      },
      {
        label: 'Resolución MGAP 1.720/021 — nómina de productos autorizados a ingresar',
        url: 'https://www.gub.uy/ministerio-ganaderia-agricultura-pesca/comunicacion/publicaciones/nomina-productos-autorizados-ingresar-pais',
        note: 'Prohíbe por encomienda o correo alimentos de origen animal, frutas y verduras frescas, semillas, plantas, animales vivos, fertilizantes y plaguicidas; el corte de 500 g rige para vegetales acondicionados al detalle.',
      },
      {
        label: 'RG DNA 11/2026 — procedimiento del régimen',
        url: 'https://www.aduanas.gub.uy/innovaportal/file/28447/1/rg-11_2026.pdf',
        note: 'Anexo I num. 27 repite el mínimo de US$ 20; num. 28 lit. c define los códigos de tipo de envío G, H y J.',
      },
      {
        label: 'Correo Uruguayo — cómo declarar su compra u obsequio',
        url: 'https://www.correo.com.uy/como-declarar-su-compra-u-obsequio',
        note: 'Formulario web con tracking de 13 caracteres. Atención: al 03/08/2026 el paso 3 sigue publicando los topes derogados de US$ 50 y US$ 200.',
      },
    ],
    verifiedAt: '2026-08-15',
  },
  {
    slug: 'plantas-semillas-y-fertilizantes',
    productTypeId: 'agro',
    title: 'Importar plantas, semillas y fertilizantes a Uruguay: permisos e IVA',
    navLabel: 'Plantas y semillas',
    description:
      'El MGAP prohíbe ingresar semillas, plantas, fertilizantes y plaguicidas por correo o encomienda: no hay franja de uso personal y pagar el 60% no lo destraba.',
    icon: 'mdi-sprout',
    examples: [
      'Semillas de hortalizas, flores o césped para siembra',
      'Plantines, esquejes y plantas vivas',
      'Bulbos y raíces para plantar',
      'Fertilizantes, enmiendas y bioestimulantes',
      'Plaguicidas y fungicidas de jardín',
      'Kits de huerta que vienen con sobrecitos de semillas',
    ],
    notIncluded: [
      'Té, especias y hierbas secas acondicionadas al detalle (hasta 500 g por envase)',
      'Frutas y verduras frescas y alimentos de origen animal (misma resolución, pero se tratan en alimentos)',
      'Macetas, herramientas de jardinería, riego, sustratos y tierra preparada: no están nombrados en la nómina del MGAP, aunque la nómina no es taxativa',
      'Máquinas agrícolas y sus accesorios, que tienen su propio régimen de exoneración (sólo si el Poder Ejecutivo la otorga)',
    ],
    regimes: {
      franquicia: {
        verdict: 'No entra por este régimen',
        detail:
          'La franquicia exonera aranceles, no permisos. La Resolución MGAP 1.720/021 prohíbe ingresar por encomienda o correo semillas, plantas, fertilizantes y plaguicidas, y el art. 7 del Decreto 50/026 deja fuera del régimen a la mercadería que requiere autorización y carece de ella. No hay franja de uso personal que dispense el control.',
        tone: 'bad',
      },
      prestacionUnica: {
        verdict: 'No entra por este régimen',
        detail:
          'El 60% sustituye toda tributación de la importación, no las autorizaciones de otros organismos. Sin el certificado oficial el envío queda afuera de los dos regímenes a la vez: no hay franquicia ni prestación única que valga, y se puede devolver a origen a costo del interesado dentro de los 30 días (Decreto 50/026 art. 7).',
        tone: 'bad',
      },
      general: {
        verdict: '22% de IVA; 0% si es fertilizante registrado',
        detail:
          'La prohibición de la Resolución MGAP 1.720/021 está escrita para el ingreso por encomienda o correo. Fuera de ese canal el despacho formal sigue existiendo: valor en aduana CIF, tasa consular del 5% (3% con ACE N.º 18) y despachante como regla (CAROU art. 14). Pero la norma no resuelve por qué vía una persona física trae este rubro: no se encontró en VUCE ningún trámite dirigido a persona física para plantas, semillas o fertilizantes.',
        tone: 'warn',
      },
    },
    taxes: [
      {
        concept: 'IVA — fertilizantes registrados ante el MGAP',
        value: '0% (exento)',
        detail:
          'Alcanza fertilizantes, enmiendas, fertilizantes orgánicos y órgano-minerales y bioestimulantes registrados ante el MGAP. La exoneración de la venta interna se extiende a la importación (art. 38 num. 3 lit. B). La condición es el registro, no el rubro comercial.',
        source: {
          label: 'Título 10 T.O. 2023, art. 38 (exoneraciones)',
          url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/38_T10',
        },
      },
      {
        concept: 'IVA — semillas para siembra y plantas vivas',
        value: '22%',
        detail:
          'No hay norma que las exonere ni que las ponga en la tasa mínima del art. 36, así que corre la tasa básica del art. 34. No existe un IVA agro reducido para el particular que compra semillas afuera.',
        source: {
          label: 'Título 10 T.O. 2023, art. 34 (tasas)',
          url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/34_T10',
        },
      },
      {
        concept: 'Arancel (TGA)',
        value: 'Según el NCM',
        detail:
          'Depende de la partida. No hay alícuota verificada para publicar acá partida por partida. Dentro de la franquicia los envíos van exentos de aranceles, pero esta mercadería no llega a usar ese canal.',
        source: {
          label: 'Decreto 50/026',
          url: 'https://www.impo.com.uy/bases/decretos/50-2026',
        },
      },
      {
        concept: 'Tasa consular',
        value: '5% (3% con Mercosur)',
        detail:
          'Se paga sobre el valor en aduana en el régimen general. Las exoneraciones son taxativas y una de ellas alcanza a los bienes de capital de uso agropecuario con arancel extrazona del 2% o 0%: un insumo como una bolsa de fertilizante o un sobre de semillas no es un bien de capital, así que no entra por ahí.',
        source: {
          label: 'Ley 19.535 art. 265',
          url: 'https://www.impo.com.uy/bases/leyes/19535-2017/265',
        },
      },
      {
        concept: 'Mínimo de US$ 20 de IVA (régimen postal)',
        value: 'No llega a aplicarse',
        detail:
          'Es un piso del canal postal: ningún envío paga menos de US$ 20 de IVA, salvo que esté integrado exclusivamente por bienes cuya importación está exonerada. Aviso: ni las FAQ del MEF ni las de la DNA mencionan este mínimo al explicar la franquicia, sólo lo citan para el 60%. Y como esta mercadería no viaja por ese canal, el piso no llega a discutirse.',
        source: {
          label: 'Ley 20.446 art. 660',
          url: 'https://www.impo.com.uy/bases/leyes/20446-2025/660',
        },
      },
    ],
    benefits: [
      {
        title: 'IVA 0% para fertilizantes registrados',
        detail:
          'Fertilizantes, enmiendas, fertilizantes orgánicos y órgano-minerales y bioestimulantes registrados ante el MGAP están exonerados de IVA. El beneficio cuelga del registro ante el MGAP: si el producto que comprás afuera no está registrado en Uruguay, no hay exoneración que invocar.',
        norm: 'Título 10 T.O. 2023, art. 38 num. 1 lit. G, y Decreto 220/998 art. 39 num. 1',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/38_T10',
      },
      {
        title: 'La exoneración de la venta interna se extiende a la importación',
        detail:
          'No hace falta una norma aparte para el producto importado: el propio art. 38 exonera las importaciones de bienes cuya enajenación está exonerada. Es lo que hace que el fertilizante registrado entre a 0% y no a 22%.',
        norm: 'Título 10 T.O. 2023, art. 38 num. 3 lit. B',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/38_T10',
      },
      {
        title: 'Tasa consular exonerada para bienes de capital agropecuarios',
        detail:
          'Entre las exoneraciones taxativas de la tasa consular están los bienes de capital de uso industrial, agropecuario o pesquero con arancel extrazona del 2% o 0%. Es un beneficio de maquinaria, no de insumos: una bolsa de fertilizante o un sobre de semillas no entra por ahí.',
        norm: 'Ley 19.535 art. 265',
        url: 'https://www.impo.com.uy/bases/leyes/19535-2017/265',
      },
      {
        title: 'Máquinas agrícolas: exoneración sólo si el Poder Ejecutivo la otorga',
        detail:
          'Las máquinas agrícolas y sus accesorios quedan exoneradas únicamente cuando el Poder Ejecutivo otorga la exoneración, con el alcance que fije la DGI. No es algo que puedas invocar por tu cuenta: si no hay acto que la conceda, no hay beneficio.',
        norm: 'Régimen de exoneraciones del IVA (Título 10 T.O. 2023); la exoneración depende de un acto del Poder Ejecutivo y del alcance que fije la DGI',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/38_T10',
      },
    ],
    procedures: [
      {
        organism: 'MGAP',
        when: 'Siempre que el envío contenga semillas, plantas, fertilizantes o plaguicidas: la Resolución MGAP 1.720/021 los prohíbe por encomienda o correo, sin excepción por cantidad ni por uso personal. La única franja cuantificada de esa resolución es otra: los productos vegetales acondicionados al detalle (té, especias, orégano) están prohibidos sólo en envases de más de 500 gramos. Y la nómina no es taxativa: cualquier otro producto puede quedar prohibido si le falta el certificado oficial.',
        how: 'La puerta es el certificado oficial que acredite la condición sanitaria del producto. No se encontró ningún trámite en VUCE dirigido a persona física para traer plantas, semillas o fertilizantes: los trámites publicados apuntan a empresas. Si vas a intentarlo, consultá al MGAP antes de comprar, no después de que la caja esté volando.',
        url: 'https://www.gub.uy/ministerio-ganaderia-agricultura-pesca/comunicacion/publicaciones/nomina-productos-autorizados-ingresar-pais',
      },
    ],
    declare: {
      intro:
        'Acá la declaración no es el problema principal: el problema es el permiso. Antes de elegir régimen tenés que saber si la mercadería puede entrar por el canal postal, porque para semillas, plantas, fertilizantes y plaguicidas la respuesta publicada es que no. Estos pasos sirven para separar lo que sí puede viajar de lo que no, y para saber qué hacer si el envío ya está en camino.',
      steps: [
        {
          name: 'Clasificá el contenido antes de pagar',
          text: 'Mirá qué es exactamente: semilla para siembra, planta viva, fertilizante o plaguicida están nombrados en la nómina de la Resolución MGAP 1.720/021 como prohibidos de ingresar por encomienda o correo. Un producto vegetal acondicionado al detalle, como té, especias u orégano, sólo está prohibido en envases de más de 500 gramos. La nómina no es taxativa: si tu producto no está nombrado, igual puede quedar frenado por falta de certificado.',
        },
        {
          name: 'Conseguí el certificado antes de comprar, no después',
          text: 'El art. 7 del Decreto 50/026 excluye del régimen a la mercadería que requiere autorización y carece de ella. La bisagra es esa: con el certificado la mercadería sigue dentro del régimen postal; sin él queda afuera de los dos regímenes. No se encontró trámite en VUCE para persona física en este rubro, así que consultá directamente al MGAP antes de apretar comprar.',
        },
        {
          name: 'Si el envío igual puede viajar, pedile al operador el tipo de envío correcto',
          text: 'La declaración aduanera lleva un campo Tipo de envío: G es franquicia y H es prestación única del 60% (RG DNA 11/2026 num. 28 lit. c). Las subcategorías J, para envíos exceptuados del pago de tributos, son cuatro y ninguna es agro: J/01 material de la Ley 15.913, J/02 medicamentos de uso personal, J/03 numismática y J/04 valija diplomática. No hay un código J para pedir la exoneración del fertilizante: si el envío entra, entra como G o como H.',
        },
        {
          name: 'Documentá el valor y el medio de pago',
          text: 'El envío tiene que ir con la documentación que acredite el valor: la factura original de compra con todos los conceptos adicionados. Y la franquicia exige que la titularidad de la tarjeta o del dinero electrónico coincida con la de la compra y con el destinatario. Si pagó un tercero perdés la franquicia y se liquida al 60%.',
        },
        {
          name: 'Si llega por Correo Uruguayo, declaralo vos primero',
          text: 'En el Correo el destinatario declara el envío en el formulario web con el tracking de 13 caracteres y los datos idénticos a la cédula. Ojo: el paso 3 de esa página del Correo, actualizado el 03/08/2026, todavía publica los topes derogados de US$ 50 y US$ 200 como condición de la franquicia. Los topes vigentes son US$ 800 de valor de factura por año civil y 20 kg por envío.',
        },
        {
          name: 'Si te lo retienen, andá preparado',
          text: 'El trámite de un envío retenido es presencial y con agenda previa, y los certificados de otros organismos se llevan en papel. El almacenamiento durante la demora lo pagás vos. Tenés 30 días desde el ingreso al país para pagar los tributos o el envío cae en abandono no infraccional, y 90 días sin retirarlo del depósito llevan al mismo final (Decreto 50/026 art. 14).',
        },
        {
          name: 'Si no hay permiso, decidí rápido la devolución',
          text: 'Cuando la mercadería requiere autorización y no la tiene, se puede devolver a origen a costo del interesado dentro de los 30 días. Ese costo lo pagás vos, y el almacenamiento corre mientras decidís. Si vas a devolver, hacelo apenas te avisan, no sobre la fecha.',
        },
      ],
      pitfalls: [
        'Creer que pagar el 60% destraba el control del MGAP. El 60% sustituye tributos, no autorizaciones: el envío queda igual afuera del régimen.',
        'Suponer que existe una franja de uso personal. Para semillas, plantas, fertilizantes y plaguicidas la Resolución MGAP 1.720/021 no fija cantidad mínima: prohíbe el ingreso por correo o encomienda sin más.',
        'Usar el umbral de 500 gramos como si cubriera semillas. Ese umbral es para productos vegetales acondicionados al detalle, como té u orégano. Las semillas de siembra están nombradas aparte, sin umbral de cantidad.',
        'Confundir exoneración de IVA con habilitación sanitaria. Un fertilizante registrado ante el MGAP paga 0% de IVA, y aun así está prohibido de ingresar por correo o encomienda. Son dos controles distintos.',
        'Declarar el contenido con otro nombre para que pase. Si la Aduana lo detecta, la mercadería sigue siendo la que requiere autorización y el art. 7 la deja fuera del régimen igual, con el almacenamiento a tu costo mientras se resuelve.',
        'Dejar correr los 30 días esperando que se destrabe solo. Vencidos, el envío cae en abandono no infraccional.',
      ],
    },
    considerations: [
      'El freno de esta categoría no es tributario, es sanitario. Podés tener el dinero, el cupo y la factura en regla y el envío no entra igual.',
      'La nómina del MGAP no es taxativa. Que tu producto no esté nombrado no significa que esté habilitado: cualquier otro producto puede quedar prohibido si le falta el certificado oficial.',
      'El 0% de IVA del fertilizante depende del registro ante el MGAP, no del rubro. Verificá que ese producto puntual esté registrado en Uruguay antes de contar con la exoneración.',
      'Las semillas y las plantas vivas pagan 22% por regla residual. No hay ningún beneficio de IVA agro para el particular que compra afuera.',
      'No se encontró trámite en VUCE dirigido a persona física para este rubro. Los caminos publicados apuntan a empresas, así que planificá con eso en la cabeza y no con la idea de que hay un formulario esperándote.',
      'Si comprás una caja con varias cosas y adentro va un sobrecito de semillas, la norma no resuelve qué pasa con el resto del envío. Nadie publicó el criterio.',
      'La página de la DNA sobre productos que requieren permisos es del 09/01/2026, anterior al Decreto 50/026. Si te la citan como fuente, chequeá contra el decreto y contra la resolución del MGAP.',
      'Fuera del canal postal el despacho formal es otra cosa: valor CIF con flete y seguro, tasa consular del 5% (3% con ACE N.º 18) y despachante como regla.',
    ],
    faqs: [
      {
        q: '¿Puedo traer unos sobrecitos de semillas para mi huerta?',
        a: 'Según la Resolución MGAP 1.720/021, no por correo ni por encomienda. La resolución prohíbe el ingreso de semillas por esa vía y no fija una cantidad mínima que quede libre. No existe la franja de uso personal que mucha gente da por hecha. Sin certificado oficial, el art. 7 del Decreto 50/026 deja el envío fuera del régimen entero: ni franquicia ni prestación única.',
      },
      {
        q: '¿Y si pago el 60% de prestación única? ¿No entra igual?',
        a: 'No. La prestación única sustituye toda la tributación relativa a la importación, sea arancelaria o interna, pero no sustituye autorizaciones de otros organismos. Es una opción tributaria, no un permiso. Si la mercadería requiere autorización y no la tenés, el envío queda afuera de los dos regímenes y sólo te queda devolverlo a origen a tu costo dentro de los 30 días.',
      },
      {
        q: '¿Cuánto IVA paga un fertilizante importado?',
        a: 'Cero, si es un fertilizante, enmienda, fertilizante orgánico u órgano-mineral o bioestimulante registrado ante el MGAP: están exonerados por el art. 38 num. 1 lit. G del Título 10, y esa exoneración se extiende a la importación por el num. 3 lit. B del mismo artículo. Pero la exoneración es tributaria y no cambia nada del lado sanitario: el fertilizante sigue estando prohibido de ingresar por correo o encomienda.',
      },
      {
        q: 'Compré semillas sin saber esto y el envío está en camino. ¿Qué hago?',
        a: 'Prepará la devolución. Sin autorización, la mercadería queda fuera del régimen y se puede devolver a origen a costo del interesado dentro de los 30 días. En paralelo corren los plazos del art. 14 del Decreto 50/026: 30 días desde el ingreso al país para pagar tributos antes del abandono no infraccional, y 90 días sin retirar del depósito. El almacenamiento durante toda la demora lo pagás vos, así que decidí rápido en vez de esperar a ver qué pasa.',
      },
      {
        q: '¿Puedo traer té, orégano o especias?',
        a: 'Ahí sí hay un umbral concreto. Los productos vegetales acondicionados al detalle están prohibidos sólo en envases de más de 500 gramos, o sea que por debajo de ese envase no caen en la prohibición. Es la única cantidad publicada de toda la nómina. Aplica al producto seco y envasado para venta, no a semillas de siembra ni a plantas vivas.',
      },
      {
        q: '¿Y una maceta, una pala o un sistema de riego por goteo?',
        a: 'La nómina de la Resolución MGAP 1.720/021 nombra semillas, plantas, frutas y verduras frescas, animales vivos, alimentos de origen animal, fertilizantes y plaguicidas. Una maceta vacía o una herramienta no están nombradas y, del lado tributario, pagan 22% de IVA como cualquier bien sin beneficio. Dicho eso, la nómina no es taxativa: cualquier producto puede quedar frenado si le falta un certificado oficial. La tierra o el sustrato tampoco están nombrados, y la norma no resuelve cómo se tratan.',
      },
    ],
    sources: [
      {
        label: 'Resolución MGAP 1.720/021 — nómina de productos autorizados a ingresar al país',
        url: 'https://www.gub.uy/ministerio-ganaderia-agricultura-pesca/comunicacion/publicaciones/nomina-productos-autorizados-ingresar-pais',
        note: 'Prohíbe ingresar por encomienda o correo semillas, plantas, frutas y verduras frescas, animales vivos, alimentos de origen animal, fertilizantes y plaguicidas. La nómina no es taxativa.',
      },
      {
        label: 'Decreto 50/026 — reglamento del régimen de envíos postales',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
        note: 'Art. 7: la mercadería que requiere autorización y carece de ella queda fuera del régimen. Art. 14: plazos de 30 y 90 días.',
      },
      {
        label: 'Ley 20.446 art. 633',
        url: 'https://www.impo.com.uy/bases/leyes/20446-2025/633',
        note: 'El régimen podrá no aplicarse a la mercadería restringida. El decreto endureció esa facultad y la volvió categórica.',
      },
      {
        label: 'Título 10 T.O. 2023, art. 38 — exoneraciones de IVA',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/38_T10',
        note: 'Num. 1 lit. G: fertilizantes. Num. 3 lit. B: la exoneración se extiende a la importación.',
      },
      {
        label: 'Título 10 T.O. 2023, art. 34 — tasas de IVA',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/34_T10',
        note: 'Tasa básica del 22%, la que corre para semillas y plantas vivas.',
      },
      {
        label: 'Decreto 220/998 — reglamento del IVA',
        url: 'https://www.impo.com.uy/bases/decretos/220-1998',
        note: 'Art. 39 num. 1: alcance de la exoneración de fertilizantes, enmiendas, orgánicos, órgano-minerales y bioestimulantes registrados ante el MGAP.',
      },
      {
        label: 'Ley 19.535 art. 265 — tasa consular',
        url: 'https://www.impo.com.uy/bases/leyes/19535-2017/265',
        note: '5% sobre el valor en aduana, 3% con ACE N.º 18. Exoneraciones taxativas, entre ellas bienes de capital de uso agropecuario con arancel extrazona 2% o 0%.',
      },
      {
        label: 'RG DNA 11/2026',
        url: 'https://www.aduanas.gub.uy/innovaportal/file/28447/1/rg-11_2026.pdf',
        note: 'Num. 28 lit. c: códigos de tipo de envío G, H y J. Ninguna subcategoría J corresponde a esta mercadería.',
      },
      {
        label: 'DNA — productos que requieren permisos o no pueden ingresar',
        url: 'https://www.aduanas.gub.uy/innovaportal/v/28229/1/innova.front/',
        note: 'Publicada el 09/01/2026, anterior al Decreto 50/026. La propia DNA aclara que el listado es orientativo y no taxativo.',
      },
    ],
    verifiedAt: '2026-08-15',
  },
  {
    slug: 'bebidas-alcoholicas-y-tabaco',
    productTypeId: 'alcohol_tabaco',
    title: 'Importar alcohol y tabaco a Uruguay: impuestos y por qué no entran',
    navLabel: 'Alcohol y tabaco',
    description:
      'Bebidas alcohólicas y tabaco quedan fuera del régimen postal en todos los casos: el art. 633 de la Ley 20.446 excluye toda mercadería gravada por IMESI.',
    icon: 'mdi-glass-wine',
    examples: [
      'Una botella de whisky o de vino comprada en una tienda del exterior',
      'Cigarros o puros',
      'Tabaco para armar o para pipa',
      'Cerveza artesanal importada',
      'Licores, bitters, vermut y aperitivos',
      'Un cartón de cigarrillos que te manda un familiar',
      'Un pack de degustación de destilados',
    ],
    notIncluded: [
      'Vaporizadores, cigarrillos electrónicos y pods: no es que pagan más, la importación está prohibida (Decreto 534/009 art. 1, redacción del Decreto 125/025), y el art. 2 extiende la prohibición a cualquier accesorio o repuesto',
      'Productos de tabaco calentado: la misma prohibición los incluye expresamente',
      'Yerba, café y té: van por la ficha de alimentos, a tasa mínima de 10% (y el té en envases de más de 500 gramos tiene además el freno sanitario del MGAP)',
      'Copas, decantadores y accesorios de bar sin bebida ni tabaco adentro: no están gravados por IMESI, así que no arrastran esta exclusión',
    ],
    regimes: {
      franquicia: {
        verdict: 'No entra por este régimen',
        detail:
          'La Ley 20.446 art. 633 dice que el régimen de envíos postales no se aplicará en ningún caso a la mercadería gravada por IMESI, y las bebidas alcohólicas y el tabaco lo están (Título 11 art. 1). El Decreto 50/026 art. 7 lo reglamenta. No hay franquicia de US$ 800 que discutir: el régimen entero queda afuera.',
        tone: 'bad',
      },
      prestacionUnica: {
        verdict: 'No hay 60% que pagar',
        detail:
          'El 60% con mínimo de US$ 20 es una opción dentro del mismo régimen postal. Si el régimen no se aplica, no existe la opción. No es que salga caro: no es un camino disponible para esta mercadería.',
        tone: 'bad',
      },
      general: {
        verdict: 'IVA 22% + IMESI ficto + tasa consular',
        detail:
          'El único camino es el despacho formal de importación, donde la intervención del despachante es la regla (CAROU art. 14; la excepción de envíos postales no comerciales del art. 15 no te sirve porque el régimen postal no aplica). El valor en aduana es CIF: incluye flete, seguro y gastos de carga y descarga (Decreto 538/008 art. 5).',
        tone: 'warn',
      },
    },
    taxes: [
      {
        concept: 'IVA',
        value: '22%',
        detail:
          'Tasa básica por regla residual: no figuran en la tasa mínima del art. 36 ni en las exoneraciones del art. 38. En el régimen general la base es el valor normal de aduana más el arancel, y si importa un particular no contribuyente esa suma se incrementa un 50% (art. 13 lit. B). El IMESI y la tasa consular no integran esa base.',
        source: {
          label: 'Título 10 T.O. 2023 art. 34',
          url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/34_T10',
        },
      },
      {
        concept: 'IMESI — bebidas alcohólicas',
        value: 'Hasta 85% (tasa máxima)',
        detail:
          'El Título 11 art. 1 fija el tope del hecho gravado, no lo que vas a pagar. Y el IMESI de este rubro no se calcula sobre tu factura: se aplica sobre precios fictos que fija la administración (Decreto 96/990 arts. 20 y 28). Desde el valor de compra no es estimable.',
        source: {
          label: 'Título 11 T.O. 2023 (IMESI)',
          url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/1_T11',
        },
      },
      {
        concept: 'IMESI — tabacos, cigarros y cigarrillos',
        value: 'Hasta 70% (tasa máxima)',
        detail:
          'Mismo mecanismo: tope del Título 11 art. 1 y liquidación sobre precios fictos del Decreto 96/990. No hay forma de anticipar el monto multiplicando el precio que pagaste.',
        source: {
          label: 'Decreto 96/990 (reglamento del IMESI)',
          url: 'https://www.impo.com.uy/bases/decretos/96-1990',
        },
      },
      {
        concept: 'Tasa consular',
        value: '5% (3% con ACE N.º 18)',
        detail:
          'Sobre el valor en aduana. Baja a 3% si la mercadería viene amparada en el ACE N.º 18 del Mercosur. Las exoneraciones de la tasa son taxativas (admisión temporaria, petróleo crudo y ciertos combustibles, y bienes de capital de uso industrial, agropecuario o pesquero) y ninguna alcanza a bebidas ni tabaco. El Poder Ejecutivo está facultado a bajarla y no lo hizo.',
        source: {
          label: 'Ley 19.535 art. 265',
          url: 'https://www.impo.com.uy/bases/leyes/19535-2017/265',
        },
      },
      {
        concept: 'Arancel (TGA)',
        value: 'Depende del NCM',
        detail:
          'La alícuota sale del listado vigente que publica el MEF según la partida arancelaria. No hay una cifra publicable para el rubro: pedísela al despachante antes de comprar. Los regímenes de arancel 0% que existen son para bienes de informática y telecomunicaciones y bienes de capital, no para esta mercadería.',
      },
      {
        concept: 'Prestación única del 60%',
        value: 'No aplica',
        detail:
          'Vive dentro del régimen de envíos postales del Decreto 50/026, del que esta mercadería está excluida por el art. 633 de la Ley 20.446.',
        source: {
          label: 'Ley 20.446 art. 633',
          url: 'https://www.impo.com.uy/bases/leyes/20446-2025/633',
        },
      },
    ],
    benefits: [],
    declare: {
      intro:
        'No hay manera de declarar una botella o un cartón de cigarrillos para que entren por el correo o el courier. La exclusión es de la ley, no del operador postal, y no depende del monto ni de que sea para uso personal. Lo que sigue es cómo evitar que el paquete quede en tierra de nadie y qué te espera si igual querés traerlo.',
      steps: [
        {
          name: 'Chequeá primero si directamente está prohibido',
          text: 'Vaporizadores, cigarrillos electrónicos, tabaco calentado y sus accesorios o repuestos tienen la importación prohibida por el Decreto 534/009 arts. 1 y 2, en la redacción del Decreto 125/025. Ahí no hay trámite, permiso ni tributo que valga: no entran por ninguna vía.',
        },
        {
          name: 'Descartá el canal postal antes de pagar',
          text: 'La declaración aduanera del régimen postal lleva un campo Tipo de envío con los códigos de la RG DNA 11/2026 num. 28 lit. c: G es franquicia, H es la prestación única del 60%, y J son los envíos exceptuados de tributos, con sus cuatro subcategorías (J/01 material de la Ley 15.913, J/02 medicamentos de uso personal, J/03 numismática, J/04 valija diplomática). Ninguno ampara bebidas alcohólicas ni tabaco. Si el vendedor te ofrece declararlo como otra cosa, te está proponiendo una declaración falsa del contenido: no es un atajo, es lo que después deja el paquete retenido.',
        },
        {
          name: 'Si igual lo querés traer, es despacho formal',
          text: 'Fuera del régimen postal se importa por despacho aduanero, donde la intervención del despachante es la regla (CAROU art. 14). Contactá un despachante antes de comprar, no después.',
        },
        {
          name: 'Pedile al despachante el número con el precio ficto, no con tu factura',
          text: 'El IMESI de bebidas alcohólicas y tabaco se liquida sobre precios fictos fijados por la administración (Decreto 96/990 arts. 20 y 28). Pedile el cálculo con el ficto vigente del producto, más IVA 22% sobre valor en aduana más arancel incrementado un 50% por ser vos un particular, más 5% de tasa consular sobre el valor en aduana, más su honorario. Recién ahí sabés si conviene.',
        },
        {
          name: 'Si el paquete ya salió y quedó retenido, agendá',
          text: 'El trámite de envío retenido de la DNA es presencial y con agenda previa, la documentación de otros organismos se lleva en papel, y el almacenamiento durante toda la demora lo paga el destinatario. Cuanto más tardes en resolver, más pagás de depósito.',
        },
        {
          name: 'Mirá el reloj: la devolución a origen tiene 30 días',
          text: 'Para los envíos que el art. 7 del Decreto 50/026 deja fuera del régimen, la norma prevé la devolución a origen a costo del interesado dentro de los 30 días: si no vas a nacionalizarlo, esa es la salida y tiene fecha. Los plazos de 30 días desde el ingreso para pagar los tributos y de 90 días de depósito sin retirar, con abandono no infraccional al vencer, son los del régimen postal (Decreto 50/026 art. 14); la norma no resuelve cómo se cuentan para una mercadería que quedó fuera de ese régimen.',
        },
        {
          name: 'Consultá antes de improvisar',
          text: 'DNA: info@aduanas.gub.uy o 2 915 00 07, de lunes a viernes de 9 a 17. Correo Uruguayo: 0800 2108. Dejá la consulta por escrito, con el tracking, antes de que corran los plazos.',
        },
      ],
      pitfalls: [
        'Declararlo como otra cosa para que pase. Si además implica declarar un valor menor al real, la Ley 20.446 art. 632 castiga la subvaluación con una multa igual al doble de los tributos que debieron pagarse, y la reincidencia dentro de 12 meses prohíbe operar en el régimen por 12 meses.',
        'Pedir el código G creyendo que con la franquicia se salva. La franquicia es un beneficio dentro de un régimen que a esta mercadería no se le aplica en ningún caso.',
        'Pedir el código H pensando que pagando el 60% se destraba. El 60% es una opción dentro del mismo régimen excluido: no está disponible acá.',
        'Meter una botella dentro de una caja con el resto de la compra. La norma no resuelve qué pasa con el resto del envío, pero sí dice que la mercadería gravada por IMESI no entra en ningún caso, y quien queda con el paquete retenido sos vos.',
        'Guiarte por páginas oficiales viejas. La página aduanas.gub.uy/innovaportal/v/27950 sigue describiendo el derogado Decreto 356/014, con topes de US$ 50 y US$ 200 y mínimo de US$ 10, y el paso 3 de la página de Correo Uruguayo todavía publica como vigentes los topes derogados de US$ 50 y US$ 200.',
        'Dejar el paquete a la deriva esperando que se resuelva solo: el almacenaje corre a tu cargo todos los días de la demora y la ventana para devolverlo a origen es de 30 días.',
      ],
    },
    considerations: [
      'El costo total no es estimable antes de comprar. El IMESI de este rubro sale de precios fictos, no de tu factura: sin el ficto vigente en la mano, cualquier número que te den es un invento.',
      'El despacho formal suma dos costos que la cuenta casera olvida: el honorario del despachante y el 5% de tasa consular sobre el valor en aduana (3% si viene amparada en el ACE N.º 18 del Mercosur).',
      'El valor en aduana es CIF: el flete y el seguro entran a la base, y una botella pesada con envío caro infla todo lo que se calcula sobre ese valor.',
      'El IVA del particular es definitivo. El anticipo del Decreto 220/998 art. 115 es sólo para contribuyentes, y un particular no deduce ni recupera nada.',
      'Que venga de regalo no cambia el régimen. La exoneración de obsequios familiares es un beneficio dentro del régimen postal (Decreto 50/026 art. 3), y el art. 633 excluye esta mercadería de ese régimen en todos los casos. La norma no resuelve expresamente el caso del obsequio de una botella, pero no hay de dónde colgar la exoneración.',
      'Hay una asimetría en la ley que conviene entender: el art. 633 dice que el régimen no se aplicará en ningún caso a la mercadería gravada por IMESI, mientras que para la mercadería restringida dice que podrá no aplicarse. Lo tuyo cae del lado categórico.',
      'Si lo que querías era un vaporizador o tabaco calentado, no hay plan B legal: la prohibición del Decreto 534/009, con la redacción del Decreto 125/025, alcanza comercialización, importación, registro marcario, publicidad y hasta los accesorios y repuestos.',
    ],
    faqs: [
      {
        q: '¿Puedo traer una botella de whisky por Correo o por courier?',
        a: 'No. La Ley 20.446 art. 633 establece que el régimen de envíos postales internacionales no se aplica en ningún caso a la mercadería gravada por IMESI, y las bebidas alcohólicas lo están. El Decreto 50/026 art. 7 reglamenta esa exclusión. No importa que sea una sola botella, que sea para uso personal ni que cueste US$ 30: no es un problema de monto, es que el régimen no se aplica. Si querés traerla igual, el único camino es el despacho formal de importación.',
      },
      {
        q: '¿Cuánto termino pagando si lo traigo por despacho formal?',
        a: 'No se puede estimar desde el precio que pagaste. El IVA es 22% sobre valor en aduana más arancel, y esa suma se incrementa un 50% porque sos un particular no contribuyente (Título 10 art. 13 lit. B). A eso se suma la tasa consular del 5% sobre el valor en aduana y el arancel según el NCM, que no se puede anticipar sin la partida. Pero el IMESI, que es el grueso, se liquida sobre precios fictos que fija la administración (Decreto 96/990 arts. 20 y 28), no sobre tu factura. Las tasas máximas del Título 11 art. 1 son 85% para bebidas alcohólicas y 70% para tabacos, cigarros y cigarrillos, y son topes del hecho gravado, no lo que vas a pagar. Pedile el número al despachante antes de comprar.',
      },
      {
        q: '¿Y si me la manda un familiar como regalo?',
        a: 'Sigue sin entrar. La exoneración de obsequios familiares del Decreto 50/026 art. 3 es un beneficio que existe dentro del régimen de envíos postales, y ese régimen no se le aplica a la mercadería gravada por IMESI. Ninguna norma resuelve expresamente el caso del regalo de una botella, pero la exclusión del art. 633 es absoluta, así que no hay exoneración a la que agarrarse. Avisale a quien te la quiere mandar antes de que la despache.',
      },
      {
        q: '¿Puedo comprar un vaporizador o pods si los pago yo y son para mí?',
        a: 'No. Los vaporizadores y cigarrillos electrónicos tienen la importación prohibida por el Decreto 534/009 art. 1, en la redacción del Decreto 125/025 del 10 de junio de 2025, y la prohibición incluye expresamente los productos de tabaco calentado. El art. 2 la extiende a cualquier accesorio o repuesto. No hay trámite, permiso ni tributo que lo habilite, y no se encontró ningún litigio que suspenda su vigencia.',
      },
      {
        q: 'El paquete ya salió y quedó retenido en Aduana. ¿Qué hago?',
        a: 'El trámite de envío retenido de la DNA es presencial y con agenda previa, la documentación de otros organismos se lleva en papel y el almacenamiento durante toda la demora lo paga el destinatario. Para los envíos que el art. 7 del Decreto 50/026 deja fuera del régimen, la norma prevé la devolución a origen a costo del interesado dentro de los 30 días. Los plazos de 30 días para pagar tributos y de 90 días de depósito sin retirar, con abandono no infraccional al vencer, son los del régimen postal (art. 14) y la norma no resuelve cómo se cuentan para una mercadería excluida. Decidí rápido: cada día que pasa suma almacenaje.',
      },
      {
        q: '¿La yerba, el café o el té entran en esta categoría?',
        a: 'No. Yerba, café y té están en la tasa mínima del 10% del IVA (Título 10 art. 36 lit. A y Decreto 220/998 art. 101 lit. a) y no arrastran la exclusión del art. 633. El freno que tienen es otro: la Resolución MGAP 1.720/021 prohíbe ingresar por encomienda o correo los productos vegetales acondicionados al detalle en envases de más de 500 gramos, y esa nómina no es taxativa. Miralo en la ficha de alimentos.',
      },
    ],
    sources: [
      {
        label: 'Ley 20.446 art. 633 — exclusión absoluta de la mercadería gravada por IMESI',
        url: 'https://www.impo.com.uy/bases/leyes/20446-2025/633',
        note: 'La norma que cierra el canal postal para alcohol y tabaco',
      },
      {
        label: 'Decreto 50/026 — régimen de envíos postales internacionales',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
        note: 'Art. 7 (mercadería excluida y devolución a origen) y art. 14 (plazos de 30 y 90 días)',
      },
      {
        label: 'Título 11 T.O. 2023 — IMESI',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/1_T11',
        note: 'Art. 1: tasas máximas de 85% para bebidas alcohólicas y 70% para tabacos, cigarros y cigarrillos',
      },
      {
        label: 'Decreto 96/990 — reglamento del IMESI',
        url: 'https://www.impo.com.uy/bases/decretos/96-1990',
        note: 'Arts. 20 y 28: liquidación sobre precios fictos, no sobre la factura',
      },
      {
        label: 'Título 10 T.O. 2023 art. 34 — tasas del IVA',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/34_T10',
      },
      {
        label: 'Título 10 T.O. 2023 art. 13 — base del IVA en la importación',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/13_T10',
        note: 'Lit. B: valor en aduana más arancel, incrementado un 50% si importa un no contribuyente',
      },
      {
        label: 'Ley 19.535 art. 265 — tasa consular',
        url: 'https://www.impo.com.uy/bases/leyes/19535-2017/265',
      },
      {
        label: 'Decreto 125/025 — prohibición de vaporizadores y tabaco calentado',
        url: 'https://www.impo.com.uy/bases/decretos/125-2025',
        note: 'Da nueva redacción al art. 1 del Decreto 534/009: https://www.impo.com.uy/bases/decretos/534-2009',
      },
      {
        label: 'RG DNA 11/2026',
        url: 'https://www.aduanas.gub.uy/innovaportal/file/28447/1/rg-11_2026.pdf',
        note: 'Num. 28 lit. c: códigos de Tipo de envío G, H y J/01 a J/04. Ninguno ampara alcohol ni tabaco',
      },
    ],
    verifiedAt: '2026-08-15',
  },
  {
    slug: 'vehiculos-y-repuestos',
    productTypeId: 'vehiculos',
    title: 'Importar repuestos y vehículos a Uruguay: impuestos y cómo declararlo',
    navLabel: 'Vehículos y repuestos',
    description:
      'El vehículo y la moto no entran por correo: los excluye el IMESI. El repuesto sí, con IVA 22% y piso de US$ 20; la bicicleta a pedal no paga IMESI.',
    icon: 'mdi-car',
    examples: [
      'Pastillas, discos y cilindros de freno',
      'Filtros de aceite, aire y combustible',
      'Sensores y módulos electrónicos (ECU, sonda lambda)',
      'Espejos, manijas, molduras y ópticas',
      'Kit de embrague y correa de distribución',
      'Casco, guantes y accesorios de moto',
      'Estéreo, parlantes y cámara de retroceso',
      'Bicicleta a pedal y sus repuestos',
    ],
    notIncluded: [
      'El auto, la moto, la motoneta o la bicimoto en sí: no entran por el canal postal',
      'Aceite de motor y lubricantes: quedan en duda, porque el reglamento del IMESI los nombra junto a los vehículos y la norma no resuelve si pueden viajar por correo',
      'Sillas de auto para niños (necesitan licencia del MIEM-DNI)',
      'Rastreadores GPS y alarmas con módem celular sin certificado URSEC previo',
    ],
    regimes: {
      franquicia: {
        verdict: 'Sí el repuesto, no el vehículo',
        detail:
          'La autoparte no tiene tratamiento especial: paga IVA por la regla residual y, dentro de la franquicia, queda exenta de aranceles. El Anexo del Decreto 50/026 (art. 9 lit. g) prevé un rubro "Autopartes y accesorios de vehículos", pero es un rubro estadístico y declarativo: sirve para declarar el envío, no es la fuente del derecho. El vehículo automotor y la moto quedan afuera: la Ley 20.446 art. 633 dice que el régimen no se aplica "en ningún caso" a mercadería gravada por IMESI.',
        tone: 'warn',
      },
      prestacionUnica: {
        verdict: '60% del valor, mínimo US$ 20',
        detail:
          'Opción válida sólo para repuestos, accesorios y bicicletas a pedal: la ley dice que el titular "podrá optar" por pagar el 60% en sustitución de toda tributación de la importación, arancelaria o interna. Para el vehículo o la moto no existe esta puerta, porque están excluidos del régimen entero, no del cupo.',
        tone: 'warn',
      },
      general: {
        verdict: 'Único camino para el vehículo',
        detail:
          'El auto y la moto se despachan por régimen general, con DUA y con despachante: su intervención es la regla (CAROU art. 14) y las excepciones del art. 15 son taxativas, entre ellas los envíos postales no comerciales, que acá no aplican. Ahí paga IVA 22%, IMESI, tasa consular y el arancel que corresponda al NCM, sobre valor en aduana CIF.',
        tone: 'warn',
      },
    },
    taxes: [
      {
        concept: 'IVA',
        value: '22%',
        detail:
          'Ni los vehículos ni las autopartes figuran en la tasa mínima (art. 36) ni en las exoneraciones (art. 38), así que corren por la tasa básica del art. 34. En el canal postal el IVA se calcula sobre el valor de factura o la declaración de valor, y no puede ser menor al equivalente a US$ 20 por envío (Ley 20.446 art. 660, repetido en la RG DNA 11/2026 num. 27). Ese piso muerde en todo repuesto de menos de US$ 90,91.',
        source: {
          label: 'Título 10 T.O. 2023, art. 34',
          url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/34_T10',
        },
      },
      {
        concept: 'IMESI (vehículo o moto)',
        value: 'Sí, y lo saca del correo',
        detail:
          'El hecho gravado del Título 11 art. 1 num. 11 alcanza a "vehículos automotores, motos, motonetas, bicimotos y toda otra clase de automotores". Para un particular no contribuyente la base es el valor en aduana más el arancel, incrementado un 50% (Decreto 96/990 art. 11 num. I). No publicamos una tasa porque no verificamos la alícuota vigente por tipo de vehículo: pedila al despachante antes de comprar.',
        source: {
          label: 'Título 11 T.O. 2023, art. 1',
          url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/1_T11',
        },
      },
      {
        concept: 'IMESI (repuesto o bicicleta a pedal)',
        value: 'No aplica',
        detail:
          'El hecho gravado nombra vehículos automotores, motos, motonetas, bicimotos y "toda otra clase de automotores", no sus partes. Una bicicleta sin motor tampoco entra: es a pedal, no es un automotor. Por eso ambos siguen dentro del régimen postal. Caso aparte son los lubricantes: el reglamento del IMESI los nombra junto a los vehículos automotores al fijar la base del no contribuyente, pero no verificamos ni la alícuota ni si eso los deja fuera del canal postal. La norma no lo resuelve: tratalo como riesgo.',
        source: {
          label: 'Decreto 96/990 (reglamento del IMESI)',
          url: 'https://www.impo.com.uy/bases/decretos/96-1990',
        },
      },
      {
        concept: 'Arancel',
        value: '0% con franquicia',
        detail:
          'La franquicia anual de US$ 800 es expresamente exenta de aranceles (Ley 20.446 art. 627). Fuera de ella, el arancel depende del NCM del repuesto y no verificamos ninguna alícuota partida por partida: no hay un número único de autopartes que podamos publicar.',
        source: {
          label: 'Ley 20.446, art. 627',
          url: 'https://www.impo.com.uy/bases/leyes/20446-2025/627',
        },
      },
      {
        concept: 'Tasa consular',
        value: '5% (3% Mercosur)',
        detail:
          'Corre en el despacho general, que es por donde entra el vehículo: 5% sobre el valor en aduana, 3% si la mercadería viene amparada en el ACE N.º 18 del Mercosur. Las exoneraciones son taxativas —admisión temporaria, petróleo crudo y ciertos combustibles, y bienes de capital de uso industrial, agropecuario o pesquero— y ninguna cubre un auto de uso particular. No integra la base del IVA.',
        source: {
          label: 'Ley 19.535, art. 265',
          url: 'https://www.impo.com.uy/bases/leyes/19535-2017/265',
        },
      },
      {
        concept: 'Prestación única',
        value: '60% del valor',
        detail:
          'Sustituye toda la tributación de la importación definitiva, con un mínimo de US$ 20 por envío. Es opcional y sirve cuando ya gastaste el cupo o querés reservarlo: para un repuesto de US$ 100 son US$ 60 contra los US$ 22 de IVA de la franquicia, así que casi siempre conviene la franquicia mientras te quede cupo.',
        source: {
          label: 'Decreto 50/026',
          url: 'https://www.impo.com.uy/bases/decretos/50-2026',
        },
      },
    ],
    benefits: [
      {
        title: 'La bicicleta a pedal no paga IMESI',
        detail:
          'El hecho gravado alcanza a vehículos automotores, motos, motonetas, bicimotos y "toda otra clase de automotores". Una bicicleta sin motor no entra ahí. Consecuencia práctica: paga sólo IVA 22% y, a diferencia del auto y de la moto, sigue dentro del régimen postal, con franquicia o con el 60%.',
        norm: 'Título 11 T.O. 2023, art. 1 num. 11',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/1_T11',
      },
      {
        title: 'Repuesto de origen EE.UU. hasta US$ 200: exonerado',
        detail:
          'Dentro de la franquicia, los envíos de hasta US$ 200 originados en un país con acuerdo comercial (EE.UU./TIFA) están exonerados. La residencia fiscal del vendedor se acredita con la factura. Desde el 1/10/2026 el emisor de la factura tiene que estar registrado ante la DNA; si no lo está, no se aplica la exoneración.',
        norm: 'Decreto 50/026, art. 3',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
      },
    ],
    procedures: [
      {
        organism: 'URSEC',
        when: 'Hace falta para el accesorio que transmite en espectro licenciado: rastreador GPS del auto, alarma con módem celular, handy, cámara con conexión celular. NO hace falta si el accesorio opera únicamente con Wi-Fi (Wifi4, Wifi5, Wifi6) o Bluetooth: el estéreo con Bluetooth, los parlantes, el manos libres y la cámara de retroceso que se conecta por Wi-Fi quedan fuera de la intervención de URSEC (Resoluciones URSEC 275/021 y 297/021).',
        how: 'El trámite lo inicia la propia persona física en VUCE: "Certificado para habilitar el ingreso al país de equipos radioeléctricos bajo el régimen de franquicia (Persona Física)". Costo publicado $239, o $852 si el equipo además requiere homologación. URSEC tiene un plazo máximo de 2 días hábiles, y la homologación —cuando corresponde— puede demorar hasta 120 días. Aprobado, el certificado se envía automáticamente al sistema de la Aduana. No está publicado cuánto tiempo vale el certificado ni si sirve para más de un envío.',
        url: 'https://www.gub.uy/tramites/certificado-para-habilitar-ingreso-al-pais-equipos-radioelectricos-bajo-regimen-franquicia-persona-fisica',
      },
    ],
    declare: {
      intro:
        'Acá se declara el repuesto, no el vehículo. El operador postal o courier es el que declara ante la Aduana, y en esa declaración va un campo "Tipo de envío" que define qué te van a cobrar. Para autopartes hay dos códigos posibles y ninguno es automático a tu favor: revisalo antes de que el envío salga.',
      steps: [
        {
          name: 'Chequeá que la pieza pueda entrar por correo',
          text: 'Queda afuera el vehículo entero y todo lo gravado por IMESI. Con los lubricantes andá con cuidado: el reglamento del IMESI los nombra junto a los vehículos automotores y la norma no resuelve si pueden viajar por el canal postal. La silla de auto para niños necesita licencia de importación del MIEM-DNI (Decreto 81/014 Anexo I; Ley 19.061), que exige estar registrado como cliente de la Dirección Nacional de Industrias y certificar el producto. Y la caja no puede pasar los 20 kg ni los US$ 800 de factura.',
        },
        {
          name: 'Si el accesorio transmite, sacá el certificado URSEC antes de comprar',
          text: 'GPS, alarma con módem celular o cámara con conexión celular: el trámite se inicia en VUCE y URSEC tiene 2 días hábiles. Sin el certificado, el Decreto 50/026 art. 7 deja el envío fuera del régimen entero, ni franquicia ni 60%, y podés terminar devolviéndolo a origen a tu costo dentro de los 30 días.',
        },
        {
          name: 'Pagá con tu propia tarjeta',
          text: 'La compra tiene que pagarse con tarjeta de crédito o débito internacional, o dinero electrónico internacional emitido por una institución regulada por el BCU, y la titularidad tiene que coincidir con la del comprador y la del destinatario (Decreto 50/026 art. 4 lit. d y e). Si el repuesto lo pagó tu hermano o el mecánico, perdés la franquicia y te liquidan al 60%.',
        },
        {
          name: 'Guardá la factura completa',
          text: 'El valor es el total de la factura original de compra, con todos los conceptos que figuren adicionados en ella (art. 5). Si el vendedor te facturó el flete y el manejo, eso entra al valor: no lo descuentes por tu cuenta. Sin factura va declaración de valor, y el envío tiene que ir acompañado de la documentación que acredite ese valor.',
        },
        {
          name: 'Pedile al operador el tipo de envío correcto: G o H',
          text: 'La RG DNA 11/2026 num. 28 lit. c define los códigos: "G" para franquicia y "H" para prestación única (60%). Los códigos "J" son para envíos exceptuados de tributos —J/01 material de la Ley 15.913, J/02 medicamentos de uso personal, J/03 numismática, J/04 valija diplomática— y ninguno corresponde a autopartes: no pidas J. Decile además que el rubro del Anexo es "Autopartes y accesorios de vehículos".',
        },
        {
          name: 'Si viene por Correo Uruguayo, declaralo vos primero',
          text: 'El destinatario declara en el formulario web del Correo antes de que el envío se procese: tracking de 13 caracteres y datos idénticos a los de la cédula. Ojo con esa página: al 03/08/2026 el paso 3 todavía publica los topes derogados de US$ 50 y US$ 200 del Decreto 356/014 como condición de la franquicia. No son los vigentes.',
        },
        {
          name: 'Pagá dentro de los 30 días del ingreso',
          text: 'Ese es el plazo del Decreto 50/026 art. 14 para pagar los tributos; vencido, el envío cae en abandono no infraccional, igual que si lo dejás 90 días sin retirar del depósito. El "tenés 10 días" que ves en la notificación del Correo no es un plazo legal: es la ventana tarifaria del cargo de gestión.',
        },
      ],
      pitfalls: [
        'Meter aceite, lubricante o un kit de service que los incluya sin averiguar antes: el reglamento del IMESI nombra a los lubricantes junto a los vehículos automotores y la norma no resuelve si el envío sigue dentro del régimen postal.',
        'Que el repuesto lo pague la tarjeta de otro (el taller, un familiar en el exterior). La titularidad tiene que coincidir; si no, se liquida al 60%.',
        'Declarar el repuesto por menos de lo que salió: la Ley 20.446 art. 632 manda multa igual al doble de los tributos que debían pagarse, perdés la franquicia de esa operación y la reincidencia dentro de 12 meses te prohíbe operar en el régimen por un año.',
        'Comprar el GPS o la alarma celular y recién después averiguar lo de URSEC: el certificado es previo, y sin él la Aduana puede retener y tenés que ir personalmente.',
        'Dejar que el operador declare "G" por defecto cuando ya no te queda cupo, o "H" cuando sí te queda: el régimen es un campo de la declaración y no hay norma ni FAQ que diga si se puede cambiar una vez presentada.',
        'Pedir que el envío se marque como exceptuado de tributos: los códigos J son para libros, medicamentos, numismática y valija diplomática, no para autopartes.',
      ],
    },
    considerations: [
      'El freno real de los repuestos no es la plata, son los 20 kg por envío. Discos de freno, escapes, paragolpes y baterías de arranque se van de peso antes de acercarse a los US$ 800.',
      'El Correo Uruguayo, por política propia, no admite baterías de litio en envíos internacionales. No es una prohibición aduanera uruguaya: es restricción de transporte aéreo IATA/OACI y cada aerolínea u operador decide. No hay ninguna cifra oficial uruguaya de Wh, así que no te guíes por números que circulan.',
      'El piso de US$ 20 de IVA cambia la cuenta en las piezas chicas: un sensor de US$ 35 paga US$ 20 igual, no US$ 7,70. Recién arriba de US$ 90,91 el 22% supera al piso. Conviene juntar varias piezas en un mismo envío antes que hacer tres compras sueltas.',
      'Aviso de honestidad sobre ese piso: ni las preguntas frecuentes del MEF ni las de la DNA lo mencionan al explicar la franquicia (sólo lo citan para el 60%), y no existe ningún ejemplo numérico oficial de una compra con franquicia pagando IVA. Está en la ley y en la RG 11/2026, pero puede que en mostrador te digan otra cosa.',
      'El repuesto consume cupo: los 3 envíos y los US$ 800 anuales. La excepción de la RG 11/2026 num. 26 es sólo para libros y medicamentos de uso personal, no para autopartes. Y el cupo se imputa por fecha de desaduanamiento, no de compra.',
      'Si el repuesto es carísimo o pesado, la comparación no es franquicia contra 60%: es correo contra despacho general con despachante, donde además del arancel te entra la tasa consular del 5% (3% con ACE N.º 18) y el IVA se calcula sobre valor en aduana más arancel, incrementado un 50% por ser particular.',
      'La silla de auto es el caso que más sorprende: parece un accesorio cualquiera y tiene licencia de importación del MIEM-DNI de por medio. Averiguá el trámite antes de pagar, no cuando el envío ya esté retenido.',
    ],
    faqs: [
      {
        q: '¿Puedo importar una moto o un auto por correo?',
        a: 'No. La Ley 20.446 art. 633 dice que el régimen de envíos postales no se aplica "en ningún caso" a mercadería gravada por IMESI, y el vehículo automotor lo está. El Decreto 50/026 art. 7 lo reglamenta igual de categórico. No es que pagues más: no entra por ese canal. El único camino es el despacho general, con DUA y despachante, pagando IVA 22%, IMESI, tasa consular y arancel.',
      },
      {
        q: '¿Y una bicicleta común?',
        a: 'Esa sí. El hecho gravado del IMESI alcanza a vehículos automotores, motos, motonetas, bicimotos y "toda otra clase de automotores", y una bicicleta a pedal no entra en esa lista. Paga IVA 22% y nada más, y como no está gravada por IMESI se queda dentro del régimen postal: podés usar franquicia o pagar el 60%. Los límites que la frenan son los de siempre: 20 kg y US$ 800 por envío.',
      },
      {
        q: '¿Una bicicleta eléctrica o un monopatín también quedan libres de IMESI?',
        a: 'Eso no lo podemos afirmar. Lo que verificamos es que la bicicleta sin motor queda afuera del hecho gravado. Para la eléctrica, el mismo texto habla de "bicimotos" y de "toda otra clase de automotores", y no encontramos norma, resolución ni consulta que resuelva si el pedaleo asistido cae ahí. La diferencia no es menor: si está gravada por IMESI, no entra por correo. Preguntale antes a la DNA (info@aduanas.gub.uy, 2 915 00 07, de lunes a viernes de 9 a 17).',
      },
      {
        q: '¿Los repuestos entran en la franquicia de US$ 800?',
        a: 'Sí, por la regla general: no están excluidos y no tienen tratamiento especial. El Anexo del Decreto 50/026 prevé además un rubro "Autopartes y accesorios de vehículos" para declararlos, aunque ese rubro es estadístico y declarativo, no la fuente del derecho. Con franquicia no pagás arancel, pero sí IVA al 22% con el piso de US$ 20 por envío. Consume cupo: cuenta para los 3 envíos y para los US$ 800 del año civil.',
      },
      {
        q: '¿Puedo traer aceite de motor o un kit de service completo?',
        a: 'No lo tenemos resuelto. El reglamento del IMESI nombra a los lubricantes junto a los vehículos automotores al fijar la base del no contribuyente (Decreto 96/990 art. 11 num. I), lo que apunta a que están alcanzados por ese impuesto, y lo gravado por IMESI queda fuera del régimen postal entero. Pero no verificamos ni la alícuota ni esa consecuencia, y la norma no lo aclara. Si podés, pedí el kit de service sin fluidos y consultá a la DNA antes de comprar.',
      },
      {
        q: '¿Y si me retienen el repuesto?',
        a: 'El trámite de envío retenido es presencial y con agenda previa, y los certificados de otros organismos se llevan en papel. El almacenamiento durante la demora lo pagás vos. Tenés 30 días desde el ingreso al país para pagar los tributos y 90 días para retirar del depósito; pasados esos plazos el envío cae en abandono no infraccional. Y ojo: mientras no tengas el certificado de URSEC, el Decreto 50/026 art. 7 deja el envío fuera de los dos regímenes, ni franquicia ni 60%.',
      },
    ],
    sources: [
      {
        label: 'Ley 20.446, art. 633',
        url: 'https://www.impo.com.uy/bases/leyes/20446-2025/633',
        note: 'El régimen postal no se aplica "en ningún caso" a mercadería gravada por IMESI.',
      },
      {
        label: 'Decreto 50/026',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
        note: 'Art. 5 valor, art. 7 exclusiones, art. 14 plazos y el Anexo con el rubro "Autopartes y accesorios de vehículos".',
      },
      {
        label: 'Título 11 T.O. 2023, art. 1 (IMESI)',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/1_T11',
        note: 'Hecho gravado: vehículos automotores, motos, motonetas, bicimotos y toda otra clase de automotores.',
      },
      {
        label: 'Decreto 96/990 (reglamento del IMESI)',
        url: 'https://www.impo.com.uy/bases/decretos/96-1990',
        note: 'Art. 11 num. I: base incrementada un 50% para vehículos automotores y lubricantes importados por no contribuyentes.',
      },
      {
        label: 'Título 10 T.O. 2023, art. 34 (tasas de IVA)',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/34_T10',
        note: 'Tasa básica 22%: ni autopartes ni vehículos están en el art. 36 ni en el art. 38.',
      },
      {
        label: 'Ley 20.446, art. 660 (piso de IVA en el canal postal)',
        url: 'https://www.impo.com.uy/bases/leyes/20446-2025/660',
        note: 'Mínimo equivalente a US$ 20, salvo envío integrado exclusivamente por bienes exonerados.',
      },
      {
        label: 'RG DNA 11/2026',
        url: 'https://www.aduanas.gub.uy/innovaportal/file/28447/1/rg-11_2026.pdf',
        note: 'Num. 27 el piso de IVA; num. 28 lit. c los códigos de tipo de envío G, H y J.',
      },
      {
        label: 'Ley 19.535, art. 265 (tasa consular)',
        url: 'https://www.impo.com.uy/bases/leyes/19535-2017/265',
        note: '5% sobre el valor en aduana, 3% con ACE N.º 18 del Mercosur.',
      },
      {
        label: 'URSEC — certificado para equipos radioeléctricos (persona física)',
        url: 'https://www.gub.uy/tramites/certificado-para-habilitar-ingreso-al-pais-equipos-radioelectricos-bajo-regimen-franquicia-persona-fisica',
        note: '$239, 2 días hábiles; no interviene en dispositivos que operen únicamente con Wi-Fi o Bluetooth.',
      },
    ],
    verifiedAt: '2026-08-15',
  },
  {
    slug: 'armas-y-replicas',
    productTypeId: 'armas',
    title: 'Importar armas, réplicas y airsoft a Uruguay: qué se puede y qué no',
    navLabel: 'Armas y réplicas',
    description:
      'Las armas no entran por encomienda postal y el permiso del SMA no tiene modalidad para persona física. Al airsoft no lo regula ninguna norma vigente: lo único publicado es un criterio administrativo de la Aduana.',
    icon: 'mdi-pistol',
    examples: [
      'pistola de airsoft',
      'rifle o pistola de aire comprimido',
      'réplica de arma para colección o utilería',
      'mira térmica',
      'visor de visión nocturna',
      'mira telescópica común',
      'arma de fuego y sus partes',
    ],
    notIncluded: [
      'Pirotecnia de estruendo: está prohibida por la Ley 20.246 art. 1 para uso comercial o domiciliario, con umbral bajado a 105 dB desde el 29/12/2025. Es otra prohibición, no la del SMA.',
      'Cuchillos y sprays de defensa: no se encontró ninguna norma uruguaya que los prohíba o restrinja por encomienda. Lo único adyacente es que el Correo prohíbe gases comprimidos y aerosoles como mercancía peligrosa, por el envase y no por la función.',
      'Drones: los controla el criterio de radiofrecuencia (URSEC), no el SMA. DINACIA no tiene trámite de permiso de importación de drones.',
      'Juguetes sin función de arma: van por la ficha de juguetes y hobby, con IVA 22% por regla residual. Ojo con los que llevan batería de litio, que caen en la restricción de transporte aéreo.',
    ],
    regimes: {
      franquicia: {
        verdict: 'No entra por este régimen',
        detail:
          'La DNA publica que las armas están directamente prohibidas en el régimen de encomiendas postales internacionales: no es cuestión de conseguir un permiso, no entran por ese canal. Y para el resto del material controlado por el SMA, el art. 7 del Decreto 50/026 deja fuera del decreto a la mercadería que requiere autorización y carece de ella. Los US$ 800 y los 3 envíos ni se discuten.',
        tone: 'bad',
      },
      prestacionUnica: {
        verdict: 'No entra por este régimen',
        detail:
          'Pagar el 60% no es una llave que abra la puerta. El art. 7 del Decreto 50/026 saca al envío del régimen entero, no sólo de la franquicia: sin la autorización que corresponda, no hay ni franquicia ni prestación única. Queda la devolución a origen a costo del interesado dentro de los 30 días.',
        tone: 'bad',
      },
      general: {
        verdict: 'Sólo vía empresa o despachante',
        detail:
          'Fuera del canal postal queda el despacho formal, donde la intervención del despachante es la regla (CAROU art. 14). Ahí el permiso del SMA se tramita en VUCE como empresa o despachante y cuesta 2 UR: no existe modalidad para persona física. Las miras térmicas y de visión nocturna sólo pueden importarse a través de empresas registradas ante el SMA (Decreto 345/020 art. 1 lit. g e inciso 3, redacción del Decreto 229/021). Para airsoft y réplicas no hay norma vigente que fije el trámite.',
        tone: 'warn',
      },
    },
    taxes: [
      {
        concept: 'IVA',
        value: '22%',
        detail:
          'Regla residual: la tasa básica la fija el art. 34 del Título 10. Nada de este rubro figura en la tasa mínima (art. 36) ni en las exoneraciones (art. 38). Si el envío llegara a entrar al régimen postal, además rige el piso de US$ 20 de IVA por envío (Ley 20.446 art. 660). Igual, la discusión práctica acá no es la tasa: es si el envío entra o no.',
        source: {
          label: 'Título 10 T.O. 2023 art. 34 (tasas del IVA)',
          url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/34_T10',
        },
      },
      {
        concept: 'Prestación única (60%)',
        value: 'No disponible',
        detail:
          'El 60% con mínimo de US$ 20 por envío es una opción del régimen postal, y este material queda fuera del régimen postal cuando le falta la autorización del organismo (Decreto 50/026 art. 7). No sirve como forma de regularizar un envío retenido.',
        source: {
          label: 'Decreto 50/026',
          url: 'https://www.impo.com.uy/bases/decretos/50-2026',
        },
      },
      {
        concept: 'Arancel (TGA)',
        value: 'Depende del NCM',
        detail:
          'La franquicia anual está exenta de aranceles, pero este rubro no llega a entrar al régimen postal. En el despacho formal el arancel depende de la partida NCM del producto y no se verificó ninguna alícuota partida por partida, así que acá no hay número que darte. El 0% de Bienes de Informática y Telecomunicaciones no tiene nada que ver con este rubro.',
        source: {
          label: 'Ley 20.446 art. 627',
          url: 'https://www.impo.com.uy/bases/leyes/20446-2025/627',
        },
      },
      {
        concept: 'Tasa consular',
        value: '5% (3% con ACE N.º 18)',
        detail:
          'Se aplica sobre el valor en aduana (CIF) en el régimen general. Baja a 3% si la mercadería viene amparada en el ACE N.º 18 del Mercosur. Las exoneraciones del art. 265 son taxativas —admisión temporaria, petróleo crudo y ciertos combustibles, y bienes de capital industriales, agropecuarios o pesqueros con TGA extrazona de 2% o 0%— y ninguna alcanza a este rubro.',
        source: {
          label: 'Ley 19.535 art. 265',
          url: 'https://www.impo.com.uy/bases/leyes/19535-2017/265',
        },
      },
      {
        concept: 'IMESI',
        value: 'No aplica',
        detail:
          'Este rubro no figura entre los hechos gravados por IMESI que se verificaron para esta guía: bebidas alcohólicas, tabacos, cosméticos y perfumería, vehículos automotores y lubricantes. Importa saberlo porque la mercadería gravada por IMESI queda excluida del régimen postal de forma absoluta (Ley 20.446 art. 633). Acá el motivo de exclusión es otro: el permiso del organismo, no el impuesto.',
        source: {
          label: 'Ley 20.446 art. 633',
          url: 'https://www.impo.com.uy/bases/leyes/20446-2025/633',
        },
      },
    ],
    benefits: [],
    procedures: [
      {
        organism: 'SMA',
        when: 'Hace falta certificado previo del SMA cuando la mercadería es material controlado. Por decreto lo son las miras térmicas y de visión nocturna (Decreto 345/020 art. 1 lit. g e inciso 3, redacción del Decreto 229/021). Por listado de la Aduana —criterio administrativo, no norma— también las pistolas de aire comprimido. Una mira telescópica común no figura entre los materiales controlados del decreto, pero la Aduana igual la lista como controlada por el SMA: ahí hay una discrepancia real. Airsoft y réplicas no están nombrados en ninguna norma vigente: ni la Ley 19.247 ni los Decretos 377/016 y 345/020 dicen "aire comprimido", "réplica" ni "airsoft".',
        how: 'El certificado se tramita en VUCE como empresa o despachante y cuesta 2 UR. No existe modalidad para persona física: no lo podés iniciar vos, ni siquiera invocando uso personal. Para miras térmicas y de visión nocturna el decreto va más lejos: sólo pueden importarse a través de empresas registradas ante el SMA, así que no hay vía para una persona física.',
        url: 'https://www.vuce.gub.uy/',
      },
    ],
    declare: {
      intro:
        'Acá el paso a paso no es cómo acceder a un beneficio, porque no hay ninguno. Es cómo averiguar antes de pagar si tu envío va a entrar al país, y qué hacer si ya está retenido.',
      steps: [
        {
          name: 'Definí qué es exactamente lo que vas a comprar',
          text: 'No es lo mismo un arma de fuego (prohibida en encomiendas postales según la DNA), una mira térmica o un visor nocturno (sólo por empresa registrada ante el SMA, por decreto), una mira telescópica común (no está en el decreto pero la Aduana la lista) o una réplica de airsoft (sin norma que la regule). El tratamiento cambia por completo y el operador postal no lo va a resolver por vos.',
        },
        {
          name: 'Preguntá a la Aduana antes de pagar',
          text: 'Escribí a info@aduanas.gub.uy o llamá al 2 915 00 07 (lunes a viernes, 9 a 17) con la descripción técnica y el enlace del producto. Para airsoft y aire comprimido esto no es un exceso de prudencia: no hay norma que resuelva el caso, lo único publicado es un criterio administrativo, y esa respuesta es lo único que vas a poder invocar después.',
        },
        {
          name: 'Si es material controlado, conseguí el certificado antes de que llegue',
          text: 'La bisagra del art. 7 del Decreto 50/026 es la mercadería que requiere autorización "y carece de la misma". Con el certificado en mano el envío sigue dentro del régimen; sin él queda afuera de los dos regímenes. Y el certificado no lo podés sacar vos: en VUCE el trámite del SMA es de empresa o despachante, 2 UR.',
        },
        {
          name: 'No dejes que el operador marque el tipo de envío a ciegas',
          text: 'La declaración lleva un campo "Tipo de envío" (RG DNA 11/2026 num. 28 lit. c): "G" es franquicia, "H" es prestación única del 60%, "J" son los envíos exceptuados del pago de tributos. Ninguno de los tres es una autorización de organismo: marcar "H" y pagar el 60% no compra un permiso.',
        },
        {
          name: 'Si el envío queda retenido, andá preparado',
          text: 'El trámite del envío retenido es presencial y con agenda previa, y los certificados de otros organismos se llevan en papel. El almacenamiento durante toda la demora lo pagás vos.',
        },
        {
          name: 'Si no hay certificado posible, pedí la devolución a origen',
          text: 'El Decreto 50/026 art. 7 habilita devolver el envío a origen a costo del interesado dentro de los 30 días. Es el menos caro de los finales malos: si dejás correr los plazos —30 días desde el ingreso para pagar tributos, 90 días sin retirar del depósito— cae en abandono no infraccional (art. 14) y perdés la mercadería igual, pero habiendo pagado el almacenamiento.',
        },
      ],
      pitfalls: [
        'Comprar primero y averiguar después. Con este rubro el orden inverso te cuesta el producto, el flete y la devolución.',
        'Suponer que "es un juguete" resuelve la clasificación. La DNA lista las pistolas de aire comprimido como mercadería controlada por el SMA, y el rubro "Juguetes, juegos y artículos para recreo" del Anexo del Decreto 50/026 es estadístico: no define el tratamiento tributario ni el control.',
        'Creer que pagar la prestación única del 60% blanquea el envío. El art. 7 lo saca del régimen entero: ni franquicia ni 60%.',
        'Intentar iniciar el permiso del SMA a tu nombre. En VUCE no existe modalidad persona física; el trámite lo hace una empresa registrada o un despachante, y para miras térmicas y nocturnas la importación misma tiene que ir por una empresa registrada.',
        'Declarar la réplica por menos valor del que dice la factura. La Ley 20.446 art. 632 castiga la subvaluación con multa igual al doble de los tributos que debieron pagarse, y la reincidencia en 12 meses con prohibición de operar en el régimen por 12 meses.',
        'Disfrazar el contenido como "accesorio" o "repuesto". Aunque no es el caso que la norma de subvaluación describe, la Aduana clasifica por lo que hay en la caja y el envío igual queda fuera del régimen si el material requiere autorización y no la tiene.',
        'Dejar vencer los plazos mientras discutís. Son 30 días desde el ingreso al país y 90 días sin retirar del depósito; después es abandono no infraccional.',
      ],
    },
    considerations: [
      'El riesgo real que asumís no es pagar más impuestos: es que el envío no entre. Al precio del producto sumale el flete perdido y el costo de la devolución a origen, que corre por tu cuenta.',
      'Airsoft y réplicas están en un vacío normativo. No hay norma vigente que los regule y el proyecto de ley de armas de aire comprimido no fue sancionado. La única base publicada es que la DNA lista las pistolas de aire comprimido como mercadería controlada por el SMA: eso es criterio administrativo, no norma.',
      'Para miras térmicas y de visión nocturna no hay camino personal. El decreto reserva la importación a empresas registradas ante el SMA. Si la querés, la vía es comprarla acá o a través de una empresa registrada, no traerla vos.',
      'La mira telescópica común es el caso más incómodo: no figura entre los materiales controlados del Decreto 345/020, pero la Aduana igual la lista como controlada por el SMA. Esa contradicción no está resuelta en ninguna fuente oficial, así que preguntá por escrito antes de comprar.',
      'No hay un listado verificado de qué partes, accesorios o repuestos arrastran el control. La página de la DNA que enumera productos controlados aclara ella misma que es orientativa y no taxativa.',
      'La única lista enumerada de "mercadería prohibida" que publica la DNA es del 26/04/2023 y cita un decreto ya derogado. No te apoyes en esa página para concluir que algo está permitido.',
      'Si el envío se retiene, el costo se acumula: almacenamiento a tu cargo mientras dure la demora, agenda previa y una visita presencial. Contá ese tiempo antes de comprar, no después.',
    ],
    faqs: [
      {
        q: '¿Puedo traer una pistola de airsoft por correo?',
        a: 'No hay una respuesta normativa, y eso es exactamente el problema. Ninguna norma vigente regula el airsoft, las réplicas ni el aire comprimido: ni la Ley 19.247 ni los Decretos 377/016 y 345/020 usan esas palabras. Lo único publicado es que la DNA lista las pistolas de aire comprimido entre la mercadería controlada por el SMA, y eso es criterio administrativo de la Aduana, no norma. Si te la clasifican así y no tenés certificado previo, el art. 7 del Decreto 50/026 deja el envío fuera del régimen. Preguntá por escrito a la DNA antes de pagar y guardá la respuesta.',
      },
      {
        q: '¿Y si la declaro como juguete?',
        a: 'Es la peor idea del listado. Si además declarás menos valor del que dice la factura, cae la Ley 20.446 art. 632: multa igual al doble de los tributos que debieron pagarse, y si reincidís dentro de 12 meses, prohibición de operar en el régimen por 12 meses. Y no sirve: el rubro "Juguetes, juegos y artículos para recreo" del Anexo del Decreto 50/026 es un rubro estadístico de la declaración, no una definición de tratamiento. La Aduana clasifica por lo que hay en la caja, no por el casillero que marcaste.',
      },
      {
        q: '¿Puedo sacar yo el permiso del SMA para uso personal?',
        a: 'No. El permiso se tramita en VUCE como empresa o despachante y cuesta 2 UR: no existe modalidad para persona física. No existe una franja general de "uso personal" que dispense del permiso de un organismo, y para las miras térmicas y de visión nocturna el Decreto 345/020 va más lejos todavía, porque reserva la importación a empresas registradas ante el SMA. Es decir: ni el trámite ni la importación admiten que la hagas vos.',
      },
      {
        q: '¿Una mira telescópica común necesita certificado?',
        a: 'Depende de a quién le preguntes, y eso es un hecho, no una evasiva. El Decreto 345/020 no la incluye entre los materiales controlados —sí incluye las térmicas y las de visión nocturna— pero la Aduana igual la lista como mercadería controlada por el SMA. Como no hay fuente oficial que resuelva la contradicción, tratala como controlada a efectos de riesgo y consultá antes por escrito a info@aduanas.gub.uy.',
      },
      {
        q: '¿Qué pasa si el paquete llega sin el permiso?',
        a: 'El art. 7 del Decreto 50/026 excluye del régimen a la mercadería que requiere autorización y carece de ella. No es que pagás más: quedás fuera de los dos regímenes, ni franquicia ni prestación única del 60%. La salida prevista es devolver el envío a origen a costo tuyo dentro de los 30 días. Si dejás correr los plazos —30 días desde el ingreso, o 90 días sin retirar del depósito— la mercadería cae en abandono no infraccional y encima pagaste el almacenamiento.',
      },
      {
        q: '¿Cuánto IVA paga si finalmente entra?',
        a: '22%, por la regla residual del art. 34 del Título 10: no está exonerado por el art. 38 ni listado en la tasa mínima del art. 36. En el régimen postal el IVA además no puede ser inferior a US$ 20 por envío (Ley 20.446 art. 660, repetido por la RG DNA 11/2026 num. 27). Dicho esto, en esta categoría la tasa casi nunca es la variable que decide: lo que decide es el permiso.',
      },
    ],
    sources: [
      {
        label: 'DNA — productos que requieren permisos o no pueden ingresar',
        url: 'https://www.aduanas.gub.uy/innovaportal/v/28229/1/innova.front/',
        note: 'Lista las armas como prohibidas en encomiendas postales y las pistolas de aire comprimido como controladas por el SMA. La propia DNA aclara que el listado es orientativo y no taxativo. Página del 09/01/2026, anterior al Decreto 50/026.',
      },
      {
        label: 'Decreto 345/020 (materiales controlados por el SMA)',
        url: 'https://www.impo.com.uy/bases/decretos/345-2020',
        note: 'Art. 1 lit. g e inciso 3, redacción del Decreto 229/021: miras térmicas y de visión nocturna sólo por empresas registradas ante el SMA. No menciona aire comprimido, réplicas ni airsoft.',
      },
      {
        label: 'Decreto 50/026 (régimen de envíos postales internacionales)',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
        note: 'Art. 7: la mercadería que requiere autorización y carece de ella queda fuera del régimen, con devolución a origen a costo del interesado en 30 días. Art. 14: plazos de 30 y 90 días.',
      },
      {
        label: 'Ley 20.446 art. 627 (franquicia y prestación única)',
        url: 'https://www.impo.com.uy/bases/leyes/20446-2025/627',
        note: 'US$ 800 anuales en 3 envíos exentos de aranceles; el 60% con mínimo de US$ 20 por envío es opcional (podrá optar).',
      },
      {
        label: 'Ley 20.446 art. 633',
        url: 'https://www.impo.com.uy/bases/leyes/20446-2025/633',
        note: 'El régimen no se aplica en ningún caso a mercadería gravada por IMESI y podrá no aplicarse a la restringida. El decreto endureció esa facultad y la volvió categórica.',
      },
      {
        label: 'Ley 20.446 art. 632 (subvaluación)',
        url: 'https://www.impo.com.uy/bases/leyes/20446-2025/632',
        note: 'Multa igual al doble de los tributos que debieron pagarse; reincidencia en 12 meses, prohibición de operar en el régimen por 12 meses.',
      },
      {
        label: 'RG DNA 11/2026',
        url: 'https://www.aduanas.gub.uy/innovaportal/file/28447/1/rg-11_2026.pdf',
        note: 'Num. 28 lit. c: códigos del campo "Tipo de envío" (G franquicia, H prestación única, J exceptuados). Num. 27: piso de US$ 20 de IVA.',
      },
      {
        label: 'Título 10 T.O. 2023 art. 34 (tasas del IVA)',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/34_T10',
        note: 'Fija la tasa básica del 22%, que es la que corresponde a este rubro por regla residual.',
      },
      {
        label: 'VUCE',
        url: 'https://www.vuce.gub.uy/',
        note: 'Donde vive el permiso del SMA: 2 UR, sólo empresa o despachante, sin modalidad para persona física.',
      },
      {
        label: 'DNA — envíos retenidos',
        url: 'https://www.aduanas.gub.uy/innovaportal/v/28225/1/innova.front/',
        note: 'Trámite presencial con agenda previa, certificados en papel y almacenamiento a cargo del destinatario.',
      },
    ],
    verifiedAt: '2026-08-15',
  },
  {
    slug: 'productos-prohibidos',
    productTypeId: 'prohibidos',
    title: 'Productos prohibidos: qué no podés importar a Uruguay por correo',
    navLabel: 'Prohibidos',
    description:
      'Qué no entra por correo: el vape está prohibido por decreto, las baterías de litio no, y la única lista enumerada de la DNA es de 2023 y cita norma derogada.',
    icon: 'mdi-cancel',
    examples: [
      'vaporizadores y cigarrillos electrónicos',
      'productos de tabaco calentado',
      'accesorios y repuestos de vaporizador',
      'pirotecnia de estruendo',
      'armas',
      'miras térmicas o de visión nocturna',
      'semillas, plantas y alimentos de origen animal',
      'efectivo (la DNA lo lista como prohibido, aunque no se encontró norma que lo diga)',
    ],
    notIncluded: [
      'Baterías de litio y power banks: no hay prohibición aduanera uruguaya, es restricción de transporte aéreo y política del Correo',
      'Cuchillos y sprays de defensa: no se encontró norma uruguaya que los prohíba por encomienda',
      'Alcohol y tabaco: no están prohibidos de importar, están fuera del régimen postal por estar gravados con IMESI',
      'Anteojos graduados y lentes de contacto: no están prohibidos, pero no pueden ingresar a nombre de una persona física',
    ],
    regimes: {
      franquicia: {
        verdict: 'No entra por este régimen',
        detail:
          'La franquicia exonera aranceles, no habilita mercadería. El Decreto 50/026 art. 7 deja fuera del régimen a la mercadería que requiere autorización y carece de ella. Y si la prohibición es de importar, como la de los vaporizadores, ningún régimen la levanta.',
        tone: 'bad',
      },
      prestacionUnica: {
        verdict: 'Pagar el 60% no lo habilita',
        detail:
          'La prestación única es una opción dentro del régimen postal, en sustitución de la tributación de la importación. No es un permiso. Sin la autorización requerida el envío queda fuera de los dos regímenes (Decreto 50/026 art. 7), y la Ley 20.446 art. 633 excluye de forma absoluta lo gravado por IMESI.',
        tone: 'bad',
      },
      general: {
        verdict: 'Tampoco, si la prohibición es de importar',
        detail:
          'Cuando la norma prohíbe la importación —vaporizadores y tabaco calentado, Decreto 534/009 en la redacción del Decreto 125/025— el canal no cambia nada. Cuando la mercadería sólo está restringida, lo que falta es la autorización del organismo, no el canal: el art. 7 del Decreto 50/026 la saca del régimen postal justamente por carecer de ella. Y en el despacho formal la intervención del despachante es la regla (CAROU art. 14), a diferencia del régimen postal, que no lo exige.',
        tone: 'bad',
      },
    },
    taxes: [
      {
        concept: 'IVA',
        value: 'No aplica',
        detail:
          'No hay nada que liquidar si el envío no se libra. El IVA a la importación en el régimen postal se calcula sobre el valor de factura o declaración de valor, con un mínimo de US$ 20 (Título 10 art. 13 lit. B, inciso agregado por la Ley 20.446 art. 660), pero eso corre para mercadería que sí puede ingresar.',
        source: {
          label: 'Título 10 T.O. 2023 art. 13',
          url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/13_T10',
        },
      },
      {
        concept: 'Prestación única (60%)',
        value: 'No es una salida',
        detail:
          'El 60% con mínimo de US$ 20 por envío sustituye la tributación de la importación, no la autorización que falta. El Decreto 50/026 art. 7 saca del régimen entero a la mercadería que requiere permiso y no lo tiene.',
        source: {
          label: 'Decreto 50/026',
          url: 'https://www.impo.com.uy/bases/decretos/50-2026',
        },
      },
      {
        concept: 'Aranceles y tasa consular',
        value: 'No aplica',
        detail:
          'Sólo se liquidan sobre una importación que se concreta. En el régimen general la tasa consular es 5% sobre el valor en aduana, 3% si la mercadería viene amparada en el ACE N.º 18 del Mercosur, y sus exoneraciones son taxativas: admisión temporaria, petróleo crudo y ciertos combustibles, y bienes de capital de uso industrial, agropecuario o pesquero.',
        source: {
          label: 'Ley 19.535 art. 265',
          url: 'https://www.impo.com.uy/bases/leyes/19535-2017/265',
        },
      },
      {
        concept: 'IMESI',
        value: 'Deja el envío fuera del régimen',
        detail:
          'Toda mercadería gravada por IMESI queda excluida del régimen postal. La Ley 20.446 art. 633 dice que el régimen no se aplica "en ningún caso" a esa mercadería; el Decreto 50/026 art. 7 lo reglamenta. Por eso alcohol, tabaco y vehículos no entran por correo, aunque su importación no esté prohibida.',
        source: {
          label: 'Ley 20.446 art. 633',
          url: 'https://www.impo.com.uy/bases/leyes/20446-2025/633',
        },
      },
      {
        concept: 'Almacenaje y devolución a origen',
        value: 'A tu costo',
        detail:
          'No es un tributo, pero es la plata que vas a poner igual. El envío sin autorización se puede devolver a origen a costo del interesado dentro de los 30 días, y el almacenamiento durante la demora lo paga el destinatario.',
        source: {
          label: 'DNA — envíos retenidos',
          url: 'https://www.aduanas.gub.uy/innovaportal/v/28225/1/innova.front/',
        },
      },
    ],
    benefits: [],
    procedures: [
      {
        organism: 'SMA',
        when: 'Hace falta para miras térmicas y de visión nocturna. No hay excepción para uso personal: el Decreto 345/020 art. 1 lit. g, en la redacción del Decreto 229/021, sólo admite que las importen empresas registradas ante el SMA. Para las armas en sí no hay trámite que sirva: la DNA las da por directamente prohibidas en encomiendas postales internacionales.',
        how: 'El permiso se tramita en VUCE como empresa o despachante y cuesta 2 UR. No existe modalidad para persona física. Una mira telescópica común, ni térmica ni nocturna, no figura entre los materiales controlados del decreto, aunque la Aduana la lista como controlada por el SMA: eso es criterio administrativo, no norma.',
        url: 'https://www.impo.com.uy/bases/decretos/345-2020',
      },
      {
        organism: 'MGAP',
        when: 'Aplica a semillas, plantas, frutas y verduras frescas, animales vivos, alimentos de origen animal, fertilizantes y plaguicidas: la Resolución MGAP 1.720/021 los prohíbe por encomienda o correo, sin franja de uso personal. Los productos vegetales acondicionados al detalle —té, especias, orégano— están prohibidos sólo en envases de más de 500 gramos.',
        how: 'No se encontró ningún trámite en VUCE dirigido a persona física para traer estos productos por correo. La nómina además no es taxativa: cualquier otro producto puede quedar prohibido si le falta el certificado oficial.',
        url: 'https://www.gub.uy/ministerio-ganaderia-agricultura-pesca/comunicacion/publicaciones/nomina-productos-autorizados-ingresar-pais',
      },
      {
        organism: 'MSP',
        when: 'Aplica a productos de salud en general —medicamentos, cosméticos, productos médicos—. El MSP no autoriza el ingreso al país de productos de salud del exterior por particulares (Decreto 18/020 art. 19). No existe una franja general de uso personal. Los anteojos graduados, lentes de contacto, cristales y armazones directamente no pueden ingresar a nombre de una persona física.',
        how: 'La única excepción es el ingreso de productos no registrados con prescripción médica específica, consentimiento informado y sin equivalente registrado en el país. Va por correo electrónico a farmacovigilancia@msp.gub.uy, no por VUCE, y es gratuito.',
        url: 'https://www.gub.uy/tramites/ingreso-medicamentos-no-registrados-ciudadanos-uruguayos',
      },
    ],
    declare: {
      intro:
        'Acá no hay una casilla para marcar. Si la mercadería está prohibida, no hay declaración que la salve; si está restringida, lo que define todo es tener el certificado ANTES de que el envío llegue. Lo que sigue es cómo verificar en qué caso estás y qué hacer si ya lo compraste.',
      steps: [
        {
          name: 'Ubicá en cuál de los tres casilleros cae tu compra',
          text: 'Uno: prohibida de importar por norma (vaporizadores, cigarrillos electrónicos y tabaco calentado, Decreto 534/009 art. 1 en la redacción del Decreto 125/025; pirotecnia de estruendo, Ley 20.246 art. 1). Dos: excluida del régimen postal por estar gravada con IMESI (alcohol, tabaco, vehículos), Ley 20.446 art. 633. Tres: restringida, o sea que entra sólo con el certificado previo del organismo controlador —MSP, MGAP, SMA, URSEC—, y para varias de esas mercaderías no hay trámite abierto a persona física. Los tres se sienten igual cuando te frenan el paquete, pero se resuelven distinto.',
        },
        {
          name: 'No uses la lista vieja de la DNA para decidir',
          text: 'La única lista enumerada de mercadería prohibida que publica la DNA es del 26/04/2023 y cita el Decreto 87/021, derogado por el Decreto 125/025. La página vigente del régimen 2026 publica organismos controladores, no una lista de prohibidos, y aclara que es orientativa y no taxativa. Traducido: no existe hoy una lista cerrada contra la cual chequear.',
        },
        {
          name: 'Si es restringida, sacá el certificado antes de comprar',
          text: 'La bisagra es el art. 7 del Decreto 50/026: excluye del régimen a la mercadería que requiere autorización "y que carezcan de la misma". Con el certificado, el envío sigue dentro del régimen postal; sin él queda afuera de los dos regímenes, ni franquicia ni 60%. El certificado de URSEC, por ejemplo, lo inicia la propia persona física en VUCE, con un costo publicado de entre $204 y $239 y un plazo máximo de URSEC de 2 días hábiles.',
        },
        {
          name: 'Mirá qué código de tipo de envío va a usar el operador',
          text: 'La RG DNA 11/2026 num. 28 lit. c define el campo "Tipo de envío": G para franquicia, H para prestación única, y J para lo exceptuado del pago de tributos, con J/01 material al amparo de la Ley 15.913 (libros), J/02 medicamentos de uso personal, J/03 numismática y J/04 valija diplomática. Ninguno de esos códigos describe mercadería prohibida ni reemplaza un permiso. Pedir J/02 para un medicamento que el MSP no autorizó no habilita nada.',
        },
        {
          name: 'Si ya está retenido, andá con turno y en papel',
          text: 'El trámite del envío retenido es presencial y con agenda previa, y los certificados de otros organismos se llevan en papel. El almacenamiento durante la demora lo paga el destinatario. Sin el certificado previo, la DNA no inicia el trámite.',
        },
        {
          name: 'Si no hay permiso posible, pedí la devolución a origen y contá los días',
          text: 'El envío sin autorización se puede devolver a origen a costo del interesado dentro de los 30 días. Tenés 30 días desde el ingreso al país para pagar los tributos y 90 días sin retirar del depósito antes de caer en abandono no infraccional (Decreto 50/026 art. 14). El "plazo de 10 días" que suele mencionarse no es un plazo legal: es la ventana tarifaria del cargo de gestión del Correo Uruguayo.',
        },
        {
          name: 'Guardá el reclamo para el canal correcto',
          text: 'Consultas y reclamos de la DNA: info@aduanas.gub.uy o 2 915 00 07, de lunes a viernes de 9 a 17. Correo Uruguayo: 0800 2108. Preguntá antes de comprar, no después de que el paquete está en depósito y el almacenaje corre por tu cuenta.',
        },
      ],
      pitfalls: [
        'Guiarte por la lista de prohibidos del 26/04/2023 de la DNA: cita un decreto derogado y no refleja el régimen de 2026.',
        'Creer que pagando el 60% cualquier cosa entra. La prestación única sustituye tributos, no autorizaciones ni prohibiciones.',
        'Comprar primero y sacar el certificado después: el art. 7 deja fuera de los dos regímenes al envío que requiere autorización y carece de ella.',
        'Suponer que "es para uso personal" dispensa del permiso. No hay franja general de uso personal frente a los organismos controladores.',
        'Con el vaporizador, pensar que el repuesto suelto zafa: el art. 2 del Decreto 534/009 extiende la prohibición a cualquier accesorio o repuesto.',
        'Declarar un valor menor para pasar desapercibido: la Ley 20.446 art. 632 castiga la subvaluación con multa igual al doble de los tributos que debieron pagarse, y la reincidencia en 12 meses te prohíbe operar en el régimen por 12 meses.',
      ],
    },
    considerations: [
      'La prohibición del vaporizador es amplia: el Decreto 534/009 art. 1, en la redacción del Decreto 125/025 del 10/06/2025, alcanza comercialización, importación, registro marcario y publicidad, e incluye los productos de tabaco calentado. El art. 2 la extiende a cualquier accesorio o repuesto. No se encontró litigio que suspenda su vigencia.',
      'La pirotecnia de estruendo está prohibida por la Ley 20.246 art. 1 para uso comercial o domiciliario, y el umbral de 110 dB bajó a 105 dB desde el 29/12/2025.',
      'El efectivo: la DNA lo lista como prohibido y el Correo no lo admite, pero no se encontró norma que lo prohíba expresamente en envíos postales. Es criterio publicado y política del operador, no una norma que podamos citar.',
      'Las baterías de litio no están prohibidas por la Aduana. La restricción es de transporte aéreo (IATA/OACI) y la decide cada aerolínea u operador, así lo dice la propia DNA; el Correo Uruguayo, por política propia, no admite baterías de litio en envíos internacionales. No existe cifra oficial uruguaya de Wh: los 100 o 160 Wh que circulan no salen de ninguna norma nacional.',
      'Cuchillos y sprays de defensa: no se encontró ninguna norma uruguaya que los prohíba o restrinja por encomienda. Lo único adyacente es que el Correo prohíbe gases comprimidos y aerosoles como mercancía peligrosa, por el envase y no por la función.',
      'Airsoft, réplicas y aire comprimido viven en un limbo: no hay norma vigente que los regule, ni la Ley 19.247 ni los Decretos 377/016 y 345/020 los mencionan, y el proyecto de ley de armas de aire comprimido no fue sancionado. La DNA igual lista "pistolas de aire comprimido" como mercadería controlada por el SMA: es criterio administrativo, no norma.',
      'Costeá el error antes de apretar comprar: si el envío no puede ingresar, el almacenamiento durante la demora lo pagás vos y la devolución a origen también corre por cuenta del interesado.',
    ],
    faqs: [
      {
        q: '¿Puedo traer un vaporizador si es para uso personal y uno solo?',
        a: 'No. El Decreto 534/009 art. 1, en la redacción del Decreto 125/025, prohíbe la importación sin abrir ninguna franja de uso personal ni de cantidad. La prohibición incluye los productos de tabaco calentado, y el art. 2 la extiende a cualquier accesorio o repuesto. No es una restricción sujeta a autorización sino una prohibición, y no se encontró litigio que suspenda su vigencia.',
      },
      {
        q: 'Si pago el 60% de prestación única, ¿entra igual?',
        a: 'No. La prestación única es una opción de tributación dentro del régimen postal: sustituye aranceles y tributos internos, no autorizaciones. El Decreto 50/026 art. 7 deja fuera del régimen entero a la mercadería que requiere autorización y carece de ella, y la Ley 20.446 art. 633 dice que el régimen no se aplica "en ningún caso" a lo gravado por IMESI. Pagar más no compra el ingreso.',
      },
      {
        q: '¿Dónde está la lista oficial de productos prohibidos?',
        a: 'No hay una lista cerrada y actualizada. La única lista enumerada que publica la DNA es del 26/04/2023 y cita el Decreto 87/021, derogado por el Decreto 125/025. La página vigente del régimen 2026 publica organismos controladores en vez de una lista, y aclara ella misma que es orientativa y no taxativa. Además, las páginas de la DNA v/28228 y v/28229 son del 09/01/2026, anteriores al Decreto 50/026. Conviene chequear contra la norma, no contra la página.',
      },
      {
        q: '¿Puedo recibir un power bank o una batería de litio suelta?',
        a: 'No es un tema aduanero. La Aduana uruguaya no prohíbe las baterías de litio: la restricción es de transporte aéreo (IATA/OACI) y la define cada aerolínea u operador, así lo dice la propia DNA. El Correo Uruguayo, por política propia, no admite baterías de litio en envíos internacionales, así que por ese canal no te va a llegar. No existe cifra oficial uruguaya de Wh, ni de 100 ni de 160: si alguien te la cita como norma, no la está sacando de una norma.',
      },
      {
        q: 'Compré algo que resultó estar restringido y me lo retuvieron. ¿Qué hago?',
        a: 'Primero conseguí el certificado del organismo que corresponda: sin el certificado previo la DNA no inicia el trámite del envío retenido. El trámite es presencial, con agenda previa, y los certificados se llevan en papel. El almacenamiento mientras tanto lo pagás vos. Si no existe vía para persona física —miras térmicas, semillas o plantas por correo, anteojos graduados—, la salida es devolverlo a origen a tu costo dentro de los 30 días. Y ojo con los plazos: 30 días desde el ingreso para pagar tributos y 90 días en depósito antes del abandono no infraccional.',
      },
      {
        q: '¿Un cuchillo de cocina o un spray de pimienta están prohibidos?',
        a: 'No se encontró ninguna norma uruguaya que los prohíba o restrinja por encomienda. Lo único cercano es que el Correo prohíbe gases comprimidos y aerosoles como mercancía peligrosa: eso es por el envase presurizado, no por la función del producto, y es política del operador, no norma aduanera. Dicho esto, la lista de organismos controladores de la DNA es explícitamente orientativa y no taxativa.',
      },
    ],
    sources: [
      {
        label: 'Decreto 534/009 (vaporizadores y cigarrillos electrónicos)',
        url: 'https://www.impo.com.uy/bases/decretos/534-2009',
        note: 'Art. 1: prohibición. Art. 2: se extiende a cualquier accesorio o repuesto.',
      },
      {
        label: 'Decreto 125/025 (10/06/2025)',
        url: 'https://www.impo.com.uy/bases/decretos/125-2025',
        note: 'Redacción vigente del art. 1; incluye los productos de tabaco calentado. Deroga el Decreto 87/021.',
      },
      {
        label: 'Ley 20.246 art. 1 (pirotecnia de estruendo)',
        url: 'https://www.impo.com.uy/bases/leyes/20246-2023',
        note: 'Prohibición para uso comercial o domiciliario; umbral de 105 dB desde el 29/12/2025.',
      },
      {
        label: 'Ley 20.446 art. 633',
        url: 'https://www.impo.com.uy/bases/leyes/20446-2025/633',
        note: 'El régimen postal no se aplica "en ningún caso" a mercadería gravada por IMESI.',
      },
      {
        label: 'Ley 20.446 art. 632',
        url: 'https://www.impo.com.uy/bases/leyes/20446-2025/632',
        note: 'Subvaluación: multa igual al doble de los tributos y prohibición de operar 12 meses por reincidencia.',
      },
      {
        label: 'Decreto 50/026',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
        note: 'Art. 7: queda fuera del régimen la mercadería que requiere autorización y carece de ella. Art. 14: plazos de 30 y 90 días.',
      },
      {
        label: 'Resolución MGAP 1.720/021',
        url: 'https://www.gub.uy/ministerio-ganaderia-agricultura-pesca/comunicacion/publicaciones/nomina-productos-autorizados-ingresar-pais',
        note: 'Prohíbe por correo o encomienda semillas, plantas, frutas y verduras frescas, animales vivos, alimentos de origen animal, fertilizantes y plaguicidas.',
      },
      {
        label: 'Decreto 345/020 (materiales controlados por el SMA)',
        url: 'https://www.impo.com.uy/bases/decretos/345-2020',
        note: 'Miras térmicas y de visión nocturna: sólo empresas registradas ante el SMA.',
      },
      {
        label: 'RG DNA 11/2026',
        url: 'https://www.aduanas.gub.uy/innovaportal/file/28447/1/rg-11_2026.pdf',
        note: 'Num. 28 lit. c: códigos de tipo de envío G, H y J/01 a J/04.',
      },
      {
        label: 'DNA — productos que requieren permisos o no pueden ingresar',
        url: 'https://www.aduanas.gub.uy/innovaportal/v/28229/1/innova.front/',
        note: 'Publicada el 09/01/2026, anterior al Decreto 50/026; la propia DNA aclara que el listado es orientativo y no taxativo.',
      },
      {
        label: 'DNA — envíos retenidos',
        url: 'https://www.aduanas.gub.uy/innovaportal/v/28225/1/innova.front/',
        note: 'Trámite presencial con agenda previa; certificados en papel; el almacenamiento lo paga el destinatario.',
      },
    ],
    verifiedAt: '2026-08-15',
  },
  {
    slug: 'otros-productos',
    productTypeId: 'general',
    title: 'Importar otros productos a Uruguay: impuestos y cómo declararlo',
    navLabel: 'Otros productos',
    description:
      'Casi todo cae en el 22% de IVA, pero el mínimo de US$ 20 por envío hace que una compra de US$ 15 pague lo mismo que una de US$ 90: cómo declarar y qué elegir.',
    icon: 'mdi-package-variant-closed',
    examples: [
      'Herramientas de mano y sus repuestos',
      'Artículos deportivos: guantes, pelotas, bolsos',
      'Instrumentos musicales y accesorios (cuerdas, pedales, fundas)',
      'Muebles chicos y artículos para el hogar',
      'Relojes, bisutería y objetos de colección',
      'Repuestos y accesorios de bicicleta',
      'Artículos de camping y para fiestas',
      'Mochilas, carteras y bolsos',
    ],
    notIncluded: [
      'Bebidas alcohólicas, tabaco, cosméticos gravados por IMESI y vehículos: la mercadería gravada por IMESI queda fuera del régimen postal entero (Ley 20.446 art. 633 y Decreto 50/026 art. 7)',
      'Libros y material educativo: no van como franquicia, van por el código J/01 de la declaración (RG DNA 11/2026 num. 28 lit. c)',
      'Celulares, GPS, handies y equipos que transmiten fuera de Wi-Fi/Bluetooth: necesitan certificado previo de URSEC',
      'Medicamentos, suplementos, cosméticos, alimentos de origen animal, semillas y plantas: los controla el MSP o el MGAP y tienen reglas propias',
    ],
    regimes: {
      franquicia: {
        verdict: 'IVA 22%, mínimo US$ 20',
        detail:
          'La franquicia exonera aranceles, pero el IVA se sigue liquidando (Ley 20.446 art. 627 inc. 2). En el régimen postal el IVA se calcula sobre el valor de factura o la declaración de valor y no puede ser inferior al equivalente a US$ 20 por envío (art. 13 lit. B del Título 10, inciso agregado por la Ley 20.446 art. 660). Ese piso muerde en toda compra de menos de US$ 90,91.',
        tone: 'warn',
      },
      prestacionUnica: {
        verdict: '60% del valor, mínimo US$ 20',
        detail:
          'Es opcional: la ley dice que el titular "podrá optar" por pagarla, y sustituye toda tributación de la importación definitiva, sea arancelaria o interna. Para un producto común el 60% es más caro que el 22% de la franquicia, salvo en las compras chicas, donde los dos caminos terminan en el mismo mínimo de US$ 20 por envío. Sirve cuando ya usaste los 3 envíos o los US$ 800 del año, o cuando no cumplís los requisitos del art. 4 (por ejemplo, pagó un tercero).',
        tone: 'warn',
      },
      general: {
        verdict: 'IVA 22% + arancel + tasa consular',
        detail:
          'Si el envío pasa los US$ 800 de factura o los 20 kg queda fuera del régimen postal y se despacha por el régimen general: el IVA se calcula sobre el valor en aduana (CIF) más el arancel y, si importa un particular, esa suma se incrementa un 50% (art. 13 lit. B). Se suma la tasa consular del 5% (3% con ACE N.º 18) y la intervención del despachante pasa a ser la regla (CAROU art. 14).',
        tone: 'warn',
      },
    },
    taxes: [
      {
        concept: 'IVA',
        value: '22%',
        detail:
          'Regla residual: todo bien paga la tasa básica salvo que esté expresamente exonerado (art. 38) o listado en la tasa mínima (art. 36). Un producto genérico no está en ninguna de las dos listas. La propia FAQ de la DGI usa el hedge "en principio": la dicotomía no es exhaustiva y la tasa básica la fija el art. 34.',
        source: {
          label: 'Título 10 T.O. 2023 art. 34',
          url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/34_T10',
        },
      },
      {
        concept: 'Mínimo de IVA del envío postal',
        value: 'US$ 20 por envío',
        detail:
          'En el régimen postal el IVA se aplica sobre el valor de factura o declaración de valor y "en ningún caso el monto a pagar por concepto de este impuesto podrá ser inferior al equivalente a US$ 20", salvo que el envío esté integrado exclusivamente por bienes exonerados. La DNA lo repite en la RG 11/2026, Anexo I num. 27. Caveat: ni la FAQ del MEF ni la de la DNA mencionan este mínimo al explicar la franquicia (sólo lo citan para el 60%) y no hay ningún ejemplo numérico oficial de una compra con franquicia pagando IVA.',
        source: {
          label: 'Título 10 T.O. 2023 art. 13',
          url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/13_T10',
        },
      },
      {
        concept: 'Arancel',
        value: '0% con franquicia',
        detail:
          'La franquicia anual está exenta de aranceles. Si optás por la prestación única, el 60% sustituye también lo arancelario. Fuera del régimen postal el arancel depende del NCM del producto: no verificamos alícuotas partida por partida, así que no publicamos ninguna.',
        source: {
          label: 'Ley 20.446 art. 627',
          url: 'https://www.impo.com.uy/bases/leyes/20446-2025/627',
        },
      },
      {
        concept: 'Prestación única',
        value: '60% del valor, mínimo US$ 20',
        detail:
          'Sustituye toda tributación relativa a la importación definitiva, por concepto arancelario o tributo interno. Es una opción del titular, no un default legal; lo que sí está escrito es que cuando se pierde la franquicia —por ejemplo, si pagó un tercero— la operación se liquida al 60% (Decreto 50/026 art. 15 y FAQ de la DNA).',
        source: {
          label: 'Ley 20.446 art. 627',
          url: 'https://www.impo.com.uy/bases/leyes/20446-2025/627',
        },
      },
      {
        concept: 'IMESI',
        value: 'No aplica',
        detail:
          'Un producto genérico no está alcanzado por el IMESI. El punto importante es al revés: si lo que comprás sí está gravado por IMESI (bebidas alcohólicas, tabaco, vehículos y parte de la cosmética y la perfumería, porque hay ítems expresamente excluidos y otros a tasa 0%), el envío queda fuera del régimen postal entero, ni franquicia ni 60%.',
        source: {
          label: 'Ley 20.446 art. 633',
          url: 'https://www.impo.com.uy/bases/leyes/20446-2025/633',
        },
      },
      {
        concept: 'Tasa consular',
        value: '5% (3% con Mercosur) fuera del régimen postal',
        detail:
          'Se calcula sobre el valor en aduana y sus exoneraciones son taxativas: admisión temporaria, petróleo crudo y ciertos combustibles, y bienes de capital de uso industrial, agropecuario o pesquero con arancel extrazona de 2% o 0%. En la prestación única no se paga aparte, porque el 60% sustituye toda tributación. Para el envío con franquicia, lo único publicado es que está exenta de aranceles y que el IVA se sigue liquidando: cómo juega la tasa consular ahí, la norma no lo resuelve.',
        source: {
          label: 'Ley 19.535 art. 265',
          url: 'https://www.impo.com.uy/bases/leyes/19535-2017/265',
        },
      },
      {
        concept: 'Anticipo de IVA',
        value: 'No aplica al particular',
        detail:
          'El anticipo del Decreto 220/998 art. 115 es sólo para contribuyentes. Un particular no lo paga, pero tampoco recupera nada: el IVA de importación le queda definitivo, no se deduce ni se devuelve.',
        source: {
          label: 'Decreto 220/998',
          url: 'https://www.impo.com.uy/bases/decretos/220-1998',
        },
      },
    ],
    benefits: [
      {
        title: 'Origen con acuerdo comercial: hasta US$ 200 exonerados',
        detail:
          'Dentro de la franquicia, los envíos provenientes de un país con acuerdo comercial (el caso de Estados Unidos, por el TIFA) están exonerados hasta US$ 200. La residencia fiscal del vendedor se acredita con la factura. Desde el 1/10/2026 el emisor de la factura tiene que estar registrado ante la DNA (RG 09/2026, prorrogada por las RG 12 y 21/2026): si no lo está, no se aplica la exoneración.',
        norm: 'Decreto 50/026 art. 3',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
      },
      {
        title: 'Obsequio familiar: exento de todo tributo',
        detail:
          'El envío no comercial entre personas físicas, con mercadería en cantidades razonables y para uso personal, está exento de todo tributo. No zafa del cupo: igual lo consume.',
        norm: 'Decreto 50/026 art. 3',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
      },
      {
        title: 'Cosas tuyas de más de 6 meses de uso: no gravadas',
        detail:
          'La importación por un no contribuyente de bienes afectados a su uso personal con al menos seis meses de anterioridad no está gravada por IVA, siempre que se pruebe documentalmente. Sirve para lo que te mandás a vos mismo desde el exterior, no para una compra nueva.',
        norm: 'Decreto 220/998 art. 102',
        url: 'https://www.impo.com.uy/bases/decretos/220-1998',
      },
    ],
    declare: {
      intro:
        'Acá no hay un certificado que conseguir ni un organismo que controle. Lo único que decide cuánto pagás es cómo se declara el envío, y esa declaración la presenta el operador postal o el courier, no vos. Por eso el trabajo es previo: elegir el régimen y avisarlo antes de que lo declaren.',
      steps: [
        {
          name: 'Chequeá que tu producto no esté en otra categoría',
          text: 'Antes de comprar, verificá que no sea mercadería gravada por IMESI (queda fuera del régimen postal, Ley 20.446 art. 633) ni algo que requiera autorización previa de URSEC, MSP, MGAP o SMA. El Decreto 50/026 art. 7 deja fuera del régimen a la mercadería que necesita autorización y carece de ella: con el certificado seguís dentro, sin el certificado quedás afuera de los dos regímenes.',
        },
        {
          name: 'Pagá con tu propia tarjeta',
          text: 'Tiene que ser tarjeta de crédito o débito internacional, o dinero electrónico internacional emitido por una institución regulada por el BCU, y la titularidad tiene que coincidir con quien compra y con el destinatario (Decreto 50/026 art. 4 lit. d y e). Si pagó un tercero se pierde la franquicia y el envío se liquida al 60%.',
        },
        {
          name: 'Guardá la factura original completa',
          text: 'El valor declarado es el total de la factura original de compra, incluidos todos los conceptos que figuren adicionados en ella (Decreto 50/026 art. 5). Si no hay factura, va declaración de valor. El envío tiene que ir acompañado de la documentación que acredite ese valor.',
        },
        {
          name: 'Decile al operador qué régimen querés: G o H',
          text: 'La declaración aduanera lleva un campo "Tipo de envío" (RG DNA 11/2026 num. 28 lit. c): "G" es franquicia y "H" es prestación única del 60%. Para un producto común querés G mientras te quede cupo. Pedilo al courier o al operador postal por escrito, antes de que declaren, y guardá el mensaje.',
        },
        {
          name: 'Si viene por Correo Uruguayo, declaralo vos primero',
          text: 'El destinatario declara el envío en el formulario web del Correo ("Ahíva") con el tracking de 13 caracteres y los datos idénticos a la cédula. Ojo: ese formulario tiene compra u obsequio, franquicia sí o no y medio de pago; el rubro del Anexo del Decreto 50/026 es estadístico y declarativo, y no define ningún beneficio.',
        },
        {
          name: 'Pagá dentro de los 30 días y retirá antes de los 90',
          text: 'El plazo legal es de 30 días desde el ingreso al país para pagar los tributos, y 90 días sin retirar del depósito: pasados esos plazos hay abandono no infraccional (Decreto 50/026 art. 14). El famoso plazo de 10 días desde la notificación no es un plazo legal, es la ventana tarifaria del cargo de gestión del Correo Uruguayo.',
        },
        {
          name: 'Si te lo niegan o el envío queda retenido',
          text: 'Pedí la negativa por escrito y reclamá a la DNA: info@aduanas.gub.uy o 2 915 00 07 (lunes a viernes de 9 a 17). Si el envío quedó retenido, el trámite es presencial con agenda previa, la documentación se lleva en papel, la RG DNA 14/2026 (Anexo I num. 15 lit. k.iii) permite optar por un régimen especial y adjuntar la documentación que lo acredite, y el almacenamiento durante la demora lo pagás vos.',
        },
      ],
      pitfalls: [
        'Que la compra la pague otro (la tarjeta de tu pareja, la de un familiar): se pierde la franquicia y el envío se liquida al 60%.',
        'Declarar menos de lo que dice la factura: multa igual al doble de los tributos que debieron pagarse, se pierde la franquicia de esa operación y, si reincidís en 12 meses, prohibición de operar en el régimen por un año.',
        'Dejar que el operador elija el tipo de envío por vos y enterarte cuando ya está declarado: no hay norma ni FAQ que diga si el régimen se puede cambiar después de presentada la declaración.',
        'Contar el cupo por fecha de compra: se imputa por fecha de desaduanamiento, así que una compra de diciembre puede consumir el cupo del año siguiente.',
        'Olvidarse de los 20 kg: el peso es un tope independiente del valor, y un envío barato pero pesado igual queda fuera del régimen.',
        'Comprar algo que necesita permiso de otro organismo sin tenerlo: el envío queda fuera de la franquicia y del 60%, y sólo se puede devolver a origen a tu costo dentro de los 30 días.',
      ],
    },
    considerations: [
      'El mínimo de US$ 20 de IVA cambia toda la aritmética de las compras chicas: por debajo de US$ 90,91 el 22% nominal no llega al piso y pagás el piso igual. Una compra de US$ 15 y una de US$ 90 pagan lo mismo.',
      'Ese mismo piso está redactado sobre el impuesto del envío, así que dividir una compra en tres paquetitos multiplica el mínimo en vez de ahorrarlo. Además consume tres de los tres envíos del año.',
      'Para un producto común la franquicia gana en la cuenta: 22% contra 60%. En compras de menos de US$ 33,33 empatan, porque los dos caminos caen en el mismo mínimo de US$ 20. La decisión real no es cuál elegir, es en qué compras del año gastar los 3 envíos y los US$ 800.',
      'El caveat que conviene tener presente: ni la FAQ del MEF ni la de la DNA mencionan el mínimo de US$ 20 al explicar la franquicia (sólo lo citan para el 60%), y no existe ningún ejemplo numérico oficial de una compra con franquicia que pague IVA. Cómo se liquida en la práctica no está publicado.',
      'El IVA de importación de un particular es definitivo: no se deduce ni se recupera. No es un costo que se descuente después de nada.',
      'Los tributos no son el costo total: sumá el flete, el cargo de gestión del Correo Uruguayo y el almacenamiento si el envío se demora, que lo paga el destinatario.',
      'No hace falta despachante: ninguna operación del régimen postal lo exige (Ley 20.446 art. 627 y Decreto 50/026 art. 17). Recién arriba del régimen postal la intervención del despachante pasa a ser la regla.',
      'Al 2026-08-15 el registro por única vez ante la DNA (identidad digital, sistema LUCIA KIT, RG DNA 10/2026) es voluntario.',
    ],
    faqs: [
      {
        q: 'Compré algo de US$ 50. ¿Cuánto pago?',
        a: 'Con franquicia, el IVA nominal es 22% sobre el valor de factura, o sea US$ 11. Pero el régimen postal fija un mínimo de US$ 20 por envío, así que ese es el número que corresponde según la ley. Con la prestación única pagarías 60% de US$ 50, o sea US$ 30. A ese monto la franquicia sale más barata. Tené presente que ninguna FAQ oficial publica un ejemplo numérico de una compra con franquicia pagando IVA.',
      },
      {
        q: '¿Me conviene siempre pedir la franquicia?',
        a: 'En pura aritmética el 22% es menos que el 60% en cualquier monto. Pero la franquicia es un recurso escaso, son 3 envíos y US$ 800 por año civil, y el cupo se imputa por fecha de desaduanamiento. Si comprás seguido, guardá la franquicia para las compras grandes y pagá la prestación única en las chicas: en compras de menos de US$ 33,33 los dos caminos terminan en el mismo mínimo de US$ 20.',
      },
      {
        q: 'Ya declaré el envío. ¿Puedo cambiar de régimen?',
        a: 'No hay norma ni FAQ oficial que resuelva si el régimen se puede cambiar después de presentada la declaración. La RG DNA 14/2026 le pide al declarante determinar el régimen aduanero aplicable al envío, y ahí termina lo publicado. Por eso conviene definirlo antes y dejarlo por escrito con el operador. Si el envío quedó retenido, esa misma resolución (num. 15 lit. k.iii) permite optar por un régimen especial y adjuntar la documentación que lo acredite.',
      },
      {
        q: '¿Cómo sé si lo que quiero comprar tiene algún permiso o está prohibido?',
        a: 'La única lista enumerada de mercadería prohibida que publica la DNA es del 26/04/2023 y cita un decreto ya derogado, así que no sirve como referencia. La página vigente del régimen 2026 publica organismos controladores en vez de una lista de prohibidos, y aclara que es orientativa y no taxativa. Lo práctico es mirar quién controla el producto: URSEC para radiofrecuencia, MSP para salud y cosmética, MGAP para lo agropecuario y alimentos, SMA para armas.',
      },
      {
        q: '¿Necesito despachante de aduana?',
        a: 'No. Ninguna operación del régimen de envíos postales exige despachante: lo dicen el art. 627 de la Ley 20.446 y el art. 17 del Decreto 50/026. Quien presenta la declaración ante la Aduana es el operador postal o el courier. Fuera del régimen postal, en el despacho formal, la intervención del despachante es la regla (CAROU art. 14) salvo siete casos taxativos del art. 15, entre ellos los envíos postales no comerciales.',
      },
      {
        q: '¿Qué pasa si me equivoco en el valor declarado?',
        a: 'Si se declara de menos, la Ley 20.446 art. 632 prevé una multa igual al doble de los tributos que debieron pagarse, y la reincidencia dentro de los 12 meses habilita la prohibición de operar en el régimen por 12 meses. Además se pierde la franquicia de esa operación (Decreto 50/026 art. 15). Un detalle poco intuitivo: esa operación no consume cupo. El valor a declarar es el total de la factura original con todos los conceptos que figuren adicionados en ella.',
      },
    ],
    sources: [
      {
        label: 'Ley 20.446 art. 627 (los dos regímenes postales)',
        url: 'https://www.impo.com.uy/bases/leyes/20446-2025/627',
        note: 'Franquicia exenta de aranceles con IVA liquidado; prestación única del 60% como opción del titular.',
      },
      {
        label: 'Ley 20.446 art. 633 (exclusión del IMESI)',
        url: 'https://www.impo.com.uy/bases/leyes/20446-2025/633',
        note: 'El régimen no se aplica en ningún caso a mercadería gravada por IMESI.',
      },
      {
        label: 'Decreto 50/026 (reglamento del régimen)',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
        note: 'Requisitos de la franquicia (art. 4), valor (art. 5), exclusiones (art. 7), plazos (art. 14), pérdida de la franquicia (art. 15), sin despachante (art. 17).',
      },
      {
        label: 'Título 10 T.O. 2023 art. 34 (tasas del IVA)',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/34_T10',
        note: 'Tasa básica del 22%, que es la que aplica por regla residual.',
      },
      {
        label: 'Título 10 T.O. 2023 art. 13 (base del IVA y mínimo postal)',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/13_T10',
        note: 'Inciso agregado por la Ley 20.446 art. 660: mínimo equivalente a US$ 20 en el régimen postal.',
      },
      {
        label: 'Ley 19.535 art. 265 (tasa consular)',
        url: 'https://www.impo.com.uy/bases/leyes/19535-2017/265',
        note: '5% sobre el valor en aduana, 3% con ACE N.º 18, exoneraciones taxativas.',
      },
      {
        label: 'RG DNA 11/2026',
        url: 'https://www.aduanas.gub.uy/innovaportal/file/28447/1/rg-11_2026.pdf',
        note: 'Num. 27 repite el mínimo de US$ 20 de IVA; num. 28 lit. c define los códigos de tipo de envío G, H y J.',
      },
      {
        label: 'DNA — preguntas frecuentes del régimen 2026',
        url: 'https://www.aduanas.gub.uy/innovaportal/v/28231/1/innova.front/',
        note: 'Cupo imputado por fecha de desaduanamiento; pérdida de la franquicia si paga un tercero.',
      },
      {
        label: 'Correo Uruguayo — cómo declarar su compra u obsequio',
        url: 'https://www.correo.com.uy/como-declarar-su-compra-u-obsequio',
        note: 'Formulario web del destinatario. Atención: al 03/08/2026 el paso 3 sigue publicando los topes derogados de US$ 50 y US$ 200 del Decreto 356/014 como condición de la franquicia.',
      },
    ],
    verifiedAt: '2026-08-15',
  },
]

/** Ficha por slug, o `undefined` si no existe. */
export function getImportCategory(slug: string): ImportCategory | undefined {
  return IMPORT_CATEGORIES.find(c => c.slug === slug)
}

/** Todos los slugs, en orden editorial. */
export function importCategorySlugs(): string[] {
  return IMPORT_CATEGORIES.map(c => c.slug)
}

/**
 * La ficha que corresponde a una categoría del calculador, si la hay. Varias categorías del
 * calculador pueden compartir ficha (cosméticos y perfumería viven en la misma página), así que
 * primero se busca por `productTypeId` y después por el `categorySlug` que declara el catálogo.
 */
export function categoryForProductType(productTypeId: string): ImportCategory | undefined {
  return (
    IMPORT_CATEGORIES.find(c => c.productTypeId === productTypeId) ??
    IMPORT_CATEGORIES.find(c => c.slug === productTypeSlug(productTypeId))
  )
}

/** El `categorySlug` declarado por una categoría del calculador. */
function productTypeSlug(productTypeId: string): string | undefined {
  return IMPORT_PRODUCT_TYPES.find(t => t.id === productTypeId)?.categorySlug
}
