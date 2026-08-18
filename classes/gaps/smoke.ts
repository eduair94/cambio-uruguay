// Did the page that shipped itself actually come up?
//
// Everything before the push is checked: sources, figures, shape, lint, the app's test suite. What
// none of that can see is the deploy — a page can pass every gate and still land on a build that
// failed, a route that 500s, or a server that came back without it. Nobody is watching at 05:35,
// and the failure is silent: the site simply has a link in its nav that goes nowhere.
//
// So the hourly watcher looks at what was published recently and asks the live site. One request
// per page, for pages published in the last few days. A page that is fine gets checked a handful of
// times and then ages out.

import axios from "axios";
import { notifyAdmin } from "../notify";
import { RedditContentGapModel, type RedditContentGapDoc } from "../models/RedditContentGap";

/** How long after publication a page is still worth re-checking. */
const WINDOW_HOURS = 72;
const TIMEOUT_MS = 15000;

export interface SmokeResult {
  checked: number;
  broken: Array<{ pagePath: string; detail: string }>;
}

/**
 * Is the page there, and is it the page we wrote?
 *
 * A 200 is not enough on its own: a SPA fallback or an error boundary can answer 200 with a shell.
 * Checking that the title we generated is in the HTML is what distinguishes "deployed" from
 * "responds".
 */
async function check(baseUrl: string, pagePath: string, title: string): Promise<string | null> {
  try {
    const res = await axios.get<string>(`${baseUrl}${pagePath}`, {
      timeout: TIMEOUT_MS,
      signal: AbortSignal.timeout(TIMEOUT_MS + 2000),
      maxRedirects: 2,
      validateStatus: () => true,
      responseType: "text",
      transformResponse: (d) => d,
      headers: { "User-Agent": "CambioUruguayBot/1.0 page-smoke" },
    });
    if (res.status !== 200) return `HTTP ${res.status}`;
    const html = typeof res.data === "string" ? res.data : "";
    if (!html.trim()) return "respondió vacío";
    // The first few words of the title are enough, and survive the entity-escaping the renderer does.
    const needle = title.split(/\s+/).slice(0, 4).join(" ");
    if (needle && !html.includes(needle)) return "responde 200 pero no contiene su propio título";
    return null;
  } catch (e: any) {
    return e?.message ?? String(e);
  }
}

/** Check every recently published page. Never throws. */
export async function smokeRecentPages(baseUrl: string): Promise<SmokeResult> {
  const result: SmokeResult = { checked: 0, broken: [] };
  const since = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000);

  let rows: RedditContentGapDoc[] = [];
  try {
    rows = await RedditContentGapModel.find({ publishedAt: { $gte: since }, pagePath: { $ne: "" } })
      .select({ pagePath: 1, clusterLabel: 1 })
      .lean<RedditContentGapDoc[]>();
  } catch (e: any) {
    console.warn("[gaps/smoke] no pude leer las páginas publicadas:", e?.message || e);
    return result;
  }

  // Several threads share one page; check each route once.
  const byPath = new Map<string, string>();
  for (const row of rows) if (row.pagePath) byPath.set(row.pagePath, row.clusterLabel || row.pagePath);

  for (const [pagePath, label] of byPath) {
    result.checked++;
    const problem = await check(baseUrl, pagePath, label);
    if (problem) result.broken.push({ pagePath, detail: problem });
  }

  if (result.broken.length) {
    await notifyAdmin(
      `🛑 *Página generada caída*\n` +
        result.broken.map((b) => `${baseUrl}${b.pagePath} — ${b.detail}`).join("\n") +
        `\n\nSe publicó sola y no está respondiendo. Revertir es un commit.`
    );
  }

  return result;
}
