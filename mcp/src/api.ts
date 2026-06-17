// Types + HTTP client for the cambio-uruguay public API.
//
// The API is the single source of truth (https://api.cambio-uruguay.com).
// `CambioApi` is the seam the pure tool handlers depend on, so they can be
// unit-tested with a fake implementation and no network.

import { mergeNews, NEWS_FEEDS, parseFeed, type NewsItem } from "./news.js";

export type { NewsItem };

/** AI insight from `POST /ai/insights`. */
export interface InsightResult {
  insight: string;
  type: string;
  cached: boolean;
  truncated: boolean;
}

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
  /** Latest UY dollar/economy headlines (Google News RSS). */
  getNews(limit?: number): Promise<NewsItem[]>;
  /** `POST /ai/insights` — AI market/currency analysis. */
  getInsight(params: { type: string; currency?: string; lang?: string }): Promise<InsightResult>;
}

const DEFAULT_BASE_URL = "https://api.cambio-uruguay.com";

const RSS_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

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

  async function getNews(limit = 12): Promise<NewsItem[]> {
    const settled = await Promise.allSettled(
      NEWS_FEEDS.map(async (url) => {
        const res = await fetch(url, { headers: { "user-agent": RSS_UA } });
        return res.ok ? res.text() : "";
      })
    );
    const items: NewsItem[] = [];
    for (const r of settled) {
      if (r.status === "fulfilled" && r.value) items.push(...parseFeed(r.value));
    }
    return mergeNews(items, limit);
  }

  async function getInsight(params: { type: string; currency?: string; lang?: string }): Promise<InsightResult> {
    const res = await fetch(`${base}/ai/insights`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ lang: "es", ...params }),
    });
    if (!res.ok) {
      throw new Error(`API /ai/insights failed: ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as Partial<InsightResult>;
    return {
      insight: data.insight ?? "",
      type: data.type ?? params.type,
      cached: data.cached ?? false,
      truncated: data.truncated ?? false,
    };
  }

  return {
    getRates: () => get<RateRow[]>("/"),
    getLocalData: () => get<Record<string, HouseInfo>>("/localData"),
    getEvolution: (origin, currency, period = 6) =>
      get<unknown>(`/evolution/${encodeURIComponent(origin)}/${encodeURIComponent(currency)}?period=${period}`),
    getNews,
    getInsight,
  };
}
