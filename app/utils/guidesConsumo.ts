// Guías de consumo cotidiano que salen de Reddit y de la cola de demanda: devoluciones en la tienda
// física, vender por Mercado Libre, pagar la patente en SUCIVE, el título del auto y el supergás.
// Hilos: r/Burises 1vu1vzk, 1s97men y 1q2fk9s; r/askuruguay 1strg4e; r/LegalUruguay 1udpjqe, 1pmvkfk y
// 1lfbrsp. Cifras verificadas el 2026-09-13 contra IMPO (leyes 17.250 y 16.871), MEF, DGI, gub.uy, DGR,
// SUCIVE y su Texto Ordenado 2026, Intendencias de Montevideo y Maldonado, MIEM, Presidencia, MIDES, el
// pliego de UTE vigente desde el 01/01/2026 y las páginas de tarifas de cada operador (Mercado Libre,
// Mercado Pago, BROU/tuapp). Lo que no tenía fuente primaria se explica como mecanismo, sin número.
import type { Guide } from './guides'

export const consumoGuides: readonly Guide[] = [
  {
    slug: 'devoluciones-y-cambios-en-tiendas-uruguay',
    title: 'Devoluciones en tiendas: ¿te las tienen que aceptar?',
    description:
      'En la tienda física no hay derecho a devolver por arrepentimiento: rige la política de cambios que el comercio anunció y, si el producto falla, la garantía legal.',
    tag: 'CONSUMO',
    updatedAt: '2026-09-13',
    sections: [
      {
        heading: '¿La ley te da derecho a devolver algo que compraste en el local?',
        body: 'No, y es la confusión más extendida. El derecho de arrepentimiento de cinco días hábiles del artículo 16 de la Ley 17.250 está escrito para la oferta que se hace fuera del local empresarial, por medio postal, telefónico, televisivo, informático o similar: la compra por internet, por teléfono o en un stand. El Ministerio de Economía lo resume con una frase: en la tienda física el consumidor pudo ver el producto, por lo tanto no aplica el derecho de retracto. Así que si compraste en el local y no te quedó el talle, no te gustó el color o simplemente cambiaste de idea, la ley no obliga al comercio a recibirte el producto ni a devolverte la plata. Lo que decide tu caso son otras dos cosas, que suelen jugar más a tu favor de lo que parece: la política de cambios que el propio comercio anunció, y la garantía legal si el producto sale fallado. Si la compra fue online, esta guía no es la tuya: ahí sí corren los cinco días hábiles, con las excepciones que enumera el artículo 16 bis.',
        links: [
          {
            label: 'Tus derechos en las compras online',
            to: '/derechos-consumidor-compras-online',
          },
        ],
      },
      {
        heading: 'Lo que sí obliga al comercio: la política que anunció',
        body: 'El MEF deja claro el punto de partida: en el marco de su política comercial, el proveedor establece libremente si acepta devoluciones o cambios, y puede no aceptarlos. Pero esa política tiene que estar informada de forma que la conozca quien compra antes de la transacción, y también quien recibe el producto, por ejemplo cuando es un regalo. Una vez anunciada, lo ata: el artículo 14 de la Ley 17.250 dice que toda información difundida por cualquier medio obliga al oferente que ordenó su difusión. Traducido al mostrador: si el cartel de la caja, el ticket o la web de la tienda dicen que hay cambios dentro de los treinta días, eso es exigible aunque hoy el vendedor te diga otra cosa. Por eso, cuando te niegan un cambio, lo primero es sacarle una foto al cartel o guardar la captura de la política publicada, con fecha. Si la tienda nunca informó nada, lo que tenés es la buena voluntad del comercio, no un derecho.',
      },
      {
        heading: 'Ticket, plazo y liquidaciones: lo que te pueden exigir',
        body: 'Dentro de esa libertad, el MEF enumera lo que el comercio puede hacer: no proponer cambios ni devoluciones, restringirlos a productos que no estén en liquidación o saldos, pedir siempre el ticket de compra o de cambio para hacerlos efectivos, y fijar un plazo máximo para efectuarlos. La condición es la misma de antes: que lo haya informado antes de que pagaras. Por eso el ticket de cambio que te dan al comprar un regalo no es un detalle, es lo que te permite hacer valer la política. En las liquidaciones hay un matiz que conviene tener claro. Si la prenda estaba marcada como saldo con una falla, el artículo 19 de la ley obliga a indicar esa circunstancia en forma clara y visible, y el artículo 37 deja fuera del reclamo los vicios aparentes que aceptaste expresamente. Si al comprar aceptaste expresamente esa falla, ya no la podés reclamar; un defecto distinto que aparezca después, sí.',
      },
      {
        heading: 'Vale o efectivo, y a qué precio se hace el cambio',
        body: 'Tres criterios del MEF resuelven la mayoría de las discusiones de mostrador. Primero, si el comercio te da un vale de cambio en lugar del dinero, ese vale no puede tener vencimiento: el Ministerio explica que, si venciera sin usarse, habría un enriquecimiento injusto del comercio, que cobró sin entregar nada a cambio. El mismo razonamiento aplica a las gift cards: si no se usan, la tienda no se puede quedar con esa plata. Segundo, si compraste en promoción, por ejemplo con descuento del IVA, en un Black Friday o con el descuento de una tarjeta, para el cambio se toma el precio del producto sin el descuento, el precio de lista. Tercero, si lo que corresponde es una devolución de dinero, el monto es el efectivamente pagado, no el de lista. O sea: cambiar algo que pagaste rebajado te da crédito por su precio de lista, y devolverlo te reintegra lo que pagaste.',
      },
      {
        heading: 'Si el producto sale fallado, no dependés de ninguna política',
        body: 'Todo lo anterior es para el cambio por gusto. Cuando el producto tiene un defecto la situación es otra, y un cartel que diga que no se aceptan cambios no te quita nada: frente al incumplimiento, el artículo 33 de la Ley 17.250 te deja elegir entre exigir el cumplimiento, aceptar otro producto o la reparación, o resolver el contrato con la restitución de lo pagado actualizada, con derecho además a daños y perjuicios. La elección es tuya, así que el comercio no te puede imponer un vale. Lo que sí tiene reloj es el reclamo. Por el artículo 37, los vicios aparentes caducan a los treinta días si el producto no es duradero y a los noventa si lo es, contados desde la entrega; los vicios ocultos tienen que evidenciarse dentro de seis meses y caducan a los tres meses de manifestarse. En los aparentes, reclamar por escrito ante el proveedor interrumpe el plazo hasta que te lo niegue en forma inequívoca.',
      },
      {
        heading: 'Cómo reclamar si te niegan el cambio',
        body: 'Empezá por el comercio y por escrito: un mail o un mensaje donde digas qué compraste, cuándo, qué política anunciaba la tienda y qué pedís, con la foto del cartel o la captura de la web y el ticket adjuntos. Si es un defecto, ese reclamo escrito es además lo que interrumpe el plazo de los vicios aparentes. Si no te responden o te lo niegan, el reclamo ante Defensa del Consumidor se hace en línea en gub.uy, no tiene costo y pide Usuario gub.uy de nivel intermedio, cédula digital, Identidad Digital de Abitab o TuID de Antel. El propio trámite estima una duración total de 45 días corridos, y pasados 15 días hábiles desde que la oficina le envía tu reclamo al proveedor podés consultar el estado al 0800 7005. Antes de iniciarlo conviene saber qué puede hacer el organismo por vos y qué no, porque eso cambia lo que le pedís: lo tenemos explicado en la página de Defensa del Consumidor.',
        links: [
          { label: 'Qué puede hacer Defensa del Consumidor', to: '/defensa-al-consumidor-uruguay' },
          { label: 'A quién le reclamo según el problema', to: '/a-quien-le-reclamo-uruguay' },
        ],
      },
    ],
    steps: [
      {
        name: 'Buscá la política anunciada',
        text: 'Cartel, ticket, web o condiciones de la tienda: fotografialo o capturalo con fecha, porque es lo que obliga al comercio.',
      },
      {
        name: 'Separá gusto de defecto',
        text: 'Si es talle, color o arrepentimiento, rige la política de la tienda; si es una falla, rige la garantía legal y elegís vos la solución.',
      },
      {
        name: 'Reclamá por escrito',
        text: 'Mandá un mail o mensaje con el ticket y la prueba; en los vicios aparentes ese reclamo interrumpe el plazo.',
      },
      {
        name: 'Revisá el vale y el precio',
        text: 'Si te dan un vale, no puede vencer; si compraste en promoción, el cambio se toma a precio de lista.',
      },
      {
        name: 'Si no hay respuesta, Defensa del Consumidor',
        text: 'El reclamo es en línea en gub.uy, sin costo, con una duración total estimada de 45 días corridos.',
      },
    ],
    faqs: [
      {
        q: '¿Me tienen que aceptar una devolución si compré en la tienda?',
        a: 'No por ley. El arrepentimiento de cinco días hábiles del artículo 16 de la Ley 17.250 es para compras hechas fuera del local, como las online o telefónicas. En la tienda física rige la política de cambios que el comercio informó antes de la compra, y esa política sí lo obliga.',
      },
      {
        q: '¿Me pueden negar el cambio por talle?',
        a: 'Sí, si su política no acepta cambios y lo informó antes de que compraras. Si en cambio anunció que acepta cambios, por cartel, ticket o web, tiene que cumplirlo: toda información difundida obliga a quien ordenó difundirla (art. 14 de la Ley 17.250).',
      },
      {
        q: '¿El vale de cambio puede tener vencimiento?',
        a: 'No. El MEF sostiene que un vale o una gift card que vence sin usarse deja al comercio con dinero por el que no entregó nada, lo que llama enriquecimiento injusto. Esa plata no puede quedar para la tienda.',
      },
      {
        q: 'Compré en oferta, ¿a qué precio me hacen el cambio?',
        a: 'Según el MEF, para cambiar un producto comprado en promoción se toma el precio sin el descuento, el precio de lista. Si en lugar de cambio hay devolución de dinero, te reintegran lo que efectivamente pagaste.',
      },
      {
        q: '¿Y si lo que compré en liquidación vino fallado?',
        a: 'Si la falla estaba indicada en forma clara y visible y la aceptaste expresamente al comprar, esa falla ya no se reclama (art. 37). Cualquier otro defecto sí se reclama por la garantía legal del artículo 33, con los plazos del artículo 37: 30 días para productos no duraderos y 90 para duraderos en los vicios aparentes.',
      },
      {
        q: '¿Cuánto tengo para reclamar un producto fallado?',
        a: 'Para vicios aparentes, 30 días si el producto no es duradero y 90 si lo es, desde la entrega; reclamar por escrito al proveedor interrumpe ese plazo. Los vicios ocultos tienen que aparecer dentro de los seis meses y se reclaman dentro de los tres meses de manifestarse.',
      },
    ],
    related: [
      { label: 'Compras online: tus derechos', to: '/derechos-consumidor-compras-online' },
      { label: 'Defensa del Consumidor', to: '/defensa-al-consumidor-uruguay' },
      { label: 'A quién le reclamo', to: '/a-quien-le-reclamo-uruguay' },
    ],
    sources: [
      {
        label:
          'Ley 17.250, texto vigente — art. 14 (toda información difundida "obliga al oferente que ordenó su difusión"), art. 16 (arrepentimiento para la oferta "que se realice fuera del local empresarial", cinco días hábiles), art. 19 (saldos defectuosos o usados), art. 33 (opciones ante el incumplimiento) y art. 37 (vicios aparentes: 30 días no duraderos, 90 duraderos; ocultos: evidenciarse en seis meses y caducar a los tres)',
        url: 'https://www.impo.com.uy/bases/leyes/17250-2000',
        publisher: 'IMPO',
      },
      {
        label:
          '¿Estoy obligado a aceptar la devolución de un producto que vendí en mi tienda física? — "En el caso de la tienda física, el consumidor pudo ver el producto, por lo tanto, no aplica el Derecho de Retracto o Arrepentimiento"; la política debe conocerse "previo a la transacción" (22/11/2024)',
        url: 'https://www.gub.uy/ministerio-economia-finanzas/comunicacion/publicaciones/estoy-obligado-aceptar-devolucion-producto-vendi-mi-tienda-fisica',
        publisher: 'MEF — Defensa del Consumidor',
      },
      {
        label:
          'Evitemos conflictos con las políticas de cambio y devolución — puede restringir los cambios a productos que no estén "en liquidación o saldos", pedir ticket y fijar plazo; en promociones el cambio va a "precio de lista", en devoluciones "el efectivamente pago", y el vale de cambio no puede vencer (28/11/2024)',
        url: 'https://www.gub.uy/ministerio-economia-finanzas/comunicacion/publicaciones/evitemos-conflictos-politicas-cambio-devolucion',
        publisher: 'MEF — Defensa del Consumidor',
      },
      {
        label:
          '¿Las gift cards y los vales de cambio pueden tener fecha de vencimiento? — no, porque vencer sin uso "deriva en lo que en el Derecho se denomina enriquecimiento injusto" (28/11/2024)',
        url: 'https://www.gub.uy/ministerio-economia-finanzas/comunicacion/publicaciones/gift-cards-vales-cambio-pueden-tener-fecha-vencimiento',
        publisher: 'MEF — Defensa del Consumidor',
      },
      {
        label:
          'Consulta, reclamo y/o denuncia en materia de defensa del consumidor — sin costo, en línea, "duración total estimada de la gestión: 45 días corridos", consulta de estado al 0800 7005 pasados 15 días hábiles desde que la oficina envía el reclamo al proveedor',
        url: 'https://www.gub.uy/tramites/consulta-yo-reclamo-materia-defensa-consumidor',
        publisher: 'gub.uy',
      },
    ],
  },
  {
    slug: 'vender-por-mercado-libre-uruguay',
    title: 'Vender por Mercado Libre: cuánto cobra y cuándo facturar',
    description:
      'Mercado Libre cobra entre 11,5% y 17% por venta más un costo fijo en productos de menos de $1.000. Cuándo liberan la plata y cuándo te conviene monotributo o unipersonal.',
    tag: 'MERCADO LIBRE',
    updatedAt: '2026-09-13',
    sections: [
      {
        heading: '¿Cuánto te cobra Mercado Libre por cada venta?',
        body: 'Publicar es gratis; lo que se paga es un cargo cuando concretás la venta. Según la página de costos de Mercado Libre Uruguay consultada en septiembre de 2026, ese cargo va de 11,5% a 17% del precio, según la categoría del producto, y se le suma un costo fijo por unidad en los productos baratos: $15 en los de menos de $500, $25 entre $500 y $750, y $40 entre $750 y $1.000, con los libros exceptuados. El precio mínimo para publicar es $50, o $20 en algunas categorías de consumo masivo. Hacé la cuenta antes de fijar el precio: en un producto de $800, el cargo por venta queda entre $92 y $136 según la categoría, más los $40 de costo fijo. Por eso un artículo de $300 que parece un buen negocio puede dejarte bastante menos de lo que imaginabas, y la propia plataforma sugiere armar packs o combos con lo barato. El porcentaje exacto de tu categoría aparece al publicar y en el simulador de costos de Mercado Libre.',
      },
      {
        heading: '¿Hay publicaciones gratis de verdad?',
        body: 'Existe una prueba limitada gratis, pensada para quien vende poco, con condiciones que conviene conocer antes de usarla. Según la misma página de costos, esas publicaciones duran 60 días, tienen una exposición baja en el listado y no ofrecen cuotas, y si sos MercadoLíder no las podés usar. Para productos nuevos exigen no tener más de 5 ventas concretadas en el último año, y para usados no más de 20; en los dos casos el stock por publicación es de una unidad y el máximo es de diez publicaciones simultáneas. Es una buena puerta para vender las cosas de tu casa, no para armar un negocio: la baja exposición hace que el artículo aparezca menos, y la falta de cuotas le resta atractivo frente a una publicación paga, que por defecto ofrece hasta 12 cuotas sin recargo según el banco y la tarjeta del comprador.',
      },
      {
        heading: 'Envíos: qué te pagan si entregás vos con Flex',
        body: 'Con Envíos Flex la logística es tuya: entregás con tu propio vehículo o contratás un servicio aparte, y la idea es ofrecer envíos rápidos. A cambio, Mercado Libre te da dinero para cubrir el envío. Según su nota de tarifas de Flex consultada en septiembre de 2026, en productos nuevos y usados de hasta $1.000 y en publicaciones gratuitas le cobra el envío al comprador y te acredita $169 si la entrega es en una zona cercana a tu domicilio, $200 si es de media distancia y $290 si es lejana. En productos nuevos desde $1.000 el envío es gratis para el comprador y lo que recibís es un descuento en la comisión, según tu reputación, de hasta $33,8, $40 o $58 según la zona. El monto es por venta y no por producto, y se acredita a los dos días de marcar la entrega como realizada. Antes de activarlo, compará esos montos con lo que te cuesta de verdad cada viaje.',
      },
      {
        heading: '¿Cuándo cobrás y cómo retirás la plata?',
        body: 'La plata de la venta entra a tu cuenta de Mercado Pago, pero no queda disponible enseguida: queda retenida mientras dura la operación. Según la ayuda de Mercado Pago consultada en septiembre de 2026, si vendés con envíos de Mercado Libre y ya entregaste, el dinero se libera a los 2 días si tenés reputación y el producto es nuevo, y a los 6 días en los demás casos. Si hacés los envíos por tu cuenta, lo que decide es avisar la entrega: si no sos MercadoLíder, con el aviso y la confirmación del comprador se libera a los 5 días, y sin aviso tarda 22 días; si sos MercadoLíder, es inmediato con aviso y confirmación, o 21 días sin aviso. Una vez disponible, el retiro a una cuenta bancaria es gratis y el dinero llega al banco al día hábil siguiente. Marcar la entrega no es un trámite menor: te puede ahorrar más de dos semanas de espera.',
      },
      {
        heading: '¿Cuándo tenés que registrarte ante DGI y BPS?',
        body: 'Vender de vez en cuando cosas propias que ya no usás no es lo mismo que comprar para revender todos los meses. Lo segundo es una actividad comercial, y para eso hay dos puertas. La inscripción como empresa unipersonal es, según gub.uy, el trámite con el que una persona física se registra como contribuyente antes de empezar una actividad comercial, industrial o de servicios personales no profesionales: se hace en línea en BPS, dentro del mes en que empezás o hasta 10 días antes, y en 2026 genera un timbre profesional de $270. La otra es el Monotributo, un único pago mensual que concentra los aportes al BPS y los impuestos de la DGI, con condiciones estrictas: vender bienes y servicios exclusivamente a consumidores finales, salvo excepciones que prevé la DGI, no tener más de un dependiente y, si tenés local, que no pase de 15 metros cuadrados. No encontramos en la normativa un número de ventas a partir del cual te volvés empresa, así que desconfiá de quien te dé uno: lo que define la inscripción es que lo que hacés sea una actividad comercial.',
        links: [
          { label: 'Cómo abrir una unipersonal', to: '/guias/abrir-empresa-unipersonal-uruguay' },
        ],
      },
      {
        heading: 'Monotributo o unipersonal para vender online',
        body: 'El Monotributo es la opción más barata para empezar, pero tiene techo. Para 2026 la DGI publicó un tope de ingresos anuales de $1.175.537 para el monotributista unipersonal y de $1.959.229 para la sociedad de hecho, con un tope de activos de $979.614. Es un tope de ingresos, no de ganancia, así que el número que se mira es lo que vendés. Y hay una segunda condición que muchos vendedores pasan por alto: el Monotributo exige vender exclusivamente a consumidores finales, con excepciones puntuales que enumera la DGI, de modo que si tu negocio es venderle a empresas que te piden factura, en principio no te sirve. Si tus ventas van a superar el tope o apuntás a clientes empresa, el camino es una unipersonal fuera del Monotributo: la pequeña empresa del literal E, que paga IVA mínimo y admite más ingresos, o el régimen general, cada una con otras obligaciones y otro costo. La elección tiene más matices de los que entran acá y los desarrollamos en las guías enlazadas abajo. Antes de escalar, sentate con los números de un mes real: ventas, cargo por venta, costo fijo, envíos y el aporte que te tocaría pagar.',
        links: [
          {
            label: 'Monotributo: qué es y cuándo conviene',
            to: '/guias/monotributo-uruguay-que-es-y-cuando-conviene',
          },
          { label: 'Qué empresa abrir en Uruguay', to: '/que-empresa-abrir-uruguay' },
        ],
      },
    ],
    faqs: [
      {
        q: '¿Vale la pena vender por Mercado Libre en Uruguay?',
        a: 'Depende del precio y del margen. Publicar es gratis, pero cada venta paga entre 11,5% y 17% según la categoría y, en productos de menos de $1.000, un costo fijo de $15 a $40 por unidad. En artículos baratos esa suma pesa mucho; en artículos de más valor el alcance de la plataforma suele compensarla.',
      },
      {
        q: '¿Se gana dinero o terminás trabajando para ellos?',
        a: 'Se gana si el precio cubre el cargo por venta, el costo fijo, el envío y tu tiempo. Hacé la cuenta con el simulador de costos de Mercado Libre antes de publicar, y contá la espera: la plata puede quedar retenida hasta 22 días según cómo envíes y si avisás la entrega.',
      },
      {
        q: '¿Cuánto tarda en liberarse la plata de una venta?',
        a: 'Con envíos de Mercado Libre, 2 días si tenés reputación y vendés un producto nuevo, 6 en los demás casos. Con envíos por tu cuenta y sin ser MercadoLíder, 5 días si avisás la entrega y el comprador la confirma, 22 si no avisás. Después, el retiro al banco es gratis y llega al día hábil siguiente.',
      },
      {
        q: '¿Tengo que tener RUT para vender por Mercado Libre?',
        a: 'Para vender algo propio de forma ocasional no encontramos una exigencia específica. Si comprás para revender o vendés como actividad comercial, lo que corresponde es inscribirte ante BPS y DGI como unipersonal o en el Monotributo, según tus ingresos y a quién le vendés.',
      },
      {
        q: '¿Puedo vender por Mercado Libre con Monotributo?',
        a: 'Sí, siempre que vendas exclusivamente a consumidores finales, salvo las excepciones que prevé la DGI, y no superes los topes: para 2026, $1.175.537 de ingresos anuales si sos unipersonal y $979.614 de activos. Si superás el tope o querés venderle a empresas, tenés que pasar a una unipersonal fuera del Monotributo: pequeña empresa de IVA mínimo (literal E) o régimen general, según tus ingresos.',
      },
      {
        q: '¿Cuánto me pagan por hacer yo el envío con Flex?',
        a: 'En productos de hasta $1.000 y publicaciones gratuitas, Mercado Libre cobra el envío al comprador y te acredita $169, $200 o $290 según la distancia. En productos nuevos desde $1.000 el envío es gratis para el comprador y recibís un descuento en la comisión de hasta $33,8, $40 o $58 según tu reputación y la zona.',
      },
    ],
    related: [
      {
        label: 'Monotributo: qué es y cuándo conviene',
        to: '/guias/monotributo-uruguay-que-es-y-cuando-conviene',
      },
      { label: 'Qué empresa abrir en Uruguay', to: '/que-empresa-abrir-uruguay' },
      { label: 'Facturar en monotributo', to: '/facturar-en-monotributo-uruguay' },
      { label: 'Importar para revender', to: '/importar-para-revender-uruguay' },
    ],
    sources: [
      {
        label:
          'Costos por vender un producto — publicar es gratis; cargo por venta "entre 11,5% y 17%, según la categoría del producto"; costo fijo de $15 (menos de $500), $25 ($500 a $750) y $40 ($750 a $1.000), salvo libros; prueba limitada gratis de 60 días; precio mínimo $50 (consultado el 13/09/2026)',
        url: 'https://www.mercadolibre.com.uy/ayuda/Costos-de-vender-un-producto_870',
        publisher: 'Mercado Libre Uruguay',
      },
      {
        label:
          '¿Cómo funcionan las tarifas de Envíos Flex? — hasta $1.000 recibís $169, $200 o $290 según la zona; desde $1.000, descuento en la comisión de hasta $33,8, $40 o $58; acreditación a los 2 días de la entrega',
        url: 'https://vendedores.mercadolibre.com.uy/nota/envios-flex-tarifas',
        publisher: 'Mercado Libre Uruguay',
      },
      {
        label:
          'Si recibo el pago de una venta, ¿cuánto tiempo tengo que esperar para usar el dinero? — desde inmediato (MercadoLíder que avisa la entrega y el comprador la confirma) hasta 22 días, según envío, reputación y aviso de entrega; retiro "gratis a una cuenta bancaria", en el banco "al siguiente día hábil"',
        url: 'https://www.mercadopago.com.uy/ayuda/cuando-podre-usar-dinero-uy_275',
        publisher: 'Mercado Pago Uruguay',
      },
      {
        label:
          'Monotributo — unipersonales con hasta un dependiente o sociedades de hecho; enajenar bienes y prestar servicios "exclusivamente a consumidores finales" ("Existen excepciones para esta condición"); local de hasta 15 metros cuadrados; tope unipersonal de 183.000 UI, "el 60% del límite establecido en el literal E) del Art. 66, Título 4"; concentra aportes a BPS e impuestos de DGI',
        url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/monotributo',
        publisher: 'DGI',
      },
      {
        label:
          'Tope de ingresos y activos anuales Monotributo 2026 — unipersonal $1.175.537, sociedad de hecho $1.959.229, activos $979.614 (publicado el 12/01/2026)',
        url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/tope-ingresos-activos-anuales-monotributo',
        publisher: 'DGI',
      },
      {
        label:
          'Inscripción de empresa unipersonal — trámite por el que una persona física se inscribe como contribuyente antes de iniciar la actividad; en línea en BPS (actividad comercial e industrial o servicio personal no profesional); "Timbre profesional $ 270 del 01 de enero 2026 al 31 de diciembre 2026"',
        url: 'https://www.gub.uy/tramites/inscripcion-empresa-unipersonal',
        publisher: 'gub.uy (BPS / DGI)',
      },
    ],
  },
  {
    slug: 'pagar-patente-sucive-uruguay',
    title: 'Cómo pagar la patente SUCIVE: dónde, cuándo y convenios',
    description:
      'La patente 2026 vence el 20 de cada mes impar (el 21 en setiembre). Dónde se paga, si sirve OCA, cómo ver cuánto debés por matrícula y padrón, y cómo hacer un convenio.',
    tag: 'SUCIVE',
    updatedAt: '2026-09-13',
    sections: [
      {
        heading: '¿Cuándo vence la patente en 2026?',
        body: 'La patente se paga en seis cuotas bimestrales, y desde 2013 el cobro está centralizado para todo el país. El calendario 2026 es: 20 de enero, 20 de marzo, 20 de mayo, 20 de julio, 21 de setiembre y 20 de noviembre. La quinta cuota vence el 21 porque el 20 de setiembre de 2026 cae domingo. Y cuando una fecha cae sábado, domingo o feriado, la Intendencia de Montevideo aclara que no se aplican multas ni recargos hasta pasado el primer día hábil. A eso se suman las dos bonificaciones del artículo 31 del Texto Ordenado del SUCIVE 2026, que no se acumulan: un 20% si pagás el año entero de una vez dentro del plazo de la primera cuota que te vence, en un solo acto, y un 10% sobre lo que pagues en fecha si vas cuota por cuota. A esta altura del año el 20% ya pasó para la mayoría de los vehículos; lo que queda en juego es el 10% de las cuotas de setiembre y noviembre.',
      },
      {
        heading: 'Dónde se paga: en línea, en redes de cobranza o por débito',
        body: 'Hay tres caminos. El primero es el pago en línea del SUCIVE, en la opción para pagar patente, convenio, infracciones y otros; al consultarlo en septiembre de 2026, los medios que ofrecía eran Banred, otros bancos y Visa para medios emitidos en Uruguay, y Visa para los emitidos en el extranjero. El segundo son las redes de cobranza: la Intendencia de Montevideo menciona Correo Uruguayo, Abitab y Redpagos. El tercero es el débito automático: según la Intendencia de Montevideo, quienes ya pagaban por débito bancario o con tarjeta hasta 2016 siguen sin trámite, y las consultas de adhesión se hacen con la tarjeta, porque la intendencia no interviene en ese proceso. Un detalle del Texto Ordenado explica varias sorpresas: el artículo 32 instituye el pago con tarjetas y débitos bancarios, pero sin financiación del SUCIVE. Si alguien te ofrece pagar la patente en cuotas con una tarjeta, esa financiación es de la tarjeta, con su propio costo, y conviene mirarlo antes de aceptarla.',
      },
      {
        heading: '¿Puedo pagar SUCIVE con OCA?',
        body: 'Es una de las preguntas que más se buscan, y la respuesta depende de por dónde pagues. En el pago en línea del SUCIVE, la única marca de tarjeta que figuraba como opción al consultarlo en septiembre de 2026 era Visa, junto con Banred y la opción de otros bancos; OCA no aparece como medio propio. Eso no quiere decir que no haya forma: la Intendencia de Montevideo deriva las consultas de adhesión al débito automático a la tarjeta de crédito, porque no interviene en ese proceso, así que la pregunta concreta hay que hacérsela a OCA o al emisor de tu tarjeta: si te adhiere al débito de la patente y en qué condiciones. Si lo que te ofrecen es un plan de cuotas, acordate del artículo 32: el SUCIVE no financia, así que el costo de esas cuotas lo pone la tarjeta. Y si buscás la bonificación del 20% por pago contado, fijate que el pago llegue en un solo acto y dentro del plazo de tu primera cuota.',
      },
      {
        heading: '¿Cuánto debo? Cómo consultar la deuda del auto o de la moto',
        body: 'La consulta de deuda del SUCIVE es gratis y no pide cédula: pide el origen del vehículo, nacional o extranjero, la matrícula, el padrón y el gobierno departamental donde está empadronado. El padrón figura en la libreta o en una factura anterior del vehículo. Es la misma consulta para autos y para motos, y es la respuesta directa a cuánto debe tu moto: el valor depende de la categoría, el modelo y el año, así que no se estima desde afuera. Si lo que querés saber es cuánto vale la patente anual y cómo se calcula, eso lo explicamos en la página de multas y patente. Una regla del artículo 29 del Texto Ordenado explica por qué a veces el sistema no te deja pagar solo la cuota del mes: cuando hay conceptos vencidos en más de un vencimiento se pagan primero los más antiguos, y la patente no se puede pagar si hay deuda heredada, un convenio con más de una cuota de atraso o con la última cuota vencida, o una multa con más de 30 días de atraso. Las multas y las cuotas de convenio, en cambio, se pueden pagar siempre.',
        links: [
          { label: 'Multas de tránsito y patente', to: '/multas-de-transito-y-patente-uruguay' },
        ],
      },
      {
        heading: 'Cómo hacer un convenio por la deuda de patente',
        body: 'El convenio se rige por el artículo 25 del Texto Ordenado del SUCIVE 2026. Hay dos tipos: uno por multas de tránsito, que se otorga por cada multa de la boleta, y otro por patente y conceptos conexos, que se firma uno por cada departamento donde tengas deuda; si debés en varios, se firman todos en una misma operación. Se puede suscribir en cualquier departamento, sin importar dónde esté el vehículo. El saldo se paga en hasta 36 cuotas mensuales, pero antes hay una entrega inicial que se paga dentro de los tres días hábiles de firmar y no puede ser menor al total de la deuda dividido la cantidad de cuotas más una: con 36 cuotas, un treinta y sieteavo de la deuda. Mientras no pagues esa entrega el convenio queda bloqueado, y si no la pagás en plazo caduca. Después, se cae con tres cuotas de atraso y revive la deuda original. En Montevideo la Intendencia lo ofrece en línea desde Mi Montevideo o en forma presencial con agenda, y el trámite en sí no tiene costo.',
      },
      {
        heading: 'Si ya se te pasó el vencimiento',
        body: 'Pagar tarde no es gratis, pero la diferencia entre reaccionar rápido y dejarlo estar es grande. El artículo 30 del Texto Ordenado fija una multa del 5% si pagás dentro de los cinco días hábiles siguientes al vencimiento, del 10% hasta los noventa días corridos y del 20% después, más un recargo mensual que se capitaliza día por día; el mismo artículo reduce esos porcentajes a la mitad para toda deuda que se pague desde 2019, así que en la práctica son 2,5%, 5% y 10%. El salto que más conviene evitar es el primero: pasados cinco días hábiles la multa se duplica. Además, al pagar fuera de plazo esa cuota pierde la bonificación del 10%. Si la deuda ya es de varios años el problema cambia de categoría, porque bloquea la transferencia del vehículo y puede terminar en el retiro de las placas; eso lo desarrollamos en las páginas de patente y de autos con deuda, para no repetirlo acá.',
        links: [
          { label: 'Multas de tránsito y patente', to: '/multas-de-transito-y-patente-uruguay' },
          { label: 'Comprar un auto con deuda', to: '/comprar-auto-con-deuda-uruguay' },
        ],
      },
    ],
    steps: [
      {
        name: 'Juntá matrícula y padrón',
        text: 'Están en la libreta del vehículo o en una factura anterior; con eso y el departamento consultás la deuda en el SUCIVE.',
      },
      {
        name: 'Mirá qué vence y cuándo',
        text: 'Las cuotas 2026 vencen el 20 de enero, marzo, mayo, julio y noviembre, y el 21 de setiembre.',
      },
      {
        name: 'Elegí cómo pagar',
        text: 'En línea en el SUCIVE, en una red de cobranza o por débito automático gestionado con tu banco o emisor.',
      },
      {
        name: 'Si hay deuda vieja, pedí un convenio',
        text: 'Hasta 36 cuotas mensuales, con una entrega inicial que se paga dentro de los tres días hábiles de firmar.',
      },
      {
        name: 'Guardá el comprobante',
        text: 'El SUCIVE permite pedir un duplicado de pago si lo perdés, pero conviene conservar el original.',
      },
    ],
    faqs: [
      {
        q: '¿Puedo pagar SUCIVE con OCA?',
        a: 'En el pago en línea del SUCIVE, la única marca de tarjeta que figuraba en septiembre de 2026 era Visa, además de Banred y otros bancos. Con OCA, lo que corresponde es preguntarle al emisor si te adhiere al débito automático de la patente, porque la Intendencia de Montevideo remite esas consultas a la tarjeta y no interviene en la adhesión.',
      },
      {
        q: 'SUCIVE, ¿cuándo vence?',
        a: 'En 2026 las cuotas vencen el 20 de enero, 20 de marzo, 20 de mayo, 20 de julio, 21 de setiembre y 20 de noviembre. Si el vencimiento cae sábado, domingo o feriado, no se aplican multas ni recargos hasta pasado el primer día hábil.',
      },
      {
        q: 'SUCIVE, ¿cuánto debo?',
        a: 'Lo ves gratis en la consulta de deuda del SUCIVE, con el origen del vehículo, la matrícula, el padrón y el departamento de empadronamiento. El padrón está en la libreta o en una factura anterior. Sirve igual para autos y para motos.',
      },
      {
        q: 'SUCIVE, ¿cómo hacer convenio?',
        a: 'Se firma en cualquier intendencia, uno por cada departamento donde debas patente, en hasta 36 cuotas mensuales. Hay que pagar una entrega inicial dentro de los tres días hábiles, no menor al total dividido la cantidad de cuotas más una, y el convenio caduca con tres cuotas de atraso.',
      },
      {
        q: '¿Qué pasa si el vencimiento cae un sábado?',
        a: 'Según la Intendencia de Montevideo, no se aplican multas ni recargos hasta pasado el primer día hábil siguiente. En 2026 el calendario además corrió la quinta cuota al lunes 21 de setiembre, porque el 20 cae domingo.',
      },
      {
        q: '¿Me conviene pagar la patente de una vez o en cuotas?',
        a: 'Pagar el año entero dentro del plazo de la primera cuota, en un solo acto, tiene 20% de bonificación; pagar cada cuota en fecha, 10% sobre lo pagado. No se acumulan (art. 31 del Texto Ordenado del SUCIVE 2026). Pasada la primera cuota, lo que queda es el 10%.',
      },
    ],
    related: [
      { label: 'Multas de tránsito y patente', to: '/multas-de-transito-y-patente-uruguay' },
      { label: 'Comprar un auto con deuda', to: '/comprar-auto-con-deuda-uruguay' },
      { label: 'Cuánto cuesta tener un auto', to: '/guias/costos-de-tener-auto-uruguay' },
      { label: 'Pagar cuentas con tarjeta', to: '/pagar-cuentas-con-tarjeta' },
    ],
    sources: [
      {
        label:
          'Patente de rodados — vencimientos 2026: 20 de enero, 20 de marzo, 20 de mayo, 20 de julio, 21 de setiembre y 20 de noviembre; pago centralizado para todo el país desde 2013',
        url: 'https://montevideo.gub.uy/areas-tematicas/movilidad/patente-de-rodados',
        publisher: 'Intendencia de Montevideo',
      },
      {
        label:
          'Patente de rodados (portal de trámites) — si el vencimiento cae sábado, domingo o feriado "no se aplicarán multas ni recargos hasta pasado el primer día hábil"; pago en Correo Uruguayo, Abitab o Redpagos; quienes pagaban por débito "hasta el año 2016" siguen sin trámite, y por la adhesión al débito automático hay que comunicarse con la tarjeta "ya que la intendencia no interviene en el proceso"',
        url: 'https://tramites.montevideo.gub.uy/tramites-y-tributos/patente-de-rodados',
        publisher: 'Intendencia de Montevideo',
      },
      {
        label:
          'Pago en línea — medios emitidos en Uruguay: Banred, otros bancos y Visa; emitidos en el extranjero: Visa (consultado el 13/09/2026)',
        url: 'https://www.sucive.gub.uy/pago_en_linea',
        publisher: 'SUCIVE',
      },
      {
        label:
          'Consulta de deuda — pide origen del vehículo, matrícula, padrón ("Puede consultar en la libreta o en una factura del vehículo") y gobierno departamental',
        url: 'https://www.sucive.gub.uy/consulta_deuda',
        publisher: 'SUCIVE',
      },
      {
        label:
          'Texto Ordenado del SUCIVE 2026 — art. 25 (convenios: hasta 36 cuotas, entrega inicial dentro de los tres días hábiles, que "no podrá, ser menor al total de la deuda dividido la cantidad de cuotas más una", caducidad con tres cuotas de atraso), art. 29 (orden de pago), art. 30 (mora del 5%, 10% y 20%, reducida a la mitad desde 2019), art. 31 (20% y 10%, "no serán acumulables") y art. 32 (pago con tarjetas "que no tendrá financiación del SUCIVE")',
        url: 'https://tramites.montevideo.gub.uy/sites/tramites.montevideo.gub.uy/files/tramites/documentos/TOS%202026_0.pdf',
        publisher: 'Congreso de Intendentes (PDF de la Intendencia de Montevideo)',
      },
      {
        label:
          'Convenios de financiación y refinanciación de adeudos — convenio de patente en línea desde Mi Montevideo o presencial con agenda; el trámite no tiene costo',
        url: 'https://tramites.montevideo.gub.uy/tramites-y-tributos/solicitud/convenios-de-financiacion-y-refinanciacion-de-adeudos-por-tributos-y-precios',
        publisher: 'Intendencia de Montevideo',
      },
    ],
  },
  {
    slug: 'titulo-del-auto-uruguay',
    title: 'Título del auto: ¿hay que hacerlo o alcanza la libreta?',
    description:
      'La libreta es de la intendencia; el título, del Registro de la Propiedad. No es obligatorio, pero es lo que te protege frente a terceros. Costos 2026 y riesgos.',
    tag: 'TÍTULO',
    updatedAt: '2026-09-13',
    sections: [
      {
        heading: 'Libreta y título no son lo mismo',
        body: 'Son dos registros distintos que se confunden porque los dos parecen decir quién es el dueño. La libreta, o documento de identificación vehicular, la emite la intendencia donde está empadronado el auto: es lo que te habilita a circular y sobre lo que se cobra la patente. El título es otra cosa: es el documento de compraventa, firmado ante escribano, que se inscribe en el Registro de la Propiedad Sección Mobiliaria, en su Registro de Vehículos Automotores, que depende de la Dirección General de Registros. El artículo 25 de la Ley 16.871 enumera lo que se anota ahí: los instrumentos que transfieren el dominio de un vehículo, las prendas, los embargos específicos y otras medidas que afectan a quien figura como titular. Cuando alguien dice que un auto no tiene títulos, casi siempre quiere decir eso: que ninguna de sus ventas se inscribió en el Registro, aunque la libreta haya cambiado de nombre varias veces.',
      },
      {
        heading: '¿Es obligatorio hacer el título?',
        body: 'No hay una multa por no hacerlo. El manual de calificación de automotores de la Dirección General de Registros lo dice sin vueltas: la inscripción no se impone en forma coactiva, es voluntaria, y es una carga para quien tenga interés en la protección de la publicidad registral. La ley agrega a quién le toca esa carga: el artículo 85 de la Ley 16.871 establece que el adquirente es quien tiene la carga de la registración y que será responsable ante el enajenante si no lo hiciere. O sea que, si comprás y no inscribís, el riesgo lo asumís vos. Que sea voluntaria no significa que te puedas saltear el título en cualquier departamento. Para el cambio de titularidad de la libreta, la Intendencia de Montevideo pide el título de propiedad inscripto en forma definitiva en la Dirección General de Registros, o su testimonio notarial. En Maldonado, en cambio, alcanza con acreditar titularidad o representación: que se presente el titular, un apoderado con carta poder certificada, que vale hasta un año, o el título original inscripto.',
      },
      {
        heading: 'Qué te protege el título, y por qué un embargo ajeno te puede alcanzar',
        body: 'El artículo 54 de la Ley 16.871 dice que los actos registrados son oponibles respecto de terceros a partir de su presentación al Registro, y el artículo 25 incluye entre lo que se inscribe los embargos específicos y las medidas cautelares que disponen los tribunales. Juntando las dos piezas se entiende el riesgo del que tanto se habla en los foros. Si tu compra no está inscripta, para el Registro no existe, y un embargo contra quien figura como titular inscripto puede anotarse sobre el vehículo. Tampoco te salva que el auto nunca haya tenido títulos: el manual de la Dirección General de Registros prevé que, si no hay título inscripto anterior, el oficio de embargo ingrese como primera inscripción, y su Resolución 40/2021 aclara que en ese caso no se controla que el embargado coincida con el titular municipal. Es decir, tener la libreta a tu nombre no frena ese asiento. Con tu compra inscripta antes, en cambio, tu derecho queda publicado desde que se presentó al Registro y se le puede oponer a ese acreedor.',
      },
      {
        heading: 'Cuánto sale: lo que cobra el Registro y lo que no está publicado',
        body: 'El costo tiene tres partes, y sólo dos tienen precio publicado. La primera es la tasa del Registro por inscribir la compraventa: según la ficha del trámite en gub.uy consultada en septiembre de 2026, son $2.530 en trámite normal y $3.812 en urgentísimo. La segunda es la intendencia, si además cambiás la libreta: en 2026 la libreta de circulación cuesta $1.779,52 en Montevideo y la transferencia sale $1.780 en Maldonado. La tercera, y normalmente la más grande, son los honorarios del escribano, que redacta la compraventa, controla los antecedentes, pide los certificados y presenta la inscripción. Eso no tiene una tarifa oficial publicada, así que pedí presupuesto por escrito antes de empezar y desconfiá de los números sueltos que circulan, porque dependen del profesional, del vehículo y del departamento. Si querés revisar antes de comprar, el certificado de información del Registro sobre el vehículo y las personas cuesta $1.265 en trámite común, según su ficha en gub.uy consultada en septiembre de 2026, e incluye hasta tres automotores o diez personas por formulario.',
        table: {
          headers: ['Concepto', 'Quién lo cobra', 'Monto publicado (septiembre 2026)'],
          rows: [
            [
              'Inscripción de la compraventa, trámite normal',
              'Dirección General de Registros',
              '$2.530',
            ],
            ['Inscripción urgentísima', 'Dirección General de Registros', '$3.812'],
            [
              'Certificado de información, trámite común',
              'Dirección General de Registros',
              '$1.265',
            ],
            ['Libreta a nombre del comprador', 'Intendencia de Montevideo', '$1.779,52'],
            ['Transferencia de titularidad', 'Intendencia de Maldonado', '$1.780'],
            ['Honorarios del escribano', 'El profesional', 'Sin tarifa oficial publicada'],
          ],
        },
      },
      {
        heading: 'Comprar un usado sin títulos: qué revisar antes de pagar',
        body: 'Que un auto no tenga títulos no es en sí una señal de estafa: puede ser un 0 km de único dueño o un usado cuyas ventas nunca se inscribieron. Lo que cambia es cuánto tenés que verificar vos. Primero, el Registro: pedí el certificado de información sobre el vehículo y sobre quien vende, para ver inscripciones, prendas o embargos. Segundo, quién vende: para la primera inscripción de un usado, el manual de la Dirección General de Registros exige que el titular de la libreta coincida con el vendedor o que el escribano certifique su legitimación, así que si el que te vende no es el de la libreta, eso tiene que quedar resuelto por escrito con un poder. Tercero, el cónyuge: el mismo manual indica que se controla el consentimiento conyugal cuando corresponde, en base al artículo 27 de la Ley 16.871. Cuarto, las deudas del vehículo, que no están en el Registro sino en el SUCIVE y que traban la transferencia. Y si vas a empadronar en Montevideo, sin título inscripto no vas a poder pasar la libreta a tu nombre.',
        links: [{ label: 'Comprar un auto con deuda', to: '/comprar-auto-con-deuda-uruguay' }],
      },
      {
        heading: 'Tengo la libreta a mi nombre pero no el título: ¿hago algo?',
        body: 'Es la situación de quien compró en una automotora, pasó la libreta a su nombre y después escuchó que le faltaban los títulos. La respuesta depende de un dato que no está en la libreta: si el auto tiene alguna inscripción en el Registro. Si nunca la tuvo, tu compra se puede inscribir igual: el manual del Registro trata la venta del importador o concesionario como primera venta de 0 km, y el usado que nunca se inscribió entra por la vía de la primera inscripción de auto usado cuando alguien decide hacerla. Si en cambio el auto sí tiene inscripciones, el Registro todavía muestra al último titular inscripto, y ahí aplica todo lo del apartado sobre embargos. En los dos casos, la decisión informada empieza por pedir el certificado del Registro antes de gastar en el título, y sigue por pensar en la reventa: quien te lo compre después va a mirar exactamente lo mismo, y un auto con la historia registral en orden es más fácil de vender a alguien que quiera hacer las cosas bien.',
      },
    ],
    steps: [
      {
        name: 'Pedí el certificado del Registro',
        text: 'Sobre el vehículo y sobre quien vende: muestra inscripciones, prendas y embargos, y cuesta $1.265 en trámite común según su ficha en gub.uy.',
      },
      {
        name: 'Consultá la deuda en el SUCIVE',
        text: 'La deuda de patente y multas no figura en el Registro y traba la transferencia del vehículo.',
      },
      {
        name: 'Verificá quién firma',
        text: 'El vendedor tiene que coincidir con el titular de la libreta, o el escribano debe certificar su legitimación.',
      },
      {
        name: 'Firmá la compraventa ante escribano',
        text: 'El escribano presenta la inscripción en el Registro del departamento donde el vehículo tuvo su primera inscripción.',
      },
      {
        name: 'Pasá la libreta a tu nombre',
        text: 'En la intendencia, con los requisitos de cada departamento: Montevideo exige el título inscripto.',
      },
    ],
    faqs: [
      {
        q: '¿Hacer título de auto o no?',
        a: 'No es obligatorio: la inscripción es voluntaria y la carga de hacerla es del comprador (art. 85 de la Ley 16.871). Lo que compra el título es protección frente a terceros, porque lo inscripto es oponible desde que se presenta al Registro (art. 54). En Montevideo, además, lo necesitás para pasar la libreta a tu nombre.',
      },
      {
        q: '¿Qué pasa si compro un auto sin títulos?',
        a: 'Podés inscribir tu compra en el Registro como primera inscripción de un usado, con escribano. Si no lo hacés, tu compra no figura en el Registro, y un embargo sobre el vehículo puede anotarse igual, incluso como primera inscripción, sin que se controle que el embargado coincida con el titular de la libreta.',
      },
      {
        q: '¿Cuánto sale hacer el título de un auto?',
        a: 'La tasa del Registro por inscribir la compraventa es de $2.530 en trámite normal, según la ficha de gub.uy consultada en septiembre de 2026. A eso se suman los honorarios del escribano, que no tienen tarifa oficial publicada, y el cambio de libreta en la intendencia: $1.779,52 en Montevideo en 2026.',
      },
      {
        q: 'Si embargan al dueño anterior, ¿pierdo el auto?',
        a: 'El riesgo existe cuando tu compra no está inscripta, porque los embargos específicos se anotan en el Registro de Vehículos Automotores (art. 25 de la Ley 16.871) y lo inscripto es oponible a terceros (art. 54). Si tu compra se inscribió antes, tu derecho queda publicado desde su presentación y se le puede oponer a ese acreedor.',
      },
      {
        q: '¿Un 0 km tiene título?',
        a: 'No automáticamente. La primera venta de un 0 km, del importador o concesionario al comprador, es un acto que se puede inscribir en el Registro, pero la inscripción es voluntaria, así que puede no hacerse nunca. En ese caso el auto no tiene historia registral hasta que alguien inscribe una venta.',
      },
      {
        q: '¿Puedo pasar la libreta a mi nombre sin título?',
        a: 'Depende del departamento. En Montevideo el cambio de titularidad pide el título inscripto en la Dirección General de Registros o su testimonio notarial. En Maldonado alcanza con que se presente el titular, un apoderado con carta poder certificada o el título original inscripto.',
      },
    ],
    related: [
      { label: 'Cómo transferir un auto', to: '/guias/transferir-un-auto-uruguay' },
      { label: 'Comprar un auto con deuda', to: '/comprar-auto-con-deuda-uruguay' },
      { label: 'Comprar auto 0 km o usado', to: '/guias/comprar-auto-0km-o-usado-uruguay' },
      { label: 'Estafas en Uruguay', to: '/estafas-uruguay' },
    ],
    sources: [
      {
        label:
          'Ley 16.871 de Registros Públicos — art. 25 (se inscriben las transferencias de dominio de vehículos, las prendas y los "embargos específicos"), art. 54 (lo registrado es oponible "respecto de terceros a partir de la presentación al Registro") y art. 85 ("El adquirente es quien tiene la carga de la registración")',
        url: 'https://www.impo.com.uy/bases/leyes/16871-1997',
        publisher: 'IMPO',
      },
      {
        label:
          'Manual de calificación del Registro de Vehículos Automotores — "La inscripción no se impone en forma coactiva, es voluntaria"; primera venta de 0 km y primera inscripción de usado; el embargo puede ingresar como primera inscripción y, por la Resolución 40/2021, sin controlar la coincidencia con el titular municipal',
        url: 'https://portal.dgr.gub.uy/requisitos/Manual%20de%20Automotores%202025.pdf',
        publisher: 'Dirección General de Registros',
      },
      {
        label:
          'Inscripción de documentos en el Registro de la Propiedad Mobiliaria, Sección Vehículos Automotores — la presenta el escribano en el Registro del departamento de la primera inscripción; tarifa normal $2.530, urgentísimo $3.812 (consultado el 13/09/2026)',
        url: 'https://www.gub.uy/tramites/inscripcion-documentos-registro-propiedad-mobiliaria-seccion-vehiculos-automotores-minuta-automotores',
        publisher: 'gub.uy — Dirección General de Registros',
      },
      {
        label:
          'Certificados de información de bienes muebles — trámite común "$ 1.265" (la ficha lo expresa como 1,50 UR "equivalentes hoy a $ 1.265", actualizada el 11/02/2026), hasta 3 automotores o 10 personas por formulario, entrega en 24 horas',
        url: 'https://www.gub.uy/tramites/certificados-informacion-bienes-muebles',
        publisher: 'gub.uy — Dirección General de Registros',
      },
      {
        label:
          'Cambio de titularidad de vehículos registrables — exige "Título de propiedad inscripto en forma definitiva en la Dirección General de Registros o testimonio notarial"; libreta de circulación $1.779,52',
        url: 'https://tramites.montevideo.gub.uy/tramites-y-tributos/solicitud/cambio-de-titularidad-de-vehiculos-registrables-automovil-camioneta-camion-omnibus-etc',
        publisher: 'Intendencia de Montevideo',
      },
      {
        label:
          'Transferencia o cambio de titularidad del vehículo en Maldonado — acreditar "Titular, apoderado, o título original inscripto"; carta poder con certificación notarial válida hasta un año; costo $1.780',
        url: 'https://www.gub.uy/tramites/transferencia-cambio-titularidad-vehiculo-maldonado',
        publisher: 'Intendencia de Maldonado — gub.uy',
      },
    ],
  },
  {
    slug: 'precio-supergas-garrafa-uruguay',
    title: 'Precio del supergás: cuánto sale la garrafa de 13 kg',
    description:
      'Desde julio de 2026 el kilo de supergás cuesta $93,56: la garrafa de 13 kg, $1.216,28. Quién fija el precio, el descuento del 50% del MIDES y cómo compararlo con UTE.',
    tag: 'SUPERGÁS',
    updatedAt: '2026-09-13',
    sections: [
      {
        heading: '¿Cuánto sale hoy la garrafa de 13 kg?',
        body: 'El precio se fija por kilo. Desde el 1 de julio de 2026 el precio máximo de venta al público del supergás es $93,56 el kilo, tras una baja del 7,6% que el Ministerio de Industria, Energía y Minería tradujo en $100 menos para la garrafa de 13 kg. El 31 de agosto el Poder Ejecutivo resolvió mantenerlo durante setiembre. Multiplicado por 13, la garrafa queda en $1.216,28; la cuenta es nuestra, porque los comunicados oficiales publican el precio del kilo y no siempre el de la garrafa. Si el precio que te pasan por una recarga de 13 kg es distinto, preguntá qué incluye antes de pagar. Y como el precio se revisa periódicamente, antes de hacer cuentas a largo plazo, por ejemplo para decidir qué cocina comprar, mirá el último comunicado oficial: lo que hoy vale $1.216,28 puede cambiar en el próximo ajuste, para arriba o para abajo.',
      },
      {
        heading: '¿Quién fija el precio y dónde se publica?',
        body: 'Lo fija el Poder Ejecutivo, que anuncia cada ajuste, o la decisión de no ajustar, en un comunicado oficial. La metodología está en el Decreto 130/025 y toma como referencia el precio de paridad de importación que informa todos los meses la Unidad Reguladora de Servicios de Energía y Agua, la URSEA; el precio de referencia suma además otros componentes de la cadena, como la distribución y los impuestos. Pero la referencia no es el precio final. En setiembre de 2026, según el comunicado oficial, la URSEA calculaba que el GLP habría justificado $98,96 el kilo, y el Poder Ejecutivo lo dejó en $93,56. O sea que el precio del supergás es una decisión de política y no el resultado automático del mercado internacional: puede quedarse quieto aunque la referencia suba, o bajar, como pasó en julio de 2026. Por eso el dato confiable es siempre el del último comunicado, no el precio que alguien recuerda de hace unos meses.',
      },
      {
        heading: 'El descuento del 50% para hogares con prestaciones',
        body: 'Existe un subsidio del MIDES para la recarga de garrafas de 13 kg, y desde el 1 de febrero de 2025 la única forma de usarlo es a través de tuapp. El beneficio aplica un 50% de descuento en cada recarga, con un tope de una garrafa por mes de enero a marzo y de octubre a diciembre, dos por mes de abril a setiembre, y doce en el año. Según el comunicado del MIDES, pueden acceder los titulares de cobro de Asignaciones Familiares del Plan de Equidad, de Asignaciones Familiares contributivas del BPS en el primer escalón de ingresos, de Asistencia a la Vejez, de Canasta de Servicios y de la Tarjeta Uruguay Social en las categorías que el Ministerio enumera. Se canjea en los puntos de venta de DUCSA, RIOGAS, MEGAL y ACODIKE adheridos a tuapp, y se solicita en la web del MIDES o en sus oficinas. Al precio máximo de setiembre de 2026, la mitad de una garrafa son $608,14.',
        links: [{ label: 'Asignación familiar', to: '/asignacion-familiar-uruguay' }],
      },
      {
        heading: '¿Cuánto dura una garrafa? Por qué no te damos un número',
        body: 'Es la pregunta del millón, y la respuesta honesta es que depende demasiado de tu casa como para publicar una cifra: cuántas personas cocinan, cuántas veces por día, si el horno también es a gas, si hervís el agua en la hornalla o en una jarra eléctrica, y hasta la época del año. Por eso las respuestas que circulan van de semanas a meses, y todas pueden ser ciertas para quien las da. Lo que sí podés tener es tu propio número, y sale sin esfuerzo: anotá la fecha en que conectás una garrafa nueva y la fecha en que se termina. Dividí el precio de la recarga, $1.216,28 al precio máximo vigente en setiembre de 2026, por la cantidad de días que duró, y vas a saber cuánto te cuesta el gas por día. Ese es el dato que después sirve para comparar con la electricidad, mucho más que cualquier promedio ajeno.',
      },
      {
        heading: 'Cuánto sale el kWh de UTE para cocinar',
        body: 'Del lado eléctrico, el precio lo publica UTE en su pliego tarifario vigente desde el 1 de enero de 2026, y viene sin IVA. En la Tarifa Residencial Simple, el kilovatio hora cuesta $6,744 entre 1 y 100 kWh por mes, $8,452 entre 101 y 600 kWh, y $10,539 de ahí en adelante. La energía lleva IVA, y la DGI explica que en principio todos los bienes y servicios están gravados a la tasa básica del 22%, así que esos precios pasan a ser unos $8,23, $10,31 y $12,86; el cargo fijo mensual, en cambio, está exonerado de IVA. Lo que importa para la cocina es el último kWh de tu factura: si tu hogar ya consume más de 100 kWh al mes, cada kWh que sume una cocina eléctrica lo vas a pagar al precio del segundo o del tercer escalón, no al del primero. En la Tarifa Residencial Doble Horario, que exige al menos 3,5 kW de potencia contratada, la energía fuera de punta cuesta $4,771 más IVA y la de punta $12,034 más IVA.',
        table: {
          headers: ['Tarifa y tramo', 'kWh sin IVA', 'kWh con IVA del 22%'],
          rows: [
            ['Residencial Simple, 1 a 100 kWh', '$6,744', '$8,23'],
            ['Residencial Simple, 101 a 600 kWh', '$8,452', '$10,31'],
            ['Residencial Simple, 601 kWh en adelante', '$10,539', '$12,86'],
            ['Doble Horario, fuera de punta', '$4,771', '$5,82'],
            ['Doble Horario, punta', '$12,034', '$14,68'],
          ],
        },
        links: [{ label: 'Cómo leer la factura de UTE', to: '/factura-de-ute-uruguay' }],
      },
      {
        heading: 'Cocina a gas o eléctrica: cómo hacer la comparación con tus números',
        body: 'Con esos dos precios ya se puede comparar sin inventar nada. Del lado del gas, el costo diario sale de dividir la recarga por los días que te dura, como vimos antes. Del lado eléctrico, el consumo es la potencia del artefacto en kilovatios, que figura en su etiqueta, por las horas de uso: un horno de 2 kW prendido una hora gasta como máximo 2 kWh, porque el termostato lo corta cuando llega a temperatura, y en el segundo escalón de la Residencial Simple eso son unos $20,62 con IVA. Multiplicá por las veces por semana que lo usarías y tenés el costo mensual. Dos advertencias para que la cuenta sea justa. Compará lo mismo contra lo mismo: si pensás en una cocina combinada, con hornallas a gas y horno eléctrico, sólo se mueve el horno. Y si cocinás en un horario fijo, la Doble Horario puede cambiar mucho el resultado, pero la hora punta la elegís vos, cuatro horas seguidas entre las 17 y las 23, y esa elección se mantiene al menos doce meses.',
      },
    ],
    faqs: [
      {
        q: '¿Cuánto sale la garrafa de supergás?',
        a: 'Desde el 1 de julio de 2026 el precio máximo es $93,56 el kilo, y el Poder Ejecutivo lo mantuvo en setiembre. Para la garrafa de 13 kg eso da $1.216,28.',
      },
      {
        q: '¿Quién fija el precio del supergás?',
        a: 'El Poder Ejecutivo, con la metodología del Decreto 130/025, que toma como referencia el precio de paridad de importación informado por la URSEA. La referencia no obliga: en setiembre de 2026 la URSEA calculaba $98,96 el kilo y el precio quedó en $93,56.',
      },
      {
        q: '¿Cuánto les dura el gas?',
        a: 'Depende de cuántos cocinan, cuánto y con qué, y por eso no publicamos un promedio. Anotá cuándo conectás la garrafa y cuándo se termina, dividí el precio de la recarga por esos días y tenés tu costo diario real.',
      },
      {
        q: '¿Cocina con garrafa o full eléctrica?',
        a: 'Compará tu costo diario de gas con el de la electricidad: potencia del artefacto en kW, por horas de uso, por el precio de tu escalón de UTE. En la Residencial Simple 2026, el kWh entre 101 y 600 kWh cuesta $8,452 sin IVA, unos $10,31 con IVA. Si sólo cambiarías el horno, compará sólo el horno.',
      },
      {
        q: '¿Cómo accedo al descuento de la garrafa del MIDES?',
        a: 'Si sos titular de cobro de Asignaciones Familiares del Plan de Equidad, de las contributivas del BPS del primer escalón, de Asistencia a la Vejez, de Canasta de Servicios o de ciertas categorías de la Tarjeta Uruguay Social, lo pedís en la web del MIDES o en sus oficinas y lo usás con tuapp: 50% de descuento en cada recarga de 13 kg, hasta 12 por año.',
      },
      {
        q: '¿Me conviene la tarifa doble horario para cocinar eléctrico?',
        a: 'Puede convenir si cocinás fuera de punta: en el pliego 2026 la energía fuera de punta cuesta $4,771 sin IVA contra $12,034 en punta. La punta son cuatro horas seguidas que elegís entre las 17 y las 23, la elección dura al menos doce meses y la tarifa exige 3,5 kW de potencia contratada o más.',
      },
    ],
    related: [
      { label: 'La factura de UTE', to: '/factura-de-ute-uruguay' },
      { label: 'Precios de supermercado', to: '/precios-de-supermercado-uruguay' },
      { label: 'Asignación familiar', to: '/asignacion-familiar-uruguay' },
      { label: 'Vivir con 25.000 pesos', to: '/vivir-con-25000-pesos-uruguay' },
    ],
    sources: [
      {
        label:
          'Precio de combustibles julio 2026 — desde el 1° de julio el supergás baja 7,6% a $93,56 el kilo, "una baja de $100 en la garrafa de 13 kg"; metodología del Decreto N° 130/025 con el precio de paridad de importación informado mensualmente por la URSEA',
        url: 'https://www.gub.uy/ministerio-industria-energia-mineria/comunicacion/noticias/precio-combustibles-julio-2026-baja-principales-combustibles-reduccion-100',
        publisher: 'MIEM',
      },
      {
        label:
          'Poder Ejecutivo mantiene los precios de los combustibles en setiembre — supergás (GLP) a $93,56 el kilo; según la URSEA, la referencia habría justificado $98,96 (31/08/2026)',
        url: 'https://www.gub.uy/presidencia/comunicacion/noticias/poder-ejecutivo-mantiene-precios-combustibles-setiembre',
        publisher: 'Presidencia de la República',
      },
      {
        label:
          'Subsidio de recarga de garrafas de supergás para beneficiarios MIDES — quiénes acceden; 1 garrafa por mes en enero-marzo y octubre-diciembre, 2 de abril a setiembre, tope de 12 anuales; canje en DUCSA, RIOGAS, MEGAL y ACODIKE adheridos a tuapp, única vía desde el 1° de febrero de 2025 (08/01/2025)',
        url: 'https://www.gub.uy/ministerio-desarrollo-social/comunicacion/comunicados/subsidio-recarga-garrafas-supergas-para-beneficiarios-mides',
        publisher: 'MIDES',
      },
      {
        label:
          'tuapp, subsidio en recarga de garrafas — "aplicando un 50% de descuento en cada compra", con tope de 12 garrafas anuales',
        url: 'https://www.brou.com.uy/personas/planes-sociales/tuapp-subsidio-en-recarga-de-garrafas',
        publisher: 'BROU',
      },
      {
        label:
          'Pliego tarifario vigente desde el 01/01/2026 — Residencial Simple: $6,744, $8,452 y $10,539 por kWh según escalón; Doble Horario: $4,771 fuera de punta y $12,034 en punta; precios sin IVA y cargo fijo exonerado de IVA',
        url: 'https://www.ute.com.uy/sites/default/files/docs/Pliego%20Tarifario%20Enero%202026.pdf',
        publisher: 'UTE',
      },
      {
        label:
          '¿Cuáles son los bienes y servicios gravados a la tasa básica del 22%? — "En principio todos los bienes y servicios están gravados a la tasa básica del 22%" (18/06/2024)',
        url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/son-bienes-servicios-gravados-tasa-basica-del-22',
        publisher: 'DGI',
      },
    ],
  },
]
