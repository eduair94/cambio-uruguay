import { describe, expect, it, vi, beforeEach } from "vitest";

const scrapeAllLenderRates = vi.fn();
vi.mock("../../classes/loans/scraper", async (orig) => ({
  ...(await orig<typeof import("../../classes/loans/scraper")>()),
  scrapeAllLenderRates: (...a: unknown[]) => scrapeAllLenderRates(...a),
}));

const fetchLenderRateFromGemini = vi.fn();
vi.mock("../../classes/loans/gemini", () => ({
  fetchLenderRateFromGemini: (...a: unknown[]) => fetchLenderRateFromGemini(...a),
}));

import { lenderIds } from "../../classes/loans/catalog";
import { refreshAllLenderRates } from "../../classes/loans/refresh";

describe("refreshAllLenderRates", () => {
  beforeEach(() => {
    scrapeAllLenderRates.mockReset();
    fetchLenderRateFromGemini.mockReset();
  });

  it("prefers a successful regex scrape over Gemini for a lender with a parser", async () => {
    scrapeAllLenderRates.mockResolvedValue([
      { id: "oca", teaPct: 39, ok: true },
      { id: "pronto", teaPct: null, ok: false },
      { id: "cash", teaPct: 63.9, ok: true },
    ]);
    fetchLenderRateFromGemini.mockResolvedValue(null);

    const out = await refreshAllLenderRates();
    const oca = out.find((r) => r.id === "oca")!;
    expect(oca).toMatchObject({ teaPct: 39, ok: true, method: "regex" });
    expect(fetchLenderRateFromGemini).not.toHaveBeenCalledWith(expect.objectContaining({ id: "oca" }));
  });

  it("falls back to Gemini when the regex parser fails or does not cover the lender", async () => {
    scrapeAllLenderRates.mockResolvedValue([
      { id: "oca", teaPct: null, ok: false },
      { id: "pronto", teaPct: null, ok: false },
      { id: "cash", teaPct: null, ok: false },
    ]);
    fetchLenderRateFromGemini.mockImplementation(async (lender: { id: string }) =>
      lender.id === "brou" ? { teaPct: 30, sourceUrl: "https://www.brou.com.uy/x" } : null
    );

    const out = await refreshAllLenderRates();
    const brou = out.find((r) => r.id === "brou")!;
    expect(brou).toMatchObject({ teaPct: 30, ok: true, method: "gemini", sourceUrl: "https://www.brou.com.uy/x" });
    const itau = out.find((r) => r.id === "itau")!;
    expect(itau).toMatchObject({ ok: false, method: "gemini" });
  });

  it("degrades every lender to ok:false rather than throwing when both paths fail", async () => {
    scrapeAllLenderRates.mockResolvedValue([]);
    fetchLenderRateFromGemini.mockResolvedValue(null);
    const out = await refreshAllLenderRates();
    expect(out).toHaveLength(lenderIds().length);
    expect(out.every((r) => r.ok === false)).toBe(true);
  });
});
