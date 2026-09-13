// Shared building blocks for the three per-entity page families: /couriers-uruguay/<courier>,
// /tarjetas-de-credito-uruguay/<programa> and /tarjetas-de-debito-uruguay/<tarjeta>.
//
// Each family module (courierPages, cardProgramPages, debitCardPages) turns ONE catalogue row
// into ONE page model without writing a new fact. What they share lives here: the title budget,
// the es-UY formatting, the Spanish list joiner and the lookup of the head-to-head pages an entity
// already takes part in, so the three families link into /comparativas the same way.
//
// PURE module (no Vue/Nuxt runtime, relative imports only) so vitest exercises it directly.

import { familyPairs, getComparativaFamily, type ComparativaFamily } from './comparativas'

/** The brand the `titleTemplate` in app.vue appends when a title does not already carry it. */
export const BRAND_SUFFIX = ' | Cambio Uruguay'

/** Roughly what a SERP shows of a `<title>` before cutting it: see seoTitleBudget.test.ts. */
export const MAX_TITLE = 60

/** What a page title may spend before the brand suffix eats the rest. */
export const TITLE_BUDGET = MAX_TITLE - BRAND_SUFFIX.length

/** What a SERP shows of a meta description before cutting it. */
export const MAX_DESCRIPTION = 160

/** How many sibling detail pages each page links to. */
export const SIBLING_LIMIT = 4

/** A labelled catalogue fact. */
export interface EntityFact {
  label: string
  value: string
}

/** An internal link, pre-`localePath()`. */
export interface EntityLink {
  to: string
  label: string
  /** A short figure next to the label, e.g. `'US$ 17,50 el kilo'`. */
  hint?: string
}

/** An external source backing the page's figures. */
export interface EntitySource {
  label: string
  url: string
  publisher?: string
}

/** One FAQ entry; the same shape `FaqSection` renders. */
export interface EntityFaq {
  id: string
  question: string
  answer: string
}

/** One rubric axis resolved for one entity. */
export interface EntityScoreRow {
  id: string
  label: string
  /** Weight in the overall score, out of 100. */
  weight: number
  score: number
  what: string
}

