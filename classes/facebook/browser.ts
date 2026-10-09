// The browser half of a Facebook reader, shared by every Marketplace job.
//
// It ATTACHES to the logged-in Chrome that pm2 `facebook_profile_browser` keeps alive on the 104
// box (CDP `:9224`; the trustpilot bridge on :9657 owns the same profile and only offers text
// search). It opens its own tabs, closes them, and disconnects without ever closing the browser:
// Chrome refuses a second instance on the same profile, so launching one would fight the lock.
// A login or checkpoint page ends the run — never retried, never "fixed" from here.
// The list readers (rentals, autos, retail) also take the profile lock (classes/facebook/lock.ts)
// for as long as they scroll, so two jobs never scroll the same session at once.
import type { Browser, HTTPResponse, Page } from "puppeteer-core";

export class FacebookSessionError extends Error {}

export const FB_ITEM_URL = (id: string): string => `https://www.facebook.com/marketplace/item/${id}/`;
export const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Whether the profile browser's health report lets a reader try. Only a session that is known to
 * be gone stops it: `invalid` (Facebook showed a login gate, or the profile has no session), no
 * session at all, or no browser. `error` means the monitor could not VALIDATE the session — on
 * 2026-10-05 it said so for twelve hours while every Marketplace read worked (`loginGates: 0`; the
 * failures were `FB_PROFILE_BROWSER_ID_MISMATCH` lookups from another use of the profile), and
 * requiring `valid` silently stopped the rentals detail job. A reader that does try still ends on
 * the first login or checkpoint page (`guard`), so trying costs one page, not the account.
 */
export function facebookSessionUsable(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const health = body as { sessionStatus?: unknown; sessionPresent?: unknown; browserConnected?: unknown };
  if (health.sessionPresent === false || health.browserConnected === false) return false;
  return health.sessionStatus === "valid" || health.sessionStatus === "error" || health.sessionStatus === "unknown";
}

/** Reads the profile browser's health endpoint. It answers 503 whenever it is not `valid`, so the
 * body is read whatever the status. */
export async function facebookSessionOk(healthUrl = process.env.FB_PROFILE_HEALTH_URL || process.env.AUTOS_FB_HEALTH_URL || "http://127.0.0.1:9246/health"): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(healthUrl, { signal: controller.signal });
    return facebookSessionUsable(await response.json());
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function connectFacebookBrowser(cdpUrl = process.env.FB_PROFILE_CDP_URL || process.env.AUTOS_FB_CDP_URL || "http://127.0.0.1:9224"): Promise<Browser> {
  const puppeteer = (await import("puppeteer-core")).default;
  return puppeteer.connect({ browserURL: cdpUrl, defaultViewport: { width: 1400, height: 900 } });
}

function guard(url: string): void {
  if (/facebook\.com\/(?:login|checkpoint)|\/login\.php/.test(url)) throw new FacebookSessionError("la sesión de Facebook no es válida");
}

/**
 * Loads one page in a fresh tab and returns every JSON text it produced: the embedded
 * `application/json` scripts plus each GraphQL response body. The tab is always closed.
 */
export async function readFacebookPageTexts(browser: Browser, url: string, settleMs = 6_000): Promise<string[]> {
  const page: Page = await browser.newPage();
  const texts: string[] = [];
  const pending: Array<Promise<void>> = [];
  const onResponse = (response: HTTPResponse): void => {
    if (!response.url().includes("/api/graphql")) return;
    pending.push(response.text().then(text => { texts.push(text); }, () => undefined));
  };
  page.on("response", onResponse);
  try {
    await page.setViewport({ width: 1400, height: 900 });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    guard(page.url());
    await sleep(settleMs);
    guard(page.url());
    const embedded = (await page.evaluate(() =>
      Array.from(document.querySelectorAll("script[type=\"application/json\"]")).map(node => node.textContent || ""),
    )) as string[];
    await Promise.all(pending);
    return [...embedded, ...texts];
  } finally {
    page.off("response", onResponse);
    await page.close().catch(() => undefined);
  }
}

export interface FacebookListScroll {
  /** Every JSON text the page produced (embedded scripts first, then each GraphQL body). */
  onText: (text: string) => void;
  /** How many distinct listings the caller has collected so far: the stop signal. */
  count: () => number;
  maxScrolls: number;
  /** Consecutive scrolls without a new listing that mean Facebook has nothing more to send. */
  stagnantRounds: number;
  /** Epoch ms; the list stops scrolling there and reports `exhausted: false`. */
  deadline: number;
  gapMs?: number;
  /**
   * The caller already has what it came for (e.g. a newest-first feed reached back far enough):
   * stop scrolling there, reported as `satisfied`, not `exhausted`.
   */
  enough?: () => boolean;
}

/**
 * Loads a Marketplace list (a search or a category feed) and scrolls to the BOTTOM until Facebook
 * stops sending listings. Two things measured on 2026-10-05 make this the only way to read a list
 * whole: the grid is virtualized (the DOM never holds more than ~45 item links, so counting
 * anchors stalls while the GraphQL stream keeps delivering), and scrolling by a screen height does
 * not reach the load-more trigger — three such scrolls read 20–26 cards of a search that, scrolled
 * to the bottom, delivered 288. The tab is always closed.
 */
export async function scrollFacebookList(
  browser: Browser,
  url: string,
  options: FacebookListScroll,
): Promise<{ scrolls: number; exhausted: boolean; satisfied: boolean; initial: number }> {
  const page: Page = await browser.newPage();
  const pending: Array<Promise<void>> = [];
  const onResponse = (response: HTTPResponse): void => {
    if (!response.url().includes("/api/graphql")) return;
    pending.push(response.text().then(options.onText, () => undefined));
  };
  page.on("response", onResponse);
  try {
    await page.setViewport({ width: 1400, height: 900 });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    guard(page.url());
    await page.waitForSelector("a[href*=\"/marketplace/item/\"]", { timeout: 30_000 }).catch(() => null);
    guard(page.url());
    const embedded = (await page.evaluate(() =>
      Array.from(document.querySelectorAll("script[type=\"application/json\"]")).map(node => node.textContent || ""),
    )) as string[];
    embedded.forEach(options.onText);
    await Promise.all(pending.splice(0));
    // What the page brought before any scroll: a list that never grows past it was not loaded.
    const initial = options.count();
    let scrolls = 0;
    let stagnant = 0;
    let satisfied = !!options.enough?.();
    while (!satisfied && scrolls < options.maxScrolls && stagnant < options.stagnantRounds && Date.now() < options.deadline) {
      const before = options.count();
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(options.gapMs ?? 2_000);
      await Promise.all(pending.splice(0));
      scrolls++;
      stagnant = options.count() === before ? stagnant + 1 : 0;
      satisfied = !!options.enough?.();
    }
    guard(page.url());
    await Promise.all(pending.splice(0));
    return { scrolls, exhausted: !satisfied && stagnant >= options.stagnantRounds, satisfied, initial };
  } finally {
    page.off("response", onResponse);
    await page.close().catch(() => undefined);
  }
}
