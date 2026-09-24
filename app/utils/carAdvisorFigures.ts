// Las cifras del asesor de compra (/que-auto-comprar-uruguay) que NO salen de los avisos: la
// patente, el seguro obligatorio, el mantenimiento, la carga de un eléctrico, las estrellas de
// Latin NCAP y lo que hay que revisar antes de señar.
//
// Misma regla que `transportAssumptions.ts`, de donde se reutilizan SOA y mantenimiento para que
// las dos páginas digan lo mismo: cada cifra viaja con su valor, su vigencia, quién la publica y el
// enlace, y lo que no tiene fuente uruguaya va rotulado como supuesto del sitio.
//
// LA PATENTE, leída del PDF del Texto Ordenado del SUCIVE 2026 el 2026-09-24:
//  * art. 2.1: usados, 4,5 % del valor de mercado; eléctricos usados, 2,25 % del valor SIN IVA;
//    ningún modelo 1992 o posterior paga menos que la banda 1986/1991 ($ 8.770,10), y los modelos
//    anteriores pagan bandas fijas. No hay alícuota para híbridos: tributan como cualquier auto.
//  * art. 8: el dólar de la patente 2026 es $ 41,826 (promedio interbancario oct-2024/set-2025),
//    no el de hoy.
//  * art. 31: 20 % de bonificación pagando el año entero con la primera cuota, o 10 % pagando cada
//    cuota en fecha. No se acumulan.
// El valor de mercado oficial (aforo) no se publica por modelo —sale por matrícula— así que acá se
// estima con la mediana de lo que se pide, y la página lo dice al lado del número.
import type { PublicCarFuel, PublicCarPartKey } from './carsPublic'
import type { FaqItem } from './faqAnswers'
import { UTE_IVA_RATE, UTE_TARIFFS } from './householdBills'
import { SITE_ASSUMPTION, TRANSPORT_MODE_ASSUMPTIONS } from './transportAssumptions'
import { PATENTE_CONSULTA_URL, PATENTE_DEUDA_URL } from './trafficFines'
import type { TransportFigure } from './transportModel'

export const CAR_ADVISOR_PATH = '/que-auto-comprar-uruguay'
export const CAR_ADVISOR_VERIFIED_AT = '2026-09-24'

const TOS_2026_URL =
  'https://tramites.montevideo.gub.uy/sites/tramites.montevideo.gub.uy/files/tramites/documentos/TOS%202026.pdf'
const SITE_URL = 'https://cambio-uruguay.com/que-auto-comprar-uruguay'


export const PATENTE_2026 = {
  usedRate: 0.045,
  electricUsedRate: 0.0225,
  ivaRate: 0.22,
  floorUyu: 8_770.1,
  usdUyu: 41.826,
  payYearBonus: 0.2,
  onTimeBonus: 0.1,
  /** Bandas fijas por año de modelo (art. 2.1, "Tributos con valores fijos"). */
  bands: [
    { to: 1975, amount: 0 },
    { to: 1980, amount: 2_923.37 },
    { to: 1985, amount: 4_385.05 },
    { to: 1991, amount: 8_770.1 },
  ],
  figure: {
    value: 0.045,
    asOf: '2026-01-01',
    source: 'SUCIVE — Texto Ordenado 2026, arts. 2.1, 8 y 31',
    sourceUrl: TOS_2026_URL,
    note: 'Usados 4,5 % del valor de mercado, eléctricos usados 2,25 % sin IVA, piso de $ 8.770,10 y dólar a $ 41,826. El valor de mercado oficial (aforo) se consulta por matrícula: acá se estima con la mediana de lo que se pide.',
  } satisfies TransportFigure,
} as const

const round2 = (value: number): number => Math.round(value * 100) / 100

/** La patente anual estimada, antes de bonificaciones. */
export function estimatePatenteUyu(priceUsd: number, fuel: PublicCarFuel, year: number): number {
  const band = PATENTE_2026.bands.find(item => year <= item.to)
  if (band) return band.amount
  const value = Math.max(0, priceUsd) * PATENTE_2026.usdUyu
  const tax =
    fuel === 'electrico'
      ? (value / (1 + PATENTE_2026.ivaRate)) * PATENTE_2026.electricUsedRate
      : value * PATENTE_2026.usedRate
  return round2(Math.max(PATENTE_2026.floorUyu, tax))
}

const auto = TRANSPORT_MODE_ASSUMPTIONS.auto
const simple = UTE_TARIFFS.find(tariff => tariff.id === 'simple')
const kwhBracket = simple && 'brackets' in simple ? simple.brackets?.[1] : undefined

