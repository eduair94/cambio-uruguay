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

import {
  BCU_LABELS,
  CLEARING_LABELS,
  SEGMENT_LABELS,
  representativeTea,
  type ClearingStance,
  type LenderEntity,
  type LenderSegment,
} from './loanTierlist'

/** Last time the quotes below were read against their sources. */
export const NOPAYSLIP_LOANS_REVIEWED = '2026-09-16'

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
