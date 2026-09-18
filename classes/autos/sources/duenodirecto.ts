// Dueño Directo, a private-seller classified: a paginated list of cards (brand, model, price,
// photo) whose detail page carries the spec sheet ("Año", "Kilometraje", "Combustible",
// "Transmisión"). Its host is an IDN, so every URL — ours and its own — is punycode.
//
// Cards whose link has no slug exist (the site renders them without a detail page): they are
// counted and dropped, because a row without a permalink cannot be checked by a reader.
import { descriptionFlags, fuelOf, transmissionOf } from "../normalize";
import type { CarSourceResult } from "../types";
import { addCar, autosFetchText, buildWebCar, decodeEntities, htmlText, moneyOf, sourceResult, type WebCarContext } from "./common";

export const DUENODIRECTO_BASE = "https://vehiculos.xn--dueodirecto-3db.com.uy";
const MAX_PAGES = 15;

export interface DuenoDirectoCard {
  id: string;
  slug: string;
  title: string;
  brand: string | null;
  model: string | null;
  price: number;
  currency: "USD" | "UYU";
  picture: string | null;
}

const text = (html: string, pattern: RegExp): string | null => {
  const match = pattern.exec(html);
  return match ? htmlText(match[1]!) : null;
};

/** Photo paths carry spaces ("WhatsApp Image 2019-09-12 at 13.12.52.jpeg"). */
const photoUrl = (path: string): string => `${DUENODIRECTO_BASE}${encodeURI(path).replace(/#/g, "%23")}`;

export function duenoDirectoCards(html: string): { cards: DuenoDirectoCard[]; linkless: number } {
  const cards: DuenoDirectoCard[] = [];
  let linkless = 0;
  for (const block of String(html || "").split(/(?=<div class="prop_thumb")/).slice(1)) {
    if (!/class="prop_info"/.test(block)) continue;
    const slug = /<a href="vehiculos\/([\w%-]+)"[^>]*class="prop_info"/.exec(block)?.[1];
    if (!slug) {
      linkless++;
      continue;
    }
    // Only sales: the same card layout carries the site's rental adverts.
    if (!/class="prop_location">\s*VENTA\b/.test(block)) continue;
    const id = /\/uploads\/vehiculos\/(\d+)\//.exec(block)?.[1] ?? /carouselPropImg(\d+)/.exec(block)?.[1];
    const price = moneyOf(text(block, /class="prop_price"[^>]*>([^<]*)</) ?? "");
    const title = text(block, /<h2>([\s\S]*?)<\/h2>/);
    if (!id || !price || !title) continue;
    const data = (text(block, /class="prop_data"[^>]*>([\s\S]*?)<\/div>/) ?? "").split("|").map(part => part.trim());
    const photo = /<img[^>]+src="(\/uploads\/vehiculos\/\d+\/[^"]+)"/.exec(block)?.[1];
    cards.push({
      id, slug, title,
      brand: data[0] || null,
      model: data[1] || null,
      price: price.amount,
      currency: price.currency,
      picture: photo ? photoUrl(decodeEntities(photo)) : null,
    });
  }
  return { cards, linkless };
}

/** "<strong>Año</strong> <span>2012</span>" rows of the detail page's spec sheet. */
export function duenoDirectoSpecs(html: string): Map<string, string> {
  const specs = new Map<string, string>();
  const rows = /<strong>([^<]+)<\/strong>\s*<span>([^<]*)<\/span>/g;
  let match: RegExpExecArray | null;
  while ((match = rows.exec(html))) {
    const label = htmlText(match[1]!).toLowerCase().replace(/\s+/g, " ").trim();
    if (label && !specs.has(label)) specs.set(label, htmlText(match[2]!));
  }
  return specs;
}

