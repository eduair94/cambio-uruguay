// Car tools beyond the directory: opportunities against a fixed cohort, one advert
// in detail, a model by year and version, declared risks, and the market report.

import { compact, fmt, fold, money, pct, siteUrl, slugify, type QueryValue } from "../format.js";
import { UserInputError, type ToolOutput } from "../output.js";
import { TTL, type SiteApi } from "../site.js";
import { carLine, compactCar, RISK_LABEL, type RawCar } from "./compact.js";
import { resolveCarModel } from "./search.js";

export interface CarSubjectFilters {
  priceMaxUsd?: number;
  yearMin?: number;
  kmMax?: number;
  fuel?: string;
  transmission?: "manual" | "automatica";
  body?: string;
  maxLitersPer100Km?: number;
  department?: string;
  seller?: "dealer" | "private";
}

const subjectParams = (f: CarSubjectFilters): Record<string, QueryValue> => ({
  priceMax: f.priceMaxUsd,
  yearMin: f.yearMin,
  kmMax: f.kmMax,
  fuel: f.fuel,
  transmission: f.transmission,
  body: f.body,
  l100Max: f.maxLitersPer100Km,
  department: f.department,
  seller: f.seller,
});

interface Sample {
  n?: number;
  sellers?: number;
  p25?: number;
  median?: number;
  p75?: number;
  kmMedian?: number;
}

interface OpportunityItem {
  subject: RawCar;
  tier?: string;
  gap?: number;
  conservativeGap?: number;
  sample?: Sample;
  comparables?: Array<{ title?: string; year?: number; km?: number; priceUsd?: number; permalink?: string; sellerType?: string }>;
}

interface OpportunitiesResponse {
  generatedAt?: string;
  total?: number;
  page?: number;
  items?: OpportunityItem[];
  policy?: { strict?: { minimumComparables?: number; minimumGap?: number }; exploratory?: { minimumComparables?: number; minimumGap?: number } };
}

export interface CarOpportunityInput extends CarSubjectFilters {
  tier?: "strict" | "exploratory";
  brand?: string;
  sort?: "gap" | "price_asc" | "year_desc" | "km_asc" | "consumption_asc";
  page?: number;
  limit?: number;
}

export async function findCarOpportunities(site: SiteApi, input: CarOpportunityInput): Promise<ToolOutput> {
  const params: Record<string, QueryValue> = {
    tier: input.tier,
    brand: input.brand ? slugify(input.brand) : undefined,
    ...subjectParams(input),
    sort: input.sort && input.sort !== "gap" ? input.sort : undefined,
    page: input.page && input.page > 1 ? input.page : undefined,
  };
  const res = await site.get<OpportunitiesResponse>("/api/car-opportunities", params, { ttlMs: TTL.search });
  const limit = Math.max(1, Math.min(20, input.limit ?? 8));
  const items = (res.items ?? []).slice(0, limit).map((it) =>
    compact({
      car: compactCar(it.subject),
      tier: it.tier === "strict" ? "sólida" : "para explorar",
      gapPct: it.gap !== undefined ? Math.round(it.gap * 100) : undefined,
      conservativeGapPct: it.conservativeGap !== undefined ? Math.round(it.conservativeGap * 100) : undefined,
      cohort: it.sample,
      comparables: (it.comparables ?? []).slice(0, 4).map((c) => compact({ title: c.title, year: c.year, km: c.km, priceUsd: c.priceUsd, url: c.permalink })),
    })
  );
  const url = siteUrl("/oportunidades-autos-usados-uruguay", params);
  const lines = [`${fmt(res.total ?? 0)} autos pedidos por debajo de su cohorte (mismo modelo, año, versión, motor y caja, km comparable).`];
  items.forEach((i, n) => {
    const s = i.cohort as Sample | undefined;
    lines.push(
      `${n + 1}. ${carLine(i.car)}` +
        `\n   ${i.gapPct} % bajo la mediana ${money(s?.median, "USD")} de ${s?.n ?? "?"} autos de ${s?.sellers ?? "?"} vendedores (rango ${money(s?.p25, "USD")}–${money(s?.p75, "USD")}); conservador ${i.conservativeGapPct ?? "?"} %; evidencia ${i.tier}`
    );
  });
  if (!items.length) lines.push("No hay oportunidades con esos filtros.");
  lines.push("Es un precio pedido por debajo de autos iguales, no una tasación: revisá historial, papeles y deuda antes de señar.");
  lines.push(`Ver en el sitio: ${url}`);
  return {
    text: lines.join("\n"),
    data: { total: res.total ?? 0, items, policy: res.policy ?? null, asOf: res.generatedAt?.slice(0, 10) ?? null, siteUrl: url },
  };
}

