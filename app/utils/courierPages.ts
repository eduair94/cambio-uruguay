// One page per courier: `/couriers-uruguay/<slug>`.
//
// The search for a courier by NAME is most of what this family exists for: in the 90 days to
// 2026-10-17, "usx cargo", "urubox", "soycourier", "usx", "exur" and their variants drew several
// thousand impressions, and Google showed one of the head-to-heads (`/comparativas/couriers/*`, up
// to 22 different ones for "usx cargo") far more often than the courier's own page. So the page
// leads with what someone typing the name wants to know, in the order they want it: the price per
// kilo with the date it was read, where the warehouse is, how the parcel reaches them in Uruguay,
// how long it takes, and a calculator by weight.
//
// Every figure comes from utils/courierShipping.ts with what the courier's own site said on the day
// it was read laid on top (utils/courierChecks.ts, `verifiedCourier`). This module turns ONE row
// into ONE page model without adding a fact: every sentence is assembled from fields, and a field
// that is missing is said to be unpublished, never filled in.
//
// The worked parcel comes from `courierParcelQuote`, which follows each courier's own note: a
// rate published "todo incluido" gets nothing added on top, a handling fee published "+IVA" gets its
// IVA, and a fee the note lists on top is shown next to the total. When that fee depends on
// something a generic parcel does not fix, the total is shown as a floor and the courier is left
// out of the price ranking rather than ranked on a price it may not honour.
//
// PURE module (no Vue/Nuxt runtime, relative imports only): the page stays thin and vitest
// exercises every courier's copy directly.

import { COURIER_REFERENCE_KG } from './comparativas'
import {
  courierCheck,
  courierOperating,
  verifiedCourier,
  verifiedCouriers,
  type CourierOrigin,
} from './courierChecks'
import {
  COURIERS,
  COURIER_RATES_VERIFIED_AT,
  POSTAL_SURCHARGE,
  courierParcelQuote,
  type Courier,
  type CourierExtraFee,
  type CourierParcelQuote,
} from './courierShipping'
import { ENTITY_PAGE_ROUTES, courierPagePath, entityIdForSlug } from './entityPageSlugs'
import {
  SIBLING_LIMIT,
  comparisonLinks,
  dateLabel,
  ensurePeriod,
  fitDescription,
  fitTitle,
  formatNumberEs,
  formatRating,
  formatUsd,
  hostOf,
  joinSpanishList,
  lowerFirst,
  nearest,
  normalizeSpaces,
  uniqueSources,
  type EntityFact,
  type EntityFaq,
  type EntityLink,
  type EntitySource,
} from './entityPages'
import { IVA_TASA_BASICA } from './ivaTarjeta'
import type { ReviewSource } from './reviews'

const ROUTE = ENTITY_PAGE_ROUTES.couriers

/** Two totals closer than half a cent are the same price. */
const CENT = 0.005

/** One line of the worked parcel. */
export interface CourierParcelRow {
  label: string
  value: string
  /** `total` for the worked total; `aside` for a published fee shown next to it, not added. */
  kind?: 'total' | 'aside'
}

/** The reference parcel, costed with this courier's published tariff and its own note. */
export interface CourierReferenceParcel {
  kg: number
  tariffUsd: number
  baseIvaUsd: number
  surchargeUsd: number
  totalUsd: number
  /** `false` when a published fee may apply that a generic parcel cannot price: the total is a floor. */
  complete: boolean
  /** 1-based position among the couriers with a complete price; `null` when this one has none. */
  rank: number | null
  /** How many couriers have a complete price for the parcel. */
  of: number
  rows: CourierParcelRow[]
  /** Where this courier lands among the others, or why it is not ranked. */
  position: string
  /** What the note changes about the arithmetic, one sentence each. */
  caveats: string[]
  /** `position` plus the caveats a reader needs before trusting the number. */
  comparison: string
}

/** The statutory postal surcharge, read from `POSTAL_SURCHARGE` so no page types its acronym. */
export interface CourierSurcharge {
  ratePct: number
  label: string
  name: string
  base: string
  summary: string
  /** The words the reader's own invoice may use, as one readable list. */
  aliases: string
  faqPath: string
  source: string
  sourceUrl: string
  /** `true` when this courier publishes its rate as all-inclusive: the page adds no surcharge. */
  included: boolean
}

/** The weights the page's calculator offers: whole kilos inside the tier the rate belongs to. */
export interface CourierEstimator {
  minKg: number
  maxKg: number
  options: number[]
}

/** The courier's own calculator, as it answered on the day it was read. */
export interface CourierCalculatorView {
  url: string
  host: string
  /** What was typed in besides the weight. */
  inputs: string
  /** Its breakdown for the reference parcel, formatted. */
  lines: CourierParcelRow[]
  /** Its totals by weight, formatted. */
  readings: Array<{ kg: number; totalUsd: number; label: string; value: string }>
  excludes: string | null
  /** The total it printed for the reference parcel, when it was asked about that weight. */
  referenceUsd: number | null
}

/** One weight priced with the courier's tariff: what the calculator on the page shows. */
export interface CourierEstimate {
  kg: number
  totalUsd: number
  complete: boolean
  rows: CourierParcelRow[]
}