/** Collapse runs of whitespace and trim. */
export function normalizeSpaces(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/** End a sentence with a period unless it already closes itself. */
export function ensurePeriod(text: string): string {
  const clean = normalizeSpaces(text)
  return /[.!?…]$/.test(clean) ? clean : `${clean}.`
}

/**
 * Lowercase the first character, for splicing a catalogue sentence into running prose.
 *
 * Only a capitalised WORD is lowered: "Desde EE.UU." becomes "desde EE.UU.", but a sentence that
 * opens with an acronym or a symbol ("US$2,20/100 g", "BROU…") keeps it, or the splice would
 * print "uS$".
 */
export function lowerFirst(text: string): string {
  return /^\p{Lu}\p{Ll}/u.test(text) ? text.charAt(0).toLocaleLowerCase('es') + text.slice(1) : text
}

/**
 * The first candidate that fits {@link TITLE_BUDGET}, most specific first.
 *
 * Titles are built from catalogue names, and those run from "Glic" to "Itaú Volar Mastercard
 * Black". One template for every entity would either get the long names cut in the SERP or waste
 * the short ones, so each family offers a ladder and takes the richest rung that fits. The last
 * rung is the bare name, kept even if it overflows: a title never drops the name.
 */
export function fitTitle(candidates: ReadonlyArray<string | false | null | undefined>): string {
  return firstThatFits(candidates, TITLE_BUDGET)
}

/**
 * The first meta description that fits {@link MAX_DESCRIPTION}, most specific first.
 *
 * Same ladder as {@link fitTitle}: each rung drops the least important clause, so the figure that
 * opens the description is the part that always survives the SERP's cut.
 */
export function fitDescription(
  candidates: ReadonlyArray<string | false | null | undefined>
): string {
  return firstThatFits(candidates, MAX_DESCRIPTION)
}

function firstThatFits(
  candidates: ReadonlyArray<string | false | null | undefined>,
  max: number
): string {
  const clean = candidates
    .filter((candidate): candidate is string => typeof candidate === 'string')
    .map(normalizeSpaces)
    .filter(Boolean)
  return clean.find(candidate => candidate.length <= max) ?? clean[clean.length - 1] ?? ''
}

/** `2026-06-18` → `18/06/2026`, the way the index pages print their verification dates. */
export function dateLabel(iso: string): string {
  const [yyyy, mm, dd] = iso.split('-')
  return `${dd}/${mm}/${yyyy}`
}

/** A plain es-UY number: `2.5` → `2,5`. */
export function formatNumberEs(value: number): string {
  return value.toLocaleString('es-UY', { maximumFractionDigits: 2 })
}

/** A dollar amount with cents: `17.5` → `US$ 17,50`. */
export function formatUsd(value: number): string {
  return `US$ ${value.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** A 0–5 rating with one decimal: `4.9` → `4,9`. */
export function formatRating(value: number): string {
  return value.toFixed(1).replace('.', ',')
}

/** Join a list the way Spanish prose does: `a, b y c`. */
export function joinSpanishList(items: readonly string[], last = 'y'): string {
  const list = items.filter(Boolean)
  if (list.length <= 1) return list[0] ?? ''
  return `${list.slice(0, -1).join(', ')} ${last} ${list[list.length - 1]}`
}

/** Bare host of a URL, without scheme or `www.`. */
export function hostOf(url: string): string {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
}

/** Drop repeated URLs, keeping the first label seen for each. */
export function uniqueSources(sources: readonly EntitySource[]): EntitySource[] {
  const seen = new Set<string>()
  const out: EntitySource[] = []
  for (const source of sources) {
    if (!source.url || seen.has(source.url)) continue
    seen.add(source.url)
    out.push(source)
  }
  return out
}

/**
 * The `limit` items closest to the page's own entity, by a distance the caller defines.
 *
 * Ties keep catalogue order, so the sibling list is stable between builds.
 */
export function nearest<T>(pool: readonly T[], distance: (item: T) => number, limit: number): T[] {
  return pool
    .map((item, index) => ({ item, index, d: distance(item) }))
    .sort((a, b) => a.d - b.d || a.index - b.index)
    .slice(0, limit)
    .map(entry => entry.item)
}

/** The strongest and weakest axis of a score card; ties resolve to rubric order. */
export function scoreExtremes(
  rows: readonly EntityScoreRow[]
): { best: EntityScoreRow; worst: EntityScoreRow } | null {
  const first = rows[0]
  if (!first) return null
  let best = first
  let worst = first
  for (const row of rows) {
    if (row.score > best.score) best = row
    if (row.score < worst.score) worst = row
  }
  return { best, worst }
}

/** `acumulación 25%, canje 20% y costo 15%`: the rubric weights, for running prose. */
export function rubricWeightsText(rows: readonly EntityScoreRow[]): string {
  return joinSpanishList(rows.map(row => `${row.label.toLocaleLowerCase('es')} ${row.weight}%`))
}

/**
 * The score card in two sentences: the strongest axis, the weakest, and how the overall is built.
 *
 * Stating the weights next to the number is the point: the overall is computed in code from them,
 * never typed by hand, and a reader who disagrees with a weight can see exactly what to discount.
 */
export function scoreSummary(rows: readonly EntityScoreRow[]): string {
  const extremes = scoreExtremes(rows)
  if (!extremes) return ''
  const { best, worst } = extremes
  const lower = (row: EntityScoreRow) => row.label.toLocaleLowerCase('es')
  return `Su eje más fuerte es ${lower(best)} (${best.score}) y el más flojo, ${lower(worst)} (${worst.score}). El puntaje general no se escribe a mano: se calcula a partir de ${rows.length} ejes con peso fijo, ${rubricWeightsText(rows)}.`
}

/**
 * The head-to-head pages an entity already takes part in, as links.
 *
 * Read from the comparativas module itself rather than rebuilt here, so a detail page can never
 * link a pair that `/comparativas/<familia>/<par>` would answer with a 404 — including the credit
 * programmes that fall outside that family's pairing cap.
 */
export function comparisonLinks(family: ComparativaFamily, id: string): EntityLink[] {
  const meta = getComparativaFamily(family)
  if (!meta) return []
  return familyPairs(meta)
    .filter(pair => pair.a.id === id || pair.b.id === id)
    .map(pair => {
      const other = pair.a.id === id ? pair.b : pair.a
      return { to: `/comparativas/${family}/${pair.slug}`, label: `vs ${other.shortName}` }
    })
}

/** How many entities of a family enter the head-to-head pairing. */
export function comparativaEntityCount(family: ComparativaFamily): number {
  return getComparativaFamily(family)?.entities.length ?? 0
}
