import { describe, expect, it } from "vitest";
import { leaseOwner } from "../classes/leaseClaim";

describe("leaseOwner", () => {
  it("lee el documento que devuelve el driver 6+ (mongoose 8/9)", () => {
    expect(leaseOwner({ _id: "refresh-lock", owner: "abc", expiresAt: new Date() })).toBe("abc");
  });

  it("lee la forma vieja { value, ok } (driver 4, o includeResultMetadata)", () => {
    expect(leaseOwner({ value: { _id: "refresh-lock", owner: "abc" }, ok: 1 })).toBe("abc");
  });

  it("sin documento no hay dueño", () => {
    expect(leaseOwner(null)).toBeUndefined();
    expect(leaseOwner({ value: null, ok: 1 })).toBeUndefined();
    expect(leaseOwner({})).toBeUndefined();
  });
});
