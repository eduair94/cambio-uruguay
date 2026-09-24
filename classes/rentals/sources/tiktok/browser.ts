// TikTok lists (a hashtag page, an account page) read from a real Chrome, the way
// elpais_browser.ts opens El País searches: one launch per run, a time budget, close in `finally`.
//
// Measured 2026-09-23:
//   * plain HTTP: `/@user` is a WAF interstitial ("Please wait...") and `/tag/<tag>` ships no
//     videos — the client fetches them from `/api/post/item_list/` and
//     `/api/challenge/item_list/` with signed parameters. We sign nothing: the page's own JS
//     does, and we read the answers as they arrive.
//   * a headless Chrome is answered with an EMPTY body unless
//     `--disable-blink-features=AutomationControlled` is set and the UA does not say
//     HeadlessChrome. A flag and a UA string, not a fingerprint forgery: the browser is a browser.
//   * the tag list only answers once the origin's cookies exist, so the run opens a video page
//     first (`warmUrl`) — 0 items cold, 5 × 30 items warm, on the same machine.
//   * from the VPS's own IP every list body is empty (headless, and the logged-in Facebook
//     profile Chrome alike); through the proxy in `proxy.txt` the same Chrome 117 lists 30 per
//     page. The proxy changes the network, never the identity (see autos/sources/proxy.ts).
//   * the VPS runs Chrome 117 and nothing newer (`GLIBC_2.25` is missing for puppeteer's builds),
//     so the executable path candidates put the system Chrome first.
//
// Never `/search?`: robots.txt disallows it, and this reader has no code path that builds it.
import { launchChrome, sleep, type Browser, type Page } from "../social/chrome";
import { postFromVideoHtml } from "./page";
import { postFromItemStruct, type TiktokPost } from "./post";

export { proxyArg } from "../social/chrome";

export interface ListRead {
  posts: TiktokPost[];
  /** How many list answers arrived. */
  pages: number;
  /** The list ended (`hasMore: false`) or ran past the window: absence is now evidence. */
  exhausted: boolean;
  failure: string | null;
}

export interface ListPlan {
  tags: string[];
  accounts: string[];
  /**
   * Canonical video URLs plain HTTP could not read (the WAF interstitial, measured on the VPS
   * the afternoon of 2026-09-23 for a page it had served in full that morning). The browser goes
   * through the proxy, where the page is complete.
   */
  videos: string[];
  tagPages: number;
  accountPages: number;
  /** Unix seconds: scrolling stops once a list shows posts older than this. */
  minCreateTime: number;
  gapMs: number;
  budgetMs: number;
  proxy: string | null;
  /** A video page loaded first, for the cookies the tag list needs. */
  warmUrl: string;
}

export interface ListResults {
  tags: Map<string, ListRead>;
  accounts: Map<string, ListRead>;
  /** The videos of `plan.videos`, by URL; null when the page carried no itemStruct. */
  videos: Map<string, TiktokPost | null>;
  launched: boolean;
  note: string;
}

export type ListReader = (plan: ListPlan) => Promise<ListResults>;

const NAV_TIMEOUT_MS = Number(process.env.RENTALS_TIKTOK_NAV_MS || 60_000);
const SETTLE_MS = Number(process.env.RENTALS_TIKTOK_SETTLE_MS || 4_000);
const LIST_API = /\/api\/(?:post|challenge)\/item_list\//;
/** An item_list answer, or null for an empty body (the block), a challenge page, or a TikTok error status. */
export function parseListBody(body: string): { posts: TiktokPost[]; hasMore: boolean } | null {
  if (!body) return null;
  try {
    const data = JSON.parse(body) as { statusCode?: unknown; status_code?: unknown; hasMore?: unknown; itemList?: unknown };
    const status = Number(data.statusCode ?? data.status_code ?? 0);
    if (status !== 0 || !Array.isArray(data.itemList)) return null;
    return {
      posts: data.itemList.map(postFromItemStruct).filter((post): post is TiktokPost => post !== null),
      hasMore: data.hasMore === true,
    };
  } catch {
    return null;
  }
}

