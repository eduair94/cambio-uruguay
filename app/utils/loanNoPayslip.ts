// app/utils/loanNoPayslip.ts
// Data + helpers for /prestamo-sin-recibo-de-sueldo-uruguay.
//
// Why the page exists: "préstamo sin recibo de sueldo" grew +300 % in Google Trends in the 90 days
// to 2026-09-15 (docs/seo/2026-09-15-google-trends-oportunidades.md, "segundo escalón") and the
// site had nothing for it. The Uruguayan SERP (gl=uy, 2026-09-16) is nine lenders' own landing
// pages plus one affiliate blog that lists six options without a single rate, Clearing policy or
// BCU status. Those three things are exactly what /mejores-prestamos-uruguay already measures, so
// this page is a FILTER over that catalogue, not a second catalogue: when the weekly refresh
// re-prices a lender, both pages move together.
//
// The one editorial layer on top is the three ways in ("puertas"), and every claim in them is a
// dated quote from the lender's own page. A quote is never "updated" to a newer number: it is
// re-read and re-dated, or removed (see memory `un-solo-tope-de-usura`).
//
// PURE module (no Vue/Nuxt) so the page and the unit tests share it.

import type { BcuCapRow } from './cashAdvance'
import {
  BCU_LABELS,
  CLEARING_LABELS,
  SEGMENT_LABELS,
  representativeTea,
  type ClearingStance,
  type LenderEntity,
  type LenderSegment,
} from './loanTierlist'
import { usuryGridKey, type UsuryGridKey } from './usuryCaps'

/** Last time the quotes below were read against their sources. */
export const NOPAYSLIP_LOANS_REVIEWED = '2026-09-16'

/**
 * Last time the "sólo con cédula" table and the usury grid below were read against each lender's
 * own page and the BCU PDF. Separate from `NOPAYSLIP_LOANS_REVIEWED` on purpose: the BROU quote
 * in the first door was not re-read that day, and a review date only covers what was re-read.
 */
export const SOLO_CEDULA_REVIEWED = '2026-09-22'

export type NoPayslipDoorId = 'certificado' | 'solo-cedula' | 'garantia'

export interface NoPayslipQuote {
  /** Lender id in `LENDER_TIERLIST`. */
  lenderId: string
  lenderName: string
  /** What the lender says, verbatim where quoted. */
  text: string
  sourceLabel: string
  sourceUrl: string
}

export interface NoPayslipDoor {
  id: NoPayslipDoorId
  title: string
  who: string
  body: string
  quotes: readonly NoPayslipQuote[]
}

/**
 * The three ways a person without a payslip actually gets a loan in Uruguay.
 *
 * Ordered by cost, not by ease: the certificate route is the cheap one and the one most people
 * don't know they qualify for; "solo con la cédula" is the one the ads sell.
 */
