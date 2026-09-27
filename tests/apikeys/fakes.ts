// Dobles en memoria para los tests de classes/apikeys/. No es un .test.ts: vitest no lo recoge solo.
import type { RedisLike, RedisMulti } from "../../classes/apikeys/counters";
import type { KeyModel } from "../../classes/apikeys/store";

export class FakeRedis implements RedisLike {
  strings = new Map<string, number>();
  hashes = new Map<string, Map<string, number>>();
  ttl = new Map<string, number>();
  fail = false;

  private guard() {
    if (this.fail) throw new Error("redis caído");
  }

  multi(): RedisMulti {
    const ops: Array<() => [Error | null, unknown]> = [];
    const chain: RedisMulti = {
      incr: (key: string) => {
        ops.push(() => {
          const next = (this.strings.get(key) ?? 0) + 1;
          this.strings.set(key, next);
          return [null, next];
        });
        return chain;
      },
      expire: (key: string, seconds: number) => {
        ops.push(() => {
          this.ttl.set(key, seconds);
          return [null, 1];
        });
        return chain;
      },
      exec: async () => {
        this.guard();
        return ops.map((op) => op());
      },
    };
    return chain;
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    this.guard();
    const hash = this.hashes.get(key) ?? new Map<string, number>();
    const next = (hash.get(field) ?? 0) + increment;
    hash.set(field, next);
    this.hashes.set(key, hash);
    return next;
  }

  async expire(key: string, seconds: number): Promise<number> {
    this.guard();
    this.ttl.set(key, seconds);
    return 1;
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    this.guard();
    const hash = this.hashes.get(key) ?? new Map<string, number>();
    return Object.fromEntries([...hash].map(([f, v]) => [f, String(v)]));
  }

  async mget(...keys: string[]): Promise<(string | null)[]> {
    this.guard();
    return keys.map((k) => (this.strings.has(k) ? String(this.strings.get(k)) : null));
  }
}

type Doc = Record<string, any>;

function matches(doc: Doc, filter: Record<string, unknown>): boolean {
  return Object.entries(filter).every(([field, expected]) => {
    if (expected && typeof expected === "object" && "$in" in (expected as object)) {
      return ((expected as { $in: unknown[] }).$in).map(String).includes(String(doc[field]));
    }
    return String(doc[field]) === String(expected);
  });
}

/** Modelo de mongoose mínimo en memoria: lo justo para createKeyStore. */
export class FakeKeyModel implements KeyModel {
  docs: Doc[] = [];
  findOneCalls = 0;
  private seq = 0;

  findOne(filter: Record<string, unknown>) {
    this.findOneCalls++;
    return { lean: async () => this.docs.find((d) => matches(d, filter)) ?? null };
  }

  find(filter: Record<string, unknown>) {
    return {
      sort: (_s: Record<string, 1 | -1>) => ({
        lean: async () =>
          this.docs.filter((d) => matches(d, filter)).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
      }),
    };
  }

  async countDocuments(filter: Record<string, unknown>) {
    return this.docs.filter((d) => matches(d, filter)).length;
  }

  async create(doc: Record<string, unknown>) {
    this.seq++;
    const stored = { _id: this.seq.toString(16).padStart(24, "0"), ...doc };
    this.docs.push(stored);
    return stored;
  }

  findOneAndUpdate(filter: Record<string, unknown>, update: { $set: Record<string, unknown> }) {
    return {
      lean: async () => {
        const doc = this.docs.find((d) => matches(d, filter));
        if (!doc) return null;
        Object.assign(doc, update.$set);
        return doc;
      },
    };
  }

  async updateMany(filter: Record<string, unknown>, update: { $set: Record<string, unknown> }) {
    for (const doc of this.docs.filter((d) => matches(d, filter))) Object.assign(doc, update.$set);
    return {};
  }
}
