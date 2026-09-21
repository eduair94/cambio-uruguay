// rental_market_stats, estimate_fair_rent, compare_neighborhoods: what renting
// costs where, whether one asking price is fair, and neighbourhoods side by side.

import { compact, fmt, fold, money, pct, siteUrl } from "../format.js";
import { UserInputError, type ToolOutput } from "../output.js";
import { TTL, type SiteApi } from "../site.js";
import { QUALITY_LABEL } from "./types.js";

interface Band {
  count?: number;
  median?: number;
  p25?: number;
  p75?: number;
}

interface AnalysisGroup {
  name?: string;
  bedrooms?: number;
  count?: number;
  rent?: Band;
  expenses?: Band;
  monthly?: Band;
  expensesCoveragePct?: number;
  perM2?: { built?: Band; total?: Band };
}

interface AnalysisResponse {
  generatedAt?: string;
  query?: Record<string, unknown>;
  summary?: AnalysisGroup;
  neighborhoods?: AnalysisGroup[];
  bedrooms?: AnalysisGroup[];
  coverage?: { eligibleProperties?: number };
}

const band = (b: Band | undefined, currency = "UYU") =>
  b?.median ? `${money(b.median, currency)} (típico ${money(b.p25, currency)}–${money(b.p75, currency)}, n=${fmt(b.count ?? 0)})` : "s/d";

export interface MarketStatsInput {
  department?: string;
  neighborhood?: string;
  type?: "apartamento" | "casa";
  bedrooms?: number;
  currency?: "UYU" | "USD";
}

export async function rentalMarketStats(site: SiteApi, input: MarketStatsInput): Promise<ToolOutput> {
  const currency = input.currency ?? "UYU";
  const res = await site.get<AnalysisResponse>(
    "/api/rentals/analysis",
    { currency, department: input.department, neighborhood: input.neighborhood, type: input.type, bedrooms: input.bedrooms },
    { ttlMs: TTL.catalog }
  );
  const s = res.summary ?? {};
  const scope = [input.type ?? "viviendas", input.bedrooms !== undefined ? `${input.bedrooms} dorm` : "", input.neighborhood, input.department ?? "todo el país"]
    .filter(Boolean)
    .join(" · ");
  const ranked = (res.neighborhoods ?? []).filter((n) => (n.rent?.count ?? 0) >= 10 && n.rent?.median);
  ranked.sort((a, b) => (a.rent!.median ?? 0) - (b.rent!.median ?? 0));
  const cheapest = ranked.slice(0, 8);
  const priciest = ranked.slice(-5).reverse();
  const lines = [
    `Mercado de alquiler (${scope}), ${fmt(s.count ?? 0)} avisos vigentes:`,
    `- Alquiler: ${band(s.rent, currency)}`,
    `- Gastos comunes: ${band(s.expenses, currency)} (los publica el ${fmt(s.expensesCoveragePct ?? 0)} % de los avisos)`,
    `- Total mensual (alquiler + GC, sólo avisos que publican ambos): ${band(s.monthly, currency)}`,
    `- Precio por m² construido: ${band(s.perM2?.built, currency)}`,
  ];
  const byBedrooms = (res.bedrooms ?? []).filter((b) => b.rent?.median);
  if (byBedrooms.length && input.bedrooms === undefined)
    lines.push("Por dormitorios: " + byBedrooms.map((b) => `${b.bedrooms === 0 ? "monoambiente" : `${b.bedrooms} dorm`} ${money(b.rent!.median, currency)}`).join(" · "));
  if (cheapest.length && !input.neighborhood) {
    lines.push("Barrios más accesibles (mediana): " + cheapest.map((n) => `${n.name} ${money(n.rent!.median, currency)}`).join(" · "));
    lines.push("Barrios más caros: " + priciest.map((n) => `${n.name} ${money(n.rent!.median, currency)}`).join(" · "));
  }
  lines.push(`Datos del ${res.generatedAt?.slice(0, 10) ?? "s/d"} (análisis semanal de avisos vistos en los últimos 10 días; son precios pedidos, no firmados).`);
  return {
    text: lines.join("\n"),
    data: {
      scope: res.query ?? input,
      summary: compact({ count: s.count, rent: s.rent, expenses: s.expenses, monthly: s.monthly, perM2Built: s.perM2?.built, expensesCoveragePct: s.expensesCoveragePct }),
      byBedrooms: byBedrooms.map((b) => ({ bedrooms: b.bedrooms, count: b.count, rent: b.rent })),
      cheapestNeighborhoods: cheapest.map((n) => ({ name: n.name, count: n.count, rent: n.rent, monthly: n.monthly })),
      priciestNeighborhoods: priciest.map((n) => ({ name: n.name, count: n.count, rent: n.rent })),
      asOf: res.generatedAt?.slice(0, 10) ?? null,
      siteUrl: siteUrl("/analisis-alquileres-uruguay"),
    },
  };
}

