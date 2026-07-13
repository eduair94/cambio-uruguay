// The grounded leg of the weekly norms re-check.
//
// classes/ai_service.ts's `classify()` is a plain chat completion: no web access, no grounding. A
// model asked over a plain completion "does the decree still say USD 800?" can only answer from
// memory, and it will happily say yes — which is exactly how every date on a page ends up stamped
// "verified" by nobody. This module is the opposite contract: Gemini with the Google Search tool
// ON, returning the text AND the URIs of the pages it actually retrieved, so norms.ts can refuse
// any proposal whose citation the model never opened (a cited URL it did not fetch is a
// hallucinated citation, which is the whole failure the gate exists to stop).
//
// Same endpoint + guardrail + graceful-null pattern as app/server/utils/costOfLivingLive.ts, which
// does this app-side. Ported into the root backend because the weekly job runs here, and here the
// env comes from dotenv, not useRuntimeConfig.
//
// It NEVER throws. No key, HTTP error, timeout, empty candidate — all of it is `null`, which
// refreshNorms reads as "no update this week".
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const TIMEOUT_MS = 30000;
/** Following one grounding redirect must never hold the weekly job hostage. */
const RESOLVE_TIMEOUT_MS = 8000;
const MAX_CHUNKS = 20;

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    groundingMetadata?: {
      groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
    };
  }>;
}

export interface GroundedReply {
  /** The model's raw text. Still needs fence-stripping + JSON.parse — we never hand-repair it. */
  text: string;
  /**
   * URIs of the pages the model actually retrieved on this call. Empty means it never searched,
   * and an empty list admits nothing: see norms.ts#isGrounded.
   */
  sourceUris: string[];
}

/**
 * No key → the norms refresh is a silent no-op, exactly like an unconfigured AIService.
 *
 * Accepts either env var name. This repo's actual Gemini key lives in `app/.env` as
 * `NUXT_GEMINI_API_KEY` (the Nuxt runtime-config convention — the app side reads it through
 * `useRuntimeConfig()`). The root `.env` — the only file `dotenv.config()` loads here — has never
 * carried a bare `GEMINI_API_KEY`. Reading only that name meant this gate was unconfigured in
 * production from the day it shipped, and `refreshNorms` returned early with nothing logged, so
 * the weekly job "ran" while never re-checking a single norm and nobody could tell from the logs.
 */
export function geminiConfigured(): boolean {
  return !!(process.env.GEMINI_API_KEY || process.env.NUXT_GEMINI_API_KEY);
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
    const res = await axios.post<GeminiResponse>(
      ENDPOINT,
      {
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
      },
      {
        params: { key: apiKey },
        timeout: TIMEOUT_MS,
        headers: { "Content-Type": "application/json" },
      }
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
    const sourceUris = settled
      .map((s) => (s.status === "fulfilled" ? s.value : null))
      .filter((u): u is string => typeof u === "string" && u.length > 0);

    return { text, sourceUris };
  } catch (error: any) {
    console.warn("[aduana] gemini grounded call failed:", error?.message || error);
    return null;
  }
}
