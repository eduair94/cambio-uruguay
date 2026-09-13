// Head-to-head comparison pages (`/comparativas/:familia/:par`).
//
// "brou vs itau", "prex vs mercado pago", "oca vs visa" are how people actually
// decide, and the site already holds everything needed to answer them: four
// rubric-scored, sourced catalogues (banks/fintechs, credit-card reward
// programs, debit and prepaid cards, couriers). This module turns those into
// one page per pair WITHOUT writing a single new fact — every number, pro, con
// and verdict on a comparison page comes from the same catalogue the tier-list
// pages render, so a correction there propagates to every pair that entity is in.
//
// PURE module (no Vue/Nuxt runtime, relative imports only) so vitest exercises
// it and the sitemap route imports it directly.
//
// Two decisions worth knowing:
//
//  1. A pair has ONE canonical URL. `a-vs-b` and `b-vs-a` are the same page, so
//     the slug always orders the two entities alphabetically. Emitting both
//     would be self-inflicted duplicate content across ~350 URLs.
//  2. Only same-family pairs exist. Comparing a courier to a credit card scores
//     nothing against nothing; the rubric is what makes the comparison mean
//     something, and rubrics do not cross families.

import {
  BANKS,
  BANK_RUBRIC,
  scoreFor as bankScoreFor,
  tierForScore,
  type BankEntity,
} from './bankTierlist'
import {
  CARD_PROGRAMS,
  ISSUER_TYPE_LABELS,
  NETWORK_LABELS as CARD_NETWORK_LABELS,
  REWARD_RUBRIC,
  computeOverall as cardOverall,
  type CardProgram,
} from './cardRewards'
import {
  COURIERS,
  POSTAL_SURCHARGE,
  courierParcelQuote,
  type Courier,
  type CourierExtraFee,
  type CourierParcelQuote,
} from './courierShipping'
import {
  DEBIT_CARDS,
  DEBIT_RUBRIC,
  KIND_LABELS as DEBIT_KIND_LABELS,
  computeOverall as debitOverall,
  type DebitCard,
} from './debitCards'
import { slugifyText } from './longform'

/** The four comparison families. */
export const COMPARATIVA_FAMILIES = [
  'bancos',
  'tarjetas-de-credito',
  'tarjetas-de-debito',
  'couriers',
] as const

export type ComparativaFamily = (typeof COMPARATIVA_FAMILIES)[number]

/** One scored axis shared by both sides of a comparison. */
export interface ComparableDimension {
  id: string
  label: string
  /**
   * One or two words for running prose.
   *
   * The full labels read badly in a list: "se impone en atención y reputación y
   * dólares y transferencias" has three `y`s and no obvious boundaries. Two of
   * the three rubrics already ship a `short`; the credit-card one does not, so
   * it falls back to the first word of the label.
   */
  short: string
  /** Relative weight in the overall score; the set sums to 100. */
  weight: number
}

/** A labelled catalogue fact rendered as a comparison row. */
export interface ComparableFact {
  label: string
  value: string
}

/** An external source backing an entity's figures. */
export interface ComparableSource {
  label: string
  url: string
  publisher?: string
}

/** One side of a comparison, normalised across the four catalogues. */
export interface ComparableEntity {
  family: ComparativaFamily
  /** Catalogue id. */
  id: string
  /** URL-safe id, unique within the family. */
  slug: string
  /** Catalogue name, shown in the detail card. */
  name: string
  /**
   * The name trimmed for headings and running prose.
   *
   * Card programs carry their whole positioning in the name — "Pronto! — Tarjeta
   * Visa Pronto+ (puntos + beneficios)" — and two of those in one `<title>` blow
   * past what a SERP shows before it truncates.
   */
  shortName: string
  /** One-line identity, e.g. `'Banco estatal'` or `'Casillero en Miami'`. */
  subtitle: string
  /** 0–100 per dimension id; empty for families with no rubric. */
  scores: Record<string, number>
  /** Weighted overall, or `null` for families with no rubric (couriers). */
  overall: number | null
  /** Hard facts to place side by side. */
  facts: ComparableFact[]
  pros: readonly string[]
  cons: readonly string[]
  bestFor: string
  verdict: string
  sources: readonly ComparableSource[]
  /**
   * Numeric fields for families judged on figures rather than a rubric.
   *
   * Couriers carry no scores: what decides between two of them is the price of a
   * real parcel, the transit time and the reputation. The comparison builds that
   * arithmetic from these instead of leaving the page with an empty verdict.
   */
  metrics?: {
    perKgUsd: number | null
    baseUsd: number | null
    rating: number | null
    transit: string | null
  }
}

/**
 * Trim a catalogue name down to what fits in a heading.
 *
 * Drops an em-dash tail, a trailing parenthetical and the "Tarjeta de Crédito"
 * prefix that every card program repeats.
 */
