// One page per debit, prepaid or fintech card: `/tarjetas-de-debito-uruguay/<slug>`.
//
// Reddit asks about specific cards by name ("¿Prex cobra comisión en Steam?", "¿OCA Blue tiene
// recargo?", "¿MiDinero o Prex?"), and the answer already sits in utils/debitCards.ts as one ficha
// per card: its commission, the IVA on it, whether the balance can be held in dollars and the
// official source for every figure. This module turns ONE ficha into ONE page model without adding
// a fact: rank and score come from the same `rankedCards()` the ranking renders, and the worked
// purchase from the same `estimateIntlCost()` its calculator runs.
//
// PURE module (no Vue/Nuxt runtime, relative imports only).

import { BANKOS_BANK_BY_DEBIT_CARD, bankosBankName, bankosMapPath } from './bankos'
import { bankPageForBankId } from './bankosPages'
import {
  DEBIT_CARDS,
  DEBIT_CARDS_LAST_REVIEWED,
  DEBIT_RUBRIC,
  IVA_RATE,
  KIND_LABELS,
  NETWORK_LABELS,
  estimateIntlCost,
  rankedCards,
  type BalanceYield,
  type DebitCard,
  type Signal,
} from './debitCards'
import { ENTITY_PAGE_ROUTES, debitCardPagePath, entityIdForSlug } from './entityPageSlugs'
import {
  SIBLING_LIMIT,
  comparisonLinks,
  dateLabel,
  ensurePeriod,
  fitTitle,
  formatNumberEs,
  formatUsd,
  joinSpanishList,
  lowerFirst,
  nearest,
  normalizeSpaces,
  scoreSummary,
  uniqueSources,
  type EntityFact,
  type EntityFaq,
  type EntityLink,
  type EntityScoreRow,
  type EntitySource,
} from './entityPages'
import { RANKING_TIERS, rankingTierForScore, type RankingTierId } from './rankingTiers'

const ROUTE = ENTITY_PAGE_ROUTES['tarjetas-de-debito']

/** The purchase the index page's head-to-head uses ("un ítem de USD 50"); same number here. */
export const DEBIT_EXAMPLE_USD = 50

/** Two amounts closer than half a cent are the same. */
const CENT = 0.005

/** The IVA rate as a whole percentage: `0.22 * 100` is 22.000000000000004 in floating point. */
const IVA_PCT = Math.round(IVA_RATE * 100)

/** One line of the worked purchase. */
export interface DebitExampleRow {
  label: string
  value: string
}

/** A {@link DEBIT_EXAMPLE_USD} purchase abroad, before any peso conversion. */
export interface DebitExample {
  purchaseUsd: number
  comisionUsd: number
  ivaUsd: number
  subtotalUsd: number
  /** 1-based position by commission among the cards that publish one; ties share it. */
  rank: number
  of: number
  rows: DebitExampleRow[]
  /** Where this card lands among the others, and what the comparison leaves out. */
  position: string
}

export interface DebitCardDiscounts {
  bankName: string
  mapPath: string
  bankPagePath: string | null
}

export interface DebitCardPageModel {
  id: string
  slug: string
  path: string
  indexPath: string
  indexLabel: string
  name: string
  issuer: string
  kindLabel: string
  networks: string
  title: string
  description: string
  heading: string
  lead: string
  reviewedAt: string
  reviewedLabel: string
  verified: boolean
  estimate: boolean
  fundeaEnUsd: boolean
  rank: number
  of: number
  overall: number
  tier: RankingTierId
  tierBlurb: string
  scores: EntityScoreRow[]
  scoreSummary: string
  facts: EntityFact[]
  example: DebitExample | null
  signals: readonly Signal[]
  balanceYield: BalanceYield
  /** The explainer of the fund behind the yield, when there is one. */
  yieldLink: string | null
  pros: readonly string[]
  cons: readonly string[]
  bestFor: string
  discounts: DebitCardDiscounts | null
  faq: EntityFaq[]
  comparisons: EntityLink[]
  siblings: EntityLink[]
  tools: EntityLink[]
  sources: EntitySource[]
}

