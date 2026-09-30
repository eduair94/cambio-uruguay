import { describe, expect, it } from "vitest";
import { accessFor } from "../../classes/monitor/access";

const start = new Date("2026-09-01T12:00:00Z");
const day = 86_400_000;

describe("acceso al monitor", () => {
  it("prueba de 14 días con los días que quedan", () => {
    expect(accessFor(start, false, new Date(start.getTime() + 3 * day))).toEqual({
      status: "trial",
      daysLeft: 11,
      endsAt: new Date(start.getTime() + 14 * day),
    });
  });

  it("vencida a los 14 días justos", () => {
    expect(accessFor(start, false, new Date(start.getTime() + 14 * day))).toEqual({
      status: "expired",
      endedAt: new Date(start.getTime() + 14 * day),
    });
  });

  it("con plan Empresa funciona siempre", () => {
    expect(accessFor(start, true, new Date(start.getTime() + 90 * day))).toEqual({ status: "business" });
  });
});
