// find_property_opportunities: homes asked below comparable adverts, with the
// evidence behind each gap. It is a price comparison, not an appraisal.

import { compact, fmt, money, pct, siteUrl, type QueryValue } from "../format.js";
import type { ToolOutput } from "../output.js";
import { TTL, type SiteApi } from "../site.js";
import { rentalSiteUrl } from "./compact.js";
import { SOURCE_LABEL } from "./types.js";

export const CAUTION_LABEL: Record<string, string> = {
  asking_prices_only: "son precios anunciados, no de cierre",
  availability_unverified: "confirmar que siga disponible y el precio vigente",
  condition_unverified: "estado, reformas y orientación sin verificar",
  parking_unverified: "confirmar si el garaje está incluido y su costo",
  furnishing_unverified: "el equipamiento puede diferir entre avisos",
  single_source: "comparables de un solo portal",
  total_area_basis: "compara superficie total (interior + exterior)",
};

export interface OpportunityInput {
  operation?: "rent" | "sale";
  department?: string;
  neighborhood?: string;
  type?: "apartamento" | "casa";
  bedrooms?: number;
  maxPrice?: number;
  confidence?: "supported" | "limited";
  evidence?: "standard" | "exploratory";
  signal?: "total_price" | "price_per_m2";
  sort?: "evidence" | "discount" | "price" | "recent";
  page?: number;
  perPage?: number;
}

interface OppItem {
  subject: {
    id?: string;
    propertyKey?: string;
    source?: string;
    url?: string;
    title?: string;
    sellerName?: string;
    department?: string;
    neighborhood?: string;
    propertyType?: string;
    bedrooms?: number;
    bathrooms?: number;
    area?: { value?: number; basis?: string };
    price?: { amount?: number; currency?: string };
    expenses?: { amount?: number; currency?: string } | null;
    comparisonPrice?: number;
    lastSeen?: string;
    publishedAt?: string;
  };
  analysis: {
    pricingBasis?: string;
    currency?: string;
    median?: number;
    q25?: number;
    q75?: number;
    gapPct?: number;
    conservativeGapPct?: number;
    perAreaGapPct?: number;
    distinctN?: number;
    sellersN?: number;
    confidence?: string;
    evidenceTier?: string;
    signals?: string[];
  };
  comparables?: Array<{ url?: string; title?: string; price?: { amount?: number; currency?: string }; comparisonPrice?: number }>;
  cautions?: string[];
}

interface OppResponse {
  operation?: string;
  generatedAt?: string;
  stale?: boolean;
  total?: number;
  page?: number;
  pages?: number;
  items?: OppItem[];
  stats?: { analyzed?: number; qualified?: number; excluded?: Record<string, number> };
}

