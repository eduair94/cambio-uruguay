// De qué categoría es un modelo guardado en `movilidadmodels`, y qué slug ya es de otra.
//
// Desde el 4/11/2026 el catálogo tiene monopatines y bicicletas en la misma colección, con el slug como
// índice único (es la URL). Dos reglas, puras para que tengan test:
//   * un documento sin `category` es de antes de las bicis, y por lo tanto de monopatín;
//   * un slug que ya es de la otra categoría no se pisa: la URL ya existe, quizás indexada, y un
//     upsert por slug le cambiaría el contenido y la página a la que pertenece.
import { MONOPATIN_CATEGORY, type MovilidadSpecCategory } from "../specs/profiles";

/** El filtro de Mongo de una categoría: la de monopatín incluye los documentos sin categoría. */
export function modelCategoryFilter(category: MovilidadSpecCategory): Record<string, unknown> {
  return category === MONOPATIN_CATEGORY
    ? { category: { $in: [MONOPATIN_CATEGORY, null] } }
    : { category };
}

/** La categoría de un documento guardado. */
export const storedModelCategory = (doc: { category?: string | null }): string => doc.category || MONOPATIN_CATEGORY;

/** Los slugs de `models` que ya son de otra categoría, guardados o armados antes en esta corrida. */
export function claimedElsewhere(
  category: MovilidadSpecCategory,
  models: ReadonlyArray<{ slug: string }>,
  stored: ReadonlyArray<{ slug: string; category?: string | null }>,
  claimedThisRun: ReadonlyMap<string, MovilidadSpecCategory>
): Set<string> {
  const owner = new Map(stored.map((doc) => [doc.slug, storedModelCategory(doc)]));
  const taken = new Set<string>();
  for (const { slug } of models) {
    const thisRun = claimedThisRun.get(slug);
    if ((thisRun && thisRun !== category) || (owner.has(slug) && owner.get(slug) !== category)) taken.add(slug);
  }
  return taken;
}