export function duenoDirectoDescription(html: string): string {
  const block = /class="subtitles">\s*Descripci[^<]*<\/h2>([\s\S]*?)(?:<h2|<\/section)/i.exec(String(html || ""));
  return block ? htmlText(block[1]!).slice(0, 1_500) : "";
}

const digits = (value: string | undefined): number | null => {
  const clean = (value ?? "").replace(/[^\d]/g, "");
  return clean ? Number(clean) : null;
};

export function duenoDirectoPdpToCar(html: string, card: DuenoDirectoCard, context: WebCarContext): ReturnType<typeof buildWebCar> {
  const specs = duenoDirectoSpecs(html);
  const year = digits(specs.get("año"));
  const engine = specs.get("cilindrada") ?? "";
  return buildWebCar({
    source: "duenodirecto",
    id: card.id,
    title: card.title,
    specText: [specs.get("tipo"), engine ? `${engine}cc` : ""].filter(Boolean).join(" "),
    permalink: `${DUENODIRECTO_BASE}/vehiculos/${card.slug}`,
    picture: card.picture,
    price: card.price,
    currency: card.currency,
    brand: specs.get("marca") ?? card.brand,
    model: specs.get("modelo") ?? card.model,
    year: year && year > 1900 ? year : null,
    km: digits(specs.get("kilometraje")),
    transmission: transmissionOf(specs.get("transmisión") ?? ""),
    fuel: fuelOf(specs.get("combustible") ?? card.title),
    // The site is named after what it sells: adverts of the owner, never a dealer's stock.
    sellerType: "private",
    sellerId: "duenodirecto",
    dealerName: null,
    department: null,
    description: duenoDirectoDescription(html),
    context,
  });
}

export async function harvestDuenoDirecto(
  context: WebCarContext,
  options: { fetchPage?: (url: string) => Promise<string | null>; maxPages?: number } = {},
): Promise<CarSourceResult> {
  const result = sourceResult("duenodirecto", new Date().toISOString());
  const fetchPage = options.fetchPage ?? (async (url: string) => (await autosFetchText(url, 30_000, "duenodirecto")).body);
  const maxPages = options.maxPages ?? MAX_PAGES;
  const cards = new Map<string, DuenoDirectoCard>();
  let linkless = 0;
  let page = 1;
  let listFailed = false;
  for (; page <= maxPages; page++) {
    const html = await fetchPage(`${DUENODIRECTO_BASE}/vehiculos?page=${page}`);
    result.requests++;
    if (!html) {
      listFailed = true;
      break;
    }
    const parsed = duenoDirectoCards(html);
    linkless += parsed.linkless;
    const before = cards.size;
    for (const card of parsed.cards) if (!cards.has(card.slug)) cards.set(card.slug, card);
    // The paginator keeps answering past its last advert; a page that adds nothing new ends the sweep.
    if (cards.size === before) break;
  }
  if (!cards.size) {
    result.ok = false;
    result.complete = false;
    result.note = listFailed ? "listado sin respuesta" : "listado sin avisos";
    result.finishedAt = new Date().toISOString();
    return result;
  }
  let failed = 0;
  for (const card of cards.values()) {
    const html = await fetchPage(`${DUENODIRECTO_BASE}/vehiculos/${card.slug}`);
    result.requests++;
    if (!html) {
      failed++;
      continue;
    }
    addCar(result, duenoDirectoPdpToCar(html, card, context));
  }
  const notes: string[] = [];
  if (listFailed) notes.push(`listado cortado en la página ${page}`);
  if (failed) notes.push(`${failed} fichas sin respuesta`);
  if (linkless) notes.push(`${linkless} avisos sin ficha propia`);
  result.note = notes.join("; ") || null;
  result.complete = !listFailed && !failed;
  result.finishedAt = new Date().toISOString();
  return result;
}

/** Kept for the flags a description carries; the site publishes seller phones, which are never read. */
export const duenoDirectoFlags = (description: string): ReturnType<typeof descriptionFlags> => descriptionFlags(description);
