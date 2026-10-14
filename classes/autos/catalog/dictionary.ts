// The vehicle dictionary every non-ML advert is identified against. Ids are Mercado Libre's own
// (BRAND/MODEL facet ids of the ML harvest), so a car recognised on Facebook or on a dealer's
// website lands in the SAME cohort as the ML adverts of that model.
import { slugify, wordText } from "../normalize";
import type { CarModelVocabulary, RawCarListing } from "../types";

export interface CarDictionaryBrand {
  brandId: string;
  brand: string;
  slug: string;
  /** Whole-word phrases (wordText form) that name the brand. */
  aliases: string[];
}

export interface CarDictionaryModel {
  brandId: string;
  modelId: string;
  brand: string;
  model: string;
  slug: string;
  /** Whole-word phrases (wordText form) that name the model. */
  names: string[];
  trims: string[];
  /** ML adverts that carried this id in the build input. */
  listings: number;
}

export interface CarDictionary {
  brands: CarDictionaryBrand[];
  models: CarDictionaryModel[];
}

// How Uruguayan sellers actually write brands and models (titles of the 2026-09-17 samples).
const BRAND_ALIASES: Readonly<Record<string, readonly string[]>> = {
  volkswagen: ["vw", "volks"],
  chevrolet: ["chevy"],
  "mercedes-benz": ["mercedes", "mercedez", "mercedes benz"],
  peugeot: ["peugot"],
  hyundai: ["hyunday", "hiunday"],
  "land-rover": ["landrover"],
  citroen: ["citroen"],
  brilliance: ["brillance", "brilliance"],
};
const MODEL_ALIASES: Readonly<Record<string, readonly string[]>> = {
  corolla: ["corola"],
  onix: ["onyx"],
  hb20: ["hb 20"],
};

const phrase = (text: string): string => wordText(text).trim();

export function buildCarDictionary(
  listings: readonly Pick<RawCarListing, "source" | "brandId" | "brand" | "modelId" | "model">[],
  vocabularies: readonly CarModelVocabulary[],
  /**
   * The versions that decide whether a model id is really a version of a sibling: Mercado Libre's
   * own, never the ones mined from titles (classes/autos/catalog/trims.ts). The miner reads "onix"
   * in every "Chevrolet Onix Plus" title, and with its versions this rule deleted Chevrolet Onix —
   * the most listed model, 566 Mercado Libre adverts — along with Suzuki Swift, Chevrolet Corsa,
   * Nissan Frontier and Suzuki Alto (2026-10-14): a Facebook "Chevrolet Onix 2024" named nothing.
   * Defaults to `vocabularies`.
   */
  versionVocabularies: readonly CarModelVocabulary[] = vocabularies,
): CarDictionary {
  const brands = new Map<string, CarDictionaryBrand>();
  const models = new Map<string, CarDictionaryModel>();
  for (const row of listings) {
    if (row.source !== "mercadolibre" || !row.brandId || !row.modelId || !row.brand || !row.model) continue;
    if (!brands.has(row.brandId)) {
      const slug = slugify(row.brand);
      const aliases = new Set([phrase(row.brand), ...(BRAND_ALIASES[slug] ?? []).map(phrase)]);
      brands.set(row.brandId, { brandId: row.brandId, brand: row.brand, slug, aliases: [...aliases].filter(Boolean) });
    }
    const key = `${row.brandId}|${row.modelId}`;
    const known = models.get(key);
    if (known) {
      known.listings++;
      continue;
    }
    const slug = slugify(row.model);
    const spoken = phrase(row.model);
    const names = new Set([spoken, ...(MODEL_ALIASES[slug.replace(/-/g, "")] ?? MODEL_ALIASES[slug] ?? []).map(phrase)]);
    // "CR-V" is written "crv" as often as "cr v".
    const compact = spoken.replace(/ /g, "");
    if (compact !== spoken && compact.length >= 3) names.add(compact);
    models.set(key, {
      brandId: row.brandId, modelId: row.modelId, brand: row.brand, model: row.model, slug,
      names: [...names].filter(Boolean), trims: [], listings: 1,
    });
  }
  for (const vocabulary of vocabularies) {
    const model = models.get(`${vocabulary.brandId}|${vocabulary.modelId}`);
    if (model) model.trims = [...new Set([...model.trims, ...vocabulary.trims])].sort();
  }
  // ML's MODEL facet is seller-chosen: "Active", "Privilége" or "Suzuki" show up as models. A
  // "model" named like its brand or like a version of a sibling model is a version, not a model
  // (measured on 16,301 titles: those ids alone explained most wrong identifications).
  const versionTrims = new Map<string, readonly string[]>();
  for (const vocabulary of versionVocabularies) {
    const key = `${vocabulary.brandId}|${vocabulary.modelId}`;
    if (models.has(key)) versionTrims.set(key, [...(versionTrims.get(key) ?? []), ...vocabulary.trims]);
  }
  const trimsByBrand = new Map<string, Set<string>>();
  for (const [key, model] of models) {
    const set = trimsByBrand.get(model.brandId) ?? new Set<string>();
    (versionTrims.get(key) ?? []).forEach(trim => set.add(slugify(trim)));
    trimsByBrand.set(model.brandId, set);
  }
  for (const [key, model] of models) {
    const brand = brands.get(model.brandId)!;
    const namesBrand = model.slug === brand.slug || brand.aliases.some(alias => slugify(alias) === model.slug);
    const ownTrims = new Set((versionTrims.get(key) ?? []).map(trim => slugify(trim)));
    const namesVersion = trimsByBrand.get(model.brandId)!.has(model.slug) && !ownTrims.has(model.slug);
    if (namesBrand || namesVersion) models.delete(key);
  }
  return {
    brands: [...brands.values()].sort((a, b) => a.slug.localeCompare(b.slug) || a.brandId.localeCompare(b.brandId)),
    models: [...models.values()].sort((a, b) => `${a.brandId}|${a.modelId}`.localeCompare(`${b.brandId}|${b.modelId}`)),
  };
}
