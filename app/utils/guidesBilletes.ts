// Guías del billete físico: qué billete deteriorado se canjea, quién está obligado y qué pasa si
// no califica.
//
// POR QUÉ ESTA GUÍA. El BCU publica la pregunta en sus propias preguntas frecuentes («Se me rompió
// un billete, ¿dónde lo puedo cambiar?») y la contesta con una línea y un enlace a un ancla de otra
// página, donde el texto que decide —el artículo 57.1 del Libro VII de la Recopilación de Normas de
// Operaciones— está pegado entre circulares y antecedentes. El sitio ya cubre el efectivo por los
// dos lados que importan (`/retirar-efectivo-uruguay`, `/donde-conseguir-monedas-uruguay`,
// `/casas-de-cambio`) y le faltaba el caso del billete que se arruinó teniéndolo en la mano.
//
// LO QUE PONE AL LADO Y NO ESTÁ JUNTO EN NINGUNA OTRA PÁGINA:
//
//   1. El umbral que decide (más del 60 % en UNA sola pieza) con su alternativa, que casi nadie
//      cuenta: un billete en pedazos también se canjea si se reconstituye en su casi totalidad y la
//      numeración y las firmas prueban que las partes son del mismo ejemplar.
//   2. Quién está OBLIGADO. El artículo 57.1 pone el canje en cabeza de los Bancos. Una casa de
//      cambio es, para este Libro, una institución financiera NO bancaria (artículo 56.1), así que
//      ninguna norma del Libro VII le impone canjear; lo que sí le impone el artículo 58 es retener
//      el billete que no califica y darte un recibo.
//   3. Que el billete entintado por un sistema antirrobo NO tiene valor circulatorio (artículo
//      57 bis) y que, presentado por una persona, NO se reemplaza (artículo 58 bis, literal b).
//   4. Que si el billete queda retenido por dudosa autenticidad y la pericia dice que es auténtico,
//      el importe se devuelve (artículo 59.2).
//   5. Que la Recopilación NO prevé un canje de billetes de dólares deteriorados: su Parte Segunda
//      sólo regula el depósito en el BCU y la retención del de dudosa autenticidad.
//
// TODO SALE DE DOCUMENTOS PUBLICADOS, leídos el 2026-11-24 y listados con su URL en `sources`.
// Ni una cifra estimada: el 60 % es el del artículo 57.1, los tres ejemplares del recibo y las dos
// fechas mensuales son los de los artículos 58 y 59.2, y el horario de la caja del BCU es el que su
// propio sitio publicaba ese día.
//
// LO QUE NO SE PUBLICA A PROPÓSITO, porque no está en ninguna norma ni en ninguna página oficial
// legible hoy: cuánto tarda el banco en devolver la plata de un billete retenido; si cobra algo por
// el canje; qué pasa con el tenedor de un billete que no llega al umbral (la norma dice que se
// retiene y se entrega al BCU, no cómo termina para él); qué elementos de seguridad tiene cada
// billete (el enlace que el propio BCU ofrece para eso devolvía «File Not Found» el 2026-11-24); y
// si los billetes de nuevos pesos anteriores a 1993 se siguen canjeando.
import type { Guide } from './guides'

/**
 * El umbral del artículo 57.1 literal a), en por ciento de la superficie del billete completo, en
 * UNA sola pieza.
 *
 * Vive en una constante y no sólo escrito en la prosa porque es la cifra que viaja al título y a la
 * descripción, o sea a los dos renglones que el lector ve en Google:
 * `tests/unit/guiaBilleteRoto.test.ts` ata los tres a este número para que una circular que lo
 * mueva no deje el snippet publicando el viejo.
 */
export const BILLETE_UMBRAL_PIEZA = 60

/** La fecha en que se leyeron las cuatro fuentes. Una cifra vale con su fecha, no sola. */
export const BILLETES_LEIDO_EL = '2026-11-24'

