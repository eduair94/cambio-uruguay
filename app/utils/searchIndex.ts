// Builds the site-wide search corpus from the navigation model plus every
// content catalogue, and parses "100 usd"-style numeric queries.
//
// PURE module (no Vue/Nuxt runtime) so vitest can exercise it directly. It is
// the "heavy lane": it pulls in the catalogues, so only the search surfaces
// import it — the palette does so dynamically on first open, `/buscar` and
// `/mapa-del-sitio` statically. The layout never touches it.
//
// `buildSearchIndex` takes no live rows: casas seed from the static reputation
// snapshot. The palette and `/buscar` therefore score the identical corpus, so
// a result can never appear in one and be missing from the other.

import { CASAS_REPUTATION } from './casasDirectory'
import {
  CONVERT_CURRENCIES,
  amountLabel,
  convertEntries,
  convertSlug,
  convertTitle,
  getConvertEntry,
  type ConvertCode,
} from './convert'
import {
  CURRENCY_SLUG_TO_CODE,
  currencyContext,
  currencyDisplayName,
  currencySlug,
  type CurrencyCode,
  type CurrencyLang,
} from './currencyPages'
import { glossary } from './glossary'
import { guideHubs } from './guideHubs'
import { guides } from './guides'
import { indicators } from './indicators'
import { fold, makeDoc, navToDocs, type SearchDoc } from './siteNav'
import { tools } from './tools'

/** Spanish/English aliases per currency, folded into the search haystack. */
export const CURRENCY_ALIASES: Readonly<Record<CurrencyCode, readonly string[]>> = Object.freeze({
  USD: ['dolar', 'dolares', 'usd', 'u$s', 'us$', 'billete', 'verde', 'dollar'],
  EUR: ['euro', 'euros', 'eur'],
  BRL: ['real', 'reales', 'reais', 'brl', 'brasil'],
  ARS: ['peso argentino', 'pesos argentinos', 'ars', 'argentina', 'arg'],
  XAU: ['oro', 'gold', 'xau', 'onza', 'lingote'],
  JPY: ['yen', 'yenes', 'jpy', 'japon'],
  CHF: ['franco', 'franco suizo', 'chf', 'suiza'],
  PYG: ['guarani', 'guaranies', 'pyg', 'paraguay'],
  CLP: ['peso chileno', 'clp', 'chile'],
  PEN: ['sol', 'sol peruano', 'pen', 'peru'],
  COP: ['peso colombiano', 'cop', 'colombia'],
  MXN: ['peso mexicano', 'mxn', 'mexico'],
  CAD: ['dolar canadiense', 'cad', 'canada'],
  AUD: ['dolar australiano', 'aud', 'australia'],
  GBP: ['libra', 'libra esterlina', 'gbp', 'reino unido'],
})

/** Context passed to the index builder. Deliberately excludes live rate rows. */
export interface SearchIndexContext {
  locale: string
  t: (key: string, params?: Record<string, unknown>) => string
  /** Current theme mode, used only to label the theme quick action. */
  themeMode?: string
}

/**
 * The full search corpus: navigation pages, quick actions, and every catalogue
 * leaf (tools, currencies, conversions, glossary, guides, indicators, casas).
 *
 * Deterministic and side-effect free: two calls with the same context produce
 * deep-equal arrays, which is what keeps the palette and `/buscar` in lockstep.
 */
export function buildSearchIndex(ctx: SearchIndexContext): SearchDoc[] {
  const { locale, t, themeMode = 'dark' } = ctx
  const lang: CurrencyLang = locale === 'en' || locale === 'pt' ? locale : 'es'
  const docs: SearchDoc[] = navToDocs(t, locale, themeMode)

  for (const tool of tools) {
    docs.push(
      makeDoc({
        id: `tool:${tool.slug}`,
        type: 'tool',
        section: 'tools',
        title: tool.title,
        description: tool.description,
        icon: tool.icon,
        to: `/herramientas/${tool.slug}`,
        keywords: tool.keywords,
      })
    )
  }

  for (const [slug, code] of Object.entries(CURRENCY_SLUG_TO_CODE) as Array<
    [string, CurrencyCode]
  >) {
    docs.push(
      makeDoc({
        id: `currency:${slug}`,
        type: 'currency',
        section: 'tools',
        title: currencyDisplayName(code, lang),
        description: currencyContext(code),
        icon: 'mdi-cash',
        to: `/cotizacion/${slug}`,
        keywords: CURRENCY_ALIASES[code] ?? [code.toLowerCase()],
      })
    )
  }

  for (const entry of convertEntries) {
    docs.push(
      makeDoc({
        id: `convert:${entry.slug}`,
        type: 'convert',
        section: 'tools',
        title: convertTitle(entry),
        description: '',
        icon: 'mdi-cash-sync',
        to: `/convertir/${entry.slug}`,
        keywords: [String(entry.amount), entry.from.toLowerCase(), entry.to.toLowerCase()],
      })
    )
  }

  for (const term of glossary) {
    docs.push(
      makeDoc({
        id: `glossary:${term.slug}`,
        type: 'glossary',
        section: 'learn',
        title: term.term,
        description: term.short,
        icon: 'mdi-book-alphabet',
        to: `/glosario/${term.slug}`,
        keywords: [term.term],
      })
    )
  }

  for (const guide of guides) {
    docs.push(
      makeDoc({
        id: `guide:${guide.slug}`,
        type: 'guide',
        section: 'learn',
        title: guide.title,
        description: guide.description,
        icon: 'mdi-book-open-variant',
        to: `/guias/${guide.slug}`,
        keywords: [guide.tag],
      })
    )
  }

  for (const hub of guideHubs) {
    docs.push(
      makeDoc({
        id: `hub:${hub.slug}`,
        type: 'guide',
        section: 'learn',
        title: hub.title,
        description: hub.description,
        icon: hub.icon,
        to: `/temas/${hub.slug}`,
        // Deliberately NOT hub.tag: a tag like "CRÉDITO" would grab the bare
        // "credito" keyword bonus and outrank the canonical /prestamos-uruguay
        // hub. Hubs stay findable through their title + description haystack.
        keywords: ['tema', 'guias'],
      })
    )
  }

  for (const indicator of indicators) {
    docs.push(
      makeDoc({
        id: `indicator:${indicator.slug}`,
        type: 'indicator',
        section: 'tools',
        title: indicator.name,
        description: indicator.shortDef,
        icon: 'mdi-finance',
        to: `/indicadores/${indicator.slug}`,
        keywords: [indicator.abbr, indicator.name],
      })
    )
  }

  for (const casa of CASAS_REPUTATION) {
    docs.push(
      makeDoc({
        id: `casa:${casa.code}`,
        type: 'casa',
        section: 'houses',
        title: casa.name,
        description: '',
        icon: casa.category === 'banco' ? 'mdi-bank' : 'mdi-store-outline',
        to: `/casa/${casa.code}`,
        keywords: [casa.code, casa.category],
      })
    )
  }

  return docs
}

