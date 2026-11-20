// El perfil de cada categoría de movilidad que tiene ficha técnica: qué bandas de cordura valen y si
// se leen los campos propios de una bicicleta.
//
// La maquinaria de la ficha (parse, enrich, snapshot, modelos) es una sola; lo que cambia entre un
// monopatín y una bicicleta es lo que puede declarar cada uno. Un rodado 26 es una bici normal y un
// monopatín imposible; "7 velocidades" son los cambios de una bici y, en un monopatín, los modos del
// acelerador. Por eso el parser recibe la categoría y no adivina por el texto.
//
// Una categoría nueva (otro tipo de artículo) entra acá con sus bandas y, si declara campos propios,
// con su bandera; sin perfil, una categoría no tiene ficha.
import { BICICLETA_SPEC_BANDS, SPEC_BANDS, type NumericSpecField } from "./types";

export const MONOPATIN_CATEGORY = "monopatin-electrico";
export const BICICLETA_CATEGORY = "bicicleta-electrica";

export type MovilidadSpecCategory = typeof MONOPATIN_CATEGORY | typeof BICICLETA_CATEGORY;

/** Las categorías que lee currency-movilidad-specs, en el orden en que se procesan. */
export const SPEC_CATEGORIES: readonly MovilidadSpecCategory[] = [MONOPATIN_CATEGORY, BICICLETA_CATEGORY];

export interface SpecProfile {
  category: MovilidadSpecCategory;
  bands: Readonly<Record<NumericSpecField, readonly [number, number]>>;
  /** Lee rodado ("R20", "26x1.95"), cambios, batería removible, acelerador y motor central. */
  bike: boolean;
}

const PROFILES: Readonly<Record<MovilidadSpecCategory, SpecProfile>> = {
  [MONOPATIN_CATEGORY]: { category: MONOPATIN_CATEGORY, bands: SPEC_BANDS, bike: false },
  [BICICLETA_CATEGORY]: { category: BICICLETA_CATEGORY, bands: BICICLETA_SPEC_BANDS, bike: true },
};

export const isSpecCategory = (value: unknown): value is MovilidadSpecCategory =>
  value === MONOPATIN_CATEGORY || value === BICICLETA_CATEGORY;

/** El perfil de la categoría; sin categoría, el de monopatín (el único que existía hasta el 4/11/2026). */
export function specProfile(category?: string | null): SpecProfile {
  return isSpecCategory(category) ? PROFILES[category] : PROFILES[MONOPATIN_CATEGORY];
}
