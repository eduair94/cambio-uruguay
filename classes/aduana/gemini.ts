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

/** No key → the norms refresh is a silent no-op, exactly like an unconfigured AIService. */
export function geminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

const looksLikeHost = (s: string): boolean => /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(s.trim());

/**
 * Turn one grounding chunk into the URI of the page the model really read.
 *
 * Google does not hand the source URL back directly: `groundingChunks[].web.uri` is a
 * `vertexaisearch.cloud.google.com/grounding-api-redirect/...` link and `web.title` carries the
 * source domain ("impo.com.uy"). Match a citation against the raw redirect and nothing EVER
 * matches — the gate would reject all 52 facts every week, which is just the silent no-op wearing
 * a different hat. So: follow the redirect to the real URL (HEAD, short timeout), and when that
 * fails fall back to `https://<title>` so at least the retrieved HOST survives. If even that is
 * unavailable we return the redirect URL itself: its host is not an official one, so it grounds
 * nothing — a failure to resolve can only ever make the gate stricter, never looser.
 */
async function resolveUri(web: { uri?: string; title?: string }): Promise<string | null> {
  const fallback = web.title && looksLikeHost(web.title) ? `https://${web.title.trim()}` : null;
  if (!web.uri) return fallback;
  try {
    const res = await axios.head(web.uri, {
      timeout: RESOLVE_TIMEOUT_MS,
      maxRedirects: 5,
      validateStatus: () => true,
    });
    const final = (res.request as any)?.res?.responseUrl as string | undefined;
    return final || fallback || web.uri;
  } catch {
    return fallback ?? web.uri;
  }
}

/**
 * One grounded question to Gemini. Returns the reply text plus the pages it retrieved, or `null`
 * on anything at all going wrong (including "not configured").
 */
export async function askGrounded(prompt: string): Promise<GroundedReply | null> {
  const apiKey = process.env.GEMINI_API_KEY;
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
