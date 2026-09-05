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
import { detachedRentalKey, partitionRentalOffers, propertyFromRentalOffers } from "./reconcile";
import { RENTAL_META_KEY, type RentalMeta, type RentalOffer, type RentalProperty, type RentalSource } from "./types";

const CHUNK = 400;

export interface RentalHistory {
  offerFirstSeen: Map<string, string>;
  propertyFirstSeen: Map<string, string>;
  /** `listingId -> property key`: how a property keeps its identity across runs (see dedupe.ts). */
  offerToProperty: Map<string, string>;
  /** Only this attributable advert may keep the old presentation URL after a split. */
  propertyCanonicalOffer: Map<string, string | null>;
}

/**
 * What the previous runs knew: the day each advert and each property was first seen. Losing it
 * would reset every "publicado hace N días" on the site to today.
 */
export async function loadRentalHistory(): Promise<RentalHistory> {
  const rows = (await RentalListingModel.find({})
    .select({ key: 1, title: 1, firstSeen: 1, "offers.listingId": 1, "offers.title": 1, "offers.firstSeen": 1, "offers.lastSeen": 1 })
    .lean()) as unknown as RentalHistoryRow[];
  return rentalHistoryFromRows(rows);
}

export interface RentalHistoryRow {
  key?: string | null;
  title?: string | null;
  firstSeen?: string | null;
  offers?: Array<{ listingId?: string | null; title?: string | null; firstSeen?: string | null; lastSeen?: string | null }>;
}

const historyDay = (value: unknown): string | null => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value ? value : null;
};

/**
 * Old copies of an advert can survive in several stored properties until a full cleanup sees it.
 * Mongo's natural row order is not identity evidence. Prefer the most recently observed offer,
 * then the oldest known property (its own firstSeen, not the advert's), then the key. Missing
 * dates stay unknown: they never become a fresh observation or an epoch-old property.
 */
export function rentalHistoryFromRows(rows: readonly RentalHistoryRow[]): RentalHistory {
  const offerFirstSeen = new Map<string, string>();
  const propertyFirstSeen = new Map<string, string>();
  const offerToProperty = new Map<string, string>();
  const owners = new Map<string, { key: string; lastSeen: string | null; firstSeen: string | null }>();
  for (const row of rows) {
    const key = typeof row.key === "string" ? row.key.trim() : "";
    const firstSeen = historyDay(row.firstSeen);
    if (key && firstSeen) propertyFirstSeen.set(key, firstSeen);
    for (const offer of row.offers || []) {
      if (!offer?.listingId) continue;
      const seen = historyDay(offer.firstSeen);
      const earliest = offerFirstSeen.get(offer.listingId);
      if (seen && (!earliest || seen < earliest)) offerFirstSeen.set(offer.listingId, seen);
      if (!key) continue;
      const lastSeen = historyDay(offer.lastSeen);
      const previous = owners.get(offer.listingId);
      const fresher = (lastSeen || "").localeCompare(previous?.lastSeen || "");
      // A valid firstSeen wins over unknown; otherwise prefer the earlier documented date.
      const older = (firstSeen || "9999-99-99").localeCompare(previous?.firstSeen || "9999-99-99");
      if (!previous || fresher > 0 || (fresher === 0 && (older < 0 || (older === 0 && key < previous.key)))) {
        owners.set(offer.listingId, { key, lastSeen, firstSeen });
      }
    }
  }
  for (const [listingId, owner] of owners) offerToProperty.set(listingId, owner.key);
  const propertyCanonicalOffer = new Map<string, string | null>();
  const titleIdentity = (value: unknown) => typeof value === "string" ? value.trim().toLowerCase().replace(/\s+/g, " ") : "";
  for (const row of rows) {
    const key = typeof row.key === "string" ? row.key.trim() : "";
    if (!key) continue;
    const title = titleIdentity(row.title);
    const candidates = new Set((row.offers || []).filter(offer => title && titleIdentity(offer.title) === title)
      .map(offer => offer.listingId).filter((id): id is string => typeof id === "string" && offerToProperty.get(id) === key));
    propertyCanonicalOffer.set(key, candidates.size === 1 ? [...candidates][0]! : null);
  }
  return { offerFirstSeen, propertyFirstSeen, offerToProperty, propertyCanonicalOffer };
}

export interface SaveContext {
  today: string;
  /** Runtime always supplies the current common conversion rate. */
  usdUyu?: number;
  /** Deterministic prior owner prevents a historical duplicate from being copied again. */
  offerOwners?: ReadonlyMap<string, string>;
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
  for (const offer of fresh) {
    // `null` NO es una negativa: es "esta corrida no preguntó".
    //
    // La corrida RAPIDA no hace la pasada de mascotas de MercadoLibre —es una consulta aparte y
    // sólo corre en la completa— asi que trae los mismos avisos con `petsAllowed: null`, y acá lo
    // fresco pisa a lo guardado por listingId.
    //
    // El alcance, medido y no supuesto: la rapida lee lo recien publicado, asi que de las 1.246
    // propiedades con oferta de ML marcada, las expuestas en una corrida dada son las pocas que esa
    // franja vuelve a ver (2 publicadas hoy, 4 con freshAt de hoy al medirlo). Chico por corrida,
    // pero se come justo lo mas nuevo —lo que mas se busca— y se repite cada hora hasta que la
    // corrida completa de las 04:52 lo repone. Y no avisa: el campo vuelve a null y el filtro
    // devuelve menos, no un error.
    const previo = byId.get(offer.listingId);
    if (previo?.petsAllowed === true && offer.petsAllowed !== true) {
      byId.set(offer.listingId, { ...offer, petsAllowed: true });
      continue;
    }
    byId.set(offer.listingId, offer);
  }

