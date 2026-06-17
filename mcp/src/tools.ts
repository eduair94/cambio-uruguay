// Pure tool handlers over the `CambioApi` seam. No network, no MCP types here —
// just data in, structured data out — so each is unit-tested with a fake API.
//
// Rate convention (from the user's perspective):
//   - "buy a currency"  → a house SELLS it to you at its `sell` price; cheaper is
//     better, so the best buy price is the LOWEST `sell`.
//   - "sell a currency" → a house BUYS it from you at its `buy` price; higher is
//     better, so the best sell price is the HIGHEST `buy`.
// Best market rates (most favorable to the user) drive conversions.

import type { CambioApi, HouseInfo, RateRow } from "./api.js";

/** Quote types that are not retail cash exchange and are excluded from market math. */
const INTERBANK_TYPES = new Set(["INTERBANCARIO", "FONDO/CABLE", "CABLE", "BILLETE", "PROMED.FONDO"]);

/** A retail quote is a real casa de cambio cash price (not BCU, not interbank). */
function isRetail(r: RateRow): boolean {
  return r.origin !== "bcu" && !INTERBANK_TYPES.has(r.type) && r.buy > 0 && r.sell > 0;
}

function houseName(local: Record<string, HouseInfo>, origin: string): string {
  return local[origin]?.name ?? origin;
}

async function retailRows(api: CambioApi, currency: string): Promise<{ rows: RateRow[]; local: Record<string, HouseInfo> }> {
  const code = currency.toUpperCase();
  const [all, local] = await Promise.all([api.getRates(), api.getLocalData()]);
  const rows = all.filter((r) => r.code === code && isRetail(r));
  if (rows.length === 0) {
    throw new Error(`No retail rates found for currency "${code}".`);
  }
  return { rows, local };
}

export interface HousePrice {
  origin: string;
  name: string;
  buy: number;
  sell: number;
  spread: number;
}

export interface RatesResult {
  currency: string;
  date: string;
  houseCount: number;
  marketAvgBuy: number;
  marketAvgSell: number;
  bestBuy: { origin: string; name: string; rate: number };
  bestSell: { origin: string; name: string; rate: number };
  lowestSpread: { origin: string; name: string; spread: number };
  houses: HousePrice[];
}

export async function getRates(api: CambioApi, args: { currency: string }): Promise<RatesResult> {
  const code = args.currency.toUpperCase();
  const { rows, local } = await retailRows(api, code);

  const houses: HousePrice[] = rows
    .map((r) => ({
      origin: r.origin,
      name: houseName(local, r.origin),
      buy: r.buy,
      sell: r.sell,
      spread: r.sell - r.buy,
    }))
    .sort((a, b) => a.sell - b.sell);

  const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const bestBuyRow = rows.reduce((a, b) => (b.buy > a.buy ? b : a));
  const bestSellRow = rows.reduce((a, b) => (b.sell < a.sell ? b : a));
  const lowestSpreadHouse = houses.reduce((a, b) => (b.spread < a.spread ? b : a));
  const date = rows.reduce((d, r) => (r.date > d ? r.date : d), rows[0].date);

  return {
    currency: code,
    date,
    houseCount: rows.length,
    marketAvgBuy: avg(rows.map((r) => r.buy)),
    marketAvgSell: avg(rows.map((r) => r.sell)),
    bestBuy: { origin: bestBuyRow.origin, name: houseName(local, bestBuyRow.origin), rate: bestBuyRow.buy },
    bestSell: { origin: bestSellRow.origin, name: houseName(local, bestSellRow.origin), rate: bestSellRow.sell },
    lowestSpread: { origin: lowestSpreadHouse.origin, name: lowestSpreadHouse.name, spread: lowestSpreadHouse.spread },
    houses,
  };
}

export interface BestHouseResult {
  currency: string;
  side: "buy" | "sell";
  origin: string;
  name: string;
  rate: number;
  spread: number;
}

export async function bestHouse(api: CambioApi, args: { currency: string; side: "buy" | "sell" }): Promise<BestHouseResult> {
  if (args.side !== "buy" && args.side !== "sell") {
    throw new Error(`Invalid side "${args.side}"; expected "buy" or "sell".`);
  }
  const code = args.currency.toUpperCase();
  const { rows, local } = await retailRows(api, code);
  // buy → user buys the currency → lowest sell. sell → user sells → highest buy.
  const pick =
    args.side === "buy"
      ? rows.reduce((a, b) => (b.sell < a.sell ? b : a))
      : rows.reduce((a, b) => (b.buy > a.buy ? b : a));
  return {
    currency: code,
    side: args.side,
    origin: pick.origin,
    name: houseName(local, pick.origin),
    rate: args.side === "buy" ? pick.sell : pick.buy,
    spread: pick.sell - pick.buy,
  };
}

export interface ConvertResult {
  amount: number;
  from: string;
  to: string;
  result: number;
  /** Effective from→to multiplier (`result / amount`). */
  rate: number;
  path: string;
}

/** Best price of one foreign unit in UYU for a given direction. */
async function bestForeignRate(api: CambioApi, code: string, side: "buy" | "sell"): Promise<number> {
  const r = await bestHouse(api, { currency: code, side });
  return r.rate;
}

export async function convert(api: CambioApi, args: { amount: number; from: string; to: string }): Promise<ConvertResult> {
  const from = args.from.toUpperCase();
  const to = args.to.toUpperCase();
  const amount = args.amount;

  let result: number;
  let path: string;
  if (from === to) {
    result = amount;
    path = from;
  } else if (to === "UYU") {
    // Selling foreign for pesos → house buys at its best `buy`.
    result = amount * (await bestForeignRate(api, from, "sell"));
    path = `${from}->UYU`;
  } else if (from === "UYU") {
    // Buying foreign with pesos → house sells at its best `sell`.
    result = amount / (await bestForeignRate(api, to, "buy"));
    path = `UYU->${to}`;
  } else {
    // foreign → UYU → foreign
    const uyu = amount * (await bestForeignRate(api, from, "sell"));
    result = uyu / (await bestForeignRate(api, to, "buy"));
    path = `${from}->UYU->${to}`;
  }

  return {
    amount,
    from,
    to,
    result,
    rate: amount === 0 ? 0 : result / amount,
    path,
  };
}

export interface HouseListItem {
  origin: string;
  name: string;
  website?: string;
  departments?: string[];
}

export async function listHouses(api: CambioApi): Promise<HouseListItem[]> {
  const local = await api.getLocalData();
  return Object.entries(local)
    .map(([origin, info]) => ({
      origin,
      name: info.name ?? origin,
      website: info.website,
      departments: info.departments,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getEvolution(
  api: CambioApi,
  args: { origin: string; currency: string; period?: number }
): Promise<unknown> {
  return api.getEvolution(args.origin, args.currency.toUpperCase(), args.period);
}
