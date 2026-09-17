// Two sources answer the VPS with a block that has nothing to do with who we are: Clasiautos sends
// Wordfence's "access from your area has been temporarily limited" (also with a browser UA) and Car
// One answers 405 to every request, including its home page — while both answer 200 from a
// development machine and both allow these paths in robots.txt. So the request changes NETWORK, not
// identity: the honest `CambioUruguayBot` UA and the contact link travel unchanged, the rate stays at
// one page every 1.5 s, and if a site ever blocks the bot itself (by UA, or by asking), the source
// comes out — that is what `AUTOS_PROXY_SOURCES` and `AUTOS_<SOURCE>_ENABLED=0` are for.
//
// Which proxy, in order: `AUTOS_PROXY_LIST` (our own rented ones, `host:port` separated by commas,
// credentials in `AUTOS_PROXY_AUTH=user:pass`), then `AUTOS_PROXY_URL` (one fixed proxy), then the
// pool the casa scrapers already use (`ProxyFileService`, proxyscrape, refreshed every 10 minutes).
// Credentials live in the server's `.env` and never appear in a log: a proxy is named by host:port.
import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";
import { ProxyFileService } from "../../ProxyFileService";
import type { CarSource } from "../types";
import { AUTOS_USER_AGENT } from "../detail";
import type { Fetched } from "./common";

export function proxiedSources(env: NodeJS.ProcessEnv = process.env): Set<CarSource> {
  const raw = env.AUTOS_PROXY_SOURCES ?? "clasiautos,carone";
  return new Set(raw.split(",").map(item => item.trim()).filter(Boolean) as CarSource[]);
}

export const sourceUsesProxy = (source: CarSource, env: NodeJS.ProcessEnv = process.env): boolean => proxiedSources(env).has(source);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Agent = any;
interface Picked {
  agent: Agent;
  label: string;
}

const agentFor = (url: string): Agent => (url.startsWith("socks") ? new SocksProxyAgent(url) : new HttpsProxyAgent(url));

/** `host:port` (+ `AUTOS_PROXY_AUTH`) or a whole URL → a URL whose credentials are escaped. */
export function proxyUrlOf(entry: string, auth: string | undefined): string {
  const target = entry.trim();
  if (!target) return "";
  if (/^\w+:\/\//.test(target)) return target;
  const [user, ...rest] = String(auth || "").split(":");
  const password = rest.join(":");
  const credentials = user && password ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}@` : "";
  return `http://${credentials}${target}`;
}

export const proxyList = (env: NodeJS.ProcessEnv = process.env): string[] =>
  String(env.AUTOS_PROXY_LIST || "").split(",").map(item => item.trim()).filter(Boolean);

// The working proxy stays for the rest of the run: re-rolling per page would spend most of a
// source's time on dead hosts (the shared pool) or waste our own rented ones.
let sticky: Picked | null = null;
let listIndex = 0;

export function resetProxy(): void {
  sticky = null;
}

async function pickProxy(): Promise<Picked | null> {
  if (sticky) return sticky;
  const list = proxyList();
  if (list.length) {
    const entry = list[listIndex % list.length]!;
    listIndex++;
    sticky = { agent: agentFor(proxyUrlOf(entry, process.env.AUTOS_PROXY_AUTH)), label: entry };
    return sticky;
  }
  const fixed = process.env.AUTOS_PROXY_URL;
  if (fixed) {
    sticky = { agent: agentFor(fixed), label: "proxy fijo" };
    return sticky;
  }
  const url = await ProxyFileService.getInstance().getRandomProxy().catch(() => "");
  sticky = url ? { agent: agentFor(url), label: url.replace(/^socks5:\/\//, "") } : null;
  return sticky;
}

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));
let lastRequestAt = 0;

/** One page through the proxy, rotating to another one while the proxy (not the site) is the problem. */
export async function proxiedFetch<T>(url: string, kind: "text" | "json", timeoutMs = 25_000): Promise<Fetched<T>> {
  const attempts = Number(process.env.AUTOS_PROXY_ATTEMPTS || 6);
  const gapMs = Number(process.env.AUTOS_PROXY_GAP_MS || 1_500);
  let failure = "sin proxy disponible";
  for (let attempt = 0; attempt < attempts; attempt++) {
    const picked = await pickProxy();
    if (!picked) break;
    const wait = gapMs - (Date.now() - lastRequestAt);
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
    try {
      const response = await axios.get(url, {
        httpAgent: picked.agent,
        httpsAgent: picked.agent,
        proxy: false,
        timeout: timeoutMs,
        responseType: kind === "json" ? "json" : "text",
        maxRedirects: 5,
        validateStatus: () => true,
        headers: { "user-agent": AUTOS_USER_AGENT, accept: kind === "json" ? "application/json" : "text/html,*/*;q=0.8", "accept-language": "es-UY,es;q=0.9" },
      });
      if (response.status === 200) return { body: response.data as T, failure: null };
      failure = `HTTP ${response.status}`;
      // 4xx that is not a block is the site's answer (a page past the last one): another proxy would
      // get the same thing. 403/405/429/503 are what the block looks like, so those do rotate.
      if (response.status < 500 && ![403, 405, 429, 503].includes(response.status)) return { body: null, failure };
    } catch {
      failure = "proxy sin respuesta";
    }
    resetProxy();
  }
  return { body: null, failure };
}
