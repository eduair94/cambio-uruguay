import { OSE_LIST_URL, oseResultCount, parseOseList } from "./parse";
import type { WaterStore } from "./store";
import { BOT_USER_AGENT } from "../power/run";

export const DAILY_PAGES = 30;
const PAGE_SIZE = 10;

export async function fetchOsePage(page: number): Promise<string> {
  const url = page ? `${OSE_LIST_URL}?page=${page}` : OSE_LIST_URL;
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(url, { headers: { "user-agent": BOT_USER_AGENT }, signal: AbortSignal.timeout(30_000) });
      if (response.ok) return await response.text();
      if (response.status < 500 || attempt >= 1) throw new Error(`OSE HTTP ${response.status}`);
    } catch (error) {
      if (attempt >= 1) throw error;
    }
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

/**
 * Reads the newest `pages` list pages (all of them with `pages: "all"`). The first page must parse:
 * an empty first page means OSE changed the layout, and that must fail loudly instead of looking
 * like a month without cuts.
 */
export async function runWaterHarvest({ fetchPage = fetchOsePage, store, pages = DAILY_PAGES, delayMs = 1000, now = new Date() }: {
  fetchPage?: (page: number) => Promise<string>;
  store: WaterStore;
  pages?: number | "all";
  delayMs?: number;
  now?: Date;
}): Promise<{ pages: number; notices: number; total: number | null }> {
  let limit = pages === "all" ? Infinity : pages;
  let read = 0, stored = 0, total: number | null = null;
  for (let page = 0; page < limit; page++) {
    if (page && delayMs) await new Promise(resolve => setTimeout(resolve, delayMs));
    const html = await fetchPage(page);
    const notices = parseOseList(html);
    read++;
    if (page === 0) {
      total = oseResultCount(html);
      if (!notices.length || total === null) throw new Error("OSE list layout changed: first page has no notices");
      if (pages === "all") limit = Math.ceil(total / PAGE_SIZE);
    }
    if (!notices.length) break;
    await store.upsert(notices, now.toISOString());
    stored += notices.length;
  }
  return { pages: read, notices: stored, total };
}
