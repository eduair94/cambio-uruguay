/** Offline market aggregates. Deliberately independent of app/ and database/network modules. */
export interface RentalZoneMarketObservation {
  propertyKey: string;
  advertId: string;
  source: string;
  department: string;
  neighborhood: string;
  propertyType: "apartamento" | "casa";
  bedrooms: number | null;
  price: number;
  currency: "UYU" | "USD";
  /** The caller must validate these against this advert's own evidence, including explicit zero. */
  commonExpenses: number | null;
  commonExpensesCurrency: "UYU" | "USD" | null;
  /** Built area only, never inferred from land area or another advert. */
  areaBuilt: number | null;
  lastSeen: string;
}

export interface RentalZoneDistribution {
  count: number;
  mean: number | null;
  median: number | null;
  p25: number | null;
  p75: number | null;
}
export interface RentalZonePrices {
  rent: RentalZoneDistribution;
  commonExpenses: RentalZoneDistribution;
  monthlyTotal: RentalZoneDistribution;
  builtSquareMeter: RentalZoneDistribution;
  sources: number;
  lastSeenFrom: string | null;
  lastSeenTo: string | null;
}
export type RentalZoneMarketBedrooms = "any" | "0" | "1" | "2" | "3" | "4plus";
export interface RentalZoneMarketBucket {
  department: string;
  neighborhood: string;
  propertyType: "apartamento" | "casa";
  bedrooms: RentalZoneMarketBedrooms;
  /** All monetary distributions are in UYU, converted with this snapshot's exchange rate. */
  prices: RentalZonePrices;
}

export const RENTAL_ZONE_SAMPLE_MINIMUM = 8;
const STALE_DAYS = 10;
const text = (value: unknown, max = 100): string | null => {
  if (
    typeof value !== "string" ||
    value.length > max ||
    /[\p{Cc}\p{Cf}<>]/u.test(value)
  )
    return null;
  const result = value.normalize("NFC").trim().replace(/\s+/g, " ");
  return result || null;
};
/** Scope is always explicit; accents/case/spacing are the only equivalences. */
export const rentalZoneMarketName = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
const nonnegative = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;
const positive = (value: unknown): value is number =>
  nonnegative(value) && value > 0;
const currency = (value: unknown): value is "UYU" | "USD" =>
  value === "UYU" || value === "USD";
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Validate the lightweight caller projection without inheriting canonical group fields. */
export function normalizeRentalZoneMarketObservation(
  value: RentalZoneMarketObservation,
  now: number,
): RentalZoneMarketObservation | null {
  if (!value || typeof value !== "object" || !Number.isFinite(now)) return null;
  const propertyKey = text(value.propertyKey, 200),
    advertId = text(value.advertId, 200);
  const source = text(value.source, 60),
    department = text(value.department),
    neighborhood = text(value.neighborhood);
  if (
    !propertyKey ||
    !advertId ||
    !source ||
    !department ||
    !neighborhood ||
    !["apartamento", "casa"].includes(value.propertyType) ||
    !positive(value.price) ||
    !currency(value.currency)
  )
    return null;
  const seen =
    typeof value.lastSeen === "string" ? Date.parse(value.lastSeen) : NaN;
  const cutoff = new Date(now - STALE_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);
  if (
    !/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value.lastSeen) ||
    !Number.isFinite(seen) ||
    seen > now ||
    new Date(seen).toISOString().slice(0, 10) !== value.lastSeen.slice(0, 10) ||
    value.lastSeen.slice(0, 10) < cutoff
  )
    return null;
  // Invalid/missing attributes remain unknown; they cannot populate a specific cohort or denominator.
  const bedrooms =
    nonnegative(value.bedrooms) &&
    Number.isInteger(value.bedrooms) &&
    value.bedrooms <= 20
      ? value.bedrooms
      : null;
  const commonExpenses =
    nonnegative(value.commonExpenses) && currency(value.commonExpensesCurrency)
      ? value.commonExpenses
      : null;
  return {
    propertyKey,
    advertId,
    source,
    department,
    neighborhood,
    propertyType: value.propertyType,
    bedrooms,
    price: value.price,
    currency: value.currency,
    commonExpenses,
    commonExpensesCurrency:
      commonExpenses === null ? null : value.commonExpensesCurrency,
    areaBuilt:
      positive(value.areaBuilt) && value.areaBuilt <= 100_000
        ? value.areaBuilt
        : null,
    lastSeen: new Date(seen).toISOString(),
  };
}

const round = (value: number) =>
  value < Number.MAX_VALUE / 100 ? Math.round(value * 100) / 100 : value;
function distribution(values: number[]): RentalZoneDistribution {
  const sorted = values.filter(nonnegative).sort((a, b) => a - b);
  if (sorted.length < RENTAL_ZONE_SAMPLE_MINIMUM)
    return {
      count: sorted.length,
      mean: null,
      median: null,
      p25: null,
      p75: null,
    };
  const quantile = (p: number) => {
    const index = (sorted.length - 1) * p,
      lower = Math.floor(index);
    return round(
      sorted[lower] +
        (sorted[Math.ceil(index)] - sorted[lower]) * (index - lower),
    );
  };
  // Divide each term first so a finite sample cannot overflow merely through summation.
  return {
    count: sorted.length,
    mean: round(sorted.reduce((sum, value) => sum + value / sorted.length, 0)),
    median: quantile(0.5),
    p25: quantile(0.25),
    p75: quantile(0.75),
  };
}