export function shortenEntityName(name: string): string {
  const trimmed = name
    .replace(/\s*[—–-]\s*(?:\S.*)?$/, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/^Tarjeta de (?:Crédito|Débito)\s+/i, '')
    .trim()
  return trimmed.length >= 3 ? trimmed : name.trim()
}

/** A family: its label, its rubric and its entities. */
export interface ComparativaFamilyMeta {
  slug: ComparativaFamily
  /** Plural noun for headings, e.g. `'bancos y fintechs'`. */
  label: string
  /** Singular noun used in prose, e.g. `'banco'`. */
  singular: string
  /** MDI icon. */
  icon: string
  /** How this family is judged, stated once on the family index. */
  intro: string
  /** The question a head-to-head in this family answers; completes the H1. */
  pairQuestion: string
  dimensions: ComparableDimension[]
  entities: ComparableEntity[]
  /** Hub page the family was extracted from. */
  hub: string
}

const money = (value: number): string =>
  value.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ---------------------------------------------------------------------------
// Normalising the four catalogues
// ---------------------------------------------------------------------------

function bankEntity(bank: BankEntity): ComparableEntity {
  const overall = bankScoreFor(bank)
  return {
    family: 'bancos',
    id: bank.id,
    slug: slugifyText(bank.id),
    name: bank.name,
    shortName: shortenEntityName(bank.name),
    subtitle: bank.identity,
    scores: { ...bank.scores },
    overall,
    facts: [
      { label: 'Tipo', value: bank.identity },
      { label: 'Tier', value: tierForScore(overall) },
      { label: 'En una línea', value: bank.tagline },
      ...bank.signals.map(signal => ({ label: signal.label, value: signal.value })),
      ...(bank.flag ? [{ label: 'Atención', value: bank.flag }] : []),
    ],
    pros: bank.pros,
    cons: bank.cons,
    bestFor: bank.bestFor,
    verdict: bank.verdict,
    sources: [],
  }
}

function cardEntity(card: CardProgram): ComparableEntity {
  return {
    family: 'tarjetas-de-credito',
    id: card.id,
    slug: slugifyText(card.id),
    name: card.name,
    shortName: shortenEntityName(card.name),
    subtitle: `${ISSUER_TYPE_LABELS[card.issuerType]} · ${card.issuer}`,
    scores: { ...card.scores },
    overall: cardOverall(card.scores),
    facts: [
      { label: 'Emisor', value: card.issuer },
      {
        label: 'Redes',
        value: card.networks.map(network => CARD_NETWORK_LABELS[network]).join(', '),
      },
      { label: 'Programa de puntos', value: card.pointsProgramName },
      { label: 'Cómo acumula', value: card.earnRateNote },
      ...(card.pointValueNote
        ? [{ label: 'Cuánto vale el punto', value: card.pointValueNote }]
        : []),
      { label: 'Cómo se canjea', value: card.redemptionNote },
      { label: 'Descuentos', value: card.discountNote },
      { label: 'Costos', value: card.feeNote },
      {
        label: 'Datos confirmados',
        value: card.verified ? 'Sí, contra fuente oficial' : 'Parcial',
      },
    ],
    pros: card.pros,
    cons: card.cons,
    bestFor: card.bestFor,
    verdict: card.rationale ?? card.note ?? '',
    sources: [],
  }
}

function debitEntity(card: DebitCard): ComparableEntity {
  const commission =
    card.comisionExteriorPct === null
      ? 'Sin cifra oficial publicada'
      : `${card.comisionExteriorPct}%${card.ivaSobreComision ? ' + IVA 22%' : ' (sin IVA)'}`
  return {
    family: 'tarjetas-de-debito',
    id: card.id,
    slug: slugifyText(card.id),
    name: card.name,
    shortName: shortenEntityName(card.name),
    subtitle: `${DEBIT_KIND_LABELS[card.kind]} · ${card.issuer}`,
    scores: { ...card.scores },
    overall: debitOverall(card.scores),
    facts: [
      { label: 'Tipo', value: DEBIT_KIND_LABELS[card.kind] },
      { label: 'Comisión por compra en el exterior', value: commission },
      {
        label: 'Cargo fijo por operación',
        value: card.cargoFijoUsd === null ? 'Ninguno declarado' : `USD ${money(card.cargoFijoUsd)}`,
      },
      {
        label: '¿Podés fondearla en dólares?',
        value: card.fundeaEnUsd ? 'Sí, evitás la conversión' : 'No: convierte desde pesos',
      },
      { label: 'Cómo convierte', value: card.fxSpreadNote },
      { label: 'Costo real', value: card.feeNote },
      {
        label: 'Datos confirmados',
        value: card.verified ? 'Sí, contra fuente oficial' : 'Estimado, no oficial',
      },
    ],
    pros: card.pros,
    cons: card.cons,
    bestFor: card.bestFor,
    verdict: card.verdict,
    sources: card.sources.map(source => ({
      label: source.label,
      url: source.url,
      publisher: source.publisher,
    })),
  }
}

