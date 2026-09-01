// Minimal Google Search Console API client.
//
// Same shape as classes/site-analytics/ga4.ts and for the same reason: a service-account JWT signed
// with node's own `crypto` plus axios is the whole client. `googleapis` would pull a few hundred
// megabytes of generated surface to call two endpoints.
//
// WHAT IT NEEDS:
//   GSC_SITE_URL   the property identifier. A DOMAIN property is `sc-domain:cambio-uruguay.com`
//                  (this is what the site has, verified 2026-09-01); a URL-prefix property would be
//                  `https://cambio-uruguay.com/`. Defaults to the domain property.
//   credentials, in this order of precedence — deliberately the SAME resolution order as ga4.ts, so
//   one key file serves both:
//     GSC_CLIENT_EMAIL + GSC_PRIVATE_KEY
//     GSC_KEY_FILE     path to a service-account JSON
//     GA4_CLIENT_EMAIL + GA4_PRIVATE_KEY / GA4_KEY_FILE   the GA4 key, reused
//     sheet_key.json   the Sheets service account this repo already deploys
//
// The service account must be added in Search Console → Configuración → Usuarios y permisos. Read
// access ("Restringido") is enough for searchAnalytics; "Completo" is required for URL Inspection.
//
// THE THREE-DAY LAG IS NOT A BUG. Search Console finalises a day about 2–3 days late. Every query
// here ends at `today - 3` with `dataState: "final"`, and the archive re-fetches the last week on
// every run so a day that arrived late is corrected in place rather than frozen wrong.
import axios from "axios";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

import type { GscRow } from "./types";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const API_ROOT = "https://www.googleapis.com/webmasters/v3";

/** The API's hard cap for one request. Paging past it uses `startRow`. */
export const MAX_ROWS_PER_REQUEST = 25000;
/** Days Search Console needs before a day stops changing. */
export const FINAL_DATA_LAG_DAYS = 3;

export interface GscCredentials {
  clientEmail: string;
  privateKey: string;
}

function readKeyFile(file: string): GscCredentials | null {
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    if (raw?.client_email && raw?.private_key) {
      return { clientEmail: raw.client_email, privateKey: raw.private_key };
    }
  } catch {
    /* unreadable or not a key file — fall through to the next candidate */
  }
  return null;
}

export function gscCredentials(): GscCredentials | null {
  const email = process.env.GSC_CLIENT_EMAIL || process.env.GA4_CLIENT_EMAIL;
  const key = process.env.GSC_PRIVATE_KEY || process.env.GA4_PRIVATE_KEY;
  if (email && key) {
    // A .env file cannot hold a real newline, so the key arrives with literal `\n`.
    return { clientEmail: email, privateKey: key.replace(/\\n/g, "\n") };
  }
  const candidates = [
    process.env.GSC_KEY_FILE,
    process.env.GA4_KEY_FILE,
    path.resolve(process.cwd(), "gsc_key.json"),
    path.resolve(process.cwd(), "ga4_key.json"),
    path.resolve(process.cwd(), "sheet_key.json"),
  ].filter(Boolean) as string[];
  for (const file of candidates) {
    const found = readKeyFile(file);
    if (found) return found;
  }
  return null;
}

export function siteUrl(): string {
  return (process.env.GSC_SITE_URL || "sc-domain:cambio-uruguay.com").trim();
}

/** Human-readable reason the job cannot run, or null when it can. */
export function gscConfigProblem(): string | null {
  if (!gscCredentials()) {
    return (
      "no Search Console credentials — set GSC_CLIENT_EMAIL + GSC_PRIVATE_KEY, or GSC_KEY_FILE, or " +
      "let it reuse the GA4 key (GA4_KEY_FILE). The service account also has to be added in Search " +
      "Console → Configuración → Usuarios y permisos"
    );
  }
  if (!siteUrl()) return "GSC_SITE_URL is empty";
  return null;
}

