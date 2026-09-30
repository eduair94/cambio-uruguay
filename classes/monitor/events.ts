// Una corrida del monitor de competencia: qué pasó desde la anterior y qué hay que avisar. Puro.
//
// Tres guardas que salen de cómo se escribe el dato, no de gustos:
// - Un cambio del ledger se CONFIRMA contra la foto de hoy. El ledger registra el cambio antes de
//   que la guarda de plausibilidad decida (classes/cambio.ts), así que una coma perdida deja un
//   "cambio" que la foto nunca publicó.
// - La posición se avisa recién si se vio igual en DOS corridas seguidas: el sync de 5 minutos
//   escribe casa por casa y una sola lectura puede ser un estado a medio actualizar.
// - Los movimientos miran como mucho 30 minutos atrás: un monitor reactivado después de semanas no
//   vuelca historia.
import moment from "moment-timezone";
import { bestOf, placementOf, type Placement } from "./ranking";
import type { LedgerChange, MonitorConfig, MonitorState, Quote, Side } from "./types";

const ZONE = "America/Montevideo";
export const QUIET_WINDOW_MS = 3 * 3_600_000;
export const MOVE_LOOKBACK_MS = 30 * 60_000;
export const QUIET_MIN_MOVERS = 2;
const SIDES: Side[] = ["buy", "sell"];

export type MonitorEvent =
  | { kind: "move"; origin: string; code: string; fromBuy: number; toBuy: number; fromSell: number; toSell: number; at: Date }
  | {
      kind: "position";
      code: string;
      side: Side;
      from: number | null;
      to: number;
      of: number;
      better: { origin: string; value: number }[];
    }
  | { kind: "quiet"; code: string; lastOwnChangeAt: Date | null; movers: string[] }
  | { kind: "daily"; day: string; lines: DailyLine[] };

export interface DailyLine {
  code: string;
  own: { buy: Placement | null; sell: Placement | null } | null;
  bestBuy: { origin: string; value: number } | null;
  bestSell: { origin: string; value: number } | null;
  moves: { origin: string; count: number }[];
}

export interface EvaluationInput {
  config: MonitorConfig;
  state: MonitorState;
  now: Date;
  /** Foto de hoy del grupo, por moneda (groupQuotes). */
  quotes: Map<string, Quote[]>;
  /** Cambios del grupo desde el principio del día de Montevideo (o 30 min antes si es más temprano), en orden. */
  changes: readonly LedgerChange[];
}

export function dayStart(now: Date): Date {
  return moment.tz(now, ZONE).startOf("day").toDate();
}

export function montevideoToday(now: Date): string {
  return moment.tz(now, ZONE).format("YYYY-MM-DD");
}

function minutesOfDay(now: Date): number {
  const local = moment.tz(now, ZONE);
  return local.hours() * 60 + local.minutes();
}

function inQuietHours(now: Date): boolean {
  const weekday = moment.tz(now, ZONE).isoWeekday(); // 1 = lunes … 7 = domingo
  const minutes = minutesOfDay(now);
  return weekday <= 5 && minutes >= 10 * 60 && minutes < 19 * 60;
}