/** `USD 75,00 (hasta 800)`: a fee a courier's note publishes, in this page's format. */
function courierFeeText(fee: CourierExtraFee): string {
  return `${fee.approximate ? '~' : ''}USD ${money(fee.usd)}${fee.when ? ` (${fee.when})` : ''}`
}

/** `envío al interior de ~USD 7,50`: published fees grouped by label, for running prose. */
function courierFeesText(fees: readonly CourierExtraFee[]): string {
  const labels = [...new Set(fees.map(fee => fee.label))]
  return joinList(
    labels.map(
      label =>
        `${lowerFirst(label)} de ${fees
          .filter(fee => fee.label === label)
          .map(courierFeeText)
          .join(' o ')}`
    )
  )
}

/** What a parcel total includes, following the courier's own note. */
function courierParcelBasis(courier: Courier, quote: CourierParcelQuote): string {
  if (courier.rateIncludesSurcharge) return 'tarifa todo incluido'
  return `con el ${POSTAL_SURCHARGE.ratePct}% de recargo${quote.baseIvaUsd > 0 ? ' y el IVA del cargo fijo' : ''}`
}

/** The reference parcel as a fact row: its total, what it includes and any fee it leaves out. */
function courierParcelFact(courier: Courier, quote: CourierParcelQuote): string {
  const conditional = quote.pendingFees.filter(fee => fee.kind === 'conditional')
  const optional = quote.pendingFees.filter(fee => fee.kind === 'optional')
  const total = `USD ${money(quote.totalUsd)} (${courierParcelBasis(courier, quote)})`
  if (conditional.length) {
    const labels = joinList([...new Set(conditional.map(fee => lowerFirst(fee.label)))])
    return `${total}, sin ${labels}; aparte, ${conditional.map(courierFeeText).join(' o ')}`
  }
  if (optional.length) return `${total}; aparte, ${courierFeesText(optional)}`
  return total
}

function courierEntity(courier: Courier): ComparableEntity {
  const quote = courierParcelQuote(courier, COURIER_REFERENCE_KG)
  const facts: ComparableFact[] = [
    { label: 'Modalidad', value: courier.modality },
    {
      label: 'Tarifa de referencia',
      value:
        courier.perKgUsd === null
          ? 'Solo cotiza por su calculadora'
          : `USD ${money(courier.perKgUsd)} por kilo`,
    },
    {
      label: 'Cargo fijo por envío',
      value:
        courier.baseUsd === null
          ? 'No publica cargo fijo'
          : `USD ${money(courier.baseUsd)}${courier.baseIvaExcluded ? ' + IVA' : ''}`,
    },
    // The parcel total, priced by the same `courierParcelQuote` as the courier's own page: every
    // pair page shows both sides' totals, and they are the ones those pages show.
    {
      label: `Paquete de ${COURIER_REFERENCE_KG} kg`,
      value: quote ? courierParcelFact(courier, quote) : 'Sin tarifa publicada para calcularlo',
    },
  ]
  if (courier.extraFees?.length) {
    facts.push({
      label: 'Otros cargos que publica',
      value: courier.extraFees.map(fee => `${fee.label}: ${courierFeeText(fee)}`).join('; '),
    })
  }
  if (courier.transit) facts.push({ label: 'Demora típica', value: courier.transit })
  if (typeof courier.rating === 'number') {
    facts.push({ label: 'Reputación', value: `${courier.rating.toFixed(1)} / 5` })
  }
  if (courier.reviewsNote)
    facts.push({ label: 'Qué dicen los usuarios', value: courier.reviewsNote })
  if (courier.note) facts.push({ label: 'Letra chica', value: courier.note })
  facts.push({
    label: 'Recargo de ley',
    value: courier.rateIncludesSurcharge
      ? 'Tarifa publicada como todo incluido: no se le suma aparte'
      : `${POSTAL_SURCHARGE.ratePct}% sobre la tarifa (${POSTAL_SURCHARGE.name})`,
  })

  return {
    family: 'couriers',
    id: courier.id,
    slug: slugifyText(courier.id),
    name: courier.name,
    shortName: shortenEntityName(courier.name),
    subtitle: courier.modality,
    scores: {},
    overall: null,
    facts,
    pros: [],
    cons: [],
    bestFor: '',
    verdict: '',
    sources: [{ label: `Tarifas publicadas de ${courier.name}`, url: courier.source }],
    metrics: {
      perKgUsd: courier.perKgUsd,
      baseUsd: courier.baseUsd,
      rating: typeof courier.rating === 'number' ? courier.rating : null,
      transit: courier.transit ?? null,
    },
  }
}