  // Similarity decides grouping, never whether an otherwise live advert survives.
  return [...byId.values()].sort((a, b) => a.priceUyu - b.priceUyu || a.listingId.localeCompare(b.listingId));
}

/** Re-derives the fields that are a function of the offers, after a merge changed them. */
export function recomputeFromOffers(property: RentalProperty, offers: RentalOffer[]): RentalProperty {
  return propertyFromRentalOffers(property.key, offers, 0, property);
}

export interface RentalWritePlan {
  emptied: number;
  separated: number;
  assigned: RentalProperty[];
}

/** Read-only planning also powers an inspectable historical repair before its first write. */
export async function planRentalPropertyUpdates(
  properties: RentalProperty[],
  context: SaveContext
): Promise<RentalWritePlan> {
  const assignedTo = new Map<string, string>();
  for (const property of properties) {
    for (const offer of property.offers) {
      const owner = assignedTo.get(offer.listingId);
      if (owner && owner !== property.key) throw new Error("[rentals] incoming advert has two owners");
      assignedTo.set(offer.listingId, property.key);
    }
  }
  const planned = new Map<string, RentalProperty>();
  let emptied = 0;
  let separated = 0;
  const incomingKeys = new Set(properties.map(property => property.key));
  // Plan every update before writing: a detached advert must never overwrite another unit.
  for (let index = 0; index < properties.length; index += CHUNK) {
    const batch = properties.slice(index, index + CHUNK);
    const storedRows = await RentalListingModel.find({ key: { $in: batch.map(property => property.key) } })
      .select({ _id: 0, __v: 0, createdAt: 0, updatedAt: 0 }).lean() as unknown as RentalProperty[];
    const stored = new Map(storedRows.map(row => [row.key, row]));
    for (const property of batch) {
      const previous = stored.get(property.key);
      const kept = (previous?.offers || []).filter(offer => {
        const owner = assignedTo.get(offer.listingId);
        if (owner) return owner === property.key;
        const previousOwner = context.offerOwners?.get(offer.listingId);
        return !previousOwner || previousOwner === property.key;
      });
      const all = mergeOffers(kept, property.offers, context);
      const groups = partitionRentalOffers(all, context.usdUyu || 0);
      if (!groups.length) { emptied++; continue; }
      const firstFreshId = property.offers.find(offer => offer.title === property.title)?.listingId
        || property.offers[0]?.listingId;
      const primary = groups.find(group => group.some(offer => offer.listingId === firstFreshId)) || groups[0]!;
      for (const group of groups) {
        const key = group === primary ? property.key : detachedRentalKey(group[0]!);
        if (group !== primary && incomingKeys.has(key)) throw new Error("[rentals] detached key collides with incoming property");
        const former = planned.get(key);
        if (former && JSON.stringify(former.offers) !== JSON.stringify(group)) {
          throw new Error("[rentals] inconsistent duplicate assignment in write plan");
        }
        const row = propertyFromRentalOffers(key, group, context.usdUyu || 0,
          group === primary ? property : previous);
        planned.set(key, row);
        if (group !== primary) separated++;
      }
    }
  }
  const assigned = [...planned.values()];
  const detached = assigned.filter(property => !incomingKeys.has(property.key));
  for (let index = 0; index < detached.length; index += CHUNK) {
    const batch = detached.slice(index, index + CHUNK);
    const existing = await RentalListingModel.find({ key: { $in: batch.map(row => row.key) } })
      .select({ key: 1, "offers.listingId": 1 }).lean() as unknown as RentalProperty[];
    for (const old of existing) {
      const targetIds = new Set(planned.get(old.key)!.offers.map(offer => offer.listingId));
      if (old.offers.some(offer => !targetIds.has(offer.listingId))) {
        throw new Error("[rentals] detached key already belongs to another advert; nothing written");
      }
    }
  }
  return { emptied, separated, assigned };
}

export async function writeRentalPropertyPlan(plan: RentalWritePlan): Promise<number> {
  for (let index = 0; index < plan.assigned.length; index += CHUNK) {
    const operations = [];
    for (const row of plan.assigned.slice(index, index + CHUNK)) {
      // Mongoose may mutate timestamps and cast nested fields. Keep the reviewed plan isolated
      // from the driver's update object, including the original per-offer evidence.
      operations.push({
        updateOne: { filter: { key: row.key }, update: { $set: { ...structuredClone(row) } }, upsert: true },
      });
    }
    if (operations.length) await RentalListingModel.bulkWrite(operations, { ordered: false });
  }
  return plan.assigned.length;
}

export async function saveRentalProperties(properties: RentalProperty[], context: SaveContext) {
  const plan = await planRentalPropertyUpdates(properties, context);
  const written = await writeRentalPropertyPlan(plan);
  return { ...plan, written };
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
 * Acts only on positive assignments, including a partial run: absence never removes an advert.
 * A newly assigned advert must stop appearing under its obsolete owner immediately.
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
  // Sin `_id` ni los campos que administra mongoose.
  //
  // NO es que sin esto falle: lo escribí creyendo que sí y la corrida del 2026-09-04 lo desmintió
  // —barrió 1.015 filas sin un solo error—. MongoDB rechaza MODIFICAR `_id`, y volver a
  // escribirle el mismo valor no lo modifica. La proyección se queda igual por lo que sí es cierto:
  // son 16.000 documentos que se leen enteros, y traer campos que se van a reescribir con el mismo
  // valor es tráfico y memoria al pedo.
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
