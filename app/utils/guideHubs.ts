// Topic hubs: SEO landing pages that group the Reddit-mined guides into
// interconnected themes (hub-and-spoke). Each hub is one page at `/temas/{slug}`
// that introduces a theme and links every guide in it; the guides link back to
// their hub. This is the internal-linking spine that tells search engines (and
// AI) how the 50 guides relate.
//
// PURE module (no Vue/Nuxt runtime, relative imports only) so it can be unit
// tested and reused by the page, the sitemap route and the search index. The
// hub → guide relationship is validated by `guideHubs.test.ts`: every
// `guideSlugs` entry must resolve to a real guide, and every Reddit guide must
// belong to exactly one hub.
import { getGuide, type Guide } from './guides'

/** One thematic hub grouping several guides. */
export interface GuideHub {
  /** URL-safe id, unique across {@link guideHubs} (addressable at `/temas/{slug}`). */
  slug: string
  /** H1 / on-page title. */
  title: string
  /** `<title>` and OG title (a touch longer / more keyworded than {@link title}). */
  seoTitle: string
  /** Meta description / OG subtitle. */
  description: string
  /** Short uppercase label shown on cards and the OG image. */
  tag: string
  /** MDI icon for the hub card. */
  icon: string
  /** Lead paragraph(s), plain prose (rendered verbatim). */
  intro: string
  /** Slugs of the guides in this hub, in reading order. */
  guideSlugs: readonly string[]
  /** Extra internal links (tools / existing pages) relevant to the theme. */
  related?: readonly { label: string; to: string }[]
  /** Sibling hub slugs, for cross-hub navigation. */
  relatedHubs?: readonly string[]
}

