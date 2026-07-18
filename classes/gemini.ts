// The shared grounded Gemini client for the whole backend: bank news, lender TEAs, price
// predictions, move explanations, UY figures, cost-of-living, debt relief — and the customs norms
// gate (via classes/aduana/gemini.ts, which re-exports from here).
//
// classes/ai_service.ts's `classify()` is a plain chat completion: no web access, no grounding. A
// model asked over a plain completion "does the decree still say USD 800?" can only answer from
// memory, and it will happily say yes — which is exactly how every date on a page ends up stamped
// "verified" by nobody. This module is the opposite contract: Gemini with the Google Search tool
// ON, returning the text AND the URIs of the pages it actually retrieved, so callers can refuse
// any proposal whose citation the model never opened (a cited URL it did not fetch is a
// hallucinated citation, which is the whole failure this module exists to stop).
//
// Same endpoint + guardrail + graceful-null pattern as app/server/utils/costOfLivingLive.ts, which
// does this app-side. Ported into the root backend because the scheduled jobs run here, and here
// the env comes from dotenv, not useRuntimeConfig.
//
// It NEVER throws. No key, HTTP error, timeout, empty candidate — all of it is `null`, which every
// caller reads as "no update this cycle".
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

// Model is env-overridable so a billing upgrade can swap in a bigger model with no code change.
// The default MUST be a model that is still served AND still supports the google_search grounding
// tool: `gemini-2.5-flash` was retired mid-2026 ("no longer available to new users" → a hard 404 on
// generateContent) and, because this shared client is the single Gemini path for every scheduled
// job, that one dead id silently took the WHOLE fleet down (banks-news / uy-figures / cost-of-living
// / debt-relief / aduana / loan Gemini-lenders / predictions / explain all stopped writing; only
// loan-rates' regex fallback kept producing). `gemini-2.5-flash-lite` is the current grounding-
// capable model verified working on the free-tier key.
export const GEMINI_MODEL = (process.env.GEMINI_MODEL || "gemini-2.5-flash-lite").trim();
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const TIMEOUT_MS = 30000;
/** Transient statuses worth retrying: 429 = free-tier per-minute quota, 503 = model overloaded. */
const RETRY_STATUSES = new Set([429, 503]);
const MAX_RETRIES = 4;

