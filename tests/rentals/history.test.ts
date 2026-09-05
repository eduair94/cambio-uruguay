import { describe, expect, it } from "vitest";
import { rentalHistoryFromRows, type RentalHistoryRow } from "../../classes/rentals/store";

const row = (key: string, firstSeen: string | null, lastSeen: string | null): RentalHistoryRow => ({
  key,
  firstSeen,
  offers: [{ listingId: "infocasas:1", firstSeen: "2026-07-03", lastSeen }],
});

describe("stored rental identity history", () => {
  it("attributes the old URL only to its unique canonical title owner", () => {
    const history = rentalHistoryFromRows([{ key: "unit-601", title: " Apartamento 601 ", offers: [
      { listingId: "infocasas:1", title: "Apartamento 801" },
      { listingId: "infocasas:9", title: "apartamento   601" },
    ] }]);
    expect(history.propertyCanonicalOffer.get("unit-601")).toBe("infocasas:9");
  });

  it("reserves every ambiguous or missing canonical presentation", () => {
    const history = rentalHistoryFromRows([
      { key: "ambiguous", title: "Apartamento", offers: [{ listingId: "infocasas:1", title: "Apartamento" }, { listingId: "infocasas:2", title: "Apartamento" }] },
      { key: "missing", title: "Apartamento 601", offers: [{ listingId: "infocasas:3", title: "Apartamento 801" }] },
      { key: "empty" },
    ]);
    expect([...history.propertyCanonicalOffer.entries()]).toEqual([["ambiguous", null], ["missing", null], ["empty", null]]);
  });

  it("does not transfer canonical ownership from a stale duplicate row", () => {
    const stale = { ...row("stale", "2026-07-01", "2026-08-01"), title: "Apartamento 601" };
    const fresh = { ...row("fresh", "2026-07-01", "2026-09-05"), title: "Apartamento 601" };
    stale.offers![0]!.title = fresh.offers![0]!.title = "Apartamento 601";
    const history = rentalHistoryFromRows([stale, fresh]);
    expect(history.propertyCanonicalOffer.get("stale")).toBeNull();
    expect(history.propertyCanonicalOffer.get("fresh")).toBe("infocasas:1");
  });

  it("chooses the latest observed owner independently of Mongo row order", () => {
    const a = row("old-copy", "2026-06-01", "2026-08-01");
    const b = row("current-owner", "2026-07-01", "2026-09-05");
    const c = row("other-copy", "2026-05-01", "2026-08-30");
    for (const rows of [[a, b, c], [a, c, b], [b, a, c], [b, c, a], [c, a, b], [c, b, a]]) {
      expect(rentalHistoryFromRows(rows).offerToProperty.get("infocasas:1")).toBe("current-owner");
    }
  });

  it("breaks equal observation dates by property age, then key", () => {
    const rows = [row("a-newer", "2026-08-01", "2026-09-05"), row("b-old", "2026-07-01", "2026-09-05"), row("c-old", "2026-07-01", "2026-09-05")];
    expect(rentalHistoryFromRows(rows).offerToProperty.get("infocasas:1")).toBe("b-old");
    expect(rentalHistoryFromRows([...rows].reverse()).offerToProperty.get("infocasas:1")).toBe("b-old");
  });

  it("does not treat missing or invalid observations as fresh", () => {
    const rows = [row("current", "2026-08-01", "2026-09-01"), row("unknown", "2026-01-01", null), row("invalid", "2026-01-01", "2026-99-99"), row("impossible-day", "2026-01-01", "2026-02-30")];
    expect(rentalHistoryFromRows(rows).offerToProperty.get("infocasas:1")).toBe("current");
    expect(rentalHistoryFromRows([...rows].reverse()).offerToProperty.get("infocasas:1")).toBe("current");
  });

  it("does not invent an old firstSeen for an undated property", () => {
    const rows = [row("a-unknown-age", null, "2026-09-05"), row("z-known-age", "2026-08-01", "2026-09-05")];
    const history = rentalHistoryFromRows(rows);
    expect(history.offerToProperty.get("infocasas:1")).toBe("z-known-age");
    expect(history.propertyFirstSeen.has("a-unknown-age")).toBe(false);
    expect(rentalHistoryFromRows(rows.map(item => ({ ...item, firstSeen: null }))).offerToProperty.get("infocasas:1"))
      .toBe("a-unknown-age");
  });

  it("preserves the earliest documented advert date across copies", () => {
    const rows = [row("old", "2026-08-01", "2026-08-01"), row("current", "2026-09-01", "2026-09-05")];
    rows[0]!.offers![0]!.firstSeen = "2026-06-15";
    rows[1]!.offers![0]!.firstSeen = "2026-07-03";
    for (const ordered of [rows, [...rows].reverse()]) {
      const history = rentalHistoryFromRows(ordered);
      expect(history.offerToProperty.get("infocasas:1")).toBe("current");
      expect(history.offerFirstSeen.get("infocasas:1")).toBe("2026-06-15");
      expect(history.propertyFirstSeen.get("current")).toBe("2026-09-01");
    }
  });
});
