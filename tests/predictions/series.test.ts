import { describe, expect, it, vi, beforeEach } from "vitest";

const get_data = vi.fn();
const get_currency_evolution = vi.fn();
vi.mock("../../classes/cambioInfo", () => ({
  cambio_info: {
    get_data: (...a: unknown[]) => get_data(...a),
    get_currency_evolution: (...a: unknown[]) => get_currency_evolution(...a),
  },
}));

import { fetchRecentSeries, listActiveCurrencies, resolveAnchor } from "../../classes/predictions/series";

describe("listActiveCurrencies", () => {
  beforeEach(() => {
    get_data.mockReset();
    get_currency_evolution.mockReset();
  });

  it("lists every distinct tradeable code, dropping UI/UR and duplicates", async () => {
    get_data.mockResolvedValue([
      { code: "USD", origin: "brou" },
      { code: "USD", origin: "prex" },
      { code: "UI", origin: "bcu" },
      { code: "ARS", origin: "bcu" },
    ]);
    expect(await listActiveCurrencies()).toEqual(["ARS", "USD"]);
  });

  it("degrades to an empty list when the rate source fails", async () => {
    get_data.mockRejectedValue(new Error("db down"));
    expect(await listActiveCurrencies()).toEqual([]);
  });
});

describe("resolveAnchor", () => {
  beforeEach(() => {
    get_data.mockReset();
    get_currency_evolution.mockReset();
  });

  it("uses the canonical anchor for USD/EUR/ARS without touching the live feed", async () => {
    expect(await resolveAnchor("USD")).toEqual({ origin: "bcu", code: "USD", type: "BILLETE" });
    expect(get_data).not.toHaveBeenCalled();
  });

  it("falls back to whichever live origin quotes a non-canonical currency", async () => {
    get_data.mockResolvedValue([{ code: "BRL", origin: "prex", type: "" }]);
    expect(await resolveAnchor("BRL")).toEqual({ origin: "prex", code: "BRL", type: "" });
  });

  it("returns null when nobody quotes the currency", async () => {
    get_data.mockResolvedValue([]);
    expect(await resolveAnchor("XYZ")).toBeNull();
  });
});

describe("fetchRecentSeries", () => {
  beforeEach(() => {
    get_data.mockReset();
    get_currency_evolution.mockReset();
  });

  it("normalizes evolution points into a date-sorted series", async () => {
    get_currency_evolution.mockResolvedValue({
      evolution: [
        { date: new Date("2026-07-01T00:00:00.000Z"), buy: 39, sell: 40 },
        { date: new Date("2026-07-02T00:00:00.000Z"), buy: 39.5, sell: 40.5 },
      ],
    });
    const out = await fetchRecentSeries("USD");
    expect(out).toEqual([
      { date: "2026-07-01", value: 40 },
      { date: "2026-07-02", value: 40.5 },
    ]);
    expect(get_currency_evolution).toHaveBeenCalledWith("bcu", "USD", 6, "BILLETE");
  });

  it("returns an empty series when the evolution lookup throws (no historical data)", async () => {
    get_currency_evolution.mockRejectedValue(new Error("No historical data found"));
    expect(await fetchRecentSeries("USD")).toEqual([]);
  });
});