export const guideHubs: readonly GuideHub[] = [
  {
    slug: 'alquiler-y-vivienda-uruguay',
    title: 'Alquilar en Uruguay: guía completa',
    seoTitle: 'Alquilar en Uruguay: garantías, contratos y derechos del inquilino',
    description:
      'Todo sobre alquilar en Uruguay: tipos de garantía, depósito, cómo rescindir el contrato, derechos del inquilino y alquiler temporario. Guías claras y verificadas.',
    tag: 'VIVIENDA',
    icon: 'mdi-home-city-outline',
    intro:
      'Alquilar en Uruguay tiene sus reglas: qué garantía elegir, cuánto depósito te pueden pedir, qué podés reclamar y cómo salir del contrato sin pagar de más. Reunimos las dudas más frecuentes sobre alquiler —las mismas que aparecen una y otra vez en foros y grupos— y las respondemos con información práctica y fuentes oficiales. Si estás por firmar, buscando garantía o queriendo terminar un contrato, empezá por la guía que corresponde a tu caso.',
    guideSlugs: [
      'como-rescindir-contrato-alquiler-uruguay',
      'garantias-de-alquiler-uruguay',
      'deposito-de-alquiler-uruguay',
      'alquilar-sin-garantia-uruguay',
      'derechos-del-inquilino-uruguay',
      'que-revisar-antes-de-firmar-alquiler',
      'alquiler-temporario-uruguay',
    ],
    related: [
      { label: 'Guía para alquilar', to: '/alquilar-en-uruguay' },
      { label: 'Costo de vida', to: '/herramientas/costo-de-vida' },
    ],
    relatedHubs: ['comprar-vivienda-uruguay', 'deudas-y-credito-uruguay'],
  },
  {
    slug: 'comprar-vivienda-uruguay',
    title: 'Comprar vivienda en Uruguay',
    seoTitle: 'Comprar vivienda en Uruguay: crédito hipotecario, BHU y escrituración',
    description:
      'Cómo comprar tu casa en Uruguay paso a paso: crédito hipotecario, BHU, costos de escrituración e ITP, promesa de compraventa y compra de terrenos.',
    tag: 'VIVIENDA',
    icon: 'mdi-home-search-outline',
    intro:
      'Comprar vivienda es la decisión financiera más grande de la mayoría de las familias, y en Uruguay tiene pasos y costos que conviene conocer antes de empezar: el crédito hipotecario y su moneda, el papel del BHU, los gastos de escritura y el ITP, la promesa de compraventa y qué verificar en un terreno. Estas guías desarman el proceso para que sepas dónde se va la plata y qué mirar en cada etapa, sin sorpresas en la escribanía.',
    guideSlugs: [
      'comprar-primera-vivienda-uruguay',
      'credito-hipotecario-uruguay',
      'costos-de-escrituracion-uruguay',
      'bhu-como-funciona',
      'comprar-un-terreno-uruguay',
      'promesa-de-compraventa-uruguay',
    ],
    related: [
      { label: 'Conversor de Unidad Indexada', to: '/herramientas/conversor-unidad-indexada' },
      { label: 'Mejores bancos de Uruguay', to: '/mejores-bancos-uruguay' },
    ],
    relatedHubs: ['alquiler-y-vivienda-uruguay', 'herencias-y-sucesiones-uruguay'],
  },
  {
    slug: 'herencias-y-sucesiones-uruguay',
    title: 'Herencias y sucesiones en Uruguay',
    seoTitle: 'Herencias y sucesiones en Uruguay: testamento, legítima e impuestos',
    description:
      'Cómo funciona una sucesión en Uruguay: si las deudas se heredan, cómo hacer un testamento, herederos forzosos y legítima, y por qué no hay impuesto a la herencia.',
    tag: 'HERENCIAS',
    icon: 'mdi-file-document-multiple-outline',
    intro:
      'Las herencias generan muchas dudas y algún que otro mito. En Uruguay no existe un impuesto a la herencia como en otros países, pero la sucesión sí tiene costos y reglas que conviene entender: qué pasa con las deudas del fallecido, cómo protegerse con el beneficio de inventario, quiénes son herederos forzosos y hasta dónde llega la libertad para testar. Estas guías explican, en lenguaje claro, cómo se ordena y transmite un patrimonio, y cuándo conviene la firma de un escribano o un abogado.',
    guideSlugs: [
      'como-funciona-una-sucesion-uruguay',
      'las-deudas-se-heredan-uruguay',
      'hacer-un-testamento-uruguay',
      'legitima-y-herederos-forzosos-uruguay',
      'hay-impuesto-a-la-herencia-uruguay',
    ],
    related: [
      { label: 'Costos de escrituración', to: '/guias/costos-de-escrituracion-uruguay' },
      { label: 'Saldar deudas', to: '/saldar-deudas-uruguay' },
    ],
    relatedHubs: ['comprar-vivienda-uruguay', 'finanzas-personales-y-jubilacion-uruguay'],
  },
  {
    slug: 'comprar-y-mantener-auto-uruguay',
    title: 'Comprar y mantener un auto en Uruguay',
    seoTitle: 'Comprar un auto en Uruguay: 0km o usado, crédito prendario y costos',
    description:
      'Cómo comprar y mantener un auto en Uruguay: 0km vs usado, crédito prendario, el costo real de tener auto (patente, SOA, seguro) y cómo transferir un vehículo.',
    tag: 'VEHÍCULOS',
    icon: 'mdi-car-outline',
    intro:
      'El auto suele ser la segunda compra más cara después de la vivienda, y la que más costos ocultos tiene. Antes de decidir entre 0km y usado, de firmar un crédito prendario o de comprar de particular, conviene saber cuánto cuesta realmente tener un auto en Uruguay —patente, SOA, seguro, service— y cómo hacer una transferencia sin heredar deudas ajenas. Estas guías te ayudan a comprar con los números claros y a evitar los errores más caros.',
    guideSlugs: [
      'comprar-auto-0km-o-usado-uruguay',
      'credito-prendario-auto-uruguay',
      'costos-de-tener-auto-uruguay',
      'transferir-un-auto-uruguay',
    ],
    related: [
      { label: 'Calculadora de préstamo', to: '/herramientas/calculadora-prestamo' },
      { label: 'Préstamos en Uruguay', to: '/prestamos-uruguay' },
    ],
    relatedHubs: ['deudas-y-credito-uruguay', 'finanzas-personales-y-jubilacion-uruguay'],
  },
  {
    slug: 'deudas-y-credito-uruguay',
    title: 'Deudas y crédito en Uruguay',
    seoTitle: 'Deudas y crédito en Uruguay: préstamos, TEA, Clearing y cómo salir',
    description:
      'Cómo funciona el crédito en Uruguay y cómo salir de deudas: préstamos a sola firma, entender la TEA y el CFT, refinanciar, el Clearing y ser garante.',
    tag: 'CRÉDITO',
    icon: 'mdi-credit-card-clock-outline',
    intro:
      'El crédito puede ser una herramienta o una trampa, y la diferencia casi siempre está en entender el costo real. Estas guías explican cómo leer la TEA y el CFT antes de firmar, cuándo un préstamo a sola firma conviene y cuándo no, qué implica ser garante, cómo funciona el Clearing de Informes frente a la Central de Riesgos del BCU y qué caminos existen para salir de las deudas de tarjeta o refinanciar sin empeorar. La meta es que tomes deuda con los ojos abiertos y salgas de ella con un plan.',
    guideSlugs: [
      'prestamo-a-sola-firma-uruguay',
      'entender-tea-tna-y-cft',
      'refinanciar-deudas-uruguay',
      'mejorar-historial-crediticio-uruguay',
      'ser-garante-o-codeudor-riesgos-uruguay',
      'salir-de-deudas-de-tarjeta-uruguay',
    ],
    related: [
      { label: 'Salir del Clearing', to: '/salir-del-clearing' },
      { label: 'Saldar deudas', to: '/saldar-deudas-uruguay' },
      { label: 'Calculadora de préstamo', to: '/herramientas/calculadora-prestamo' },
    ],
    relatedHubs: ['sueldo-trabajo-e-impuestos-uruguay', 'finanzas-personales-y-jubilacion-uruguay'],
  },
  {
    slug: 'sueldo-trabajo-e-impuestos-uruguay',
    title: 'Sueldo, trabajo e impuestos en Uruguay',
    seoTitle: 'Sueldo, trabajo e impuestos en Uruguay: recibo, aguinaldo, IRPF y despido',
    description:
      'Entendé tu sueldo en Uruguay: recibo (nominal vs líquido), aguinaldo, licencia y salario vacacional, despido y liquidación, IRPF y trabajar para el exterior.',
    tag: 'TRABAJO',
    icon: 'mdi-cash-multiple',
    intro:
      '¿Por qué tu líquido es tanto menor que el nominal? ¿Cómo se calcula el aguinaldo, la licencia o lo que te corresponde si te despiden? Estas guías explican, sin jerga, cómo se arma tu sueldo en Uruguay, qué te descuentan y por qué, cómo funciona el IRPF por franjas y qué tener en cuenta si trabajás para clientes del exterior. Saber leer tu recibo y entender estos derechos es el primer paso para reclamar lo que corresponde y planificar mejor.',
    guideSlugs: [
      'entender-tu-recibo-de-sueldo-uruguay',
      'como-se-calcula-el-aguinaldo-uruguay',
      'licencia-y-salario-vacacional-uruguay',
      'despido-y-liquidacion-uruguay',
      'como-funciona-el-irpf-uruguay',
      'trabajar-para-el-exterior-desde-uruguay',
    ],
    related: [
      { label: 'Calculadora de sueldo líquido', to: '/herramientas/calculadora-sueldo-liquido' },
      { label: 'Calculadora de IRPF', to: '/herramientas/calculadora-irpf' },
      { label: 'Calculadora de aguinaldo', to: '/herramientas/calculadora-aguinaldo' },
    ],
    relatedHubs: ['deudas-y-credito-uruguay', 'ahorrar-e-invertir-uruguay'],
  },
  {
    slug: 'ahorrar-e-invertir-uruguay',
    title: 'Ahorrar e invertir en Uruguay',
    seoTitle: 'Ahorrar e invertir en Uruguay: desde cero, plazo fijo, bolsa y dólares',
    description:
      'Cómo empezar a ahorrar e invertir en Uruguay: fondo de emergencia, interés compuesto, plazo fijo, la bolsa de USA, renta fija, dólares y evitar estafas.',
    tag: 'INVERSIÓN',
    icon: 'mdi-chart-line',
    intro:
      'Invertir no es para pocos ni requiere fortunas: empieza por ordenar lo básico y entender un puñado de conceptos. Estas guías te llevan desde el fondo de emergencia y el interés compuesto hasta el plazo fijo, los bonos, la bolsa de Estados Unidos y la decisión de ahorrar en dólares, con una mirada honesta sobre riesgo, costos e impuestos en Uruguay —y sobre cómo reconocer las estafas que abundan. La idea es simple y la repetimos: educación antes que especulación.',
    guideSlugs: [
      'como-empezar-a-invertir-uruguay',
      'fondo-de-emergencia-como-armarlo-uruguay',
      'plazo-fijo-en-uruguay-conviene',
      'invertir-en-la-bolsa-de-usa-desde-uruguay',
      'bonos-y-renta-fija-uruguay',
      'conviene-ahorrar-en-dolares-uruguay',
      'interes-compuesto-explicado-uruguay',
      'errores-y-estafas-al-invertir-uruguay',
    ],
    related: [
      { label: 'Dónde invertir en Uruguay', to: '/inversiones-uruguay' },
      { label: 'Impuestos a las inversiones', to: '/impuestos-inversiones-uruguay' },
      { label: 'Calculadora de plazo fijo', to: '/herramientas/calculadora-plazo-fijo' },
    ],
    relatedHubs: ['finanzas-personales-y-jubilacion-uruguay', 'sueldo-trabajo-e-impuestos-uruguay'],
  },
  {
    slug: 'finanzas-personales-y-jubilacion-uruguay',
    title: 'Finanzas personales y jubilación en Uruguay',
    seoTitle: 'Finanzas personales en Uruguay: presupuesto, seguros, jubilación y AFAP',
    description:
      'Ordená tu vida financiera en Uruguay: presupuesto personal, seguros que conviene tener, jubilación y AFAP, planificar el retiro, cuentas, billeteras y estafas.',
    tag: 'FINANZAS',
    icon: 'mdi-heart-pulse',
    intro:
      'La salud financiera se construye con hábitos, no con golpes de suerte: un presupuesto realista, los seguros justos, una cuenta bien elegida y una mirada temprana a la jubilación. Estas guías cubren lo esencial de la vida financiera en Uruguay —cómo armar un presupuesto, qué seguros valen la pena, cómo funcionan las AFAP y el sistema jubilatorio, cómo abrir una cuenta o usar billeteras digitales, y cómo no caer en estafas— para que tu dinero trabaje a favor tuyo, hoy y a largo plazo.',
    guideSlugs: [
      'armar-un-presupuesto-personal-uruguay',
      'que-seguros-conviene-tener-uruguay',
      'jubilacion-y-afap-como-funciona-uruguay',
      'planificar-tu-retiro-uruguay',
      'abrir-una-cuenta-bancaria-uruguay',
      'billeteras-digitales-uruguay-como-funcionan',
      'como-evitar-estafas-financieras-uruguay',
      'educacion-financiera-para-jovenes-uruguay',
    ],
    related: [
      { label: 'Salud financiera', to: '/salud-financiera' },
      { label: 'Apps de economía', to: '/apps-economia-uruguay' },
      { label: 'Estafas en Uruguay', to: '/estafas-uruguay' },
    ],
    relatedHubs: ['ahorrar-e-invertir-uruguay', 'deudas-y-credito-uruguay'],
  },
]

/** Look up a hub by its slug. */
export function getHub(slug: string): GuideHub | undefined {
  return guideHubs.find(hub => hub.slug === slug)
}

/** Every hub slug, in catalogue order. Used by the route guard and sitemap. */
export function hubSlugs(): string[] {
  return guideHubs.map(hub => hub.slug)
}

/** Resolve a hub's guides to full {@link Guide} objects, skipping any unknown slug. */
export function hubGuides(hub: GuideHub): Guide[] {
  return hub.guideSlugs.map(getGuide).filter((g): g is Guide => Boolean(g))
}

/** The hub a given guide belongs to, if any (guide → hub, the spoke → hub link). */
export function hubOfGuide(guideSlug: string): GuideHub | undefined {
  return guideHubs.find(hub => hub.guideSlugs.includes(guideSlug))
}
