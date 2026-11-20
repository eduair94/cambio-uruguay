// Lecturas y escrituras de `currency-usage-insights`. El ÚNICO archivo que importa los dos modelos.
//
// Tres reglas:
// - `saveState` escribe un `$set` con punto POR SUB-CLAVE y nunca el objeto entero: así ninguna
//   escritura de la memoria del job deshace un contador de cuota, y una fuente que falló no borra el
//   estado de otra. NUNCA escribe `state.quota`.
// - `reserveQuota` es el único que escribe `state.quota.<nombre>`: un `$inc` condicional y atómico con
//   el driver nativo (sin el casteo de Mongoose sobre un `Mixed`), ANTES de cada llamada.
// - El día se escribe con `$set` por fuente (`sources.<id>`): una fuente que falla nunca borra lo que
//   otra (u otra corrida del mismo día) ya escribió.
import { appConnection } from "../appdb";
import { SearchConsoleDayModel } from "../models/SearchConsoleDay";
import { UsageInsightDayModel } from "../models/UsageInsightDay";
import { UsageInsightSnapshotModel } from "../models/UsageInsightSnapshot";
import { enforceDayBudget } from "./budget";
import type { ArchiveTrendDay } from "./pages";
import type { ArchivedRumDay } from "./sources/cloudflareRum";
import { USAGE_INSIGHTS_KEY, USAGE_INSIGHTS_STATE_KEY } from "./types";
import type { DaySignal, DaySlices, InsightState, UsageInsightDay, UsageInsightSnapshot } from "./types";

export type QuotaName = "clarity" | "inspection";

export const emptyState = (): InsightState => ({
  quota: { clarity: { day: "", used: 0 }, inspection: { day: "", used: 0 } },
  clarity: { lastOkAt: null },
  sitemap: { seededAt: "", fetchedAt: "", capped: false, firstSeen: [], gone: [] },
  inspections: [],
  cfRum: { suspectSince: null, backfillTarget: null },
  crux: { historyFetchedAt: null, lastOkAt: null },
  bing: { lastBucket: null },
  signalKeys: {},
});

/** Las sub-claves que `saveState` puede escribir. `quota` no está, a propósito. */
export const STATE_KEYS = ["sitemap", "inspections", "cfRum", "crux", "bing", "clarity.lastOkAt", "signalKeys"] as const;
export type StateKey = (typeof STATE_KEYS)[number];

export interface InsightStore {
  loadSnapshot(): Promise<UsageInsightSnapshot | null>;
  loadState(): Promise<InsightState>;
  saveSnapshot(s: UsageInsightSnapshot): Promise<void>;
  saveState(state: InsightState, keys: StateKey[]): Promise<void>;
  reserveQuota(name: QuotaName, day: string, max: number): Promise<number | null>;
  loadQuota(name: QuotaName, day: string): Promise<number>;
  saveDaySlices(day: string, slices: DaySlices, signals?: DaySignal[], log?: (line: string) => void): Promise<void>;
  loadCfRumDays(start: string, end: string): Promise<ArchivedRumDay[]>;
  loadArchiveTrend(start: string, end: string): Promise<ArchiveTrendDay[]>;
  loadGscQueries(start: string, end: string): Promise<{ day: string; queries: { key: string; clicks: number; impressions: number }[] }[]>;
  loadDay(day: string): Promise<UsageInsightDay | null>;
  feedbackAggregate(pipeline: any[]): Promise<any[]>;
}

/** El documento de actualización de `saveState`. Exportado para que el test vea que no toca `state.quota`. */
export function stateUpdate(state: InsightState, keys: StateKey[]): { $set: Record<string, unknown> } {
  const set: Record<string, unknown> = { key: USAGE_INSIGHTS_STATE_KEY };
  for (const k of keys) {
    if (k === "clarity.lastOkAt") set["state.clarity.lastOkAt"] = state.clarity?.lastOkAt ?? null;
    else set[`state.${k}`] = (state as any)[k];
  }
  return { $set: set };
}

