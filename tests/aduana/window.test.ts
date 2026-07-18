import { describe, expect, it } from "vitest";
import { inDecreeWindow } from "../../classes/aduana/window";

describe("inDecreeWindow", () => {
  it("is open across September–October 2026", () => {
    expect(inDecreeWindow(new Date("2026-09-01T12:00:00Z"))).toBe(true);
    expect(inDecreeWindow(new Date("2026-09-15T12:00:00Z"))).toBe(true);
    expect(inDecreeWindow(new Date("2026-10-31T12:00:00Z"))).toBe(true);
    expect(inDecreeWindow(new Date("2026-11-01T12:00:00Z"))).toBe(true);
  });

  it("is closed just outside the window", () => {
    expect(inDecreeWindow(new Date("2026-08-31T12:00:00Z"))).toBe(false);
    expect(inDecreeWindow(new Date("2026-11-02T12:00:00Z"))).toBe(false);
    expect(inDecreeWindow(new Date("2026-07-18T12:00:00Z"))).toBe(false); // today, before the window
  });
});