/** Reference parcel used for the worked courier comparison. */
export const COURIER_REFERENCE_KG = 2

/** The courier behind a comparable entity, or `undefined` for another family. */
function courierFor(entity: ComparableEntity): Courier | undefined {
  return entity.family === 'couriers'
    ? COURIERS.find(courier => courier.id === entity.id)
    : undefined
}

/**
 * The {@link COURIER_REFERENCE_KG} parcel for one side of a courier pair.
 *
 * Priced by `courierParcelQuote`, the SAME function behind each courier's own page
 * (/couriers-uruguay/<courier>), so a pair page and a courier page can never show two totals for
 * the same parcel. That function follows the courier's note: no surcharge on a rate published "todo
 * incluido", IVA on a handling fee published "+IVA", and a fee the note lists on top kept next to
 * the total instead of inside it. `null` when the courier only quotes through its own calculator:
 * there is no published tariff to compute from, and inventing one would defeat the purpose.
 */
export function courierReferenceQuote(entity: ComparableEntity): CourierParcelQuote | null {
  const courier = courierFor(entity)
  return courier ? courierParcelQuote(courier, COURIER_REFERENCE_KG) : null
}

/** What the reference parcel costs with a courier, or `null` when it publishes no per-kg rate. */
export function courierReferenceCost(entity: ComparableEntity): number | null {
  return courierReferenceQuote(entity)?.totalUsd ?? null
}

/**
 * How many credit-card programs enter the pairing.
 *
 * All 25 would be 300 URLs for one family — more pages about card pairs than
 * about everything else on the site put together, most of them pairing two
 * programs nobody compares. The top of the ranking is where the real "X vs Y"
 * demand sits.
 */
const CARD_PAIR_LIMIT = 20

// ---------------------------------------------------------------------------
// The families
// ---------------------------------------------------------------------------

/**
 * Make `shortName` unique inside a family.
 *
 * Trimming is per-entity, so two programs from the same issuer can collapse to
 * the same word ("OCA", "Pronto!") — and the heading, the `<title>` and the
 * summary of two different comparison pages then read identically. Duplicate
 * H1s across a programmatic family is the exact signal that gets one of the two
 * dropped from the index, so a collision falls back to the full catalogue name,
 * and a still-colliding name gets its subtitle appended.
 */
function disambiguateShortNames(entities: ComparableEntity[]): ComparableEntity[] {
  const count = (list: ComparableEntity[], pick: (e: ComparableEntity) => string) => {
    const seen = new Map<string, number>()
    for (const entity of list) seen.set(pick(entity), (seen.get(pick(entity)) ?? 0) + 1)
    return seen
  }

  const byShort = count(entities, entity => entity.shortName)
  const widened = entities.map(entity =>
    (byShort.get(entity.shortName) ?? 0) > 1 ? { ...entity, shortName: entity.name } : entity
  )

  const byName = count(widened, entity => entity.shortName)
  return widened.map(entity =>
    (byName.get(entity.shortName) ?? 0) > 1
      ? { ...entity, shortName: `${entity.shortName} (${entity.subtitle})` }
      : entity
  )
}

/** Sort by overall (best first), cap the set, then disambiguate what is left. */
function prepareEntities(entities: ComparableEntity[], limit?: number): ComparableEntity[] {
  const sorted = [...entities].sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0))
  return disambiguateShortNames(limit ? sorted.slice(0, limit) : sorted)
}

function rubricDimensions(
  rubric: ReadonlyArray<{ id: string; label: string; weight: number; short?: string }>
): ComparableDimension[] {
  return rubric.map(dimension => ({
    id: dimension.id,
    label: dimension.label,
    short: (dimension.short ?? dimension.label.split(/\s+/)[0] ?? dimension.label).toLowerCase(),
    weight: dimension.weight,
  }))
}