function mergeState(raw: any): InsightState {
  const base = emptyState();
  const s = raw || {};
  return {
    quota: {
      clarity: { ...base.quota.clarity, ...(s.quota?.clarity || {}) },
      inspection: { ...base.quota.inspection, ...(s.quota?.inspection || {}) },
    },
    clarity: { ...base.clarity, ...(s.clarity || {}) },
    sitemap: { ...base.sitemap, ...(s.sitemap || {}) },
    inspections: Array.isArray(s.inspections) ? s.inspections : [],
    cfRum: { ...base.cfRum, ...(s.cfRum || {}) },
    crux: { ...base.crux, ...(s.crux || {}) },
    bing: { ...base.bing, ...(s.bing || {}) },
    signalKeys: s.signalKeys && typeof s.signalKeys === "object" ? s.signalKeys : {},
  };
}

// El modelo está tipado con el snapshot (`key: "site"`); el documento de estado comparte colección.
const SnapshotModel = UsageInsightSnapshotModel as unknown as import("mongoose").Model<any>;
const collection = () => appConnection().collection(UsageInsightSnapshotModel.collection.name);

export const mongoStore: InsightStore = {
  async loadSnapshot() {
    const doc = await UsageInsightSnapshotModel.findOne({ key: USAGE_INSIGHTS_KEY }).select({ state: 0 }).lean();
    return (doc as unknown as UsageInsightSnapshot) || null;
  },
  async loadState() {
    const doc: any = await SnapshotModel.findOne({ key: USAGE_INSIGHTS_STATE_KEY }).select({ state: 1 }).lean();
    return mergeState(doc?.state);
  },
  async saveSnapshot(s) {
    await UsageInsightSnapshotModel.updateOne({ key: USAGE_INSIGHTS_KEY }, { $set: { ...s, key: USAGE_INSIGHTS_KEY } }, { upsert: true });
  },
  async saveState(state, keys) {
    if (!keys.length) return;
    await SnapshotModel.updateOne({ key: USAGE_INSIGHTS_STATE_KEY }, stateUpdate(state, keys), { upsert: true });
  },
  async reserveQuota(name, day, max) {
    const c = collection();
    const path = `state.quota.${name}`;
    // 1. que el documento exista (ningún upsert de abajo puede chocar con la clave única);
    await c.updateOne({ key: USAGE_INSIGHTS_STATE_KEY }, { $setOnInsert: { key: USAGE_INSIGHTS_STATE_KEY } }, { upsert: true });
    // 2. día nuevo → contador en cero;
    await c.updateOne({ key: USAGE_INSIGHTS_STATE_KEY, [`${path}.day`]: { $ne: day } }, { $set: { [path]: { day, used: 0 } } });
    // 3. sumar uno SÓLO si no llegó al máximo, atómico. null = el día ya está lleno.
    const res: any = await c.findOneAndUpdate(
      { key: USAGE_INSIGHTS_STATE_KEY, [`${path}.day`]: day, [`${path}.used`]: { $lt: max } },
      { $inc: { [`${path}.used`]: 1 } },
      { returnDocument: "after" }
    );
    const doc = res && typeof res === "object" && "ok" in res && "value" in res ? res.value : res;
    const used = doc?.state?.quota?.[name]?.used;
    return Number.isFinite(Number(used)) && doc ? Number(used) : null;
  },
  async loadQuota(name, day) {
    const doc: any = await collection().findOne({ key: USAGE_INSIGHTS_STATE_KEY }, { projection: { [`state.quota.${name}`]: 1 } });
    const q = doc?.state?.quota?.[name];
    return q && q.day === day ? Number(q.used) || 0 : 0;
  },
  async saveDaySlices(day, slices, signals, log) {
    const doc = enforceDayBudget({ day, sources: { ...slices }, ...(signals ? { signals } : {}) }, log);
    const set: Record<string, unknown> = { day, schemaVersion: 1 };
    for (const [id, slice] of Object.entries(doc.sources || {})) if (slice) set[`sources.${id}`] = slice;
    if (signals) set.signals = doc.signals;
    await UsageInsightDayModel.updateOne({ day }, { $set: set }, { upsert: true });
  },
  async loadCfRumDays(start, end) {
    const docs: any[] = await UsageInsightDayModel.find(
      { day: { $gte: start, $lte: end }, "sources.cloudflareRum": { $exists: true } },
      { day: 1, "sources.cloudflareRum": 1 }
    ).lean();
    return docs.filter((d) => d?.sources?.cloudflareRum?.data).map((d) => ({ day: d.day, data: d.sources.cloudflareRum.data }));
  },
  async loadArchiveTrend(start, end) {
    const docs: any[] = await UsageInsightDayModel.find(
      { day: { $gte: start, $lte: end }, "sources.indexation": { $exists: true } },
      { day: 1, "sources.indexation.data.checked": 1, "sources.indexation.data.results.cls": 1 }
    ).lean();
    return docs.map((d) => {
      const results: any[] = d?.sources?.indexation?.data?.results || [];
      return {
        day: d.day,
        inspected: Number(d?.sources?.indexation?.data?.checked) || results.length,
        indexed: results.filter((r) => r?.cls === "indexed" || r?.cls === "indexed-warning").length,
      };
    });
  },
  async loadGscQueries(start, end) {
    const docs: any[] = await SearchConsoleDayModel.find({ day: { $gte: start, $lte: end } }, { day: 1, queries: 1 }).lean();
    return docs.map((d) => ({ day: d.day, queries: Array.isArray(d.queries) ? d.queries : [] }));
  },
  async loadDay(day) {
    const doc = await UsageInsightDayModel.findOne({ day }).lean();
    return (doc as unknown as UsageInsightDay) || null;
  },
  async feedbackAggregate(pipeline) {
    return appConnection().collection("sitefeedbacks").aggregate(pipeline).toArray();
  },
};

