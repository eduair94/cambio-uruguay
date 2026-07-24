import { describe, expect, it } from "vitest";
import {
  locationSlug,
  reconcileLocationIds,
} from "../classes/location_sync";

describe("location reconciliation", () => {
  it("closes only managed active locations missing from the official source", () => {
    const result = reconcileLocationIds(
      [
        { id: "1137-1", status: 1 },
        { id: "1137-2", status: 1 },
        { id: "manual-santander", status: 1 },
      ],
      ["1137-1"],
      "bcu",
      (id) => id.startsWith("1137-")
    );

    expect(result.idsToClose).toEqual(["1137-2"]);
    expect(result.currentStatusById.get("1137-1")).toBe(1);
  });

  it("preserves manual closures and reopens source-managed closures", () => {
    const result = reconcileLocationIds(
      [
        { id: "oca-centro", status: 0 },
        {
          id: "oca-cordon",
          status: 0,
          closedSource: "oca-official",
        },
      ],
      ["oca-centro", "oca-cordon"],
      "oca-official",
      (id) => id.startsWith("oca-")
    );

    expect(result.currentStatusById.get("oca-centro")).toBe(0);
    expect(result.currentStatusById.get("oca-cordon")).toBe(1);
  });

  it("builds stable accent-free ids", () => {
    expect(locationSlug("Nueva Sucursal San José")).toBe(
      "nueva-sucursal-san-jose"
    );
  });
});
