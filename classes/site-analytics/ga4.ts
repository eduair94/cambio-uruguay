// Minimal Google Analytics Data API (GA4) v1beta client.
//
// No new dependency on purpose: the whole client is a service-account JWT signed with node's own
// `crypto` + two axios calls (token, then batchRunReports). `@google-analytics/data` would pull the
// gRPC stack into a repo that already ships two puppeteers; the REST surface we need is three
// endpoints wide.
//
// WHAT IT NEEDS (see docs/analytics/GA4_DATA_API.md for the click-by-click setup):
//   GA4_PROPERTY_ID   the NUMERIC property id (Admin → Property Settings), NOT the G-XXXXXXX
//                     measurement id — that one is write-only and the Data API rejects it.
//   credentials, in this order of precedence:
//     GA4_CLIENT_EMAIL + GA4_PRIVATE_KEY   (the two fields of the service-account JSON; the private
//                                          key may carry literal `\n` escapes, as in a .env file)
//     GA4_KEY_FILE                         path to the service-account JSON
//     sheet_key.json                       the Sheets service account this repo already deploys —
//                                          reused if you granted it Viewer on the GA4 property
//
// The service account must be added to the GA4 property with the *Viewer* role, and the
// "Google Analytics Data API" must be enabled in its Google Cloud project. Both are one-time.
import axios from "axios";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const API_ROOT = "https://analyticsdata.googleapis.com/v1beta";
/** batchRunReports accepts at most 5 report requests per call. */
export const MAX_REPORTS_PER_BATCH = 5;

export interface Ga4Credentials {
  clientEmail: string;
  privateKey: string;
}

export interface Ga4DateRange {
  startDate: string;
  endDate: string;
}

export interface Ga4ReportRequest {
  dateRanges: Ga4DateRange[];
  dimensions?: { name: string }[];
  metrics: { name: string }[];
  limit?: number;
  offset?: number;
  orderBys?: any[];
  dimensionFilter?: any;
  keepEmptyRows?: boolean;
}

export interface Ga4Report {
  dimensionHeaders?: { name: string }[];
  metricHeaders?: { name: string; type?: string }[];
  rows?: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }[];
  rowCount?: number;
  metadata?: { currencyCode?: string; timeZone?: string };
}

/** One report row flattened to `{ dimensionName: string, metricName: number }`. */
export type Ga4Row = Record<string, string | number>;

function readKeyFile(file: string): Ga4Credentials | null {
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    if (raw?.client_email && raw?.private_key) {
      return { clientEmail: String(raw.client_email), privateKey: String(raw.private_key) };
    }
  } catch {
    // unreadable or not JSON — fall through to the next source
  }
  return null;
}

/** Resolves the service account from env, an explicit key file, or the repo's Sheets key. */
export function ga4Credentials(): Ga4Credentials | null {
  const email = process.env.GA4_CLIENT_EMAIL;
  const key = process.env.GA4_PRIVATE_KEY;
  if (email && key) {
    // A .env cannot hold real newlines, so the private key travels with `\n` escapes.
    return { clientEmail: email, privateKey: key.replace(/\\n/g, "\n") };
  }
  const explicit = process.env.GA4_KEY_FILE;
  if (explicit) {
    const fromFile = readKeyFile(path.isAbsolute(explicit) ? explicit : path.join(process.cwd(), explicit));
    if (fromFile) return fromFile;
  }
  // Last resort: the Google service account this repo already deploys for the Sheets sync. Works
  // only if it was granted Viewer on the GA4 property (documented as the low-friction option).
  return readKeyFile(path.join(process.cwd(), "sheet_key.json"));
}