/** "cobra 2,5% + US$ 0,50 fijo + IVA por compra en el exterior", from the ficha's own fields. */
export function commissionPhrase(card: DebitCard): string {
  if (card.comisionExteriorPct === null) {
    return 'no publica una comisión oficial por compra en el exterior'
  }
  const fixed = card.cargoFijoUsd ?? 0
  if (card.comisionExteriorPct === 0 && fixed === 0) {
    return 'no cobra comisión por compra en el exterior'
  }
  const parts = [`${formatNumberEs(card.comisionExteriorPct)}%`]
  if (fixed > 0) parts.push(`${formatUsd(fixed)} fijo`)
  if (card.ivaSobreComision) parts.push('IVA')
  return `cobra ${parts.join(' + ')} por compra en el exterior`
}

/** The commission as a table value. */
function commissionValue(card: DebitCard): string {
  if (card.comisionExteriorPct === null) return 'Sin cifra oficial publicada'
  const fixed = card.cargoFijoUsd ?? 0
  if (card.comisionExteriorPct === 0 && fixed === 0) return '0% (sin recargo)'
  return `${formatNumberEs(card.comisionExteriorPct)}%${fixed > 0 ? ` + ${formatUsd(fixed)} fijo` : ''}${
    card.ivaSobreComision ? ` + IVA ${IVA_PCT}% sobre la comisión` : ''
  }`
}

/**
 * The commission's percentage and fixed fee only, for the worked purchase's commission row.
 *
 * `commissionValue()` already ends in "+ IVA 22% sobre la comisión", and the IVA gets a row of
 * its own right below, so reusing it printed the IVA twice ("Comisión (0% (sin recargo))" for the
 * cards with none).
 */
function commissionRateLabel(card: DebitCard): string {
  const fixed = card.cargoFijoUsd ?? 0
  return `${formatNumberEs(card.comisionExteriorPct ?? 0)}%${fixed > 0 ? ` + ${formatUsd(fixed)} fijo` : ''}`
}

/**
 * What the ficha says about IVA on this card's commission, for the ranking sentence.
 *
 * Stated per card and only as its data says it: the ranking itself leaves IVA out, because the
 * tariffs are not equally explicit about it and ranking on it would rank the wording.
 */
function ivaSentence(card: DebitCard): string {
  if (card.ivaSobreComision) return `Esta tarjeta suma además IVA ${IVA_PCT}% sobre la comisión.`
  if ((card.comisionExteriorPct ?? 0) > 0 || (card.cargoFijoUsd ?? 0) > 0) {
    return 'El tarifario de esta tarjeta no explicita IVA sobre la comisión.'
  }
  return ''
}

/**
 * Whether IVA lands on the commission, worded for the case at hand.
 *
 * A card that charges a commission with `ivaSobreComision: false` is BROU's, whose tariff does not
 * spell IVA out on it: saying "No" would claim more than the tariff does.
 */
function ivaValue(card: DebitCard): string {
  if (card.ivaSobreComision) return `Sí: ${IVA_PCT}% sobre la comisión`
  if (card.comisionExteriorPct === null) return 'Sin dato oficial'
  if (card.comisionExteriorPct > 0 || (card.cargoFijoUsd ?? 0) > 0) {
    return 'No figura en el tarifario'
  }
  return 'No corresponde: no cobra comisión'
}

interface ExampleRow {
  card: DebitCard
  /** The published percentage plus fixed fee on the example purchase, WITHOUT IVA. */
  commissionUsd: number
}

/**
 * Every card that publishes a commission, cheapest first by the percentage and fixed fee it
 * publishes, IVA left out.
 *
 * Ranking with IVA ranked the wording of the tariffs, not the cards: BROU's says nothing about IVA
 * on this commission and Scotiabank's page "no lo deletrea" either, yet one carries
 * `ivaSobreComision: true` and the other `false`, and the same 3% came out 5th and 6th. The
 * figures stay as verified; IVA is stated per card, as each ficha states it.
 */
