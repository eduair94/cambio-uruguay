// Content + helpers for the tourist-facing "where to withdraw cash in Uruguay"
// landing page (`pages/retirar-efectivo-uruguay.vue`).
//
// This module is PURE (no Vue/Nuxt runtime, no global state, relative imports
// only) so it can be unit-tested in plain Node via vitest and reused by the
// page and the route without duplicating the catalogue or the lookup logic.
//
// Unlike the editorial guides (Spanish-only), this page targets foreign
// TOURISTS, so the whole content tree is translated for es/en/pt and selected by
// the active UI locale. Keeping all three variants side by side in one typed
// module (rather than scattering 100+ keys across the shared i18n JSON files)
// makes locale parity auditable and unit-testable, and keeps the page thin.
//
// Facts are grounded in web research dated {@link LAST_RESEARCHED}. Figures that
// drift (per-transaction caps, fees, the seasonal IVA window) are deliberately
// soft-framed in the copy ("approximate", "confirm on arrival", "last checked")
// rather than stated as hard guarantees.

/** The three supported UI locales. */
export type WithdrawLocale = 'es' | 'en' | 'pt'

/** Date (YYYY-MM-DD) the facts on this page were last verified against sources. */
export const LAST_RESEARCHED = '2026-06-21'

/** App-relative path of the page; same slug for every locale (i18n prefixes en/pt). */
export const WITHDRAW_PATH = '/retirar-efectivo-uruguay'

/** A titled prose section: one or more paragraphs plus optional bullet points. */
export interface WithdrawSection {
  /** Stable id, used as the `<h2>` anchor and the `:key`. */
  id: string
  /** Section heading, rendered as an `<h2>`. */
  heading: string
  /** Body paragraphs (each a `<p>`). */
  paragraphs: string[]
  /** Optional bullet list rendered under the paragraphs. */
  bullets?: string[]
}

/** A row of the ATM-network comparison table. */
export interface WithdrawNetworkRow {
  /** Network name (proper noun, not translated). */
  network: string
  /** Coverage / reach description. */
  reach: string
  /** Approximate USD per-transaction cap for foreign cards. */
  usdPerTxn: string
  /** Approximate UYU per-transaction cap for foreign cards. */
  uyuPerTxn: string
  /** Short practical note. */
  note: string
}

/** A curated withdrawal/exchange zone (landmark level, no exact addresses). */
export interface WithdrawZone {
  /** Stable id / `:key`. */
  id: string
  /** Material Design Icon name. */
  icon: string
  /** Zone name (e.g. "Carrasco Airport (MVD)"). */
  name: string
  /** One- or two-sentence summary of where/what. */
  summary: string
  /** Practical bullet tips for the zone. */
  tips: string[]
}

/** One step of the "how to withdraw" HowTo (also emitted as HowToStep JSON-LD). */
export interface WithdrawStep {
  /** Short imperative step name. */
  name: string
  /** One-sentence explanation. */
  text: string
}

/** A FAQ entry (also emitted as a Question in FAQPage JSON-LD). */
export interface WithdrawFaq {
  /** Question. */
  q: string
  /** Answer (plain prose). */
  a: string
}

/** A related internal link rendered at the foot of the page. */
export interface WithdrawLink {
  /** Visible label. */
  label: string
  /** App-relative path (passed through `localePath`). */
  to: string
}

/** UI chrome strings (labels, buttons, table headers) for one locale. */
export interface WithdrawUi {
  backToTools: string
  tldrTitle: string
  networksTitle: string
  tableNetwork: string
  tableReach: string
  tableUsd: string
  tableUyu: string
  tableNote: string
  zonesTitle: string
  zonesIntro: string
  stepsTitle: string
  faqTitle: string
  sourcesTitle: string
  relatedTitle: string
  ctaTitle: string
  ctaText: string
  ctaButton: string
  disclaimer: string
  lastChecked: string
}

/**
 * Localized labels for the live "IVA status as of today" block, composed in the
 * page from {@link resolveIvaStatus}. Placeholders: `{date}`, `{points}`, `{end}`.
 */
export interface WithdrawIvaLive {
  /** Block heading, e.g. "Estado al día de hoy". */
  heading: string
  /** Dated subline, with `{date}` placeholder. */
  asOf: string
  /** Lodging line (static). */
  hotel: string
  /** Base reduction line, with `{points}` placeholder. */
  base: string
  /** Seasonal exemption ACTIVE line, with `{end}` placeholder. */
  seasonalOn: string
  /** Seasonal exemption INACTIVE line. */
  seasonalOff: string
}

/** The complete, localized content tree for one locale. */
export interface WithdrawContent {
  locale: WithdrawLocale
  /** BCP-47 language tag for `inLanguage` / `<html lang>`. */
  lang: string
  /** H1 / document title. */
  title: string
  /** `<title>` (without the " | Cambio Uruguay" suffix the page appends). */
  metaTitle: string
  /** Meta description + hero lead. */
  description: string
  /** Comma-separated meta keywords. */
  keywords: string
  /** Quick-answer bullets shown in the hero TL;DR card. */
  tldr: string[]
  /** UI chrome strings. */
  ui: WithdrawUi
  /** Live "IVA status today" labels (composed from the date-driven resolver). */
  ivaLive: WithdrawIvaLive
  /** Intro/explanatory prose sections (networks, USD vs pesos, fees, etc.). */
  sections: WithdrawSection[]
  /** ATM-network comparison rows. */
  networkRows: WithdrawNetworkRow[]
  /** Curated tourist-zone directory. */
  zones: WithdrawZone[]
  /** Step-by-step (HowTo). */
  steps: WithdrawStep[]
  /** Frequently asked questions. */
  faq: WithdrawFaq[]
  /** Related internal links. */
  related: WithdrawLink[]
}

/**
 * Sources are language-neutral (URLs + mostly proper-noun labels), so they are
 * shared across locales instead of triplicated. Rendered in the "Sources" card.
 */
export const WITHDRAW_SOURCES: readonly WithdrawLink[] = [
  {
    label: 'Guru’Guay — ATM problems & exchanging money in Uruguay',
    to: 'https://www.guruguay.com/atm-problems-uruguay/',
  },
  {
    label: 'BROU — Cajeros automáticos (RedBROU)',
    to: 'https://www.brou.com.uy/personas/servicios/cajeros-automaticos',
  },
  { label: 'Banred — Red de cajeros', to: 'https://www.banred.com.uy/institu/' },
  {
    label: 'BCU — Registro de casas de cambio autorizadas',
    to: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/casas_cambio.aspx',
  },
  {
    label: 'Aeropuerto de Carrasco — Servicios (casas de cambio)',
    to: 'https://aeropuertodecarrasco.com.uy/en/services/',
  },
  {
    label: 'Ministerio de Turismo — Beneficios para no residentes (IVA)',
    to: 'https://www.gub.uy/ministerio-turismo/comunicacion/comunicados/beneficios-para-no-residentes',
  },
  {
    label: 'DGI — Reducción de 9 puntos de IVA en servicios turísticos',
    to: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/reduccion-9-puntos-iva-determinados-servicios-siempre-sean-abonados',
  },
] as const

