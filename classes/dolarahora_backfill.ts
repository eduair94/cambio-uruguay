import axios from "axios";
import moment from "moment-timezone";
import {
  DOLAR_AHORA_INSTITUTIONS,
  DolarAhoraInstitution,
  getDolarAhoraRateIdentity,
} from "./cambios/dolarahora";

const DOLAR_AHORA_CHART_BASE = "https://dolarahora.uy/chart/basic";

export type DolarAhoraChartPoint = {
  time: string;
  value: number | null;
};

export type DolarAhoraHistoryRow = {
  institution: DolarAhoraInstitution;
  origin: string;
  date: Date;
  code: string;
  type: string;
  name: string;
  buy: number;
  sell: number;
};

export type DolarAhoraChartData = Partial<
  Record<DolarAhoraInstitution, DolarAhoraChartPoint[]>
>;

const chartDataPattern = /\bconst\s+data\s*=\s*(\{[^\r\n]+\});/;

export function parseDolarAhoraChartData(html: string): DolarAhoraChartData {
  const match = html.match(chartDataPattern);
  if (!match) {
    throw new Error("DolarAhora chart payload was not found");
  }

  const parsed = JSON.parse(match[1]) as Record<
    string,
    Array<{ time?: unknown; value?: unknown }>
  >;
  const result: DolarAhoraChartData = {};

  for (const institution of DOLAR_AHORA_INSTITUTIONS) {
    const points = parsed[institution];
    if (!Array.isArray(points)) continue;
    result[institution] = points
      .filter((point) => typeof point?.time === "string")
      .map((point) => ({
        time: point.time as string,
        value:
          typeof point.value === "number" && Number.isFinite(point.value)
            ? point.value
            : null,
      }));
  }

  return result;
}

export function buildDolarAhoraHistoryRows(
  buyHtml: string,
  sellHtml: string,
  institutions: readonly DolarAhoraInstitution[] = DOLAR_AHORA_INSTITUTIONS
): DolarAhoraHistoryRow[] {
  const buys = parseDolarAhoraChartData(buyHtml);
  const sells = parseDolarAhoraChartData(sellHtml);
  const rows: DolarAhoraHistoryRow[] = [];

  for (const institution of institutions) {
    const identity = getDolarAhoraRateIdentity(institution);
    const sellsByDate = new Map(
      (sells[institution] || []).map((point) => [point.time, point.value])
    );

    for (const point of buys[institution] || []) {
      const buy = point.value;
      const sell = sellsByDate.get(point.time);
      const date = moment.tz(
        point.time,
        "DD-MM-YYYY",
        true,
        "America/Montevideo"
      );

      if (
        !date.isValid() ||
        typeof buy !== "number" ||
        typeof sell !== "number" ||
        !Number.isFinite(buy) ||
        !Number.isFinite(sell) ||
        buy <= 0 ||
        sell <= 0 ||
        buy >= sell
      ) {
        continue;
      }

      rows.push({
        institution,
        ...identity,
        date: date.startOf("day").toDate(),
        buy,
        sell,
      });
    }
  }

  return rows;
}

export function dolarAhoraHistoryKey(
  row: Pick<DolarAhoraHistoryRow, "origin" | "date" | "code" | "type">
): string {
  return [
    row.origin,
    moment.tz(row.date, "America/Montevideo").format("YYYY-MM-DD"),
    row.code,
    row.type,
  ].join("|");
}

export function missingDolarAhoraHistoryRows(
  rows: readonly DolarAhoraHistoryRow[],
  existingKeys: ReadonlySet<string>
): DolarAhoraHistoryRow[] {
  return rows.filter((row) => !existingKeys.has(dolarAhoraHistoryKey(row)));
}

export async function fetchDolarAhoraChart(
  operation: "buy_internet" | "sell_internet",
  period = "3m",
  institutions: readonly DolarAhoraInstitution[] = DOLAR_AHORA_INSTITUTIONS
): Promise<string> {
  const response = await axios.get(
    `${DOLAR_AHORA_CHART_BASE}/${operation}/${period}`,
    {
      params: {
        chart_id: "usd_chart",
        institutions: institutions.join(","),
        chart_type: "currency",
        function: "close",
        force_same_start: "False",
        _cb: Date.now(),
      },
      headers: {
        Accept: "*/*",
        "Accept-Language": "es-UY,es;q=0.9",
        Referer: "https://dolarahora.uy/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
        "X-Requested-With": "XMLHttpRequest",
      },
      timeout: 20_000,
    }
  );

  if (typeof response.data !== "string") {
    throw new Error(`DolarAhora ${operation} chart returned a non-HTML payload`);
  }
  return response.data;
}
