// Siete guías de trabajo y BPS minadas de Reddit: la mutualista al quedarse sin trabajo, el subsidio por
// expensas funerarias, cobrar la jubilación desde el exterior, la canasta de fin de año, cómo pedir un aumento
// y pedir que te despidan, más los casos especiales del aguinaldo. Demanda: hilos 1sjd2oc, 1mdpzgf, 1l75w1d, 1uqxcjs, 1n1w3ld, 10wa2k6, 17b94l8,
// 1kdz5vi, 1qwjr4h, 1fjzlsc y 1pd31ur, más la cola de autocompletado ("bonos fonasa cesante", "servicios
// fúnebres uruguay", "cómo saber si me corresponde canasta bps"). Cifras verificadas el 2026-09-13 contra BPS
// (23321, 4802, 3494, 11428, 12675, 12610, 15767, 23115, 11414, 21733, 23594, 15193, 14980 y la R.D. 18-16/2005),
// MSP (tasas moderadoras 11/2025 y ajuste 07/2026), gub.uy (afiliación a ASSE), MTSS (lineamientos de la 11.ª
// ronda, consultas, despido y preguntas frecuentes), Presidencia (canasta 2025) e IMPO (Ley 18.731 art. 30,
// Ley 10.449 art. 5, Ley 16.045 art. 2, Decretos-Ley 15.180 y 14.407, Decretos 264/025 y 345/023, Acuerdo
// Multilateral del Mercosur y acta del Grupo 10 subgrupo 20 del 19/11/2025).
// 2026-09-22: aguinaldo-casos-especiales-uruguay (IMPO: Ley 12.840, DL 14.525, Decretos 113/026 y 122/026,
// DL 14.407, Ley 19.161, Ley 18.091, Ley 18.572 art. 29, Ley 13.619, Decreto 49/000, Decreto 951/975; BPS 4774,
// 4802, 18239, 4804, 9780, 11439, 16629, 16585, 6596, 21733; MTSS denuncias y FAQ; DGI IRPF 11/06/2026).
// 2026-09-22: me-quede-sin-trabajo-mutualista-fonasa-uruguay REESCRITA conservando el slug (la versión nueva es
// un superconjunto: bonos = Chile, duraciones y topes 2026 del seguro de paro, plazo de 30 días, cuota de 18 a 21,
// tope de ASSE, los dos ajustes de 2026 con Decreto 163/026, sin afiliación voluntaria, la trampa COVID de los
// «3 meses», reafiliación automática, efecto en la devolución). Fuentes: BPS 23321, 4802, 18239, 6486, 10576,
// 24521, 17508; IMPO Ley 18.731 art. 30, Ley 18.211, Decretos 317/025 y 163/026, Ley 20.486; ASSE; MSP ajustes
// 07/2026; MTSS prórrogas; FONASA Chile sólo para desambiguar la consulta.
import type { Guide } from './guides'

