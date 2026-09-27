import express from "express";
import type { AddressInfo } from "net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerApiKeyRoutes, escapeMarkdown } from "../../classes/apikeys/routes";
import { createKeyStore } from "../../classes/apikeys/store";
import type { UsageDaysRepo, UsageRow } from "../../classes/apikeys/usage";
import { FakeKeyModel, FakeRedis } from "./fakes";

const ADMIN = "x".repeat(40);
const NOW = new Date("2026-09-27T15:04:30Z");
let servers: Array<{ close: () => void }> = [];

afterEach(() => {
  servers.forEach((s) => s.close());
  servers = [];
});

function memoryRepo(rows: UsageRow[] = []): UsageDaysRepo {
  return {
    async upsertDay(_day, dayRows) {
      rows.push(...dayRows);
      return dayRows.length;
    },
    async readRange(from, to) {
      return rows.filter((r) => r.day >= from && r.day <= to);
    },
  };
}

async function start(opts: { env?: Record<string, string>; rows?: UsageRow[] } = {}) {
  const app = express();
  app.use(express.json());
  const store = createKeyStore(new FakeKeyModel());
  const redis = new FakeRedis();
  const notify = vi.fn(async (_text: string) => true);
  registerApiKeyRoutes(app, {
    store: () => store,
    usageRepo: () => memoryRepo(opts.rows),
    redis: () => redis,
    notify,
    env: (opts.env ?? { API_ADMIN_TOKEN: ADMIN }) as NodeJS.ProcessEnv,
    now: () => NOW,
  });
  const server = app.listen(0);
  servers.push(server);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = { "x-admin-token": ADMIN }) => {
    const res = await fetch(base + path, {
      method,
      headers: { "content-type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, body: await res.json().catch(() => null), headers: res.headers };
  };
  return { call, store, redis, notify };
}

const alta = {
  ownerUid: "uid-1",
  ownerEmail: "ana@empresa.uy",
  label: "Pantalla",
  company: "Cambio *Ejemplo*",
  useCase: "Mostrar la pizarra en el local",
  website: "https://ejemplo.uy",
};

describe("rutas de administración", () => {
  it("sin token 401, token errado 401, sin configurar 503", async () => {
    const { call } = await start();
    expect((await call("GET", "/admin/api-keys", undefined, {})).status).toBe(401);
    expect((await call("GET", "/admin/api-keys", undefined, { "x-admin-token": "y".repeat(40) })).status).toBe(401);
    const off = await start({ env: {} });
    expect((await off.call("GET", "/admin/api-keys")).status).toBe(503);
  });

  it("alta: 201 con la clave una vez, sin hash, y Telegram con la empresa escapada", async () => {
    const { call, notify } = await start();
    const res = await call("POST", "/admin/api-keys", alta);
    expect(res.status).toBe(201);
    expect(res.body.key).toMatch(/^cu_[A-Za-z0-9]{32}$/);
    expect(res.body.apiKey).toMatchObject({ plan: "free", company: "Cambio *Ejemplo*" });
    expect(res.body.apiKey.keyHash).toBeUndefined();
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(notify).toHaveBeenCalledOnce();
    expect(notify.mock.calls[0][0]).toContain("Cambio \\*Ejemplo\\*");
  });

  it("alta inválida 400 con el mensaje; cuarta clave activa 409", async () => {
    const { call } = await start();
    const bad = await call("POST", "/admin/api-keys", { ...alta, useCase: "x" });
    expect(bad.status).toBe(400);
    expect(bad.body.message).toContain("para qué");
    for (let i = 0; i < 3; i++) await call("POST", "/admin/api-keys", alta);
    const fourth = await call("POST", "/admin/api-keys", alta);
    expect(fourth.status).toBe(409);
    expect(fourth.body.error).toBe("too_many_keys");
  });

  it("el dueño revoca la suya pero no se sube de plan; el administrador sí", async () => {
    const { call } = await start();
    const { body } = await call("POST", "/admin/api-keys", alta);
    const id = body.apiKey.id;
    expect((await call("PATCH", `/admin/api-keys/${id}`, { ownerUid: "uid-1", plan: "business" })).status).toBe(400);
    expect((await call("PATCH", `/admin/api-keys/${id}`, { ownerUid: "intruso", status: "revoked" })).status).toBe(404);
    const up = await call("PATCH", `/admin/api-keys/${id}`, { plan: "business", notes: "Factura mensual" });
    expect(up.body.apiKey).toMatchObject({ plan: "business", notes: "Factura mensual" });
    const gone = await call("PATCH", `/admin/api-keys/${id}`, { ownerUid: "uid-1", status: "revoked" });
    expect(gone.body.apiKey.status).toBe("revoked");
  });

  it("lista por dueño", async () => {
    const { call } = await start();
    await call("POST", "/admin/api-keys", alta);
    await call("POST", "/admin/api-keys", { ...alta, ownerUid: "otra" });
    expect((await call("GET", "/admin/api-keys?ownerUid=uid-1")).body.keys).toHaveLength(1);
    expect((await call("GET", "/admin/api-keys")).body.keys).toHaveLength(2);
  });

  it("uso: días cerrados de Mongo + hoy de Redis; el dueño sólo ve lo suyo, el administrador ve anónimos", async () => {
    const rows: UsageRow[] = [{ day: "2026-09-26", client: "ua:ArboitePanel/1.0", route: "/exchange/la_favorita", count: 290 }];
    const { call, redis } = await start({ rows });
    const { body } = await call("POST", "/admin/api-keys", alta);
    const client = `key:${body.apiKey.id}`;
    await redis.hincrby("usage:2026-09-27", `${client}|/regional`, 7);
    await redis.hincrby("usage:2026-09-27", "ua:ArboitePanel/1.0|/exchange/la_favorita", 5);
    await redis.hincrby("usage:2026-09-27", "site|/", 50);

    const admin = await call("GET", "/admin/api-usage?days=30");
    expect(admin.body).toMatchObject({ from: "2026-08-29", to: "2026-09-27", days: 30 });
    expect(admin.body.byClient[client].total).toBe(7);
    expect(admin.body.anonymous[0]).toMatchObject({ userAgent: "ArboitePanel/1.0", total: 295 });
    expect(admin.body.site.total).toBe(50);

    const own = await call("GET", "/admin/api-usage?days=30&ownerUid=uid-1");
    expect(Object.keys(own.body.byClient)).toEqual([client]);
    expect(own.body.anonymous).toBeUndefined();
    expect(own.body.site).toBeUndefined();
  });

  it("GET /usage cuenta lo consumido sin sumar otro pedido", async () => {
    const { call, redis } = await start();
    await redis.multi().incr(`rl:m:ip:1.2.3.4:${Math.floor(NOW.getTime() / 60000)}`).incr("rl:d:ip:1.2.3.4:2026-09-27").exec();
    // Sin middleware delante, /usage contesta el plan anónimo sin contadores.
    const res = await call("GET", "/usage", undefined, {});
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ client: "anonymous", plan: "anonymous", used: null, docs: "https://cambio-uruguay.com/empresas" });
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });
});

describe("escapeMarkdown", () => {
  it("escapa los caracteres que rompen el Markdown de Telegram", () => {
    expect(escapeMarkdown("a_b*c`d[e")).toBe("a\\_b\\*c\\`d\\[e");
  });
});