export async function findPropertyOpportunities(site: SiteApi, input: OpportunityInput): Promise<ToolOutput> {
  const operation = input.operation ?? "rent";
  const params: Record<string, QueryValue> = {
    operation,
    department: input.department,
    neighborhood: input.neighborhood,
    type: input.type,
    bedrooms: input.bedrooms,
    maxPrice: input.maxPrice,
    confidence: input.confidence,
    evidence: input.evidence,
    signal: input.signal,
    sort: input.sort,
    availability: operation === "rent" ? "hide_any" : undefined,
    page: input.page && input.page > 1 ? input.page : undefined,
    perPage: Math.min(24, Math.max(1, input.perPage ?? 8)),
  };
  const res = await site.get<OppResponse>("/api/property-opportunities", params, { ttlMs: TTL.search });
  const items = (res.items ?? []).map((it) => {
    const s = it.subject;
    const a = it.analysis;
    const currency = a.currency ?? s.price?.currency ?? "UYU";
    return compact({
      title: s.title,
      type: s.propertyType,
      department: s.department,
      neighborhood: s.neighborhood,
      bedrooms: s.bedrooms,
      bathrooms: s.bathrooms,
      areaM2: s.area?.value,
      price: money(s.price?.amount, s.price?.currency),
      expenses: s.expenses?.amount !== undefined ? money(s.expenses.amount, s.expenses.currency) : undefined,
      comparedPrice: money(s.comparisonPrice, currency),
      comparedAs: a.pricingBasis === "monthly_total" ? "alquiler + gastos comunes" : a.pricingBasis,
      medianOfComparables: money(a.median, currency),
      typicalRange: `${money(a.q25, currency)}–${money(a.q75, currency)}`,
      gapPct: a.gapPct,
      conservativeGapPct: a.conservativeGapPct,
      perM2GapPct: a.perAreaGapPct,
      comparables: a.distinctN,
      advertisers: a.sellersN,
      confidence: a.confidence === "supported" ? "más sólida" : a.confidence === "limited" ? "con limitaciones" : a.confidence,
      evidence: a.evidenceTier === "exploratory" ? "para explorar" : a.evidenceTier === "standard" ? "comparación sustentada" : a.evidenceTier,
      cautions: (it.cautions ?? []).map((c) => CAUTION_LABEL[c] ?? c.replace(/_/g, " ")),
      advertiser: s.sellerName,
      source: SOURCE_LABEL[s.source ?? ""] ?? s.source,
      listingUrl: s.url,
      siteUrl: operation === "rent" && s.propertyKey ? rentalSiteUrl(s.propertyKey) : undefined,
      sampleComparables: (it.comparables ?? []).slice(0, 3).map((c) => compact({ title: c.title, price: money(c.price?.amount, c.price?.currency), url: c.url })),
      lastSeen: s.lastSeen,
    });
  });

  const verb = operation === "rent" ? "alquiler" : "venta";
  const lines = [
    `${fmt(res.total ?? 0)} oportunidades de ${verb} (página ${res.page ?? 1} de ${res.pages ?? 1}), de ${fmt(res.stats?.analyzed ?? 0)} avisos analizados.` +
      (res.stale ? " ⚠ El análisis está desactualizado: verificá cada aviso." : ""),
  ];
  items.forEach((i, n) => {
    lines.push(
      `${n + 1}. ${i.title ?? "(sin título)"} · ${[i.neighborhood, i.department].filter(Boolean).join(", ")} · ${i.bedrooms ?? "?"} dorm${i.areaM2 ? ` ${fmt(i.areaM2)} m²` : ""}` +
        `\n   ${i.comparedPrice} (${i.comparedAs ?? "precio"}) vs mediana ${i.medianOfComparables} de ${i.comparables ?? "?"} comparables de ${i.advertisers ?? "?"} anunciantes` +
        ` → ${pct((i.gapPct ?? 0) / 100)} por debajo (conservador: ${pct((i.conservativeGapPct ?? 0) / 100)}); evidencia ${i.confidence ?? "s/d"}, ${i.evidence ?? ""}` +
        `\n   Cautelas: ${(i.cautions ?? []).join("; ") || "—"}` +
        `\n   ${i.listingUrl ?? ""}${i.siteUrl ? `\n   ficha: ${i.siteUrl}` : ""}`
    );
  });
  if (!items.length) lines.push("No hay oportunidades con esos filtros: probá sin barrio o con otro tipo/dormitorios.");
  lines.push(
    "Una oportunidad es un precio PEDIDO por debajo de avisos parecidos (mismo barrio, tipo, dormitorios y superficie), no una tasación: visitá y verificá estado, gastos y disponibilidad."
  );
  const { page: _p, perPage: _pp, availability: _a, ...pageParams } = params;
  const url = siteUrl("/oportunidades-inmobiliarias-uruguay", pageParams);
  lines.push(`Ver en el sitio: ${url}`);
  return {
    text: lines.join("\n"),
    data: {
      operation,
      total: res.total ?? 0,
      page: res.page ?? 1,
      pages: res.pages ?? 1,
      items,
      excluded: res.stats?.excluded ?? {},
      stale: !!res.stale,
      asOf: res.generatedAt?.slice(0, 10) ?? null,
      siteUrl: url,
    },
  };
}
