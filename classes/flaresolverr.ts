/**
 * FlareSolverr client — for casas whose site is behind Cloudflare bot-fight.
 *
 * That block is on the client's fingerprint, not its address: measured against
 * cambiopando.com.uy, the scraper host and all eight rotating SOCKS5 proxies got
 * 403 alike, while the connections themselves were fine. No amount of proxy
 * rotation moves that, because axios does not have a browser's TLS handshake.
 * FlareSolverr drives a real browser, solves the challenge, and hands back HTML.
 *
 * Nodes are read from `FLARESOLVERR_URLS` rather than hardcoded: they are the
 * maintainer's own infrastructure and this repo is public. With the variable
 * unset every call returns null and callers fall back to their normal path, so
 * nothing here is required for the sync to run.
 */
import axios from "axios";

/** Per-node ceiling. A real solve measured 12-17s, so this leaves some slack. */
export const FLARESOLVERR_NODE_TIMEOUT_MS = 25_000;

/**
 * Ceiling for the whole call, across every node it tries. Sized to stay under a
 * single origin's slice of the sync loop (see DEFAULT_ORIGIN_TIMEOUT_MS): walking
 * a node list one 17s solve at a time is exactly how one scraper takes the whole
 * run down, which has already happened here once.
 */
export const FLARESOLVERR_BUDGET_MS = 32_000;

/** Solver's own challenge budget, kept just under the per-node request ceiling. */
const CHALLENGE_TIMEOUT_MS = 20_000;

export function flaresolverrNodes(): string[] {
  return (process.env.FLARESOLVERR_URLS || "")
    .split(",")
    .map((node) => node.trim())
    .filter(Boolean);
}

/** Fisher-Yates. Fixed order would always spend the budget on the same dead node first. */
function shuffled<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Fetch `url` through FlareSolverr, returning the solved HTML or null if no node
 * could serve it within the budget. Never throws: callers treat null as "use the
 * normal path".
 */
export async function flaresolverrGet(url: string, opts: { budgetMs?: number } = {}): Promise<string | null> {
  const nodes = flaresolverrNodes();
  if (!nodes.length) return null;

  const budgetMs = opts.budgetMs ?? FLARESOLVERR_BUDGET_MS;
  const deadline = Date.now() + budgetMs;

  for (const node of shuffled(nodes)) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    const timeout = Math.min(FLARESOLVERR_NODE_TIMEOUT_MS, remaining);

    try {
      const res = await axios.post(
        node,
        { cmd: "request.get", url, maxTimeout: CHALLENGE_TIMEOUT_MS },
        {
          headers: { "Content-Type": "application/json" },
          timeout,
          // See the note in classes/cambios/prex.ts: `timeout` alone does not
          // bound a request whose socket never gets assigned.
          signal: AbortSignal.timeout(timeout),
          validateStatus: () => true,
        }
      );

      const body = res.data;
      const html = body?.solution?.response;
      if (body?.status === "ok" && typeof html === "string" && html.length) {
        console.log(`FlareSolverr: solved ${url} via ${node}`);
        return html;
      }
      console.warn(`FlareSolverr: ${node} did not solve ${url} — ${body?.message || "no solution in response"}`);
    } catch (e) {
      console.warn(`FlareSolverr: ${node} failed for ${url} — ${(e as Error).message}`);
    }
  }

  return null;
}
