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
// deduplicación (`applyMlPins`), para no cambiar qué aviso es el canónico de un grupo.
import { appConnection } from "../appdb";
import { parseCurrency, parseMoney } from "./normalize";
import type { RawRental, RentalCurrency, RentalProperty } from "./types";

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
  /** Always true for a stored row: failed reads are not stored, so the advert is read again. */
  ok: boolean;
}

const STRING = '"((?:[^"\\\\]|\\\\.)*)"';

/**
 * The "Gastos comunes" row of the item's spec table. `undefined` = not an item page we can read
 * (an error page, a challenge): nothing is concluded. `null` = an item page that states nothing usable.
 */
export function parseMlRentalExpenses(html: string): { amount: number; currency: RentalCurrency } | null | undefined {
  const table = /<div class="andes-table__header__container">Gastos comunes<\/div><\/th><td[^>]*>\s*<span[^>]*class="andes-table__column--value"[^>]*>([^<]*)<\/span>/.exec(html);
  const json = table ? null : new RegExp(`\\{"id":"Gastos comunes","text":${STRING}\\}`).exec(html);
  const raw = table?.[1] ?? (json ? JSON.parse(`"${json[1]}"`) : null);
  if (raw === null) return /andes-table|ui-pdp-/.test(html) ? null : undefined;
  const amount = parseMoney(String(raw));
  const currency = parseCurrency(String(raw));
  return amount && amount > 0 && currency ? { amount, currency } : null;
}

export interface MlRentalPin {
  latitude: number;
  longitude: number;
}

// The rectangle around Uruguay also holds Buenos Aires; south of -34.3 the Uruguayan coast ends at
// Colonia del Sacramento (-57.85), and anything further west is across the river.
const inUruguay = (lat: number, lng: number): boolean =>
  lat >= -35.1 && lat <= -30 && lng >= -58.6 && lng <= -53 && (lat > -34.3 || lng >= -58);
/** Montevideo's department, with a margin: a pin outside it cannot be a Montevideo advert. */
const inMontevideo = (lat: number, lng: number): boolean => lat >= -34.96 && lat <= -34.69 && lng >= -56.45 && lng <= -56.0;

/**
 * The pin of the item page's own map. The page served to our (honest) UA has no interactive map,
 * only its static image, `<img data-testid="static-map" src="…staticmap?…&center=-34.88…%2C-56.17…">`;
 * a browser also gets `"map_info":{…,"location":{"latitude":"-34.88…",…}}`, with the same point
 * (both read on MLU-701446219, 2026-10-08). Never the page's `geo_information`, which is the
 * centroid of Uruguay on every page.
 */
