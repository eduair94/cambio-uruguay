// HTTP seam over the public cambio-uruguay.com site API (`/api/*`, served by the
// Nuxt app — rentals, cars and product directories live there, not in the rates API).
//
// Handlers depend on the `SiteApi` interface so they can be unit-tested with a fake.
// The live client adds a small TTL cache, in-flight de-duplication, a timeout and one
// retry on gateway errors (a cold app worker can take a minute to warm a catalogue).
// POST bodies are never cached or logged: household incomes and coordinates travel there.

import { toQuery, type QueryValue } from "./format.js";

export const VERSION = "0.2.0";
export const DEFAULT_SITE_BASE_URL = "https://cambio-uruguay.com";

export interface SiteRequestOptions {
  /** Cache a GET for this long (ms). 0 or undefined = never cached. */
  ttlMs?: number;
  timeoutMs?: number;
  /** One retry on 502/503/504 or a network error. Default true. */
  retry?: boolean;
}

export interface SiteApi {
  get<T>(path: string, query?: Record<string, QueryValue>, opts?: SiteRequestOptions): Promise<T>;
  post<T>(path: string, body: unknown, opts?: SiteRequestOptions): Promise<T>;
}

export const TTL = { search: 60_000, catalog: 600_000 } as const;

/** An upstream failure, already phrased for the person reading the assistant's answer. */
export class SiteError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "SiteError";
  }
}

export function siteErrorMessage(status: number): string {
  if (status === 400) return "El sitio rechazó los parámetros de la búsqueda (revisá valores y rangos).";
  if (status === 404) return "No existe o ya no está publicado en cambio-uruguay.com.";
  if (status === 429) return "Se alcanzó el límite de consultas del sitio; reintentá en un minuto.";
  if (status >= 500) return "El servicio de cambio-uruguay.com está temporalmente no disponible; reintentá en unos minutos.";
  return `El sitio respondió con un error (${status}).`;
}

const RETRYABLE = new Set([502, 503, 504]);
const MAX_CACHE_ENTRIES = 200;

interface Deps {
  fetch?: typeof fetch;
  now?: () => number;
  userAgent?: string;
}

export function httpSiteApi(baseUrl: string = DEFAULT_SITE_BASE_URL, deps: Deps = {}): SiteApi {
  const base = baseUrl.replace(/\/$/, "");
  const doFetch = deps.fetch ?? fetch;
  const now = deps.now ?? Date.now;
  const userAgent = deps.userAgent ?? `cambio-uruguay-mcp/${VERSION} (+https://mcp.cambio-uruguay.com)`;
  const cache = new Map<string, { until: number; value: unknown }>();
  const inflight = new Map<string, Promise<unknown>>();

  async function once<T>(url: string, init: RequestInit, timeoutMs: number): Promise<T> {
    let res: Response;
    try {
      res = await doFetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    } catch (error) {
      const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
      throw new SiteError(
        timedOut ? 504 : 503,
        timedOut
          ? "cambio-uruguay.com tardó demasiado en responder; reintentá en un momento."
          : "No se pudo conectar con cambio-uruguay.com; reintentá en unos minutos."
      );
    }
    if (!res.ok) throw new SiteError(res.status, siteErrorMessage(res.status));
    try {
      return (await res.json()) as T;
    } catch {
      throw new SiteError(502, "cambio-uruguay.com devolvió una respuesta ilegible.");
    }
  }

  async function request<T>(url: string, init: RequestInit, opts: SiteRequestOptions): Promise<T> {
    const timeoutMs = opts.timeoutMs ?? 25_000;
    try {
      return await once<T>(url, init, timeoutMs);
    } catch (error) {
      if (opts.retry === false || !(error instanceof SiteError) || !RETRYABLE.has(error.status)) throw error;
      return once<T>(url, init, timeoutMs);
    }
  }

  const headers = { accept: "application/json", "user-agent": userAgent };

  return {
    async get<T>(path: string, query?: Record<string, QueryValue>, opts: SiteRequestOptions = {}): Promise<T> {
      const url = `${base}${path}${toQuery(query)}`;
      const ttl = opts.ttlMs ?? 0;
      const hit = ttl > 0 ? cache.get(url) : undefined;
      if (hit && hit.until > now()) return hit.value as T;
      const pending = inflight.get(url);
      if (pending) return pending as Promise<T>;
      const promise = request<T>(url, { headers }, opts)
        .then((value) => {
          if (ttl > 0) {
            if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value!);
            cache.set(url, { until: now() + ttl, value });
          }
          return value;
        })
        .finally(() => inflight.delete(url));
      inflight.set(url, promise);
      return promise;
    },
    post<T>(path: string, body: unknown, opts: SiteRequestOptions = {}): Promise<T> {
      return request<T>(
        `${base}${path}`,
        { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify(body) },
        opts
      );
    },
  };
}
