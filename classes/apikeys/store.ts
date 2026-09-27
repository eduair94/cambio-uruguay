// Las claves de la API sobre un modelo de Mongo inyectado (mongo.ts pone el de verdad; los tests,
// uno en memoria). Guarda el hash, nunca la clave.
//
// `findActiveByHash` es el camino caliente: lo llama el middleware en cada pedido con clave. Por eso
// recuerda 60 s la respuesta, también la NEGATIVA (una clave inventada repetida no golpea Mongo cada
// vez). Un cambio hecho en este proceso vacía la caché y rige ya; el de la otra instancia del
// cluster rige en ≤ 60 s. No hay timers: la caché vence por reloj al leerla.
import { displayPrefix, generateCredential, hashCredential } from "./credential";
import { isPlanId, type Limits, type PlanId } from "./plans";
import { MAX_ACTIVE_PER_OWNER, type KeyPatch, type NewKeyInput } from "./validate";

const CACHE_MS = 60_000;
const CACHE_MAX = 5_000;
/** Mongo del backend es remoto: si no contesta en este tiempo, el pedido no lo espera. */
const LOOKUP_TIMEOUT_MS = 1_500;
/** Después de servir una respuesta vieja por una falla, se reintenta Mongo a los 10 s, no en cada pedido. */
const STALE_RETRY_MS = 10_000;
const OBJECT_ID = /^[a-f0-9]{24}$/;

export interface ApiKeyRecord {
  id: string;
  prefix: string;
  label: string;
  ownerUid: string;
  ownerEmail: string | null;
  company: string;
  useCase: string;
  website: string | null;
  plan: PlanId;
  limits: Partial<Limits> | null;
  status: "active" | "revoked";
  createdAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
  notes: string | null;
}

/** Lo mínimo del modelo de mongoose que usa el store. */
export interface KeyModel {
  findOne(filter: Record<string, unknown>): { lean(): Promise<any> };
  find(filter: Record<string, unknown>): { sort(s: Record<string, 1 | -1>): { lean(): Promise<any[]> } };
  countDocuments(filter: Record<string, unknown>): Promise<number>;
  create(doc: Record<string, unknown>): Promise<any>;
  findOneAndUpdate(
    filter: Record<string, unknown>,
    update: { $set: Record<string, unknown> },
    opts: { new: true }
  ): { lean(): Promise<any> };
  updateMany(filter: Record<string, unknown>, update: { $set: Record<string, unknown> }): Promise<unknown>;
}

export interface KeyStore {
  findActiveByHash(hash: string): Promise<ApiKeyRecord | null>;
  create(input: NewKeyInput): Promise<{ record: ApiKeyRecord; plaintext: string }>;
  list(ownerUid?: string): Promise<ApiKeyRecord[]>;
  update(id: string, patch: KeyPatch, ownerUid?: string): Promise<ApiKeyRecord | null>;
  touchLastUsed(ids: string[], at: Date): Promise<void>;
}

export class TooManyKeysError extends Error {
  constructor() {
    super("too_many_keys");
    this.name = "TooManyKeysError";
  }
}

