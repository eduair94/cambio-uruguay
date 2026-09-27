import { describe, expect, it } from "vitest";
import { dayMinus, decide, montevideoDay, windowKeys } from "../../classes/apikeys/window";

const limits = { perMinute: 10, perDay: 100 };

describe("ventanas de límite", () => {
  it("el día es el de Montevideo, no el de UTC", () => {
    // 02:30 UTC del 28 = 23:30 del 27 en Montevideo (UTC-3).
    expect(montevideoDay(new Date("2026-09-28T02:30:00Z"))).toBe("2026-09-27");
    expect(montevideoDay(new Date("2026-09-28T03:00:00Z"))).toBe("2026-09-28");
  });

  it("el minuto se renueva en el minuto siguiente y el día a la medianoche de Montevideo", () => {
    const keys = windowKeys(new Date("2026-09-27T15:04:30Z"));
    expect(keys.minuteResetsAt.toISOString()).toBe("2026-09-27T15:05:00.000Z");
    expect(keys.dayResetsAt.toISOString()).toBe("2026-09-28T03:00:00.000Z");
    expect(keys.day).toBe("2026-09-27");
  });

  it("deja pasar hasta el límite inclusive y corta el siguiente", () => {
    const keys = windowKeys(new Date("2026-09-27T15:04:30Z"));
    expect(decide({ minute: 10, day: 10 }, limits, keys).allowed).toBe(true);
    const cut = decide({ minute: 11, day: 11 }, limits, keys);
    expect(cut).toMatchObject({ allowed: false, exceeded: "minute", limit: 10, remaining: 0 });
    expect(cut.resetAt).toEqual(keys.minuteResetsAt);
  });

  it("cuando corta el día, informa el día aunque el minuto también esté pasado", () => {
    const keys = windowKeys(new Date("2026-09-27T15:04:30Z"));
    const cut = decide({ minute: 50, day: 101 }, limits, keys);
    expect(cut).toMatchObject({ allowed: false, exceeded: "day", limit: 100 });
    expect(cut.resetAt).toEqual(keys.dayResetsAt);
  });

  it("las cabeceras hablan del límite más cercano", () => {
    const keys = windowKeys(new Date("2026-09-27T15:04:30Z"));
    expect(decide({ minute: 1, day: 98 }, limits, keys)).toMatchObject({ limit: 100, remaining: 2 });
    expect(decide({ minute: 9, day: 10 }, limits, keys)).toMatchObject({ limit: 10, remaining: 1 });
  });

  it("resta días en el calendario", () => {
    expect(dayMinus("2026-03-01", 1)).toBe("2026-02-28");
    expect(dayMinus("2026-09-27", 29)).toBe("2026-08-29");
  });
});
