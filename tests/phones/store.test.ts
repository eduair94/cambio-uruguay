import { describe, expect, it } from "vitest";
import { withPhoneHistory } from "../../classes/phones/store";
import type { PreviousPhone, StoredPhoneHistoryPoint } from "../../classes/phones/store";
import type { PhoneModel } from "../../classes/phones/catalog";

const KEY = "apple-iphone-17-256gb";

const model = (over: Partial<PhoneModel> = {}): PhoneModel => ({
  key: KEY,
  slug: KEY,
  brand: "apple",
  brandLabel: "Apple",
  family: "iphone-17",
  familyLabel: "iPhone 17",
  storageGb: 256,
  name: "Apple iPhone 17 256 GB",
  image: null,
  bands: {},
  offers: [],
  newSellers: 0,
  esimOnlySeen: false,
  suspectDropped: 0,
  ambiguousDropped: 0,
  ambiguousConditions: [],
  observedAt: "2026-09-17T00:00:00.000Z",
  ...over,
});

const newBand = { min: 40000, p25: 41000, median: 42000, p75: 43000, n: 5, sellers: 3 };

describe("withPhoneHistory", () => {
  it("primera vez que se ve una clave: firstSeen y lastSeen son hoy, un solo punto", () => {
    const result = withPhoneHistory([model({ bands: { new: newBand }, newSellers: 3 })], new Map(), "2026-09-17");
    expect(result[0]!.firstSeen).toBe("2026-09-17");
    expect(result[0]!.lastSeen).toBe("2026-09-17");
    expect(result[0]!.history).toEqual([{ date: "2026-09-17", newMin: 40000, newMedian: 42000, sellers: 3 }]);
  });

  it("hereda firstSeen de una corrida anterior y agrega el punto de hoy al final", () => {
    const previous = new Map<string, PreviousPhone>([
      [KEY, { firstSeen: "2026-08-01", history: [{ date: "2026-09-16", newMin: 39000, newMedian: 41000, sellers: 2 }] }],
    ]);
    const result = withPhoneHistory([model({ bands: { new: newBand }, newSellers: 3 })], previous, "2026-09-17");
    expect(result[0]!.firstSeen).toBe("2026-08-01");
    expect(result[0]!.history).toEqual([
      { date: "2026-09-16", newMin: 39000, newMedian: 41000, sellers: 2 },
      { date: "2026-09-17", newMin: 40000, newMedian: 42000, sellers: 3 },
    ]);
  });

  it("un resync el mismo día reemplaza el punto de hoy, no lo duplica", () => {
    const previous = new Map<string, PreviousPhone>([
      [KEY, { firstSeen: "2026-08-01", history: [{ date: "2026-09-17", newMin: 39000, newMedian: 41000, sellers: 2 }] }],
    ]);
    const result = withPhoneHistory([model({ bands: { new: newBand }, newSellers: 3 })], previous, "2026-09-17");
    expect(result[0]!.history).toEqual([{ date: "2026-09-17", newMin: 40000, newMedian: 42000, sellers: 3 }]);
  });

  it("recorta a 365 puntos, conservando los más recientes", () => {
    const longHistory: StoredPhoneHistoryPoint[] = Array.from({ length: 365 }, (_, i) => ({
      date: `d${i}`,
      newMin: i,
      newMedian: i,
      sellers: 1,
    }));
    const previous = new Map<string, PreviousPhone>([[KEY, { firstSeen: "2025-01-01", history: longHistory }]]);
    const result = withPhoneHistory([model({ newSellers: 4 })], previous, "hoy");
    expect(result[0]!.history).toHaveLength(365);
    expect(result[0]!.history[result[0]!.history.length - 1]).toEqual({ date: "hoy", newMin: null, newMedian: null, sellers: 4 });
    // The oldest point (d0) was dropped to make room; d1 is now the oldest survivor.
    expect(result[0]!.history[0]).toEqual(longHistory[1]);
  });

  it("sin banda new (ambigua o sin ofertas), el punto de hoy es null/null pero sellers se registra igual", () => {
    const result = withPhoneHistory([model({ newSellers: 0, ambiguousConditions: ["new"] })], new Map(), "2026-09-17");
    expect(result[0]!.history).toEqual([{ date: "2026-09-17", newMin: null, newMedian: null, sellers: 0 }]);
  });

  it("no muta el mapa `previous` recibido", () => {
    const previous = new Map<string, PreviousPhone>([
      [KEY, { firstSeen: "2026-08-01", history: [{ date: "2026-09-16", newMin: 1, newMedian: 1, sellers: 1 }] }],
    ]);
    const before = JSON.stringify([...previous.entries()]);
    withPhoneHistory([model({ bands: { new: newBand } })], previous, "2026-09-17");
    expect(JSON.stringify([...previous.entries()])).toBe(before);
  });
});