interface FichaResponse {
  car: RawCar;
  cohort?: Sample & { year?: number; trim?: string; engine?: string; transmission?: string };
  market?: { slug?: string; listings?: number };
  similar?: RawCar[];
}

export async function getCar(site: SiteApi, input: { key: string }): Promise<ToolOutput> {
  const key = input.key.trim().replace(/^https?:[/][/][^/]+[/]autos-usados-uruguay[/]/, "").split(/[?#]/)[0]!;
  const res = await site.get<FichaResponse>(`/api/cars/ficha/${encodeURIComponent(key)}`, undefined, { ttlMs: TTL.search });
  const car = compactCar(res.car);
  const cohort = res.cohort;
  const similar = (res.similar ?? []).slice(0, 5).map(compactCar);
  const lines = [carLine(car)];
  if (cohort?.median && car.priceUsd) {
    const diff = (car.priceUsd - cohort.median) / cohort.median;
    lines.push(
      `Cohorte (${[cohort.year, res.car.brand, res.car.model, cohort.trim, cohort.engine, cohort.transmission].filter(Boolean).join(" ")}): ` +
        `mediana ${money(cohort.median, "USD")} (rango ${money(cohort.p25, "USD")}–${money(cohort.p75, "USD")}, n=${cohort.n}, km mediano ${fmt(cohort.kmMedian ?? 0)}). ` +
        `Este auto está ${pct(Math.abs(diff))} ${diff < 0 ? "por debajo" : "por encima"}.`
    );
  } else lines.push("No hay suficientes autos iguales para comparar este precio.");
  if (car.declaredRisks?.length)
    lines.push(...car.declaredRisks.map((r) => `El vendedor declara ${r.what}: "${r.quote ?? ""}"`));
  if (similar.length) lines.push("Parecidos:", ...similar.map((c, n) => `${n + 1}. ${carLine(c)}`));
  if (res.market?.slug) lines.push(`Precios del modelo por año y versión: ${siteUrl(`/autos-usados-uruguay/precios/${res.market.slug}`)}`);
  return { text: lines.join("\n"), data: { car, cohort: cohort ?? null, similar, modelSlug: res.market?.slug ?? null } };
}

interface MarketResponse {
  market?: {
    slug?: string;
    brand?: string;
    model?: string;
    listings?: number;
    years?: Array<Sample & { year?: number }>;
    rows?: Array<Sample & { year?: number; trim?: string | null; engine?: string | null; transmission?: string | null }>;
    guide?: Array<{ year?: number; averageUsd?: number; versions?: Array<{ name?: string; priceUsd?: number }> }>;
  };
  listings?: RawCar[];
  opportunities?: OpportunityItem[];
}

export async function carModelPrices(site: SiteApi, input: { brand: string; model: string; year?: number }): Promise<ToolOutput> {
  const { model } = await resolveCarModel(site, input.brand, input.model);
  if (!model) throw new UserInputError("Indicá marca y modelo, por ejemplo brand=Chevrolet model=Onix.");
  const res = await site.get<MarketResponse>(`/api/cars/market/${encodeURIComponent(model)}`, undefined, { ttlMs: TTL.catalog });
  const m = res.market ?? {};
  const years = (m.years ?? []).filter((y) => !input.year || y.year === input.year);
  const rows = (m.rows ?? []).filter((r) => !input.year || r.year === input.year).slice(0, 15);
  const guide = (m.guide ?? []).filter((g) => !input.year || g.year === input.year).slice(0, 6);
  const cheapest = (res.listings ?? [])
    .filter((l) => !input.year || l.year === input.year)
    .sort((a, b) => (a.priceUsd ?? 0) - (b.priceUsd ?? 0))
    .slice(0, 6)
    .map(compactCar);
  const opportunities = (res.opportunities ?? []).slice(0, 5).map((o) => ({ car: compactCar(o.subject), gapPct: Math.round((o.gap ?? 0) * 100) }));
  const lines = [`${m.brand ?? input.brand} ${m.model ?? input.model}: ${fmt(m.listings ?? 0)} avisos vigentes.`];
  if (years.length)
    lines.push("Por año (mediana, rango, n): " + years.map((y) => `${y.year} ${money(y.median, "USD")} (${money(y.p25, "USD")}–${money(y.p75, "USD")}, n=${y.n})`).join(" · "));
  if (rows.length)
    lines.push("Por versión: " + rows.map((r) => `${r.year} ${[r.trim, r.engine, r.transmission].filter(Boolean).join(" ")} ${money(r.median, "USD")} (n=${r.n})`).join(" · "));
  if (guide.length)
    lines.push("Guía de precios de Mercado Libre: " + guide.map((g) => `${g.year} ${money(g.averageUsd, "USD")}`).join(" · ") + " (es la mediana de los mismos avisos de ML, no una fuente independiente).");
  if (opportunities.length) lines.push("Oportunidades del modelo:", ...opportunities.map((o, n) => `${n + 1}. ${o.gapPct} % bajo su cohorte — ${carLine(o.car)}`));
  if (cheapest.length) lines.push(`Más baratos${input.year ? ` del ${input.year}` : ""}:`, ...cheapest.map((c, n) => `${n + 1}. ${carLine(c)}`));
  const url = siteUrl(`/autos-usados-uruguay/precios/${model}`);
  lines.push(`Ver en el sitio: ${url}`);
  return {
    text: lines.join("\n"),
    data: { model: compact({ slug: m.slug ?? model, brand: m.brand, model: m.model, listings: m.listings }), years, versions: rows, guide, opportunities, cheapest, siteUrl: url },
  };
}

export const CAR_RISK_CATEGORIES = ["deuda", "papeles", "siniestro", "recupero", "mecanica", "chapa_extranjera", "uso_intensivo"] as const;

interface RisksResponse {
  generatedAt?: string;
  stats?: { declared?: number; measured?: number };
  categories?: Array<{ category: string; adverts?: number; measured?: number; medianGap?: number | null }>;
  total?: number;
  items?: Array<{ subject: RawCar; risks?: Array<{ category?: string; severity?: string; quote?: string }>; severity?: string; gap?: number | null; median?: number | null; n?: number }>;
}

export interface CarRiskInput extends CarSubjectFilters {
  category?: (typeof CAR_RISK_CATEGORIES)[number];
  brand?: string;
  onlyMeasured?: boolean;
  page?: number;
  limit?: number;
}

export async function carDeclaredRisks(site: SiteApi, input: CarRiskInput): Promise<ToolOutput> {
  const params: Record<string, QueryValue> = {
    category: input.category,
    brand: input.brand ? slugify(input.brand) : undefined,
    ...subjectParams(input),
    measured: input.onlyMeasured,
    page: input.page && input.page > 1 ? input.page : undefined,
  };
  const res = await site.get<RisksResponse>("/api/car-risks", params, { ttlMs: TTL.search });
  const categories = (res.categories ?? []).map((c) =>
    compact({
      what: RISK_LABEL[c.category] ?? c.category,
      adverts: c.adverts,
      measured: c.measured,
      medianDiscountPct: typeof c.medianGap === "number" ? Math.round(c.medianGap * 100) : undefined,
    })
  );
  const items = (res.items ?? []).slice(0, Math.max(1, Math.min(20, input.limit ?? 8))).map((it) =>
    compact({
      car: compactCar(it.subject),
      severity: it.severity,
      quotes: (it.risks ?? []).map((r) => `${RISK_LABEL[r.category ?? ""] ?? r.category}: "${r.quote ?? ""}"`),
      asksLessPct: typeof it.gap === "number" ? Math.round(it.gap * 100) : undefined,
      cleanCohortMedianUsd: it.median ?? undefined,
    })
  );
  const lines = [
    `${fmt(res.stats?.declared ?? 0)} avisos declaran algún riesgo. Por categoría: ` +
      categories.map((c) => `${c.what} ${fmt(c.adverts ?? 0)}${c.medianDiscountPct !== undefined ? ` (piden en mediana ${Math.abs(c.medianDiscountPct)} % ${c.medianDiscountPct >= 0 ? "menos" : "más"} que los mismos autos sin declarar)` : ""}`).join(" · "),
  ];
  items.forEach((i, n) => {
    lines.push(
      `${n + 1}. ${carLine(i.car)}\n   Severidad ${i.severity ?? "s/d"}${i.asksLessPct !== undefined ? ` · pide ${i.asksLessPct} % menos que la cohorte limpia (${money(i.cleanCohortMedianUsd, "USD")})` : ""}\n   ${(i.quotes ?? []).join(" | ")}`
    );
  });
  lines.push("Lo publicado es lo que el VENDEDOR declara (con su frase). Que un aviso no declare nada no prueba que no tenga deuda ni choques: consultá la deuda de patente en SUCIVE y pedí un informe del Registro de la Propiedad Mueble (automotores) por embargos o prendas.");
  const url = siteUrl("/autos-chocados-y-con-deuda-uruguay", params);
  lines.push(`Ver en el sitio: ${url}`);
  return { text: lines.join("\n"), data: { total: res.total ?? 0, categories, items, asOf: res.generatedAt?.slice(0, 10) ?? null, siteUrl: url } };
}

interface Band3 {
  p25?: number;
  median?: number;
  p75?: number;
}

interface ReportResponse {
  generatedAt?: string;
  data?: {
    market?: { adverts?: number; brands?: number; models?: number; price?: Band3; year?: Band3; km?: Band3; sellers?: Record<string, number>; priceBands?: Array<{ from: number; to: number | null; adverts: number }> };
    models?: Array<{ marketSlug?: string; brand?: string; model?: string; adverts?: number; price?: Band3; medianYear?: number; medianKm?: number; annualDrop?: number; dealerShare?: number; automaticShare?: number }>;
    depreciation?: Array<{ marketSlug?: string; brand?: string; model?: string; annualDrop?: number; points?: Array<{ year: number; adverts: number; medianUsd: number }> }>;
    budgets?: Array<{ maxUsd: number; adverts?: number; models?: Array<{ marketSlug?: string; brand?: string; model?: string; adverts?: number; medianUsd?: number; medianYear?: number; medianKm?: number }> }>;
    sellerGaps?: { median?: number; models?: Array<{ brand?: string; model?: string; gap?: number; dealerMedian?: number; privateMedian?: number }> };
    negotiation?: { windowDays?: number; changed?: number; cut?: number; raised?: number; medianCut?: number; shareOfMarket?: number };
    rotation?: { measurable?: boolean; note?: string; medianDays?: number | null };
    valuation?: Record<string, { value?: number; cohorts?: number } | unknown>;
  };
}

export type ReportSection = "overview" | "budgets" | "depreciation" | "negotiation" | "seller_gaps" | "valuation" | "rotation";

export async function carMarketReport(
  site: SiteApi,
  input: { section?: ReportSection; budgetUsd?: number; model?: string }
): Promise<ToolOutput> {
  const res = await site.get<ReportResponse>("/api/car-report", undefined, { ttlMs: TTL.catalog });
  const d = res.data ?? {};
  const section = input.section ?? (input.budgetUsd ? "budgets" : input.model ? "depreciation" : "overview");
  const lines: string[] = [];
  let data: Record<string, unknown> = {};
  if (section === "overview") {
    const m = d.market ?? {};
    lines.push(
      `Mercado de usados: ${fmt(m.adverts ?? 0)} avisos, ${fmt(m.brands ?? 0)} marcas, ${fmt(m.models ?? 0)} modelos.`,
      `Precio mediano ${money(m.price?.median, "USD")} (mitad central ${money(m.price?.p25, "USD")}–${money(m.price?.p75, "USD")}); año mediano ${m.year?.median ?? "s/d"}; ${fmt(m.km?.median ?? 0)} km medianos.`,
      `Automotoras ${fmt(m.sellers?.dealer ?? 0)} · particulares ${fmt(m.sellers?.private ?? 0)}.`,
      "Modelos con más oferta: " + (d.models ?? []).slice(0, 10).map((x) => `${x.brand} ${x.model} (${fmt(x.adverts ?? 0)}, mediana ${money(x.price?.median, "USD")})`).join(" · ")
    );
    data = { market: m, topModels: (d.models ?? []).slice(0, 20) };
  } else if (section === "budgets") {
    const bands = d.budgets ?? [];
    const pick = input.budgetUsd ? bands.find((b) => b.maxUsd >= input.budgetUsd!) ?? bands[bands.length - 1] : undefined;
    for (const b of pick ? [pick] : bands) {
      lines.push(
        `Hasta ${money(b.maxUsd, "USD")} (${fmt(b.adverts ?? 0)} avisos): ` +
          (b.models ?? []).slice(0, 8).map((x) => `${x.brand} ${x.model} ~${money(x.medianUsd, "USD")} (${x.medianYear}, ${fmt(x.medianKm ?? 0)} km)`).join(" · ")
      );
    }
    data = { budgets: pick ? [pick] : bands };
  } else if (section === "depreciation") {
    const rows = d.depreciation ?? [];
    const wanted = input.model ? fold(input.model) : "";
    const exact = rows.filter((r) => fold(r.model ?? "") === wanted || fold(`${r.brand} ${r.model}`) === wanted);
    const hits = !wanted ? rows : exact.length ? exact : rows.filter((r) => fold(`${r.brand} ${r.model}`).includes(wanted));
    if (!hits.length && wanted) lines.push(`Sin serie de depreciación para "${input.model}" (hace falta oferta en varios años).`);
    for (const r of hits.slice(0, wanted ? 3 : 15))
      lines.push(`${r.brand} ${r.model}: pierde ~${pct(r.annualDrop)} por año` + (r.points?.length ? ` (${r.points.map((p) => `${p.year} ${money(p.medianUsd, "USD")}`).join(", ")})` : ""));
    data = { depreciation: hits.slice(0, 15) };
  } else if (section === "negotiation") {
    const n = d.negotiation ?? {};
    lines.push(
      `En ${n.windowDays ?? 7} días cambiaron de precio ${fmt(n.changed ?? 0)} avisos (${pct(n.shareOfMarket)} del mercado): ${fmt(n.cut ?? 0)} bajaron y ${fmt(n.raised ?? 0)} subieron. La rebaja mediana fue ${pct(n.medianCut, 1)}.`
    );
    data = { negotiation: n };
  } else if (section === "seller_gaps") {
    const g = d.sellerGaps ?? {};
    lines.push(`Las automotoras piden en mediana ${pct(g.median, 1)} más que los particulares por el mismo auto.`);
    lines.push(...(g.models ?? []).slice(0, 10).map((x) => `${x.brand} ${x.model}: automotora ${money(x.dealerMedian, "USD")} vs particular ${money(x.privateMedian, "USD")} (${pct(x.gap)})`));
    data = { sellerGaps: g };
  } else if (section === "valuation") {
    const v = (d.valuation ?? {}) as Record<string, { value?: number }>;
    lines.push(
      `Cada 10.000 km de más restan ~${pct(v.km?.value, 1)} del precio; la automática se pide ~${pct(v.automatic?.value, 1)} más que la manual de la misma versión (~${pct(v.automaticWithTrim?.value, 1)} sin fijar versión: el resto es equipamiento). (El diésel se pide más caro, pero no por el combustible: en los modelos que vienen con los dos, el diésel suele ser la 4x4 o la cabina doble.)`
    );
    data = { valuation: { km: v.km, automatic: v.automatic, automaticWithTrim: v.automaticWithTrim } };
  } else {
    const r = d.rotation ?? {};
    lines.push(r.measurable ? `Un aviso tarda en mediana ${r.medianDays} días en irse.` : `La rotación todavía no se publica: ${r.note ?? "falta historia"}.`);
    data = { rotation: r };
  }
  lines.push(`Mide oferta publicada (precios pedidos), no ventas. Informe completo: ${siteUrl("/mercado-de-autos-usados-uruguay")}`);
  return { text: lines.join("\n"), data: { section, ...data, asOf: res.generatedAt?.slice(0, 10) ?? null } };
}