function b64url(input: crypto.BinaryLike): string {
  return Buffer.from(input as any)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function accessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + 60) return cachedToken.token;

  const creds = gscCredentials();
  if (!creds) throw new Error(gscConfigProblem() || "missing credentials");

  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({
      iss: creds.clientEmail,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const signature = b64url(signer.sign(creds.privateKey));

  const res = await axios.post(
    TOKEN_URL,
    new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claim}.${signature}`,
    }).toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 30000 }
  );
  cachedToken = { token: res.data.access_token, expiresAt: now + 3500 };
  return cachedToken.token;
}

export interface SearchAnalyticsQuery {
  startDate: string;
  endDate: string;
  dimensions?: string[];
  /** Stop after this many rows even if the API has more. Protects the archive from a runaway day. */
  maxRows?: number;
  rowLimit?: number;
  dimensionFilterGroups?: any[];
  /** `final` (default) excludes the still-moving last days; `all` includes them. */
  dataState?: "final" | "all";
  type?: "web" | "image" | "video" | "news" | "discover" | "googleNews";
}

/**
 * One searchAnalytics.query, paged to completion (or to `maxRows`).
 *
 * Returns rows exactly as the API shapes them. The caller decides what a `keys` array means, since
 * that depends on the dimensions it asked for.
 */
export async function searchAnalytics(q: SearchAnalyticsQuery): Promise<GscRow[]> {
  const token = await accessToken();
  const url = `${API_ROOT}/sites/${encodeURIComponent(siteUrl())}/searchAnalytics/query`;
  const rowLimit = Math.min(q.rowLimit || MAX_ROWS_PER_REQUEST, MAX_ROWS_PER_REQUEST);
  const maxRows = q.maxRows ?? Number.POSITIVE_INFINITY;

  const out: GscRow[] = [];
  let startRow = 0;
  for (;;) {
    const body: any = {
      startDate: q.startDate,
      endDate: q.endDate,
      dataState: q.dataState || "final",
      rowLimit,
      startRow,
    };
    if (q.dimensions?.length) body.dimensions = q.dimensions;
    if (q.dimensionFilterGroups) body.dimensionFilterGroups = q.dimensionFilterGroups;
    if (q.type) body.type = q.type;

    const res = await axios.post(url, body, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      timeout: 120000,
    });
    const rows: any[] = res.data?.rows || [];
    for (const r of rows) {
      out.push({
        keys: r.keys || [],
        clicks: r.clicks || 0,
        impressions: r.impressions || 0,
        ctr: r.ctr || 0,
        position: r.position || 0,
      });
      if (out.length >= maxRows) return out;
    }
    // A short page means the API has nothing more to give.
    if (rows.length < rowLimit) return out;
    startRow += rows.length;
  }
}

/** `YYYY-MM-DD`, `offset` days before `from` (defaults to now). UTC, matching Search Console. */
export function dayOffset(offset: number, from: number = Date.now()): string {
  return new Date(from - offset * 86400000).toISOString().slice(0, 10);
}

/** The most recent day Search Console considers final. */
export function lastFinalDay(from: number = Date.now()): string {
  return dayOffset(FINAL_DATA_LAG_DAYS, from);
}

export interface SiteEntry {
  siteUrl: string;
  permissionLevel: string;
}

/** Properties the service account can read. Used by the preflight check to give an exact error. */
export async function listSites(): Promise<SiteEntry[]> {
  const token = await accessToken();
  const res = await axios.get(`${API_ROOT}/sites`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 30000,
  });
  return (res.data?.siteEntry || []).map((s: any) => ({
    siteUrl: s.siteUrl,
    permissionLevel: s.permissionLevel,
  }));
}

export interface UrlInspection {
  url: string;
  verdict: string;
  coverageState: string;
  robotsTxtState: string;
  indexingState: string;
  lastCrawlTime: string | null;
  googleCanonical: string | null;
  userCanonical: string | null;
  pageFetchState: string | null;
}

/**
 * URL Inspection API — the only programmatic read of "is this URL actually indexed".
 *
 * QUOTA IS THE WHOLE DESIGN CONSTRAINT: 2000 calls per property per day, 600 per minute. That is
 * why the caller samples a rotating handful of URLs a day instead of sweeping the ~1900-URL site.
 * Requires "Completo" permission — with read-only access this 403s, which the caller treats as
 * "skip", not as a failure.
 */
export async function inspectUrl(inspectionUrl: string, siteOverride?: string): Promise<UrlInspection | null> {
  const token = await accessToken();
  try {
    const res = await axios.post(
      "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
      { inspectionUrl, siteUrl: siteOverride || siteUrl() },
      { headers: { Authorization: `Bearer ${token}` }, timeout: 60000 }
    );
    const r = res.data?.inspectionResult?.indexStatusResult || {};
    return {
      url: inspectionUrl,
      verdict: r.verdict || "UNKNOWN",
      coverageState: r.coverageState || "",
      robotsTxtState: r.robotsTxtState || "",
      indexingState: r.indexingState || "",
      lastCrawlTime: r.lastCrawlTime || null,
      googleCanonical: r.googleCanonical || null,
      userCanonical: r.userCanonical || null,
      pageFetchState: r.pageFetchState || null,
    };
  } catch (e: any) {
    const status = e?.response?.status;
    // 403 = the service account has read-only permission; 429 = daily quota spent. Both mean "no
    // inspection today", never "the site is broken".
    if (status === 403 || status === 429) return null;
    throw e;
  }
}