/**
 * One representative per property, selected by recency and stable advert identity, never price.
 * Duplicate source adverts cannot multiply the sample. Selection precedes every cohort; no
 * median-of-medians, inferred identity matching, output cap, or coordinate-based neighborhood.
 */
export function buildRentalZoneMarket(
  observations: Iterable<RentalZoneMarketObservation>,
  options: { usdUyu: number; now: number },
): {
  sampleMinimum: number;
  observations: number;
  buckets: RentalZoneMarketBucket[];
} {
  if (!positive(options.usdUyu) || !Number.isFinite(options.now))
    throw new Error("Invalid rental zone market context");
  const normalized: RentalZoneMarketObservation[] = [];
  for (const raw of observations) {
    const row = normalizeRentalZoneMarketObservation(raw, options.now);
    if (
      row &&
      positive(row.price * (row.currency === "USD" ? options.usdUyu : 1))
    )
      normalized.push(row);
  }
  normalized.sort(
    (a, b) =>
      compare(b.lastSeen, a.lastSeen) ||
      compare(a.advertId, b.advertId) ||
      compare(a.source, b.source) ||
      compare(a.propertyKey, b.propertyKey) ||
      compare(JSON.stringify(a), JSON.stringify(b)),
  );
  // Native advert identity can expose duplicate property keys. Resolve those exact links
  // transitively before representative selection; no text/price/address matching is involved.
  const parents = new Map<string, string>(),
    adverts = new Map<string, string>();
  const root = (key: string): string => {
    let current = key;
    while (parents.has(current)) current = parents.get(current)!;
    while (parents.has(key)) {
      const next = parents.get(key)!;
      parents.set(key, current);
      key = next;
    }
    return current;
  };
  for (const row of normalized) {
    const advert = JSON.stringify([row.source, row.advertId]);
    const previous = adverts.get(advert);
    if (previous) {
      const a = root(previous),
        b = root(row.propertyKey);
      if (a !== b) parents.set(b, a);
    } else adverts.set(advert, row.propertyKey);
  }
  const properties = new Set<string>();
  const groups = new Map<
    string,
    {
      row: RentalZoneMarketObservation;
      bedrooms: RentalZoneMarketBedrooms;
      values: RentalZoneMarketObservation[];
    }
  >();
  let count = 0;
  for (const row of normalized) {
    const property = root(row.propertyKey);
    if (properties.has(property)) continue;
    properties.add(property);
    count++;
    const bedrooms: RentalZoneMarketBedrooms[] = ["any"];
    if (row.bedrooms !== null)
      bedrooms.push(
        row.bedrooms >= 4
          ? "4plus"
          : (String(row.bedrooms) as RentalZoneMarketBedrooms),
      );
    for (const bedroom of bedrooms) {
      const key = JSON.stringify([
        rentalZoneMarketName(row.department),
        rentalZoneMarketName(row.neighborhood),
        row.propertyType,
        bedroom,
      ]);
      const existing = groups.get(key);
      if (existing) existing.values.push(row);
      else groups.set(key, { row, bedrooms: bedroom, values: [row] });
    }
  }
  const uyu = (amount: number, unit: "UYU" | "USD") =>
    amount * (unit === "USD" ? options.usdUyu : 1);
  const buckets = [...groups.entries()]
    .sort(([a], [b]) => compare(a, b))
    .map(([, group]): RentalZoneMarketBucket => {
      const rent: number[] = [],
        expenses: number[] = [],
        monthly: number[] = [],
        built: number[] = [];
      for (const row of group.values) {
        const price = uyu(row.price, row.currency);
        if (!positive(price)) continue;
        rent.push(price);
        if (row.areaBuilt !== null) {
          const squareMeter = price / row.areaBuilt;
          if (Number.isFinite(squareMeter)) built.push(squareMeter);
        }
        if (row.commonExpenses !== null && row.commonExpensesCurrency) {
          const cost = uyu(row.commonExpenses, row.commonExpensesCurrency);
          if (nonnegative(cost)) {
            expenses.push(cost);
            if (Number.isFinite(price + cost)) monthly.push(price + cost);
          }
        }
      }
      const dates = group.values.map((row) => row.lastSeen).sort();
      return {
        department: group.row.department,
        neighborhood: group.row.neighborhood,
        propertyType: group.row.propertyType,
        bedrooms: group.bedrooms,
        prices: {
          rent: distribution(rent),
          commonExpenses: distribution(expenses),
          monthlyTotal: distribution(monthly),
          builtSquareMeter: distribution(built),
          sources: new Set(group.values.map((row) => row.source)).size,
          lastSeenFrom: dates[0] ?? null,
          lastSeenTo: dates[dates.length - 1] ?? null,
        },
      };
    });
  return {
    sampleMinimum: RENTAL_ZONE_SAMPLE_MINIMUM,
    observations: count,
    buckets,
  };
}