/** The numeric property id, tolerating a pasted `properties/123456789`. */
export function ga4PropertyId(): string {
  return String(process.env.GA4_PROPERTY_ID || "").replace(/^properties\//, "").trim();
}

export function ga4Configured(): boolean {
  return !!ga4PropertyId() && !!ga4Credentials();
}

/** Loud, actionable reason the job cannot run — used by the pm2 entrypoint. */
export function ga4ConfigProblem(): string | null {
  if (!ga4PropertyId()) {
    return "GA4_PROPERTY_ID is not set (numeric property id from GA4 Admin → Property Settings, not the G-XXXXXXX measurement id)";
  }
  if (!ga4Credentials()) {
    return "no GA4 service account: set GA4_CLIENT_EMAIL + GA4_PRIVATE_KEY, or GA4_KEY_FILE, or deploy sheet_key.json and grant that account Viewer on the property";
  }
  return null;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

let cachedToken: { value: string; expiresAt: number } | null = null;

/** Self-signed JWT → OAuth2 access token, cached until a minute before it expires. */
export async function ga4AccessToken(creds?: Ga4Credentials): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 60 > now) return cachedToken.value;

  const c = creds || ga4Credentials();
  if (!c) throw new Error("GA4: no service-account credentials available");

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: c.clientEmail,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );
  const signature = base64url(crypto.createSign("RSA-SHA256").update(`${header}.${claim}`).sign(c.privateKey));
  const assertion = `${header}.${claim}.${signature}`;

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });
  const { data } = await axios.post(TOKEN_URL, body.toString(), {
    headers: { "content-type": "application/x-www-form-urlencoded" },
    timeout: 20000,
  });
  if (!data?.access_token) throw new Error("GA4: token endpoint returned no access_token");

  cachedToken = { value: data.access_token, expiresAt: now + Number(data.expires_in || 3600) };
  return cachedToken.value;
}

/** Only exported so tests can start from a clean token cache. */
export function resetGa4TokenCache(): void {
  cachedToken = null;
}

/**
 * Runs up to {@link MAX_REPORTS_PER_BATCH} reports in one call, chunking anything longer. Reports
 * come back in request order.
 */
export async function runReports(requests: Ga4ReportRequest[], propertyId?: string): Promise<Ga4Report[]> {
  const property = propertyId || ga4PropertyId();
  if (!property) throw new Error("GA4: GA4_PROPERTY_ID is not set");
  const token = await ga4AccessToken();

  const out: Ga4Report[] = [];
  for (let i = 0; i < requests.length; i += MAX_REPORTS_PER_BATCH) {
    const chunk = requests.slice(i, i + MAX_REPORTS_PER_BATCH);
    const { data } = await axios.post(
      `${API_ROOT}/properties/${property}:batchRunReports`,
      { requests: chunk },
      { headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, timeout: 60000 }
    );
    out.push(...((data?.reports || []) as Ga4Report[]));
  }
  return out;
}

export interface Ga4RealtimeRequest {
  dimensions?: { name: string }[];
  metrics: { name: string }[];
  limit?: number;
  orderBys?: any[];
}

/**
 * The Realtime report: activity in the last 30 minutes. Separate endpoint from runReport, with its
 * own (much smaller) set of dimensions — `minutesAgo`, `unifiedScreenName`, `country`,
 * `deviceCategory` — and NO date ranges, because "now" is the only range there is. It also has no
 * batch form, so each report is its own round trip; the caller is expected to cache.
 */
export async function runRealtimeReport(request: Ga4RealtimeRequest, propertyId?: string): Promise<Ga4Report> {
  const property = propertyId || ga4PropertyId();
  if (!property) throw new Error("GA4: GA4_PROPERTY_ID is not set");
  const token = await ga4AccessToken();
  const { data } = await axios.post(`${API_ROOT}/properties/${property}:runRealtimeReport`, request, {
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    timeout: 20000,
  });
  return data as Ga4Report;
}

/**
 * Flattens a report into plain rows: dimensions as strings, metrics as numbers, both keyed by the
 * GA4 API name. Missing headers/rows degrade to `[]` rather than throwing — a quiet day is a real
 * answer, not an error.
 */
export function reportRows(report: Ga4Report | undefined): Ga4Row[] {
  if (!report?.rows?.length) return [];
  const dims = (report.dimensionHeaders || []).map((h) => h.name);
  const mets = (report.metricHeaders || []).map((h) => h.name);
  return report.rows.map((row) => {
    const out: Ga4Row = {};
    dims.forEach((name, i) => {
      out[name] = row.dimensionValues?.[i]?.value ?? "";
    });
    mets.forEach((name, i) => {
      const raw = row.metricValues?.[i]?.value;
      const n = Number(raw);
      out[name] = Number.isFinite(n) ? n : 0;
    });
    return out;
  });
}

/** The single row of a totals-only report (no dimensions), or an all-zero row. */
export function reportTotals(report: Ga4Report | undefined): Ga4Row {
  const rows = reportRows(report);
  if (rows[0]) return rows[0];
  const out: Ga4Row = {};
  for (const h of report?.metricHeaders || []) out[h.name] = 0;
  return out;
}
