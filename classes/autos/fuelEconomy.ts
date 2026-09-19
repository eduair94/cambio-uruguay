// Fuel economy (km per litre): what the advert states, and, when it states nothing, what the adverts
// of the same model and engine state.
//
// No portal gives it as a field: Mercado Libre's "Rendimiento y dimensiones" table carries power,
// tank and size, never consumption. It lives in the description, mostly in dealer templates
// ("Consumo medio en ruta: 19 km/l. Consumo medio en ciudad: 17 km/l.") and in a dozen private
// spellings ("16km Por litro", "En ciudad 11km x lt / En Ruta 14km x lt", "6,5 l/100 km").
import { fold } from "./normalize";
import type { CarListing } from "./types";

export interface FuelEconomyReading {
  /** Km per litre in town, on the road, or as a single combined figure, as the advert states them. */
  city: number | null;
  highway: number | null;
  combined: number | null;
  /** The one figure to compare cars by: combined, else the mean of city and road, else the one stated. */
  kmPerLiter: number;
}

export interface CarFuelEconomy extends FuelEconomyReading {
  /** "advert": this advert states it. "model_engine"/"model": the median of what other sellers of the
   *  same model (and engine) state, one figure per seller. "engine_class": no seller of this model
   *  states it, so the median of every car with the same fuel and displacement — a coarse figure. */
  basis: "advert" | "model_engine" | "model" | "engine_class";
  /** Distinct sellers behind an inferred figure; null when the advert states it. */
  sellers: number | null;
}

// No car on sale in Uruguay does under 5 km/l or over 35 on fuel; outside that it is another number.
const MIN = 5;
const MAX = 35;
const CONTEXT = 45;

// "14 km/l", "16km Por litro", "11km x lt", "18km/lts", "18km/litro", "15 k/l". The number cannot be
// the tail of a longer one ("130.000 km") nor glued to a letter (a link: "specs.multiaviso.com/a7w3w7kl"
// read as 7 km/l), and the litre word must end there ("km lindo" is not "km l").
const KM_PER_LITRE = /(?<![a-z\d.,])(\d{1,2}(?:[.,]\d{1,2})?)\s*(?:kms?|k(?=\s*\/))\s*(?:\/|x|por|p\/)?\s*(?:l|lt|lts|ltr|litro|litros)\b/g;
// "6,5 l/100 km", "7 litros cada 100 km".
const LITRES_PER_100 = /(?<![a-z\d.,])(\d{1,2}(?:[.,]\d{1,2})?)\s*(?:l|lt|lts|litros)\s*(?:\/|c\/|cada|a los|x|por)\s*100\s*(?:km|kms)\b/g;

const CITY = /ciudad|urban[oa]|trafico/g;
const HIGHWAY = /ruta|carretera|autopista|extraurban|interurban/g;

const round1 = (value: number): number => Math.round(value * 10) / 10;
const numberOf = (text: string): number => Number(text.replace(",", "."));

/** The last city or highway word in the words that lead up to a figure, if any. */
function kindBefore(lead: string): "city" | "highway" | "combined" {
  let last: { index: number; kind: "city" | "highway" } | null = null;
  for (const [pattern, kind] of [[CITY, "city"], [HIGHWAY, "highway"]] as const) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(lead))) if (!last || match.index > last.index) last = { index: match.index, kind };
  }
  return last?.kind ?? "combined";
}

export function readFuelEconomy(text: string): FuelEconomyReading | null {
  if (!text) return null;
  const flat = ` ${fold(text).replace(/[^a-z0-9.,/]+/g, " ").replace(/\s+/g, " ").trim()} `;
  if (!/km|100/.test(flat)) return null;
  const figures: Array<{ index: number; end: number; value: number }> = [];
  KM_PER_LITRE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = KM_PER_LITRE.exec(flat))) figures.push({ index: match.index, end: match.index + match[0].length, value: numberOf(match[1]!) });
  LITRES_PER_100.lastIndex = 0;
  while ((match = LITRES_PER_100.exec(flat))) {
    const litres = numberOf(match[1]!);
    if (litres > 0) figures.push({ index: match.index, end: match.index + match[0].length, value: round1(100 / litres) });
  }
  figures.sort((a, b) => a.index - b.index);

  const found: Record<"city" | "highway" | "combined", number | null> = { city: null, highway: null, combined: null };
  let previousEnd = 0;
  for (const figure of figures) {
    // The words that lead up to THIS figure: never further back than the previous figure, or "en
    // ruta: 19 km/l. en ciudad: 17" would read the city figure as a road one.
    const lead = flat.slice(Math.max(previousEnd, figure.index - CONTEXT), figure.index);
    previousEnd = figure.end;
    if (figure.value < MIN || figure.value > MAX) continue;
    const kind = kindBefore(lead);
    if (found[kind] === null) found[kind] = figure.value;
  }
  let { city, highway } = found;
  const { combined } = found;
  // A road figure below the town one is backwards, and one dealer template says why: "Consumo medio
  // en ruta: 5,09 km/l. Consumo medio en ciudad: 7,9 km/l" on a Yaris — litres per 100 km under a
  // km/l label (19,6 and 12,7 km/l). Small backwards pairs are converted; anything else is dropped.
  if (city !== null && highway !== null && highway < city) {
    if (city < 10) {
      [city, highway] = [round1(100 / city), round1(100 / highway)];
      if (city < MIN || highway > MAX) city = highway = null;
    } else city = highway = null;
  }
  const kmPerLiter = combined ?? (city !== null && highway !== null ? round1((city + highway) / 2) : city ?? highway);
  return kmPerLiter === null ? null : { city, highway, combined, kmPerLiter };
}