export class ReadOnlyStoreError extends Error {
  constructor(what: string) {
    super(`dry run: ${what} no escribe`);
    this.name = "ReadOnlyStoreError";
  }
}

/**
 * La fachada del dry run: todo `save*` tira, y `reserveQuota` sólo se delega cuando el dry run gasta
 * una cuota compartida (`--clarity` o `--inspect=N`). Los contadores son lo único que un dry run
 * puede escribir, y un dry run que gasta cuota la cuenta.
 */
export function readOnlyStore(store: InsightStore, opts: { allowQuotaCounter: boolean }): InsightStore {
  return {
    ...store,
    saveSnapshot: async () => {
      throw new ReadOnlyStoreError("saveSnapshot");
    },
    saveState: async () => {
      throw new ReadOnlyStoreError("saveState");
    },
    saveDaySlices: async () => {
      throw new ReadOnlyStoreError("saveDaySlices");
    },
    reserveQuota: opts.allowQuotaCounter
      ? store.reserveQuota
      : async () => {
          throw new ReadOnlyStoreError("reserveQuota");
        },
  };
}

/** Un store sin base (dry run sin APP_MONGO_URI): lee vacío, no escribe nada. */
export const offlineStore: InsightStore = {
  loadSnapshot: async () => null,
  loadState: async () => emptyState(),
  saveSnapshot: async () => {
    throw new ReadOnlyStoreError("saveSnapshot");
  },
  saveState: async () => {
    throw new ReadOnlyStoreError("saveState");
  },
  reserveQuota: async () => {
    throw new ReadOnlyStoreError("reserveQuota");
  },
  loadQuota: async () => 0,
  saveDaySlices: async () => {
    throw new ReadOnlyStoreError("saveDaySlices");
  },
  loadCfRumDays: async () => [],
  loadArchiveTrend: async () => [],
  loadGscQueries: async () => [],
  loadDay: async () => null,
  feedbackAggregate: async () => {
    throw new ReadOnlyStoreError("feedbackAggregate sin base");
  },
};
