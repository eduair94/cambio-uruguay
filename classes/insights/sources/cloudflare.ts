// Cliente GraphQL de Cloudflare compartido por las dos fuentes de Cloudflare.
//
// TOKENS EN ORDEN (R8): `CLOUDFLARE_ANALYTICS_TOKEN` y después `CLOUDFLARE_TOKEN`. En el VPS sólo
// existe el segundo (el que purga la caché, con Account Analytics Read). Un token de analytics nuevo
// sin ese permiso no puede romper RUM por tener precedencia: un `authz` pasa al siguiente token, y sólo
// "todos los tokens rechazados" es `inactive`.
//
// RITMO: Cloudflare acepta 300 consultas GraphQL cada 5 minutos por token. Cada consulta espera
// ≥ 1,1 s desde la anterior (≈ 270 cada 5 min) y una corrida hace como mucho 200; la 201 tira
// `CfBudgetError` y el backfill sigue en la próxima corrida.
//
// Nada de lo que devuelve Cloudflare se guarda como texto: el mensaje de `authz` trae el id del token
// (`com.cloudflare.api.token.<id>`). Los errores se arman desde `extensions.code`.
import axios from "axios";

import { CF_MAX_QUERIES_PER_RUN, CF_MIN_INTERVAL_MS } from "../caps";

export const CF_GRAPHQL = "https://api.cloudflare.com/client/v4/graphql";
export const CF_API = "https://api.cloudflare.com/client/v4";
export const CF_DEFAULT_ZONE = "fcd8289e0c93d7f889d8cd583929a4e5";

export class CfAuthzError extends Error {
  constructor() {
    super("ningún token de Cloudflare tiene permiso para esta consulta (authz)");
    this.name = "CfAuthzError";
  }
}

export class CfQueryError extends Error {
  code: string;
  /** El mensaje original nombraba `requestHost_in` (para el respaldo de R19). Sólo el booleano, nunca el texto. */
  namesRequestHostIn: boolean;
  constructor(code: string, namesRequestHostIn = false) {
    super(
      `consulta rechazada (${
        String(code)
          .replace(/[^\w.-]/g, "")
          .slice(0, 40) || "graphql"
      })`
    );
    this.name = "CfQueryError";
    this.code = code;
    this.namesRequestHostIn = namesRequestHostIn;
  }
}

export class CfBudgetError extends Error {
  constructor() {
    super(`tope de ${CF_MAX_QUERIES_PER_RUN} consultas GraphQL por corrida`);
    this.name = "CfBudgetError";
  }
}

/** Los tokens no vacíos y distintos, en orden de preferencia. */
export function cfTokens(env: NodeJS.ProcessEnv = process.env): string[] {
  const out: string[] = [];
  for (const t of [env.CLOUDFLARE_ANALYTICS_TOKEN, env.CLOUDFLARE_TOKEN]) {
    const v = String(t || "").trim();
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

export function cfZoneId(env: NodeJS.ProcessEnv = process.env): string {
  return String(env.CLOUDFLARE_ZONE_ID || CF_DEFAULT_ZONE).trim();
}

export function isAuthzError(errors: any[] | null | undefined): boolean {
  return (errors || []).some(
    (e) => e?.extensions?.code === "authz" || /does not have permission|not authorized/i.test(String(e?.message || ""))
  );
}

export interface HttpLike {
  post(url: string, body: any, config?: any): Promise<{ status: number; data: any }>;
  get(url: string, config?: any): Promise<{ status: number; data: any }>;
}

export interface CfClientDeps {
  http?: HttpLike;
  tokens?: string[];
  zoneId?: string;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  minIntervalMs?: number;
  maxQueries?: number;
}

export interface CfClient {
  /** `scope` recuerda qué token sirvió para ese tipo de consulta, así no se repite el rechazo. */
  graphql(query: string, variables: Record<string, any>, scope?: string): Promise<{ data: any; tokenIndex: number }>;
  accountId(): Promise<string>;
  zoneId: string;
  queriesUsed(): number;
  hasTokens(): boolean;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createCfClient(deps: CfClientDeps = {}): CfClient {
  const http: HttpLike = deps.http || (axios as unknown as HttpLike);
  const tokens = deps.tokens ?? cfTokens();
  const zone = deps.zoneId ?? cfZoneId();
  const sleep = deps.sleep || defaultSleep;
  const now = deps.now || (() => Date.now());
  const minInterval = deps.minIntervalMs ?? CF_MIN_INTERVAL_MS;
  const maxQueries = deps.maxQueries ?? CF_MAX_QUERIES_PER_RUN;
  let used = 0;
  let lastAt: number | null = null;
  const preferred = new Map<string, number>();
  let account: string | null = null;

  const config = (token: string) => ({
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    timeout: 60000,
    validateStatus: () => true,
  });

  async function pace(): Promise<void> {
    if (used >= maxQueries) throw new CfBudgetError();
    const wait = lastAt === null ? 0 : minInterval - (now() - lastAt);
    if (wait > 0) await sleep(wait);
    lastAt = now();
    used += 1;
  }

  async function graphql(query: string, variables: Record<string, any>, scope = "default") {
    if (!tokens.length) throw new CfAuthzError();
    const start = preferred.get(scope) ?? 0;
    const order = [...tokens.keys()].slice(start).concat([...tokens.keys()].slice(0, start));
    for (const index of order) {
      await pace();
      const res = await http.post(CF_GRAPHQL, { query, variables }, config(tokens[index]));
      const status = Number(res?.status || 0);
      if (status === 401 || status === 403) continue; // este token no sirve: el siguiente
      if (status === 429 || status >= 500) throw new CfQueryError(`http-${status}`);
      const errors: any[] = Array.isArray(res?.data?.errors) ? res.data.errors : [];
      if (errors.length) {
        if (isAuthzError(errors)) continue;
        const code = String(errors[0]?.extensions?.code || "graphql");
        const named = errors.some((e) => /requestHost_in/.test(String(e?.message || "")));
        throw new CfQueryError(code, named);
      }
      if (status !== 200) throw new CfQueryError(`http-${status}`);
      preferred.set(scope, index);
      return { data: res.data?.data ?? null, tokenIndex: index };
    }
    throw new CfAuthzError();
  }

  async function accountId(): Promise<string> {
    if (account) return account;
    if (!tokens.length) throw new CfAuthzError();
    for (const token of tokens) {
      const res = await http.get(`${CF_API}/zones/${zone}`, config(token));
      const status = Number(res?.status || 0);
      if (status === 401 || status === 403) continue;
      if (status === 429 || status >= 500) throw new CfQueryError(`http-${status}`);
      const id = res?.data?.result?.account?.id;
      if (status === 200 && id) {
        account = String(id);
        return account;
      }
      // 200 sin cuenta, o 4xx: este token no ve la zona.
    }
    throw new CfAuthzError();
  }

  return { graphql, accountId, zoneId: zone, queriesUsed: () => used, hasTokens: () => tokens.length > 0 };
}

/** `settings.<ds>.notOlderThan` (segundos) → días enteros, o null. */
export function secondsToDays(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n / 86400) : null;
}

/** El campo `dimensions_x` está en `availableFields` (o no hay lista: entonces todo vale). */
export function fieldAvailable(available: string[] | null | undefined, field: string): boolean {
  if (!available || !available.length) return true;
  return available.includes(field) || available.includes(`dimensions_${field}`);
}
