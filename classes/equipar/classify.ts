// Turning a listing title into "which household item is this, and which size".
//
// Everything here works on a normalised title: lower case, no accents, single spaces. Uruguayan
// storefronts spell the same product "Sartén", "Sarten" and "SARTEN" in the same catalogue, and a
// filter that respects accents silently loses a third of a category.
import { EQUIPAR_CATEGORIES, NOT_A_PRODUCT } from "./registry";
import type { CategorySpec } from "../retail/types";
import type { EquiparCategory, EquiparUnit, EquiparVariant } from "./types";

export function norm(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9%"'\s.,+-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Where a number lives in a title, per unit. */
const UNIT_PATTERNS: Record<EquiparUnit, RegExp> = {
  litros: /(\d{1,4})\s*(?:l|lt|lts|litros)\b/,
  pulgadas: /(\d{2,3})\s*(?:"|''|pulgadas|pulg|p\b)/,
  cm: /(\d{1,3})\s*(?:cm|centimetros)\b/,
  plazas: /(\d)\s*plazas?\b/,
  piezas: /(\d{1,3})\s*(?:piezas|pzas|unidades|u\b)/,
  btu: /(\d{4,6})\s*(?:btu|btus)\b/,
};

export function numericValue(title: string, unit: EquiparUnit): number | null {
  const match = UNIT_PATTERNS[unit].exec(title);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Does this title belong to this category?
 *
 * The accessory filter runs first and for every category: a fridge magnet, a door gasket and a
 * "no funciona, para repuesto" are each cheap enough to sit at the bottom of a used band and drag
 * the published saving with them.
 */
export function matchesCategory(category: EquiparCategory, title: string, context = ""): boolean {
  const haystack = norm(`${title} ${context}`);
  const normalisedTitle = norm(title);
  if (NOT_A_PRODUCT.test(haystack)) return false;
  if (!category.include.test(normalisedTitle)) return false;
  if (category.exclude?.test(haystack)) return false;
  return true;
}

/** Which bucket inside the category. Falls back to the variant flagged `fallback`. */
export function variantFor(category: EquiparCategory, title: string): EquiparVariant {
  const normalised = norm(title);
  const fallback = category.variants.find((variant) => variant.fallback) ?? category.variants[0]!;

  for (const variant of category.variants) {
    if (variant.match?.test(normalised)) return variant;
  }
  for (const variant of category.variants) {
    if (!variant.numeric) continue;
    const value = numericValue(normalised, variant.numeric.unit);
    if (value !== null && value >= variant.numeric.min && value <= variant.numeric.max) return variant;
  }
  return fallback;
}

/** First category in registry order that accepts the title. Registry order is documented there. */
export function categoryFor(title: string, context = ""): EquiparCategory | null {
  return EQUIPAR_CATEGORIES.find((category) => matchesCategory(category, title, context)) ?? null;
}

export const itemKey = (categoryKey: string, variantKey: string): string => `${categoryKey}:${variantKey}`;

/**
 * The specs handed to the shared harvester, in registry order — which is the budget order: a run
 * that runs out of MercadoLibre or Marketplace queries loses the tail of this list.
 */
export function equiparSpecs(): CategorySpec[] {
  return EQUIPAR_CATEGORIES.map((category) => ({
    key: category.key,
    accept: (title: string, context?: string) => matchesCategory(category, title, context ?? ""),
    urlHint: category.urlHint,
    storeQueries: category.storeQueries,
    mlQueries: category.mlQueries,
    mlCategories: category.mlCategories,
    fbQueries: category.fbQueries,
  }));
}
