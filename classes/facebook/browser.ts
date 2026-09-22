// The browser half of a Facebook reader, shared by every Marketplace job.
//
// It ATTACHES to the logged-in Chrome that pm2 `facebook_profile_browser` keeps alive on the 104
// box (CDP `:9224`; the trustpilot bridge on :9657 owns the same profile and only offers text
// search). It opens its own tabs, closes them, and disconnects without ever closing the browser:
// Chrome refuses a second instance on the same profile, so launching one would fight the lock.
// A login or checkpoint page ends the run — never retried, never "fixed" from here.
// Same contract as classes/autos/sources/facebookBrowser.ts, which still carries its own copy.
import type { Browser, HTTPResponse, Page } from "puppeteer-core";

export class FacebookSessionError extends Error {}

export const FB_ITEM_URL = (id: string): string => `https://www.facebook.com/marketplace/item/${id}/`;
export const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/** The profile browser's own health endpoint: `sessionStatus: "valid"` or nothing is read. */
export async function facebookSessionOk(healthUrl = process.env.FB_PROFILE_HEALTH_URL || process.env.AUTOS_FB_HEALTH_URL || "http://127.0.0.1:9246/health"): Promise<boolean> {
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
