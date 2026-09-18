import { describe, expect, it } from "vitest";
import { marketThinRun } from "../../classes/marketseries/refresh";

describe("marketThinRun", () => {
  it("the first run and small markets always write", () => {
    expect(marketThinRun(10, null)).toBeNull();
    expect(marketThinRun(10, undefined)).toBeNull();
    expect(marketThinRun(10, 40)).toBeNull();
  });
  it("under 60 % of the previous run keeps yesterday", () => {
    expect(marketThinRun(59, 100)).toMatch(/59 observaciones contra 100/);
    expect(marketThinRun(60, 100)).toBeNull();
  });
});
