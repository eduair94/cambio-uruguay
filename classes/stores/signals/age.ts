// Signal 2/2 for /tiendas-online-uruguay: how old a store's domain is, read once a week by the sync
// job (Task 6) and ONLY for kind === "tienda-uy" (that filter is the caller's job, not this one's —
// querying crt.sh for mercadolibre.com.uy or amazon.com would return noise about a domain that
// isn't the seller).
//
// BOTH sources are queried every time and the EARLIER date wins (fix round F1, item 1): crt.sh's
// earliest TLS certificate can postdate a store's real online presence by years when a site ran on
// plain HTTP for a while, switched hosting/CA (a new cert chain, an old one dropped from the CT
// logs), or simply took time to bother with HTTPS at all — the Wayback Machine's first crawl is not
// tied to any of that, so treating crt.sh as "primary" and only falling back to Wayback when crt.sh
// had nothing meant an established store's real first capture was silently thrown away whenever
// crt.sh happened to answer with SOME (later) date. Live-checked 2026-09-17 for
// tiendainglesa.com.uy — one of Uruguay's oldest supermarket chains — crt.sh's earliest cert is
// 2019-09-30 (137 certificates on file, oldest `not_before`); the Wayback CDX call that same run
// answered its "Internet Archive: Temporarily Offline" HTML page instead of JSON (see item 8 below),
// which is itself live proof of the failure mode `attemptWayback` now has to tell apart from "no
// capture at all". `source` records which of the two produced the winning date, published in the
// "Fuente:" line.
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
    // Item 8: a 200 whose body isn't the CDX JSON shape at all — the "Internet Archive: Temporarily
    // Offline" HTML page is the observed case (live-checked 2026-09-17, see the module header) — is
    // Wayback FAILING to answer, not Wayback answering "no capture on file". Treating it as `empty`
    // would erase a previously stored date (`null` clears; only `undefined` keeps it), publishing a
    // false "no data" for a domain whose age was already known.
    return { kind: "failed" };
  }
  const since = waybackFirstCapture(parsed);
  return since ? { kind: "date", since } : { kind: "empty" };
}

/**
 * Item 1: crt.sh and Wayback are queried every time (never one short-circuiting the other), and the
 * EARLIER date wins — a date from either source is real, dated evidence, so having one is enough to
 * publish even when the other source failed to answer at all; a tie prefers crt.sh, a hard
 * certificate-issuance event rather than a crawl that merely happened to visit that day.
 *
 * `undefined` only when NEITHER source produced a date and at least one of them could not be
 * reached at all (network/status/unparseable-body failure) — a failure can't be told apart from "the
 * failed source might have had an even earlier date", so the previous value is kept rather than
 * asserting there is nothing. `null` only when both sources were queried successfully and neither
 * has anything on file.
 */
export async function fetchAge(domain: string): Promise<AgeSignal | null | undefined> {
  const checkedAt = new Date().toISOString();
  const [crt, wayback] = await Promise.all([attemptCrt(domain), attemptWayback(domain)]);

  const dated: Array<{ since: string; source: AgeSignal["source"] }> = [];
  if (crt.kind === "date") dated.push({ since: crt.since, source: "crt.sh" });
  if (wayback.kind === "date") dated.push({ since: wayback.since, source: "wayback" });

  if (dated.length) {
    dated.sort((a, b) => {
      if (a.since !== b.since) return a.since < b.since ? -1 : 1;
      return a.source === "crt.sh" ? -1 : 1;
    });
    const winner = dated[0]!;
    return { since: winner.since, source: winner.source, checkedAt };
  }

  if (crt.kind === "failed" || wayback.kind === "failed") return undefined;
  return null;
}
