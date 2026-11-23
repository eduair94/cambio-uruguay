// Dónde vive el directorio: la base del APP (classes/appdb.ts). La corrida habla con una interfaz
// (`EmprendimientoStore`) para que `--dry-run` y los tests usen la memoria sin tocar Mongo.
import { EmprendimientoCandidateModel } from "../models/EmprendimientoCandidate";
import { EmprendimientoListingModel } from "../models/EmprendimientoListing";
import { EmprendimientoMetaModel } from "../models/EmprendimientoMeta";
import { EmprendimientoOptOutModel } from "../models/EmprendimientoOptOut";
import { EmprendimientoSuggestionModel } from "../models/EmprendimientoSuggestion";
import type { Candidate, EmprendimientoListing, EmprendimientoMeta } from "./types";

export type CandidateRow = Candidate & { dueAt: Date; priority: number };

export interface ListingCounts {
  listed: number;
  byRubro: Record<string, number>;
  byDepartamento: Record<string, number>;
}

export interface EmprendimientoStore {
  loadMeta(): Promise<EmprendimientoMeta | null>;
  saveMeta(meta: EmprendimientoMeta): Promise<void>;
  loadCandidates(handles: readonly string[]): Promise<Map<string, CandidateRow>>;
  /** Las cuentas que toca leer, ya repartidas entre sugerencias, publicadas por vencer y el resto. */
  dueCandidates(now: Date, limit: number): Promise<CandidateRow[]>;
  /** Cuentas leídas que esperan clasificación (la IA no contestó en su corrida). */
  unclassified(limit: number): Promise<CandidateRow[]>;
  /** Las curadoras con perfil leído: sus posts se leen buscando @menciones. */
  curators(limit: number): Promise<CandidateRow[]>;
  saveCandidates(rows: readonly CandidateRow[]): Promise<void>;
  loadOptOuts(): Promise<Set<string>>;
  pendingSuggestions(limit: number): Promise<{ id: string; handle: string }[]>;
  markSuggestions(ids: readonly string[], at: Date): Promise<void>;
  upsertListings(listings: readonly EmprendimientoListing[]): Promise<void>;
  deleteListings(handles: readonly string[]): Promise<number>;
  /** Borra las fichas cuya última lectura buena es anterior a `before`. */
  pruneListings(before: Date): Promise<number>;
  listingCounts(): Promise<ListingCounts>;
  candidateCounts(): Promise<Record<string, number>>;
}

const countInto = (rows: { _id: unknown; n: number }[]): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const row of rows) out[String(row._id ?? "sin-dato")] = row.n;
  return out;
};

/** Cuántas lecturas por corrida se reservan a las cuentas publicadas cuyas fotos vencen. */
export const LISTED_SHARE = 0.5;
/** Y cuántas a sugerencias y semillas, que van primero. */
export const PRIORITY_SLOTS = 10;

