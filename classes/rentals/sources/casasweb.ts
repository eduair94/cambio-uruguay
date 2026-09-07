import { advertiserClassification, ownerDirectDeclaration } from "../advertiser";
// Public Casasweb search cards. Pagination submits the exact search form served by the site;
// no browser challenges, private APIs, contact data, or advert descriptions are collected.
import * as cheerio from "cheerio";
import { fetchText } from "../net";
import { canonicalDepartment, inferPropertyType, isPlausibleRent, looksLikeRentalAdvert, parseCurrency, parseMoney } from "../normalize";
import type { RawRental } from "../types";
import type { RentalSourceResult } from "./types";

const ORIGIN = "https://casasweb.com";
// Values from the public search form: all 19 departments, housing and commercial rentals.
const PROPERTY_TYPES = ["a", "c", "f", "o", "l", "d", "i", "t", "h", "b", "g"];
const clean = (text: string): string => text.replace(/\s+/g, " ").trim();

export function casaswebSearchUrl(department: number, propertyType: string): string {
  return `${ORIGIN}/resultados.aspx?m=0&n=A&t=${propertyType}&x=${department}&z=0`;
}

export interface CasaswebPage {
  listings: RawRental[];
  total: number;
  nextBody: string | null;
  cardCount: number;
  /** Includes excluded seasonal/reserved cards: coverage and eligibility are different checks. */
  advertIds: string[];
  department: number | null;
  propertyType: string | null;
  currentPage: number | null;
}

function currentPage($: cheerio.CheerioAPI): number | null {
  const selected = $("input[type=submit][id*=btnP].btn-secondary");
  // The public form leaves every button outlined on the first page, including one-page searches.
  if (!selected.length) return 1;
  if (selected.length !== 1) return null;
  const page = Number(selected.val());
  return Number.isSafeInteger(page) && page > 0 ? page : null;
}

/** Read the NEXT numbered submit button, preserving server-issued form state verbatim. */
function nextPageBody($: cheerio.CheerioAPI, page: number | null): string | null {
  if (page === null) return null;
  const buttons = $("input[type=submit][id*=btnP]").toArray();
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

export function parseCasaswebPage(html: string, observedAt = new Date().toISOString()): CasaswebPage | null {
  const $ = cheerio.load(html);
  const count = clean($("body").text()).match(/([\d.,]+)\s+Resultados\b/i);
  if (!count || !$("select[id$=drpNegocio] option[value=A][selected]").length) return null;
  const total = Number(count[1]!.replace(/[.,]/g, ""));
  if (!Number.isSafeInteger(total) || total < 0) return null;
  const department = Number($("select[id$=drpDepto]").val());
  const propertyType = $("select[id$=drpTipo]").val();
  const page = currentPage($);
  const listings: RawRental[] = [];
  const advertIds: string[] = [];
  let cardCount = 0;
  $("a[href]").each((_, node) => {
    const card = $(node);
    const href = card.attr("href") || "";
    if (!/^ALQUILER(?:_|$)/.test(href) || !card.find(".item-info").length) return;
    cardCount++;
    const title = clean(card.find(".item-title h3").text());
    const location = card.find(".tipo-propiedad-zona small");
    const id = clean(location.eq(1).find("strong").text());
    // The portal also carries native external-reference IDs such as TKA8362149.
    if (!id) return;
    advertIds.push(`casasweb:${id}`);
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
      sellerType: advertiserClassification({ title }).sellerType,
      ownerDirect: ownerDirectDeclaration({ title }, new URL(href, ORIGIN).href, observedAt) ?? undefined,
      image, publishedAt: null,
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
  return {
    listings, total, nextBody: nextPageBody($, page), cardCount, advertIds,
    department: Number.isSafeInteger(department) && department >= 1 && department <= 19 ? department : null,
    propertyType: typeof propertyType === "string" && propertyType ? propertyType : null,
    currentPage: page,
  };
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
  // Garages have their own search category; housing pages do not discover standalone spaces.
  const types = mode === "fast" ? ["a", "c", "g"] : PROPERTY_TYPES;
  const attemptedDepartments = new Set<number>();
  sweep: for (const department of departments) {
    attemptedDepartments.add(department);
    for (const type of types) {
      const url = casaswebSearchUrl(department, type);
      let body: string | null = null;
      let initialTotal: number | null = null;
      const advertIds = new Set<string>();
      const seen = new Set<string>();
      for (let page = 1; page <= pageBudget; page++) {
        const html = await fetchText(url, body === null ? { retries: 0 } : {
          method: "POST", body, headers: { "content-type": "application/x-www-form-urlencoded" }, retries: 0,
        });
        const parsed = html ? parseCasaswebPage(html) : null;
        if (!parsed || parsed.department !== department || parsed.propertyType !== type || parsed.currentPage !== page) {
          failed++; incomplete = true;
          if (++consecutiveFailures >= 3) break sweep;
          break;
        }
        consecutiveFailures = 0;
        pages++;
        if (initialTotal === null) initialTotal = parsed.total;
        // A live search is not a snapshot. Do not expire absent adverts if its inventory changes.
        if (parsed.total !== initialTotal || parsed.advertIds.length !== parsed.cardCount) incomplete = true;
        const fingerprint = [...new Set(parsed.advertIds)].sort().join("|");
        if (fingerprint && seen.has(fingerprint)) { incomplete = true; break; }
        seen.add(fingerprint);
        for (const id of parsed.advertIds) advertIds.add(id);
        for (const row of parsed.listings) {
          if (isPlausibleRent(row.price * (row.currency === "USD" ? usdUyu : 1), row.propertyType)) byId.set(row.listingId, row);
        }
        body = parsed.nextBody;
        if (!body) {
          if (advertIds.size !== parsed.total) incomplete = true;
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
