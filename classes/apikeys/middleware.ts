// Middleware Express de las claves de API: quién pide, si le queda cuota y qué se anota.
//
// Se registra en index.ts DESPUÉS de CORS (el preflight OPTIONS nunca llega) y ANTES de la primera
// ruta. Orden de clasificación, del spec: clave (válida → su plan; inválida → 401), IP interna (el
// SSR del sitio, el MCP y los bots: ni cuenta ni mide), lector del sitio por Origin/Referer (sin
// límite, medido como `site`), y anónimo con techo por IP.
//
// Tres fallas que NO pueden tumbar un pedido: Redis caído (pasa sin límite y sin medir), Mongo
// caído al validar una clave (pasa como anónimo) y cualquier excepción propia (pasa). Se registra a
// lo sumo una vez por minuto. No hay timers: nada programado vive en la API (cluster ×2).
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { clientIp, foreignHost, internalIps, isSiteReferrer } from "./client";
import { countRequest, invalidAttempts, meter, noteInvalid, refundDay, type RedisLike } from "./counters";
import { extractCredential, firstHeader, hashCredential } from "./credential";
import { meterRoute, meterUserAgent } from "./normalize";
import { effectiveLimits, planLimits, type Limits, type PlanId } from "./plans";
import type { ApiKeyRecord } from "./store";
import { decide, windowKeys } from "./window";

export type ClientKind = "key" | "internal" | "site" | "anonymous";

export interface ApiClientInfo {
  kind: ClientKind;
  plan: PlanId | "site";
  /** Sujeto de los contadores de límite (`key:<id>` o `ip:<ip>`); null = sin techo. */
  subject: string | null;
  /** Cliente del medidor (`key:<id>`, `ua:<User-Agent>` o `site`); null = no se mide. */
  meterId: string | null;
  keyId: string | null;
  keyPrefix: string | null;
  limits: Limits | null;
}

export interface MiddlewareDeps {
  redis: () => RedisLike | null;
  lookup: (hash: string) => Promise<ApiKeyRecord | null>;
  env?: NodeJS.ProcessEnv;
  now?: () => Date;
  log?: (message: string) => void;
}

export const DOCS_URL = "https://cambio-uruguay.com/empresas";
/** Claves inexistentes por IP y minuto antes de cortar sin consultar Mongo. */
export const MAX_INVALID_PER_MINUTE = 30;
const EXPOSED = "X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-Plan";
const EXEMPT_EXACT = new Set(["/health", "/ping", "/robots.txt", "/favicon.ico"]);
const EXEMPT_PREFIX = ["/api-docs", "/public/", "/admin/"];

export function isExemptPath(path: string): boolean {
  const p = String(path || "").toLowerCase();
  if (EXEMPT_EXACT.has(p)) return true;
  return EXEMPT_PREFIX.some((prefix) => p === prefix.replace(/\/$/, "") || p.startsWith(prefix));
}

function invalid(message: string) {
  return { error: "invalid_api_key", message, docs: DOCS_URL };
}

function classify(req: Request, record: ApiKeyRecord | null, internal: Set<string>, env: NodeJS.ProcessEnv): ApiClientInfo {
  if (record) {
    if (record.plan === "internal") {
      return { kind: "internal", plan: "internal", subject: null, meterId: null, keyId: record.id, keyPrefix: record.prefix, limits: null };
    }
    return {
      kind: "key",
      plan: record.plan,
      subject: `key:${record.id}`,
      meterId: `key:${record.id}`,
      keyId: record.id,
      keyPrefix: record.prefix,
      limits: effectiveLimits(record.plan, record.limits, env),
    };
  }
  const ip = clientIp(req.headers, req.ip);
  if (internal.has(ip)) {
    return { kind: "internal", plan: "internal", subject: null, meterId: null, keyId: null, keyPrefix: null, limits: null };
  }
  if (isSiteReferrer(firstHeader(req.headers.origin), firstHeader(req.headers.referer))) {
    return { kind: "site", plan: "site", subject: null, meterId: "site", keyId: null, keyPrefix: null, limits: null };
  }
  const host = foreignHost(firstHeader(req.headers.origin), firstHeader(req.headers.referer));
  return {
    kind: "anonymous",
    plan: "anonymous",
    subject: `ip:${ip}`,
    meterId: host ? `origin:${host}` : `ua:${meterUserAgent(req.headers["user-agent"])}`,
    keyId: null,
    keyPrefix: null,
    limits: planLimits("anonymous", env),
  };
}