export function evaluate(input: EvaluationInput): { events: MonitorEvent[]; state: MonitorState } {
  const { config, now, quotes } = input;
  const state: MonitorState = {
    ...input.state,
    positions: { ...input.state.positions },
    quietDay: { ...input.state.quietDay },
  };
  const events: MonitorEvent[] = [];
  const nowMs = now.getTime();
  const today = montevideoToday(now);
  const todayMs = dayStart(now).getTime();
  const competitors = new Set(config.competitors);
  const own = config.ownOrigin;

  const quoteOf = (origin: string, code: string): Quote | null =>
    (quotes.get(code) ?? []).find((q) => q.origin === origin) ?? null;
  // Sólo cuentan los cambios del mismo tipo que publica la foto para esa casa y moneda.
  const counted = input.changes.filter((c) => {
    const q = quoteOf(c.origin, c.code);
    return !!q && q.type === c.type && c.observedAt.getTime() <= nowMs;
  });

  if (config.alerts.moves) {
    const from = Math.max(state.cursor ? state.cursor.getTime() : nowMs, nowMs - MOVE_LOOKBACK_MS);
    const collapsed = new Map<string, { first: LedgerChange; last: LedgerChange }>();
    for (const c of counted) {
      if (c.observedAt.getTime() <= from || !competitors.has(c.origin)) continue;
      const key = `${c.origin}|${c.code}`;
      const entry = collapsed.get(key);
      if (entry) entry.last = c;
      else collapsed.set(key, { first: c, last: c });
    }
    for (const { first, last } of collapsed.values()) {
      const q = quoteOf(last.origin, last.code)!;
      if (q.buy !== last.buy || q.sell !== last.sell) continue;
      if (first.previousBuy === last.buy && first.previousSell === last.sell) continue;
      events.push({
        kind: "move",
        origin: last.origin,
        code: last.code,
        fromBuy: first.previousBuy,
        toBuy: last.buy,
        fromSell: first.previousSell,
        toSell: last.sell,
        at: last.observedAt,
      });
    }
  }

  if (own && config.alerts.position) {
    for (const code of config.currencies) {
      for (const side of SIDES) {
        const key = `${code}|${side}`;
        const place = placementOf(quotes.get(code) ?? [], own, side);
        const current = place ? place.position : null;
        const memo = state.positions[key];
        if (!memo) {
          state.positions[key] = { seen: current, alerted: current };
          continue;
        }
        let alerted = memo.alerted;
        if (place && current === memo.seen && current !== memo.alerted) {
          events.push({
            kind: "position",
            code,
            side,
            from: memo.alerted,
            to: place.position,
            of: place.of,
            better: place.better.slice(0, 3),
          });
          alerted = current;
        }
        state.positions[key] = { seen: current, alerted };
      }
    }
  }

  if (own && config.alerts.quiet && inQuietHours(now)) {
    const since = nowMs - QUIET_WINDOW_MS;
    for (const code of config.currencies) {
      if (state.quietDay[code] === today || !quoteOf(own, code)) continue;
      const inWindow = counted.filter((c) => c.code === code && c.observedAt.getTime() > since);
      if (inWindow.some((c) => c.origin === own)) continue;
      const movers = [...new Set(inWindow.filter((c) => competitors.has(c.origin)).map((c) => c.origin))].sort();
      if (movers.length < QUIET_MIN_MOVERS) continue;
      const ownToday = counted.filter((c) => c.code === code && c.origin === own && c.observedAt.getTime() >= todayMs);
      events.push({
        kind: "quiet",
        code,
        lastOwnChangeAt: ownToday.length ? ownToday[ownToday.length - 1].observedAt : null,
        movers,
      });
      state.quietDay[code] = today;
    }
  }

  if (config.alerts.daily && minutesOfDay(now) >= 18 * 60 + 30 && state.dailyDay !== today) {
    const lines: DailyLine[] = config.currencies.map((code) => {
      const list = quotes.get(code) ?? [];
      const counts = new Map<string, number>();
      for (const c of counted) {
        if (c.code !== code || !competitors.has(c.origin) || c.observedAt.getTime() < todayMs) continue;
        counts.set(c.origin, (counts.get(c.origin) ?? 0) + 1);
      }
      return {
        code,
        own: own ? { buy: placementOf(list, own, "buy"), sell: placementOf(list, own, "sell") } : null,
        bestBuy: bestOf(list, "buy"),
        bestSell: bestOf(list, "sell"),
        moves: [...counts]
          .map(([origin, count]) => ({ origin, count }))
          .sort((a, b) => b.count - a.count || a.origin.localeCompare(b.origin)),
      };
    });
    if (lines.some((line) => line.bestBuy || line.bestSell)) events.push({ kind: "daily", day: today, lines });
    state.dailyDay = today;
  }

  state.cursor = now;
  return { events, state };
}
