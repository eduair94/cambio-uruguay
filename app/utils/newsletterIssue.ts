// Framework-agnostic shared model for the daily newsletter's PUBLIC archive
// (`/newsletter/archivo`, `/newsletter/[fecha]`). PURE module (no Vue/Nuxt
// runtime, relative imports only) so the server archiver, the pages, the
// sitemap route and unit tests all share one definition.
//
// Why an archive exists at all: the daily digest was already being built and
// then thrown away the moment the last email went out. Keeping it turns a
// send-and-forget job into one durable, indexable page per day — the "¿a cuánto
// estaba el dólar el 12 de agosto?" question people actually type — at zero
// extra generation cost. The email is a copy of the page, not the other way
// round, which is also why archiving happens BEFORE (and independently of) the
// SMTP send: a missing mail credential must never cost the site a page.
//
// Mirrors `utils/blog.ts` deliberately — same slug/date discipline, same
// summary-vs-full split — so the two daily content streams stay one pattern.

/** One currency line in an issue: the day's best retail sell and its move. */
export interface IssueCurrency {
  /** ISO 4217 code, e.g. `USD`. */
  code: string
  /** Best (lowest) retail sell price across the casas that day. */
  bestSellRate: number
  /** Day-over-day change of that best sell, in percent. */
  changePct: number
  /** Display name of the casa paying the best buy price. */
  bestBuyHouse: string
}

/** A headline the issue links out to. */
export interface IssueNews {
  title: string
  link: string
  source: string
}

/** A full archived issue, as rendered by `/newsletter/[fecha]`. */
export interface NewsletterIssue {
  /** ISO date `YYYY-MM-DD` (Montevideo) the issue covers. Also the URL slug. */
  date: string
  /** Rendered H1 / SEO title. Derived — see {@link issueTitle}. */
  title: string
  /** One-line summary (meta description + card). Derived — see {@link issueSummary}. */
  summary: string
  /** Per-currency market lines, in report order. */
  currencies: IssueCurrency[]
  /** Headlines the issue is grounded in. */
  news: IssueNews[]
  /** AI market commentary (already sanitized upstream). May be empty. */
  ai: string
  /** ISO timestamp when the issue was archived. */
  createdAt: string
}

/** Lightweight list item (no news/AI body) for the archive hub + sitemap. */
export interface NewsletterIssueSummary {
  date: string
  title: string
  summary: string
  createdAt: string
  /** USD best sell, hoisted so cards can show it without loading the issue. */
  usdRate: number
  /** USD day-over-day percent, hoisted for the card's trend arrow. */
  usdChangePct: number
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** True when `value` is a well-formed, real `YYYY-MM-DD` date. */
export function isIssueDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false
  // `Date.parse` accepts `2026-02-31`, rolling it to March. Round-trip instead.
  const d = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
}

/** Today's date as `YYYY-MM-DD` in the Montevideo timezone (UTC-3, no DST). */
export function montevideoToday(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  return shifted.toISOString().slice(0, 10)
}

const MONTHS_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const

/**
 * `2026-08-15` → `15 de agosto de 2026`.
 *
 * Hand-rolled rather than `Intl`: this string ends up in the <title>, the OG
 * image and the stored issue, and Node builds differ in whether the full ICU
 * locale data for `es-UY` is present at all — a missing one silently degrades
 * to `8/15/2026` in production only.
 */
export function formatIssueDate(date: string): string {
  if (!isIssueDate(date)) return date
  const [y, m, d] = date.split('-')
  const month = MONTHS_ES[Number(m) - 1] ?? ''
  return `${Number(d)} de ${month} de ${y}`
}

/** `41.2` → `41,20`. Comma decimals, always two places, no thousands grouping. */
export function formatIssueRate(n: number): string {
  if (!Number.isFinite(n)) return '—'
  return n.toFixed(2).replace('.', ',')
}

/** `0.3214` → `+0,32%`. Explicit sign so the direction reads without the arrow. */
export function formatIssuePct(n: number): string {
  if (!Number.isFinite(n)) return '0,00%'
  const sign = n > 0 ? '+' : n < 0 ? '−' : ''
  return `${sign}${Math.abs(n).toFixed(2).replace('.', ',')}%`
}

/**
 * Strip the conversational opener an assistant-style model puts in front of the
 * answer ("¡Claro! Aquí tienes un análisis del mercado:").
 *
 * `sanitizeAi` already removes think-blocks, provider prefixes and LaTeX, but it
 * has no opinion about this: the model is answering a prompt, and the reply is
 * addressed to whoever wrote it. Published as-is on a market page it reads as a
 * chat transcript that leaked, so the greeting goes and the analysis stays.
 *
 * Only a FIRST line is ever removed, and only when it both opens with a known
 * filler phrase and ends in a colon — the shape of a preamble rather than of a
 * sentence carrying information.
 */
