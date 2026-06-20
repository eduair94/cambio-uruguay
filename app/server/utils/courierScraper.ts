// Daily courier-rate scraper (HTTP only — every supported courier serves its per-kg rate in the
// raw HTML, so no headless browser is needed). Each parser extracts the *representative
// small-parcel* per-kg rate (the figure the estimator uses) from a courier's tariff page using a
// page-specific anchor, then a plausibility guard rejects anything outside a sane band. The
// scheduled task feeds the results into the rates store, which keeps the last good value when a
// scrape fails — so a site redesign degrades to "stale but correct", never to garbage.
//
// Parsers are PURE (string -> result) so they are unit-tested against captured HTML fixtures.
// Couriers whose rates are only behind a JS calculator (Aerobox, Punto Mío, Miami Box) are not
// scraped here; their catalogue seed values stand.

/** Result of parsing one courier's tariff page. */
export interface ScrapeResult {
  id: string
  /** Representative per-kg rate (USD), or `null` when parsing failed / value implausible. */
  perKgUsd: number | null
  ok: boolean
}

/** Plausibility band for a Miami→Uruguay per-kg courier rate (USD). */
export const RATE_MIN = 5
export const RATE_MAX = 60

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
  return parseFloat(s.replace(',', '.'))
}

function plausible(n: number | null | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= RATE_MIN && n <= RATE_MAX
}

/** All USD amounts with decimals found in the text, in document order. */
function usdValues(text: string): number[] {
  return [...text.matchAll(/(?:US\$|U\$S|USD)\s?(\d{1,3}[.,]\d{1,2})/gi)].map(m => toNum(m[1]!))
}

/**
 * Per-courier extractors. Each gets the tag-stripped page text and returns the representative
 * per-kg rate, or `null` if its anchor is not found. Keyed by courier `id` (matches COURIERS).
 */
export const RATE_PARSERS: Record<
  string,
  { url: string; extract: (text: string) => number | null }
> = {
  // Tiers: <900 g US$19,80 fijo · 0,9–5 kg US$21,90 · 5–20 kg US$16,50 · 20–40 kg US$13,20.
  // Representative = the 0,9–5 kg small-parcel tier (the first value in the 20–26 band).
  gripper: {
    url: 'https://www.gripper.com.uy/tarifas',
    extract: text => usdValues(text).find(v => v >= 20 && v <= 26) ?? null,
  },
  // Tiers: cartas u$s9,04 · 0,5–5 kg u$s21,90 · … Representative = first value in the 16–26 band
  // (skips the per-letter charge below it).
  enviamicompra: {
    url: 'https://www.enviamicompra.com.uy/servicios-tarifas',
    extract: text => usdValues(text).find(v => v >= 16 && v <= 26) ?? null,
  },
  // Anchored on the explicit "5 Kg U$S 19,50 por Kg" tier line.
  uruguaycargo: {
    url: 'https://www.uruguaycargo.com.uy/tarifas.html',
    extract: text => {
      const m = text.match(/5\s?Kg\s*(?:US\$|U\$S|USD)\s?(\d{1,3}[.,]\d{1,2})\s*por\s*Kg/i)
      return m ? toNum(m[1]!) : null
    },
  },
  // Charged per 500 g ("USD 10 adicionales, cada 500 grs") → per-kg = that × 2.
  casillamia: {
    url: 'https://www.casillamia.uy/Tarifas',
    extract: text => {
      const m = text.match(/(?:US\$|USD)\s?(\d{1,3}(?:[.,]\d{1,2})?)\s*adicionales,?\s*cada\s*500/i)
      return m ? toNum(m[1]!) * 2 : null
    },
  },
  // "DESDE USA … USD 17.50 kg" — first "USD <n> kg" on the page (the USA origin rate).
  usxcargo: {
    url: 'https://usxcargo.com',
    extract: text => {
      const m = text.match(/(?:US\$|USD)\s?(\d{1,3}[.,]\d{1,2})\s*kg/i)
      return m ? toNum(m[1]!) : null
    },
  },
  // Tiers: <1 kg tiered · 1–4,99 kg u$s 19,90/kg · 5–9,99 kg u$s 17,90 · …
  // Representative = 1–4,99 kg tier = first u$s value in the 18–22 band.
  urubox: {
    url: 'https://www.urubox.com.uy/tarifas-envios.html',
    extract: text => usdValues(text).find(v => v >= 18 && v <= 22) ?? null,
  },
  // Tiers: 0–500 g U$S17 flat · 501–999 g $21 · 1–4,99 kg $21/por cada kg · 5–10 kg $20/por cada kg.
  // Representative = 1–4,99 kg tier, anchored on "$<n> / por cada kg" (plain $ sign, not U$S/USD).
  starbox: {
    url: 'https://www.starboxuruguay.com/',
    extract: text => {
      const m = text.match(/\$\s*(\d{1,3})\s*\/\s*por cada kg/i)
      return m ? toNum(m[1]!) : null
    },
  },
  // Tiers: 0–500 g U$D 5,9 · 501 g–1 kg U$D 21 · 1,01–3 kg U$D 18,90/kg · 3,1–5 kg U$D 16,90 · …
  // Representative = 1,01–3 kg tier = first U$D value in the 18–20 band.
  buybox: {
    url: 'https://www.buybox.com.uy/tarifas.html',
    extract: text => {
      const vals = [...text.matchAll(/U\$D\s?(\d{1,3}[.,]\d{1,2})/gi)].map(m => toNum(m[1]!))
      return vals.find(v => v >= 18 && v <= 20) ?? null
    },
  },
  // Single rate: "22.99 USD el Kg." — number precedes the USD token.
  glic: {
    url: 'https://glicglobal.com/uy/calculadora.html',
    extract: text => {
      const m = text.match(/(\d{1,3}[.,]\d{1,2})\s*USD\s+el\s+Kg/i)
      return m ? toNum(m[1]!) : null
    },
  },
}

/** Parse one courier's page text into a guarded {@link ScrapeResult}. */
export function parseCourierRate(id: string, text: string): ScrapeResult {
  const parser = RATE_PARSERS[id]
  const raw = parser ? parser.extract(stripHtml(text)) : null
  const ok = plausible(raw)
  return { id, perKgUsd: ok ? raw : null, ok }
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'user-agent': UA },
    signal: AbortSignal.timeout(25000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

/** Fetch + parse every supported courier. Network failures yield `{ ok: false }` for that id. */
export async function scrapeAllCourierRates(): Promise<ScrapeResult[]> {
  const ids = Object.keys(RATE_PARSERS)
  return Promise.all(
    ids.map(async id => {
      try {
        return parseCourierRate(id, await fetchText(RATE_PARSERS[id]!.url))
      } catch {
        return { id, perKgUsd: null, ok: false }
      }
    })
  )
}