export interface EstimateInput {
  department: string;
  neighborhood: string;
  type: "apartamento" | "casa";
  bedrooms: number;
  bathrooms: number;
  areaM2: number;
  areaBasis?: "built" | "total";
  currency?: "UYU" | "USD";
  parkingSpaces?: number;
  askingPrice?: number;
}

interface EstimateResponse {
  generatedAt?: string;
  status?: string;
  reason?: string | null;
  sampleCount?: number;
  advertiserCount?: number;
  range?: Band;
  monthly?: Band;
  comparisonToAskingPct?: number | null;
  askingPosition?: { percentile?: number; belowCount?: number; aboveCount?: number } | null;
  comparables?: Array<{ title?: string; url?: string; price?: number; currency?: string; area?: number; commonExpenses?: number | null; lastSeen?: string }>;
}

export async function estimateFairRent(site: SiteApi, input: EstimateInput): Promise<ToolOutput> {
  const currency = input.currency ?? "UYU";
  const areaBasis = input.type === "casa" ? "built" : input.areaBasis ?? "built";
  const res = await site.post<EstimateResponse>("/api/rentals/estimate", {
    department: input.department,
    neighborhood: input.neighborhood,
    type: input.type,
    bedrooms: input.bedrooms,
    bathrooms: input.bathrooms,
    area: input.areaM2,
    areaBasis,
    currency,
    parkingSpaces: input.parkingSpaces ?? "",
    askingPrice: input.askingPrice ?? "",
  });
  const lines: string[] = [];
  if (res.status !== "supported" || !res.range?.median) {
    lines.push(
      `No hay suficientes comparables para tasar esta vivienda (${res.reason ?? "muestra insuficiente"}). ` +
        "Probá con el barrio vecino, sin baños exactos o con otra superficie."
    );
  } else {
    lines.push(
      `Alquiler estimado: ${money(res.range.median, currency)} (rango típico ${money(res.range.p25, currency)}–${money(res.range.p75, currency)}), ` +
        `sobre ${fmt(res.sampleCount ?? 0)} avisos de ${fmt(res.advertiserCount ?? 0)} anunciantes distintos con superficie parecida.`
    );
    if (res.monthly?.median) lines.push(`Total mensual con gastos comunes: ${band(res.monthly, currency)}.`);
    if (input.askingPrice && typeof res.comparisonToAskingPct === "number") {
      const diff = res.comparisonToAskingPct;
      lines.push(
        `El precio pedido (${money(input.askingPrice, currency)}) está ${diff === 0 ? "en la mediana" : diff > 0 ? `${pct(diff / 100)} por encima` : `${pct(-diff / 100)} por debajo`}` +
          (res.askingPosition?.percentile !== undefined ? `; más caro que el ${fmt(res.askingPosition.percentile)} % de los comparables.` : ".")
      );
    }
    const comps = (res.comparables ?? []).slice(0, 5);
    if (comps.length)
      lines.push("Comparables:", ...comps.map((c, n) => `${n + 1}. ${money(c.price, c.currency)} · ${c.area ?? "?"} m² · ${c.title ?? ""} ${c.url ?? ""}`));
  }
  lines.push("Son precios pedidos en avisos, no contratos firmados.");
  return {
    text: lines.join("\n"),
    data: compact({
      status: res.status,
      reason: res.reason,
      estimate: res.range,
      monthly: res.monthly,
      sampleCount: res.sampleCount,
      advertiserCount: res.advertiserCount,
      askingDiffPct: res.comparisonToAskingPct,
      askingPercentile: res.askingPosition?.percentile,
      comparables: (res.comparables ?? []).slice(0, 10),
      asOf: res.generatedAt?.slice(0, 10),
      siteUrl: siteUrl("/analisis-alquileres-uruguay"),
    }),
  };
}

