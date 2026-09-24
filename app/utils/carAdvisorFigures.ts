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
import type { PublicCarFuel } from './carsPublic'
import { UTE_IVA_RATE, UTE_TARIFFS } from './householdBills'
import { SITE_ASSUMPTION, TRANSPORT_MODE_ASSUMPTIONS } from './transportAssumptions'
import type { TransportFigure } from './transportModel'

export const CAR_ADVISOR_PATH = '/que-auto-comprar-uruguay'
export const CAR_ADVISOR_VERIFIED_AT = '2026-09-24'

const TOS_2026_URL =
  'https://tramites.montevideo.gub.uy/sites/tramites.montevideo.gub.uy/files/tramites/documentos/TOS%202026.pdf'
const SITE_URL = 'https://cambio-uruguay.com/que-auto-comprar-uruguay'

export const PATENTE_CONSULTA_URL = 'https://www.sucive.gub.uy/consulta_patente'
export const PATENTE_DEUDA_URL = 'https://www.sucive.gub.uy/consulta_deuda'

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
  /** Años de modelo a los que aplica el ensayo. */
  appliesFrom: number
  appliesTo: number | null
  url: string
  note?: string
}

/**
 * Sólo resultados verificados en latinncap.com. Un modelo que no está acá no tiene ensayo que
 * aplique, y eso NO es un cero: la página dice "sin ensayo".
 */
export const LATIN_NCAP: readonly LatinNcapEntry[] = []

/** El ensayo que aplica a ese modelo y año; si hay varios, el más reciente. */
export function latinNcapFor(marketSlug: string, year: number): LatinNcapEntry | null {
  return (
    LATIN_NCAP.filter(
      entry =>
        entry.marketSlug === marketSlug &&
        year >= entry.appliesFrom &&
        (entry.appliesTo === null || year <= entry.appliesTo)
    ).sort((a, b) => b.testYear - a.testYear)[0] ?? null
  )
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
