// Lo que la ficha técnica agrega a una fila de `equiparlistings` (heladeras, lavarropas, televisores y
// aires): el campo `ficha` y, si faltaba, la marca.
//
// La usan los DOS escritores de la colección: `sync_equipar.ts`, que reescribe cada fila cada hora con
// el precio nuevo, y `sync_equipar_specs.ts`, que lee fichas y las reaplica. Con la misma función en
// los dos la fila sale igual quien sea que la escriba (la lección de monopatines: si sólo la aplicara
// el lector de fichas, la horaria vaciaría la marca cada hora).
//
// Las filas CRUDAS de la ficha se guardan en `equiparspecs` y se re-interpretan acá en cada escritura:
// un parser mejor se aplica a todo el catálogo sin volver a pedir una sola ficha.
import { norm } from "../classify";
import type { EquiparListingRow } from "../listings";
import { isEquiparFichaCategory, type EquiparFicha } from "./fields";
import { fichaFromRows, fichaFromTitle, fichaHasAny, mergeFicha } from "./parse";

/** Lo que `equiparspecs` guarda de una ficha leída bien. */
export interface StoredEquiparFicha {
  listingId: string;
  rows: Record<string, string> | null;
  brand: string | null;
  model: string | null;
}

/** Lo que el formulario de ML guarda cuando el vendedor no pone la marca. */
const GENERIC_BRAND = /^(generic[ao]?|sin marca|otras? marcas?|otros?|varios|importado|nacional|no aplica|n\/a|-)$/;

const slug = (value: string): string =>
  norm(value)
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function enrichEquiparRow<T extends EquiparListingRow & { ficha?: EquiparFicha | null }>(
  row: T,
  stored: StoredEquiparFicha | undefined
): T {
  if (!isEquiparFichaCategory(row.category)) return row;
  const merged = mergeFicha(
    row.category,
    stored?.rows ? fichaFromRows(row.category, stored.rows) : null,
    fichaFromTitle(row.category, row.title)
  );
  const ficha = fichaHasAny(merged) ? merged : null;

  let { brand, brandKey } = row;
  const fichaBrand = (stored?.brand ?? "").trim();
  if (!brandKey && fichaBrand && !GENERIC_BRAND.test(norm(fichaBrand))) {
    brand = fichaBrand;
    brandKey = slug(fichaBrand);
  }
  return { ...row, ficha, brand, brandKey };
}
