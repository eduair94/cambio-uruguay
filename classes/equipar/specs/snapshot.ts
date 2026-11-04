// El documento precalculado del asesor "¿Qué tamaño necesitás?" de /equipar-casa-uruguay/<categoria>:
// uno por categoría (`key` = la categoría), con los avisos que tienen ficha del vendedor. El asesor
// corre en el navegador sobre esta lista (los controles responden en el acto) y el pedido sólo la lee
// (regla del dueño desde el 19/9/2026: lo que procesa la base se precalcula).
import type { EquiparListingRow } from "../listings";
import type { EquiparFicha, EquiparFichaCategory, FichaValue } from "./fields";
import { fichaFromSeller } from "./parse";

/** Más que esto no hace falta para elegir tres: la lista va al navegador. */
export const EQUIPAR_SNAPSHOT_MAX = 600;
const TITLE_MAX = 140;

export interface EquiparFichaCandidate {
  id: string;
  title: string;
  url: string;
  image: string | null;
  price: number;
  currency: "UYU" | "USD";
  priceUyu: number;
  condition: "new" | "used";
  source: "store" | "mercadolibre";
  sellerName: string;
  brand: string;
  values: Record<string, FichaValue>;
}

export interface EquiparFichaSnapshot {
  key: EquiparFichaCategory;
  generatedAt: string;
  candidates: EquiparFichaCandidate[];
  /** Avisos no sospechosos de la categoría, y cuántos tienen ficha del vendedor. */
  total: number;
  withFicha: number;
}

export function buildEquiparFichaSnapshot(
  category: EquiparFichaCategory,
  rows: ReadonlyArray<EquiparListingRow & { ficha?: EquiparFicha | null }>,
  generatedAt: string
): EquiparFichaSnapshot {
  const honest = rows.filter((row) => row.category === category && !row.suspect);
  const withFicha = honest.filter((row) => row.source !== "facebook" && fichaFromSeller(row.ficha));
  return {
    key: category,
    generatedAt,
    candidates: withFicha
      .map(
        (row): EquiparFichaCandidate => ({
          id: row.listingId,
          title: row.title.slice(0, TITLE_MAX),
          url: row.url,
          image: row.image,
          price: row.price,
          currency: row.currency,
          priceUyu: row.priceUyu,
          condition: row.condition,
          source: row.source as "store" | "mercadolibre",
          sellerName: row.sellerName,
          brand: row.brand,
          values: row.ficha!.values,
        })
      )
      .sort((a, b) => a.priceUyu - b.priceUyu || a.id.localeCompare(b.id))
      .slice(0, EQUIPAR_SNAPSHOT_MAX),
    total: honest.length,
    withFicha: withFicha.length,
  };
}
