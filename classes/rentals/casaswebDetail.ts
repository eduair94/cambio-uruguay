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
import * as cheerio from "cheerio";
import { appConnection } from "../appdb";
import { casaswebReference, casaswebTitleNames } from "./casaswebContacts";
import { inUruguay, PIN_SOURCES, type RentalPin } from "./detailPins";
import { mlDetailExpenses } from "./mlDetail";
import { parseCurrency, parseMoney } from "./normalize";
import type { RawRental, RentalCurrency } from "./types";

export const CASASWEB_DETAIL_COLLECTION = PIN_SOURCES.find(row => row.source === "casasweb")!.collection;
/** A listing's pin does not move; a month between reads only catches an agency that corrects it. */
export const CASASWEB_DETAIL_REFRESH_DAYS = 30;

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
  /** Always true for a stored row: failed reads are not stored, so the advert is read again. */
  ok: true;
}

export interface CasaswebPageFacts {
  pin: RentalPin | null;
  expenses: { amount: number; currency: RentalCurrency } | null;
  bathrooms: number | null;
  bedrooms: number | null;
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
}

const HOMES = new Set(["apartamento", "casa"]);

/** Montevideo homes first (where "near" and the map are used most), then homes, freshest first. */
export function prioritizeCasaswebDetailTargets(rows: readonly CasaswebDetailTarget[], budget: number): CasaswebDetailTarget[] {
  const score = (row: CasaswebDetailTarget) => (HOMES.has(row.propertyType) ? 2 : 0) + (row.department === "Montevideo" ? 1 : 0);
  return [...rows]
    .sort((a, b) => score(b) - score(a) || b.lastSeen.localeCompare(a.lastSeen) || a.listingId.localeCompare(b.listingId))
    .slice(0, Math.max(0, budget));
}

const details = () => appConnection().collection(CASASWEB_DETAIL_COLLECTION);
const listings = () => appConnection().collection("rentallistings");

/** Live Casasweb adverts whose page was never read, read before its data list was kept, or a month ago. */
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
  const read = new Set<string>();
  for (let i = 0; i < targets.length; i += 5_000) {
    const ids = targets.slice(i, i + 5_000).map(target => target.listingId);
    const docs = await details()
      .find({ listingId: { $in: ids }, ok: true, readAt: { $gte: fresh }, bathrooms: { $exists: true } }, { projection: { listingId: 1 } })
      .toArray();
    for (const doc of docs) read.add(String(doc.listingId));
  }
  return prioritizeCasaswebDetailTargets(targets.filter(target => !read.has(target.listingId)), budget);
}

export async function saveCasaswebDetails(rows: readonly CasaswebRentalDetail[]): Promise<void> {
  if (!rows.length) return;
  await details().createIndex({ listingId: 1 }, { unique: true });
  await details().bulkWrite(
    rows.map(row => ({ updateOne: { filter: { listingId: row.listingId }, update: { $set: row }, upsert: true } })),
    { ordered: false }
  );
}

/**
 * Completes the stored property right away — only EMPTY fields: the advert's common expenses (when
 * plausible against its rent), the property's bathrooms and bedrooms. The harvest keeps them.
 */
export async function writeCasaswebFacts(
  target: Pick<CasaswebDetailTarget, "key" | "listingId">,
  facts: Pick<CasaswebPageFacts, "expenses" | "bathrooms" | "bedrooms">,
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
  return written;
}

/**
 * The harvest's half: the search card states neither common expenses nor bathrooms, so what the
 * advert page stated goes back on the raw advert before it is saved, or every run would blank it.
 * Only empty fields; a "sin gastos comunes" the card's title declared stays. Returns how many
 * adverts it completed.
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
    if (changed) completed++;
  }
  return completed;
}