// Free-tier keys cap *grounded* generateContent at a low requests-per-minute rate. A caller firing
// at concurrency 4 (banks-news) blows past that in the first second and every call after the first
// draws a 429 — backoff alone can't recover because the whole burst keeps re-arriving. Setting
// GEMINI_MIN_INTERVAL_MS>0 paces the START of successive Gemini requests through one shared slot
// clock, serialising spacing across all concurrent callers regardless of their own concurrency
// (e.g. 15000 keeps a free-tier key under its grounded RPM). Default is 0 (no pacing): this project
// runs on a billed key whose RPM is high enough for concurrency 4, and 0 keeps the mocked test
// suite instant.
const MIN_INTERVAL_MS = ((): number => {
  const raw = Number(process.env.GEMINI_MIN_INTERVAL_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
})();
let nextSlot = 0;
async function pace(): Promise<void> {
  if (MIN_INTERVAL_MS <= 0) return;
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + MIN_INTERVAL_MS;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

/**
 * POST to Gemini with backoff on transient rate-limit / overload responses. The free-tier key has a
 * low requests-per-minute cap, so a burst (banks-news fires 11 grounded calls/lang at concurrency 4)
 * routinely draws 429s that a single-shot request would drop as `null` — losing that entity's news
 * for the day. Honour `Retry-After` when Google sends it, else exponential backoff with jitter so
 * the concurrent workers don't retry in lockstep. Any non-transient error (404 dead model, 400 bad
 * request) throws immediately — the caller's try/catch still turns it into the module's `null`.
 */
async function postGemini(body: unknown, timeoutMs: number, apiKey: string): Promise<{ data: GeminiResponse }> {
  let lastErr: any;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await pace();
      return await axios.post<GeminiResponse>(ENDPOINT, body, {
        params: { key: apiKey },
        timeout: timeoutMs,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: any) {
      lastErr = err;
      const status = err?.response?.status;
      if (!RETRY_STATUSES.has(status) || attempt === MAX_RETRIES) throw err;
      const retryAfter = Number(err?.response?.headers?.["retry-after"]);
      const waitMs =
        Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : Math.min(30000, 1500 * 2 ** attempt) + Math.floor(Math.random() * 1000);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw lastErr;
}
/** Following one grounding redirect must never hold a scheduled job hostage. */
const RESOLVE_TIMEOUT_MS = 8000;
const MAX_CHUNKS = 20;

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    groundingMetadata?: {
      groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
      groundingSupports?: GroundingSupport[];
    };
  }>;
}

export interface GroundingChunk {
  web?: { uri?: string; title?: string };
}

export interface GroundingSupport {
  segment: { text: string; startIndex?: number; endIndex: number };
  groundingChunkIndices: number[];
}

export interface GroundedHeadline {
  title: string;
  source: string;
  link: string;
}

export interface GroundedReply {
  /** The model's raw text. Still needs fence-stripping + JSON.parse — we never hand-repair it. */
  text: string;
  /**
   * URIs of the pages the model actually retrieved on this call, RESOLVED past Google's redirect
   * wrapper and compacted (no holes). Empty means it never searched, and an empty list admits
   * nothing: see norms.ts#isGrounded. `norms.ts` asks "did the model open this?" — holes would lie.
   */
  sourceUris: string[];
  /**
   * Raw chunks, index-aligned with `resolvedByChunk` and `supports`' groundingChunkIndices. For
   * groundedHeadlines(). Optional (not just empty-array-default) so that a hand-built
   * `GroundedReply` literal that predates this field — e.g. `tests/aduana/norms.test.ts`'s mock
   * helper, which the "do not touch the aduana tests" rule forbids editing — stays a valid
   * `GroundedReply` without a type error. `askGrounded` itself always populates all three.
   */
  chunks?: GroundingChunk[];
  supports?: GroundingSupport[];
  /** Index-aligned with `chunks`: the resolved url, or null when the redirect never resolved. */
  resolvedByChunk?: Array<string | null>;
}

/**
 * No key → the caller is a silent no-op, exactly like an unconfigured AIService.
 *
 * Accepts either env var name. This repo's actual Gemini key lives in `app/.env` as
 * `NUXT_GEMINI_API_KEY` (the Nuxt runtime-config convention — the app side reads it through
 * `useRuntimeConfig()`) or in the root `.env` as the bare `GEMINI_API_KEY` — the only file
 * `dotenv.config()` loads here. Reading only one name meant this gate was unconfigured in
 * production from the day it first shipped, and callers returned early with nothing logged, so a
 * scheduled job "ran" while never spending a single Gemini call and nobody could tell from the
 * logs. A skipped AI call must say so out loud.
 */
export function geminiConfigured(): boolean {
  const configured = !!(process.env.GEMINI_API_KEY || process.env.NUXT_GEMINI_API_KEY);
  if (!configured) {
    console.warn("[gemini] no GEMINI_API_KEY or NUXT_GEMINI_API_KEY set — Gemini calls are a no-op");
  }
  return configured;
}

/**
 * Resolve one grounding chunk's redirect wrapper to the real URL it points at.
 *
 * Google does not hand the source URL back directly: `groundingChunks[].web.uri` is a
 * `vertexaisearch.cloud.google.com/grounding-api-redirect/...` link. The only reliable signal for
 * the real URL is the `Location` header of the FIRST redirect response — NOT axios's
 * post-redirect `responseUrl` with `maxRedirects` > 0: `responseUrl` equals the REQUESTED url
 * whenever no redirect was actually followed, and Google's redirect endpoint answering HEAD with
 * 405 / 404, or a 200 meta-refresh, are all common — none of which throw under
 * `validateStatus: () => true`. So a blocked resolution used to silently "succeed" by resolving
 * to the wrapper URI itself. `maxRedirects: 0` plus reading `Location` directly removes that
 * ambiguity: only a response that actually carries `Location` counts as resolved.
 *
 * When it does not resolve, this returns `null` — never the wrapper URI, and never a
 * `https://<web.title>` fallback (an earlier version fell back to the title; `title` is the
 * source domain only by convention, is not verified, and is not a security boundary — pretending
 * an unresolved chunk "grounds" via its title is exactly the kind of lie this module exists to
 * catch). A comment used to live here claiming a failed resolution "can only make the gate
 * stricter" — that is false at host granularity: if the redirect endpoint stops answering with a
 * clean 3xx (which happens — 405s and meta-refreshes are routine), EVERY chunk fails to resolve,
 * EVERY proposal then fails `isGrounded`, and `pendingReview` — a union nothing discharges except
 * an actual future confirmation — accumulates every fact this module knows about, forever. A
 * permanently flagged fact is not a stricter gate; it is a gate that stopped functioning while
 * still ringing an alarm that looks like it's working.
 */
async function resolveUri(web: { uri?: string }): Promise<string | null> {
  if (!web.uri) return null;
  try {
    const res = await axios.get(web.uri, {
      timeout: RESOLVE_TIMEOUT_MS,
      maxRedirects: 0,
      validateStatus: () => true,
    });
    const loc = res.headers?.location as string | undefined;
    return loc || null; // no Location on the first hop ⇒ unresolved — never the wrapper itself
  } catch {
    return null;
  }
}

/**
 * One grounded question to Gemini. Returns the reply text plus the pages it retrieved, or `null`
 * on anything at all going wrong (including "not configured").
 */
export async function askGrounded(prompt: string): Promise<GroundedReply | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NUXT_GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await postGemini(
      {
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
      },
      TIMEOUT_MS,
      apiKey
    );

    const candidate = res.data?.candidates?.[0];
    const text = (candidate?.content?.parts ?? [])
      .map((p) => p.text ?? "")
      .join("")
      .trim();
    if (!text) return null;

    const webChunks = (candidate?.groundingMetadata?.groundingChunks ?? [])
      .slice(0, MAX_CHUNKS)
      .map((c) => c.web)
      .filter((w): w is { uri?: string; title?: string } => !!w);

    const settled = await Promise.allSettled(webChunks.map(resolveUri));
    // resolvedByChunk is index-aligned with chunks (a hole = a chunk that never resolved). Aduana's
    // norms.ts only ever asks "is this citation in the list?", so it reads sourceUris (compacted);
    // groundedHeadlines needs the alignment to pair a chunk with its real url, so it reads
    // resolvedByChunk instead.
    const resolvedByChunk = settled.map((s) => (s.status === "fulfilled" ? s.value : null));
    const sourceUris = resolvedByChunk.filter((u): u is string => typeof u === "string" && u.length > 0);

    return {
      text,
      sourceUris,
      chunks: webChunks.map((web) => ({ web })),
      supports: candidate?.groundingMetadata?.groundingSupports ?? [],
      resolvedByChunk,
    };
  } catch (error: any) {
    console.warn("[gemini] grounded call failed:", error?.message || error);
    return null;
  }
}

