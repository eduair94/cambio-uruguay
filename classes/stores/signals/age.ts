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
//
// Item H (fix round F2): "Wayback" above really means two endpoints tried in order. The CDX search
// (`web.archive.org/cdx/search/cdx`) goes first, exactly as described above; only when it fails
// outright — the 503 measured live on 2026-09-17 while writing this fix, not merely "nothing on
// file" — does the Availability API (`archive.org/wayback/available`, a different host, so a
// CDX-specific outage does not necessarily take it down too) get a chance, still published as
// `source: "wayback"` either way (see `attemptWayback`/`attemptWaybackAvailable` below).
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

/**
 * Item H: the Wayback Availability API's own answer shape, parsed independently of `Outcome` above
 * because this endpoint can fail in a THIRD way `waybackFirstCapture`'s CDX shape cannot: a
 * perfectly valid JSON object that simply isn't the documented `archived_snapshots` shape at all
 * (`invalid`), as opposed to the documented shape confirming there is nothing on file (`empty`).
 */
export type WaybackAvailableResult = { kind: "date"; since: string } | { kind: "empty" } | { kind: "invalid" };

/**
 * `https://archive.org/wayback/available?url=<domain>&timestamp=19900101` — item H's second Wayback
 * endpoint, tried only once the CDX search has failed outright. Requesting a capture "closest" to
 * 1990-01-01 (years before any real Uruguayan store went online) makes `archived_snapshots.closest`
 * degenerate to the EARLIEST capture on file: every real capture is closer in time to 1990-01-01
 * than a later one is. Live-verified 2026-09-17 for tiendainglesa.com.uy while the CDX endpoint
 * itself answered 503: this endpoint answered `20010201203000` (2001-02-01) — years before crt.sh's
 * own earliest certificate (2019-09-30), the same understatement pattern the module header
 * describes, and a plausible "first seen" for one of Uruguay's oldest supermarket chains.
 *
 * Pure, and exercised directly the same way `waybackFirstCapture` is. Any body that doesn't match
 * the documented shape EXACTLY — not an object, missing the top-level `url` string, an
 * `archived_snapshots`/`closest` that isn't itself a plain object, a `closest.available` that isn't
 * literally `true`, or a `timestamp` that doesn't start with an 8-digit date — is `invalid`, never
 * `empty`: the same rule item E applies to the CDX endpoint's own non-array body, applied here so a
 * malformed or unrelated JSON response can never be mistaken for the documented "never captured"
 * shape (no `archived_snapshots` at all, with the required top-level `url` still present).
 */
export function parseWaybackAvailable(body: unknown): WaybackAvailableResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { kind: "invalid" };
  const root = body as Record<string, unknown>;
  if (typeof root.url !== "string") return { kind: "invalid" };

  const snapshots = root.archived_snapshots;
  if (snapshots === undefined) return { kind: "empty" };
  if (typeof snapshots !== "object" || snapshots === null || Array.isArray(snapshots)) {
    return { kind: "invalid" };
  }

  const closest = (snapshots as Record<string, unknown>).closest;
  if (closest === undefined) return { kind: "empty" };
  if (typeof closest !== "object" || closest === null || Array.isArray(closest)) {
    return { kind: "invalid" };
  }

  const c = closest as Record<string, unknown>;
  if (c.available !== true || typeof c.timestamp !== "string") return { kind: "invalid" };
  const match = /^(\d{4})(\d{2})(\d{2})/.exec(c.timestamp);
  return match ? { kind: "date", since: `${match[1]}-${match[2]}-${match[3]}` } : { kind: "invalid" };
}

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
async function attemptWaybackCdx(domain: string): Promise<Outcome> {
  const url = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}&output=json&limit=1&fl=timestamp`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await httpText(url);
    if (res && res.status === 200) {
      try {
        const parsed = JSON.parse(res.body);
        // Item E (fix round F2): a 200 that parses as JSON but isn't the CDX array shape at all
        // (an object, a string, `null`, `{"error": "..."}`...) is Wayback FAILING to answer, same as
        // item 8's non-JSON body — not "nothing on file". `waybackFirstCapture` already returns
        // `null` for any non-array, which previously read here as a confirmed-empty result; a
        // malformed or unrelated JSON 200 could erase a stored age this way. Only an actual array —
        // even one whose single row is just the header, i.e. truly zero captures — is an answer.
        if (!Array.isArray(parsed)) throw new Error("non-array Wayback CDX body");
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

/** Item H: `attemptWaybackCdx`'s own retry loop, reused for the availability fallback — the only
 * difference is the URL and the parser (`parseWaybackAvailable`'s three-way result folded into the
 * same two-value `Outcome` every other attempt here returns: `invalid` degrades to `failed`, same as
 * a non-JSON body, never to `empty`). */
async function attemptWaybackAvailable(domain: string): Promise<Outcome> {
  const url = `https://archive.org/wayback/available?url=${encodeURIComponent(domain)}&timestamp=19900101`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await httpText(url);
    if (res && res.status === 200) {
      try {
        const parsed = parseWaybackAvailable(JSON.parse(res.body));
        if (parsed.kind !== "invalid") return parsed;
      } catch {
        // A non-JSON 200 body gets the same retry/failed treatment as the CDX endpoint's own.
      }
    }
    if (attempt === 0) await sleep(RETRY_DELAY_MS);
  }
  return { kind: "failed" };
}

/**
 * Item H: CDX first, exactly as before this fix round; only when it FAILED outright (after its own
 * retry above) does the availability API get a chance. A working CDX answer — including its own
 * confirmed "nothing on file" — is never second-guessed by the fallback: the fallback exists for
 * when Wayback could not be asked at all through the primary endpoint (the 503 measured live on
 * 2026-09-17), not to overrule what CDX did answer.
 */
async function attemptWayback(domain: string): Promise<Outcome> {
  const cdx = await attemptWaybackCdx(domain);
  if (cdx.kind !== "failed") return cdx;
  return attemptWaybackAvailable(domain);
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
