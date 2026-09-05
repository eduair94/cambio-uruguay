// HTTP plumbing for the rental harvesters.
//
// Two rules the chair harvester taught us, kept here with rental-sized knobs:
//   * one in-flight request per host with a minimum gap between hits — a portal that rate-limits
//     us must never be able to stall the run, and we are a guest on somebody else's server;
//   * a failed fetch resolves to null instead of throwing, so one dead portal degrades the run
//     instead of failing it.
//
// The gap here is far longer than the chair one (1.2 s vs 350 ms) because a full InfoCasas sweep is
// ~900 page requests against a single host, where the chair job spreads a few hundred over a dozen
// storefronts.
const HOST_GAP_MS = Number(process.env.RENTALS_HOST_GAP_MS || 1_200);
const DEFAULT_TIMEOUT_MS = Number(process.env.RENTALS_HTTP_TIMEOUT_MS || 25_000);

/**
 * We identify ourselves. The portals we read publish `Content-Signal: search=yes, ai-train=no`
 * (Gallito) or allow the listing paths outright (InfoCasas), and what we do is the `search` use:
 * index, link back, never train. An honest UA is what makes that claim checkable — and it gives
 * them a contact if they want us gone.
 */
const UA =
  process.env.RENTALS_USER_AGENT ||
  "CambioUruguayBot/1.0 (+https://cambio-uruguay.com/alquileres-uruguay; rental price index; contact via site)";

export interface FetchOptions {
  /** Only used to submit the public Casasweb search pagination form. */
  method?: "GET" | "POST";
  body?: string;
  timeoutMs?: number;
  retries?: number;
  headers?: Record<string, string>;
  /** Skip the throttle — only for our own bridges on the same box. */
  unthrottled?: boolean;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

const lastHit = new Map<string, number>();
const hostChain = new Map<string, Promise<unknown>>();

export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

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
    const response = await fetch(url, {
      method: options.method,
      body: options.body,
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": UA,
        accept: "text/html,application/json,application/xhtml+xml,*/*;q=0.8",
        "accept-language": "es-UY,es;q=0.9",
        ...(options.headers || {}),
      },
    });
    return response;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function withRetries(url: string, options: FetchOptions): Promise<Response | null> {
  const attempts = (options.retries ?? 2) + 1;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const response = await rawFetch(url, options);
    if (response && response.ok) return response;
    // 404/410 are answers, not failures: retrying them only wastes the host's time.
    if (response && response.status >= 400 && response.status < 500 && response.status !== 429) return null;
    if (attempt < attempts - 1) await sleep(800 * (attempt + 1));
  }
  return null;
}

async function run<T>(url: string, options: FetchOptions, read: (response: Response) => Promise<T>): Promise<T | null> {
  const task = async (): Promise<T | null> => {
    const response = await withRetries(url, options);
    if (!response) return null;
    try {
      return await read(response);
    } catch {
      return null;
    }
  };
  return options.unthrottled ? task() : throttled(hostOf(url), task);
}

export async function fetchText(url: string, options: FetchOptions = {}): Promise<string | null> {
  return run(url, options, (response) => response.text());
}

export async function fetchJson<T>(url: string, options: FetchOptions = {}): Promise<T | null> {
  return run(url, options, (response) => response.json() as Promise<T>);
}
