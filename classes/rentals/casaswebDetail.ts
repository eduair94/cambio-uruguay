// El punto del mapa de las fichas de Casasweb del directorio de alquileres.
//
// La tarjeta de búsqueda de Casasweb no trae dirección ni coordenada: el 2026-10-08 sus 2.696
// propiedades vigentes tenían 0 % de coordenadas, así que no salían en el mapa ni en "más cerca de".
// La ficha propia sí dibuja un mapa (Leaflet) con un marcador rotulado con la referencia del aviso:
// `L.marker([-34.910033, -56.198587], {icon: cwIcon}).addTo(map).bindTooltip('CW222638', …)`.
//
// Medido antes de creerle, como el de Mercado Libre: en 60 fichas de Montevideo, 59 con marcador y
// 59 puntos distintos (no es el centroide del barrio), y el barrio que declara el aviso coincide con
// el de sus 15 vecinos con coordenada de El País/InfoCasas en el 83 % de los casos — esas mismas
// fuentes, contra sí mismas, dan 79 %. Los desacuerdos son nombres ("Puerto del Buceo" contra
// "Puerto Buceo") o bordes entre barrios.
//
// Lo escribe `sync_rentals_casasweb_detail.ts` (pm2 `currency-rentals-casasweb-detail`) en la
// colección privada `rentalcasaswebdetails`, y la cosecha lo reaplica (detailPins.ts).
//
// La misma ficha publica, en su lista de datos, lo que la tarjeta no trae: "Gastos Comunes :
// $6.000" y los baños (`<li title='Baños'>…<b>1</b> baño</li>`). El 2026-10-08 Casasweb tenía 1 %
// de sus propiedades con gastos comunes y 10 % con baños; en 12 fichas de apartamentos de
// Montevideo, 11 declaraban gastos comunes y 10 los baños. Se guardan en la misma lectura y la
// cosecha los reaplica al aviso crudo (`applyCasaswebDetails`): ese día ninguna propiedad de
// Casasweb estaba unida a otro portal, así que no cambia ninguna deduplicación.
//
// Y las FOTOS (2026-10-09): la tarjeta trae sólo la portada (`/fotos/<n>s.jpg`, la chica) y la ficha
// la galería entera, cada foto en un `<a class="gallery-item2" href="/fotos/<n>.jpg">` dentro de
// `#lightGallery` — las de más abajo en el mismo bloque, ocultas hasta abrir el visor. Medido en
// tres fichas: 15, 18 y 0; el 0 es un aviso importado de Tokko (TKA…), cuya ficha en Casasweb no
// dibuja galería, sólo la portada. Las miniaturas de "Propiedades similares" son de OTROS avisos y
// quedan fuera del bloque.
import * as cheerio from "cheerio";
import { appConnection } from "../appdb";
import { casaswebReference, casaswebTitleNames } from "./casaswebContacts";
import { applyGallery, writeOfferGallery } from "./detailImages";
import { inUruguay, PIN_SOURCES, type RentalPin } from "./detailPins";
import { rentalImages } from "./details";
import { mlDetailExpenses } from "./mlDetail";
import { parseCurrency, parseMoney } from "./normalize";
import type { RawRental, RentalCurrency } from "./types";

export const CASASWEB_DETAIL_COLLECTION = PIN_SOURCES.find(row => row.source === "casasweb")!.collection;
/** A listing's pin does not move; a month between reads only catches an agency that corrects it. */
export const CASASWEB_DETAIL_REFRESH_DAYS = 30;
/**
 * Days an advert whose page is gone is left alone. Casasweb answers a removed advert with its own
 * search page, and its card stays a target while the directory keeps it (ten days after it was last
 * seen). Unremembered, the same dead adverts headed the queue every hour and their five "failures"
 * stopped the run: from 2026-10-09 10:25 every run read zero pages.
 */
export const CASASWEB_DETAIL_GONE_DAYS = 7;

export interface CasaswebRentalDetail {
  listingId: string;
  readAt: string;
  /** null = the advert's own page has no map marker. */
  latitude: number | null;
  longitude: number | null;
  /**
   * What the page's data list states; null = not stated. Absent on rows read before they were kept
   * (2026-10-08): those are read again once (see `casaswebDetailTargets`).
   */
  expenses?: { amount: number; currency: RentalCurrency } | null;
  bathrooms?: number | null;
  bedrooms?: number | null;
  /**
   * The page's gallery, full size and in its order; empty = none. Absent on rows read before photos
   * were kept (2026-10-09): those are read again once (see `casaswebDetailTargets`).
   */
  images?: string[];
  /** Always true for a stored row: failed reads are not stored, so the advert is read again. */
  ok: true;
}

