// The per-casa intent pages (`/casa/:origin/:intent`).
//
// Search Console says the site's largest untapped demand is brand + intent:
// "cambio gales horario", "cambio gales telefono", "cambio gales sucursales",
// "cambio principal rivera". Those queries land on `/casa/:origin`, which
// answers the rate and buries the rest, and the CTR shows it (7.602 impressions
// and 45 clicks for "cambio gales"). This module gives each intent its own URL,
// its own H1 and its own body, built from data we already hold.
//
// PURE module (no Vue/Nuxt runtime, relative imports only): the page, the
// sitemap route and the tests all derive the same slug set and the same copy.
//
// The hard rule for this family: a page only exists when we have the DATA that
// answers it. No branch with a phone number means no `/telefono` page, and the
// sitemap never lists one — a page whose whole job is to print a phone number
// and cannot is the definition of thin.

import { deptLabel, displayableHours, tidy, type BranchPage } from './branches'

/** The intents a casa page can be sliced into. */
export const CASA_INTENTS = [
  'horarios',
  'telefono',
  'opiniones',
  'comprar-dolares',
  'vender-dolares',
] as const

export type CasaIntent = (typeof CASA_INTENTS)[number]

/** Narrow an arbitrary route param to a known intent. */
export function isCasaIntent(value: string): value is CasaIntent {
  return (CASA_INTENTS as readonly string[]).includes(value)
}

/** Static presentation metadata for an intent. */
export interface CasaIntentMeta {
  slug: CasaIntent
  /** Uppercase chip/OG label. */
  tag: string
  /** Nav/breadcrumb label. */
  label: string
  /** MDI icon used on the casa hub's intent chips. */
  icon: string
}

export const CASA_INTENT_META: Readonly<Record<CasaIntent, CasaIntentMeta>> = Object.freeze({
  horarios: {
    slug: 'horarios',
    tag: 'HORARIOS',
    label: 'Horarios',
    icon: 'mdi-clock-outline',
  },
  telefono: {
    slug: 'telefono',
    tag: 'CONTACTO',
    label: 'Teléfonos',
    icon: 'mdi-phone-outline',
  },
  opiniones: {
    slug: 'opiniones',
    tag: 'OPINIONES',
    label: 'Opiniones',
    icon: 'mdi-star-outline',
  },
  'comprar-dolares': {
    slug: 'comprar-dolares',
    tag: 'COMPRAR',
    label: 'Comprar dólares',
    icon: 'mdi-cash-plus',
  },
  'vender-dolares': {
    slug: 'vender-dolares',
    tag: 'VENDER',
    label: 'Vender dólares',
    icon: 'mdi-cash-minus',
  },
})

/** Everything an intent page needs to know about the casa, resolved server-side. */
export interface CasaFacts {
  origin: string
  name: string
  /** Branches of this casa, already slugged. */
  branches: BranchPage[]
  /** Department labels where it operates, deduped and sorted. */
  departments: string[]
  /** This casa's USD cash quote today, when it publishes one. */
  usd: { buy: number; sell: number; type: string } | null
  /** Cheapest USD sell across the market today (what the best casa charges you). */
  marketBestSell: number | null
  /** Highest USD buy across the market today (what the best casa pays you). */
  marketBestBuy: number | null
  /** How many casas quote USD today — the denominator of "puesto N de M". */
  marketSize: number
  /** 1-based position by cheapest sell; `null` when this casa does not quote. */
  sellRank: number | null
  /** 1-based position by highest buy; `null` when this casa does not quote. */
  buyRank: number | null
  /** Google rating for the casa, when the reviews store has one. */
  rating: { score: number; count: number } | null
  /** BCU institution page for the casa, when `localData` carries it. */
  bcuUrl: string
  website: string
}

/** Branches whose opening-hours field holds something worth printing. */
export function branchesWithHours(branches: readonly BranchPage[]): BranchPage[] {
  return branches.filter(branch => displayableHours(branch.hoursLabel))
}

/** Branches with a phone number. */
export function branchesWithPhone(branches: readonly BranchPage[]): BranchPage[] {
  return branches.filter(branch => tidy(branch.phoneLabel).length >= 7)
}

/** The minimum a caller must know to decide which intent pages exist. */
export interface IntentAvailabilityInput {
  branches: readonly BranchPage[]
  /** True when the casa publishes a public USD quote today. */
  quotesUsd: boolean
  /** True when `localData` carries the casa's BCU institution page. */
  hasBcu: boolean
  /** True when a Google rating is known for the casa. */
  hasRating: boolean
}