export const NOPAYSLIP_DOORS: readonly NoPayslipDoor[] = Object.freeze([
  {
    id: 'certificado',
    title: 'Con certificado de ingresos de un contador',
    who: 'Independientes formales: unipersonal, monotributo, SRL, profesionales.',
    body: 'Es la vía que abre las tasas bajas. El recibo de sueldo se reemplaza por un certificado firmado por un contador público que declara tus ingresos formales. Sin inscripción en BPS y DGI no hay nada que certificar, así que este camino empieza por formalizarse.',
    quotes: [
      {
        lenderId: 'brou',
        lenderName: 'BROU',
        text: 'Pide un "Certificado de ingresos realizado por Contador Público" con menos de 30 días, el certificado de la Caja de Profesionales del contador y "al menos dos años de antigüedad de aportes en forma continua". La cuota no puede superar el 30 % del ingreso en pesos (25 % en UI, 15 % en dólares), y exige no figurar con información negativa.',
        sourceLabel: 'BROU — préstamos sin retención en pesos, UI y dólares',
        sourceUrl:
          'https://www.brou.com.uy/personas/prestamos/prestamo-consumo/prestamos-sin-retencion-en-pesos-ui-y-dolares',
      },
    ],
  },
  {
    id: 'solo-cedula',
    title: 'Sólo con la cédula',
    who: 'Quien no puede certificar ingresos, o necesita la plata rápido.',
    body: 'Algunas financieras no piden comprobante: evalúan con sus propios registros y con el historial crediticio. "Sin comprobante" no quiere decir "sin requisitos": puede haber ingreso mínimo y control del clearing, y es la puerta más cara.',
    quotes: [
      {
        lenderId: 'oca',
        lenderName: 'OCA',
        text: '"Solo con tu cédula. Sin ningún comprobante." Pide un ingreso mensual mínimo de $ 10.000 (soltero) o $ 15.000 (casado), tener entre 18 y 72 años y "no figurar actualmente en el clearing".',
        sourceLabel: 'OCA — préstamos para nuevos clientes',
        sourceUrl: 'https://oca.uy/prestamos/nuevo-cliente.html',
      },
      {
        lenderId: 'pronto',
        lenderName: 'Pronto!',
        text: '"Podrás solicitarlos solo con la cédula", aunque recomienda presentar el recibo de sueldo o de jubilación "para poder acceder a mejores ofertas". Montos de $ 5.000 a $ 600.000 en hasta 48 cuotas.',
        sourceLabel: 'Pronto! — préstamos en efectivo',
        sourceUrl: 'https://pronto.com.uy/dinero/',
      },
      {
        lenderId: 'creditel',
        lenderName: 'Creditel',
        text: 'Pide cédula vigente y tener entre 18 y 84 años. "En caso de no tener el comprobante de ingresos, podés presentar tres facturas a tu nombre de UTE, OSE, Antel, otras compañías telefónicas o de cable." Montos de $ 3.000 a $ 240.000 y la primera cuota a los 60 días; no publica la TEA (leído el 22 de setiembre de 2026).',
        sourceLabel: 'Creditel — preguntas frecuentes',
        sourceUrl: 'https://www.creditel.com.uy/centro-ayuda/preguntas-frecuentes',
      },
    ],
  },
  {
    id: 'garantia',
    title: 'Con una garantía',
    who: 'Quien no tiene ingresos que mostrar pero sí un bien.',
    body: 'En el empeño lo que respalda el préstamo es el objeto que dejás, y si no pagás lo perdés. El crédito prendario sobre un auto también se apoya en el vehículo, aunque la institución puede pedirte igual que compruebes ingresos. Ojo: el préstamo pignoraticio del BROU (empeño de oro) exige no tener información negativa.',
    quotes: [],
  },
])

// ── "Sólo con cédula": quién presta de verdad sin comprobante, y a qué precio ──────────────────
//
// La confusión central de la demanda (SERP gl=uy, 2026-09-22): "sólo con cédula" quiere decir SIN
// COMPROBANTE DE INGRESOS, no "sin mirar el clearing". De las financieras que lo anuncian, OCA
// exige "no figurar actualmente en el clearing", Crédito de la Casa pide "sin incumplimientos en
// Infocred o Clearing" hasta para Compra Ágil, y República Microfinanzas "sin morosidad vigente en
// Clearing de informes y/o sistema financiero". La única que lo afirma en su propia web es Pronto!.
// Cada fila es una lectura fechada (`SOLO_CEDULA_REVIEWED`) de la página del propio prestamista.

/** `si` = anuncia que basta la cédula; `parcial` = cédula más otro papel; `no` = pide comprobante. */
export type SoloCedulaStance = 'si' | 'parcial' | 'no'

export const SOLO_CEDULA_LABELS: Record<SoloCedulaStance, string> = Object.freeze({
  si: 'Sí, lo anuncia',
  parcial: 'Cédula y otro papel',
  no: 'No: pide comprobante',
})

export interface SoloCedulaLender {
  /** Lender id in `LENDER_TIERLIST`; absent when the ranking does not list the institution. */
  lenderId?: string
  name: string
  soloCedula: SoloCedulaStance
  /** Qué pide en lugar del recibo (o además de la cédula). */
  pide: string
  /** Qué dice de los antecedentes, con las palabras de su página. */
  clearing: string
  /** TEA publicada, con los gastos que la acompañan. */
  tasa: string
  /** Montos y plazos publicados. */
  montos: string
  sourceLabel: string
  sourceUrl: string
}

