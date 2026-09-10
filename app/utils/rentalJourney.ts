// The five stages of renting a home in Uruguay, and the page that answers each one.
//
// Every destination here already exists — this is a route through work the site had already done
// and never connected. Fourteen rental pages, plus the household catalogue, plus the living-cost
// ones, and nothing said in what order a person meets them.
//
// `app/utils` is a flat auto-import namespace, so everything is prefixed `journey*`.

export type JourneyStageKey = 'decidir' | 'buscar' | 'firmar' | 'equipar' | 'vivir'

export interface JourneyLink {
  /** A route, or an in-page anchor of the guide this hub sits on top of. */
  to: string
  label: string
  hint: string
  icon: string
  /** Marks the one link that answers the stage's question most directly. */
  lead?: boolean
}

export interface JourneyStage {
  key: JourneyStageKey
  /** What the person is actually trying to settle at this point. */
  question: string
  label: string
  icon: string
  blurb: string
  links: JourneyLink[]
}

export const JOURNEY_STAGES: JourneyStage[] = [
  {
    key: 'decidir',
    label: 'Decidir',
    question: '¿Alquilo, y por cuánto?',
    icon: 'mdi-scale-balance',
    blurb:
      'Antes de mirar un solo aviso: si conviene alquilar o comprar, y cuánto podés pagar por mes sin quedar corto en todo lo demás.',
    links: [
      {
        to: '/alquiler-ideal-uruguay',
        label: 'Cuánto alquiler puedo pagar',
        hint: 'Del sueldo al techo máximo, con los gastos que vienen atrás',
        icon: 'mdi-calculator-variant-outline',
        lead: true,
      },
      {
        to: '/comprar-o-alquilar-uruguay',
        label: 'Comprar o alquilar',
        hint: 'La comparación con números, no con opiniones',
        icon: 'mdi-home-switch-outline',
      },
      {
        to: '/por-que-no-baja-el-alquiler-uruguay',
        label: 'Por qué no baja el alquiler',
        hint: 'Qué mueve el precio, para saber qué esperar',
        icon: 'mdi-chart-line',
      },
      {
        to: '#presupuesto',
        label: 'Armar el presupuesto',
        hint: 'La sección de esta misma guía',
        icon: 'mdi-cash-multiple',
      },
    ],
  },
  {
    key: 'buscar',
    label: 'Buscar',
    question: '¿Dónde está lo que puedo pagar?',
    icon: 'mdi-magnify',
    blurb:
      'El directorio propio reúne los avisos de varios portales en un solo lugar, y el análisis dice si lo que estás mirando está caro o barato para su zona.',
    links: [
      {
        to: '/alquileres-uruguay',
        label: 'Ver los avisos',
        hint: 'El directorio, con la garantía como dato filtrable',
        icon: 'mdi-format-list-bulleted',
        lead: true,
      },
      {
        to: '/analisis-alquileres-uruguay',
        label: 'Precios por zona',
        hint: 'Medianas reales, para saber si un aviso está caro',
        icon: 'mdi-chart-box-outline',
      },
      {
        to: '/barrios-alquileres-uruguay',
        label: 'Barrio por barrio',
        hint: 'Qué se consigue en cada zona y a cuánto',
        icon: 'mdi-map-marker-radius-outline',
      },
      {
        to: '/comparar-portales-de-alquiler-uruguay',
        label: 'Qué portal conviene',
        hint: 'Cuántos avisos tiene cada uno y qué esconde',
        icon: 'mdi-compare-horizontal',
      },
      {
        to: '/oportunidades-inmobiliarias-uruguay',
        label: 'Oportunidades',
        hint: 'Avisos por debajo de sus comparables',
        icon: 'mdi-tag-search-outline',
      },
      {
        to: '#armar-busqueda',
        label: 'Publicar que buscás',
        hint: 'Armá el aviso y mandalo a los grupos',
        icon: 'mdi-bullhorn-outline',
      },
    ],
  },
  {
    key: 'firmar',
    label: 'Firmar',
    question: '¿Qué garantía consigo y cuánta plata necesito de entrada?',
    icon: 'mdi-file-sign',
    blurb:
      'Acá se define la mitad del costo real. La garantía y el desembolso de entrada pesan más que cien pesos de diferencia en el alquiler mensual.',
    links: [
      {
        to: '/primer-alquiler-uruguay',
        label: 'Gastos y trámites de la firma',
        hint: 'Cuentas, lecturas, inventario y el dinero de entrada',
        icon: 'mdi-clipboard-check-outline',
        lead: true,
      },
      {
        to: '#garantias',
        label: 'Comparar garantías',
        hint: 'CGN, ANDA, depósito, fianza: qué cuesta cada una',
        icon: 'mdi-shield-key-outline',
      },
      {
        to: '/alquilar-sin-recibo-de-sueldo',
        label: 'Sin recibo de sueldo',
        hint: 'Qué acepta cada garantía cuando trabajás por tu cuenta',
        icon: 'mdi-account-question-outline',
      },
      {
        to: '/alquilar-estando-en-clearing',
        label: 'Estando en el Clearing',
        hint: 'Qué se puede y qué no',
        icon: 'mdi-alert-circle-outline',
      },
      {
        to: '#visita',
        label: 'Revisar la vivienda',
        hint: 'Qué mirar antes de firmar nada',
        icon: 'mdi-home-search-outline',
      },
      {
        to: '#estafas',
        label: 'Señales de estafa',
        hint: 'Cuándo frenar y verificar',
        icon: 'mdi-hand-back-left-outline',
      },
    ],
  },
  {
    key: 'equipar',
    label: 'Equipar',
    question: 'Está vacío. ¿Qué compro primero?',
    icon: 'mdi-fridge-outline',
    blurb:
      'La parte que casi nadie presupuesta y que llega toda junta la primera semana. Ordenada por necesidad, con precio de mercado y el usado al lado del nuevo.',
    links: [
      {
        to: '/equipar-casa-uruguay',
        label: 'Qué comprar y cuánto sale',
        hint: '38 categorías con precio vivo y tres canastas ya sumadas',
        icon: 'mdi-sofa-outline',
        lead: true,
      },
      {
        to: '/sillas-escritorio-uruguay',
        label: 'Silla de escritorio',
        hint: 'Si trabajás desde casa, el relevamiento en detalle',
        icon: 'mdi-chair-rolling',
      },
      {
        to: '/conviene-comprar-en-cuotas',
        label: 'Cuotas o contado',
        hint: 'Si financiar lo caro conviene o no',
        icon: 'mdi-credit-card-clock-outline',
      },
      {
        to: '/descuentos-con-tarjeta-uruguay',
        label: 'Descuentos con tarjeta',
        hint: 'Qué día y con qué tarjeta baja el precio',
        icon: 'mdi-sale-outline',
      },
    ],
  },
  {
    key: 'vivir',
    label: 'Vivir',
    question: '¿Cómo hago que cierre todos los meses?',
    icon: 'mdi-home-heart',
    blurb:
      'El alquiler es una parte. Lo que decide si el mes cierra son las facturas, la comida y el orden en que se paga cada peso.',
    links: [
      {
        to: '/plan-de-vida-uruguay',
        label: 'El orden de cada peso',
        hint: 'Qué se paga primero y por qué',
        icon: 'mdi-chart-timeline-variant',
        lead: true,
      },
      {
        to: '/precios-de-supermercado-uruguay',
        label: 'Precios de supermercado',
        hint: 'Dónde sale más barata la canasta',
        icon: 'mdi-cart-outline',
      },
      {
        to: '/factura-de-ute-uruguay',
        label: 'La factura de UTE',
        hint: 'Cómo leerla y cómo bajarla',
        icon: 'mdi-flash-outline',
      },
      {
        to: '/factura-de-ose-uruguay',
        label: 'La factura de OSE',
        hint: 'Consumo, saneamiento y qué reclamar',
        icon: 'mdi-water-outline',
      },
      {
        to: '/deuda-de-gastos-comunes-uruguay',
        label: 'Gastos comunes',
        hint: 'Qué pasa si se acumulan',
        icon: 'mdi-office-building-outline',
      },
    ],
  },
]