/**
 * Whether an intent has enough data to deserve a URL.
 *
 * This predicate is the single gate: the page's route guard, the casa hub's
 * chips and the XML sitemap all resolve through it, so the three can never
 * disagree about whether `/casa/brou/telefono` exists. A page whose only job is
 * to print data we do not have is exactly the thin page this family must not
 * ship 200 of.
 */
export function intentAvailable(intent: CasaIntent, input: IntentAvailabilityInput): boolean {
  switch (intent) {
    case 'horarios':
      return branchesWithHours(input.branches).length > 0
    case 'telefono':
      return branchesWithPhone(input.branches).length > 0
    case 'opiniones':
      // A rating, a BCU registry entry or a physical presence each give the page
      // something real to say; a casa with none of the three would be a stub.
      return input.hasRating || input.hasBcu || input.branches.length > 0
    case 'comprar-dolares':
    case 'vender-dolares':
      return input.quotesUsd
    default:
      return false
  }
}

/** Every intent that has data, in display order. */
export function intentsFor(input: IntentAvailabilityInput): CasaIntent[] {
  return CASA_INTENTS.filter(intent => intentAvailable(intent, input))
}

/** {@link intentAvailable} against the facts a page already resolved. */
export function intentIsAvailable(intent: CasaIntent, facts: CasaFacts): boolean {
  return intentAvailable(intent, factsToAvailability(facts))
}

/** Every intent that currently has data for this casa, in display order. */
export function availableIntents(facts: CasaFacts): CasaIntent[] {
  return intentsFor(factsToAvailability(facts))
}

function factsToAvailability(facts: CasaFacts): IntentAvailabilityInput {
  return {
    branches: facts.branches,
    quotesUsd: Boolean(facts.usd),
    hasBcu: Boolean(facts.bcuUrl),
    hasRating: Boolean(facts.rating),
  }
}

/** Departments of a casa as display labels, deduped and alphabetical. */
export function departmentLabels(branches: readonly BranchPage[]): string[] {
  const labels = new Set<string>()
  for (const branch of branches) {
    const label = deptLabel(branch.dept)
    if (label) labels.add(label)
  }
  return [...labels].sort((a, b) => a.localeCompare(b, 'es'))
}

/** Join a list the way Spanish prose does: `'a, b y c'`. */
export function joinEs(items: readonly string[]): string {
  const list = items.filter(Boolean)
  if (list.length === 0) return ''
  if (list.length === 1) return list[0] as string
  return `${list.slice(0, -1).join(', ')} y ${list[list.length - 1]}`
}

/** Format a rate the way the site does elsewhere: `'42,35'`. */
export function formatRateEs(value: number): string {
  return value.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 3 })
}

/** Format a peso amount with no decimals: `'1.250'`. */
export function formatPesosEs(value: number): string {
  return Math.round(value).toLocaleString('es-UY')
}

/** H1 for an intent page. Shaped like the query it answers. */
export function intentHeading(intent: CasaIntent, facts: CasaFacts): string {
  switch (intent) {
    case 'horarios':
      return `Horarios de ${facts.name}`
    case 'telefono':
      return `Teléfonos de ${facts.name}`
    case 'opiniones':
      return `${facts.name}: opiniones, reputación y datos verificables`
    case 'comprar-dolares':
      return `Comprar dólares en ${facts.name}`
    case 'vender-dolares':
      return `Vender dólares en ${facts.name}`
  }
}

/** Document `<title>`, with the geographic qualifier the query usually carries. */
export function intentTitle(intent: CasaIntent, facts: CasaFacts): string {
  const where = facts.departments.length === 1 ? ` en ${facts.departments[0]}` : ' en Uruguay'
  switch (intent) {
    case 'horarios':
      return `Horarios de ${facts.name}${where}: a qué hora abre cada sucursal`
    case 'telefono':
      return `Teléfono de ${facts.name}${where}: contacto de cada sucursal`
    case 'opiniones':
      return `${facts.name}: opiniones y reputación${where}`
    case 'comprar-dolares':
      return `Comprar dólares en ${facts.name}: precio de hoy y cuánto te cuesta de más`
    case 'vender-dolares':
      return `Vender dólares en ${facts.name}: cuánto te pagan hoy`
  }
}