/** The full localized content, keyed by locale. */
export const withdrawContent: Record<WithdrawLocale, WithdrawContent> = {
  // ─────────────────────────────────────────────────────────────────────────
  // Spanish (default locale)
  // ─────────────────────────────────────────────────────────────────────────
  es: {
    locale: 'es',
    lang: 'es-UY',
    title: 'Dónde sacar efectivo en Uruguay: cajeros, comisiones y zonas turísticas',
    metaTitle: 'Dónde sacar efectivo en Uruguay (guía para turistas 2026)',
    description:
      'Cómo y dónde retirar efectivo en Uruguay siendo turista: cajeros que dan dólares y pesos, comisiones, límites, el truco de la conversión de moneda (DCC) y los mejores lugares para sacar plata en el aeropuerto, Montevideo, Punta del Este y Colonia.',
    keywords:
      'sacar efectivo uruguay, retirar dinero uruguay, cajeros uruguay turistas, cajero automático dólares uruguay, ATM uruguay, casas de cambio uruguay, comisión cajero uruguay, retirar dólares uruguay',
    tldr: [
      'Los cajeros uruguayos entregan dólares y pesos: una ventaja rara en la región (en Argentina casi no se consigue).',
      'Hay dos redes: RedBROU y Banred. Si una falla, probá con la otra; llevá una Visa y una Mastercard.',
      'Cuando el cajero ofrezca cobrarte en tu moneda, elegí siempre la moneda local: la “conversión” esconde un mal tipo de cambio.',
      'Evitá cambiar grandes sumas en el aeropuerto o las terminales de ferry: pagan bastante menos.',
      'Pagá hoteles y restaurantes con tarjeta extranjera: además del beneficio de IVA, evitás cargar tanto efectivo.',
    ],
    ui: {
      backToTools: 'Herramientas',
      tldrTitle: 'En resumen',
      networksTitle: 'Las dos redes de cajeros: RedBROU y Banred',
      tableNetwork: 'Red',
      tableReach: 'Cobertura',
      tableUsd: 'Tope US$ / operación',
      tableUyu: 'Tope $U / operación',
      tableNote: 'Notas',
      zonesTitle: 'Dónde sacar efectivo según la zona turística',
      zonesIntro:
        'Referencias a nivel de zona y puntos conocidos (no direcciones exactas, que cambian). Los cajeros suelen estar dentro de bancos, shoppings o locales de Abitab y Redpagos.',
      stepsTitle: 'Cómo sacar efectivo, paso a paso',
      faqTitle: 'Preguntas frecuentes',
      sourcesTitle: 'Fuentes y referencias',
      relatedTitle: 'Seguí leyendo',
      ctaTitle: 'Compará antes de cambiar',
      ctaText:
        'Mirá la cotización del dólar en más de 40 casas de cambio actualizada cada 10 minutos y elegí dónde te conviene operar.',
      ctaButton: 'Ver el comparador',
      disclaimer:
        'Información de referencia para turistas, no asesoramiento financiero. Las comisiones, los límites y los beneficios impositivos cambian: confirmalos al llegar y con el emisor de tu tarjeta. No tenemos afiliación con los bancos ni las casas de cambio mencionadas.',
      lastChecked: 'Última verificación: junio de 2026',
    },
    ivaLive: {
      heading: 'Beneficios de IVA vigentes hoy',
      asOf: 'Estado al {date}:',
      hotel: 'Alojamiento (hoteles y similares): 0% de IVA todo el año.',
      base: 'Gastronomía y alquiler de autos: descuento de {points} puntos de IVA pagando con tarjeta extranjera.',
      seasonalOn: 'Exención total de IVA de verano: VIGENTE (hasta el {end}).',
      seasonalOff:
        'Exención total de IVA de verano: fuera de temporada en este momento (rige aproximadamente de noviembre a abril).',
    },
    sections: [
      {
        id: 'redes',
        heading: 'Las dos redes de cajeros: RedBROU y Banred',
        paragraphs: [
          'En Uruguay conviven dos redes de cajeros automáticos: RedBROU, la del banco estatal (BROU), y Banred, la que agrupa a los bancos privados. Las dos están interconectadas y enlazan con las redes internacionales (Cirrus/Maestro de Mastercard y Plus de Visa), así que una tarjeta extranjera funciona en ambas.',
          'Para asegurarte de que un cajero acepta tu tarjeta, buscá los logos de Visa, Mastercard, Cirrus, Plus o Maestro en la máquina. Como dato práctico: llevá una Visa y una Mastercard de cuentas distintas; si una tarjeta o un cajero falla, probás con la otra red.',
        ],
      },
      {
        id: 'dolares-o-pesos',
        heading: '¿Dólares o pesos? En Uruguay podés sacar las dos',
        paragraphs: [
          'A diferencia de Argentina, muchos cajeros en Uruguay entregan dólares además de pesos uruguayos. Es una ventaja concreta si querés dólares en efectivo sin pasar por una casa de cambio. Los dólares suelen salir en billetes de US$ 100, lo que, sumado a los topes por operación, puede significar que retires un solo billete por vez.',
          'Regla simple: sacá pesos para el gasto diario (taxis, ferias, comercios chicos) y dólares solo si realmente los necesitás en efectivo. Para la mayoría de los pagos grandes conviene la tarjeta, no el efectivo.',
        ],
      },
      {
        id: 'comisiones-limites',
        heading: 'Comisiones y límites de retiro',
        paragraphs: [
          'El recargo que cobra el cajero uruguayo por usar una tarjeta extranjera es bajo en comparación con otros países (del orden de unos pocos dólares por operación). El costo más importante suele ser el de tu propio banco: la comisión por transacción en el exterior (habitualmente entre 1% y 3%) más, a veces, un cargo fijo por retiro internacional. Una tarjeta de viaje sin comisión de cambio te ahorra casi todo eso.',
          'Los topes por operación para tarjetas extranjeras los fijan las redes locales, no tu banco, y son bajos. Tu banco, además, te pone un límite diario propio. Conviene llamar a tu banco antes de viajar para subir el límite y retirar el máximo por operación para repartir el costo fijo entre más plata.',
        ],
        bullets: [
          'Recargo local por retiro: aproximado, del orden de unos pocos dólares (verificá en pantalla antes de confirmar).',
          'Comisión de tu banco/emisor: suele ser el costo mayor; revisá si tu tarjeta cobra “foreign transaction fee”.',
          'Tope por operación: ronda US$ 200–300 o $U 5.000 según la red (aproximado, puede cambiar).',
          'Límite diario: lo define tu banco; avisá antes de viajar para ampliarlo.',
        ],
      },
      {
        id: 'dcc',
        heading: 'El truco de la conversión de moneda (DCC): elegí siempre moneda local',
        paragraphs: [
          'Muchos cajeros y datáfonos te ofrecen “cobrar en tu moneda de origen” en lugar de en pesos o dólares uruguayos. Suena cómodo (“mirá cuánto es en tu moneda”), pero esa conversión dinámica (DCC) aplica un tipo de cambio inflado más un cargo escondido. Casi siempre salís perdiendo.',
          'Elegí siempre “sin conversión” o la moneda local: pesos uruguayos cuando saques pesos, dólares cuando saques dólares. Dejá que tu propio banco haga el cambio, que suele dar mejor cotización.',
        ],
      },
      {
        id: 'casas-de-cambio',
        heading: 'Casas de cambio, cajeros o bancos: ¿qué conviene?',
        paragraphs: [
          'Las casas de cambio (Varlix, Indumex, Gales, Aspen, Cambio Sir, Cambio Inglés y Global Exchange, entre otras) son la opción clásica para cambiar efectivo. Dan los mejores tipos para el dólar, con un margen muy chico y sin comisión; el euro es la segunda mejor moneda, el real es aceptable y el peso argentino, la peor. Suelen pedirte el pasaporte para operar.',
          'Horarios: las sucursales de calle abren de lunes a viernes (alrededor de 9 a 19) y los sábados de mañana; muchas cierran los domingos. Las que están dentro de shoppings abren todos los días y hasta más tarde. Para comparar la cotización del día entre casas, podés usar nuestro comparador y la página de sucursales.',
        ],
      },
      {
        id: 'cuanto-efectivo',
        heading: 'Cuánto efectivo llevar y qué moneda traer',
        paragraphs: [
          'Uruguay es muy amigable con las tarjetas: Visa y Mastercard se aceptan en casi todos lados, con contactless y pagos por QR (Mercado Pago) muy extendidos. Llevá solo algo de efectivo en pesos para gastos chicos y pagá lo grande con tarjeta.',
          'Si traés efectivo para cambiar, el dólar es la mejor moneda (mejores tipos y aceptado en todas las casas). El euro va segundo. Si venís de Argentina, traé dólares, no pesos argentinos: el peso argentino se cambia muy mal en Uruguay. Desde Brasil, el real funciona, sobre todo cerca de la frontera, aunque el dólar sigue siendo más conveniente.',
        ],
      },
      {
        id: 'iva-turistas',
        heading: 'Beneficio de IVA para turistas (pagando con tarjeta extranjera)',
        paragraphs: [
          'Uruguay devuelve parte del IVA a los turistas no residentes que pagan con una tarjeta emitida en el exterior. El alojamiento (hoteles y similares registrados) tiene 0% de IVA todo el año para no residentes que muestran documento extranjero y pagan con tarjeta extranjera: es un beneficio permanente.',
          'En gastronomía (restaurantes, bares, cafés) y alquiler de autos sin chofer hay una reducción de IVA durante todo el año al pagar por medios electrónicos. A esto se suma, en temporada de verano (aproximadamente de noviembre a abril), una exención total del IVA que el gobierno renueva cada año por decreto. Como esa exención estacional se vence y se vuelve a dictar, conviene confirmar las fechas vigentes antes de tu viaje.',
          'En todos los casos, el descuento se aplica solo: pagás con tu tarjeta extranjera y el beneficio aparece en el ticket o en el resumen de tu tarjeta. Si pagás en efectivo, lo perdés. Por eso conviene pagar hoteles y restaurantes con tarjeta y sacar menos efectivo.',
        ],
        bullets: [
          'Hoteles/alojamiento: 0% de IVA todo el año para no residentes (permanente).',
          'Restaurantes y alquiler de autos: descuento de IVA todo el año pagando con tarjeta; exención total adicional en temporada de verano (renovable, confirmá las fechas).',
          'Siempre con tarjeta extranjera y documento de no residente. En efectivo no aplica.',
        ],
      },
      {
        id: 'seguridad',
        heading: 'Consejos de seguridad al sacar efectivo',
        paragraphs: [
          'Uruguay es de los países más seguros de la región, pero el hurto existe, sobre todo en la Ciudad Vieja de Montevideo, la zona del puerto y los balnearios en temporada alta. Usá cajeros dentro de bancos, shoppings o galerías con vidrio, preferentemente de día, y prestá atención a tu alrededor.',
        ],
        bullets: [
          'Sacá efectivo de día y en cajeros dentro de locales cerrados, no en la calle de noche.',
          'Llevá dos tarjetas de cuentas distintas y guardá el efectivo en más de un lugar.',
          'Pedí billetes chicos (100, 200, 500): los de 1.000 y 2.000 cuestan de cambiar.',
          'Para moverte, usá Uber, Cabify o taxis registrados; evitá dejar valores en el auto.',
        ],
      },
    ],
    networkRows: [
      {
        network: 'RedBROU',
        reach: 'Red del banco estatal BROU; 400+ cajeros en todo el país, más Abitab y Redpagos.',
        usdPerTxn: '≈ US$ 200',
        uyuPerTxn: '≈ $U 5.000',
        note: 'Muchos cajeros entregan dólares. Topes aproximados para tarjetas extranjeras.',
      },
      {
        network: 'Banred',
        reach: 'Red de los bancos privados; 370+ puntos en los 19 departamentos.',
        usdPerTxn: '≈ US$ 300',
        uyuPerTxn: '≈ $U 5.000',
        note: 'Interconectada con RedBROU. Si una red rechaza tu tarjeta, probá la otra.',
      },
    ],
    zones: [
      {
        id: 'aeropuerto',
        icon: 'mdi-airplane',
        name: 'Aeropuerto de Carrasco (MVD), Montevideo',
        summary:
          'Casas de cambio Global Exchange abiertas las 24 horas, cajeros en la terminal (Santander confirmado) y una sucursal bancaria.',
        tips: [
          'El cambio en el aeropuerto paga bastante menos: cambiá solo lo justo para llegar a la ciudad.',
          'Si necesitás efectivo ya, sacá un monto chico en el cajero y cambiá el resto en el centro.',
        ],
      },
      {
        id: 'montevideo',
        icon: 'mdi-city',
        name: 'Montevideo (Centro, Ciudad Vieja y puerto)',
        summary:
          'Las casas de cambio se concentran en la Avenida 18 de Julio (Centro) y en la Ciudad Vieja. La terminal de cruceros está pegada a la Ciudad Vieja, con cambio y cajeros.',
        tips: [
          'En el Centro y la Ciudad Vieja vas a encontrar varias casas de cambio para comparar.',
          'Los cruceristas tienen cambio dentro del puerto y cajeros a pocos pasos, camino al Mercado del Puerto.',
        ],
      },
      {
        id: 'punta-del-este',
        icon: 'mdi-beach',
        name: 'Punta del Este',
        summary:
          'Casas de cambio sobre la Avenida Gorlero, la calle principal. En temporada alta puede haber colas y faltante de dólares en los cajeros.',
        tips: [
          'En verano y Semana Santa, los cajeros se vacían rápido: retirá con anticipación y llevá un margen.',
          'Apoyate en la tarjeta y el pago por QR para no depender solo del efectivo.',
        ],
      },
      {
        id: 'colonia',
        icon: 'mdi-castle',
        name: 'Colonia del Sacramento',
        summary:
          'Cajeros en el Barrio Histórico y en la terminal de ferris, a metros del casco antiguo donde llegan los visitantes desde Buenos Aires.',
        tips: [
          'Sacá un monto chico de pesos al llegar y pagá lo demás con tarjeta.',
          'Muchos comercios turísticos aceptan dólares, aunque a un tipo de cambio poco conveniente.',
        ],
      },
      {
        id: 'ferries',
        icon: 'mdi-ferry',
        name: 'Terminales de ferry (Buquebus / Colonia Express)',
        summary:
          'Hay cajeros en las terminales de Montevideo y Colonia. El cambio dentro de terminales y a bordo suele tener tipos pobres.',
        tips: [
          'Evitá cambiar sumas grandes en la terminal o a bordo: los tipos son malos.',
          'Mejor sacá en un cajero o cambiá en una casa de cambio de la ciudad.',
        ],
      },
      {
        id: 'interior',
        icon: 'mdi-map-marker-radius',
        name: 'Interior y pueblos chicos',
        summary:
          'Fuera de las ciudades grandes y los balnearios principales, los cajeros escasean.',
        tips: [
          'Cargá efectivo en Montevideo, Punta del Este o Colonia antes de salir al interior.',
          'En la costa de Rocha, abastecete en pueblos más grandes como Chuy o La Paloma.',
        ],
      },
    ],
    steps: [
      {
        name: 'Buscá un cajero que acepte tu tarjeta',
        text: 'Fijate los logos de Visa, Mastercard, Cirrus, Plus o Maestro; elegí cajeros dentro de bancos o shoppings.',
      },
      {
        name: 'Elegí dólares o pesos',
        text: 'Sacá pesos para el gasto diario y dólares solo si los necesitás en efectivo; los dólares salen en billetes de US$ 100.',
      },
      {
        name: 'Rechazá la conversión a tu moneda',
        text: 'Cuando ofrezca cobrarte en tu moneda de origen, elegí “sin conversión” o moneda local para evitar el sobrecosto del DCC.',
      },
      {
        name: 'Retirá el máximo por operación',
        text: 'Como hay un cargo fijo por retiro, conviene sacar el tope permitido para repartir el costo entre más plata.',
      },
      {
        name: 'Guardá el comprobante y contá el efectivo',
        text: 'Verificá el monto entregado, guardá el ticket y repartí el efectivo en más de un lugar antes de salir del cajero.',
      },
    ],
    faq: [
      {
        q: '¿Puedo sacar dólares de los cajeros en Uruguay?',
        a: 'Sí. A diferencia de Argentina, muchos cajeros uruguayos entregan dólares además de pesos, normalmente en billetes de US$ 100. Los topes por operación para tarjetas extranjeras son bajos.',
      },
      {
        q: '¿Cuánto cobran de comisión los cajeros a tarjetas extranjeras?',
        a: 'El recargo local es bajo (del orden de unos pocos dólares por retiro). El costo mayor suele ser la comisión que cobra tu propio banco por operar en el exterior (entre 1% y 3% es habitual).',
      },
      {
        q: '¿Cuál es el máximo que puedo retirar por operación?',
        a: 'Aproximadamente US$ 200–300 o $U 5.000 por operación según la red (RedBROU o Banred). Tu banco, además, fija un límite diario propio. Conviene avisarle antes de viajar.',
      },
      {
        q: '¿Conviene cambiar dinero en el aeropuerto?',
        a: 'No para sumas grandes: el aeropuerto y las terminales de ferry pagan bastante menos. Cambiá lo justo para llegar a la ciudad y operá después en una casa de cambio o cajero del centro.',
      },
      {
        q: '¿Efectivo o tarjeta en Uruguay?',
        a: 'Uruguay es muy amigable con las tarjetas (Visa y Mastercard casi en todos lados, contactless y QR). Llevá algo de efectivo en pesos para gastos chicos y pagá lo grande con tarjeta.',
      },
      {
        q: '¿Qué moneda me conviene traer?',
        a: 'Dólares en efectivo: dan los mejores tipos y se cambian en todas las casas. El euro va segundo. Si venís de Argentina, traé dólares, no pesos argentinos.',
      },
      {
        q: '¿Tengo algún descuento de impuestos como turista?',
        a: 'Sí, pagando con tarjeta extranjera: 0% de IVA en alojamiento todo el año y una reducción de IVA en gastronomía y alquiler de autos (con una exención total adicional en temporada de verano, que se renueva por decreto). En efectivo no aplica.',
      },
      {
        q: '¿Qué hago si el cajero rechaza mi tarjeta?',
        a: 'Probá con otra tarjeta y con la otra red (RedBROU y Banred están interconectadas pero conviene tener ambas). Verificá que el cajero muestre los logos Visa/Mastercard/Cirrus/Plus y avisá a tu banco que vas a operar desde Uruguay.',
      },
    ],
    related: [
      { label: 'Dólares para viajar', to: '/guias/dolares-para-viajar' },
      { label: 'Comprar dólares al mejor precio', to: '/guias/comprar-dolares-mejor-precio' },
      { label: 'Casas de cambio y sucursales', to: '/sucursales' },
      { label: 'Comparar cotizaciones', to: '/comparar' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // English
  // ─────────────────────────────────────────────────────────────────────────
  en: {
    locale: 'en',
    lang: 'en-US',
    title: 'Where to withdraw cash in Uruguay: ATMs, fees and tourist hotspots',
    metaTitle: 'Where to withdraw cash in Uruguay (2026 tourist guide)',
    description:
      'How and where to get cash in Uruguay as a tourist: ATMs that dispense both US dollars and pesos, fees, withdrawal limits, the currency-conversion (DCC) trap, and the best places to withdraw at the airport, Montevideo, Punta del Este and Colonia.',
    keywords:
      'withdraw cash uruguay, withdraw money uruguay, ATM uruguay tourist, dollars from ATM uruguay, exchange money uruguay, ATM fees uruguay, casas de cambio uruguay',
    tldr: [
      'Uruguayan ATMs dispense both US dollars and pesos — a rare regional advantage (in Argentina it is nearly impossible).',
      'There are two networks: RedBROU and Banred. If one fails, try the other; carry both a Visa and a Mastercard.',
      'When the ATM offers to charge you in your home currency, always pick the local currency: the "conversion" hides a bad exchange rate.',
      'Avoid changing large sums at the airport or ferry terminals — their rates are noticeably worse.',
      'Pay hotels and restaurants with a foreign card: besides the VAT benefit, you carry less cash.',
    ],
    ui: {
      backToTools: 'Tools',
      tldrTitle: 'In short',
      networksTitle: 'The two ATM networks: RedBROU and Banred',
      tableNetwork: 'Network',
      tableReach: 'Coverage',
      tableUsd: 'Cap US$ / withdrawal',
      tableUyu: 'Cap $U / withdrawal',
      tableNote: 'Notes',
      zonesTitle: 'Where to get cash by tourist zone',
      zonesIntro:
        'Zone- and landmark-level references (not exact addresses, which change). ATMs are usually inside banks, malls, or Abitab and Redpagos outlets.',
      stepsTitle: 'How to withdraw cash, step by step',
      faqTitle: 'Frequently asked questions',
      sourcesTitle: 'Sources & references',
      relatedTitle: 'Keep reading',
      ctaTitle: 'Compare before you exchange',
      ctaText:
        'See the dollar rate across 40+ exchange houses, updated every 10 minutes, and pick the best place to operate.',
      ctaButton: 'Open the comparator',
      disclaimer:
        'Reference information for tourists, not financial advice. Fees, limits and tax benefits change: confirm them on arrival and with your card issuer. We are not affiliated with the banks or exchange houses mentioned.',
      lastChecked: 'Last checked: June 2026',
    },
    ivaLive: {
      heading: 'Tourist VAT benefits in force today',
      asOf: 'Status as of {date}:',
      hotel: 'Accommodation (hotels and similar): 0% VAT year-round.',
      base: 'Dining and car rental: a {points}-point VAT discount when you pay with a foreign card.',
      seasonalOn: 'Summer full VAT exemption: ACTIVE (until {end}).',
      seasonalOff:
        'Summer full VAT exemption: out of season right now (runs roughly November to April).',
    },
    sections: [
      {
        id: 'redes',
        heading: 'The two ATM networks: RedBROU and Banred',
        paragraphs: [
          'Uruguay has two ATM networks: RedBROU, run by the state bank (BROU), and Banred, the network of the private banks. The two are interconnected and link to the international networks (Mastercard’s Cirrus/Maestro and Visa’s Plus), so a foreign card works on both.',
          'To make sure an ATM takes your card, look for the Visa, Mastercard, Cirrus, Plus or Maestro logos on the machine. Practical tip: carry a Visa and a Mastercard from different accounts; if one card or machine fails, try the other network.',
        ],
      },
      {
        id: 'dolares-o-pesos',
        heading: 'Dollars or pesos? In Uruguay you can take both',
        paragraphs: [
          'Unlike Argentina, many ATMs in Uruguay dispense US dollars as well as Uruguayan pesos. That is a real advantage if you want cash dollars without going to an exchange house. Dollars usually come out in US$ 100 bills which, combined with the per-withdrawal caps, can mean you only get a single note at a time.',
          'Simple rule: take pesos for day-to-day spending (taxis, markets, small shops) and dollars only if you genuinely need them in cash. For most larger payments a card beats cash.',
        ],
      },
      {
        id: 'comisiones-limites',
        heading: 'Fees and withdrawal limits',
        paragraphs: [
          'The surcharge a Uruguayan ATM charges a foreign card is low compared with many countries (on the order of a few dollars per withdrawal). The bigger cost is usually your own bank: the foreign-transaction fee (typically 1–3%) plus sometimes a flat international-withdrawal charge. A travel card with no FX fee saves you almost all of that.',
          'Per-withdrawal caps for foreign cards are set by the local networks, not your bank, and they are low. Your bank also applies its own daily limit. Call your bank before traveling to raise the limit, and withdraw the maximum per transaction to spread the fixed fee over more cash.',
        ],
        bullets: [
          'Local withdrawal surcharge: approximate, on the order of a few dollars (check the on-screen amount before confirming).',
          'Your bank/issuer fee: usually the bigger cost; check whether your card charges a foreign-transaction fee.',
          'Per-withdrawal cap: around US$ 200–300 or $U 5,000 depending on the network (approximate, may change).',
          'Daily limit: set by your bank; notify it before traveling to raise it.',
        ],
      },
      {
        id: 'dcc',
        heading: 'The currency-conversion (DCC) trap: always pick local currency',
        paragraphs: [
          'Many ATMs and card terminals offer to "charge in your home currency" instead of in Uruguayan pesos or dollars. It sounds convenient ("see how much it is in your money"), but that dynamic currency conversion (DCC) applies an inflated exchange rate plus a hidden fee. You almost always lose.',
          'Always choose "without conversion" or the local currency: Uruguayan pesos when you take pesos, dollars when you take dollars. Let your own bank do the conversion — its rate is usually better.',
        ],
      },
      {
        id: 'casas-de-cambio',
        heading: 'Exchange houses, ATMs or banks: which is best?',
        paragraphs: [
          'Exchange houses (casas de cambio such as Varlix, Indumex, Gales, Aspen, Cambio Sir, Cambio Inglés and Global Exchange) are the classic way to change cash. They give the best rates for the dollar, with a tiny spread and no commission; the euro is the second-best currency, the Brazilian real is acceptable, and the Argentine peso is the worst. They usually ask for your passport.',
          'Hours: street branches open Monday to Friday (around 9 to 19) and Saturday mornings; many close on Sundays. Branches inside malls open every day and later. To compare the day’s rate across houses, use our comparator and the branches page.',
        ],
      },
      {
        id: 'cuanto-efectivo',
        heading: 'How much cash to carry and which currency to bring',
        paragraphs: [
          'Uruguay is very card-friendly: Visa and Mastercard are accepted almost everywhere, with contactless and QR payments (Mercado Pago) widespread. Carry only some pesos in cash for small purchases and pay larger amounts by card.',
          'If you bring cash to change, the US dollar is the best currency (best rates, accepted at every house). The euro is second. Coming from Argentina, bring dollars, not Argentine pesos — the peso changes very poorly in Uruguay. From Brazil, the real works, especially near the border, though dollars are still more convenient.',
        ],
      },
      {
        id: 'iva-turistas',
        heading: 'Tourist VAT benefit (when you pay with a foreign card)',
        paragraphs: [
          'Uruguay refunds part of the VAT to non-resident tourists who pay with a foreign-issued card. Accommodation (registered hotels and similar) is 0% VAT year-round for non-residents who show a foreign ID and pay with a foreign card — a permanent benefit.',
          'For dining (restaurants, bars, cafés) and car rental without a driver there is a VAT reduction year-round when you pay electronically. On top of that, during the summer season (roughly November to April) the government renews, by decree, a full VAT exemption each year. Because that seasonal exemption lapses and is re-issued, confirm the dates in force before your trip.',
          'In every case the discount is automatic: you pay with your foreign card and the benefit shows up on the receipt or your card statement. Pay in cash and you lose it. So it pays to put hotels and restaurants on a card and withdraw less cash.',
        ],
        bullets: [
          'Hotels/accommodation: 0% VAT year-round for non-residents (permanent).',
          'Restaurants and car rental: VAT discount year-round when paying by card; an additional full exemption in the summer season (renewable — confirm the dates).',
          'Always with a foreign card and a non-resident ID. Cash does not qualify.',
        ],
      },
      {
        id: 'seguridad',
        heading: 'Safety tips when withdrawing cash',
        paragraphs: [
          'Uruguay is among the safest countries in the region, but petty theft exists, especially in Montevideo’s Ciudad Vieja, the port area, and the beach resorts in high season. Use ATMs inside banks, malls or glass lobbies, preferably in daylight, and stay aware of your surroundings.',
        ],
        bullets: [
          'Withdraw in daylight and from ATMs inside enclosed premises, not on the street at night.',
          'Carry two cards from different accounts and keep cash in more than one place.',
          'Ask for small bills (100, 200, 500): 1,000 and 2,000 notes are hard to break.',
          'Get around with Uber, Cabify or registered taxis; don’t leave valuables in the car.',
        ],
      },
    ],
    networkRows: [
      {
        network: 'RedBROU',
        reach: 'State bank BROU’s network; 400+ ATMs nationwide, plus Abitab and Redpagos.',
        usdPerTxn: '≈ US$ 200',
        uyuPerTxn: '≈ $U 5,000',
        note: 'Many machines dispense dollars. Caps are approximate for foreign cards.',
      },
      {
        network: 'Banred',
        reach: 'Private banks’ network; 370+ points across all 19 departments.',
        usdPerTxn: '≈ US$ 300',
        uyuPerTxn: '≈ $U 5,000',
        note: 'Interconnected with RedBROU. If one network rejects your card, try the other.',
      },
    ],
    zones: [
      {
        id: 'aeropuerto',
        icon: 'mdi-airplane',
        name: 'Carrasco Airport (MVD), Montevideo',
        summary:
          'Global Exchange bureaus open 24 hours, ATMs in the terminal (a Santander ATM is confirmed), and a bank branch.',
        tips: [
          'Airport exchange pays noticeably less: change only enough to reach the city.',
          'If you need cash right away, withdraw a small amount at the ATM and change the rest downtown.',
        ],
      },
      {
        id: 'montevideo',
        icon: 'mdi-city',
        name: 'Montevideo (Centro, Ciudad Vieja and the port)',
        summary:
          'Exchange houses cluster on Avenida 18 de Julio (Centro) and through Ciudad Vieja. The cruise terminal sits next to Ciudad Vieja, with exchange and ATMs.',
        tips: [
          'In the Centro and Ciudad Vieja you’ll find several exchange houses to compare.',
          'Cruise passengers have exchange inside the port and ATMs a short walk away, toward the Mercado del Puerto.',
        ],
      },
      {
        id: 'punta-del-este',
        icon: 'mdi-beach',
        name: 'Punta del Este',
        summary:
          'Exchange houses along Avenida Gorlero, the main street. In peak season there can be queues and ATMs running out of dollars.',
        tips: [
          'In summer and Easter week, ATMs empty fast: withdraw ahead and keep a buffer.',
          'Lean on cards and QR payments so you don’t depend on cash alone.',
        ],
      },
      {
        id: 'colonia',
        icon: 'mdi-castle',
        name: 'Colonia del Sacramento',
        summary:
          'ATMs in the Barrio Histórico and at the ferry terminal, steps from the old quarter where day-trippers arrive from Buenos Aires.',
        tips: [
          'Withdraw a small amount of pesos on arrival and pay the rest by card.',
          'Many tourist shops take dollars, though at an unfavorable rate.',
        ],
      },
      {
        id: 'ferries',
        icon: 'mdi-ferry',
        name: 'Ferry terminals (Buquebus / Colonia Express)',
        summary:
          'There are ATMs at the Montevideo and Colonia terminals. Exchange inside terminals and on board tends to offer poor rates.',
        tips: [
          'Avoid changing large sums at the terminal or on board — the rates are bad.',
          'Better to use an ATM or change at a city exchange house.',
        ],
      },
      {
        id: 'interior',
        icon: 'mdi-map-marker-radius',
        name: 'The interior and smaller towns',
        summary: 'Outside the major cities and main resorts, ATMs are scarce.',
        tips: [
          'Stock up on cash in Montevideo, Punta del Este or Colonia before heading inland.',
          'On the Rocha coast, top up in larger towns like Chuy or La Paloma.',
        ],
      },
    ],
    steps: [
      {
        name: 'Find an ATM that takes your card',
        text: 'Look for the Visa, Mastercard, Cirrus, Plus or Maestro logos; prefer ATMs inside banks or malls.',
      },
      {
        name: 'Choose dollars or pesos',
        text: 'Take pesos for daily spending and dollars only if you need them in cash; dollars come out in US$ 100 bills.',
      },
      {
        name: 'Decline conversion to your currency',
        text: 'When offered to be charged in your home currency, pick "without conversion" or local currency to avoid the DCC markup.',
      },
      {
        name: 'Withdraw the maximum per transaction',
        text: 'Because there’s a fixed withdrawal fee, take the allowed cap to spread the cost over more cash.',
      },
      {
        name: 'Keep the receipt and count the cash',
        text: 'Check the amount dispensed, keep the slip, and split the cash across more than one place before leaving the ATM.',
      },
    ],
    faq: [
      {
        q: 'Can I withdraw US dollars from ATMs in Uruguay?',
        a: 'Yes. Unlike Argentina, many Uruguayan ATMs dispense dollars as well as pesos, usually in US$ 100 bills. Per-withdrawal caps for foreign cards are low.',
      },
      {
        q: 'How much do ATMs charge foreign cards in fees?',
        a: 'The local surcharge is low (on the order of a few dollars per withdrawal). The bigger cost is usually your own bank’s foreign-transaction fee (1–3% is common).',
      },
      {
        q: 'What is the maximum I can withdraw per transaction?',
        a: 'Roughly US$ 200–300 or $U 5,000 per withdrawal depending on the network (RedBROU or Banred). Your bank also sets its own daily limit, so notify it before traveling.',
      },
      {
        q: 'Should I exchange money at the airport?',
        a: 'Not for large sums: the airport and ferry terminals pay noticeably less. Change only enough to reach the city, then use a downtown exchange house or ATM.',
      },
      {
        q: 'Cash or card in Uruguay?',
        a: 'Uruguay is very card-friendly (Visa and Mastercard almost everywhere, contactless and QR). Carry some pesos in cash for small purchases and pay larger amounts by card.',
      },
      {
        q: 'Which currency should I bring?',
        a: 'Cash US dollars: best rates and accepted at every exchange house. The euro is second. Coming from Argentina, bring dollars, not Argentine pesos.',
      },
      {
        q: 'Do I get a tax discount as a tourist?',
        a: 'Yes, when paying with a foreign card: 0% VAT on accommodation year-round and a VAT reduction on dining and car rental (with an extra full exemption in the summer season, renewed by decree). Cash does not qualify.',
      },
      {
        q: 'What if the ATM rejects my card?',
        a: 'Try another card and the other network (RedBROU and Banred are interconnected, but it helps to carry both). Check that the ATM shows the Visa/Mastercard/Cirrus/Plus logos and tell your bank you’ll be using it in Uruguay.',
      },
    ],
    related: [
      { label: 'Dollars for travel', to: '/guias/dolares-para-viajar' },
      { label: 'Buying dollars at the best price', to: '/guias/comprar-dolares-mejor-precio' },
      { label: 'Exchange houses & branches', to: '/sucursales' },
      { label: 'Compare rates', to: '/comparar' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Portuguese
  // ─────────────────────────────────────────────────────────────────────────
  pt: {
    locale: 'pt',
    lang: 'pt-BR',
    title: 'Onde sacar dinheiro no Uruguai: caixas eletrônicos, taxas e zonas turísticas',
    metaTitle: 'Onde sacar dinheiro no Uruguai (guia para turistas 2026)',
    description:
      'Como e onde sacar dinheiro no Uruguai sendo turista: caixas que entregam dólares e pesos, taxas, limites de saque, a armadilha da conversão de moeda (DCC) e os melhores lugares para sacar no aeroporto, Montevidéu, Punta del Este e Colonia.',
    keywords:
      'sacar dinheiro uruguai, sacar dólares uruguai, caixa eletrônico uruguai, ATM uruguai turista, casa de câmbio uruguai, taxa de saque uruguai, dinheiro uruguai turismo',
    tldr: [
      'Os caixas uruguaios entregam dólares e pesos: uma vantagem rara na região (na Argentina é quase impossível).',
      'Há duas redes: RedBROU e Banred. Se uma falhar, tente a outra; leve um Visa e um Mastercard.',
      'Quando o caixa oferecer cobrar na sua moeda, escolha sempre a moeda local: a "conversão" esconde um câmbio ruim.',
      'Evite trocar grandes quantias no aeroporto ou nos terminais de ferry — as taxas são bem piores.',
      'Pague hotéis e restaurantes com cartão estrangeiro: além do benefício de IVA, você carrega menos dinheiro.',
    ],
    ui: {
      backToTools: 'Ferramentas',
      tldrTitle: 'Em resumo',
      networksTitle: 'As duas redes de caixas: RedBROU e Banred',
      tableNetwork: 'Rede',
      tableReach: 'Cobertura',
      tableUsd: 'Limite US$ / saque',
      tableUyu: 'Limite $U / saque',
      tableNote: 'Notas',
      zonesTitle: 'Onde sacar dinheiro por zona turística',
      zonesIntro:
        'Referências por zona e pontos conhecidos (não endereços exatos, que mudam). Os caixas costumam ficar dentro de bancos, shoppings ou pontos da Abitab e Redpagos.',
      stepsTitle: 'Como sacar dinheiro, passo a passo',
      faqTitle: 'Perguntas frequentes',
      sourcesTitle: 'Fontes e referências',
      relatedTitle: 'Continue lendo',
      ctaTitle: 'Compare antes de trocar',
      ctaText:
        'Veja a cotação do dólar em mais de 40 casas de câmbio, atualizada a cada 10 minutos, e escolha onde vale mais a pena operar.',
      ctaButton: 'Abrir o comparador',
      disclaimer:
        'Informação de referência para turistas, não é aconselhamento financeiro. Taxas, limites e benefícios fiscais mudam: confirme ao chegar e com o emissor do seu cartão. Não temos afiliação com os bancos ou casas de câmbio mencionados.',
      lastChecked: 'Última verificação: junho de 2026',
    },
    ivaLive: {
      heading: 'Benefícios de IVA em vigor hoje',
      asOf: 'Status em {date}:',
      hotel: 'Hospedagem (hotéis e similares): 0% de IVA o ano todo.',
      base: 'Gastronomia e aluguel de carros: desconto de {points} pontos de IVA pagando com cartão estrangeiro.',
      seasonalOn: 'Isenção total de IVA de verão: EM VIGOR (até {end}).',
      seasonalOff:
        'Isenção total de IVA de verão: fora de temporada neste momento (vale aproximadamente de novembro a abril).',
    },
    sections: [
      {
        id: 'redes',
        heading: 'As duas redes de caixas: RedBROU e Banred',
        paragraphs: [
          'No Uruguai convivem duas redes de caixas eletrônicos: a RedBROU, do banco estatal (BROU), e a Banred, que reúne os bancos privados. As duas são interligadas e conectam-se às redes internacionais (Cirrus/Maestro da Mastercard e Plus da Visa), então um cartão estrangeiro funciona em ambas.',
          'Para garantir que um caixa aceita o seu cartão, procure os logos de Visa, Mastercard, Cirrus, Plus ou Maestro na máquina. Dica prática: leve um Visa e um Mastercard de contas diferentes; se um cartão ou caixa falhar, você tenta a outra rede.',
        ],
      },
      {
        id: 'dolares-o-pesos',
        heading: 'Dólares ou pesos? No Uruguai você pode sacar os dois',
        paragraphs: [
          'Ao contrário da Argentina, muitos caixas no Uruguai entregam dólares além de pesos uruguaios. É uma vantagem concreta se você quer dólares em espécie sem ir a uma casa de câmbio. Os dólares costumam sair em notas de US$ 100 o que, somado aos limites por operação, pode significar sacar uma única nota por vez.',
          'Regra simples: saque pesos para o gasto diário (táxis, feiras, comércios pequenos) e dólares só se realmente precisar em espécie. Para a maioria dos pagamentos maiores, o cartão é melhor que o dinheiro.',
        ],
      },
      {
        id: 'comisiones-limites',
        heading: 'Taxas e limites de saque',
        paragraphs: [
          'A taxa que o caixa uruguaio cobra de um cartão estrangeiro é baixa em comparação com muitos países (da ordem de alguns dólares por saque). O custo maior costuma ser o do seu próprio banco: a taxa por transação no exterior (geralmente entre 1% e 3%) mais, às vezes, um valor fixo por saque internacional. Um cartão de viagem sem taxa de câmbio economiza quase tudo isso.',
          'Os limites por operação para cartões estrangeiros são definidos pelas redes locais, não pelo seu banco, e são baixos. O seu banco ainda impõe um limite diário próprio. Vale ligar para o seu banco antes de viajar para aumentar o limite e sacar o máximo por operação para diluir o custo fixo em mais dinheiro.',
        ],
        bullets: [
          'Taxa local por saque: aproximada, da ordem de alguns dólares (confira na tela antes de confirmar).',
          'Taxa do seu banco/emissor: costuma ser o maior custo; verifique se o seu cartão cobra "foreign transaction fee".',
          'Limite por operação: cerca de US$ 200–300 ou $U 5.000 conforme a rede (aproximado, pode mudar).',
          'Limite diário: definido pelo seu banco; avise antes de viajar para ampliá-lo.',
        ],
      },
      {
        id: 'dcc',
        heading: 'A armadilha da conversão de moeda (DCC): escolha sempre a moeda local',
        paragraphs: [
          'Muitos caixas e maquininhas oferecem "cobrar na sua moeda de origem" em vez de pesos ou dólares uruguaios. Parece cômodo ("veja quanto é na sua moeda"), mas essa conversão dinâmica (DCC) aplica um câmbio inflado mais uma taxa escondida. Você quase sempre sai perdendo.',
          'Escolha sempre "sem conversão" ou a moeda local: pesos uruguaios quando sacar pesos, dólares quando sacar dólares. Deixe o seu próprio banco fazer a conversão, que costuma ter câmbio melhor.',
        ],
      },
      {
        id: 'casas-de-cambio',
        heading: 'Casas de câmbio, caixas ou bancos: o que vale mais a pena?',
        paragraphs: [
          'As casas de câmbio (Varlix, Indumex, Gales, Aspen, Cambio Sir, Cambio Inglés e Global Exchange, entre outras) são a opção clássica para trocar dinheiro em espécie. Dão os melhores câmbios para o dólar, com margem mínima e sem comissão; o euro é a segunda melhor moeda, o real é aceitável e o peso argentino, o pior. Costumam pedir o passaporte para operar.',
          'Horários: as agências de rua abrem de segunda a sexta (por volta das 9 às 19) e sábado de manhã; muitas fecham aos domingos. As que ficam dentro de shoppings abrem todos os dias e até mais tarde. Para comparar a cotação do dia entre casas, use o nosso comparador e a página de agências.',
        ],
      },
      {
        id: 'cuanto-efectivo',
        heading: 'Quanto dinheiro levar e qual moeda trazer',
        paragraphs: [
          'O Uruguai é muito amigável com cartões: Visa e Mastercard são aceitos em quase todo lugar, com contactless e pagamentos por QR (Mercado Pago) bem difundidos. Leve só um pouco de dinheiro em pesos para gastos pequenos e pague o que for maior com cartão.',
          'Se você traz dinheiro para trocar, o dólar é a melhor moeda (melhores câmbios e aceito em todas as casas). O euro vem em segundo. Vindo da Argentina, traga dólares, não pesos argentinos: o peso argentino se troca muito mal no Uruguai. Do Brasil, o real funciona, sobretudo perto da fronteira, embora o dólar ainda seja mais conveniente.',
        ],
      },
      {
        id: 'iva-turistas',
        heading: 'Benefício de IVA para turistas (pagando com cartão estrangeiro)',
        paragraphs: [
          'O Uruguai devolve parte do IVA aos turistas não residentes que pagam com um cartão emitido no exterior. A hospedagem (hotéis e similares registrados) tem 0% de IVA o ano todo para não residentes que mostram documento estrangeiro e pagam com cartão estrangeiro: é um benefício permanente.',
          'Em gastronomia (restaurantes, bares, cafés) e aluguel de carros sem motorista há uma redução de IVA o ano todo ao pagar por meios eletrônicos. A isso se soma, na temporada de verão (aproximadamente de novembro a abril), uma isenção total de IVA que o governo renova a cada ano por decreto. Como essa isenção sazonal expira e é reeditada, vale confirmar as datas em vigor antes da sua viagem.',
          'Em todos os casos, o desconto é automático: você paga com o seu cartão estrangeiro e o benefício aparece no comprovante ou na fatura do cartão. Pagando em dinheiro, você perde. Por isso vale pagar hotéis e restaurantes com cartão e sacar menos dinheiro.',
        ],
        bullets: [
          'Hotéis/hospedagem: 0% de IVA o ano todo para não residentes (permanente).',
          'Restaurantes e aluguel de carros: desconto de IVA o ano todo pagando com cartão; isenção total adicional na temporada de verão (renovável, confirme as datas).',
          'Sempre com cartão estrangeiro e documento de não residente. Em dinheiro não vale.',
        ],
      },
      {
        id: 'seguridad',
        heading: 'Dicas de segurança ao sacar dinheiro',
        paragraphs: [
          'O Uruguai é um dos países mais seguros da região, mas o furto existe, sobretudo na Ciudad Vieja de Montevidéu, na zona do porto e nos balneários em alta temporada. Use caixas dentro de bancos, shoppings ou galerias com vidro, de preferência de dia, e fique atento ao redor.',
        ],
        bullets: [
          'Saque de dia e em caixas dentro de locais fechados, não na rua à noite.',
          'Leve dois cartões de contas diferentes e guarde o dinheiro em mais de um lugar.',
          'Peça notas pequenas (100, 200, 500): as de 1.000 e 2.000 são difíceis de trocar.',
          'Para se locomover, use Uber, Cabify ou táxis registrados; evite deixar valores no carro.',
        ],
      },
    ],
    networkRows: [
      {
        network: 'RedBROU',
        reach: 'Rede do banco estatal BROU; mais de 400 caixas no país, além de Abitab e Redpagos.',
        usdPerTxn: '≈ US$ 200',
        uyuPerTxn: '≈ $U 5.000',
        note: 'Muitos caixas entregam dólares. Limites aproximados para cartões estrangeiros.',
      },
      {
        network: 'Banred',
        reach: 'Rede dos bancos privados; mais de 370 pontos nos 19 departamentos.',
        usdPerTxn: '≈ US$ 300',
        uyuPerTxn: '≈ $U 5.000',
        note: 'Interligada com a RedBROU. Se uma rede recusar o cartão, tente a outra.',
      },
    ],
    zones: [
      {
        id: 'aeropuerto',
        icon: 'mdi-airplane',
        name: 'Aeroporto de Carrasco (MVD), Montevidéu',
        summary:
          'Casas de câmbio Global Exchange abertas 24 horas, caixas no terminal (Santander confirmado) e uma agência bancária.',
        tips: [
          'O câmbio no aeroporto paga bem menos: troque só o suficiente para chegar à cidade.',
          'Se precisar de dinheiro na hora, saque um valor pequeno no caixa e troque o resto no centro.',
        ],
      },
      {
        id: 'montevideo',
        icon: 'mdi-city',
        name: 'Montevidéu (Centro, Ciudad Vieja e o porto)',
        summary:
          'As casas de câmbio se concentram na Avenida 18 de Julio (Centro) e na Ciudad Vieja. O terminal de cruzeiros fica colado à Ciudad Vieja, com câmbio e caixas.',
        tips: [
          'No Centro e na Ciudad Vieja você encontra várias casas de câmbio para comparar.',
          'Os cruzeiristas têm câmbio dentro do porto e caixas a poucos passos, a caminho do Mercado del Puerto.',
        ],
      },
      {
        id: 'punta-del-este',
        icon: 'mdi-beach',
        name: 'Punta del Este',
        summary:
          'Casas de câmbio na Avenida Gorlero, a rua principal. Na alta temporada pode haver filas e falta de dólares nos caixas.',
        tips: [
          'No verão e na Semana Santa, os caixas esvaziam rápido: saque com antecedência e leve uma margem.',
          'Apoie-se no cartão e no pagamento por QR para não depender só do dinheiro.',
        ],
      },
      {
        id: 'colonia',
        icon: 'mdi-castle',
        name: 'Colonia del Sacramento',
        summary:
          'Caixas no Barrio Histórico e no terminal de ferries, a metros do casco antigo onde chegam os visitantes de Buenos Aires.',
        tips: [
          'Saque um valor pequeno de pesos ao chegar e pague o resto com cartão.',
          'Muitos comércios turísticos aceitam dólares, embora a um câmbio pouco conveniente.',
        ],
      },
      {
        id: 'ferries',
        icon: 'mdi-ferry',
        name: 'Terminais de ferry (Buquebus / Colonia Express)',
        summary:
          'Há caixas nos terminais de Montevidéu e Colonia. O câmbio dentro dos terminais e a bordo costuma ter taxas ruins.',
        tips: [
          'Evite trocar grandes quantias no terminal ou a bordo — as taxas são ruins.',
          'Melhor sacar num caixa ou trocar numa casa de câmbio da cidade.',
        ],
      },
      {
        id: 'interior',
        icon: 'mdi-map-marker-radius',
        name: 'Interior e cidades pequenas',
        summary: 'Fora das cidades grandes e dos principais balneários, os caixas são escassos.',
        tips: [
          'Abasteça-se de dinheiro em Montevidéu, Punta del Este ou Colonia antes de ir para o interior.',
          'Na costa de Rocha, abasteça em cidades maiores como Chuy ou La Paloma.',
        ],
      },
    ],
    steps: [
      {
        name: 'Encontre um caixa que aceite o seu cartão',
        text: 'Procure os logos de Visa, Mastercard, Cirrus, Plus ou Maestro; prefira caixas dentro de bancos ou shoppings.',
      },
      {
        name: 'Escolha dólares ou pesos',
        text: 'Saque pesos para o gasto diário e dólares só se precisar em espécie; os dólares saem em notas de US$ 100.',
      },
      {
        name: 'Recuse a conversão para a sua moeda',
        text: 'Quando oferecer cobrar na sua moeda de origem, escolha "sem conversão" ou moeda local para evitar a sobretaxa do DCC.',
      },
      {
        name: 'Saque o máximo por operação',
        text: 'Como há uma taxa fixa por saque, vale tirar o limite permitido para diluir o custo em mais dinheiro.',
      },
      {
        name: 'Guarde o comprovante e conte o dinheiro',
        text: 'Confira o valor entregue, guarde o comprovante e divida o dinheiro em mais de um lugar antes de sair do caixa.',
      },
    ],
    faq: [
      {
        q: 'Posso sacar dólares nos caixas do Uruguai?',
        a: 'Sim. Ao contrário da Argentina, muitos caixas uruguaios entregam dólares além de pesos, normalmente em notas de US$ 100. Os limites por operação para cartões estrangeiros são baixos.',
      },
      {
        q: 'Quanto os caixas cobram de taxa em cartões estrangeiros?',
        a: 'A taxa local é baixa (da ordem de alguns dólares por saque). O custo maior costuma ser a taxa do seu próprio banco por operar no exterior (entre 1% e 3% é comum).',
      },
      {
        q: 'Qual é o máximo que posso sacar por operação?',
        a: 'Aproximadamente US$ 200–300 ou $U 5.000 por saque conforme a rede (RedBROU ou Banred). O seu banco também define um limite diário próprio, então avise antes de viajar.',
      },
      {
        q: 'Vale a pena trocar dinheiro no aeroporto?',
        a: 'Não para grandes quantias: o aeroporto e os terminais de ferry pagam bem menos. Troque só o suficiente para chegar à cidade e opere depois numa casa de câmbio ou caixa do centro.',
      },
      {
        q: 'Dinheiro ou cartão no Uruguai?',
        a: 'O Uruguai é muito amigável com cartões (Visa e Mastercard em quase todo lugar, contactless e QR). Leve algum dinheiro em pesos para gastos pequenos e pague o que for maior com cartão.',
      },
      {
        q: 'Qual moeda vale a pena trazer?',
        a: 'Dólares em espécie: dão os melhores câmbios e são trocados em todas as casas. O euro vem em segundo. Vindo da Argentina, traga dólares, não pesos argentinos.',
      },
      {
        q: 'Tenho algum desconto de impostos como turista?',
        a: 'Sim, pagando com cartão estrangeiro: 0% de IVA na hospedagem o ano todo e uma redução de IVA em gastronomia e aluguel de carros (com uma isenção total adicional na temporada de verão, renovada por decreto). Em dinheiro não vale.',
      },
      {
        q: 'O que faço se o caixa recusar o meu cartão?',
        a: 'Tente outro cartão e a outra rede (RedBROU e Banred são interligadas, mas vale ter os dois). Verifique se o caixa mostra os logos Visa/Mastercard/Cirrus/Plus e avise o seu banco que você vai usá-lo no Uruguai.',
      },
    ],
    related: [
      { label: 'Dólares para viajar', to: '/guias/dolares-para-viajar' },
      { label: 'Comprar dólares ao melhor preço', to: '/guias/comprar-dolares-mejor-precio' },
      { label: 'Casas de câmbio e agências', to: '/sucursales' },
      { label: 'Comparar cotações', to: '/comparar' },
    ],
  },
}

/**
 * Returns the localized content for `locale`, falling back to Spanish for any
 * unsupported locale so the page always renders.
 */
export function getWithdrawContent(locale: string): WithdrawContent {
  return withdrawContent[locale as WithdrawLocale] ?? withdrawContent.es
}
