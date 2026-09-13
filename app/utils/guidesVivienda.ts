// Guías de vivienda minadas de Reddit: comisión inmobiliaria (hilos 1qpd9yg, 1ti2vtm y 1q2e8us de
// r/uruguay), comprar en remate (1tzj94f), derechos posesorios (1rem79k y 1uutyjm de r/LegalUruguay)
// y el Certificado Único Departamental (1svi2jr). Todo verificado el 2026-09-13 contra: arancel de la
// CIU (septiembre de 2007) y de CIPEM (2023/2025); Código de Comercio art. 112; Ley 20.380 art. 5;
// DGI (IVA 22 %); Ley 19.574 art. 13 (red. Ley 20.469); CGP arts. 387 y 390; Decreto-Ley 15.508;
// página y edicto de remates de la ANV; Acordada SCJ 7.883 (circular 150/2016); Código Civil arts.
// 1204, 1206 y 1211 y Ley 19.889 art. 467; Título 19 del TO 2023 (ITP); Leyes 19.355 art. 247, 16.871
// art. 17 y 17.930 art. 487; Decreto 502/007; fichas del CUD de Montevideo, Canelones y Maldonado.
import type { Guide } from './guides'

export const viviendaGuides: readonly Guide[] = [
  {
    slug: 'comision-inmobiliaria-uruguay',
    title: 'Comisión inmobiliaria en Uruguay: cuánto cobran y quién paga',
    description:
      'No hay tope legal: el 3 % más IVA a cada parte en la venta y un mes de alquiler más IVA sale del arancel de la Cámara Inmobiliaria. Quién paga y qué pasa si se cae.',
    tag: 'COMISIÓN',
    updatedAt: '2026-09-13',
    sections: [
      {
        heading: '¿Hay un tope legal para la comisión inmobiliaria?',
        body: 'No. Ninguna ley fija cuánto cobra una inmobiliaria en Uruguay, y lo que se repite como si fuera norma —el 3 % más IVA en la venta, un mes más IVA en el alquiler— sale de un documento privado: el Arancel Oficial de la Cámara Inmobiliaria Uruguaya, fechado en septiembre de 2007. El propio texto se define como "arancel mínimo" y dice que su incumplimiento lo sanciona la Comisión de Ética de la Cámara, o sea que ordena a sus socios, no a vos. La Ley 20.380, de 2024, que regula a los operadores inmobiliarios, les reconoce "el cobro de sus honorarios", pero no fija montos ni dice quién los paga. La única regla legal sobre quién paga está en el Código de Comercio, en el capítulo de los corredores: el artículo 112 dice que todo derecho de corretaje, "no mediando estipulación en contrario, será pagado proporcionalmente por las partes". Es una regla supletoria, que rige sólo si no se pactó otra cosa. Por eso la pregunta útil no es cuánto permite la ley, sino qué dice el papel que te hacen firmar antes de la visita, la reserva o el contrato, porque eso es lo que después se puede reclamar.',
      },
      {
        heading: 'Cuánto cobra la inmobiliaria cuando vendés o comprás',
        body: 'El artículo 1 del arancel de la Cámara fija el 3 % sobre el precio total de la venta a cada parte, vendedora y compradora, y el artículo 12 obliga a sumarle el IVA. Con la tasa básica del 22 %, cada parte paga el 3,66 % del precio: en una venta de 150.000 dólares son 5.490 dólares para el comprador y otros tantos para el vendedor. En Maldonado y Punta del Este la cámara local publica el mismo orden de magnitud con otra presentación: 4 % a cada parte, que es 3,28 % de arancel más IVA, según su tabla 2023/2025, que seguía publicada en septiembre de 2026. El arancel de la Cámara prevé además dos rebajas que casi nadie pide: si vendés y comprás con la misma inmobiliaria dentro de noventa días, la operación menor admite hasta 50 % de bonificación, y cuando el vendedor es la empresa promotora de un edificio, a esa parte se le puede rebajar hasta la mitad. Esta comisión va aparte de los honorarios del escribano y del ITP, que se liquidan en la escritura.',
        links: [{ label: 'Costos de escrituración', to: '/guias/costos-de-escrituracion-uruguay' }],
      },
      {
        heading: 'Cuánto cobran por alquilar, y por qué al dueño a veces no',
        body: 'Para los contratos de un año o más en régimen de libre contratación, el artículo 6 del arancel fija "un mes de alquiler a cada parte", con una salvedad que explica mucho de lo que se discute en los foros: al arrendador, es decir al dueño, se le puede bonificar hasta el 50 %. Al inquilino el arancel no le prevé ninguna rebaja. Si el contrato es por menos de un año se cobra a prorrata, y en los alquileres de temporada de hasta cinco meses la comisión es el 8 % del monto total del contrato a cada parte, con la redacción del contrato incluida. Todo eso lleva IVA, así que el mes de comisión es en realidad 1,22 alquileres: sobre un alquiler de 25.000 pesos, son 30.500 pesos. Que el dueño no pague nada no sale del arancel, que como mínimo le cobraría la mitad, sino de la competencia entre inmobiliarias por conseguir la propiedad para publicarla. Las renovaciones se cobran igual, con rebaja de hasta 50 % para cada parte.',
        table: {
          headers: ['Operación', 'Arancel de la Cámara (septiembre de 2007)', 'Con IVA del 22 %'],
          rows: [
            ['Venta, a cada parte', '3 % del precio total', '3,66 % del precio'],
            [
              'Alquiler de un año o más',
              'Un mes de alquiler a cada parte; al dueño, rebaja de hasta 50 %',
              '1,22 meses de alquiler',
            ],
            ['Alquiler de menos de un año', 'El mes, a prorrata del plazo', 'La prorrata más IVA'],
            [
              'Temporada, hasta cinco meses',
              '8 % del monto del contrato a cada parte',
              '9,76 % del contrato',
            ],
            [
              'Renovación',
              'Como el alquiler, con rebaja de hasta 50 % a cada parte',
              'Según lo que se rebaje',
            ],
          ],
        },
        links: [
          { label: 'Comparar portales de alquiler', to: '/comparar-portales-de-alquiler-uruguay' },
        ],
      },
      {
        heading: 'El IVA no aparece por pedir factura',
        body: 'Una queja frecuente es que la inmobiliaria cotiza la comisión "limpia" y, cuando pedís factura, te agrega el IVA como si fuera un recargo por exigir el comprobante. No funciona así. La DGI lo resume en una línea: todos los bienes y servicios están gravados a la tasa básica del 22 %, salvo que estén exonerados o gravados a la tasa mínima del 10 %. Y el propio arancel de la Cámara dice que a sus montos "deberá adicionarse el impuesto al valor agregado, de acuerdo con las tasas vigentes". O sea que el precio real de la comisión es con IVA desde el principio, y así conviene compararla entre inmobiliarias. Si te ofrecen un descuento a cambio de no documentar el pago, lo que estás aceptando es quedarte sin constancia de lo que pagaste, justo en el tipo de operación donde más la vas a necesitar si después hay un reclamo por el depósito, por la garantía o por una comisión cobrada dos veces.',
      },
      {
        heading: 'Cuándo te la cobran y qué pasa si la operación se cae',
        body: 'Esta es la parte que el arancel de la Cámara no resuelve: no dice en qué momento se gana la comisión ni qué pasa si la venta o el alquiler no se concretan, y la regla del Código de Comercio sólo reparte el corretaje entre las partes cuando no se pactó otra cosa. Lo que decide es el documento que firmaste: la autorización de venta si sos el dueño, el boleto de reserva o la promesa si comprás, el contrato si alquilás. Ahí tiene que decir si la comisión se paga al firmar la promesa o al escriturar, si se devuelve cuando el estudio de título encuentra un problema y si hay exclusividad. Leé esa cláusula antes de entregar plata, no después, y si no está, pedí que la agreguen por escrito. Y si ya estás alquilando y te querés ir antes de tiempo, lo que te pueden cobrar sale del contrato de arrendamiento, no del arancel.',
        links: [
          { label: 'Promesa de compraventa y seña', to: '/guias/promesa-de-compraventa-uruguay' },
          {
            label: 'Rescindir un contrato de alquiler',
            to: '/guias/como-rescindir-contrato-alquiler-uruguay',
          },
        ],
      },
      {
        heading: 'Por qué te piden la cédula y el origen de la plata',
        body: 'Cuando la inmobiliaria interviene en una compraventa no es sólo un intermediario comercial. El artículo 13 de la Ley 19.574, en el texto que le dio la Ley 20.469 de 2026, incluye a las inmobiliarias, a los promotores inmobiliarios, a las empresas constructoras y a los demás intermediarios en transacciones que involucren inmuebles, salvo los arrendamientos, entre los sujetos obligados del sistema contra el lavado de activos, y los obliga a reportar a la Unidad de Información y Análisis Financiero del Banco Central las operaciones inusuales o sospechosas. Por eso te piden documentos y te pueden hacer firmar una declaración sobre el origen de los fondos: no es desconfianza personal ni un trámite que se invente la empresa. Lo mismo te va a pasar con el escribano, que está alcanzado por la misma ley cuando interviene en operaciones inmobiliarias. Conviene tener a mano los comprobantes de dónde sale la plata antes de firmar la reserva, para que la operación no se demore en el último paso.',
      },
      {
        heading: 'Cómo negociarla antes de que sea tarde',
        body: 'Como el arancel es de la Cámara y no de la ley, la comisión se negocia, y el momento para hacerlo es antes de la visita. Una vez que conociste la propiedad a través de una inmobiliaria, tratar directo con el dueño para evitarla es exactamente el conflicto que la comisión existe para cubrir, y la discusión se vuelve mucho más difícil. Pedí por escrito el porcentaje o el monto, si incluye IVA, a quién se le cobra y en qué momento. Si alquilás, preguntá si el dueño también paga: el arancel prevé que pague por lo menos la mitad de lo que pagás vos. Buscar el mismo inmueble publicado por su dueño es legítimo, pero hacelo antes de ir a verlo con un agente. Y hacé la cuenta del costo total de entrada, porque la comisión se suma a la garantía, al primer mes y muchas veces a un depósito.',
        links: [{ label: 'Garantías de alquiler', to: '/guias/garantias-de-alquiler-uruguay' }],
      },
    ],
    faqs: [
      {
        q: '¿Es legal que la inmobiliaria le cobre la comisión al inquilino y no al dueño?',
        a: 'Sí: ninguna ley fija quién la paga. El Código de Comercio sólo dice que, si no se pactó otra cosa, el corretaje se reparte proporcionalmente entre las partes (art. 112), y el arancel de la Cámara Inmobiliaria prevé un mes a cada parte con rebaja de hasta 50 % para el dueño. Que el dueño no pague nada es una decisión comercial de la inmobiliaria.',
      },
      {
        q: '¿La comisión del 3 % es más IVA?',
        a: 'Sí. El arancel de la Cámara Inmobiliaria Uruguaya dice que a sus montos se les suma el IVA, y la tasa básica es del 22 %. En la práctica, cada parte paga el 3,66 % del precio de venta.',
      },
      {
        q: '¿Cuánto cobra una inmobiliaria por alquilar un apartamento?',
        a: 'Según el arancel de la Cámara Inmobiliaria (septiembre de 2007), un mes de alquiler a cada parte en contratos de un año o más, más IVA: 1,22 alquileres. En temporada de hasta cinco meses, el 8 % del contrato a cada parte, más IVA.',
      },
      {
        q: '¿Hay un máximo legal para la comisión inmobiliaria?',
        a: 'No. El número de referencia sale de un arancel privado que la propia Cámara Inmobiliaria llama "arancel mínimo" y que obliga a sus socios. La comisión se negocia, y lo que vale es lo que firmes.',
      },
      {
        q: '¿Me devuelven la comisión si la compra no se concreta?',
        a: 'Depende del documento que firmaste, porque el arancel de la Cámara no regula ese caso. Revisá en el boleto de reserva o en la promesa cuándo se devenga la comisión y si se reintegra cuando el estudio de título encuentra un problema.',
      },
      {
        q: '¿Por qué la inmobiliaria me pide justificar de dónde saqué la plata?',
        a: 'Porque en las compraventas es sujeto obligado del sistema contra el lavado de activos (art. 13 de la Ley 19.574) y tiene que reportar las operaciones inusuales o sospechosas al Banco Central. El escribano te va a pedir lo mismo.',
      },
    ],
    related: [
      { label: 'Inmobiliarias de Uruguay', to: '/inmobiliarias-uruguay' },
      { label: 'Costos de escrituración', to: '/guias/costos-de-escrituracion-uruguay' },
      { label: 'Primer alquiler', to: '/primer-alquiler-uruguay' },
    ],
    sources: [
      {
        label:
          'Arancel Oficial (septiembre de 2007) — ventas: "el 3% (tres por ciento) sobre el precio total de la venta, a cada parte"; alquiler de un año o más: "un mes de alquiler a cada parte, pudiéndose bonificar al arrendador hasta en un 50%"; temporada: 8 % a cada parte; es un "arancel mínimo" al que "deberá adicionarse el impuesto al valor agregado"',
        url: 'https://ciu.org.uy/wp-content/uploads/2024/05/7_Arancel-Oficial_180907.pdf',
        publisher: 'Cámara Inmobiliaria Uruguaya',
      },
      {
        label:
          'Ley 20.380 (2024) art. 5 — entre los derechos de los operadores inmobiliarios matriculados, literal C: "El cobro de sus honorarios"; el artículo no fija montos ni dice a cargo de quién van',
        url: 'https://www.impo.com.uy/bases/leyes/20380-2024/5',
        publisher: 'IMPO',
      },
      {
        label:
          'Aranceles 2023/2025 — ventas: "4% (Arancel 3,28% + IVA)" a cada parte; temporada: "10% (Arancel 8,2% + IVA)"',
        url: 'https://cipem.org.uy/servicios/aranceles/',
        publisher: 'Cámara Inmobiliaria de Punta del Este y Maldonado',
      },
      {
        label:
          'Código de Comercio art. 112 — "Todo derecho de corretaje, no mediando estipulación en contrario, será pagado proporcionalmente por las partes"',
        url: 'https://www.impo.com.uy/bases/codigo-comercio/817-1865/112',
        publisher: 'IMPO',
      },
      {
        label:
          'Tasa básica de IVA (publicación del 18/06/2024) — "todos los bienes y servicios están gravados a la tasa básica del 22%, salvo que estén exonerados o que se encuentren gravados a la tasa mínima del 10%"',
        url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/son-bienes-servicios-gravados-tasa-basica-del-22',
        publisher: 'DGI',
      },
      {
        label:
          'Ley 19.574 art. 13 (red. Ley 20.469, 2026) — las inmobiliarias, promotores, constructoras "y otros intermediarios en transacciones que involucren inmuebles, con excepción de los arrendamientos" son sujetos obligados del sistema contra el lavado de activos y reportan las operaciones inusuales o sospechosas a la UIAF del Banco Central',
        url: 'https://www.impo.com.uy/bases/leyes/19574-2017/13',
        publisher: 'IMPO',
      },
    ],
  },
  {
    slug: 'comprar-en-remate-uruguay',
    title: 'Comprar una casa en remate en Uruguay: cómo funciona',
    description:
      'Remate judicial o de la ANV: seña, comisión del rematador, plazos para pagar el saldo, qué deudas del inmueble pagás vos y qué pasa si la casa está ocupada.',
    tag: 'REMATE',
    updatedAt: '2026-09-13',
    sections: [
      {
        heading: 'Judicial o de la ANV: dos remates con reglas distintas',
        body: 'Casi todo lo que se remata en Uruguay entra por una de dos puertas. El remate judicial lo ordena un juzgado dentro de una ejecución —un banco, una intendencia o cualquier acreedor que ejecuta una deuda— y sus reglas están en el Código General del Proceso. El remate extrajudicial que más ve un particular es el de la Agencia Nacional de Vivienda: vende sin pasar por un juez viviendas de la cartera hipotecaria que administra, al amparo de los artículos 80 y 81 de la Carta Orgánica del BHU, por remisión de la Ley 18.125, que es lo que citan sus propios edictos. En los dos casos el martillo lo baja un rematador, y eso sí tiene ley propia: el Decreto-Ley 15.508 exige estar inscripto en la matrícula del Registro Nacional de Rematadores, obliga a rematar personalmente y en voz alta, y le prohíbe comprar los bienes que remata. Antes de mirar precios, averiguá cuál de los dos es, porque cambian la seña, la comisión, los plazos y quién se hace cargo de las deudas.',
      },
      {
        heading: 'Cómo funciona un remate judicial: seña, saldo y escritura',
        body: 'El artículo 387 del CGP ordena publicar el remate en el Diario Oficial, en la plataforma del Poder Judicial y en un diario de la zona, y el aviso tiene que decir que se remata "sin base y al mejor postor": no hay un precio mínimo garantizado. En el acto, el mejor postor deposita una seña que fija el tribunal y que no puede ser menor al 10 % de su oferta. El saldo se paga dentro de los veinte días corridos siguientes a la notificación del auto que aprueba el remate, un plazo que no se corta por la feria judicial ni por la Semana de Turismo, y la escritura se firma en treinta días con el escribano designado. La comisión del rematador la fija la Suprema Corte en la Acordada 7.883 de 2016: 3 % a cargo del comprador y 1 % a cargo del vendedor en inmuebles, sobre el valor obtenido. Si no depositás el saldo o no escriturás, el artículo 390 es tajante: "se tendrá por no hecha la oferta y perderá la seña", y se llama al segundo postor. La misma norma cierra otra puerta: no podés negarte a escriturar "alegando defectos de titulación anteriores al remate". Por eso el título se estudia antes de levantar la mano.',
      },
      {
        heading: 'Cómo funciona un remate de la ANV',
        body: 'La ANV publica sus remates en el Diario Oficial y en su sitio, con estas condiciones a septiembre de 2026: la base es el 50 % del valor de tasación, la seña es el 5 % de la oferta y la comisión del rematador es el 1 % más IVA, bastante menos que en un remate judicial. En el acto se paga además una suma por gastos de remate que figura en el edicto y que no forma parte del precio, y si el remate es en el interior la ANV avisa que se suma otro 1 % por las Leyes 12.700 y 16.694. Los plazos los fija cada edicto, que la propia ANV llama la referencia obligatoria: su página dice que el plazo para el saldo por lo general es de cinco días hábiles, y el edicto de abril de 2026 daba diez días desde la aprobación del remate para el saldo y diez desde el aviso de la ANV para escriturar, con los pagos del acto a acreditar en 72 horas hábiles bajo pena de multa. Se puede financiar en unidades indexadas hasta el tope del edicto, sólo para el mejor postor. No pueden ofertar los funcionarios de la ANV, sus cónyuges ni quien tenga un crédito vigente en el sistema público de vivienda.',
        table: {
          headers: ['Punto', 'Remate judicial', 'Remate de la ANV'],
          rows: [
            ['Base', 'Sin base, al mejor postor', '50 % del valor de tasación'],
            [
              'Seña en el acto',
              'La fija el tribunal, no menos del 10 % de la oferta',
              '5 % de la oferta',
            ],
            [
              'Comisión a cargo del comprador',
              '3 % del valor obtenido (Acordada 7.883 de 2016)',
              '1 % de la oferta más IVA; en el interior, otro 1 % por ley',
            ],
            [
              'Saldo del precio',
              '20 días corridos desde la notificación de la aprobación',
              'El que fije el edicto: por lo general, cinco días hábiles; diez días en el de abril de 2026',
            ],
            [
              'Escritura',
              'En 30 días, con el escribano designado',
              'El que fije el edicto: diez días desde el aviso de la ANV en el de abril de 2026',
            ],
            [
              'Dónde se publica',
              'Diario Oficial, plataforma del Poder Judicial y un diario local',
              'Diario Oficial y sitio de la ANV',
            ],
          ],
        },
      },
      {
        heading: 'Qué deudas del inmueble pasan a ser tuyas',
        body: 'Es la pregunta que más plata cuesta si se contesta mal. En los remates de la ANV en Montevideo la regla está escrita, pero no es un regalo: por lo general, la contribución inmobiliaria, los tributos de cobro conjunto y el Impuesto de Primaria adeudados están incluidos en los gastos de remate, que pagás en el acto aparte del precio, y la ANV se encarga de cancelarlos; en otros departamentos, avisa la propia agencia, el procedimiento puede variar. El edicto de abril de 2026 precisa que se hace cargo del pago, hasta la fecha del remate y "exclusivamente", de la Tasa General Municipal, la Contribución Inmobiliaria, la Tarifa de Saneamiento y el Impuesto de Primaria. Todo lo demás que se deba al escriturar —consumos, cargas del inmueble, conexión al saneamiento— corre por cuenta del comprador, y la ANV aclara que la deuda de gastos comunes también es de cargo del comprador, así que hay que pedirla a la administración del edificio antes de ofertar. En un remate judicial no hay una respuesta única: el edicto dice qué se paga con el precio y qué queda a tu cargo, y conviene pedir la deuda del padrón y la constancia del administrador antes del remate. Esas deudas se restan de lo que estás dispuesto a ofrecer, no se descubren después.',
        links: [{ label: 'Deuda de gastos comunes', to: '/deuda-de-gastos-comunes-uruguay' }],
      },
      {
        heading: 'Si la casa está ocupada',
        body: 'Muchos inmuebles se rematan con gente adentro, y el comprador paga antes de recibir las llaves. El edicto de la ANV de abril de 2026 lo dice sin rodeos: "Se desconoce el estado ocupacional del bien". La ANV se compromete a usar las facultades de la Carta Orgánica del BHU para entregarlo libre de ocupantes, pero aclara que ese trámite "no obstará a la obligación del mejor postor de integrar el precio y otorgar la escritura de compraventa", y en su página repite que la escritura es independiente de la entrega del bien. En la práctica eso significa que vas a pagar el total y escriturar dentro de los plazos aunque la vivienda siga ocupada, y que el tiempo hasta mudarte no depende de vos: la ANV explica que para recuperar el inmueble tiene que iniciar un proceso judicial que, estadísticamente, dura entre seis y diez meses. Si no tenés dónde vivir mientras tanto, o si pensabas alquilarla para pagar un préstamo, esos meses pueden costarte más de lo que ahorraste en el precio. En un remate judicial, preguntale al rematador qué surge del expediente sobre los ocupantes antes de ofertar.',
      },
      {
        heading: 'Lo que no vas a poder revisar antes de ofertar',
        body: 'Una compraventa común te da semanas para visitar, estudiar el título y negociar. Un remate no. El edicto de la ANV dice que el bien "se vende en los estados de conservación y situación jurídica en que se encuentre a la fecha de la subasta", exonerando a la agencia de responsabilidad, y en el remate judicial el artículo 390 del CGP te impide negarte a escriturar por defectos de título anteriores. Como muchas veces no vas a poder entrar, lo que sí podés hacer es leer el edicto completo, pedir el número de padrón, consultar la deuda de tributos, hablar con la administración si es propiedad horizontal, mirar la zona y la fachada, y preguntarle al rematador todo lo que sepa del estado. Hacé la cuenta con el peor escenario: precio, seña, comisión, gastos de remate, escritura e impuestos, arreglos sin haber visto el interior y meses sin poder usarla. Si con esa cuenta sigue siendo barata, recién ahí es una oportunidad.',
        links: [{ label: 'Costos de escrituración', to: '/guias/costos-de-escrituracion-uruguay' }],
      },
    ],
    steps: [
      {
        name: 'Conseguí el edicto',
        text: 'Leé las condiciones completas: base, seña, comisión, gastos de remate, plazos y quién paga cada deuda.',
      },
      {
        name: 'Investigá el inmueble',
        text: 'Con el padrón, consultá la deuda de tributos, pedí la de gastos comunes al administrador y preguntale al rematador por el estado y los ocupantes.',
      },
      {
        name: 'Llevá el dinero del acto',
        text: 'La seña y lo que indique el aviso por comisión y gastos se pagan en el acto; en el edicto de la ANV de abril de 2026, esos pagos tenían que acreditarse en 72 horas hábiles.',
      },
      {
        name: 'Pagá el saldo en plazo',
        text: 'Veinte días corridos desde la notificación de la aprobación en un remate judicial; en la ANV, el plazo que fije el edicto y te notifique la agencia, que por lo general es de cinco días hábiles.',
      },
      {
        name: 'Escriturá',
        text: 'En treinta días con el escribano designado en el remate judicial, o en el plazo que fije el edicto de la ANV, pagando impuestos y honorarios.',
      },
    ],
    faqs: [
      {
        q: '¿Conviene comprar una casa en un remate de la ANV?',
        a: 'Puede convenir: la base es el 50 % de la tasación y la comisión es el 1 % más IVA. A cambio, comprás sin ver el interior, en el estado en que esté, con los gastos comunes a tu cargo, pagando los gastos de remate aparte del precio y escriturando aunque la vivienda siga ocupada.',
      },
      {
        q: '¿Qué pasa si la casa rematada tiene ocupantes?',
        a: 'En la ANV igual tenés que pagar el saldo y escriturar en plazo: el edicto aclara que el trámite para entregarla libre de ocupantes no suspende esas obligaciones. En un remate judicial, preguntale al rematador qué dice el expediente antes de ofertar.',
      },
      {
        q: '¿Las deudas de contribución las paga el que compra en remate?',
        a: 'En los remates de la ANV en Montevideo, por lo general, están incluidas en los gastos de remate que abonás en el acto, y la ANV las cancela hasta la fecha del remate; lo que se deba después corre por tu cuenta, y en otros departamentos el procedimiento puede variar. En un remate judicial lo define el edicto, así que leelo antes de ofertar.',
      },
      {
        q: '¿Cuánto hay que poner en el momento del remate?',
        a: 'En un remate judicial, la seña que fija el tribunal, que no puede ser menor al 10 % de la oferta, más lo que el aviso indique por comisión e impuestos. En la ANV, el 5 % de seña, el 1 % de comisión más IVA y los gastos de remate que figuran en el edicto, más otro 1 % si el remate es en el interior.',
      },
      {
        q: '¿Qué pasa si no llego a pagar el saldo del remate?',
        a: 'En un remate judicial perdés la seña y se llama al segundo postor (art. 390 del CGP). En la ANV se anula el acta de remate y quedan a tu cargo los gastos del remate y los daños y perjuicios; el edicto de abril de 2026 preveía además una multa igual a la seña más los gastos si los pagos del propio acto no se acreditaban en 72 horas hábiles.',
      },
      {
        q: '¿Puedo financiar una casa comprada en remate?',
        a: 'En la ANV, en principio sí: en unidades indexadas y hasta el monto que fije el edicto, cumpliendo los requisitos de crédito de la agencia, aunque la ANV avisa que en algunos casos puede exigir el pago al contado. La financiación es sólo para el mejor postor, no para quien le compre ese derecho.',
      },
    ],
    related: [
      { label: 'Cómo funciona el BHU', to: '/guias/bhu-como-funciona' },
      { label: 'Deuda de gastos comunes', to: '/deuda-de-gastos-comunes-uruguay' },
      { label: 'Viviendas en venta', to: '/venta-viviendas-uruguay' },
    ],
    sources: [
      {
        label:
          'CGP art. 387 — el remate es "sin base y al mejor postor"; seña "no inferior al 10% (diez por ciento) de la oferta"; saldo en "veinte días corridos" desde la notificación de la aprobación; escritura "en el plazo de treinta días"; comisión "de conformidad con el arancel que establezca la Suprema Corte de Justicia"',
        url: 'https://www.impo.com.uy/bases/codigo-general-proceso/15982-1988/387',
        publisher: 'IMPO',
      },
      {
        label:
          'CGP art. 390 — si no deposita el saldo o no escritura, "se tendrá por no hecha la oferta y perderá la seña"; el comprador no puede resistirse a escriturar "alegando defectos de titulación anteriores al remate"',
        url: 'https://www.impo.com.uy/bases/codigo-general-proceso/15982-1988/390',
        publisher: 'IMPO',
      },
      {
        label:
          'Circular 150/2016 — Acordada 7.883 del 5/12/2016, que redacta de nuevo el arancel de la Acordada 7.139 de 1992: remates judiciales de bienes inmuebles, 1 % a cargo del vendedor y 3 % a cargo del comprador, "tomando como base el valor obtenido por los bienes"; no menciona IVA',
        url: 'https://www.poderjudicial.gub.uy/sites/default/files/2025-08/150-16_-_modificacion_acordada_7139_-_arancel_para_los_remates_judiciales.pdf',
        publisher: 'Poder Judicial',
      },
      {
        label:
          'Decreto-Ley 15.508 — matrícula en el Registro Nacional de Rematadores (art. 1), comisiones que se publicitan o convienen "con la debida antelación" (art. 3), remate personal y en voz alta (art. 8) y prohibición de comprar los bienes que remata (art. 9)',
        url: 'https://www.impo.com.uy/bases/decretos-ley/15508-1983',
        publisher: 'IMPO',
      },
      {
        label:
          'Remates de la ANV (septiembre de 2026) — base del "50% del valor de la tasación", "5% de seña", "comisión del rematador (1% de la oferta más IVA)" y otro 1 % en el interior (Leyes 12.700 y 16.694); en Montevideo, "por lo general", la contribución, los tributos de cobro conjunto y Primaria van en los gastos del remate; "La deuda por gastos comunes es de cargo del comprador"; el plazo del saldo "por lo general, es de cinco días hábiles"; recuperar el inmueble dura "entre seis y diez meses"',
        url: 'https://www.anv.gub.uy/remates',
        publisher: 'Agencia Nacional de Vivienda',
      },
      {
        label:
          'Edicto de remate extrajudicial del 28/04/2026 (arts. 80 y 81 de la Carta Orgánica del BHU, por remisión del art. 34 de la Ley 18.125) — "Se desconoce el estado ocupacional del bien"; saldo y escritura en 10 días; la ANV paga hasta la fecha del remate "exclusivamente" Tasa General Municipal, Contribución Inmobiliaria, Tarifa de Saneamiento e Impuesto de Primaria',
        url: 'https://www.anv.gub.uy/sites/default/files/2026-04/28_MDEO_1300_PEREZ_GOMAR_4478_0.pdf',
        publisher: 'Agencia Nacional de Vivienda',
      },
    ],
  },
  {
    slug: 'derechos-posesorios-uruguay',
    title: 'Derechos posesorios en Uruguay: qué comprás y cuándo titulás',
    description:
      'Comprar derechos posesorios no te hace dueño: hacen falta 20 años de posesión (10 con justo título y buena fe), un juicio de prescripción y pagar ITP.',
    tag: 'POSESIÓN',
    updatedAt: '2026-09-13',
    sections: [
      {
        heading: 'Qué te venden cuando te venden derechos posesorios',
        body: 'Poseer no es lo mismo que ser dueño. La posesión es tener una cosa con ánimo de dueño, por uno mismo o por otro en nombre propio; la propiedad de un inmueble, en cambio, se prueba con un título inscripto en el Registro. Cuando alguien te vende derechos posesorios sobre un terreno o una casa, no te está vendiendo la propiedad —si la tuviera, te haría una compraventa común ante escribano—: te está cediendo su situación de hecho, la ocupación que tiene y el tiempo que lleva ocupando. El dueño registral sigue siendo otra persona. La cesión se hace por escrito, pero no aparece entre los actos que se inscriben en la sección inmobiliaria del Registro de la Propiedad: la lista del artículo 17 de la Ley 16.871 nombra las transmisiones de dominio, las promesas, los embargos, las demandas y sentencias y los arrendamientos, y no nombra la posesión. Para convertir eso en propiedad hace falta que se cumpla el plazo de prescripción y que un juez lo declare. Todo lo que pagues antes de esa sentencia es plata puesta sobre una expectativa.',
      },
      {
        heading: '¿Cuántos años hacen falta para prescribir un inmueble?',
        body: 'El Código Civil tiene dos plazos para los inmuebles, y los dos llevan la redacción que les dio la Ley 19.889 en julio de 2020. El artículo 1204 dice que la propiedad se adquiere "por la posesión de diez años con buena fe y justo título": es el caso de quien compró creyendo que el vendedor era el dueño, con un título que habría transmitido la propiedad si lo hubiera sido. El artículo 1211 fija el plazo largo: veinte años, "sin necesidad de parte del poseedor, de presentar título y sin que pueda oponérsele la mala fe". Si en algún foro leíste 25 o 30 años, no es lo que dice el texto vigente, y eso vale también para las posesiones que empezaron antes: el artículo 467 de esa ley aplicó los plazos nuevos a las prescripciones en curso y sólo demoró hasta dos años después de su vigencia las que por la rebaja quedaban cumplidas antes, un colchón que ya pasó. Quien compra derechos posesorios sabe que el vendedor no es el dueño, así que lo prudente es hacer la cuenta con los veinte años y no con los diez. Y esos veinte años no son de cualquier ocupación: tienen que ser de posesión con ánimo de dueño, sin que el titular la haya interrumpido.',
      },
      {
        heading: '¿Te sirven los años del que te vende?',
        body: 'Es la pregunta de quien tiene la oportunidad de comprar "derechos posesorios de más de veinte años", y la respuesta está en el artículo 1206. Para el plazo largo del artículo 1211, el poseedor actual puede completar el tiempo "añadiendo la de aquel o aquellos que le precedieron en la posesión, si la obtuviera de ellos por título universal o particular, oneroso o lucrativo". Una cesión es un título particular, así que en principio los años del vendedor se suman a los tuyos, y los de quien le vendió a él también, siempre que cada eslabón esté documentado. El problema no es la regla, es la prueba. Si en esos veinte años hubo períodos en que alguien vivió ahí como inquilino, como cuidador o por préstamo del dueño, esos años no son de posesión, porque esa persona tenía la cosa en nombre de otro. Pedí los papeles de cada traspaso, recibos de tributos y servicios a lo largo del tiempo, fotos y testigos que puedan declarar desde cuándo, y desconfiá de las cadenas con huecos.',
      },
      {
        heading: 'Cómo es el juicio para titular',
        body: 'La prescripción no se tramita en una oficina: se pide en un juicio. Quien demanda tiene que probar la posesión durante todo el plazo, y como del otro lado puede haber alguien que no conocés —el titular registral, sus herederos o cualquier interesado—, se cita por edictos a todos los que se consideren con derecho a oponerse y, si nadie aparece, el juzgado les nombra un defensor. Hace falta además un plano de mensura hecho para ese fin: el artículo 247 de la Ley 19.355 manda a la Dirección Nacional de Catastro inscribir los planos que se van a usar en juicios de prescripción en un Registro Provisorio, que pasa a definitivo recién con la sentencia firme. La sentencia que te declara propietario se inscribe en el Registro de la Propiedad, y ahí recién tenés título. No hay un plazo publicado para todo esto: depende del juzgado, de la prueba y de si alguien se opone. Si el titular aparece y discute tu posesión, el juicio se transforma en un pleito con resultado incierto.',
        links: [{ label: 'Abogado gratis en Uruguay', to: '/guias/abogado-gratis-uruguay' }],
      },
      {
        heading: 'El ITP se paga dos veces',
        body: 'Es un costo que casi nadie cuenta al comparar precios. El Título 19 del Texto Ordenado de la DGI grava con el Impuesto a las Transmisiones Patrimoniales las cesiones de derechos posesorios sobre inmuebles, y aclara que "a los efectos del impuesto, serán consideradas como enajenación del dominio pleno": la cesión paga como una compraventa, 2 % el que cede y 2 % el que adquiere. Después, la sentencia declarativa de prescripción adquisitiva es otro hecho gravado, que se configura el día en que la sentencia queda ejecutoriada, y quien resulta declarado propietario tributa como "los demás contribuyentes", al 4 %. Sumá esos dos impuestos a los honorarios del juicio, del agrimensor y del escribano antes de decidir si el precio bajo de unos derechos posesorios realmente es una ganga, y compará el total con lo que costaría una casa con título en la misma zona.',
        links: [{ label: 'Costos de escrituración', to: '/guias/costos-de-escrituracion-uruguay' }],
      },
      {
        heading: 'Si sos heredero y vivís en la casa',
        body: 'Ser heredero y ser poseedor son cosas distintas, aunque a veces se crucen. Si la casa figura a nombre de alguien que murió y vos sos uno de sus herederos, lo normal es que el camino sea la sucesión, no la prescripción: la sucesión te reconoce como heredero y reparte los bienes entre todos los que tienen derecho. Prescribir contra los otros herederos no está descartado, pero vas a tener que probar que durante todo el plazo poseíste como único dueño y no como uno más de los herederos que vivía ahí con permiso de los demás, que es exactamente lo que ellos van a sostener. Al revés, cuando el que poseía sin título era el fallecido, la herencia es un título universal y el artículo 1206 te deja sumar su tiempo de posesión al tuyo. Pagar la contribución, UTE y OSE ayuda a probar que poseíste, pero por sí solo no te hace dueño ni reemplaza el juicio.',
        links: [
          { label: 'Cómo funciona una sucesión', to: '/guias/como-funciona-una-sucesion-uruguay' },
        ],
      },
    ],
    steps: [
      {
        name: 'Averiguá quién es el titular',
        text: 'Con el padrón, pedí la información registral: saber quién figura como dueño y si hay herederos te dice quién podría oponerse.',
      },
      {
        name: 'Reconstruí la cadena de posesión',
        text: 'Juntá cada documento de cesión, recibos de tributos y servicios, y testigos que cubran los veinte años sin huecos.',
      },
      {
        name: 'Encargá el plano de mensura',
        text: 'Tiene que hacerse para el juicio e inscribirse en el Registro Provisorio de Catastro que prevé la Ley 19.355.',
      },
      {
        name: 'Iniciá el juicio',
        text: 'Con abogado, demandando al titular registral y citando por edictos a quienes se consideren con derecho.',
      },
      {
        name: 'Inscribí la sentencia y pagá el ITP',
        text: 'La sentencia firme es tu título: se inscribe en el Registro de la Propiedad y genera ITP para quien queda declarado propietario.',
      },
    ],
    faqs: [
      {
        q: '¿Sirve comprar derechos posesorios de un terreno con más de 20 años?',
        a: 'Puede servir: el artículo 1206 del Código Civil te deja sumar a tu posesión la de quienes te la cedieron, y el artículo 1211 fija veinte años. Pero seguís sin ser dueño hasta que un juez lo declare en un juicio de prescripción, y si no podés probar los veinte años de posesión con ánimo de dueño, el titular puede reclamar el inmueble.',
      },
      {
        q: '¿Cuántos años hay que tener para prescribir un terreno?',
        a: 'Veinte años de posesión, sin necesidad de título ni de buena fe (art. 1211 del Código Civil), o diez años con buena fe y justo título (art. 1204). Los dos textos son los que dejó la Ley 19.889 en 2020, y su artículo 467 los aplicó también a las posesiones que ya estaban en curso.',
      },
      {
        q: '¿Los derechos posesorios se heredan?',
        a: 'El heredero puede sumar el tiempo de posesión del fallecido al suyo, porque la herencia es un título universal y el artículo 1206 lo permite en la prescripción de veinte años. Lo que no se hereda es un título de propiedad que el fallecido nunca tuvo.',
      },
      {
        q: '¿Se paga ITP por comprar derechos posesorios?',
        a: 'Sí. El Título 19 grava las cesiones de derechos posesorios como si fueran una enajenación del dominio pleno, 2 % cada parte, y la sentencia de prescripción vuelve a pagar ITP: 4 % a cargo de quien es declarado propietario.',
      },
      {
        q: 'Si pago la contribución, UTE y OSE, ¿ya no me pueden sacar?',
        a: 'No alcanza. Esos pagos sirven como prueba de que poseíste, pero la propiedad se adquiere con el plazo cumplido y una sentencia que la declare. Hasta entonces, el titular registral puede discutir tu posesión.',
      },
      {
        q: '¿La cesión de derechos posesorios se inscribe en el Registro?',
        a: 'No figura entre los actos de la sección inmobiliaria que enumera el artículo 17 de la Ley 16.871. Lo que sí se inscribe son la demanda y la sentencia de prescripción, que es cuando pasás a tener título.',
      },
    ],
    related: [
      { label: 'Comprar un terreno', to: '/guias/comprar-un-terreno-uruguay' },
      { label: 'Cómo funciona una sucesión', to: '/guias/como-funciona-una-sucesion-uruguay' },
      { label: 'Promesa de compraventa', to: '/guias/promesa-de-compraventa-uruguay' },
    ],
    sources: [
      {
        label:
          'Código Civil art. 1211 (red. Ley 19.889, 2020) — la propiedad de los inmuebles "se prescribe también por la posesión de veinte años, sin necesidad de parte del poseedor, de presentar título y sin que pueda oponérsele la mala fe"',
        url: 'https://www.impo.com.uy/bases/codigo-civil/16603-1994/1211',
        publisher: 'IMPO',
      },
      {
        label:
          'Código Civil art. 1204 (red. Ley 19.889, 2020) — la propiedad de los inmuebles "se adquiere por la posesión de diez años con buena fe y justo título"',
        url: 'https://www.impo.com.uy/bases/codigo-civil/16603-1994/1204',
        publisher: 'IMPO',
      },
      {
        label:
          'Código Civil art. 1206 — en la prescripción de veinte años, el poseedor puede añadir la posesión de "aquel o aquellos que le precedieron en la posesión, si la obtuviera de ellos por título universal o particular, oneroso o lucrativo"',
        url: 'https://www.impo.com.uy/bases/codigo-civil/16603-1994/1206',
        publisher: 'IMPO',
      },
      {
        label:
          'Ley 19.889 art. 467 (disposición transitoria) — "Las prescripciones empezadas a la fecha en que esta ley sea obligatoria se determinarán conforme a las disposiciones de ésta"; las que por la rebaja de plazos se consumaran antes de dos años "se consumarán recién al finalizar dicho lapso"',
        url: 'https://www.impo.com.uy/bases/leyes/19889-2020/467',
        publisher: 'IMPO',
      },
      {
        label:
          'Título 19 del Texto Ordenado 2023 (ITP) — art. 1: grava las cesiones de derechos posesorios, "consideradas como enajenación del dominio pleno", y las sentencias declarativas de prescripción adquisitiva; art. 2: la sentencia genera el impuesto cuando "quede ejecutoriada"; art. 7: 2 % enajenante, 2 % adquirente y 4 % los demás contribuyentes',
        url: 'https://www.impo.com.uy/bases/todgi-2023/19-2024',
        publisher: 'IMPO',
      },
      {
        label:
          'Ley 19.355 art. 247 — la Dirección Nacional de Catastro "inscribirá los planos de mensura que serán usados en juicios de prescripción en el Registro Provisorio creado a tales efectos"',
        url: 'https://www.impo.com.uy/bases/leyes/19355-2015/247',
        publisher: 'IMPO',
      },
      {
        label:
          'Ley 16.871 art. 17 — enumera los actos inscribibles en la sección inmobiliaria del Registro de la Propiedad, entre ellos las demandas y sentencias ejecutoriadas sobre derechos en inmuebles, y no incluye la cesión de derechos posesorios',
        url: 'https://www.impo.com.uy/bases/leyes/16871-1997/17',
        publisher: 'IMPO',
      },
    ],
  },
  {
    slug: 'certificado-unico-departamental-uruguay',
    title: 'Certificado Único Departamental (CUD): quién lo necesita',
    description:
      'El CUD lo presentan quienes tributan IRAE o IMEBA al vender o hipotecar; el particular declara no ser contribuyente. Costo, vigencia y cómo se pide.',
    tag: 'CUD',
    updatedAt: '2026-09-13',
    sections: [
      {
        heading: 'Qué es el CUD y qué deudas certifica',
        body: 'El Certificado Único Departamental nació con el artículo 487 de la Ley 17.930, de 2005: lo expide "la Intendencia correspondiente a solicitud del interesado" y acredita "que no tiene deudas pendientes en el departamento". La misma ley limitó su exigencia a contribuyentes de la DGI y del BPS, y el Decreto 502/007 lo reglamentó: tiene vigencia anual, se pide en cada departamento donde el contribuyente tenga bienes y certifica que no debe contribución inmobiliaria, impuesto a la concentración de inmuebles rurales ni patente de rodados, con sus sanciones, o que tiene un convenio vigente por esas deudas. Fijate lo que no está en esa lista: el Impuesto de Primaria, las facturas de OSE y UTE y los gastos comunes no forman parte del CUD, así que tener el certificado no quiere decir que el inmueble no deba nada. Es una constancia sobre la persona y sus tributos departamentales, que se declara para todos sus bienes del departamento, no un informe completo de un padrón.',
      },
      {
        heading: '¿Lo necesito para vender mi casa?',
        body: 'Si sos un particular que no tributa IRAE ni IMEBA, casi seguro que no. El artículo 2 del Decreto 502/007 hace exigible el certificado a los sujetos pasivos del IRAE, del IMEBA y del impuesto a la concentración de inmuebles rurales, y el artículo 3 agrega que no corresponde controlarlo "en todos los casos en que se efectúe la declaración de no ser contribuyente". La ficha de la Intendencia de Montevideo, actualizada en febrero de 2026, lo traduce así: el CUD pueden solicitarlo los contribuyentes de IRAE o IMEBA que además sean sujetos pasivos de contribución inmobiliaria o patente, y quedan exceptuadas las personas que declaren no ser contribuyentes de esos impuestos. En la práctica, cuando vendés tu casa como persona física, declarás que no sos contribuyente y no hay CUD que tramitar. Eso no significa que nadie mire las deudas: la misma ficha aclara que el control del CUD es sin perjuicio de la obligación legal del escribano de controlar el pago de la contribución inmobiliaria. Ojo en Canelones: su ficha, de mayo de 2026, suma a quienes tributan IRPF por trabajo independiente, aunque el texto vigente del decreto no los nombra; si es tu caso, preguntá en la intendencia antes de firmar.',
      },
      {
        heading: 'En qué operaciones te lo van a pedir',
        body: 'Si sos contribuyente, el CUD aparece en más lugares de los que uno imagina. El Decreto 502/007 obliga a controlarlo a las instituciones financieras cuando otorgan o renuevan préstamos de más de 20.000 unidades indexadas, y a escribanos y registros públicos en compraventas, permutas, donaciones, daciones en pago, aportes a sociedades, fideicomisos, hipotecas y promesas de inmuebles, y en las operaciones equivalentes sobre vehículos, prendas incluidas. También tiene excepciones que conviene conocer: no se exige para bienes del BHU o de la ANV, en las ejecuciones forzadas judiciales o extrajudiciales, en las adquisiciones por sucesión o prescripción, en las compraventas que cumplen una promesa inscripta con la ocupación ya entregada, en las hipotecas que se firman en el mismo acto de la compra ni en los autos cero kilómetro. Si tu operación cae en una de esas, el escribano no debería pedírtelo, y si lo hace, preguntale bajo qué supuesto.',
        links: [
          { label: 'Comprar en remate', to: '/guias/comprar-en-remate-uruguay' },
          { label: 'Derechos posesorios', to: '/guias/derechos-posesorios-uruguay' },
        ],
      },
      {
        heading: 'Cuánto cuesta y cuánto dura, según la intendencia',
        body: 'Cada intendencia fija su tasa, y no todas la publican. En Montevideo, según la ficha actualizada el 26 de febrero de 2026, el CUD cuesta 0,10 unidades reajustables y la declaración jurada lleva un timbre profesional de 270 pesos; el certificado dura un año desde que se expide y la constancia negativa de expedición, seis meses. Llega por correo unas 24 horas hábiles después de pagar en línea, o 72 horas hábiles si pagaste en Abitab o Redpagos, y si necesitás el original en papel tenés 60 días para retirarlo. En Canelones, la ficha actualizada el 21 de mayo de 2026 marca una unidad reajustable más el timbre profesional. En Maldonado, la ficha del portal nacional de trámites menciona una tasa de servicio y el timbre, sin publicar el monto. Como la unidad reajustable se actualiza todos los meses, el valor en pesos cambia: fijate el vigente el día que pagues.',
        table: {
          headers: ['Intendencia', 'Costo publicado', 'Vigencia', 'Cómo se pide'],
          rows: [
            [
              'Montevideo (ficha del 26/02/2026)',
              '0,10 UR más timbre profesional de $270',
              'Un año; la constancia negativa, seis meses',
              'En línea con usuario gub.uy o presencial con agenda',
            ],
            [
              'Canelones (ficha del 21/05/2026)',
              '1 UR más timbre profesional',
              'Anual, según el Decreto 502/007',
              'En línea, con envío por correo, o en la Oficina Central y los municipios',
            ],
            [
              'Maldonado (ficha del 21/01/2026)',
              'Tasa de servicio más timbre profesional, sin monto publicado',
              'Anual, según el Decreto 502/007',
              'En línea o en la Dirección de Tributos',
            ],
          ],
        },
        links: [{ label: 'UI, UR y BPC: diferencias', to: '/guias/ui-ur-bpc-diferencias' }],
      },
      {
        heading: '¿Lo puede tramitar cualquiera o hace falta un escribano?',
        body: 'No hace falta ningún título habilitante: lo pide el propio contribuyente. En Montevideo se hace en línea con usuario gub.uy o cédula electrónica, cargando los datos y los padrones, o en forma presencial con agenda previa, con hasta tres solicitudes por reserva. Una persona física presenta el formulario de declaración jurada, paga la tasa y el timbre y, si va en persona, lleva fotocopia de la cédula; si en la declaración incluye vehículos, adjunta el certificado del seguro obligatorio de cada uno. Donde sí entra un escribano es en las empresas: una persona jurídica tiene que presentar un certificado notarial que acredite su constitución, vigencia y representación, y un apoderado necesita un poder con firmas certificadas, con documentación de no más de 90 días. La declaración jurada tiene que incluir todos los inmuebles y vehículos, propios y gananciales, de los que el declarante sea sujeto pasivo en el departamento, y la Intendencia advierte que una falsedad se denuncia penalmente.',
      },
      {
        heading: 'Si no sos contribuyente: cómo mirar las deudas igual',
        body: 'Que no te pidan el CUD no te exime de saber qué debe el inmueble, sobre todo si sos el que compra. En Montevideo, la consulta web de deudas de la Intendencia no tiene costo, se hace con usuario ID Uruguay y muestra, entre otros conceptos, la contribución inmobiliaria urbana y suburbana, la tasa general municipal, los tributos domiciliarios y la tarifa de saneamiento; te pide los datos del titular y el número de cuenta corriente del inmueble. La página no la presenta como un certificado, así que tomala como información: para la escritura, el escribano hace sus propios controles. Si comprás, pedile al vendedor que te muestre esa consulta antes de firmar la promesa, y averiguá por separado lo que el CUD nunca cubre, como los gastos comunes del edificio y el Impuesto de Primaria.',
        links: [
          { label: 'Impuesto de Primaria', to: '/impuesto-de-primaria-uruguay' },
          { label: 'Deuda de gastos comunes', to: '/deuda-de-gastos-comunes-uruguay' },
        ],
      },
    ],
    steps: [
      {
        name: 'Confirmá si te corresponde',
        text: 'Si no tributás IRAE ni IMEBA, lo que va es la declaración de no ser contribuyente; si tributás, seguí con el trámite.',
      },
      {
        name: 'Juntá los padrones',
        text: 'Anotá todos los inmuebles y vehículos del departamento de los que sos sujeto pasivo: la declaración jurada tiene que incluirlos a todos.',
      },
      {
        name: 'Iniciá el trámite',
        text: 'En Montevideo, en línea con usuario gub.uy o cédula electrónica, o presencial con agenda; en otros departamentos, en la intendencia donde estén los bienes.',
      },
      {
        name: 'Pagá la tasa y el timbre',
        text: 'Llegan por correo con la confirmación del trámite y se pagan en línea o en Abitab y Redpagos.',
      },
      {
        name: 'Recibí el certificado',
        text: 'En Montevideo llega por correo unas 24 horas hábiles después del pago en línea, o 72 si pagaste en redes de cobranza, y dura un año.',
      },
    ],
    faqs: [
      {
        q: '¿Puede un particular cualquiera tramitar el certificado único departamental?',
        a: 'Lo tramita el propio contribuyente, sin escribano: en Montevideo, en línea con usuario gub.uy o en forma presencial con agenda. Sólo las empresas necesitan un certificado notarial, y un apoderado, un poder con firmas certificadas. Pero si no tributás IRAE ni IMEBA, lo más probable es que no lo necesites.',
      },
      {
        q: '¿Necesito el CUD para vender mi casa?',
        a: 'Si sos persona física y no tributás IRAE ni IMEBA, no: el Decreto 502/007 exceptúa a quien declara no ser contribuyente. El escribano igual controla que la contribución inmobiliaria esté paga.',
      },
      {
        q: '¿Cuánto cuesta el CUD en Montevideo?',
        a: 'Según la ficha de la Intendencia actualizada el 26 de febrero de 2026, 0,10 unidades reajustables más un timbre profesional de 270 pesos en la declaración jurada.',
      },
      {
        q: '¿Cuánto dura el certificado único departamental?',
        a: 'Un año desde que se expide, según el Decreto 502/007 y la ficha de Montevideo. La constancia negativa de expedición dura seis meses.',
      },
      {
        q: '¿Qué deudas certifica el CUD?',
        a: 'Contribución inmobiliaria, impuesto a la concentración de inmuebles rurales y patente de rodados del departamento, con sus sanciones. No cubre gastos comunes, UTE, OSE ni el Impuesto de Primaria.',
      },
      {
        q: '¿Me piden el CUD para sacar un préstamo?',
        a: 'Si sos contribuyente de IRAE o IMEBA, sí: las instituciones financieras tienen que controlarlo al otorgar o renovar préstamos de más de 20.000 unidades indexadas.',
      },
    ],
    related: [
      { label: 'Costos de escrituración', to: '/guias/costos-de-escrituracion-uruguay' },
      { label: 'Multas de tránsito y patente', to: '/multas-de-transito-y-patente-uruguay' },
      { label: 'Transferir un auto', to: '/guias/transferir-un-auto-uruguay' },
    ],
    sources: [
      {
        label:
          'Ley 17.930 art. 487 — "Créase el Certificado Único Departamental que expedirá la Intendencia correspondiente a solicitud del interesado, el que acreditará que no tiene deudas pendientes en el departamento"; su exigencia se limita a contribuyentes de la DGI y del BPS',
        url: 'https://www.impo.com.uy/bases/leyes/17930-2005/487',
        publisher: 'IMPO',
      },
      {
        label:
          'Decreto 502/007 — vigencia anual y tributos que certifica (art. 1); exigible a sujetos pasivos de IRAE, IMEBA e ICIR (art. 2); actos, préstamos de más de UI 20.000 y excepciones, entre ellas "la declaración de no ser contribuyente" (art. 3)',
        url: 'https://www.impo.com.uy/bases/decretos/502-2007',
        publisher: 'IMPO',
      },
      {
        label:
          'Ficha del CUD (modificada el 26/02/2026) — "0,10 unidades reajustables" y timbre profesional de $270; vigencia de un año y de seis meses para la constancia negativa; entrega en 24 o 72 horas hábiles; exceptúa a las "Personas que declaren no ser contribuyentes de IRAE e IMEBA"',
        url: 'https://tramites.montevideo.gub.uy/tramites-y-tributos/solicitud/certificado-unico-departamental-cud',
        publisher: 'Intendencia de Montevideo',
      },
      {
        label:
          'Solicitud del CUD en Canelones (actualizada el 21/05/2026) — costo de "U.R. 1" más timbre profesional; alcanza a sujetos pasivos de IRAE, IRPF por trabajo independiente o IMEBA',
        url: 'https://www.imcanelones.gub.uy/servicios/tr%C3%A1mites-y-servicios/solicitud-certificado-unico-departamental-cud-canelones',
        publisher: 'Intendencia de Canelones',
      },
      {
        label:
          'Certificado Único Departamental en Maldonado (ficha actualizada el 21/01/2026) — acredita no deber contribución inmobiliaria ni patente de rodados; cobra tasa de servicio y timbre profesional, sin monto publicado en la ficha',
        url: 'https://www.gub.uy/tramites/certificado-unico-departamental-maldonado',
        publisher: 'gub.uy',
      },
      {
        label:
          'Información web de deudas — consulta sin costo de contribución inmobiliaria, tasa general municipal, tributos domiciliarios y saneamiento, con usuario ID Uruguay',
        url: 'https://tramites.montevideo.gub.uy/tramites-y-tributos/consulta/informacion-web-de-deudas',
        publisher: 'Intendencia de Montevideo',
      },
    ],
  },
]
