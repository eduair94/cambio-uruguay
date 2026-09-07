import { readCasaswebAdvertiser } from "../rentals/casaswebContacts";
import { advertiserClassification, ownerDirectDeclaration } from "../rentals/advertiser";
import * as cheerio from "cheerio";
import { rentalDescription, rentalImages } from "../rentals/details";
import { canonicalDepartment, flatten, parseCurrency, parseMoney } from "../rentals/normalize";
import { fetchText } from "../rentals/net";
import type { OpportunityListing } from "../propertyopportunities/types";
import type { OpportunityMoney } from "../propertyopportunities/types";

const ORIGIN = "https://casasweb.com";
const clean = (value: string) => rentalDescription(value, 2_000).replace(/\s+/g, " ").trim();
export interface CasaswebSalePage { listings: OpportunityListing[]; unavailableIds: string[]; nextBody: string | null; total: number }
export interface CasaswebSaleHarvest {
  source: "casasweb"; operation: "sale"; ok: boolean; complete: false; readAt: string;
  listings: OpportunityListing[]; unavailableIds: string[];
  pagesRequested: number; pagesRead: number; failedPages: number;
  priceChecks?: { checked: number; confirmedUsd: number; withheld: number };
}

export function casaswebSaleUrl(department: number, type: "a" | "c"): string {
  if (!Number.isInteger(department) || department < 1 || department > 19 || !["a", "c"].includes(type)) throw new Error("Invalid sale search");
  return `${ORIGIN}/resultados.aspx?m=0&n=V&t=${type}&x=${department}&z=0`;
}

/** Cards have been observed printing "$" for USD sales. The own detail header disambiguates. */
export function readCasaswebSalePrice(html: string, id: string): OpportunityMoney | null {
  if (!/^\d{1,18}$/.test(id)) return null;
  const $ = cheerio.load(html);
  if (!clean($("title").text()).startsWith(`CW${id} `)) return null;
  const references = $("li").toArray().map(node => clean($(node).text())).filter(value => /^Ref\s*:/i.test(value));
  if (references.length !== 1 || !new RegExp(`^Ref\\s*:\\s*CW${id}$`, "i").test(references[0]!)) return null;
  const priceHeaders = $("h2").filter((_, node) => $(node).find("span.venta").length > 0);
  if (priceHeaders.length !== 1) return null;
  const match = clean(priceHeaders.text()).match(/^Venta\s+(USD|U\$S|US\$|\$)\s*([\d.,]+)$/i);
  const currency = match ? parseCurrency(match[1]!) : null, amount = match ? parseMoney(match[2]!) : null;
  return currency && amount && amount > 0 ? { amount, currency } : null;
}