/**
 * Cited headlines from one grounded reply.
 *
 * Gemini's `groundingChunks[].web.title` is the bare DOMAIN, not a headline — the API has no
 * headline field. So the title is built from `groundingSupports`: the segment of the model's own
 * grounded narrative that cites this chunk most specifically (fewest chunks on that segment;
 * earliest wins ties), falling back to the domain. This is the port of the app's
 * utils/geminiGrounding.ts — with ONE deliberate difference: `link` is the RESOLVED url, and a
 * chunk whose redirect did not resolve is DROPPED. The app publishes the vertexaisearch wrapper as
 * the link, which is not a source and cannot be verified; and loanGeminiRate.ts gates on
 * `web.title` as if it were the host, which is a convention, not a guarantee (see resolveUri).
 */
export function groundedHeadlines(reply: GroundedReply, limit = 3): GroundedHeadline[] {
  const chunks = reply.chunks ?? [];
  const resolvedByChunk = reply.resolvedByChunk ?? [];
  const best = new Map<number, GroundingSupport>();
  for (const support of reply.supports ?? []) {
    for (const idx of support.groundingChunkIndices) {
      const current = best.get(idx);
      if (!current || support.groundingChunkIndices.length < current.groundingChunkIndices.length) {
        best.set(idx, support);
      }
    }
  }

  const out: GroundedHeadline[] = [];
  chunks.forEach((chunk, idx) => {
    const link = resolvedByChunk[idx]; // index-aligned; null/undefined ⇒ this chunk never resolved
    if (!link) return;
    const domain = (chunk.web?.title ?? "").replace(/^www\./i, "");
    const raw = best.get(idx)?.segment.text?.trim();
    const title = truncate(raw || domain, 140);
    if (!title) return;
    out.push({ title, source: domain || hostOf(link), link });
  });
  return out.slice(0, limit);
}

const truncate = (t: string, max: number): string => (t.length > max ? t.slice(0, max - 3) + "..." : t);
const hostOf = (u: string): string => {
  try {
    return new URL(u).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
};

/** One NON-grounded question (no google_search). For synthesis passes over text we already have. */
export async function askPlain(prompt: string, timeoutMs = TIMEOUT_MS): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NUXT_GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await postGemini({ contents: [{ parts: [{ text: prompt }] }] }, timeoutMs, apiKey);
    const text = (res.data?.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
    return text || null;
  } catch (error: any) {
    console.warn("[gemini] plain call failed:", error?.message || error);
    return null;
  }
}