export interface JourneyFigure {
  key: string
  label: string
  valueUyu: number | null
  note: string
}

/**
 * The money strip.
 *
 * Every figure is measured, not estimated, and each one says how many observations it stands on —
 * a hub that opens with invented numbers is worse than one that opens with none. A figure the site
 * could not measure today comes back null and the strip says so instead of guessing.
 */
export function journeyFigures(input: {
  rentMedian: number | null
  rentCount: number
  expensesMedian: number | null
  expensesCount: number
  basketMinUyu: number | null
  basketComplete: boolean
}): JourneyFigure[] {
  return [
    {
      key: 'alquiler',
      label: 'Alquiler mediano',
      valueUyu: input.rentMedian,
      note: input.rentCount ? `${input.rentCount.toLocaleString('es-UY')} avisos` : 'sin datos hoy',
    },
    {
      key: 'gastos',
      label: 'Gastos comunes',
      valueUyu: input.expensesMedian,
      note: input.expensesCount
        ? `${input.expensesCount.toLocaleString('es-UY')} avisos lo declaran`
        : 'sin datos hoy',
    },
    {
      key: 'equipar',
      label: 'Equipar lo mínimo',
      valueUyu: input.basketMinUyu,
      note: input.basketMinUyu
        ? input.basketComplete
          ? 'canasta completa, una sola vez'
          : 'canasta parcial, una sola vez'
        : 'sin datos hoy',
    },
  ]
}

/**
 * What moving actually costs on day one: the first month, its expenses, and filling an empty home.
 *
 * Returns null unless every piece was measured. A "primer desembolso" missing the fridge is lower
 * than the truth and reads as encouragement — the same failure the basket totals are built to
 * avoid.
 */
export function journeyFirstOutlay(figures: readonly JourneyFigure[]): number | null {
  if (figures.some(figure => figure.valueUyu === null)) return null
  return figures.reduce((sum, figure) => sum + (figure.valueUyu ?? 0), 0)
}
