// Opening an El País search from a real browser, because plain HTTP cannot.
//
// The portal's operator authorised this import (see `elpais.ts` and
// `docs/research/rental-elpais-authorized-2026-09-05.md`). What blocks it is not the operator and
// not a rate limit: `POST /api/chat/init` sits behind Cloudflare's bot challenge, which answers
// three or four requests from Node and then serves `403 Just a moment...` — with
// `ratelimit-remaining` at 7, so nowhere near any published limit. Reading the results afterwards
// is never challenged.
//
// WE DO NOT FORGE THE CHALLENGE. There is no cookie replay, no TLS fingerprint spoofing and no
// stealth patching here. We drive the real Chrome that already ships with this repo, let it load
// the portal like any visitor, and then issue the SAME request the site's own front end issues,
// from inside the page. The browser answers Cloudflare because it is a browser.
//
// Measured 2026-09-05: six consecutive searches opened this way returned 201 with
// `ratelimit-remaining` counting 8→3, while Node was getting 403 for the same payload at the same
// moment. In-page, the only limit left is the portal's documented ten-per-minute one, which is
// what `gapMs` paces.
//
// Chrome is launched ONCE per run and only when a search is actually missing. With a warm cache
// that is never, so the daily job normally spawns no browser at all.
import type { ElpaisSearch } from "./elpais";
import { searchFields } from "./elpais";

const ORIGIN = "https://inmuebles.elpais.com.uy";
/** Puppeteer's own Chromium is the fallback; the VPS has a system Chrome, this box may not. */
const CHROME_PATHS = [process.env.RENTALS_EP_CHROME, process.env.PUPPETEER_EXECUTABLE_PATH, "/usr/bin/google-chrome-stable"];
const NAV_TIMEOUT_MS = Number(process.env.RENTALS_EP_BROWSER_NAV_MS || 60_000);
/** A challenge is an interstitial that replaces itself; give it time before deciding it lost. */
const CHALLENGE_WAIT_MS = Number(process.env.RENTALS_EP_CHALLENGE_MS || 20_000);
/**
 * Hard ceiling for the whole browser phase. 19 searches paced seven seconds apart plus the load is
 * about three minutes, so this is roughly double — a budget, not an expectation.
 *
 * It exists because of a specific scar: a Chrome left running on this VPS is not a slow job, it is
 * an outage (see `docs/`/memory on the D-Bus SSH stall). When the budget runs out we stop asking
 * for more searches and close the browser with whatever we got.
 */
const BUDGET_MS = Number(process.env.RENTALS_EP_BROWSER_BUDGET_MS || 360_000);

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs INSIDE the page. Same origin, same cookies, same TLS session as the site's own front end,
 * so this is the site making its own request — which is the whole point.
 *
 * NO `async`/`await` IN HERE, and that is not a style choice. This repo compiles to `target: es6`,
 * so TypeScript rewrites `await` into a call to its `__awaiter` helper — a module-level function
 * that does NOT travel with the source `page.evaluate` serialises. The first version of this threw
 * `__awaiter is not defined` in the page. Promise chains compile to themselves.
 *
 * The custom header is us signing the request: the browser is what answers Cloudflare, but the
 * operator who authorised this should still be able to find our traffic in their logs.
 */
function initInPage(fields: Record<string, string>): Promise<{ status: number; chatId: string; body: string }> {
  const form = new FormData();
  Object.keys(fields).forEach(function (name) {
    form.set(name, fields[name]!);
  });
  return fetch("/api/chat/init", {
    method: "POST",
    body: form,
    headers: { accept: "application/json", "x-cambio-uruguay-bot": "CambioUruguayBot/1.0" },
  }).then(function (response) {
    return response.text().then(function (body) {
      let chatId = "";
      try {
        const parsed = JSON.parse(body);
        if (parsed && parsed.success && parsed.data && typeof parsed.data.chatId === "string") chatId = parsed.data.chatId;
      } catch (error) {
        /* A challenge page is HTML, not JSON. The caller reports it by status. */
      }
      return { status: response.status, chatId: chatId, body: body.slice(0, 120) };
    });
  });
}

async function launch(): Promise<{ browser: any; page: any } | null> {
  let puppeteer: any;
  try {
    puppeteer = (await import("puppeteer")).default;
  } catch (error) {
    console.warn(`El País: puppeteer no disponible — ${(error as Error).message}`);
    return null;
  }

  const args = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--no-first-run", "--no-zygote", "--disable-gpu"];
  // The last candidate is `undefined`: puppeteer then uses its own download, which is what makes
  // this work on a dev box that has no system Chrome.
  for (const executablePath of [...CHROME_PATHS.filter(Boolean), undefined]) {
    try {
      const browser = await puppeteer.launch({ headless: true, executablePath, args, timeout: 30_000 });
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });
      return { browser, page };
    } catch (error) {
      console.warn(`El País: Chrome no arrancó en ${executablePath || "puppeteer"} — ${(error as Error).message}`);
    }
  }
  return null;
}

/**
 * Opens one saved search per element of `searches` and returns the ids it got, keyed by province.
 *
 * Never throws and never leaves Chrome behind: a browser that will not start, a portal that will
 * not load or a search that will not open all return the same thing — fewer entries than asked
 * for — and the caller treats a province with no id exactly as it treats one that plain HTTP
 * could not open.
 */
export async function openSearchesWithBrowser(
  searches: readonly ElpaisSearch[],
  gapMs: number
): Promise<Map<string, string>> {
  const opened = new Map<string, string>();
  if (!searches.length) return opened;

  // The budget covers EVERYTHING: launching, loading, waiting out the challenge and every search.
  // A Chrome that will not start is exactly as expensive as one that will not finish.
  const budgetDeadline = Date.now() + BUDGET_MS;
  const started = await launch();
  if (!started) return opened;
  const { browser, page } = started;

  try {
    await page.goto(`${ORIGIN}/`, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
    // Cloudflare's interstitial titles itself "Just a moment..." and then replaces the document.
    // Waiting on the title is more honest than a fixed sleep: if it clears in two seconds we go.
    const challengeDeadline = Date.now() + CHALLENGE_WAIT_MS;
    while (Date.now() < challengeDeadline) {
      const title = String(await page.title());
      if (!/just a moment|attention required/i.test(title)) break;
      await sleep(1_000);
    }

    for (const [index, search] of searches.entries()) {
      if (Date.now() > budgetDeadline) {
        console.warn(`El País: presupuesto del navegador agotado con ${searches.length - index} búsquedas sin abrir`);
        break;
      }
      if (index > 0) await sleep(gapMs);
      try {
        const result = await page.evaluate(initInPage, searchFields(search));
        if (result?.chatId) opened.set(search.province, result.chatId);
        else console.warn(`El País: ${search.province} no abrió en el navegador (${result?.status}) ${result?.body ?? ""}`);
      } catch (error) {
        console.warn(`El País: ${search.province} falló en el navegador — ${(error as Error).message}`);
      }
    }
  } catch (error) {
    console.warn(`El País: no se pudo cargar el portal en el navegador — ${(error as Error).message}`);
  } finally {
    // A leaked Chrome on the VPS is its own outage; this repo has already paid for one.
    await browser.close().catch(() => undefined);
  }

  return opened;
}
