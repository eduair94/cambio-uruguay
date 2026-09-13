// Bancos y pagos: seis guías minadas de Reddit (hilos 1oln2n4, 1unulhf, 1rnjqlt, 1p8s44j, 1tevo1p,
// 1w0w4ex, 1pnp65v, 1td6zff, 1umsnex, 1rs06bi, 1pjzqzm, 1nihxhv, 1q5p2pk, 1vn9n6t): mínimo para el
// débito, saldo retenido, transferencia equivocada, SWIFT recibido, alias y tarjetas en Argentina.
// Verificado el 2026-09-13 contra IMPO (Leyes 19.210, 19.889 y 17.250; Código Civil arts. 1312 y 1316;
// Código Penal arts. 347 y 353), DGI, BCU, gub.uy, el texto ordenado del BCRA al 25/08/2025 y los
// tarifarios vigentes de BROU, Itaú (sept. 2026), Santander (12/09/2026), BBVA (3/9/2026), Scotiabank
// (1/7/2026), Prex y Wise. HSBC (hoy BTG Pactual), Payoneer y Mercado Pago quedan sin cifras: no se
// pudo abrir una tarifa vigente publicada por el propio operador.
import type { Guide } from './guides'

export const pagosGuides: readonly Guide[] = [
  {
    slug: 'comercio-no-acepta-debito-uruguay',
    title: 'Monto mínimo para pagar con débito: ¿es legal?',
    description:
      'Desde 2020 un comercio puede fijar un monto mínimo para el débito: la LUC derogó el artículo 64 de la Ley 19.210. Qué pasa con el recargo, el IVA y dónde reclamar.',
    tag: 'DÉBITO',
    updatedAt: '2026-09-13',
    sections: [
      {
        heading: '¿Es legal que el almacén te pida un mínimo para el débito?',
        body: 'Sí, y desde hace años. La Ley 19.210 de inclusión financiera tenía un artículo 64 que, en la versión actualizada que publica el BCU, decía que los comercios que decidieran aceptar tarjetas de débito o instrumentos de dinero electrónico "tampoco podrán limitar la aceptación de los referidos medios de pago electrónico estableciendo montos mínimos para su uso". Esa regla ya no existe: el artículo 224 de la Ley 19.889, la LUC del 9 de julio de 2020, derogó los artículos 36, 36 BIS, 39, 40, 41, 41 BIS, 43, 44 y 64 de la Ley 19.210, y por eso en IMPO el artículo 64 figura como derogado. Mucha gente sigue citando la prohibición porque durante unos años fue ley, pero hoy un cartel de "débito desde $ 100" no viola la Ley 19.210. Lo que el comercio no puede hacer es sorprenderte: el precio y las condiciones se informan antes de que compres, y eso lo exige otra ley que sigue vigente.',
      },
      {
        heading: '¿Y pueden cobrarte más caro si pagás con tarjeta?',
        body: 'El mismo artículo 64 derogado era el que prohibía el recargo: los comercios que aceptaran débito o dinero electrónico no podían cobrar "un precio mayor si el pago se realiza mediante estos instrumentos que si el mismo se realiza con efectivo", y cualquier promoción pensada para el pago en efectivo tenía que extenderse al débito. Al caer el artículo en 2020 cayeron las tres cosas juntas: la prohibición del mínimo, la del recargo y la de la promoción exclusiva para efectivo. Lo que queda en pie es la Ley 17.250 de relaciones de consumo. Su artículo 15 obliga al proveedor a informar antes de cerrar la compra "el precio, incluidos los impuestos", y su artículo 12 dice que la oferta con información suficientemente precisa vincula a quien la emite. En la práctica: si la góndola dice un precio y en la caja te agregan un recargo por tarjeta que no estaba anunciado en ningún lado, tenés base para reclamar; si el recargo estaba informado antes de comprar, es una condición del comercio que podés aceptar o no.',
      },
      {
        heading: '¿Un comercio está obligado a aceptar tarjetas?',
        body: 'Lo que la Ley 19.210 vigente dice sobre los comercios y las tarjetas está en su artículo 65: los proveedores o comercios "podrán optar por aceptar tarjetas de débito o crédito" como medio de pago, y los emisores de tarjetas tienen prohibido exigirles que acepten los dos tipos de instrumento. O sea, el comercio elige qué acepta y el emisor no puede atarle el débito al crédito. De ahí sale el panorama que se ve en cualquier barrio: supermercados que cobran con débito cualquier monto, almacenes con cartel de mínimo y locales que sólo aceptan efectivo o transferencia. Ninguno está en infracción sólo por eso. Donde sí aparece una obligación es del lado de la información: el artículo 6 de la Ley 17.250 le reconoce al consumidor el derecho a una información "suficiente, clara, veraz", así que si el comercio pone condiciones para un medio de pago, lo razonable es que estén a la vista antes de que llegues a la caja y no que te las cuenten con la compra ya embolsada.',
      },
      {
        heading: 'Por qué a un almacén le molesta una venta de $ 30',
        body: 'Porque cada cobro con tarjeta tiene un costo para el comercio: la empresa que le da el servicio de POS le cobra una comisión, el arancel, y le acredita la plata en el plazo que fija el contrato. En una compra grande ese costo se diluye; en una de dos huevos puede comerse el margen entero. Por eso el mínimo aparece casi siempre en comercios chicos y casi nunca en supermercados. Lo que no es cierto es que el comercio chico pague de su bolsillo la rebaja de IVA que recibís al pagar con débito. Si el comercio está en IVA mínimo o Monotributo, la DGI lo dice así: "Quienes dispondrán del crédito fiscal equivalente a la reducción, serán las entidades administradoras de los instrumentos de pago o las redes de cobranza", y "estos contribuyentes percibirán el importe total de la operación, sin considerar la reducción". Y si está en el régimen general, la DGI le reconoce "un crédito por un monto equivalente al impuesto rebajado". El costo que le molesta al almacenero es el arancel, no el descuento de IVA, y conviene tenerlo claro antes de discutir en el mostrador.',
      },
      {
        heading: 'El descuento de IVA no tiene nada que ver con el cartel',
        body: 'La rebaja por pagar con débito o dinero electrónico es, según la DGI, "una reducción de dos puntos porcentuales del IVA", y se aplica a las ventas a consumidor final. El mínimo que ponga el comercio es otra cosa: si te cobran con débito, el cálculo de la rebaja es el mismo, compres mucho o poco. Lo que cambia es quién te vende. En un comercio del régimen general es una rebaja del IVA, así que lo que no lleva IVA no tiene nada que rebajar. Pero si le comprás a un contribuyente de IVA mínimo o Monotributo, o a ciertos comercios chicos de comestibles, farmacias y quioscos, la DGI prevé que hasta el 31 de diciembre de 2026 la rebaja pueda calcularse como el 1,64 % del total, aunque parte de lo que lleves esté exento. O sea que en la feria o en el almacén del barrio, que lo tuyo no lleve IVA no siempre explica que falte el descuento. Para chequearlo, mirá el comprobante del POS: tiene que mostrar el importe sin reducción, el monto de la reducción y la leyenda "Reducción IVA Ley No 19.210". Si querés ver cuánto te devuelven según el medio de pago y qué compras entran, lo tenemos explicado aparte, con ejemplos.',
        links: [
          { label: 'Descuento de IVA con tarjeta', to: '/descuento-de-iva-con-tarjeta-uruguay' },
        ],
      },
      {
        heading: 'Qué podés hacer en el mostrador y dónde reclamar',
        body: 'En el momento, lo práctico es preguntar antes de pedir: si hay cartel de mínimo, sumás algo a la compra, pagás en efectivo o, si el comercio lo acepta, por transferencia. Discutir con el artículo 64 en la mano no sirve, porque esa regla ya no rige. Donde sí vale reclamar es cuando te cobran un precio distinto del exhibido o del informado antes de pagar, por ejemplo un recargo por tarjeta que no estaba anunciado. Para eso está el trámite de consulta, reclamo o denuncia de Defensa del Consumidor: es gratuito, se inicia en línea con usuario gub.uy o identidad digital, y el reclamo busca resolver el problema con el comercio mediante una mediación, con una duración estimada de 45 días corridos; el 0800 7005 es la línea gratuita para consultar cómo va. Guardá el ticket y, si podés, sacale una foto al precio exhibido y al cartel de medios de pago, porque es lo que demuestra qué te informaron antes de comprar.',
        links: [
          { label: 'Defensa del Consumidor: cómo reclamar', to: '/defensa-al-consumidor-uruguay' },
          { label: 'A quién le reclamo', to: '/a-quien-le-reclamo-uruguay' },
        ],
      },
    ],
    faqs: [
      {
        q: '¿Pueden negarse a cobrar con débito por un monto bajo?',
        a: 'Sí. La prohibición de fijar montos mínimos estaba en el artículo 64 de la Ley 19.210 y la derogó el artículo 224 de la Ley 19.889 (LUC) en julio de 2020. Hoy un comercio puede exigir un mínimo para aceptar débito, siempre que no te cambie el precio que te informó.',
      },
      {
        q: '¿Me pueden cobrar un recargo por pagar con tarjeta?',
        a: 'La Ley 19.210 ya no lo prohíbe: el mismo artículo derogado era el que impedía cobrar más caro con débito que con efectivo. Lo que exige la Ley 17.250 es que el precio se informe antes de la compra, así que un recargo sorpresa en la caja, no anunciado, es reclamable ante Defensa del Consumidor.',
      },
      {
        q: '¿El comercio está obligado a tener POS?',
        a: 'El artículo 65 de la Ley 19.210 dice que los comercios pueden optar por aceptar tarjetas de débito o de crédito y prohíbe a los emisores exigirles las dos. La decisión de qué medios de pago aceptar es del comercio.',
      },
      {
        q: 'Si pago con débito en un almacén chico, ¿el descuento de IVA lo paga el almacenero?',
        a: 'No. Según la DGI, cuando el vendedor está en IVA mínimo o Monotributo, el crédito fiscal por la rebaja lo tienen las entidades administradoras de los medios de pago o las redes de cobranza, y el comercio percibe el importe total de la venta; si está en el régimen general, recupera la rebaja como crédito fiscal.',
      },
      {
        q: '¿Dónde denuncio a un comercio que me cobró distinto por usar tarjeta?',
        a: 'En Defensa del Consumidor, con el trámite de consulta, reclamo o denuncia: es gratuito, se inicia en línea con usuario gub.uy o identidad digital, y por el 0800 7005 podés consultar cómo va. Llevá el ticket y, si podés, una foto del precio que estaba exhibido.',
      },
      {
        q: '¿Por qué el supermercado me cobra $ 30 con débito y el almacén no?',
        a: 'Porque cada venta con tarjeta le cuesta al comercio una comisión del servicio de POS, que pesa mucho más en una compra chica de un local chico. Desde 2020 la ley deja que cada comercio decida si pone un mínimo.',
      },
    ],
    related: [
      { label: 'Tarjetas de débito en Uruguay', to: '/tarjetas-de-debito-uruguay' },
      { label: 'Descuento de IVA con tarjeta', to: '/descuento-de-iva-con-tarjeta-uruguay' },
      { label: 'Tarjeta de débito vs crédito', to: '/guias/tarjeta-debito-vs-credito-uruguay' },
    ],
    sources: [
      {
        label:
          'Ley 19.210, texto vigente — el art. 64 figura derogado por la Ley 19.889; el art. 65 dice que los comercios "podrán optar por aceptar tarjetas de débito o crédito" y prohíbe a los emisores exigir ambos',
        url: 'https://www.impo.com.uy/bases/leyes/19210-2014',
        publisher: 'IMPO',
      },
      {
        label:
          'Ley 19.889 (LUC), art. 224 — "Deróganse los artículos 36, 36 BIS, 39, 40, 41, 41 BIS, 43, 44 y 64 de la Ley N° 19.210"',
        url: 'https://www.impo.com.uy/bases/leyes/19889-2020/224',
        publisher: 'IMPO',
      },
      {
        label:
          'Ley 19.210, documento actualizado — texto del art. 64, hoy derogado: prohibía cobrar "un precio mayor" con débito que con efectivo y limitar su aceptación "estableciendo montos mínimos para su uso"',
        url: 'https://www.bcu.gub.uy/Sistema-de-Pagos/Leyes_y_Decretos/Ley%2019210.pdf',
        publisher: 'BCU',
      },
      {
        label:
          'Ley 17.250, arts. 6, 12 y 15 — información "suficiente, clara, veraz"; la oferta precisa vincula a quien la emite; el precio "incluidos los impuestos" se informa antes de contratar',
        url: 'https://www.impo.com.uy/bases/leyes/17250-2000',
        publisher: 'IMPO',
      },
      {
        label:
          'Reducción de IVA por pagos con medios electrónicos — "dos puntos porcentuales"; con IVA mínimo o Monotributo "estos contribuyentes percibirán el importe total de la operación" y el crédito fiscal es de las entidades administradoras; en el régimen general, "un crédito por un monto equivalente al impuesto rebajado"; hasta el 31/12/2026, 1,64 % del monto con bienes "exentos o gravados"',
        url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/reduccion-iva-para-adquisiciones-se-abonen-traves-medios-electronicos-0',
        publisher: 'DGI',
      },
      {
        label:
          'Consulta, reclamo y/o denuncia en materia de defensa del consumidor — "No tiene costo", se inicia en línea con usuario gub.uy o identidad digital, duración estimada de 45 días corridos y el 0800 7005 para consultar el estado',
        url: 'https://www.gub.uy/tramites/consulta-reclamo-yo-denuncia-materia-defensa-consumidor',
        publisher: 'MEF / gub.uy',
      },
    ],
  },
  {
    slug: 'saldo-retenido-tarjeta-debito-uruguay',
    title: 'Saldo retenido en el débito: qué es y cómo se libera',
    description:
      'Saldo retenido o pendiente de ejecución: una preautorización de hotel, surtidor o alquiler de auto, o una comisión impaga. Cómo se libera y dónde reclamar.',
    tag: 'RETENCIÓN',
    updatedAt: '2026-09-13',
    sections: [
      {
        heading: '¿Qué es el saldo retenido si no saqué ningún préstamo?',
        body: 'Las apps de los bancos muestran con palabras parecidas dos cosas que no tienen nada que ver. Una es plata tuya bloqueada por una compra que se autorizó pero todavía no se cerró: el comercio pidió permiso para cobrarte un monto y el banco lo apartó del disponible hasta que la operación se confirme o se anule. La otra es un débito que el banco te tiene que hacer y no pudo, porque cuando fue a cobrarlo no había saldo, y que queda pendiente hasta que entre plata. La primera suele aparecer después de pasar la tarjeta en un hotel, una estación de servicio o una rentadora de autos; la segunda, cuando volvés a usar una cuenta que tuviste quieta durante meses. Antes de reclamar, abrí el detalle del movimiento: si tiene nombre de comercio, es lo primero; si dice comisión, costo de tarjeta o no tiene comercio, casi siempre es lo segundo.',
      },
      {
        heading: 'La preautorización: por qué el comercio bloquea más de lo que gastás',
        body: 'Una compra con tarjeta tiene dos momentos: la autorización, cuando el comercio consulta y el banco reserva el monto, y la compensación, cuando el cobro efectivamente se liquida. Las condiciones particulares de la tarjeta de débito Visa del BROU lo dicen con todas las letras al hablar de compras en el exterior, que "quedarán sujetas a eventuales ajustes por diferencias entre los tipos de cambio al momento de la autorización y de la efectiva compensación". En hoteles, surtidores y alquiler de autos el comercio autoriza un monto estimado o una garantía, y después cobra lo real. Las cifras pueden ser grandes: Avis Uruguay publica que, si no contratás cobertura, el monto a bloquear es "el total estimado de la renta más un adicional que varía entre los USD 3.000.- y los USD 5.000.-". La misma rentadora aclara que no acepta tarjetas de débito como depósito en garantía, porque no permiten el crédito posterior para devolverlo. Con una tarjeta de crédito, esa reserva come límite; con una de débito, come tu sueldo.',
      },
      {
        heading: '¿Cuánto tarda en liberarse una preautorización?',
        body: 'Ninguno de los tarifarios y cartillas de débito que revisamos de BROU, Itaú, Santander, BBVA, Scotiabank, OCA Blue y Prex publica un plazo fijo para que una preautorización vuelva al disponible, así que desconfiá de cualquier número redondo que te den como regla general. Lo que decide el plazo es el comercio: la reserva se libera cuando cobra el importe definitivo, que reemplaza a la autorización, o cuando la anula. Si pagaste el hotel en efectivo al irte, o el surtidor te cobró menos de lo autorizado, lo que corresponde es que el comercio anule o ajuste esa autorización. Pedile un comprobante de la anulación, porque es la prueba que te sirve para reclamarle al banco, que es quien tiene los datos de la operación. Mientras tanto esa plata no se puede usar, y es la mejor razón para no dejar como garantía la tarjeta de la cuenta donde cobrás el sueldo.',
      },
      {
        heading: 'Si dice "pendiente de ejecución", mirá las comisiones',
        body: 'Es el caso de la mayoría de las consultas: una cuenta quieta, sin saldo, que siguió generando cargos que el banco no pudo debitar. En el BROU, por ejemplo, la página de comisiones de cuentas de personas, consultada en septiembre de 2026, fija para la Cuenta Ahorro una comisión de administración de UI 30 mensuales, que no se cobra si el saldo promedio del mes supera $ 40.600 o US$ 1.000, un umbral que se actualiza cada año con la unidad indexada; y cobra el exceso de movimientos a UI 20 en sucursales y UI 15 en el resto de los canales, que con la bonificación promocional del 20 % que publica el banco quedan en UI 16 y UI 12. A eso se suman el costo de la tarjeta y otros cargos. Si cuando el banco va a cobrar no hay saldo, el cargo no se borra: queda pendiente. Por eso, apenas depositás, la plata "desaparece": el sistema cobra lo que tenía en espera. Las condiciones de su débito prevén incluso cobrar la comisión por uso en otras redes de cualquier otra cuenta que tengas en el banco, si la asociada a la tarjeta no tiene fondos.',
      },
      {
        heading: 'Compras en otra moneda: por qué no coincide lo retenido con lo cobrado',
        body: 'Cuando la compra es en dólares, en pesos argentinos o en cualquier moneda distinta a la de tu cuenta, lo que se reserva al autorizar es una estimación: el cobro final se hace con el tipo de cambio del momento de la compensación. El BROU lo escribe así en las condiciones de su tarjeta de débito: imputa el importe "según el tipo de cambio compra/venta que tengan vigente las Entidades Organizadoras en el momento de la compensación". Por eso una diferencia chica entre lo retenido y lo que al final se debita es esperable, y no hace falta reclamarla. Otra cosa es que el cargo aparezca dos veces, que la diferencia sea grande o que días después la reserva siga ahí además del débito definitivo: eso ya no es un ajuste de cambio sino algo para reclamar, con la fecha, el comercio y el importe de las dos operaciones anotados.',
      },
      {
        heading: 'Cuando no se libera: el orden del reclamo',
        body: 'Primero, al banco o a la emisora, por escrito y pidiendo número de reclamo. El BCU explica que las instituciones supervisadas tienen un servicio de atención de reclamos y que "a los 15 días corridos de recibido, la institución debe darte una respuesta"; ese plazo se puede prorrogar, pero te lo tienen que avisar. Si no contestan o la respuesta no te conforma, el paso siguiente depende del tema. Para cobros mal hechos, comisiones u operaciones que no reconocés, el trámite de denuncias del BCU deriva a Defensa del Consumidor, que es la que media con la institución; el BCU recibe las denuncias sobre presuntas infracciones como una puesta en conocimiento del regulador, que no es lo mismo que una mediación de tu caso. Si lo que ves es un cargo que nunca hiciste, ya no es una retención: es otro problema, con su propio procedimiento y sus propios plazos.',
        links: [
          { label: 'Me cobran algo que no autoricé', to: '/me-cobran-algo-que-no-autorice' },
          { label: 'Clonación de tarjetas', to: '/clonacion-de-tarjetas-uruguay' },
        ],
      },
    ],
    steps: [
      {
        name: 'Abrí el detalle del movimiento',
        text: 'Fijate si el monto retenido tiene nombre de comercio (preautorización) o dice comisión o costo (débito pendiente de ejecución).',
      },
      {
        name: 'Si es una preautorización, hablá con el comercio',
        text: 'Pedile que anule o ajuste la autorización y que te dé un comprobante de esa anulación.',
      },
      {
        name: 'Si es un débito pendiente, identificá el cargo',
        text: 'Buscá en el tarifario de tu banco qué comisión es y preguntá cómo dejar de generarla si la cuenta no la usás.',
      },
      {
        name: 'Reclamá por escrito al banco',
        text: 'Pedí número de reclamo: la institución tiene 15 días corridos para responder, prorrogables con aviso.',
      },
      {
        name: 'Si no te responden, escalá',
        text: 'Con el número de reclamo, iniciá el trámite ante Defensa del Consumidor o la denuncia ante el BCU, según el tema.',
      },
    ],
    faqs: [
      {
        q: '¿Por qué tengo saldo retenido si no saqué ningún préstamo ni adelanto?',
        a: 'Porque casi nunca es un préstamo: suele ser una preautorización de una compra que el comercio todavía no cerró, o una comisión que el banco no pudo cobrar por falta de saldo y quedó pendiente de ejecución. El detalle del movimiento te dice cuál de las dos es.',
      },
      {
        q: '¿Cuánto tarda en liberarse lo que retuvo un hotel o una estación de servicio?',
        a: 'Los bancos uruguayos que revisamos no publican un plazo fijo: la reserva se libera cuando el comercio cobra el importe final o anula la autorización. Si ya pagaste de otra forma, pedile al comercio la anulación y un comprobante, y con eso reclamá al banco.',
      },
      {
        q: 'Deposité plata y me la descontaron sola, ¿qué pasó?',
        a: 'Lo más probable es que el banco tuviera cargos pendientes, como la comisión de administración o el exceso de movimientos, que no pudo debitar mientras la cuenta estaba sin saldo. En el BROU, por ejemplo, la Cuenta Ahorro paga UI 30 por mes si el promedio no supera $ 40.600 o US$ 1.000 (página consultada en septiembre de 2026).',
      },
      {
        q: '¿Puedo dejar la tarjeta de débito como garantía para alquilar un auto?',
        a: 'Depende de la rentadora, y algunas no la aceptan: Avis Uruguay, por ejemplo, publica que no acepta tarjetas de débito como depósito en garantía. Aunque la acepten, el monto bloqueado sale de tu saldo disponible hasta que se libere.',
      },
      {
        q: '¿A quién le reclamo si la retención no se libera?',
        a: 'Primero a tu banco, por escrito y con número de reclamo: tiene 15 días corridos para responder. Si no responde o la respuesta no te sirve, los montos mal cobrados y las comisiones van a Defensa del Consumidor, según el propio trámite de denuncias del BCU.',
      },
    ],
    related: [
      { label: 'Tarjetas de débito en Uruguay', to: '/tarjetas-de-debito-uruguay' },
      { label: 'Me cobran algo que no autoricé', to: '/me-cobran-algo-que-no-autorice' },
      { label: 'Cómo abrir una cuenta bancaria', to: '/guias/abrir-una-cuenta-bancaria-uruguay' },
    ],
    sources: [
      {
        label:
          'Tarjeta de Débito Visa BROU, condiciones particulares — imputa "en el momento de la compensación" y las compras en el exterior "quedarán sujetas a eventuales ajustes por diferencias entre los tipos de cambio al momento de la autorización y de la efectiva compensación"',
        url: 'https://www.brou.com.uy/documents/20182/63929/cartilla-de-condiciones-particulares-tarjeta-debito.pdf/d8616172-e6bb-41be-a688-e5cf2adc3359',
        publisher: 'BROU',
      },
      {
        label:
          'Comisiones de cuentas de personas — Cuenta Ahorro: administración "UI 30 mensuales" salvo promedio mayor a $ 40.600 o US$ 1.000; exceso de movimientos "UI 20 – en Sucursales" y "UI 15 – en el resto de los canales", con una "Bonificación promocional de comisiones = 20%" (UI 16 y UI 12)',
        url: 'https://www.brou.com.uy/personas/cuentas/comisiones-cuentas',
        publisher: 'BROU',
      },
      {
        label:
          'Condiciones de alquiler en Uruguay — sin cobertura se bloquea "el total estimado de la renta más un adicional que varía entre los USD 3.000.- y los USD 5.000.-"; no se aceptan tarjetas de débito como garantía',
        url: 'https://reps-group.com/avis/condiciones/UY/',
        publisher: 'Avis Uruguay',
      },
      {
        label:
          'Reclamos y denuncias — "A los 15 días corridos de recibido, la institución debe darte una respuesta"; el plazo es prorrogable con aviso',
        url: 'https://usuariofinanciero.bcu.gub.uy/reclamos-y-denuncias/',
        publisher: 'BCU',
      },
      {
        label:
          'Denuncias de usuarios del sistema financiero — gratuito, con reclamo previo y 15 días corridos de espera; montos mal cobrados y comisiones se derivan a Defensa del Consumidor',
        url: 'https://www.gub.uy/tramites/denuncias-usuarios-sistema-financiero',
        publisher: 'BCU / gub.uy',
      },
    ],
  },
  {
    slug: 'transferencia-a-cuenta-equivocada-uruguay',
    title: 'Transferí a la cuenta equivocada: cómo recuperar la plata',
    description:
      'Si transferiste a otra cuenta por error o pagaste y no te mandaron el producto: la devolución que gestiona el banco, el pago indebido del Código Civil y la denuncia.',
    tag: 'TRANSFERENCIA',
    updatedAt: '2026-09-13',
    sections: [
      {
        heading: '¿El banco puede revertir la transferencia?',
        body: 'No por su cuenta, y esa es la parte que más frustra. Una transferencia confirmada no se anula: el BROU lo dice en su centro de asistencia y agrega la regla que explica todo lo demás, "El Banco no puede debitar fondos de una cuenta sin la autorización del titular". Lo que sí hace el banco es gestionar el contacto con quien recibió la plata para pedirle esa autorización. Si el destinatario firma, el banco debita y te devuelve; si no contesta o se niega, el banco no tiene cómo sacar la plata de esa cuenta y el camino pasa a ser legal. Por eso la primera hora cuenta: cuanto antes pidas la devolución, antes le llega el aviso a una persona que todavía no gastó lo que le cayó. Esa regla no es un capricho de un banco en particular: la cuenta de destino no es tuya ni del banco que usaste, y nadie la puede tocar sin su titular.',
      },
      {
        heading: 'Qué pedirle al banco y cuánto demora',
        body: 'En el BROU la solicitud se hace desde eBROU, en Administrar, Trámites varios, Transferencias, Solicitudes, o en una sucursal, y te llega por correo un número de caso. El banco dice que "usualmente, se brinda una respuesta a los 10 días hábiles de realizada la solicitud", y que si la transferencia fue a otro banco puede demorar más porque intervienen otras partes. Dos límites que conviene saber antes de empezar. El trámite es para destinatario equivocado: si te equivocaste en el importe o en la moneda, el BROU aclara que no interviene. Y el contacto con el destinatario lo hace el banco por teléfono y correo, desde el 2099 9399, sin pedir nunca contraseñas ni códigos, un dato útil también si alguna vez sos vos quien recibe plata ajena. En otros bancos el nombre del trámite cambia, pero pedí lo mismo: una solicitud de devolución por transferencia errónea, con número de reclamo.',
      },
      {
        heading: 'Quien recibió la plata tiene que devolverla',
        body: 'No es una cuestión de buena voluntad. El Código Civil, en la parte dedicada al pago indebido, dice en su artículo 1312 que "el que por error ha hecho un pago tiene derecho de repetir lo pagado, si prueba que no lo debía". El artículo 1316 completa la cuenta: quien recibe de buena fe una cantidad indebida "está obligado a restituir otro tanto", y quien la recibe de mala fe debe además "los intereses corrientes". Y puede haber un costado penal: el artículo 353 del Código Penal castiga, a denuncia del ofendido, la apropiación de cosas ajenas habidas por error o caso fortuito, con multa de 20 a 400 unidades reajustables. No hace falta recitarle artículos a nadie, pero sí ayuda saber que la persona que se niega a devolver no está en una zona gris.',
      },
      {
        heading: 'La denuncia policial ayuda, pero no destraba la plata',
        body: 'Es habitual leer que con una denuncia policial el banco ya puede devolverte la transferencia. No es lo que dice el banco: sin autorización del titular no debita, y para ese caso el BROU responde que "podés evaluar iniciar acciones judiciales con el debido asesoramiento legal". La denuncia sirve para otra cosa. Deja constancia fechada de los hechos, habilita la vía penal del artículo 353, que sólo se mueve a denuncia del ofendido, y puede ser lo que convenza al destinatario de firmar cuando se entera de que hay una causa abierta. Conviene hacerla en una comisaría con todo impreso: el comprobante de la transferencia con fecha y hora, el número de caso del banco, la respuesta del banco si ya la tenés y cualquier mensaje con la otra persona. Cuanto más ordenado llegues, más fácil es que la denuncia describa bien lo que pasó.',
      },
      {
        heading: 'Si no devuelve: la vía civil',
        body: 'Cuando el destinatario no autoriza y no hay acuerdo, lo que queda es reclamarle judicialmente la devolución de lo pagado por error, con los artículos 1312 y 1316 del Código Civil como base. Es un juicio, con abogado y con costos, y tiene sentido evaluarlo según el monto que está en juego. Si no podés pagar un abogado, hay puertas gratuitas, como la Defensoría Pública y el consultorio jurídico de la Facultad de Derecho, cada una con sus requisitos. Para ese momento, el expediente lo armás desde el primer día: el comprobante de la transferencia, el número de caso del banco, la respuesta del banco diciendo que el destinatario no autorizó, la denuncia policial y los mensajes. Todo eso prueba que el pago existió y que no lo debías, que es exactamente lo que exige el artículo 1312 para poder repetir lo pagado.',
        links: [{ label: 'Abogado gratis en Uruguay', to: '/guias/abogado-gratis-uruguay' }],
      },
      {
        heading: 'Pagaste y no te mandaron el producto: es otro problema',
        body: 'Acá no hubo error: vos elegiste a quién transferir, y el banco no se mete en una transferencia voluntaria aunque del otro lado haya un vendedor que no cumplió. El camino depende de quién te vendió. Si es un comercio o una empresa, es una relación de consumo y podés iniciar un reclamo ante Defensa del Consumidor, que es gratuito, se hace en línea y busca una mediación con el proveedor, por ejemplo para que te entregue el producto o te devuelva la plata. Si es un particular que te engañó para quedarse con tu dinero, la figura es la estafa, que el artículo 347 del Código Penal castiga con seis meses de prisión a cuatro años de penitenciaría, y va con denuncia policial. En los dos casos lo que pesa son las capturas de la publicación, la conversación, el comprobante y los datos de la cuenta de destino.',
        links: [
          { label: 'Estafas en Uruguay', to: '/estafas-uruguay' },
          { label: 'Derechos en compras online', to: '/derechos-consumidor-compras-online' },
        ],
      },
      {
        heading: 'Cómo no volver a pasar por esto',
        body: 'Antes de confirmar, leé el nombre del destinatario que te muestra la app y compará con el que esperabas: es el control más barato que existe y el que evita casi todos los errores de dígito. Si vas a mandar un monto grande a una cuenta nueva, hacé primero una transferencia chica y pedí que te confirmen que llegó. Guardá como destinatarios frecuentes las cuentas que usás seguido en lugar de tipear el número cada vez, o transferí con el alias, eligiendo de tu agenda el celular de alguien que ya conocés. Y para comprarle a desconocidos, preferí un medio donde un tercero retenga el pago hasta que recibas lo que compraste, en lugar de una transferencia directa, que no tiene vuelta atrás si del otro lado no cumplen.',
        links: [{ label: 'Alias para transferir', to: '/guias/alias-para-transferir-uruguay' }],
      },
    ],
    steps: [
      {
        name: 'Pedí la devolución el mismo día',
        text: 'En el BROU, desde eBROU (Administrar, Trámites varios, Transferencias, Solicitudes) o en sucursal; en otros bancos, la solicitud por transferencia errónea con número de reclamo.',
      },
      {
        name: 'Guardá todo con fecha',
        text: 'Comprobante de la transferencia, número de caso, correos del banco y cualquier contacto con el destinatario.',
      },
      {
        name: 'Esperá la respuesta del banco',
        text: 'El BROU responde usualmente en 10 días hábiles; si la cuenta de destino es de otro banco puede demorar más.',
      },
      {
        name: 'Si el destinatario no autoriza, hacé la denuncia',
        text: 'En una comisaría, por apropiación de cosa habida por error (art. 353 del Código Penal), con todo el respaldo impreso.',
      },
      {
        name: 'Evaluá la vía civil',
        text: 'Con abogado o una consulta jurídica gratuita, el reclamo de repetición del pago indebido (arts. 1312 y 1316 del Código Civil).',
      },
    ],
    faqs: [
      {
        q: '¿El banco puede devolverme una transferencia que hice por error?',
        a: 'No puede anularla ni debitar la cuenta de destino sin autorización de su titular. Lo que hace es contactar a quien la recibió para pedirle esa autorización; si firma, te devuelven la plata, y si no, queda la vía legal.',
      },
      {
        q: '¿Cuánto demora la devolución en el BROU?',
        a: 'El BROU indica que usualmente responde a los 10 días hábiles de hecha la solicitud, y que puede demorar más si la transferencia fue a otro banco. La solicitud se inicia en eBROU o en una sucursal.',
      },
      {
        q: 'Si la persona no quiere devolver la plata, ¿comete un delito?',
        a: 'Puede incurrir en la apropiación de cosas habidas por error del artículo 353 del Código Penal, que se persigue a denuncia del ofendido con multa de 20 a 400 UR. Además, el Código Civil la obliga a restituir lo recibido, con intereses si actuó de mala fe.',
      },
      {
        q: 'Con la denuncia policial, ¿el banco ya me puede devolver?',
        a: 'No. La denuncia deja constancia y abre la vía penal, pero el banco sigue sin poder debitar la cuenta ajena sin autorización del titular. Si no hay acuerdo, el reclamo de la plata es judicial.',
      },
      {
        q: 'Me equivoqué en el monto, no en la cuenta, ¿qué hago?',
        a: 'El trámite de devolución del BROU es sólo para destinatario equivocado: si el error fue de importe o de moneda, el banco aclara que no interviene. Tenés que arreglarlo directamente con quien recibió el pago.',
      },
      {
        q: 'Pagué por transferencia y no me mandaron el producto, ¿el banco me ayuda?',
        a: 'No, porque la transferencia fue voluntaria. Si el vendedor es un comercio, reclamá ante Defensa del Consumidor; si es un particular que te engañó, hacé la denuncia por estafa (artículo 347 del Código Penal).',
      },
      {
        q: 'Me llegó una transferencia que no es mía, ¿qué hago?',
        a: 'No la gastes: el Código Civil te obliga a devolverla. En el BROU la devolución se autoriza desde eBROU o firmando en una sucursal; desconfiá de cualquier llamado que te pida contraseñas o códigos, porque el banco no los pide.',
      },
    ],
    related: [
      { label: 'Estafas en Uruguay', to: '/estafas-uruguay' },
      {
        label: 'Cómo evitar estafas financieras',
        to: '/guias/como-evitar-estafas-financieras-uruguay',
      },
      { label: 'Abogado gratis en Uruguay', to: '/guias/abogado-gratis-uruguay' },
      { label: 'Comisiones de transferencia', to: '/comisiones-de-transferencia-uruguay' },
    ],
    sources: [
      {
        label:
          'Asistencia eBROU, transferencias erróneas — la transferencia confirmada no se anula; "El Banco no puede debitar fondos de una cuenta sin la autorización del titular"; respuesta usual "a los 10 días hábiles"; no aplica a errores de importe o moneda; contacto desde el 2099 9399 y "nunca se solicitan contraseñas"',
        url: 'https://asistencia.brou.com.uy/preguntas/categoria/e-brou',
        publisher: 'BROU',
      },
      {
        label:
          'Código Civil, art. 1312 (pago indebido) — "El que por error ha hecho un pago tiene derecho de repetir lo pagado, si prueba que no lo debía"',
        url: 'https://www.impo.com.uy/bases/codigo-civil/16603-1994/1312',
        publisher: 'IMPO',
      },
      {
        label:
          'Código Civil, art. 1316 — quien recibe de buena fe una cantidad indebida "está obligado a restituir otro tanto"; de mala fe "debe también los intereses corrientes"',
        url: 'https://www.impo.com.uy/bases/codigo-civil/16603-1994/1316',
        publisher: 'IMPO',
      },
      {
        label:
          'Código Penal, art. 353 — apropiación de cosas habidas por error o caso fortuito, castigada "mediante denuncia del ofendido" con multa de 20 UR a 400 UR',
        url: 'https://www.impo.com.uy/bases/codigo-penal/9155-1933/353',
        publisher: 'IMPO',
      },
      {
        label:
          'Código Penal, art. 347 (estafa) — "seis meses de prisión a cuatro años de penitenciaría"',
        url: 'https://www.impo.com.uy/bases/codigo-penal/9155-1933/347',
        publisher: 'IMPO',
      },
      {
        label:
          'Consulta, reclamo y/o denuncia en materia de defensa del consumidor — reclamo sin costo, iniciado en línea, por mediación con el proveedor',
        url: 'https://www.gub.uy/tramites/consulta-reclamo-yo-denuncia-materia-defensa-consumidor',
        publisher: 'MEF / gub.uy',
      },
    ],
  },
  {
    slug: 'recibir-transferencia-del-exterior-uruguay',
    title: 'Recibir plata del exterior: cuánto cobra cada banco',
    description:
      'Lo que cobran BROU, Itaú, Santander, BBVA y Scotiabank por un SWIFT recibido según sus tarifarios de 2026, con ejemplos por monto, por qué rebota y dónde entra Wise.',
    tag: 'SWIFT',
    updatedAt: '2026-09-13',
    sections: [
      {
        heading: 'Qué te descuentan cuando te llega un SWIFT',
        body: 'Una transferencia internacional recibida paga, como mínimo, dos cosas. La comisión de tu banco por acreditarla, que cada uno publica en su tarifario y es la que compara esta guía. Y los gastos de los bancos por los que pasa la plata en el camino, los intermediarios o corresponsales, que pueden descontarse del monto antes de que llegue. El BROU lo aclara en su página: su comisión no incluye "eventuales gastos y tarifas que cobren los Bancos emisores, Bancos intermediarios o corresponsales". Itaú, en cambio, publica una escala propia de costo de corresponsal además de su comisión. Por eso el mismo envío de US$ 1.000 puede llegar con distinto neto según el banco y según cómo lo instruya quien te paga: si del otro lado aceptan hacerse cargo de los gastos del envío, llega más limpio. Lo que no cambia es que la comisión de recepción la paga el que recibe, así que conviene elegir el banco antes de pasarle los datos al cliente.',
      },
      {
        heading: 'La tabla: cuánto cobra cada banco por recibir',
        body: 'Estas son las comisiones para personas físicas que figuran en los tarifarios vigentes a septiembre de 2026, sin contar gastos de intermediarios salvo donde el banco los publica. Las diferencias de estructura importan más que el número suelto: BROU y Scotiabank cobran un porcentaje con mínimo y máximo, Santander un tanto por mil con mínimo y máximo, Itaú un fijo más una escala de corresponsal por tramo, y BBVA un porcentaje para montos chicos y un fijo por encima de US$ 150. Si tu banco no está acá, buscá en su tarifario el rubro de órdenes de pago o giros recibidos del exterior: casi todos lo publican con ese nombre. Y mirá también qué pasa con la moneda: BBVA, por ejemplo, aclara que cobra en la moneda de la transferencia recibida.',
        table: {
          headers: ['Banco', 'Comisión por recibir', 'Condiciones que publica', 'Tarifario'],
          rows: [
            [
              'BROU',
              '0,4 % (mínimo US$ 35, máximo US$ 100)',
              'No incluye gastos de bancos intermediarios; devuelve las recibidas por menos de US$ 100',
              'Página Recibir del exterior, consultada el 13/9/2026',
            ],
            [
              'Itaú',
              'US$ 10 más costo de corresponsal',
              'Corresponsal: US$ 10 (101 a 500), US$ 15 (501 a 2.000), US$ 25 (2.001 a 20.000), US$ 35 (más de 20.000)',
              'Manual de tarifas, septiembre de 2026',
            ],
            [
              'Santander',
              '1,65 por mil (mínimo US$ 28, máximo US$ 145)',
              'Giros recibidos internacionales por SWIFT MT103',
              'Manual de tarifas, versión 12/09/2026',
            ],
            [
              'BBVA',
              '20 % hasta US$ 150; US$ 30 por encima',
              'Se cobra en la moneda de la transferencia recibida',
              'Manual de tarifas, actualizado el 3/9/2026',
            ],
            [
              'Scotiabank',
              '0,20 % (mínimo US$ 17,50, máximo US$ 200)',
              'Se suma la prima por billete si corresponde; sin comisión si va a plazo fijo',
              'Cartilla del paquete Cuenta Sueldo (convenio), vigente desde el 1/7/2026',
            ],
          ],
        },
        links: [
          {
            label: 'Comisiones de transferencia locales',
            to: '/comisiones-de-transferencia-uruguay',
          },
        ],
      },
      {
        heading: 'Ejemplo: cuánto se queda cada banco según el monto',
        body: 'Aplicando esas tarifas tal como están publicadas, sin más gastos de intermediarios que la escala de corresponsal que publica Itaú, la foto cambia bastante según el monto. En envíos de US$ 500 a US$ 1.000 pesan los mínimos: el BROU no baja de US$ 35 y Santander no baja de US$ 28, mientras que Scotiabank arranca en US$ 17,50. En envíos grandes pesan los máximos y los fijos: a US$ 30.000 el BROU topea en US$ 100, Santander cobra US$ 49,50 y BBVA sigue en US$ 30. Si cobrás seguido montos chicos, lo que más te conviene mirar es el mínimo; si cobrás pocas veces montos grandes, el máximo o el fijo. Juntar varios cobros en uno solo, cuando el cliente lo acepta, baja el costo por dólar en los bancos con mínimo alto, porque pagás el piso una vez en lugar de varias.',
        table: {
          headers: ['Monto recibido', 'BROU', 'Itaú', 'Santander', 'BBVA', 'Scotiabank'],
          rows: [
            ['US$ 500', 'US$ 35', 'US$ 20', 'US$ 28', 'US$ 30', 'US$ 17,50'],
            ['US$ 1.000', 'US$ 35', 'US$ 25', 'US$ 28', 'US$ 30', 'US$ 17,50'],
            ['US$ 10.000', 'US$ 40', 'US$ 35', 'US$ 28', 'US$ 30', 'US$ 20'],
            ['US$ 30.000', 'US$ 100', 'US$ 45', 'US$ 49,50', 'US$ 30', 'US$ 60'],
          ],
        },
      },
      {
        heading: '¿Por qué rebota una transferencia al BROU?',
        body: 'En los foros se repite que el BROU rechaza todo lo que viene de ciertas plataformas, pero no encontramos ninguna regla publicada por el banco que lo diga. Lo que sí está escrito explica buena parte de los rebotes. El BROU pide que el número de cuenta vaya en 14 dígitos consecutivos, sin puntos ni guiones, con el código SWIFT BROUUYMM, y que el nombre del beneficiario coincida con el del titular de la cuenta, junto con su dirección. Además, devuelve al ordenante las transferencias recibidas por menos de US$ 100, salvo excepciones como las de pasividades. Un número de cuenta en formato viejo, un nombre abreviado o una dirección distinta de la registrada alcanzan para que el pago no se acredite. Antes de pasar tus datos, copiá el formato exacto que muestra tu banco para recibir del exterior y mandáselo al cliente por escrito, no dictado.',
      },
      {
        heading: 'Wise en Uruguay: qué hace y qué no',
        body: 'Wise sirve para cobrarle a un cliente del exterior y después pasar la plata a tu banco, pero conviene entender el recorrido. Lo que su centro de ayuda documenta para Uruguay es el envío de pesos uruguayos a una cuenta bancaria local, con nombre completo, dirección, cédula de 8 dígitos, número de cuenta de hasta 20 dígitos, tipo de cuenta y banco, y un tope de 10,5 millones de pesos por transferencia. Una vez que Wise recibe y convierte la plata, la llegada suele tomar dos días hábiles, y la conversión puede sumar hasta dos días hábiles más. Traducido: tus dólares se convierten a pesos en Wise antes de entrar a tu cuenta, así que el tipo de cambio de Wise pasa a ser parte del costo. Si lo que necesitás es tener dólares en tu banco uruguayo, eso vuelve a ser una transferencia internacional y aplica la tabla de arriba. Compará las dos rutas por el neto final, no por la comisión anunciada.',
      },
      {
        heading: 'PayPal, Payoneer y las plataformas: el costo está en otro lado',
        body: 'Con las plataformas de cobro la comisión del banco uruguayo suele ser lo de menos: el costo está en el porcentaje que se queda la plataforma al recibir el pago, en el tipo de cambio si convierte y en el cargo por retirar a tu cuenta local. Por eso no sirve comparar la comisión SWIFT de tu banco contra la idea de que la plataforma es gratis: hay que sumar las tres capas. Antes de aceptar una forma de pago, preguntale al cliente en qué moneda te paga y por qué vía, abrí la página de tarifas vigente de la plataforma para Uruguay y hacé la cuenta con un cobro real. En los cobros del exterior hay además un tema que no es de costo sino de papeles: el banco puede pedirte que justifiques de dónde viene la plata, con la factura o el contrato con el cliente, y cuanto antes lo tengas armado, menos se traba la acreditación.',
        links: [
          { label: 'Contractor en Uruguay', to: '/contractor-en-uruguay' },
          {
            label: 'Trabajar para el exterior',
            to: '/guias/trabajar-para-el-exterior-desde-uruguay',
          },
        ],
      },
      {
        heading: 'Qué hacer con los dólares cuando llegan',
        body: 'La comisión de recepción es sólo la primera parte del costo si después convertís. Quien cobra del exterior suele necesitar pesos para vivir, y ahí el spread entre la compra y la venta puede costar más que el propio SWIFT. Una vez acreditados los dólares, compará dónde venderlos antes de hacerlo en tu mismo banco por comodidad: el precio cambia entre bancos y casas de cambio, y en un monto grande la diferencia se nota. Si vas a pagar cosas en dólares o a volver a sacar plata del país, dejarla en dólares te ahorra dos conversiones. La parte de impuestos es un tema aparte del costo de la transferencia: si lo que cobrás es por un trabajo hecho para el exterior, cómo se factura y qué se declara lo explicamos en otra guía.',
        links: [
          {
            label: 'Cobrar en dólares y gastar en pesos',
            to: '/cobrar-en-dolares-gastar-en-pesos',
          },
          { label: 'Comparar cotizaciones', to: '/comparar' },
        ],
      },
    ],
    faqs: [
      {
        q: '¿Hay algún banco que no cobre por recibir transferencias del exterior?',
        a: 'Entre los tarifarios vigentes de BROU, Itaú, Santander, BBVA y Scotiabank, todos cobran por una orden de pago recibida del exterior. Con esas tarifas, entre US$ 500 y US$ 10.000 el más barato de los cinco es Scotiabank (0,20 % con piso de US$ 17,50, según la cartilla de su paquete Cuenta Sueldo vigente desde el 1/7/2026), y en montos grandes gana el fijo de US$ 30 de BBVA.',
      },
      {
        q: '¿Por qué el BROU me cobró US$ 35 por una transferencia chica?',
        a: 'Porque su comisión para personas es 0,4 % con un mínimo de US$ 35 y un máximo de US$ 100: en cualquier monto por debajo de US$ 8.750 pagás el mínimo. Además, el BROU devuelve las transferencias recibidas por menos de US$ 100.',
      },
      {
        q: '¿Cuánto cobra Itaú por recibir una transferencia del exterior?',
        a: 'Según su manual de tarifas de septiembre de 2026, US$ 10 para personas físicas más un costo de corresponsal que va de US$ 10 (entre US$ 101 y 500) a US$ 35 (más de US$ 20.000). Una transferencia de US$ 1.000 queda en US$ 25 en total.',
      },
      {
        q: '¿Puedo usar Wise para pasar la plata al BROU?',
        a: 'Wise documenta el envío de pesos uruguayos a cuentas bancarias locales y pide nombre, dirección, cédula de 8 dígitos, número y tipo de cuenta y banco. Si el pago rebota, revisá primero los datos: el BROU exige que el nombre del beneficiario coincida con el titular y que la cuenta vaya en 14 dígitos.',
      },
      {
        q: '¿Qué le tengo que pasar al cliente para que me transfiera al BROU?',
        a: 'El número de cuenta de 14 dígitos sin puntos ni guiones, el código SWIFT BROUUYMM, tu nombre tal como figura en la cuenta, tu dirección y los datos del banco. El BROU publica además los bancos corresponsales que usa según la moneda.',
      },
      {
        q: '¿Conviene cobrar por PayPal o Payoneer en vez de por banco?',
        a: 'Depende del monto y la frecuencia. En esas plataformas el costo está en el porcentaje sobre cada cobro, la conversión de moneda y el retiro a tu banco; sumá las tres capas con un cobro real y comparalo con la comisión SWIFT de tu banco.',
      },
    ],
    related: [
      { label: 'Contractor en Uruguay', to: '/contractor-en-uruguay' },
      { label: 'Comisiones de transferencia', to: '/comisiones-de-transferencia-uruguay' },
      {
        label: 'Enviar y recibir dinero del exterior',
        to: '/guias/enviar-recibir-dinero-exterior',
      },
      { label: 'Trabajar para el exterior', to: '/guias/trabajar-para-el-exterior-desde-uruguay' },
    ],
    sources: [
      {
        label:
          'BROU, recibir del exterior (personas) — comisión "0,4%" con mínimo "U$S 35" y máximo "U$S 100", sin gastos de intermediarios; cuenta de 14 dígitos, SWIFT BROUUYMM y devolución de lo recibido por menos de US$ 100',
        url: 'https://www.brou.com.uy/personas/servicios/giros-transferencias/recibir-exterior',
        publisher: 'BROU',
      },
      {
        label:
          'Itaú, manual de tarifas (septiembre de 2026), 8.1 Órdenes de pago recibidas del exterior — "Personas Físicas U$S 10" más costo de corresponsal de U$S 10 a U$S 35 según el monto',
        url: 'https://www.itau.com.uy/inst/aci/docs/tarifario.pdf',
        publisher: 'Itaú Uruguay',
      },
      {
        label:
          'Santander, manual de tarifas (versión 12/09/2026), 3.3 Giros recibidos internacionales — "1,65 por mil del monto, Mínimo USD 28 y máximo USD 145"',
        url: 'https://www.santander.com.uy/sites/default/files/manual-de-tarifas/Manual_de_Tarifas_20260912.pdf',
        publisher: 'Santander Uruguay',
      },
      {
        label:
          'BBVA, manual de tarifas y comisiones (3 de septiembre de 2026), 21.2 Órdenes de pago recibidas del exterior — 20 % hasta USD 150 y USD 30 por encima',
        url: 'https://www.bbva.com.uy/content/dam/public-web/uruguay/documents/NuevoTarifario2024.pdf',
        publisher: 'BBVA Uruguay',
      },
      {
        label:
          'Scotiabank, cartilla del paquete Cuenta Sueldo (convenio), vigente desde el 1/7/2026 — órdenes de pago recibidas del exterior: "0,20% Mínimo U$S 17,50 / Máximo U$S 200.-"',
        url: 'https://cdn.aglty.io/scotiabank-uruguay/cartillas-condiciones-de-productos/bp/2026/07-julio/01/F2461_20260701_BP-PAQUETE_CUENTA_SUELDO-CONVENIO.pdf',
        publisher: 'Scotiabank Uruguay',
      },
      {
        label:
          'Wise, guía de transferencias en pesos uruguayos — datos del destinatario (cédula de 8 dígitos, cuenta de hasta 20 dígitos), hasta 10,5 millones de UYU por envío y unos 2 días hábiles de llegada',
        url: 'https://wise.com/help/articles/2977940/guide-to-uyu-transfers',
        publisher: 'Wise',
      },
    ],
  },
  {
    slug: 'alias-para-transferir-uruguay',
    title: 'Alias para transferir: cómo funciona con tu celular',
    description:
      'En Uruguay el alias es tu celular asociado a tu cuenta: cómo se activa en BROU e Itaú, si sirve entre bancos distintos, qué cuesta, qué tope tiene y qué datos ve el otro.',
    tag: 'ALIAS',
    updatedAt: '2026-09-13',
    sections: [
      {
        heading: '¿Qué es el alias para transferir en Uruguay?',
        body: 'Es tu número de celular funcionando como dirección de tu cuenta. El BCU lo explica en su portal para usuarios: podés asociar un alias a tu cuenta, como tu número de celular, para que te transfieran con ese dato en lugar del número de cuenta. En septiembre de 2024 lo presentó como uno de los hitos del sistema de pagos, una "modalidad que permite asociar el número de cuenta al número de celular". No es el alias argentino de tres palabras: acá, en la práctica, es el celular. Los términos de Itaú ya prevén otros formatos, como un correo electrónico, cadenas de texto o un código QR, pero lo que describen hoy los bancos para transferir entre personas es el número de móvil. La transferencia en sí no cambia: sale de la app de tu banco como cualquier otra, sólo que en vez de tipear el número de cuenta elegís un contacto o escribís un celular.',
      },
      {
        heading: 'Cómo se activa en el BROU y en Itaú',
        body: 'Para recibir, cada banco te pide activar el servicio y elegir a qué cuentas llega la plata. En el BROU se hace en eBROU, en el menú Administrar, Cuentas para recibir transferencias al celular: habilitás el número que figura en tu información personal, asociás una cuenta en pesos y una en dólares, o sólo una, aceptás las condiciones y confirmás con un código que te llega por SMS. En Itaú está en la app, en el menú de arriba a la derecha, Transferencias a Contactos: seguís la adhesión, confirmás tu número y asociás tus cuentas favoritas en pesos o en dólares, y lo que te transfieran a tu celular se acredita ahí. Para enviar no necesitás haber activado la recepción: escribís el número o lo elegís de tu agenda, y la app te muestra si ese contacto tiene un alias confirmado. Si tenés cuentas en más de un banco, la activación se hace en cada uno.',
      },
      {
        heading: '¿Sirve para transferir a otro banco?',
        body: 'Sí, y esa es la gracia. El BROU responde en su asistencia que se puede transferir a un celular "siempre y cuando ese celular tenga asociada una cuenta en el BROU u otro banco local", y los términos de Itaú hablan de transferir a contactos con un alias confirmado por el propio banco, por otra institución de intermediación financiera o por una institución emisora de dinero electrónico. O sea que el alias es interoperable: el celular de alguien de otro banco o de una billetera regulada funciona igual, siempre que esa persona lo haya activado. Dos límites. El número puede ser extranjero, pero la cuenta tiene que ser de una institución local, y por esta vía no se hacen transferencias internacionales. Y si la otra persona nunca asoció su número, la app no la va a encontrar como alias y vas a tener que pedirle el número de cuenta como siempre.',
      },
      {
        heading: '¿Cuánto cuesta y cuál es el tope?',
        body: 'El alias no tiene tarifa propia: cuesta lo mismo que la transferencia que termina siendo. El BROU lo dice así: "Las tarifas son las mismas que aplican a los servicios de transferencias a cuentas BROU y SPI", y entre bancos se liquida por el Sistema de Pagos Interbancarios. Con los topes conviene mirar tu banco: los términos de Itaú, por ejemplo, se reservan poner límites por monto o por cantidad. Como referencia, el BCU describía en septiembre de 2024 las transferencias interbancarias instantáneas como de "hasta aproximadamente 20.000 pesos, en tiempo real, las 24 horas, los 365 días", y la cartilla de Scotiabank vigente desde el 1/7/2026 sólo habilita el giro instantáneo por importes menores a US$ 500 o $ 22.000; por encima figura como "No habilitado" y hay que ir por la transferencia común. Cuánto cobra cada banco por cada tipo de transferencia lo tenemos comparado aparte.',
        links: [
          {
            label: 'Comisiones de transferencia por banco',
            to: '/comisiones-de-transferencia-uruguay',
          },
        ],
      },
      {
        heading: '¿Qué datos ve el que me transfiere?',
        body: 'Tu nombre, y eso es a propósito. Los términos de Itaú establecen que, para dar el servicio, el banco puede informar nombre, apellido y número de cuenta del cliente vinculado al alias, y que esa información "podrá ser proporcionada a cualquier usuario del servicio de Transferencia por Alias que identifique el Alias del Cliente". Es el mismo principio que te protege cuando mandás plata: ver el nombre del titular antes de confirmar es lo que te permite darte cuenta de que te equivocaste de persona. Lo que no se comparte es tu agenda: Itaú aclara que no va a compartir información de tus contactos y que la app sólo procesa los números de móvil para ver cuáles tienen alias, sin guardar los contactos. Si no querés que alguien te transfiera con tu celular, no tenés que activar nada: podés seguir pasando el número de cuenta, porque el alias es opcional.',
      },
      {
        heading: 'Por qué conviene, y el cuidado que sigue haciendo falta',
        body: 'La ventaja principal es sacar del medio el número de cuenta, que es donde se cometen los errores: dígitos de más o de menos, ceros, números de sucursal viejos o capturas de pantalla desactualizadas. Con el alias elegís a una persona de tu agenda y la app te devuelve su nombre. El BCU apunta en la misma dirección con el enmascaramiento del número de cuenta, que según su comunicado "ayuda al emisor a verificar el nombre del beneficiario". Pero el celular no es infalible: si tipeás un número a mano y le errás a un dígito, podés caer en el alias de otra persona. La regla que sirve para cualquier transferencia sigue valiendo: antes de confirmar, leé el nombre que te muestra la app. Si igual te equivocaste, la devolución se le pide al banco y depende de que la otra persona la autorice.',
        links: [
          {
            label: 'Transferí a la cuenta equivocada',
            to: '/guias/transferencia-a-cuenta-equivocada-uruguay',
          },
        ],
      },
      {
        heading: 'Si cambiás de número o querés desactivarlo',
        body: 'El alias sigue a tu línea, no a tu teléfono. En el BROU el número se cambia desde eBROU, en Información Personal, Modificar teléfono celular, y el cambio se confirma con la Llave Digital. Para dejar de recibir por celular, en el mismo menú de cuentas para recibir transferencias al celular elegís deshabilitar y confirmás con tu contraseña de eBROU. Conviene revisarlo cada vez que cambiás de línea o cerrás una de las cuentas asociadas, para que la plata que te manden con tu número llegue a una cuenta que sigas usando. Y si alguien te pide que actives o cambies el alias por teléfono o por mensaje, cortá: el cambio lo hacés vos, desde la app o la web de tu banco, con tu propia clave.',
      },
    ],
    faqs: [
      {
        q: '¿Qué es el alias para transferir en Uruguay?',
        a: 'Es tu número de celular asociado a tus cuentas, para que te puedan transferir con ese dato en lugar del número de cuenta. Se activa en la app o la web de tu banco y la transferencia sale como cualquier otra.',
      },
      {
        q: '¿Puedo recibir con mi celular si la otra persona es de otro banco?',
        a: 'Sí. El BROU confirma que se puede transferir a un celular que tenga asociada una cuenta en el BROU u otro banco local, y los términos de Itaú incluyen alias confirmados por otros bancos y por emisores de dinero electrónico.',
      },
      {
        q: '¿Transferir con el celular cuesta más?',
        a: 'No. El alias no tiene tarifa propia: se cobra lo mismo que la transferencia equivalente, sea dentro del mismo banco o hacia otro por el sistema de pagos interbancarios.',
      },
      {
        q: '¿El que me transfiere ve mis datos?',
        a: 'Ve tu nombre y, según los términos de Itaú, el banco puede informar nombre, apellido y número de cuenta a quien identifique tu alias. Ver el nombre es lo que le permite confirmar que no se equivocó de persona.',
      },
      {
        q: '¿Hay un tope para transferir con el alias?',
        a: 'Depende del banco y de si la transferencia sale como instantánea. Como referencia, Scotiabank sólo habilita la transferencia instantánea por menos de US$ 500 o $ 22.000 (cartilla vigente desde el 1/7/2026); por encima hay que usar la transferencia común.',
      },
      {
        q: '¿Tengo que dar mi celular para recibir transferencias?',
        a: 'No. El alias es opcional: podés seguir pasando tu número de cuenta a quien no quieras darle el celular, y usar el alias con amigos o familia que ya lo tienen.',
      },
    ],
    related: [
      { label: 'Comisiones de transferencia', to: '/comisiones-de-transferencia-uruguay' },
      { label: 'Billeteras digitales', to: '/guias/billeteras-digitales-uruguay-como-funcionan' },
      {
        label: 'Transferí a la cuenta equivocada',
        to: '/guias/transferencia-a-cuenta-equivocada-uruguay',
      },
    ],
    sources: [
      {
        label:
          'Tipos de medios de pago — las transferencias inmediatas funcionan las 24 horas y podés asociar a tu cuenta un alias, como tu número de celular',
        url: 'https://usuariofinanciero.bcu.gub.uy/medios-de-pago/tipos-de-medios-de-pago/',
        publisher: 'BCU',
      },
      {
        label:
          'Hitos del sistema de pagos (12/9/2024) — el alias como "modalidad que permite asociar el número de cuenta al número de celular"; instantáneas "hasta aproximadamente 20.000 pesos"; el enmascaramiento "ayuda al emisor a verificar el nombre del beneficiario"',
        url: 'https://www.bcu.gub.uy/Comunicaciones/Paginas/Detalle-Noticia.aspx?noticia=362&title=El-BCU-present%C3%B3-los-hitos-en-el-sistema-de-pagos-que-mejoran-servicios-y-reducen-costos-para-los-usuarios',
        publisher: 'BCU',
      },
      {
        label:
          'Asistencia eBROU, transferencias a celulares — cómo asociar una cuenta en pesos y/o una en dólares, transferir a celulares con cuenta en otro banco local, "las tarifas son las mismas" que en transferencias BROU y SPI, y cambio de número con Llave Digital',
        url: 'https://www.asistencia.brou.com.uy/preguntas/categoria/e-brou/transferencia-a-celulares',
        publisher: 'BROU',
      },
      {
        label:
          'Términos y condiciones de Transferencia por Alias — alias confirmados por otras instituciones y emisores de dinero electrónico, límites a criterio del banco y datos del titular (nombre, apellido, número de cuenta) que se informan a quien identifica el alias',
        url: 'https://www.itau.com.uy/inst/aci/docs/BIU%20Terminos%20y%20Condiciones%20-%20Transferencia%20a%20celulares.pdf',
        publisher: 'Itaú Uruguay',
      },
      {
        label:
          'Tutorial de Transferencias a Contactos — adhesión desde la app y cuentas favoritas en pesos y/o dólares; "Itaú no va a compartir información de tu agenda"',
        url: 'https://www.itau.com.uy/inst/aci/docs/Tutorial%20Transferencias%20a%20Contactos.pdf',
        publisher: 'Itaú Uruguay',
      },
      {
        label:
          'Scotiabank, cartilla del paquete Cuenta Sueldo (convenio), vigente desde el 1/7/2026 — giros instantáneos a bancos de plaza sólo por importes menores a USD 500 o $ 22.000; por encima, "No habilitado"',
        url: 'https://cdn.aglty.io/scotiabank-uruguay/cartillas-condiciones-de-productos/bp/2026/07-julio/01/F2461_20260701_BP-PAQUETE_CUENTA_SUELDO-CONVENIO.pdf',
        publisher: 'Scotiabank Uruguay',
      },
    ],
  },
  {
    slug: 'usar-tarjeta-uruguaya-en-argentina',
    title: 'Tarjeta uruguaya en Argentina: qué dólar te aplican',
    description:
      'Qué dólar te aplican al pagar en Argentina con una tarjeta uruguaya, qué dice el BCRA sobre tarjetas extranjeras, el recargo de cada emisor y cuándo conviene el efectivo.',
    tag: 'ARGENTINA',
    updatedAt: '2026-09-13',
    sections: [
      {
        heading: 'Qué pasa cuando pagás en pesos argentinos con tu tarjeta',
        body: 'Hay tres pasos y en ninguno interviene la pizarra de tu banco en Uruguay. El comercio argentino te cobra en pesos argentinos; la red de la tarjeta, Visa o Mastercard, convierte esa compra a dólares; y tu banco te la debita en dólares o, si la tarjeta está asociada sólo a una cuenta en pesos uruguayos, te la vuelve a convertir. La cartilla de BBVA lo describe tal cual: "Toda compra que se realice en el exterior será convertida a USD (dólares americanos) y luego se debitará de la cuenta en USD que tenga asociada la tarjeta de débito"; si no hay cuenta en dólares, el importe en USD se convierte a pesos uruguayos. Sobre esa cadena se suman dos costos que dependen de tu emisor: la comisión por compra en el exterior y, en algunos casos, un adicional sobre el tipo de cambio de la red. Por eso la misma compra en Buenos Aires puede salirte distinto con cada tarjeta que tenés en la billetera.',
      },
      {
        heading: 'El dólar para turistas: qué dice el BCRA',
        body: 'Argentina trata distinto la plata que entra por los consumos de turistas. Las normas cambiarias del BCRA, en su texto ordenado al 25 de agosto de 2025, exceptúan de la obligación de liquidar en el mercado de cambios "los cobros por consumos en el país efectuados por no residentes mediante tarjetas de débito, crédito, compra o prepagas emitidas en el exterior", y extienden la excepción a billeteras electrónicas o pagos con débito inmediato en una cuenta del exterior. La norma no fija qué tipo de cambio te aplican, pero por esa excepción la conversión de tus compras con tarjeta puede no coincidir con el dólar oficial argentino del día. Cuánto se separa una cotización de la otra depende del mercado argentino en cada momento, y no hay una cifra fija que valga para todo el viaje: miralo cerca de la fecha en nuestro tablero regional, que muestra en paralelo los distintos dólares argentinos, y compará con lo que te debitó tu banco en la primera compra.',
        links: [
          { label: 'Cotizaciones de la región', to: '/cotizaciones-de-la-region' },
          { label: 'Dólar blue hoy', to: '/dolar-blue-hoy' },
        ],
      },
      {
        heading: 'Cuánto recarga cada emisor por comprar afuera',
        body: 'Esta es la comisión que cada banco o emisora publica por compras en el exterior con débito o prepaga. Mirá dos columnas, no una: la comisión en sí y lo que cobran por sacar efectivo de un cajero afuera, que es la alternativa habitual al pago con tarjeta. Ojo con Itaú: la compra con Visa Débito es sin costo, pero su manual agrega que "las transacciones en moneda extranjera tienen un 3% adicional sobre el tipo de cambio de Visa Internacional", y el peso argentino es moneda extranjera. En crédito las condiciones cambian según el plástico: Itaú, por ejemplo, no cobra recargo por compras en el exterior con el paquete Personal Bank, cobra 1 % más IVA con el Full y 3 % más IVA con el Light. Para la comparación completa de tarjetas de débito y prepagas, con más emisores, tenemos una página aparte.',
        table: {
          headers: ['Tarjeta', 'Compra en el exterior', 'Retiro en cajero del exterior', 'Fuente'],
          rows: [
            [
              'BROU Mastercard Débito',
              '3 % (2 % en Recompensa, Visa Institucional y Tarjeta Joven)',
              'US$ 3 más el cargo de la red',
              'Costos de débito, vigentes desde el 1/2/2025',
            ],
            [
              'Itaú Visa Débito',
              'Sin costo, más 3 % sobre el tipo de cambio de Visa',
              'US$ 2 en Red Link, Banelco e Itaú',
              'Manual de tarifas, septiembre de 2026',
            ],
            [
              'Santander Visa Débito',
              '3 % más IVA (Visa Débito Platinum: USD 0)',
              'USD 5 más comisiones locales de la red',
              'Manual de tarifas, 12/09/2026',
            ],
            [
              'BBVA Visa Débito',
              'USD 0',
              'USD 5 por transacción, más USD 3 en Banelco y Red Link de Argentina',
              'Cartilla de instrumentos electrónicos, 12/12/2024',
            ],
            [
              'Prex',
              '2,5 % más US$ 0,50, más IVA; en pesos argentinos, tipo de cambio de la marca con costos de hasta 1,5 %',
              'US$ 3 más IVA, y la cartilla incluye los retiros en la comisión de 2,5 % más US$ 0,50',
              'Cartilla de uso, consultada en septiembre de 2026',
            ],
          ],
        },
        links: [{ label: 'Comparar tarjetas de débito', to: '/tarjetas-de-debito-uruguay' }],
      },
      {
        heading: '¿Efectivo o tarjeta en Argentina?',
        body: 'Depende de dónde vayas a gastar y de qué tarjeta tengas. La tarjeta tiene a favor que no andás con billetes y que la conversión la hace la red; tiene en contra la comisión del emisor, que en el cuadro va de cero a más del 3 %. El efectivo tiene dos variantes. Sacar pesos argentinos de un cajero con tu tarjeta uruguaya suma la comisión fija del banco por retiro, más lo que cobre la red o el dueño del cajero, y la conversión también la hace la red: sirve para montos que justifiquen el fijo, no para retiros chicos y repetidos. Llevar dólares o pesos argentinos desde Uruguay te obliga a comparar dónde cambiar, y con los pesos argentinos conviene mirar la diferencia entre compra y venta antes de salir. Una combinación razonable es la tarjeta con menor recargo para lo grande, como alojamiento, supermercado y transporte, y algo de efectivo para lo chico.',
        links: [
          {
            label: 'Cambiar pesos argentinos en Uruguay',
            to: '/guias/cambiar-pesos-argentinos-uruguay',
          },
          { label: 'Cuántos dólares llevar de viaje', to: '/guias/dolares-para-viajar' },
        ],
      },
      {
        heading: 'Pagá desde dólares, no desde pesos uruguayos',
        body: 'Si tu tarjeta de débito está asociada sólo a una cuenta en pesos uruguayos, cada compra en Argentina pasa por dos conversiones: de pesos argentinos a dólares en la red, y de dólares a pesos uruguayos en tu banco. Asociar una caja de ahorro en dólares elimina la segunda. La cartilla de BBVA lo dice expresamente: la compra se convierte a USD y se debita de la cuenta en dólares asociada a la tarjeta, y sólo si no hay cuenta en dólares se pasa a pesos. En el caso de Itaú, además, el 3 % sobre el tipo de cambio de Visa se aplica a las transacciones en moneda extranjera, así que conviene calcularlo aunque la compra figure como sin costo. Antes de viajar, fijate en la app a qué cuenta está asociada cada tarjeta, cargá dólares en la que vayas a usar y hacé una compra chica el primer día para ver cuánto te debitaron por cada peso argentino.',
      },
      {
        heading: 'Prex, Mercado Pago y otras prepagas',
        body: 'Las prepagas funcionan igual que el débito: pagan con el saldo que cargaste y convierten según la moneda que tengas. Prex publica en su cartilla de uso, consultada en septiembre de 2026, una "Comisión por compras de productos, servicios y retiros en el exterior (2,5% + USD 0,5) + IVA", y aparte "USD 3 + IVA" por cada retiro en efectivo en el exterior; el fijo de medio dólar pesa más cuanto más chica es la compra, así que rinde en pagos medianos y no en un café. Y como el peso argentino no es dólar ni peso uruguayo, la misma cartilla avisa que esas compras quedan sujetas "al tipo de cambio de la marca y costos asociados que no excederán el 1,5% del valor de la transacción". Con la tarjeta de Mercado Pago, antes de viajar revisá en su centro de ayuda si cobra comisión por compras en el exterior y a qué tipo de cambio convierte: si la tarjeta sólo tiene saldo en pesos uruguayos, cada compra en pesos argentinos pasa por las dos conversiones que explicamos arriba, aunque la comisión sea cero. La cuenta que importa es la misma para todas: cuántos pesos uruguayos o dólares salieron de tu saldo por cada peso argentino que pagaste.',
      },
    ],
    faqs: [
      {
        q: '¿Puedo usar mi tarjeta de débito uruguaya en Argentina?',
        a: 'Sí, si es internacional (Visa o Mastercard). La red convierte la compra en pesos argentinos a dólares y tu banco la debita de tu cuenta en dólares o, si sólo tenés cuenta en pesos, la vuelve a convertir; a eso se suma la comisión por compra en el exterior de tu emisor.',
      },
      {
        q: '¿A qué dólar me cobran si pago con tarjeta uruguaya en Argentina?',
        a: 'No al de la pizarra de tu banco: la conversión de pesos argentinos a dólares la hace la red de la tarjeta. Las normas del BCRA exceptúan de liquidarse en el mercado de cambios los cobros de consumos de no residentes con tarjetas emitidas en el exterior, por eso esa conversión puede diferir del dólar oficial argentino.',
      },
      {
        q: '¿Qué tarjeta uruguaya no cobra recargo en el exterior?',
        a: 'Según las condiciones publicadas, BBVA cobra US$ 0 por compra en el exterior con Visa Débito y Santander no cobra recargo con la Visa Débito Platinum. Itaú no cobra la compra con Visa Débito, pero suma 3 % sobre el tipo de cambio de Visa en las transacciones en moneda extranjera.',
      },
      {
        q: '¿Conviene sacar efectivo de un cajero en Argentina con mi tarjeta?',
        a: 'Para montos grandes puede servir, pero cada retiro tiene un fijo: US$ 2 con Itaú en Link o Banelco, US$ 3 más el cargo de la red con el débito del BROU y USD 5 con Santander, más lo que cobre el dueño del cajero. En retiros chicos y repetidos, el fijo se come la ventaja.',
      },
      {
        q: '¿La tarjeta de Mercado Pago sirve en Argentina?',
        a: 'Revisá en su centro de ayuda si tu tarjeta es internacional, qué comisión cobra por compras en el exterior y a qué tipo de cambio convierte. Si sólo tiene saldo en pesos uruguayos, cada compra en pesos argentinos pasa por dos conversiones, aunque la comisión sea cero.',
      },
      {
        q: '¿Prex cobra por usarla en Argentina?',
        a: 'Sí: su cartilla de uso fija una comisión de 2,5 % más US$ 0,50, más IVA, por compras y retiros en el exterior, y US$ 3 más IVA por cada retiro en efectivo afuera. Por el fijo, es proporcionalmente más cara en compras chicas, y en pesos argentinos se suma el tipo de cambio de la marca, con costos asociados de hasta 1,5 %.',
      },
    ],
    related: [
      { label: 'Tarjetas de débito en Uruguay', to: '/tarjetas-de-debito-uruguay' },
      { label: 'Dólar blue hoy', to: '/dolar-blue-hoy' },
      { label: 'Cambiar pesos argentinos', to: '/guias/cambiar-pesos-argentinos-uruguay' },
      { label: 'Cotizaciones de la región', to: '/cotizaciones-de-la-region' },
    ],
    sources: [
      {
        label:
          'Texto ordenado de "Exterior y cambios" al 25/08/2025, punto 2.2.2.3 — exceptúa de liquidación "los cobros por consumos en el país efectuados por no residentes mediante tarjetas de débito, crédito, compra o prepagas emitidas en el exterior"',
        url: 'https://www.bcra.gob.ar/archivos/Pdfs/Texord/t-excbio.pdf',
        publisher: 'BCRA',
      },
      {
        label:
          'Costos de las tarjetas de débito BROU, vigentes desde el 1/2/2025 — compras en el exterior "3% sobre el monto de la compra" (2 % en Recompensa, Visa Institucional y Tarjeta Joven); retiro "U$S 3 más comisión habitual de surcharge que depende de cada red"',
        url: 'https://www.brou.com.uy/personas/tarjetas/costos-y-exoneraciones-visa-y-master/debito',
        publisher: 'BROU',
      },
      {
        label:
          'Itaú, manual de tarifas (septiembre de 2026) — compras con VISA Débito "sin costo" y "3% adicional sobre el tipo de cambio de Visa Internacional" en moneda extranjera; retiro en Red Link, Banelco e Itaú U$S 2; recargo en crédito según paquete',
        url: 'https://www.itau.com.uy/inst/aci/docs/tarifario.pdf',
        publisher: 'Itaú Uruguay',
      },
      {
        label:
          'Santander, manual de tarifas (versión 12/09/2026) — compras en el exterior con Visa Débito "3% + IVA", con Visa Débito Platinum "USD 0"; retiros en ATMs del exterior "USD 5"',
        url: 'https://www.santander.com.uy/sites/default/files/manual-de-tarifas/Manual_de_Tarifas_20260912.pdf',
        publisher: 'Santander Uruguay',
      },
      {
        label:
          'BBVA, cartilla precontractual de instrumentos electrónicos (12/12/2024) — comisión por compra en el exterior USD 0; uso en el exterior USD 5 por transacción, más "un cargo adicional de USD 3" en Banelco y Red Link de Argentina; la compra se convierte a USD y se debita de la cuenta en dólares asociada',
        url: 'https://www.bbva.com.uy/content/dam/public-web/uruguay/documents/cartilla-contractual-de-producto/Cartilla-Instrumentos-Electronicos.pdf',
        publisher: 'BBVA Uruguay',
      },
      {
        label:
          'Prex, cartilla de uso — "Comisión por compras de productos, servicios y retiros en el exterior (2,5% + USD 0,5) + IVA" y "Comisión por retiros en efectivo en el exterior USD 3 + IVA"; en moneda distinta de USD o pesos, "tipo de cambio de la marca y costos asociados que no excederán el 1,5%"',
        url: 'https://www.prexcard.com/html/cartillaUso',
        publisher: 'Prex',
      },
    ],
  },
]
