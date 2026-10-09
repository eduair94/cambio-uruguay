// Gastos comunes de los avisos de Mercado Libre del directorio de alquileres.
//
// La tarjeta de búsqueda de ML no los trae (sources/mercadolibre.ts), así que los 29.821 avisos de
// ML vigentes el 2026-10-08 —la mitad del directorio— no tenían total mensual: "Menor total
// mensual", el tope del total y el de gastos comunes los dejaban afuera a todos. La ficha propia sí
// los publica, en su tabla de especificaciones ("Gastos comunes | 19.500 UYU"). Muestra de 20
// fichas el 2026-10-08: 16 con la fila, 5 de ellas en "0 UYU". Un cero es lo que el formulario de
// ML guarda cuando nadie escribe nada, así que NO se toma como "sin gastos comunes": la misma regla
// que ventas, donde un cero sólo vale con texto propio expreso.
//
// Lo escribe `sync_rentals_ml_detail.ts` (pm2 `currency-rentals-ml-detail`) y lo reaplica la
// cosecha (`harvestMercadoLibre`) cada vez que vuelve a ver el aviso, porque la tarjeta sigue
// llegando sin el dato y lo pisaría. Sólo completa un campo VACÍO del mismo aviso.
//
// La misma lectura trae el PIN del mapa de la ficha (`map_info.location`), y es lo único que pone a
// los avisos de ML en el mapa: el 2026-10-08 eran 28.899 propiedades vigentes con 0 % de coordenadas
// (InfoCasas 50 %, El País 100 %), así que "cerca de", la distancia y las zonas por punto no las
// veían. Antes de usarlo se midió, porque el pin de Marketplace resultó ser una grilla de ~1 km y
// no el inmueble: contra 38 direcciones con número geocodificadas por Google (ROOFTOP o
// interpolada), mediana 0 m, p75 27 m, p90 161 m — los lejanos son números redondeados por el
// vendedor ("Andes 1200"); y 40 avisos SIN dirección dieron 39 pines distintos, o sea que no cae al
// centroide del barrio. El "APPROXIMATE" de la página es el centroide del PAÍS (`geo_information`),
// no el del aviso. Se publica en la propiedad sólo si su coordenada está vacía, después de la
// deduplicación (`applyDetailPins`, detailPins.ts), para no cambiar qué aviso es el canónico.
//
// Y las FOTOS (2026-10-09): los avisos de ML tenían sólo la portada de la tarjeta. La ficha que ML le
// sirve a nuestra UA declarada es la versión estática para bots (`"isBot":true,"staticMarkup":true`)
// con un mosaico de CINCO fotos ("Imagen 1 de 11" … "Imagen 5 de 11"; en 3 fichas medidas: 5 de 11,
// 5 de 13 y 5 de 29). La lista entera sólo está en el estado que se hidrata en un navegador, en la
// versión móvil —que no trae la tabla de especificaciones, o sea ni gastos comunes ni dormitorios— y
// en la API de ítems, que contesta 403 sin OAuth. Pedir también la móvil duplicaría los pedidos, así
// que se guardan las que lista la misma lectura, a tamaño completo; la portada y la escritura en el
// aviso, en `detailImages.ts`.
import * as cheerio from "cheerio";
import { appConnection } from "../appdb";
import { applyGallery, writeOfferGallery } from "./detailImages";
import { inUruguay, type RentalPin } from "./detailPins";
import { rentalImages } from "./details";
import { parseCurrency, parseMoney } from "./normalize";
import type { RawRental, RentalCurrency } from "./types";

export const ML_DETAIL_COLLECTION = "rentalmldetails";
/** Common expenses move with the building's budget, not every week: one read a month is enough. */
export const ML_DETAIL_REFRESH_DAYS = 30;

export interface MlRentalDetail {
  listingId: string;
  readAt: string;
  /** What the spec table stated; null = not stated (absent, zero or unreadable as a number). */
  amount: number | null;
  currency: RentalCurrency | null;
  /**
   * The item page's map pin; null = the page has none usable. Absent on rows read before the pin
   * was kept (2026-10-08): those are read again once (see `mlDetailTargets`).
   */
  latitude?: number | null;
  longitude?: number | null;
  /**
   * The spec table's "Dormitorios"; null = not stated. The card's attribute strip leaves it out for
   * some adverts: on 2026-10-08, 531 ML homes had no bedrooms without being a monoambiente, and 10 of
   * 12 sampled pages stated them. Absent on rows read before it was kept.
   */
  bedrooms?: number | null;
  /**
   * The photos the page lists, full size and in its order; empty = none usable. Absent on rows read
   * before photos were kept (2026-10-09): those are read again once (see `mlDetailTargets`).
   */
  images?: string[];
  /** Always true for a stored row: failed reads are not stored, so the advert is read again. */
  ok: boolean;
}

