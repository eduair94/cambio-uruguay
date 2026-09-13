// One page per courier: `/couriers-uruguay/<slug>`.
//
// "usx cargo" drew 289 Search Console impressions with no page of its own to land on, and Reddit
// asks about specific couriers by name (USX Cargo, Gripper, Aerobox) week after week. Everything a
// courier page needs is already in utils/courierShipping.ts: the tariff each courier publishes, the
// date it was verified, its reputation and the sources behind it. This module turns ONE row into
// ONE page model without adding a fact. Every figure is the catalogue's, every sentence is
// assembled from its fields, and a field the catalogue lacks is said to be unpublished, never
// filled in.
//
// The worked 2 kg parcel comes from `courierParcelQuote`, which follows each courier's own note: a
// rate published "todo incluido" gets nothing added on top, a handling fee published "+IVA" gets its
// IVA, and a fee the note lists on top is shown next to the total. When that fee depends on
// something a generic parcel does not fix, the total is shown as a floor and the courier is left
// out of the price ranking rather than ranked on a price it may not honour.
//
// PURE module (no Vue/Nuxt runtime, relative imports only): the page stays thin and vitest
// exercises every courier's copy directly.

import { COURIER_REFERENCE_KG } from './comparativas'
import {
  COURIERS,
  COURIER_RATES_VERIFIED_AT,
  POSTAL_SURCHARGE,
  courierParcelQuote,
  type Courier,
  type CourierExtraFee,
} from './courierShipping'
import { ENTITY_PAGE_ROUTES, courierPagePath, entityIdForSlug } from './entityPageSlugs'
import {
  SIBLING_LIMIT,
  comparisonLinks,
  dateLabel,
  ensurePeriod,
  fitDescription,
  fitTitle,
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
  title: string
  description: string
  heading: string
  lead: string
  verifiedAt: string
  verifiedLabel: string
  /** Dates the figures and says where they come from. */
  verificationNote: string
  facts: EntityFact[]
  reference: CourierReferenceParcel | null
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
 * neither does one whose note lists a fee a generic parcel cannot price: ranking it on the part it
 * can price would put it above couriers that are actually cheaper.
 */
export function courierReferenceTable(): ReferenceRow[] {
  return COURIERS.flatMap(courier => {
    const quote = courierParcelQuote(courier, COURIER_REFERENCE_KG)
    return quote?.complete ? [{ courier, totalUsd: quote.totalUsd }] : []
  }).sort((a, b) => a.totalUsd - b.totalUsd || a.courier.name.localeCompare(b.courier.name, 'es'))
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

function referenceParcel(
  courier: Courier,
  table: readonly ReferenceRow[]
): CourierReferenceParcel | null {
  const kg = COURIER_REFERENCE_KG
  const quote = courierParcelQuote(courier, kg)
  const perKg = courier.perKgUsd
  if (!quote || perKg === null) return null

  const { label: surchargeLabel, ratePct } = POSTAL_SURCHARGE
  const optional = quote.pendingFees.filter(fee => fee.kind === 'optional')
  const conditional = quote.pendingFees.filter(fee => fee.kind === 'conditional')
  const conditionalLabels = [...new Set(conditional.map(fee => lowerFirst(fee.label)))]

  const rows: CourierParcelRow[] = [
    { label: `${kg} kilos a ${formatUsd(perKg)} el kilo`, value: formatUsd(quote.weightUsd) },
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

/** Build the page model for one courier. Throws for a courier with no slug: CI catches it. */
export function buildCourierPage(courier: Courier): CourierPageModel {
  const path = courierPagePath(courier.id)
  if (!path) throw new Error(`El courier ${courier.id} no tiene slug en utils/entityPageSlugs.ts`)

  const name = courier.name
  const perKg = courier.perKgUsd
  const base = courier.baseUsd
  const transit = courier.transit ?? null
  const note = courier.note ?? null
  const rating = typeof courier.rating === 'number' ? courier.rating : null
  const ratingLabel = rating === null ? null : formatRating(rating)
  const reviewSources = [...(courier.reviewSources ?? [])]
  const hasOpinions = rating !== null || reviewSources.length > 0
  const verifiedLabel = dateLabel(COURIER_RATES_VERIFIED_AT)
  const websiteHost = hostOf(courier.website)
  const table = courierReferenceTable()
  const reference = referenceParcel(courier, table)
  const rate = POSTAL_SURCHARGE.ratePct
  const surchargeLabel = POSTAL_SURCHARGE.label
  const extraFees = courier.extraFees ?? []
  const conditional = extraFees.filter(fee => fee.kind === 'conditional')
  const ivaOnBase = Boolean(courier.baseIvaExcluded && base)

  const title = fitTitle(
    perKg !== null
      ? [
          transit && hasOpinions && `${name}: tarifa por kilo, demora y opiniones`,
          hasOpinions && `${name}: tarifa por kilo y opiniones`,
          transit && `${name}: tarifa por kilo y demora`,
          `${name}: tarifa por kilo`,
          name,
        ]
      : [hasOpinions && `${name}: tarifas y opiniones`, `${name}: tarifas y condiciones`, name]
  )

  const questions = [
    perKg !== null ? 'cuánto cobra por kilo' : 'cómo cotiza',
    transit ? 'cuánto demora' : '',
    hasOpinions ? 'qué dicen los usuarios' : '',
  ].filter(Boolean)
  if (questions.length === 1 && note) questions.push('qué condiciones publica')
  const heading = `${name}: ${joinSpanishList(questions)}`

  // The description leads with the figure people search for, so the part the SERP keeps is the
  // price. Each rung drops the least important clause until it fits.
  const baseWords =
    base === null
      ? ', sin cargo fijo publicado'
      : base === 0
        ? ', sin cargo fijo'
        : ` más ${formatUsd(base)}${ivaOnBase ? ' + IVA' : ''} de cargo fijo`
  let description: string
  if (reference && perKg !== null && reference.complete) {
    const totalWords = courier.rateIncludesSurcharge
      ? 'con su tarifa todo incluido'
      : `con el ${rate}% de ${surchargeLabel}${ivaOnBase ? ' y el IVA del cargo fijo' : ''}`
    const opening = `${name}: un paquete de ${reference.kg} kg sale ${formatUsd(reference.totalUsd)} ${totalWords}.`
    description = fitDescription([
      `${opening} ${formatUsd(perKg)} el kilo${baseWords}${transit ? `, ${transit} de demora` : ''}. Tarifa del ${verifiedLabel}.`,
      `${opening} ${formatUsd(perKg)} el kilo${baseWords}. Tarifa del ${verifiedLabel}.`,
      `${opening} ${formatUsd(perKg)} el kilo${baseWords}.`,
      `${opening} Tarifa del ${verifiedLabel}.`,
      opening,
    ])
  } else if (reference && perKg !== null) {
    const pendingLabels = joinSpanishList([
      ...new Set(conditional.map(fee => lowerFirst(fee.label))),
    ])
    const amounts = joinSpanishList(
      conditional.map(fee => feeAmount(fee)),
      'o'
    )
    const opening = `${name}: ${formatUsd(perKg)} el kilo${baseWords}; un paquete de ${reference.kg} kg sale ${formatUsd(reference.totalUsd)} sin ${pendingLabels}, que va aparte (${amounts}).`
    description = fitDescription([
      `${opening} Tarifa del ${verifiedLabel}.`,
      opening,
      `${name}: ${formatUsd(perKg)} el kilo${baseWords}; ${pendingLabels} aparte (${amounts}).`,
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
      perKg !== null
        ? `Publica una tarifa de referencia de ${formatUsd(perKg)} por kilo en la escala de paquete chico${baseLead}${
            courier.rateIncludesSurcharge ? ', y la presenta como todo incluido' : ''
          }.`
        : `No publica una tarifa fija por kilo: cada envío se cotiza en ${websiteHost}.`,
      transit ? `La demora que declara es de ${transit}.` : 'No publica una demora típica.',
      ratingLabel ? `En reseñas públicas promedia ${ratingLabel} sobre 5.` : '',
    ].join(' ')
  )

  const verificationNote = `Datos revisados el ${verifiedLabel} contra lo que ${name} publica en su sitio. Las tarifas cambian seguido: confirmá el precio con el courier antes de comprar.`

  const quoteNote =
    perKg === null
      ? `${name} no publica una tarifa fija por kilo: cada envío se cotiza en ${websiteHost}. Por eso esta página no muestra un precio por kilo ni un paquete de ejemplo: pedí el presupuesto con el peso real antes de comprar.`
      : null

  const facts: EntityFact[] = [
    { label: 'Modalidad', value: courier.modality },
    {
      label: 'Tarifa por kilo (referencia)',
      value:
        perKg === null
          ? 'No publica tarifa fija: cotiza cada envío en su sitio'
          : `${formatUsd(perKg)}, escala de paquete chico`,
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
    { label: 'Demora típica', value: transit ?? 'No la publica' },
    ...(note ? [{ label: 'Letra chica', value: note }] : []),
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
        `Según su tarifa publicada, verificada el ${verifiedLabel}, ${name} cobra ${formatUsd(perKg)} por kilo en la escala de paquete chico${baseClause}. ${
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
      answer: `${name} no publica una tarifa fija por kilo: cotiza cada envío desde su sitio (${websiteHost}). Por eso acá no figura un precio: pedí el presupuesto con el peso real del paquete antes de comprar.`,
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

  if (transit) {
    faq.push({
      id: 'demora',
      question: `¿Cuánto demora ${name}?`,
      answer: `${name} declara una demora típica de ${transit}. Es la demora que publica el propio courier, no una medición nuestra.`,
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
      ].slice(0, SIBLING_LIMIT)
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

  const sources = uniqueSources([
    { label: `${name}: tarifa publicada`, url: courier.source },
    { label: `${name}: sitio oficial`, url: courier.website },
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
    title,
    description,
    heading,
    lead,
    verifiedAt: COURIER_RATES_VERIFIED_AT,
    verifiedLabel,
    verificationNote,
    facts,
    reference,
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
