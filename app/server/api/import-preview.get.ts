import { lookup } from 'node:dns/promises'
import {
  isAllowedProductUrl,
  isEbayUrl,
  parseEbayApiJson,
  parseProductHtml,
  type ProductPreview,
} from '../../utils/productScrape'

// Best-effort product metadata proxy for the import-cart "add from URL" flow.
// SSRF defense is layered: `isAllowedProductUrl` restricts to https marketplace
// hosts (re-checked on every redirect hop), and `assertPublicHost` resolves the
// hostname and rejects any private/loopback/link-local address so a crafted
// allowlisted domain (e.g. amazon.<gTLD> pointed at 169.254.169.254) cannot reach
// internal services. Failures are swallowed (return `{}`) — the client falls back
// to manual entry.

const TIMEOUT_MS = 6000
const MAX_HOPS = 4
const MAX_BYTES = 1_500_000
const UA =
  'Mozilla/5.0 (compatible; CambioUruguayBot/1.0; +https://cambio-uruguay.com/herramientas)'

/** True for IPv4/IPv6 addresses that must never be reachable from this proxy. */
function isPrivateAddress(ip: string): boolean {
  const v4 = ip.replace(/^::ffff:/i, '') // unwrap IPv4-mapped IPv6
  const m = v4.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])]
    if (a === 0 || a === 10 || a === 127) return true // this-host / private / loopback
    if (a === 169 && b === 254) return true // link-local + cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true // private
    if (a === 192 && b === 168) return true // private
    if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
    return false
  }
  const lower = ip.toLowerCase()
  if (lower === '::1' || lower === '::') return true // loopback / unspecified
  if (
    lower.startsWith('fe8') ||
    lower.startsWith('fe9') ||
    lower.startsWith('fea') ||
    lower.startsWith('feb')
  )
    return true // fe80::/10 link-local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true // fc00::/7 ULA
  return false
}

/** Resolve `hostname` and throw if it (or any of its addresses) is non-public. */
async function assertPublicHost(hostname: string): Promise<void> {
  const addrs = await lookup(hostname, { all: true })
  if (!addrs.length || addrs.some(a => isPrivateAddress(a.address))) {
    throw new Error('host resolves to a non-public address')
  }
}

async function fetchHtml(startUrl: string): Promise<string> {
  let current = startUrl
  for (let hop = 0; hop < MAX_HOPS; hop++) {
    if (!isAllowedProductUrl(current)) throw new Error('blocked host')
    await assertPublicHost(new URL(current).hostname)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    let res: Response
    try {
      res = await fetch(current, {
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml' },
      })
    } finally {
      clearTimeout(timer)
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location')
      if (!loc) throw new Error('redirect without location')
      current = new URL(loc, current).toString() // re-validated at top of the loop
      continue
    }
    if (!res.ok) throw new Error(`status ${res.status}`)
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('html')) throw new Error('not html')
    const declaredLength = Number(res.headers.get('content-length') || 0)
    if (declaredLength > MAX_BYTES) throw new Error('response too large')
    const text = await res.text()
    return text.slice(0, MAX_BYTES)
  }
  throw new Error('too many redirects')
}

/**
 * Resolve an eBay item via the FlareSolverr-backed proxy (`ebayApiUrl`). eBay's
 * Akamai shield 403s our direct fetch, so this is the only reliable path. The
 * proxy URL is our own trusted config; `itemUrl` is an already-validated eBay
 * link. Returns `{}` on any failure so the caller can fall back to manual entry.
 */
async function fetchEbayViaProxy(apiBase: string, itemUrl: string): Promise<ProductPreview> {
  const proxied = `${apiBase}${apiBase.includes('?') ? '&' : '?'}url=${encodeURIComponent(itemUrl)}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(proxied, {
      signal: controller.signal,
      headers: { 'user-agent': UA, accept: 'application/json' },
    })
    if (!res.ok) return {}
    return parseEbayApiJson(await res.json())
  } finally {
    clearTimeout(timer)
  }
}

export default defineEventHandler(async (event): Promise<ProductPreview> => {
  const query = getQuery(event)
  const url = String(query?.url ?? '').trim()
  if (!isAllowedProductUrl(url)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Solo se admiten enlaces de Amazon, eBay o MercadoLibre.',
    })
  }
  try {
    const ebayApiUrl = useRuntimeConfig(event).ebayApiUrl as string
    if (ebayApiUrl && isEbayUrl(url)) {
      const preview = await fetchEbayViaProxy(ebayApiUrl, url)
      if (Object.keys(preview).length) return preview
      // proxy returned nothing usable -> fall through to the HTML scrape
    }
    return parseProductHtml(await fetchHtml(url))
  } catch {
    return {} // best-effort: client falls back to manual entry
  }
})
