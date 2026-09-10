// The three published baskets, and the rule that makes them mean anything.
//
// THE GUARD: a basket total is only "what it costs" when every category in it could be priced. A
// total that quietly skips the fridge because nothing was harvested for it is LOWER than the truth
// and reads as a better deal — which is the exact failure the supermarket index was built to avoid,
// where a shop's total fell because it was MISSING items and the cheap-first ranking rewarded it.
//
// So `missing` is part of the published object, `complete` says whether the total stands alone, and
// nothing here ever silently drops a line.
import { EQUIPAR_CATEGORIES } from "./registry";
import type {
  EquiparBasket,
  EquiparBasketKey,
  EquiparBasketLine,
  EquiparItem,
  EquiparTier,
} from "./types";

interface BasketRecipe {
  key: EquiparBasketKey;
  label: string;
  tiers: EquiparTier[];
  /** Smallest variant, or the typical one. */
  variant: "cheapest" | "typical";
  /** Where in the new distribution this basket buys. */
  pricePoint: "p25" | "median";
  /** Take the used price when the category tolerates used and a used band exists. */
  preferUsed: boolean;
}

export const BASKET_RECIPES: BasketRecipe[] = [
  {
    key: "minima",
    label: "Mínima",
    tiers: ["S"],
    variant: "cheapest",
    pricePoint: "p25",
    preferUsed: true,
    },
  {
    key: "decente",
    label: "Decente",
    tiers: ["S", "A"],
    variant: "typical",
    pricePoint: "p25",
    preferUsed: false,
  },
  {
    key: "completa",
    label: "Completa",
    tiers: ["S", "A", "B"],
    variant: "typical",
    pricePoint: "median",
    preferUsed: false,
  },
];

interface Priced {
  item: EquiparItem;
  unitPriceUyu: number;
  condition: "new" | "used";
}

/**
 * What one line of a basket costs, or null when this item cannot be priced at all.
 *
 * `preferUsed` only applies where the category itself says used is sane. A mattress is the one
 * place in this catalogue where the cheap option is the wrong advice, and the registry says so.
 */
function priceItem(item: EquiparItem, recipe: BasketRecipe): Priced | null {
  if (recipe.preferUsed && item.usedOk && item.usedBand) {
    return { item, unitPriceUyu: item.usedBand.median, condition: "used" };
  }
  if (item.newBand) {
    const price = recipe.pricePoint === "median" ? item.newBand.median : item.newBand.p25;
    return { item, unitPriceUyu: price, condition: "new" };
  }
  // No new market, but a used one: better an honest used price than dropping the line and
  // publishing a total that pretends the category does not exist.
  if (item.usedOk && item.usedBand) {
    return { item, unitPriceUyu: item.usedBand.median, condition: "used" };
  }
  return null;
}

/** Picks the variant this basket buys, among the ones that could actually be priced. */
function chooseVariant(candidates: Priced[], recipe: BasketRecipe): Priced | null {
  if (!candidates.length) return null;
  if (recipe.variant === "cheapest") {
    return [...candidates].sort((a, b) => a.unitPriceUyu - b.unitPriceUyu)[0]!;
  }
  // "Typical" is the variant the registry marked as the fallback — the one a listing lands in when
  // it says nothing about size, which is by construction the common case.
  const typical = candidates.find((candidate) => candidate.item.variant === typicalVariantOf(candidate.item.category));
  return typical ?? [...candidates].sort((a, b) => a.unitPriceUyu - b.unitPriceUyu)[0]!;
}

function typicalVariantOf(categoryKey: string): string | null {
  const category = EQUIPAR_CATEGORIES.find((entry) => entry.key === categoryKey);
  if (!category) return null;
  return (category.variants.find((variant) => variant.fallback) ?? category.variants[0])?.key ?? null;
}

export function buildBaskets(items: readonly EquiparItem[], usdUyu: number): EquiparBasket[] {
  const byCategory = new Map<string, EquiparItem[]>();
  for (const item of items) {
    const list = byCategory.get(item.category) ?? [];
    list.push(item);
    byCategory.set(item.category, list);
  }

  return BASKET_RECIPES.map((recipe) => {
    const lines: EquiparBasketLine[] = [];
    const missing: EquiparBasket["missing"] = [];

    for (const category of EQUIPAR_CATEGORIES) {
      if (!recipe.tiers.includes(category.tier)) continue;
      const candidates = (byCategory.get(category.key) ?? [])
        .map((item) => priceItem(item, recipe))
        .filter((priced): priced is Priced => Boolean(priced));
      const chosen = chooseVariant(candidates, recipe);

      if (!chosen) {
        missing.push({ itemKey: category.key, label: category.label, tier: category.tier });
        continue;
      }

      const quantity = chosen.item.quantity;
      lines.push({
        itemKey: chosen.item.key,
        label: category.label,
        variantLabel: chosen.item.variantLabel,
        tier: category.tier,
        quantity,
        unitPriceUyu: chosen.unitPriceUyu,
        totalUyu: chosen.unitPriceUyu * quantity,
        condition: chosen.condition,
      });
    }

    const totalUyu = lines.reduce((sum, line) => sum + line.totalUyu, 0);
    return {
      key: recipe.key,
      label: recipe.label,
      tiers: recipe.tiers,
      lines,
      totalUyu,
      totalUsd: usdUyu > 0 ? Math.round(totalUyu / usdUyu) : null,
      missing,
      complete: missing.length === 0,
    };
  });
}
