// La APP DB del directorio de computadoras: lo crudo (privado), las fichas de Facebook (privadas), el
// catálogo, la tabla de piezas y la corrida (públicos).
import { ComputerCatalogModel } from "../models/ComputerCatalog";
import { ComputerFbDetailModel } from "../models/ComputerFbDetail";
import { ComputerListingModel } from "../models/ComputerListing";
import { ComputerMetaModel } from "../models/ComputerMeta";
import { ComputerPartModel } from "../models/ComputerPart";
import { COMPUTER_META_ID, type ComputerCatalogRow, type ComputerMeta, type FacebookComputerDetail, type PartRow, type RawComputerListing } from "./types";

const CHUNK = 500;

async function chunked<T>(items: readonly T[], write: (slice: readonly T[]) => Promise<unknown>): Promise<void> {
  for (let index = 0; index < items.length; index += CHUNK) await write(items.slice(index, index + CHUNK));
}

/** Guarda lo visto en esta corrida: precio, foto y última vista nuevas; la primera vista se conserva. */
export async function saveRawListings(rows: readonly RawComputerListing[]): Promise<void> {
  await chunked(rows, (slice) =>
    ComputerListingModel.bulkWrite(
      slice.map((row) => {
        const { firstSeen, ...rest } = row;
        return { updateOne: { filter: { slug: row.slug }, update: { $set: rest, $setOnInsert: { firstSeen } }, upsert: true } };
      }),
      { ordered: false }
    )
  );
}

/** Los avisos vistos en los últimos `days` días. */
export async function loadRawListings(sinceDay: string): Promise<RawComputerListing[]> {
  return ComputerListingModel.find({ lastSeen: { $gte: sinceDay } }).select({ _id: 0, __v: 0, createdAt: 0, updatedAt: 0 }).lean<RawComputerListing[]>().exec();
}

/** Lo que tenga más de 60 días sin verse no vuelve a servir para nada (ni como precio usado). */
export async function pruneRawListings(beforeDay: string): Promise<number> {
  const result = await ComputerListingModel.deleteMany({ lastSeen: { $lt: beforeDay } });
  return result.deletedCount ?? 0;
}

export async function loadFacebookDetails(ids: readonly string[]): Promise<Map<string, FacebookComputerDetail>> {
  const out = new Map<string, FacebookComputerDetail>();
  for (let index = 0; index < ids.length; index += 2_000) {
    const rows = await ComputerFbDetailModel.find({ id: { $in: ids.slice(index, index + 2_000) } }).select({ _id: 0, __v: 0 }).lean<FacebookComputerDetail[]>().exec();
    for (const row of rows) out.set(row.id, row);
  }
  return out;
}

export async function saveFacebookDetails(rows: readonly FacebookComputerDetail[]): Promise<void> {
  await chunked(rows, (slice) =>
    ComputerFbDetailModel.bulkWrite(slice.map((row) => ({ updateOne: { filter: { id: row.id }, update: { $set: row }, upsert: true } })), { ordered: false })
  );
}

export async function loadParts(): Promise<PartRow[]> {
  return ComputerPartModel.find({}).select({ _id: 0, __v: 0 }).lean<PartRow[]>().exec();
}

export async function loadMeta<T>(key: string): Promise<T | null> {
  const doc = await ComputerMetaModel.findOne({ key }).lean<{ meta: T }>().exec();
  return doc?.meta ?? null;
}

export async function saveMeta(key: string, meta: unknown, at: string): Promise<void> {
  await ComputerMetaModel.updateOne({ key }, { $set: { key, generatedAt: at, meta } }, { upsert: true });
}

export async function countPublished(): Promise<number> {
  return ComputerCatalogModel.countDocuments({});
}

/** Publica catálogo, piezas y corrida; lo que ya no está en la corrida sale de las dos colecciones. */
export async function publish(rows: readonly ComputerCatalogRow[], parts: readonly PartRow[], meta: ComputerMeta): Promise<void> {
  await chunked(rows, (slice) => ComputerCatalogModel.bulkWrite(slice.map((row) => ({ replaceOne: { filter: { slug: row.slug }, replacement: row, upsert: true } })), { ordered: false }));
  await ComputerCatalogModel.deleteMany({ slug: { $nin: rows.map((row) => row.slug) } });
  await chunked(parts, (slice) => ComputerPartModel.bulkWrite(slice.map((row) => ({ replaceOne: { filter: { slug: row.slug }, replacement: row, upsert: true } })), { ordered: false }));
  await ComputerPartModel.deleteMany({ slug: { $nin: parts.map((row) => row.slug) } });
  await saveMeta(COMPUTER_META_ID, meta, meta.generatedAt);
}