export function parseMlRentalPin(html: string): MlRentalPin | null {
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

/** Whether a pin may locate a property of that department: Montevideo's must fall inside it. */
export function mlPinFits(pin: MlRentalPin, department: string): boolean {
  if (!inUruguay(pin.latitude, pin.longitude)) return false;
  return department !== "Montevideo" || inMontevideo(pin.latitude, pin.longitude);
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
}

const HOMES = new Set(["apartamento", "casa"]);

/** Montevideo homes first (where the total decides most searches), then homes, freshest first. */
export function prioritizeMlDetailTargets(rows: readonly MlDetailTarget[], budget: number): MlDetailTarget[] {
  const score = (row: MlDetailTarget) => (HOMES.has(row.propertyType) ? 2 : 0) + (row.department === "Montevideo" ? 1 : 0);
  return [...rows]
    .sort((a, b) => score(b) - score(a) || b.lastSeen.localeCompare(a.lastSeen) || a.listingId.localeCompare(b.listingId))
    .slice(0, Math.max(0, budget));
}

const details = () => appConnection().collection(ML_DETAIL_COLLECTION);
const listings = () => appConnection().collection("rentallistings");

/** Live Mercado Libre adverts whose item page was never read, or read more than a month ago. */
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
  const read = new Set<string>();
  for (let i = 0; i < targets.length; i += 5_000) {
    const ids = targets.slice(i, i + 5_000).map(target => target.listingId);
    // A row without the pin field predates it: read once more so the map gets it too.
    const docs = await details()
      .find({ listingId: { $in: ids }, ok: true, readAt: { $gte: fresh }, latitude: { $exists: true } }, { projection: { listingId: 1 } })
      .toArray();
    for (const doc of docs) read.add(String(doc.listingId));
  }
  return prioritizeMlDetailTargets(targets.filter(target => !read.has(target.listingId)), budget);
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
 * The harvest's half: the search card arrives again without common expenses every hour, so what an
 * item page already stated is put back before the property is saved. Returns how many it filled.
 */
export async function applyMlDetails(rows: RawRental[], usdUyu: number): Promise<number> {
  const own = rows.filter(row => row.source === "mercadolibre" && row.commonExpenses === null);
  if (!own.length) return 0;
  const stated = new Map<string, MlRentalDetail>();
  for (let i = 0; i < own.length; i += 5_000) {
    const ids = own.slice(i, i + 5_000).map(row => row.listingId);
    const docs = await details().find({ listingId: { $in: ids }, amount: { $gt: 0 } }, { projection: { _id: 0 } }).toArray();
    for (const doc of docs) stated.set(String(doc.listingId), doc as unknown as MlRentalDetail);
  }
  let filled = 0;
  for (const row of own) {
    const detail = stated.get(row.listingId);
    if (!detail?.amount || !detail.currency) continue;
    const expenses = mlDetailExpenses({ amount: detail.amount, currency: detail.currency }, row, usdUyu);
    if (!expenses) continue;
    row.commonExpenses = expenses.commonExpenses;
    row.commonExpensesCurrency = expenses.commonExpensesCurrency;
    filled++;
  }
  return filled;
}

/**
 * Puts a pin on the stored property right away — only when its coordinate is empty, so a point
 * another portal published (InfoCasas, El País) is never moved. The harvest keeps it (`applyMlPins`).
 */
export async function writeMlDetailPin(target: Pick<MlDetailTarget, "key" | "department">, pin: MlRentalPin): Promise<boolean> {
  if (!mlPinFits(pin, target.department)) return false;
  const result = await listings().updateOne(
    { key: target.key, latitude: null },
    { $set: { latitude: pin.latitude, longitude: pin.longitude } }
  );
  return result.modifiedCount > 0;
}

/**
 * The pin of a property without a coordinate, from its Mercado Libre adverts' item pages. With
 * several ML adverts (the dedupe found them to be one unit) the lowest listing id decides, so the
 * point does not hop between runs.
 */
export function mlPinFor(
  property: Pick<RentalProperty, "department" | "latitude" | "offers">,
  pins: ReadonlyMap<string, MlRentalPin>
): MlRentalPin | null {
  if (typeof property.latitude === "number") return null;
  const ids = property.offers
    .filter(offer => offer.source === "mercadolibre" && pins.has(offer.listingId))
    .map(offer => offer.listingId)
    .sort();
  for (const id of ids) {
    const pin = pins.get(id)!;
    if (mlPinFits(pin, property.department)) return pin;
  }
  return null;
}

/**
 * The harvest's half for the pin: properties are rebuilt from the search cards every hour, and the
 * card has no coordinate, so without this the save would blank what the item page gave. Runs after
 * the dedupe. Returns how many properties it located.
 */
export async function applyMlPins(properties: RentalProperty[]): Promise<number> {
  const ids = [
    ...new Set(
      properties
        .filter(property => typeof property.latitude !== "number")
        .flatMap(property => property.offers.filter(offer => offer.source === "mercadolibre").map(offer => offer.listingId))
    ),
  ];
  if (!ids.length) return 0;
  const pins = new Map<string, MlRentalPin>();
  for (let i = 0; i < ids.length; i += 5_000) {
    const docs = await details()
      .find(
        { listingId: { $in: ids.slice(i, i + 5_000) }, latitude: { $type: "number" }, longitude: { $type: "number" } },
        { projection: { _id: 0, listingId: 1, latitude: 1, longitude: 1 } }
      )
      .toArray();
    for (const doc of docs) pins.set(String(doc.listingId), { latitude: Number(doc.latitude), longitude: Number(doc.longitude) });
  }
  let located = 0;
  for (const property of properties) {
    const pin = mlPinFor(property, pins);
    if (!pin) continue;
    property.latitude = pin.latitude;
    property.longitude = pin.longitude;
    located++;
  }
  return located;
}
