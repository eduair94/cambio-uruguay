// Best-effort product metadata scraping for the import-cart "add from URL" flow.
//
// Two PURE helpers (no Vue/Nuxt/Node runtime) so they can be unit-tested and
// reused by the server endpoint (`server/api/import-preview.get.ts`):
//   - `isAllowedProductUrl` — an allowlist + SSRF guard run BEFORE any fetch.
//   - `parseProductHtml`    — pull title/image/price out of OpenGraph + JSON-LD.
//
// The endpoint only ever fetches hosts that pass `isAllowedProductUrl`, so the
// guard is the security boundary: https-only, a small brand allowlist, and no
// credentials / IP-literal / loopback hosts. Scraping is best-effort — when a
// field is missing the caller falls back to manual entry.

/** Marketplace brands whose product pages we will fetch metadata from. */
const ALLOWED_BRANDS = ['amazon', 'ebay', 'mercadolibre', 'mercadolivre'] as const

/** A public-suffix-ish label: 2–3 ASCII letters (e.g. `com`, `co`, `uk`, `uy`). */
function looksLikeSuffixLabel(label: string): boolean {
  return /^[a-z]{2,3}$/.test(label)
}

/**
 * True when `raw` is an https URL whose host is one of the allowlisted
 * marketplace brands as the registrable domain (subdomains allowed), with no
 * embedded credentials and no IP-literal / loopback host. This is the SSRF
 * boundary — only matching URLs should ever be fetched server-side.
 */
export function isAllowedProductUrl(raw: string): boolean {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return false
  }
  if (url.protocol !== 'https:') return false
  if (url.username || url.password) return false

  const host = url.hostname.toLowerCase()
  // Reject IPv6 literals (bracketed) and bare IPv4 literals.
  if (host.includes(':') || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return false

  const labels = host.split('.')
  for (let i = 0; i < labels.length; i++) {
    if (!(ALLOWED_BRANDS as readonly string[]).includes(labels[i]!)) continue
    const suffix = labels.slice(i + 1)
    // Brand must sit directly before a 1–2 label public suffix
    // (amazon.com, amazon.co.uk, mercadolibre.com.uy) — this rejects
    // look-alikes like `amazon.evil.com`.
    if (suffix.length >= 1 && suffix.length <= 2 && suffix.every(looksLikeSuffixLabel)) {
      return true
    }
  }
  return false
}

/** Parsed product preview; every field is optional / best-effort. */
export interface ProductPreview {
  title?: string
  image?: string
  price?: number
  currency?: string
}

/** Decode the handful of HTML entities that show up in scraped meta content. */
function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .trim()
}

/** Content of a `<meta>` whose `property`/`name` equals `key`, either attr order. */
function metaContent(html: string, key: string): string | undefined {
  const k = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${k}["'][^>]*\\bcontent=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${k}["']`, 'i'),
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m?.[1]) return decodeEntities(m[1])
  }
  return undefined
}

/** Coerce a price-ish string/number to a finite positive number, or undefined. */
function toPrice(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : undefined
  if (typeof value !== 'string') return undefined
  const n = Number.parseFloat(value.replace(/[^0-9.,]/g, '').replace(/,/g, ''))
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/** Walk a parsed JSON-LD value looking for the first Product/Offer price. */
function priceFromJsonLd(node: unknown): { price?: number; currency?: string; title?: string } {
  const out: { price?: number; currency?: string; title?: string } = {}
  // Bounded recursion: a hostile (but allowlisted) page could nest JSON-LD deeply
  // enough to overflow the stack; cap depth and stop early once all fields are found.
  const MAX_DEPTH = 100
  const done = () => out.title != null && out.price != null && out.currency != null
  const visit = (n: unknown, depth: number) => {
    if (depth > MAX_DEPTH || done() || !n || typeof n !== 'object') return
    if (Array.isArray(n)) {
      for (const v of n) {
        if (done()) return
        visit(v, depth + 1)
      }
      return
    }
    const obj = n as Record<string, unknown>
    if (out.title == null && typeof obj.name === 'string') out.title = obj.name.trim()
    const offers = obj.offers
    const offerList = Array.isArray(offers) ? offers : offers ? [offers] : []
    for (const offer of offerList) {
      if (offer && typeof offer === 'object') {
        const o = offer as Record<string, unknown>
        if (out.price == null) out.price = toPrice(o.price)
        if (out.currency == null && typeof o.priceCurrency === 'string')
          out.currency = o.priceCurrency
      }
    }
    for (const v of Object.values(obj)) {
      if (done()) return
      visit(v, depth + 1)
    }
  }
  visit(node, 0)
  return out
}

/** Parse all `<script type="application/ld+json">` blocks, ignoring bad JSON. */
function parseJsonLd(html: string): { price?: number; currency?: string; title?: string } {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null
  const acc: { price?: number; currency?: string; title?: string } = {}
  while ((match = re.exec(html)) !== null) {
    try {
      const found = priceFromJsonLd(JSON.parse(match[1]!.trim()))
      acc.title = acc.title ?? found.title // keep the first non-empty values
      acc.price = acc.price ?? found.price
      acc.currency = acc.currency ?? found.currency
    } catch {
      // ignore malformed JSON-LD blocks
    }
  }
  return acc
}

/**
 * Best-effort product metadata from a page's HTML: OpenGraph meta first, then
 * JSON-LD `Product.offers`, then the `<title>` as a last-resort name. Returns an
 * empty object when nothing usable is found.
 */
export function parseProductHtml(html: string): ProductPreview {
  const out: ProductPreview = {}

  out.title = metaContent(html, 'og:title')
  out.image = metaContent(html, 'og:image')

  const priceMeta =
    metaContent(html, 'product:price:amount') ?? metaContent(html, 'og:price:amount')
  const currencyMeta =
    metaContent(html, 'product:price:currency') ?? metaContent(html, 'og:price:currency')
  if (priceMeta) out.price = toPrice(priceMeta)
  if (currencyMeta) out.currency = currencyMeta.trim()

  if (out.title == null || out.price == null || out.currency == null) {
    const ld = parseJsonLd(html)
    out.title = out.title ?? ld.title
    out.price = out.price ?? ld.price
    out.currency = out.currency ?? ld.currency
  }

  if (out.title == null) {
    const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    if (m?.[1]) out.title = decodeEntities(m[1])
  }

  // Drop undefined keys so an all-empty parse equals `{}`.
  const clean: ProductPreview = {}
  if (out.title) clean.title = out.title
  if (out.image) clean.image = out.image
  if (out.price != null) clean.price = out.price
  if (out.currency) clean.currency = out.currency
  return clean
}
