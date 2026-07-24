import moment from "moment-timezone";
import { MongooseServer, Schema } from "../database";

const KEY = "santander_preferential_rates_data";
const OPEN_ENDED_RATE_TO = 1_000_000_000_000;
const schema = new Schema(
  { key: String, doc: Schema.Types.Mixed },
  { strict: false }
);
const server = () =>
  MongooseServer.getInstance("santander_preferential_rates_data", schema);

export interface SantanderPreferentialSourceRate {
  arbBestBuy?: number | string;
  arbBestSell?: number | string;
  buyRate?: number | string;
  currency?: string;
  rateFrom?: number | string;
  rateTo?: number | string;
  sellRate?: number | string;
}

export interface SantanderPreferentialRate {
  currency: string;
  buy: number;
  sell: number;
  minAmount: number;
  /** Exclusive upper boundary. `null` means there is no upper limit. */
  maxAmount: number | null;
  arbitrageBuy?: number;
  arbitrageSell?: number;
}

export interface SantanderPreferentialSnapshot {
  date: string;
  scrapedAt: string;
  rates: SantanderPreferentialRate[];
}

export interface SantanderPreferentialRatesDoc {
  current: SantanderPreferentialSnapshot | null;
  history: SantanderPreferentialSnapshot[];
  updatedAt: string;
}

export interface SantanderPreferentialRatesResponse {
  bank: "santander";
  source: string;
  currency: string | null;
  amount: number | null;
  currencies: string[];
  boundaryRule: string;
  current: (SantanderPreferentialSnapshot & {
    selectedRate: SantanderPreferentialRate | null;
  }) | null;
  history: Array<
    SantanderPreferentialSnapshot & {
      selectedRate: SantanderPreferentialRate | null;
    }
  >;
  updatedAt: string;
}

const parseFiniteNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return null;
    value = text.replace(",", ".");
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function emptySantanderPreferentialRatesDoc(): SantanderPreferentialRatesDoc {
  return { current: null, history: [], updatedAt: "" };
}

export function normalizeSantanderPreferentialRates(
  sourceRates: SantanderPreferentialSourceRate[]
): SantanderPreferentialRate[] {
  const normalized = new Map<string, SantanderPreferentialRate>();

  for (const source of sourceRates) {
    const currency = String(source.currency ?? "")
      .trim()
      .toUpperCase();
    const buy = parseFiniteNumber(source.buyRate);
    const sell = parseFiniteNumber(source.sellRate);
    const minAmount = parseFiniteNumber(source.rateFrom);
    const rawMaxAmount = parseFiniteNumber(source.rateTo);
    const arbitrageBuy = parseFiniteNumber(source.arbBestBuy);
    const arbitrageSell = parseFiniteNumber(source.arbBestSell);

    if (
      !/^[A-Z]{3}$/.test(currency) ||
      buy === null ||
      sell === null ||
      minAmount === null ||
      rawMaxAmount === null ||
      buy <= 0 ||
      sell <= 0 ||
      buy > sell ||
      minAmount < 0 ||
      rawMaxAmount <= minAmount
    ) {
      continue;
    }

    const rate: SantanderPreferentialRate = {
      currency,
      buy,
      sell,
      minAmount,
      maxAmount:
        rawMaxAmount >= OPEN_ENDED_RATE_TO ? null : rawMaxAmount,
    };
    if (arbitrageBuy !== null && arbitrageBuy > 0) {
      rate.arbitrageBuy = arbitrageBuy;
    }
    if (arbitrageSell !== null && arbitrageSell > 0) {
      rate.arbitrageSell = arbitrageSell;
    }

    normalized.set(`${currency}:${minAmount}`, rate);
  }

  const rates = [...normalized.values()].sort(
    (left, right) =>
      left.currency.localeCompare(right.currency) ||
      left.minAmount - right.minAmount
  );
  if (rates.length === 0) {
    throw new Error("Santander returned no valid preferential rates");
  }
  return rates;
}

export function selectSantanderPreferentialRate(
  rates: SantanderPreferentialRate[],
  currency: string,
  amount: number
): SantanderPreferentialRate | null {
  const normalizedCurrency = currency.trim().toUpperCase();
  return (
    rates.find(
      (rate) =>
        rate.currency === normalizedCurrency &&
        amount >= rate.minAmount &&
        (rate.maxAmount === null || amount < rate.maxAmount)
    ) ?? null
  );
}

export function mergeSantanderPreferentialSnapshot(
  doc: SantanderPreferentialRatesDoc,
  rates: SantanderPreferentialRate[],
  now: Date = new Date()
): SantanderPreferentialRatesDoc {
  const scrapedAt = now.toISOString();
  const date = moment(now).tz("America/Montevideo").format("YYYY-MM-DD");
  const snapshot: SantanderPreferentialSnapshot = {
    date,
    scrapedAt,
    rates,
  };

  return {
    current: snapshot,
    history: [
      ...doc.history.filter((entry) => entry.date !== date),
      snapshot,
    ].sort((left, right) => left.date.localeCompare(right.date)),
    updatedAt: scrapedAt,
  };
}

export async function loadSantanderPreferentialRates(): Promise<SantanderPreferentialRatesDoc> {
  const rows = await server().aggregate([
    { $match: { key: KEY } },
    { $limit: 1 },
  ]);
  const doc = rows[0]?.doc as
    | Partial<SantanderPreferentialRatesDoc>
    | undefined;
  return {
    current: doc?.current ?? null,
    history: Array.isArray(doc?.history) ? doc.history : [],
    updatedAt: doc?.updatedAt ?? "",
  };
}

export async function saveSantanderPreferentialRates(
  doc: SantanderPreferentialRatesDoc
): Promise<void> {
  await server().updateOne({ key: KEY }, { key: KEY, doc });
}

export async function applySantanderPreferentialRates(
  rates: SantanderPreferentialRate[],
  now: Date = new Date()
): Promise<SantanderPreferentialRatesDoc> {
  const current = await loadSantanderPreferentialRates();
  const next = mergeSantanderPreferentialSnapshot(current, rates, now);
  await saveSantanderPreferentialRates(next);
  return next;
}

export function buildSantanderPreferentialRatesResponse(
  doc: SantanderPreferentialRatesDoc,
  currency?: string,
  amount?: number
): SantanderPreferentialRatesResponse {
  const normalizedCurrency = currency?.trim().toUpperCase();
  const currencies = [
    ...new Set(
      (doc.current ? [doc.current, ...doc.history] : doc.history).flatMap(
        (snapshot) => snapshot.rates.map((rate) => rate.currency)
      )
    ),
  ].sort();

  const mapSnapshot = (
    snapshot: SantanderPreferentialSnapshot
  ): SantanderPreferentialRatesResponse["history"][number] => {
    const rates = normalizedCurrency
      ? snapshot.rates.filter(
          (rate) => rate.currency === normalizedCurrency
        )
      : snapshot.rates;
    const selectedRate =
      normalizedCurrency && amount !== undefined
        ? selectSantanderPreferentialRate(rates, normalizedCurrency, amount)
        : null;
    return { ...snapshot, rates, selectedRate };
  };

  return {
    bank: "santander",
    source: "https://supernet.santander.com.uy/Supernet_UI/",
    currency: normalizedCurrency ?? null,
    amount: amount ?? null,
    currencies,
    boundaryRule:
      "minAmount is inclusive; maxAmount is exclusive; null means no upper limit",
    current: doc.current ? mapSnapshot(doc.current) : null,
    history: doc.history.map(mapSnapshot),
    updatedAt: doc.updatedAt,
  };
}
