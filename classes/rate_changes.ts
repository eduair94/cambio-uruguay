import { Schema } from "mongoose";
import moment from "moment-timezone";
import dotenv from "dotenv";
import fs from "fs";
import { CambioObj } from "../interfaces/Cambio";
import { MongooseServer } from "./database";
import { isPublicRate } from "./rate_source";

export interface RateChange {
  origin: string;
  houseName: string;
  code: string;
  type: string;
  name: string;
  previousBuy: number;
  previousSell: number;
  buy: number;
  sell: number;
  buyChanged: boolean;
  sellChanged: boolean;
  observedAt: Date;
  telegramReportedAt?: Date | null;
}

export interface RateChangeQuery {
  origin?: string;
  code?: string;
  type?: string;
  since?: Date;
  limit?: number;
}

export interface MarketCurrencyChange {
  code: string;
  matchedQuotes: number;
  currentAvgBuy: number;
  currentAvgSell: number;
  baselineAvgBuy: number;
  baselineAvgSell: number;
  buyChangePct: number;
  sellChangePct: number;
}

export interface MarketChangeSummary {
  asOf: string;
  baselineAt: string;
  hours: number;
  currencies: MarketCurrencyChange[];
}

type RateState = Pick<CambioObj, "code" | "type" | "name" | "buy" | "sell"> & {
  origin?: string;
};

type DailyRateState = RateState & {
  origin: string;
  date: Date | string;
};

const rateChangeSchema = new Schema(
  {
    origin: { type: String, required: true },
    houseName: { type: String, required: true },
    code: { type: String, required: true },
    type: { type: String, default: "" },
    name: { type: String, required: true },
    previousBuy: { type: Number, required: true },
    previousSell: { type: Number, required: true },
    buy: { type: Number, required: true },
    sell: { type: Number, required: true },
    buyChanged: { type: Boolean, required: true },
    sellChanged: { type: Boolean, required: true },
    observedAt: { type: Date, required: true },
    telegramReportedAt: { type: Date, default: null },
  },
  { strict: true }
);

rateChangeSchema.index(
  { origin: 1, code: 1, type: 1, observedAt: -1 },
  { unique: true }
);
rateChangeSchema.index({ observedAt: -1 });
rateChangeSchema.index({ telegramReportedAt: 1, observedAt: 1 });

function changeDb(): MongooseServer {
  return MongooseServer.getInstance("cambio_changes", rateChangeSchema);
}

export function rateChangesDb(): MongooseServer {
  return changeDb();
}

function rateKey(row: Pick<RateState, "code" | "type">): string {
  return `${row.code.toUpperCase()}|${row.type || ""}`;
}

function fullRateKey(row: RateState): string {
  return `${row.origin}|${rateKey(row)}`;
}

function round(value: number, decimals = 6): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function detectRateChanges(
  origin: string,
  houseName: string,
  current: CambioObj[],
  previous: RateState[],
  observedAt: Date
): RateChange[] {
  const previousByKey = new Map(previous.map((row) => [rateKey(row), row]));
  const changes: RateChange[] = [];

  for (const row of current) {
    const prior = previousByKey.get(rateKey(row));
    if (!prior) continue;

    const buyChanged = row.buy !== prior.buy;
    const sellChanged = row.sell !== prior.sell;
    if (!buyChanged && !sellChanged) continue;

    changes.push({
      origin,
      houseName,
      code: row.code.toUpperCase(),
      type: row.type || "",
      name: row.name,
      previousBuy: prior.buy,
      previousSell: prior.sell,
      buy: row.buy,
      sell: row.sell,
      buyChanged,
      sellChanged,
      observedAt,
      telegramReportedAt: null,
    });
  }

  return changes;
}