/** Every family, with its entities already normalised and sorted by score. */
export const COMPARATIVA_FAMILY_META: readonly ComparativaFamilyMeta[] = Object.freeze([
  {
    slug: 'bancos' as const,
    label: 'bancos y fintechs',
    singular: 'banco',
    icon: 'mdi-bank-outline',
    intro:
      'Cada banco y billetera se puntúa en seis ejes con el mismo peso para todos: app, comisiones, atención, operativa en dólares, productos y cobertura. El puntaje general es la suma ponderada, nunca un número escrito a mano.',
    pairQuestion: 'cuál conviene para tu plata de todos los días',
    dimensions: rubricDimensions(BANK_RUBRIC),
    entities: prepareEntities(BANKS.map(bankEntity)),
    hub: '/mejores-bancos-uruguay',
  },
  {
    slug: 'tarjetas-de-credito' as const,
    label: 'tarjetas de crédito',
    singular: 'programa',
    icon: 'mdi-credit-card-outline',
    intro:
      'Los programas de recompensas se comparan por lo que devuelven de verdad: cuánto acumulás, cuánto vale el punto, qué tan fácil es canjearlo, qué descuentos trae y cuánto cuesta mantener la tarjeta.',
    pairQuestion: 'qué tarjeta de crédito devuelve más',
    dimensions: rubricDimensions(REWARD_RUBRIC),
    entities: prepareEntities(CARD_PROGRAMS.map(cardEntity), CARD_PAIR_LIMIT),
    hub: '/tarjetas-de-credito-uruguay',
  },
  {
    slug: 'tarjetas-de-debito' as const,
    label: 'tarjetas de débito y prepagas',
    singular: 'tarjeta',
    icon: 'mdi-card-account-details-outline',
    intro:
      'Acá lo que se compara es el costo real de gastar en dólares: la comisión sobre la compra, si le cae IVA encima, el cargo fijo por operación y si podés fondear la tarjeta directamente en dólares para saltearte la conversión.',
    pairQuestion: 'con cuál te sale más barato pagar en dólares',
    dimensions: rubricDimensions(DEBIT_RUBRIC),
    entities: prepareEntities(DEBIT_CARDS.map(debitEntity)),
    hub: '/tarjetas-de-debito-uruguay',
  },
  {
    slug: 'couriers' as const,
    label: 'couriers',
    singular: 'courier',
    icon: 'mdi-package-variant-closed',
    intro:
      'Los couriers no llevan puntaje: lo que decide es la tarifa por kilo, el cargo fijo, la demora y la reputación. Cada total sigue la tarifa publicada de cada courier: suma el recargo de ley salvo cuando la tarifa se publica como todo incluido, y el IVA del cargo fijo cuando la tarifa lo aclara.',
    pairQuestion: 'con cuál te conviene traer el paquete',
    dimensions: [],
    entities: disambiguateShortNames(
      COURIERS.map(courierEntity).sort((a, b) => a.name.localeCompare(b.name, 'es'))
    ),
    hub: '/couriers-uruguay',
  },
])

/** Look up a family by slug. */
export function getComparativaFamily(slug: string): ComparativaFamilyMeta | undefined {
  return COMPARATIVA_FAMILY_META.find(family => family.slug === slug)
}

/** Every family slug, in display order. */
export function comparativaFamilySlugs(): ComparativaFamily[] {
  return COMPARATIVA_FAMILY_META.map(family => family.slug)
}

// ---------------------------------------------------------------------------
// Pairs
// ---------------------------------------------------------------------------

/** One head-to-head page. */
export interface ComparativaPair {
  family: ComparativaFamily
  /** `a-vs-b`, with `a` and `b` in alphabetical slug order. */
  slug: string
  a: ComparableEntity
  b: ComparableEntity
}

/** Canonical pair slug: alphabetical, so a pair has exactly one URL. */
export function pairSlug(a: string, b: string): string {
  return [a, b].sort((x, y) => x.localeCompare(y, 'en')).join('-vs-')
}

/** Every pair of a family, canonically ordered. */
export function familyPairs(family: ComparativaFamilyMeta): ComparativaPair[] {
  const pairs: ComparativaPair[] = []
  const sorted = [...family.entities].sort((x, y) => x.slug.localeCompare(y.slug, 'en'))
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i] as ComparableEntity
      const b = sorted[j] as ComparableEntity
      pairs.push({ family: family.slug, slug: pairSlug(a.slug, b.slug), a, b })
    }
  }
  return pairs
}

/** Every pair of every family. */
export function allComparativaPairs(): ComparativaPair[] {
  return COMPARATIVA_FAMILY_META.flatMap(familyPairs)
}

/** `[familia, par]` paths for the sitemap and the route guard. */
export function comparativaPaths(): string[] {
  return allComparativaPairs().map(pair => `/comparativas/${pair.family}/${pair.slug}`)
}

/** Resolve one pair from its route params. */
export function getComparativaPair(familySlug: string, slug: string): ComparativaPair | undefined {
  const family = getComparativaFamily(familySlug)
  if (!family) return undefined
  return familyPairs(family).find(pair => pair.slug === slug)
}

/** Other pairs involving either side, for internal linking. */
export function relatedPairs(pair: ComparativaPair, limit = 8): ComparativaPair[] {
  const family = getComparativaFamily(pair.family)
  if (!family) return []
  return familyPairs(family)
    .filter(
      other =>
        other.slug !== pair.slug &&
        (other.a.slug === pair.a.slug ||
          other.b.slug === pair.a.slug ||
          other.a.slug === pair.b.slug ||
          other.b.slug === pair.b.slug)
    )
    .slice(0, limit)
}

