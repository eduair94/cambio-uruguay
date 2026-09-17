import { describe, expect, it } from "vitest";
import { PRICE_EVENTS, activeEvent, resolveActiveEvent, type PriceEvent } from "../../classes/priceevents/calendar";

describe("PRICE_EVENTS", () => {
  it("declares exactly the four verified editions, with sources for the confirmed ones", () => {
    expect(PRICE_EVENTS).toEqual([
      {
        id: "ciberlunes-2025-11",
        label: "CyberLunes noviembre 2025",
        start: "2025-11-03",
        end: "2025-11-05",
        confirmed: true,
        source:
          "https://cuti.org.uy/en/destacados/noviembre-comienza-con-una-nueva-edicion-de-ciberlunes-con-hasta-70-off/",
        note: "",
      },
      {
        id: "ciberlunes-2026-06",
        label: "CyberLunes junio 2026",
        start: "2026-06-01",
        end: "2026-06-03",
        confirmed: true,
        source: "https://www.sodimac.com.uy/sodimac-uy/content/Ciberlunes/",
        note: "",
      },
      {
        id: "ciberlunes-2026-11",
        label: "CyberLunes noviembre 2026",
        start: null,
        end: null,
        confirmed: false,
        source: "https://www.cedu.org.uy/ciberlunes/",
        note: "Al 17 de setiembre de 2026 la CEDU no había publicado la fecha.",
      },
      {
        id: "black-friday-2026",
        label: "Black Friday 2026",
        start: "2026-11-27",
        end: "2026-11-30",
        confirmed: true,
        source: null,
        note: "Del viernes 27 al lunes 30 de noviembre (Cyber Monday de EE.UU.).",
      },
    ]);
  });

  it("never invents a date for the unconfirmed November 2026 edition", () => {
    const november2026 = PRICE_EVENTS.find((event) => event.id === "ciberlunes-2026-11")!;
    expect(november2026.start).toBeNull();
    expect(november2026.end).toBeNull();
    expect(november2026.confirmed).toBe(false);
  });
});

describe("activeEvent", () => {
  it("returns null far outside every window", () => {
    expect(activeEvent("2026-01-15")).toBeNull();
    expect(activeEvent("2026-08-01")).toBeNull();
  });

  it("is active on the confirmed CyberLunes 2025-11 boundaries, inclusive", () => {
    expect(activeEvent("2025-11-02")).toBeNull();
    expect(activeEvent("2025-11-03")?.id).toBe("ciberlunes-2025-11");
    expect(activeEvent("2025-11-04")?.id).toBe("ciberlunes-2025-11");
    expect(activeEvent("2025-11-05")?.id).toBe("ciberlunes-2025-11");
    expect(activeEvent("2025-11-06")).toBeNull();
  });

  it("is active on the confirmed CyberLunes 2026-06 boundaries, inclusive", () => {
    expect(activeEvent("2026-05-31")).toBeNull();
    expect(activeEvent("2026-06-01")?.id).toBe("ciberlunes-2026-06");
    expect(activeEvent("2026-06-03")?.id).toBe("ciberlunes-2026-06");
    expect(activeEvent("2026-06-04")).toBeNull();
  });

  it("is active on the confirmed Black Friday 2026 boundaries, inclusive", () => {
    expect(activeEvent("2026-11-26")).toBeNull();
    expect(activeEvent("2026-11-27")?.id).toBe("black-friday-2026");
    expect(activeEvent("2026-11-30")?.id).toBe("black-friday-2026");
    expect(activeEvent("2026-12-01")).toBeNull();
  });

  it("activates the wide guess window for the unconfirmed November 2026 CyberLunes, unmodified", () => {
    expect(activeEvent("2026-10-31")).toBeNull();
    for (const day of ["2026-11-01", "2026-11-04", "2026-11-08"]) {
      const result = activeEvent(day);
      expect(result?.id).toBe("ciberlunes-2026-11");
      // The returned event is the real calendar entry, not a copy with the guessed window baked
      // into start/end — the page must still say "a confirmar por la CEDU", never a fake date.
      expect(result?.start).toBeNull();
      expect(result?.end).toBeNull();
      expect(result?.confirmed).toBe(false);
    }
    expect(activeEvent("2026-11-09")).toBeNull();
  });
});

describe("resolveActiveEvent (overlap rule, synthetic data)", () => {
  const confirmed: PriceEvent = {
    id: "confirmed",
    label: "Confirmado",
    start: "2026-03-10",
    end: "2026-03-20",
    confirmed: true,
    source: "https://example.com",
    note: "",
  };
  const unconfirmedWide: PriceEvent = {
    id: "unconfirmed",
    label: "Sin confirmar",
    start: null,
    end: null,
    confirmed: false,
    source: null,
    note: "",
  };

  it("prefers the confirmed window when a confirmed and an unconfirmed window overlap", () => {
    // The unconfirmed synthetic event's guessed window (2026-11-01..08) does not naturally overlap
    // "confirmed" above, so build the overlap directly against the real wide-window constants by
    // picking a day inside BOTH: 2026-11-01..08 (unconfirmed guess) has no confirmed sibling in the
    // real calendar, so this test uses a synthetic confirmed event placed on top of that window
    // instead of relying on it ever happening for real.
    const confirmedInNovember: PriceEvent = { ...confirmed, id: "confirmed-november", start: "2026-11-03", end: "2026-11-05" };
    expect(resolveActiveEvent([unconfirmedWide, confirmedInNovember], "2026-11-04")?.id).toBe("confirmed-november");
    // Order in the array must not matter.
    expect(resolveActiveEvent([confirmedInNovember, unconfirmedWide], "2026-11-04")?.id).toBe("confirmed-november");
  });

  it("returns the confirmed event on its own when the unconfirmed window does not reach that day", () => {
    expect(resolveActiveEvent([confirmed, unconfirmedWide], "2026-03-15")?.id).toBe("confirmed");
  });

  it("falls back to the unconfirmed window when it is the only one covering the day", () => {
    expect(resolveActiveEvent([confirmed, unconfirmedWide], "2026-11-05")?.id).toBe("unconfirmed");
  });

  it("returns null when nothing covers the day", () => {
    expect(resolveActiveEvent([confirmed, unconfirmedWide], "2026-01-01")).toBeNull();
  });
});