export async function loadLatestRateStates(
  origin: string,
  currentRatesDb: MongooseServer
): Promise<RateState[]> {
  const currentModel = currentRatesDb.getModel();
  const changesModel = changeDb().getModel();

  const [dailyRows, changedRows] = await Promise.all([
    currentModel.aggregate([
      { $match: { origin } },
      { $sort: { date: -1 } },
      {
        $group: {
          _id: { code: "$code", type: "$type" },
          row: { $first: "$$ROOT" },
        },
      },
      { $replaceRoot: { newRoot: "$row" } },
    ]),
    changesModel.aggregate([
      { $match: { origin } },
      { $sort: { observedAt: -1 } },
      {
        $group: {
          _id: { code: "$code", type: "$type" },
          row: { $first: "$$ROOT" },
        },
      },
      { $replaceRoot: { newRoot: "$row" } },
    ]),
  ]);

  const byKey = new Map<string, RateState>();
  for (const row of dailyRows) {
    byKey.set(rateKey(row), {
      origin,
      code: row.code,
      type: row.type || "",
      name: row.name,
      buy: row.buy,
      sell: row.sell,
    });
  }

  // Once the intraday ledger has a state for a quote, it is more precise than
  // the daily row (whose `date` is always the start of the Montevideo day).
  for (const row of changedRows) {
    byKey.set(rateKey(row), {
      origin,
      code: row.code,
      type: row.type || "",
      name: row.name,
      buy: row.buy,
      sell: row.sell,
    });
  }

  return [...byKey.values()];
}

export async function recordRateChanges(changes: RateChange[]): Promise<void> {
  if (changes.length === 0) return;
  await changeDb().getModel().bulkWrite(
    changes.map(change => ({
      updateOne: {
        filter: {
          origin: change.origin,
          code: change.code,
          type: change.type,
          observedAt: change.observedAt,
        },
        update: { $setOnInsert: change },
        upsert: true,
      },
    }))
  );
}

export function buildDailyRateChanges(
  rows: DailyRateState[],
  houseNames: Record<string, string> = {}
): RateChange[] {
  const groups = new Map<string, DailyRateState[]>();
  for (const row of rows) {
    if (
      !isPublicRate(row) ||
      !Number.isFinite(row.buy) ||
      !Number.isFinite(row.sell)
    ) {
      continue;
    }
    const key = fullRateKey(row);
    const group = groups.get(key) || [];
    group.push(row);
    groups.set(key, group);
  }

  const changes: RateChange[] = [];
  for (const group of groups.values()) {
    group.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    for (let index = 0; index < group.length - 1; index++) {
      const current = group[index]!;
      const previous = group[index + 1]!;
      const buyChanged = current.buy !== previous.buy;
      const sellChanged = current.sell !== previous.sell;
      if (!buyChanged && !sellChanged) continue;

      changes.push({
        origin: current.origin,
        houseName: houseNames[current.origin] || current.origin,
        code: current.code.toUpperCase(),
        type: current.type || "",
        name: current.name,
        previousBuy: previous.buy,
        previousSell: previous.sell,
        buy: current.buy,
        sell: current.sell,
        buyChanged,
        sellChanged,
        observedAt: new Date(current.date),
        telegramReportedAt: null,
      });
    }
  }

  return changes.sort(
    (a, b) => b.observedAt.getTime() - a.observedAt.getTime()
  );
}

export async function listRateChanges(
  query: RateChangeQuery = {},
  currentRatesDb?: MongooseServer,
  houseNames: Record<string, string> = {}
): Promise<RateChange[]> {
  const filter: Record<string, unknown> = {};
  if (query.origin) filter.origin = query.origin;
  if (query.code) filter.code = query.code.toUpperCase();
  if (query.type !== undefined) filter.type = query.type;
  if (query.since) filter.observedAt = { $gte: query.since };

  const limit = Math.min(Math.max(query.limit || 100, 1), 200);
  const ledger = (await changeDb()
    .getModel()
    .find(filter)
    .select("-__v")
    .sort({ observedAt: -1 })
    .limit(limit)
    .lean()) as unknown as RateChange[];
  if (!currentRatesDb || ledger.length >= limit) return ledger;

  const dailyFilter: Record<string, unknown> = {
    date: {
      $gte:
        query.since ||
        moment.tz("America/Montevideo").subtract(45, "days").startOf("day").toDate(),
    },
  };
  if (query.origin) dailyFilter.origin = query.origin;
  if (query.code) dailyFilter.code = query.code.toUpperCase();
  if (query.type !== undefined) dailyFilter.type = query.type;

  const dailyRows = (await currentRatesDb
    .getModel()
    .find(dailyFilter)
    .select("origin code type name buy sell date")
    .sort({ date: -1 })
    .limit(20_000)
    .lean()) as unknown as DailyRateState[];
  const dailyChanges = buildDailyRateChanges(dailyRows, houseNames);
  const ledgerDays = new Set(
    ledger.map(
      change =>
        `${fullRateKey(change)}|${moment
          .tz(change.observedAt, "America/Montevideo")
          .format("YYYY-MM-DD")}`
    )
  );
  const fallback = dailyChanges.filter(
    change =>
      !ledgerDays.has(
        `${fullRateKey(change)}|${moment
          .tz(change.observedAt, "America/Montevideo")
          .format("YYYY-MM-DD")}`
      )
  );

  return [...ledger, ...fallback]
    .sort(
      (a, b) =>
        new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime()
    )
    .slice(0, limit);
}