// ---------------------------------------------------------------------------
// The comparison itself
// ---------------------------------------------------------------------------

/** One scored axis, resolved for both sides. */
export interface ComparisonAxisRow {
  dimension: ComparableDimension
  a: number
  b: number
  /** `'a'`, `'b'` or `'tie'` — a gap under {@link TIE_MARGIN} is a tie. */
  winner: 'a' | 'b' | 'tie'
}

/**
 * Score gap below which two entities are called even.
 *
 * The scores are a research judgement, not a measurement. Declaring a winner on
 * a two-point difference would give the page a precision the underlying data
 * does not have.
 */
export const TIE_MARGIN = 5

/** Per-dimension results plus the overall verdict. */
export interface Comparison {
  rows: ComparisonAxisRow[]
  /** Overall winner, or `'tie'`; `null` when the family has no rubric. */
  overallWinner: 'a' | 'b' | 'tie' | null
  /** Dimensions where each side is clearly ahead. */
  aStrengths: ComparableDimension[]
  bStrengths: ComparableDimension[]
  ties: ComparableDimension[]
}

/** Compare the two sides of a pair across the family rubric. */
export function compareEntities(pair: ComparativaPair): Comparison {
  const family = getComparativaFamily(pair.family)
  const dimensions = family?.dimensions ?? []

  const rows: ComparisonAxisRow[] = dimensions.map(dimension => {
    const a = pair.a.scores[dimension.id] ?? 0
    const b = pair.b.scores[dimension.id] ?? 0
    const gap = a - b
    return {
      dimension,
      a,
      b,
      winner: Math.abs(gap) < TIE_MARGIN ? 'tie' : gap > 0 ? 'a' : 'b',
    }
  })

  const overallA = pair.a.overall
  const overallB = pair.b.overall
  const overallWinner =
    overallA === null || overallB === null
      ? null
      : Math.abs(overallA - overallB) < TIE_MARGIN
        ? 'tie'
        : overallA > overallB
          ? 'a'
          : 'b'

  return {
    rows,
    overallWinner,
    aStrengths: rows.filter(row => row.winner === 'a').map(row => row.dimension),
    bStrengths: rows.filter(row => row.winner === 'b').map(row => row.dimension),
    ties: rows.filter(row => row.winner === 'tie').map(row => row.dimension),
  }
}

/** Join a list the way Spanish prose does. */
function joinList(items: readonly string[]): string {
  const list = items.filter(Boolean)
  if (!list.length) return ''
  if (list.length === 1) return list[0] as string
  return `${list.slice(0, -1).join(', ')} y ${list[list.length - 1]}`
}

/**
 * H1 for a pair page.
 *
 * The family question is part of the heading, not decoration: the same two
 * names exist in more than one catalogue (Prex and Mercado Pago are both a
 * "banco/fintech" and a card for spending in dollars), so a bare
 * "X o Y: cuál conviene" produced two different URLs with an identical H1.
 */
export function comparativaHeading(pair: ComparativaPair): string {
  const family = getComparativaFamily(pair.family)
  return `${pair.a.shortName} o ${pair.b.shortName}: ${family?.pairQuestion ?? 'cuál conviene'}`
}

/** Document title, carrying the query shape people type. */
export function comparativaTitle(pair: ComparativaPair): string {
  const family = getComparativaFamily(pair.family)
  return `${pair.a.shortName} vs ${pair.b.shortName}: comparación de ${family?.label ?? ''} en Uruguay`.replace(
    /\s+/g,
    ' '
  )
}

/**
 * The verdict paragraph, assembled from the two entities' own scores.
 *
 * Every clause is derived: which one leads overall and by how much, the axes
 * each one wins, and who each is for. Nothing here is written per pair, and
 * nothing is asserted that the catalogue does not already say.
 */