// `(?!\p{L})` rather than `\b`: the openers end in accented letters ("Aquí"),
// and JS's `\b` is ASCII-only, so `aquí\b` never matches before a space — the
// most common opener of all would have slipped through.
const AI_PREAMBLE_RE =
  /^\s*(?:[¡!]\s*)?(?:claro|por supuesto|perfecto|entendido|excelente|sure|certainly|of course|here(?:'s| is)|aqu[ií])(?!\p{L})[^\n]*:\s*\n/iu

export function cleanAiCommentary(raw: string): string {
  if (!raw) return ''
  return raw.replace(AI_PREAMBLE_RE, '').trim()
}

/**
 * Flatten the AI's Markdown to something an HTML email can carry.
 *
 * Email templates here are hand-written inline-styled HTML — no Markdown
 * renderer, no stylesheet — and the digest has been escaping the model's output
 * wholesale, so every `## Heading` and `**bold**` reached subscribers as literal
 * punctuation. This is deliberately not a Markdown parser: it handles the four
 * constructs the market commentary actually uses and leaves everything else as
 * plain text, which is the failure mode an email can survive.
 *
 * Returns ALREADY-ESCAPED html — pass the raw text, not an escaped string.
 */
/** `## Título` — one fixed whitespace char, so there is nothing to backtrack. */
const HEADING_RE = /^#{1,6}\s/
/** Strips the marker once the line is known to be a heading. */
const HEADING_STRIP_RE = /^#{1,6}\s*/

export function aiMarkdownToEmailHtml(raw: string, escapeFn: (s: string) => string): string {
  const clean = cleanAiCommentary(raw)
  if (!clean) return ''

  return clean
    .split(/\n{2,}/)
    .map(block => {
      const lines = block.split('\n').filter(l => l.trim())
      if (!lines.length) return ''

      // A block of list items renders as one bulleted paragraph.
      if (lines.every(l => /^\s*[-*+]\s+/.test(l))) {
        const items = lines
          .map(l => `• ${inlineMd(escapeFn(l.replace(/^\s*[-*+]\s+/, '')))}`)
          .join('<br>')
        return `<p style="margin:0 0 10px;">${items}</p>`
      }

      // Detect, then strip — rather than one `#{1,6}\s+(.*)` pattern. There the
      // trailing `.*` can also match the spaces `\s+` just consumed, and the two
      // quantifiers trade characters on a failed match: polynomial backtracking
      // on a string that arrives straight from a model.
      const first = lines[0]!.trim()
      if (lines.length === 1 && HEADING_RE.test(first)) {
        const text = first.replace(HEADING_STRIP_RE, '')
        return `<p style="margin:14px 0 6px;font-weight:700;">${inlineMd(escapeFn(text))}</p>`
      }

      const body = lines.map(l => inlineMd(escapeFn(l.replace(/^\s*#{1,6}\s+/, '')))).join('<br>')
      return `<p style="margin:0 0 10px;">${body}</p>`
    })
    .filter(Boolean)
    .join('\n')
}

/** `**x**` / `*x*` / `__x__` → bold/italic. Runs on ALREADY-ESCAPED text. */
function inlineMd(escaped: string): string {
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>')
}

/** Which way a rate moved. `flat` covers a move too small to round to 0,01%. */
export type IssueTrend = 'up' | 'down' | 'flat'

/**
 * Classify a day-over-day percent.
 *
 * The threshold is half of the smallest move the UI can print (`0,01%`), so a
 * number that renders as `0,00%` never carries an arrow contradicting it.
 */
export function issueTrend(changePct: number): IssueTrend {
  if (!Number.isFinite(changePct)) return 'flat'
  if (changePct >= 0.005) return 'up'
  if (changePct <= -0.005) return 'down'
  return 'flat'
}

/**
 * Vuetify color + MDI icon for a trend.
 *
 * Matches `DollarMomentum.vue` and `/dolar-hoy` exactly (up = success, down =
 * error, flat = grey) so the same move is never green in one place and amber in
 * another. Hue is never the only signal: every caller pairs this with the arrow
 * icon AND the signed percent, per the design system's chip-state rule.
 */
export function issueTrendStyle(trend: IssueTrend): { color: string; icon: string } {
  if (trend === 'up') return { color: 'success', icon: 'mdi-trending-up' }
  if (trend === 'down') return { color: 'error', icon: 'mdi-trending-down' }
  return { color: 'grey', icon: 'mdi-trending-neutral' }
}

/** Find a currency line by code. */
export function findCurrency(
  currencies: readonly IssueCurrency[],
  code: string
): IssueCurrency | undefined {
  return currencies.find(c => c.code === code)
}

/**
 * The issue's headline.
 *
 * Leads with the dollar price rather than the date because that is the half of
 * the query people type ("dolar hoy uruguay"); the date disambiguates it from
 * every other issue, which is what keeps 300 archived pages from colliding into
 * one duplicate <title> the way the blog's repeated AI headlines once did.
 */
export function issueTitle(issue: Pick<NewsletterIssue, 'date' | 'currencies'>): string {
  const usd = findCurrency(issue.currencies, 'USD')
  const when = formatIssueDate(issue.date)
  if (!usd || !Number.isFinite(usd.bestSellRate) || usd.bestSellRate <= 0) {
    return `Resumen del dólar en Uruguay — ${when}`
  }
  return `Dólar en Uruguay a $${formatIssueRate(usd.bestSellRate)} — ${when}`
}

/** Direction word for a percent move, used in prose. */
function moveWord(pct: number): string {
  if (pct > 0.005) return 'subió'
  if (pct < -0.005) return 'bajó'
  return 'se mantuvo'
}

/**
 * The issue's one-line summary: the meta description and the archive card's
 * body. Built from the data, never from the AI text — the AI paragraph is free
 * to be empty (or junk) and the summary still has to be right.
 */
export function issueSummary(issue: Pick<NewsletterIssue, 'date' | 'currencies' | 'news'>): string {
  const usd = findCurrency(issue.currencies, 'USD')
  const parts: string[] = []

  if (usd && usd.bestSellRate > 0) {
    const move = moveWord(usd.changePct)
    const pct = formatIssuePct(usd.changePct)
    parts.push(
      move === 'se mantuvo'
        ? `El dólar se mantuvo en $${formatIssueRate(usd.bestSellRate)} en la mejor venta.`
        : // "estaba", not "quedó": the issue is built in the morning, so this is
          // the day's snapshot rather than its close, and the summary is the
          // meta description — the one sentence that must not overclaim.
          `El dólar ${move} ${pct} y estaba en $${formatIssueRate(usd.bestSellRate)} en la mejor venta.`
    )
    if (usd.bestBuyHouse) parts.push(`Mejor compra en ${usd.bestBuyHouse}.`)
  } else {
    parts.push(`Resumen del mercado cambiario uruguayo del ${formatIssueDate(issue.date)}.`)
  }

  const others = issue.currencies.filter(c => c.code !== 'USD').map(c => c.code)
  if (others.length) parts.push(`También ${others.join(', ')}.`)
  if (issue.news.length) parts.push(`Más las noticias del día.`)

  return parts.join(' ')
}

/** Derive `title` + `summary` and stamp them onto a freshly built issue. */
export function withDerivedCopy(
  issue: Omit<NewsletterIssue, 'title' | 'summary'>
): NewsletterIssue {
  return { ...issue, title: issueTitle(issue), summary: issueSummary(issue) }
}

/** Project a full issue down to its list item. */
export function toIssueSummary(issue: NewsletterIssue): NewsletterIssueSummary {
  const usd = findCurrency(issue.currencies, 'USD')
  return {
    date: issue.date,
    title: issue.title,
    summary: issue.summary,
    createdAt: issue.createdAt,
    usdRate: usd?.bestSellRate ?? 0,
    usdChangePct: usd?.changePct ?? 0,
  }
}

/** Newest first. Stable for equal dates (they cannot collide — date is the key). */
export function sortIssuesDesc<T extends { date: string }>(issues: readonly T[]): T[] {
  return [...issues].sort((a, b) => b.date.localeCompare(a.date))
}

/**
 * True when an issue carries enough to be worth publishing as its own page.
 *
 * The archive is only an asset while every page in it answers something. An
 * issue built on a morning when the API returned nothing would be a dated URL
 * with no numbers on it — the exact shape a search engine files under thin,
 * auto-generated content, and it would drag the ~300 good ones down with it.
 * So: at least one real quote, or don't publish the day at all.
 */
export function isPublishableIssue(issue: Pick<NewsletterIssue, 'currencies'>): boolean {
  return issue.currencies.some(c => Number.isFinite(c.bestSellRate) && c.bestSellRate > 0)
}
