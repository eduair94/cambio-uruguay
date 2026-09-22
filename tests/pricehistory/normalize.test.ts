import { describe, expect, it } from "vitest";
import { seriesFromCarListing, seriesFromMarketLog, seriesFromPricewatch, summarize } from "../../classes/pricehistory/normalize";

const pricewatchDoc = (over: Record<string, unknown> = {}) => ({
  listingId: "ml:MLU123",
  vertical: "equipar",
  title: "Heladera Mademsa 300L",
  url: "https://articulo.mercadolibre.com.uy/MLU-123",
  sellerKey: "tienda",
  sellerName: "Tienda",
  source: "mercadolibre",
  currency: "UYU",
  firstSeen: "2026-09-17",
  lastSeen: "2026-09-22",
  history: [
    { d: "2026-09-17", p: 30000, lp: null, c: "UYU" },
    { d: "2026-09-22", p: 27000, lp: null, c: "UYU" },
  ],
  ...over,
});

describe("seriesFromPricewatch", () => {
  it("arma la serie del aviso con su variación", () => {
    const series = seriesFromPricewatch(pricewatchDoc());
    expect(series?.points).toEqual([
      { d: "2026-09-17", p: 30000 },
      { d: "2026-09-22", p: 27000 },
    ]);
    expect(series?.changePct).toBeCloseTo(-10, 5);
    expect(series?.lastChange).toEqual({ from: 30000, to: 27000, at: "2026-09-22" });
    expect(series?.currencySwitched).toBe(false);
    expect(series?.vertical).toBe("equipar");
    expect(series?.source).toBe("pricewatch");
  });

  it("un punto sin moneda es del aviso, no otra moneda", () => {
    // Los puntos anteriores al 2026-09-17 no llevan `c` (PRICEWATCH.md): "desconocida" hereda la
    // moneda del aviso, nunca corta la serie.
    const series = seriesFromPricewatch(
      pricewatchDoc({
        vertical: "sillas",
        history: [
          { d: "2026-09-10", p: 5000, lp: null },
          { d: "2026-09-12", p: 4500, lp: null, c: "UYU" },
        ],
      })
    );
    expect(series?.points).toHaveLength(2);
    expect(series?.currencySwitched).toBe(false);
  });

  it("corta en el cambio de moneda y no inventa una caída", () => {
    const series = seriesFromPricewatch(
      pricewatchDoc({
        vertical: "celulares",
        history: [
          { d: "2026-09-01", p: 300, lp: null, c: "USD" },
          { d: "2026-09-20", p: 12000, lp: null, c: "UYU" },
        ],
      })
    );
    expect(series?.points).toEqual([{ d: "2026-09-20", p: 12000 }]);
    expect(series?.changePct).toBeNull();
    expect(series?.lastChange).toBeNull();
    expect(series?.currencySwitched).toBe(true);
  });

  it("sin historia devuelve null", () => {
    expect(seriesFromPricewatch(pricewatchDoc({ history: [] }))).toBeNull();
  });

  it("descarta puntos corruptos en vez de publicarlos", () => {
    const series = seriesFromPricewatch(
      pricewatchDoc({
        history: [
          { d: "2026-09-17", p: 0, lp: null, c: "UYU" },
          { d: "no-es-fecha", p: 100, lp: null, c: "UYU" },
          { d: "2026-09-22", p: 27000, lp: null, c: "UYU" },
        ],
      })
    );
    expect(series?.points).toEqual([{ d: "2026-09-22", p: 27000 }]);
  });

  it("una vertical que no conocemos no se publica", () => {
    expect(seriesFromPricewatch(pricewatchDoc({ vertical: "otra-cosa" }))).toBeNull();
  });
});

describe("seriesFromCarListing", () => {
  it("usa observedAt como día y la moneda del punto", () => {
    const series = seriesFromCarListing({
      key: "mercadolibre:MLU9",
      firstSeen: "2026-09-17",
      lastSeen: "2026-09-22",
      listing: { title: "Chevrolet Onix 2018", url: "https://x/y", sellerName: "Automotora", currency: "USD" },
      priceHistory: [
        { price: 12490, currency: "USD", observedAt: "2026-09-17T06:35:09.109Z" },
        { price: 11900, currency: "USD", observedAt: "2026-09-17T20:33:48.260Z" },
      ],
    });
    expect(series?.points).toEqual([
      { d: "2026-09-17", p: 12490 },
      { d: "2026-09-17", p: 11900 },
    ]);
    expect(series?.lastChange).toEqual({ from: 12490, to: 11900, at: "2026-09-17" });
    expect(series?.currency).toBe("USD");
    expect(series?.vertical).toBe("autos");
    expect(series?.source).toBe("carlistings");
  });

  it("un aviso con un solo punto no tiene variación", () => {
    const series = seriesFromCarListing({
      key: "mercadolibre:MLU1",
      firstSeen: "2026-09-20",
      lastSeen: "2026-09-22",
      listing: { title: "Fiat Cronos 2020", url: "https://x", sellerName: "Dueño", currency: "USD" },
      priceHistory: [{ price: 15000, currency: "USD", observedAt: "2026-09-20T10:00:00.000Z" }],
    });
    expect(series?.points).toHaveLength(1);
    expect(series?.changePct).toBeNull();
  });
});

describe("seriesFromMarketLog", () => {
  it("lee points {d,p,c} y no trae título ni url", () => {
    const series = seriesFromMarketLog({
      key: "alquiler:infocasas:1",
      vertical: "alquiler",
      advertId: "infocasas:1",
      firstSeen: "2026-09-08",
      lastSeen: "2026-09-22",
      points: [
        { d: "2026-09-08", p: 15500, c: "UYU" },
        { d: "2026-09-19", p: 14500, c: "UYU" },
      ],
    });
    expect(series?.changePct).toBeCloseTo(-6.45, 2);
    expect(series?.vertical).toBe("alquiler");
    expect(series?.id).toBe("infocasas:1");
    expect(series?.title).toBeNull();
    expect(series?.source).toBe("marketpricelogs");
  });

  it("la vertical 'autos' del log es la misma vertical de autos", () => {
    const series = seriesFromMarketLog({
      key: "autos:mercadolibre:MLU2",
      vertical: "autos",
      advertId: "mercadolibre:MLU2",
      firstSeen: "2026-09-17",
      lastSeen: "2026-09-22",
      points: [{ d: "2026-09-17", p: 9000, c: "USD" }],
    });
    expect(series?.vertical).toBe("autos");
  });
});

describe("summarize", () => {
  it("la última baja gana a una suba anterior", () => {
    const summary = summarize([
      { d: "2026-09-01", p: 100 },
      { d: "2026-09-05", p: 120 },
      { d: "2026-09-09", p: 110 },
    ]);
    expect(summary.lastChange).toEqual({ from: 120, to: 110, at: "2026-09-09" });
    expect(summary.changePct).toBeCloseTo(10, 5);
  });

  it("puntos repetidos sin cambio no son un cambio", () => {
    const summary = summarize([
      { d: "2026-09-01", p: 100 },
      { d: "2026-09-02", p: 100 },
    ]);
    expect(summary.lastChange).toBeNull();
    expect(summary.changePct).toBe(0);
  });
});