export const mongoStore: EmprendimientoStore = {
  async loadMeta() {
    return EmprendimientoMetaModel.findOne({ key: "current" }).lean<EmprendimientoMeta>().exec();
  },
  async saveMeta(meta) {
    await EmprendimientoMetaModel.updateOne({ key: "current" }, { $set: meta }, { upsert: true });
  },
  async loadCandidates(handles) {
    if (!handles.length) return new Map();
    const rows = await EmprendimientoCandidateModel.find({ handle: { $in: [...handles] } }).lean<CandidateRow[]>().exec();
    return new Map(rows.map(row => [row.handle, row]));
  },
  async dueCandidates(now, limit) {
    const base = { dueAt: { $lte: now }, state: { $ne: "baja" as const } };
    const first = await EmprendimientoCandidateModel.find({ ...base, priority: { $lte: 1 } }).sort({ priority: 1, dueAt: 1 }).limit(Math.min(PRIORITY_SLOTS, limit)).lean<CandidateRow[]>().exec();
    const taken = new Set(first.map(row => row.handle));
    const listedRoom = Math.max(0, Math.ceil(limit * LISTED_SHARE));
    const listed = await EmprendimientoCandidateModel.find({ ...base, state: "publicada", handle: { $nin: [...taken] } }).sort({ dueAt: 1 }).limit(listedRoom).lean<CandidateRow[]>().exec();
    for (const row of listed) taken.add(row.handle);
    const rest = Math.max(0, limit - first.length - listed.length);
    const others = rest
      ? await EmprendimientoCandidateModel.find({ ...base, handle: { $nin: [...taken] } }).sort({ priority: 1, dueAt: 1 }).limit(rest).lean<CandidateRow[]>().exec()
      : [];
    return [...first, ...listed, ...others];
  },
  async curators(limit) {
    return EmprendimientoCandidateModel.find({ state: "curadora", "profile.status": "ok" }).sort({ lastReadAt: -1 }).limit(limit).lean<CandidateRow[]>().exec();
  },
  async unclassified(limit) {
    return EmprendimientoCandidateModel.find({ state: "pendiente", "profile.status": "ok", classification: null }).sort({ priority: 1 }).limit(limit).lean<CandidateRow[]>().exec();
  },
  async saveCandidates(rows) {
    if (!rows.length) return;
    await EmprendimientoCandidateModel.bulkWrite(
      rows.map(row => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, createdAt, updatedAt, __v, ...rest } = row as CandidateRow & Record<string, unknown>;
        return { updateOne: { filter: { handle: row.handle }, update: { $set: rest }, upsert: true } };
      })
    );
  },
  async loadOptOuts() {
    const rows = await EmprendimientoOptOutModel.find({}, { handle: 1 }).lean<{ handle: string }[]>().exec();
    return new Set(rows.map(row => row.handle));
  },
  async pendingSuggestions(limit) {
    const rows = await EmprendimientoSuggestionModel.find({ processedAt: null }, { handle: 1 }).sort({ at: 1 }).limit(limit).lean<{ _id: unknown; handle: string }[]>().exec();
    return rows.map(row => ({ id: String(row._id), handle: row.handle }));
  },
  async markSuggestions(ids, at) {
    if (!ids.length) return;
    await EmprendimientoSuggestionModel.updateMany({ _id: { $in: [...ids] } }, { $set: { processedAt: at } });
  },
  async upsertListings(listings) {
    if (!listings.length) return;
    await EmprendimientoListingModel.bulkWrite(listings.map(listing => ({ updateOne: { filter: { handle: listing.handle }, update: { $set: listing }, upsert: true } })));
  },
  async deleteListings(handles) {
    if (!handles.length) return 0;
    const res = await EmprendimientoListingModel.deleteMany({ handle: { $in: [...handles] } });
    return res.deletedCount ?? 0;
  },
  async pruneListings(before) {
    const res = await EmprendimientoListingModel.deleteMany({ readAt: { $lt: before.toISOString() } });
    return res.deletedCount ?? 0;
  },
  async listingCounts() {
    const [listed, byRubro, byDepartamento] = await Promise.all([
      EmprendimientoListingModel.countDocuments({}),
      EmprendimientoListingModel.aggregate<{ _id: unknown; n: number }>([{ $group: { _id: "$rubro", n: { $sum: 1 } } }]),
      EmprendimientoListingModel.aggregate<{ _id: unknown; n: number }>([{ $group: { _id: "$departamento", n: { $sum: 1 } } }]),
    ]);
    return { listed, byRubro: countInto(byRubro), byDepartamento: countInto(byDepartamento) };
  },
  async candidateCounts() {
    return countInto(await EmprendimientoCandidateModel.aggregate<{ _id: unknown; n: number }>([{ $group: { _id: "$state", n: { $sum: 1 } } }]));
  },
};

