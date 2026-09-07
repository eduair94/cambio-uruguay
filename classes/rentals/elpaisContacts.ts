import * as cheerio from "cheerio";
import { publicContactFromVisibleHtml } from "./advertiser";
import { rentalDescription } from "./details";
import { fetchText } from "./net";
import type { RawRental, RentalPublicContact } from "./types";

/** The public advert's visible contact controls bind themselves to its exact listing ID. */
export function readElpaisContact(html: string, advert: { listingId: string; url: string }, observedAt: string): RentalPublicContact | null | undefined {
  const id = /^elpais:([a-f0-9]{24})$/.exec(advert.listingId)?.[1];
  const sourceUrl = id ? `https://inmuebles.elpais.com.uy/property/${id}` : "";
  if (!id || sourceUrl !== advert.url || !Number.isFinite(Date.parse(observedAt))) return undefined;
  const $ = cheerio.load(html);
  if ($("link[rel=canonical]").attr("href") !== sourceUrl) return undefined;
  $("script,style,template,noscript,form,[hidden],[aria-hidden='true']").remove();
  $("[style]").filter((_, el) => /display\s*:\s*none|visibility\s*:\s*hidden/i.test($(el).attr("style") || "")).remove();
  const companies = $(`[data-funnel='contact-company'][data-listing-id='${id}']`);
  const names = [...new Set(companies.toArray().map(el => rentalDescription($(el).text(), 160)).filter(Boolean))];
  // A challenge, layout change, or contradictory publisher block is not a contact withdrawal.
  if (names.length !== 1) return undefined;
  const anchors = $(`a[data-funnel='contact-phone'][data-listing-id='${id}'][href^='tel:']`);
  return publicContactFromVisibleHtml(anchors.toArray().map(el => $.html(el)).join("\n"), {
    name: names[0]!, source: "elpais", sourceUrl, observedAt,
  });
}

/** Uses public HTTP only. An unavailable page is skipped; this adds no login/browser fallback. */
export async function enrichElpaisRentalContacts(listings: RawRental[], mode: "full" | "fast", options: {
  fetchPage?: (url: string) => Promise<string | null>; maxPages?: number; now?: () => Date;
} = {}): Promise<number> {
  if (process.env.RENTALS_CONTACTS_ENABLED === "0") return 0;
  const now = options.now || (() => new Date()), started = now().getTime();
  const own = listings.filter(row => row.source === "elpais" && /^elpais:[a-f0-9]{24}$/.test(row.listingId))
    .sort((a, b) => a.listingId.localeCompare(b.listingId));
  const limit = Math.min(30, options.maxPages ?? (mode === "fast" ? 5 : 20));
  const offset = own.length ? (Math.floor(started / 3_600_000) * limit) % own.length : 0;
  const queue = [...own.slice(offset), ...own.slice(0, offset)].slice(0, limit);
  const fetchPage = options.fetchPage || (url => fetchText(url, { timeoutMs: 10_000, retries: 0 }));
  let inspected = 0, failures = 0;
  for (const row of queue) {
    if (now().getTime() - started > 60_000 || failures >= 3) break;
    if (row.url !== `https://inmuebles.elpais.com.uy/property/${row.listingId.slice(7)}`) continue;
    try {
      const html = await fetchPage(row.url), contact = html ? readElpaisContact(html, row, now().toISOString()) : undefined;
      if (contact !== undefined) { row.publicContact = contact; inspected++; } else failures++;
    } catch { failures++; }
  }
  return inspected;
}
