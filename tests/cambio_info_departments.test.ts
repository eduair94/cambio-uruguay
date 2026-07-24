import { describe, expect, it } from "vitest";
import { mergeOriginDepartments } from "../classes/cambioInfo";

describe("mergeOriginDepartments", () => {
  it("unions BCU details with live branch departments", () => {
    expect(
      mergeOriginDepartments(
        ["MONTEVIDEO", "CANELONES"],
        ["MALDONADO", "MONTEVIDEO"]
      )
    ).toEqual(["CANELONES", "MALDONADO", "MONTEVIDEO"]);
  });

  it("normalizes case and ignores malformed values", () => {
    expect(
      mergeOriginDepartments(
        [],
        [" montevideo ", "Paysandú", null, 123]
      )
    ).toEqual(["MONTEVIDEO", "PAYSANDÚ"]);
  });
});
