import moment from "moment-timezone";
import { describe, expect, it } from "vitest";
import {
  buildDolarAhoraHistoryRows,
  dolarAhoraHistoryKey,
  missingDolarAhoraHistoryRows,
  parseDolarAhoraChartData,
} from "../classes/dolarahora_backfill";

const chart = (data: unknown): string => `
  <div id="chart"></div>
  <script>
    const data = ${JSON.stringify(data)};
    const colors = {};
  </script>
`;

describe("DolarAhora history charts", () => {
  it("extracts the server-injected chart data", () => {
    expect(
      parseDolarAhoraChartData(
        chart({
          scotia: [{ time: "25-07-2026", value: 39.07 }],
          oca: [{ time: "25-07-2026", value: null }],
          ignored: [{ time: "25-07-2026", value: 1 }],
        })
      )
    ).toEqual({
      scotia: [{ time: "25-07-2026", value: 39.07 }],
      oca: [{ time: "25-07-2026", value: null }],
    });
  });

  it("rejects an HTML response without chart data", () => {
    expect(() => parseDolarAhoraChartData("<html></html>")).toThrow(
      "chart payload was not found"
    );
  });

  it("pairs buy and sell by date using the canonical origin and rate type", () => {
    const rows = buildDolarAhoraHistoryRows(
      chart({
        scotia: [
          { time: "24-07-2026", value: 39.07 },
          { time: "25-07-2026", value: 39.1 },
        ],
      }),
      chart({
        scotia: [
          { time: "25-07-2026", value: 41.3 },
          { time: "24-07-2026", value: 41.27 },
        ],
      }),
      ["scotia"]
    );

    expect(
      rows.map((row) => ({
        institution: row.institution,
        origin: row.origin,
        date: moment.tz(row.date, "America/Montevideo").format("YYYY-MM-DD"),
        code: row.code,
        type: row.type,
        name: row.name,
        buy: row.buy,
        sell: row.sell,
      }))
    ).toEqual([
      {
        institution: "scotia",
        origin: "scotiabank",
        date: "2026-07-24",
        code: "USD",
        type: "TRANSFERENCIA",
        name: "Dólar online",
        buy: 39.07,
        sell: 41.27,
      },
      {
        institution: "scotia",
        origin: "scotiabank",
        date: "2026-07-25",
        code: "USD",
        type: "TRANSFERENCIA",
        name: "Dólar online",
        buy: 39.1,
        sell: 41.3,
      },
    ]);
  });

  it("skips null, invalid, and inverted pairs", () => {
    const rows = buildDolarAhoraHistoryRows(
      chart({
        oca: [
          { time: "24-07-2026", value: null },
          { time: "bad-date", value: 39 },
          { time: "26-07-2026", value: 42 },
        ],
      }),
      chart({
        oca: [
          { time: "24-07-2026", value: 41 },
          { time: "bad-date", value: 41 },
          { time: "26-07-2026", value: 40 },
        ],
      }),
      ["oca"]
    );

    expect(rows).toEqual([]);
  });

  it("returns only identities that are absent from Mongo", () => {
    const rows = buildDolarAhoraHistoryRows(
      chart({
        scotia: [
          { time: "24-07-2026", value: 39.07 },
          { time: "25-07-2026", value: 39.1 },
        ],
      }),
      chart({
        scotia: [
          { time: "24-07-2026", value: 41.27 },
          { time: "25-07-2026", value: 41.3 },
        ],
      }),
      ["scotia"]
    );
    const existing = new Set([dolarAhoraHistoryKey(rows[0])]);

    expect(missingDolarAhoraHistoryRows(rows, existing)).toEqual([rows[1]]);
  });
});