/** Full own-advert details are required because card prices can omit mortgage balances or rights. */
export function readCasaswebSaleDetail(html: string, card: OpportunityListing, readAt: string): OpportunityListing | null {
  const sourcePrice = readCasaswebSalePrice(html, card.listingId.slice("casasweb:".length));
  if (!sourcePrice || sourcePrice.currency !== "USD" || sourcePrice.amount !== card.price.amount || !Number.isFinite(Date.parse(readAt))) return null;
  const $ = cheerio.load(html);
  const title = rentalDescription($("h1").first().text(), 500);
  const descriptionHeading = $("h3").filter((_, node) => /^Descripción$/i.test($(node).text().trim())).first();
  const detailsHeading = $("h3").filter((_, node) => /^Detalles$/i.test($(node).text().trim())).first();
  if (!title || !descriptionHeading.length || !detailsHeading.length) return null;
  const detailRoot = detailsHeading.parent();
  const get = (label: RegExp) => {
    const node = detailRoot.find("li").filter((_, node) => label.test(flatten(clean($(node).find("b").first().text())))).first();
    return clean(node.clone().children("b").remove().end().text());
  };
  const number = (value: string) => /^\d+(?:[.,]\d+)?$/.test(value) ? parseMoney(value) : null;
  const type = flatten(get(/^tipo\s*:/));
  if (type !== card.propertyType) return null;
  const body = descriptionHeading.parent().clone(); body.find("h3").remove();
  const description = rentalDescription(body.html(), 8_000);
  if (description.length < 30) return null;
  const amenitiesHeading = $("h3").filter((_, node) => /^Amenities$/i.test($(node).text().trim())).first();
  const amenities = amenitiesHeading.parent().find("li").toArray().map(node => clean($(node).text())).filter(Boolean);
  const images = rentalImages($("a.gallery-item2[href]").toArray().map(node => $(node).attr("href")));
  const built = number(get(/^metros edificados/));
  const reported = parseMoney(get(/^area total/).replace(/m[²2].*$/i, "").trim()) || card.area?.value || null;
  const expensesText = get(/^gastos comunes/), expenseMatch = expensesText.match(/^(USD|U\$S|US\$|\$)\s*([\d.,]+)$/i);
  const expenseCurrency = expenseMatch ? parseCurrency(expenseMatch[1]!) : null, expenseAmount = expenseMatch ? parseMoney(expenseMatch[2]!) : null;
  const expenses = expenseCurrency && expenseAmount !== null ? { amount: expenseAmount, currency: expenseCurrency } : null;
  const riskFlags = [...new Set([...(card.riskFlags || []), ...(/\bProyecto\b/.test(card.description) ? ["project" as const] : []), ...(/\bRenta\b/.test(card.description) ? ["occupied" as const] : [])])];
  return { ...card, title, description, price: sourcePrice, expenses,
    sellerType: advertiserClassification({ title, description }).sellerType,
    ownerDirect: ownerDirectDeclaration({ title, description }, card.url, readAt),
    ...(readCasaswebAdvertiser(html, { ...card, title }, readAt) || {}),
    image: images[0] || card.image, images: images.length ? images : card.images,
    bedrooms: number(get(/^dormitorios/)), bathrooms: number(get(/^banos/)), parkingSpaces: number(get(/^vehiculos/)),
    area: card.propertyType === "casa" && built ? { value: built, basis: "built" } : reported ? { value: reported, basis: "reported" } : null,
    areas: { built: card.propertyType === "casa" ? built : null, total: null, land: null, terrace: null, reported }, amenities, riskFlags,
    // The original source card's location remains conservatively dated. A later card update
    // replaces this whole object and cannot reuse detail evidence for a different price/state.
    saleDetailReadAt: new Date(readAt).toISOString(),
  };
}

/** A partial card cannot erase still-valid detail, and never renews its older observation. */
export function retainCasaswebDetail(previous: OpportunityListing | undefined, card: OpportunityListing): OpportunityListing {
  if (card.saleDetailReadAt || !previous?.saleDetailReadAt || previous.source !== "casasweb" || card.source !== "casasweb" || previous.id !== card.id) return card;
  if (!Number.isFinite(Date.parse(previous.saleDetailReadAt)) || Date.parse(previous.saleDetailReadAt) < Date.parse(card.lastSeen) - 21 * 86_400_000) return card;
  if (previous.price.amount !== card.price.amount || previous.price.currency !== card.price.currency ||
    previous.title !== card.title || previous.propertyType !== card.propertyType || previous.department !== card.department || previous.neighborhood !== card.neighborhood ||
    (card.bedrooms !== null && previous.bedrooms !== card.bedrooms) || (card.bathrooms !== null && previous.bathrooms !== card.bathrooms) ||
    (card.parkingSpaces !== null && previous.parkingSpaces !== card.parkingSpaces)) return card;
  const inspected = Object.fromEntries(["agency", "publicContact", "ownerDirect"].filter(key => card[key] !== undefined).map(key => [key, card[key]]));
  return Object.keys(inspected).length ? { ...previous, ...inspected } : previous;
}

