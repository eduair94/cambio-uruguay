// plan_home_setup: what it costs to equip an empty home, from the stored baskets of
// /equipar-casa-uruguay, minus what the person already has. A total that is missing
// items is lower for that reason, so it always says what is missing.

import { fold, money, PUBLIC_SITE } from "../format.js";
import type { ToolOutput } from "../output.js";
import { TTL, type SiteApi } from "../site.js";
import type { CategoryItem } from "./search.js";

interface BasketLine {
  itemKey: string;
  label: string;
  variantLabel?: string;
  tier?: string;
  quantity: number;
  unitPriceUyu: number;
  totalUyu: number;
  condition?: string;
}

interface Basket {
  key: string;
  label: string;
  tiers?: string[];
  lines?: BasketLine[];
  totalUyu?: number;
  missing?: string[];
  complete?: boolean;
}

interface EquiparResponse {
  meta?: { baskets?: Basket[]; generatedAt?: string; usdUyu?: number };
  items?: CategoryItem[];
}

export interface HomeSetupInput {
  level?: "minima" | "decente" | "completa";
  have?: string[];
  condition?: "cheapest" | "new";
}

export async function planHomeSetup(site: SiteApi, input: HomeSetupInput): Promise<ToolOutput> {
  const res = await site.get<EquiparResponse>("/api/equipar", undefined, { ttlMs: TTL.catalog });
  const baskets = res.meta?.baskets ?? [];
  const basket = baskets.find((b) => b.key === (input.level ?? "minima")) ?? baskets[0];
  if (!basket) throw new Error("La canasta de equipamiento no está disponible todavía.");
  const have = (input.have ?? []).map(fold).filter(Boolean);
  const owned = (line: BasketLine) => {
    const category = line.itemKey.split(":")[0]!;
    const label = fold(line.label);
    return have.some((h) => h === category || label.includes(h) || h.includes(label));
  };
  const items = new Map((res.items ?? []).map((i) => [i.key, i]));
  const kept: Array<BasketLine & { note?: string }> = [];
  const skipped: string[] = [];
  for (const line of basket.lines ?? []) {
    if (owned(line)) {
      skipped.push(line.label);
      continue;
    }
    const newMedian = items.get(line.itemKey)?.newBand?.median;
    if (input.condition === "new" && line.condition === "used" && newMedian) {
      kept.push({ ...line, condition: "new", unitPriceUyu: newMedian, totalUyu: newMedian * line.quantity, note: "precio nuevo típico" });
    } else kept.push(line);
  }
  const total = kept.reduce((sum, l) => sum + l.totalUyu, 0);
  const usdUyu = Number(res.meta?.usdUyu) || 0;
  const lines = [
    `Canasta "${basket.label}"${skipped.length ? ` sin lo que ya tenés (${skipped.join(", ")})` : ""}: ${money(total)}${usdUyu ? ` (≈ ${money(total / usdUyu, "USD")})` : ""} en ${kept.length} ítems.`,
    ...kept.map(
      (l) =>
        `• ${l.label}${l.variantLabel ? ` (${l.variantLabel})` : ""}${l.quantity > 1 ? ` ×${l.quantity}` : ""}: ${money(l.totalUyu)} ${l.condition === "used" ? "usado" : "nuevo"}${l.note ? ` — ${l.note}` : ""}`
    ),
  ];
  if (basket.missing?.length)
    lines.push(`⚠ Total parcial: faltan precios de ${basket.missing.join(", ")}, así que el total real es mayor.`);
  lines.push(
    input.condition === "new"
      ? "Todo a precio nuevo típico (mediana)."
      : "Cada ítem va al precio más bajo razonable: usado cuando conviene (heladera, cocina, calefón) y nuevo cuando no (colchón, sábanas).",
    `Detalle por categoría y dónde comprar: ${PUBLIC_SITE}/equipar-casa-uruguay`
  );
  return {
    text: lines.join("\n"),
    data: {
      basket: basket.key,
      label: basket.label,
      totalUyu: total,
      totalUsd: usdUyu ? Math.round(total / usdUyu) : null,
      lines: kept,
      skipped,
      missing: basket.missing ?? [],
      complete: !basket.missing?.length,
      levels: baskets.map((b) => ({ key: b.key, label: b.label, totalUyu: b.totalUyu })),
      asOf: res.meta?.generatedAt?.slice(0, 10) ?? null,
    },
  };
}