async function historicalFallbackStates(
  currentRatesDb: MongooseServer,
  target: Date
): Promise<Map<string, RateState>> {
  const targetDay = moment.tz(target, "America/Montevideo").startOf("day").toDate();
  const rows = await currentRatesDb.getModel().aggregate([
    { $match: { date: { $lte: targetDay } } },
    { $sort: { date: -1 } },
    {
      $group: {
        _id: { origin: "$origin", code: "$code", type: "$type" },
        row: { $first: "$$ROOT" },
      },
    },
    { $replaceRoot: { newRoot: "$row" } },
  ]);

  return new Map(
    rows.map((row: any) => {
      const state: RateState = {
        origin: row.origin,
        code: row.code,
        type: row.type || "",
        name: row.name,
        buy: row.buy,
        sell: row.sell,
      };
      return [fullRateKey(state), state];
    })
  );
}

export async function buildMarketChangeSummary(
  currentRows: CambioObj[],
  currentRatesDb: MongooseServer,
  hours = 24,
  now = new Date()
): Promise<MarketChangeSummary> {
  const baselineAt = new Date(now.getTime() - hours * 60 * 60 * 1000);
  const changesModel = changeDb().getModel();

  const [beforeRows, afterRows, fallback] = await Promise.all([
    changesModel.aggregate([
      { $match: { observedAt: { $lte: baselineAt } } },
      { $sort: { observedAt: -1 } },
      {
        $group: {
          _id: { origin: "$origin", code: "$code", type: "$type" },
          row: { $first: "$$ROOT" },
        },
      },
      { $replaceRoot: { newRoot: "$row" } },
    ]),
    changesModel.aggregate([
      { $match: { observedAt: { $gt: baselineAt } } },
      { $sort: { observedAt: 1 } },
      {
        $group: {
          _id: { origin: "$origin", code: "$code", type: "$type" },
          row: { $first: "$$ROOT" },
        },
      },
      { $replaceRoot: { newRoot: "$row" } },
    ]),
    historicalFallbackStates(currentRatesDb, baselineAt),
  ]);

  const baselineByKey = new Map<string, RateState>(fallback);
  for (const row of afterRows) {
    const state: RateState = {
      origin: row.origin,
      code: row.code,
      type: row.type || "",
      name: row.name,
      buy: row.previousBuy,
      sell: row.previousSell,
    };
    baselineByKey.set(fullRateKey(state), state);
  }
  for (const row of beforeRows) {
    const state: RateState = {
      origin: row.origin,
      code: row.code,
      type: row.type || "",
      name: row.name,
      buy: row.buy,
      sell: row.sell,
    };
    baselineByKey.set(fullRateKey(state), state);
  }

  const comparable = currentRows.filter((row) => {
    if (!row.origin || !isPublicRate(row) || row.buy <= 0 || row.sell <= 0) return false;
    const baseline = baselineByKey.get(fullRateKey(row));
    return Boolean(
      baseline &&
        Number.isFinite(baseline.buy) &&
        Number.isFinite(baseline.sell) &&
        baseline.buy > 0 &&
        baseline.sell > 0
    );
  });

  const codes = [...new Set(comparable.map((row) => row.code.toUpperCase()))].sort();
  const currencies = codes.map((code) => {
    const rows = comparable.filter((row) => row.code.toUpperCase() === code);
    const baselineRows = rows.map((row) => baselineByKey.get(fullRateKey(row))!);
    const currentAvgBuy = average(rows.map((row) => row.buy));
    const currentAvgSell = average(rows.map((row) => row.sell));
    const baselineAvgBuy = average(baselineRows.map((row) => row.buy));
    const baselineAvgSell = average(baselineRows.map((row) => row.sell));

    return {
      code,
      matchedQuotes: rows.length,
      currentAvgBuy: round(currentAvgBuy),
      currentAvgSell: round(currentAvgSell),
      baselineAvgBuy: round(baselineAvgBuy),
      baselineAvgSell: round(baselineAvgSell),
      buyChangePct: round(((currentAvgBuy - baselineAvgBuy) / baselineAvgBuy) * 100),
      sellChangePct: round(((currentAvgSell - baselineAvgSell) / baselineAvgSell) * 100),
    };
  });

  return {
    asOf: now.toISOString(),
    baselineAt: baselineAt.toISOString(),
    hours,
    currencies,
  };
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-UY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

export function formatRateChangeMessage(changes: RateChange[]): string {
  const first = changes[0]!;
  const lines = [`🔔 Cambio de cotización — ${first.houseName}`];

  for (const change of changes) {
    lines.push("", `${change.code}${change.type ? ` · ${change.type}` : ""}`);
    if (change.buyChanged) {
      lines.push(
        `Compra: $ ${formatNumber(change.previousBuy)} → $ ${formatNumber(change.buy)}`
      );
    }
    if (change.sellChanged) {
      lines.push(
        `Venta: $ ${formatNumber(change.previousSell)} → $ ${formatNumber(change.sell)}`
      );
    }
  }

  lines.push(
    "",
    `Detectado: ${new Intl.DateTimeFormat("es-UY", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Montevideo",
    }).format(first.observedAt)}`,
    "https://cambio-uruguay.com/ultimos-cambios"
  );
  return lines.join("\n");
}

function telegramConfig(): { token?: string; channelId?: string } {
  let token = process.env.TELEGRAM_BOT_TOKEN;
  let channelId =
    process.env.TELEGRAM_RATE_CHANGES_CHANNEL_ID ||
    process.env.TELEGRAM_CHANNEL_ID ||
    process.env.TELEGRAM_ADMIN_CHAT_ID;

  // The existing bot processes keep their credentials in bots/.env. Read only
  // the two Telegram values as a fallback so the sync job can reuse the
  // already-configured channel without importing every bot secret.
  if ((!token || !channelId) && fs.existsSync("bots/.env")) {
    try {
      const botEnv = dotenv.parse(fs.readFileSync("bots/.env"));
      token ||= botEnv.TELEGRAM_BOT_TOKEN;
      channelId ||=
        botEnv.TELEGRAM_RATE_CHANGES_CHANNEL_ID ||
        botEnv.TELEGRAM_CHANNEL_ID ||
        botEnv.TELEGRAM_ADMIN_CHAT_ID;
    } catch (error) {
      console.warn(
        "[rate-changes] could not read Telegram fallback config:",
        (error as Error).message
      );
    }
  }

  return { token, channelId };
}

export async function publishPendingRateChanges(
  fetchImpl: typeof fetch = fetch
): Promise<{ sent: number; pending: number }> {
  const { token, channelId } = telegramConfig();

  const model = changeDb().getModel();
  const pending = (await model
    .find({ telegramReportedAt: null })
    .sort({ observedAt: 1 })
    .limit(200)
    .lean()) as unknown as Array<RateChange & { _id: unknown }>;

  if (pending.length === 0) return { sent: 0, pending: 0 };
  if (!token || !channelId) {
    console.warn(
      "[rate-changes] no TELEGRAM_BOT_TOKEN / TELEGRAM_RATE_CHANGES_CHANNEL_ID; " +
        `${pending.length} event(s) remain pending`
    );
    return { sent: 0, pending: pending.length };
  }

  const groups = new Map<string, Array<RateChange & { _id: unknown }>>();
  for (const change of pending) {
    const key = `${change.origin}|${new Date(change.observedAt).toISOString()}`;
    const group = groups.get(key) || [];
    group.push(change);
    groups.set(key, group);
  }

  let sent = 0;
  for (const group of groups.values()) {
    try {
      const response = await fetchImpl(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            chat_id: channelId,
            text: formatRateChangeMessage(group),
            link_preview_options: { is_disabled: true },
          }),
        }
      );
      const body: any = await (response as any).json().catch(() => ({}));
      if (!response.ok || !body?.ok) {
        console.warn(
          `[rate-changes] Telegram rejected ${group[0]!.origin}: HTTP ${response.status}`
        );
        continue;
      }

      await model.updateMany(
        { _id: { $in: group.map((change) => change._id) } },
        { $set: { telegramReportedAt: new Date() } }
      );
      sent += group.length;
    } catch (error) {
      console.warn(
        `[rate-changes] Telegram send failed for ${group[0]!.origin}:`,
        (error as Error).message
      );
    }
  }

  return { sent, pending: Math.max(0, pending.length - sent) };
}