// ---------------------------------------------------------------------------
// Numeric quick action: "100 usd", "1.000,50 euros", "5000 pesos"
// ---------------------------------------------------------------------------

/** A parsed amount query, resolved to a real destination route. */
export interface AmountHit {
  amount: number
  from: ConvertCode
  to: ConvertCode
  /** The canonical `/convertir` slug for this amount, whether or not a page exists. */
  slug: string
  /** Where Enter goes: the prebaked page, else the live currency page. */
  navTo: string
  title: string
  /** Whether `/convertir/{slug}` is one of the ~66 prebaked pages. */
  prebaked: boolean
}

/**
 * Parse an es-UY formatted number: `.` groups thousands, `,` is the decimal
 * separator. A lone dot with one or two trailing digits (`10.5`) is read as a
 * decimal, because that is what people type. Returns `null` for anything else.
 */
export function parseEsNumber(input: string): number | null {
  const s = input.replace(/\s/g, '')
  if (!s || !/^[\d.,]+$/.test(s)) return null
  let normalized: string
  if (/^\d+\.\d{1,2}$/.test(s)) normalized = s
  else normalized = s.replace(/\./g, '').replace(',', '.')
  const n = Number.parseFloat(normalized)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

// The amount may carry es-UY group/decimal separators but no inner spaces; the
// currency alternatives are ordered longest-first so "pesos argentinos" wins
// over the bare "pesos" that would otherwise swallow it.
const AMOUNT_RE =
  /^\s*(\d[\d.,]*)\s*(u\$s|us\$|usd|dolar(?:es)?|dollars?|eur|euros?|brl|rea(?:les|is|l)|ars|pesos? argentinos?|uyu|pesos? uruguayos?|pesos?|\$)\s*$/

/** Map a matched currency word to its {@link ConvertCode}. */
function tokenToCode(token: string): ConvertCode {
  if (/^(?:u\$s|us\$|usd|dolar(?:es)?|dollars?)$/.test(token)) return 'USD'
  if (/^(?:eur|euros?)$/.test(token)) return 'EUR'
  if (/^(?:brl|rea(?:les|is|l))$/.test(token)) return 'BRL'
  if (/^pesos? argentinos?$|^ars$/.test(token)) return 'ARS'
  return 'UYU'
}

/**
 * Recognise a bare "amount + currency" query and resolve where Enter should go.
 *
 * `/convertir/[slug]` only renders one of ~66 prebaked amounts — an arbitrary
 * amount would render an empty page. So a non-prebaked amount routes to the
 * always-substantive `/cotizacion/{currency}` page instead, while the palette
 * still previews the exact typed amount inline.
 */
export function parseAmountQuery(query: string): AmountHit | null {
  const match = AMOUNT_RE.exec(fold(query))
  if (!match) return null

  const amount = parseEsNumber(match[1] as string)
  if (amount === null) return null

  const from = tokenToCode(match[2] as string)
  const to: ConvertCode = from === 'UYU' ? 'USD' : 'UYU'
  const slug = convertSlug(amount, from, to)
  const prebaked = Boolean(getConvertEntry(slug))
  const foreign: ConvertCode = from === 'UYU' ? to : from
  const navTo = prebaked
    ? `/convertir/${slug}`
    : `/cotizacion/${currencySlug(foreign as unknown as CurrencyCode)}`

  return {
    amount,
    from,
    to,
    slug,
    navTo,
    title: `¿Cuánto es ${amountLabel(amount, from)} en ${CONVERT_CURRENCIES[to].plural}?`,
    prebaked,
  }
}

/** The non-UYU side of a parsed amount, i.e. the currency whose rate we need. */
export function amountForeignCode(hit: AmountHit): ConvertCode {
  return hit.from === 'UYU' ? hit.to : hit.from
}