export const CAR_ADVISOR_FIGURES = {
  soaUyu: auto.insuranceUyu!,
  maintenanceFixedUyu: auto.fixedMaintenanceUyu,
  maintenancePerKmUyu: auto.maintenancePerKmUyu,
  evKwhPer100Km: {
    value: 16,
    asOf: '2026-09-24',
    source: SITE_ASSUMPTION,
    sourceUrl: SITE_URL,
    note: 'kWh cada 100 km de un eléctrico chico o mediano. Uruguay no publica etiquetado de consumo para autos eléctricos usados.',
  },
  kwhUyu: {
    value: round2((kwhBracket?.pricePerKwh ?? 8.452) * (1 + UTE_IVA_RATE)),
    asOf: '2026-01-01',
    source: 'UTE — Tarifa Residencial Simple, escalón 101-600 kWh, con IVA',
    sourceUrl: 'https://www.ute.com.uy/clientes/tarifas',
    note: 'Cargando en casa: el kWh que agrega el auto se paga al escalón que ya está usando el hogar.',
  },
} satisfies Record<string, TransportFigure>

// ---------------------------------------------------------------------------------------------
// Latin NCAP
// ---------------------------------------------------------------------------------------------

export type LatinNcapProtocol = '2010-2015' | '2016-2019' | '2020+'

export interface LatinNcapEntry {
  marketSlug: string
  testedName: string
  testYear: number
  protocol: LatinNcapProtocol
  /** Protocolos anteriores a 2020: estrellas para adultos y para niños por separado. */
  adultStars: number | null
  childStars: number | null
  /** Desde 2020, una sola calificación. */
  stars: number | null
  url: string
}

/** "3 estrellas (protocolo 2020)" o "4 adulto, 3 niño (protocolo 2016-2019)". */
export function latinNcapLabel(entry: LatinNcapEntry): string {
  if (entry.protocol === '2020+') return `${entry.stars} de 5 estrellas (ensayo ${entry.testYear})`
  return `${entry.adultStars} estrellas adulto y ${entry.childStars} niño (ensayo ${entry.testYear}, protocolo ${entry.protocol})`
}

// ---------------------------------------------------------------------------------------------
// Antes de señar
// ---------------------------------------------------------------------------------------------

export interface CarAdvisorCheck {
  title: string
  detail: string
  url?: string
  label?: string
}

export const CAR_ADVISOR_CHECKLIST: readonly CarAdvisorCheck[] = Object.freeze([
  {
    title: 'Pedí matrícula y padrón, y consultá la deuda',
    detail:
      'Con esos dos datos la consulta de deuda del SUCIVE es gratis y muestra patente, convenios y multas. Si el auto te interesa en serio, antes de entregar plata pedí el certificado SUCIVE: es el único con carácter liberatorio. Mientras haya deuda, el auto no se puede transferir.',
    url: PATENTE_DEUDA_URL,
    label: 'Consultar deuda en el SUCIVE',
  },
  {
    title: 'Mirá la patente real de ese auto',
    detail:
      'La patente que calculamos acá sale del precio que se pide. La oficial se calcula sobre el aforo de ese año, modelo y versión, y se consulta por matrícula y padrón.',
    url: PATENTE_CONSULTA_URL,
    label: 'Consultar el valor de la patente',
  },
  {
    title: 'Pedí el certificado del Registro',
    detail:
      'El certificado de información de la Dirección General de Registros muestra prendas, embargos y quién es el titular inscripto ($ 1.265 en trámite común, setiembre de 2026). Si quien vende no es el de la libreta, eso tiene que resolverse por escrito antes de pagar.',
    url: 'https://www.gub.uy/tramites/certificados-informacion-bienes-muebles',
    label: 'Certificado de información (gub.uy)',
  },
  {
    title: 'Preguntá el precio de contado',
    detail:
      'Muchas automotoras publican la entrega y no el precio del auto. En el directorio mostramos el contado cuando el aviso lo dice; si no lo dice, preguntalo antes de comparar.',
    url: '/autos-usados-uruguay',
    label: 'Ver el directorio',
  },
  {
    title: 'Llevalo a un mecánico de tu confianza',
    detail:
      'Nadie publica en Uruguay cuánto falla cada modelo: la revisión mecánica antes de señar es la única medición de ESE auto. Pedí también los comprobantes de service y, en Montevideo, la última inspección técnica: los autos particulares la pagan cada tres años entre los 5 y los 15 años de antigüedad, cada dos entre los 15 y los 25, y todos los años pasados los 25.',
    url: 'https://normativa.montevideo.gub.uy/articulos/65183',
    label: 'Inspección técnica en el Digesto de Montevideo',
  },
  {
    title: 'Desconfiá de lo que el aviso calla',
    detail:
      'Choques, recupero de seguro, chapa extranjera, deuda o papeles en trámite bajan el precio, y a veces el aviso lo dice. En nuestro tablero de riesgo declarado ves cuánto menos se pide por cada motivo.',
    url: '/autos-chocados-y-con-deuda-uruguay',
    label: 'Autos chocados y con deuda',
  },
])