export const SOLO_CEDULA_LENDERS: readonly SoloCedulaLender[] = Object.freeze([
  {
    lenderId: 'oca',
    name: 'OCA',
    soloCedula: 'si',
    pide: 'Tener entre 18 y 72 años y un ingreso mensual mínimo de $ 10.000 (soltero) o $ 15.000 (casado), sin comprobante.',
    clearing: 'Exige "no figurar actualmente en el clearing".',
    tasa: 'TEA entre 29 % y 87 % + IVA según la web; la cartilla vigente desde el 15 de setiembre de 2026 fija 62 % (7 a 12 cuotas) u 86 % (13 a 36 cuotas) + IVA, bonificada a 53,29 %–81,01 % si pagás en fecha, y mora 72 % + IVA. Comisiones de 40 UI (concesión) + 80 UI (administración y cobranza) + IVA, que "se cobran al inicio y se suman al capital solicitado", y seguro de vida de 0,25 % mensual sobre saldo. Ejemplo publicado: $ 200.000 a 24 meses con TEA 39 %, cuota $ 12.643, total $ 303.432.',
    montos: '$ 5.000 a $ 600.000 en 7 a 36 meses (la FAQ online dice $ 6.000 a $ 150.000).',
    sourceLabel: 'OCA — préstamos para nuevos clientes y cartilla de tasas vigentes',
    sourceUrl: 'https://oca.uy/prestamos/nuevo-cliente.html',
  },
  {
    lenderId: 'pronto',
    name: 'Pronto!',
    soloCedula: 'si',
    pide: '"Podrás solicitarlos solo con la cédula"; recomienda el recibo de sueldo o de jubilación "para poder acceder a mejores ofertas".',
    clearing:
      'Es la única que lo dice en su propia página: la titula "Préstamos estando en el clearing y sin recibo de sueldo", sujeto a evaluación.',
    tasa: 'Publica como máximos los topes del BCU de setiembre de 2026 (133,4860 % hasta 366 días bajo 10.000 UI; 66,3245 % desde 10.000 UI). Ejemplo con recibo: $ 500.000 en 42 cuotas de $ 28.526, TEA 49 % + IVA.',
    montos:
      '$ 5.000 a $ 600.000 en 3 a 48 cuotas, primera cuota hasta 60 días (en /credito/ dice hasta $ 1.000.000).',
    sourceLabel: 'Pronto! — préstamos estando en el clearing y sin recibo de sueldo',
    sourceUrl: 'https://www.pronto.com.uy/dinero/',
  },
  {
    lenderId: 'creditel',
    name: 'Creditel',
    soloCedula: 'parcial',
    pide: 'Cédula vigente y 18 a 84 años. Sin comprobante de ingresos acepta "tres facturas a tu nombre de UTE, OSE, Antel, otras compañías telefónicas o de cable"; el monto mayor exige comprobante en sucursal.',
    clearing: 'No lo publica.',
    tasa: 'No publica la TEA en la FAQ, la home ni /efectivo. En /efectivo ofrece adelanto de sueldo o de jubilación hasta $ 40.000 a devolver a los 30 días.',
    montos:
      '$ 3.000 a $ 240.000 (hasta 4 sueldos líquidos), primera cuota a los 60 días; /efectivo también dice "hasta $ 600.000".',
    sourceLabel: 'Creditel — preguntas frecuentes',
    sourceUrl: 'https://www.creditel.com.uy/centro-ayuda/preguntas-frecuentes',
  },
  {
    lenderId: 'credito-de-la-casa',
    name: 'Crédito de la Casa',
    soloCedula: 'no',
    pide: 'Lo único "sólo con cédula" es Compra Ágil: 23 a 84 años, cédula vigente, celular propio y firma del contrato por única vez, con tope inicial de $ 5.000 y cuota máxima de $ 600. El efectivo agrega comprobante de ingresos (recibo con al menos 6 meses), constancia de domicilio y firma del vale en sucursal.',
    clearing:
      'Hasta Compra Ágil exige "no deberá tener incumplimientos en Infocred o Clearing" y "no figurar en MOCASIST".',
    tasa: 'No la publica en la FAQ. "No operamos" con retención de sueldo.',
    montos: 'Compra Ágil: tope inicial $ 5.000. Efectivo: sin monto publicado en la FAQ.',
    sourceLabel: 'Crédito de la Casa — preguntas frecuentes',
    sourceUrl: 'https://www.creditodelacasa.com.uy/faq',
  },
  {
    lenderId: 'verde-fucac',
    name: 'Verde (ex FUCAC)',
    soloCedula: 'no',
    pide: 'Último recibo de sueldo, jubilación o pensión, cédula y constancia de domicilio; mayor de 18 años.',
    clearing:
      'Si te atrasás, avisa que registra en Clearing de Informes y retiene el 20 % de sueldo, jubilación o pensión.',
    tasa: 'TEA compensatoria 25 % a 32 % (mora 37,5 % a 44 %) más cuota social de $ 330 por mes IVA incluido ($ 165 sin crédito activo). Ejemplo "Limpiadeudas": $ 70.000 en 24 cuotas de $ 5.353, TEA 25 %, válido hasta el 31 de octubre de 2026.',
    montos: '$ 2.000 a $ 600.000 en 6 a 48 cuotas.',
    sourceLabel: 'Verde — términos y condiciones',
    sourceUrl: 'https://verde.com.uy/conocenos_mas_transparentes.php',
  },
  {
    lenderId: 'anda',
    name: 'ANDA',
    soloCedula: 'no',
    pide: 'Último recibo de sueldo y 6 meses de antigüedad (los pasivos no requieren antigüedad), más cédula. Lo que se firma "sólo con tu cédula" en Abitab es el contrato web, no el préstamo sin recibo.',
    clearing: 'Pide "buenos antecedentes crediticios" en la línea de nómina para pasivos.',
    tasa: 'Setiembre de 2026: bajo 10.000 UI, 27,20 % (1 a 10 cuotas) o 31,80 % (12 o más) + IVA; desde 10.000 UI, 28,80 % o 32,20 % + IVA.',
    montos: '1 a 48 cuotas; 10.000 UI eran $ 66.371 al 31 de agosto de 2026.',
    sourceLabel: 'ANDA — préstamos',
    sourceUrl: 'https://anda.com.uy/prestamos/',
  },
  {
    name: 'República Microfinanzas (grupo BROU)',
    soloCedula: 'no',
    pide: 'Actividad independiente como fuente principal de ingresos con 6 meses (asalariados, 1 año), dos firmas, 18 a 75 años. Los comparadores que la listan como "sólo con cédula" no citan su cartilla.',
    clearing:
      '"Sin morosidad vigente en Clearing de informes y/o sistema financiero"; tampoco deudor alimentario.',
    tasa: 'TEA 44 % + IVA hasta 366 días y 46 % + IVA desde 367 días, mora 49 %; cartilla vigente del 1 al 30 de setiembre de 2026.',
    montos: '3.000 a 12.500 UI (30.000 UI con 2 años de cliente) en 3 a 18 meses.',
    sourceLabel: 'República Microfinanzas — cartilla Préstamo Efectivo (PDF)',
    sourceUrl:
      'https://www.republicamicrofinanzas.com.uy/wp-content/uploads/2025/04/cartilla-prestamo-efectivo.pdf',
  },
])