export function comparativaSummary(pair: ComparativaPair): string {
  if (pair.family === 'couriers') return courierSummary(pair)

  const comparison = compareEntities(pair)
  const parts: string[] = []

  if (comparison.overallWinner === 'tie' && pair.a.overall !== null) {
    parts.push(
      `${pair.a.shortName} y ${pair.b.shortName} quedan prácticamente empatados (${Math.round(
        pair.a.overall
      )} contra ${Math.round(pair.b.overall ?? 0)} puntos): la decisión no pasa por el promedio sino por cuál de los dos gana en lo que a vos te importa.`
    )
  } else if (comparison.overallWinner) {
    const winner = comparison.overallWinner === 'a' ? pair.a : pair.b
    const loser = comparison.overallWinner === 'a' ? pair.b : pair.a
    parts.push(
      `Con criterios parejos gana ${winner.shortName}: ${Math.round(winner.overall ?? 0)} puntos contra ${Math.round(
        loser.overall ?? 0
      )} de ${loser.shortName}.`
    )
  }

  if (comparison.aStrengths.length) {
    parts.push(
      `${pair.a.shortName} se impone en ${joinList(comparison.aStrengths.map(d => d.short))}.`
    )
  }
  if (comparison.bStrengths.length) {
    parts.push(
      `${pair.b.shortName} se impone en ${joinList(comparison.bStrengths.map(d => d.short))}.`
    )
  }
  if (comparison.ties.length && !comparison.aStrengths.length && !comparison.bStrengths.length) {
    parts.push('En todos los ejes quedan a la par: cualquiera de los dos hace el mismo trabajo.')
  }

  if (pair.a.bestFor) parts.push(`${pair.a.shortName} es para: ${lowerFirst(pair.a.bestFor)}`)
  if (pair.b.bestFor) parts.push(`${pair.b.shortName} es para: ${lowerFirst(pair.b.bestFor)}`)

  return parts.join(' ')
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLocaleLowerCase('es') + text.slice(1)
}

/** One side of a courier pair: its entity, the courier behind it and its reference parcel. */
interface CourierSide {
  entity: ComparableEntity
  courier: Courier
  quote: CourierParcelQuote | null
}

/** "El total de X no incluye el despacho de aduana, que su tarifa cobra aparte: …", or nothing. */
function courierPendingSentence(side: CourierSide): string {
  const conditional = side.quote?.pendingFees.filter(fee => fee.kind === 'conditional') ?? []
  if (!conditional.length) return ''
  const labels = joinList([...new Set(conditional.map(fee => lowerFirst(fee.label)))])
  return `El total de ${side.entity.shortName} no incluye el ${labels}, que su tarifa cobra aparte: ${conditional
    .map(courierFeeText)
    .join(' o ')}.`
}

/**
 * The courier verdict, computed from each courier's published tariff and its own note.
 *
 * Couriers carry no rubric, so the comparison is arithmetic: what a 2 kg parcel costs with each
 * (priced by `courierParcelQuote`, the same function behind each courier's own page), how the
 * transit times differ and what the reputation says. When one of the two only quotes through its
 * own calculator the page says exactly that instead of guessing a price, and a total that leaves out
 * a fee the courier publishes is shown as such and never crowned: a winner declared on it would be
 * a guess too.
 */
