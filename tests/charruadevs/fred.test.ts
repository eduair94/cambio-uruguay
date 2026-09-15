import { describe, expect, it } from "vitest";
import { parseFredCsv, parseHiringLabCsv } from "../../classes/charruadevs/fred";

describe("hiring lab", () => {
  it("keeps only Software Development total postings and averages them by month", () => {
    const csv = [
      "date,jobcountry,indeed_job_postings_index,variable,display_name",
      "2026-09-10,US,76,total postings,Software Development",
      "2026-09-11,US,76.62,total postings,Software Development",
      "2026-09-11,US,89.79,new postings,Software Development",
      "2026-09-11,US,120,total postings,Accounting",
    ].join("\n");
    expect(parseHiringLabCsv(csv)).toEqual([{ m: "2026-09", v: 76.3 }]);
  });

  it("returns [] when the file is not the sector CSV", () => {
    expect(parseHiringLabCsv("404: Not Found")).toEqual([]);
  });
});

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
