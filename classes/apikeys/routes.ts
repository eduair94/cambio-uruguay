// Rutas de las claves de API: administración (`/admin/*`, con token) y `GET /usage` (pública).
//
// Las de administración las llama SÓLO el servidor del app (app/server/utils/apiAdmin.ts) con
// `X-Admin-Token = API_ADMIN_TOKEN`; el navegador nunca ve el token. Cuando el app pide en nombre de
// un usuario manda su `ownerUid`, y eso ACOTA: sólo sus claves, sólo revocar o renombrar, sólo su
// uso. Sin `ownerUid` es el dueño del sitio: cambia planes y ve a los anónimos.
import { timingSafeEqual } from "crypto";
import type { Application, NextFunction, Request, RequestHandler, Response } from "express";
import { readCounts, readUsage, type RedisLike } from "./counters";
import { DOCS_URL, type ApiClientInfo } from "./middleware";
import { limitsForJson } from "./plans";
import { TooManyKeysError, type ApiKeyRecord, type KeyStore } from "./store";
import { rankAnonymous, rowsFromHash, summarize, type UsageDaysRepo, type UsageRow } from "./usage";
import { MAX_ACTIVE_PER_OWNER, validateNewKey, validatePatch } from "./validate";
import { dayMinus, montevideoDay, windowKeys } from "./window";

export interface RouteDeps {
  store: () => KeyStore;
  usageRepo: () => UsageDaysRepo;
  redis: () => RedisLike | null;
  notify: (text: string) => Promise<boolean>;
  env?: NodeJS.ProcessEnv;
  now?: () => Date;
}

export function escapeMarkdown(text: string): string {
  return String(text).replace(/[_*`[]/g, (c) => `\\${c}`);
}

export function adminAuth(env: NodeJS.ProcessEnv = process.env): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const expected = String(env.API_ADMIN_TOKEN || "");
    if (!expected) {
      return res.status(503).json({ error: "admin_disabled", message: "API_ADMIN_TOKEN no está configurado." });
    }
    const given = Buffer.from(String(req.headers["x-admin-token"] || ""));
    const wanted = Buffer.from(expected);
    if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) {
      return res.status(401).json({ error: "unauthorized" });
    }
    res.setHeader("Cache-Control", "private, no-store");
    return next();
  };
}

function newKeyMessage(record: ApiKeyRecord): string {
  const lines = [
    "*Nueva clave de la API*",
    `Empresa: ${escapeMarkdown(record.company)}`,
    `Uso: ${escapeMarkdown(record.useCase)}`,
    `Clave: ${escapeMarkdown(record.label)} (${escapeMarkdown(record.prefix)}…)`,
  ];
  if (record.website) lines.push(`Sitio: ${escapeMarkdown(record.website)}`);
  if (record.ownerEmail) lines.push(`Correo: ${escapeMarkdown(record.ownerEmail)}`);
  return lines.join("\n");
}

/** Lo que ve el dueño de una clave: todo menos las notas internas del administrador. */
function forOwner(record: ApiKeyRecord): Omit<ApiKeyRecord, "notes"> {
  const { notes: _notes, ...visible } = record;
  return visible;
}

function fail(res: Response, e: unknown) {
  console.error("[apikeys] ruta de administración:", (e as Error)?.message || e);
  return res.status(500).json({ error: "internal", message: "No se pudo completar la operación." });
}

export function registerApiKeyRoutes(app: Application, deps: RouteDeps): void {
  const auth = adminAuth(deps.env ?? process.env);
  const now = deps.now ?? (() => new Date());

  app.post("/admin/api-keys", auth, async (req, res) => {
    const parsed = validateNewKey(req.body);
    if (parsed.ok === false) return res.status(400).json({ error: "invalid_input", message: parsed.error });
    try {
      const { record, plaintext } = await deps.store().create(parsed.value);
      void deps.notify(newKeyMessage(record)).catch(() => false);
      return res.status(201).json({ key: plaintext, apiKey: forOwner(record) });
    } catch (e) {
      if (e instanceof TooManyKeysError) {
        return res.status(409).json({
          error: "too_many_keys",
          message: `Hay un tope de ${MAX_ACTIVE_PER_OWNER} claves activas por cuenta. Revocá una para crear otra.`,
        });
      }
      return fail(res, e);
    }
  });

  app.get("/admin/api-keys", auth, async (req, res) => {
    try {
      const ownerUid = typeof req.query.ownerUid === "string" && req.query.ownerUid ? req.query.ownerUid : undefined;
      const keys = await deps.store().list(ownerUid);
      return res.json({ keys: ownerUid ? keys.map(forOwner) : keys });
    } catch (e) {
      return fail(res, e);
    }
  });

  app.patch("/admin/api-keys/:id", auth, async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const ownerUid = typeof body.ownerUid === "string" && body.ownerUid ? body.ownerUid : undefined;
    const { ownerUid: _ignored, ...rest } = body;
    const parsed = validatePatch(rest, Boolean(ownerUid));
    if (parsed.ok === false) return res.status(400).json({ error: "invalid_input", message: parsed.error });
    try {
      const updated = await deps.store().update(String(req.params.id), parsed.value, ownerUid);
      if (!updated) return res.status(404).json({ error: "not_found", message: "No existe esa clave." });
      return res.json({ apiKey: ownerUid ? forOwner(updated) : updated });
    } catch (e) {
      return fail(res, e);
    }
  });

  app.get("/admin/api-usage", auth, async (req, res) => {
    try {
      const days = Math.min(40, Math.max(1, Number.parseInt(String(req.query.days ?? "30"), 10) || 30));
      const ownerUid = typeof req.query.ownerUid === "string" && req.query.ownerUid ? req.query.ownerUid : undefined;
      const today = montevideoDay(now());
      const from = dayMinus(today, days - 1);
      const repo = deps.usageRepo();
      const rows: UsageRow[] = days > 1 ? await repo.readRange(from, dayMinus(today, 1)) : [];
      const redis = deps.redis();
      let todayRows: UsageRow[] | null = null;
      if (redis) {
        try {
          todayRows = rowsFromHash(today, await readUsage(redis, today));
        } catch {
          todayRows = null;
        }
      }
      rows.push(...(todayRows ?? (await repo.readRange(today, today))));

      if (ownerUid) {
        const own = new Set((await deps.store().list(ownerUid)).map((r) => `key:${r.id}`));
        const summary = summarize(rows.filter((r) => own.has(r.client)), today);
        return res.json({ from, to: today, days, byClient: summary });
      }
      const summary = summarize(rows, today);
      return res.json({
        from,
        to: today,
        days,
        byClient: Object.fromEntries(Object.entries(summary).filter(([c]) => c.startsWith("key:"))),
        anonymous: rankAnonymous(summary),
        site: summary.site ?? null,
      });
    } catch (e) {
      return fail(res, e);
    }
  });

  app.get("/usage", async (_req, res) => {
    const client = res.locals.apiClient as ApiClientInfo | undefined;
    const keys = windowKeys(now());
    const redis = deps.redis();
    const used = client?.subject && redis ? await readCounts(redis, client.subject, keys) : null;
    res.setHeader("Cache-Control", "private, no-store");
    return res.json({
      client: client?.kind ?? "anonymous",
      plan: client?.plan ?? "anonymous",
      keyPrefix: client?.keyPrefix ?? null,
      limits: client?.limits ? limitsForJson(client.limits) : null,
      used,
      resetsAt: { minute: keys.minuteResetsAt.toISOString(), day: keys.dayResetsAt.toISOString() },
      docs: DOCS_URL,
    });
  });
}
