// Framework-agnostic content + helpers for the editorial guides
// (`pages/guias/index.vue` and `pages/guias/[slug].vue`).
//
// This module is PURE (no Vue/Nuxt runtime, no global state, relative imports
// only) so it can be unit-tested in plain Node via vitest and reused by the
// pages, the server sitemap route, and the `validate` route guard without
// duplicating the catalogue or the lookup logic.
//
// The guide BODIES are intentionally Spanish-only: the audience is Uruguay. The
// pages render this content verbatim regardless of the active UI locale, while
// the surrounding chrome (nav labels, CTA, "última actualización") is i18n'd.

/** A single titled section within a guide. `body` is plain prose (no markup). */
export interface GuideSection {
  /** Section heading, rendered as an `<h2>` on the guide page. */
  heading: string
  /** Section prose. May contain multiple sentences; rendered as a paragraph. */
  body: string
}

/** A related internal link rendered at the foot of a guide. */
export interface GuideLink {
  /** Visible chip label. */
  label: string
  /** App-relative path (passed through `localePath`). */
  to: string
}

/** A complete editorial guide, addressable at `/guias/{slug}`. */
export interface Guide {
  /** URL-safe identifier, unique across {@link guides} (e.g. `'comprar-dolares-mejor-precio'`). */
  slug: string
  /** H1 / document title. */
  title: string
  /** One-line summary used for meta description, cards and the OG subtitle. */
  description: string
  /** Short uppercase label shown on cards and the OG image (e.g. `'PRECIO'`). */
  tag: string
  /** ISO date (`YYYY-MM-DD`) of last review; drives `datePublished`/`dateModified`. */
  updatedAt: string
  /** Ordered body sections. */
  sections: GuideSection[]
  /** Optional guide-specific related links, shown in addition to the defaults. */
  related?: GuideLink[]
}

/**
 * The full catalogue of guides. Order here is the order shown on `/guias`.
 *
 * Every entry is original, SEO-rich copy written for the Uruguayan market and
 * grounded in how Cambio Uruguay actually works (BCU data, 40+ casas de cambio,
 * refreshed roughly every 10 minutes; BILLETE/CABLE/TRANSFERENCIA for the public
 * vs INTERBANCARIO as a wholesale bank-only reference).
 */
