// The browser half of the Facebook reader. It ATTACHES to the logged-in Chrome that pm2
// `facebook_profile_browser` keeps alive on the 104 box (the same contract as the trustpilot bridge
// on :9657, which only offers text search and drops the GraphQL fields): it opens its own tabs,
// closes them, and disconnects without ever closing the browser. A login or checkpoint page ends
// Facebook for the run — never retried, never "fixed" from here.
import type { Browser, HTTPResponse, Page } from "puppeteer-core";
import { FB_VEHICLES_CATEGORY, fbCardsFromText, fbItemFromTexts, type FbCard, type FbItem } from "./facebook";

export class FacebookSessionError extends Error {}

const FEED_URL = "https://www.facebook.com/marketplace/montevideo/vehicles?sortBy=creation_time_descend";
const searchUrl = (query: string): string => `https://www.facebook.com/marketplace/montevideo/search?query=${encodeURIComponent(query)}`;
const itemUrl = (id: string): string => `https://www.facebook.com/marketplace/item/${id}/`;
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export async function facebookSessionOk(healthUrl = process.env.AUTOS_FB_HEALTH_URL || "http://127.0.0.1:9246/health"): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(healthUrl, { signal: controller.signal });
    if (!response.ok) return false;
    const body = (await response.json()) as { sessionStatus?: unknown };
    return body?.sessionStatus === "valid";
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function guard(url: string): void {
  if (/facebook\.com\/(?:login|checkpoint)|\/login\.php/.test(url)) throw new FacebookSessionError("la sesión de Facebook no es válida");
}

async function pageTexts(page: Page, url: string, work: () => Promise<void>): Promise<string[]> {
  const texts: string[] = [];
  const pending: Array<Promise<void>> = [];
  const onResponse = (response: HTTPResponse): void => {
    if (!response.url().includes("/api/graphql")) return;
    pending.push(response.text().then(text => { texts.push(text); }, () => undefined));
  };
  page.on("response", onResponse);
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    guard(page.url());
    await work();
    guard(page.url());
    const embedded = (await page.evaluate(() =>
      Array.from(document.querySelectorAll("script[type=\"application/json\"]")).map(node => node.textContent || ""),
    )) as string[];
    await Promise.all(pending);
    return [...embedded, ...texts];
  } finally {
    page.off("response", onResponse);
  }
}

export interface FacebookRead {
  cards: FbCard[];
  items: FbItem[];
  pages: number;
  note: string | null;
  sessionLost: boolean;
}

export async function readFacebookVehicles(options: {
  feedScrolls: number;
  queries: readonly string[];
  queryScrolls: number;
  /** Given the cards read so far, which item pages to open (see fbDetailQueue). */
  itemIds: (cards: readonly FbCard[]) => Promise<string[]>;
  itemGapMs: number;
  maxDurationMs: number;
  cdpUrl?: string;
}): Promise<FacebookRead> {
  const deadline = Date.now() + options.maxDurationMs;
  const cards = new Map<string, FbCard>();
  const items: FbItem[] = [];
  const result: FacebookRead = { cards: [], items, pages: 0, note: null, sessionLost: false };
  let browser: Browser | null = null;
  const withPage = async <T>(task: (page: Page) => Promise<T>): Promise<T> => {
    const page = await browser!.newPage();
    try {
      await page.setViewport({ width: 1400, height: 900 });
      return await task(page);
    } finally {
      await page.close().catch(() => undefined);
    }
  };
  const readList = async (url: string, scrolls: number): Promise<void> => {
    const texts = await withPage(page => pageTexts(page, url, async () => {
      await page.waitForSelector("a[href*=\"/marketplace/item/\"]", { timeout: 30_000 }).catch(() => null);
      for (let index = 0; index < scrolls && Date.now() < deadline; index++) {
        await page.evaluate(() => window.scrollBy(0, window.innerHeight * 3));
        await sleep(2_200);
      }
      await sleep(1_500);
    }));
    result.pages++;
    for (const text of texts) {
      for (const card of fbCardsFromText(text)) {
        // Searches mix every category; the vehicles feed may carry "suggested" items too.
        if (card.categoryId && card.categoryId !== FB_VEHICLES_CATEGORY) continue;
        if (!cards.has(card.id)) cards.set(card.id, card);
      }
    }
  };
  try {
    const puppeteer = (await import("puppeteer-core")).default;
    browser = await puppeteer.connect({
      browserURL: options.cdpUrl || process.env.AUTOS_FB_CDP_URL || "http://127.0.0.1:9224",
      defaultViewport: { width: 1400, height: 900 },
    });
    await readList(FEED_URL, options.feedScrolls);
    for (const query of options.queries) {
      if (Date.now() >= deadline) {
        result.note = "presupuesto agotado";
        break;
      }
      await sleep(options.itemGapMs);
      await readList(searchUrl(query), options.queryScrolls);
    }
    const ids = await options.itemIds([...cards.values()]);
    for (const id of ids) {
      if (Date.now() >= deadline) {
        result.note = result.note ?? "presupuesto agotado";
        break;
      }
      await sleep(options.itemGapMs);
      const readAt = new Date().toISOString();
      const texts = await withPage(page => pageTexts(page, itemUrl(id), () => sleep(6_000)));
      result.pages++;
      const item = fbItemFromTexts(id, texts, readAt);
      if (item) items.push(item);
    }
  } catch (error) {
    if (error instanceof FacebookSessionError) {
      result.sessionLost = true;
      result.note = error.message;
    } else {
      // Only the error class and its first words: messages can name URLs.
      result.note = `falla del navegador: ${String((error as Error)?.name || "Error")}`;
    }
  } finally {
    if (browser) browser.disconnect();
  }
  result.cards = [...cards.values()];
  return result;
}
