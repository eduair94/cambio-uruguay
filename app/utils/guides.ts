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
