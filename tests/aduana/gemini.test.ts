// gemini.ts is the grounded leg of the norms gate: it must never call the real Gemini API from a
// unit test (network, cost, flakiness), so axios is mocked end to end. Two things are pinned here:
//   F1 — geminiConfigured()/askGrounded() must accept NUXT_GEMINI_API_KEY, because the root .env
//        (all dotenv.config() sees here) has no bare GEMINI_API_KEY — this repo's key lives in
//        app/.env under the Nuxt-prefixed name.
//   F3 — resolveUri() must resolve off the Location header of the FIRST redirect response
//        (maxRedirects: 0), and must never ground a chunk it could not resolve — not on the
//        wrapper URI, not on a title-derived guess.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("axios", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import axios from "axios";
import { askGrounded, geminiConfigured } from "../../classes/aduana/gemini";

const mockedPost = vi.mocked(axios.post);
const mockedGet = vi.mocked(axios.get);

const ORIGINAL_ENV = { ...process.env };

const groundedResponse = (chunks: Array<{ uri?: string; title?: string }>) => ({
  data: {
    candidates: [
      {
        content: { parts: [{ text: "[]" }] },
        groundingMetadata: {
          groundingChunks: chunks.map((web) => ({ web })),
        },
      },
    ],
  },
});

describe("geminiConfigured", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("is false with neither GEMINI_API_KEY nor NUXT_GEMINI_API_KEY set", () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.NUXT_GEMINI_API_KEY;
    expect(geminiConfigured()).toBe(false);
  });

  it("is true from the bare GEMINI_API_KEY", () => {
    process.env.GEMINI_API_KEY = "root-key";
    delete process.env.NUXT_GEMINI_API_KEY;
    expect(geminiConfigured()).toBe(true);
  });

  // F1: the root .env genuinely has no GEMINI_API_KEY — the real key lives under this name in
  // app/.env. Before the fix, only the bare name was read, so this was false in production.
  it("is true from NUXT_GEMINI_API_KEY alone, with no bare GEMINI_API_KEY set", () => {
    delete process.env.GEMINI_API_KEY;
    process.env.NUXT_GEMINI_API_KEY = "nuxt-key";
    expect(geminiConfigured()).toBe(true);
  });
});

describe("askGrounded / resolveUri", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-key";
    delete process.env.NUXT_GEMINI_API_KEY;
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("resolves a grounding chunk off the Location header of the first redirect response", async () => {
    mockedPost.mockResolvedValue(
      groundedResponse([{ uri: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/abc" }]) as any
    );
    mockedGet.mockResolvedValue({
      status: 302,
      headers: { location: "https://www.impo.com.uy/bases/decretos/50-2026" },
    } as any);

    const reply = await askGrounded("prompt");

    expect(reply).not.toBeNull();
    expect(reply!.sourceUris).toEqual(["https://www.impo.com.uy/bases/decretos/50-2026"]);
    // maxRedirects: 0 is what makes the Location header meaningful — following redirects would
    // make responseUrl ambiguous again (the F3 bug).
    expect(mockedGet).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ maxRedirects: 0 })
    );
  });

  // F3: a redirect endpoint answering 404 with no Location header (a common real failure mode —
  // Google's grounding-api-redirect occasionally 404s or meta-refreshes instead of a clean 3xx)
  // must ground nothing. Before the fix, `responseUrl` fell back to the REQUESTED wrapper URL
  // itself, which then "grounded" against the vertexaisearch.cloud.google.com host forever.
  it("grounds nothing when a chunk's redirect does not resolve — never the wrapper host", async () => {
    mockedPost.mockResolvedValue(
      groundedResponse([
        { uri: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/dead", title: "impo.com.uy" },
      ]) as any
    );
    mockedGet.mockResolvedValue({ status: 404, headers: {} } as any);

    const reply = await askGrounded("prompt");

    expect(reply).not.toBeNull();
    expect(reply!.sourceUris).toEqual([]); // NOT the wrapper URI, NOT a title-derived guess
  });

  // Same failure mode via a thrown error (timeout, DNS, etc.) instead of a non-3xx status.
  it("grounds nothing when resolving a chunk's redirect throws", async () => {
    mockedPost.mockResolvedValue(
      groundedResponse([{ uri: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/timeout" }]) as any
    );
    mockedGet.mockRejectedValue(new Error("timeout"));

    const reply = await askGrounded("prompt");

    expect(reply).not.toBeNull();
    expect(reply!.sourceUris).toEqual([]);
  });
});