interface ZoneRow {
  id: string;
  ref?: { department?: string; neighborhood?: string };
  prices?: { rent?: Band; commonExpenses?: Band; monthlyTotal?: Band; builtSquareMeter?: Band };
  crime?: { status?: string; total?: number; byOffense?: Record<string, number>; periodFrom?: string; periodTo?: string } | null;
  utilities?: {
    official?: { id?: string; name?: string } | null;
    water?: { notices?: number; hours?: number } | null;
    claims?: { perThousand?: Record<string, number> } | null;
    levels?: Record<string, string>;
  } | null;
  services?: { status?: string; counts?: Record<string, number> } | null;
}

interface ZonesResponse {
  status?: string;
  generatedAt?: string;
  zones?: ZoneRow[];
}

interface ScoresResponse {
  zones?: Record<string, { name?: string; rows?: Array<{ attribute: string; value: number; betterThan: number; zones: number }> }>;
}

export interface CompareInput {
  neighborhoods?: string[];
  department?: string;
  type?: "apartamento" | "casa";
  bedrooms?: "any" | "0" | "1" | "2" | "3" | "4plus";
  rankBy?: "rent" | "monthly" | "safety" | "services";
  limit?: number;
}

const SERVICE_LABEL: Record<string, string> = {
  supermarket: "supermercados",
  grocery: "almacenes",
  pharmacy: "farmacias",
  healthcare: "salud",
  transit: "transporte",
  education: "educación",
};
const LEVEL_LABEL: Record<string, string> = { low: "bajo", medium: "medio", high: "alto" };

function describeZone(z: ZoneRow, scores: ScoresResponse | null) {
  const official = z.utilities?.official?.id;
  const rank = official ? scores?.zones?.[official]?.rows ?? [] : [];
  return compact({
    name: z.ref?.neighborhood,
    department: z.ref?.department,
    rent: z.prices?.rent,
    monthly: z.prices?.monthlyTotal,
    commonExpenses: z.prices?.commonExpenses,
    perM2Built: z.prices?.builtSquareMeter,
    crime:
      z.crime?.status === "ready"
        ? compact({ total: z.crime.total, byOffense: z.crime.byOffense, period: `${z.crime.periodFrom} a ${z.crime.periodTo}` })
        : undefined,
    publicServices: z.utilities?.levels
      ? Object.fromEntries(Object.entries(z.utilities.levels).map(([k, v]) => [QUALITY_LABEL[k] ?? k, LEVEL_LABEL[v] ?? v]))
      : undefined,
    waterCuts: z.utilities?.water ?? undefined,
    nearbyServices: z.services?.counts
      ? Object.fromEntries(Object.entries(z.services.counts).map(([k, v]) => [SERVICE_LABEL[k] ?? k, v]))
      : undefined,
    ranks: rank.length
      ? rank.map((r) => ({ what: QUALITY_LABEL[r.attribute] ?? r.attribute, betterThanPct: Math.round(r.betterThan * 100), among: r.zones }))
      : undefined,
  });
}

