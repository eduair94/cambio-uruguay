// One page per credit-card programme: `/tarjetas-de-credito-uruguay/<slug>`.
//
// "beneficios mastercard black itau" converts in Search Console, and Reddit asks about specific
// cards by name (Itaú Volar and its Platinum and Black tiers, BROU Recompensa, OCA). The ranking at
// /tarjetas-de-credito-uruguay already holds a researched, sourced ficha per programme, but only as
// one collapsed card among 23 on a single URL. This module turns ONE ficha of utils/cardRewards.ts
// into ONE page model without adding a fact: rank and score come from the same `rankedPrograms()`
// the ranking renders, the tier from the shared score bands, and every sentence is the ficha's own
// field or is assembled from its fields.
//
// PURE module (no Vue/Nuxt runtime, relative imports only).

import { BANKOS_BANK_BY_CREDIT_PROGRAM, bankosBankName, bankosMapPath } from './bankos'
import { bankPageForBankId } from './bankosPages'
import {
  CARD_PROGRAMS,
  CARD_REWARDS_LAST_REVIEWED,
  CARD_REWARDS_SOURCES,
  ISSUER_TYPE_LABELS,
  NETWORK_LABELS,
  PROGRAM_REDDIT_ENTITY,
  REWARD_RUBRIC,
  rankedPrograms,
  type CardProgram,
} from './cardRewards'
import { ENTITY_PAGE_ROUTES, cardProgramPagePath, entityIdForSlug } from './entityPageSlugs'
import {
  SIBLING_LIMIT,
  comparativaEntityCount,
  comparisonLinks,
  dateLabel,
  ensurePeriod,
  fitDescription,
  fitTitle,
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

const ROUTE = ENTITY_PAGE_ROUTES['tarjetas-de-credito']

/**
 * The name each programme goes by in headings and titles.
 *
 * The catalogue names carry a whole positioning ("Tarjeta de Crédito BBVA Comunidad Plus (co-brand
 * Ta-Ta / BAS / Multi Ahorro Hogar)") and blow any title budget; `shortenEntityName` from the
 * comparativas cuts them mechanically and can leave "Programa Más (Grupo Disco" behind. These are
 * the names people type, kept next to the full catalogue name, which the page still prints.
 */
export const CARD_PROGRAM_NAMES: Readonly<Record<string, string>> = Object.freeze({
  'brou-recompensa': 'BROU Recompensa',
  'club-tienda-inglesa-puntos': 'Puntos Tienda Inglesa',
  'scotia-puntos': 'Scotia Puntos',
  'santander-soy-santander-puntos': 'Soy Santander Puntos',
  'bbva-puntos-bbva': 'Puntos BBVA',
  'bbva-comunidad-plus': 'BBVA Comunidad Plus',
  'itau-volar': 'Itaú Volar',
  'itau-volar-platinum': 'Itaú Volar Visa Platinum',
  'itau-latam-pass-platinum': 'Itaú LATAM Pass Platinum',
  'itau-volar-black': 'Itaú Volar Mastercard Black',
  'scotia-puntos-american-express': 'Scotiabank American Express',
  'scotia-connectmiles': 'Copa ConnectMiles Amex',
  'itau-latam-pass-internacional': 'Itaú LATAM Pass Internacional',
  'oca-oca-blue': 'OCA Metraje',
  'scotia-club-card-tienda-inglesa': 'Club Card Tienda Inglesa',
  'pronto-visa': 'Pronto! Visa Pronto+',
  'mas-grupo-disco-sumaclub': 'Hipermás y Programa Más',
  'creditel-credipuntos': 'Creditel Credipuntos',
  'passcard-puntos-pass': 'PassCard Puntos Pass',
  'tarjeta-anda': 'Tarjeta ANDA',
  'cabal-uruguay': 'Cabal Uruguay',
  'tarjeta-lider': 'Tarjeta Líder (Italmundo)',
  'btg-uruguay-tdc': 'BTG Pactual (ex HSBC)',
})

/**
 * The one figure that opens each programme's meta description: its earn rate, or its annual cost
 * or best discount when that is what sets it apart.
 *
 * All 23 descriptions used to share one template ("cómo suma puntos, cuánto vale el punto, costo
 * anual…"), which told a SERP nothing about any of them. Each line restates figures from the ficha's
 * own notes and nothing else: `tests/unit/cardProgramPages.test.ts` checks that every number here
 * appears in that programme's notes, so a ficha that changes turns its headline red.
 */
export const CARD_PROGRAM_HEADLINES: Readonly<Record<string, string>> = Object.freeze({
  'brou-recompensa': '1 punto cada $U 100 pagados con crédito y cada punto vale $U 1',
  'club-tienda-inglesa-puntos': '15 puntos cada $U 900 en Tienda Inglesa y cada punto vale $U 1',
  'scotia-puntos': 'de 1 punto cada $U 150 a 1 cada $U 80 según la tarjeta; el punto vale $U 1',
  'santander-soy-santander-puntos':
    'de 1 punto cada $U 100 a 1 cada $U 70 según el segmento; el punto vale $U 1',
  'bbva-puntos-bbva': '1 punto cada $100 (cada $80 en la gama alta) y el punto vale $1',
  'bbva-comunidad-plus':
    'suma Puntos BBVA y Puntos Plus a la vez; 743 UI al año desde el segundo año',
  'itau-volar': '1 milla por cada US$ 1 y UI 864 al año después del primer año',
  'itau-volar-platinum': '1 milla por cada US$ 1 y UI 1.058 al año después del primer año',
  'itau-latam-pass-platinum':
    '1 milla LATAM Pass por cada US$ 1 y UI 1.058 al año después del primer año',
  'itau-volar-black': '1 milla por cada US$ 1 y UI 1.454 al año, con el primer año sin costo',
  'scotia-puntos-american-express': '1 punto por cada dólar y cargo anual desde UI 1.000',
  'scotia-connectmiles': '1 milla por cada US$ 1 y cargo anual de UI 1.000 a UI 2.100',
  'itau-latam-pass-internacional':
    '1 milla LATAM Pass cada US$ 2 y UI 864 al año después del primer año',
  'oca-oca-blue': '1 Metro cada $U 104 con OCA Blue y $U 0,20 por Metro al canjear',
  'scotia-club-card-tienda-inglesa': '30 puntos cada $900 en Tienda Inglesa y el punto vale $1 ahí',
  'pronto-visa': '1 punto cada $30 de compra y 1.000 puntos de bienvenida',
  'mas-grupo-disco-sumaclub': '2 puntos cada $420 en Disco, Devoto y Géant y 1 cada $650 afuera',
  'creditel-credipuntos':
    '1 Credipunto cada $25 en compras y hasta 20% de descuento todos los días',
  'passcard-puntos-pass':
    '1 punto cada $100 (1 punto = $1) y 25% a 30% por rubro de lunes a viernes',
  'tarjeta-anda': 'sin costo anual y 1 punto cada $U 40 gastados con la tarjeta',
  'cabal-uruguay': '50% en cine y 40% en medicamentos con receta, sin programa de puntos publicado',
  'tarjeta-lider': 'hasta 30% en supermercados y 25% en combustible (nivel Platino)',
  'btg-uruguay-tdc': 'Visa Internacional US$ 85 al año + IVA y sin programa de puntos',
})

/** What the programme pays back in, read off its own programme name. */
export type RewardNoun = 'puntos' | 'millas' | null

/**
 * `millas` for an airline-miles programme, `null` for a card whose ficha says it has no points
 * programme at all (Cabal, Líder, BTG), `puntos` for the rest. Read from `pointsProgramName`, the
 * field the ficha uses to name the programme, so the question the page asks matches the answer.
 */
export function rewardNoun(program: Pick<CardProgram, 'pointsProgramName'>): RewardNoun {
  const name = program.pointsProgramName.trim()
  if (/^sin programa/i.test(name)) return null
  if (/milla|latam pass|connectmiles/i.test(name)) return 'millas'
  return 'puntos'
}

/** Where the programme's discounts are, when the Bankos map covers its issuer. */
export interface CardProgramDiscounts {
  bankName: string
  /** The discounts map with this bank's credit cards preselected. */
  mapPath: string
  /** The indexable per-bank discount list, when the bank has one. */
  bankPagePath: string | null
}

export interface CardProgramPageModel {
  id: string
  slug: string
  path: string
  indexPath: string
  indexLabel: string
  name: string
  catalogName: string
  issuer: string
  issuerTypeLabel: string
  networks: string
  rewardNoun: RewardNoun
  title: string
  description: string
  heading: string
  lead: string
  reviewedAt: string
  reviewedLabel: string
  verified: boolean
  rank: number
  of: number
  overall: number
  tier: RankingTierId
  tierBlurb: string
  scores: EntityScoreRow[]
  scoreSummary: string
  rationale: string | null
  facts: EntityFact[]
  pros: readonly string[]
  cons: readonly string[]
  bestFor: string
  discounts: CardProgramDiscounts | null
  faq: EntityFaq[]
  comparisons: EntityLink[]
  /** Why the programme has no head-to-head pages, when it has none. */
  comparisonsNote: string | null
  siblings: EntityLink[]
  tools: EntityLink[]
  sources: EntitySource[]
  /** Said when the ranking cites no source of its own for this ficha. */
  sourcesNote: string | null
}

/** The issuer a programme belongs to, for grouping siblings; `null` when untracked. */
function issuerKey(id: string): string | null {
  return PROGRAM_REDDIT_ENTITY[id] ?? BANKOS_BANK_BY_CREDIT_PROGRAM[id] ?? null
}

/** Build the page model for one programme. Throws for a programme with no slug or name. */
export function buildCardProgramPage(program: CardProgram): CardProgramPageModel {
  const path = cardProgramPagePath(program.id)
  const name = CARD_PROGRAM_NAMES[program.id]
  const headline = CARD_PROGRAM_HEADLINES[program.id]
  if (!path || !name || !headline) {
    throw new Error(`El programa ${program.id} no tiene slug, nombre o titular de página`)
  }

  const ranked = rankedPrograms()
  const self = ranked.find(entry => entry.id === program.id)
  if (!self) throw new Error(`El programa ${program.id} no está en el ranking`)
  const of = ranked.length

  const noun = rewardNoun(program)
  // "Scotia Puntos: puntos, beneficios y costo" says the word twice; a name that already carries
  // it takes the ladder without it.
  const titleNoun = noun && !/punto|milla/i.test(name) ? noun : null
  const pointWord = noun === 'millas' ? 'la milla' : 'el punto'
  const reviewedLabel = dateLabel(CARD_REWARDS_LAST_REVIEWED)
  const networks = joinSpanishList(program.networks.map(network => NETWORK_LABELS[network]))

  const scores: EntityScoreRow[] = REWARD_RUBRIC.map(dimension => ({
    id: dimension.id,
    label: dimension.label,
    weight: dimension.weight,
    score: program.scores[dimension.id],
    what: dimension.what,
  }))
  const tier = rankingTierForScore(self.overall)
  const tierBlurb = RANKING_TIERS.find(entry => entry.id === tier)?.blurb ?? ''
  const summary = scoreSummary(scores)

  const title = fitTitle(
    titleNoun
      ? [
          `${name}: ${titleNoun}, beneficios y costo`,
          `${name}: ${titleNoun} y beneficios`,
          `${name}: beneficios y costo`,
          `${name}: beneficios`,
          name,
        ]
      : [`${name}: beneficios y costo`, `${name}: beneficios`, name]
  )

  const heading = `${name}: ${noun ? `cómo suma ${noun}, ` : ''}cuánto cuesta y qué beneficios tiene`

  // Opens with the programme's own figure, so the part a SERP keeps says something no other card
  // page says; each rung drops the least important clause until it fits.
  const description = fitDescription([
    `${name}: ${headline}. Puesto ${self.rank} de ${of} en nuestro ranking de tarjetas de crédito (${self.overall}/100), revisado el ${reviewedLabel}.`,
    `${name}: ${headline}. Puesto ${self.rank} de ${of} en nuestro ranking (${self.overall}/100), revisado el ${reviewedLabel}.`,
    `${name}: ${headline}. Puesto ${self.rank} de ${of} en nuestro ranking (${self.overall}/100).`,
    `${name}: ${headline}.`,
  ])

  const lead = normalizeSpaces(
    `${program.name} está ${self.rank}º de ${of} en nuestro ranking de tarjetas de crédito de Uruguay, con ${self.overall} puntos sobre 100 (tier ${tier}). Ideal para ${lowerFirst(
      ensurePeriod(program.bestFor)
    )}`
  )

  const facts: EntityFact[] = [
    { label: 'Emisor', value: program.issuer },
    { label: 'Tipo de emisor', value: ISSUER_TYPE_LABELS[program.issuerType] },
    { label: 'Redes', value: networks },
    { label: 'Programa', value: program.pointsProgramName },
    { label: 'Cómo acumula', value: program.earnRateNote },
    // A card with no points programme (Cabal, Líder) still carries a pointValueNote that says "No
    // aplica"; asking what its point is worth would contradict the ficha. Gated on the noun.
    ...(noun && program.pointValueNote
      ? [{ label: `Cuánto vale ${pointWord}`, value: program.pointValueNote }]
      : []),
    { label: 'Cómo se canjea', value: program.redemptionNote },
    { label: 'Descuentos y beneficios', value: program.discountNote },
    { label: 'Costo', value: program.feeNote },
    ...(program.note ? [{ label: 'Nota', value: program.note }] : []),
    {
      label: 'Datos confirmados',
      value: program.verified
        ? `Sí, contra fuente oficial (revisión del ${reviewedLabel})`
        : `Parcial: la ficha tiene datos sin confirmar en fuente oficial (revisión del ${reviewedLabel})`,
    },
  ]

  const bankId = BANKOS_BANK_BY_CREDIT_PROGRAM[program.id]
  const bankPage = bankId ? bankPageForBankId(bankId) : undefined
  const discounts: CardProgramDiscounts | null = bankId
    ? {
        bankName: bankosBankName(bankId),
        mapPath: bankosMapPath(bankId, 'credit'),
        bankPagePath: bankPage ? `/descuentos-con-tarjeta-uruguay/${bankPage.slug}` : null,
      }
    : null

  const nounArticle = noun === 'millas' ? 'las millas' : 'los puntos'
  const faq: EntityFaq[] = [
    {
      id: 'acumulacion',
      question: noun
        ? `¿${noun === 'millas' ? 'Cuántas' : 'Cuántos'} ${noun} da ${name}?`
        : `¿${name} tiene programa de puntos?`,
      answer: ensurePeriod(program.earnRateNote),
    },
    ...(noun && program.pointValueNote
      ? [
          {
            id: 'valor',
            question: `¿Cuánto vale ${pointWord} de ${name}?`,
            answer: ensurePeriod(program.pointValueNote),
          },
        ]
      : []),
    {
      id: 'canje',
      question: noun
        ? `¿Cómo se canjean ${nounArticle} de ${name}?`
        : `¿${name} tiene canje de puntos?`,
      answer: ensurePeriod(program.redemptionNote),
    },
    {
      id: 'costo',
      question: `¿${name} tiene costo anual?`,
      answer: ensurePeriod(program.feeNote),
    },
    {
      id: 'descuentos',
      question: `¿Qué descuentos y beneficios tiene ${name}?`,
      answer: ensurePeriod(program.discountNote),
    },
    {
      id: 'ranking',
      question: `¿Qué puntaje tiene ${name} en el ranking?`,
      answer: normalizeSpaces(
        `${self.overall} sobre 100: puesto ${self.rank} de ${of} en nuestro ranking de tarjetas de crédito de Uruguay, tier ${tier}, ${lowerFirst(
          ensurePeriod(tierBlurb)
        )} ${summary}`
      ),
    },
    {
      id: 'para-quien',
      question: `¿Para quién conviene ${name}?`,
      answer: ensurePeriod(program.bestFor),
    },
  ]

  const comparisons = comparisonLinks('tarjetas-de-credito', program.id)
  const comparisonsNote = comparisons.length
    ? null
    : `Las comparativas uno contra uno se arman con los ${comparativaEntityCount(
        'tarjetas-de-credito'
      )} programas mejor puntuados del ranking, y ${name} queda afuera por puntaje. Para ponerlo al lado de otro, usá el ranking completo.`

  // Siblings: the same issuer's other programmes first (Volar vs Platinum vs Black is the real
  // question), then the programmes whose overall sits closest.
  const key = issuerKey(program.id)
  const others = ranked.filter(entry => entry.id !== program.id)
  const sameIssuer = key ? others.filter(entry => issuerKey(entry.id) === key) : []
  const closest = nearest(
    others.filter(entry => !sameIssuer.includes(entry)),
    entry => Math.abs(entry.overall - self.overall),
    SIBLING_LIMIT
  )
  const siblings: EntityLink[] = [...sameIssuer, ...closest]
    .slice(0, SIBLING_LIMIT)
    .flatMap(entry => {
      const to = cardProgramPagePath(entry.id)
      const label = CARD_PROGRAM_NAMES[entry.id]
      return to && label ? [{ to, label, hint: `${entry.overall}/100` }] : []
    })

  const tools: EntityLink[] = [
    { to: ROUTE.index, label: 'Ranking completo de tarjetas de crédito' },
    { to: '/comparativas/tarjetas-de-credito', label: 'Comparativas de tarjetas de crédito' },
    { to: '/descuentos-con-tarjeta-uruguay', label: 'Mapa de descuentos por banco' },
    { to: '/pagar-cuentas-con-tarjeta', label: 'Pagar cuentas con tarjeta: ¿suma puntos?' },
    { to: '/conviene-comprar-en-cuotas', label: '¿Conviene comprar en cuotas?' },
    { to: '/tarjetas-de-debito-uruguay', label: 'Tarjetas de débito para comprar en dólares' },
  ]

  const sources = uniqueSources(
    CARD_REWARDS_SOURCES.filter(source => source.programs.includes(program.id)).map(source => ({
      label: source.label,
      url: source.url,
    }))
  )
  // Only what is true of every programme without a link: the ranking cites none of its own. The
  // old "la nota de arriba dice de dónde sale cada dato" overclaimed for Cabal and Líder, whose
  // notes are corrections, not sourcing.
  const sourcesNote = sources.length
    ? null
    : 'El ranking no cita una fuente propia para este programa.'

  return {
    id: program.id,
    slug: path.slice(ROUTE.index.length + 1),
    path,
    indexPath: ROUTE.index,
    indexLabel: ROUTE.label,
    name,
    catalogName: program.name,
    issuer: program.issuer,
    issuerTypeLabel: ISSUER_TYPE_LABELS[program.issuerType],
    networks,
    rewardNoun: noun,
    title,
    description,
    heading,
    lead,
    reviewedAt: CARD_REWARDS_LAST_REVIEWED,
    reviewedLabel,
    verified: program.verified,
    rank: self.rank,
    of,
    overall: self.overall,
    tier,
    tierBlurb,
    scores,
    scoreSummary: summary,
    rationale: program.rationale ?? null,
    facts,
    pros: program.pros,
    cons: program.cons,
    bestFor: program.bestFor,
    discounts,
    faq,
    comparisons,
    comparisonsNote,
    siblings,
    tools,
    sources,
    sourcesNote,
  }
}

/** The page model behind a slug, or `undefined` for an unknown one. */
export function getCardProgramPage(slug: string): CardProgramPageModel | undefined {
  const id = entityIdForSlug('tarjetas-de-credito', slug)
  const program = id ? CARD_PROGRAMS.find(candidate => candidate.id === id) : undefined
  return program ? buildCardProgramPage(program) : undefined
}

/** Every programme's page model, in catalogue order. */
export function allCardProgramPages(): CardProgramPageModel[] {
  return CARD_PROGRAMS.map(buildCardProgramPage)
}
