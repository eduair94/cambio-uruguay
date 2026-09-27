// El medidor de uso convertido en lo que lee una persona: filas por día × cliente × ruta, un
// resumen por cliente y el ranking de los que usan la API sin clave. Puro.
//
// Cliente = `key:<id>` (una clave), `ua:<User-Agent>` (anónimo) o `site` (lectores del sitio). El
// ranking de anónimos es la lista de a quién ofrecerle un plan: un programa que se identifica y pide
// todos los días. Nunca hay IP acá.
import { dayMinus } from "./window";

export interface UsageRow {
  day: string;
  client: string;
  route: string;
  count: number;
}

export interface UsageDaysRepo {
  upsertDay(day: string, rows: UsageRow[]): Promise<number>;
  readRange(from: string, to: string): Promise<UsageRow[]>;
}

export interface ClientSummary {
  total: number;
  last7: number;
  routes: { route: string; count: number }[];
  daily: { day: string; count: number }[];
}

export interface AnonymousLead {
  userAgent: string;
  total: number;
  last7: number;
  routes: { route: string; count: number }[];
}

export function splitField(field: string): { client: string; route: string } | null {
  const i = field.lastIndexOf("|");
  if (i <= 0 || i === field.length - 1) return null;
  return { client: field.slice(0, i), route: field.slice(i + 1) };
}

export function rowsFromHash(day: string, hash: Record<string, number>): UsageRow[] {
  const rows: UsageRow[] = [];
  for (const [field, count] of Object.entries(hash)) {
    const parts = splitField(field);
    if (!parts || !(count > 0)) continue;
    rows.push({ day, client: parts.client, route: parts.route, count });
  }
  return rows;
}

export function summarize(rows: UsageRow[], today: string, topRoutes = 10): Record<string, ClientSummary> {
  const weekStart = dayMinus(today, 6);
  const acc = new Map<string, { total: number; last7: number; routes: Map<string, number>; daily: Map<string, number> }>();
  for (const row of rows) {
    const entry = acc.get(row.client) ?? { total: 0, last7: 0, routes: new Map(), daily: new Map() };
    entry.total += row.count;
    if (row.day >= weekStart && row.day <= today) entry.last7 += row.count;
    entry.routes.set(row.route, (entry.routes.get(row.route) ?? 0) + row.count);
    entry.daily.set(row.day, (entry.daily.get(row.day) ?? 0) + row.count);
    acc.set(row.client, entry);
  }
  const out: Record<string, ClientSummary> = {};
  for (const [client, entry] of acc) {
    out[client] = {
      total: entry.total,
      last7: entry.last7,
      routes: [...entry.routes]
        .map(([route, count]) => ({ route, count }))
        .sort((a, b) => b.count - a.count || a.route.localeCompare(b.route))
        .slice(0, topRoutes),
      daily: [...entry.daily].map(([day, count]) => ({ day, count })).sort((a, b) => a.day.localeCompare(b.day)),
    };
  }
  return out;
}

export function rankAnonymous(summary: Record<string, ClientSummary>, top = 30): AnonymousLead[] {
  return Object.entries(summary)
    .filter(([client]) => client.startsWith("ua:"))
    .map(([client, s]) => ({ userAgent: client.slice(3), total: s.total, last7: s.last7, routes: s.routes.slice(0, 5) }))
    .sort((a, b) => b.total - a.total || a.userAgent.localeCompare(b.userAgent))
    .slice(0, top);
}
