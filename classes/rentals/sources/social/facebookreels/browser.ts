// Facebook video search and hashtag pages read from one headless Chrome, logged out — never the
// logged-in profile browser of the Marketplace jobs (`facebook_profile_browser`, CDP :9224). One
// launch per run, a time budget, close in `finally`.
import { launchChrome, sleep } from "../chrome";
import type { SocialPost } from "../post";
import { reelsFromFacebookHtml } from "./page";

export interface FacebookReelsPlan {
  pages: string[];
  gapMs: number;
  budgetMs: number;
  proxy: string | null;
}

export interface FacebookReelsResults {
  pages: Map<string, { posts: SocialPost[]; failure: string | null }>;
  launched: boolean;
  note: string;
}

export type FacebookReelsReader = (plan: FacebookReelsPlan) => Promise<FacebookReelsResults>;

const NAV_TIMEOUT_MS = Number(process.env.RENTALS_FBREELS_NAV_MS || 60_000);
const SETTLE_MS = Number(process.env.RENTALS_FBREELS_SETTLE_MS || 5_000);

export const readFacebookReels: FacebookReelsReader = async plan => {
  const results: FacebookReelsResults = { pages: new Map(), launched: false, note: "" };
  if (!plan.pages.length) return results;
  const deadline = Date.now() + plan.budgetMs;
  const started = await launchChrome(plan.proxy, "Facebook Reels");
  if (!started) {
    results.note = "Chrome no arrancó";
    return results;
  }
  results.launched = true;
  const { browser, page } = started;
  try {
    for (const url of plan.pages) {
      if (Date.now() > deadline) {
        results.note = `presupuesto agotado: ${plan.pages.length - results.pages.size} páginas sin leer`;
        break;
      }
      await sleep(plan.gapMs);
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
        await sleep(SETTLE_MS);
        if (/\/login/.test(String(page.url()))) {
          results.pages.set(url, { posts: [], failure: "redirigida a login" });
          continue;
        }
        results.pages.set(url, { posts: reelsFromFacebookHtml(String(await page.content())), failure: null });
      } catch (error) {
        // Only the error class: a message can carry the URL.
        results.pages.set(url, { posts: [], failure: `navegación: ${String((error as Error)?.name || "Error")}` });
      }
    }
  } catch (error) {
    results.note = `navegador: ${String((error as Error)?.name || "Error")}`;
  } finally {
    await browser.close().catch(() => undefined);
  }
  return results;
};
