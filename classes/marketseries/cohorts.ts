// Qué cohortes ("productos") alimenta un aviso. La moneda es parte de la clave: un alquiler en
// dólares de Punta del Este es otra serie, nunca se convierte (convertir movería la serie con el
// dólar, no con el precio). El patrón de clave tiene espejo en app/utils/marketSeries.ts.
import type {
  MarketBedrooms,
  MarketCohort,
  MarketCohortDims,
  MarketCohortLabels,
  MarketObservation,
  MarketTypeBucket,
} from "./types";

/** Accents, case and spacing are the only equivalences (the rule of propertyzones/market.ts). */
export const marketSlug = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");

export function bedroomBucket(value: number | null): Exclude<MarketBedrooms, "any"> | null {
  if (value === null || !Number.isInteger(value) || value < 0 || value > 20) return null;
  return value >= 4 ? "4plus" : (String(value) as "0" | "1" | "2" | "3");
}

export const MARKET_SERIES_KEY_PATTERN =
  /^(?:(?:alquiler|venta)\|(?:UYU|USD)\|(?:apartamento|casa|todas)\|(?:any|0|1|2|3|4plus)\|(?:uy|d:[a-z0-9-]{1,80}|b:[a-z0-9-]{1,80}:[a-z0-9-]{1,80})|autos\|USD\|(?:all|m:[a-z0-9-]{1,80}(?:\|y:\d{4})?))$/;

const EMPTY = { propertyType: null, bedrooms: null, departmentSlug: null, neighborhoodSlug: null, marketSlug: null, year: null };

type ScopePart = Pick<MarketCohortDims, "scope" | "departmentSlug" | "neighborhoodSlug"> & { token: string };

export function housingCohorts(obs: MarketObservation): MarketCohort[] {
  if (obs.vertical === "autos" || !obs.propertyType || !obs.department) return [];
  const department = marketSlug(obs.department);
  if (!department) return [];
  const neighborhood = obs.neighborhood ? marketSlug(obs.neighborhood) : "";
  const scopes: ScopePart[] = [
    { scope: "uy", token: "uy", departmentSlug: null, neighborhoodSlug: null },
    { scope: "department", token: `d:${department}`, departmentSlug: department, neighborhoodSlug: null },
  ];
  if (neighborhood)
    scopes.push({ scope: "neighborhood", token: `b:${department}:${neighborhood}`, departmentSlug: department, neighborhoodSlug: neighborhood });
  const types: MarketTypeBucket[] = [obs.propertyType, "todas"];
  const bucket = bedroomBucket(obs.bedrooms);
  const beds: MarketBedrooms[] = bucket ? ["any", bucket] : ["any"];
  const cohorts: MarketCohort[] = [];
  for (const { token, ...scope } of scopes)
    for (const propertyType of types)
      for (const bedrooms of beds)
        cohorts.push({
          key: `${obs.vertical}|${obs.currency}|${propertyType}|${bedrooms}|${token}`,
          dims: { ...EMPTY, vertical: obs.vertical, currency: obs.currency, ...scope, propertyType, bedrooms },
        });
  return cohorts;
}

export function carCohorts(obs: MarketObservation): MarketCohort[] {
  if (obs.vertical !== "autos" || obs.currency !== "USD" || !obs.marketSlug) return [];
  const base = { ...EMPTY, vertical: "autos" as const, currency: "USD" as const };
  const cohorts: MarketCohort[] = [
    { key: "autos|USD|all", dims: { ...base, scope: "all" } },
    { key: `autos|USD|m:${obs.marketSlug}`, dims: { ...base, scope: "model", marketSlug: obs.marketSlug } },
  ];
  if (obs.year !== null)
    cohorts.push({
      key: `autos|USD|m:${obs.marketSlug}|y:${obs.year}`,
      dims: { ...base, scope: "year", marketSlug: obs.marketSlug, year: obs.year },
    });
  return cohorts;
}

export const cohortsOf = (obs: MarketObservation): MarketCohort[] =>
  obs.vertical === "autos" ? carCohorts(obs) : housingCohorts(obs);

export function cohortLabel(dims: MarketCohortDims, labels: MarketCohortLabels): string {
  if (dims.vertical === "autos") {
    if (dims.scope === "all") return "Todos los autos";
    const name = [labels.brand, labels.model].filter(Boolean).join(" ") || dims.marketSlug || "";
    return dims.scope === "year" && dims.year ? `${name} ${dims.year}` : name;
  }
  if (dims.scope === "neighborhood")
    return `${labels.neighborhood ?? dims.neighborhoodSlug}, ${labels.department ?? dims.departmentSlug}`;
  if (dims.scope === "department") return labels.department ?? dims.departmentSlug ?? "";
  return "Uruguay";
}