export const guides: readonly Guide[] = [
  {
    slug: 'conviene-comprar-dolares-hoy',
    title: '¿Conviene comprar dólares hoy en Uruguay?',
    description:
      'Cómo decidir si conviene comprar dólares hoy en Uruguay: qué mirar en la cotización, el spread entre casas de cambio y tu propio horizonte de necesidad.',
    tag: 'DECISIÓN',
    updatedAt: '2026-06-16',
    sections: [
      {
        heading: 'La pregunta correcta no es solo "a cuánto está"',
        body: 'Antes de comprar dólares conviene separar dos cosas distintas: el precio del dólar y tu necesidad concreta. El precio cambia todo el tiempo y nadie puede anticiparlo con certeza; en cambio, tu necesidad (un viaje, un ahorro, un pago en dólares) sí la conocés. La mayoría de las malas decisiones cambiarias no vienen de "comprar caro", sino de comprar con apuro, en el primer lugar a mano y sin comparar. La cotización del día es el punto de partida, no la respuesta completa.',
      },
      {
        heading: 'Qué mirar en la cotización antes de decidir',
        body: 'En Cambio Uruguay vas a ver, para cada casa de cambio, un precio de compra y uno de venta. Si vos comprás dólares, te importa el precio de venta de la casa (lo que te cobra por cada dólar). La diferencia entre comprar en el mejor y en el peor lugar puede ser de varios pesos por dólar, y en montos altos eso se vuelve dinero real. Nuestra plataforma reúne más de 40 casas de cambio con datos del Banco Central del Uruguay (BCU) actualizados aproximadamente cada 10 minutos, así que la foto que ves es muy cercana al mercado en vivo.',
      },
      {
        heading: 'El spread: la pista que casi nadie mira',
        body: 'El "spread" es la brecha entre el precio de compra y el de venta. Un spread chico suele indicar un mercado líquido y competitivo; un spread grande significa que la casa se queda con más en cada operación. Comparar el spread entre casas te dice rápido dónde te conviene operar según vayas a comprar o a vender. Para una misma cotización de referencia, la casa con menor spread casi siempre te deja mejor parado.',
      },
      {
        heading: 'Tu horizonte importa más que el titular del día',
        body: 'Si necesitás los dólares la semana que viene, intentar "adivinar el piso" rara vez vale la pena: el costo de equivocarte supera al ahorro de acertar por unos centésimos. Si en cambio ahorrás en dólares a largo plazo, el ruido diario importa todavía menos y conviene una estrategia de compras escalonadas en el tiempo, que promedia el precio y baja el riesgo de comprar todo en un mal momento. Definir tu horizonte antes de mirar el precio evita decisiones emocionales.',
      },
      {
        heading: 'Errores frecuentes al comprar dólares hoy',
        body: 'Los tres errores más caros son: cambiar en aeropuertos o zonas turísticas (donde el precio suele ser peor), no comparar entre casas y asumir que tu banco siempre da la mejor cotización. También conviene distinguir el tipo de operación: el billete físico, la transferencia y el cable no cuestan lo mismo. Una operación informada empieza por comparar y por elegir el canal adecuado para lo que necesitás.',
      },
      {
        heading: 'Cómo usar Cambio Uruguay para decidir hoy',
        body: 'Entrá al comparador, fijate la cotización de venta más baja para el monto que querés cambiar y revisá el spread de esa casa. Si tu necesidad no es urgente, mirá también el histórico para entender si el precio de hoy está alto o bajo respecto de las últimas semanas. Con esos tres datos —mejor precio, spread y contexto— tenés una base sólida para decidir, sin depender de corazonadas.',
      },
    ],
  },
  {
    slug: 'billete-cable-transferencia',
    title: 'BILLETE vs CABLE vs TRANSFERENCIA vs eBROU: qué significan',
    description:
      'Qué significan BILLETE, CABLE, TRANSFERENCIA, eBROU e INTERBANCARIO en las cotizaciones del dólar en Uruguay y por qué cada tipo tiene un precio distinto.',
    tag: 'TIPOS',
    updatedAt: '2026-06-16',
    sections: [
      {
        heading: 'Por qué el dólar tiene varios precios a la vez',
        body: 'Cuando mirás las cotizaciones notás que el "dólar" no tiene un único precio: cambia según cómo se mueva el dinero. No es lo mismo recibir billetes físicos que mover saldos entre cuentas o enviar fondos al exterior. Cada modalidad tiene costos operativos y riesgos distintos para la casa de cambio, y eso se refleja en el precio. Entender estos tipos es la diferencia entre comparar peras con peras y confundirte con un número que no aplica a tu caso.',
      },
      {
        heading: 'BILLETE: el dólar físico, en mano',
        body: 'El tipo BILLETE es la cotización del dólar en efectivo, los billetes físicos que retirás o entregás en la casa de cambio. Es la modalidad clásica para quien viaja o guarda efectivo. Como implica manejar, custodiar y trasladar dinero físico, suele tener un spread algo mayor que las operaciones electrónicas. Si tu plan es llevarte dólares en el bolsillo, BILLETE es la cotización que te aplica.',
      },
      {
        heading: 'TRANSFERENCIA: dólares que se mueven entre cuentas',
        body: 'La cotización TRANSFERENCIA aplica cuando la operación se hace por movimiento electrónico de fondos, sin billetes de por medio: acreditás o debitás dólares de una cuenta. Al no haber manejo de efectivo, suele ofrecer condiciones más afinadas que el billete. Es la modalidad típica para quien opera montos medianos o altos y prefiere no mover dinero físico.',
      },
      {
        heading: 'CABLE: dólares hacia o desde el exterior',
        body: 'CABLE se refiere a los dólares transferidos internacionalmente, es decir fondos que entran o salen del sistema financiero uruguayo hacia el exterior. El nombre es histórico (las transferencias "por cable"). Por los costos y tiempos de las operaciones transfronterizas, su precio puede diferir del dólar local. Es la cotización relevante cuando enviás o recibís dinero de afuera del país.',
      },
      {
        heading: 'eBROU: el dólar de la plataforma del BROU',
        body: 'eBROU hace referencia a operar a través de la plataforma digital del Banco República (BROU). Suele ofrecer cotizaciones competitivas para quienes tienen cuenta y operan en línea, evitando ir a una sucursal. Tené presente que para usar esta modalidad normalmente necesitás una cuenta habilitada en el banco; es una condición de la operación, no una "trampa" del precio.',
      },
      {
        heading: 'INTERBANCARIO: una referencia, no un precio para el público',
        body: 'El tipo INTERBANCARIO es la cotización mayorista a la que operan los bancos entre sí. Es una referencia de mercado muy útil para entender hacia dónde va el dólar, pero no es un precio al que vos, como persona, puedas comprar o vender. Lo mostramos como termómetro del mercado, no como una opción de operación. Para tus transacciones reales, mirá BILLETE, TRANSFERENCIA o CABLE según el caso.',
      },
      {
        heading: 'Cómo elegir el tipo correcto para tu operación',
        body: 'La regla práctica es simple: si vas a manejar efectivo, mirá BILLETE; si movés saldos entre cuentas dentro del país, mirá TRANSFERENCIA; si enviás o recibís fondos del exterior, mirá CABLE; y si operás por la plataforma del BROU, mirá eBROU. Usá INTERBANCARIO solo como contexto. Comparar el mismo tipo entre las más de 40 casas de cambio del comparador es la forma de encontrar realmente el mejor precio para lo que necesitás.',
      },
    ],
  },
  {
    slug: 'comprar-dolares-mejor-precio',
    title: 'Cómo comprar dólares al mejor precio en Uruguay',
    description:
      'Guía práctica para comprar dólares al mejor precio en Uruguay: comparar entre casas de cambio, entender el spread, elegir el canal y evitar comisiones ocultas.',
    tag: 'PRECIO',
    updatedAt: '2026-06-16',
    sections: [
      {
        heading: 'El mejor precio empieza por comparar',
        body: 'En Uruguay no existe un único precio del dólar: cada casa de cambio fija el suyo y la diferencia entre la mejor y la peor puede ser significativa. El primer hábito que ahorra dinero es comparar antes de operar. Cambio Uruguay reúne más de 40 casas de cambio con datos del BCU actualizados aproximadamente cada 10 minutos, así que en pocos segundos ves dónde está la cotización de venta más baja para comprar dólares.',
      },
      {
        heading: 'Mirá la venta, no la compra (si estás comprando)',
        body: 'Cuando vos comprás dólares, la casa te los vende: por eso el número que te importa es el precio de venta de la casa, no el de compra. Es un detalle que confunde a mucha gente y lleva a comparar la columna equivocada. Filtrá y ordená por el precio de venta más bajo para tu monto, y vas a estar mirando exactamente lo que te va a costar la operación.',
      },
      {
        heading: 'Entendé el spread antes de elegir',
        body: 'El spread —la brecha entre compra y venta— te dice cuánto se queda la casa en cada operación. Dos casas pueden tener una cotización parecida pero spreads distintos; la de menor spread suele dejarte mejor parado. Mirar el spread te protege de elegir un lugar que parece barato en un número pero te castiga en el otro lado de la operación.',
      },
      {
        heading: 'Elegí el canal adecuado: billete, transferencia o cable',
        body: 'El mismo dólar cuesta distinto según el canal. El billete físico suele tener un spread mayor por el manejo de efectivo; la transferencia entre cuentas suele ser más afinada; el cable aplica para operaciones con el exterior. Plataformas digitales como eBROU pueden ofrecer condiciones preferenciales si tenés cuenta. Elegir el canal correcto para tu necesidad puede ahorrarte más que cambiar de casa de cambio.',
      },
      {
        heading: 'Cuidado con comisiones, mínimos y zonas turísticas',
        body: 'Un buen precio nominal puede esfumarse con comisiones, montos mínimos poco convenientes o condiciones especiales. Antes de cerrar, confirmá que la cotización que viste sea la que efectivamente te aplican para tu monto y modalidad. Y evitá cambiar en aeropuertos o zonas turísticas: la comodidad se paga con un precio claramente peor. Operar en una casa comparada del mercado formal casi siempre rinde mejor.',
      },
      {
        heading: 'Para montos grandes, conviene negociar',
        body: 'En operaciones importantes muchas casas mejoran la cotización si se la pedís directamente, sobre todo por transferencia. No está de más consultar: el peor escenario es que te mantengan el precio publicado. Llevar como referencia el mejor precio que viste en el comparador te da un argumento concreto para negociar y te evita aceptar la primera cifra.',
      },
      {
        heading: 'Tu rutina de compra en tres pasos',
        body: 'Resumiendo: primero compará en Cambio Uruguay y quedate con la venta más baja para tu monto; segundo, revisá el spread y elegí el canal (billete, transferencia, cable o eBROU) que corresponde a tu caso; tercero, confirmá comisiones y, si el monto es alto, negociá. Con esa rutina simple comprás dólares al mejor precio disponible sin depender de la suerte ni del primer lugar que encontrás.',
      },
    ],
  },
  {
    slug: 'mejor-momento-cambiar-divisas',
    title: '¿Cuál es el mejor momento para cambiar divisas?',
    description:
      'Cuándo conviene cambiar divisas en Uruguay: horarios y días hábiles, volatilidad del mercado, y por qué tu necesidad pesa más que intentar adivinar el piso.',
    tag: 'TIMING',
    updatedAt: '2026-06-16',
    sections: [
      {
        heading: 'Dos preguntas distintas: cuándo en el día y cuándo en el mes',
        body: 'El "mejor momento" tiene dos capas. Una es operativa: a qué hora y qué día conviene operar para tener buenos precios y casas abiertas. La otra es estratégica: si conviene esperar a que el dólar baje o comprar ya. La primera tiene respuestas bastante claras; la segunda depende de pronosticar el mercado, algo que ni los profesionales hacen con certeza. Separarlas evita frustraciones.',
      },
      {
        heading: 'Horarios y días hábiles: el mercado tiene su ritmo',
        body: 'El mercado cambiario uruguayo se mueve principalmente en días hábiles y en horario bancario. Durante esas horas las cotizaciones se actualizan con más frecuencia y reflejan mejor la oferta y demanda. Fuera de ese horario, en fines de semana o feriados, los precios suelen quedar "congelados" en la última referencia y hay menos casas operando. Si podés elegir, operar en pleno día hábil te da el mercado más representativo.',
      },
      {
        heading: 'Volatilidad: cuándo el precio se mueve más',
        body: 'Hay momentos de mayor movimiento: aperturas de mercado, días con datos económicos relevantes o noticias que afectan al peso y al dólar. En esos tramos el precio puede oscilar más, lo que es oportunidad y riesgo a la vez. Si no seguís el mercado de cerca, no necesitás cronometrar estos momentos; alcanza con comparar bien cuando vayas a operar y evitar decidir en caliente apenas salta una noticia.',
      },
      {
        heading: 'Por qué intentar "adivinar el piso" suele fallar',
        body: 'Esperar el mínimo perfecto es tentador pero costoso: si te equivocás, el ahorro potencial se transforma en pérdida, y el estrés de vigilar el precio todos los días rara vez se justifica. Para la mayoría de las personas, el momento de cambiar lo define la necesidad real (un viaje, un pago, un ahorro), no un pronóstico. Aceptar que no se puede temporizar el mercado con precisión es, paradójicamente, la decisión más rentable.',
      },
      {
        heading: 'Compras escalonadas: bajar el riesgo del timing',
        body: 'Si ahorrás en dólares de forma recurrente, una estrategia simple y efectiva es comprar de a poco y en distintos momentos en lugar de todo de una vez. Así promediás el precio y reducís el riesgo de haber comprado todo en un mal día. Esta táctica —comprar por tramos— le quita peso a la pregunta del "mejor momento", porque ya no apostás todo a una sola fecha.',
      },
      {
        heading: 'La regla práctica para la mayoría',
        body: 'Si tu necesidad no es urgente, operá en día hábil y horario de mercado, compará en Cambio Uruguay para quedarte con el mejor precio y, si el monto es grande o recurrente, escaloná las compras. Mirá el histórico para tener contexto, pero no dejes que el deseo de adivinar el piso te paralice. El mejor momento para la mayoría es el momento en que ya comparaste y tu necesidad lo pide.',
      },
    ],
  },
  {
    slug: 'comprar-online-exterior-impuestos',
    title: 'Comprar online del exterior en Uruguay: impuestos y franquicia',
    description:
      'Cómo funciona la franquicia courier de USD 800, cuándo pagás el 60% del régimen simplificado y cómo estimar el costo total de una compra online del exterior en Uruguay.',
    tag: 'IMPORTACIÓN',
    updatedAt: '2026-06-17',
    sections: [
      {
        heading: 'El régimen courier: la vía habitual para compras online',
        body: 'Cuando comprás en una tienda del exterior y te lo envían "puerta a puerta", la operación entra por el régimen de encomiendas postales (courier). Es el camino más común para compras personales sin fines comerciales, y tiene reglas propias distintas a la importación formal. Conocerlas antes de comprar evita sorpresas al momento de recibir el paquete y pagar para liberarlo.',
      },
      {
        heading: 'La franquicia anual de USD 800',
        body: 'Desde mayo de 2026 rige una franquicia anual de hasta USD 800 por persona, que se puede usar hasta 3 veces al año, con un máximo de 20 kg por envío. Lo que entra dentro de la franquicia no paga impuestos de importación (sí los costos del courier). La clave es que la franquicia es anual: conviene administrarla durante el año y no agotarla en una sola compra si pensás traer más cosas.',
      },
      {
        heading: 'El régimen simplificado: 60% sobre el valor',
        body: 'Los envíos que no califican para la franquicia tributan bajo el régimen simplificado, que aplica una tasa única del 60% sobre el valor declarado de la compra, con un mínimo. Es un cálculo sencillo: si traés algo por fuera de la franquicia, multiplicá el valor por 0,60 para estimar el impuesto. A ese costo hay que sumarle el flete y los cargos del courier.',
      },
      {
        heading: 'Cómo estimar el costo total antes de comprar',
        body: 'El costo final de una compra online no es solo el precio del producto: sumá el envío, los impuestos que correspondan y los cargos del courier. Hacer la cuenta antes de comprar te dice si realmente conviene traerlo del exterior o si conseguís algo similar en plaza a un precio competitivo una vez cargados todos los costos.',
      },
      {
        heading: 'Usá la calculadora de impuestos de importación',
        body: 'Para no hacer las cuentas a mano, nuestra calculadora de impuestos de importación te permite ingresar el valor, elegir si aplicás la franquicia y ver el impuesto y el costo total estimado, tanto para el régimen courier como para el general. Recordá que son valores de referencia: verificá siempre las condiciones vigentes con Aduanas y tu courier antes de comprar.',
      },
    ],
  },
  {
    slug: 'enviar-recibir-dinero-exterior',
    title: 'Enviar y recibir dinero del exterior en Uruguay',
    description:
      'Guía para enviar y recibir dinero del exterior en Uruguay: transferencias internacionales, remesas, el dólar cable y cómo cuidar la cotización a la que se liquida.',
    tag: 'REMESAS',
    updatedAt: '2026-06-17',
    sections: [
      {
        heading: 'Tres formas de mover dinero entre países',
        body: 'Para enviar o recibir dinero del exterior solés tener tres caminos: la transferencia bancaria internacional (red SWIFT), los servicios de remesas y las plataformas digitales. Cada uno tiene costos, plazos y tipos de cambio distintos. Antes de elegir, conviene comparar no solo la comisión visible, sino también la cotización a la que te convierten el dinero, que es donde muchas veces está el costo real.',
      },
      {
        heading: 'El dólar cable y por qué importa',
        body: 'Las operaciones con el exterior se vinculan con la cotización del dólar cable, que puede diferir del dólar local. Si recibís dólares de afuera y los pasás a pesos, la diferencia entre una buena y una mala cotización se nota en el monto final. Por eso, una vez que el dinero llegó, comparar dónde liquidarlo puede mejorar bastante lo que recibís.',
      },
      {
        heading: 'Comisiones y tipo de cambio: mirá las dos cosas',
        body: 'Un servicio puede anunciar "envío gratis" pero aplicarte un tipo de cambio peor, y terminar siendo más caro que otro con comisión explícita y mejor cotización. La forma honesta de comparar es preguntar cuántos pesos (o dólares) recibe efectivamente el destinatario al final, descontando todo. Esa cifra final es la única que importa.',
      },
      {
        heading: 'Recibir remesas: cuidá la liquidación',
        body: 'Si te llegan remesas de forma recurrente, pequeñas diferencias de cotización suman a lo largo del año. Tené a mano una referencia del mejor precio del día y, cuando puedas elegir, liquidá donde la cotización te favorezca. Comparar antes de cambiar es la rutina que más dinero ahorra a quien recibe ingresos del exterior.',
      },
      {
        heading: 'Antes de operar: compará',
        body: 'Sea para enviar o recibir, entrá a Cambio Uruguay y mirá la cotización del dólar y de otras divisas en más de 40 casas de cambio. Tener el mejor precio del día como referencia te da poder de negociación y te evita aceptar la primera cifra que te ofrecen.',
      },
    ],
  },
  {
    slug: 'dolares-para-viajar',
    title: 'Cuántos dólares llevar de viaje y cómo conseguirlos',
    description:
      'Cómo planificar cuántos dólares llevar de viaje desde Uruguay, billete vs tarjeta, dónde conseguir el mejor precio y cómo evitar cambiar caro en el aeropuerto.',
    tag: 'VIAJES',
    updatedAt: '2026-06-17',
    sections: [
      {
        heading: 'Primero el presupuesto, después la moneda',
        body: 'Antes de pensar en el tipo de cambio, estimá tu gasto: días de viaje, gasto diario promedio (alojamiento, comida, transporte) y un extra para imprevistos. Con ese número total sabés cuántos dólares (o euros, o reales) necesitás llevar. Planificar el presupuesto evita tanto quedarte corto como cambiar de más y tener que revender divisas a peor precio al volver.',
      },
      {
        heading: 'Billete, tarjeta o una mezcla',
        body: 'Llevar todo en efectivo es riesgoso; pagar todo con tarjeta puede tener recargos. La estrategia más usada es una mezcla: algo de efectivo para gastos chicos y propinas, y tarjeta para el resto, sabiendo qué tipo de cambio y comisiones te aplican. Para el efectivo, el dólar billete es la cotización relevante; compará entre casas antes de comprarlo.',
      },
      {
        heading: 'Dónde conseguir el mejor precio',
        body: 'El peor lugar para cambiar suele ser el aeropuerto o las zonas turísticas: la comodidad se paga con un precio claramente peor. Comprá tus divisas con anticipación comparando casas de cambio, y evitá dejarlo para último momento. Unos pesos de diferencia por dólar, multiplicados por el total del viaje, son dinero real.',
      },
      {
        heading: 'No intentes cronometrar el dólar',
        body: 'Si tu viaje es pronto, esperar a que el dólar baje rara vez vale la pena: el riesgo de equivocarte supera al ahorro de acertar por unos centésimos. Si el viaje es a varios meses y ahorrás en pesos, podés comprar de a poco para promediar el precio. Definí tu horizonte y actuá en consecuencia.',
      },
      {
        heading: 'Planificá con nuestras herramientas',
        body: 'Usá la calculadora de presupuesto de viaje para estimar cuántos dólares llevar y el conversor para verlo en pesos con la cotización en vivo. Después, compará casas de cambio para comprar al mejor precio. Viajar tranquilo empieza por hacer bien las cuentas antes de salir.',
      },
    ],
  },
  {
    slug: 'ahorrar-en-dolares-o-pesos',
    title: '¿Conviene ahorrar en dólares o en pesos en Uruguay?',
    description:
      'Ventajas y riesgos de ahorrar en dólares o en pesos en Uruguay: inflación, tasas de plazo fijo, unidad indexada y cómo elegir según tus gastos futuros.',
    tag: 'AHORRO',
    updatedAt: '2026-06-17',
    sections: [
      {
        heading: 'La pregunta clave: ¿en qué vas a gastar?',
        body: 'La mejor moneda para ahorrar depende sobre todo de en qué planeás gastar ese dinero. Si tu objetivo está en dólares (un viaje, un auto, un inmueble valuado en dólares), ahorrar en dólares te cubre del riesgo cambiario. Si tus gastos futuros son en pesos, ahorrar en pesos —o en instrumentos indexados— puede tener más sentido. Alinear la moneda del ahorro con la del gasto es la regla más sólida.',
      },
      {
        heading: 'Pesos: rinden más, pero pierden con la inflación',
        body: 'Los plazos fijos en pesos suelen pagar tasas más altas que los de dólares para compensar la inflación. El punto es que esa tasa tiene que superar a la inflación para que ganes poder de compra real. Si la inflación se come buena parte del interés, el rendimiento real es bajo. Mirá siempre la tasa frente a la inflación esperada, no en abstracto.',
      },
      {
        heading: 'Dólares: estabilidad, pero menor tasa',
        body: 'Ahorrar en dólares protege frente a la pérdida de valor del peso y aporta previsibilidad, especialmente para metas de largo plazo. A cambio, las tasas de interés en dólares suelen ser más bajas. Es la opción de quien prioriza preservar valor por sobre maximizar el rendimiento nominal.',
      },
      {
        heading: 'La opción indexada: Unidad Indexada (UI)',
        body: 'Entre ambos extremos están los instrumentos en Unidad Indexada, que ajustan su valor por la inflación (IPC). Permiten ahorrar en pesos sin perder poder de compra frente a la suba de precios. Son una alternativa interesante para quien quiere mantener valor real sin asumir riesgo cambiario.',
      },
      {
        heading: 'Diversificar suele ser lo más prudente',
        body: 'No tenés que elegir todo o nada. Muchos ahorristas reparten entre pesos, dólares e instrumentos indexados según sus metas y horizonte. Lo importante es decidir con criterio y no por impulso. Y cuando compres o vendas dólares, compará en Cambio Uruguay para hacerlo al mejor precio.',
      },
    ],
  },
  {
    slug: 'cambiar-pesos-argentinos-uruguay',
    title: 'Cambiar pesos argentinos en Uruguay: qué tener en cuenta',
    description:
      'Cómo y dónde cambiar pesos argentinos en Uruguay, por qué su cotización es volátil y tiene spreads amplios, y consejos para zonas de frontera y turismo.',
    tag: 'FRONTERA',
    updatedAt: '2026-06-17',
    sections: [
      {
        heading: 'Una moneda volátil y de spread amplio',
        body: 'El peso argentino es una de las monedas más volátiles que se operan en Uruguay por la historia inflacionaria y cambiaria del país vecino. Eso se traduce en cotizaciones que varían mucho entre casas de cambio y en spreads (brecha compra-venta) más amplios que los del dólar. Comparar antes de operar es todavía más importante con esta moneda.',
      },
      {
        heading: 'Dónde se cambia mejor',
        body: 'La oferta de cambio de pesos argentinos se concentra en zonas de frontera y de turismo. En esos lugares hay más casas operando esta moneda y, por la competencia, podés encontrar mejores precios que en sitios donde casi no se demanda. Aun así, las diferencias entre casas pueden ser grandes: no asumas que todas pagan parecido.',
      },
      {
        heading: 'Cuidado con el momento y el monto',
        body: 'Como la cotización puede moverse marcadamente en poco tiempo, evitá quedarte con grandes cantidades de pesos argentinos si no los vas a usar pronto. Para montos altos, consultá directamente: algunas casas mejoran el precio. Y tené presente que la cotización de hoy puede no ser la de mañana.',
      },
      {
        heading: 'Compará en Cambio Uruguay',
        body: 'Antes de cambiar pesos argentinos, mirá la cotización de la moneda en las casas de cambio relevadas y quedate con la que más te convenga según vayas a comprar o vender. Tener una referencia clara del mercado te protege de aceptar un precio muy por debajo del disponible.',
      },
    ],
  },
  {
    slug: 'euros-reales-donde-cambiar',
    title: 'Euros y reales en Uruguay: dónde y cómo cambiarlos',
    description:
      'Cómo cambiar euros y reales en Uruguay, por qué su precio se mueve junto con el dólar (arbitraje) y cómo encontrar la mejor cotización entre casas de cambio.',
    tag: 'DIVISAS',
    updatedAt: '2026-06-17',
    sections: [
      {
        heading: 'Por qué euros y reales se mueven con el dólar',
        body: 'En el mercado uruguayo, el precio del euro y del real en pesos suele calcularse por arbitraje: se combina la cotización internacional de cada moneda frente al dólar con el dólar/peso local. Por eso, cuando se mueve el dólar, también se mueven el euro y el real, aunque la noticia no los mencione. Entender esto ayuda a interpretar por qué cambian sus precios.',
      },
      {
        heading: 'Spreads más amplios que el dólar',
        body: 'Al ser monedas menos operadas que el dólar, el euro y el real tienden a tener spreads (brecha compra-venta) más amplios y mayor variación entre casas de cambio. Eso significa que comparar rinde aún más: la diferencia entre la mejor y la peor cotización puede ser significativa.',
      },
      {
        heading: 'El real y la frontera',
        body: 'El real brasileño tiene más demanda en zonas de frontera y turismo, donde solés encontrar mejores condiciones para cambiarlo. Si viajás a Brasil o recibís reales, compará especialmente en esas localidades, sin dejar de revisar las casas online relevadas.',
      },
      {
        heading: 'Compará antes de operar',
        body: 'Tanto para euros como para reales, entrá a Cambio Uruguay, mirá la cotización en las casas de cambio y elegí según vayas a comprar o vender. Una buena comparación te asegura que no estás dejando dinero sobre la mesa con monedas que, por su menor liquidez, pueden tener precios muy dispares.',
      },
    ],
  },
  {
    slug: 'casas-de-cambio-vs-bancos',
    title: 'Casas de cambio vs bancos: ¿dónde conviene cambiar?',
    description:
      'Diferencias entre cambiar divisas en casas de cambio o en bancos en Uruguay: cotizaciones, comodidad, requisitos y cuándo conviene cada opción.',
    tag: 'COMPARATIVA',
    updatedAt: '2026-06-17',
    sections: [
      {
        heading: 'No siempre tu banco da el mejor precio',
        body: 'Un error frecuente es asumir que el banco propio ofrece automáticamente la mejor cotización. No siempre es así: las casas de cambio compiten entre sí y, para muchas operaciones, ofrecen precios mejores. La única forma de saberlo es comparar la cotización del banco con la de varias casas antes de operar.',
      },
      {
        heading: 'La comodidad del banco tiene un valor',
        body: 'Operar con tu banco —sobre todo por home banking o plataformas como eBROU— es cómodo: no tenés que trasladarte ni manejar efectivo, y el dinero queda acreditado en tu cuenta. Esa comodidad puede justificar una pequeña diferencia de precio para montos chicos o medianos, especialmente si valorás la seguridad de no mover billetes.',
      },
      {
        heading: 'Las casas de cambio y el efectivo',
        body: 'Para operaciones en efectivo (dólar billete), las casas de cambio suelen ser la referencia, con muchas opciones y precios competitivos. Para montos grandes, muchas mejoran la cotización si la negociás, sobre todo por transferencia. La contra es que implica trasladarte y, a veces, manejar dinero físico.',
      },
      {
        heading: 'La regla práctica',
        body: 'Compará siempre: mirá la cotización de tu banco y la de las casas de cambio relevadas en Cambio Uruguay para tu tipo de operación (billete, transferencia, cable). Elegí según el equilibrio entre precio y comodidad que más te sirva. Para montos altos, la diferencia de precio suele inclinar la balanza hacia comparar bien.',
      },
    ],
  },
  {
    slug: 'como-leer-cotizacion-dolar',
    title: 'Cómo leer la cotización del dólar paso a paso',
    description:
      'Aprendé a leer la cotización del dólar en Uruguay: compra y venta, spread, tipos de operación y cómo identificar rápido el mejor precio para tu caso.',
    tag: 'BÁSICOS',
    updatedAt: '2026-06-17',
    sections: [
      {
        heading: 'Compra y venta: desde la óptica de la casa',
        body: 'La cotización siempre tiene dos números: compra y venta, definidos desde el punto de vista de la casa de cambio. "Compra" es lo que la casa te paga si le vendés dólares; "venta" es lo que te cobra si le comprás. Por eso, si vos comprás dólares, mirás el precio de venta de la casa; si vos vendés, mirás el de compra. Confundir las columnas es el error más común.',
      },
      {
        heading: 'El spread te dice cuánto se queda la casa',
        body: 'La diferencia entre venta y compra es el spread. Cuanto más chico, mejor para vos, porque la casa se queda con menos en cada operación. Dos casas con una cotización parecida pueden tener spreads distintos: la de menor spread suele dejarte mejor parado. Mirar el spread, y no solo un número aislado, afina la comparación.',
      },
      {
        heading: 'Identificá el tipo de operación',
        body: 'El mismo dólar tiene varios precios según cómo se mueva el dinero: billete (efectivo), transferencia (entre cuentas), cable (con el exterior) y eBROU (plataforma del BROU). El interbancario es solo una referencia mayorista, no un precio para el público. Asegurate de comparar el mismo tipo entre casas: es la única forma de comparar peras con peras.',
      },
      {
        heading: 'Cómo encontrar el mejor precio rápido',
        body: 'En Cambio Uruguay podés ordenar y filtrar las casas para tu operación. Si comprás, buscá la venta más baja; si vendés, la compra más alta. Sumá una mirada al spread y, si no tenés apuro, al histórico para tener contexto. Con esos pasos leés la cotización como un experto y operás con datos.',
      },
    ],
  },
  {
    slug: 'unidad-indexada-explicada',
    title: 'Unidad Indexada (UI) explicada: para qué sirve y cómo se calcula',
    description:
      'Qué es la Unidad Indexada (UI) en Uruguay, por qué ajusta por inflación, en qué contratos aparece y cómo convertir UI a pesos uruguayos.',
    tag: 'INDEXACIÓN',
    updatedAt: '2026-06-17',
    sections: [
      {
        heading: 'Qué es la Unidad Indexada',
        body: 'La Unidad Indexada (UI) es una unidad de valor cuyo precio en pesos se ajusta diariamente según la inflación, medida por el Índice de Precios al Consumo (IPC). Su objetivo es mantener el poder de compra en el tiempo: cuando los precios suben, el valor de la UI también, de modo que una cantidad de UI conserva su valor real.',
      },
      {
        heading: 'Por qué se usa',
        body: 'En contextos con inflación, fijar montos en pesos a largo plazo los deja desactualizados. Por eso muchos contratos —alquileres, préstamos, ahorros— se expresan en UI: así ambas partes se protegen de la pérdida de valor del peso. Es una forma de "atar" el dinero al costo de vida en lugar de a un número fijo.',
      },
      {
        heading: 'Dónde la vas a encontrar',
        body: 'La UI aparece en contratos de alquiler, préstamos hipotecarios, instrumentos de ahorro y algunas tarifas. Si firmás algo en UI, conviene tener presente que el monto en pesos a pagar o cobrar irá variando con la inflación, a diferencia de un monto fijo en pesos. No es lo mismo que la Unidad Reajustable (UR), que ajusta por salarios.',
      },
      {
        heading: 'Cómo convertir UI a pesos',
        body: 'Convertir UI a pesos es directo: multiplicás la cantidad de UI por el valor del día, que publica el Banco Central. Para hacerlo sin buscar el número a mano, usá nuestro conversor de Unidad Indexada: ingresás las UI (o los pesos) y obtenés la equivalencia al valor vigente. Ideal para entender cuánto representa un alquiler o una cuota en pesos de hoy.',
      },
    ],
  },
  {
    slug: 'inflacion-y-dolar-uruguay',
    title: 'Inflación y dólar en Uruguay: cómo se relacionan',
    description:
      'Cómo se relacionan la inflación y el dólar en Uruguay, por qué muchos ahorran en dólares y qué mirar para entender el poder de compra del peso.',
    tag: 'ECONOMÍA',
    updatedAt: '2026-06-17',
    sections: [
      {
        heading: 'Inflación: el peso pierde poder de compra',
        body: 'La inflación es la suba sostenida y generalizada de los precios. Cuando hay inflación, la misma cantidad de pesos compra menos cosas con el paso del tiempo. En Uruguay se mide con el IPC, que publica mensualmente el INE. Es el telón de fondo de muchas decisiones financieras de las familias.',
      },
      {
        heading: 'Por qué muchos miran al dólar',
        body: 'Ante la pérdida de valor del peso, una parte de los ahorristas elige el dólar como refugio, buscando preservar poder de compra. Esta dolarización del ahorro tiene una larga historia en el país. No es la única estrategia —también están los instrumentos indexados—, pero explica por qué la cotización del dólar es seguida tan de cerca.',
      },
      {
        heading: 'La relación no es automática',
        body: 'Inflación y tipo de cambio se influyen, pero no se mueven siempre juntos ni en la misma magnitud. El dólar puede subir o bajar por factores propios del mercado cambiario (oferta y demanda, contexto regional, intervenciones del BCU) más allá de la inflación del mes. Por eso conviene mirar ambos indicadores y no asumir que uno predice exactamente al otro.',
      },
      {
        heading: 'Qué hacer con esta información',
        body: 'Si te preocupa la inflación, evaluá repartir tu ahorro entre pesos, dólares e instrumentos indexados según tus metas. Y cuando decidas comprar o vender dólares, hacelo al mejor precio comparando en Cambio Uruguay. Entender el contexto te ayuda a decidir con cabeza fría, no con titulares.',
      },
    ],
  },
  {
    slug: 'evitar-comisiones-cambio',
    title: 'Cómo evitar comisiones ocultas al cambiar divisas',
    description:
      'Identificá y evitá comisiones ocultas, mínimos y malas cotizaciones al cambiar divisas en Uruguay, y aprendé a comparar el costo real de cada operación.',
    tag: 'COSTOS',
    updatedAt: '2026-06-17',
    sections: [
      {
        heading: 'El costo no siempre se ve a primera vista',
        body: 'Al cambiar divisas, el costo real no está solo en una "comisión" explícita: muchas veces se esconde en una cotización peor. Un lugar puede no cobrar comisión pero aplicarte un tipo de cambio desfavorable, y terminar siendo más caro que otro con comisión y mejor precio. Comparar solo la comisión es insuficiente.',
      },
      {
        heading: 'Mirá el monto final, no las etiquetas',
        body: 'La forma honesta de comparar es preguntar cuántos pesos recibís (o pagás) al final, con todo incluido. Esa cifra final es la única que importa. Pedí siempre el "total a pagar" o "total a recibir" antes de cerrar la operación, y compará ese número entre opciones.',
      },
      {
        heading: 'Cuidado con mínimos y zonas turísticas',
        body: 'Algunas casas tienen montos mínimos o condiciones especiales que afectan el precio efectivo para operaciones chicas. Y los aeropuertos y zonas turísticas suelen ofrecer cotizaciones claramente peores a cambio de comodidad. Operar en el mercado formal comparado casi siempre rinde mejor.',
      },
      {
        heading: 'Negociá si el monto es alto',
        body: 'En operaciones grandes, muchas casas mejoran la cotización si la pedís, sobre todo por transferencia. Llevar como referencia el mejor precio que viste en Cambio Uruguay te da argumentos para negociar. El peor escenario es que mantengan el precio publicado; muchas veces, lo mejoran.',
      },
    ],
  },
  {
    slug: 'glosario-terminos-cambiarios',
    title: 'Glosario rápido de términos cambiarios en Uruguay',
    description:
      'Los términos clave del mercado cambiario uruguayo explicados en simple: cotización, spread, billete, cable, transferencia, interbancario y más.',
    tag: 'GLOSARIO',
    updatedAt: '2026-06-17',
    sections: [
      {
        heading: 'Cotización, compra y venta',
        body: 'La cotización es el precio de una moneda. Siempre tiene dos caras: compra (lo que la casa te paga por la divisa) y venta (lo que te cobra). Si comprás dólares, mirás la venta; si vendés, la compra. Cada casa fija su propia cotización, por eso conviene comparar.',
      },
      {
        heading: 'Spread y brecha',
        body: 'El spread es la diferencia entre venta y compra: cuanto más chico, mejor para vos. La brecha cambiaria, en cambio, es la diferencia porcentual entre dos cotizaciones distintas de una misma moneda (por ejemplo, oficial y paralela). Uruguay tiene mercado libre, así que no presenta grandes brechas.',
      },
      {
        heading: 'Billete, transferencia, cable y eBROU',
        body: 'El dólar tiene varios precios según cómo se mueva el dinero: billete (efectivo), transferencia (entre cuentas), cable (con el exterior) y eBROU (plataforma del BROU). Elegí el tipo que corresponde a tu operación para comparar correctamente entre casas.',
      },
      {
        heading: 'Interbancario: solo referencia',
        body: 'El dólar interbancario es la cotización mayorista a la que operan los bancos entre sí. Es un buen termómetro del mercado, pero no es un precio al que el público pueda comprar o vender. Para tus operaciones reales, usá billete, transferencia o cable.',
      },
      {
        heading: 'Profundizá en el glosario completo',
        body: 'Este es un repaso rápido. Si querés definiciones más completas —con ejemplos uruguayos y términos como UI, BPC, IRPF, IVA o tasa consular— visitá nuestro glosario financiero, pensado para entender el mercado y los impuestos del país en lenguaje claro.',
      },
    ],
  },
  {
    slug: 'como-afecta-la-fed-al-dolar',
    title: 'Cómo afecta la Reserva Federal (Fed) al dólar y a Uruguay',
    description:
      'Qué es la Reserva Federal de EE.UU., cómo sus decisiones de tasas mueven al dólar en el mundo y por qué eso llega hasta la cotización en Uruguay.',
    tag: 'GLOBAL',
    updatedAt: '2026-06-17',
    sections: [
      {
        heading: 'Qué es la Fed y por qué importa',
        body: 'La Reserva Federal (Fed) es el banco central de Estados Unidos. Sus decisiones sobre la tasa de interés en dólares influyen en el valor del dólar frente a otras monedas en todo el mundo. Como el dólar es la moneda de referencia global, lo que hace la Fed se siente lejos de Washington, incluido Uruguay.',
      },
      {
        heading: 'Tasas más altas, dólar más fuerte (en general)',
        body: 'Cuando la Fed sube las tasas, invertir en dólares rinde más, lo que tiende a fortalecer al dólar a nivel global. Cuando las baja, suele debilitarlo. No es una regla matemática —influyen muchos factores—, pero es la tendencia de fondo que conviene tener presente al leer noticias internacionales.',
      },
      {
        heading: 'Cómo llega eso a Uruguay',
        body: 'Un dólar global más fuerte o más débil influye en el tipo de cambio local, junto con factores propios de Uruguay (inflación, exportaciones, contexto regional, decisiones del BCU). Por eso, una noticia sobre la Fed puede anticipar movimientos, aunque el dólar en Uruguay tiene su propia dinámica de oferta y demanda.',
      },
      {
        heading: 'Qué mirar como ahorrista',
        body: 'No necesitás seguir cada reunión de la Fed para tomar buenas decisiones. Alcanza con entender el contexto, no apurarte por una sola noticia y, cuando vayas a operar, comparar el mejor precio. Seguimos estos temas a diario en nuestro blog del dólar, con foco en lo que significan para Uruguay.',
      },
    ],
  },
  {
    slug: 'proteger-ahorros-de-la-inflacion',
    title: 'Cómo proteger tus ahorros de la inflación en Uruguay',
    description:
      'Estrategias prácticas para que la inflación no licúe tus ahorros en Uruguay: dólares, Unidad Indexada, plazos fijos y diversificación.',
    tag: 'AHORRO',
    updatedAt: '2026-06-17',
    sections: [
      {
        heading: 'El enemigo silencioso: la inflación',
        body: 'Guardar pesos "bajo el colchón" implica perder poder de compra cada año por la inflación. El primer paso para protegerte es ser consciente de ese costo y buscar opciones que, al menos, mantengan el valor real de tu dinero en el tiempo.',
      },
      {
        heading: 'Dólares: refugio clásico',
        body: 'Ahorrar en dólares es la estrategia más usada en Uruguay para preservar valor frente a la pérdida del peso. Tiene sentido sobre todo si tus metas son en dólares. La contra es la menor tasa de interés y el riesgo cambiario si tus gastos son en pesos. Cuando compres, hacelo al mejor precio comparando casas de cambio.',
      },
      {
        heading: 'Unidad Indexada: ahorrar en pesos sin perder',
        body: 'Los instrumentos en Unidad Indexada (UI) ajustan su valor por la inflación, por lo que permiten ahorrar en pesos sin perder poder de compra. Son una alternativa interesante para quien no quiere asumir riesgo cambiario pero tampoco quedar expuesto a la suba de precios.',
      },
      {
        heading: 'Diversificar y usar herramientas',
        body: 'La prudencia suele estar en repartir: una parte en dólares, otra en instrumentos indexados, según tus metas y horizonte. Usá nuestra calculadora de inflación para dimensionar el impacto en el tiempo y el conversor para operar con datos. La clave es decidir con criterio, no por impulso.',
      },
    ],
  },
  {
    slug: 'comprar-dolares-online-uruguay',
    title: 'Cómo comprar dólares online en Uruguay (eBROU y plataformas)',
    description:
      'Guía para comprar y vender dólares por internet en Uruguay: plataformas como eBROU, transferencia entre cuentas, requisitos y ventajas frente al efectivo.',
    tag: 'DIGITAL',
    updatedAt: '2026-06-17',
    sections: [
      {
        heading: 'Operar dólares sin ir a la sucursal',
        body: 'Cada vez más uruguayos compran y venden dólares por internet, sin manejar efectivo ni trasladarse. Las plataformas digitales de los bancos y algunas casas de cambio permiten operar desde el celular, acreditando los fondos directamente en tu cuenta.',
      },
      {
        heading: 'eBROU y la cotización por transferencia',
        body: 'eBROU es la plataforma del Banco República para operar en línea, con cotizaciones competitivas para quienes tienen cuenta. En general, la cotización por transferencia (entre cuentas) suele ser más afinada que la del billete físico, porque no hay costos de manejo de efectivo.',
      },
      {
        heading: 'Requisitos y a tener en cuenta',
        body: 'Para operar online normalmente necesitás una cuenta habilitada en el banco o plataforma. No es un costo oculto, sino una condición de la operación. Revisá límites, horarios (el mercado se mueve en días hábiles) y si hay comisiones según el monto.',
      },
      {
        heading: 'Compará igual que con el efectivo',
        body: 'Operar online no te exime de comparar. Mirá la cotización de tu banco o plataforma frente a la de las casas de cambio relevadas en Cambio Uruguay para tu tipo de operación. Para montos altos, la diferencia puede ser significativa, así que vale la pena revisar antes de confirmar.',
      },
    ],
  },
  {
    slug: 'precio-del-oro-en-uruguay',
    title: 'Precio del oro en Uruguay: cómo se cotiza y dónde comprarlo o venderlo',
    description:
      'Cómo se forma el precio del oro en Uruguay, qué es la onza troy, cómo pasar el valor a gramos según los quilates y dónde comparar para comprar o vender al mejor precio.',
    tag: 'ORO',
    updatedAt: '2026-06-20',
    sections: [
      {
        heading: 'El oro se cotiza por onza troy, no por gramo',
        body: 'A diferencia del dólar o el euro, el oro no se mide por unidad sino por peso, y la referencia internacional es la onza troy: 31,1035 gramos de oro puro. Cuando ves un precio del oro, casi siempre es el valor de una onza troy de oro 24 quilates (oro puro). Para saber cuánto vale un gramo, hay que dividir ese precio entre 31,1035; y para joyería de 18k o 14k, ajustar además por la pureza.',
      },
      {
        heading: 'De la onza al gramo y por quilates',
        body: 'El oro 24k es oro puro. El 18k tiene un 75% de oro (18/24) y el 14k aproximadamente un 58% (14/24). Por eso un gramo de oro 18k vale alrededor de tres cuartas partes de un gramo de 24k, y el 14k bastante menos. Si vas a vender una cadena o un anillo, te conviene saber sus quilates: el precio que te paguen va a partir del valor del gramo puro ajustado por esa pureza, menos el margen de quien compra.',
      },
      {
        heading: 'Qué mueve el precio del oro',
        body: 'El precio del oro en pesos uruguayos depende de dos cosas: la cotización internacional del oro (en dólares por onza) y el tipo de cambio del dólar en Uruguay. Cuando sube el dólar o sube el oro en el mundo, sube el precio en pesos. El oro suele fortalecerse en momentos de incertidumbre económica o inflación alta, por eso se lo considera un activo de refugio.',
      },
      {
        heading: 'Dónde comprar o vender oro en Uruguay',
        body: 'En Uruguay, el Banco República y algunas casas de cambio publican precios de compra y venta del oro. Como en cualquier operación cambiaria, hay un spread entre lo que te pagan al vender y lo que te cobran al comprar, y ese margen varía de un lugar a otro. Para joyería usada, además, el comprador descuenta su costo de fundición y refinado. Comparar antes de operar es la única forma de no dejar dinero sobre la mesa.',
      },
      {
        heading: 'Cómo usar Cambio Uruguay para el oro',
        body: 'En la página de cotización del oro mostramos el precio de compra y venta por onza troy de las casas que lo publican, actualizado automáticamente, y calculamos el valor aproximado por gramo en 24k, 18k y 14k a partir del mejor precio disponible. Es un punto de partida para estimar cuánto podrías pagar o recibir, siempre teniendo en cuenta que el precio final lo define cada casa según la forma y pureza del oro.',
      },
    ],
    related: [
      { label: 'Cotización del oro hoy', to: '/cotizacion/oro' },
      { label: 'Cotización del dólar', to: '/cotizacion/dolar' },
      { label: 'Proteger ahorros de la inflación', to: '/guias/proteger-ahorros-de-la-inflacion' },
    ],
  },
  {
    slug: 'ui-ur-bpc-diferencias',
    title: 'UI, UR y BPC: qué son y en qué se diferencian',
    description:
      'Qué es la Unidad Indexada (UI), la Unidad Reajustable (UR) y la Base de Prestaciones y Contribuciones (BPC), cómo se ajusta cada una y para qué se usan en Uruguay.',
    tag: 'INDICADORES',
    updatedAt: '2026-06-20',
    sections: [
      {
        heading: 'Tres unidades que no son lo mismo',
        body: 'En Uruguay conviven varias unidades de valor que se usan para expresar montos en contratos, impuestos y prestaciones. Las tres más comunes son la Unidad Indexada (UI), la Unidad Reajustable (UR) y la Base de Prestaciones y Contribuciones (BPC). Se parecen en que ninguna es dinero contante, sino una referencia que se convierte a pesos, pero se ajustan por motivos distintos y conviene no confundirlas.',
      },
      {
        heading: 'La UI sigue a la inflación, todos los días',
        body: 'La Unidad Indexada se ajusta a diario según el Índice de Precios al Consumo (IPC), es decir, según la inflación. Su objetivo es mantener el poder de compra: un monto en UI conserva su valor real aunque pasen los años. Por eso se usa mucho en alquileres ajustados por inflación, préstamos hipotecarios, depósitos y contratos de largo plazo.',
      },
      {
        heading: 'La UR sigue a los salarios, mes a mes',
        body: 'La Unidad Reajustable se ajusta una vez al mes según el Índice Medio de Salarios. A diferencia de la UI, que sigue a los precios, la UR sigue a la evolución de los sueldos. Se utiliza sobre todo en alquileres con ajuste anual y en préstamos del Banco Hipotecario (BHU), donde interesa acompañar la capacidad de pago de las personas.',
      },
      {
        heading: 'La BPC es un valor anual del Estado',
        body: 'La Base de Prestaciones y Contribuciones se fija una vez al año, con vigencia desde el 1° de enero, por decreto. Se usa como unidad de referencia en tributos, multas, prestaciones sociales y, muy especialmente, en las franjas del IRPF, que se expresan en cantidades de BPC. Al actualizarse el valor cada año, esos montos se ajustan automáticamente sin necesidad de reescribir cada norma.',
      },
      {
        heading: 'Cómo convertirlas a pesos',
        body: 'Convertir cualquiera de estas unidades a pesos es una multiplicación: cantidad por el valor vigente de la unidad. La UI y la UR cambian seguido, así que conviene tomar el valor del día; la BPC se mantiene todo el año. En Cambio Uruguay publicamos el valor actualizado de la UI y la UR tomado del Banco Central, junto con la BPC vigente, y un conversor para pasar cualquier cantidad a pesos en segundos.',
      },
    ],
    related: [
      { label: 'Valor de la UI hoy', to: '/indicadores/unidad-indexada' },
      { label: 'Valor de la UR hoy', to: '/indicadores/unidad-reajustable' },
      { label: 'Valor de la BPC', to: '/indicadores/bpc' },
    ],
  },
  {
    slug: 'cambiar-monedas-poco-comunes-uruguay',
    title: 'Cómo cambiar monedas menos comunes en Uruguay (libra, yen, franco y más)',
    description:
      'Dónde y cómo cambiar monedas menos habituales en Uruguay como el yen, el franco suizo, el guaraní o el peso chileno: qué casas las cotizan y cómo comparar el precio.',
    tag: 'MONEDAS',
    updatedAt: '2026-06-20',
    sections: [
      {
        heading: 'No solo de dólares vive el cambio',
        body: 'El dólar, el euro, el real y el peso argentino concentran la mayoría de las operaciones en Uruguay, pero no son las únicas monedas que se pueden cambiar. Para viajes, estudios, negocios o herencias también aparece la necesidad de operar yenes, francos suizos, guaraníes, pesos chilenos o dólares canadienses, entre otras. La oferta es más acotada, así que saber dónde buscar marca la diferencia.',
      },
      {
        heading: 'Por qué hay menos oferta y más spread',
        body: 'Cuanto menos se opera una moneda, menos casas la cotizan y mayor suele ser el spread entre compra y venta. Es lógico: manejar una divisa con poca demanda implica más costo y riesgo para la casa de cambio. Por eso, con monedas poco comunes conviene comparar especialmente bien y, si el monto es importante, llamar antes para confirmar disponibilidad de efectivo.',
      },
      {
        heading: 'Monedas de la región: guaraní y peso chileno',
        body: 'El guaraní paraguayo y el peso chileno tienen demanda sobre todo por turismo y comercio de frontera. Ambos tienen un valor unitario bajo frente al peso uruguayo, así que sus cotizaciones se expresan con varios decimales y conviene mirarlas con atención al cambiar montos grandes. Cerca de la frontera suele haber más oferta que en el resto del país.',
      },
      {
        heading: 'Monedas internacionales: yen, franco y dólares de otros países',
        body: 'El yen japonés, el franco suizo, el dólar canadiense y el dólar australiano aparecen sobre todo por viajes, estudios o inmigración. El franco suizo, además, es visto como moneda refugio. No todas las casas las ofrecen, pero algunas plazas grandes sí; revisar dónde están disponibles evita recorrer la ciudad sin éxito.',
      },
      {
        heading: 'Compará antes de operar',
        body: 'Para cada una de estas monedas, en Cambio Uruguay podés ver qué casas de cambio la cotizan y a qué precio de compra y venta, actualizado automáticamente. Aunque haya pocas opciones, comparar te dice rápido dónde te conviene operar y te evita aceptar el primer precio que encontrás, que no siempre es el mejor.',
      },
    ],
    related: [
      { label: 'Todas las cotizaciones', to: '/cotizacion' },
      { label: 'Cotización del yen', to: '/cotizacion/yen' },
      { label: 'Cotización del franco suizo', to: '/cotizacion/franco-suizo' },
      { label: 'Cotización del guaraní', to: '/cotizacion/guarani' },
    ],
  },
] as const

/**
 * Look up a guide by its slug.
 *
 * @returns the matching {@link Guide}, or `undefined` when no guide has that slug.
 */
export function getGuide(slug: string): Guide | undefined {
  return guides.find(guide => guide.slug === slug)
}

/** Every guide slug, in catalogue order. Used by the route guard and sitemap. */
export function guideSlugs(): string[] {
  return guides.map(guide => guide.slug)
}