/** Loads one list page and scrolls until `pages` API answers arrived, the list ended, or the window was passed. */
async function readList(page: Page, url: string, pages: number, minCreateTime: number, deadline: number): Promise<ListRead> {
  const posts = new Map<string, TiktokPost>();
  let answers = 0;
  let empty = 0;
  let hasMore = true;
  let oldest = Number.POSITIVE_INFINITY;
  const pending: Array<Promise<void>> = [];
  const onResponse = (response: { url: () => string; text: () => Promise<string> }): void => {
    if (!LIST_API.test(String(response.url()))) return;
    pending.push(response.text().then(body => {
      const parsed = parseListBody(body);
      if (!parsed) { empty++; return; }
      answers++;
      hasMore = parsed.hasMore;
      for (const post of parsed.posts) {
        posts.set(post.id, post);
        oldest = Math.min(oldest, post.createTime);
      }
    }, () => { empty++; }));
  };
  page.on("response", onResponse);
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
    for (let round = 0; round < pages * 3; round++) {
      await sleep(SETTLE_MS);
      await Promise.all(pending.splice(0));
      if (answers >= pages || !hasMore || oldest < minCreateTime || Date.now() > deadline) break;
      // Two empty bodies and no answer is the block (measured: an account list through the
      // proxy), and scrolling for another half minute will not change it.
      if (answers === 0 && empty >= 2) break;
      try {
        await page.evaluate("window.scrollBy(0, document.body.scrollHeight)");
      } catch {
        break;
      }
    }
    await Promise.all(pending.splice(0));
    return {
      posts: [...posts.values()],
      pages: answers,
      exhausted: answers > 0 && (!hasMore || oldest < minCreateTime),
      failure: answers === 0 ? (empty ? "lista vacía (IP bloqueada o desafío)" : "sin respuesta de lista") : null,
    };
  } catch (error) {
    // Only the error class: a message can carry the URL.
    return { posts: [...posts.values()], pages: answers, exhausted: false, failure: `navegación: ${String((error as Error)?.name || "Error")}` };
  } finally {
    page.off("response", onResponse);
  }
}

export const readTiktokLists: ListReader = async plan => {
  const results: ListResults = { tags: new Map(), accounts: new Map(), videos: new Map(), launched: false, note: "" };
  if (!plan.tags.length && !plan.accounts.length && !plan.videos.length) return results;
  // The budget covers everything: launching, warming, every list. A Chrome that will not start is
  // exactly as expensive as one that will not finish, and a leaked one is an outage on the VPS.
  const deadline = Date.now() + plan.budgetMs;
  const started = await launchChrome(plan.proxy, "TikTok");
  if (!started) {
    results.note = "Chrome no arrancó";
    return results;
  }
  results.launched = true;
  const { browser, page } = started;
  try {
    await page.goto(plan.warmUrl, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS }).catch(() => undefined);
    await sleep(SETTLE_MS);
    // The videos plain HTTP could not read: the same page, from the browser, through the proxy.
    for (const url of plan.videos) {
      if (Date.now() > deadline) { results.note = "presupuesto agotado antes de los videos"; break; }
      await sleep(plan.gapMs);
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
        await sleep(SETTLE_MS);
        results.videos.set(url, postFromVideoHtml(String(await page.content())));
      } catch {
        results.videos.set(url, null);
      }
    }
    const jobs: Array<{ kind: "tags" | "accounts"; key: string; url: string; pages: number }> = [
      ...plan.tags.map(tag => ({ kind: "tags" as const, key: tag, url: `https://www.tiktok.com/tag/${encodeURIComponent(tag)}`, pages: plan.tagPages })),
      ...plan.accounts.map(account => ({ kind: "accounts" as const, key: account, url: `https://www.tiktok.com/@${encodeURIComponent(account)}`, pages: plan.accountPages })),
    ];
    let done = 0;
    for (const job of jobs) {
      if (Date.now() > deadline) {
        results.note = `presupuesto agotado: ${jobs.length - done} listas sin leer`;
        break;
      }
      await sleep(plan.gapMs);
      results[job.kind].set(job.key, await readList(page, job.url, job.pages, plan.minCreateTime, deadline));
      done++;
    }
  } catch (error) {
    results.note = `navegador: ${String((error as Error)?.name || "Error")}`;
  } finally {
    await browser.close().catch(() => undefined);
  }
  return results;
};
