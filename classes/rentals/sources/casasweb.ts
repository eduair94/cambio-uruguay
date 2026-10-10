import { advertiserClassification, ownerDirectDeclaration } from "../advertiser";
// Public Casasweb search cards. Pagination follows the numbered links the site's own pager serves;
// no browser challenges, private APIs, contact data, or advert descriptions are collected.
import * as cheerio from "cheerio";
import { setTimeout as sleep } from "timers/promises";
import { fetchText } from "../net";
import { canonicalDepartment, inferPropertyType, isPlausibleRent, looksLikeRentalAdvert, parseCurrency, parseMoney } from "../normalize";
import { appDbConfigured } from "../../appdb";
import { applyCasaswebDetails } from "../casaswebDetail";
import type { RawRental } from "../types";
import type { RentalSourceResult } from "./types";

const ORIGIN = "https://casasweb.com";
// Values from the public search form (housing and commercial rentals) and the path each one has
// on the site. The 2026-10-07 redesign moved every search to these paths: the old
// `resultados.aspx?n=A&t=..&x=..` query answered 404 for seventeen hours and then 301 here.
const TYPE_PATHS: Record<string, string> = {
  a: "apartamentos", c: "casas", f: "chacras", o: "oficinas", l: "locales-comerciales", d: "depositos",
  i: "locales-industriales", t: "terrenos", h: "containers", b: "edificios", g: "garajes",
};
const PROPERTY_TYPES = Object.keys(TYPE_PATHS);
// Indexed by the form's department value: 1 = Montevideo … 19 = Treinta y Tres.
const DEPARTMENT_PATHS = [
  "montevideo", "artigas", "canelones", "cerro-largo", "colonia", "durazno", "flores", "florida", "lavalleja", "maldonado",
  "paysandu", "rio-negro", "rivera", "rocha", "salto", "san-jose", "soriano", "tacuarembo", "treinta-y-tres",
];
const clean = (text: string): string => text.replace(/\s+/g, " ").trim();

export function casaswebSearchUrl(department: number, propertyType: string, operation: "alquiler" | "venta" = "alquiler"): string {
  const type = TYPE_PATHS[propertyType], place = DEPARTMENT_PATHS[department - 1];
  if (!Number.isInteger(department) || !type || !place) throw new Error(`Invalid Casasweb search: ${department}/${propertyType}`);
  return `${ORIGIN}/${operation}/${type}/${place}`;
}

/**
 * The search pager: GET links, the current page marked `aria-current`. A search that fits in one
 * page has no pager at all. Anything else — two current pages, none, a link off the portal — is
 * a page this parser cannot place, and the caller treats it as a different search.
 */
export function readCasaswebPager($: cheerio.CheerioAPI): { currentPage: number | null; nextUrl: string | null } {
  const links = $("[id$=pnlPager] a[href]");
  if (!links.length) return { currentPage: 1, nextUrl: null };
  const current = links.filter("[aria-current=page]");
  const page = current.length === 1 ? Number(clean(current.text())) : NaN;
  if (!Number.isSafeInteger(page) || page < 1) return { currentPage: null, nextUrl: null };
  const next = links.toArray().find((node) => clean($(node).text()) === String(page + 1));
  const url = next ? new URL($(next).attr("href")!, ORIGIN) : null;
  return { currentPage: page, nextUrl: url && url.origin === ORIGIN ? url.href : null };
}

export interface CasaswebPage {
  listings: RawRental[];
  total: number;
  nextUrl: string | null;
  cardCount: number;
  /** Includes excluded seasonal/reserved cards: coverage and eligibility are different checks. */
  advertIds: string[];
  department: number | null;
  propertyType: string | null;
  currentPage: number | null;
}