/**
 * Meta description built from THIS casa's numbers.
 *
 * Deliberately fact-first (branch count, department list, today's gap to the
 * best price) so that 44 casas do not share one templated sentence with the
 * name swapped — which is what makes a programmatic family look like a doorway
 * set to both a reader and a crawler.
 */
export function intentDescription(intent: CasaIntent, facts: CasaFacts): string {
  const withHours = branchesWithHours(facts.branches).length
  const withPhone = branchesWithPhone(facts.branches).length
  const where = facts.departments.length ? ` en ${joinEs(facts.departments.slice(0, 4))}` : ''

  switch (intent) {
    case 'horarios':
      return `A qué hora abre y cierra ${facts.name}: horario declarado ante el BCU de ${withHours} ${
        withHours === 1 ? 'sucursal' : 'sucursales'
      }${where}, día por día, con la dirección y el teléfono de cada una.`
    case 'telefono':
      return `Teléfonos de ${facts.name}: ${withPhone} ${
        withPhone === 1 ? 'número' : 'números'
      } de contacto por sucursal${where}, con dirección y horario de atención de cada local.`
    case 'opiniones': {
      const rating = facts.rating
        ? `Calificación de ${facts.rating.score.toFixed(1)} sobre ${facts.rating.count} reseñas de Google`
        : 'Reputación'
      return `${rating}, registro en el Banco Central y qué tan competitiva es hoy la pizarra de ${facts.name} frente al resto del mercado.`
    }
    case 'comprar-dolares': {
      const price = facts.usd ? `Hoy vende el dólar a $ ${formatRateEs(facts.usd.sell)}. ` : ''
      return `${price}Cuánto te cuesta comprar dólares en ${facts.name} frente a la casa más barata del día, en qué puesto del mercado está y dónde operar${where}.`
    }
    case 'vender-dolares': {
      const price = facts.usd ? `Hoy compra el dólar a $ ${formatRateEs(facts.usd.buy)}. ` : ''
      return `${price}Cuánto te pagan por tus dólares en ${facts.name} frente a la casa que mejor paga hoy, y cuánto perdés si vendés en el lugar equivocado.`
    }
  }
}

/**
 * A sentence quantifying this casa's position today, or `''` when it does not quote.
 *
 * The rank clause is appended only when the casa is inside the ranked set: a
 * board flagged as off-market is excluded from the ranking, and printing
 * "0º de 43" (or silently dropping the whole comparison) would be worse than
 * stating the gap without a position.
 */
export function marketPositionSentence(
  intent: 'comprar-dolares' | 'vender-dolares',
  facts: CasaFacts
): string {
  if (!facts.usd) return ''

  if (intent === 'comprar-dolares') {
    if (facts.marketBestSell === null) return ''
    const gap = facts.usd.sell - facts.marketBestSell
    if (gap <= 0.0001) {
      return `Hoy ${facts.name} tiene la venta más barata del mercado: ningún otro lugar te cobra menos por cada dólar.`
    }
    const rank =
      facts.sellRank && facts.marketSize
        ? ` Está ${facts.sellRank}º de ${facts.marketSize} casas.`
        : ''
    return `Hoy ${facts.name} vende a $ ${formatRateEs(facts.usd.sell)} y la casa más barata vende a $ ${formatRateEs(
      facts.marketBestSell
    )}: son $ ${formatRateEs(gap)} más por dólar, unos $ ${formatPesosEs(
      gap * 1000
    )} extra en una compra de 1.000 dólares.${rank}`
  }

  if (facts.marketBestBuy === null) return ''
  const gap = facts.marketBestBuy - facts.usd.buy
  if (gap <= 0.0001) {
    return `Hoy ${facts.name} es quien mejor paga el dólar: nadie te da más por cada billete.`
  }
  const rank =
    facts.buyRank && facts.marketSize ? ` Está ${facts.buyRank}º de ${facts.marketSize} casas.` : ''
  return `Hoy ${facts.name} paga $ ${formatRateEs(facts.usd.buy)} por dólar y el que mejor paga da $ ${formatRateEs(
    facts.marketBestBuy
  )}: son $ ${formatRateEs(gap)} menos por dólar, unos $ ${formatPesosEs(
    gap * 1000
  )} de diferencia si vendés 1.000 dólares.${rank}`
}