const STRING = '"((?:[^"\\\\]|\\\\.)*)"';

/** The value of one row of the item's spec table, as rendered or in the page's JSON; null if absent. */
function specRow(html: string, label: string): string | null {
  const table = new RegExp(
    `<div class="andes-table__header__container">${label}</div></th><td[^>]*>\\s*<span[^>]*class="andes-table__column--value"[^>]*>([^<]*)</span>`
  ).exec(html);
  if (table) return table[1]!;
  const json = new RegExp(`\\{"id":"${label}","text":${STRING}\\}`).exec(html);
  return json ? String(JSON.parse(`"${json[1]}"`)) : null;
}

/** The spec table's "Dormitorios", 0 to 10; anything else is not a count of bedrooms. */
export function parseMlRentalBedrooms(html: string): number | null {
  const raw = specRow(html, "Dormitorios");
  if (raw === null || !/^\s*\d{1,2}\s*$/.test(raw)) return null;
  const value = Number(raw);
  return value <= 10 ? value : null;
}

/**
 * The "Gastos comunes" row of the item's spec table. `undefined` = not an item page we can read
 * (an error page, a challenge): nothing is concluded. `null` = an item page that states nothing usable.
 */
export function parseMlRentalExpenses(html: string): { amount: number; currency: RentalCurrency } | null | undefined {
  const raw = specRow(html, "Gastos comunes");
  if (raw === null) return /andes-table|ui-pdp-/.test(html) ? null : undefined;
  const amount = parseMoney(String(raw));
  const currency = parseCurrency(String(raw));
  return amount && amount > 0 && currency ? { amount, currency } : null;
}

/**
 * The pin of the item page's own map. The page served to our (honest) UA has no interactive map,
 * only its static image, `<img data-testid="static-map" src="…staticmap?…&center=-34.88…%2C-56.17…">`;
 * a browser also gets `"map_info":{…,"location":{"latitude":"-34.88…",…}}`, with the same point
 * (both read on MLU-701446219, 2026-10-08). Never the page's `geo_information`, which is the
 * centroid of Uruguay on every page.
 */
export function parseMlRentalPin(html: string): RentalPin | null {
  const match =
    /data-testid="static-map"[^>]*?\ssrc="[^"]*?[?&;]center=(-?\d{1,2}\.\d+)(?:%2C|,)(-?\d{1,2}\.\d+)/.exec(html) ??
    /"map_info":\{.{0,200}?"location":\{"latitude":"?(-?\d{1,2}\.\d+)"?,"longitude":"?(-?\d{1,2}\.\d+)"?\}/s.exec(html);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!inUruguay(latitude, longitude)) return null;
  // The country centroid, should a page ever put it on the map too.
  if (Math.abs(latitude + 32.522778) < 1e-4 && Math.abs(longitude + 55.765835) < 1e-4) return null;
  return { latitude, longitude };
}

const PICTURE = /^https:\/\/http2\.mlstatic\.com\/D_N?Q_NP_(?:2X_)?(\d{3,9}-ML[A-Z]\d{6,15}_\d{4,8})-[A-Z]{1,2}(?:-null)?\.(?:webp|jpe?g|png)$/i;

/** The picture id behind any size of a photo: the card's `…_2X_<id>-C.webp` and the page's `…<id>-F.webp`. */
export function mlPictureId(url: string): string | null {
  return PICTURE.exec(url.trim())?.[1] ?? null;
}

/** One photo, one key, whatever size the URL asks for. */
export const mlPhotoKey = (url: string): string => mlPictureId(url) ?? url;

/** The full-size photo: 1200 px, the same bytes as the `-F-null.webp` the mosaic shows (`-O` is 500 px). */
export const mlPictureUrl = (id: string): string => `https://http2.mlstatic.com/D_NQ_NP_${id}-F.webp`;

/**
 * The advert's own photos, in the page's order and full size; null = the page lists none usable.
 *
 * Each gallery item is labelled "Imagen k de N": the mosaic of the page served to our UA (a
 * `<figure aria-label>` around `<img src="…-F-null.webp">`, five of N) and the carousel of the
 * mobile layout (`<a href="…-O.jpg" aria-label>`, all N). Anything not on ML's image host, or not
 * labelled as a photo of this gallery (the video slide, a banner, the seller's logo), is not taken.
 */
