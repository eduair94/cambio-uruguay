import { describe, expect, it, vi, beforeEach } from "vitest";

const askGrounded = vi.fn();
vi.mock("../../classes/gemini", async (orig) => ({
  ...(await orig<typeof import("../../classes/gemini")>()),
  geminiConfigured: () => true,
  askGrounded: (...a: unknown[]) => askGrounded(...a),
}));

import { fetchLenderRateFromGemini } from "../../classes/loans/gemini";

const LENDER = { id: "creditel", name: "Creditel", website: "https://www.creditel.com.uy", source: "https://www.creditel.com.uy/tasas" };

const reply = (text: string, links: string[]) => ({
  text,
  sourceUris: links,
  resolvedByChunk: links,
  chunks: links.map((l) => ({ web: { uri: "https://vertexaisearch.cloud.google.com/x", title: new URL(l).hostname } })),
  supports: [],
});

describe("fetchLenderRateFromGemini", () => {
  beforeEach(() => askGrounded.mockReset());

  it("takes a rate cited on the lender's own site", async () => {
    askGrounded.mockResolvedValue(reply("TEA: 89.5%", ["https://www.creditel.com.uy/tasas"]));
    const out = await fetchLenderRateFromGemini(LENDER);
    expect(out).toEqual({ teaPct: 89.5, sourceUrl: "https://www.creditel.com.uy/tasas" });
  });

  it("REFUSES a rate whose only citation is somebody else's site", async () => {
    // The bug this prevents: a comparison blog quoting a rival's rate, attributed to this lender.
    askGrounded.mockResolvedValue(reply("TEA: 42.0%", ["https://elpais.com.uy/prestamos"]));
    expect(await fetchLenderRateFromGemini(LENDER)).toBeNull();
  });

  it("REFUSES a rate the model never cited at all", async () => {
    askGrounded.mockResolvedValue(reply("TEA: 42.0%", []));
    expect(await fetchLenderRateFromGemini(LENDER)).toBeNull();
  });

  it("refuses an implausible TEA and a 'not found' reply", async () => {
    askGrounded.mockResolvedValue(reply("TEA: 900%", ["https://www.creditel.com.uy/tasas"]));
    expect(await fetchLenderRateFromGemini(LENDER)).toBeNull();
    askGrounded.mockResolvedValue(reply("TEA: NO ENCONTRADO", ["https://www.creditel.com.uy/tasas"]));
    expect(await fetchLenderRateFromGemini(LENDER)).toBeNull();
  });
});
