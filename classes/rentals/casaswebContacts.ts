import * as cheerio from "cheerio";
import { advertiserClassification, ownerDirectDeclaration, publicContactFromVisibleHtml } from "./advertiser";
import { rentalDescription } from "./details";
import { flatten } from "./normalize";
import { fetchText } from "./net";
import type { RawRental, RentalAdvertiserFields, RentalSellerType } from "./types";

/** Only the advert's own visible commercial block, never the recommendation cards/footer. */
export function readCasaswebAdvertiser(html: string, advert: { listingId: string; url: string; title: string }, observedAt: string):
  (RentalAdvertiserFields & { sellerType: RentalSellerType }) | null {
  const id = /^casasweb:(\d{1,18})$/.exec(advert.listingId)?.[1];
  if (!id || !Number.isFinite(Date.parse(observedAt))) return null;
  const $ = cheerio.load(html);
  if (!$("title").text().trim().startsWith(`CW${id} `)) return null;
  const references = $("li").toArray().map(node => $(node).text().trim()).filter(value => /^Ref\s*:/i.test(value));
  if (references.length !== 1 || !new RegExp(`^Ref\\s*:\\s*CW${id}$`, "i").test(references[0]!)) return null;
  const title = rentalDescription($("h1").first().text(), 500);
  if (flatten(title) !== flatten(advert.title)) return null;
  const heading = $("#nombreInmo");
  if (heading.length !== 1 || !heading.is("h2")) return null;
  const commercial = heading.parent();
  if (!commercial.is("center") || !heading.text().trim()) return null;
  const descriptionHeading = $("h3").filter((_, el) => /^Descripción$/i.test($(el).text().trim())).first();
  const description = descriptionHeading.length ? rentalDescription(descriptionHeading.parent().html()) : "";
  const evidence = { title, description, agencyPositive: true };
  return {
    sellerType: advertiserClassification(evidence).sellerType,
    ownerDirect: ownerDirectDeclaration(evidence, advert.url, observedAt),
    // This source publishes the business name/contact but no verified native agency ID here.
    // Do not fabricate an agency identity from the name, the agent name or the phone number.
    publicContact: publicContactFromVisibleHtml(commercial.html() || "", {
      name: rentalDescription(heading.text(), 160), source: "casasweb", sourceUrl: advert.url, observedAt,
    }),
  };
}

/** Small rotating sample; contact absence/failure never changes the rental's observation date. */
export async function enrichCasaswebRentalContacts(listings: RawRental[], mode: "full" | "fast", options: {
  fetchPage?: (url: string) => Promise<string | null>; maxPages?: number; now?: () => Date;
} = {}): Promise<number> {
  if (process.env.RENTALS_CONTACTS_ENABLED === "0") return 0;
  const now = options.now || (() => new Date()), started = now().getTime();
  const own = listings.filter(row => row.source === "casasweb" && /^casasweb:\d+$/.test(row.listingId))
    .sort((a, b) => a.listingId.localeCompare(b.listingId));
  const limit = Math.min(40, options.maxPages ?? (mode === "fast" ? 8 : 30));
  const offset = own.length ? (Math.floor(started / 3_600_000) * limit) % own.length : 0;
  const queue = [...own.slice(offset), ...own.slice(0, offset)].slice(0, limit);
  const fetchPage = options.fetchPage || (url => fetchText(url, { timeoutMs: 10_000, retries: 0 }));
  let inspected = 0;
  for (const row of queue) {
    if (now().getTime() - started > 60_000) break;
    try {
      const url = new URL(row.url);
      if (url.origin !== "https://casasweb.com" || !url.pathname.startsWith("/ALQUILER") || url.username || url.password) continue;
      const html = await fetchPage(row.url);
      const fields = html ? readCasaswebAdvertiser(html, row, now().toISOString()) : null;
      if (fields) { Object.assign(row, fields); inspected++; }
    } catch { /* undefined means not inspected; the store may retain same-advert evidence */ }
  }
  return inspected;
}
