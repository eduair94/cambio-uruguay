// Lo que la ficha técnica agrega a una fila del directorio de monopatines.
//
// La usan los DOS escritores de `movilidadlistings`: `sync_movilidad.ts`, que reescribe cada fila
// cada hora con el precio nuevo, y `sync_movilidad_specs.ts`, que lee fichas y las reaplica. Si sólo
// la aplicara el segundo, la horaria volvería a dejar la marca vacía cada hora (la tarjeta de
// búsqueda de ML llega sin atributos); con la misma función en los dos, la fila sale igual quien sea
// que la escriba.
import { norm } from "../../equipar/classify";
import type { EquiparListingRow } from "../../equipar/listings";
import { brandFromTitle, cleanBrand } from "./brands";
import { hasAnySpecs, mergeSpecs, specsFromTitle } from "./parse";
import type { MonopatinSpecs } from "./types";

export const MONOPATIN_CATEGORY = "monopatin-electrico";

/** Lo que `movilidadspecs` guarda de una ficha leída bien, para enriquecer su fila. */
export interface StoredFicha {
  listingId: string;
  specs: MonopatinSpecs | null;
  brand: string | null;
  model: string | null;
}

export function enrichMovilidadRow<T extends EquiparListingRow>(row: T, ficha: StoredFicha | undefined): T {
  if (row.category !== MONOPATIN_CATEGORY) return row;

  const merged = mergeSpecs(ficha?.specs, specsFromTitle(row.title));
  const specs = hasAnySpecs(merged) ? merged : null;
  // El precio por km sólo con una autonomía que declaró el vendedor en su ficha: un "45km" del
  // título es una cifra más débil para ordenar por "rinde más por peso".
  const rangeFromFicha = specs?.rangeKm && specs.from.rangeKm && specs.from.rangeKm !== "titulo";
  const uyuPerKm = rangeFromFicha && row.priceUyu > 0 ? Math.round(row.priceUyu / specs!.rangeKm!) : null;

  let { brand, brandKey } = row;
  if (!brandKey) {
    const found = cleanBrand(ficha?.brand) ?? brandFromTitle(row.title);
    if (found) {
      brand = found;
      // Un slug, porque es lo que acepta el filtro de marca (`/^[a-z0-9:_.-]{1,80}$/`): "K'nex" con su
      // apóstrofo aparecía como opción y no filtraba nada (revisión final, 3/11/2026).
      brandKey = norm(found)
        .replace(/'/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }
  }

  return { ...row, specs, uyuPerKm, brand, brandKey };
}
