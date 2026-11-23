// Dónde viven los hechos visuales: APP DB `photofacts` (un documento por aviso) y `photofactsmetas`
// (el resumen de la última corrida). PRIVADAS: ninguna API del sitio las lee, y nada de acá se copia a
// `rentallistings` ni a `propertysalecatalog`. Publicar un atributo es otro trabajo, y sólo después de
// que pase la vara con etiquetas humanas (classes/photofacts/evaluate.ts).
import { appConnection } from "../appdb";
import type { PhotoSkips } from "../vision/photos";
import type { PhotoFactsRow } from "./run";
import type { PhotoSubject, StoredState } from "./subjects";

export const PHOTO_FACTS_COLLECTION = "photofacts";
export const PHOTO_FACTS_META_COLLECTION = "photofactsmetas";

const DAY = 86_400_000;
/** Espera después de la falla N (1, 2, 3, ≥ 4): una falla guardada no vuelve a encabezar la cola. */
const RETRY_DAYS = [1, 3, 7, 30];
/** Un aviso sin fotos utilizables no cambia mañana; si cambia su galería, cambia su hash y vuelve. */
const NO_PHOTOS_DAYS = 30;

export const monthKey = (now: Date): string => now.toISOString().slice(0, 7);
export const monthStartUtc = (now: Date): string => `${monthKey(now)}-01T00:00:00.000Z`;

const collection = () => appConnection().collection(PHOTO_FACTS_COLLECTION);

export interface StoredStateWithFailures extends StoredState {
  failures: number;
}

/** El estado guardado de estos avisos, en una sola consulta. */
export async function loadStates(ids: readonly string[]): Promise<Map<string, StoredStateWithFailures>> {
  const out = new Map<string, StoredStateWithFailures>();
  if (!ids.length) return out;
  const docs = await collection()
    .find({ _id: { $in: [...ids] } } as any, { projection: { galleryHash: 1, schema: 1, ok: 1, nextTryAt: 1, failures: 1 } })
    .toArray();
  for (const doc of docs as any[]) {
    out.set(String(doc._id), {
      galleryHash: String(doc.galleryHash ?? ""),
      schema: Number(doc.schema) || 0,
      ok: doc.ok === true,
      nextTryAt: typeof doc.nextTryAt === "string" ? doc.nextTryAt : undefined,
      failures: Number(doc.failures) || 0,
    });
  }
  return out;
}

/**
 * Lo gastado este mes, sumado de la propia colección. Cada lectura suma en `spend.<AAAA-MM>` en vez
 * de pisar un costo: si un aviso se vuelve a mirar dentro del mes, lo que costó la primera vez sigue
 * contando.
 */
export async function monthSpendUsd(now: Date): Promise<number> {
  const field = `$spend.${monthKey(now)}`;
  const rows = await collection().aggregate([{ $group: { _id: null, usd: { $sum: { $ifNull: [field, 0] } } } }]).toArray();
  return Number(rows[0]?.usd) || 0;
}

const base = (subject: PhotoSubject) => ({
  vertical: subject.vertical,
  listingId: subject.listingId,
  propertyKey: subject.propertyKey,
  source: subject.source,
  advertiser: subject.advertiser,
  department: subject.department,
  galleryHash: subject.galleryHash,
});

export async function savePhotoFacts(row: PhotoFactsRow, now: Date, schemaVersion: number): Promise<void> {
  const verdicts = new Map(row.result.photos.map(photo => [photo.index, photo]));
  const photos = row.sent.map((photo, i) => ({
    url: photo.url,
    sha1: photo.sha1,
    dhash: photo.dhash,
    width: photo.width,
    height: photo.height,
    resized: photo.resized,
    kind: verdicts.get(i)?.kind ?? null,
    render: verdicts.get(i)?.render ?? null,
    watermark: verdicts.get(i)?.watermark ?? null,
    collage: verdicts.get(i)?.collage ?? null,
  }));
  const cover = row.result.cover;
  await collection().updateOne(
    { _id: row.subject.id } as any,
    {
      $set: {
        ...base(row.subject),
        ok: true,
        schema: schemaVersion,
        model: row.answer.model,
        readAt: now.toISOString(),
        photos,
        facts: row.result.facts,
        cover,
        coverUrl: cover === null ? null : (row.sent[cover]?.url ?? null),
        note: row.result.note,
        skipped: row.skipped,
        usage: row.answer.usage,
        costUsd: row.answer.costUsd,
      },
      $inc: { [`spend.${monthKey(now)}`]: row.answer.costUsd },
      $unset: { failures: "", nextTryAt: "", lastError: "" },
    },
    { upsert: true },
  );
}

/**
 * Una lectura que no sirvió, guardada igual: sin esto, los mismos avisos rotos encabezan la cola
 * cada hora (la lección de la cola de Casasweb, docs/app/RENTALS.md). Lo que se pagó, se suma.
 */
export async function saveFailure(
  subject: PhotoSubject,
  reason: "no_photos" | "no_answer" | "unreadable_answer",
  costUsd: number,
  now: Date,
  previousFailures: number,
): Promise<void> {
  const failures = previousFailures + 1;
  const days = reason === "no_photos" ? NO_PHOTOS_DAYS : RETRY_DAYS[Math.min(failures, RETRY_DAYS.length) - 1];
  await collection().updateOne(
    { _id: subject.id } as any,
    {
      $set: { ...base(subject), ok: false, lastError: reason, failedAt: now.toISOString(), nextTryAt: new Date(now.getTime() + days * DAY).toISOString(), failures },
      ...(costUsd > 0 ? { $inc: { [`spend.${monthKey(now)}`]: costUsd } } : {}),
    },
    { upsert: true },
  );
}

/**
 * Cuántas fotos (por huella exacta) aparecen en avisos de DOS o más anunciantes distintos. Es una
 * medida y nada más: no une avisos ni acusa a nadie.
 */
export async function repeatedAcrossAdvertisers(): Promise<{ photos: number; listings: number }> {
  const rows = await collection()
    .aggregate([
      { $match: { ok: true } },
      { $unwind: "$photos" },
      { $match: { "photos.dhash": { $type: "string" } } },
      { $group: { _id: "$photos.dhash", advertisers: { $addToSet: "$advertiser" }, listings: { $addToSet: "$_id" } } },
      { $match: { "advertisers.1": { $exists: true } } },
      { $group: { _id: null, photos: { $sum: 1 }, listings: { $addToSet: "$listings" } } },
      { $project: { photos: 1, listings: { $size: { $reduce: { input: "$listings", initialValue: [], in: { $setUnion: ["$$value", "$$this"] } } } } } },
    ])
    .toArray();
  return { photos: Number(rows[0]?.photos) || 0, listings: Number(rows[0]?.listings) || 0 };
}

export async function saveRunMeta(data: Record<string, unknown>, now: Date): Promise<void> {
  await appConnection()
    .collection(PHOTO_FACTS_META_COLLECTION)
    .updateOne({ key: "run" }, { $set: { key: "run", updatedAt: now.toISOString(), data } }, { upsert: true });
}

export type { PhotoSkips };
