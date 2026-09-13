// Seis guías de trabajo y BPS minadas de Reddit: la mutualista al quedarse sin trabajo, el subsidio por
// expensas funerarias, cobrar la jubilación desde el exterior, la canasta de fin de año, cómo pedir un aumento
// y pedir que te despidan. Demanda: hilos 1sjd2oc, 1mdpzgf, 1l75w1d, 1uqxcjs, 1n1w3ld, 10wa2k6, 17b94l8,
// 1kdz5vi, 1qwjr4h, 1fjzlsc y 1pd31ur, más la cola de autocompletado ("bonos fonasa cesante", "servicios
// fúnebres uruguay", "cómo saber si me corresponde canasta bps"). Cifras verificadas el 2026-09-13 contra BPS
// (23321, 4802, 3494, 11428, 12675, 12610, 15767, 23115, 11414, 21733, 23594, 15193, 14980 y la R.D. 18-16/2005),
// MSP (tasas moderadoras 11/2025 y ajuste 07/2026), gub.uy (afiliación a ASSE), MTSS (lineamientos de la 11.ª
// ronda, consultas, despido y preguntas frecuentes), Presidencia (canasta 2025) e IMPO (Ley 18.731 art. 30,
// Ley 10.449 art. 5, Ley 16.045 art. 2, Decretos-Ley 15.180 y 14.407, Decretos 264/025 y 345/023, Acuerdo
// Multilateral del Mercosur y acta del Grupo 10 subgrupo 20 del 19/11/2025).
import type { Guide } from './guides'

