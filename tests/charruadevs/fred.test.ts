import { describe, expect, it } from "vitest";
import { parseFredCsv } from "../../classes/charruadevs/fred";

describe("fred", () => {
  it("averages the daily series by month and skips missing values", () => {
    const csv = "observation_date,IHLIDXUSTPSOFTDEVE\n2020-02-01,100\n2020-02-02,98\n2020-03-01,.\n2020-03-02,90\n";
    expect(parseFredCsv(csv)).toEqual([
      { m: "2020-02", v: 99 },
      { m: "2020-03", v: 90 },
    ]);
  });

  it("returns [] for garbage", () => {
    expect(parseFredCsv("<html>")).toEqual([]);
  });
});