export const trabajoBpsGuides: readonly Guide[] = [
  {
    slug: 'me-quede-sin-trabajo-mutualista-fonasa-uruguay',
    title: 'FONASA sin trabajo: cuánto dura la cobertura (2026)',
    description:
      'Si te despiden, renunciás o termina el seguro de paro, FONASA cubre hasta el último día de ese mes; tus hijos, 12 meses más. Qué opciones quedan en 2026.',
    tag: 'FONASA',
    updatedAt: '2026-09-22',
    sections: [
      {
        heading: 'Respuesta corta: hasta el último día del mes',
        body: 'Si te despiden, renunciás o se te termina el seguro de paro, la cobertura de FONASA no se corta ese día ni dura meses: llega hasta el último día del mes en que pasó. El BPS lo contesta con esas palabras en su pregunta frecuente sobre el tema, actualizada el 15 de setiembre de 2025: «Se mantendrá la cobertura Fonasa hasta el último día del mes en el que se produce la finalización del Subsidio por desempleo por despido o la desvinculación laboral». Un cese el 3 de setiembre te deja cubierto hasta el 30 de setiembre; uno el 28, hasta el 30 también. Dos cosas que circulan y no rigen en 2026: los «tres meses más de cobertura para despedidos» fueron el Decreto 217/020, una medida del Fondo Solidario COVID-19 para quienes perdieron FONASA entre el 1.º de agosto y el 31 de octubre de 2020, y los «30 días de gracia para regularizar» los repiten calculadoras y blogs, pero el BPS no los menciona. La única continuidad que sí está en la ley es la de los hijos, más abajo. Lo primero que conviene hacer, entonces, es anotar tu último día de cobertura y adelantar a esa fecha consultas, estudios y recetas.',
      },
      {
        heading: 'En el seguro de paro seguís cubierto, y por eso te descuentan FONASA',
        body: 'Entrar al seguro de paro no te saca del sistema de salud. La página del subsidio por desempleo por despido del BPS lo dice así: «Los trabajadores mantienen el derecho a la cobertura asistencial del Sistema Nacional Integrado de Salud (SNIS) por el período de amparo al subsidio por desempleo, realizando los aportes correspondientes al Fonasa». Del subsidio se descuenta el aporte, igual que del sueldo, y ese aporte es el que sostiene la mutualista. Cuánto dura depende de la causal: por despido o fin de contrato son 6 meses o 72 jornales según el tipo de remuneración, y los mayores de 50 años tienen 6 meses o 54 jornales más; por suspensión son 4 meses o 48 jornales; por reducción de trabajo de 25 % o más, 72 jornales. El plazo importa: el subsidio se pide por los servicios en línea del BPS dentro de los 30 días corridos desde el egreso (causal despido o fin de contrato), y si se pide después se pierde por los meses transcurridos; la caducidad corre desde el último día del mes en que tuviste remuneración. Si la empresa no comunicó el egreso, la reserva de derecho se hace en oficinas del BPS dentro de esos mismos 30 días. Quien agotó el subsidio recién puede volver a cobrarlo 12 meses después de la última prestación. Y las prórrogas no son generales: se otorgan por empresa, por ley (la Ley 20.486 facultó al MTSS a extender hasta el 30 de junio de 2026 el subsidio de los trabajadores de Frigorífico Casa Blanca S.A.) o por resolución del MTSS de 90 días (Res. 194 a 197/026, del 4 de setiembre de 2026).',
        table: {
          headers: ['Causal', 'Cuánto dura', 'Cuánto cobrás (topes 2026, BPS)'],
          rows: [
            [
              'Despido o fin de contrato',
              '6 meses o 72 jornales; mayores de 50 años, 6 meses o 54 jornales más',
              '66 % del promedio de los 6 meses previos el mes 1, y baja a 57 %, 50 %, 45 %, 42 % y 40 %; topes de $ 93.155 (mes 1) a $ 50.802 (mes 6); 20 % más con familiares a cargo',
            ],
            [
              'Suspensión',
              '4 meses o 48 jornales',
              '50 % del promedio de los últimos 6 meses; tope $ 67.754 y mínimo $ 8.467 (enero de 2026)',
            ],
            [
              'Reducción de trabajo (25 % o más)',
              '72 jornales',
              'El cálculo por causal está en la página del seguro de paro del sitio',
            ],
          ],
        },
        links: [
          {
            label: 'Seguro de paro: requisitos, plazos y calculadora',
            to: '/seguro-de-paro-uruguay',
          },
        ],
      },
      {
        heading: 'Hijos: 12 meses más. Pareja: no. De 18 a 21: una cuota',
        body: 'Los menores de 18 años y los mayores con discapacidad que tenías a cargo no pierden FONASA con vos. El artículo 30 de la Ley 18.731 les mantiene el amparo «por un período de doce meses continuos contados a partir del mes siguiente al del cese de la aportación», siempre que el período de aportación «haya sido no menor a un año»; el BPS lo aplica como 12 meses de aportes en los 24 anteriores al cese o al fin del subsidio. El amparo cesa antes si el hijo obtiene cobertura por sí mismo o a través de otro generante, por ejemplo si el otro padre consigue trabajo formal. Lo que la ley no incluye es al cónyuge o concubino a cargo: el capítulo entero se titula «Continuidad del amparo de menores y mayores con discapacidad», y ni el artículo ni la página del BPS nombran a la pareja, así que pierde el amparo junto con vos salvo que lo genere por su cuenta. Un caso aparte son los hijos de 18 a 21 años sin discapacidad: si estaban amparados al cumplir 18, siguen en FONASA pagando una cuota bonificada al prestador más el aporte al Fondo Nacional de Recursos, que se gestiona en la propia mutualista. Según el cuadro de ajustes de precios de salud del MSP de julio de 2026, esa cuota suma $ 3.513 por mes (cápita $ 2.574,62, componente meta $ 316,62 y FNR $ 621,58, que se ajusta en otras fechas). Es la única cuota que un particular le paga al FONASA.',
      },
      {
        heading: '¿Puedo pagar FONASA por mi cuenta? No: estas son las salidas',
        body: 'No existe una afiliación voluntaria al FONASA para quien se quedó sin trabajo. La lista de beneficiarios que publica el BPS (trabajadores con 13 jornales o 1,25 BPC, unipersonales, monotributistas, funcionarios, servicios personales, entre otros) no tiene esa categoría, y los artículos 61 a 71 de la Ley 18.211 tampoco la prevén; lo decimos como ausencia en la norma, no porque haya una frase que lo prohíba. Lo que sí existe son dos puertas. La primera es ASSE: la afiliación es gratuita, sin tickets ni órdenes, si los ingresos del hogar no superan las 62 UR más 2,5 UR por cada integrante del grupo familiar; por encima de eso se paga la Cuota ASSE mensual (Decreto 287/012), y también se paga si ya tenés otra cobertura individual sin derecho a FONASA. La segunda es quedarte en tu mutualista como socio individual, pagando la cuota. Ese precio lo fija cada institución: el Poder Ejecutivo sólo autoriza el aumento máximo, que fue de 2,50 % en enero de 2026 (Decreto 317/025, artículo 5) y de 2,13 % en julio de 2026 (Decreto 163/026, artículo 5); por eso no publicamos un precio de cuota, pedilo por escrito a tu mutualista. Los tickets y órdenes tienen tope de $ 880 por tasa moderadora, y las que ya estaban entre $ 660 y $ 880 sólo pudieron subir 1,60 % en julio. Antes de cambiar, pedí copia de tu historia clínica y las recetas vigentes.',
        table: {
          headers: ['Opción', 'Qué pagás', 'Condición'],
          rows: [
            [
              'ASSE, afiliación gratuita',
              'Nada: sin tickets ni órdenes',
              'Ingresos del hogar de hasta 62 UR más 2,5 UR por integrante',
            ],
            [
              'ASSE, con Cuota ASSE',
              'Una cuota mensual (aumento máximo de 1,00 % en julio de 2026)',
              'Ingresos por encima del tope, o tener otra cobertura individual sin FONASA',
            ],
            [
              'Mutualista, socio individual',
              'La cuota que fija cada institución (aumento máximo de 2,13 % en julio de 2026) más tickets y órdenes con tope de $ 880',
              'Pedir el valor por escrito y avisar por escrito si dejás de ser socio',
            ],
          ],
        },
        links: [
          { label: 'Cambiar de mutualista o pasarte a ASSE', to: '/cambiar-de-mutualista-uruguay' },
          { label: 'Tickets y órdenes: cuánto cuestan', to: '/tickets-mutualistas-uruguay' },
        ],
      },
      {
        heading: '«Bonos de FONASA» es Chile: no busques eso acá',
        body: 'Si llegaste buscando «cuántos días duran los bonos de FONASA» o «comprar bonos de FONASA estando cesante», la respuesta es de otro país. El FONASA de Chile vende Bonos de Atención de Salud en su Modalidad Libre Elección, y su propia página dice que tienen una vigencia de 30 días para usarse y que pueden devolverse hasta 5 años después de emitidos. El FONASA uruguayo, el de la Ley 18.211, no emite bonos: financia la cuota salud que recibe tu prestador, y lo que pagás vos en la mutualista son tasas moderadoras, es decir tickets y órdenes, con un tope de $ 880 por tasa fijado por decreto. Una orden es el copago de alguien que ya está afiliado, así que sin cobertura no hay orden que puedas comprar para atenderte. Primero se resuelve la afiliación, como socio individual o en ASSE, y recién después vienen las órdenes.',
      },
      {
        heading: 'Cuando volvés a trabajar',
        body: 'La cobertura vuelve por donde se fue: el aporte. Sos usuario del Seguro Nacional de Salud cuando cumplís 13 jornadas de trabajo en el mes o cobrás al menos 1,25 BPC, que en 2026 son $ 8.580 (BPC de $ 6.864). La afiliación es automática al último prestador integral en el que estuviste amparado por FONASA; si no hay registro en el BPS ni en el Registro Único de Cobertura de Asistencia Formal del MSP, va a ASSE. Rige desde el día de la afiliación, y en las causales del artículo 2 del Decreto 344/020 podés elegir otro prestador dentro de los 180 días, con efecto desde el primer día del mes siguiente. El hueco entre el último día de cobertura y el primer mes del trabajo nuevo lo cubrís por tu cuenta, como socio individual o en ASSE. Si tus hijos estaban usando los 12 meses del artículo 30, ese amparo termina apenas vuelven a quedar cubiertos por vos.',
      },
      {
        heading: 'Y la devolución FONASA del año en que te quedaste sin trabajo',
        body: 'Cada setiembre el BPS devuelve el excedente de aportes del año anterior, comparado contra un tope que se arma con el costo promedio equivalente de tu cobertura más 25 %. Para quien estuvo parte del año sin trabajo hay una regla que cambia la cuenta: el BPS computa «exclusivamente los meses del ejercicio en los cuales la persona fue beneficiaria», así que el tope de ese año es más chico y la referencia de $ 122.629 de promedio mensual que publica para 2026 no te aplica tal cual. Los meses en el seguro de paro cuentan, porque del subsidio se descuenta FONASA; los meses sin trabajo y sin subsidio no suman tope, pero tampoco aportes. La devolución del ejercicio 2025 se paga desde el 21 de setiembre de 2026 a más de 152.000 personas, por unos 8.676 millones de pesos, con 8 % de retención de IRPF; se consulta en bps.gub.uy, en el 0800 2016 o por WhatsApp al 092 366 272.',
        links: [
          { label: 'Devolución FONASA 2026: cuándo se cobra', to: '/devolucion-fonasa-uruguay' },
        ],
      },
    ],
    steps: [
      {
        name: 'Anotá tu último día de cobertura',
        text: 'Es el último día del mes del cese o, si vas al seguro de paro, del mes en que termina el subsidio.',
      },
      {
        name: 'Pedí el seguro de paro dentro de los 30 días',
        text: 'Por los servicios en línea del BPS, dentro de los 30 días corridos desde el egreso; después se pierde por los meses transcurridos.',
      },
      {
        name: 'Revisá a quién tenías a cargo',
        text: 'Los hijos menores siguen 12 meses si aportaste 12 de los últimos 24; la pareja no, y los de 18 a 21 pagan la cuota en el prestador.',
      },
      {
        name: 'Elegí ASSE o la cuota individual',
        text: 'Compará el tope de ASSE gratis (62 UR más 2,5 UR por integrante) con la cuota individual que tu mutualista te pase por escrito.',
      },
    ],
    faqs: [
      {
        q: '¿Cuántos días duran los bonos de FONASA?',
        a: 'Esa pregunta es del FONASA de Chile: sus Bonos de Atención de Salud duran 30 días desde que se compran, según fonasa.gob.cl. En Uruguay el FONASA no emite bonos; lo que se paga en la mutualista son tickets y órdenes, con un tope de $ 880 por tasa moderadora fijado por decreto.',
      },
      {
        q: 'Me quedé sin trabajo: ¿hasta cuándo me cubre FONASA?',
        a: 'Hasta el último día del mes en que te desvinculaste, por despido o renuncia, o en que terminó tu subsidio por desempleo, según la pregunta frecuente del BPS actualizada el 15 de setiembre de 2025. No hay meses ni días de gracia adicionales en 2026: los tres meses extra fueron una medida COVID de 2020.',
      },
      {
        q: '¿Estando en seguro de paro sigo teniendo FONASA?',
        a: 'Sí. Mientras dura el subsidio mantenés la cobertura del SNIS y del propio subsidio se descuentan los aportes al FONASA. Por despido son 6 meses o 72 jornales, y los mayores de 50 años tienen hasta 6 meses más; por suspensión, 4 meses o 48 jornales. Pedilo dentro de los 30 días corridos desde el egreso.',
      },
      {
        q: '¿Puedo comprar bonos o pagar FONASA por mi cuenta si estoy cesante?',
        a: 'No. El FONASA uruguayo no vende bonos ni admite la afiliación voluntaria de desempleados: no hay ninguna categoría así en la lista de beneficiarios del BPS ni en la Ley 18.211. La única cuota que un particular le paga al FONASA es la de los hijos de 18 a 21 años, $ 3.513 por mes desde julio de 2026 según el cuadro del MSP. Las salidas son ASSE, gratis o con cuota, y la afiliación individual a una mutualista.',
      },
      {
        q: '¿Qué pasa con mis hijos y mi pareja cuando pierdo FONASA?',
        a: 'Tus hijos menores de 18, o mayores con discapacidad, conservan FONASA 12 meses más contados desde el mes siguiente al cese, si aportaste al menos 12 meses en los 24 anteriores (Ley 18.731, artículo 30, aplicado por el BPS). El cónyuge o concubino a cargo no tiene esa extensión: la ley sólo la prevé para menores y personas con discapacidad.',
      },
    ],
    related: [
      { label: 'Seguro de paro en Uruguay', to: '/seguro-de-paro-uruguay' },
      { label: 'Devolución FONASA 2026', to: '/devolucion-fonasa-uruguay' },
      { label: 'Cambiar de mutualista', to: '/cambiar-de-mutualista-uruguay' },
      { label: 'Tickets y órdenes de la mutualista', to: '/tickets-mutualistas-uruguay' },
      { label: 'Indemnización por despido', to: '/indemnizacion-por-despido-uruguay' },
      { label: 'Renunciar al trabajo: qué cobrás', to: '/renunciar-al-trabajo-uruguay' },
    ],
    sources: [
      {
        label:
          'Luego de finalizado el subsidio por desempleo, de ser despedido o renunciar, ¿por cuánto tiempo tendré cobertura Fonasa? — «hasta el último día del mes» (actualizado el 15/09/2025, leído el 22/09/2026)',
        url: 'https://www.bps.gub.uy/23321/luego-de-finalizado-mi-subsidio-por-desempleo-por-despido-de-ser-despedido_a-o-renunciar-por-cuanto-tiempo-tendre-cobertura-fonasa.html',
        publisher: 'BPS',
      },
      {
        label:
          'Subsidio por desempleo por despido — cobertura del SNIS durante el amparo, duración, plazo de 30 días, topes 2026 (actualizado el 26/01/2026, leído el 22/09/2026)',
        url: 'https://www.bps.gub.uy/4802/subsidio-por-desempleo-por-despido.html',
        publisher: 'BPS',
      },
      {
        label:
          'Subsidio por desempleo por suspensión — 4 meses o 48 jornales; reducción 72 jornales; tope $ 67.754 y mínimo $ 8.467 (enero de 2026)',
        url: 'https://www.bps.gub.uy/18239/subsidio-por-desempleo-por-suspension.html',
        publisher: 'BPS',
      },
      {
        label:
          'Afiliación mutual trabajadores — beneficiarios, 13 jornales o 1,25 BPC ($ 8.580), afiliación automática al último prestador, 12 meses más para los hijos, cuota de 18 a 21 (actualizado el 11/06/2026)',
        url: 'https://www.bps.gub.uy/6486/afiliacion-mutual-trabajadores.html',
        publisher: 'BPS',
      },
      {
        label:
          'Ley 18.731, artículo 30 — continuidad del amparo de menores y mayores con discapacidad: doce meses continuos desde el mes siguiente al cese',
        url: 'https://www.impo.com.uy/bases/leyes/18731-2011/30',
        publisher: 'IMPO',
      },
      {
        label:
          'Ley 18.211 — artículo 62 (usuarios del Seguro Nacional de Salud) y artículos 61 a 71 (beneficiarios)',
        url: 'https://www.impo.com.uy/bases/leyes/18211-2007',
        publisher: 'IMPO',
      },
      {
        label:
          'Afiliación a ASSE — gratuita, Fonasa o con Cuota ASSE (Decreto 287/012) (actualizado el 09/04/2026)',
        url: 'https://www.gub.uy/tramites/afiliacion-asse',
        publisher: 'ASSE / gub.uy',
      },
      {
        label:
          'Trámites afiliatorios — tope de ingresos para la afiliación gratuita: 62 UR más 2,5 UR por integrante',
        url: 'https://www.asse.com.uy/contenido/Tramites-afiliatorios-14545',
        publisher: 'ASSE',
      },
      {
        label:
          'Decreto 317/025 — ajuste de enero de 2026: cuotas individuales hasta 2,50 % (art. 5), tope de $ 880 por tasa moderadora (art. 8), CPE $ 6.693 (art. 18)',
        url: 'https://www.impo.com.uy/bases/decretos/317-2025',
        publisher: 'IMPO',
      },
      {
        label:
          'Decreto 163/026 — ajuste de julio de 2026: cuotas individuales hasta 2,13 % (art. 5), tope de $ 880 y 1,60 % para la banda $ 660–880 (art. 8), CPE $ 6.858 (art. 11), ASSE hasta 1,00 % (art. 12)',
        url: 'https://www.impo.com.uy/bases/decretos/163-2026',
        publisher: 'IMPO',
      },
      {
        label:
          'Ajustes de precios de salud – julio 2026 — cuota FONASA de 18 a 21 años ($ 3.513), tope de tasas moderadoras, CPE (publicado el 21/07/2026)',
        url: 'https://www.gub.uy/ministerio-salud-publica/sites/ministerio-salud-publica/files/2026-07/ajustes-precios-salud-julio-2026.pdf',
        publisher: 'MSP',
      },
      {
        label:
          'Cálculo de la devolución Fonasa — sólo los meses en que la persona fue beneficiaria; retención de IRPF de 8 %',
        url: 'https://www.bps.gub.uy/10576/calculo-de-la-devolucion-fonasa.html',
        publisher: 'BPS',
      },
      {
        label:
          'Devolución Fonasa — el pago del ejercicio 2025 comienza el 21 de setiembre de 2026: más de 152.000 personas, unos 8.676 millones (3/9/2026)',
        url: 'https://www.bps.gub.uy/24521/devolucion-fonasa.html',
        publisher: 'BPS',
      },
      {
        label:
          'Extensión de cobertura de salud para trabajadores despedidos o con cese de actividades — la medida de tres meses del 1/8 al 31/10/2020 (Decreto 217/020, Fondo Solidario COVID-19)',
        url: 'https://www.bps.gub.uy/17508/extension-de-cobertura-de-salud-para-trabajadores-despedidos-o-con-cese-de-actividades.html',
        publisher: 'BPS',
      },
      {
        label:
          'Ley 20.486 — el MTSS puede extender hasta el 30/6/2026 el subsidio de los trabajadores de Frigorífico Casa Blanca S.A. (prórroga por empresa)',
        url: 'https://www.impo.com.uy/bases/leyes/20486-2026',
        publisher: 'IMPO',
      },
      {
        label:
          'Prórrogas del subsidio por desempleo — resoluciones por empresa y por 90 días (4/9/2026)',
        url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/tematica/prorrogas',
        publisher: 'MTSS',
      },
      {
        label:
          'Bonos Fonasa: qué son y cómo utilizarlos — «vigencia de 30 días» (fuente extranjera, sólo para aclarar el significado de la consulta)',
        url: 'https://www.fonasa.gob.cl/modalidades-de-atencion/red-de-prestadores-en-convenio/bonos-fonasa/',
        publisher: 'FONASA Chile',
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
        body: 'La lista la mantiene el BPS y conviene mirarla antes de iniciar nada, porque define el camino. En la versión actualizada en setiembre de 2026 figuran convenios bilaterales con España, Italia, Francia, Alemania, Estados Unidos, Canadá, Chile e Israel, entre otros, y dos convenios multilaterales: el del Mercosur, que alcanza a Argentina, Brasil y Paraguay, y el Convenio Multilateral Iberoamericano de Seguridad Social, que es por donde entra, por ejemplo, Perú. Según el BPS, estos acuerdos permiten la "acumulación de períodos de servicio en ambos países", el traslado temporal de trabajadores y el "pago de jubilaciones y pensiones en el exterior sin quitas ni retenciones". Cada convenio tiene su propio texto y sus propias reglas, así que la lista te dice si hay convenio, no cómo se aplica en tu caso. Si tu país no figura, los años de allá no se suman a los de acá, pero lo que generaste en Uruguay se sigue pudiendo pedir y cobrar desde afuera.',
      },
      {
        heading: 'Cómo se suman los años: cada país paga su parte',
        body: 'Una confusión frecuente es creer que el convenio hace que Uruguay te pague una jubilación entera por años trabajados afuera. No funciona así. El Acuerdo Multilateral de Seguridad Social del Mercosur lo muestra en su artículo 7: "Los períodos de seguro o cotización cumplidos en los territorios de los Estados Partes serán considerados, para la concesión de las prestaciones por vejez, edad avanzada, invalidez o muerte", y agrega que su reglamento "establecerá también los mecanismos de pago a prorrata de las prestaciones". Dicho en criollo: los años de los dos países se suman para ver si llegás al requisito, y después cada país paga la parte proporcional a lo que aportaste en él. El resultado, en el caso del Mercosur, son dos prestaciones, una de cada país, cada una calculada en proporción a tus años allí. Antes de decidir cuándo pedirla, revisá tu historia laboral en los dos países, porque un período que no figura registrado es un período que no se suma.',
      },
      {
        heading: 'Cómo te llega la plata: el giro al exterior',
        body: 'Una vez otorgada, la jubilación del BPS se puede cobrar donde vivas. El BPS envía por giro al exterior sus prestaciones y también las rentas permanentes del BSE, de las AFAP y por accidentes de trabajo, y lo hace "a partir del 5to día hábil de cada mes en la moneda del país de residencia". Sobre el costo, la ficha dice dos cosas que conviene leer juntas: el BPS no cobra comisión por realizar el giro, pero el BROU aplica un descuento por comisión de US$ 8, cualquiera sea el destino, según la ficha actualizada el 2 de setiembre de 2025. Para cobrar en un banco del resto del mundo tenés que darle al BPS el código IBAN de tu cuenta y el código SWIFT del banco pagador. Argentina tiene un circuito propio: el titular necesita DNI argentino y cobra con una tarjeta Banelco que se retira en la sucursal del BROU en Buenos Aires. Si cambiás de banco o de país, esos datos se actualizan con el BPS antes del siguiente giro.',
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
        a: 'El BPS no cobra comisión por el giro, pero su ficha, actualizada el 2 de setiembre de 2025, advierte que el BROU descuenta US$ 8 de comisión, cualquiera sea el destino.',
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
  {
    slug: 'aguinaldo-casos-especiales-uruguay',
    title: 'Aguinaldo con 3 meses, en negro o enfermo: casos 2026',
    description:
      'Sí: se cobra con cualquier antigüedad, en proporción a lo pagado en dinero. Quién paga en BPS, recargo del 10 % por atraso, plazos 2026 y jubilados.',
    tag: 'AGUINALDO',
    updatedAt: '2026-09-22',
    sections: [
      {
        heading: 'Con 3 meses de trabajo cobrás igual: no hay antigüedad mínima',
        body: 'Sí, te corresponde. La Ley 12.840 no exige un año ni ninguna otra antigüedad: su artículo 3 dice que, al terminar la relación laboral por renuncia, jubilación o despido, el trabajador cobra "el sueldo anual complementario en proporción al tiempo de permanencia en la empresa", y la misma proporción rige cuando llega la fecha de pago y llevás pocos meses. La excusa del "año de antigüedad" que algunos empleadores repiten tiene un origen real pero vencido: el artículo 6 de esa ley pidió no menos de un año de antigüedad "en el año 1960", únicamente para el primer aguinaldo, y nunca más. La cuenta es la doceava parte de lo que te pagaron en dinero en los meses trabajados del semestre. Quien entró en marzo cobró en junio de 2026 la doceava parte de marzo, abril y mayo, y en diciembre la de junio a noviembre. La única forma de perder la parte no cobrada es el despido por notoria mala conducta (art. 3); si te vas sin renunciar formalmente, el MTSS aclara en sus preguntas frecuentes que la empresa igual debe abonar "la licencia no gozada, el salario vacacional y el aguinaldo generado", y lo que se pierde es la indemnización por despido.',
        links: [
          {
            label: 'Calculadora de aguinaldo',
            to: '/herramientas/calculadora-aguinaldo',
          },
          {
            label: 'Cómo se calcula el aguinaldo',
            to: '/guias/como-se-calcula-el-aguinaldo-uruguay',
          },
        ],
      },
      {
        heading: 'Qué entra en el cálculo y qué queda afuera, con la norma de cada fila',
        body: 'El artículo 2 de la Ley 12.840 define la base: "la totalidad de las prestaciones en dinero originadas en la relación de trabajo que tengan carácter remuneratorio", pagadas en los doce meses anteriores al 1.º de diciembre. La palabra que decide es "dinero", y por eso las exclusiones más buscadas tienen cada una su norma: la propia ley deja afuera las participaciones en los beneficios de la empresa y el aguinaldo del año anterior; el Decreto 49/000 excluye el salario vacacional; y el MTSS explica que los tickets de alimentación no entran porque no son dinero, aunque sí cuentan para la licencia, el salario vacacional y la indemnización por despido. La excepción va en sentido contrario: al trabajador rural la alimentación y la vivienda le integran el aguinaldo aunque las reciba en especie, valuadas por el ficto legal (Ley 13.619, art. 1). Y hay un rubro que se liquida al lado del aguinaldo sin ser aguinaldo: en el trabajo doméstico, la prima por presentismo, que es la cuarta parte del medio aguinaldo, con los mismos rubros, para quien tuvo asistencia perfecta en el semestre (la enfermedad certificada y la licencia no cuentan como faltas), y se paga en las mismas oportunidades que el aguinaldo. En junio de 2026 el BPS la liquidó a quien tuvo asistencia perfecta de diciembre de 2025 a mayo de 2026, salvo que el empleador informara lo contrario hasta el 30 de junio.',
        table: {
          headers: ['Partida', '¿Integra el aguinaldo?', 'Norma'],
          rows: [
            ['Sueldo, horas extra, comisiones, en dinero', 'Sí', 'Ley 12.840, art. 2'],
            [
              'Alimentación y vivienda del trabajador rural',
              'Sí, aun en especie',
              'Ley 13.619, art. 1',
            ],
            ['Participación en las ganancias', 'No', 'Ley 12.840, art. 2'],
            ['Aguinaldo del año anterior', 'No', 'Ley 12.840, art. 2'],
            ['Salario vacacional', 'No', 'Decreto 49/000, art. 2'],
            ['Tickets de alimentación', 'No', 'MTSS, preguntas frecuentes'],
          ],
        },
      },
      {
        heading: 'Las fechas de 2026, con la norma que fija cada una',
        body: 'El techo está en la Ley 12.840 (art. 1): el aguinaldo se paga "dentro de los diez días anteriores al 24 de diciembre", o sea del 14 al 23. El Decreto-Ley 14.525 permite partirlo: "lo generado hasta el 31 de mayo dentro del mes de junio y el complemento antes del 24 de diciembre". Y cada año un decreto ejerce esa facultad y puede acortar el plazo. Para 2026 es el Decreto 113/026, promulgado el 29 de mayo de 2026 y publicado el 5 de junio: la primera cuota se pagó dentro de junio (tope 30 de junio) y la segunda, por lo generado del 1.º de junio al 30 de noviembre, se paga "hasta el 20 del mes de diciembre", que cae domingo; el decreto no dice nada sobre días inhábiles. El de 2024 decía "antes del 20"; el de 2026 dice "hasta el 20", que incluye ese día. Los funcionarios públicos no cobran por esta ley sino por el Decreto-Ley 14.360 y un decreto propio: el 122/026 fijó el cobro de la cuota de junio desde el 18 de junio de 2026, por lo generado del 1.º de diciembre de 2025 al 31 de mayo de 2026; al 22 de setiembre de 2026 la cuota de diciembre del sector público no tiene decreto. La construcción va por la tercera fila de la tabla.',
        table: {
          headers: ['Quién', 'Junio 2026', 'Diciembre 2026', 'Norma'],
          rows: [
            [
              'Sector privado',
              'Lo generado hasta el 31 de mayo, dentro de junio (tope 30 de junio)',
              'Lo generado del 1.º de junio al 30 de noviembre, hasta el 20 de diciembre',
              'Ley 12.840; Decreto-Ley 14.525; Decreto 113/026',
            ],
            [
              'Funcionarios públicos',
              'Desde el 18 de junio, por lo generado del 1/12/2025 al 31/5/2026',
              'Sin decreto al 22 de setiembre de 2026',
              'Decreto-Ley 14.360; Decreto 122/026',
            ],
            [
              'Construcción (Ley 14.411)',
              'El BPS paga la primera parte: noviembre del año anterior a abril',
              'El BPS paga la segunda parte: mayo a octubre (en 2025, desde el 12 de diciembre)',
              'Ley 14.411; Decreto 951/975; BPS',
            ],
          ],
        },
        links: [
          {
            label: 'Cuándo se cobra el aguinaldo: la página con las fechas',
            to: '/cuando-se-cobra-el-aguinaldo-uruguay',
          },
        ],
      },
      {
        heading: 'Incapacitado, certificado o accidentado: quién paga el aguinaldo',
        body: 'Si estás con subsidio por enfermedad del BPS, la cuota parte de aguinaldo de ese período la paga el BPS, no tu empleador. Lo manda el Decreto-Ley 14.407 (art. 28): el beneficiario "tendrá derecho a percibir una parte proporcional del aguinaldo por el tiempo que esté cobrando subsidio", liquidada y pagada por el seguro de enfermedad, que hoy administra el BPS. La página del BPS, actualizada el 8 de setiembre de 2026, lo confirma con su fórmula: el 70 % de la materia gravada, sin contar el aguinaldo, con tope de $ 67.754 (valor de enero de 2026), "más la cuota parte de aguinaldo", desde el cuarto día de certificación (desde el primero si hay internación). Los días que trabajaste ese semestre los liquida el empleador: son dos recibos. En un accidente de trabajo la cosa es distinta y la fuente se termina antes: durante la incapacidad temporaria el BSE cubre dos tercios del jornal (66,67 %) y el BPS agrega el 3,33 % restante hasta llegar al 70 %, según la página del BPS; pero ni la ley de accidentes ni las páginas del BSE consultadas dicen quién liquida la cuota parte de aguinaldo de ese período, así que preguntalo en el BSE o el BPS antes de darlo por hecho. Y si la incapacidad es parcial, el subsidio transitorio (hasta tres años) no menciona el aguinaldo; si el nuevo dictamen configura incapacidad total, pasás a jubilación por incapacidad total, y un jubilado no cobra aguinaldo.',
        links: [
          {
            label: 'Me certifiqué: cuánto cobro y quién paga',
            to: '/guias/me-certifique-subsidio-por-enfermedad-uruguay',
          },
          { label: 'Accidente de trabajo', to: '/accidente-de-trabajo-uruguay' },
        ],
      },
      {
        heading: 'Maternidad, paternidad y seguro de paro: dos que sí, uno que la ley no prevé',
        body: 'Los subsidios por maternidad y por paternidad incluyen la cuota parte de aguinaldo por ley: la Ley 19.161 (arts. 6 y 9) fija el subsidio en el promedio de los últimos seis meses "más la cuota parte correspondiente al sueldo anual complementario, licencia y salario vacacional" del período de amparo, y el BPS lo repite en sus páginas de maternidad y paternidad, en un solo pago por todo el período. El seguro de paro es la asimetría: el Decreto-Ley 15.180 no menciona el aguinaldo, y la página del BPS de subsidio por desempleo por despido (actualizada el 26 de enero de 2026) define el monto como porcentajes del promedio de los seis meses anteriores, sin cuota parte de aguinaldo. Para mensuales y destajistas la escala es 66 % el primer mes (tope 2026 de $ 93.155), 57 % el segundo ($ 80.445), 50 % ($ 67.754), 45 % ($ 59.287), 42 % ($ 55.044) y 40 % ($ 50.802); para jornaleros, 16, 14, 12, 11, 10 y 9 jornales con los mismos topes. Lo que sí cobrás es lo generado antes de entrar al seguro, que el empleador paga en la fecha normal y el BPS no descuenta del subsidio: el aguinaldo figura entre los rubros que no se descuentan. En una suspensión total el BPS liquida el mes entero y aclara que el trabajador "solo puede haber cobrado aguinaldo y feriados pagos".',
        links: [
          {
            label: 'Seguro de paro: requisitos y cuánto se cobra',
            to: '/seguro-de-paro-uruguay',
          },
        ],
      },
      {
        heading: 'En negro: el derecho existe, lo que falta es la prueba',
        body: 'Te corresponde igual. La Ley 12.840 obliga a "todo patrono", y el aguinaldo nace de la relación de trabajo, no del registro en el BPS: en noviembre de 2025 la prensa informó una sentencia que reconoció la dependencia entre PedidosYa y un repartidor y condenó a la empresa a pagar aguinaldo y aportes, sin que hubiera un recibo de sueldo de por medio. Lo que cambia en el trabajo no registrado es que hay que probar el vínculo, y las tres puertas son públicas. Primera, el BPS: el servicio en línea "Denunciar diferencias de salarios y actividades no declaradas", con usuario personal, sirve para actividades no declaradas o mal declaradas desde el 1.º de abril de 1996 y admite adjuntar recibos, sentencias u otros documentos; si el BPS prueba la dependencia, reconstruye tu historia laboral. Segunda, el MTSS: con el vínculo vigente, la denuncia anónima en la Inspección General del Trabajo; si ya te fuiste, el Centro de Asesoramiento del MTSS y la liquidación en DINATRA (0800 7171). Tercera, el juicio laboral, con un plazo que no perdona: las acciones prescriben al año contado desde el día siguiente al cese (Ley 18.091, art. 1), cada crédito a los cinco años desde que fue exigible (art. 2), y la sola presentación en el MTSS pidiendo audiencia de conciliación interrumpe el plazo (art. 3). Guardá mensajes, transferencias, horarios y nombres de testigos desde ahora.',
        links: [
          {
            label: 'Denunciar trabajo en negro',
            to: '/denunciar-trabajo-en-negro-uruguay',
          },
          {
            label: 'Trabajo en negro: cómo comprobarlo',
            to: '/guias/trabajo-en-negro-uruguay',
          },
        ],
      },
      {
        heading: 'Si no pagan a tiempo: 10 % automático, multa, dónde denunciar y hasta cuándo',
        body: 'Dos consecuencias que se acumulan, y sólo una es plata para vos. La primera: la omisión de pago de cualquier crédito laboral genera "automáticamente, desde su exigibilidad, un recargo del 10 %" sobre lo adeudado (Ley 18.572, art. 29); si el aguinaldo vencía el 20 de diciembre de 2026, desde el 21 el monto es un 10 % más. La segunda: el empleador que viola la ley del aguinaldo es sancionado con una multa equivalente al doble del monto del sueldo anual complementario de cada trabajador (Ley 12.840, art. 7), cuya percepción y destino rige la Ley 5.427: la cobra el Estado, no vos, así que nadie "cobra el doble". Dónde ir depende de tu situación. Con vínculo vigente y la infracción ocurriendo, la Inspección General del Trabajo del MTSS (Oficina 108, Juncal 1511, lunes a viernes de 9 a 16, asesoramientoydenuncias@mtss.gub.uy) recibe denuncias anónimas y lista el aguinaldo entre sus materias; si el aguinaldo impago es del semestre pasado y seguís en la empresa, el camino es la División Consultas de DINATRA con agenda al 0800 7171; si ya no trabajás ahí, el Centro de Asesoramiento del MTSS en planta baja o las Oficinas de Trabajo del Interior. La Inspección no calcula liquidaciones: eso lo hace DINATRA. Si la empresa quebró, el Fondo de Garantía de Créditos Laborales del BPS (Ley 19.690) cubre aguinaldos, licencias y salarios vacacionales de los dos últimos años previos al cese de pago, más la multa del 10 %, hasta 105.000 UI en un único pago.',
        links: [
          {
            label: 'Cuánto me tienen que pagar',
            to: '/cuanto-me-tienen-que-pagar-uruguay',
          },
        ],
      },
      {
        heading: 'Construcción, jubilados, IRPF y las dos preguntas que no son de Uruguay',
        body: 'En la construcción el aguinaldo no lo paga el patrón: a los trabajadores de la Ley 14.411 con aportación Construcción se lo liquida y paga el BPS, junto con la antigüedad, la licencia y el salario vacacional, porque la aportación unificada comprende los aportes "para el pago de la licencia anual, del sueldo anual complementario y de las sumas para el mejor goce de la licencia" (Decreto 951/975, art. 1). Los períodos son propios: junio liquida de noviembre del año anterior a abril y diciembre de mayo a octubre; no cobran quienes tienen nóminas impagas; y cobrar del BPS te pone en multiempleo, con obligación de presentar la declaración jurada de IRPF. El Fondo Social de la Construcción es otra prestación y su página no menciona el aguinaldo. Los jubilados y pensionistas no cobran aguinaldo: lo que existe es la canasta de fin de año del BPS, una partida única de $ 3.151 en la edición 2025 para pasivos residentes con ingresos personales menores a $ 20.458 mensuales (pensionistas, además, con 65 años o más), que se pagó desde el 2 de diciembre de 2025; al 22 de setiembre de 2026 el BPS no publicó la edición 2026 ni su tope. El IRPF: la DGI grava el aguinaldo legal aparte, con una tasa proporcional igual a la tasa marginal máxima que ya pagás por el resto de tus rentas de trabajo, así que no te sube de franja; sólo lo que exceda el mínimo legal por convenio se suma a los ingresos comunes. Y dos consultas que el autocompletado trae desde otros países: el aguinaldo uruguayo no se mide en días (los "15 días de sueldo" son de la ley mexicana; acá es la doceava parte de lo pagado en dinero), y no existe un aguinaldo por Fiestas Patrias, que es una partida de Perú.',
        links: [
          {
            label: 'Canasta de fin de año del BPS',
            to: '/guias/canasta-fin-de-ano-bps-uruguay',
          },
          {
            label: 'Declaración de IRPF: quién debe',
            to: '/declaracion-de-irpf-uruguay',
          },
        ],
      },
    ],
    faqs: [
      {
        q: '¿Me corresponde aguinaldo si llevo 3 meses trabajando?',
        a: 'Sí. La Ley 12.840 no exige antigüedad: cobrás el aguinaldo en proporción al tiempo de permanencia en la empresa (art. 3), tanto al irte como cuando llega la fecha de pago. La exigencia de un año existió sólo para el aguinaldo de 1960 (art. 6). Con tres meses cobrás la doceava parte de lo que te pagaron en dinero en esos tres meses.',
      },
      {
        q: '¿Quién paga el aguinaldo si estoy incapacitado con certificado médico?',
        a: 'El BPS, no tu empleador. El Decreto-Ley 14.407 (art. 28) manda pagar la parte proporcional del aguinaldo por el tiempo en subsidio, y la página del BPS (actualizada el 8 de setiembre de 2026) lo confirma: 70 % de la materia gravada, tope $ 67.754 (valor 01/2026), más la cuota parte de aguinaldo. Los días trabajados los liquida el empleador. En el BSE por accidente, ninguna fuente primaria dice quién liquida esa cuota parte: consultalo.',
      },
      {
        q: '¿Me corresponde aguinaldo si estoy en negro?',
        a: 'Sí: el derecho nace de la relación de trabajo, no del registro (Ley 12.840, art. 1). Para cobrarlo hay que probar el vínculo: denuncia en línea al BPS de actividades no declaradas con recibos, mensajes u otros documentos, asesoramiento en el MTSS y, si hace falta, juicio laboral. El plazo es un año desde que terminó la relación (Ley 18.091) y la presentación en el MTSS lo interrumpe.',
      },
      {
        q: '¿Qué pasa si no me pagan el aguinaldo a tiempo?',
        a: 'Desde el día en que venció corre automáticamente un recargo del 10 % a tu favor (Ley 18.572, art. 29), y el empleador queda expuesto a una multa del doble del sueldo anual complementario (Ley 12.840, art. 7), que cobra el Estado. Con vínculo vigente denunciás en la Inspección General del Trabajo (Oficina 108, Juncal 1511); si ya te fuiste, en el Centro de Asesoramiento del MTSS; las liquidaciones las hace DINATRA (0800 7171). Tenés un año desde el cese.',
      },
      {
        q: '¿Cuántos días de aguinaldo corresponden por año?',
        a: 'En Uruguay el aguinaldo no se mide en días: es la doceava parte de todo lo pagado en dinero en los doce meses anteriores al 1.º de diciembre (Ley 12.840, art. 2), partido en dos cuotas, la de junio hasta el 30 de junio y la de diciembre, en 2026, hasta el 20 de diciembre (Decreto 113/026). Los "15 días" son de la ley mexicana.',
      },
    ],
    related: [
      {
        label: 'Cuándo se cobra el aguinaldo',
        to: '/cuando-se-cobra-el-aguinaldo-uruguay',
      },
      {
        label: 'Cómo se calcula el aguinaldo',
        to: '/guias/como-se-calcula-el-aguinaldo-uruguay',
      },
      {
        label: 'Calculadora de aguinaldo',
        to: '/herramientas/calculadora-aguinaldo',
      },
      { label: 'Seguro de paro', to: '/seguro-de-paro-uruguay' },
      {
        label: 'Denunciar trabajo en negro',
        to: '/denunciar-trabajo-en-negro-uruguay',
      },
      { label: 'Salario vacacional', to: '/salario-vacacional-uruguay' },
    ],
    sources: [
      {
        label:
          'Ley 12.840 (22/12/1960) — sueldo anual complementario: plazo, base en dinero, proporcional al egreso, el año de antigüedad sólo para 1960, multa del doble',
        url: 'https://www.impo.com.uy/bases/leyes/12840-1960',
        publisher: 'IMPO',
      },
      {
        label:
          'Decreto 113/026 (29/05/2026) — aguinaldo 2026 de la actividad privada: junio y hasta el 20 de diciembre',
        url: 'https://www.impo.com.uy/bases/decretos/113-2026',
        publisher: 'IMPO',
      },
      {
        label:
          'Decreto 122/026 (03/06/2026) — aguinaldo de junio de 2026 de los funcionarios públicos, desde el 18 de junio',
        url: 'https://www.impo.com.uy/bases/decretos/122-2026',
        publisher: 'IMPO',
      },
      {
        label: 'Decreto-Ley 14.525 (27/05/1976) — el pago en dos etapas',
        url: 'https://www.impo.com.uy/bases/decretos-ley/14525-1976',
        publisher: 'IMPO',
      },
      {
        label:
          'Ley 18.572, art. 29 — recargo automático del 10 % por omisión de pago de créditos laborales',
        url: 'https://www.impo.com.uy/bases/leyes/18572-2009/29',
        publisher: 'IMPO',
      },
      {
        label:
          'Ley 18.091 (07/01/2007) — prescripción: un año desde el cese, cinco desde la exigibilidad',
        url: 'https://www.impo.com.uy/bases/leyes/18091-2007',
        publisher: 'IMPO',
      },
      {
        label:
          'Decreto-Ley 14.407, art. 28 — la cuota parte de aguinaldo del subsidio por enfermedad',
        url: 'https://www.impo.com.uy/bases/decretos-ley/14407-1975',
        publisher: 'IMPO',
      },
      {
        label:
          'Ley 19.161, arts. 6 y 9 — cuota parte de aguinaldo en los subsidios por maternidad y paternidad',
        url: 'https://www.impo.com.uy/bases/leyes/19161-2013',
        publisher: 'IMPO',
      },
      {
        label:
          'Ley 13.619, art. 1 — alimentación y vivienda del trabajador rural integran el aguinaldo',
        url: 'https://www.impo.com.uy/bases/leyes/13619-1967',
        publisher: 'IMPO',
      },
      {
        label: 'Decreto 49/000, art. 2 — el salario vacacional no se computa para el aguinaldo',
        url: 'https://www.impo.com.uy/bases/decretos/49-2000',
        publisher: 'IMPO',
      },
      {
        label:
          'Decreto 951/975, art. 1 — la aportación unificada de la construcción comprende el aguinaldo',
        url: 'https://www.impo.com.uy/bases/decretos/951-1975',
        publisher: 'IMPO',
      },
      {
        label:
          'Subsidio por enfermedad: 70 %, tope $ 67.754 (01/2026), más la cuota parte de aguinaldo; reparto BSE/BPS (actualizado 08/09/2026)',
        url: 'https://www.bps.gub.uy/4774/subsidio-por-enfermedad.html',
        publisher: 'BPS',
      },
      {
        label:
          'Subsidio por desempleo por despido: escala y topes 2026, sin cuota parte de aguinaldo (actualizado 26/01/2026)',
        url: 'https://www.bps.gub.uy/4802/subsidio-por-desempleo-por-despido.html',
        publisher: 'BPS',
      },
      {
        label:
          'Subsidio por desempleo por suspensión: "solo puede haber cobrado aguinaldo y feriados pagos"',
        url: 'https://www.bps.gub.uy/18239/subsidio-por-desempleo-por-suspension.html',
        publisher: 'BPS',
      },
      {
        label:
          'Subsidio por maternidad: 100 % del promedio más cuota parte de aguinaldo (actualizado 03/11/2025)',
        url: 'https://www.bps.gub.uy/4804/subsidio-por-maternidad.html',
        publisher: 'BPS',
      },
      {
        label: 'Subsidio transitorio por incapacidad parcial (actualizado 13/04/2026)',
        url: 'https://www.bps.gub.uy/9780/subsidio-transitorio-por-incapacidad-parcial.html',
        publisher: 'BPS',
      },
      {
        label:
          'Denuncias de trabajadores: actividades no declaradas desde el 1/4/1996 (actualizado 13/03/2026)',
        url: 'https://www.bps.gub.uy/11439/denuncias-de-trabajadores.html',
        publisher: 'BPS',
      },
      {
        label:
          'Garantía de Créditos Laborales (Ley 19.690): aguinaldos de los dos últimos años, más la multa del 10 %, hasta 105.000 UI',
        url: 'https://www.bps.gub.uy/16629/garantia-de-creditos-laborales.html',
        publisher: 'BPS',
      },
      {
        label:
          'Partidas salariales de Construcción: el BPS liquida aguinaldo, licencia y salario vacacional; períodos noviembre–abril y mayo–octubre (actualizado 05/12/2025)',
        url: 'https://www.bps.gub.uy/16585/partidas-salariales-de-construccion.html',
        publisher: 'BPS',
      },
      {
        label:
          'Prima por presentismo del trabajo doméstico: cuarta parte del medio aguinaldo (actualizado 01/07/2026)',
        url: 'https://www.bps.gub.uy/6596/prima-por-presentismo.html',
        publisher: 'BPS',
      },
      {
        label:
          'Canasta de fin de año: $ 3.151 (valor 2025), ingresos menores a $ 20.458 (actualizado 04/12/2025)',
        url: 'https://www.bps.gub.uy/21733/canasta-de-fin-de-ano.html',
        publisher: 'BPS',
      },
      {
        label:
          'Denuncias laborales en la Inspección General del Trabajo: sólo con vínculo vigente; desvinculados y liquidaciones',
        url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/denuncias-laborales',
        publisher: 'MTSS',
      },
      {
        label:
          'Preguntas frecuentes en materia laboral: tickets de alimentación y abandono de trabajo',
        url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/institucional/preguntas-frecuentes/materia-laboral',
        publisher: 'MTSS',
      },
      {
        label:
          'IRPF para trabajadores dependientes (11/06/2026): el aguinaldo legal se grava aparte, a la tasa marginal máxima',
        url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/irpf-para-trabajadores-dependientes',
        publisher: 'DGI',
      },
    ],
  },
]
