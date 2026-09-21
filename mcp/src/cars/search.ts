// search_used_cars: the used-car directory (10 sources) with every filter the site
// offers. Brand and model accept plain names; they are resolved to site slugs.

import { fmt, fold, siteUrl, slugify, type QueryValue } from "../format.js";
import type { ToolOutput } from "../output.js";
import { TTL, type SiteApi } from "../site.js";
import { carLine, compactCar, type RawCar } from "./compact.js";

export interface CarSearchInput {
  text?: string;
  brand?: string;
  model?: string;
  yearMin?: number;
  yearMax?: number;
  kmMax?: number;
  priceMinUsd?: number;
  priceMaxUsd?: number;
  maxLitersPer100Km?: number;
  fuel?: string;
  transmission?: "manual" | "automatica";
  body?: string;
  doors?: number;
  color?: string;
  department?: string;
  seller?: "dealer" | "private";
  source?: string;
  priceDrop?: boolean;
  onlyOpportunities?: boolean;
  noDeclaredRisk?: boolean;
  sinceDays?: number;
  sort?: string;
  page?: number;
  limit?: number;
}

interface Facet {
  slug: string;
  name: string;
  count: number;
}

interface CarsResponse {
  generatedAt?: string;
  usdUyu?: number;
  total?: number;
  page?: number;
  perPage?: number;
  items?: RawCar[];
  facets?: { brands?: Facet[]; models?: Facet[]; bodies?: Facet[] };
}

/** Plain brand/model names → the slugs the site filters by (model = "brand-model"). */
export async function resolveCarModel(site: SiteApi, brand?: string, model?: string) {
  const brandSlug = brand ? slugify(brand) : undefined;
  if (!model) return { brand: brandSlug, model: undefined };
  const modelSlug = slugify(model);
  if (brandSlug && modelSlug.startsWith(`${brandSlug}-`)) return { brand: brandSlug, model: modelSlug };
  if (!brandSlug) return { brand: undefined, model: modelSlug };
  const res = await site.get<CarsResponse>("/api/cars", { brand: brandSlug }, { ttlMs: TTL.catalog });
  const models = res.facets?.models ?? [];
  const wanted = fold(model);
  const hit =
    models.find((m) => fold(m.name) === wanted) ??
    models.find((m) => m.slug === `${brandSlug}-${modelSlug}`) ??
    models.find((m) => fold(m.name).startsWith(wanted));
  return { brand: brandSlug, model: hit?.slug ?? `${brandSlug}-${modelSlug}` };
}

export function carSearchParams(input: CarSearchInput, slugs: { brand?: string; model?: string }): Record<string, QueryValue> {
  return {
    q: input.text,
    brand: slugs.brand,
    model: slugs.model,
    yearMin: input.yearMin,
    yearMax: input.yearMax,
    kmMax: input.kmMax,
    l100Max: input.maxLitersPer100Km,
    priceMin: input.priceMinUsd,
    priceMax: input.priceMaxUsd,
    fuel: input.fuel,
    transmission: input.transmission,
    body: input.body,
    doors: input.doors,
    color: input.color,
    department: input.department,
    seller: input.seller,
    source: input.source,
    priceDrop: input.priceDrop,
    opportunity: input.onlyOpportunities,
    noRisk: input.noDeclaredRisk,
    sinceDays: input.sinceDays,
    sort: input.sort && input.sort !== "recent" ? input.sort : undefined,
    page: input.page && input.page > 1 ? input.page : undefined,
  };
}

const SORT_LABEL: Record<string, string> = {
  recent: "más recientes",
  price_asc: "más baratos",
  price_desc: "más caros",
  km_asc: "menos kilómetros",
  year_desc: "más nuevos",
  consumption_asc: "menor consumo",
};

export async function searchUsedCars(site: SiteApi, input: CarSearchInput): Promise<ToolOutput> {
  const slugs = await resolveCarModel(site, input.brand, input.model);
  const params = carSearchParams(input, slugs);
  const res = await site.get<CarsResponse>("/api/cars", params, { ttlMs: TTL.search });
  const limit = Math.max(1, Math.min(24, input.limit ?? 10));
  const items = (res.items ?? []).slice(0, limit).map(compactCar);
  const url = siteUrl("/autos-usados-uruguay", params);
  const lines = [
    `${fmt(res.total ?? 0)} autos coinciden (orden: ${SORT_LABEL[input.sort ?? "recent"] ?? input.sort}).`,
    ...items.map((c, n) => `${n + 1}. ${carLine(c)}`),
  ];
  if (!items.length) lines.push("Sin resultados: probá sin versión, con más años o más presupuesto.");
  const brands = (res.facets?.brands ?? []).slice(0, 10);
  const models = (res.facets?.models ?? []).slice(0, 10);
  if (models.length) lines.push(`Modelos con más avisos: ${models.map((m) => `${m.name} (${fmt(m.count)})`).join(", ")}.`);
  else if (brands.length && !slugs.brand) lines.push(`Marcas con más avisos: ${brands.map((m) => `${m.name} (${fmt(m.count)})`).join(", ")}.`);
  lines.push(`Ver en el sitio: ${url}`);
  lines.push("Precios en dólares. Si la moneda fue deducida (el aviso no la decía), confirmala con el vendedor.");
  return {
    text: lines.join("\n"),
    data: {
      total: res.total ?? 0,
      page: res.page ?? 1,
      items,
      resolved: slugs,
      topModels: models,
      asOf: res.generatedAt?.slice(0, 10) ?? null,
      siteUrl: url,
    },
  };
}
