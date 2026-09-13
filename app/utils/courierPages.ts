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
// The worked 2 kg parcel is costed by `courierReferenceCost` from the comparativas module, the same
// function behind /comparativas/couriers/<par>, so a courier's page and its head-to-heads can never
// quote two different prices for the same parcel.
//
// PURE module (no Vue/Nuxt runtime, relative imports only): the page stays thin and vitest
// exercises every courier's copy directly.

import { COURIER_REFERENCE_KG, courierReferenceCost, getComparativaFamily } from './comparativas'
import {
  COURIERS,
  COURIER_RATES_VERIFIED_AT,
  POSTAL_SURCHARGE,
  type Courier,
} from './courierShipping'
import { ENTITY_PAGE_ROUTES, courierPagePath, entityIdForSlug } from './entityPageSlugs'
import {
  SIBLING_LIMIT,
  comparisonLinks,
  dateLabel,
  ensurePeriod,
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
import type { ReviewSource } from './reviews'

const ROUTE = ENTITY_PAGE_ROUTES.couriers

/** Two totals closer than half a cent are the same price. */
const CENT = 0.005

/** One line of the worked parcel. */
export interface CourierParcelRow {
  label: string
  value: string
}

/** The reference parcel, costed with this courier's published tariff. */
export interface CourierReferenceParcel {
  kg: number
  tariffUsd: number
  surchargeUsd: number
  totalUsd: number
  /** 1-based position by total among the couriers that publish a per-kg tariff; ties share it. */
  rank: number
  /** How many couriers publish a per-kg tariff. */
  of: number
  rows: CourierParcelRow[]
  /** Where this courier lands among the others, in one or two sentences. */
  position: string
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
 * What the reference parcel costs with every courier that publishes a per-kg tariff, cheapest
 * first. A courier that only quotes through its own calculator has no row: there is nothing
 * published to compute from, and inventing a price is what this family must never do.
 */
export function courierReferenceTable(): ReferenceRow[] {
  const entities = getComparativaFamily('couriers')?.entities ?? []
  return COURIERS.flatMap(courier => {
    const entity = entities.find(candidate => candidate.id === courier.id)
    const totalUsd = entity ? courierReferenceCost(entity) : null
    return totalUsd === null ? [] : [{ courier, totalUsd }]
  }).sort((a, b) => a.totalUsd - b.totalUsd || a.courier.name.localeCompare(b.courier.name, 'es'))
}

function referenceParcel(
  courier: Courier,
  table: readonly ReferenceRow[]
): CourierReferenceParcel | null {
  const perKg = courier.perKgUsd
  const mine = table.find(row => row.courier.id === courier.id)
  const cheapest = table[0]
  if (perKg === null || !mine || !cheapest) return null

  const kg = COURIER_REFERENCE_KG
  const weightUsd = perKg * kg
  const tariffUsd = weightUsd + (courier.baseUsd ?? 0)
  const surchargeUsd = mine.totalUsd - tariffUsd
  const rank = 1 + table.filter(row => row.totalUsd < mine.totalUsd - CENT).length
  const tied = table
    .filter(row => row.courier.id !== courier.id && Math.abs(row.totalUsd - mine.totalUsd) < CENT)
    .map(row => row.courier.name)
  const of = table.length

  const rows: CourierParcelRow[] = [
    { label: `${kg} kilos a ${formatUsd(perKg)} el kilo`, value: formatUsd(weightUsd) },
    {
      label: 'Cargo fijo por envío',
      value: courier.baseUsd === null ? 'No publicado' : formatUsd(courier.baseUsd),
    },
    { label: 'Tarifa del envío', value: formatUsd(tariffUsd) },
    {
      label: `${POSTAL_SURCHARGE.label} (${POSTAL_SURCHARGE.ratePct}% sobre la tarifa)`,
      value: formatUsd(surchargeUsd),
    },
    { label: 'Total del envío', value: formatUsd(mine.totalUsd) },
  ]

  let position: string
  if (rank === 1) {
    const runnerUp = table.find(
      row => row.courier.id !== courier.id && !tied.includes(row.courier.name)
    )
    position = tied.length
      ? `Para ${kg} kilos es el más barato de los ${of} couriers que publican tarifa por kilo, empatado con ${joinSpanishList(tied)}.`
      : `Para ${kg} kilos es el más barato de los ${of} couriers que publican tarifa por kilo${
          runnerUp ? `; le sigue ${runnerUp.courier.name}, con ${formatUsd(runnerUp.totalUsd)}` : ''
        }.`
  } else {
    position = `Para ${kg} kilos queda ${rank}º de ${of} entre los couriers que publican tarifa por kilo${
      tied.length ? `, empatado con ${joinSpanishList(tied)}` : ''
    }. El más barato para ese paquete es ${cheapest.courier.name}, con ${formatUsd(cheapest.totalUsd)}.`
  }

  const comparison = normalizeSpaces(
    [
      position,
      courier.baseUsd === null
        ? `${courier.name} no publica un cargo fijo aparte, así que la cuenta no lo suma.`
        : '',
      'La cuenta usa la escala de paquete chico de su tarifa: para paquetes más pesados, mirá los tramos en la letra chica o en el sitio del courier.',
      'No incluye los impuestos de aduana, que dependen del valor de lo que compraste y no del courier.',
    ].join(' ')
  )

  return {
    kg,
    tariffUsd,
    surchargeUsd,
    totalUsd: mine.totalUsd,
    rank,
    of,
    rows,
    position,
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

  const baseShort =
    base === null ? '' : base === 0 ? ' sin cargo fijo' : ` más ${formatUsd(base)} por envío`
  const description = normalizeSpaces(
    perKg !== null && reference
      ? `${name} cobra ${formatUsd(perKg)} por kilo${baseShort}${
          transit ? ` y declara ${transit} de demora` : ''
        } (tarifa verificada el ${verifiedLabel}). Un paquete de ${reference.kg} kg sale ${formatUsd(
          reference.totalUsd
        )} con el ${rate}% de ley.`
      : `${name} no publica una tarifa fija por kilo: cotiza cada envío en ${websiteHost}.${
          ratingLabel ? ` Reputación de ${ratingLabel} sobre 5 en reseñas públicas.` : ''
        } Sus condiciones${hasOpinions ? ', opiniones' : ''} y cómo se compara con otros couriers de Uruguay.`
  )

  const lead = normalizeSpaces(
    [
      `${name} es un courier puerta a puerta que funciona como ${lowerFirst(courier.modality)}.`,
      perKg !== null
        ? `Publica una tarifa de referencia de ${formatUsd(perKg)} por kilo en la escala de paquete chico${
            base === null
              ? ' y cotiza caso a caso el cargo fijo'
              : base === 0
                ? ', sin cargo fijo por envío'
                : `, más ${formatUsd(base)} fijos por envío`
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
    {
      label: 'Cargo fijo por envío',
      value:
        base === null
          ? 'No publica uno aparte: cotiza caso a caso'
          : base === 0
            ? 'No cobra cargo fijo aparte'
            : formatUsd(base),
    },
    { label: 'Demora típica', value: transit ?? 'No la publica' },
    ...(note ? [{ label: 'Letra chica', value: note }] : []),
    {
      label: 'Recargo de ley',
      value: `${rate}% de ${POSTAL_SURCHARGE.label} sobre ${POSTAL_SURCHARGE.base}`,
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
    label: POSTAL_SURCHARGE.label,
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
  }

  const faq: EntityFaq[] = []
  if (perKg !== null) {
    const baseClause =
      base === null
        ? '; no publica un cargo fijo aparte, lo cotiza caso a caso'
        : base === 0
          ? ', sin cargo fijo por envío'
          : `, más un cargo fijo de ${formatUsd(base)} por envío`
    faq.push({
      id: 'precio-por-kilo',
      question: `¿Cuánto cobra ${name} por kilo?`,
      answer: normalizeSpaces(
        `Según su tarifa publicada, verificada el ${verifiedLabel}, ${name} cobra ${formatUsd(perKg)} por kilo en la escala de paquete chico${baseClause}. ${
          note ? `La letra chica que publica: ${lowerFirst(ensurePeriod(note))}` : ''
        } Sobre esa tarifa corre además el ${rate}% de ${POSTAL_SURCHARGE.label} (${POSTAL_SURCHARGE.name}).`
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
    faq.push({
      id: 'paquete-de-referencia',
      question: `¿Cuánto sale traer un paquete de ${reference.kg} kilos con ${name}?`,
      answer: normalizeSpaces(
        `Con la tarifa de referencia, ${formatUsd(reference.totalUsd)}: ${formatUsd(perKg)} × ${reference.kg}${
          base ? ` + ${formatUsd(base)} de cargo fijo` : ''
        } = ${formatUsd(reference.tariffUsd)} de tarifa, más ${formatUsd(reference.surchargeUsd)} del ${rate}% de ${POSTAL_SURCHARGE.label}. ${
          base === null
            ? `${name} no publica un cargo fijo aparte, así que la cuenta no lo suma.`
            : ''
        } No incluye los impuestos de aduana, que dependen del valor de lo que compraste y no del courier.`
      ),
    })
    faq.push({
      id: 'mas-barato',
      question: `¿${name} es más barato que otros couriers?`,
      answer: `${reference.position} La comparación le suma a cada courier el mismo recargo de ley, así que está hecha sobre la misma base.`,
    })
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

  faq.push({
    id: 'recargo-de-ley',
    question: `¿Qué es el ${rate}% de ${POSTAL_SURCHARGE.label} que se suma a la tarifa de ${name}?`,
    answer: `Es la ${POSTAL_SURCHARGE.name}: ${rate}% sobre ${POSTAL_SURCHARGE.base}. ${POSTAL_SURCHARGE.summary} En la factura puede figurar como ${surcharge.aliases}: es el mismo cargo. Fuente: ${POSTAL_SURCHARGE.source}.`,
  })

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
      label: `Qué es la ${POSTAL_SURCHARGE.label} y cómo controlarla en la factura`,
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