// ---------------------------------------------------------------------------------------------
// Repuestos y preguntas frecuentes
// ---------------------------------------------------------------------------------------------

/** Espejo de `CAR_PARTS` (classes/autos/repuestos.ts): cómo se llama cada pieza en la página. */
export const CAR_PART_LABELS: Record<PublicCarPartKey, string> = {
  pastillas: 'Pastillas de freno delanteras',
  filtro_aceite: 'Filtro de aceite',
  amortiguador: 'Amortiguador delantero',
  embrague: 'Kit de embrague',
  distribucion: 'Kit de distribución',
  optica: 'Óptica delantera',
}

export const CAR_ADVISOR_FAQ: readonly FaqItem[] = Object.freeze([
  {
    id: 'mejor-auto',
    question: '¿Cuál es el mejor auto usado para comprar en Uruguay?',
    answer:
      'No hay uno solo: depende de cuánto tenés, para qué lo usás y qué te importa más. El asesor ordena los modelos que entran en tu presupuesto según lo que contestás —costo de tenerlo, repuestos, reventa, seguridad, espacio o que sea lo más nuevo posible— con los avisos vigentes de hoy. Por eso la lista cambia si cambian tus respuestas o el mercado.',
  },
  {
    id: 'patente-usado',
    question: '¿Cómo se calcula la patente de un auto usado en 2026?',
    answer:
      'Según el Texto Ordenado del SUCIVE 2026, un auto usado paga el 4,5 % de su valor de mercado oficial (el aforo), pasado a pesos con un dólar fijo de $ 41,826. Un eléctrico usado paga 2,25 % del valor sin IVA, y ningún modelo 1992 o posterior paga menos de $ 8.770,10 al año. Pagando el año entero con la primera cuota hay 20 % de bonificación, o 10 % pagando cada cuota en fecha, sin acumularse. Acá estimamos el aforo con la mediana de lo que se pide por ese modelo y año; el importe exacto de un auto se consulta en el SUCIVE con su matrícula y padrón.',
  },
  {
    id: 'repuestos',
    question: '¿De dónde salen los precios de los repuestos?',
    answer:
      'De un relevamiento propio en Mercado Libre Uruguay: para cada modelo buscamos seis piezas —pastillas de freno delanteras, filtro de aceite, amortiguador delantero, kit de embrague, kit de distribución y óptica delantera— y nos quedamos con los avisos nuevos que nombran ese modelo. El índice compara cada pieza con la mediana de todos los modelos: 0,80 quiere decir 20 % más barato que el modelo típico. Son precios de avisos, no el stock de las casas de repuestos, y una pieza puede cambiar entre generaciones del mismo modelo. Se relee cada semana.',
  },
  {
    id: 'latin-ncap',
    question: '¿Qué significan las estrellas de Latin NCAP?',
    answer:
      'Latin NCAP choca autos vendidos en América Latina y los califica de 0 a 5 estrellas. Cambió su protocolo en 2016 y en 2020, así que una calificación de 2015 y una de 2023 no se comparan entre sí. Además califica UNA versión, con sus airbags, en un momento, y casi nunca dice desde qué año vale: el mismo modelo puede tener cero estrellas en una generación y cinco en la siguiente. Por eso mostramos los ensayos del modelo con su año y su enlace, y no los usamos para ordenar: confirmá cuál corresponde al auto que mirás. Que no haya ensayo no quiere decir cero estrellas.',
  },
  {
    id: 'no-aparece',
    question: '¿Por qué no aparece el auto que estoy buscando?',
    answer:
      'Para dar un consejo hacen falta datos: el modelo necesita al menos 12 avisos vigentes, la combinación de combustible y caja al menos 6, y el año al menos 3. Además cuentan tus filtros: presupuesto, caja, combustible, carrocería, cuántos viajan y el uso. Los autos a GNC quedan afuera porque hay muy pocos para comparar. En el directorio de autos usados están todos los avisos.',
  },
  {
    id: 'seguro',
    question: '¿El costo mensual incluye el seguro contra todo riesgo?',
    answer:
      'No. Incluye el SOA, el seguro obligatorio, con la prima promedio que publica el BCU, que es un promedio de mercado y no una tarifa. Un seguro contra todo riesgo depende del auto, de tu edad, de dónde lo guardás y de la aseguradora, y ninguna publica un tarifario: hay que cotizarlo.',
  },
])