// ── Topes de usura vigentes (BCU, Ley 18.212) ─────────────────────────────────────────────────
//
// El BCU republica la tabla TODOS LOS MESES sobre una ventana trimestral móvil (memoria
// `un-solo-tope-de-usura`), así que las seis filas que la grilla viva trae (`/api/bcu-rates`:
// consumo en pesos y en dólares, por tramo y por plazo) se reemplazan por las de hoy y las que la
// grilla no trae (autorización de descuento, retención de haberes, crédito de nómina) quedan como
// lectura fechada del PDF y se marcan así. Regla legal (art. 11, redacción Ley 19.732): tope =
// media + 55 %; crédito de nómina + 20 %; retención de haberes + 30 %; mora + 80 %.

/** Período de la tabla leída a mano y su vigencia, tal como los imprime el PDF. */
export const BCU_CAPS_PERIOD = 'mayo–julio de 2026'
export const BCU_CAPS_IN_FORCE_SINCE = '2026-09-01'
export const BCU_CAPS_SOURCE_URL =
  'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Tasas-Medias/tasas-medias-interes.pdf'

export interface NoPayslipCapRow {
  id: string
  segment: string
  plazo: 'hasta 366 días' | '367 días o más'
  currency: 'UYU' | 'USD'
  meanPct: number
  capPct: number
  /** Tope de mora; ausente cuando el PDF no lo imprime para esa fila. */
  moraPct?: number
  /** Fila de la grilla viva que la refresca; ausente = lectura fechada del PDF. */
  grid?: UsuryGridKey
  /** `true` cuando el número mostrado salió de la grilla viva de hoy. */
  live?: boolean
}