export function debitExampleTable(): ExampleRow[] {
  return DEBIT_CARDS.filter(card => card.comisionExteriorPct !== null)
    .map(card => ({
      card,
      commissionUsd: estimateIntlCost({ purchaseUsd: DEBIT_EXAMPLE_USD, card, fxVenta: 1 })
        .comisionUsd,
    }))
    .sort(
      (a, b) => a.commissionUsd - b.commissionUsd || a.card.name.localeCompare(b.card.name, 'es')
    )
}

function exampleFor(card: DebitCard, table: readonly ExampleRow[]): DebitExample | null {
  if (card.comisionExteriorPct === null) return null
  const cheapest = table[0]
  const mine = table.find(row => row.card.id === card.id)
  if (!mine || !cheapest) return null

  const cost = estimateIntlCost({ purchaseUsd: DEBIT_EXAMPLE_USD, card, fxVenta: 1 })
  const rank = 1 + table.filter(row => row.commissionUsd < mine.commissionUsd - CENT).length
  const tied = table
    .filter(
      row => row.card.id !== card.id && Math.abs(row.commissionUsd - mine.commissionUsd) < CENT
    )
    .map(row => row.card.name)
  const of = table.length

  const rows: DebitExampleRow[] = [
    { label: 'Compra en el exterior', value: formatUsd(cost.purchaseUsd) },
    { label: `Comisión (${commissionRateLabel(card)})`, value: formatUsd(cost.comisionUsd) },
    ...(card.ivaSobreComision
      ? [{ label: `IVA ${IVA_PCT}% sobre la comisión`, value: formatUsd(cost.ivaUsd) }]
      : []),
    { label: 'Total en dólares, antes de convertir', value: formatUsd(cost.subtotalUsd) },
  ]

  const cheapestNames = table
    .filter(row => Math.abs(row.commissionUsd - cheapest.commissionUsd) < CENT)
    .map(row => row.card.name)
  const basis = 'Por la comisión que publica (porcentaje y cargo fijo, sin el IVA)'
  const lead =
    rank === 1
      ? `${basis} está entre las más baratas del ranking: ninguna de las ${of} tarjetas cobra menos por una compra de ${formatUsd(
          DEBIT_EXAMPLE_USD
        )}${tied.length ? `, y empata con ${joinSpanishList(tied)}` : ''}.`
      : `${basis} queda ${rank}ª de ${of} para una compra de ${formatUsd(DEBIT_EXAMPLE_USD)}${
          tied.length ? `, empatada con ${joinSpanishList(tied)}` : ''
        }; ${cheapestNames.length > 1 ? 'las más baratas en ese punto son' : 'la más barata en ese punto es'} ${joinSpanishList(
          cheapestNames
        )}, con ${formatUsd(cheapest.commissionUsd)} de comisión.`

  return {
    purchaseUsd: cost.purchaseUsd,
    comisionUsd: cost.comisionUsd,
    ivaUsd: cost.ivaUsd,
    subtotalUsd: cost.subtotalUsd,
    rank,
    of,
    rows,
    position: normalizeSpaces(
      `${lead} ${ivaSentence(card)} La comparación es sólo de comisión: el costo de pasar pesos a dólares va aparte y depende de cómo convierte cada emisor.`
    ),
  }
}