export async function enrichCasaswebSaleDetails(harvest: CasaswebSaleHarvest, options: {
  maxChecks?: number; maxDurationMs?: number; fetchDetail?: (url: string) => Promise<string | null>;
  onProgress?: (checked: number, accepted: number) => void;
  previous?: readonly OpportunityListing[];
} = {}): Promise<CasaswebSaleHarvest> {
  const started = Date.now(), limit = Math.min(250, Math.max(1, options.maxChecks || 250));
  const duration = Math.min(6 * 60_000, Math.max(1000, options.maxDurationMs || 6 * 60_000));
  const fetchDetail = options.fetchDetail || (url => fetchText(url, { retries: 0, timeoutMs: 20_000 }));
  const priority = (row: OpportunityListing) => row.price.currency === "USD" && row.price.amount < 60000 ? 0 : row.price.currency === "UYU" ? 1 : 2;
  const previous = new Map((options.previous || []).map(row => [row.id, row]));
  const reusable = (row: OpportunityListing) => retainCasaswebDetail(previous.get(row.id), row) !== row;
  const queue = harvest.listings.slice().sort((a, b) => Number(reusable(a)) - Number(reusable(b)) || priority(a) - priority(b) || a.price.amount - b.price.amount || a.id.localeCompare(b.id));
  const rows = new Map(harvest.listings.map(row => [row.id, row]));
  let checked = 0, accepted = 0;
  for (const card of queue) {
    if (checked >= limit || Date.now() - started >= duration) break;
    checked++;
    try {
      const html = await fetchDetail(card.url), detail = html ? readCasaswebSaleDetail(html, card, new Date().toISOString()) : null;
      if (detail) { rows.set(card.id, detail); accepted++; }
    } catch { /* A failed individual read cannot make an unreviewed card public. */ }
    options.onProgress?.(checked, accepted);
  }
  return { ...harvest, listings: [...rows.values()], priceChecks: { checked, confirmedUsd: accepted, withheld: rows.size - accepted } };
}

/** No assumption that a suspicious peso price meant dollars: only its own source can confirm it. */
export async function confirmCasaswebSaleCurrencies(harvest: CasaswebSaleHarvest, options: {
  maxChecks?: number; maxDurationMs?: number; fetchDetail?: (url: string) => Promise<string | null>;
  onProgress?: (checked: number, confirmed: number) => void;
} = {}): Promise<CasaswebSaleHarvest> {
  const started = Date.now(), maxChecks = Math.min(250, Math.max(1, options.maxChecks || 250));
  const maxDuration = Math.min(6 * 60_000, Math.max(1000, options.maxDurationMs || 6 * 60_000));
  const fetchDetail = options.fetchDetail || (url => fetchText(url, { retries: 0, timeoutMs: 20_000 }));
  let checked = 0, confirmedUsd = 0;
  const listings: OpportunityListing[] = [];
  for (const row of harvest.listings) {
    if (row.price.currency === "USD") { listings.push(row); continue; }
    let confirmed: OpportunityMoney | null = null;
    if (checked < maxChecks && Date.now() - started < maxDuration) {
      checked++;
      try { const html = await fetchDetail(row.url); confirmed = html ? readCasaswebSalePrice(html, row.listingId.slice("casasweb:".length)) : null; } catch { /* Withhold ambiguous price. */ }
      options.onProgress?.(checked, confirmedUsd);
    }
    if (confirmed?.currency === "USD" && confirmed.amount === row.price.amount) {
      // Other facts retain the original card observation date. Only the independently
      // confirmed currency changes; an altered amount remains ambiguous for this capture.
      listings.push({ ...row, price: confirmed }); confirmedUsd++;
    } else listings.push(row); // Private evidence remains; the public projector withholds unconfirmed UYU cards.
  }
  return { ...harvest, listings, priceChecks: { checked, confirmedUsd, withheld: listings.filter(row => row.price.currency !== "USD").length } };
}