export const NOPAYSLIP_CAPS: readonly NoPayslipCapRow[] = Object.freeze([
  {
    id: 'sin-descuento-chico-corto',
    segment: 'Consumo sin autorización de descuento, menos de 10.000 UI',
    plazo: 'hasta 366 días',
    currency: 'UYU',
    meanPct: 86.12,
    capPct: 133.486,
    moraPct: 155.016,
    grid: 'menor10kUI|corto|UYU',
  },
  {
    id: 'sin-descuento-chico-largo',
    segment: 'Consumo sin autorización de descuento, menos de 10.000 UI',
    plazo: '367 días o más',
    currency: 'UYU',
    meanPct: 85.68,
    capPct: 132.804,
    moraPct: 154.224,
    grid: 'menor10kUI|largo|UYU',
  },
  {
    id: 'sin-descuento-grande-corto',
    segment: 'Consumo sin autorización de descuento, 10.000 UI o más',
    plazo: 'hasta 366 días',
    currency: 'UYU',
    meanPct: 42.79,
    capPct: 66.3245,
    moraPct: 77.022,
    grid: 'mayor10kUI|corto|UYU',
  },
  {
    id: 'sin-descuento-grande-largo',
    segment: 'Consumo sin autorización de descuento, 10.000 UI o más',
    plazo: '367 días o más',
    currency: 'UYU',
    meanPct: 57.33,
    capPct: 88.8615,
    moraPct: 103.194,
    grid: 'mayor10kUI|largo|UYU',
  },
  {
    id: 'con-descuento-chico-corto',
    segment: 'Consumo con autorización de descuento, menos de 10.000 UI',
    plazo: 'hasta 366 días',
    currency: 'UYU',
    meanPct: 21.05,
    capPct: 32.6275,
    moraPct: 37.89,
  },
  {
    id: 'con-descuento-chico-largo',
    segment: 'Consumo con autorización de descuento, menos de 10.000 UI',
    plazo: '367 días o más',
    currency: 'UYU',
    meanPct: 24.52,
    capPct: 38.006,
    moraPct: 44.136,
  },
  {
    id: 'retencion-chico-corto',
    segment: 'Crédito con retención de haberes (tope 30 %), menos de 10.000 UI',
    plazo: 'hasta 366 días',
    currency: 'UYU',
    meanPct: 21.05,
    capPct: 27.37,
  },
  {
    id: 'retencion-chico-largo',
    segment: 'Crédito con retención de haberes (tope 30 %), menos de 10.000 UI',
    plazo: '367 días o más',
    currency: 'UYU',
    meanPct: 24.52,
    capPct: 31.88,
  },
  {
    id: 'nomina-chico-corto',
    segment: 'Crédito de nómina (tope 20 %), menos de 10.000 UI',
    plazo: 'hasta 366 días',
    currency: 'UYU',
    meanPct: 21.05,
    capPct: 25.26,
  },
  {
    id: 'nomina-chico-largo',
    segment: 'Crédito de nómina (tope 20 %), menos de 10.000 UI',
    plazo: '367 días o más',
    currency: 'UYU',
    meanPct: 24.52,
    capPct: 29.42,
  },
  // En dólares el PDF publica UNA sola celda de consumo, sin partir por autorización de descuento ni
  // por tramo de UI: no existe un tope en dólares "sin descuento bajo 10.000 UI".
  {
    id: 'usd-consumo-corto',
    segment: 'Consumo en dólares (única categoría)',
    plazo: 'hasta 366 días',
    currency: 'USD',
    meanPct: 8.47,
    capPct: 13.1285,
    moraPct: 15.246,
    grid: 'menor10kUI|corto|USD',
  },
  {
    id: 'usd-consumo-largo',
    segment: 'Consumo en dólares (única categoría)',
    plazo: '367 días o más',
    currency: 'USD',
    meanPct: 11.83,
    capPct: 18.3365,
    moraPct: 21.294,
    grid: 'menor10kUI|largo|USD',
  },
])