export interface CasaswebPageFacts {
  pin: RentalPin | null;
  expenses: { amount: number; currency: RentalCurrency } | null;
  bathrooms: number | null;
  bedrooms: number | null;
  images: string[];
}

const OWN_PHOTO = /^https:\/\/(?:(?:www\.)?casasweb\.com\/fotos\/\d{1,12}\.jpe?g|static\.tokkobroker\.com\/pictures\/[\w.-]{1,200}\.(?:jpe?g|png|webp))$/i;

/** Casasweb serves one photo as `<n>.jpg` (full), `<n>u.jpg` and `<n>s.jpg` (the card's cover). */
export const casaswebPhotoKey = (url: string): string => {
  const own = /^https?:\/\/(?:www\.)?casasweb\.com\/fotos\/(\d{1,12})[a-z]?\.jpe?g$/i.exec(url.trim());
  return own ? `casasweb:${own[1]}` : url;
};

/**
 * The advert's own gallery: the full-size link of every `gallery-item2` inside `#lightGallery`, the
 * block the page's photo viewer opens. HTTPS photos of Casasweb or Tokko only; a video, another
 * host or another advert's card is not a photo of this home.
 */
export function parseCasaswebImages(html: string): string[] {
  const $ = cheerio.load(html);
  const links = $("#lightGallery a.gallery-item2[href]").toArray().map(node => String($(node).attr("href") ?? "").trim());
  return rentalImages(links.filter(url => OWN_PHOTO.test(url)));
}

/** "<li title='Baños'><img …/><b>1</b> baño</li>", the page's own count; an implausible one is not. */
const countIn = (html: string, title: string, min: number): number | null => {
  const match = new RegExp(`<li\\s+title=['"]${title}['"][^>]*>[\\s\\S]{0,200}?<b>\\s*(\\d{1,2})\\s*</b>`, "i").exec(html);
  const value = match ? Number(match[1]) : NaN;
  return Number.isInteger(value) && value >= min && value <= 10 ? value : null;
};

/**
 * Everything this job keeps from an advert page, or `undefined` when it is not this advert's page
 * (the same identity check as the pin). A zero "Gastos Comunes : $0" is not "no common expenses":
 * like Mercado Libre's form, it is what the agency's system keeps when nobody types a number.
 */
export function readCasaswebDetail(html: string, listingId: string): CasaswebPageFacts | undefined {
  const pin = parseCasaswebPin(html, listingId);
  if (pin === undefined) return undefined;
  const stated = /<li>\s*<b>\s*Gastos\s+Comunes\s*:?\s*<\/b>\s*([^<]{1,40})<\/li>/i.exec(html)?.[1] ?? "";
  const amount = parseMoney(stated);
  const currency = parseCurrency(stated);
  return {
    pin,
    expenses: amount && amount > 0 && currency ? { amount, currency } : null,
    bathrooms: countIn(html, "Ba(?:ñ|&#241;|&ntilde;)os", 1),
    bedrooms: countIn(html, "Dormitorios", 0),
    images: parseCasaswebImages(html),
  };
}

/**
 * The marker of the advert page's map. `undefined` = not this advert's page (an error, a redirect to
 * the search, another listing): nothing is concluded. `null` = its page, with no usable marker. A
 * marker labelled with ANOTHER reference is refused: it would be someone else's home.
 */
