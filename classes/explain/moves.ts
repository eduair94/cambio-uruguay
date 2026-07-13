// Notable-move detection + driver attribution for /por-que-sube-el-dolar. Two independent halves:
// pure math (detectMoves, attributeMove — ported verbatim from app/utils/correlation.ts and
// app/utils/attribution.ts) and in-process data access (the backend IS the rates source, so
// fetchCanonicalSeries reads its own Mongo directly instead of $fetch-ing /evolution/...; the
// driver snapshots read-only from the APP's Mongo via classes/appdb.ts, since nitro's
// drivers:daily still writes them — that stage did not move, see the migration plan Task 9).
import { cambio_info } from "../cambioInfo";
import { DriverSnapshotModel } from "../models/DriverSnapshot";

export interface SeriesPoint {
  date: string;
  value: number;
}

export interface Move {
  date: string;
  pctChange: number;
  direction: "up" | "down";
}

/** Days whose |% change vs the previous point| exceeds thresholdPct (default 1). Verbatim port of
 *  app/utils/correlation.ts#detectMoves. */
export function detectMoves(series: SeriesPoint[], thresholdPct = 1): Move[] {
  const out: Move[] = [];
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1];
    const cur = series[i];
    if (!prev || !cur || prev.value <= 0) continue;
    const pct = ((cur.value - prev.value) / prev.value) * 100;
    if (Math.abs(pct) <= thresholdPct) continue;
    out.push({ date: cur.date, pctChange: pct, direction: pct >= 0 ? "up" : "down" });
  }
  return out;
}

export interface DriverDayMove {
  key: string;
  dayMovePct: number;
}

/** % change of each driver on `moveDate` vs its previous available point, ranked by magnitude.
 *  Verbatim port of app/utils/attribution.ts#attributeMove. */
export function attributeMove(
  moveDate: string,
  driverSeries: { key: string; points: SeriesPoint[] }[]
): DriverDayMove[] {
  const out: DriverDayMove[] = [];
  for (const d of driverSeries) {
    const idx = d.points.findIndex((p) => p.date === moveDate);
    if (idx <= 0) continue; // not present, or no prior point
    const cur = d.points[idx]!;
    const prev = d.points[idx - 1]!;
    if (prev.value <= 0) continue;
    out.push({ key: d.key, dayMovePct: ((cur.value - prev.value) / prev.value) * 100 });
  }
  return out.sort((a, b) => Math.abs(b.dayMovePct) - Math.abs(a.dayMovePct));
}

// Phase 1 anchors on USD; EUR/ARS reused here too. Verbatim port of
// app/utils/drivers/config.ts#DRIVERS (soybean dropped there too — same comment applies).
export type DriverSource = "stooq" | "argentinadatos" | "fred";

export interface DriverDef {
  key: string;
  label: string;
  source: DriverSource;
  symbol: string;
  currencies: string[];
}

export const DRIVERS: DriverDef[] = [
  { key: "dxy", label: "Índice dólar (FRED, amplio)", source: "fred", symbol: "DTWEXBGS", currencies: ["USD", "EUR"] },
  { key: "us10y", label: "Bono EE.UU. 10 años", source: "fred", symbol: "DGS10", currencies: ["USD"] },
  { key: "brl", label: "Real BRL/USD", source: "fred", symbol: "DEXBZUS", currencies: ["USD"] },
  { key: "arBlue", label: "Dólar blue Argentina", source: "argentinadatos", symbol: "blue", currencies: ["USD", "ARS"] },
  { key: "arOfficial", label: "Dólar oficial Argentina", source: "argentinadatos", symbol: "oficial", currencies: ["ARS"] },
  { key: "eurusd", label: "EUR/USD", source: "fred", symbol: "DEXUSEU", currencies: ["EUR"] },
];

export function driversFor(currency: string): DriverDef[] {
  return DRIVERS.filter((d) => d.currencies.includes(currency));
}

export interface DateValueMap {
  date: string;
  values: Record<string, number>;
}

/** Turn stored per-date driver maps into one date-sorted SeriesPoint[] per driver. Verbatim port
 *  of app/utils/drivers/pivot.ts#snapshotsToDriverSeries. */
export function snapshotsToDriverSeries(
  snapshots: DateValueMap[],
  defs: DriverDef[]
): { key: string; points: SeriesPoint[] }[] {
  const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
  return defs.map((def) => {
    const points: SeriesPoint[] = [];
    for (const snap of sorted) {
      const value = snap.values[def.key];
      if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        points.push({ date: snap.date, value });
      }
    }
    return { key: def.key, points };
  });
}

// Phase 3 canonical anchors for USD, EUR, ARS — identical to app/server/utils/analysis.ts's.
// EUR has no BCU quote, so it anchors on BROU (empty `type`); ARS mirrors USD (BCU, BILLETE).
const CANONICAL: Record<string, { origin: string; code: string; type: string }> = {
  USD: { origin: "bcu", code: "USD", type: "BILLETE" },
  EUR: { origin: "brou", code: "EUR", type: "" },
  ARS: { origin: "bcu", code: "ARS", type: "BILLETE" },
};

interface RawEvolutionPoint {
  date?: unknown;
  buy?: number;
  sell?: number;
}

function toSeries(points: RawEvolutionPoint[] | undefined): SeriesPoint[] {
  if (!Array.isArray(points)) return [];
  const out: SeriesPoint[] = [];
  for (const p of points) {
    if (!p || !p.date) continue;
    const sell = typeof p.sell === "number" ? p.sell : null;
    const buy = typeof p.buy === "number" ? p.buy : null;
    const value = sell ?? buy;
    if (value === null || !Number.isFinite(value) || value <= 0) continue;
    const raw = p.date;
    const iso = raw instanceof Date ? raw.toISOString() : String(raw);
    out.push({ date: iso.slice(0, 10), value });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** ~2 months of daily points for USD/EUR/ARS, read in-process — the backend IS the rates source,
 *  unlike the app's version of this code which had to $fetch its own /evolution/... route. */
export async function fetchCanonicalSeries(currency: string): Promise<SeriesPoint[]> {
  const anchor = CANONICAL[currency] ?? CANONICAL.USD!;
  try {
    const res = await cambio_info.get_currency_evolution(anchor.origin, anchor.code, 2, anchor.type || undefined);
    return toSeries(res?.evolution);
  } catch {
    return [];
  }
}

/** Load + pivot this currency's driver snapshots into per-driver series, reading the APP's Mongo
 *  read-only (nitro's drivers:daily still writes DriverSnapshot — that stage did not move). */
export async function loadDriverSeries(currency: string): Promise<{ key: string; points: SeriesPoint[] }[]> {
  const docs = await DriverSnapshotModel.find({}).lean();
  const snapshots: DateValueMap[] = (docs as unknown as Array<{ date: string; values: Record<string, number> | Map<string, number> }>).map(
    (d) => ({
      date: d.date,
      values: d.values instanceof Map ? Object.fromEntries(d.values) : (d.values as Record<string, number>) ?? {},
    })
  );
  return snapshotsToDriverSeries(snapshots, driversFor(currency));
}

/** Whether `date` is a notable move day for `currency`, and if so, the move itself. */
export async function findNotableMove(currency: string, date: string): Promise<Move | null> {
  const series = await fetchCanonicalSeries(currency);
  const moves = detectMoves(series, 1);
  return moves.find((m) => m.date === date) ?? null;
}