export const billetesGuides: readonly Guide[] = [
  {
    slug: 'billete-roto-o-manchado-uruguay',
    title: `Billete roto: se canjea arriba del ${BILLETE_UMBRAL_PIEZA} %`,
    description:
      'El banco debe canjearlo si una sola pieza pasa el 60 % del billete, o si los trozos se reconstruyen con igual numeración y firmas. El entintado, no.',
    tag: 'EFECTIVO',
    updatedAt: BILLETES_LEIDO_EL,
    sections: [
      {
        heading: 'La norma mira el pedazo que queda, no el que falta',
        body: 'El Libro VII de la Recopilación de Normas de Operaciones del Banco Central del Uruguay separa dos cosas que suelen confundirse. Billete deteriorado es, por el artículo 57, todo billete legítimo cuya superficie esté alterada, salvo el entintado, que tiene régimen propio. Y billete deteriorado a efectos del canje —el que un banco tiene que cambiarte— es, por el artículo 57.1, el dividido, perforado, escrito, borrado, manchado, descolorido, sucio, quemado o cercenado que además cumpla una de dos condiciones: que su superficie alcance, en una sola pieza, más del 60 % del billete completo, o que habiendo sido dividido o fragmentado pueda reconstituirse en su casi totalidad de forma que se evidencie que el conjunto de las partes pertenece al mismo ejemplar. Para eso se tienen en cuenta numeraciones y firmas, así que si el billete se partió, llevá todos los trozos y sobre todo los que tienen el número de serie.',
        table: {
          headers: ['Cómo está el billete', '¿Entra en el canje obligatorio?', 'Artículo'],
          rows: [
            [
              'Una sola pieza con más del 60 % de la superficie',
              'Sí, aunque esté escrito, manchado, quemado o sucio',
              '57.1 a)',
            ],
            [
              'En pedazos, reconstituible en su casi totalidad',
              'Sí, si la numeración y las firmas muestran que son del mismo billete',
              '57.1 b)',
            ],
            [
              'Una sola pieza con el 60 % o menos, sin los demás trozos',
              'No: se retiene con recibo y se entrega al BCU',
              '58',
            ],
            [
              'Manchado por la tinta de un sistema antirrobo',
              'No: no tiene valor circulatorio y no se reemplaza a una persona',
              '57 bis y 58 bis b)',
            ],
          ],
        },
      },
      {
        heading: 'El banco está obligado; la casa de cambio, no',
        body: 'Esta es la parte que más importa si tenés el billete en la mano y la que no está escrita de corrido en ninguna página oficial. El artículo 57.1 define el billete deteriorado «a los efectos de su canje o renovación obligatoria por parte de los Bancos»: si el billete cumple el literal a) o el b), el canje es obligatorio para un banco, y la norma no exige que sea tu banco ni que tengas cuenta. Una casa de cambio, en cambio, es para este mismo Libro una institución financiera no bancaria, en la misma lista que las cooperativas de intermediación financiera, las casas financieras, las administradoras de crédito, las empresas de servicios financieros y las de transferencia de fondos (artículo 56.1). Ninguno de sus artículos le impone el canje: puede aceptarlo por decisión propia. Lo que sí le impone el artículo 58, igual que a un banco, es retener el billete que no califica y extenderte un recibo. El propio BCU resume el destino en sus preguntas frecuentes: los billetes deteriorados que cumplan los requisitos pueden canjearse en los bancos del sistema financiero o en el Banco Central del Uruguay.',
        links: [
          { label: 'Las casas de cambio de Uruguay', to: '/casas-de-cambio' },
          { label: 'Sucursales y horarios', to: '/sucursales' },
        ],
      },
      {
        heading: 'Si no califica: el recibo que te tienen que dar',
        body: 'Un billete que no llega al umbral no se te devuelve ni se descarta: queda retenido, y el artículo 58 escribe qué tiene que decir el papel que te entregan. Como mínimo, fecha de la presentación, nombre, domicilio y documento de identidad o RUT del tenedor, serie y número del billete cuando sea posible, y nombre y firma del funcionario que hace el procedimiento, más la constancia de que se retuvo por entenderse que no cumple los requisitos mínimos para circular. Se firman tres ejemplares: uno es para vos, otro queda en la institución y el tercero viaja con el billete al Departamento de Tesoro del Banco Central, en fechas que ese Departamento establece. Lo que la norma no dice es cómo termina eso para el tenedor: el artículo 58 describe la retención, el recibo y la entrega, y no fija plazo ni resultado. El único caso con devolución escrita es el del billete retenido por dudosa autenticidad que la pericia declara auténtico.',
      },
      {
        heading: 'El billete entintado no se cambia (y no te lo pueden exigir)',
        body: 'Los bancos pueden usar sistemas antirrobo que neutralizan los billetes manchándolos con tinta, en cajeros y en transportes de valores. El artículo 57 bis define ese billete entintado como el billete legítimo cuya superficie está manchada por el uso de ese sistema, y dice que no tiene valor circulatorio, por lo que pierde su poder cancelatorio de obligaciones: nadie está obligado a aceptarlo como pago. El artículo 58 bis separa quién puede recuperarlo. Un Banco que los presenta ante el BCU sí obtiene el reemplazo por billetes con pleno valor circulatorio, previa verificación y siempre que acompañe copia de la denuncia del hecho delictivo con el detalle de billetes por denominación. Pero los billetes entintados presentados por personas físicas o jurídicas, tanto en la sede del BCU como en cualquier institución financiera, se retienen con el procedimiento del artículo 58 y la norma dice expresamente que no serán reemplazados. Si alguien te quiere pagar con un billete manchado de tinta, eso es todo lo que hay que saber.',
      },
      {
        heading: 'Si sospechan que es falso, ahí sí hay devolución escrita',
        body: 'Un billete que el cajero mira dos veces entra en otro título del Libro VII, el de la retención de billetes de dudosa autenticidad o alterados intencionalmente. En el momento, la institución lo retiene y extiende un recibo con fecha, nombre, domicilio y documento o RUT, fecha de emisión, valor, serie y número cuando corresponda, y nombre y firma del funcionario, dejando constancia del motivo; también acá se firman tres ejemplares y uno es para vos. Después, el billete se denuncia y se entrega al Departamento de Tesoro del BCU, para lo cual las instituciones disponen de dos fechas mensuales, así que la respuesta no es inmediata. El artículo 59.2 resuelve el final: si la pericia arroja la falsedad del billete, el Banco Central da cuenta a la autoridad correspondiente, y en caso de que el billete resulte auténtico se devuelve el importe, acreditándolo en cuenta o en forma personal bajo recibo. Billete alterado intencionalmente, por su parte, es el billete auténtico al que le quitaron alguna seguridad y que sigue manteniendo las condiciones para ser canjeado.',
        links: [{ label: 'Estafas frecuentes en Uruguay', to: '/estafas-uruguay' }],
      },
      {
        heading: 'Tres billetes que parecen falsos y no lo son',
        body: 'El propio BCU desarma dos sospechas habituales en sus preguntas frecuentes. Una numeración que empieza con un asterisco o una estrella corresponde a una reposición: si durante la impresión la firma encargada detecta errores en un billete, lo repone colocando otro en su lugar con esa marca en la numeración, y hay casos equivalentes con una Z delante del número; esos billetes son válidos. Y una marca de agua sin la cara de Artigas tampoco es una señal de falsificación: las emisiones nuevas cambiaron el diseño y en la marca de agua va la imagen del mismo personaje homenajeado en el billete, cosa que la ficha de cada serie del BCU anota billete por billete. La tercera creencia es la que esta guía desarma sola: que un billete al que le falta un pedazo chico ya no lo toman. La norma no mira el pedazo que falta sino el que queda, y alcanza con que una sola pieza pase el 60 % del billete completo.',
      },
      {
        heading: 'Y si el billete roto es un dólar',
        body: 'La Parte Segunda del Libro VII es la de los billetes en dólares americanos y tiene dos títulos: el depósito de dólares en el Banco Central y la retención del billete de dudosa autenticidad. No hay un tercero. No define el billete en dólares deteriorado ni impone su canje —la palabra «deteriorado» no aparece en ninguno de sus artículos—, así que qué hace un banco o una casa de cambio con un dólar roto queda de su lado y conviene preguntarlo antes de ir. Para el dólar de dudosa autenticidad, en cambio, el procedimiento es el espejo del de pesos: retención con recibo que incluye además el país emisor, la fecha de emisión y el valor de la moneda, tres ejemplares, denuncia ante el BCU y entrega al Departamento de Tesoro en dos fechas mensuales. Una aclaración aparte, porque es de la misma norma y sorprende: el BCU sólo recibe depósitos en dólares en billetes de U$S 100, salvo que pida expresamente otra denominación.',
        links: [
          {
            label: 'Dólares deteriorados: por qué te pagan menos',
            to: '/guias/dolares-deteriorados-billetes-rechazados-uruguay',
          },
        ],
      },
      {
        heading: 'Dónde llevarlo, y un dato de horario que cambia el viaje',
        body: 'El camino normal es un banco del sistema financiero, que es el único con canje obligatorio escrito. El Banco Central del Uruguay también se nombra a sí mismo como lugar de canje, y ahí conviene mirar el reloj antes de salir: su sede está en Diagonal Fabini 777, Montevideo, y su sitio publicaba el 24 de noviembre de 2026 atención al público de lunes a viernes de 12 a 16 horas, pero caja de atención al público sólo los jueves de 12 a 16. Para un canje en mano, entonces, el día es el jueves. Una casa de cambio puede aceptarlo y no está obligada. Y un último recordatorio que vive en el mismo Libro: el artículo 56.2 prohíbe expresamente el deterioro intencional de los billetes de moneda nacional de curso legal, así que nada de ayudar a que el billete llegue al umbral.',
      },
    ],
    faqs: [
      {
        q: '¿Cuánto tiene que quedar de un billete roto para que lo canjeen?',
        a: 'Más del 60 % del billete completo en una sola pieza. Así lo define el literal a) del artículo 57.1 de la Recopilación de Normas de Operaciones del Banco Central del Uruguay, que es el que obliga a los Bancos a canjearlo.',
      },
      {
        q: 'Se me rompió el billete en varios pedazos, ¿sirve igual?',
        a: 'Sí, si puede reconstituirse en su casi totalidad de forma que se evidencie que las partes pertenecen al mismo ejemplar; se tienen en cuenta numeraciones y firmas (artículo 57.1, literal b). Llevá todos los trozos, sobre todo los que tienen el número de serie.',
      },
      {
        q: '¿Dónde cambio un billete deteriorado en Uruguay?',
        a: 'En los bancos del sistema financiero o en el propio Banco Central del Uruguay, según sus preguntas frecuentes. Una casa de cambio puede aceptarlo pero no está obligada: el canje obligatorio del artículo 57.1 está escrito para los Bancos.',
      },
      {
        q: 'Me dieron un billete manchado con tinta de un cajero, ¿me lo cambian?',
        a: 'No. El billete entintado por un sistema antirrobo no tiene valor circulatorio (artículo 57 bis) y, presentado por una persona física o jurídica, se retiene y no se reemplaza (artículo 58 bis, literal b). Sólo se reemplaza el que presenta un Banco con copia de la denuncia del delito.',
      },
      {
        q: 'El banco se quedó con mi billete, ¿qué me tiene que dar?',
        a: 'Un recibo con fecha de la presentación, tu nombre, domicilio y documento o RUT, la serie y el número del billete cuando sea posible, y el nombre y la firma del funcionario, más la constancia de que se retuvo por no cumplir los requisitos para circular. Se firman tres ejemplares y uno es para vos (artículo 58).',
      },
      {
        q: 'Retuvieron mi billete por sospechar que era falso y era auténtico, ¿pierdo la plata?',
        a: 'No. El artículo 59.2 dice que si el billete resulta auténtico se devuelve el importe, acreditándolo en cuenta o en forma personal bajo recibo. Las instituciones entregan los billetes retenidos al Departamento de Tesoro del BCU en dos fechas mensuales, así que la pericia lleva su tiempo.',
      },
      {
        q: '¿Y si el billete roto es un dólar?',
        a: 'La Recopilación no prevé el canje de billetes en dólares deteriorados: su Parte Segunda sólo regula el depósito de dólares en el BCU y la retención del billete de dudosa autenticidad. Qué hace un banco o una casa de cambio con un dólar roto queda de su lado; conviene preguntarlo antes de ir.',
      },
      {
        q: '¿Cobran algo por canjear un billete deteriorado?',
        a: 'Ninguna de las normas leídas fija un precio, un tope ni una comisión por el canje, y tampoco dice que sea gratis: el Libro VII regula la clasificación, el canje y la retención, no un arancel. Es un dato que no está publicado y conviene preguntarlo en la ventanilla.',
      },
    ],
    sources: [
      {
        label:
          'Recopilación de Normas de Operaciones, Libro VII — Régimen aplicable a billetes de banco (artículos 56 a 62.4), leído el 24 de noviembre de 2026',
        url: 'https://www.bcu.gub.uy/Acerca-de-BCU/Normativa/Documents/Recopilacion-de-Normas/Operaciones/libro7.pdf',
        publisher: 'Banco Central del Uruguay',
      },
      {
        label:
          'Billetes — Normas sobre billetes deteriorados en pesos uruguayos (artículos 57.1, 58 y 58 bis, Circular 2341 de 29/01/2020)',
        url: 'https://www.bcu.gub.uy/Billetes-Monedas/Paginas/Billetes.aspx#normas-billetes-deteriorados',
        publisher: 'Banco Central del Uruguay',
      },
      {
        label:
          'Billetes y monedas — Preguntas frecuentes: dónde se canjean, la numeración con asterisco y la marca de agua',
        url: 'https://subsitio.bcu.gub.uy/billetes-y-monedas/',
        publisher: 'Banco Central del Uruguay',
      },
      {
        label: 'Billetes en circulación, serie por serie, con las novedades de diseño de cada una',
        url: 'https://subsitio.bcu.gub.uy/billetes/',
        publisher: 'Banco Central del Uruguay',
      },
    ],
    related: [
      { label: 'Dónde conseguir monedas', to: '/donde-conseguir-monedas-uruguay' },
      { label: 'Retirar efectivo en Uruguay', to: '/retirar-efectivo-uruguay' },
      { label: 'El límite de pagos en efectivo', to: '/limite-de-efectivo-uruguay' },
      { label: '¿Banco o casa de cambio?', to: '/banco-o-casa-de-cambio-uruguay' },
    ],
  },
]