/** Misma banda de magnitud que `usuryCaps.ts`: un error de unidad pasa la prueba aritmética entera. */
const CAP_PERCENT_BAND: readonly [number, number] = [2, 500]

function liveRowUsable(row: BcuCapRow): boolean {
  const mean = row.media * 100
  const cap = row.tope * 100
  return (
    Number.isFinite(mean) &&
    Number.isFinite(cap) &&
    mean >= CAP_PERCENT_BAND[0] &&
    mean <= CAP_PERCENT_BAND[1] &&
    cap >= CAP_PERCENT_BAND[0] &&
    cap <= CAP_PERCENT_BAND[1]
  )
}

/**
 * La tabla de topes con las filas que la grilla viva trae reemplazadas por las de hoy. Una fila
 * sin `grid`, o cuya fila viva no cierra, queda como la lectura fechada del PDF y sale `live: false`.
 */
export function mergeNoPayslipCaps(
  baseline: readonly NoPayslipCapRow[],
  live: readonly BcuCapRow[] | null | undefined
): NoPayslipCapRow[] {
  const byKey = new Map<UsuryGridKey, BcuCapRow>()
  for (const row of live || []) {
    if (liveRowUsable(row)) byKey.set(usuryGridKey(row), row)
  }
  return baseline.map(row => {
    const fresh = row.grid ? byKey.get(row.grid) : undefined
    if (!fresh) return { ...row, live: false }
    const mora = fresh.topeMora * 100
    return {
      ...row,
      meanPct: fresh.media * 100,
      capPct: fresh.tope * 100,
      moraPct: Number.isFinite(mora) && mora > 0 ? mora : row.moraPct,
      live: true,
    }
  })
}

/**
 * Gastos que la Ley 18.212 (art. 14) deja FUERA del cálculo de usura, en UI, por literal. El
 * préstamo típico "sólo con cédula" no tiene retención ni débito automático, así que cae en el
 * literal D (120 UI), que es exactamente el que OCA invoca con sus 40 UI + 80 UI.
 */
export const USURY_EXCLUDED_COSTS: readonly { id: string; text: string }[] = Object.freeze([
  { id: 'a', text: 'A) El IVA sobre los intereses y los impuestos a cargo del cliente.' },
  {
    id: 'b',
    text: 'B) Hasta 30 UI por cliente de gastos fijos (10 UI por la concesión y 2 UI por cuota), sólo si el crédito se cobra con retención de sueldo o débito automático.',
  },
  { id: 'c', text: 'C) Hasta 10 UI por utilización en créditos revolving y sobregiros.' },
  {
    id: 'd',
    text: 'D) Hasta 120 UI por cliente (40 UI por la concesión y 8 UI por cuota) en las demás modalidades de pago, que es el caso del préstamo de financiera sin retención. En B y D no se pueden volver a excluir gastos por un crédito nuevo hasta 60 días después del anterior.',
  },
  {
    id: 'art16',
    text: 'Art. 16: las cooperativas y asociaciones civiles pueden dejar fuera la cuota social, hasta 50 UI por mes.',
  },
])