/** Todo en memoria: `--dry-run` sin base y los tests. */
export function memoryStore(initial: { candidates?: CandidateRow[]; optOuts?: string[]; suggestions?: string[]; meta?: EmprendimientoMeta | null } = {}): EmprendimientoStore & {
  candidates: Map<string, CandidateRow>;
  listings: Map<string, EmprendimientoListing>;
  meta: EmprendimientoMeta | null;
} {
  const candidates = new Map((initial.candidates ?? []).map(row => [row.handle, structuredClone(row)]));
  const listings = new Map<string, EmprendimientoListing>();
  const optOuts = new Set(initial.optOuts ?? []);
  const suggestions = (initial.suggestions ?? []).map((handle, i) => ({ id: String(i), handle, processed: false }));
  const store = {
    candidates,
    listings,
    meta: initial.meta ?? null,
    async loadMeta() {
      return store.meta;
    },
    async saveMeta(meta: EmprendimientoMeta) {
      store.meta = structuredClone(meta);
    },
    async loadCandidates(handles: readonly string[]) {
      const out = new Map<string, CandidateRow>();
      for (const handle of handles) {
        const row = candidates.get(handle);
        if (row) out.set(handle, structuredClone(row));
      }
      return out;
    },
    async dueCandidates(now: Date, limit: number) {
      const due = [...candidates.values()].filter(row => row.state !== "baja" && row.dueAt.getTime() <= now.getTime());
      const first = due.filter(row => row.priority <= 1).sort((a, b) => a.priority - b.priority || +a.dueAt - +b.dueAt).slice(0, Math.min(PRIORITY_SLOTS, limit));
      const taken = new Set(first.map(row => row.handle));
      const listed = due.filter(row => row.state === "publicada" && !taken.has(row.handle)).sort((a, b) => +a.dueAt - +b.dueAt).slice(0, Math.ceil(limit * LISTED_SHARE));
      for (const row of listed) taken.add(row.handle);
      const others = due.filter(row => !taken.has(row.handle)).sort((a, b) => a.priority - b.priority || +a.dueAt - +b.dueAt).slice(0, Math.max(0, limit - first.length - listed.length));
      return [...first, ...listed, ...others].map(row => structuredClone(row));
    },
    async curators(limit: number) {
      return [...candidates.values()].filter(row => row.state === "curadora" && row.profile?.status === "ok").slice(0, limit).map(row => structuredClone(row));
    },
    async unclassified(limit: number) {
      return [...candidates.values()].filter(row => row.state === "pendiente" && row.profile?.status === "ok" && !row.classification).slice(0, limit).map(row => structuredClone(row));
    },
    async saveCandidates(rows: readonly CandidateRow[]) {
      for (const row of rows) candidates.set(row.handle, structuredClone(row));
    },
    async loadOptOuts() {
      return new Set(optOuts);
    },
    async pendingSuggestions(limit: number) {
      return suggestions.filter(s => !s.processed).slice(0, limit).map(s => ({ id: s.id, handle: s.handle }));
    },
    async markSuggestions(ids: readonly string[]) {
      for (const s of suggestions) if (ids.includes(s.id)) s.processed = true;
    },
    async upsertListings(rows: readonly EmprendimientoListing[]) {
      for (const row of rows) listings.set(row.handle, structuredClone(row));
    },
    async deleteListings(handles: readonly string[]) {
      let n = 0;
      for (const handle of handles) if (listings.delete(handle)) n++;
      return n;
    },
    async pruneListings(before: Date) {
      let n = 0;
      for (const [handle, row] of listings) {
        if (Date.parse(row.readAt) < before.getTime()) {
          listings.delete(handle);
          n++;
        }
      }
      return n;
    },
    async listingCounts() {
      const byRubro: Record<string, number> = {};
      const byDepartamento: Record<string, number> = {};
      for (const row of listings.values()) {
        byRubro[row.rubro] = (byRubro[row.rubro] ?? 0) + 1;
        const depto = row.departamento ?? "sin-dato";
        byDepartamento[depto] = (byDepartamento[depto] ?? 0) + 1;
      }
      return { listed: listings.size, byRubro, byDepartamento };
    },
    async candidateCounts() {
      const out: Record<string, number> = {};
      for (const row of candidates.values()) out[row.state] = (out[row.state] ?? 0) + 1;
      return out;
    },
  };
  return store;
}