export function createApiKeyMiddleware(deps: MiddlewareDeps): RequestHandler {
  const env = deps.env ?? process.env;
  const now = deps.now ?? (() => new Date());
  const internal = internalIps(env);
  let lastLog = -Infinity;
  const logOnce = (message: string) => {
    const t = now().getTime();
    if (t - lastLog < 60_000) return;
    lastLog = t;
    (deps.log ?? console.warn)(`[apikeys] ${message}`);
  };

  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method === "OPTIONS" || isExemptPath(req.path)) return next();
    try {
      const credential = extractCredential(req.headers, req.query as Record<string, unknown>);
      if (credential.kind === "malformed") {
        res.setHeader("Cache-Control", "no-store");
        return res
          .status(401)
          .json(invalid("La clave no tiene el formato de Cambio Uruguay: cu_ seguido de 32 letras y números."));
      }

      let record: ApiKeyRecord | null = null;
      if (credential.kind === "present") {
        const redis = deps.redis();
        const ip = clientIp(req.headers, req.ip);
        const keysNow = windowKeys(now());
        // Una clave inventada por pedido cuesta una consulta a Mongo cada una (el caché negativo
        // sólo ataja las repetidas): pasado el tope, esa IP espera el minuto sin consultar nada.
        if (redis && (await invalidAttempts(redis, ip, keysNow)) >= MAX_INVALID_PER_MINUTE) {
          res.setHeader("Cache-Control", "no-store");
          res.setHeader("Retry-After", String(Math.max(1, Math.ceil((keysNow.minuteResetsAt.getTime() - now().getTime()) / 1000))));
          return res.status(429).json({
            error: "too_many_invalid_keys",
            message: "Demasiadas claves que no existen desde esta dirección. Probá de nuevo en un minuto.",
            docs: DOCS_URL,
          });
        }
        let found: ApiKeyRecord | null | undefined;
        try {
          found = await deps.lookup(hashCredential(credential.value));
        } catch (e: any) {
          logOnce(`no se pudo validar una clave, el pedido pasa como anónimo: ${e?.message || e}`);
          found = undefined;
        }
        if (found === null) {
          if (redis) await noteInvalid(redis, ip, keysNow);
          res.setHeader("Cache-Control", "no-store");
          return res.status(401).json(invalid("La clave no existe o fue revocada."));
        }
        record = found ?? null;
      }

      const client = classify(req, record, internal, env);
      res.locals.apiClient = client;
      if (client.kind === "internal") return next();

      res.setHeader("X-Plan", client.plan);
      res.setHeader("Access-Control-Expose-Headers", EXPOSED);

      const redis = deps.redis();
      const at = now();
      const keys = windowKeys(at);

      if (redis && client.meterId) {
        const meterId = client.meterId;
        res.on("finish", () => {
          void meter(redis, keys.day, meterId, meterRoute(req.path, res.statusCode));
        });
      }

      if (client.subject && client.limits) {
        const counts = redis ? await countRequest(redis, client.subject, keys) : null;
        if (!counts) {
          logOnce("Redis no respondió: el pedido pasa sin límite y sin medir");
        } else {
          const decision = decide(counts, client.limits, keys);
          res.setHeader("X-RateLimit-Limit", String(decision.limit));
          res.setHeader("X-RateLimit-Remaining", String(decision.remaining));
          res.setHeader("X-RateLimit-Reset", String(Math.ceil(decision.resetAt.getTime() / 1000)));
          if (!decision.allowed) {
            if (decision.exceeded === "minute") await refundDay(redis!, client.subject, keys);
            const wait = Math.max(1, Math.ceil((decision.resetAt.getTime() - at.getTime()) / 1000));
            res.setHeader("Retry-After", String(wait));
            res.setHeader("Cache-Control", "no-store");
            return res.status(429).json({
              error: "rate_limited",
              window: decision.exceeded,
              limit: decision.limit,
              resetAt: decision.resetAt.toISOString(),
              message:
                decision.exceeded === "day"
                  ? `Llegaste a ${decision.limit} pedidos en el día. Se renueva a la medianoche de Montevideo.`
                  : `Llegaste a ${decision.limit} pedidos en un minuto. Probá de nuevo en ${wait} s.`,
              docs: DOCS_URL,
            });
          }
        }
      }
      return next();
    } catch (e: any) {
      logOnce(`falla del middleware, el pedido pasa: ${e?.message || e}`);
      return next();
    }
  };
}