export const trabajoBpsGuides: readonly Guide[] = [
  {
    slug: 'me-quede-sin-trabajo-mutualista-fonasa-uruguay',
    title: 'Me quedé sin trabajo: ¿pierdo la mutualista y el Fonasa?',
    description:
      'Si cobrás seguro de paro seguís con Fonasa; si no, la cobertura llega a fin del mes del cese y tus hijos siguen 12 meses. Después: ASSE o socio individual.',
    tag: 'FONASA',
    updatedAt: '2026-09-13',
    sections: [
      {
        heading: '¿Hasta cuándo tengo Fonasa si me despiden o renuncio?',
        body: 'La cobertura no se corta el día que dejás de trabajar, y tampoco dura lo que dura la indemnización. El BPS lo contesta con una regla de calendario: "Se mantendrá la cobertura Fonasa hasta el último día del mes en el que se produce la finalización del Subsidio por desempleo por despido o la desvinculación laboral". Traducido: si te despiden o renunciás el día 5 de un mes, seguís atendiéndote en tu mutualista hasta el último día de ese mismo mes, no hasta el 5 del siguiente. Si en cambio pasás al seguro de paro, la fecha que manda es la del final del subsidio, y el mes se cuenta igual. Por eso lo primero no es elegir prestador: es anotar qué día se corta la cobertura en tu caso, porque de esa fecha salen todos los demás plazos. Si tenés consultas, estudios o recetas por renovar, conviene hacerlos antes de ese último día, mientras todavía pagás las órdenes y los tickets como afiliado.',
      },
      {
        heading: 'Si vas al seguro de paro, seguís con mutualista (y por eso te descuentan Fonasa)',
        body: 'Estar en el seguro de paro no te saca del sistema de salud. El BPS lo escribe en la página del subsidio por despido: "Los trabajadores mantienen el derecho a la cobertura asistencial del Sistema Nacional Integrado de Salud (SNIS) por el período de amparo al subsidio por desempleo, realizando los aportes correspondientes al Fonasa". Esa última parte explica algo que sorprende en el primer cobro: del subsidio te descuentan el aporte al Fonasa, igual que del sueldo, y es justamente ese aporte el que mantiene la cobertura. Mientras dure la prestación seguís en la misma mutualista, sin trámite de por medio. El corte llega después, con la regla de la sección anterior: el último día del mes en que termina el subsidio. Si todavía no sabés si te corresponde el seguro de paro, cuánto se cobra o cuánto dura según la causal, eso está en nuestra página del seguro de paro, que es la otra mitad de esta misma pregunta.',
        links: [
          { label: 'Seguro de paro: requisitos y cuánto se cobra', to: '/seguro-de-paro-uruguay' },
        ],
      },
      {
        heading: 'Tus hijos siguen doce meses más; tu pareja, no',
        body: 'Para los chicos la ley pone un colchón que casi nadie conoce. El artículo 30 de la Ley 18.731 dice que los menores de 18 años y los mayores de esa edad con discapacidad mantienen la cobertura "por un período de doce meses continuos", contados "a partir del mes siguiente al del cese de la aportación", siempre que el período de aportación "haya sido no menor a un año". Si te quedaste sin trabajo en marzo, entonces, tus hijos siguen amparados de abril a marzo del año siguiente. El mismo artículo pone el final anticipado: el beneficio "cesará si el beneficiario obtiene el mismo amparo por sí o a través de otro generante", por ejemplo si el otro padre consigue trabajo y los ampara. Lo que el artículo no incluye es al cónyuge o concubino. Si tu pareja estaba amparada por tu Fonasa, la extensión no la alcanza, así que conviene que planee su propia salida al mismo tiempo que vos.',
      },
      {
        heading: 'La salida más usada: afiliarte a ASSE',
        body: 'Cuando la cobertura se termina, la puerta que no depende de tu bolsillo es ASSE. El trámite de afiliación que publica el Estado distingue tres modalidades: gratuita, para las personas que no superan los topes de ingresos establecidos; Fonasa, para quien sigue siendo beneficiario del sistema; y cuota ASSE, para quienes superan esos topes. Te van a pedir documento de identidad vigente, certificado de ingresos y comprobante de residencia, y se hace en los puestos de afiliación de los centros asistenciales, en los Puntos de Atención a la Ciudadanía o en la Dirección de Atención al Usuario, en Cerro Largo 1816, Montevideo. La duda que más se repite es la de los tratamientos en curso. No des por hecho que la historia clínica llegue sola al nuevo prestador: antes de que venza tu cobertura, pedí en la mutualista una copia y las recetas vigentes, y llevalas a la primera consulta. Si todavía tenés Fonasa y lo que buscás es pasarte a ASSE, las reglas están en nuestra página de cambio de mutualista.',
        links: [
          { label: 'Cambiar de mutualista o pasarte a ASSE', to: '/cambiar-de-mutualista-uruguay' },
        ],
      },
      {
        heading: '¿Puedo quedarme en mi mutualista pagando yo?',
        body: 'Sí: perder el Fonasa no te obliga a irte, pero cambia quién paga. Sin el aporte, la cuota la pagás vos como afiliado individual. El precio lo fija cada institución y lo que controla el Estado son los aumentos: el Ministerio de Salud Pública publica en cada ajuste los porcentajes máximos de aumento autorizados para las cuotas de los afiliados individuales y colectivos de las mutualistas, junto con los de tickets y órdenes; el más reciente, el de julio de 2026, se publicó el 21 de julio. No publicamos un precio de cuota porque varía de una institución a otra, y un promedio te haría decidir mal. Lo que conviene es pedirle a tu mutualista, por escrito, el valor de la cuota individual que te correspondería desde el mes siguiente al corte, y compararlo con lo que te costaría ASSE según tus ingresos. Si decidís no seguir, avisalo también por escrito, así queda constancia de desde cuándo dejás de ser socio.',
      },
      {
        heading: 'Qué son los "bonos", las órdenes y los tickets',
        body: 'En los buscadores se repite "comprar bonos de Fonasa estando cesante", y conviene desarmar la confusión porque puede costar plata. Lo que pagás en la ventanilla de una mutualista cuando pedís una consulta o retirás un medicamento no es un bono que te dé cobertura: son tasas moderadoras. El Ministerio de Salud Pública las describe como "las tasas moderadoras (tickets y órdenes) que las Instituciones de Asistencia Médica Colectiva (IAMC) están autorizadas a cobrar a sus afiliados", con precios máximos que se autorizan por decreto. En la lista publicada el 4 de diciembre de 2025, el tope era de $ 880 sin impuestos y de $ 1.128 con IVA y timbres incluidos, y el ajuste de julio de 2026 mantuvo ese valor tope de $ 880 sin impuestos. La palabra que importa es "afiliados": una orden o un ticket es el copago de alguien que ya está afiliado, así que sin cobertura no hay orden que puedas comprar para atenderte. Si perdiste el Fonasa, primero se resuelve la afiliación, como socio individual o en ASSE, y recién después vienen las órdenes.',
      },
      {
        heading: 'Si volvés a trabajar o empezás a facturar',
        body: 'La cobertura vuelve por la misma puerta por la que se fue: el aporte. Cuando conseguís un empleo en blanco, el Fonasa se genera otra vez con el recibo de sueldo, y lo mismo pasa con las formas de trabajo independiente que aportan al sistema. Hay dos cuidados para ese momento. El primero es el hueco: entre el último día de cobertura y el primer mes del trabajo nuevo pueden pasar semanas sin Fonasa, y ese tramo lo tenés que cubrir por tu cuenta, como socio individual o en ASSE. El segundo es no mezclar las cosas si todavía cobrás el seguro de paro: abrir una empresa o empezar una actividad puede cortar el subsidio, y la página del seguro de paro explica qué dice el BPS sobre eso antes de que te inscribas. Y si tus hijos están usando los doce meses del artículo 30, recordá que ese amparo termina apenas vuelven a quedar cubiertos por vos o por el otro padre.',
        links: [{ label: 'Seguro de paro: qué lo corta', to: '/seguro-de-paro-uruguay' }],
      },
    ],
    steps: [
      {
        name: 'Fijá el último día de cobertura',
        text: 'Es el último día del mes en que te desvinculaste o, si vas al seguro de paro, del mes en que termina el subsidio.',
      },
      {
        name: 'Aprovechá el tiempo que te queda',
        text: 'Consultas, estudios y recetas pendientes conviene hacerlos antes de ese día, mientras seguís siendo afiliado.',
      },
      {
        name: 'Pedí copia de tu historia clínica',
        text: 'Solicitala en la mutualista junto con las recetas vigentes, sobre todo si estás en un tratamiento que no podés cortar.',
      },
      {
        name: 'Revisá la situación de tus hijos',
        text: 'Si aportaste al menos un año, los menores de 18 y los mayores con discapacidad siguen amparados doce meses desde el mes siguiente al cese.',
      },
      {
        name: 'Elegí la salida',
        text: 'Pedí por escrito el valor de la cuota individual de tu mutualista y comparalo con la afiliación a ASSE, gratuita o con cuota según tus ingresos.',
      },
    ],
    faqs: [
      {
        q: 'Renuncio al trabajo, ¿hasta cuándo tengo Fonasa y mutualista?',
        a: 'Hasta el último día del mes en que se produce la desvinculación. El BPS aplica esa regla a la desvinculación laboral en general, así que no se corta el día del cese sino a fin de ese mes.',
      },
      {
        q: 'Estoy en el seguro de paro, ¿sigo teniendo mutualista?',
        a: 'Sí. El BPS dice que los trabajadores mantienen la cobertura del SNIS durante el período del subsidio por desempleo, realizando los aportes al Fonasa, que se descuentan del propio subsidio. La cobertura sigue hasta el último día del mes en que termina el subsidio.',
      },
      {
        q: '¿Mis hijos pierden la mutualista si me quedo sin trabajo?',
        a: 'No enseguida. Por el artículo 30 de la Ley 18.731, los menores de 18 y los mayores con discapacidad mantienen la cobertura doce meses continuos desde el mes siguiente al cese de la aportación, si el período de aportes no fue menor a un año. Ese amparo cesa si pasan a estar cubiertos por otro generante.',
      },
      {
        q: '¿Puedo comprar bonos de Fonasa si estoy cesante?',
        a: 'En el sistema de salud no hay un bono que se compre para tener cobertura. Lo que se paga en la mutualista son tasas moderadoras, es decir órdenes y tickets, que las instituciones cobran a sus afiliados. Sin afiliación no te sirven: primero tenés que resolver si seguís como socio individual o te afiliás a ASSE.',
      },
      {
        q: '¿Cuántos días duran los bonos de Fonasa?',
        a: 'Si con "bonos" te referís a cuánto te dura la cobertura después de quedarte sin trabajo, es hasta el último día del mes del cese, o del mes en que termina el seguro de paro, y tus hijos menores pueden seguir doce meses más. Las órdenes y los tickets son otra cosa: el copago de cada consulta o medicamento.',
      },
      {
        q: '¿Me puedo pasar a ASSE si perdí el Fonasa?',
        a: 'Sí. La afiliación a ASSE tiene una modalidad gratuita para quienes no superan los topes de ingresos y otra con cuota para quienes los superan. Se tramita con documento, certificado de ingresos y comprobante de residencia en los puestos de afiliación de ASSE.',
      },
    ],
    related: [
      { label: 'Seguro de paro en Uruguay', to: '/seguro-de-paro-uruguay' },
      { label: 'Cambiar de mutualista', to: '/cambiar-de-mutualista-uruguay' },
      { label: 'Renunciar al trabajo: qué cobrás', to: '/renunciar-al-trabajo-uruguay' },
      { label: '¿Puedo pedir que me despidan?', to: '/guias/pedir-que-me-despidan-uruguay' },
    ],
    sources: [
      {
        label:
          'Luego de finalizado el subsidio por desempleo, de ser despedido o renunciar — "Se mantendrá la cobertura Fonasa hasta el último día del mes en el que se produce la finalización del Subsidio por desempleo por despido o la desvinculación laboral" (actualizado el 15/09/2025)',
        url: 'https://www.bps.gub.uy/23321/luego-de-finalizado-mi-subsidio-por-desempleo-por-despido-de-ser-despedido_a-o-renunciar-por-cuanto-tiempo-tendre-cobertura-fonasa.html',
        publisher: 'BPS',
      },
      {
        label:
          'Subsidio por desempleo por despido — "Los trabajadores mantienen el derecho a la cobertura asistencial del Sistema Nacional Integrado de Salud (SNIS) por el período de amparo al subsidio por desempleo, realizando los aportes correspondientes al Fonasa"',
        url: 'https://www.bps.gub.uy/4802/subsidio-por-desempleo-por-despido.html',
        publisher: 'BPS',
      },
      {
        label:
          'Ley 18.731 art. 30 — los menores de 18 y los mayores con discapacidad mantienen la cobertura "por un período de doce meses continuos", "a partir del mes siguiente al del cese de la aportación", con aportación "no menor a un año", y el beneficio "cesará" si obtienen el amparo por otro generante',
        url: 'https://www.impo.com.uy/bases/leyes/18731-2011/30',
        publisher: 'IMPO',
      },
      {
        label:
          'Afiliación a ASSE — modalidades gratuita (sin superar los topes de ingresos), Fonasa y cuota ASSE; documento vigente, certificado de ingresos y comprobante de residencia (actualizado el 09/04/2026)',
        url: 'https://www.gub.uy/tramites/afiliacion-asse',
        publisher: 'ASSE / gub.uy',
      },
      {
        label:
          'Precios de tickets y órdenes de las IAMC desde noviembre de 2025 (Decreto 231/025) — son "las tasas moderadoras (tickets y órdenes) que las Instituciones de Asistencia Médica Colectiva (IAMC) están autorizadas a cobrar a sus afiliados"; tope de $ 880 sin impuestos y $ 1.128 con IVA y timbres (publicado el 04/12/2025)',
        url: 'https://www.gub.uy/ministerio-salud-publica/datos-y-estadisticas/datos/precios-tickets-ordenes-instituciones-asistencia-medica-colectiva-iamc-noviembre-2025',
        publisher: 'MSP',
      },
      {
        label:
          'Ajuste de cuotas, cápitas y tasas moderadoras de julio de 2026 — porcentajes máximos de aumento autorizados para las cuotas de afiliados individuales y colectivos, tickets y órdenes; el PDF adjunto fija el "Valor tope máximo para todas las tasas moderadoras" en $ 880 (publicado el 21/07/2026)',
        url: 'https://www.gub.uy/ministerio-salud-publica/datos-y-estadisticas/datos/ajuste-cuotas-capitas-tasas-moderadoras-julio-2026',
        publisher: 'MSP',
      },
    ],
  },
  {
    slug: 'subsidio-expensas-funerarias-bps-uruguay',
    title: 'Subsidio por expensas funerarias: cuánto paga el BPS',
    description:
      'El BPS reintegra hasta $ 44.716 (2026) de un sepelio si el fallecido era trabajador, jubilado o subsidiado. Quién lo cobra, qué cubre y el plazo de 180 días.',
    tag: 'SEPELIO',
    updatedAt: '2026-09-13',
    sections: [
      {
        heading: '¿El BPS paga el sepelio? Qué es el subsidio y cuánto es en 2026',
        body: 'Sí, dentro de un tope y para ciertos fallecidos. El subsidio por expensas funerarias es una prestación económica que el BPS paga por única vez para cubrir los gastos fúnebres de un trabajador o jubilado que no tenía un servicio fúnebre contratado. Tiene dos piezas: las expensas funerarias propiamente dichas y los gastos complementarios, que el BPS define como "sala velatoria, traslado del cuerpo a cementerio municipal y tasa de inhumación". El tope por todo concepto es de $ 44.716 con vigencia desde el 1 de enero de 2026, contra $ 42.197 en 2025. Dentro de ese total, los gastos complementarios tienen su propio techo de $ 22.358, y si lo único que se pagó fue la sala velatoria, el tope es de $ 8.304. No es una suma que se deposita sola: el trámite pide la factura detallada y el recibo del sepelio, porque lo que se reconoce es el gasto acreditado, con esos topes como máximo.',
        table: {
          headers: ['Concepto', 'Tope desde el 01/01/2026', 'Tope desde el 01/01/2025'],
          rows: [
            [
              'Expensas funerarias y gastos complementarios, por todo concepto',
              '$ 44.716',
              '$ 42.197',
            ],
            ['Sólo gastos complementarios', '$ 22.358', '$ 21.099'],
            ['Sólo sala velatoria', '$ 8.304', 'No figura en la ficha'],
          ],
        },
      },
      {
        heading: '¿Quién tiene que haber fallecido para que corresponda?',
        body: 'No es un beneficio para cualquier fallecimiento: lo genera la persona fallecida por su vínculo con el BPS, y la ficha oficial enumera los casos. Lo generan las personas jubiladas y las que estaban en actividad, "sin importar el período trabajado". También las que estaban cobrando subsidio por desempleo o por enfermedad. Lo generan los desocupados, cuando el cese en la actividad, en el seguro de paro o en el subsidio por enfermedad ocurrió dentro de los 12 meses anteriores al fallecimiento. Y lo generan los desvinculados, cuando ese cese fue antes de esos 12 meses, pero en ese caso se exige un mínimo de 10 años de servicios. Las personas declaradas ausentes por la Justicia también están incluidas. La diferencia entre desocupado y desvinculado es la que conviene mirar con cuidado cuando fallece una persona mayor que dejó de trabajar hace tiempo sin jubilarse: si el último cese fue hace más de un año, lo que decide es si llegó a los diez años de servicios.',
      },
      {
        heading: '¿Quién lo cobra? El que pagó el sepelio',
        body: 'El BPS no le paga a la familia por ser familia: le paga a quien se hizo cargo del gasto. La ficha lo ordena así: pueden cobrarlo "los causahabientes con derecho a pensión, siempre que se hayan hecho cargo del sepelio", y si no fueron ellos, se abona a la persona que acredite haber pagado los costos, aunque sea un tercero. La consecuencia práctica es que lo que se prueba es el pago, así que conviene que la factura y el recibo identifiquen claramente a quien pagó, y decidirlo antes de pagar. La otra opción, que alivia el momento más duro, es la cesión. La ficha dice: "Podrá realizarse una cesión de derechos al representante de la empresa fúnebre ante BPS a efectos de que este lo haga efectivo en forma directa". Con la cesión, es la empresa la que gestiona el cobro ante el BPS. Antes de firmar, preguntale si trabaja así y pedile por escrito qué parte del servicio queda cubierta por el subsidio y qué parte pagás vos.',
      },
      {
        heading: 'Si tenía servicio fúnebre en la mutualista o en una cooperativa',
        body: 'Este es el punto que más cambia el resultado. Si el fallecido tenía una cobertura que paga el sepelio, el BPS no genera el subsidio por expensas funerarias. Lo que sí puede reintegrar, a quien acredite haberlos pagado, son los gastos complementarios que esa cobertura no incluía: la sala velatoria, el traslado a un cementerio municipal y la tasa de inhumación, con el tope de $ 22.358 vigente desde enero de 2026. Por eso, entre los papeles, el BPS pide un "negativo" de cobertura fúnebre de los lugares donde suele estar, como el prestador de salud, cooperativas o ANDA, y, para los complementarios, el detalle de los rubros que cubría el régimen al que estaba afiliado. Dos precisiones de la ficha. El traslado del cuerpo no se paga cuando el sepelio se hace en un cementerio privado. Y la cobertura del servicio de Tutela Social, que depende del Ministerio de Defensa Nacional, no excluye el subsidio: según el BPS, esa cobertura paga lo que supere el tope que abona el organismo.',
      },
      {
        heading: 'Los papeles que te van a pedir',
        body: 'Conviene juntarlos desde el primer día, porque uno de ellos vence rápido. La ficha del trámite pide la cédula de identidad vigente del fallecido y de quien solicita; la partida de defunción, que tiene una validez de 30 días; la factura detallada y el recibo de pago del sepelio; una declaración de la empresa fúnebre de que el fallecido no estaba afiliado a un sistema de pago previo; y el negativo de cobertura fúnebre del prestador de salud, cooperativas, ANDA y similares. Si lo que se reclama son sólo gastos complementarios, se agrega el detalle de los rubros que cubría el régimen al que estaba afiliado. El trámite se hace en las sucursales del BPS, de lunes a viernes de 9:15 a 16:00, y la ficha habilita además una casilla de correo electrónico para quienes lo gestionan desde el interior. Si algún papel tarda, no esperes a tenerlo todo para averiguar, porque el plazo corre igual.',
      },
      {
        heading: 'El plazo: 180 días desde el día siguiente al fallecimiento',
        body: 'La regla está escrita sin margen: "El plazo de presentación es de 180 días desde el día siguiente al fallecimiento del causante". En medio de un duelo ese plazo se va sin que nadie lo note, sobre todo cuando el sepelio lo pagó un familiar y otro se ocupa de la sucesión, la pensión o las cuentas del fallecido. Por eso conviene que la persona que pagó el servicio sea la que se ocupe de este trámite y que lo inicie apenas tenga la factura y el recibo. Y si hay alguien con derecho a pensión por sobrevivencia, tené presente que son dos cosas distintas: el subsidio por expensas funerarias reintegra un gasto puntual del sepelio, mientras que la pensión es otra prestación del BPS, con su propio trámite, que no se pide con este formulario. Hacer uno no inicia el otro, así que conviene anotar los dos en la misma lista de pendientes.',
      },
      {
        heading: 'Antes de contratar el servicio fúnebre',
        body: 'Estas decisiones se toman con la urgencia encima, que es justo cuando se firma lo que después no se puede cambiar. Tres preguntas ahorran problemas. La primera, si el fallecido tenía cobertura: una llamada a su mutualista y a cualquier cooperativa o servicio del que fuera socio define si vas a pedir el subsidio completo o sólo los gastos complementarios. La segunda, cómo trabaja la empresa con el subsidio: si acepta la cesión de derechos ante el BPS, pedí que el presupuesto separe lo que entra en los topes de 2026 de lo que pagás aparte. La tercera, dónde va a ser la inhumación, porque el traslado a un cementerio privado no lo reintegra el BPS. Y guardá todo con fecha: la factura detallada, el recibo y la partida de defunción, que para este trámite sólo vale 30 días. Con esos tres datos resueltos, el subsidio deja de ser una sorpresa y pasa a ser una cuenta que podés hacer antes de firmar.',
      },
    ],
    steps: [
      {
        name: 'Averiguá si había cobertura fúnebre',
        text: 'Consultá en la mutualista y en cooperativas o servicios del fallecido: si había cobertura, sólo se reintegran los gastos complementarios.',
      },
      {
        name: 'Pedí factura detallada y recibo',
        text: 'Son la prueba del gasto y de quién lo pagó, y el BPS paga a quien acredita haberse hecho cargo del sepelio.',
      },
      {
        name: 'Sacá la partida de defunción a tiempo',
        text: 'El trámite la pide con una validez de 30 días, así que conviene sacarla cuando ya tenés el resto de los papeles.',
      },
      {
        name: 'Presentate dentro de los 180 días',
        text: 'El plazo corre desde el día siguiente al fallecimiento y el trámite se hace en las sucursales del BPS.',
      },
      {
        name: 'O cedé el derecho a la empresa fúnebre',
        text: 'La cesión de derechos ante el BPS permite que la empresa lo cobre en forma directa.',
      },
    ],
    faqs: [
      {
        q: '¿El BPS paga el velorio?',
        a: 'Reintegra los gastos del sepelio, incluida la sala velatoria, si el fallecido era jubilado, trabajador en actividad, subsidiado, desocupado dentro de los 12 meses previos o desvinculado con al menos 10 años de servicios. Desde el 1 de enero de 2026 el tope es de $ 44.716 por todo concepto, de $ 22.358 para gastos complementarios y de $ 8.304 si sólo se pagó la sala velatoria.',
      },
      {
        q: '¿Cuánto tiempo tengo para pedir el subsidio por expensas funerarias?',
        a: 'El BPS fija un plazo de presentación de 180 días desde el día siguiente al fallecimiento. Conviene iniciarlo apenas tengas la factura y el recibo del sepelio.',
      },
      {
        q: 'Si tenía servicio fúnebre en la mutualista, ¿cobro algo?',
        a: 'El subsidio no se genera, pero se pueden reintegrar a quien los pagó los gastos complementarios que ese servicio no cubría, como la sala velatoria, el traslado a un cementerio municipal o la tasa de inhumación, con un tope de $ 22.358 desde enero de 2026.',
      },
      {
        q: '¿Lo puede cobrar directamente la empresa fúnebre?',
        a: 'Sí, mediante una cesión de derechos ante el BPS a favor del representante de la empresa fúnebre, para que lo haga efectivo en forma directa.',
      },
      {
        q: 'Mi padre no trabajaba hace años y no estaba jubilado, ¿corresponde?',
        a: 'Si el cese fue dentro de los 12 meses anteriores al fallecimiento, sí, como desocupado. Si fue antes, el BPS lo trata como desvinculado y exige un mínimo de 10 años de servicios.',
      },
      {
        q: 'Lo pagó un vecino, ¿quién lo cobra?',
        a: 'Primero corresponde a los causahabientes con derecho a pensión que se hayan hecho cargo del sepelio. Si no fueron ellos, el BPS lo abona a la persona que acredite haber pagado los gastos.',
      },
    ],
    related: [
      { label: 'Cómo funciona una sucesión', to: '/guias/como-funciona-una-sucesion-uruguay' },
      { label: '¿Las deudas se heredan?', to: '/guias/las-deudas-se-heredan-uruguay' },
      { label: 'Qué seguros conviene tener', to: '/guias/que-seguros-conviene-tener-uruguay' },
    ],
    sources: [
      {
        label:
          'Subsidio por expensas funerarias y gastos complementarios — quiénes generan el derecho, quién lo cobra y la cesión a la empresa fúnebre, "El plazo de presentación es de 180 días desde el día siguiente al fallecimiento del causante", topes desde el 01/01/2026 de $ 44.716 por todo concepto, $ 22.358 de gastos complementarios y $ 8.304 sólo sala velatoria ($ 42.197 y $ 21.099 en 2025), cementerios privados y Tutela Social (actualizado el 09/02/2026)',
        url: 'https://www.bps.gub.uy/3494/subsidio-por-expensas-funerarias-y-gastos-complementarios.html',
        publisher: 'BPS',
      },
      {
        label:
          'Trámite del subsidio por expensas funerarias — cédulas vigentes, partida de defunción con validez de 30 días, factura detallada y recibo, declaración de la empresa fúnebre y negativo de cobertura fúnebre; si había cobertura "no se generará el subsidio", aunque pueden reintegrarse gastos complementarios (actualizado el 29/12/2025)',
        url: 'https://www.bps.gub.uy/11428/',
        publisher: 'BPS',
      },
    ],
  },
  {
    slug: 'cobrar-jubilacion-uruguaya-desde-el-exterior',
    title: 'Cobrar la jubilación uruguaya viviendo en el exterior',
    description:
      'Cómo pedir la jubilación del BPS viviendo afuera, cómo te llega el giro, la fe de vida que hay que renovar y cómo se suman tus años si el país tiene convenio.',
    tag: 'JUBILACIÓN',
    updatedAt: '2026-09-13',
    sections: [
      {
        heading: '¿Me puedo jubilar en Uruguay viviendo afuera?',
        body: 'Sí, y la puerta de entrada depende de una sola pregunta: ¿necesitás sumar años trabajados en el país donde vivís? El BPS lo resuelve en dos caminos. Si vivís en un país con convenio de seguridad social con Uruguay y querés que te computen los períodos de allá, te dirigís "al organismo de seguridad social de su país de residencia" para ampararte al convenio, y es ese organismo el que le remite la solicitud al BPS. Si vivís en un país sin convenio, o te alcanzan los años trabajados en Uruguay y no necesitás computar nada de afuera, podés pedirla directamente en las oficinas del BPS o a través de un apoderado. Desde el exterior el BPS atiende en el +598 1997 0000, de lunes a viernes de 8 a 18. Esta guía cubre el BPS: si tus años están en otra caja uruguaya, como la policial, la militar o la de profesionales, el trámite se hace con esa caja.',
      },
      {
        heading: '¿Con qué países tiene convenio Uruguay?',
        body: 'La lista la mantiene el BPS y conviene mirarla antes de iniciar nada, porque define el camino. En la versión actualizada en septiembre de 2026 figuran convenios bilaterales con España, Italia, Francia, Alemania, Estados Unidos, Canadá, Chile e Israel, entre otros, y dos convenios multilaterales: el del Mercosur, que alcanza a Argentina, Brasil y Paraguay, y el Convenio Multilateral Iberoamericano de Seguridad Social, que es por donde entra, por ejemplo, Perú. Según el BPS, estos acuerdos permiten la "acumulación de períodos de servicio en ambos países", el traslado temporal de trabajadores y el "pago de jubilaciones y pensiones en el exterior sin quitas ni retenciones". Cada convenio tiene su propio texto y sus propias reglas, así que la lista te dice si hay convenio, no cómo se aplica en tu caso. Si tu país no figura, los años de allá no se suman a los de acá, pero lo que generaste en Uruguay se sigue pudiendo pedir y cobrar desde afuera.',
      },
      {
        heading: 'Cómo se suman los años: cada país paga su parte',
        body: 'Una confusión frecuente es creer que el convenio hace que Uruguay te pague una jubilación entera por años trabajados afuera. No funciona así. El Acuerdo Multilateral de Seguridad Social del Mercosur lo muestra en su artículo 7: "Los períodos de seguro o cotización cumplidos en los territorios de los Estados Partes serán considerados, para la concesión de las prestaciones por vejez, edad avanzada, invalidez o muerte", y agrega que su reglamento "establecerá también los mecanismos de pago a prorrata de las prestaciones". Dicho en criollo: los años de los dos países se suman para ver si llegás al requisito, y después cada país paga la parte proporcional a lo que aportaste en él. El resultado, en el caso del Mercosur, son dos prestaciones, una de cada país, cada una calculada en proporción a tus años allí. Antes de decidir cuándo pedirla, revisá tu historia laboral en los dos países, porque un período que no figura registrado es un período que no se suma.',
      },
      {
        heading: 'Cómo te llega la plata: el giro al exterior',
        body: 'Una vez otorgada, la jubilación del BPS se puede cobrar donde vivas. El BPS envía por giro al exterior sus prestaciones y también las rentas permanentes del BSE, de las AFAP y por accidentes de trabajo, y lo hace "a partir del 5to día hábil de cada mes en la moneda del país de residencia". Sobre el costo, la ficha dice dos cosas que conviene leer juntas: el BPS no cobra comisión por realizar el giro, pero el BROU aplica un descuento por comisión de US$ 8, cualquiera sea el destino, según la ficha actualizada el 2 de septiembre de 2025. Para cobrar en un banco del resto del mundo tenés que darle al BPS el código IBAN de tu cuenta y el código SWIFT del banco pagador. Argentina tiene un circuito propio: el titular necesita DNI argentino y cobra con una tarjeta Banelco que se retira en la sucursal del BROU en Buenos Aires. Si cambiás de banco o de país, esos datos se actualizan con el BPS antes del siguiente giro.',
      },
      {
        heading: 'Lo que no viaja: pensión a la vejez, invalidez y prestaciones de activos',
        body: 'No todo lo que paga el BPS se puede girar. La ficha de giros al exterior excluye expresamente la pensión a la vejez, la pensión por invalidez y las prestaciones de activos. Si alguna de esas es tu caso, o si en tu familia hay alguien que cobra una de ellas y se quiere mudar, conviene resolverlo con el BPS antes del viaje, cuando todavía podés hacer el trámite en una oficina: el giro no la va a incluir. Para las prestaciones que sí se giran, como la jubilación, la condición que acompaña al cobro es otra: demostrar que seguís vivo. El BPS vincula el giro con el trámite de fe de vida y con la denuncia de fallecimiento, que es la otra punta del mismo control. En la práctica, eso significa que el giro no se sostiene solo: depende de que la fe de vida esté vigente, y esa vigencia depende de la modalidad con que la acreditaste, que es lo que se ve en la sección siguiente.',
      },
      {
        heading: 'La fe de vida: cada cuánto hay que renovarla',
        body: 'Quien vive afuera y cobra del BPS tiene que acreditar periódicamente que está vivo, y desde el 1 de julio de 2025 los plazos cambiaron. El BPS publicó las nuevas vigencias para uruguayos residentes en el exterior que cobran prestaciones: con biometría, es decir con reconocimiento facial, la fe de vida vale 90 días, cuando antes valía 30; con documentación física vale 60 días, cuando antes valía 90; y el trámite presencial se mantiene en 90 días. La forma práctica de leerlo es que cada modalidad es un reloj distinto, y lo que tenés que anotar es la fecha de tu última acreditación más el plazo de la modalidad que usaste. La documentación física es la que más rápido vence, así que si dependés de un certificado en papel, pedí el turno con margen y no esperes a la última semana. Anotalo en el mismo calendario donde tenés el día de cobro, y no dejes que la fe de vida venza.',
      },
      {
        heading: 'Un apoderado en Uruguay: cómo tiene que venir la carta poder',
        body: 'Para pedir la jubilación sin viajar, o para que alguien de confianza haga gestiones acá, el camino es un apoderado, y lo que más traba el trámite es la forma de la carta poder. El BPS lo pide así: "si el titular se encuentra en el extranjero, la carta poder debe estar apostillada o visada (180 días de vigencia)". Si el documento no tiene apostilla, necesita la visación del consulado en el país donde se firmó y después la legalización en Uruguay ante el Ministerio de Relaciones Exteriores. Si está redactado en otro idioma, tiene que traducirlo un traductor público. El poder puede incluir el cobro de los haberes, aunque si cobrás por banco la ficha te manda a arreglar eso directamente con el banco. Un poder general de administración y disposición, en cambio, tiene que protocolizarse ante escribano uruguayo antes de presentarlo en el BPS, y ahí la vigencia es de 30 días desde la protocolización. Por eso conviene firmar el poder cerca del momento en que se va a usar.',
      },
    ],
    steps: [
      {
        name: 'Mirá si tu país tiene convenio',
        text: 'La lista del BPS define si iniciás en el organismo de tu país de residencia o directamente en el BPS.',
      },
      {
        name: 'Iniciá por la puerta que corresponde',
        text: 'Con convenio y años de afuera, en el organismo de seguridad social donde vivís; sin convenio, en el BPS o por apoderado.',
      },
      {
        name: 'Prepará la carta poder si vas a usar apoderado',
        text: 'Apostillada o visada, con 180 días de vigencia, y traducida por traductor público si está en otro idioma.',
      },
      {
        name: 'Dale al BPS los datos bancarios',
        text: 'Código IBAN y SWIFT para el resto del mundo; en Argentina, DNI argentino y cobro con Banelco en el BROU de Buenos Aires.',
      },
      {
        name: 'Agendá la fe de vida',
        text: 'Desde julio de 2025 vale 90 días por biometría o presencial y 60 días con documentación física.',
      },
    ],
    faqs: [
      {
        q: '¿Cómo se hace para jubilarse viviendo fuera del país?',
        a: 'Si vivís en un país con convenio y necesitás sumar años de allá, iniciás en el organismo de seguridad social de tu país de residencia, que remite la solicitud al BPS. Si no hay convenio o no necesitás computar años de afuera, la pedís directamente en el BPS o por medio de un apoderado.',
      },
      {
        q: 'Trabajé en España y en Uruguay, ¿se suman los años?',
        a: 'España figura entre los países con convenio bilateral que publica el BPS, y los convenios permiten la acumulación de períodos de servicio en ambos países. La solicitud se inicia en el organismo de seguridad social del país donde vivís.',
      },
      {
        q: '¿Pierdo la jubilación si me voy a vivir afuera?',
        a: 'No. El BPS gira sus prestaciones al exterior a partir del quinto día hábil de cada mes, en la moneda del país de residencia. Las excepciones que publica son la pensión a la vejez, la pensión por invalidez y las prestaciones de activos.',
      },
      {
        q: '¿Cada cuánto tengo que hacer la fe de vida?',
        a: 'Desde el 1 de julio de 2025, la acreditación por biometría vale 90 días, la hecha con documentación física 60 días y la presencial 90 días.',
      },
      {
        q: '¿Me cobran comisión por cobrar la jubilación afuera?',
        a: 'El BPS no cobra comisión por el giro, pero su ficha, actualizada el 2 de septiembre de 2025, advierte que el BROU descuenta US$ 8 de comisión, cualquiera sea el destino.',
      },
      {
        q: 'Vivo en Argentina, ¿cómo cobro?',
        a: 'El titular necesita DNI argentino y cobra con una tarjeta Banelco que se retira en la sucursal del BROU en Buenos Aires.',
      },
      {
        q: '¿Puede cobrarla un familiar en Uruguay?',
        a: 'Sí, con una carta poder que incluya el cobro de haberes. Si la firmás en el exterior, tiene que estar apostillada o visada, con 180 días de vigencia, y traducida por traductor público si está en otro idioma.',
      },
    ],
    related: [
      { label: '¿Cuándo me puedo jubilar?', to: '/cuando-me-puedo-jubilar-uruguay' },
      {
        label: 'Jubilación y AFAP: cómo funciona',
        to: '/guias/jubilacion-y-afap-como-funciona-uruguay',
      },
      {
        label: 'Enviar y recibir dinero del exterior',
        to: '/guias/enviar-recibir-dinero-exterior',
      },
      { label: 'Canasta de fin de año del BPS', to: '/guias/canasta-fin-de-ano-bps-uruguay' },
    ],
    sources: [
      {
        label:
          '¿Cómo solicito una jubilación o pensión desde el exterior? — con convenio, la solicitud va al "organismo de seguridad social de su país de residencia"; sin convenio o sin períodos del exterior, en el BPS o "a través de un apoderado"; teléfono desde el exterior +598 1997 0000, de lunes a viernes de 8 a 18 (actualizado el 27/03/2026)',
        url: 'https://www.bps.gub.uy/12675/como-solicito-una-jubilacion-o-pension-desde-el-exterior.html',
        publisher: 'BPS',
      },
      {
        label:
          'Convenios internacionales — lista de convenios bilaterales y multilaterales (Mercosur e Iberoamericano; Perú figura por el Iberoamericano, no como bilateral) y lo que permiten: "acumulación de períodos de servicio en ambos países" y "pago de jubilaciones y pensiones en el exterior sin quitas ni retenciones" (actualizado el 11/09/2026)',
        url: 'https://www.bps.gub.uy/12610/convenios-internacionales.html',
        publisher: 'BPS',
      },
      {
        label:
          'Acuerdo Multilateral de Seguridad Social del Mercosur, art. 7 — los períodos cumplidos en los Estados Partes "serán considerados, para la concesión de las prestaciones por vejez, edad avanzada, invalidez o muerte", y el reglamento "establecerá también los mecanismos de pago a prorrata de las prestaciones"',
        url: 'https://www.impo.com.uy/bases/leyes-internacional/17207-1999',
        publisher: 'IMPO',
      },
      {
        label:
          'Giros al exterior — envío "a partir del 5to día hábil de cada mes en la moneda del país de residencia", sin comisión del BPS y con un descuento del BROU de US$ 8; IBAN y SWIFT; Argentina con DNI y Banelco; excluye pensión a la vejez, pensión por invalidez y prestaciones de activos (actualizado el 02/09/2025)',
        url: 'https://www.bps.gub.uy/15767/giros-al-exterior.html',
        publisher: 'BPS',
      },
      {
        label:
          'Nuevos plazos para acreditar fe de vida — desde el 1/7/2025, biometría 90 días (antes 30), documentación física 60 días (antes 90) y presencial 90 días',
        url: 'https://www.bps.gub.uy/23115/nuevos-plazos-para-acreditar-fe-de-vida.html',
        publisher: 'BPS',
      },
      {
        label:
          'Poderes y otras representaciones — desde el extranjero "la carta poder debe estar apostillada o visada (180 días de vigencia)", legalización ante el Ministerio de Relaciones Exteriores si no está apostillada, traducción por traductor público, cobro de haberes y 30 días de vigencia del poder general de administración y disposición desde su protocolización ante escribano uruguayo (actualizado el 05/05/2026)',
        url: 'https://www.bps.gub.uy/11414/poderes-y-otras-representaciones.html',
        publisher: 'BPS',
      },
    ],
  },
  {
    slug: 'canasta-fin-de-ano-bps-uruguay',
    title: 'Canasta de fin de año del BPS: ¿me corresponde?',
    description:
      'En 2025 fue de $ 3.151 para jubilados y pensionistas con pasividades de hasta $ 20.458 y sin otros ingresos. Quién la cobra, cuándo se paga y si hay que pedirla.',
    tag: 'JUBILADOS',
    updatedAt: '2026-09-13',
    sections: [
      {
        heading: 'Qué es la canasta de fin de año y cuánto fue en 2025',
        body: 'A pesar del nombre, no es una caja con comida: es plata. El BPS la define como "una partida monetaria que se abona una vez al año a pasivos que reúnen ciertas condiciones", y el Decreto 264/025 autorizó al BPS a otorgar en 2025 "un beneficio especial consistente en una Canasta de Fin de Año en dinero, cuyo valor será de $ 3.151". Según el BPS, se pagó a partir del martes 2 de diciembre de 2025, cuando se abonaban las pasividades de noviembre, y llegó por el mismo medio por el que cada beneficiario cobra habitualmente. El propio organismo estimó que 165.244 personas podían acceder, por un monto total de 520,7 millones de pesos. Conviene no confundirla con un aumento: no es una suba de la jubilación ni se repite todos los meses, es un pago único en el año que se agrega a la pasividad de noviembre. Y como se verá más abajo, ni siquiera está garantizado que exista el año siguiente con el mismo monto.',
      },
      {
        heading: 'Cada año depende de un decreto nuevo',
        body: 'Esto es lo que casi nadie aclara y lo que explica por qué la pregunta vuelve cada fin de año. La canasta no está fijada de una vez para siempre: el Poder Ejecutivo la autoriza por decreto, con su monto y sus condiciones. El Decreto 345/023, de octubre de 2023, la autorizó para 2023 y para 2024; el Decreto 264/025, firmado el 25 de noviembre de 2025, la autorizó para 2025. Para 2026, el monto recién existe cuando se publica el decreto, así que cualquier cifra que veas circular antes es una estimación y no un dato. Los dos últimos decretos se firmaron el 26 de octubre de 2023 y el 25 de noviembre de 2025, y en 2025 el pago acompañó a las pasividades de noviembre. La tabla muestra las tres ediciones con su monto oficial.',
        table: {
          headers: ['Año', 'Monto', 'Decreto'],
          rows: [
            ['2023', '$ 2.868', 'Decreto 345/023'],
            ['2024', '$ 2.987', 'Decreto 345/023'],
            ['2025', '$ 3.151', 'Decreto 264/025'],
          ],
        },
      },
      {
        heading: 'El tope: cobrar hasta la jubilación mínima',
        body: 'La condición de ingresos no es un número inventado para la ocasión: está atada a la jubilación mínima. El artículo 2 del Decreto 264/025 alcanza a quienes perciben "hasta el monto mínimo vigente de jubilación y pensión" al 31 de octubre de 2025, y el BPS lo tradujo a pesos: pasividades de hasta $ 20.458 por mes, equivalentes a 3,111 BPC. En la práctica, la canasta es para quien cobra la mínima, no para quien cobra un poco más: con una pasividad de $ 20.500, en 2025 ya quedabas afuera. Si la próxima edición repite esa regla, el tope en pesos se va a mover con la jubilación mínima de ese año, por eso el número de 2025 no sirve para decidir si te toca en 2026. Para los pensionistas la vara no es sólo su propia pasividad: el artículo 4 los deja afuera si el ingreso por integrante de su hogar supera ese mismo mínimo, y a los pensionistas por sobrevivencia el BPS les pidió acreditarlo con una declaración jurada de que el promedio de ingresos de su núcleo familiar no supera los $ 20.458.',
      },
      {
        heading: 'Quién queda afuera aunque cobre poco',
        body: 'Cobrar la mínima no alcanza, porque las exclusiones pesan tanto como el tope. El artículo 3 del Decreto 264/025 deja afuera a los jubilados que perciban "otros ingresos de cualquier cuantía, naturaleza u origen público o privado", a los que no residen en el país y a los que, estando amparados a un convenio internacional o a una acumulación de servicios, tienen menos del 50 % de sus servicios en el BPS. "De cualquier cuantía" hay que leerlo literal: no importa que el otro ingreso sea chico, alcanza con que exista. El artículo 4 aplica la misma exclusión por otros ingresos a los pensionistas, que además tienen que tener 65 años o más, y el BPS incluyó a los pensionistas por sobrevivencia, vejez e invalidez y a los beneficiarios de Asistencia a la Vejez que eran mayores de 65 años al 31 de octubre de 2025. Si cobrás tu jubilación del BPS viviendo en otro país, esta partida no te alcanza, por la exclusión de los no residentes.',
      },
      {
        heading: '¿Hay que anotarse para cobrarla?',
        body: 'En la edición 2025, según el BPS, la canasta se pagó por el medio en el que cada beneficiario cobra habitualmente sus prestaciones, junto con las pasividades de noviembre. La gestión que pidió el organismo fue una declaración jurada de los pensionistas por sobrevivencia, para acreditar que el ingreso promedio de su núcleo familiar no superaba los $ 20.458. El BPS le puso un plazo concreto para los que no la habían cobrado: "Los pensionistas por sobrevivencia que no cobran el beneficio deberán realizar la declaración jurada hasta el 5 de enero de 2026". Es decir que la declaración no era sólo un paso previo al pago: servía también para reclamar la canasta cuando no había llegado en diciembre. Si sos pensionista por sobrevivencia y no la cobraste, ese era el camino, y es lo primero que conviene averiguar cuando se publique la edición siguiente, porque cada decreto puede cambiar quién tiene que declarar y hasta cuándo.',
      },
      {
        heading: 'Cómo saber si te corresponde, en cinco preguntas',
        body: 'Con las reglas de 2025 en la mano, la respuesta sale de cinco preguntas que podés contestar con tu recibo de pasividad. ¿Vivís en Uruguay? Si no, no corresponde. ¿Tu pasividad llega como mucho a la jubilación mínima vigente, que al 31 de octubre de 2025 era de $ 20.458? ¿Tenés algún otro ingreso, de cualquier monto y origen? Si lo tenés, quedás afuera. Si sos pensionista, ¿tenés 65 años o más? Y si tu jubilación se calculó sumando años de otro país o de otra caja, ¿más de la mitad de tus servicios están en el BPS? Si las cinco respuestas te dan a favor y aun así no la cobraste, lo que corresponde es consultar en el BPS con tu cédula y tu último recibo, porque la liquidación la hace el organismo con sus propios registros y ahí se ve qué dato te dejó afuera. Tené presente que la próxima edición puede traer otro monto y otras condiciones, porque cada decreto las fija de nuevo.',
      },
      {
        heading: 'No confundirla con la prima por edad',
        body: 'Hay otra prestación del BPS para jubilados de pocos recursos que conviene separar de la canasta, porque tiene otra edad, otro tope y otro trámite. La prima por edad, según el BPS, es para "los jubilados mayores de 70 años de menores recursos", con un tope de ingresos de 3,7006 BPC, medido a enero del año en que se controlan los ingresos, y exige una declaración jurada de los ingresos nominales personales y del núcleo familiar. La canasta, en cambio, se mide contra la jubilación mínima, no pide una edad mínima a los jubilados y, en la edición 2025, sólo pidió declaración a los pensionistas por sobrevivencia. Cumplir las condiciones de una no garantiza la otra: son dos prestaciones distintas, cada una con su propio control. Si tenés más de 70 años y cobrás poco, vale la pena revisar las dos por separado con tu recibo en la mano.',
      },
    ],
    faqs: [
      {
        q: '¿Cómo saber si me corresponde la canasta del BPS?',
        a: 'Con las reglas de 2025: vivir en Uruguay, cobrar hasta la jubilación mínima ($ 20.458 ese año), no tener otros ingresos de ningún monto, tener 65 años o más si sos pensionista y, si tu jubilación suma años de otro país o caja, tener más de la mitad de los servicios en el BPS.',
      },
      {
        q: '¿Cuándo pagan la canasta de fin de año?',
        a: 'En 2025 se pagó a partir del martes 2 de diciembre, junto con las pasividades de noviembre. Para 2026 la fecha y el monto dependen de que se publique un decreto nuevo.',
      },
      {
        q: '¿De cuánto es la canasta de fin de año?',
        a: 'Fue de $ 3.151 en 2025 según el Decreto 264/025, y de $ 2.987 en 2024 y $ 2.868 en 2023 según el Decreto 345/023. El monto de cada año lo fija su decreto.',
      },
      {
        q: '¿Hay que anotarse para cobrar la canasta?',
        a: 'En 2025 se pagó por el medio de cobro habitual. La gestión que pidió el BPS fue una declaración jurada de los pensionistas por sobrevivencia, con plazo hasta el 5 de enero de 2026 para quienes no la habían cobrado.',
      },
      {
        q: 'Cobro la mínima pero tengo otro ingreso, ¿me corresponde?',
        a: 'Con las reglas de 2025, no. El Decreto 264/025 excluye tanto a los jubilados (artículo 3) como a los pensionistas (artículo 4) que perciben otros ingresos "de cualquier cuantía, naturaleza u origen público o privado".',
      },
      {
        q: 'Vivo afuera y cobro la jubilación del BPS, ¿me corresponde?',
        a: 'No. El Decreto 264/025 excluye expresamente a los jubilados no residentes en el país.',
      },
    ],
    related: [
      { label: '¿Cuándo me puedo jubilar?', to: '/cuando-me-puedo-jubilar-uruguay' },
      {
        label: 'Jubilación y AFAP: cómo funciona',
        to: '/guias/jubilacion-y-afap-como-funciona-uruguay',
      },
      {
        label: 'Cobrar la jubilación desde el exterior',
        to: '/guias/cobrar-jubilacion-uruguaya-desde-el-exterior',
      },
    ],
    sources: [
      {
        label:
          'Canasta de fin de año — "una partida monetaria que se abona una vez al año a pasivos que reúnen ciertas condiciones"; residencia en Uruguay, ingresos menores a $ 20.458, pensionistas de 65 años o más, más del 50 % de servicios en el BPS en acumulación o convenio, $ 3.151 (valor 2025) y declaración jurada de pensionistas por sobrevivencia hasta el 5/1/2026 (actualizado el 04/12/2025)',
        url: 'https://www.bps.gub.uy/21733/canasta-de-fin-de-ano.html',
        publisher: 'BPS',
      },
      {
        label:
          'Partida especial de fin de año para jubilados y pensionistas — $ 3.151 a partir del martes 2 de diciembre de 2025 por el medio de pago habitual, tope de $ 20.458 (3,111 BPC) y 165.244 posibles beneficiarios por 520,7 millones de pesos (25/11/2025)',
        url: 'https://www.bps.gub.uy/23594/partida-especial-de-fin-de-ano-para-jubilados-y-pensionistas.html',
        publisher: 'BPS',
      },
      {
        label:
          'Más de 155.000 jubilados y pensionistas de bajos recursos recibirán partida especial de fin de año — deben vivir en Uruguay y no percibir otros ingresos; los pensionistas por sobrevivencia presentan declaración jurada del ingreso promedio del núcleo familiar (26/11/2025)',
        url: 'https://www.gub.uy/presidencia/comunicacion/noticias/155000-jubilados-pensionistas-bajos-recursos-recibiran-partida-especial-fin',
        publisher: 'Presidencia',
      },
      {
        label:
          'Decreto 264/025 (25/11/2025), arts. 1 a 4 — canasta de $ 3.151 en 2025 para quienes perciben "hasta el monto mínimo vigente de jubilación y pensión" al 31/10/2025; excluye a jubilados con "otros ingresos de cualquier cuantía, naturaleza u origen público o privado", no residentes y con menos del 50 % de servicios en el BPS, y a pensionistas con otros ingresos, en hogares cuyo ingreso por integrante supere ese mínimo o menores de 65 años',
        url: 'https://www.impo.com.uy/bases/decretos/264-2025',
        publisher: 'IMPO',
      },
      {
        label:
          'Decreto 345/023 (26/10/2023) — canasta de fin de año para 2023, de $ 2.868, y para 2024, de $ 2.987',
        url: 'https://www.impo.com.uy/bases/decretos/345-2023',
        publisher: 'IMPO',
      },
      {
        label:
          'Prima por edad — para "los jubilados mayores de 70 años de menores recursos", con ingresos de hasta 3,7006 BPC y declaración jurada de ingresos personales y del núcleo familiar (actualizado el 06/05/2026)',
        url: 'https://www.bps.gub.uy/15193/',
        publisher: 'BPS',
      },
    ],
  },
  {
    slug: 'como-pedir-un-aumento-de-sueldo-uruguay',
    title: 'Cómo pedir un aumento de sueldo en Uruguay',
    description:
      'Confirmá tu laudo y los ajustes del Consejo de Salarios, retroactivos incluidos. Después, cuándo pedir más, con qué argumentos y por qué no hay un porcentaje correcto.',
    tag: 'AUMENTO',
    updatedAt: '2026-09-13',
    sections: [
      {
        heading: 'Antes de pedir: ¿ya te pagan lo que te corresponde?',
        body: 'Muchas consultas sobre aumentos esconden otra pregunta: si el sueldo actual está bien. En Uruguay hay un piso que no se negocia con tu jefe, se consulta. El artículo 5 de la Ley 10.449 les da a los Consejos de Salarios el cometido de "fijar el monto mínimo de los salarios por categoría laboral" y de actualizar las remuneraciones del sector privado, y sus decisiones rigen una vez registradas y publicadas por el Poder Ejecutivo. Ese mínimo depende del grupo de actividad de la empresa, del subgrupo y de tu categoría, no de lo que aceptaste al firmar. Si cobrás por debajo del laudo de tu categoría, lo que corresponde no es pedir un aumento sino reclamar la diferencia. Para confirmarlo, el Ministerio de Trabajo tiene un servicio de consulta gratuito que responde por web sobre los acuerdos de cada sector, incluidos los aumentos y sus fechas de vigencia. En nuestra página sobre cuánto te tienen que pagar está el método para encontrar tu grupo y tu categoría.',
        links: [
          {
            label: 'Cuánto me tienen que pagar: encontrá tu laudo',
            to: '/cuanto-me-tienen-que-pagar-uruguay',
          },
        ],
      },
      {
        heading: 'El aumento que llega sin pedirlo: la ronda 2025-2027',
        body: 'Además del mínimo, los Consejos de Salarios fijan cuánto sube tu sueldo y cuándo. Para la ronda que empezó en 2025, el Poder Ejecutivo presentó el 3 de julio de 2025 sus lineamientos: convenios a dos años, "aumentos salariales nominales semestrales, correctivos anuales" y tres franjas de salario con ajustes diferenciados, en 185 mesas que alcanzan a unos 745.000 trabajadores privados. Son lineamientos, no el acuerdo de tu sector: cada grupo firma el suyo. Para ver cómo queda escrito sirve un acta real, la del Grupo 10 (comercio en general), subgrupo 20 (barracas de cooperativas de cereales), firmada el 19 de noviembre de 2025. Rige del 1 de julio de 2025 al 30 de junio de 2027, con ajustes el 1 de julio y el 1 de enero, y el porcentaje depende del nivel, medido sobre el sueldo nominal al 30 de junio de 2025 para 44 horas semanales: hasta $ 35.704 es el Nivel I, de $ 35.705 a $ 151.459 el Nivel II y desde $ 151.460 el Nivel III. La tabla muestra sus cuatro ajustes, antes de los correctivos que prevé el acta. Tu grupo tiene los suyos, pero se leen igual.',
        table: {
          headers: ['Ajuste (acta del Grupo 10, subgrupo 20)', 'Nivel I', 'Nivel II', 'Nivel III'],
          rows: [
            ['1 de julio de 2025', '3,07 %', '2,27 %', '1,37 %'],
            ['1 de enero de 2026', '3,36 %', '3,07 %', '2,67 %'],
            ['1 de julio de 2026', '2,57 %', '1,67 %', '1,47 %'],
            ['1 de enero de 2027', '3,26 %', '2,97 %', '2,47 %'],
          ],
        },
      },
      {
        heading: 'Lo que casi nadie mira: tu franja decide tu porcentaje',
        body: 'En esta ronda el porcentaje no es igual para todos, y eso cambia la estrategia. En el acta del ejemplo, el ajuste de julio de 2025 fue de 3,07 % para el Nivel I y de 1,37 % para el Nivel III, aplicado sobre los salarios vigentes al 30 de junio de 2025 y para "todo el personal dependiente de las categorías laudadas", no sólo para quien cobra el mínimo. Traducido: en ese grupo, si ganás bien por encima del laudo, el ajuste automático te toca igual, pero es el más chico de la tabla, y cuanto más arriba estás, más de tu sueldo real depende de lo que negocies vos. Para quien está en la franja baja pasa lo contrario: el convenio ya le da el ajuste más alto, y lo que más plata le puede mover no es negociar sino verificar que esté bien categorizado. Antes de pedir, entonces, ubicá tu nivel en el acta de tu propio grupo, fijate cómo escribe a quién alcanza el ajuste y hacé la cuenta de cuánto te va a subir el sueldo sin hacer nada.',
      },
      {
        heading: 'Si tu Consejo de Salarios firmó tarde: el retroactivo',
        body: 'El acta del ejemplo se firmó en noviembre, pero su primer aumento rige desde el 1 de julio de 2025. Esa distancia tiene nombre. El BPS la llama retroactividades por laudo, las que surgen de los acuerdos de los Consejos de Salarios. La empresa declara esas diferencias de meses anteriores al BPS con rectificativas de las nóminas ya presentadas, y los aportes del retroactivo vencen junto con las obligaciones del mes en que se publica el acta. Por eso, cuando tu grupo todavía no firmó, el aumento no se pierde por esperar: se paga hacia atrás desde la fecha de vigencia que fije el acuerdo. Lo que sí conviene hacer es anotar, mes a mes, cuánto cobraste mientras tanto, para poder controlar que el retroactivo sea el correcto cuando llegue. Y si el acuerdo ya se publicó y la diferencia no aparece en tu recibo, eso tampoco se pide como favor: es plata que te deben.',
      },
      {
        heading: 'Si hacés tareas de otra categoría, eso no se pide: se reclama',
        body: 'Es la situación de quien entró para un puesto y terminó cubriendo también las tareas de otros. El mínimo se fija por categoría laboral, y si las tareas que hacés corresponden a una categoría con un mínimo más alto, la conversación no es de aumento sino de categoría, y conviene llevarla así: con la descripción de tu puesto en una mano y la de la categoría superior en la otra. Por encima del laudo, el sueldo se pacta entre vos y la empresa. Lo que la ley sí prohíbe es que una diferencia de sueldo responda a una discriminación: la Ley 16.045 prohíbe la discriminación por sexo en el trabajo e incluye expresamente el "criterio de remuneración". Con la categoría verificada en la consulta gratuita del Ministerio de Trabajo, la charla con tu jefe cambia de tono: dejás de pedir un favor y pasás a señalar un error, que además tiene fecha de inicio. Si el error se confirma, lo que corresponde es corregir la categoría, no negociar un monto.',
      },
      {
        heading: 'Por encima del laudo: cuándo pedir',
        body: 'Acá no hay un plazo legal que esperar ni uno que te habilite: es una negociación, y el momento lo elegís vos. Los mejores momentos tienen algo en común, una razón nueva que la empresa pueda reconocer. Sirven el cierre de un período de evaluación, si la empresa lo tiene; el momento en que te sumaron tareas o responsabilidades que no estaban en tu puesto; un resultado medible que puedas atribuirte; o una oferta concreta de otro lado. Hay dos momentos que conviene evitar: la semana de un problema grave de la empresa y el día en que estás enojado. Ojo con un consejo que se repite mucho, el de esperar a cumplir el año: no tiene respaldo legal, pero sí una lógica práctica, porque en los primeros meses la empresa todavía está invirtiendo en enseñarte. Si llevás poco tiempo, lo razonable suele ser acordar desde ya una fecha de revisión y llegar a esa fecha con pruebas de lo que hiciste.',
      },
      {
        heading: 'Con qué argumentos, y por qué no existe un porcentaje correcto',
        body: 'La pregunta de cuál es el porcentaje correcto para pedir no tiene respuesta, y conviene desconfiar de quien te dé uno. Los únicos porcentajes con respaldo oficial son los del convenio de tu grupo; todo lo que esté por encima es una negociación entre dos partes. Lo que sí funciona es llegar con una cifra concreta, no con un "quiero ganar más", y con el argumento armado sobre tres patas. Lo que hacés: la lista de tareas y responsabilidades que tenés hoy, comparada con la descripción del puesto por el que te contrataron. Lo que lograste: resultados con fecha y, si se puede, con números. Y lo que vale afuera: ofertas o entrevistas reales para puestos parecidos, no promedios sueltos de internet. Lo que no funciona como argumento son tus gastos, porque la empresa paga el puesto y no tu presupuesto. Si te dicen que no, preguntá qué tendría que pasar para que sea que sí y en qué fecha lo vuelven a mirar, y confirmalo en un correo después de la reunión.',
      },
    ],
    steps: [
      {
        name: 'Ubicá tu grupo, subgrupo y categoría',
        text: 'Con el método de la página sobre cuánto te tienen que pagar o con la consulta gratuita del Ministerio de Trabajo.',
      },
      {
        name: 'Compará tu sueldo con el laudo vigente',
        text: 'Si estás por debajo, no es un aumento: es una diferencia que se reclama.',
      },
      {
        name: 'Revisá los ajustes y los retroactivos',
        text: 'Buscá en el acta de tu grupo en qué nivel estás, qué porcentaje te toca en cada ajuste y desde qué fecha rige.',
      },
      {
        name: 'Armá tu caso por escrito',
        text: 'Tareas actuales frente a las del puesto, resultados con fecha y referencias reales de mercado.',
      },
      {
        name: 'Pedí una cifra concreta en una reunión',
        text: 'Elegí un momento con una razón nueva y llevá un número, no un pedido genérico.',
      },
      {
        name: 'Cerrá con una fecha',
        text: 'Si la respuesta es no, preguntá qué haría falta y cuándo se revisa, y confirmalo por correo.',
      },
    ],
    faqs: [
      {
        q: '¿Cuál es el porcentaje correcto para pedir un aumento?',
        a: 'No hay uno. Los únicos porcentajes con respaldo oficial son los ajustes del convenio de tu grupo, que en esta ronda los lineamientos del Poder Ejecutivo diferencian por franja de salario. Por encima de eso es una negociación: llevá una cifra concreta que puedas justificar con tus tareas, tus resultados y referencias reales de mercado.',
      },
      {
        q: '¿Cuánto tiempo tengo que esperar para pedir un aumento?',
        a: 'No hay un plazo legal para pedir un aumento por encima del laudo; el consejo de esperar un año es práctico, no legal. Si en cambio cobrás menos que el laudo de tu categoría, no tenés que esperar nada: es una diferencia que se reclama.',
      },
      {
        q: 'El Consejo de Salarios de mi sector todavía no firmó, ¿pierdo el aumento?',
        a: 'No por esperar: cuando el acuerdo fija una vigencia anterior a su firma, el aumento corre desde esa fecha y la diferencia se paga como retroactivo. Por ejemplo, el acta del Grupo 10, subgrupo 20, firmada el 19 de noviembre de 2025, fija su primer aumento desde el 1 de julio de 2025.',
      },
      {
        q: 'Si gano más que el laudo, ¿me toca el aumento del Consejo de Salarios?',
        a: 'Depende de cómo lo escriba el acta de tu grupo. En la del Grupo 10, subgrupo 20, los ajustes alcanzan a todo el personal de las categorías laudadas, sobre los salarios vigentes, con un porcentaje menor para los sueldos más altos.',
      },
      {
        q: 'Me pagan menos que a la persona que reemplacé, ¿es legal?',
        a: 'El piso legal es el laudo de tu categoría, y por encima de ese piso el sueldo se pacta. Lo que no puede haber es una diferencia por discriminación, como la de sexo, que la Ley 16.045 prohíbe también en el criterio de remuneración. Si hacés tareas de una categoría más alta, eso sí se reclama.',
      },
      {
        q: '¿Cómo sé en qué grupo y categoría estoy?',
        a: 'Nuestra página sobre cuánto te tienen que pagar explica cómo ubicarlos. Y el Ministerio de Trabajo responde gratis, por web, cuál es el acuerdo de tu sector, con sus mínimos, aumentos y fechas de vigencia.',
      },
    ],
    related: [
      { label: 'Cuánto me tienen que pagar', to: '/cuanto-me-tienen-que-pagar-uruguay' },
      { label: 'Salario mínimo: cuánto es', to: '/guias/salario-minimo-uruguay-cuanto-es' },
      { label: 'Entender tu recibo de sueldo', to: '/guias/entender-tu-recibo-de-sueldo-uruguay' },
      { label: 'Renunciar al trabajo: qué cobrás', to: '/renunciar-al-trabajo-uruguay' },
    ],
    sources: [
      {
        label:
          'Ley 10.449 art. 5 — los Consejos de Salarios tienen el cometido de "fijar el monto mínimo de los salarios por categoría laboral" y actualizar las remuneraciones; sus decisiones rigen una vez registradas y publicadas por el Poder Ejecutivo',
        url: 'https://www.impo.com.uy/bases/leyes/10449-1943/5',
        publisher: 'IMPO',
      },
      {
        label:
          'Lineamientos de la 11.ª ronda (03/07/2025) — convenios a dos años, "aumentos salariales nominales semestrales, correctivos anuales" y tres franjas (hasta $ 38.950, hasta $ 165.228 y más), en 185 mesas que alcanzan a 745.000 trabajadores',
        url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/comunicacion/noticias/gobierno-presento-lineamientos-nueva-ronda-salarial-foco-empleo-salarios',
        publisher: 'MTSS',
      },
      {
        label:
          'Acta del Consejo de Salarios del Grupo 10, subgrupo 20 (19/11/2025) — vigencia del 1/7/2025 al 30/6/2027; niveles hasta $ 35.704, de $ 35.705 a $ 151.459 y desde $ 151.460; ajustes del 1/7/2025 (3,07 / 2,27 / 1,37 %), 1/1/2026 (3,36 / 3,07 / 2,67 %), 1/7/2026 (2,57 / 1,67 / 1,47 %) y 1/1/2027 (3,26 / 2,97 / 2,47 %) para "todo el personal dependiente de las categorías laudadas"',
        url: 'https://www.impo.com.uy/bases/otras-normas-originales/SN20251212001-2025',
        publisher: 'IMPO',
      },
      {
        label:
          'Retroactividades por laudo — las "retroactividades por laudo que surgen de los Consejos de Salarios" se declaran con rectificativas de la nómina del mes a rectificar, y "El plazo para el pago de aportes retroactivos vence conjuntamente con el plazo correspondiente a las obligaciones del mes de cargo en el cual se realiza la publicación del acta del acuerdo" (actualizado el 07/12/2021)',
        url: 'https://www.bps.gub.uy/14980/retroactividades-por-laudo.html',
        publisher: 'BPS',
      },
      {
        label:
          'Consultas laborales y salariales vía web — "Es un servicio gratuito de asesoramiento laboral y/o salarial a trabajadores y empleadores de la actividad privada", con información de los acuerdos de cada sector, sus aumentos y fechas de vigencia (actualizado el 28/08/2025)',
        url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/consultas-laborales-salariales-via-web',
        publisher: 'MTSS',
      },
      {
        label:
          'Ley 16.045 art. 2 — prohíbe la discriminación por sexo en el trabajo e incluye el "criterio de remuneración" (literal K)',
        url: 'https://www.impo.com.uy/bases/leyes/16045-1989/2',
        publisher: 'IMPO',
      },
    ],
  },
  {
    slug: 'pedir-que-me-despidan-uruguay',
    title: '¿Puedo pedir que me despidan en vez de renunciar?',
    description:
      'Despido, renuncia o acuerdo de egreso: qué cambia en indemnización y seguro de paro, por qué un egreso pactado puede quedar sin subsidio y qué arriesgás si se simula.',
    tag: 'DESPIDO',
    updatedAt: '2026-09-13',
    sections: [
      {
        heading: 'Qué cambia en la plata entre renunciar y que te despidan',
        body: 'La diferencia es menos grande de lo que se cree y está concentrada en dos rubros. Lo ya generado se cobra en los dos casos: el Ministerio de Trabajo, al contestar qué se debe cuando el trabajador deja el empleo por abandono, dice que la empresa "lo único que debe abonar es la licencia no gozada, el salario vacacional y el aguinaldo generado, y no corresponde la indemnización por despido", y esa misma lógica es la que rige para la renuncia. El despido agrega dos cosas. Una es la indemnización, que para el mensual es la "remuneración total correspondiente a un mes de sueldo por cada año o fracción de actividad", sin antigüedad mínima; el jornalero tiene su propio régimen, que explicamos en la página de indemnización. La otra es la posibilidad de cobrar el seguro de paro, que tiene sus propios requisitos. Esas dos piezas son las que están en juego cuando alguien pide que lo despidan, y ninguna de las dos se consigue con cualquier acuerdo.',
        table: {
          headers: ['Rubro', 'Renuncia', 'Despido', 'Acuerdo de egreso'],
          rows: [
            ['Licencia no gozada, salario vacacional y aguinaldo generado', 'Sí', 'Sí', 'Sí'],
            [
              'Indemnización por despido',
              'No',
              'Sí: un mes por año o fracción (mensual)',
              'Lo que se pacte',
            ],
            [
              'Seguro de paro',
              'No: la salida no es forzosa',
              'Sí, si cumplís los requisitos',
              'En riesgo: el BPS lo negó en un retiro incentivado',
            ],
          ],
        },
        links: [
          {
            label: 'Indemnización por despido: cuánto es',
            to: '/indemnizacion-por-despido-uruguay',
          },
          { label: 'Renunciar al trabajo: qué cobrás', to: '/renunciar-al-trabajo-uruguay' },
        ],
      },
      {
        heading: '¿Puedo pedirle a la empresa que me despida?',
        body: 'Pedirlo no está prohibido; lo que no podés es decidirlo vos, porque el despido es de la empresa. La definición que usó el propio BPS al resolver un caso es precisa: el despido "es un acto unilateral del empleador por el que se pone fin al contrato de trabajo, que no requiere el consentimiento de la otra parte". De ahí salen las dos respuestas posibles. Si le planteás a la empresa que te querés ir y la empresa decide despedirte, pagando lo que la ley manda, formalmente es un despido y cobrás la indemnización, aunque para el seguro de paro, como se ve más abajo, lo que cuenta es que la desocupación no haya sido imputable a tu voluntad. Si en cambio lo que hay es un trato, en el que vos te vas y a cambio ellos te dan algo o vos resignás algo, eso deja de ser un acto unilateral y pasa a ser un acuerdo de voluntades, con otras consecuencias. Tené en cuenta además que la empresa tiene poco incentivo para aceptar: despedirte le cuesta la indemnización y que te vayas por tu cuenta se la ahorra. Por eso, si te llega el rumor de que te van a despedir y el clima empeora, pensalo dos veces antes de renunciar.',
      },
      {
        heading: 'El seguro de paro mira si la salida fue forzosa',
        body: 'Acá está la trampa del despido arreglado. El artículo 2 del Decreto-Ley 15.180 paga el subsidio a quien esté "en situación de desocupación forzosa no imputable a su voluntad o capacidad laboral". No alcanza con que el formulario diga despido: lo que importa es si la desocupación fue forzosa. El BPS ya lo aplicó en un caso concreto. En la resolución R.D. 18-16/2005 negó el subsidio a ex trabajadores que se habían ido por un retiro incentivado en el que la empresa les pagó todos los créditos laborales, "incluida la indemnización por despido", más un monto adicional por la renuncia. El razonamiento fue que ahí hubo "un acuerdo de voluntades" y que por eso la desocupación "no reviste las características de forzosa e inimputable a sus voluntades". Esa resolución resolvió el caso de una empresa y manda aplicar el criterio a situaciones semejantes en esa empresa, no a todo el país, pero muestra con qué vara mira el BPS un egreso pactado: aunque cobres la indemnización, el seguro de paro puede quedar afuera.',
        links: [{ label: 'Seguro de paro: quién lo cobra', to: '/seguro-de-paro-uruguay' }],
      },
      {
        heading: 'Simular un despido: qué se arriesga',
        body: 'La versión que circula es la de hacerse despedir, cobrar el seguro y devolver la indemnización por abajo. Conviene mirarla con las reglas del régimen y no con la confianza en el jefe. Si el despido es una ficción para cobrar el subsidio, lo cobrado no cumple la condición del artículo 2, y el Decreto-Ley 15.180 tiene dos herramientas para eso. Su artículo 15 faculta a retener de las prestaciones a servir "las sumas que los beneficiarios hubieren percibido indebidamente", y su artículo 14 castiga las infracciones a las normas que controla el seguro de desempleo con multas de uno a cincuenta jornales o días de sueldo por cada trabajador comprendido, que se duplican si hay reincidencia. Y el trato por abajo no protege a nadie: la devolución de la indemnización no queda en ningún papel que puedas mostrar, y lo único que la probaría es la propia maniobra. Si lo que querés es tiempo para un proyecto, el camino limpio es negociar con la empresa una licencia o un cambio de horario, que no dependen de fingir nada.',
      },
      {
        heading: 'Si te quieren sacar: esperar, o el despido indirecto',
        body: 'Cuando la empresa ya decidió prescindir de vos, lo que más plata te conserva suele ser lo menos atractivo: seguir yendo hasta que el despido llegue, sin darle un motivo, mientras buscás otro trabajo. Renunciar en ese momento es regalarle la indemnización. Si el problema no es la espera sino un incumplimiento grave de la empresa, existe el despido indirecto: te vas vos, pero la ruptura se le imputa al empleador y cobrás como si te hubieran despedido. No lo tomes a la ligera, porque no está en una ley general, lo tenés que probar vos y, si no lo lográs, a los ojos del expediente renunciaste. Antes de irte, juntá recibos, mensajes y testigos, y leé la guía de despido y liquidación, que explica qué incumplimientos lo configuraron en casos reales y cuáles no alcanzaron. Si no podés pagar un abogado, la guía de abogado gratis te dice qué puerta te corresponde según tu situación, antes de firmar o de dar el portazo.',
        links: [
          {
            label: 'Despido indirecto: qué lo configura',
            to: '/guias/despido-y-liquidacion-uruguay',
          },
          { label: 'Abogado gratis en Uruguay', to: '/guias/abogado-gratis-uruguay' },
        ],
      },
      {
        heading: 'Con pocos meses en la empresa: qué cambia de verdad',
        body: 'La cuenta cambia mucho cuando llevás poco tiempo, y conviene hacerla antes de arriesgar nada. Del lado de la indemnización, el Ministerio de Trabajo aclara que no se exige antigüedad mínima, así que un mensual con cuatro meses cobra una mensualidad, porque la fracción de año cuenta como un año. Del lado del seguro de paro, en cambio, el requisito mira hacia atrás: para un mensual de industria y comercio, el BPS pide "haber computado 180 días en planilla" en los 12 meses previos a la desocupación. Si en ese período no llegás a esos días, el despido te da la indemnización pero no el subsidio, y la diferencia real con renunciar se reduce a esa mensualidad. Para el subsidio también hay un plazo que corre desde que te vas: el BPS indica solicitarlo "dentro de los 30 días corridos desde la fecha de egreso". Antes de decidir, mirá tu historia laboral en el BPS para saber cuántos días en planilla tenés en los últimos doce meses.',
      },
      {
        heading: 'Certificarte para estirar el despido: lo que dice la ley',
        body: 'Circula la idea de que certificarte te protege del despido durante meses o que el despido pasa a ser triple. Lo que dice la norma es más acotado. El artículo 23 del Decreto-Ley 14.407 prohíbe despedir o suspender al trabajador ausente por enfermedad que cumplió los requisitos, y agrega que "el trabajador dado de alta no podrá ser despedido antes de que transcurran treinta días de su reincorporación". Si la empresa lo viola, la consecuencia es que "el pago de la indemnización por despido sea el doble de la normal", salvo que pruebe la notoria mala conducta o que el despido no está vinculado con la enfermedad. Son treinta días desde el reintegro y una indemnización doble, no meses ni el triple. Y hay un límite que no es jurídico: la certificación la da un médico por una enfermedad real. Usarla sin estar enfermo para forzar una indemnización mayor no es una estrategia, es fingir una enfermedad. Si el trabajo te está enfermando de verdad, eso es para hablarlo con tu médico, y la ley te protege en esos términos.',
        links: [
          {
            label: 'Me certifiqué: si me pueden despedir',
            to: '/guias/me-certifique-subsidio-por-enfermedad-uruguay',
          },
        ],
      },
    ],
    faqs: [
      {
        q: '¿Puedo adelantar mi despido?',
        a: 'Podés plantearlo, pero el despido es un acto unilateral del empleador. Si la empresa decide despedirte antes, formalmente es un despido y paga la indemnización. Pero si la salida la pediste vos o hubo un trato en el que te vas a cambio de algo, el BPS lo puede leer como un acuerdo de voluntades y negarte el seguro de paro, que exige desocupación forzosa no imputable a tu voluntad.',
      },
      {
        q: 'Si arreglo con la empresa que me despidan, ¿cobro el seguro de paro?',
        a: 'Queda en riesgo. El artículo 2 del Decreto-Ley 15.180 exige desocupación forzosa no imputable a tu voluntad, y el BPS ya negó el subsidio en un retiro incentivado en el que se pagó la indemnización por despido, porque hubo un acuerdo de voluntades (R.D. 18-16/2005).',
      },
      {
        q: 'Si les devuelvo la indemnización, ¿me pueden despedir para que cobre el seguro?',
        a: 'Eso es simular un despido. Lo cobrado sin la condición legal es un subsidio percibido indebidamente, y el artículo 15 del Decreto-Ley 15.180 permite retenerlo de prestaciones futuras. Además, la devolución por abajo no queda en ningún papel que te proteja.',
      },
      {
        q: '¿Cuánto cobro de despido si tengo menos de seis meses?',
        a: 'Si sos mensual, una mensualidad: la indemnización es de un mes por cada año o fracción de actividad y el Ministerio de Trabajo aclara que no se exige antigüedad mínima. El seguro de paro es otra cosa: si cobrás por mes en industria y comercio, pide 180 días en planilla en los 12 meses previos.',
      },
      {
        q: 'Si renuncio, ¿qué cobro?',
        a: 'La licencia no gozada, el salario vacacional y el aguinaldo generado. Lo que se pierde es la indemnización por despido, y la renuncia tampoco da derecho al seguro de paro, que exige desocupación forzosa.',
      },
      {
        q: '¿Si me certifico no me pueden echar por meses?',
        a: 'No son meses. El artículo 23 del Decreto-Ley 14.407 protege mientras estás certificado y durante los treinta días posteriores a tu reincorporación. Si te despiden en ese período, la indemnización es el doble, salvo que la empresa pruebe notoria mala conducta o que el despido no está vinculado con la enfermedad.',
      },
      {
        q: '¿Me pueden despedir sin causa?',
        a: 'Sí, pagando la indemnización. La causal que la borra es la notoria mala conducta, y el Ministerio de Trabajo aclara que es el empleador quien tiene que probarla.',
      },
    ],
    related: [
      { label: 'Renunciar al trabajo', to: '/renunciar-al-trabajo-uruguay' },
      { label: 'Indemnización por despido', to: '/indemnizacion-por-despido-uruguay' },
      { label: 'Seguro de paro', to: '/seguro-de-paro-uruguay' },
      {
        label: 'Me quedé sin trabajo: ¿pierdo la mutualista?',
        to: '/guias/me-quede-sin-trabajo-mutualista-fonasa-uruguay',
      },
    ],
    sources: [
      {
        label:
          'Despido (régimen común) — indemnización equivalente a la "remuneración total correspondiente a un mes de sueldo por cada año o fracción de actividad", sin antigüedad mínima; la notoria mala conducta la debe probar el empleador',
        url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/derecho-reglamentacion-laboral/derecho-laboral-uruguayo/despido-regimen-comun',
        publisher: 'MTSS',
      },
      {
        label:
          'Preguntas frecuentes en materia laboral — ante el abandono del trabajo, "la empresa lo único que debe abonar es la licencia no gozada, el salario vacacional y el aguinaldo generado, y no corresponde la indemnización por despido"',
        url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/institucional/preguntas-frecuentes/materia-laboral',
        publisher: 'MTSS',
      },
      {
        label:
          'Decreto-Ley 15.180, texto vigente — art. 2: subsidio para quien esté "en situación de desocupación forzosa no imputable a su voluntad o capacidad laboral"; art. 14: multas de uno a cincuenta jornales o días de sueldo por trabajador, dobles en reincidencia; art. 15: retención de "las sumas que los beneficiarios hubieren percibido indebidamente"',
        url: 'https://www.impo.com.uy/bases/decretos-ley/15180-1981',
        publisher: 'IMPO',
      },
      {
        label:
          'R.D. 18-16/2005 — el despido "es un acto unilateral del empleador por el que se pone fin al contrato de trabajo, que no requiere el consentimiento de la otra parte"; en un retiro incentivado con la indemnización incluida hubo "un acuerdo de voluntades" y la desocupación "no reviste las características de forzosa e inimputable a sus voluntades"',
        url: 'https://www.bps.gub.uy/3904/18-16-2005-subsidio-por-desemepleo---retiro-incentivado-en-el-sector-privado-no-es-despido.html',
        publisher: 'BPS',
      },
      {
        label:
          'Subsidio por desempleo por despido — el mensual de industria y comercio debe "haber computado 180 días en planilla" en los 12 meses previos; se solicita "dentro de los 30 días corridos desde la fecha de egreso" (actualizado el 26/01/2026)',
        url: 'https://www.bps.gub.uy/4802/subsidio-por-desempleo-por-despido.html',
        publisher: 'BPS',
      },
      {
        label:
          'Decreto-Ley 14.407 art. 23 — prohíbe despedir al trabajador ausente por enfermedad; "El trabajador dado de alta no podrá ser despedido antes de que transcurran treinta días de su reincorporación", y la violación hace que "el pago de la indemnización por despido sea el doble de la normal", salvo notoria mala conducta o despido no vinculado con la enfermedad',
        url: 'https://www.impo.com.uy/bases/decretos-ley/14407-1975/23',
        publisher: 'IMPO',
      },
    ],
  },
]
