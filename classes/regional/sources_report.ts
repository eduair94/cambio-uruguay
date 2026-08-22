// El informe de fuentes: quién publica qué, cómo le fue en la última corrida y
// qué tan de acuerdo está con los demás.
//
// El catálogo solo (nombre, URL, qué aporta) es una lista de intenciones. Lo que
// hace falta para confiar en un tablero armado con veintiuna fuentes es lo otro:
// cuál respondió, cuánto tardó, qué mercados terminó publicando, en cuáles quedó
// como corroboración, qué se le descartó y por qué. Todo eso ya existe repartido
// entre el catálogo y el snapshot; acá se junta en una fila por fuente.
//
// PURE: recibe catálogo y snapshot, no toca red ni base. Así el endpoint es un
// `load + build` y el test no necesita nada.
import type { RegionalSnapshot, RegionalSourceMeta } from "./types";

/** Qué papel juega la fuente en el sistema. */
export type RegionalSourceRole = "live" | "history" | "internal";

export interface RegionalSourceReport {
  id: string;
  name: string;
  url: string;
  access: "api" | "scrape";
  publisher: RegionalSourceMeta["publisher"];
  covers: string;
  /** `null` para los feeds mundiales: no describen a un país en particular. */
  country: string | null;
  scope: "national" | "global";
  role: RegionalSourceRole;
  /** Cómo le fue en la última corrida. `null` si no participa del snapshot. */
  status: {
    ok: boolean;
    note: string;
    ms: number;
    /** Cotizaciones que entregó, antes de validar. */
    quotes: number;
  } | null;
  /** Mercados donde su lectura es la publicada. */
  published: string[];
  /** Mercados donde otra fuente ganó y ésta quedó corroborando. */
  corroborates: string[];
  /** Lo que el validador le descartó, con el motivo. */
  rejected: Array<{ id: string; reason: string; value: number | null }>;
  /** La diferencia más grande contra quien la corrobora, en porcentaje. */
  maxDisagreementPct: number | null;
  /** La cotización publicada más vieja de esta fuente (ISO). */
  oldestQuoteAt: string | null;
}

export interface RegionalSourcesResponse {
  generatedAt: string | null;
  summary: {
    total: number;
    live: number;
    responding: number;
    failing: number;
    centralBanks: number;
    scrapes: number;
    global: number;
    /** Mercados con dos o más lecturas independientes. */
    corroboratedMarkets: number;
    /** Mercados con una sola fuente: los puntos ciegos que quedan. */
    singleSourceMarkets: number;
  };
  sources: RegionalSourceReport[];
}

/** Fuentes que no salen a la red en la corrida en vivo. */
const ROLE_BY_ID: Record<string, RegionalSourceRole> = {
  uy_local: "internal",
  ar_argentinadatos: "history",
};

export function buildSourcesReport(
  catalogue: RegionalSourceMeta[],
  snapshot: RegionalSnapshot | null
): RegionalSourcesResponse {
  const runs = new Map((snapshot?.sources ?? []).map((run) => [run.id, run]));
  const quotes = snapshot?.quotes ?? [];

  const published = new Map<string, string[]>();
  const corroborates = new Map<string, string[]>();
  const disagreement = new Map<string, number>();
  const oldest = new Map<string, string>();

  for (const quote of quotes) {
    const list = published.get(quote.source) ?? [];
    list.push(quote.id);
    published.set(quote.source, list);

    const previous = oldest.get(quote.source);
    if (!previous || quote.updatedAt < previous) oldest.set(quote.source, quote.updatedAt);

    for (const other of quote.corroboratedBy ?? []) {
      const otherList = corroborates.get(other) ?? [];
      otherList.push(quote.id);
      corroborates.set(other, otherList);
      if (typeof quote.disagreementPct === "number") {
        // La diferencia máxima del grupo se atribuye a los dos lados: es una
        // distancia, y saber que existe importa igual desde cualquiera de ellos.
        disagreement.set(other, Math.max(disagreement.get(other) ?? 0, quote.disagreementPct));
        disagreement.set(quote.source, Math.max(disagreement.get(quote.source) ?? 0, quote.disagreementPct));
      }
    }
  }

  const rejectedBySource = new Map<string, RegionalSourceReport["rejected"]>();
  for (const row of snapshot?.rejected ?? []) {
    const list = rejectedBySource.get(row.source) ?? [];
    list.push({ id: row.id, reason: row.reason, value: row.value });
    rejectedBySource.set(row.source, list);
  }

  const sources: RegionalSourceReport[] = catalogue.map((meta) => {
    const run = runs.get(meta.id) ?? null;
    const role = ROLE_BY_ID[meta.id] ?? "live";
    return {
      id: meta.id,
      name: meta.name,
      url: meta.url,
      access: meta.access,
      publisher: meta.publisher,
      covers: meta.covers,
      country: meta.global ? null : meta.country,
      scope: meta.global ? "global" : "national",
      role,
      status: run ? { ok: run.ok, note: run.note, ms: run.ms, quotes: run.quotes } : null,
      published: (published.get(meta.id) ?? []).sort(),
      corroborates: (corroborates.get(meta.id) ?? []).sort(),
      rejected: rejectedBySource.get(meta.id) ?? [],
      maxDisagreementPct: disagreement.has(meta.id) ? disagreement.get(meta.id)! : null,
      oldestQuoteAt: oldest.get(meta.id) ?? null,
    };
  });

  const readings = new Map<string, number>();
  for (const quote of quotes) {
    readings.set(quote.id, 1 + (quote.corroboratedBy?.length ?? 0));
  }

  return {
    generatedAt: snapshot?.generatedAt ?? null,
    summary: {
      total: sources.length,
      live: sources.filter((source) => source.role === "live").length,
      responding: sources.filter((source) => source.status?.ok).length,
      failing: sources.filter((source) => source.status && !source.status.ok).length,
      centralBanks: sources.filter((source) => source.publisher === "central-bank").length,
      scrapes: sources.filter((source) => source.access === "scrape").length,
      global: sources.filter((source) => source.scope === "global").length,
      corroboratedMarkets: [...readings.values()].filter((count) => count > 1).length,
      singleSourceMarkets: [...readings.values()].filter((count) => count === 1).length,
    },
    sources,
  };
}

/** El informe de una sola fuente, para `GET /regional/sources/:id`. */
export function findSourceReport(
  report: RegionalSourcesResponse,
  id: string
): RegionalSourceReport | null {
  return report.sources.find((source) => source.id === id) ?? null;
}