function courierSummary(pair: ComparativaPair): string {
  const parts: string[] = []
  const kg = COURIER_REFERENCE_KG
  const sides: CourierSide[] = [pair.a, pair.b].flatMap(entity => {
    const courier = courierFor(entity)
    return courier ? [{ entity, courier, quote: courierParcelQuote(courier, kg) }] : []
  })
  const [sideA, sideB] = sides
  if (!sideA || !sideB) return ''
  const nameA = sideA.entity.shortName
  const nameB = sideB.entity.shortName

  if (sideA.quote && sideB.quote) {
    const costA = sideA.quote.totalUsd
    const costB = sideB.quote.totalUsd
    const incomplete = sides.filter(side => side.quote && !side.quote.complete)
    if (incomplete.length) {
      parts.push(
        `Para un paquete de ${kg} kilos: USD ${money(costA)} con ${nameA} y USD ${money(costB)} con ${nameB}.`
      )
      parts.push(...incomplete.map(courierPendingSentence))
      parts.push(
        incomplete.length > 1
          ? 'Como esos cargos no se pueden asignar a un paquete genérico, esta comparación no declara un ganador por precio: pedí los dos presupuestos con ellos incluidos.'
          : 'Como ese cargo no se puede asignar a un paquete genérico, esta comparación no declara un ganador por precio: pedí los dos presupuestos con él incluido.'
      )
    } else {
      const gap = Math.abs(costA - costB)
      if (gap < 1) {
        parts.push(
          `Para un paquete de ${kg} kilos los dos salen prácticamente lo mismo: USD ${money(costA)} con ${nameA} y USD ${money(costB)} con ${nameB}. La diferencia la van a hacer la demora y la atención, no el precio.`
        )
      } else {
        const cheaper = costA < costB ? nameA : nameB
        const dearer = costA < costB ? nameB : nameA
        parts.push(
          `Para un paquete de ${kg} kilos sale más barato ${cheaper}: USD ${money(
            Math.min(costA, costB)
          )} contra USD ${money(Math.max(costA, costB))} de ${dearer}. Son USD ${money(gap)} de diferencia en ese envío.`
        )
      }
    }
  } else if (sideA.quote || sideB.quote) {
    const quoted = sideA.quote ? sideA : sideB
    const other = sideA.quote ? sideB : sideA
    const quote = quoted.quote as CourierParcelQuote
    parts.push(
      `${quoted.entity.shortName} publica tarifa: un paquete de ${kg} kilos sale USD ${money(
        quote.totalUsd
      )} (${courierParcelBasis(quoted.courier, quote)}).`
    )
    const pending = courierPendingSentence(quoted)
    if (pending) parts.push(pending)
    parts.push(
      `${other.entity.shortName} no publica precio por kilo y cotiza cada envío por su calculadora, así que la comparación directa hay que hacerla con el presupuesto en la mano.`
    )
  } else {
    parts.push(
      `Ni ${nameA} ni ${nameB} publican una tarifa por kilo: los dos cotizan cada envío en su sitio. Compará los dos presupuestos por el mismo paquete antes de decidir.`
    )
  }

  // What each total includes, said once per courier and only as its own note says it.
  const priced = sides.filter(
    (side): side is CourierSide & { quote: CourierParcelQuote } => side.quote !== null
  )
  for (const side of priced) {
    const name = side.entity.shortName
    if (side.courier.baseUsd === null) {
      parts.push(`${name} no publica cargo fijo por envío, así que su total no suma ninguno.`)
    }
    if (side.quote.baseIvaUsd > 0) {
      parts.push(`${name} publica su cargo fijo más IVA, y su total ya lo suma.`)
    }
    const optional = side.quote.pendingFees.filter(fee => fee.kind === 'optional')
    if (optional.length) {
      parts.push(`${name} cobra aparte ${courierFeesText(optional)}, que su total no suma.`)
    }
  }

  const transitA = pair.a.metrics?.transit
  const transitB = pair.b.metrics?.transit
  if (transitA && transitB && transitA !== transitB) {
    parts.push(
      `Demora declarada: ${transitA} con ${pair.a.shortName}, ${transitB} con ${pair.b.shortName}.`
    )
  }

  const ratingA = pair.a.metrics?.rating
  const ratingB = pair.b.metrics?.rating
  if (typeof ratingA === 'number' && typeof ratingB === 'number') {
    const better = ratingA >= ratingB ? pair.a : pair.b
    parts.push(
      `En reputación puntúa mejor ${better.shortName} (${Math.max(ratingA, ratingB).toFixed(
        1
      )} contra ${Math.min(ratingA, ratingB).toFixed(1)} sobre 5).`
    )
  }

  // "Los dos suman el mismo recargo" only when it is true of both: both priced, neither published as
  // all-inclusive. "Misma base" only when, on top of that, neither total leaves out a fee.
  const inclusive = priced.filter(side => side.courier.rateIncludesSurcharge)
  if (priced.length === 2 && !inclusive.length) {
    parts.push(
      priced.every(side => side.quote.complete)
        ? 'Los dos suman el mismo recargo de ley sobre su tarifa, así que la comparación de arriba está hecha sobre la misma base.'
        : 'Los dos suman el mismo recargo de ley sobre su tarifa.'
    )
  }
  for (const side of inclusive) {
    const other = priced.find(
      candidate => candidate !== side && !candidate.courier.rateIncludesSurcharge
    )
    parts.push(
      `${side.entity.shortName} publica su tarifa como todo incluido, así que a su total no se le suma el recargo de ley${
        other ? `; al de ${other.entity.shortName}, sí` : ''
      }.`
    )
  }
  parts.push(
    'Lo que no incluye son los impuestos de aduana, que dependen del valor de la mercadería y no del courier.'
  )

  return parts.join(' ')
}

/** Meta description: the verdict, trimmed to a length a SERP will show. */
export function comparativaDescription(pair: ComparativaPair): string {
  const comparison = compareEntities(pair)
  const family = getComparativaFamily(pair.family)

  const lead =
    comparison.overallWinner === 'tie'
      ? `${pair.a.shortName} y ${pair.b.shortName} empatan en el puntaje general`
      : comparison.overallWinner === 'a'
        ? `Gana ${pair.a.shortName} con ${Math.round(pair.a.overall ?? 0)} puntos contra ${Math.round(pair.b.overall ?? 0)}`
        : comparison.overallWinner === 'b'
          ? `Gana ${pair.b.shortName} con ${Math.round(pair.b.overall ?? 0)} puntos contra ${Math.round(pair.a.overall ?? 0)}`
          : `${pair.a.shortName} y ${pair.b.shortName}, lado a lado`

  const axes = comparison.rows.length
    ? ` Comparación en ${comparison.rows.length} ejes`
    : ` Tarifa por kilo, cargo fijo, demora y reputación`

  return `${pair.a.shortName} vs ${pair.b.shortName} en Uruguay. ${lead}.${axes}, con los datos verificados de ${
    family?.label ?? 'la categoría'
  } y para quién es cada uno.`.slice(0, 300)
}
