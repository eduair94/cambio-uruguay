// Public Casasweb search cards. Pagination submits the exact search form served by the site;
// no browser challenges, private APIs, contact data, or advert descriptions are collected.
import * as cheerio from "cheerio";
import { fetchText } from "../net";
import { canonicalDepartment, inferPropertyType, isPlausibleRent, looksLikeRentalAdvert, parseCurrency, parseMoney } from "../normalize";
import type { RawRental } from "../types";
import type { RentalSourceResult } from "./types";

const ORIGIN = "https://casasweb.com";
// Values from the public search form: all 19 departments, housing and commercial rentals.
const PROPERTY_TYPES = ["a", "c", "o", "l", "d", "i", "t", "h", "b", "g"];
const clean = (text: string): string => text.replace(/\s+/g, " ").trim();

export function casaswebSearchUrl(department: number, propertyType: string): string {
  return `${ORIGIN}/resultados.aspx?m=0&n=A&t=${propertyType}&x=${department}&z=0`;
}

export interface CasaswebPage {
  listings: RawRental[];
  /** null when the document is a challenge/error page rather than a search response. */
  total: number;
  nextBody: string | null;
  cardCount: number;
}

/** Read the NEXT numbered submit button, preserving server-issued form state verbatim. */
function nextPageBody($: cheerio.CheerioAPI): string | null {
  const buttons = $("input[type=submit][id*=btnP]").toArray();
  const current = buttons.find((node) => $(node).hasClass("btn-secondary"));
  const page = current ? Number($(current).val()) : 1;
  const next = buttons.find((node) => Number($(node).val()) === page + 1);
  if (!next) return null;
  const params = new URLSearchParams();
  $("form input[name]").each((_, node) => {
    const input = $(node);
    const type = input.attr("type");
    if (type === "hidden" || type === "text" || ((type === "checkbox" || type === "radio") && input.is(":checked"))) {
      params.append(input.attr("name")!, String(input.val() ?? ""));
    }
  });
  $("form select[name]").each((_, node) => {
    params.set($(node).attr("name")!, String($(node).val() ?? ""));
  });
  params.set($(next).attr("name")!, String($(next).val()));
  return params.toString();
}

export function parseCasaswebPage(html: string): CasaswebPage | null {
  const $ = cheerio.load(html);
  const count = clean($("body").text()).match(/([\d.,]+)\s+Resultados\b/i);
  if (!count || !$("select[id$=drpNegocio] option[value=A][selected]").length) return null;
  const listings: RawRental[] = [];
  let cardCount = 0;
  $("a[href]").each((_, node) => {
    const card = $(node);
    const href = card.attr("href") || "";
    if (!/^ALQUILER(?:_|$)/.test(href) || !card.find(".item-info").length) return;
    cardCount++;
    const title = clean(card.find(".item-title h3").text());
    const location = card.find(".tipo-propiedad-zona small");
    const id = clean(location.eq(1).find("strong").text());
    const declaredType = clean(location.eq(0).find("b").clone().children().remove().end().text()).replace(/\s*-\s*$/, "");
    const neighborhood = clean(location.eq(0).clone().find("b").remove().end().text());
    const department = canonicalDepartment(clean(location.eq(1).clone().find("strong").remove().end().text()));
    const rent = card.find(".item-precio .precio").filter((_, price) => /^ALQUILER\s*$/i.test(clean($(price).find("h3").text()))).first();
    const money = clean(rent.find("h2").text());
    // A seasonal price may appear on the same card. Only the explicit monthly ALQUILER counts.
    const amount = money.match(/\bMES\s+([\d.,]+)/i);
    const currency = parseCurrency(clean(rent.find("h2 small").text()));
    const price = amount ? parseMoney(amount[1]) : null;
    if (!id || !title || !department || !price || !currency || !looksLikeRentalAdvert(title)) return;
    if (/\breservad[oa]\b|\balquilad[oa]\b/i.test(title)) return;
    const details = clean(card.find(".item-det").text());
    const bedrooms = details.match(/(\d+)\s+Dormitorios?/i);
    const parking = details.match(/Garaje\s*\((\d+)\)/i);
    const bathrooms = title.match(/\b(\d+)\s+baños?\b/i);
    const area = clean(location.eq(0).find("i").text()).match(/([\d.,]+)\s*m/i);
    const style = card.find("img.card-img").attr("style") || "";
    const image = style.match(/url\(['"]?(https:\/\/[^'"\s)]+)['"]?\)/i)?.[1] ?? null;
    listings.push({
      source: "casasweb", listingId: `casasweb:${id}`, url: new URL(href, ORIGIN).href, title,
      price, currency,
      commonExpenses: /\bsin gastos comunes\b/i.test(title) ? 0 : null,
      commonExpensesCurrency: null,
      sellerName: clean(card.parent().find(".card-footer h3").text()) || "Casasweb",
      sellerType: "inmobiliaria", image, publishedAt: null,
      propertyType: inferPropertyType(title, declaredType), department, neighborhood,
      // Cards do not have a separate street field; the title must not become a made-up address.
      address: "", street: "", streetNumber: "", latitude: null, longitude: null,
      bedrooms: bedrooms ? Number(bedrooms[1]) : /monoambiente/i.test(details) ? 0 : null,
      bathrooms: bathrooms ? Number(bathrooms[1]) : null,
      area: area ? parseMoney(area[1]) : null,
      parkingSpaces: parking ? Number(parking[1]) : null,
      furnished: null, petsAllowed: null, guarantees: [],
    });
  });
  return { listings, total: Number(count[1]!.replace(/[.,]/g, "")), nextBody: nextPageBody($), cardCount };
}