export interface CourierPageModel {
  id: string
  slug: string
  path: string
  indexPath: string
  indexLabel: string
  name: string
  modality: string
  website: string
  websiteHost: string
  perKgUsd: number | null
  /** `calculadora` when the per-kilo rate is the courier's calculator output, not a price list. */
  rateSource: 'tarifario' | 'calculadora'
  title: string
  description: string
  heading: string
  lead: string
  verifiedAt: string
  verifiedLabel: string
  /** Dates the figures and says where they come from. */
  verificationNote: string
  /** `false` when the courier's own site says it is not flying. */
  operating: boolean
  /** What the courier's site announces that a reader must see first. */
  notice: string | null
  /** Where purchases are received abroad, as a sentence fragment: `Miami, Florida (3 a 7 días)`. */
  originsText: string | null
  /** How the parcel reaches the reader in Uruguay. */
  inUruguay: string | null
  payment: string | null
  facts: EntityFact[]
  reference: CourierReferenceParcel | null
  estimator: CourierEstimator | null
  calculator: CourierCalculatorView | null
  /** How to read the calculator's totals next to this page's arithmetic. */
  calculatorNote: string | null
  /** The courier's own calculator, when it has one, even if it was not asked about a weight. */
  calculatorUrl: string | null
  /** For a courier with no per-kg tariff: how it quotes instead. */
  quoteNote: string | null
  rating: number | null
  ratingLabel: string | null
  reviewsNote: string | null
  reviewSources: ReviewSource[]
  surcharge: CourierSurcharge
  faq: EntityFaq[]
  comparisons: EntityLink[]
  siblings: EntityLink[]
  tools: EntityLink[]
  sources: EntitySource[]
}

interface ReferenceRow {
  courier: Courier
  totalUsd: number
}

/**
 * The couriers whose reference parcel has a complete price, cheapest first. A courier that only
 * quotes through its own calculator has no row (there is nothing published to compute from), and
 * neither does one whose note lists a fee a generic parcel cannot price — ranking it on the part it
 * can price would put it above couriers that are actually cheaper — or one whose site says it is
 * not flying.
 */
export function courierReferenceTable(): ReferenceRow[] {
  return verifiedCouriers()
    .filter(courier => courierOperating(courier.id))
    .flatMap(courier => {
      const quote = courierParcelQuote(courier, COURIER_REFERENCE_KG)
      return quote?.complete ? [{ courier, totalUsd: quote.totalUsd }] : []
    })
    .sort((a, b) => a.totalUsd - b.totalUsd || a.courier.name.localeCompare(b.courier.name, 'es'))
}

/** `Despacho de aduana (hasta 800)`: a fee's label with the note's own qualifier. */
function feeLabel(fee: CourierExtraFee): string {
  return fee.when ? `${fee.label} (${fee.when})` : fee.label
}

/** `~US$ 7,50` or `US$ 75,00`, marking an amount the note gives as approximate. */
function feeAmount(fee: CourierExtraFee): string {
  return `${fee.approximate ? '~' : ''}${formatUsd(fee.usd)}`
}

/** `despacho de aduana de US$ 75,00 (hasta 800) o US$ 135,00 (más de 800)`, grouped by label. */
function feesText(fees: readonly CourierExtraFee[]): string {
  const labels = [...new Set(fees.map(fee => fee.label))]
  return joinSpanishList(
    labels.map(label => {
      const amounts = fees
        .filter(fee => fee.label === label)
        .map(fee => `${feeAmount(fee)}${fee.when ? ` (${fee.when})` : ''}`)
      return `${lowerFirst(label)} de ${joinSpanishList(amounts, 'o')}`
    })
  )
}

/** The handling fee as a value: `US$ 5,00 + IVA`, `Sin cargo fijo` or `No publica cargo fijo`. */
function baseValue(courier: Courier): string {
  if (courier.baseUsd === null) return 'No publica cargo fijo'
  if (courier.baseUsd === 0) return 'No cobra cargo fijo aparte'
  return `${formatUsd(courier.baseUsd)}${courier.baseIvaExcluded ? ' + IVA' : ''}`
}

/** `2 kilos`, `1 kilo`. */
function kilos(kg: number): string {
  return `${formatNumberEs(kg)} ${kg === 1 ? 'kilo' : 'kilos'}`
}

/** The worked rows for one quote: weight, handling fee, surcharge, IVA, total and the fees aside. */
function parcelRows(courier: Courier, quote: CourierParcelQuote): CourierParcelRow[] {
  const { label: surchargeLabel, ratePct } = POSTAL_SURCHARGE
  const conditional = quote.pendingFees.filter(fee => fee.kind === 'conditional')
  const conditionalLabels = [...new Set(conditional.map(fee => lowerFirst(fee.label)))]
  return [
    {
      label: `${kilos(quote.kg)} a ${formatUsd(courier.perKgUsd ?? 0)} el kilo`,
      value: formatUsd(quote.weightUsd),
    },
    { label: 'Cargo fijo por envío', value: baseValue(courier) },
    { label: 'Tarifa del envío', value: formatUsd(quote.tariffUsd) },
    {
      label: `${surchargeLabel} (${ratePct}% sobre la tarifa)`,
      value: courier.rateIncludesSurcharge
        ? 'No se suma: tarifa todo incluido'
        : formatUsd(quote.surchargeUsd),
    },
    ...(quote.baseIvaUsd > 0
      ? [
          {
            label: `IVA ${IVA_TASA_BASICA}% sobre el cargo fijo`,
            value: formatUsd(quote.baseIvaUsd),
          },
        ]
      : []),
    {
      label: quote.complete ? 'Total del envío' : `Total sin ${joinSpanishList(conditionalLabels)}`,
      value: formatUsd(quote.totalUsd),
      kind: 'total',
    },
    ...quote.pendingFees.map(fee => ({
      label: `Aparte: ${lowerFirst(feeLabel(fee))}`,
      value: feeAmount(fee),
      kind: 'aside' as const,
    })),
  ]
}