export function parseCasaswebPin(html: string, listingId: string): RentalPin | null | undefined {
  const reference = casaswebReference(listingId);
  if (!reference) return undefined;
  const $ = cheerio.load(html);
  if (!casaswebTitleNames($("title").text(), reference)) return undefined;
  const match = /L\.marker\(\[\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,2}\.\d+)\s*\]([^;]{0,300})/.exec(html);
  if (!match) return null;
  const label = /bindTooltip\(\s*['"]([A-Z]{2,4}\d{1,18})['"]/.exec(match[3]!);
  if (label && label[1] !== reference) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  return inUruguay(latitude, longitude) ? { latitude, longitude } : null;
}

export interface CasaswebDetailTarget {
  key: string;
  listingId: string;
  url: string;
  department: string;
  propertyType: string;
  lastSeen: string;
  /** Its page was read before (a month ago, or before a field was kept): after those never read. */
  reread?: boolean;
}

const HOMES = new Set(["apartamento", "casa"]);

/**
 * Adverts never read first (a re-read only refreshes), then Montevideo homes (where "near" and the
 * map are used most), then homes, freshest first.
 */
export function prioritizeCasaswebDetailTargets(rows: readonly CasaswebDetailTarget[], budget: number): CasaswebDetailTarget[] {
  const score = (row: CasaswebDetailTarget) => (HOMES.has(row.propertyType) ? 2 : 0) + (row.department === "Montevideo" ? 1 : 0);
  return [...rows]
    .sort((a, b) =>
      Number(a.reread === true) - Number(b.reread === true) ||
      score(b) - score(a) || b.lastSeen.localeCompare(a.lastSeen) || a.listingId.localeCompare(b.listingId))
    .slice(0, Math.max(0, budget));
}

/**
 * A stored read that needs no other: successful, under a month old and with every field this job
 * keeps. A row without the data list (kept since 2026-10-08) or the photos (since 2026-10-09)
 * predates them and is read once more.
 */
export function casaswebDetailIsCurrent(row: Record<string, unknown>, freshFrom: string): boolean {
  return row.ok === true && String(row.readAt ?? "") >= freshFrom && row.bathrooms !== undefined && row.images !== undefined;
}

/** An advert whose page was found gone since `goneFrom`: not a target until then. */
export function casaswebDetailIsGone(row: Record<string, unknown>, goneFrom: string): boolean {
  return row.gone === true && String(row.readAt ?? "") >= goneFrom;
}

/**
 * Casasweb's own page where the advert's was asked for: the advert was removed. Measured on
 * 2026-10-10 over the eight adverts at the head of the queue: a 200 with the search page of the
 * advert's own type and zone ("Apartamentos en alquiler en Carrasco, Montevideo | Casasweb"), never
 * a 404. A page that is not Casasweb's (a challenge, an error from a proxy) is not this answer.
 */
export function casaswebAdvertGone(html: string, listingId: string): boolean {
  const reference = casaswebReference(listingId);
  if (!reference) return false;
  const title = cheerio.load(html)("title").first().text().replace(/\s+/g, " ").trim();
  return /\|\s*Casasweb$/i.test(title) && !casaswebTitleNames(title, reference);
}

/**
 * Whether Casasweb's answer for an advert's page says the advert is gone: its search page in the
 * advert's place, or a 404/410 for the page itself. The first run after the search page counted
 * (2026-10-10 02:25) found 27 of the first and 4 of the second among 80 targets; left as failures,
 * the 404s would head the queue again and five in a row stop the run as before.
 */
export function casaswebAnswerGone(html: string | null, failure: string, listingId: string): boolean {
  return html ? casaswebAdvertGone(html, listingId) : /^HTTP 4(?:04|10)$/.test(failure);
}

const details = () => appConnection().collection(CASASWEB_DETAIL_COLLECTION);
const listings = () => appConnection().collection("rentallistings");

/** Live Casasweb adverts whose page was never read, read before a field was kept, or a month ago. */
export async function casaswebDetailTargets(now: Date, budget: number, days = 10): Promise<CasaswebDetailTarget[]> {
  const cutoff = new Date(now.getTime() - days * 86_400_000).toISOString().slice(0, 10);
  const rows = await listings()
    .find(
      { offers: { $elemMatch: { source: "casasweb", lastSeen: { $gte: cutoff } } } },
      { projection: { key: 1, department: 1, propertyType: 1, "offers.source": 1, "offers.listingId": 1, "offers.url": 1, "offers.lastSeen": 1 } }
    )
    .toArray();
  const targets: CasaswebDetailTarget[] = [];
  for (const row of rows) {
    for (const offer of Array.isArray(row.offers) ? row.offers : []) {
      if (offer?.source !== "casasweb" || typeof offer.listingId !== "string" || String(offer.lastSeen || "") < cutoff) continue;
      if (!/^https:\/\/(?:www\.)?casasweb\.com\//.test(String(offer.url || ""))) continue;
      targets.push({
        key: String(row.key),
        listingId: offer.listingId,
        url: String(offer.url),
        department: String(row.department || ""),
        propertyType: String(row.propertyType || ""),
        lastSeen: String(offer.lastSeen || ""),
      });
    }
  }
  const fresh = new Date(now.getTime() - CASASWEB_DETAIL_REFRESH_DAYS * 86_400_000).toISOString();
  const goneFrom = new Date(now.getTime() - CASASWEB_DETAIL_GONE_DAYS * 86_400_000).toISOString();
  const current = new Set<string>();
  const readBefore = new Set<string>();
  for (let i = 0; i < targets.length; i += 5_000) {
    const ids = targets.slice(i, i + 5_000).map(target => target.listingId);
    const docs = await details()
      .find({ listingId: { $in: ids } }, { projection: { listingId: 1, ok: 1, readAt: 1, bathrooms: 1, images: 1, gone: 1 } })
      .toArray();
    for (const doc of docs) {
      // A page found gone this week is not asked for again, like one read this month.
      if (casaswebDetailIsCurrent(doc, fresh) || casaswebDetailIsGone(doc, goneFrom)) current.add(String(doc.listingId));
      else readBefore.add(String(doc.listingId));
    }
  }
  const pending = targets
    .filter(target => !current.has(target.listingId))
    .map(target => (readBefore.has(target.listingId) ? { ...target, reread: true } : target));
  return prioritizeCasaswebDetailTargets(pending, budget);
}

export async function saveCasaswebDetails(rows: readonly CasaswebRentalDetail[]): Promise<void> {
  if (!rows.length) return;
  await details().createIndex({ listingId: 1 }, { unique: true });
  await details().bulkWrite(
    // A page read whole again is no longer gone.
    rows.map(row => ({ updateOne: { filter: { listingId: row.listingId }, update: { $set: row, $unset: { gone: "" } }, upsert: true } })),
    { ordered: false }
  );
}

/**
 * Remembers the adverts whose page is gone, with the date it was found. Only that: a row read whole
 * before keeps its facts (the harvest re-applies them only to a card it still sees).
 */
export async function markCasaswebGone(listingIds: readonly string[], readAt: string): Promise<void> {
  if (!listingIds.length) return;
  await details().createIndex({ listingId: 1 }, { unique: true });
  await details().bulkWrite(
    listingIds.map(listingId => ({ updateOne: { filter: { listingId }, update: { $set: { listingId, readAt, gone: true } }, upsert: true } })),
    { ordered: false }
  );
}

/**
 * Completes the stored property right away — only EMPTY fields: the advert's common expenses (when
 * plausible against its rent), the property's bathrooms and bedrooms; and the advert's gallery when
 * the page has more photos than it shows. The harvest keeps them.
 */
export async function writeCasaswebFacts(
  target: Pick<CasaswebDetailTarget, "key" | "listingId">,
  facts: Pick<CasaswebPageFacts, "expenses" | "bathrooms" | "bedrooms" | "images">,
  usdUyu: number
): Promise<number> {
  let written = 0;
  if (facts.expenses) {
    const row = await listings().findOne({ key: target.key }, { projection: { offers: 1 } });
    const own = (row?.offers ?? []).find((offer: { listingId?: string }) => offer.listingId === target.listingId);
    const expenses = own ? mlDetailExpenses(facts.expenses, { price: Number(own.price), currency: own.currency }, usdUyu) : null;
    if (expenses) {
      const result = await listings().updateOne(
        { key: target.key },
        { $set: { "offers.$[o].commonExpenses": expenses.commonExpenses, "offers.$[o].commonExpensesCurrency": expenses.commonExpensesCurrency } },
        { arrayFilters: [{ "o.listingId": target.listingId, "o.commonExpenses": null }] }
      );
      written += result.modifiedCount;
    }
  }
  for (const field of ["bathrooms", "bedrooms"] as const) {
    if (facts[field] === null) continue;
    const result = await listings().updateOne({ key: target.key, [field]: null }, { $set: { [field]: facts[field] } });
    written += result.modifiedCount;
  }
  if (facts.images.length && (await writeOfferGallery(target, facts.images, casaswebPhotoKey))) written++;
  return written;
}

/**
 * The harvest's half: the search card states neither common expenses nor bathrooms, and shows only
 * its cover, so what the advert page stated goes back on the raw advert before it is saved, or every
 * run would blank it. Only empty fields; a "sin gastos comunes" the card's title declared stays.
 * Returns how many adverts it completed.
 */
export async function applyCasaswebDetails(rows: RawRental[], usdUyu: number): Promise<number> {
  const own = rows.filter(row => row.source === "casasweb");
  if (!own.length) return 0;
  const stated = new Map<string, CasaswebRentalDetail>();
  for (let i = 0; i < own.length; i += 5_000) {
    const ids = own.slice(i, i + 5_000).map(row => row.listingId);
    const docs = await details().find({ listingId: { $in: ids }, bathrooms: { $exists: true } }, { projection: { _id: 0 } }).toArray();
    for (const doc of docs) stated.set(String(doc.listingId), doc as unknown as CasaswebRentalDetail);
  }
  let completed = 0;
  for (const row of own) {
    const detail = stated.get(row.listingId);
    if (!detail) continue;
    let changed = false;
    if (row.commonExpenses === null && detail.expenses) {
      const expenses = mlDetailExpenses(detail.expenses, row, usdUyu);
      if (expenses) {
        row.commonExpenses = expenses.commonExpenses;
        row.commonExpensesCurrency = expenses.commonExpensesCurrency;
        changed = true;
      }
    }
    if (row.bathrooms === null && typeof detail.bathrooms === "number") {
      row.bathrooms = detail.bathrooms;
      changed = true;
    }
    if (row.bedrooms === null && typeof detail.bedrooms === "number") {
      row.bedrooms = detail.bedrooms;
      changed = true;
    }
    // The card's cover stays the advert's `image`; the gallery holds the page's other photos.
    if (applyGallery(row, detail.images, casaswebPhotoKey)) changed = true;
    if (changed) completed++;
  }
  return completed;
}