export interface NoPayslipRow {
  id: string
  name: string
  segment: LenderSegment
  segmentLabel: string
  /** "26–31 %", "hasta 129,92 %", "36,8 %" or "No la publica". */
  teaLabel: string
  /** Representative TEA used for ordering; `null` sorts last. */
  teaSort: number | null
  clearing: ClearingStance
  clearingLabel: string
  bcuLabel: string
  sourceUrl: string
}

/** Uruguayan percentage: `123.43` → `'123,43 %'`. */
export function pctEs(value: number): string {
  return `${value.toLocaleString('es-UY', { maximumFractionDigits: 2 })} %`
}

/** The published TEA of a lender as a short label. */
export function teaLabelOf(teaPct: number | null, teaMaxPct: number | null): string {
  const lo = teaPct != null && Number.isFinite(teaPct) && teaPct > 0 ? teaPct : null
  const hi = teaMaxPct != null && Number.isFinite(teaMaxPct) && teaMaxPct > 0 ? teaMaxPct : null
  if (lo != null && hi != null && hi > lo) {
    return `${lo.toLocaleString('es-UY', { maximumFractionDigits: 2 })}–${pctEs(hi)}`
  }
  if (lo != null) return pctEs(lo)
  if (hi != null) return `hasta ${pctEs(hi)}`
  return 'No la publica'
}

/**
 * Lenders that will consider somebody without a payslip: those whose published audience includes
 * independent workers, plus pawn/secured lenders, which assess the collateral instead of income.
 * Cheapest representative TEA first; lenders that publish no rate go last.
 */
export function noPayslipLenders(lenders: readonly LenderEntity[]): NoPayslipRow[] {
  return lenders
    .filter(l => l.audiences.includes('independiente') || l.segment === 'prendario')
    .map(l => {
      const tea = representativeTea(l.teaPct, l.teaMaxPct)
      return {
        id: l.id,
        name: l.name,
        segment: l.segment,
        segmentLabel: SEGMENT_LABELS[l.segment],
        teaLabel: teaLabelOf(l.teaPct, l.teaMaxPct),
        // A 0 % "rate" is a promotion or a fee-based product, not a comparable TEA.
        teaSort: tea != null && tea > 0 ? tea : null,
        clearing: l.clearing,
        clearingLabel: CLEARING_LABELS[l.clearing],
        bcuLabel: BCU_LABELS[l.bcu],
        sourceUrl: l.sourceUrl || l.website,
      }
    })
    .sort((a, b) => {
      if (a.teaSort == null && b.teaSort == null) return a.name.localeCompare(b.name, 'es')
      if (a.teaSort == null) return 1
      if (b.teaSort == null) return -1
      return a.teaSort - b.teaSort
    })
}

export interface TeaSpread {
  /** Lowest published "desde" (or ceiling when that is all a lender publishes). */
  min: number | null
  /** Highest published ceiling (or single rate). */
  max: number | null
  /** How many rows publish any rate at all. */
  withRate: number
}

/** The range of published rates across the rows, from the underlying lender facts. */
export function teaSpread(
  lenders: readonly LenderEntity[],
  rows: readonly NoPayslipRow[]
): TeaSpread {
  const ids = new Set(rows.map(r => r.id))
  let min: number | null = null
  let max: number | null = null
  let withRate = 0
  for (const l of lenders) {
    if (!ids.has(l.id)) continue
    const lo = l.teaPct != null && l.teaPct > 0 ? l.teaPct : null
    const hi = l.teaMaxPct != null && l.teaMaxPct > 0 ? l.teaMaxPct : null
    const low = lo ?? hi
    const high = hi ?? lo
    if (low == null || high == null) continue
    withRate++
    min = min == null ? low : Math.min(min, low)
    max = max == null ? high : Math.max(max, high)
  }
  return { min, max, withRate }
}

