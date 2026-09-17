// Signal 2/2 for /tiendas-online-uruguay: how old a store's domain is, read once a week by the sync
// job (Task 6) and ONLY for kind === "tienda-uy" (that filter is the caller's job, not this one's —
// querying crt.sh for mercadolibre.com.uy or amazon.com would return noise about a domain that
// isn't the seller).
//
// BOTH sources are queried every time (fix round F1, item 1): crt.sh's earliest TLS certificate can
// postdate a store's real online presence by years when a site ran on plain HTTP for a while,
// switched hosting/CA (a new cert chain, an old one dropped from the CT logs), or simply took time
// to bother with HTTPS at all — the Wayback Machine's first crawl is not tied to any of that, so
// treating crt.sh as "primary" and only falling back to Wayback when crt.sh had nothing meant an
// established store's real first capture was silently thrown away whenever crt.sh happened to
// answer with SOME (later) date. Live-checked 2026-09-17 for tiendainglesa.com.uy — one of Uruguay's
// oldest supermarket chains — crt.sh's earliest cert is 2019-09-30 (137 certificates on file, oldest
// `not_before`); the Wayback CDX call that same run answered its "Internet Archive: Temporarily
// Offline" HTML page instead of JSON.
//
// Follow-up (item 1, controller review of 34b5daf0): that live case is exactly the failure mode a
// crt.sh-can-stand-alone rule falls into — crt.sh systematically UNDERSTATES an older store's real
// presence, so publishing its date whenever Wayback merely failed to answer would have republished
// 2019-09-30 as Tienda Inglesa's "en línea desde", which is almost certainly wrong for a chain that
// old. So the two sources are no longer symmetric: Wayback now RETRIES once, same as crt.sh, before
// being declared failed, and if it still fails the whole signal fails closed (`undefined`) —
// regardless of what crt.sh found — because there is no way to tell how badly a lone crt.sh date
// understates reality without Wayback's own check on it. Only once Wayback has actually answered
// (a date, or a confirmed "nothing on file") does crt.sh's date get to stand: earlier of the two
// wins when both have dates, and crt.sh alone is trusted ("primer certificado HTTPS") only when
// Wayback confirmed it has nothing. `source` records which of the two produced the winning date,
// published in the "Fuente:" line. The stored `since` itself only ever moves earlier over time,
// never later — see `classes/stores/profile.ts`'s `mergeAge`.
import { httpText } from "../net";

export interface AgeSignal {
  since: string; // YYYY-MM-DD
  source: "crt.sh" | "wayback";
  checkedAt: string;
}

// Both crt.sh and (as of this follow-up) Wayback really do time out / 5xx / bounce under load; one
// retry after a short pause absorbs a transient blip before either is declared failed. The delay is
// an env knob rather than a bare 10_000 so tests don't have to wait 10 real seconds for it — the
// same pattern classes/precios/net.ts (GAP_MS/RETRIES) and classes/rentals/net.ts (HOST_GAP_MS) use.
const CRT_TIMEOUT_MS = Number(process.env.STORES_AGE_CRT_TIMEOUT_MS || 60_000);
const RETRY_DELAY_MS = Number(process.env.STORES_AGE_RETRY_MS || 10_000);

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
    if (attempt === 0) await sleep(RETRY_DELAY_MS);
  }
  return { kind: "failed" };
}

/**
 * Retries once, same as crt.sh (item 1 follow-up) — the "Internet Archive: Temporarily Offline"
 * page (item 8) is exactly the kind of transient blip a single retry absorbs, and Wayback failing
 * now decides the WHOLE signal (see the module header), so it deserves the same one retry crt.sh
 * already gets before that verdict is final.
 */
async function attemptWayback(domain: string): Promise<Outcome> {
  const url = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}&output=json&limit=1&fl=timestamp`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await httpText(url);
    if (res && res.status === 200) {
      try {
        const parsed = JSON.parse(res.body);
        const since = waybackFirstCapture(parsed);
        return since ? { kind: "date", since } : { kind: "empty" };
      } catch {
        // Item 8: a 200 whose body isn't the CDX JSON shape at all (the "Temporarily Offline" HTML
        // page is the observed case) is Wayback FAILING to answer, not answering "no capture on
        // file" — falls through to the retry/failed path below, same as crt.sh's own non-JSON 200.
      }
    }
    if (attempt === 0) await sleep(RETRY_DELAY_MS);
  }
  return { kind: "failed" };
}

/**
 * Item 1 follow-up: crt.sh and Wayback are queried every time, but they are no longer symmetric.
 *
 *   * Wayback FAILED (after its own retry) → `undefined`, REGARDLESS of what crt.sh found. crt.sh's
 *     date alone cannot be trusted to stand in for a real "first seen" — it systematically
 *     understates an established store (see the module header) — so without Wayback's own check on
 *     it the honest answer is "could not confirm this week", not "here is crt.sh's likely-wrong
 *     date". The previous value (if any) is kept, with its old `checkedAt`.
 *   * Wayback answered with a DATE → the earlier of the two wins when crt.sh also has a date (tying
 *     favors crt.sh, a hard certificate-issuance event rather than a crawl that merely happened to
 *     visit that day); crt.sh failing outright never discards a Wayback date that did come back.
 *   * Wayback answered EMPTY (queried fine, nothing on file) → crt.sh's own date, if it has one, is
 *     then trustworthy enough to stand alone ("primer certificado HTTPS"). If crt.sh has nothing
 *     either, `null` (both sources confirmed no data). If crt.sh failed to answer at all, `undefined`
 *     — one confirmed "nothing" and one outright failure still isn't enough to assert absence.
 */
export async function fetchAge(domain: string): Promise<AgeSignal | null | undefined> {
  const checkedAt = new Date().toISOString();
  const [crt, wayback] = await Promise.all([attemptCrt(domain), attemptWayback(domain)]);

  if (wayback.kind === "failed") return undefined;

  if (wayback.kind === "date") {
    if (crt.kind === "date" && crt.since <= wayback.since) {
      return { since: crt.since, source: "crt.sh", checkedAt };
    }
    return { since: wayback.since, source: "wayback", checkedAt };
  }

  // wayback.kind === "empty": Wayback genuinely has nothing on file.
  if (crt.kind === "date") return { since: crt.since, source: "crt.sh", checkedAt };
  if (crt.kind === "failed") return undefined;
  return null;
}
