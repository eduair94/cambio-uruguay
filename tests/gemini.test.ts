import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const post = vi.fn();
const get = vi.fn();
vi.mock("axios", () => ({ default: { post: (...a: unknown[]) => post(...a), get: (...a: unknown[]) => get(...a) } }));

import { askGrounded, askPlain, geminiConfigured, groundedHeadlines } from "../classes/gemini";

const reply = (text: string, chunks: unknown[], supports: unknown[] = []) => ({
  data: {
    candidates: [
      { content: { parts: [{ text }] }, groundingMetadata: { groundingChunks: chunks, groundingSupports: supports } },
    ],
  },
});

describe("classes/gemini", () => {
  beforeEach(() => {
    post.mockReset();
    get.mockReset();
    process.env.GEMINI_API_KEY = "k";
  });
  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.NUXT_GEMINI_API_KEY;
  });

  it("is configured from GEMINI_API_KEY, and still from NUXT_GEMINI_API_KEY", () => {
    expect(geminiConfigured()).toBe(true);
    delete process.env.GEMINI_API_KEY;
    expect(geminiConfigured()).toBe(false);
    process.env.NUXT_GEMINI_API_KEY = "legacy";
    expect(geminiConfigured()).toBe(true);
  });

  it("returns the text, the RESOLVED source uris, and the raw chunks/supports", async () => {
    post.mockResolvedValue(
      reply("hola", [{ web: { uri: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/A", title: "bcu.gub.uy" } }])
    );
    get.mockResolvedValue({ headers: { location: "https://www.bcu.gub.uy/tasas" }, status: 302 });

    const out = await askGrounded("p");

    expect(out!.text).toBe("hola");
    expect(out!.sourceUris).toEqual(["https://www.bcu.gub.uy/tasas"]); // never the wrapper
    expect(out!.chunks).toHaveLength(1);
  });

  it("builds headlines whose link is the RESOLVED url, and drops a chunk that never resolved", async () => {
    post.mockResolvedValue(
      reply(
        "El BCU subió la tasa.",
        [
          { web: { uri: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/A", title: "bcu.gub.uy" } },
          { web: { uri: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/B", title: "elpais.com.uy" } },
        ],
        [{ segment: { text: "El BCU subió la tasa.", endIndex: 20 }, groundingChunkIndices: [0] }]
      )
    );
    // A resolves; B answers 405 with no Location (Google's redirect endpoint does this routinely).
    get.mockImplementation((url: string) =>
      url.endsWith("/A")
        ? Promise.resolve({ headers: { location: "https://www.bcu.gub.uy/tasas" }, status: 302 })
        : Promise.resolve({ headers: {}, status: 405 })
    );

    const heads = groundedHeadlines((await askGrounded("p"))!);

    expect(heads).toHaveLength(1); // B is dropped, never published as a vertexaisearch link
    expect(heads[0]).toEqual({
      title: "El BCU subió la tasa.",
      source: "bcu.gub.uy",
      link: "https://www.bcu.gub.uy/tasas",
    });
  });

  it("never throws: no key, an HTTP error and an empty candidate are all null", async () => {
    delete process.env.GEMINI_API_KEY;
    expect(await askGrounded("p")).toBeNull();
    expect(await askPlain("p")).toBeNull();

    process.env.GEMINI_API_KEY = "k";
    post.mockRejectedValue(new Error("429"));
    expect(await askGrounded("p")).toBeNull();

    post.mockResolvedValue({ data: { candidates: [] } });
    expect(await askGrounded("p")).toBeNull();
  });

  it("askPlain sends NO google_search tool", async () => {
    post.mockResolvedValue(reply("resumen", []));
    expect(await askPlain("p")).toBe("resumen");
    expect(post.mock.calls[0]![1]).not.toHaveProperty("tools");
  });
});
