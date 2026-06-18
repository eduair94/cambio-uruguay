// Builds the structured daily report + alert payloads from the public API,
// reusing mcp's pure tool handlers. Day-over-day change uses the best-sell
// house's evolution series (daily granularity).
import type { CambioApi } from "cambio-uruguay-mcp/api";
import { getNews, getRates } from "cambio-uruguay-mcp/tools";
import type { BotConfig } from "../config.js";
import type { AlertData, CurrencyDelta, DailyReportData } from "./types.js";

interface EvoPoint {
  date: string;
  buy?: number;
  sell?: number;
}
interface EvolutionLike {
  evolution?: EvoPoint[];
}

/** One sell value per distinct calendar day, ascending. Ignores non-numeric sells. */
function dailySells(evo: EvolutionLike | null): { date: string; sell: number }[] {
  const points = evo?.evolution ?? [];
  const byDay = new Map<string, number>(); // last point of each day wins
  for (const p of points) {
    if (typeof p.sell !== "number" || !Number.isFinite(p.sell)) continue;
    byDay.set(p.date.slice(0, 10), p.sell);
  }
  return [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, sell]) => ({ date, sell }));
}

function dayOverDayPct(evo: EvolutionLike | null): number {
  const days = dailySells(evo);
  if (days.length < 2) return 0;
  const latest = days[days.length - 1]!.sell;
  const prev = days[days.length - 2]!.sell;
  if (prev === 0) return 0;
  return ((latest - prev) / prev) * 100;
}

async function safeEvolution(api: CambioApi, origin: string, currency: string): Promise<EvolutionLike | null> {
  try {
    return (await api.getEvolution(origin, currency)) as EvolutionLike;
  } catch (err) {
    console.error(`evolution ${origin}/${currency} failed:`, err);
    return null;
  }
}

export async function buildDailyData(api: CambioApi, cfg: BotConfig): Promise<DailyReportData> {
  const currencies: CurrencyDelta[] = [];
  let date = new Date().toISOString().slice(0, 10);

  for (const code of cfg.reportCurrencies) {
    try {
      const r = await getRates(api, { currency: code });
      date = r.date.slice(0, 10);
      const evo = await safeEvolution(api, r.bestSell.origin, code);
      currencies.push({
        code,
        marketAvgBuy: r.marketAvgBuy,
        marketAvgSell: r.marketAvgSell,
        changePct: dayOverDayPct(evo),
        bestBuy: { name: r.bestBuy.name, rate: r.bestBuy.rate },
        bestSell: { name: r.bestSell.name, rate: r.bestSell.rate },
        lowestSpread: { name: r.lowestSpread.name, spread: r.lowestSpread.spread },
      });
    } catch (err) {
      console.error(`rates ${code} failed, skipping:`, err);
    }
  }

  let news: DailyReportData["news"] = [];
  try {
    news = await getNews(api, { limit: 5 });
  } catch (err) {
    console.error("news fetch failed:", err);
  }

  return { date, currencies, news };
}

/** Current best-sell vs yesterday's sell for one currency (null if no baseline). */
export async function buildAlertData(api: CambioApi, currency: string): Promise<AlertData | null> {
  const r = await getRates(api, { currency });
  const evo = await safeEvolution(api, r.bestSell.origin, currency);
  const days = dailySells(evo);
  if (days.length < 2) return null;
  const baseline = days[days.length - 2]!.sell; // yesterday
  if (baseline === 0) return null;
  const current = r.bestSell.rate;
  const changePct = ((current - baseline) / baseline) * 100;
  return {
    code: currency.toUpperCase(),
    current,
    baseline,
    changePct,
    direction: changePct >= 0 ? "up" : "down",
  };
}
