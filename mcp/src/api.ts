// Types + HTTP client for the cambio-uruguay public API.
//
// The API is the single source of truth (https://api.cambio-uruguay.com).
// `CambioApi` is the seam the pure tool handlers depend on, so they can be
// unit-tested with a fake implementation and no network.

/** One rate quote from `GET /` (a house's buy/sell for a currency). */
export interface RateRow {
  code: string;
  date: string;
  type: string;
  origin: string;
  buy: number;
  sell: number;
  name: string;
}

/** House metadata from `GET /localData`, keyed by origin id. */
export interface HouseInfo {
  name: string;
  website?: string;
  maps?: string;
  bcu?: string;
  departments?: string[];
}

/** Read-only seam over the public API consumed by the tool handlers. */
export interface CambioApi {
  /** `GET /` — every house's current quotes for every currency. */
  getRates(): Promise<RateRow[]>;
  /** `GET /localData` — house metadata keyed by origin id. */
  getLocalData(): Promise<Record<string, HouseInfo>>;
  /** `GET /evolution/:origin/:currency?period=N` — historical series + stats. */
  getEvolution(origin: string, currency: string, period?: number): Promise<unknown>;
}

const DEFAULT_BASE_URL = "https://api.cambio-uruguay.com";

/** Live HTTP client over the public API using the global `fetch`. */
export function httpCambioApi(baseUrl: string = DEFAULT_BASE_URL): CambioApi {
  const base = baseUrl.replace(/\/$/, "");

  async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${base}${path}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`API ${path} failed: ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as T;
  }

  return {
    getRates: () => get<RateRow[]>("/"),
    getLocalData: () => get<Record<string, HouseInfo>>("/localData"),
    getEvolution: (origin, currency, period = 6) =>
      get<unknown>(`/evolution/${encodeURIComponent(origin)}/${encodeURIComponent(currency)}?period=${period}`),
  };
}