export interface NoPayslipFaqInput {
  rows: readonly NoPayslipRow[]
  spread: TeaSpread
  /** Live usury cap for consumer loans in pesos under 10.000 UI, short term, e.g. "133,49 %". */
  capLabel: string
  /** When that cap took effect, e.g. "1 de setiembre de 2026". */
  capSince: string
}

export interface NoPayslipFaq {
  id: string
  question: string
  answer: string
}

/**
 * The FAQ is a FUNCTION of the data, never hand-typed numbers: the count of lenders, the rate
 * range and the usury cap all change without anybody editing this file.
 */
export function buildNoPayslipFaq({
  rows,
  spread,
  capLabel,
  capSince,
}: NoPayslipFaqInput): NoPayslipFaq[] {
  const withClearing = rows.filter(r => r.clearing === 'si').length
  const soloCedula = SOLO_CEDULA_LENDERS.filter(l => l.soloCedula === 'si').map(l => l.name)
  const range =
    spread.min != null && spread.max != null
      ? `Entre las ${rows.length} instituciones que atienden a quien no tiene recibo, las tasas efectivas anuales publicadas van de ${pctEs(spread.min)} a ${pctEs(spread.max)}.`
      : `No todas las ${rows.length} instituciones publican su tasa.`
  return [
    {
      id: 'se-puede',
      question: '¿Puedo pedir un préstamo sin recibo de sueldo en Uruguay?',
      answer:
        'Sí. Hay tres caminos: presentar un certificado de ingresos firmado por un contador público si trabajás por tu cuenta y estás inscripto (el BROU lo acepta con dos años de aportes continuos), pedirlo en una financiera que evalúa sólo con la cédula (OCA y Pronto! lo publican, a tasas más altas), o dejar una garantía, como en un empeño o un crédito prendario.',
    },
    {
      id: 'solo-cedula',
      question: 'Préstamos solo con cédula: ¿quién los da de verdad?',
      answer: `${soloCedula.join(' y ')} lo anuncian en sus propias páginas (leídas el 22 de setiembre de 2026). Creditel pide además tres facturas de UTE, OSE o Antel a tu nombre si no tenés comprobante. Crédito de la Casa, Verde, ANDA y República Microfinanzas piden recibo o actividad documentada, aunque algún comparador las liste como "sólo con cédula". "Sólo con cédula" quiere decir sin comprobante de ingresos, no sin mirar el clearing: OCA exige no figurar en él, y sólo Pronto! dice prestar estando en el clearing.`,
    },
    {
      id: 'certificado',
      question: '¿Qué es el certificado de ingresos que piden en lugar del recibo?',
      answer:
        'Es un documento firmado por un contador público que declara tus ingresos formales. El BROU pide que tenga menos de 30 días desde su emisión y que el contador adjunte el certificado de la Caja de Profesionales. Para que el contador pueda firmarlo, tus ingresos tienen que estar registrados: facturas, aportes a BPS y declaraciones ante DGI.',
    },
    {
      id: 'cuanto-cuesta',
      question: '¿Cuánto cuesta un préstamo sin recibo de sueldo?',
      answer: `${range} Las que piden sólo la cédula están en la parte alta. Por encima del tope legal hay usura: para préstamos en pesos de menos de 10.000 UI a menos de un año, el tope es ${capLabel}, vigente desde el ${capSince}. Compará siempre el costo total, no la cuota.`,
    },
    {
      id: 'clearing',
      question: '¿Y si además estoy en el clearing?',
      answer: `${withClearing} de las ${rows.length} instituciones de esta lista publican que prestan con antecedentes negativos. OCA y el BROU exigen no figurar en el clearing, así que ahí la puerta de la cédula se cierra. Antes de endeudarte más, mirá cómo regularizar y salir del clearing.`,
    },
    {
      id: 'estafa',
      question: '¿Cómo reconozco un préstamo trucho?',
      answer:
        'Si antes de darte la plata te piden un pago por gastos, seguro o gestión, es estafa: ningún prestador serio cobra por adelantado para otorgar un préstamo. Verificá también que la institución figure en los registros del Banco Central del Uruguay.',
    },
  ]
}
