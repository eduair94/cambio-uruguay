// Signal 2/2 for /tiendas-online-uruguay: how old a store's domain is, read once a week by the sync
// job (Task 6) and ONLY for kind === "tienda-uy" (that filter is the caller's job, not this one's —
// querying crt.sh for mercadolibre.com.uy or amazon.com would return noise about a domain that
// isn't the seller). crt.sh's earliest TLS certificate is the primary source; the Wayback Machine's
// first capture is the fallback, used only when crt.sh could not answer or genuinely has nothing.
import { httpText } from "../net";

export interface AgeSignal {
  since: string; // YYYY-MM-DD
  source: "crt.sh" | "wayback";
  checkedAt: string;
}

// crt.sh really does time out and 5xx under load; a single retry after a short pause absorbs a
// transient blip without falling back to the (much weaker) Wayback signal for nothing. The delay is
// an env knob rather than a bare 10_000 so tests don't have to wait 10 real seconds for it — the
// same pattern classes/precios/net.ts (GAP_MS/RETRIES) and classes/rentals/net.ts (HOST_GAP_MS) use.
const CRT_TIMEOUT_MS = Number(process.env.STORES_AGE_CRT_TIMEOUT_MS || 60_000);
const CRT_RETRY_DELAY_MS = Number(process.env.STORES_AGE_RETRY_MS || 10_000);

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** `not_before` rows as crt.sh's `output=json` returns them; only the field this reads is typed. */
export function earliestCertificate(rows: Array<{ not_before?: string }>): string | null {
  const dates = rows
    .map((row) => row?.not_before)
    .filter((value): value is string => typeof value === "string" && value.length >= 10);
  if (!dates.length) return null;
  const earliest = dates.reduce((min, current) => (current < min ? current : min));
  return earliest.slice(0, 10);
}

/**
 * The Wayback CDX `output=json` shape is `[["timestamp"], ["20190305120000"], ...]` — a header row
 * followed by data rows, oldest first because the query is `limit=1` from the start of the archive.
 * `body` is `unknown` on purpose: the CDX API is known to answer with an "Internet Archive:
 * Temporarily Offline" HTML page instead of JSON on a bad day, and that string must come out as
 * "no data" here, never as a thrown error.
 */
export function waybackFirstCapture(body: unknown): string | null {
  if (!Array.isArray(body) || body.length < 2) return null;
  const row = body[1];
  if (!Array.isArray(row) || typeof row[0] !== "string") return null;
  const match = /^(\d{4})(\d{2})(\d{2})/.exec(row[0]);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

type Outcome = { kind: "date"; since: string } | { kind: "empty" } | { kind: "failed" };

async function attemptCrt(domain: string): Promise<Outcome> {
  const url = `https://crt.sh/?q=${encodeURIComponent(domain)}&output=json&match==`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await httpText(url, { timeoutMs: CRT_TIMEOUT_MS });
    if (res && res.status === 200) {
      try {
        const rows = JSON.parse(res.body);
        if (Array.isArray(rows)) {
          const since = earliestCertificate(rows);
          return since ? { kind: "date", since } : { kind: "empty" };
        }
      } catch {
        // Falls through to the retry/failed path below — a 200 that isn't valid JSON is crt.sh
        // serving something other than its API (an edge error page), not an empty result.
      }
    }
    if (attempt === 0) await sleep(CRT_RETRY_DELAY_MS);
  }
  return { kind: "failed" };
}

async function attemptWayback(domain: string): Promise<Outcome> {
  const url = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}&output=json&limit=1&fl=timestamp`;
  const res = await httpText(url);
  if (!res || res.status !== 200) return { kind: "failed" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(res.body);
  } catch {
    // The "Temporarily Offline" HTML page: hand the raw text to the parser, which safely reads it
    // as no data (it isn't an array) instead of this throwing.
    parsed = res.body;
  }
  const since = waybackFirstCapture(parsed);
  return since ? { kind: "date", since } : { kind: "empty" };
}

/**
 * `undefined` when neither source could be reached (network/status); `null` when both were queried
 * successfully and neither has a date; otherwise the earliest date found, preferring crt.sh.
 */
export async function fetchAge(domain: string): Promise<AgeSignal | null | undefined> {
  const checkedAt = new Date().toISOString();
  const crt = await attemptCrt(domain);
  if (crt.kind === "date") return { since: crt.since, source: "crt.sh", checkedAt };

  const wayback = await attemptWayback(domain);
  if (wayback.kind === "date") return { since: wayback.since, source: "wayback", checkedAt };

  if (crt.kind === "failed" || wayback.kind === "failed") return undefined;
  return null;
}