export function parseMlRentalImages(html: string): string[] | null {
  const $ = cheerio.load(html);
  const byPosition = new Map<number, string>();
  $("[aria-label]").each((_, node) => {
    const label = /^Imagen (\d{1,3}) de \d{1,3}\b/.exec($(node).attr("aria-label") ?? "");
    if (!label) return;
    const item = $(node);
    const urls = [item.attr("href"), item.attr("src"), ...item.find("img").toArray().map(img => $(img).attr("src"))];
    const id = urls.map(url => (url ? mlPictureId(url) : null)).find((value): value is string => !!value);
    const position = Number(label[1]);
    if (id && !byPosition.has(position)) byPosition.set(position, id);
  });
  const ids = [...byPosition.entries()].sort((a, b) => a[0] - b[0]).map(([, id]) => id);
  const images = rentalImages([...new Set(ids)].map(mlPictureUrl));
  return images.length ? images : null;
}

/**
 * Whether a stated amount may complete the advert: positive, at least $ 200 a month and not above
 * the rent itself. A typo with a zero too many, or the yearly figure, is larger than the rent; a
 * dollar amount needs the rate to be compared at all.
 */
export function mlDetailExpenses(
  stated: { amount: number; currency: RentalCurrency },
  offer: { price: number; currency: RentalCurrency },
  usdUyu: number
): { commonExpenses: number; commonExpensesCurrency: RentalCurrency } | null {
  const toUyu = (amount: number, currency: RentalCurrency) => (currency === "USD" ? (usdUyu > 0 ? amount * usdUyu : NaN) : amount);
  const expensesUyu = toUyu(stated.amount, stated.currency);
  const rentUyu = toUyu(offer.price, offer.currency);
  if (!(expensesUyu >= 200) || !(rentUyu > 0) || expensesUyu > rentUyu) return null;
  return { commonExpenses: stated.amount, commonExpensesCurrency: stated.currency };
}

