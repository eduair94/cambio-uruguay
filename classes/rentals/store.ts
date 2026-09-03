// Reading and writing the rental directory in the APP database.
//
// The one non-obvious rule lives in `mergeOffers`: a property row is the UNION of what every portal
// publishes, and a run only ever sees the portals that answered. So a fresh harvest replaces the
// offers of the sources that ran, keeps the offers of a source that was down, and forgets an offer
// only once the portal that published it has been up for `staleOfferDays` without showing it
// again. Without that rule an hourly "fast" run — which reads only today's adverts — would wipe
// every other portal's rows off every property it touched.
import { RentalListingModel } from "../models/RentalListing";
import { RentalMetaModel } from "../models/RentalMeta";
import { freshnessOf } from "./dedupe";
import { RENTAL_META_KEY, type RentalMeta, type RentalOffer, type RentalProperty, type RentalSource } from "./types";

const CHUNK = 400;

export interface RentalHistory {
  offerFirstSeen: Map<string, string>;
  propertyFirstSeen: Map<string, string>;
  /** `listingId -> property key`: how a property keeps its identity across runs (see dedupe.ts). */
  offerToProperty: Map<string, string>;
}

/**
 * What the previous runs knew: the day each advert and each property was first seen. Losing it
 * would reset every "publicado hace N días" on the site to today.
 */
export async function loadRentalHistory(): Promise<RentalHistory> {
  const rows = (await RentalListingModel.find({})
    .select({ key: 1, firstSeen: 1, "offers.listingId": 1, "offers.firstSeen": 1 })
    .lean()) as unknown as Array<{
    key: string;
    firstSeen: string;
    offers?: Array<{ listingId: string; firstSeen: string }>;
  }>;

  const offerFirstSeen = new Map<string, string>();
  const propertyFirstSeen = new Map<string, string>();
  const offerToProperty = new Map<string, string>();
  for (const row of rows) {
    if (row.key && row.firstSeen) propertyFirstSeen.set(row.key, row.firstSeen);
    for (const offer of row.offers || []) {
      if (!offer?.listingId) continue;
      if (offer.firstSeen) offerFirstSeen.set(offer.listingId, offer.firstSeen);
      if (row.key) offerToProperty.set(offer.listingId, row.key);
    }
  }
  return { offerFirstSeen, propertyFirstSeen, offerToProperty };
}

export interface SaveContext {
  today: string;
  /** Sources that actually answered this run. A source that did not is never pruned. */
  okSources: Set<RentalSource>;
  /** How long an advert may go unseen (by a HEALTHY portal) before it is dropped. */
  staleOfferDays: number;
}

const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/**
 * Union of stored and fresh offers. Fresh always wins for the same advert; a stored advert survives
 * if its portal was down this run, or if a healthy portal simply has not re-shown it yet.
 */
/**
 * Cuánto puede separarse el precio de dos avisos que decimos que son la misma propiedad.
 *
 * Es la tolerancia más floja que admite `sameUnit` (0,93 en la rama con calle). Se aplica también
 * acá porque la unión, una vez hecha, sobrevivía a su propia regla: `mergeOffers` conservaba un
 * aviso guardado mientras su portal hubiera corrido y no estuviera vencido por días, sin volver a
 * preguntarse si seguía siendo la misma propiedad. Auditado el 2026-09-03 sobre los 3.503 merges
 * vivos: 378 tenían ofertas con más de 5 % de diferencia y 104 más de 8 %, con casos de 21.000
 * contra 41.000 pesos en la misma fila — dos alquileres distintos presentados como uno.
 */
const OFFER_PRICE_TOLERANCE = 0.93;

export function mergeOffers(
  stored: RentalOffer[],
  fresh: RentalOffer[],
  context: SaveContext
): RentalOffer[] {
  const byId = new Map<string, RentalOffer>();
  for (const offer of stored) {
    const sourceRan = context.okSources.has(offer.source);
    const age = daysBetween(offer.lastSeen || context.today, context.today);
    if (sourceRan && age > context.staleOfferDays) continue;
    byId.set(offer.listingId, offer);
  }
  for (const offer of fresh) byId.set(offer.listingId, offer);

  const all = [...byId.values()].sort((a, b) => a.priceUyu - b.priceUyu);
  if (all.length < 2) return all;

  const priced = all.filter((offer) => offer.priceUyu > 0);
  if (priced.length < 2) return all;

  // De quién es el precio que manda.
  //
  // Si la corrida de hoy trajo avisos, mandan ellos: `buildRentalProperties` los volvió a comparar
  // con `sameUnit` hace un instante, así que son coherentes entre sí por construcción. Lo guardado
  // es lo que hay que volver a ganarse.
  //
  // Si hoy no vino ninguno —pasa en cada corrida rápida, que sólo mira lo recién publicado— hay
  // que decidir entre los guardados sin árbitro. Ahí gana el grupo MÁS GRANDE, no el más barato:
  // con [21.000, 41.000, 41.000] el barato es el raro, y anclar al mínimo tiraría los dos avisos
  // que coinciden para quedarse con el único que no coincide con nadie.
  const anchor = fresh.length
    ? Math.min(...fresh.filter((offer) => offer.priceUyu > 0).map((offer) => offer.priceUyu))
    : largestCoherentAnchor(priced);
  if (!Number.isFinite(anchor) || anchor <= 0) return all;

  const freshIds = new Set(fresh.map((offer) => offer.listingId));
  return all.filter((offer) => {
    if (freshIds.has(offer.listingId)) return true;
    // Sin precio no hay con qué contradecir; el precio es la única señal que sobrevive en la oferta.
    if (offer.priceUyu <= 0) return true;
    return withinTolerance(offer.priceUyu, anchor);
  });
}

