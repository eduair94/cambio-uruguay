// Daily lender-TEA scraper (HTTP only). Each parser extracts the representative advertised TEA from
// a lender's public rate page using a page-specific anchor, then a plausibility guard rejects values
// outside a sane band for Uruguayan consumer credit. PURE (string -> result) so parsers are unit-
// tested against captured HTML fixtures. Lenders whose rates are behind a JS/quote form are NOT here;
// their catalogue seed values stand.

/** Result of parsing one lender's rate page. */
export interface ScrapeResult {
  id: string
  /** Representative advertised TEA (%), or `null` when parsing failed / value implausible. */
  teaPct: number | null
  ok: boolean
}

/** Plausibility band for a Uruguayan consumer-loan TEA (%). Wide: BROU mortgages are low, some
 *  financiera consumer lines are very high. Final band confirmed against BCU usury caps. */
export const TEA_MIN = 5
export const TEA_MAX = 250

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'

/** Strip tags/entities to plain text, the same view the published rates render as. */
export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/[ \t]+/g, ' ')
}

function toNum(s: string): number {
  // Handle both UY decimal-comma format ("63,9" → 63.9) and decimal-dot format ("63.9" → 63.9).
  // Strip dots only when used as thousands separators (dot followed by exactly 3 digits).
  return parseFloat(s.replace(/\.(?=\d{3}(?:[,.]|$))/g, '').replace(',', '.'))
}

function plausible(n: number | null | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= TEA_MIN && n <= TEA_MAX
}

/**
 * Per-lender extractors. Each gets the tag-stripped page text and returns the representative
 * advertised TEA (%), or `null` if its anchor is not found. Keyed by lender `id` (matches LENDERS).
 *
 * Only lenders that render a TEA figure in plain raw HTML are listed here. All others keep their
 * catalogue seed value (no parser = no scrape = seed stands).
 */
export const TEA_PARSERS: Record<
  string,
  { url: string; extract: (text: string) => number | null }
> = {
  // oca.uy/prestamos/ renders three loan examples, each ending "T.E.A. 39%. Sujeto a aprobación".
  // Also footer: "La Tasa Efectiva Anual (TEA) está entre 39% y 87% + IVA".
  // Anchor: first "T.E.A. <n>%" on the page (the representative published minimum rate).
  oca: {
    url: 'https://oca.uy/prestamos/',
    extract: text => {
      const m = text.match(/T\.E\.A\.\s*(\d{1,3}(?:[.,]\d{1,2})?)\s*%/)
      return m ? toNum(m[1]!) : null
    },
  },

  // pronto.com.uy/tasa-29/ renders a worked example: "TEA: 49% + Iva. Ptf: $1.198.092"
  // Anchor: "TEA: <n>%" (the colon distinguishes the lender's own rate from the BCU ceiling table).
  pronto: {
    url: 'https://www.pronto.com.uy/tasa-29/',
    extract: text => {
      const m = text.match(/TEA:\s*(\d{1,3}(?:[.,]\d{1,2})?)\s*%/)
      return m ? toNum(m[1]!) : null
    },
  },

  // prestamocash.com.uy/prestamo renders a tiered TEA table. The representative minimum is the
  // best-tier rate: "mayor o igual a 10.000 UI – 63.9%" (loans ≤366 days, ≥10k UI).
  // Anchor: the unique "mayor o igual a 10.000 UI – <n>%" pattern (first match = short-term tier).
  cash: {
    url: 'https://prestamocash.com.uy/prestamo',
    extract: text => {
      const m = text.match(
        /mayor\s+o\s+igual\s+a\s+10\.000\s+UI\s*[–-]\s*(\d{1,3}(?:[.,]\d{1,2})?)\s*%/
      )
      return m ? toNum(m[1]!) : null
    },
  },
}

/** Parse one lender's page text into a guarded {@link ScrapeResult}. */
export function parseLenderRate(id: string, text: string): ScrapeResult {
  const parser = TEA_PARSERS[id]
  const raw = parser ? parser.extract(stripHtml(text)) : null
  const ok = plausible(raw)
  return { id, teaPct: ok ? raw : null, ok }
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'user-agent': UA },
    signal: AbortSignal.timeout(25000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

/** Fetch + parse every supported lender. Network failures yield `{ ok: false }` for that id. */
export async function scrapeAllLenderRates(): Promise<ScrapeResult[]> {
  const ids = Object.keys(TEA_PARSERS)
  return Promise.all(
    ids.map(async id => {
      try {
        return parseLenderRate(id, await fetchText(TEA_PARSERS[id]!.url))
      } catch {
        return { id, teaPct: null, ok: false }
      }
    })
  )
}
