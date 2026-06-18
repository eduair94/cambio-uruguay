// Shared shapes for the daily report + alerts, produced by report/data.ts and
// consumed by the formatters and publishers.
import type { NewsItem } from "cambio-uruguay-mcp/news";

export interface CurrencyDelta {
  code: string;
  marketAvgBuy: number;
  marketAvgSell: number;
  /** % change of the best sell price vs the previous business day. */
  changePct: number;
  bestBuy: { name: string; rate: number };
  bestSell: { name: string; rate: number };
  lowestSpread: { name: string; spread: number };
}

export interface DailyReportData {
  date: string;
  currencies: CurrencyDelta[];
  news: NewsItem[];
}

export interface AlertData {
  code: string;
  current: number;
  baseline: number;
  changePct: number;
  direction: "up" | "down";
}