export async function harvestCasasweb(mode: "full" | "fast", usdUyu: number): Promise<RentalSourceResult> {
  const maxPages = Math.max(1, Number(process.env.RENTALS_CW_MAX_PAGES || 60));
  const pageBudget = mode === "fast" ? 1 : maxPages;
  const byId = new Map<string, RawRental>();
  let pages = 0;
  let incomplete = mode === "fast";
  let failed = 0;
  let consecutiveFailures = 0;
  const departments = mode === "fast" ? [1, 3, 10] : Array.from({ length: 19 }, (_, index) => index + 1);
  const types = mode === "fast" ? ["a", "c"] : PROPERTY_TYPES;
  const attemptedDepartments = new Set<number>();
  sweep: for (const department of departments) {
    attemptedDepartments.add(department);
    for (const type of types) {
      const url = casaswebSearchUrl(department, type);
      let body: string | null = null;
      let cardsSeen = 0;
      const seen = new Set<string>();
      for (let page = 1; page <= pageBudget; page++) {
        const html = await fetchText(url, body === null ? { retries: 0 } : {
          method: "POST", body, headers: { "content-type": "application/x-www-form-urlencoded" }, retries: 0,
        });
        const parsed = html ? parseCasaswebPage(html) : null;
        if (!parsed) {
          failed++; incomplete = true;
          if (++consecutiveFailures >= 3) break sweep;
          break;
        }
        consecutiveFailures = 0;
        pages++;
        cardsSeen += parsed.cardCount;
        const fingerprint = parsed.listings.map((listing) => listing.listingId).join("|");
        if (fingerprint && seen.has(fingerprint)) { incomplete = true; break; }
        seen.add(fingerprint);
        for (const row of parsed.listings) {
          if (isPlausibleRent(row.price * (row.currency === "USD" ? usdUyu : 1), row.propertyType)) byId.set(row.listingId, row);
        }
        body = parsed.nextBody;
        if (!body) {
          if (cardsSeen < parsed.total) incomplete = true;
          break;
        }
        if (page === pageBudget) incomplete = true;
      }
    }
  }
  return {
    key: "casasweb", ok: byId.size > 0, complete: !incomplete, listings: [...byId.values()],
    note: `${pages} páginas, ${byId.size} avisos únicos; departamentos consultados: ${attemptedDepartments.size}` +
      (incomplete ? " — cobertura parcial; se conservan avisos no vistos" : "") + (failed ? `; ${failed} búsquedas sin respuesta` : ""),
  };
}