/** The exact own-source sale card is the only scope; nearby rental/seasonal prices are ignored. */
export function readCasaswebSalePage(html: string, readAt: string): CasaswebSalePage | null {
  if (!Number.isFinite(Date.parse(readAt))) return null;
  const $ = cheerio.load(html);
  const count = clean($("body").text()).match(/([\d.,]+)\s+Resultados\b/i);
  if (!count || !$("select[id$=drpNegocio] option[value=V][selected]").length) return null;
  const listings: OpportunityListing[] = [], unavailableIds: string[] = [];
  $("a[href]").each((_, node) => {
    const card = $(node), href = card.attr("href") || "";
    if (!/^VENTA_[^/?#]+_CW\d+$/i.test(href) || !card.find(".item-info").length) return;
    const location = card.find(".tipo-propiedad-zona small");
    const label = clean(location.eq(1).find("strong").text());
    const id = /^CW(\d{1,18})$/.exec(label)?.[1];
    if (!id || !href.endsWith(`_CW${id}`)) return;
    const title = clean(card.find(".item-title h3").text());
    if (/\b(?:reservad[oa]|vendid[oa])\b/i.test(title)) { unavailableIds.push(`sale:casasweb:${id}`); return; }
    const declaredType = flatten(clean(location.eq(0).find("b").clone().children().remove().end().text()).replace(/\s*-\s*$/, ""));
    const propertyType = declaredType === "apartamento" ? "apartamento" : declaredType === "casa" ? "casa" : null;
    const department = canonicalDepartment(clean(location.eq(1).clone().find("strong").remove().end().text()));
    const neighborhood = clean(location.eq(0).clone().find("b").remove().end().text());
    const prices = card.find(".item-precio .precio").filter((_, n) => /^VENTA$/i.test(clean($(n).find("h3").text())));
    if (prices.length !== 1) return;
    const priceNode = prices.first().find("h2");
    const currency = parseCurrency(clean(priceNode.find("small").text()));
    const rawPrice = clean(priceNode.clone().children().remove().end().text());
    const price = /^[\d.,]+$/.test(rawPrice) ? parseMoney(rawPrice) : null;
    if (!title || !propertyType || !department || !price || !currency) return;
    const details = clean(card.find(".item-det").text());
    const bedrooms = details.match(/(\d+)\s+Dormitorios?/i);
    const parking = details.match(/Garaje\s*\((\d+)\)/i);
    const bathrooms = title.match(/\b(\d+)\s+baños?\b/i);
    const rawArea = clean(location.eq(0).find("i").text()).match(/([\d.,]+)\s*m/i);
    const reported = rawArea ? parseMoney(rawArea[1]!) : null;
    const style = card.find("img.card-img").attr("style") || "";
    const images = rentalImages([style.match(/url\(['"]?(https:\/\/[^'"\s)]+)['"]?\)/i)?.[1]]);
    listings.push({
      id: `sale:casasweb:${id}`, operation: "sale", source: "casasweb", listingId: `casasweb:${id}`,
      url: new URL(href, ORIGIN).href, title, description: details, image: images[0] || null, images,
      sellerName: clean(card.parent().find(".card-footer h3").text()), department,
      locality: department === "Montevideo" ? "Montevideo" : "", neighborhood, propertyType,
      bedrooms: bedrooms ? Number(bedrooms[1]) : /monoambiente/i.test(details) ? 0 : null,
      bathrooms: bathrooms ? Number(bathrooms[1]) : null, parkingSpaces: parking ? Number(parking[1]) : null,
      price: { amount: price, currency }, expenses: /\bsin gastos comunes\b/i.test(title) ? { amount: 0, currency: "UYU" } : null,
      // Casasweb's public surface notice includes prorated shared areas. A card does not prove built m².
      area: reported && reported > 0 ? { value: reported, basis: "reported" } : null,
      areas: { built: null, total: null, land: null, terrace: null, reported },
      furnished: null, amenities: [], geo: null, lastSeen: new Date(readAt).toISOString(), publishedAt: null,
      riskFlags: [...(/\bProyecto\b/.test(details) ? ["project" as const] : []), ...(/\bRenta\b/.test(details) ? ["occupied" as const] : [])],
    });
  });
  const buttons = $("input[type=submit][id*=btnP]").toArray();
  const current = buttons.find(node => $(node).hasClass("btn-secondary"));
  const page = current ? Number($(current).val()) : 1;
  const next = buttons.find(node => Number($(node).val()) === page + 1);
  let nextBody: string | null = null;
  if (next) {
    const params = new URLSearchParams();
    $("form input[name]").each((_, node) => {
      const input = $(node), type = input.attr("type");
      if (type === "hidden" || type === "text" || ((type === "checkbox" || type === "radio") && input.is(":checked")))
        params.append(input.attr("name")!, String(input.val() ?? ""));
    });
    $("form select[name]").each((_, node) => { params.set($(node).attr("name")!, String($(node).val() ?? "")); });
    params.set($(next).attr("name")!, String($(next).val()));
    nextBody = params.toString();
  }
  return { listings, unavailableIds, total: Number(count[1]!.replace(/[.,]/g, "")), nextBody };
}

/** Breadth first across all departments; bounded partial readings never retire unseen IDs. */
export async function harvestCasaswebSales(options: {
  maxPages?: number; maxDurationMs?: number; now?: () => Date;
  fetchPage?: (url: string, body: string | null) => Promise<string | null>;
  onProgress?: (pages: number, listings: number) => void;
} = {}): Promise<CasaswebSaleHarvest> {
  const now = options.now || (() => new Date()), started = now().getTime();
  const maxPages = Math.max(1, Math.min(120, Math.floor(options.maxPages || 120)));
  const maxDuration = Math.max(1_000, Math.min(6 * 60_000, options.maxDurationMs || 6 * 60_000));
  const fetchPage = options.fetchPage || ((url, body) => fetchText(url, body === null ? { retries: 0, timeoutMs: 20_000 } : {
    retries: 0, timeoutMs: 20_000, method: "POST", body, headers: { "content-type": "application/x-www-form-urlencoded" },
  }));
  const queues = Array.from({ length: 19 }, (_, i) => i + 1).flatMap(department => (["a", "c"] as const).map(type => ({
    url: casaswebSaleUrl(department, type), body: null as string | null, active: true, seen: new Set<string>(),
  })));
  const rows = new Map<string, OpportunityListing>(), unavailable = new Set<string>();
  let pagesRequested = 0, pagesRead = 0, failedPages = 0, consecutiveFailures = 0;
  sweep: while (queues.some(queue => queue.active)) for (const queue of queues) {
    if (!queue.active) continue;
    if (pagesRequested >= maxPages || now().getTime() - started >= maxDuration) break sweep;
    pagesRequested++;
    let html: string | null = null;
    try { html = await fetchPage(queue.url, queue.body); } catch { /* Keep prior source reads. */ }
    const parsed = html ? readCasaswebSalePage(html, now().toISOString()) : null;
    if (!parsed) {
      queue.active = false; failedPages++;
      if (++consecutiveFailures >= 3) break sweep;
      continue;
    }
    consecutiveFailures = 0; pagesRead++;
    const fingerprint = parsed.listings.map(row => row.id).join("|");
    if (fingerprint && queue.seen.has(fingerprint)) { queue.active = false; continue; }
    queue.seen.add(fingerprint);
    for (const row of parsed.listings) rows.set(row.id, row);
    parsed.unavailableIds.forEach(id => unavailable.add(id));
    queue.body = parsed.nextBody; queue.active = queue.body !== null;
    options.onProgress?.(pagesRead, rows.size);
  }
  return { source: "casasweb", operation: "sale", ok: rows.size > 0, complete: false, readAt: now().toISOString(),
    listings: [...rows.values()].filter(row => !unavailable.has(row.id)), unavailableIds: [...unavailable], pagesRequested, pagesRead, failedPages };
}
