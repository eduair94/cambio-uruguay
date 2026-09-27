import { describe, expect, it, vi } from "vitest";
import { hashCredential } from "../../classes/apikeys/credential";
import { createApiKeyMiddleware, isExemptPath } from "../../classes/apikeys/middleware";
import type { ApiKeyRecord } from "../../classes/apikeys/store";
import { FakeRedis } from "./fakes";

const sample = "cu_" + "A".repeat(32);
const NOW = new Date("2026-09-27T15:04:30Z");

function record(over: Partial<ApiKeyRecord> = {}): ApiKeyRecord {
  return {
    id: "0".repeat(23) + "1",
    prefix: sample.slice(0, 8),
    label: "Pantalla",
    ownerUid: "uid-1",
    ownerEmail: null,
    company: "Cambio Ejemplo",
    useCase: "Pizarra en el local",
    website: null,
    plan: "free",
    limits: null,
    status: "active",
    createdAt: NOW.toISOString(),
    revokedAt: null,
    lastUsedAt: null,
    notes: null,
    ...over,
  };
}

function fakeReq(over: Record<string, unknown> = {}) {
  return { method: "GET", path: "/exchange/brou/USD", headers: { "user-agent": "Panel/1.0" }, query: {}, ip: "200.40.1.2", ...over } as any;
}

function fakeRes() {
  const listeners: Record<string, Array<() => void>> = {};
  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    locals: {},
    body: undefined,
    setHeader(name: string, value: string) {
      this.headers[name.toLowerCase()] = value;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      (listeners.finish ?? []).forEach((fn) => fn());
      return this;
    },
    on(event: string, fn: () => void) {
      (listeners[event] ??= []).push(fn);
      return this;
    },
    finish() {
      (listeners.finish ?? []).forEach((fn) => fn());
    },
  };
  return res;
}