function referenceParcel(
  courier: Courier,
  table: readonly ReferenceRow[]
): CourierReferenceParcel | null {
  const kg = COURIER_REFERENCE_KG
  const quote = courierParcelQuote(courier, kg)
  if (!quote) return null

  const { label: surchargeLabel, ratePct } = POSTAL_SURCHARGE
  const optional = quote.pendingFees.filter(fee => fee.kind === 'optional')
  const conditional = quote.pendingFees.filter(fee => fee.kind === 'conditional')
  const rows = parcelRows(courier, quote)

  const mine = table.find(row => row.courier.id === courier.id)
  const cheapest = table[0]
  const of = table.length
  let rank: number | null = null
  let position: string
  if (mine && cheapest) {
    rank = 1 + table.filter(row => row.totalUsd < mine.totalUsd - CENT).length
    const tied = table
      .filter(row => row.courier.id !== courier.id && Math.abs(row.totalUsd - mine.totalUsd) < CENT)
      .map(row => row.courier.name)
    if (rank === 1) {
      const runnerUp = table.find(
        row => row.courier.id !== courier.id && !tied.includes(row.courier.name)
      )
      position = tied.length
        ? `Para ${kg} kilos es el más barato de los ${of} couriers con un precio completo publicado, empatado con ${joinSpanishList(tied)}.`
        : `Para ${kg} kilos es el más barato de los ${of} couriers con un precio completo publicado${
            runnerUp
              ? `; le sigue ${runnerUp.courier.name}, con ${formatUsd(runnerUp.totalUsd)}`
              : ''
          }.`
    } else {
      position = `Para ${kg} kilos queda ${rank}º de ${of} entre los couriers con un precio completo publicado${
        tied.length ? `, empatado con ${joinSpanishList(tied)}` : ''
      }. El más barato para ese paquete es ${cheapest.courier.name}, con ${formatUsd(cheapest.totalUsd)}.`
    }
  } else if (!courierOperating(courier.id)) {
    position =
      'No entra en el orden por precio: su sitio avisa que suspendió los vuelos, así que hoy no es una opción para traer un paquete.'
  } else {
    position = `No entra en el orden por precio: su tarifa publica además ${feesText(conditional)}, que no se puede asignar a un paquete genérico. El total de arriba es un piso, no un precio.`
  }

  const caveats = [
    courier.baseUsd === null
      ? `${courier.name} no publica cargo fijo por envío, así que la cuenta no suma ninguno.`
      : '',
    courier.rateIncludesSurcharge
      ? `${courier.name} publica su tarifa como todo incluido, así que la cuenta no le suma el ${ratePct}% de ${surchargeLabel} aparte.`
      : '',
    quote.baseIvaUsd > 0
      ? `Su cargo fijo se publica más IVA, y la cuenta le suma el ${IVA_TASA_BASICA}%.`
      : '',
    optional.length ? `No suma lo que su tarifa cobra aparte: ${feesText(optional)}.` : '',
  ].filter(Boolean)

  const comparison = normalizeSpaces(
    [
      position,
      ...caveats,
      'La cuenta usa la escala de paquete chico de su tarifa: para paquetes más pesados, mirá los tramos en la letra chica o en el sitio del courier.',
      'No incluye los impuestos de aduana, que dependen del valor de lo que compraste y no del courier.',
    ].join(' ')
  )

  return {
    kg,
    tariffUsd: quote.tariffUsd,
    baseIvaUsd: quote.baseIvaUsd,
    surchargeUsd: quote.surchargeUsd,
    totalUsd: quote.totalUsd,
    complete: quote.complete,
    rank,
    of,
    rows,
    position,
    caveats,
    comparison,
  }
}

/**
 * One weight priced with a courier's tariff, for the calculator on its page. `null` outside the
 * whole kilos the tariff's tier covers: a flat `base + kilo × rate` past a tier boundary would
 * print a price the courier does not charge.
 */
export function courierEstimate(id: string, kg: number): CourierEstimate | null {
  const row = COURIERS.find(candidate => candidate.id === id)
  const range = courierCheck(id)?.estimatorKg
  if (!row || !range || !Number.isInteger(kg) || kg < range.min || kg > range.max) return null
  const courier = verifiedCourier(row)
  const quote = courierParcelQuote(courier, kg)
  if (!quote) return null
  return {
    kg,
    totalUsd: quote.totalUsd,
    complete: quote.complete,
    rows: parcelRows(courier, quote),
  }
}

/** `Miami, Florida (3 a 7 días) y Madrid, España (9 a 15 días)`. */
function originsText(origins: readonly CourierOrigin[]): string | null {
  if (!origins.length) return null
  return joinSpanishList(
    origins.map(origin => (origin.transit ? `${origin.place} (${origin.transit})` : origin.place))
  )
}