/** Build the page model for one card. Throws for a card with no slug: CI catches it. */
export function buildDebitCardPage(card: DebitCard): DebitCardPageModel {
  const path = debitCardPagePath(card.id)
  if (!path) throw new Error(`La tarjeta ${card.id} no tiene slug en utils/entityPageSlugs.ts`)

  const ranked = rankedCards()
  const self = ranked.find(entry => entry.id === card.id)
  if (!self) throw new Error(`La tarjeta ${card.id} no está en el ranking`)
  const of = ranked.length
  const name = card.name
  const reviewedLabel = dateLabel(DEBIT_CARDS_LAST_REVIEWED)
  const networks = joinSpanishList(card.networks.map(network => NETWORK_LABELS[network]))
  const table = debitExampleTable()
  const example = exampleFor(card, table)

  const scores: EntityScoreRow[] = DEBIT_RUBRIC.map(dimension => ({
    id: dimension.id,
    label: dimension.label,
    weight: dimension.weight,
    score: card.scores[dimension.id],
    what: dimension.what,
  }))
  const tier = rankingTierForScore(self.overall)
  const tierBlurb = RANKING_TIERS.find(entry => entry.id === tier)?.blurb ?? ''
  const summary = scoreSummary(scores)

  const title = fitTitle([
    `${name}: comisión al comprar en dólares`,
    `${name}: comisión en el exterior`,
    `${name}: comisión en dólares`,
    name,
  ])
  const heading = `${name}: cuánto te cobra al comprar en dólares y en el exterior`
  const balanceClause = card.fundeaEnUsd
    ? 'permite tener saldo en dólares'
    : 'no tiene saldo en dólares'
  const description = normalizeSpaces(
    `${name} ${commissionPhrase(card)} y ${balanceClause}. Puesto ${self.rank} de ${of} en nuestro ranking de débito y prepagas (${self.overall}/100), revisado el ${reviewedLabel}.`
  )
  const lead = ensurePeriod(card.verdict)

  const dataStatus = card.estimate
    ? `Incluye cifras estimadas, no oficiales (revisión del ${reviewedLabel})`
    : card.verified
      ? `Confirmados contra fuente oficial (revisión del ${reviewedLabel})`
      : `Parciales (revisión del ${reviewedLabel})`

  const facts: EntityFact[] = [
    { label: 'Emisor', value: card.issuer },
    { label: 'Tipo', value: KIND_LABELS[card.kind] },
    { label: 'Red', value: networks },
    { label: 'Comisión por compra en el exterior', value: commissionValue(card) },
    {
      label: 'Cargo fijo por operación',
      value: card.cargoFijoUsd === null ? 'Ninguno declarado' : formatUsd(card.cargoFijoUsd),
    },
    { label: 'IVA sobre la comisión', value: ivaValue(card) },
    {
      label: 'Saldo en dólares',
      value: card.fundeaEnUsd
        ? 'Sí: podés pagar en dólares sin convertir'
        : 'No: toda compra en dólares se convierte desde pesos',
    },
    { label: 'Cómo convierte', value: card.fxSpreadNote },
    { label: 'Costo real', value: card.feeNote },
    {
      label: 'Rendimiento del saldo',
      value: `${ensurePeriod(card.yieldOnBalance.label)} ${card.yieldOnBalance.detail}`,
    },
    { label: 'Datos', value: dataStatus },
  ]

  const bankId = BANKOS_BANK_BY_DEBIT_CARD[card.id]
  const bankPage = bankId ? bankPageForBankId(bankId) : undefined
  const discounts: DebitCardDiscounts | null = bankId
    ? {
        bankName: bankosBankName(bankId),
        mapPath: bankosMapPath(bankId, 'debit'),
        bankPagePath: bankPage ? `/descuentos-con-tarjeta-uruguay/${bankPage.slug}` : null,
      }
    : null

  const conversionNote = card.fundeaEnUsd
    ? 'Si la pagás con saldo en dólares no hay conversión; desde pesos, se suma el tipo de cambio del emisor.'
    : 'Como no tiene saldo en dólares, además se convierte desde pesos al tipo de cambio del emisor.'

  const faq: EntityFaq[] = [
    {
      id: 'comision-exterior',
      question: `¿Cuánto cobra ${name} por comprar en el exterior?`,
      answer: normalizeSpaces(`${name} ${commissionPhrase(card)}. ${ensurePeriod(card.feeNote)}`),
    },
  ]
  if (example) {
    faq.push({
      id: 'compra-de-ejemplo',
      question: `¿Cuánto pagás de comisión en una compra de US$ ${DEBIT_EXAMPLE_USD} con ${name}?`,
      answer: normalizeSpaces(
        `${
          example.comisionUsd === 0 && example.ivaUsd === 0
            ? `Nada: ${name} no cobra comisión por compra en el exterior, así que la compra queda en ${formatUsd(
                example.subtotalUsd
              )} antes de convertir.`
            : `${formatUsd(example.comisionUsd)} de comisión${
                example.ivaUsd > 0 ? ` y ${formatUsd(example.ivaUsd)} de IVA sobre ella` : ''
              }: la compra queda en ${formatUsd(example.subtotalUsd)} antes de convertir.`
        } ${conversionNote}`
      ),
    })
  }
  faq.push(
    {
      id: 'saldo-en-dolares',
      question: `¿Se puede tener saldo en dólares en ${name}?`,
      answer: `${card.fundeaEnUsd ? 'Sí.' : 'No.'} ${ensurePeriod(card.fxSpreadNote)}`,
    },
    {
      id: 'rendimiento',
      question: `¿El saldo de ${name} genera rendimiento?`,
      answer: `${ensurePeriod(card.yieldOnBalance.label)} ${ensurePeriod(card.yieldOnBalance.detail)}`,
    },
    {
      id: 'ranking',
      question: `¿En qué puesto está ${name} en el ranking de tarjetas de débito?`,
      answer: normalizeSpaces(
        `Puesto ${self.rank} de ${of}, con ${self.overall} puntos sobre 100: tier ${tier}, ${lowerFirst(
          ensurePeriod(tierBlurb)
        )} ${summary}`
      ),
    },
    {
      id: 'para-quien',
      question: `¿Para quién conviene ${name}?`,
      answer: ensurePeriod(card.bestFor),
    }
  )

  const siblings: EntityLink[] = nearest(
    ranked.filter(entry => entry.id !== card.id),
    entry => Math.abs(entry.overall - self.overall),
    SIBLING_LIMIT
  ).flatMap(entry => {
    const to = debitCardPagePath(entry.id)
    return to ? [{ to, label: entry.name, hint: `${entry.overall}/100` }] : []
  })

  const tools: EntityLink[] = [
    { to: ROUTE.index, label: 'Ranking completo y calculadora' },
    { to: '/comparativas/tarjetas-de-debito', label: 'Comparativas de tarjetas de débito' },
    { to: '/descuentos-con-tarjeta-uruguay', label: 'Mapa de descuentos por banco' },
    { to: '/cuenta-remunerada-uruguay', label: 'La plata que rinde sola' },
    { to: '/herramientas/calculadora-spread', label: 'Calculadora de spread' },
    { to: '/tarjetas-de-credito-uruguay', label: 'Ranking de tarjetas de crédito' },
  ]

  const sources = uniqueSources(
    card.sources.map(source => ({
      label: source.label,
      url: source.url,
      publisher: source.publisher,
    }))
  )

  return {
    id: card.id,
    slug: path.slice(ROUTE.index.length + 1),
    path,
    indexPath: ROUTE.index,
    indexLabel: ROUTE.label,
    name,
    issuer: card.issuer,
    kindLabel: KIND_LABELS[card.kind],
    networks,
    title,
    description,
    heading,
    lead,
    reviewedAt: DEBIT_CARDS_LAST_REVIEWED,
    reviewedLabel,
    verified: card.verified,
    estimate: card.estimate,
    fundeaEnUsd: card.fundeaEnUsd,
    rank: self.rank,
    of,
    overall: self.overall,
    tier,
    tierBlurb,
    scores,
    scoreSummary: summary,
    facts,
    example,
    signals: card.signals,
    balanceYield: card.yieldOnBalance,
    yieldLink: card.yieldOnBalance.productId
      ? `/cuenta-remunerada-uruguay#producto-${card.yieldOnBalance.productId}`
      : null,
    pros: card.pros,
    cons: card.cons,
    bestFor: card.bestFor,
    discounts,
    faq,
    comparisons: comparisonLinks('tarjetas-de-debito', card.id),
    siblings,
    tools,
    sources,
  }
}

/** The page model behind a slug, or `undefined` for an unknown one. */
export function getDebitCardPage(slug: string): DebitCardPageModel | undefined {
  const id = entityIdForSlug('tarjetas-de-debito', slug)
  const card = id ? DEBIT_CARDS.find(candidate => candidate.id === id) : undefined
  return card ? buildDebitCardPage(card) : undefined
}

/** Every card's page model, in catalogue order. */
export function allDebitCardPages(): DebitCardPageModel[] {
  return DEBIT_CARDS.map(buildDebitCardPage)
}