const MIN_SELLERS = 3;
// Across models a displacement says less, so it needs a wider base.
const MIN_SELLERS_ENGINE_CLASS = 10;

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
};

/** What the advert itself states, from its title, its structured specs and its description. */
export function statedFuelEconomy(listing: Pick<CarListing, "title" | "specText" | "detail">): FuelEconomyReading | null {
  return readFuelEconomy([listing.title, listing.specText ?? "", listing.detail?.description ?? ""].join("\n"));
}

/**
 * Every listing gets the figure its advert states; the rest get the median of what OTHER sellers of
 * the same model and engine state (or, failing that, the same model), with at least three sellers
 * behind it. One figure per seller: a dealer pastes the same template on every car of a model, and ten
 * copies of one guess are still one guess. Electric cars have no km per litre and get none.
 */
export function attachFuelEconomy<T extends CarListing>(listings: readonly T[]): Array<T & { fuelEconomy: CarFuelEconomy | null }> {
  const stated = listings.map(listing => (listing.fuel === "electrico" ? null : statedFuelEconomy(listing)));
  const groups = new Map<string, Map<string, number[]>>();
  const add = (key: string, seller: string, value: number): void => {
    const bySeller = groups.get(key) ?? new Map<string, number[]>();
    bySeller.set(seller, [...(bySeller.get(seller) ?? []), value]);
    groups.set(key, bySeller);
  };
  // By model NAME (marketSlug), not id: a dealer website whose model the dictionary did not match
  // carries a synthetic id ("x-onix"), and 65 Carper Onix got no figure while 592 on ML did.
  const anyFuelKey = (listing: CarListing): string => `m|${listing.marketSlug}`;
  const modelKey = (listing: CarListing): string | null => (listing.fuel ? `${anyFuelKey(listing)}|${listing.fuel}` : null);
  const engineKey = (listing: CarListing): string | null => {
    const model = modelKey(listing);
    return model && listing.engine ? `${model}|${listing.engine}` : null;
  };
  const classKey = (listing: CarListing): string | null => (listing.fuel && listing.engine ? `c|${listing.fuel}|${listing.engine}` : null);
  listings.forEach((listing, index) => {
    const reading = stated[index];
    if (!reading) return;
    const seller = listing.sellerId ?? listing.key;
    for (const key of [anyFuelKey(listing), modelKey(listing), engineKey(listing), classKey(listing)])
      if (key) add(key, seller, reading.kmPerLiter);
  });
  const inferred = new Map<string, { value: number; sellers: number }>();
  for (const [key, bySeller] of groups) {
    if (bySeller.size < (key.startsWith("c|") ? MIN_SELLERS_ENGINE_CLASS : MIN_SELLERS)) continue;
    inferred.set(key, { value: round1(median([...bySeller.values()].map(median))), sellers: bySeller.size });
  }
  const lookup = (key: string | null) => (key ? inferred.get(key) : undefined);
  return listings.map((listing, index) => {
    const reading = stated[index];
    if (reading) return { ...listing, fuelEconomy: { ...reading, basis: "advert" as const, sellers: null } };
    if (listing.fuel === "electrico") return { ...listing, fuelEconomy: null };
    const byEngine = lookup(engineKey(listing));
    // Without a known fuel the model's figures of every fuel are the best there is; with one, never
    // mix fuels (a diesel Ranger is not its petrol sibling).
    const byModel = lookup(modelKey(listing)) ?? (listing.fuel ? undefined : lookup(anyFuelKey(listing)));
    const byClass = lookup(classKey(listing));
    const pick = byEngine
      ? { ...byEngine, basis: "model_engine" as const }
      : byModel
        ? { ...byModel, basis: "model" as const }
        : byClass
          ? { ...byClass, basis: "engine_class" as const }
          : null;
    if (!pick) return { ...listing, fuelEconomy: null };
    return {
      ...listing,
      fuelEconomy: { city: null, highway: null, combined: null, kmPerLiter: pick.value, basis: pick.basis, sellers: pick.sellers },
    };
  });
}
