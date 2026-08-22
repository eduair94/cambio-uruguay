// HTTP plumbing for the regional sources.
//
// Same two rules the rental harvester runs on (one in-flight request per host
// with a minimum gap; a failed fetch resolves to null instead of throwing), with
// knobs sized for this job: fourteen sources, one or two requests each, all of
// them free public endpoints of central banks and market-data publishers. The
// gap is short because we never hit the same host twice in a row; the timeout is
// short because a stalled source must not hold the run — the snapshot is
// published with whatever answered.
//
// Deliberately its own module rather than a shared one: `rentals/net.ts` reads
// `RENTALS_*` env knobs, and a job that sweeps 900 pages of one portal has
// nothing in common with one that reads fourteen endpoints once.
const HOST_GAP_MS = Number(process.env.REGIONAL_HOST_GAP_MS || 400);
const DEFAULT_TIMEOUT_MS = Number(process.env.REGIONAL_HTTP_TIMEOUT_MS || 15_000);

/**
 * We identify ourselves and link back. Every source here publishes its rates for
 * the public to read; an honest UA is what lets them tell us apart from a
 * scraper farm and gives them somewhere to complain.
 */
const UA =
  process.env.REGIONAL_USER_AGENT ||
  "CambioUruguayBot/1.0 (+https://cambio-uruguay.com/cotizaciones-de-la-region; regional FX index; contact via site)";

export interface FetchOptions {
  timeoutMs?: number;
  retries?: number;
  headers?: Record<string, string>;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const lastHit = new Map<string, number>();
const hostChain = new Map<string, Promise<unknown>>();

async function throttled<T>(host: string, task: () => Promise<T>): Promise<T> {
  const previous = hostChain.get(host) ?? Promise.resolve();
  const run = previous.then(async () => {
    const gap = Date.now() - (lastHit.get(host) ?? 0);
    if (gap < HOST_GAP_MS) await sleep(HOST_GAP_MS - gap);
    try {
      return await task();
    } finally {
      lastHit.set(host, Date.now());
    }
  });
  hostChain.set(
    host,
    run.catch(() => undefined)
  );
  return run;
}

async function rawFetch(url: string, options: FetchOptions): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": UA,
        accept: "application/json,text/html;q=0.9,*/*;q=0.8",
        "accept-language": "es,pt;q=0.8,en;q=0.6",
        ...(options.headers || {}),
      },
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function withRetries(url: string, options: FetchOptions): Promise<Response | null> {
  const attempts = (options.retries ?? 1) + 1;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const response = await rawFetch(url, options);
    if (response && response.ok) return response;
    // 4xx other than 429 is an answer, not a failure: retrying wastes the host's time.
    if (response && response.status >= 400 && response.status < 500 && response.status !== 429) return null;
    if (attempt < attempts - 1) await sleep(700 * (attempt + 1));
  }
  return null;
}

async function run<T>(url: string, options: FetchOptions, read: (response: Response) => Promise<T>): Promise<T | null> {
  return throttled(hostOf(url), async () => {
    const response = await withRetries(url, options);
    if (!response) return null;
    try {
      return await read(response);
    } catch {
      return null;
    }
  });
}

export async function fetchText(url: string, options: FetchOptions = {}): Promise<string | null> {
  return run(url, options, (response) => response.text());
}

export async function fetchJson<T>(url: string, options: FetchOptions = {}): Promise<T | null> {
  return run(url, options, (response) => response.json() as Promise<T>);
}
