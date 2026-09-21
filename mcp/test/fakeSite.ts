import type { QueryValue } from "../src/format";
import { SiteError, type SiteApi } from "../src/site";

export interface Call {
  method: "GET" | "POST";
  path: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

type Route = unknown | ((call: Call) => unknown);

/** A fake SiteApi keyed by path; records every call. A route may be a value, a function, or a SiteError. */
export function fakeSite(routes: Record<string, Route>) {
  const calls: Call[] = [];
  const answer = (call: Call) => {
    calls.push(call);
    const route = routes[call.path];
    if (route === undefined) throw new SiteError(404, `no route for ${call.path}`);
    const value = typeof route === "function" ? (route as (c: Call) => unknown)(call) : route;
    if (value instanceof Error) throw value;
    return structuredClone(value);
  };
  const site: SiteApi = {
    get: async <T>(path: string, query?: Record<string, QueryValue>) => answer({ method: "GET", path, query }) as T,
    post: async <T>(path: string, body: unknown) => answer({ method: "POST", path, body }) as T,
  };
  return { site, calls };
}