async function run(mw: any, req: any) {
  const res = fakeRes();
  const next = vi.fn();
  await mw(req, res, next);
  return { res, next };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function build(opts: { redis?: FakeRedis | null; lookup?: (h: string) => Promise<ApiKeyRecord | null>; env?: Record<string, string> } = {}) {
  const redis = opts.redis === undefined ? new FakeRedis() : opts.redis;
  const mw = createApiKeyMiddleware({
    redis: () => redis,
    lookup: opts.lookup ?? (async () => null),
    env: (opts.env ?? {}) as NodeJS.ProcessEnv,
    now: () => NOW,
    log: () => undefined,
  });
  return { mw, redis };
}

describe("middleware de claves", () => {
  it("anónimo: pasa, lleva cabeceras y se mide por User-Agent", async () => {
    const { mw, redis } = build();
    const { res, next } = await run(mw, fakeReq());
    expect(next).toHaveBeenCalledOnce();
    expect(res.headers["x-plan"]).toBe("anonymous");
    expect(res.headers["x-ratelimit-limit"]).toBe("600");
    expect(res.headers["x-ratelimit-remaining"]).toBe("599");
    expect(res.headers["access-control-expose-headers"]).toContain("X-RateLimit-Remaining");
    res.finish();
    await flush();
    expect(await redis!.hgetall("usage:2026-09-27")).toEqual({ "ua:Panel/1.0|/exchange/brou": "1" });
  });

  it("corta con 429 al pasar el techo, con Retry-After y enlace a /empresas", async () => {
    const { mw } = build({ env: { API_LIMIT_ANONYMOUS_PER_MINUTE: "2" } });
    await run(mw, fakeReq());
    await run(mw, fakeReq());
    const { res, next } = await run(mw, fakeReq());
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(429);
    expect(res.body).toMatchObject({ error: "rate_limited", window: "minute", docs: "https://cambio-uruguay.com/empresas" });
    expect(Number(res.headers["retry-after"])).toBe(30);
  });

  it("los lectores del sitio no cuentan contra la IP compartida y se miden como site", async () => {
    const { mw, redis } = build({ env: { API_LIMIT_ANONYMOUS_PER_MINUTE: "1" } });
    for (let i = 0; i < 5; i++) {
      const { res, next } = await run(mw, fakeReq({ headers: { origin: "https://cambio-uruguay.com", "user-agent": "Mozilla" } }));
      expect(next).toHaveBeenCalledOnce();
      expect(res.headers["x-plan"]).toBe("site");
      expect(res.headers["x-ratelimit-limit"]).toBeUndefined();
      res.finish();
    }
    await flush();
    expect(await redis!.hgetall("usage:2026-09-27")).toEqual({ "site|/exchange/brou": "5" });
  });

  it("interno: ni cuenta ni mide ni pone cabeceras", async () => {
    const { mw, redis } = build({ env: { API_INTERNAL_IPS: "104.234.204.107" } });
    const { res, next } = await run(mw, fakeReq({ ip: "::ffff:104.234.204.107" }));
    expect(next).toHaveBeenCalledOnce();
    expect(res.headers["x-plan"]).toBeUndefined();
    expect(res.locals.apiClient.kind).toBe("internal");
    res.finish();
    await flush();
    expect(redis!.strings.size + redis!.hashes.size).toBe(0);
  });

  it("clave válida: su plan y sus límites propios, medida por id", async () => {
    const doc = record({ plan: "business", limits: { perMinute: 5 } });
    const { mw, redis } = build({ lookup: async (h) => (h === hashCredential(sample) ? doc : null) });
    const { res, next } = await run(mw, fakeReq({ headers: { "x-api-key": sample } }));
    expect(next).toHaveBeenCalledOnce();
    expect(res.headers["x-plan"]).toBe("business");
    expect(res.headers["x-ratelimit-limit"]).toBe("5");
    expect(res.locals.apiClient).toMatchObject({ kind: "key", keyId: doc.id, keyPrefix: "cu_AAAAA" });
    res.finish();
    await flush();
    expect(Object.keys(await redis!.hgetall("usage:2026-09-27"))).toEqual([`key:${doc.id}|/exchange/brou`]);
  });

  it("clave con otra forma o inexistente: 401 con el motivo", async () => {
    const { mw } = build();
    const bad = await run(mw, fakeReq({ headers: { "x-api-key": "hola" } }));
    expect(bad.res.statusCode).toBe(401);
    expect(bad.res.body.error).toBe("invalid_api_key");
    const unknown = await run(mw, fakeReq({ headers: { "x-api-key": sample } }));
    expect(unknown.res.statusCode).toBe(401);
    expect(unknown.res.body.message).toContain("no existe o fue revocada");
  });

  it("Mongo caído al validar: pasa como anónimo, nunca 401 por culpa nuestra", async () => {
    const { mw } = build({ lookup: async () => { throw new Error("mongo caído"); } });
    const { res, next } = await run(mw, fakeReq({ headers: { "x-api-key": sample } }));
    expect(next).toHaveBeenCalledOnce();
    expect(res.headers["x-plan"]).toBe("anonymous");
  });

  it("Redis caído o ausente: pasa sin límite y sin medir", async () => {
    const down = new FakeRedis();
    down.fail = true;
    for (const redis of [down, null]) {
      const { mw } = build({ redis });
      const { res, next } = await run(mw, fakeReq());
      expect(next).toHaveBeenCalledOnce();
      expect(res.headers["x-ratelimit-limit"]).toBeUndefined();
      res.finish();
    }
  });

  it("un 404 se mide como (no-encontrada)", async () => {
    const { mw, redis } = build();
    const { res } = await run(mw, fakeReq({ path: "/.env" }));
    res.statusCode = 404;
    res.finish();
    await flush();
    expect(await redis!.hgetall("usage:2026-09-27")).toEqual({ "ua:Panel/1.0|(no-encontrada)": "1" });
  });

  it("deja afuera salud, documentación, estáticos, administración y el preflight", async () => {
    for (const p of ["/health", "/ping", "/api-docs", "/api-docs.json", "/public/favicon.ico", "/admin/api-keys", "/robots.txt"]) {
      expect(isExemptPath(p), p).toBe(true);
    }
    expect(isExemptPath("/exchange/brou")).toBe(false);
    expect(isExemptPath("/administracion")).toBe(false);
    const { mw, redis } = build();
    const { next } = await run(mw, fakeReq({ method: "OPTIONS" }));
    expect(next).toHaveBeenCalledOnce();
    expect(redis!.strings.size).toBe(0);
  });
});