export function parseCasaswebPage(html: string, observedAt = new Date().toISOString()): CasaswebPage | null {
  const $ = cheerio.load(html);
  const count = clean($("body").text()).match(/([\d.,]+)\s+Resultados\b/i);
  if (!count || !$("select[id$=drpNegocio] option[value=A][selected]").length) return null;
  const total = Number(count[1]!.replace(/[.,]/g, ""));
  if (!Number.isSafeInteger(total) || total < 0) return null;
  const department = Number($("select[id$=drpDepto]").val());
  const propertyType = $("select[id$=drpTipo]").val();
  const pager = readCasaswebPager($);
  const listings: RawRental[] = [];
  const advertIds: string[] = [];
  let cardCount = 0;
  $("a[href]").each((_, node) => {
    const card = $(node);
    const href = card.attr("href") || "";
    // Root-relative since the redesign ("/ALQUILER__…"), bare before it.
    if (!/^\/?ALQUILER(?:_|$)/.test(href) || !card.find(".item-info").length) return;
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
    // "<small>$</small> <small>MES</small> 3.800": the period sits in its own <small> next to the currency.
    const currency = parseCurrency(rent.find("h2 small").toArray().map((node) => clean($(node).text())).filter((text) => !/^MES$/i.test(text)).join(" "));
    const price = amount ? parseMoney(amount[1]) : null;
    if (!id || !title || !department || !price || !currency || !looksLikeRentalAdvert(title)) return;
    if (/\breservad[oa]\b|\balquilad[oa]\b/i.test(title)) return;
    const details = clean(card.find(".item-det").text());
    const bedrooms = details.match(/(\d+)\s+Dormitorios?/i);
    const parking = details.match(/Garaje\s*\((\d+)\)/i);
    const bathrooms = title.match(/\b(\d+)\s+baños?\b/i);
    const area = clean(location.eq(0).find("i").text()).match(/([\d.,]+)\s*m/i);
    const photo = card.find("img.card-img").attr("src") || "";
    const image = /^https:\/\/\S+$/i.test(photo) ? photo : null;
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
    listings, total, nextUrl: pager.nextUrl, cardCount, advertIds,
    department: Number.isSafeInteger(department) && department >= 1 && department <= 19 ? department : null,
    propertyType: typeof propertyType === "string" && propertyType ? propertyType : null,
    currentPage: pager.currentPage,
  };
}

interface CasaswebSearch { department: number; type: string; retry: boolean }
/** `failure` is why the search could not be read to its end; `incomplete` says it was read, but not all of it. */
interface CasaswebSearchRead { failure: string | null; incomplete: boolean }

const count = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

export async function harvestCasasweb(mode: "full" | "fast", usdUyu: number): Promise<RentalSourceResult> {
  const maxPages = Math.max(1, Number(process.env.RENTALS_CW_MAX_PAGES || 60));
  const pageBudget = mode === "fast" ? 1 : maxPages;
  const pauseMs = Math.max(0, Number(process.env.RENTALS_CW_PAUSE_MS || 60_000));
  const byId = new Map<string, RawRental>();
  let pages = 0;
  let incomplete = mode === "fast";
  const departments = mode === "fast" ? [1, 3, 10] : Array.from({ length: 19 }, (_, index) => index + 1);
  // Garages have their own search category; housing pages do not discover standalone spaces.
  const types = mode === "fast" ? ["a", "c", "g"] : PROPERTY_TYPES;
  const attemptedDepartments = new Set<number>();
  // Why each search failed, so a run note tells "the portal did not answer" from "the page changed".
  const reasons = new Map<string, number>();
  let failed = 0;
  let recovered = 0;

  async function readSearch(department: number, type: string): Promise<CasaswebSearchRead> {
    let url = casaswebSearchUrl(department, type);
    let initialTotal: number | null = null;
    let partial = false;
    const advertIds = new Set<string>();
    const seen = new Set<string>();
    for (let page = 1; page <= pageBudget; page++) {
      let transport = "sin respuesta";
      const onFailure = (reason: string) => { transport = reason; };
      // Default retries on purpose: the hourly pass opens with the only three Montevideo searches,
      // so without them one dropped connection trips the stop below and the whole source is down
      // for an hour (2026-09-21).
      const html = await fetchText(url, { onFailure });
      const parsed = html ? parseCasaswebPage(html) : null;
      if (!parsed || parsed.department !== department || parsed.propertyType !== type || parsed.currentPage !== page) {
        return { failure: !html ? transport : !parsed ? "página irreconocible" : "búsqueda distinta a la pedida", incomplete: true };
      }
      // A page that counts results but shows no card this parser recognises has changed its cards:
      // the 2026-10-07 redesign kept the count and the selects, and this read as "0 avisos".
      if (parsed.total > 0 && parsed.cardCount === 0) return { failure: "tarjetas irreconocibles", incomplete: true };
      pages++;
      if (initialTotal === null) initialTotal = parsed.total;
      // A live search is not a snapshot. Do not expire absent adverts if its inventory changes.
      if (parsed.total !== initialTotal || parsed.advertIds.length !== parsed.cardCount) partial = true;
      const fingerprint = [...new Set(parsed.advertIds)].sort().join("|");
      if (fingerprint && seen.has(fingerprint)) return { failure: null, incomplete: true };
      seen.add(fingerprint);
      for (const id of parsed.advertIds) advertIds.add(id);
      for (const row of parsed.listings) {
        if (isPlausibleRent(row.price * (row.currency === "USD" ? usdUyu : 1), row.propertyType)) byId.set(row.listingId, row);
      }
      if (!parsed.nextUrl) return { failure: null, incomplete: partial || advertIds.size !== parsed.total };
      url = parsed.nextUrl;
      if (page === pageBudget) partial = true;
    }
    return { failure: null, incomplete: partial };
  }

  // Every search that fails gets ONE more read, after a single pause per run: the per-request
  // retries only span a couple of seconds, and a portal that is restarting needs longer. The pause
  // comes as soon as three searches fail in a row — the hourly pass opens with its only three
  // Montevideo searches — or at the end of the sweep for isolated failures. Three failures in a
  // row after the pause mean the portal is down, and the run says so.
  const queue: CasaswebSearch[] = departments.flatMap((department) => types.map((type) => ({ department, type, retry: false })));
  const secondChance: CasaswebSearch[] = [];
  let paused = false;
  let consecutiveFailures = 0;
  const pause = async () => {
    paused = true;
    consecutiveFailures = 0;
    await sleep(pauseMs);
    queue.unshift(...secondChance.splice(0));
  };
  while (queue.length || (secondChance.length && !paused)) {
    if (!queue.length) { await pause(); continue; }
    const search = queue.shift()!;
    attemptedDepartments.add(search.department);
    const read = await readSearch(search.department, search.type);
    if (read.failure === null) {
      consecutiveFailures = 0;
      if (read.incomplete) incomplete = true;
      if (search.retry) recovered++;
      continue;
    }
    if (!paused) secondChance.push({ ...search, retry: true });
    else {
      failed++; incomplete = true;
      reasons.set(read.failure, (reasons.get(read.failure) ?? 0) + 1);
    }
    if (++consecutiveFailures >= 3) {
      if (paused) { incomplete = true; break; }
      await pause();
    }
  }
  const listings = [...byId.values()];
  // The card states neither common expenses nor bathrooms, and shows only its cover; what each
  // advert's own page stated (currency-rentals-casasweb-detail) goes back on before saving, or
  // every run would blank it.
  let fromDetail = 0;
  if (appDbConfigured()) {
    try {
      fromDetail = await applyCasaswebDetails(listings, usdUyu);
    } catch (error) {
      console.warn("[rentals] Casasweb: no se pudieron reaplicar los datos de las fichas", error);
    }
  }
  return {
    key: "casasweb", ok: byId.size > 0, complete: !incomplete, listings,
    note: `${pages} páginas, ${byId.size} avisos únicos (${fromDetail} completados con su ficha); departamentos consultados: ${attemptedDepartments.size}` +
      (incomplete ? " — cobertura parcial; se conservan avisos no vistos" : "") +
      (recovered ? `; ${count(recovered, "búsqueda leída", "búsquedas leídas")} tras una pausa` : "") +
      (failed ? `; ${count(failed, "búsqueda fallida", "búsquedas fallidas")}: ${[...reasons].map(([reason, n]) => `${reason} ×${n}`).join(", ")}` : ""),
  };
}
