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

  // Qué rango de precios puede tener esta propiedad.
  //
  // Si la corrida de hoy trajo avisos, mandan ellos: `buildRentalProperties` los volvió a comparar
  // con `sameUnit` hace un instante, así que son coherentes entre sí por construcción. Lo guardado
  // es lo que hay que volver a ganarse.
  //
  // Si hoy no vino ninguno —pasa en cada corrida rápida, que sólo mira lo recién publicado— hay
  // que decidir entre los guardados sin árbitro. Ahí gana el grupo MÁS NUMEROSO, no el más barato:
  // con [21.000, 41.000, 41.000] el raro es el barato, y anclar al mínimo tiraría los dos avisos
  // que coinciden para quedarse con el único que no coincide con nadie.
  //
  // Y se mide contra los DOS extremos, no contra un precio de referencia. Medir contra uno solo
  // encadena la tolerancia: con referencia 26.900, un aviso de 26.500 y otro de 28.800 pasan los
  // dos —cada uno está dentro del 7 % del ancla— y el conjunto termina estirado un 8 %. Así se
  // publicaban quince "1 dormitorio en Tres Cruces" como una sola propiedad: piso 10, piso 9, PB
  // con entrada propia, con garaje. Cada uno cerca del ancla, ninguno cerca del otro.
  const freshPrices = fresh.map((offer) => offer.priceUyu).filter((price) => price > 0);
  const [lo, hi] = freshPrices.length
    ? [Math.min(...freshPrices), Math.max(...freshPrices)]
    : largestCoherentWindow(priced.map((offer) => offer.priceUyu));
  if (!(lo > 0) || !(hi > 0)) return all;

  const freshIds = new Set(fresh.map((offer) => offer.listingId));
  return all.filter((offer) => {
    if (freshIds.has(offer.listingId)) return true;
    // Sin precio no hay con qué contradecir; el precio es la única señal que sobrevive en la oferta.
    if (offer.priceUyu <= 0) return true;
    return coherent(Math.min(lo, offer.priceUyu), Math.max(hi, offer.priceUyu));
  });
}

/** ¿Un conjunto cuyo precio va de `lo` a `hi` sigue siendo una sola propiedad? */
function coherent(lo: number, hi: number): boolean {
  return lo / hi >= OFFER_PRICE_TOLERANCE;
}

/**
 * El rango de precios del grupo más numeroso que sigue siendo coherente ENTERO.
 *
 * Sobre la lista ordenada, un grupo coherente es una ventana contigua cuyos extremos no se separan
 * más que la tolerancia. Empate en cantidad: gana la más barata, que es la que se recorre primero.
 */
function largestCoherentWindow(sorted: number[]): [number, number] {
  let best: [number, number] = [sorted[0], sorted[0]];
  let bestCount = 0;
  for (let start = 0; start < sorted.length; start++) {
    let end = start;
    while (end + 1 < sorted.length && coherent(sorted[start], sorted[end + 1])) end++;
    const count = end - start + 1;
    if (count > bestCount) {
      bestCount = count;
      best = [sorted[start], sorted[end]];
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
 * Saca cada aviso de TODA fila que ya no sea su dueña.
 *
 * `saveRentalProperties` limpia las filas que la corrida escribe, y eso no alcanza: cuando el
 * agrupamiento deja de unir dos avisos, la fila vieja puede no volver a producirse nunca más, así
 * que nadie la toca y se queda con su copia hasta vencer por días. Medido el 2026-09-03 después
 * de la primera corrida con los tres arreglos: **2.707 avisos vivían en más de una fila**, y sólo
 * 9 filas tenían un conjunto fresco incoherente por sí mismo. O sea que el agrupamiento del día ya
 * estaba bien y lo que ensuciaba el directorio eran las copias viejas.
 *
 * SÓLO DESPUÉS DE UNA CORRIDA COMPLETA, por el mismo motivo que la poda: una corrida rápida ve una
 * franja del mercado, y "este aviso hoy pertenece a otra propiedad" sólo se puede afirmar de los
 * avisos que la corrida efectivamente vio. Los que no vio no se tocan.
 *
 * Una fila que se queda sin ofertas se borra: una propiedad sin un solo aviso no es una propiedad.
 */
export async function dropReassignedOffers(
  properties: RentalProperty[]
): Promise<{ cleaned: number; removed: number; deleted: number }> {
  const owner = new Map<string, string>();
  for (const property of properties) {
    for (const offer of property.offers) owner.set(offer.listingId, property.key);
  }
  if (!owner.size) return { cleaned: 0, removed: 0, deleted: 0 };

  let cleaned = 0;
  let removed = 0;
  let deleted = 0;
  // Sin `_id` ni los campos que administra mongoose: el documento entero se vuelve a escribir con
  // `$set`, y `$set` sobre `_id` lo rechaza MongoDB por inmutable ("would modify the immutable
  // field '_id'"). `saveRentalProperties` no tiene el problema porque sus objetos vienen del
  // agrupamiento y nunca pasaron por la base.
  const cursor = RentalListingModel.find({}, { _id: 0, __v: 0, createdAt: 0, updatedAt: 0 })
    .lean()
    .cursor();
  // Sin anotar y sin reasignar, igual que en `saveRentalProperties`.
  //
  // No es descuido: anotarlo rompe el build. Los tipos de mongoose exigen para `$set` un objeto de
  // rutas con punto (`offers.0.title`), que un `RentalProperty` entero no satisface, y el `tsc` de
  // esta máquina no lo reproduce —resuelve otra versión de los tipos— así que el error sólo aparece
  // al compilar en el servidor. El array vacío sin anotación deja que TS lo infiera del uso, que es
  // lo que viene compilando ahí desde siempre. Se vacía con `splice(0)` al escribir, porque
  // reasignarlo también rompería la inferencia.
  const operations = [];

  const flush = async (): Promise<void> => {
    if (!operations.length) return;
    // `splice(0)` y no vaciar después: pasarle el array y limpiarlo a continuación deja a quien lo
    // recibió con la lista vacía, porque es la MISMA referencia. En producción no se nota —el await
    // termina antes— pero es la clase de aliasing que muerde más tarde, y acá lo destapó un test.
    await RentalListingModel.bulkWrite(operations.splice(0), { ordered: false });
  };

  for await (const raw of cursor) {
    const row = raw as unknown as RentalProperty;
    const offers = row.offers || [];
    const kept = offers.filter((offer) => {
      const now = owner.get(offer.listingId);
      return !now || now === row.key;
    });
    if (kept.length === offers.length) continue;

    cleaned++;
    removed += offers.length - kept.length;
    if (!kept.length) {
      deleted++;
      operations.push({ deleteOne: { filter: { key: row.key } } });
    } else {
      operations.push({
        updateOne: { filter: { key: row.key }, update: { $set: recomputeFromOffers(row, kept) } },
      });
    }
    if (operations.length >= CHUNK) await flush();
  }
  await flush();

  return { cleaned, removed, deleted };
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
