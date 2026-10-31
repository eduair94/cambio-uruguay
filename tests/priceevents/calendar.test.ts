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
        start: "2026-11-02",
        end: "2026-11-04",
        confirmed: true,
        source:
          "https://www.cedu.org.uy/camara-de-la-economia-digital-del-uruguay-invita-a-empresas-a-sumarse-al-ciberlunes/",
        note: "Lo organiza la Cámara de la Economía Digital del Uruguay (CEDU), que publicó la fecha el 16 de setiembre de 2026.",
      },
      {
        id: "black-friday-2026",
        label: "Black Friday 2026",
        start: "2026-11-27",
        end: "2026-11-30",
        confirmed: true,
        source: "https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/",
        note: "Es el viernes siguiente al Día de Acción de Gracias de EE.UU. (jueves 26 de noviembre). Lo seguimos hasta el lunes 30, el Cyber Monday de EE.UU.",
      },
    ]);
  });

  it("every confirmed edition carries the source its date was read from", () => {
    for (const event of PRICE_EVENTS.filter((e) => e.confirmed)) {
      expect(event.source, event.id).toMatch(/^https:\/\//);
      expect(event.start, event.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(event.end, event.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(event.start! <= event.end!, event.id).toBe(true);
    }
  });

  // The guessed window (UNCONFIRMED_WINDOW_START/END in calendar.ts) was written for ONE edition,
  // CyberLunes November 2026, which CEDU dated on 2026-09-16. Any other undated edition would inherit
  // a November-2026 window that has nothing to do with it — so this fails on purpose the day someone
  // adds one, and the fix is to move that window to the new edition's guess in the same commit.
  it("has no undated edition, so nobody silently inherits the November 2026 guessed window", () => {
    expect(PRICE_EVENTS.filter((event) => !event.confirmed).map((event) => event.id)).toEqual([]);
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

  // CEDU dated November 2026 on 2026-09-16 (Monday 2 to Wednesday 4). The hourly --event-only job
  // used to wake up for the whole guessed window (Nov 1–8); now it runs exactly the three real days,
  // and the days of the old guess outside them are quiet again.
  it("is active on the confirmed CyberLunes 2026-11 boundaries, inclusive, and not on the old guess", () => {
    expect(activeEvent("2026-11-01")).toBeNull();
    for (const day of ["2026-11-02", "2026-11-03", "2026-11-04"]) {
      const result = activeEvent(day);
      expect(result?.id).toBe("ciberlunes-2026-11");
      expect(result?.confirmed).toBe(true);
    }
    expect(activeEvent("2026-11-05")).toBeNull();
    expect(activeEvent("2026-11-08")).toBeNull();
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
    // picking a day inside BOTH. The real calendar has no undated edition any more (see the
    // "has no undated edition" test above), so this rule is only reachable with synthetic data.
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