function iso(value: unknown): string | null {
  if (!value) return null;
  const d = new Date(value as string | number | Date);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function toRecord(doc: any): ApiKeyRecord {
  return {
    id: String(doc._id),
    prefix: String(doc.prefix ?? ""),
    label: String(doc.label ?? ""),
    ownerUid: String(doc.ownerUid ?? ""),
    ownerEmail: doc.ownerEmail ?? null,
    company: String(doc.company ?? ""),
    useCase: String(doc.useCase ?? ""),
    website: doc.website ?? null,
    plan: isPlanId(doc.plan) ? doc.plan : "free",
    limits: doc.limits ?? null,
    status: doc.status === "revoked" ? "revoked" : "active",
    createdAt: iso(doc.createdAt) ?? new Date(0).toISOString(),
    revokedAt: iso(doc.revokedAt),
    lastUsedAt: iso(doc.lastUsedAt),
    notes: doc.notes ?? null,
  };
}

/** Una espera con tope. `setTimeout` (no un intervalo): no es trabajo programado dentro de la API. */
function withDeadline<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Mongo no contestó en ${ms} ms`)), ms);
  });
  return Promise.race([work, deadline]).finally(() => clearTimeout(timer));
}

export function createKeyStore(
  model: KeyModel,
  opts: { now?: () => number; generate?: () => string; lookupTimeoutMs?: number } = {}
): KeyStore {
  const now = opts.now ?? Date.now;
  const generate = opts.generate ?? (() => generateCredential());
  const lookupTimeoutMs = opts.lookupTimeoutMs ?? LOOKUP_TIMEOUT_MS;
  const cache = new Map<string, { at: number; record: ApiKeyRecord | null }>();

  return {
    async findActiveByHash(hash) {
      const hit = cache.get(hash);
      if (hit && now() - hit.at < CACHE_MS) return hit.record;
      let doc: any;
      try {
        doc = await withDeadline(model.findOne({ keyHash: hash, status: "active" }).lean(), lookupTimeoutMs);
      } catch (e) {
        // Mongo caído o colgado: la última respuesta conocida vale más que hacer esperar (o degradar)
        // a un cliente que paga. Sin respuesta conocida, se tira y el middleware lo deja pasar.
        if (hit) {
          cache.set(hash, { at: now() - CACHE_MS + STALE_RETRY_MS, record: hit.record });
          return hit.record;
        }
        throw e;
      }
      const record = doc ? toRecord(doc) : null;
      if (cache.size >= CACHE_MAX) cache.clear();
      cache.set(hash, { at: now(), record });
      return record;
    },

    async create(input) {
      const active = await model.countDocuments({ ownerUid: input.ownerUid, status: "active" });
      if (active >= MAX_ACTIVE_PER_OWNER) throw new TooManyKeysError();
      const plaintext = generate();
      const doc = await model.create({
        keyHash: hashCredential(plaintext),
        prefix: displayPrefix(plaintext),
        label: input.label,
        ownerUid: input.ownerUid,
        ownerEmail: input.ownerEmail,
        company: input.company,
        useCase: input.useCase,
        website: input.website,
        plan: "free",
        limits: null,
        status: "active",
        createdAt: new Date(now()),
        revokedAt: null,
        lastUsedAt: null,
        notes: null,
      });
      const plain = typeof doc?.toObject === "function" ? doc.toObject() : doc;
      cache.clear();
      return { record: toRecord(plain), plaintext };
    },

    async list(ownerUid) {
      const docs = await model.find(ownerUid ? { ownerUid } : {}).sort({ createdAt: -1 }).lean();
      return docs.map(toRecord);
    },

    async update(id, patch, ownerUid) {
      if (!OBJECT_ID.test(id)) return null;
      const filter: Record<string, unknown> = { _id: id };
      if (ownerUid) filter.ownerUid = ownerUid;
      const set: Record<string, unknown> = {};
      if (patch.label !== undefined) set.label = patch.label;
      if (patch.plan !== undefined) set.plan = patch.plan;
      if (patch.limits !== undefined) set.limits = patch.limits;
      if (patch.notes !== undefined) set.notes = patch.notes;
      if (patch.status !== undefined) {
        set.status = patch.status;
        set.revokedAt = patch.status === "revoked" ? new Date(now()) : null;
      }
      if (!Object.keys(set).length) return null;
      const doc = await model.findOneAndUpdate(filter, { $set: set }, { new: true }).lean();
      cache.clear();
      return doc ? toRecord(doc) : null;
    },

    async touchLastUsed(ids, at) {
      const valid = ids.filter((id) => OBJECT_ID.test(id));
      if (!valid.length) return;
      await model.updateMany({ _id: { $in: valid } }, { $set: { lastUsedAt: at } });
    },
  };
}
