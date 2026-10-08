// "Bajó de precio" for the rental directory: which properties have an advert whose asking price went
// DOWN in the last 30 days and still asks the lowered price.
//
// It reads the series every harvest already writes (`marketpricelogs`, see
// classes/pricehistory/marketLog.ts) through the same normalisation /cambios-de-precio-uruguay uses
// (`seriesFromMarketLog`: only the tail in the current currency, and no "change" out of a loading
// error), and writes the result on the property as `priceDrop`, the way currency-property-zones writes
// `officialZone`: the rentals store `$set`s its own fields and never unsets this one. Filtering needs a
// stored field — a lookup into 77.000 series per visit is job work, not page work.
import { appConnection } from "../appdb";
import { MARKET_LOG_COLLECTION } from "../marketseries/store";
import { marketAdvertId } from "../pricehistory/marketLog";
import { seriesFromMarketLog } from "../pricehistory/normalize";

export const RENTAL_PRICE_DROP_DAYS = 30;
export const RENTAL_PRICE_DROP_MIN_PCT = 1;

export interface RentalPriceDrop {
  /** The advert that dropped: the page only shows the drop while that advert is among the shown. */
  listingId: string;
  from: number;
  to: number;
  currency: "UYU" | "USD";
  /** Day of the drop (YYYY-MM-DD). */
  at: string;
  /** Percentage, one decimal. */
  pct: number;
}

interface DropOffer {
  source: string;
  listingId: string;
  price: number;
  currency: string;
}

const shiftDay = (day: string, days: number): string =>
  new Date(Date.parse(`${day}T00:00:00.000Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** PURE. The largest drop among the property's adverts, keyed by `marketAdvertId`. */
export function rentalPriceDrop(
  offers: readonly DropOffer[],
  logs: ReadonlyMap<string, Record<string, unknown>>,
  today: string,
  windowDays = RENTAL_PRICE_DROP_DAYS
): RentalPriceDrop | null {
  const since = shiftDay(today, -windowDays);
  let best: RentalPriceDrop | null = null;
  for (const offer of offers) {
    const advertId = marketAdvertId(offer.source, offer.listingId);
    const doc = advertId ? logs.get(advertId) : undefined;
    const series = doc ? seriesFromMarketLog(doc) : null;
    const change = series?.lastChange;
    if (!series || !change || !(change.to < change.from) || change.at < since || change.at > today) continue;
    // Only while the advert still asks the lowered price, in the same currency: a price that moved
    // again since the series was read is not the one the card will show.
    const last = series.points[series.points.length - 1];
    if (series.currency !== offer.currency || last?.p !== offer.price || change.to !== offer.price) continue;
    const pct = Math.round(((change.from - change.to) / change.from) * 1000) / 10;
    // A retouch under 1 % is not news, and the card rounds it to "Bajó 0 %".
    if (pct < RENTAL_PRICE_DROP_MIN_PCT) continue;
    if (!best || pct > best.pct) {
      best = { listingId: offer.listingId, from: change.from, to: change.to, currency: series.currency, at: change.at, pct };
    }
  }
  return best;
}

const BATCH = 1_000;

/**
 * Recomputes `priceDrop` for the properties of this harvest, after their price points were logged.
 * Writes only what changed. Properties the run did not see keep theirs: the directory also filters
 * by the drop's date, so one that stops being recent stops counting even before the next full run.
 */
export async function refreshRentalPriceDrops(
  properties: readonly { key: string; offers?: readonly DropOffer[] }[],
  today: string
): Promise<{ drops: number; written: number }> {
  const db = appConnection();
  const logsCollection = db.collection(MARKET_LOG_COLLECTION);
  const listings = db.collection("rentallistings");
  let drops = 0;
  let written = 0;
  for (let i = 0; i < properties.length; i += BATCH) {
    const batch = properties.slice(i, i + BATCH);
    const advertIds = [
      ...new Set(
        batch.flatMap((property) =>
          (property.offers ?? []).map((offer) => marketAdvertId(offer.source, offer.listingId)).filter((id): id is string => Boolean(id))
        )
      ),
    ];
    const [logRows, current] = await Promise.all([
      logsCollection
        .find({ key: { $in: advertIds.map((id) => `alquiler:${id}`) } }, { projection: { _id: 0, vertical: 1, advertId: 1, firstSeen: 1, lastSeen: 1, points: 1 } })
        .toArray(),
      listings
        .find({ key: { $in: batch.map((property) => property.key) }, priceDrop: { $exists: true } }, { projection: { _id: 0, key: 1, priceDrop: 1 } })
        .toArray(),
    ]);
    const logs = new Map(logRows.map((row) => [String(row.advertId), row as Record<string, unknown>]));
    const stored = new Map(current.map((row) => [String(row.key), row.priceDrop ?? null]));
    const operations: any[] = [];
    for (const property of batch) {
      const drop = rentalPriceDrop(property.offers ?? [], logs, today);
      if (drop) drops++;
      const before = stored.has(property.key) ? stored.get(property.key) : undefined;
      if (JSON.stringify(before ?? null) === JSON.stringify(drop)) continue;
      operations.push({
        updateOne: { filter: { key: property.key }, update: drop ? { $set: { priceDrop: drop } } : { $unset: { priceDrop: "" } } },
      });
    }
    if (operations.length) {
      await listings.bulkWrite(operations, { ordered: false });
      written += operations.length;
    }
  }
  return { drops, written };
}
