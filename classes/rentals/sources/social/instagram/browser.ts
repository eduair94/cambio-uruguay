// Instagram accounts read from one headless Chrome, logged out: the profile page for the list of
// codes, then the page of each code the memory does not have yet. One launch per run, a time
// budget, close in `finally`.
//
// Measured 2026-09-24 from the VPS's own IP: 12 of 12 posts of one account read, ~6 s each
// (through the proxy, Instagram answered a network error, so there is no proxy by default).
import { launchChrome, sleep, type Page } from "../chrome";
import type { SocialPost } from "../post";
import { parseInstagramProfile, postFromInstagramHtml, type InstagramProfile } from "./page";

export interface InstagramAccountRead {
  handle: string;
  /** null when the profile page was not readable (login wall, challenge, navigation error). */
  profile: InstagramProfile | null;
  /** Posts read in this run: only codes that were not known. */
  posts: SocialPost[];
  failures: number;
}

export interface InstagramPlan {
  accounts: string[];
  /** Post codes the memory already has: they are rebuilt from it, never read again. */
  known: ReadonlySet<string>;
  maxNewPerAccount: number;
  gapMs: number;
  budgetMs: number;
  proxy: string | null;
}

export interface InstagramResults {
  accounts: Map<string, InstagramAccountRead>;
  launched: boolean;
  note: string;
}

export type InstagramReader = (plan: InstagramPlan) => Promise<InstagramResults>;

const NAV_TIMEOUT_MS = Number(process.env.RENTALS_INSTAGRAM_NAV_MS || 45_000);
const SETTLE_MS = Number(process.env.RENTALS_INSTAGRAM_SETTLE_MS || 2_500);
const onLogin = (page: Page): boolean => /\/accounts\/login/.test(String(page.url()));

export const readInstagram: InstagramReader = async plan => {
  const results: InstagramResults = { accounts: new Map(), launched: false, note: "" };
  if (!plan.accounts.length) return results;
  const deadline = Date.now() + plan.budgetMs;
  const started = await launchChrome(plan.proxy, "Instagram");
  if (!started) {
    results.note = "Chrome no arrancó";
    return results;
  }
  results.launched = true;
  const { browser, page } = started;
  try {
    for (const handle of plan.accounts) {
      if (Date.now() > deadline) {
        results.note = `presupuesto agotado: ${plan.accounts.length - results.accounts.size} cuentas sin leer`;
        break;
      }
      const read: InstagramAccountRead = { handle, profile: null, posts: [], failures: 0 };
      results.accounts.set(handle, read);
      await sleep(plan.gapMs);
      try {
        await page.goto(`https://www.instagram.com/${encodeURIComponent(handle)}/`, { waitUntil: "networkidle2", timeout: NAV_TIMEOUT_MS }).catch(() => undefined);
        read.profile = onLogin(page) ? null : parseInstagramProfile(String(await page.content()), handle);
      } catch {
        read.failures++;
        continue;
      }
      if (!read.profile || !read.profile.exists) continue;
      const pending = read.profile.codes.filter(code => !plan.known.has(code)).slice(0, plan.maxNewPerAccount);
      for (const code of pending) {
        if (Date.now() > deadline) break;
        await sleep(plan.gapMs);
        try {
          await page.goto(`https://www.instagram.com/p/${code}/`, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
          await sleep(SETTLE_MS);
          if (onLogin(page)) {
            read.failures++;
            break;
          }
          const post = postFromInstagramHtml(String(await page.content()), code);
          if (post) read.posts.push(post);
          else read.failures++;
        } catch {
          read.failures++;
        }
      }
    }
  } catch (error) {
    results.note = `navegador: ${String((error as Error)?.name || "Error")}`;
  } finally {
    await browser.close().catch(() => undefined);
  }
  return results;
};