const rankValue = (row: ZoneRow, scores: ScoresResponse | null, by: string): number | null => {
  if (by === "rent") return row.prices?.rent?.median ?? null;
  if (by === "monthly") return row.prices?.monthlyTotal?.median ?? null;
  const official = row.utilities?.official?.id;
  const attribute = by === "safety" ? "denuncias" : "servicios";
  const hit = official ? scores?.zones?.[official]?.rows?.find((r) => r.attribute === attribute) : undefined;
  return hit ? -hit.betterThan : null;
};

export async function compareNeighborhoods(site: SiteApi, input: CompareInput): Promise<ToolOutput> {
  const [zones, scores] = await Promise.all([
    site.get<ZonesResponse>(
      "/api/rentals/zones",
      { department: input.department, propertyType: input.type ?? "apartamento", bedrooms: input.bedrooms ?? "any" },
      { ttlMs: TTL.catalog }
    ),
    site.get<ScoresResponse>("/api/rentals/zone-scores", undefined, { ttlMs: TTL.catalog }).catch(() => null),
  ]);
  const all = (zones.zones ?? []).filter((z) => !input.department || fold(z.ref?.department ?? "") === fold(input.department));
  let picked: ZoneRow[];
  const missing: string[] = [];
  if (input.neighborhoods?.length) {
    picked = [];
    for (const wanted of input.neighborhoods) {
      const key = fold(wanted);
      const hit =
        all.find((z) => fold(z.ref?.neighborhood ?? "") === key) ??
        all.find((z) => fold(z.utilities?.official?.name ?? "") === key) ??
        all.find((z) => fold(z.ref?.neighborhood ?? "").includes(key));
      if (hit) picked.push(hit);
      else missing.push(wanted);
    }
  } else {
    const by = input.rankBy ?? "rent";
    picked = all
      .map((z) => ({ z, v: rankValue(z, scores, by) }))
      .filter((x): x is { z: ZoneRow; v: number } => x.v !== null && (by !== "rent" || (x.z.prices?.rent?.count ?? 0) >= 8))
      .sort((a, b) => a.v - b.v)
      .slice(0, Math.max(1, Math.min(20, input.limit ?? 10)))
      .map((x) => x.z);
  }
  if (!picked.length)
    throw new UserInputError(
      `No se encontraron esos barrios${missing.length ? ` (${missing.join(", ")})` : ""}. Usá el nombre del barrio como aparece en los avisos (p. ej. "Pocitos", "Cordón", "Malvín") y el departamento.`
    );
  const rows = picked.map((z) => describeZone(z, scores));
  const lines = rows.map((r) => {
    const parts = [
      `alquiler ${band(r.rent as Band)}`,
      r.monthly ? `total c/GC ${money((r.monthly as Band).median)}` : "",
      r.crime ? `${fmt((r.crime as { total: number }).total)} delitos denunciados (${(r.crime as { period: string }).period})` : "",
      r.publicServices ? Object.entries(r.publicServices).map(([k, v]) => `${k}: ${v}`).join(", ") : "",
      r.nearbyServices ? `cerca: ${Object.entries(r.nearbyServices).map(([k, v]) => `${v} ${k}`).join(", ")}` : "",
      r.ranks ? `mejor que el ${(r.ranks as Array<{ what: string; betterThanPct: number }>).map((x) => `${x.betterThanPct} % en ${x.what}`).join(", ")}` : "",
    ].filter(Boolean);
    return `• ${r.name}, ${r.department}: ${parts.join(" · ")}`;
  });
  if (missing.length) lines.push(`Sin datos para: ${missing.join(", ")}.`);
  lines.push(
    "Los niveles (bajo/medio/alto) comparan cortes de agua y reclamos por cliente con los demás barrios; los delitos son denuncias del Ministerio del Interior, no una tasa por habitante."
  );
  return {
    text: lines.join("\n"),
    data: { neighborhoods: rows, missing, asOf: zones.generatedAt?.slice(0, 10) ?? null, siteUrl: siteUrl("/barrios-alquileres-uruguay") },
  };
}