export interface MlDetailTarget {
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
 * Adverts never read first: a re-read only refreshes, a first read is the advert's only total, pin
 * and photos. Then Montevideo homes (where the total decides most searches), then homes, freshest first.
 */
export function prioritizeMlDetailTargets(rows: readonly MlDetailTarget[], budget: number): MlDetailTarget[] {
  const score = (row: MlDetailTarget) => (HOMES.has(row.propertyType) ? 2 : 0) + (row.department === "Montevideo" ? 1 : 0);
  return [...rows]
    .sort((a, b) =>
      Number(a.reread === true) - Number(b.reread === true) ||
      score(b) - score(a) || b.lastSeen.localeCompare(a.lastSeen) || a.listingId.localeCompare(b.listingId))
    .slice(0, Math.max(0, budget));
}

/**
 * A stored read that needs no other: successful, under a month old and with every field this job
 * keeps. A row without the pin (kept since 2026-10-08) or the photos (since 2026-10-09) predates
 * them and is read once more.
 */
export function mlDetailIsCurrent(row: Record<string, unknown>, freshFrom: string): boolean {
  return row.ok === true && String(row.readAt ?? "") >= freshFrom && row.latitude !== undefined && row.images !== undefined;
}

const details = () => appConnection().collection(ML_DETAIL_COLLECTION);
const listings = () => appConnection().collection("rentallistings");

/** Live Mercado Libre adverts whose item page was never read, read before a field was kept, or a month ago. */
export async function mlDetailTargets(now: Date, budget: number, days = 10): Promise<MlDetailTarget[]> {
  const cutoff = new Date(now.getTime() - days * 86_400_000).toISOString().slice(0, 10);
  const rows = await listings()
    .find(
      { offers: { $elemMatch: { source: "mercadolibre", lastSeen: { $gte: cutoff } } } },
      { projection: { key: 1, department: 1, propertyType: 1, "offers.source": 1, "offers.listingId": 1, "offers.url": 1, "offers.lastSeen": 1 } }
    )
    .toArray();
  const targets: MlDetailTarget[] = [];
  for (const row of rows) {
    for (const offer of Array.isArray(row.offers) ? row.offers : []) {
      if (offer?.source !== "mercadolibre" || typeof offer.listingId !== "string" || String(offer.lastSeen || "") < cutoff) continue;
      if (!/^https:\/\/[a-z]+\.mercadolibre\.com\.uy\/MLU-\d+/.test(String(offer.url || ""))) continue;
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
  const fresh = new Date(now.getTime() - ML_DETAIL_REFRESH_DAYS * 86_400_000).toISOString();
  const current = new Set<string>();
  const readBefore = new Set<string>();
  for (let i = 0; i < targets.length; i += 5_000) {
    const ids = targets.slice(i, i + 5_000).map(target => target.listingId);
    const docs = await details()
      .find({ listingId: { $in: ids } }, { projection: { listingId: 1, ok: 1, readAt: 1, latitude: 1, images: 1 } })
      .toArray();
    for (const doc of docs) (mlDetailIsCurrent(doc, fresh) ? current : readBefore).add(String(doc.listingId));
  }
  const pending = targets
    .filter(target => !current.has(target.listingId))
    .map(target => (readBefore.has(target.listingId) ? { ...target, reread: true } : target));
  return prioritizeMlDetailTargets(pending, budget);
}

export async function saveMlDetails(rows: readonly MlRentalDetail[]): Promise<void> {
  if (!rows.length) return;
  await details().createIndex({ listingId: 1 }, { unique: true });
  await details().bulkWrite(
    rows.map(row => ({ updateOne: { filter: { listingId: row.listingId }, update: { $set: row }, upsert: true } })),
    { ordered: false }
  );
}

/**
 * Completes the stored offer — only its empty `commonExpenses` — with what its own page stated.
 * Nothing else on the property moves: no date is renewed and no other advert is touched.
 */
export async function writeMlDetailExpenses(
  target: Pick<MlDetailTarget, "key" | "listingId">,
  expenses: { commonExpenses: number; commonExpensesCurrency: RentalCurrency }
): Promise<boolean> {
  const result = await listings().updateOne(
    { key: target.key },
    { $set: { "offers.$[o].commonExpenses": expenses.commonExpenses, "offers.$[o].commonExpensesCurrency": expenses.commonExpensesCurrency } },
    { arrayFilters: [{ "o.listingId": target.listingId, "o.commonExpenses": null }] }
  );
  return result.modifiedCount > 0;
}

/**
 * The harvest's half: the search card arrives again without common expenses, bedrooms or photos
 * every hour, so what an item page already stated is put back before the property is saved.
 * Returns how many adverts it filled, per field.
 */
export async function applyMlDetails(rows: RawRental[], usdUyu: number): Promise<{ expenses: number; bedrooms: number; images: number }> {
  const filled = { expenses: 0, bedrooms: 0, images: 0 };
  const own = rows.filter(row => row.source === "mercadolibre");
  if (!own.length) return filled;
  const stated = new Map<string, MlRentalDetail>();
  for (let i = 0; i < own.length; i += 5_000) {
    const ids = own.slice(i, i + 5_000).map(row => row.listingId);
    const docs = await details()
      .find(
        { listingId: { $in: ids }, $or: [{ amount: { $gt: 0 } }, { bedrooms: { $type: "number" } }, { "images.0": { $exists: true } }] },
        { projection: { _id: 0 } }
      )
      .toArray();
    for (const doc of docs) stated.set(String(doc.listingId), doc as unknown as MlRentalDetail);
  }
  for (const row of own) {
    const detail = stated.get(row.listingId);
    if (!detail) continue;
    if (row.commonExpenses === null && detail.amount && detail.currency) {
      const expenses = mlDetailExpenses({ amount: detail.amount, currency: detail.currency }, row, usdUyu);
      if (expenses) {
        row.commonExpenses = expenses.commonExpenses;
        row.commonExpensesCurrency = expenses.commonExpensesCurrency;
        filled.expenses++;
      }
    }
    // Only a home: a "Dormitorios" row on an office or a shop is the form's leftover, not a unit.
    if (row.bedrooms === null && typeof detail.bedrooms === "number" && (row.propertyType === "apartamento" || row.propertyType === "casa")) {
      row.bedrooms = detail.bedrooms;
      filled.bedrooms++;
    }
    // The card's cover stays the advert's `image`; the gallery holds the page's other photos.
    if (applyGallery(row, detail.images, mlPhotoKey)) filled.images++;
  }
  return filled;
}

/** The property's empty bedrooms, right away; the harvest keeps them (`applyMlDetails`). */
export async function writeMlDetailBedrooms(target: Pick<MlDetailTarget, "key" | "propertyType">, bedrooms: number): Promise<boolean> {
  if (target.propertyType !== "apartamento" && target.propertyType !== "casa") return false;
  const result = await listings().updateOne({ key: target.key, bedrooms: null }, { $set: { bedrooms } });
  return result.modifiedCount > 0;
}

/** The advert's photos, right away, when they are more than it shows; the harvest keeps them. */
export async function writeMlDetailImages(target: Pick<MlDetailTarget, "key" | "listingId">, images: readonly string[]): Promise<boolean> {
  return writeOfferGallery(target, images, mlPhotoKey);
}