/** `usxcargo.com`, `puntomio.uy/calculadora`: a URL as a reader would type it. */
function displayUrl(url: string): string {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '')
}

/** Two spellings of the same page: with or without `www.` and the trailing slash. */
function sameUrl(a: string, b: string): boolean {
  return displayUrl(a) === displayUrl(b)
}

/** `Miami y Madrid`: just the cities, for the title-length places of the copy. */
function originCities(origins: readonly CourierOrigin[]): string {
  return joinSpanishList(origins.map(origin => origin.place.split(',')[0]?.trim() ?? origin.place))
}

/** Build the page model for one courier. Throws for a courier with no slug: CI catches it. */
export function buildCourierPage(row: Courier): CourierPageModel {
  const path = courierPagePath(row.id)
  if (!path) throw new Error(`El courier ${row.id} no tiene slug en utils/entityPageSlugs.ts`)

  const courier = verifiedCourier(row)
  const check = courierCheck(courier.id)
  const name = courier.name
  const perKg = courier.perKgUsd
  const base = courier.baseUsd
  const transit = courier.transit ?? null
  const note = courier.note ?? null
  const rating = typeof courier.rating === 'number' ? courier.rating : null
  const ratingLabel = rating === null ? null : formatRating(rating)
  const reviewSources = [...(courier.reviewSources ?? [])]
  const hasOpinions = rating !== null || reviewSources.length > 0
  const verifiedAt = check?.checkedAt ?? COURIER_RATES_VERIFIED_AT
  const verifiedLabel = dateLabel(verifiedAt)
  const websiteHost = hostOf(courier.website)
  const table = courierReferenceTable()
  const reference = referenceParcel(courier, table)
  const rate = POSTAL_SURCHARGE.ratePct
  const surchargeLabel = POSTAL_SURCHARGE.label
  const extraFees = courier.extraFees ?? []
  const conditional = extraFees.filter(fee => fee.kind === 'conditional')
  const ivaOnBase = Boolean(courier.baseIvaExcluded && base)
  const operating = courierOperating(courier.id)
  const notice = check?.notice ?? null
  const origins = check?.origins ?? []
  const where = originsText(origins)
  const cities = origins.length ? originCities(origins) : null
  const inUruguay = check?.inUruguay ?? null
  const payment = check?.payment ?? null
  const rateSource = check?.rateSource ?? 'tarifario'
  const calculatorUrl = check?.calculatorUrl ?? null
  const kg = COURIER_REFERENCE_KG

  const calculatorCheck = check?.calculator
  const calculator: CourierCalculatorView | null =
    calculatorCheck && calculatorUrl
      ? {
          url: calculatorUrl,
          host: hostOf(calculatorUrl),
          inputs: calculatorCheck.inputs,
          lines: calculatorCheck.lines.map(line => ({
            label: line.label,
            value: formatUsd(line.usd),
          })),
          readings: calculatorCheck.readings.map(reading => ({
            kg: reading.kg,
            totalUsd: reading.totalUsd,
            label: kilos(reading.kg),
            value: formatUsd(reading.totalUsd),
          })),
          excludes: calculatorCheck.excludes ?? null,
          referenceUsd:
            calculatorCheck.readings.find(reading => reading.kg === kg)?.totalUsd ?? null,
        }
      : null

  const range = check?.estimatorKg
  // A courier that is not flying gets no calculator: there is nothing to send.
  const estimator: CourierEstimator | null =
    perKg !== null && range && operating
      ? {
          minKg: range.min,
          maxKg: range.max,
          options: Array.from({ length: range.max - range.min + 1 }, (_, i) => range.min + i),
        }
      : null
  const hasCalculator = Boolean(estimator || calculatorUrl)

  // A calculator total and this page's arithmetic can differ, and neither is wrong: the page applies
  // one rule to every courier, the calculator shows what the courier chose to show.
  const calculatorNote = !calculator
    ? null
    : normalizeSpaces(
        [
          calculator.lines.length
            ? `Su desglose para ${kilos(kg)}: ${calculator.lines
                .map(line => `${lowerFirst(line.label)}, ${line.value}`)
                .join('; ')}.`
            : '',
          calculator.excludes
            ? `Según la propia calculadora, no incluye ${calculator.excludes}.`
            : '',
          perKg !== null
            ? `Puede no coincidir con la cuenta de arriba, que aplica a todos los couriers el mismo criterio: suma el ${POSTAL_SURCHARGE.ratePct}% de ${POSTAL_SURCHARGE.label} salvo que la tarifa se publique como todo incluido, y muestra aparte los cargos que dependen de cómo recibís el paquete. Lo que vale es lo que diga tu factura.`
            : 'Es lo que mostró la calculadora ese día con esos datos: para tu paquete, pedí el presupuesto con su peso y su valor reales.',
        ].join(' ')
      )

  // Titles: the name first, then the figure people search the name for. The calculator rung goes
  // first because "<courier> calculadora" is the most common modifier after the bare name.
  const title = fitTitle(
    !operating
      ? [`${name}: vuelos suspendidos y tarifa`, `${name}: vuelos suspendidos`, name]
      : perKg !== null
        ? [
            hasCalculator && `${name}: ${formatUsd(perKg)} el kilo y calculadora`,
            `${name}: ${formatUsd(perKg)} el kilo`,
            name,
          ]
        : calculator?.referenceUsd != null
          ? [
              `${name}: ${kg} kg por ${formatUsd(calculator.referenceUsd)} y calculadora`,
              `${name}: ${kg} kg por ${formatUsd(calculator.referenceUsd)}`,
              name,
            ]
          : [hasOpinions && `${name}: tarifas y opiniones`, `${name}: tarifas y condiciones`, name]
  )

  const questions = [
    perKg !== null
      ? 'cuánto cobra por kilo'
      : calculator
        ? 'cuánto cobra su calculadora'
        : 'cómo cotiza',
    where ? 'dónde está el casillero' : '',
    transit ? 'cuánto demora' : hasOpinions ? 'qué dicen los usuarios' : '',
  ].filter(Boolean)
  if (questions.length === 1 && note) questions.push('qué condiciones publica')
  const heading = operating
    ? `${name}: ${joinSpanishList(questions)}`
    : `${name}: vuelos suspendidos, tarifa y casillero`

  // The description leads with the figure people search for, so the part the SERP keeps is the
  // price and its date. Each rung drops the least important clause until it fits.
  const baseWords =
    base === null
      ? ', sin cargo fijo publicado'
      : base === 0
        ? ', sin cargo fijo'
        : ` más ${formatUsd(base)}${ivaOnBase ? ' + IVA' : ''} de cargo fijo`
  const whereWords = cities ? `Casillero en ${cities}${transit ? `, demora ${transit}` : ''}.` : ''
  const whereShort = cities ? `Casillero en ${cities}.` : ''
  const calculatorWords = estimator ? 'Calculá tu envío por peso.' : ''
  let description: string
  if (!operating) {
    const opening = `${name} suspendió sus vuelos hasta nuevo aviso, según su sitio al ${verifiedLabel}.`
    const tariff = perKg !== null ? `Su tarifa: ${formatUsd(perKg)} el kilo${baseWords}.` : ''
    description = fitDescription([
      `${opening} ${tariff} Couriers que sí vuelan, con precio.`,
      `${opening} ${tariff}`,
      opening,
    ])
  } else if (reference && perKg !== null) {
    let opening: string
    if (rateSource === 'calculadora' && calculator?.referenceUsd != null) {
      // The rate IS the calculator's: quote what it printed, not this page's arithmetic on top.
      opening = `${name}: ${formatUsd(perKg)} el kilo${baseWords} según su calculadora, que el ${verifiedLabel} devolvió ${formatUsd(calculator.referenceUsd)} por ${kg} kg.`
    } else if (reference.complete) {
      const totalWords = courier.rateIncludesSurcharge
        ? 'con su tarifa todo incluido'
        : `con el ${rate}% de ${surchargeLabel}${ivaOnBase ? ' y el IVA del cargo fijo' : ''}`
      opening = `${name}: ${formatUsd(perKg)} el kilo${baseWords}, tarifa del ${verifiedLabel}. ${kg} kg salen ${formatUsd(reference.totalUsd)} ${totalWords}.`
    } else {
      const pendingLabels = joinSpanishList([
        ...new Set(conditional.map(fee => lowerFirst(fee.label))),
      ])
      const amounts = joinSpanishList(
        conditional.map(fee => feeAmount(fee)),
        'o'
      )
      opening = `${name}: ${formatUsd(perKg)} el kilo${baseWords}, tarifa del ${verifiedLabel}. ${kg} kg salen ${formatUsd(reference.totalUsd)} sin ${pendingLabels}, que va aparte (${amounts}).`
    }
    const bare = `${name}: ${formatUsd(perKg)} el kilo${baseWords}, ${rateSource === 'calculadora' ? 'según su calculadora' : 'tarifa'} del ${verifiedLabel}.`
    description = fitDescription([
      `${opening} ${whereWords} ${calculatorWords}`,
      `${opening} ${whereWords}`,
      `${opening} ${whereShort} ${calculatorWords}`,
      `${opening} ${whereShort}`,
      `${opening} ${calculatorWords}`,
      opening,
      `${bare} ${whereShort}`,
      bare,
    ])
  } else if (calculator?.referenceUsd != null) {
    const short = `${name}: su calculadora cobró ${formatUsd(calculator.referenceUsd)} por ${kg} kg el ${verifiedLabel}`
    const others = calculator.readings.filter(reading => reading.kg !== kg)
    const withOthers = others.length
      ? `${short} (${joinSpanishList(others.map(reading => `${reading.value} por ${reading.kg} kg`))}).`
      : `${short}.`
    const ratingWords = ratingLabel ? `${ratingLabel} sobre 5 en reseñas públicas.` : ''
    description = fitDescription([
      `${withOthers} ${whereWords} ${ratingWords}`,
      `${withOthers} ${whereWords}`,
      withOthers,
      `${short}. ${whereWords}`,
      `${short}.`,
    ])
  } else {
    description = fitDescription([
      ratingLabel &&
        `${name}: ${ratingLabel} sobre 5 en reseñas públicas. No publica tarifa por kilo: cotiza cada envío en ${websiteHost}. Qué dicen los usuarios y cómo se compara.`,
      `${name} no publica tarifa por kilo: cotiza cada envío en ${websiteHost}. Sus condiciones${
        hasOpinions ? ', opiniones' : ''
      } y cómo se compara con otros couriers de Uruguay.`,
      `${name} no publica tarifa por kilo: cotiza cada envío en ${websiteHost}.`,
    ])
  }

  const baseLead =
    base === null
      ? ' y no publica cargo fijo por envío'
      : base === 0
        ? ', sin cargo fijo por envío'
        : `, más ${formatUsd(base)}${ivaOnBase ? ' + IVA' : ''} fijos por envío`
  const lead = normalizeSpaces(
    [
      `${name} es un courier puerta a puerta que funciona como ${lowerFirst(courier.modality)}.`,
      !operating && notice ? `${ensurePeriod(notice)}` : '',
      perKg !== null
        ? `${rateSource === 'calculadora' ? 'Su calculadora cobra' : 'Su tarifa de referencia cobra'} ${formatUsd(perKg)} por kilo en la escala de paquete chico${baseLead}${
            courier.rateIncludesSurcharge ? ', y la presenta como todo incluido' : ''
          }.`
        : calculator?.referenceUsd != null
          ? `No publica una tarifa fija por kilo; su calculadora cobró ${formatUsd(calculator.referenceUsd)} por un paquete de ${kg} kilos.`
          : `No publica una tarifa fija por kilo: cada envío se cotiza en ${websiteHost}.`,
      where ? `Recibe tus compras en ${where}.` : '',
      transit && !origins.some(origin => origin.transit)
        ? `La demora que declara es de ${transit}.`
        : !transit && !origins.some(origin => origin.transit)
          ? 'No publica una demora típica.'
          : '',
      ratingLabel ? `En reseñas públicas promedia ${ratingLabel} sobre 5.` : '',
    ].join(' ')
  )

  const verificationNote = `Datos leídos el ${verifiedLabel} en el sitio de ${name}. Las tarifas cambian seguido: confirmá el precio con el courier antes de comprar.`

  const quoteNote =
    perKg === null
      ? `${name} no publica una tarifa fija por kilo: cada envío se cotiza en ${websiteHost}. Por eso esta página no hace la cuenta por kilo${
          calculator ? ' y muestra lo que devolvió su calculadora' : ''
        }: pedí el presupuesto con el peso real antes de comprar.`
      : null

  const facts: EntityFact[] = [
    ...(notice ? [{ label: 'Aviso del courier', value: ensurePeriod(notice) }] : []),
    { label: 'Modalidad', value: courier.modality },
    {
      label: 'Tarifa por kilo (referencia)',
      value:
        perKg === null
          ? 'No publica tarifa fija: cotiza cada envío en su sitio'
          : `${formatUsd(perKg)}, escala de paquete chico${
              rateSource === 'calculadora' ? ', según su calculadora' : ''
            }`,
    },
    { label: 'Cargo fijo por envío', value: baseValue(courier) },
    ...(extraFees.length
      ? [
          {
            label: 'Otros cargos que publica',
            value: extraFees.map(fee => `${feeLabel(fee)}: ${feeAmount(fee)}`).join('; '),
          },
        ]
      : []),
    ...(where ? [{ label: 'Dónde está el casillero', value: where }] : []),
    { label: 'Demora típica', value: transit ?? 'No la publica' },
    ...(inUruguay ? [{ label: 'Retiro y entrega en Uruguay', value: inUruguay }] : []),
    ...(payment ? [{ label: 'Cómo se paga', value: payment }] : []),
    ...(note ? [{ label: 'Letra chica', value: note }] : []),
    ...(check?.alsoPublishes ? [{ label: 'Además publica', value: check.alsoPublishes }] : []),
    {
      label: 'Recargo de ley',
      value: courier.rateIncludesSurcharge
        ? `Tarifa publicada como todo incluido: esta página no le suma el ${rate}% de ${surchargeLabel} aparte`
        : `${rate}% de ${surchargeLabel} sobre ${POSTAL_SURCHARGE.base}`,
    },
    {
      label: 'Reputación',
      value:
        ratingLabel === null
          ? 'Sin puntaje numérico verificable'
          : `${ratingLabel} / 5 en reseñas públicas`,
    },
    { label: 'Sitio oficial', value: websiteHost },
  ]

  const surcharge: CourierSurcharge = {
    ratePct: rate,
    label: surchargeLabel,
    name: POSTAL_SURCHARGE.name,
    base: POSTAL_SURCHARGE.base,
    summary: POSTAL_SURCHARGE.summary,
    aliases: joinSpanishList(
      POSTAL_SURCHARGE.aliases.map(alias => `«${alias}»`),
      'o'
    ),
    faqPath: POSTAL_SURCHARGE.faqPath,
    source: POSTAL_SURCHARGE.source,
    sourceUrl: POSTAL_SURCHARGE.sourceUrl,
    included: Boolean(courier.rateIncludesSurcharge),
  }

  const faq: EntityFaq[] = []
  if (perKg !== null) {
    const baseClause =
      base === null
        ? '; no publica cargo fijo por envío'
        : base === 0
          ? ', sin cargo fijo por envío'
          : `, más un cargo fijo de ${formatUsd(base)}${ivaOnBase ? ' + IVA' : ''} por envío`
    faq.push({
      id: 'precio-por-kilo',
      question: `¿Cuánto cobra ${name} por kilo?`,
      answer: normalizeSpaces(
        `${!operating && notice ? ensurePeriod(notice) : ''} ${
          rateSource === 'calculadora' ? 'Según su calculadora' : 'Según su tarifa publicada'
        }, leída el ${verifiedLabel}, ${name} cobra ${formatUsd(perKg)} por kilo en la escala de paquete chico${baseClause}. ${
          note ? `La letra chica que publica: ${lowerFirst(ensurePeriod(note))}` : ''
        } ${
          courier.rateIncludesSurcharge
            ? `La presenta como todo incluido, así que esta página no le suma el ${rate}% de ${surchargeLabel} aparte.`
            : `Sobre esa tarifa corre además el ${rate}% de ${surchargeLabel} (${POSTAL_SURCHARGE.name}).`
        }`
      ),
    })
  } else {
    faq.push({
      id: 'precio-por-kilo',
      question: `¿Cuánto cobra ${name} por kilo?`,
      answer: normalizeSpaces(
        `${name} no publica una tarifa fija por kilo: cotiza cada envío desde su sitio (${websiteHost}). ${
          calculator?.referenceUsd != null
            ? `El ${verifiedLabel} su calculadora devolvió ${formatUsd(calculator.referenceUsd)} por ${kg} kilos, con ${calculator.inputs}; para otro peso o destino, pedí el presupuesto en su calculadora.`
            : 'Por eso acá no figura un precio: pedí el presupuesto con el peso real del paquete antes de comprar.'
        }`
      ),
    })
  }

  if (reference && perKg !== null) {
    const terms = [`${formatUsd(perKg)} × ${reference.kg}`]
    if (base) terms.push(`${formatUsd(base)} de cargo fijo`)
    if (reference.surchargeUsd > 0) {
      terms.push(`${formatUsd(reference.surchargeUsd)} del ${rate}% de ${surchargeLabel}`)
    }
    if (reference.baseIvaUsd > 0) {
      terms.push(`${formatUsd(reference.baseIvaUsd)} de IVA sobre el cargo fijo`)
    }
    faq.push({
      id: 'paquete-de-referencia',
      question: `¿Cuánto sale traer un paquete de ${reference.kg} kilos con ${name}?`,
      answer: normalizeSpaces(
        `Con la tarifa de referencia, ${formatUsd(reference.totalUsd)}${
          reference.complete ? '' : ` sin contar ${feesText(conditional)}`
        }: ${terms.join(' + ')}. ${reference.caveats.join(' ')} No incluye los impuestos de aduana, que dependen del valor de lo que compraste y no del courier.`
      ),
    })
    if (reference.rank !== null) {
      faq.push({
        id: 'mas-barato',
        question: `¿${name} es más barato que otros couriers?`,
        answer: `${reference.position} Cada total sigue la tarifa publicada de cada courier: el ${rate}% de ${surchargeLabel} se suma salvo cuando la tarifa se publica como todo incluido, y el IVA del cargo fijo cuando la tarifa lo aclara.`,
      })
    }
  }

  if (where) {
    faq.push({
      id: 'casillero',
      question: `¿Dónde está el casillero de ${name} y dónde retiro el paquete?`,
      answer: normalizeSpaces(
        `${name} recibe tus compras en ${where}. ${
          inUruguay ? ensurePeriod(inUruguay) : ''
        } Es lo que publica su sitio al ${verifiedLabel}.`
      ),
    })
  }

  if (calculatorUrl) {
    const host = hostOf(calculatorUrl)
    faq.push({
      id: 'calculadora',
      question: `¿${name} tiene calculadora de envío?`,
      answer: normalizeSpaces(
        `Sí, en ${host}: ahí pedís el presupuesto con el peso y el valor reales de tu compra. ${
          calculator?.referenceUsd != null
            ? `El ${verifiedLabel}, para ${kg} kilos y con ${calculator.inputs}, devolvió ${formatUsd(calculator.referenceUsd)}.`
            : ''
        } ${
          estimator
            ? `En esta página podés calcular de ${kilos(estimator.minKg)} a ${kilos(estimator.maxKg)} con su tarifa${
                rateSource === 'calculadora' ? '' : ' publicada'
              }, con el mismo criterio que el paquete de ejemplo.`
            : ''
        }`
      ),
    })
  }

  if (transit) {
    // One warehouse: its demora. Several with their own: each one, by where it ships from.
    const timed = origins.filter(origin => origin.transit)
    const declared =
      timed.length > 1
        ? joinSpanishList(timed.map(origin => `${origin.transit} desde ${origin.place}`))
        : transit
    faq.push({
      id: 'demora',
      question: `¿Cuánto demora ${name}?`,
      answer: `${name} declara una demora típica de ${declared}. Es la demora que publica el propio courier, no una medición nuestra.`,
    })
  }

  if (payment) {
    faq.push({
      id: 'pago',
      question: `¿Cómo se paga ${name}?`,
      answer: `${ensurePeriod(payment)} Es lo que publica su sitio al ${verifiedLabel}.`,
    })
  }

  if (courier.reviewsNote) {
    faq.push({
      id: 'opiniones',
      question: `¿Qué opinan los usuarios de ${name}?`,
      answer: normalizeSpaces(
        `${ensurePeriod(courier.reviewsNote)} ${
          ratingLabel ? `En reseñas públicas promedia ${ratingLabel} sobre 5.` : ''
        }`
      ),
    })
  }

  faq.push(
    courier.rateIncludesSurcharge
      ? {
          id: 'recargo-de-ley',
          question: `¿${name} cobra aparte el ${rate}% de ${surchargeLabel}?`,
          answer: `${name} publica su tarifa como todo incluido, así que la cuenta de esta página no le suma el ${rate}% aparte. Ese ${rate}% es la ${POSTAL_SURCHARGE.name}, que corre sobre ${POSTAL_SURCHARGE.base}. ${POSTAL_SURCHARGE.summary} En la factura puede figurar como ${surcharge.aliases}: es el mismo cargo. Fuente: ${POSTAL_SURCHARGE.source}.`,
        }
      : {
          id: 'recargo-de-ley',
          question: `¿Qué es el ${rate}% de ${surchargeLabel} que se suma a la tarifa de ${name}?`,
          answer: `Es la ${POSTAL_SURCHARGE.name}: ${rate}% sobre ${POSTAL_SURCHARGE.base}. ${POSTAL_SURCHARGE.summary} En la factura puede figurar como ${surcharge.aliases}: es el mismo cargo. Fuente: ${POSTAL_SURCHARGE.source}.`,
        }
  )

  // Siblings: with a published tariff, the couriers whose reference parcel costs closest to this
  // one (the real alternatives at that price); without one, the best-rated.
  const others = COURIERS.filter(candidate => candidate.id !== courier.id)
  const siblingCouriers = reference
    ? nearest(
        table.filter(row => row.courier.id !== courier.id),
        row => Math.abs(row.totalUsd - reference.totalUsd),
        SIBLING_LIMIT
      ).map(row => row.courier)
    : [
        ...others
          .filter(candidate => typeof candidate.rating === 'number')
          .sort((a, b) => (b.rating as number) - (a.rating as number)),
        ...others.filter(candidate => typeof candidate.rating !== 'number'),
      ]
        .map(verifiedCourier)
        .slice(0, SIBLING_LIMIT)
  const siblings: EntityLink[] = siblingCouriers.flatMap(candidate => {
    const to = courierPagePath(candidate.id)
    if (!to) return []
    return [
      {
        to,
        label: candidate.name,
        hint:
          candidate.perKgUsd === null
            ? 'cotiza en su sitio'
            : `${formatUsd(candidate.perKgUsd)} el kilo`,
      },
    ]
  })

  const tools: EntityLink[] = [
    { to: ROUTE.index, label: 'Todos los couriers, comparados' },
    { to: '/comparativas/couriers', label: 'Comparativas de couriers uno contra uno' },
    {
      to: '/herramientas/calculadora-impuestos-importacion',
      label: 'Calculadora de impuestos de importación',
    },
    { to: '/franquicia-aduana-uruguay', label: 'Franquicia y aduana: ¿pagás IVA?' },
    { to: '/herramientas/carrito-importacion', label: 'Carrito de importación' },
    {
      to: POSTAL_SURCHARGE.faqPath,
      label: `Qué es la ${surchargeLabel} y cómo controlarla en la factura`,
    },
  ]

  // The pages read on the check date come first, with that date; the catalogue's own source and
  // site follow only when they are a different page.
  const read: EntitySource[] = (check?.sources ?? []).map(url => ({
    label: `${name}: ${displayUrl(url)} (leída el ${verifiedLabel})`,
    url,
  }))
  const unread = (url: string) => !read.some(source => sameUrl(source.url, url))
  const sources = uniqueSources([
    ...read,
    ...(unread(courier.source)
      ? [{ label: `${name}: tarifa publicada`, url: courier.source }]
      : []),
    ...(unread(courier.website) ? [{ label: `${name}: sitio oficial`, url: courier.website }] : []),
    ...(calculatorUrl && unread(calculatorUrl)
      ? [{ label: `${name}: calculadora de envío`, url: calculatorUrl }]
      : []),
    ...reviewSources.map(source => ({ label: source.label, url: source.url })),
    { label: POSTAL_SURCHARGE.source, url: POSTAL_SURCHARGE.sourceUrl },
  ])

  return {
    id: courier.id,
    slug: path.slice(ROUTE.index.length + 1),
    path,
    indexPath: ROUTE.index,
    indexLabel: ROUTE.label,
    name,
    modality: courier.modality,
    website: courier.website,
    websiteHost,
    perKgUsd: perKg,
    rateSource,
    title,
    description,
    heading,
    lead,
    verifiedAt,
    verifiedLabel,
    verificationNote,
    operating,
    notice,
    originsText: where,
    inUruguay,
    payment,
    facts,
    reference,
    estimator,
    calculator,
    calculatorNote,
    calculatorUrl,
    quoteNote,
    rating,
    ratingLabel,
    reviewsNote: courier.reviewsNote ?? null,
    reviewSources,
    surcharge,
    faq,
    comparisons: comparisonLinks('couriers', courier.id),
    siblings,
    tools,
    sources,
  }
}

/** The page model behind a slug, or `undefined` for an unknown one. */
export function getCourierPage(slug: string): CourierPageModel | undefined {
  const id = entityIdForSlug('couriers', slug)
  const courier = id ? COURIERS.find(candidate => candidate.id === id) : undefined
  return courier ? buildCourierPage(courier) : undefined
}

/** Every courier's page model, in catalogue order. */
export function allCourierPages(): CourierPageModel[] {
  return COURIERS.map(buildCourierPage)
}