function withinTolerance(a: number, b: number): boolean {
  return Math.min(a, b) / Math.max(a, b) >= OFFER_PRICE_TOLERANCE;
}

/** El precio del grupo más numeroso que cae dentro de la tolerancia. Empate: el más barato. */
function largestCoherentAnchor(offers: RentalOffer[]): number {
  let best = offers[0].priceUyu;
  let bestCount = 0;
  for (const candidate of offers) {
    const count = offers.filter((other) => withinTolerance(other.priceUyu, candidate.priceUyu)).length;
    if (count > bestCount || (count === bestCount && candidate.priceUyu < best)) {
      best = candidate.priceUyu;
      bestCount = count;
    }
  }
  return best;
}

/** Re-derives the fields that are a function of the offers, after a merge changed them. */
export function recomputeFromOffers(property: RentalProperty, offers: RentalOffer[]): RentalProperty {
  const cheapest = offers[0]!;
  return {
    ...property,
    offers,
    sources: [...new Set(offers.map((offer) => offer.source))],
    freshAt: freshnessOf(offers, property.firstSeen),
    price: cheapest.price,
    priceUyu: cheapest.priceUyu,
    currency: cheapest.currency,
    firstSeen: [property.firstSeen, ...offers.map((offer) => offer.firstSeen)].filter(Boolean).sort()[0]!,
    lastSeen: offers.map((offer) => offer.lastSeen).sort().slice(-1)[0]!,
  };
}

export async function saveRentalProperties(
  properties: RentalProperty[],
  context: SaveContext
): Promise<{ written: number; emptied: number }> {
  let written = 0;
  let emptied = 0;

  // A qué propiedad pertenece cada aviso SEGÚN LA CORRIDA DE HOY.
  //
  // Hace falta para que una unión que se parte se limpie el mismo día. Cuando el agrupamiento deja
  // de unir dos avisos, uno se lleva la clave vieja y el otro estrena la suya; sin esto el que se
  // fue seguía guardado en la fila vieja hasta vencer por días, así que durante esa ventana el
  // mismo aviso salía en dos propiedades Y la fila vieja seguía publicando el merge que ya
  // dejamos de creer.
  //
  // Sólo habla de los avisos que esta corrida vio: uno que no está en el mapa no se toca, que es lo
  // que hace que esto sea seguro también en la corrida rápida, que ve una franja del mercado.
  const assignedTo = new Map<string, string>();
  for (const property of properties) {
    for (const offer of property.offers) assignedTo.set(offer.listingId, property.key);
  }

  for (let index = 0; index < properties.length; index += CHUNK) {
    const batch = properties.slice(index, index + CHUNK);
    const keys = batch.map((property) => property.key);
    const storedRows = (await RentalListingModel.find({ key: { $in: keys } })
      .select({ key: 1, offers: 1, firstSeen: 1 })
      .lean()) as unknown as Array<{ key: string; offers?: RentalOffer[]; firstSeen?: string }>;
    const stored = new Map(storedRows.map((row) => [row.key, row]));

    const operations = [];
    for (const property of batch) {
      const previous = stored.get(property.key);
      const kept = (previous?.offers || []).filter((offer) => {
        const now = assignedTo.get(offer.listingId);
        return !now || now === property.key;
      });
      const offers = mergeOffers(kept, property.offers, context);
      if (!offers.length) {
        emptied++;
        continue;
      }
      const merged = recomputeFromOffers(
        { ...property, firstSeen: previous?.firstSeen || property.firstSeen },
        offers
      );
      operations.push({
        updateOne: {
          filter: { key: merged.key },
          update: { $set: merged },
          upsert: true,
        },
      });
    }

    if (operations.length) {
      await RentalListingModel.bulkWrite(operations, { ordered: false });
      written += operations.length;
    }
  }

  return { written, emptied };
}

/**
 * Drops properties nobody has published for `days`. Only ever called after a FULL run: a fast run
 * reads a slice of the market, and "not in this slice" says nothing about whether a flat is still
 * for rent.
 */
export async function pruneStaleRentals(today: string, days: number): Promise<number> {
  const cutoff = new Date(Date.parse(`${today}T00:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10);
  const result = await RentalListingModel.deleteMany({ lastSeen: { $lt: cutoff } });
  return result?.deletedCount ?? 0;
}

export async function countRentals(): Promise<number> {
  return RentalListingModel.countDocuments({});
}

export async function saveRentalMeta(meta: RentalMeta): Promise<void> {
  await RentalMetaModel.updateOne({ key: RENTAL_META_KEY }, { $set: meta }, { upsert: true });
}

export async function loadRentalMeta(): Promise<RentalMeta | null> {
  return RentalMetaModel.findOne({ key: RENTAL_META_KEY }).lean() as unknown as Promise<RentalMeta | null>;
}
